const DB = window.DB || {abstracts:[], schedule:[]};
const ABSTRACTS = DB.abstracts;
const SCHEDULE = DB.schedule;

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const modal=document.querySelector('#modal');
const modalBody=document.querySelector('#modalBody');
let currentDay='10/1', filterDate='全部', filterType='全部';

function presentersOf(r){return (r.presenters&&r.presenters.length?r.presenters:[r.presenter]).filter(Boolean)}
const nameIndex=new Map();
ABSTRACTS.forEach(r=>presentersOf(r).forEach(n=>{if(!nameIndex.has(n))nameIndex.set(n,[]);nameIndex.get(n).push(r)}));
const allNames=[...nameIndex.keys()].sort((a,b)=>b.length-a.length);

function paragraphsHtml(text){
  const value=String(text||'').trim();
  if(!value)return '<p class="abstract-paragraph no-content">尚未提供</p>';
  return value.split(/\n\s*\n+/).map(p=>`<p class="abstract-paragraph">${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
}

function openAbstract(r){
  const code=r.type==='海報發表'?`海報 ${r.code}`:r.code;
  const hasEnTitle=Boolean(r.title_en&&r.title_en!==r.title);
  modalBody.innerHTML=`
    <header class="abstract-header">
      <div class="modal-eyebrow">PRESENTER / ABSTRACT</div>
      <h2 id="modalTitle" class="modal-presenters">${esc(presentersOf(r).join('、'))}</h2>
      <div class="modal-meta"><span>${esc(r.date)}</span><span>${esc(r.type)}</span><span>${esc(code)}</span></div>
    </header>

    <section class="title-section">
      <div class="modal-label">發表題目</div>
      <h3 class="modal-title">${esc(r.title||r.title_en||'未提供題目')}</h3>
      ${hasEnTitle?`<p class="modal-en-title">${esc(r.title_en)}</p>`:''}
    </section>

    ${r.author_info_lines&&r.author_info_lines.length?`<section class="author-section">
      <div class="modal-label">作者資訊</div>
      <div class="author-info">${r.author_info_lines.map(line=>`<div class="author-line">${esc(line)}</div>`).join('')}</div>
    </section>`:''}

    <section class="abstract-block primary-abstract">
      <h4><span>摘要</span><span>ABSTRACT</span></h4>
      <div class="abstract-text">${paragraphsHtml(r.abstract||'')}</div>
      ${r.keywords?`<div class="keywords"><span class="keyword-label">關鍵詞</span><span>${esc(r.keywords)}</span></div>`:''}
    </section>

    ${r.abstract_en?`<section class="abstract-block english-abstract">
      <h4><span>英文摘要</span><span>ENGLISH ABSTRACT</span></h4>
      <div class="abstract-text en">${paragraphsHtml(r.abstract_en)}</div>
      ${r.keywords_en?`<div class="keywords"><span class="keyword-label">Keywords</span><span>${esc(r.keywords_en)}</span></div>`:''}
    </section>`:''}`;
  modal.hidden=false;document.body.classList.add('lock');
}
function closeModal(){modal.hidden=true;document.body.classList.remove('lock')}
modal.addEventListener('click',e=>{if(e.target.matches('[data-close]'))closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});

function cellClass(text){
  if(!text)return '';
  if(/休息|午餐|報到|茶敘|場地撤收/.test(text))return 'break';
  if(/論文發表/.test(text))return 'paper';
  if(/Panel/i.test(text))return 'panel';
  if(/海報發表/.test(text))return 'poster';
  if(/專題演講/.test(text))return 'keynote';
  return '';
}
function clickableText(raw){
  if(!raw)return '';
  let safe=esc(raw);
  const tokens=[];
  allNames.forEach(name=>{
    const encoded=esc(name);
    if(!safe.includes(encoded))return;
    const key=`@@NAME${tokens.length}@@`;
    tokens.push({key,name});
    safe=safe.split(encoded).join(key);
  });
  safe=safe.replace(/\n/g,'<br>');
  tokens.forEach(({key,name})=>{
    const rows=nameIndex.get(name)||[];
    const btn=rows.length===1
      ?`<button class="presenter-link" data-abstract-id="${esc(rows[0].id)}">${esc(name)}</button>`
      :`<button class="presenter-link" data-presenter="${esc(name)}">${esc(name)}</button>`;
    safe=safe.split(key).join(btn);
  });
  const parts=safe.split('<br>');
  return parts.map((p,i)=>{
    if(i===0)return `<span class="session-title">${p}</span>`;
    return `<span class="line">${p}</span>`;
  }).join('');
}

const dayTabs=document.querySelector('#scheduleDayTabs');
const scheduleWrap=document.querySelector('#scheduleWrap');
function mergedScheduleRows(day){
  const rooms=['402A','402B','402C'];
  const R=day.rows.length,C=rooms.length;
  const values=day.rows.map(r=>rooms.map(room=>r.rooms[room]||''));
  const used=Array.from({length:R},()=>Array(C).fill(false));
  const cells=Array.from({length:R},()=>[]);

  for(let r=0;r<R;r++){
    for(let c=0;c<C;c++){
      if(used[r][c]) continue;
      const value=values[r][c];
      if(!value){
        used[r][c]=true;
        cells[r].push({c,value,rowspan:1,colspan:1});
        continue;
      }

      let colspan=1;
      while(c+colspan<C && !used[r][c+colspan] && values[r][c+colspan]===value) colspan++;

      let rowspan=1;
      outer: while(r+rowspan<R){
        for(let cc=c;cc<c+colspan;cc++){
          if(used[r+rowspan][cc] || values[r+rowspan][cc]!==value) break outer;
        }
        rowspan++;
      }

      for(let rr=r;rr<r+rowspan;rr++) for(let cc=c;cc<c+colspan;cc++) used[rr][cc]=true;
      cells[r].push({c,value,rowspan,colspan});
    }
  }

  return day.rows.map((row,r)=>{
    const tds=cells[r].sort((a,b)=>a.c-b.c).map(cell=>{
      const attrs=`${cell.rowspan>1?` rowspan="${cell.rowspan}"`:''}${cell.colspan>1?` colspan="${cell.colspan}"`:''}`;
      const merged=cell.rowspan>1||cell.colspan>1?' merged':'';
      return `<td class="agenda-cell ${cellClass(cell.value)}${merged}"${attrs}>${clickableText(cell.value)}</td>`;
    }).join('');
    return `<tr><td class="time">${esc(row.time)}</td>${tds}</tr>`;
  }).join('');
}

function renderSchedule(){
  dayTabs.innerHTML=SCHEDULE.map(d=>`<button class="day-btn ${d.date===currentDay?'active':''}" data-day="${d.date}">${d.label}</button>`).join('');
  const day=SCHEDULE.find(d=>d.date===currentDay)||SCHEDULE[0];
  const rows=mergedScheduleRows(day);
  scheduleWrap.innerHTML=`<div class="schedule-card"><div class="schedule-title">${esc(day.label)}</div><div class="schedule-scroll"><table class="schedule-table"><thead><tr><th>時間</th><th>402A</th><th>402B</th><th>402C</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
dayTabs.addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;currentDay=b.dataset.day;renderSchedule()});
scheduleWrap.addEventListener('click',e=>{
  const b=e.target.closest('[data-abstract-id],[data-presenter]');if(!b)return;
  if(b.dataset.abstractId){const r=ABSTRACTS.find(x=>x.id===b.dataset.abstractId);if(r)openAbstract(r);return;}
  const rows=nameIndex.get(b.dataset.presenter)||[];if(rows[0])openAbstract(rows[0]);
});

