#!/bin/bash

# Supply Chain Pro - Automated Setup Script
# This script sets up the complete Hyperledger Fabric supply chain application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if running on supported OS
check_os() {
    log_info "Checking operating system..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "macOS detected"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    log_success "Docker Compose found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js (version 14 or higher)."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        log_error "Node.js version 14 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    log_success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    log_success "npm $(npm -v) found"
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    log_success "Docker daemon is running"
}

# Download Hyperledger Fabric binaries and Docker images
setup_fabric() {
    log_info "Setting up Hyperledger Fabric..."
    
    cd network
    
    # Download Fabric binaries and Docker images
    if [ ! -d "bin" ]; then
        log_info "Downloading Hyperledger Fabric binaries and Docker images..."
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.7 1.5.2
        log_success "Fabric binaries and images downloaded"
    else
        log_info "Fabric binaries already exist, skipping download"
    fi
    
    # Add bin directory to PATH for this session
    export PATH=${PWD}/network/bin:$PATH
    
    cd ..
}

# Setup and start the Hyperledger Fabric network
start_fabric_network() {
    log_info "Starting Hyperledger Fabric network..."
    
    cd network/fabric-network
    
    # Clean up any existing network
    log_info "Cleaning up existing network..."
    ./network.sh down 2>/dev/null || true
    
    # Start the network with CA and CouchDB
    log_info "Starting network with Certificate Authorities and CouchDB..."
    ./network.sh up createChannel -ca -s couchdb
    
    if [ $? -eq 0 ]; then
        log_success "Fabric network started successfully"
    else
        log_error "Failed to start Fabric network"
        exit 1
    fi
    
    cd ../..
}

# Deploy the chaincode
deploy_chaincode() {
    log_info "Deploying supply chain chaincode..."
    
    cd network/fabric-network
    
    # Build the chaincode
    log_info "Building TypeScript chaincode..."
    cd ../../chaincode
    npm install
    npm run build
    cd ../network/fabric-network
    
    # Deploy the chaincode
    log_info "Deploying chaincode to the network..."
    ./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript -ccv 1.0 -ccs 1
    
    if [ $? -eq 0 ]; then
        log_success "Chaincode deployed successfully"
    else
        log_error "Failed to deploy chaincode"
        exit 1
    fi
    
    cd ../..
}

# Setup the web application
setup_web_app() {
    log_info "Setting up web application..."
    
    # Setup server
    log_info "Installing server dependencies..."
    cd web-app/server
    npm install
    
    # Setup client
    log_info "Installing client dependencies..."
    cd ../client
    npm install
    
    cd ../..
    log_success "Web application dependencies installed"

    # Copy connection profile to server's expected location
    log_info "Verifying connection profile location..."
    if [ -f "network/fabric-network/organizations/peerOrganizations/org1.example.com/connection-org1.json" ]; then
        log_success "Connection profile found at correct location"
    else
        log_error "Connection profile not found. Network may not have started properly."
        exit 1
    fi

}

# Setup Fabric CA identities
setup_identities() {
    log_info "Setting up Fabric CA identities..."
    
    cd web-app/server

    # Load environment variables
    if [ -f "${PWD}/../../.env" ]; then
        set -a
        source "${PWD}/../../.env"
        set +a
        log_info "Environment variables loaded for identity setup"
    fi

    # Enroll admin
    log_info "Enrolling admin user..."
    node fabric/enrollAdmin.js
    
    if [ $? -ne 0 ]; then
        log_error "Failed to enroll admin user"
        exit 1
    fi
    
    # Register and enroll users
    log_info "Registering application users..."
    node fabric/registerUsers.js

    if [ $? -ne 0 ]; then
        log_error "Failed to register users"
        exit 1
    fi

    cd ../..
    log_success "Identities setup completed"
}

