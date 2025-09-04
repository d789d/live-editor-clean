const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * 🔧 DEVELOPMENT ONLY: Create initial admin user
 * This endpoint should be disabled in production
 */
router.post('/create-admin', async (req, res) => {
    try {
        // Only allow in development
        if (config.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Endpoint not available in production',
                code: 'PRODUCTION_DISABLED'
            });
        }

        const { email, password, firstName, lastName } = req.body;

        // Validate input
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'כל השדות נדרשים',
                code: 'MISSING_FIELDS'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'סיסמה חייבת להכיל לפחות 8 תווים',
                code: 'WEAK_PASSWORD'
            });
        }

        // For now, create a mock admin user and return JWT token
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const mockAdminUser = {
            _id: '647abc123def456789012999',
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: 'admin',
            isEmailVerified: true,
            isActive: true,
            subscriptionType: 'enterprise',
            createdAt: new Date(),
            lastActivity: new Date()
        };

        // Create JWT token
        const token = jwt.sign(
            {
                id: mockAdminUser._id,
                email: mockAdminUser.email,
                role: mockAdminUser.role
            },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log(`👨‍💼 Development admin created: ${email}`);

        res.status(201).json({
            success: true,
            message: 'מנהל נוצר בהצלחה (פיתוח בלבד)',
            data: {
                user: {
                    id: mockAdminUser._id,
                    email: mockAdminUser.email,
                    firstName: mockAdminUser.firstName,
                    lastName: mockAdminUser.lastName,
                    fullName: `${mockAdminUser.firstName} ${mockAdminUser.lastName}`,
                    role: mockAdminUser.role
                },
                token,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת מנהל',
            code: 'CREATE_ADMIN_ERROR'
        });
    }
});

/**
 * 🔧 DEVELOPMENT ONLY: Quick login for testing
 */
router.post('/dev-login', async (req, res) => {
    try {
        // Only allow in development
        if (config.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Endpoint not available in production',
                code: 'PRODUCTION_DISABLED'
            });
        }

        // Create a quick user token for testing (regular user, not admin)
        const mockUser = {
            _id: '647abc123def456789012998',
            email: 'user@test.com',
            firstName: 'משתמש',
            lastName: 'בדיקה',
            role: 'user'
        };

        const token = jwt.sign(
            {
                id: mockUser._id,
                email: mockUser.email,
                role: mockUser.role
            },
            config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('🔧 Development login token generated for regular user');

        res.json({
            success: true,
            message: 'התחברות מהירה לפיתוח',
            data: {
                user: {
                    id: mockUser._id,
                    email: mockUser.email,
                    firstName: mockUser.firstName,
                    lastName: mockUser.lastName,
                    fullName: `${mockUser.firstName} ${mockUser.lastName}`,
                    role: mockUser.role
                },
                token,
                expiresIn: '24h'
            }
        });

    } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהתחברות מהירה',
            code: 'DEV_LOGIN_ERROR'
        });
    }
});

module.exports = router;