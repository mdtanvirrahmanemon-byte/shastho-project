const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["patient", "doctor", "admin"], default: "patient" },
    specialty: { type: String },
    fee: { type: Number },
    // ডাক্তারের উপলব্ধ সময়: day 0=রবি ... 6=শনি, প্রতি স্লট ৩০ মিনিট
    availability: [{ day: Number, start: String, end: String, _id: false }],
    isApproved: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
