const Complaint = require("../models/Complaint");

// GET /api/complaints
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.building) filter.building = req.query.building;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.tenant) filter.tenant = req.query.tenant;
    const complaints = await Complaint.find(filter)
      .populate("tenant", "name phone")
      .populate("building", "name")
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/complaints/:id
exports.get = async (req, res) => {
  try {
    const c = await Complaint.findById(req.params.id)
      .populate("tenant", "name phone")
      .populate("building", "name")
      .populate("room", "roomNumber");
    if (!c) return res.status(404).json({ error: "Complaint not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints
exports.create = async (req, res) => {
  try {
    const complaint = await Complaint.create({
      ...req.body,
      timeline: [
        { status: "open", note: "Complaint raised", updatedBy: req.user.name },
      ],
    });
    await complaint.populate("building", "name");
    await complaint.populate("tenant", "name");
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/complaints/:id
exports.update = async (req, res) => {
  try {
    const { status, note, assignedTo, resolution, ...rest } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint)
      return res.status(404).json({ error: "Complaint not found" });
    Object.assign(complaint, rest);
    if (assignedTo !== undefined) complaint.assignedTo = assignedTo;
    if (status && status !== complaint.status) {
      complaint.status = status;
      complaint.timeline.push({
        status,
        note: note || `Status changed to ${status}`,
        updatedBy: req.user.name,
      });
      if (status === "resolved") {
        complaint.resolvedOn = new Date();
        complaint.resolution = resolution;
      }
    }
    await complaint.save();
    await complaint.populate("building", "name");
    await complaint.populate("tenant", "name");
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/complaints/:id
exports.remove = async (req, res) => {
  try {
    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: "Complaint deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
