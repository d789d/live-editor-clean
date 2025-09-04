const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

// 🔒 IP Whitelist Configuration (Flexible for development)
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST ? 
    process.env.ADMIN_IP_WHITELIST.split(',') : 
    ['127.0.0.1', '::1', '::ffff:127.0.0.1', '0.0.0.0']; // Allow all in development

// Allow bypassing IP check in development
const BYPASS_IP_CHECK = process.env.NODE_ENV === 'development' || process.env.BYPASS_IP_CHECK === 'true';

// 🔒 2FA Token Storage (In production, use Redis or database)
const twoFATokens = new Map();

/**
 * 🔒 CRITICAL: IP Whitelist Middleware
 * Restricts admin access to whitelisted IP addresses only
 */
const requireWhitelistedIP = (req, res, next) => {
    try {
        // Get real IP address (handle proxy/load balancer)
        const clientIP = req.ip || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress ||
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        console.log(`🔍 IP Check: ${clientIP} attempting admin access`);

        // Bypass IP check in development mode
        if (BYPASS_IP_CHECK) {
            console.log('🔧 Development mode - bypassing IP whitelist check');
            return next();
        }

        // Check if IP is whitelisted
        const isWhitelisted = ADMIN_IP_WHITELIST.some(allowedIP => {
            // Handle IPv6 mapped IPv4 addresses
            if (clientIP === `::ffff:${allowedIP}` || clientIP === allowedIP) {
                return true;
            }
            
            // Handle subnet matching (future enhancement)
            return false;
        });

        if (!isWhitelisted) {
            console.warn(`🚨 SECURITY ALERT: Unauthorized IP ${clientIP} attempted admin access`);
            
            // Log security event
            logSecurityEvent({
                type: 'UNAUTHORIZED_IP_ACCESS',
                ip: clientIP,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
                severity: 'HIGH'
            });

            return res.status(403).json({
                success: false,
                error: 'גישה נדחתה - IP לא מורשה',
                code: 'IP_NOT_WHITELISTED'
            });
        }

        console.log(`✅ IP ${clientIP} is whitelisted for admin access`);
        next();

    } catch (error) {
        console.error('🚨 IP Whitelist error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבדיקת הרשאות',
            code: 'IP_CHECK_ERROR'
        });
    }
};

/**
 * 🔒 Two-Factor Authentication Setup
 * Generates 2FA secret and QR code for admin user
 */
const setup2FA = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `העורך התורני (${userEmail})`,
            issuer: 'Hebrew Text Editor Admin',
            length: 32
        });

        // Store secret temporarily (should be confirmed later)
        twoFATokens.set(`setup_${userId}`, {
            secret: secret.base32,
            confirmed: false,
            createdAt: new Date()
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                backupCodes: generateBackupCodes(),
                setupUrl: secret.otpauth_url
            }
        });

        console.log(`🔒 2FA setup initiated for user ${userId}`);

    } catch (error) {
        console.error('🚨 2FA Setup error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהגדרת 2FA',
            code: 'SETUP_2FA_ERROR'
        });
    }
};

/**
 * 🔒 Verify 2FA Token
 * Confirms 2FA setup with verification token
 */
const verify2FASetup = (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        const setupData = twoFATokens.get(`setup_${userId}`);
        if (!setupData) {
            return res.status(400).json({
                success: false,
                error: 'לא נמצא תהליך הגדרה פעיל',
                code: 'NO_SETUP_FOUND'
            });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
            secret: setupData.secret,
            encoding: 'base32',
            token: token,
            window: 1
        });

        if (!verified) {
            return res.status(400).json({
                success: false,
                error: 'קוד אימות שגוי',
                code: 'INVALID_2FA_TOKEN'
            });
        }

        // Move to confirmed status
        twoFATokens.set(`confirmed_${userId}`, {
            secret: setupData.secret,
            confirmed: true,
            confirmedAt: new Date()
        });

        // Remove setup token
        twoFATokens.delete(`setup_${userId}`);

        res.json({
            success: true,
            message: '2FA הוגדר בהצלחה',
            data: {
                enabled: true,
                confirmedAt: new Date()
            }
        });

        console.log(`✅ 2FA confirmed for user ${userId}`);

    } catch (error) {
        console.error('🚨 2FA Verification error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה באימות 2FA',
            code: 'VERIFY_2FA_ERROR'
        });
    }
};

/**
 * 🔒 CRITICAL: Require 2FA Middleware
 * Enforces 2FA verification for sensitive operations
 */
