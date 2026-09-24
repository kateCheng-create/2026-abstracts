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


function normalizeDigits(s){
  return String(s||'').replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g,m=>({'¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁰':'0'}[m]||m));
}
function cleanAuthorText(s){
  return normalizeDigits(s).replace(/\s+/g,' ').trim();
}
function isEmailLine(line){return /e-?mail|email|@|聯絡/i.test(String(line||''))}
function isCorrespondenceLine(line){return /^(?:[＊*]\s*)?通訊作者[:：]?/i.test(String(line||'').trim())}
function isLikelyTitleLine(line,r){
  const v=String(line||'').trim();
  return !!v && (v===String(r.title||'').trim() || v===String(r.title_en||'').trim());
}
function splitDelimitedAuthorLine(line){
  const parts=String(line||'').split(/\s*[｜|／/]\s*/).map(x=>x.trim()).filter(Boolean);
  return parts.length>=2?parts:null;
}
function isLikelyPersonName(v){const s=String(v||'').trim();return !!s && !/大學|學系|研究所|學院|醫院|中心|department|institute|university/i.test(s) && s.length<=20;}
function startsWithMarker(line){
  const v=String(line||'').trim();
  return /^[\d¹²³⁴⁵⁶⁷⁸⁹⁰＊*]+\s*/.test(v)||/[\d¹²³⁴⁵⁶⁷⁸⁹⁰＊*]\s*$/.test(v);
}
function cleanLeadingMarker(line){
  return cleanAuthorText(line).replace(/^[\d¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*/, '').replace(/[\d¹²³⁴⁵⁶⁷⁸⁹⁰＊*]+$/,'').replace(/^[＊*]\s*/, '').trim();
}
function extractNameList(line){
  return cleanAuthorText(line)
    .replace(/[＊*]/g,'')
    .split(/[、,，]/)
    .map(x=>x.replace(/\d+/g,'').trim())
    .filter(Boolean);
}
function isLikelyNameOnly(line){
  const v=cleanAuthorText(line).replace(/[＊*\d]/g,'').trim();
  if(!v) return false;
  if(/[｜|／/]/.test(v)) return false;
  if(/大學|學系|研究所|學院|教授|博士|碩士|學生|student|Professor|Lecturer|Email|email|@/i.test(v)) return false;
  return v.length<=16;
}
function parseLooseAuthorLine(line){
  const v=cleanAuthorText(line);
  const m=v.match(/^([\u4e00-\u9fffA-Za-z\-．·]{2,20})\s+(.+)$/);
  if(m && !/大學|學系|研究所|學院|醫院|中心/.test(m[1])){
    return {name:m[1].replace(/[＊*]/g,''), detail:m[2].trim()};
  }
  return null;
}
function normalizeAuthorInfo(r){
  const raw=(r.author_info_lines||[])
    .map(x=>String(x||'').trim())
    .filter(Boolean)
    .filter(line=>!isLikelyTitleLine(line,r));

  const contacts=raw.filter(isEmailLine).map(line=>cleanAuthorText(line).replace(/[＊*]+$/,'').trim());
  const notes=raw.filter(line=>!isEmailLine(line)&&isCorrespondenceLine(line)).map(cleanAuthorText);
  const lines=raw.filter(line=>!isEmailLine(line)&&!isCorrespondenceLine(line));

  const authors=[];
  const affiliations=[];

  if(!lines.length) return {authors, affiliations, notes, contacts};

  if(lines.every(isLikelyNameOnly)){
    lines.forEach(line=>authors.push({name:cleanAuthorText(line).replace(/[＊*]/g,'')}));
    return {authors, affiliations, notes, contacts};
  }

  const delimitedCount=lines.filter(line=>splitDelimitedAuthorLine(line)).length;
  if(delimitedCount===lines.length){
    lines.forEach(line=>{
      const parts=splitDelimitedAuthorLine(line);
      authors.push({name:parts[0], detail:parts.slice(1).join('｜')});
    });
    return {authors, affiliations, notes, contacts};
  }

  if(lines.length>1 && /[、,，]/.test(lines[0]) && lines.slice(1).some(startsWithMarker)){
    extractNameList(lines[0]).forEach(name=>authors.push({name}));
    lines.slice(1).forEach(line=>affiliations.push(cleanLeadingMarker(line)));
    return {authors, affiliations, notes, contacts};
  }

  if(lines.length===1){
    const parts=splitDelimitedAuthorLine(lines[0]);
    if(parts){
      authors.push({name:parts[0], detail:parts.slice(1).join('｜')});
    }else{
      const loose=parseLooseAuthorLine(lines[0]);
      if(loose) authors.push(loose);
      else authors.push({name:cleanAuthorText(lines[0]).replace(/[＊*]/g,'')});
    }
    return {authors, affiliations, notes, contacts};
  }

  const first=lines[0];
  const looseFirst=parseLooseAuthorLine(first);
  if(looseFirst && lines.length===2 && !splitDelimitedAuthorLine(lines[1])){
    authors.push(looseFirst);
    affiliations.push(cleanAuthorText(lines[1]));
    return {authors, affiliations, notes, contacts};
  }

  extractNameList(first).forEach(name=>authors.push({name}));
  lines.slice(1).forEach(line=>{
    const parsed=splitDelimitedAuthorLine(line);
    if(parsed && parsed.length>=2 && isLikelyPersonName(parsed[0])){
      authors.push({name:parsed[0], detail:parsed.slice(1).join('｜')});
    }else{
      affiliations.push(cleanAuthorText(line));
    }
  });
  return {authors, affiliations, notes, contacts};
}
function extractRoleFromText(text){
  const roles=[
    '兼任助理副教授','兼任助理教授','特聘教授','助理教授','副教授','教授','講師','教師',
    '助理研究員','副研究員','研究員','博士研究生','碩士研究生','博士生','碩士生','研究生',
    '中級組員','組員','理事長','負責人','學生','主治醫師','物理治療師',
    "Master's Student",'Ph.D. Student','Year 4 Student','Lecturer','Professor','student'
  ];
  const v=cleanAuthorText(text);
  for(const role of roles){
    if(v.includes(role)) return role;
  }
  return '';
}
function splitUnitAndRole(detail){
  const v=cleanAuthorText(detail);
  if(!v) return {unit:'',role:''};
  const parts=v.split(/\s*[｜|／/]\s*/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>=2){
    const rolePart=parts.find(x=>extractRoleFromText(x));
    if(rolePart){
      const role=extractRoleFromText(rolePart);
      const unit=parts.filter(x=>x!==rolePart).join('｜');
      return {unit,role};
    }
  }
  const role=extractRoleFromText(v);
  if(role){
    const unit=v.replace(role,'').replace(/[｜|／/]+\s*$/,'').trim();
    return {unit,role};
  }
  return {unit:v,role:''};
}
function splitNameAndRole(name){
  const v=cleanAuthorText(name).replace(/[＊*]/g,'');
  const role=extractRoleFromText(v);
  if(role){
    return {name:v.replace(role,'').trim(),role};
  }
  return {name:v,role:''};
}
function authorDisplayRows(r){
  const info=normalizeAuthorInfo(r);
  const authors=info.authors.map(a=>({name:a.name||'',detail:a.detail||''}));
  const affiliations=[...info.affiliations];
  const rows=[];

  authors.forEach((a,i)=>{
    const nr=splitNameAndRole(a.name);
    let detail=a.detail||'';
    if(!detail && affiliations.length===authors.length) detail=affiliations[i]||'';
    const ur=splitUnitAndRole(detail);
    const role=nr.role||ur.role;
    const unit=ur.unit;
    rows.push({name:nr.name||a.name,role,unit});
  });

  if(affiliations.length && affiliations.length!==authors.length){
    affiliations.forEach((line,i)=>{
      if(i<authors.length && !authors[i].detail){
        const ur=splitUnitAndRole(line);
        if(rows[i]){
          if(!rows[i].role) rows[i].role=ur.role;
          if(!rows[i].unit) rows[i].unit=ur.unit;
        }
      }else if(i>=authors.length){
        const ur=splitUnitAndRole(line);
        rows.push({name:'',role:ur.role,unit:ur.unit});
      }
    });
  }
  return rows.filter(x=>x.name||x.role||x.unit);
}
function renderAuthorSection(r){
  const rows=authorDisplayRows(r);
  if(!rows.length) return '';
  return `<section class="author-section">
    <div class="modal-label">作者資訊</div>
    <div class="author-one-line-list">
      ${rows.map(row=>{
        const left=[row.name,row.role].filter(Boolean).join(' ');
        return `<div class="author-one-line"><strong>${esc(left||'未提供')}</strong>${row.unit?`<span class="author-sep">｜</span><span>${esc(row.unit)}</span>`:''}</div>`;
      }).join('')}
    </div>
  </section>`;
}

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

    ${renderAuthorSection(r)}

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
