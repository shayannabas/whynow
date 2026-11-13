const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { nowIso } = require('../utils.cjs');
function statePath(env=process.env) {
  const directory=String(env.STATE_DIR||path.resolve(__dirname,'../../.whynow')).trim();
  if(!directory)throw new Error('STATE_DIR cannot be empty.');
  return path.resolve(directory,'local-state.json');
}
const STATE_FILE = statePath();
const defaultState = () => ({schemaVersion:1, activeWorkspaceId:null, workspaces:{}, companyCache:{}, sources:{}, auditLog:[]});
function validate(state) {
  if (state?.schemaVersion !== 1 || !state.workspaces || Array.isArray(state.workspaces) || !state.companyCache || !state.sources || !Array.isArray(state.auditLog)) throw new Error('Invalid state schema');
  if (state.activeWorkspaceId !== null && !Object.hasOwn(state.workspaces, state.activeWorkspaceId)) throw new Error('Unknown active workspace');
  for (const [id, w] of Object.entries(state.workspaces)) {
    if (w.id !== id || w.schemaVersion !== 1 || typeof w.name !== 'string' || !w.sellerProfile || !w.icpConfig || !w.budgets || !['accounts','universeSeeds','runs','suppression','drafts','outcomes'].every(key => Array.isArray(w[key]))) throw new Error('Invalid workspace schema');
    if(w.rejectedDiscovery !== undefined && !Array.isArray(w.rejectedDiscovery)) throw new Error('Invalid rejected discovery archive');
  }
  return state;
}
function atomicWrite(file, contents, beforeRename = () => {}) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, contents); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    beforeRename();
    fs.renameSync(temp, file);
    const dir = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function loadState(file = STATE_FILE) {
  try { return validate(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (error) {
    try {
      const backup = validate(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')));
      atomicWrite(file, JSON.stringify(backup, null, 2));
      return backup;
    } catch (backupError) {
      if (error.code === 'ENOENT' && backupError.code === 'ENOENT') { const state = defaultState(); saveState(state, file); return state; }
      throw new Error('State and backup could not be read; refusing to overwrite saved data', {cause:error});
    }
  }
}
function saveState(state, file = STATE_FILE, beforeRename) {
  const contents = JSON.stringify(validate(state), null, 2);
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, 'utf8'); validate(JSON.parse(old));
    atomicWrite(`${file}.bak`, old);
  }
  atomicWrite(file, contents, beforeRename);
}
function getWorkspace(state, id) {
  if (!Object.hasOwn(state.workspaces, id)) throw new Error('Unknown workspace');
  return structuredClone(state.workspaces[id]);
}
function updateWorkspace(state, id, fn) {
  const next = structuredClone(state); const workspace = getWorkspace(state, id);
  const result = fn(workspace) ?? workspace;
  if (result.id !== id) throw new Error('Workspace identity cannot change');
  next.workspaces[id] = result; return validate(next);
}
function createWorkspace(state, {name}) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) throw new Error('Enter a workspace name of 1–120 characters');
  const next = structuredClone(state); const id = randomUUID();
  next.workspaces[id] = {schemaVersion:1, id, name:name.trim(), createdAt:nowIso(), status:'draft', deliveryMode:'demo', sellerProfile:{schemaVersion:1, deliveryAllowed:false}, icpConfig:{schemaVersion:1}, accounts:[], universeSeeds:[], runs:[], suppression:[], drafts:[], outcomes:[], budgets:{}};
  next.activeWorkspaceId = id; return next;
}
module.exports = { STATE_FILE, defaultState, loadState, saveState, getWorkspace, updateWorkspace, createWorkspace, atomicWrite, statePath };
