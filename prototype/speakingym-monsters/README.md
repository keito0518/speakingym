# Speakingym Monsters — learning-first playable foundation

An isolated proof of concept for **"知ってる英語を、話せる英語に"**. It intentionally replaces the RPG battle/control overhead with short, productive speaking practice and a monster-collection reward loop. The existing Quest PR #76 remains untouched.

## Play loop

1. **Practice (untimed):** three short situations, sometimes with an English listening cue. Say a response aloud; optional browser speech recognition may transcribe it. Typed input and an honest self-check remain available.
2. **60-second challenge:** six varied speaking situations. Reveal examples, self-rate whether the response came out independently, with a hint, or not yet. The timer is not a language score.
3. **Bank and choose:** every completed question awards spendable XP (16 for independent, 8 for hinted, 2 for still difficult). XP accumulates in a shared wallet; it is **not** automatically given to the selected companion. In the collection, award 10 XP or the entire wallet to **any** owned creature. That creature levels up and evolves once it reaches 160 allocated XP. Independently used expressions unlock creatures. Using a phrase independently in **two different contexts on two calendar days** earns mastery; mastery unlocks later creatures.
4. **Return:** difficult/hinted expressions are due for review the next day; independent expressions in three days; mastered expressions in seven days. Due items are prioritized when selecting a session.

The included curriculum has six practical conversation expressions, each used in two distinct situations. These are deliberately curated examples, not a claim to cover conversational English broadly.

## Important learning and technical honesty

- This is **not automatic grammar, pronunciation, or fluency grading**. The example matcher only recognizes literal authored responses and their alternatives. The learner self-rates honestly after speaking aloud and viewing the example. A valid paraphrase must not be labeled wrong simply because it differs from the example.
- Browser SpeechRecognition and speechSynthesis are optional. Microphone permission and iPhone Safari hardware behavior are **not verified**; a no-microphone input/self-check path always exists.
- No authentication, AI provider, Firebase, Stripe, Worker, D1, billing, or analytics calls. All progress is namespaced in `localStorage` under `speakingym-monsters-prototype-v1`. There is no cross-device sync or account restore.
- The nine original SVG creatures (including a fried egg, lone sock, walking pudding and eraser spirit) are starter artwork to validate the reward loop; final art direction is uncommitted.
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
