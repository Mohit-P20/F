/*
 * Enhanced Identity Manager for Hyperledger Fabric
 * Handles admin enrollment and user registration with robust error handling
 * Optimized for development environments with proper TLS handling
 */

'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

class IdentityManager {
    constructor() {
        this.TLS_ENABLED = process.env.TLS_ENABLED === 'true';
        this.NODE_ENV = process.env.NODE_ENV || 'development';
        this.walletPath = path.join(__dirname, '..', 'wallet');
        this.connectionProfilePath = path.resolve(__dirname, '..', '..', '..', 'network', 'fabric-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        
        // Force development mode settings
        if (this.NODE_ENV === 'development') {
            console.log('🔧 Development mode: Forcing relaxed TLS settings');
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            this.TLS_ENABLED = false; // Override for development
        }
    }

    async initialize() {
        console.log('=== Initializing Identity Manager ===');
        console.log(`Environment: ${this.NODE_ENV}`);
        console.log(`TLS Enabled: ${this.TLS_ENABLED}`);
        
        // Ensure wallet directory exists
        if (!fs.existsSync(this.walletPath)) {
            fs.mkdirSync(this.walletPath, { recursive: true });
            console.log(`📁 Created wallet directory: ${this.walletPath}`);
        }
        
        this.wallet = await Wallets.newFileSystemWallet(this.walletPath);
        console.log(`📁 Wallet initialized at: ${this.walletPath}`);
        
        // Load and validate connection profile
        await this.loadConnectionProfile();
        
        // Initialize CA client with proper configuration
        await this.initializeCAClient();
    }

    async loadConnectionProfile() {
        console.log(`🔗 Loading connection profile from: ${this.connectionProfilePath}`);
        
        if (!fs.existsSync(this.connectionProfilePath)) {
            throw new Error(`Connection profile not found at ${this.connectionProfilePath}. Please ensure the Fabric network is running.`);
        }
        
        this.ccp = JSON.parse(fs.readFileSync(this.connectionProfilePath, 'utf8'));
        console.log('✅ Connection profile loaded successfully');
    }

    async initializeCAClient() {
        const caInfo = this.ccp.certificateAuthorities['ca.org1.example.com'];
        if (!caInfo) {
            throw new Error('CA information not found in connection profile');
        }

        console.log('CA Configuration:', {
            url: caInfo.url,
            caName: caInfo.caName,
            originalTlsEnabled: caInfo.url.startsWith('https')
        });

        // For development, always use HTTP and disable TLS verification
        let caUrl = caInfo.url;
        if (this.NODE_ENV === 'development') {
            // Force HTTP for development
            caUrl = caUrl.replace('https://', 'http://').replace(':7054', ':7054');
            console.log(`🔧 Development mode: Modified CA URL to ${caUrl}`);
        }

        // Load TLS certificate if available
        let caTLSCACerts = await this.loadCATLSCertificate();

        // Configure CA client for development
        let caClientOptions = {
            httpOptions: {
                timeout: 30000,
                rejectUnauthorized: false, // Always false for development
                requestCert: false,
                agent: false
            }
        };

        // Only add TLS certs if we have them and TLS is enabled
        if (this.TLS_ENABLED && caTLSCACerts) {
            caClientOptions.trustedRoots = [caTLSCACerts];
            console.log('🔒 Production TLS configuration applied');
        } else {
            caClientOptions.trustedRoots = [];
            console.log('🔧 Development configuration: TLS verification disabled');
        }

        try {
            this.ca = new FabricCAServices(
                caUrl,
                caClientOptions,
                caInfo.caName
            );
            console.log('✅ CA client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize CA client:', error.message);
            throw error;
        }
    }

    async loadCATLSCertificate() {
        const possibleTlsPaths = [
            path.resolve(__dirname, '..', '..', '..', 'network', 'fabric-network', 'organizations', 'fabric-ca', 'org1', 'tls-cert.pem'),
            path.resolve(__dirname, '..', '..', '..', 'network', 'fabric-network', 'organizations', 'fabric-ca', 'org1', 'ca-cert.pem'),
            path.resolve(__dirname, '..', '..', '..', 'network', 'fabric-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'ca', 'ca.org1.example.com-cert.pem')
        ];

        for (const certPath of possibleTlsPaths) {
            if (fs.existsSync(certPath)) {
                try {
                    const cert = fs.readFileSync(certPath, 'utf8');
                    console.log(`✅ Successfully loaded CA TLS certificate from: ${certPath}`);
                    return cert;
                } catch (error) {
                    console.warn(`⚠️  Could not read certificate from ${certPath}: ${error.message}`);
                }
            }
        }

        // Fallback to connection profile TLS certs
        const caInfo = this.ccp.certificateAuthorities['ca.org1.example.com'];
        if (caInfo.tlsCACerts) {
            if (Array.isArray(caInfo.tlsCACerts.pem)) {
                console.log('✅ Using TLS certificate from connection profile (array)');
                return caInfo.tlsCACerts.pem[0];
            } else if (typeof caInfo.tlsCACerts.pem === 'string') {
                console.log('✅ Using TLS certificate from connection profile (string)');
                return caInfo.tlsCACerts.pem;
            }
        }

        console.log('ℹ️  No TLS certificate found - proceeding without (development mode)');
        return null;
    }

    async waitForCA() {
        console.log('⏳ Waiting for CA to be ready...');
        const maxAttempts = 30;
        const delay = 2000; // 2 seconds
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Try to get CA info to test connectivity
                await this.ca.getCaInfo();
                console.log(`✅ CA is ready (attempt ${attempt}/${maxAttempts})`);
                return true;
            } catch (error) {
                if (attempt === maxAttempts) {
                    console.error(`❌ CA not ready after ${maxAttempts} attempts: ${error.message}`);
                    return false;
                }
                console.log(`⏳ CA not ready yet (attempt ${attempt}/${maxAttempts}), waiting...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return false;
    }

    async enrollAdmin() {
        console.log('=== Starting Admin Enrollment ===');
        
        // Check if admin already exists
        const identity = await this.wallet.get('admin');
        if (identity) {
            console.log('✅ Admin identity already exists in wallet');
            return { success: true, message: 'Admin already enrolled' };
        }

        // Wait for CA to be ready
        const caReady = await this.waitForCA();
        if (!caReady) {
            return { 
                success: false, 
                error: 'CA server is not responding. Please check if the Fabric network is running properly.' 
            };
        }

        try {
            const adminSecret = process.env.FABRIC_CA_ADMIN_PASSWORD || 'adminpw';
            console.log('🔐 Enrolling admin with CA...');
            
            const enrollment = await this.ca.enroll({ 
                enrollmentID: 'admin', 
                enrollmentSecret: adminSecret 
            });
            
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            
            await this.wallet.put('admin', x509Identity);
            console.log('✅ Successfully enrolled admin user and imported into wallet');
            
            // Verify the identity was stored correctly
            const storedIdentity = await this.wallet.get('admin');
            if (!storedIdentity) {
                throw new Error('Failed to verify stored admin identity');
            }
            
            console.log('✅ Admin identity verification successful');
            return { success: true, message: 'Admin enrolled successfully' };
            
        } catch (error) {
            console.error('❌ Admin enrollment failed:', error.message);
            
            // Provide specific error handling
            if (error.message.includes('ECONNREFUSED')) {
                return { 
                    success: false, 
                    error: 'Cannot connect to CA server. Please ensure the Fabric network is running.' 
                };
            } else if (error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
                return { 
                    success: false, 
                    error: 'TLS certificate verification failed. This should not happen in development mode.' 
                };
            } else if (error.message.includes('Enrollment request failed')) {
                return { 
                    success: false, 
                    error: 'Invalid admin credentials. Check FABRIC_CA_ADMIN_PASSWORD in .env file.' 
                };
            }
            
            return { success: false, error: error.message };
        }
    }

    async registerUsers() {
        console.log('=== Starting User Registration ===');
        
        // Verify admin exists
        const adminIdentity = await this.wallet.get('admin');
        if (!adminIdentity) {
            throw new Error('Admin identity not found. Please enroll admin first.');
        }

        // Get admin user context
        const provider = this.wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');
        
        if (!adminUser) {
            throw new Error('Failed to get admin user context');
        }
        
        console.log("✅ Admin user context obtained successfully");

        // Define users to register with simpler configuration
        const users = [
            { id: 'manager', role: 'client', affiliation: 'org1.department1', password: 'manager123' },
            { id: 'employee', role: 'client', affiliation: 'org1.department1', password: 'employee123' },
            { id: 'appUser', role: 'client', affiliation: 'org1.department1', password: 'appUser123' }
        ];

        const results = {
            success: [],
            skipped: [],
            failed: []
        };

        for (const user of users) {
            try {
                const result = await this.registerAndEnrollUser(adminUser, user);
                if (result.success) {
                    if (result.skipped) {
                        results.skipped.push(user.id);
                    } else {
                        results.success.push(user.id);
                    }
                } else {
                    results.failed.push({ id: user.id, error: result.error });
                }
            } catch (error) {
                console.error(`❌ Failed to process user ${user.id}:`, error.message);
                results.failed.push({ id: user.id, error: error.message });
            }
        }

        console.log('\n=== User Registration Summary ===');
        console.log(`✅ Successfully registered: ${results.success.length} users`);
        console.log(`⏭️  Skipped (already exist): ${results.skipped.length} users`);
        console.log(`❌ Failed: ${results.failed.length} users`);
        
        if (results.success.length > 0) {
            console.log('Successful registrations:', results.success.join(', '));
        }
        if (results.skipped.length > 0) {
            console.log('Skipped registrations:', results.skipped.join(', '));
        }
        if (results.failed.length > 0) {
            console.log('Failed registrations:', results.failed.map(f => `${f.id}: ${f.error}`).join(', '));
        }

        return results;
    }

    async registerAndEnrollUser(adminUser, userConfig) {
        const { id, role, affiliation, password } = userConfig;
        
        // Check if user already exists
        const existingIdentity = await this.wallet.get(id);
        if (existingIdentity) {
            console.log(`✅ Identity "${id}" already exists in wallet - skipping`);
            return { success: true, skipped: true };
        }

        try {
            // Register the user with simplified attributes
            console.log(`📝 Registering user: ${id}`);
            
            let secret;
            try {
                secret = await this.ca.register({
                    affiliation: affiliation,
                    enrollmentID: id,
                    enrollmentSecret: password,
                    role: role,
                    attrs: []  // Simplified - no custom attributes
                }, adminUser);
                console.log(`✅ User ${id} registered successfully`);
            } catch (registerError) {
                if (registerError.message.includes('already registered') || 
                    registerError.message.includes('is already registered')) {
                    console.log(`⚠️  User ${id} already registered, proceeding with enrollment`);
                    secret = password; // Use the predefined password
                } else {
                    throw registerError;
                }
            }

            // Enroll the user
            console.log(`🔐 Enrolling user: ${id}`);
            const enrollment = await this.ca.enroll({
                enrollmentID: id,
                enrollmentSecret: secret
            });

            // Create and store the identity
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };

            await this.wallet.put(id, x509Identity);
            console.log(`✅ Successfully enrolled user "${id}" and imported into wallet`);
            
            return { success: true, skipped: false };

        } catch (error) {
            console.error(`❌ Failed to register/enroll user ${id}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    async listIdentities() {
        const identities = await this.wallet.list();
        console.log('📋 Wallet contents:', identities.map(id => id.label));
        return identities;
    }

    async verifyIdentity(identityId) {
        const identity = await this.wallet.get(identityId);
        if (identity) {
            console.log(`✅ Identity "${identityId}" verified in wallet`);
            return true;
        } else {
            console.log(`❌ Identity "${identityId}" not found in wallet`);
            return false;
        }
    }

    async testCAConnection() {
        try {
            console.log('🔍 Testing CA connection...');
            const caInfo = await this.ca.getCaInfo();
            console.log('✅ CA connection test successful');
            console.log('CA Info:', {
                caName: caInfo.caName,
                version: caInfo.version
            });
            return true;
        } catch (error) {
            console.error('❌ CA connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = IdentityManager;