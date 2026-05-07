/* ═══════════════════════════════════════════════════════════════
   utils.js  —  Formatting, badge helpers, misc utilities
═══════════════════════════════════════════════════════════════ */

function fmt(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMonth(m, y) {
  if (!m) return '—';
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[(m - 1) % 12]} ${y || ''}`;
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (m < 2)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function statusBadge(status) {
  const map = {
    active:'b-green', paid:'b-green', resolved:'b-green', disciplined:'b-green', closed:'b-green',
    pending:'b-yellow', open:'b-yellow', normal:'b-blue', important:'b-yellow',
    vacated:'b-red', overdue:'b-red', urgent:'b-red', mischief:'b-red',
    in_progress:'b-blue', partial:'b-blue', notice_period:'b-gold',
    maintenance:'b-purple', locked:'b-purple', moderate:'b-gray',
    boys:'b-blue', girls:'b-purple', 'co-ed':'b-gold',
    owner:'b-gold', manager:'b-blue',
    single:'b-gray', double:'b-blue', triple:'b-purple', dormitory:'b-red',
    electricity:'b-yellow', water:'b-blue', wifi:'b-purple', other:'b-gray',
    low:'b-gray', medium:'b-blue', high:'b-yellow',
    general:'b-blue', emergency:'b-red', rule:'b-yellow', event:'b-green',
  };
  const cls = map[status] || 'b-gray';
  const lbl = (status || '').replace(/_/g, ' ');
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function idBadge(verified) {
  return verified
    ? '<span class="id-tick yes">✓ Verified</span>'
    : '<span class="id-tick no">✗ Unverified</span>';
}

function typeIcon(type) {
  const m = { electricity:'⚡', water:'💧', wifi:'📶', maintenance:'🔧',
    plumbing:'🔩', electrical:'⚡', furniture:'🪑', cleaning:'🧹',
    security:'🔐', internet:'📶', other:'📋',
    id_proof:'🪪', agreement:'📄', receipt:'🧾', photo:'🖼️' };
  return m[type] || '📄';
}

function el(id) { return document.getElementById(id); }
function val(id) { return (el(id)?.value || '').trim(); }
function checked(id) { return el(id)?.checked || false; }
function setVal(id, v) { const e = el(id); if (e) e.value = v ?? ''; }
function setChecked(id, v) { const e = el(id); if (e) e.checked = !!v; }
function setText(id, v) { const e = el(id); if (e) e.textContent = v ?? '—'; }
function setHtml(id, v) { const e = el(id); if (e) e.innerHTML = v; }
function show(id) { el(id)?.classList.remove('hidden'); }
function hide(id) { el(id)?.classList.add('hidden'); }
function toggle(id, condition) { condition ? show(id) : hide(id); }

function spinner() {
  return '<div class="spin-wrap"><div class="spinner"></div></div>';
}
function emptyState(icon, title, text) {
  return `<div class="empty"><div class="empty-ico">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;
}