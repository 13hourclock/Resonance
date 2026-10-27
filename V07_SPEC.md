> **Note (Wilbow, 2:50 AM Oct 25 2026, 23C 23D):** game ideas called "rules" or "standing rules" in this doc are concepts and features to discuss, not rules (his 10:59 PM Oct 24 words: "Rework all my suggestions and ideas as concepts and features never rules"). How each applies depends on context. His process rules (plan before "go", one job at a time, nothing decided without him, text box on cards) stay rules.

# Resonance v0.7 spec (approved by Wilbow, Oct 22-23 2026). BUILD ONLY WHAT IS HERE.
Wilbow, 12:01 AM MDT Oct 23: "Dont build anything I dont mention." Not approved, do NOT build: stroke size -> pitch range,
shaky/smooth -> grit/purity modifier, a line down/up for bass/lead in tier 1, any other extras.

## A. Egg stroke grammar (after a plain spiral)
- A plain spiral hatches quickly (v0.6.2). The egg window: about 1.5 s after the spiral; each stroke that STARTS on the egg extends it.
  No stroke -> a quick random ohm with the light environment lean (v0.6.2). The egg is not grabbable during the window.
- Tier 1 (type), 4 only: taps on the egg = drummer (1 kick, 2 snare, 3 hats, 4 toms, 5+ kit; tap timing = its rhythm);
  wave through the egg = pad or drone (bigger = more movement); circle around the egg = ringer (bell, glass, shimmer);
  flick out of the egg = pluck or struck.
- Tier 2: doubling a glyph = stronger version (two circles = long glassy ring, etc.).
- STROKE FEEL = VIBE: drawing speed sets a synced base tempo (calm to frenzy; quantised to world-synced ratios so it stays
  in time). Fast strokes = intensity: drive or distortion, brighter, double-time notes with a short decay. Slow, deliberate
  strokes = ambient and soft. A fast SERIES of gestures (short gaps between strokes) = hard, fast music. Sense of power:
  feedback scales with intensity (egg flare, sound swell, haptic strength).
- Tier 3 (approved, #3): hidden rare combinations (for example, wave then circle = choir; taps then wave = something
  rhythmic and textural; pick a small set of 4-6). Shown as dim, unlabelled orbiters that light up only when you're one
  stroke away.
- ORBIT HINTS: after a spiral, small glyph icons orbit the egg showing what's available right now in every tier
  (tier 1 and 2 clearly, tier 3 dim as above). They update as you add strokes. No text.
