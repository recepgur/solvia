import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

async function main() {
  try {
    const [deployer]: HardhatEthersSigner[] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const messengerFactory = await ethers.getContractFactory("MessengerContract");
    const messenger = await messengerFactory.deploy();
    await messenger.waitForDeployment();

    const messengerAddress = await messenger.getAddress();
    console.log("MessengerContract deployed to:", messengerAddress);

    // Save contract addresses to a file for frontend reference
    const fs = require("fs");
    const contractAddresses = {
      messengerContract: messengerAddress,
    };

    fs.writeFileSync(
      "./src/contracts/addresses.json",
      JSON.stringify(contractAddresses, null, 2)
    );
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
