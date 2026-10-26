(function () {
  const KEY = 'sb-jkvjtjjimqvppvogotiu-auth-token'; // Supabase сессиясы
  const logged = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

  // ---------- Түнгі режим ----------
  const root = document.documentElement;
  const isDark = () => root.getAttribute('data-bs-theme') === 'dark';
  const setTheme = dark => {
    dark ? root.setAttribute('data-bs-theme', 'dark') : root.removeAttribute('data-bs-theme');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  };
  try { if (localStorage.getItem('theme') === 'dark') root.setAttribute('data-bs-theme', 'dark'); } catch (e) {}
  const themeIcon = () => 'bi ' + (isDark() ? 'bi-sun-fill' : 'bi-moon-stars-fill');
  const themeBtn = () => `<button type="button" class="theme-toggle" data-theme-toggle aria-label="Түнгі / күндізгі режим" title="Түнгі / күндізгі режим"><i class="${themeIcon()}"></i></button>`;
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-theme-toggle]')) return;
    setTheme(!isDark());
    document.querySelectorAll('.theme-toggle i').forEach(i => { i.className = themeIcon(); });
  });

  // ---------- Навигация ----------
  function render() {
    const host = document.getElementById('nav');
    if (!host) return;
    const auth = logged();
    const current = location.pathname.split('/').pop() || 'index.html';
    const links = [['index.html', 'Сөз іздеу'], ['games.html', 'Ойындар'], ['videos.html', 'Бейнесабақтар']];
    if (auth) links.push(['kmzh.html', 'ҚМЖ']); // тек мұғалімге көрінеді
    links.push(['about.html', 'Жоба туралы']);
    const tabs = [['index.html', 'bi-search', 'Іздеу'], ['games.html', 'bi-controller', 'Ойындар'], ['videos.html', 'bi-play-circle-fill', 'Бейне']];
    if (auth) tabs.push(['kmzh.html', 'bi-journal-text', 'ҚМЖ']);
    tabs.push(['about.html', 'bi-info-circle-fill', 'Жоба']);
    tabs.push(['teacher.html', auth ? 'bi-person-circle' : 'bi-box-arrow-in-right', auth ? 'Кабинет' : 'Кіру']);
    host.innerHTML = `
    <nav class="navbar navbar-expand-lg site-nav sticky-top">
      <div class="container">
        <a class="brand" href="index.html">SözÖrnegi<span class="text-primary">.kz</span></a>
        <div class="ms-auto d-lg-none">${themeBtn()}</div>
        <button class="navbar-toggler border-0 d-none" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-label="Мәзір">
          <i class="bi bi-list fs-2" style="color:#1e3a8a"></i>
        </button>
        <div class="collapse navbar-collapse justify-content-end" id="navMenu">
          <ul class="navbar-nav align-items-lg-center">
            ${links.map(([href, t]) => `<li class="nav-item"><a class="nav-link ${href === current ? 'active' : ''}" href="${href}">${t}</a></li>`).join('')}
            <li class="nav-item ms-lg-2 d-none d-lg-block">${themeBtn()}</li>
            <li class="nav-item ms-lg-2 mt-2 mt-lg-0"><a class="nav-login ${current === 'teacher.html' ? 'active' : ''}" href="teacher.html"><i class="bi ${auth ? 'bi-person-circle' : 'bi-box-arrow-in-right'} me-1"></i>${auth ? 'Кабинет' : 'Кіру'}</a></li>
          </ul>
        </div>
      </div>
    </nav>
    <nav class="bottom-nav d-lg-none" aria-label="Негізгі мәзір">
      ${tabs.map(([href, ic, t]) => `<a class="bn-item ${href === current ? 'active' : ''}" href="${href}"><i class="bi ${ic}"></i><span>${t}</span></a>`).join('')}
    </nav>`;
  }

  // ---------- Футер ----------
  function renderFooter() {
    if (document.getElementById('siteFooter')) return;
    const f = document.createElement('footer');
    f.id = 'siteFooter';
    f.className = 'site-footer';
    f.innerHTML = `
      <div class="container">
        <div class="row g-4">
          <div class="col-12 col-md-5 f-col-brand">
            <a class="f-brand" href="index.html">SözÖrnegi.kz</a>
            <p class="mt-2 mb-0">Қазақ прозасының стилистикалық цифрлық платформасы: көркем сөздер, бейнелеуіш құралдар және оқытуға арналған ресурстар.</p>
          </div>
          <div class="col-12 col-md-3">
            <h6>Бөлімдер</h6>
            <ul class="f-links">
              <li><a href="index.html">Сөз іздеу</a></li>
              <li><a href="games.html">Ойындар</a></li>
              <li><a href="videos.html">Бейнесабақтар</a></li>
              <li><a href="teacher.html">Мұғалімдерге</a></li>
              <li><a href="about.html">Жоба туралы</a></li>
            </ul>
          </div>
          <div class="col-12 col-md-4">
            <h6>Жоба авторы</h6>
            <p class="mb-1 f-author">Орынбасар Тұрсынай Орынбасарқызы</p>
            <p class="mb-0">Қорқыт Ата атындағы Қызылорда университетінің докторанты</p>
          </div>
        </div>
        <div class="f-bottom">© ${new Date().getFullYear()} SözÖrnegi.kz. Барлық құқықтар қорғалған.</div>
      </div>`;
    document.body.appendChild(f);
  }

  window.renderNav = render;
  render();
  renderFooter();
})();
