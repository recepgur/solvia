import { expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MessengerContract, MessengerContract__factory } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MessengerContract", function () {
  let messengerContract: MessengerContract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const MessengerFactory = await ethers.getContractFactory("MessengerContract");
    messengerContract = await MessengerFactory.deploy() as MessengerContract;
    await messengerContract.waitForDeployment();
  });

  describe("User Registration", function () {
    it("Should allow users to register with a public key", async function () {
      const publicKey = "test-public-key";
      await messengerContract.connect(user1).registerUser(publicKey);
      
      const userPublicKey = await messengerContract.getUserPublicKey(user1.address);
      expect(userPublicKey).to.equal(publicKey);
    });

    it("Should not allow users to register twice", async function () {
      const publicKey = "test-public-key";
      await messengerContract.connect(user1).registerUser(publicKey);
      
      await expect(
        messengerContract.connect(user1).registerUser(publicKey)
      ).to.be.revertedWith("User already registered");
    });
  });

  describe("Messaging", function () {
    beforeEach(async function () {
      await messengerContract.connect(user1).registerUser("user1-public-key");
      await messengerContract.connect(user2).registerUser("user2-public-key");
    });

    it("Should allow registered users to send messages", async function () {
      const message = "encrypted-message";
      const tx = await messengerContract.connect(user1).sendMessage(user2.address, message);
      await tx.wait();

      const block = await ethers.provider.getBlock("latest");
      expect(tx)
        .to.emit(messengerContract, "MessageSent")
        .withArgs(user1.address, user2.address, block?.timestamp);
    });

    it("Should not allow unregistered users to send messages", async function () {
      const message = "encrypted-message";
      const [,,unregistered] = await ethers.getSigners();
      
      await expect(
        messengerContract.connect(unregistered).sendMessage(user2.address, message)
      ).to.be.revertedWith("Sender not registered");
    });
  });
});
