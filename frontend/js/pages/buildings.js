/* ═══════════════════════════════════════════════════════════════
   buildings.js
═══════════════════════════════════════════════════════════════ */
const Buildings = {
  editId: null,

  async load() {
    setHtml('buildingList', spinner());
    try {
      const list = await Api.buildings.list();
      Store.buildings = list || [];
      this.render(list || []);
    } catch (err) { toast(err.message, 'err'); }
  },

  render(list) {
    if (!list.length) { setHtml('buildingList', emptyState('🏢','No buildings yet','Add your first PG building')); return; }
    setHtml('buildingList', `<div class="ga">${list.map(b => `
      <div class="card">
        <div class="flex items-c just-b mb-3">
          <div>
            <div class="font-s fw-7" style="font-size:20px">${b.name}</div>
            <div class="tx-xs c-muted mt-1">${b.address}${b.city ? ', ' + b.city : ''}</div>
            <div class="mt-2 flex gap-2">${statusBadge(b.type)}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-blue btn-xs" onclick="Buildings.openForm('${b._id}')">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="Buildings.delete('${b._id}','${b.name}')">✕</button>
          </div>
        </div>
        <div class="div"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
          ${[['🚪',b.totalRooms||0,'Rooms'],['🛏',b.totalBeds||0,'Beds'],['🔴',b.occupiedBeds||0,'Occupied'],['🟢',b.vacantBeds||0,'Vacant']].map(([ic,v,l])=>
            `<div><div class="font-s fw-7" style="font-size:22px">${v}</div><div class="tx-xs c-muted">${l}</div></div>`).join('')}
        </div>
        ${b.amenities?.length ? `<div class="mt-3 flex gap-2 fw">${b.amenities.map(a=>`<span class="chip">${a}</span>`).join('')}</div>` : ''}
        ${b.wifiCost || b.maintenanceCost ? `<div class="div"></div><div class="flex gap-3 tx-xs c-muted">
          ${b.wifiCost ? `<span>📶 Wi-Fi: ${fmt(b.wifiCost)}/mo</span>` : ''}
          ${b.maintenanceCost ? `<span>🔧 Maint: ${fmt(b.maintenanceCost)}/mo</span>` : ''}
        </div>` : ''}
      </div>`).join('')}</div>`);
  },

  async openForm(id = null) {
    this.editId = id;
    setText('bldgModalTitle', id ? 'Edit Building' : 'Add Building');
    el('bldgForm')?.reset();
    if (id) {
      try {
        const b = await Api.buildings.get(id);
        setVal('bName', b.name); setVal('bAddress', b.address); setVal('bCity', b.city);
        setVal('bFloors', b.totalFloors); setVal('bType', b.type);
        setVal('bWifi', b.wifiCost); setVal('bMaint', b.maintenanceCost);
        setVal('bAmenities', b.amenities?.join(', ') || '');
        setVal('bDesc', b.description);
      } catch (err) { return toast(err.message, 'err'); }
    }
    openModal('moBuilding');
  },

  async save() {
    const data = {
      name:            val('bName'), address:         val('bAddress'),
      city:            val('bCity'), totalFloors:     +val('bFloors') || 1,
      type:            val('bType'), wifiCost:        +val('bWifi') || 0,
      maintenanceCost: +val('bMaint') || 0,
      amenities:       val('bAmenities').split(',').map(a => a.trim()).filter(Boolean),
      description:     val('bDesc'),
    };
    if (!data.name || !data.address) return toast('Name and address are required', 'warn');
    try {
      setBusy('bldgSaveBtn', true, 'Save Building');
      if (this.editId) await Api.buildings.update(this.editId, data);
      else             await Api.buildings.create(data);
      toast(this.editId ? 'Building updated' : 'Building created', 'ok');
      Store.invalidate();
      closeModal('moBuilding');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('bldgSaveBtn', false, 'Save Building'); }
  },

  async delete(id, name) {
    const ok = await confirmAction(`Delete building "${name}"? This cannot be undone.`, 'Delete', true);
    if (!ok) return;
    try { await Api.buildings.delete(id); toast('Building deleted', 'ok'); Store.invalidate(); this.load(); }
    catch (err) { toast(err.message, 'err'); }
  },
};