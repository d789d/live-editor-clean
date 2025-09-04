const express = require('express');
const router = express.Router();

// Simple test endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'נתיב הבדיקה פועל!',
        timestamp: new Date().toISOString(),
        data: {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        }
    });
});

// Echo endpoint - returns whatever you send
router.post('/echo', (req, res) => {
    res.json({
        success: true,
        message: 'Echo test successful',
        received: {
            body: req.body,
            query: req.query,
            params: req.params,
            headers: {
                'content-type': req.get('Content-Type'),
                'user-agent': req.get('User-Agent')
            }
        },
        timestamp: new Date().toISOString()
    });
});

// Error test endpoint
router.get('/error', (req, res, next) => {
    const testError = new Error('זוהי שגיאה לצורכי בדיקה');
    testError.status = 400;
    next(testError);
});

module.exports = router;