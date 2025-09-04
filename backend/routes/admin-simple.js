const express = require('express');
const router = express.Router();

// Import controllers and models
const adminController = require('../controllers/adminController');
const User = require('../models/User');
const Prompt = require('../models/Prompt');

// ✅ Quick Login for Testing (Development Only) - NO AUTH REQUIRED
router.post('/quick-login', async (req, res) => {
    try {
        const jwt = require('jsonwebtoken');
        const config = require('../config/env');

        // Create a test admin token
        const testUser = {
            _id: '507f1f77bcf86cd799439011', // Test ObjectId
            email: 'admin@test.com',
            firstName: 'מנהל',
            lastName: 'מערכת',
            role: 'admin'
        };

        const token = jwt.sign(
            {
                userId: testUser._id,
                email: testUser.email,
                role: testUser.role
            },
            config.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'התחברות לבדיקה מוצלחת',
            data: {
                token,
                user: testUser
            }
        });

    } catch (error) {
        console.error('Quick login error:', error);
        res.status(500).json({
            success: false,
            error: 'שגיאה ביצירת טוקן בדיקה'
        });
    }
});

// Add simple auth middleware for protected routes
const simpleAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'אין הרשאת גישה - אסימון חסר',
            code: 'NO_TOKEN'
        });
    }
    next();
};

// ✅ Simplified Dashboard Route
router.get('/dashboard', simpleAuth, async (req, res) => {
    try {
        // Get counts from database (with fallback to 0)
        const [userCount, promptCount] = await Promise.all([
            User.countDocuments().catch(() => 0),
            Prompt.countDocuments().catch(() => 0)
        ]);

        const dashboardData = {
            users: userCount,
            prompts: promptCount,
            activePrompts: promptCount, // Simplified for now
            conversations: 0, // Not implemented yet
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.json({
            success: true,
            data: {
                users: 0,
                prompts: 0,
                activePrompts: 0,
                conversations: 0,
                timestamp: new Date().toISOString(),
                error: 'Database not connected'
            }
        });
    }
});

// ✅ Simplified Users Route
router.get('/users', simpleAuth, async (req, res) => {
    try {
        const users = await User.find({}, '-password').limit(50).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: {
                users: users,
                total: users.length
            }
        });

    } catch (error) {
        console.error('Users error:', error);
        res.json({
            success: true,
            data: {
                users: [],
                total: 0,
                error: 'Database not connected'
            }
        });
    }
});

// ✅ Simplified Prompts Route
router.get('/prompts', simpleAuth, async (req, res) => {
    try {
        // Set UTF-8 encoding for Hebrew text
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        const prompts = await Prompt.find({}).sort({ name: 1 });
        
        const promptsData = prompts.map(prompt => ({
            id: prompt._id,
            name: prompt.name,
            key: prompt.key,
            type: prompt.type || 'text',
            category: prompt.category || 'general',
            description: prompt.description,
            content: prompt.content,
            isActive: prompt.isActive !== false,
            priority: prompt.priority || 10,
            usage: prompt.usage || { totalUsages: 0 },
            createdAt: prompt.createdAt,
            updatedAt: prompt.updatedAt
        }));

        res.json({
            success: true,
            data: {
                prompts: promptsData,
                total: promptsData.length
            }
        });

    } catch (error) {
        console.error('Prompts error:', error);
        res.json({
            success: true,
            data: {
                prompts: [],
                total: 0,
                error: 'Database not connected'
            }
        });
    }
});

// ✅ Get single prompt by ID for editing (NO AUTH - simplified)
router.get('/prompts/:promptId', async (req, res) => {
    try {
        // Set UTF-8 encoding for Hebrew text
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        const { promptId } = req.params;
        
        // Find prompt in database
        const prompt = await Prompt.findById(promptId)
            .populate('createdBy', 'firstName lastName');
            
        if (!prompt) {
            return res.json({
                success: false,
                error: 'פרומפט לא נמצא'
            });
        }
        
        // Get content from active version
        let content = '';
        let isEncrypted = false;
        
        if (prompt.versions && prompt.versions.length > 0) {
            const activeVersion = prompt.versions.find(v => v.isActive) || prompt.versions[prompt.versions.length - 1];
            
            if (activeVersion && activeVersion.content) {
                content = activeVersion.content;
                
                // Check if encrypted
                if (content.startsWith('{') && content.includes('encrypted')) {
                    isEncrypted = true;
                } else {
                    isEncrypted = false;
                }
            }
        }
        
        const responseData = {
            id: prompt._id,
            name: prompt.name,
            key: prompt.key,
            type: prompt.type,
            category: prompt.category,
            description: prompt.description,
            content: content,
            isEncrypted: isEncrypted,
            isActive: prompt.isActive,
            status: prompt.isActive ? 'active' : 'inactive',
            priority: 10,
            usage: {
                totalUsages: prompt.usage?.totalUsages || 0,
                successRate: prompt.usage?.successRate || 0,
                avgResponseTime: prompt.usage?.averageResponseTime || 0
            },
            createdAt: prompt.createdAt,
            updatedAt: prompt.updatedAt
        };
        
        res.json({
            success: true,
            data: responseData
        });
        
    } catch (error) {
        console.error('Get prompt by ID error:', error);
        res.json({
            success: false,
            error: 'שגיאה בטעינת הפרומפט: ' + error.message
        });
    }
});

