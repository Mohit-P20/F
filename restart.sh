#!/bin/bash

# Supply Chain Pro - Restart Script
# This script restarts all services

set -e
source ./load-env.sh

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
echo -e "${BLUE}                   RESTARTING SUPPLY CHAIN PRO                       ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop existing services
log_info "Stopping existing services..."
./stop.sh

# Wait a moment
sleep 3

# Start Hyperledger Fabric network
log_info "Starting Hyperledger Fabric network..."
cd network/fabric-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript
cd ../..

# Start web application services
log_info "Starting web application services..."

# Start the server in background
log_info "Starting backend server..."
cd web-app/server
npm run start:server
cd ../..

# Wait a moment for server to start
sleep 5

# Start the client
log_info "Starting frontend client..."
cd web-app/client
npm run start:client
cd ../..



log_success "All services restarted successfully"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}                    SUPPLY CHAIN PRO - RUNNING                       ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}🌐 Frontend Application:${NC} http://localhost:3000"
echo -e "${BLUE}🔧 Backend API:${NC}          http://localhost:3003"
echo -e "${BLUE}📊 CouchDB Fauxton:${NC}     http://localhost:5984/_utils"
echo ""
echo -e "${GREEN}✅ Your blockchain supply chain is now running!${NC}"
echo ""
