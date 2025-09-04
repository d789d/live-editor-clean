const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
    // Who performed the action
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Action details
    action: {
        type: String,
        required: [true, 'סוג הפעולה נדרש'],
        enum: [
            // User Management
            'user_created', 'user_updated', 'user_deleted', 'user_banned', 'user_unbanned',
            'user_role_changed', 'user_subscription_changed', 'user_verified', 'user_unverified',
            
            // Prompt Management
            'prompt_created', 'prompt_updated', 'prompt_deleted', 'prompt_activated',
            'prompt_deactivated', 'prompt_version_added', 'prompt_approved', 'prompt_rejected',
            
            // Content Management
            'conversation_deleted', 'conversation_moderated', 'content_flagged', 'content_approved',
            
            // System Settings
            'settings_updated', 'system_config_changed', 'feature_toggled',
            'rate_limits_changed', 'maintenance_mode_toggled',
            
            // Security
            'login_attempt', 'login_success', 'login_failed', 'logout',
            'password_changed', 'email_changed', '2fa_enabled', '2fa_disabled',
            'ip_whitelisted', 'ip_blacklisted', 'security_alert',
            
            // API & Integration
            'api_key_created', 'api_key_revoked', 'webhook_configured',
            'integration_enabled', 'integration_disabled',
            
            // Monitoring & Analytics
            'report_generated', 'backup_created', 'backup_restored',
            'log_exported', 'analytics_accessed'
        ]
    },
    
    // Target of the action (what was affected)
    targetType: {
        type: String,
        enum: ['user', 'prompt', 'conversation', 'subscription', 'system', 'api', 'content'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    targetName: String, // Human readable name
    
    // Action context
    description: {
        type: String,
        required: [true, 'תיאור הפעולה נדרש'],
        maxlength: [1000, 'תיאור לא יכול להיות יותר מ-1000 תווים']
    },
    
    // Changes made (before/after for updates)
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed
    },
    
    // Request information
    request: {
        method: String, // GET, POST, PUT, DELETE
        endpoint: String, // API endpoint used
        userAgent: String,
        ipAddress: {
            type: String,
            required: true,
            index: true
        },
        sessionId: String
    },
    
    // Result of the action
    result: {
        status: {
            type: String,
            enum: ['success', 'error', 'partial', 'pending'],
            default: 'success'
        },
        message: String,
        errorCode: String,
        errorDetails: mongoose.Schema.Types.Mixed
    },
    
    // Security & Compliance
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
        index: true
    },
    
    // Flags for special attention
    flags: {
        requiresReview: {
            type: Boolean,
            default: false
        },
        isSecurityEvent: {
            type: Boolean,
            default: false
        },
        isCompliance: {
            type: Boolean,
            default: false
        },
        isAutomated: {
            type: Boolean,
            default: false
        }
    },
    
    // Related logs (for grouped actions)
    relatedLogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminLog'
    }],
    
    // Additional metadata
    metadata: {
        duration: Number, // Action duration in milliseconds
        resourcesAffected: Number,
        batchId: String, // For bulk operations
        version: String, // System version when action occurred
        feature: String, // Feature/module involved
        tags: [String]
    },
    
    // Review information
    review: {
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        reviewStatus: {
            type: String,
            enum: ['pending', 'approved', 'flagged', 'ignored']
        },
        reviewNotes: String
    }
    
}, {
    timestamps: true,
    // Keep logs for compliance - don't auto-expire
    expires: null 
});

// Indexes for performance
AdminLogSchema.index({ admin: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1 });
AdminLogSchema.index({ 'request.ipAddress': 1, createdAt: -1 });
AdminLogSchema.index({ severity: 1, createdAt: -1 });
AdminLogSchema.index({ 'flags.isSecurityEvent': 1, createdAt: -1 });
AdminLogSchema.index({ 'flags.requiresReview': 1, createdAt: -1 });
AdminLogSchema.index({ createdAt: -1 }); // For general log browsing

// Compound indexes for common queries
AdminLogSchema.index({ admin: 1, action: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, action: 1, createdAt: -1 });

// Virtual for formatted timestamp
AdminLogSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
});

// Virtual for action display name in Hebrew
AdminLogSchema.virtual('actionDisplayName').get(function() {
    const actionNames = {
        // User Management
        'user_created': 'יצירת משתמש',
        'user_updated': 'עדכון משתמש',
        'user_deleted': 'מחיקת משתמש',
        'user_banned': 'חסימת משתמש',
        'user_unbanned': 'ביטול חסימת משתמש',
        'user_role_changed': 'שינוי תפקיד משתמש',
        'user_subscription_changed': 'שינוי מנוי משתמש',
        
        // Prompt Management  
        'prompt_created': 'יצירת פרומפט',
        'prompt_updated': 'עדכון פרומפט',
        'prompt_deleted': 'מחיקת פרומפט',
        'prompt_activated': 'הפעלת פרומפט',
        'prompt_deactivated': 'ביטול הפעלת פרומפט',
        
        // Security
        'login_success': 'כניסה מוצלחת',
        'login_failed': 'כניסה נכשלה',
        'security_alert': 'התראת אבטחה',
        
        // System
        'settings_updated': 'עדכון הגדרות',
        'system_config_changed': 'שינוי תצורת מערכת'
    };
    
    return actionNames[this.action] || this.action;
});

