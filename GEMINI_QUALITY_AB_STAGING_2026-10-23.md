# Gemini 3.5 vs Gemini 3.1 — safe A/B quality validation (Draft only)

**Status 2026-10-23:** Test *harness and rubric exist*. No real Gemini 3.1
provider responses, actual token costs or human quality approval exist yet.

## Why

A cheaper model is only worth trying if it handles English-learning roleplay
and useful individualized Japanese coaching at least as well. Compare on the
**same** anonymized examples, identical system instructions and equivalent
generationConfig. Never claim a natural conversation simply because a pattern
checker found a keyword.

## Source code

- `scripts/gemini-quality-benchmark.mjs` exports 18 intentionally generic,
  anonymized roleplay/teacher cases (easy/standard/challenge).
- A deterministic rubric highlights potential dialogue overlength, out-of-role
  instructions, inappropriate certainty, invented mistakes, dropped questions,
  negation changes, changed numbers and confidence invented out of uncertainty.
- It explicitly labels every result `HUMAN_REVIEW_REQUIRED_NOT_APPROVED`.
- It never calls an API, reads a Gemini key, logs a learner's personal phrases,
  creates an account, bills anyone or stores received answers.

Example local usage:

```sh
node scripts/gemini-quality-benchmark.mjs --template > /tmp/gemini-samples.json
```

The template deliberately contains **EMPTY** replies. It cannot be used to
claim quality, speed or cost. When the owner authorizes isolated provider TEST
requests, fill the 36 (18 cases × two models) `samples` with outputs from
the real model versions after redacting any PII:

- For `kind=conversation`: put each generated scene reply in `reply`.
- For `kind=teacher`: fill the `feedback` object containing at least
  `improved`, `praise`, and `why` strings.
- Preserve `caseId` and `model`, don't duplicate a combination.

Then compare without making any more provider requests:

```sh
node scripts/gemini-quality-benchmark.mjs --evaluate /tmp/gemini-samples.json
```

This identifies cases needing human review, not a quantitative promise of
model quality. Evaluate each flagged answer manually for meaning preservation,
natural speech, consistency across turns, clear personalized coaching, latency
and actual token cost. The script **never** automatically switches models.

## Go/no-go rubric

Human reviewers must score each **model-specific** output on:
- Meaning/factual fidelity (especially allergies, negation, quantities and dates)
- Character continuity and non-repetitive, concise conversational English
- Appropriate A2 / B1 / B2 language in each difficulty
- Personalized praise, a natural rewrite and actionable explanation in Japanese
- No invented error when learner speech is already correct
- No surprise refusal, unsupported promise or safety-sensitive certainty
- Reliability across repeated calls, response latency, input/output/thinking tokens
- Actual **Google billed-tier** rates, retries and overhead

Selection requires complete actual outputs on both models, a clear quality
threshold, data-privacy review, measured worst-tail costs and explicit
staging then live owner approval. An estimated ¥980/month plan must not be
used to justify an unverified quality downgrade.

## Strict scope

The existing production Gemini model is unchanged (`gemini-3.5-flash-lite`).
The proposed ¥980/400 turns/40 teacher uses and monthly Free cap are **not**
implemented as live entitlements. Keep Stripe Live, production Worker/D1/Pages,
old ¥680 subscriptions and main untouched. Use only isolated TEST environments
when provider tests are explicitly authorized.
