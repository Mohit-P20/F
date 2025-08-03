#!/bin/bash

# Supply Chain Pro - Backup Script
# This script creates backups of critical data

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

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="supply_chain_backup_${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory
mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"

log_info "Starting backup process..."
log_info "Backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"

# Backup Hyperledger Fabric data
backup_fabric_data() {
    log_info "Backing up Hyperledger Fabric data..."
    
    # Backup peer data
    if [ -d "network/fabric-network/organizations" ]; then
        cp -r network/fabric-network/organizations "${BACKUP_DIR}/${BACKUP_NAME}/organizations"
        log_success "Organizations data backed up"
    fi
    
    # Backup channel artifacts
    if [ -d "network/fabric-network/channel-artifacts" ]; then
        cp -r network/fabric-network/channel-artifacts "${BACKUP_DIR}/${BACKUP_NAME}/channel-artifacts"
        log_success "Channel artifacts backed up"
    fi
    
    # Backup system genesis block
    if [ -d "network/fabric-network/system-genesis-block" ]; then
        cp -r network/fabric-network/system-genesis-block "${BACKUP_DIR}/${BACKUP_NAME}/system-genesis-block"
        log_success "Genesis block backed up"
    fi
}

# Backup CouchDB data
backup_couchdb_data() {
    log_info "Backing up CouchDB data..."
    
    # Create CouchDB backup using docker exec
    if docker ps | grep -q couchdb; then
        log_info "Creating CouchDB database dump..."
        
        # Get list of databases
        DATABASES=$(docker exec couchdb0 curl -s http://admin:adminpw@localhost:5984/_all_dbs | jq -r '.[]' | grep -v '^_')
        
        mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}/couchdb"
        
        for db in $DATABASES; do
            log_info "Backing up database: $db"
            docker exec couchdb0 curl -s "http://admin:adminpw@localhost:5984/$db/_all_docs?include_docs=true" > "${BACKUP_DIR}/${BACKUP_NAME}/couchdb/${db}.json"
        done
        
        log_success "CouchDB data backed up"
    else
        log_warning "CouchDB container not running, skipping database backup"
    fi
}

# Backup application configuration
backup_app_config() {
    log_info "Backing up application configuration..."
    
    # Backup environment files (excluding sensitive data)
    if [ -f ".env.example" ]; then
        cp .env.example "${BACKUP_DIR}/${BACKUP_NAME}/"
    fi
    
    # Backup chaincode
    if [ -d "chaincode" ]; then
        cp -r chaincode "${BACKUP_DIR}/${BACKUP_NAME}/"
        log_success "Chaincode backed up"
    fi
    
    # Backup web application source (excluding node_modules)
    if [ -d "web-app" ]; then
        rsync -av --exclude='node_modules' --exclude='build' --exclude='*.log' web-app/ "${BACKUP_DIR}/${BACKUP_NAME}/web-app/"
        log_success "Web application source backed up"
    fi
    
    # Backup scripts
    cp *.sh "${BACKUP_DIR}/${BACKUP_NAME}/" 2>/dev/null || true
    log_success "Scripts backed up"
}

# Backup wallets and identities
backup_wallets() {
    log_info "Backing up wallets and identities..."
    
    if [ -d "web-app/server/wallet" ]; then
        cp -r web-app/server/wallet "${BACKUP_DIR}/${BACKUP_NAME}/"
        log_success "Server wallet backed up"
    fi
    
    if [ -d "web-app/server/fabric/wallet" ]; then
        cp -r web-app/server/fabric/wallet "${BACKUP_DIR}/${BACKUP_NAME}/fabric-wallet"
        log_success "Fabric wallet backed up"
    fi
}

# Create backup archive
create_archive() {
    log_info "Creating backup archive..."
    
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    rm -rf "${BACKUP_NAME}"
    
    log_success "Backup archive created: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    
    find "${BACKUP_DIR}" -name "supply_chain_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    log_success "Old backups cleaned up"
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" >/dev/null 2>&1; then
        log_success "Backup archive integrity verified"
    else
        log_error "Backup archive is corrupted!"
        exit 1
    fi
}

# Main backup process
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}                    SUPPLY CHAIN PRO BACKUP                          ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    backup_fabric_data
    backup_couchdb_data
    backup_app_config
    backup_wallets
    create_archive
    verify_backup
    cleanup_old_backups
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                    BACKUP COMPLETED SUCCESSFULLY                    ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
    echo -e "${BLUE}📁 Backup location:${NC} ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo -e "${BLUE}📊 Backup size:${NC} $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
    echo ""
    echo -e "${YELLOW}💡 To restore from this backup:${NC}"
    echo "   ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    echo ""
}

# Handle script interruption
cleanup_on_exit() {
    log_warning "Backup interrupted. Cleaning up..."
    rm -rf "${BACKUP_DIR}/${BACKUP_NAME}" 2>/dev/null || true
    exit 1
}

trap cleanup_on_exit INT TERM

# Run main function
main "$@"