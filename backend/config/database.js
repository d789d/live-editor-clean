const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    // Skip database connection if MongoDB URI is not provided
    if (!process.env.MONGODB_URI) {
        console.log('⚠️ MongoDB URI לא הוגדר - רץ ללא מסד נתונים');
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`🍃 MongoDB מחובר: ${conn.connection.host}`);
        
        // Event listeners for connection
        mongoose.connection.on('error', (err) => {
            console.error('❌ שגיאת מסד נתונים:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('🔌 מסד נתונים התנתק');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('🔒 מסד נתונים נסגר בעקבות סגירת האפליקציה');
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ שגיאה בהתחברות למסד נתונים:', error);
        process.exit(1);
    }
};

module.exports = connectDB;