const { triage, flagVital } = require("../utils/rules");

describe("Rule-based symptom triage (utils/rules.js)", () => {
  test("বুকে ব্যথা ও বুক ধড়ফড় হলে প্রথম পরামর্শ Cardiology এবং জরুরি সতর্কতা আসে", () => {
    const r = triage(["chest_pain", "palpitations"]);
    expect(r.suggestions[0].specialty).toBe("Cardiology");
    expect(r.emergency).toBe(true);
  });

  test("ত্বকের লক্ষণে Dermatology আসে, জরুরি সতর্কতা আসে না", () => {
    const r = triage(["skin_rash", "itching"]);
    expect(r.suggestions[0].specialty).toBe("Dermatology");
    expect(r.emergency).toBe(false);
  });

  test("শিশু রোগীর জ্বরে Pediatrics প্রথমে আসে", () => {
    const r = triage(["fever"], true);
    expect(r.suggestions[0].specialty).toBe("Pediatrics");
  });

  test("বড়দের জ্বরে Medicine প্রথমে আসে", () => {
    const r = triage(["fever"], false);
    expect(r.suggestions[0].specialty).toBe("Medicine");
  });

  test("অজানা লক্ষণে কোনো পরামর্শ আসে না", () => {
    expect(triage(["unknown_symptom"]).suggestions).toHaveLength(0);
  });

  test("সর্বোচ্চ ৩টা পরামর্শ দেয়", () => {
    const r = triage(["fever", "headache", "dizziness", "back_pain", "skin_rash", "period_problem"]);
    expect(r.suggestions.length === 3).toBe(true);
  });

  test("শ্বাসকষ্টও জরুরি সতর্কতা দেয়", () => {
    expect(triage(["shortness_breath"]).emergency).toBe(true);
  });
});

describe("Vitals warning thresholds", () => {
  test("রক্তচাপ: ১৫০/৯৫ বেশি, ৮৫/৫৫ কম, ১২০/৮০ স্বাভাবিক", () => {
    expect(flagVital("bp", 150, 95)).toBe("high");
    expect(flagVital("bp", 85, 55)).toBe("low");
    expect(flagVital("bp", 120, 80)).toBeNull();
  });

  test("শুধু ডায়াস্টোলিক বেশি হলেও সতর্কতা আসে", () => {
    expect(flagVital("bp", 130, 92)).toBe("high");
  });

  test("সুগার: ২০০ বেশি, ৬০ কম, ১০০ স্বাভাবিক", () => {
    expect(flagVital("sugar", 200)).toBe("high");
    expect(flagVital("sugar", 60)).toBe("low");
    expect(flagVital("sugar", 100)).toBeNull();
  });

  test("হৃদস্পন্দন: ১২০ বেশি, ৪৫ কম, ৭২ স্বাভাবিক", () => {
    expect(flagVital("heartRate", 120)).toBe("high");
    expect(flagVital("heartRate", 45)).toBe("low");
    expect(flagVital("heartRate", 72)).toBeNull();
  });

  test("ওজনের জন্য কোনো সতর্কতা নেই", () => {
    expect(flagVital("weight", 200)).toBeNull();
  });
});
