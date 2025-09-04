@echo off
echo 🗄️ התקנת MongoDB מקומית - Windows
echo ====================================

echo.
echo 📋 שלב 1: בודק אם MongoDB כבר מותקן...
where mongo >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ MongoDB כבר מותקן!
    mongo --version
    goto :test_connection
)

echo.
echo ❌ MongoDB לא מותקן. מתחיל התקנה...
echo.

echo 📥 שלב 2: פותח את דף ההורדה...
start https://www.mongodb.com/try/download/community

echo.
echo 📋 הוראות התקנה:
echo 1. בחר "Windows" + "MSI" + לחץ "Download"
echo 2. הרץ את הקובץ שהורדת
echo 3. בחר "Complete" installation
echo 4. ✅ סמן "Install MongoDB as a Service" 
echo 5. ✅ סמן "Install MongoDB Compass" (GUI)
echo 6. לחץ "Install"
echo.

pause

echo.
echo 🔄 שלב 3: בודק התקנה...
where mongo >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ התקנה הצליחה!
    mongo --version
    goto :test_connection
) else (
    echo ❌ התקנה לא הושלמה. נסה שוב או פנה לעזרה.
    goto :end
)

:test_connection
echo.
echo 🧪 שלב 4: בודק חיבור למסד נתונים...
cd /d "%~dp0"
npm run db:test

if %ERRORLEVEL% == 0 (
    echo.
    echo 🎉 הכול עובד! MongoDB מוכן לשימוש
    echo 🚀 עכשיו אפשר להריץ: npm start
) else (
    echo.
    echo ⚠️ חיבור נכשל - אולי השירות לא פועל
    echo 💡 נסה להפעיל את השירות:
    echo    net start MongoDB
)

:end
pause