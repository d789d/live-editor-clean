const express = require('express');
const router = express.Router();

// Import controllers and middleware
const adminController = require('../controllers/adminController');
const { 
    verifyToken, 
    requireAdmin,
    requireEmailVerification 
} = require('../middleware/auth');
const { 
    adminActionLimiter,
    validateInput,
    validationRules 
} = require('../middleware/security');
const { 
    sanitizeRequest, 
    sanitizeResponse,
    restrictPromptAccess 
} = require('../middleware/securePrompt');
const {
    requireWhitelistedIP,
    require2FA,
    enhanceSessionSecurity,
    criticalOperationsLimiter
} = require('../middleware/advancedAuth');

// Apply security middleware to all routes
router.use(sanitizeRequest);
router.use(sanitizeResponse);
router.use(requireWhitelistedIP); // 🔒 IP Whitelist check first
router.use(verifyToken);
router.use(requireAdmin);
router.use(requireEmailVerification);
router.use(enhanceSessionSecurity); // 🔒 Enhanced session validation

// 🔒 CRITICAL: Admin dashboard overview
router.get('/dashboard',
    adminController.getDashboardOverview
);

// 🔒 USER MANAGEMENT ROUTES
router.get('/users',
    validateInput([
        validationRules.positiveInteger('page').optional(),
        validationRules.positiveInteger('limit').optional(),
        validationRules.text('search', 0, 100).optional(),
        validationRules.enum('role', ['user', 'admin', 'moderator']).optional(),
        validationRules.enum('subscription', ['free', 'premium', 'enterprise']).optional(),
        validationRules.text('isActive', 0, 10).optional(),
        validationRules.enum('sortBy', ['createdAt', 'lastLogin', 'totalUsage', 'name']).optional()
    ]),
    adminController.getUsers
);

router.get('/users/:userId',
    validateInput([
        validationRules.objectId('userId')
    ]),
    adminController.getUserById
);

router.put('/users/:userId',
    adminActionLimiter,
    validateInput([
        validationRules.objectId('userId'),
        validationRules.enum('role', ['user', 'admin', 'moderator']).optional(),
        validationRules.enum('subscription', ['free', 'premium', 'enterprise']).optional(),
        validationRules.text('isActive', 0, 10).optional(),
        validationRules.text('adminNotes', 0, 1000).optional()
    ]),
    adminController.updateUser
);

router.delete('/users/:userId',
    criticalOperationsLimiter, // 🔒 Extra strict rate limiting
    require2FA, // 🔒 Require 2FA for user deletion
    validateInput([
        validationRules.objectId('userId'),
        validationRules.text('reason', 1, 500)
    ]),
    adminController.deleteUser
);

// Reset user password (admin only)
router.post('/users/:userId/reset-password',
    adminActionLimiter,
    validateInput([
        validationRules.objectId('userId'),
        validationRules.text('reason', 1, 500)
    ]),
    adminController.resetUserPassword
);

// Get user activity logs
router.get('/users/:userId/activity',
    validateInput([
        validationRules.objectId('userId'),
        validationRules.positiveInteger('limit').optional()
    ]),
    adminController.getUserActivity
);

// 🔒 PROMPT MANAGEMENT ROUTES - MAXIMUM SECURITY
router.get('/prompts',
    restrictPromptAccess,
    validateInput([
        validationRules.positiveInteger('page').optional(),
        validationRules.positiveInteger('limit').optional(),
        validationRules.enum('category', ['torah', 'halacha', 'philosophy', 'history', 'general']).optional(),
        validationRules.enum('status', ['active', 'inactive', 'testing']).optional(),
        validationRules.text('search', 0, 100).optional()
    ]),
    adminController.getPrompts
);

// Get single prompt by ID (for editing)
router.get('/prompts/:promptId',
    restrictPromptAccess,
    validateInput([
        validationRules.objectId('promptId')
    ]),
    adminController.getPromptById
);

router.post('/prompts',
    adminActionLimiter,
    restrictPromptAccess,
    validateInput([
        validationRules.text('name', 1, 100),
        validationRules.text('description', 1, 500),
        validationRules.enum('category', ['torah', 'halacha', 'philosophy', 'history', 'general']),
        validationRules.text('content', 10, 10000),
        validationRules.enum('status', ['active', 'inactive', 'testing']).optional(),
        validationRules.positiveInteger('priority').optional()
    ]),
    adminController.createPrompt
);

