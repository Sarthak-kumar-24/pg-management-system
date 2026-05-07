/* ═══════════════════════════════════════════════════════════════
   ui.js  —  Modal, toast, confirm, tabs
═══════════════════════════════════════════════════════════════ */

/* ── Modals ─────────────────────────────────────────────────── */
function openModal(id) {
  const mo = document.getElementById(id);
  if (!mo) return;
  mo.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const mo = document.getElementById(id);
  if (!mo) return;
  mo.classList.remove('open');
  document.body.style.overflow = '';
}

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('mo')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ── Toast ──────────────────────────────────────────────────── */
function toast(msg, type = 'info', ms = 3500) {
  let wrap = document.getElementById('toastWrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const icons = { ok:'✓', err:'✕', warn:'⚠', info:'ℹ' };
  const div = document.createElement('div');
  div.className = `toast t-${type}`;
  div.innerHTML = `<span class="t-ico">${icons[type] || 'ℹ'}</span><span class="t-msg">${msg}</span><button class="t-x" onclick="this.parentElement.remove()">✕</button>`;
  wrap.appendChild(div);
  setTimeout(() => { div.style.opacity = '0'; div.style.transform = 'translateX(110%)'; div.style.transition = '.3s'; setTimeout(() => div.remove(), 300); }, ms);
}

/* ── Confirm ────────────────────────────────────────────────── */
function confirmAction(msg = 'Are you sure?', confirmLabel = 'Confirm', danger = false) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'mo open';
    ov.innerHTML = `
      <div class="mo-box mo-sm">
        <div class="mo-hdr"><span class="mo-title">Confirm</span></div>
        <div class="mo-body"><p style="color:var(--tx2);font-size:14px">${msg}</p></div>
        <div class="mo-foot">
          <button class="btn btn-sec" id="_cancelBtn">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="_confirmBtn">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#_cancelBtn').onclick  = () => { ov.remove(); resolve(false); };
    ov.querySelector('#_confirmBtn').onclick = () => { ov.remove(); resolve(true);  };
    ov.onclick = e => { if (e.target === ov) { ov.remove(); resolve(false); } };
  });
}

/* ── Tabs ───────────────────────────────────────────────────── */
function switchTab(group, paneId, btn) {
  document.querySelectorAll(`[data-tabgroup="${group}"]`).forEach(p => p.classList.remove('active'));
  document.getElementById(paneId)?.classList.add('active');
  if (btn) {
    btn.closest('.tabs')?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

/* ── Busy button ────────────────────────────────────────────── */
function setBusy(btnId, busy, label = '') {
  const b = document.getElementById(btnId);
  if (!b) return;
  b.disabled = busy;
  if (label) b.textContent = busy ? '…' : label;
}