// Virtual for severity color (for UI)
AdminLogSchema.virtual('severityColor').get(function() {
    const colors = {
        low: '#28a745',     // Green
        medium: '#ffc107',  // Yellow
        high: '#fd7e14',    // Orange
        critical: '#dc3545' // Red
    };
    return colors[this.severity] || colors.low;
});

// Pre-save middleware
AdminLogSchema.pre('save', function(next) {
    // Auto-set severity based on action type
    if (!this.severity || this.severity === 'low') {
        const highSeverityActions = [
            'user_deleted', 'user_banned', 'prompt_deleted', 
            'system_config_changed', 'security_alert',
            'ip_whitelisted', 'ip_blacklisted'
        ];
        
        const mediumSeverityActions = [
            'user_role_changed', 'user_subscription_changed',
            'prompt_activated', 'prompt_deactivated',
            'settings_updated', 'login_failed'
        ];
        
        if (highSeverityActions.includes(this.action)) {
            this.severity = 'high';
        } else if (mediumSeverityActions.includes(this.action)) {
            this.severity = 'medium';
        }
    }
    
    // Set security event flag
    const securityActions = [
        'login_failed', 'security_alert', 'ip_whitelisted', 
        'ip_blacklisted', '2fa_enabled', '2fa_disabled',
        'password_changed', 'email_changed'
    ];
    
    if (securityActions.includes(this.action)) {
        this.flags.isSecurityEvent = true;
    }
    
    // Set requires review flag for critical actions
    const reviewRequiredActions = [
        'user_deleted', 'prompt_deleted', 'system_config_changed',
        'security_alert', 'user_banned'
    ];
    
    if (reviewRequiredActions.includes(this.action)) {
        this.flags.requiresReview = true;
    }
    
    next();
});

// Instance methods
AdminLogSchema.methods.addRelatedLog = function(logId) {
    this.relatedLogs.push(logId);
    return this.save();
};

AdminLogSchema.methods.markReviewed = function(reviewedBy, status, notes) {
    this.review = {
        reviewedBy,
        reviewedAt: new Date(),
        reviewStatus: status,
        reviewNotes: notes
    };
    return this.save();
};

// Static methods
AdminLogSchema.statics.logAction = async function(data) {
    const log = new this(data);
    await log.save();
    
    // Auto-alert for critical actions
    if (log.severity === 'critical' || log.flags.isSecurityEvent) {
        // Here you could trigger notifications, emails, etc.
        console.log(`🚨 Critical admin action: ${log.action} by ${log.admin}`);
    }
    
    return log;
};

AdminLogSchema.statics.getAdminActivity = function(adminId, startDate, endDate) {
    const query = { admin: adminId };
    
    if (startDate && endDate) {
        query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .populate('admin', 'firstName lastName email')
        .limit(100);
};

AdminLogSchema.statics.getSecurityEvents = function(hours = 24) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.find({
        'flags.isSecurityEvent': true,
        createdAt: { $gte: since }
    })
    .sort({ createdAt: -1 })
    .populate('admin', 'firstName lastName email');
};

AdminLogSchema.statics.getActionsByType = function(actionType, limit = 50) {
    return this.find({ action: actionType })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('admin', 'firstName lastName email');
};

AdminLogSchema.statics.getFailedActions = function(hours = 24) {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.find({
        'result.status': 'error',
        createdAt: { $gte: since }
    })
    .sort({ createdAt: -1 })
    .populate('admin', 'firstName lastName email');
};

AdminLogSchema.statics.getStatsByAdmin = async function(startDate, endDate) {
    const matchStage = {};
    if (startDate && endDate) {
        matchStage.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    
    return await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$admin',
                totalActions: { $sum: 1 },
                successfulActions: {
                    $sum: { $cond: [{ $eq: ['$result.status', 'success'] }, 1, 0] }
                },
                failedActions: {
                    $sum: { $cond: [{ $eq: ['$result.status', 'error'] }, 1, 0] }
                },
                securityEvents: {
                    $sum: { $cond: ['$flags.isSecurityEvent', 1, 0] }
                },
                lastActivity: { $max: '$createdAt' },
                actions: { $push: '$action' }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'adminInfo'
            }
        },
        {
            $project: {
                totalActions: 1,
                successfulActions: 1,
                failedActions: 1,
                securityEvents: 1,
                successRate: {
                    $multiply: [
                        { $divide: ['$successfulActions', '$totalActions'] },
                        100
                    ]
                },
                lastActivity: 1,
                adminName: { $concat: [
                    { $arrayElemAt: ['$adminInfo.firstName', 0] },
                    ' ',
                    { $arrayElemAt: ['$adminInfo.lastName', 0] }
                ]},
                adminEmail: { $arrayElemAt: ['$adminInfo.email', 0] }
            }
        },
        { $sort: { totalActions: -1 } }
    ]);
};

AdminLogSchema.statics.getActionTrends = async function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    action: '$action'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                actions: {
                    $push: {
                        action: '$_id.action',
                        count: '$count'
                    }
                },
                totalActions: { $sum: '$count' }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = mongoose.model('AdminLog', AdminLogSchema);