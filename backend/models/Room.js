const mongoose = require("mongoose");

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: Number, required: true },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    isOccupied: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
  },
  { _id: true },
);

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1, min: 1 },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    type: {
      type: String,
      enum: ["single", "double", "triple", "dormitory"],
      default: "single",
    },
    totalBeds: { type: Number, default: 1, min: 1, max: 20 },
    beds: [bedSchema],
    monthlyRent: { type: Number, required: true, min: 0 },
    amenities: [{ type: String }],
    status: {
      type: String,
      enum: ["available", "occupied", "maintenance", "locked"],
      default: "available",
    },
    needsCleaning: { type: Boolean, default: false },
    description: { type: String },
  },
  { timestamps: true },
);

// Auto-initialise beds when room is created or totalBeds changes
roomSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("totalBeds")) {
    const existing = this.beds.length;
    for (let i = existing + 1; i <= this.totalBeds; i++) {
      this.beds.push({ bedNumber: i });
    }
    // Trim if beds reduced
    if (this.beds.length > this.totalBeds) {
      this.beds = this.beds.slice(0, this.totalBeds);
    }
  }
  next();
});

module.exports = mongoose.model("Room", roomSchema);
