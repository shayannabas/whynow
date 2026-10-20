import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {loadState}=require('../scripts/server/state.cjs');
const {COMPANIES}=require('../scripts/stage2-recovery-acceptance.cjs');
const {preparedState,workspaceForCompany}=require('../scripts/stage2-packet-redraft.cjs');
const {buildSynthesisSchema,buildSynthesisRequest,buildFocusedSynthesisRequests}=require('../scripts/onboarding/synthesize.cjs');
const {rawPageMap}=require('../scripts/onboarding/extract-organizations.cjs');
const {STRUCTURED_OUTPUT_LIMITS,measureStructuredOutputSchema,assertStructuredOutputSchemaWithinLimits}=require('../scripts/openai-schema.cjs');
const directory=path.dirname(fileURLToPath(import.meta.url));
const fixture=JSON.parse(fs.readFileSync(path.join(directory,'fixtures','openai','stage2-structured-output-packets.json'),'utf8'));

it('keeps every saved Stage 2 packet schema inside documented Structured Outputs limits',()=>{
  expect(STRUCTURED_OUTPUT_LIMITS).toEqual({enumValues:1000,largeEnumThreshold:250,largeEnumStringLength:15000,objectProperties:5000,nestingLevels:10,schemaStringLength:120000});
  for(const packet of fixture.packets) {
    const receiptIds=Array.from({length:packet.receiptCount},(_,index)=>`R${String(index+1).padStart(3,'0')}`);
    const schema=buildSynthesisSchema(receiptIds),metrics=measureStructuredOutputSchema(schema);
    expect(()=>assertStructuredOutputSchemaWithinLimits(schema),packet.seller).not.toThrow();
    expect(metrics,packet.seller).toMatchObject(packet.expectedSchemaMetrics);
    expect(metrics.enumValues,packet.seller).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.enumValues);
    expect(metrics.objectProperties,packet.seller).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.objectProperties);
    expect(metrics.nestingLevels,packet.seller).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.nestingLevels);
    expect(metrics.schemaStringLength,packet.seller).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.schemaStringLength);
    for(const item of metrics.enums)if(item.values>STRUCTURED_OUTPUT_LIMITS.largeEnumThreshold)expect(item.stringLength,packet.seller).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.largeEnumStringLength);
  }

  // The ignored saved state is present in the local acceptance workspace but
  // intentionally absent from CI. When available, verify the committed public
  // manifest against the real saved-page packet and production request builder.
  const acceptanceFile=path.join(directory,'..','.whynow','acceptance-state.json');
  if(fs.existsSync(acceptanceFile)) {
    const state=preparedState(loadState(acceptanceFile));
    for(const [index,company] of COMPANIES.entries()) {
      const packet=fixture.packets[index],workspace=workspaceForCompany(state,company),built=buildSynthesisRequest(state,workspace.id);
      const user=JSON.parse(built.request.messages[1].content),serialized=JSON.stringify(user.evidence);
      expect(company.name).toBe(packet.seller);
      expect(built.evidence.receiptCount).toBe(packet.receiptCount);
      expect(built.evidence.bytes).toBe(packet.packetBytes);
      expect(createHash('sha256').update(serialized).digest('hex')).toBe(packet.packetSha256);
      expect(built.evidence.sourceSetHash).toBe(packet.sourceSetHash);
      expect(measureStructuredOutputSchema(built.request.schema)).toMatchObject(packet.expectedSchemaMetrics);
    }
  }

  const finalStateFile=path.join(directory,'..','.whynow','stage2-final-state.json');
  const finalCache=path.join(directory,'..','.whynow','stage2-final-live-cache');
  if(fs.existsSync(finalStateFile)) {
    const state=preparedState(loadState(finalStateFile)),rawPages=rawPageMap([finalCache]);
    for(const workspace of Object.values(state.workspaces)) {
      if(!['resolve.ai','shopify.com','vercel.com'].includes(workspace.research?.selectedCandidate?.domain))continue;
      const built=buildFocusedSynthesisRequests(state,workspace.id,{rawPages});
      for(const request of Object.values(built.requests)) {
        const metrics=measureStructuredOutputSchema(request.schema);
        expect(()=>assertStructuredOutputSchemaWithinLimits(request.schema),`${workspace.name}: ${request.name}`).not.toThrow();
        expect(metrics.enumValues,`${workspace.name}: ${request.name}`).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.enumValues);
        for(const item of metrics.enums)if(item.values>STRUCTURED_OUTPUT_LIMITS.largeEnumThreshold)expect(item.stringLength,`${workspace.name}: ${request.name}`).toBeLessThanOrEqual(STRUCTURED_OUTPUT_LIMITS.largeEnumStringLength);
      }
    }
  }
});
