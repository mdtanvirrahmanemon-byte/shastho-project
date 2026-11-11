const Appointment = require("../models/Appointment");
const { notify } = require("../utils/helpers");
const { localDate, nowMin, toMin } = require("../utils/slots");

// প্রতি মিনিটে চলে: আজকের নিশ্চিত অ্যাপয়েন্টমেন্ট ৩০ মিনিটের মধ্যে হলে দুজনকে রিমাইন্ডার পাঠায়
module.exports = function startReminderJob() {
  setInterval(async () => {
    try {
      const list = await Appointment.find({ status: "confirmed", date: localDate(), reminded: false })
        .populate("doctor", "name")
        .populate("patient", "name");
      for (const a of list) {
        const diff = toMin(a.time) - nowMin();
        if (diff >= 0 && diff <= 30) {
          notify(a.patient._id, `রিমাইন্ডার: ${a.doctor.name}-এর সঙ্গে অ্যাপয়েন্টমেন্ট ${a.time}-এ`);
          notify(a.doctor._id, `রিমাইন্ডার: ${a.patient.name}-এর সঙ্গে অ্যাপয়েন্টমেন্ট ${a.time}-এ`);
          a.reminded = true;
          await a.save();
        }
      }
    } catch (e) {
      console.error("reminder job:", e.message);
    }
  }, 60000);
};
