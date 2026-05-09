/* ═══════════════════════════════════════════════════════════════
   qrs.js — Room QR Generator
═══════════════════════════════════════════════════════════════ */
const Qrs = {
  async load() {
    await Store.fillBuildings("#qrBldgFilter");
    this.loadRooms();
  },

  async loadRooms() {
    const bldgId = val("qrBldgFilter");
    if (!bldgId) {
      setHtml("qrRoomList", emptyState("🏢", "Select a building", "Choose a building to see its rooms."));
      return;
    }

    try {
      setHtml("qrRoomList", spinner());
      // Fetch rooms for this building
      const rooms = await Api.rooms.list({ building: bldgId });
      
      if (!rooms.length) {
        setHtml("qrRoomList", emptyState("🚪", "No rooms", "This building has no rooms yet."));
        return;
      }

      setHtml(
        "qrRoomList",
        rooms.map(r => `
          <div class="r-card">
            <div class="r-top">
              <div class="r-no">Rm ${r.roomNumber}</div>
              <button class="btn btn-xs btn-primary" onclick="Qrs.generate('${r._id}', '${r.roomNumber}')">
                🔳 Generate QR
              </button>
            </div>
            <div class="r-body tx-xs c-muted">
              Capacity: ${r.capacity || r.beds?.length || 0} Beds
            </div>
          </div>
        `).join("")
      );
    } catch (err) {
      toast(err.message, "err");
    }
  },

  generate(roomId, roomNumber) {
    // 1. Get the current building name from the dropdown
    const bldgSelect = el("qrBldgFilter");
    const bldgName = bldgSelect.options[bldgSelect.selectedIndex].text;
    
    // 2. Set the Modal Titles
    setText("qrPrintTitle", `${bldgName} — Room ${roomNumber}`);

    // 3. Create the unique onboarding URL 
    // (You will need to build the frontend /onboard page next!)
    const domain = window.location.origin;
    const onboardUrl = `${domain}/onboard?room=${roomId}`;

    // 4. Clear old QR and Generate New One
    const qrContainer = el("qrcodeDisplay");
    qrContainer.innerHTML = ""; 
    
    new QRCode(qrContainer, {
      text: onboardUrl,
      width: 200,
      height: 200,
      colorDark : "#0f1423", // Matches your dark theme
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });

    openModal("moPrintQr");
  },
/*
  print() {
    // Open a simple print window with just the QR code
    const title = document.getElementById("qrPrintTitle").innerText;
    const qrImg = document.querySelector("#qrcodeDisplay img").src;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin-top: 50px; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            p { color: #666; margin-bottom: 30px; }
            img { width: 300px; height: 300px; border: 2px solid #ccc; padding: 20px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Scan to register and upload documents</p>
          <img src="${qrImg}" />
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  */

   print() {
    const title = document.getElementById("qrPrintTitle").innerText;
    
    // 1. Reliably grab the QR code image data
    const canvas = document.querySelector("#qrcodeDisplay canvas");
    const img = document.querySelector("#qrcodeDisplay img");
    
    let qrSrc = "";
    if (canvas) {
      qrSrc = canvas.toDataURL("image/png"); // Extract safely from canvas
    } else if (img && img.src) {
      qrSrc = img.src; // Fallback to image tag
    }

    if (!qrSrc) {
      toast("QR Code is still generating, please wait a second.", "warn");
      return;
    }

    // 2. Open the window (and catch pop-up blockers!)
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("⚠️ Your browser blocked the print window. Please allow pop-ups for this site!");
      return;
    }

    // 3. Write the print-friendly HTML
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; margin-top: 50px; }
            h1 { font-size: 32px; margin-bottom: 10px; }
            p { color: #555; margin-bottom: 40px; font-size: 18px; }
            img { width: 300px; height: 300px; padding: 20px; border: 3px dashed #ccc; border-radius: 12px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Scan to register and upload your documents</p>
          <img src="${qrSrc}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }
};








