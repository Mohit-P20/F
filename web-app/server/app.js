'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

// TLS Configuration for development
const TLS_ENABLED = process.env.TLS_ENABLED === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'development' && !TLS_ENABLED) {
    console.log('⚠️  Development mode: Relaxed TLS verification enabled');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const network = require('./fabric/network-manager');
const auth = require('./middleware/auth');
const security = require('./middleware/security');

// Configuration from environment variables
const SERVER_PORT = process.env.SERVER_PORT || 3003;
const IDENTITY = process.env.FABRIC_IDENTITY || 'manager';
const CHANNEL = process.env.CHANNEL_NAME || 'mychannel';
const CONTRACT = process.env.CC_NAME || 'food-supply-chain';

const app = express();
const server = http.createServer(app);

// Socket.IO setup for real-time updates
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

// Security middleware
if (NODE_ENV === 'production') {
  app.use(security.securityHeaders);
  app.use(security.generalRateLimit);
}

app.use(security.requestLogger);
app.use(security.validateInput);
app.use(express.json({ limit: '10mb' }));
app.use(cors(security.corsOptions));

// Store socket connections for real-time updates
const connectedClients = new Set();

io.on('connection', (socket) => {
  console.log('Client connected for real-time updates:', socket.id);
  connectedClients.add(socket);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket);
  });
});

// Broadcast real-time updates to all connected clients
const broadcastUpdate = (eventType, data) => {
  io.emit('supplyChainUpdate', {
    type: eventType,
    data: data,
    timestamp: new Date().toISOString()
  });
};

// Enhanced health check endpoint
app.get('/', async (req, res) => {
    console.log('Health check - GET /');
    
    // Check network connectivity
    const networkHealth = await network.healthCheck();
    
    const healthData = {
        status: 'Supply Chain Pro API is running',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        network: networkHealth,
        connectedClients: connectedClients.size,
        config: {
            identity: IDENTITY,
            channel: CHANNEL,
            contract: CONTRACT,
            port: SERVER_PORT
        }
    };
    
    const statusCode = networkHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
});

// Dedicated health endpoint for load balancers
app.get('/health', async (req, res) => {
    const networkHealth = await network.healthCheck();
    res.status(networkHealth.status === 'healthy' ? 200 : 503).json(networkHealth);
});

// Authentication endpoints
app.post('/auth/login', security.authRateLimit, auth.login);

// Public endpoint - no authentication required
app.get('/getProduct', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.id) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const contract = req.contract;
        const productId = req.query.id.toString();
        
        if (NODE_ENV === 'development') {
            console.log(`Fetching product with ID: ${productId}`);
        }
        const result = await contract.evaluateTransaction('getProduct', productId);
        const response = JSON.parse(result.toString());
        
        if (NODE_ENV === 'development') {
            console.log('Product retrieved successfully');
        }
        res.json({ result: response });
    } catch (error) {
        console.error(`[API Error] /getProduct: ${error.message}`);
        
        if (error.message.includes('does not exist')) {
            res.status(404).json({ error: `Product ${req.query.id} not found` });
        } else {
            res.status(500).json(security.formatErrorResponse(error, req));
        }
    }
});

// Protected endpoints - require authentication and specific permissions
app.post('/createProduct', 
  auth.verifyToken, 
  auth.requirePermission('create'),
  NODE_ENV === 'production' ? security.strictRateLimit : (req, res, next) => next(),
  network.connectToNetwork, 
  async (req, res) => {
    try {
        const contract = req.contract;
        
        // Validate required fields
        const requiredFields = ['id', 'name', 'barcode', 'placeOfOrigin', 'productionDate', 'expirationDate', 'unitQuantity', 'unitQuantityType', 'unitPrice', 'category'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `${field} is required.` });
            }
        }

        // Additional validation
        if (req.body.unitQuantity <= 0) {
            return res.status(400).json({ error: 'Unit quantity must be positive' });
        }
        
        if (new Date(req.body.expirationDate) <= new Date(req.body.productionDate)) {
            return res.status(400).json({ error: 'Expiration date must be after production date' });
        }
        // Construct product data to match chaincode's Product model
        const productDataForChaincode = {
            id: req.body.id,
            name: req.body.name,
            barcode: req.body.barcode,
            placeOfOrigin: req.body.placeOfOrigin,
            productionDate: req.body.productionDate,
            expirationDate: req.body.expirationDate,
            unitQuantity: parseInt(req.body.unitQuantity),
            unitQuantityType: req.body.unitQuantityType,
            batchQuantity: req.body.batchQuantity ? parseInt(req.body.batchQuantity) : 0,
            unitPrice: req.body.unitPrice,
            category: req.body.category,
            variety: req.body.variety || '',
            misc: typeof req.body.misc === 'object' ? JSON.stringify(req.body.misc) : (req.body.misc || ''),
            componentProductIds: req.body.componentProductIds || [],
            locationData: {
                current: {
                    location: req.body.locationData?.current?.location || req.body.currentLocation || req.body.placeOfOrigin,
                    arrivalDate: req.body.locationData?.current?.arrivalDate || req.body.arrivalDate || new Date().toISOString()
                },
                previous: req.body.locationData?.previous || []
            }
        };

        const productJson = JSON.stringify(productDataForChaincode);
        
        if (NODE_ENV === 'development') {
            console.log(`Creating product: ${productDataForChaincode.name} (ID: ${productDataForChaincode.id}) by user: ${req.user.userId}`);
        }

        const result = await contract.submitTransaction('createProduct', productJson);
        
        if (NODE_ENV === 'development') {
            console.log('Product created successfully');
        }
        
        // Broadcast real-time update
        broadcastUpdate('productCreated', {
            productId: productDataForChaincode.id,
            name: productDataForChaincode.name,
            location: productDataForChaincode.locationData.current.location,
            createdBy: req.user.userId
        });
        
        res.json({ 
            result: 'Product created successfully',
            productId: productDataForChaincode.id,
            txId: result.toString()
        });
    } catch (error) {
        console.error(`[API Error] /createProduct: ${error.message}`);
        
        if (error.message.includes('already exists')) {
            res.status(409).json({ error: `Product ${req.body.id} already exists` });
        } else {
            res.status(500).json(security.formatErrorResponse(error, req));
        }
    }
});