const q=document.querySelector('#q'), grid=document.querySelector('#abstractGrid'), count=document.querySelector('#count'), empty=document.querySelector('#empty');
function searchable(r){return [presentersOf(r).join(' '),r.title,r.title_en,r.keywords,r.keywords_en,r.abstract,r.abstract_en,r.code].join(' ').toLowerCase()}
function renderAbstracts(){
  const term=q.value.trim().toLowerCase();
  const rows=ABSTRACTS.filter(r=>(filterDate==='全部'||r.date===filterDate)&&(filterType==='全部'||r.type===filterType)&&(!term||searchable(r).includes(term)));
  count.textContent=rows.length;empty.hidden=rows.length>0;
  grid.innerHTML=rows.map(r=>{const code=r.type==='海報發表'?`海報 ${r.code}`:r.code;return `<button class="abstract-card" data-id="${esc(r.id)}"><div class="a-meta"><span class="a-code">${esc(code)}</span><span>${esc(r.date)}</span><span class="a-type ${r.type==='海報發表'?'poster':''}">${esc(r.type)}</span></div><h3>${esc(r.title||r.title_en||'未提供題目')}</h3><p class="a-presenters">${esc(presentersOf(r).join('、'))}</p></button>`}).join('');
}
q.addEventListener('input',renderAbstracts);
document.querySelector('#abstractsView').addEventListener('click',e=>{
  const chip=e.target.closest('.chip');
  if(chip){const wrap=chip.parentElement;[...wrap.querySelectorAll('.chip')].forEach(x=>x.classList.toggle('active',x===chip));if(chip.dataset.date)filterDate=chip.dataset.date;if(chip.dataset.type)filterType=chip.dataset.type;renderAbstracts();return;}
  const card=e.target.closest('[data-id]');if(card){const r=ABSTRACTS.find(x=>x.id===card.dataset.id);if(r)openAbstract(r)}
});

const tabs=[...document.querySelectorAll('.nav-tab')];
tabs.forEach(t=>t.addEventListener('click',()=>{
  tabs.forEach(x=>x.classList.toggle('active',x===t));
  const v=t.dataset.view;document.querySelector('#scheduleView').hidden=v!=='schedule';document.querySelector('#abstractsView').hidden=v!=='abstracts';
  window.scrollTo({top:document.querySelector('.main-nav').offsetTop,behavior:'smooth'});
}));

renderSchedule();renderAbstracts();
