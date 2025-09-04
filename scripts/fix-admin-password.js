const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const config = require('../backend/config/env');

async function fixAdminPassword() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // מחפש את המשתמש Admin
        const adminUser = await User.findOne({ email: 'admin@localhost.com' });
        
        if (!adminUser) {
            console.log('❌ משתמש admin לא נמצא!');
            return;
        }

        // יוצר סיסמה חדשה מוצפנת
        const plainPassword = 'admin123';
        console.log(`🔧 מצפין סיסמה חדשה: ${plainPassword}`);
        
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        console.log('✅ הצפנה הושלמה');

        // מעדכן את הסיסמה
        adminUser.password = hashedPassword;
        await adminUser.save();

        console.log('✅ סיסמה עודכנה במסד הנתונים');

        // בדיקה שהסיסמה עובדת
        const isPasswordCorrect = await bcrypt.compare(plainPassword, adminUser.password);
        console.log(`🔐 בדיקת סיסמה: ${isPasswordCorrect ? 'הצלחה ✅' : 'נכשל ❌'}`);

        if (isPasswordCorrect) {
            console.log('🎉 הסיסמה תוקנה בהצלחה!');
            console.log('='.repeat(50));
            console.log('📧 אימייל: admin@localhost.com');
            console.log('🔒 סיסמה: admin123');
            console.log('🌐 כתובת: http://localhost:3001/login.html');
            console.log('='.repeat(50));
        }

    } catch (error) {
        console.error('❌ שגיאה בתיקון הסיסמה:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 חיבור למסד הנתונים נסגר');
    }
}

// הרצה
if (require.main === module) {
    fixAdminPassword().then(() => {
        console.log('✅ תיקון סיסמה הסתיים');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ תיקון סיסמה נכשל:', error);
        process.exit(1);
    });
}

module.exports = { fixAdminPassword };