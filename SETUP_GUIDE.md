# Supply Chain Pro - Complete Setup Guide

## 🎯 Overview

This guide provides step-by-step instructions for setting up Supply Chain Pro, a blockchain-based supply chain management system built on Hyperledger Fabric.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: Minimum 20GB free space
- **CPU**: Minimum 4 cores

### Required Software

#### 1. Docker & Docker Compose
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# macOS (using Homebrew)
brew install docker docker-compose

# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

#### 2. Node.js (Version 16+)
```bash
# Using Node Version Manager (Recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

#### 3. Git
```bash
# Ubuntu/Debian
sudo apt-get install git

# macOS
brew install git

# Windows: Download from https://git-scm.com/
```

### Verify Installation
```bash
docker --version          # Should show Docker version
docker-compose --version  # Should show Docker Compose version
node --version            # Should show Node.js v16+
npm --version             # Should show npm version
git --version             # Should show Git version
```

## 🚀 Installation Methods

### Method 1: Automated Setup (Recommended)

#### Step 1: Clone Repository
```bash
git clone <repository-url>
cd supply-chain-pro
```

#### Step 2: Run Enhanced Setup
```bash
./setup-enhanced.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Setup environment configuration
- ✅ Download Hyperledger Fabric binaries
- ✅ Install all Node.js dependencies
- ✅ Start the Fabric network
- ✅ Deploy smart contracts
- ✅ Setup blockchain identities
- ✅ Start all application services
- ✅ Verify the complete setup

### Method 2: Manual Setup

#### Step 1: Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Load environment variables
source ./load-env.sh

# Make scripts executable
chmod +x *.sh
find . -name "*.sh" -exec chmod +x {} \;
```

#### Step 2: Install Dependencies
```bash
# Chaincode dependencies
cd chaincode
npm install
npm run build
cd ..

# Server dependencies
cd web-app/server
npm install
cd ../..

# Client dependencies
cd web-app/client
npm install
cd ../..
```

#### Step 3: Setup Hyperledger Fabric
```bash
# Download Fabric binaries and images
cd network
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.4.7 1.5.2
cd ..

# Start Fabric network
cd network/fabric-network
./network.sh up createChannel -ca -s couchdb
cd ../..
```

#### Step 4: Deploy Smart Contract
```bash
cd network/fabric-network
./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript
cd ../..
```

#### Step 5: Setup Identities
```bash
cd web-app/server
node fabric/setup-identities.js
cd ../..
```

#### Step 6: Start Application Services
```bash
# Start backend
cd web-app/server
npm run start:server
cd ../..

# Start frontend
cd web-app/client
npm run start:client
cd ../..
```

## 🔧 Configuration

### Environment Configuration (.env)
```bash
# Development Configuration (Default)
NODE_ENV=development
TLS_ENABLED=false
DOMAIN=localhost

# Production Configuration
NODE_ENV=production
TLS_ENABLED=true
DOMAIN=yourdomain.com
CERT_PATH=/path/to/cert.pem
KEY_PATH=/path/to/key.pem
```

### Port Configuration
```bash
# Default Ports
SERVER_PORT=3003          # Backend API
PEER0_ORG1_PORT=7051     # Fabric Peer 1
PEER0_ORG2_PORT=9051     # Fabric Peer 2
ORDERER_PORT=7050        # Fabric Orderer

# Frontend runs on port 3000
# CouchDB runs on port 5984
```

## 🔍 Verification Steps

### 1. Check Docker Containers
```bash
docker ps
# Should show containers for:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
# - ca_org1
# - couchdb0
```

### 2. Check Application Services
```bash
# Backend API
curl http://localhost:3003/
# Should return: {"status": "Supply Chain Pro API is running"}

# Frontend
curl http://localhost:3000/
# Should return HTML content

# CouchDB
curl http://admin:adminpw@localhost:5984/
# Should return CouchDB welcome message
```

### 3. Check Blockchain Identities
```bash
ls -la web-app/server/wallet/
# Should show: admin, manager, employee, appUser directories
```

### 4. Test Blockchain Connectivity
```bash
cd web-app/server
node -e "
const network = require('./fabric/network-manager');
network.healthCheck().then(console.log).catch(console.error);
"
# Should return: {"status": "healthy"}
```

## 🛠️ Troubleshooting

### Common Issues

#### Issue 1: TLS Certificate Errors
```
Error: unable to verify the first certificate
```

**Solution:**
```bash
# For development
echo "TLS_ENABLED=false" >> .env
./restart.sh

