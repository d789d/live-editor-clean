# התקנת MongoDB מקומית - Windows 🗄️

## 📥 התקנה מהירה

### שיטה 1: התקנה מהירה עם Chocolatey (מומלץ)
```cmd
# התקן Chocolatey אם אין לך:
# פתח PowerShell כמנהל והרץ:
# Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# התקן MongoDB:
choco install mongodb

# התחל את השירות:
net start MongoDB
```

### שיטה 2: התקנה ידנית (אם Chocolatey לא עובד)
1. **הורדה:** https://www.mongodb.com/try/download/community
2. **בחר:** Windows → MSI → Download
3. **התקנה:** הרץ את ה-MSI
4. **במהלך ההתקנה:**
   - ✅ Install MongoDB as a Service
   - ✅ Install MongoDB Compass (GUI)
   - נתיב התקנה: `C:\Program Files\MongoDB\Server\7.0\bin`

### שיטה 3: MongoDB Portable (ללא התקנה)
```cmd
# הורד ZIP מהאתר
# חלץ לתיקייה
cd C:\mongodb\bin
mongod --dbpath C:\mongodb\data
```

## 🚀 אחרי ההתקנה

### בדיקת התקנה:
```cmd
mongo --version
mongod --version
```

### הפעלת MongoDB (אם לא פועל כשירות):
```cmd
# צור תיקיית נתונים:
mkdir C:\data\db

# הפעל את השרת:
mongod
```

## ⚡ בדיקה מהירה

אחרי ההתקנה, רץ בפרויקט:
```bash
npm run db:test
```

אם עובד - נקבל ✅ הכל מוכן!