import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { stdinToStream, streamToConsole } from '@libp2p/utils/streams'
import { createEd25519PeerId } from '@libp2p/peer-id-ed25519'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

class P2PNetwork {
    constructor() {
        this.node = null
        this.peerId = null
        this.messageHandlers = new Map()
    }

    // Initialize the P2P node
    async init() {
        try {
            // Create a new peer ID
            this.peerId = await createEd25519PeerId()

            // Create the libp2p node
            this.node = await createLibp2p({
                peerId: this.peerId,
                addresses: {
                    listen: [
                        '/ip4/0.0.0.0/tcp/0',
                        '/ip4/0.0.0.0/tcp/0/ws'
                    ]
                },
                transports: [
                    tcp(),
                    webSockets()
                ],
                connectionEncryption: [
                    noise()
                ],
                streamMuxers: [
                    mplex()
                ]
            })

            // Start the node
            await this.node.start()
            console.log('P2P node started with ID:', this.peerId.toString())

            // Set up protocol handlers
            await this.setupProtocolHandlers()

            return this.node
        } catch (error) {
            console.error('Failed to initialize P2P node:', error)
            throw error
        }
    }

    // Set up protocol handlers for different message types
    async setupProtocolHandlers() {
        // Direct message protocol
        await this.node.handle('/solvia/1.0.0/dm', async ({ stream, connection }) => {
            try {
                const message = await this.readMessage(stream)
                await this.handleIncomingMessage('dm', message, connection.remotePeer)
            } catch (error) {
                console.error('Error handling direct message:', error)
            }
        })

        // Group message protocol
        await this.node.handle('/solvia/1.0.0/group', async ({ stream, connection }) => {
            try {
                const message = await this.readMessage(stream)
                await this.handleIncomingMessage('group', message, connection.remotePeer)
            } catch (error) {
                console.error('Error handling group message:', error)
            }
        })

        // Call signaling protocol
        await this.node.handle('/solvia/1.0.0/call', async ({ stream, connection }) => {
            try {
                const signal = await this.readMessage(stream)
                await this.handleIncomingMessage('call', signal, connection.remotePeer)
            } catch (error) {
                console.error('Error handling call signal:', error)
            }
        })
    }

    // Read message from stream
    async readMessage(stream) {
        const chunks = []
        for await (const chunk of stream.source) {
            chunks.push(chunk)
        }
        const messageData = uint8ArrayToString(chunks.reduce((acc, curr) => {
            const temp = new Uint8Array(acc.length + curr.length)
            temp.set(acc)
            temp.set(curr, acc.length)
            return temp
        }))
        return JSON.parse(messageData)
    }

    // Send message to a peer
    async sendMessage(peerId, protocol, message) {
        try {
            const stream = await this.node.dialProtocol(peerId, `/solvia/1.0.0/${protocol}`)
            const msgData = uint8ArrayFromString(JSON.stringify(message))
            await stream.sink([msgData])
        } catch (error) {
            console.error(`Failed to send ${protocol} message:`, error)
            throw error
        }
    }

    // Register message handler
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler)
    }

    // Handle incoming messages
    async handleIncomingMessage(type, message, remotePeer) {
        const handler = this.messageHandlers.get(type)
        if (handler) {
            await handler(message, remotePeer)
        }
    }

    // Connect to a peer
    async connectToPeer(multiaddr) {
        try {
            await this.node.dial(multiaddr)
            console.log('Connected to peer:', multiaddr)
        } catch (error) {
            console.error('Failed to connect to peer:', error)
            throw error
        }
    }

    // Discover peers
    async discoverPeers() {
        const peers = await this.node.peerStore.all()
        return peers.map(peer => ({
            id: peer.id.toString(),
            addresses: peer.addresses.map(addr => addr.toString())
        }))
    }

    // Stop the node
    async stop() {
        if (this.node) {
            await this.node.stop()
            console.log('P2P node stopped')
        }
    }

    // Get node info
    getNodeInfo() {
        return {
            peerId: this.peerId.toString(),
            addresses: this.node.getMultiaddrs().map(addr => addr.toString())
        }
    }
}

export default P2PNetwork
