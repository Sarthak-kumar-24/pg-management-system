const Document = require("../models/Document");

// GET /api/documents
exports.list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tenant) filter.tenant = req.query.tenant;
    if (req.query.building) filter.building = req.query.building;
    if (req.query.type) filter.type = req.query.type;
    const docs = await Document.find(filter)
      .populate("tenant", "name phone")
      .populate("building", "name")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });
    // Don't send fileData in list for performance
    res.json(
      docs.map((d) => {
        const obj = d.toObject();
        obj.hasFile = !!obj.fileData;
        delete obj.fileData;
        return obj;
      }),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/documents/:id  (with file data for download)
exports.get = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate("tenant", "name")
      .populate("building", "name");
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/documents
exports.create = async (req, res) => {
  try {
    const doc = await Document.create({ ...req.body, uploadedBy: req.user.id });
    await doc.populate("tenant", "name");
    await doc.populate("building", "name");
    const obj = doc.toObject();
    obj.hasFile = !!obj.fileData;
    delete obj.fileData;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/documents/:id
exports.remove = async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
