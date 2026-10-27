> **Note (Wilbow, 2:50 AM Oct 25 2026, 23C 23D):** game ideas called "rules" or "standing rules" in this doc are concepts and features to discuss, not rules (his 10:59 PM Oct 24 words: "Rework all my suggestions and ideas as concepts and features never rules"). How each applies depends on context. His process rules (plan before "go", one job at a time, nothing decided without him, text box on cards) stay rules.

# Resonance v0.8 spec (vc16), draft for Wilbow's approval, Oct 23 2026. BUILD ONLY WHAT IS HERE.
Assumes v0.7 is built (A-L plus D3). Approved items: R2.8, R6.14, R3.17 (light, t145), and Wilbow's steering of
2:25 AM (jam-tuned strings), 2:27 AM (space variety, smooth zoom, many systems), 2:30 AM (realistic space) and
2:32 AM (a path of discoveries), 2:35 AM (persistence), 2:42 AM, 2:44 AM and 2:49 AM (collecting for a chosen home,
and live, seed-verified, tiered longings, section N) and 2:53 AM and 2:55 AM (the '?' guide and
two-stroke glyphs, section O), 3:19 AM and 3:20 AM (drawn instruments: movable ends, length = pitch, varied
voices, ohms and ensembles, and their partial pull on jams, section P) and 3:28 AM (ohms aware of their share of a jam's
timing and frequency space, section Q) MDT. Anything not written here is NOT approved: no extras.
Wilbow, 12:01 AM MDT Oct 23: "Dont build anything I dont mention."

## Rules (standing, for every section)
- No menus, buttons or text UI. Every new thing is taught in the world with text-free hints (section I, same style as
  V07 L: ghost fingertips, glyph-free light, glow and sound; each hint fades after a few uses, tracked in mods.guide).
- Every gesture is checked against GESTURES.md (section J, same format as GESTURES §13). Anything that changes what an
  existing gesture does is listed under "Needs Wilbow" and is NOT decided here; the default lets the build proceed.
- Rule J (V07) holds: off-screen ohms stay cheap. No new per-ohm per-frame work off-screen. Particle density stays capped
  (no new particle systems; reuse the existing capped fx). Mutation stays at 0. Ohms stay near home.
- Saves and seeds: existing saves load; a fixed seed still gives the same world for everything that existed in v0.7.
  Every new save field is optional and versioned (missing = default). Tests keep their fixed seeds (ID_SEED, scene seeds).
- Open questions are numbered from 42 (continuing QUESTIONS_FOR_WILBOW.md, which this spec does not edit). Each has a
  default so the build can proceed; the builder copies them into QUESTIONS_FOR_WILBOW.md at build time.
