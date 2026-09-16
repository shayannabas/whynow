const http = require('node:http');
const path = require('node:path');
const {loadEnv} = require('./env.cjs');
const {createRouter} = require('./server/router.cjs');
loadEnv(path.resolve(__dirname,'../.env'));
if (require.main === module) {
  const server = http.createServer(createRouter());
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(process.env.PORT || 3000,process.env.HOST || '127.0.0.1',()=>console.log(`WhyNow: http://${process.env.HOST || '127.0.0.1'}:${server.address().port}`));
}
