const Rules = {
  editId: null,

  async load() {
    setHtml('ruleAdminList', spinner());
    try {
      const list = await Api.rules.list();
      this.render(list);
    } catch (err) { toast(err.message, 'err'); }
  },

  render(list) {
    if (!list.length) return setHtml('ruleAdminList', emptyState('📋', 'No Rules Set', 'Click + Add Rule to create guidelines for your tenants.'));
    
    setHtml('ruleAdminList', `<div class="ga">${list.map((r, index) => `
      <div class="card flex items-start gap-3">
        <div class="stat-ico ico-purple" style="width: 32px; height: 32px; font-size: 14px; flex-shrink:0;">${index + 1}</div>
        <div style="flex: 1;">
          <div class="fw-6">${r.title}</div>
          <div class="tx-sm c-muted mt-1" style="line-height: 1.5;">${r.body}</div>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0">
          <button class="btn btn-xs btn-blue" onclick="Rules.openForm('${r._id}')">Edit</button>
          <button class="btn btn-xs btn-danger" onclick="Rules.delete('${r._id}')">✕</button>
        </div>
      </div>
    `).join('')}</div>`);
  },

  async openForm(id = null) {
    this.editId = id;
    el('ruleForm')?.reset();
    setText('ruleModalTitle', id ? 'Edit Rule' : 'Add Rule');
    
    if (id) {
      try {
        const r = await Api.rules.get(id);
        setVal('ruleTitle', r.title);
        setVal('ruleBody', r.body);
      } catch (err) { return toast(err.message, 'err'); }
    }
    openModal('moRule');
  },

  async save() {
    const data = { title: val('ruleTitle'), body: val('ruleBody') };
    try {
      setBusy('ruleSaveBtn', true);
      if (this.editId) await Api.rules.update(this.editId, data);
      else await Api.rules.create(data);
      
      toast(this.editId ? 'Rule updated' : 'Rule added', 'ok');
      closeModal('moRule');
      this.load();
    } catch (err) { toast(err.message, 'err'); } 
    finally { setBusy('ruleSaveBtn', false); }
  },

  async delete(id) {
    if (!await confirmAction('Are you sure you want to delete this rule?', 'Delete', true)) return;
    try {
      await Api.rules.delete(id);
      toast('Rule deleted', 'ok');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  }
};
