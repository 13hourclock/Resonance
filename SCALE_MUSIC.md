> Read GOAL_AND_FEATURES.md first.

> **Correction (Wilbow, Oct 24 2026, 10:26 PM MDT): "Gnome was just voice chat mistaking ohm".** In the 9:24 PM lore call, "gnome" means "ohm": an ohm tells the origin story, and there is no gnome character. Read every "gnome" below as that storyteller ohm.

# SCALE_MUSIC.md: music at every zoom scale, the om, and musical harmony between layers

**Status: PROPOSAL. Not approved, nothing built.** Written by Resonance Music Theory, 10:05 PM MDT Sat Oct 24 2026.
Docs only. No code, tests or other bots' docs were changed. MUSIC_OVERHAUL.md belongs to Resonance and is not touched here.

## 0. Why this doc exists

Wilbow's words (verbatim, Resonance chat, Sat Oct 24 2026, MDT):

1. 10:00 PM: "Snapping into ohms should feel like a directional zoom with layers you snap into, same with space and all scales. Zoom into see bugs that are part of the same overall system, the planets harmony down to atoms and wavelengths on the universal pulse. Ohms modulate areas and planets modulate galaxies. We need to rethink how the sound engines may need to work"
2. 10:02 PM: "The goal of the game is to bring harmony back". First logged as the CORE GOAL; at 11:49 PM he said "Its a lore idea and spiritual term that also is a musical term youre going to have to use some inference". So it carries three meanings at once (lore, spiritual, musical) and is not a rule. This doc covers only the musical side, as a proposal (MISREADS.md).
3. 10:02 PM: "The journey ohm". 10:03 PM card answer: "The game's title". 10:03 PM: "Like an om in spirituality. Use this philosophy in the design". (WILBOW_VERBATIM.md 1355–1360. No in-app rename until he approves one.)
4. 9:52–10:02 PM priorities (DECISIONS.md 1200–1210): scale (many ohms and elements) first, then always runs well, then beauty. Performance is a hard gate. Zoom is continuous, with no view switching.
5. 9:24 PM lore call (DECISIONS.md:1186, WILBOW_VERBATIM.md:1311), quoted in full in §6.6. Recorded outcome: lore and design direction only; the gnome is wordless; nothing built until approved.

Note: THREE_MIGRATION.md was asked about but does not exist anywhere on the box (searched the whole filesystem at 10:02 PM MDT). This doc works from the WILBOW_VERBATIM.md and DECISIONS.md records instead.

What this doc proposes, in one line: **one pulse and one fundamental tone (the "om") sit under everything; every zoom layer is a slower or faster multiple of that pulse and a partial of that tone; the game is the journey of bringing every layer back into resonance with it.**

### 0.1 Words used in this doc (each explained once)

1. **Pulse**: the steady beat everything counts against, like a heartbeat.
2. **Universal pulse (U)**: the one master clock of the whole game. It has a tempo (speed), a meter (how beats group) and a phase (where in the count we are right now).
3. **Phase point**: a moment where two clocks are both at the start of a count. If two clocks always meet at phase points, they are **phase-locked**.
4. **Subdivision**: splitting a beat into faster parts (2, 3 or 4 per beat). **Augmentation**: grouping beats into slower units (bars, phrases, sections).
5. **Hypermeter**: the "meter of the meter": bars grouped into 4s and 8s, sections grouped into larger arcs.
6. **Tala**: the Indian rhythmic cycle (for example teental, 16 beats). Its first beat, **sam**, is both the end of one cycle and the start of the next.
7. **Colotomy** (gamelan): layered gongs, where bigger, slower gongs mark the ends of the cycles of smaller, faster ones. The big gong lands at the END of every inner cycle.
8. **Polymeter**: two cycles of different lengths running together (for example 3 against 4).
9. **Tonic**: the home note of a key. **Mode**: which scale is used on that tonic (major, Dorian, a raga, a maqam...).
10. **Frame**: one jam's shared key, tuning, tempo and cycle (TRADITION_REFERENCE.md §0).
11. **Fundamental**: the lowest tone of a sound. **Partials** (or **harmonics** when they are whole-number multiples) are the higher tones inside it: f, 2f, 3f, 4f... Together the harmonics form the **harmonic series**.
12. **Cent**: 1/100 of a piano semitone. 1200 cents = one octave. 5 cents is a barely-heard difference; 30 cents is clearly "off" in a sustained chord.
13. **12-TET**: twelve-tone equal temperament, the piano tuning: every semitone exactly 100 cents.
14. **Just interval**: an interval made of a simple whole-number ratio, like 3:2 (pure fifth) or 5:4 (pure major third). Its notes share partials, which is what "consonant" means acoustically.
15. **Beating**: when two tones are close but not equal, the sound pulses louder and softer at a rate of |f1 − f2| times per second. Slow beating sounds like a shimmer; fast beating sounds rough.
16. **Roughness**: the buzzy, harsh quality of many fast beats at once.
17. **Pitch-class histogram**: a 12-slot (or 24-slot for quarter tones) count of how often each note name was played, regardless of octave. It is a cheap fingerprint of a key.
18. **Bed**: a cheap, soft summary sound standing in for a whole layer that is not in focus.
19. **Focus layer**: the layer the camera is zoomed into; it gets the full, detailed synthesis.
20. **Hysteresis**: needing a bigger change to switch state than to stay, so things do not flicker back and forth.
21. **Smoothing (exponential)**: each update moves a value only a small fraction toward its target, so it changes slowly. The **time constant** is about how long it takes to move two-thirds of the way.
22. **Drone**: a sustained tone held under music (like the Indian tanpura).
23. **Om**: in this doc, the design idea of one fundamental vibration from which everything grows (see §7 and the Respect notes, §7.6).

## 1. The universal pulse

### 1.1 One master clock

1. The whole game runs on one clock, **U**: tempo `U.bpm`, meter (4 beats), phase origin `U.t0`.
2. `U.t0` is simply when the world's clock starts (for example, world creation). Every count in the game is "beats since the clock started". *(Earlier this said `U.t0` was the stick-on-rock strike; withdrawn. The story is lore only, Wilbow 11:21 PM and 2:44 AM.)*
3. Proposed tempo: **60 beats per minute** (one beat per second). See §7.2 for why this can come straight from the fundamental tone (poetic option).
4. Nothing ever changes U itself. Every layer is U multiplied or divided by simple numbers.
5. Cost: one number and one subtraction. Any clock in the game is `beats = (now − U.t0) × U.bpm / 60 × ratio`.

### 1.2 The layer ladder (faster at the bottom, slower at the top)

Each layer's "beat" is a whole-number grouping (augmentation) or splitting (subdivision) of the layer next to it. All counts start at U's phase points.

