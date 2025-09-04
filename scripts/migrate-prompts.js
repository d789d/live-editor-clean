const mongoose = require('mongoose');
const Prompt = require('../backend/models/Prompt');
const config = require('../backend/config/env');

// פרומפטים מהקוד המקורי
const INITIAL_PROMPTS = [
    {
        name: 'פיסוק מלא',
        key: 'punctuation',
        type: 'punctuation',
        category: 'torah',
        description: 'פיסוק מלא עם כללים מפורטים לטקסטים תורניים',
        content: `פיסוק 3 - פיסוק מלא

עם סימני שאלה וקריאה. הגדרה: כולל פסיקים, נקודות, נקודותיים, מרכאות.

**הערת עצמאות**: בביצוע שלב זה, יטופלו אך ורק ענייני פיסוק. אין לשנות מילים בגוף הטקסט, שום מילה ושום אות. אין לגעת במבנה הקטעים, במראי המקומות או בכותרות הקיימות.

1. סימני פיסוק - כללים ועקרונות:
- פיסוק כולל: פסיקים, נקודות, ונקודותיים
- שימוש מינימלי בסימני פיסוק
- שמירה על סגנון הכתיבה המסורתי

2. שימוש בנקודה:
- בסוף משפט
- לאחר ראשי תיבות
- בסיום רעיון
- לפני התחלת נושא חדש

3. שימוש בפסיק:
- בין חלקי משפט
- ברשימות
- לפני מילות קישור
- להפרדה בין רעיונות משניים

4. שימוש בנקודתיים:
בציטוט של פסוקים
דוגמא: כמו שנאמר: 'בראשית ברא אלקים'.

5. סימני מרכאות:
בציטוט פסוקים ומדרשים, השתמש במרכאה אחת.
לדוגמא: 'ברכות אביך גברו'.

6. סימני שאלה וקריאה:
- הימנעות כמעט מוחלטת משימוש בסימן קריאה
- סימן שאלה רק בקושיות מפורשות`,
        tags: ['פיסוק', 'תורה', 'עברית']
    },
    {
        name: 'ניקוד טקסט',
        key: 'nikud',
        type: 'nikud',
        category: 'torah',
        description: 'הוספת ניקוד מלא ומדויק לטקסט עברי',
        content: 'הוסף ניקוד מלא ומדויק לטקסט העברי הבא. הקפד על דיוק בהברות ובהטעמות:',
        tags: ['ניקוד', 'עברית', 'הגייה']
    },
    {
        name: 'קיצור טקסט',
        key: 'truncate',
        type: 'truncate',
        category: 'general',
        description: 'קיצור טקסט תוך שמירה על הרעיונות המרכזיים',
        content: 'קצר את הטקסט הבא תוך שמירה על הרעיונות המרכזיים. הקפד על בהירות וקיצור:',
        tags: ['קיצור', 'תקציר', 'עריכה']
    },
    {
        name: 'מקורות ומראי מקומות',
        key: 'sources',
        type: 'sources',
        category: 'torah',
        description: 'הוספת מראי מקומות ומקורות רלוונטיים',
        content: 'הוסף מראי מקומות ומקורות רלוונטיים לטקסט הבא. כלול פסוקים, גמרא, מדרשים ומקורות רלוונטיים:',
        tags: ['מקורות', 'מראי מקומות', 'תורה', 'הלכה']
    },
    {
        name: 'עריכת טקסט',
        key: 'edit',
        type: 'edit',
        category: 'general',
        description: 'עריכה לשיפור בהירות, דיוק וזרימה',
        content: 'ערוך את הטקסט הבא לשיפור הבהירות, הדיוק והזרימה. תקן שגיאות ושפר את הניסוח:',
        tags: ['עריכה', 'שיפור', 'בהירות']
    },
    {
        name: 'עיצוב וחיזוק',
        key: 'format',
        type: 'format',
        category: 'general',
        description: 'עיצוב טקסט עם הדגשות ומבנה ברור',
        content: 'עצב את הטקסט הבא עם הדגשות מתאימות (**), מבנה ברור ועיצוב מקצועי:',
        tags: ['עיצוב', 'פורמט', 'הדגשות']
    },
    {
        name: 'בדיקת דקדוק',
        key: 'grammar',
        type: 'grammar',
        category: 'general',
        description: 'בדיקה ותיקון שגיאות דקדוק וכתיב',
        content: 'בדוק ותקן שגיאות דקדוק, כתיב וניסוח בטקסט הבא:',
        tags: ['דקדוק', 'כתיב', 'תיקון']
    },
    {
        name: 'ניתוח טקסט',
        key: 'analyze',
        type: 'analyze',
        category: 'general',
        description: 'ניתוח מעמיק של תוכן, מבנה ונושאים',
        content: 'נתח את הטקסט הבא - תוכן, מבנה, נושאים מרכזיים ומסקנות:',
        tags: ['ניתוח', 'תוכן', 'מחקר']
    },
    {
        name: 'תרגום',
        key: 'translate',
        type: 'translate',
        category: 'general',
        description: 'תרגום תוך שמירה על הרוח המקורית',
        content: 'תרגם את הטקסט הבא לשפה הנבחרת תוך שמירה על הנקודות ועל הרוח המקורית:',
        tags: ['תרגום', 'שפות', 'העברה']
    },
    {
        name: 'עיבוד מותאם',
        key: 'custom',
        type: 'custom',
        category: 'general',
        description: 'עיבוד לפי הוראות מיוחדות',
        content: 'עבד את הטקסט על פי ההוראות המיוחדות שסופקו:',
        tags: ['מותאם', 'גמיש', 'הוראות']
    },
    {
        name: 'המשך שיחה',
        key: 'continue',
        type: 'system',
        category: 'system',
        description: 'המשך שיחה והרחבה על הנושא',
        content: 'המשך את השיחה וענה על השאלה או הבקשה:',
        tags: ['שיחה', 'המשך', 'דיאלוג']
    }
];

