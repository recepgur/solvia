export const bridgeABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "targetChain",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "targetAddress",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "BridgeInitiated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            },
            {
                "internalType": "string",
                "name": "chain",
                "type": "string"
            }
        ],
        "name": "confirmBridgeEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "eventId",
                "type": "bytes32"
            }
        ],
        "name": "getBridgeEventStatus",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "bool",
                        "name": "processed",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "confirmations",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct CrossChainBridge.EventStatus",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
