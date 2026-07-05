import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Initialize Supabase only if environment variables are provided
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to get or create a persistent local user/device ID
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("lifeguard_user_id");
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "usr_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("lifeguard_user_id", id);
  }
  return id;
}

export interface Profile {
  id?: string;
  name: string;
  age?: number;
  gender?: string;
  blood_group?: string;
  medical_conditions?: string;
  phone?: string;
  address?: string;
  updated_at?: string;
}

export interface EmergencyContact {
  id?: string;
  profile_id?: string;
  name: string;
  relationship?: string;
  phone: string;
  telegram_chat_id?: string;
  created_at?: string;
}

export interface HistoryEntry {
  id?: string;
  profile_id?: string;
  type: "symptom_analysis" | "emergency_sos";
  description: string;
  risk_level: "Low" | "Medium" | "High";
  details: any;
  created_at?: string;
}

// PROFILE HELPERS
export async function getProfile(): Promise<Profile | null> {
  const userId = getOrCreateUserId();
  if (!userId) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (data && !error) {
        localStorage.setItem("lifeguard_profile", JSON.stringify(data));
        return data;
      }
      console.warn("Supabase profile fetch failed, falling back to local storage:", error?.message);
    } catch (e) {
      console.error("Supabase profile fetch exception:", e);
    }
  }

  // Fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("lifeguard_profile");
    return local ? JSON.parse(local) : null;
  }
  return null;
}

export async function saveProfile(profile: Omit<Profile, "id">): Promise<Profile> {
  const userId = getOrCreateUserId();
  const updatedProfile = {
    ...profile,
    id: userId,
    updated_at: new Date().toISOString()
  };

  // Save to local storage first
  if (typeof window !== "undefined") {
    localStorage.setItem("lifeguard_profile", JSON.stringify(updatedProfile));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(updatedProfile)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
      console.warn("Supabase profile upsert failed, used local storage:", error?.message);
    } catch (e) {
      console.error("Supabase profile upsert exception:", e);
    }
  }

  return updatedProfile;
}

// EMERGENCY CONTACTS HELPERS
export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const userId = getOrCreateUserId();
  if (!userId) return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: true });

      if (data && !error) {
        localStorage.setItem("lifeguard_contacts", JSON.stringify(data));
        return data;
      }
      console.warn("Supabase contacts fetch failed, falling back to local storage:", error?.message);
    } catch (e) {
      console.error("Supabase contacts fetch exception:", e);
    }
  }

  // Fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("lifeguard_contacts");
    return local ? JSON.parse(local) : [];
  }
  return [];
}

export async function addEmergencyContact(contact: Omit<EmergencyContact, "id" | "profile_id">): Promise<EmergencyContact> {
  const userId = getOrCreateUserId();
  const newContact: EmergencyContact = {
    ...contact,
    id: "cnt_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    profile_id: userId,
    created_at: new Date().toISOString()
  };

  // Get current list and append
  let currentContacts = await getEmergencyContacts();
  currentContacts.push(newContact);
  if (typeof window !== "undefined") {
    localStorage.setItem("lifeguard_contacts", JSON.stringify(currentContacts));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .insert({
          profile_id: userId,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          telegram_chat_id: contact.telegram_chat_id
        })
        .select()
        .single();

      if (!error && data) {
        // Replace temporary local ID with database ID
        currentContacts = currentContacts.map(c => c.id === newContact.id ? data : c);
        if (typeof window !== "undefined") {
          localStorage.setItem("lifeguard_contacts", JSON.stringify(currentContacts));
        }
        return data;
      }
      console.warn("Supabase contact insert failed, used local storage:", error?.message);
    } catch (e) {
      console.error("Supabase contact insert exception:", e);
    }
  }

  return newContact;
}

export async function deleteEmergencyContact(id: string): Promise<boolean> {
  let currentContacts = await getEmergencyContacts();
  currentContacts = currentContacts.filter(c => c.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem("lifeguard_contacts", JSON.stringify(currentContacts));
  }

  if (supabase && !id.startsWith("cnt_")) {
    try {
      const { error } = await supabase
        .from("emergency_contacts")
        .delete()
        .eq("id", id);
      
      if (!error) return true;
      console.warn("Supabase contact delete failed, updated local storage only:", error.message);
    } catch (e) {
      console.error("Supabase contact delete exception:", e);
    }
  }

  return true;
}

// HISTORY HELPERS
export async function getEmergencyHistory(): Promise<HistoryEntry[]> {
  const userId = getOrCreateUserId();
  if (!userId) return [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("emergency_history")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });

      if (data && !error) {
        localStorage.setItem("lifeguard_history", JSON.stringify(data));
        return data;
      }
      console.warn("Supabase history fetch failed, falling back to local storage:", error?.message);
    } catch (e) {
      console.error("Supabase history fetch exception:", e);
    }
  }

  // Fallback
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("lifeguard_history");
    return local ? JSON.parse(local) : [];
  }
  return [];
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "profile_id" | "created_at">): Promise<HistoryEntry> {
  const userId = getOrCreateUserId();
  const newEntry: HistoryEntry = {
    ...entry,
    id: "his_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    profile_id: userId,
    created_at: new Date().toISOString()
  };

  let currentHistory = await getEmergencyHistory();
  currentHistory.unshift(newEntry);
  if (typeof window !== "undefined") {
    localStorage.setItem("lifeguard_history", JSON.stringify(currentHistory));
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("emergency_history")
        .insert({
          profile_id: userId,
          type: entry.type,
          description: entry.description,
          risk_level: entry.risk_level,
          details: entry.details
        })
        .select()
        .single();

      if (!error && data) {
        currentHistory = currentHistory.map(h => h.id === newEntry.id ? data : h);
        if (typeof window !== "undefined") {
          localStorage.setItem("lifeguard_history", JSON.stringify(currentHistory));
        }
        return data;
      }
      console.warn("Supabase history insert failed, used local storage:", error?.message);
    } catch (e) {
      console.error("Supabase history insert exception:", e);
    }
  }

  return newEntry;
}