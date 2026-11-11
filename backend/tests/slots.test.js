const { allSlots, futureSlots, toMin, fmt } = require("../utils/slots");

// 2026-11-09 সোমবার (day = 1), 2026-11-10 মঙ্গলবার
const MON_10_12 = [{ day: 1, start: "10:00", end: "12:00" }];

describe("Slot generation (utils/slots.js)", () => {
  test("সোমবারের ১০:০০–১২:০০ থেকে ৩০ মিনিটের ৪টা স্লট তৈরি হয়", () => {
    expect(allSlots(MON_10_12, "2026-11-09")).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  test("অন্য বারে কোনো স্লট হয় না", () => {
    expect(allSlots(MON_10_12, "2026-11-10")).toHaveLength(0);
  });

  test("ভুল তারিখ দিলে খালি তালিকা আসে", () => {
    expect(allSlots(MON_10_12, "10-11-2026")).toHaveLength(0);
    expect(allSlots(MON_10_12, "")).toHaveLength(0);
  });

  test("শেষ সময়ের সীমা: ১০:০০–১০:৪৫ এ শুধু একটা পূর্ণ ৩০ মিনিটের স্লট হয়", () => {
    expect(allSlots([{ day: 1, start: "10:00", end: "10:45" }], "2026-11-09")).toEqual(["10:00"]);
  });

  test("একই বারে দুটো ওভারল্যাপ করা সময় দিলে স্লট ডুপ্লিকেট হয় না", () => {
    const av = [{ day: 1, start: "10:00", end: "11:00" }, { day: 1, start: "10:30", end: "11:30" }];
    expect(allSlots(av, "2026-11-09")).toEqual(["10:00", "10:30", "11:00"]);
  });

  test("availability না থাকলে স্লট নেই", () => {
    expect(allSlots([], "2026-11-09")).toHaveLength(0);
    expect(allSlots(undefined, "2026-11-09")).toHaveLength(0);
  });
});

describe("Past slots filtering", () => {
  test("অতীতের তারিখে কোনো স্লট নেই", () => {
    expect(futureSlots(MON_10_12, "2020-01-06", new Date(2026, 10, 9, 8, 0))).toHaveLength(0);
  });

  test("ভবিষ্যতের তারিখে সব স্লট থাকে", () => {
    expect(futureSlots(MON_10_12, "2026-11-16", new Date(2026, 10, 9, 8, 0))).toHaveLength(4);
  });

  test("আজকের তারিখে পার হয়ে যাওয়া স্লট বাদ যায় (১০:৪৫ এ ১১:০০ ও পরের স্লট থাকে)", () => {
    expect(futureSlots(MON_10_12, "2026-11-09", new Date(2026, 10, 9, 10, 45))).toEqual(["11:00", "11:30"]);
  });

  test("ঠিক স্লটের সময়ে ওই স্লট আর বুক করা যায় না", () => {
    expect(futureSlots(MON_10_12, "2026-11-09", new Date(2026, 10, 9, 10, 30))).toEqual(["11:00", "11:30"]);
  });
});

describe("Time helpers", () => {
  test("toMin ও fmt একে অপরের উল্টো", () => {
    expect(toMin("10:30")).toBe(630);
    expect(fmt(630)).toBe("10:30");
    expect(fmt(toMin("09:05"))).toBe("09:05");
  });
});
