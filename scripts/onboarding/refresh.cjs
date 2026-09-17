const {getWorkspace,updateWorkspace}=require('../server/state.cjs');
const {stableId}=require('../utils.cjs');
const {getSource,quoteIsGrounded}=require('../sources.cjs');

const REFRESH_INTERVAL_DAYS=30;
const MAX_REFRESH_HISTORY=12;
const MAX_REFRESH_SOURCES=100;
const MAX_REFRESH_DIFFS=250;
const MAX_PROPOSAL_BYTES=256*1024;
const DAY_MS=24*60*60*1000;
const OMIT_KEYS=new Set(['schemaVersion','approvedAt','generatedAt','updatedAt','deliveryAllowed','authorization','defaultsReviewRequired','evidence','sourceId','sourceUrl','evidenceQuote','inferred','verification','reason']);
const FACT_KEYS=['category','productOneLiner','pricingModel','targetCompanySize'];
const LIST_FACT_KEYS=['valueProps','credentials','targetIndustries'];
const OBJECT_FACT_KEYS={proofPoints:'claim',customers:'name',competitors:'name'};

function plainObject(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value));}
function timestamp(now){
  const value=typeof now==='function'?now():now;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Refresh time must be a valid ISO timestamp.');
  return value;
}
function nextDue(at){return new Date(Date.parse(at)+REFRESH_INTERVAL_DAYS*DAY_MS).toISOString();}
function safeText(value,max,label){const text=String(value||'').trim();if(!text||text.length>max)throw new Error(`${label} is invalid.`);return text;}
function refreshRecord(workspace){
  if(!workspace.refresh)return {schemaVersion:1,intervalDays:REFRESH_INTERVAL_DAYS,lastStartedAt:null,lastCompletedAt:null,nextDueAt:null,pending:null,history:[]};
  const value=structuredClone(workspace.refresh);
  if(value.schemaVersion!==1||value.intervalDays!==REFRESH_INTERVAL_DAYS||!Array.isArray(value.history)||value.history.length>MAX_REFRESH_HISTORY||value.pending!==null&&!plainObject(value.pending))throw new Error('Saved refresh state is invalid.');
  return value;
}
function assertRefreshable(workspace){
  if(workspace.status==='archived')throw new Error('Restore this workspace before refreshing it.');
  if(workspace.status!=='active'||!workspace.sellerProfile?.approvedAt)throw new Error('Approve the seller profile before refreshing it.');
}
function normalizeIdentity(value){return String(value||'').trim().toLowerCase().replace(/^www\./,'');}
function assertSameSeller(current,proposed){
  const currentDomain=normalizeIdentity(current.domain),proposedDomain=normalizeIdentity(proposed.domain);
  if(currentDomain&&proposedDomain&&currentDomain!==proposedDomain)throw new Error('A refresh proposal cannot change to another seller domain.');
  if(!currentDomain&&!proposedDomain&&normalizeIdentity(current.sellerName)!==normalizeIdentity(proposed.sellerName))throw new Error('A refresh proposal cannot change to another seller.');
}
function cleanEvidence(value){
  if(!plainObject(value))return null;
  const evidence={sourceId:value.sourceId||null,sourceUrl:value.sourceUrl||null,evidenceQuote:value.evidenceQuote||'',inferred:Boolean(value.inferred)};
  return evidence.sourceId||evidence.sourceUrl||evidence.evidenceQuote||evidence.inferred?evidence:null;
}
function itemIdentity(value){
  if(plainObject(value)){
    for(const key of ['key','domain','name','claim','value'])if(value[key]!==undefined&&String(value[key]).trim())return `${key}:${normalizeIdentity(value[key])}`;
    return `object:${stableId(JSON.stringify(value))}`;
  }
  return `value:${normalizeIdentity(value)}`;
}
function pathIdentity(value){return encodeURIComponent(itemIdentity(value)).slice(0,180);}
function flattenSemantic(value,path,out,{profile=null,evidenceKey='',inheritedEvidence=null}={}){
  if(value===null||value===undefined||value==='')return;
  if(Array.isArray(value)){
    const seen=new Map();
    value.forEach((item,index)=>{
      const identity=pathIdentity(item);
      if(seen.has(identity)){
        if(JSON.stringify(seen.get(identity))===JSON.stringify(item))return;
        throw new Error('Refresh arrays require unique stable identities.');
      }
      seen.set(identity,item);
      const itemEvidence=cleanEvidence(item)||cleanEvidence(profile?.evidence?.[`${evidenceKey}.${index}`])||inheritedEvidence;
      flattenSemantic(item,`${path}[${identity}]`,out,{profile,evidenceKey:`${evidenceKey}.${index}`,inheritedEvidence:itemEvidence});
    });
    return;
  }
  if(plainObject(value)){
    for(const key of Object.keys(value).sort()){
      if(OMIT_KEYS.has(key)||(path==='sellerProfile'&&key==='sources'))continue;
      const childEvidence=cleanEvidence(profile?.evidence?.[evidenceKey?`${evidenceKey}.${key}`:key])||inheritedEvidence;
      flattenSemantic(value[key],`${path}.${key}`,out,{profile,evidenceKey:evidenceKey?`${evidenceKey}.${key}`:key,inheritedEvidence:childEvidence});
    }
    return;
  }
  out.set(path,{value,evidence:inheritedEvidence});
}
function semanticMap(sellerProfile,icpConfig){
  const map=new Map();
  flattenSemantic(sellerProfile,'sellerProfile',map,{profile:sellerProfile});
  flattenSemantic(icpConfig,'icpConfig',map);
  return map;
}
function refreshDiff(beforeProfile,beforeConfig,afterProfile,afterConfig){
  const before=semanticMap(beforeProfile,beforeConfig),after=semanticMap(afterProfile,afterConfig);
  const paths=[...new Set([...before.keys(),...after.keys()])].sort(),diff=[];
  for(const path of paths){
    const left=before.get(path),right=after.get(path);
    const sameValue=Boolean(left&&right&&JSON.stringify(left.value)===JSON.stringify(right.value));
    const sameEvidence=Boolean(left&&right&&JSON.stringify(left.evidence??null)===JSON.stringify(right.evidence??null));
    if(sameValue&&sameEvidence)continue;
    const kind=left?right?sameValue?'evidence_changed':'changed':'removed':'added';
    diff.push({schemaVersion:1,path,kind,before:left?.value??null,after:right?.value??null,beforeEvidence:left?.evidence??null,afterEvidence:right?.evidence??null});
    if(diff.length>MAX_REFRESH_DIFFS)throw new Error(`A refresh may contain at most ${MAX_REFRESH_DIFFS} changed fields.`);
  }
  return diff;
}
function sourceIdsFor(state,values){
  if(!Array.isArray(values))throw new Error('Refresh sources must be a list.');
  const ids=[...new Set(values.map(value=>safeText(value,200,'Refresh source id')))];
  if(ids.length>MAX_REFRESH_SOURCES)throw new Error(`A refresh may use at most ${MAX_REFRESH_SOURCES} sources.`);
  for(const id of ids)if(!Object.hasOwn(state.sources,id))throw new Error('A refresh source is not saved.');
  return ids;
}
function normalizedFactValue(value){return typeof value==='string'?value.trim():'';}
function factualEvidenceComplete(sellerProfile){
  const evidence=plainObject(sellerProfile.evidence)?sellerProfile.evidence:{};
  const matches=(path,value)=>{
    if(!value)return true;
    const item=evidence[path];
    return plainObject(item)&&normalizedFactValue(item.value)===value;
  };
  for(const key of FACT_KEYS){
    if(sellerProfile[key]!==undefined&&typeof sellerProfile[key]!=='string')return false;
    if(!matches(key,normalizedFactValue(sellerProfile[key])))return false;
  }
  for(const key of LIST_FACT_KEYS){
    const values=sellerProfile[key];
    if(values!==undefined&&!Array.isArray(values))return false;
    for(const [index,item] of (values||[]).entries()){
      if(typeof item!=='string')return false;
      if(!matches(`${key}.${index}`,normalizedFactValue(item)))return false;
    }
  }
  for(const [key,valueKey] of Object.entries(OBJECT_FACT_KEYS)){
    const values=sellerProfile[key];
    if(values!==undefined&&!Array.isArray(values))return false;
    for(const [index,item] of (values||[]).entries()){
      if(!plainObject(item))return false;
      const value=normalizedFactValue(item[valueKey]??item.value);
      if(!value||!matches(`${key}.${index}`,value))return false;
    }
  }
  return true;
}
function validatePayload(state,current,{sellerProfile,icpConfig,sourceIds}){
  if(!plainObject(sellerProfile)||sellerProfile.schemaVersion!==1||sellerProfile.deliveryAllowed===true||!plainObject(icpConfig)||icpConfig.schemaVersion!==1)throw new Error('Invalid refresh proposal.');
  assertSameSeller(current.sellerProfile,sellerProfile);
  const ids=sourceIdsFor(state,sourceIds||[]);
  if(Buffer.byteLength(JSON.stringify({sellerProfile,icpConfig,sourceIds:ids}))>MAX_PROPOSAL_BYTES)throw new Error('Refresh proposal exceeds the saved-size limit.');
  return {sellerProfile:structuredClone(sellerProfile),icpConfig:structuredClone(icpConfig),sourceIds:ids};
}
function appendHistory(refresh,entry){refresh.history=[...refresh.history,entry].slice(-MAX_REFRESH_HISTORY);}
function appendAudit(state,workspaceId,type,occurredAt,details={}){
  state.auditLog.push({schemaVersion:1,id:stableId(`${workspaceId}:${type}:${details.proposalId||details.runId||occurredAt}`),workspaceId,type,occurredAt,actor:'local-admin',...details});
}
function historyFromProposal(proposal,status,completedAt){
  return {schemaVersion:1,id:proposal.id,workspaceId:proposal.workspaceId,runId:proposal.runId,status,startedAt:proposal.createdAt,completedAt,sourceIds:[...proposal.sourceIds],diff:structuredClone(proposal.diff)};
}
function proposeRefresh(state,workspaceId,{runId,sellerProfile,icpConfig,sourceIds=[],now=()=>new Date().toISOString()}={}){
  const workspace=getWorkspace(state,workspaceId);assertRefreshable(workspace);
  const refresh=refreshRecord(workspace);
  if(refresh.pending)throw new Error('Review or reject the pending refresh before starting another.');
  const at=timestamp(now),safeRunId=safeText(runId,128,'Refresh run id');
  const payload=validatePayload(state,workspace,{sellerProfile,icpConfig,sourceIds});
  const diff=refreshDiff(workspace.sellerProfile,workspace.icpConfig,payload.sellerProfile,payload.icpConfig);
  const proposal={schemaVersion:1,id:stableId(`${workspaceId}:${safeRunId}:${at}:${workspace.profileRevision||0}`),workspaceId,runId:safeRunId,status:'needs_review',createdAt:at,basedOnProfileRevision:workspace.profileRevision||0,sourceIds:payload.sourceIds,diff,proposedSellerProfile:payload.sellerProfile,proposedIcpConfig:payload.icpConfig};
  const next=updateWorkspace(state,workspaceId,target=>{
    const record=refreshRecord(target);record.lastStartedAt=at;
    if(diff.length){record.pending=proposal;}
    else{record.lastCompletedAt=at;record.nextDueAt=nextDue(at);appendHistory(record,historyFromProposal(proposal,'no_changes',at));}
    target.refresh=record;
  });
  appendAudit(next,workspaceId,diff.length?'seller_refresh_proposed':'seller_refresh_no_changes',at,{proposalId:proposal.id,runId:safeRunId,changedFields:diff.length});
  return next;
}
function recordRefreshFailure(state,workspaceId,{runId,code='REFRESH_FAILED',now=()=>new Date().toISOString()}={}){
  const workspace=getWorkspace(state,workspaceId);assertRefreshable(workspace);
  const refresh=refreshRecord(workspace);
  if(refresh.pending)throw new Error('A pending refresh must be reviewed before recording another run.');
  const at=timestamp(now),safeRunId=safeText(runId,128,'Refresh run id'),safeCode=safeText(code,64,'Refresh failure code');
  if(!/^[A-Z0-9_]+$/.test(safeCode))throw new Error('Refresh failure code is invalid.');
  const next=updateWorkspace(state,workspaceId,target=>{
    const record=refreshRecord(target);record.lastStartedAt=at;record.lastCompletedAt=at;
    appendHistory(record,{schemaVersion:1,id:stableId(`${workspaceId}:${safeRunId}:${at}`),workspaceId,runId:safeRunId,status:'failed',startedAt:at,completedAt:at,code:safeCode,sourceIds:[],diff:[]});target.refresh=record;
  });
  appendAudit(next,workspaceId,'seller_refresh_failed',at,{runId:safeRunId,code:safeCode});return next;
}
function pendingFor(workspace,proposalId,revision){
  assertRefreshable(workspace);const refresh=refreshRecord(workspace),pending=refresh.pending;
  if(!pending||pending.workspaceId!==workspace.id||pending.id!==proposalId)throw new Error('Refresh proposal does not belong to this workspace.');
  if(String(workspace.profileRevision||0)!==String(revision)||String(pending.basedOnProfileRevision)!==String(workspace.profileRevision||0))throw new Error('The approved profile changed. Run the refresh again.');
  return {refresh,pending};
}
function rejectRefresh(state,workspaceId,{proposalId,revision,now=()=>new Date().toISOString()}={}){
  const workspace=getWorkspace(state,workspaceId),{pending}=pendingFor(workspace,proposalId,revision),at=timestamp(now);
  const next=updateWorkspace(state,workspaceId,target=>{
    const record=refreshRecord(target);record.pending=null;record.lastCompletedAt=at;record.nextDueAt=nextDue(at);appendHistory(record,historyFromProposal(pending,'rejected',at));target.refresh=record;
  });
  appendAudit(next,workspaceId,'seller_refresh_rejected',at,{proposalId:pending.id,runId:pending.runId,changedFields:pending.diff.length});return next;
}
function approveRefresh(state,workspaceId,{proposalId,revision,groundingCheck,now=()=>new Date().toISOString()}={}){
  const workspace=getWorkspace(state,workspaceId),{pending}=pendingFor(workspace,proposalId,revision),at=timestamp(now);
  if(typeof groundingCheck!=='function')throw new Error('A grounding validator is required before refresh approval.');
  const grounded=groundingCheck({state:structuredClone(state),workspaceId,sellerProfile:structuredClone(pending.proposedSellerProfile),icpConfig:structuredClone(pending.proposedIcpConfig),sourceIds:[...pending.sourceIds]});
  if(grounded?.then)throw new Error('The grounding validator must complete before approval.');
  if(grounded!==true)throw new Error('Refresh proposal failed grounding validation.');
  const next=updateWorkspace(state,workspaceId,target=>{
    const record=refreshRecord(target);record.pending=null;record.lastCompletedAt=at;record.nextDueAt=nextDue(at);appendHistory(record,historyFromProposal(pending,'approved',at));target.refresh=record;
    target.sellerProfile=structuredClone(pending.proposedSellerProfile);target.sellerProfile.approvedAt=at;target.sellerProfile.deliveryAllowed=false;
    target.icpConfig=structuredClone(pending.proposedIcpConfig);target.icpConfig.defaultsReviewRequired=false;
    target.profileRevision=(target.profileRevision||0)+1;target.status='active';target.deliveryMode='demo';
  });
  appendAudit(next,workspaceId,'seller_refresh_approved',at,{proposalId:pending.id,runId:pending.runId,changedFields:pending.diff.length,profileRevision:next.workspaces[workspaceId].profileRevision});return next;
}

