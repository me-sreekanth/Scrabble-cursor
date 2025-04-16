const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy ScrabbleGame
  console.log("\n1. Deploying Scrabble...");
  const Scrabble = await hre.ethers.getContractFactory("Scrabble");
  const scrabble = await Scrabble.deploy();
  await scrabble.waitForDeployment();
  const gameAddress = await scrabble.getAddress();
  console.log(`Scrabble deployed to: ${gameAddress}`);
  const merkleRoot = "0xe940f37e8d1da041c0221edd1937cb94e5bc045cc9e79cb356127e9e494484f5";

  // Set the merkle root
  console.log("\n2. Setting the merkle root...");
  await scrabble.setMerkleRoot(merkleRoot);

  // Verify deployment
  console.log("\n=== Final Configuration ===");
  console.log("Scrabble:", gameAddress);
  console.log("Merkle Root:", await scrabble.merkleRoot());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });