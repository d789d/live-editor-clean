# מילה - העורך התורני המקצועי 📖

**בינה מלאכותית מתקדמת לעיבוד טקסטים תורניים בעברית**

פיסוק, ניקוד, עיצוב ועוד - כל מה שצריך לעיבוד טקסטים תורניים מקצועי עם Claude AI.

🌐 **גרסה לייב**: [קישור יתווסף לאחר ההעלאה]

## ✨ תכונות עיקריות

- 📝 **פיסוק מדויק** - הוספת פסיקים ונקודות לפי כללי הדקדוק העברי
- 🔤 **ניקוד מלא** - ניקוד מדויק על בסיס הקשר ומשמעות  
- 📄 **חלוקה לפסקאות** - ארגון הטקסט לקריאה נוחה
- 🏷️ **כותרות וחלוקה** - הוספת כותרות ראשיות ומשנה
- 💬 **צ'אט אינטראקטיבי** - שיחה עם בינה מלאכותית לעזרה
- 🧹 **ניקוי וסידור** - הסרת רווחים מיותרים וסידור מקצועי

## 🏗️ מבנה הפרויקט

```
claude-chat/
├── app.js                # שרת ראשי
├── package.json          # dependencies
├── backend/              # API Server
│   ├── config/          # הגדרות סביבה ומסד נתונים
│   ├── controllers/     # לוגיקה עסקית
│   ├── middleware/      # אבטחה ואימות
│   ├── models/          # מודלי MongoDB
│   └── routes/          # נתיבי API
├── frontend/            # ממשק המשתמש
│   └── public/          # קבצי HTML, CSS, JS
├── database/            # סקריפטי אתחול
└── docs/               # תיעוד
```

## 🚀 התקנה והפעלה

### Backend
```bash
cd backend
npm install
cp ../.env.example .env
# ערוך את קובץ .env עם הפרטים שלך
npm run dev
```

### Frontend
```bash
cd frontend  
npm install
npm run dev
```

## 🔧 תכונות מתקדמות

### 👤 ניהול משתמשים
- הרשמה והתחברות
- אימות email
- ניהול פרופילים
- שחזור סיסמה

### 📚 ניהול טקסטים
- שמירת טקסטים ושיחות
- היסטוריה מלאה
- תגיות וקטגוריות
- חיפוש מתקדם

### 💰 מערכת מנויים
- חשבונות חינם ומשלמים
- הגבלות שימוש
- סטטיסטיקות שימוש
- ביטקום תשלומים

### 🔒 אבטחה
- הצפנת סיסמאות
- JWT tokens
- Rate limiting
- Helmet security headers
- Input validation

## 📊 API Endpoints

```
POST /api/auth/register     # הרשמה
POST /api/auth/login        # התחברות  
GET  /api/user/profile      # פרופיל משתמש
POST /api/text/process      # עיבוד טקסט
GET  /api/history          # היסטוריית שיחות
```

## 🛠️ טכנולוגיות

**Frontend:**
- Next.js 14
- React 18  
- TypeScript
- TailwindCSS
- Framer Motion

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Socket.IO (real-time)

**שירותים חיצוניים:**
- Claude API (Anthropic)
- Nodemailer (email)
- Cloudinary (images)

## 🔄 פיתוח

1. **Local Development**: http://localhost:3000
2. **Staging (Railway)**: https://your-app.railway.app
3. **Production**: https://yourdomain.com

## 📝 רישיון

MIT License - כל הזכויות שמורות © 2024