| # | Layer | Its musical unit | Typical length | Example |
|---|---|---|---|---|
| 1 | Atoms / wavelengths | partials of a tone (audio rate) | 1/60 s – 1/5000 s | the 3rd harmonic of an ohm's note |
| 2 | Micro-life (bugs) | fast subdivisions of the jam's step: ×2, ×3, ×4 | 30–120 ms | a cricket chirping 32nds |
| 3 | Ohm | step and beat | 0.12–1 s | one ohm's hit |
| 4 | Jam | bar and cycle (tala, clave, gongan) | 2–16 s | teental 16 beats |
| 5 | Region / area | song sections (8–32 bars) and whole songs | 30 s – 4 min | verse, chorus, alap |
| 6 | Planet | hypermeter: groups of sections; the planet's day | 4–16 min | one day-night |
| 7 | System | the meeting point of its planets' cycles | 16–64 min | all planets' days line up |
| 8 | Galaxy | a very slow swell | hours of play | one "breath" |
| 9 | Universe | the pulse itself, felt as a heartbeat | 1 s | U |

Notes:

1. The universe layer is both the slowest idea and the simplest sound: just the heartbeat of U. The loop closes: zoom all the way out and you hear the same pulse the lore says the stick first struck (lore image only, not a mechanic).
2. Planet day length should be a whole number of U bars (for example 256 bars = 17 min 4 s at 60 BPM) so day and music share phase points. Proposal only; the current day length in code was not checked.

### 1.3 Planet tempo as simple ratios of the pulse

1. A planet's base tempo = `U.bpm × r`, with r from a small set of simple ratios: **1/2, 2/3, 3/4, 1, 4/3, 3/2, 2, 9/4, 8/3, 3** (at U = 60: 30, 40, 45, 60, 80, 90, 120, 135, 160, 180 BPM).
2. These cover the TRADITION_REFERENCE tempo ranges: house 118–128 → 120; techno → 135; drum and bass → 160 or 180; reggae → 60, 80 or 90; bossa → 120 or 135; slow alap/vilambit → 30–45.
3. A jam on a planet may use the planet ratio, or ×2 or ×1/2 of it (double-time and half-time keep phase lock for free).
4. **Why simple ratios**: if a jam's tempo is p/q of U, then every q beats of U equal exactly p jam beats. The two clocks meet at phase points every q U-beats, so zooming between layers can always crossfade on a shared downbeat.
5. Phase points for whole cycles: a cycle of N jam beats lasts N·q/p U beats. The cycles re-meet U on a downbeat every k cycles, where k = p / gcd(N·q, p). Example: teental (N = 16) at r = 3/2 (90 BPM): k = 3, so every 3 cycles (48 jam beats = 32 U beats) the sam lands exactly on a U downbeat. A rupak cycle (N = 7) at r = 2: k = 2.
6. This "great cycle" (k cycles) is where outer layers place their accents (§1.4).

### 1.4 Nesting: endings, not beginnings (as in gamelan)

1. Borrowed from gamelan colotomy: each slower layer marks the **end** of the faster layer's cycle, the way the big gong lands on the last beat of every inner cycle.
2. Borrowed from tala: that ending is also the next beginning (sam). So layer accents are "landings".
3. Concretely:
   1. Jam: its cycle end (sam / gong / clave turnaround) is the jam's landing.
   2. Region: its bed changes chord, and its distant groove accents, only on a jam landing that is also a phrase end (8 or 16 bars).
   3. Planet: its hum accents (a soft low swell) land on section ends that are also great-cycle points.
   4. System: its chord shifts only when two or more planets' landings coincide.
   5. Galaxy: its swell peaks only on a system landing.
4. Result: the higher you zoom out, the rarer and heavier the accents, and they always land together, like the largest gong.

### 1.5 Polymeter only where a tradition needs it

1. Usually a jam shares one meter at a time, which keeps the beat clear, but it can change meter as it goes.
2. Allowed polymeter: where the tradition itself has it (West African 12/8 bell against 4 dance beats, Afro-Cuban 6/8 against 4/4, gamelan levels running at 2× and 4× the balungan, Balkan aksak cycles over a steady drone).
3. Cycles, however odd, tend to re-meet U at their great-cycle point (1.3 item 5), which makes layers line up audibly. Aksak cycles (7, 9, 11 beats) lock at their cycle ends, never mid-cycle.

### 1.6 Micro-life on the subdivisions

1. Bugs and other micro-life play only subdivisions of the nearest jam's step: ×2 (32nds), ×3 (triplets), ×4.
2. They use the jam's scale, high register (MIDI 96–108, above the main melodic band), very quiet.
3. Real-world model for how they lock: synchronising fireflies and chorusing crickets. Each bug keeps its own phase and nudges it a little toward the pulse every chirp (the Kuramoto coupling idea: phase change = own speed + K × sin(pulse phase − own phase)). Cheap: one sine per bug per chirp, only on-screen.

### 1.7 Tap tempo and the shared frame

1. A jam shares a beat, so its `t0` should be a U phase point, putting every jam on the universal grid. Keys, chords and sounds inside a jam move freely: a jam can switch keys, contain many chords and hold many sounds. (Corrected: the earlier 'one frame per jam' reading was fudged.)
2. Tap tempo (approved 3:29 PM MDT Fri Oct 23 2026: tapping the call spot several times sets an ohm's or group's tempo). Proposal: the tapped tempo is kept as the player tapped it for one cycle, then **glides** to the nearest allowed ratio (1.3) over the next 2 bars, and the first beat is moved to the nearest U phase point. If the nearest ratio is more than 6% away, the player's tempo is kept, and the jam is simply "not yet locked" (a harmony opportunity, §6), not corrected. Decision D3.
3. The existing ≤3% regional tempo lean (R3.4, R3.17) would break exact ratios. Proposal: replace it, inside phase-locked play, by a choice among the allowed ratios; keep it as-is elsewhere. Decision D4.
4. Painted notes keep human-feel timing (8:45 PM: "Instead of a grid make the notes more organic and have movement"). Phase lock is measured only at cycle landings on the clock, never per painted note, so organic timing is untouched.

## 2. Harmony flows down; summaries flow up

"Ohms modulate areas and planets modulate galaxies" (10:00 PM). Two directions, both gentle.

### 2.1 What flows down (a suggestion, never an order)

