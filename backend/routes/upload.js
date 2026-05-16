const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Tenant = require("../models/Tenant");

// 1. Configure Cloudinary (Get these keys free from cloudinary.com)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// 2. Configure Multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "pg_avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 150, height: 150, crop: "fill" }] // Instantly crops to a perfect square!
  },
});
const upload = multer({ storage: storage });

// 3. The Upload Endpoint (Called by the Tenant Portal)
router.post("/tenant/:id/avatar", upload.single("avatar"), async (req, res) => {
  try {
    const tenantId = req.params.id;
    const imageUrl = req.file.path; // The permanent Cloudinary URL

    // Update the database
    await Tenant.findByIdAndUpdate(tenantId, { profilePicture: imageUrl });

    // 🌟 THE MAGIC: Broadcast to the Admin Dashboard instantly
    const io = req.app.get("socketio"); 
    if (io) {
      io.emit("avatarUpdated", { tenantId: tenantId, newImageUrl: imageUrl });
    }

    res.json({ message: "Upload successful", url: imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
