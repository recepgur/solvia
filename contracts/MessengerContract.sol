// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MessengerContract {
    struct Message {
        address sender;
        address recipient;
        string encryptedContent;
        uint256 timestamp;
        bool isRead;
    }

    // Mapping from user address to their messages
    mapping(address => Message[]) private userMessages;
    
    // Mapping to track user's contacts
    mapping(address => address[]) private userContacts;
    
    // Events
    event MessageSent(address indexed from, address indexed to, uint256 timestamp);
    event MessageRead(address indexed by, uint256 messageIndex);
    event ContactAdded(address indexed user, address indexed contact);

    function sendMessage(address _to, string memory _encryptedContent) public {
        require(_to != address(0), "Invalid recipient address");
        
        Message memory newMessage = Message({
            sender: msg.sender,
            recipient: _to,
            encryptedContent: _encryptedContent,
            timestamp: block.timestamp,
            isRead: false
        });
        
        userMessages[msg.sender].push(newMessage);
        userMessages[_to].push(newMessage);
        
        // Add to contacts if not already added
        if (!isContact(msg.sender, _to)) {
            userContacts[msg.sender].push(_to);
            emit ContactAdded(msg.sender, _to);
        }
        if (!isContact(_to, msg.sender)) {
            userContacts[_to].push(msg.sender);
            emit ContactAdded(_to, msg.sender);
        }
        
        emit MessageSent(msg.sender, _to, block.timestamp);
    }
    
    function getMessages() public view returns (Message[] memory) {
        return userMessages[msg.sender];
    }
    
    function markMessageAsRead(uint256 _messageIndex) public {
        require(_messageIndex < userMessages[msg.sender].length, "Invalid message index");
        require(!userMessages[msg.sender][_messageIndex].isRead, "Message already read");
        require(
            userMessages[msg.sender][_messageIndex].recipient == msg.sender,
            "Can only mark received messages as read"
        );
        
        userMessages[msg.sender][_messageIndex].isRead = true;
        emit MessageRead(msg.sender, _messageIndex);
    }
    
    function getContacts() public view returns (address[] memory) {
        return userContacts[msg.sender];
    }
    
    function isContact(address _user, address _contact) internal view returns (bool) {
        address[] memory contacts = userContacts[_user];
        for (uint i = 0; i < contacts.length; i++) {
            if (contacts[i] == _contact) {
                return true;
            }
        }
        return false;
    }
}
