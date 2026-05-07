/* ═══════════════════════════════════════════════════════════════
   notices.js
═══════════════════════════════════════════════════════════════ */
const Notices = {
  async load() {
    setHtml("noticeList", spinner());
    await Store.fillBuildings("#noticeBldgFilter");
    try {
      const q = {
        building: val("noticeBldgFilter"),
        type: val("noticeTypeFilter"),
      };
      const list = await Api.notices.list(q);
      this.render(list || []);
    } catch (err) {
      toast(err.message, "err");
    }
  },

  render(list) {
    if (!list.length) {
      setHtml(
        "noticeList",
        emptyState(
          "📢",
          "No notices",
          "Post your first notice or announcement",
        ),
      );
      return;
    }
    setHtml(
      "noticeList",
      list
        .map(
          (n) => `
      <div class="n-card ${n.priority}">
        <div class="flex just-b gap-3">
          <div class="f1">
            <div class="flex items-c gap-2 fw mb-2">
              <b style="font-size:15px">${n.title}</b>
              ${statusBadge(n.type)} ${statusBadge(n.priority)}
            </div>
            <div class="tx-sm c-muted" style="line-height:1.65">${n.content}</div>
            <div class="tx-xs c-dim mt-2">
              Posted by ${n.postedBy?.name || "Owner"} • ${timeAgo(n.createdAt)}
              ${n.building ? ` • ${n.building.name}` : " • All Buildings"}
              ${n.expiresAt ? ` • Expires ${fmtDate(n.expiresAt)}` : ""}
            </div>
          </div>
          <div class="flex gap-2 items-c" style="flex-shrink:0">
            <button class="btn btn-xs btn-blue" onclick="Notices.openEdit('${n._id}')">Edit</button>
            <button class="btn btn-xs btn-danger" onclick="Notices.delete('${n._id}')">✕</button>
          </div>
        </div>
      </div>`,
        )
        .join(""),
    );
  },

  async openForm() {
    el("noticeForm")?.reset();
    await Store.fillBuildings("#nBuilding");
    setText("noticeModalTitle", "Post Notice");
    setVal("nId", "");
    openModal("moNotice");
  },

  async openEdit(id) {
    try {
      const list = await Api.notices.list({});
      const n = list.find((x) => x._id === id);
      if (!n) return;
      await Store.fillBuildings("#nBuilding");
      setText("noticeModalTitle", "Edit Notice");
      setVal("nId", id);
      setVal("nTitle", n.title);
      setVal("nContent", n.content);
      setVal("nType", n.type);
      setVal("nPriority", n.priority);
      setVal("nBuilding", n.building?._id || "");
      setVal("nExpiry", n.expiresAt?.split("T")[0] || "");
      openModal("moNotice");
    } catch (err) {
      toast(err.message, "err");
    }
  },

  async save() {
    const id = val("nId");
    const data = {
      title: val("nTitle"),
      content: val("nContent"),
      type: val("nType"),
      priority: val("nPriority"),
      building: val("nBuilding") || null,
      expiresAt: val("nExpiry") || null,
    };
    if (!data.title || !data.content)
      return toast("Title and content required", "warn");
    try {
      setBusy("noticeSaveBtn", true);
      if (id) await Api.notices.update(id, data);
      else await Api.notices.create(data);
      toast(id ? "Notice updated" : "Notice posted", "ok");
      closeModal("moNotice");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("noticeSaveBtn", false);
    }
  },

  async delete(id) {
    const ok = await confirmAction("Remove this notice?", "Remove", true);
    if (!ok) return;
    try {
      await Api.notices.delete(id);
      toast("Notice removed", "ok");
      this.load();
    } catch (err) {
      toast(err.message, "err");
    }
  },
};
