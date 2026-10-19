# Speakingym Free beta: conversion analytics preparation (2026-10-19)

## Default-off GA4 loader — 2026-10-19 follow-up
- New `analytics-config.js` is `window.SPEAKINGYM_GA4_ID = ""` (**OFF**).
- New `analytics-loader.js` is included on 12 user-facing pages and loads GA4 only if a valid, explicitly set Speakingym-specific `G-...` measurement ID exists. No third-party analytics SDK/cookie/network request occurs with the empty default value.
- `analytics-events.js` now requires `SPEAKINGYM_GA4_READY === true` in addition to `gtag`; an unrelated pre-existing tag is insufficient. Only the fixed five event names and enum parameters are allowed.
- Valid IDs will load Google Analytics and send **page view data** in addition to the allowlisted event milestones. Google Analytics may process device/browser data and set cookies, so update `privacy.html`, verify the legal basis and regional consent requirements, and obtain owner confirmation **before** filling the ID.
- Google signals and ad personalization are explicitly disabled in the app's GA4 configuration; this does **not** make GA4 cookieless.
- No repository contents, connected Gmail search, or connector discovery yielded an existing Speakingym GA4 measurement ID. **Do not reuse** an ID for another website. Ownership of Cloudflare dashboard-managed Web Analytics also remains unverified.
- Setup after owner provides a proper Speakingym stream ID: update privacy disclosure, set `analytics-config.js`, review changes/tests, merge, confirm production realtime visitors and individual event counts. A stream ID is public configuration, **not an API secret**.
- Deployment of the blank disabled configuration is **not active analytics** and must not be described as measuring conversions.

## What is actually implemented
- `analytics-events.js` defines an **allowlist-only** adapter for five anonymous conversion milestones.
- The adapter does **not** itself install Google Analytics, load third-party SDKs, send network requests, set cookies, store data or collect learner text. The separate default-off GA4 loader only becomes active if a valid measurement ID is intentionally set.
- It only calls `window.gtag('event', name, safeEnums)` when the site-specific GA4 loader explicitly reports ready. With the current blank config it silently does nothing.
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
3. GA4 loader is already included on user-facing pages but disabled by an empty ID. After owner approval and privacy review, set the Speakingym measurement ID in `analytics-config.js` and verify Realtime/DebugView page views and only the five intended custom events.
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
