import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const sb = createClient(
  'https://jkvjtjjimqvppvogotiu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprdmp0amppbXF2cHB2b2dvdGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODYzNzAsImV4cCI6MjEwODI2MjM3MH0.Zk-CdKAilLWVjwW8RmvmqRBfOFv9MyrJQxDGDud0qbs'
);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const TYPE_COLORS = {
  'Жер-су атаулары':'#0f766e','Кейіпкерлер':'#8b5cf6','Авторлық сөзқолданыс':'#0dcaf0','Эпитет':'#0d6efd',
  'Метафора':'#198754','Теңеу':'#ffc107','Тұрақты тіркес':'#dc3545','Мақал-мәтелдер':'#6c757d',
  'Көне сөз':'#6f42c1','Діни сөз':'#d63384','Кірме сөз':'#fd7e14','Этномәдени атаулар':'#20c997'
};

const state = { mode: 'word', types: new Set(), authors: new Set(), works: new Set() };
let pairs = []; // {author, work} таңдалған сөздерден

// ---------- Түсті белгілер ----------
function badges(str) {
  return (str || '').split(',').map(t => t.trim()).filter(Boolean).map(t => {
    const dark = (t === 'Теңеу' || t === 'Авторлық сөзқолданыс') ? 'text-dark' : 'text-white';
    return `<span class="badge ${dark} me-1" style="background:${TYPE_COLORS[t] || '#0d6efd'};font-weight:500;font-size:13px">${esc(t)}</span>`;
  }).join('');
}

// ---------- Ақпарат модалы (Word-тағыдай кесте) ----------
const AUTHOR_ROWS = [['name', 'Шығарманың авторы'], ['gender', 'Автордың жынысы'], ['info', 'Жазушының өмірдерегі'], ['main_works', 'Жазушының негізгі еңбектері']];
const WORK_ROWS = [['title', 'Шығарманың аты'], ['author_name', 'Шығарманың авторы'], ['topic', 'Шығарманың тақырыбы'], ['annotation', 'Шығарманың қысқаша аңдатпасы'],
  ['genre', 'Шығарма жанры'], ['genre_type', 'Шығарманың жанрлық түрі'], ['style', 'Шығарма стилі'], ['chronotope', 'Шығарма хронотопы']];

