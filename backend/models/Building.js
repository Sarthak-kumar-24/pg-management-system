const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String },
    totalFloors: { type: Number, default: 1, min: 1 },
    type: { type: String, enum: ["boys", "girls", "co-ed"], default: "co-ed" },
    amenities: [{ type: String }],
    wifiCost: { type: Number, default: 0 },
    maintenanceCost: { type: Number, default: 0 },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Building", buildingSchema);