async function migratePrompts() {
    try {
        console.log('🔄 מתחבר למסד הנתונים...');
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ התחברות למסד הנתונים הצליחה');

        // יוצר משתמש ברירת מחדל למטרות המיגרציה
        const adminUserId = new mongoose.Types.ObjectId();
        
        console.log('🔄 מתחיל העברת פרומפטים...');
        
        for (const promptData of INITIAL_PROMPTS) {
            try {
                // בודק אם הפרומפט כבר קיים
                const existingPrompt = await Prompt.findOne({ key: promptData.key });
                
                if (existingPrompt) {
                    console.log(`⚠️  פרומפט '${promptData.key}' כבר קיים - מדלג`);
                    continue;
                }

                // יוצר פרומפט חדש
                const prompt = new Prompt({
                    name: promptData.name,
                    key: promptData.key,
                    type: promptData.type,
                    category: promptData.category,
                    description: promptData.description,
                    tags: promptData.tags,
                    isActive: true,
                    isPublic: true,
                    requiresApproval: false,
                    createdBy: adminUserId,
                    versions: [{
                        version: 1,
                        content: promptData.content,
                        systemPrompt: null,
                        createdBy: adminUserId,
                        changelog: 'גרסה ראשונית - העברה מהקוד',
                        isActive: true
                    }],
                    currentVersion: 1
                });

                await prompt.save();
                console.log(`✅ פרומפט '${promptData.key}' נשמר בהצלחה`);

            } catch (error) {
                console.error(`❌ שגיאה בשמירת פרומפט '${promptData.key}':`, error.message);
            }
        }

        console.log('🎉 המיגרציה הושלמה בהצלחה!');
        console.log(`📊 סה"כ פרומפטים: ${INITIAL_PROMPTS.length}`);
        
        // בדיקה שהפרומפטים נשמרו
        const savedPrompts = await Prompt.countDocuments();
        console.log(`📈 פרומפטים במסד הנתונים: ${savedPrompts}`);
        
    } catch (error) {
        console.error('❌ שגיאה במיגרציה:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔒 חיבור למסד הנתונים נסגר');
    }
}

// הרצה
if (require.main === module) {
    migratePrompts().then(() => {
        console.log('✅ המיגרציה הסתיימה');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ המיגרציה נכשלה:', error);
        process.exit(1);
    });
}

module.exports = { migratePrompts, INITIAL_PROMPTS };