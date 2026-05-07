/* ═══════════════════════════════════════════════════════════════
   dashboard.js  —  Dashboard page
═══════════════════════════════════════════════════════════════ */
const Dashboard = {
  async load() {
    setHtml('page-dashboard-body', spinner());
    try {
      const [stats, income, occupancy] = await Promise.all([
        Api.reports.dashboard(),
        Api.reports.income({ year: new Date().getFullYear() }),
        Api.reports.occupancy(),
      ]);
      this.render(stats, income, occupancy);
    } catch (err) { toast(err.message, 'err'); }
  },

  render(stats, income, occupancy) {
    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
    const user = Auth.getUser();

    // Greeting
    setText('dashGreeting', `${greeting}, ${user?.name?.split(' ')[0] || 'Owner'}! Here's your PG overview.`);

    // Stat cards
    setText('dashActiveTenants', stats.activeTenants ?? '—');
    setText('dashTotalTenantsLabel', `of ${stats.totalTenants} total`);
    setText('dashBuildings', stats.buildingCount ?? '—');
    setText('dashRooms', `${stats.totalRooms ?? '—'} rooms total`);
    setText('dashOccupied', stats.occupiedBeds ?? '—');
    setText('dashVacantBeds', `${stats.vacantBeds ?? '—'} vacant`);
    setText('dashIncome', fmt(stats.totalIncome));
    setText('dashMonthLabel', fmtMonth(stats.month, stats.year));
    setText('dashPendingDues', fmt(stats.pendingDues));
    setText('dashPendingCount', `${stats.pendingPaymentsCount ?? 0} tenants overdue`);
    setText('dashComplaints', stats.openComplaints ?? '—');

    // Occupancy bar
    const rate = stats.totalBeds > 0 ? +((stats.occupiedBeds / stats.totalBeds) * 100).toFixed(1) : 0;
    setText('dashOccRate', rate + '%');
    const bar = el('dashOccBar');
    if (bar) bar.style.width = rate + '%';
    setText('dashOccLeft', `${stats.occupiedBeds} of ${stats.totalBeds} beds occupied`);
    setText('dashVacRight', `${stats.vacantBeds} vacant`);

    // Charts
    this.renderIncomeChart(income?.monthly || []);
    this.renderDuesList(stats.pendingPayments || []);
    this.renderOccupancyTable(occupancy || []);
    this.renderComplaintsBadge(stats.openComplaints);

    setHtml('page-dashboard-body', '');  // clear spinner sentinel
  },

  renderIncomeChart(monthly) {
    const box = el('dashIncomeChart');
    if (!box) return;
    const maxVal = Math.max(...monthly.map(m => m.income), 1);
    const curMonth = new Date().getMonth() + 1;
    const LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    box.innerHTML = monthly.map(m => `
      <div class="bar-col">
        <div class="bar-val">${m.income > 0 ? '₹' + (m.income >= 1000 ? (m.income/1000).toFixed(0)+'k' : m.income) : ''}</div>
        <div class="bar-inner">
          <div class="bar ${m.month === curMonth ? 'cur' : ''}" style="height:${Math.max((m.income/maxVal)*100,3)}%"></div>
        </div>
        <div class="bar-lbl">${LABELS[m.month-1]}</div>
      </div>`).join('');
    box.style.cssText = 'display:flex;height:110px;align-items:flex-end;gap:4px;';
  },

  renderDuesList(dues) {
    const box = el('dashDuesList');
    if (!box) return;
    if (!dues.length) { box.innerHTML = '<div class="c-muted tx-sm" style="padding:16px 0">🎉 All rents cleared!</div>'; return; }
    box.innerHTML = dues.map(p => `
      <div class="flex items-c just-b" style="padding:10px 0;border-bottom:1px solid var(--b1)">
        <div>
          <div class="fw-6 tx-sm">${p.tenant?.name || '—'}</div>
          <div class="tx-xs c-muted">${p.building?.name || ''} • ${fmtMonth(p.month, p.year)}</div>
        </div>
        <div class="tx-r">
          <div class="fw-7 c-red font-s" style="font-size:16px">${fmt(p.amount)}</div>
          ${statusBadge(p.status)}
        </div>
      </div>`).join('');
  },

  renderOccupancyTable(occ) {
    const box = el('dashOccTable');
    if (!box) return;
    if (!occ.length) { box.innerHTML = emptyState('🏢','No buildings','Add buildings to see occupancy'); return; }
    box.innerHTML = `<div class="tbl-wrap"><table>
      <thead><tr><th>Building</th><th>Rooms</th><th>Beds</th><th>Occ.</th><th>Vacant</th><th>Rate</th></tr></thead>
      <tbody>${occ.map(o => `<tr>
        <td><b>${o.building}</b></td><td>${o.totalRooms}</td><td>${o.totalBeds}</td>
        <td class="c-red">${o.occupiedBeds}</td><td class="c-green">${o.vacantBeds}</td>
        <td><div class="flex items-c gap-2"><div class="prog" style="flex:1"><div class="prog-bar pb-gold" style="width:${o.occupancyRate}%"></div></div><b>${o.occupancyRate}%</b></div></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  },

  renderComplaintsBadge(count) {
    const b = el('navComplaintBadge');
    if (!b) return;
    if (count > 0) { b.textContent = count; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  },
};