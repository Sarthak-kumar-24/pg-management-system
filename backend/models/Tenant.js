const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    alternatePhone: { type: String },
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    bedNumber: { type: Number },
    joiningDate: { type: Date, required: true },
    vacatingDate: { type: Date },
    noticePeriodStart: { type: Date },
    monthlyRent: { type: Number, required: true, min: 0 },
    depositAmount: { type: Number, default: 0 },
    depositPaid: { type: Boolean, default: false },
    depositRefunded: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "notice_period", "vacated"],
      default: "active",
    },
    behavior: {
      type: String,
      enum: ["disciplined", "moderate", "mischief"],
      default: "moderate",
    },
    idVerified: { type: Boolean, default: false },
    idType: {
      type: String,
      enum: ["", "aadhar", "pan", "passport", "driving_license", "voter_id"],
      default: "",
    },
    idNumber: { type: String },
    photo: { type: String }, // base64 or URL
    occupation: { type: String },
    college: { type: String },
    company: { type: String },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    address: {
      permanent: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    notes: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tenant", tenantSchema);
