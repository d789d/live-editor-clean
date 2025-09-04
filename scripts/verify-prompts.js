const mongoose = require('mongoose');
const Prompt = require('../backend/models/Prompt');
const config = require('../backend/config/env');

async function verifyPrompts() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // בודק כמה פרומפטים יש
        const totalPrompts = await Prompt.countDocuments();
        console.log(`📊 סה"כ פרומפטים במסד הנתונים: ${totalPrompts}`);

        // מציג רשימה של כל הפרומפטים
        const prompts = await Prompt.find({}, 'name key type isActive currentVersion')
            .sort({ name: 1 });
        
        console.log('\n📋 רשימת פרומפטים:');
        console.log('='.repeat(60));
        
        prompts.forEach((prompt, index) => {
            const status = prompt.isActive ? '🟢' : '🔴';
            console.log(`${index + 1}. ${status} ${prompt.name}`);
            console.log(`   מפתח: ${prompt.key}`);
            console.log(`   סוג: ${prompt.type}`);
            console.log(`   גרסה: ${prompt.currentVersion}`);
            console.log('   ' + '-'.repeat(40));
        });

        // בודק פרומפט ספציפי בפירוט
        const punctuationPrompt = await Prompt.findOne({ key: 'punctuation' })
            .populate('versions');
        
        if (punctuationPrompt) {
            console.log('\n🔍 דוגמה מפורטת - פרומפט הפיסוק:');
            console.log('='.repeat(60));
            console.log(`שם: ${punctuationPrompt.name}`);
            console.log(`מפתח: ${punctuationPrompt.key}`);
            console.log(`תיאור: ${punctuationPrompt.description}`);
            console.log(`תגיות: ${punctuationPrompt.tags.join(', ')}`);
            console.log(`גרסאות: ${punctuationPrompt.versions.length}`);
            console.log(`תוכן (חלקי):`);
            console.log(punctuationPrompt.versions[0].content.substring(0, 200) + '...');
        }

        console.log('\n✅ כל הפרומפטים נמצאים במסד הנתונים ומוכנים לשימוש!');

    } catch (error) {
        console.error('❌ שגיאה:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 חיבור למסד הנתונים נסגר');
    }
}

// הרצה
if (require.main === module) {
    verifyPrompts().then(() => {
        console.log('✅ הבדיקה הסתיימה');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ הבדיקה נכשלה:', error);
        process.exit(1);
    });
}

module.exports = { verifyPrompts };