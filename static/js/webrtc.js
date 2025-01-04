class WebRTCHandler {
    constructor() {
        this.localStream = null;
        this.peerConnection = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    async initializeMediaDevices() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            document.getElementById('startCall').disabled = false;
            return true;
        } catch (error) {
            document.getElementById('status').innerHTML = 
                `<span class="error">Kamera/mikrofon erişimi hatası: ${error.message}</span>`;
            document.getElementById('startCall').disabled = true;
            return false;
        }
    }

    async startCall() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            document.getElementById('localVideo').srcObject = this.localStream;
            
            this.peerConnection = new RTCPeerConnection(this.configuration);
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                document.getElementById('remoteVideo').srcObject = event.streams[0];
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    window.wsHandler.send({
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };

            this.peerConnection.oniceconnectionstatechange = () => {
                const status = document.getElementById('status');
                switch(this.peerConnection.iceConnectionState) {
                    case 'checking':
                        status.textContent = 'Bağlantı kuruluyor...';
                        break;
                    case 'connected':
                        status.textContent = 'Bağlantı kuruldu';
                        break;
                    case 'disconnected':
                        status.textContent = 'Bağlantı kesildi';
                        break;
                    case 'failed':
                        status.innerHTML = '<span class="error">Bağlantı başarısız</span>';
                        this.endCall();
                        break;
                }
            };
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            window.wsHandler.send({
                type: 'offer',
                offer: offer
            });
            
            document.getElementById('startCall').disabled = true;
            document.getElementById('endCall').disabled = false;
            
        } catch (error) {
            document.getElementById('status').innerHTML = 
                `<span class="error">Video arama başlatılamadı: ${error.message}</span>`;
        }
    }

    async handleOffer(message) {
        try {
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                document.getElementById('localVideo').srcObject = this.localStream;
            }
            
            this.peerConnection = new RTCPeerConnection(this.configuration);
            
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            this.peerConnection.ontrack = (event) => {
                document.getElementById('remoteVideo').srcObject = event.streams[0];
            };
            
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    window.wsHandler.send({
                        type: 'ice-candidate',
                        candidate: event.candidate
                    });
                }
            };
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            window.wsHandler.send({
                type: 'answer',
                answer: answer
            });
            
            document.getElementById('startCall').disabled = true;
            document.getElementById('endCall').disabled = false;
            
        } catch (error) {
            document.getElementById('status').innerHTML = 
                `<span class="error">Arama yanıtlanamadı: ${error.message}</span>`;
        }
    }

    async handleAnswer(message) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } catch (error) {
            document.getElementById('status').innerHTML = 
                `<span class="error">Arama yanıtı işlenemedi: ${error.message}</span>`;
        }
    }


    async handleIceCandidate(message) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        } catch (error) {
            document.getElementById('status').innerHTML = 
                `<span class="error">ICE adayı eklenemedi: ${error.message}</span>`;
        }
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        document.getElementById('localVideo').srcObject = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('startCall').disabled = false;
        document.getElementById('endCall').disabled = true;
        
        window.wsHandler.send({ type: 'call-ended' });
    }

    handleCallEnded() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        document.getElementById('localVideo').srcObject = null;
        document.getElementById('remoteVideo').srcObject = null;
        document.getElementById('startCall').disabled = false;
        document.getElementById('endCall').disabled = true;
    }
}

window.rtcHandler = new WebRTCHandler();
