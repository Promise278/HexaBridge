// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AddressReputation is AccessControl, Pausable {
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");

    struct TrustedAddress {
        address addr;
        string label;
        uint256 registeredAt;
        bool exists;
    }

    struct RiskProfile {
        uint256 score;
        string reason;
        uint256 updatedAt;
        bool exists;
    }

    mapping(address => mapping(address => TrustedAddress)) private _trusted;
    mapping(address => address[]) private _trustedList;
    mapping(address => RiskProfile) private _riskProfiles;

    uint256 public similarityThreshold = 80;
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MAX_RISK_SCORE = 100;

    event TrustedAddressRegistered(address indexed user, address indexed trusted, string label);
    event TrustedAddressRemoved(address indexed user, address indexed trusted);
    event RiskScoreUpdated(address indexed target, uint256 oldScore, uint256 newScore, string reason);
    event PoisoningDetected(address indexed target, address indexed similarTo, uint256 similarity);
    event SimilarityThresholdUpdated(uint256 oldValue, uint256 newValue);

    error ZeroAddress();
    error EmptyLabel();
    error AlreadyRegistered();
    error NotRegistered();
    error InvalidScore();
    error EmptyReason();
    error BatchTooLarge();
    error EmptyBatch();
    error InvalidThreshold();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SCORER_ROLE, msg.sender);
    }

    function registerTrustedAddress(address addr, string calldata label) external whenNotPaused {
        if (addr == address(0)) revert ZeroAddress();
        if (bytes(label).length == 0) revert EmptyLabel();
        if (_trusted[msg.sender][addr].exists) revert AlreadyRegistered();

        _trusted[msg.sender][addr] = TrustedAddress(addr, label, block.timestamp, true);
        _trustedList[msg.sender].push(addr);
        emit TrustedAddressRegistered(msg.sender, addr, label);
    }

    function removeTrustedAddress(address addr) external whenNotPaused {
        if (!_trusted[msg.sender][addr].exists) revert NotRegistered();
        delete _trusted[msg.sender][addr];
        address[] storage list = _trustedList[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == addr) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        emit TrustedAddressRemoved(msg.sender, addr);
    }

    function setRiskScore(address target, uint256 score, string calldata reason)
        external onlyRole(SCORER_ROLE) whenNotPaused
    {
        if (target == address(0)) revert ZeroAddress();
        if (score > MAX_RISK_SCORE) revert InvalidScore();
        if (bytes(reason).length == 0) revert EmptyReason();
        uint256 oldScore = _riskProfiles[target].score;
        _riskProfiles[target] = RiskProfile(score, reason, block.timestamp, true);
        emit RiskScoreUpdated(target, oldScore, score, reason);
    }

    function getRiskScore(address target) external view returns (RiskProfile memory) {
        return _riskProfiles[target];
    }

    function checkSimilarity(address a, address b) public pure returns (uint256) {
        if (a == b) return 100;
        bytes20 bA = bytes20(a);
        bytes20 bB = bytes20(b);
        uint256 matches;
        for (uint256 i = 0; i < 20; i++) {
            if (bA[i] == bB[i]) matches++;
        }
        return (matches * 100) / 20;
    }

    function isAddressPoisoning(address target)
        external view returns (bool isSuspicious, address similarTo, uint256 similarity)
    {
        address[] storage list = _trustedList[msg.sender];
        uint256 highestSim;
        address closestAddr;
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == target) continue;
            uint256 sim = checkSimilarity(target, list[i]);
            if (sim > highestSim) { highestSim = sim; closestAddr = list[i]; }
        }
        return (highestSim >= similarityThreshold, closestAddr, highestSim);
    }

    function batchCheckAddresses(address[] calldata targets)
        external view returns (bool[] memory suspicious, uint256[] memory scores)
    {
        if (targets.length == 0) revert EmptyBatch();
        if (targets.length > MAX_BATCH_SIZE) revert BatchTooLarge();
        suspicious = new bool[](targets.length);
        scores = new uint256[](targets.length);
        address[] storage list = _trustedList[msg.sender];
        for (uint256 t = 0; t < targets.length; t++) {
            uint256 highestSim;
            for (uint256 i = 0; i < list.length; i++) {
                if (list[i] == targets[t]) continue;
                uint256 sim = checkSimilarity(targets[t], list[i]);
                if (sim > highestSim) highestSim = sim;
            }
            suspicious[t] = highestSim >= similarityThreshold;
            scores[t] = highestSim;
        }
    }

    function setSimilarityThreshold(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (value == 0 || value > 100) revert InvalidThreshold();
        uint256 old = similarityThreshold;
        similarityThreshold = value;
        emit SimilarityThresholdUpdated(old, value);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function getTrustedAddresses() external view returns (address[] memory) {
        return _trustedList[msg.sender];
    }

    function getTrustedAddress(address addr) external view returns (TrustedAddress memory) {
        return _trusted[msg.sender][addr];
    }

    function getTrustedAddressCount() external view returns (uint256) {
        return _trustedList[msg.sender].length;
    }

    function isTrusted(address addr) external view returns (bool) {
        return _trusted[msg.sender][addr].exists;
    }
}
