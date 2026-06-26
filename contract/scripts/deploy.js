const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // ─── 1. AddressReputation ───────────────────────────────────────────
  console.log("Deploying AddressReputation...");
  const AddressReputation = await ethers.getContractFactory("AddressReputation");
  const addressReputation = await AddressReputation.deploy();
  await addressReputation.waitForDeployment();
  const addressReputationAddr = await addressReputation.getAddress();
  console.log("AddressReputation →", addressReputationAddr);

  // ─── 2. DomainRegistry ─────────────────────────────────────────────
  console.log("Deploying DomainRegistry...");
  const DomainRegistry = await ethers.getContractFactory("DomainRegistry");
  const domainRegistry = await DomainRegistry.deploy();
  await domainRegistry.waitForDeployment();
  const domainRegistryAddr = await domainRegistry.getAddress();
  console.log("DomainRegistry →", domainRegistryAddr);

  // ─── 3. PhishingRegistry ───────────────────────────────────────────
  // If PhishingRegistry needs the above addresses as constructor args,
  // pass them in: deploy(addressReputationAddr, domainRegistryAddr)
  console.log("Deploying PhishingRegistry...");
  const PhishingRegistry = await ethers.getContractFactory("PhishingRegistry");
  const phishingRegistry = await PhishingRegistry.deploy();
  await phishingRegistry.waitForDeployment();
  const phishingRegistryAddr = await phishingRegistry.getAddress();
  console.log("PhishingRegistry →", phishingRegistryAddr);

  // ─── 4. TransactionValidator ───────────────────────────────────────
  console.log("Deploying TransactionValidator...");
  const TransactionValidator = await ethers.getContractFactory("TransactionValidator");
  const transactionValidator = await TransactionValidator.deploy();
  await transactionValidator.waitForDeployment();
  const transactionValidatorAddr = await transactionValidator.getAddress();
  console.log("TransactionValidator →", transactionValidatorAddr);

  // ─── 5. GovernanceController ───────────────────────────────────────
  // Usually deployed last since it governs the others
  console.log("Deploying GovernanceController...");
  const GovernanceController = await ethers.getContractFactory("GovernanceController");
  const governanceController = await GovernanceController.deploy();
  await governanceController.waitForDeployment();
  const governanceControllerAddr = await governanceController.getAddress();
  console.log("GovernanceController →", governanceControllerAddr);

  // ─── Save all addresses to a file ──────────────────────────────────
  const deployments = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AddressReputation: addressReputationAddr,
      DomainRegistry: domainRegistryAddr,
      PhishingRegistry: phishingRegistryAddr,
      TransactionValidator: transactionValidatorAddr,
      GovernanceController: governanceControllerAddr,
    },
  };

  fs.writeFileSync(
    "deployments.json",
    JSON.stringify(deployments, null, 2)
  );

  console.log("\nAll contracts deployed. Addresses saved to deployments.json");
  console.log(JSON.stringify(deployments.contracts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});