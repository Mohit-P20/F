#!/bin/bash

# Setup Environment Script
# This script sets up the complete environment for the Supply Chain Pro project

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
echo -e "${BLUE}                    SUPPLY CHAIN PRO - ENVIRONMENT SETUP             ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Make scripts executable
log_info "Making scripts executable..."
chmod +x *.sh
chmod +x network/fabric-network/*.sh
chmod +x network/fabric-network/scripts/*.sh
chmod +x network/fabric-network/addOrg3/*.sh
log_success "Scripts made executable"

# Load environment
log_info "Loading environment variables..."
source ./load-env.sh

# Check if Fabric binaries exist
if [ ! -d "network/bin" ]; then
    log_warning "Fabric binaries not found. They will be downloaded during setup."
else
    log_success "Fabric binaries found"
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p web-app/server/wallet
mkdir -p web-app/server/fabric/wallet
mkdir -p network/fabric-network/channel-artifacts
mkdir -p network/fabric-network/system-genesis-block
log_success "Directories created"

# Set up Node.js environment for chaincode
log_info "Setting up Node.js environment for chaincode..."
cd chaincode
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..
log_success "Chaincode dependencies installed"

# Set up server dependencies
log_info "Setting up server dependencies..."
cd web-app/server
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ../..
log_success "Server dependencies installed"

# Set up client dependencies
log_info "Setting up client dependencies..."
cd web-app/client
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ../..
log_success "Client dependencies installed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}                    ENVIRONMENT SETUP COMPLETED                      ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Environment is ready!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Run: source ./load-env.sh (to load environment in current shell)"
echo "  2. Run: ./setup.sh (to start the complete setup)"
echo ""
echo -e "${YELLOW}Or run individual components:${NC}"
echo "  - ./network/fabric-network/network.sh up createChannel -ca -s couchdb"
echo "  - ./network/fabric-network/network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl node"
echo ""