"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Bot, 
  MapPin, 
  User, 
  History as HistoryIcon,
  Activity,
  Loader2
} from "lucide-react";
import { 
  getProfile, 
  getEmergencyContacts, 
  getEmergencyHistory, 
  Profile, 
  EmergencyContact, 
  HistoryEntry 
} from "@/lib/supabase";

import EmergencyDashboard from "@/components/EmergencyDashboard";
import SymptomChat from "@/components/SymptomChat";
import ResourceFinder from "@/components/ResourceFinder";
import UserProfile from "@/components/UserProfile";
import EmergencyHistory from "@/components/EmergencyHistory";

interface TriageResult {
  risk_level: "Low" | "Medium" | "High";
  assessment: string;
  recommendations: string[];
  need_emergency: boolean;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Data States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // SOS States
  const [isSOSTriggered, setIsSOSTriggered] = useState(false);
  const [sosLocation, setSosLocation] = useState<{ lat: number; lon: number } | null>(null);

  // AI Triage States
  const [analysisResult, setAnalysisResult] = useState<TriageResult | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Initialize and load data on client mount
  useEffect(() => {
    async function loadData() {
      try {
        const prof = await getProfile();
        const cnts = await getEmergencyContacts();
        const hist = await getEmergencyHistory();
        
        setProfile(prof);
        setContacts(cnts);
        setHistory(hist);
      } catch (err) {
        console.error("Failed to load initial lifeguard data:", err);
      } finally {
        setMounted(true);
      }
    }
    loadData();

    // Register PWA Service Worker for offline installation support
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("LifeGuard PWA Service Worker registered:", reg.scope))
          .catch((err) => console.error("LifeGuard PWA Service Worker registration failed:", err));
      });
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-8 bg-zinc-50 dark:bg-black min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
      </div>
    );
  }

  const handleTriggerSOS = (location: { lat: number; lon: number }) => {
    setIsSOSTriggered(true);
    setSosLocation(location);
    
    // Dispatch Telegram Bot Alerts dynamically for any contacts that have registered Chat IDs
    if (contacts.length > 0) {
      contacts.forEach(async (contact) => {
        if (contact.telegram_chat_id) {
          try {
            await fetch("/api/send-telegram-alert", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chatId: contact.telegram_chat_id,
                name: contact.name,
                patientName: profile?.name || "A LifeGuard AI user",
                lat: location.lat,
                lon: location.lon,
                conditions: profile?.medical_conditions || ""
              })
            });
            console.log(`[TELEGRAM ALERT] Sent successfully to contact: ${contact.name}`);
          } catch (err) {
            console.error(`[TELEGRAM ALERT] Failed to send to contact ${contact.name}:`, err);
          }
        }
      });
    }
    
    // Refresh history entries since a new SOS record is registered
    setTimeout(async () => {
      const hist = await getEmergencyHistory();
      setHistory(hist);
    }, 500);
  };

  const handleCancelSOS = () => {
    setIsSOSTriggered(false);
    setSosLocation(null);
  };

  const handleAnalyzeSymptoms = async (symptomsText: string) => {
    setIsAnalysisLoading(true);
    setAnalysisResult(null);

    const cacheKey = symptomsText.toLowerCase().trim().replace(/\s+/g, " ");

    // 1. Check local storage cache for duplicate symptoms queries (Token Optimization)
    if (typeof window !== "undefined") {
      try {
        const cachedStore = localStorage.getItem("lifeguard_triage_cache");
        const cache = cachedStore ? JSON.parse(cachedStore) : {};
        if (cache[cacheKey]) {
          console.log("[CACHE HIT] Returning cached symptom triage for:", cacheKey);
          const cachedData = cache[cacheKey];
          setAnalysisResult(cachedData);
          
          // Trigger accessibility voice synthesis
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(cachedData.assessment);
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
          }
          
          setIsAnalysisLoading(false);
          return;
        }
      } catch (cacheErr) {
        console.warn("Error reading symptom triage cache from localStorage:", cacheErr);
      }
    }

    try {
      const res = await fetch("/api/analyze-symptoms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          symptoms: symptomsText,
          profile: profile
        })
      });

      if (!res.ok) {
        throw new Error("Failed to query analysis endpoint");
      }

      const data: TriageResult = await res.json();
      setAnalysisResult(data);

      // 2. Save result to cache
      if (typeof window !== "undefined") {
        try {
          const cachedStore = localStorage.getItem("lifeguard_triage_cache");
          const cache = cachedStore ? JSON.parse(cachedStore) : {};
          cache[cacheKey] = data;
          localStorage.setItem("lifeguard_triage_cache", JSON.stringify(cache));
        } catch (cacheWriteErr) {
          console.warn("Error writing symptom triage cache to localStorage:", cacheWriteErr);
        }
      }

      // Auto-refresh history listing after a short delay (once database entry is inserted)
      setTimeout(async () => {
        const hist = await getEmergencyHistory();
        setHistory(hist);
      }, 800);

      // Speak the assessment aloud if browser supports SpeechSynthesis for elderly accessibility
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel(); // cancel any active speech
        const utterance = new SpeechSynthesisUtterance(data.assessment);
        utterance.rate = 0.95; // slightly slower for elderly clarity
        window.speechSynthesis.speak(utterance);
      }
      
    } catch (err) {
      console.error("Error analyzing symptoms:", err);
      setAnalysisResult({
        risk_level: "High",
        assessment: "Failed to connect to the AI triage service. Due to safety precautions, please assume this could be a high-risk situation.",
        recommendations: [
          "Sit down and ask someone nearby for help.",
          "Check your internet connection.",
          "If you are feeling very sick, trigger SOS or call emergency services."
        ],
        need_emergency: true
      });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Emergency", icon: <ShieldAlert className="h-5 w-5" /> },
    { id: "assistant", label: "AI Assistant", icon: <Bot className="h-5 w-5" /> },
    { id: "hospitals", label: "Find Care", icon: <MapPin className="h-5 w-5" /> },
    { id: "profile", label: "Health Profile", icon: <User className="h-5 w-5" /> },
    { id: "history", label: "History Log", icon: <HistoryIcon className="h-5 w-5" /> }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans pb-28 md:pb-12">
      {/* 1. TOP HEADER BRAND */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/10">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                LifeGuard AI
              </h1>
              <p className="text-[10px] text-zinc-500 font-semibold tracking-wide uppercase">
                Emergency Triage Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSOSTriggered && (
              <div className="flex items-center gap-1 bg-red-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full animate-pulse uppercase tracking-wider">
                <ShieldAlert className="h-3 w-3" /> SOS Triggered
              </div>
            )}
            <div className="text-[10px] text-zinc-400 font-bold hidden sm:block">
              V1.0 • Offline-Ready
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE APP BODY */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {/* Dynamic content rendering based on activeTab */}
        {activeTab === "dashboard" && (
          <EmergencyDashboard
            profile={profile}
            contacts={contacts}
            onTriggerSOS={handleTriggerSOS}
            onCancelSOS={handleCancelSOS}
            onAnalyzeSymptoms={handleAnalyzeSymptoms}
            isSOSTriggered={isSOSTriggered}
            sosLocation={sosLocation}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "assistant" && (
          <SymptomChat
            analysisResult={analysisResult}
            isLoading={isAnalysisLoading}
            onAnalyzeSymptoms={handleAnalyzeSymptoms}
            onTriggerSOS={handleTriggerSOS}
            isSOSTriggered={isSOSTriggered}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "hospitals" && (
          <ResourceFinder
            initialLocation={sosLocation}
          />
        )}

        {activeTab === "profile" && (
          <UserProfile
            key={profile?.updated_at || 'loading'}
            initialProfile={profile}
            initialContacts={contacts}
            onProfileUpdated={(updatedProf) => setProfile(updatedProf)}
            onContactsUpdated={(updatedContacts) => setContacts(updatedContacts)}
          />
        )}

        {activeTab === "history" && (
          <EmergencyHistory
            history={history}
          />
        )}
        <div className="h-20 md:hidden" />
      </main>

      {/* 3. MOBILE & TABLET BOTTOM NAV TAB BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-black/95 border-t border-zinc-200/60 dark:border-zinc-800/60 shadow-lg backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 h-20 flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "text-red-600 dark:text-red-500 font-extrabold scale-105" 
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-medium"
                }`}
              >
                <div className={`${isActive ? "text-red-600 dark:text-red-500 animate-bounce" : ""}`}>
                  {tab.icon}
                </div>
                <span className="text-[10px] tracking-wide font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
