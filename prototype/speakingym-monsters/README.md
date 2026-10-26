# Speakingym Monsters — learning-first playable foundation

An isolated proof of concept for **"知ってる英語を、話せる英語に"**. It intentionally replaces the RPG battle/control overhead with short, productive speaking practice and a monster-collection reward loop. The existing Quest PR #76 remains untouched.

## Play loop

1. **Practice (untimed):** three short situations, sometimes with an English listening cue. Say a response aloud; optional browser speech recognition may transcribe it. Typed input is also supported. Submit an English response for a **conservative, curated rule-based check**, with a retry path and no XP for skipped answers.
2. **60-second challenge:** six easy, four normal, or three hard speaking situations (longer instructions get fewer questions). Submit responses for the same limited auto-check, or skip for zero XP; self-rating buttons are removed. The timer is not a language score.
3. **Bank and choose:** every completed question awards spendable XP (easy: 16/8/0, normal: 24/12/0, hard: 32/16/0 for verified without hint/verified with hint/skipped). XP accumulates in a shared wallet; it is **not** automatically given to the selected companion. In the collection, award 10 XP or the entire wallet to **any** owned creature. That creature levels up and evolves once it reaches 160 allocated XP. Independently used expressions unlock creatures. Using a phrase independently in **two different contexts on two calendar days** earns mastery; mastery unlocks later creatures.
4. **Return:** difficult/hinted expressions are due for review the next day; independent expressions in three days; mastered expressions in seven days. Due items are prioritized when selecting a session.

The included curriculum has six practical conversation expressions, each used in two distinct situations at three selectable levels (36 authored tasks): **easy** preserves the Japanese-to-English cues and optional listening, **normal** provides English-only context and one English instruction, and **hard** provides longer English context with multiple response constraints. The selected difficulty persists in the device save. Each difficulty variant of the same scene counts as the **same context** for mastery, so switching levels cannot fake two-context mastery. These are curated examples, not a claim to cover conversational English broadly.

## Important learning and technical honesty

- This is **not automatic grammar, pronunciation, or fluency grading**. The example matcher only recognizes literal authored responses and their alternatives. The learner self-rates honestly after speaking aloud and viewing the example. A valid paraphrase must not be labeled wrong simply because it differs from the example.
- Browser SpeechRecognition and speechSynthesis are optional. Microphone permission and iPhone Safari hardware behavior are **not verified**; a no-microphone input/self-check path always exists.
- No authentication, AI provider, Firebase, Stripe, Worker, D1, billing, or analytics calls. All progress is namespaced in `localStorage` under `speakingym-monsters-prototype-v1`. There is no cross-device sync or account restore.
- The nine original SVG creatures (including a fried egg, lone sock, walking pudding and eraser spirit) are starter artwork to validate the reward loop; final art direction is uncommitted. All nine now have invented **English character names** (e.g. Yolkie, Soxie, Wobblin), Japanese legacy names, English word roots with Japanese meanings and speech-synthesis pronunciation controls. Evolution unlocks a new name and visual glow. Old learning-aid skill proposals remain internal catalog metadata but are **not shown or enabled**. The user prefers future playful collection/evolution powers instead; do not ship study-assist abilities without a decision.
- The monster catalog is data-driven. To add a new creature, add an ID/name/kind/note/unlock row to `MONSTERS` in `monster-data.js` and a same-ID optional SVG in `monster-art.js`. The engine, storage validation, unlocks and collection discover it automatically. Art without a matching row is never displayed; a missing SVG gets a neutral placeholder, **never another monster's face**. Future content can add new phrases and milestone unlocks without schema changes.
- Legacy v1 saves that assigned XP directly to the companion remain valid. Already-grown monsters keep their XP; their new shared wallet initializes at zero (past rewards are never counted twice).
- A session ending early retains already recorded attempts. Reloading during a live timed run starts a new run, but learned expressions, banked XP and allocated companion XP persist.

## QA

```
node --test tests/monsters-engine.test.mjs
python3 -m http.server 8766
node tests/monsters-browser.cjs
MONSTERS_BROWSER_ENGINE=webkit node tests/monsters-browser.cjs
```

The dedicated GitHub workflow runs Node tests, both browsers and 320/375/390/430px visual snapshots. Real voice-recognition accuracy and longitudinal learning benefit require later real-user testing.

## Objective grading roadmap (not implemented yet)

The current prototype **does not rely on subjective self-rating**. It uses authored examples plus narrow content criteria and awards XP only when those match. Valid paraphrases outside the criteria remain **review / cannot confidently assess** rather than being marked wrong. Learners can revise the response or skip for **0 XP**. This is not semantic AI scoring or a validated language test. Avoid replacing it with strict equality against the example: valid English paraphrases must not be marked wrong. A future graded challenge should batch one round of recognized/transcribed answers to an authorized, usage-capped text-based semantic evaluator, applying per-prompt communicative criteria (intent, required details, intelligibility). It should return accepted / needs improvement / cannot confidently assess and short actionable feedback. Easy structured answers can be locally prechecked against vetted variants. SpeechRecognition is transcription, **not** evidence of pronunciation quality. Microphone unavailable or unclear ASR must remain a recoverable state, not an automatic zero. Keep all test judging isolated from production, behind staging rate limits and cost caps.

## Automatic judging beta: practical limitations

- The local module `monster-grader.js` checks authored example responses and conservative task-specific criteria for all 36 situations. It does not call AI, pretend to know pronunciation quality, or silently award XP to unverified answers. The feedback exposes which content requirements could not be confirmed and lets learners retry or skip for zero XP.
- Natural correct paraphrases can still be flagged as **review**. A robust free-form evaluator needs a separate authenticated, cost-capped staging endpoint, independent quality review, and a way to appeal false negatives before production rollout.
- Submitted text does not leave the device in this prototype. Speech recognition is browser-provided and may use platform recognition services; voice capture accuracy varies by browser and is **not** proof of pronunciation accuracy. A real iPhone microphone check remains outstanding.
