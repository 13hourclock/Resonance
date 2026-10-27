# Resonance: vision proposal (collecting, exploration, depth, width, Noita chemistry, Ableton-style music making, endlessness)

**Status: PROPOSAL ONLY, not approved, nothing built.** Written Fri Oct 23 2026, ~1:20 AM MDT, for Wilbow's request at 1:10 AM MDT:
> "With all the discussed still in consideration, add the most appealing parts of collecting Pokémon, the Exploration of the best open world sand Boxes, the explorability of games considered deep, and also wide. Keep music as the focus. Add the explorability of noita, and the music making of ableton live. Endless exploration, with everything we've worked on"

No code, V07_SPEC.md or other docs were changed. v0.7 (A–L) keeps building exactly as specced. Everything below comes **after** v0.7 and needs Wilbow's yes, item by item. (THEMES.md and WILBOW_VERBATIM.md don't exist. The verbatim quotes here come from DECISIONS.md Appendix A and HANDOFF.md.)

---

## The vision (what it feels like to play)

You land on a strange world and hear it before you see it: a low hum from over a ridge, a far-off jam leaking through the hills, a bell that rings when the wind changes. You follow the sound. On the way you find ohms nobody has ever heard, each one a living instrument you can catch, carry, befriend and grow. A few of them glint, and you know they're rare the moment you hear them. You pick up loops the ohms play and lay them on the ground like stones. Strum across a row and the whole band switches section on the next bar, like launching a scene in Ableton. Rain on a drum softens it, lightning makes a bell buzz, and two materials pressed together in the right way become a third, a sound nobody in your universe has made before. Old bones hum a song from an extinct lineage, and that song is the key to a door three systems away. Every voice you've ever met becomes a star in your sky, and the empty spaces between them pull you further out. Further out is stranger: new tunings, new rhythms, rarer life. It never ends, because the world keeps making music you didn't write and couldn't have predicted, and **music is still the point of everything you do**.

---

## How to read this

- Proposals are numbered **P1–P28** across the whole document. Each one lists:
  - **Do/feel:** what you do and feel.
  - **Builds on:** existing systems it reuses.
  - **Gestures:** checked against GESTURES.md.
  - **Taught by:** how it's shown with no text (rule 1 and spec L).
  - **Off-screen cost:** what background ohms pay (rule 9 and spec J).
  - **Size:** S, M or L.
- **⚠ CLASH** marks a conflict with an earlier decision. It quotes the decision and suggests how to stay inside it.
- **Already have** at the top of each pillar lists what Resonance already does, so nothing gets rebuilt.
- Research sources are numbered [S1]–[S26] at the end.

---

## Pillar 1: Collecting (the best of Pokémon)

**What makes Pokémon collecting work:**
- **Completion pull from a visible, bounded set** (the Pokédex). Collecting is mostly *taxonomic*: you fill gaps in a known structure [S1].
- **Completion is fragile.** Players quit once they've "caught them all" if nothing changes afterwards [S2]. The Pokédex only feels good when finding each entry is an *event*, not a grind [S26].
- **Rarity decided at birth.** A shiny is fixed when the Pokémon is created and never changes. It gives no power, only a look and a sparkle, and people hunt them for years [S3][S4].
- **Variants shaped by place.** Alolan forms are the same species adapted to a different climate [S6].
- **Trading as a reason to meet.** Tajiri built it from childhood bug-trading, and version exclusives were added so players had to trade [S5].
- **The bond with a small team you carry.**

