const fs = require('node:fs');
const path = require('node:path');
const { json } = require('../utils.cjs');
const { loadState, saveState } = require('./state.cjs');
const { overview, shell } = require('./pages.cjs');
const { workspaceAction } = require('./actions.cjs');
function createRouter({stateFile} = {}) {
  loadState(stateFile);
  let writes = Promise.resolve();
  return async (req,res) => {
    const html = (status, body) => {res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);};
    try {
      const pathname = new URL(req.url,'http://localhost').pathname;
      if (req.method==='GET' && pathname==='/health') {loadState(stateFile);return json(res,200,{status:'ok'});}
      if (req.method==='GET' && pathname==='/fonts/manrope-latin-wght-normal.woff2') {
        const font=fs.readFileSync(path.resolve(__dirname,'../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'));
        res.writeHead(200,{'Content-Type':'font/woff2'});return res.end(font);
      }
      if (req.method==='GET' && pathname==='/') return html(200,overview(loadState(stateFile)));
      if (req.method==='POST' && ['/workspaces','/workspaces/switch'].includes(pathname)) {
        // Queue complete read-modify-write operations to avoid lost updates.
        const work = writes.then(async()=>{const next=await workspaceAction(req,loadState(stateFile),pathname);saveState(next,stateFile);});
        writes=work.catch(()=>{});
        try {await work;} catch {return html(400,shell(loadState(stateFile),'<h1>Could not save workspace</h1><p>Check the name or workspace selection and try again.</p><a href="/">Return to Overview</a>'));}
        res.writeHead(303,{Location:'/'});return res.end();
      }
      html(404,shell(loadState(stateFile),'<h1>Page not found</h1><a href="/">Return to Overview</a>','Not found'));
    } catch(error) {
      console.error('Request failed:',error.message);
      html(500,'<!doctype html><html lang="en"><title>WhyNow · Error</title><h1>Something went wrong</h1><p>Your request could not be completed. Check the server and try again.</p></html>');
    }
  };
}
module.exports = {createRouter};
