import { create } from 'ipfs-http-client'
import { pipe } from 'it-pipe'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

class P2PBrowserNetwork {
  constructor() {
    this.peers = new Set()
    this.messageHandlers = new Map()
    this.node = null
  }

  async init() {
    try {
      // Use local IPFS node with CORS enabled
      this.node = create({
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      })
      
      // Fallback to in-memory message handling if IPFS fails
      this.useLocalMessaging = false
      
      // Initialize pubsub for messaging
      await this.node.pubsub.subscribe('solvia-messages', this.handlePubsubMessage.bind(this))
      
      console.log('P2P Browser Network initialized')
    } catch (error) {
      console.error('Failed to initialize P2P network:', error)
      throw error
    }
  }

  async handlePubsubMessage(message) {
    try {
      const decodedMessage = JSON.parse(uint8ArrayToString(message.data))
      await this.handleIncomingMessage('dm', decodedMessage, message.from)
    } catch (error) {
      console.error('Error handling pubsub message:', error)
    }
  }

  async sendMessage(peerId, protocol, message) {
    try {
      const msgData = {
        to: peerId,
        from: this.useLocalMessaging ? 'local-user' : await this.node.id(),
        protocol,
        content: message,
        timestamp: Date.now()
      }
      
      if (this.useLocalMessaging) {
        // Simulate local message delivery
        setTimeout(() => {
          this.handleIncomingMessage(protocol, msgData, msgData.from)
        }, 100)
      } else {
        await this.node.pubsub.publish('solvia-messages', uint8ArrayFromString(JSON.stringify(msgData)))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      if (!this.useLocalMessaging) {
        console.warn('Falling back to local messaging')
        this.useLocalMessaging = true
        await this.sendMessage(peerId, protocol, message)
      } else {
        throw error
      }
    }
  }

  async readMessage(stream) {
    const data = await pipe(
      stream.source,
      async function* (source) {
        for await (const chunk of source) {
          yield chunk
        }
      }
    )
    return JSON.parse(uint8ArrayToString(data))
  }

  async handleIncomingMessage(protocol, message, sender) {
    const handler = this.messageHandlers.get(protocol)
    if (handler) {
      await handler(message, sender)
    }
  }

  onMessage(protocol, handler) {
    this.messageHandlers.set(protocol, handler)
  }
}

export default P2PBrowserNetwork
