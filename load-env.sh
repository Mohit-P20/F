#!/bin/bash

# Load Environment Script for Supply Chain Pro
# This script loads the environment variables and sets up the PATH

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Loading Supply Chain Pro environment...${NC}"

# Load environment variables
if [ -f .env ]; then
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo "Warning: .env file not found"
fi

# Check if Fabric binaries exist
if [ -d "network/bin" ]; then
    export PATH=${PWD}/network/bin:$PATH
    echo -e "${GREEN}✅ Fabric binaries added to PATH${NC}"
else
    echo "Warning: Fabric binaries not found in network/bin"
fi

# Set Fabric configuration path
export FABRIC_CFG_PATH=${PWD}/network/config
echo -e "${GREEN}✅ Fabric configuration path set${NC}"

# Verify setup
echo ""
echo -e "${BLUE}Environment Setup Complete:${NC}"
echo "  - Fabric binaries: $(which peer 2>/dev/null || echo 'Not found')"
echo "  - Fabric config: $FABRIC_CFG_PATH"
echo "  - Channel name: $CHANNEL_NAME"
echo "  - Chaincode name: $CC_NAME"
echo ""
echo -e "${GREEN}You can now run Fabric commands from anywhere in the project!${NC}"
echo ""
echo "Example commands:"
echo "  peer version"
echo "  configtxgen --help"
echo "  fabric-ca-client version"