import React, { useState, useRef, useCallback } from 'react';
import { Mic, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AudioSpectrum from './AudioSpectrum';

type VoiceBotState = 'idle' | 'recording' | 'processing' | 'playing';

const VoiceBot: React.FC = () => {
  const [state, setState] = useState<VoiceBotState>('idle');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isAudioSupported, setIsAudioSupported] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  const webhookUrl = 'http://localhost:5678/webhook-test/voice-chat';

  const checkAudioSupport = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Audio not supported:', error);
      setIsAudioSupported(false);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice chat.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;

    const isSupported = await checkAudioSupport();
    if (!isSupported) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      setAudioStream(stream);
      setState('recording');
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        sendAudioToWebhook();
      };

      mediaRecorder.start();
      
      toast({
        title: "Recording Started",
        description: "Speak now, click Send when finished.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not start recording. Please check your microphone.",
        variant: "destructive",
      });
      setState('idle');
    }
  }, [state, checkAudioSupport, toast]);

  const stopRecording = useCallback(() => {
    if (state !== 'recording' || !mediaRecorderRef.current) return;

    setState('processing');
    mediaRecorderRef.current.stop();
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  }, [state, audioStream]);

  const sendAudioToWebhook = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setState('idle');
      return;
    }

    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the voice assistant.",
        variant: "destructive",
      });
      setState('idle');
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('userEmail', user.email);
      formData.append('userName', user.name);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseBlob = await response.blob();
      
      if (responseBlob.type.includes('audio')) {
        playAudioResponse(responseBlob);
      } else {
        throw new Error('Invalid audio response from server');
      }
      
    } catch (error) {
      console.error('Error sending audio:', error);
      toast({
        title: "Request Failed",
        description: "Could not process your request. Please try again.",
        variant: "destructive",
      });
      setState('idle');
    }
  }, [toast, isAuthenticated, user]);

  const playAudioResponse = useCallback((audioBlob: Blob) => {
    setState('playing');
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioElementRef.current = audio;

    audio.onended = () => {
      setState('idle');
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      console.error('Error playing audio response');
      toast({
        title: "Playback Failed",
        description: "Could not play the audio response.",
        variant: "destructive",
      });
      setState('idle');
      URL.revokeObjectURL(audioUrl);
    };

    audio.play().catch((error) => {
      console.error('Audio play failed:', error);
      setState('idle');
      URL.revokeObjectURL(audioUrl);
    });
  }, [toast]);

  const handleButtonClick = useCallback(() => {
    switch (state) {
      case 'idle':
        startRecording();
        break;
      case 'recording':
        stopRecording();
        break;
      default:
        break;
    }
  }, [state, startRecording, stopRecording]);

  const getButtonText = () => {
    switch (state) {
      case 'recording':
        return 'Send';
      case 'processing':
        return 'Processing...';
      case 'playing':
        return 'Playing...';
      default:
        return 'Ask';
    }
  };

  const getButtonIcon = () => {
    switch (state) {
      case 'recording':
        return <Send className="w-5 h-5" />;
      case 'processing':
      case 'playing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      default:
        return <Mic className="w-5 h-5" />;
    }
  };

  const isDisabled = state === 'processing' || state === 'playing' || !isAudioSupported || !isAuthenticated;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
          Taki
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
          Ask Questions
        </p>
      </div>

      {/* Main Voice Interface */}
      <Card className="w-full max-w-2xl p-8 bg-gradient-card border-border/50 shadow-card backdrop-blur-sm">
        {/* Audio Spectrum Visualization */}
        <div className="mb-8">
          <AudioSpectrum 
            isActive={state === 'recording'} 
            audioStream={audioStream}
            className="animate-slide-up"
          />
        </div>

        {/* Status Text */}
        <div className="text-center mb-8">
          <p className={cn(
            "text-lg font-medium transition-all duration-300",
            state === 'recording' && "text-voice-active",
            state === 'processing' && "text-primary",
            state === 'playing' && "text-success",
            state === 'idle' && "text-muted-foreground"
          )}>
            {state === 'idle' && "Ready to listen"}
            {state === 'recording' && "Listening... Click Send when done"}
            {state === 'processing' && "Processing your request..."}
            {state === 'playing' && "Playing response..."}
          </p>
        </div>

        {/* Voice Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleButtonClick}
            disabled={isDisabled}
            variant={state === 'recording' ? 'recording' : 'default'}
            size="lg"
            className={cn(
              "px-8 py-6 text-lg font-semibold rounded-2xl",
              "transition-all duration-300 transform",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              state === 'idle' && "hover:scale-105"
            )}
          >
            <span className="mr-3">
              {getButtonIcon()}
            </span>
            {getButtonText()}
          </Button>
        </div>
      </Card>

      {/* Additional Info */}
      <div className="mt-8 text-center text-sm text-muted-foreground max-w-lg animate-fade-in">
        <p>
          This voice bot sends your audio to a local n8n webhook and plays back the AI response.
          Make sure your n8n workflow is running on localhost:5678.
        </p>
      </div>
    </div>
  );
};

export default VoiceBot;