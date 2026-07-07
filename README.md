# Sowwanjo POS — نظام نقاط البيع
**الدومين:** https://pos.sowwanjo.online

---

## ✅ حالة الإعداد

| الخطوة | الحالة |
|--------|--------|
| MongoDB Atlas | ✅ جاهز (sowwanpos cluster) |
| Backend Code | ✅ جاهز (backend/) |
| Frontend Code | ✅ جاهز (src/) |
| GitHub | ⏳ ارفع المشروع |
| Render (Backend) | ⏳ انشر من GitHub |
| Vercel (Frontend) | ⏳ انشر من GitHub |

---

## 🗄️ MongoDB Atlas — تم الإعداد

```
Cluster:  sowwanpos
Host:     sowwanpos.ewyiddb.mongodb.net
User:     broosowwan_db_user
Password: QzZ3xOMlTIqkBUA3
Database: sowwanpos-pos
```

**Connection String الكامل:**
```
mongodb+srv://broosowwan_db_user:QzZ3xOMlTIqkBUA3@sowwanpos.ewyiddb.mongodb.net/sowwanpos-pos?retryWrites=true&w=majority&appName=sowwanpos
```

⚠️ **مهم:** تأكد من إضافة `0.0.0.0/0` في Network Access على Atlas حتى يتمكن Render من الاتصال.

---

## 🚀 خطوات النشر الكاملة

### الخطوة 1 — رفع على GitHub

```bash
# من مجلد المشروع الرئيسي
git init
git add .
git commit -m "🚀 Sowwanjo POS v1.0 - Initial deployment"
git branch -M main
git remote add origin https://github.com/USERNAME/sowwanjo-pos.git
git push -u origin main
```

---

### الخطوة 2 — نشر Backend على Render.com

1. اذهب إلى [render.com](https://render.com) → **New → Web Service**
2. اربط GitHub repo → اختر **Root Directory: `backend`**
3. **Build Command:** `npm install`
4. **Start Command:** `node src/server.js`
5. أضف **Environment Variables** التالية:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://broosowwan_db_user:QzZ3xOMlTIqkBUA3@sowwanpos.ewyiddb.mongodb.net/sowwanpos-pos?retryWrites=true&w=majority&appName=sowwanpos` |
| `JWT_SECRET` | `Sowwanjo@POS#2025!SecureKey$Jordan$96279123456` |
| `JWT_EXPIRES_IN` | `7d` |
| `SUPER_ADMIN_EMAIL` | `superadmin@sowwanjo.online` |
| `SUPER_ADMIN_PASSWORD` | `SA@Jordan#2025!` |
| `FRONTEND_URL` | `https://pos.sowwanjo.online` |
| `PORT` | `10000` |
| `NODE_ENV` | `production` |
| `DEFAULT_VAT_RATE` | `0.16` |
| `DEFAULT_CURRENCY` | `JOD` |
| `DEFAULT_TRIAL_DAYS` | `14` |

6. سيعطيك Render رابطاً مثل: `https://sowwanjo-pos-api.onrender.com`

---

### الخطوة 3 — نشر Frontend على Vercel

1. اذهب إلى [vercel.com](https://vercel.com) → **Add New Project**
2. اربط GitHub repo → **Root Directory: `.`** (المجلد الرئيسي)
3. أضف **Environment Variable:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://sowwanjo-pos-api.onrender.com/api` |

4. اربط الدومين **pos.sowwanjo.online**:
   - Vercel → Settings → Domains → أضف `pos.sowwanjo.online`
   - اذهب لمزود الدومين → أضف DNS record:
     ```
     Type: CNAME
     Name: pos
     Value: cname.vercel-dns.com
     ```

---

### الخطوة 4 — تهيئة قاعدة البيانات (مرة واحدة فقط)

بعد نشر Backend، شغّل:
```bash
cd backend
npm install
node src/seed.js
```

هذا سيُنشئ:
- ✅ خطط الاشتراك (مبتدئ، احترافي، مؤسسي)
- ✅ Indexes للأداء السريع

---

## 🔑 بيانات الدخول

### المدير العام (Super Admin)
```
الرابط: https://pos.sowwanjo.online
الوصول: اضغط على الشعار 5 مرات متتالية
المستخدم: superadmin
كلمة المرور: SA@Jordan#2025!
```

### المتاجر
```
الرابط: https://pos.sowwanjo.online
البريد: [يُنشأ عند إضافة متجر]
كلمة المرور: [تُولَّد تلقائياً]
```

---

## 🏗️ معمارية المشروع

```
sowwanjo-pos/
├── src/                    ← Frontend (React + Vite + Tailwind)
│   ├── app/App.tsx         ← النظام كاملاً (2800+ سطر)
│   └── styles/
├── backend/                ← Backend (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── server.ts       ← الخادم الرئيسي
│   │   ├── seed.ts         ← تهيئة البيانات
│   │   ├── models/         ← نماذج MongoDB
│   │   ├── routes/         ← API endpoints
│   │   └── middleware/     ← JWT + Multi-tenant
│   ├── .env                ← ⚠️ لا ترفعه على GitHub
│   ├── .env.example        ← نسخة آمنة للمرجع
│   └── render.yaml         ← إعدادات Render
├── vercel.json             ← إعدادات Vercel
├── .gitignore              ← يحمي .env
└── README.md               ← هذا الملف
```

---

## 📦 التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 18 + Vite + Tailwind CSS + Cairo Font |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcrypt |
| Multi-tenant | store_id isolation على كل query |
| APIs | Open Food Facts (للسوبرماركت) |
| Frontend Host | Vercel + pos.sowwanjo.online |
| Backend Host | Render.com |
| Database | MongoDB Atlas (sowwanpos cluster) |

---

## 💰 التكاليف الشهرية

| الخدمة | التكلفة |
|--------|---------|
| MongoDB Atlas M0 | **مجاني** (512MB — يكفي 5 متاجر) |
| Render Free | **مجاني** (ينام بعد 15 دقيقة) |
| Render Starter | $7/شهر (لا ينام — موصى به) |
| Vercel | **مجاني** |
| **الإجمالي** | **$0 - $7/شهر** |

عند 20+ متجر: انتقل لـ MongoDB M2 ($9/شهر) → **الإجمالي: $16/شهر**
