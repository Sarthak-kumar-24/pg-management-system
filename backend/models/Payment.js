const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    building: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ["rent", "deposit", "deposit_refund", "bill", "penalty", "advance"],
      default: "rent",
    },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number },
    status: {
      type: String,
      enum: ["paid", "pending", "partial", "overdue"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "cheque", "online"],
      default: "cash",
    },
    transactionId: { type: String },
    paidOn: { type: Date },
    dueDate: { type: Date },
    receiptNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

paymentSchema.pre("save", function (next) {
  if (this.isNew && !this.receiptNumber) {
    this.receiptNumber = "RCP" + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
