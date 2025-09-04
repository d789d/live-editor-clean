const express = require('express');
const mongoose = require('mongoose');
const { createHealthCheck } = require('../../database/test-connection');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
    res.json({ 
        success: true,
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'השרת פועל תקין',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
    let dbStatus = 'unknown';
    let dbDetails = {};
    
    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState === 1) {
            dbStatus = 'connected';
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            dbDetails = {
                collections: collections.length,
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                name: mongoose.connection.name
            };
        } else {
            dbStatus = 'disconnected';
            dbDetails = {
                readyState: mongoose.connection.readyState,
                error: 'Database connection not established'
            };
        }
    } catch (error) {
        dbStatus = 'error';
        dbDetails = { error: error.message };
    }

    const healthcheck = {
        success: dbStatus === 'connected',
        status: dbStatus === 'connected' ? 'ok' : 'warning',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        message: dbStatus === 'connected' ? 'השרת ומסד הנתונים פועלים תקין' : 'השרת פועל, בעיה במסד נתונים',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
            free: Math.round((process.memoryUsage().heapTotal - process.memoryUsage().heapUsed) / 1024 / 1024) + ' MB'
        },
        database: {
            status: dbStatus,
            lastCheck: new Date().toISOString(),
            ...dbDetails
        }
    };

    res.json(healthcheck);
});

// Database-specific health check
router.get('/database', createHealthCheck());

module.exports = router;