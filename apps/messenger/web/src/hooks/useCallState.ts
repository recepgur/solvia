import { useState, useCallback } from 'react';
import { Call } from '@solvia/messenger-shared';

export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'ongoing' | 'ended' | 'error';

interface CallState {
  currentCall: Call | null;
  status: CallStatus;
  error: Error | null;
}

export const useCallState = () => {
  const [state, setState] = useState<CallState>({
    currentCall: null,
    status: 'idle',
    error: null,
  });

  const setCallStatus = useCallback((status: CallStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState((prev) => ({ ...prev, status: 'error', error }));
  }, []);

  const startCall = useCallback((call: Call) => {
    setState({
      currentCall: call,
      status: 'connecting',
      error: null,
    });
  }, []);

  const endCall = useCallback(() => {
    setState({
      currentCall: null,
      status: 'idle',
      error: null,
    });
  }, []);

  return {
    ...state,
    setCallStatus,
    setError,
    startCall,
    endCall,
  };
};
