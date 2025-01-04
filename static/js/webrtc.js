class WebRTCHandler {
    constructor() {
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.videoContainer = document.getElementById('videoContainer');
        this.permissionDialog = document.getElementById('cameraPermissionDialog');
        this.callDurationElement = document.getElementById('callDuration');
        this.localStream = null;
        this.peerConnection = null;
        this.callDurationInterval = null;
        this.callStartTime = null;
        this.isCameraEnabled = true;
        this.isMicEnabled = true;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    showPermissionDialog() {
        this.permissionDialog.style.display = 'block';
    }

    hidePermissionDialog() {
        this.permissionDialog.style.display = 'none';
    }

    async denyPermission() {
        this.hidePermissionDialog();
        if (this.currentCall) {
            await this.endCall();
        }
    }

    async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true },
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            this.hidePermissionDialog();
            this.localStream = stream;
            if (this.localVideo) {
                this.localVideo.srcObject = stream;
            }
            return true;
        } catch (error) {
            console.error('Kamera izni alınamadı:', error);
            alert('Kamera ve mikrofon izni verilmedi. Görüntülü arama yapılamıyor.');
            this.hidePermissionDialog();
            return false;
        }
    }

    startCallDurationTimer() {
        this.callStartTime = Date.now();
        this.callDurationInterval = setInterval(() => {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
            const seconds = (duration % 60).toString().padStart(2, '0');
            if (this.callDurationElement) {
                this.callDurationElement.textContent = `${minutes}:${seconds}`;
            }
        }, 1000);
    }

    stopCallDurationTimer() {
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }
        if (this.callDurationElement) {
            this.callDurationElement.textContent = '00:00';
        }
    }

    async initializeMediaDevices() {
        this.showPermissionDialog();
        const permissionGranted = await this.requestPermission();
        if (!permissionGranted) {
            throw new Error('Kamera izni reddedildi');
        }
        return this.localStream;
    }

    async startCall() {
        try {
            if (!this.localStream) {
                this.showPermissionDialog();
                const permissionGranted = await this.requestPermission();
                if (!permissionGranted) {
                    return;
                }
            }
            
            this.videoContainer.style.display = 'block';
            this.startCallDurationTimer();
            
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
                this.showPermissionDialog();
                const permissionGranted = await this.requestPermission();
                if (!permissionGranted) {
                    window.wsHandler.send({ type: 'call-rejected', reason: 'permission-denied' });
                    return;
                }
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

    async endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.localVideo) this.localVideo.srcObject = null;
        if (this.remoteVideo) this.remoteVideo.srcObject = null;
        
        this.videoContainer.style.display = 'none';
        this.stopCallDurationTimer();
        this.isCameraEnabled = true;
        this.isMicEnabled = true;
        
        window.wsHandler.send({ type: 'call-ended' });
    }

    async toggleCamera() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.isCameraEnabled = !this.isCameraEnabled;
                videoTrack.enabled = this.isCameraEnabled;
                const cameraBtn = document.querySelector('.control-btn i.fa-video');
                if (cameraBtn) {
                    cameraBtn.className = this.isCameraEnabled ? 'fas fa-video' : 'fas fa-video-slash';
                }
            }
        }
    }

    async toggleMic() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isMicEnabled = !this.isMicEnabled;
                audioTrack.enabled = this.isMicEnabled;
                const micBtn = document.querySelector('.control-btn i.fa-microphone');
                if (micBtn) {
                    micBtn.className = this.isMicEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
                }
            }
        }
    }

    minimizeCall() {
        // For now, just end the call when minimizing
        this.endCall();
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

    handleCallRejected(reason) {
        if (reason === 'permission-denied') {
            alert('Karşı taraf kamera izni vermedi. Arama sonlandırıldı.');
        } else {
            alert('Arama reddedildi.');
        }
        this.endCall();
        document.getElementById('status').innerHTML = '<span class="error">Arama reddedildi</span>';
    }
}

window.rtcHandler = new WebRTCHandler();
