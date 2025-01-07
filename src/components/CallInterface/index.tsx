'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useWebRTC } from '@/hooks/useWebRTC';

interface CallInterfaceProps {
  isActive: boolean;
  onEndCall: () => void;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ isActive, onEndCall }) => {
  const t = useTranslations('common');
  const { localStream, remoteStream } = useWebRTC();
  const localVideoRef = useRef<globalThis.HTMLVideoElement>(null);
  const remoteVideoRef = useRef<globalThis.HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isActive) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="blackAlpha.900"
      zIndex={1000}
      p={4}
    >
      <HStack spacing={4} position="relative" h="full">
        {/* Remote Video */}
        <Box flex={1} h="full" position="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px',
            }}
          />
        </Box>

        {/* Local Video (Picture-in-Picture) */}
        <Box
          position="absolute"
          bottom={4}
          right={4}
          width="200px"
          height="150px"
          borderRadius="md"
          overflow="hidden"
          border="2px solid"
          borderColor="whiteAlpha.300"
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

        {/* Controls */}
        <Button
          position="absolute"
          bottom={4}
          left="50%"
          transform="translateX(-50%)"
          colorScheme="red"
          onClick={onEndCall}
        >
          {t('end_call')}
        </Button>
      </HStack>
    </Box>
  );
};

export default CallInterface;
