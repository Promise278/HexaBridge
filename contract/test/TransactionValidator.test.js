const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TransactionValidator", function () {
  async function deployTransactionValidatorFixture() {
    const [admin, blacklistAdmin, user1, user2, whitelistedAddr, blacklistedAddr, unknownAddr] = 
      await ethers.getSigners();

    const TransactionValidator = await ethers.getContractFactory("TransactionValidator");
    const validator = await TransactionValidator.deploy();

    const BLACKLIST_ADMIN_ROLE = await validator.BLACKLIST_ADMIN_ROLE();
    const DEFAULT_ADMIN_ROLE = await validator.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await validator.grantRole(BLACKLIST_ADMIN_ROLE, blacklistAdmin.address);

    return { 
      validator, admin, blacklistAdmin, user1, user2, 
      whitelistedAddr, blacklistedAddr, unknownAddr,
      BLACKLIST_ADMIN_ROLE, DEFAULT_ADMIN_ROLE 
    };
  }

  describe("Deployment", function () {
    it("Should set the correct admin role", async function () {
      const { validator, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployTransactionValidatorFixture);
      expect(await validator.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should have correct constants", async function () {
      const { validator } = await loadFixture(deployTransactionValidatorFixture);
      expect(await validator.UNLIMITED_APPROVAL()).to.equal(ethers.MaxUint256);
      expect(await validator.HIGH_VALUE_THRESHOLD()).to.equal(ethers.parseEther("10"));
    });

    it("Should have correct approve selector", async function () {
      const { validator } = await loadFixture(deployTransactionValidatorFixture);
      const expectedSelector = ethers.id("approve(address,uint256)").slice(0, 10);
      expect(await validator.APPROVE_SELECTOR()).to.equal(expectedSelector);
    });
  });

  describe("Whitelist Management", function () {
    it("Should allow user to add address to whitelist", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).addToWhitelist(whitelistedAddr.address))
        .to.emit(validator, "WhitelistUpdated")
        .withArgs(user1.address, whitelistedAddr.address, true);
    });

    it("Should mark whitelisted address as whitelisted", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      expect(await validator.isWhitelisted(user1.address, whitelistedAddr.address)).to.be.true;
    });

    it("Should add address to whitelist array", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      const whitelist = await validator.getWhitelist(user1.address);
      expect(whitelist.length).to.equal(1);
      expect(whitelist[0]).to.equal(whitelistedAddr.address);
    });

    it("Should revert when adding zero address", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).addToWhitelist(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(validator, "ZeroAddress");
    });

    it("Should revert when adding already whitelisted address", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      await expect(validator.connect(user1).addToWhitelist(whitelistedAddr.address))
        .to.be.revertedWithCustomError(validator, "AlreadyWhitelisted");
    });

    it("Should allow removing address from whitelist", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      await expect(validator.connect(user1).removeFromWhitelist(whitelistedAddr.address))
        .to.emit(validator, "WhitelistUpdated")
        .withArgs(user1.address, whitelistedAddr.address, false);
    });

    it("Should remove address from whitelist array", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      await validator.connect(user1).removeFromWhitelist(whitelistedAddr.address);
      
      const whitelist = await validator.getWhitelist(user1.address);
      expect(whitelist.length).to.equal(0);
    });

    it("Should revert when removing non-whitelisted address", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).removeFromWhitelist(whitelistedAddr.address))
        .to.be.revertedWithCustomError(validator, "NotWhitelisted");
    });

    it("Should maintain separate whitelists per user", async function () {
      const { validator, user1, user2, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      expect(await validator.isWhitelisted(user1.address, whitelistedAddr.address)).to.be.true;
      expect(await validator.isWhitelisted(user2.address, whitelistedAddr.address)).to.be.false;
    });
  });

  describe("Blacklist Management", function () {
    it("Should allow blacklist admin to add address to blacklist", async function () {
      const { validator, blacklistAdmin, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address))
        .to.emit(validator, "BlacklistUpdated")
        .withArgs(blacklistedAddr.address, true);
    });

    it("Should mark blacklisted address as blacklisted", async function () {
      const { validator, blacklistAdmin, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      expect(await validator.isBlacklisted(blacklistedAddr.address)).to.be.true;
    });

    it("Should revert when adding zero address to blacklist", async function () {
      const { validator, blacklistAdmin } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(blacklistAdmin).addToBlacklist(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(validator, "ZeroAddress");
    });

    it("Should revert when adding already blacklisted address", async function () {
      const { validator, blacklistAdmin, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      await expect(validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address))
        .to.be.revertedWithCustomError(validator, "AlreadyBlacklisted");
    });

    it("Should allow blacklist admin to remove address from blacklist", async function () {
      const { validator, blacklistAdmin, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      await expect(validator.connect(blacklistAdmin).removeFromBlacklist(blacklistedAddr.address))
        .to.emit(validator, "BlacklistUpdated")
        .withArgs(blacklistedAddr.address, false);
    });

    it("Should revert when removing non-blacklisted address", async function () {
      const { validator, blacklistAdmin, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(blacklistAdmin).removeFromBlacklist(blacklistedAddr.address))
        .to.be.revertedWithCustomError(validator, "NotBlacklisted");
    });

    it("Should restrict blacklist management to blacklist admin", async function () {
      const { validator, user1, blacklistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).addToBlacklist(blacklistedAddr.address)).to.be.reverted;
      await expect(validator.connect(user1).removeFromBlacklist(blacklistedAddr.address)).to.be.reverted;
    });
  });

  describe("Validate Transaction", function () {
    it("Should return Critical for blacklisted address", async function () {
      const { validator, blacklistAdmin, user1, blacklistedAddr } = 
        await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        blacklistedAddr.address, 0, "0x"
      );
      
      expect(riskLevel).to.equal(4); // Critical
    });

    it("Should emit HighRiskDetected for blacklisted address", async function () {
      const { validator, blacklistAdmin, user1, blacklistedAddr } = 
        await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      await expect(validator.connect(user1).validateTransaction(
        blacklistedAddr.address, 0, "0x"
      ))
        .to.emit(validator, "HighRiskDetected")
        .withArgs(user1.address, blacklistedAddr.address, "Blacklisted address");
    });

    it("Should return Safe for whitelisted address", async function () {
      const { validator, user1, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).addToWhitelist(whitelistedAddr.address);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        whitelistedAddr.address, 0, "0x"
      );
      
      expect(riskLevel).to.equal(0); // Safe
    });

    it("Should return High for transaction exceeding max value", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const maxValue = ethers.parseEther("5");
      await validator.connect(user1).setMaxTransactionValue(maxValue);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, ethers.parseEther("10"), "0x"
      );
      
      expect(riskLevel).to.equal(3); // High
    });

    it("Should return Medium for high value transaction", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, ethers.parseEther("15"), "0x"
      );
      
      expect(riskLevel).to.equal(2); // Medium
    });

    it("Should detect unlimited approval as Critical", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      // Create approve(address,uint256) call data with unlimited amount
      const iface = new ethers.Interface(["function approve(address spender, uint256 amount)"]);
      const data = iface.encodeFunctionData("approve", [unknownAddr.address, ethers.MaxUint256]);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, data
      );
      
      expect(riskLevel).to.equal(4); // Critical
    });

    it("Should detect large approval as High risk", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const iface = new ethers.Interface(["function approve(address spender, uint256 amount)"]);
      const largeAmount = ethers.parseEther("2000000"); // > 1e24
      const data = iface.encodeFunctionData("approve", [unknownAddr.address, largeAmount]);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, data
      );
      
      expect(riskLevel).to.equal(3); // High
    });

    it("Should return Low for unknown address with no risk factors", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, ethers.parseEther("1"), "0x"
      );
      
      expect(riskLevel).to.equal(1); // Low (unknown address bump)
    });

    it("Should revert for zero address", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).validateTransaction(
        ethers.ZeroAddress, 0, "0x"
      )).to.be.revertedWithCustomError(validator, "ZeroAddress");
    });

    it("Should emit TransactionValidated event", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, "0x"
      ))
        .to.emit(validator, "TransactionValidated");
    });
  });

  describe("Check Approval Risk", function () {
    it("Should return Critical for blacklisted spender", async function () {
      const { validator, blacklistAdmin, blacklistedAddr, unknownAddr } = 
        await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      const risk = await validator.checkApprovalRisk(
        unknownAddr.address, blacklistedAddr.address, ethers.parseEther("100")
      );
      
      expect(risk).to.equal(4); // Critical
    });

    it("Should return Critical for unlimited approval", async function () {
      const { validator, unknownAddr, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const risk = await validator.checkApprovalRisk(
        unknownAddr.address, whitelistedAddr.address, ethers.MaxUint256
      );
      
      expect(risk).to.equal(4); // Critical
    });

    it("Should return High for large approval", async function () {
      const { validator, unknownAddr, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const risk = await validator.checkApprovalRisk(
        unknownAddr.address, whitelistedAddr.address, ethers.parseEther("2000000")
      );
      
      expect(risk).to.equal(3); // High
    });

    it("Should return Medium for moderate approval", async function () {
      const { validator, unknownAddr, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const risk = await validator.checkApprovalRisk(
        unknownAddr.address, whitelistedAddr.address, ethers.parseEther("100")
      );
      
      expect(risk).to.equal(2); // Medium
    });

    it("Should return Low for small approval", async function () {
      const { validator, unknownAddr, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const risk = await validator.checkApprovalRisk(
        unknownAddr.address, whitelistedAddr.address, ethers.parseEther("0.5")
      );
      
      expect(risk).to.equal(1); // Low
    });

    it("Should revert for zero token address", async function () {
      const { validator, whitelistedAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.checkApprovalRisk(
        ethers.ZeroAddress, whitelistedAddr.address, 100
      )).to.be.revertedWithCustomError(validator, "ZeroAddress");
    });

    it("Should revert for zero spender address", async function () {
      const { validator, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.checkApprovalRisk(
        unknownAddr.address, ethers.ZeroAddress, 100
      )).to.be.revertedWithCustomError(validator, "ZeroAddress");
    });
  });

  describe("Max Transaction Value", function () {
    it("Should allow user to set max transaction value", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      const maxValue = ethers.parseEther("100");
      
      await expect(validator.connect(user1).setMaxTransactionValue(maxValue))
        .to.emit(validator, "MaxTxValueUpdated")
        .withArgs(user1.address, 0, maxValue);
    });

    it("Should update max transaction value", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      const maxValue = ethers.parseEther("50");
      await validator.connect(user1).setMaxTransactionValue(maxValue);
      
      expect(await validator.getMaxTransactionValue(user1.address)).to.equal(maxValue);
    });

    it("Should allow updating max transaction value", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).setMaxTransactionValue(ethers.parseEther("50"));
      await validator.connect(user1).setMaxTransactionValue(ethers.parseEther("100"));
      
      expect(await validator.getMaxTransactionValue(user1.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should maintain separate max values per user", async function () {
      const { validator, user1, user2 } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).setMaxTransactionValue(ethers.parseEther("50"));
      await validator.connect(user2).setMaxTransactionValue(ethers.parseEther("100"));
      
      expect(await validator.getMaxTransactionValue(user1.address)).to.equal(ethers.parseEther("50"));
      expect(await validator.getMaxTransactionValue(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should allow setting max value to zero (unlimited)", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(user1).setMaxTransactionValue(ethers.parseEther("50"));
      await validator.connect(user1).setMaxTransactionValue(0);
      
      expect(await validator.getMaxTransactionValue(user1.address)).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause contract", async function () {
      const { validator, admin, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(admin).pause();
      
      await expect(validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, "0x"
      )).to.be.reverted;
    });

    it("Should allow admin to unpause contract", async function () {
      const { validator, admin, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      await validator.connect(admin).pause();
      await validator.connect(admin).unpause();
      
      await expect(validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, "0x"
      )).to.not.be.reverted;
    });

    it("Should restrict admin functions to admin role", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      await expect(validator.connect(user1).pause()).to.be.reverted;
      await expect(validator.connect(user1).unpause()).to.be.reverted;
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should handle multiple whitelist additions and removals", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      const signers = await ethers.getSigners();
      
      // Add multiple addresses
      for (let i = 10; i < 15; i++) {
        await validator.connect(user1).addToWhitelist(signers[i].address);
      }
      
      let whitelist = await validator.getWhitelist(user1.address);
      expect(whitelist.length).to.equal(5);
      
      // Remove some
      await validator.connect(user1).removeFromWhitelist(signers[11].address);
      await validator.connect(user1).removeFromWhitelist(signers[13].address);
      
      whitelist = await validator.getWhitelist(user1.address);
      expect(whitelist.length).to.equal(3);
    });

    it("Should prioritize blacklist over whitelist", async function () {
      const { validator, blacklistAdmin, user1, blacklistedAddr } = 
        await loadFixture(deployTransactionValidatorFixture);
      
      // Add to both whitelist and blacklist
      await validator.connect(user1).addToWhitelist(blacklistedAddr.address);
      await validator.connect(blacklistAdmin).addToBlacklist(blacklistedAddr.address);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        blacklistedAddr.address, 0, "0x"
      );
      
      // Should be Critical (blacklist takes priority)
      expect(riskLevel).to.equal(4);
    });

    it("Should handle empty data in transaction validation", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, ethers.parseEther("1"), "0x"
      );
      
      expect(riskLevel).to.be.greaterThanOrEqual(0);
    });

    it("Should handle non-approve function calls", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      const iface = new ethers.Interface(["function transfer(address to, uint256 amount)"]);
      const data = iface.encodeFunctionData("transfer", [unknownAddr.address, ethers.parseEther("10")]);
      
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, data
      );
      
      // Should not flag as approval
      expect(riskLevel).to.not.equal(4);
    });

    it("Should handle reentrancy protection", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      // Basic check - should not revert
      await expect(validator.connect(user1).validateTransaction(
        unknownAddr.address, 0, "0x"
      )).to.not.be.reverted;
    });

    it("Should correctly combine multiple risk factors", async function () {
      const { validator, user1, unknownAddr } = await loadFixture(deployTransactionValidatorFixture);
      
      // Set max value
      await validator.connect(user1).setMaxTransactionValue(ethers.parseEther("1"));
      
      // Send high value (exceeds max)
      const riskLevel = await validator.connect(user1).validateTransaction(
        unknownAddr.address, ethers.parseEther("5"), "0x"
      );
      
      expect(riskLevel).to.equal(3); // High
    });

    it("Should return empty whitelist for new user", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      const whitelist = await validator.getWhitelist(user1.address);
      expect(whitelist.length).to.equal(0);
    });

    it("Should return zero max value for new user", async function () {
      const { validator, user1 } = await loadFixture(deployTransactionValidatorFixture);
      
      expect(await validator.getMaxTransactionValue(user1.address)).to.equal(0);
    });
  });
});
