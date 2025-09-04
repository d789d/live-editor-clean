const express = require('express');
const router = express.Router();

// Import controllers and middleware
const textController = require('../controllers/textController');
const { 
    verifyToken, 
    requireEmailVerification, 
    checkUsageLimits 
} = require('../middleware/auth');
const { 
    claudeApiLimiter,
    validateInput,
    validationRules 
} = require('../middleware/security');
const { 
    sanitizeRequest, 
    sanitizeResponse,
    promptSecurityLimiter,
    restrictPromptAccess 
} = require('../middleware/securePrompt');

// Apply security middleware to all routes
router.use(sanitizeRequest);
router.use(sanitizeResponse);
router.use(verifyToken);
router.use(requireEmailVerification);

// 🔒 SECURE: Main text processing endpoint with maximum security
router.post('/process',
    claudeApiLimiter,
    checkUsageLimits,
    promptSecurityLimiter,
    validateInput([
        validationRules.text('text', 1, 50000),
        validationRules.enum('action', [
            'punctuation', 'nikud', 'sources', 'grammar', 
            'edit', 'format', 'truncate', 'analyze', 'translate', 'custom'
        ]).optional(),
        validationRules.enum('model', [
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022'
        ]).optional(),
        validationRules.positiveInteger('maxTokens').optional(),
        validationRules.text('temperature', 0, 10).optional(),
        validationRules.objectId('conversationId').optional()
    ]),
    textController.processText
);

// Get user's conversations
router.get('/conversations',
    validateInput([
        validationRules.positiveInteger('page').optional(),
        validationRules.positiveInteger('limit').optional(),
        validationRules.enum('category', ['torah', 'halacha', 'philosophy', 'history', 'general']).optional(),
        validationRules.text('search', 0, 100).optional(),
        validationRules.enum('sortBy', ['createdAt', 'lastActivity', 'totalMessages']).optional()
    ]),
    textController.getUserConversations
);

// Get specific conversation
router.get('/conversations/:conversationId',
    validateInput([
        validationRules.objectId('conversationId')
    ]),
    textController.getConversation
);

// Delete conversation
router.delete('/conversations/:conversationId',
    validateInput([
        validationRules.objectId('conversationId')
    ]),
    textController.deleteConversation
);

// 🔒 CRITICAL: Block any attempts to access internal prompt data
router.use('/internal/*', (req, res) => {
    res.status(403).json({
        success: false,
        error: 'גישה אסורה',
        code: 'FORBIDDEN_ACCESS'
    });
});

router.use('/prompts/*', restrictPromptAccess);
router.use('/system/*', restrictPromptAccess);

module.exports = router;