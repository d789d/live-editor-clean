const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        config.JWT_SECRET,
        { 
            expiresIn: config.JWT_EXPIRES_IN,
            issuer: 'claude-chat-api',
            audience: 'claude-chat-app'
        }
    );
};

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'אין הרשאת גישה - אסימון חסר',
                code: 'NO_TOKEN'
            });
        }

        // Development bypass for testing
        if (token === 'dev-test-token' && config.NODE_ENV === 'development') {
            console.log('🔧 Development mode: Using test admin user');
            req.user = {
                _id: 'dev-admin-id',
                id: 'dev-admin-id',
                email: 'admin@localhost.com',
                role: 'admin',
                firstName: 'מנהל',
                lastName: 'מערכת',
                fullName: 'מנהל מערכת פיתוח'
            };
            return next();
        }

        // Verify the token
        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Get user from database (handle both userId and id fields for compatibility)
        const userId = decoded.userId || decoded.id;
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            // Check if this is a development/mock user
            if (userId === '647abc123def456789012998' || userId === '647abc123def456789012999') {
                // Create mock user object for development
                const mockUser = {
                    _id: userId,
                    email: decoded.email,
                    firstName: userId === '647abc123def456789012998' ? 'משתמש' : 'מנהל',
                    lastName: userId === '647abc123def456789012998' ? 'בדיקה' : 'ראשי',
                    role: decoded.role,
                    isEmailVerified: true,
                    isActive: true,
                    subscriptionType: decoded.role === 'admin' ? 'enterprise' : 'free',
                    canMakeRequest: true,
                    lastActivity: new Date()
                };
                
                req.user = mockUser;
                req.token = token;
                return next();
            }
            
            return res.status(401).json({
                success: false,
                error: 'אסימון לא תקין - משתמש לא נמצא',
                code: 'INVALID_TOKEN'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'חשבון המשתמש אינו פעיל',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Add user to request
        req.user = user;
        req.token = token;
        
        // Update last activity
        user.lastActivity = new Date();
        await user.save();

        next();
    } catch (error) {
        console.error('שגיאה בהחמת אסימון:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'אסימון לא תקין',
                code: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'פג תוקף האסימון',
                code: 'TOKEN_EXPIRED'
            });
        }

        res.status(500).json({
            success: false,
            error: 'שגיאה פנימית באימות',
            code: 'AUTH_ERROR'
        });
    }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (token) {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            const userId = decoded.userId || decoded.id;
            const user = await User.findById(userId).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
                req.token = token;
                user.lastActivity = new Date();
                await user.save();
            } else if (userId === '647abc123def456789012998' || userId === '647abc123def456789012999') {
                // Mock user for development
                const mockUser = {
                    _id: userId,
                    email: decoded.email,
                    firstName: userId === '647abc123def456789012998' ? 'משתמש' : 'מנהל',
                    lastName: userId === '647abc123def456789012998' ? 'בדיקה' : 'ראשי',
                    role: decoded.role,
                    isActive: true,
                    canMakeRequest: true
                };
                req.user = mockUser;
                req.token = token;
            }
        }
        
        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

// Check if user is admin
const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'נדרשת הזדהות',
            code: 'AUTH_REQUIRED'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'נדרשות הרשאות מנהל',
            code: 'ADMIN_REQUIRED'
        });
    }

    next();
};

// Check if user is moderator or admin
const requireModerator = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'נדרשת הזדהות',
            code: 'AUTH_REQUIRED'
        });
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            error: 'נדרשות הרשאות מנהל או מנהל קהילה',
            code: 'MODERATOR_REQUIRED'
        });
    }

    next();
};

// Check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceIdParam = 'id', userIdField = 'user') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'נדרשת הזדהות',
                code: 'AUTH_REQUIRED'
            });
        }

        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Get resource ID from params or body
        const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
        
        if (!resourceId) {
            return res.status(400).json({
                success: false,
                error: 'זיהוי משאב חסר',
                code: 'RESOURCE_ID_MISSING'
            });
        }

        // For user resources, check if it's the same user
        if (userIdField === 'user' && resourceId !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'אין הרשאה לגשת למשאב זה',
                code: 'ACCESS_DENIED'
            });
        }

        next();
    };
};

// Check email verification
const requireEmailVerification = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'נדרשת הזדהות',
            code: 'AUTH_REQUIRED'
        });
    }

    if (!req.user.isEmailVerified) {
        return res.status(403).json({
            success: false,
            error: 'נדרש אימוי כתובת האימייל',
            code: 'EMAIL_VERIFICATION_REQUIRED'
        });
    }

    next();
};

// Check active subscription
const requireActiveSubscription = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'נדרשת הזדהות',
            code: 'AUTH_REQUIRED'
        });
    }

    // Free users can still access basic features
    if (req.user.subscriptionType === 'free') {
        return next();
    }

    // Check if subscription is active
    if (!req.user.isSubscriptionActive) {
        return res.status(403).json({
            success: false,
            error: 'המנוי אינו פעיל',
            code: 'SUBSCRIPTION_INACTIVE'
        });
    }

    next();
};

// Check usage limits
const checkUsageLimits = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'נדרשת הזדהות',
            code: 'AUTH_REQUIRED'
        });
    }

    // Check if user can make request
    if (!req.user.canMakeRequest) {
        return res.status(429).json({
            success: false,
            error: 'הגעת למגבלה היומית של בקשות',
            code: 'DAILY_LIMIT_REACHED',
            limits: {
                daily: req.user.limits.dailyRequests,
                used: req.user.usage.requestsToday
            }
        });
    }

    next();
};

// Extract token from request headers
const extractToken = (req) => {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    // Also check for token in cookies
    return req.cookies?.token;
};

// Refresh token
const refreshToken = async (req, res, next) => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'אסימון חסר',
                code: 'NO_TOKEN'
            });
        }

        // Decode without verification to get payload
        const decoded = jwt.decode(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'אסימון לא תקין',
                code: 'INVALID_TOKEN'
            });
        }

        // Check if token expires within next hour
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        
        if (timeUntilExpiry < 3600) { // Less than 1 hour
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                const newToken = generateToken(user._id);
                res.header('X-New-Token', newToken);
            }
        }

        next();
    } catch (error) {
        next(); // Continue without refreshing
    }
};

module.exports = {
    generateToken,
    verifyToken,
    optionalAuth,
    requireAdmin,
    requireModerator,
    requireOwnershipOrAdmin,
    requireEmailVerification,
    requireActiveSubscription,
    checkUsageLimits,
    refreshToken,
    extractToken
};