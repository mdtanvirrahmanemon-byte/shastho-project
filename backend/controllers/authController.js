const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  specialty: u.specialty,
  isApproved: u.isApproved,
});

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, specialty, fee } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "নাম, ইমেইল ও পাসওয়ার্ড দিন" });
    }
    // admin কখনো register দিয়ে বানানো যাবে না
    if (role && !["patient", "doctor"].includes(role)) {
      return res.status(400).json({ message: "role সঠিক নয়" });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "এই ইমেইল আগেই ব্যবহার হয়েছে" });
    }

    const isDoctor = role === "doctor";
    if (isDoctor && !specialty) {
      return res.status(400).json({ message: "ডাক্তারের specialty দিন" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: isDoctor ? "doctor" : "patient",
      specialty: isDoctor ? specialty : undefined,
      fee: isDoctor ? fee : undefined,
      isApproved: !isDoctor, // ডাক্তার admin approve না করা পর্যন্ত false
    });

    if (isDoctor) {
      return res.status(201).json({
        message: "আবেদন জমা হয়েছে। অ্যাডমিন approve করলে লগইন করতে পারবেন।",
        user: publicUser(user),
      });
    }
    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "সার্ভার সমস্যা", error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "ইমেইল ও পাসওয়ার্ড দিন" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "ইমেইল বা পাসওয়ার্ড ভুল" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "আপনার অ্যাকাউন্ট ব্লক করা হয়েছে" });
    }
    if (user.role === "doctor" && !user.isApproved) {
      return res.status(403).json({ message: "অ্যাডমিন এখনো আপনাকে approve করেনি" });
    }

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "সার্ভার সমস্যা", error: err.message });
  }
};

// GET /api/auth/me
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