1. **Universe**: the fundamental tone F0 and U (§7). Fixed for the whole game.
2. **Galaxy**: a reference partial of F0 (its "home harmonic") and the tuning reference. In practice: which harmonic-series root the galaxy's beds are built on.
3. **System / planet**: the planet's tradition (one per planet for now) and a planet tonic that is a simple ratio of the galaxy's root: a fifth (3:2), a fourth (4:3), a major third (5:4), a whole tone (9:8), and so on (§7.3). Neighbouring planets in a system should sit close on the circle of fifths (the ring of keys where each step is a fifth, so neighbours share 6 of 7 notes).
4. **Region / area**: the mode and the section harmony (which chord the region bed holds this section), chosen from the planet tradition.
5. **Ohm jam**: the living harmony of the jam: its current key, chords and sounds, which move as the ohms play. There is no leader. Changes spread through the jam from whichever ohms start them, and a jam can switch keys and hold many chords.
6. **Strength**: each step down is a weight, not a rule. It only affects (a) the beds, (b) world voices (wind rocks, reeds, drips), (c) tie-breaks when a new jam picks a frame, (d) the starting key gene of newborns, at the same small chances as V08_SPEC §C. The world only lightly influences an ohm's own tuning and key (t145). Ohms change mostly through playing, learning and the player.
7. What exists today: a planet's root comes from its palette hue (palette.js:53) and roots are 12-TET from A440 (`M.rootHz = 110 × 2^(root/12)`, music.js:25); a star's colour comes from its Wien peak folded into visible light (music.js:70–71). The proposal keeps those as the "colour" of a planet and adds the ratio relation to the galaxy root as the "key" (Decision D6).

### 2.2 What flows up (cheap summaries)

Each layer keeps a tiny record of the layer below. No audio is analysed; the numbers come from the notes the game already chose.

1. **Jam summary** (per bar on-screen, per song or per minute off-screen): pitch-class histogram (12 or 24 slots), tonic, mode id, tempo ratio, energy (0–1, from loudness and density), density (notes per beat), song stage (EXPLORING, GROOVING, FORMING, SONG, CODA), harmony value (§6.3).
2. **Region summary** = weighted average of its jams' summaries. Weight = members × stage weight (EXPLORING .2, GROOVING .4, FORMING .6, SONG 1, CODA .8).
3. **Planet summary** = weighted average of its regions (weight = region size × activity).
4. **System summary** = its planets' tonics (each one partial of the system chord) and energies.
5. **Galaxy summary** = weighted average of its systems.
6. Each record is about 20 numbers (under 100 bytes).

### 2.3 Drift: slow smoothing, rate limits, hysteresis

1. The upper layer's state moves toward the summary of its children with exponential smoothing:
   1. Region toward its jams: time constant about 2 minutes.
   2. Planet toward its regions: about 15 minutes.
   3. System toward its planets: about 45 minutes.
   4. Galaxy toward its systems: about 3 hours of play.
2. **Rate limits**: a region may change its bed chord at most once per phrase, and its tonic at most once per 2 songs; a planet tonic at most once per planet day; galaxy root effectively never during a session (the om stays put).
3. **Hysteresis**: a layer's tonic only changes when the new tonic's share of the smoothed histogram beats the current one by at least 0.15, and has done so for 2 checks in a row.
4. Tonic change itself happens at a landing (1.4), as a pivot modulation (the existing `M.modulate` pivot logic, music.js:39).
5. This is a summary of what ohms are playing; it does not itself change ohms. Ohms change through learning from each other, the player and items.

### 2.4 Weights, one tradition per planet, regions blending

1. One tradition per planet for now (TRADITION_REFERENCE §0 rule 6).
2. Cultures add variance and never limit what ohms can play. Regions within a planet blend gradually into each other by weights.

### 2.5 How a jam joins the flow

1. When a new jam forms, its starting key and tempo come from the ohms who start it. The down-flow adds only a tie-break: if two candidate frames are close, prefer the one nearer the region's tonic (V08_SPEC §C rule ii).
2. The jam's `t0` is snapped to the next U phase point (1.7 rule 1). This is free and inaudible.

### 2.6 Blends come back (region-ready, not built)

Wilbow, 8:56 PM MDT: "Eventually I want the planets much bigger with regions of blending traditions between but it seems to have been forgotton".

1. On bigger planets, each tradition owns a region; between two regions lies a **border zone**.
2. Inside the zone, every value is interpolated by distance: tradition weights (for example 70% maqam, 30% flamenco), tempo ratio (pick the ratio both regions share, else the nearer one), tonic (choose a tonic both scales contain; else hold the drone on the shared fifth).
3. Never a hard switch: crossing the zone, the bed morphs over at least one phrase.
4. Blend material is the parked PATTERN_LIBRARY §2 fusion material. Nothing is unparked until Wilbow says so.

## 3. Summary beds per layer, and zooming between them

"We need to rethink how the sound engines may need to work" (10:00 PM). Proposal: **the focus layer is synthesised in full; every farther layer is a cheap bed; zooming crossfades between them.**

### 3.1 The beds

| # | Layer heard as a bed | What it sounds like | Voices | Level vs focus |
|---|---|---|---|---|
| 1 | Region | soft pad or drone of its current chord, in the tradition's tuning, plus its pulse as a muffled distant groove (low-passed kick and one percussion part) | 3–4 pad + 2 groove | −12 dB |
| 2 | Planet | hum on tonic + fifth, coloured like the tradition's timbre (bright buzz for a sitar planet, metallic shimmer for gamelan, breathy for a flute tradition), with slow accents on cycle landings | 2–3 | −18 dB |
| 3 | System | one chord made of the planets' tonics, each planet one partial | 1 per planet, ≤ 8 | −24 dB |
| 4 | Galaxy | a very slow harmonic-series swell on its root (harmonics 1–8 fading in and out) | 4–6 | −28 dB |
| 5 | Universe | near-silence, with U as a faint heartbeat (a soft low thump on beats 1 and 3) | 1 | −36 dB |

Layers inside the focus (smaller than it) are not beds: micro-life plays only when in view, atoms only when zoomed to them.

### 3.2 Bed rules

1. **Tuning follows focus**: a bed always uses the focus layer's tuning and tonic, or a consonant relation to it (octave, fifth, fourth). On a 12-TET planet the beds are rendered in 12-TET; on a maqam planet in the maqam's cents.
2. **Ducking**: beds drop 4–6 dB while the focus layer plays, and come back between phrases.
3. **Frequency slotting** (each layer gets its own band so they do not mask each other):
   1. the main melodic band (about MIDI 60–88, 260–1320 Hz) is kept for the focus layer;
   2. beds live below MIDI 55 (under 200 Hz) and a thin "air" layer above MIDI 96 (over 2 kHz);
   3. a gentle dip of 6–9 dB in each bed across 300 Hz – 2 kHz.
4. **Beds are made of the same numbers as the summaries** (2.2): the region bed's chord is the top 3–4 slots of the region histogram; the planet hum is the planet tonic; the system chord is the planets' tonics. So a bed is never "made up"; it is what that layer is doing, blurred.

### 3.3 Zooming: snap layers with phase-aligned crossfades

1. Pictures move at once and continuously (no view switching). Sound moves at the next landing of the layer you are entering:
   1. into a jam: next beat (at most 1 beat wait);
   2. into a region: next bar;
   3. into a planet: next phrase (8 bars);
   4. into a system, galaxy or universe: next great-cycle point, or 8 bars at most.
