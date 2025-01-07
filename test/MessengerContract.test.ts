import { expect } from "chai";
import { ethers } from "hardhat";
import { MessengerContract } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("MessengerContract", function () {
  let messengerContract: MessengerContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const MessengerContract = await ethers.getContractFactory("MessengerContract");
    messengerContract = await MessengerContract.deploy();
    await messengerContract.deployed();
  });

  describe("Messaging", function () {
    it("Should send a message and emit MessageSent event", async function () {
      const message = "encrypted_message_content";
      await expect(messengerContract.connect(addr1).sendMessage(addr2.address, message))
        .to.emit(messengerContract, "MessageSent")
        .withArgs(addr1.address, addr2.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));
    });

    it("Should add contacts when sending messages", async function () {
      const message = "encrypted_message_content";
      await messengerContract.connect(addr1).sendMessage(addr2.address, message);
      
      const addr1Contacts = await messengerContract.connect(addr1).getContacts();
      const addr2Contacts = await messengerContract.connect(addr2).getContacts();
      
      expect(addr1Contacts).to.include(addr2.address);
      expect(addr2Contacts).to.include(addr1.address);
    });

    it("Should mark message as read", async function () {
      const message = "encrypted_message_content";
      await messengerContract.connect(addr1).sendMessage(addr2.address, message);
      
      await expect(messengerContract.connect(addr2).markMessageAsRead(0))
        .to.emit(messengerContract, "MessageRead")
        .withArgs(addr2.address, 0);
    });
  });
});
