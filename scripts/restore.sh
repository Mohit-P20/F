#!/bin/bash

# Supply Chain Pro - Restore Script
# This script restores from a backup archive

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

# Check if backup file is provided
if [ $# -eq 0 ]; then
    log_error "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Confirm restore operation
confirm_restore() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}                        RESTORE WARNING                              ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${YELLOW}This will restore from backup:${NC} $BACKUP_FILE"
    echo ""
    echo -e "${YELLOW}This operation will:${NC}"
    echo "  • Stop all running services"
    echo "  • Replace current configuration and data"
    echo "  • Restore blockchain network state"
    echo "  • Restore application wallets and identities"
    echo ""
    echo -e "${RED}⚠️  Current data will be overwritten!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi
}

# Stop services before restore
stop_services() {
    log_info "Stopping all services..."
    ./stop.sh 2>/dev/null || true
    log_success "Services stopped"
}

# Extract backup
extract_backup() {
    log_info "Extracting backup archive..."
    
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    # Find the backup directory (should be the only directory in temp)
    BACKUP_CONTENT_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d ! -path "$TEMP_DIR" | head -1)
    
    if [ -z "$BACKUP_CONTENT_DIR" ]; then
        log_error "Invalid backup archive structure"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    echo "$BACKUP_CONTENT_DIR"
}

# Restore Fabric data
restore_fabric_data() {
    local backup_dir="$1"
    log_info "Restoring Hyperledger Fabric data..."
    
    # Backup current data before restore
    if [ -d "network/fabric-network/organizations" ]; then
        mv network/fabric-network/organizations network/fabric-network/organizations.backup.$(date +%s) 2>/dev/null || true
    fi
    
    # Restore organizations
    if [ -d "$backup_dir/organizations" ]; then
        cp -r "$backup_dir/organizations" network/fabric-network/
        log_success "Organizations data restored"
    fi
    
    # Restore channel artifacts
    if [ -d "$backup_dir/channel-artifacts" ]; then
        rm -rf network/fabric-network/channel-artifacts 2>/dev/null || true
        cp -r "$backup_dir/channel-artifacts" network/fabric-network/
        log_success "Channel artifacts restored"
    fi
    
    # Restore genesis block
    if [ -d "$backup_dir/system-genesis-block" ]; then
        rm -rf network/fabric-network/system-genesis-block 2>/dev/null || true
        cp -r "$backup_dir/system-genesis-block" network/fabric-network/
        log_success "Genesis block restored"
    fi
}

# Restore wallets
restore_wallets() {
    local backup_dir="$1"
    log_info "Restoring wallets and identities..."
    
    # Backup current wallets
    if [ -d "web-app/server/wallet" ]; then
        mv web-app/server/wallet web-app/server/wallet.backup.$(date +%s) 2>/dev/null || true
    fi
    
    # Restore server wallet
    if [ -d "$backup_dir/wallet" ]; then
        cp -r "$backup_dir/wallet" web-app/server/
        log_success "Server wallet restored"
    fi
    
    # Restore fabric wallet
    if [ -d "$backup_dir/fabric-wallet" ]; then
        rm -rf web-app/server/fabric/wallet 2>/dev/null || true
        cp -r "$backup_dir/fabric-wallet" web-app/server/fabric/wallet
        log_success "Fabric wallet restored"
    fi
}

# Restore application code
restore_app_code() {
    local backup_dir="$1"
    log_info "Restoring application code..."
    
    # Restore chaincode
    if [ -d "$backup_dir/chaincode" ]; then
        # Backup current chaincode
        if [ -d "chaincode" ]; then
            mv chaincode chaincode.backup.$(date +%s) 2>/dev/null || true
        fi
        cp -r "$backup_dir/chaincode" ./
        log_success "Chaincode restored"
    fi
    
    # Restore web application
    if [ -d "$backup_dir/web-app" ]; then
        # Backup current web-app (excluding node_modules)
        if [ -d "web-app" ]; then
            rsync -av --exclude='node_modules' --exclude='build' web-app/ web-app.backup.$(date +%s)/ 2>/dev/null || true
        fi
        
        # Restore web-app
        rsync -av "$backup_dir/web-app/" web-app/
        log_success "Web application restored"
    fi
}

# Reinstall dependencies
reinstall_dependencies() {
    log_info "Reinstalling dependencies..."
    
    # Chaincode dependencies
    if [ -d "chaincode" ]; then
        cd chaincode
        npm install
        cd ..
        log_success "Chaincode dependencies installed"
    fi
    
    # Server dependencies
    if [ -d "web-app/server" ]; then
        cd web-app/server
        npm install
        cd ../..
        log_success "Server dependencies installed"
    fi
    
    # Client dependencies
    if [ -d "web-app/client" ]; then
        cd web-app/client
        npm install
        cd ../..
        log_success "Client dependencies installed"
    fi
}

# Main restore process
main() {
    confirm_restore
    
    echo ""
    log_info "Starting restore process..."
    
    stop_services
    
    BACKUP_CONTENT_DIR=$(extract_backup)
    
    restore_fabric_data "$BACKUP_CONTENT_DIR"
    restore_wallets "$BACKUP_CONTENT_DIR"
    restore_app_code "$BACKUP_CONTENT_DIR"
    reinstall_dependencies
    
    # Cleanup temp directory
    rm -rf "$(dirname "$BACKUP_CONTENT_DIR")"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                    RESTORE COMPLETED SUCCESSFULLY                   ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}✅ Restore completed successfully${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review the restored configuration"
    echo "  2. Start the services: ./setup.sh"
    echo "  3. Verify all components are working correctly"
    echo ""
    echo -e "${YELLOW}Backup files created:${NC}"
    find . -name "*.backup.*" -type d 2>/dev/null | head -5
    echo ""
}

# Handle script interruption
cleanup_on_exit() {
    log_warning "Restore interrupted. System may be in inconsistent state."
    log_info "Consider running ./cleanup.sh and restoring from a known good backup."
    exit 1
}

trap cleanup_on_exit INT TERM

# Run main function
main "$@"