2. **The morph**: the bed you zoom into becomes the detailed music, because it was built from that music.
   1. Zooming in: the bed's low-pass filter opens (about 400 Hz up to full over 1–2 bars), its sustained chord splits into the real instruments' notes, and the groove comes forward from muffled to clear.
   2. Zooming out: the reverse; the detailed music condenses into a sustained chord, the filter closes, the groove recedes.
   3. Equal-power crossfade (sum of squared gains = 1) so loudness does not dip.
3. Faster zoom gestures shorten the morph (down to 1 beat); a held zoom stops the morph halfway, giving a blend of two layers.
4. Pitch stays continuous during the morph because both layers share tonic and tuning (3.2 rule 1).
5. A small rule against muddiness: at most 2 bed layers are heard at full bed level at any time (the next 2 out from focus); further beds are at −40 dB or muted.

## 4. The atoms / wavelengths layer

Zoomed all the way into one ohm's sound, the player sees and hears its partials. This is where "harmony" stops being a word and becomes something you can see.

### 4.1 What partials look like by body type

| # | Body | Partials (× the fundamental) | Harmonic? |
|---|---|---|---|
| 1 | string, voice, bowed or blown pipe | 1, 2, 3, 4, 5, 6... | yes |
| 2 | clarinet-like closed pipe | 1, 3, 5, 7... (odd only) | yes |
| 3 | stiff string (piano-like) | slightly stretched: n·√(1 + B·n²) | nearly |
| 4 | free bar (stick, xylophone key, glockenspiel) | 1, 2.76, 5.40, 8.93 | no |
| 5 | circular membrane (drum head) | 1, 1.59, 2.14, 2.30, 2.65, 2.92 | no |
| 6 | bell | 0.5, 1, 1.2, 1.5, 2 (hum, prime, minor-third tierce, fifth, nominal) | partly |
| 7 | rock (irregular solid) | dense, irregular, fast-decaying | no |

The game's instruments already describe sounds as `modes` with frequency and amplitude (for example app.js:110, sound.js:51), so the partial list is mostly already known per voice.

### 4.2 Making tuning visible

1. **Shared partials = consonance**: draw each note's partials as a ladder of lines. When two notes form a just interval, some lines coincide exactly (pure fifth 3:2: the 3rd partial of the lower note = the 2nd partial of the upper).
2. **Near-misses show as beating**: when lines almost coincide, draw them shimmering at the beat rate |f1 − f2|, and play the beating.
   1. 12-TET fifth C4–G4: 3 × 261.63 = 784.88 Hz vs 2 × 392.00 = 783.99 Hz → 0.9 beats per second (a slow, gentle wave). The 12-TET fifth is 2.0 cents narrow of 3:2.
   2. 12-TET major third C4–E4: 5 × 261.63 = 1308.1 Hz vs 4 × 329.63 = 1318.5 Hz → about 10.4 beats per second (a fast flutter). The 12-TET third is +13.7 cents above 5:4.
3. **Cents ruler**: a small ruler under each partial showing its distance from the 12-TET note:

| # | Harmonic (octave-folded) | Cents above the fundamental | Nearest 12-TET | Deviation |
|---|---|---|---|---|
| 1 | 3 | 702.0 | fifth (700) | +2.0 |
| 2 | 5 | 386.3 | major third (400) | −13.7 |
| 3 | 7 | 968.8 | minor seventh (1000) | −31.2 |
| 4 | 9 | 203.9 | whole tone (200) | +3.9 |
| 5 | 11 | 551.3 | between fourth (500) and tritone (600) | about halfway: a neutral / quarter-tone fourth area |
| 6 | 13 | 840.5 | between minor sixth (800) and major sixth (900) | a neutral sixth area |
| 7 | 15 | 1088.3 | major seventh (1100) | −11.7 |

4. Inharmonic bodies (bars, membranes, rocks) show partials that do not sit on the ladder at all; that is why drums sound "pitched but not quite".
5. Physics fact for any free bar (a stick, a xylophone key): its second mode (2.756) is within 4 cents of 11/4, the 11th harmonic two octaves down. So struck bars naturally carry a hint of the neutral 11th-harmonic flavour.

### 4.3 Hearing partials

1. When zoomed in, each partial becomes audible as its own sine tone, one at a time from the bottom up (like overtone singing makes them audible in a single voice), then all together, which rebuilds the original sound.
2. Tapping a partial solos it. This is a revelation, not a tuning tool: the ohm's actual music is unchanged (§7.4).
3. Cost: up to 16 sine oscillators, only while the atoms layer is in focus; every other layer is a bed at that moment.

### 4.4 Light-colour metaphor (optional)

1. **This is a metaphor, not physics.** Sound waves and light waves are different things; nothing "is" a colour.
2. The game already maps pitch to colour by an "optical octave": a pitch's place inside its octave maps to a wavelength between 400 and 700 nm (`M.hzWl`, music.js:55–58, from Lensure optics). Proposal: reuse it for partials, so each partial is drawn in its pitch-class colour.
3. The poetic version: raise an audio frequency about 40 octaves (×2^40) and it lands in visible light; A4 = 440 Hz becomes about 484 THz, about 620 nm, orange-red. Use only as flavour (dev text or the wordless visual), flagged as a metaphor.

## 5. Sound engine shape (the rethink, in short)

1. **One focus, full detail**: only the focus layer runs full voices (ohm instruments, effects, jams on screen). This is the existing engine.
2. **A bed engine**: a small, fixed pool of cheap voices (sine, filtered saw, noise) that plays the beds of 3.1 from summary records. Fixed size: about 20 voices total, no matter how many ohms, regions or planets exist. This is what makes "scale first" (9:52 PM priority) possible: a million ohms off-screen cost nothing but their summaries.
3. **A clock service**: U and the ratio maths of 1.3 (one function).
4. **A summary service**: the up-flow records of 2.2, updated on the schedule of §8.
5. **A morph controller**: the zoom crossfades of 3.3.
6. Background ohms stay cheap: they produce summary numbers, not audio.

## 6. Out of harmony, and restoring it

Wilbow, 10:02 PM MDT: "The goal of the game is to bring harmony back". At 11:49 PM he said it is "a lore idea and spiritual term that also is a musical term". This section is a PROPOSAL for the musical meaning only; it is not the one goal the engine is built around.

The idea in one line: the world starts (or falls) out of tune, out of time and crowded; the player's journey is re-tuning, re-timing and making room, until every layer locks onto the one pulse and the one tone, and the world blooms. **Harmony only rises. The player is never punished.** Low harmony is the starting puzzle, never a penalty.

### 6.1 Ways a layer can be out of harmony

