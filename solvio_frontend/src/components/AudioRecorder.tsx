import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send } from 'lucide-react';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  className?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = async () => {
    if (audioBlob) {
      await onSend(audioBlob);
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-2 md:p-0 touch-none ${className}`}>
      {!isRecording && !audioBlob && (
        <Button
          variant="ghost"
          size="icon"
          onClick={startRecording}
          className="text-primary hover:text-primary/80"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}

      {isRecording && (
        <>
          <span className="text-sm text-red-500 animate-pulse">
            Recording... {formatTime(recordingTime)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            className="text-primary hover:text-primary/80"
          >
            <Square className="h-5 w-5" />
          </Button>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <audio 
            controls 
            src={URL.createObjectURL(audioBlob)} 
            className="h-8 w-full max-w-[200px] md:max-w-[300px] touch-manipulation" 
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSend}
            className="text-primary hover:text-primary/80"
          >
            <Send className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default AudioRecorder;
