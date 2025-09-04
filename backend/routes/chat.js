const express = require('express');
const router = express.Router();

// Import controllers and middleware
const textController = require('../controllers/textController');
const { 
    claudeApiLimiter,
    validateInput,
    validationRules 
} = require('../middleware/security');

// Simple chat endpoint for frontend testing - No auth required
router.post('/', 
    claudeApiLimiter,
    validateInput([
        validationRules.text('message', 1, 50000),
        validationRules.enum('action', [
            'punctuation', 'nikud', 'nikud-partial', 'paragraphs', 'headers', 'sources', 'index',
            'simplify', 'expand', 'comments', 'compare', 'rewrite', 'custom', 'grammar', 
            'edit', 'format', 'truncate', 'analyze', 'translate', 'continue'
        ]).optional(),
        validationRules.enum('model', [
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022'
        ]).optional(),
        validationRules.positiveInteger('max_tokens').optional(),
        validationRules.text('temperature', 0, 10).optional()
    ]),
    textController.processChatMessage
);

module.exports = router;