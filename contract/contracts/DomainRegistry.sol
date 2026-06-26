// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DomainRegistry
 * @notice On-chain domain verification, blocklisting, and similarity detection.
 */
contract DomainRegistry is AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    enum DomainStatus { Unregistered, Verified, Suspicious, Blocked }

    struct DomainInfo {
        string domain;
        bytes32 contentHash;
        DomainStatus status;
        address registeredBy;
        uint256 registeredAt;
        uint256 reportCount;
        bool exists;
    }

    mapping(bytes32 => DomainInfo) private _domains;
    mapping(bytes32 => string[]) private _domainEvidence;
    uint256 private _domainCount;
    uint256 private _blockedCount;
    uint256 public suspiciousThreshold = 3; // reports before auto-suspicious

    event DomainRegistered(bytes32 indexed domainHash, string domain, address indexed registeredBy);
    event DomainBlocked(bytes32 indexed domainHash, string domain);
    event DomainUnblocked(bytes32 indexed domainHash, string domain);
    event MaliciousDomainReported(bytes32 indexed domainHash, string domain, string evidence);
    event DomainStatusUpdated(bytes32 indexed domainHash, DomainStatus oldStatus, DomainStatus newStatus);
    event SuspiciousThresholdUpdated(uint256 oldValue, uint256 newValue);

    error EmptyDomain();
    error DomainAlreadyRegistered();
    error DomainNotRegistered();
    error DomainAlreadyBlocked();
    error DomainNotBlocked();
    error EmptyEvidence();
    error InvalidThreshold();
    error EmptyHash();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
    }

    function _hashDomain(string memory domain) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(domain));
    }

    function registerDomain(string calldata domain, bytes32 contentHash)
        external onlyRole(REGISTRAR_ROLE) whenNotPaused
    {
        if (bytes(domain).length == 0) revert EmptyDomain();
        if (contentHash == bytes32(0)) revert EmptyHash();
        bytes32 h = _hashDomain(domain);
        if (_domains[h].exists) revert DomainAlreadyRegistered();

        _domains[h] = DomainInfo({
            domain: domain,
            contentHash: contentHash,
            status: DomainStatus.Verified,
            registeredBy: msg.sender,
            registeredAt: block.timestamp,
            reportCount: 0,
            exists: true
        });
        _domainCount++;
        emit DomainRegistered(h, domain, msg.sender);
    }

    function verifyDomain(string calldata domain) external view returns (bool registered, DomainStatus status) {
        bytes32 h = _hashDomain(domain);
        DomainInfo storage info = _domains[h];
        return (info.exists, info.status);
    }

    function reportMaliciousDomain(string calldata domain, string calldata evidence)
        external whenNotPaused
    {
        if (bytes(domain).length == 0) revert EmptyDomain();
        if (bytes(evidence).length == 0) revert EmptyEvidence();
        bytes32 h = _hashDomain(domain);

        // Auto-register if unknown
        if (!_domains[h].exists) {
            _domains[h] = DomainInfo({
                domain: domain,
                contentHash: bytes32(0),
                status: DomainStatus.Unregistered,
                registeredBy: address(0),
                registeredAt: block.timestamp,
                reportCount: 0,
                exists: true
            });
            _domainCount++;
        }

        _domains[h].reportCount++;
        _domainEvidence[h].push(evidence);
        emit MaliciousDomainReported(h, domain, evidence);

        if (_domains[h].reportCount >= suspiciousThreshold &&
            _domains[h].status != DomainStatus.Blocked) {
            DomainStatus old = _domains[h].status;
            _domains[h].status = DomainStatus.Suspicious;
            emit DomainStatusUpdated(h, old, DomainStatus.Suspicious);
        }
    }

    function blockDomain(string calldata domain)
        external onlyRole(MODERATOR_ROLE) whenNotPaused
    {
        if (bytes(domain).length == 0) revert EmptyDomain();
        bytes32 h = _hashDomain(domain);
        if (!_domains[h].exists) revert DomainNotRegistered();
        if (_domains[h].status == DomainStatus.Blocked) revert DomainAlreadyBlocked();

        DomainStatus old = _domains[h].status;
        _domains[h].status = DomainStatus.Blocked;
        _blockedCount++;
        emit DomainBlocked(h, domain);
        emit DomainStatusUpdated(h, old, DomainStatus.Blocked);
    }

    function unblockDomain(string calldata domain)
        external onlyRole(MODERATOR_ROLE) whenNotPaused
    {
        if (bytes(domain).length == 0) revert EmptyDomain();
        bytes32 h = _hashDomain(domain);
        if (!_domains[h].exists) revert DomainNotRegistered();
        if (_domains[h].status != DomainStatus.Blocked) revert DomainNotBlocked();

        _domains[h].status = DomainStatus.Verified;
        _blockedCount--;
        emit DomainUnblocked(h, domain);
        emit DomainStatusUpdated(h, DomainStatus.Blocked, DomainStatus.Verified);
    }

    function checkDomainSimilarity(string calldata d1, string calldata d2)
        external pure returns (uint256 score)
    {
        bytes memory a = bytes(d1);
        bytes memory b = bytes(d2);
        if (a.length == 0 || b.length == 0) return 0;
        uint256 maxLen = a.length > b.length ? a.length : b.length;
        uint256 minLen = a.length < b.length ? a.length : b.length;
        uint256 matches;
        for (uint256 i = 0; i < minLen; i++) {
            if (a[i] == b[i]) matches++;
        }
        return (matches * 100) / maxLen;
    }

    function getDomainStatus(string calldata domain) external view returns (DomainStatus) {
        bytes32 h = _hashDomain(domain);
        if (!_domains[h].exists) return DomainStatus.Unregistered;
        return _domains[h].status;
    }

    function getDomainInfo(string calldata domain) external view returns (DomainInfo memory) {
        return _domains[_hashDomain(domain)];
    }

    function getDomainEvidence(string calldata domain) external view returns (string[] memory) {
        return _domainEvidence[_hashDomain(domain)];
    }

    function getDomainCount() external view returns (uint256) { return _domainCount; }
    function getBlockedCount() external view returns (uint256) { return _blockedCount; }

    function setSuspiciousThreshold(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (value == 0) revert InvalidThreshold();
        uint256 old = suspiciousThreshold;
        suspiciousThreshold = value;
        emit SuspiciousThresholdUpdated(old, value);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
