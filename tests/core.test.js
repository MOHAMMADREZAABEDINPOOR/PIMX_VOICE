import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSetup,filterModels,DEFAULTS,floatToPCM,friendlyError,LANGUAGES} from '../core.js';
test('dedicated translation configuration uses the translation-only protocol',()=>{
  const s=buildSetup(DEFAULTS).setup;
  assert.equal(s.generationConfig.translationConfig.targetLanguageCode,'fa');
  assert.deepEqual(s.generationConfig.responseModalities,['AUDIO']);
  assert.ok(s.outputAudioTranscription);
  assert.equal(s.systemInstruction,undefined);
});
test('Transcribe Live requests text without unsupported translation or speech configuration',()=>{
  const s=buildSetup({...DEFAULTS,model:'gemini-3.5-transcribe-live',source:'en'}).setup;
  assert.deepEqual(s.generationConfig.responseModalities,['TEXT']);
  assert.deepEqual(s.inputAudioTranscription.languageCodes,['en']);
  assert.equal(s.realtimeInputConfig.automaticActivityDetection.disabled,true);
  assert.equal(s.generationConfig.translationConfig,undefined);
  assert.equal(s.systemInstruction,undefined);
});
test('native audio interpreter enables output transcripts and prevents interruptions',()=>{
  const s=buildSetup({...DEFAULTS,model:'gemini-3.8-live'}).setup;
  assert.ok(s.outputAudioTranscription);assert.ok(s.systemInstruction);
  assert.equal(s.realtimeInputConfig.activityHandling,'NO_INTERRUPTION');
});
test('model discovery distinguishes streaming, file transcription, text, and TTS capabilities',()=>{
  const models=[
    {name:'models/gemini-3.5-transcribe-live',supportedGenerationMethods:['bidiGenerateContent']},
    {name:'models/gemini-3.5-transcribe',supportedGenerationMethods:['generateContent']},
    {name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['generateContent']},
    {name:'models/gemini-2.5-flash-image',supportedGenerationMethods:['generateContent']},
    {name:'models/gemini-2.5-flash-preview-tts',supportedGenerationMethods:['generateContent']},
  ];
  const result=filterModels(models);assert.equal(result.live.length,1);assert.deepEqual(result.text,['gemini-2.5-flash-lite']);assert.equal(result.tts.length,1);assert.equal(result.fileTranscribe.length,1);
});
test('PCM conversion clips amplitudes and writes signed little endian samples',()=>{
  const bytes=floatToPCM([-2,-1,0,1,2]);const v=new DataView(bytes.buffer);
  assert.deepEqual(Array.from({length:5},(_,i)=>v.getInt16(i*2,true)),[-32768,-32768,0,32767,32767]);
});
test('API failure classification supports quota, rejected keys, inaccessible pages and slow queues',()=>{
  assert.equal(friendlyError('429 RESOURCE_EXHAUSTED'),'quota');assert.equal(friendlyError('403 PERMISSION_DENIED'),'key');assert.equal(friendlyError('Cannot capture this page'),'capture');assert.equal(friendlyError('buffer backlog'),'slow');
  assert.equal(friendlyError('400 API key not valid. Please pass a valid API key.'),'key');
  assert.equal(friendlyError(new Error('NO_LIVE_MODELS')),'noLiveModels');
});
test('language options have unique codes and include RTL targets',()=>{
  assert.equal(new Set(LANGUAGES.map(x=>x[0])).size,LANGUAGES.length);assert.ok(LANGUAGES.some(([code])=>code==='fa'));assert.ok(LANGUAGES.some(([code])=>code==='ar'));
});
