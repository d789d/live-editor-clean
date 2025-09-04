const express = require('express');
const router = express.Router();
const passport = require('passport');

// Import controllers and middleware
const authController = require('../controllers/authController');
const { 
    verifyToken, 
    requireAdmin, 
    requireEmailVerification 
} = require('../middleware/auth');
const { 
    authLimiter, 
    registrationLimiter, 
    passwordResetLimiter,
    validateInput,
    validationRules 
} = require('../middleware/security');
const { sanitizeRequest, sanitizeResponse } = require('../middleware/securePrompt');

// Apply security middleware to all routes
router.use(sanitizeRequest);
router.use(sanitizeResponse);

// Register new user
router.post('/register', 
    registrationLimiter,
    validateInput([
        validationRules.email,
        validationRules.password,
        validationRules.name('firstName'),
        validationRules.name('lastName')
    ]),
    authController.register
);

// User login
router.post('/login',
    authLimiter,
    validateInput([
        validationRules.email,
        validationRules.password
    ]),
    authController.login
);

// User logout
router.post('/logout', verifyToken, authController.logout);

// Get current user profile
router.get('/profile', verifyToken, authController.getProfile);

// Update user profile
router.put('/profile', 
    verifyToken,
    validateInput([
        validationRules.name('firstName').optional(),
        validationRules.name('lastName').optional(),
        validationRules.text('bio', 0, 500).optional()
    ]),
    authController.updateProfile
);

// Change password
router.put('/password',
    verifyToken,
    validateInput([
        validationRules.password.withMessage('Current password required'),
        validationRules.password.withMessage('New password required')
    ]),
    authController.changePassword
);

// Request password reset
router.post('/forgot-password',
    passwordResetLimiter,
    validateInput([validationRules.email]),
    authController.requestPasswordReset
);

// Reset password with token
router.post('/reset-password',
    passwordResetLimiter,
    validateInput([
        validationRules.text('token', 64, 64),
        validationRules.password
    ]),
    authController.resetPassword
);

// Admin routes - require admin privileges
router.get('/admin/users',
    verifyToken,
    requireAdmin,
    authController.getAllUsers
);

router.put('/admin/users/:userId/role',
    verifyToken,
    requireAdmin,
    validateInput([
        validationRules.enum('role', ['user', 'admin', 'moderator'])
    ]),
    authController.updateUserRole
);

// Quick dev login (for development only)
router.post('/quick-login', async (req, res) => {
    try {
        const config = require('../config/env');
        
        // Only allow in development
        if (config.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Endpoint not available in production',
                code: 'PRODUCTION_DISABLED'
            });
        }

        const { type } = req.body;
        const jwt = require('jsonwebtoken');
        
        if (type === 'admin') {
            // Create admin token
            const mockUser = {
                _id: '647abc123def456789012999',
                email: 'admin@test.com',
                role: 'admin'
            };
            
            const token = jwt.sign(
                { userId: mockUser._id, email: mockUser.email, role: mockUser.role },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES_IN }
            );
            
            res.json({
                success: true,
                data: {
                    token,
                    user: mockUser
                }
            });
        } else {
            // Create regular user token
            const mockUser = {
                _id: '647abc123def456789012998',
                email: 'user@test.com',
                role: 'user'
            };
            
            const token = jwt.sign(
                { userId: mockUser._id, email: mockUser.email, role: mockUser.role },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES_IN }
            );
            
            res.json({
                success: true,
                data: {
                    token,
                    user: mockUser
                }
            });
        }
        
    } catch (error) {
        console.error('Quick login error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהתחברות מהירה',
            code: 'QUICK_LOGIN_ERROR'
        });
    }
});

// Google OAuth Routes
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=oauth_failed' }),
    authController.googleCallback
);

module.exports = router;