# For production
# Obtain proper SSL certificates and configure paths in .env
```

#### Issue 2: Docker Permission Denied
```
Error: permission denied while trying to connect to Docker daemon
```

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo ./setup-enhanced.sh
```

#### Issue 3: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find and kill process using the port
lsof -i :3000
kill -9 <PID>

# Or change port in .env
echo "SERVER_PORT=3004" >> .env
```

#### Issue 4: Node.js Version Issues
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Install correct Node.js version
nvm install 18
nvm use 18
node --version  # Should show v18.x.x
```

### Advanced Troubleshooting

#### Reset Everything
```bash
# Complete cleanup and fresh start
./cleanup.sh
./setup-enhanced.sh
```

#### Check Logs
```bash
# View all logs
./logs.sh all

# View specific service logs
./logs.sh fabric    # Blockchain logs
./logs.sh server    # Backend logs
./logs.sh client    # Frontend logs
```

#### Manual Identity Reset
```bash
# Remove existing identities
rm -rf web-app/server/wallet

# Re-setup identities
cd web-app/server
node fabric/setup-identities.js
```

## 🔐 Security Setup

### Development Security
- Default passwords for quick setup
- Relaxed TLS verification
- Debug logging enabled
- CORS configured for localhost

### Production Security
```bash
# Generate secure passwords
JWT_SECRET=$(openssl rand -base64 64)
COUCHDB_PASSWORD=$(openssl rand -base64 32)

# Configure TLS certificates
TLS_ENABLED=true
CERT_PATH=/etc/ssl/certs/server.crt
KEY_PATH=/etc/ssl/private/server.key

# Deploy with security
./scripts/deploy-production.sh
```

## 📊 Performance Tuning

### System Resources
```bash
# Recommended Docker settings
# Memory: 8GB minimum, 16GB recommended
# CPU: 4 cores minimum, 8 cores recommended
# Storage: SSD recommended for better performance
```

### Application Tuning
```bash
# Backend optimization
NODE_OPTIONS="--max-old-space-size=4096"

# Database optimization
# Increase CouchDB memory allocation in docker-compose
```

## 🔄 Maintenance

### Regular Maintenance Tasks
```bash
# Weekly
./scripts/backup.sh                    # Create backup
docker system prune -f                 # Clean Docker
npm audit fix                          # Update dependencies

# Monthly
./scripts/deploy-production.sh         # Update production
# Review and rotate certificates
# Update security configurations
```

### Monitoring Health
```bash
# Check system health
curl http://localhost:3003/health

# Monitor resources
docker stats

# Check logs for errors
./logs.sh all | grep ERROR
```

## 📞 Support

### Self-Help Resources
1. **README.md** - Main project documentation
2. **TROUBLESHOOTING.md** - Detailed troubleshooting guide
3. **TLS_SETUP_GUIDE.md** - TLS configuration guide
4. **PROJECT_DOCUMENTATION.md** - Complete technical documentation

### Getting Help
1. Check the troubleshooting section above
2. Review application logs: `./logs.sh all`
3. Verify Docker containers: `docker ps`
4. Check environment configuration: `cat .env`
5. Contact support with detailed error information

### Reporting Issues
When reporting issues, include:
- Operating system and version
- Node.js and Docker versions
- Complete error messages
- Steps to reproduce the issue
- Environment configuration (remove sensitive data)

---

## 🎉 Success!

If you've followed this guide successfully, you should now have:
- ✅ A running Hyperledger Fabric network
- ✅ Deployed smart contracts
- ✅ A functional web application
- ✅ Real-time blockchain updates
- ✅ Complete supply chain traceability

**Next Steps:**
1. Open http://localhost:3000 in your browser
2. Login with default credentials (admin/admin123)
3. Create your first product
4. Explore the supply chain features

Welcome to the future of supply chain transparency! 🚀