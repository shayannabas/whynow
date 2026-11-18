import {expect,it} from 'vitest';
import message from '../scripts/onboarding/messaging-proof.cjs';
import drafts from '../scripts/outreach-drafts.cjs';

const product='Your team can plan cloud spending and see the costs in one place.';
const title='Fable Stack Cuts 18% From Its Cloud Bill';
function fixture(){
  const sales={id:'seller-page',url:'https://paper-pier.example/pricing',text:product};
  const story={id:'customer-story',url:'https://paper-pier.example/customers/fable-stack',title,text:'Case study '+title};
  const other={id:'blog',url:'https://blogger.example/customers/fable-stack',title,text:title};
  const w={id:'paper',name:'Paper Pier',status:'active',profileRevision:4,sellerProfile:{approvedAt:'2026-11-15',domain:'paper-pier.example',customers:[{name:'Fable Stack'}],
    productOneLiner:'A loose paraphrase.', evidence:{productOneLiner:{inferred:false,sourceId:sales.id,evidenceQuote:product},'proofPoints.0':{inferred:false,sourceId:story.id},'proofPoints.1':{inferred:false,sourceId:other.id}}},icpConfig:{}};
  const s={workspaces:{paper:w},sources:Object.fromEntries([sales,story,other].map(row=>[row.id,row])),auditLog:[]};
  return {s,w};
}
it('lists exact first-party statements separately as review candidates',()=>{
  const {s,w}=fixture();
  const rows=message.candidates(s,w);
  expect(rows.map(row=>[row.kind,row.quote,row.status])).toEqual([
    ['product',product,'needs_review'],['customer_proof',title,'needs_review']
  ]);
  expect(drafts.approvedSellerClaims(w)).toBeNull();
  expect(message.messagingProofPanel(s,w)).toContain('Needs review');
});
it('requires explicit current-revision approval before copy can use a saved statement',()=>{
  const {s,w}=fixture(),rows=message.candidates(s,w);
  const params=new URLSearchParams({profileRevision:'4'});
  for(const row of rows)params.append('proofId',row.id);
  expect(()=>message.approveMessaging(s,w.id,params)).toThrow(/confirm/);
  params.set('acknowledged','on');
  message.approveMessaging(s,w.id,params,'2026-11-17');
  const claims=drafts.approvedSellerClaims(w);
  expect(claims.product.value).toBe(product);
  expect(claims.customerProofs).toHaveLength(1);
  expect(drafts.attributedProofSentence(claims.customerProofs[0])).toContain('Fable Stack case study reports');
  expect(s.auditLog[0].type).toBe('messaging_proof_approved');
  w.profileRevision++;
  expect(drafts.approvedSellerClaims(w)).toBeNull();
});
