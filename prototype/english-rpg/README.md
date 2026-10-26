# Speakingym Quest — RPG Playable Prototype

Standalone, static prototype for testing whether speakingym's English practice works as a small monster-training RPG. This route is intentionally isolated from the main application, authentication, review history, Worker, D1, Stripe, and all user data.

## Play

Open `/prototype/english-rpg/` in the branch preview. Choose a starter, then clear routes in order. Stage clears, roster, experience, catches, exploration position/loot, and question history use only the namespaced browser key `speakingym-rpg-prototype-v1`. Reset from the circular-arrow control at the top.

## Game loop

- Stage 1 is a designed **vertical slice**, not another battle-card screen: help an NPC by listening, read a sign, **walk a controllable 7×7 forest map**, decide whether to detour for a supply chest and a shrine, battle a Mimip, then give the NPC spoken directions. On mobile tap adjacent glowing squares or the D-pad; on desktop use arrow/WASD keys. Obstructions, checkpoints and loot are persisted when returning to the route.
- Stage 1 combat is tactical: an enemy **telegraphs its next attack** every turn; correct hits no longer prevent all enemy retaliation. Listening can block an incoming heavy attack and restore focus, a phrase costs focus, and an optionally acquired shield absorbs damage. Starters have distinct combat passives (Momo boosts word attacks, Lumi improves listening defense, Koro boosts phrases). Several story-relevant question variations keep repeated attacks from showing only the same prompt.
- Captured monsters have **distinct species traits** and can fill a **three-creature battle party**. The camp screen has party slots. A tactical battle keeps separate HP for each member and supports midbattle swapping; an enemy responds during a swap, so timing matters. Defeated active members can be replaced while healthy party members remain. Older local saves automatically receive a one-member party.
- Reaching level 4 visibly evolves the active creature and now boosts its tactical maximum HP by 15 and its signature move/guard by 4. An evolved partner therefore changes both survivability and damage control, rather than only its appearance. A fainted leader with a living bench can resume the encounter after reloading.
- Stages 2–10 retain the earlier encounter loop for now. They are **not** presented as finished RPG levels. Bosses are stages 5 and 10. The map and tactical story experience will be expanded after gameplay testing.
- Word Strike practices vocabulary in a sentence; Listening Wave uses browser speech synthesis and checks the listener's understanding; Phrase Link asks the player to assemble a natural sentence from shuffled word tiles.
- Each move has distinct power and a focus/guard tradeoff. Listening restores focus and some HP in standard encounters; on the tactical stage, it reduces enemy retaliation instead. Phrase attacks are strongest and spend focus.
- First route clear grants the most experience; replays still award reduced XP (12 regular / 22 boss) so players can **train new captures**. At level 4 the active companion evolves.
- Victory has a visible 40% catch chance (60% for bosses). Three wins against the same species guarantee a catch. Repeat a cleared route or choose the missing creature in the field guide to hunt it again.
- There are 3 distinct starters, 12 original creatures, 60 curated questions (20 per move) for the standard encounters, plus route-specific stage-1 prompts. Recent questions are deprioritized until the category's bank has cycled.
- Speech synthesis is optional; if playback fails, the learner can reveal the sentence or continue to the answer. The sentence is shown after the meaning attempt.

All character illustrations are original inline SVG shapes. There are no image downloads, AI calls, APIs, analytics events, or third-party art assets.

## Local QA

```sh
node --test tests/english-rpg-engine.test.mjs
python3 -m http.server 8765
node tests/english-rpg-browser.cjs
RPG_BROWSER_ENGINE=webkit node tests/english-rpg-browser.cjs
```
