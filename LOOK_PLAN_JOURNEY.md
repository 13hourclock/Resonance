# Look plan: The Journey Ohm (PROPOSAL)

By Resonance Visuals, 2:50 AM MDT Oct 25 2026. Approved as a job by Wilbow at 2:39 AM: "14A 14B 14C". Everything below is a **proposal or "for example"**. Nothing here is decided until Wilbow says so.
Previews (labelled PROPOSAL 1-3): `/workspace/softsound_previews/journey/` (PNG + JPG; script `make.js`, headless node-canvas, under 1 s).

## What Wilbow asked for (his words)
- Oct 23: "more realistic", "Less cartoon".
- Oct 25 1:04 AM: "Trippy colorful design and psychedelic visual affects".
- Oct 25 2:37 AM: "13A 13B 13D". That means (A) real light, depth and materials together with trippy, sound-reactive colour and pattern that grows as the music develops; (B) bigger psychedelic moments at big musical events; (D) the mix depends on context.
- Oct 25 2:40 AM: "15A 15C 15D", which carries the Oct 24 visual questions over as open features (see the last section).
- His line "the goal of the game is to bring harmony back" (10:02 PM Oct 24) is kept as a quote with all three of its meanings: a lore idea, a spiritual term and a musical term. In this plan, "harmony" only means how well things sound together in a place, and that is a proposal.

## 1. The look in one paragraph (proposal)
There is one light language from galaxy to atom. The base is **real**: one key light per scene (the nearest star, with blackbody colour), soft terminators, atmosphere rims, depth haze, and materials that look like what they are (wet water, dusty ground, a soft translucent ohm skin). On top of that base, **psychedelic colour and pattern come from the actual sound**: the synth's partials set petal counts and line shapes, phase sets the spin and pulse, and harmony sets how saturated and interlocked things are. These are never stamped symbols or presets. The real base never goes away. The trippy layer grows continuously as the music develops and as a place becomes more harmonious. Realistic and psychedelic stay a both/and; neither replaces the other.

## 2. Big musical events open bigger moments (for example)
These are short swells of 1-4 bars that settle back to the everyday look, always landing on the beat or phrase boundary.
- **A jam first locks in:** one shared ring sweeps across grass and water, and a kaleidoscope opens above the jam, its folds built from the jam's own partial ratios (PROPOSAL 2).
- **A cadence resolves:** tension shows as skew and desaturation, then the cadence snaps everything back to symmetry with a bright fold.
- **A place heals:** colour spreads outward from the jam like dye in water. Plants open their phi heads, cracks close, dust settles and the sky's sound bands appear.
- **A key change through a pivot:** the scene's hue rotates smoothly across the bar. There is no cut.
- **A big event at the system or galaxy scale:** a planet's limb flares in the jam's colours, or a galaxy arm brightens.

