import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const sb = createClient(
  'https://jkvjtjjimqvppvogotiu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprdmp0amppbXF2cHB2b2dvdGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODYzNzAsImV4cCI6MjEwODI2MjM3MH0.Zk-CdKAilLWVjwW8RmvmqRBfOFv9MyrJQxDGDud0qbs'
);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES = ['Эпитет','Метафора','Теңеу','Тұрақты тіркес','Авторлық сөзқолданыс','Мақал-мәтел','Көне сөздер','Діни сөз','Кірме сөздер','Этномәдени атаулар'];

const VIEWS = {
  authors: { title: 'АВТОРЛАР', btn: 'Автор енгізу', h1: 'Аты-жөні:', h2: 'Автор туралы', table: 'authors' },
  works:   { title: 'ШЫҒАРМАЛАР', btn: 'Шығарма енгізу', h1: 'Шығарма атауы:', h2: 'Автор / Шығарма туралы', table: 'works' },
  pictures:{ title: 'СУРЕТТЕР', btn: 'Сурет енгізу', h1: 'Сурет:', h2: 'Дұрыс жауап', table: 'pictures' },
  words:   { title: 'СӨЗДЕР', btn: 'Сөз енгізу', h1: 'Сөз:', h2: 'Мағынасы / Автор / Шығарма', table: 'words' }
};

let view = 'authors';
let kind = 'authors';
let authors = [], works = [];
const modal = new bootstrap.Modal($('formModal'));

// ---------- Кіру ----------
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  if ($('username').value === 'orda' && $('password').value === 'orda2026') {
    $('loginSection').classList.add('d-none');
    $('adminSection').classList.remove('d-none');
    show('authors');
  } else $('loginError').classList.remove('d-none');
});

// ---------- Мәзір ----------
document.querySelectorAll('.nav-s a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  show(a.dataset.view);
}));
$('btnAdd').addEventListener('click', () => openForm(view));
$('btnNewWord').addEventListener('click', () => openForm('words'));

async function show(v) {
  view = v;
  const cfg = VIEWS[v];
  document.querySelectorAll('.nav-s a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
  $('pageTitle').textContent = cfg.title;
  $('btnAdd').textContent = cfg.btn;
  $('h1').textContent = cfg.h1;
  $('h2').textContent = cfg.h2;
  $('rows').innerHTML = '<div class="p-4 text-muted">Жүктелуде...</div>';

  const { data, error } = await sb.from(cfg.table).select('*');
  if (error) { $('rows').innerHTML = `<div class="p-4 text-danger">Қате: ${esc(error.message)}</div>`; return; }
  if (!data.length) { $('rows').innerHTML = '<div class="p-4 text-muted">Әзірге бос.</div>'; return; }

  $('rows').innerHTML = data.map(r => {
    let c1, c2;
    if (v === 'authors') { c1 = r.name; c2 = r.info; }
    else if (v === 'works') { c1 = r.title; c2 = `Автор: ${r.author_name}\n${r.info || ''}`; }
    else if (v === 'pictures') { c1 = `<img class="thumb" src="${esc(r.image_url)}" alt="">`; c2 = r.correct_answer; }
    else { c1 = r.word; c2 = `${r.meaning}\nАвтор: ${r.author} | Шығарма: ${r.work}\nТипі: ${r.word_type}`; }
    return `<div class="tr-row"><div class="c1">${v === 'pictures' ? c1 : esc(c1)}</div>
      <div class="c2">${esc(c2)}<br><button class="del" data-id="${r.id}" data-url="${esc(r.image_url || '')}">Өшіру</button></div></div>`;
  }).join('');

  document.querySelectorAll('.del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Өшіруді растайсыз ба?')) return;
    if (view === 'pictures' && b.dataset.url.includes('/pictures/')) {
      await sb.storage.from('pictures').remove([decodeURIComponent(b.dataset.url.split('/pictures/').pop())]);
    }
    const { error } = await sb.from(cfg.table).delete().eq('id', b.dataset.id);
    if (error) alert('Қате: ' + error.message); else show(view);
  }));
}

