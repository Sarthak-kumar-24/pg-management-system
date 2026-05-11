const Payment = require("../models/Payment");
const Tenant = require("../models/Tenant");
const PDFDocument = require("pdfkit");

// GET /api/payments
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.tenant) filter.tenant = req.query.tenant;
    if (req.query.building) filter.building = req.query.building;
    if (req.query.room) filter.room = req.query.room;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.year) filter.year = Number(req.query.year);
    
    const payments = await Payment.find(filter)
      .populate("tenant", "name phone")
      .populate("building", "name")
      .populate("room", "roomNumber floor")
      .sort({ year: -1, month: -1, createdAt: -1 })
      .limit(100)
      .lean();
       res.json(payments);
    
   } catch (err) {
    
    next(err);
  }
};

// GET /api/payments/:id
exports.get = async (req, res, next) => {
  try {
    const p = await Payment.findById(req.params.id)
      .populate("tenant", "name phone building room")
      .populate("building", "name")
      .populate("room", "roomNumber");
    if (!p) return res.status(404).json({ error: "Payment not found" });
    res.json(p);
  } catch (err) {
  
    next(err);
  }
};

// POST /api/payments
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.type === "") delete data.type;
    if (data.status === "") delete data.status;
    if (data.paymentMethod === "") delete data.paymentMethod;
    
    const payment = await Payment.create(data);
    await payment.populate("tenant", "name phone");
    await payment.populate("building", "name");
    await payment.populate("room", "roomNumber");
    res.status(201).json(payment);
  } catch (err) {
  
    next(err);
  }
};

// PUT /api/payments/:id
exports.update = async (req, res, next) => {
  try {

    
    const data = { ...req.body };
    if (data.type === "") delete data.type;
    if (data.status === "") delete data.status;
    if (data.paymentMethod === "") delete data.paymentMethod;
    
    const payment = await Payment.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    })
      .populate("tenant", "name phone")
      .populate("building", "name")
      .populate("room", "roomNumber");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  } catch (err) {
    
    next(err);
  }
};

// DELETE /api/payments/:id
exports.remove = async (req, res, next) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: "Payment deleted" });
  } catch (err) {
   
    next(err);
  }
};

// POST /api/payments/generate-monthly — bulk generate rent records
exports.generateMonthly = async (req, res, next) => {
  try {
    const { month, year, buildingId } = req.body;
    if (!month || !year)
      return res.status(400).json({ error: "month and year required" });
    const filter = { status: "active" };
    if (buildingId) filter.building = buildingId;
    const tenants = await Tenant.find(filter);
    const created = [];
    for (const t of tenants) {
      const exists = await Payment.findOne({
        tenant: t._id,
        month: Number(month),
        year: Number(year),
        type: "rent",
      });
      if (!exists) {
        const p = await Payment.create({
          tenant: t._id,
          room: t.room,
          building: t.building,
          amount: t.monthlyRent,
          type: "rent",
          month: Number(month),
          year: Number(year),
          status: "pending",
          dueDate: new Date(Number(year), Number(month) - 1, 5),
        });
        created.push(p);
      }
    }
    res.json({
      message: `${created.length} payment records generated`,
      count: created.length,
    });
  } catch (err) {
  
    next(err);
  }
};

// GET /api/payments/stats/summary
exports.stats = async (req, res, next) => {
  try {
    const now = new Date();
   
    const year = Number(req.query.year) || now.getFullYear();
    

    const filter = { type: "rent", year };

    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.building) filter.building = req.query.building;
    
    const payments = await Payment.find(filter).lean();

    let totalExpected = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;

    for (const p of payments) {
      totalExpected += p.amount;
      
      if (p.status === "paid") {
        totalCollected += p.amount;
      } else {
        totalPending += p.amount;
      }
      
      if (p.status === "overdue") {
        overdueCount++;
      }
    }
    
    res.json({
      totalExpected,
      totalCollected,
      totalPending,
      overdueCount,
      month: req.query.month || "All",
      year,
    });
  } catch (err) {
  
    next(err);
  }
};

