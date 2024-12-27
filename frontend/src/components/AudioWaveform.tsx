import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  stream?: MediaStream;
  isRecording: boolean;
  audioUrl?: string;
  onPlaybackComplete?: () => void;
}

export function AudioWaveform({ stream, isRecording, audioUrl, onPlaybackComplete }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode>();
  const audioRef = useRef<HTMLAudioElement>();
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!ctx || !analyser) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    // Set up audio source based on whether we're recording or playing back
    if (stream && isRecording) {
      sourceRef.current?.disconnect();
      sourceRef.current = audioContext.createMediaStreamSource(stream);
      sourceRef.current.connect(analyser);
      draw();
    } else if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener('ended', () => {
          onPlaybackComplete?.();
          cancelAnimationFrame(animationFrameRef.current!);
        });
      }

      sourceRef.current?.disconnect();
      sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyser);
      sourceRef.current.connect(audioContext.destination);
      audioRef.current.play();
      draw();
    }

    return () => {
      cancelAnimationFrame(animationFrameRef.current!);
      sourceRef.current?.disconnect();
    };
  }, [stream, isRecording, audioUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={50}
      className="rounded-lg bg-gray-900"
    />
  );
}
