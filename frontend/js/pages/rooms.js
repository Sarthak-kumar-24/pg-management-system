/* ═══════════════════════════════════════════════════════════════
   rooms.js
═══════════════════════════════════════════════════════════════ */
const Rooms = {
  editId: null,

  async load() {
    setHtml("roomList", spinner());
    await Store.fillBuildings("#roomBldgFilter");
    try {
      const q = {
        building: val("roomBldgFilter"),
        floor: val("roomFloorFilter"),
        status: val("roomStatusFilter"),
      };
      const list = await Api.rooms.list(q);
      this.render(list || []);
    } catch (err) {
      toast(err.message, "err");
    }
  },
/*
  render(list) {
    if (!list.length) {
      setHtml(
        "roomList",
        emptyState("🚪", "No rooms found", "Create rooms and assign beds"),
      );
      return;
    }
    setHtml(
      "roomList",
      `<div class="ga">${list
        .map((r) => {
          const occ = r.beds.filter((b) => b.isOccupied).length;
          const free = r.beds.filter(
            (b) => !b.isOccupied && !b.isLocked,
          ).length;
          const lock = r.beds.filter((b) => b.isLocked).length;
          return `
      <div class="r-card">
        <div class="r-top">
          <div>
            <div class="r-no">Room ${r.roomNumber}</div>
            <div class="tx-xs c-muted">${r.building?.name || ""} • Floor ${r.floor} • ${r.type}</div>
          </div>
          <div class="flex gap-2 items-c">
            ${statusBadge(r.status)}
            ${r.needsCleaning ? '<span class="badge b-yellow">🧹 Clean</span>' : ""}
          </div>
        </div>
        <div class="r-body">
          <div class="flex gap-3 mb-3">
            <span class="tx-sm c-red fw-6">${occ} occupied</span>
            <span class="tx-sm c-green fw-6">${free} free</span>
            ${lock ? `<span class="tx-sm c-muted">${lock} locked</span>` : ""}
            <span class="tx-sm c-gold fw-6 f1 tx-r">${fmt(r.monthlyRent)}/mo</span>
          </div>
          <div class="bed-grid">${r.beds
            .map(
              (b) => `
            <div class="bed ${b.isOccupied ? "occ" : b.isLocked ? "lock" : "free"}" title="${b.tenant?.name || (b.isLocked ? "Locked" : "Vacant")}">
              <div class="bed-no">🛏 ${b.bedNumber}</div>
              <div class="bed-nm">${b.isOccupied ? b.tenant?.name?.split(" ")[0] || "Occ" : b.isLocked ? "Locked" : "Free"}</div>
            </div>`,
            )
            .join("")}
          </div>
          <div class="flex gap-2 mt-3">
            <button class="btn btn-blue btn-xs" onclick="Rooms.openForm('${r._id}')">Edit</button>
            <button class="btn btn-sec btn-xs" onclick="Rooms.toggleCleaning('${r._id}')">🧹 ${r.needsCleaning ? "Mark Clean" : "Needs Clean"}</button>
            <button class="btn btn-danger btn-xs" onclick="Rooms.delete('${r._id}')">Delete</button>
          </div>
        </div>
      </div>`;
        })
        .join("")}</div>`,
    );
  },
   */
   render(list) {
    if (!list.length) {
      setHtml(
        "roomList",
        emptyState("🚪", "No rooms found", "Create rooms and assign beds"),
      );
      return;
    }

    setHtml(
      "roomList",
      `<div class="ga">${list
        .map((r) => {
          // 1. Calculate occupancy status
          const occ = r.beds.filter((b) => b.isOccupied).length;
          const totalBeds = r.totalBeds || 1; // Fallback to 1 if not defined
          const free = r.beds.filter((b) => !b.isOccupied && !b.isLocked).length;
          const lock = r.beds.filter((b) => b.isLocked).length;
          
          // 2. Determine if the room is overbooked based on your new rules
          const isOverbooked = occ > totalBeds;

          return `
      <div class="r-card">
        <div class="r-top">
          <div>
            <div class="r-no">Room ${r.roomNumber}</div>
            <div class="tx-xs c-muted">${r.building?.name || ""} • Floor ${r.floor} • ${r.type}</div>
          </div>
          <div class="flex gap-2 items-c">
            ${statusBadge(r.status)}
            ${r.needsCleaning ? '<span class="badge b-yellow">🧹 Clean</span>' : ""}
          </div>
        </div>
        <div class="r-body">
          <div class="flex gap-3 mb-3 items-center">
            <div class="f1">
              ${isOverbooked 
                ? `<span class="tx-sm c-red fw-7">${occ} occupied</span>
                   <span class="tx-xs c-red fw-6" style="margin-left:4px">
                     (⚠️ ${totalBeds} bed room but ${occ} people living)
                   </span>`
                : `<span class="tx-sm c-red fw-6">${occ} occupied</span>
                   <span class="tx-sm c-green fw-6" style="margin-left:10px">${free} free</span>`
              }
              ${lock ? `<span class="tx-sm c-muted" style="margin-left:10px">${lock} locked</span>` : ""}
            </div>
            <span class="tx-sm c-gold fw-6 tx-r">${fmt(r.monthlyRent)}/mo</span>
          </div>

          <div class="bed-grid">${r.beds
            .map(
              (b) => `
            <div class="bed ${b.isOccupied ? "occ" : b.isLocked ? "lock" : "free"}" title="${b.tenant?.name || (b.isLocked ? "Locked" : "Vacant")}">
              <div class="bed-no">🛏 ${b.bedNumber}</div>
              <div class="bed-nm">${b.isOccupied ? b.tenant?.name?.split(" ")[0] || "Occ" : b.isLocked ? "Locked" : "Free"}</div>
            </div>`,
            )
            .join("")}
          </div>

          <div class="flex gap-2 mt-3">
            <button class="btn btn-blue btn-xs" onclick="Rooms.openForm('${r._id}')">Edit</button>
            <button class="btn btn-sec btn-xs" onclick="Rooms.toggleCleaning('${r._id}')">
              🧹 ${r.needsCleaning ? "Mark Clean" : "Needs Clean"}
            </button>
            <button class="btn btn-danger btn-xs" onclick="Rooms.delete('${r._id}')">Delete</button>
          </div>
        </div>
      </div>`;
        })
        .join("")}</div>`,
    );
  },

  async openForm(id = null) {
    this.editId = id;
    setText("roomModalTitle", id ? "Edit Room" : "Add Room");
    el("roomForm")?.reset();
    await Store.fillBuildingsRequired("#rBuilding");
    if (id) {
      try {
        const r = await Api.rooms.get(id);
        setVal("rBuilding", r.building?._id || r.building);
        setVal("rNumber", r.roomNumber);
        setVal("rFloor", r.floor);
        setVal("rType", r.type);
        setVal("rBeds", r.totalBeds);
        setVal("rRent", r.monthlyRent);
        setVal("rStatus", r.status);
        setVal("rCleaning", r.needsCleaning ? "true" : "false");
        setVal("rAmenities", r.amenities?.join(", ") || "");
        setVal("rDesc", r.description);
      } catch (err) {
        return toast(err.message, "err");
      }
    }
    openModal("moRoom");
  },

  async save() {
    const data = {
      building: val("rBuilding"),
      roomNumber: val("rNumber"),
      floor: +val("rFloor") || 1,
      type: val("rType"),
      totalBeds: +val("rBeds") || 1,
      monthlyRent: +val("rRent"),
      status: val("rStatus"),
      needsCleaning: val("rCleaning") === "true",
      amenities: val("rAmenities")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      description: val("rDesc"),
    };
    if (!data.building || !data.roomNumber || !data.monthlyRent)
      return toast("Building, room number, rent required", "warn");
    try {
      setBusy("roomSaveBtn", true);
      if (this.editId) await Api.rooms.update(this.editId, data);
      else await Api.rooms.create(data);
      toast(this.editId ? "Room updated" : "Room created", "ok");
      Store.invalidate();
      closeModal("moRoom");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("roomSaveBtn", false);
    }
  },

  async toggleCleaning(id) {
    try {
      await Api.rooms.toggleCleaning(id);
      toast("Cleaning status updated", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },

  async delete(id) {
    const ok = await confirmAction(
      "Delete this room? All bed assignments will be lost.",
      "Delete",
      true,
    );
    if (!ok) return;
    try {
      await Api.rooms.delete(id);
      toast("Room deleted", "ok");
      Store.invalidate();
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
