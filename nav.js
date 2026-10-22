(function () {
  const KEY = 'sb-jkvjtjjimqvppvogotiu-auth-token'; // Supabase сессиясы
  const logged = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

  function render() {
    const host = document.getElementById('nav');
    if (!host) return;
    const auth = logged();
    const current = location.pathname.split('/').pop() || 'index.html';
    const links = [['index.html', 'Сөз іздеу'], ['games.html', 'Ойындар']];
    if (auth) links.push(['kmzh.html', 'ҚМЖ']); // тек мұғалімге көрінеді
    links.push(['about.html', 'Жоба туралы']);
    host.innerHTML = `
    <nav class="navbar navbar-expand-lg site-nav sticky-top">
      <div class="container">
        <a class="brand" href="index.html">SözÖrnegi<span class="text-primary">.kz</span></a>
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" aria-label="Мәзір">
          <i class="bi bi-list fs-2" style="color:#1e3a8a"></i>
        </button>
        <div class="collapse navbar-collapse justify-content-end" id="navMenu">
          <ul class="navbar-nav align-items-lg-center">
            ${links.map(([href, t]) => `<li class="nav-item"><a class="nav-link ${href === current ? 'active' : ''}" href="${href}">${t}</a></li>`).join('')}
            <li class="nav-item ms-lg-2 mt-2 mt-lg-0"><a class="nav-login ${current === 'teacher.html' ? 'active' : ''}" href="teacher.html"><i class="bi ${auth ? 'bi-person-circle' : 'bi-box-arrow-in-right'} me-1"></i>${auth ? 'Кабинет' : 'Кіру'}</a></li>
          </ul>
        </div>
      </div>
    </nav>`;
  }
  window.renderNav = render;
  render();
})();
