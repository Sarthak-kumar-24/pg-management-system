/* ═══════════════════════════════════════════════════════════════
   documents.js
═══════════════════════════════════════════════════════════════ */
const Documents = {

   liveTimer: null,
   
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
    } catch (err) { 
       toast(err.message, 'err');
    }
  },

   async silentLoad() {
    try {
      const q = {
        building: val("docBldgFilter"),
        tenant: val("docTenantFilter"),
        type: val("docTypeFilter"),
      };
      const list = await Api.documents.list(q);
      
      // Only re-render if the user hasn't opened a modal (so we don't interrupt them)
      if (!document.getElementById("moDocument")?.classList.contains("open")) {
         this.render(list || []);
      }
    } catch (err) {
      // Ignore errors silently in the background
    }
  },

  // 🛑 THE NEW FUNCTION: Sets up the 5-second polling loop
  initLiveUpdates() {
    // Destroy any existing "ghost" timers before starting a new one to prevent memory leaks
    if (this.liveTimer) clearInterval(this.liveTimer);

    this.liveTimer = setInterval(() => {
      
      // 🛑 3. Smart Checks: Is the PG Pro tab open? Is the browser window currently visible?
      const isPageActive = document.getElementById("page-documents")?.classList.contains("active");
      const isBrowserVisible = !document.hidden;

      // Only execute the database fetch if BOTH are true!
      if (isPageActive && isBrowserVisible) {
        this.silentLoad();
      }
      
    }, 5000);
  },
render(list) {
    if (!list.length) {
      setHtml('documentList', emptyState('📁', 'No documents', 'Upload ID proofs, agreements, and receipts'));
      return;
    }
    const typeColor = {
       id_proof:'b-blue', agreement:'b-gold', receipt:'b-green', photo:'b-purple', other:'b-gray' 
    };
    
    setHtml('documentList', `<div class="ga">${list.map(d => {
      return `
      <div class="card">
        
        <div class="flex items-start just-b gap-3 mb-3">
          
          <div class="flex items-start gap-3" style="min-width: 0; overflow: hidden;">
            <div class="stat-ico ico-blue" style="font-size:24px; flex-shrink: 0;">${typeIcon(d.type)}</div>
            <div style="min-width: 0;">
              <div class="fw-6 tx-sm" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${d.name}">
                ${d.name}
              </div>
              <div class="mt-1"><span class="badge ${typeColor[d.type]||'b-gray'}">${d.type?.replace('_',' ')}</span></div>
            </div>
          </div>
          
          <div class="flex gap-2 flex-wrap" style="justify-content: flex-end; flex-shrink: 0;">
            <button class="btn btn-xs btn-blue" onclick="Documents.view('${d._id}')" title="View Document">
              👁 View
            </button>
            <button class="btn btn-xs btn-sec" onclick="Documents.download('${d._id}', '${d.name}')" title="Download">
              ⬇ Download
            </button>
            <button class="btn btn-xs btn-danger" onclick="Documents.delete('${d._id}', '${d.name}')" title="Delete">
              ✕
            </button>
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
      </div>`
    }).join('')}</div>`);
  },

