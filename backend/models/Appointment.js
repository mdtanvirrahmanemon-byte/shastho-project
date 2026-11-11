const m = require("mongoose");
const { Schema } = m;

const s = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM
    symptoms: String,
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled", "completed"],
      default: "pending",
    },
    active: { type: Boolean, default: true }, // pending/confirmed হলে true, স্লট দখলে থাকে
    reminded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// একই ডাক্তার, একই তারিখ ও সময়ে দুটো সক্রিয় অ্যাপয়েন্টমেন্ট ডেটাবেস নিজেই আটকাবে (double-booking prevention)
s.index({ doctor: 1, date: 1, time: 1 }, { unique: true, partialFilterExpression: { active: true } });

module.exports = m.model("Appointment", s);
