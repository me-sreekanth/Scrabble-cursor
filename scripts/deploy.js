const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the contract factory
  const Scrabble = await ethers.getContractFactory("Scrabble");
  
  // Deploy the contract
  console.log("Deploying Scrabble contract...");
  const scrabble = await Scrabble.deploy();
  await scrabble.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await scrabble.getAddress();
  console.log("Scrabble deployed to:", contractAddress);
  
  // Get the contract ABI
  const contractABI = Scrabble.interface.formatJson();
  
  // Create the contract details object
  const contractDetails = {
    address: contractAddress,
    abi: JSON.parse(contractABI),
    network: "sepolia", // Change this based on your network
    deployedAt: new Date().toISOString()
  };
  
  // Create the contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, "..", "src", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  
  // Write the contract details to a JSON file
  const contractFile = path.join(contractsDir, "Scrabble.json");
  fs.writeFileSync(contractFile, JSON.stringify(contractDetails, null, 2));
  
  console.log("Contract details saved to:", contractFile);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });