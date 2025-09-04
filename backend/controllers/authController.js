const User = require('../models/User');
const Subscription = require('../models/Subscription');
const AdminLog = require('../models/AdminLog');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/env');

// Helper function to log admin actions
const logAction = async (admin, action, targetType, targetId, description, request, result = { status: 'success' }) => {
    try {
        await AdminLog.logAction({
            admin: admin._id,
            action,
            targetType,
            targetId,
            targetName: targetId ? `${targetType}_${targetId}` : null,
            description,
            request: {
                method: request.method,
                endpoint: request.originalUrl,
                userAgent: request.get('User-Agent'),
                ipAddress: request.ip,
                sessionId: request.sessionID
            },
            result
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
};

// Register new user
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Check if user exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'משתמש עם כתובת אימייל זו כבר קיים',
                code: 'USER_EXISTS'
            });
        }
        
        // Create user
        const user = new User({
            email,
            password,
            firstName,
            lastName
        });
        
        await user.save();
        
        // Create default subscription
        const subscription = new Subscription({
            user: user._id,
            plan: 'free',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year free
            limits: {
                dailyRequests: 10,
                monthlyRequests: 300,
                maxTokensPerRequest: 2000,
                maxConversations: 5,
                maxFileSize: 10 * 1024 * 1024 // 10MB
            }
        });
        
        await subscription.save();
        
        // Generate token
        const token = generateToken(user._id);
        
        // Log registration
        await logAction(user, 'user_created', 'user', user._id, `משתמש חדש נרשם: ${email}`, req);
        
        res.status(201).json({
            success: true,
            message: 'המשתמש נוצר בהצלחה',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    subscriptionType: user.subscriptionType,
                    isEmailVerified: user.isEmailVerified
                },
                token
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Skip logging for system errors to avoid ObjectId issues
        console.log('Registration failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת המשתמש',
            code: 'REGISTRATION_ERROR'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password, rememberMe = false } = req.body;
        
        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            await logAction(
                { _id: 'system' }, 
                'login_failed', 
                'user', 
                null, 
                `ניסיון כניסה נכשל - משתמש לא נמצא: ${email}`, 
                req,
                { status: 'error', message: 'User not found' }
            );
            
            return res.status(401).json({
                success: false,
                error: 'כתובת אימייל או סיסמה שגויים',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            await logAction(
                user, 
                'login_failed', 
                'user', 
                user._id, 
                'ניסיון כניסה עם סיסמה שגויה', 
                req,
                { status: 'error', message: 'Invalid password' }
            );
            
            return res.status(401).json({
                success: false,
                error: 'כתובת אימייל או סיסמה שגויים',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            await logAction(
                user, 
                'login_failed', 
                'user', 
                user._id, 
                'ניסיון כניסה למשתמש לא פעיל', 
                req,
                { status: 'error', message: 'Account inactive' }
            );
            
            return res.status(401).json({
                success: false,
                error: 'החשבון אינו פעיל',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        
        // Update last login
        user.lastLogin = new Date();
        user.lastActivity = new Date();
        await user.save();
        
        // Generate token
        const tokenExpiry = rememberMe ? '30d' : config.JWT_EXPIRES_IN;
        const token = generateToken(user._id);
        
        // Log successful login
        await logAction(user, 'login_success', 'user', user._id, 'כניסה מוצלחת', req);
        
        res.json({
            success: true,
            message: 'התחברות מוצלחת',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    subscriptionType: user.subscriptionType,
                    isEmailVerified: user.isEmailVerified,
                    usage: user.usage,
                    limits: user.limits,
                    lastLogin: user.lastLogin
                },
                token,
                expiresIn: tokenExpiry
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        
        await logAction(
            { _id: 'system' }, 
            'login_failed', 
            'user', 
            null, 
            `שגיאת מערכת בכניסה: ${error.message}`, 
            req,
            { status: 'error', message: error.message }
        );
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בהתחברות',
            code: 'LOGIN_ERROR'
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        // Log logout
        await logAction(req.user, 'logout', 'user', req.user._id, 'התנתקות', req);
        
        res.json({
            success: true,
            message: 'התנתקת בהצלחה'
        });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בהתנתקות',
            code: 'LOGOUT_ERROR'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password');
        
        if (!user) {
            // Check if this is a development/mock user
            if (req.user._id === '647abc123def456789012998' || req.user._id === '647abc123def456789012999') {
                // Return mock user data for development
                const mockUser = {
                    _id: req.user._id,
                    email: req.user.email,
                    firstName: req.user._id === '647abc123def456789012998' ? 'משתמש' : 'מנהל',
                    lastName: req.user._id === '647abc123def456789012998' ? 'בדיקה' : 'ראשי',
                    role: req.user.role,
                    isEmailVerified: true,
                    isActive: true,
                    subscriptionType: req.user.role === 'admin' ? 'enterprise' : 'free',
                    createdAt: new Date(),
                    lastActivity: new Date()
                };
                
                return res.json({
                    success: true,
                    data: { user: mockUser }
                });
            }
            
            return res.status(404).json({
                success: false,
                error: 'משתמש לא נמצא',
                code: 'USER_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            data: { user }
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת פרופיל',
            code: 'PROFILE_ERROR'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['firstName', 'lastName', 'bio', 'preferences'];
        const actualUpdates = {};
        
        // Filter allowed updates
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                actualUpdates[key] = updates[key];
            }
        });
        
        const oldData = await User.findById(req.user._id).select(allowedUpdates.join(' '));
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            actualUpdates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'משתמש לא נמצא',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Log profile update
        await logAction(
            user, 
            'user_updated', 
            'user', 
            user._id, 
            'עדכון פרופיל משתמש', 
            req,
            { status: 'success' },
            { before: oldData.toObject(), after: actualUpdates }
        );
        
        res.json({
            success: true,
            message: 'הפרופיל עודכן בהצלחה',
            data: { user }
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        
        await logAction(
            req.user, 
            'user_updated', 
            'user', 
            req.user._id, 
            `כישלון עדכון פרופיל: ${error.message}`, 
            req,
            { status: 'error', message: error.message }
        );
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בעדכון הפרופיל',
            code: 'UPDATE_ERROR'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user._id);
        
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            await logAction(
                user, 
                'password_changed', 
                'user', 
                user._id, 
                'ניסיון שינוי סיסמה עם סיסמה נוכחית שגויה', 
                req,
                { status: 'error', message: 'Invalid current password' }
            );
            
            return res.status(400).json({
                success: false,
                error: 'הסיסמה הנוכחית שגויה',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        // Log password change
        await logAction(user, 'password_changed', 'user', user._id, 'שינוי סיסמה מוצלח', req);
        
        res.json({
            success: true,
            message: 'הסיסמה שונתה בהצלחה'
        });
        
    } catch (error) {
        console.error('Change password error:', error);
        
        await logAction(
            req.user, 
            'password_changed', 
            'user', 
            req.user._id, 
            `כישלון שינוי סיסמה: ${error.message}`, 
            req,
            { status: 'error', message: error.message }
        );
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בשינוי הסיסמה',
            code: 'PASSWORD_CHANGE_ERROR'
        });
    }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({
                success: true,
                message: 'אם האימייל קיים במערכת, נשלח אליך קישור איפוס'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        
        await user.save();
        
        // TODO: Send email with reset link
        // const resetURL = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
        
        // Log password reset request
        await logAction(user, 'password_reset_requested', 'user', user._id, 'בקשת איפוס סיסמה', req);
        
        res.json({
            success: true,
            message: 'אם האימייל קיים במערכת, נשלח אליך קישור איפוס'
        });
        
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בבקשת איפוס סיסמה',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        // Hash token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'טוקן איפוס לא תקין או פג תוקף',
                code: 'INVALID_RESET_TOKEN'
            });
        }
        
        // Set new password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        
        await user.save();
        
        // Log password reset
        await logAction(user, 'password_reset_completed', 'user', user._id, 'איפוס סיסמה הושלם', req);
        
        res.json({
            success: true,
            message: 'הסיסמה אופסה בהצלחה'
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה באיפוס סיסמה',
            code: 'PASSWORD_RESET_ERROR'
        });
    }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, subscriptionType, isActive } = req.query;
        
        const query = {};
        
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (role) query.role = role;
        if (subscriptionType) query.subscriptionType = subscriptionType;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await User.countDocuments(query);
        
        // Log admin access
        await logAction(
            req.user, 
            'users_accessed', 
            'system', 
            null, 
            `גישה לרשימת משתמשים (עמוד ${page})`, 
            req
        );
        
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה בקבלת רשימת משתמשים',
            code: 'GET_USERS_ERROR'
        });
    }
};

// Admin: Update user role
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'משתמש לא נמצא',
                code: 'USER_NOT_FOUND'
            });
        }
        
        const oldRole = user.role;
        user.role = role;
        await user.save();
        
        // Log role change
        await logAction(
            req.user, 
            'user_role_changed', 
            'user', 
            userId, 
            `שינוי תפקיד משתמש מ-${oldRole} ל-${role}`, 
            req,
            { status: 'success' },
            { before: { role: oldRole }, after: { role } }
        );
        
        res.json({
            success: true,
            message: 'תפקיד המשתמש עודכן בהצלחה',
            data: { user: user.toObject() }
        });
        
    } catch (error) {
        console.error('Update user role error:', error);
        
        await logAction(
            req.user, 
            'user_role_changed', 
            'user', 
            req.params.userId, 
            `כישלון שינוי תפקיד: ${error.message}`, 
            req,
            { status: 'error', message: error.message }
        );
        
        res.status(500).json({
            success: false,
            error: 'שגיאה בעדכון תפקיד המשתמש',
            code: 'UPDATE_ROLE_ERROR'
        });
    }
};

// Google OAuth Callback
const googleCallback = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user) {
            return res.redirect('/login.html?error=oauth_failed');
        }

        // Generate JWT token
        const token = generateToken(user._id);
        
        // Log OAuth login
        await logAction(user, 'oauth_login', 'user', user._id, 'כניסה דרך Google OAuth', req);
        
        // Set token in query parameter and redirect
        const redirectUrl = user.role === 'admin' 
            ? `/admin.html?token=${token}`
            : `/?token=${token}`;
            
        res.redirect(redirectUrl);
        
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/login.html?error=oauth_error');
    }
};

module.exports = {
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    getAllUsers,
    updateUserRole,
    googleCallback
};