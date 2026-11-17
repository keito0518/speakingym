# Speakingym Monsters — dungeon game & feedback design (2026-10-26)

Status: **product design, NOT implemented dungeon levels**. Keep Draft PR #77 separate from previous RPG PR #76, production / paid billing unchanged.

## North star

The companion travels with the player, not just sits in a collection menu. A trip should mean a little exploration, an authentic English challenge, a visible result, and a new encounter. A short run (3–5 min) should feel complete on a phone. Avoid enormous maps, fake battles, repetitive multiple-choice or a player tapping "I was correct."

## Three genuinely different dungeon loops

| Dungeon | Player action | Gameplay beat | Evidence for language growth |
| --- | --- | --- | --- |
| **Speaking Forest / スピーキングの森** | Speak or type a response to a situation | Choose a route, cross three speaking gates, find an event behind one of the gates | Can communicate essential intent and respond without a hint, under a clock |
| **Listening Swamp / リスニングの沼** | Listen to short natural speech without written transcript by default | Fog shifts after each audio clue; interpret details and take the right branch, with repair via relistening | Understand a stated fact/intent, or act on multiple details, not merely hear a word |
| **Word Cave / 単語の洞窟** | Retrieve a word from meaning/context and USE it in a short expression | Light crystals by recalling words or collocations; spell combinations open a vault | Correct contextual meaning, collocation and retrieval after a delay, not tapping spelling-only matches |

Three unique content banks and grade rubrics are required. Do not show the same exercise type under three skins. Each mode can share save state, XP wallet, companion, encounter and review progress.

### One playable vertical slice first

Start with a **Speaking Forest** 3-gate route using current speaking prompts and objective checks. Each gate has (a) a different speaking situation, (b) correct/needs-more-content/technical-no-result, (c) encounter narration and a branch unlocked by completing the task. A low-risk route is available without microtransactions; missing a task retries without extra XP. Companion is visibly present on each scene. Reuse existing hint and speech recognition systems. Add meaningful animation only after the learning/test loop feels right.

Next build Listening Swamp with *actual audio-first* questions and unique comprehension rubrics, then Word Cave with recall and sentence-completion content. Listening must offer an accessibility transcript option; using it should influence exercise mastery/reward, not be silently treated as a clean unaided listen. Screen readers and keyboard input need first-class support.

## Companion powers should be EXPLORATION powers, not language-cheating powers

Powers unlock through normal XP-fed evolution and do not change automatic language grading or teach hidden answer content.

| Companion | Power | In-world impact | Balancing rule |
|---|---|---|---|
| **Yolkie** | **Double Yolk** | Once per run can reveal a fork with a second treasure room | Both paths remain reachable by players without Yolkie on separate runs |
| **Soxie** | **Lost & Found** | Reveals a missing-object trail leading to a secret creature encounter | Encounter adds collecting possibilities, not more raw XP |
| **Wobblin** | **Shape Shift** | Chooses between two route traits or unique evolution appearances | No automatic pass on challenges |
| **Toastrophe** | **Ember Trail** | Lights up hidden markings that point toward a rare cosmetic variation | Encounter chances capped; cosmetics, not pay-to-win |
| **Nibbunut** | **Tiny Passage** | Accesses an alternative little chamber in Word Cave | Alternative collectible only; does not disclose vocabulary answers |

Only equip one exploration ability per run initially. No permanent soft locks, paid-only language grades or characters whose abilities systematically multiply XP. The companions' unusual English names and root-word glossary remain in the collection, reinforcing vocabulary without adding trivia screens to each game.

## Free versus Pro feedback (proposed; not deployed)

The **correctness bar is identical for everyone**. A Free player must never receive a less truthful verdict to sell Pro.

- **Free**: explain communicative success or unverified required details, an example answer, and one brief suggested improvement. Use deterministic local checks on authored easy content where confidence is high; a limited server-side semantic check for ambiguous answers after safe staging validation, with clear daily caps and an offline fallback. When uncertain, mark *review*, never *wrong* based on missing exact words.
- **Pro (monthly plan; intended price decided elsewhere)**: same pass/fail standard, but add detailed feedback on communicated intent, omitted requirements, grammar/naturalness nuance, 2 tailored rewrites, and a focused repeat drill based on the error. Provide access to past feedback and trends. Avoid verbose AI paragraphs that slow 60-second play; detailed coaching appears **after** a run, not between gates.
- User sees what is Free vs Pro *before* using an AI request. No automatic double calls for a single utterance: grade and optionally coach in one strict JSON output, or batch a full 60-second run when safer and cheaper.
- Server checks the Firebase token and subscription entitlement; never trust a browser-supplied plan flag. Durable per-UID quotas, per-minute global limits, replay-safe submission IDs, token/output cap, cost telemetry and kill switch are mandatory before usage is enabled. Never borrow production Stripe Live, production D1, or old plan counters for an unreviewed game prototype.
- Speech recognition is a transcript, **not** pronunciation scoring. Provide errors/abstentions for unclear recognition, consent and privacy disclosures for any third-party processing and a typed fallback.
- Free/Pro limits and actual monthly infrastructure costs must be estimated from measured staging tokens and provider pricing before a promise about unlimited AI or launch. For the current prototype the semantic grader exists only as a DISABLED standalone staging scaffold.

## Suggested content model

`Dungeon`: id, name, icon, stageIds, specializedScoringMode, environmentArt.  
`Stage`: id, scene, task/audio/cue, requiredMeaning, hints, permitted answer alternatives, encounterSeed, reward table and review tag.  
`Run`: dungeonId, stageIndex, companionId, routeChoice, responses, verifiedOutcomes, rewardLedger, discoveredCosmetics.  
`MonsterPower`: companionId, unlockLevel, explorationEventType, usageLimit, parameters.

All playable XP is awarded server-authoritatively when paid online play launches, with idempotent submission and anti-farming controls. LocalStorage rewards in Draft PR #77 are prototype-only and are easy to manipulate; do not use them as proof of secure paid game economics.

## Milestones and checks

1. Restore real-time interim transcript on Safari/WebKit and Chromium while preserving "mic disappears after capture"; include mock interim→final, abort, permission-denied, navigation and retry tests. No production billing or AI changes.
2. Add a single **Speaking Forest** meaningful 3-gate playable slice and human-review ten attempts for fun/UX. Keep existing practice and 60s mode working.
3. Build distinct Listening Swamp and Word Cave task banks and shared dungeon progress state, then cosmetic exploration powers.
4. In a separate, explicitly provisioned staging Worker, validate semantic grading and feedback quality against a curated English paraphrase/incorrect-answer dataset. Compare false-positive/false-negative rates, latency and measured provider cost. Only then wire the UI, rate limits and Free/Pro entitlement.
5. Validate on real iPhone Safari and accessible text fallback; no merge to main until approved.

Do not build another shallow 7x7 RPG map before the individual dungeon loops are fun and genuinely different.