async function showInfo(type, name) {
  const isAuthor = type === 'Автор';
  $('infoModalTitle').textContent = `${type} туралы`;
  $('infoModalBody').innerHTML = '<div class="p-4 text-center"><span class="spinner-border spinner-border-sm text-primary"></span> Жүктелуде...</div>';
  bootstrap.Modal.getOrCreateInstance($('infoModal')).show();

  const { data } = await sb.from(isAuthor ? 'authors' : 'works').select('*').eq(isAuthor ? 'name' : 'title', name).limit(1);
  const r = data?.[0];
  let rows = (isAuthor ? AUTHOR_ROWS : WORK_ROWS).map(([k, label]) => [label, r?.[k]]);
  // жаңа бағандар толмаған ескі жазбалар үшін: бұрынғы "info" мәтіні
  if (!isAuthor && !rows.slice(2).some(x => x[1]) && r?.info) rows.push(['Шығарма туралы', r.info]);
  rows = rows.filter(([, v]) => v && String(v).trim());
  if (!rows.length) rows = [[isAuthor ? 'Шығарманың авторы' : 'Шығарманың аты', name], ['Ақпарат', 'Бұл туралы толық ақпарат әзірге енгізілмеген.']];
  else if (!rows.some(x => x[1] === name)) rows.unshift([isAuthor ? 'Шығарманың авторы' : 'Шығарманың аты', name]);
  const photo = isAuthor && r?.photo_url ? `<div class="text-center p-3 bg-light"><img src="${esc(r.photo_url)}" alt="${esc(name)}" style="max-height:260px;max-width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.15)"></div>` : '';
  $('infoModalBody').innerHTML = photo + `<table class="info-table"><tbody>${rows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Сүзгі карточкалары (типтер) ----------
$('typeFilters').innerHTML = Object.entries(TYPE_COLORS).map(([t, c]) =>
  `<div class="col-6 col-md-4"><button type="button" class="filter-card type-card" style="--c:${c}" data-type="${esc(t)}"><span class="filter-title">${esc(t)}</span></button></div>`
).join('');

$('typeFilters').addEventListener('click', e => {
  const b = e.target.closest('.type-card');
  if (!b) return;
  const t = b.dataset.type;
  state.types.has(t) ? state.types.delete(t) : state.types.add(t);
  b.classList.toggle('active', state.types.has(t));
  refresh();
});

// ---------- Авторлар мен шығармалар (чекбокс) ----------
async function loadFilterLists() {
  const { data, error } = await sb.from('words').select('author, work');
  if (error) {
    $('authorsList').innerHTML = $('worksList').innerHTML = '<li class="px-3 py-2 text-danger">Қате</li>';
    return;
  }
  pairs = data;
  renderAuthors();
  renderWorks();
}

function itemHtml(kind, name) {
  const type = kind === 'author' ? 'Автор' : 'Шығарма';
  return `<li class="item"><label class="d-flex align-items-center gap-2"><input type="checkbox" class="form-check-input mt-0 ${kind}-cb" value="${esc(name)}" ${state[kind + 's'].has(name) ? 'checked' : ''}>${esc(name)}</label>
    <button type="button" class="info-btn" data-type="${type}" data-name="${esc(name)}" title="Ақпарат"><i class="bi bi-info-circle"></i></button></li>`;
}

function renderAuthors() {
  const list = [...new Set(pairs.map(p => p.author).filter(Boolean))];
  $('authorsList').innerHTML = list.length ? list.map(a => itemHtml('author', a)).join('') : '<li class="px-3 py-2 text-muted">Бос</li>';
}

function renderWorks() {
  // автор таңдалса, тек сол авторлардың шығармалары көрсетіледі
  const src = state.authors.size ? pairs.filter(p => state.authors.has(p.author)) : pairs;
  const list = [...new Set(src.map(p => p.work).filter(Boolean))];
  // көрінбей қалған шығармаларды таңдаудан алып тастау
  [...state.works].forEach(w => { if (!list.includes(w)) state.works.delete(w); });
  $('worksList').innerHTML = list.length ? list.map(w => itemHtml('work', w)).join('') : '<li class="px-3 py-2 text-muted">Бос</li>';
}

['authorsList', 'worksList'].forEach(id => $(id).addEventListener('click', e => {
  const info = e.target.closest('.info-btn');
  if (info) { showInfo(info.dataset.type, info.dataset.name); return; }
}));

$('authorsList').addEventListener('change', e => {
  if (!e.target.classList.contains('author-cb')) return;
  e.target.checked ? state.authors.add(e.target.value) : state.authors.delete(e.target.value);
  renderWorks();
  refresh();
});
$('worksList').addEventListener('change', e => {
  if (!e.target.classList.contains('work-cb')) return;
  e.target.checked ? state.works.add(e.target.value) : state.works.delete(e.target.value);
  refresh();
});

// сүзгі панелі жиырылғанда ықшам көрінеді
$('filtersBody').addEventListener('hide.bs.collapse', e => { if (e.target === e.currentTarget) $('filters').classList.add('is-collapsed'); });
$('filtersBody').addEventListener('show.bs.collapse', e => { if (e.target === e.currentTarget) $('filters').classList.remove('is-collapsed'); });

// ---------- Таңдалған сүзгілер (чиптер) ----------
function refresh() {
  const set = (id, n) => { $(id).textContent = n; $(id).classList.toggle('d-none', !n); };
  set('authorCount', state.authors.size);
  set('workCount', state.works.size);
  set('typesCount', state.types.size);
  set('filtersCount', state.types.size + state.authors.size + state.works.size);
  $('resetFilters').classList.toggle('d-none', !(state.types.size || state.authors.size || state.works.size));

  const chip = (kind, v, icon) => `<span class="chip"><i class="bi ${icon} me-1"></i>${esc(v)}<button type="button" data-kind="${kind}" data-v="${esc(v)}">✕</button></span>`;
  $('chips').innerHTML =
    [...state.authors].map(v => chip('authors', v, 'bi-person')).join('') +
    [...state.works].map(v => chip('works', v, 'bi-book')).join('') +
    [...state.types].map(v => chip('types', v, 'bi-tag')).join('');
}

$('chips').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  state[b.dataset.kind].delete(b.dataset.v);
  syncUi();
});

function syncUi() {
  document.querySelectorAll('.type-card').forEach(c => c.classList.toggle('active', state.types.has(c.dataset.type)));
  renderAuthors(); renderWorks(); refresh();
}

$('resetFilters').addEventListener('click', () => {
  state.types.clear(); state.authors.clear(); state.works.clear();
  syncUi();
});

// ---------- Іздеу режимі ----------
document.querySelectorAll('.mode-item').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  state.mode = a.dataset.mode;
  $('modeBtn').textContent = a.textContent;
}));

$('clearBtn').addEventListener('click', () => {
  $('searchInput').value = '';
  $('results').innerHTML = '';
  $('searchInput').focus();
});
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
$('searchBtn').addEventListener('click', search);

// ---------- Іздеу ----------
async function search() {
  const q = $('searchInput').value.trim();
  const hasFilters = state.types.size || state.authors.size || state.works.size;
  if (!q && !hasFilters) {
    $('results').innerHTML = '<div class="alert alert-warning">Сөзді енгізіңіз немесе кемінде бір сүзгіні таңдаңыз.</div>';
    return;
  }
  // сүзгі таңдалып іздегенде, "Сүзгілер арқылы іздеу" панелі жиырылады (тақырыбын басып қайта ашуға болады)
  if (hasFilters) bootstrap.Collapse.getOrCreateInstance($('filtersBody'), { toggle: false }).hide();
  $('results').innerHTML = '<div class="text-center mt-3"><span class="spinner-border spinner-border-sm"></span> Ізделуде...</div>';

  let query = sb.from('words').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike(state.mode === 'word' ? 'word' : 'meaning', `%${q}%`);
  if (state.authors.size) query = query.in('author', [...state.authors]);
  if (state.works.size) query = query.in('work', [...state.works]);
  if (state.types.size) query = query.or([...state.types].map(t => `word_type.ilike."%${t}%"`).join(','));

  const { data, error } = await query;
  if (error) { $('results').innerHTML = `<div class="alert alert-danger">Қате: ${esc(error.message)}</div>`; return; }
  if (!data.length) { $('results').innerHTML = '<div class="alert alert-warning">Ештеңе табылмады.</div>'; return; }

  $('results').innerHTML = `<div class="mb-2 text-muted">Табылды: ${data.length}</div>` + data.map(i => `
    <div class="card mb-3 p-4 shadow-sm border-0 text-dark" style="border-radius:12px">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 class="text-primary fw-bold mb-0">${esc(i.word)}</h3>
        <div>${badges(i.word_type)}</div>
      </div>
      <div class="bg-light p-3 rounded mb-3 border"><span class="fst-italic">${esc(i.meaning)}</span></div>
      ${i.example ? `<div class="mb-3 ps-3 text-secondary" style="border-left:3px solid #93c5fd"><i class="bi bi-quote me-1"></i>${esc(i.example)}</div>` : ''}
      <div class="text-secondary">
        <strong>Автор:</strong> <a href="#" class="info-link text-decoration-none border-bottom border-primary" data-title="Автор" data-name="${esc(i.author)}">${esc(i.author)}</a><br>
        <strong>Шығарма:</strong> <a href="#" class="info-link text-decoration-none border-bottom border-success" data-title="Шығарма" data-name="${esc(i.work)}">${esc(i.work)}</a>
      </div>
    </div>`).join('');
}

$('results').addEventListener('click', e => {
  const a = e.target.closest('.info-link');
  if (!a) return;
  e.preventDefault();
  showInfo(a.dataset.title, a.dataset.name);
});

// ---------- Күн авторы / Күн сөзі ----------
// Күн сайын (жергілікті күн бойынша) бір автор мен бір сөз ауысып тұрады: барлық пайдаланушыға бірдей.
const dayIndex = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); };
const cut = (s, n) => { s = String(s ?? '').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
const dHead = (icon, t) => `<div class="daily-head"><i class="bi ${icon}"></i>${t}</div>`;

async function loadDailyAuthor() {
  const box = $('dailyAuthor'), head = dHead('bi-person-badge-fill', 'Күн авторы');
  try {
    const { data, error } = await sb.from('authors').select('name, info, photo_url').order('name');
    if (error) throw error;
    if (!data?.length) { box.innerHTML = head + '<div class="daily-body text-center text-muted small">Авторлар әзірге қосылмаған.</div>'; return; }
    const a = data[dayIndex() % data.length];
    box.innerHTML = head + `<div class="daily-body text-center">
      ${a.photo_url ? `<img class="daily-photo" src="${esc(a.photo_url)}" alt="${esc(a.name)}">` : '<div class="daily-avatar"><i class="bi bi-person-fill"></i></div>'}
      <div class="fw-bold mb-2">${esc(a.name)}</div>
      ${a.info ? `<p class="small text-muted text-start">${esc(cut(a.info, 120))}</p>` : ''}
      <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-3" data-info-title="Автор" data-info-name="${esc(a.name)}">Толығырақ</button></div>`;
  } catch (e) {
    box.innerHTML = head + '<div class="daily-body text-center text-danger small">Жүктелмеді.</div>';
  }
}