// ---------- Форма ----------
async function openForm(k) {
  kind = k;
  $('mMsg').textContent = '';
  $('mTitle').textContent = VIEWS[k].btn;
  if (k !== 'authors') {
    const [a, w] = await Promise.all([sb.from('authors').select('name'), sb.from('works').select('title, author_name')]);
    authors = a.data || []; works = w.data || [];
  }
  const authorOpts = authors.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join('');
  let html = '';
  if (k === 'authors') {
    html = `<input id="f1" class="form-control mb-3" placeholder="Аты-жөні" required>
            <textarea id="f2" class="form-control" rows="6" placeholder="Автор туралы..."></textarea>`;
  } else if (k === 'pictures') {
    html = `<label class="form-label fw-bold">Сурет файлы (JPG, PNG, WebP; 5 МБ-қа дейін)</label>
            <input type="file" id="pf" class="form-control mb-3" accept="image/*" required>
            <img id="pprev" class="thumb mb-3 d-none" alt="">
            <input id="pans" class="form-control" placeholder="Дұрыс жауап (мысалы: қобыз)" required>`;
  } else if (k === 'works') {
    html = `<select id="fa" class="form-select mb-3" required><option value="">-- Автор --</option>${authorOpts}</select>
            <input id="f1" class="form-control mb-3" placeholder="Шығарма атауы" required>
            <textarea id="f2" class="form-control" rows="5" placeholder="Шығарма туралы..."></textarea>`;
  } else {
    html = `<div class="row g-2 mb-3">
              <div class="col-md-6"><select id="fa" class="form-select" required><option value="">-- Автор --</option>${authorOpts}</select></div>
              <div class="col-md-6"><select id="fw" class="form-select" required><option value="">-- Алдымен автор --</option></select></div>
            </div>
            <input id="f1" class="form-control mb-3" placeholder="Сөз немесе тіркес" required>
            <textarea id="f2" class="form-control mb-3" rows="3" placeholder="Мағынасы" required></textarea>
            <div class="row">${TYPES.map((t, i) => `<div class="col-md-6"><label class="form-check mb-1"><input type="checkbox" class="form-check-input tcb" value="${t}"> <span class="form-check-label">${t}</span></label></div>`).join('')}</div>`;
  }
  $('mBody').innerHTML = html;
  if (k === 'pictures') $('pf').addEventListener('change', () => {
    const f = $('pf').files[0];
    $('pprev').classList.toggle('d-none', !f);
    if (f) $('pprev').src = URL.createObjectURL(f);
  });
  if (k === 'words') $('fa').addEventListener('change', () => {
    const list = works.filter(w => w.author_name === $('fa').value);
    $('fw').innerHTML = '<option value="">-- Шығарма --</option>' +
      list.map(w => `<option value="${esc(w.title)}">${esc(w.title)}</option>`).join('');
  });
  modal.show();
}

$('modalForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (kind === 'pictures') return uploadPicture();
  const v1 = $('f1').value.trim(), v2 = $('f2').value.trim();
  let res;
  if (kind === 'authors') {
    res = await sb.from('authors').insert([{ name: v1, info: v2 }]);
  } else if (kind === 'works') {
    res = await sb.from('works').insert([{ title: v1, author_name: $('fa').value, info: v2 }]);
  } else {
    const types = [...document.querySelectorAll('.tcb:checked')].map(c => c.value);
    if (!types.length) { $('mMsg').className = 'me-auto fw-bold text-danger'; $('mMsg').textContent = 'Кемінде бір типті таңдаңыз!'; return; }
    res = await sb.from('words').insert([{ author: $('fa').value, work: $('fw').value, word: v1, meaning: v2, word_type: types.join(', ') }]);
  }
  if (res.error) {
    $('mMsg').className = 'me-auto fw-bold text-danger';
    $('mMsg').textContent = '❌ ' + res.error.message;
    return;
  }
  if (kind === 'words') {
    // тағы сөз қосуға ыңғайлы: автор/шығарма қалады, сөз өрістері тазаланады
    $('f1').value = ''; $('f2').value = '';
    document.querySelectorAll('.tcb').forEach(c => c.checked = false);
    $('mMsg').className = 'me-auto fw-bold text-success';
    $('mMsg').textContent = '✅ Сақталды! Келесі сөзді жазыңыз.';
  } else modal.hide();
  show(view);
});

async function uploadPicture() {
  const msg = (t, cls) => { $('mMsg').className = 'me-auto fw-bold ' + cls; $('mMsg').textContent = t; };
  const file = $('pf').files[0], answer = $('pans').value.trim();
  if (!file || !answer) return msg('Сурет пен жауапты толтырыңыз!', 'text-danger');
  if (!file.type.startsWith('image/')) return msg('Тек сурет файлын таңдаңыз!', 'text-danger');
  if (file.size > 5 * 1024 * 1024) return msg('Сурет 5 МБ-тан үлкен!', 'text-danger');
  msg('Жүктелуде...', 'text-primary');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await sb.storage.from('pictures').upload(path, file, { contentType: file.type });
  if (up.error) return msg('❌ Жүктеу қатесі: ' + up.error.message, 'text-danger');
  const url = sb.storage.from('pictures').getPublicUrl(path).data.publicUrl;
  const ins = await sb.from('pictures').insert([{ image_url: url, correct_answer: answer }]);
  if (ins.error) {
    await sb.storage.from('pictures').remove([path]);
    return msg('❌ ' + ins.error.message, 'text-danger');
  }
  modal.hide();
  show('pictures');
}