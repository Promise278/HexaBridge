const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DomainRegistry", function () {
  async function deployDomainRegistryFixture() {
    const [admin, registrar1, registrar2, moderator1, moderator2, user1, user2] = 
      await ethers.getSigners();

    const DomainRegistry = await ethers.getContractFactory("DomainRegistry");
    const registry = await DomainRegistry.deploy();

    const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
    const MODERATOR_ROLE = await registry.MODERATOR_ROLE();
    const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await registry.grantRole(REGISTRAR_ROLE, registrar1.address);
    await registry.grantRole(REGISTRAR_ROLE, registrar2.address);
    await registry.grantRole(MODERATOR_ROLE, moderator1.address);
    await registry.grantRole(MODERATOR_ROLE, moderator2.address);

    return { 
      registry, admin, registrar1, registrar2, moderator1, moderator2, 
      user1, user2, REGISTRAR_ROLE, MODERATOR_ROLE, DEFAULT_ADMIN_ROLE 
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { registry, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployDomainRegistryFixture);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should initialize with correct suspicious threshold", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      expect(await registry.suspiciousThreshold()).to.equal(3);
    });

    it("Should start with zero domains", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      expect(await registry.getDomainCount()).to.equal(0);
      expect(await registry.getBlockedCount()).to.equal(0);
    });
  });

  describe("Register Domain", function () {
    it("Should allow registrar to register a domain", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "uniswap.org";
      const contentHash = ethers.id("content-hash-1");
      
      await expect(registry.connect(registrar1).registerDomain(domain, contentHash))
        .to.emit(registry, "DomainRegistered")
        .withArgs(ethers.id(domain), domain, registrar1.address);
      
      expect(await registry.getDomainCount()).to.equal(1);
    });

    it("Should store domain with Verified status", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "aave.com";
      const contentHash = ethers.id("content-hash-2");
      
      await registry.connect(registrar1).registerDomain(domain, contentHash);
      
      const info = await registry.getDomainInfo(domain);
      expect(info.domain).to.equal(domain);
      expect(info.contentHash).to.equal(contentHash);
      expect(info.status).to.equal(1); // Verified
      expect(info.registeredBy).to.equal(registrar1.address);
      expect(info.exists).to.be.true;
    });

    it("Should revert with empty domain", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(registrar1).registerDomain(
        "", ethers.id("hash")
      )).to.be.revertedWithCustomError(registry, "EmptyDomain");
    });

    it("Should revert with zero content hash", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(registrar1).registerDomain(
        "domain.com", ethers.ZeroHash
      )).to.be.revertedWithCustomError(registry, "EmptyHash");
    });

    it("Should revert when domain already registered", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "duplicate.com";
      const hash = ethers.id("hash1");
      
      await registry.connect(registrar1).registerDomain(domain, hash);
      
      await expect(registry.connect(registrar1).registerDomain(domain, hash))
        .to.be.revertedWithCustomError(registry, "DomainAlreadyRegistered");
    });

    it("Should revert when non-registrar tries to register", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(user1).registerDomain(
        "test.com", ethers.id("hash")
      )).to.be.reverted;
    });

    it("Should allow multiple domains to be registered", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(registrar1).registerDomain("domain1.com", ethers.id("h1"));
      await registry.connect(registrar1).registerDomain("domain2.com", ethers.id("h2"));
      await registry.connect(registrar1).registerDomain("domain3.com", ethers.id("h3"));
      
      expect(await registry.getDomainCount()).to.equal(3);
    });
  });

  describe("Verify Domain", function () {
    it("Should return correct status for registered domain", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "verified.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      
      const [registered, status] = await registry.verifyDomain(domain);
      expect(registered).to.be.true;
      expect(status).to.equal(1); // Verified
    });

    it("Should return unregistered for unknown domain", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      const [registered, status] = await registry.verifyDomain("unknown.com");
      expect(registered).to.be.false;
      expect(status).to.equal(0); // Unregistered
    });
  });

  describe("Report Malicious Domain", function () {
    it("Should allow anyone to report a malicious domain", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "phishing-site.com";
      const evidence = "Clone of uniswap.org";
      
      await expect(registry.connect(user1).reportMaliciousDomain(domain, evidence))
        .to.emit(registry, "MaliciousDomainReported");
    });

    it("Should auto-register unknown domain when reported", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "new-phishing.com";
      await registry.connect(user1).reportMaliciousDomain(domain, "Suspicious behavior");
      
      const info = await registry.getDomainInfo(domain);
      expect(info.exists).to.be.true;
      expect(info.status).to.equal(0); // Unregistered
      expect(info.reportCount).to.equal(1);
    });

    it("Should increment report count", async function () {
      const { registry, user1, user2 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "scam.com";
      await registry.connect(user1).reportMaliciousDomain(domain, "Evidence 1");
      await registry.connect(user2).reportMaliciousDomain(domain, "Evidence 2");
      
      const info = await registry.getDomainInfo(domain);
      expect(info.reportCount).to.equal(2);
    });

    it("Should mark domain as Suspicious after threshold reached", async function () {
      const { registry, user1, user2 } = await loadFixture(deployDomainRegistryFixture);
      const [, , , , , , user3] = await ethers.getSigners();
      
      const domain = "sus-domain.com";
      
      await registry.connect(user1).reportMaliciousDomain(domain, "Report 1");
      await registry.connect(user2).reportMaliciousDomain(domain, "Report 2");
      
      let info = await registry.getDomainInfo(domain);
      expect(info.status).to.equal(0); // Still Unregistered
      
      await expect(registry.connect(user3).reportMaliciousDomain(domain, "Report 3"))
        .to.emit(registry, "DomainStatusUpdated")
        .withArgs(ethers.id(domain), 0, 2); // 0=Unregistered, 2=Suspicious
      
      info = await registry.getDomainInfo(domain);
      expect(info.status).to.equal(2); // Suspicious
    });

    it("Should store evidence for reported domain", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "malicious.com";
      const evidence1 = "IPFS: QmTest1";
      const evidence2 = "Screenshot URL";
      
      await registry.connect(user1).reportMaliciousDomain(domain, evidence1);
      await registry.connect(user1).reportMaliciousDomain(domain, evidence2);
      
      const evidenceArray = await registry.getDomainEvidence(domain);
      expect(evidenceArray.length).to.equal(2);
      expect(evidenceArray[0]).to.equal(evidence1);
      expect(evidenceArray[1]).to.equal(evidence2);
    });

    it("Should revert with empty domain", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(user1).reportMaliciousDomain("", "Evidence"))
        .to.be.revertedWithCustomError(registry, "EmptyDomain");
    });

    it("Should revert with empty evidence", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(user1).reportMaliciousDomain("domain.com", ""))
        .to.be.revertedWithCustomError(registry, "EmptyEvidence");
    });
  });

  describe("Block Domain", function () {
    it("Should allow moderator to block a domain", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "to-block.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      
      await expect(registry.connect(moderator1).blockDomain(domain))
        .to.emit(registry, "DomainBlocked")
        .withArgs(ethers.id(domain), domain);
    });

    it("Should update domain status to Blocked", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "blocked.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      await registry.connect(moderator1).blockDomain(domain);
      
      const status = await registry.getDomainStatus(domain);
      expect(status).to.equal(3); // Blocked
    });

    it("Should increment blocked count", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(registrar1).registerDomain("block1.com", ethers.id("h1"));
      await registry.connect(registrar1).registerDomain("block2.com", ethers.id("h2"));
      
      expect(await registry.getBlockedCount()).to.equal(0);
      
      await registry.connect(moderator1).blockDomain("block1.com");
      expect(await registry.getBlockedCount()).to.equal(1);
      
      await registry.connect(moderator1).blockDomain("block2.com");
      expect(await registry.getBlockedCount()).to.equal(2);
    });

    it("Should revert when blocking unregistered domain", async function () {
      const { registry, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(moderator1).blockDomain("not-exists.com"))
        .to.be.revertedWithCustomError(registry, "DomainNotRegistered");
    });

    it("Should revert when domain already blocked", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "already-blocked.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      await registry.connect(moderator1).blockDomain(domain);
      
      await expect(registry.connect(moderator1).blockDomain(domain))
        .to.be.revertedWithCustomError(registry, "DomainAlreadyBlocked");
    });

    it("Should revert when non-moderator tries to block", async function () {
      const { registry, registrar1, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "test.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      
      await expect(registry.connect(user1).blockDomain(domain)).to.be.reverted;
    });
  });

  describe("Unblock Domain", function () {
    it("Should allow moderator to unblock a domain", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "to-unblock.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      await registry.connect(moderator1).blockDomain(domain);
      
      await expect(registry.connect(moderator1).unblockDomain(domain))
        .to.emit(registry, "DomainUnblocked")
        .withArgs(ethers.id(domain), domain);
    });

    it("Should update domain status to Verified after unblock", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "unblocked.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      await registry.connect(moderator1).blockDomain(domain);
      await registry.connect(moderator1).unblockDomain(domain);
      
      const status = await registry.getDomainStatus(domain);
      expect(status).to.equal(1); // Verified
    });

    it("Should decrement blocked count", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(registrar1).registerDomain("block1.com", ethers.id("h1"));
      await registry.connect(moderator1).blockDomain("block1.com");
      
      expect(await registry.getBlockedCount()).to.equal(1);
      
      await registry.connect(moderator1).unblockDomain("block1.com");
      expect(await registry.getBlockedCount()).to.equal(0);
    });

    it("Should revert when unblocking non-blocked domain", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "not-blocked.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      
      await expect(registry.connect(moderator1).unblockDomain(domain))
        .to.be.revertedWithCustomError(registry, "DomainNotBlocked");
    });
  });

  describe("Domain Similarity Check", function () {
    it("Should return 100% similarity for identical domains", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      const score = await registry.checkDomainSimilarity("uniswap.org", "uniswap.org");
      expect(score).to.equal(100);
    });

    it("Should calculate similarity for similar domains", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      // "uniswap" vs "uniswaр" (last char different)
      const score = await registry.checkDomainSimilarity("uniswap", "uniswaq");
      expect(score).to.be.greaterThan(70);
    });

    it("Should return 0 for empty strings", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      const score1 = await registry.checkDomainSimilarity("", "domain.com");
      const score2 = await registry.checkDomainSimilarity("domain.com", "");
      
      expect(score1).to.equal(0);
      expect(score2).to.equal(0);
    });

    it("Should handle different length domains", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      const score = await registry.checkDomainSimilarity("uni", "uniswap");
      expect(score).to.be.greaterThan(0);
      expect(score).to.be.lessThan(100);
    });

    it("Should calculate low similarity for completely different domains", async function () {
      const { registry } = await loadFixture(deployDomainRegistryFixture);
      
      const score = await registry.checkDomainSimilarity("aave.com", "xyz123.net");
      expect(score).to.be.lessThan(30);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to set suspicious threshold", async function () {
      const { registry, admin } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(admin).setSuspiciousThreshold(5))
        .to.emit(registry, "SuspiciousThresholdUpdated")
        .withArgs(3, 5);
      
      expect(await registry.suspiciousThreshold()).to.equal(5);
    });

    it("Should revert when setting threshold to zero", async function () {
      const { registry, admin } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(admin).setSuspiciousThreshold(0))
        .to.be.revertedWithCustomError(registry, "InvalidThreshold");
    });

    it("Should allow admin to pause contract", async function () {
      const { registry, admin, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(admin).pause();
      
      await expect(registry.connect(registrar1).registerDomain(
        "test.com", ethers.id("hash")
      )).to.be.reverted;
    });

    it("Should allow admin to unpause contract", async function () {
      const { registry, admin, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(admin).pause();
      await registry.connect(admin).unpause();
      
      await expect(registry.connect(registrar1).registerDomain(
        "test.com", ethers.id("hash")
      )).to.not.be.reverted;
    });

    it("Should restrict admin functions to admin role", async function () {
      const { registry, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      await expect(registry.connect(user1).setSuspiciousThreshold(10)).to.be.reverted;
      await expect(registry.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct domain info", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "info-test.com";
      const hash = ethers.id("content");
      
      await registry.connect(registrar1).registerDomain(domain, hash);
      
      const info = await registry.getDomainInfo(domain);
      expect(info.domain).to.equal(domain);
      expect(info.contentHash).to.equal(hash);
      expect(info.registeredBy).to.equal(registrar1.address);
    });

    it("Should return all evidence for a domain", async function () {
      const { registry, user1, user2 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "evidence-test.com";
      await registry.connect(user1).reportMaliciousDomain(domain, "Evidence A");
      await registry.connect(user2).reportMaliciousDomain(domain, "Evidence B");
      
      const evidence = await registry.getDomainEvidence(domain);
      expect(evidence.length).to.equal(2);
    });

    it("Should return correct status via getDomainStatus", async function () {
      const { registry, registrar1, moderator1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "status-test.com";
      
      // Unregistered
      expect(await registry.getDomainStatus(domain)).to.equal(0);
      
      // Verified
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      expect(await registry.getDomainStatus(domain)).to.equal(1);
      
      // Blocked
      await registry.connect(moderator1).blockDomain(domain);
      expect(await registry.getDomainStatus(domain)).to.equal(3);
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle domains with special characters", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "test-domain_123.com";
      await expect(registry.connect(registrar1).registerDomain(domain, ethers.id("hash")))
        .to.not.be.reverted;
    });

    it("Should handle very long domain names", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      const longDomain = "a".repeat(200) + ".com";
      await expect(registry.connect(registrar1).registerDomain(longDomain, ethers.id("hash")))
        .to.not.be.reverted;
    });

    it("Should allow reporting of already registered domains", async function () {
      const { registry, registrar1, user1 } = await loadFixture(deployDomainRegistryFixture);
      
      const domain = "legitimate-but-reported.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      
      await expect(registry.connect(user1).reportMaliciousDomain(domain, "False report"))
        .to.not.be.reverted;
      
      const info = await registry.getDomainInfo(domain);
      expect(info.reportCount).to.equal(1);
    });

    it("Should not change status to Suspicious if already Blocked", async function () {
      const { registry, registrar1, moderator1, user1, user2 } = 
        await loadFixture(deployDomainRegistryFixture);
      const [, , , , , , , user3] = await ethers.getSigners();
      
      const domain = "blocked-domain.com";
      await registry.connect(registrar1).registerDomain(domain, ethers.id("hash"));
      await registry.connect(moderator1).blockDomain(domain);
      
      // Report multiple times
      await registry.connect(user1).reportMaliciousDomain(domain, "Report 1");
      await registry.connect(user2).reportMaliciousDomain(domain, "Report 2");
      await registry.connect(user3).reportMaliciousDomain(domain, "Report 3");
      
      // Should remain Blocked
      expect(await registry.getDomainStatus(domain)).to.equal(3);
    });

    it("Should handle case-sensitive domain names", async function () {
      const { registry, registrar1 } = await loadFixture(deployDomainRegistryFixture);
      
      await registry.connect(registrar1).registerDomain("UniSwap.org", ethers.id("h1"));
      await registry.connect(registrar1).registerDomain("uniswap.org", ethers.id("h2"));
      
      // Both should be registered as different domains
      expect(await registry.getDomainCount()).to.equal(2);
    });
  });
});
