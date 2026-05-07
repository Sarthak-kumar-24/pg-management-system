/* ═══════════════════════════════════════════════════════════════
   payments.js
═══════════════════════════════════════════════════════════════ */
const Payments = {
  async load() {
    setHtml("paymentList", spinner());
    await Store.fillBuildings("#payBldgFilter");
    try {
      const now = new Date();
      const q = {
        building: val("payBldgFilter"),
        status: val("payStatusFilter"),
        type: val("payTypeFilter"),
        month: val("payMonthFilter"),
        year: val("payYearFilter") || now.getFullYear(),
      };
      const [list, stats] = await Promise.all([
        Api.payments.list(q),
        Api.payments.stats(q),
      ]);
      this.renderStats(stats);
      this.renderList(list || []);
    } catch (err) {
      toast(err.message, "err");
    }
  },

  renderStats(s) {
    setText("payStatExpected", fmt(s?.totalExpected));
    setText("payStatCollected", fmt(s?.totalCollected));
    setText("payStatPending", fmt(s?.totalPending));
    setText("payStatOverdue", s?.overdueCount ?? "—");
  },

  renderList(list) {
    if (!list.length) {
      setHtml(
        "paymentList",
        emptyState("💳", "No payments", "Record or generate monthly rents"),
      );
      return;
    }
    setHtml(
      "paymentList",
      `<div class="tbl-wrap"><table>
      <thead><tr><th>Tenant</th><th>Building</th><th>Room</th><th>Month</th><th>Amount</th><th>Type</th><th>Method</th><th>Status</th><th>Paid On</th><th>Receipt</th><th>Actions</th></tr></thead>
      <tbody>${list
        .map(
          (p) => `<tr>
        <td><b>${p.tenant?.name || "—"}</b><br><span class="tx-xs c-muted">${p.tenant?.phone || ""}</span></td>
        <td>${p.building?.name || "—"}</td>
        <td>${p.room?.roomNumber ? "Rm " + p.room.roomNumber : "—"}</td>
        <td>${fmtMonth(p.month, p.year)}</td>
        <td class="font-s fw-7 c-gold" style="font-size:16px">${fmt(p.amount)}</td>
        <td>${statusBadge(p.type)}</td>
        <td>${p.paymentMethod || "—"}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${p.paidOn ? fmtDate(p.paidOn) : "—"}</td>
        <td class="tx-xs c-muted">${p.receiptNumber || "—"}</td>
        <td><div class="flex gap-1">
          ${p.status !== "paid" ? `<button class="btn btn-xs btn-success" onclick="Payments.markPaid('${p._id}')">✓ Paid</button>` : ""}
          <button class="btn btn-xs btn-blue" onclick="Payments.openEditModal('${p._id}')">Edit</button>
          <button class="btn btn-xs btn-danger" onclick="Payments.delete('${p._id}')">✕</button>
        </div></td>
      </tr>`,
        )
        .join("")}</tbody>
    </table></div>`,
    );
  },

  async openForm() {
    el("payForm")?.reset();
    setVal("pYear", new Date().getFullYear());
    setVal("pMonth", new Date().getMonth() + 1);
    await Promise.all([
      Store.fillTenants("#pTenant"),
      Store.fillBuildingsRequired("#pBuilding"),
    ]);
    setText("payModalTitle", "Record Payment");
    el("pPayId") && setVal("pPayId", "");
    openModal("moPayment");
  },

  async openEditModal(id) {
    try {
      const p = await Api.payments.get(id);
      await Promise.all([
        Store.fillTenants("#pTenant"),
        Store.fillBuildingsRequired("#pBuilding"),
      ]);
      setText("payModalTitle", "Edit Payment");
      setVal("pPayId", id);
      setVal("pTenant", p.tenant?._id || p.tenant);
      setVal("pBuilding", p.building?._id || p.building);
      setVal("pAmount", p.amount);
      setVal("pType", p.type);
      setVal("pMonth", p.month);
      setVal("pYear", p.year);
      setVal("pMethod", p.paymentMethod);
      setVal("pStatus", p.status);
      setVal("pTxnId", p.transactionId);
      setVal("pPaidOn", p.paidOn?.split("T")[0]);
      setVal("pDueDate", p.dueDate?.split("T")[0]);
      setVal("pNotes", p.notes);
      openModal("moPayment");
    } catch (err) {
      toast(err.message, "err");
    }
  },

  async save() {
    const existingId = val("pPayId");
    const data = {
      tenant: val("pTenant"),
      building: val("pBuilding"),
      amount: +val("pAmount"),
      type: val("pType"),
      month: +val("pMonth"),
      year: +val("pYear"),
      paymentMethod: val("pMethod"),
      status: val("pStatus"),
      transactionId: val("pTxnId"),
      paidOn: val("pPaidOn") || null,
      dueDate: val("pDueDate") || null,
      notes: val("pNotes"),
    };
    if (!data.tenant || !data.amount)
      return toast("Tenant and amount required", "warn");
    if (data.status === "paid" && !data.paidOn)
      data.paidOn = new Date().toISOString();
    try {
      setBusy("paySaveBtn", true);
      if (existingId) await Api.payments.update(existingId, data);
      else await Api.payments.create(data);
      toast(existingId ? "Payment updated" : "Payment recorded", "ok");
      closeModal("moPayment");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("paySaveBtn", false);
    }
  },

  async markPaid(id) {
    try {
      await Api.payments.update(id, { status: "paid", paidOn: new Date() });
      toast("Marked as paid ✓", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },

  async generateMonthly() {
    const now = new Date();
    const ok = await confirmAction(
      `Generate rent records for ${fmtMonth(now.getMonth() + 1, now.getFullYear())}?`,
      "Generate",
    );
    if (!ok) return;
    try {
      const r = await Api.payments.generateMonthly({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      toast(`${r.count} records generated`, "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },

  async delete(id) {
    const ok = await confirmAction(
      "Delete this payment record?",
      "Delete",
      true,
    );
    if (!ok) return;
    try {
      await Api.payments.delete(id);
      toast("Deleted", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
