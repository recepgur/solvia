'use client';

import React, { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useWebRTC } from '@/hooks/useWebRTC';

interface CallInterfaceProps {
  recipientPublicKey: string;
  onEndCall: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({
  recipientPublicKey,
  onEndCall,
}) => {
  const {
    callState,
    initiateCall,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (callState.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  useEffect(() => {
    if (callState.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  const handleStartCall = async () => {
    const signal = await initiateCall(recipientPublicKey);
    if (signal) {
      // Here you would typically send the signal to the recipient
      // through your messaging system
      console.log('Call signal generated:', signal);
    }
  };

  const handleEndCall = () => {
    endCall();
    onEndCall();
  };

  return (
    <Box
      w="full"
      maxW="xl"
      bg={bgColor}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Flex direction="column" h="full">
        {/* Video Container */}
        <Box position="relative" w="full" h="60vh" bg="black">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <Box
            position="absolute"
            right="4"
            bottom="4"
            width="150px"
            height="100px"
            borderRadius="md"
            overflow="hidden"
            border="2px solid"
            borderColor="white"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
        </Box>

        {/* Controls */}
        <Flex
          p={4}
          justify="center"
          align="center"
          bg={useColorModeValue('gray.50', 'gray.900')}
        >
          <VStack spacing={4}>
            <Flex gap={4}>
              <IconButton
                aria-label="Toggle Video"
                onClick={toggleVideo}
                icon={<span>📹</span>}
                size="lg"
                colorScheme="blue"
                variant="outline"
              />
              <IconButton
                aria-label="Toggle Audio"
                onClick={toggleAudio}
                icon={<span>🎤</span>}
                size="lg"
                colorScheme="blue"
                variant="outline"
              />
              <IconButton
                aria-label="End Call"
                onClick={handleEndCall}
                icon={<span>📞</span>}
                size="lg"
                colorScheme="red"
              />
            </Flex>
            
            {!callState.isInCall && (
              <Button
                colorScheme="green"
                onClick={handleStartCall}
                leftIcon={<span>📞</span>}
              >
                Start Call
              </Button>
            )}
          </VStack>
        </Flex>

        {/* Connection Status */}
        <Box p={2} bg={callState.isInCall ? 'green.500' : 'gray.500'}>
          <Text color="white" textAlign="center">
            {callState.isInCall ? 'Connected' : 'Not Connected'}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};
