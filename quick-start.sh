#!/bin/bash

# Quick Start Script for Supply Chain Pro
# This script provides the fastest way to get the system running

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}                    SUPPLY CHAIN PRO - QUICK START                    ${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick prerequisite check
echo -e "${BLUE}🔍 Quick prerequisite check...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js not found. Please install Node.js 16+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${NC}"

# Setup environment
echo -e "${BLUE}⚙️  Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Ensure development mode
sed -i 's/TLS_ENABLED=true/TLS_ENABLED=false/' .env 2>/dev/null || \
sed -i.bak 's/TLS_ENABLED=true/TLS_ENABLED=false/' .env

# Load environment
source .env

# Make scripts executable
chmod +x *.sh

echo -e "${BLUE}🚀 Starting quick setup (this will take 5-10 minutes)...${NC}"

# Run the enhanced setup
if ./setup-enhanced.sh; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}                    🎉 QUICK START COMPLETED! 🎉                     ${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}🌐 Open your browser and go to: http://localhost:3000${NC}"
    echo -e "${GREEN}🔐 Login with: admin / admin123${NC}"
    echo ""
    echo -e "${BLUE}📚 For more information, see:${NC}"
    echo "   - README.md (main documentation)"
    echo "   - SETUP_GUIDE.md (detailed setup guide)"
    echo "   - PROJECT_DOCUMENTATION.md (technical docs)"
    echo ""
else
    echo -e "${YELLOW}❌ Quick start failed. Please check the error messages above.${NC}"
    echo -e "${BLUE}💡 Try the manual setup guide in SETUP_GUIDE.md${NC}"
    exit 1
fi