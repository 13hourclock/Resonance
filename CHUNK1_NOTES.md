# Resonance v0.8 chunk 1: persistence foundation (V08_SPEC H) + O1 per-ohm counters

Base: /workspace/softsound tag v0.7 (41dd646), rebased 04:2x MDT (only www/js/mind.js differed; untouched by this patch).
Patch: CHUNK1.patch (unified diff, `git apply -p1` from the repo root; tests/runprep.sh is the prep-copy runner and is not needed in the repo).

## What changed (files)
- **www/js/persist.js (new, RS.Save)**: the rs2 save system.
  - Records:
    - `rs2:p` is the profile.
    - `rs2:g:<useed>` is a galaxy, with an index of changed worlds.
    - `rs2:w:<useed>:<sys>:<body>` is a world header.
    - `rs2:c:…:<ci>` is one chunk (bodies + ohms).
  - **Versioned component registry**: each record is `{v, t, k, comp:{id:{v,d}}}`, and each component has a scope, a version and migrations.
    - Components are: profile (lineage, guide, galaxies, pstats, meta), galaxy (orbit, alive, seeds, wmods, worlds), world/header (world, hx), chunk (bodies, cx) and ohm (ohms, tally).
    - Unknown or newer components are kept verbatim.
  - **Delta saving**: only chunks you touched are written, and only when their digest changed. A world you never changed stores nothing.
  - **Idle saver**:
    - It saves 2 s after the last edit, at most 30 s after the first pending one, and every 60 s as a drift pass while ohms live there.
    - It writes one chunk per requestIdleCallback slice (about 3 ms budget).
    - Hiding or leaving the app flushes synchronously (visibilitychange/pagehide). This is new: v0.7 had no hide save.
  - **O1 `tally` per ohm**: w = seconds watched (on screen only), i = interactions, o = offspring, t = teachers. A few bytes per ohm.
- **www/js/store.js**: `putStrs` (batched writes) and `lsSkip`. The localStorage mirror skips very large records, which stay in IndexedDB.
- **www/js/surface.js**: ohm pack/unpack hooks (`ohmOut/ohmIn`), `packHeader`, `chunkIds`, `chunkLive`, and dirty marks.
- **www/js/app.js**:
  - Save, load and autosave now go through RS.Save. The 10 s interval is gone and the saver is pumped from the frame.
  - World keys are rs2.
  - A body you changed glows softly in the system view.
  - A fresh launch that lands on a world you changed loads it.
  - The Q59 galaxy smudges are present but OFF (see Gestures).
- **www/index.html**: the persist.js script tag.
- **Tests**:
  - new: tests/v08_save.js, tests/soak_save.js, tests/save_env.js (fake IndexedDB);
  - tests/pw_save.js rewritten for rs2;
  - tests/pw_launch.js "save still writes" now makes a change first (an unchanged world now stores nothing, by design);
  - tests/runser.sh adds v08_save and soak_save (soak runs with --expose-gc).
- Old `rs1:` saves are not loaded, not migrated and not deleted (Wilbow 3:12).

## In player terms
- Anything you make or change on a world is remembered: shapes, ohms (with their genes, homes and experience), items, water, glyphs and mixer/DAW settings. Come back hours or launches later and it's there.
- The app saves quietly while nothing is happening. You won't see hitches, and switching away or locking the phone saves at once.
- Every launch is still a new random world, but worlds you changed are never lost. In a system view they glow, and double tapping them takes you back in with your changes.
- Each ohm now quietly keeps count of how long you've watched it, how often you've touched it, its children and its teachers (groundwork for later features; nothing visible yet).
- Your old v0.7 saves are not carried over. They stay on the phone untouched but unused.

## Tests and perf (copy, then the v08-chunk1 branch)
- New: v08_save 12/12, soak_save 6/6, pw_save 13/13, pw_launch 7/7.
- **Existing suite in the copy**: everything else passed. Two checks failed, and both also fail on the untouched v0.7 tag, so they were already failing:
  - v05a_check "history trace builds with time" fails on the v0.7 tag too;
  - breakdown_check BD drop-out is flaky (7/8 on v0.7, 8/8 in the copy on a rerun).
- **Soak** (360 simulated minutes, 20 worlds, capped edits):
  - saved size 106 → 349 KB, growing only with content: bytes per item 465 → 641 (≤ 1.5×); biggest world 24 KB;
  - saver slices p50 0.7 / p99 1.8 / max 2.6 ms;
  - reference-world step 0.28 → 0.27 ms;
  - world load 30 ms;
  - data heap 8.48 → 9.39 MB. Total heap 13.5 → 17.6 MB, but heap-snapshot diffs show the extra is V8 JIT code, feedback and shapes warming up, not saved data. The soak measures heap minus code/shapes.
- **Browser**:
  - slice max 0.7 ms; hide flush 0.6 ms;
  - a 400 KB header round-trips;
  - a corrupt record falls back to the .bak.
- **Other timings**: frame hooks plus pump 1.444 vs 1.422 ms/step; flush 2–4 ms in node.
- perf_j in the copy: frameHome mean 6.52 ms vs 6.20 ms (Bot's v0.7 run at a different load). Branch numbers are in NOTES.md.

## Weak spots
- **Size**: saved size grows with what the player makes. There is no content cap; the 256 KB/1 MB budget skip applies only to natural chunks.
- **Memory**: all records and .bak copies stay in memory (store.js design). That is about 1.4 MB after the 6 h soak.
- **Change detection**:
  - The world "changed?" fingerprint covers only DAW edits, mix, music and glyphUser mods. Other mods count only when a verb marks them.
  - Saved state from items, symbols, mold, growth and water is still packed inside the world header component, not one component per module (spec H lists per-module components). This is fine for the format, but those modules can't yet be versioned independently.
- **Load and runtime**:
  - catchUp births while away don't add to tally.o.
  - Play-mode note interactions are throttled into tally.i.
  - Crash-time duplicates are deduped at load.
  - Body ids are reassigned on load (ohm ids are stable).
- **Merge risk**: the Sf.pack line conflicts with anything else editing that long line.
- **Test harness**: node_env's T.notes/T.tract recorders grow without bound in long runs. The soak clears them per world.

## Gesture impact (checked against GESTURES.md)
- **No gesture changes by default.**
- The system-view glow is visual only. Double tap a body still enters it (it now loads your save).
- The hide flush has no gesture.
- **Q59** (cross-galaxy way back: double tap a remembered-galaxy smudge at minimum galaxy zoom to fly there) is **not approved**, so it is built but OFF. `App.wayBack` is false unless `?q59=1`, and galaxy double tap behaves exactly as in v0.7. If approved, it changes only the "double tap empty space = fly home" row (on a smudge), and C17 pinch-out stays as is.
