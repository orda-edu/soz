import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const sb = createClient(
  'https://jkvjtjjimqvppvogotiu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprdmp0amppbXF2cHB2b2dvdGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODYzNzAsImV4cCI6MjEwODI2MjM3MH0.Zk-CdKAilLWVjwW8RmvmqRBfOFv9MyrJQxDGDud0qbs'
);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- Қателерді қазақшаға аудару ----------
const ERR_KK = [
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i, 'Байланыс қатесі. Интернетті тексеріп, қайталаңыз.'],
  [/row-level security|permission denied|not authorized|unauthorized|forbidden|not allowed/i, 'Бұл әрекетке рұқсат жоқ.'],
  [/duplicate key|already exists|resource already exists/i, 'Мұндай жазба бұрыннан бар.'],
  [/payload too large|exceeded the maximum allowed size|too large|entity too large/i, 'Файл тым үлкен.'],
  [/mime type|invalid file type|not supported|unsupported/i, 'Бұл файл түріне рұқсат жоқ.'],
  [/bucket not found|object not found|not found/i, 'Сұралған дерек немесе файл табылмады.'],
  [/violates foreign key|foreign key/i, 'Бұл жазба басқа деректермен байланысты, өшіруге немесе өзгертуге болмайды.'],
  [/null value|not-null|violates not-null/i, 'Міндетті өріс толтырылмаған.'],
  [/invalid input syntax|invalid input|malformed/i, 'Енгізілген мән дұрыс емес.'],
  [/jwt|session|token|expired/i, 'Сессия мерзімі өтіп кетті. Қайта кіріңіз.'],
  [/rate limit|too many|429/i, 'Тым жиі сұраныс. Біраз күте тұрып, қайталаңыз.'],
  [/timeout|timed out|statement timeout/i, 'Күту уақыты өтіп кетті. Қайталап көріңіз.']
];
const errKK = e => {
  const m = String(e?.message || e || '');
  if (/[а-яәіңғүұқөһ]/i.test(m)) return m;   // қазақша хабар болса, сол күйінде
  const hit = ERR_KK.find(([re]) => re.test(m));
  return hit ? hit[1] : 'Күтпеген қате орын алды. Қайталап көріңіз.';
};
const TYPES = ['Жер-су атаулары','Кейіпкерлер','Авторлық сөзқолданыс','Эпитет','Метафора','Теңеу','Тұрақты тіркес','Мақал-мәтелдер','Көне сөз','Діни сөз','Кірме сөз','Этномәдени атаулар'];
const KMZH_EXT = ['pdf', 'doc', 'docx', 'pptx'];

const VIEWS = {
  authors:  { title: 'АВТОРЛАР', btn: 'Автор енгізу', h1: 'Аты-жөні:', h2: 'Автор туралы', table: 'authors' },
  works:    { title: 'ШЫҒАРМАЛАР', btn: 'Шығарма енгізу', h1: 'Шығарма атауы:', h2: 'Автор / Шығарма туралы', table: 'works' },
  words:    { title: 'СӨЗДЕР', btn: 'Сөз енгізу', h1: 'Сөз:', h2: 'Мағынасы / Автор / Шығарма', table: 'words' },
  pictures: { title: 'СУРЕТТЕР', btn: 'Сурет енгізу', h1: 'Сурет:', h2: 'Дұрыс жауап', table: 'pictures' },
  kmzh:     { title: 'ҚМЖ', btn: 'ҚМЖ енгізу', h1: 'Тақырыбы:', h2: 'Файл', table: 'kmzh' },
  videos:   { title: 'БЕЙНЕСАБАҚТАР', btn: 'Бейнесабақ енгізу', h1: 'Атауы:', h2: 'Сілтемесі', table: 'videos' }
};

let view = 'authors', kind = 'authors', editId = null, editRow = null, rows = [];
let authors = [], works = [];
const modal = new bootstrap.Modal($('formModal'));

