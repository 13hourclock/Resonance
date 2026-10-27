# Clay-stage timbre review (PROPOSAL, docs only)

Music-theory overseer, Fri Oct 23 2026, 1:52–1:53 PM MDT. **Everything here is a proposal pending Wilbow's approval.**
No code, builds, tests or other docs were changed.

- **Wilbow, 1:49 PM MDT, verbatim:** "be sure that all the most important elements of timbre can be customized with the clay stage. Keep in consideration sections of bands and orchestras, and roles in the sound. Let's brainstorm before implementation"
- **Reviewed:** the builder bot's 16-point brainstorm (B1–B16 below), `mold.js` (clay), `inst.js` + `genome.js` (engines, archetypes, `spinDefault`), `tract.js`, GESTURES §4/§12, V08 P and Q, MUSIC_THEORY, PATTERN_LIBRARY, DECISIONS, WILBOW_VERBATIM.
- **Voice principle, latest words:**
  - 3:38 AM: instruments don't change each other; "notes and playing style change"; ohms keep their instrument "unless directly changed by the player".
  - 3:41 AM: the sound comes "from their body"; items only "modulate in noticeable predictable ways".
  - 3:47 AM: "not quite it" to the voice-lock reading (details still pending).
  - So the **player** shaping clay is exactly the sanctioned way to set a voice.

**Words used (defined once):**
- **Timbre**: what makes two notes at the same pitch and loudness sound different.
- **Partials/overtones**: the extra frequencies above the note's pitch.
- **Section**: an orchestra or band family (strings, brass…).
- **Role**: the job in the music (bass, lead…).
- **Engine**: one of the 9 synth methods in code.

---

## 0. What exists today (code facts)

1. **Clay** (`mold.js`, opened by a spiral + ~0.45 s rest, ~8 s window, 20 s cap). Gestures are counted only when they start on the clay:
   - **edge push/pull:** round = pure, long = nasal (formant), lumpy = gritty, big = low;
   - **strand drag:** a limb;
   - **pinch:** size + register;
   - **two-finger twist:** steps through 28 voice archetypes (`Genome.VOICES`: bell, pluck, pad, reed, singer, choir, lead, organ, glass, mallet, harp, bowed, pipe, struck, bass, sub, grit, foldlead, grain, drum:kick/snare/hat/tom/kit, drone, wind, shimmer, movepad);
   - **scribble:** roughness (fold, noise, saturation);
   - **≥3 taps:** motif rhythm;
   - **3-finger tap:** undo.
   - After every touch the clay plays a short phrase.
2. **The 9 engines** (`RS.ENGINES`):
   - `eVA`: virtual analog, saw ↔ pulse width;
   - `eFM`: frequency modulation, 2–4 operators;
   - `eWT`: wavetable morph sine → tri → saw → square → formant;
   - `eADD`: additive, 8 partials with tilt and inharmonic spread;
   - `ePD`: phase distortion (Casio CZ style);
   - `eFOLD`: wavefolder into a low-pass gate;
   - `eRING`: ring/AM;
   - `eGRAN`: granular, from the world's own recent sound;
   - `eNRES`: noise into a resonator.
3. **Not counted in the 9, but where acoustic sections really live:**
   - **Physical models:** exciter (`pluck strike scrape bow blow voc`) × resonator (`str modal membrane tube form`), blended by `engMix`.
   - **Drum types:** kick/snare/hat/tom/kit.
   - **The vocal tract** (`tract.js`, Pink-Trombone-style, genes 168–171).
4. **Role and register are already genes:** g[124] (role) and g[123] (register). Body size also moves register (`Mo.regOct`).

---

## (a) Timbre dimensions: missing, redundant, and gesture conflicts

**Missing or weak:**

1. **Velocity response (missing).** Touch strength today only changes loudness (`gain × (.35 + .65·vel)` in `inst.js`). In real instruments a harder hit is also **brighter** and has a stronger **attack noise**.
   - Proposal: one clay control, "touch response" (0–1). It sets how much filter cutoff and noise rise with velocity: e.g. cutoff × 2^(1.5·resp·(vel−.5)).
   - Without this, dynamics from conductors, Q and cultures sound like a volume knob.
2. **Formants: vowel, not just size.** A **formant** is a fixed resonance peak that gives voices and winds their "vowel" (ah, ee, oo). Today one gene scales F1 and F2 together (F2 is always 3 × F1), so "ah" and "ee" can't be told apart.
   - Proposal: a 2-D vowel control (F1 open/closed × F2 front/back) for the `form` resonator and `eWT`'s formant slot.
   - For tract voices, map it to tongue position instead.
   - This is essential for voice/choir, double reeds and brass "wah".
