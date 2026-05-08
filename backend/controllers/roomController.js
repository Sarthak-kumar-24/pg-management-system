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
    const room = await Room.create(req.body);
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
    const { beds, ...rest } = req.body; // don't overwrite bed assignments via general update
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
