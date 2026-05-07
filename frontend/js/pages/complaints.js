/* ═══════════════════════════════════════════════════════════════
   complaints.js
═══════════════════════════════════════════════════════════════ */
const Complaints = {
  async load() {
    setHtml("complaintList", spinner());
    await Store.fillBuildings("#cmpBldgFilter");
    try {
      const q = {
        building: val("cmpBldgFilter"),
        status: val("cmpStatusFilter"),
        category: val("cmpCatFilter"),
        priority: val("cmpPriorityFilter"),
      };
      const list = await Api.complaints.list(q);
      this.render(list || []);
      Dashboard.renderComplaintsBadge(
        list.filter((c) => c.status === "open" || c.status === "in_progress")
          .length,
      );
    } catch (err) {
      toast(err.message, "err");
    }
  },

  render(list) {
    if (!list.length) {
      setHtml(
        "complaintList",
        emptyState("🔧", "No complaints", "All issues are resolved!"),
      );
      return;
    }
    const icons = {
      plumbing: "🔩",
      electrical: "⚡",
      furniture: "🪑",
      cleaning: "🧹",
      security: "🔐",
      internet: "📶",
      other: "📋",
    };
    const pColor = {
      urgent: "var(--red)",
      high: "var(--yellow)",
      medium: "var(--blue)",
      low: "var(--tx3)",
    };
    setHtml(
      "complaintList",
      `<div style="display:flex;flex-direction:column;gap:12px">${list
        .map(
          (c) => `
      <div class="card" style="border-left:3px solid ${pColor[c.priority] || "var(--b2)"}">
        <div class="flex gap-3">
          <div class="stat-ico ico-blue" style="font-size:20px;flex-shrink:0">${icons[c.category] || "📋"}</div>
          <div class="f1">
            <div class="flex items-c gap-2 fw mb-1">
              <b>${c.title}</b>${statusBadge(c.priority)}${statusBadge(c.status)}
            </div>
            <div class="tx-sm c-muted">${c.description}</div>
            <div class="tx-xs c-dim mt-2">
              ${c.tenant?.name || "Admin"} • ${c.building?.name || ""} • ${c.room?.roomNumber ? "Rm " + c.room.roomNumber + " •" : ""} ${timeAgo(c.createdAt)}
            </div>
            ${c.assignedTo ? `<div class="tx-xs c-blue mt-1">👤 Assigned: ${c.assignedTo}</div>` : ""}
            ${c.status === "resolved" && c.resolution ? `<div class="tx-xs c-green mt-1">✓ ${c.resolution}</div>` : ""}
          </div>
          <div class="flex gap-2 items-c" style="flex-shrink:0">
            ${c.status !== "resolved" && c.status !== "closed" ? `<button class="btn btn-xs btn-blue" onclick="Complaints.openStatus('${c._id}','${c.status}')">Update</button>` : ""}
            <button class="btn btn-xs btn-danger" onclick="Complaints.delete('${c._id}')">✕</button>
          </div>
        </div>
        ${
          c.timeline?.length
            ? `
        <div class="div"></div>
        <div class="timeline">${c.timeline
          .slice(-3)
          .map(
            (t) => `
          <div class="tl-item"><div class="tl-dot"></div>
          <div class="tl-time">${timeAgo(t.date)} — ${t.updatedBy || ""}</div>
          <div class="tl-txt">${t.note || ""}</div>
          </div>`,
          )
          .join("")}</div>`
            : ""
        }
      </div>`,
        )
        .join("")}</div>`,
    );
  },

  async openForm() {
    el("cmpForm")?.reset();
    await Promise.all([
      Store.fillBuildingsRequired("#cBuilding"),
      Store.fillTenants("#cTenant"),
    ]);
    openModal("moComplaint");
  },

  async save() {
    const data = {
      title: val("cTitle"),
      description: val("cDesc"),
      category: val("cCategory"),
      priority: val("cPriority"),
      building: val("cBuilding") || null,
      tenant: val("cTenant") || null,
      assignedTo: val("cAssigned"),
    };
    if (!data.title || !data.description)
      return toast("Title and description required", "warn");
    try {
      setBusy("cmpSaveBtn", true);
      await Api.complaints.create(data);
      toast("Complaint raised", "ok");
      closeModal("moComplaint");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("cmpSaveBtn", false);
    }
  },

  openStatus(id, currentStatus) {
    setVal("csId", id);
    setVal("csStatus", currentStatus);
    openModal("moComplaintStatus");
  },

  async updateStatus() {
    const id = val("csId");
    const status = val("csStatus");
    const data = {
      status,
      note: val("csNote"),
      assignedTo: val("csAssigned"),
      resolution: val("csResolution"),
    };
    try {
      setBusy("csUpdateBtn", true);
      await Api.complaints.update(id, data);
      toast(`Status updated to ${status}`, "ok");
      closeModal("moComplaintStatus");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("csUpdateBtn", false);
    }
  },

  async delete(id) {
    const ok = await confirmAction("Delete this complaint?", "Delete", true);
    if (!ok) return;
    try {
      await Api.complaints.delete(id);
      toast("Deleted", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