3. **Onset transient for non-drums (weak).** The **transient** is the short noise at a note's start (pipe chiff, pick scrape, bow scratch, brass "blat"). The `transient` gene only acts on drummers. The noise gene sounds through the whole note.
   - Proposal: an "onset bite" parameter, a noise burst of 5–60 ms plus a pitch blip (the existing `penv`), separate from steady breath noise.
4. **Decay vs sustain is not tied to the exciter.** Struck and plucked sounds die away naturally and can't sustain; bowed, blown and sung sounds sustain as long as they are driven. `inst.js` already cuts sustain for percussive voices, but then gives any engine-heavy voice at least .25 sustain.
   - Proposal: let the excitation class decide (proposal 9). Struck/plucked: sustain 0 and a "ring time" control. Driven: sustain + release.
   - A plucked voice should never hold a pad note. The role system must then give a plucked pad tremolo or rolls instead (the `trem`/`techRate` genes exist).
5. **Odd/even balance (implicit only).** Clarinet-like sounds (closed tube, mostly odd partials, hollow) differ from sax/oboe (conical, all partials, reedy). Today this falls out of the tube's inverted feedback, `eVA` pulse width and `eWT` square.
   - Proposal: one explicit "hollow ↔ full" control, mapped per engine:
     - pulse width toward 50% (`eVA`);
     - odd-only partials (`eADD`);
     - FM ratio 2 (`eFM`);
     - tube vs string (physical).
6. **Stiff-string inharmonicity (missing).** **Inharmonicity** means overtones sit off whole-number multiples. Bars, bells and membranes follow the V08 P laws:
   - Euler-Bernoulli bar ratios 1 : 2.756 : 5.404 : 8.933;
   - Bessel membrane ratios 1 : 1.594 : 2.136 : 2.296.

   The `inharm` gene blends toward these, which is correct. But a stiff string (piano, steel guitar) stretches its partials slightly *upward*, as k·√(1 + B·k²), and the waveguide string can't do that; only `eADD` spread can.
   - Proposal: keep one "stiffness" control that means bar/bell for `modal` and stretched partials for `str` and `eADD`. Cap it as `S.timbre` already does.
7. **Vibrato vs tremolo naming.**
   - **Vibrato** = pitch wobble (`lfoP`). **Tremolo** = loudness wobble (`lfoA`). The `trem` gene, though, is *tremolo picking* (fast re-striking).
   - The `lead` archetype sets `lfoA` .45–.95 (strong loudness wobble). A singer or violin lead mostly uses pitch vibrato, so this is worth checking by ear.
   - Proposal: one "wobble" control with a pitch ↔ loudness blend, a depth and a delayed onset (real vibrato starts ~0.3 s into a note).
8. **Body size vs register (already linked, keep it).** Pinch moves size *and* register together. That matches "sound from the body" (3:41) and MUSIC_THEORY §4.5.
   - Proposal: register may move within ±1 octave of the size-derived pitch, never independently. A tiny ohm can't be a tuba.

**Redundant (double-counting):**

9. **"Brightness" is set by at least 8 genes:** `cut`, `fenv`, `addTilt`, `fmI`, `pdAmt`, `fold`, `wtPos`, `sat`.
   - **Spectral tilt** (how fast partials fade with height) and **filter cutoff** (where a filter starts removing them) both mean "brighter" to the ear.
   - B2 (edge sharpness) adds a ninth path, and today's edge push/pull already moves formant, resonance and pulse width.
   - Proposal: **one** clay brightness control writes a single target. Each engine translates it to its own knob (tilt for `eADD`, index for `eFM`, fold for `eFOLD`, cutoff otherwise). Gene variety stays as small offsets around the target, so ohms still differ (Wilbow 12:06/12:07: random spread).
10. **Roughness vs breath:**
    - scribble already does fold + noise + saturation;
    - B6 (gentle stroke vs scribble = breath/noise) overlaps it;
    - B7 (pinched points = inharmonicity) overlaps lumps, which already add inharmonicity .4.

    Proposal: three separate meanings. **Grit** (distortion/fold) = scribble. **Air** (breath noise) = gentle stroke. **Clang** (inharmonicity) = pinched points. Each writes only its own genes.

**Gesture conflicts in the B1–B16 brainstorm:**

11. **B1 rub = bowed *and* B9 rub = vibrato.** Proposal: rub only *selects* bowed on the first touch. Vibrato is a slow side-to-side wiggle while holding (shape: wobble) or a later "wobble" ring.
12. **B1 tap = percussion vs the existing ≥3 taps = motif rhythm,** and a single tap on empty space hatches the clay. Proposal:
    - the first single tap selects percussion;
    - later taps (≥3) still set the rhythm;
    - excitation is chosen *only* by the first touch, and the 28-voice twist stays as the fine step inside that class.
