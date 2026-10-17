import { DEFAULTS, LANGUAGES, VOICES, modelKind, normalizeSettings, hasDubbing, hasSubtitles } from './core.js';
import { messages } from './i18n.js';
import { syncSelects } from './selects.js';
const $=id=>document.getElementById(id);
const languageNames=['en','fa'].map(locale=>new Intl.DisplayNames([locale],{type:'language'}));
let config={...DEFAULTS},session={active:false,status:'idle',transcript:[]},catalog,keys=[],fontInfo=null,customFace;
let hasKey=false,currentView='translator',currentTab,pending=false,noticeKey,modelLoading=false,modelError=null;
const t=key=>messages[config.locale]?.[key]||messages.en[key]||messages.en.network;
const send=message=>chrome.runtime.sendMessage({target:'background',...message});
function notice(key,success=false){noticeKey=key;$('notice').textContent=t(key);$('notice').classList.toggle('success',success);$('notice').hidden=false;requestAnimationFrame(()=>$('notice').scrollIntoView({block:'nearest'}));}
function clearNotice(){noticeKey=null;$('notice').hidden=true;}
function fillSelect(id,entries,value){
  const select=$(id);select.replaceChildren();for(const [code,label]of entries){const option=document.createElement('option');option.value=code;option.textContent=label;
    if(['source','target','subtitle-language','subtitle-language-2'].includes(id)&&!['source','auto'].includes(code)){
      try{option.dataset.search=languageNames.map(names=>names.of(code)).join(' ');}catch{}
    }
    select.append(option);}
  if(entries.some(([code])=>code===value))select.value=value;
}
const fieldMap={source:'source',target:'target','voice-name':'voiceName',model:'model','text-model':'textModel','voice-model':'voiceModel','subtitle-language':'subtitleLanguage','subtitle-language-2':'subtitleLanguage2','font-family':'fontFamily','font-size':'fontSize','second-font-size':'secondFontSize','text-color':'textColor','second-color':'secondColor','background-color':'backgroundColor','background-opacity':'backgroundOpacity','outline-color':'outlineColor','outline-width':'outlineWidth',position:'position',offset:'offset',alignment:'alignment','font-weight':'fontWeight','line-height':'lineHeight',radius:'radius',padding:'padding'};
const numeric=new Set(['fontSize','secondFontSize','backgroundOpacity','outlineWidth','offset','lineHeight','radius','padding']);
const styleNames=['fontFamily','fontSize','secondFontSize','textColor','secondColor','backgroundColor','backgroundOpacity','outlineColor','outlineWidth','position','offset','alignment','fontWeight','lineHeight','radius','padding','shadow'];
function showView(view){
  currentView=view;$('onboarding').hidden=hasKey;$('navigation').hidden=!hasKey;
  for(const name of ['translator','appearance','keys'])$(name).hidden=!hasKey||view!==name;
  for(const button of document.querySelectorAll('[data-view]')){button.classList.toggle('active',button.dataset.view===view);button.setAttribute('aria-pressed',String(button.dataset.view===view));}
  (hasKey?$('extra-key-slot'):$('onboarding-key-slot')).append($('key-form'));$('key-form').hidden=false;
  $('key-name').hidden=!hasKey;document.querySelector('label[for="key-name"]').hidden=!hasKey;
  $('connect').querySelector('span').textContent=t(hasKey?'addKey':'connect');
}
function renderKeys(){
  $('key-list').replaceChildren();
  keys.forEach((key,index)=>{
    const row=document.createElement('div');row.className='key-row';const info=document.createElement('div');info.className='key-info';
    const name=document.createElement('strong');name.textContent=key.name;
    const detail=document.createElement('small');detail.dir='auto';detail.textContent=`•••• ${key.suffix} · ${t(key.remember?'savedKey':'sessionKey')}${index===0?' · '+t('primaryKey'):''}`;
    info.append(name,detail);const actions=document.createElement('div');actions.className='key-actions';
    if(index>0){const prefer=document.createElement('button');prefer.type='button';prefer.className='text-button';prefer.textContent=t('prefer');prefer.disabled=!!session.active;prefer.onclick=()=>manageKey('PREFER_KEY',key.id);actions.append(prefer);}
    const remove=document.createElement('button');remove.type='button';remove.className='text-button danger-text';remove.textContent=t('remove');remove.disabled=!!session.active;remove.onclick=()=>manageKey('REMOVE_KEY',key.id);actions.append(remove);row.append(info,actions);$('key-list').append(row);
  });
  for(const input of $('key-form').querySelectorAll('input,button'))input.disabled=!!session.active;
}
function render(){
  const languageGrid=$('dubbing-language').parentElement;
  if($('voice-controls').parentElement!==languageGrid){
    const sourceField=$('source').parentElement;sourceField.classList.add('source-setting');
    document.querySelector('.model-details').append(sourceField);languageGrid.append($('voice-controls'));
  }
  document.documentElement.lang=config.locale;document.documentElement.dir=config.locale==='fa'?'rtl':'ltr';document.documentElement.dataset.theme=config.theme;
  for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
  for(const node of document.querySelectorAll('[data-aria]'))node.setAttribute('aria-label',t(node.dataset.aria));
  if(noticeKey)$('notice').textContent=t(noticeKey);
  $('locale').textContent=config.locale==='fa'?'EN':'فا';$('locale').setAttribute('aria-label',config.locale==='fa'?'Switch to English':'تغییر زبان به فارسی');
  fillSelect('source',[['auto',t('auto')],...LANGUAGES],config.source);$('source').disabled=modelKind(config.model)==='translate';if($('source').disabled)$('source').value='auto';
  for(const id of ['target','subtitle-language'])fillSelect(id,LANGUAGES,config[fieldMap[id]]);
  fillSelect('subtitle-language-2',[['source',t('originalSource')],...LANGUAGES.filter(([code])=>code!==config.subtitleLanguage)],config.subtitleLanguage2);
  fillSelect('voice-name',[['native',t('nativeVoice')],...VOICES.map(name=>[name,name])],config.voiceName);
  fillSelect('model',(catalog?.live||[]).map(name=>[name,name]),config.model);
  fillSelect('text-model',(catalog?.text||[config.textModel]).map(name=>[name,name]),config.textModel);
  fillSelect('voice-model',(catalog?.tts||[config.voiceModel]).map(name=>[name,name]),config.voiceModel);
  fillSelect('font-family',[['Tahoma','Tahoma'],['Arial','Arial'],['Georgia','Georgia'],['sans-serif',t('systemFont')],...(fontInfo?[['custom',fontInfo.name]]:[])],config.fontFamily);
  for(const[id,name]of Object.entries(fieldMap))if(!['source','target','model','text-model','voice-model','voice-name','subtitle-language','subtitle-language-2','font-family'].includes(id))$(id).value=config[name];
  $('dual-subtitles').checked=config.dualSubtitles;$('shadow').checked=config.shadow;$('second-language-field').hidden=!config.dualSubtitles;
  $('font-name').textContent=fontInfo?.name||'';$('remove-font').hidden=!fontInfo;
  for(const button of document.querySelectorAll('[data-mode]'))button.setAttribute('aria-pressed',String(config.mode===button.dataset.mode));
  $('dubbing-language').hidden=!hasDubbing(config);$('voice-controls').hidden=!hasDubbing(config);
  $('subtitle-summary-row').hidden=!hasSubtitles(config);$('main-preview').hidden=!hasSubtitles(config);
  const languageName=code=>code==='source'?t('originalSource'):LANGUAGES.find(([v])=>v===code)?.[1]||code;
  $('subtitle-summary').textContent=[languageName(config.subtitleLanguage),...(config.dualSubtitles?[languageName(config.subtitleLanguage2)]:[])].join(' + ');
  $('model-help').textContent=t(modelKind(config.model)+'Help');
  showView(currentView);renderKeys();renderSession();applyPreviewStyles();
}
function renderSession(){
  $('status-label').textContent=t(session.status||'idle');$('status-dot').className=session.active?(session.status==='live'?'live':'busy'):'';
  $('tab-title').textContent=session.active?session.tabTitle:currentTab?.title||t('tabFallback');$('tab-title').title=$('tab-title').textContent;
  $('session-config').disabled=!!session.active||pending;$('subtitle-config').disabled=!!session.active||pending;
  $('model').disabled=modelLoading||!catalog?.live?.length;$('model').dataset.loading=String(modelLoading);
  $('model').dataset.placeholder=t(modelLoading?'loadingModels':'noModels');$('refresh-models').disabled=modelLoading;
  $('model-status').textContent=modelLoading?t('loadingModels'):modelError?t(modelError):catalog?.live?.length?t('modelCount').replace('{count}',new Intl.NumberFormat(config.locale).format(catalog.live.length)):t('noModels');
  $('start-stop').disabled=pending||(!session.active&&!catalog?.live?.length);$('start-stop').classList.toggle('stop',!!session.active);
  $('action-label').textContent=pending?t('starting'):t(session.active?'stop':'start');
  $('action-symbol').replaceChildren();const shape=document.createElementNS('http://www.w3.org/2000/svg','path');shape.setAttribute('d',session.active?'M6 6h12v12H6Z':'m9 5 11 7-11 7Z');$('action-symbol').append(shape);
  $('session-hint').textContent=t(session.active?'activeHint':'startHint');$('preview-kind').textContent=t(session.active?'livePreview':'example');
  const latest=session.transcript?.at(-1);$('preview-translation').textContent=latest?.lines?.[0]?.text||(session.active?t('waiting'):t('previewText'));
  $('preview-secondary').textContent=latest?.lines?.[1]?.text||(session.active?'':t('previewText2'));$('preview-secondary').hidden=!config.dualSubtitles;
  $('export').disabled=!session.transcript?.length;$('active-key').textContent=session.active?session.keyName||'':keys.length>1?`${keys.length} API`:keys[0]?.name||'';
  if(session.error&&noticeKey!==session.error)notice(session.error);
  syncSelects({search:t('selectSearch'),empty:t('selectEmpty'),choose:t('selectChoose')});
}
function applyPreviewStyles(){
  $('style-primary').textContent=t('previewText');$('style-secondary').textContent=t('previewText2');$('style-secondary').hidden=!config.dualSubtitles;
  const h=config.backgroundColor,bg=`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${config.backgroundOpacity/100})`;
  for(const[id,second]of [['preview-translation',false],['preview-secondary',true],['style-primary',false],['style-secondary',true]]){
    const node=$(id);node.style.fontFamily=config.fontFamily==='custom'&&customFace?'PIMXPreview,Tahoma,sans-serif':config.fontFamily==='custom'?'Tahoma':config.fontFamily;
    node.style.fontSize=`${second?config.secondFontSize:config.fontSize}px`;node.style.color=second?config.secondColor:config.textColor;node.style.fontWeight=config.fontWeight;
    node.style.backgroundColor=bg;node.style.borderRadius=`${config.radius}px`;node.style.padding=`${Math.max(2,config.padding/2)}px ${config.padding}px`;node.style.lineHeight=config.lineHeight;
    node.style.textAlign=config.alignment;node.style.webkitTextStroke=`${config.outlineWidth}px ${config.outlineColor}`;node.style.paintOrder='stroke fill';node.style.textShadow=config.shadow?'0 2px 4px #0008':'none';
    if(id.startsWith('preview-')){node.style.fontSize=second?'14px':'16px';node.style.padding='2px 6px';node.style.lineHeight='1.4';}
  }
}
async function save(delta){
  const previous=config;config=normalizeSettings({...config,...delta});render();
  try{const result=await send({type:'SAVE_SETTINGS',settings:delta});if(!result?.ok){config=previous;render();notice(result?.error||'network');}else if(result.settings){config=result.settings;render();}}
  catch{config=previous;render();notice('network');}
}
function reconcile(){
  for(const[name,list]of [['model',catalog?.live],['textModel',catalog?.text],['voiceModel',catalog?.tts]])if(list?.length&&!list.includes(config[name]))config[name]=list.includes(DEFAULTS[name])?DEFAULTS[name]:list[0];
}
async function manageKey(type,id){
  clearNotice();const result=await send({type,id});if(!result?.ok){notice(result?.error||'network');return;}
  keys=result.keys;hasKey=!!keys.length;render();
}
async function loadFont(font){
  if(customFace){document.fonts.delete(customFace);customFace=null;}if(!font?.data)return;
  const raw=atob(font.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  customFace=await new FontFace('PIMXPreview',bytes.buffer).load();document.fonts.add(customFace);applyPreviewStyles();
}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{clearNotice();showView(button.dataset.view);$('notice').hidden=true;};
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>save({mode:button.dataset.mode});
$('edit-subtitles').onclick=()=>showView('appearance');
$('locale').onclick=()=>save({locale:config.locale==='fa'?'en':'fa'});$('theme').onclick=()=>save({theme:config.theme==='dark'?'light':'dark'});
$('reveal-key').onclick=()=>{const show=$('api-key').type==='password';$('api-key').type=show?'text':'password';$('reveal-key').setAttribute('aria-pressed',String(show));};
$('key-form').onsubmit=async event=>{
  event.preventDefault();clearNotice();$('connect').disabled=true;$('connect').querySelector('span').textContent=t('connectingKey');
  try{
    const result=await send({type:'SAVE_KEY',apiKey:$('api-key').value,name:$('key-name').value,remember:$('remember').checked});
    if(!result?.ok){notice(result?.error||'network');return;}
    keys=result.keys;hasKey=true;catalog=result.catalog;$('api-key').value='';$('api-key').type='password';$('key-name').value='';reconcile();
    await send({type:'SAVE_SETTINGS',settings:config});render();notice('keyConnected',true);
  }catch{notice('network');}finally{$('connect').disabled=false;$('connect').querySelector('span').textContent=t(hasKey?'addKey':'connect');}
};
for(const[id,name]of Object.entries(fieldMap)){
  $(id).onchange=()=>save({[name]:numeric.has(name)?Number($(id).value):$(id).value});
  if(numeric.has(name)||$(id).type==='color')$(id).oninput=()=>{config=normalizeSettings({...config,[name]:numeric.has(name)?Number($(id).value):$(id).value});applyPreviewStyles();};
}
$('dual-subtitles').onchange=()=>save({dualSubtitles:$('dual-subtitles').checked});$('shadow').onchange=()=>save({shadow:$('shadow').checked});
async function refreshModels(manual=true){
  if(modelLoading)return;
  if(manual)clearNotice();modelLoading=true;modelError=null;renderSession();
  try{
    const result=await send({type:'REFRESH_MODELS'});
    if(!result?.ok){modelError=result?.error||'network';notice(modelError);return;}
    catalog=result.catalog;reconcile();await send({type:'SAVE_SETTINGS',settings:config});render();
  }catch{modelError='network';notice('network');}
  finally{modelLoading=false;renderSession();}
}
$('refresh-models').onclick=()=>refreshModels();
$('start-stop').onclick=async()=>{
  clearNotice();pending=true;renderSession();
  try{const result=await send({type:session.active?'STOP':'START',tabId:currentTab?.id});if(!result?.ok)notice(result?.error||'network');const data=await send({type:'GET'});session=data.state;}
  catch{notice('network');}finally{pending=false;renderKeys();renderSession();}
};
$('forget-key').onclick=async()=>{const result=await send({type:'FORGET_KEY'});if(!result?.ok){notice(result?.error||'network');return;}keys=[];hasKey=false;catalog=null;session={active:false,status:'idle',transcript:[]};currentView='translator';render();notice('removed',true);};
$('font-file').onchange=async()=>{
  const file=$('font-file').files[0];if(!file)return;
  try{
    if(file.size>2*1024*1024||!file.size)throw new Error('Font size');const buffer=await file.arrayBuffer();await new FontFace('PIMXValidation',buffer).load();
    const bytes=new Uint8Array(buffer),pieces=[];for(let i=0;i<bytes.length;i+=8192)pieces.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
    const result=await send({type:'SAVE_FONT',name:file.name,data:btoa(pieces.join(''))});if(!result?.ok)throw new Error('Font rejected');
    fontInfo=result.font;config=result.settings;await loadFont({data:btoa(pieces.join(''))});render();notice('fontSaved',true);
  }catch{notice('fontError');}finally{$('font-file').value='';}
};
const uploadLabel=document.querySelector('label[for="font-file"]');uploadLabel.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('font-file').click();}};
$('remove-font').onclick=async()=>{const result=await send({type:'REMOVE_FONT'});if(result.ok){fontInfo=null;config=result.settings;await loadFont(null);render();notice('fontRemoved',true);}};
$('reset-style').onclick=()=>save(Object.fromEntries(styleNames.map(name=>[name,DEFAULTS[name]])));
$('export').onclick=()=>{
  const content=session.transcript.map(c=>`${new Date(c.time).toLocaleTimeString(config.locale)}\n${c.original}\n${(c.lines||[]).map(l=>`${l.language}: ${l.text}`).join('\n')}${c.translation?'\nDubbing: '+c.translation:''}`).join('\n\n');
  const url=URL.createObjectURL(new Blob(['\ufeff',content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`pimxvoice-${new Date().toISOString().slice(0,10)}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
async function init(){
  if(!globalThis.chrome?.runtime?.id){render();notice('notExtension');return;}
  try{
    const[data,tabs]=await Promise.all([send({type:'GET'}),chrome.tabs.query({active:true,currentWindow:true})]);if(!data?.settings)throw new Error('No state');
    config=normalizeSettings(data.settings);session=data.state;keys=data.keys||[];hasKey=data.hasKey;catalog=data.catalog;currentTab=tabs[0];fontInfo=data.font;reconcile();render();
    if(hasKey&&!catalog?.live?.length&&!session.active)refreshModels(false);
    if(fontInfo)try{await loadFont((await send({type:'GET_FONT'})).font);}catch{}
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='session'&&changes.state){session=changes.state.newValue||{active:false,status:'idle',transcript:[]};renderSession();renderKeys();}});
  }catch{render();notice('network');}
}
init();
