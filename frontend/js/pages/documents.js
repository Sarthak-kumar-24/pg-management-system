/* ═══════════════════════════════════════════════════════════════
   documents.js
═══════════════════════════════════════════════════════════════ */
const Documents = {
  async load() {
    setHtml('documentList', spinner());
    await Promise.all([
      Store.fillBuildings('#docBldgFilter'),
      Store.fillAllTenants('#docTenantFilter'),
    ]);
    try {
      const q = {
        building: val('docBldgFilter'),
        tenant:   val('docTenantFilter'),
        type:     val('docTypeFilter'),
      };
      const list = await Api.documents.list(q);
      this.render(list || []);
    } catch (err) { toast(err.message, 'err'); }
  },

  render(list) {
    if (!list.length) {
      setHtml('documentList', emptyState('📁', 'No documents', 'Upload ID proofs, agreements, and receipts'));
      return;
    }
    const typeColor = { id_proof:'b-blue', agreement:'b-gold', receipt:'b-green', photo:'b-purple', other:'b-gray' };
    setHtml('documentList', `<div class="ga">${list.map(d => `
      <div class="card">
        <div class="flex items-c just-b mb-3">
          <div class="flex items-c gap-3">
            <div class="stat-ico ico-blue" style="font-size:24px">${typeIcon(d.type)}</div>
            <div>
              <div class="fw-6 tx-sm">${d.name}</div>
              <span class="badge ${typeColor[d.type]||'b-gray'} mt-1">${d.type?.replace('_',' ')}</span>
            </div>
          </div>
          <div class="flex gap-2">
            ${d.hasFile ? `<button class="btn btn-blue btn-xs" onclick="Documents.download('${d._id}','${d.name}')">⬇ Download</button>` : ''}
            <button class="btn btn-danger btn-xs" onclick="Documents.delete('${d._id}','${d.name}')">✕</button>
          </div>
        </div>
        <div class="div"></div>
        <div class="fr" style="gap:8px">
          <div>
            <div class="fl">Tenant</div>
            <div class="tx-sm">${d.tenant?.name || '—'}</div>
          </div>
          <div>
            <div class="fl">Building</div>
            <div class="tx-sm">${d.building?.name || '—'}</div>
          </div>
        </div>
        <div class="tx-xs c-dim mt-2">
          Uploaded by ${d.uploadedBy?.name || 'System'} • ${timeAgo(d.createdAt)}
          ${d.fileSize ? ` • ${(d.fileSize / 1024).toFixed(1)} KB` : ''}
        </div>
      </div>`).join('')}</div>`);
  },

  async openForm() {
    el('docForm')?.reset();
    setHtml('docPreview', '');
    hide('docPreview');
    await Promise.all([
      Store.fillBuildingsRequired('#docFormBuilding'),
      Store.fillTenants('#docFormTenant'),
    ]);
    openModal('moDocument');
  },

  previewFile() {
    const file = el('docFile')?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('File must be under 5 MB', 'warn'); el('docFile').value = ''; return; }
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target.result;
      const isImg = file.type.startsWith('image/');
      setHtml('docPreview', isImg
        ? `<img src="${src}" style="max-width:100%;max-height:200px;border-radius:8px;margin-top:8px" alt="preview">`
        : `<div class="alert al-info mt-2">📄 ${file.name} ready to upload</div>`);
      show('docPreview');
    };
    reader.readAsDataURL(file);
  },

  async save() {
    const name  = val('docFormName');
    const type  = val('docFormType');
    const bldg  = val('docFormBuilding');
    const tenant= val('docFormTenant');
    if (!name)  return toast('Document name is required', 'warn');
    if (!bldg)  return toast('Please select a building', 'warn');

    const file = el('docFile')?.files?.[0];
    let fileData = null, mimeType = null, fileName = null, fileSize = null;

    if (file) {
      fileData = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(file);
      });
      mimeType  = file.type;
      fileName  = file.name;
      fileSize  = file.size;
    }

    try {
      setBusy('docSaveBtn', true, 'Upload Document');
      await Api.documents.create({ name, type, building: bldg, tenant: tenant || null, fileData, mimeType, fileName, fileSize });
      toast('Document uploaded', 'ok');
      closeModal('moDocument');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('docSaveBtn', false, 'Upload Document'); }
  },

  async download(id, name) {
    try {
      const doc = await Api.documents.get(id);
      if (!doc.fileData) return toast('No file attached', 'warn');
      const a    = document.createElement('a');
      a.href     = doc.fileData;
      a.download = doc.fileName || name;
      a.click();
    } catch (err) { toast(err.message, 'err'); }
  },

  async delete(id, name) {
    const ok = await confirmAction(`Delete document "${name}"?`, 'Delete', true);
    if (!ok) return;
    try {
      await Api.documents.delete(id);
      toast('Document deleted', 'ok');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  },
};