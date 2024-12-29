// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MessageContract is ReentrancyGuard, Ownable {
    // Message structure
    struct Message {
        bytes32 messageHash;     // Hash of the encrypted message content
        address sender;          // Address of message sender
        address recipient;       // Address of message recipient
        uint256 timestamp;       // Message timestamp
        bool isDeleted;         // Message deletion status
        uint256 deleteTime;     // Scheduled deletion time (if any)
        string ipfsHash;        // IPFS hash for message content
    }

    // Mapping from message ID to Message struct
    mapping(bytes32 => Message) public messages;
    
    // Mapping from user address to their message IDs
    mapping(address => bytes32[]) public userMessages;
    
    // Events
    event MessageSent(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint256 timestamp,
        string ipfsHash
    );
    
    event MessageDeleted(
        bytes32 indexed messageId,
        address indexed deletedBy,
        uint256 timestamp
    );
    
    event MessageScheduledForDeletion(
        bytes32 indexed messageId,
        uint256 scheduledTime
    );

    // Send a new message
    function sendMessage(
        address _recipient,
        bytes32 _messageHash,
        string memory _ipfsHash
    ) public nonReentrant returns (bytes32) {
        require(_recipient != address(0), "Invalid recipient address");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        bytes32 messageId = keccak256(
            abi.encodePacked(
                _messageHash,
                msg.sender,
                _recipient,
                block.timestamp
            )
        );
        
        messages[messageId] = Message({
            messageHash: _messageHash,
            sender: msg.sender,
            recipient: _recipient,
            timestamp: block.timestamp,
            isDeleted: false,
            deleteTime: 0,
            ipfsHash: _ipfsHash
        });
        
        userMessages[msg.sender].push(messageId);
        userMessages[_recipient].push(messageId);
        
        emit MessageSent(
            messageId,
            msg.sender,
            _recipient,
            block.timestamp,
            _ipfsHash
        );
        
        return messageId;
    }
    
    // Schedule message for deletion
    function scheduleMessageDeletion(
        bytes32 _messageId,
        uint256 _deleteAfter
    ) public {
        require(_deleteAfter > 0, "Invalid deletion time");
        require(
            messages[_messageId].sender == msg.sender ||
            messages[_messageId].recipient == msg.sender,
            "Not authorized"
        );
        require(!messages[_messageId].isDeleted, "Message already deleted");
        
        uint256 deletionTime = block.timestamp + _deleteAfter;
        messages[_messageId].deleteTime = deletionTime;
        
        emit MessageScheduledForDeletion(_messageId, deletionTime);
    }
    
    // Delete message immediately
    function deleteMessage(bytes32 _messageId) public {
        require(
            messages[_messageId].sender == msg.sender ||
            messages[_messageId].recipient == msg.sender,
            "Not authorized"
        );
        require(!messages[_messageId].isDeleted, "Message already deleted");
        
        messages[_messageId].isDeleted = true;
        
        emit MessageDeleted(
            _messageId,
            msg.sender,
            block.timestamp
        );
    }
    
    // Get message details
    function getMessage(
        bytes32 _messageId
    ) public view returns (
        bytes32 messageHash,
        address sender,
        address recipient,
        uint256 timestamp,
        bool isDeleted,
        uint256 deleteTime,
        string memory ipfsHash
    ) {
        require(
            messages[_messageId].sender == msg.sender ||
            messages[_messageId].recipient == msg.sender,
            "Not authorized"
        );
        
        Message memory message = messages[_messageId];
        return (
            message.messageHash,
            message.sender,
            message.recipient,
            message.timestamp,
            message.isDeleted,
            message.deleteTime,
            message.ipfsHash
        );
    }
    
    // Get user's messages
    function getUserMessages(
        address _user
    ) public view returns (bytes32[] memory) {
        require(
            _user == msg.sender,
            "Can only retrieve own messages"
        );
        return userMessages[_user];
    }
}
