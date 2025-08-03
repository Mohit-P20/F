'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

// Load configuration from environment variables
const IDENTITY = process.env.FABRIC_IDENTITY || 'manager';
const CHANNEL = process.env.CHANNEL_NAME || 'mychannel';
const CONTRACT = process.env.CC_NAME || 'food-supply-chain';
const TLS_ENABLED = process.env.TLS_ENABLED === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

class NetworkManager {
    constructor() {
        this.connectionPool = new Map();
        this.maxConnections = 10;
        this.circuitBreaker = new CircuitBreaker();
        
        // Configure TLS for development
        if (NODE_ENV === 'development' && !TLS_ENABLED) {
            console.log('⚠️  Development mode: Relaxed TLS verification enabled');
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
    }

    async connectToNetwork() {
        const connectionKey = `${IDENTITY}_${CHANNEL}_${CONTRACT}`;
        
        // Try to reuse existing connection from pool
        if (this.connectionPool.has(connectionKey)) {
            const pooledConnection = this.connectionPool.get(connectionKey);
            if (pooledConnection && pooledConnection.contract) {
                return pooledConnection;
            } else {
                this.connectionPool.delete(connectionKey);
            }
        }

        // Create new connection with circuit breaker
        const connection = await this.circuitBreaker.execute(async () => {
            return await this.createNewConnection();
        });

        // Store in connection pool
        if (this.connectionPool.size < this.maxConnections) {
            this.connectionPool.set(connectionKey, connection);
        }

        return connection;
    }

    async createNewConnection() {
        // Load the network configuration
        const ccpPath = process.env.FABRIC_CONNECTION_PROFILE_PATH || 
          path.resolve(__dirname, '..', '..', '..', 'network', 'fabric-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at ${ccpPath}. Please ensure the Fabric network is running.`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create wallet
        const walletPath = path.join(__dirname, '..', 'wallet');
        if (!fs.existsSync(walletPath)) {
            throw new Error(`Wallet directory not found at ${walletPath}. Please run identity setup first.`);
        }
        
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the identity exists in the wallet
        const identity = await wallet.get(IDENTITY);
        if (!identity) {
            const availableIdentities = await wallet.list();
            throw new Error(`Identity "${IDENTITY}" not found in wallet. Available: ${availableIdentities.map(id => id.label).join(', ')}`);
        }

        // Create gateway connection
        const gateway = new Gateway();
        
        const connectionOptions = { 
            wallet, 
            identity: IDENTITY, 
            discovery: { 
                enabled: true, 
                asLocalhost: NODE_ENV === 'development'
            },
            eventHandlerOptions: {
                commitTimeout: 100,
                strategy: null
            }
        };

        // Add TLS configuration for production
        if (TLS_ENABLED) {
            const certPath = process.env.CERT_PATH;
            const keyPath = process.env.KEY_PATH;
            const caPath = process.env.CA_PATH;
            
            if (certPath && keyPath && caPath && 
                fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.existsSync(caPath)) {
                connectionOptions.tlsInfo = {
                    certificate: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath),
                    ca: fs.readFileSync(caPath)
                };
                console.log('🔒 Production TLS configuration loaded');
            }
        }

        try {
            await gateway.connect(ccp, connectionOptions);
            
            // Get the network and contract
            const network = await gateway.getNetwork(CHANNEL);
            const contract = network.getContract(CONTRACT);
            
            // Test the connection
            if (NODE_ENV === 'development') {
                try {
                    await contract.evaluateTransaction('productExists', 'test-connection');
                    console.log('✅ Network connection test successful');
                } catch (testError) {
                    if (!testError.message.includes('does not exist')) {
                        console.warn('⚠️  Network connection test warning:', testError.message);
                    }
                }
            }

            return { contract, gateway };
            
        } catch (connectionError) {
            if (connectionError.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
                throw new Error('TLS certificate verification failed. For development, set TLS_ENABLED=false in .env file.');
            } else if (connectionError.message.includes('ECONNREFUSED')) {
                throw new Error('Cannot connect to Fabric network. Please ensure the network is running.');
            } else {
                throw connectionError;
            }
        }
    }

    async cleanup() {
        console.log('🧹 Cleaning up network connections...');
        let cleanupCount = 0;
        
        for (const [key, connection] of this.connectionPool.entries()) {
            try {
                if (connection.gateway) {
                    await connection.gateway.disconnect();
                    cleanupCount++;
                }
            } catch (error) {
                console.error(`❌ Error disconnecting gateway ${key}:`, error.message);
            }
        }
        
        this.connectionPool.clear();
        console.log(`✅ Cleaned up ${cleanupCount} network connections`);
    }

    async healthCheck() {
        try {
            const startTime = Date.now();
            const connection = await this.createNewConnection();
            
            // Test contract interaction
            try {
                await connection.contract.evaluateTransaction('productExists', 'health-check');
            } catch (error) {
                if (!error.message.includes('does not exist')) {
                    throw error;
                }
            }
            
            await connection.gateway.disconnect();
            const responseTime = Date.now() - startTime;
            
            return { 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                responseTime: `${responseTime}ms`,
                network: {
                    identity: IDENTITY,
                    channel: CHANNEL,
                    contract: CONTRACT,
                    tlsEnabled: TLS_ENABLED
                }
            };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message, 
                timestamp: new Date().toISOString(),
                network: {
                    identity: IDENTITY,
                    channel: CHANNEL,
                    contract: CONTRACT,
                    tlsEnabled: TLS_ENABLED
                }
            };
        }
    }

