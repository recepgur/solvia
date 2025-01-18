import React, { useState, useRef, useEffect } from 'react'
import { ChatList } from '@/components/ChatList'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Wallet, Video, Mic, MicOff, PhoneOff, Send, User } from "lucide-react"
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'
import { MOCK_PUBLIC_KEY } from '@/lib/constants'

interface Message {
  sender: string
  content: string
  timestamp: number
  status?: 'sent' | 'delivered' | 'read'
}

interface PeerConnection {
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel
}

function App() {
  // TODO: Remove mock wallet data when ready for production
  const { publicKey: _publicKey, connected: _connected } = useWallet();
  const connected = true;
  const publicKey = { toString: () => MOCK_PUBLIC_KEY };
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [peerConnections, setPeerConnections] = useState<Record<string, PeerConnection>>({})
  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [recipientKey, setRecipientKey] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const handleError = (event: Event) => {
      const error = (event as CustomEvent<Error>).detail
      console.error('Wallet connection error:', error)
      setConnectionError('Failed to connect wallet. Please try again.')
      setTimeout(() => setConnectionError(null), 5000)
    }

    window.addEventListener('walletConnectionError', handleError)
    return () => window.removeEventListener('walletConnectionError', handleError)
  }, [])

  const handleInstallWallet = () => {
    window.open('https://phantom.app/', '_blank')
  }

  /**
   * Creates a WebRTC peer connection for real-time communication
   * @param targetPublicKey - The public key of the peer to connect with
   * @returns Promise<PeerConnection> - The established connection and data channel
   * 
   * Connection Flow:
   * 1. Creates RTCPeerConnection with STUN server configuration
   * 2. Sets up data channel for messaging
   * 3. Handles ICE candidate discovery
   * 4. Manages remote media stream
   * 
   * Note: Current implementation is for demo purposes.
   * Production version needs:
   * - Signaling server for ICE candidate exchange
   * - NAT traversal configuration
   * - Connection state management
   */
  const createPeerConnection = async (targetPublicKey: string) => {
    // TODO: Implement proper WebRTC signaling server
    console.warn('In production, implement proper WebRTC signaling')
    const configuration = { iceServers: [{ urls: import.meta.env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' }] }
    const peerConnection = new RTCPeerConnection(configuration)
    
    // Set up data channel
    const dataChannel = peerConnection.createDataChannel('messageChannel')
    dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'status_update') {
        setMessages(prev => prev.map(msg => 
          msg.timestamp === message.timestamp && msg.sender === message.sender
            ? { ...msg, status: message.status }
            : msg
        ))
      } else {
        // Send delivery confirmation
        const statusUpdate = {
          type: 'status_update',
          timestamp: message.timestamp,
          sender: message.sender,
          status: 'delivered'
        }
        dataChannel.send(JSON.stringify(statusUpdate))
        
        setMessages(prev => [...prev, { ...message, status: 'received' }])
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real app, send this to the peer via a signaling server
        console.log('New ICE candidate:', event.candidate)
      }
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    setPeerConnections(prev => ({
      ...prev,
      [targetPublicKey]: { connection: peerConnection, dataChannel }
    }))

    return { connection: peerConnection, dataChannel }
  }

  /**
   * Sends a message to the current chat recipient
   * 
   * Message Flow:
   * 1. Creates message object with sender, content, and timestamp
   * 2. Establishes peer connection if not exists
   * 3. Sends message through WebRTC data channel
   * 4. Updates local message state with sent status
   * 5. Simulates delivery confirmation after delay
   * 
   * Message States:
   * - sent: Initial state when message is sent
   * - delivered: Confirmed received by peer
   * - read: Peer has viewed the message
   */
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientKey) return

    const message: Message = {
      sender: publicKey?.toString() || '',
      content: newMessage,
      timestamp: Date.now(),
      status: 'sent'
    }

    let peerConnection = peerConnections[recipientKey]
    if (!peerConnection) {
      peerConnection = await createPeerConnection(recipientKey)
    }

    try {
      peerConnection.dataChannel.send(JSON.stringify({ ...message, type: 'message' }))
      setMessages(prev => [...prev, message])
      setNewMessage('')

      // Update to delivered after a short delay (simulating network delay)
      setTimeout(() => {
        const statusUpdate = {
          type: 'status_update',
          timestamp: message.timestamp,
          sender: message.sender,
          status: 'delivered'
        }
        peerConnection.dataChannel.send(JSON.stringify(statusUpdate))
      }, 1000)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  /**
   * Initiates a video/audio call with the current chat recipient
   * 1. Requests access to user's camera and microphone
   * 2. Sets up local video preview
   * 3. Adds media tracks to peer connection for streaming
   * 
   * Requires:
   * - recipientKey to be set
   * - Browser permission for media devices
   */
  const startCall = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Add tracks to peer connection
      if (recipientKey && peerConnections[recipientKey]) {
        stream.getTracks().forEach(track => {
          peerConnections[recipientKey].connection.addTrack(track, stream)
        })
      }

      setIsInCall(true)
    } catch (error) {
      console.error('Error accessing media devices:', error)
    }
  }

  /**
   * Toggles the microphone mute state during an active call
   * - Affects only audio tracks
   * - Maintains video state
   * - Updates UI to reflect current mute status
   */
  const toggleMute = () => {
    if (localStreamRef.current) {
      // Toggle enabled state for all audio tracks
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  // Mark messages as read when they are viewed
  useEffect(() => {
    if (messages.length > 0 && peerConnections[recipientKey]?.dataChannel) {
      const unreadMessages = messages.filter(
        msg => msg.sender !== publicKey?.toString() && msg.status !== 'read'
      )
      
      unreadMessages.forEach(msg => {
        const statusUpdate = {
          type: 'status_update',
          timestamp: msg.timestamp,
          sender: msg.sender,
          status: 'read'
        }
        peerConnections[recipientKey].dataChannel.send(JSON.stringify(statusUpdate))
        
        setMessages(prev => prev.map(m => 
          m.timestamp === msg.timestamp && m.sender === msg.sender
            ? { ...m, status: 'read' }
            : m
        ))
      })
    }
  }, [messages, recipientKey, publicKey, peerConnections])

  /**
   * Ends the current video/audio call and cleans up resources
   * 1. Stops all media tracks (camera/microphone)
   * 2. Clears video elements
   * 3. Resets call state
   * 
   * Note: This should be called before starting a new call
   * or when leaving the chat
   */
  const endCall = () => {
    if (localStreamRef.current) {
      // Stop all tracks to release camera/microphone
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setIsInCall(false)
    setIsMuted(false)
  }

  // Temporarily bypass Phantom check for testing
  if (false && (!window.solana || !window.solana.isPhantom)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Solvio</h1>
          <p className="text-gray-600 mb-6">Please install Phantom wallet to continue</p>
          <Button 
            onClick={handleInstallWallet}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Get Phantom Wallet
          </Button>
        </Card>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Solvio</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to start chatting</p>
          <div className="flex flex-col items-center">
            <WalletMultiButton className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-colors" />
            {connectionError && (
              <p className="text-sm text-red-500 mt-2">{connectionError}</p>
            )}
            <p className="text-sm text-gray-500 mt-4">Secure login with Solana blockchain</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main container with two panels */}
      <div className="flex-1 flex">
        {/* Left Panel (Chat List) */}
        <aside className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header with Wallet Info */}
          <div className="p-4 bg-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Solvio</h1>
                <div className="mt-1 text-sm text-blue-100">
                  {publicKey ? 
                    `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}` : 
                    'Connect wallet to start'
                  }
                </div>
              </div>
              <WalletMultiButton className="bg-transparent hover:bg-blue-700 text-white border border-white/20 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm transition-colors" />
            </div>
          </div>
          
          <div className="p-4 border-b">
            <Input
              placeholder="Search or start new chat"
              className="w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ChatList 
            onSelectChat={setRecipientKey}
            searchQuery={searchQuery}
          />
        </aside>

        {/* Right Panel (Active Chat) */}
        <main className="flex-1 flex flex-col bg-gray-100">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-lg font-semibold block">
                    {recipientKey ? `${recipientKey.slice(0, 4)}...${recipientKey.slice(-4)}` : 'Select a chat'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {recipientKey ? 'Online' : 'No chat selected'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {!isInCall ? (
                  <Button onClick={startCall} variant="ghost" size="sm" className="hover:bg-gray-100">
                    <Video className="h-5 w-5 text-blue-600" />
                  </Button>
                ) : (
                  <>
                    <Button onClick={toggleMute} variant="ghost" size="sm" className="hover:bg-gray-100">
                      {isMuted ? 
                        <MicOff className="h-5 w-5 text-red-500" /> : 
                        <Mic className="h-5 w-5 text-blue-600" />
                      }
                    </Button>
                    <Button onClick={endCall} variant="ghost" size="sm" className="hover:bg-gray-100">
                      <PhoneOff className="h-5 w-5 text-red-500" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === publicKey?.toString() ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-[65%] shadow-sm ${
                      msg.sender === publicKey?.toString()
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white rounded-bl-none'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <div className={`text-xs mt-1 flex items-center justify-end gap-1 ${
                      msg.sender === publicKey?.toString() ? 'text-blue-50' : 'text-gray-500'
                    }`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                      {msg.sender === publicKey?.toString() && (
                        <span className="flex">
                          {msg.status === 'read' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                              <path d="M2 12l5 5 12-12"></path>
                              <path d="M7 12l5 5 12-12"></path>
                            </svg>
                          ) : msg.status === 'delivered' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12l5 5 12-12"></path>
                              <path d="M7 12l5 5 12-12"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12l5 5 12-12"></path>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
                className="flex-1 bg-gray-50 focus:bg-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Video Call Overlay */}
          {isInCall && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <div className="w-48 h-36 bg-black rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-48 h-36 bg-black rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
