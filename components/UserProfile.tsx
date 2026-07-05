"use client";

import React, { useState, useEffect } from "react";
import { 
  User, 
  Heart, 
  Phone, 
  Plus, 
  Trash2, 
  Loader2, 
  Save, 
  Users, 
  Activity, 
  AlertCircle, 
  Check 
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { 
  Profile, 
  EmergencyContact, 
  saveProfile, 
  addEmergencyContact, 
  deleteEmergencyContact 
} from "@/lib/supabase";

interface UserProfileProps {
  initialProfile: Profile | null;
  initialContacts: EmergencyContact[];
  onProfileUpdated: (profile: Profile) => void;
  onContactsUpdated: (contacts: EmergencyContact[]) => void;
}

export default function UserProfile({
  initialProfile,
  initialContacts,
  onProfileUpdated,
  onContactsUpdated
}: UserProfileProps) {
  // Profile Form States
  const [name, setName] = useState(initialProfile?.name || "");
  const [age, setAge] = useState<number | "">(initialProfile?.age || "");
  const [gender, setGender] = useState(initialProfile?.gender || "");
  const [bloodGroup, setBloodGroup] = useState(initialProfile?.blood_group || "");
  const [conditions, setConditions] = useState(initialProfile?.medical_conditions || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [address, setAddress] = useState(initialProfile?.address || "");

  // Contact Form States
  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  // UI States
  const [isEditing, setIsEditing] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [contactAdding, setContactAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (initialProfile && initialProfile.name) {
      setName(initialProfile.name || "");
      setAge(initialProfile.age || "");
      setGender(initialProfile.gender || "");
      setBloodGroup(initialProfile.blood_group || "");
      setConditions(initialProfile.medical_conditions || "");
      setPhone(initialProfile.phone || "");
      setAddress(initialProfile.address || "");
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [initialProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ type: "error", text: "Name is required." });
      return;
    }

    setProfileSaving(true);
    setMessage(null);
    try {
      const data = await saveProfile({
        name,
        age: age === "" ? undefined : Number(age),
        gender,
        blood_group: bloodGroup,
        medical_conditions: conditions,
        phone,
        address
      });
      onProfileUpdated(data);
      setMessage({ type: "success", text: "Health Profile saved successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to save profile. Saving offline locally." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) {
      setMessage({ type: "error", text: "Contact Name and Phone Number are required." });
      return;
    }

    setContactAdding(true);
    setMessage(null);
    try {
      const newContact = await addEmergencyContact({
        name: contactName,
        relationship: relationship || "Family/Friend",
        phone: contactPhone,
        telegram_chat_id: telegramChatId || undefined
      });
      
      onContactsUpdated([...initialContacts, newContact]);
      setContactName("");
      setRelationship("");
      setContactPhone("");
      setTelegramChatId("");
      setMessage({ type: "success", text: "Emergency Contact added successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to add contact." });
    } finally {
      setContactAdding(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setDeletingId(id);
    try {
      const success = await deleteEmergencyContact(id);
      if (success) {
        onContactsUpdated(initialContacts.filter(c => c.id !== id));
        setMessage({ type: "success", text: "Contact removed successfully." });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to delete contact." });
    } finally {
      setDeletingId(null);
    }
  };

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const RELATIONSHIPS = ["Child", "Spouse", "Caregiver", "Parent", "Sibling", "Friend", "Doctor", "Other"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
      {/* 1. NOTIFICATIONS */}
      {message && (
        <div className={`col-span-1 lg:col-span-3 p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          message.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400"
            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400"
        }`}>
          {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* 2. HEALTH PROFILE DETAILS OR FORM */}
      <Card className="lg:col-span-2 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
            <User className="h-5 w-5 text-zinc-900 dark:text-white" />
            Personal Health Profile
          </CardTitle>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-zinc-300 hover:bg-zinc-100 text-xs rounded-xl h-9"
            >
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {!isEditing && initialProfile ? (
            /* READ-ONLY MEDICAL CARD VIEW */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/60">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white">
                    {initialProfile.name}
                  </h3>
                  <p className="text-xs text-zinc-500 font-bold mt-0.5">
                    Registered Patient Health Profile
                  </p>
                </div>
                
                {initialProfile.blood_group && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
                    <span className="text-[10px] uppercase font-black tracking-wider text-red-500">Blood Type</span>
                    <span className="text-xl font-black text-red-600 dark:text-red-400">{initialProfile.blood_group}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Age</span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                    {initialProfile.age ? `${initialProfile.age} Years` : "N/A"}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Gender</span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                    {initialProfile.gender || "N/A"}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Phone</span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                    {initialProfile.phone || "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Pre-existing Conditions & Medications</span>
                {initialProfile.medical_conditions ? (
                  <div className="p-4 bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/20 text-yellow-900 dark:text-yellow-400 rounded-xl">
                    <p className="text-sm font-semibold leading-relaxed">
                      {initialProfile.medical_conditions}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs italic">
                    No pre-existing health conditions or regular medications registered.
                  </div>
                )}
              </div>

              {initialProfile.address && (
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Home Address</span>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-semibold">
                    {initialProfile.address}
                  </p>
                </div>
              )}

              <Button
                onClick={() => setIsEditing(true)}
                className="bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-white font-bold h-12 w-full rounded-xl flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                Edit Health Profile
              </Button>
            </div>
          ) : (
            /* EDIT FORM VIEW */
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Pre-existing Medical Conditions & Medications</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Hypertension, Diabetes Type 2. Taking Lisinopril 10mg daily. Allergic to Penicillin."
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none"
                />
                <p className="text-[10px] text-zinc-500 leading-normal">
                  This info remains private on your device/profile, but is appended to emergency SOS queries and AI triage analysis for safety.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Home Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 123 Maple Street, Apt 4B, Springfield"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {initialProfile?.name && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="border-zinc-300 hover:bg-zinc-100 font-bold h-12 flex-1 rounded-xl text-zinc-700 dark:text-white dark:border-zinc-800"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-white font-bold h-12 flex-1 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {profileSaving ? "Saving..." : "Save Details"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 3. EMERGENCY CONTACTS MANAGEMENT */}
      <div className="space-y-6">
        {/* Add Contact Card */}
        <Card className="border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
              <Plus className="h-5 w-5 text-green-500" />
              Add Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddContact} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mary Doe"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Relationship</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                >
                  <option value="">Select Relation</option>
                  {RELATIONSHIPS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 987-6543"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Telegram Chat ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                />
                <p className="text-[9px] text-zinc-500 leading-normal pl-1">
                  Relatives can message `@GetChatID_Bot` on Telegram to fetch their numeric Chat ID.
                </p>
              </div>

              <Button
                type="submit"
                disabled={contactAdding}
                className="bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-white font-bold h-11 w-full rounded-xl flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                {contactAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {contactAdding ? "Adding..." : "Add Contact"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contacts List Card */}
        <Card className="border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
              <Users className="h-5 w-5 text-blue-500" />
              Registered Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {initialContacts.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No emergency contacts registered yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {initialContacts.map((c) => (
                  <div 
                    key={c.id} 
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/60"
                  >
                    <div>
                      <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{c.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        {c.relationship} • <span className="font-mono">{c.phone}</span>
                        {c.telegram_chat_id && (
                          <span className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                            Telegram: {c.telegram_chat_id}
                          </span>
                        )}
                      </p>
                    </div>

                    <Button
                      onClick={() => c.id && handleDeleteContact(c.id)}
                      disabled={deletingId === c.id}
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950 dark:hover:bg-red-950/20 h-8 w-8 p-0 rounded-lg"
                      aria-label={`Remove contact ${c.name}`}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
