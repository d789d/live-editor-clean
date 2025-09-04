# הקמת מסד נתונים MongoDB - מדריך מלא 🗄️

## 🎯 שני אפשרויות מקצועיות:

### אופציה A: MongoDB Atlas (Cloud) - מומלץ ⭐
**יתרונות:** עובד מקומית + Railway + Production ללא שינויים

1. **הרשמה חינמית:** https://www.mongodb.com/cloud/atlas
2. **יצירת Cluster:** "M0 Sandbox" (חינם)
3. **הגדרת אבטחה:**
   - Database User: עם שם משתמש וסיסמה
   - Network Access: 0.0.0.0/0 (הכל - לפיתוח)
4. **קבלת Connection String**

### אופציה B: MongoDB מקומי
**לפיתוח מהיר ובדיקות מקומיות**

## 🚀 הוראות התקנה מפורטות

### MongoDB Atlas (מומלץ)

#### שלב 1: הרשמה ויצירת Cluster
```
1. לך ל: https://www.mongodb.com/cloud/atlas
2. לחץ "Try Free"
3. הירשם עם אימייל
4. בחר "Build a Database"
5. בחר "M0 FREE" 
6. בחר אזור קרוב (AWS/Europe)
7. שם הCluster: "claude-chat-db"
```

#### שלב 2: הגדרת אבטחה
```
1. Database Access:
   - Add New Database User
   - Username: claude-admin
   - Password: [סיסמה חזקה - שמור אותה!]
   - Database User Privileges: "Read and write to any database"

2. Network Access:
   - Add IP Address
   - בחר "Allow Access from Anywhere" (0.0.0.0/0)
```

#### שלב 3: קבלת Connection String
```
1. לחץ "Connect" ליד הCluster
2. בחר "Connect your application"
3. בחר "Node.js" + Version "4.1 or later"
4. העתק את הConnection String
5. החלף <password> בסיסמה האמיתית
```

### MongoDB מקומי (אופציונלי)

#### Windows:
```bash
# הורד מ: https://www.mongodb.com/try/download/community
# התקן + הוסף לPATH
mongod --dbpath C:\data\db
```

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux:
```bash
# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb
```

## 🔧 עדכון קובץ .env

אחרי הקמת MongoDB, עדכן את הקובץ `.env`:

### עבור MongoDB Atlas:
```env
MONGODB_URI=mongodb+srv://claude-admin:<password>@claude-chat-db.xxxxx.mongodb.net/claude-chat?retryWrites=true&w=majority
DB_NAME=claude-chat
```

### עבור MongoDB מקומי:
```env
MONGODB_URI=mongodb://localhost:27017/claude-chat
DB_NAME=claude-chat
```

## 📊 יצירת Collections ראשוניות

הקובץ `database/init-db.js` ייצור אוטומטית:
- users (משתמשים)
- conversations (שיחות)
- prompts (פרומפטים)
- admin_logs (לוגים)
- subscriptions (מנויים)

## 🧪 בדיקת החיבור

רץ את הפקודה:
```bash
npm run test:db
```

או בדוק בכתובת:
```
http://localhost:3001/api/health
```

## 🌐 למעבר ל-Railway/Production

**לא צריך לשנות כלום!** רק להוסיף למשתני הסביבה של Railway:
```
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
```

הפרויקט יזהה אוטומטית ויעבוד באותה צורה בדיוק!