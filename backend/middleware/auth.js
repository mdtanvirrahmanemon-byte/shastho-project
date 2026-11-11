const jwt = require("jsonwebtoken");
const User = require("../models/User");

// লগইন করা কিনা যাচাই করে
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "লগইন করুন" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "ইউজার পাওয়া যায়নি" });
    if (user.isBlocked) return res.status(403).json({ message: "আপনার অ্যাকাউন্ট ব্লক করা হয়েছে" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "টোকেন সঠিক নয় বা মেয়াদ শেষ" });
  }
};

// role যাচাই করে: authorize("admin"), authorize("doctor", "admin")
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "এই কাজের অনুমতি আপনার নেই" });
  }
  next();
};
