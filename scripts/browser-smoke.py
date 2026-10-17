"""Browser regression and screenshots in an isolated Chromium profile. Optional key on stdin.
Requires Python playwright. No credentials are written by this script.
"""
import json, threading, http.server, functools, sys, tempfile, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artifacts'
ART.mkdir(exist_ok=True)
def snapshot(page,name):
    page.wait_for_timeout(100)
    page.evaluate('window.scrollTo(0,0);document.body.scrollTop=0')
    page.screenshot(path=str(ART/name),full_page=False)
key = sys.stdin.read().strip() if '--live' in sys.argv else ''
fixture = ART / 'fixture.html'
fixture.write_text('<!doctype html><title>Luma audio test</title><body style="background:#163e52;color:white;font:20px sans-serif;padding:50px"><h1>Video translation test</h1><p>The blue train arrives at nine in the morning.</p><audio controls loop src="sample-en.wav"></audio><button onclick="document.querySelector(\'audio\').play()">Play test audio</button>', encoding='utf8')
server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ART)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    profile = tempfile.mkdtemp(prefix='luma-browser-',dir=ART)
    extension_root=ROOT
    extra_args=[]
    if '--capture' in sys.argv:
        # Headless Chromium cannot physically click the toolbar. A disposable test copy
        # gets access ONLY to the local fixture; the capture allowlist substitutes the
        # toolbar gesture. Production manifest and permissions remain untouched.
        extension_root=Path(tempfile.mkdtemp(prefix='capture-extension-',dir=ART))
        for file in ROOT.iterdir():
            if file.suffix in ['.html','.css','.js']: shutil.copy2(file,extension_root/file.name)
        for directory in ['fonts','icons']: shutil.copytree(ROOT/directory,extension_root/directory)
        manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf8'))
        manifest['host_permissions'].append('http://127.0.0.1/*')
        (extension_root/'manifest.json').write_text(json.dumps(manifest),encoding='utf8')
        bootstrap=p.chromium.launch_persistent_context(tempfile.mkdtemp(prefix='capture-bootstrap-',dir=ART),headless=True,channel='chromium',args=[f'--disable-extensions-except={extension_root}',f'--load-extension={extension_root}'])
        boot_worker=bootstrap.service_workers[0] if bootstrap.service_workers else bootstrap.wait_for_event('serviceworker')
        extra_args=[f'--allowlisted-extension-id={boot_worker.url.split("/")[2]}']
        bootstrap.close()
    context = p.chromium.launch_persistent_context(profile,headless=True,channel='chromium',
        ignore_default_args=['--mute-audio'],args=[f'--disable-extensions-except={extension_root}',f'--load-extension={extension_root}','--autoplay-policy=no-user-gesture-required',*extra_args],viewport={'width':420,'height':600})
    worker = context.service_workers[0] if context.service_workers else context.wait_for_event('serviceworker')
    extension_id = worker.url.split('/')[2]
    errors=[]
    video=context.pages[0]
    video.goto(f'http://127.0.0.1:{server.server_port}/fixture.html')
    popup=context.new_page()
    popup.on('pageerror',lambda e:errors.append(str(e)))
    popup.goto(f'chrome-extension://{extension_id}/popup.html')
    print(json.dumps({'initialState':popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})')}),flush=True)
    popup.locator('#onboarding').wait_for(state='visible')
    popup.evaluate('document.fonts.ready')
    snapshot(popup,'onboarding-fa-dark.png')
    assert popup.locator('html').get_attribute('dir')=='rtl'
    popup.locator('#locale').click()
    popup.wait_for_function('document.documentElement.lang === "en"')
    popup.locator('#theme').click()
    popup.wait_for_function('document.documentElement.dataset.theme === "light"')
    snapshot(popup,'onboarding-en-light.png')
    if key:
        popup.locator('#api-key').fill(key)
        popup.locator('#connect').click()
        try:
            popup.locator('#translator').wait_for(state='visible',timeout=35000)
        except Exception:
            print(json.dumps({'notice':popup.locator('#notice').inner_text(),'errors':errors}),flush=True)
            print(json.dumps({'networkProbe':worker.evaluate('''async()=>{try{const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models');return {status:r.status};}catch(e){return {message:e.message};}}''')}),flush=True)
            popup.screenshot(path=str(ART/'connect-error.png'),full_page=True)
            context.close()
            raise
        assert popup.locator('#model option').count()>=3
        snapshot(popup,'translator-en-light.png')
        popup.locator('#locale').click();popup.locator('#theme').click()
        snapshot(popup,'translator-fa-dark.png')
        popup.locator('#settings-tab').click()
        snapshot(popup,'settings-fa-dark.png')
        popup.locator('#original').uncheck()
        popup.reload();popup.locator('#translator').wait_for(state='visible')
        assert popup.locator('#original').is_checked()==False
        popup.locator('#settings-tab').click();popup.locator('#original').check()
        popup.locator('#translate-tab').click()
        # Blocked-page recovery must not leave capture active.
        result=popup.evaluate('''async()=>{const tab=await chrome.tabs.create({url:'chrome://version/'});const response=await chrome.runtime.sendMessage({target:'background',type:'START',tabId:tab.id});await chrome.tabs.remove(tab.id);return response;}''')
        assert result.get('error')=='capture',result
        print(json.dumps({'liveModels':popup.locator('#model option').count(),'blockedPage':result,'errors':errors}))
        assert not errors,errors
        popup.locator('#start-stop').click()
        popup.wait_for_timeout(400)
        error_box=popup.locator('#notice').bounding_box()
        assert error_box and 0<=error_box['y'] and error_box['y']+error_box['height']<=601,error_box
        popup.screenshot(path=str(ART/'error-visible.png'),full_page=False)
        if '--transcribe' in sys.argv:
            popup.locator('#model').select_option('gemini-3.5-transcribe-live')
            popup.wait_for_timeout(200)
        if '--capture' in sys.argv:
            capture_error=None
            video.bring_to_front();video.locator('button').click()
            before=set(context.pages)
            try:
                worker.evaluate('chrome.action.openPopup()')
                popup.wait_for_timeout(1000)
                actions=[page for page in context.pages if page not in before and page.url.endswith('popup.html')]
                print(json.dumps({'actionPopups':len(actions)}),flush=True)
                action=actions[0] if actions else popup
                if not actions:
                    video.keyboard.press('Alt+Shift+L');popup.wait_for_timeout(500)
                    actions=[page for page in context.pages if page not in before and page.url.endswith('popup.html')]
                    action=actions[0] if actions else popup
                tabid=popup.evaluate('''async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>!t.url||t.url.includes('/fixture.html')).id;}''')
                response=action.evaluate('''async id=>chrome.runtime.sendMessage({target:'background',type:'START',tabId:id})''',tabid)
                print(json.dumps({'captureStart':response}),flush=True)
                if response.get('ok'):
                    popup.close()
                    popup=context.new_page();popup.goto(f'chrome-extension://{extension_id}/popup.html')
                    popup.locator('#translator').wait_for(state='visible')
                    assert popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})')['state']['active']
                    for _ in range(45):
                        popup.wait_for_timeout(1000)
                        status=popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"GET"})')
                        stats=popup.evaluate('chrome.runtime.sendMessage({target:"offscreen",type:"STATS"})') if status['state']['active'] else None
                        if status['state'].get('error') or (stats and stats['voiceBytes']>0 and any(c.get('translation') for c in status['state'].get('transcript',[]))): break
                    print(json.dumps({'capturedState':status['state']},ensure_ascii=True),flush=True)
                    print(json.dumps({'audioEngine':stats}),flush=True)
                    print(json.dumps({'fixtureAudio':video.evaluate('''()=>{const a=document.querySelector('audio');return {paused:a.paused,time:a.currentTime,duration:a.duration,muted:a.muted,volume:a.volume};}''')}),flush=True)
                    video.screenshot(path=str(ART/'actual-captions.png'),full_page=True)
                    popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"STOP"})')
                    cleanup=popup.evaluate('''async()=>({contexts:await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']}),captures:await chrome.tabCapture.getCapturedTabs()})''')
                    assert not cleanup['contexts'] and not any(c['status']=='active' for c in cleanup['captures']),cleanup
                    print(json.dumps({'popupReopen':True,'stopCleanup':True}),flush=True)
                    if not stats or stats['voiceBytes']==0 or not any(c.get('translation') for c in status['state'].get('transcript',[])):
                        raise AssertionError('Capture did not produce both subtitles and speech; see capturedState/audioEngine above.')
            except Exception as e:
                capture_error=str(e)
                print(json.dumps({'captureAutomation':str(e)[:240]}),flush=True)
        # Remove the real test key before closing the isolated browser.
        popup.evaluate('chrome.runtime.sendMessage({target:"background",type:"FORGET_KEY"})')
        if '--capture' in sys.argv and capture_error:
            context.close();server.shutdown();raise AssertionError(capture_error)
    else:
        print(json.dumps({'onboarding':True,'rtl':True,'theme':True,'errors':errors}))
    context.close()
server.shutdown()
