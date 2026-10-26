# Speakingym Quest — RPG Playable Prototype

Standalone, static prototype for testing whether speakingym's English practice works as a small monster-training RPG. This route is intentionally isolated from the main application, authentication, review history, Worker, D1, Stripe, and all user data.

## Play

Open `/prototype/english-rpg/` in the branch preview. Choose a starter, then clear routes in order. Stage clears, roster, experience, catches, and question history use only the namespaced browser key `speakingym-rpg-prototype-v1`. Reset from the circular-arrow control at the top.

## Game loop

- 10 sequential routes; stages 5 and 10 are bosses.
- Each encounter asks short English questions until the enemy is defeated. Three correct normal attacks typically clear a route; wrong answers cost HP but show an explanation and let the learner continue.
- Word Strike practices vocabulary in a sentence; Listening Wave uses browser speech synthesis and checks the listener's understanding; Phrase Link asks the player to assemble a natural sentence from shuffled word tiles.
- Each move has distinct power and a focus/guard tradeoff. Listening restores focus and some HP; phrase attacks do the most damage and spend focus.
- First route clear grants experience, so replaying a simple question cannot be farmed for unlimited growth. Boss stages grant more XP. At level 4 the companion evolves.
- Victory has a visible 40% catch chance (60% for bosses). Three wins against the same species guarantee a catch. Repeat a cleared route or choose the missing creature in the field guide to hunt it again.
- There are 3 equal starters, 12 original creatures, and 60 curated questions (20 per move). Recent questions are deprioritized until the category's bank has cycled.
- Speech synthesis is optional; if playback fails, the learner can reveal the sentence or continue to the answer. The sentence is shown after the meaning attempt.

All character illustrations are original inline SVG shapes. There are no image downloads, AI calls, APIs, analytics events, or third-party art assets.

## Local QA

```sh
node --test tests/english-rpg-engine.test.mjs
python3 -m http.server 8765
node tests/english-rpg-browser.cjs
RPG_BROWSER_ENGINE=webkit node tests/english-rpg-browser.cjs
```
