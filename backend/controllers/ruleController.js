const Rule = require("../models/Rule");

exports.list = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ createdAt: 1 });
    res.json(rules);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.get = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    res.json(rule);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const rule = await Rule.create(req.body);
    res.status(201).json(rule);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rule);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: "Rule deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