# Start the application services
start_services() {
    log_info "Starting application services..."
    
    # Set NODE_EXTRA_CA_CERTS for Node.js processes
    # Use PWD to get the absolute path from the script's execution directory
    export NODE_EXTRA_CA_CERTS="${PWD}/network/fabric-network/organizations/fabric-ca/org1/tls-cert.pem"
    log_info "NODE_EXTRA_CA_CERTS set to: ${NODE_EXTRA_CA_CERTS}"

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
    
    log_success "Application services started"
}

# Display final information
show_completion_info() {
    log_success "🎉 Supply Chain Pro setup completed successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                    SUPPLY CHAIN PRO - READY TO USE                    ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}🌐 Frontend Application:${NC} http://localhost:3000"
    echo -e "${BLUE}🔧 Backend API:${NC}          http://localhost:3003"
    echo -e "${BLUE}📊 CouchDB Fauxton:${NC}     http://localhost:5984/_utils"
    echo ""
    echo -e "${YELLOW}📋 Default CouchDB Credentials:${NC}"
    echo "   Username: admin"
    echo "   Password: adminpw"
    echo ""
    echo -e "${YELLOW}🔧 Management Commands:${NC}"
    echo "   Stop services:    ./stop.sh"
    echo "   Restart services: ./restart.sh"
    echo "   View logs:        ./logs.sh"
    echo "   Clean up:         ./cleanup.sh"
    echo ""
    echo -e "${GREEN}✅ Your blockchain supply chain is now running!${NC}"
    echo ""
}

# Main setup function
main() {
    # Load environment first
    if [ -f .env ]; then
        set -a
        source .env
        set +a
        log_success "Environment variables loaded from .env"
    else
        log_warning ".env file not found, copying from .env.example"
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success ".env file created from template"
            log_warning "Please review and update .env file with your configuration"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}                    SUPPLY CHAIN PRO SETUP                           ${NC}"
    echo -e "${BLUE}                 Blockchain Supply Chain Management                  ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Validate environment configuration
    validate_environment

    # Load environment
    check_os
    check_prerequisites
    setup_fabric
    start_fabric_network
    deploy_chaincode
    setup_web_app
    setup_identities
    start_services
    show_completion_info
}

# Validate environment configuration
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Check TLS configuration
    if [ "$TLS_ENABLED" = "true" ]; then
        log_info "TLS enabled - validating certificate paths..."
        if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
            log_error "TLS certificates not found. Please configure certificate paths or set TLS_ENABLED=false for development."
            log_info "See TLS_SETUP_GUIDE.md for detailed configuration instructions."
            exit 1
        fi
        log_success "TLS certificates found and validated"
    else
        log_info "TLS disabled - using development configuration"
    fi
    
    # Check for secure JWT secret in production
    if [ "$NODE_ENV" = "production" ] && [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production-use-openssl-rand-base64-64" ]; then
        log_error "JWT_SECRET must be changed for production deployment"
        log_info "Generate a secure secret with: openssl rand -base64 64"
        exit 1
    fi
    
    # Check for secure passwords in production
    if [ "$NODE_ENV" = "production" ] && [ "$COUCHDB_PASSWORD" = "adminpw" ]; then
        log_warning "Consider changing default CouchDB password for production"
    fi
    
    log_success "Environment configuration validated"
}
# Handle script interruption
cleanup_on_exit() {
    log_warning "Setup interrupted. Cleaning up..."
    
    # Kill any background processes
    if [ -f .server.pid ]; then
        SERVER_PID=$(cat .server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            kill $SERVER_PID 2>/dev/null || true
        fi
        rm .server.pid
    fi
    
    if [ -f .client.pid ]; then
        CLIENT_PID=$(cat .client.pid)
        if kill -0 $CLIENT_PID 2>/dev/null; then
            kill $CLIENT_PID 2>/dev/null || true
        fi
        rm .client.pid
    fi
    
    log_info "Background processes stopped"
    exit 1
}

trap cleanup_on_exit INT TERM

# Run main function
main "$@"
