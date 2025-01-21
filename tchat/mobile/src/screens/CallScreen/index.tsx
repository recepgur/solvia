import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, CallScreenProps } from '../../types/navigation';
import WebRTCManager from '../../utils/webrtc';
import { theme } from '../../constants/theme';
import { RTCView, MediaStream } from 'react-native-webrtc';

type CallScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Call'>;

export default function CallScreen() {
  const route = useRoute<CallScreenProps['route']>();
  const navigation = useNavigation<CallScreenNavigationProp>();
  const { userId, isVideo } = route.params;
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setCameraOff] = useState(false);
  
  const webrtcManager = useRef(new WebRTCManager()).current;

  useEffect(() => {
    const initializeCall = async () => {
      try {
        const stream = await webrtcManager.initializeLocalStream();
        setLocalStream(stream);
        
        // Create peer connection and handle remote stream
        const pc = await webrtcManager.createPeerConnection(userId);
        pc.onaddstream = (event) => {
          setRemoteStream(event.stream);
        };
        
        // Create and send offer
        const offer = await webrtcManager.createOffer(userId);
        // TODO: Send offer to backend via WebSocket
      } catch (error) {
        console.error('Call initialization error:', error);
        navigation.goBack();
      }
    };

    initializeCall();

    return () => {
      webrtcManager.cleanup();
    };
  }, [userId]);

  const handleEndCall = () => {
    webrtcManager.cleanup();
    navigation.goBack();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream && isVideo) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setCameraOff(!isCameraOff);
    }
  };

  return (
    <View style={styles.container}>
      {isVideo && (
        <>
          {remoteStream && (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
            />
          )}
          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
            />
          )}
        </>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlText}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>

        {isVideo && (
          <TouchableOpacity
            style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
            onPress={toggleCamera}
          >
            <Text style={styles.controlText}>
              {isCameraOff ? 'Camera On' : 'Camera Off'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Text style={styles.controlText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  localVideo: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 100,
    height: 150,
    backgroundColor: '#000',
    borderRadius: theme.borderRadius.md,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  controlButtonActive: {
    backgroundColor: theme.colors.error,
  },
  endCallButton: {
    backgroundColor: theme.colors.error,
  },
  controlText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
});
