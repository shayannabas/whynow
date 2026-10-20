// OpenAI Structured Outputs limits documented at:
// https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas
const STRUCTURED_OUTPUT_LIMITS = Object.freeze({
  enumValues: 1000,
  largeEnumThreshold: 250,
  largeEnumStringLength: 15000,
  objectProperties: 5000,
  nestingLevels: 10,
  schemaStringLength: 120000
});

function measureStructuredOutputSchema(schema) {
  const result={enumValues:0,enumStringLength:0,largestEnumValues:0,largestEnumStringLength:0,objectProperties:0,nestingLevels:0,schemaStringLength:0,enums:[]};
  function visit(node,depth=1) {
    if(!node||typeof node!=='object')return;
    result.nestingLevels=Math.max(result.nestingLevels,depth);
    if(node.properties&&typeof node.properties==='object') {
      const names=Object.keys(node.properties);
      result.objectProperties+=names.length;
      result.schemaStringLength+=names.reduce((sum,name)=>sum+name.length,0);
      for(const child of Object.values(node.properties))visit(child,depth+1);
    }
    if(node.$defs&&typeof node.$defs==='object') {
      const names=Object.keys(node.$defs);
      result.schemaStringLength+=names.reduce((sum,name)=>sum+name.length,0);
      for(const child of Object.values(node.$defs))visit(child,depth+1);
    }
    if(Array.isArray(node.enum)) {
      const stringLength=node.enum.reduce((sum,value)=>sum+(typeof value==='string'?value.length:0),0);
      const metric={values:node.enum.length,stringLength};
      result.enums.push(metric);
      result.enumValues+=metric.values;
      result.enumStringLength+=metric.stringLength;
      result.largestEnumValues=Math.max(result.largestEnumValues,metric.values);
      result.largestEnumStringLength=Math.max(result.largestEnumStringLength,metric.stringLength);
      result.schemaStringLength+=metric.stringLength;
    }
    if(Object.hasOwn(node,'const'))result.schemaStringLength+=String(node.const).length;
    if(node.items)visit(node.items,depth+1);
    for(const key of ['anyOf','oneOf'])if(Array.isArray(node[key]))for(const child of node[key])visit(child,depth+1);
  }
  visit(schema);
  return result;
}

function assertStructuredOutputSchemaWithinLimits(schema) {
  const metrics=measureStructuredOutputSchema(schema),limits=STRUCTURED_OUTPUT_LIMITS;
  const failures=[];
  if(metrics.enumValues>limits.enumValues)failures.push(`enum values ${metrics.enumValues}/${limits.enumValues}`);
  for(const item of metrics.enums)if(item.values>limits.largeEnumThreshold&&item.stringLength>limits.largeEnumStringLength)failures.push(`large enum string length ${item.stringLength}/${limits.largeEnumStringLength}`);
  if(metrics.objectProperties>limits.objectProperties)failures.push(`object properties ${metrics.objectProperties}/${limits.objectProperties}`);
  if(metrics.nestingLevels>limits.nestingLevels)failures.push(`nesting levels ${metrics.nestingLevels}/${limits.nestingLevels}`);
  if(metrics.schemaStringLength>limits.schemaStringLength)failures.push(`schema string length ${metrics.schemaStringLength}/${limits.schemaStringLength}`);
  if(failures.length)throw new Error(`Structured Outputs schema exceeds documented limits: ${failures.join(', ')}.`);
  return metrics;
}

module.exports={STRUCTURED_OUTPUT_LIMITS,measureStructuredOutputSchema,assertStructuredOutputSchemaWithinLimits};
