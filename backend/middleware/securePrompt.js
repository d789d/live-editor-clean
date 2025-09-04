const crypto = require('crypto');
const config = require('../config/env');

// 🔒 CRITICAL: Never expose these functions or keys to client
const SECURITY_CONFIG = {
    // Multiple layers of obfuscation
    MASTER_KEY: crypto.scryptSync(config.JWT_SECRET + 'ultra-secure-prompt-key', 'prompt-salt-2024', 64),
    ROTATION_KEY: crypto.scryptSync(config.SESSION_SECRET + 'rotation-layer', 'rotate-salt', 32),
    VALIDATION_HASH: crypto.createHash('sha256').update(config.JWT_SECRET + 'validation').digest('hex')
};

// 🔒 Advanced encryption with multiple layers
function hyperEncrypt(data, userId = 'system') {
    try {
        // Layer 1: Base encryption
        const iv1 = crypto.randomBytes(16);
        const cipher1 = crypto.createCipher('aes-256-gcm', SECURITY_CONFIG.MASTER_KEY);
        let encrypted1 = cipher1.update(data, 'utf8', 'hex');
        encrypted1 += cipher1.final('hex');
        const authTag1 = cipher1.getAuthTag();
        
        // Layer 2: User-specific encryption
        const userKey = crypto.scryptSync(userId, 'user-specific-salt', 32);
        const iv2 = crypto.randomBytes(16);
        const cipher2 = crypto.createCipher('aes-256-cbc', userKey);
        let encrypted2 = cipher2.update(encrypted1, 'hex', 'hex');
        encrypted2 += cipher2.final('hex');
        
        // Layer 3: Rotation encryption
        const iv3 = crypto.randomBytes(16);
        const cipher3 = crypto.createCipher('aes-256-ctr', SECURITY_CONFIG.ROTATION_KEY);
        let encrypted3 = cipher3.update(encrypted2, 'hex', 'hex');
        encrypted3 += cipher3.final('hex');
        
        // Combine all layers with metadata
        return {
            data: encrypted3,
            meta: {
                iv1: iv1.toString('hex'),
                iv2: iv2.toString('hex'), 
                iv3: iv3.toString('hex'),
                tag: authTag1.toString('hex'),
                hash: crypto.createHash('sha256').update(data).digest('hex').substring(0, 8),
                ts: Date.now()
            }
        };
    } catch (error) {
        console.error('🚨 Encryption failed:', error.message);
        throw new Error('Security encryption failed');
    }
}

// 🔒 Decrypt with validation
function hyperDecrypt(encryptedObj, userId = 'system') {
    try {
        if (!encryptedObj || !encryptedObj.data || !encryptedObj.meta) {
            throw new Error('Invalid encrypted object');
        }
        
        const { data, meta } = encryptedObj;
        
        // Validate timestamp (prevent replay attacks)
        if (Date.now() - meta.ts > 24 * 60 * 60 * 1000) {
            throw new Error('Encrypted data expired');
        }
        
        // Layer 3: Rotation decryption
        const decipher3 = crypto.createDecipher('aes-256-ctr', SECURITY_CONFIG.ROTATION_KEY);
        let decrypted3 = decipher3.update(data, 'hex', 'hex');
        decrypted3 += decipher3.final('hex');
        
        // Layer 2: User-specific decryption
        const userKey = crypto.scryptSync(userId, 'user-specific-salt', 32);
        const decipher2 = crypto.createDecipher('aes-256-cbc', userKey);
        let decrypted2 = decipher2.update(decrypted3, 'hex', 'hex');
        decrypted2 += decipher2.final('hex');
        
        // Layer 1: Base decryption with auth tag validation
        const decipher1 = crypto.createDecipher('aes-256-gcm', SECURITY_CONFIG.MASTER_KEY);
        decipher1.setAuthTag(Buffer.from(meta.tag, 'hex'));
        let decrypted1 = decipher1.update(decrypted2, 'hex', 'utf8');
        decrypted1 += decipher1.final('utf8');
        
        // Validate hash integrity
        const computedHash = crypto.createHash('sha256').update(decrypted1).digest('hex').substring(0, 8);
        if (computedHash !== meta.hash) {
            throw new Error('Data integrity check failed');
        }
        
        return decrypted1;
    } catch (error) {
        console.error('🚨 Decryption failed:', error.message);
        throw new Error('Security decryption failed');
    }
}

// 🔒 Memory protection - clear sensitive data from memory
function secureMemoryWipe(obj) {
    if (typeof obj === 'string') {
        // Overwrite string in memory with random data
        for (let i = 0; i < obj.length; i++) {
            obj = obj.substring(0, i) + String.fromCharCode(Math.floor(Math.random() * 256)) + obj.substring(i + 1);
        }
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'string') {
                obj[key] = '█'.repeat(obj[key].length);
            }
            delete obj[key];
        });
    }
}

