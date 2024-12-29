// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CrossChainBridge is ReentrancyGuard, Ownable {
    // Bridge event structure
    struct BridgeEvent {
        bytes32 eventId;
        address sender;
        string targetChain;
        bytes targetAddress;
        uint256 amount;
        uint256 timestamp;
        bool processed;
    }

    // Supported chains
    mapping(string => bool) public supportedChains;
    
    // Bridge events mapping
    mapping(bytes32 => BridgeEvent) public bridgeEvents;
    
    // Chain-specific validators
    mapping(string => mapping(address => bool)) public chainValidators;
    
    // Required validator confirmations per chain
    mapping(string => uint256) public requiredConfirmations;
    
    // Event confirmations tracking
    mapping(bytes32 => mapping(address => bool)) public eventConfirmations;
    mapping(bytes32 => uint256) public confirmationCount;

    // Events
    event BridgeInitiated(
        bytes32 indexed eventId,
        address indexed sender,
        string targetChain,
        bytes targetAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    event BridgeConfirmed(
        bytes32 indexed eventId,
        address indexed validator,
        string targetChain
    );
    
    event BridgeCompleted(
        bytes32 indexed eventId,
        string sourceChain,
        address indexed recipient,
        uint256 amount
    );

    constructor() {
        // Initialize supported chains
        supportedChains["ethereum"] = true;
        supportedChains["solana"] = true;
        
        // Set required confirmations
        requiredConfirmations["ethereum"] = 2;
        requiredConfirmations["solana"] = 2;
    }

    // Initiate bridge transfer
    function initiateBridge(
        string memory _targetChain,
        bytes memory _targetAddress,
        uint256 _amount
    ) public nonReentrant returns (bytes32) {
        require(supportedChains[_targetChain], "Unsupported chain");
        require(_amount > 0, "Invalid amount");
        
        bytes32 eventId = keccak256(
            abi.encodePacked(
                msg.sender,
                _targetChain,
                _targetAddress,
                _amount,
                block.timestamp
            )
        );
        
        bridgeEvents[eventId] = BridgeEvent({
            eventId: eventId,
            sender: msg.sender,
            targetChain: _targetChain,
            targetAddress: _targetAddress,
            amount: _amount,
            timestamp: block.timestamp,
            processed: false
        });
        
        emit BridgeInitiated(
            eventId,
            msg.sender,
            _targetChain,
            _targetAddress,
            _amount,
            block.timestamp
        );
        
        return eventId;
    }

    // Confirm bridge event (called by validators)
    function confirmBridgeEvent(
        bytes32 _eventId,
        string memory _targetChain
    ) public {
        require(
            chainValidators[_targetChain][msg.sender],
            "Not authorized validator"
        );
        require(
            !eventConfirmations[_eventId][msg.sender],
            "Already confirmed"
        );
        require(
            !bridgeEvents[_eventId].processed,
            "Already processed"
        );
        
        eventConfirmations[_eventId][msg.sender] = true;
        confirmationCount[_eventId]++;
        
        emit BridgeConfirmed(_eventId, msg.sender, _targetChain);
        
        if (confirmationCount[_eventId] >= requiredConfirmations[_targetChain]) {
            bridgeEvents[_eventId].processed = true;
        }
    }

    // Add chain validator
    function addChainValidator(
        string memory _chain,
        address _validator
    ) public onlyOwner {
        require(supportedChains[_chain], "Unsupported chain");
        chainValidators[_chain][_validator] = true;
    }

    // Remove chain validator
    function removeChainValidator(
        string memory _chain,
        address _validator
    ) public onlyOwner {
        chainValidators[_chain][_validator] = false;
    }

    // Update required confirmations
    function updateRequiredConfirmations(
        string memory _chain,
        uint256 _confirmations
    ) public onlyOwner {
        require(supportedChains[_chain], "Unsupported chain");
        require(_confirmations > 0, "Invalid confirmation count");
        requiredConfirmations[_chain] = _confirmations;
    }

    // Add supported chain
    function addSupportedChain(
        string memory _chain,
        uint256 _requiredConfirmations
    ) public onlyOwner {
        require(!supportedChains[_chain], "Chain already supported");
        require(_requiredConfirmations > 0, "Invalid confirmation count");
        
        supportedChains[_chain] = true;
        requiredConfirmations[_chain] = _requiredConfirmations;
    }

    // Remove supported chain
    function removeSupportedChain(
        string memory _chain
    ) public onlyOwner {
        require(supportedChains[_chain], "Chain not supported");
        supportedChains[_chain] = false;
    }
}
