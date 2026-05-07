/* ═══════════════════════════════════════════════════════════════
   settings.js
═══════════════════════════════════════════════════════════════ */
const Settings = {
  async load() {
    const user = Auth.getUser();
    if (!user) return;
    setVal('settingName',  user.name  || '');
    setVal('settingEmail', user.email || '');
    setVal('settingPhone', user.phone || '');
    setText('settingRoleDisplay', user.role || '—');
    // Clear password fields
    setVal('curPwd', ''); setVal('newPwd', ''); setVal('cfmPwd', '');
  },

  async saveProfile() {
    const name  = val('settingName');
    const phone = val('settingPhone');
    if (!name) return toast('Name is required', 'warn');
    try {
      setBusy('profileSaveBtn', true, 'Save Profile');
      const updated = await Api.auth.updateProfile({ name, phone });
      // Update local storage
      const user = Auth.getUser();
      Auth.setSession(Auth.getToken(), { ...user, name: updated.name, phone: updated.phone });
      // Update sidebar display
      setText('sbUserName', updated.name);
      const av = el('sbUserAv');
      if (av) av.textContent = initials(updated.name);
      toast('Profile updated successfully', 'ok');
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('profileSaveBtn', false, 'Save Profile'); }
  },

  async changePassword() {
    const cur = val('curPwd');
    const nw  = val('newPwd');
    const cfm = val('cfmPwd');
    if (!cur || !nw || !cfm) return toast('All password fields are required', 'warn');
    if (nw !== cfm)           return toast('New passwords do not match', 'err');
    if (nw.length < 6)        return toast('Password must be at least 6 characters', 'warn');
    try {
      setBusy('changePwdBtn', true, 'Update Password');
      await Api.auth.changePassword({ currentPassword: cur, newPassword: nw });
      toast('Password updated successfully', 'ok');
      setVal('curPwd', ''); setVal('newPwd', ''); setVal('cfmPwd', '');
    } catch (err) { toast(err.message, 'err'); }
    finally { setBusy('changePwdBtn', false, 'Update Password'); }
  },
};