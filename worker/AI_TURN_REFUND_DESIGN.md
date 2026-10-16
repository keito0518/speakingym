# AI conversation quota refund: implementation specification

## Problem
`consumeSessionTurn()` increments `ai_sessions.turns` before the Gemini request. Upstream 429, 5xx, invalid JSON, invalid AI payload and timeouts still consume a turn. Teacher calls already use individual `teacher_uses.id` reservations and can be refunded safely.

## Important: do NOT ship `UPDATE ai_sessions SET turns = turns - 1` on error
That operation is not linked to a specific AI request. Parallel requests can succeed/fail out of order, and an unconditional decrement can refund a successful turn or create quota bypasses. Checking only `turns === reservedTurn` is also not a reliable solution.

## Safe implementation plan
1. Add a D1 migration for an immutable per-request ledger, e.g. `ai_turn_reservations(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, uid TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('reserved','completed','refunded')), created_at INTEGER NOT NULL)`. Add indexes on session_id and uid.
2. Reserve each turn atomically against both the per-session cap and the Pro monthly limit. The reservation ID must be unique per request and created server-side. Do not change the Free 5 sessions/day, 3 teacher/day or Pro 600 turns/20 teacher/month limits.
3. On a successful, validated Gemini response, mark the specific reservation `completed`. On a failed Gemini response, atomically mark that specific reservation `refunded` exactly once and adjust the authoritative quota. The ledger state transition and counter adjustment must occur in one D1 transaction/statement or an equivalent invariant-preserving design.
4. Ensure monthly counting and the per-session 20-turn cap use **non-refunded** turns, including under concurrency; old rows without ledger entries must remain accounted for after migration. Avoid using only `SUM(ai_sessions.turns)` if it includes refunded turns.
5. Prevent replay / double refund. A retry is a new AI request with a new reservation, unless idempotency keys are deliberately supported and tested.
6. Add tests for success, 429, 500, timeout, malformed JSON, invalid AI payload, parallel success+failure in both completion orders, simultaneous limit-edge requests, repeated refund, cross-user reservation ID, month rollover and legacy sessions.
7. Only deploy after the migration has run in production and Worker CI passes. Verify actual Cloudflare Worker deployment separately from GitHub Pages deployment.

## Current status
**Design documented; code and production database have NOT been changed.** This is intentional: shipping a naive refund risks allowing quota bypass or incorrect charging.
