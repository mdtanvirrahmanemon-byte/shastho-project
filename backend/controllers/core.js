const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { Prescription, Review, Reminder, Notification, Vital, AuditLog } = require("../models/Extras");
const { wrap, notify, audit } = require("../utils/helpers");
const { allSlots, futureSlots, localDate, nowMin, toMin } = require("../utils/slots");
const { triage, flagVital } = require("../utils/rules");

const same = (a, b) => String(a) === String(b);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------- Triage ----------
exports.triage = wrap(async (req, res) => {
  const { symptoms, child } = req.body;
  if (!Array.isArray(symptoms) || !symptoms.length) return res.status(400).json({ message: "লক্ষণ বেছে নিন" });
  res.json(triage(symptoms, !!child));
});

// ---------- Doctors ----------
exports.listDoctors = wrap(async (req, res) => {
  const f = { role: "doctor", isApproved: true, isBlocked: false };
  if (req.query.specialty) f.specialty = req.query.specialty;
  if (req.query.q) f.name = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const docs = await User.find(f).select("name specialty fee").lean();
  const agg = await Review.aggregate([{ $group: { _id: "$doctor", avg: { $avg: "$rating" }, count: { $sum: 1 } } }]);
  const map = Object.fromEntries(agg.map((r) => [String(r._id), r]));
  res.json(
    docs.map((d) => {
      const r = map[String(d._id)];
      return { ...d, rating: r ? +r.avg.toFixed(1) : 0, reviews: r ? r.count : 0 };
    })
  );
});

exports.doctorSlots = wrap(async (req, res) => {
  const doc = await User.findOne({ _id: req.params.id, role: "doctor", isApproved: true, isBlocked: false });
  if (!doc) return res.status(404).json({ message: "ডাক্তার পাওয়া যায়নি" });
  const date = req.query.date;
  const slots = futureSlots(doc.availability, date);
  const booked = (await Appointment.find({ doctor: doc._id, date, active: true }).select("time")).map((a) => a.time);
  res.json(slots.map((time) => ({ time, booked: booked.includes(time) })));
});

exports.getAvailability = wrap(async (req, res) => res.json(req.user.availability || []));

exports.setAvailability = wrap(async (req, res) => {
  const list = req.body.availability;
  if (!Array.isArray(list)) return res.status(400).json({ message: "ডেটা সঠিক নয়" });
  for (const a of list) {
    if (!Number.isInteger(a.day) || a.day < 0 || a.day > 6 || !TIME.test(a.start) || !TIME.test(a.end) || toMin(a.start) >= toMin(a.end)) {
      return res.status(400).json({ message: "সময় সঠিক নয় (শুরু অবশ্যই শেষের আগে হতে হবে)" });
    }
  }
  req.user.availability = list.map(({ day, start, end }) => ({ day, start, end }));
  await req.user.save();
  res.json({ message: "সময় সেভ হয়েছে" });
});

// ---------- Appointments ----------
exports.book = wrap(async (req, res) => {
  const { doctor, date, time, symptoms } = req.body;
  const doc = await User.findOne({ _id: doctor, role: "doctor", isApproved: true, isBlocked: false });
  if (!doc) return res.status(404).json({ message: "ডাক্তার পাওয়া যায়নি" });
  if (!futureSlots(doc.availability, date).includes(time)) {
    return res.status(400).json({ message: "এই সময়ে ডাক্তার পাওয়া যাবে না" });
  }
  try {
    const a = await Appointment.create({ patient: req.user._id, doctor: doc._id, date, time, symptoms });
    notify(doc._id, `নতুন অ্যাপয়েন্টমেন্ট: ${req.user.name}, ${date} ${time}`);
    notify(req.user._id, `অ্যাপয়েন্টমেন্ট অনুরোধ জমা হয়েছে: ${doc.name}, ${date} ${time}`);
    res.status(201).json(a);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "এই স্লট আগেই বুক হয়ে গেছে" });
    throw e;
  }
});

