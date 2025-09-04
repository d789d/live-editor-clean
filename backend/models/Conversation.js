const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: [true, 'תוכן ההודעה נדרש']
    },
    tokensUsed: {
        type: Number,
        default: 0
    },
    processingTime: {
        type: Number, // milliseconds
        default: 0
    },
    model: String,
    action: {
        type: String,
        enum: ['punctuation', 'nikud', 'sources', 'grammar', 'edit', 'format', 
               'truncate', 'analyze', 'translate', 'custom', 'chat'],
        default: 'chat'
    },
    systemPrompt: String, // For custom actions
    metadata: {
        inputWordCount: Number,
        outputWordCount: Number,
        language: String,
        category: String
    }
}, {
    timestamps: true
});

const ConversationSchema = new mongoose.Schema({
    // Owner
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Conversation Details
    title: {
        type: String,
        required: [true, 'כותרת השיחה נדרשת'],
        trim: true,
        maxlength: [200, 'כותרת לא יכולה להיות יותר מ-200 תווים']
    },
    description: {
        type: String,
        maxlength: [1000, 'תיאור לא יכול להיות יותר מ-1000 תווים']
    },
    
    // Messages
    messages: [MessageSchema],
    
    // Classification & Organization
    category: {
        type: String,
        enum: ['torah', 'halacha', 'philosophy', 'history', 'general'],
        default: 'general'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    
    // Status & Permissions
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isShared: {
        type: Boolean,
        default: false
    },
    sharedWith: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permissions: {
            type: String,
            enum: ['read', 'comment', 'edit'],
            default: 'read'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Statistics
    stats: {
        totalMessages: {
            type: Number,
            default: 0
        },
        totalTokensUsed: {
            type: Number,
            default: 0
        },
        totalProcessingTime: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        wordCount: {
            input: {
                type: Number,
                default: 0
            },
            output: {
                type: Number,
                default: 0
            }
        },
        views: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    },
    
    // Original Text (if started from text processing)
    originalText: {
        content: String,
        wordCount: Number,
        language: String,
        source: String // 'upload', 'paste', 'api'
    },
    
    // Export & Backup
    exportFormats: [{
        format: {
            type: String,
            enum: ['pdf', 'docx', 'txt', 'json']
        },
        url: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date
    }],
    
    // AI Model Used
    primaryModel: {
        type: String,
        default: 'claude-sonnet-4-20250514'
    },
    
    // Quality & Feedback
    rating: {
        overall: {
            type: Number,
            min: 1,
            max: 5
        },
        accuracy: Number,
        helpfulness: Number,
        clarity: Number,
        ratedAt: Date,
        feedback: String
    },
    
    // Favorites & Bookmarks
    isFavorite: {
        type: Boolean,
        default: false
    },
    bookmarks: [{
        messageIndex: Number,
        note: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
ConversationSchema.index({ user: 1, status: 1 });
ConversationSchema.index({ user: 1, createdAt: -1 });
ConversationSchema.index({ category: 1 });
ConversationSchema.index({ tags: 1 });
ConversationSchema.index({ isPublic: 1 });
ConversationSchema.index({ 'stats.lastActivity': -1 });

// Virtual for message count
ConversationSchema.virtual('messageCount').get(function() {
    return this.messages.length;
});

// Virtual for last message
ConversationSchema.virtual('lastMessage').get(function() {
    return this.messages[this.messages.length - 1];
});

// Virtual for duration
ConversationSchema.virtual('duration').get(function() {
    if (this.messages.length < 2) return 0;
    const first = this.messages[0].createdAt;
    const last = this.messages[this.messages.length - 1].createdAt;
    return last - first;
});

// Pre-save middleware
ConversationSchema.pre('save', function(next) {
    // Update stats
    if (this.messages.length > 0) {
        this.stats.totalMessages = this.messages.length;
        this.stats.totalTokensUsed = this.messages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0);
        this.stats.totalProcessingTime = this.messages.reduce((sum, msg) => sum + (msg.processingTime || 0), 0);
        this.stats.averageResponseTime = this.stats.totalProcessingTime / this.stats.totalMessages;
        
        this.stats.wordCount.input = this.messages
            .filter(msg => msg.role === 'user')
            .reduce((sum, msg) => sum + (msg.metadata?.inputWordCount || 0), 0);
        
        this.stats.wordCount.output = this.messages
            .filter(msg => msg.role === 'assistant')
            .reduce((sum, msg) => sum + (msg.metadata?.outputWordCount || 0), 0);
        
        this.stats.lastActivity = new Date();
    }
    
    // Auto-generate title if not provided
    if (!this.title && this.messages.length > 0) {
        const firstUserMessage = this.messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
            this.title = firstUserMessage.content.substring(0, 50) + '...';
        }
    }
    
    next();
});

// Instance methods
ConversationSchema.methods.addMessage = function(messageData) {
    this.messages.push(messageData);
    this.save();
};

ConversationSchema.methods.getMessagesForAPI = function() {
    return this.messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
};

ConversationSchema.methods.incrementViews = function() {
    this.stats.views += 1;
    return this.save();
};

ConversationSchema.methods.archive = function() {
    this.status = 'archived';
    return this.save();
};

ConversationSchema.methods.softDelete = function() {
    this.status = 'deleted';
    return this.save();
};

ConversationSchema.methods.shareWith = function(userId, permissions = 'read') {
    const existingShare = this.sharedWith.find(s => s.user.toString() === userId.toString());
    
    if (existingShare) {
        existingShare.permissions = permissions;
        existingShare.sharedAt = new Date();
    } else {
        this.sharedWith.push({
            user: userId,
            permissions: permissions
        });
    }
    
    this.isShared = true;
    return this.save();
};

// Static methods
ConversationSchema.statics.findByUser = function(userId, options = {}) {
    const query = { user: userId, status: { $ne: 'deleted' } };
    
    if (options.category) query.category = options.category;
    if (options.tags) query.tags = { $in: options.tags };
    if (options.isPublic !== undefined) query.isPublic = options.isPublic;
    
    return this.find(query)
        .sort(options.sort || { 'stats.lastActivity': -1 })
        .limit(options.limit || 50)
        .populate('user', 'firstName lastName email');
};

ConversationSchema.statics.getPublicConversations = function(options = {}) {
    return this.find({ isPublic: true, status: 'active' })
        .sort({ 'stats.views': -1, createdAt: -1 })
        .limit(options.limit || 20)
        .populate('user', 'firstName lastName');
};

ConversationSchema.statics.searchConversations = function(userId, searchTerm, options = {}) {
    const query = {
        user: userId,
        status: { $ne: 'deleted' },
        $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { 'messages.content': { $regex: searchTerm, $options: 'i' } },
            { tags: { $regex: searchTerm, $options: 'i' } }
        ]
    };
    
    return this.find(query)
        .sort({ 'stats.lastActivity': -1 })
        .limit(options.limit || 20);
};

ConversationSchema.statics.getUserStats = async function(userId) {
    const result = await this.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: { $ne: 'deleted' } } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalTokens: { $sum: '$stats.totalTokensUsed' },
                totalMessages: { $sum: '$stats.totalMessages' },
                averageRating: { $avg: '$rating.overall' }
            }
        }
    ]);
    
    return result;
};

module.exports = mongoose.model('Conversation', ConversationSchema);