// POST /api/payments/electricity — Generate room electricity bills
exports.addElectricity = async (req, res, next) => {
  try {
    const { building, room, month, year, meterStart, meterEnd, unitRate, dueDate } = req.body;
    
    // 1. Calculate the units
    const units = Number(meterEnd) - Number(meterStart);
    if (units < 0) return res.status(400).json({ error: "End reading must be greater than Start reading" });

    const totalAmount = units * Number(unitRate);

    // 2. Find all active tenants currently assigned to this room
    const tenants = await Tenant.find({ room: room, status: "active" });
    if (!tenants.length) return res.status(400).json({ error: "No active tenants in this room to bill." });

    // 3. Split the bill equally
    const splitAmount = Math.round(totalAmount / tenants.length);
    const created = [];

    // 4. Generate a payment record for each tenant
    for (const t of tenants) {
      const p = await Payment.create({
        tenant: t._id,
        room: room,
        building: building,
        amount: splitAmount,
        type: "electricity",
        month: Number(month),
        year: Number(year),
        status: "pending",
        dueDate: dueDate || new Date(),
        meterStart: Number(meterStart),
        meterEnd: Number(meterEnd),
        unitRate: Number(unitRate),
        notes: `Electricity: ${meterStart} to ${meterEnd} (${units} units @ ₹${unitRate}/unit). Room Total: ₹${totalAmount}, Split among ${tenants.length} tenants.`
      });
      created.push(p);
    }
    
    res.status(201).json({ 
      message: `Generated electricity bills for ${tenants.length} tenants.`, 
      totalAmount 
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/export — Download PDF ONLY (Table Format)
exports.exportPdf = async (req, res, next) => {
  try {
    const { months } = req.body;
    if (!months || months < 1 || months > 5) {
      return res.status(400).json({ error: "Please specify between 1 and 5 months." });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const payments = await Payment.find({ createdAt: { $gte: startDate } })
      .populate("tenant", "name phone")
      .populate("room", "roomNumber")
      .populate("building", "name")
      .sort({ paidOn: -1, createdAt: -1 }); // Sort newest first

    if (!payments.length) return res.status(404).json({ error: "No receipts found for this period." });

    // 1. Initialize PDF in Landscape mode for extra width
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 2. Format title
    const fmtMonth = (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    doc.fontSize(18).font("Helvetica-Bold").text(`PG Payment Receipts (${fmtMonth(startDate)} - ${fmtMonth(endDate)})`, { align: "center" });
    doc.moveDown(2);

    // 3. Define Table Columns & Widths (Total Width ~ 760px)
    let currentY = doc.y;
    const cols = [
      { label: "TENANT", width: 120 },
      { label: "BUILDING", width: 80 },
      { label: "ROOM", width: 60 },
      { label: "AMOUNT", width: 70 },
      { label: "TYPE", width: 80 },
      { label: "METHOD", width: 70 },
      { label: "STATUS", width: 60 },
      { label: "PAID ON", width: 80 },
      { label: "RECEIPT", width: 100 }
    ];

    // Helper: Draw Headers
    const drawHeaders = (y) => {
      doc.fontSize(10).font("Helvetica-Bold");
      let startX = 40;
      cols.forEach(col => {
        doc.text(col.label, startX, y, { width: col.width, align: "left" });
        startX += col.width;
      });
      // Draw header underline
      doc.moveTo(40, y + 15).lineTo(800, y + 15).lineWidth(1).stroke();
      return y + 25;
    };

    currentY = drawHeaders(currentY);

    // 4. Draw Rows
    for (const p of payments) {
      // Create a new page if we run out of vertical space
      if (currentY > 520) {
        doc.addPage();
        currentY = drawHeaders(40);
      }

      doc.fontSize(9).font("Helvetica");
      let startX = 40;
      
      const rowData = [
        p.tenant?.name || "—",
        p.building?.name || "—",
        p.room?.roomNumber ? `Rm ${p.room.roomNumber}` : "—",
        `Rs. ${p.amount}`,
        p.type.toUpperCase(),
        (p.paymentMethod || "—").toUpperCase(),
        p.status.toUpperCase(),
        p.paidOn ? p.paidOn.toISOString().split("T")[0] : "—",
        p.receiptNumber || "—"
      ];
      
      // Print text in columns
      rowData.forEach((text, i) => {
        doc.text(text, startX, currentY, { width: cols[i].width, align: "left" });
        startX += cols[i].width;
      });

      // Draw faint divider line between rows
      currentY += 20;
      doc.moveTo(40, currentY - 5).lineTo(800, currentY - 5).lineWidth(0.5).strokeColor('#cccccc').stroke();
      doc.strokeColor('#000000'); // Reset stroke color to black
      currentY += 10;
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

// DELETE /api/payments/bulk — Manual Owner Deletion
exports.deleteBulk = async (req, res, next) => {
  try {
    const { months } = req.body;
    if (!months) return res.status(400).json({ error: "Months required" });

    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - months);

    const result = await Payment.deleteMany({ createdAt: { $gte: dateLimit } });
    
    res.json({ message: `Success! ${result.deletedCount} old records were securely deleted.` });
  } catch (err) {
    next(err);
  }
};
