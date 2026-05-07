/* ═══════════════════════════════════════════════════════════════
   users.js
═══════════════════════════════════════════════════════════════ */
const Users = {
  editId: null,

  async load() {
    setHtml('userList', spinner());
    try {
      const list = await Api.users.list();
      this.render(list || []);
    } catch (err) { toast(err.message, 'err'); }
  },

  render(list) {
    if (!list.length) { setHtml('userList', emptyState('👤', 'No users', 'Add managers and staff')); return; }
    const me = Auth.getUser();
    setHtml('userList', `
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td>
                  <div class="flex items-c gap-3">
                    <div class="u-av" style="width:32px;height:32px;font-size:12px">${initials(u.name)}</div>
                    <div>
                      <div class="fw-6">${u.name}</div>
                      ${me?.id === u._id ? '<div class="tx-xs c-gold">You</div>' : ''}
                    </div>
                  </div>
                </td>
                <td class="c-muted tx-sm">${u.email}</td>
                <td class="tx-sm">${u.phone || '—'}</td>
                <td>${statusBadge(u.role)}</td>
                <td>${u.isActive ? '<span class="badge b-green">Active</span>' : '<span class="badge b-red">Inactive</span>'}</td>
                <td class="tx-sm c-muted">${fmtDate(u.createdAt)}</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-blue btn-xs" onclick="Users.openForm('${u._id}')">Edit</button>
                    ${me?.id !== u._id
                      ? `<button class="btn btn-danger btn-xs" onclick="Users.delete('${u._id}','${u.name}')">${u.isActive ? 'Deactivate' : 'Deleted'}</button>`
                      : ''}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`);
  },

  openForm(id = null) {
    this.editId = id;
    setText('userModalTitle', id ? 'Edit User' : 'Add User');
    el('userForm')?.reset();
    // show password field only for new users
    toggle('userPwdGroup', !id);
    if (!id) { openModal('moUser'); return; }
    // fetch existing
    Api.users.list().then(list => {
      const u = (list || []).find(x => x._id === id);
      if (!u) return;
      setVal('uName', u.name);
      setVal('uEmail', u.email);
      setVal('uPhone', u.phone);
      setVal('uRole', u.role);
    }).catch(err => toast(err.message, 'err'));
    openModal('moUser');
  },

  async save() {
    const data = {
      name:  val('uName'),
      email: val('uEmail'),
      phone: val('uPhone'),
      role:  val('uRole'),
    };
    if (!data.name || !data.email) return toast('Name and email are required', 'warn');
    if (!this.editId) {
      const pw = val('uPassword');
      if (!pw) return toast('Password is required for new user', 'warn');
      if (pw.length < 6) return toast('Password must be at least 6 characters', 'warn');
      data.password = pw;
    }
    try {
      setBusy('userSaveBtn', true, 'Save User');
      if (this.editId) await Api.users.update(this.editId, data);
      else             await Api.users.create(data);
      toast(this.editId ? 'User updated' : 'User created', 'ok');
      closeModal('moUser');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('userSaveBtn', false, 'Save User'); }
  },

  async delete(id, name) {
    const ok = await confirmAction(`Deactivate "${name}"? They will lose system access.`, 'Deactivate', true);
    if (!ok) return;
    try {
      await Api.users.delete(id);
      toast('User deactivated', 'ok');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  },
};