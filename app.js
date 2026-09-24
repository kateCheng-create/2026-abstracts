const data = window.ABSTRACTS || [];
let type = '全部';
let date = '全部';

const q = document.querySelector('#q');
const directory = document.querySelector('#directory');
const count = document.querySelector('#count');
const empty = document.querySelector('#empty');
const modal = document.querySelector('#modal');
const modalBody = document.querySelector('#modalBody');

const esc = s => String(s || '').replace(/[&<>"']/g, m => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
}[m]));

function searchable(r){
  return [r.presenter,r.title,r.title_en,r.keywords,r.keywords_en,r.abstract,r.abstract_en,r.code,r.session]
    .join(' ').toLowerCase();
}

function personCard(r){
  const typeClass = r.type === '海報發表' ? 'poster' : '';
  const code = r.type === '海報發表' ? `海報 ${r.code}` : r.code;
  return `<button class="person" data-id="${esc(r.id)}" aria-label="查看 ${esc(r.presenter)} 的摘要">
    <div class="person-top">
      <span class="person-name">${esc(r.presenter || '未提供姓名')}</span>
      <span class="person-arrow">→</span>
    </div>
    <div class="person-meta">
      <span class="person-code">${esc(code)}</span>
      <span class="person-type ${typeClass}">${esc(r.type)}</span>
    </div>
  </button>`;
}

function render(){
  const term = q.value.trim().toLowerCase();
  const rows = data.filter(r =>
    (type === '全部' || r.type === type) &&
    (date === '全部' || r.date === date) &&
    (!term || searchable(r).includes(term))
  );

  count.textContent = rows.length;
  empty.hidden = rows.length > 0;

  const dates = ['10/1','10/2','10/3'];
  directory.innerHTML = dates.map(d => {
    const group = rows.filter(r => r.date === d);
    if (!group.length) return '';
    return `<section class="date-section">
      <div class="date-head"><h3>${d}</h3><span>${group.length} PRESENTERS</span></div>
      <div class="presenter-grid">${group.map(personCard).join('')}</div>
    </section>`;
  }).join('');
}

function setActive(container, target){
  [...container.querySelectorAll('.chip')].forEach(btn => btn.classList.toggle('active', btn === target));
}

document.querySelector('#typeFilters').addEventListener('click', e => {
  if (!e.target.matches('.chip')) return;
  type = e.target.dataset.type;
  setActive(e.currentTarget, e.target);
  render();
});

document.querySelector('#dateFilters').addEventListener('click', e => {
  if (!e.target.matches('.chip')) return;
  date = e.target.dataset.date;
  setActive(e.currentTarget, e.target);
  render();
});

q.addEventListener('input', render);

function openModal(r){
  const code = r.type === '海報發表' ? `海報 ${r.code}` : r.code;
  modalBody.innerHTML = `
    <div class="modal-eyebrow">Presenter</div>
    <h2 id="modalTitle" class="modal-name">${esc(r.presenter || '未提供姓名')}</h2>
    <div class="modal-meta">
      <span>${esc(r.date)}</span><span>${esc(r.type)}</span><span>${esc(code)}</span>
    </div>

    <div class="modal-title-label">發表題目</div>
    <h3 class="modal-title">${esc(r.title || r.title_en || '未提供題目')}</h3>
    ${r.title_en && r.title_en !== r.title ? `<p class="modal-en-title">${esc(r.title_en)}</p>` : ''}

    <section class="abstract-block">
      <h4>摘要 Abstract</h4>
      <div class="abstract-text ${r.abstract ? '' : 'noabs'}">${esc(r.abstract || '尚未提供中文摘要')}</div>
      ${r.keywords ? `<div class="keywords"><strong>關鍵詞：</strong>${esc(r.keywords)}</div>` : ''}
    </section>

    ${r.abstract_en ? `<section class="abstract-block">
      <h4>English Abstract</h4>
      <div class="abstract-text">${esc(r.abstract_en)}</div>
      ${r.keywords_en ? `<div class="keywords"><strong>Keywords:</strong> ${esc(r.keywords_en)}</div>` : ''}
    </section>` : ''}`;

  modal.hidden = false;
  document.body.classList.add('lock');
}

function closeModal(){
  modal.hidden = true;
  document.body.classList.remove('lock');
}

directory.addEventListener('click', e => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  const r = data.find(x => x.id === btn.dataset.id);
  if (r) openModal(r);
});

modal.addEventListener('click', e => {
  if (e.target.matches('[data-close]')) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

render();
