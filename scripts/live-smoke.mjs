// Optional integration check. Supply GEMINI_API_KEY at runtime; credentials are never written.
import { readFile } from 'node:fs/promises';
import { buildSetup, DEFAULTS } from '../core.js';
let key = process.env.GEMINI_API_KEY;
if (!key) { const chunks=[]; for await (const chunk of process.stdin) chunks.push(chunk); key=Buffer.concat(chunks).toString('utf8').trim(); }
if (!key) throw new Error('Set GEMINI_API_KEY or pass the key on stdin.');
const models = process.argv.slice(2).filter(x=>!x.startsWith('--'));
const audioPath = process.env.LUMA_TEST_WAV;
let pcm;
if (audioPath) {
  const wav = await readFile(audioPath); let i=12;
  while(i+8<=wav.length){const size=wav.readUInt32LE(i+4);if(wav.toString('ascii',i,i+4)==='data'){pcm=wav.subarray(i+8,i+8+size);break;}i+=8+size+(size%2);}
  if(!pcm)throw new Error('No WAV data. Use mono, 16-bit, 16 kHz PCM.');
}
for(const model of models.length?models:['gemini-3.5-live-translate-preview','gemini-3.5-transcribe-live','gemini-2.5-flash-native-audio-latest']){
  await new Promise(resolve=>{
    let audioBytes=0,input='',output='',ready=false,finished=false;
    const ws=new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(key)}`);
    const done=(error)=>{if(finished)return;finished=true;clearTimeout(timer);ws.close();console.log(JSON.stringify({model,ready,audioBytes,input,output,...(error?{error}:{})}));resolve();};
    const timer=setTimeout(()=>done(ready?undefined:'Setup timed out'),pcm?45000:18000);
    ws.onopen=()=>ws.send(JSON.stringify(buildSetup({...DEFAULTS,model})));
    ws.onmessage=async event=>{
      const msg=JSON.parse(typeof event.data==='string'?event.data:await event.data.text());
      if(msg.error){done(JSON.stringify(msg.error));return;}
      if(msg.setupComplete){
        ready=true;
        if(!pcm){done();return;}
        if(model.includes('transcribe'))ws.send(JSON.stringify({realtimeInput:{activityStart:{}}}));
        for(let i=0;i<pcm.length&&!finished;i+=3200){ws.send(JSON.stringify({realtimeInput:{audio:{data:pcm.subarray(i,i+3200).toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));await new Promise(r=>setTimeout(r,100));}
        if(!finished)ws.send(JSON.stringify({realtimeInput:model.includes('transcribe')?{activityEnd:{}}:{audioStreamEnd:true}}));
      }
      const c=msg.serverContent;
      if(c?.inputTranscription)input+=c.inputTranscription.text||'';
      if(c?.outputTranscription)output+=c.outputTranscription.text||'';
      for(const p of c?.modelTurn?.parts||[])if(p.inlineData)audioBytes+=Buffer.from(p.inlineData.data,'base64').length;
      if((c?.turnComplete&&input)||(model.includes('transcribe')&&input))setTimeout(()=>done(),2000);
    };
    ws.onerror=()=>done('WebSocket failed');
    ws.onclose=e=>{if(!finished)done(`Closed ${e.code}: ${e.reason}`);};
  });
}
