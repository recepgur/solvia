import { ethers } from "hardhat";

async function main() {
  const MessengerContract = await ethers.getContractFactory("MessengerContract");
  const messenger = await MessengerContract.deploy();

  await messenger.deployed();

  console.log(`MessengerContract deployed to ${messenger.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
