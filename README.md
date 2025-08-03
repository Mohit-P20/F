# Supply Chain Pro - Blockchain Supply Chain Management

![Supply Chain Pro](https://alexandrebarros.com/global/hyperledger/hero_image.jpg?alt=hyperledger-supply-chain)

**Supply Chain Pro** is a next-generation blockchain-powered supply chain management system built on Hyperledger Fabric. It provides complete transparency, traceability, and security for products throughout their entire journey from origin to consumer.

## 🌟 Key Features

- **🔗 Blockchain Transparency**: Immutable record of every product's journey
- **📱 Real-time Tracking**: Live updates on product location and status
- **🔐 Secure Authentication**: Role-based access control with JWT tokens
- **📊 Advanced Analytics**: Comprehensive insights and performance metrics
- **🏭 Quality Assurance**: Built-in quality inspection and certification tracking
- **⚡ Real-time Updates**: WebSocket-powered live notifications
- **🌐 Modern UI**: Responsive React interface with beautiful animations
- **🔄 API-First Design**: RESTful APIs for easy integration

## 🚀 Quick Start

### One-Command Setup
```bash
git clone <repository-url>
cd supply-chain-pro
./quick-start.sh
```

### Access Your Application
- **🌐 Frontend**: http://localhost:3000
- **🔧 Backend API**: http://localhost:3003
- **📊 Database**: http://localhost:5984/_utils

### Default Credentials
| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | admin123 | Administrator | Full access |
| manager | manager123 | Manager | Create, update, ship, quality |
| employee | employee123 | Employee | Read, ship |
| client | client123 | Client | Read only |

## 📋 Prerequisites

- **Docker** (latest version)
- **Docker Compose** (latest version)
- **Node.js** (version 16 or higher)
- **npm** (latest version)
- **8GB RAM** minimum (16GB recommended)
- **20GB free disk space**

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Node.js API   │    │ Hyperledger     │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│ Fabric Network  │
│   Port: 3000    │    │   Port: 3003    │    │ (Blockchain)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                               ┌─────────────────┐
                                               │   CouchDB       │
                                               │   (Database)    │
                                               │   Port: 5984    │
                                               └─────────────────┘
```

## 📱 Using the Application

### 1. Dashboard Overview
- **Real-time Statistics**: Live metrics and KPIs
- **Activity Feed**: Recent blockchain transactions
- **Quick Actions**: Fast access to common operations
- **System Status**: Network health and connectivity

### 2. Product Management
- **Create Products**: Add new products to the blockchain
- **Track Products**: Search and trace product journey
- **Ship Products**: Update product location and status
- **View History**: Complete supply chain timeline

### 3. Quality Assurance
- **Add Inspections**: Record quality checks and certifications
- **View Records**: Access complete quality history
- **Score Tracking**: Monitor quality trends over time
- **Compliance**: Track regulatory compliance

### 4. Analytics & Reporting
- **Performance Metrics**: Delivery times, quality scores
- **Geographic Distribution**: Product location analytics
- **Category Analysis**: Product type breakdowns
- **Trend Analysis**: Historical performance data

## 🔧 Management Commands

### Service Management
```bash
./stop.sh              # Stop all services
./restart.sh           # Restart all services
./logs.sh all          # View all logs
./cleanup.sh           # Complete cleanup
```

### Data Management
```bash
./scripts/backup.sh                    # Create backup
./scripts/restore.sh <backup_file>     # Restore from backup
```

### Development
```bash
# Setup identities only
cd web-app/server && npm run setup:identities

# Restart just the network
cd network/fabric-network && ./network.sh restart

# View specific logs
./logs.sh fabric       # Blockchain logs
./logs.sh server       # Backend logs
./logs.sh client       # Frontend logs
```

## 🔐 Security Features

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** with granular permissions
- **Account lockout** protection against brute force attacks
- **Session management** with automatic token refresh

### Network Security
- **TLS/SSL encryption** for all communications
- **Certificate validation** in production environments
- **Rate limiting** to prevent API abuse
- **CORS protection** for cross-origin requests

### Data Protection
- **Input validation** and sanitization
- **SQL injection** prevention
- **XSS protection** with security headers
- **Audit logging** for all transactions

## 📊 Performance Features

### Backend Optimizations
- **Connection pooling** for database connections
- **Circuit breaker pattern** for network resilience
- **Caching strategies** for frequently accessed data
- **Async processing** for better concurrency

### Frontend Optimizations
- **Code splitting** for faster load times
- **Lazy loading** of components
- **Memoization** of expensive calculations
- **Optimized re-renders** with React best practices

## 🌐 API Documentation

### Authentication
```bash
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

### Product Operations
```bash
# Create product
POST /createProduct
Authorization: Bearer <token>

# Get product
GET /getProduct?id=<product-id>

# Ship product
POST /shipProduct
Authorization: Bearer <token>
```

### Quality Assurance
```bash
# Add quality record
POST /addQualityRecord
Authorization: Bearer <token>

# Get quality records
GET /getQualityRecords?productId=<product-id>
```

## 🚀 Deployment Options

### Development
```bash
./setup-enhanced.sh     # Local development setup
```

### Production
```bash
./scripts/deploy-production.sh    # Production deployment with monitoring
```

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Documentation

- **[Setup Guide](SETUP_GUIDE.md)** - Detailed installation instructions
- **[Project Documentation](PROJECT_DOCUMENTATION.md)** - Technical architecture
- **[TLS Setup Guide](TLS_SETUP_GUIDE.md)** - TLS configuration
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Analysis Report](ANALYSIS.md)** - Project analysis and recommendations

