import hre from "hardhat";

// Shortens ethers/Hardhat revert errors to a single readable line
function reason(error) {
  return (error.shortMessage ?? error.message ?? String(error)).split("\n")[0];
}

async function main() {
  const { ethers } = await hre.network.create();
  const eth = (v) => `${ethers.formatEther(v)} ETH`;

  const [owner, developer, buyer] = await ethers.getSigners();

  console.log("=== AIModelRegistry demo (NuvyraHub PoC) ===\n");
  console.log(`Owner:     ${owner.address}`);
  console.log(`Developer: ${developer.address}`);
  console.log(`Buyer:     ${buyer.address}\n`);

  // 1. Deploy a fresh registry (in-memory network, lives for this run only)
  const Factory = await ethers.getContractFactory("AIModelRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();
  console.log(`1. Contract deployed at ${await registry.getAddress()}`);

  // 2. Developer registers VisionForge Pro
  const name = "VisionForge Pro";
  const handle = "@VinciLabs";
  const contentHash = ethers.id("visionforge-pro-weights-v3.2"); // hash of the off-chain weights
  const price = ethers.parseEther("0.48");
  const maxSupply = 1000;
  const initialSupply = 100;

  const tokenId = await registry.nextTokenId();
  await (
    await registry
      .connect(developer)
      .registerModel(name, handle, contentHash, price, maxSupply, initialSupply)
  ).wait();

  const model = await registry.modelRegistry(tokenId);
  console.log(`\n2. Model registered as token #${tokenId}`);
  console.log(`   name:        ${model.modelName}`);
  console.log(`   creator:     ${model.creator}`);
  console.log(`   contentHash: ${model.contentHash}`);
  console.log(`   price:       ${eth(model.basePrice)} per license`);
  console.log(`   maxSupply:   ${model.maxSupply}`);
  console.log(
    `   creator holds ${await registry.balanceOf(developer.address, tokenId)} initial units`
  );

  // 3. Anyone else registering the same content hash must fail
  try {
    await registry
      .connect(buyer)
      .registerModel("Copycat", "@Fake", contentHash, price, maxSupply, 0);
    console.log("\n3. ERROR: duplicate hash was accepted");
  } catch (error) {
    console.log(`\n3. Duplicate hash rejected: ${reason(error)}`);
  }

  // 4. Buyer acquires 2 licenses and overpays on purpose
  const quantity = 2n;
  const cost = price * quantity;
  const overpay = ethers.parseEther("0.02");
  await (
    await registry.connect(buyer).acquireLicense(tokenId, quantity, { value: cost + overpay })
  ).wait();

  console.log(`\n4. Buyer acquired ${quantity} licenses (sent ${eth(cost + overpay)})`);
  console.log(`   buyer licenses:        ${await registry.balanceOf(buyer.address, tokenId)}`);
  console.log(
    `   total supply:          ${await registry["totalSupply(uint256)"](tokenId)} / ${maxSupply}`
  );
  console.log(
    `   credited to creator:   ${eth(await registry.pendingWithdrawals(developer.address))}`
  );
  console.log(
    `   credited back to buyer: ${eth(await registry.pendingWithdrawals(buyer.address))}`
  );

  // 5. Both parties withdraw
  const before = await ethers.provider.getBalance(developer.address);
  await (await registry.connect(developer).withdraw()).wait();
  const after = await ethers.provider.getBalance(developer.address);
  await (await registry.connect(buyer).withdraw()).wait();

  const registryBalance = await ethers.provider.getBalance(await registry.getAddress());
  console.log("\n5. Withdrawals done");
  console.log(`   developer net gain (after gas): ${eth(after - before)}`);
  console.log(`   contract balance:               ${eth(registryBalance)}`);

  // 6. Creator deactivates the model, purchases must fail
  await (await registry.connect(developer).setModelActive(tokenId, false)).wait();
  try {
    await registry.connect(buyer).acquireLicense(tokenId, 1n, { value: price });
    console.log("\n6. ERROR: purchase of an inactive model was accepted");
  } catch (error) {
    console.log(`\n6. Model deactivated, purchase rejected: ${reason(error)}`);
  }

  console.log("\nDemo finished.");
}

main().catch((error) => {
  console.error("Interaction failed:", error);
  process.exitCode = 1;
});