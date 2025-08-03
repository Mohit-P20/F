#!/bin/bash

# Supply Chain Pro - Cleanup Script
# This script performs a complete cleanup of the environment

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

confirm_cleanup() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}                        CLEANUP WARNING                              ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${YELLOW}This will completely remove:${NC}"
    echo "  • All running services"
    echo "  • Hyperledger Fabric network and data"
    echo "  • Docker containers and volumes"
    echo "  • Blockchain ledger data"
    echo "  • Certificate authorities and identities"
    echo "  • Node.js dependencies"
    echo ""
    echo -e "${RED}⚠️  This action cannot be undone!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
}

cleanup_services() {
    log_info "Stopping all services..."
    
    # Stop web application services
    if [ -f .server.pid ]; then
        SERVER_PID=$(cat .server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then # Check if process exists
            kill $SERVER_PID 2>/dev/null || true
        fi
        rm .server.pid
    fi
    
    if [ -f .client.pid ]; then
        CLIENT_PID=$(cat .client.pid)
        if kill -0 $CLIENT_PID 2>/dev/null; then # Check if process exists
            kill $CLIENT_PID 2>/dev/null || true
        fi
        rm .client.pid
    fi
    
    # Kill any remaining Node.js processes
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    
    log_success "Services stopped"
}

cleanup_fabric_network() {
    log_info "Cleaning up Hyperledger Fabric network..."
    
    cd network/fabric-network
    
    # Stop the network
    ./network.sh down 2>/dev/null || true
    
    # Remove generated artifacts
    rm -rf organizations/peerOrganizations 2>/dev/null || true
    rm -rf organizations/ordererOrganizations 2>/dev/null || true
    rm -rf system-genesis-block 2>/dev/null || true
    rm -rf channel-artifacts 2>/dev/null || true
    rm -f log.txt 2>/dev/null || true
    rm -f *.tar.gz 2>/dev/null || true
    
    # Clean up fabric-ca artifacts
    rm -rf organizations/fabric-ca/org1/msp 2>/dev/null || true
    rm -rf organizations/fabric-ca/org1/tls-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/org1/ca-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/org1/IssuerPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/org1/IssuerRevocationPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/org1/fabric-ca-server.db 2>/dev/null || true
    
    rm -rf organizations/fabric-ca/org2/msp 2>/dev/null || true
    rm -rf organizations/fabric-ca/org2/tls-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/org2/ca-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/org2/IssuerPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/org2/IssuerRevocationPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/org2/fabric-ca-server.db 2>/dev/null || true
    
    rm -rf organizations/fabric-ca/ordererOrg/msp 2>/dev/null || true
    rm -rf organizations/fabric-ca/ordererOrg/tls-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/ordererOrg/ca-cert.pem 2>/dev/null || true
    rm -rf organizations/fabric-ca/ordererOrg/IssuerPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey 2>/dev/null || true
    rm -rf organizations/fabric-ca/ordererOrg/fabric-ca-server.db 2>/dev/null || true
    
    cd ../..
    
    log_success "Fabric network cleaned up"
}

cleanup_docker() {
    log_info "Cleaning up Docker containers and images..."
    
    # Remove chaincode containers
    docker ps -a | awk '($2 ~ /dev-peer.*/) {print $1}' | xargs docker rm -f 2>/dev/null || true
    
    # Remove chaincode images
    docker images | awk '($1 ~ /dev-peer.*/) {print $3}' | xargs docker rmi -f 2>/dev/null || true
    
    # Remove Hyperledger Fabric containers
    docker ps -a | grep hyperledger | awk '{print $1}' | xargs docker rm -f 2>/dev/null || true
    
    # Remove volumes
    docker volume ls | grep fabric | awk '{print $2}' | xargs docker volume rm 2>/dev/null || true
    
    # Prune unused Docker resources
    docker system prune -f 2>/dev/null || true
    
    log_success "Docker cleanup completed"
}

cleanup_identities() {
    log_info "Cleaning up identities and wallets..."
    
    # Remove wallet directory
    rm -rf web-app/server/wallet 2>/dev/null || true
    rm -rf web-app/server/fabric/wallet 2>/dev/null || true
    
    log_success "Identities cleaned up"
}

cleanup_dependencies() {
    log_info "Cleaning up Node.js dependencies..."
    
    # Remove node_modules and package-lock.json
    rm -rf chaincode/node_modules 2>/dev/null || true
    rm -rf chaincode/package-lock.json 2>/dev/null || true
    rm -rf chaincode/dist 2>/dev/null || true
    
    rm -rf web-app/server/node_modules 2>/dev/null || true
    rm -rf web-app/server/package-lock.json 2>/dev/null || true
    
    rm -rf web-app/client/node_modules 2>/dev/null || true
    rm -rf web-app/client/package-lock.json 2>/dev/null || true
    rm -rf web-app/client/build 2>/dev/null || true
    
    log_success "Dependencies cleaned up"
}

cleanup_binaries() {
    log_info "Cleaning up Hyperledger Fabric binaries..."
    
    # Remove downloaded binaries
    rm -rf network/bin 2>/dev/null || true
    rm -rf network/config 2>/dev/null || true
    
    log_success "Binaries cleaned up"
}

main() {
    confirm_cleanup
    
    echo ""
    log_info "Starting cleanup process..."
    
    cleanup_services
    cleanup_fabric_network
    cleanup_docker
    cleanup_identities
    cleanup_dependencies
    cleanup_binaries
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                        CLEANUP COMPLETED                            ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}✅ All components have been cleaned up successfully${NC}"
    echo ""
    echo -e "${YELLOW}To set up the environment again, run:${NC} ./setup.sh"
    echo ""
}

main "$@"
