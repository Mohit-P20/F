# TLS Configuration Guide for Supply Chain Pro

This guide explains how to configure TLS (Transport Layer Security) for both development and production environments in the Supply Chain Pro blockchain application.

## 🔧 Development Environment (Default)

For local development, TLS verification is relaxed to avoid certificate issues with self-signed certificates.

### Configuration

Add to your `.env` file:
```bash
# Development TLS Configuration
TLS_ENABLED=false
NODE_ENV=development
```

### What happens in development mode:
- Self-signed certificates are accepted
- TLS verification is relaxed (`NODE_TLS_REJECT_UNAUTHORIZED=0`)
- Connection profile uses localhost endpoints
- CA client accepts untrusted certificates

### Troubleshooting Development TLS Issues

If you encounter TLS errors in development:

1. **Ensure TLS is disabled in .env:**
   ```bash
   TLS_ENABLED=false
   ```

2. **Restart the Fabric network:**
   ```bash
   cd network/fabric-network
   ./network.sh down
   ./network.sh up createChannel -ca -s couchdb
   ```

3. **Re-enroll identities:**
   ```bash
   cd web-app/server
   node fabric/enrollAdmin.js
   node fabric/registerUsers.js
   ```

4. **Manual TLS bypass (if needed):**
   ```bash
   NODE_TLS_REJECT_UNAUTHORIZED=0 node fabric/enrollAdmin.js
   ```

## 🔒 Production Environment

For production, proper TLS configuration is essential for security.

### Prerequisites