app.get('/getProductWithHistory', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.id) {
           return res.status(400).json({ error: "Product ID is required." });
        }

        const contract = req.contract;
        const productId = req.query.id.toString();
        
        if (NODE_ENV === 'development') {
            console.log(`Fetching product history for ID: ${productId}`);
        }
        const result = await contract.evaluateTransaction('getProductWithHistory', productId);
        const response = JSON.parse(result.toString());
        
        if (NODE_ENV === 'development') {
            console.log('Product history retrieved successfully');
        }
        res.json({ result: response });
    } catch (error) {
        console.error(`[API Error] /getProductWithHistory: ${error.message}`);
        
        if (error.message.includes('does not exist')) {
            res.status(404).json({ error: `Product ${req.query.id} not found` });
        } else {
            res.status(500).json(security.formatErrorResponse(error, req));
        }
    }
});

app.get('/productExists', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.id) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const contract = req.contract;
        const productId = req.query.id.toString();
        
        if (NODE_ENV === 'development') {
            console.log(`Checking existence of product: ${productId}`);
        }

        const result = await contract.evaluateTransaction('productExists', productId);
        const exists = result.toString() === 'true';
        
        if (NODE_ENV === 'development') {
            console.log(`Product ${productId} exists: ${exists}`);
        }
        res.json({ exists: exists });
    } catch (error) {
        console.error(`[API Error] /productExists: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

app.post('/shipProduct', 
  auth.verifyToken, 
  auth.requirePermission('ship'),
  network.connectToNetwork, 
  async (req, res) => {
    try {
        const contract = req.contract;
        const { productId, newLocation, arrivalDate } = req.body;

        if (!productId || !newLocation) {
            return res.status(400).json({ 
                error: "Product ID and new location are required." 
            });
        }

        // Validate location is not empty and reasonable length
        if (newLocation.trim().length === 0 || newLocation.length > 200) {
            return res.status(400).json({ 
                error: "Invalid location format" 
            });
        }
        const shipmentDate = arrivalDate || new Date().toISOString();
        
        if (NODE_ENV === 'development') {
            console.log(`Shipping product ${productId} to ${newLocation} by user: ${req.user.userId}`);
        }
        const result = await contract.submitTransaction('shipProductTo', 
            productId, 
            newLocation,
            shipmentDate
        );
        
        if (NODE_ENV === 'development') {
            console.log('Product shipped successfully');
        }
        
        // Broadcast real-time update
        broadcastUpdate('productShipped', {
            productId: productId,
            newLocation: newLocation,
            arrivalDate: shipmentDate,
            shippedBy: req.user.userId
        });
        
        res.json({ 
            status: 'Product shipped successfully', 
            txId: result.toString(),
            productId: productId,
            newLocation: newLocation,
            arrivalDate: shipmentDate
        });
    } catch (error) {
        console.error(`[API Error] /shipProduct: ${error.message}`);
        
        if (error.message.includes('does not exist')) {
            res.status(404).json({ error: `Product ${req.body.productId} not found` });
        } else {
            res.status(500).json(security.formatErrorResponse(error, req));
        }
    }
});

// Analytics endpoint
app.get('/getAnalytics', network.connectToNetwork, async (req, res) => {
    try {
        const contract = req.contract;
        
        if (NODE_ENV === 'development') {
            console.log('Fetching analytics data from blockchain');
        }
        
        const result = await contract.evaluateTransaction('getAnalyticsData');
        const analyticsData = JSON.parse(result.toString());
        
        if (NODE_ENV === 'development') {
            console.log('Analytics data retrieved successfully');
        }
        res.json({ result: analyticsData });
    } catch (error) {
        console.error(`[API Error] /getAnalytics: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

// Quality assurance endpoints
app.post('/addQualityRecord', 
  auth.verifyToken, 
  auth.requirePermission('quality'),
  network.connectToNetwork, 
  async (req, res) => {
    try {
        const contract = req.contract;
        const { productId, inspector, score, notes, location, testResults, certificationType, inspectionStandard, batchId } = req.body;

        if (!productId || !inspector || score === undefined || !notes) {
            return res.status(400).json({ 
                error: "Product ID, inspector, score, and notes are required." 
            });
        }

        // Validate score range
        const scoreValue = parseInt(score);
        if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
            return res.status(400).json({ 
                error: "Score must be a number between 0 and 100." 
            });
        }
        const qualityRecord = {
            productId,
            inspector,
            score: scoreValue,
            notes,
            timestamp: new Date().toISOString(),
            location: location || '',
            testResults: testResults || '',
            certificationType: certificationType || '',
            inspectionStandard: inspectionStandard || '',
            batchId: batchId || ''
        };

        if (NODE_ENV === 'development') {
            console.log(`Adding quality record for product ${productId} by inspector: ${inspector}`);
        }
        const result = await contract.submitTransaction('addQualityRecord', productId, JSON.stringify(qualityRecord));
        
        // Broadcast real-time update
        broadcastUpdate('qualityRecordAdded', {
            productId: productId,
            score: score,
            inspector: inspector,
            location: location
        });
        
        res.json({ 
            status: 'Quality record added successfully',
            txId: result.toString()
        });
    } catch (error) {
        console.error(`[API Error] /addQualityRecord: ${error.message}`);
        
        if (error.message.includes('does not exist')) {
            res.status(404).json({ error: `Product ${productId} not found` });
        } else {
            res.status(500).json(security.formatErrorResponse(error, req));
        }
    }
});

app.get('/getQualityRecords', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.productId) {
            return res.status(400).json({ error: "Product ID is required." });
        }

        const contract = req.contract;
        const productId = req.query.productId.toString();
        
        if (NODE_ENV === 'development') {
            console.log(`Fetching quality records for product: ${productId}`);
        }
        const result = await contract.evaluateTransaction('getQualityRecords', productId);
        const qualityRecords = JSON.parse(result.toString());
        
        res.json({ result: qualityRecords });
    } catch (error) {
        console.error(`[API Error] /getQualityRecords: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

// Notifications endpoint
app.get('/getNotifications', network.connectToNetwork, async (req, res) => {
    try {
        const contract = req.contract;
        const limit = req.query.limit || '50';
        
        if (NODE_ENV === 'development') {
            console.log('Fetching notifications from blockchain');
        }
        const result = await contract.evaluateTransaction('getNotifications', limit);
        const notifications = JSON.parse(result.toString());
        
        res.json({ result: notifications });
    } catch (error) {
        console.error(`[API Error] /getNotifications: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

app.post('/acknowledgeNotification', 
  auth.verifyToken,
  network.connectToNetwork, 
  async (req, res) => {
    try {
        const contract = req.contract;
        const { notificationId } = req.body;

        if (!notificationId) {
            return res.status(400).json({ error: "Notification ID is required." });
        }

        await contract.submitTransaction('acknowledgeNotification', notificationId);
        res.json({ status: 'Notification acknowledged successfully' });
    } catch (error) {
        console.error(`[API Error] /acknowledgeNotification: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

// Advanced query endpoints
app.get('/queryProductsByCategory', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.category) {
            return res.status(400).json({ error: "Category is required." });
        }

        const contract = req.contract;
        const category = req.query.category.toString();
        
        const result = await contract.evaluateTransaction('queryProductsByCategory', category);
        const products = JSON.parse(result.toString());
        
        res.json({ result: products });
    } catch (error) {
        console.error(`[API Error] /queryProductsByCategory: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

app.get('/queryProductsByLocation', network.connectToNetwork, async (req, res) => {
    try {
        if (!req.query.location) {
            return res.status(400).json({ error: "Location is required." });
        }

        const contract = req.contract;
        const location = req.query.location.toString();
        
        const result = await contract.evaluateTransaction('queryProductsByLocation', location);
        const products = JSON.parse(result.toString());
        
        res.json({ result: products });
    } catch (error) {
        console.error(`[API Error] /queryProductsByLocation: ${error.message}`);
        res.status(500).json(security.formatErrorResponse(error, req));
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error.message);
    res.status(500).json(security.formatErrorResponse(error, req));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    network.cleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    network.cleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
// Start server
server.listen(SERVER_PORT, () => {
    console.log('=================================');
    console.log('Supply Chain Pro API Server');
    console.log('=================================');
    console.log(`Server running on port ${SERVER_PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`TLS Enabled: ${TLS_ENABLED}`);
    console.log(`Identity: ${IDENTITY}`);
    console.log(`Channel: ${CHANNEL}`);
    console.log(`Contract: ${CONTRACT}`);
    console.log(`Real-time updates: Enabled`);
    console.log(`Connected clients: ${connectedClients.size}`);
    if (NODE_ENV === 'development' && !TLS_ENABLED) {
        console.log('🔧 Development mode: TLS verification relaxed');
    }
    console.log('=================================');
});