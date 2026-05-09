/* ═══════════════════════════════════════════════════════════════
   nav.js  —  Navigation, auth state, sidebar
═══════════════════════════════════════════════════════════════ */

const Auth = {
  getToken()  { return localStorage.getItem('pg_token'); },
  getUser()   { try { return JSON.parse(localStorage.getItem('pg_user')); } catch { return null; } },
  setSession(token, user) {
    localStorage.setItem('pg_token', token);
    localStorage.setItem('pg_user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('pg_token');
    localStorage.removeItem('pg_user');
    window.location.href = '/login.html';
  },
  isOwner() { return this.getUser()?.role === 'owner'; },
};

const Nav = {
  current: 'dashboard',
  pages: {
    dashboard: { title: 'Dashboard',         load: () => Dashboard.load() },
    buildings: { title: 'Buildings',          load: () => Buildings.load() },
    rooms:     { title: 'Rooms & Beds',       load: () => Rooms.load() },
    qrs:       { title: 'Room QRs',           load: () => Qrs.load() },
    tenants:   { title: 'All Tenants',        load: () => Tenants.load() },
    vacate:    { title: 'Vacate Management',  load: () => Vacate.load() },
    payments:  { title: 'Payments',           load: () => Payments.load() },
    bills:     { title: 'Bills & Expenses',   load: () => Bills.load() },
    notices:   { title: 'Notices',            load: () => Notices.load() },
    complaints:{ title: 'Complaints',         load: () => Complaints.load() },
    reports:   { title: 'Reports',            load: () => Reports.load() },
    documents: { title: 'Documents',          load: () => Documents.load() },
    users:     { title: 'Users & Roles',      load: () => Users.load() },
    settings:  { title: 'Settings',           load: () => Settings.load() },
  },

  go(page) {
    if (!this.pages[page]) return;
    // hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-item').forEach(n => n.classList.remove('active'));
    // show target
    document.getElementById('page-' + page)?.classList.add('active');
    document.querySelector(`.sb-item[data-page="${page}"]`)?.classList.add('active');
    // update header
    setText('hdrTitle', this.pages[page].title);
    // load data
    this.current = page;
    this.pages[page].load();
    // close sidebar on mobile
    this.closeSidebar();
  },

  refresh() { if (this.pages[this.current]) this.pages[this.current].load(); },

  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sbOverlay')?.classList.toggle('open');
  },
  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sbOverlay')?.classList.remove('open');
  },
};
