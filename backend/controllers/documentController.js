
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const Document = require("../models/Document");

// 1. Configure Cloudinary (Pulls from your .env file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Configure Multer (Memory Storage + 4MB Limit)
const storage = multer.memoryStorage();
exports.uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // Strictly 4 MB
}).single("docFile"); // Must match the FormData name from the frontend


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

    // Don't send massive base64 strings in the list for performance
    res.json(
      docs.map((d) => {
        const obj = d.toObject();
        // 🛑 FIXED: Check BOTH the old fileData AND the new Cloudinary fileUrl
        obj.hasFile = !!(obj.fileUrl || obj.fileData); 
        delete obj.fileData; 
        return obj;
      })
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

// POST /api/documents (The unified Cloudinary Upload handler)
/*
exports.create = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { name, type, building, tenant } = req.body;

    // Use a Promise to handle the Cloudinary upload stream
    const uploadToCloudinary = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "PG_Prabhat-Pg(Noida)", resource_type: "auto" }, // "auto" allows PDFs and Images
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      // Pipe the file buffer from RAM directly to Cloudinary
      stream.end(req.file.buffer);
    });

    const cloudResult = await uploadToCloudinary;

    // Save the Cloudinary URL to MongoDB
    const doc = await Document.create({
      name,
      type,
      building,
      tenant: tenant || null,
      fileUrl: cloudResult.secure_url, // 🛑 The magic Cloudinary link!
      uploadedBy: req.user ? req.user.id : null // Safe check for auth
    });

    await doc.populate("tenant", "name");
    await doc.populate("building", "name");
    
    res.status(201).json(doc);
  } catch (err) {
    // Catch Multer size limit errors cleanly
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File exceeds the 4 MB limit." });
    }
    res.status(500).json({ error: err.message });
  }
};
*/
// POST /api/documents (The unified Cloudinary Upload handler)
exports.create = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { name, type, building, tenant } = req.body;

    // 🛑 THE ULTIMATE FIX: Dynamically detect PDFs and force them into the "raw" bucket.
    // Images (JPG/PNG) will stay as "auto" so they render properly.
    const isPDF = req.file.mimetype === 'application/pdf';
    const dynamicResourceType = isPDF ? 'raw' : 'auto';

    // Use a Promise to handle the Cloudinary upload stream
    const uploadToCloudinary = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { 
          folder: "PG_Prabhat-Pg(Noida)", 
          resource_type: dynamicResourceType // 🛑 Cloudinary will now obey this strictly
        }, 
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      // Pipe the file buffer from RAM directly to Cloudinary
      stream.end(req.file.buffer);
    });

    const cloudResult = await uploadToCloudinary;

    // Save the Cloudinary URL to MongoDB
    const doc = await Document.create({
      name,
      type,
      building,
      tenant: tenant || null,
      fileUrl: cloudResult.secure_url, 
      uploadedBy: req.user ? req.user.id : null 
    });

    await doc.populate("tenant", "name");
    await doc.populate("building", "name");
    
    res.status(201).json(doc);
  } catch (err) {
    // Catch Multer size limit errors cleanly
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File exceeds the 4 MB limit." });
    }
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/documents/:id
exports.remove = async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    // Note: To be perfectly clean, you could also delete the file from Cloudinary here later!
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
