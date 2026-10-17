import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
for(const file of ['popup.html','popup.css','popup.js','selects.js','offscreen.html','offscreen.js','content.js','pcm-worklet.js','core.js','keyring.js','i18n.js','assets/pimxvoice-logo.png','assets/logo-prompt.txt',manifest.background.service_worker,...Object.values(manifest.icons),'fonts/Vazirmatn.woff2'])await access(file);
for(const file of (await readdir('.')).filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status)throw new Error(r.stderr);}
for(const file of (await readdir('.')).filter(f=>/\.(js|html|json)$/.test(f))){const source=await readFile(file,'utf8');if(/AIza[\w-]{25,}|AQ\.[\w-]{30,}/.test(source))throw new Error(`Credential detected in ${file}`);}
if(manifest.action.default_popup!=='popup.html')throw new Error('Popup missing');
if(manifest.permissions.includes('tabs')||manifest.host_permissions.includes('<all_urls>'))throw new Error('Unnecessary broad permission');
console.log('Manifest, packaged assets, JavaScript syntax and credential checks passed.');