- Glyph marks (#4): each ohm carries a faint mark of the glyph(s) it was made with in its body pattern; wild ohms and
  fossils show them too.
- Unrecognised strokes (#5): a stroke on the egg that isn't recognised gives it a small random nudge (with feedback).
- Clay: keep the existing clay window reachable by holding still at the end of the spiral (as in v0.6.2). Don't remove it.
- Guide: the guide ohm demonstrates the spiral and the 4 tier-1 type strokes with ghost fingertips, waits for the
  player to copy each one, and hatches that type. Tier 2 and 3 are not taught.
- Conflicts: wave, circle and taps only count as egg words if they START on the egg during its window. The circle
  must not trigger catch (the egg is not an ohm). Write the check into GESTURES.md.

## B. Conducting (#7)
- Hold two fingers still on open ground for about 0.6 s to raise the baton. Every ohm in view turns toward you and waits.
- While the baton is up, one-finger strokes conduct and don't draw:
  - Up and down beats set the tempo from their speed; the UPSTROKE marks the upbeat (Wilbow).
  - Raising your hand makes them louder, and lowering it softer.
  - Sweeping cues: a stroke cues the ohms it passes THROUGH (not just left or right sides).
  - A sharp flick down cuts them off.
  - Lifting your fingers (or the baton timing out) releases them.
- Check against pinch, twist and multi-finger taps; a still two-finger hold is currently unused.

## C. Undo and redo remap (Wilbow)
- Three-finger tap = undo, four-finger tap = redo (previously two = undo, three+ = redo). A two-finger tap no longer
  undoes. Update the guide demo if it teaches undo, and GESTURES.md. The hooked return-arrow undo glyph stays.

## Rules
No recordings. Mutation stays off. No menus or text. Lean headless checks; the full serial suite must be green.
Build, sign and upload Resonance-v0.7.apk to Drive. Update NOTES.md, GESTURES.md and the roadmap Page. Report the
visible changes for Wilbow.

## D. Experience: ohms learn from successful jams (Wilbow, 12:07 AM MDT Oct 23, in reply to concern 3)
- Ohms SEEK OUT successful (locked, high groove score) jams and try to join, even when they don't fit yet.
- Whether accepted or kept as a watching bystander, they LEARN from the jam: tempo range, feel and intensity, the meter,
  the scale or key system, rhythmic and motif vocabulary, and how to play a supporting role. Rate scales with learnRate
  and openness (conformity).
- What they learn is an EXPERIENCE layer stored on top of the genome as an addition to their total knowledge. It never
  replaces genes, never forgets, accumulates across jams and places, and is saved with the world. (Build on the existing
  learned key, tempo and meter, epi marks and learnRate; the genome itself stays unchanged.)
- A well-travelled, experienced ohm can jam OUTSIDE its genetic and environmental range: its experience widens what
  the jam fit check accepts (for example, a frenzied ohm that has played in calm jams can join calm ones and play
  calmly). Each distinct jam or place adds a little; experience shows visibly (for example, a subtle travel-worn sheen
  or rings), no text.
- This is learning driven by what happens in the game, not random drift or mutation, so mutation stays off.
- Fast-drawn restless ohms that get turned away still watch and learn, so they get in over time.
- Checks: an ohm that doesn't fit is rejected at first and, after enough exposure, is accepted and fits musically; its
  learning survives save and reload; its genome is unchanged.

## E. Watched jams grow (Wilbow, 12:16 AM MDT Oct 23)
- ATTENTION: while the player keeps watching the same jam (it stays in view and centred enough, without much panning
  away), the jam gains "attention" over time. Looking away pauses growth (it doesn't erase anything; the jam keeps
  playing its locked arrangement while unwatched, as now).
- GROWTH GATE: the jam only EXPANDS while ALL present, playing members are harmonically AND rhythmically matched
  (consonance with the shared chord and key, a tight shared pulse, aligned phrases, syncopation that interlocks
  rather than clashes). If any member falls out, growth pauses until the jam settles again. Muted members don't count.
- EXPANSION = longer, more complex loops: the shared loop grows in phrase-sized steps (for example 1 -> 2 -> 4 -> 8 ->
  16 bars, capped sensibly) and members' parts get more complex (more motif variation, counter-lines, fills, rhythmic
  subdivisions, richer voicings), always within the music theory rules (scale, harmony, voice leading, counterpoint,
  motif development, call and response).
- MEMORY OF WHAT WORKED: the old loop is RETAINED inside the longer one, not replaced (for example A becomes A A' or
  A B A B', where A is the proven section). Sections, patterns and chord moves that scored well are marked as
  "what works" and members keep returning to them as home base.
- KEEP WHAT WORKS, KEEP EXPLORING: when 2 or more ohms lock into a groove, they stick with it, but still explore in
  small, contained doses (variations, fills, a new bar at the end of a phrase, an answer phrase). An exploration that
  scores well is kept and added to "what works"; one that doesn't is dropped and they return to the proven material.
  Experimenting must not break the time or the harmony.
- STYLE KNOWLEDGE, so it sounds really good:
  - Jam bands: long-form development, a sense of a journey, tension and release over many bars, a shared pulse,
    call and response between voices, a leader passing the lead, peaks built slowly then released into a groove, and
    returning to the head.
  - Electronic music: 4, 8, 16 and 32-bar structures, layering in and out (one element at a time on phrase boundaries),
    builds (filter opening, rising density or rhythm rolls) to a drop, steady kick and hat foundations, the bass
    locked with the kick, call and response between short motifs, and subtle per-loop variation (filter, accents,
    ghost notes) so long loops don't feel static.
  Both work with the existing breakdowns and with the cohesion system (consensus key, emergent chord cueing, shared
  pulse, aligned cadences, a bass anchor, register space, one shared acoustic space). No central composer: growth comes
  from members' own cueing and agreement.
- The growth adds to the jam members' EXPERIENCE (section D).
- Checks (headless, no recordings): a watched, matched jam's loop grows and still contains the earlier loop; growth
  stops while a member is out of key or time; an unwatched jam doesn't grow; exploration that fails is reverted.

## F. Defaults for the concerns (sent 12:02 AM; Wilbow answered only #3; these are implementation details of approved items)
1. Egg taps: a preview after each tap; the drum type locks after a 0.4 s pause.
2. Egg hit area: moderate; if a new spiral is started right next to it, the egg slides aside.
3. Replaced by section D (experience).
4. Tempo from stroke speed snaps to synced steps (half, 2/3, 3/4, normal, 4/3, 3/2, double); intensity (drive, decay, subdivision) is continuous.
5. Conducting: only strokes that cross ohms cue them; beats count only away from ohms. After release the jam keeps the conducted tempo
   and slowly drifts back toward its own if members disagree.
6. Three-finger undo and four-finger redo: allow small finger movement in the taps; the hooked-arrow undo glyph stays as a backup.
7. Orbit hints orbit at a distance, shrink as the egg window runs out, and fade when zoomed out.
Tuning: the v0.6.2 birthplace lean averaged a gene shift of about 0.001, which is inaudible. Make it slight but noticeable (a clear
same-stroke difference between a cave and a pool), still well under the stroke's influence.

## G. Theory from many cultures (Wilbow, 12:18 AM MDT Oct 23)
Extend the existing theory (scale catalogue T.CAT, meters, harmony, motif) so that jams can draw on many musical
cultures, each implemented by its own real rules, not just its scale:
- Hindustani and Carnatic raga: ascending and descending rules, important notes (vadi and samvadi), characteristic
  phrases, gamaka slides, a tanpura-style drone instead of chord changes, tala cycles (teental 16, rupak 7, jhaptal 10)
  with the sam landing.
- Arabic, Turkish and Persian maqam and dastgah: microtonal intervals (quarter tones in the tuning), jins building
  blocks, sayr (the melodic path through registers), iqa' rhythm cycles, a mostly melodic texture with drones and
  heterophony.
- Indonesian gamelan: slendro and pelog tunings, colotomic structure (gong cycles marking the phrase), kotekan
  interlocking parts between two ohms, irama (density changes).
- West African: 12/8 bell timelines, 3-against-2 cross-rhythm, interlocking drum parts, call and response.
- Afro-Cuban and Brazilian: son and rumba clave, tumbao bass, montuno; samba and bossa partido-alto feel.
- Balkan and Turkish aksak (additive) meters: 7/8, 9/8, 11/8.
- Flamenco: the Phrygian-dominant cadence and the 12-beat compas.
- Japanese and Chinese: in, yo and pentatonic scales, space and silence between phrases (ma), heterophony.
- Blues, jazz and gospel: blue notes, the 12-bar form, swing, ii-V-I, extended chords.
- Celtic and Andean modal music with drones; overtone and throat singing for vocal-tract ohms.
- Plus the existing Western tonal material and the jam-band and electronic craft from section E.
How it fits Resonance: no central composer. A world's or galaxy's personality and its environment make some traditions
more likely at birth (light influence only, as with the birthplace lean), and a jam settles on one by consensus. Ohms
carry the traditions they've played in their EXPERIENCE (section D), so well-travelled ohms can bridge traditions and
bring them to new jams. Fusion between traditions only happens when an experienced ohm bridges them and the jam stays
matched (section E gate). Rhythm cycles, cadences and form follow the tradition (for example the sam replaces a
Western downbeat cadence in a tala-based jam). Tunings must work with the AudioWorklet (microtones per note).
Checks: each tradition's jam stays in its scale and tuning, its rhythm cycle aligns, and a mixed jam only fuses
through an experienced bridge.

## H. Additions (Wilbow, 12:25 AM MDT Oct 23)
1. PROMPTS FOR THE END-OF-SPIRAL HOLD (no text): when the finger rests at the end of a spiral, a ring starts filling
   around the fingertip (about 0.5 s) with a rising tone; when it closes, the egg softens into clay with a clear sound.
   Lifting early hatches normally. The orbit hints around the egg include one for the hold (a filling ring glyph). The guide
   demonstrates the hold once, after the 4 tier-1 strokes.
4. CAVE ROOFS NEAR OHMS: currently a cave roof is skipped if an ohm is within 22 px of its path. Fix: build it once the
   area is clear, retrying while the chunk is loaded (ohms move), and if an ohm lives under the arch, route the roof
   around it or raise the arch, so that ohm never gets pushed or trapped. Never spawn a rod through an ohm. Check: a cave with an
   ohm under its path gets its roof within a few seconds or arches over it, and no ohm speed spike.
3. STORM SEED 53: find the root cause of its 220 px/s peak (the same method as for seeds 17, 47 and 58: what's moving fast and
   why) and fix the cause, not the limit. Target: a worst peak across all 64 seeds well under the limit (about 180 px/s or less).
   Don't raise the limit.

## I. Random starting worlds for testing (Wilbow, 12:31 AM MDT Oct 23)
- Every launch starts somewhere new: a randomly sampled galaxy, system, planet and landing spot (a fresh random seed each
  time), with a varied starting scene (ohms, voices, drum types, terrain, weather, time of day), not the same opening
  every time. Sample widely across planet types (rocky, wet, cloud and gas giant, moon) so testing covers the range.
- The save and load system will come later (Wilbow). For now, don't auto-load the previous world at launch; always start a
  fresh random world. Keep the existing save code (IndexedDB) intact and still writing, so it's ready when a proper
  save and load system is designed later. Don't delete it, and add no menus.
- The tutorial guide still appears on a fresh world while its lessons aren't done.
- Tests keep their fixed seeds (ID_SEED and scene seeds); only the real app launch is randomised.
- Checks: two launches give different seeds and scenes; every planet type can come up as a start.

## J. Background ohms stay cheap (Wilbow, 12:38 AM MDT Oct 23): a standing rule for every v0.7 system
- Off-screen (lod 1) and unloaded ohms must stay cheap. New systems run their heavy work only for what's on screen or
  being listened to: egg, conducting, watched-jam growth (E) and culture fusion (G) are on-screen only by design.
- Experience (D) updates on a slow tick (once per phrase or a few seconds), not every frame, and only stores compact
  numbers. Long loops are stored compactly (motif and section references, not every note).
- Off-screen jams keep playing their locked arrangement in the cheap mode they use now, with no new per-frame cost.
- Measure: the frame time and the background tick cost before and after v0.7 in a busy world; report both. No regression
  allowed on the background path.

## D2. Experience = compatibility skill (Wilbow, 12:40 AM MDT Oct 23; extends section D)
- Well-travelled ohms gain a COMPATIBILITY SKILL that grows with experience. It helps them integrate THEMSELVES and OTHERS into
  successful music.
- Themselves: they adapt faster to a jam's key, tradition, tempo and feel, and pick a role that fills a gap.
- Others: in a jam, an experienced ohm acts as a bridge and host. It cues a hesitant newcomer in at a phrase
  boundary, plays simpler and more supportive under it while it settles, plays a bridging line (shared notes or rhythm)
  between members who don't quite match, and shares what it knows (scale, cycle, what works) so others learn faster.
  The more skilled, the wider the gap it can bridge, so a jam with a skilled member accepts newcomers it would
  otherwise turn away, as long as the matched gate (E) still holds.
- Uses the existing cueing, the consensus key, the newcomer listen-then-join and teaching. No central composer: it's
  a member's influence, not a conductor.
- Cheap (J): the skill is one compact number per ohm, and the bridging logic only runs in on-screen jams.
- Check: the same mismatched newcomer is accepted and settles in a jam with a skilled member, but not in one without.

## K. Walk in an ohm's shoes: grow play mode (Wilbow approved 12:50 AM MDT Oct 23). Build LAST in v0.7.
- Entry unchanged (tap-then-hold an ohm). Inside play mode:
  1. MOVE: a floating stick appears under the left thumb wherever it lands on empty screen (a soft world-drawn glow, only
     while touched, no buttons). It moves the ohm the way its body plan moves (crawl, walk, swim, float or fly); a flick up =
     jump or rise. The ohm's own behaviour is off while driven, and it stays within physics (no teleporting, guards stay on).
  2. PLAY: the right side keeps play mode's nodes, pads, handles and tract; abilities fire from what you play (existing thresholds).
  3. SENSES (cheap whole-screen effects and sound filters only, rule J): camera follows; the audio listener moves to the ohm with its
     hearing range; blind = dark world plus echo ripples (reuse the tap ripple) at real sound events; deaf = muffle filter on the overall sound plus
     a gentle shake or vibration; night eyes see in the dark; energy and mood = a soft vignette plus a heartbeat haptic (if haptics are kept).
  4. HOLISTIC: walking into a jam makes you a member with that ohm's identity; what you play counts as its experience (D) and
     can earn matched-gate growth (E). On exit, it resumes as itself.
  5. EXIT as now (pinch in) or Android back. The stick replaces drawing on the left side only while in the mode; check
     every in-mode gesture against GESTURES.md (the play-mode nodes and handles near the left edge must still be reachable;
     the stick spawns only on EMPTY screen, not on nodes or handles).
- Side-on view (no first-person). Only one ohm is driven at a time.

## L. In-game hints for everything new (Wilbow, 12:50 AM MDT Oct 23): no text, explanations shown in the world
- Every new v0.7 feature must be discoverable in-game: ghost fingertip or thumb demos, glyph hints, sound and glow cues.
- Walk-in-shoes: on first entry to play mode, a ghost thumb shows the stick on the left and a ghost finger plays a node
  on the right; the senses briefly pulse to show they're on; the guide demonstrates it once after its other lessons.
- Egg grammar: orbit hints (A) plus the guide demos. Hold-for-clay: the filling ring (H.1).
- Conducting: when 2 fingers rest still, a faint baton ring starts filling, so the hold is discoverable; while it's up, ghost
  strokes show a beat (with the upstroke) and a sweep through ohms once.
- Undo and redo: the guide's undo lesson switches to three fingers; a 2-finger tap shows a brief three-finger ghost hint the first
  few times, since it used to undo.
- Experience and compatibility: a visible travel-worn sheen; a skilled ohm's bridging shows as a soft link line to the
  newcomer it's helping. Watched-jam growth: the loop ring around a jam visibly lengthens and keeps the old segment marked.
- Hints fade once a player has used the feature a few times (stored in mods.guide), and never block the view.

## D3. Roam when watched from afar, hold when directed (Wilbow, 1:21 AM MDT Oct 23; resolves "seek jams" vs "stay home", UX R9)
Verbatim: "when zoomed out and only watching ohms without Interaction, they wander, interact with eachother On their own.
when user is focused and stationary for a bit and giving commands to single, group or a visble Area, ohms stay put out and
wait Further command, especially In developed jams."
- ROAM (zoomed out and no touches for a while): on-screen ohms wander beyond their usual home range, meet, mingle,
  visit and try to join successful jams (section D seeking happens here), form new jams. Behaviour stays theirs (no
  central director).
- HOLD (the player is focused: camera roughly still for a bit AND recently directing a single ohm, a group or the visible
  area, e.g. taps, catches, cues, conducting, the egg): ohms in view stay put and wait for the next command; members of
  developed jams (grown or long locked) hold their places most firmly. Hold eases back to normal after a quiet spell.
- In between, the current v0.6 stay-home behaviour applies unchanged.
- Transitions are gradual (no snapping), shown text-free (e.g. ohms settle and face the player in HOLD; a looser, drifting
  posture in ROAM), covered by section L hints.
- Cost (J): roaming runs only for on-screen ohms; off-screen and unloaded ohms keep today's cheap behaviour.
- Check: zoomed out and idle -> ohms leave home range and meet; focused with recent commands -> ohms in view stay within a
  small radius; developed jams don't break up while the player is directing.
