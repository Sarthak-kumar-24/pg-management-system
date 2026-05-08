const Payment = require("../models/Payment");
const Tenant = require("../models/Tenant");

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
      .sort({ year: -1, month: -1, createdAt: -1 });
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
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const filter = { type: "rent", month, year };
    if (req.query.building) filter.building = req.query.building;
    const payments = await Payment.find(filter);
    const totalExpected = payments.reduce((s, p) => s + p.amount, 0);
    const totalCollected = payments
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.amount, 0);
    const totalPending = payments
      .filter((p) => p.status !== "paid")
      .reduce((s, p) => s + p.amount, 0);
    const overdueCount = payments.filter((p) => p.status === "overdue").length;
    res.json({
      totalExpected,
      totalCollected,
      totalPending,
      overdueCount,
      month,
      year,
    });
  } catch (err) {
   // res.status(500).json({ error: err.message });
    next(err);
  }
};
