const r = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const c = require("../controllers/core");

r.use(protect);

r.post("/triage", c.triage);

r.get("/doctors", c.listDoctors);
r.get("/doctors/me/availability", authorize("doctor"), c.getAvailability);
r.put("/doctors/me/availability", authorize("doctor"), c.setAvailability);
r.get("/doctors/:id/slots", c.doctorSlots);
r.get("/reviews/doctor/:id", c.doctorReviews);

r.post("/appointments", authorize("patient"), c.book);
r.get("/appointments/mine", authorize("patient", "doctor"), c.myAppointments);
r.patch("/appointments/:id/status", authorize("patient", "doctor"), c.setStatus);

r.post("/prescriptions", authorize("doctor"), c.writeRx);
r.get("/prescriptions/mine", authorize("patient", "doctor"), c.myRx);
r.get("/prescriptions/patient/:id", authorize("doctor"), c.patientHistory);

r.post("/reviews", authorize("patient"), c.addReview);

r.get("/reminders", authorize("patient"), c.listReminders);
r.post("/reminders", authorize("patient"), c.addReminder);
r.delete("/reminders/:id", authorize("patient"), c.delReminder);

r.get("/notifications", c.listNotifications);
r.patch("/notifications/read-all", c.readAll);

r.get("/vitals", authorize("patient"), c.listVitals);
r.post("/vitals", authorize("patient"), c.addVital);

module.exports = r;