1. **Valid SSL Certificates**: Obtain certificates from a trusted CA (Let's Encrypt, commercial CA, etc.)
2. **Domain Name**: Configure proper domain names for all services
3. **Network Security**: Ensure proper firewall and network security

### Configuration Steps

#### 1. Obtain SSL Certificates

**Option A: Let's Encrypt (Recommended for production)**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates for your domain
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Option B: Commercial CA**
- Purchase SSL certificate from a trusted CA
- Follow CA-specific instructions for certificate generation
- Ensure you have both certificate and private key files

**Option C: Self-signed (NOT recommended for production)**
```bash
# Only for testing production configuration
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

#### 2. Configure Environment Variables

Create `.env.production` file:
```bash
# Production Environment
NODE_ENV=production
TLS_ENABLED=true
DOMAIN=yourdomain.com

# TLS Certificate Paths
CERT_PATH=/etc/ssl/certs/server.crt
KEY_PATH=/etc/ssl/private/server.key
CA_PATH=/etc/ssl/certs/ca.crt

# Fabric CA Configuration
FABRIC_CA_ADMIN_PASSWORD=your-secure-password-here

# Security Settings
JWT_SECRET=your-super-secure-jwt-secret-generated-with-openssl-rand-base64-64
COUCHDB_PASSWORD=your-secure-couchdb-password
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Rate Limiting (adjust based on your needs)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 3. Update Fabric Network Configuration

**For production deployment, update the connection profile:**

```json
{
  "certificateAuthorities": {
    "ca.org1.example.com": {
      "url": "https://ca.yourdomain.com:7054",
      "caName": "ca-org1",
      "tlsCACerts": {
        "pem": ["-----BEGIN CERTIFICATE-----\n...your CA cert...\n-----END CERTIFICATE-----"]
      },
      "httpOptions": {
        "verify": true
      }
    }
  }
}
```

#### 4. Configure Nginx for HTTPS

The project includes production-ready Nginx configuration in `nginx/nginx.conf`:

```nginx
# HTTPS server configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # ... rest of configuration
}
```

#### 5. Deploy with Production Configuration

```bash
# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Deploy to production
./scripts/deploy-production.sh
```

## 🔄 Environment Switching

### Development to Production

1. **Update environment file:**
   ```bash
   cp .env.production .env
   ```

2. **Configure certificates:**
   ```bash
   # Place your certificates in the specified paths
   sudo cp your-cert.pem /etc/ssl/certs/server.crt
   sudo cp your-key.pem /etc/ssl/private/server.key
   ```

3. **Restart services:**
   ```bash
   ./cleanup.sh
   ./setup.sh
   ```

### Production to Development

1. **Update environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and set TLS_ENABLED=false
   ```

2. **Restart with development configuration:**
   ```bash
   ./cleanup.sh
   ./setup.sh
   ```

## 🛡️ Security Best Practices

### Development Security
- ✅ Use `TLS_ENABLED=false` for local development
- ✅ Keep development and production environments separate
- ✅ Never commit real certificates to version control
- ✅ Use different passwords for development and production

### Production Security
- ✅ Always use `TLS_ENABLED=true` in production
- ✅ Use certificates from trusted CAs
- ✅ Implement proper certificate rotation
- ✅ Monitor certificate expiration dates
- ✅ Use strong, unique passwords for all services
- ✅ Enable all security headers and rate limiting
- ✅ Regular security audits and updates

## 🔍 Troubleshooting

### Common TLS Issues

#### 1. "Unable to verify the first certificate"
**Cause**: Self-signed certificate in development mode
**Solution**: Set `TLS_ENABLED=false` in development

#### 2. "ECONNREFUSED"
**Cause**: CA server not running
**Solution**: 
```bash
docker ps | grep ca_org1
./network/fabric-network/network.sh up createChannel -ca
```

#### 3. "Certificate has expired"
**Cause**: Expired SSL certificate
**Solution**: Renew certificate and restart services

#### 4. "Hostname/IP does not match certificate's altnames"
**Cause**: Certificate domain mismatch
**Solution**: Ensure certificate matches your domain name

### Debugging Commands

```bash
# Check CA container status
docker logs ca_org1

# Test CA connectivity
curl -k https://localhost:7054/cainfo

# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Verify certificate chain
openssl verify -CAfile ca.pem server.crt

# Test TLS connection
openssl s_client -connect localhost:7054 -servername localhost
```

## 📋 Certificate Management

### Certificate Rotation

For production environments, implement regular certificate rotation:

```bash
#!/bin/bash
# certificate-rotation.sh

# Backup old certificates
cp /etc/ssl/certs/server.crt /etc/ssl/certs/server.crt.backup.$(date +%Y%m%d)

# Install new certificates
cp new-cert.pem /etc/ssl/certs/server.crt
cp new-key.pem /etc/ssl/private/server.key

# Restart services
docker-compose -f docker-compose.prod.yml restart nginx
./restart.sh
```

### Monitoring Certificate Expiration

Add to your monitoring system:

```bash
# Check certificate expiration
openssl x509 -in /etc/ssl/certs/server.crt -noout -dates

# Get days until expiration
openssl x509 -in /etc/ssl/certs/server.crt -noout -checkend 2592000 # 30 days
```

## 🚀 Quick Setup Commands

### Development Setup
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Set development mode
echo "TLS_ENABLED=false" >> .env
echo "NODE_ENV=development" >> .env

# 3. Start the system
./setup.sh
```

### Production Setup
```bash
# 1. Create production environment
cp .env.example .env.production

# 2. Configure for production
echo "TLS_ENABLED=true" >> .env.production
echo "NODE_ENV=production" >> .env.production
echo "DOMAIN=yourdomain.com" >> .env.production

# 3. Add your certificates
sudo cp your-cert.pem /etc/ssl/certs/server.crt
sudo cp your-key.pem /etc/ssl/private/server.key

# 4. Deploy to production
./scripts/deploy-production.sh
```

## 📞 Support

If you encounter TLS-related issues:

1. Check the troubleshooting section above
2. Review the logs: `./logs.sh all`
3. Verify your environment configuration
4. Ensure all certificates are valid and accessible

For additional support, refer to the main README.md or contact the development team.