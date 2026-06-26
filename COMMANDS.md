# 🎯 Quick Command Reference

All essential commands for the Web3 Anti-Phishing Guardian project.

---

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/yourusername/Anti-Phishing.git
cd Anti-Phishing

# Install contract dependencies
cd contract && npm install

# Install frontend dependencies  
cd ../frontend && npm install

# Install extension dependencies (if any)
cd ../extension && npm install
```

---

## 🔨 Smart Contract Commands

### Compilation
```bash
cd contract

# Compile all contracts
npx hardhat compile

# Clean and recompile
npx hardhat clean && npx hardhat compile
```

### Testing
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/AddressReputation.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Generate coverage report
npx hardhat coverage
```

### Local Development
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Run console
npx hardhat console --network localhost
```

### Deployment
```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Goerli testnet
npx hardhat run scripts/deploy.js --network goerli

# Deploy to Mainnet (⚠️ use caution)
npx hardhat run scripts/deploy.js --network mainnet
```

### Verification
```bash
# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Verify with constructor arguments
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> "constructor_arg1" "constructor_arg2"

# Verify all contracts (custom script)
npx hardhat run scripts/verify-all.js --network sepolia
```

### Contract Interaction
```bash
# Open Hardhat console
npx hardhat console --network sepolia

# Run interaction script
npx hardhat run scripts/interact.js --network sepolia
```

---

## 🌐 Frontend Commands

### Development
```bash
cd frontend

# Start development server
npm run dev

# Start with specific port
npm run dev -- --port 3000

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck
```

### Deployment
```bash
# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Build and deploy
npm run build && vercel --prod
```

---

## 🧩 Browser Extension Commands

### Development
```bash
cd extension

# No build needed for development
# Just load unpacked in Chrome

# Reload extension after changes
# Go to chrome://extensions/
# Click reload button on your extension
```

### Testing
```bash
# Test on local websites
# Extension automatically activates on all sites

# Check background service worker
# Go to chrome://extensions/
# Click "service worker" under your extension
```

### Production Build
```bash
# Zip extension for Chrome Web Store
zip -r extension.zip extension/ -x "*.git*" -x "*node_modules*"

# Or use build script if you have one
npm run build
```

---

## 🔍 Debugging Commands

### Contract Debugging
```bash
# Check contract size
npx hardhat size-contracts

# Generate Slither analysis
slither .

# Run Mythril security analysis
myth analyze contracts/AddressReputation.sol

# Debug specific transaction
npx hardhat run scripts/debug-tx.js --network sepolia
```

### Frontend Debugging
```bash
# Check for TypeScript errors
npm run typecheck

# Lint files
npm run lint

# Fix linting issues
npm run lint:fix
```

---

## 📊 Monitoring Commands

### Contract Events
```bash
# Listen to contract events (custom script)
npx hardhat run scripts/listen-events.js --network sepolia

# Query past events
npx hardhat run scripts/query-events.js --network sepolia
```

### Network Info
```bash
# Check account balance
npx hardhat run scripts/check-balance.js --network sepolia

# Get network info
npx hardhat run scripts/network-info.js --network sepolia

# Estimate gas for deployment
npx hardhat run scripts/estimate-gas.js
```

---

## 🛠️ Utility Commands

### Generate Documentation
```bash
# Generate Solidity docs
npx hardhat docgen

# Generate API docs from contracts
npx solidity-docgen --solc-module solc
```

### Code Formatting
```bash
# Format Solidity files
npx prettier --write 'contracts/**/*.sol'

# Format JavaScript/TypeScript
npx prettier --write 'scripts/**/*.js'
npx prettier --write 'frontend/app/**/*.{ts,tsx}'
```

### Security
```bash
# Run Slither
slither .

# Run Mythril
myth analyze contracts/**/*.sol

# Check for common vulnerabilities
npx hardhat check
```

---

## 🔐 Wallet & Account Management

### Get Account Info
```bash
# In Hardhat console
npx hardhat console --network sepolia

# Then:
> const [deployer] = await ethers.getSigners();
> console.log("Deployer:", deployer.address);
> const balance = await ethers.provider.getBalance(deployer.address);
> console.log("Balance:", ethers.formatEther(balance), "ETH");
```

### Generate New Wallet
```bash
# In Node.js or Hardhat console
> const wallet = ethers.Wallet.createRandom();
> console.log("Address:", wallet.address);
> console.log("Private Key:", wallet.privateKey);
> console.log("Mnemonic:", wallet.mnemonic.phrase);
```

---

## 📈 Performance

### Gas Optimization
```bash
# Report gas usage
REPORT_GAS=true npx hardhat test

