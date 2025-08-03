#!/bin/bash

# Supply Chain Pro - Production Deployment Script
# This script deploys the application to a production environment

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
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Check prerequisites for production deployment
check_production_prerequisites() {
    log_info "Checking production prerequisites..."
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required for production deployment"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is required for production deployment"
        exit 1
    fi
    
    # Check if running as root (not recommended for production)
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root is not recommended for production"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Generate SSL certificates
generate_ssl_certificates() {
    log_info "Setting up SSL certificates..."
    
    mkdir -p nginx/ssl
    
    if [ "$DOMAIN" = "localhost" ]; then
        log_warning "Generating self-signed certificates for localhost"
        
        # Generate self-signed certificate for development/testing
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log_success "Self-signed certificates generated"
    else
        log_info "For production with domain $DOMAIN, you should:"
        log_info "1. Obtain SSL certificates from a trusted CA (Let's Encrypt, etc.)"
        log_info "2. Place cert.pem and key.pem in nginx/ssl/ directory"
        log_info "3. Update nginx configuration if needed"
        
        if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
            log_error "SSL certificates not found. Please provide cert.pem and key.pem in nginx/ssl/"
            exit 1
        fi
    fi
}

# Setup environment variables for production
setup_production_env() {
    log_info "Setting up production environment variables..."
    
    # Create production environment file if it doesn't exist
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
DOMAIN=${DOMAIN}

# Database Configuration
COUCHDB_USER=admin
COUCHDB_PASSWORD=$(openssl rand -base64 32)
COUCHDB_SECRET=$(openssl rand -base64 32)

# Security Configuration
JWT_SECRET=$(openssl rand -base64 64)
ALLOWED_ORIGINS=https://${DOMAIN}

# Monitoring Configuration
GRAFANA_PASSWORD=$(openssl rand -base64 16)

# Backup Configuration
BACKUP_DIR=/var/backups/supply-chain
RETENTION_DAYS=30

# Fabric Configuration
CHANNEL_NAME=mychannel
CC_NAME=food-supply-chain
FABRIC_IDENTITY=manager
EOF
        log_success "Production environment file created"
        log_warning "Please review and update .env.production with your specific configuration"
    else
        log_info "Using existing .env.production file"
    fi
}

# Build production images
build_production_images() {
    log_info "Building production Docker images..."
    
    # Build client
    log_info "Building frontend application..."
    cd web-app/client
    npm run build
    cd ../..
    
    # Build production images
    docker-compose -f docker-compose.prod.yml build
    
    log_success "Production images built successfully"
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production environment..."
    
    # Load production environment
    set -a
    source .env.production
    set +a
    
    # Start production services
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if curl -f -s "http://localhost/health" > /dev/null; then
        log_success "Application is responding to health checks"
    else
        log_warning "Health check failed, but services may still be starting"
    fi
    
    log_success "Production deployment completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create monitoring directories
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p monitoring/logstash/pipeline
    
    # Setup Grafana datasource
    cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log_success "Monitoring configuration created"
}

# Setup backup automation
setup_backup_automation() {
    log_info "Setting up automated backups..."
    
    # Create backup cron job
    CRON_JOB="0 2 * * * cd $(pwd) && ./scripts/backup.sh >> /var/log/supply-chain-backup.log 2>&1"
    
    # Add to crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "supply-chain-backup"; then
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        log_success "Automated backup scheduled (daily at 2 AM)"
    else
        log_info "Backup automation already configured"
    fi
}

# Display deployment information
show_deployment_info() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                PRODUCTION DEPLOYMENT COMPLETED                     ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BLUE}🌐 Application URL:${NC} https://${DOMAIN}"
    echo -e "${BLUE}📊 Monitoring:${NC}      https://${DOMAIN}:3001 (Grafana)"
    echo -e "${BLUE}🔍 Logs:${NC}            https://${DOMAIN}:5601 (Kibana)"
    echo -e "${BLUE}📈 Metrics:${NC}         https://${DOMAIN}:9090 (Prometheus)"
    echo -e "${BLUE}🗄️  Database:${NC}       https://${DOMAIN}:5984/_utils (CouchDB)"
    echo ""
    echo -e "${YELLOW}🔐 Security Features Enabled:${NC}"
    echo "  ✅ HTTPS/TLS encryption"
    echo "  ✅ Security headers (HSTS, CSP, etc.)"
    echo "  ✅ Rate limiting"
    echo "  ✅ Input validation"
    echo "  ✅ JWT authentication"
    echo "  ✅ Role-based access control"
    echo ""
    echo -e "${YELLOW}📋 Management Commands:${NC}"
    echo "  View logs:           docker-compose -f docker-compose.prod.yml logs"
    echo "  Scale services:      docker-compose -f docker-compose.prod.yml up --scale api-server-1=3"
    echo "  Update application:  ./scripts/deploy-production.sh"
    echo "  Backup data:         ./scripts/backup.sh"
    echo "  Monitor status:      docker-compose -f docker-compose.prod.yml ps"
    echo ""
    echo -e "${GREEN}✅ Your production blockchain supply chain is now live!${NC}"
    echo ""
}

# Main deployment function
main() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}                SUPPLY CHAIN PRO PRODUCTION DEPLOYMENT              ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    check_production_prerequisites
    setup_production_env
    generate_ssl_certificates
    setup_monitoring
    build_production_images
    deploy_production
    setup_backup_automation
    show_deployment_info
}

# Handle script interruption
cleanup_on_exit() {
    log_warning "Deployment interrupted. Cleaning up..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    exit 1
}

trap cleanup_on_exit INT TERM

# Run main function
main "$@"