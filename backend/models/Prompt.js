const mongoose = require('mongoose');

const PromptVersionSchema = new mongoose.Schema({
    version: {
        type: Number,
        required: true
    },
    content: {
        type: String,
        required: [true, 'תוכן הפרומפט נדרש']
    },
    systemPrompt: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    changelog: {
        type: String,
        maxlength: [500, 'רישום שינויים לא יכול להיות יותר מ-500 תווים']
    },
    isActive: {
        type: Boolean,
        default: false
    }
});

const PromptSchema = new mongoose.Schema({
    // Identification
    name: {
        type: String,
        required: [true, 'שם הפרומפט נדרש'],
        unique: true,
        trim: true,
        maxlength: [100, 'שם לא יכול להיות יותר מ-100 תווים']
    },
    key: {
        type: String,
        required: [true, 'מפתח הפרומפט נדרש'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[a-z_]+$/, 'מפתח יכול לכלול רק אותיות אנגליות קטנות וקו תחתון']
    },
    
    // Content & Configuration
    currentVersion: {
        type: Number,
        default: 1
    },
    versions: [PromptVersionSchema],
    
    // Classification
    type: {
        type: String,
        enum: ['punctuation', 'nikud', 'sources', 'grammar', 'edit', 'format', 
               'truncate', 'analyze', 'translate', 'custom', 'system'],
        required: true
    },
    category: {
        type: String,
        enum: ['torah', 'halacha', 'philosophy', 'history', 'general', 'system'],
        default: 'general'
    },
    pageType: {
        type: String,
        enum: ['editor', 'research', 'both'],
        default: 'both',
        required: true
    },
    
    // Metadata
    description: {
        type: String,
        maxlength: [500, 'תיאור לא יכול להיות יותר מ-500 תווים']
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Usage & Performance
    usage: {
        totalUsages: {
            type: Number,
            default: 0
        },
        successRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        averageTokensUsed: {
            type: Number,
            default: 0
        },
        lastUsed: Date,
        popularityScore: {
            type: Number,
            default: 0
        }
    },
    
    // Access Control
    isPublic: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    requiresApproval: {
        type: Boolean,
        default: true
    },
    
    // Permissions
    permissions: {
        canEdit: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            role: {
                type: String,
                enum: ['admin', 'editor', 'viewer'],
                default: 'editor'
            }
        }],
        restrictedToRoles: [{
            type: String,
            enum: ['user', 'premium', 'enterprise', 'admin']
        }]
    },
    
    // A/B Testing
    experiments: [{
        name: String,
        variantA: String,
        variantB: String,
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: false
        },
        results: {
            variantAScore: Number,
            variantBScore: Number,
            winnerVariant: {
                type: String,
                enum: ['A', 'B', 'tie']
            }
        }
    }],
    
    // Quality Control
    quality: {
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 3
        },
        reviews: [{
            reviewer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comment: String,
            reviewDate: {
                type: Date,
                default: Date.now
            }
        }],
        needsReview: {
            type: Boolean,
            default: false
        }
    },
    
    // System Fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
PromptSchema.index({ key: 1 });
PromptSchema.index({ type: 1, isActive: 1 });
PromptSchema.index({ category: 1 });
PromptSchema.index({ pageType: 1 });
PromptSchema.index({ pageType: 1, isActive: 1 });
PromptSchema.index({ isPublic: 1, isActive: 1 });
PromptSchema.index({ 'usage.totalUsages': -1 });
PromptSchema.index({ 'usage.popularityScore': -1 });
PromptSchema.index({ createdAt: -1 });

// Virtuals
PromptSchema.virtual('currentVersionData').get(function() {
    return this.versions.find(v => v.version === this.currentVersion);
});

PromptSchema.virtual('activeVersion').get(function() {
    return this.versions.find(v => v.isActive) || this.currentVersionData;
});

PromptSchema.virtual('totalVersions').get(function() {
    return this.versions.length;
});

PromptSchema.virtual('isUpToDate').get(function() {
    return this.currentVersion === this.versions.length;
});

// Pre-save middleware
PromptSchema.pre('save', function(next) {
    // Set version numbers automatically
    this.versions.forEach((version, index) => {
        if (!version.version) {
            version.version = index + 1;
        }
    });
    
    // Update current version
    if (this.versions.length > 0 && !this.currentVersion) {
        this.currentVersion = this.versions.length;
    }
    
    // Update popularity score based on usage
    const usage = this.usage;
    this.usage.popularityScore = (usage.totalUsages * 0.4) + 
                                 (usage.successRate * 0.3) + 
                                 ((100 - (usage.averageResponseTime / 1000)) * 0.3);
    
    next();
});