exports.myAppointments = wrap(async (req, res) => {
  const isDoc = req.user.role === "doctor";
  const list = await Appointment.find(isDoc ? { doctor: req.user._id } : { patient: req.user._id })
    .populate("doctor", "name specialty")
    .populate("patient", "name")
    .sort({ date: -1, time: -1 })
    .lean();
  const ids = list.map((a) => a._id);
  const [rv, rx] = await Promise.all([
    Review.find({ appointment: { $in: ids } }).select("appointment"),
    Prescription.find({ appointment: { $in: ids } }).select("appointment"),
  ]);
  const rvSet = new Set(rv.map((x) => String(x.appointment)));
  const rxSet = new Set(rx.map((x) => String(x.appointment)));
  res.json(list.map((a) => ({ ...a, reviewed: rvSet.has(String(a._id)), hasRx: rxSet.has(String(a._id)) })));
});

exports.setStatus = wrap(async (req, res) => {
  const { status } = req.body;
  const a = await Appointment.findById(req.params.id).populate("doctor", "name").populate("patient", "name");
  if (!a) return res.status(404).json({ message: "অ্যাপয়েন্টমেন্ট পাওয়া যায়নি" });
  const isP = same(a.patient._id, req.user._id);
  const isD = same(a.doctor._id, req.user._id);
  const table = isP
    ? { cancelled: ["pending", "confirmed"] }
    : isD
    ? { confirmed: ["pending"], rejected: ["pending"], completed: ["confirmed"], cancelled: ["pending", "confirmed"] }
    : null;
  if (!table) return res.status(403).json({ message: "অনুমতি নেই" });
  if (!table[status] || !table[status].includes(a.status)) return res.status(400).json({ message: "এই পরিবর্তন করা যাবে না" });
  a.status = status;
  a.active = ["pending", "confirmed"].includes(status);
  await a.save();
  const who = isP ? a.patient.name : a.doctor.name;
  const label = { confirmed: "নিশ্চিত", rejected: "প্রত্যাখ্যাত", cancelled: "বাতিল", completed: "সম্পন্ন" }[status];
  notify(isP ? a.doctor._id : a.patient._id, `${who}: অ্যাপয়েন্টমেন্ট (${a.date} ${a.time}) ${label} হয়েছে`);
  res.json(a);
});

// ---------- Prescriptions ----------
exports.writeRx = wrap(async (req, res) => {
  const { appointment, medicines, advice } = req.body;
  const a = await Appointment.findById(appointment);
  if (!a || !same(a.doctor, req.user._id)) return res.status(404).json({ message: "অ্যাপয়েন্টমেন্ট পাওয়া যায়নি" });
  if (!["confirmed", "completed"].includes(a.status)) return res.status(400).json({ message: "আগে অ্যাপয়েন্টমেন্ট নিশ্চিত করুন" });
  const meds = (medicines || []).filter((m) => m.name && m.name.trim());
  if (!meds.length) return res.status(400).json({ message: "অন্তত একটি ওষুধ লিখুন" });
  try {
    const rx = await Prescription.create({ appointment: a._id, patient: a.patient, doctor: req.user._id, medicines: meds, advice });
    if (a.status !== "completed") {
      a.status = "completed";
      a.active = false;
      await a.save();
    }
    notify(a.patient, `${req.user.name} আপনার প্রেসক্রিপশন লিখেছেন`);
    res.status(201).json(rx);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "এই অ্যাপয়েন্টমেন্টের প্রেসক্রিপশন আগেই লেখা হয়েছে" });
    throw e;
  }
});

exports.myRx = wrap(async (req, res) => {
  const f = req.user.role === "doctor" ? { doctor: req.user._id } : { patient: req.user._id };
  const list = await Prescription.find(f)
    .populate("doctor", "name specialty")
    .populate("patient", "name")
    .populate("appointment", "date time")
    .sort({ createdAt: -1 });
  res.json(list);
});