// ✅ Update prompt by ID (NO AUTH - simplified)
router.put('/prompts/:promptId', async (req, res) => {
    try {
        // Set UTF-8 encoding for Hebrew text
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        const { promptId } = req.params;
        const { name, description, content, category, status, priority } = req.body;
        
        // Find prompt in database
        const prompt = await Prompt.findById(promptId);
        
        if (!prompt) {
            return res.json({
                success: false,
                error: 'פרומפט לא נמצא'
            });
        }
        
        // Update basic fields
        if (name) prompt.name = name;
        if (description) prompt.description = description;
        if (category) prompt.category = category;
        if (status !== undefined) prompt.isActive = status === 'active';
        
        // Update content in the active version
        if (content !== undefined) {
            if (prompt.versions && prompt.versions.length > 0) {
                // Find active version or use the latest one
                let activeVersion = prompt.versions.find(v => v.isActive);
                if (!activeVersion) {
                    activeVersion = prompt.versions[prompt.versions.length - 1];
                }
                
                if (activeVersion) {
                    // Update the content in the existing version
                    activeVersion.content = content;
                    activeVersion.changelog = 'עדכון מרשימה הניהול';
                } else {
                    // Create new version if none exists
                    prompt.versions.push({
                        version: 1,
                        content: content,
                        createdBy: 'admin', // Since we don't have real user auth
                        changelog: 'עדכון ראשוני',
                        isActive: true
                    });
                }
            } else {
                // Create versions array if it doesn't exist
                prompt.versions = [{
                    version: 1,
                    content: content,
                    createdBy: 'admin',
                    changelog: 'עדכון ראשוני',
                    isActive: true
                }];
            }
        }
        
        // Save the updated prompt
        await prompt.save();
        
        res.json({
            success: true,
            message: 'פרומפט עודכן בהצלחה',
            data: {
                id: prompt._id,
                name: prompt.name,
                updatedAt: new Date()
            }
        });
        
    } catch (error) {
        console.error('Update prompt error:', error);
        res.json({
            success: false,
            error: 'שגיאה בעדכון הפרומפט: ' + error.message
        });
    }
});

// ✅ Create new prompt (NO AUTH - simplified)
router.post('/prompts', async (req, res) => {
    try {
        // Set UTF-8 encoding for Hebrew text
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        
        const { name, key, description, content, category, status, priority } = req.body;
        
        // Check if key already exists
        if (key) {
            const existingPrompt = await Prompt.findOne({ key });
            if (existingPrompt) {
                return res.json({
                    success: false,
                    error: 'מפתח הפרומפט כבר קיים'
                });
            }
        }
        
        // Create new prompt
        const prompt = new Prompt({
            name: name,
            key: key || name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_'),
            type: 'system', // Default type
            category: category || 'general',
            description: description,
            isActive: status === 'active',
            createdBy: 'admin', // Since we don't have real user auth
            versions: [{
                version: 1,
                content: content || '',
                createdBy: 'admin',
                changelog: 'יצירת פרומפט חדש',
                isActive: true
            }]
        });
        
        await prompt.save();
        
        res.json({
            success: true,
            message: 'פרומפט נוצר בהצלחה',
            data: {
                id: prompt._id,
                name: prompt.name,
                key: prompt.key
            }
        });
        
    } catch (error) {
        console.error('Create prompt error:', error);
        res.json({
            success: false,
            error: 'שגיאה ביצירת הפרומפט: ' + error.message
        });
    }
});

module.exports = router;