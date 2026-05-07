/* ═══════════════════════════════════════════════════════════════
   bills.js
═══════════════════════════════════════════════════════════════ */
const Bills = {
  async load() {
    setHtml("billList", spinner());
    await Store.fillBuildings("#billBldgFilter");
    try {
      const now = new Date();
      const q = {
        building: val("billBldgFilter"),
        type: val("billTypeFilter"),
        month: val("billMonthFilter"),
        year: val("billYearFilter") || now.getFullYear(),
      };
      const list = await Api.bills.list(q);
      this.render(list || []);
    } catch (err) {
      toast(err.message, "err");
    }
  },

  render(list) {
    if (!list.length) {
      setHtml(
        "billList",
        emptyState("⚡", "No bills", "Add electricity, water and other bills"),
      );
      return;
    }
    const icons = {
      electricity: "⚡",
      water: "💧",
      wifi: "📶",
      maintenance: "🔧",
      other: "📄",
    };
    setHtml(
      "billList",
      `<div class="ga">${list
        .map(
          (b) => `
      <div class="card">
        <div class="flex items-c gap-3 mb-3">
          <div class="stat-ico ${b.type === "electricity" ? "ico-gold" : b.type === "water" ? "ico-blue" : b.type === "wifi" ? "ico-purple" : "ico-green"}" style="font-size:22px">${icons[b.type] || "📄"}</div>
          <div class="f1">
            <div class="fw-6 tx-sm" style="text-transform:capitalize">${b.type} Bill</div>
            <div class="tx-xs c-muted">${b.building?.name || ""} • ${fmtMonth(b.month, b.year)}</div>
          </div>
          <div class="tx-r">
            <div class="font-s fw-7 c-gold" style="font-size:22px">${fmt(b.totalAmount)}</div>
            <div class="tx-xs c-muted">${(b.splitMethod || "").replace("_", " ")} split</div>
          </div>
        </div>
        ${
          b.splitDetails?.length
            ? `
        <div class="div"></div>
        <div class="tx-xs c-muted mb-2">Split across ${b.splitDetails.length} ${b.splitMethod === "per_room" ? "rooms" : "tenants"}</div>
        ${b.splitDetails
          .slice(0, 4)
          .map(
            (s) => `
          <div class="flex just-b tx-sm" style="padding:5px 0;border-bottom:1px solid var(--b1)">
            <span>${s.tenant?.name || (s.room?.roomNumber ? "Rm " + s.room.roomNumber : "—")}</span>
            <span class="c-gold fw-6">${fmt(s.amount)}</span>
          </div>`,
          )
          .join("")}
        ${b.splitDetails.length > 4 ? `<div class="tx-xs c-muted mt-2">+${b.splitDetails.length - 4} more…</div>` : ""}`
            : ""
        }
        <div class="flex gap-2 mt-3">
          ${b.description ? `<span class="tx-xs c-muted f1">${b.description}</span>` : '<span class="f1"></span>'}
          <button class="btn btn-danger btn-xs" onclick="Bills.delete('${b._id}')">Delete</button>
        </div>
      </div>`,
        )
        .join("")}</div>`,
    );
  },

  async openForm() {
    el("billForm")?.reset();
    const now = new Date();
    setVal("billMonth", now.getMonth() + 1);
    setVal("billYear", now.getFullYear());
    await Store.fillBuildingsRequired("#billBldg");
    openModal("moBill");
  },

  async save() {
    const data = {
      building: val("billBldg"),
      type: val("billType"),
      month: +val("billMonth"),
      year: +val("billYear"),
      totalAmount: +val("billAmount"),
      splitMethod: val("billSplit"),
      description: val("billDesc"),
    };
    if (
      !data.building ||
      !data.type ||
      !data.month ||
      !data.year ||
      !data.totalAmount
    )
      return toast("All fields required", "warn");
    try {
      setBusy("billSaveBtn", true);
      await Api.bills.create(data);
      toast("Bill added and split automatically", "ok");
      closeModal("moBill");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("billSaveBtn", false);
    }
  },

  async delete(id) {
    const ok = await confirmAction("Delete this bill?", "Delete", true);
    if (!ok) return;
    try {
      await Api.bills.delete(id);
      toast("Deleted", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
