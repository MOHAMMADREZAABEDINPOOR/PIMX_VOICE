import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalizeSettings, hasDubbing, hasSubtitles, splitTranscript } from '../core.js';
import { KeyRing, keyMetadata } from '../keyring.js';

test('interface starts in English and preserves a chosen Persian locale',()=>{
  assert.equal(normalizeSettings().locale,'en');
  assert.equal(normalizeSettings({locale:'unsupported'}).locale,'en');
  assert.equal(normalizeSettings({locale:'fa'}).locale,'fa');
});

test('output modes independently enable dubbing and subtitles',()=>{
  assert.equal(hasDubbing(normalizeSettings({mode:'subtitles'})),false);
  assert.equal(hasSubtitles(normalizeSettings({mode:'dub'})),false);
  assert.equal(normalizeSettings({voice:false}).mode,'subtitles');
  assert.equal(normalizeSettings({mode:'both'}).voice,true);
  assert.equal(normalizeSettings({original:true}).subtitleLanguage2,'source');
  assert.equal(normalizeSettings({model:'gemini-3.5-live-translate-preview',source:'es'}).source,'auto');
});
test('subtitle customization clamps unsafe values and keeps language choices independent',()=>{
  const s=normalizeSettings({target:'fa',subtitleLanguage:'fr',subtitleLanguage2:'de',dualSubtitles:true,fontSize:900,backgroundOpacity:-1,textColor:'url(evil)',outlineWidth:99,fontFamily:'custom'});
  assert.equal(s.target,'fa');assert.equal(s.subtitleLanguage,'fr');assert.equal(s.subtitleLanguage2,'de');
  assert.equal(s.fontSize,72);assert.equal(s.backgroundOpacity,0);assert.equal(s.textColor,DEFAULTS.textColor);assert.equal(s.outlineWidth,4);assert.equal(s.fontFamily,'custom');
  assert.notEqual(normalizeSettings({subtitleLanguage:'en',subtitleLanguage2:'en'}).subtitleLanguage2,'en');
});
test('key rotation does not retry exhausted keys and handles parallel failures of the same key',()=>{
  const ring=new KeyRing([{id:'a',value:'first-private'},{id:'b',value:'second-private'},{id:'c',value:'third-private'}]);
  assert.equal(ring.rotate('a').id,'b');assert.equal(ring.rotate('a').id,'b');assert.equal(ring.rotate('b').id,'c');
  assert.throws(()=>ring.rotate('c'),/KEYS_EXHAUSTED/);
});
test('key metadata never contains the API credential',()=>{
  const result=keyMetadata([{id:'a',name:'Primary',value:'private-value-1234',remember:true}]);
  assert.equal(result[0].suffix,'1234');assert.equal(result[0].value,undefined);assert.ok(!JSON.stringify(result).includes('private-value'));
});

