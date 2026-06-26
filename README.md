# 🛡️ Web3 Anti-Phishing Guardian

A comprehensive decentralized anti-phishing platform that protects Web3 users from phishing attacks, address poisoning, malicious transactions, and fraudulent dApps.

## 🌟 Features

### 1. **Address Reputation System**
- Register and manage trusted wallet addresses
- Real-time address poisoning detection
- Similarity scoring algorithm (detects lookalike addresses)
- Risk scoring for suspicious addresses
- Batch address validation

### 2. **Phishing Registry**
- Community-driven threat reporting system
- Multi-validator confirmation mechanism
- Threat level classification (Low, Medium, High, Critical)
- Reputation-based reporter system
- On-chain evidence storage (IPFS integration)

### 3. **Domain Registry**
- Verify legitimate dApp domains
- Content hash verification
- Domain ownership validation
- Prevent homograph/IDN attacks
- Real-time domain verification

### 4. **Transaction Validator**
- Pre-transaction risk assessment
- Suspicious pattern detection
- Maximum transaction value limits
- Custom validation rules
- Real-time transaction warnings

### 5. **Governance System**
- Decentralized protocol governance
- Proposal creation and voting
- Time-locked execution
- Community-driven security updates

### 6. **Browser Extension** (Coming Soon)
- Real-time Web3 protection
- Domain/homograph analysis
- Transaction interception and analysis
- Visual warning overlays
- MetaMask integration

---

## 📁 Project Structure

```
Anti-Phishing/
├── contract/                    # Smart Contracts
│   ├── contracts/
│   │   ├── AddressReputation.sol
│   │   ├── PhishingRegistry.sol
│   │   ├── DomainRegistry.sol
│   │   ├── TransactionValidator.sol
│   │   └── GovernanceController.sol
│   ├── test/                   # Contract Tests
│   ├── scripts/                # Deployment Scripts
│   └── deployments.json        # Deployed Contract Addresses
│
├── frontend/                   # React + Vite Web Dashboard
│   ├── app/
│   │   ├── routes/            # Page Components
│   │   └── utils/             # Utilities & ABIs
│   └── public/
│
└── extension/                  # Chrome Extension
    ├── manifest.json
    ├── background.js          # Service Worker
    ├── content.js             # Content Script
    └── popup.html             # Extension UI
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ and npm
- **MetaMask** browser extension
- **Hardhat** for smart contract development

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Anti-Phishing.git
cd Anti-Phishing
```

### 2. Install Dependencies

```bash
# Install contract dependencies
cd contract
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment

Create a `.env` file in the `contract/` directory:

```env
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key_here
ETHERSCAN_API_KEY=your_etherscan_key_here
```

### 4. Compile Contracts

```bash
cd contract
npx hardhat compile
```

### 5. Run Tests

```bash
npx hardhat test
```

### 6. Deploy Contracts

#### Local Network (Hardhat)
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### Testnet (Sepolia)
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

#### Mainnet
```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### 7. Verify Contracts on Etherscan

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### 8. Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🔧 Smart Contract Usage

### AddressReputation Contract

```solidity
// Register a trusted address
addressReputation.registerTrustedAddress(
    0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1,
    "My Hardware Wallet"
);

// Check for address poisoning
(bool isSuspicious, address similarTo, uint256 similarity) = 
    addressReputation.isAddressPoisoning(suspiciousAddress);

// Set risk score (requires SCORER_ROLE)
addressReputation.setRiskScore(
    maliciousAddress,
    85,
    "Multiple phishing reports confirmed"
);
```

### PhishingRegistry Contract

```solidity
// Report phishing address
phishingRegistry.reportPhishing(
    phisherAddress,
    3, // ThreatLevel.High
    "ipfs://QmPhishingEvidence..."
);

// Confirm report (requires VALIDATOR_ROLE)
phishingRegistry.confirmReport(reportId);

// Check if address is flagged
bool isFlagged = phishingRegistry.isAddressFlagged(address);
```

### DomainRegistry Contract

```solidity
// Register domain
domainRegistry.registerDomain(
    "uniswap.org",
    keccak256("content-hash"),
    "Official Uniswap Interface"
);

// Verify domain (requires VERIFIER_ROLE)
domainRegistry.verifyDomain("uniswap.org");

// Check domain verification
bool isVerified = domainRegistry.isDomainVerified("uniswap.org");
```

---

## 🧪 Testing

### Run All Tests
```bash
cd contract
npx hardhat test
```

### Run Specific Test File
```bash
npx hardhat test test/AddressReputation.test.js
```

### Generate Coverage Report
```bash
npx hardhat coverage
```

### Gas Usage Report
```bash
REPORT_GAS=true npx hardhat test
```

---

## 📊 Contract Addresses