async function loadDailyWord() {
  const box = $('dailyWord'), head = dHead('bi-lightbulb-fill', 'Күн сөзі');
  try {
    const c = await sb.from('words').select('id', { count: 'exact', head: true });
    if (c.error) throw c.error;
    if (!c.count) { box.innerHTML = head + '<div class="daily-body text-center text-muted small">Сөздер әзірге қосылмаған.</div>'; return; }
    const { data, error } = await sb.from('words').select('*').order('id').range(dayIndex() % c.count, dayIndex() % c.count);
    if (error) throw error;
    const w = data?.[0];
    if (!w) throw new Error('empty');
    box.innerHTML = head + `<div class="daily-body">
      <div class="daily-word mb-2">${esc(w.word)}</div>
      <div class="mb-2">${badges(w.word_type)}</div>
      <p class="small fst-italic mb-2">${esc(cut(w.meaning, 160))}</p>
      ${w.example ? `<p class="small text-secondary ps-2 mb-2" style="border-left:3px solid #93c5fd">${esc(cut(w.example, 130))}</p>` : ''}
      <div class="small text-secondary">
        <a href="#" class="daily-link" data-info-title="Автор" data-info-name="${esc(w.author)}">${esc(w.author)}</a><br>
        <a href="#" class="daily-link" data-info-title="Шығарма" data-info-name="${esc(w.work)}">${esc(w.work)}</a>
      </div></div>`;
  } catch (e) {
    box.innerHTML = head + '<div class="daily-body text-center text-danger small">Жүктелмеді.</div>';
  }
}

$('daily').addEventListener('click', e => {
  const a = e.target.closest('[data-info-name]');
  if (!a) return;
  e.preventDefault();
  showInfo(a.dataset.infoTitle, a.dataset.infoName);
});

loadDailyAuthor();
loadDailyWord();
loadFilterLists();