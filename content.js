(() => {
  if(globalThis.__pimxvoiceOverlay)return;globalThis.__pimxvoiceOverlay=true;
  let host,root,primary,secondary,config,timeout,face,fontEpoch=0;
  const remove=()=>{clearTimeout(timeout);host?.remove();host=null;root=null;fontEpoch++;if(face){document.fonts.delete(face);face=null;}config=null;};
  function mount(){
    if(host)return;
    host=document.createElement('div');host.setAttribute('data-pimxvoice-captions','');
    host.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    root=host.attachShadow({mode:'closed'});
    const style=document.createElement('style');style.textContent=`
      *{box-sizing:border-box}[hidden]{display:none!important}.captions{position:absolute;inset-inline:4%;display:flex;flex-direction:column;gap:5px;pointer-events:none}
      p{margin:0;max-width:min(1000px,100%);white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;max-height:6.8em;overflow:hidden}p:empty{display:none}
      .stop{pointer-events:auto;position:absolute;inset-inline-end:18px;top:18px;display:flex;align-items:center;gap:8px;background:#122b38;color:#fff;border:1px solid #8dbbc2;border-radius:8px;padding:8px 12px;font:12px Tahoma,Arial,sans-serif;cursor:pointer;opacity:.35}.stop:hover,.stop:focus-visible{opacity:1}.stop:focus-visible{outline:3px solid #65d5df;outline-offset:3px}.dot{width:7px;height:7px;background:#76e1da;border-radius:50%}
    `;
    const box=document.createElement('div');box.className='captions';box.setAttribute('aria-live','off');
    primary=document.createElement('p');secondary=document.createElement('p');primary.dir='auto';secondary.dir='auto';box.append(primary,secondary);
    const stop=document.createElement('button');stop.className='stop';const dot=document.createElement('span');dot.className='dot';const label=document.createElement('span');
    label.textContent=config?.locale==='fa'?'PIMXVOICE · توقف':'PIMXVOICE · Stop';stop.append(dot,label);
    stop.addEventListener('click',()=>chrome.runtime.sendMessage({target:'background',type:'OVERLAY_STOP'}).catch(remove));
    root.append(style,box,stop);attach();applySettings();
  }
  function attach(){if(host){const full=document.fullscreenElement;(full&&full.tagName!=='VIDEO'?full:document.documentElement).append(host);}}
  function applySettings(){
    if(!root||!config)return;
    const box=root.querySelector('.captions');box.hidden=config.mode==='dub';
    box.style.bottom=config.position==='top'?'auto':`${config.offset}%`;box.style.top=config.position==='top'?`${config.offset}%`:'auto';
    box.style.alignItems=({left:'flex-start',center:'center',right:'flex-end'})[config.alignment]||'center';
    const hex=config.backgroundColor||'#091623',opacity=(config.backgroundOpacity??88)/100;
    const background=`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${opacity})`;
    for(const [node,size,color] of [[primary,config.fontSize,config.textColor],[secondary,config.secondFontSize,config.secondColor]]){
      node.style.fontFamily=config.fontFamily==='custom'&&face?'PIMXUserFont,Tahoma,sans-serif':`${config.fontFamily==='custom'?'Tahoma':config.fontFamily},Tahoma,sans-serif`;
      node.style.fontSize=`${size}px`;node.style.fontWeight=config.fontWeight;node.style.color=color;node.style.backgroundColor=background;
      node.style.lineHeight=String(config.lineHeight);node.style.borderRadius=`${config.radius}px`;node.style.padding=`${Math.max(2,config.padding/2)}px ${config.padding}px`;
      node.style.textAlign=config.alignment;node.style.webkitTextStroke=`${config.outlineWidth}px ${config.outlineColor}`;node.style.paintOrder='stroke fill';
      node.style.textShadow=config.shadow?'0 2px 4px rgba(0,0,0,.8)':'none';
    }
    secondary.hidden=!config.dualSubtitles;
  }
  async function setFont(font){
    const epoch=++fontEpoch;if(face){document.fonts.delete(face);face=null;}applySettings();if(!font?.data)return;
    try{
      const raw=atob(font.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
      const next=await new FontFace('PIMXUserFont',bytes.buffer).load();if(epoch!==fontEpoch||!host)return;
      document.fonts.add(next);face=next;applySettings();
    }catch{ /* Invalid font falls back to a readable system face. */ }
  }
  document.addEventListener('fullscreenchange',attach);
  chrome.runtime.onMessage.addListener((message,sender)=>{
    if(message.target!=='overlay'||sender.id!==chrome.runtime.id)return;
    if(message.type==='INIT'){config=message.settings;mount();setFont(message.font);}
    if(message.type==='SETTINGS'){config=message.settings;applySettings();}
    if(message.type==='FONT')setFont(message.font);
    if(message.type==='STOP')remove();
    if(message.type==='CAPTION'&&config){
      mount();const lines=message.caption.lines||[{text:message.caption.translation},{text:message.caption.original}];
      primary.textContent=lines[0]?.text||'';secondary.textContent=lines[1]?.text||'';
      primary.lang=lines[0]?.language==='source'?'':lines[0]?.language||'';secondary.lang=lines[1]?.language==='source'?'':lines[1]?.language||'';
      clearTimeout(timeout);timeout=setTimeout(()=>{if(primary)primary.textContent='';if(secondary)secondary.textContent='';},12000);
    }
  });
})();
