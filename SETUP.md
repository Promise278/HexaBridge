# 🎬 Complete Setup Guide

Step-by-step guide to get the Web3 Anti-Phishing Guardian running on your machine.

---

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Clone and navigate
git clone https://github.com/yourusername/Anti-Phishing.git
cd Anti-Phishing

# 2. Install everything
cd contract && npm install && cd ../frontend && npm install && cd ..

# 3. Start local blockchain
cd contract && npx hardhat node &

# 4. Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# 5. Start frontend
cd ../frontend && npm run dev
```

Visit http://localhost:5173 🎉

---

## 📋 Detailed Setup

### Step 1: System Requirements

Ensure you have the following installed:

```bash
# Check Node.js (v18+ required)
node --version
# Should output: v18.x.x or higher

# Check npm
npm --version
# Should output: 9.x.x or higher

# If not installed:
# Visit https://nodejs.org/ and download LTS version
```

### Step 2: Clone Repository

```bash
# Using HTTPS
git clone https://github.com/yourusername/Anti-Phishing.git

# OR using SSH
git clone git@github.com:yourusername/Anti-Phishing.git

# Navigate to project
cd Anti-Phishing
```

### Step 3: Install Smart Contract Dependencies

```bash
cd contract
npm install
```

**Expected output:**
```
added 500+ packages in 30s
```

**Verify installation:**
```bash
npx hardhat --version
# Should output: 2.x.x
```

### Step 4: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected output:**
```
added 300+ packages in 25s
```

### Step 5: Configure Environment (Optional for local dev)

For local development, you don't need an `.env` file. For testnet/mainnet:

```bash
cd ../contract
cp .env.example .env
# Edit .env with your keys
```

Add to `.env`:
```env
PRIVATE_KEY=your_private_key_without_0x
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### Step 6: Compile Smart Contracts

```bash
cd contract
npx hardhat compile
```

**Expected output:**
```
Compiled 5 Solidity files successfully (evm target: paris).
```

**Verify compiled artifacts:**
```bash
ls artifacts/contracts/
# Should show: AddressReputation.sol  DomainRegistry.sol  GovernanceController.sol  PhishingRegistry.sol  TransactionValidator.sol
```

### Step 7: Run Tests (Recommended)

```bash
npx hardhat test
```

**Expected output:**
```
  AddressReputation
    ✔ Should deploy successfully
    ✔ Should register trusted address
    ... (more tests)

  PhishingRegistry
    ✔ Should deploy successfully
    ... (more tests)

  182 passing (15s)
```

### Step 8: Start Local Blockchain

```bash
# Terminal 1
npx hardhat node
```

**Expected output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========

WARNING: These accounts, and their private keys, are publicly known.
Any funds sent to them on Mainnet or any other live network WILL BE LOST.

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

... (more accounts)
```

**Keep this terminal running!**

### Step 9: Deploy Contracts

Open a new terminal:

```bash
cd contract
npx hardhat run scripts/deploy.js --network localhost
```

**Expected output:**
```
Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000.0 ETH

Deploying AddressReputation...
AddressReputation deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Deploying DomainRegistry...
DomainRegistry deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

Deploying PhishingRegistry...
PhishingRegistry deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Deploying TransactionValidator...
TransactionValidator deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

Deploying GovernanceController...
GovernanceController deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

Deployment info saved to deployments.json
✅ All contracts deployed successfully!
```

### Step 10: Configure Frontend with Contract Addresses

The deployment script automatically updates `deployments.json`. The frontend will read from this file.

**Verify the file:**
```bash
cat deployments.json
```

### Step 11: Start Frontend

```bash
cd ../frontend
npm run dev
```

**Expected output:**
```
  VITE v8.0.3  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 12: Open in Browser

1. Open your browser
2. Navigate to http://localhost:5173
3. You should see the dashboard!

### Step 13: Connect MetaMask (Local Network)

**Add Hardhat Network to MetaMask:**

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter these details:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
4. Click "Save"

**Import a Test Account:**

1. Click account icon → "Import Account"
2. Paste private key from hardhat node output:
   ```
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. You should see 10,000 ETH!

### Step 14: Test the Application

1. Click "Connect Wallet" on the dashboard
2. Approve connection in MetaMask
3. Navigate to "Address Reputation"
4. Try registering a trusted address
5. Check if the transaction succeeds!

---

## 🎯 Verification Steps

### Check if Everything Works

```bash
# 1. Contracts compiled?
cd contract
ls artifacts/contracts/

