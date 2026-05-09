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



// ─── ELECTRICITY BILLING LOGIC ───
  async openElectricityForm() {
    el("eStart").value = "";
    el("eEnd").value = "";
    el("eSummary").innerHTML = "Units: 0<br>Room Total: ₹0";
    await Store.fillBuildingsRequired("#eBldg");
    this.onEBldgChange();
    openModal("moElectricity");
  },

  async onEBldgChange() {
    const bldgId = val("eBldg");
    if (!bldgId) return;
    const rooms = await Api.rooms.list({ building: bldgId });
    const sel = el("eRoom");
    sel.innerHTML = '<option value="">Select Room</option>' + 
      rooms.map(r => `<option value="${r._id}">Room ${r.roomNumber} (${r.beds.filter(b=>b.isOccupied).length} tenants)</option>`).join("");
  },

  calcE() {
    const start = Number(val("eStart")) || 0;
    const end = Number(val("eEnd")) || 0;
    const rate = Number(val("eRate")) || 0;
    const units = end - start;
    if (units < 0) {
      setHtml("eSummary", "⚠ End reading cannot be less than Start!");
    } else {
      setHtml("eSummary", `Units Consumed: <b class="c-gold">${units}</b><br>Room Total: <b class="c-gold">₹${units * rate}</b>`);
    }
  },

  async saveElectricity() {
    const data = {
      building: val("eBldg"),
      room: val("eRoom"),
      meterStart: val("eStart"),
      meterEnd: val("eEnd"),
      unitRate: val("eRate"),
      month: val("eMonth"),
      year: new Date().getFullYear()
    };

    if (!data.room || data.meterStart === "" || data.meterEnd === "") {
      return toast("Please fill in Room and Meter Readings", "warn");
    }

    try {
      setBusy("elecSaveBtn", true);
      const token = localStorage.getItem("pg_token");
      // Ensure you add this route to your Api object (e.g. Api.payments.addElectricity)
      // Or make a raw fetch call:
      const res = await fetch("/api/payments/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json",
                 "Authorization": `Bearer ${token}`
                 },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast(result.message, "ok");
      closeModal("moElectricity");
      this.load(); // Refresh payment list
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("elecSaveBtn", false);
    }
  },
/*
  async downloadReceipts() {
    // 1. Ask for timeframe
    const months = prompt("Enter number of months to download (1 to 5):", "1");
    if (!months || isNaN(months) || months < 1 || months > 5) return;

    try {
      setBusy("bulkDownloadBtn", true);
      const token = localStorage.getItem("pg_token");

      // 2. Fetch and Download the PDF first
      const res = await fetch("/api/payments/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ months: Number(months) })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipts_${months}_months.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // 3. Temporarily remove the loading spinner so they can see the popup
      setBusy("bulkDownloadBtn", false);

      // 4. MANUAL DECISION: Ask the owner if they want to delete
      const wantToDelete = await confirmAction(
        "📄 PDF Downloaded successfully! \n\nDo you also want to permanently DELETE these older records from the database to save space?",
        "Yes, Delete Records",
        true
      );

      // 5. If they click yes, run the deletion
      if (wantToDelete) {
        setBusy("bulkDownloadBtn", true);
        const delRes = await fetch("/api/payments/bulk", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ months: Number(months) })
        });
        
        const delData = await delRes.json();
        if (!delRes.ok) throw new Error(delData.error);
        
        toast(delData.message, "ok");
        this.load(); // Refresh the list
      } else {
        // If they click cancel
        toast("Download complete. Database was not changed.", "ok");
      }

    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("bulkDownloadBtn", false);
    }
  }
  */

     async downloadReceipts() {
    // 1. Ask for timeframe
    const months = prompt("Enter number of months to download (1 to 5):", "1");
    if (!months || isNaN(months) || months < 1 || months > 5) return;

    try {
      setBusy("bulkDownloadBtn", true);
      const token = localStorage.getItem("pg_token");

      // 2. Fetch and Download the PDF first
      const res = await fetch("/api/payments/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ months: Number(months) })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // 🛑 NEW: Calculate precise Filename
      const endMonth = new Date();
      const startMonth = new Date();
      startMonth.setMonth(startMonth.getMonth() - Number(months));
      
      const formatMonth = (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '');
      const fileName = `PaymentReceipts_${formatMonth(startMonth)}-${formatMonth(endMonth)}.pdf`;
      
      a.download = fileName; // Apply dynamic filename
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // 3. Temporarily remove the loading spinner so they can see the popup
      setBusy("bulkDownloadBtn", false);

      // 4. MANUAL DECISION: Ask the owner if they want to delete
      const wantToDelete = await confirmAction(
        "📄 PDF Downloaded successfully! \n\nDo you also want to permanently DELETE these older records from the database to save space?",
        "Yes, Delete Records",
        true
      );

      // 5. If they click yes, run the deletion
      if (wantToDelete) {
        setBusy("bulkDownloadBtn", true);
        const delRes = await fetch("/api/payments/bulk", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ months: Number(months) })
        });
        
        const delData = await delRes.json();
        if (!delRes.ok) throw new Error(delData.error);
        
        toast(delData.message, "ok");
        this.load(); // Refresh the list
      } else {
        // If they click cancel
        toast("Download complete. Database was not changed.", "ok");
      }

    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("bulkDownloadBtn", false);
    }
  }
};








