require('dotenv').config();

const config = {
    // Server
    PORT: process.env.PORT || 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/claude-chat',
    DB_NAME: process.env.DB_NAME || 'claude-chat',
    
    // Authentication
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key-development-only',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-session-secret',
    
    // Claude API
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_API_VERSION: process.env.ANTHROPIC_API_VERSION || '2023-06-01',
    
    // Email
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    
    // Rate Limiting  
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (process.env.NODE_ENV === 'production' ? 900000 : 1000), // 15 min prod, 1 sec dev
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 99999), // 100 prod, unlimited dev
    
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
    
    // Frontend
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    
    // Session
    SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-session-secret',
    
    // Redis (optional)
    REDIS_URL: process.env.REDIS_URL
};

// Validation
const requiredEnvVars = ['ANTHROPIC_API_KEY', 'JWT_SECRET'];

if (config.NODE_ENV === 'production') {
    requiredEnvVars.push('MONGODB_URI');
    // EMAIL vars are optional for now
    if (config.EMAIL_USER) requiredEnvVars.push('EMAIL_USER', 'EMAIL_PASS');
}

const missingEnvVars = requiredEnvVars.filter(varName => !config[varName]);

if (missingEnvVars.length > 0) {
    console.error('❌ משתני סביבה חסרים:', missingEnvVars.join(', '));
    if (config.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        console.warn('⚠️ אזהרה: משתני סביבה חסרים בסביבת פיתוח');
    }
}

module.exports = config;