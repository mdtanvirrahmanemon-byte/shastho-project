const { Notification, AuditLog } = require("../models/Extras");

exports.notify = (user, message) => Notification.create({ user, message }).catch(() => {});
exports.audit = (actor, action, target, detail = "") => AuditLog.create({ actor, action, target, detail }).catch(() => {});

// async error handler (Express 4)
exports.wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => res.status(500).json({ message: "সার্ভার সমস্যা", error: e.message }));
