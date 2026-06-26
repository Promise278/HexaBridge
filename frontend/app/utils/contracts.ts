// Contract ABIs and addresses

// Sepolia Testnet Deployed Contracts
export const CONTRACT_ADDRESSES = {
  AddressReputation: '0xc2cfA8BB12a18b0d2C07a7B729995144b4B7b083',
  PhishingRegistry: '0x8737B30105d553ad15Fb36891a32a5001a8Cd59c',
  DomainRegistry: '0x7EFB73FF3C587531562c55C9E5EE93bA1349943D',
  GovernanceController: '0x0D541fc45F9322a2872eC86Acf6dACAa14942Aab',
  TransactionValidator: '0x5dfABC5929f8E02403119ca356ED5648f3c0bd67',
};

// Add your contract ABIs here (partial for now - will be extracted from artifacts)
export const ADDRESS_REPUTATION_ABI = [
  "function registerTrustedAddress(address addr, string memory label)",
  "function removeTrustedAddress(address addr)",
  "function getTrustedAddresses() view returns (address[])",
  "function isAddressPoisoning(address target) view returns (bool isSuspicious, address similarTo, uint256 similarity)",
  "function setRiskScore(address target, uint256 score, string memory reason)",
  "function getRiskScore(address target) view returns (tuple(uint256 score, string reason, uint256 updatedAt, bool exists))",
  "function batchCheckAddresses(address[] memory targets) view returns (bool[] memory suspicious, uint256[] memory scores)",
  "function checkSimilarity(address a, address b) pure returns (uint256)",
  "function getTrustedAddressCount() view returns (uint256)",
  "function isTrusted(address addr) view returns (bool)",
  "function setSimilarityThreshold(uint256 value)",
  "function similarityThreshold() view returns (uint256)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  "event TrustedAddressRegistered(address indexed user, address indexed trusted, string label)",
  "event TrustedAddressRemoved(address indexed user, address indexed trusted)",
  "event PoisoningDetected(address indexed target, address indexed similarTo, uint256 similarity)",
  "event RiskScoreUpdated(address indexed target, uint256 oldScore, uint256 newScore, string reason)"
];

export const PHISHING_REGISTRY_ABI = [
  "function reportPhishing(address target, uint8 severity, string memory evidence)",
  "function confirmReport(uint256 reportId)",
  "function dismissReport(uint256 reportId)",
  "function getReport(uint256 reportId) view returns (tuple(uint256 id, address reporter, address target, uint8 severity, uint8 status, string evidence, uint256 confirmations, uint256 dismissals, uint256 timestamp))",
  "function getReportsByTarget(address target) view returns (uint256[] memory)",
  "function getThreatLevel(address target) view returns (uint8)",
  "function isAddressFlagged(address target) view returns (bool)",
  "function getReportCount() view returns (uint256)",
  "function setThreatLevel(address target, uint8 level)",
  "function setConfirmationsRequired(uint256 value)",
  "function setDismissalsRequired(uint256 value)",
  "function confirmationsRequired() view returns (uint256)",
  "function dismissalsRequired() view returns (uint256)",
  "function pause()",
  "function unpause()",
  "event PhishingReported(uint256 indexed reportId, address indexed reporter, address indexed target, uint8 severity, string evidence)",
  "event ReportConfirmed(uint256 indexed reportId, address indexed validator)",
  "event ReportDismissed(uint256 indexed reportId, address indexed validator)",
  "event ThreatLevelUpdated(address indexed target, uint8 oldLevel, uint8 newLevel)"
];

export const DOMAIN_REGISTRY_ABI = [
  "function registerDomain(string memory domain, bytes32 contentHash, string memory metadata)",
  "function updateDomain(string memory domain, bytes32 contentHash, string memory metadata)",
  "function verifyDomain(string memory domain)",
  "function revokeDomain(string memory domain)",
  "function getDomain(string memory domain) view returns (tuple(string domain, bytes32 contentHash, address owner, bool isVerified, uint256 registeredAt, string metadata, bool exists))",
  "function isDomainVerified(string memory domain) view returns (bool)",
  "function getDomainsByOwner(address owner) view returns (string[] memory)",
  "function pause()",
  "function unpause()",
  "event DomainRegistered(string indexed domain, address indexed owner, bytes32 contentHash)",
  "event DomainVerified(string indexed domain, address indexed verifier)",
  "event DomainRevoked(string indexed domain, address indexed revoker)"
];

export const TRANSACTION_VALIDATOR_ABI = [
  "function validateTransaction(address to, uint256 value, bytes memory data) view returns (tuple(bool isValid, uint8 riskLevel, string[] reasons))",
  "function addValidationRule(string memory ruleId, uint256 ruleType, bytes memory ruleData)",
  "function removeValidationRule(string memory ruleId)",
  "function setMaxTransactionValue(uint256 value)",
  "function pause()",
  "function unpause()"
];

export const GOVERNANCE_CONTROLLER_ABI = [
  "function createProposal(string memory description, bytes[] memory actions)",
  "function vote(uint256 proposalId, bool support)",
  "function executeProposal(uint256 proposalId)",
  "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string description, uint256 forVotes, uint256 againstVotes, uint256 startTime, uint256 endTime, uint8 status, bool executed))",
  "function pause()",
  "function unpause()"
];
