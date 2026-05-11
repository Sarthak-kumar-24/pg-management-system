const Room = require("../models/Room");
const Tenant = require("../models/Tenant");

// GET /api/rooms

exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    if (req.query.floor) filter.floor = Number(req.query.floor);
    if (req.query.status) filter.status = req.query.status;

    // 1. Fetch rooms using .lean() so we can dynamically overwrite the beds array
    const rooms = await Room.find(filter)
      .populate("building", "name city")
      .sort({ floor: 1, roomNumber: 1 })
      .lean();

    // 2. Fetch all ACTIVE tenants to find exactly who is living where right now
    const activeTenants = await Tenant.find({
      status: { $in: ["active", "notice_period"] }
    }).select("name phone photo idVerified status room bedNumber");

    // 3. Force the Room's bed array to perfectly match the actual living tenants
    rooms.forEach(room => {
      // Find all tenants assigned to this specific room
      const occupants = activeTenants.filter(t => t.room && t.room.toString() === room._id.toString());
      
      let dynamicBeds = [];
      const totalBeds = room.totalBeds || 1;

      // Fill the official physical beds first
      for (let i = 1; i <= totalBeds; i++) {
        // Try to find a tenant specifically assigned to this bed, otherwise grab the first available
        let tIndex = occupants.findIndex(t => t.bedNumber == i);
        if (tIndex === -1 && occupants.length > 0) tIndex = 0; 

        if (tIndex !== -1) {
          dynamicBeds.push({ bedNumber: i, isOccupied: true, tenant: occupants[tIndex] });
          occupants.splice(tIndex, 1); // Remove from the waiting pool
        } else {
          dynamicBeds.push({ bedNumber: i, isOccupied: false, isLocked: false, tenant: null });
        }
      }

      // 4. Overbooking: If there are STILL tenants left, add them as "Extra" beds!
      occupants.forEach((extraT, i) => {
        dynamicBeds.push({ 
          bedNumber: `+${i + 1}`, // Will visually show as "🛏 +1" on the UI
          isOccupied: true, 
          tenant: extraT, 
          isExtra: true 
        });
      });

      room.beds = dynamicBeds;
    });

    res.json(rooms);
  } catch (err) {
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
    
    // 2. FIX: Delete empty strings
    if (data.status === "") delete data.status;
    if (data.type === "") delete data.type;
    
    // 3. Apply your custom capacity rules
    const totalBeds = data.totalBeds || room.totalBeds || 1;
    let maxAllowed = totalBeds;
    if (totalBeds === 1) maxAllowed = 2;
    else if (totalBeds === 2) maxAllowed = 3;
    else if (totalBeds >= 3) maxAllowed = 5;

    // 4. Count REAL active tenants instead of looking at static beds
    const currentOccupants = await Tenant.countDocuments({ 
      room: room._id, 
      status: { $in: ['active', 'notice_period'] } 
    });

    if (currentOccupants > maxAllowed) {
      return res.status(400).json({ 
        error: `Over-occupancy limit! A ${totalBeds}-bed room allows max ${maxAllowed} tenants, but ${currentOccupants} are currently living here.` 
      });
    }
    
    const { beds, ...rest } = data; // don't overwrite bed assignments via general update
    Object.assign(room, rest);
    await room.save();
    await room.populate("building", "name");
    res.json(room);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rooms/:id
exports.remove = async (req, res,next) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: "Room deleted" });
  } catch (err) {
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
  
    next(err);
  }
};
