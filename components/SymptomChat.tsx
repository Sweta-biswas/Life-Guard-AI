"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  Loader2, 
  Sparkles 
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { addHistoryEntry } from "@/lib/supabase";

interface TriageResult {
  risk_level: "Low" | "Medium" | "High";
  assessment: string;
  recommendations: string[];
  need_emergency: boolean;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
  triage?: TriageResult;
}

interface SymptomChatProps {
  analysisResult: TriageResult | null;
  isLoading: boolean;
  onAnalyzeSymptoms: (text: string) => void;
  onTriggerSOS: (location: { lat: number; lon: number }) => void;
  isSOSTriggered: boolean;
  setActiveTab: (tab: string) => void;
}

export default function SymptomChat({
  analysisResult,
  isLoading,
  onAnalyzeSymptoms,
  onTriggerSOS,
  isSOSTriggered,
  setActiveTab
}: SymptomChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your AI Health Assistant. Please describe how you are feeling, or select a symptom from the dashboard, and I will analyze your situation. (Note: I am a triage tool, not a doctor. In emergencies, tap the SOS button immediately.)",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Use ref to read fresh messages inside useEffect without triggering dependency warnings
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // If parent handles new analysis, add to chat log
  useEffect(() => {
    if (analysisResult) {
      // Find last user input to pair it, or treat as a new triage event
      const lastUserMsg = [...messagesRef.current].reverse().find(m => m.sender === "user");
      const userText = lastUserMsg?.text || "Symptom Analysis Request";
      
      const newBotMsg: Message = {
        id: "triage_" + Date.now(),
        sender: "bot",
        text: `Based on the described symptoms: "${userText}"`,
        timestamp: new Date(),
        triage: analysisResult
      };
      
      setMessages(prev => [...prev, newBotMsg]);
      
      // Auto save symptom analysis to history
      addHistoryEntry({
        type: "symptom_analysis",
        description: userText.length > 50 ? userText.substring(0, 50) + "..." : userText,
        risk_level: analysisResult.risk_level,
        details: {
          assessment: analysisResult.assessment,
          recommendations: analysisResult.recommendations,
          need_emergency: analysisResult.need_emergency
        }
      });
    }
  }, [analysisResult]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    // Add user message
    const userMsg: Message = {
      id: "usr_" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Check if this looks like a health query or general assistant question
    onAnalyzeSymptoms(userText);
  };

  const handleSOSConfirm = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onTriggerSOS({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          onTriggerSOS({ lat: 0, lon: 0 });
        }
      );
    } else {
      onTriggerSOS({ lat: 0, lon: 0 });
    }
  };

  const getRiskStyles = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "High":
        return {
          bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50",
          text: "text-red-700 dark:text-red-400",
          headerBg: "bg-red-600",
          icon: <AlertTriangle className="h-6 w-6 text-white" />
        };
      case "Medium":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50",
          text: "text-amber-700 dark:text-amber-400",
          headerBg: "bg-amber-500",
          icon: <Info className="h-6 w-6 text-white" />
        };
      case "Low":
      default:
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50",
          text: "text-emerald-700 dark:text-emerald-400",
          headerBg: "bg-emerald-600",
          icon: <CheckCircle2 className="h-6 w-6 text-white" />
        };
    }
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] max-h-[calc(100vh-13rem)] border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl bg-white dark:bg-zinc-950 shadow-lg overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-1">
              LifeGuard Triage AI <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-[10px] text-zinc-500">Automated Assistant & Symptom Checker</p>
          </div>
        </div>

        {isSOSTriggered && (
          <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-bold px-2 py-1 rounded-full animate-pulse uppercase">
            SOS Active
          </span>
        )}
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            {/* User message */}
            {msg.sender === "user" && (
              <div className="flex justify-end items-start gap-2">
                <div className="bg-zinc-950 text-white dark:bg-zinc-100 dark:text-black text-sm p-3.5 rounded-2xl max-w-[80%] rounded-tr-none font-medium leading-relaxed">
                  {msg.text}
                </div>
                <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs font-bold">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* Bot message */}
            {msg.sender === "bot" && (
              <div className="flex justify-start items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                
                <div className="space-y-3 max-w-[85%]">
                  {!msg.triage ? (
                    <div className="bg-zinc-50 dark:bg-zinc-900/40 text-sm p-3.5 rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-200 leading-relaxed">
                      {msg.text}
                    </div>
                  ) : (
                    /* Triage Card response */
                    <Card className={`border shadow-sm overflow-hidden rounded-2xl ${getRiskStyles(msg.triage.risk_level).bg}`}>
                      <div className={`p-3 text-white font-extrabold text-sm flex items-center gap-2 ${getRiskStyles(msg.triage.risk_level).headerBg}`}>
                        {getRiskStyles(msg.triage.risk_level).icon}
                        RISK ASSESSMENT: {msg.triage.risk_level.toUpperCase()}
                      </div>
                      
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Assessment Summary
                          </p>
                          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                            {msg.triage.assessment}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                            Recommendations
                          </p>
                          <ul className="space-y-1.5">
                            {msg.triage.recommendations.map((rec, i) => (
                              <li key={i} className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5">
                                <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Critical SOS Prompt inside triage card */}
                        {msg.triage.need_emergency && !isSOSTriggered && (
                          <div className="p-3 bg-red-500/10 dark:bg-red-500/5 rounded-xl border border-red-500/30 flex flex-col gap-2.5">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400">
                              This situation may require emergency support. Do you want to notify emergency contacts and search nearby care facilities?
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleSOSConfirm}
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 h-8 text-xs rounded-lg shadow-sm flex items-center gap-1"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" /> Yes, Trigger SOS
                              </Button>
                              <Button
                                onClick={() => setActiveTab("hospitals")}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 dark:border-red-900 dark:text-red-400 bg-white hover:bg-red-50 text-xs px-3 py-1.5 h-8 rounded-lg"
                              >
                                No, Find Hospitals Only
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Suggest seeking care for Low/Medium cases */}
                        {!msg.triage.need_emergency && (
                          <Button
                            onClick={() => setActiveTab("hospitals")}
                            size="sm"
                            variant="outline"
                            className="text-xs border-zinc-300 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 h-8 mt-1"
                          >
                            Show Nearby Medical Centers
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black flex items-center justify-center">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/40 text-xs font-medium text-zinc-500 p-3 rounded-2xl flex items-center gap-2 border border-zinc-100 dark:border-zinc-800/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing symptoms with LifeGuard AI...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form Footer */}
      <form onSubmit={handleSubmit} className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200/60 dark:border-zinc-800/60 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          placeholder="Ask a follow up question or detail symptoms..."
          className="flex-1 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="h-10 w-10 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl flex items-center justify-center shadow-sm shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