const require2FA = (req, res, next) => {
    try {
        const userId = req.user.id;
        const { twoFactorToken } = req.body || {};

        // Skip 2FA in development mode
        if (process.env.NODE_ENV === 'development' || process.env.BYPASS_2FA === 'true') {
            console.log('🔧 Development mode - bypassing 2FA requirement');
            return next();
        }

        // Check if user has 2FA enabled
        const userData = twoFATokens.get(`confirmed_${userId}`);
        if (!userData || !userData.confirmed) {
            return res.status(403).json({
                success: false,
                error: 'נדרש הפעלת 2FA למנהלים',
                code: 'REQUIRE_2FA_SETUP',
                setupRequired: true
            });
        }

        // For GET requests, skip 2FA check (view-only)
        if (req.method === 'GET') {
            return next();
        }

        // Require 2FA token for write operations
        if (!twoFactorToken) {
            return res.status(403).json({
                success: false,
                error: 'נדרש קוד 2FA לפעולה זו',
                code: 'REQUIRE_2FA_TOKEN'
            });
        }

        // Verify 2FA token
        const verified = speakeasy.totp.verify({
            secret: userData.secret,
            encoding: 'base32',
            token: twoFactorToken,
            window: 1
        });

        if (!verified) {
            logSecurityEvent({
                type: 'INVALID_2FA_ATTEMPT',
                userId: userId,
                ip: req.ip,
                timestamp: new Date(),
                severity: 'HIGH'
            });

            return res.status(403).json({
                success: false,
                error: 'קוד 2FA שגוי',
                code: 'INVALID_2FA_TOKEN'
            });
        }

        console.log(`✅ 2FA verified for user ${userId}`);
        next();

    } catch (error) {
        console.error('🚨 2FA Requirement error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבדיקת 2FA',
            code: 'CHECK_2FA_ERROR'
        });
    }
};

/**
 * 🔒 Session Security Enhancement
 * Adds extra session validation for admin operations
 */
const enhanceSessionSecurity = (req, res, next) => {
    try {
        const userId = req.user.id;
        const currentTime = new Date();
        
        // Check session age (max 2 hours for admin)
        const sessionStart = new Date(req.user.iat * 1000);
        const sessionAge = currentTime - sessionStart;
        const MAX_SESSION_AGE = 2 * 60 * 60 * 1000; // 2 hours

        if (sessionAge > MAX_SESSION_AGE) {
            return res.status(401).json({
                success: false,
                error: 'הפעלה פגה - נדרשת התחברות מחדש',
                code: 'SESSION_EXPIRED'
            });
        }

        // Add security headers
        res.setHeader('X-Admin-Session', 'active');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');

        next();

    } catch (error) {
        console.error('🚨 Session Security error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה באבטחת הפעלה',
            code: 'SESSION_SECURITY_ERROR'
        });
    }
};

/**
 * Generate backup codes for 2FA recovery
 */
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}

/**
 * Log security events (should integrate with AdminLog model)
 */
function logSecurityEvent(event) {
    console.warn(`🚨 SECURITY EVENT: ${event.type}`, {
        ip: event.ip,
        userId: event.userId,
        timestamp: event.timestamp,
        severity: event.severity
    });
    
    // TODO: Save to AdminLog model in database
}

/**
 * 🔒 Admin Action Rate Limiter
 * Strict rate limiting for admin operations
 */
const adminActionLimiter = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per window per IP for admins
    message: {
        success: false,
        error: 'יותר מדי פעולות ניהול - נסה שוב מאוחר יותר',
        code: 'ADMIN_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return `admin_${req.ip}_${req.user?.id || 'unknown'}`;
    },
    skip: (req) => {
        // Skip rate limiting for GET requests (read-only)
        return req.method === 'GET';
    }
});

/**
 * 🔒 Critical Operations Limiter
 * Extra strict limiting for dangerous operations
 */
const criticalOperationsLimiter = require('express-rate-limit')({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // max 10 critical operations per hour
    message: {
        success: false,
        error: 'הגבלת פעולות קריטיות - נסה שוב מאוחר יותר',
        code: 'CRITICAL_RATE_LIMIT'
    },
    keyGenerator: (req) => {
        return `critical_${req.ip}_${req.user?.id || 'unknown'}`;
    }
});

module.exports = {
    requireWhitelistedIP,
    setup2FA,
    verify2FASetup,
    require2FA,
    enhanceSessionSecurity,
    adminActionLimiter,
    criticalOperationsLimiter,
    
    // Helper functions
    generateBackupCodes,
    logSecurityEvent
};