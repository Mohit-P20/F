#!/bin/bash

# Fabric Network Environment Setup
# This script sets up the environment for the Fabric network specifically

# Set the fabric binaries path
export PATH=${PWD}/../bin:$PATH

# Set fabric configuration path  
export FABRIC_CFG_PATH=${PWD}/configtx

# Set compose project name
export COMPOSE_PROJECT_NAME=fabric

# Set image tag
export IMAGE_TAG=latest
export CA_IMAGETAG=latest

# Verbose mode
export VERBOSE=false

echo "Fabric network environment configured:"
echo "  - PATH includes: ${PWD}/../bin"
echo "  - FABRIC_CFG_PATH: $FABRIC_CFG_PATH"
echo "  - COMPOSE_PROJECT_NAME: $COMPOSE_PROJECT_NAME"
echo "  - IMAGE_TAG: $IMAGE_TAG"