| # | Layer | How it goes out | What it sounds like |
|---|---|---|---|
| 1 | Atoms / partials | partials detuned from the frame or from pure ratios (cents off) | fast beating, rough, sour |
| 2 | Micro-life | bugs chirping off the subdivision, or triplets against straight 16ths where the tradition does not do that | a scattered crackle, flams |
| 3 | Ohm | an ohm detuned (cents off its own frame), out of its jam's scale, or rushing/dragging | one voice sticking out |
| 4 | Jam | members in different keys or modes (mode mismatch), tempo not a simple ratio of U, phase drifting, too many parts in one band (mix crowding) | a muddle, a wobble, no groove |
| 5 | Region | neighbouring jams in clashing keys; bed has no clear chord | two songs fighting |
| 6 | Planet | regions with unrelated tonics; day cycle not on U's phase points; device settings wrong | a planet hum that wavers |
| 7 | System | planet tonics not simple ratios of each other | a system chord that beats and growls |
| 8 | Galaxy | systems' roots not partials of F0 | a swell that never settles |
| 9 | Universe | layers not phase-locked | the heartbeat is faint, uneven |

"Wrong settings" (from the lore: devices "hooked together wrong, with bad settings creating a lot of chaos") map to the same list: a device whose tempo is not a ratio of U, whose pitch is detuned, whose delay time is off the beat grid (the 4:09 PM Oct 23 rule: effects lock to the grid and stay in key), or whose output crowds the lead band.

### 6.2 What restoring sounds like

1. **Beating slows and stops**: as two partials come together, the flutter slows (10 per second, 4, 1, 0.3...) and becomes one clear tone. This is the signature sound of "fixing it".
2. **A clash resolves to a shared tonic**: two jams in clashing keys land together on a shared tonic or a pivot chord at a landing; the region bed snaps into one clear chord.
3. **Pulses phase-lock**: a wobbling groove slides into the pulse, and the flams close into single hits. Bugs fall into sync like fireflies.
4. **Beds bloom**: the bed of a restored layer opens up: more partials, a little louder, brighter filter, a gentle swell at the next landing.
5. **Room opens**: a crowded band clears when a part moves octave or rests; the melody suddenly stands clear.
6. **The world answers**: each milestone (6.5) triggers a world response (the organic, trippy bloom of the lore), always on a landing.

### 6.3 Cheap checks (each gives a 0–1 harmony value)

All checks run on cached summary numbers, never on audio. On-screen: once per bar. Off-screen: once per minute (or per song). Each check maps an error to 0–1 with `h = exp(−error / scale)` (1 = perfect, falls smoothly).

| # | Check | Error measured | Scale | "In harmony" | "Out" |
|---|---|---|---|---|---|
| 1 | Pitch accuracy | cents from the frame's own scale step (for 12-TET traditions, from 12-TET; for maqam, from the maqam cents; never from just intonation, see §7.4) | 10 cents | ≤ 5 cents | > 25 cents |
| 2 | Beat rate | the gap f1 − f2 (Hz) for sustained near-unisons and near-octaves in the same jam | 2 Hz | < 0.5 Hz | > 6 Hz |
| 3 | Key clash | distance between neighbouring jams' pitch-class histograms (1 − cosine similarity) | 0.25 | < 0.1 | > 0.5 |
| 4 | Phase | phase error vs U at cycle landings, as a fraction of a beat | 0.08 beat | < 0.03 beat (about 15 ms at 120 BPM) | > 0.25 beat |
| 5 | Tempo ratio | % distance from the nearest allowed ratio (1.3) | 1.5% | < 0.5% | > 6% |
| 6 | Mode match | share of a jam's notes outside its region's mode | 0.1 | < 0.05 | > 0.3 |
| 7 | Roughness | Plomp–Levelt / Sethares roughness from a small table (the top 6 partials of each sounding voice) | per tradition | below the tradition's own normal | well above it |
| 8 | Crowding | parts in the same band at once (main melodic band counts double) | 1 part | ≤ 2 per band | ≥ 4 per band |

Notes:

