const Room = require("../models/Room");

// GET /api/rooms
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    if (req.query.floor) filter.floor = Number(req.query.floor);
    if (req.query.status) filter.status = req.query.status;
    const rooms = await Room.find(filter)
      .populate("building", "name city")
      .populate("beds.tenant", "name phone photo idVerified status")
      .sort({ floor: 1, roomNumber: 1 });
    res.json(rooms);
  } catch (err) {
   // res.status(500).json({ error: err.message });
    next(err);
  }
};

// GET /api/rooms/:id
exports.get = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("building", "name address")
      .populate(
        "beds.tenant",
        "name phone photo idVerified status joiningDate monthlyRent",
      );
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// POST /api/rooms
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    
    // 2. 🛑 FIX: Delete empty strings so Mongoose uses defaults
    if (data.status === "") delete data.status;
    if (data.type === "") delete data.type;
    
    const room = await Room.create(data);
    await room.populate("building", "name");
    res.status(201).json(room);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// PUT /api/rooms/:id
exports.update = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    // 1. Make a copy of the incoming data
    const data = { ...req.body };
    
    // 2. 🛑 FIX: Delete empty strings
    if (data.status === "") delete data.status;
    if (data.type === "") delete data.type;
    const occupiedCount = room.beds.filter(b => b.isOccupied).length;
    
    // New Rules: 1 bed -> max 2, 2 bed -> max 3, 3 bed -> max 4/5
    // We can generalize this as: Max Allowed = Total Beds + 1
    const totalBeds = data.totalBeds || room.totalBeds;
    const maxAllowed = totalBeds + 1; 

    if (occupiedCount > maxAllowed) {
      return res.status(400).json({ 
        error: `Over-occupancy limit reached. For a ${totalBeds} bed room, max ${maxAllowed} tenants are allowed.` 
      });
    }
    
    const { beds, ...rest } = data; // don't overwrite bed assignments via general update
    Object.assign(room, rest);
    await room.save();
    await room.populate("building", "name");
    res.json(room);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};

// DELETE /api/rooms/:id
exports.remove = async (req, res,next) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: "Room deleted" });
  } catch (err) {
   // res.status(500).json({ error: err.message });
    next(err);
  }
};

// PATCH /api/rooms/:id/cleaning  — toggle
exports.toggleCleaning = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: "Room not found" });
    room.needsCleaning = !room.needsCleaning;
    await room.save();
    res.json({ needsCleaning: room.needsCleaning });
  } catch (err) {
   // res.status(500).json({ error: err.message });
    next(err);
  }
};

// GET /api/rooms/vacant/beds  — list all vacant beds for assignment
exports.vacantBeds = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    const rooms = await Room.find({
      ...filter,
      status: { $ne: "maintenance" },
    }).populate("building", "name");
    const list = [];
    rooms.forEach((r) => {
      r.beds.forEach((b) => {
        if (!b.isOccupied && !b.isLocked) {
          list.push({
            roomId: r._id,
            roomNumber: r.roomNumber,
            building: r.building,
            floor: r.floor,
            bedId: b._id,
            bedNumber: b.bedNumber,
            rent: r.monthlyRent,
          });
        }
      });
    });
    res.json(list);
  } catch (err) {
    //res.status(500).json({ error: err.message });
    next(err);
  }
};
