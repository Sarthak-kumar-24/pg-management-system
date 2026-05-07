/* ═══════════════════════════════════════════════════════════════
   vacate.js
═══════════════════════════════════════════════════════════════ */
const Vacate = {
  selectedTenant: null,

  async load() {
    // Set today as default vacating date
    const today = new Date().toISOString().split('T')[0];
    setVal('vacateDate', today);
    setHtml('vacateTenantCard', '');
    setHtml('vacateResult', '');
    this.selectedTenant = null;

    // Fill tenant dropdown (active only)
    const tenants = await Api.tenants.list({ status: 'active' }).catch(() => []);
    Store.tenants = tenants || [];
    const sel = el('vacateTenantSel');
    if (sel) {
      sel.innerHTML = `<option value="">Select active tenant…</option>` +
        (tenants || []).map(t =>
          `<option value="${t._id}">${t.name} — ${t.building?.name || ''} Rm ${t.room?.roomNumber || '—'}`
        ).join('');
    }

    // Load notice period & recently vacated lists
    this.loadNoticePeriod();
    this.loadRecentVacated();
  },

  async onTenantChange() {
    const id = val('vacateTenantSel');
    if (!id) { setHtml('vacateTenantCard', ''); this.selectedTenant = null; return; }
    try {
      const t = await Api.tenants.get(id);
      this.selectedTenant = t;

      // Calculate dues
      const now   = new Date();
      const month = now.getMonth() + 1;
      const year  = now.getFullYear();
      let dues = 0;
      try {
        const pending = await Api.payments.list({ tenant: id, status: 'pending' });
        dues = (pending || []).filter(p => p.type === 'rent').reduce((s, p) => s + p.amount, 0);
      } catch {}

      setHtml('vacateTenantCard', `
        <div class="card" style="background:var(--s2);margin-bottom:14px">
          <div class="flex items-c gap-3 mb-3">
            <div class="t-av">${initials(t.name)}</div>
            <div>
              <div class="fw-7 font-s" style="font-size:18px">${t.name}</div>
              <div class="tx-xs c-muted">${t.phone} • ${t.email || '—'}</div>
            </div>
            ${statusBadge(t.status)}
          </div>
          <div class="div"></div>
          <div class="fr">
            <div><div class="fl">Building</div><div class="fw-6">${t.building?.name || '—'}</div></div>
            <div><div class="fl">Room / Bed</div><div class="fw-6">Rm ${t.room?.roomNumber || '—'} / Bed ${t.bedNumber || '—'}</div></div>
            <div><div class="fl">Monthly Rent</div><div class="fw-6 c-gold">${fmt(t.monthlyRent)}</div></div>
            <div><div class="fl">Deposit</div><div class="fw-6">${fmt(t.depositAmount)} ${t.depositPaid ? '(Paid)' : '(Unpaid)'}</div></div>
            <div><div class="fl">Joined</div><div class="fw-6">${fmtDate(t.joiningDate)}</div></div>
            <div><div class="fl">Pending Dues</div><div class="fw-6 c-red">${fmt(dues)}</div></div>
          </div>
          ${dues > 0 ? `<div class="alert al-warn mt-3">⚠️ Tenant has ${fmt(dues)} in pending rent dues. Ensure dues are cleared before vacating.</div>` : ''}
        </div>`);

      // Pre-fill refund amount with deposit
      setVal('vacateRefund', t.depositAmount || 0);
    } catch (err) { toast(err.message, 'err'); }
  },

  async process() {
    const id   = val('vacateTenantSel');
    const date = val('vacateDate');
    const notes  = val('vacateNotes');
    const refund = +val('vacateRefund') || 0;
    const refundDeposit = el('vacateRefundDeposit')?.checked || false;

    if (!id)   return toast('Please select a tenant', 'warn');
    if (!date) return toast('Please enter vacating date', 'warn');

    // Checklist — warn if incomplete
    const checks = ['chkKeys','chkMattress','chkBills','chkDues','chkDeposit'];
    const unchecked = checks.filter(c => !el(c)?.checked).length;
    if (unchecked > 0) {
      const proceed = await confirmAction(
        `${unchecked} checklist item(s) are not marked. Proceed anyway?`, 'Yes, Proceed', true
      );
      if (!proceed) return;
    }

    const ok = await confirmAction(
      `Vacate ${this.selectedTenant?.name}? This will free their bed and mark them as vacated.`,
      'Confirm Vacate', true
    );
    if (!ok) return;

    try {
      setBusy('vacateBtn', true, 'Process Vacate');
      await Api.tenants.vacate(id, {
        vacatingDate:    date,
        notes,
        depositRefunded: refundDeposit && refund > 0,
      });

      const name = this.selectedTenant?.name || 'Tenant';
      setHtml('vacateResult', `
        <div class="alert al-ok">
          ✅ <strong>${name}</strong> has been successfully vacated.
          Bed freed • Room updated • All records synced.
          ${refundDeposit && refund > 0 ? `<br>Deposit refund of ${fmt(refund)} recorded.` : ''}
        </div>`);

      toast(`${name} vacated successfully`, 'ok');
      Store.invalidate();
      // Reset form
      el('vacateForm')?.reset();
      setHtml('vacateTenantCard', '');
      this.selectedTenant = null;
      // Reload lists
      this.loadNoticePeriod();
      this.loadRecentVacated();
      // Refill dropdown
      this.load();
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('vacateBtn', false, 'Process Vacate'); }
  },

  async loadNoticePeriod() {
    try {
      const list = await Api.tenants.list({ status: 'notice_period' });
      const el2 = el('noticePeriodList');
      if (!el2) return;
      if (!list?.length) { el2.innerHTML = '<div class="tx-sm c-dim" style="padding:12px 0">No tenants in notice period</div>'; return; }
      el2.innerHTML = list.map(t => `
        <div class="flex items-c just-b" style="padding:10px 0;border-bottom:1px solid var(--b1)">
          <div>
            <div class="fw-6 tx-sm">${t.name}</div>
            <div class="tx-xs c-muted">${t.building?.name || ''} • Rm ${t.room?.roomNumber || '—'}</div>
          </div>
          <div class="flex gap-2 items-c">
            ${statusBadge('notice_period')}
            <button class="btn btn-xs btn-danger" onclick="Vacate.quickVacate('${t._id}','${t.name}')">Vacate Now</button>
          </div>
        </div>`).join('');
    } catch {}
  },

  async loadRecentVacated() {
    try {
      const list = await Api.tenants.list({ status: 'vacated' });
      const el2 = el('recentVacatedList');
      if (!el2) return;
      const recent = (list || []).slice(0, 5);
      if (!recent.length) { el2.innerHTML = '<div class="tx-sm c-dim" style="padding:12px 0">No recently vacated tenants</div>'; return; }
      el2.innerHTML = recent.map(t => `
        <div class="flex items-c just-b" style="padding:10px 0;border-bottom:1px solid var(--b1)">
          <div>
            <div class="fw-6 tx-sm">${t.name}</div>
            <div class="tx-xs c-muted">${t.building?.name || ''} • Vacated ${fmtDate(t.vacatingDate)}</div>
          </div>
          ${statusBadge('vacated')}
        </div>`).join('');
    } catch {}
  },

  async quickVacate(id, name) {
    const ok = await confirmAction(`Immediately vacate "${name}"?`, 'Vacate', true);
    if (!ok) return;
    try {
      await Api.tenants.vacate(id, { vacatingDate: new Date(), notes: 'Quick vacate' });
      toast(`${name} vacated`, 'ok');
      Store.invalidate();
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  },
};