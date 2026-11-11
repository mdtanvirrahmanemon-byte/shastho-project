// Express app আলাদা ফাইলে রাখা হয়েছে, যাতে টেস্ট (supertest) সার্ভার চালু না করেই এটা ব্যবহার করতে পারে
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URL || "").split(",") }));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "Shastho API running" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api", require("./routes/apiRoutes"));

module.exports = app;
