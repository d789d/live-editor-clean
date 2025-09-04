const mongoose = require('mongoose');
const config = require('../backend/config/env');

// Import models to ensure they're registered
const User = require('../backend/models/User');
const Conversation = require('../backend/models/Conversation');
const Prompt = require('../backend/models/Prompt');
const AdminLog = require('../backend/models/AdminLog');
const Subscription = require('../backend/models/Subscription');

async function initializeDatabase() {
    try {
        console.log('🚀 מאתחל מסד נתונים...');
        console.log('📍 מתחבר ל:', config.MONGODB_URI ? 'MongoDB Atlas/Cloud' : 'MongoDB מקומי');
        
        // Connect to MongoDB
        await mongoose.connect(config.MONGODB_URI, {
            dbName: config.DB_NAME,
            serverSelectionTimeoutMS: 10000, // 10 seconds timeout
            maxPoolSize: 10, // Connection pool
            bufferMaxEntries: 0,
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ חיבור למסד נתונים הצליח');
        
        // Get database instance
        const db = mongoose.connection.db;
        
        // List existing collections
        const existingCollections = await db.listCollections().toArray();
        const collectionNames = existingCollections.map(col => col.name);
        
        console.log('📂 Collections קיימים:', collectionNames.length > 0 ? collectionNames : 'אין');

        // Initialize collections with indexes
        const collections = [
            { name: 'users', model: User },
            { name: 'conversations', model: Conversation },
            { name: 'prompts', model: Prompt },
            { name: 'adminlogs', model: AdminLog },
            { name: 'subscriptions', model: Subscription }
        ];

        for (const { name, model } of collections) {
            try {
                // Create collection if it doesn't exist
                if (!collectionNames.includes(name)) {
                    await db.createCollection(name);
                    console.log(`✨ Collection '${name}' נוצר`);
                } else {
                    console.log(`📋 Collection '${name}' כבר קיים`);
                }

                // Ensure indexes are created
                await model.createIndexes();
                console.log(`🔍 אינדקסים ל-'${name}' הוגדרו`);
                
            } catch (error) {
                console.error(`❌ שגיאה ביצירת collection '${name}':`, error.message);
            }
        }

        // Create admin user if none exists
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            console.log('👤 יוצר משתמש מנהל ראשוני...');
            
            const adminUser = new User({
                email: 'admin@claude-chat.local',
                password: 'admin123456', // Will be hashed automatically
                firstName: 'מנהל',
                lastName: 'ראשי',
                role: 'admin',
                isEmailVerified: true,
                subscriptionType: 'enterprise'
            });

            await adminUser.save();
            console.log('✅ משתמש מנהל נוצר:');
            console.log('   📧 אימייל: admin@claude-chat.local');
            console.log('   🔐 סיסמה: admin123456');
            console.log('   ⚠️  חשוב: שנה את הסיסמה לאחר הכניסה הראשונה!');
        } else {
            console.log('👤 משתמש מנהל כבר קיים');
        }

        // Database statistics
        const stats = await db.stats();
        console.log('📊 סטטיסטיקות מסד נתונים:');
        console.log(`   💾 גודל: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📚 Collections: ${stats.collections}`);
        console.log(`   📄 אובייקטים: ${stats.objects}`);

        // Test connection by counting users
        const userCount = await User.countDocuments();
        console.log(`👥 סה"כ משתמשים: ${userCount}`);

        console.log('🎉 אתחול מסד הנתונים הושלם בהצלחה!');
        console.log('🚀 המערכת מוכנה לשימוש');
        
        return true;

    } catch (error) {
        console.error('❌ שגיאה באתחול מסד הנתונים:', error);
        
        if (error.name === 'MongooseServerSelectionError') {
            console.error('💡 פתרונות אפשריים:');
            console.error('   1. בדוק אם MongoDB Atlas זמין ומוגדר נכון');
            console.error('   2. בדוק את ה-Connection String בקובץ .env');
            console.error('   3. וודא שכתובת ה-IP מורשית ב-MongoDB Atlas');
            console.error('   4. בדוק את חיבור האינטרנט');
        } else if (error.name === 'MongooseError') {
            console.error('💡 בדוק את הגדרות החיבור בקובץ .env');
        }
        
        return false;
    } finally {
        // Keep connection open for the main application
        if (process.argv.includes('--standalone')) {
            await mongoose.disconnect();
            console.log('🔌 חיבור למסד נתונים נסגר');
        }
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('💥 שגיאה קריטית:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;