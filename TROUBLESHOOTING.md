# Troubleshooting Guide - Supply Chain Pro

This comprehensive guide helps you diagnose and resolve common issues with the Supply Chain Pro blockchain application.

## 🚨 Common Issues and Solutions

### 1. TLS Certificate Verification Errors

#### Error: "unable to verify the first certificate"
```
Failed to enroll admin user "admin": Calling enroll endpoint failed with error [Error: unable to verify the first certificate]
```

**Root Cause**: Self-signed certificates in development environment

**Solutions**:

**Quick Fix (Development)**:
```bash
# 1. Set TLS to false in .env file
echo "TLS_ENABLED=false" >> .env

# 2. Restart the network
cd network/fabric-network
./network.sh down
./network.sh up createChannel -ca -s couchdb
cd ../..

# 3. Re-enroll admin
cd web-app/server
node fabric/enrollAdmin.js
```

**Alternative Fix**:
```bash
# Run with TLS verification disabled
NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/enrollAdmin.js
```

**Production Fix**:
- Obtain proper SSL certificates from a trusted CA
- Configure certificate paths in `.env`
- Set `TLS_ENABLED=true`

### 2. Network Connection Issues

#### Error: "ECONNREFUSED"
```
Error: connect ECONNREFUSED 127.0.0.1:7054
```

**Root Cause**: Fabric CA server not running

**Solutions**:
```bash
# 1. Check if containers are running
docker ps | grep hyperledger

# 2. Check CA container specifically
docker ps | grep ca_org1

# 3. If not running, start the network
cd network/fabric-network
./network.sh up createChannel -ca -s couchdb

# 4. Check CA logs for errors
docker logs ca_org1

# 5. If CA failed to start, clean and restart
./network.sh down
docker system prune -f
./network.sh up createChannel -ca -s couchdb
```

### 3. Identity and Wallet Issues

#### Error: "Identity not found in wallet"
```
Identity "manager" not found in wallet. Available: admin
```

**Root Cause**: User registration not completed

**Solutions**:
```bash
# 1. Check wallet contents
ls -la web-app/server/wallet/

# 2. Re-register users
cd web-app/server
node fabric/registerUsers.js

# 3. If admin is missing, enroll admin first
node fabric/enrollAdmin.js
node fabric/registerUsers.js
```

#### Error: "Admin identity not found"
```
Admin identity not found in wallet. Please run enrollAdmin.js first
```

**Solutions**:
```bash
# 1. Enroll admin user
cd web-app/server
node fabric/enrollAdmin.js

# 2. Verify admin enrollment
ls -la wallet/admin/

# 3. If still failing, check CA server
docker logs ca_org1
```

### 4. Chaincode Deployment Issues

#### Error: "Chaincode installation failed"
```
Error: failed to install chaincode: chaincode install failed with status: 500
```

**Solutions**:
```bash
# 1. Check peer logs
docker logs peer0.org1.example.com

# 2. Rebuild chaincode
cd chaincode
npm install
npm run build

# 3. Redeploy chaincode
cd ../network/fabric-network
./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript

# 4. If still failing, restart network
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn food-supply-chain -ccp ../../chaincode -ccl typescript
```

### 5. Port Conflicts

#### Error: "Port already in use"
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions**:
```bash
# 1. Find what's using the port
lsof -i :3000  # For frontend
lsof -i :3003  # For backend
lsof -i :7050  # For orderer
lsof -i :7051  # For peer

# 2. Kill the process
kill -9 <PID>

# 3. Or use different ports in .env
echo "SERVER_PORT=3004" >> .env
echo "REACT_APP_API_BASE_URL=http://localhost:3004" >> .env

# 4. Restart services
./restart.sh
```

### 6. Docker Issues

#### Error: "Docker daemon not running"
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solutions**:
```bash
# 1. Start Docker service (Linux)
sudo systemctl start docker

# 2. Start Docker Desktop (Windows/Mac)
# Open Docker Desktop application

# 3. Verify Docker is running
docker ps

# 4. Check Docker version
docker --version
```

#### Error: "Permission denied accessing Docker"
```
permission denied while trying to connect to the Docker daemon socket
```

**Solutions**:
```bash
# 1. Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# 2. Or run with sudo (not recommended)
sudo ./setup.sh

# 3. Restart terminal/session after adding to group
```

### 7. Node.js and npm Issues

#### Error: "Module not found"
```
Error: Cannot find module 'fabric-network'
```

**Solutions**:
```bash
# 1. Install dependencies in all directories
cd chaincode && npm install
cd ../web-app/server && npm install
cd ../client && npm install

# 2. Clear npm cache if needed
npm cache clean --force

# 3. Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Error: "Node.js version incompatible"
```
The engine "node" is incompatible with this module
```

**Solutions**:
```bash
# 1. Check Node.js version
node --version

# 2. Install Node.js 16 or higher
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 3. Verify version
node --version
npm --version
```

### 8. Database Connection Issues

#### Error: "CouchDB connection failed"
```
Error: Database connection failed
```

**Solutions**:
```bash
# 1. Check CouchDB container
docker ps | grep couchdb
docker logs couchdb0

# 2. Restart CouchDB
docker restart couchdb0