**Already have** (don't rebuild):
- **Catching and spawning:** catching in a bubble (loop), and carrying bubbles across levels (`App.carried`, landing them on the ark). Spiral spawn with stroke reading, plus the v0.7 egg grammar with hidden tier-3 combos (a hidden-recipe collection already).
- **Rarity:** natural life is rare (~1/300 systems), and half of natural lineages carry one of 25 rare abilities. Fossils wake into extinct lineages. Meteorites sometimes carry seeds from other worlds (`meta.drift`).
- **Bonds and families:** the infinity bond, colonies, parenting.
- **Records:** lineage constellations in the galaxy view (parent→child lines between birth systems, brighter for ohms with abilities, faded stars for deleted ohms). The sky glyph constellation hook (#26).
- **Growing ohms:** experience and compatibility skill (v0.7 D/D2), and watched jams growing (v0.7 E).

### P1. The Chorus: a living, text-free "Pokédex" made of sound
- **Do/feel:**
  - Every ohm you *really meet* becomes a star in the galaxy view, where lineage stars already sit. Meeting means zooming in on it, jamming with it, catching it or waking it.
  - The stars fall into a few **bounded families** you can see filling up, each a ring of sockets drawn faintly in the galaxy view, like the gaps in a Pokédex:
    - the 7 body plans (plus aerial kits);
    - the 25 abilities;
    - the drum kinds (kick, snare, hats, toms, kits);
    - the voice engine families.
  - Lit sockets glow in the colour of the first ohm that filled them. Empty sockets are dim outlines.
  - Tapping a system's star (it chimes today) now chimes **with the voices you met there**: a 2-bar snippet of their motifs in their own timbres.
  - Because genetics are near-infinite, the *families* are finite but the *individuals* never run out. You can finish a ring, but you can never finish the Chorus.
- **Builds on:**
  - `App.lineage` and `meta.lineage` (already persisted, capped at 400);
  - the galaxy-view lineage renderer;
  - `RS.Genome.motifOf` (each genome already encodes a motif);
  - the tonal engine and the existing chime path.
- **Gestures:** No new gesture. "Galaxy | Tap a star | Chime" keeps its gesture but plays a richer sound (that counts as a sound change, so it needs approval under rule 3). The sockets are drawn only, with no hit test, so double tap on empty space (fly home), pan, zoom and the C17 pinch-out (new universe) are untouched.
- **Taught by:** The first time you meet a new kind, its star streaks up from the ohm into the sky with a rising tone. The first time you open the galaxy view after that, the new socket pulses once.
- **Off-screen cost:** Zero per frame. One small record is written once per meeting.
- **Size:** M.
- **⚠ CLASH, t164:** "not as symbols etc". Sockets must look like stars and constellations, never icons or badges. **⚠ CLASH, spec I** (a random start world on every launch, no auto-load): a collection that vanishes on relaunch is worthless. See Risk 1 and Question 1.

### P2. Gleam: rare-at-birth ohms (shinies, with mutation still at 0)
- **Do/feel:**
  - About 1 in 500 hatchings or natural births is a **gleam**. It looks a little different, with an iridescent sheen on its existing palette. It also *sounds* a little different: one extra shimmering partial and a sparkle on its first note of each phrase.
  - It is never stronger. Like a shiny, it's pure rarity [S3].
  - You notice it by ear in a crowded jam, and that's the thrill.
  - Waking a fossil, getting a meteorite seed or hatching from a well-travelled parent pair raises the odds a little (like Pokémon's chaining and charms [S3]). That gives you something to hunt without grinding.
- **Builds on:**
  - creation-time randomness in `genome.js` and `egg.js`, decided once at creation and stored as a gene (Mutation 0 allows randomness at creation, rule 7);
  - the existing palette and render glow;
  - the partials in the synth `modes` lists.
- **Gestures:** None.
- **Taught by:** A gleam hatches with a distinct bell cue, and its sheen catches the light.
- **Off-screen cost:** Zero. It's a flag on the genome.
- **Size:** S.
- **⚠ CLASH check, rule 7 (Mutation 0):** this is fine because it's decided at creation and never changes, exactly like a Pokémon shiny. **⚠ rule 16** ("every ohm is clearly a different instrument"): the gleam is added *on top of* that minimum-timbre-distance guarantee and never replaces it.

### P3. Birthplace forms (Alolan-style variants)
- **Do/feel:**
  - The same lineage born on a different world comes out *expressed* differently. Carry two eggs of one family to an icy moon and a hot planet, and the moon one has a glassier, longer-ringing tone and slower attack, while the hot one is warmer and quicker.
  - The genome is identical. Only the expression differs, the way Alolan Vulpix is the same species shaped by climate [S6].
  - Collectors chase "the cave form" or "the cloud form" of a voice they love.
- **Builds on:**
  - the existing light birthplace lean (v0.6.2, OPEN_NOTES #20);
  - `field.js` (temp, moist, echo, hollow, hard, wind);
  - regional tempo lean;
  - the approved-but-unbuilt **regional KEYS** gap;
  - moon buds (`voyage.js`), carried bubbles, meteorite seeds.
- **Gestures:** None. Moving eggs uses the existing carry.
- **Taught by:** When an ohm hatches somewhere new, a faint ghost of its parent's form overlaps it for a moment, so you see and hear the difference.
- **Off-screen cost:** Zero. It's computed once at birth.
- **Size:** M (mostly tuning).
- **⚠ CLASH, t169:** environment "slightly influenced by the environment at the beginning but it shouldn't dictate the whole overall sound". Birthplace forms must stay a **light** nudge. **⚠ CLASH, t167:** "I dont want it to feel like a set of themes". Forms must come from the blended continuous fields, never named biome presets ("ice form", "fire form"). **Pending:** OPEN_NOTES #20 (birthplace-lean option) must be decided first.

### P4. Awakening: "evolution" earned through music, not mutation
- **Do/feel:**
  - When an ohm's experience (v0.7 D) passes a high threshold, it has a visible, audible **coming-of-age moment**. A slow bloom of light, and its song gains something it always carried but never used: a dormant second voice (harmony under its motif), a longer motif, or a latent ability gene finally firing.
  - It feels like evolution, but nothing in its DNA changed. It *grew into* itself.
- **Builds on:**
  - v0.7 D/D2 experience and compatibility skill;
  - the 25 abilities and their existing thresholds;
  - motifs, and E's longer loops;
  - growth (`youngT`).
- **Gestures:** None.
- **Taught by:** The bloom itself. The guide ohm has one once, with you watching.
- **Off-screen cost:** One threshold check on the existing 2 s experience tick (rule J).
- **Size:** M.
- **⚠ CLASH check:** v0.7 D says experience is "a layer on top of the genome, never replacing a gene". Awakening only *gates expression* of genes it already has, so it fits. Spec gap **X1** (do hatchlings inherit experience?) affects whether awakening runs in families. See Question 6.

### P5. Matchups you can hear (Pokémon types, made musical)
- **Do/feel:**
  - Pokémon's type chart is a hidden web you learn by playing. Resonance's version is **musical compatibility**: tuning systems, meters and tempo ranges that do or don't sit together (J.fit already computes this).
  - While you drag an ohm near another, their halos show it: a calm, steady glow when they'd lock together, and a slow beating flicker (real acoustic beating) when their tunings clash.
  - You learn the web by feel, and it changes what you carry where.
- **Builds on:** `jam.js` J.fit and niches; `harmony.js`, `tonal.js` (53 tuning systems); `duel.js`; D2's compatibility skill (a skilled ohm's halo stays calm over wider gaps).
- **Gestures:** None new. It shows during the existing drag.
- **Taught by:** It is its own teaching, because the glow is the explanation.
- **Off-screen cost:** Zero. It only runs on screen while you drag.
- **Size:** S.
- **⚠ CLASH check, rule 15** ("no ... fixed roles"): there are no types. It's a continuous measure from genes and experience.

### P6. Trading without a second app: seeds in songs
- **Do/feel:**
  - When you share a recording (loop around the sky star, which exists), the ohms on screen travel *inside* it as genome codes.
  - A friend opens that file with Resonance. In their sky a meteorite falls, rings like a bell, and cracks open to eggs of your ohms. Mutation stays 0: they're exact copies.
  - It's version-exclusive trading [S5] made natural. Your universe's rare abilities and gleams become someone else's prize.
- **Builds on:** recording and sharing (`App.toggleRecord`); `RS.Genome.fromCode`; the meteorite seed path (`Sf.seedPool`, `meta.drift`).
- **Gestures:** None new in the game. Sending and receiving use Android's own share and "open with", which the recording share already uses.
- **Taught by:** Your first received meteorite is the lesson.
- **Off-screen cost:** Zero.
- **Size:** M (file metadata and an Android intent filter).
- **⚠ CLASH check:** t131 "I dont want 2 apps". This is one app. Rule 1 (no menus or text UI): the OS share sheet is already in use for recordings. Confirm it's acceptable (Question 9).

### P7. The Troupe: the team you carry sings with you
- **Do/feel:**
  - The bubbles you already carry between levels stop being silent luggage. In the system and galaxy views your carried ohms quietly hum a soft travelling version of their jam, and each new world's chime harmonises with them.
  - Land them somewhere and they react: they perk up near a compatible jam (P5 glow) and go quiet near a clashing one.
  - It's Pokémon's team bond, expressed as music.
- **Builds on:** `App.carried` (already drawn bottom-centre on every level); bonds; jams and cohesion; system-view chimes.
- **Gestures:** None new. Catch, carry and land already exist.
- **Taught by:** You can hear it.
- **Off-screen cost:** A few quiet voices only while you're in a map view.
- **Size:** S–M.
- **⚠ CLASH, t132:** "They shouldn't move around all the time, except slowly approach eachother when nearby". **⚠ t168:** "The ohms wander too much". This proposal is fine only because *you* move them. Ohms still never travel on their own (OPEN_NOTES #19 and R5.16 already rejected self-travelling riders). Confirm that a released ohm's *home* becomes where you set it down (Question 7).

---

## Pillar 2: Sandbox exploration (Minecraft, BotW/TotK, No Man's Sky, Outer Wilds, Terraria)

**What the best of them do:**
- **"See it, go there."** Outer Wilds was built around "seeing something in the distance and you choose to go there and being rewarded by that". The designers worked to remove *aimless* wandering, so your choices are motivated by curiosity [S11][S12].
- **Gravity and triangles.** BotW's designers found playtesters following a few straight lines. They fixed it with landmarks that pull, and terrain shaped as triangles at three scales. A triangle gives you a choice to go over or around, and it hides what's behind it [S7][S8].
- **A chemistry engine.** In BotW, elements change materials, elements change elements, and materials don't change each other. That lets players "feel as though they are smart" [S9][S10].
- **Layers going down.** Terraria's depth bands each change hazards and rewards [S25].
- **Knowledge as the only key.** In Outer Wilds the only progression is what you know: nothing in the world is locked by an item, only by facts you haven't found yet [S13].

**Already have:**
- **Places:** big explorable planets; caves (with v0.7 roofs); galaxies, systems, planets, moons, cloud gas giants and an ark.
- **Landmarks and rare finds:** monoliths (tap = hum; two taps in a bar modulates); fossils; meteorites; rare cosmic events (flares, supernova, pulsar ticks, accretion chirps); history traces.
- **World life:** weather, day length, critters, plants, pool water, wind rocks and reeds.
- **Map-view actions:** orbit nudging, and seeding worlds from the system view.

### P8. Hear it, go there: distant music as the landmark
- **Do/feel:**
  - In Resonance the landmark should be **a sound**. Off-screen jams, monoliths and wind spires leak a faint, filtered murmur from their direction.
  - It's panned left or right and muffled by distance and by terrain in between, so you hear "something over that ridge".
  - Pan toward it and it gets clearer. Arrive and it blooms into full detail.
  - It's BotW gravity [S8] and Outer Wilds' "see it, go there" [S11], done with your ears.
- **Builds on:** the existing off-screen lod-1 jam state (mind.js, jam.js); events.js sites; the audio send/reverb bus; `field.js` hollow and echo for muffling.
- **Gestures:** None. It uses pan and zoom as they are.
- **Taught by:** The sound itself. At the start, the guide ohm turns its head toward the murmur.
- **Off-screen cost:** One shared low-pass "murmur" voice per off-screen *jam cluster*, not per ohm. Its gain and pan update every ~2 s, and it plays the cluster's stored loop (no simulation). That's cheap and capped (for example, at most 3 murmurs).
- **Size:** M.
- **⚠ CLASH check, rule 10** ("one shared acoustic space"): murmurs must sit far back in the mix so they never muddy the jam in front of you.

### P9. Triangle terrain: silhouettes that make you curious
- **Do/feel:**
  - Planet surfaces get landforms at three clear scales, like BotW [S7][S8]:
    - one or two **big spires** you can see from far round the curve of the planet;
    - **mid ridges** that hide what's behind them;
    - **small rises** that vary your path.
  - Big spires are also **instruments**: wind-sung stone, so a landmark is something you hear as well as see.
- **Builds on:** `planet.js` terrain; `growth.js`; wind rocks and reeds; caves; "guaranteed open space" (R6.4).
- **Gestures:** None.
- **Taught by:** The view itself.
- **Off-screen cost:** Zero. It's static terrain; the wind song plays only on screen or as a P8 murmur.
- **Size:** M.
- **⚠ CLASH, t167** (no themes): shapes must come from the blended fields, not stamped set-pieces. **⚠ rule 8:** keep the per-area particle cap.

### P10. Sound chemistry: elements change how materials *sound*
- **Do/feel:**
  - A small, consistent rule set in the BotW style [S10], applied to *timbre*:
    - **water** soaks a body: it damps and drops in pitch;
    - **heat or light** dries it and brightens it;
    - **spark** charges metal: it buzzes and drives;
    - **cold** makes stone brittle and high-ringing;
    - **wind** sets reeds and rods singing.
  - Elements also change each other: water puts out spark, and light dries water.
  - You start *thinking* like a sound designer by pouring water on a drum. "Feel as though they are smart" [S9].
- **Builds on:**
  - the wave stroke (pours water), the star stroke (light), the zigzag (spark);
  - `field.js` (moist, temp, charge, wind, light), `water.js` pools, `light.js` optics;
  - material properties already on bodies (stiff, hard, clear/dense, loss, grain);
  - double tap on a body (clear/dense) and pinch (tension).
- **Gestures:** None new. The existing wave, star and zigzag strokes now also change nearby bodies' sound. That is a change of effect on existing gestures, so it needs approval (rule 3).
- **Taught by:** You hear it at once: the drum you just watered goes dull. The guide waters a drum once.
- **Off-screen cost:** Zero simulation off-screen. States are stored on the body and relax over time by a closed-form decay applied when you return ("time passes while away" stays true without ticking).
- **Size:** M–L.
- **⚠ CLASH, rule 13:** "add no unbuilt Lensure features". HANDOFF also lists "fire/air/earth elements" under "Lensure assimilation items ... deferred since v0.1" as *approved, not built*. Those two lines pull against each other. P10 uses only elements Resonance already has (water, light, spark, field temperature and wind), so it doesn't need Lensure's fire, air or earth (Question 4).

### P11. Doors that open to a song (Outer Wilds knowledge gating)
- **Do/feel:**
  - Some places are sealed: a resonant crystal plug in a cave mouth, or a silent monolith that won't hum.
  - They open to **knowledge, not items**: play, sing or strum the right interval or motif near them and the plug shatters in pitch.
  - The answer is always learnable *in the world*: the fossil bones on this planet play it, or the history traces of an old jam hint at it.
  - Once you know it, it opens anywhere it applies. In Outer Wilds the progress lives in you [S13].
- **Builds on:**
  - events.js (fossil motif, monolith chord, `RS.fossilGenome`'s ancient key);
  - playmode.js (playing a phrase twice adopts it as the motif, so phrase matching exists);
  - listen.js (mic pitch tracking);
  - strum, caves and history traces.
- **Gestures:** None new. It uses play mode, hold-to-sing, strum and taps on bodies.
- **Taught by:** The plug hums the *first note* of its answer when you're near, and glows when you play a right note.
- **Off-screen cost:** Zero. The locks are static, seeded per world.
- **Size:** M.
- **⚠ CLASH check, t157:** glyphs are reserved "for important changes, spawns, attribute manipulations". This proposal uses music, not glyphs, so there's no clash.

### P12. Threads: a ship's log drawn in light
- **Do/feel:**
  - Outer Wilds' rumour map [S13], with no text. When you find a clue, a faint thread appears in the galaxy view from where you found it to where it points. For example:
    - a fossil's ancient key matches a far system's key;
    - a meteorite seed came from a specific world;
    - a P11 lock's answer lives on another planet.
  - Unfollowed threads shimmer. Followed ones go solid.
  - There's always somewhere you *want* to go next. That's the antidote to aimless wandering [S11].
- **Builds on:** the galaxy-view lineage line renderer; `meta` persistence; events.js and voyage data.
- **Gestures:** None. The threads are drawn only.
- **Taught by:** A thread draws itself, with a soft rising tone, at the moment of discovery.
- **Off-screen cost:** Zero.
- **Size:** S–M.
- **⚠ CLASH, t164** ("not as symbols etc"): threads only, no icons.

### P13. Going deeper: layered depth under the surface
- **Do/feel:**
  - Terraria-style bands [S25], told in sound. The deeper the cave:
    - the longer and darker the echo;
    - the rarer the materials (glassy, singing stone);
    - the stranger the life (a higher chance of rare abilities and gleams).
  - The bottom is a quiet, enormous reverb chamber where a single note rings for ten seconds.
- **Builds on:** caves (and v0.7 roof work); `field.js` hollow and echo; the reverb send; abilities; P2.
- **Gestures:** None. Use pan and zoom.
- **Taught by:** The growing echo of your own taps (tap = ripple and blip already).
- **Off-screen cost:** Zero beyond the existing cave state.
- **Size:** M–L.
- **⚠ CLASH, rule 13:** "crystal caves" is on the deferred Lensure list. Either it's approved to build in Resonance or P13 must avoid the crystal-cave look (Question 4).

---

## Pillar 3: Depth (Outer Wilds, Dwarf Fortress, Rain World)

**What these games do:**
- **Simulate the parts, not the result.** Dwarf Fortress gets its biomes from interacting fields (temperature, rainfall, drainage) rather than stamping them, and its rule is "Don't overcomplicate ... operate at the level of what the player sees or one layer below" [S14].
- **Creatures that live for themselves.** Rain World's creatures "exist there for themselves", hunting and finding homes off-screen. The team learned that full chaos can be unfair, so they added "room attractiveness" and a little guidance [S15].

**Already have:** Resonance is already deep in exactly the Dwarf Fortress way.
- **Blended fields:** field.js blended fields (rule 15 is Tarn Adams' principle 2).
- **The genome:** 240 genes, each encoding a playable motif.
- **What ohms learn:** mind.js learned key, tempo and meter; experience and skill.
- **Relationships:** symbiosis (8 mechanics, 16 pairings); social behaviours (grudges, mourning, parenting, shy or bold, sleep, curiosity); motif crazes.
- **Groups:** colonies, duels, jam niches and breakdowns.
- **Inspection:** DNA zoom and editing.
- **Off-screen life:** ohms already "live" cheaply off-screen at lod 1.

**The gap isn't simulation. It's legibility: seeing the depth that's already there.**

### P14. Song sediment: the ground remembers the music
- **Do/feel:**
  - Wherever a jam locked in, it leaves a faint stratum in the ground, a layer of history. Over days, a busy valley builds visible bands.
  - Zoom into a band and you hear a few seconds of the jam that laid it down: the motifs and key it had then.
  - Dig into a world's past and hear its musical history, Dwarf Fortress legends as sound [S14]. On dead worlds the sediment is *ancient*: a song from before the fossils.
- **Builds on:** history traces (v0.5); jam lock-in; `RS.Genome.motifOf`; the fossil genome's ancient key; zoom.
- **Gestures:** None new. Playing uses the tap-on-body path (the sediment is a struck body), and zooming is unchanged. Check: a tap on bare ground today gives a ripple and a height blip. Sediment needs its own hit body so a ground tap elsewhere stays the same.
- **Taught by:** You see the bands, and a tap rings old music.
- **Off-screen cost:** One small record written when a jam locks in (it already is an event). No ticking.
- **Size:** M.

### P15. Readable inner lives (Rain World depth, made visible)
- **Do/feel:**
  - You can *see why* an ohm does what it does, without text:
    - a grudge shows as a slight lean away;
    - mourning shows as a dimmed glow and a slower motif;
    - a craze shows as a shared shimmer between everyone singing the same motif.
  - Depth you can read becomes depth you can play with.
- **Builds on:** social.js, the behaviours above, crazes, D2's bridging link line (spec L already shows one), and readable roles on the body (rule 17).
- **Gestures:** None.
- **Taught by:** Self-evident.
- **Off-screen cost:** Zero (render only).
- **Size:** S–M.
- **⚠ CLASH, rule 17:** "no constant ripples, waves only for events". Use posture and glow, never ripples.

---

## Pillar 4: Width (many kinds of places and music)

**Already have:**
- **The universe:** galaxies; a NEW UNIVERSE (galaxy pinch-out); random start worlds (v0.7 I); 7 body plans plus aerial kits; many synth engines and drum kinds.
- **Music theory:** 53 tuning systems in `To.CAT`, with world-music theory coming in v0.7 G.
- **Variety by place:** regional tempo lean; weather and day length.

Width is already huge. The proposals make it **perceptible** (Compton: perceptual differentiation [S23]).

### P16. Every star sings its accent
- **Do/feel:** In the galaxy and system views, tapping a body or star (a chime today) plays a 3-note fragment in that place's **prevailing tuning and meter**, not just a pitch. Skim the galaxy by tapping and you hear a quarter-tone system here, a 7/8 there, a just-intonation world further out.
- **Builds on:** the existing chime; `To.CAT`; mind.js consensus; G cultures (v0.7).
- **Gestures:** No new gesture. It changes what an existing chime sounds like, so it needs approval (rule 3).
- **Taught by:** Self-evident.
- **Off-screen cost:** Zero. The fragment comes from stored consensus.
- **Size:** S.
- **⚠ CLASH, t167:** "I dont want it to feel like a set of themes". The accent must be the world's *current learned consensus*, which drifts with the ohms living there, not a label assigned to the system.

### P17. Strangeness grows with distance (Terraria depth, applied to space)
- **Do/feel:** The further a galaxy or system is from home, the further its odds lean toward the unusual: rarer tuning systems, odd meters, more abilities, more gleams, more cloud giants. Home feels familiar, and the edge of the map feels alien. Distance itself becomes the reward [S25].
- **Builds on:** `space.js` system generation; `RS.LIFE_ODDS`; `To.CAT`; the abilities roll in genome.js.
- **Gestures:** None.
- **Taught by:** Self-evident through P16 chimes.
- **Off-screen cost:** Zero (at creation).
- **Size:** S.
- **⚠ CLASH check:** creation-time randomness is allowed (rule 7). "Life is rare" (R6.3) still holds, because only the *kind* of life gets rarer with distance, not how common it is.

---

## Pillar 5: Noita-style chemistry and secrets

**What Noita does:**
- **Every pixel is simulated** [S16].
- **Recipes and mysteries.** Its best alchemy recipes are different in every seed [S18]. Its eye messages are still not definitively solved by the community years later [S17].
- **Wands.** Building one means stacking spells in an order, where the order is the design.

**Already have:**
- soft-body Verlet/PBD materials with real properties;
- material strokes (rod or blob), clay shaping, clear/dense toggling;
- water pools, sparks, light optics;
- effect items ohms seek, carry, wear and trade (items.js);
- colonies (fusing bodies);
- per-world deterministic secrets: fossils, monoliths, hidden tier-3 egg combos (v0.7 A).

### P18. Material alchemy: two sounds make a third
- **Do/feel:**
  - Drag one material body and press it into another for half a second. If the pair *and the conditions* are right, they fuse into a **new material** with its own timbre: wet clay + light = a glazed bell, charged rod + water = a hissing reed.
  - Most pairs just stick (an ordinary compound body). A few combinations **per universe** are special, like Noita's per-seed recipes [S18], so nobody can look them all up.
  - New materials join the Chorus (P1) as a "materials" ring.
- **Builds on:** the material system (`body.js` mats); the ohm fuse pattern (press for 0.5 s, `K.fuse`); field states from P10; `useed` for the per-universe recipe table.
- **Gestures:** **NEW binding on an existing motion:** drag a *non-ohm body* and press it into another body for 0.5 s.
  - **Drag + release fast upward** (into orbit) and **double tap** (clear/dense) are separate.
  - Dragging bodies today mainly moves or throws them. The fuse timer only starts on overlap held still, so a normal move or throw won't trigger it.
  - It must not fire when a *pinned* body is dragged onto the ground, or on the monolith or fossils.
  - The C-table has no entry for this yet. Wilbow must approve the binding.
- **Taught by:** A faint shared glow between two bodies that *would* combine, and a rising tone while pressing. The guide shows one fusion.
- **Off-screen cost:** Zero.
- **Size:** M–L.
- **⚠ CLASH, rule 8:** physics particle density stays capped per area. A fused body replaces two, so it never adds. **⚠ R1.26 REJ** (attribute glyphs drawn over a creature) isn't involved, because this is about bodies, not creatures.

### P19. Universe secrets: the eye-messages layer
- **Do/feel:**
  - Each universe hides a few **deep, multi-world puzzles**, and the solution is musical. For example:
    - the monoliths of one galaxy each hum one tone; touch them in the order that spells a cadence, and a hidden, silent world appears in the galaxy map;
    - a pulsar's ticks are a rhythm that, played to a fossil, wakes something no one has seen.
  - They're never explained, and only partly hinted by threads (P12). These are for the obsessive players, the way Noita's community still argues over the eye messages [S17].
- **Builds on:** events.js monoliths, fossils and pulsars; P11 locks; P12 threads; `useed`.
- **Gestures:** None new.
- **Taught by:** Deliberately *not* taught beyond threads. Proposal: these are the only things exempt from spec L's "hints for everything new" (Question 10).
- **Off-screen cost:** Zero.
- **Size:** M.
- **⚠ CLASH, spec L:** "Every new ... feature must be discoverable in-game". A true secret is the opposite, so this needs an explicit exception.

---

## Pillar 6: Ableton-style music making (the focus)

**What Ableton's Session View does:**
- **No fixed order.** Clips can be played "at any time and in any order"; the grid offers random access. Each track plays one clip at a time, and scenes launch a whole row together [S19].
- **Launches land on the beat.** Launches are quantised so they arrive in time, and Legato lets you swap loops "without ever losing the sync" [S20].
- **Follow Actions.** They exist because "Music is repetition and change"; they "create structures that will repeat but can also be surprising", even ones that "never exactly repeat" [S20].
- **Racks and macros.** Racks map many parameters to one macro knob [S21].
- **Warping.** Warping makes any recording follow the tempo [S22].
- **Capture what you play.** "Capture and Insert Scene" saves what's playing right now. Recording the Session into the Arrangement turns improvising into a song [S19].

**Already have:**
- **The DAW river:** lanes are voices and beads are notes. You can audition, open patterns, solo, mute, drag pitch and time, loop with a closed loop, draw notes, and use two fingers for length, volume and tempo. A twist transposes. Edits write back into the world.
- **Play mode:** nodes, handles and the tract. Playing the same phrase twice adopts it as the motif. v0.7 K adds movement.
- **Conducting** (v0.7 B): tempo, dynamics, cueing and cut-off.
- **Jams:** cohesion, cueing, breakdowns, sections, lock-in, and E's growing loops.
- **Capture and output:** recording and sharing; colonies as braided lanes.

**The missing Ableton piece is the *clip as an object you launch*. It needs to be in the world, not on a grid (rule 1).**

### P20. Loop stones: clips you can hold
- **Do/feel:**
  - In the DAW river, drag a looped region (made with the existing closed loop on a lane) **out past the river's bank**. It drops into the world as a small, glowing **loop stone** carrying that loop and that voice's timbre.
  - Tap a stone and it **launches on the next bar** (quantised, so it's always in time). Tap again and it stops at the end of its loop.
  - Stones are physical: you can throw them, stack them and leave them.
  - An ohm that picks one up (items.js already has ohms seek and carry items) **learns it** as a motif option, adding to its experience. Stones become a way to *teach* a whole world your riff.
- **Builds on:**
  - daw.js loops and lanes;
  - the instrument body path (a stone is a body, so "tap = strike" becomes "tap = launch");
  - items.js (seek, carry);
  - teach-by-demonstration;
  - v0.7 D experience;
  - the M.nextGrid quantise used everywhere.
- **Gestures:**
  - **In the river:** a horizontal bead drag moves time, a swipe-select then drag shifts or copies, and a closed loop sets a loop. *Dragging a looped region past the river's edge* has no listed binding in GESTURES.md, so it's a **new binding** and needs approval. Check whether daw.js already clamps or uses off-river drags (verify in code).
  - **In the world:** a tap on a body is a strike, so a stone's strike *is* its launch, and double tap (clear/dense) must be ignored on stones (as on ohms).
- **Taught by:** The first time you make a loop in the river, a ghost finger drags it out onto the bank once (spec L style).
- **Off-screen cost:** Stones off-screen are silent records. A playing stone off-screen feeds at most one P8 murmur.
- **Size:** L.
- **⚠ CLASH, t135:** "We dont need a composer". Stones are *your* music placed in the world, not a central composer. Ohms still keep the consensus. **⚠ t177:** "not blurting out the same song over and over". A loop stone repeats by design, so it plays a limited number of times unless you keep it going, and P21 gives it change. **⚠ rule 10:** a stone must follow the consensus key and pulse. It transposes to the world key like Ableton's warping [S22], so it never fights the jam.

### P21. Stone paths: Follow Actions you lay on the ground
- **Do/feel:**
  - Stones touching each other in a **chain** play one after another, like Follow Action "Next" [S20]. Where the chain **forks**, it picks a branch by chance, weighted by how big the next stone is (like "Any", with Chance).
  - A loop back to the start makes a cycle.
  - **Strum across a row of stones** (the existing stroke that crosses bodies) to launch them all at once on the next bar. That's a *scene* [S19].
  - You build songs that "repeat but can also be surprising", in the dirt.
- **Builds on:** P20; strum (`Sf.inkMove`, a stroke crossing bodies rings them); quantised launch.
- **Gestures:** None new. A strum across bodies already rings them; here it launches them.
- **Taught by:** The guide lays a fork once. When a path is live, light travels along it.
- **Off-screen cost:** Zero (stones are inert off-screen).
- **Size:** M.

### P22. Totems: racks and macros you build like a Noita wand
- **Do/feel:**
  - Stack effect items or materials on an instrument body or a stone. Each layer processes the sound in order, top to bottom: a wet layer damps, a clear crystal shimmers, a charged layer drives.
  - **Order matters**, like spells on a Noita wand.
  - Then **pinch the totem**. The existing pinch-for-tension on a body becomes a **macro** that sweeps all the layers together, the way an Ableton macro maps many parameters to one knob [S21]. One gesture gives a huge, musical sweep.
- **Builds on:** items.js effect items (ohms already wear and trade them); body materials; pinch-on-body tension (`Sf.pinch`); P10 states.
- **Gestures:** Pinch on a body = tension (pitch) today, and spreading past 1.65 pops it off or onto the key grid. On a *totem* (a body with layers) the pinch would also drive the layers. That's an extension of an existing gesture's effect, so it needs approval. The pop-to-grid threshold stays.
- **Taught by:** Each new layer shows as a ring, and the first pinch ghost-demos once.
- **Off-screen cost:** Zero. Effects run only when audible on screen.
- **Size:** M–L.
- **⚠ CLASH:** "Player draws a closed shape → effect item" was approved, built in v0.3 and **switched off in v0.4b**. Totems need effect items to exist in the world from ohms, critters or alchemy (P18), *not* from re-enabling the drawn item, unless Wilbow wants it back (Question 5).

### P23. Hum it in (warping your own voice)
- **Do/feel:** Hold an ohm (it listens, as now) and **hum or beatbox** instead of speaking. It hears the tune, warps it to the world's tempo and key (like Ableton's warp [S22]), and plays it back in its own voice as a motif option. Your mouth becomes a MIDI keyboard.
- **Builds on:** listen.js (mic, pitch tracking already exists); the motif system; the grid quantise; teach.
- **Gestures:** Hold on an ohm = listen and speak (it already exists). The new part is *telling a hum from speech* in the recogniser, so there's no new gesture. **C4** (hold vs tap-then-hold) is unaffected.
- **Taught by:** The ohm hums back a short phrase the first time you hold it silently.
- **Off-screen cost:** Zero.
- **Size:** M.
- **⚠ CLASH check:** speech→words must still work. If voicing detection is ambiguous, speech wins (Question 8).

### P24. The river remembers (Session → Arrangement)
- **Do/feel:** The DAW river keeps **the last few minutes of what really happened**: every jam, stone launch and conducted change, laid down as an arrangement. Scroll upstream to hear it again and lift any moment back out as a stone. That's Ableton's "record the Session into the Arrangement" and "Capture and Insert Scene" [S19]. Your best accidental moment is never lost.
- **Builds on:** daw.js; recording (which already captures audio for sharing); stones (P20).
- **Gestures:** Scrolling the river upstream needs a binding. In the river, two fingers on the empty river = tempo and a twist = transpose. A *one-finger vertical drag on empty river* isn't listed in GESTURES.md (in the DNA view it scrolls). If daw.js already uses `scrollY` for one-finger drags, reuse it; if not, it's a new binding (verify, then approve).
- **Taught by:** Older music fades upstream like a wake, and a ghost finger scrolls it once.
- **Off-screen cost:** Zero. A compact note log, capped in length.
- **Size:** M.
- **⚠ CLASH, t213:** "Save /load system later". The remembered river should persist with the world's save, like every other change.

---

## Pillar 7: Endlessness that means something

**The trap:** "18,446,744,073,709,551,616 planets ... will they be perceived as different?" Kate Compton calls it the *10,000 bowls of oatmeal* problem. Mathematically unique isn't the same as perceptually unique. Her fix: let most things be quiet background, and make a few *characterful* things that show "evidence of process and forces" [S23]. Reviews of No Man's Sky used the same image [S24].

**Already have:**
- endless galaxies and NEW UNIVERSE;
- random starts;
- 240-gene ohms with a guaranteed minimum timbre distance (rule 16);
- life that's rare (so finding it *matters*);
- E (jams that keep developing);
- "never the same song" (t177);
- time passing while away.

### P25. Perceptual-uniqueness guard for worlds
- **Do/feel:** You never land on a world that feels like the last one. Each new system and planet is checked against the last few you visited: tuning family, tempo band, terrain silhouette, palette. If it's too similar, it's re-rolled (Compton's generate-and-test and deck-shuffling [S23]). Every arrival feels new.
- **Builds on:** `space.js` and `planet.js` generation; the existing ohm minimum-timbre-distance check (same idea, one level up).
- **Gestures:** None.
- **Taught by:** n/a.
- **Off-screen cost:** Zero (at creation).
- **Size:** S–M.
- **⚠ CLASH check:** with a fixed seed, generation must stay deterministic. The guard must use only what's known at creation, not your visit order, or the same seed would make different galaxies (Question 11).

### P26. Few characterful, many quiet
- **Do/feel:**
  - Most worlds stay quiet and lifeless (life ~1/300 already). The rare living or remarkable ones are **unmistakable**, with visible evidence of history: worn terraces from old jams (P14), fossils, a ring of monoliths, grass grown in the shape of a song (rule 17).
  - Finding one feels like finding a rare Pokémon. Rarity of *places*, not just creatures.
- **Builds on:** `RS.LIFE_ODDS`; events.js; growth.js (phi or Fibonacci, no stamping); history traces; P14.
- **Gestures:** None.
- **Taught by:** n/a.
- **Off-screen cost:** Zero.
- **Size:** M.

### P27. Never-ending threads
- **Do/feel:** Every discovery opens at least one new thread (P12). A woken fossil points to a far key, a meteorite seed points to its home, an awakening (P4) points to a jam it once heard. The map of "where next" never empties: there's no last quest, just the next curiosity.
- **Builds on:** P12, deterministic per universe.
- **Gestures:** None.
- **Taught by:** n/a.
- **Off-screen cost:** Zero.
- **Size:** S (after P12).

### P28. Discovery pacing: one new thing at a time (overwhelm guard)
- **Do/feel:** The game hands out the new systems in order of what you've already done. You won't see loop stones until you've opened the river, sound chemistry until you've poured water, or threads until you've woken a fossil. The guide ohm introduces **one** thing at a time and waits until you've used it. Rain World found that "no guidance at all" didn't work, but neither does handing out everything at once [S15].
- **Builds on:** guide.js; `mods.guide` (already tracks feature use for spec L); spec L hints.
- **Gestures:** None.
- **Taught by:** It *is* the teaching.
- **Off-screen cost:** Zero.
- **Size:** S.

---

## Gesture summary (all against GESTURES.md)

| P | New or changed binding | Status |
|---|---|---|
| P1, P16 | The galaxy and system **chime** plays richer sound | Same gesture, new sound: needs approval (rule 3) |
| P10 | **Wave, star and zigzag** also change the sound of nearby bodies | Same gestures, added effect: needs approval |
| P18 | **Drag a body and press it into another body for 0.5 s** = alchemy fusion | **New binding**: no C-table entry. Must not fire on pinned bodies, the monolith or fossils |
| P20 | **Drag a looped region past the river's edge** = make a stone; a tap on a stone = quantised launch | **New binding** in the DAW (check daw.js off-river drag); on stones, double tap must be ignored (like ohms) |
| P21 | **Strum across stones** = scene launch | Existing strum, new target |
| P22 | **Pinch a totem** = macro | Extends pinch-tension on bodies |
| P23 | **Hold an ohm and hum** = motif | The hold already exists; only the recogniser changes (speech still wins) |
| P24 | **Scroll the river upstream** | Possibly new (check daw.js `scrollY`) |
| All others | None | No conflict |

**Untouched free slots:** a **double tap on an ohm** (ignored since C3, and suggested for K option B in OPEN_NOTES) and **hold on empty ground** (`Sf.hold` returns nothing when nothing is hit). Neither is used here, so they stay free for a later approved need. The **2-finger tap** is no longer fully free: spec L shows a three-finger undo hint on it for the first few uses.

---

## Biggest risks (candid)

1. **Collections are wiped by the v0.7 random start.**
   - **What happens:** spec I gives a random new world on every launch with no auto-load, and t213 says "Save /load system later". Collecting (P1, P2, P3, P7), sediment (P14), threads (P12) and the remembered river (P24) are all pointless if they disappear when the app closes.
   - **Mitigation:** a persistent *collector's record* (the Chorus, `meta.lineage`, threads) that survives across universes and launches even before full save/load. Or build save/load first. This has to be decided before anything in Pillar 1.
2. **Overwhelm.**
   - **What happens:** in an open-ended, no-text game, 28 new ideas on top of v0.7's 12 sections would bury the music. Players lose the thread and stop listening.
   - **Mitigation:** P28 pacing is mandatory, and the build order goes by player value. Wilbow should cut freely.
3. **Scope.** The L-sized items (P20, P10, P13, P18, P22) are each roughly a v0.x of their own. Doing everything is months of builds. The phasing below is designed so every milestone is playable and valuable on its own.
4. **Music gets muddy.** Murmurs (P8), stones (P20, P21), totems (P22) and troupes (P7) all add sound. Rule 10 (one shared acoustic space, consensus, cohesion) and t135 (no composer) could quietly break. Everything new must obey consensus key and pulse, sit back in the mix, and leave the ohms' jams in charge.
5. **Loops vs "never the same song".** Loop stones repeat by nature, and t177 says "not blurting out the same song over and over". Mitigations: play counts, follow-action change, ohms that learn from stones and vary them, and E's developing jams.
6. **Background cost and battery.** Murmurs, stone records, sediment and thread data must stay compact and event-driven (no ticking). Each proposal above states its off-screen cost. P8 is the only one with a continuous voice, and it's capped.
7. **Gesture pile-up.** Four new or changed bindings (P18, P20, P22, P24) plus three effect changes. Each is checked, but more gestures mean more accidental triggers on a phone. Prefer the zero-gesture proposals first.
8. **Rarity frustration.** Gleams and per-universe secrets can feel unfair (Rain World's streamers hit "no-win" luck [S15]; shiny hunting can take years [S3]). Keep gleam odds generous for a phone game, and make every secret learnable in-world.
9. **Collecting pulls against stay-home and no-themes.** Pokémon thrives on travelling teams and named types. Resonance has rejected both (t132, t168, R5.16, t167). The proposals only work because *you* do all the carrying and the "types" are continuous, but any drift toward ohms travelling on their own or labelled forms would break agreed patterns (t210).
10. **Lensure boundary.** P10 and P13 brush against "fire/air/earth elements" and "crystal caves" (deferred Lensure items), and rule 13 says no unbuilt Lensure features. This must be settled before building them.

---

## Phasing after v0.7 (the most efficient order)

The order is: shared foundations first, then zero-gesture wins, then the music-making core, then chemistry and mysteries that reuse all of it.

1. **v0.8: "Hear the world, keep what you find."** Cheap, almost no new gestures, and it fixes Risk 1.
   - **Persistence:** a persistent collector's record across launches and universes (or save/load itself; Question 1).
   - **The Chorus and rarity:** P1 Chorus, P2 Gleam, P5 matchup halos, P7 Troupe hum.
   - **Hearing distance:** P8 distant murmurs (shared audio infrastructure for later), P16 star accents.
   - **Guards:** P25 uniqueness guard, P28 discovery pacing (needed before anything else lands).
2. **v0.9: "Clips in the world" (Ableton core, the music focus).**
   - P20 loop stones, P21 stone paths and scenes, P24 the river remembers, P23 hum it in.
   - This ends with the player composing *with* the ohms in the world.
3. **v0.10: "Sound chemistry" (Noita and BotW).**
   - P10 element→timbre rules, P22 totems (racks and macros, reusing P10 states and P20 stones), P18 material alchemy.
4. **v0.11: "Deeper and further" (exploration and depth).**
   - P9 triangle terrain, P13 depth layers, P17 strangeness with distance, P26 characterful worlds, P14 song sediment, P15 readable inner lives.
5. **v0.12: "Mysteries and lineages" (endless meaning).**
   - P11 song-locked doors, P12 threads, P27 never-ending threads, P19 universe secrets, P3 birthplace forms (after OPEN_NOTES #20 is decided), P4 awakening (after X1 is answered), P6 seeds in songs (sharing).

**Why this order:**
- v0.8's persistence and pacing protect everything after it.
- P8's audio infrastructure is reused by stones and chemistry.
- Stones (v0.9) are the hosts for totems (v0.10).
- Chemistry states (v0.10) feed alchemy and locks (v0.12).
- Threads come last because they tie every earlier discovery together.

---

## Open questions only Wilbow can answer

1. **Persistence:** should your collection (the Chorus, lineage stars, threads) survive between launches and across NEW UNIVERSE, even before full save/load ("Save /load system later")? Or should save/load move up to v0.8?
2. **Which pillars matter most?** Rank: collecting, exploration, depth, width, Noita chemistry and secrets, Ableton music making, endlessness. Cut any proposal you don't want.
3. **Loop stones (P20, P21):** do you want clips as physical stones in the world? They're your loops, laid down by you, not a composer.
4. **The Lensure boundary:** may Resonance build its own "elements change sound" (P10) and deep or crystal caves (P13)? Or are those Lensure-only?
5. **Effect items:** should drawn closed shapes make effect items again (off since v0.4b) to feed totems (P22)? Or should items only come from the world?
6. **Families:** should hatchlings inherit their parents' experience (gap X1)? That decides whether awakening (P4) runs in families.
7. **Moving ohms:** when you carry an ohm to a new world and set it down, does that become its new home?
8. **Humming:** should holding an ohm and humming (P23) teach it a tune, with speech still winning when it's unclear?
9. **Sharing:** is Android's own share and "open with" screen acceptable for sending ohms inside recordings (P6)? It's OS UI, not ours, and the recording share already uses it.
10. **Real secrets:** may a few deep secrets (P19) stay unhinted, as an exception to "hints for everything new" (spec L)?
11. **Seeds:** with a fixed seed, must a universe always be identical? Or may the uniqueness guard (P25) depend on the order you visit places?
12. **Rarity:** gleam odds. Generous (about 1 in 200), Pokémon-rare (about 1 in 4,000) or in between (about 1 in 500, proposed)?
13. **Galaxy chime:** may the galaxy and system chime change from a pitch to "the voices you met there" (P1) and "the place's accent" (P16)?
14. **Pace:** after v0.7, keep v0.x builds this large, or build one pillar per release so you can phone-test each?

---

## Sources

- [S1] Forbes, J. V. Chamary, "Science Explains Why You're Addicted To Pokémon GO" (2016). https://www.forbes.com/sites/jvchamary/2016/07/12/science-collecting-pokemon/
- [S2] "Gotta catch 'em all or not enough time", *Health Psychology Report* (2019). Users quit once the collection was complete. https://doi.org/10.4081/hpr.2019.7714
- [S3] Wikipedia, "Shiny Pokémon": fixed at creation, 1/8192 → 1/4096, no stat benefit. https://en.wikipedia.org/wiki/Shiny_Pok%C3%A9mon
- [S4] Polygon, "Why Pokémon players spend hours and hours chasing shiny monsters" (2016). https://www.polygon.com/2016/12/2/13821976/pokemon-sun-and-moon-shiny-hunting/
- [S5] Satoshi Tajiri on Red/Green development (insect trading, link cable, version exclusives). https://lavacutcontent.com/satoshi-tajiri-pokedex-interview/ and The Guardian (2013). https://www.theguardian.com/technology/gamesblog/2013/oct/11/pokemon-blockbuster-game-technology
- [S6] Bulbapedia, "Regional form". https://bulbapedia.bulbagarden.net/wiki/Regional_form ; Nintendo UK interview on Sun/Moon (2016). https://www.nintendo.com/en-gb/News/2016/October/Learn-all-about-Pokemon-Sun-and-Pokemon-Moon-in-our-in-depth-interview-1149779.html
- [S7] Game Developer, "5 design lessons learned from Breath of the Wild" (the CEDEC 2017 triangle rule). https://www.gamedeveloper.com/design/5-design-lessons-learned-from-i-the-legend-of-zelda-breath-of-the-wild-i-
- [S8] Radiator Blog, "Open world level design: spatial composition and flow in Breath of the Wild" (gravity, heatmaps). https://www.blog.radiator.debacle.us/2017/10/open-world-level-design-spatial.html
- [S9] Game Developer, "Forging Zelda's future by revisiting its past" (chemistry engine, "feel as though they are smart"). https://www.gamedeveloper.com/design/forging-i-zelda-i-s-future-by-revisiting-its-past
- [S10] Thumbsticks, GDC 2017 BotW talk (elements vs materials, three rules). https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies/
- [S11] Mobius Digital, "The Intentionality of Wandering" (Alex Beachum, 2016). https://www.mobiusdigitalgames.com/news/the-intentionality-of-wandering
- [S12] Kelsey Beachum, GDC, "Sparking Curiosity-Driven Exploration Through Narrative in Outer Wilds". https://www.youtube.com/watch?v=QaGu9tGCNbI
- [S13] Outer Wilds, knowledge as progression and the Ship Log rumour mode: "Spatial Fiction Structure in Outer Wilds" https://www.tobiasdn.com/SpatialFictionStructureInOuterWilds.pdf ; "Outer Wilds and the beauty of knowing the end is coming" (2026) https://valomobile.in/2026/08/19/outer-wilds-and-the-beauty-of-knowing-the-end-is-coming/ ; Steam spoiler-safe FAQ https://steamcommunity.com/sharedfiles/filedetails/?id=2160452487
- [S14] Tarn Adams, "Simulation Principles from Dwarf Fortress", *Game AI Pro 2*, ch. 41. https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter41_Simulation_Principles_from_Dwarf_Fortress.pdf
- [S15] Game Developer, "Crafting the complex, chaotic ecosystem of Rain World" (2017). https://www.gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-
- [S16] Noita, official site ("every pixel is simulated"), and Petri Purho, GDC 2019 "Exploring the Tech and Design of Noita". https://noitagame.com/ ; https://www.gdcvault.com/play/1025695/Exploring-the-Tech-and-Design/
- [S17] Noita Wiki, "Eye Messages" (an unsolved community puzzle). https://noita.wiki.gg/wiki/Eye_Messages
- [S18] Noita Explorer (alchemy recipes generated per seed). https://kbjr.github.io/noita-recipes/
- [S19] Ableton Live 12 Reference Manual, ch. 7 "Session View". https://www.ableton.com/en/manual/session-view/
- [S20] Ableton Live 12 Reference Manual, ch. 16 "Launching Clips" (quantisation, Legato, Follow Actions). https://www.ableton.com/en/live-manual/12/launching-clips/
- [S21] Ableton Live 12 Reference Manual, "Instrument, Drum and Effect Racks" (macros). https://www.ableton.com/en/live-manual/12/instrument-drum-and-effect-racks/
- [S22] Ableton Live 12 Reference Manual, "Audio Clips, Tempo, and Warping". https://www.ableton.com/en/manual/audio-clips-tempo-and-warping/
- [S23] Kate Compton, "So you want to build a generator…" (10,000 bowls of oatmeal, perceptual uniqueness). http://www.galaxykate.com/pdfs/Compton%20-%20So%20You%20Want%20To%20Build%20A%20Generator.pdf
- [S24] Vice, "'No Man's Sky' Is Like 18 Quintillion Bowls of Oatmeal". https://www.vice.com/en/article/no-mans-sky-review/
- [S25] Terraria Wiki, "Layers". https://terraria.fandom.com/wiki/Layers
- [S26] "The Pokédex Problem: Designing Features People Use" (Medium). https://medium.com/@etthebrain/the-pok%C3%A9dex-problem-designing-features-people-use-9ff46df9249a
