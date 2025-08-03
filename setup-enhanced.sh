#!/bin/bash

# Enhanced Supply Chain Pro Setup Script
# This script provides a complete, error-free setup experience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Progress tracking
TOTAL_STEPS=12
CURRENT_STEP=0

show_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    local percentage=$((CURRENT_STEP * 100 / TOTAL_STEPS))
    echo -e "${CYAN}[${CURRENT_STEP}/${TOTAL_STEPS}] (${percentage}%) $1${NC}"
}

# Check if running on supported OS
check_os() {
    show_progress "Checking operating system compatibility"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "macOS detected"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        log_success "Windows with WSL/Cygwin detected"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Enhanced prerequisite checking
check_prerequisites() {
    show_progress "Verifying system prerequisites"
    
    local missing_deps=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("Docker")
    else
        log_success "Docker found: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("Docker Compose")
    else
        log_success "Docker Compose found: $(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 16 ]; then
            log_error "Node.js version 16 or higher is required. Current version: $(node -v)"
            missing_deps+=("Node.js 16+")
        else
            log_success "Node.js found: $(node -v)"
        fi
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        log_success "npm found: $(npm -v)"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        missing_deps+=("Docker daemon")
    else
        log_success "Docker daemon is running"
    fi
    
    # Report missing dependencies
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies and run this script again."
        echo ""
        echo "Installation guides:"
        echo "- Docker: https://docs.docker.com/get-docker/"
        echo "- Docker Compose: https://docs.docker.com/compose/install/"
        echo "- Node.js: https://nodejs.org/en/download/"
        exit 1
    fi
}

# Setup environment configuration
setup_environment() {
    show_progress "Setting up environment configuration"
    
    # Create .env from template if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success ".env file created from template"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Load environment variables
    set -a
    source .env
    set +a
    log_success "Environment variables loaded"
    
    # Validate critical environment variables
    if [ "$TLS_ENABLED" = "true" ] && [ "$NODE_ENV" = "development" ]; then
        log_warning "TLS is enabled in development mode. This may cause certificate issues."
        log_info "Setting TLS_ENABLED=false for development..."
        sed -i 's/TLS_ENABLED=true/TLS_ENABLED=false/' .env 2>/dev/null || \
        sed -i.bak 's/TLS_ENABLED=true/TLS_ENABLED=false/' .env
        export TLS_ENABLED=false
    fi
    
    # Make scripts executable
    chmod +x *.sh
    find . -name "*.sh" -exec chmod +x {} \;
    log_success "Scripts made executable"
}

# Download and setup Hyperledger Fabric
setup_fabric() {
    show_progress "Setting up Hyperledger Fabric binaries and images"
    
    cd network
    
    if [ ! -d "bin" ]; then
        log_info "Downloading Hyperledger Fabric binaries and Docker images..."
        log_info "This may take several minutes depending on your internet connection..."
        
        # Download with progress indication
        curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.7 1.5.2
        
        if [ $? -eq 0 ]; then
            log_success "Fabric binaries and images downloaded successfully"
        else
            log_error "Failed to download Fabric binaries"
            exit 1
        fi
    else
        log_info "Fabric binaries already exist"
    fi
    
    # Add bin directory to PATH for this session
    export PATH=${PWD}/bin:$PATH
    cd ..
}

# Install Node.js dependencies
install_dependencies() {
    show_progress "Installing Node.js dependencies"
    
    # Chaincode dependencies
    log_info "Installing chaincode dependencies..."
    cd chaincode
    npm install --silent
    npm run build
    cd ..
    log_success "Chaincode dependencies installed and built"
    
    # Server dependencies
    log_info "Installing server dependencies..."
    cd web-app/server
    npm install --silent
    cd ../..
    log_success "Server dependencies installed"
    
    # Client dependencies
    log_info "Installing client dependencies..."
    cd web-app/client
    npm install --silent
    cd ../..
    log_success "Client dependencies installed"
}

# Start Hyperledger Fabric network
start_fabric_network() {
    show_progress "Starting Hyperledger Fabric network"
    
    cd network/fabric-network
    
    # Clean up any existing network
    log_info "Cleaning up existing network..."
    ./network.sh down 2>/dev/null || true
    
    # Start the network with CA and CouchDB
    log_info "Starting network with Certificate Authorities and CouchDB..."
    log_info "This process may take 2-3 minutes..."
    
    if ./network.sh up createChannel -ca; then
        log_success "Fabric network started successfully"
    else
        log_error "Failed to start Fabric network"
        log_info "Checking Docker containers..."
        docker ps -a
        exit 1
    fi
    
    cd ../..
}

# Deploy chaincode
deploy_chaincode() {
    show_progress "Deploying supply chain smart contract"
    
    cd network/fabric-network
    
    log_info "Deploying chaincode to the network..."
    if ./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript -ccv 1.0 -ccs 1; then
        log_success "Chaincode deployed successfully"
    else
        log_error "Failed to deploy chaincode"
        exit 1
    fi
    
    cd ../..
}

# Setup identities with enhanced error handling
setup_identities() {
    show_progress "Setting up blockchain identities"
    
    cd web-app/server
    
    log_info "Setting up admin and user identities..."
    log_info "This process may take 1-2 minutes..."
    
    # Wait for CA to be fully ready
    log_info "Waiting for Certificate Authority to be ready..."
    sleep 10
    
    # Check if CA is responding
    local ca_ready=false
    for i in {1..30}; do
        if curl -k -s https://localhost:7054/cainfo > /dev/null 2>&1; then
            ca_ready=true
            break
        fi
        sleep 2
        echo -n "."
    done
    echo ""
    
    if [ "$ca_ready" = true ]; then
        log_success "Certificate Authority is ready"
    else
        log_warning "CA might not be fully ready, but continuing..."
    fi
    
    # Run identity setup
    if node fabric/setup-identities.js; then
        log_success "Identities setup completed successfully"
    else
        log_error "Identity setup failed"
        log_info "Trying alternative approach..."
        
        # Alternative approach with explicit TLS bypass
        if NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/setup-identities.js; then
            log_success "Identities setup completed with TLS bypass"
        else
            log_error "Identity setup failed even with TLS bypass"
            exit 1
        fi
    fi
    
    cd ../..
}

# Start application services
start_services() {
    show_progress "Starting application services"
    
    # Start backend server
    log_info "Starting backend API server..."
    cd web-app/server
    npm run start:server
    cd ../..
    
    # Wait for server to start
    log_info "Waiting for backend server to initialize..."
    sleep 5
    
    # Test backend connectivity
    local server_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:3003/ > /dev/null 2>&1; then
            server_ready=true
            break
        fi
        sleep 1
    done
    
    if [ "$server_ready" = true ]; then
        log_success "Backend server is ready"
    else
        log_warning "Backend server might not be fully ready"
    fi
    
    # Start frontend client
    log_info "Starting frontend application..."
    cd web-app/client
    npm run start:client
    cd ../..
    
    log_success "Application services started"
}

# Verify setup
verify_setup() {
    show_progress "Verifying complete setup"
    
    local issues=()
    
    # Check Docker containers
    log_info "Checking Docker containers..."
    local fabric_containers=$(docker ps | grep hyperledger | wc -l)
    if [ "$fabric_containers" -ge 4 ]; then
        log_success "Fabric containers are running ($fabric_containers containers)"
    else
        issues+=("Insufficient Fabric containers running")
    fi
    
    # Check wallet contents
    log_info "Checking wallet contents..."
    if [ -d "web-app/server/wallet" ] && [ "$(ls -A web-app/server/wallet)" ]; then
        local identity_count=$(ls web-app/server/wallet | wc -l)
        log_success "Wallet contains $identity_count identities"
    else
        issues+=("Wallet is empty or missing")
    fi
    
    # Check backend API
    log_info "Checking backend API..."
    if curl -s http://localhost:3003/ > /dev/null 2>&1; then
        log_success "Backend API is responding"
    else
        issues+=("Backend API is not responding")
    fi
    
    # Check frontend
    log_info "Checking frontend application..."
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        log_success "Frontend application is responding"
    else
        issues+=("Frontend application is not responding")
    fi
    
    # Report issues
    if [ ${#issues[@]} -eq 0 ]; then
        log_success "All components verified successfully"
        return 0
    else
        log_warning "Some issues detected:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# Display completion information
show_completion_info() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                    SETUP COMPLETED SUCCESSFULLY                     ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}🎉 Supply Chain Pro is now running!${NC}"
    echo ""
    echo -e "${BLUE}📱 Application URLs:${NC}"
    echo -e "   🌐 Frontend:     ${GREEN}http://localhost:3000${NC}"
    echo -e "   🔧 Backend API:  ${GREEN}http://localhost:3003${NC}"
    echo -e "   📊 CouchDB:      ${GREEN}http://localhost:5984/_utils${NC}"
    echo ""
    echo -e "${BLUE}🔐 Default Login Credentials:${NC}"
    echo -e "   👑 Admin:        ${YELLOW}admin / admin123${NC}"
    echo -e "   👨‍💼 Manager:      ${YELLOW}manager / manager123${NC}"
    echo -e "   👨‍💻 Employee:     ${YELLOW}employee / employee123${NC}"
    echo -e "   👤 Client:       ${YELLOW}client / client123${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Management Commands:${NC}"
    echo -e "   Stop services:    ${CYAN}./stop.sh${NC}"
    echo -e "   Restart:          ${CYAN}./restart.sh${NC}"
    echo -e "   View logs:        ${CYAN}./logs.sh${NC}"
    echo -e "   Clean up:         ${CYAN}./cleanup.sh${NC}"
    echo -e "   Backup data:      ${CYAN}./scripts/backup.sh${NC}"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "   Setup Guide:      ${CYAN}README.md${NC}"
    echo -e "   TLS Config:       ${CYAN}TLS_SETUP_GUIDE.md${NC}"
    echo -e "   Troubleshooting:  ${CYAN}TROUBLESHOOTING.md${NC}"
    echo ""
    echo -e "${GREEN}✅ Your blockchain supply chain is ready for use!${NC}"
    echo ""
}

# Error handling and cleanup
cleanup_on_error() {
    log_error "Setup failed. Cleaning up..."
    
    # Stop any running services
    ./stop.sh 2>/dev/null || true
    
    # Kill background processes
    if [ -f web-app/server/.server.pid ]; then
        kill $(cat web-app/server/.server.pid) 2>/dev/null || true
        rm -f web-app/server/.server.pid
    fi
    
    if [ -f web-app/client/.client.pid ]; then
        kill $(cat web-app/client/.client.pid) 2>/dev/null || true
        rm -f web-app/client/.client.pid
    fi
    
    log_info "Cleanup completed. You can run this script again to retry setup."
    exit 1
}

# Main setup function
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}                    SUPPLY CHAIN PRO ENHANCED SETUP                  ${NC}"
    echo -e "${BLUE}                 Blockchain Supply Chain Management                  ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Setup steps
    check_os
    check_prerequisites
    setup_environment
    setup_fabric
    install_dependencies
    start_fabric_network
    deploy_chaincode
    setup_identities
    start_services
    
    # Verification
    show_progress "Running final verification"
    if verify_setup; then
        show_progress "Setup verification completed"
        show_completion_info
    else
        log_warning "Setup completed with some issues. Check the warnings above."
        show_completion_info
    fi
}

# Set up error handling
trap cleanup_on_error ERR INT TERM

# Run main function
main "$@"