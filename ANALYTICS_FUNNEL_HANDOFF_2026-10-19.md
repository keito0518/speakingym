# Speakingym Free beta: conversion analytics preparation (2026-10-19)

## What is actually implemented
- `analytics-events.js` defines an **allowlist-only** adapter for five anonymous conversion milestones.
- It does **not** install Google Analytics, load third-party SDKs, send network requests, set cookies, store data or collect learner text.
- It only calls `window.gtag('event', name, safeEnums)` if an owner-approved analytics integration already exists on that page. If not configured, it silently does nothing.
- Events do not contain Google UID, session ID, auth tokens, prompts, transcripts, answers, URLs, search parameters, IPs or free text.

| Event | When | Safe enum |
|---|---|---|
| `sg_home_cta` | User clicks one of two home hero practice links | `destination=sprint\|ai` |
| `sg_sprint_start` | 60-second sprint actually starts | `mode=standard\|weak_review` |
| `sg_sprint_complete` | Sprint reaches the finish function | `result=timer\|early` |
| `sg_ai_scene_start` | User is authenticated and AI scene UI actually starts | none |
| `sg_ai_first_reply` | First successful, valid AI response in the active scene | none |

## Before claiming conversion measurement works
1. Verify whether Cloudflare has any dashboard-injected analytics script. The absence of a repository tag is not proof there is no dashboard analytics.
2. Owner should approve a specific GA4 measurement property (format `G-...`) and privacy policy disclosure. Do not guess an ID, turn on cookies, or add Google scripts without approval.
3. If approved, install GA4 across all three instrumented pages **before** `analytics-events.js` (using the official documented installation) and verify in DebugView/Realtime that only the above events and enum values arrive.
4. Document privacy details and retention/consent choices in `privacy.html` before actual transmission, based on the selected analytics vendor and region.
5. Distinguish click/start/success: a page view is not a practice start; a scene UI start is not a billable AI session; the first successful AI reply is not proof of learning outcomes.

## Future conversion rates
- `sg_home_cta` -> `sg_sprint_start`: approximate home-to-start funnel, **not** exact user-level conversion until analytics configuration/identity rules are validated.
- `sg_sprint_start` -> `sg_sprint_complete`: sprint completion count ratio.
- `sg_ai_scene_start` -> `sg_ai_first_reply`: approximate successful first reply count ratio.

## Production safety
- No changes to Cloudflare Workers, D1, Stripe, Firebase, Gemini configuration or Free/Pro quotas.
- Adapter errors never interrupt practice.
- `tests/analytics-events.test.mjs` rejects unknown event names and strips unexpected fields including user email and speech content.
