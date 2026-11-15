import hre from "hardhat";

async function main() {
  console.log("Deploying AIModelRegistry (NuvyraHub PoC)...");

  // Hardhat 3 requires an explicit network connection
  const connection = await hre.network.create();
  const { ethers } = connection;

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network (chainId): ${network.chainId}`);
  console.log(`Deployer:          ${deployer.address}`);
  console.log(`Deployer balance:  ${ethers.formatEther(balance)} ETH`);

  const AIModelRegistry = await ethers.getContractFactory("AIModelRegistry");
  const registry = await AIModelRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AIModelRegistry deployed successfully.");
  console.log(`Contract address:  ${address}`);
  console.log(`Contract owner:    ${await registry.owner()}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