    getConnectionPoolStatus() {
        return {
            activeConnections: this.connectionPool.size,
            maxConnections: this.maxConnections,
            circuitBreakerState: this.circuitBreaker.state,
            failureCount: this.circuitBreaker.failureCount
        };
    }
}

// Circuit breaker pattern for resilient connections
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }

    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - network temporarily unavailable');
            }
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            console.warn(`🔴 Circuit breaker opened after ${this.failureCount} failures`);
        }
    }
}

// Create singleton instance
const networkManager = new NetworkManager();

// Export middleware function for Express
const connectToNetwork = async (req, res, next) => {
    try {
        const connection = await networkManager.connectToNetwork();
        req.contract = connection.contract;
        req.gateway = connection.gateway;
        next();
    } catch (error) {
        console.error('❌ Network connection error:', error.message);
        
        let errorMessage = 'Failed to connect to blockchain network';
        let statusCode = 500;
        
        if (error.message.includes('Circuit breaker')) {
            errorMessage = 'Blockchain network temporarily unavailable. Please try again later.';
            statusCode = 503;
        } else if (error.message.includes('Connection profile not found')) {
            errorMessage = 'Network configuration not found. Please ensure the Fabric network is running.';
            statusCode = 503;
        } else if (error.message.includes('Identity') && error.message.includes('not found')) {
            errorMessage = 'User identity not found. Please ensure user registration is completed.';
            statusCode = 401;
        } else if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
            errorMessage = 'TLS certificate verification failed. Please check network configuration.';
            statusCode = 503;
        } else if (error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Cannot connect to blockchain network. Please ensure the network is running.';
            statusCode = 503;
        }
        
        const errorResponse = {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        };

        if (NODE_ENV === 'development') {
            errorResponse.details = error.message;
            errorResponse.troubleshooting = {
                steps: [
                    'Check if Fabric network is running: docker ps | grep hyperledger',
                    'Verify CA container is healthy: docker logs ca_org1',
                    'Check if identities are enrolled: ls -la web-app/server/wallet/',
                    'Restart network if needed: ./network/fabric-network/network.sh restart'
                ]
            };
        }
        
        res.status(statusCode).json(errorResponse);
    }
};

module.exports = {
    connectToNetwork,
    healthCheck: () => networkManager.healthCheck(),
    cleanup: () => networkManager.cleanup(),
    getConnectionPoolStatus: () => networkManager.getConnectionPoolStatus()
};