"use client";

import React, { useState } from "react";
import { 
  History, 
  ShieldAlert, 
  Activity, 
  Calendar, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { HistoryEntry } from "@/lib/supabase";

interface EmergencyHistoryProps {
  history: HistoryEntry[];
}

export default function EmergencyHistory({ history }: EmergencyHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id?: string) => {
    if (!id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Date unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRiskColor = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "High":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case "Low":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
    }
  };

  const getRiskIcon = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "High":
        return <AlertTriangle className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />;
      case "Medium":
        return <Info className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />;
      case "Low":
      default:
        return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <Card className="border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 shadow-md animate-fade-in-up">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
          <History className="h-5 w-5 text-zinc-900 dark:text-white" />
          Emergency & Symptom History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <History className="h-10 w-10 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">No History Available</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
              Your triage checks and SOS alerts will appear here. This enables you to share past records with your doctor.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {history.map((entry) => {
              const isExpanded = expandedId === entry.id;
              
              return (
                <div 
                  key={entry.id} 
                  className="rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden bg-white dark:bg-zinc-950/20"
                >
                  {/* Summary row */}
                  <div 
                    onClick={() => toggleExpand(entry.id)}
                    className="flex justify-between items-center p-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.type === "emergency_sos" ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" /> SOS Alert
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-black flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Symptom Check
                          </span>
                        )}

                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full flex items-center gap-1 ${getRiskColor(entry.risk_level)}`}>
                          {getRiskIcon(entry.risk_level)}
                          {entry.risk_level} Risk
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-1">
                        {entry.description}
                      </h4>

                      <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="text-zinc-400">
                      {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-100 dark:border-zinc-800/80 text-xs space-y-4">
                      {entry.type === "emergency_sos" ? (
                        /* SOS Details */
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Alert Details</p>
                            <p className="text-zinc-700 dark:text-zinc-300 font-semibold leading-relaxed">
                              Emergency SOS alert dispatched to registered contacts.
                            </p>
                          </div>

                          {entry.details?.latitude && (
                            <div className="p-2.5 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800/60 inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
                              <MapPin className="h-3.5 w-3.5 text-red-500" />
                              <span className="font-bold">Coordinates:</span>
                              <span className="font-mono">{entry.details.latitude.toFixed(6)}, {entry.details.longitude.toFixed(6)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Triage Details */
                        <div className="space-y-3.5">
                          {entry.details?.assessment && (
                            <div className="space-y-1">
                              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">AI Assessment Summary</p>
                              <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                                {entry.details.assessment}
                              </p>
                            </div>
                          )}

                          {entry.details?.recommendations && entry.details.recommendations.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">Recommendations Given</p>
                              <ul className="space-y-1.5">
                                {entry.details.recommendations.map((rec: string, i: number) => (
                                  <li key={i} className="text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5 font-medium">
                                    <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
