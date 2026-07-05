-- LifeGuard AI Supabase Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
-- Stores user personal and medical health details.
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    age integer,
    gender text,
    blood_group text,
    medical_conditions text,
    phone text,
    address text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Create policy for public access (or authenticated users depending on auth setup)
-- For demonstration/easy setup, we allow all operations. In production, restrict by auth.uid().
create policy "Allow public read/write access to profiles" on public.profiles
    for all using (true) with check (true);


-- 2. EMERGENCY CONTACTS TABLE
-- Stores contacts to be alerted in case of emergency.
create table if not exists public.emergency_contacts (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade,
    name text not null,
    relationship text,
    phone text not null,
    telegram_chat_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Emergency Contacts
alter table public.emergency_contacts enable row level security;

-- Create policy for public access
create policy "Allow public read/write access to emergency_contacts" on public.emergency_contacts
    for all using (true) with check (true);


-- 3. EMERGENCY HISTORY TABLE
-- Tracks previous SOS alerts and symptom analyses.
create table if not exists public.emergency_history (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade,
    type text not null check (type in ('symptom_analysis', 'emergency_sos')),
    description text not null,
    risk_level text not null check (risk_level in ('Low', 'Medium', 'High')),
    details jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Emergency History
alter table public.emergency_history enable row level security;

-- Create policy for public access
create policy "Allow public read/write access to emergency_history" on public.emergency_history
    for all using (true) with check (true);
