# GCC USA Cleanup Report

## Summary

The GCC app now keeps the active route surface focused on:

- `/` redirecting to `/ambient-listening`
- `/ambient-listening` rendering `src/components/GCCAmbientDashboard.tsx`
- `/session` rendering the GCC session UI

The "Start new Session" button and the "Starting a new session?" callout now route directly to `/session`.

## Dependency Checks Performed

- Ran `git status` before cleanup.
- Searched `src` for route references to `/billing-intelligence`, `/claim-document`, `/patient-summary`, `/soap-notes`, `/start-session`, `/ambient-listening/session`, and `/ambient-listening/start-session`.
- Searched GCC routes/components for imports from `context`, `hooks`, `providers`, and `lib`.
- Confirmed `/ambient-listening/page.tsx` no longer imports the USA Ambient Listening page code.
- Confirmed GCC session imports only `components/gcc/*` and `lib/mock/gcc-session`.

## GCC Required

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/ambient-listening/page.tsx`
- `src/app/session/page.tsx`
- `src/components/GCCAmbientDashboard.tsx`
- `src/components/MedexaHeader.tsx`
- `src/components/DoctorContext.tsx`
- `src/components/gcc/*`
- `src/lib/mock/gcc-session.ts`

## Shared And Still Required

- `src/context/LanguageContext.tsx`
- `src/lib/translations.ts`
- `src/i18n/index.ts`
- `src/i18n/en.json`
- `src/i18n/ar.json`
- `src/i18n/he.json`
- `src/app/favicon.ico`

These files remain because the Medexa header and language selector depend on them.

## USA-Only And Safe To Remove

The following routes and helpers were classified as USA-only because they were referenced only by the removed USA workflows and not by GCC Ambient Listening or `/session`:

- `src/app/ambient-listening/session`
- `src/app/ambient-listening/start-session`
- `src/app/billing-intelligence`
- `src/app/claim-document`
- `src/app/patient-summary`
- `src/app/soap-notes`
- `src/app/start-session`
- `src/context/SessionDocumentationContext.tsx`
- `src/hooks/useWebSpeechSession.ts`
- `src/providers/MedexaLiveSessionProvider.tsx`
- `src/types/speech-recognition.d.ts`
- `src/lib/activeSession.ts`
- `src/lib/api.ts`
- `src/lib/clinicalAnalyzer.ts`
- `src/lib/cptDetector.ts`
- `src/lib/sessions.ts`
- `src/lib/voiceCommands.ts`

## Uncertain - Do Not Remove

- `src/i18n/*`: contains broader labels than the GCC dashboard currently needs, but it is still used by `LanguageContext` and `MedexaHeader`.
- `src/lib/translations.ts`: provides translation helpers/types used by `MedexaHeader`.
- `src/components/MedexaHeader.tsx`: visually shared by GCC pages and explicitly preserved.

## Navigation Cleanup

Removed obsolete header navigation entries to:

- `/billing-intelligence`
- `/claim-document`
- `/patient-summary`
- `/soap-notes`
- `/ambient-listening/session`

The header now links GCC Ambient Listing to `/ambient-listening` and Live Session to `/session`.
