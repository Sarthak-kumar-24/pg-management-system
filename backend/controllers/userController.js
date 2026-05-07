const User = require("../models/User");

// GET /api/users
exports.list = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users
exports.create = async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body.email });
    if (exists)
      return res.status(400).json({ error: "Email already registered" });
    const user = await User.create(req.body);
    const obj = user.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id
exports.update = async (req, res) => {
  try {
    if (req.user.role !== "owner" && req.user.id !== req.params.id)
      return res.status(403).json({ error: "Access denied" });
    const { password, ...data } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, data, {
      new: true,
    }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id  (soft deactivate)
exports.remove = async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: "Cannot deactivate yourself" });
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
