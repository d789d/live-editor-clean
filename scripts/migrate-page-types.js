const mongoose = require('mongoose');
const config = require('../backend/config/env');
const Prompt = require('../backend/models/Prompt');

// הגדרת פרומפטים לפי עמודים
const PROMPT_PAGE_MAPPING = {
    // פרומפטים שייכים לעורך החי בלבד
    editor: ['punctuation', 'nikud', 'edit', 'format'],
    
    // פרומפטים שייכים להדרת ספרים בלבד  
    research: ['sources', 'analyze', 'translate'],
    
    // פרומפטים משותפים לשני העמודים
    both: ['grammar', 'truncate']
};

async function migratePromptPageTypes() {
    try {
        console.log('🔄 מתחיל מיגרציה של סוגי עמודים לפרומפטים...');
        
        // התחברות למסד נתונים
        await mongoose.connect(config.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ התחברות למסד נתונים הצליחה');
        
        // עדכון פרומפטים קיימים
        let updated = 0;
        let created = 0;
        let errors = 0;
        
        // יצירת פרומפטים חדשים לעורך החי
        for (const promptKey of PROMPT_PAGE_MAPPING.editor) {
            try {
                // בדיקה אם כבר קיים
                const existing = await Prompt.findOne({ key: promptKey });
                
                if (existing) {
                    // עדכון pageType
                    existing.pageType = 'editor';
                    await existing.save();
                    console.log(`✅ עדכן פרומפט קיים: ${promptKey} -> editor`);
                    updated++;
                } else {
                    // יצירת פרומפט חדש
                    const newPrompt = new Prompt({
                        name: getPromptName(promptKey),
                        key: promptKey,
                        type: promptKey,
                        category: getPromptCategory(promptKey),
                        pageType: 'editor',
                        description: getPromptDescription(promptKey),
                        versions: [{
                            version: 1,
                            content: getDefaultPromptContent(promptKey),
                            systemPrompt: '',
                            createdBy: new mongoose.Types.ObjectId(), // זמני
                            isActive: true
                        }],
                        createdBy: new mongoose.Types.ObjectId(), // זמני
                        isActive: true,
                        isPublic: true
                    });
                    
                    await newPrompt.save();
                    console.log(`✅ יצר פרומפט חדש: ${promptKey} -> editor`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ שגיאה בעיבוד פרומפט ${promptKey}:`, error.message);
                errors++;
            }
        }
        
        // יצירת פרומפטים חדשים להדרת ספרים
        for (const promptKey of PROMPT_PAGE_MAPPING.research) {
            try {
                // בדיקה אם כבר קיים
                const existing = await Prompt.findOne({ key: promptKey });
                
                if (existing) {
                    // עדכון pageType
                    existing.pageType = 'research';
                    await existing.save();
                    console.log(`✅ עדכן פרומפט קיים: ${promptKey} -> research`);
                    updated++;
                } else {
                    // יצירת פרומפט חדש
                    const newPrompt = new Prompt({
                        name: getPromptName(promptKey),
                        key: promptKey,
                        type: promptKey,
                        category: getPromptCategory(promptKey),
                        pageType: 'research',
                        description: getPromptDescription(promptKey),
                        versions: [{
                            version: 1,
                            content: getDefaultPromptContent(promptKey),
                            systemPrompt: '',
                            createdBy: new mongoose.Types.ObjectId(), // זמני
                            isActive: true
                        }],
                        createdBy: new mongoose.Types.ObjectId(), // זמני
                        isActive: true,
                        isPublic: true
                    });
                    
                    await newPrompt.save();
                    console.log(`✅ יצר פרומפט חדש: ${promptKey} -> research`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ שגיאה בעיבוד פרומפט ${promptKey}:`, error.message);
                errors++;
            }
        }
        
        // עדכון פרומפטים משותפים
        for (const promptKey of PROMPT_PAGE_MAPPING.both) {
            try {
                // בדיקה אם כבר קיים
                const existing = await Prompt.findOne({ key: promptKey });
                
                if (existing) {
                    // עדכון pageType
                    existing.pageType = 'both';
                    await existing.save();
                    console.log(`✅ עדכן פרומפט קיים: ${promptKey} -> both`);
                    updated++;
                } else {
                    // יצירת פרומפט חדש
                    const newPrompt = new Prompt({
                        name: getPromptName(promptKey),
                        key: promptKey,
                        type: promptKey,
                        category: getPromptCategory(promptKey),
                        pageType: 'both',
                        description: getPromptDescription(promptKey),
                        versions: [{
                            version: 1,
                            content: getDefaultPromptContent(promptKey),
                            systemPrompt: '',
                            createdBy: new mongoose.Types.ObjectId(), // זמני
                            isActive: true
                        }],
                        createdBy: new mongoose.Types.ObjectId(), // זמני
                        isActive: true,
                        isPublic: true
                    });
                    
                    await newPrompt.save();
                    console.log(`✅ יצר פרומפט חדש: ${promptKey} -> both`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ שגיאה בעיבוד פרומפט ${promptKey}:`, error.message);
                errors++;
            }
        }
        
        // סיכום
        console.log('\n📊 סיכום המיגרציה:');
        console.log(`✅ עודכנו: ${updated} פרומפטים`);
        console.log(`➕ נוצרו: ${created} פרומפטים חדשים`);
        console.log(`❌ שגיאות: ${errors}`);
        
        console.log('\n🔍 בדיקת תוצאות:');
        const editorPrompts = await Prompt.find({ pageType: 'editor' });
        const researchPrompts = await Prompt.find({ pageType: 'research' });
        const bothPrompts = await Prompt.find({ pageType: 'both' });
        
        console.log(`📝 פרומפטים לעורך החי: ${editorPrompts.length}`);
        console.log(`🔬 פרומפטים להדרת ספרים: ${researchPrompts.length}`);
        console.log(`🔄 פרומפטים משותפים: ${bothPrompts.length}`);
        
        console.log('\n✅ המיגרציה הושלמה בהצלחה!');
        
    } catch (error) {
        console.error('❌ שגיאה במיגרציה:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔐 החיבור למסד הנתונים נסגר');
    }
}

// פונקציות עזר
function getPromptName(key) {
    const names = {
        punctuation: 'פיסוק מלא',
        nikud: 'הוספת ניקוד',
        sources: 'מראי מקומות',
        grammar: 'תיקון דקדוק',
        edit: 'עריכת טקסט',
        format: 'עיצוב טקסט',
        truncate: 'קיצור טקסט',
        analyze: 'ניתוח טקסט',
        translate: 'תרגום טקסט'
    };
    return names[key] || key;
}

function getPromptCategory(key) {
    const categories = {
        punctuation: 'torah',
        nikud: 'torah',
        sources: 'torah',
        grammar: 'general',
        edit: 'general',
        format: 'general',
        truncate: 'general',
        analyze: 'general',
        translate: 'general'
    };
    return categories[key] || 'general';
}

function getPromptDescription(key) {
    const descriptions = {
        punctuation: 'פיסוק מלא של טקסט עברי עם הקפדה על כללי הפיסוק המסורתיים',
        nikud: 'הוספת ניקוד מלא ומדויק לטקסט עברי',
        sources: 'הוספת מראי מקומות ומקורות רלוונטיים מהתורה והמקורות',
        grammar: 'בדיקה ותיקון שגיאות דקדוק וכתיב',
        edit: 'עריכת טקסט לשיפור בהירות וזרימה',
        format: 'עיצוב וסידור טקסט במבנה מסודר',
        truncate: 'קיצור טקסט תוך שמירה על התוכן המרכזי',
        analyze: 'ניתוח מעמיק של תוכן הטקסט ומבנהו',
        translate: 'תרגום טקסט לשפות שונות'
    };
    return descriptions[key] || `פרומפט ${key}`;
}

function getDefaultPromptContent(key) {
    const contents = {
        punctuation: 'הוסף פיסוק מלא ומדויק לטקסט הבא. הקפד על כללי הפיסוק העבריים המסורתיים.',
        nikud: 'הוסף ניקוד מלא ומדויק לטקסט העברי הבא. הקפד על דיוק בהברות ובהטעמות.',
        sources: 'הוסף מראי מקומות ומקורות רלוונטיים לטקסט הבא. כלול פסוקים, גמרא, מדרשים ומקורות רלוונטיים.',
        grammar: 'בדוק ותקן שגיאות דקדוק, כתיב וניסוח בטקסט הבא.',
        edit: 'ערוך את הטקסט הבא לשיפור הבהירות, הדיוק והזרימה. תקן שגיאות ושפר את הניסוח.',
        format: 'עצב את הטקסט הבא עם הדגשות מתאימות (**), מבנה ברור ועיצוב מקצועי.',
        truncate: 'קצר את הטקסט הבא תוך שמירה על הרעיונות המרכזיים. הקפד על בהירות וקיצור.',
        analyze: 'נתח את הטקסט הבא - תוכן, מבנה, נושאים מרכזיים ומסקנות.',
        translate: 'תרגם את הטקסט הבא לשפה הנבחרת תוך שמירה על הנקודות ועל הרוח המקורית.'
    };
    return contents[key] || `עבד את הטקסט עבור פעולה: ${key}`;
}

// הרצת המיגרציה
if (require.main === module) {
    migratePromptPageTypes();
}

module.exports = { migratePromptPageTypes };