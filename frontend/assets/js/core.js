const API_BASE = 'https://unipress-headless-cms.onrender.com';

const api = {
  getToken() { return localStorage.getItem('cms_token'); },
  getRefreshToken() { return localStorage.getItem('cms_refresh_token'); },

  async request(method, path, body = null, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const config = { method, headers };
    if (body && !(body instanceof FormData)) { config.body = JSON.stringify(body); }
    else if (body instanceof FormData) { delete headers['Content-Type']; config.body = body; }
    let res = await fetch(`${API_BASE}${path}`, config);
    if (res.status === 401 && !opts.noRefresh) {
      const refreshed = await this.refresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.getToken()}`;
        config.headers = headers;
        res = await fetch(`${API_BASE}${path}`, config);
      } else { auth.logout(); return null; }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, message: data.message || 'Request failed', errors: data.errors };
    return data;
  },

  async refresh() {
    const rt = this.getRefreshToken();
    if (!rt) return false;
    try {
      const data = await this.request('POST', '/auth/refresh', { refreshToken: rt }, { noRefresh: true });
      if (data?.data?.token) {
        localStorage.setItem('cms_token', data.data.token);
        localStorage.setItem('cms_refresh_token', data.data.refreshToken);
        return true;
      }
    } catch {}
    return false;
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  patch: (path, body) => api.request('PATCH', path, body),
  delete: (path) => api.request('DELETE', path),
  upload: (path, formData) => api.request('POST', path, formData),
};

const auth = {
  user: null,
  isLoggedIn() { return !!localStorage.getItem('cms_token'); },
  async loadUser() {
    if (!this.isLoggedIn()) return null;
    try {
      const data = await api.get('/auth/me');
      this.user = data.data.user;
      return this.user;
    } catch { this.logout(); return null; }
  },
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('cms_token', data.data.token);
    localStorage.setItem('cms_refresh_token', data.data.refreshToken);
    this.user = data.data.user;
    return data.data;
  },
  logout() {
    try { api.post('/auth/logout', { refreshToken: this.getRefreshToken() }); } catch {}
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_refresh_token');
    this.user = null;
    window.location.href = '/pages/login.html';
  },
};

const toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) { this.container = document.createElement('div'); this.container.id = 'toast-container'; document.body.appendChild(this.container); }
  },
  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },
  success: (msg) => toast.show(msg, 'success'),
  error: (msg) => toast.show(msg, 'error', 4500),
  warning: (msg) => toast.show(msg, 'warning'),
  info: (msg) => toast.show(msg, 'info'),
};

const modal = {
  open(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); },
  close(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); },
  closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); },
};

document.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) modal.closeAll(); });

const utils = {
  formatDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  formatSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB'], i = Math.floor(Math.log(bytes)/Math.log(k));
    return `${(bytes/Math.pow(k,i)).toFixed(1)} ${sizes[i]}`;
  },
  slugify(str) { return str.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); },
  debounce(fn, delay = 300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; },
  escapeHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  confirm(message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay open';
      overlay.innerHTML = `<div class="modal" style="max-width:400px"><div class="modal-header"><h3 class="modal-title">Confirm Action</h3></div><div class="modal-body"><p style="color:var(--text2);padding-bottom:4px">${message}</p></div><div class="modal-footer"><button class="btn btn-secondary" id="confirm-cancel">Cancel</button><button class="btn btn-danger" id="confirm-ok">Confirm</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
      overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
  },
  getStatusBadge(status) {
    const map = { published: 'success', draft: 'warning', archived: 'neutral' };
    return `<span class="badge badge-${map[status]||'neutral'}">${status}</span>`;
  },
  roleColor(role) { return { superadmin:'danger', admin:'info', editor:'success', viewer:'neutral' }[role]||'neutral'; },
};

function requireAuth() {
  if (!auth.isLoggedIn()) { window.location.href = '/pages/login.html'; return false; }
  return true;
}

document.addEventListener('DOMContentLoaded', () => toast.init());