// ডাক্তার রোগীর ইতিহাস দেখবে: শুধু যে রোগীর সঙ্গে তার অ্যাপয়েন্টমেন্ট আছে, আর প্রতিবার audit log হবে
exports.patientHistory = wrap(async (req, res) => {
  const related = await Appointment.exists({ doctor: req.user._id, patient: req.params.id });
  if (!related) return res.status(403).json({ message: "এই রোগীর ইতিহাস দেখার অনুমতি নেই" });
  await audit(req.user._id, "VIEW_PATIENT_HISTORY", req.params.id, "prescriptions");
  const list = await Prescription.find({ patient: req.params.id }).populate("doctor", "name specialty").populate("appointment", "date").sort({ createdAt: -1 });
  res.json(list);
});

// ---------- Reviews ----------
exports.addReview = wrap(async (req, res) => {
  const { appointment, rating, comment } = req.body;
  const a = await Appointment.findById(appointment);
  if (!a || !same(a.patient, req.user._id)) return res.status(404).json({ message: "অ্যাপয়েন্টমেন্ট পাওয়া যায়নি" });
  if (a.status !== "completed") return res.status(400).json({ message: "ভিজিট শেষ হলে রিভিউ দেওয়া যাবে" });
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) return res.status(400).json({ message: "রেটিং ১ থেকে ৫ হতে হবে" });
  try {
    const rv = await Review.create({ appointment: a._id, doctor: a.doctor, patient: req.user._id, rating: r, comment });
    res.status(201).json(rv);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "আগেই রিভিউ দিয়েছেন" });
    throw e;
  }
});

exports.doctorReviews = wrap(async (req, res) => {
  res.json(await Review.find({ doctor: req.params.id }).populate("patient", "name").sort({ createdAt: -1 }).limit(20));
});

// ---------- Medicine reminders ----------
exports.listReminders = wrap(async (req, res) => res.json(await Reminder.find({ user: req.user._id }).sort({ time: 1 })));
exports.addReminder = wrap(async (req, res) => {
  const { name, time } = req.body;
  if (!name || !name.trim() || !TIME.test(time || "")) return res.status(400).json({ message: "নাম ও সময় দিন" });
  res.status(201).json(await Reminder.create({ user: req.user._id, name: name.trim(), time }));
});
exports.delReminder = wrap(async (req, res) => {
  await Reminder.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ message: "মুছে গেছে" });
});

// ---------- Notifications ----------
exports.listNotifications = wrap(async (req, res) =>
  res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50))
);
exports.readAll = wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: "ok" });
});

// ---------- Vitals ----------
exports.listVitals = wrap(async (req, res) => {
  const list = await Vital.find({ patient: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(list.map((v) => ({ ...v, flag: flagVital(v.type, v.value, v.value2) })));
});
exports.addVital = wrap(async (req, res) => {
  const { type, value, value2 } = req.body;
  if (!["bp", "sugar", "weight", "heartRate"].includes(type) || !(Number(value) > 0)) return res.status(400).json({ message: "মান সঠিক নয়" });
  if (type === "bp" && !(Number(value2) > 0)) return res.status(400).json({ message: "BP-র দুটো মান দিন" });
  const v = await Vital.create({ patient: req.user._id, type, value: Number(value), value2: type === "bp" ? Number(value2) : undefined });
  res.status(201).json({ ...v.toObject(), flag: flagVital(v.type, v.value, v.value2) });
});

// ---------- Admin extras ----------
exports.allUsers = wrap(async (req, res) => res.json(await User.find().select("-password").sort({ createdAt: -1 })));
exports.auditLogs = wrap(async (req, res) =>
  res.json(await AuditLog.find().populate("actor", "name role").populate("target", "name").sort({ createdAt: -1 }).limit(100))
);
