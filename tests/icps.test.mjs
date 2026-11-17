import {describe,expect,it} from 'vitest';
import icps from '../scripts/icps.cjs';
import playbooks from '../scripts/playbook.cjs';

const receipt={sourceId:'saved',sourceUrl:'https://seller.example/about',evidenceQuote:'Our customers respond to platform hiring and funding.'};
const rules=['news','ats_jobs'].map((source,index)=>({
  id:'rule-'+index,label:index?'Platform hiring':'Recent funding',whyItMatters:'Timing matters for teams.',messageAngle:'Ask about timing.',
  source,keywords:[index?'platform engineer':'funding'],freshnessDays:30,strength:'strong',receiptIds:['saved']
}));
function fixture(){
  const workspace={
    status:'active',sellerProfile:{customers:[{name:'Fir Path',domain:'fir-path.example'}]},
    icpConfig:{segments:[{key:'studio',label:'Studios',subIndustries:['product studio']},{key:'labs',label:'Labs',subIndustries:['testing lab']}],
      killPatterns:{sizeMetric:{label:'minEmployees',floor:40}},triggerMapping:{tech_adoption:['Data mesh']}}
  };
  const playbook=playbooks.draftPlaybook({buyerRoles:{economicBuyer:['VP Operations'],champion:['Platform Lead'],endUser:[]},triggers:rules,antiTriggers:[]},{saved:receipt});
  workspace.sellerProfile.playbook={...playbook,status:'approved',approvedAt:'2026-11-01',approvedDigest:playbooks.digest(playbook)};
  return workspace;
}
describe('first-class ICPs',()=>{
  it('derives pending ICPs from saved segments, roles, rules and receipts without modifying the profile',()=>{
    const w=fixture(),profile=structuredClone(w.sellerProfile);
    const [icp]=icps.deriveIcps(w);
    expect(icp).toMatchObject({id:'studio',name:'Studios',status:'needs_review',version:1,buyerPersonas:['VP Operations','Platform Lead'],
      triggerIds:['rule-0','rule-1'],exclusions:['fir-path.example'],firmographics:{employeeMin:40,employeeMax:null,geographies:[],industries:['product studio'],technologies:['Data mesh']},
      receipts:[{sourceId:'saved',sourceUrl:receipt.sourceUrl,quote:receipt.evidenceQuote}]});
    expect(w.sellerProfile).toEqual(profile);
  });
  it('builds supported searches per ICP and playbook trigger with original windows',()=>{
    const w=fixture(),tasks=icps.buildIcpDiscoveryTasks(w,new Date('2026-11-17T00:00:00Z'));
    expect(tasks).toHaveLength(8);
    expect(new Set(tasks.map(row=>row.icpId+'|'+row.ruleId)).size).toBe(4);
    expect(tasks.filter(row=>row.icpId==='studio').every(row=>row.query.includes('product studio'))).toBe(true);
    expect(tasks.every(row=>row.tbs==='cdr:1,cd_min:10/18/2026,cd_max:11/17/2026')).toBe(true);
    expect(icps.buildIcpDiscoveryTasks({...w,referenceDemo:{loadOnly:true}})).toBeNull();
  });
  it('creates a review revision and retains the approved snapshot until separate review',()=>{
    const w=fixture();
    icps.approveIcps(w,'2026-11-01');
    const form=new URLSearchParams({id:'studio',version:'1',name:'Growing studios',employeeMin:'50',employeeMax:'250',buyerPersonas:'Platform Lead',triggerId:'rule-0'});
    icps.editIcp(w,form);
    expect(w.icps[0]).toMatchObject({version:2,status:'needs_review'});
    expect(icps.approvedIcps(w)[0].name).toBe('Studios');
    expect(()=>icps.updateIcpApproval(w,new URLSearchParams({id:'studio',version:'2'}),'2026-11-17')).toThrow(/confirm/i);
    icps.updateIcpApproval(w,new URLSearchParams({id:'studio',version:'2',acknowledged:'on'}),'2026-11-17');
    expect(icps.approvedIcps(w)[0].name).toBe('Growing studios');
  });
});
