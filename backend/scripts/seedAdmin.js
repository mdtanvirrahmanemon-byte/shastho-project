require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.env.ADMIN_EMAIL;
  if (await User.findOne({ email })) {
    console.log("Admin আগেই আছে");
  } else {
    await User.create({
      name: "Admin",
      email,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
    });
    console.log("Admin তৈরি হয়েছে:", email);
  }
  await mongoose.disconnect();
})();
