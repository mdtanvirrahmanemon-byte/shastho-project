// ইন্টিগ্রেশন টেস্ট: আসল API ও ডেটাবেসে চলে।
// .env-এ আলাদা টেস্ট ডেটাবেসের লিংক দিন, যেমন:
// TEST_MONGO_URI=mongodb+srv://emon:পাসওয়ার্ড@cluster0.zmhu72q.mongodb.net/shastho_test
// ডেটাবেসের নামে "test" না থাকলে টেস্ট চলবে না, যাতে আসল ডেটা মুছে না যায়।
require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");

const uri = process.env.TEST_MONGO_URI;
const run = uri ? describe : describe.skip;
jest.setTimeout(30000);

run("API integration (auth, RBAC, booking)", () => {
  let app, Appointment, User, localDate;
  let pTok, p2Tok, doctor, date, firstApptId;

  const reg = (name, email, extra = {}) =>
    request(app).post("/api/auth/register").send({ name, email, password: "123456", ...extra });
  const auth = (tok) => ({ Authorization: "Bearer " + tok });

  beforeAll(async () => {
    const dbName = (uri.split("/").pop() || "").split("?")[0];
    if (!/test/i.test(dbName)) throw new Error("TEST_MONGO_URI-এর ডেটাবেসের নামে 'test' থাকতে হবে (যেমন shastho_test)");
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
    await mongoose.connect(uri);
    await mongoose.connection.dropDatabase();
    app = require("../app");
    User = require("../models/User");
    Appointment = require("../models/Appointment");
    ({ localDate } = require("../utils/slots"));
    await Appointment.syncIndexes();
    date = localDate(new Date(Date.now() + 7 * 864e5));
    doctor = await User.create({
      name: "Test Doctor", email: "doc@test.com", password: "123456", role: "doctor", specialty: "Medicine",
      isApproved: true, availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: "10:00", end: "13:00" })),
    });
    pTok = (await reg("P One", "p1@test.com")).body.token;
    p2Tok = (await reg("P Two", "p2@test.com")).body.token;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("Register সফল হলে 201 ও token আসে", async () => {
    const r = await reg("New User", "new@test.com");
    expect(r.status).toBe(201);
    expect(typeof r.body.token).toBe("string");
  });

  test("একই ইমেইলে আবার register করলে 409", async () => {
    expect((await reg("Dup", "p1@test.com")).status).toBe(409);
  });

  test("Login সফল হলে 200", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "p1@test.com", password: "123456" });
    expect(r.status).toBe(200);
  });

  test("ভুল পাসওয়ার্ডে login করলে 401", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "p1@test.com", password: "wrong" });
    expect(r.status).toBe(401);
  });

  test("token ছাড়া সুরক্ষিত API-তে 401", async () => {
    expect((await request(app).get("/api/doctors")).status).toBe(401);
  });

  test("রোগী Admin API ব্যবহার করতে গেলে 403 (RBAC)", async () => {
    expect((await request(app).get("/api/admin/stats").set(auth(pTok))).status).toBe(403);
  });

  test("Register দিয়ে Admin হওয়া যায় না", async () => {
    const r = await reg("Hacker", "h@test.com", { role: "admin" });
    expect(r.status).toBe(400);
  });

  test("নতুন ডাক্তার approve ছাড়া login করতে পারে না (403)", async () => {
    const r1 = await reg("Doc New", "docnew@test.com", { role: "doctor", specialty: "Medicine" });
    expect(r1.status).toBe(201);
    const r2 = await request(app).post("/api/auth/login").send({ email: "docnew@test.com", password: "123456" });
    expect(r2.status).toBe(403);
  });

  test("খালি স্লটে বুকিং সফল (201)", async () => {
    const r = await request(app).post("/api/appointments").set(auth(pTok))
      .send({ doctor: String(doctor._id), date, time: "10:00", symptoms: "test" });
    expect(r.status).toBe(201);
    firstApptId = r.body._id;
  });

  test("একই স্লটে দ্বিতীয় রোগীর বুকিং আটকে যায় (409) — double-booking prevention", async () => {
    const r = await request(app).post("/api/appointments").set(auth(p2Tok))
      .send({ doctor: String(doctor._id), date, time: "10:00" });
    expect(r.status).toBe(409);
  });

  test("ডাক্তারের উপলব্ধ সময়ের বাইরে বুকিং করলে 400", async () => {
    const r = await request(app).post("/api/appointments").set(auth(p2Tok))
      .send({ doctor: String(doctor._id), date, time: "20:00" });
    expect(r.status).toBe(400);
  });

  test("স্লট তালিকায় বুক হওয়া স্লট booked: true দেখায়", async () => {
    const r = await request(app).get(`/api/doctors/${doctor._id}/slots?date=${date}`).set(auth(p2Tok));
    expect(r.status).toBe(200);
    expect(r.body.find((s) => s.time === "10:00").booked).toBe(true);
    expect(r.body.find((s) => s.time === "10:30").booked).toBe(false);
  });

  test("রোগী নিজে অ্যাপয়েন্টমেন্ট confirm করতে পারে না (400)", async () => {
    const r = await request(app).patch(`/api/appointments/${firstApptId}/status`).set(auth(pTok)).send({ status: "confirmed" });
    expect(r.status).toBe(400);
  });

  test("অন্য রোগী কারও অ্যাপয়েন্টমেন্ট বাতিল করতে পারে না (403)", async () => {
    const r = await request(app).patch(`/api/appointments/${firstApptId}/status`).set(auth(p2Tok)).send({ status: "cancelled" });
    expect(r.status).toBe(403);
  });

  test("বাতিল করলে স্লট আবার খালি হয় এবং নতুন বুকিং সফল হয়", async () => {
    const c = await request(app).patch(`/api/appointments/${firstApptId}/status`).set(auth(pTok)).send({ status: "cancelled" });
    expect(c.status).toBe(200);
    const r = await request(app).post("/api/appointments").set(auth(p2Tok))
      .send({ doctor: String(doctor._id), date, time: "10:00" });
    expect(r.status).toBe(201);
  });
});
