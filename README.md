# LifeGuard AI

LifeGuard AI is a patient-focused emergency assistant built with Next.js and React. It provides an AI-powered symptom triage workflow, emergency SOS alerts, nearby care location search, and a health profile manager with history tracking.

## Key Features

- AI symptom triage with emergency risk scoring (`Low`, `Medium`, `High`)
- Voice feedback for elderly-friendly accessibility
- Emergency SOS workflow with location capture and contact alerting
- Telegram alert integration for registered emergency contacts
- Nearby hospitals and pharmacies finder using Overpass API + fallback locations
- User health profile management and emergency contact registry
- History log of symptom checks and SOS events
- Progressive Web App support with service worker registration
- Supabase-backed storage with local storage fallback when Supabase is unavailable

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Lucide icons
- Zod, React Hook Form
- OpenStreetMap Overpass API for location lookup

## Project Structure

- `app/` – Next.js app router pages and API routes
- `components/` – UI components for dashboard, chat, profile, history, and resource search
- `lib/` – client helpers, Supabase wrappers, and location utilities
- `public/` – static assets including `sw.js` service worker

## Configuration

LifeGuard AI supports optional service integrations through environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable persistent profile, contact, and history storage.
- `GEMINI_API_KEY` powers AI symptom triage through Google Gemini. If absent, the app falls back to a local rule-based triage analyzer.
- `TELEGRAM_BOT_TOKEN` enables Telegram alert dispatch for registered emergency contacts.

## Usage Overview

The app is designed to support emergency readiness and symptom triage:

- Store your health profile and emergency contacts.
- Use the AI assistant to describe symptoms and receive a risk assessment.
- Trigger an emergency SOS alert with location capture and contact notifications.
- Find nearby hospitals and pharmacies using location-aware search.
- Review past triage interactions and SOS events through the history log.

## Notes and Behavior

- Symptom analytics are handled by `app/api/analyze-symptoms/route.ts`.
- Telegram alerts are sent by `app/api/send-telegram-alert/route.ts`.
- Location lookup uses `lib/location.ts` and gracefully falls back to simulated resources when real API lookup is unavailable.
- Supabase helpers live in `lib/supabase.ts` and support offline caching via `localStorage`.

## Contributing

Contributions are welcome. Open an issue or submit a pull request with bug fixes, improvements, or feature enhancements.

---

Built for rapid emergency response prototyping with accessible AI triage and alerting.
## Notes and Behavior

- Symptom analytics are handled by `app/api/analyze-symptoms/route.ts`.
- Telegram alerts are sent by `app/api/send-telegram-alert/route.ts`.
- Location lookup uses `lib/location.ts` and gracefully falls back to simulated resources when real API lookup is unavailable.
- Supabase helpers live in `lib/supabase.ts` and support offline caching via `localStorage`.

## Contributing

Contributions are welcome. Open an issue or submit a pull request with bug fixes, improvements, or feature enhancements.

---

Built for rapid emergency response prototyping with accessible AI triage and alerting.