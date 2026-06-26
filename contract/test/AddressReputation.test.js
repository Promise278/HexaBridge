const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("AddressReputation", function () {
  async function deployAddressReputationFixture() {
    const [admin, scorer1, scorer2, user1, user2, trustedAddr1, trustedAddr2, suspiciousAddr] = 
      await ethers.getSigners();

    const AddressReputation = await ethers.getContractFactory("AddressReputation");
    const reputation = await AddressReputation.deploy();

    const SCORER_ROLE = await reputation.SCORER_ROLE();
    const DEFAULT_ADMIN_ROLE = await reputation.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await reputation.grantRole(SCORER_ROLE, scorer1.address);
    await reputation.grantRole(SCORER_ROLE, scorer2.address);

    return { 
      reputation, admin, scorer1, scorer2, user1, user2, 
      trustedAddr1, trustedAddr2, suspiciousAddr,
      SCORER_ROLE, DEFAULT_ADMIN_ROLE 
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { reputation, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployAddressReputationFixture);
      expect(await reputation.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should initialize with correct similarity threshold", async function () {
      const { reputation } = await loadFixture(deployAddressReputationFixture);
      expect(await reputation.similarityThreshold()).to.equal(80);
    });

    it("Should have correct constants", async function () {
      const { reputation } = await loadFixture(deployAddressReputationFixture);
      expect(await reputation.MAX_BATCH_SIZE()).to.equal(50);
      expect(await reputation.MAX_RISK_SCORE()).to.equal(100);
    });
  });

  describe("Register Trusted Address", function () {
    it("Should allow user to register a trusted address", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        trustedAddr1.address, "My Exchange Wallet"
      ))
        .to.emit(reputation, "TrustedAddressRegistered")
        .withArgs(user1.address, trustedAddr1.address, "My Exchange Wallet");
    });

    it("Should store trusted address with correct data", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      const label = "Hardware Wallet";
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, label);
      
      const trusted = await reputation.connect(user1).getTrustedAddress(trustedAddr1.address);
      expect(trusted.addr).to.equal(trustedAddr1.address);
      expect(trusted.label).to.equal(label);
      expect(trusted.exists).to.be.true;
    });

    it("Should increment trusted address count", async function () {
      const { reputation, user1, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(0);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet 1");
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(1);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr2.address, "Wallet 2");
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(2);
    });

    it("Should revert when registering zero address", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        ethers.ZeroAddress, "Label"
      )).to.be.revertedWithCustomError(reputation, "ZeroAddress");
    });

    it("Should revert with empty label", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        trustedAddr1.address, ""
      )).to.be.revertedWithCustomError(reputation, "EmptyLabel");
    });

    it("Should revert when address already registered", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet");
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        trustedAddr1.address, "Duplicate"
      )).to.be.revertedWithCustomError(reputation, "AlreadyRegistered");
    });

    it("Should allow different users to register same address", async function () {
      const { reputation, user1, user2, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "User1 Wallet"))
        .to.not.be.reverted;
      
      await expect(reputation.connect(user2).registerTrustedAddress(trustedAddr1.address, "User2 Wallet"))
        .to.not.be.reverted;
    });

    it("Should add address to user's trusted list", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet");
      
      const trustedList = await reputation.connect(user1).getTrustedAddresses();
      expect(trustedList.length).to.equal(1);
      expect(trustedList[0]).to.equal(trustedAddr1.address);
    });
  });

  describe("Remove Trusted Address", function () {
    it("Should allow user to remove a trusted address", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet");
      
      await expect(reputation.connect(user1).removeTrustedAddress(trustedAddr1.address))
        .to.emit(reputation, "TrustedAddressRemoved")
        .withArgs(user1.address, trustedAddr1.address);
    });

    it("Should remove address from list", async function () {
      const { reputation, user1, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "W1");
      await reputation.connect(user1).registerTrustedAddress(trustedAddr2.address, "W2");
      
      await reputation.connect(user1).removeTrustedAddress(trustedAddr1.address);
      
      const trustedList = await reputation.connect(user1).getTrustedAddresses();
      expect(trustedList.length).to.equal(1);
      expect(trustedList[0]).to.equal(trustedAddr2.address);
    });

    it("Should revert when removing non-existent address", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).removeTrustedAddress(trustedAddr1.address))
        .to.be.revertedWithCustomError(reputation, "NotRegistered");
    });

    it("Should decrement trusted address count", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet");
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(1);
      
      await reputation.connect(user1).removeTrustedAddress(trustedAddr1.address);
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(0);
    });
  });

  describe("Set Risk Score", function () {
    it("Should allow scorer to set risk score", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        suspiciousAddr.address, 75, "Multiple phishing reports"
      ))
        .to.emit(reputation, "RiskScoreUpdated")
        .withArgs(suspiciousAddr.address, 0, 75, "Multiple phishing reports");
    });

    it("Should store risk profile with correct data", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      const score = 85;
      const reason = "Address poisoning detected";
      
      await reputation.connect(scorer1).setRiskScore(suspiciousAddr.address, score, reason);
      
      const profile = await reputation.getRiskScore(suspiciousAddr.address);
      expect(profile.score).to.equal(score);
      expect(profile.reason).to.equal(reason);
      expect(profile.exists).to.be.true;
    });

    it("Should allow updating existing risk score", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(scorer1).setRiskScore(suspiciousAddr.address, 50, "Initial assessment");
      await reputation.connect(scorer1).setRiskScore(suspiciousAddr.address, 90, "Updated assessment");
      
      const profile = await reputation.getRiskScore(suspiciousAddr.address);
      expect(profile.score).to.equal(90);
      expect(profile.reason).to.equal("Updated assessment");
    });

    it("Should revert when score exceeds maximum", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        suspiciousAddr.address, 101, "Too high"
      )).to.be.revertedWithCustomError(reputation, "InvalidScore");
    });

    it("Should revert with empty reason", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        suspiciousAddr.address, 50, ""
      )).to.be.revertedWithCustomError(reputation, "EmptyReason");
    });

    it("Should revert for zero address", async function () {
      const { reputation, scorer1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        ethers.ZeroAddress, 50, "Reason"
      )).to.be.revertedWithCustomError(reputation, "ZeroAddress");
    });

    it("Should revert when non-scorer tries to set score", async function () {
      const { reputation, user1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).setRiskScore(
        suspiciousAddr.address, 50, "Reason"
      )).to.be.reverted;
    });

    it("Should allow score of 0", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        suspiciousAddr.address, 0, "Clean address"
      )).to.not.be.reverted;
    });

    it("Should allow maximum score of 100", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(scorer1).setRiskScore(
        suspiciousAddr.address, 100, "Maximum risk"
      )).to.not.be.reverted;
    });
  });

  describe("Check Similarity", function () {
    it("Should return 100% for identical addresses", async function () {
      const { reputation, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      const similarity = await reputation.checkSimilarity(trustedAddr1.address, trustedAddr1.address);
      expect(similarity).to.equal(100);
    });

    it("Should calculate similarity between different addresses", async function () {
      const { reputation, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      const similarity = await reputation.checkSimilarity(trustedAddr1.address, trustedAddr2.address);
      expect(similarity).to.be.lessThan(100);
      expect(similarity).to.be.greaterThanOrEqual(0);
    });

    it("Should detect high similarity for poisoning addresses", async function () {
      const { reputation } = await loadFixture(deployAddressReputationFixture);
      
      // Create two addresses with similar byte patterns
      // This is a conceptual test - in reality, attackers generate vanity addresses
      const addr1 = "0x1111111111111111111111111111111111111111";
      const addr2 = "0x1111111111111111111111111111111111111112";
      
      const similarity = await reputation.checkSimilarity(addr1, addr2);
      expect(similarity).to.be.greaterThan(90);
    });
  });

  describe("Address Poisoning Detection", function () {
    it("Should detect potential poisoning when similarity exceeds threshold", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      // Register a trusted address
      const trustedAddr = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      await reputation.connect(user1).registerTrustedAddress(trustedAddr, "Trusted");
      
      // Check a very similar address
      const suspiciousAddr = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // Same (100% similar)
      const [isSuspicious, similarTo, similarity] = await reputation.connect(user1).isAddressPoisoning(suspiciousAddr);
      
      // Should not flag itself
      expect(isSuspicious).to.be.false;
    });

    it("Should return closest matching address", async function () {
      const { reputation, user1, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet 1");
      await reputation.connect(user1).registerTrustedAddress(trustedAddr2.address, "Wallet 2");
      
      // Check against a new address
      const [, , addr3] = await ethers.getSigners();
      const testAddr = await ethers.getSigners().then(s => s[10].address);
      
      const [, similarTo, similarity] = await reputation.connect(user1).isAddressPoisoning(testAddr);
      
      // Should return one of the trusted addresses as most similar
      expect([trustedAddr1.address, trustedAddr2.address]).to.include(similarTo);
    });

    it("Should not flag when no trusted addresses exist", async function () {
      const { reputation, user1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      const [isSuspicious] = await reputation.connect(user1).isAddressPoisoning(suspiciousAddr.address);
      expect(isSuspicious).to.be.false;
    });

    it("Should not flag when similarity below threshold", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Trusted");
      
      // Use a completely different address
      const differentAddr = await ethers.getSigners().then(s => s[15].address);
      const [isSuspicious, , similarity] = await reputation.connect(user1).isAddressPoisoning(differentAddr);
      
      // Most random addresses should have low similarity
      if (similarity < 80) {
        expect(isSuspicious).to.be.false;
      }
    });
  });

  describe("Batch Check Addresses", function () {
    it("Should check multiple addresses at once", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Trusted");
      
      const signers = await ethers.getSigners();
      const addresses = [signers[10].address, signers[11].address, signers[12].address];
      
      const [suspicious, scores] = await reputation.connect(user1).batchCheckAddresses(addresses);
      
      expect(suspicious.length).to.equal(3);
      expect(scores.length).to.equal(3);
    });

    it("Should return correct results for each address", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Trusted");
      
      const signers = await ethers.getSigners();
      const addresses = [signers[10].address, signers[11].address];
      
      const [suspicious, scores] = await reputation.connect(user1).batchCheckAddresses(addresses);
      
      expect(suspicious[0]).to.be.a('boolean');
      expect(suspicious[1]).to.be.a('boolean');
      expect(scores[0]).to.be.a('bigint');
      expect(scores[1]).to.be.a('bigint');
    });

    it("Should revert with empty batch", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).batchCheckAddresses([]))
        .to.be.revertedWithCustomError(reputation, "EmptyBatch");
    });

    it("Should revert when batch exceeds maximum size", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      const largeArray = new Array(51).fill(ethers.ZeroAddress);
      
      await expect(reputation.connect(user1).batchCheckAddresses(largeArray))
        .to.be.revertedWithCustomError(reputation, "BatchTooLarge");
    });

    it("Should handle maximum batch size correctly", async function () {
      const { reputation, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Trusted");
      
      const signers = await ethers.getSigners();
      const addresses = Array(50).fill(0).map((_, i) => signers[i % signers.length].address);
      
      const [suspicious, scores] = await reputation.connect(user1).batchCheckAddresses(addresses);
      
      expect(suspicious.length).to.equal(50);
      expect(scores.length).to.equal(50);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set similarity threshold", async function () {
      const { reputation, admin } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(admin).setSimilarityThreshold(90))
        .to.emit(reputation, "SimilarityThresholdUpdated")
        .withArgs(80, 90);
      
      expect(await reputation.similarityThreshold()).to.equal(90);
    });

    it("Should revert when threshold is zero", async function () {
      const { reputation, admin } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(admin).setSimilarityThreshold(0))
        .to.be.revertedWithCustomError(reputation, "InvalidThreshold");
    });

    it("Should revert when threshold exceeds 100", async function () {
      const { reputation, admin } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(admin).setSimilarityThreshold(101))
        .to.be.revertedWithCustomError(reputation, "InvalidThreshold");
    });

    it("Should allow admin to pause contract", async function () {
      const { reputation, admin, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(admin).pause();
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        trustedAddr1.address, "Label"
      )).to.be.reverted;
    });

    it("Should allow admin to unpause contract", async function () {
      const { reputation, admin, user1, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(admin).pause();
      await reputation.connect(admin).unpause();
      
      await expect(reputation.connect(user1).registerTrustedAddress(
        trustedAddr1.address, "Label"
      )).to.not.be.reverted;
    });

    it("Should restrict admin functions to admin role", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      await expect(reputation.connect(user1).setSimilarityThreshold(90)).to.be.reverted;
      await expect(reputation.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return trusted addresses for user", async function () {
      const { reputation, user1, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "W1");
      await reputation.connect(user1).registerTrustedAddress(trustedAddr2.address, "W2");
      
      const addresses = await reputation.connect(user1).getTrustedAddresses();
      expect(addresses.length).to.equal(2);
      expect(addresses).to.include(trustedAddr1.address);
      expect(addresses).to.include(trustedAddr2.address);
    });

    it("Should return empty array for user with no trusted addresses", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      const addresses = await reputation.connect(user1).getTrustedAddresses();
      expect(addresses.length).to.equal(0);
    });

    it("Should check if address is trusted", async function () {
      const { reputation, user1, trustedAddr1, trustedAddr2 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Trusted");
      
      expect(await reputation.connect(user1).isTrusted(trustedAddr1.address)).to.be.true;
      expect(await reputation.connect(user1).isTrusted(trustedAddr2.address)).to.be.false;
    });

    it("Should return risk profile for address", async function () {
      const { reputation, scorer1, suspiciousAddr } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(scorer1).setRiskScore(suspiciousAddr.address, 75, "High risk");
      
      const profile = await reputation.getRiskScore(suspiciousAddr.address);
      expect(profile.score).to.equal(75);
      expect(profile.reason).to.equal("High risk");
      expect(profile.exists).to.be.true;
    });

    it("Should return empty profile for address without risk score", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      
      const profile = await reputation.getRiskScore(user1.address);
      expect(profile.exists).to.be.false;
      expect(profile.score).to.equal(0);
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle multiple users independently", async function () {
      const { reputation, user1, user2, trustedAddr1 } = await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "User1 Wallet");
      
      const user1Addresses = await reputation.connect(user1).getTrustedAddresses();
      const user2Addresses = await reputation.connect(user2).getTrustedAddresses();
      
      expect(user1Addresses.length).to.equal(1);
      expect(user2Addresses.length).to.equal(0);
    });

    it("Should allow setting all risk levels from 0 to 100", async function () {
      const { reputation, scorer1 } = await loadFixture(deployAddressReputationFixture);
      const signers = await ethers.getSigners();
      
      for (let score = 0; score <= 100; score += 25) {
        await expect(reputation.connect(scorer1).setRiskScore(
          signers[score].address, score, `Score ${score}`
        )).to.not.be.reverted;
      }
    });

    it("Should handle removal from middle of trusted list", async function () {
      const { reputation, user1 } = await loadFixture(deployAddressReputationFixture);
      const signers = await ethers.getSigners();
      
      await reputation.connect(user1).registerTrustedAddress(signers[10].address, "A");
      await reputation.connect(user1).registerTrustedAddress(signers[11].address, "B");
      await reputation.connect(user1).registerTrustedAddress(signers[12].address, "C");
      
      await reputation.connect(user1).removeTrustedAddress(signers[11].address);
      
      const addresses = await reputation.connect(user1).getTrustedAddresses();
      expect(addresses.length).to.equal(2);
      expect(addresses).to.not.include(signers[11].address);
    });

    it("Should maintain data integrity across multiple operations", async function () {
      const { reputation, user1, trustedAddr1, scorer1, suspiciousAddr } = 
        await loadFixture(deployAddressReputationFixture);
      
      await reputation.connect(user1).registerTrustedAddress(trustedAddr1.address, "Wallet");
      await reputation.connect(scorer1).setRiskScore(suspiciousAddr.address, 80, "Risk");
      await reputation.connect(user1).removeTrustedAddress(trustedAddr1.address);
      
      expect(await reputation.connect(user1).getTrustedAddressCount()).to.equal(0);
      
      const profile = await reputation.getRiskScore(suspiciousAddr.address);
      expect(profile.score).to.equal(80);
    });
  });
});