## 🔄 Recent Improvements (v2.0)

### ✅ Major Enhancements
- **Unified Chaincode**: Combined duplicate chaincode files into single contract
- **Enhanced Identity Management**: Robust user enrollment with better error handling
- **Improved Network Management**: Connection pooling and circuit breaker pattern
- **Performance Optimizations**: Faster response times and better resource usage
- **Better Error Handling**: User-friendly error messages and detailed logging
- **Enhanced Security**: Improved authentication and input validation
- **Complete Documentation**: Comprehensive guides and troubleshooting

### 🐛 Bug Fixes
- **TLS Certificate Issues**: Fixed development mode TLS verification
- **Identity Enrollment**: Resolved user registration errors
- **Network Connectivity**: Improved connection reliability
- **Memory Leaks**: Fixed potential memory issues
- **Error Handling**: Better error messages and recovery

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Submit a pull request

### Code Standards
- **TypeScript** for chaincode development
- **ESLint** for JavaScript code quality
- **Prettier** for code formatting
- **Jest** for testing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

| Name | GitHub | LinkedIn |
|------|--------|----------|
| Alexandre Rapchan B. Barros | [@AleRapchan](https://github.com/AleRapchan) | [Alexandre-rapchan](https://linkedin.com/in/alexandre-rapchan/) |
| Enhanced by System Analysis | - | - |

## 🆘 Support

### Quick Help
- **Setup Issues**: Run `./quick-start.sh` for automated setup
- **TLS Errors**: Set `TLS_ENABLED=false` in `.env` for development
- **Identity Issues**: Run `cd web-app/server && npm run setup:identities`
- **Network Issues**: Run `./restart.sh` to restart all services

### Detailed Support
For detailed support, check:
1. [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete setup instructions
2. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
3. [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - Technical details

### Contact
- **Email**: blockchain@alexandrebarros.com
- **Issues**: Create an issue in the repository
- **Discussions**: Use GitHub Discussions for questions

---

## 🔗 Useful Links

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [React Documentation](https://reactjs.org/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [Docker Documentation](https://docs.docker.com/)

---

**Supply Chain Pro** - Bringing transparency, trust, and efficiency to global supply chains through blockchain technology. 🌍✨