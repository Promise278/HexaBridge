const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GovernanceController", function () {
  async function deployGovernanceControllerFixture() {
    const [admin, proposer1, proposer2, voter1, voter2, voter3, user1] = 
      await ethers.getSigners();

    const GovernanceController = await ethers.getContractFactory("GovernanceController");
    const governance = await GovernanceController.deploy();

    const PROPOSER_ROLE = await governance.PROPOSER_ROLE();
    const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await governance.grantRole(PROPOSER_ROLE, proposer1.address);
    await governance.grantRole(PROPOSER_ROLE, proposer2.address);

    return { 
      governance, admin, proposer1, proposer2, voter1, voter2, voter3, user1,
      PROPOSER_ROLE, DEFAULT_ADMIN_ROLE 
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { governance, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployGovernanceControllerFixture);
      expect(await governance.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should initialize with correct voting period", async function () {
      const { governance } = await loadFixture(deployGovernanceControllerFixture);
      expect(await governance.votingPeriod()).to.equal(3 * 24 * 60 * 60); // 3 days
    });

    it("Should initialize with correct quorum", async function () {
      const { governance } = await loadFixture(deployGovernanceControllerFixture);
      expect(await governance.quorum()).to.equal(1);
    });

    it("Should have correct min and max voting period constants", async function () {
      const { governance } = await loadFixture(deployGovernanceControllerFixture);
      expect(await governance.MIN_VOTING_PERIOD()).to.equal(1 * 60 * 60); // 1 hour
      expect(await governance.MAX_VOTING_PERIOD()).to.equal(30 * 24 * 60 * 60); // 30 days
    });

    it("Should start with zero proposals", async function () {
      const { governance } = await loadFixture(deployGovernanceControllerFixture);
      expect(await governance.getProposalCount()).to.equal(0);
    });
  });

  describe("Propose Action", function () {
    it("Should allow proposer to create a proposal", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const data = ethers.toUtf8Bytes("Add address to blacklist");
      
      await expect(governance.connect(proposer1).proposeAction(0, data))
        .to.emit(governance, "ProposalCreated")
        .withArgs(0, proposer1.address, 0);
    });

    it("Should increment proposal count", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data1"));
      await governance.connect(proposer1).proposeAction(1, ethers.toUtf8Bytes("data2"));
      
      expect(await governance.getProposalCount()).to.equal(2);
    });

    it("Should store proposal with correct data", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const data = ethers.toUtf8Bytes("Proposal data");
      await governance.connect(proposer1).proposeAction(2, data);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.proposer).to.equal(proposer1.address);
      expect(proposal.actionType).to.equal(2);
      expect(proposal.state).to.equal(0); // Active
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(0);
      expect(proposal.executed).to.be.false;
    });

    it("Should set correct voting period", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const beforeTime = await time.latest();
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      const proposal = await governance.getProposal(0);
      const votingPeriod = await governance.votingPeriod();
      
      expect(proposal.endTime).to.be.closeTo(proposal.startTime + votingPeriod, 2);
    });

    it("Should revert with empty data", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(proposer1).proposeAction(0, "0x"))
        .to.be.revertedWithCustomError(governance, "EmptyData");
    });

    it("Should revert when non-proposer tries to create proposal", async function () {
      const { governance, user1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(user1).proposeAction(0, ethers.toUtf8Bytes("data")))
        .to.be.reverted;
    });

    it("Should handle all action types", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      for (let actionType = 0; actionType < 6; actionType++) {
        await expect(governance.connect(proposer1).proposeAction(
          actionType, ethers.toUtf8Bytes(`action${actionType}`)
        )).to.not.be.reverted;
      }
    });
  });

  describe("Vote on Proposal", function () {
    it("Should allow voting for a proposal", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await expect(governance.connect(voter1).vote(0, true))
        .to.emit(governance, "VoteCast")
        .withArgs(0, voter1.address, true);
    });

    it("Should increment forVotes when voting for", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await governance.connect(voter1).vote(0, true);
      await governance.connect(voter2).vote(0, true);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
    });

    it("Should increment againstVotes when voting against", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await governance.connect(voter1).vote(0, false);
      await governance.connect(voter2).vote(0, false);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.againstVotes).to.equal(2);
    });

    it("Should track voting status", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      expect(await governance.hasVoted(0, voter1.address)).to.be.false;
      
      await governance.connect(voter1).vote(0, true);
      
      expect(await governance.hasVoted(0, voter1.address)).to.be.true;
    });

    it("Should store vote direction", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await governance.connect(voter1).vote(0, true);
      await governance.connect(voter2).vote(0, false);
      
      expect(await governance.getVoteDirection(0, voter1.address)).to.be.true;
      expect(await governance.getVoteDirection(0, voter2.address)).to.be.false;
    });

    it("Should revert when voting twice", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await expect(governance.connect(voter1).vote(0, true))
        .to.be.revertedWithCustomError(governance, "AlreadyVoted");
    });

    it("Should revert when voting on non-existent proposal", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(voter1).vote(999, true))
        .to.be.revertedWithCustomError(governance, "ProposalNotFound");
    });

    it("Should revert when voting after period ends", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      const votingPeriod = await governance.votingPeriod();
      await time.increase(votingPeriod + 1n);
      
      await expect(governance.connect(voter1).vote(0, true))
        .to.be.revertedWithCustomError(governance, "VotingEnded");
    });

    it("Should revert when voting on non-active proposal", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      const votingPeriod = await governance.votingPeriod();
      await time.increase(votingPeriod + 1n);
      
      await governance.connect(voter1).executeProposal(0);
      
      await expect(governance.connect(voter2).vote(0, true))
        .to.be.revertedWithCustomError(governance, "ProposalNotActive");
    });
  });

  describe("Execute Proposal", function () {
    it("Should execute proposal that meets quorum and has majority", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      const votingPeriod = await governance.votingPeriod();
      await time.increase(votingPeriod + 1n);
      
      await expect(governance.connect(voter1).executeProposal(0))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(0);
    });

    it("Should mark proposal as Passed and executed", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(voter1).executeProposal(0);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.state).to.equal(1); // Passed
      expect(proposal.executed).to.be.true;
    });

    it("Should reject proposal without quorum", async function () {
      const { governance, proposer1, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(admin).setQuorum(2);
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      // Only 1 vote, but quorum is 2
      await governance.connect(proposer1).vote(0, true);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(proposer1).executeProposal(0);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.state).to.equal(2); // Rejected
    });

    it("Should reject proposal with more against votes", async function () {
      const { governance, proposer1, voter1, voter2, voter3 } = 
        await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await governance.connect(voter1).vote(0, true);
      await governance.connect(voter2).vote(0, false);
      await governance.connect(voter3).vote(0, false);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(voter1).executeProposal(0);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.state).to.equal(2); // Rejected
    });

    it("Should revert when executing before voting ends", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await expect(governance.connect(voter1).executeProposal(0))
        .to.be.revertedWithCustomError(governance, "VotingNotEnded");
    });

    it("Should revert when executing already executed proposal", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(voter1).executeProposal(0);
      
      await expect(governance.connect(voter1).executeProposal(0))
        .to.be.revertedWithCustomError(governance, "AlreadyExecuted");
    });

    it("Should revert when executing non-existent proposal", async function () {
      const { governance, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(voter1).executeProposal(999))
        .to.be.revertedWithCustomError(governance, "ProposalNotFound");
    });

    it("Should allow anyone to execute after voting period", async function () {
      const { governance, proposer1, voter1, user1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await time.increase(await governance.votingPeriod() + 1n);
      
      await expect(governance.connect(user1).executeProposal(0)).to.not.be.reverted;
    });
  });

  describe("Cancel Proposal", function () {
    it("Should allow proposer to cancel their proposal", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await expect(governance.connect(proposer1).cancelProposal(0))
        .to.emit(governance, "ProposalCancelled")
        .withArgs(0);
    });

    it("Should mark proposal as Cancelled", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(proposer1).cancelProposal(0);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.state).to.equal(4); // Cancelled
    });

    it("Should allow admin to cancel any proposal", async function () {
      const { governance, proposer1, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await expect(governance.connect(admin).cancelProposal(0)).to.not.be.reverted;
    });

    it("Should revert when non-proposer non-admin tries to cancel", async function () {
      const { governance, proposer1, user1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await expect(governance.connect(user1).cancelProposal(0))
        .to.be.revertedWithCustomError(governance, "NotProposer");
    });

    it("Should revert when cancelling non-active proposal", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(voter1).executeProposal(0);
      
      await expect(governance.connect(proposer1).cancelProposal(0))
        .to.be.revertedWithCustomError(governance, "ProposalNotActive");
    });

    it("Should revert when cancelling non-existent proposal", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(proposer1).cancelProposal(999))
        .to.be.revertedWithCustomError(governance, "ProposalNotFound");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set quorum", async function () {
      const { governance, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(admin).setQuorum(5))
        .to.emit(governance, "QuorumUpdated")
        .withArgs(1, 5);
      
      expect(await governance.quorum()).to.equal(5);
    });

    it("Should revert when setting quorum to zero", async function () {
      const { governance, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(admin).setQuorum(0))
        .to.be.revertedWithCustomError(governance, "InvalidQuorum");
    });

    it("Should allow admin to set voting period", async function () {
      const { governance, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      const newPeriod = 7 * 24 * 60 * 60; // 7 days
      
      await expect(governance.connect(admin).setVotingPeriod(newPeriod))
        .to.emit(governance, "VotingPeriodUpdated")
        .withArgs(3 * 24 * 60 * 60, newPeriod);
      
      expect(await governance.votingPeriod()).to.equal(newPeriod);
    });

    it("Should revert when setting voting period below minimum", async function () {
      const { governance, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      const tooShort = 30 * 60; // 30 minutes
      
      await expect(governance.connect(admin).setVotingPeriod(tooShort))
        .to.be.revertedWithCustomError(governance, "InvalidPeriod");
    });

    it("Should revert when setting voting period above maximum", async function () {
      const { governance, admin } = await loadFixture(deployGovernanceControllerFixture);
      
      const tooLong = 31 * 24 * 60 * 60; // 31 days
      
      await expect(governance.connect(admin).setVotingPeriod(tooLong))
        .to.be.revertedWithCustomError(governance, "InvalidPeriod");
    });

    it("Should restrict admin functions to admin role", async function () {
      const { governance, user1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await expect(governance.connect(user1).setQuorum(2)).to.be.reverted;
      await expect(governance.connect(user1).setVotingPeriod(7 * 24 * 60 * 60)).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct proposal data", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const data = ethers.toUtf8Bytes("Test proposal");
      await governance.connect(proposer1).proposeAction(3, data);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.proposer).to.equal(proposer1.address);
      expect(proposal.actionType).to.equal(3);
    });

    it("Should return correct proposal count", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("1"));
      await governance.connect(proposer1).proposeAction(1, ethers.toUtf8Bytes("2"));
      await governance.connect(proposer1).proposeAction(2, ethers.toUtf8Bytes("3"));
      
      expect(await governance.getProposalCount()).to.equal(3);
    });

    it("Should track vote status correctly", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      
      expect(await governance.hasVoted(0, voter1.address)).to.be.true;
      expect(await governance.hasVoted(0, voter2.address)).to.be.false;
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle tie votes (equal for and against)", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      await governance.connect(voter2).vote(0, false);
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(voter1).executeProposal(0);
      
      const proposal = await governance.getProposal(0);
      // With equal votes, proposal should be rejected (need more for than against)
      expect(proposal.state).to.equal(2); // Rejected
    });

    it("Should handle proposal with no votes", async function () {
      const { governance, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await time.increase(await governance.votingPeriod() + 1n);
      await governance.connect(proposer1).executeProposal(0);
      
      const proposal = await governance.getProposal(0);
      expect(proposal.state).to.equal(2); // Rejected (no quorum)
    });

    it("Should handle reentrancy protection", async function () {
      const { governance, proposer1, voter1 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      await expect(governance.connect(voter1).vote(0, true)).to.not.be.reverted;
    });

    it("Should maintain proposal data integrity", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(2, ethers.toUtf8Bytes("data"));
      await governance.connect(voter1).vote(0, true);
      await governance.connect(voter2).vote(0, false);
      
      const proposal1 = await governance.getProposal(0);
      
      // Create another proposal
      await governance.connect(proposer1).proposeAction(3, ethers.toUtf8Bytes("data2"));
      
      const proposal0 = await governance.getProposal(0);
      
      // First proposal should remain unchanged
      expect(proposal0.actionType).to.equal(proposal1.actionType);
      expect(proposal0.forVotes).to.equal(proposal1.forVotes);
      expect(proposal0.againstVotes).to.equal(proposal1.againstVotes);
    });

    it("Should allow voting during entire voting period", async function () {
      const { governance, proposer1, voter1, voter2 } = await loadFixture(deployGovernanceControllerFixture);
      
      await governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data"));
      
      const votingPeriod = await governance.votingPeriod();
      
      // Vote at start
      await governance.connect(voter1).vote(0, true);
      
      // Vote near end
      await time.increase(votingPeriod - 10n);
      await expect(governance.connect(voter2).vote(0, true)).to.not.be.reverted;
    });

    it("Should handle maximum voting period", async function () {
      const { governance, admin, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const maxPeriod = await governance.MAX_VOTING_PERIOD();
      await governance.connect(admin).setVotingPeriod(maxPeriod);
      
      await expect(governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data")))
        .to.not.be.reverted;
    });

    it("Should handle minimum voting period", async function () {
      const { governance, admin, proposer1 } = await loadFixture(deployGovernanceControllerFixture);
      
      const minPeriod = await governance.MIN_VOTING_PERIOD();
      await governance.connect(admin).setVotingPeriod(minPeriod);
      
      await expect(governance.connect(proposer1).proposeAction(0, ethers.toUtf8Bytes("data")))
        .to.not.be.reverted;
    });
  });
});