test('long finalized transcripts are split into bounded speech segments without losing words',()=>{
  const text='The train arrives at nine. '.repeat(20).trim(),chunks=splitTranscript(text);
  assert.ok(chunks.length>1);assert.ok(chunks.every(c=>c.length<=180));assert.equal(chunks.join(' '),text);
  assert.ok(splitTranscript('語'.repeat(500)).every(c=>c.length<=180));
});
const reports=[];
globalThis.chrome={runtime:{id:'test',onMessage:{addListener(){}},sendMessage:async message=>{reports.push(message);return {ok:true};}}};
const {AudioEngine}=await import('../offscreen.js');
const keys=()=>[{id:'a',name:'First',value:'first-private'},{id:'b',name:'Backup',value:'second-private'}];
test('REST requests switch to the next key on quota exhaustion and retry the original operation',async()=>{
  const saved=globalThis.fetch,calls=[];const engine=new AudioEngine(DEFAULTS,keys());
  globalThis.fetch=async(_url,options)=>{calls.push(options.headers['x-goog-api-key']);return calls.length===1?{ok:false,status:429,json:async()=>({error:{message:'RESOURCE_EXHAUSTED'}})}:{ok:true,json:async()=>({result:'translated'})};};
  try{assert.deepEqual(await engine.generate('example-model',{contents:[]}),{result:'translated'});assert.deepEqual(calls,['first-private','second-private']);assert.equal(engine.stats.keySwitches,1);}
  finally{globalThis.fetch=saved;engine.stop();}
});
test('exhausted keys stop after one attempt each; model errors do not consume backup keys',async()=>{
  const saved=globalThis.fetch;let calls=0;const engine=new AudioEngine(DEFAULTS,keys());
  globalThis.fetch=async()=>{calls++;return {ok:false,status:429,json:async()=>({error:{message:'Quota exhausted'}})};};
  try{await assert.rejects(engine.generate('example-model',{}),/KEYS_EXHAUSTED/);assert.equal(calls,2);}
  finally{engine.stop();globalThis.fetch=saved;}
  const second=new AudioEngine(DEFAULTS,keys());calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:false,status:404,json:async()=>({error:{message:'Model not found'}})};};
  try{await assert.rejects(second.generate('example-model',{}),/404/);assert.equal(calls,1);assert.equal(second.ring.current.id,'a');}
  finally{second.stop();globalThis.fetch=saved;}
});
test('subtitles-only translates two targets without requesting dubbing',async()=>{
  const engine=new AudioEngine({...DEFAULTS,mode:'subtitles',subtitleLanguage:'fa',dualSubtitles:true,subtitleLanguage2:'fr'},keys());
  const calls=[];engine.translate=async(text,language)=>{calls.push(language);return `${language}:${text}`;};
  engine.queue.push({id:7,text:'Hello',sourceLanguage:'en'});await engine.drain();
  assert.deepEqual(calls,['fa','fr']);assert.equal(engine.speechQueue.length,0);
  const caption=reports.findLast(r=>r.event==='caption'&&r.id===7);assert.deepEqual(caption.lines.map(l=>l.language),['fa','fr']);engine.stop();
});
test('streaming source fragments wait for enough context before translation',()=>{
  const engine=new AudioEngine({...DEFAULTS,voiceName:'Puck'},keys()),timers=[],segments=[];
  engine.timer=(callback,ms)=>{timers.push({callback,ms});return undefined;};engine.flush=()=>segments.push(engine.pending);
  engine.receive({inputTranscription:{text:'The'},turnComplete:true});timers.find(t=>t.ms===900).callback();
  assert.deepEqual(segments,[]);
  engine.receive({inputTranscription:{text:' blue train arrives at nine.'}});
  assert.deepEqual(segments,['The blue train arrives at nine.']);engine.stop();
});
test('selected narrator is passed to speech generation; dubbing-only has no subtitle lines',async()=>{
  const engine=new AudioEngine({...DEFAULTS,mode:'dub',voiceName:'Puck'},keys());let request,played=false;
  engine.generate=async(_model,body)=>{request=body;return {candidates:[{content:{parts:[{inlineData:{data:'AAA=',mimeType:'audio/pcm;rate=24000'}}]}}]};};
  engine.play=async()=>{played=true;};engine.speechQueue.push('سلام');await engine.speakDrain();
  assert.equal(request.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,'Puck');assert.ok(played);
  engine.caption('Hello','سلام',42);assert.deepEqual(reports.findLast(r=>r.event==='caption'&&r.id===42).lines,[]);engine.stop();
});
test('WebSocket setup retries on a quota error with the next key',async()=>{
  const saved=globalThis.WebSocket,seen=[];
  class FakeSocket{
    static OPEN=1;
    constructor(url){this.readyState=1;this.key=new URL(url).searchParams.get('key');seen.push(this.key);queueMicrotask(()=>this.onopen?.());}
    send(){queueMicrotask(()=>this.onmessage?.({data:JSON.stringify(this.key==='first-private'?{error:{code:429,message:'Quota exhausted'}}:{setupComplete:{}})}));}
    close(){this.readyState=3;queueMicrotask(()=>this.onclose?.({code:1000,reason:''}));}
  }
  globalThis.WebSocket=FakeSocket;const engine=new AudioEngine(DEFAULTS,keys());
  try{await engine.connectWithFailover();assert.equal(engine.ready,true);assert.deepEqual(seen,['first-private','second-private']);}
  finally{engine.stop();globalThis.WebSocket=saved;}
});
