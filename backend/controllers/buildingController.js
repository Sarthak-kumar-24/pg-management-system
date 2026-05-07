const Building = require("../models/Building");
const Room = require("../models/Room");
const Tenant = require("../models/Tenant");

// GET /api/buildings
exports.list = async (req, res) => {
  try {
    const buildings = await Building.find({ isActive: true }).sort({
      createdAt: -1,
    });
    const result = await Promise.all(
      buildings.map(async (b) => {
        const rooms = await Room.find({ building: b._id });
        const totalBeds = rooms.reduce((s, r) => s + r.totalBeds, 0);
        const occupiedBeds = rooms.reduce(
          (s, r) => s + r.beds.filter((bed) => bed.isOccupied).length,
          0,
        );
        const activeTenants = await Tenant.countDocuments({
          building: b._id,
          status: "active",
        });
        return {
          ...b.toObject(),
          totalRooms: rooms.length,
          totalBeds,
          occupiedBeds,
          vacantBeds: totalBeds - occupiedBeds,
          activeTenants,
        };
      }),
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/buildings/:id
exports.get = async (req, res) => {
  try {
    const b = await Building.findById(req.params.id).populate(
      "owner",
      "name email",
    );
    if (!b) return res.status(404).json({ error: "Building not found" });
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/buildings
exports.create = async (req, res) => {
  try {
    const b = await Building.create({ ...req.body, owner: req.user.id });
    res.status(201).json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/buildings/:id
exports.update = async (req, res) => {
  try {
    const b = await Building.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!b) return res.status(404).json({ error: "Building not found" });
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/buildings/:id  (soft delete)
exports.remove = async (req, res) => {
  try {
    await Building.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Building deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
