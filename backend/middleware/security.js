const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const config = require('../config/env');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            error: message,
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: message,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};

// General API rate limiting
const generalLimiter = createRateLimiter(
    config.RATE_LIMIT_WINDOW_MS, // 15 minutes
    config.RATE_LIMIT_MAX_REQUESTS, // 100 requests
    'יותר מדי בקשות, נסה שוב מאוחר יותר'
);

// Strict rate limiting for authentication endpoints
const authLimiter = createRateLimiter(
    process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1000, // 15 min prod, 1 sec dev
    process.env.NODE_ENV === 'development' ? 99999 : 5, // unlimited in dev, 5 in prod
    'יותר מדי ניסיונות התחברות, נסה שוב בעוד 15 דקות'
);

// Very strict rate limiting for password reset
const passwordResetLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3, // 3 attempts
    'יותר מדי בקשות איפוס סיסמה, נסה שוב בעוד שעה'
);

// Claude API specific rate limiting
const claudeApiLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    10, // 10 requests per minute
    'יותר מדי בקשות לעיבוד טקסט, נסה שוב בעוד דקה',
    true // Skip successful requests from count
);

// Registration rate limiting
const registrationLimiter = createRateLimiter(
    60 * 60 * 1000, // 1 hour
    process.env.NODE_ENV === 'development' ? 100 : 3, // 100 registrations in dev, 3 in prod
    'יותר מדי הרשמות מכתובת IP זו, נסה שוב בעוד שעה'
);

// Admin action rate limiting  
const adminActionLimiter = createRateLimiter(
    process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1000, // 15 min prod, 1 sec dev
    process.env.NODE_ENV === 'production' ? 50 : 99999, // 50 prod, unlimited dev
    'יותר מדי פעולות ניהול, נסה שוב מאוחר יותר'
);

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.anthropic.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// Input validation middleware
const validateInput = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'נתונים לא תקינים',
                code: 'VALIDATION_ERROR',
                details: errors.array().map(error => ({
                    field: error.path,
                    message: getHebrewErrorMessage(error.msg, error.path),
                    value: error.value
                }))
            });
        }
        
        next();
    };
};

// Hebrew error messages
const getHebrewErrorMessage = (originalMsg, field) => {
    const messages = {
        'Invalid value': `ערך לא תקין עבור ${field}`,
        'Invalid email': 'כתובת אימייל לא תקינה',
        'Password too short': 'סיסמה קצרה מדי',
        'Required field': `שדה ${field} נדרש`,
        'String length': 'אורך הטקסט לא תקין',
        'Invalid URL': 'כתובת URL לא תקינה'
    };
    
    return messages[originalMsg] || originalMsg;
};

// Common validation rules
const validationRules = {
    email: body('email')
        .isEmail()
        .withMessage('Invalid email')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('String length'),
    
    password: body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password too short'),
    
    name: (field) => body(field)
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Required field')
        .matches(/^[\u0590-\u05FFa-zA-Z\s]+$/)
        .withMessage('שם יכול לכלול רק אותיות ורווחים'),
    
    text: (field, minLength = 1, maxLength = 10000) => body(field)
        .trim()
        .isLength({ min: minLength, max: maxLength })
        .withMessage('String length'),
    
    objectId: (field) => body(field)
        .isMongoId()
        .withMessage('Invalid value'),
    
    url: (field) => body(field)
        .optional()
        .isURL()
        .withMessage('Invalid URL'),
    
    phoneNumber: body('phoneNumber')
        .optional()
        .matches(/^[\+]?[0-9\-\(\)\s]+$/)
        .withMessage('מספר טלפון לא תקין'),
    
    positiveInteger: (field) => body(field)
        .isInt({ min: 1 })
        .withMessage('Invalid value'),
    
    enum: (field, values) => body(field)
        .isIn(values)
        .withMessage('Invalid value'),
    
    boolean: (field) => body(field)
        .isBoolean()
        .withMessage('Invalid value'),
    
    date: (field) => body(field)
        .isISO8601()
        .withMessage('Invalid date format')
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Recursively sanitize all string values
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
            // Remove potentially dangerous characters
            return value
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        } else if (typeof value === 'object' && value !== null) {
            const sanitized = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeValue(value[key]);
                }
            }
            return sanitized;
        }
        return value;
    };

    req.body = sanitizeValue(req.body);
    req.query = sanitizeValue(req.query);
    req.params = sanitizeValue(req.params);
    
    next();
};

// IP whitelist middleware (for admin operations)
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIP = forwardedFor ? forwardedFor.split(',')[0] : clientIP;
        
        if (allowedIPs.length === 0 || allowedIPs.includes(realIP)) {
            next();
        } else {
            res.status(403).json({
                success: false,
                error: 'גישה נדחתה מכתובת IP זו',
                code: 'IP_NOT_ALLOWED'
            });
        }
    };
};

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            config.CORS_ORIGIN,
            'http://localhost:3000',
            'http://localhost:3001',
            'https://claude-chat.vercel.app' // Add your production domain
        ];
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('לא מורשה על ידי CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-New-Token'] // For token refresh
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip} - ${new Date().toISOString()}`);
    
    // Log response when it finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
        console.log(`📤 ${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('🚨 Server Error:', err);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        
        return res.status(400).json({
            success: false,
            error: 'שגיאת נתונים',
            code: 'VALIDATION_ERROR',
            details: errors
        });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            error: `${field} כבר קיים במערכת`,
            code: 'DUPLICATE_ERROR'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'אסימון לא תקין',
            code: 'INVALID_TOKEN'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'פג תוקף האסימון',
            code: 'TOKEN_EXPIRED'
        });
    }
    
    // Default server error
    res.status(500).json({
        success: false,
        error: 'שגיאה פנימית בשרת',
        code: 'INTERNAL_ERROR'
    });
};

// Not found middleware
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'נתיב לא נמצא',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
};

module.exports = {
    // Rate limiters
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    claudeApiLimiter,
    registrationLimiter,
    adminActionLimiter,
    
    // Security
    securityHeaders,
    sanitizeInput,
    ipWhitelist,
    corsOptions,
    
    // Validation
    validateInput,
    validationRules,
    
    // Utilities
    requestLogger,
    errorHandler,
    notFound
};