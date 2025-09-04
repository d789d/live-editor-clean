const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import configurations
const config = require('./backend/config/env');
const connectDB = require('./backend/config/database');
const passport = require('./backend/config/passport');

// Import middleware
const { 
    generalLimiter, 
    securityHeaders, 
    sanitizeInput, 
    corsOptions,
    requestLogger,
    errorHandler,
    notFound 
} = require('./backend/middleware/security');

// Import routes
const healthRoutes = require('./backend/routes/health');
const testRoutes = require('./backend/routes/test');
const authRoutes = require('./backend/routes/auth');
const textRoutes = require('./backend/routes/text');
const adminRoutes = require('./backend/routes/admin-simple');
const setupRoutes = require('./backend/routes/setup');
const chatRoutes = require('./backend/routes/chat');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// UTF-8 encoding for responses
app.use((req, res, next) => {
    // Only set JSON content type for API routes
    if (req.path.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
});

// CORS
app.use(cors(corsOptions));

// Request logging
if (config.NODE_ENV === 'development') {
    app.use(requestLogger);
}

// Session configuration for OAuth
app.use(session({
    secret: config.SESSION_SECRET || config.JWT_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.MONGODB_URI || config.DATABASE_URL || 'mongodb://localhost:27017/claude-chat'
    }),
    cookie: {
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Body parsing middleware
app.use(express.json({ 
    limit: '10mb',
    strict: true
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use(generalLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/text', textRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/setup', setupRoutes); // Development only
app.use('/api/chat', chatRoutes); // Simple chat for frontend

// Serve static files from frontend FIRST
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Serve specific HTML routes
app.get('/', (req, res) => {
    // Set correct content type for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/landing.html'));
});

app.get('/editor', (req, res) => {
    // Set correct content type for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/editor.html'));
});

app.get('/login', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/login.html'));
});

app.get('/user-login', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/login.html'));
});

app.get('/admin-login', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/admin.html'));
});

app.get('/research-tools', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/research-tools.html'));
});

app.get('/classic-editor', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/classic-text-editor.html'));
});

app.get('/classic-text-editor', (req, res) => {
    // Redirect to preferred URL
    res.redirect('/classic-editor');
});

// Fallback for any other routes that don't match - serve landing page
app.get('*', (req, res, next) => {
    // Skip if this is an API route
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Set correct content type for HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(path.join(__dirname, 'frontend/public/landing.html'));
});

// 404 handler for API routes
app.use('/api/*', notFound);

// Global error handler
app.use(errorHandler);

const PORT = config.PORT;

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 ════════════════════════════════════════');
    console.log(`🚀 השרת החדש פועל על פורט ${PORT}`);
    console.log(`🌐 פתח בדפדפן: http://localhost:${PORT}`);
    console.log(`🔧 סביבה: ${config.NODE_ENV}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 API Test: http://localhost:${PORT}/api/test`);
    console.log('🚀 ════════════════════════════════════════');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed. Process terminated.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🔄 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed. Process terminated.');
        process.exit(0);
    });
});

module.exports = app;