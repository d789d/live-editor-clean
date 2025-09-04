const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Personal Info
    email: {
        type: String,
        required: [true, 'כתובת אימייל נדרשת'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'כתובת אימייל לא תקינה']
    },
    password: {
        type: String,
        required: function() {
            // Password required only if no googleId (not a Google OAuth user)
            return !this.googleId;
        },
        minlength: [6, 'סיסמה חייבת להכיל לפחות 6 תווים']
    },
    firstName: {
        type: String,
        required: [true, 'שם פרטי נדרש'],
        trim: true,
        maxlength: [50, 'שם פרטי לא יכול להיות יותר מ-50 תווים']
    },
    lastName: {
        type: String,
        required: [true, 'שם משפחה נדרש'],
        trim: true,
        maxlength: [50, 'שם משפחה לא יכול להיות יותר מ-50 תווים']
    },
    
    // OAuth Integration
    googleId: {
        type: String,
        sparse: true // Allow multiple null values but unique non-null values
    },
    avatar: {
        type: String,
        trim: true
    },
    
    // Account Status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Subscription & Usage
    subscriptionType: {
        type: String,
        enum: ['free', 'premium', 'enterprise'],
        default: 'free'
    },
    subscriptionExpires: Date,
    
    // Usage Statistics
    usage: {
        tokensUsed: {
            type: Number,
            default: 0
        },
        requestsToday: {
            type: Number,
            default: 0
        },
        lastRequestDate: Date,
        totalRequests: {
            type: Number,
            default: 0
        }
    },
    
    // Limits based on subscription
    limits: {
        dailyRequests: {
            type: Number,
            default: 10 // Free users
        },
        maxTokensPerRequest: {
            type: Number,
            default: 2000
        },
        maxConversations: {
            type: Number,
            default: 5
        }
    },
    
    // User Preferences
    preferences: {
        language: {
            type: String,
            default: 'he'
        },
        defaultModel: {
            type: String,
            default: 'claude-sonnet-4-20250514'
        },
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            usage: {
                type: Boolean,
                default: true
            }
        }
    },
    
    // Account Management
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    lastActivity: {
        type: Date,
        default: Date.now
    },
    
    // Profile
    avatar: String,
    bio: {
        type: String,
        maxlength: [500, 'ביוגרפיה לא יכולה להיות יותר מ-500 תווים']
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ subscriptionType: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for subscription status
UserSchema.virtual('isSubscriptionActive').get(function() {
    if (this.subscriptionType === 'free') return true;
    return this.subscriptionExpires && this.subscriptionExpires > new Date();
});

// Virtual for daily usage check
UserSchema.virtual('canMakeRequest').get(function() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastRequest = this.usage.lastRequestDate;
    if (!lastRequest || lastRequest < today) {
        return true; // New day
    }
    
    return this.usage.requestsToday < this.limits.dailyRequests;
});

// Pre-save middleware
UserSchema.pre('save', async function(next) {
    // Hash password if modified
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.pre('save', function(next) {
    // Update limits based on subscription
    switch (this.subscriptionType) {
        case 'free':
            this.limits.dailyRequests = 10;
            this.limits.maxTokensPerRequest = 2000;
            this.limits.maxConversations = 5;
            break;
        case 'premium':
            this.limits.dailyRequests = 100;
            this.limits.maxTokensPerRequest = 4000;
            this.limits.maxConversations = 50;
            break;
        case 'enterprise':
            this.limits.dailyRequests = 1000;
            this.limits.maxTokensPerRequest = 8000;
            this.limits.maxConversations = 500;
            break;
    }
    next();
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.updateUsage = function(tokensUsed) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset daily counter if it's a new day
    if (!this.usage.lastRequestDate || this.usage.lastRequestDate < today) {
        this.usage.requestsToday = 0;
    }
    
    this.usage.tokensUsed += tokensUsed;
    this.usage.requestsToday += 1;
    this.usage.totalRequests += 1;
    this.usage.lastRequestDate = new Date();
    this.lastActivity = new Date();
};

UserSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    delete user.emailVerificationToken;
    delete user.emailVerificationExpires;
    return user;
};

// Static methods
UserSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.getActiveUsers = function() {
    return this.find({ isActive: true, isEmailVerified: true });
};

UserSchema.statics.getUserStats = async function() {
    return await this.aggregate([
        {
            $group: {
                _id: '$subscriptionType',
                count: { $sum: 1 },
                totalTokensUsed: { $sum: '$usage.tokensUsed' },
                totalRequests: { $sum: '$usage.totalRequests' }
            }
        }
    ]);
};

module.exports = mongoose.model('User', UserSchema);