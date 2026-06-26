#!/bin/bash

# 🛑 Stop Script for Web3 Anti-Phishing Guardian
# This script stops all running services

set -e

echo "🛑 Stopping Web3 Anti-Phishing Guardian services..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Stop Hardhat node
if [ -f "contract/hardhat-node.pid" ]; then
    PID=$(cat contract/hardhat-node.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null || true
        print_success "Stopped Hardhat node (PID: $PID)"
    fi
    rm contract/hardhat-node.pid
else
    # Try to find and kill any process on port 8545
    PIDS=$(lsof -ti:8545 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        kill $PIDS 2>/dev/null || true
        print_success "Stopped process on port 8545"
    fi
fi

# Stop frontend
if [ -f "frontend/frontend.pid" ]; then
    PID=$(cat frontend/frontend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null || true
        print_success "Stopped frontend (PID: $PID)"
    fi
    rm frontend/frontend.pid
else
    # Try to find and kill any process on port 5173
    PIDS=$(lsof -ti:5173 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        kill $PIDS 2>/dev/null || true
        print_success "Stopped process on port 5173"
    fi
fi

# Clean up log files
if [ -f "contract/hardhat-node.log" ]; then
    rm contract/hardhat-node.log
fi

if [ -f "contract/deploy.log" ]; then
    rm contract/deploy.log
fi

if [ -f "frontend/frontend.log" ]; then
    rm frontend/frontend.log
fi

echo ""
print_success "All services stopped successfully!"
echo ""
print_info "To start again, run: ./START.sh"
