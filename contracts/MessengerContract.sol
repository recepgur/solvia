// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MessengerContract is Ownable, ReentrancyGuard {
    struct Message {
        address sender;
        string encryptedContent;
        uint256 timestamp;
    }

    struct UserProfile {
        string publicKey;
        bool isRegistered;
    }

    mapping(address => UserProfile) public users;
    mapping(bytes32 => Message[]) private conversations;

    event MessageSent(address indexed from, address indexed to, uint256 timestamp);
    event UserRegistered(address indexed user);

    constructor() Ownable(msg.sender) {}

    function registerUser(string calldata publicKey) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        users[msg.sender] = UserProfile(publicKey, true);
        emit UserRegistered(msg.sender);
    }

    function sendMessage(address to, string calldata encryptedContent) external nonReentrant {
        require(users[msg.sender].isRegistered, "Sender not registered");
        require(users[to].isRegistered, "Recipient not registered");

        bytes32 conversationId = getConversationId(msg.sender, to);
        conversations[conversationId].push(
            Message(msg.sender, encryptedContent, block.timestamp)
        );

        emit MessageSent(msg.sender, to, block.timestamp);
    }

    function getConversationId(address user1, address user2) internal pure returns (bytes32) {
        return user1 < user2 
            ? keccak256(abi.encodePacked(user1, user2))
            : keccak256(abi.encodePacked(user2, user1));
    }

    function getUserPublicKey(address user) external view returns (string memory) {
        require(users[user].isRegistered, "User not registered");
        return users[user].publicKey;
    }
}
