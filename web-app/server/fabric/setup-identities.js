/*
 * Complete Identity Setup Script - Rewritten for Reliability
 * This script handles both admin enrollment and user registration
 * Optimized for development environments with proper error handling
 */

'use strict';

const IdentityManager = require('./identity-manager');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

async function main() {
    console.log('=== Supply Chain Pro Identity Setup ===');
    console.log('🔧 Optimized for Development Environment');
    
    try {
        const identityManager = new IdentityManager();
        await identityManager.initialize();
        
        // Test CA connection first
        console.log('\n--- Pre-flight Check: CA Connection ---');
        const caConnected = await identityManager.testCAConnection();
        if (!caConnected) {
            console.error('❌ Cannot connect to CA server');
            console.log('\n🔧 TROUBLESHOOTING STEPS:');
            console.log('1. Check if Fabric network is running:');
            console.log('   docker ps | grep hyperledger');
            console.log('2. Check CA container specifically:');
            console.log('   docker ps | grep ca_org1');
            console.log('   docker logs ca_org1');
            console.log('3. Restart the network if needed:');
            console.log('   cd network/fabric-network');
            console.log('   ./network.sh down');
            console.log('   ./network.sh up createChannel -ca');
            console.log('4. Wait 30 seconds after network start before running this script');
            process.exit(1);
        }
        
        // Step 1: Enroll Admin
        console.log('\n--- Step 1: Admin Enrollment ---');
        const adminResult = await identityManager.enrollAdmin();
        
        if (!adminResult.success) {
            console.error('❌ Admin enrollment failed:', adminResult.error);
            console.log('\n🔧 SPECIFIC TROUBLESHOOTING:');
            
            if (adminResult.error.includes('CA server is not responding')) {
                console.log('CA Server Issue:');
                console.log('1. Check CA container: docker logs ca_org1');
                console.log('2. Restart network: ./network/fabric-network/network.sh restart');
                console.log('3. Wait 30 seconds and retry');
            } else if (adminResult.error.includes('Invalid admin credentials')) {
                console.log('Credentials Issue:');
                console.log('1. Check .env file has correct FABRIC_CA_ADMIN_PASSWORD');
                console.log('2. Default should be "adminpw"');
                console.log('3. Restart CA if password was changed');
            } else {
                console.log('General Issue:');
                console.log('1. Ensure TLS_ENABLED=false in .env');
                console.log('2. Restart network completely');
                console.log('3. Check Docker containers are healthy');
            }
            
            process.exit(1);
        }
        
        console.log('✅ Admin enrollment completed successfully');
        
        // Step 2: Register Users
        console.log('\n--- Step 2: User Registration ---');
        const userResults = await identityManager.registerUsers();
        
        // Check if any critical failures occurred
        const criticalFailures = userResults.failed.filter(f => 
            !f.error.includes('already registered') && 
            !f.error.includes('already exists')
        );
        
        if (criticalFailures.length > 0) {
            console.warn('⚠️  Some users failed to register with critical errors:');
            criticalFailures.forEach(f => console.log(`   ${f.id}: ${f.error}`));
        }
        
        // Step 3: Verify Setup
        console.log('\n--- Step 3: Final Verification ---');
        await identityManager.listIdentities();
        
        // Verify each identity
        const identities = ['admin', 'manager', 'employee', 'appUser'];
        let allVerified = true;
        
        for (const id of identities) {
            const verified = await identityManager.verifyIdentity(id);
            if (!verified) {
                allVerified = false;
            }
        }
        
        console.log('\n=== Identity Setup Complete ===');
        if (allVerified) {
            console.log('🎉 All identities successfully created and verified');
            console.log('\n🚀 Next Steps:');
            console.log('1. Start the backend server:');
            console.log('   cd web-app/server && npm run start:server');
            console.log('2. Start the frontend client:');
            console.log('   cd web-app/client && npm run start:client');
            console.log('3. Open http://localhost:3000 in your browser');
            console.log('4. Login with: admin / admin123');
        } else {
            console.log('⚠️  Some identities failed verification. Check the logs above.');
            console.log('You may still be able to use the application with available identities.');
        }
        
    } catch (error) {
        console.error(`❌ FATAL ERROR: ${error.message}`);
        
        // Enhanced error reporting
        console.log('\n📋 SYSTEM INFORMATION:');
        console.log(`Node.js version: ${process.version}`);
        console.log(`Platform: ${process.platform}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`TLS Enabled: ${process.env.TLS_ENABLED}`);
        console.log(`Working directory: ${process.cwd()}`);
        
        console.log('\n🔍 DEBUGGING STEPS:');
        console.log('1. Verify Fabric network is running:');
        console.log('   docker ps | grep hyperledger');
        console.log('2. Check CA logs for errors:');
        console.log('   docker logs ca_org1');
        console.log('3. Verify connection profile exists:');
        console.log('   ls -la network/fabric-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
        console.log('4. Check .env configuration:');
        console.log('   cat .env | grep TLS');
        console.log('5. Try manual CA test:');
        console.log('   curl -k https://localhost:7054/cainfo');
        
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⚠️  Process interrupted. Cleaning up...');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Process terminated. Cleaning up...');
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };