import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioSpectrumProps {
  isActive: boolean;
  audioStream?: MediaStream | null;
  className?: string;
}

const AudioSpectrum: React.FC<AudioSpectrumProps> = ({ 
  isActive, 
  audioStream, 
  className 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    if (audioStream && isActive) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      startVisualization();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        audioContext.close();
      };
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [audioStream, isActive]);

  const startVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current || !dataArrayRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = analyser.frequencyBinCount;

    const draw = () => {
      if (!isActive) return;

      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / bufferLength * 2.5;
      let barHeight;
      let x = 0;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, 'hsl(215, 100%, 60%)');
      gradient.addColorStop(0.5, 'hsl(215, 100%, 70%)');
      gradient.addColorStop(1, 'hsl(215, 100%, 80%)');

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'hsl(215, 100%, 70%)';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Fallback bars for when there's no audio stream
  const renderFallbackBars = () => {
    const bars = Array.from({ length: 32 }, (_, i) => (
      <div
        key={i}
        className={cn(
          "spectrum-bar w-1 bg-gradient-to-t from-primary to-primary-glow rounded-full",
          isActive ? "animate-spectrum-dance" : "opacity-30"
        )}
        style={{
          height: isActive ? `${20 + Math.random() * 40}%` : '20%',
          animationDelay: `${i * 0.05}s`,
          animationDuration: `${0.5 + Math.random() * 0.4}s`
        }}
      />
    ));

    return (
      <div className="flex items-end justify-center space-x-1 h-16">
        {bars}
      </div>
    );
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {audioStream ? (
        <canvas
          ref={canvasRef}
          width={320}
          height={64}
          className="max-w-full h-16"
        />
      ) : (
        renderFallbackBars()
      )}
    </div>
  );
};

export default AudioSpectrum;