// ---------- Файл жүктеу көмекшілері ----------
const extOf = f => (f.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
async function upload(bucket, file) {
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extOf(file) || 'bin'}`;
  const r = await sb.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (r.error) throw r.error;
  return path;
}
const publicUrl = (bucket, path) => sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
const pathFromUrl = (url, bucket) => url && url.includes(`/${bucket}/`) ? decodeURIComponent(url.split(`/${bucket}/`).pop()) : null;
const msg = (t, cls) => { $('mMsg').className = 'me-auto fw-bold ' + (cls || ''); $('mMsg').textContent = t; };
const imgCheck = f => {
  if (!f.type.startsWith('image/')) throw new Error('Тек сурет файлын таңдаңыз!');
  if (f.size > 5 * 1024 * 1024) throw new Error('Сурет 5 МБ-тан үлкен!');
};

// ---------- Кіру ----------
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('username').value === 'orda' && $('password').value === 'orda2026') {
    try { sessionStorage.setItem('adminAuth', '1'); } catch (err) {}
    $('loginSection').classList.add('d-none');
    $('adminSection').classList.remove('d-none');
    show('authors');
  } else $('loginError').classList.remove('d-none');
});

document.querySelectorAll('.nav-s a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); show(a.dataset.view); }));
$('btnAdd').addEventListener('click', () => openForm(view));
$('btnNewWord').addEventListener('click', () => openForm('words'));

// ---------- Кесте ----------
function rowCells(v, r) {
  const photoBtn = `<button class="act" data-photo="${r.id}" data-name="${esc(r.name)}">${r.photo_url ? 'Суретті ауыстыру' : 'Сурет қосу'}</button>`;
  switch (v) {
    case 'authors':
      return [esc(r.name) + (r.photo_url ? `<br><img class="thumb mt-2" src="${esc(r.photo_url)}" alt="">` : ''), esc(r.info), photoBtn];
    case 'works':
      return [esc(r.title), esc(`Автор: ${r.author_name}\n${r.topic || r.info || ''}`), ''];
    case 'words':
      return [esc(r.word), esc(`${r.meaning}${r.example ? '\nМысал: ' + r.example : ''}\nАвтор: ${r.author} | Шығарма: ${r.work}\nТипі: ${r.word_type}`), ''];
    case 'pictures':
      return [`<img class="thumb" src="${esc(r.image_url)}" alt="">`, esc(r.correct_answer), ''];
    case 'kmzh':
      return [esc(r.title), esc(r.file_name || r.file_path), ''];
    case 'videos':
      return [esc(r.title), `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`, ''];
  }
}

let lastView = null, fs = {};
const uniq = key => [...new Set(rows.map(r => r[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'kk'));
const textOf = r => Object.values(r).filter(x => typeof x === 'string').join(' ').toLowerCase();

function filterDefs(v) {
  const L = {
    authors: [['gender', 'Жынысы: барлығы', ['Ер', 'Әйел']], ['photo', 'Сурет: барлығы', ['Суреті бар', 'Суреті жоқ']]],
    works: [['author', 'Автор: барлығы', uniq('author_name')], ['genre', 'Жанрлық түрі: барлығы', uniq('genre_type')]],
    words: [['author', 'Автор: барлығы', uniq('author')],
            ['work', 'Шығарма: барлығы', [...new Set(rows.filter(r => !fs.author || r.author === fs.author).map(r => r.work).filter(Boolean))].sort()],
            ['type', 'Тип: барлығы', TYPES]],
    kmzh: [['ext', 'Файл түрі: барлығы', ['pdf', 'doc', 'docx', 'pptx']]]
  };
  return L[v] || [];
}

function buildFilters() {
  const sel = ([id, label, opts]) => `<select class="form-select form-select-sm fsel" data-f="${id}"><option value="">${esc(label)}</option>${opts.map(o => `<option value="${esc(o)}" ${fs[id] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  $('filterBar').innerHTML = `<div class="position-relative"><i class="bi bi-search position-absolute" style="left:12px;top:8px;color:#94a3b8"></i>
    <input id="fq" class="form-control form-control-sm" style="padding-left:34px;width:260px" placeholder="Іздеу..." value="${esc(fs.q || '')}"></div>
    ${filterDefs(view).map(sel).join('')}
    <button class="act m-0" id="fclear" type="button">Тазалау</button><span class="text-muted small ms-auto" id="fcount"></span>`;
}

function passes(r) {
  const q = (fs.q || '').toLowerCase();
  if (q && !textOf(r).includes(q)) return false;
  if (view === 'authors') {
    if (fs.gender && r.gender !== fs.gender) return false;
    if (fs.photo && !!r.photo_url !== (fs.photo === 'Суреті бар')) return false;
  } else if (view === 'works') {
    if (fs.author && r.author_name !== fs.author) return false;
    if (fs.genre && r.genre_type !== fs.genre) return false;
  } else if (view === 'words') {
    if (fs.author && r.author !== fs.author) return false;
    if (fs.work && r.work !== fs.work) return false;
    if (fs.type && !(r.word_type || '').split(',').map(t => t.trim()).includes(fs.type)) return false;
  } else if (view === 'kmzh') {
    if (fs.ext && extOf({ name: r.file_name || r.file_path }) !== fs.ext) return false;
  }
  return true;
}

function draw() {
  const v = view, cfg = VIEWS[v];
  const list = rows.filter(passes);
  $('fcount').textContent = `Көрсетілді: ${list.length} / ${rows.length}`;
  if (!rows.length) { $('rows').innerHTML = '<div class="p-4 text-muted">Әзірге бос.</div>'; return; }
  if (!list.length) { $('rows').innerHTML = '<div class="p-4 text-muted">Ештеңе табылмады. Сүзгілерді өзгертіп көріңіз.</div>'; return; }

  $('rows').innerHTML = list.map(r => {
    const [c1, c2, extra] = rowCells(v, r);
    const path = v === 'kmzh' ? r.file_path : v === 'pictures' ? pathFromUrl(r.image_url, 'pictures') : v === 'authors' ? pathFromUrl(r.photo_url, 'authors') : '';
    return `<div class="tr-row"><div class="c1">${c1}</div>
      <div class="c2">${c2}<br><button class="act" data-edit="${r.id}">Өзгерту</button>${extra || ''}<button class="del" data-id="${r.id}" data-path="${esc(path || '')}">Өшіру</button></div></div>`;
  }).join('');

  document.querySelectorAll('.del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Өшіруді растайсыз ба?')) return;
    const bucket = { kmzh: 'kmzh', pictures: 'pictures', authors: 'authors' }[view];
    if (bucket && b.dataset.path) await sb.storage.from(bucket).remove([b.dataset.path]);
    const { error } = await sb.from(cfg.table).delete().eq('id', b.dataset.id);
    if (error) alert('Қате: ' + errKK(error)); else show(view);
  }));
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openForm(view, null, rows.find(x => x.id === b.dataset.edit))));
  document.querySelectorAll('[data-photo]').forEach(b => b.addEventListener('click', () => { editId = b.dataset.photo; openForm('authorphoto', b.dataset.name); }));
}

$('filterBar').addEventListener('input', e => { if (e.target.id === 'fq') { fs.q = e.target.value; draw(); } });
$('filterBar').addEventListener('change', e => {
  const f = e.target.dataset.f; if (!f) return;
  fs[f] = e.target.value;
  if (view === 'words' && f === 'author') fs.work = '';   // автор ауысса, шығарма таңдауы тазаланады
  buildFilters(); draw();
});
$('filterBar').addEventListener('click', e => { if (e.target.id === 'fclear') { fs = {}; buildFilters(); draw(); } });

async function show(v) {
  if (v !== lastView) { fs = {}; lastView = v; }   // бөлім ауысқанда сүзгі тазаланады, жаңартқанда сақталады
  view = v;
  const cfg = VIEWS[v];
  document.querySelectorAll('.nav-s a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  $('pageTitle').textContent = cfg.title;
  $('btnAdd').textContent = cfg.btn;
  $('h1').textContent = cfg.h1;
  $('h2').textContent = cfg.h2;
  $('rows').innerHTML = '<div class="p-4 text-muted">Жүктелуде...</div>';

  const { data, error } = await sb.from(cfg.table).select('*');
  if (error) { $('rows').innerHTML = `<div class="p-4 text-danger">Қате: ${esc(errKK(error))}</div>`; return; }
  rows = data;
  buildFilters();
  draw();
}

// ---------- Форма ----------
async function openForm(k, extra, row) {
  kind = k;
  editRow = row || null;
  msg('');
  $('mTitle').textContent = k === 'authorphoto' ? `Автор суреті: ${extra}` : row ? `Өзгерту: ${row.name || row.title || row.word || row.correct_answer || ''}` : VIEWS[k].btn;
  if (k === 'works' || k === 'words') {
    const [a, w] = await Promise.all([sb.from('authors').select('name'), sb.from('works').select('title, author_name')]);
    authors = a.data || []; works = w.data || [];
  }
  const authorOpts = authors.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join('');
  const imgInput = (id, req) => `<input type="file" id="${id}" class="form-control mb-3" accept="image/*" ${req ? 'required' : ''}>
      <img id="${id}prev" class="thumb mb-3 d-none" alt="">`;
  const F = {
    authors: `<input id="f1" class="form-control mb-3" placeholder="Аты-жөні" required>
      <select id="fg" class="form-select mb-3"><option value="">Жынысы</option><option>Ер</option><option>Әйел</option></select>
      <textarea id="f2" class="form-control mb-3" rows="4" placeholder="Жазушының өмірдерегі"></textarea>
      <textarea id="fm" class="form-control mb-3" rows="3" placeholder="Жазушының негізгі еңбектері"></textarea>
      <label class="form-label fw-bold">Автор суреті (міндетті емес)</label>${imgInput('fphoto')}`,
    authorphoto: `<label class="form-label fw-bold">Сурет файлы (5 МБ-қа дейін)</label>${imgInput('fphoto', true)}`,
    works: `<select id="fa" class="form-select mb-3" required><option value="">-- Автор --</option>${authorOpts}</select>
      <input id="f1" class="form-control mb-3" placeholder="Шығарма атауы" required>
      <textarea id="f2" class="form-control mb-3" rows="3" placeholder="Шығарманың тақырыбы"></textarea>
      <textarea id="fan" class="form-control mb-3" rows="3" placeholder="Қысқаша аңдатпасы"></textarea>
      <div class="row g-2"><div class="col-6"><input id="fgenre" class="form-control" placeholder="Жанры (Проза)"></div>
      <div class="col-6"><input id="fgt" class="form-control" placeholder="Жанрлық түрі (Әңгіме)"></div>
      <div class="col-6"><input id="fst" class="form-control" placeholder="Стилі (Көркем әдебиет)"></div>
      <div class="col-6"><input id="fch" class="form-control" placeholder="Хронотопы"></div></div>`,
    words: `<div class="row g-2 mb-3">
        <div class="col-md-6"><select id="fa" class="form-select" required><option value="">-- Автор --</option>${authorOpts}</select></div>
        <div class="col-md-6"><select id="fw" class="form-select" required><option value="">-- Алдымен автор --</option></select></div></div>
      <input id="f1" class="form-control mb-3" placeholder="Сөз немесе тіркес" required>
      <textarea id="f2" class="form-control mb-3" rows="3" placeholder="Мағынасы" required></textarea>
      <textarea id="fex" class="form-control mb-3" rows="2" placeholder="Мысал (мәтіннен дәйексөз) — міндетті емес"></textarea>
      <div class="row">${TYPES.map(t => `<div class="col-md-6"><label class="form-check mb-1"><input type="checkbox" class="form-check-input tcb" value="${t}"> <span class="form-check-label">${t}</span></label></div>`).join('')}</div>`,
    pictures: `<label class="form-label fw-bold">Сурет файлы (5 МБ-қа дейін)${row ? ' — ауыстыру үшін ғана таңдаңыз' : ''}</label>${imgInput('fphoto', !row)}
      <input id="f1" class="form-control" placeholder="Дұрыс жауап (мысалы: қобыз)" required>`,
    kmzh: `<input id="f1" class="form-control mb-3" placeholder="ҚМЖ тақырыбы" required>
      <label class="form-label fw-bold">Файл (PDF, DOC, DOCX, PPTX; 20 МБ-қа дейін)</label>
      <input type="file" id="ffile" class="form-control" accept=".pdf,.doc,.docx,.pptx" ${row ? '' : 'required'}>`,
    videos: `<input id="f1" class="form-control mb-3" placeholder="Бейнесабақ атауы" required>
      <input id="f2" type="url" class="form-control" placeholder="Сілтемесі (https://youtube.com/...)" required>`
  };
  $('mBody').innerHTML = F[k];
  const ph = $('fphoto');
  if (ph) ph.addEventListener('change', () => {
    const f = ph.files[0]; $('fphotoprev').classList.toggle('d-none', !f);
    if (f) $('fphotoprev').src = URL.createObjectURL(f);
  });
  if (k === 'words') $('fa').addEventListener('change', () => {
    const list = works.filter(w => w.author_name === $('fa').value);
    $('fw').innerHTML = '<option value="">-- Шығарма --</option>' + list.map(w => `<option value="${esc(w.title)}">${esc(w.title)}</option>`).join('');
  });
  if (row) {
    const set = (id, val) => { if ($(id)) $(id).value = val ?? ''; };
    const ensure = (id, val) => { const s = $(id); if (s && val && ![...s.options].some(o => o.value === val)) s.add(new Option(val, val)); set(id, val); };
    const prev = url => { if (url && $('fphotoprev')) { $('fphotoprev').src = url; $('fphotoprev').classList.remove('d-none'); } };
    if (k === 'authors') { set('f1', row.name); set('fg', row.gender); set('f2', row.info); set('fm', row.main_works); prev(row.photo_url); }
    if (k === 'works') { ensure('fa', row.author_name); set('f1', row.title); set('f2', row.topic); set('fan', row.annotation); set('fgenre', row.genre); set('fgt', row.genre_type); set('fst', row.style); set('fch', row.chronotope); }
    if (k === 'words') {
      ensure('fa', row.author); $('fa').dispatchEvent(new Event('change')); ensure('fw', row.work);
      set('f1', row.word); set('f2', row.meaning); set('fex', row.example);
      const ts = (row.word_type || '').split(',').map(t => t.trim());
      document.querySelectorAll('.tcb').forEach(c => c.checked = ts.includes(c.value));
    }
    if (k === 'pictures') { set('f1', row.correct_answer); prev(row.image_url); }
    if (k === 'kmzh') { set('f1', row.title); $('ffile').insertAdjacentHTML('afterend', `<div class="small text-muted mt-1">Қазіргі файл: ${esc(row.file_name || '')}. Жаңасын таңдасаңыз, файл ауысады.</div>`); }
    if (k === 'videos') { set('f1', row.title); set('f2', row.url); }
  }
  modal.show();
}

// ---------- Өзгерту (жаңарту) ----------
async function saveEdit(v) {
  const r = editRow;
  const optFile = (id, check) => { const f = $(id)?.files[0]; if (f) check(f); return f; };
  if (kind === 'authors') {
    const row = { name: v('f1'), info: v('f2'), gender: v('fg'), main_works: v('fm') };
    const f = optFile('fphoto', imgCheck); let old = null;
    if (f) { msg('Сурет жүктелуде...', 'text-primary'); row.photo_url = publicUrl('authors', await upload('authors', f)); old = pathFromUrl(r.photo_url, 'authors'); }
    const res = await sb.from('authors').update(row).eq('id', r.id);
    if (res.error) return res;
    if (old) await sb.storage.from('authors').remove([old]);
    if (row.name !== r.name) { // аты өзгерсе, байланысты шығармалар мен сөздер де жаңарады
      await sb.from('works').update({ author_name: row.name }).eq('author_name', r.name);
      await sb.from('words').update({ author: row.name }).eq('author', r.name);
    }
    return res;
  }
  if (kind === 'works') {
    const row = { title: v('f1'), author_name: v('fa'), topic: v('f2'), annotation: v('fan'), genre: v('fgenre'), genre_type: v('fgt'), style: v('fst'), chronotope: v('fch') };
    const res = await sb.from('works').update(row).eq('id', r.id);
    if (!res.error && (row.title !== r.title || row.author_name !== r.author_name))
      await sb.from('words').update({ work: row.title, author: row.author_name }).eq('work', r.title).eq('author', r.author_name);
    return res;
  }
  if (kind === 'words') {
    const types = [...document.querySelectorAll('.tcb:checked')].map(c => c.value);
    if (!types.length) throw new Error('Кемінде бір типті таңдаңыз!');
    return sb.from('words').update({ author: v('fa'), work: v('fw'), word: v('f1'), meaning: v('f2'), example: v('fex'), word_type: types.join(', ') }).eq('id', r.id);
  }
  if (kind === 'pictures') {
    const row = { correct_answer: v('f1') };
    const f = optFile('fphoto', imgCheck); let old = null;
    if (f) { msg('Жүктелуде...', 'text-primary'); row.image_url = publicUrl('pictures', await upload('pictures', f)); old = pathFromUrl(r.image_url, 'pictures'); }
    const res = await sb.from('pictures').update(row).eq('id', r.id);
    if (!res.error && old) await sb.storage.from('pictures').remove([old]);
    return res;
  }
  if (kind === 'kmzh') {
    const row = { title: v('f1') };
    const f = optFile('ffile', f => {
      if (!KMZH_EXT.includes(extOf(f))) throw new Error('Тек PDF, DOC, DOCX немесе PPTX!');
      if (f.size > 20 * 1024 * 1024) throw new Error('Файл 20 МБ-тан үлкен!');
    });
    if (f) { msg('Жүктелуде...', 'text-primary'); row.file_path = await upload('kmzh', f); row.file_name = f.name; }
    const res = await sb.from('kmzh').update(row).eq('id', r.id);
    if (!res.error && f) await sb.storage.from('kmzh').remove([r.file_path]);
    return res;
  }
  if (kind === 'videos') {
    if (!/^https?:\/\//i.test(v('f2'))) throw new Error('Сілтеме http:// немесе https:// деп басталуы керек!');
    return sb.from('videos').update({ title: v('f1'), url: v('f2') }).eq('id', r.id);
  }
}

$('modalForm').addEventListener('submit', async e => {
  e.preventDefault();
  const v = id => ($(id)?.value || '').trim();
  try {
    let res;
    if (editRow && kind !== 'authorphoto') {
      res = await saveEdit(v);
    } else if (kind === 'authors') {
      const row = { name: v('f1'), info: v('f2'), gender: v('fg'), main_works: v('fm') };
      const f = $('fphoto').files[0];
      if (f) { imgCheck(f); msg('Сурет жүктелуде...', 'text-primary'); row.photo_url = publicUrl('authors', await upload('authors', f)); }
      res = await sb.from('authors').insert([row]);
    } else if (kind === 'authorphoto') {
      const f = $('fphoto').files[0]; imgCheck(f); msg('Жүктелуде...', 'text-primary');
      res = await sb.from('authors').update({ photo_url: publicUrl('authors', await upload('authors', f)) }).eq('id', editId);
    } else if (kind === 'works') {
      res = await sb.from('works').insert([{ title: v('f1'), author_name: v('fa'), topic: v('f2'), annotation: v('fan'), genre: v('fgenre'), genre_type: v('fgt'), style: v('fst'), chronotope: v('fch') }]);
    } else if (kind === 'words') {
      const types = [...document.querySelectorAll('.tcb:checked')].map(c => c.value);
      if (!types.length) return msg('Кемінде бір типті таңдаңыз!', 'text-danger');
      res = await sb.from('words').insert([{ author: v('fa'), work: v('fw'), word: v('f1'), meaning: v('f2'), example: v('fex'), word_type: types.join(', ') }]);
    } else if (kind === 'pictures') {
      const f = $('fphoto').files[0]; imgCheck(f); msg('Жүктелуде...', 'text-primary');
      res = await sb.from('pictures').insert([{ image_url: publicUrl('pictures', await upload('pictures', f)), correct_answer: v('f1') }]);
    } else if (kind === 'kmzh') {
      const f = $('ffile').files[0];
      if (!KMZH_EXT.includes(extOf(f))) return msg('Тек PDF, DOC, DOCX немесе PPTX!', 'text-danger');
      if (f.size > 20 * 1024 * 1024) return msg('Файл 20 МБ-тан үлкен!', 'text-danger');
      msg('Жүктелуде...', 'text-primary');
      const path = await upload('kmzh', f);
      res = await sb.from('kmzh').insert([{ title: v('f1'), file_path: path, file_name: f.name }]);
      if (res.error) await sb.storage.from('kmzh').remove([path]);
    } else if (kind === 'videos') {
      if (!/^https?:\/\//i.test(v('f2'))) return msg('Сілтеме http:// немесе https:// деп басталуы керек!', 'text-danger');
      res = await sb.from('videos').insert([{ title: v('f1'), url: v('f2') }]);
    }
    if (res.error) return msg('❌ ' + errKK(res.error), 'text-danger');
  } catch (err) { return msg('❌ ' + errKK(err), 'text-danger'); }

  if (kind === 'words' && !editRow) {
    $('f1').value = ''; $('f2').value = ''; $('fex').value = '';
    document.querySelectorAll('.tcb').forEach(c => c.checked = false);
    msg('✅ Сақталды! Келесі сөзді жазыңыз.', 'text-success');
  } else modal.hide();
  show(view);
});

// "Кіру" бетінен админ логинімен келсе, қайта сұрамайды
let adminOk = false; try { adminOk = sessionStorage.getItem('adminAuth') === '1'; } catch (e) {}
if (adminOk) {
  $('loginSection').classList.add('d-none');
  $('adminSection').classList.remove('d-none');
  show('authors');
}
