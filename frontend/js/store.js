/* ═══════════════════════════════════════════════════════════════
   store.js  —  Global data cache; keeps all dropdowns in sync
═══════════════════════════════════════════════════════════════ */
const Store = {
  buildings: [],
  rooms:     [],
  tenants:   [],

  async loadBuildings(force = false) {
    if (!force && this.buildings.length) return this.buildings;
    try { this.buildings = await Api.buildings.list() || []; } catch { this.buildings = []; }
    return this.buildings;
  },

  async loadRooms(buildingId = '', force = false) {
    if (!force && !buildingId && this.rooms.length) return this.rooms;
    try { this.rooms = await Api.rooms.list(buildingId ? { building: buildingId } : {}) || []; } catch { this.rooms = []; }
    return this.rooms;
  },

  async loadTenants(force = false) {
    if (!force && this.tenants.length) return this.tenants;
    try { this.tenants = await Api.tenants.list({ status: 'active' }) || []; } catch { this.tenants = []; }
    return this.tenants;
  },

  /* ── Populate <select> dropdowns ──────────────────────────── */
  async fillBuildings(selector = '.sel-building', selected = '') {
    const list = await this.loadBuildings();
    document.querySelectorAll(selector).forEach(sel => {
      const prev = selected || sel.value;
      sel.innerHTML = `<option value="">All Buildings</option>` +
        list.map(b => `<option value="${b._id}">${b.name}</option>`).join('');
      if (prev) sel.value = prev;
    });
  },

  async fillBuildingsRequired(selector = '.sel-building-req', selected = '') {
    const list = await this.loadBuildings();
    document.querySelectorAll(selector).forEach(sel => {
      const prev = selected || sel.value;
      sel.innerHTML = `<option value="">Select Building *</option>` +
        list.map(b => `<option value="${b._id}">${b.name}</option>`).join('');
      if (prev) sel.value = prev;
    });
  },

  async fillRooms(selector = '.sel-room', buildingId = '', selected = '') {
    const list = await this.loadRooms(buildingId, true);
    document.querySelectorAll(selector).forEach(sel => {
      const prev = selected || sel.value;
      sel.innerHTML = `<option value="">Select Room</option>` +
        list.map(r => `<option value="${r._id}">Room ${r.roomNumber} – Fl.${r.floor} (${r.building?.name || ''})</option>`).join('');
      if (prev) sel.value = prev;
    });
  },

  async fillTenants(selector = '.sel-tenant', selected = '') {
    const list = await this.loadTenants();
    document.querySelectorAll(selector).forEach(sel => {
      const prev = selected || sel.value;
      sel.innerHTML = `<option value="">Select Tenant</option>` +
        list.map(t => `<option value="${t._id}">${t.name} — ${t.room?.roomNumber ? 'Rm ' + t.room.roomNumber : 'No room'} (${t.building?.name || ''})</option>`).join('');
      if (prev) sel.value = prev;
    });
  },

  async fillAllTenants(selector = '.sel-tenant-all', selected = '') {
    let list = [];
    try { list = await Api.tenants.list({}) || []; } catch {}
    document.querySelectorAll(selector).forEach(sel => {
      const prev = selected || sel.value;
      sel.innerHTML = `<option value="">All Tenants</option>` +
        list.map(t => `<option value="${t._id}">${t.name} (${t.status})</option>`).join('');
      if (prev) sel.value = prev;
    });
  },

  invalidate() {
    this.buildings = [];
    this.rooms     = [];
    this.tenants   = [];
  },
};