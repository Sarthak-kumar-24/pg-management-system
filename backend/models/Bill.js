const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema(
  {
    floor: { type: Number },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
    amount: { type: Number },
    status: { type: String, enum: ["paid", "pending"], default: "pending" },
  },
  { _id: false },
);

const billSchema = new mongoose.Schema(
  {
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    type: {
      type: String,
      enum: ["electricity", "water", "wifi", "maintenance", "other"],
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    splitMethod: {
      type: String,
      enum: ["equal", "per_room", "per_tenant"],
      default: "equal",
    },
    splitDetails: [splitSchema],
    description: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Bill", billSchema);
