class WebRTCBrowserManager {
  constructor() {
    this.peerConnections = new Map()
    this.localStream = null
    this.onCallCallback = null
  }

  async init() {
    try {
      // Initialize WebRTC adapter for browser compatibility
      require('webrtc-adapter')
      console.log('WebRTC Browser Manager initialized')
    } catch (error) {
      console.error('Failed to initialize WebRTC manager:', error)
      throw error
    }
  }

  async startCall(peerId, type = 'video') {
    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream)
      })

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      this.peerConnections.set(peerId, peerConnection)
      
      return {
        type: 'offer',
        sdp: peerConnection.localDescription
      }
    } catch (error) {
      console.error('Error starting call:', error)
      throw error
    }
  }

  async handleIncomingCall(peerId, offer) {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      this.peerConnections.set(peerId, peerConnection)

      return {
        type: 'answer',
        sdp: peerConnection.localDescription
      }
    } catch (error) {
      console.error('Error handling incoming call:', error)
      throw error
    }
  }

  async handleAnswer(peerId, answer) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  endCall(peerId) {
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }

  onCall(callback) {
    this.onCallCallback = callback
  }
}

export default WebRTCBrowserManager
