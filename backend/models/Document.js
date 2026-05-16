const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    building: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["id_proof", "agreement", "receipt", "photo", "other"],
      default: "other",
    },
    fileUrl: { type: String, default: "" },
    fileData: { type: String }, // base64
    mimeType: { type: String },
    fileName: { type: String },
    fileSize: { type: Number }, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Document", documentSchema);
