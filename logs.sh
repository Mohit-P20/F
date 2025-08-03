#!/bin/bash
source ./load-env.sh
# Supply Chain Pro - Logs Script
# This script shows logs from various services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [service]"
    echo ""
    echo "Available services:"
    echo "  fabric    - Show Hyperledger Fabric network logs"
    echo "  server    - Show backend server logs"
    echo "  client    - Show frontend client logs"
    echo "  all       - Show all logs (default)"
    echo ""
}

show_fabric_logs() {
    log_info "Showing Hyperledger Fabric network logs..."
    echo ""
    docker-compose -f network/fabric-network/docker/docker-compose-test-net.yaml logs --tail=50
}

show_server_logs() {
    log_info "Showing backend server logs..."
    echo ""
    if [ -f web-app/server/server.log ]; then
        tail -n 100 web-app/server/server.log # Show last 100 lines
    else
        echo "Server log file not found. Server may not have been started or logs are not being captured."
    fi
}

show_client_logs() {
    log_info "Showing frontend client logs..."
    echo ""
    if [ -f web-app/client/client.log ]; then
        tail -n 100 web-app/client/client.log # Show last 100 lines
    else
        echo "Client log file not found. Client may not have been started or logs are not being captured."
    fi
}

show_all_logs() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}                    SUPPLY CHAIN PRO - LOGS                          ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    show_fabric_logs
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    show_server_logs
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    show_client_logs
}

# Main script
case "${1:-all}" in
    fabric)
        show_fabric_logs
        ;;
    server)
        show_server_logs
        ;;
    client)
        show_client_logs
        ;;
    all)
        show_all_logs
        ;;
    -h|--help)
        show_usage
        ;;
    *)
        echo "Unknown service: $1"
        show_usage
        exit 1
        ;;
esac
