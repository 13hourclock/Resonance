# Resonance v1 (the first game): handoff for Claude or another AI

Packaged Oct 27 2026 (MDT) from `/workspace/softsound`, HEAD `4faca7f215112abbee523f61c8f841340778ba4e` (Oct 25 2026, 10:43 AM MDT), with `git archive` (no node_modules, no build outputs, no history).

## What this is
**Resonance** (appId `com.lensure.resonance`) is Wilbow Shmesh's first game: an Android, gesture-only musical life sim. Its creatures, called "ohms", are gene-built instruments, each with its own musical mind. There is no central composer. Built with Capacitor + plain JavaScript (www/ is served as-is; there's no bundler) + Web Audio.

**Status: retired / concept reference.** On Oct 24 2026, 10:08 PM MDT, Wilbow stopped old-game builds and moved to **Resonance 2.0, "The Journey Ohm"** (separate package, set 1 in the same Drive folder). Use this game as a reference for concepts, gestures, music systems and his wording. Don't restart it unless he asks.

- Newest shipped APK: **v0.8b10 (versionCode 35)**, tag `v0.8b10` = `508432e`. The game code at HEAD (www/, android/, package.json) is byte-identical to v0.8b10. The 113 commits after the tag only touch docs and plans.
- Earlier baseline: v0.7 (vc15), tag `v0.7` = `41dd646`.

## Where to start reading
1. `CHANGELOG.md`: releases and commit summary (generated from git log).
2. `START_HERE.md`: the original bot onboarding doc. Note that it refers to `HANDOFF.md`, which is **deliberately not included** (see Security). The useful parts of it are also in DECISIONS.md and GOAL_AND_FEATURES.md.
3. `GOAL_AND_FEATURES.md`: Wilbow's goals and every feature he suggested.
4. `DECISIONS.md`: authoritative status per system, with exact quotes. `WILBOW_VERBATIM.md`: every Wilbow message verbatim (search it with rg; don't read it all). Both are append-only.
5. `QUESTIONS_FOR_WILBOW.md`: numbered questions, never renumber. (Numbering is shared with The Journey Ohm; see that package's COLLABORATION.md.)
6. `THEMES.md`, `V08_SPEC.md`, `V07_SPEC.md`, `GESTURES.md`, `NEW_ENGINE.md` (the bridge into Resonance 2.0), and `NOTES.md` (build log; the end has the latest state).

## Folder map
- `www/index.html`, `www/js/*.js` (~85 modules: app.js entry/gesture recogniser, creature/genome/dna, music/harmony/jam/cohere, audio/sound/inst/drums, render/planet/space, persist/songsave, dev.js dev panel, ...)
- `android/`: the Capacitor Android project (no keystore or signing config with secrets)
- `tests/`: ~100 node + playwright checks; `tests/runser.sh` runs the serial suite
- `tools/`, `plans/`, `checkins/`, `audits/`, `research/`, `archive/`: process notes
- top-level `*.md`: specs, design notes, Wilbow records

## Run it in a browser
```
npm install               # Capacitor + playwright (dev)
cd www && python3 -m http.server 8811
# open http://localhost:8811/index.html   (?fixed=1 = fixed seed for tests, ?fresh=1 = no save)
```
Use a phone-sized viewport with touch emulation. It's gesture-only, so there are no buttons. **Dev panel:** hold three fingers still for 2 s; while it's open, tap anything to identify it.

## Tests
`bash tests/runser.sh` runs them serially (never in parallel) and starts a server on port 8811 (`RS_PORT`, `RS_ROOT`, `RS_RES` override it; `RS_T="a b"` runs a subset). Results go to /tmp/res/*.txt, and a crash counts as a failure. The playwright tests need `npx playwright install chromium`.

## Build an APK (debug)
Needs Node 22+, JDK 21 and the Android SDK.
```
npm install && npx cap sync android && cd android && ./gradlew assembleDebug
```
**Release signing:** bring your own keystore. Configure it locally (env vars or an untracked keystore.properties) and **never commit it**. The original signing key and its password are not part of this package and never will be. Any password that appears in old notes is a placeholder that must be replaced before any Play Store release.

## Security (what was excluded)
- `HANDOFF.md` (it contained the signing password), every `*.jks` / `*.keystore`, `.env*`, `local.properties`, `keystore.properties`, APK/idsig build outputs, `node_modules/`, anything from the Lensure project (`/workspace/lightsynth`), and git history (older commits contain HANDOFF.md).
- One old placeholder password string in `NOTES.md` was replaced with `[REDACTED]`.
- A leak scan was run before packaging (password/storePassword/keyPassword/keystore/KSP literals, the real value, and API/private-key token patterns). It passed.

## Working with Wilbow
His words are authoritative. Read his ideas for the goal behind them, not as rigid rules. Nothing is decided without him, and proposals go to him in player terms. New features go behind switches, and nothing is removed without asking him. Keep updates short and plain. The full rules are in The Journey Ohm package's `COLLABORATION.md`.
