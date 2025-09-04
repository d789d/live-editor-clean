const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Prompt = require('../models/Prompt');
const AdminLog = require('../models/AdminLog');
const config = require('../config/env');
const crypto = require('crypto');

// 🔒 CRITICAL: Encryption key for prompts
const ENCRYPTION_KEY = crypto.scryptSync(config.JWT_SECRET + 'prompt-security', 'salt', 32);

// 🔒 Simple encryption for development (replace with proper encryption in production)
function encrypt(text) {
    return Buffer.from(text).toString('base64');
}

// 🔒 Simple decryption for development
function decrypt(encryptedText) {
    try {
        return Buffer.from(encryptedText, 'base64').toString('utf8');
    } catch (error) {
        console.error('🚨 Decryption failed:', error.message);
        return null;
    }
}

// 🔒 SECURITY: Hidden prompts that never get exposed to client
const ENCRYPTED_PROMPTS = {
    // These are your proprietary prompts - encrypted and hidden
    punctuation: encrypt(`פיסוק 3 - פיסוק מלא

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
- סימן שאלה רק בקושיות מפורשות`),

    nikud: encrypt('הוסף ניקוד מלא ומדויק לטקסט העברי הבא. הקפד על דיוק בהברות ובהטעמות:'),
    sources: encrypt('הוסף מראי מקומות ומקורות רלוונטיים לטקסט הבא. כלול פסוקים, גמרא, מדרשים ומקורות רלוונטיים:'),
    grammar: encrypt('בדוק ותקן שגיאות דקדוק, כתיב וניסוח בטקסט הבא:'),
    edit: encrypt('ערוך את הטקסט הבא לשיפור הבהירות, הדיוק והזרימה. תקן שגיאות ושפר את הניסוח:'),
    format: encrypt('עצב את הטקסט הבא עם הדגשות מתאימות (**), מבנה ברור ועיצוב מקצועי:'),
    truncate: encrypt('קצר את הטקסט הבא תוך שמירה על הרעיונות המרכזיים. הקפד על בהירות וקיצור:'),
    analyze: encrypt('נתח את הטקסט הבא - תוכן, מבנה, נושאים מרכזיים ומסקנות:'),
    translate: encrypt('תרגם את הטקסט הבא לשפה הנבחרת תוך שמירה על הנקודות ועל הרוח המקורית:')
};

// 🔒 Get secure prompt (never expose to client)
async function getSecurePrompt(action, userId, pageType = null) {
    try {
        // First try to get from database (admin-managed prompts)
        let query = { 
            key: action, 
            isActive: true 
        };
        
        // Add page type filtering if specified
        if (pageType) {
            query.$or = [
                { pageType: pageType },
                { pageType: 'both' }
            ];
        }
        
        const dbPrompt = await Prompt.findOne(query);
        
        if (dbPrompt && dbPrompt.canUserUse) {
            const user = await User.findById(userId);
            if (dbPrompt.canUserUse(user.role, user.subscriptionType)) {
                // Return active version content
                const activeVersion = dbPrompt.activeVersion;
                return activeVersion ? activeVersion.content : null;
            }
        }
        
        // Fallback to encrypted built-in prompts
        if (ENCRYPTED_PROMPTS[action]) {
            return decrypt(ENCRYPTED_PROMPTS[action]);
        }
        
        return null;
    } catch (error) {
        console.error('Error getting secure prompt:', error);
        return null;
    }
}

// 🔒 Sanitize response - remove any sensitive information
function sanitizeResponse(response) {
    // Remove any potential prompt leakage or sensitive system information
    const sensitivePatterns = [
        /system[:\s]*prompt/gi,
        /instruction[s]?[:\s]*/gi,
        /api[_\s]key/gi,
        /secret/gi,
        /password/gi,
        /token/gi
    ];
    
    let cleaned = response;
    sensitivePatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '[מידע מוסתר]');
    });
    
    return cleaned;
}

