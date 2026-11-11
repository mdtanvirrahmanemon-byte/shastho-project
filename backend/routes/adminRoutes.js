const router = require("express").Router();
const a = require("../controllers/adminController");
const c = require("../controllers/core");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

router.get("/stats", a.stats);
router.get("/users", c.allUsers);
router.get("/audit", c.auditLogs);
router.get("/doctors/pending", a.pendingDoctors);
router.patch("/doctors/:id/approve", a.approveDoctor);
router.patch("/users/:id/block", a.blockUser);

module.exports = router;
