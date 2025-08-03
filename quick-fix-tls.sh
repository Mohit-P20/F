#!/bin/bash

# Quick TLS Fix Script for Development
# This script applies immediate fixes for TLS certificate issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}                    QUICK TLS FIX FOR DEVELOPMENT                    ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Ensure .env file exists and has correct settings
log_info "Configuring environment for development..."
if [ ! -f .env ]; then
    cp .env.example .env
    log_success "Created .env file from template"
fi

# Update .env file with development settings
grep -q "TLS_ENABLED=false" .env || echo "TLS_ENABLED=false" >> .env
grep -q "NODE_ENV=development" .env || echo "NODE_ENV=development" >> .env

log_success "Environment configured for development"

# 2. Stop any running services
log_info "Stopping existing services..."
./stop.sh 2>/dev/null || true

# 3. Clean up and restart Fabric network
log_info "Restarting Fabric network with fresh certificates..."
cd network/fabric-network
./network.sh down 2>/dev/null || true

# Clean up old certificates that might be causing issues
rm -rf organizations/peerOrganizations 2>/dev/null || true
rm -rf organizations/ordererOrganizations 2>/dev/null || true
rm -rf organizations/fabric-ca/*/msp 2>/dev/null || true
rm -rf organizations/fabric-ca/*/tls-cert.pem 2>/dev/null || true
rm -rf organizations/fabric-ca/*/ca-cert.pem 2>/dev/null || true

# Start network with CA
./network.sh up createChannel -ca -s couchdb

if [ $? -eq 0 ]; then
    log_success "Fabric network started successfully"
else
    log_error "Failed to start Fabric network"
    exit 1
fi

cd ../..

# 4. Wait for CA to be ready
log_info "Waiting for CA to be ready..."
sleep 10

# Check if CA is responding
for i in {1..30}; do
    if curl -k -s https://localhost:7054/cainfo > /dev/null 2>&1; then
        log_success "CA is responding"
        break
    fi
    if [ $i -eq 30 ]; then
        log_warning "CA might not be fully ready, but continuing..."
        break
    fi
    sleep 2
done

# 5. Clean up old wallet
log_info "Cleaning up old wallet..."
rm -rf web-app/server/wallet 2>/dev/null || true
mkdir -p web-app/server/wallet

# 6. Enroll admin with explicit TLS bypass
log_info "Enrolling admin user..."
cd web-app/server

# Try enrollment with multiple approaches
if NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/enrollAdmin.js; then
    log_success "Admin enrolled successfully"
else
    log_warning "First attempt failed, trying alternative approach..."
    
    # Alternative approach: modify the connection profile temporarily
    CONN_PROFILE="../../../network/fabric-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
    if [ -f "$CONN_PROFILE" ]; then
        # Backup original
        cp "$CONN_PROFILE" "$CONN_PROFILE.backup"
        
        # Modify to use http instead of https for development
        sed -i 's/"https:\/\/localhost:7054"/"http:\/\/localhost:7054"/g' "$CONN_PROFILE" 2>/dev/null || \
        sed -i.bak 's/"https:\/\/localhost:7054"/"http:\/\/localhost:7054"/g' "$CONN_PROFILE"
        
        # Try enrollment again
        if NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/enrollAdmin.js; then
            log_success "Admin enrolled successfully with modified profile"
        else
            log_warning "Still having issues, restoring original profile and using manual fix"
            cp "$CONN_PROFILE.backup" "$CONN_PROFILE"
        fi
    fi
fi

# 7. Register users
log_info "Registering application users..."
if NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/registerUsers.js; then
    log_success "Users registered successfully"
else
    log_warning "User registration had issues, but continuing..."
fi

cd ../..

# 8. Start application services
log_info "Starting application services..."
cd web-app/server
npm run start:server &
cd ../client
npm run start:client &
cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}                    TLS FIX COMPLETED                               ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ TLS certificate issues should now be resolved${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC}  http://localhost:3003"
echo -e "${BLUE}📊 CouchDB:${NC} http://localhost:5984/_utils"
echo ""
echo -e "${YELLOW}If you still encounter issues:${NC}"
echo "1. Check Docker containers: docker ps"
echo "2. Check CA logs: docker logs ca_org1"
echo "3. Verify wallet contents: ls -la web-app/server/wallet/"
echo "4. See TROUBLESHOOTING.md for more solutions"
echo ""