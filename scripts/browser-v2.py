"""PIMXVOICE v2 UI regression; optional real capture with --live and a key on stdin."""
import json,sys,tempfile,shutil,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
key=sys.stdin.read().strip() if '--live' in sys.argv else ''
FAKE_CATALOG=[{'name':'models/gemini-3.5-live-translate-preview','supportedGenerationMethods':['bidiGenerateContent']},{'name':'models/gemini-3.5-transcribe-live','supportedGenerationMethods':['bidiGenerateContent']},{'name':'models/gemini-3.5-flash-lite','supportedGenerationMethods':['generateContent']},{'name':'models/gemini-3.8-flash-lite-tts','supportedGenerationMethods':['generateContent']}]
def shot(page,name):
 page.wait_for_timeout(100);page.evaluate("window.scrollTo(0,0);document.querySelector('main').scrollTop=0")
 page.screenshot(path=str(ART/name),full_page=False)
(ART/'fixture-v2.html').write_text('<!doctype html><title>PIMXVOICE audio test</title><body style="background:#163e52;color:white;font:20px sans-serif;padding:50px"><h1>Translation test</h1><p>The blue train arrives at nine in the morning.</p><audio controls loop src="sample-en.wav"></audio><button onclick="document.querySelector(\'audio\').play()">Play test audio</button>',encoding='utf8')
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ART)));threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 extension=ROOT;extra=[]
 if key:
  extension=Path(tempfile.mkdtemp(prefix='pimx-capture-',dir=ART))
  for f in ROOT.iterdir():
   if f.suffix in ['.html','.css','.js']:shutil.copy2(f,extension/f.name)
  for d in ['fonts','icons']:shutil.copytree(ROOT/d,extension/d)
  m=json.loads((ROOT/'manifest.json').read_text(encoding='utf8'));m['host_permissions'].append('http://127.0.0.1/*');(extension/'manifest.json').write_text(json.dumps(m),encoding='utf8')
  boot=p.chromium.launch_persistent_context(tempfile.mkdtemp(prefix='pimx-boot-',dir=ART),headless=True,channel='chromium',args=[f'--disable-extensions-except={extension}',f'--load-extension={extension}'])
  w=boot.service_workers[0] if boot.service_workers else boot.wait_for_event('serviceworker');extra=[f'--allowlisted-extension-id={w.url.split("/")[2]}'];boot.close()
 context=p.chromium.launch_persistent_context(tempfile.mkdtemp(prefix='pimx-ui-',dir=ART),headless=True,channel='chromium',ignore_default_args=['--mute-audio'],args=[f'--disable-extensions-except={extension}',f'--load-extension={extension}','--autoplay-policy=no-user-gesture-required',*extra],viewport={'width':420,'height':600})
 worker=context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker');eid=worker.url.split('/')[2]
 worker.evaluate('''models=>{globalThis.originalFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({models})});}''',FAKE_CATALOG)
 video=context.pages[0];video.goto(f'http://127.0.0.1:{server.server_port}/fixture-v2.html')
 popup=context.new_page();errors=[];popup.on('pageerror',lambda e:errors.append(str(e)));popup.goto(f'chrome-extension://{eid}/popup.html');popup.locator('#onboarding').wait_for(state='visible');popup.evaluate('document.fonts.ready')
 assert popup.locator('html').get_attribute('lang')=='en';popup.locator('#locale').click();shot(popup,'pimx-onboarding-fa.png');popup.locator('#locale').click();popup.locator('#theme').click();shot(popup,'pimx-onboarding-en.png')
 popup.locator('#api-key').fill('test-primary-1111');popup.locator('#connect').click();popup.locator('#translator').wait_for(state='visible')
 assert popup.locator('#voice-name option').count()==31
 shot(popup,'pimx-translation-en.png');popup.locator('#locale').click();popup.locator('#theme').click();shot(popup,'pimx-translation-fa.png')
 popup.locator('[data-mode="dub"]').click();assert popup.locator('#main-preview').is_hidden()
 popup.locator('[data-mode="subtitles"]').click();assert popup.locator('#voice-controls').is_hidden();assert popup.locator('#main-preview').is_visible()
 popup.locator('[data-mode="both"]').click();popup.locator('#voice-name').select_option('Puck',force=True)
 popup.locator('#appearance-tab').click();popup.locator('#subtitle-language').select_option('fr',force=True);popup.locator('#dual-subtitles').check();popup.locator('#subtitle-language-2').select_option('en',force=True)
 popup.locator('#font-file').set_input_files(str(ROOT/'fonts/Vazirmatn.woff2'));popup.wait_for_function("()=>document.querySelector('#font-family').value==='custom'")
 popup.locator('#font-size').fill('31');popup.locator('#font-size').press('Tab')
 popup.locator('#text-color').evaluate("e=>{e.value='#ffe08a';e.dispatchEvent(new Event('change',{bubbles:true}));}")
 popup.wait_for_timeout(200);shot(popup,'pimx-subtitles-fa.png')
 state=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');assert state['settings']['fontFamily']=='custom';assert state['settings']['subtitleLanguage']=='fr';assert state['settings']['subtitleLanguage2']=='en';assert state['settings']['target']=='fa';assert state['settings']['voiceName']=='Puck';assert state['settings']['fontSize']==31
 popup.locator('#keys-tab').click();assert popup.locator('#api-key').is_visible();popup.locator('#key-name').fill('Backup');popup.locator('#api-key').fill('test-backup-2222');popup.locator('#connect').click();popup.wait_for_function("()=>document.querySelectorAll('.key-row').length===2")
 shot(popup,'pimx-keys-fa.png');public=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');assert 'test-primary-1111' not in json.dumps(public);assert 'test-backup-2222' not in json.dumps(public)
 popup.locator('.key-row').nth(1).locator('button').first.click();popup.wait_for_timeout(100);public=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');assert public['keys'][0]['name']=='Backup'
 popup.reload();popup.locator('#translator').wait_for(state='visible');public=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');assert public['settings']['fontSize']==31;assert public['font']['name']=='Vazirmatn.woff2';assert len(public['keys'])==2
 print(json.dumps({'ui':True,'voices':31,'modes':3,'independentLanguages':True,'uploadedFont':True,'keyManagement':True,'errors':errors}),flush=True);assert not errors,errors
 popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"FORGET_KEY"})')
 if key:
  worker.evaluate('()=>{globalThis.fetch=globalThis.originalFetch;}')
  popup.reload();popup.locator('#api-key').fill(key);popup.locator('#connect').click();popup.locator('#translator').wait_for(state='visible',timeout=35000)
  result=popup.evaluate('''async model=>chrome.runtime.sendMessage({target:'background',type:'SAVE_SETTINGS',settings:{model,source:'en',target:'fa',subtitleLanguage:'en',subtitleLanguage2:'fr',dualSubtitles:true,mode:'both',voiceName:'Puck'}})''','gemini-3.5-live-translate-preview' if '--translate' in sys.argv else 'gemini-3.5-transcribe-live');assert result['ok']
  video.bring_to_front();video.locator('button').click();tabid=popup.evaluate("async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('fixture-v2.html')).id;}")
  result=popup.evaluate("async id=>chrome.runtime.sendMessage({target:'background',type:'START',tabId:id})",tabid);assert result['ok'],result
  popup.close();popup=context.new_page();popup.goto(f'chrome-extension://{eid}/popup.html');popup.locator('#translator').wait_for(state='visible')
  for _ in range(55):
   popup.wait_for_timeout(1000);data=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');stats=popup.evaluate('chrome.runtime.sendMessage({target:"offscreen",type:"STATS"})') if data['state']['active'] else None
   captions=data['state'].get('transcript',[])
   if data['state'].get('error') or (stats and stats['voiceBytes']>0 and any(len(c.get('lines',[]))==2 and all(l['text'] for l in c['lines']) for c in captions)):break
  print(json.dumps({'realCapture':data['state'],'audio':stats},ensure_ascii=True),flush=True)
  assert stats and stats['voiceBytes']>0 and any(len(c.get('lines',[]))==2 and all(l['text'] for l in c['lines']) for c in captions),'Real bilingual caption + dubbing check failed'
  video.screenshot(path=str(ART/'pimx-real-captions.png'),full_page=False)
  popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"STOP"})');cleanup=popup.evaluate("chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})");assert not cleanup
  popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"FORGET_KEY"})');print(json.dumps({'popupContinued':True,'cleanup':True}),flush=True)
 context.close()
server.shutdown()
