// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TransactionValidator
 * @notice Pre-flight transaction risk assessment with whitelist/blacklist.
 */
contract TransactionValidator is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant BLACKLIST_ADMIN_ROLE = keccak256("BLACKLIST_ADMIN_ROLE");

    enum RiskLevel { Safe, Low, Medium, High, Critical }

    struct RiskAssessment {
        RiskLevel level;
        string[] reasons;
        uint256 timestamp;
    }

    mapping(address => mapping(address => bool)) private _whitelists;
    mapping(address => address[]) private _whitelistAddrs;
    mapping(address => bool) private _globalBlacklist;
    mapping(address => uint256) private _maxTxValues;

    uint256 public constant UNLIMITED_APPROVAL = type(uint256).max;
    uint256 public constant HIGH_VALUE_THRESHOLD = 10 ether;
    bytes4 public constant APPROVE_SELECTOR = bytes4(keccak256("approve(address,uint256)"));

    event TransactionValidated(address indexed from, address indexed to, RiskLevel level);
    event HighRiskDetected(address indexed from, address indexed to, string reason);
    event WhitelistUpdated(address indexed user, address indexed addr, bool added);
    event BlacklistUpdated(address indexed addr, bool added);
    event MaxTxValueUpdated(address indexed user, uint256 oldValue, uint256 newValue);

    error ZeroAddress();
    error AlreadyWhitelisted();
    error NotWhitelisted();
    error AlreadyBlacklisted();
    error NotBlacklisted();
    error InvalidValue();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BLACKLIST_ADMIN_ROLE, msg.sender);
    }

    function validateTransaction(address to, uint256 value, bytes calldata data)
        external whenNotPaused returns (RiskLevel)
    {
        if (to == address(0)) revert ZeroAddress();

        RiskLevel level = RiskLevel.Safe;
        string memory reason;

        // Check blacklist
        if (_globalBlacklist[to]) {
            emit HighRiskDetected(msg.sender, to, "Blacklisted address");
            emit TransactionValidated(msg.sender, to, RiskLevel.Critical);
            return RiskLevel.Critical;
        }

        // Check whitelist (if whitelisted, lower risk)
        if (_whitelists[msg.sender][to]) {
            emit TransactionValidated(msg.sender, to, RiskLevel.Safe);
            return RiskLevel.Safe;
        }

        // Check high value
        uint256 maxVal = _maxTxValues[msg.sender];
        if (maxVal > 0 && value > maxVal) {
            level = RiskLevel.High;
            reason = "Exceeds max transaction value";
            emit HighRiskDetected(msg.sender, to, reason);
        } else if (value > HIGH_VALUE_THRESHOLD) {
            if (level < RiskLevel.Medium) level = RiskLevel.Medium;
        }

        // Check for ERC-20 approve calls
        if (data.length >= 4) {
            bytes4 selector = bytes4(data[:4]);
            if (selector == APPROVE_SELECTOR && data.length >= 68) {
                // Decode amount (last 32 bytes of approve data)
                uint256 amount;
                assembly { amount := calldataload(add(data.offset, 36)) }
                if (amount == UNLIMITED_APPROVAL) {
                    level = RiskLevel.Critical;
                    reason = "Unlimited token approval";
                    emit HighRiskDetected(msg.sender, to, reason);
                } else if (amount > 1e24) {
                    if (level < RiskLevel.High) level = RiskLevel.High;
                }
            }
        }

        // Unknown address bump
        if (level == RiskLevel.Safe) level = RiskLevel.Low;

        emit TransactionValidated(msg.sender, to, level);
        return level;
    }

    function checkApprovalRisk(address token, address spender, uint256 amount)
        external view returns (RiskLevel)
    {
        if (token == address(0) || spender == address(0)) revert ZeroAddress();
        if (_globalBlacklist[spender]) return RiskLevel.Critical;
        if (amount == UNLIMITED_APPROVAL) return RiskLevel.Critical;
        if (amount > 1e24) return RiskLevel.High;
        if (amount > 1e18) return RiskLevel.Medium;
        return RiskLevel.Low;
    }

    // Whitelist
    function addToWhitelist(address addr) external whenNotPaused {
        if (addr == address(0)) revert ZeroAddress();
        if (_whitelists[msg.sender][addr]) revert AlreadyWhitelisted();
        _whitelists[msg.sender][addr] = true;
        _whitelistAddrs[msg.sender].push(addr);
        emit WhitelistUpdated(msg.sender, addr, true);
    }

    function removeFromWhitelist(address addr) external whenNotPaused {
        if (!_whitelists[msg.sender][addr]) revert NotWhitelisted();
        _whitelists[msg.sender][addr] = false;
        address[] storage list = _whitelistAddrs[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == addr) { list[i] = list[list.length - 1]; list.pop(); break; }
        }
        emit WhitelistUpdated(msg.sender, addr, false);
    }

    // Blacklist (admin only)
    function addToBlacklist(address addr) external onlyRole(BLACKLIST_ADMIN_ROLE) {
        if (addr == address(0)) revert ZeroAddress();
        if (_globalBlacklist[addr]) revert AlreadyBlacklisted();
        _globalBlacklist[addr] = true;
        emit BlacklistUpdated(addr, true);
    }

    function removeFromBlacklist(address addr) external onlyRole(BLACKLIST_ADMIN_ROLE) {
        if (!_globalBlacklist[addr]) revert NotBlacklisted();
        _globalBlacklist[addr] = false;
        emit BlacklistUpdated(addr, false);
    }

    function setMaxTransactionValue(uint256 amount) external {
        uint256 old = _maxTxValues[msg.sender];
        _maxTxValues[msg.sender] = amount;
        emit MaxTxValueUpdated(msg.sender, old, amount);
    }

    // Views
    function isWhitelisted(address user, address addr) external view returns (bool) {
        return _whitelists[user][addr];
    }

    function isBlacklisted(address addr) external view returns (bool) {
        return _globalBlacklist[addr];
    }

    function getMaxTransactionValue(address user) external view returns (uint256) {
        return _maxTxValues[user];
    }

    function getWhitelist(address user) external view returns (address[] memory) {
        return _whitelistAddrs[user];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