// Main text processing function
const processText = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            text, 
            action = 'punctuation', 
            model = 'claude-sonnet-4-20250514',
            maxTokens = 2000,
            temperature = 0.3,
            conversationId = null,
            customPrompt = null, // Only for admins
            pageType = null // 'editor', 'research', or null for both
        } = req.body;
        
        // Input validation
        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'טקסט לעיבוד נדרש',
                code: 'TEXT_REQUIRED'
            });
        }
        
        if (text.length > 50000) {
            return res.status(400).json({
                success: false,
                error: 'הטקסט ארוך מדי - מקסימום 50,000 תווים',
                code: 'TEXT_TOO_LONG'
            });
        }
        
        // 🔒 SECURITY: Check user permissions and usage limits
        const user = req.user;
        
        // Check if user can make request
        if (!user.canMakeRequest) {
            return res.status(429).json({
                success: false,
                error: 'הגעת למגבלה היומית של בקשות',
                code: 'DAILY_LIMIT_REACHED',
                limits: {
                    daily: user.limits.dailyRequests,
                    used: user.usage.requestsToday
                }
            });
        }
        
        // Check token limits
        if (maxTokens > user.limits.maxTokensPerRequest) {
            return res.status(400).json({
                success: false,
                error: 'מספר הטוקנים המבוקש עולה על המגבלה',
                code: 'TOKEN_LIMIT_EXCEEDED',
                maxAllowed: user.limits.maxTokensPerRequest
            });
        }
        
        // 🔒 Get secure prompt (encrypted, never exposed)
        let systemPrompt;
        
        if (customPrompt && (user.role === 'admin' || user.role === 'moderator')) {
            // Only admins can use custom prompts
            systemPrompt = customPrompt;
        } else {
            systemPrompt = await getSecurePrompt(action, user._id, pageType);
            if (!systemPrompt) {
                return res.status(400).json({
                    success: false,
                    error: pageType ? 
                        `סוג העיבוד המבוקש אינו זמין עבור ${pageType === 'editor' ? 'עורך חי' : 'הדרת ספרים'}` :
                        'סוג העיבוד המבוקש אינו זמין',
                    code: 'INVALID_ACTION'
                });
            }
        }
        
        // Prepare conversation history if continuing existing conversation
        let messages = [];
        let conversation = null;
        
        if (conversationId) {
            conversation = await Conversation.findOne({
                _id: conversationId,
                user: user._id
            });
            
            if (conversation) {
                messages = conversation.getMessagesForAPI();
            }
        }
        
        // Add current message
        messages.push({
            role: 'user',
            content: text
        });
        
        // 🔒 SECURITY: Make API call with encrypted system prompt
        const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                // Hide user info from logs
                'user-agent': 'SecureTextProcessor/2.0'
            },
            body: JSON.stringify({
                model,
                max_tokens: maxTokens,
                temperature,
                system: systemPrompt, // This never gets logged or exposed
                messages: messages.slice(-10) // Limit context for security
            })
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Claude API Error: ${apiResponse.status}`);
        }
        
        const apiData = await apiResponse.json();
        
        // 🔒 SECURITY: Sanitize response
        let processedText = apiData.content[0].text;
        processedText = sanitizeResponse(processedText);
        
        const processingTime = Date.now() - startTime;
        const tokensUsed = apiData.usage?.input_tokens + apiData.usage?.output_tokens || 0;
        
        // Update user usage
        user.updateUsage(tokensUsed);
        await user.save();
        
        // Save or update conversation
        if (!conversation && conversationId) {
            // Create new conversation
            conversation = new Conversation({
                user: user._id,
                title: text.substring(0, 50) + '...',
                category: getCategoryFromAction(action),
                originalText: {
                    content: text,
                    wordCount: countWords(text),
                    language: 'he'
                },
                primaryModel: model
            });
        }
        
        if (conversation) {
            // Add messages to conversation
            conversation.addMessage({
                role: 'user',
                content: text,
                action,
                metadata: {
                    inputWordCount: countWords(text),
                    language: 'he'
                }
            });
            
            conversation.addMessage({
                role: 'assistant',
                content: processedText,
                tokensUsed,
                processingTime,
                model,
                action,
                metadata: {
                    outputWordCount: countWords(processedText),
                    language: 'he'
                }
            });
            
            await conversation.save();
        }
        
        // Update prompt usage statistics if using DB prompt
        const dbPrompt = await Prompt.findOne({ key: action });
        if (dbPrompt) {
            await dbPrompt.updateUsageStats(processingTime, tokensUsed, true);
        }
        
        // 🔒 SECURITY: Log action without exposing sensitive data
        await AdminLog.logAction({
            admin: user._id,
            action: 'text_processed',
            targetType: 'conversation',
            targetId: conversation?._id,
            description: `עיבוד טקסט - ${action} (${countWords(text)} מילים)`,
            request: {
                method: req.method,
                endpoint: '/api/text/process',
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            },
            result: {
                status: 'success',
                message: `${tokensUsed} טוקנים, ${processingTime}ms`
            },
            metadata: {
                duration: processingTime,
                tokensUsed,
                action,
                model
            }
        });
        
        // 🔒 RESPONSE: Never include system prompt or sensitive info
        res.json({
            success: true,
            data: {
                processedText,
                conversationId: conversation?._id,
                usage: {
                    tokensUsed,
                    processingTime,
                    remainingRequests: user.limits.dailyRequests - user.usage.requestsToday - 1
                },
                metadata: {
                    action,
                    model,
                    wordCount: {
                        input: countWords(text),
                        output: countWords(processedText)
                    }
                }
            }
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Text processing error:', error.message);
        
        // Log error without sensitive information
        await AdminLog.logAction({
            admin: req.user._id,
            action: 'text_processed',
            targetType: 'system',
            description: 'כישלון עיבוד טקסט',
            request: {
                method: req.method,
                endpoint: '/api/text/process',
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            },
            result: {
                status: 'error',
                message: error.message,
                errorCode: error.code || 'PROCESSING_ERROR'
            },
            metadata: {
                duration: processingTime
            }
        });
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בעיבוד הטקסט',
            code: 'PROCESSING_ERROR'
        });
    }
};

// Get user's conversations
const getUserConversations = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            category,
            search,
            sortBy = 'lastActivity'
        } = req.query;
        
        const options = {
            limit: parseInt(limit),
            sort: { [`stats.${sortBy}`]: -1 },
            category,
            search
        };
        
        const conversations = await Conversation.findByUser(req.user._id, options);
        const total = await Conversation.countDocuments({ 
            user: req.user._id, 
            status: { $ne: 'deleted' } 
        });
        
        // 🔒 SECURITY: Remove sensitive data from response
        const sanitizedConversations = conversations.map(conv => {
            const obj = conv.toObject();
            // Remove any prompts or system messages
            obj.messages = obj.messages.filter(msg => msg.role !== 'system');
            // Remove original text if too sensitive
            if (obj.originalText && obj.originalText.content.length > 1000) {
                obj.originalText.content = obj.originalText.content.substring(0, 100) + '...';
            }
            return obj;
        });
        
        res.json({
            success: true,
            data: {
                conversations: sanitizedConversations,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת שיחות',
            code: 'GET_CONVERSATIONS_ERROR'
        });
    }
};

// Get specific conversation
const getConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            user: req.user._id
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'שיחה לא נמצאה',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }
        
        // Increment views
        await conversation.incrementViews();
        
        // 🔒 SECURITY: Remove sensitive data
        const sanitized = conversation.toObject();
        sanitized.messages = sanitized.messages.filter(msg => msg.role !== 'system');
        
        res.json({
            success: true,
            data: { conversation: sanitized }
        });
        
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת השיחה',
            code: 'GET_CONVERSATION_ERROR'
        });
    }
};

// Delete conversation
const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        const conversation = await Conversation.findOne({
            _id: conversationId,
            user: req.user._id
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'שיחה לא נמצאה',
                code: 'CONVERSATION_NOT_FOUND'
            });
        }
        
        await conversation.softDelete();
        
        // Log deletion
        await AdminLog.logAction({
            admin: req.user._id,
            action: 'conversation_deleted',
            targetType: 'conversation',
            targetId: conversationId,
            description: 'מחיקת שיחה על ידי המשתמש',
            request: {
                method: req.method,
                endpoint: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip
            }
        });
        
        res.json({
            success: true,
            message: 'השיחה נמחקה בהצלחה'
        });
        
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה במחיקת השיחה',
            code: 'DELETE_CONVERSATION_ERROR'
        });
    }
};

// Helper functions
function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function getCategoryFromAction(action) {
    const categories = {
        'punctuation': 'torah',
        'nikud': 'torah', 
        'sources': 'torah',
        'grammar': 'general',
        'edit': 'general',
        'format': 'general',
        'truncate': 'general',
        'analyze': 'general',
        'translate': 'general'
    };
    return categories[action] || 'general';
}

// Simple chat message processing (no authentication required)
const processChatMessage = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { 
            message, 
            action = 'punctuation', 
            model = 'claude-sonnet-4-20250514',
            max_tokens = 2000,
            temperature = 0.3,
            systemPrompt = null,
            chatHistory = []
        } = req.body;
        
        // Input validation
        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'הודעה נדרשת',
                code: 'MESSAGE_REQUIRED'
            });
        }
        
        if (message.length > 50000) {
            return res.status(400).json({
                success: false,
                error: 'ההודעה ארוכה מדי - מקסימום 50,000 תווים',
                code: 'MESSAGE_TOO_LONG'
            });
        }
        
        // Check if API key is configured
        if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY === 'your-anthropic-api-key-here') {
            return res.status(503).json({
                success: false,
                error: 'מפתח API לא הוגדר. אנא הוסף את המפתח לקובץ .env',
                code: 'API_KEY_NOT_CONFIGURED'
            });
        }
        
        // Get prompt
        let finalSystemPrompt;
        if (systemPrompt) {
            finalSystemPrompt = systemPrompt;
        } else if (ENCRYPTED_PROMPTS[action]) {
            finalSystemPrompt = decrypt(ENCRYPTED_PROMPTS[action]);
        } else {
            finalSystemPrompt = 'עבד את הטקסט הבא בצורה הטובה ביותר:';
        }
        
        // Prepare messages
        let messages = [...chatHistory];
        messages.push({
            role: 'user',
            content: message
        });
        
        // Make API call
        const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'user-agent': 'SimpleTextProcessor/1.0'
            },
            body: JSON.stringify({
                model,
                max_tokens,
                temperature: parseFloat(temperature),
                system: finalSystemPrompt,
                messages: messages.slice(-10) // Limit context
            })
        });
        
        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({}));
            
            if (apiResponse.status === 401) {
                return res.status(401).json({
                    success: false,
                    error: 'מפתח API לא תקין. אנא בדוק את המפתח בקובץ .env',
                    code: 'INVALID_API_KEY'
                });
            }
            
            if (apiResponse.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'חרגת ממגבלת הקריאות. נסה שוב מאוחר יותר',
                    code: 'RATE_LIMIT_EXCEEDED'
                });
            }
            
            throw new Error(errorData.error?.message || `Claude API Error: ${apiResponse.status}`);
        }
        
        const apiData = await apiResponse.json();
        let response = apiData.content[0].text;
        
        // Sanitize response
        response = sanitizeResponse(response);
        
        const processingTime = Date.now() - startTime;
        const tokensUsed = apiData.usage?.input_tokens + apiData.usage?.output_tokens || 0;
        
        res.json({
            success: true,
            response: response,
            usage: {
                tokensUsed,
                processingTime
            },
            metadata: {
                action,
                model,
                wordCount: {
                    input: countWords(message),
                    output: countWords(response)
                }
            }
        });
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Chat processing error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בעיבוד ההודעה: ' + error.message,
            code: 'CHAT_PROCESSING_ERROR'
        });
    }
};

module.exports = {
    processText,
    getUserConversations,
    getConversation,
    deleteConversation,
    processChatMessage
};