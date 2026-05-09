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
    //res.status(500).json({ error: err.message });
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
   // res.status(500).json({ error: err.message });
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
   // res.status(500).json({ error: err.message });
    next(err);
  }
};

// PUT /api/payments/:id
exports.update = async (req, res, next) => {
  try {

    // 🛑 BULLETPROOF FIX: Clean empty strings
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
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// DELETE /api/payments/:id
exports.remove = async (req, res, next) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: "Payment deleted" });
  } catch (err) {
    //res.status(500).json({ error: err.message });
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
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// GET /api/payments/stats/summary
exports.stats = async (req, res, next) => {
  try {
    const now = new Date();
   // const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    //const filter = { type: "rent", month, year };

    const filter = { type: "rent", year };

    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.building) filter.building = req.query.building;
    //const payments = await Payment.find(filter);
    const payments = await Payment.find(filter).lean();
    /*
    const totalExpected = payments.reduce((s, p) => s + p.amount, 0);
    const totalCollected = payments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
    const totalPending = payments
      .filter((p) => p.status !== "paid")
      .reduce((s, p) => s + p.amount, 0);
    const overdueCount = payments.filter((p) => p.status === "overdue").length;
    */
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
      //month,
      month: req.query.month || "All",
      year,
    });
  } catch (err) {
   // res.status(500).json({ error: err.message });
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

// POST /api/payments/export — Download PDF and auto-delete
exports.exportAndClean = async (req, res, next) => {
  try {
    const { months } = req.body;
    if (!months || months < 1 || months > 5) {
      return res.status(400).json({ error: "Please specify between 1 and 5 months." });
    }

    // Find payments from the last X months
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - months);

    const payments = await Payment.find({ createdAt: { $gte: dateLimit } })
      .populate("tenant", "name phone")
      .populate("room", "roomNumber")
      .populate("building", "name");

    if (!payments.length) {
      return res.status(404).json({ error: "No receipts found for this period." });
    }

    // Initialize the PDF Document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers so the frontend knows it's receiving a downloadable file
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipts_last_${months}_months.pdf"`);
    
    // Pipe the PDF directly to the user's browser
    doc.pipe(res);

    doc.fontSize(20).text(`PG Receipts (Last ${months} Months)`, { align: "center" });
    doc.moveDown(2);

    const idsToDelete = [];

    // Loop through payments and add them to the PDF
    for (const p of payments) {
      idsToDelete.push(p._id);
      
      doc.fontSize(14).text(`Receipt: ${p.receiptNumber || "N/A"}`, { underline: true });
      doc.fontSize(12).text(`Date: ${p.paidOn ? p.paidOn.toISOString().split("T")[0] : "—"}`);
      doc.text(`Tenant: ${p.tenant?.name || "—"} (${p.tenant?.phone || "—"})`);
      doc.text(`Building: ${p.building?.name || "—"} | Room: ${p.room?.roomNumber || "—"}`);
      doc.text(`Type: ${p.type.toUpperCase()}`);
      doc.text(`Method: ${p.paymentMethod.toUpperCase()}`);
      doc.text(`Status: ${p.status.toUpperCase()}`);
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
    }

    // Finalize the PDF
    doc.end();

    // 🛑 ONCE THE DOWNLOAD FINISHES, DELETE THE DATA FROM MONGO ATLAS
    res.on('finish', async () => {
      // If you change your mind about deleting, just comment out the line below!
      await Payment.deleteMany({ _id: { $in: idsToDelete } });
    });

  } catch (err) {
    next(err);
  }
};