# 3. Check CouchDB web interface
curl http://admin:adminpw@localhost:5984/

# 4. If container not running, restart network
cd network/fabric-network
./network.sh down
./network.sh up createChannel -ca -s couchdb
```

### 9. Frontend Build Issues

#### Error: "React build failed"
```
Failed to compile. Module build failed
```

**Solutions**:
```bash
# 1. Clear React cache
cd web-app/client
rm -rf node_modules package-lock.json
npm install

# 2. Clear browser cache and restart
npm start

# 3. Check for syntax errors in React components
npm run build

# 4. Update dependencies if needed
npm update
```

### 10. API Connection Issues

#### Error: "API not responding"
```
Network Error: Request failed with status code 500
```

**Solutions**:
```bash
# 1. Check if backend is running
curl http://localhost:3003/

# 2. Check backend logs
cd web-app/server
cat server.log

# 3. Restart backend
npm run stop:server
npm run start:server

# 4. Check environment variables
cat ../../.env
```

## 🔧 Diagnostic Commands

### System Health Check
```bash
# 1. Check all Docker containers
docker ps -a

# 2. Check container health
docker stats

# 3. Check network connectivity
docker network ls
docker network inspect fabric_test

# 4. Check disk space
df -h

# 5. Check memory usage
free -h
```

### Fabric Network Diagnostics
```bash
# 1. Check peer status
docker exec peer0.org1.example.com peer node status

# 2. Check channel information
docker exec cli peer channel list

# 3. Check installed chaincodes
docker exec cli peer lifecycle chaincode queryinstalled

# 4. Check committed chaincodes
docker exec cli peer lifecycle chaincode querycommitted -C mychannel
```

### Application Diagnostics
```bash
# 1. Test API endpoints
curl http://localhost:3003/
curl http://localhost:3003/health

# 2. Check wallet contents
ls -la web-app/server/wallet/

# 3. Test blockchain connectivity
cd web-app/server
node -e "
const api = require('./fabric/network');
api.healthCheck().then(console.log).catch(console.error);
"

# 4. Check environment variables
env | grep -E "(FABRIC|TLS|NODE_ENV)"
```

## 🚀 Performance Optimization

### If the system is running slowly:

1. **Increase Docker resources**:
   - Memory: At least 8GB for development
   - CPU: At least 4 cores
   - Disk: At least 50GB free space

2. **Optimize chaincode**:
   ```bash
   cd chaincode
   npm run build
   # Check for any TypeScript compilation errors
   ```

3. **Database optimization**:
   ```bash
   # Compact CouchDB databases
   curl -X POST http://admin:adminpw@localhost:5984/mychannel/_compact
   ```

4. **Network optimization**:
   ```bash
   # Restart network with fresh state
   ./cleanup.sh
   ./setup.sh
   ```

## 📊 Monitoring and Logging

### Enable detailed logging:
```bash
# Add to .env file
VERBOSE_LOGGING=true
FABRIC_LOGGING_SPEC=DEBUG

# Restart services
./restart.sh
```

### View logs:
```bash
# All logs
./logs.sh all

# Specific service logs
./logs.sh fabric
./logs.sh server
./logs.sh client

# Docker container logs
docker logs ca_org1
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

### Monitor system resources:
```bash
# Real-time container stats
docker stats

# System resource usage
htop

# Disk usage
du -sh network/
du -sh web-app/
```

## 🆘 Emergency Recovery

### Complete System Reset
```bash
# 1. Stop everything
./stop.sh

# 2. Clean up completely
./cleanup.sh

# 3. Remove Docker volumes (WARNING: This deletes all data)
docker volume prune -f

# 4. Fresh setup
./setup.sh
```

### Backup and Restore
```bash
# Create backup before troubleshooting
./scripts/backup.sh

# If something goes wrong, restore
./scripts/restore.sh ./backups/supply_chain_backup_YYYYMMDD_HHMMSS.tar.gz
```

## 📞 Getting Help

### Before asking for help, collect this information:

1. **System Information**:
   ```bash
   echo "OS: $(uname -a)"
   echo "Node.js: $(node --version)"
   echo "npm: $(npm --version)"
   echo "Docker: $(docker --version)"
   echo "Docker Compose: $(docker-compose --version)"
   ```

2. **Environment Configuration**:
   ```bash
   cat .env | grep -v PASSWORD | grep -v SECRET
   ```

3. **Container Status**:
   ```bash
   docker ps -a
   ```

4. **Recent Logs**:
   ```bash
   ./logs.sh all | tail -100
   ```

5. **Error Messages**: Copy the complete error message and stack trace

### Support Channels
- Check the main README.md for detailed setup instructions
- Review the TLS_SETUP_GUIDE.md for TLS-specific issues
- Check the project's issue tracker
- Contact the development team with the collected information above

## 🔄 Regular Maintenance

### Weekly Tasks
- Check certificate expiration dates
- Review system logs for errors
- Update dependencies if needed
- Create system backups

### Monthly Tasks
- Security audit and updates
- Performance optimization review
- Certificate rotation (if needed)
- System cleanup and optimization

### Before Production Deployment
- Complete security review
- Load testing
- Backup and recovery testing
- Certificate validation
- Network security assessment