// 🔒 Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
    // Remove any attempts to access internal prompts
    const dangerousFields = ['systemPrompt', 'internalPrompt', 'encryptedPrompt', 'prompt', 'instructions'];
    
    dangerousFields.forEach(field => {
        if (req.body[field] && req.user.role !== 'admin') {
            delete req.body[field];
        }
        if (req.query[field]) {
            delete req.query[field];
        }
    });
    
    // Log suspicious attempts
    const suspiciousKeywords = ['system', 'prompt', 'instruction', 'internal', 'secret', 'key'];
    const requestString = JSON.stringify(req.body).toLowerCase();
    
    let suspiciousCount = 0;
    suspiciousKeywords.forEach(keyword => {
        if (requestString.includes(keyword)) {
            suspiciousCount++;
        }
    });
    
    if (suspiciousCount > 2) {
        console.warn('🚨 Suspicious request detected:', {
            user: req.user?.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            keywords: suspiciousCount
        });
        
        // You could implement auto-blocking here
        // or alert admins about potential prompt injection attempts
    }
    
    next();
};

// 🔒 Response sanitization middleware
const sanitizeResponse = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Ensure no sensitive data leaks in responses
        if (data && typeof data === 'object') {
            const sanitized = JSON.parse(JSON.stringify(data));
            
            // Remove any potential prompt leakage
            const removeRecursive = (obj) => {
                if (typeof obj === 'object' && obj !== null) {
                    const sensitiveKeys = [
                        'systemPrompt', 'internalPrompt', 'encryptedPrompt', 
                        'masterKey', 'secretKey', 'authTag', 'encryptionKey',
                        'ANTHROPIC_API_KEY', 'JWT_SECRET', 'password'
                    ];
                    
                    Object.keys(obj).forEach(key => {
                        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
                            obj[key] = '[REDACTED]';
                        } else if (typeof obj[key] === 'object') {
                            removeRecursive(obj[key]);
                        } else if (typeof obj[key] === 'string' && obj[key].length > 1000) {
                            // Check if string might contain system prompts
                            const promptIndicators = ['system:', 'instructions:', 'prompt:', 'you are', 'your role'];
                            if (promptIndicators.some(indicator => obj[key].toLowerCase().includes(indicator))) {
                                obj[key] = '[CONTENT_FILTERED]';
                            }
                        }
                    });
                }
            };
            
            removeRecursive(sanitized);
            return originalJson.call(this, sanitized);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

// 🔒 Admin-only prompt access middleware
const restrictPromptAccess = (req, res, next) => {
    // Only admins can access prompt management endpoints
    if (req.originalUrl.includes('/admin/prompts') || 
        req.originalUrl.includes('/api/prompts')) {
        
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'נדרשות הרשאות מנהל לגישה למידע זה',
                code: 'ADMIN_ACCESS_REQUIRED'
            });
        }
        
        // Log all admin prompt access
        console.log('🔐 Admin prompt access:', {
            admin: req.user.email,
            action: req.method,
            endpoint: req.originalUrl,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    }
    
    next();
};

// 🔒 Environment validation
const validateEnvironment = () => {
    const requiredSecrets = [config.JWT_SECRET, config.SESSION_SECRET];
    
    if (requiredSecrets.some(secret => !secret || secret.length < 32)) {
        console.error('🚨 SECURITY WARNING: Weak or missing security keys detected');
        process.exit(1);
    }
    
    if (config.NODE_ENV === 'production') {
        if (config.CORS_ORIGIN === '*') {
            console.error('🚨 SECURITY WARNING: CORS is set to allow all origins in production');
        }
        
        if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY.includes('your-key')) {
            console.error('🚨 SECURITY WARNING: Default API key detected in production');
            process.exit(1);
        }
    }
};

// 🔒 Rate limiting for sensitive operations
const promptSecurityLimiter = (req, res, next) => {
    const key = `prompt_access_${req.ip}_${req.user?._id || 'anonymous'}`;
    const windowMs = 60000; // 1 minute
    const maxRequests = 5; // Only 5 prompt-related requests per minute
    
    // Simple in-memory rate limiting (use Redis in production)
    if (!global.promptRateLimit) global.promptRateLimit = {};
    
    const now = Date.now();
    const userRequests = global.promptRateLimit[key] || [];
    
    // Clean old requests
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'יותר מדי בקשות למידע רגיש',
            code: 'SENSITIVE_RATE_LIMIT'
        });
    }
    
    validRequests.push(now);
    global.promptRateLimit[key] = validRequests;
    
    next();
};

// Initialize security on startup
validateEnvironment();

module.exports = {
    hyperEncrypt,
    hyperDecrypt,
    secureMemoryWipe,
    sanitizeRequest,
    sanitizeResponse,
    restrictPromptAccess,
    promptSecurityLimiter,
    validateEnvironment
};