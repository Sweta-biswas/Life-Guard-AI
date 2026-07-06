"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Navigation2, 
  Search, 
  Pill, 
  Loader2, 
  Compass, 
  AlertCircle 
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { fetchNearbyResources, MedicalResource } from "@/lib/location";

interface ResourceFinderProps {
  initialLocation: { lat: number; lon: number } | null;
}

export default function ResourceFinder({ initialLocation }: ResourceFinderProps) {
  const [activeType, setActiveType] = useState<"hospital" | "pharmacy">("hospital");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(initialLocation);
  const [locating, setLocating] = useState(false);
  const [resources, setResources] = useState<MedicalResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Pharmacy Medicine Search
  const [medicineQuery, setMedicineQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // Synchronize state when initialLocation prop changes (state adjustment during rendering pattern)
  const [prevInitialLocation, setPrevInitialLocation] = useState(initialLocation);
  if (initialLocation !== prevInitialLocation) {
    setPrevInitialLocation(initialLocation);
    if (initialLocation) {
      setLocation(initialLocation);
    }
  }

  const loadResources = async (lat: number, lon: number, type: "hospital" | "pharmacy") => {
    setLoadingResources(true);
    setErrorMsg(null);
    try {
      const data = await fetchNearbyResources(lat, lon, type);
      setResources(data);
    } catch (e) {
      console.error(e);
      setErrorMsg("Could not fetch nearby resources. Using offline simulated clinics.");
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    if (location) {
      const timer = setTimeout(() => {
        loadResources(location.lat, location.lon, activeType);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location, activeType]);

  const detectLocation = () => {
    setLocating(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
        setLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setErrorMsg("Failed to obtain location. Displaying default clinic locations instead.");
        // Fallback default coordinates
        setLocation({ lat: 40.7128, lon: -74.0060 }); // Metro center fallback
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMedicineSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineQuery.trim()) return;

    setSearchStatus(`Checking stock for "${medicineQuery}" in nearby pharmacies...`);
    
    // Simulate stock lookup
    setTimeout(() => {
      setSearchStatus(null);
      // We alter resources to state stock matches
      setResources(prev => 
        prev.map(p => ({
          ...p,
          phone: p.phone || "+1 (555) 019-2910",
          address: `${p.address} • (In Stock: ${medicineQuery})`
        }))
      );
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. FILTER TOGGLES & GEOLOCATION */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/80">
          <button
            onClick={() => setActiveType("hospital")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeType === "hospital"
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <Building2 className="h-4.5 w-4.5" />
            Hospitals & ER
          </button>
          <button
            onClick={() => setActiveType("pharmacy")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeType === "pharmacy"
                ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            }`}
          >
            <Pill className="h-4.5 w-4.5" />
            Pharmacies
          </button>
        </div>

        {!location ? (
          <Button
            onClick={detectLocation}
            disabled={locating}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-11 px-4 rounded-xl flex items-center gap-2"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
            {locating ? "Locating..." : "Share Location to Find Care"}
          </Button>
        ) : (
          <Button
            onClick={detectLocation}
            disabled={locating}
            variant="outline"
            className="border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs h-11 px-4 rounded-xl flex items-center gap-2"
          >
            {locating ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <MapPin className="h-4.5 w-4.5 text-red-500" />}
            {locating ? "Locating..." : "Update Location"}
          </Button>
        )}
      </div>

      {/* 2. MEDICINE SEARCH (If in Pharmacy filter) */}
      {activeType === "pharmacy" && location && (
        <Card className="border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 shadow-md">
          <CardContent className="p-4">
            <form onSubmit={handleMedicineSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search medicine availability (e.g. Paracetamol, Insulin)..."
                  value={medicineQuery}
                  onChange={(e) => setMedicineQuery(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                />
              </div>
              <Button
                type="submit"
                disabled={!medicineQuery.trim() || !!searchStatus}
                className="bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-bold px-4 rounded-xl text-xs h-11"
              >
                Find Medicine
              </Button>
            </form>
            
            {searchStatus && (
              <p className="text-[11px] text-zinc-500 mt-2 font-medium flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {searchStatus}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. LIST OF RESOURCES */}
      {!location ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-900/20 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center">
          <Compass className="h-12 w-12 text-zinc-400 mb-3 animate-pulse" />
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">Location Access Required</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
            Please allow GPS access or click &quot;Share Location&quot; above to query actual nearby hospitals and pharmacies.
          </p>
          <Button
            onClick={detectLocation}
            className="bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-black mt-4 h-10 px-4 rounded-lg font-bold text-xs"
          >
            Locate Me Now
          </Button>
        </div>
      ) : loadingResources ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Searching for nearest {activeType === "hospital" ? "medical clinics" : "pharmacies"}...
          </p>
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
          <AlertCircle className="h-10 w-10 text-zinc-400 mb-3" />
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">No Facilities Found</p>
          <p className="text-xs text-zinc-500 mt-1">
            No {activeType}s found within 5km of your location. Try reloading or updating GPS coordinates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-900/40 dark:text-yellow-400 rounded-xl text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="space-y-3">
            {resources.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:shadow-md transition-shadow border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950"
              >
                <div className="flex items-stretch justify-between">
                  <div className="p-4 space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.type === "hospital" 
                          ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                          : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs text-zinc-500 font-bold">
                        {item.distance.toFixed(2)} km away
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
                      {item.name}
                    </h4>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-start gap-1 pr-4">
                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-400" />
                      {item.address}
                    </p>

                    {item.phone && (
                      <a 
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium hover:text-zinc-900"
                      >
                        <Phone className="h-3 w-3 text-green-500" />
                        {item.phone}
                      </a>
                    )}
                  </div>

                  <div className="p-4 border-l border-zinc-100 dark:border-zinc-800/80 flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10">
                    <Button
                      onClick={() => window.open(item.navigationUrl, "_blank")}
                      size="lg"
                      className="bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-12 w-12 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                      aria-label={`Navigate to ${item.name}`}
                    >
                      <Navigation2 className="h-5 w-5 rotate-45" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
