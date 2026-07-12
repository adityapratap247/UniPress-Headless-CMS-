async function initLayout(pageTitle, activePage) {
  if (!requireAuth()) return;
  const user = await auth.loadUser();
  if (!user) return;
  const layout = document.getElementById('app-layout');
  if (!layout) return;

  layout.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <span class="logo">⚡</span>
        <div><div class="brand-name">UniPress</div><div class="brand-sub">Content Management</div></div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-group">
          <div class="nav-group-title">Overview</div>
          <button class="nav-item" data-page="dashboard" onclick="navigate('dashboard')"><span class="nav-icon">📊</span> Dashboard</button>
        </div>
        <div class="nav-group">
          <div class="nav-group-title">Content</div>
          <button class="nav-item" data-page="content-types" onclick="navigate('content-types')"><span class="nav-icon">🗂️</span> Content Types</button>
          <button class="nav-item" data-page="entries" onclick="navigate('entries')"><span class="nav-icon">📄</span> Entries</button>
          <button class="nav-item" data-page="media" onclick="navigate('media')"><span class="nav-icon">🖼️</span> Media Library</button>
        </div>
        ${['superadmin','admin'].includes(user.role) ? `
        <div class="nav-group">
          <div class="nav-group-title">Settings</div>
          <button class="nav-item" data-page="users" onclick="navigate('users')"><span class="nav-icon">👥</span> Users</button>
          <button class="nav-item" data-page="api-keys" onclick="navigate('api-keys')"><span class="nav-icon">🔑</span> API Keys</button>
        </div>` : ''}
      </nav>
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
          <div class="user-info" style="flex:1"><div class="user-name">${utils.escapeHtml(user.name)}</div><div class="user-role">${user.role}</div></div>
          <button class="logout-btn" onclick="auth.logout()" title="Logout">⏻</button>
        </div>
      </div>
    </aside>
    <div class="main-content">
      <div class="topbar">
        <div class="flex items-center gap-2">
          <button class="btn btn-icon btn-secondary" id="sidebar-toggle" style="display:none">☰</button>
          <h1 class="topbar-title" id="page-title">${pageTitle}</h1>
        </div>
        <div class="topbar-actions" id="topbar-actions"></div>
      </div>
      <div class="page-content" id="page-content"></div>
    </div>
    <div id="toast-container"></div>
  `;

  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === activePage));

  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 768) {
    toggle.style.display = 'flex';
    toggle.onclick = () => sidebar.classList.toggle('open');
    document.addEventListener('click', (e) => { if (!sidebar.contains(e.target) && !toggle.contains(e.target)) sidebar.classList.remove('open'); });
  }

  toast.init();
  return user;
}

function navigate(page) { window.location.href = `/pages/${page}.html`; }
