const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    // User Reference
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    
    // Subscription Details
    plan: {
        type: String,
        enum: ['free', 'premium', 'enterprise'],
        required: true,
        default: 'free'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled', 'expired', 'past_due', 'trialing'],
        default: 'active'
    },
    
    // Billing Cycle
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly', 'lifetime'],
        default: 'monthly'
    },
    price: {
        amount: {
            type: Number,
            required: true,
            default: 0
        },
        currency: {
            type: String,
            default: 'ILS'
        }
    },
    
    // Dates
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    nextBillingDate: Date,
    cancelledAt: Date,
    
    // Trial
    trialStartDate: Date,
    trialEndDate: Date,
    isTrialUsed: {
        type: Boolean,
        default: false
    },
    
    // Payment
    paymentMethod: {
        type: {
            type: String,
            enum: ['credit_card', 'paypal', 'bank_transfer', 'crypto'],
            required: function() {
                return this.plan !== 'free';
            }
        },
        details: {
            // Will store encrypted payment details
            last4: String, // Last 4 digits of card
            brand: String, // Visa, Mastercard, etc.
            expiryMonth: Number,
            expiryYear: Number
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        stripePaymentMethodId: String
    },
    
    // Usage Limits & Features
    limits: {
        dailyRequests: {
            type: Number,
            required: true
        },
        monthlyRequests: {
            type: Number,
            required: true
        },
        maxTokensPerRequest: {
            type: Number,
            required: true
        },
        maxConversations: {
            type: Number,
            required: true
        },
        maxFileSize: {
            type: Number, // in bytes
            required: true
        },
        apiAccess: {
            type: Boolean,
            default: false
        }
    },
    
    features: {
        prioritySupport: {
            type: Boolean,
            default: false
        },
        advancedAnalytics: {
            type: Boolean,
            default: false
        },
        customPrompts: {
            type: Boolean,
            default: false
        },
        exportFormats: [{
            type: String,
            enum: ['pdf', 'docx', 'txt', 'json', 'csv']
        }],
        collaborationFeatures: {
            type: Boolean,
            default: false
        },
        whiteLabel: {
            type: Boolean,
            default: false
        }
    },
    
    // Usage Tracking
    usage: {
        currentMonth: {
            requests: {
                type: Number,
                default: 0
            },
            tokens: {
                type: Number,
                default: 0
            },
            resetDate: {
                type: Date,
                default: function() {
                    const now = new Date();
                    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
                }
            }
        },
        history: [{
            month: Date,
            requests: Number,
            tokens: Number,
            overage: {
                requests: {
                    type: Number,
                    default: 0
                },
                tokens: {
                    type: Number,
                    default: 0
                },
                charges: {
                    type: Number,
                    default: 0
                }
            }
        }]
    },
    
    // Billing History
    invoices: [{
        invoiceId: String,
        amount: Number,
        currency: String,
        status: {
            type: String,
            enum: ['draft', 'open', 'paid', 'uncollectible', 'void']
        },
        paidAt: Date,
        dueDate: Date,
        description: String,
        downloadUrl: String
    }],
    
    // Notifications & Preferences
    notifications: {
        billingReminders: {
            type: Boolean,
            default: true
        },
        usageAlerts: {
            type: Boolean,
            default: true
        },
        usageThresholds: {
            requests: {
                type: Number,
                default: 80 // Alert at 80% usage
            },
            tokens: {
                type: Number,
                default: 80
            }
        }
    },
    
    // Discounts & Promotions
    discounts: [{
        code: String,
        type: {
            type: String,
            enum: ['percentage', 'fixed_amount']
        },
        value: Number,
        appliedAt: Date,
        expiresAt: Date,
        description: String
    }],
    
    // Referral Program
    referral: {
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        referralCode: String,
        referralCredits: {
            type: Number,
            default: 0
        },
        successfulReferrals: {
            type: Number,
            default: 0
        }
    },
    
    // Cancellation
    cancellation: {
        reason: {
            type: String,
            enum: ['too_expensive', 'not_enough_features', 'technical_issues', 
                   'found_alternative', 'temporary_break', 'other']
        },
        feedback: String,
        cancelledAt: Date,
        effectiveDate: Date, // When cancellation takes effect
        preventCancellation: {
            offered: {
                type: Boolean,
                default: false
            },
            discount: Number,
            accepted: {
                type: Boolean,
                default: false
            }
        }
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ plan: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });

// Virtuals
SubscriptionSchema.virtual('isActive').get(function() {
    return this.status === 'active' && this.endDate > new Date();
});

SubscriptionSchema.virtual('daysLeft').get(function() {
    const now = new Date();
    const end = new Date(this.endDate);
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
});

SubscriptionSchema.virtual('usagePercentage').get(function() {
    const current = this.usage.currentMonth;
    return {
        requests: (current.requests / this.limits.monthlyRequests) * 100,
        tokens: (current.tokens / (this.limits.monthlyRequests * this.limits.maxTokensPerRequest)) * 100
    };
});

