#!/bin/bash

# Supply Chain Pro - Stop Script
# This script stops all running services

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}                    STOPPING SUPPLY CHAIN PRO                        ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop web application services
log_info "Stopping web application services..."
# Stop backend server
log_info "Stopping backend server..."
cd web-app/server
npm run stop:server   # Use ' true' to prevent script from exiting if process isn't running
cd ../..
log_success "Backend server stop command sent."

# Stop frontend client
log_info "Stopping frontend client..."
cd web-app/client
npm run stop:client
cd ../..
log_success "Frontend client stop command sent."

# Stop Hyperledger Fabric network
log_info "Stopping Hyperledger Fabric network..."
cd network/fabric-network
./network.sh down
cd ../..

log_success "All services stopped successfully"
echo ""
echo -e "${GREEN}✅ Supply Chain Pro has been stopped${NC}"
echo ""
echo -e "${YELLOW}To restart the services, run:${NC} ./restart.sh"
echo -e "${YELLOW}To start fresh setup, run:${NC} ./setup.sh"
echo ""
