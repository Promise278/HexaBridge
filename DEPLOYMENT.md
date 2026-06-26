# 🚀 Deployment Guide

Complete guide for deploying the Web3 Anti-Phishing Guardian smart contracts and frontend.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Node.js v18+ installed
- [ ] MetaMask wallet with funds
- [ ] Infura or Alchemy API key
- [ ] Etherscan API key (for verification)
- [ ] Private key exported from MetaMask

---

## 🔧 Environment Setup

### 1. Configure Environment Variables

Create `.env` file in `contract/` directory:

```bash
cd contract
touch .env
```

Add the following variables:

```env
# Wallet Private Key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key

# Block Explorers
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional: For testnets
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
GOERLI_RPC_URL=https://goerli.infura.io/v3/YOUR_INFURA_KEY

# Mainnet
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

### 2. Get Your Private Key

**⚠️ SECURITY WARNING: Never share or commit your private key!**

From MetaMask:
1. Click on the three dots → Account Details
2. Click "Export Private Key"
3. Enter your password
4. Copy the private key (without 0x)

### 3. Get API Keys

**Infura:**
1. Visit [infura.io](https://infura.io)
2. Create account and project
3. Copy API Key from project settings

**Etherscan:**
1. Visit [etherscan.io](https://etherscan.io)
2. Sign up for an account
3. Go to API Keys → Create API Key
4. Copy the key

---

## 🏗️ Smart Contract Deployment

### Step 1: Install Dependencies

```bash
cd contract
npm install
```

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 5 Solidity files successfully
```

### Step 3: Run Tests

```bash
npx hardhat test
```

All tests should pass ✅

### Step 4: Deploy to Local Network (Testing)

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

### Step 5: Deploy to Testnet (Sepolia Recommended)

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Output Example:**
```
Deploying contracts with account: 0xYourAddress
Account balance: 1.5 ETH

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

✅ Deployment complete!
```

### Step 6: Verify Contracts on Etherscan

```bash
# Verify AddressReputation
npx hardhat verify --network sepolia 0x5FbDB2315678afecb367f032d93F642f64180aa3

# Verify PhishingRegistry
npx hardhat verify --network sepolia 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# Verify DomainRegistry
npx hardhat verify --network sepolia 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Verify TransactionValidator
npx hardhat verify --network sepolia 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# Verify GovernanceController
npx hardhat verify --network sepolia 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

### Step 7: Deploy to Mainnet ⚠️

**ONLY deploy to mainnet after thorough testing!**

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

Then verify all contracts as shown in Step 6.

---

## 🌐 Frontend Deployment

### Step 1: Update Contract Addresses

Edit `frontend/app/utils/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  AddressReputation: '0xYourDeployedAddress',
  PhishingRegistry: '0xYourDeployedAddress',
  DomainRegistry: '0xYourDeployedAddress',
  GovernanceController: '0xYourDeployedAddress',
  TransactionValidator: '0xYourDeployedAddress',
};
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 3: Build Frontend

```bash
npm run build
```

### Step 4: Test Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

### Step 5: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Alternative: Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Alternative: Deploy to IPFS

```bash
# Install IPFS Desktop or use Pinata

# Build
npm run build

# Upload dist folder to IPFS
# Via Pinata: https://pinata.cloud
# Via Fleek: https://fleek.co
```

---

## 🔐 Post-Deployment Security

### 1. Grant Roles

After deployment, grant necessary roles:

```javascript
// Connect to contracts and grant roles
const addressReputation = await ethers.getContractAt("AddressReputation", ADDRESS);

// Grant SCORER_ROLE to trusted addresses
await addressReputation.grantRole(
  await addressReputation.SCORER_ROLE(),
  "0xTrustedScorerAddress"
);

// Grant VALIDATOR_ROLE to validators
const phishingRegistry = await ethers.getContractAt("PhishingRegistry", ADDRESS);
await phishingRegistry.grantRole(
  await phishingRegistry.VALIDATOR_ROLE(),
  "0xValidatorAddress"
);

// Grant REPORTER_ROLE
await phishingRegistry.grantRole(
  await phishingRegistry.REPORTER_ROLE(),
  "0xReporterAddress"
);
```

### 2. Transfer Admin Role (Optional)

For production, consider using a multisig wallet:

