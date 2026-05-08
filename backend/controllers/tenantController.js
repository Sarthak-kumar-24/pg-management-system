const Tenant = require("../models/Tenant");
const Room = require("../models/Room");
const Payment = require("../models/Payment");

// ── helpers ────────────────────────────────────────────────────────────────
async function assignBed(roomId, bedNumber, tenantId) {
  const room = await Room.findById(roomId);
  if (!room) return;
  const bed = room.beds.find((b) => b.bedNumber === Number(bedNumber));
  if (bed) {
    bed.tenant = tenantId;
    bed.isOccupied = true;
  }
  room.status = room.beds.every((b) => b.isOccupied) ? "occupied" : "available";
 // Forces Mongoose to recognize the array change
  room.markModified("beds");
  await room.save();
}

async function freeBed(roomId, bedNumber) {
  const room = await Room.findById(roomId);
  if (!room) return;
  const bed = room.beds.find((b) => b.bedNumber === Number(bedNumber));
  if (bed) {
    bed.tenant = null;
    bed.isOccupied = false;
  }
  room.status = room.beds.some((b) => b.isOccupied) ? "available" : "available";

  room.markModified("beds");
  await room.save();
}

// ── GET /api/tenants ───────────────────────────────────────────────────────
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.behavior) filter.behavior = req.query.behavior;
    if (req.query.search) {
      const re = new RegExp(req.query.search, "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }];
    }
    const tenants = await Tenant.find(filter)
      .populate("building", "name city")
      .populate("room", "roomNumber floor")
      .sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/tenants/:id ───────────────────────────────────────────────────
exports.get = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate("building", "name address city")
      .populate("room", "roomNumber floor type monthlyRent totalBeds");
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    const payments = await Payment.find({ tenant: req.params.id })
      .sort({ year: -1, month: -1 })
      .limit(24);
    res.json({ ...tenant.toObject(), payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/tenants ──────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.status === "") delete data.status;
    if (data.behavior === "") delete data.behavior;
    if (data.idType === "") delete data.idType;
    
    const tenant = await Tenant.create(data);

    // Assign bed in room
    if (tenant.room && tenant.bedNumber) {
      await assignBed(tenant.room, tenant.bedNumber, tenant._id);
    }

    // Create deposit payment record
    if (tenant.depositAmount > 0) {
      await Payment.create({
        tenant: tenant._id,
        room: tenant.room,
        building: tenant.building,
        amount: tenant.depositAmount,
        type: "deposit",
        status: tenant.depositPaid ? "paid" : "pending",
        paidOn: tenant.depositPaid ? new Date() : null,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        notes: "Security deposit",
      });
    }

    await tenant.populate("building", "name");
    await tenant.populate("room", "roomNumber floor");
    res.status(201).json(tenant);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// ── PUT /api/tenants/:id ───────────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const old = await Tenant.findById(req.params.id);
    if (!old) return res.status(404).json({ error: "Tenant not found" });

    const data = { ...req.body };
    if (data.status === "") delete data.status;
    if (data.behavior === "") delete data.behavior;
    if (data.idType === "") delete data.idType;
    
    // If room/bed changed, free old and assign new
    //const newRoom = req.body.room;
    //const newBed = req.body.bedNumber;
    const newRoom = data.room; 
    const newBed = data.bedNumber;
    const oldRoom = old.room?.toString();
    const oldBed = old.bedNumber;

    const isReturning = data.status === "active" && old.status === "vacated";

    if ((newRoom && (newRoom !== oldRoom || newBed !== oldBed)) || (isReturning && newRoom && newBed)) {
      if (oldRoom && oldBed) await freeBed(oldRoom, oldBed);
      await assignBed(newRoom, newBed, old._id);
     }

    // 🛑 FIX: If you mark them as vacated via the Edit form, force-free their bed!
    if (data.status === "vacated" && old.status !== "vacated") {
      if (oldRoom && oldBed) {
        await freeBed(oldRoom, oldBed);
      }
      data.room = null; 
      data.bedNumber = null;
    }

   // const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
    const tenant = await Tenant.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    })
      .populate("building", "name")
      .populate("room", "roomNumber floor");
    res.json(tenant);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// ── DELETE /api/tenants/:id ────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    if (tenant.room && tenant.bedNumber)
      await freeBed(tenant.room, tenant.bedNumber);
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ message: "Tenant deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/tenants/:id/vacate ───────────────────────────────────────────
exports.vacate = async (req, res) => {
  try {
    const { vacatingDate, notes, depositRefunded } = req.body;
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    tenant.status = "vacated";
    tenant.vacatingDate = vacatingDate || new Date();
    if (notes) tenant.notes = notes;
    if (depositRefunded) tenant.depositRefunded = true;
    await tenant.save();

    // Free the bed
    if (tenant.room && tenant.bedNumber)
      await freeBed(tenant.room, tenant.bedNumber);

    // Create deposit refund record if needed
    if (depositRefunded && tenant.depositAmount > 0) {
      await Payment.create({
        tenant: tenant._id,
        room: tenant.room,
        building: tenant.building,
        amount: tenant.depositAmount,
        type: "deposit_refund",
        status: "paid",
        paidOn: new Date(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        notes: "Deposit refund on vacating",
      });
    }

    res.json({ message: "Tenant vacated", tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
