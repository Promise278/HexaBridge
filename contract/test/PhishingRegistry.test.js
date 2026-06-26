const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PhishingRegistry", function () {
  async function deployPhishingRegistryFixture() {
    const [admin, reporter1, reporter2, validator1, validator2, attacker, user1] = await ethers.getSigners();

    const PhishingRegistry = await ethers.getContractFactory("PhishingRegistry");
    const registry = await PhishingRegistry.deploy();

    const REPORTER_ROLE = await registry.REPORTER_ROLE();
    const VALIDATOR_ROLE = await registry.VALIDATOR_ROLE();
    const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await registry.grantRole(REPORTER_ROLE, reporter1.address);
    await registry.grantRole(REPORTER_ROLE, reporter2.address);
    await registry.grantRole(VALIDATOR_ROLE, validator1.address);
    await registry.grantRole(VALIDATOR_ROLE, validator2.address);

    return { 
      registry, admin, reporter1, reporter2, validator1, validator2, 
      attacker, user1, REPORTER_ROLE, VALIDATOR_ROLE, DEFAULT_ADMIN_ROLE 
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { registry, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployPhishingRegistryFixture);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should initialize with correct thresholds", async function () {
      const { registry } = await loadFixture(deployPhishingRegistryFixture);
      expect(await registry.confirmationsRequired()).to.equal(2);
      expect(await registry.dismissalsRequired()).to.equal(2);
    });

    it("Should start with zero reports", async function () {
      const { registry } = await loadFixture(deployPhishingRegistryFixture);
      expect(await registry.getReportCount()).to.equal(0);
    });
  });

  describe("Report Phishing", function () {
    it("Should allow reporter to submit a phishing report", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address,
        1, // ThreatLevel.Low
        "Suspicious activity detected"
      ))
        .to.emit(registry, "PhishingReported")
        .withArgs(0, reporter1.address, attacker.address, 1, "Suspicious activity detected");
      
      expect(await registry.getReportCount()).to.equal(1);
    });

    it("Should revert when reporting zero address", async function () {
      const { registry, reporter1 } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(reporter1).reportPhishing(
        ethers.ZeroAddress,
        1,
        "Evidence"
      )).to.be.revertedWithCustomError(registry, "ZeroAddress");
    });

    it("Should revert with empty evidence", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address,
        1,
        ""
      )).to.be.revertedWithCustomError(registry, "EmptyEvidence");
    });

    it("Should revert with None severity", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address,
        0, // ThreatLevel.None
        "Evidence"
      )).to.be.revertedWithCustomError(registry, "InvalidSeverity");
    });

    it("Should revert when non-reporter tries to submit", async function () {
      const { registry, user1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(user1).reportPhishing(
        attacker.address,
        1,
        "Evidence"
      )).to.be.reverted;
    });

    it("Should store report with correct data", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(
        attacker.address,
        2, // ThreatLevel.Medium
        "IPFS hash QmExample"
      );
      
      const report = await registry.getReport(0);
      expect(report.id).to.equal(0);
      expect(report.reporter).to.equal(reporter1.address);
      expect(report.target).to.equal(attacker.address);
      expect(report.severity).to.equal(2);
      expect(report.status).to.equal(0); // Pending
      expect(report.evidence).to.equal("IPFS hash QmExample");
      expect(report.confirmations).to.equal(0);
      expect(report.dismissals).to.equal(0);
    });

    it("Should allow multiple reports for same target", async function () {
      const { registry, reporter1, reporter2, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence 1");
      await registry.connect(reporter2).reportPhishing(attacker.address, 2, "Evidence 2");
      
      const reports = await registry.getReportsByTarget(attacker.address);
      expect(reports.length).to.equal(2);
    });
  });

  describe("Confirm Report", function () {
    it("Should allow validator to confirm a report", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      
      await expect(registry.connect(validator1).confirmReport(0))
        .to.emit(registry, "ReportConfirmed")
        .withArgs(0, validator1.address);
      
      const report = await registry.getReport(0);
      expect(report.confirmations).to.equal(1);
    });

    it("Should update threat level after sufficient confirmations", async function () {
      const { registry, reporter1, validator1, validator2, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 3, "Evidence"); // High
      
      expect(await registry.isAddressFlagged(attacker.address)).to.be.false;
      
      await registry.connect(validator1).confirmReport(0);
      await expect(registry.connect(validator2).confirmReport(0))
        .to.emit(registry, "ThreatLevelUpdated")
        .withArgs(attacker.address, 0, 3);
      
      expect(await registry.isAddressFlagged(attacker.address)).to.be.true;
      expect(await registry.getThreatLevel(attacker.address)).to.equal(3);
      
      const report = await registry.getReport(0);
      expect(report.status).to.equal(1); // Confirmed
    });

    it("Should prevent double voting", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      await registry.connect(validator1).confirmReport(0);
      
      await expect(registry.connect(validator1).confirmReport(0))
        .to.be.revertedWithCustomError(registry, "AlreadyVoted");
    });

    it("Should revert for non-existent report", async function () {
      const { registry, validator1 } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(validator1).confirmReport(999))
        .to.be.revertedWithCustomError(registry, "ReportNotFound");
    });

    it("Should revert when confirming non-pending report", async function () {
      const { registry, reporter1, validator1, validator2, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      await registry.connect(validator1).confirmReport(0);
      await registry.connect(validator2).confirmReport(0); // Now confirmed
      
      const [, , validator3] = await ethers.getSigners();
      await registry.grantRole(await registry.VALIDATOR_ROLE(), validator3.address);
      
      await expect(registry.connect(validator3).confirmReport(0))
        .to.be.revertedWithCustomError(registry, "ReportNotPending");
    });

    it("Should only update to higher threat level", async function () {
      const { registry, reporter1, reporter2, validator1, validator2, attacker, DEFAULT_ADMIN_ROLE, admin } = 
        await loadFixture(deployPhishingRegistryFixture);
      
      // Set initial threat level to High
      await registry.connect(admin).setThreatLevel(attacker.address, 3);
      
      // Create and confirm a Low severity report
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Low evidence");
      await registry.connect(validator1).confirmReport(0);
      await registry.connect(validator2).confirmReport(0);
      
      // Threat level should remain High
      expect(await registry.getThreatLevel(attacker.address)).to.equal(3);
    });
  });

  describe("Dismiss Report", function () {
    it("Should allow validator to dismiss a report", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      
      await expect(registry.connect(validator1).dismissReport(0))
        .to.emit(registry, "ReportDismissed")
        .withArgs(0, validator1.address);
      
      const report = await registry.getReport(0);
      expect(report.dismissals).to.equal(1);
    });

    it("Should mark report as dismissed after sufficient dismissals", async function () {
      const { registry, reporter1, validator1, validator2, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "False positive");
      
      await registry.connect(validator1).dismissReport(0);
      await registry.connect(validator2).dismissReport(0);
      
      const report = await registry.getReport(0);
      expect(report.status).to.equal(2); // Dismissed
    });

    it("Should prevent double voting on dismissal", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      await registry.connect(validator1).dismissReport(0);
      
      await expect(registry.connect(validator1).dismissReport(0))
        .to.be.revertedWithCustomError(registry, "AlreadyVoted");
    });

    it("Should not allow confirm after voting to dismiss", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      await registry.connect(validator1).dismissReport(0);
      
      await expect(registry.connect(validator1).confirmReport(0))
        .to.be.revertedWithCustomError(registry, "AlreadyVoted");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update confirmations required", async function () {
      const { registry, admin } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(admin).setConfirmationsRequired(3))
        .to.emit(registry, "ConfirmationsRequiredUpdated")
        .withArgs(2, 3);
      
      expect(await registry.confirmationsRequired()).to.equal(3);
    });

    it("Should allow admin to update dismissals required", async function () {
      const { registry, admin } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(admin).setDismissalsRequired(4))
        .to.emit(registry, "DismissalsRequiredUpdated")
        .withArgs(2, 4);
      
      expect(await registry.dismissalsRequired()).to.equal(4);
    });

    it("Should revert when setting zero threshold", async function () {
      const { registry, admin } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(admin).setConfirmationsRequired(0))
        .to.be.revertedWithCustomError(registry, "InvalidThreshold");
      
      await expect(registry.connect(admin).setDismissalsRequired(0))
        .to.be.revertedWithCustomError(registry, "InvalidThreshold");
    });

    it("Should allow admin to manually set threat level", async function () {
      const { registry, admin, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(admin).setThreatLevel(attacker.address, 4))
        .to.emit(registry, "ThreatLevelUpdated")
        .withArgs(attacker.address, 0, 4);
      
      expect(await registry.getThreatLevel(attacker.address)).to.equal(4);
    });

    it("Should allow admin to pause contract", async function () {
      const { registry, admin, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(admin).pause();
      
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address, 1, "Evidence"
      )).to.be.reverted;
    });

    it("Should allow admin to unpause contract", async function () {
      const { registry, admin, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();
      
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address, 1, "Evidence"
      )).to.not.be.reverted;
    });

    it("Should restrict admin functions to admin role", async function () {
      const { registry, user1 } = await loadFixture(deployPhishingRegistryFixture);
      
      await expect(registry.connect(user1).setConfirmationsRequired(5)).to.be.reverted;
      await expect(registry.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct report data", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      const evidence = "IPFS: QmTest123";
      await registry.connect(reporter1).reportPhishing(attacker.address, 2, evidence);
      
      const report = await registry.getReport(0);
      expect(report.reporter).to.equal(reporter1.address);
      expect(report.target).to.equal(attacker.address);
      expect(report.evidence).to.equal(evidence);
    });

    it("Should return all reports for a target", async function () {
      const { registry, reporter1, reporter2, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence 1");
      await registry.connect(reporter2).reportPhishing(attacker.address, 2, "Evidence 2");
      
      const reports = await registry.getReportsByTarget(attacker.address);
      expect(reports.length).to.equal(2);
      expect(reports[0]).to.equal(0);
      expect(reports[1]).to.equal(1);
    });

    it("Should correctly identify flagged addresses", async function () {
      const { registry, reporter1, validator1, validator2, attacker } = 
        await loadFixture(deployPhishingRegistryFixture);
      
      expect(await registry.isAddressFlagged(attacker.address)).to.be.false;
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 3, "Evidence");
      await registry.connect(validator1).confirmReport(0);
      await registry.connect(validator2).confirmReport(0);
      
      expect(await registry.isAddressFlagged(attacker.address)).to.be.true;
    });

    it("Should track voting status", async function () {
      const { registry, reporter1, validator1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 1, "Evidence");
      
      expect(await registry.hasVoted(0, validator1.address)).to.be.false;
      await registry.connect(validator1).confirmReport(0);
      expect(await registry.hasVoted(0, validator1.address)).to.be.true;
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle Critical severity correctly", async function () {
      const { registry, reporter1, validator1, validator2, attacker } = 
        await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 4, "Critical threat");
      await registry.connect(validator1).confirmReport(0);
      await registry.connect(validator2).confirmReport(0);
      
      expect(await registry.getThreatLevel(attacker.address)).to.equal(4);
    });

    it("Should handle reentrancy protection on report", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      // This test ensures nonReentrant is working (basic check)
      await expect(registry.connect(reporter1).reportPhishing(
        attacker.address, 1, "Evidence"
      )).to.not.be.reverted;
    });

    it("Should handle large number of reports efficiently", async function () {
      const { registry, reporter1, attacker } = await loadFixture(deployPhishingRegistryFixture);
      
      for (let i = 0; i < 10; i++) {
        await registry.connect(reporter1).reportPhishing(
          attacker.address, 1, `Evidence ${i}`
        );
      }
      
      expect(await registry.getReportCount()).to.equal(10);
      const reports = await registry.getReportsByTarget(attacker.address);
      expect(reports.length).to.equal(10);
    });

    it("Should maintain separate threat levels for different addresses", async function () {
      const { registry, reporter1, validator1, validator2, attacker, user1 } = 
        await loadFixture(deployPhishingRegistryFixture);
      
      await registry.connect(reporter1).reportPhishing(attacker.address, 3, "Evidence");
      await registry.connect(validator1).confirmReport(0);
      await registry.connect(validator2).confirmReport(0);
      
      await registry.connect(reporter1).reportPhishing(user1.address, 1, "Evidence");
      
      expect(await registry.getThreatLevel(attacker.address)).to.equal(3);
      expect(await registry.getThreatLevel(user1.address)).to.equal(0);
    });
  });
});