1. **Each tradition is judged by its own rules.** Some traditions want roughness: Balinese paired gongs are tuned a few hertz apart on purpose to shimmer (ombak), and Bulgarian and Bosnian ganga singing loves close seconds. Check 7 compares to the tradition's own normal, never to "pure".
2. Roughness model (Sethares' fit of Plomp and Levelt): for two partials with amplitudes a1, a2 and frequency gap x, roughness = a1·a2·(e^(−3.5·s·x) − e^(−5.75·s·x)), with s = 0.24 / (0.021·f_low + 19). 6 partials × 6 partials = 36 pairs per voice pair. Per bar, on-screen only.
3. A jam's harmony value is a weighted mean of the checks (weights proposed: phase .25, pitch .2, key .15, tempo .15, mode .1, crowding .1, roughness .05).

### 6.4 Upward spread

1. Jam harmony → area harmony: weighted mean of its jams (weight = members × stage weight, 2.2).
2. Area → planet → system → galaxy: weighted means, each smoothed with the time constants of 2.3, so a big layer turns slowly, like a big ship.
3. Rate limit: a layer's shown harmony rises at most 0.05 per landing of that layer, so a restoration is heard as a gradual bloom, not a jump.
4. **Ratchet (never punished)**: milestones once reached stay reached. The live value may dip when new chaos appears (a new device, a newcomer jam), but the world never "un-blooms"; it only stops blooming further until fixed.
5. The top of the chain is **phase-lock with the pulse**: a layer counts as fully restored only when its harmony is ≥ 0.9 AND its landings coincide with U's great-cycle points.

### 6.5 Milestones the world can react to

All land on a landing (1.4), all wordless.

| # | Milestone | When | Musical response |
|---|---|---|---|
| 1 | First lock | first jam with phase ≥ 0.9 | the groove snaps tight; one soft gong-like landing |
| 2 | Area settles | area harmony ≥ 0.5 | region bed gains its chord |
| 3 | Area in harmony | area ≥ 0.8 | region bed blooms; world bloom in that area |
| 4 | Planet resonance | 25 / 50 / 75 / 100% of areas ≥ 0.8 | planet hum gains partials step by step; its day locks to U |
| 5 | System chord | all planets ≥ 0.8 and tonics aligned as partials | the system chord stops beating and becomes one pure chord |
| 6 | Galaxy swell | all systems restored | the galaxy swell becomes a full harmonic-series drone |
| 7 | The om | all layers locked (or the playable universe's end state, Decision D14) | §7.5 ending |

### 6.6 The first sound (lore, 9:24 PM voice call) and what it means musically

> **Fudged correction (Wilbow, 2:44 AM Oct 25): "The original story is causing freeze its lore. The stick".** The origin story and the stick are lore only. Nothing in the engine (clock, pitch, tonics, keys, ending) is derived from the story. Everything in this section is kept as lore and spiritual inspiration only, not as engine ideas.

Wilbow, verbatim (DECISIONS.md:1186, WILBOW_VERBATIM.md:1311):

> "There was originally one original spark — one first sound. A gnome [sic: ohm] tells the player a story that goes back to the beginning: it starts with a stick and a rock, a caveman ohm banging a stick on a rock, an early caveman ohm type of idea. That first beat carries forward. How music made a bunch of other things, and all the living things also participate in the music or react to it. This is one archetype or one experience of that one original spark — there was originally one spark, and each lineage picks it up in its own way, but they all trace back to that same first sound. This also translates into the gameplay: the player may end up in a situation with a bunch of [devices on the] ground and a bunch of chaotic devices all hooked together wrong, with bad settings creating a lot of chaos, and a lot of things in the world reacting poorly because there's no harmony to anything. It's kind of almost a puzzle to get the sound back to a cohesive thing, and then the world responds, and everything is created in an organic type of trippy look. The mess isn't just visual, it's sonic — wrong settings throwing off the harmony, and the fix is re-tuning until the world itself blooms. The same pulse that started with the stick and rock is still what the player is restoring at the end. One spark, many echoes."

Recorded outcome: lore and design direction only; the gnome must be wordless; nothing built until approved.

> **Correction (Wilbow, 11:21 PM Oct 24): the strike that starts the first beat is "a story from lore", not an engine mechanic.** The heartbeat and the om tone are NOT tied to a strike event. Items 1–2 and 4 below, and options 7.1-4 and 7.1-5, are marked withdrawn as engine ideas and kept only as lore and spiritual inspiration. Nothing else is settled.

**Musical proposal (PROPOSAL; decisions D9–D11):**

1. ~~**The first sound defines the clock.** The stick-on-rock strike is beat 1 of U (`U.t0`).Its repeat (the caveman ohm hitting again) sets the pulse rate.~~ *(Withdrawn: the strike is lore only, 11:21 PM.)*
2. *(Withdrawn as an engine idea, 11:21 PM; lore inspiration only.)* **The first sound defines the pitch.** The strike is short, percussive and inharmonic, with a few strong partials: the stick's bar modes (1, 2.76, 5.40) and a few irregular rock modes. Its strongest partial (or its pitch centre) is the fundamental F0 (option in §7.1).
3. *(Lore inspiration only, not an engine idea: Wilbow 2:44 AM, "The original story is causing freeze its lore. The stick".)* **Every lineage is an echo.** Each tradition lineage "picks up" one partial of the first sound as its tonic: its tonic is a simple ratio of F0 (§7.3). One spark, many echoes, literally: every key in the game is a harmonic of the first sound.
4. **The storyteller ohm's story, wordless** (lore inspiration only, not a mechanic): the ohm strikes stick on rock; the sound echoes; each echo becomes a different tradition's timbre on the same pitch. No words, only sound and picture.
5. *(REJECTED ending idea, Q268 'No', 10:45 PM Oct 24; ending to be decided later; kept for reference.)* **The end state can replay it.** When the top layer is restored, all layers phase-locked and all tonics aligned as partials, the first sound returns (§7.5).

## 7. The om: one fundamental tone (The Journey Ohm)

Wilbow, 10:02–10:03 PM MDT: the title is "The Journey Ohm" (a play on "journey home"), and "Like an om in spirituality. Use this philosophy in the design".

Design reading: **the universal pulse is the om.** One fundamental tone and its harmonic series, from which every layer and every tradition grows. The pulse is that tone felt as rhythm; the keys are that tone felt as pitch. One musical reading (ours, not his): harmony as coming back into resonance with it, and the journey home as a journey back to the fundamental. His phrase also has lore and spiritual meanings this doesn't cover.

### 7.1 Choosing the fundamental F0 (options)

1. **C2 = 65.41 Hz, standard tuning (A4 = 440 Hz).** A low drone under every tonic. Matches today's code (12-TET from A440, music.js:25). Simplest.
2. **C2 = 64 Hz ("scientific pitch", C4 = 256 Hz, A4 ≈ 430.5 Hz).** 37.6 cents lower than option 1. Advantage: 64 Hz is exactly 2^6, so six octaves down it is exactly 1 beat per second = 60 BPM, the proposed U (7.2). Cost: the global reference changes from 440 to about 430.5; because the game synthesises its sounds, that should be one reference constant, but this was not checked in code beyond music.js:25.
3. **Chosen per world seed.** Each new game picks its own F0. Varied, but loses "one om for everyone".
4. *(Withdrawn: the strike is lore, not a mechanic, 11:21 PM.)* **The first sound's strongest partial.** F0 = whatever the stick-on-rock strike's loudest partial is (folded down to the C2 octave). The lore defines the pitch.
5. *(Withdrawn as an engine idea; the strike is lore, 11:21 PM; the ending it fed was rejected, Q268.)* **What the first sound "was reaching for".** The strike is inharmonic: its partials sit near, but not on, a harmonic series. F0 is the fundamental of the series they almost fit. The journey is the series straightening: at the end the same strike returns with its partials pulled onto exact harmonics (7.5). (Was recommended before both corrections; no longer.) It gave the musical side of his "bring harmony back" a sound you can hear (a proposal; the lore and spiritual sides stay as they are).
6. **136.1 Hz.** Presented neutrally: this "om frequency" is a modern cultural / new-age convention (Hans Cousto's "cosmic octave", from the Earth's orbit raised 32 octaves), not physics and not from any tradition's scripture. It sits about 31 cents below C#3. Listed only so the choice is informed; not recommended as a claim of meaning.

*(Withdrawn with options 4 and 5.)* Options 4 or 5 combine with 1 or 2: the first sound is designed so its strongest partial (4) or its "target" series (5) sits on the chosen C2.

### 7.2 Optional poetic link: tempo from the tone

1. Flagged as **poetic only**: transposing a tone down by octaves to a rhythm is a fun link, not a physical law.
2. Option 2 (64 Hz): down 6 octaves = 1 Hz = **60 BPM**. Down 5 octaves = 120 BPM.
3. Option 1 (65.41 Hz): down 6 octaves = 61.3 BPM.
4. Either way, the pulse and the tone are "the same vibration, slowed down", which suits the om idea.

### 7.3 Traditions and keys as partials of one series

1. PROPOSAL, context-shaped (Wilbow Q41 answered 'C', depends on context, 3:14 AM Oct 25; also Q263, t145): planet tonics may lean toward harmonics of F0 (octave-folded) or simple ratios to it, with the strength set per context. For example, it might be stronger on some planets and absent on others. It's always a weight, never a requirement, and the world tuning should not be too much influence. How strong it is, and where, is not settled.
2. 12-TET traditions take tonics from the chain of fifths (harmonics 1, 3, 9, 27, 81 → C, G, D, A, E). They sit within 8 cents of the 12-TET note (C 0, G +2.0, D +3.9, A +5.9, E +7.8), small enough to sound "in" in a bed. Their notes stay exact 12-TET.
3. Harmonic 5 (E, −13.7 cents) and 15 (B, −11.7) are also usable as tonics for 12-TET planets; the bed renders them at the 12-TET pitch (3.2 rule 1).
4. Microtonal traditions map onto higher harmonics **where it fits, all approximate**:
   1. Maqam neutral intervals: the neutral third (about 350 cents) ≈ 11:9 (347.4 cents); the neutral second (about 150 cents) ≈ 12:11 (150.6 cents). Real performance varies by region and performer.
   2. 7th-harmonic flavour (968.8 cents, −31 from a 12-TET minor 7th): resembles the "blue" seventh of blues (blues does not come from the harmonic series); barbershop's harmonic seventh.
   3. 11th harmonic (551.3 cents): the neutral / quarter-tone fourth area.
   4. 13th harmonic (840.5 cents): a neutral sixth area.
   5. Turkish makam theory is built on a cycle of fifths (53 commas per octave), so it maps naturally onto the 3-chain.
   6. Raga intonation is often described with simple ratios (Ga ≈ 5:4, Dha ≈ 5:3), though measured performances vary.
   7. Gamelan: slendro and pelog are **not** harmonic-series scales; they are often said to suit the inharmonic partials of metal bars and gongs (a research idea, e.g. Sethares, not settled). PROPOSAL: a gamelan planet's tonic is a partial of F0, but its scale keeps its own (ensemble-specific) cents. Honest note: gamelan is the clearest case where "everything is the harmonic series" is a game idea, not a fact.
   8. Overtone traditions (Tuvan khöömei, Mongolian höömii): their music literally is a fundamental plus selected harmonics. A natural "home planet" of the om idea, tonic = F0 itself.
5. Neighbouring planets in a system use harmonics a fifth or fourth apart (3:2, 4:3), so system chords are mostly open fifths that grow richer as more planets are restored.

### 7.4 Just intonation at the atoms layer, not in the music

1. Yes to **just intonation as revelation**: at the atoms layer (§4) the player sees and hears partials, how close intervals are to pure ratios, and the beating.
2. **No retuning of the playable music**: each tradition keeps its own tuning (12-TET, maqam cents, gamelan cents...). The world only lightly influences an ohm's tuning (t145); ohms change by learning and by the player. Harmony checks (6.3) measure against each tradition's own frame, never against pure ratios.
3. The beds (sustained drones) may use pure ratios against the focus tonic (octave, fifth), since a drone held for a long time is where pure ratios sound best (as with the tanpura behind a raga).

### 7.5 The end of the journey: a cadence to the fundamental

> **REJECTED 10:45 PM Oct 24 (Q268 'No'). Ending to be decided later. Kept for reference only.**

A cadence is a musical ending that lands on home. The final arc, as music:

1. **All layers phase-lock**: every layer's landings fall on the same U downbeat. The biggest landing in the game.
2. **Tonics align as partials**: each restored planet's hum sounds its own harmonic of F0, at the same time, so the system and galaxy beds become one chord: the harmonic series.
3. **Beds merge into one drone**: the separate beds fold into one rich harmonic-series drone on F0 (harmonics 1–16, slowly appearing from the bottom up, like an overtone singer revealing them).
4. **Beating disappears**: everything held is pure ratio; the shimmer stops; stillness.
5. *(Lore inspiration only, not an engine idea: Wilbow 2:44 AM, "The original story is causing freeze its lore. The stick".)* **The first sound returns, transformed**: the stick strikes the rock once more, on the final downbeat. The strike's inharmonic partials glide onto exact harmonics (option 7.1-5) and the short click **sustains** into the full tone. One spark, now a tone. Then the heartbeat continues.
6. *(Lore inspiration only, not an engine idea: Wilbow 2:44 AM, "The original story is causing freeze its lore. The stick".)* Optional: each tradition's timbre briefly colours one partial of the final drone (the echoes coming home).

### 7.6 Respect notes

1. Om (Aum) is a sacred syllable in Hinduism, Buddhism and Jainism, and Ik Onkar is central to Sikhism. The game is **inspired by the idea** of one primordial vibration; it is **not a religious depiction**.
2. Do not reproduce sacred text, chant, mantra or ritual. No sung or spoken "Aum", no recorded chant, no prayer, no ritual objects used as game items.
3. Do not use the Om symbol (ॐ) or other sacred symbols as icons, logos, collectibles or decoration.
4. Draw on acoustics and drone traditions as music: the tanpura drone, the shruti box, overtone singing. Credit them as musical traditions, by name, in dev notes. Overtone singing belongs to Tuvan, Mongolian and other living cultures; avoid calling it "chanting".
5. Make no claims that any frequency heals, cleanses or has spiritual power (this includes 136.1 Hz and "432 Hz" claims).
6. The title "The Journey Ohm" plays on "ohm" (the game's creatures, and the unit) and "home". Recommend a short check of the title and any om-related visuals with someone from the traditions involved before release (Decision D15).

## 8. Cost

Performance is a hard gate (9:52 PM priority). Everything here is sized to cost almost nothing when off-screen.

1. **Clock**: one function, one number per layer (its ratio). Free.
2. **Summaries**: about 20 numbers per jam, region, planet, system, galaxy (under 100 bytes each).
   1. On-screen jams: updated once per bar, from notes already chosen (no audio analysis).
   2. Off-screen jams: once per song or once per minute, whichever comes first.
   3. Upper layers: updated only when a child's summary changes, as a running weighted mean (cost grows with the number of children, not ohms).
3. **Harmony checks** (6.3): a few hundred arithmetic operations per jam per bar on-screen; the roughness check (36 pairs per voice pair) only for on-screen jams, top 6 partials, top 4 voices.
4. **Beds**: a fixed pool of about 20 cheap voices total, independent of world size. At most 2 bed layers loud at once (3.3 rule 5).
5. **Atoms layer**: up to 16 sines, only while it is the focus.
6. **Micro-life**: only on-screen bugs; one sine-phase nudge per chirp.
7. Off-screen ohms produce no audio and no per-frame work; they only feed summaries on the slow schedule.

## 9. How this connects to TRADITION_REFERENCE and the jam → song stages

1. **Frame (TRADITION_REFERENCE §0.1)**: the ohm/jam layer of the ladder. The frame's tempo becomes "U × a simple ratio"; its `t0` sits on a U phase point (§1.7). The song-position clock (§0.2) counts from U.
2. **Quantisation (§0.3)**: unchanged inside a jam. Painted notes keep organic timing (8:45 PM); recorded notes snap to 16ths.
3. **Wild ≥10% variance (§0.4)**: lives in ornaments and fills, as now. Micro-life subdivisions (1.6) are an extra place for it.
4. **Per-tradition blocks (§1)**: each tradition's tempo range picks its ratios (1.3); its tuning data (cents tables) is what the pitch check (6.3 #1) measures against; its timbre colours the planet hum (3.1 #2).
5. **Stages (§3.2: EXPLORING → GROOVING → FORMING → SONG → CODA)**: give the weights for up-flow (2.2) and match the restoration arc: an EXPLORING group is the "chaos" end of the puzzle; a SONG is a restored jam. Stage changes land on landings.
6. **Per-bar signals (§3.3)**: already computed once per bar; the harmony checks reuse them (pitch-in-frame, grid share).
7. **World-reaction signals (§3.6: `song.enter`, `hook.return`, `cadence.land`, `song.complete`)**: the milestones of 6.5 are the same kind of signal at larger scales (`area.harmony`, `planet.resonance`, `system.chord`, `galaxy.swell`, `om`). Which reaction each triggers stays Wilbow's call.
8. **Song record (§3.7: `{ seed, trad, recipeId, formIdx, sectionIdx, barInSection, cyclePos, bpm, t0, stage, hookHash, bornAt }`)**: add the tempo ratio and the harmony value; `t0` becomes a U phase point, so "already mid-song on arrival" is exact maths from the universal clock.
9. **Causes of "cohesion only sometimes" (§3.8)**: a shared clock and ratio tempos remove one family of causes (independent clocks drifting apart).

## 10. Conflicts with existing rules (and how this proposal stays inside them)

1. **t145 / R3.25** ("The world tuning itself shouldn't be too much influence. The creatures need to retain traits and knowledge in new environments"): down-flow is a light weight only (2.1 item 6). Ohms generally retain their instruments, keys and traditions, but they learn from others, the player can change them, and items modulate them. Jams have no leader.
2. **V08_SPEC §C (regional keys, light; never retune existing ohms)**: kept. Restoration is done by the player re-tuning devices and settings, and by jams forming new songs. Ohms come into harmony by playing and listening together, and modulation runs both ways: ohms modulate areas and planets, and planets affect their ohms.
3. **R3.17 (regional keys approved, not built; only a ≤3% tempo lean)**: the region layer here is the same idea plus beds. The 3% lean conflicts with exact ratios (Decision D4).
4. **R3.4 (environment only lightly seeds the starting tempo, never dictates)**: ratios are offered as the "locked" choice, not forced (Decision D3).
5. **Mutation off (RS.MUTATION = false)**: bed and layer drift is a summary of what is playing, not gene drift.
6. **START_HERE fact 12** ("Resonance must never use themes, presets, genres or fixed roles; biomes are blended fields and the environment only lightly influences sound"): one tradition per planet is already in tension with this; this doc adds no new presets, and layer states are summaries, not presets. Flag stays open.
7. **Tap tempo (3:29 PM Oct 23)** vs ratio lock: Decision D3.
8. **Effects lock to the beat grid and stay in key (4:09 PM Oct 23)**: matches; "wrong device settings" in 6.1 are exactly the cases this rule would correct.
9. **Painted notes are organic (8:45 PM Oct 24)**: matches; phase is checked only at landings.
10. **Released game is text-free; names are spoken, never sung; the gnome is wordless**: all milestones and the end arc are sound and picture only. Cents rulers and numbers are dev-build only; the released atoms layer shows lines and shimmer, no numbers.
11. **Lensure optics** (light ↔ pitch by an optical octave, music.js:55–58): reused as-is for colour; no new optics.
12. **Background ohms must stay cheap**: kept (§8 rule 7).

## 11. Decisions for Wilbow (in player terms)

1. **D1: One heartbeat for the whole universe?** Every song, bug and planet day counts from the same pulse (proposed 60 beats per minute), ~~starting at the first stick-on-rock strike~~ (the strike is lore only, 2:44 AM). Yes / no?
2. **D2: Planet speeds as simple multiples.** Planets play at simple multiples of the heartbeat (half, two-thirds, same, one-and-a-half, double...), so zooming always lands on a shared beat. OK, or allow any speed?
3. **D3: Tap tempo.** When you tap a tempo, should the group glide to the nearest "locked" speed after one cycle (unless you tapped far away), or keep your exact tempo always?
4. **D4: The 3% regional tempo lean.** Replace it with a choice among locked speeds, or keep it?
5. **D5: Zoom sound.** Should the sound of a layer you zoom into "open up" from a soft distant hum into the full music, waiting up to one phrase to land on the beat? Or switch at once?
6. **D6: Planet keys from one root.** Every planet's home note is a harmonic of the one fundamental tone (neighbouring planets a fifth or fourth apart), while its colour still comes from its palette. OK?
7. **D7: Fundamental pitch.** Which "om" tone: (a) low C at standard tuning (65.4 Hz), (b) low C at 64 Hz so the heartbeat is exactly that tone slowed six octaves (needs the whole game's tuning about a third of a semitone lower), (c) a different tone per world, or (d) the 136.1 Hz convention (a cultural idea, not physics)?
8. **D8: Tempo from the tone.** Do you like the poetic link "the heartbeat is the om, slowed down"?
9. *(Withdrawn: derived from the lore story, 2:44 AM.)* **D9: The first sound sets the pitch.** Should the stick-on-rock's strongest partial be the fundamental, or should the fundamental be what the first sound "was reaching for" (recommended: the ending then straightens it into a pure tone)?
10. *(Withdrawn as an engine idea: derived from the lore story, 2:44 AM.)* **D10: Lineages as echoes.** Should each tradition's home note be one partial of the first sound (one spark, many echoes)?
11. **D11: The ending.** All layers lock, the beds merge into one drone on the fundamental, beating stops, and the stick strikes the rock once more and sustains into a tone. Is that the ending you hear?
12. **D12: Out-of-harmony puzzles.** Which faults should players fix first: wrong device speeds, detuned devices, clashing neighbouring jams, crowded mixes? And do world faults appear on their own, or only where the story places chaotic devices?
13. **D13: Never punished.** Harmony only rises: milestones never un-bloom, and new chaos just pauses the bloom. OK?
14. **D14: How far "all layers" goes.** Is the end reached when one galaxy (the playable one) is fully restored, or must every galaxy be restored?
15. **D15: Respect check.** OK to keep the om as inspiration only (no chant, no symbol, no healing claims), and to have the title and om visuals checked by someone from the traditions before release?
16. **D16: Atoms layer.** Should zooming into a sound show and play its partials (with shimmer where they beat), purely as a thing to see and hear, never retuning the ohm?
17. **D17: Light colours.** Show partials in the game's existing pitch colours; and is the "40 octaves up = light" idea welcome as a wordless visual metaphor?
18. **D18: Bugs on the subdivisions.** Should bugs chirp on fast subdivisions of the nearby jam and fall into sync like fireflies when the area is in harmony?
19. **D19: Bigger planets with blend zones.** When planets grow, do the border zones between tradition regions blend gradually, as in 2.6?
