# הוראות פריסה ל-Railway

## שלבים לפריסה:

### 1. הכנת הפרויקט
- ✅ Procfile מוכן
- ✅ railway.json מוגדר
- ✅ .env.example מוכן

### 2. הגדרת משתני סביבה ב-Railway
יש להגדיר את המשתנים הבאים בפורטל Railway:

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/claude-chat?retryWrites=true&w=majority
DB_NAME=claude-chat
JWT_SECRET=your-super-secret-jwt-key-with-at-least-32-characters
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-api-key-here
SESSION_SECRET=your-session-secret-with-at-least-32-characters
CORS_ORIGIN=https://your-app-name.up.railway.app
FRONTEND_URL=https://your-app-name.up.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=7d
```

### 3. פריסה
1. חבר את הריפוזיטורי ל-Railway
2. Railway יזהה את הפרויקט באופן אוטומטי
3. הגדר את משתני הסביבה בלוח הבקרה
4. Railway יבנה ויפרוס את האפליקציה

### 4. לאחר הפריסה
- בדוק שהאפליקציה עובדת: `https://your-app-name.up.railway.app/api/health`
- עדכן את CORS_ORIGIN ו-FRONTEND_URL עם הכתובת האמיתית