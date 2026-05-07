const Bill = require("../models/Bill");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");

// GET /api/bills
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.year) filter.year = Number(req.query.year);
    const bills = await Bill.find(filter)
      .populate("building", "name")
      .populate("splitDetails.room", "roomNumber")
      .populate("splitDetails.tenant", "name")
      .sort({ year: -1, month: -1, createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/bills — create and auto-split
exports.create = async (req, res) => {
  try {
    const {
      building,
      type,
      month,
      year,
      totalAmount,
      splitMethod,
      description,
    } = req.body;
    if (!building || !type || !month || !year || !totalAmount)
      return res
        .status(400)
        .json({ error: "building, type, month, year, totalAmount required" });

    const rooms = await Room.find({ building });
    const tenants = await Tenant.find({ building, status: "active" });
    let splitDetails = [];

    if (splitMethod === "per_room") {
      const count = rooms.length || 1;
      const perRoom = +(totalAmount / count).toFixed(2);
      splitDetails = rooms.map((r) => ({
        room: r._id,
        amount: perRoom,
        status: "pending",
      }));
    } else {
      // equal / per_tenant
      const count = tenants.length || 1;
      const perPerson = +(totalAmount / count).toFixed(2);
      splitDetails = tenants.map((t) => ({
        tenant: t._id,
        room: t.room,
        amount: perPerson,
        status: "pending",
      }));
    }

    const bill = await Bill.create({
      building,
      type,
      month: Number(month),
      year: Number(year),
      totalAmount: Number(totalAmount),
      splitMethod: splitMethod || "equal",
      splitDetails,
      description,
      addedBy: req.user.id,
    });
    await bill.populate("building", "name");
    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/bills/:id
exports.update = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("building", "name");
    if (!bill) return res.status(404).json({ error: "Bill not found" });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/bills/:id
exports.remove = async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ message: "Bill deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