// Instance methods
PromptSchema.methods.addVersion = function(content, systemPrompt, createdBy, changelog) {
    const newVersion = {
        version: this.versions.length + 1,
        content,
        systemPrompt,
        createdBy,
        changelog,
        isActive: false
    };
    
    this.versions.push(newVersion);
    return this.save();
};

PromptSchema.methods.activateVersion = function(versionNumber, activatedBy) {
    // Deactivate all versions
    this.versions.forEach(v => v.isActive = false);
    
    // Activate specified version
    const version = this.versions.find(v => v.version === versionNumber);
    if (version) {
        version.isActive = true;
        this.currentVersion = versionNumber;
        this.lastModifiedBy = activatedBy;
    }
    
    return this.save();
};

PromptSchema.methods.updateUsageStats = function(responseTime, tokensUsed, success = true) {
    const usage = this.usage;
    
    usage.totalUsages += 1;
    usage.lastUsed = new Date();
    
    // Update running averages
    const totalUsages = usage.totalUsages;
    usage.averageResponseTime = ((usage.averageResponseTime * (totalUsages - 1)) + responseTime) / totalUsages;
    usage.averageTokensUsed = ((usage.averageTokensUsed * (totalUsages - 1)) + tokensUsed) / totalUsages;
    
    // Update success rate
    const successCount = Math.round((usage.successRate / 100) * (totalUsages - 1));
    const newSuccessCount = successCount + (success ? 1 : 0);
    usage.successRate = Math.round((newSuccessCount / totalUsages) * 100);
    
    return this.save();
};

PromptSchema.methods.addReview = function(reviewer, rating, comment) {
    this.quality.reviews.push({
        reviewer,
        rating,
        comment
    });
    
    // Recalculate average rating
    const totalRating = this.quality.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.quality.rating = totalRating / this.quality.reviews.length;
    
    return this.save();
};

PromptSchema.methods.canUserEdit = function(userId, userRole) {
    // Admins can always edit
    if (userRole === 'admin') return true;
    
    // Check specific permissions
    const permission = this.permissions.canEdit.find(p => 
        p.user.toString() === userId.toString()
    );
    
    return permission && permission.role !== 'viewer';
};

PromptSchema.methods.canUserUse = function(userRole, subscriptionType) {
    if (!this.isActive) return false;
    
    // Check role restrictions
    if (this.permissions.restrictedToRoles.length > 0) {
        return this.permissions.restrictedToRoles.includes(userRole) ||
               this.permissions.restrictedToRoles.includes(subscriptionType);
    }
    
    return this.isPublic || userRole === 'admin';
};

// Static methods
PromptSchema.statics.findByKey = function(key) {
    return this.findOne({ key, isActive: true });
};

PromptSchema.statics.findByType = function(type, options = {}) {
    const query = { type, isActive: true };
    
    if (options.userRole && options.subscriptionType) {
        // Add permission filtering logic here
    }
    
    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .sort(options.sort || { 'usage.popularityScore': -1 });
};

PromptSchema.statics.findByPageType = function(pageType, options = {}) {
    const query = { 
        isActive: true,
        $or: [
            { pageType: pageType },
            { pageType: 'both' }
        ]
    };
    
    if (options.type) query.type = options.type;
    if (options.category) query.category = options.category;
    
    if (options.userRole && options.subscriptionType) {
        // Add permission filtering logic here
    }
    
    return this.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName')
        .sort(options.sort || { 'usage.popularityScore': -1 });
};

PromptSchema.statics.getPopularPrompts = function(limit = 10) {
    return this.find({ isActive: true, isPublic: true })
        .sort({ 'usage.popularityScore': -1 })
        .limit(limit)
        .populate('createdBy', 'firstName lastName');
};

PromptSchema.statics.searchPrompts = function(searchTerm, options = {}) {
    const query = {
        isActive: true,
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { tags: { $regex: searchTerm, $options: 'i' } },
            { 'versions.content': { $regex: searchTerm, $options: 'i' } }
        ]
    };
    
    if (options.type) query.type = options.type;
    if (options.category) query.category = options.category;
    
    return this.find(query)
        .sort({ 'usage.popularityScore': -1 })
        .limit(options.limit || 20);
};

PromptSchema.statics.getUsageStats = async function() {
    return await this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalUsages: { $sum: '$usage.totalUsages' },
                avgSuccessRate: { $avg: '$usage.successRate' },
                avgResponseTime: { $avg: '$usage.averageResponseTime' }
            }
        }
    ]);
};

module.exports = mongoose.model('Prompt', PromptSchema);