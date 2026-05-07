const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["general", "emergency", "rule", "event", "maintenance"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      default: null,
    }, // null = all buildings
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notice", noticeSchema);