function validateRefreshGrounding({state,sellerProfile,sourceIds}){
  if(!plainObject(state)||!plainObject(sellerProfile)||!Array.isArray(sourceIds))return false;
  if(!factualEvidenceComplete(sellerProfile))return false;
  const allowed=new Set(sourceIds);
  for(const item of Object.values(sellerProfile.evidence||{})){
    if(!plainObject(item))return false;
    if(!normalizedFactValue(item.value))continue;
    if(item.inferred===true)continue;
    if(typeof item.sourceId!=='string'||!allowed.has(item.sourceId)||typeof item.evidenceQuote!=='string'||!item.evidenceQuote.trim()||item.evidenceQuote.length>200)return false;
    const source=getSource(state,item.sourceId);
    if(!source||source.url!==item.sourceUrl||!quoteIsGrounded(state,item.sourceId,item.evidenceQuote))return false;
  }
  if(sellerProfile.sources!==undefined&&!Array.isArray(sellerProfile.sources))return false;
  for(const id of sellerProfile.sources||[])if(!allowed.has(id)||!getSource(state,id))return false;
  return true;
}

module.exports={REFRESH_INTERVAL_DAYS,MAX_REFRESH_HISTORY,MAX_REFRESH_SOURCES,MAX_REFRESH_DIFFS,approveRefresh,proposeRefresh,recordRefreshFailure,refreshDiff,rejectRefresh,validateRefreshGrounding};
