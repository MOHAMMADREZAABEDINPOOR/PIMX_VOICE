"""PIMXVOICE custom dropdown and popup sizing regressions; optional real models request with --live."""
import sys,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'artifacts';ART.mkdir(exist_ok=True)
key=sys.stdin.read().strip() if '--live' in sys.argv else ''
MODELS=[{'name':f'models/{name}','supportedGenerationMethods':methods}for name,methods in [
 ('gemini-3.5-live-translate-preview',['bidiGenerateContent']),('gemini-3.5-transcribe-live',['bidiGenerateContent']),('gemini-3.8-live',['bidiGenerateContent']),('gemini-3.5-flash-lite',['generateContent']),('gemini-3.8-flash-lite-tts',['generateContent'])]]
def choose(page,identifier,query,value=None):
 page.locator(f'[data-select="{identifier}"]').click();search=page.locator('.select-search input');search.fill(query)
 page.locator('.select-option').first.wait_for();search.press('Enter')
 if value:assert page.locator('#'+identifier).input_value()==value
 page.wait_for_timeout(80)
with sync_playwright()as p:
 context=p.chromium.launch_persistent_context(tempfile.mkdtemp(prefix='pimx21-',dir=ART),headless=True,channel='chromium',args=[f'--disable-extensions-except={ROOT}',f'--load-extension={ROOT}'],viewport={'width':220,'height':600})
 worker=context.service_workers[0]if context.service_workers else context.wait_for_event('serviceworker');eid=worker.url.split('/')[2]
 worker.evaluate('''models=>{globalThis.nativeFetch=globalThis.fetch;globalThis.modelCalls=0;globalThis.catalogStub=async()=>{globalThis.modelCalls++;return {ok:true,json:async()=>({models})};};globalThis.fetch=globalThis.catalogStub;}''',MODELS)
 popup=context.new_page();errors=[];popup.on('pageerror',lambda e:errors.append(str(e)));popup.goto(f'chrome-extension://{eid}/popup.html');popup.locator('#onboarding').wait_for(state='visible')
 assert popup.locator('html').get_attribute('lang')=='en';popup.locator('#locale').click()
 intrinsic=popup.evaluate('()=>({html:document.documentElement.getBoundingClientRect().width,body:document.body.getBoundingClientRect().width})');assert intrinsic=={'html':420,'body':420},intrinsic
 popup.set_viewport_size({'width':420,'height':600});popup.evaluate('document.fonts.ready')
 # Exercise the actual action popup where the headless browser exposes a target.
 cdp=context.browser.new_browser_cdp_session();worker.evaluate('()=>chrome.action.openPopup()');popup.wait_for_timeout(100)
 targets=cdp.send('Target.getTargets')['targetInfos'];other=[t for t in targets if t['url'].endswith('/popup.html') and t['type']!='page']
 actual_popup=[]
 for target in other:
  session=cdp.send('Target.attachToTarget',{'targetId':target['targetId'],'flatten':False})['sessionId'];messages=[]
  cdp.on('Target.receivedMessageFromTarget',lambda e:messages.append(e))
  cdp.send('Target.sendMessageToTarget',{'sessionId':session,'message':json.dumps({'id':1,'method':'Runtime.evaluate','params':{'expression':'({width:innerWidth,height:innerHeight,root:document.documentElement.offsetWidth})','returnByValue':True}})})
  popup.wait_for_timeout(100)
  for message in messages:
   data=json.loads(message['message'])
   if data.get('id')==1 and 'result'in data:actual_popup.append(data['result']['result'].get('value'))
 print(json.dumps({'intrinsicAt220pxBootstrap':intrinsic,'actualPopupTargets':actual_popup}),flush=True)
 popup.bring_to_front();popup.locator('#onboarding').wait_for(state='visible')
 connect=popup.locator('#connect').bounding_box();assert connect and connect['y']>=0 and connect['y']+connect['height']<=600,connect
 popup.screenshot(path=str(ART/'pimx21-onboarding-fa.png'),full_page=False)
 popup.locator('#api-key').fill('dropdown-test-primary');popup.locator('#connect').click();popup.locator('#translator').wait_for(state='visible')
 assert popup.locator('#model option').count()==3
 assert popup.locator('[data-select="model"]').is_visible()
 assert popup.locator('#model').evaluate('e=>e.closest("details")===null')
 assert popup.locator('.select-trigger').count()==popup.locator('select').count()
 assert popup.locator('select:visible').count()==0
 popup.evaluate("document.querySelector('main').scrollTop=0;document.querySelector('.session-scroll').scrollTop=0")
 popup.screenshot(path=str(ART/'pimx21-main-fa.png'),full_page=False)
 popup.locator('[data-select="model"]').click();menu=popup.locator('.select-menu');box=menu.bounding_box();assert box and 0<=box['x'] and box['x']+box['width']<=421 and 0<=box['y'] and box['y']+box['height']<=601,box
 popup.screenshot(path=str(ART/'pimx21-models-fa.png'),full_page=False)
 popup.locator('.select-search input').fill('transcribe');assert popup.locator('.select-option').count()==1;popup.locator('.select-search input').press('Enter');assert popup.locator('#model').input_value()=='gemini-3.5-transcribe-live'
 popup.wait_for_timeout(100);popup.locator('[data-select="model"]').click();popup.locator('.select-search input').fill('there-is-no-such-model');assert popup.locator('.select-empty').is_visible();popup.locator('.select-search input').press('Escape');assert popup.locator('[data-select="model"]').evaluate('e=>e===document.activeElement')
 choose(popup,'voice-name','Puck','Puck')
 popup.locator('[data-select="target"]').click();popup.locator('.select-search input').press('Tab');assert popup.evaluate('()=>document.activeElement.dataset.select')=='voice-name'
 popup.locator('#locale').click();popup.locator('#theme').click();popup.wait_for_timeout(100)
 popup.locator('[data-select="voice-name"]').click();popup.screenshot(path=str(ART/'pimx21-voices-en-light.png'),full_page=False);popup.locator('.select-search input').press('Escape')
 popup.locator('#appearance-tab').click();choose(popup,'subtitle-language','French','fr')
 popup.locator('#dual-subtitles').check();popup.wait_for_timeout(100);choose(popup,'subtitle-language-2','Deutsch','de')
 popup.locator('.advanced').filter(has=popup.locator('#position')).evaluate('e=>e.open=true')
 popup.locator('[data-select="position"]').scroll_into_view_if_needed();popup.locator('[data-select="position"]').click();box=popup.locator('.select-menu').bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=601,box
 popup.screenshot(path=str(ART/'pimx21-small-list-en.png'),full_page=False);popup.locator('.select-search input').fill('Top');popup.locator('.select-search input').press('Enter');assert popup.locator('#position').input_value()=='top'
 # A missing cached catalog is recovered automatically when the popup opens.
 worker.evaluate('()=>chrome.storage.local.remove("catalog")');popup.reload();popup.locator('#translator').wait_for(state='visible');popup.wait_for_function('()=>document.querySelectorAll("#model option").length===3')
 # Refresh failure keeps the previous list and reveals the error.
 worker.evaluate('()=>{globalThis.fetch=async()=>{throw new TypeError("Test network failure");};}')
 popup.locator('#refresh-models').click();popup.wait_for_function('()=>!document.querySelector("#notice").hidden');assert popup.locator('#model option').count()==3
 assert popup.locator('[data-select="model"]').is_enabled()
 worker.evaluate('()=>{globalThis.fetch=globalThis.catalogStub;}');popup.locator('#refresh-models').click();popup.wait_for_function('()=>!document.querySelector("#refresh-models").disabled')
 public=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})');assert 'dropdown-test-primary' not in json.dumps(public)
 print(json.dumps({'customLists':popup.locator('.select-trigger').count(),'modelOptions':popup.locator('#model option').count(),'search':True,'keyboard':True,'emptyState':True,'bounds':True,'automaticCatalogRecovery':True,'cachedListOnNetworkFailure':True,'errors':errors}),flush=True);assert not errors,errors
 if key:
  popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"FORGET_KEY"})');worker.evaluate('()=>{globalThis.fetch=globalThis.nativeFetch;}');popup.reload();popup.locator('#api-key').fill(key);popup.locator('#connect').click();popup.locator('#translator').wait_for(state='visible',timeout=35000)
  real=popup.locator('#model option').count();assert real>0;popup.locator('[data-select="model"]').click();assert popup.locator('.select-option').count()==real
  print(json.dumps({'realGoogleModels':real,'realCustomListVisible':True}),flush=True);popup.screenshot(path=str(ART/'pimx21-real-models.png'),full_page=False);popup.locator('.select-search input').press('Escape')
  popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"FORGET_KEY"})')
 context.close()
