/* ═══════════════════════════════════════════════════════════════
   tenants.js
═══════════════════════════════════════════════════════════════ */
const Tenants = {
  editId: null,

  async load() {
    setHtml("tenantList", spinner());
    await Store.fillBuildings("#tenantBldgFilter");
    try {
      const q = {
        building: val("tenantBldgFilter"),
        status: val("tenantStatusFilter"),
        behavior: val("tenantBehaviorFilter"),
        search: val("tenantSearch"),
      };
      const list = await Api.tenants.list(q);
      this.render(list || []);
    } catch (err) {
      toast(err.message, "err");
    }
  },

  render(list) {
    if (!list.length) {
      setHtml(
        "tenantList",
        emptyState("👥", "No tenants found", "Add tenants to get started"),
      );
      return;
    }
    setHtml(
      "tenantList",
      `<div class="ga">${list
        .map(
          (t) => `
      <div class="t-card">
        <div class="t-av">${t.photo ? `<img src="${t.photo}" alt="">` : initials(t.name)}</div>
        <div class="t-info">
          <div class="flex items-c gap-2">
            <span class="t-name">${t.name}</span>${idBadge(t.idVerified)}
          </div>
          <div class="t-meta">📱 ${t.phone}</div>
          <div class="t-meta">🏠 ${t.building?.name || "—"} • Rm ${t.room?.roomNumber || "—"} • Bed ${t.bedNumber || "—"}</div>
          <div class="t-meta">📅 Joined ${fmtDate(t.joiningDate)}</div>
          <div class="flex gap-2 mt-2 fw">${statusBadge(t.status)} ${statusBadge(t.behavior)}</div>
        </div>
        <div class="t-acts">
          <button class="btn btn-xs btn-sec" onclick="Tenants.view('${t._id}')">👁</button>
          <button class="btn btn-xs btn-blue" onclick="Tenants.openForm('${t._id}')">Edit</button>
          <button class="btn btn-xs btn-danger" onclick="Tenants.delete('${t._id}')">✕</button>
        </div>
      </div>`,
        )
        .join("")}</div>`,
    );
  },

  async view(id) {
    setHtml("tenantProfileContent", spinner());
    openModal("moTenantProfile");
    try {
      const t = await Api.tenants.get(id);
      setHtml(
        "tenantProfileContent",
        `
        <div class="flex gap-4 fw mb-4">
          <div class="t-av" style="width:72px;height:72px;font-size:26px;border-radius:14px">${t.photo ? `<img src="${t.photo}" alt="" style="border-radius:14px">` : `<span>${initials(t.name)}</span>`}</div>
          <div class="f1">
            <div class="font-s fw-7" style="font-size:22px">${t.name}</div>
            <div class="flex gap-2 mt-2 fw">${statusBadge(t.status)} ${statusBadge(t.behavior)} ${idBadge(t.idVerified)}</div>
          </div>
          <button class="btn btn-blue btn-sm" onclick="closeModal('moTenantProfile');Tenants.openForm('${t._id}')">Edit</button>
        </div>
        <div class="div"></div>
        <div class="fr">
          ${[
            ["Phone", t.phone],
            ["Email", t.email || "—"],
            ["Building", t.building?.name || "—"],
            [
              "Room",
              `Rm ${t.room?.roomNumber || "—"}, Floor ${t.room?.floor || "—"}`,
            ],
            ["Bed", `Bed ${t.bedNumber || "—"}`],
            ["Joined", fmtDate(t.joiningDate)],
            ["Rent", fmt(t.monthlyRent) + "/mo"],
            [
              "Deposit",
              fmt(t.depositAmount) +
                " " +
                (t.depositPaid ? "(Paid)" : "(Unpaid)"),
            ],
            ["ID Type", t.idType || "—"],
            ["ID Number", t.idNumber || "—"],
            ["Occupation", t.occupation || "—"],
            ["Org", t.college || t.company || "—"],
          ]
            .map(
              ([l, v]) =>
                `<div><div class="fl">${l}</div><div class="fw-6">${v}</div></div>`,
            )
            .join("")}
        </div>
        ${
          t.emergencyContact?.name
            ? `<div class="div"></div>
        <div class="font-s fw-6 mb-3">Emergency Contact</div>
        <div class="fr">
          <div><div class="fl">Name</div><div>${t.emergencyContact.name}</div></div>
          <div><div class="fl">Phone</div><div>${t.emergencyContact.phone || "—"}</div></div>
          <div><div class="fl">Relation</div><div>${t.emergencyContact.relation || "—"}</div></div>
        </div>`
            : ""
        }
        ${
          t.payments?.length
            ? `<div class="div"></div>
        <div class="font-s fw-6 mb-3">Payment History (last 24)</div>
        <div class="tbl-wrap"><table><thead><tr><th>Month</th><th>Amount</th><th>Type</th><th>Method</th><th>Status</th><th>Paid On</th></tr></thead>
        <tbody>${t.payments
          .map(
            (
              p,
            ) => `<tr><td>${fmtMonth(p.month, p.year)}</td><td class="c-gold fw-6">${fmt(p.amount)}</td>
          <td>${statusBadge(p.type)}</td><td>${p.paymentMethod || "—"}</td><td>${statusBadge(p.status)}</td><td>${p.paidOn ? fmtDate(p.paidOn) : "—"}</td></tr>`,
          )
          .join("")}
        </tbody></table></div>`
            : ""
        }
      `,
      );
    } catch (err) {
      setHtml(
        "tenantProfileContent",
        `<div class="al-err alert">${err.message}</div>`,
      );
    }
  },

  async openForm(id = null) {
    this.editId = id;
    setText("tenantModalTitle", id ? "Edit Tenant" : "Add Tenant");
    el("tenantForm")?.reset();
    setVal("tJoining", new Date().toISOString().split("T")[0]);
    await Store.fillBuildingsRequired("#tBuilding");

     
    if (id) {
      try {
        const t = await Api.tenants.get(id);
        setVal("tBuilding", t.building?._id || t.building);
        await this.onBuildingChange(
          t.building?._id || t.building,
          t.room?._id || t.room,
        );
        setVal("tName", t.name);
        setVal("tPhone", t.phone);
        setVal("tEmail", t.email);
        setVal("tAltPhone", t.alternatePhone);
        setVal("tRent", t.monthlyRent);
        setVal("tDeposit", t.depositAmount);
        setChecked("tDepositPaid", t.depositPaid);
        setVal("tJoining", t.joiningDate?.split("T")[0]);
        setVal("tStatus", t.status);
        setVal("tBehavior", t.behavior);
        setChecked("tIdVerified", t.idVerified);
        setVal("tIdType", t.idType);
        setVal("tIdNumber", t.idNumber);
        setVal("tOccupation", t.occupation);
        setVal("tOrg", t.college || t.company);
        setVal("tPermAddr", t.address?.permanent);
        setVal("tCity", t.address?.city);
        setVal("tState", t.address?.state);
        setVal("tPincode", t.address?.pincode);
        setVal("tNotes", t.notes);
        setVal("tEcName", t.emergencyContact?.name);
        setVal("tEcRelation", t.emergencyContact?.relation);
        setVal("tEcPhone", t.emergencyContact?.phone);
        setVal("tBed", t.bedNumber);
      } catch (err) {
        return toast(err.message, "err");
    }
    } else {
      // 🛑 FIX: Force clean defaults for new tenants so they don't inherit "vacated"
      setVal("tStatus", "active");
      setVal("tBehavior", "moderate");
      setVal("tIdType", "");
      setChecked("tIdVerified", false);
      setChecked("tDepositPaid", false);
      setHtml("tRoom", '<option value="">Select Room</option>');
      setHtml("tBed", '<option value="">Select Bed</option>');
    }
    openModal("moTenant");
  },

  async onBuildingChange(bldgId, selectedRoom) {
    const id = bldgId || val("tBuilding");
    if (!id) return;
    const rooms = await Api.rooms.list({ building: id });
    const sel = el("tRoom");
    if (!sel) return;
    sel.innerHTML =
      '<option value="">Select Room</option>' +
      (rooms || [])
        .map(
          (r) =>
            `<option value="${r._id}">Room ${r.roomNumber} – Fl.${r.floor} (${r.type})</option>`,
        )
        .join("");
    if (selectedRoom) {
      sel.value = selectedRoom;
      await this.onRoomChange(selectedRoom);
    }
  },
/*
  async onRoomChange(roomId) {
    const id = roomId || val("tRoom");
    if (!id) return;
    try {
      const room = await Api.rooms.get(id);
      setVal("tRent", val("tRent") || room.monthlyRent);
      const sel = el("tBed");
      if (!sel) return;
      sel.innerHTML =
        '<option value="">Select Bed</option>' +
        room.beds
          .map(
            (b) =>
              `<option value="${b.bedNumber}" ${b.isOccupied && b.tenant?._id !== this.editId ? "disabled" : ""}>${b.isOccupied ? "🔴" : "🟢"} Bed ${b.bedNumber}${b.isOccupied ? (b.tenant ? " — " + b.tenant.name : " — Occupied") : " — Free"}</option>`,
          )
          .join("");
    } catch {}
  },
  */
   async onRoomChange(roomId) {
    // If 'roomId' is not passed, it means the user manually clicked the dropdown
    const isManualChange = !roomId; 
    const id = roomId || val("tRoom");
    
    if (!id) return;
    
    try {
      const room = await Api.rooms.get(id);
      
      // 1. Force update the rent ONLY when the user manually changes the room
      if (isManualChange) {
        setVal("tRent", room.monthlyRent);
      } else if (!val("tRent")) {
        setVal("tRent", room.monthlyRent); // Fallback for edit mode
      }

      const sel = el("tBed");
      if (!sel) return;

      // 2. Map existing beds
      let optionsHtml = '<option value="">Select Bed</option>' +
        room.beds.map((b) =>
            `<option value="${b.bedNumber}" ${b.isOccupied && b.tenant?._id !== this.editId ? "disabled" : ""}>${b.isOccupied ? "🔴" : "🟢"} Bed ${b.bedNumber}${b.isOccupied ? (b.tenant ? " — " + b.tenant.name : " — Occupied") : " — Free"}</option>`,
        ).join("");

      // 3. OVERBOOKING FIX: Always append an Extra Bed option!
      const extraBedNum = room.beds.length + 1;
      optionsHtml += `<option value="+${extraBedNum}">🟡 Extra Bed (+${extraBedNum})</option>`;

      sel.innerHTML = optionsHtml;
    } catch {}
  },
/*
  async save() {
    const data = {
      name: val("tName"),
      phone: val("tPhone"),
      email: val("tEmail"),
      alternatePhone: val("tAltPhone"),
      building: val("tBuilding"),
      room: val("tRoom") || null,
      bedNumber: +val("tBed") || null,
      monthlyRent: +val("tRent"),
      depositAmount: +val("tDeposit") || 0,
      depositPaid: checked("tDepositPaid"),
      joiningDate: val("tJoining"),
      status: val("tStatus"),
      behavior: val("tBehavior"),
      idVerified: checked("tIdVerified"),
      idType: val("tIdType"),
      idNumber: val("tIdNumber"),
      occupation: val("tOccupation"),
      college: val("tOccupation") === "Student" ? val("tOrg") : "",
      company: val("tOccupation") !== "Student" ? val("tOrg") : "",
      notes: val("tNotes"),
      emergencyContact: {
        name: val("tEcName"),
        phone: val("tEcPhone"),
        relation: val("tEcRelation"),
      },
      address: {
        permanent: val("tPermAddr"),
        city: val("tCity"),
        state: val("tState"),
        pincode: val("tPincode"),
      },
    };
    if (
      !data.name ||
      !data.phone ||
      !data.building ||
      !data.monthlyRent ||
      !data.joiningDate
    )
      return toast(
        "Name, phone, building, rent, joining date required",
        "warn",
      );
     Object.keys(data).forEach((key) => {
      if (data[key] === "") {
        delete data[key];
      }
    });
    try {
      setBusy("tenantSaveBtn", true);
      if (this.editId) await Api.tenants.update(this.editId, data);
      else await Api.tenants.create(data);
      toast(this.editId ? "Tenant updated" : "Tenant added", "ok");
      Store.invalidate();
      closeModal("moTenant");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("tenantSaveBtn", false);
    }
  },
*/
   async save() {
    // 1. Safely handle the Extra Bed string (e.g., convert "+3" into just 3)
    let bedVal = val("tBed");
    if (bedVal && typeof bedVal === "string" && bedVal.startsWith("+")) {
      bedVal = bedVal.replace("+", "");
    }

    const data = {
      name: val("tName"),
      phone: val("tPhone"),
      email: val("tEmail"),
      alternatePhone: val("tAltPhone"),
      building: val("tBuilding"),
      room: val("tRoom") || null,
      
      // 🛑 FIX: Use the safely parsed bed value
      bedNumber: bedVal ? Number(bedVal) : null, 
      
      // 🛑 CUSTOM OVERRIDE: Captures exact rent from the input box
      monthlyRent: +val("tRent"), 
      
      depositAmount: +val("tDeposit") || 0,
      depositPaid: checked("tDepositPaid"),
      joiningDate: val("tJoining"),
      status: val("tStatus"),
      behavior: val("tBehavior"),
      idVerified: checked("tIdVerified"),
      idType: val("tIdType"),
      idNumber: val("tIdNumber"),
      occupation: val("tOccupation"),
      college: val("tOccupation") === "Student" ? val("tOrg") : "",
      company: val("tOccupation") !== "Student" ? val("tOrg") : "",
      notes: val("tNotes"),
      emergencyContact: {
        name: val("tEcName"),
        phone: val("tEcPhone"),
        relation: val("tEcRelation"),
      },
      address: {
        permanent: val("tPermAddr"),
        city: val("tCity"),
        state: val("tState"),
        pincode: val("tPincode"),
      },
    };

    if (
      !data.name ||
      !data.phone ||
      !data.building ||
      !data.monthlyRent ||
      !data.joiningDate
    )
      return toast(
        "Name, phone, building, rent, joining date required",
        "warn",
      );

    Object.keys(data).forEach((key) => {
      if (data[key] === "") {
        delete data[key];
      }
    });

    try {
      setBusy("tenantSaveBtn", true);
      if (this.editId) await Api.tenants.update(this.editId, data);
      else await Api.tenants.create(data);
      toast(this.editId ? "Tenant updated" : "Tenant added", "ok");
      Store.invalidate();
      closeModal("moTenant");
      this.load();

      // 🛑 SYNC FIX: Automatically refresh other pages so occupancy and financial numbers instantly update
      if (typeof Dashboard !== 'undefined' && el("page-dashboard")?.classList.contains("active")) Dashboard.load();
      if (typeof Rooms !== 'undefined' && el("page-rooms")?.classList.contains("active")) Rooms.load();
      if (typeof Payments !== 'undefined' && el("page-payments")?.classList.contains("active")) Payments.load();

    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("tenantSaveBtn", false);
    }
  },
  async delete(id) {
    const ok = await confirmAction(
      "Delete this tenant? This will free their bed.",
      "Delete",
      true,
    );
    if (!ok) return;
    try {
      await Api.tenants.delete(id);
      toast("Tenant deleted", "ok");
      Store.invalidate();
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
