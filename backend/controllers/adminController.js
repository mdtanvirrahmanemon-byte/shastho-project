const User = require("../models/User");

// GET /api/admin/doctors/pending
exports.pendingDoctors = async (req, res) => {
  const list = await User.find({ role: "doctor", isApproved: false }).select("-password");
  res.json(list);
};

// PATCH /api/admin/doctors/:id/approve
exports.approveDoctor = async (req, res) => {
  const doc = await User.findOneAndUpdate(
    { _id: req.params.id, role: "doctor" },
    { isApproved: true },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: "ডাক্তার পাওয়া যায়নি" });
  res.json({ message: "approve হয়েছে", doctor: doc });
};

// PATCH /api/admin/users/:id/block   (body: { blocked: true/false })
exports.blockUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
  if (user.role === "admin") return res.status(400).json({ message: "অ্যাডমিনকে ব্লক করা যাবে না" });
  user.isBlocked = req.body.blocked !== false;
  await user.save();
  res.json({ message: user.isBlocked ? "ব্লক হয়েছে" : "আনব্লক হয়েছে" });
};

// GET /api/admin/stats
exports.stats = async (req, res) => {
  const [patients, doctors, pending] = await Promise.all([
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor", isApproved: true }),
    User.countDocuments({ role: "doctor", isApproved: false }),
  ]);
  res.json({ patients, doctors, pendingDoctors: pending });
};
