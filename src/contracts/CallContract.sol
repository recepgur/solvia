// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CallContract is ReentrancyGuard, Ownable {
    // Call session structure
    struct CallSession {
        address initiator;          // Call initiator address
        address[] participants;     // Array of participant addresses (for group calls)
        uint256 startTime;         // Call start timestamp
        uint256 endTime;           // Call end timestamp
        bool isVideo;              // Video call flag
        bool isActive;             // Active call flag
        string ipfsRecordingHash;  // IPFS hash for call recording (if enabled)
        mapping(address => bool) hasConsented;  // Consent mapping for recording
    }

    // Mapping from call ID to CallSession
    mapping(bytes32 => CallSession) public calls;
    
    // Active calls per user
    mapping(address => bytes32[]) public userActiveCalls;
    
    // Events
    event CallInitiated(
        bytes32 indexed callId,
        address indexed initiator,
        address[] participants,
        bool isVideo,
        uint256 timestamp
    );
    
    event CallJoined(
        bytes32 indexed callId,
        address indexed participant,
        uint256 timestamp
    );
    
    event CallEnded(
        bytes32 indexed callId,
        address indexed endedBy,
        uint256 duration,
        uint256 timestamp
    );
    
    event RecordingConsent(
        bytes32 indexed callId,
        address indexed participant,
        bool consented,
        uint256 timestamp
    );
    
    event RecordingSaved(
        bytes32 indexed callId,
        string ipfsHash,
        uint256 timestamp
    );

    // Initialize a new call session
    function initiateCall(
        address[] memory _participants,
        bool _isVideo
    ) public nonReentrant returns (bytes32) {
        require(_participants.length > 0, "No participants specified");
        
        bytes32 callId = keccak256(
            abi.encodePacked(
                msg.sender,
                _participants,
                block.timestamp
            )
        );
        
        CallSession storage newCall = calls[callId];
        newCall.initiator = msg.sender;
        newCall.participants = _participants;
        newCall.startTime = block.timestamp;
        newCall.isVideo = _isVideo;
        newCall.isActive = true;
        
        // Add call to active calls for all participants
        userActiveCalls[msg.sender].push(callId);
        for (uint i = 0; i < _participants.length; i++) {
            userActiveCalls[_participants[i]].push(callId);
        }
        
        emit CallInitiated(
            callId,
            msg.sender,
            _participants,
            _isVideo,
            block.timestamp
        );
        
        return callId;
    }
    
    // Join an active call
    function joinCall(bytes32 _callId) public {
        require(calls[_callId].isActive, "Call is not active");
        require(isParticipant(msg.sender, _callId), "Not a participant");
        
        emit CallJoined(_callId, msg.sender, block.timestamp);
    }
    
    // End call session
    function endCall(bytes32 _callId) public {
        require(
            calls[_callId].initiator == msg.sender ||
            isParticipant(msg.sender, _callId),
            "Not authorized"
        );
        require(calls[_callId].isActive, "Call already ended");
        
        calls[_callId].isActive = false;
        calls[_callId].endTime = block.timestamp;
        
        // Calculate call duration
        uint256 duration = block.timestamp - calls[_callId].startTime;
        
        emit CallEnded(
            _callId,
            msg.sender,
            duration,
            block.timestamp
        );
        
        // Remove from active calls
        removeActiveCall(_callId);
    }
    
    // Consent to call recording
    function consentToRecording(bytes32 _callId, bool _consent) public {
        require(calls[_callId].isActive, "Call is not active");
        require(isParticipant(msg.sender, _callId), "Not a participant");
        
        calls[_callId].hasConsented[msg.sender] = _consent;
        
        emit RecordingConsent(
            _callId,
            msg.sender,
            _consent,
            block.timestamp
        );
    }
    
    // Save call recording reference
    function saveRecording(
        bytes32 _callId,
        string memory _ipfsHash
    ) public {
        require(
            calls[_callId].initiator == msg.sender,
            "Only initiator can save recording"
        );
        require(!calls[_callId].isActive, "Call must be ended");
        require(
            allParticipantsConsented(_callId),
            "Not all participants consented"
        );
        
        
        calls[_callId].ipfsRecordingHash = _ipfsHash;
        
        emit RecordingSaved(
            _callId,
            _ipfsHash,
            block.timestamp
        );
    }
    
    // Check if address is a participant
    function isParticipant(
        address _participant,
        bytes32 _callId
    ) internal view returns (bool) {
        address[] memory participants = calls[_callId].participants;
        for (uint i = 0; i < participants.length; i++) {
            if (participants[i] == _participant) {
                return true;
            }
        }
        return false;
    }
    
    // Check if all participants consented to recording
    function allParticipantsConsented(
        bytes32 _callId
    ) internal view returns (bool) {
        address[] memory participants = calls[_callId].participants;
        for (uint i = 0; i < participants.length; i++) {
            if (!calls[_callId].hasConsented[participants[i]]) {
                return false;
            }
        }
        return true;
    }
    
    // Remove call from active calls
    function removeActiveCall(bytes32 _callId) internal {
        address[] memory participants = calls[_callId].participants;
        
        // Remove for initiator
        removeFromActiveCallsArray(calls[_callId].initiator, _callId);
        
        // Remove for all participants
        for (uint i = 0; i < participants.length; i++) {
            removeFromActiveCallsArray(participants[i], _callId);
        }
    }
    
    // Helper function to remove call from active calls array
    function removeFromActiveCallsArray(
        address _user,
        bytes32 _callId
    ) internal {
        bytes32[] storage activeCalls = userActiveCalls[_user];
        for (uint i = 0; i < activeCalls.length; i++) {
            if (activeCalls[i] == _callId) {
                // Move last element to current position and pop
                activeCalls[i] = activeCalls[activeCalls.length - 1];
                activeCalls.pop();
                break;
            }
        }
    }
}
