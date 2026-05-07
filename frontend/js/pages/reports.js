/* ═══════════════════════════════════════════════════════════════
   reports.js
═══════════════════════════════════════════════════════════════ */
const Reports = {
  activeTab: "income",
  data: {},

  async load() {
    await Store.fillBuildings("#rptBuilding");
    await this.loadTab(this.activeTab);
  },

  switchTab(tab, btn) {
    this.activeTab = tab;
    document
      .querySelectorAll("#page-reports .tab-pane")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById("rpt-" + tab)?.classList.add("active");
    document
      .querySelectorAll("#page-reports .tab-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    this.loadTab(tab);
  },

  async loadTab(tab) {
    const year = val("rptYear") || new Date().getFullYear();
    const building = val("rptBuilding") || null;
    const q = Object.assign({ year }, building ? { building } : {});
    setHtml("rpt-" + tab, spinner());
    try {
      if (tab === "income") {
        const d = await Api.reports.income(q);
        this.renderIncome(d);
      } else if (tab === "expense") {
        const d = await Api.reports.expenses(q);
        this.renderExpense(d);
      } else if (tab === "occupancy") {
        const d = await Api.reports.occupancy(q);
        this.renderOccupancy(d);
      } else if (tab === "profit") {
        const d = await Api.reports.profit(q);
        this.renderProfit(d);
      }
    } catch (err) {
      toast(err.message, "err");
    }
  },

  renderIncome(d) {
    const total = d.total || 0;
    const maxVal = Math.max(...(d.monthly || []).map((m) => m.income), 1);
    const curMonth = new Date().getMonth() + 1;
    setHtml(
      "rpt-income",
      `
      <div class="flex just-b items-c mb-4 fw gap-4">
        <div><div class="tx-xs c-muted">Total Annual Income (${d.year})</div><div class="font-s fw-7 c-gold" style="font-size:34px">${fmt(total)}</div></div>
      </div>
      <div class="g2 gap-4">
        <div class="card">
          <div class="card-hdr"><span class="card-title">Monthly Chart</span></div>
          <div class="bar-chart" id="incomeBarChart" style="height:130px"></div>
        </div>
        <div class="card">
          <div class="card-hdr"><span class="card-title">Monthly Breakdown</span></div>
          <div class="tbl-wrap"><table>
            <thead><tr><th>Month</th><th>Collected</th><th>Tenants</th><th>Share</th></tr></thead>
            <tbody>${(d.monthly || [])
              .map(
                (
                  m,
                ) => `<tr ${m.month === curMonth ? 'style="background:rgba(212,168,83,.06)"' : ""}>
              <td><b ${m.month === curMonth ? 'class="c-gold"' : ""}>${m.monthName}</b></td>
              <td class="fw-6 c-gold">${fmt(m.income)}</td>
              <td>${m.count}</td>
              <td><div class="flex items-c gap-2">
                <div class="prog" style="flex:1"><div class="prog-bar pb-gold" style="width:${total ? ((m.income / total) * 100).toFixed(0) : 0}%"></div></div>
                <span class="tx-xs">${total ? ((m.income / total) * 100).toFixed(1) : 0}%</span>
              </div></td>
            </tr>`,
              )
              .join("")}</tbody>
          </table></div>
        </div>
      </div>`,
    );
    // render bar chart
    setTimeout(() => {
      const box = el("incomeBarChart");
      if (!box) return;
      const LABELS = [
        "J",
        "F",
        "M",
        "A",
        "M",
        "J",
        "J",
        "A",
        "S",
        "O",
        "N",
        "D",
      ];
      box.innerHTML = (d.monthly || [])
        .map(
          (m) => `
        <div class="bar-col">
          <div class="bar-val">${m.income > 0 ? "₹" + (m.income >= 1000 ? (m.income / 1000).toFixed(0) + "k" : m.income) : ""}</div>
          <div class="bar-inner"><div class="bar ${m.month === curMonth ? "cur" : ""}" style="height:${Math.max((m.income / maxVal) * 100, 3)}%"></div></div>
          <div class="bar-lbl">${LABELS[m.month - 1]}</div>
        </div>`,
        )
        .join("");
      box.style.cssText =
        "display:flex;height:130px;align-items:flex-end;gap:4px;";
    }, 100);
  },

  renderExpense(d) {
    const icons = {
      electricity: "⚡",
      water: "💧",
      wifi: "📶",
      maintenance: "🔧",
      other: "📄",
    };
    setHtml(
      "rpt-expense",
      `
      <div class="mb-4"><div class="tx-xs c-muted">Total Expenses</div><div class="font-s fw-7 c-red" style="font-size:32px">${fmt(d.total)}</div></div>
      <div class="ga-sm mb-4">${Object.entries(d.byType || {})
        .map(
          ([type, amt]) => `
        <div class="card tx-c">
          <div style="font-size:32px;margin-bottom:8px">${icons[type] || "📄"}</div>
          <div class="tx-xs c-muted" style="text-transform:capitalize">${type}</div>
          <div class="font-s fw-7 c-gold" style="font-size:20px">${fmt(amt)}</div>
        </div>`,
        )
        .join("")}
      </div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">All Bills</span></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Building</th><th>Type</th><th>Month</th><th>Amount</th><th>Split</th></tr></thead>
          <tbody>${(d.bills || [])
            .map(
              (b) => `<tr>
            <td>${b.building?.name || "—"}</td><td>${statusBadge(b.type)}</td>
            <td>${fmtMonth(b.month, b.year)}</td><td class="c-gold fw-6">${fmt(b.totalAmount)}</td>
            <td>${(b.splitMethod || "").replace("_", " ")}</td>
          </tr>`,
            )
            .join("")}</tbody>
        </table></div>
      </div>`,
    );
  },

  renderOccupancy(list) {
    setHtml(
      "rpt-occupancy",
      `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Building</th><th>Type</th><th>Rooms</th><th>Total Beds</th><th>Occupied</th><th>Vacant</th><th>Tenants</th><th>Rate</th></tr></thead>
          <tbody>${(list || [])
            .map(
              (o) => `<tr>
            <td><b>${o.building}</b></td>
            <td>${statusBadge(o.type)}</td>
            <td>${o.totalRooms}</td>
            <td>${o.totalBeds}</td>
            <td class="c-red fw-6">${o.occupiedBeds}</td>
            <td class="c-green fw-6">${o.vacantBeds}</td>
            <td>${o.activeTenants}</td>
            <td><div class="flex items-c gap-2">
              <div class="prog" style="flex:1;min-width:60px"><div class="prog-bar pb-gold" style="width:${o.occupancyRate}%"></div></div>
              <b>${o.occupancyRate}%</b>
            </div></td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>
      </div>`,
    );
  },

  renderProfit(d) {
    const { totals, monthly } = d;
    setHtml(
      "rpt-profit",
      `
      <div class="ga-sm mb-4">
        <div class="stat-card gold"><div class="stat-ico ico-gold">💰</div><div class="stat-val">${fmt(totals?.income)}</div><div class="stat-lbl">Total Income</div></div>
        <div class="stat-card red"><div class="stat-ico ico-red">📉</div><div class="stat-val">${fmt(totals?.expense)}</div><div class="stat-lbl">Total Expense</div></div>
        <div class="stat-card ${totals?.profit >= 0 ? "green" : "red"}"><div class="stat-ico ${totals?.profit >= 0 ? "ico-green" : "ico-red"}">${totals?.profit >= 0 ? "📈" : "📉"}</div><div class="stat-val">${fmt(totals?.profit)}</div><div class="stat-lbl">Net Profit</div></div>
      </div>
      <div class="card">
        <div class="card-hdr"><span class="card-title">Month-wise P&L</span></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Profit/Loss</th></tr></thead>
          <tbody>${(monthly || [])
            .map(
              (m) => `<tr>
            <td><b>${m.monthName}</b></td>
            <td class="c-green fw-6">${fmt(m.income)}</td>
            <td class="c-red">${fmt(m.expense)}</td>
            <td class="${m.profit >= 0 ? "c-green" : "c-red"} fw-7">${m.profit >= 0 ? "+" : ""}${fmt(m.profit)}</td>
          </tr>`,
            )
            .join("")}</tbody>
        </table></div>
      </div>`,
    );
  },
};
