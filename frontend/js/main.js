/* ═══════════════════════════════════════════════════════════════
   main.js  —  App boot, auth guard, sidebar init
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // ── Auth guard ───────────────────────────────────────────────
  const token = Auth.getToken();
  const user  = Auth.getUser();
  if (!token || !user) { window.location.href = '/login.html'; return; }

  initTheme();

  const savedPgName = localStorage.getItem("custom_pg_name");
  if (savedPgName) {
    const titleEl = document.getElementById("logoTitle");
    const subEl = document.getElementById("logoSub");
    if (titleEl) titleEl.textContent = savedPgName;
    if (subEl) subEl.style.display = "none"; // Hide "Management" if custom name is used
  }

  // ── Populate sidebar user info ───────────────────────────────
  setText('sbUserName', user.name || 'User');
  setText('sbUserRole', user.role || 'manager');
  const av = el('sbUserAv');
  if (av) av.textContent = initials(user.name);

  // ── Header title default ──────────────────────────────────────
  setText('hdrTitle', 'Dashboard');

  // ── Role-based UI: hide owner-only items for managers ────────
  if (user.role !== 'owner') {
    document.querySelectorAll('.owner-only').forEach(e => e.classList.add('hidden'));
  }

  // ── Set default year values in filters ───────────────────────
  const yr = new Date().getFullYear().toString();
  document.querySelectorAll('.cur-year').forEach(e => { if (e.tagName === 'SELECT') e.value = yr; else e.textContent = yr; });

  // ── Initial data: fill all building selects ──────────────────
  Store.loadBuildings().then(() => {
    Store.fillBuildings('.sel-building');
    Store.fillBuildingsRequired('.sel-building-req');
  });

  // ── Navigate to dashboard on load ───────────────────────────
  Nav.go('dashboard');

  // ── Hamburger ────────────────────────────────────────────────
  el('hamburger')?.addEventListener('click', () => Nav.toggleSidebar());
  el('sbOverlay')?.addEventListener('click', () => Nav.closeSidebar());

  // ── Keyboard shortcuts ───────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // close any open modal
      document.querySelectorAll('.mo.open').forEach(m => {
        m.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  });

  // ── Refresh auth token on 401s (handled in api.js already) ──
});