# Check contract size
npx hardhat size-contracts

# Run optimizer
# Edit hardhat.config.js:
# optimizer: { enabled: true, runs: 200 }
```

### Build Optimization
```bash
# Frontend production build
cd frontend
npm run build

# Analyze bundle size
npm run build -- --analyze

# Check bundle
npx vite-bundle-visualizer
```

---

## 🧪 Testing Scenarios

### Test Complete Workflow
```bash
# 1. Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 2. Register trusted address
npx hardhat run scripts/examples/register-address.js --network localhost

# 3. Report phishing
npx hardhat run scripts/examples/report-phishing.js --network localhost

# 4. Confirm report
npx hardhat run scripts/examples/confirm-report.js --network localhost

# 5. Check address
npx hardhat run scripts/examples/check-address.js --network localhost
```

---

## 🔄 Update & Upgrade

### Update Dependencies
```bash
# Update npm packages
npm update

# Update to latest
npm install package-name@latest

# Check for outdated packages
npm outdated

# Interactive upgrade
npx npm-check-updates -u
npm install
```

### Upgrade Contracts (if using upgradeable pattern)
```bash
# Deploy new implementation
npx hardhat run scripts/upgrade.js --network sepolia

# Verify upgrade
npx hardhat verify --network sepolia <NEW_IMPLEMENTATION_ADDRESS>
```

---

## 📝 Git Commands

```bash
# Initialize git (if not done)
git init

# Add files
git add .

# Commit
git commit -m "feat: add anti-phishing contracts and frontend"

# Push to GitHub
git remote add origin https://github.com/yourusername/Anti-Phishing.git
git branch -M main
git push -u origin main

# Create new branch
git checkout -b feature/new-feature

# Merge branch
git checkout main
git merge feature/new-feature
```

---

## 🚀 One-Command Deployment

### Deploy Everything
```bash
# Create this script: scripts/deploy-all.sh

#!/bin/bash
echo "🚀 Starting full deployment..."

# Deploy contracts
cd contract
npx hardhat run scripts/deploy.js --network sepolia
cd ..

# Build frontend
cd frontend
npm run build
vercel --prod
cd ..

echo "✅ Deployment complete!"
```

### Run it:
```bash
chmod +x scripts/deploy-all.sh
./scripts/deploy-all.sh
```

---

## 📞 Help & Support

### Get Help
```bash
# Hardhat help
npx hardhat help

# Specific command help
npx hardhat help compile
npx hardhat help test
npx hardhat help verify

# List all tasks
npx hardhat
```

### Common Issues
```bash
# Clear cache
npx hardhat clean

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset Hardhat network
npx hardhat node --reset

# Check Node/npm versions
node --version
npm --version
```

---

## 💡 Quick Tips

### Bash Aliases (Add to ~/.bashrc or ~/.zshrc)
```bash
# Hardhat aliases
alias hh="npx hardhat"
alias hhc="npx hardhat compile"
alias hht="npx hardhat test"
alias hhn="npx hardhat node"
alias hhd="npx hardhat run scripts/deploy.js"

# Frontend aliases
alias dev="cd frontend && npm run dev"
alias build="cd frontend && npm run build"

# Quick deploy
alias deploy-local="hh run scripts/deploy.js --network localhost"
alias deploy-sepolia="hh run scripts/deploy.js --network sepolia"
```

### Environment Quick Switch
```bash
# Add to .bashrc/.zshrc
function use-testnet() {
  export NETWORK=sepolia
  echo "✅ Using Sepolia testnet"
}

function use-mainnet() {
  export NETWORK=mainnet
  echo "⚠️  Using Mainnet"
}

function use-local() {
  export NETWORK=localhost
  echo "🏠 Using local network"
}
```

---

## 🎓 Learning Resources

### Official Docs
- Hardhat: https://hardhat.org/docs
- Ethers.js: https://docs.ethers.org
- OpenZeppelin: https://docs.openzeppelin.com
- React Router: https://reactrouter.com

### Tutorials
```bash
# Follow Hardhat tutorial
npx hardhat

# OpenZeppelin tutorials
https://docs.openzeppelin.com/learn/

# Solidity by Example
https://solidity-by-example.org/
```

---

Need more help? Check [DEPLOYMENT.md](DEPLOYMENT.md) or join our [Discord](https://discord.gg/antiphishing)!
