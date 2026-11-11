const m = require("mongoose");
const { Schema } = m;
const ref = (n) => ({ type: Schema.Types.ObjectId, ref: n, required: true });

exports.Prescription = m.model(
  "Prescription",
  new Schema(
    {
      appointment: { ...ref("Appointment"), unique: true },
      patient: ref("User"),
      doctor: ref("User"),
      medicines: [{ name: String, dosage: String, duration: String, _id: false }],
      advice: String,
    },
    { timestamps: true }
  )
);

exports.Review = m.model(
  "Review",
  new Schema(
    {
      appointment: { ...ref("Appointment"), unique: true },
      doctor: ref("User"),
      patient: ref("User"),
      rating: { type: Number, min: 1, max: 5, required: true },
      comment: String,
    },
    { timestamps: true }
  )
);

exports.Reminder = m.model(
  "Reminder",
  new Schema({ user: ref("User"), name: { type: String, required: true }, time: { type: String, required: true } }, { timestamps: true })
);

exports.Notification = m.model(
  "Notification",
  new Schema({ user: ref("User"), message: String, read: { type: Boolean, default: false } }, { timestamps: true })
);

exports.Vital = m.model(
  "Vital",
  new Schema(
    {
      patient: ref("User"),
      type: { type: String, enum: ["bp", "sugar", "weight", "heartRate"], required: true },
      value: { type: Number, required: true },
      value2: Number, // bp-র জন্য diastolic
    },
    { timestamps: true }
  )
);

exports.AuditLog = m.model(
  "AuditLog",
  new Schema({ actor: ref("User"), action: String, target: { type: Schema.Types.ObjectId, ref: "User" }, detail: String }, { timestamps: true })
);
