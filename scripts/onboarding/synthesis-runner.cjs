const {randomUUID}=require('node:crypto');
const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {generateSynthesis}=require('./synthesize.cjs');
const {saveGeneratedProfile}=require('./validate.cjs');

class SynthesisRunError extends Error {
  constructor(code,message){super(message);this.name='SynthesisRunError';this.code=code;}
}

function safeSynthesisError(error) {
  const allowed=new Set([
    'DISABLED','KEY_MISSING','BUDGET_MISSING','BUDGET_EXHAUSTED','MODEL_UNSUPPORTED',
    'REQUEST_FAILED','REFUSED','INCOMPLETE','INVALID_OUTPUT','INPUT_TOO_LARGE',
    'RESEARCH_NOT_READY','NO_SOURCES','STALE_RESEARCH','ARCHIVED','ACTIVE_PROFILE','WORKSPACE_CHANGED'
  ]);
  const code=allowed.has(error?.code)?error.code:'SYNTHESIS_FAILED';
  const messages={
    DISABLED:'OpenAI drafting is disabled. No paid request was made.',
    KEY_MISSING:'Add your own OpenAI key privately before enabling drafting.',
    BUDGET_MISSING:'Set approved OpenAI spending and request limits before enabling drafting.',
    BUDGET_EXHAUSTED:'The approved OpenAI limit has been reached. No extra request was made.',
    MODEL_UNSUPPORTED:'The configured OpenAI model is not approved for this workflow.',
    REQUEST_FAILED:'The OpenAI request failed or timed out. No profile was approved.',
    REFUSED:'OpenAI declined the request. No profile was generated.',
    INCOMPLETE:'OpenAI returned an incomplete draft. No profile was generated.',
    INVALID_OUTPUT:'The generated draft failed the local schema or evidence checks.',
    INPUT_TOO_LARGE:'The bounded evidence packet is too large for drafting.',
    RESEARCH_NOT_READY:'Finish collecting public evidence before drafting the profile.',
    NO_SOURCES:'Collect at least one readable public source before drafting.',
    STALE_RESEARCH:'Research changed during drafting. Start the draft again.',
    ARCHIVED:'Restore this workspace before drafting.',
    ACTIVE_PROFILE:'Approved profiles can only change through a reviewable refresh proposal.',
    WORKSPACE_CHANGED:'Workspace changed. Refresh and try again.',
    SYNTHESIS_FAILED:'The profile draft could not be completed. No profile was approved.'
  };
  return {code,message:messages[code]};
}

function setDraftStep(research,status,message='') {
  research.steps=(research.steps||[]).map(step=>step.key==='draft'?{...step,status,...(message?{message}: {})}:step);
}

function createSynthesisCoordinator({read,mutate,llm,now=()=>new Date().toISOString(),randomId=randomUUID}={}) {
  if(typeof read!=='function'||typeof mutate!=='function'||!llm)throw new Error('Persistent state and an LLM client are required');
  const pending=new Map();

  const status=id=>structuredClone(getWorkspace(read(),id).research?.synthesisJob||null);

  async function start(id,{wait=true,requireActive=false}={}) {
    if(pending.has(id))return wait?pending.get(id):status(id);
    const jobId=randomId(),startedAt=now();
    await mutate(state=>updateWorkspace(state,id,workspace=>{
      if(requireActive&&state.activeWorkspaceId!==id)throw new SynthesisRunError('WORKSPACE_CHANGED','Workspace changed. Refresh and try again.');
      if(workspace.status==='archived')throw new SynthesisRunError('ARCHIVED','Restore this workspace before drafting.');
      if(workspace.status==='active')throw new SynthesisRunError('ACTIVE_PROFILE','Approved profiles require a refresh proposal.');
      if(workspace.research?.status!=='evidence_ready')throw new SynthesisRunError('RESEARCH_NOT_READY','Finish research before drafting.');
      workspace.research.synthesisJob={schemaVersion:1,id:jobId,status:'running',startedAt,completedAt:null,error:null};
      setDraftStep(workspace.research,'running');
    }));
    const operation=(async()=>{
      try {
        const generated=await generateSynthesis({state:read(),workspaceId:id,llm});
        return await mutate(state=>{
          const current=getWorkspace(state,id);
          if(current.research?.synthesisJob?.id!==jobId)throw new SynthesisRunError('STALE_RESEARCH','A newer draft replaced this one.');
          let next=saveGeneratedProfile(state,id,{output:generated.output,...generated.guard,model:generated.model,promptVersion:generated.promptVersion,now});
          return updateWorkspace(next,id,workspace=>{
            workspace.research.synthesisJob={schemaVersion:1,id:jobId,status:'complete',startedAt,completedAt:now(),error:null,cached:generated.cached,evidence:generated.evidence};
          });
        });
      } catch(error) {
        const safe=safeSynthesisError(error);
        try {
          await mutate(state=>updateWorkspace(state,id,workspace=>{
            if(workspace.research?.synthesisJob?.id!==jobId)return workspace;
            workspace.research.synthesisJob={schemaVersion:1,id:jobId,status:'failed',startedAt,completedAt:now(),error:safe};
            setDraftStep(workspace.research,'failed',safe.message);
          }));
        } catch {}
        throw Object.assign(new SynthesisRunError(safe.code,safe.message),{cause:error});
      }
    })();
    let tracked;
    tracked=operation.finally(()=>{if(pending.get(id)===tracked)pending.delete(id);});
    pending.set(id,tracked);
    if(!wait){void tracked.catch(()=>{});return status(id);}
    return tracked;
  }

  return {start,status,isRunning:id=>pending.has(id)};
}

module.exports={createSynthesisCoordinator,SynthesisRunError,safeSynthesisError};
