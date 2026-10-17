import { mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const {version}=JSON.parse(await readFile('manifest.json','utf8'));
await mkdir('dist',{recursive:true});
const files=['manifest.json','background.js','core.js','keyring.js','content.js','offscreen.html','offscreen.js','pcm-worklet.js','popup.html','popup.css','popup.js','selects.js','i18n.js','README.md','README.fa.md',...['hero.gif','translation-en.png','translation-fa.png','subtitles-fa.png'].map(f=>`assets/readme/${f}`),'assets/pimxvoice-logo.png','assets/logo-prompt.txt','fonts/Vazirmatn.woff2','fonts/OFL.txt',...[16,32,48,128].map(s=>`icons/${s}.png`)];
execFileSync('python',['-c',`import sys,json,zipfile\nfiles=json.loads(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n for f in files: z.write(f,f)`,JSON.stringify(files),`dist/pimxvoice-${version}.zip`],{stdio:'inherit'});
console.log(`Created dist/pimxvoice-${version}.zip (runtime files only).`);
