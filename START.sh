#!/bin/bash

# 🚀 Quick Start Script for Web3 Anti-Phishing Guardian
# This script starts everything you need for local development

set -e

echo "🛡️  Web3 Anti-Phishing Guardian - Quick Start"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

print_success "Node.js found: $(node --version)"

# Check if we're in the right directory
if [ ! -d "contract" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the Anti-Phishing root directory"
    exit 1
fi

# Function to check if dependencies are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if [ ! -d "contract/node_modules" ]; then
        print_warning "Contract dependencies not installed. Installing..."
        cd contract
        npm install
        cd ..
        print_success "Contract dependencies installed"
    else
        print_success "Contract dependencies found"
    fi
    
    if [ ! -d "frontend/node_modules" ]; then
        print_warning "Frontend dependencies not installed. Installing..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies found"
    fi
}

# Function to compile contracts
compile_contracts() {
    print_info "Compiling smart contracts..."
    cd contract
    npx hardhat compile > /dev/null 2>&1
    cd ..
    print_success "Contracts compiled"
}

# Function to run tests
run_tests() {
    print_info "Running tests... (this may take a minute)"
    cd contract
    if npx hardhat test > /dev/null 2>&1; then
        print_success "All tests passed ✓"
    else
        print_warning "Some tests failed, but continuing..."
    fi
    cd ..
}

# Function to start Hardhat node in background
start_hardhat_node() {
    print_info "Starting local blockchain..."
    cd contract
    
    # Check if Hardhat node is already running
    if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_warning "Port 8545 already in use. Skipping Hardhat node start."
        cd ..
        return
    fi
    
    # Start Hardhat node in background
    npx hardhat node > hardhat-node.log 2>&1 &
    HARDHAT_PID=$!
    echo $HARDHAT_PID > hardhat-node.pid
    
    # Wait for node to start
    sleep 3
    
    if ps -p $HARDHAT_PID > /dev/null 2>&1; then
        print_success "Local blockchain started (PID: $HARDHAT_PID)"
    else
        print_error "Failed to start Hardhat node"
        cat hardhat-node.log
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to deploy contracts
deploy_contracts() {
    print_info "Deploying smart contracts..."
    cd contract
    
    if npx hardhat run scripts/deploy.js --network localhost > deploy.log 2>&1; then
        print_success "Contracts deployed successfully"
        
        # Show deployed addresses
        if [ -f "deployments.json" ]; then
            print_info "Contract addresses:"
            cat deployments.json | grep -A 5 '"contracts"' | grep -v "contracts\|{" | sed 's/,$//'
        fi
    else
        print_error "Contract deployment failed"
        cat deploy.log
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to start frontend
start_frontend() {
    print_info "Starting frontend dashboard..."
    cd frontend
    
    # Check if port 5173 is in use
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_warning "Port 5173 already in use. Frontend may already be running."
    else
        npm run dev > frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > frontend.pid
        
        # Wait for frontend to start
        sleep 3
        
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_success "Frontend started (PID: $FRONTEND_PID)"
        else
            print_error "Failed to start frontend"
            cat frontend.log
            cd ..
            exit 1
        fi
    fi
    
    cd ..
}

# Function to show final instructions
show_instructions() {
    echo ""
    echo "=============================================="
    print_success "🎉 Everything is ready!"
    echo "=============================================="
    echo ""
    echo "📍 Services running:"
    echo "   • Blockchain: http://localhost:8545"
    echo "   • Frontend:   http://localhost:5173"
    echo ""
    echo "🔗 Next steps:"
    echo "   1. Open http://localhost:5173 in your browser"
    echo "   2. Connect MetaMask to 'Hardhat Local' network"
    echo "      - Network Name: Hardhat Local"
    echo "      - RPC URL: http://127.0.0.1:8545"
    echo "      - Chain ID: 31337"
    echo "      - Currency: ETH"
    echo "   3. Import a test account using private key:"
    echo "      0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo "   4. Start testing the application!"
    echo ""
    echo "📚 Documentation:"
    echo "   • README.md - Project overview"
    echo "   • SETUP.md - Detailed setup guide"
    echo "   • COMMANDS.md - Command reference"
    echo ""
    echo "🛑 To stop all services, run:"
    echo "   ./STOP.sh"
    echo ""
}

# Main execution
main() {
    echo "Starting setup process..."
    echo ""
    
    # Run all steps
    check_dependencies
    compile_contracts
    
    # Ask if user wants to run tests
    read -p "Run tests? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        run_tests
    fi
    
    start_hardhat_node
    sleep 2
    deploy_contracts
    start_frontend
    
    show_instructions
}

# Cleanup function
cleanup() {
    print_warning "Cleaning up..."
    
    # Stop Hardhat node
    if [ -f "contract/hardhat-node.pid" ]; then
        kill $(cat contract/hardhat-node.pid) 2>/dev/null || true
        rm contract/hardhat-node.pid
    fi
    
    # Stop frontend
    if [ -f "frontend/frontend.pid" ]; then
        kill $(cat frontend/frontend.pid) 2>/dev/null || true
        rm frontend/frontend.pid
    fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Run main function
main