- Scope warning: v0.8 as written is large (ten items, three of them foundation or renderer work). Section L orders
  the build: H (persistence) FIRST, because E, F, G and N depend on it, then A-D, then E+F, then G, then N, then O (P and Q right after A-D), and proposes a
  split into v0.8a (H, A-D, P, Q, O's counters and two-stroke undo), v0.8b (E-G) and v0.8c (N, the '?' guide). Default: build as the split.
- Sections N and O sit after M in this file (added last). N: gesture check N7, hint in I, tests N6, questions 65-97.
  O: gesture rules O6 (and the undo change in J and K), hint in I, tests O7, questions 98-111.
  P: gesture rows in J, hint in I, tests P8 (and K), build step 2b in L (overnight chunk 3b), questions 112-130.
  Q: no gesture change (Q.8), hint in I, tests Q.9 (and K), build step 2c in L (overnight chunk 3c), questions 131-147.

## A. Drawn closed shape -> effect item (R2.8)
History (from code and DECISIONS; the turn that switched it off, t138-t140, is lost): v0.3 built `Items.fromShape`.
v0.4b turned world items on but kept `RS.ITEMS_DRAW` off: "Player-drawn items stay off: a closed shape still makes a blob."
No reason is recorded. Inference: `fromShape` always returns an item, so switching it on would have removed the
closed-shape blob, an instrument Wilbow already uses, and v0.4b had a no-new-gestures rule. So player-drawn items have
never shipped, and GESTURES §1 row "Other closed shapes -> Effect item" is stale (it describes code that is off).
- Player sees/hears: draw a closed shape and lift at once = a soft blob, exactly as today. Draw a closed shape and REST the
  fingertip at the end (the same still-rest as spiral -> clay) = a ring fills around the fingertip (the v0.7 H.1 hold
  ring, tinted warm instead of clay-grey, with a soft rising tone of the material being drawn). When it fills, the shape
  condenses into an effect item (a small glowing object of the kind `fromShape` picks from the shape and material),
  with the existing item "made" chime. Ohms notice it like a world item: carry it, wear it, use its effect.
- Mechanics:
  - surface.js stroke: after catch, star-loop and `Symbols.offer` (unchanged order), `closed && opt.endHold >= Sf.CLAY_HOLD`
    (450 ms, same `App.endStill`) -> `RS.Items.fromShape(Sf, pts, cmat)`. Without the rest -> blob (unchanged).
    `RS.ITEMS_DRAW` becomes true but only gates this rested path. Egg-routed strokes (v0.7 A) never reach it.
  - Kind: `fromShape` as built (shape and material scoring, continuous); made:'player'.
  - Player-item cap: at most 4 player-made items alive (world items keep It.MAX 14; player items use force:true as now but
    count against their own cap). At the cap the rested shape makes the blob plus the existing "full" shimmer; nothing is
    removed.
  - Ohms take player items through the existing It.think/att/take attraction. No hand-off gesture (none exists).
  - Undo: must call `It.remove` (today `record([it.b])` only removes the body and leaves an orphan in Sf.items). Redo
    re-adds the item record via It.unpack of the saved item. Saved through existing `It.pack`.
  - Hold ring: `App.drawHoldRing` also shows for a closed shape whose end is resting (today it only shows for 1.5+ turn
    spirals). Starts after HOLD_SHOW 120 ms, so a normal lift never shows it.
- Files: surface.js (stroke, undo), items.js (cap, remove on undo), app.js (drawHoldRing), guide.js (hint), GESTURES.md.
- Headless tests (new tests/v08_check.js, section A): closed shape, endHold 0 -> blob; endHold 500 -> item made:'player';
  a loop around an ohm with rest -> catch, not item; a registered glyph with rest -> glyph; a spiral with rest -> clay;
  the fifth player item -> blob + shimmer; undo removes the item record and body; redo restores; pack/unpack round-trip.
  v04b_check.js line 28 asserts `!RS.ITEMS_DRAW`: change it to assert "closed shape without rest = blob" (flagged in J).
- Cost: zero per frame beyond existing items; one item tick per existing It.TICK.
- Risks: players who rest by accident at the end of a blob outline now get an item (mitigated by the visible filling
  ring and undo). Totems (P22) clash: VISION P22 wants items as rack parts; not built here.
- Open: Q42 (rest = item), Q43 (player-item cap).

## B. Ohms carry water (R6.14)
Today: dew collectors (symbio #14, waterLove > .55, not blowers, not percussive, home dry, a field pool within 360 px)
fly to a pool, show a droplet, fly home and bump home moisture. No water volume moves; the droplet is visual only.
- Player sees/hears: water-loving ohms visibly move water. A carrier dips at a pool (a small ripple and plink), the pool
  level drops a hair, a droplet sized to its body rides above it, and at home it pours (a soft splash). After several
  trips a small puddle forms at a dry home and plants and sprouts there perk up. Stop the trips and the puddle slowly
  soaks back into the ground. Water poured by the player (wave) can be fetched too.
- Mechanics:
  - Each completed dew trip moves real volume: `Wt.unpour` 60-120 px² (scales with body size) from the source pool,
    `Wt.pour` the same at home (wetting the home pool if one exists within 120 px, else a new carried puddle).
    Volume is conserved; field pools never drop below their natural level (vol0); player pools can be emptied.
  - Carried puddles: at most 1 per home area and within the existing `Wt.POOLS` cap; soak rate small (a puddle with no
    trips for ~10 min is gone). Saved through existing `Wt.pack` (poured pools).
  - Who carries: the existing dew gate, widened only by allowing the target to be a thirsty plant/sprout within 160 px
    of home (growth.js gets an optional `wet` boost for sprouting and vigour: +15% capped). Home rules unchanged
    (trip aborts on joining a jam, 90 s timeout, cooldown 45 s, near home only).
  - Off-screen: no flight, no droplet. A coarse tally every 60 s per home area moves the same average volume
    (one number per area, no per-ohm work), so pools stay consistent when you return.
  - Grabbing a carrier mid-trip drops the droplet: the water is poured where it falls (no loss).
- Files: symbio.js (dew trip), water.js (carried puddle, soak), growth.js (optional wet boost), field.js (tally),
  GESTURES.md §6/§8 note (droplet still not a tap target).
- Headless tests: 10 trips move 10x volume from pool to home (sum conserved within 1%); field pool never below vol0;
  puddle soaks away with no trips; off-screen tally matches on-screen average within 25% over 30 min sim; pack/unpack
  keeps the puddle; undoing a player's wave pour after carriers took some removes only what remains (no negative).
- Cost: on-screen as today plus two pour calls per trip; off-screen one tally per area per minute. Pools stay capped.
- Risks: water drains from player pools faster than expected; carriers clustering on one pool (each pool takes at most
  2 carriers at a time).
- Open: Q44 (who and where), Q45 (player pools can be emptied).

## C. Regional keys, LIGHT (R3.17, t145)
t145: "The world tuning itself shouldn't be too much influence. The creatures need to retain traits and knowledge in new
environments". Already present: regional TEMPO (`F.region`, 400 px areas, .6/.4 blend from settled jam seeds) and
harmony nests (symbio #7) that remember a jam key and gently tune lone flexible ohms nearby. C must not duplicate nests.
- Player sees/hears: a place where jams have settled keeps a faint memory of their key. The world's own voices there
  (wind rocks, reeds, pool plinks, cave drips) sound in that key, so a valley "hums" in the key of the jams that lived
  there. Ohms keep their own keys; nothing is retuned.
- Mechanics:
  - `Sf.mods.regionKey[area] = {tc, sys}` learnt in `jam.js seedCheck` next to `Sf.region.learn` (same .6/.4 blend on
    tonic cents, sys replaced only after 2 settled seeds agree). No decay.
  - Influence (all small): (i) world voices in the area snap to the area key; (ii) jam proposer tie-break: when the two
    highest `Co.conf` are within .05, the one closer to the area key proposes; (iii) births: a spiral, wild or egg birth in
    the area has a 20% chance its key gene (164) starts at the area key (only if the stroke did not set it; ties to Q14).
  - Never: retune existing ohms, change the consensus rule, change the 3% tempo lean, change nests or traditions (Q16).
- Files: field.js (regionKey), jam.js (learn), cohere.js (tie-break), the world-voice sites (ambient/events/water), genome.js
  or creature.js birth path (gene 164 chance).
- Headless tests: two settled jams in an area -> regionKey set; existing ohms' keyC unchanged after 1 h sim; proposer only
  changes on a tie; birth key chance ~20% (±5% over 500 births); save/load keeps regionKey; nests behave as v0.7.
- Cost: zero per frame; one write per settled seed.
- Risks: world voices clash with a jam in another key passing through (world voices duck under a jam within 400 px as now).
- Open: Q46 (which influences).

## D. Jam-tuned strings (Wilbow, 2:25 AM MDT)
Wilbow, verbatim: "When joining ohms, the resulting strings should be representative of available notes in the jam  of
the currently joined ohms. So the player can use the notes being played and pronpt the direction of established clusters".
Which strings (finding): "joining ohms" = press-fuse (squeeze one ohm into another for ~0.5 s -> `RS.Colony K.fuse`), which
makes a cluster; a cluster builds structures from its gene grammar, and the harp and web plans build STRINGS (pinned, thin,
role 'structure', owner cluster). "Resulting strings" + "established clusters" fit this literally, and Wilbow's earlier
note said fused clusters "carry out more complex actions like building things". Secondary readings: strings woven by an
ohm ('weave' ability), and strings the player draws (pinned rods) near a jam. Infinity bonds, pairing links and conduct
threads are visual only. Today every string snaps to the GLOBAL session key (`S.tune` -> `M.snap`), not the jam's key,
so a cluster's harp can clash with its own jam. That is the gap.
- Player sees/hears: the strings a cluster builds always sound in the notes its jam is playing. Strings on the jam's
  current chord glow softly in the jam's colour; notes the ohms just played brighten on the strings. When the jam changes
  chord or key, the strings slide (a short glide) to the new notes on the downbeat. Play them (tap or strum) and the ohms
  hear you: they answer in the jam's key, and if you keep playing high and busy they swell; sparse and low, they drop
  back; lean on a chord's notes and they tend to move there. Nobody leads: you are one voice among them.
- Mechanics:
  - Tied strings: colony strings whose cluster members are in jam E; weave strings whose owner is in E; player-drawn
    strings attached to a member or within the jam leash (~190 px) of one (default yes, Q47). A cluster not in a jam
    ties its strings to the cluster lead's mind (tonic + sys).
  - Tuning: physical order kept (longer/looser = lower); each tied string's physical pitch snaps to the nearest note of
    E.sys at E.tonicC (plus keyArea during a K section) via the existing `J.snap(Sf, m, f, strong)`. Then (theory correction, 3:50 AM, from MUSIC_THEORY.md
    §4.3): sort the tied strings by raw pitch and give each the nearest degree STRICTLY ABOVE the previous string's degree,
    so no two strings share a note (was: plain nearest-degree snap, which could merge neighbours); once per chord change. Chord tones
    (proposer's hb.cur) glow; pitches members sounded in the last 2 bars brighten. Retune glide 120 ms at the downbeat.
    Ohms striking tied strings also use the jam key (default yes).
  - Feeding the jam: a player strike on a tied string is passed to `H.hear` as a "player voice" (weight .8 of a member
    note, never the proposer), so followers' chord beliefs move by ear evidence as with any member. `D.playerPhrase`
    (already prefers the nearest cluster) answers in the jam key instead of the global `M.nearestDeg`.
  - Direction nudge: the lead's `H.leadBar` section choice gets one nudge per 4 bars from the player's last bar
    (density/register high -> swell/B more likely; sparse/low -> drop/A more likely; +.15 on the seeded choice, never a
    forced section, never a key change). Shown with existing cues (nod, swell). No central composer.
  - Pinch grid-pop (`b.free`) unties a string (free pitch, as today); pinching back re-ties. Pinch tension changes the
    physical pitch, which then steps to the next jam note.
- v0.7 B conducting: while the baton is up, one-finger strokes conduct, so strings are not played; a conducted cut-off
  silences members; conducting changes dynamics and tempo, not string tuning. D3: taps on strings count as directing, so
  ohms in view hold (desired); pans and zooms do not.
- Files: sound.js (`S.tune` gets a tie lookup), jam.js (reuse J.snap; tie map), colony.js and abilities.js (owner tags exist),
  harmony.js (player voice in H.hear, nudge in leadBar), duel.js (answer in jam key), render.js (chord glow), guide.js.
- Headless tests: cluster harp in a jam: every string pitch is in E.sys/E.tonicC; after a K section, retuned within 1 bar;
  order kept; a free string ignores the jam; player strikes on chord-tone strings shift follower beliefs (H.scoreOf) more
  than off-chord ones; nudge at most once per 4 bars; 30 min soak: no section forced, no key change from the player alone;
  no change for strings far from any jam.
- Cost: retune only on chord/key change (event), glow only on-screen. Off-screen: none.
- Risks: player power feels too weak or too strong (weight .8 and +.15 are tunables); strings glide audibly during a long note.
- Open: Q47 (which strings), Q48 (tuning mapping), Q49 (nudge strength).

## E. Space: variety, smooth zoom, many systems (Wilbow, 2:27 AM MDT)
Wilbow, verbatim: "More visual differences in space.  Zooming in and out should feel smoother between. Make many systems in
each galaxy or cluster, without too much load".
Today (from code):
- One galaxy per universe (`RS.Universe`, space.js): `RS.NSYS = 480` systems, all generated up front (position on 2-4 seeded
  arms, temperature, luminosity, size). A system's bodies (`RS.System`): 1-6 planets (home 4), types rocky/ocean/icy/gas/
  ringed by temperature, moons, 60% comet, 50% belt. Galaxy persona (S8) comes from the hot/cool fractions of ALL systems.
- There are no star clusters; "NEW UNIVERSE" (pinch out at minimum galaxy zoom, C17) makes the next galaxy.
- Drawing (app.js): galaxy = one radial nebula gradient (hue from the seed) + one arc per on-screen system, looping all 480
  every frame; at gcam.z > 4 every visible system's bodies are generated and cached forever (`App.sysCache`). `App.starAt`
  and `App.spaceMusic` also loop all systems. System view = gradient star, 64-segment orbit lines, flat-filled planets with
  an outline ring.
- Levels have separate cameras (surface cam.z, system scam.z, galaxy gcam.z) and switch with `App.go`: a 650 ms black iris.
  Surface -> system when cam.z <= .013 during a pinch; system -> surface when scam.z > 3.2 on lift (then surface zooms in
  from .02); system -> galaxy when scam.z < .45 on lift; galaxy -> system when gcam.z > 24 on lift or double tap. These are
  the hard cuts.
- (a) Visible variety, procedural and continuous (no themes, no presets), from the seed and existing data:
  - Galaxy: arm count and twist (exist), plus seeded bulge size, bar length (0 = none), arm width, disc thickness/tilt
    (ellipse), dust-lane strength, and star-forming knot density, all continuous and correlated with the S8 persona
    (hot/young -> bluer knots and brighter arms; old/cool -> smooth, yellow, larger bulge).
  - Clusters (Q53): seeded open clusters (tight, young, bluish groups of 20-80 systems along arms) and globular clusters
    (old, round, dense, 100-400 systems in the halo). Their stars are ordinary systems with cluster-shaped positions and
    shared age (temperature drawn from the cluster's age).
  - Systems and stars: colour and size from temperature/luminosity (exists), plus glow size by luminosity, and body mix
    already in the data (types, rings, moons, belts, comets) made visible at the galaxy zoom (a faint belt haze, a hint of
    a giant's colour) when near.
  - Bodies: texture from type and seed (section F), so two rocky worlds never look alike.
- (b) Seamless zoom: one continuous log-scale "space depth" across galaxy, system and surface. Each level keeps its own
  camera and the same gesture thresholds, but the switch is no longer a cut:
  - Inside a crossfade band before each threshold the next layer is drawn under or over the current one, aligned to the
    same screen position and scale (e.g. at surface cam.z .05 -> .013 the planet as seen from the system view fades in,
    centred on the planet, with its orbit and star appearing; at system scam.z .6 -> .45 the galaxy around the star fades
    in at the matching scale; zooming in reverses).
  - When a threshold triggers, `App.go` switches level with the new camera set so the frame looks identical (no jump),
    and the black iris is replaced by the finished crossfade (the level tone stays). Momentum: the zoom eases on with the
    pinch's last velocity for ~300 ms, so the hand-off feels continuous.
  - Expensive work at the switch (`App.leaveSurface` save, `enterSurface` build) is spread: the save is deferred to idle
    after the crossfade; the surface build starts when the band is entered so it is ready at the threshold.
  - Gestures unchanged: same pinch, same thresholds, same lift rules, C13 twist freeze and C17 untouched.
- (c) Many more systems without load:
  - Count: default 6,000 systems per galaxy (Q54), the first 480 identical to v0.7 (same hash per index, same positions,
    same seeds), the rest added with index >= 480 in a seeded tile grid (64x64 tiles over the disc). A tile's systems are
    generated (position, T, lum only) when the tile is first in view and kept in a small LRU; bodies are generated only
    when a system is near the camera (LRU of 64 `RS.System`s replaces the unbounded `App.sysCache`).
  - Persona (S8) stays computed from the first 480 so existing galaxies keep their music (Q55).
  - Draw only what is in view: a tile index gives the visible systems; far systems are batched points (one cached
    sprite layer per zoom band, see F), mid systems are small glow sprites, and only the nearest ~40 get full detail.
    `App.starAt`, the tap targets and `App.spaceMusic` use the tile index, not a loop over all systems.
  - Tap targets: at a zoom where systems draw as dust, taps snap to the brightest system within R (so a double tap still
    lands on a star you can see).
  - Saves: keys `useed:i` stay valid (indices are stable). Orbit nudges, alive, lineage, seeds unchanged.
  - V07 I random start: `App.freshPick` samples over all systems (more variety; default) using the tile generator;
    `?fixed=1` and test seeds still work. Tests that pin a seed's exact pick get updated expectations (flagged in J).
- Files: space.js (morphology, clusters, tiles, LRU), app.js (draw, cameras, crossfade, starAt, spaceMusic, freshPick),
  render.js (planet-from-orbit layer for the band), new spacedraw.js (pure draw-list builder), GESTURES.md (no change; note).
- Headless tests (tests/v08_space.js, node, no DOM): systems 0-479 identical to v0.7 for 5 seeds (positions, T, seeds,
  bodies); persona identical; 6,000 systems; tile generation deterministic and order-independent; the draw-list builder at
  10 camera poses returns <= 40 detailed + bounded sprites; builder time <= 1.5 ms per call; memory: LRU never > 64
  systems; freshPick still covers all 5 planet categories over 200 seeds; crossfade alpha continuous (no step > .1 per
  frame across each threshold). Browser (pw_space.js): frame time in galaxy, system and each band, v0.7 vs v0.8,
  Chromium with 4x CPU throttle as a phone proxy; v0.8 must not be slower than v0.7 in any view.
- Budget: space frame <= 8 ms render at 4x throttle (60 fps headroom), no frame over 16 ms during a band, tile
  generation <= 2 ms per frame (spread over frames). Off-screen surface ohm cost unchanged (the surface is torn down as
  today; no ohm work in space views).
- Risks: three cameras aligned in one frame is fiddly (worth its own test); dense clusters make tapping a single star hard.
- Open: Q50 (iris), Q53 (cluster meaning), Q54 (count), Q55 (persona), Q56 (new systems in random start).

## F. Realistic space look (Wilbow, 2:30 AM MDT)
Wilbow, verbatim: "Nicer looking, more realistic space, planets and star systems, plus any connecting features.  Less cartoon
looking graphics." Builds together with E (same renderer). A separate visual-style bot owns art direction across all
visuals in /workspace/softsound/ART_DIRECTION.md (not yet written). F defines the physical look and exposes every visual
parameter in one table, `RS.SpaceLook`, so ART_DIRECTION.md can set them; where it disagrees, ART_DIRECTION.md wins.
- Player sees: stars are points of light, not discs: a tight bright core with a soft falloff, coloured by temperature
  (red-orange cool dwarfs, white-yellow suns, pale blue hot stars), never saturated. Galaxies are clouds of light with
  dust lanes and glowing knots. Planets are lit spheres: a lit side and a dark side with a soft terminator facing their
  star, a darker edge, a thin glowing atmosphere rim (bluish on wet rocky worlds, warm haze on giants), banded giants,
  icy caps on cold worlds, a glint on oceans, rings that cast a shadow. Orbit paths are faint threads. Nothing has a flat
  outline or a cartoon fill.
- Look, per element (all procedural from seeds and existing data, no themes or presets):
  - Star colour: blackbody from T (`RS.bbRGB` exists), then a perceptual desaturation and exposure (real stars look near
    white with a tint). Brightness from luminosity.
  - Glow and bloom: gaussian core + power-law halo (~1/r²) pre-rendered as sprites, drawn additively ('lighter').
    No diffraction spikes by default (param).
  - Nebula and dust: layered value/fBm noise (2-3 octaves per layer, 2-3 layers with slight parallax), shaped by the
    galaxy morphology from E; dust darkens (multiply), emission glows (add), hues from the persona and star population.
  - Planets: albedo texture from type + seed (gas bands along latitude with seeded turbulence; rocky noise; ocean deep
    tone + glint; icy high albedo + caps by temp), lit by a terminator facing the star, limb darkening, atmospheric
    scattering rim scaled by `atmo` and tinted by type and star colour. Moons the same at small size.
  - Rings: thin translucent bands with seeded gaps, shadow on the planet and the planet's shadow on the ring.
  - Connecting features: orbit paths very subtle (thin, low alpha, brighter only near the body), lineage constellations
    and the discovery trail (G) as faint light; the system view's background is the galaxy as seen from that system (the
    cached dust band, oriented from its position), so galaxy, system and planet share one sky across the E crossfade.
- Canvas 2D is enough: everything is sprites, gradients and cached layers. WebGL would give real bloom and per-pixel
  noise but costs a second renderer path, Android WebView context-loss handling and a much bigger build (L). Default:
  Canvas 2D; WebGL only if Wilbow asks (Q51).
- Caching (the phone budget):
  - Per body: albedo + limb sprite per zoom band (power-of-two radii 8-256 px), lit-side shadow and rim as separate
    sprites rotated toward the star each frame (rotation is cheap). Built lazily, LRU, <= 24 MB total.
  - Per galaxy and zoom band: nebula/dust layers at low resolution (e.g. 512²), rebuilt only when the band changes,
    built over several frames (or in a worker with OffscreenCanvas when available).
  - Far objects: cheap points (1-2 px fillRect or a 4 px glow sprite per colour bin); far systems baked into the band layer.
- `RS.SpaceLook` parameters (defaults set by the builder, owned by ART_DIRECTION.md): exposure, gamma, starSaturation,
  starTempShift, coreSize, haloStrength, haloFalloff, bloomRadius, spikes (0), nebulaDensity, nebulaOctaves, nebulaHueSpread,
  emissionStrength, dustOpacity, dustContrast, starfieldDensity, grain, vignette, ambient, terminatorSoftness,
  limbDarkening, atmoStrength, atmoTint, oceanGlint, bandContrast, iceCap, ringAlpha, ringShadow, orbitAlpha, orbitWidth,
  constellationAlpha, trailAlpha, trailWidth, markGlow, crossfadeCurve, bandEdges (zoom band limits).
- Files: new spacedraw.js (sprites, layers, caches), space.js (morphology fields), app.js (drawGalaxy and drawSystem call
  spacedraw), render.js (surface sky stays as is; only the far-zoom planet layer used in the E band).
- Headless tests: SpaceLook has every listed key; sprite builder deterministic for a seed (hash of pixels, node canvas
  stub or pure ImageData); no flat outline calls (no `stroke()` of a body circle) in the draw list; cache never above
  24 MB; render_metrics-style check that star colours are monotonic in T and saturation <= starSaturation.
  Browser: the E budget applies with F on.
- Budget: as E (<= 8 ms at 4x throttle); first view of a new galaxy may take up to 300 ms of spread background work
  (no frame over 16 ms).
- Risks: "realistic" vs the soft look of the surface; that is ART_DIRECTION.md's call. Noise layers are the main cost.
- Open: Q51 (WebGL), Q52 (realism vs the rest of the art).

## G. A path of discoveries (Wilbow, 2:32 AM MDT)
Wilbow, verbatim: "Space exploration. Could have a meaningful path through whole huge galaxies, tracing a path of
discoveries". Reuses VISION_PROPOSAL P12 (threads drawn in light, drawn only, no icons), P1 and P16 (the galaxy chime
hinting at what a place holds; changing the chime needs approval, open Q37), and P26 (few characterful places). P17
(strangeness with distance) and P25 (uniqueness guard) are NOT part of this item.
- Player sees/hears: in the galaxy and cluster views, a soft trail of light links every place you have landed, in order,
  from where you started. Each stop glows with what you found there: small points of light around it for the ohms you met,
  a tint for the voices you heard, a brief sparkle if a rare event happened (flare, supernova, pulsar, accretion), a dim
  pale glow for a fossil, a breathing halo for a world with life. Near the end of the trail, systems you haven't visited
  hint at what they hold: a faint shimmer in the colour of their worlds, and while you rest the view, a very quiet chime
  from their direction (panned, distance-muffled). The trail grows as you travel, so the galaxy fills with your story.
- Mechanics:
  - Record: galaxy record `trail = [{i, b, n, f}]` (H): system index, body key, a small visit count, and a found bitmask
    (met ohm count bucket, voice families heard, rare events, fossil, life, jam joined). One entry per landing (merged
    with the last one if the same body); events while on the surface set bits (cheap event hooks, no ticking).
    Capped 256 stops per galaxy (older consecutive stops on the same system merge). Saved incrementally by H.
  - Draw: one polyline (positions via `App.gScreen`, simplified at low zoom) + one point per stop, light marks from the
    bitmask (no icons, per t164 "not as symbols"; Q58). Drawn in galaxy and cluster views and faintly as the background
    in the system view (F's shared sky).
  - Reasons to travel: the 3-6 unvisited systems nearest the trail head get a shimmer from data already known at
    generation (body categories, life, star type); while the view rests > 1 s, up to 2 of them play the EXISTING chime
    quietly, panned from their direction, every few bars via `App.spaceMusic`. If Q37 is approved, that chime becomes the
    P16 fragment in the place's tuning; until then it stays the current single-pitch chime (Q57).
  - Persistence and V07 I: the trail lives in the galaxy record of section H (per galaxy seed). Q30 is now answered
    (persistence first, 2:35 AM), so old trails stay reachable through the way back in H. NEW UNIVERSE starts an empty
    trail and keeps the old one stored.
- Gestures: none new. Taps and double taps on stops are taps on stars (chime, enter system); the trail and marks have no
  hit test; pan, zoom, fly-home double tap and C17 are untouched.
- Files: app.js (trail record on enterSurface, draw, spaceMusic hints), surface.js/events.js (found-bit hooks),
  spacedraw.js (trail polyline), save registry from H (the trail registers as a galaxy-scope component).
- Headless tests: landing on 5 bodies -> 5 ordered stops; landing twice on the same body -> one stop with n=2; bits set by a
  met ohm, a rare event, a fossil; cap 256 stops; galaxy-record round-trip; trail draw-list = 1 polyline + N points;
  hint chime never more than 2 voices and never in surface view.
- Budget: <= .3 ms per galaxy frame for the trail; storage <= 4 KB per galaxy.
- Risks: a long trail clutters the view (older segments fade with age, never deleted).
- Open: Q57 (hint chime), Q58 (marks).

## H. Persistence foundation (Wilbow, 2:35 AM MDT). BUILD FIRST: E, F, G, N and O depend on it.
Wilbow, verbatim: "Persistence of changes made by the user are paramount, but not at expense of playability for long
periods.  Use well understood mechanics of building sandboxes mixed with novel approaches for handling current and future
build concepts, engines, affects glyph etc". This answers Q30: persistence comes first.
Today (from code):
- `RS.Store` (store.js, SAVE_V 3): IndexedDB first with an in-memory cache loaded before start, each write puts the new copy
  and the previous good copy (.bak) in one transaction, plus a best-effort localStorage mirror (values up to 350 KB;
  localStorage is ~5 MB per origin on Android WebView). A soft cap of 6 MB per key; versioned migrations (v1->v3).
- Keys: `rs1:meta` (one record: useed, lineage <= 400, alive, orbit nudges, mods per world, seeds from orbit, drift);
  `rs1:s:<useed>:<sys>:<body>` per world; `rs1:ark` for the ark world (seed-independent).
- A world save is `Sf.pack()`: the WHOLE world as one JSON (angular chunks with bodies and creatures, mods incl. mods.guide,
  mix, daw, items, clay, growth, water, satellites), trimmed above 180 KB. Written every 10 s (`setInterval`), on leaving a
  world, on DAW close and DNA exit, and on hide. `JSON.stringify` of the whole world runs on the main thread each time.
- v0.7 I: every launch picks a fresh galaxy seed and overwrites `meta.useed`; `App.freshKey` stops the launch world from
  loading. Worlds changed in earlier launches are still saved under their old `useed` keys, but nothing in the game can
  reach them; the ark save (`rs1:ark`) is never chosen, so it is safe but unreachable. Hint progress (`mods.guide`) lives
  inside each world's mods, so hints restart on every fresh world (S43, Q10).
Proven sandbox mechanics (Minecraft/No Man's Sky style):
- The world stays procedural from its seed; only player-made changes are stored (deltas): bodies the player made, generated
  things removed or moved, terrain/water/growth edits, ohms (genome code, home, experience, state), items, mods, DAW edits.
  Anything regenerable from the seed is not stored.
- Chunked by place: profile (player-wide) -> galaxy (useed) -> world (system + body) -> surface region (the existing angular
  chunks). Keys: `rs2:p`, `rs2:g:<useed>`, `rs2:w:<useed>:<sys>:<body>`, `rs2:c:<useed>:<sys>:<body>:<ci>`.
  - Profile: lineage, hint progress (moved from per-world mods.guide), stats, the index of remembered galaxies.
  - Galaxy record: trail (G), orbit nudges, alive, seeds from orbit, the index of changed worlds.
  - World header: mods, music, mix, daw, water, global items; region chunks hold bodies and ohms.
- Lazy load: entering a world reads its header and the chunks in view; other chunks load as the camera nears them (the
  surface already activates chunks by angle). A galaxy record loads when its galaxy opens.
- Incremental, debounced, off the frame: edits mark a chunk dirty; 2 s after the last edit (at most 30 s) the saver runs in
  idle callbacks (`requestIdleCallback`, fallback: a 3 ms slice after a frame), serialising one dirty chunk per slice.
  On hide or pagehide, only the dirty headers and chunks are flushed (small, synchronous). The 10 s whole-world save goes.
  The .bak pair and the localStorage mirror stay (the mirror for the profile, galaxy records and headers only).
- Budget: per world <= 256 KB typical (1 MB hard), galaxy record <= 32 KB, profile <= 64 KB, total target 50 MB in IndexedDB.
  Ask the WebView for persistent storage (`navigator.storage.persist()`), report `navigator.storage.estimate()` in stats.
- Compaction and pruning: trivial deltas are dropped when a chunk is written (a dissolved blob, a consumed item, water within
  1% of natural, a moved generated pebble back within 4 px). Far chunks store ohms in compact form (genome code, home,
  experience; no poses). A world with no non-trivial delta is not stored at all (it still appears on the trail). Above the
  total budget, compaction runs on the oldest worlds first; a world with player-made changes is never deleted.
Novel parts for current and future concepts:
- A versioned, registry-based component schema: `RS.Save.register(id, {scope, v, pack, unpack, migrate: {1: fn, ...}})`.
  A chunk or record is `{v, t, comp: {id: {v, d}}}`. Components registered in v0.8: bodies, ohms (genome code incl. voice
  engines), experience (v0.7 D/D2), abilities state, cultures/traditions, effect items (A), user glyphs (Symbols),
  clay, growth, water and carried puddles (B), region tempo and key (C), DAW/mix, trail (G), orbit nudges, hint progress.
- Unknown components (from a newer build, or a removed feature) are kept verbatim and written back untouched, never dropped.
- Old saves migrate forward: a v3 whole-world save is split into header + chunks the first time that world loads (lazy);
  the old key stays as a backup until the new write is confirmed, then is kept as `.v3` for one version.
Long-session playability:
- Memory cap: one live world; up to 8 world headers and 32 region chunks cached (LRU); far chunks are packed and unloaded
  after leaving view for 60 s. Persistence memory <= 20 MB.
- No growth in frame cost over hours: per-frame save work is bounded by the idle slices; dirty sets, undo history and the
  trail are capped; nothing scans all saves while playing (indexes are kept in the profile and galaxy records).
Random start resolved:
- Launch stays a fresh random world (V07 I; Q20 default), but every world you have changed persists and stays reachable:
  each changed world is in its galaxy's index and on its trail, and each galaxy with a changed world is in the profile.
- Migration on first v0.8 start: (1) scan existing `rs1:s:*` keys and register each changed world in its galaxy record;
  (2) the ark save (`rs1:ark`) is moved to `rs2:w:<useed>:0:ark` for the galaxy it belongs to (the useed of the oldest
  lineage entry with sys 0, else the pre-v0.7 default 1) and marked as home in that galaxy; (3) `rs1:meta` lineage, orbit,
  alive and seeds are split into the profile and galaxy records. Nothing is deleted.
Way back to a known world (text-free, gesture-based; NEEDS WILBOW, Q59):
- Inside a galaxy: the trail (G) shows every place you landed; a world you changed glows softly in the system view. Double
  tap the star (enters the system, as today) and double tap the glowing body (enters it, as today): it loads your save.
  No gesture change.
- Across galaxies: at minimum galaxy zoom, galaxies you have changed show as faint distant smudges around the edge of the
  view (their own colour and shape from F). Double tap a smudge = fly there (it becomes the current galaxy, its trail and
  worlds load). This changes "double tap on empty space = fly home" only when the tap lands on a smudge. The ark's galaxy
  carries the home beacon.
- Files: store.js (rs2 layout, idle saver, budget, persist), new save.js (registry, components, migrations), app.js (save
  calls, launch, way back, galaxy smudges), surface.js (dirty marks, chunk pack/unpack through the registry), every module
  that owns saved state registers a component (items, symbols, mold, growth, water, field, trad, experience, daw).
- Headless tests (tests/v08_save.js and tests/soak_save.js, node with an in-memory IndexedDB stub):
  - round-trip: a world saved and reloaded gives the same bodies, ohms (genome codes, homes, experience), items, water,
    glyphs, mods; a world regenerated from its seed with no deltas stores nothing.
  - registry: an unknown component survives load and save byte-for-byte; a v1 component migrates to v2.
  - migration: fixture v3 saves (a world, the ark, rs1:meta) migrate; the ark is reachable from its galaxy record; nothing
    deleted; a second start does not migrate again.
  - random start: three launches, a change in each world; all three worlds are in the profile and load with their changes.
  - soak (simulated 6 hours at accelerated time): every sim minute random strokes, births, pours, items, glyphs, travel
    between 20 worlds and 2 NEW UNIVERSEs. Checks: total size within budget and size(6 h) <= 1.5 x size(1 h) at a steady
    edit rate; world load <= 150 ms (node); saver slice p99 <= 3 ms; sim step time at hour 6 within 10% of hour 1; heap at
    hour 6 within 15% of hour 1; the last state round-trips.
  - Browser (pw_save.js, extended): no frame over 16 ms caused by saving during a 10 min scripted session; a hide flush
    under 30 ms.
- Risks: migration bugs are the worst kind (keep every old key; test on copies of Wilbow's real save if he shares one);
  idle callbacks are rare on a busy phone (the 30 s cap forces a slice).
- What this means for older questions:
  - Q9 (way back to the ark; answered "OK to wait for save and load"): save and load is now being built, so the way back
    above is that answer; it needs approval for the cross-galaxy part (Q59).
  - Q10 (hint progress across launches): yes, by default; hint progress moves to the profile, so hints stop repeating (S43).
  - Q20 (random world vs coming back to your world): default keeps the random launch and makes every changed world
    reachable (Q60 asks if launch should instead resume the last world).
  - Q24 (an ohm set down on a new world becomes its home?): still open; the save model supports either (home is a field
    of the ohm's record), no default change here.
- Open: Q59 (way back), Q60 (launch), Q61 (budget and the never-delete rule).

## I. In-game hints for everything new (same style as V07 L: no text; each shows at most 3 times, at most one at a time,
20 s apart, after the guide's lessons; stops for good once the player has done it; progress in the profile from H)
- A (rested shape -> item): a ghost fingertip draws a loop on open ground, rests; the warm ring fills; the shape condenses
  into a glowing item with its chime. Shown after the player has made 3 blobs.
- B (water carriers): none needed (it is watched, not done). The first time a carrier pours at home on screen, the puddle
  shimmers once with a soft splash.
- C (regional keys): none (ambient).
- D (jam-tuned strings): the first time a tied string is on screen during a jam, its chord-tone strings pulse with the jam's
  beat twice, and a ghost fingertip taps one; the nearest member nods (existing cue).
- E/F (space): no new gesture to teach. The first crossfade band is self-explaining.
- G (trail): the first time the galaxy view opens after a second landing, the trail draws itself from the first stop to the
  newest with a soft rising tone (P12 "taught by").
- H (way back): the first time a world you changed is on screen in the system view, its glow pulses with a ghost double tap
  over it; at minimum galaxy zoom with a remembered galaxy, a ghost double tap over its smudge (only if Q59 is approved).
- N (home and longings): the first time the player rests a finger on bare ground for 450 ms, the ring starts and a ghost
  fingertip stays still beside it until the hearth grows (shown only before any hearth is claimed, max 3 times). The first
  longing: its glyphs light in order with a ghost tap over them, then a ghost rest (ring) over it. A shimmering match: a ghost
  catch loop (N4). Carrying a match: a ghost tap on the home world in the system view. Flick-away is not taught (Q86).
- O ('?' guide): once, the first time a longing is live (or after the guide's lessons end), the guide draws a ghost '?' with its
  point under it (two strokes) beside itself as a fingertip trail (`SY` ink playback), max 3 times (Q110). The guide's undo
  lesson now draws the hook and then the arrowhead (O6).
- P (drawn instruments): after the player's 3rd rod, a ghost fingertip rests on one end and drags it a little; the rod
  lengthens and the note slides down with its soft clicks; then it slides back. After the 3rd blob, the same on a blob's edge.
  The first time 3 bars lie side by side (or 3 blobs around a spot), the ensemble's shared pulse and rising sweep is the hint.
  Chaining: a ghost stroke starts just beside a rod's end and draws on from it. Ohms playing shapes and the jam's lean are
  heard, not taught.
- Q (room in the jam): once, the first time a jam of 4+ arranges itself on screen, members' glows lift to the height of
  their band (low ohms low, high ones high) with the existing step-back and lean-in; max 3 times (Q145).
- Checks: each hint at most 3 times; none during a jam's settling or the baton; none in DNA or DAW.

## J. Gesture check against GESTURES.md (§13 format; done BEFORE building)
**A. Closed shape + end rest (>= 450 ms) = effect item.**
- *Catch* (closed loop around an ohm): tested before items, so a rested loop around an ohm still catches. No conflict.
- *Star-loop record* (loop around the sky star): tested before items. No conflict.
- *Registered glyphs* (`Symbols.offer`): tested before items; a rested glyph is still the glyph. No conflict.
- *Spiral + rest = clay*: spirals are classified first (`spiralFirst` excludes closed), so no conflict.
- *Egg words* (v0.7 A): a circle that starts on the egg is egg-routed and never reaches the item path. No conflict.
- *Hold / listen* (450 ms still from touch start, < 10 px): a drawn shape has moved far more than 10 px. No conflict.
- *Teach line, halo letters, strum*: tested earlier in the pipeline; a strum (ink across bodies) returns before shapes.
- *Conducting baton*: while it is up, one-finger strokes conduct, so no shapes are drawn. No conflict.
- *Undo*: three-finger tap removes the item (with the It.remove fix). No conflict.
- Verdict: no conflict. **Behaviour change to flag (Q42):** a closed shape whose drawer rests at the end used to make a blob;
  it now makes an item. GESTURES §1 row "Other closed shapes -> Effect item" is rewritten to "Closed shape = blob; closed
  shape + rest = effect item".
**B. Water carriers.** No gesture. Tapping a carried droplet stays as on bare ground (§6, §8). Grabbing a carrier mid-trip
  is the existing grab; the droplet is poured where it falls. Verdict: no conflict.
**C. Regional keys.** No gesture. Verdict: no conflict.
**D. Jam-tuned strings.** Uses tap = strike, ink across bodies = strum, pinch on a string = tension, pinch past 1.65 = grid pop.
- *C11* (ink across a settled jam's ohms only glows): ohms still only glow; strings are bodies, so they ring. No conflict.
- *Strum vs rod drawing*: a stroke that crosses bodies returns 'strum' and draws no rod (as today). No conflict.
- *Pinch tension*: the pitch now steps through jam notes instead of the global scale. **Behaviour change to flag (Q48).**
- *Grid pop*: unties the string (free pitch). Same gesture, a meaning added. **Flag (Q48).**
- *Baton (v0.7 B)*: while up, strings cannot be strummed. *D3*: taps on strings count as directing (ohms in view hold).
- *Teach by demonstration* (repeat a 4+ note phrase): still works on tied strings, now in the jam key.
- Verdict: no new gesture; two existing string gestures change effect (flagged).
**E/F. Space zoom, variety, realism.** Same pinch, same thresholds, same lift rules; C13 (twist freezes zoom) and C17
  (pinch out at minimum galaxy zoom = new universe) unchanged; double tap on a star or body unchanged.
- *Tap targets with 6,000 systems*: at dust zoom, taps snap to the brightest system within R. **Behaviour change to flag
  (Q54):** a double tap at low zoom may enter a different (brighter) system than the nearest dim one.
- *The iris*: replaced by the crossfade (visual only; Q50).
- Verdict: no gesture conflict.
**G. Trail.** Drawn only, no hit test. Stops are stars (tap = chime, double tap = enter). Pan, zoom, fly-home and C17
  unchanged. Verdict: no conflict. The hint chime is a sound change to an existing feature (Q37, Q57).
**N. Home and longings.** See N7: the ground hold and sky hold are new meanings for holds that did nothing; tap and
  flick on the longing, home-world landing, the fly-home target and the full-colony fuse are flagged (Q65, Q68, Q69, Q86).
**O. Two-stroke glyphs (Wilbow, 2:55 AM).** GESTURE CHANGE, built in v0.8a:
  | Gesture | Was (GESTURES.md row 53, C9) | Now |
  | Hooked return arrow | one stroke = Undo (`SY.early` -> `undoAct`), stricter score 2.0 on the ground (`SY.UNDO_GROUND`) | hook + arrowhead '<' or '>' within 1.2 s = Undo; a hook alone becomes a normal material rod after the window (3:12, Q103); `SY.UNDO_GROUND` retired |
  | '?' (new, v0.8c) | none | hook + a point under it within 1.2 s = the guide's relations view (surface and space) |
  | 3-finger / 4-finger tap | undo / redo | unchanged |
  Catch loops, spirals, flicks and strokes starting on an ohm are never held (O6). In space views a '?'-shaped pan is eased
  back. GESTURES.md is updated at build time (row 53, a new '?' row, C9 lines 144/170, a §13 row), not now.
  **Needs Wilbow (Q99-Q105).**
**P. Drawn instruments (Wilbow, 3:19 AM).** GESTURE CHANGE (two rows), built in chunk 3b:
  | Gesture | Was (GESTURES.md) | Now |
  | Drag starting on a rod's END (16 screen px, at least its hit area) | grab nearest particle, throw on release; a pinned end could not move | moves that end (length and pitch change live); release pins on ground, ties to a body, else free; no throw, no farewell flick |
  | Drag starting on a blob's RIM (outer quarter) | grab and throw | reshapes the blob (size and pitch); no throw |
  | Drag on the middle of a rod or blob | grab / throw / farewell flick | unchanged |
  | New stroke starting beside a rod end | attaches within 8 px (if not on the body) | attaches within handle radius + 8 px; a first touch ON the handle is an end-drag |
  Unchanged and checked: tap (strike), double tap (clear/dense), hold (damp), pinch (tension and grid pop, two fingers), strum and
  catch loop (ink starts off bodies), teach line (starts in a halo), walk stick (play mode, left half; end-drag off in play mode),
  baton strokes (end-drag off while the baton is up), drag-drop of an ohm onto a shape (adopt), ohm, bubble and egg priority in
  `Sf.hit`, two-stroke glyphs (a lone hook is a rod, which then has ends). Lost: throwing a rod by its end (throw from the middle)
  and grabbing a blob by its edge. GESTURES.md is updated at build time (drag-on-body row, a §13 row), not now.
  **Needs Wilbow (Q112-Q114).**
**Q. Room in the jam (Wilbow, 3:28 AM).** No new gesture and no changed gesture: only what jam members play changes (Q.8).
**H. Way back.** Inside a galaxy: existing double taps, no change. Across galaxies: double tap on a remembered-galaxy smudge at
  minimum zoom = fly there. *Double tap on empty space = fly home* changes only on a smudge. *C17 pinch-out* is two fingers,
  so it cannot be confused with a one-finger double tap; it still makes a new universe. **Needs Wilbow (Q59).**

## K. Behaviour changes and tests that must change (flagged, not decided)
- A: rested closed shape = item (Q42). tests/v04b_check.js line 28 asserts `!RS.ITEMS_DRAW`; it changes to "closed shape
  without rest = blob". GESTURES §1 row 54 is rewritten.
- D: string pinch steps through jam notes; grid pop unties (Q48).
- E: iris replaced by a crossfade (Q50); dust-zoom taps snap to bright systems (Q54); `App.freshPick` samples 6,000
  systems, so tests that pin a seed's exact start pick get new expectations (categories still all reachable) (Q56).
- G: the galaxy "hint" chime plays near the trail head (Q57; richer P16 sound only if Q37 is approved).
- H: the 10 s whole-world autosave is replaced by the incremental saver; hint progress moves from per-world `mods.guide`
  to the profile (Q10); the cross-galaxy way back (Q59). tests/pw_save.js and any test reading `rs1:` keys directly
  move to the `rs2:` layout (old keys still readable).
- N: hold on bare ground claims home (Q65); system-view landing and the galaxy fly-home and beacon follow the hearth instead of
  the ark / system 0 (Q68); fuse onto a colony of 8 refuses (Q69); a 7th carried bubble stays behind (Q70). Tests that pin
  `homeXY` to system 0 or landing to the ark only change; with no hearth claimed, behaviour is identical to v0.8b.
- O6 (v0.8a): the one-stroke undo glyph stops working alone; undo needs the hook + an arrowhead within 1.2 s (Q99, Q101), and a
  lone hook becomes a normal material rod after the window (Q103, 3:12 answer; before, a hooked line became material or undo). Tests that change:
  tests/symbols_check.js line 24 (`undo()` draws one traced stroke; it must add the arrowhead stroke, and line 26 asserts the
  result of the second stroke); tests/guide_check.js line 10 (the guide sequence draws the undo glyph as one stroke; add the
  arrowhead). New tests: O7 1-6. The 3-finger / 4-finger tap tests are unchanged.
- P (chunk 3b): drags that start on a rod end or blob rim no longer grab or throw (Q112, Q113); shape pitch folds into
  41.2-2093 Hz with an order-preserving soft limit instead of clamping at 28 and 4200 (Q116, theory correction, 3:50 AM, from MUSIC_THEORY.md), and snaps to the nearest jam or region before the session key (Q117);
  drawn shapes get engine voices (Q119), so tests that compare exact shape spectra or voice counts change (audio_check style
  tests: shape notes may take up to 4 instrument voices; ohm-voice tests run with no drawn shapes and are unchanged). Played
  shapes pull nearby jams' tempo and melodies (Q124), so jam soak tests that keep the player striking a body next to a jam
  get the P8-9 bounds instead of a fixed tempo. Grab tests (delete_check.js, v061_check.js, test_v2.js 240-241) grab at the
  centre and are unchanged; test_world.js 13-15 still hold. New tests: P8 1-11.
- Q (chunk 3c): jams of 3+ members arrange themselves (thin, softer, octave, subdivision, fill: Q134), so tests that pin exact
  note lists, note counts or registers per member of a big jam get Q.9's bounds instead; tradition parts and two-member jams
  are essentially unchanged; one small experience bonus (Q137). New tests: Q.9 1-12.
- O (v0.8c): a deleted guide can now return (re-hatch, Q107); space-view pans shaped like '?' + point are eased back (Q105).

## L. Build order and the split
1. H persistence (first; E, F and G depend on it; A, B and C register their components with it).
2. A, B, C, D (world and music; independent of space).
2b. P drawn instruments (needs H for the voice and ensemble components and D for jam-tuned snapping; extends the material
   strokes and the lone-hook rod of O6). Overnight chunk 3b, right after A-D. Inside P: P1 ends and rims -> P2 pitch -> P3/P4
   voices -> P5 ohms -> P6 ensembles 1-4 -> P7 influence.
2c. Q room in the jam (needs P's shapes and D's strings as occupants; jam system, established). Overnight chunk 3c, right
   after 3b; chunk 4's traditions then register their fixed parts with Q's protected list.
3. E and F together (one renderer: spacedraw.js, tiles, crossfade, the look). E's headless numbers are taken before F lands.
4. G (needs H's galaxy record and E/F's renderer).
5. N (needs H's records and registry, E's tiles for the candidate search, F's sprites for the globe glyphs, G's trail and chime
   for the thread and warmth). Inside N: N1 hearth -> N2 carry and settle -> N3 generator -> N8 live generation -> N9 targets ->
   N10 tiers -> N4 signs -> N5 warmth and completion.
6. O (needs H). In v0.8a: O1 counters (with H, so history builds up) and O6's two-stroke mechanism with the changed undo
   arrow (it changes an existing gesture, so it lands early, with its test updates). In v0.8c after N: the '?' glyph, O2-O5
   and the rest of O7 (O5 links goals to longings; O3 uses G's trail and C's keys).
- Proposed split: v0.8a = H + A-D + P + Q + O1 counters + O6 two-stroke undo; v0.8b = E + F + G; v0.8c = N + the '?' guide (O2-O5). Each part is playable on its own. Default: build as the split.
  (N1 and N2 alone need only H, so they could move into v0.8a if Wilbow wants a home sooner: Q87.)
- Not included (not approved): P1 Chorus, P2 gleam, P8 murmurs, P16 accent chime (unless Q37), P17, P25, totems (P22),
  WebGL, binary stars, more galaxies per universe, galaxy-cluster zoom level, save-and-load UI of any kind.

## M. Open questions for Wilbow (continuing from 41; each has a default so the build can proceed)
42. Drawn items: closed shape + rest at the end (the clay rest) = effect item, plain closed shape = blob as today?
    Default: yes. (Alternatives: size decides, or squeeze a blob into an item.)
43. Player-made item cap: Default 4 alive; at the cap a rested shape makes a blob with a "full" shimmer.
44. Water carriers: only the existing water-loving dew carriers, carrying real water to their home, a dry home puddle, or
    nearby sprouts? Default: yes, volume conserved, field pools never below their natural level.
45. May carriers empty water the player poured? Default: yes (field pools can't be drained; player pools can).
46. Regional keys: world voices in the area play in its key, a jam-proposer tie-break, and a 20% birth chance for the key
    gene; never retune existing ohms? Default: yes (ties to Q14 for births; Q16 traditions untouched).
47. Which strings (2:25 AM): the strings fused clusters build (harp, web), strings an ohm weaves, and strings you draw
    within reach of a jam's ohms? Default: all three; drawn strings within ~190 px of a member or attached to one.
48. String tuning: nearest jam note in order of length, chord tones glow; pinch tension steps through jam notes; grid pop
    unties? Default: yes.
49. How much the player steers: your notes count like one ohm (weight .8, never the leader), one section nudge per 4 bars,
    never a key change? Default: yes.
50. Replace the black zoom iris with a crossfade (the level tone stays)? Default: yes.
51. WebGL for space (real bloom and noise, bigger build, a second renderer)? Default: no, Canvas 2D.
52. Realistic space vs the soft look of the surface: ART_DIRECTION.md decides the parameters? Default: yes; F's defaults
    stand until it exists.
53. "Cluster" (2:27 AM) means star clusters inside the galaxy (open and globular), not a level above galaxies?
    Default: star clusters.
54. Systems per galaxy: Default 6,000 (the first 480 unchanged); dust-zoom taps snap to the brightest nearby system.
55. Keep each galaxy's music personality from its original 480 stars so existing galaxies sound the same? Default: yes.
56. Can the random start land in the new systems? Default: yes.
57. Trail hint sound: nearby unvisited systems play the existing chime quietly from their direction while you rest the view?
    Default: yes, existing chime only; the P16 fragment only if Q37 is approved.
58. Trail marks: light only (points, tints, sparkles, halos), no icons (t164)? Default: yes.
59. Way back across galaxies: galaxies you have changed appear as faint smudges at minimum galaxy zoom; double tap one to
    fly there? Default: build it, flagged (changes "double tap empty space = fly home" only on a smudge).
60. Launch: keep a fresh random world each launch (V07 I) with every changed world reachable, or resume the last world?
    Default: keep the random launch (answers Q20 for now).
61. Storage: 50 MB target, compaction of trivial changes, and never delete a world with your changes even when full?
    Default: yes (if full, compact harder and warn with a soft dimming of the newest stop, no text).
62-64. Not used here (left free for the parent's other items).
65. Claim or move home with a long still hold on bare ground (ring fills, about 1.25 s in total, never within 60 px of an ohm)?
    Default: yes.
66. One hearth at a time; moving home leaves the settled ohms where they are and the old hearth as an ember? Default: yes.
67. Before any claim, home is the ark (migrated by H)? Default: yes.
68. The galaxy home beacon, "double tap empty space = fly home", and the system-view "tap to land while carrying" all follow the
    hearth (not only the ark / system 0)? Default: yes.
69. Home zone and caps: 600 px radius, at most 24 settled ohms (extras settle just beyond the edge), home spacing >= 70 px,
    colonies at most 8 members (a fuse onto a full one gets the 'full' cue)? Default: yes.
70. At most 6 bubbles carried at once (a 7th catch stays in its bubble on that world)? Default: 6.
71. P7 Troupe (carried ohms hum in map views)? Default: not built; only the active longing's ghost hums in its echo.
72. Missions point only at ohms that really exist (fossils to wake, rare wild life, meteorite seeds, moon buds, ohms you left
    elsewhere), found from seeds? Default: yes. Wild life stays at 1/300 systems (raising it is a separate decision).
73. Sky glyphs for longings despite t164 "not as symbols": allowed because every glyph mirrors something drawn in the world
    (planet, environment sign, silhouette, egg words)? Default: yes.
74. Voice layer and hidden tier-3 egg combos: shown dim and unlit (the egg's own rule), lighting only when a match is heard?
    Default: yes.
75. A matching ohm HATCHED at home (from the egg words): does it fulfil the longing? Default: it closes the gap in the music, the
    longing fades, but no sky star; stars are only for ohms found and carried from another world.
76. A home ohm DNA-edited into a match: same as 75? Default: yes.
77. Rate: at most 3 live (at most 2 per scope); a flicked gap stays away 30 minutes? Default: yes (the growth rate is now Q92).
78. Pinning: one pinned at a time; if none is pinned, the newest is active? Default: yes.
79. The active longing travels with you as a small echo beside the carried row on every level? Default: yes.
80. Matching wild ohms "lean toward home": they now and then sing their motif transposed into home's key, with no change to their
    genes, key or tempo? Default: yes.
81. Completion: the found ohm is accepted and the scope's measured gain reaches 60% of the prediction within 2 phrases?
    Default: yes.
82. Sky stars of fulfilled longings: at most 64, drawn only (no tap), then gathered into constellations? Default: yes.
83. Throwing a bubble into orbit stays excluded (C7); no "send home by orbit"? Default: yes.
84. Each longing's hue = the DNA-view hue of its main gene region (shifted if two share one)? Default: yes.
85. Layers revealed broad to specific: WHERE at once, BODY after landing on a world of that category, VOICE after seeing a
    match or 10 minutes pinned? Default: yes.
86. Longing gestures: tap = hear it, rest (ring) = pin, flick from it (Farewell thresholds) = let go, and strokes starting on
    it are routed to it (it draws nothing)? Default: yes; the flick is not taught by a hint at first.
87. Build N as v0.8c after v0.8b, or pull N1-N2 (home and carrying) into v0.8a? Default: all of N in v0.8c.
88. Rarity tiers: 4, by difficulty d < .25 / .5 / .75 / above, shown by ring count, colour temperature and (tier 4) a rare
    shimmer? Default: yes.
89. Mix: always one tier 1 near home; others aim for tier 2 and 3; tier 4 only after 3 fulfilled and at most one live?
    Default: yes.
90. Difficulty weights: rarity .30, distance .25, harshness .15, layers .15, life event .15? Default: yes (tunable).
91. Search budget: <= 150 bodies and <= 2 ms per idle slice, <= 3,000 bodies per attempt, population sample 2,000 genomes per
    galaxy (<= 40 KB saved)? Default: yes.
92. Re-score on events only, debounced to at most once per 20 s; at most one new longing per 3 minutes (replaces the 10 minutes in
    Q77)? Default: yes.
93. Fade rule: a longing fades when its gap's gain falls below 40% of its birth value (20% when pinned)? Default: yes.
94. Target sources: fossils, natural life, saved ohms, and drift seeds / moon buds already recorded (never future random
    meteorites, never unsaved launch-scene ohms)? Default: yes.
95. In another galaxy (new universe or the way back): longings dim and point nowhere until a target is found there or you
    return? Default: yes, targets are always in the galaxy you are in.
96. Seasons: none exist in the code; skip them until a season system exists (time of day and weather are used now)? Default: yes.
97. Time of day and weather shift gap weights by at most 15%, only through links the code already has (rain fills texture, night
    makes glow ohms the world's lights)? Default: yes.
98. Drawing '?' (hook + a point under it) summons the guide and opens the text-free relations view, in surface and space
    views? Default: yes.
99. The undo glyph becomes two strokes: the hooked arrow, then an arrowhead '<' or '>' (changes GESTURES.md row 53 and C9)?
    The 3-finger tap stays undo. Default: yes (Wilbow, 2:55 AM).
100. Does '<' vs '>' mean undo vs redo? Default: both undo; the 4-finger tap stays redo.
101. Window for the second stroke: 1.2 s from the hook's lift, tunable? Default: yes.
102. While waiting, the hook is shown faintly and fades, with faint ghost hints of the arrowhead and the point? Default: yes.
103. ANSWERED (3:12 AM MDT): a hook with no second stroke becomes a normal material rod after the window, like any other stroke
     (alternative kept: it fades and does nothing).
104. Retire C9's stricter ground score `SY.UNDO_GROUND` (2.0), since the arrowhead now separates undo from material? Default: yes.
105. Space views: a '?'-shaped pan + a point tap on empty space opens the view and eases the camera back; a point on a system is
     a normal tap? Default: yes.
106. Significance weights: watched .25, interactions .25, jam experience .20, jams joined .15, offspring .15, log-scaled?
     Default: yes (tunable).
107. '?' re-hatches a deleted or caught guide beside you (same genome, lessons not restarted)? Default: yes.
108. View limits: on screen + half a screen, at most 60 threads, refresh every 2 s, closes on tap away or 45 s, tour of the top 5
     at about 2 bars each? Default: yes.
109. Build: counters (O1) and the two-stroke undo (O6) in v0.8a; the '?' guide view in v0.8c after N? Default: yes.
110. Hint: the guide draws a ghost two-stroke '?' once the first longing is live (or after its lessons end), max 3 times?
     Default: yes.
111. Goal links include breeding pairs whose child would likely match (dashed double thread)? Default: yes.
112. Movable ends: a drag that starts on a rod's end (within 16 screen px, at least the rod's hit area) moves that end; no
     throw on release and never a farewell flick; a drag on the middle still grabs and throws? Default: yes.
113. Blob rim: a drag on the outer quarter of a blob reshapes it (area 0.4x-3x the drawn area); the centre still grabs and
     throws? Default: yes.
114. Release rules for a moved end: on the ground it pins, on a non-ohm body it ties on, in the air it hangs free? Default: yes.
115. Length limits: 0.3x-3x the drawn length and 24-1200 px; past 2x stretch the rod is rebuilt, keeping its voice? Default: yes.
116. Keep the existing pitch laws (string, bar and tine, drum) and squeeze notes outside E1-C7 (41.2-2093 Hz) with an
     order-preserving soft limit, f' = 41.2*(f/41.2)^0.3 below and mirrored above, then snap (theory correction, 3:50 AM, from MUSIC_THEORY.md; was: fold by octaves) instead of
     clamping at 28 and 4200 Hz? Default: yes.
117. Snap order: the nearest jam within 450 px (its key, and its chord for strings), else the regional key (C), else the
     session key; pinched-loose (free) shapes stay unsnapped? Default: yes.
118. While dragging: the note slides live and gives a soft click each time it reaches a new note of the key (at most 5 per
     second)? Default: yes.
119. Shape voices: each drawn rod and blob gets a seeded voice from all 9 engines plus the physical families (at most 2 engines,
     like ohms; 20% physical only), saved as just its seed? Default: yes.
120. Voice cost: at most 4 shape notes use the shared instrument pool at once (ohms first); otherwise the shape rings with the
     modal ring only? Default: yes.
121. Double tap clear/dense also moves the voice (clear = more engine colour, dense = more physical)? Default: yes.
122. Ohms seek drawn shapes on their own and play them by strike, pluck, bow, sing-to or perch, picked by genes; at most one
     decision per ohm per 4 bars, on screen only? Default: yes.
123. Ensembles in chunk 3b: drone rod, marimba row, harp frame and drum circle (P6 1-4); kalimba, glass harmonica, chime tree,
     ohm loom, carried string, colony organ and rolling bell proposed only? Default: yes (pick any to add).
124. Influence of played shapes on jams (3:20): a share capped at .25; tempo moves at most 8% per bar and at most 25% from the
     jam's own tempo; melodies borrow a shape's line in at most 1 of 3 phrases? Default: yes.
125. Influence reach and fade: 450 px; halves every 2 bars after the shape goes quiet, gone after 8 bars? Default: yes.
126. Conducting wins: with the baton up, shapes have no influence on conducted ohms; it resumes 2 bars after the baton is
     lowered? Default: yes.
127. Who follows more: open (conforming), quick-learning and skilled ohms; stubborn and competitive ones follow little; curious
     ones borrow melody more? Default: yes.
128. Sources: shapes played by you or by ohms outside the jam count fully, wind and collision rings at .3, and a jam's own
     members' playing does not count for that jam? Default: yes.
129. Following a shape changes no genes and earns no jam experience (exp.js)? Default: yes (alternative: counts as a little
     jam experience).
130. Build P as overnight chunk 3b (after A-D, before chunk 4), one test APK? Default: yes.
131. Reading: "not timing and frequency mix" means "in timing and frequency mix" (each ohm knows its share of the jam's rhythm
     slots and frequency bands and adapts)? Default: yes (if "not" was meant, only a fair share by count of ohms).
132. Map: 7 octave bands x the bar's own step count (up to 48; 16 in 4/4, 24 in 12/8) per bar (theory correction, 3:50 AM, from MUSIC_THEORY.md; was: 16 slots), built once per bar from the notes already scheduled (no audio analysis), read
     one bar later? Default: yes.
133. Fair share by role: lead 1.4, bass 1.0, each drummer 1.0, counter .9, pad .8, drone .8? Default: yes (tunable).
134. Moves: thin, softer, octave shift (by the scale's period, within the ohm's body range; theory correction, 3:50 AM, from MUSIC_THEORY.md), subdivision shift, or fill an empty band or slot; one move per ohm per bar; octave
     shifts last at least 4 bars? Default: yes.
135. Personality: bold, competitive and leading ohms allow themselves more space (1.2x up to about 2.7x fair); shy ones step
     back first and do not fill? Default: yes.
136. Skill: the chance of choosing the best move is .4 + .6 x skill; beginners sometimes just thin or do nothing? Default: yes.
137. Experience: a clear bar where the ohm made a move adds 10% to its normal good-jam experience; partners that interlock for
     8 bars grow pair familiarity a little faster? Default: yes.
138. The lead keeps its band where it is busy and the bass keeps the lowest band (others move around them)? Default: yes.
139. Tradition parts (clave, partido-alto, kotekan, throat-singing drone and overtones) are never moved, only counted?
     Default: yes.
140. Baton wins: no moves for conducted ohms while the baton is up, cued ohms never thinned, resumes the bar after it is
     lowered? Default: yes.
141. Your playing (struck strings, drawn shapes from P) counts as a guest voice with a fair share; ohms make room for it and
     never change it; shapes ohms play count as their own notes? Default: yes.
142. Watched-jam growth (v0.7 E) puts its extra notes only in empty cells? Default: yes.
143. Floors: no ohm drops below 1 note per 2 bars because of this, and the jam's total loudness stays within 10%? Default: yes.
144. DAW volume and mute win over this; a muted ohm counts as empty? Default: yes.
145. Hint: once, when a jam of 4+ first arranges itself on screen, members' glows lift to the height of their band, max 3
     times? Default: yes.
146. Off-screen jams keep their last arrangement (cached), with no updates until back on screen? Default: yes.
147. Build as overnight chunk 3c, after 3b and before chunk 4? Default: yes.
Also affected (no new number): Q30 answered (persistence first); Q9 met by H's way back; Q10 default yes (hint progress in
the profile); Q20 default in Q60; Q24 still open, supported either way; Q37 gates G's richer chime; Q14 gates C's births.

## N. Collecting ohms for a chosen home, and longings (missions) (Wilbow, 2:42, 2:44 and 2:49 AM MDT). Build as v0.8c.
Wilbow, 2:42 AM, verbatim: "Ohm collection mechanics.  Bring them back to an established home zone which can be chosen.  A
framework thay generates missions to seek out certain types and tell user which dna sequences will add to the jam and/or
colony and/or settlement best."
Wilbow, 2:44 AM, verbatim: "Missions are generated procedurally and use symbols and hints at gestures. Hints to planet and/or
environment types or creature attributes.  How to do this without text and make interaction intuitive?"
Reuses VISION_PROPOSAL Pillar 1 (collecting): P1 (the Chorus record: meeting is an event), P3 (birthplace shapes expression,
so WHERE matters), P5 (compatibility you can hear: the shimmer and the hum), P7 (the carried bubbles; only the travelling
longing echo, not the Troupe's humming, see Q71), plus G's trail and chime (P12/P16 path) and H's records. Not built from
Pillar 1: P2 gleam, P4 awakening, P6 trading (still unapproved).
**Design principle: MATCHING, not reading.** Every symbol in a longing is something the player also sees in the world:
a planet drawn exactly as the system view draws it, an environment drawn with the world's own signs, an ohm's own
silhouette, the egg's own stroke words, the DNA view's own region hues. You learn by noticing that two things look and sound
the same. No text, numbers, points, icons from outside the game, or role names, anywhere.

**What exists (checked in code, so nothing is rebuilt)**
- Home today: each ohm has `home0`/`anchor`/`home00` (jam.js, pairs6.js), saved with the ohm; a drop or throw re-homes it;
  pairings shift homes at most `Pa.SHIFT` (120 px), off-screen only. There is no player home zone; the "home" in the galaxy is
  system 0 (`homeXY`, the green home beacon in app.js) and the ark.
- Collecting today: loop catch -> bubble (`Sf.catch`); leaving a world takes every bubble as a serialized record
  (`Sf.takeBubbles` -> `App.carried`, drawn as rings at the bottom centre on every level, zero simulation); arrivals land near
  the camera (`Sf.receiveBubbles`, clear dry spot) still in their bubbles; tap the ARK in the system view while carrying = land
  there. Bubbles are excluded from orbit throws (C7); a fast upward flick deletes (Farewell).
- Where wild ohms come from (important for missions): natural life is rare (`RS.LIFE_ODDS` 1/300 systems, one per life
  world, at its first landmark, `Genome.fromWorld`); FOSSILS are common (about 60% of worlds have one, `RS.geoOf`, genome
  `RS.fossilGenome(seed)`, deterministic, woken by double tap into an egg of the extinct lineage); meteorite seeds
  (`meta.drift`); moon buds and travellers (voyage.js); and ohms the player left on other changed worlds (H). All of these
  are computable from seeds WITHOUT loading the world, so a mission can point only at ohms that really exist.
- Music facts to score against: jam niches are soft and recomputed (`J.fit`: melody, counter, bass, ...; cohere.js roles
  lead / bass / pads / texture / drums by drum type), the consensus key and tuning system, register spacing (no unison doubling),
  timbre distinctness (`RS.Inst.identity`, rule 16), experience and compatibility skill (exp.js, v0.7 D/D2: widens the fit check,
  a skilled host bridges), `C.compat` (key and tempo ratio), species clusters (`It.species`, distance > .3 = new species),
  pairings near home (pairs6.js: carrier and rider, hearing and seeing, cleaner and hoarder, grinders, food web, population
  balance), colony capabilities (`K.caps`: propulsion, sight, skeleton, choir, roughness from incompatible members).
- DNA view (dna.js): region bands with fixed hues (`RS.GENE_REGIONS`), rung drag = value, pluck, ghost preview of the
  expressed ohm; fast swipe = player scramble.
- Egg language (v0.7 A, egg.js): taps (1 kick ... 5+ kit), wave (pad / drone), circle (ringer), flick (pluck / struck),
  doubles = stronger, a few hidden tier-3 combos (`Eg.COMBOS`). Planet categories in the system view: rocky, ocean, icy, gas,
  ringed, plus moons and the ark (`RS.PTYPES`). Body plans: blob, shell, serpent, strider, drum-belly, cluster, floater.

### N1. Choosing a home zone (the hearth)
- See / hear: rest one finger still on BARE GROUND (not on an ohm, body, egg, bubble or water) and keep it there. After the
  normal 450 ms hold, a ring fills under the fingertip (the clay / A rest ring, about 0.8 s more) with a low rising tone. When it
  closes, a HEARTH grows out of the ground: a short root-glow with a few luminous filaments, in the world's own palette, that
  pulses softly with the home jam's beat. Lifting before the ring closes does nothing (a plain hold on ground is a no-op
  today). Ohms nearby turn toward it once (the existing face-the-player posture from D3).
- The HOME ZONE is the arc of ground within 600 px of the hearth (on cloud worlds: that arc of the deck and the band under it).
  It is shown only by light: the hearth's filaments reach faintly along the ground to the zone edge when you zoom out, nothing
  else.
- Moving home: do the same on any other spot or world. The new hearth grows; the old one dims to an ember (kept, drawn only).
  Ohms already settled at the old home stay there (they never migrate on their own, standing rule). One hearth is active.
- Before any claim, the home is the ark (H migrates it and marks it home). Every "home" pointer in the game follows the
  hearth: the galaxy's green home beacon, "double tap empty space = fly home" (to the hearth's system), and the system-view
  landing (N2).
- Mechanics: `RS.Hearth.claim(Sf, th)` on `Sf.hold(on)` when `Sf.hit` finds no body and no ohm within 60 px, the point is
  ground (or cloud deck / sea surface) and the press stays still; the ring runs from 450 ms to 1250 ms; any movement > 10 px,
  a second finger or the baton cancels it.
- Storage (H): world component `hearth` {th, born, ember: [th...] (max 4)} in that world's region record; player record (rs2:p)
  `home` {g: galaxy key, sys, body, th}. Registered with `RS.Save.register('hearth', v1)` and `('home', v1)`.

### N2. Collecting: catch anywhere, carry through space, settle at home
- See / hear: catch an ohm on any world with the loop (unchanged). Leave: its bubble rides in the carried row at the bottom of
  the screen through the system and galaxy views, as today (no ship). In the system view, tap your HOME world while carrying =
  land (today only the ark does this); entering the home world any way with bubbles also lands them. They float down near the
  hearth, into a clear spot (existing `Sf.landAt`). Tap a bubble to pop it (unchanged): the ohm steps out and settles.
- Settling: a popped ohm inside the home zone takes the nearest free HOME SLOT (spacing >= 70 px from other settled homes,
  dry gentle ground, the existing landing rules); its `home0` is set there (as a drop already re-homes an ohm), and from then on
  it obeys the stay-near-home rules (J.LEASH, errands, `Pa.SHIFT`). If a longing's ghost sits in the zone and the ohm matches it,
  its slot is the ghost's slot (N5).
- Caps: at most 24 settled ohms in the home zone; past that, a popped ohm takes a slot just beyond the edge (a neighbour, not
  counted for longings). Colonies: at most 8 members per fused cluster; a fuse onto a full colony gets the existing 'full' cue
  (flagged, Q69). Carried at once: at most 6 bubbles; a 7th catch stays in its bubble on that world (Q70). Population balance
  (pairs6 #16) keeps working inside the zone.
- Off-screen cost: carried ohms are records only (as now). Settled ohms off-screen run today's cheap path. The home world is
  summarised into a compact HOME PROFILE (N3) when it is unloaded, so nothing at home is simulated while you travel.
- Ohms never travel on their own (t132, t168, R5.16): only you carry them.
- Files: surface.js (hold-on-ground hook, slot settle on pop, zone draw hook), app.js (system tap on the home world lands,
  fly-home target, beacon follows the hearth, carried-row cap), hearth.js (new: claim, slots, zone, ember drawing).

### N3. The longing generator (procedural missions from what home is missing)
- What it scores: three separate scopes, each with its own profile, built on screen on events (N8, at most once per 20 s) while home is loaded and saved
  as the HOME PROFILE (a few hundred numbers):
  - JAM (the home jam or the strongest jam in the zone): register occupancy per octave band (weighted by loudness and
    sustain); continuous support and pulse bands (low sustained support = lowness x sustain; low-thump, mid-snap and high-tick
    energy from the transient / bodyRes / pitched genes the drum types are made of; texture weight from `RS.Inst.isTex`);
    the members' timbre identities; the consensus key and tuning system, tempo and meter; the members' highest compatibility skill.
  - COLONY (fused clusters in the zone): the `K.caps` balance (propulsion, sight, skeleton, choir) and roughness.
  - SETTLEMENT (everyone in the zone): species clusters and their evenness, which pairings are complete or half complete,
    crowding of one instrument type, the regional key (C).
- How a candidate is scored (all continuous 0..1, no role labels):
  - JAM gain = .25 free register space it would fill + .25 the support / pulse / texture band it would fill + .15 timbre
    distance from current members + .15 key fit (distance from the consensus key and tuning, widened by the home jam's best
    compatibility skill and the candidate's learnRate x openness, as D/D2 widen the fit check) + .05 tempo-ratio fit (`C.compat`)
    + .10 pairing synergy (it completes a half-made pairing near home, e.g. a small high voice beside a big low drone with no
    rider) - .05 crowding.
  - COLONY gain = the missing capability it adds (largest deficit first) - the roughness it would add (`C.compat` against members).
  - SETTLEMENT gain = species novelty + pairings it completes + ecological fit (food web, population balance) + regional key fit.
- Candidates are REAL: the generator walks systems outward from the G trail head and from home, in idle slices (E's tiles,
  <= 150 bodies and <= 2 ms per slice, map views or save idle only), and computes, from seeds alone, each body's fossil genome,
  life genome and pending drift / bud records, plus ohms left on changed worlds (H). Each is expressed and scored for all three
  scopes. Results go into a small per-tile cache (LRU 64 tiles).
- A LONGING is formed from the best gap that real candidates can fill: {scope, gap vector (12 gene axes with targets and
  tolerances, taken from the top candidates, never a role name), hue, the ghost genome (the best candidate itself, so the ghost
  looks and sounds like a real findable ohm), up to 6 target systems, seed, born}. A gap that no candidate within the searched
  area can fill is skipped. A longing never names a role: two homes with the "same" low gap get different ghosts.
- Rate and limits: at most 3 longings at once, at most 2 per scope, at least one easy (N10). They are never a fixed list: each
  is re-derived from current conditions on events (N8), grows into a free slot when conditions open a gap, and fades when its
  gap closes some other way (Q75, Q76). At most one new longing per 3 minutes of play, so the sky doesn't churn. A longing is
  shown only once a concrete target has been found in this galaxy seed (N9). All seeded: hash(galaxy seed, home key, profile
  hash, count of longings ever made), so the same save in the same conditions gives the same longings.
- Hue: each longing takes the DNA-view hue of the gene region that contributes most to its gap (`RS.GENE_REGIONS`), shifted
  25 degrees if another live longing has it. The same hue is used everywhere for that longing (glyphs, ghost, DNA rungs,
  wild shimmer, the thread), so colour matching ties them together.
- Files: quest.js (new: profiles, scoring, candidate search, longings), reading exp.js, jam.js, cohere.js, items.js, colony.js,
  pairs6.js, egg.js, events.js and space.js (no changes to their logic).

### N4. Showing which ohm and which DNA helps, text-free
- THE LONGING above home: a small cluster of light glyphs in home's sky, above the jam (JAM scope; pulses on its beat), above
  the colony (COLONY; steady), or above the hearth (SETTLEMENT; slow breathing). The home jam hums toward it: once per 8 bars,
  members lean a held note at the ghost's pitch.
- Up to four layers, revealed broad to specific (layer 1 from the start; layer 2 once the player has landed on a world of the
  right category; layer 3 once they have seen a matching ohm, or after the longing has been pinned 10 minutes; layer 4, only on
  tier 3-4 longings, once the voice has matched):
  1. WHERE: a tiny lit globe drawn exactly as the system view draws that category (rocky, ocean, icy, banded gas, ringed,
     moon; F's sprites), plus at most one environment cue in the world's own signs: drips (caves), wind streaks (ridges or
     thin-air highlands), wet shimmer (pools, wet worlds), cold sparkle (icy, cold). Taken from the target candidates'
     body type and temperature, then refined on that world by the field at the candidate's actual spot.
  2. WHAT BODY: the ghost's own body-plan silhouette (one of the 7 plans, drawn by the ohm renderer in shadow).
  3. WHAT VOICE: the egg stroke words that would make that voice, drawn as the egg's orbit hints draw them (taps as dots in
     the rhythm, wave, circle, flick, doubled when stronger). It doubles as an egg lesson. Hidden tier-3 combos are shown as
     the egg shows them: a dim, unlit orbiter (Q74).
  4. WHICH GENES (harder longings only, N10): a short strip of helix rungs, drawn exactly as the DNA view draws them, with the
     segments that would help lit in the DNA view's region hue. Matching it means a wild ohm whose DNA view lights the same
     segments (or, for Q76, an edit).
- THE GHOST at home: a translucent silhouette of the ghost genome sitting where it would sit (the jam ring position its niche
  would take, a bud on the colony where it would fuse, or a free slot in the zone), humming the missing line in the home key:
  the line it would play in that jam (its motif in its likely niche, quantised to the consensus key), one quiet phrase per 4
  bars on the jam's open beats. You learn what to listen for.
- DNA VIEW: in any ohm's DNA view (home or wild), rungs whose value already lies inside a live longing's target glow in that
  longing's hue; rungs far outside it dim. While you slide a rung toward the target, the ghost's hum (heard faintly in the
  view) brightens; plucking a helping rung sounds it against the home chord. Jam, colony and settlement longings are kept
  apart by the glow's motion (beat pulse, steady, breathing), the same motion as their sky glyphs.
- WILD MATCHES: on-screen wild ohms (every 2 s, at most 24 checked, a 12-axis distance) that match a live longing at >= .7 get
  a slow rim shimmer in its hue; when idle they now and then (once per 16 bars) sing their motif transposed into home's key, so
  they sound as if they'd fit (no change to their genes, key or tempo). A dormant fossil that would wake into a match shimmers
  the same way.
- THE GUIDE demonstrates once, with V07 L ghost fingertips: the first time a shimmering match is on screen, a ghost finger draws
  the catch loop around it; the first time you carry a match into the system view, a ghost tap lands on the home world.
- Files: render.js (sky glyphs, ghost; cached sprites from F), dna.js (rung glow / dim, hum), surface.js (shimmer hook),
  guide.js and the L hint list, sound via the existing play paths (one quiet voice).

### N5. Direction, warmth, pinning and completion
- Tap the longing = hear it: its glyphs light in order while the ghost's line plays once.
- Rest on it (hold, then the ring fills as in N1) = PIN it: it becomes the active longing. One is pinned at a time; if none is,
  the newest is active.
- Flick it away (a fast stroke starting on it, the Farewell thresholds: >= 900 px/s and >= 110 px) = let it go: it drifts up
  and dissolves; that gap can't come back for 30 minutes of play, and a different one grows later.
- Travel: the active longing travels with you as a small echo beside the carried row on every level. In the galaxy and system
  views a thread of light leans from home toward the active longing's target systems (one polyline, F style), and those systems
  chime the ghost's pitch through G's hint chime path. WARMER as you get closer: the ghost hum in the echo grows louder with
  proximity (galaxy distance to the nearest target, then the right planet, then the right spot), and the glyphs light one by one
  as you match WHERE (you're on a world of that category, then in its environment), BODY (a matching body plan on screen) and
  VOICE (you hear a matching voice nearby).
- Completion: when a match that came from another world settles at home and is accepted (it joins the home jam, fuses into the
  colony, or settles in the zone) and the scope's gain, measured over the next 2 phrases, reaches at least 60% of what was
  predicted: the ghost glides to it and fills with it as it brightens, the jam (or colony, or hearth) blooms with the existing
  capped bloom fx and a rising chord, and the longing's glyph cluster rises and becomes a permanent STAR in home's sky (core
  colour and brightness from its rarity tier, N10, with a faint halo in the longing's hue; rarer finds bloom bigger) (a record, drawn only, no hit test, at most 64 and then they gather into constellations, as lineage does). On the G trail
  a faint thread joins the stop where it was found to home. No points, scores, counts or text.
- Storage (H): player record `longings` {live: [<= 3], pinned, flicked: [{gap hash, until}], made: n}; home world record
  `skyStars` [<= 64 {hue, tier, fromSys, code hash, born}]; player record `homeProfile` (compact). Registered components, versioned.

### N6. Mechanics, cost, tests, risks
- Perf budget: on screen, quest work <= .3 ms per frame on average (scoring runs on events, at most once per 20 s, shimmer checks every 2 s, at most
  24 ohms); one extra quiet voice for the ghost; sky glyphs and stars drawn from one cached layer (F cache, inside its 24 MB);
  candidate search <= 2 ms per idle slice, map views or idle only. Off-screen: ZERO new per-ohm or per-frame work; the home is
  a stored profile while away. Background tick before and after must match within 2% (rule J).
- Memory: longings + profile + tile cache <= 200 KB. Save growth <= 6 KB per home world.
- Mutation stays at 0: no quest code writes genes (checked by hashing genomes before and after). No themes, presets, genres or
  fixed roles: gaps are vectors; ghosts are real candidate genomes.
- Headless tests (fixed seeds):
  1. Hearth: still hold on bare ground 1.25 s -> hearth saved and restored on reload; hold of .6 s -> nothing; hold on an ohm
     still listens; a hold that moves 12 px cancels.
  2. Carry and settle: catch on world X, travel, tap the home world in the system view -> bubbles land in the zone; pop -> home0
     inside the zone with spacing >= 70 px; past 24 the next one settles beyond the edge; the 7th carried bubble stays behind.
  3. Gap scoring: a home jam with no low sustained support ranks low, sustained candidates first; a home with every band filled
     makes no new longing; no longing record contains a role name.
  4. Determinism and rate: same save + seed -> same longings; at most 3 live, at most 1 new per 10 simulated minutes.
  5. Solvability: every longing has at least one real candidate (fossil, life, drift, bud or a left ohm) in its target systems,
     and that candidate scores >= the longing's threshold when loaded for real.
  6. Completion: the found match settled at home -> ghost removed, a sky star saved; a home-hatched match -> gap closed, no
     star (Q75).
  7. DNA view: for a longing whose gap lies in one region, rungs inside the target are marked 'help' and far ones 'clash'.
  8. Gestures: tap on the sky elsewhere = ripple as before; the star-loop record still starts; strokes that start off the longing
     draw as before; a slow stroke from the longing is ignored (not ink).
  9. Rule J: background tick and frame time on the busy-world bench within 2% of v0.8b.
  10. Soak (H's 6-hour sim): longings, stars and profile stay within their caps.
  11. Seeds (N9): `tests/v08_longing_seeds.js`, 64 galaxy seeds x 3 home profiles x conditions: every shown longing has a
      reachable target that really meets it when loaded; an easy one always exists; budget respected; re-target on catch / delete.
  12. Live (N8): removing the jam's lowest member opens a low gap within one re-score (<= 20 s); adding a match closes it and the
      longing fades; no re-score runs in a frame without an event; rain lowers texture-gap weight; the list differs by condition.
  13. Tiers (N10): a same-system target with 2 layers is tier 1; a far-side fossil with 4 layers is tier 3-4; tier 4 never
      shows before 3 fulfilled; rings and star colour follow the tier.
- Risks: wild life is very rare, so most targets will be fossils (woken into eggs), drift seeds and your own left ohms; if
  that feels thin, more wild life is a separate decision (Q72). Sky glyphs vs t164 "not as symbols" (Q73). Too many hums at home
  (the ghost + leaning members): capped to one ghost phrase per 4 bars and one lean per 8. Ghost slots could crowd the zone: a
  ghost takes no physical space and is not a body.

### N7. Gesture check (§13 format)
- *Long hold on bare ground = claim / move home (new).* Hold today: an ohm = listen, an instrument = damp, bare ground = nothing
  (`Sf.hold` returns null without a body), so the ground hold is free. Tap-then-hold on ground: not used (play mode needs an
  ohm). Clay and A rests happen at the END of a moving stroke, so they can't reach this. Baton: two fingers, and it cancels the
  ring. D3: counts as directing. Walking stick: only in play mode. Risk: resting a thumb on the ground by accident, so the ring
  needs 1.25 s and cannot start within 60 px of an ohm. **Flag (Q65): new meaning for a hold that did nothing.**
- *Tap on the longing = hear it.* Changes "tap sky = ripple + blip" only on the glyph cluster. **Flag (Q86).**
- *Hold on the longing = pin (ring).* Sky hold did nothing; same ring pattern as N1, clay and A. No conflict.
- *Flick from the longing = let it go.* A stroke that STARTS on the longing is routed to it (like egg routing, v0.7 A), so a
  stroke started there draws nothing. The thresholds are the Farewell bubble flick's. The star-loop record needs a loop around
  the sky star, and the longing is kept away from the sky star (>= 3 star radii). **Flag (Q86).**
- *System view: tap the home world while carrying = land.* Extends the ark rule to the hearth's world. **Flag (Q68).**
- *Galaxy: double tap empty space = fly home* now flies to the hearth's system (system 0 until claimed). **Flag (Q68).**
- *Fuse onto a full colony (8)* gets the 'full' cue instead of fusing. **Flag (Q69).**
- *Catch, pop, drag, throw, Farewell flick, egg words, DNA gestures:* unchanged. DNA glow and dim are drawn only.
- *Orbit:* bubbles stay excluded from orbit throws (C7); no "send home by orbit" (Q83).
- N8-N10 (2:49) add NO gestures: live generation, targets and tiers change only what is shown and heard (rings, colour,
  shimmer, thread, star). Layer 4's helix strip is drawn only (no rung drag on the longing; editing stays in the DNA view).
- Verdict: two new gestures in places that did nothing (ground hold, sky hold), and four changes to existing gestures (tap and
  flick on the longing, home landing, fly-home target, full colony) are flagged.

### N8. Live generation from current conditions (Wilbow, 2:49 AM MDT)
Wilbow, verbatim: "If remember, missions are not a static list, they are generated from current conditions, also figure out
rarity /difficulty scale.  Must be possible in current seed".
- Longings are never a fixed list. Each one is a live reading of a gap: the generator re-derives the gaps and re-ranks
  targets from the current conditions, and live longings follow:
  - HOME NOW: the jam, colony and settlement profiles as they are (N3), including recent changes: an ohm joined, left, faded,
    was deleted, fused or separated; a jam formed, grew (v0.7 E), dissolved or changed its consensus key; the hearth moved.
  - TIME AND WEATHER at home: `Sf.day` phase (dawn, day, dusk, night) and `Sf.weather` (rain, storm). They shift gap weights
    lightly (at most 15%), only where the code already links them to sound or sight: rain already fills the texture band with
    world voices (texture gaps weigh less while it rains); at night glowing ohms are the world's lights (`P.glow`, the night
    point lights), so a dark home gains a small settlement gap for a glow. Targets are re-ranked by conditions too: a glow
    target is easier to spot at night, a storm-world target is harsher during its storm (N10).
  - SEASON: the code has no seasons. Default: none until a season system exists (Q96).
  - WHERE YOU ARE AND HAVE BEEN: the G trail and your current system re-rank targets (nearer targets and unvisited directions
    off the trail head first); they never change the gap itself.
  - EXPERIENCE: the home members' compatibility skill (D2) widens key fit, so more candidates fit and some longings get easier
    or close; the number of longings fulfilled slowly widens the mix (N10).
- Events, not frames: re-scoring runs on any of the events above (posted by the existing code paths: join / leave / fade /
  Farewell / fuse / separate / jam key change, day-phase change, weather start or end, landing on a world, a target caught,
  woken or deleted), debounced, at most once per 20 s, never per frame. Profile build <= 1 ms for 24 ohms; target re-rank reads
  the cache only. While you are away, home is frozen as its stored profile (nothing at home is simulated), so only "where you
  are" and target events re-rank.
- Lifecycle: born (a gap with a verified target, N9) -> live (re-scored on events) -> fulfilled (N5) or FADES: if its gap's gain
  drops below 40% of the gain at birth (or 20% while pinned), it fades out over about a minute with a falling hum. A new one
  grows when a slot is free and conditions open a gap (at most one per 3 minutes).

### N9. Guaranteed possible in this seed
- A longing is shown only after the generator has found at least one CONCRETE TARGET in the current galaxy seed: an ohm that
  exists, or a genome that will deterministically appear, satisfying the longing's gap at >= its threshold. Sources, all queried
  through the same generators with the same seeds (no copies of their logic):
  - FOSSIL: `RS.geoOf(P, body)` for the site, `RS.fossilGenome(seed)` for the genome; woken by a double tap.
  - NATURAL LIFE: `S.life` / `S.lifeBody` in the system generator, `RS.Genome.fromWorld(sysSeed, env)` at the first landmark.
  - SAVED: an ohm the player left on a changed world (H region records), with its id.
  - DRIFT and BUD: meteorite seeds already in `meta.drift` and moon buds already in voyage records (never future random ones).
  - Not used: the launch's fresh scene ohms unless they were saved (they come from a launch seed, not the galaxy seed).
- Code finding: waking and natural life spawn with `distinct: true`, so `Sf.distinct` can shift the instrument if a similar ohm
  already lives nearby. The genome from the seed is therefore the PREDICTION; the target is confirmed (and re-scored) the first
  time its world is loaded, and the headless test loads it for real.
- The target is stored internally as a LOCATION KEY: {g: galaxy seed, sys, body, src: fossil | life | saved | drift | bud,
  th (spot), id or seed, genome hash, score}. Up to 3 keys per longing (the best, plus 2 spares). The player never sees it as
  anything but the thread, the chime and the warmth.
- Search budget: idle slices only (map views and save idle), <= 150 bodies and <= 2 ms per slice, at most 3,000 bodies per
  longing attempt, outward from home and the trail head (radius grows with the tier being sought, N10). Nothing found -> the gap
  is not shown (it is tried again on a later event). A per-galaxy sample of the population (N10) is built once in the same
  slices and saved in the galaxy record (compact, <= 40 KB).
- Player changes: if a target is caught, woken (and not kept), deleted, fused away, or found missing or changed when its world
  loads, the longing re-targets to a spare, else searches again; if none is found within budget it fades (N8). Targets you
  catch are tracked: a caught target in your carried row keeps the longing pointing HOME (it is on its way). Another galaxy
  (C17 new universe, or Q59): the longing dims and points nowhere until a target is found in that galaxy or you return (Q95).
- Headless test (new, `tests/v08_longing_seeds.js`): for 64 galaxy seeds x 3 home profiles (sparse, half-filled, full) x a few
  conditions (day / night, rain): every longing that is shown has a location key; loading that world headlessly with the same
  seed (and waking the fossil where needed) yields an ohm whose score meets the longing's threshold; at least one easy longing
  exists whenever any longing exists; the search never exceeds its budget; catching or deleting the target re-targets or fades
  the longing within one re-score; a full home shows no longing it can't fill.

### N10. Rarity and difficulty, shown without text
- Difficulty d (0..1) of a longing's best target, from measurable factors:
  - .30 TRAIT RARITY: the fraction f of this galaxy's sampled population (2,000 seeded genomes from fossils, life and saved ohms
    across E's tiles) that meets the gap; rarity = clamp(-log10(f) / 3, 0, 1).
  - .25 DISTANCE AND DEPTH from home: same world 0, same system .2, same star cluster or neighbouring tile .45, across the galaxy
    .7, far side 1 (by galaxy distance and the trail).
  - .15 HARSHNESS of the target's spot: from the field there (deep cave and darkness, storm landmark or storm weather, gas or
    cloud world, cold, low light).
  - .15 LAYERS that must match: where, body, voice, and a specific gene segment (layer 4 only appears from tier 3 up).
  - .15 LIFE EVENT needed: wake a fossil (.5), a rare natural-life world (1).
- Tiers (Q88): 4 tiers by d (< .25, < .5, < .75, above). Shown with NO text, all in the world's own light:
  - glyph rings: the longing's cluster sits inside 1 to 4 faint rings (the egg's orbit rings);
  - colour temperature of the longing's core and of its permanent star: warm amber (tier 1) to blue-white (tier 4), using the
    same blackbody colours as stars (`RS.bbRGB`);
  - tier 4 only: a slow rare shimmer (a second, slower rim wave) on the longing, its ghost and on matching wild ohms;
  - the reward follows the tier: tier 1 a small bloom and a faint star; tier 4 the full capped bloom, a longer rising chord and
    the brightest star in home's sky.
- Mix (Q89): always at least one tier-1 longing near home (target in the home system, at most 2 layers, no life event) whenever
  any gap can be filled that way; the other slots aim for one tier 2 and one tier 3; tier 4 can take a slot only after 3
  longings have been fulfilled, and at most one tier 4 is live. If no easy target exists, the easy slot takes the nearest
  target of any tier, and no harder longing replaces it.
- Difficulty is re-read on events (N8): a storm ending or experience widening key fit can lower a live longing's tier; it is
  shown by a ring fading out, never by a jump.

### N11. Checklist: Wilbow's 2:44 AM design, and where each part is
1. Matching, not reading: principle at the top of N; every glyph is a world thing (N4).
2. A longing above home, hummed toward by the home jam: N4.
3. Layers broad to specific: WHERE (globe + world environment signs), WHAT BODY (silhouette), WHAT VOICE (egg words, also an
   egg lesson), and the helping gene segments in the DNA view's hues (N4 layer 4 and the DNA view): N4.
4. The ghost hums the missing line in the home key: N4.
5. A thread leans toward likely systems that chime the ghost's pitch; warmer as you get closer, glyphs lighting as you match:
   N5 (targets are concrete, N9).
6. Ghost fingertips for catch and carry (L system): N4 guide, section I.
7. Tap = hear, rest (ring) = pin, flick = let go, checked against GESTURES.md: N5, N7.
8. Matching wild ohms shimmer in the same hue and lean toward the home key: N4.
9. Completion: the ghost fills with the real ohm, the jam blooms, the longing becomes a permanent star: N5 (sized by tier, N10).
- At most 3, procedural from gap scoring, seeded, slow to refresh: N3, N8.

## O. The '?' guide: relations, rankings and goals (Wilbow, 2:53 and 2:55 AM MDT). Counters and the two-stroke undo in
v0.8a, the rest in v0.8c.
Wilbow, verbatim: "Drawing a question mark brings helper guide to show relations between assets kept in context of all
procedurally generation, goals.  Especially entity mies which hav the most watched, interacted, experience in jams, or other easy
to track, relevant metrics". Read as: "entity mies" = entities (ohms first, plus worlds, items and other things). This is also
the "call the guide back" gesture offered earlier.

### What exists (code read)
- symbols.js: a $P point-cloud recogniser (`SY.recognize` returns {id, score, margin}; `SY.TH` 4.2, `SY.CONF` 2.6, `SY.offer`
  needs margin >= .25; `SY.early` lets 'infinity' and 'undo' claim a stroke before the other strokes). It gets ONE stroke at a
  time from `Sf.stroke`; a dot is not a stroke today. The undo glyph is a hooked return arrow (starts right, runs left, hooks
  down and back right). Glyphs are routed only from 'ground', 'body', 'bubble' and 'pair' contexts, never the halo.
- Ghost completion (`SY.ghostFor`, every 6 frames while inking) already shows a faint finish for a half-drawn glyph.
- guide.js: the guide is a normal ohm (`Gd.spawn` from hash('guide', seed); it can be caught, bred or deleted). `Gd.spawn`
  refuses once `st.id` is set or lessons are done, so a deleted guide never returns today.
- Space views: a one-finger drag pans the camera; a tap selects; a double tap on empty galaxy space flies home. There is no ink.
- Data to show, already recorded: jam members and leader (jam.js), pairings (pairs6.js), colony members (colony.js), bonds
  (infinity glyph, `a.bond`), parents (`exp.inh`), jam experience `exp.xp` and jams joined `exp.jn` (exp.js), teaching
  (`C.teach` from the halo-to-ohm line), item holder / owner / residents (items.js), regional keys (C), the trail (G), longings
  and targets (N). Missing: seconds watched, player interactions, offspring count, the teacher of an ohm.

### O1. Counters (cheap, saved in H)
- Per ohm, one registered H component `tally` (versioned, optional, <= 16 bytes per ohm):
  - w: seconds watched (on screen, counted once per second from the render cull that already exists; never off-screen);
  - i: player interactions (tap, catch, pop, drag or throw, play-mode note, DNA edit, egg hatch by the player), +1 each from
    the existing handlers;
  - o: offspring (incremented on the parents when an egg of theirs hatches);
  - t: up to 2 teacher ids (set by `C.teach`).
  Jam experience and jams joined are read from exp.js (not copied).
- Per world (H world record): seconds on that world and landings. Per item: uses (picked up, played, held by an ohm).
- Significance S of an ohm = .25 log(1 + w/60) + .25 log(1 + i) + .20 xp + .15 jn + .15 log(1 + o), each scaled to 0..1
  across the ohms being compared (Q106). Worlds and systems rank by their own time and landings plus their ohms' S; items by uses.
- Zero work off-screen and zero per-frame work: the counters are integers bumped on events or the 1 s cull tick.
- Could start in v0.8a with H (Q109), so by the time the view ships the counters already hold history.

### O2. Drawing '?': the summon
- Draw a '?' (two strokes: the hook, then a point under it, O6) on open ground or sky (not starting on an ohm, a bubble, a halo
  or the egg): the guide comes. On a surface it flies
  in from the screen edge; if it was deleted or caught, it re-hatches from its seed beside you (a new hatch, same genome; its
  lessons are not restarted; Q107). In the galaxy and system views it comes as a small glowing sprite of itself (drawn by F,
  singing in its own voice); the real guide stays on its world.
- The relations view opens around the guide. Draw '?' again, tap away (empty space, not a thread end), or wait 45 s with no
  touch: it closes and the guide drifts back to what it was doing.
- No text anywhere: the guide's notes, threads, glows and the existing capped fx.

### O3. The relations view (text-free)
- Shows what is on screen plus a margin of half a screen (Q108): at most 60 threads, built once on open and refreshed every 2 s
  while open (nothing while closed). Each kind of relation has its own look, so you learn them by matching:
  - jam partners: threads pulsing on that jam's beat, in the jam's colour;
  - pairings (carrier and rider, hearing and seeing, cleaner and hoarder, grinders, food web): two strands braided;
  - colony bonds and infinity bonds: short thick solid threads;
  - parent and child: a thread with a small bead flowing from parent to child;
  - teacher and learner: a thread with tiny note dots travelling from teacher to learner, sounding the taught motif softly;
  - longing ties (N): a thread in the longing's hue from home's longing glyph to the ohms that helped or would help (O5);
  - the trail (G): the trail polyline brightens and its nearest stop pulses;
  - regional keys (C): the ground tint of each key region deepens briefly and its drone swells;
  - items and users: a thin thread in the item's glow from item to holder, owner and residents.
  - In space views: threads between remembered worlds (H) for where ohms came from and went, and trail links (G).
- Tap anything while open = focus it: its threads brighten, the others dim, it sings its motif and the guide flies beside it.
- Ranking (O1): every entity in the view glows by its significance (brightest = most watched, touched, jammed or bred). The
  guide TOURS the top 5 in order: it flies to each, the entity sings its motif (or a world chimes its key, an item rings), and
  the guide answers with the same motif in its own voice, about 2 bars each. Touching anything stops the tour.

### O4. Context of all procedural generation
- The view says where things come from, without words: an ohm's thread to its source glows when you focus it (the world's
  fossil site, the life landmark, the meteorite crater, the moon bud, the egg it hatched from at home), and its home-world
  globe glyph (F sprite) appears beside it if it came from elsewhere. Natural (seed-made) entities have a soft steady rim;
  player-made or player-changed ones (hatched, edited, moved) have a faint warm second rim.

### O5. Goals
- The guide's first stop, if any longing is live, is home's longing glyph (or its echo beside the carried row when away). From
  it, threads in the longing's hue run to on-screen ohms that would help (N's 12-axis match: >= .7 bright, .5-.7 faint) and to
  PAIRS (Q111) whose child would likely match (the midpoint of the two genomes inside the gap's tolerances; a doubled dashed thread
  joining the pair to the glyph). A thread also leans off-screen toward the target (N9), with its chime.
- Tier signs (N10 rings and colour) show on the glyph as usual, so goals of different difficulty can be told apart.

### O6. Two-stroke glyphs: '?' and the changed undo arrow (Wilbow, 2:55 AM MDT). FLAG: changes an existing gesture.
Wilbow, verbatim: "Both the hooked arrow and the question mark require second strokes. The arrows being a < 0r >.  The question
Mark's second  being a point under it as in : ?"
- One shared mechanism in symbols.js (built in v0.8a with the undo change; '?' reuses it in v0.8c):
  - FIRST STROKE, a HOOK: a single stroke that scores as the 'undo' hook (the existing hooked-arrow template) or the new
    'question' hook (starts upper left, arcs up and clockwise over the top, down the right and back to the centre, then a
    straight tail down) at <= `SY.CONF` (2.6). Which of the two hooks scored best does not matter; the second stroke decides.
  - A hook ALONE is not undo. It is held: its ink stays, faint, and fades over the window (Q102). While it waits, ghost
    completion (`SY.ghostFor`) shows both possible finishes faintly: a small arrowhead at the hook's end and a point under it.
  - SECOND STROKE within the WINDOW, 1.2 s from the hook's lift (tunable, Q101):
    - an ARROWHEAD '<' or '>' (a two-segment chevron stroke, 15-80% of the hook's size, its tip within .4 x the hook's size of
      either end of the hook) = UNDO. Both directions undo by default; the 4-finger tap stays redo (Q100).
    - a POINT under it (a tap that moves < 10 px, or a stroke under 12 px; below the hook's lowest point by at most .6 x its
      height, within .35 x its width sideways of the tail end) = '?' (the guide, O2).
    - anything else (a point beside or above, a longer stroke, a tap elsewhere): the hook fades doing nothing, and that
      second input routes exactly as it would today, at once.
  - No second stroke within the window: the hook becomes a normal material rod, like any other stroke (Q103, 3:12 answer;
    it then has movable ends, P1). The next stroke after the window is a fresh
    stroke (a material line stays a material line).
- What is never held (it routes at once, as today), so the wait can't swallow existing strokes:
  - CATCH LOOP: closed (end near start); a hook needs end-to-start distance >= .5 x its size.
  - SPIRAL (egg / creature): >= 1.5 turns (`RS.classify`); a hook turns .5-1.25 turns in total.
  - FLICK (Farewell, egg flick): a hook needs size >= 40 px, duration >= 250 ms and mean speed < 900 px/s.
  - Strokes starting on an ohm, a bubble, a halo or the egg; play mode, DNA view, DAW, the baton, while an egg is being drawn
    or during egg lessons.
- The 'infinity' glyph (bond) stays one stroke. The 3-finger tap stays undo and the 4-finger tap stays redo, at every level.
- C9's stricter ground score for the undo hook (`SY.UNDO_GROUND` 2.0) is no longer needed: the arrowhead separates undo from a
  hooked material line. Default: retire it (Q104).
- The guide's undo lesson (guide.js step 'undo', its ghost fingertip path) draws the hook and then the arrowhead; it advances
  only on a real two-stroke undo.
- SPACE VIEWS: one finger pans and there is no ink. A pan whose path forms the '?' hook, followed within the window by a point
  tap on EMPTY space under it, opens the view and eases the camera back to where the pan began (300 ms). A point on a system or
  world is a normal tap; the point is consumed, so it can't start a double-tap fly-home (Q105). Undo has no glyph in space views
  (the 3-finger tap works there, as today).
- While the view is open: a tap away closes it (that tap does nothing else); all other gestures work as normal.
- GESTURES.md is NOT edited now. At build time: row "Hooked return arrow" (line 53) becomes "Hooked arrow + '<' or '>' within
  1.2 s = Undo"; a new row "'?' hook + point under it = the guide's relations view"; C9 (lines 144 and 170) gets a note that
  the two-stroke rule replaces `SY.UNDO_GROUND`; a new §13 conflict row for the held hook. **Needs Wilbow (Q99-Q105).**

### O7. Mechanics, cost, tests, risks
- Cost: counters are integer bumps on events plus the 1 s cull tick (no per-frame work; ZERO off-screen work). The held hook is
  one timer, no per-frame work. The view runs only while open and on screen: build <= 2 ms, refresh every 2 s <= 1 ms, drawing
  <= .4 ms per frame (one cached thread layer, <= 60 polylines, existing fx), one extra quiet voice for the guide. Closed:
  nothing. Background tick within 2% (rule J).
- Save: `tally` per ohm (<= 16 B), world time and landings, item uses; all optional and versioned in H.
- Files: new relate.js (relations, ranking, tour, goal links); symbols.js (two-stroke hold, 'question' hook, arrowhead and
  point tests); guide.js (summon, re-hatch, space sprite, two-stroke undo lesson); surface.js / app.js (counter hooks, routing);
  render.js (thread layer).
- Headless tests (two-stroke glyphs in v0.8a, the rest in v0.8c):
  1. Hook alone -> no undo; at the end of the window it becomes a normal material rod (3:12, Q103).
  2. Hook + '<' -> undo. Hook + '>' -> undo (Q100 default). Both within 1.2 s; at 1.3 s -> no undo: the hook is already a rod
     and the chevron routes as a normal stroke.
  3. Hook + point under it -> the guide and the relations view. Point beside or above -> nothing (the hook fades; the tap routes
     as a normal tap).
  4. Hook, then a material stroke after the window -> material, unchanged from today.
  5. Catch loops, spirals, flicks, egg strokes and strokes starting on an ohm are never held (results and timing as v0.8 before
     O6); the infinity glyph still bonds in one stroke; the 3-finger tap undoes and the 4-finger tap redoes.
  6. Space: a '?' pan + point on empty space opens and returns the camera; a point on a system is a normal tap; no fly-home.
  7. Summon: works with the guide alive, deleted (re-hatches with the same genome) and in space views.
  8. Counters: watched only grows while on screen; interactions bump on each listed handler; offspring on hatch; survive a
     save and load; off-screen ohms unchanged across a 10-minute sim.
  9. Relations: a fixed scene gives the expected threads by kind (jam, pairing, colony, parent, teacher, item, longing).
  10. Ranking and tour: the top 5 by S in order; a touch stops the tour; close on tap away and 45 s timeout.
  11. Goals: helpers >= .7 linked bright; a breeding pair whose midpoint matches gets a dashed thread.
  12. Rule J and budget: background tick within 2%; nothing runs while closed.
- Risks: players used to the one-stroke undo (the guide's lesson and the faint ghost arrowhead teach the new one; the 3-finger
  tap is unchanged); a lone hook is held for the window before it becomes material (Q103, 3:12); thread clutter (60 cap, focus
  dims the rest); counters favour old ohms (log scaling, Q106).

## P. Drawn instruments: movable ends, length = pitch, varied voices, ohms and ensembles (Wilbow, 3:19 and 3:20 AM MDT)
Wilbow, 3:19 AM MDT, verbatim: "1 make endpoints move able. Make length correlate pitch, randomized timbre and other attributes
across all synthesis engines to create varied sounds.  Do the same for shapes that result in blobs. Use established standards,
make ohms interact with drawn shapes. Use/invent new collective shapes/created items with ohms"
Wilbow, 3:20 AM MDT, verbatim: "Make sure ohms also follow tempo and melody of these items partial influences to current jams"
Context: a lone hook (no second stroke) is now a normal material rod (3:12 answer, Q103), so it gets everything here too.
What exists (finding, code read): `Sf.stroke` turns any free stroke into a rod (`Sf.makeRod`, ends within 16 px of ground are
pinned, ends on a non-ohm body are attached) or, if closed, a blob (`Sf.makeBlob`). The material vector comes from `Sf.matFrom`
(speed, wobble, thickness, biome, galaxy metal: rigid, hard, loss, grain, density). Pitch already follows physics in
`S.physics`: string f0 = 196 * (300 / L) * sqrt(T) (Mersenne: inverse to length), tine and bar f0 proportional to h / L^2
(Euler-Bernoulli cantilever and free bar, with their standard mode ratios), blob drum f0 = 92 * (100 / R) * sqrt(T) (circular
membrane, Bessel ratios); clamped 28-4200 Hz, then snapped to the session key (`S.tune` -> `M.snap`) unless `b.free`.
Drawn shapes ring ONLY through the modal pool (audio.js, 32 voices x 8 modes); the 9 synthesis engines (`RS.ENGINES`: VA, FM,
WT, ADD, PD, FOLD, RING, GRAN, NRES) and the physical families (exciters pluck, strike, scrape, bow, blow, voc; resonators
string, modal, membrane, tube, formant) are used only by ohms (inst.js, 14 pooled voices). A drag on a body grabs its nearest
particle with a soft joint and throws on release; a pinned end cannot move at all. Ohms already touch instruments: dropped on
one they adopt it (`C.adopt`, they loop its recent rhythm), ohms with `instrLove > .45` rest on them, hungry ohms eat material,
territorial ohms carry small ones, clusters build strings (D makes those jam-tuned). Player strikes already reach ohms as
phrases they answer (`D.playerPhrase`), and ohms already learn motifs they hear (`social.js` curious) and pull tempo and phase
toward a leader by `m.learn` and conformity (`m.stub`). P builds on those; it adds no menus and no presets.

**P1. Movable ends (rods) and rim handles (blobs).**
- Player sees/does: put a finger on the END of a rod and drag: that end follows the finger, the other end stays put, and the rod
  gets longer or shorter. The note slides as it changes and clicks softly through the notes of the key on the way (like frets).
  Let go on the ground and the end sticks there; let go on a rock, crystal or another shape and it ties on; let go in the air
  and it hangs free. A pinned end that used to be stuck can now be moved the same way. Blobs: drag the EDGE of a blob outward
  or inward: it swells or shrinks and its drum note drops or rises. Dragging the middle of a rod or blob still grabs and throws
  it, exactly as now.
- Mechanics:
  - Handle test in `Sf.grabStart` before the normal grab: rods: finger within `max(16 screen px, hit radius)` of the first or
    last particle -> END mode. Blobs: finger in the outer quarter of the radius (at least 12 screen px band) -> RIM mode. Else
    the normal grab. Ohms, bubbles, eggs and items keep priority (Sf.hit order unchanged).
  - END mode: the moved end particle follows the finger with a firm joint (k .6). If it was pinned, its `W.pins` entry X/Y is
    moved live instead (no unpin and re-pin flicker). The rod is re-laid on release AND every 120 ms during the drag: spring rest
    lengths scale by newL / oldL (particles kept) while 0.5x-2x of the drawn particle spacing; outside that the body is
    rebuilt (`W.resample` at 10 px, same uid, mat, voice, pins and links re-made), never more than once per 250 ms. Length
    limits 0.3x-3x the drawn length and 24-1200 px (Q115).
  - Release: on ground within 16 px -> `W.pin`; on a non-ohm, non-bubble body within 8 px -> `W.attach` to its nearest particle
    (same rules as `Sf.stroke`); else free (the old pin or link is removed). An end-drag never throws (release velocity 0) and
    never counts as a farewell flick (Q112). A rod with 2+ anchors and thick < 7 becomes or stays a string with tension
    recomputed as in `Sf.makeRod` (`chord / L * .93`).
  - RIM mode: the grabbed rim particle and its 2 neighbours on each side follow the finger; the blob's rest area target
    (`pressure`) is rescaled to the new area, limited 0.4x-3x the drawn area (Q113). Release: no throw.
  - New strokes that START near a rod end still attach (chaining rods end to end): the start/end attach radius in `Sf.stroke`
    grows from 8 px to the handle radius + 8, and a stroke whose first touch lands ON a handle is an end-drag, so chaining
    is done by starting just beside the end (shown by the hint).
  - Physics: no new solver. Pins and springs are the existing ones; re-lay is O(n) over the body's particles only.

**P2. Length and size set the pitch (established physics, snapped to the key that is playing there).**
- Player hears: longer = lower, always. A long rod is a deep drone, a short one a high ping. Strings (tied at both ends, thin)
  follow string law (half the length = an octave up); bars and tines follow bar law (half the length = two octaves up); blobs
  follow drum law (twice the width = an octave down). Near a jam, every note lands on the jam's scale; elsewhere on the key of
  the valley (C) or the world. A shape you pinched loose (free tuning) slides freely.
- Mechanics:
  - Keep `S.physics` laws and mode ratios as they are (they are the textbook laws: Mersenne for strings, Euler-Bernoulli for
    bars and cantilevers, Bessel modes for circular membranes); L, h, R and T are re-read after each re-lay.
  - Range (theory correction, 3:50 AM, from MUSIC_THEORY.md §4.1): an order-preserving soft limit, then the key snap: below 41.2 Hz f' = 41.2 * (f / 41.2)^0.3,
    above 2093 Hz f' = 2093 * (f / 2093)^0.3, so longer is ALWAYS lower; once per edit. (Was: octave folding into E1-C7,
    which made a very long rod jump up an octave.) Old text, replaced: "the clamp 28-4200 Hz becomes octave folding
    into E1-C7 (41.2-2093 Hz) so very long or tiny shapes still differ in colour but stay musical" (Q116).
  - Pitch standard: A4 = 440 Hz reference for the tuning systems already in tonal.js.
  - Snap order (Q117): (1) nearest jam within 450 px (`J.local`) -> its key and, for strings, its chord (D's `J.snap(.., strong)`);
    (2) else the regional key from C (`Sf.mods.regionKey`); (3) else the session key (`M.snap`); `b.free` skips snapping.
  - Live while dragging: `A.retune(b.id, ratio)` every frame of motion on the ringing voice; each time the snapped degree
    changes, a soft re-strike (v .25, at most 5 per second), the same path the pinch uses (Q118). Free shapes glide, no clicks.
  - Pinch keeps tension (f ~ sqrt(T)); length and tension now both set pitch, as on a real string.

**P3. Every shape has its own voice, drawn from all the engines (seeded, saved).**
- Player hears: no two drawn shapes sound alike. One rod is a glassy FM bell, the next a woody plucked string, the next a grainy
  wavetable shimmer or a folded buzz; a blob might be a deep skin drum, a ring-mod gong or a breathy formant pot. A shape keeps
  its voice forever (it sounds the same after a reload and on another device with the same seed). How you draw it still
  matters: fast, thin, icy or metallic strokes lean bright and hard; slow, thick, mossy ones lean warm and soft.
- Mechanics:
  - New H component `voice` on every drawn rod and blob: `{v:1, seed}` (8 bytes; missing = derived from uid). seed =
    hash(world seed, body uid). Everything else is regenerated from the seed, so saves stay tiny.
  - From the seed build a timbre-only synthetic genome (engine weights, FM index and ratio, wavetable position, fold, ring ratio,
    grain density, filter cut and resonance, attack/decay, detune, noise, formants, vibrato) and pass it through the existing
    `RS.Inst.fromGenome` (so the same rule as ohms: at most 2 engines blended, q > .3). Engines are stratified over the 9 + a
    "physical only" share (20%), so across 50 shapes every engine appears (test). Exciter follows how it is played (tap =
    strike, strum = pluck, ohm bow = bow, wind = blow); resonator follows the kind (string -> str, bar/tine -> modal, blob ->
    membrane, closed thin blob -> tube, clear blob -> form).
  - Other attributes, seeded jitter around `Sf.matFrom` (never replacing it): material rigid/hard/loss/grain/density +-.15,
    decay (loss), brightness (cut, hardness tilt), inharmonicity (stiffness stretch, capped like `S.timbre`), stereo width,
    vibrato depth. No themes, presets or genres: all continuous.
  - Sound path: the modal ring stays the body (pitch, strike position, shadow muffle, light partial unchanged); the engine
    voice is layered at the same f0 with share `engMix` .2-.65 (harder and clearer shapes take more engine colour). Double tap
    clear/dense also moves the share (clear +.15, dense -.15) (Q121).
  - Cost: at most 4 shape notes use the instrument pool at once (14 voices, shared with ohms; ohms have priority). When none is
    free, or the shape is off-screen, it rings modal-only. No new audio nodes (Q120).
- **Amended in 0.8a9 (Wilbow 12:06 PM MDT: "always be random sounds with different settings and engines"): the stratified pool is
  replaced by full randomization.** Shapes drawn since 0.8a9 save `voice v:2`:
  - Seed: a fresh random number at draw time, not just hash(world, uid). The first blob in every world used to get the same slot.
  - Engine: dealt from a shuffled 9-card deck (all 9 engines, no physical-only slot), weight .72-.99. 38% of shapes get a second
    engine at .34-.64. Every other gene is random. Material leans only 30%.
  - The shape's own modal ring is randomized too: family harmonic / odd / soft / octave / bar / membrane / tine, plus tilt, decay,
    exciter and resonator.
  - The engine voice takes .55-.92 of the level. It was .2-.65, and the membrane ring dominated, so blobs read as bells.
  - Pitch still follows length + key snap. A voice is fixed for life and saved. Ohms never take a shape's voice.
  - Shapes saved before 0.8a9 (`v:1`) keep their old sound.
  - Default spiral ohms (no stroke-feature voice) get the same treatment from their own deck (RS.Genome.spinDefault). Stroke
    features and birthplace still lean the voice, and budding / breeding inheritance is unchanged.

**P4. Blobs get the same.** Rim handles (P1), drum law and folding and snapping (P2), seeded voice with membrane/tube/formant
resonators (P3), the same caps. Light blobs (star) and water keep their own voices (unchanged).

**P5. Ohms play drawn shapes on their own, each in its own way.**
- Player sees/hears: ohms wander up to the things you draw and play them. A drummer-type ohm beats a blob; a plucky one picks
  a string; a smooth singer draws a bow-like hum from a glassy rod; a singer stands beside a shape and sings its note until it
  rings back on its own; small floaters perch on rods and set them swaying. In a jam they play your shapes in the jam's time
  and key. Each ohm keeps its habit, so you learn who does what.
- Mechanics:
  - Technique by genes and abilities (existing values only): strike = percussive genes (perc, drum type) or the strike exciter;
    pluck = pluck exciter weight (strings, tines); bow = bow/blow exciter on smooth or clear shapes (existing friction BOW voice,
    sound.js); sing-to (sympathetic) = voc exciter / tract singers: when the ohm's note is within 30 cents of the shape's f0
    (or an octave), the shape rings softly (v .15) without a strike; perch = existing `restOn` (instrLove > .45). Pick the
    highest of (gene fit x instrLove x register fit: shape f0 within an octave of the ohm's range).
  - Seeking: an on-screen ohm within 300 px of a drawn shape and not busy (not fleeing, carried, jam-settling, conducted)
    decides at most once per 4 bars (Q122). In a jam: hits are placed on the member's grid (`J.gridTime`), notes are the
    shape's own pitch (already snapped to the jam by P2). Outside a jam: the existing adopt loop (`C.adopt`) is reused.
  - Hungry ohms still eat material as now; shapes being played (last 4 bars) are skipped by eaters.
  - Off-screen: nothing runs (rule J). An adopted loop pauses and resumes at the bar phase when back on screen.

**P6. Ensembles: shapes and ohms together (numbered; IN = built in chunk 3b, PROPOSED = only if Wilbow says yes, Q123).**
Recognised only on shape events (drawn, moved, deleted, re-laid): shapes within 250 px are grouped (<= 40 shapes per chunk,
O(n^2) <= 1,600 checks), the group is saved as a small H record `ensemble {kind, ids}`. A recognised ensemble glows once
together (one shared colour pulse) and plays one rising sweep across its members.
1. Drone rod (IN). Experience: draw a long rod (>= 300 px); two to four bowing ohms gather along it and hold a steady,
   breathing drone on the jam's home note, like a tanpura or shruti box under the jam. Mechanism: bow-technique members of a
   nearby jam take places along the rod; it sustains via the bow voice, re-bowed each bar; its pitch is the rod's own (P2,
   snapped to the jam tonic or fifth when within 50 cents); you lengthen it to move the drone.
2. Marimba row (IN). Experience: lay three or more bars side by side; they become one instrument in a scale, high to low;
   drag their ends and each one clicks onto the next note of the scale; a striker ohm walks the row playing the jam's melody.
   Mechanism: 3+ free or one-pinned bars roughly parallel (angle within 25 degrees), sorted by f0; end-drags inside the row
   snap to distinct adjacent degrees of the row key (the jam's or C's); one striker member maps its melody degrees to bars.
   Row bars use tuned-bar overtone ratios [1, 4.0, 9.9] (undercut marimba bars: partial 2 two octaves up) instead of the
   free bar's [1, 2.756, 5.404, ...], so chords on the row do not clash (theory correction, 3:50 AM, from MUSIC_THEORY.md §4.7; was: free-bar ratios). A bar
   leaving the row returns to free-bar ratios. Cost: a constant table.
3. Harp frame (IN). Experience: tie three or more strings across between two rods or rocks; it is a harp. Strum it and it
   sounds the jam's chord; pluckers arpeggiate on it. Mechanism: 3+ strings sharing two anchor bodies (or pinned in parallel),
   jam-tuned as in D (chord tones); pluck-technique ohms play broken chords on members' grids; the player's strum is the
   existing strum.
4. Drum circle (IN). Experience: draw three or more blobs around a spot; drummer ohms gather in the middle and share the
   jam's rhythm across the drums, big ones low, small ones high, like a djembe and dunun circle. Mechanism: 3+ blobs within
   250 px of their centroid; percussive members split the jam's drum pattern (the existing jam groove; chunk 4's clave if
   that tradition is playing) by drum size (kick low, toms mid, small high).
5. Kalimba (PROPOSED). Several tines (rods pinned at one end) on one anchor body; tine length sets pitch by cantilever law
   (the mbira standard); small pluckers play.
6. Wind harp (EXISTS). Wind already strums thin pinned strings; with P2 they now sound in the local key. No new work.
7. Glass harmonica (PROPOSED). A row of clear (double-tapped) blobs; bowing ohms rub them into sustained glassy chords.
8. Chime tree (INVENTED, PROPOSED). Rods hung by one end from a structure or rock; they swing in wind and ring as tuned chimes
   when ohms brush past; the tree's pitches form a chord of the local key.
9. Ohm loom (INVENTED, PROPOSED). Draw two rods; 'weave' ohms stretch strings between them in the jam's chord, building a
   harp for you over a few bars.
10. Carried string (INVENTED, PROPOSED). A rod whose ends are tied to two ohms; it rings as they walk, and its note bends with
    their distance. Needs attaching to ohms (excluded today).
11. Colony organ (INVENTED, PROPOSED). A fused colony perches along a row of tube-voiced rods (blow exciter) and holds
    chords, one member per pipe.
12. Rolling bell (INVENTED, PROPOSED). A blob rolled along the ground by strider ohms, ringing on every contact in a pattern.

**P7. Ohms follow the tempo and melody of played shapes, as a partial influence on their jams (Wilbow, 3:20 AM).**
- Player sees/hears: play a rod or a drum steadily near a jam (or let a lone ohm play it) and the jam leans toward you: it
  speeds up or slows down a little toward your pulse, and its melodies start borrowing the shape of your line (your rises,
  falls and leaps), sung in the jam's own key. It never becomes your copy. Stop, and over a few bars the jam drifts back to its
  own pace and tunes. While you conduct with the baton, the baton rules and the shapes are ignored. Open, experienced ohms lean
  in more; stubborn or competitive ones barely move. A thin pulse in the shape's colour travels from the shape to the jam on
  its beats while it is being heard.
- What is summarised (per shape, updated ONLY on its strike events, O(1), no per-frame work): last 12 onset times (ring),
  median IOI -> tempo estimate, regularity (1 - IOI coefficient of variation), last 8 snapped degrees -> contour (up/down/
  same), interval sizes (steps vs leaps), mean register, onset density, last-onset time, source mix (player, other ohms,
  wind/collision). About 10 numbers + 8 small ints, saved with nothing (rebuilt as it is played).
- Who counts: player-played and non-member-ohm-played shapes at full weight; wind or collision rings at .3; a jam's OWN
  members' playing does not count for that jam (no feedback loop) (Q128).
- Weight (Q124, Q125): evaluated once per jam bar (the existing bar event in `J.tick`), on-screen jams only, nearest 8 heard
  shapes within 450 px. Per shape: w = .25 (cap) x activity (onsets in the last 2 bars / 8, max 1) x closeness (1 - d / 450)
  x fit (tempo: regularity; melody: 1 if its notes sit on the jam's key within 30 cents, else .5). Sum over shapes capped at .25.
- Tempo: the leader's `bpmT` moves toward the shape tempo folded to within half/double of the jam's (as jam locking already
  allows), step = w x .5 of the gap per bar, at most 8% per bar, and never more than 25% away from the jam's own target
  (`bpm0` / `bpmPref`). Members already follow the leader. Phase: members' `phErr` gets a nudge toward the shape's onsets,
  scaled by their own follow strength.
- Melody: a member's next generated phrase borrows the shape's last 3-4 intervals and contour with probability = its follow
  strength (capped 1 in 3 phrases), transposed into the member's key and register; chord choice leans toward a degree the shape
  keeps landing on (like D's lean). Genes are never changed; the borrowing is like `social.js` curious learning, temporary.
- Follow strength per ohm (Q127): f = w x (.5 + .5 x learn) x (1 - .8 x stub) x (.6 + .4 x skill `exp.sk`) x (.5 + .5 x
  instrLove), with competitive ohms x .6 and curious ohms x 1.3 for melody only; clamped 0-.25.
- Decay: per-shape weight halves every 2 bars after its last onset; gone after 8 quiet bars; the jam then relaxes to its own
  tempo at the existing entrainment rate (Q125).
- Conducting wins (Q126): while the baton is up, shape influence on conducted ohms is 0; it resumes 2 bars after the baton is
  lowered. Beat changes, thunder resets and key are unchanged (the key always stays the jam's; shapes only snap TO it).
- Off-screen: no evaluation at all (no jam bar events off-screen beyond what exists). Experience (exp.js D/D2) is not changed
  by following (Q129).

**P8. Checks, tests and cost (chunk 3b).**
1. End drag: a pinned end follows the finger and re-pins where dropped on the ground; dropped on a rock it attaches; dropped in
   the air it is free; the far end never moves; no throw; a flick from an end never deletes; a middle drag still throws and the
   farewell flick from the middle still deletes (delete_check.js, v061_check.js unchanged: they grab at the centre).
2. Rim drag: blob area x4 -> f0 / 2 (within 2% before snapping); centre drag still throws (test_v2.js 240-241 unchanged).
3. Length laws: string half length -> f0 x 2; bar half length -> f0 x 4 (before snapping, 1%); test_world.js lines 13-15 still
   pass (longer lower, bigger lower, tighter higher); the soft limit keeps strict order (a longer rod of the same kind is never higher) and
   compresses outside 41.2-2093 Hz (theory correction, 3:50 AM, from MUSIC_THEORY.md; was: folding into 41-2093 Hz).
4. Snap: within 450 px of a jam every shape note is on the jam's scale (<= 5 cents); with no jam, on C's regional key when
   present, else the session key; `b.free` shapes unsnapped.
5. Live drag: retune calls while moving; re-strikes only on degree change, <= 5 per second; no clicks while dragging a free shape.
6. Voice: same seed -> identical voice params after save and reload (H component); 50 shapes cover all 9 engines plus
   physical-only; never more than 4 shape notes in the instrument pool; ohm notes never stolen by shapes.
7. Ohms: a percussive ohm strikes a blob, a pluck ohm plucks a string, a bow ohm bows a clear rod, a singer makes a shape ring
   sympathetically; <= 1 decision per ohm per 4 bars; off-screen ohms make none.
8. Ensembles: 3 parallel bars -> marimba row with distinct adjacent degrees; 3 strings on two anchors -> harp on chord tones;
   3 blobs -> drum circle split by size; a 300 px rod + 2 bowing members -> drone within 10 cents of the jam tonic or fifth.
9. Influence: a regular 120 bpm shape next to a 100 bpm jam moves the jam toward 120 within 8 bars but never past 125 (25%);
   stopping returns it to within 3% of 100 within 16 bars; baton up -> no change; high-conformity ohms shift more than
   stubborn ones (same seed); melodies borrow <= 1 in 3 phrases and their genes hash unchanged; a jam's own members playing an
   adopted shape do not move it; a shape 500 px away has no effect.
10. Rule J: the background (perf_j) tick stays within 2% of v0.8a-3; no evaluations with the shapes off-screen.
11. Unchanged: strum, catch loop, pinch tension and grid pop, double tap, hold damp, teach line, walk stick, egg, glyphs.
- Cost limits: re-lay <= once per 120 ms (rebuild <= once per 250 ms) on the dragged body only; ensemble check only on shape
  events; influence once per jam bar, <= 8 shapes; per-shape summary O(1) per strike; 4 instrument voices max for shapes;
  saved data: 8 bytes per shape + ensemble records.

## Q. Ohms feel how much room they take in a jam, in time and in the frequency mix (Wilbow, 3:28 AM MDT)
Wilbow, 3:28 AM MDT, verbatim: "Add ohm awareness of how much relative space it takes up in the jams not timing and frequency mix"
Reading (Q131): "not" is most likely "in": each member knows its share of the jam's space IN TIME (how many onsets per beat,
which subdivisions it fills) and IN THE FREQUENCY MIX (which registers and bands it fills, how loud), compares it with a fair
share, and adapts like a good arranger: thins out, moves octave, changes subdivision, plays softer, or fills an empty band or
slot. If Wilbow meant "not" literally (space only by count of ohms, not by timing or pitch), Q shrinks to Q.2's fair share only.
Labels: Q.1-Q.10 are subsections of this section; Q131-Q147 are questions in M.
What exists (finding, code read): cohere.js gives soft roles (lead melody, bass roots on downbeats, pads that "leave space while
the lead is busy", drums with an interlocking second part) and caps a frame at 6 playing roles (`Co.CAP`, <= 4 tonal, <= 3 drums,
`Co.AUD` 6 audible). `J.fit` scores members for niches (melody, counter, bass, drone, ...) by register, sustain and
percussiveness, and `J.steer` places them. social.js makes shy ohms sparser (`So.bold`), mind.js has a partial "step back"
for density or register crowding and someone else's solo (fewer, longer, softer notes). exp.js (v0.7 D) keeps experience and
skill (`exp.sk`) and the join gate (`Ex.fit` / `Ex.gate`); v0.7 E `Ex.growNotes` adds notes when a watched jam grows; v0.7 G
`RS.Trad.bar` lays tradition patterns. All of these act on ROLE and on the ohm's own notes; nothing measures what the jam
as a whole fills, so 3 ohms can sit in the same octave on the same 16ths and a big jam turns to mud. Q adds that measure.

**Q.1. What the player hears and sees.**
- Jams sound clearer and less muddy. The bass stays low, the lead stays on top, the others spread into the gaps between them.
  Drummers lock into each other's gaps (one on the beat, one between, like West African interlocking parts) instead of
  doubling; melodic ohms can split a line between them like hocket or Balinese kotekan (theory correction, 3:50 AM, from MUSIC_THEORY.md §4.6; was: drums "like
  hocket or Balinese kotekan").
- A big jam arranges itself: when a 5th or 6th ohm joins, the others make room within about 2 bars (someone moves up an
  octave, someone plays half as much, someone goes softer); when one leaves, its gap is filled within about 4 bars.
- Call and response appears on its own: when the lead is busy, others answer in its pauses.
- Each ohm keeps its character: show-offs keep a big share and rarely step back; shy ones make room first and sprinkle; skilled
  ohms find the right move (the empty octave, the empty slot), beginners sometimes just play less or do nothing. Ohms that
  arrange well gain a little experience and get on better with the partners they interlock with.
- An ohm making room leans back slightly (the existing step-back lean); one filling a gap leans in (existing lean forward).
- Your own playing (struck strings, drawn shapes from P) counts as a voice in the jam: the ohms leave room for you too.

**Q.2. The occupancy map (established arranging and mixing practice, not audio analysis).**
- Per jam: 7 octave bands (below 80 Hz, 80-160, 160-320, 320-640, 640-1280, 1280-2560, above 2560: the usual low, low-mid,
  mid, presence, air split of mixing) x N slots per bar, N = the bar's own step count up to 48 (16 in 4/4; tradition bars of
  18-40 steps keep all their steps; 12/8 uses 24 so triplets exist) (theory correction, 3:50 AM, from MUSIC_THEORY.md §4.2; was: 16 slots, at most 16).
- Built ONCE PER BAR on the jam's bar event (`J.tick`), from the notes already generated for that bar by each member's
  `Mi.genBar` (s, d, deg, vel) plus `inst` brightness: a note adds vel to its fundamental's band in the slots it covers (onset
  slot full, held slots x .4), and brightness x .3 to the next one or two bands up (bright voices fill more). Drum hits: kick
  low band, snare mid, hats and shakers top. No FFT, no audio-thread work.
- Each member's share = its energy / the jam's energy; fair share = role weight / sum of weights (lead 1.4, bass 1.0, drums
  1.0 each, counter .9, pad .8, drone .8) (Q133). Crowding per cell = summed energy above 1.0 (more than one strong voice).
  Jam clarity = 1 - crowded cells / occupied cells (0-1), stored as `j.clar` (used by tests and by Q.4's experience).
- One-bar lag: members read the map of the bar just generated when making the next one (stable, no loops in a bar).

**Q.3. How a member adapts (one move per ohm per bar, chosen from its own share and the map).**
- Crowded: when its share is above its own limit (Q.4) or its band is crowded in its busy slots, it picks ONE of:
  1. thin: drop its weakest notes (off-beat, low vel) until near its share; never below 1 note per 2 bars from Q alone;
  2. softer: vel x .7 in crowded cells only;
  3. octave: move to the emptiest neighbouring band by ONE PERIOD of the scale (`sys.period`: 1200 cents, 1902 in
     Bohlen-Pierce), never outside the ohm's body range (its size-derived f0 +- its gene range) (theory correction, 3:50 AM, from MUSIC_THEORY.md §4.4-4.5; was:
     +-1 octave = 1200 cents), keeping chord tones and its scale; it stays there at least
     4 bars (no flapping) and drifts home when the crowd thins;
  4. subdivision: slide onsets into empty slots (offbeat, 8th to triplet-feel or 16th interlock) without breaking its phrase
     grid; drummers prefer this (interlock).
- Room to spare: when its share is well below fair and a band or slot next to it is empty, a bold or skilled ohm FILLS (adds
  a pad tone, an answer in the lead's pause, a fill in empty slots); a shy one does not.
- Protected: the lead keeps its band in its busy slots (others leave it); the bass keeps the lowest occupied band; tradition
  parts from `RS.Trad.bar` (clave, partido-alto, kotekan pairs, the drone and overtones of throat singing from chunk 4) are never
  moved, only counted (Q139); D's jam-tuned strings and P's shapes are never moved by ohms, only counted.
- v0.7 E growth: `Ex.growNotes` places its extra notes only in empty cells (Q142).
- Applied as the LAST wrapper on `Mi.genBar` for jam members (after drumSong, Trad and growNotes), on the bar's note list
  only; no change to genes, motifs or roles; the move is stored on the mind (`m.qMove`, `m.qOct`, `m.qThin`) for the next bar.
- Total loudness of the jam stays within +-10% of what it was (thinning is balanced by fills elsewhere) (Q143).

**Q.4. Personality, skill and experience.**
- Own limit (how much space it allows itself): limit = fair share x (1.2 + .8 x bold + .4 x competitive + .3 x leadership),
  so 1.2x for a humble ohm up to about 2.7x for a showy leader (`So.bold`, `m.comp`, `c.P.life.leadership`) (Q135).
- Skill: the chance of choosing the BEST move (the one that most lowers crowding) is .4 + .6 x `exp.sk`; otherwise it picks
  thin, or (novices, 20%) does nothing that bar (Q136).
- Experience (v0.7 D): a bar where the jam is clear (`j.clar` >= .7) and this ohm made a move adds a small bonus to its normal
  good-jam experience tick (+10%); two members whose cells stayed apart for 8 bars raise their existing D2 pair familiarity
  a little faster (Q137). Nothing else in exp.js changes; `Ex.fit` / `Ex.gate` join rules are unchanged.

**Q.5. Conducting, the player and the mix.**
- Baton wins (v0.7 B): while the baton is up, Q makes no moves for conducted ohms (their loudness and cues come from the baton);
  a cued ohm is never thinned; Q resumes on the next bar after the baton is lowered (Q140).
- The player as a voice: player-struck strings and bodies, and P's drawn shapes, go into the map as a GUEST occupant with its
  own fair share (weight 1.0) from P7's per-shape summary (band from its f0, slots from its last onsets) and from
  `Sf.strikesP`. Ohms make room for it but never push it. Shapes played by an ohm count as that ohm's notes (Q141).
- DAW and player mix settings (volume, mute, `D.mixOp`) win over Q; a muted ohm is counted as empty (Q144).
- Only audible members count (`Co.AUD`); humming or waiting ohms count at their hum loudness.

**Q.6. Cost (rule J).**
- On screen: one map per on-screen jam per bar: <= 7 members x ~32 notes -> one 7 x N table (N <= 48), a few hundred operations.
- Off screen: no map, no moves. The jam keeps its last arrangement (`m.qOct`, `m.qThin` and the summary `j.qs = {clar, bands[7],
  slots mask}`) cached and frozen; when it returns on screen the next bar rebuilds the map (Q146).
- No per-frame work anywhere; nothing saved except the cached summary (optional field, missing = none).

**Q.7. Hint (section I style).** Once, the first time a jam of 4 or more arranges itself on screen (a move that raises `j.clar`
by .15), each member's glow briefly lifts to a height by its band (low ohms glow low, high ones high) and the step-back lean is
visible; max 3 times, none during settling or the baton (Q145).

**Q.8. Gesture check.** No new gesture. Every existing gesture is unchanged (tap, strum, pinch, hold, baton, catch, teach, drag,
drop-adopt, DAW holds and pinches). Only what ohms play changes, so tests that pin exact note lists of a big jam change (K).

**Q.9. Tests (chunk 3c).**
1. A seeded 6-member jam with 3 tonal members in one octave: within 4 bars crowded cells drop by >= 40% and `j.clar` rises.
2. The bass stays in the lowest occupied band and the lead keeps its band in its busy slots.
3. Same seed, shy vs bold (bold/shyness genes swapped): the shy ohm moves first; the bold one keeps the larger share.
4. Same seed, skill 0 vs 1: the skilled ohm's moves lower crowding more (over 16 bars).
5. A newcomer joins: crowding back under the threshold within 2 bars; a member leaves: its band filled within 4 bars.
6. Baton up: no Q moves for conducted ohms; cued ohms never thinned; moves resume one bar after baton down.
7. Tradition parts (clave, partido-alto, kotekan, throat-singing drone) are byte-identical with and without Q.
8. A player-played P shape in one band: members' energy in that band and its slots falls; the shape is never changed.
9. No octave flapping (<= 1 shift per ohm per 4 bars); no member below 1 note per 2 bars from Q; jam energy within +-10%.
10. Genomes, motifs and roles hash unchanged; fixed seeds give identical note lists run to run.
11. Off-screen: zero map builds; cached arrangement applied; perf_j background tick within 2% of chunk 3b.
12. Experience: clear bars with moves give the +10% bonus only; `Ex.gate` results unchanged for the jam test seeds.
- Behaviour change (K): exact note lists of jams with 3+ members change; tests that pin them (cohere and jam soak checks that
  compare note counts or registers per member) get Q.9's bounds instead. Two-member jams change little (most pairs are under
  their limits).

**Q.10. Build.** Overnight chunk 3c, right after 3b (it needs P's shapes as occupants and D's strings), before chunk 4; chunk 4's
traditions then register their fixed parts with Q's protected list. Questions 131-147.

## R. Pieces on purpose: ink, retrace, soft clay (Wilbow, 1:42, 1:44, 1:45 and 1:49 PM MDT Oct 23 2026). Build as v0.8b1 (vc25).

Wilbow: "The drawing spawning objects happens too often. Creating a variety of objects but have them retain the shape, dynamic
material qualities linked to sound. Create specific pieces for ohms to pick up and user to play" / "No I meant that every stroke
makes a piece" / "Multi stage gestures, also a bit more time to do multi stage gestures after circle. Also what the deal woth the
clay one, can we combine the two and make clay be squishy like the soft bodies from closed loops" / "Trace over the same stroke
twice makes a piece" (1:45, answer) / 1:49: "Yes build it ... Let's brainstorm before implementation" (the clay-timbre, sections
and roles part = R7, brainstorm first, not built here).

**R1. A plain stroke is only ink.** A stroke that no gesture recognises no longer becomes material. It leaves glowing ink that
fades over about 2 s and does nothing else. Everything recognised is unchanged: a spiral spawns (or clay / egg), a loop around an
ohm catches it, a line across things strums them, a wave pours water, a star makes light, a zigzag sparks, the glyphs (infinity,
hook + arrow, hook + dot), the loop around the record star, teaching from a halo, writing. A lone hook now fades like any other ink
unless it is retraced (supersedes Q103, where a lone hook became a rod).

**R2. Trace it again and it becomes a piece.** Draw a second stroke over the same ink, in either direction, while it still glows:
the ink becomes a piece in EXACTLY the shape you drew (not a preset). Over = on average within ~18 screen px of the ink (scaled by
zoom) and covering more than ~70% of its length. An open stroke becomes a rod / string / bar as in V08 P (ends you can move, length
= pitch, pinned where it touches the ground, chained onto rod ends), with a freshly randomized voice as in 0.8a9. While the ink
waits it pulses softly, inviting the retrace (no text; the first 4 times only).

**R3. Time to retrace.** About 1.2 s after an open stroke; about 2.5 s after a closed loop ("more time after a circle"). The timer
starts when the finger lifts. Retracing a closed loop makes a SOFT blob: a squishy soft body that keeps the drawn outline, squashes
when it lands or is touched and springs back (lower stiffness and pressure than the old loop blob). A hook's window is the glyph
window (1.2 s, for the arrow / dot) followed by the ink window (1.2 s), so a hook can be retraced for up to ~2.4 s.

**R4. Effects live in pieces, not in a separate item gesture.** "Closed shape + rest = effect item" is retired (the shape was
replaced by a preset). Instead, every retraced piece is something an ohm can pick up: when an ohm carries a drawn piece, the
piece's material qualities set a modulation of the ohm's OWN sound (it never replaces the sound; 3:38 / 3:41):
hollow round loop -> reverb (shell); jagged / rough -> grit (ember) or glitch (shards); long and thin -> comb (reed); faceted loop
-> delay (echo crystal); small -> pitch (lens); soft and smooth -> chorus (droplet); a few corners, even -> tremolo (seed pod);
a long open stroke -> delay. The strongest quality picks the kind, all qualities set its settings (same reading as 0.8 A).
The piece keeps its body and shape while carried (it rides above the ohm) and is put down where the ohm drops it. Ohms only pick
up pieces that are free (not pinned or tied) and small enough to carry. At most 6 pieces are carryable at once (older pieces stay
playable, just not carried); world and ohm-made items are unchanged. Undo of a piece removes it (and frees the carrier); redo puts
it back as a carryable piece.

**R5. Clay and blobs are one soft material.**
- The clay lump (spiral + rest) is a real soft body (a ring of particles with edge springs, area keeping and shape matching to its
  outline): it squashes, wobbles and bounces while you shape it, and its outline eases into each new shape. All section 4 clay
  gestures and the hatch are unchanged (edge push / pull, strand, pinch, two-finger twist, scribble, tap rhythm, the closing ring).
  The soft-body code takes "touches" (a direction, a place, a strength) so new shaping touches can be added later (R7).
- Blobs gain the clay's shaping touches: the rim drag already pushes / pulls the edge (V08 P); a two-finger pinch on a blob already
  squeezes it; NEW: a scribble (back and forth, 4+ reversals) inside a drawn blob roughens it. A blob's sound follows its CURRENT
  shape every time it sounds: size = pitch (as before), stretched out = brighter and more nasal, lumpy / roughened = grittier and
  shorter. No new gestures beyond the blob scribble.

**R6. Specific pieces (spec only; questions 174-181).** Proposals, not built:
1. Chime: a short hanging bar with a ring at the top. Tap or pluck; long bright ring. Ohms hang it near a nest and brush it as they
   pass; carried, it adds a shimmer (chorus).
2. Seed rattle: a closed pod with seeds inside. Shake (quick back-and-forth drag); the seeds rattle. Ohms shake it on beats;
   carried, tremolo at the jam tempo.
3. Reed: a thin tube with a split end. Blow (hold near the mouth end); a buzzing tone. Ohms with a vocal tract blow it; carried,
   comb.
4. Shell horn: a spiral shell. Blow into the open end; a low call. Ohms call others with it; carried, reverb.
5. Stone drum: a flat heavy stone. Tap; a dull thud. Ohms beat time on it; carried, grit (drive).
6. Crystal bowl: a round open bowl. Bow (circle the rim with a finger); a sustained sine. Calm ohms ring it; carried, delay.
7. Spring: a coil. Pluck or stretch; a boingy pitch sweep. Playful ohms bounce on it; carried, pitch.

**R7. Clay timbre, sections and roles (Wilbow 1:49 PM): brainstorm first, separate spec, NOT built in 0.8b1.** "be sure that all
the most important elements of timbre can be customized with the clay stage. Keep in consideration sections of bands and
orchestras, and roles in the sound." Specified (Wilbow 2:04-2:23 PM) in section R7 below; built in 0.8b2.

**R. Gesture check (against GESTURES.md).**
- Strum vs retrace: a strum crosses existing bodies; ink is not a body, so retracing ink never strums. A stroke that crosses bodies
  is still a strum first (as before).
- Two-stroke glyphs vs retrace: the retrace test runs first, but an arrowhead or a dot is tiny next to the hook (coverage << 70%),
  so it never matches; retracing the held hook itself makes a rod from the hook.
- Catch loop vs closed-loop retrace: a loop around an ohm still catches at once (never ink). If an ohm wanders into a waiting loop's
  ink, the retrace catches it instead of making a blob.
- Clay: spiral + rest still opens clay; strokes that start on the clay still shape it; a spiral is never ink.
- Egg lessons: strokes on an egg go to the egg as before; ink does not interfere.
- Blob scribble vs strum: a strum is a line through the blob; a scribble stays inside one drawn blob with 4+ reversals.
- Material clutter: with ink, accidental strokes leave nothing behind (the cause of "too often").

**R. Tests.** Retrace detection (same / reverse direction, offset 10 px yes, 40 px no, half coverage no), ink fades (no body, gone
after the fade), windows (open 1.2 s, closed 2.5 s), lone hook fades unless retraced, closed retrace = soft blob, catch keeps
priority, pieces get a modulation kind from their shape and are carried with their shape, soft clay wobbles and settles and the
clay gestures still edit the genome as before, blob scribble roughens and blob sound follows shape.

## R7. Clay timbre stage (Wilbow 1:49 PM + 2:04 PM MDT Oct 23 2026). Build as v0.8b2 (vc26).

Wilbow 2:04 PM (answering the 16-point clay brainstorm; numbers = that list): "Make sure the clay is very detailed and can feel
soft and form all these shapes but retain shapes / 1 and 2 yes but corners and points should also add elements like distortion or
hard like heavy metal music. / 3 what is the front? Isnt it a ball of clay? / 4, yes 5 definitely yes / holding down in the clay /
7 Use pinching outside the clay pinching point as described above. Press and hold inside clay to "fire" the clay and create
gradient levels of ceramic and metallic bell sounds you described. sound as it gradually hardens and glows abit brighter from
pressing and holding. It is still maluable after but maybe more like metal / Make it stop the timer for spawn if a twofinger touch
on it happens. Then a second two finger touch will creating a rising pitch and glow to confirm spawn."
Folded in from CLAY_TIMBRE_REVIEW.md (music-theory review, 1:52 PM): one brightness target, separate meanings for grit / air /
clang, vibrato on its own wiggle, role = a lean inside the body's range (height dropped 2:12), untouched clay fully random (2:23). The review's section / role table is
guidance, not a limit.

**R7.0 Detailed soft clay that keeps its shape.** The clay is a finer soft body (enough points for small dents, sharp points and
thin tails). Shapes you make STAY (the clay is plastic: it does not spring back to a preset outline); it only jiggles softly when
touched. Only the clay you are shaping is simulated (on screen, one at a time).

**R7.1 The first touch picks a way of playing.** The first shaping touch on fresh clay picks an excitation family (HOW the
sound is set going), never a real-world instrument class. Each family is dealt across every engine that fits it, synthetic as
much as acoustic (2:23 PM: "not literally just orchestra sounds"):
1. tap = struck (short hits: mallets, bells, glass, drums, metal, struck synth tones);
2. flick a strand out = plucked (short decays: plucks, harps, short FM / wavetable / folded plucks);
3. rub across the clay = bowed (a continuous, rubbed excitation: bowed strings, drones, moving pads, organ-like, shimmer);
4. press and drag = blown (breath-driven: reeds, pipes, wind, grain clouds, breathy leads);
5. squeeze (two fingers in) = voiced (formant / vocal-tract voices, choirs, sung leads).
Later touches shape the sound inside that family; the two-finger twist still steps through every voice. Vibrato is its own
touch (R7.9). "Orchestra" and "sections" are a CONCEPT for a large group of ohms playing in unity (roles within a big
ensemble of ohms), not literal orchestra instruments.

**R7.2 Edges set brightness; corners and points add drive.** Rounder = darker, sharper edges = brighter (one brightness target that
each engine reads in its own way). Corners and points ALSO add distortion and hardness, heavy-metal grit: more and sharper points
= harder, more driven, with a harder attack.

**R7.3 Attack = POKE SPEED (default, stated to Wilbow ~2:28 PM MDT Oct 23 2026 with no objection; was pending: "what is the
front? Isn't it a ball of clay?").** How fast you poke the clay sets how fast the sound starts: a quick jab = a sharp attack, a
slow press = a soft swell. As built (v0.8b2): every drag on the clay gets a poke value 0-1 (`CS.pokeOf`: path speed in clay radii
per second, (v - 1) / 5, times 1 - the time the finger rested before moving / the fire hold); a tap counts as a quick jab (.9).
The default `CS.attackHook = CS.pokeAttack` pulls the attack gene 60% (`CS.POKE_MIX`) of the way toward .04 (about 1.3 ms) for a
jab or .80 (about 250 ms) for a slow press, after the role lean, so the latest touch's speed wins but the lean still shows a little.
The hook stays replaceable; null = the genome's own attack. Untouched clay keeps its random attack. Test: v08u U25-U26.

**R7.4 A pulled tail sets sustain and release** (yes). A quick, thin pull still makes a limb (as now); a thick, slow pull makes a
tail: longer tail = longer sustain / release. Q169 (limb vs tail) is still open; this split is the default until answered.

**R7.5 A hollow dent sets body resonance** (definitely yes). Press into the clay and let go (a push in, not a still hold): the dent
stays, and deeper / wider dents give a bigger, more resonant body.

**R7.6 Other touches (Wilbow 2:12 PM, items 8, 9, 12, 13 kept; 11 dropped):**
1. Pinch = size and pitch range together; the body size caps the range (a tiny clay can't be a tuba).
2. Wiggle = vibrato (R7.1); rub stays bowed.
3. The shape leans the role (a lean, never a lock): wide / heavy = bass, tall / thin = lead, round = pad, spiky = percussion.
4. A lean toward a role missing from nearby jams, shown with a colour hint on the clay; never a lock.
5. Height on screen does NOT set the role (item 11 dropped).
6. Kept from the review: a gentle stroke = air (breath noise), scribble = grit, pinched points = clang (bell-like partials) and
   drive (R7.2). Q172-173 still open (Q170 / Q171 answered by items 14-16 at 2:23).

**R7.7 Pinch out points; press and hold to fire.**
1. Pinching from OUTSIDE the clay's edge pulls a point out where you pinch (feeds R7.2).
2. PRESS AND HOLD STILL INSIDE the clay to FIRE it: while you hold, it hardens step by step, soft clay -> ceramic -> metallic
   bell. The sound gains bell-like (inharmonic) partials, the clay glows a bit brighter and a rising shimmer plays. Let go to stop
   at that level.
3. Fired clay can still be shaped, but it is stiffer, more like metal (it moves less per touch and jiggles less).
4. Telling them apart: a press held still for more than ~0.5 s = firing; a press that moves inward and lets go = a dent (R7.5).

**R7.8 Two-finger tap to stop the timer, again to confirm.** A two-finger tap on the clay STOPS the hatch timer: the ring freezes
(visibly). A second two-finger tap plays a rising pitch with a glow and hatches the ohm. A tap = both fingers down and up within
250 ms with little movement, so it never clashes with pinch (size / register) or twist (voices). Frozen clay ignores the timer and a tap on empty space (so it waits for you); a new spiral (one clay at a time), leaving the app and saving still hatch it.

**R7.9 Vibrato wiggle.** With a finger held on the clay, a slow side-to-side wiggle (2-6 Hz, small sway, not a rub across) sets vibrato: wider wiggle = deeper, and the vibrato starts a moment into each note.

**R7.10 Solo vs section: split pieces off (Wilbow 2:17 PM).** "Solo vs section by splitting one or more pieces of clay off.
They dont make more ohms and they stay attached as an appendage of sorts."
1. Pinch a lump AT THE EDGE with two fingers and pull it outward: past ~1.6 x the clay's radius it tears off with a soft snap
   and becomes a small attached lump (an appendage) joined to the clay by a short stretchy neck.
2. Each appendage adds one section player: the same voice doubled, a little detuned, a little late or early and slightly
   different in tone (an ensemble). No appendages = a solo voice. At most 5 appendages (a section of 6).
3. Appendages never become ohms. They stay attached through hatching and stay visible on the ohm as soft lumps that jiggle with it.
   A 3-finger undo takes the last appendage back (one player fewer).
4. Cost: the section shares the ohm's single voice slot. It uses the voice's existing unison oscillator (more detune, mix and width
   with more appendages), so a 6-player section costs the same as one detuned voice, on screen or off.
5. Telling the edge touches apart:
   - one finger, quick thin pull from the edge = limb (as now);
   - one finger, thick slow pull = tail (R7.4);
   - two fingers starting OUTSIDE the edge and closing = pull a point (R7.7);
   - two fingers ON the edge (both within the rim band, close together, midpoint near the rim) moving outward together = split
     (finger gap roughly constant);
   - two fingers across the middle spreading / closing = size pinch; rotating = twist (voices); both down and up within 250 ms
     with little movement = the timer tap (R7.8).
   Flag: a split started slightly outside the edge could read as an outside point-pinch; the rule is where the fingers START
   (outside = point, on the rim = split) and whether they close (point) or move out together (split).

**R7.14 Untouched clay = anything (Wilbow 2:23 PM).** Clay hatched without a touch is fully random across ALL engines and the
whole timbre space (any kind of sound, not limited to orchestral or band instrument emulation). The "orchestra" is a large group
of ohms working in unity, built from roles, not from instrument classes.

**R7.15 Instant feedback without words (kept, 2:23 PM).** Every clay touch answers at once with sound, motion and light, never
text: the touch's note / phrase, the jiggle, glow and colour tracking the sound, a soft snap on a split, the rising shimmer while
firing, the ring freezing on a two-finger tap.

**R7.16 FUTURE (not built, 2:23 PM: "16 not really").** Later in the game ohms may get ways to change their own sound or be
influenced by others. Nothing is built now: current behaviour stays and no new instrument swapping is added.

**R7. Gesture check (GESTURES.md):** 3-finger tap = undo (three fingers, never two; unchanged); section 4 clay rules (gestures start
on the clay, except the outside pinch, which starts just outside its edge); play-mode tap-hold (on ohms, not clay; unchanged);
listen hold (on empty ground, not on clay; the fire hold only counts inside the clay).

**R7. Tests:** shapes retained after touches; first touch picks each section; points raise drive and brightness; tail vs limb;
dent = resonance; outside pinch adds a point; split adds an attached section player (cap 5, never an ohm, kept after hatch); fire levels rise with hold time, stiffness rises, stays malleable; still vs moving
press; two-finger tap freezes / confirms; frozen clay ignores the timer and tap-away but hatches on a new spiral, background and save; 3-finger undo
still works; cost: one clay only.

**R7. As built in 0.8b2 (vc26; www/js/claystage.js wraps mold.js; `RS.ClayStage.on = false` gives the 0.8b1 clay).**
- Soft body 48 points (was 28). Shape edits are kept as a plastic offset on the rest outline (85% of what the finger left, capped at 0.6 R in and 1.1 R out).
- First-touch families: tap = struck; a stroke under 0.35 s = plucked; 4+ reversals over at least 0.35 R = bowed (later scribbles
  stay grit); still 0.2-0.5 s, then moving = blown; a two-finger squeeze (ratio < .88) = voiced. Each picks a random voice from
  its family list (struck: mallet, bell, glass, drums, grit; plucked: pluck, harp, foldlead, mallet; bowed: bowed, drone, movepad,
  organ, shimmer, pad; blown: reed, pipe, wind, grain, lead; voiced: singer, choir, foldlead). A twist still steps all voices.
- Reversals count only past 0.08 R (finger jitter is never a rub). Wiggle: 3+ reversals inside 0.35 R over more than 0.4 s = vibrato (depth = sway, rate = wiggle speed).
- Tail: starts at the edge, ends past 1.3 R, lasts 0.6 s or more and moves slowly. Anything quicker is a limb (Q169 open).
- Dent: a push from the rim inward by more than 0.3 R = body resonance + filter resonance.
- Fire: still for 0.5 s inside the clay (the 450 ms hold already ignores the clay), level grows while held:
  under 0.4 soft, ceramic, from 0.8 metal (about 2.4 s to full). The clay is stiffer while firing and still shapeable after.
- Range cap: gene 123 <= 0.3 + 0.7 x size, kept after every re-read of the shape.
- Hatched ohms keep `sec`, `lumps`, `clayFam`, `fired` in the save. Lumps are drawn on the ohm; they are never ohms.
- Flags: press-drag (blown, 0.2-0.5 s still) sits right under the fire hold (0.5 s); an outside point-pinch and a rim split are told
  apart only by where the fingers start; the hatched ohm's body outline is the genome outline (the plastic clay shape is not fitted
  to body genes); the role lean moves register / envelope (gene 124 is unused).
## DEV. Hidden developer panel (Wilbow 2:31 PM, approved 2:38 PM MDT; built as v0.8a10, vc25). As built.
The one deliberate exception to "no menus / no text": hidden, never hinted by the guide, for development and bug reports.
1. **Open / close:** three fingers down within 350 ms, held still (< 30 px) for 2.0 s (`RS.Dev.HOLD_MS`, `HOLD_PX`, `LAND_MS`). A ring fills at their centre while they rest; lifting early, moving, or a 4th finger = nothing. The quick 3-finger tap (< 400 ms) is still undo; a completed hold's lift never undoes. Works at every level (the recogniser is level-independent), in play mode (the stick finger is separate) and over the DAW. Gesture check: GESTURES.md "v0.8a10".
2. **Tap to identify (consumed):** while open, a one-finger tap shows the thing under it: ohm (full sheet), clay, word egg, item (effect kind + settings, charge, wear, maker, holder), bubble / blob / rod / crystal / kit / landmark bodies (type + role, material, voice, who made it, meta), plant, pool, star. No play / join / mute / pop / listen. Drags and holds still reach the game (the level's `down` is deferred until the finger moves 10 px or holds 450 ms). Off the surface the panel names the level.
3. **Ohm sheet:** id, name, species (genetic cluster), instrument identity + engine blend, key genes with readable names (size, stiffness, density, boldness, sociability, tempo, rhythmic density, range, role lean, lifespan, fertility, vocal tract, exciter, resonance, attack, decay, bodyRes + first 6 instrument genes), experience (xp, sk, jn, pn, inherited e.ih, learned bpm / feel ranges, top meters / scales / roles / traditions), parents, children, generation, the O1 tally (w / i / o / t), mood, state, activity, role, current jam (leader, members, coherence, phase), growth, energy, muted.
4. **Health (refreshed every 0.5 s while open):** build + versionCode (`RS.Dev.BUILD`, checked against build.gradle by pw_dev), fps (own counter, only while open), level, ohm count, off-screen count, active voices (modal / inst / tract from the worklet's stats), stolen voices, peak, audio clock vs wall clock (the worklet reports no render time, so "load" is shown as keeping-up %), audio mode, save size of this world, input / frame error counts, and the last 12 caught errors (App.inputFail, the frame loop's catch, window error / unhandledrejection).
5. **Presentation and cost:** DOM text, top-left, at most 46 % wide and 52 % tall, scrollable, rgba(8,12,18,.62); the lower / right screen stays free for the closing hold and identify taps. Zero cost when closed: no DOM, no timer, no animation frame, no per-frame work (the error ring is event-only, capped at 12).
Tests: tests/pw_dev.js (20 checks), in runser.

## S. Clay that looks like clay, start shapes, hit strength (Wilbow 3:15 PM MDT Oct 23 2026 + Q173). Built as v0.8b3 (vc28).
"The clay doesnt display shapes or feel like clay, also it should start as a unique shape to form instrument"
- S1 look: matte lit clay (light, occlusion, rim light, grain, contact shadow), lasting finger prints, visible dents, tapered limbs, gentle squash, slow settle. Cheap: drawn only for the one clay.
- S2 the hatched ohm keeps the clay's outline (48-ray form saved with the ohm).
- S3 every clay starts as a unique seeded shape (lobes, stretch, soft points, dents) that feeds the R7 timbre map; untouched = random voice.
- S4 (Q173) harder hits are brighter on every engine; real touch pressure when the phone reports it (non-constant), else tap / swipe speed; ohms accent and soften their own notes with the music.
Tests: tests/v08v_check.js.

## T. Play / listen swap and moving ohms (Wilbow 3:32 PM MDT Oct 23 2026). Built as v0.8b4 (vc29), split from 0.8b3.
- T1 plain hold on an ohm = play ('hands' ring); tap-then-hold = listen ('ear' ring ~1.2 s); slide up during the ear ring = play; early lift = nothing.
- T2 call: double tap bare ground; tap tempo: 3+ more taps there.
- T3 group select: loop around 2+ ohms, or a loop + rest; drag a member to move the group; clears on an empty tap or timeout.
- T4 home: drop and keep still 1 s, or hold the called spot; ohms drift home; off-screen stays cheap.
Tests: tests/v08w_check.js, tests/pw_tap.js.

## U. Items: scope, echo, patches, take / knock / split, 20 new kinds, close-up controls (Wilbow 4:12 PM MDT Oct 23 2026). Built as v0.8b5 (vc30), not released.
- E1 an item affects only its carrier and the ohms fused to it (no area effect; a loose world ember gives no grit).
- E2 echo repeats are about half as loud and darker (low-pass per repeat); delay time uses musical divisions from the facet.
- E3 patches grow one seeded kind or none; fewer world items; each item has a seeded character (FXK.ch); kinds are weighted by culture (FXK.CULT, blended).
- G1 drag a carried item away (inside its radius) to take it; G2 flick it to knock it off (lands 40-120 px away); G6 (revised 4:54 / 4:55 PM) a quick, wide two-finger spread (>= 120 px in <= 350 ms) starting on two FUSED ohms unfuses them along the spread axis; they won't re-fuse with each other for ~4 min, then can again. Jams / herds aren't split; slow or small moves stay squeeze / DNA spread / zoom.
- 20 new kinds, all on by default: shimmer star, frost flake, tape reel, spring coil, wah horn, phaser ring, spinner, vowel mouth, harmony twin, sub stone, glide feather, string harp, grain cloud, ring bell, warm coal, old radio, gate comb, swell bud, doppler comet, pump heart. Time effects lock to the carrier's beat grid; pitched effects stay in key. Text-free glyphs.
- Close-up controls: 44 px targets, notch + glow at the sync point, snap by default (off-grid / detune allowed), values saved with the item.
Tests: tests/v08x_check.js (34 checks); items_check L1/L4 and v08_check A9 updated for E1.


## Y. Styles as data, 10 traditions, culture blend, teacher trait + aura, jam novelty learning (Wilbow DECISIONS 4:28-5:08 PM MDT Oct 23 2026). Built as v0.8b6 (vc31), not released.
- Y1 styles are data (PATTERN_LIBRARY 1.2) with a load-time validator; the 14 old traditions generate exactly the b5 notes.
- Y2 new: jazz, funk, dastgah, makam, samba, rumba, reggae (+dub), techno (+house), overtone (voice-like leaders only), china; each with spoken-accent weights for b7. Traditions change notes and style only, never the instrument.
- Y3 every planet is a seeded blend of cultures; galaxies favour two families; some planets have a dominant culture, some a generated one.
- Y4 teacher trait (TEACHER_AURA.md v3): six measures, log4 tiers, gates, teacher = clear tier; lineage, gifted-born gene, wild teachers far from home.
- Y5 jam novelty learning: gain proportional to novelty, scaled to own level, uncapped, both-way links; all-teacher jam is a rare experience kind (look later).
- Y6 the aura: layered, cached, bounded (section 4b caps), behind the bodies; off-screen ohms cost nothing.
Tests: tests/v08y_check.js.
- Y7 learned sounds (Wilbow 6:57-7:00 PM MDT Oct 23 2026: "The individual ohms keep theor instrument. Its not a rule that each each type can be only one thing or sound", "It can learn other sounds too", card "All ohms", "They should also cleanly be able to pull them out individually after fully learning them"). Every ohm, drum or melodic, keeps its birth instrument for good (never changed, swapped or replaced) and can slowly learn up to 3 extra sounds from the ohms it jams with. A learned sound is a snapshot of the other ohm's birth instrument, with a progress from 0 to 1, saved in its experience record. Learning runs in the 2 s jam experience tick, so it is weighted by experience (level 3 is about 4x faster than a beginner), twice as fast from its teachers, and 0.15x as practice when the source ohm is not in the jam. Partly learned (15% or more): a faint extra voice under the birth voice (0.35 x progress). Fully learned: on some phrases (melodic) or some hits (drums, never on the downbeat) the ohm plays that sound ALONE as its own synth voice, with no birth voice, no other layer and no vocal tract. The birth voice stays the default. On screen only: off screen it is the birth voice alone. Old saves load with no learned sounds. When the drums branch lands, a fully learned hit is also handed to RS.Drums.learn(ohm, hitDef) (guarded hook in layers.js).
  Wilbow 7:23 PM "Maybe that is too disruptive" -> 7:25 PM "Alone, but rarely": normally a subtle blended layer; a fully learned sound solos only as an occasional fill or phrase ending: about 1 phrase in 12, never two in a row, last 40% of the phrase, no drum downbeats, on the ohm's own beat and in key. Under 10% of notes (measured 2-4%).
Tests: tests/v08y2_check.js (L1-L15, L11b).
