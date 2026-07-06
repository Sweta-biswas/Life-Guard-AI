"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  PhoneCall, 
  Activity, 
  ShieldAlert, 
  Heart, 
  UserPlus, 
  Navigation,
  Loader2,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Profile, EmergencyContact, addHistoryEntry } from "@/lib/supabase";
import VoiceVisualizer from "./VoiceVisualizer";

interface EmergencyDashboardProps {
  profile: Profile | null;
  contacts: EmergencyContact[];
  onTriggerSOS: (location: { lat: number; lon: number }) => void;
  onCancelSOS: () => void;
  onAnalyzeSymptoms: (text: string) => void;
  isSOSTriggered: boolean;
  sosLocation: { lat: number; lon: number } | null;
  setActiveTab: (tab: string) => void;
}

export default function EmergencyDashboard({
  profile,
  contacts,
  onTriggerSOS,
  onCancelSOS,
  onAnalyzeSymptoms,
  isSOSTriggered,
  sosLocation,
  setActiveTab
}: EmergencyDashboardProps) {
  const [sosState, setSosState] = useState<"idle" | "countdown" | "active">(
    isSOSTriggered ? "active" : "idle"
  );
  const [countdown, setCountdown] = useState(5);
  const [locationLoading, setLocationLoading] = useState(false);
  const [localLocation, setLocalLocation] = useState<{ lat: number; lon: number } | null>(sosLocation);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [symptomInput, setSymptomInput] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSOSTriggered) {
      setSosState("active");
    } else {
      setSosState("idle");
    }
  }, [isSOSTriggered]);

  const startSOSWorkflow = () => {
    setErrorMessage(null);
    setLocationLoading(true);

    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your device.");
      setLocationLoading(false);
      // Trigger SOS without location
      triggerSOSImmediate(999, 999);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        setLocalLocation(coords);
        setLocationLoading(false);
        // Start countdown
        setCountdown(5);
        setSosState("countdown");
        
        // Start 5 second timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              triggerSOSImmediate(coords.lat, coords.lon);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setLocationLoading(false);
        // Geolocation failed, but SOS must still go off
        setCountdown(5);
        setSosState("countdown");
        
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              triggerSOSImmediate(0, 0); // fallback coords
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const cancelSOS = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSosState("idle");
    onCancelSOS();
  };

  const triggerSOSImmediate = (lat: number, lon: number) => {
    setSosState("active");
    onTriggerSOS({ lat, lon });
    
    // Add to local/remote history database
    addHistoryEntry({
      type: "emergency_sos",
      description: "SOS Emergency Triggered",
      risk_level: "High",
      details: {
        latitude: lat,
        longitude: lon,
        notified_contacts_count: contacts.length,
        timestamp: new Date().toISOString()
      }
    });

    // Client-side simulation of SMS alert trigger
    if (contacts.length > 0) {
      contacts.forEach(contact => {
        const messageText = `EMERGENCY ALERT: ${profile?.name || "A user"} needs immediate medical help. Location: https://maps.google.com/?q=${lat},${lon}`;
        console.log(`[SIMULATION SMS] Sending alert to ${contact.name} (${contact.phone}): ${messageText}`);
      });
    }
  };

  const handleSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symptomInput.trim()) {
      onAnalyzeSymptoms(symptomInput);
      setSymptomInput("");
      setActiveTab("assistant");
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setIsVoiceActive(false);
    onAnalyzeSymptoms(text);
    setActiveTab("assistant");
  };

  const QUICK_SYMPTOMS = [
    { label: "Severe Chest Pain", text: "I have severe chest pain and pressure." },
    { label: "Sudden Dizziness", text: "I am feeling extremely dizzy and sweating." },
    { label: "Breathing Difficulty", text: "I am having trouble breathing." },
    { label: "Fell / Can't Stand", text: "I fell down and cannot stand up." },
    { label: "Heavy Bleeding", text: "I have heavy bleeding from an injury." }
  ];

  // Helper to open standard messaging client
  const triggerMobileSMS = () => {
    if (contacts.length === 0) return;
    const lat = localLocation?.lat || 0;
    const lon = localLocation?.lon || 0;
    const body = encodeURIComponent(
      `ALERT! This is ${profile?.name || "LifeGuard AI user"}. I have a medical emergency! My location is: https://maps.google.com/?q=${lat},${lon}`
    );
    const phones = contacts.map(c => c.phone).join(",");
    window.location.href = `sms:${phones}?body=${body}`;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 1. SOS BUTTON SECTION */}
      <section className="flex flex-col items-center justify-center py-6 text-center">
        {sosState === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              {/* Double pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-sos-pulse" />
              <button
                onClick={startSOSWorkflow}
                disabled={locationLoading}
                className="relative h-48 w-48 rounded-full bg-linear-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-2xl flex flex-col items-center justify-center gap-2 border-8 border-red-100 dark:border-red-950 focus:outline-none focus:ring-8 focus:ring-red-400/50 transition-all duration-300 transform active:scale-95 cursor-pointer z-10"
                aria-label="Tap to trigger SOS"
              >
                {locationLoading ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : (
                  <ShieldAlert className="h-14 w-14" />
                )}
                <span className="text-xl font-extrabold tracking-wide">
                  {locationLoading ? "LOCATING..." : "TAP FOR SOS"}
                </span>
              </button>
            </div>
            
            <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 max-w-sm">
              Pressing this alerts your registered emergency contacts with your live location.
            </p>
          </div>
        )}

        {sosState === "countdown" && (
          <div className="flex flex-col items-center gap-6 p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl max-w-md w-full shadow-lg">
            <div className="h-28 w-28 rounded-full bg-red-600 text-white flex items-center justify-center text-5xl font-black animate-ping">
              {countdown}
            </div>
            
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Triggering Emergency SOS
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Notifying contacts in {countdown} seconds...
              </p>
            </div>

            <Button
              onClick={cancelSOS}
              variant="outline"
              size="lg"
              className="w-full text-lg border-2 border-zinc-400 hover:bg-zinc-100 text-zinc-800 dark:text-white dark:hover:bg-zinc-800 h-14"
            >
              Cancel SOS Alert
            </Button>
          </div>
        )}

        {sosState === "active" && (
          <div className="flex flex-col items-center gap-6 p-8 bg-red-100 dark:bg-red-950 border-2 border-red-500 rounded-3xl max-w-md w-full shadow-2xl animate-sos-pulse-slow">
            <div className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center animate-bounce">
              <PhoneCall className="h-8 w-8" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black text-red-700 dark:text-red-400">
                SOS ALERT ACTIVE
              </h2>
              <p className="text-base text-red-600 dark:text-red-300 font-semibold">
                Emergency contacts have been notified.
              </p>
            </div>

            {localLocation && (
              <div className="w-full p-3 bg-white/80 dark:bg-zinc-900/80 rounded-xl text-xs space-y-1 text-left border border-red-200/50">
                <p className="font-bold flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  Your Current Coordinates:
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 font-mono pl-4">
                  Lat: {localLocation.lat.toFixed(6)}, Lon: {localLocation.lon.toFixed(6)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              {contacts.length > 0 && (
                <Button
                  onClick={triggerMobileSMS}
                  size="lg"
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold h-12 flex items-center justify-center gap-2"
                >
                  <Navigation className="h-4 w-4" /> Send Direct SMS Alert
                </Button>
              )}

              <Button
                onClick={() => setActiveTab("hospitals")}
                size="lg"
                variant="outline"
                className="w-full border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 bg-white/50 hover:bg-red-50 dark:bg-transparent dark:hover:bg-red-950/30 h-12"
              >
                Find Nearest Hospitals
              </Button>

              <Button
                onClick={cancelSOS}
                size="lg"
                className="w-full bg-red-600 text-white hover:bg-red-700 font-bold h-12"
              >
                Deactivate SOS
              </Button>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <p className="mt-4 text-sm font-bold text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
      </section>

      {/* 2. PROFILE & CONTACTS SUMMARY */}
      {sosState !== "active" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Health Profile Widget */}
          <Card className="shadow-md border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                Medical Health Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <p>Name: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile.name}</span></p>
                    <p>Age: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile.age || "N/A"}</span></p>
                    <p>Blood Group: <span className="font-semibold text-red-500 font-semibold">{profile.blood_group || "N/A"}</span></p>
                    <p>Gender: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile.gender || "N/A"}</span></p>
                  </div>
                  {profile.medical_conditions && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                      <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wide">Conditions:</p>
                      <p className="text-xs text-yellow-900 dark:text-yellow-300 mt-0.5">{profile.medical_conditions}</p>
                    </div>
                  )}
                  <Button
                    onClick={() => setActiveTab("profile")}
                    variant="link"
                    className="p-0 h-auto text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 underline"
                  >
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Your health profile is empty. Adding basic details helps AI personalize emergency analysis.
                  </p>
                  <Button
                    onClick={() => setActiveTab("profile")}
                    size="sm"
                    className="bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black text-white text-xs h-9"
                  >
                    Set Up Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contacts Widget */}
          <Card className="shadow-md border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                <Activity className="h-5 w-5 text-blue-500" />
                Trusted Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
                    {contacts.map((contact) => (
                      <div 
                        key={contact.id} 
                        className="flex justify-between items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-xs border border-zinc-100 dark:border-zinc-800/60"
                      >
                        <div>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200">{contact.name}</p>
                          <p className="text-zinc-500 text-[10px]">{contact.relationship || "Contact"}</p>
                        </div>
                        <a 
                          href={`tel:${contact.phone}`} 
                          className="flex items-center gap-1 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-full font-bold hover:bg-green-100"
                        >
                          <PhoneCall className="h-3 w-3" /> {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => setActiveTab("profile")}
                    variant="link"
                    className="p-0 h-auto text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 underline"
                  >
                    Manage Contacts
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No emergency contacts added yet. Please register contacts who should be alerted.
                  </p>
                  <Button
                    onClick={() => setActiveTab("profile")}
                    size="sm"
                    className="bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black text-white text-xs h-9 flex items-center gap-1"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add Contacts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. SYMPTOM INPUT AND QUICK ACTIONS */}
      {sosState !== "active" && (
        <Card className="shadow-md border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
              AI Symptom Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Text Form */}
              <form onSubmit={handleSymptomSubmit} className="flex flex-col gap-3 justify-between">
                <div className="space-y-1">
                  <label htmlFor="symptoms-search" className="text-xs font-bold uppercase text-zinc-500 tracking-wide">
                    Describe how you feel
                  </label>
                  <textarea
                    id="symptoms-search"
                    rows={3}
                    placeholder="Example: I'm feeling dizzy, nauseous, and my head hurts since this morning..."
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!symptomInput.trim()}
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm"
                >
                  Analyze Symptoms
                </Button>
              </form>

              {/* Voice Input */}
              <div className="flex flex-col justify-center">
                {isVoiceActive ? (
                  <div className="relative">
                    <button 
                      onClick={() => setIsVoiceActive(false)}
                      className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 z-10"
                      aria-label="Close voice assistant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <VoiceVisualizer onTranscriptReady={handleVoiceTranscript} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-900/20 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl h-44.5 text-center">
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
                      Prefer speaking? Click below to voice record
                    </p>
                    <Button
                      onClick={() => setIsVoiceActive(true)}
                      variant="outline"
                      className="border-zinc-300 hover:bg-zinc-100 text-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-800 font-semibold h-11 rounded-lg px-4 flex items-center gap-2"
                    >
                      <ShieldAlert className="h-4 w-4 text-red-500" /> Open Voice Assistant
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Chips */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase text-zinc-500 tracking-wide">
                Quick Symptom Reports (Single-Tap Triage)
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SYMPTOMS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAnalyzeSymptoms(chip.text);
                      setActiveTab("assistant");
                    }}
                    className="text-xs font-bold px-3.5 py-2.5 rounded-xl border border-zinc-200 hover:border-red-400/50 hover:bg-red-50/50 dark:border-zinc-800/80 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