```javascript
// Transfer admin to multisig
const MULTISIG_ADDRESS = "0xYourMultisigAddress";

await contract.grantRole(
  await contract.DEFAULT_ADMIN_ROLE(),
  MULTISIG_ADDRESS
);

// Renounce your admin role
await contract.renounceRole(
  await contract.DEFAULT_ADMIN_ROLE(),
  deployerAddress
);
```

### 3. Set Initial Parameters

```javascript
// Set similarity threshold
await addressReputation.setSimilarityThreshold(80);

// Set confirmations required
await phishingRegistry.setConfirmationsRequired(2);
await phishingRegistry.setDismissalsRequired(2);
```

---

## 📊 Monitoring & Maintenance

### 1. Monitor Contract Events

Set up event listeners:

```javascript
addressReputation.on("PoisoningDetected", (target, similarTo, similarity) => {
  console.log(`🚨 Poisoning detected: ${target} similar to ${similarTo}`);
});

phishingRegistry.on("PhishingReported", (reportId, reporter, target) => {
  console.log(`📝 New phishing report #${reportId} for ${target}`);
});
```

### 2. Set Up Alerts

Use services like:
- **Tenderly** for transaction monitoring
- **Defender** (OpenZeppelin) for automated operations
- **The Graph** for indexing events

### 3. Regular Security Audits

- Review reported addresses weekly
- Update threat intelligence
- Monitor gas costs
- Check for unusual activity

---

## 🧪 Testing Deployments

### Test Contract Interactions

```bash
# Run interaction script
npx hardhat run scripts/test-deployment.js --network sepolia
```

Create `scripts/test-deployment.js`:

```javascript
async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Test AddressReputation
  const addressReputation = await ethers.getContractAt(
    "AddressReputation",
    "0xYourDeployedAddress"
  );
  
  // Register a test address
  const tx = await addressReputation.registerTrustedAddress(
    deployer.address,
    "Test Wallet"
  );
  await tx.wait();
  
  console.log("✅ Test successful!");
  
  // Get trusted addresses
  const addresses = await addressReputation.getTrustedAddresses();
  console.log("Trusted addresses:", addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## 💰 Cost Estimates

### Gas Costs (Sepolia/Mainnet)

| Contract | Deployment Gas | Estimated Cost (50 gwei) |
|----------|---------------|--------------------------|
| AddressReputation | ~2,500,000 | ~$15-30 |
| PhishingRegistry | ~2,800,000 | ~$18-35 |
| DomainRegistry | ~2,400,000 | ~$14-28 |
| TransactionValidator | ~2,000,000 | ~$12-24 |
| GovernanceController | ~2,600,000 | ~$16-32 |
| **Total** | **~12,300,000** | **~$75-150** |

*Costs vary with gas prices. Use [ETH Gas Station](https://ethgasstation.info/) to monitor*

### Monthly Hosting Costs

- **Vercel**: Free tier (personal projects)
- **Netlify**: Free tier (100GB bandwidth)
- **IPFS**: ~$20/month (Pinata Pro)
- **The Graph**: Free tier available

---

## 🐛 Troubleshooting

### "Insufficient funds for gas"
- Ensure you have enough ETH for deployment
- Check current gas prices
- Consider deploying during low-traffic times

### "Contract verification failed"
- Ensure compiler settings match exactly
- Check constructor arguments
- Wait a few minutes and retry

### "Transaction underpriced"
- Increase gas price in hardhat.config.js
- Or wait for network congestion to decrease

### Frontend not connecting to contracts
- Verify contract addresses in contracts.ts
- Check MetaMask is on correct network
- Open browser console for errors

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Etherscan API Docs](https://docs.etherscan.io/)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

## ✅ Deployment Checklist

Before going to production:

- [ ] All tests passing
- [ ] Contracts verified on Etherscan
- [ ] Roles granted to appropriate addresses
- [ ] Initial parameters configured
- [ ] Frontend deployed and tested
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Security audit completed (for mainnet)
- [ ] Backup private keys securely
- [ ] Multisig setup (recommended)

---

## 🆘 Emergency Procedures

### If Contract Has Critical Bug

1. Pause all contracts immediately:
```bash
npx hardhat run scripts/emergency-pause.js --network mainnet
```

2. Notify users via all channels
3. Deploy fixed contracts
4. Migrate data if possible
5. Resume operations

### If Private Key Compromised

1. Transfer all funds immediately
2. Deploy new contracts with new address
3. Update frontend
4. Notify community

---

Need help? Join our [Discord](https://discord.gg/antiphishing) for support!
