const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const config = require('../backend/config/env');

async function updateAdminPassword() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // מחיקת המנהל הקיים אם קיים
        const existingAdmin = await User.findOne({ email: 'admin@localhost.com' });
        if (existingAdmin) {
            await User.deleteOne({ email: 'admin@localhost.com' });
            console.log('🗑️  משתמש admin קיים נמחק');
        }

        // יצירת סיסמה חזקה יותר שעומדת בקריטריונים (אותיות קטנות, גדולות, ומספר)
        const plainPassword = 'SuperAdmin789';
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        // יצירת משתמש admin חדש עם סיסמה חזקה
        const adminUser = new User({
            email: 'admin@localhost.com',
            password: hashedPassword,
            firstName: 'מנהל',
            lastName: 'מערכת',
            role: 'admin',
            isEmailVerified: true,
            isActive: true,
            subscriptionType: 'enterprise',
            limits: {
                dailyRequests: 999999,
                maxTokensPerRequest: 10000
            },
            canMakeRequest: true
        });

        await adminUser.save();

        console.log('🎉 סיסמת Admin עודכנה בהצלחה!');
        console.log('='.repeat(60));
        console.log('📧 אימייל: admin@localhost.com');
        console.log('🔒 סיסמה חדשה: SuperAdmin789');
        console.log('👤 שם: מנהל מערכת');
        console.log('🛡️  רול: admin');
        console.log('='.repeat(60));
        console.log('');
        console.log('💡 כעת תוכל להיכנס למסך הניהול עם הסיסמה החדשה!');
        console.log('🌐 כתובת: http://localhost:3001/admin-login');
        console.log('🔧 או השתמש בהתחברות מהירה לבדיקה');

    } catch (error) {
        console.error('❌ שגיאה בעדכון סיסמת Admin:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 חיבור למסד הנתונים נסגר');
    }
}

// הרצה
updateAdminPassword().then(() => {
    console.log('✅ עדכון סיסמת Admin הסתיים');
    process.exit(0);
}).catch((error) => {
    console.error('❌ עדכון סיסמת Admin נכשל:', error);
    process.exit(1);
});