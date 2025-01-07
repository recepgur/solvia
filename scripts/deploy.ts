import { ethers } from "hardhat";
import * as fs from "fs";
import { MessengerContract } from "../typechain-types";

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const messengerFactory = await ethers.getContractFactory("MessengerContract");
    const messenger = await messengerFactory.deploy() as MessengerContract;
    await messenger.waitForDeployment();

    const messengerAddress = await messenger.getAddress();
    console.log("MessengerContract deployed to:", messengerAddress);

    // Save contract addresses to a file for frontend reference
    const contractAddresses = {
      messengerContract: messengerAddress,
    };

    if (!fs.existsSync("./src/contracts")) {
      fs.mkdirSync("./src/contracts", { recursive: true });
    }

    fs.writeFileSync(
      "./src/contracts/addresses.json",
      JSON.stringify(contractAddresses, null, 2)
    );
  } catch (error) {
    console.error("Error during deployment:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
