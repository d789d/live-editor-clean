const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const config = require('../backend/config/env');

async function debugAdmin() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // חיפוש המשתמש Admin
        const adminUser = await User.findOne({ email: 'admin@localhost.com' });
        
        if (!adminUser) {
            console.log('❌ משתמש admin לא נמצא!');
            return;
        }

        console.log('📊 פרטי משתמש Admin:');
        console.log('='.repeat(50));
        console.log(`📧 אימייל: ${adminUser.email}`);
        console.log(`👤 שם: ${adminUser.firstName} ${adminUser.lastName}`);
        console.log(`🛡️  רול: ${adminUser.role}`);
        console.log(`✅ פעיל: ${adminUser.isActive}`);
        console.log(`📧 אימייל מאומת: ${adminUser.isEmailVerified}`);
        console.log(`🔒 יש סיסמה: ${adminUser.password ? 'כן' : 'לא'}`);
        console.log(`🆔 ID: ${adminUser._id}`);

        // בדיקת סיסמה
        if (adminUser.password) {
            const isPasswordCorrect = await bcrypt.compare('admin123', adminUser.password);
            console.log(`🔐 סיסמה תקינה: ${isPasswordCorrect ? 'כן ✅' : 'לא ❌'}`);
        }

        // רשימת כל המשתמשים
        const allUsers = await User.find({}, 'email firstName lastName role isActive');
        console.log(`\n👥 סה"כ משתמשים במערכת: ${allUsers.length}`);
        console.log('\n📋 רשימת כל המשתמשים:');
        allUsers.forEach((user, index) => {
            const status = user.isActive ? '🟢' : '🔴';
            const roleIcon = user.role === 'admin' ? '👑' : user.role === 'moderator' ? '🛡️' : '👤';
            console.log(`${index + 1}. ${status} ${roleIcon} ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
        });

    } catch (error) {
        console.error('❌ שגיאה:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔒 חיבור למסד הנתונים נסגר');
    }
}

// הרצה
if (require.main === module) {
    debugAdmin().then(() => {
        console.log('✅ דיבוג הסתיים');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ דיבוג נכשל:', error);
        process.exit(1);
    });
}

module.exports = { debugAdmin };