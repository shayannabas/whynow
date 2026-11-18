'use strict';

function senderFirstName(state){
  return state.settings?.senderFirstName||'Shayan';
}
function saveSender(state,input){
  const name=String(input||'').trim();
  if(!/^[\p{L}\p{M}][\p{L}\p{M}'’-]{0,59}$/u.test(name))throw Error('Enter a first name using letters, apostrophes or hyphens.');
  state.settings={...state.settings,senderFirstName:name};
  return state;
}
module.exports={senderFirstName,saveSender};
