const Notice = require("../models/Notice");

// GET /api/notices
exports.list = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.building) {
      filter.$or = [{ building: req.query.building }, { building: null }];
    }
    const notices = await Notice.find(filter)
      .populate("postedBy", "name")
      .populate("building", "name")
      .sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/notices
exports.create = async (req, res) => {
  try {
    const notice = await Notice.create({
      ...req.body,
      building: req.body.building || null,
      postedBy: req.user.id,
    });
    await notice.populate("postedBy", "name");
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notices/:id
exports.update = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!notice) return res.status(404).json({ error: "Notice not found" });
    res.json(notice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/notices/:id  (soft delete)
exports.remove = async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
