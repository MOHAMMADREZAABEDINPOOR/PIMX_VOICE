// One shared, searchable popup for all select fields. Native selects remain the value source.
const widgets=new Map();
let strings={search:'Search…',empty:'No results',choose:'Choose an option'},active=null,uid=0;
const normalize=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toLocaleLowerCase();
const icon=path=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const shape=document.createElementNS(svg.namespaceURI,'path');shape.setAttribute('d',path);svg.append(shape);return svg;
};
function isDisabled(select){return select.disabled||!!select.closest('fieldset[disabled]');}
function sync(widget){
  const {select,button,label}=widget,option=select.selectedOptions[0];
  label.textContent=option?.textContent||select.dataset.placeholder||strings.choose;
  button.disabled=isDisabled(select);button.title=label.textContent;button.setAttribute('aria-busy',String(select.dataset.loading==='true'));
  button.setAttribute('aria-label',`${document.querySelector(`label[for="${select.id}"]`)?.textContent||''}: ${label.textContent}`);
  label.dir=select.dir||'auto';
  if(button.disabled&&active?.widget===widget)close(false);
}
function close(focus=false){
  if(!active)return;
  const previous=active;active=null;previous.widget.button.setAttribute('aria-expanded','false');
  previous.widget.button.removeAttribute('aria-controls');previous.panel.remove();
  if(focus&&!previous.widget.button.disabled)previous.widget.button.focus({preventScroll:true});
}
function position(){
  if(!active)return;
  const {widget,panel}=active,rect=widget.button.getBoundingClientRect(),margin=10,viewWidth=document.documentElement.clientWidth,viewHeight=window.innerHeight;
  const width=Math.min(Math.max(rect.width,260),viewWidth-margin*2),below=viewHeight-rect.bottom-margin,above=rect.top-margin;
  const upward=below<220&&above>below,height=Math.max(120,Math.min(310,upward?above:below));
  panel.style.width=`${width}px`;panel.style.maxHeight=`${height}px`;
  const desired=document.documentElement.dir==='rtl'?rect.right-width:rect.left;
  panel.style.left=`${Math.max(margin,Math.min(desired,viewWidth-width-margin))}px`;
  if(upward){panel.style.top='auto';panel.style.bottom=`${viewHeight-rect.top+5}px`;}
  else{panel.style.bottom='auto';panel.style.top=`${rect.bottom+5}px`;}
}
function highlight(index,scroll=true){
  if(!active||!active.rows.length)return;
  active.index=Math.max(0,Math.min(index,active.rows.length-1));
  active.rows.forEach((row,i)=>row.classList.toggle('highlighted',i===active.index));
  const row=active.rows[active.index];active.search.setAttribute('aria-activedescendant',row.id);
  if(scroll)row.scrollIntoView({block:'nearest'});
}
function selectValue(value){
  if(!active)return;
  const {select}=active.widget;select.value=value;
  close(true);select.dispatchEvent(new Event('change',{bubbles:true}));
}
function results(){
  if(!active)return;
  const {widget,search,list,empty}=active,query=normalize(search.value.trim());
  const options=Array.from(widget.select.options).filter(option=>!option.disabled&&normalize(`${option.textContent} ${option.value} ${option.dataset.search||''}`).includes(query));
  list.replaceChildren();active.rows=[];
  for(const option of options){
    const row=document.createElement('div');row.id=`pimx-option-${++uid}`;row.className='select-option';row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));row.dataset.value=option.value;
    const content=document.createElement('span');content.textContent=option.textContent;content.dir=widget.select.dir||'auto';
    row.append(content);if(option.selected)row.append(icon('m5 12 4 4L19 6'));
    row.addEventListener('pointerdown',event=>event.preventDefault());
    row.addEventListener('click',()=>selectValue(option.value));
    row.addEventListener('pointermove',()=>highlight(active?.rows.indexOf(row)??0,false));
    list.append(row);active.rows.push(row);
  }
  empty.hidden=options.length>0;empty.textContent=strings.empty;
  list.setAttribute('aria-label',widget.button.getAttribute('aria-label'));
  const selected=active.rows.findIndex(row=>row.dataset.value===widget.select.value);active.index=-1;
  if(active.rows.length)highlight(query?0:Math.max(0,selected));else search.removeAttribute('aria-activedescendant');
}
function open(widget){
  if(isDisabled(widget.select))return;
  if(active?.widget===widget){close(true);return;}
  close();const panel=document.createElement('div');panel.className='select-menu';panel.dir=document.documentElement.dir;
  const searchBox=document.createElement('div');searchBox.className='select-search';searchBox.append(icon('m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'));
  const search=document.createElement('input');search.type='search';search.dir='auto';search.autocomplete='off';search.spellcheck=false;search.placeholder=strings.search;search.setAttribute('aria-label',strings.search);search.setAttribute('role','combobox');search.setAttribute('aria-expanded','true');search.setAttribute('aria-autocomplete','list');
  const list=document.createElement('div');list.className='select-options';list.id=`pimx-listbox-${++uid}`;list.setAttribute('role','listbox');search.setAttribute('aria-controls',list.id);
  const empty=document.createElement('p');empty.className='select-empty';empty.setAttribute('role','status');
  searchBox.append(search);panel.append(searchBox,list,empty);document.body.append(panel);
  active={widget,panel,search,list,empty,rows:[],index:-1};widget.button.setAttribute('aria-expanded','true');widget.button.setAttribute('aria-controls',list.id);
  search.addEventListener('input',results);
  search.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    if(event.key==='Tab'){
      event.preventDefault();const trigger=active.widget.button;close(false);
      const targets=Array.from(document.querySelectorAll('button,input,a[href],summary,[tabindex="0"]')).filter(node=>!node.disabled&&!node.closest('fieldset[disabled]')&&node.getClientRects().length&&node.tabIndex>=0);
      const index=targets.indexOf(trigger),step=event.shiftKey?-1:1;targets[(index+step+targets.length)%targets.length]?.focus();return;
    }
    if(event.key==='Enter'){event.preventDefault();if(active.rows[active.index])selectValue(active.rows[active.index].dataset.value);return;}
    const next=event.key==='ArrowDown'?active.index+1:event.key==='ArrowUp'?active.index-1:event.key==='Home'?0:event.key==='End'?active.rows.length-1:event.key==='PageDown'?active.index+5:event.key==='PageUp'?active.index-5:null;
    if(next!==null){event.preventDefault();highlight(next);}
  });
  position();results();search.focus({preventScroll:true});
}
export function syncSelects(labels){
  if(labels)strings={...strings,...labels};
  for(const select of document.querySelectorAll('select')){
    let widget=widgets.get(select);
    if(!widget){
      const wrapper=document.createElement('div');wrapper.className='custom-select';
      select.before(wrapper);wrapper.append(select);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
      const button=document.createElement('button');button.type='button';button.className='select-trigger';button.dataset.select=select.id;button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
      const label=document.createElement('span');button.append(label,icon('m6 9 6 6 6-6'));wrapper.append(button);
      widget={select,wrapper,button,label};widgets.set(select,widget);
      button.addEventListener('click',()=>open(widget));button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open(widget);if(event.key==='End')highlight(active?.rows.length-1);}});
      select.addEventListener('change',()=>sync(widget));
      document.querySelector(`label[for="${select.id}"]`)?.addEventListener('click',event=>{event.preventDefault();button.focus();});
    }
    sync(widget);
  }
  if(active){active.search.placeholder=strings.search;active.empty.textContent=strings.empty;}
}
document.addEventListener('pointerdown',event=>{if(active&&!active.panel.contains(event.target)&&!active.widget.button.contains(event.target))close(false);});
document.addEventListener('focusin',event=>{if(active&&!active.panel.contains(event.target)&&!active.widget.button.contains(event.target))close(false);});
document.addEventListener('scroll',event=>{if(active&&!active.panel.contains(event.target))close(false);},true);
window.addEventListener('resize',position);
