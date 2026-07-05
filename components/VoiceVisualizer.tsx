"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface VoiceVisualizerProps {
  onTranscriptReady: (text: string) => void;
  placeholder?: string;
}

export default function VoiceVisualizer({
  onTranscriptReady,
  placeholder = "Describe your symptoms by voice..."
}: VoiceVisualizerProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [supported, setSupported] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
          setRecordingSeconds(0);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        };

        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            onTranscriptReady(text);
          }
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          stopTimer();
          setIsListening(false);
        };

        rec.onend = () => {
          stopTimer();
          setIsListening(false);
        };

        setRecognition(rec);
      } else {
        setSupported(false);
      }
    }

    return () => {
      stopTimer();
    };
  }, [onTranscriptReady]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleListening = () => {
    if (!supported || !recognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your symptoms instead.");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 transition-all duration-300">
      {isListening ? (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative flex items-center justify-center">
            {/* Glowing ring */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-md animate-ping" />
            <Button
              onClick={toggleListening}
              size="lg"
              className="relative h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg flex items-center justify-center focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 transition-transform active:scale-95"
              aria-label="Stop listening"
            >
              <MicOff className="h-8 w-8 animate-pulse" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <p className="text-lg font-bold text-red-600 dark:text-red-400 animate-pulse">
              Listening... Speak now
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Recording Time: {formatTime(recordingSeconds)}
            </p>
          </div>

          {/* Audio ripples */}
          <div className="flex gap-1.5 items-end justify-center h-12 mt-2">
            <div className="wave-bar animate-bounce" style={{ animationDuration: "0.8s", animationDelay: "0.1s", height: "16px" }} />
            <div className="wave-bar animate-bounce" style={{ animationDuration: "1.1s", animationDelay: "0.3s", height: "32px" }} />
            <div className="wave-bar animate-bounce" style={{ animationDuration: "0.7s", animationDelay: "0.5s", height: "48px" }} />
            <div className="wave-bar animate-bounce" style={{ animationDuration: "0.9s", animationDelay: "0.2s", height: "24px" }} />
            <div className="wave-bar animate-bounce" style={{ animationDuration: "1.2s", animationDelay: "0.4s", height: "36px" }} />
            <div className="wave-bar animate-bounce" style={{ animationDuration: "0.8s", animationDelay: "0.6s", height: "14px" }} />
          </div>

          <p className="text-sm italic text-zinc-600 dark:text-zinc-300 max-w-sm">
            "Tap the red button when you are finished speaking"
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={toggleListening}
            disabled={!supported}
            size="lg"
            className={`h-16 w-16 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
              supported 
                ? "bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black" 
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
            }`}
            aria-label="Start voice input"
          >
            <Mic className="h-7 w-7" />
          </Button>

          <div className="space-y-1">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              {supported ? "Use Voice Assistant" : "Voice Input Unsupported"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              {supported 
                ? "Perfect for hands-free and quick symptom logging during stressful situations." 
                : "Your browser does not support the Web Speech API. Please type in your symptoms instead."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
