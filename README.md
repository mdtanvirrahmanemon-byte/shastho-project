# স্বাস্থ্যসেবা – Smart Healthcare Management System (MERN)

ফোল্ডার: `backend/` (Node, Express, MongoDB) ও `frontend/` (React + Vite)

## ১. Backend
```
cd backend
npm install
copy .env.example .env     (তারপর MONGO_URI ও JWT_SECRET বসান)
npm run seed:admin
npm run dev                (http://localhost:5000)
```
## ২. Frontend (নতুন টার্মিনালে)
```
cd frontend
npm install
npm run dev                (http://localhost:5173)
```
## ৩. টেস্ট করার ক্রম
1. Register: একজন Doctor (specialty বেছে) ও একজন Patient
2. Admin দিয়ে লগইন (admin@shastho.com / .env-এর পাসওয়ার্ড) → ডাক্তার Approve
3. Doctor লগইন → "উপলব্ধ সময়" সেট করুন (যেমন আজকের বারে ১০:০০–১৩:০০)
4. Patient → ডাক্তার খুঁজুন → বুক করুন
5. Doctor → Confirm → প্রেসক্রিপশন লিখুন
6. Patient → প্রেসক্রিপশন, রিভিউ, ভিডিও কনসাল্ট, ওষুধ রিমাইন্ডার, স্বাস্থ্য রেকর্ড
ADMIN_EMAIL=admin@shastho.com
ADMIN_PASSWORD=Admin@12345