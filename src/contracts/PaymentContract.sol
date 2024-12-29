// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentContract is ReentrancyGuard, Ownable {
    // Payment structure
    struct Payment {
        address payer;           // Address of the payer
        address payee;           // Address of the payee
        uint256 amount;         // Payment amount
        uint256 timestamp;      // Payment timestamp
        PaymentType paymentType; // Type of payment
        PaymentStatus status;   // Payment status
        string description;     // Payment description
    }
    
    // Payment type enumeration
    enum PaymentType {
        SERVICE_FEE,           // Basic service fee
        PREMIUM_SUBSCRIPTION,  // Premium feature subscription
        GROUP_CALL_FEE,       // Group call service fee
        RECORDING_FEE,        // Call recording fee
        CUSTOM_FEE            // Custom payment type
    }
    
    // Payment status enumeration
    enum PaymentStatus {
        PENDING,
        COMPLETED,
        REFUNDED,
        CANCELLED
    }
    
    // Platform token
    IERC20 public platformToken;
    
    // Fee configuration
    uint256 public serviceFee;          // Basic service fee
    uint256 public premiumFee;          // Premium subscription fee
    uint256 public groupCallFee;        // Group call fee
    uint256 public recordingFee;        // Recording fee
    
    // Payment tracking
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;
    
    // Premium user tracking
    mapping(address => uint256) public premiumSubscriptionExpiry;
    
    // Events
    event PaymentProcessed(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        PaymentType paymentType,
        uint256 timestamp
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );
    
    event PremiumSubscriptionUpdated(
        address indexed user,
        uint256 expiryTimestamp
    );
    
    event FeeUpdated(
        PaymentType indexed feeType,
        uint256 newAmount
    );

    constructor(
        address _tokenAddress,
        uint256 _serviceFee,
        uint256 _premiumFee,
        uint256 _groupCallFee,
        uint256 _recordingFee
    ) {
        platformToken = IERC20(_tokenAddress);
        serviceFee = _serviceFee;
        premiumFee = _premiumFee;
        groupCallFee = _groupCallFee;
        recordingFee = _recordingFee;
    }
    
    // Process payment
    function processPayment(
        PaymentType _paymentType,
        string memory _description
    ) public nonReentrant returns (bytes32) {
        uint256 amount = getFeeAmount(_paymentType);
        require(amount > 0, "Invalid payment amount");
        
        bytes32 paymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _paymentType
            )
        );
        
        require(
            platformToken.transferFrom(msg.sender, address(this), amount),
            "Payment failed"
        );
        
        payments[paymentId] = Payment({
            payer: msg.sender,
            payee: address(this),
            amount: amount,
            timestamp: block.timestamp,
            paymentType: _paymentType,
            status: PaymentStatus.COMPLETED,
            description: _description
        });
        
        userPayments[msg.sender].push(paymentId);
        
        // Handle premium subscription
        if (_paymentType == PaymentType.PREMIUM_SUBSCRIPTION) {
            updatePremiumSubscription(msg.sender);
        }
        
        emit PaymentProcessed(
            paymentId,
            msg.sender,
            address(this),
            amount,
            _paymentType,
            block.timestamp
        );
        
        return paymentId;
    }
    
    // Refund payment
    function refundPayment(bytes32 _paymentId) public onlyOwner {
        Payment storage payment = payments[_paymentId];
        require(
            payment.status == PaymentStatus.COMPLETED,
            "Payment not completed"
        );
        
        payment.status = PaymentStatus.REFUNDED;
        
        require(
            platformToken.transfer(payment.payer, payment.amount),
            "Refund failed"
        );
        
        emit PaymentRefunded(
            _paymentId,
            payment.payer,
            payment.amount,
            block.timestamp
        );
    }
    
    // Update premium subscription
    function updatePremiumSubscription(address _user) internal {
        uint256 currentExpiry = premiumSubscriptionExpiry[_user];
        uint256 newExpiry;
        
        if (currentExpiry > block.timestamp) {
            newExpiry = currentExpiry + 30 days;
        } else {
            newExpiry = block.timestamp + 30 days;
        }
        
        premiumSubscriptionExpiry[_user] = newExpiry;
        
        emit PremiumSubscriptionUpdated(_user, newExpiry);
    }
    
    // Check if user has premium subscription
    function isPremiumUser(address _user) public view returns (bool) {
        return premiumSubscriptionExpiry[_user] > block.timestamp;
    }
    
    // Get fee amount based on payment type
    function getFeeAmount(
        PaymentType _paymentType
    ) public view returns (uint256) {
        if (_paymentType == PaymentType.SERVICE_FEE) return serviceFee;
        if (_paymentType == PaymentType.PREMIUM_SUBSCRIPTION) return premiumFee;
        if (_paymentType == PaymentType.GROUP_CALL_FEE) return groupCallFee;
        if (_paymentType == PaymentType.RECORDING_FEE) return recordingFee;
        return 0;
    }
    
    // Update fee amount (only owner)
    function updateFee(
        PaymentType _feeType,
        uint256 _newAmount
    ) public onlyOwner {
        if (_feeType == PaymentType.SERVICE_FEE) serviceFee = _newAmount;
        if (_feeType == PaymentType.PREMIUM_SUBSCRIPTION) premiumFee = _newAmount;
        if (_feeType == PaymentType.GROUP_CALL_FEE) groupCallFee = _newAmount;
        if (_feeType == PaymentType.RECORDING_FEE) recordingFee = _newAmount;
        
        emit FeeUpdated(_feeType, _newAmount);
    }
    
    // Get user payments
    function getUserPayments(
        address _user
    ) public view returns (bytes32[] memory) {
        return userPayments[_user];
    }
    
    // Withdraw collected fees (only owner)
    function withdrawFees(uint256 _amount) public onlyOwner {
        require(
            platformToken.transfer(owner(), _amount),
            "Withdrawal failed"
        );
    }
}
