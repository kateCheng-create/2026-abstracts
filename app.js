
const data = window.ABSTRACTS || [];
let type = '全部', date = '全部';
const q = document.querySelector('#q'), cards = document.querySelector('#cards'), count = document.querySelector('#count'), empty = document.querySelector('#empty');
const esc = s => String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function searchable(r){return [r.title,r.title_en,r.presenter,r.keywords,r.keywords_en,r.abstract,r.abstract_en,r.code,r.session].join(' ').toLowerCase()}
function render(){
  const term=q.value.trim().toLowerCase();
  const rows=data.filter(r => (type==='全部'||r.type===type) && (date==='全部'||r.date===date) && (!term||searchable(r).includes(term)));
  count.textContent=rows.length; empty.hidden=rows.length>0;
  cards.innerHTML=rows.map(r=>`<article class="card">
    <div class="meta"><span class="badge ${r.type==='海報發表'?'poster':''}">${esc(r.type)}</span><span>${esc(r.date)}</span><span class="code">${esc(r.type==='海報發表'?'海報 '+r.code:r.code)}</span></div>
    <h2>${esc(r.title||r.title_en||'未提供題目')}</h2>
    <p class="presenter">${esc(r.presenter)}</p>
    <p class="preview">${esc((r.abstract||r.abstract_en||'尚未提供摘要').replace(/
+/g,' '))}</p>
    <button class="open" data-id="${esc(r.id)}">查看摘要</button>
  </article>`).join('');
}
document.querySelector('#typeFilters').addEventListener('click',e=>{if(!e.target.matches('.chip'))return;type=e.target.dataset.type;[...e.currentTarget.children].forEach(x=>x.classList.toggle('active',x===e.target));render()});
document.querySelector('#dateFilters').addEventListener('click',e=>{if(!e.target.matches('.chip'))return;date=e.target.dataset.date;[...e.currentTarget.children].forEach(x=>x.classList.toggle('active',x===e.target));render()});
q.addEventListener('input',render);
const modal=document.querySelector('#modal'), body=document.querySelector('#modalBody');
function openModal(r){
 body.innerHTML=`<div class="meta"><span class="badge ${r.type==='海報發表'?'poster':''}">${esc(r.type)}</span><span>${esc(r.date)}</span><span class="code">${esc(r.type==='海報發表'?'海報 '+r.code:r.code)}</span></div>
 <h2 id="modalTitle" class="modal-title">${esc(r.title||r.title_en||'未提供題目')}</h2>
 ${r.title_en && r.title_en!==r.title?`<p class="modal-en-title">${esc(r.title_en)}</p>`:''}
 <div class="modal-meta"><strong>發表人：</strong>${esc(r.presenter)}</div>
 <section class="abstract-block"><h3>摘要</h3><div class="abstract-text ${r.abstract?'':'noabs'}">${esc(r.abstract||'尚未提供中文摘要')}</div>${r.keywords?`<div class="keywords"><strong>關鍵詞：</strong>${esc(r.keywords)}</div>`:''}</section>
 ${r.abstract_en?`<section class="abstract-block"><h3>Abstract</h3><div class="abstract-text">${esc(r.abstract_en)}</div>${r.keywords_en?`<div class="keywords"><strong>Keywords:</strong> ${esc(r.keywords_en)}</div>`:''}</section>`:''}`;
 modal.hidden=false;document.body.classList.add('lock');
}
function closeModal(){modal.hidden=true;document.body.classList.remove('lock')}
cards.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;const r=data.find(x=>x.id===b.dataset.id);if(r)openModal(r)});
modal.addEventListener('click',e=>{if(e.target.matches('[data-close]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
render();
