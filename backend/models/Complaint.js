const mongoose = require("mongoose");

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String },
    note: { type: String },
    updatedBy: { type: String },
    date: { type: Date, default: Date.now },
  },
  { _id: false },
);

const complaintSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    building: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "plumbing",
        "electrical",
        "furniture",
        "cleaning",
        "security",
        "internet",
        "other",
      ],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    assignedTo: { type: String },
    resolvedOn: { type: Date },
    resolution: { type: String },
    timeline: [timelineSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Complaint", complaintSchema);