## 3. Context sets the mix (for example; continuous, never presets)
One continuous value per place (Game Dev's "context" input, see §6) blends from muted to vivid. It is shaped by things like the place's harmony, the jam's development, the planet and its tradition, and how far the player is zoomed out.
- **Discordant or unhealed:** a grey, dusty, desaturated sky; cracked ground; sparse, closed plants; faint, broken aura lines; no waves; flat water. It still uses the same real lighting, so it looks real rather than cartoon-sad.
- **Developing:** sound colour leaks into the sky as soft bands, melody ribbons and rhythm rings appear, auras gain crisp lines and plants start blooming.
- **Harmonious:** vivid colour; auras weave and interlock; gold glints where waves agree; rings run through the water; the kaleidoscope sits just behind the jam.
- **The planet also tints it**, for example a red-dwarf world has a warm day and a tradition that shifts its hue range.
The left-to-right progression in PROPOSAL 1 is one place at three points on this continuous blend.

## 4. Per domain (proposals)
- **Space and galaxies:** point-cloud stars in blackbody colours with a warm bulge. Healed regions carry a faint sound hue in their arms, and they breathe over many bars.
- **Systems:** the star is the only key light. Planets show real crescents. Orbits are faint lines tinted by each planet's sound.
- **Planets and terrain:** a lit top edge, layered depth haze, and material shading. Terrain **pulses** gently on the heartbeat. It can also be **deformed**: when music lifts land (a terrace under a settled jam in PROPOSAL 1, right panel), the new ground uses the same lighting.
- **Ohms:** a soft key-lit body with a warm subsurface feel, a cool far rim and a small catchlight. Hue comes from the ohm's sound. Roles stay readable on the body.
- **Plants:** phi and Fibonacci phyllotaxis heads that open with harmony and colour by octave or partial. Sway comes from the wind field.
- **Water:** reflective and dark. It ripples only from real notes or events, never constantly.
- **Auras:** crisp fine lines rather than haze. Petal counts come from partials, each aura spins at its own rate from its phase, and edges interlock with gold glints where two ohms agree.
- **Jams:** threads between members, melody ribbons and rhythm rings, all earned as the jam develops. Lone or new ohms stay calm (the Oct 23 3:43 PM ripple clarification).
- **Wavelengths (deepest zoom):** the focused voice's real partials drawn as standing waves, using the same hues as its aura. Near-partials shimmer where they beat (PROPOSAL 3, last panel).
- **Zoom membranes:** a soft veil and a light change at each layer crossing. The key light, palette and line style carry through every layer (PROPOSAL 3).

## 5. Cost on a phone GPU (priority: many ohms smooth > always runs well > beauty)
| Element | How (proposal) | Cost note | Cheaper rung |
|---|---|---|---|
| Ohm bodies | Instanced quads with an SDF shader, one draw per body plan | ~1 draw; fragment cost ∝ pixels covered | Drop subsurface; crowd ohms as discs or sprites |
| Auras | One instanced pass; lines evaluated in the fragment shader from 2-4 partial numbers per ohm (uniform block) | Additive overdraw is the main risk: cap at ~6 full auras, cap the radius on screen | Others get one outline ring; then none |
| Aura weave / gold glints | Same shader samples a neighbour's phase (max 2 neighbours) | +1 cos per pixel, cheap | Off below rung 2 |
| Ribbons, rings, threads | Ribbon meshes from a ring buffer of the last ~16 notes; rings are instanced quads | Tiny vertex count; rebuild only on note events | Nearest 1-2 jams only; then rings only |
| Kaleidoscope event | One full-screen quad, a mirror-fold shader, ≤4 bars long | 1 fullscreen pass, only during events | Half resolution; then a radial glow sprite |
| Sky sound bands | Part of the gradient sky shader (no extra pass) | ~free | Static gradient |
| Terrain | Chunk mesh plus a height texture; pulse in the vertex shader; deform writes a delta texture | Vertex work only | Fewer verts per chunk off-focus |
| Plants | Instanced meshes; bloom and sway as uniforms | 1 draw per kind | Halve count; heads as sprites |
| Water | Height-field ripples only from events | Small texture, few events | Static reflection |
| Galaxy / system | Point clouds plus a pre-baked glow sprite | One draw; bake once per seed | Fewer points |
| Bloom | One half-res pass shared by everything | The most expensive single item | Off (ladder step 2), with glow sprites instead |
Rules: one shared bloom pass; additive layers are capped per view; anything that is the same for a bar or phrase is cached per bar or phrase, never per frame; LOD by distance and by the quality ladder (NEW_ENGINE §9); off-screen jams cost nothing.

## 6. Build fit (from Game Dev's 2:40 AM note; nothing created yet)
- The visuals live in a `look/` folder (palettes, materials, light and depth, sound-reactive effects) in the worktree `/workspace/resonance2-wt/visuals`, branch `track/visuals`. render.js calls them through one small hook interface (NOTES_DEV "Shared contracts").
- `look/` only reads world state and music-clock events (beat, notes, jam state, harmony, key changes) plus a context value for realistic versus trippy. It never writes sim or audio state.
- Proposed hook shape, for example: `look.onBar(state)` and `look.onPhrase(state)` (recompute the cached palette, petal numbers and context blend), `look.onEvent(ev)` (queue an event swell), `look.frame(t)` (returns a few uniforms only).
- Every effect declares its cheaper rung on the shared `JO.quality.level`.
- Note: today's render.js is still "Plain Canvas2D for step 1" and three.js is not yet a dependency. So `look/` should hand out engine-neutral numbers (colours, counts, phases, a 0-1 blend) that both the current Canvas2D drawer and the planned three.js shaders can use.

## 7. Open questions for Wilbow (lettered; recommendation first; next free numbers to be assigned by Resonance)
1. **How far the trippy layer goes in a fully harmonised place.**
   A: vivid but the real light is always visible underneath (recommended).
   B: it can fully take over for a moment during big events only.
   C: it can fully take over whenever a place is fully harmonised.
2. **What an unhealed place looks like.**
   A: real but muted, dusty and cracked (recommended).
   B: also glitchy, with broken and stuttering patterns.
   C: almost colourless, like an old photo.
3. **Where the psychedelic pattern lives.**
   A: on things (auras, plants, water, sky) and in the space between jamming ohms (recommended).
   B: also as full-screen overlays during big events.
   C: only on ohms and auras.
4. **How big events swell.**
   A: 1-4 bars, landing on the beat and settling back (recommended).
   B: lasting as long as the music stays at that level.
   C: short flashes only.
5. **Which preview direction to develop next.**
   A: PROPOSAL 1, one place across its states (recommended).
   B: PROPOSAL 2, the big event.
   C: PROPOSAL 3, the zoom language.

## 8. Open features carried over (Wilbow 2:40 AM "15A 15C 15D"; all discussion, nothing decided)
From the Oct 24 ~5:38 PM call (BRAINSTORM.md) and the old previews `softsound_previews/08_jam_view_*`:
- **Terrain shaping**, for example push and pull the ground, music lifting land (shown in P1), ohms digging, roots lifting soil.
- **Waves in synced jams**, for example per-ohm rings (P1, P2), interference glowing gold on consonance (P1, P2) and waves running through grass and water (P2).
- **Intricate, interacting auras**, for example crisp lines instead of haze, their own spin, and edges that weave and merge in a jam (P1 right, P2).
- **Note visuals**, for example melody ribbons, rhythm rings and harmony threads, earned as a jam develops (P1 middle and right).
- **The jam view**, with 12 control ideas (a jam room, the bar as a clock, pitch ribbons, sliding rings, grabbing phrase chunks, role swaps, section beads, tempo and swing, key and mood disc, a pinch for breakdown, hold-and-slide brightness, pinned phrases). There are three looks: orrery, living mandala and constellation. A proposal is to make it the same language as the world (P1's ribbons, rings and threads close up).
- **Old-game reference** (concept only, from ART_DIRECTION.md): blackbody stars, one key light, limb darkening, soft terminator, atmosphere rim, bloom budget, and palette that never changes what the music reads.