/*
   render(list) {
    if (!list.length) {
      setHtml('documentList', emptyState('📁', 'No documents', 'Upload ID proofs, agreements, and receipts'));
      return;
    }
    const typeColor = {
       id_proof:'b-blue', agreement:'b-gold', receipt:'b-green', photo:'b-purple', other:'b-gray' 
    };
    
    setHtml('documentList', `<div class="ga">${list.map(d => {
      return `
      <div class="card">
        <div class="flex items-c just-b mb-3">
          <div class="flex items-c gap-3">
            <div class="stat-ico ico-blue" style="font-size:24px">${typeIcon(d.type)}</div>
            <div>
              <div class="fw-6 tx-sm">${d.name}</div>
              <span class="badge ${typeColor[d.type]||'b-gray'} mt-1">${d.type?.replace('_',' ')}</span>
            </div>
          </div>
          
          <div class="flex gap-2 flex-wrap">
           
              <button class="btn btn-xs btn-blue" onclick="Documents.view('${d._id}')" title="View Document">
                👁 View
              </button>
              <button class="btn btn-xs btn-sec" onclick="Documents.download('${d._id}', '${d.name}')" title="Download">
                ⬇ Download
              </button>
           
            <button class="btn btn-xs btn-danger" onclick="Documents.delete('${d._id}', '${d.name}')" title="Delete">
              ✕
            </button>
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
      </div>`
    }).join('')}</div>`);
  },
  */


   async view(id) {
    try {
      toast("Opening...", "ok");
      // Fetch the specific document to get the actual URL
      const doc = await Api.documents.get(id); 
      const url = doc.fileUrl || doc.fileData;
      
      if (!url) return toast("No file attached", "warn");
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast("Failed to open document", "err");
    }
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
    if (file.size > 5 * 1024 * 1024) {
       toast('File must be under 5 MB', 'warn'); 
       el('docFile').value = '';
       return; 
    }
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
    const name = val("docFormName");
    const type = val("docFormType");
    const building = val("docFormBuilding");
    const tenant = val("docFormTenant");
    const fileInput = el("docFile");
    const file = fileInput?.files?.[0];

    // 1. Clean Validation
    if (!name || !building) return toast("Name and Building are required", "warn");
    if (!file) return toast("Please select a file to upload", "warn");

    // 2. Size Limit Check (4 MB)
    const MAX_MB = 4;
    if (file.size > MAX_MB * 1024 * 1024) {
      return toast(`File is too large! Please keep it under ${MAX_MB} MB.`, "err");
    }

    try {
      setBusy("docSaveBtn", true);
      
      // 3. Use FormData (Required for Multer/Cloudinary)
      const formData = new FormData();
      formData.append("docFile", file); // Must match backend .single('docFile')
      formData.append("name", name);
      formData.append("type", type);
      formData.append("building", building);
      if (tenant) formData.append("tenant", tenant);

      const token = localStorage.getItem("pg_token");

      // 4. Raw Fetch (Browser automatically handles multipart headers)
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast("Document uploaded securely!", "ok");
      closeModal("moDocument");
      
      // Reset form
      el("docFormName").value = "";
      if (fileInput) fileInput.value = "";
      
      this.load();
    } catch (err) {
      toast(err.message, "err");
    } finally {
      setBusy("docSaveBtn", false);
    }
  },
   /*
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
  */
   // ─── UPGRADED: DOWNLOAD DOCUMENT ───
   /*
  async download(url, fileName) {
    if (!url || url === 'undefined') return toast("No file attached", "warn");
    
    try {
      toast("Starting download...", "ok");

      if (url.startsWith('http')) {
        const response = await fetch(url);
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const safeName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = safeName; 
      
      document.body.appendChild(a);
      a.click();
      
      if (url.startsWith('blob:')) window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      toast("Download failed. Opening in new tab instead.", "warn");
      window.open(url, '_blank'); 
    }
  },
  */
   // ─── FIXED: DOWNLOAD DOCUMENT ───
  async download(id, fileName) {
    try {
      toast("Fetching file...", "ok");
      
      // Fetch the specific document to get the actual URL
      const doc = await Api.documents.get(id);
      let url = doc.fileUrl || doc.fileData;
      
      if (!url) return toast("No file attached", "warn");

      if (url.startsWith('http')) {
        const response = await fetch(url);
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const safeName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = safeName; 
      
      document.body.appendChild(a);
      a.click();
      
      if (url.startsWith('blob:')) window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      toast("Download failed. Opening in new tab instead.", "warn");
      // Fallback: If download fails due to CORS, just open it in a new tab
      const doc = await Api.documents.get(id).catch(() => null);
      if (doc && (doc.fileUrl || doc.fileData)) {
          window.open(doc.fileUrl || doc.fileData, '_blank'); 
      }
    }
  },

  async delete(id, name) {
    const ok = await confirmAction(`Delete document "${name}"?`, 'Delete', true);
    if (!ok) return;
    try {
      await Api.documents.delete(id);
      toast('Document deleted', 'ok');
      this.load();
    } catch (err) { toast(err.message, 'err'); }
  }
};