router.put('/prompts/:promptId',
    adminActionLimiter,
    restrictPromptAccess,
    validateInput([
        validationRules.objectId('promptId'),
        validationRules.text('name', 1, 100).optional(),
        validationRules.text('description', 1, 500).optional(),
        validationRules.enum('category', ['torah', 'halacha', 'philosophy', 'history', 'general']).optional(),
        validationRules.text('content', 10, 10000).optional(),
        validationRules.enum('status', ['active', 'inactive', 'testing']).optional(),
        validationRules.positiveInteger('priority').optional()
    ]),
    adminController.updatePrompt
);

router.delete('/prompts/:promptId',
    criticalOperationsLimiter, // 🔒 Extra strict rate limiting
    require2FA, // 🔒 Require 2FA for prompt deletion
    restrictPromptAccess,
    validateInput([
        validationRules.objectId('promptId'),
        validationRules.text('reason', 1, 500)
    ]),
    adminController.deletePrompt
);

// Test prompt (secure preview without exposing content)
router.post('/prompts/:promptId/test',
    adminActionLimiter,
    restrictPromptAccess,
    validateInput([
        validationRules.objectId('promptId'),
        validationRules.text('testInput', 1, 1000)
    ]),
    adminController.testPrompt
);

// 🔒 SYSTEM LOGS AND ANALYTICS
router.get('/logs',
    validateInput([
        validationRules.positiveInteger('page').optional(),
        validationRules.positiveInteger('limit').optional(),
        validationRules.enum('action', [
            'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
            'PROFILE_UPDATE', 'ROLE_CHANGE', 'USER_DELETE', 'USER_CREATE',
            'PROMPT_CREATE', 'PROMPT_UPDATE', 'PROMPT_DELETE', 'PROMPT_TEST',
            'SYSTEM_CONFIG', 'SECURITY_EVENT', 'ERROR_CRITICAL'
        ]).optional(),
        validationRules.enum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        validationRules.text('search', 0, 100).optional(),
        validationRules.date('startDate').optional(),
        validationRules.date('endDate').optional()
    ]),
    adminController.getLogs
);

router.get('/logs/security',
    validateInput([
        validationRules.positiveInteger('limit').optional(),
        validationRules.enum('severity', ['HIGH', 'CRITICAL']).optional()
    ]),
    adminController.getSecurityLogs
);

// System analytics
router.get('/analytics',
    validateInput([
        validationRules.enum('period', ['24h', '7d', '30d', '90d']).optional(),
        validationRules.enum('metric', ['users', 'requests', 'errors', 'prompts']).optional()
    ]),
    adminController.getAnalytics
);

// 🔒 SYSTEM CONFIGURATION
router.get('/config/system',
    adminController.getSystemConfig
);

router.put('/config/system',
    adminActionLimiter,
    validateInput([
        validationRules.boolean('maintenanceMode').optional(),
        validationRules.positiveInteger('maxUsersPerDay').optional(),
        validationRules.positiveInteger('maxRequestsPerUser').optional(),
        validationRules.text('systemMessage', 0, 500).optional()
    ]),
    adminController.updateSystemConfig
);

// Health check and diagnostics
router.get('/health',
    adminController.getSystemHealth
);

router.post('/maintenance',
    adminActionLimiter,
    validateInput([
        validationRules.boolean('enabled'),
        validationRules.text('message', 0, 200).optional(),
        validationRules.positiveInteger('duration').optional()
    ]),
    adminController.setMaintenanceMode
);

// 🔒 CRITICAL: Block any attempts to access raw prompt data
router.use('/internal/*', (req, res) => {
    res.status(403).json({
        success: false,
        error: 'גישה אסורה - פעולה זו נרשמת במערכת',
        code: 'FORBIDDEN_ADMIN_ACCESS'
    });
});

router.use('/raw/*', restrictPromptAccess);
router.use('/decrypt/*', restrictPromptAccess);

module.exports = router;