// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PhishingRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    enum ThreatLevel { None, Low, Medium, High, Critical }
    enum ReportStatus { Pending, Confirmed, Dismissed }

    struct Report {
        uint256 id;
        address reporter;
        address target;
        ThreatLevel severity;
        ReportStatus status;
        string evidence;
        uint256 timestamp;
        uint256 confirmations;
        uint256 dismissals;
    }

    mapping(uint256 => Report) private _reports;
    mapping(address => ThreatLevel) private _threatLevels;
    mapping(address => uint256[]) private _reportsByTarget;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    uint256 private _reportCount;

    uint256 public confirmationsRequired = 2;
    uint256 public dismissalsRequired = 2;

    event PhishingReported(
        uint256 indexed reportId,
        address indexed reporter,
        address indexed target,
        ThreatLevel severity,
        string evidence
    );
    event ReportConfirmed(uint256 indexed reportId, address indexed validator);
    event ReportDismissed(uint256 indexed reportId, address indexed validator);
    event ThreatLevelUpdated(address indexed target, ThreatLevel oldLevel, ThreatLevel newLevel);
    event ConfirmationsRequiredUpdated(uint256 oldValue, uint256 newValue);
    event DismissalsRequiredUpdated(uint256 oldValue, uint256 newValue);

    error ZeroAddress();
    error EmptyEvidence();
    error InvalidSeverity();
    error ReportNotFound();
    error ReportNotPending();
    error AlreadyVoted();
    error InvalidThreshold();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }


    function reportPhishing(
        address target,
        ThreatLevel severity,
        string calldata evidence
    ) external onlyRole(REPORTER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        if (target == address(0)) revert ZeroAddress();
        if (bytes(evidence).length == 0) revert EmptyEvidence();
        if (severity == ThreatLevel.None) revert InvalidSeverity();

        uint256 reportId = _reportCount++;

        _reports[reportId] = Report({
            id: reportId,
            reporter: msg.sender,
            target: target,
            severity: severity,
            status: ReportStatus.Pending,
            evidence: evidence,
            timestamp: block.timestamp,
            confirmations: 0,
            dismissals: 0
        });

        _reportsByTarget[target].push(reportId);

        emit PhishingReported(reportId, msg.sender, target, severity, evidence);
        return reportId;
    }


    function confirmReport(uint256 reportId)
        external
        onlyRole(VALIDATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        Report storage r = _getValidReport(reportId);
        if (_hasVoted[reportId][msg.sender]) revert AlreadyVoted();

        _hasVoted[reportId][msg.sender] = true;
        r.confirmations++;

        emit ReportConfirmed(reportId, msg.sender);

        if (r.confirmations >= confirmationsRequired) {
            r.status = ReportStatus.Confirmed;
            ThreatLevel oldLevel = _threatLevels[r.target];
            if (r.severity > oldLevel) {
                _threatLevels[r.target] = r.severity;
                emit ThreatLevelUpdated(r.target, oldLevel, r.severity);
            }
        }
    }


    function dismissReport(uint256 reportId)
        external
        onlyRole(VALIDATOR_ROLE)
        whenNotPaused
        nonReentrant
    {
        Report storage r = _getValidReport(reportId);
        if (_hasVoted[reportId][msg.sender]) revert AlreadyVoted();

        _hasVoted[reportId][msg.sender] = true;
        r.dismissals++;

        emit ReportDismissed(reportId, msg.sender);

        if (r.dismissals >= dismissalsRequired) {
            r.status = ReportStatus.Dismissed;
        }
    }

    function setConfirmationsRequired(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (value == 0) revert InvalidThreshold();
        uint256 old = confirmationsRequired;
        confirmationsRequired = value;
        emit ConfirmationsRequiredUpdated(old, value);
    }

    function setDismissalsRequired(uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (value == 0) revert InvalidThreshold();
        uint256 old = dismissalsRequired;
        dismissalsRequired = value;
        emit DismissalsRequiredUpdated(old, value);
    }

    function setThreatLevel(address target, ThreatLevel level)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (target == address(0)) revert ZeroAddress();
        ThreatLevel old = _threatLevels[target];
        _threatLevels[target] = level;
        emit ThreatLevelUpdated(target, old, level);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getReport(uint256 reportId) external view returns (Report memory) {
        if (reportId >= _reportCount) revert ReportNotFound();
        return _reports[reportId];
    }

    function getReportCount() external view returns (uint256) {
        return _reportCount;
    }

    function isAddressFlagged(address target) external view returns (bool) {
        return _threatLevels[target] != ThreatLevel.None;
    }

    function getThreatLevel(address target) external view returns (ThreatLevel) {
        return _threatLevels[target];
    }

    function getReportsByTarget(address target) external view returns (uint256[] memory) {
        return _reportsByTarget[target];
    }

    function hasVoted(uint256 reportId, address voter) external view returns (bool) {
        return _hasVoted[reportId][voter];
    }

    function _getValidReport(uint256 reportId) internal view returns (Report storage) {
        if (reportId >= _reportCount) revert ReportNotFound();
        Report storage r = _reports[reportId];
        if (r.status != ReportStatus.Pending) revert ReportNotPending();
        return r;
    }
}