### Hardhat Local Network
```
AddressReputation:      0x5FbDB2315678afecb367f032d93F642f64180aa3
DomainRegistry:         0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
PhishingRegistry:       0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
TransactionValidator:   0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
GovernanceController:   0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

*Update `frontend/app/utils/contracts.ts` with your deployed addresses*

---

## 🎨 Frontend Features

### Dashboard
- Real-time statistics overview
- Recent activity feed
- Feature navigation cards
- Wallet connection

### Address Reputation
- Register trusted addresses
- Check address similarity
- View risk scores
- Detect poisoning attacks

### Phishing Registry
- Submit phishing reports
- View reported addresses
- Validator confirmation system
- Threat level indicators

### Domain Registry
- Register verified domains
- Check domain authenticity
- Owner management
- Verification badges

---

## 🌐 Browser Extension Installation

### Development Mode

1. Build the extension:
```bash
cd extension
# No build needed for development
```

2. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

3. The extension will now protect you while browsing Web3 sites!

### Features
- ✅ Real-time phishing domain detection
- ✅ Address poisoning warnings
- ✅ Transaction risk analysis
- ✅ DOM fingerprinting
- ✅ Homograph attack detection

---

## 📈 Architecture

### Smart Contract Layer
```
┌─────────────────────────────────────────┐
│        Governance Controller            │
│  (Protocol governance & proposals)      │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌────▼───┐  ┌─────▼────┐
│Address │  │Phishing│  │  Domain  │
│Reputation│  │Registry│  │ Registry │
└────────┘  └────────┘  └──────────┘
                  │
           ┌──────▼──────┐
           │Transaction  │
           │ Validator   │
           └─────────────┘
```

### Frontend Architecture
```
React (UI) → ethers.js → Smart Contracts
     │
     └─→ Real-time updates via events
```

### Extension Architecture
```
Content Script → Background Service Worker
      │                    │
      ├─ DOM Analysis      ├─ Threat Intelligence
      ├─ Address Detection ├─ Blocklist Management
      └─ Transaction Hook  └─ Risk Assessment
```

---

## 🔐 Security Features

1. **Access Control**
   - Role-based permissions (ADMIN, SCORER, VALIDATOR, REPORTER)
   - Multi-signature governance
   - Time-locked critical operations

2. **Reentrancy Protection**
   - OpenZeppelin's ReentrancyGuard
   - Safe external calls

3. **Pausable Contracts**
   - Emergency pause mechanism
   - Circuit breaker pattern

4. **Input Validation**
   - Zero address checks
   - String length limits
   - Numeric range validation

5. **Gas Optimization**
   - Batch operations
   - Efficient storage patterns
   - Event logging

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Write comprehensive tests for new features
- Follow Solidity style guide
- Document all public functions
- Keep gas costs optimized

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Secure smart contract libraries
- **MetaMask** - Phishing domain list
- **Hardhat** - Development environment
- **React** - Frontend framework
- **Vite** - Build tool

---

## 📞 Support

- **Documentation**: [https://docs.antiphishing.xyz](https://docs.antiphishing.xyz)
- **Discord**: [https://discord.gg/antiphishing](https://discord.gg/antiphishing)
- **Twitter**: [@Web3AntiPhishing](https://twitter.com/Web3AntiPhishing)
- **Email**: support@antiphishing.xyz

---

## 🗺️ Roadmap

- [x] Core smart contracts
- [x] Comprehensive test suite
- [x] Web dashboard
- [x] Browser extension MVP
- [ ] Mobile app
- [ ] Advanced ML threat detection
- [ ] Multi-chain support
- [ ] NFT-based reputation system
- [ ] API for third-party integrations
- [ ] Decentralized oracle integration

---

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Users should always verify transactions and addresses independently. The protocol maintainers are not responsible for any losses incurred through the use of this software.

---

## 💡 How It Works

### Address Poisoning Detection

Address poisoning attacks work by creating wallet addresses that look similar to your trusted addresses (matching first/last characters). When you copy an address from your transaction history, you might accidentally copy the attacker's address instead.

**Our Solution:**
1. Users register their trusted addresses in the contract
2. Before any transaction, our system checks if the recipient address is highly similar to a trusted address
3. If similarity > threshold (default 80%), a warning is triggered
4. The system uses character-by-character comparison with weighted prefix/suffix matching

### Phishing Domain Detection

Attackers clone legitimate dApp interfaces and register similar domains (homograph attacks, typosquatting).

**Our Solution:**
1. Verified domains are registered on-chain with content hashes
2. Browser extension compares visited site's domain and content against registry
3. Calculates Levenshtein distance for similarity detection
4. Checks for Punycode/IDN homograph attacks
5. Real-time warnings before wallet connection

### Transaction Validation

Malicious transactions often include unlimited token approvals or transfers to known scam addresses.

**Our Solution:**
1. Pre-flight transaction analysis
2. Checks recipient against phishing registry
3. Detects unlimited approval patterns
4. Validates transaction data against known scam signatures
5. Risk scoring based on multiple factors

---

Made with ❤️ by the Web3 Security Community