13. **B10 two-finger spread = width vs pinch = size/register.** It is the same gesture with the same start condition. Proposal: width = two-finger *twist* while the second finger is still. Or retire twist-steps once B1 exists, and give twist to width.
14. **B4 pulled tail = sustain vs strand drag = limb.** Same gesture. Proposal: a tail is a strand pulled from the *back* (the side away from the ohm's facing), or limbs are dropped from clay. Wilbow should choose.
15. **B5 hollow dent vs edge push** (push already smooths bumps and can remove a segment). Proposal: a dent = a push held still ≥ .4 s (the clay hold ring). It sets body resonance (`bodyRes`/`reso`).
16. **B8 pinch = register** matches today. Keep it, but within proposal 8's body range.
17. **B16 "voice fixed for life after hatching"** is stronger than Wilbow's words. 3:38 allows change "directly … by the player". Proposal:
    - fixed against other ohms and cultures;
    - re-shapeable only by the player (re-entering clay from the inspect ring);
    - items modulate predictably (3:41).

    Flag for Wilbow.
18. **B14 untouched = fully random** matches the 12:07 approval (`spinDefault`). Keep it.

    **But:** `spinDefault` keeps the physical share at ≤ .3 (`engMix`) and caps percussion at .45. So random births rarely sound like real strings, winds or drums.
    - Proposal: random births deal over **sections** (b), not only over the 9 engines.

---

## (b) Orchestra and band sections → the code's sound sources

**First-touch excitation classes (B1, revised):** tap = struck, flick = plucked, rub = bowed, press-drag = blown, squeeze = voiced.

| # | Section | Main source in code | Best engine colour (second engine) | Gap |
|---|---|---|---|---|
| 19 | Strings, bowed (violin…bass) | physical `bow` × `str` | `eVA` saw, `eWT` | formant body resonance (vowel control, 2); vibrato onset delay (7) |
| 20 | Plucked / guitar / harp | `pluck` × `str` | `eADD` (stiff), `ePD` | stretched partials (6); a bass guitar needs a darker, low-passed pluck |
| 21 | Woodwinds (flute, clarinet, oboe/sax) | `blow` × `tube` | `eWT` formant, `eADD` odd | chiff transient (3); odd/even (5); separate breath noise |
| 22 | Brass | `blow` × `tube` + `form` | `eFM` (index rises with velocity), `eVA` saw | **velocity → brightness (1) is what makes brass sound like brass**; slow "blat" attack |
| 23 | Pitched percussion (marimba, vibes, glock, bells) | `strike` × `modal` (bar/bell ratios) | `eFM` bell, `eRING` | fine. Vibes need tremolo (7) |
| 24 | Unpitched percussion | drum types kick/snare/hat/tom/kit | `eNRES` | world hand drums (tabla's harmonic ratios exist in `perc`) |
| 25 | Keys (piano, organ, e-piano) | piano = `strike` × `str`; organ = `eADD`; EP = `eFM` | — | piano needs stiffness (6) + velocity brightness (1); organ is fine |
| 26 | Voice / choir | `tract.js` (genes 168+), or `voc` × `form` | `eWT` formant | vowel control (2); choir = unison width (B10) |
| 27 | Synth / electronic | `eVA eFM eWT ePD eFOLD eRING eGRAN` | — | fully covered |
| 28 | World: bars/gongs, reeds, drones | gong = `strike` × `modal` metal/bell; free reeds (sheng, harmonium) = `blow` × `tube` + `eADD`; drones = any sustained voice with `drone` gene | `eRING` (gong shimmer), `eGRAN` | gongs need a slow pitch bend; sitar buzz (jawari) is missing. It could be `eFOLD` at low amount on a plucked string |

29. **Gaps to note:**
    - jawari/buzz bridge;
    - stiff-string piano;
    - vowel choice;
    - brass velocity bloom;
    - delayed vibrato;
    - double-bass-range acoustic strings, limited by small bodies (8).

    All are timbre parameters, not new engines. **No new engine is needed.**

---

## (c) Role defaults (range, density, rhythm placement, sustain, mix band)

- **Role names reconciled.** Builder: bass, comp, lead, counter, pad, drone, groove, texture. Code: `melody/solo, counter, harmony, comp, bass, drone, pulse:*, answer`. PATTERN_LIBRARY: `bass, comp, lead, texture, harmony, pulse:time, pulse:colour`.
- **V08 Q bands:** 1 <80 Hz, 2 80–160, 3 160–320, 4 320–640, 5 640–1280, 6 1280–2560, 7 >2560.
- All ranges stay inside the E1–C7 soft limit (41.2–2093 Hz, MUSIC_THEORY §4.1) and inside the ohm's body range (8).

| # | Role (builder → code) | Register | Q band(s) | Density (notes/bar, 4/4) | Rhythm placement | Sustain |
|---|---|---|---|---|---|---|
| 30 | bass → `bass` | E1–E3 (41–165 Hz) | 1–2 | 2–8 | downbeats, anticipations (tumbao) | short–medium |
| 31 | lead → `melody`/`solo` | C4–C6 (262–1047) | 4–5 | 4–12 | phrases with rests | medium, vibrato |
| 32 | counter → `counter`/`answer` | G3–G5 | 4 (avoid lead's band in its busy slots) | 2–6 | in the lead's gaps | medium |
| 33 | comp → `comp`/`harmony` | C3–C5 | 3–4 | 4–16 short chords | off-beats, "and"s | short |
| 34 | pad → `harmony` (texture voice) | C3–C5, wide | 3–5 | 1–2 | bar starts, held | long attack + release |
| 35 | drone → `drone` | E1–C3 (tonic + fifth) | 1–3 | 0.25–1 | cycle start | continuous |
| 36 | groove → `pulse:time/low/colour` | kick band 1, snare 3–4, hats 7 | per drum | 4–16 | the timeline / grid | percussive |
| 37 | texture → PATTERN_LIBRARY `texture` | any; prefers 6–7 (air) or 1 (rumble) | sparse | 0–4 | free, weak steps | long/noisy |

38. **Role defaults are weights, not locks** (same spirit as the 4:12 rule):
    - the role gene g[124] picks a default;
    - Q (V08) may still move an ohm one octave or thin it;
    - the clay only sets the starting role.
39. **B11 (height = role) vs B8 (pinch = register).** Proposal: height on screen while shaping picks the role (low = bass/drone, high = lead/texture). The role then sets the *register centre*, and pinch/size sets the body range around it. One of the two must give way inside the body range; size wins (3:41).
40. **B12 (shape suggests role):** keep it as a weight only (e.g. long and smooth → pad/drone ×1.5). Never a rule.
41. **B13 (fill missing roles nearby):** good, and cheap. Read the nearest jam's cached Q band summary (V08 Q) once at hatch and add +.3 to the weight of an empty band's role.

---

## (d) Conflicts with MUSIC_THEORY.md and PATTERN_LIBRARY.md

42. **"Notes and playing style only"** (both docs, cultures and jams) is not broken by the clay. The clay is the player directly setting the voice, which 3:38 allows. The docs should add one line: "timbre is set by the player at clay and by body genes; cultures and jams never write it."
43. **Role names** differ across three places (table above). Proposal: one shared list in PATTERN_LIBRARY §1.1: `bass, lead, counter, comp, pad, drone, pulse(groove), texture`, with the code aliases noted.
44. **E1–C7 soft limit:**
    - a lead range of C4–C6 and a bass range of E1–E3 fit;
    - piccolo, glockenspiel and the whistle overtone of throat singing go above C7 (2093 Hz);
    - proposal: they reach band 7 via partials and brightness, not via the fundamental. The limit stays.
45. **Cultures as weights** (PATTERN_LIBRARY §2.0): cultures must not pick or change an ohm's section or timbre. They may *weight which roles* a culture's jam asks for (e.g. a raga jam wants a drone), and that is still notes only.
46. **Overtone singing (Q1 in PATTERN_LIBRARY):**
    - the *notes* (harmonics 6–12 over a drone) are open to any ohm;
    - the *sound* needs the tract voice with a narrow formant (2). The clay squeeze → voiced class plus the vowel control could produce it;
    - proposal: yes, through clay only, never through culture.
47. **V08 P laws:** the clay's inharmonicity control must use the same Euler-Bernoulli and Bessel ratios already in `inst.js` (they match). Pitch from body size follows the same "bigger = lower" rule as drawn shapes.

---

## (e) Cost

48. **All clay controls are computed once per touch** (clay touch → genes → `RS.Inst.fromGenome`), and again at hatch. That is already the case. The new controls (1, 2, 3, 5, 7) are a few extra numbers in `P`.
49. **Per note, on the audio thread, only for audible voices:**
    - velocity → brightness is one multiply on the cutoff, once per note;
    - the onset burst is a short noise gate;
    - vowel formants are the existing 2 filters with independent coefficients.

    None of this adds a per-sample loop over partials.
50. **Off-screen:** nothing new. Voices are not rendered, and the role weight from (41) is read once at hatch.

---

## Open questions for Wilbow

51. **Tail vs limb (14):** should a pulled strand still make a limb, or become the sound's tail (sustain)?
52. **Re-shaping (17):** may a hatched ohm go back into clay by the player's choice? Your 3:38 words suggest yes.
53. **Random births by section (18):** should untouched clay deal over the ~10 sections (more real strings, winds and drums), or stay uniform over the 9 synth engines as approved at 12:07?
54. **Twist after B1 (12–13):** keep twist as the 28-voice step, or give it to width?
55. **Velocity response (1):** add it for all voices (biggest single realism gain for brass, piano and drums)?
