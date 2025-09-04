const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../backend/models/User');
const config = require('../backend/config/env');

async function createAdminUser() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // בדיקה אם כבר יש משתמש admin
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('⚠️  משתמש admin כבר קיים:');
            console.log(`📧 אימייל: ${existingAdmin.email}`);
            console.log(`👤 שם: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
            console.log('ℹ️  אפשר להשתמש בפרטים האלו להתחברות');
            return;
        }

        // יצירת סיסמה מוצפנת
        const plainPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        // יצירת משתמש admin חדש
        const adminUser = new User({
            email: 'admin@localhost.com',
            password: hashedPassword,
            firstName: 'מנהל',
            lastName: 'מערכת',
            role: 'admin',
            isEmailVerified: true,
            isActive: true,
            subscription: 'enterprise',
            limits: {
                dailyRequests: 999999,
                maxTokensPerRequest: 10000
            }
        });

        await adminUser.save();

        console.log('🎉 משתמש Admin נוצר בהצלחה!');
        console.log('='.repeat(50));
        console.log('📧 אימייל: admin@localhost.com');
        console.log('🔒 סיסמה: admin123');
        console.log('👤 שם: מנהל מערכת');
        console.log('🛡️  רול: admin');
        console.log('='.repeat(50));
        console.log('');
        console.log('💡 כעת תוכל להיכנס למסך הניהול עם הפרטים האלו!');
        console.log('🌐 כתובת: http://localhost:3001/login.html');

    } catch (error) {
        console.error('❌ שגיאה ביצירת משתמש Admin:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 חיבור למסד הנתונים נסגר');
    }
}

// בדיקה אם יש משתמשים במערכת
async function checkUsers() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        
        const totalUsers = await User.countDocuments();
        const adminUsers = await User.countDocuments({ role: 'admin' });
        
        console.log(`📊 סה"כ משתמשים במערכת: ${totalUsers}`);
        console.log(`👑 משתמשי admin: ${adminUsers}`);
        
        if (adminUsers > 0) {
            const admins = await User.find({ role: 'admin' }, 'email firstName lastName isActive');
            console.log('\n👥 רשימת מנהלי מערכת:');
            admins.forEach((admin, index) => {
                const status = admin.isActive ? '🟢' : '🔴';
                console.log(`${index + 1}. ${status} ${admin.firstName} ${admin.lastName} (${admin.email})`);
            });
        }
        
    } catch (error) {
        console.error('❌ שגיאה בבדיקת משתמשים:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// הרצה
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'check') {
        checkUsers().then(() => {
            console.log('✅ בדיקת משתמשים הסתיימה');
            process.exit(0);
        }).catch((error) => {
            console.error('❌ בדיקת משתמשים נכשלה:', error);
            process.exit(1);
        });
    } else {
        createAdminUser().then(() => {
            console.log('✅ יצירת Admin הסתיימה');
            process.exit(0);
        }).catch((error) => {
            console.error('❌ יצירת Admin נכשלה:', error);
            process.exit(1);
        });
    }
}

module.exports = { createAdminUser, checkUsers };