# 2. Tests passing?
npx hardhat test

# 3. Contracts deployed?
cat deployments.json

# 4. Frontend running?
curl http://localhost:5173
# Should return HTML

# 5. Can interact with contracts?
npx hardhat console --network localhost
```

In Hardhat console:
```javascript
const AddressReputation = await ethers.getContractFactory("AddressReputation");
const contract = await AddressReputation.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
const threshold = await contract.similarityThreshold();
console.log("Similarity threshold:", threshold.toString());
// Should output: Similarity threshold: 80
```

---

## 🔧 Browser Extension Setup

### Install Extension (Development Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Navigate to `Anti-Phishing/extension/` folder
5. Select the folder
6. Extension installed! ✅

### Test Extension

1. Visit any website
2. Open DevTools (F12) → Console
3. You should see: "Web3 Anti-Phishing Guardian active"
4. The extension icon should appear in your toolbar

### Configure Extension

1. Click extension icon
2. You should see the popup interface
3. Enable/disable features as needed

---

## 🐛 Troubleshooting

### Issue: "npm install" fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Issue: "Cannot find module 'hardhat'"

**Solution:**
```bash
# Make sure you're in the contract directory
cd contract

# Reinstall dependencies
npm install

# Try running with npx
npx hardhat compile
```

### Issue: "Port 5173 already in use"

**Solution:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

### Issue: "Cannot connect to local network"

**Solution:**
```bash
# Make sure Hardhat node is running
cd contract
npx hardhat node

# Redeploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Issue: MetaMask shows "Nonce too high"

**Solution:**
1. Open MetaMask
2. Settings → Advanced
3. Click "Clear activity tab data"
4. Reconnect to your site

### Issue: Contracts not found

**Solution:**
```bash
# Recompile contracts
cd contract
npx hardhat clean
npx hardhat compile

# Redeploy
npx hardhat run scripts/deploy.js --network localhost
```

---

## 📚 Next Steps

After successful setup:

1. **Read Documentation**: Check [README.md](README.md) for features
2. **Explore Dashboard**: Navigate through all pages
3. **Test Contract Interactions**: Try all features
4. **Deploy to Testnet**: Follow [DEPLOYMENT.md](DEPLOYMENT.md)
5. **Customize**: Modify contracts and frontend as needed

---

## 🎓 Learning Path

### For Beginners

1. Complete [Hardhat Tutorial](https://hardhat.org/tutorial)
2. Learn [Solidity Basics](https://docs.soliditylang.org/)
3. Understand [React Fundamentals](https://react.dev/)
4. Study [Web3 Development](https://ethereum.org/en/developers/)

### For Intermediate

1. Deep dive into [OpenZeppelin Contracts](https://docs.openzeppelin.com/)
2. Learn [Advanced Solidity](https://github.com/ethereumbook/ethereumbook)
3. Explore [DeFi Security](https://consensys.github.io/smart-contract-best-practices/)
4. Build your own features!

---

## 🛟 Getting Help

### Documentation
- [Main README](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Commands Reference](COMMANDS.md)

### Community
- **Discord**: https://discord.gg/antiphishing
- **GitHub Issues**: https://github.com/yourusername/Anti-Phishing/issues
- **Twitter**: @Web3AntiPhishing

### Support Channels
- Open an issue on GitHub
- Ask in Discord #support channel
- Email: support@antiphishing.xyz

---

## ✅ Setup Checklist

Before proceeding to development:

- [ ] Node.js v18+ installed
- [ ] Repository cloned
- [ ] Contract dependencies installed
- [ ] Frontend dependencies installed
- [ ] Contracts compiled successfully
- [ ] All tests passing
- [ ] Local blockchain running
- [ ] Contracts deployed
- [ ] Frontend running
- [ ] MetaMask configured
- [ ] Browser extension installed (optional)
- [ ] Can interact with contracts

---

## 🎉 Congratulations!

Your development environment is ready! You can now:

- ✅ Develop smart contracts
- ✅ Build frontend features
- ✅ Test locally
- ✅ Deploy to testnets
- ✅ Contribute to the project

**Happy coding! 🚀**

---

Need help? Don't hesitate to reach out to the community!
