// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract GovernanceController is AccessControl, ReentrancyGuard {
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");

    enum ActionType { AddBlacklist, RemoveBlacklist, BlockDomain, UnblockDomain, UpdateThreshold, Custom }
    enum ProposalState { Active, Passed, Rejected, Executed, Cancelled }

    struct Proposal {
        uint256 id;
        address proposer;
        ActionType actionType;
        bytes data;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        ProposalState state;
        bool executed;
    }

    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(address => bool)) private _voteDirection;
    uint256 private _proposalCount;

    uint256 public votingPeriod = 3 days;
    uint256 public quorum = 1;
    uint256 public constant MIN_VOTING_PERIOD = 1 hours;
    uint256 public constant MAX_VOTING_PERIOD = 30 days;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ActionType actionType);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    error EmptyData();
    error ProposalNotFound();
    error ProposalNotActive();
    error AlreadyVoted();
    error VotingNotEnded();
    error VotingEnded();
    error ProposalNotPassed();
    error AlreadyExecuted();
    error NotProposer();
    error InvalidPeriod();
    error InvalidQuorum();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, msg.sender);
    }

    function proposeAction(ActionType actionType, bytes calldata data)
        external onlyRole(PROPOSER_ROLE) nonReentrant returns (uint256)
    {
        if (data.length == 0) revert EmptyData();
        uint256 id = _proposalCount++;
        _proposals[id] = Proposal({
            id: id,
            proposer: msg.sender,
            actionType: actionType,
            data: data,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            state: ProposalState.Active,
            executed: false
        });
        emit ProposalCreated(id, msg.sender, actionType);
        return id;
    }

    function vote(uint256 proposalId, bool support) external nonReentrant {
        if (proposalId >= _proposalCount) revert ProposalNotFound();
        Proposal storage p = _proposals[proposalId];
        if (p.state != ProposalState.Active) revert ProposalNotActive();
        if (block.timestamp > p.endTime) revert VotingEnded();
        if (_hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        _hasVoted[proposalId][msg.sender] = true;
        _voteDirection[proposalId][msg.sender] = support;

        if (support) {
            p.forVotes++;
        } else {
            p.againstVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        if (proposalId >= _proposalCount) revert ProposalNotFound();
        Proposal storage p = _proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp <= p.endTime) revert VotingNotEnded();

        // Tally
        if (p.forVotes >= quorum && p.forVotes > p.againstVotes) {
            p.state = ProposalState.Passed;
            p.executed = true;
            emit ProposalExecuted(proposalId);
        } else {
            p.state = ProposalState.Rejected;
        }
    }

    function cancelProposal(uint256 proposalId) external {
        if (proposalId >= _proposalCount) revert ProposalNotFound();
        Proposal storage p = _proposals[proposalId];
        if (p.state != ProposalState.Active) revert ProposalNotActive();
        if (msg.sender != p.proposer && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotProposer();
        p.state = ProposalState.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    // Views
    function getProposal(uint256 id) external view returns (Proposal memory) {
        if (id >= _proposalCount) revert ProposalNotFound();
        return _proposals[id];
    }

    function getProposalCount() external view returns (uint256) { return _proposalCount; }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    function getVoteDirection(uint256 proposalId, address voter) external view returns (bool) {
        return _voteDirection[proposalId][voter];
    }

    // Admin
    function setQuorum(uint256 newQuorum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newQuorum == 0) revert InvalidQuorum();
        uint256 old = quorum;
        quorum = newQuorum;
        emit QuorumUpdated(old, newQuorum);
    }

    function setVotingPeriod(uint256 newPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newPeriod < MIN_VOTING_PERIOD || newPeriod > MAX_VOTING_PERIOD) revert InvalidPeriod();
        uint256 old = votingPeriod;
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(old, newPeriod);
    }
}