SubscriptionSchema.virtual('canUpgrade').get(function() {
    const upgradePaths = {
        'free': ['premium', 'enterprise'],
        'premium': ['enterprise'],
        'enterprise': []
    };
    return upgradePaths[this.plan] || [];
});

// Pre-save middleware
SubscriptionSchema.pre('save', function(next) {
    // Set limits based on plan
    switch (this.plan) {
        case 'free':
            this.limits = {
                dailyRequests: 10,
                monthlyRequests: 300,
                maxTokensPerRequest: 2000,
                maxConversations: 5,
                maxFileSize: 5 * 1024 * 1024, // 5MB
                apiAccess: false
            };
            this.features = {
                prioritySupport: false,
                advancedAnalytics: false,
                customPrompts: false,
                exportFormats: ['txt'],
                collaborationFeatures: false,
                whiteLabel: false
            };
            break;
            
        case 'premium':
            this.limits = {
                dailyRequests: 100,
                monthlyRequests: 3000,
                maxTokensPerRequest: 4000,
                maxConversations: 50,
                maxFileSize: 25 * 1024 * 1024, // 25MB
                apiAccess: true
            };
            this.features = {
                prioritySupport: true,
                advancedAnalytics: true,
                customPrompts: true,
                exportFormats: ['txt', 'pdf', 'docx'],
                collaborationFeatures: true,
                whiteLabel: false
            };
            break;
            
        case 'enterprise':
            this.limits = {
                dailyRequests: 1000,
                monthlyRequests: 30000,
                maxTokensPerRequest: 8000,
                maxConversations: 500,
                maxFileSize: 100 * 1024 * 1024, // 100MB
                apiAccess: true
            };
            this.features = {
                prioritySupport: true,
                advancedAnalytics: true,
                customPrompts: true,
                exportFormats: ['txt', 'pdf', 'docx', 'json', 'csv'],
                collaborationFeatures: true,
                whiteLabel: true
            };
            break;
    }
    
    next();
});

// Instance methods
SubscriptionSchema.methods.updateUsage = function(requests = 0, tokens = 0) {
    const now = new Date();
    const resetDate = this.usage.currentMonth.resetDate;
    
    // Check if we need to reset monthly usage
    if (now >= resetDate) {
        // Archive current month's usage
        this.usage.history.push({
            month: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            requests: this.usage.currentMonth.requests,
            tokens: this.usage.currentMonth.tokens
        });
        
        // Reset current month
        this.usage.currentMonth = {
            requests: 0,
            tokens: 0,
            resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
    }
    
    this.usage.currentMonth.requests += requests;
    this.usage.currentMonth.tokens += tokens;
    
    return this.save();
};

SubscriptionSchema.methods.canMakeRequest = function(tokensRequested = 0) {
    if (!this.isActive) return { allowed: false, reason: 'subscription_inactive' };
    
    const current = this.usage.currentMonth;
    
    if (current.requests >= this.limits.monthlyRequests) {
        return { allowed: false, reason: 'monthly_limit_exceeded' };
    }
    
    if (tokensRequested > this.limits.maxTokensPerRequest) {
        return { allowed: false, reason: 'token_limit_exceeded' };
    }
    
    return { allowed: true };
};

SubscriptionSchema.methods.upgrade = function(newPlan, paymentMethod) {
    this.plan = newPlan;
    this.paymentMethod = paymentMethod;
    this.startDate = new Date();
    this.endDate = this.billingCycle === 'yearly' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    return this.save();
};

SubscriptionSchema.methods.cancel = function(reason, feedback, immediate = false) {
    this.cancellation = {
        reason,
        feedback,
        cancelledAt: new Date(),
        effectiveDate: immediate ? new Date() : this.endDate
    };
    
    if (immediate) {
        this.status = 'cancelled';
        this.endDate = new Date();
    }
    
    return this.save();
};

SubscriptionSchema.methods.addInvoice = function(invoiceData) {
    this.invoices.push(invoiceData);
    return this.save();
};

// Static methods
SubscriptionSchema.statics.findActive = function() {
    return this.find({
        status: 'active',
        endDate: { $gt: new Date() }
    });
};

SubscriptionSchema.statics.findExpiring = function(days = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    
    return this.find({
        status: 'active',
        endDate: { $lte: expiryDate, $gt: new Date() }
    }).populate('user');
};

SubscriptionSchema.statics.getRevenueStats = async function() {
    return await this.aggregate([
        {
            $match: {
                status: { $in: ['active', 'cancelled'] },
                'price.amount': { $gt: 0 }
            }
        },
        {
            $group: {
                _id: {
                    plan: '$plan',
                    billing: '$billingCycle'
                },
                count: { $sum: 1 },
                totalRevenue: { $sum: '$price.amount' },
                averageRevenue: { $avg: '$price.amount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Subscription', SubscriptionSchema);