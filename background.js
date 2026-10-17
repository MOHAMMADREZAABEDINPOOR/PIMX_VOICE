import { DEFAULTS, normalizeSettings, filterModels, friendlyError, hasSubtitles } from './core.js';
import { keyMetadata } from './keyring.js';
const trusted = Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})]);
let mutation=Promise.resolve(), badge;
const serial=fn=>{const result=mutation.then(fn);mutation=result.catch(()=>{});return result;};
const empty={active:false,status:'idle',transcript:[],error:null};
const offscreenURL=chrome.runtime.getURL('offscreen.html');
const state=async()=> (await chrome.storage.session.get('state')).state || {...empty};
const settings=async()=>normalizeSettings((await chrome.storage.local.get('settings')).settings);
async function credentials(){
  const [local,session]=await Promise.all([chrome.storage.local.get(['keys','apiKey']),chrome.storage.session.get(['keys','apiKey'])]);
  const entries=[...(local.keys||[]).map(e=>({...e,remember:true})),...(session.keys||[]).map(e=>({...e,remember:false}))];
  const legacy=session.apiKey||local.apiKey;
  if(legacy&&!entries.some(e=>e.value===legacy)){
    entries.push({id:'legacy',name:'API 1',value:legacy,remember:!session.apiKey});await writeKeys(entries);
    await Promise.all([chrome.storage.local.remove('apiKey'),chrome.storage.session.remove('apiKey')]);
  }
  const preferred=(await chrome.storage.local.get('preferredKey')).preferredKey;
  return entries.sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred));
}
async function writeKeys(entries){
  await chrome.storage.local.set({keys:entries.filter(e=>e.remember)});
  await chrome.storage.session.set({keys:entries.filter(e=>!e.remember)});
}
async function hasOffscreen(){return (await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT'],documentUrls:[offscreenURL]})).length>0;}
async function overlay(tabId,message){if(tabId)try{await chrome.tabs.sendMessage(tabId,{target:'overlay',...message});}catch{}}
async function setState(value){
  await chrome.storage.session.set({state:value});
  const text=value.active?(value.status==='connecting'?'…':'LIVE'):'';
  if(text!==badge){await chrome.action.setBadgeText({text});await chrome.action.setBadgeBackgroundColor({color:'#176b72'});badge=text;}
}
async function stop(error=null){
  const current=await state();
  if(await hasOffscreen()){
    try{await chrome.runtime.sendMessage({target:'offscreen',type:'STOP'});}catch{}
    await chrome.offscreen.closeDocument();
  }
  await overlay(current.tabId,{type:'STOP'});
  await setState({...current,active:false,status:error?'error':'idle',error});return {ok:true};
}
async function start(tabId){
  if((await state()).active)return {ok:true};
  const keys=await credentials();if(!keys.length)throw new Error('API_KEY missing');
  const tab=await chrome.tabs.get(tabId);
  if(!/^https?:\/\//.test(tab.url||'')||/chromewebstore.google.com|chrome.google.com\/webstore|microsoftedge.microsoft.com\/addons/.test(tab.url))throw new Error('Cannot capture this page');
  const config=await settings();
  await setState({...empty,active:true,status:'connecting',tabId,tabTitle:tab.title,startedAt:Date.now(),config,keyId:keys[0].id,keyName:keys[0].name});
  try{
    await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
    await overlay(tabId,{type:'INIT',settings:config,font:(await chrome.storage.local.get('customFont')).customFont||null});
    if(!(await hasOffscreen()))await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['USER_MEDIA','AUDIO_PLAYBACK'],justification:'Translate tab audio and play dubbing while the toolbar popup is closed.'});
    const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:tabId});
    const result=await chrome.runtime.sendMessage({target:'offscreen',type:'START',streamId,keys,settings:config});
    if(!result?.ok)throw new Error(result?.error||'Connection failed');
    await setState({...await state(),status:'live'});return {ok:true};
  }catch(e){await stop(friendlyError(e));return {ok:false,error:friendlyError(e)};}
}
async function loadModels(value){
  const models=[];let pageToken;
  do{
    const url=new URL('https://generativelanguage.googleapis.com/v1beta/models');url.searchParams.set('pageSize','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);
    const response=await fetch(url,{headers:{'x-goog-api-key':value},signal:AbortSignal.timeout(20000)});const data=await response.json();
    if(!response.ok)throw new Error(`${response.status} ${data.error?.message||''}`);
    models.push(...(data.models||[]));pageToken=data.nextPageToken;
  }while(pageToken);
  const catalog=filterModels(models);if(!catalog.live.length)throw new Error('NO_LIVE_MODELS');return catalog;
}
const critical=['mode','model','textModel','voiceModel','voiceName','source','target','subtitleLanguage','subtitleLanguage2','dualSubtitles'];
async function dispatch(message,sender){
  await trusted;
  const fromUI=sender.url===chrome.runtime.getURL('popup.html');
  if(!fromUI&&sender.url!==offscreenURL){
    if(sender.tab&&message.type==='OVERLAY_STOP'&&(await state()).tabId===sender.tab.id)return serial(()=>stop());
    return {ok:false};
  }
  if(message.type==='GET'&&fromUI){
    let current=await state();if(current.active&&!(await hasOffscreen())){current={...current,active:false,status:'error',error:'network'};await setState(current);}
    const keys=await credentials();const font=(await chrome.storage.local.get('customFont')).customFont;
    return {settings:await settings(),state:current,hasKey:keys.length>0,keys:keyMetadata(keys),remembered:keys.some(k=>k.remember),catalog:(await chrome.storage.local.get('catalog')).catalog,font:font?{name:font.name,id:font.id}:null};
  }
  if(message.type==='SAVE_KEY'&&fromUI)return serial(async()=>{
    if((await state()).active)return {ok:false,error:'active'};
    const value=String(message.apiKey||'').trim(),keys=await credentials();
    if(keys.some(k=>k.value===value))return {ok:false,error:'duplicateKey'};
    if(keys.length>=12)return {ok:false,error:'keyLimit'};
    const catalog=await loadModels(value);
    keys.push({id:crypto.randomUUID(),name:String(message.name||'').trim().slice(0,40)||`API ${keys.length+1}`,value,remember:!!message.remember});
    await writeKeys(keys);await chrome.storage.local.set({catalog});return {ok:true,catalog,keys:keyMetadata(keys)};
  });
  if(message.type==='REMOVE_KEY'&&fromUI)return serial(async()=>{
    if((await state()).active)return {ok:false,error:'active'};
    const keys=(await credentials()).filter(k=>k.id!==message.id);await writeKeys(keys);return {ok:true,keys:keyMetadata(keys)};
  });
  if(message.type==='PREFER_KEY'&&fromUI)return serial(async()=>{
    if((await state()).active)return {ok:false,error:'active'};
    if(!(await credentials()).some(k=>k.id===message.id))return {ok:false};
    await chrome.storage.local.set({preferredKey:message.id});return {ok:true,keys:keyMetadata(await credentials())};
  });
  if(message.type==='REFRESH_MODELS'&&fromUI){
    let last;
    for(const key of await credentials())try{const catalog=await loadModels(key.value);await chrome.storage.local.set({catalog});return {ok:true,catalog};}catch(e){last=e;}
    throw last||new Error('API_KEY missing');
  }
  if(message.type==='FORGET_KEY'&&fromUI)return serial(async()=>{
    await stop();await chrome.storage.local.remove(['keys','apiKey','catalog','preferredKey']);await chrome.storage.session.remove(['keys','apiKey']);return {ok:true};
  });
  if(message.type==='SAVE_SETTINGS'&&fromUI)return serial(async()=>{
    const previous=await settings(),config=normalizeSettings({...previous,...message.settings}),current=await state();
    if(current.active&&critical.some(k=>config[k]!==previous[k]))return {ok:false,error:'active'};
    await chrome.storage.local.set({settings:config});
    if(current.active)await overlay(current.tabId,{type:'SETTINGS',settings:config});
    return {ok:true,settings:config};
  });
  if(message.type==='SAVE_FONT'&&fromUI)return serial(async()=>{
    const data=String(message.data||''),name=String(message.name||'Custom font').slice(0,100);
    if(data.length>2800000||!/^[A-Za-z0-9+/]+=*$/.test(data))return {ok:false,error:'fontError'};
    const header=atob(data.slice(0,12));
    if(!['wOFF','wOF2','OTTO','\x00\x01\x00\x00','true'].includes(header.slice(0,4)))return {ok:false,error:'fontError'};
    const font={id:crypto.randomUUID(),name,data};await chrome.storage.local.set({customFont:font});
    const config={...await settings(),fontFamily:'custom'};await chrome.storage.local.set({settings:config});
    const current=await state();if(current.active){await overlay(current.tabId,{type:'FONT',font});await overlay(current.tabId,{type:'SETTINGS',settings:config});}
    return {ok:true,font:{id:font.id,name},settings:config};
  });
  if(message.type==='GET_FONT'&&fromUI)return {ok:true,font:(await chrome.storage.local.get('customFont')).customFont||null};
  if(message.type==='REMOVE_FONT'&&fromUI)return serial(async()=>{
    await chrome.storage.local.remove('customFont');const config={...await settings(),fontFamily:'Tahoma'};await chrome.storage.local.set({settings:config});
    const current=await state();if(current.active){await overlay(current.tabId,{type:'FONT',font:null});await overlay(current.tabId,{type:'SETTINGS',settings:config});}
    return {ok:true,settings:config};
  });
  if(message.type==='START'&&fromUI)return serial(()=>start(message.tabId));
  if(message.type==='STOP'&&fromUI)return serial(()=>stop());
  if(sender.url===offscreenURL&&message.type==='ENGINE_EVENT')return serial(async()=>{
    const current=await state();if(!current.active)return {ok:true};
    if(message.event==='error')return stop(message.error);
    if(message.event==='keychange'){await setState({...current,keyId:message.id,keyName:message.name,keySwitches:(current.keySwitches||0)+1});return {ok:true};}
    if(message.event==='reconnecting'||message.event==='connected'){await setState({...current,status:message.event==='connected'?'live':'reconnecting'});return {ok:true};}
    if(message.event==='caption'){
      const caption={id:message.id,original:String(message.original||'').slice(-3000),translation:String(message.translation||'').slice(-3000),lines:(message.lines||[]).slice(0,2).map(l=>({language:String(l.language).slice(0,20),text:String(l.text||'').slice(-3000)})),time:Date.now()};
      const transcript=[...current.transcript];const index=transcript.findIndex(c=>c.id===caption.id);
      if(index>=0)transcript[index]=caption;else transcript.push(caption);
      await setState({...current,transcript:transcript.slice(-80),status:'live'});
      if(hasSubtitles(current.config))await overlay(current.tabId,{type:'CAPTION',caption});
    }
    return {ok:true};
  });
  return {ok:false};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message.target!=='background')return;
  dispatch(message,sender).then(reply).catch(e=>reply({ok:false,error:friendlyError(e)}));return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{serial(async()=>{if((await state()).tabId===tabId)await stop();});});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status==='loading')serial(async()=>{const s=await state();if(s.active&&s.tabId===tabId)await stop();});});
