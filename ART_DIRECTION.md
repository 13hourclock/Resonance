> **Note (Wilbow, 2:50 AM Oct 25 2026, 23C 23D):** game ideas called "rules" or "standing rules" in this doc are concepts and features to discuss, not rules (his 10:59 PM Oct 24 words: "Rework all my suggestions and ideas as concepts and features never rules"). How each applies depends on context. His process rules (plan before "go", one job at a time, nothing decided without him, text box on cards) stay rules.

# Resonance: ART DIRECTION (living style guide)

Owner: **Resonance Visuals bot** (art direction across all visuals). Status of everything below: **PROPOSED, pending Wilbow's approval** (standing rule: consult before look changes; never remove a feature he has seen).
Written Fri Oct 23 2026, 2:37 AM MDT. Code read: www/js at v0.7 (read only; nothing in www/js, tests or android was touched).

## 0. The ask (verbatim)
- Wilbow, Fri Oct 23 2026, 2:30 AM MDT: "Nicer looking, more realistic space, planets and star systems, plus any connecting features.  Less cartoon  looking graphics.  Add another bot for stylized esthetics across all visuals. Employ as efficacy dictates"
- Wilbow, Fri Oct 23 2026, 2:30 AM MDT (via Resonance): "Have visuals bot give previews of options without heavy testing koad" (koad = load).

How this relates to V08_SPEC.md: sections **E** (variety, seamless zoom, many systems) and **F** (realistic space look) build the renderer and expose `RS.SpaceLook`. F says: "where it disagrees, ART_DIRECTION.md wins". This doc sets the look, the techniques and the parameter defaults. Parameter names in the space sections reuse F's `RS.SpaceLook` keys; new ones are marked (new). For surface, ohms, plants, water and effects this doc proposes a sibling table, `RS.WorldLook`.

Previews (light still renders of the real techniques, node-canvas, scratch only): `/workspace/softsound_previews/` (see section 6).

## 1. Target look in one paragraph
**Painterly-physical.** Light behaves like light: one star lights everything, round things are shaded, there are dark sides and glowing air. Colour comes from temperature and material, not from a paint box. It is still stylised and cohesive: soft gradients instead of outlines (the Lensure precedent L17/t27: "Make most visuals be gradient as opposed to lines and outlines... cinematic visuals without too much processing power"), a restrained palette per place, a bit of bloom, and no photo-textures. Space is the most realistic part. The surface and the ohms share the same light model but keep their softness and readability, so the zoom from galaxy to an ohm reads as one world.

Things to get rid of (the "cartoon" signals in today's code): flat filled circles, stroked rings standing in for atmospheres or glows, hard white lines (orbits, comet, stroked ellipse rings), empty black backgrounds, saturated pure-hue UI rings, and black hard cuts between levels.

## 2. Physical palette and lighting model (applies everywhere)
1. **Star colour.** Use the blackbody colour `RS.bbRGB(T)` (exists), then apply exposure, then desaturate toward white: `col = mix(bb(T), white, 1 - starSaturation)`. Real stars look nearly white with a tint. The core is always whiter than the halo (`core = mix(col, white, .8)`). Default `starSaturation` .6 (range .3-.9). The same function gives the sky sun on the surface, so a red-dwarf world has an orange day.
2. **One key light per scene.** The system's star is the only directional light. Light direction per body = normalised (star - body) in screen space plus a small z term (`lightZ`, default .25), so planets show real crescents and half-moons as they orbit. On the surface the existing `Sf.sunPos` is the key light. Fill light = `ambient` (default .035) tinted by the sky or galaxy colour, never pure grey.
3. **Limb darkening** (stars and gas giants): `I = 1 - u(1 - mu)` with `mu = sqrt(1 - r²)`. `u` = `limbDarkening`, default .6 for stars and .35 for planets. The limb also shifts toward the colour of `bb(0.7T)` (redder edge).
4. **Soft terminator.** `lit = smoothstep(-s, s2, n·L)` with `terminatorSoftness` s .10 (range .02-.25), plus a warm twilight band near n·L ≈ 0 on worlds with air (`twilight`, default .25, colour mix(star, [255,140,90])).
5. **Atmospheric rim scattering** (a cheap Rayleigh stand-in): rim = `(1 - mu)^2.5 × clamp(1.4 n·L + .35)` inside the disc, plus an outer halo `exp(-(r-1)/w)` (w .06 R) brightest on the lit limb. The tint comes from type: wet worlds bluish [110,170,255], giants warm haze [255,215,170], icy pale cyan, multiplied by star colour. Strength = `atmoStrength × P.atmo`.
6. **Fresnel-ish rims on ohms** (section 4.8): a thin bright edge on the side facing the key light, and a cool rim on the far side from sky/ambient. Gradient-filled, never a stroke.
7. **Bloom budget** (additive 'lighter' composites per frame, a hard cap per view): galaxy ≤ 6 full-screen-ish layers + sprites; system ≤ 4 large gradients + 1 per planet halo; surface ≤ 3 large (sun, horizon glow, event) + ohm glows capped by the existing particle/glow caps. Large additive gradients are the main fill-rate cost on phones, so bloom sprites are pre-rendered and drawn with drawImage, never rebuilt per frame (`bloomRadius`, `haloStrength`, `haloFalloff`).
8. **Palette↔sound stays untouched.** `RS.palette` / `R.palX` inputs (type, seed, hues) still drive the music. Realism only changes how colours are *rendered* (shading, exposure, desaturation); it never changes palette values the music reads (R2.13, t106).

## 3. Global performance and caching rules (phones, Canvas 2D)
- Draw only gradients, sprites (drawImage) and cached layers in the hot path. Anything with per-pixel noise is **baked once** to an offscreen canvas: at load, on entering a level, or on a zoom-band change, spread over frames (≤ 2 ms of baking per frame; OffscreenCanvas in a worker when available).
- Cache keys: `(seed, kind, radius bucket)` with power-of-two radius buckets 8-256 px. LRU ≤ 24 MB total (as in F). On DPR change rebuild lazily.
- Today **nothing** in www/js uses an offscreen canvas: every gradient is created per frame (render.js alone has ~51 gradient/composite uses). Caching the sun, ohm glows and the night sky is a free win even before any new look.
- The existing adaptive DPR (down when frames > 11 ms, up when < 6 ms) and the quality ladder stay. New layers register a cost tier so the ladder can drop them first: grain → nebula parallax layer 3 → corona → cloud layer → twilight band.
- Off-screen ohms cost nothing new (rule 9): all ohm look work is in draw, behind the existing `inView` culls.
- Measured preview bake costs (node-canvas on the box, single core, unoptimised JS; a phone is roughly 3-5x slower): a 340×604 starfield (900 stars) ≈ 4 ms; a ¼-res nebula ≈ 17 ms; a planet sphere bake at R=60 ≈ 20-32 ms (gas/ocean). All of these are one-time costs, never per frame.

## 4. Domains

### 4.1 Deep-space backdrop (shared sky for galaxy, system and planet views)
- **Now:** galaxy view has a #020208 fill plus one radial "nebula" gradient `hsla(useed*67%360, 60%, 40%, .25)`. System view is a flat #03040a with no stars at all. The surface at night draws 90 fillRect stars (2 parallax depths).
- **Target:** deep black with depth: thousands of faint stars, a few bright ones with soft halos, tinted by their temperature; a faint band of the home galaxy's light and dust behind star systems, so "you are inside a galaxy" is always visible.
- **Technique:** a baked starfield with a magnitude power law (`m = rand^starfieldPow`, size .5-2.1 px, alpha .12-1); colour = desaturated bb(T) with an IMF-like T sample (cool common, hot rare); stars with m > .55 get a tinted halo sprite. The nebula/milky band is domain-warped fBm baked at ¼ resolution and upscaled with smoothing; a dust mask multiplies it down. Three layers (far stars, band, near stars) with parallax 0, .02, .05 of the camera pan. The band orientation in the system view comes from the system's position in the galaxy (F: "the system view's background is the galaxy as seen from that system").
- **Phone cost + caching:** 3 screen-sized canvases (or 1.5× screen to allow pan), baked once per galaxy and per system entry (≤ 40 ms, spread). Per frame: 3 drawImage calls. On the low-quality tier, merge to 1 layer with no parallax.
- **Parameters:** `starfieldDensity` (stars per megapixel, 600-4000, default 1800); `starfieldPow` (new, 4-10, 7); `nebulaDensity` (0-1, .35); `nebulaOctaves` (2-5, 4); `nebulaHueSpread` (0-90°, 30); `emissionStrength` (0-1, .3); `dustOpacity` (0-1, .5); `dustContrast` (.5-2, 1); `parallax` (new, [0, .02, .05]); `grain` (0-.05, .012); `vignette` (0-.5, .18).

### 4.2 Galaxies
- **Now:** each of the 480 systems is a flat circle `css(s.rgb, .5+al*.5)`; awakened systems get a flat 4× halo circle; life systems get a pulsing stroked ring (180,255,200); the home beacon is a pulsing green stroked ring; lineage constellations are straight lines at alpha .45 with dots. There is no arm texture, bulge or dust.
- **Target:** a real spiral seen from above: a warm glowing core, blue-white arms made of countless stars, dark dust lanes along the inner edge of each arm, pink and blue knots where young stars form. The home star, living systems and lineage still stand out, as light rather than drawn rings.
- **Technique:** (a) the bulge is two pre-rendered warm radial sprites (scale from the seeded bulge size, E). (b) Arm glow: additive splats of each star's colour onto a ¼-res canvas, upscaled (the soft glow). (c) Dust lanes: dark low-alpha splats offset −.11 rad (trailing side) from the arm centre on the same low-res layer; source-over or multiply. (d) Systems: 1-2 px fillRects in colour bins, plus a tinted halo sprite for bright ones (`m > .35`). (e) The home beacon becomes a soft green breathing halo sprite (same position, same pulse timing, same hit area). Life systems get a faint green-white halo that breathes with the galaxy beat. Awakened systems get a slightly larger halo. (f) Lineage constellations: thin gradient threads (alpha peaks at the stars, fades mid-span), width 0.8 px, plus a soft 3 px glow pass; still drawn only, never icons (VISION_PROPOSAL rule).
- **Phone cost + caching:** the arm glow, dust and bulge are baked once per galaxy per zoom band (E's bands) into one layer; far systems are baked into that layer too (F). Per frame: 1-3 drawImage calls + the nearest ~40 sprites + beacon/life/lineage sprites. Rebuild on band change only.
- **Parameters:** `armGlow` (new, 0-1, .55); `armWidth` (new, from E morphology, seeded); `dustOpacity` / `dustContrast` (shared); `bulgeSize` (seeded from persona, .15-.4 of disc radius); `knotDensity` (new, 0-1, .5); `haloStrength` (0-1, .6); `coreSize` (px, 1-3, 1.6); `constellationAlpha` (0-.6, .3); `beaconGlow` (new, 0-1, .6); `lifeGlow` (new, 0-1, .45).

### 4.3 Clusters (E Q53)
- **Now:** none.
- **Target:** open clusters are small sparkling handfuls of hot blue-white stars inside a faint pink or blue glow, sitting in the arms. Globular clusters are round, dense, old, golden balls floating above the disc. They are readable as places at a glance and invite a zoom.
- **Technique:** members are ordinary systems (E). Look: open = a pre-rendered radial glow sprite tinted by age (young: emission pink [255,120,170] mixed with reflection blue [160,190,255]), members drawn as 1.2-1.6 px hot-white points with a Gaussian scatter. Globular = a warm radial density sprite (King-profile-like: bright core, long soft edge) baked once per cluster, plus 20-40 resolved member points when zoomed. No outlines or labels.
- **Phone cost + caching:** one sprite per cluster per zoom band (≤ 64 px); members come from the tile LRU (E).
- **Parameters:** `clusterGlow` (new, 0-1, .35); `openTint` (new, emission↔reflection mix 0-1, .5); `globularWarmth` (new, 0-1, .7); `clusterResolve` (new, zoom at which members become points, 4-12, 6).

### 4.4 Star systems
- **Now:** the star is a single radial gradient, radius 40×size. The belt is 90 fillRects of 1.5 px at alpha .5. Orbits are 64-segment white lines at alpha .08. Planets are flat `css(b.col)` fills plus a stroked atmosphere ring (lineWidth 2+atmo×3). Rings are a single stroked ellipse. Moons are flat grey circles. The ark is a pulsing green stroked ring. The comet is a 2-point line.
- **Target:** a sun you could squint at, lighting real little worlds; orbits sensed rather than drawn; a dusty belt that glints on the sunward side; comets with two tails pointing away from the star; the ark is a small lit object with a soft green running light.
- **Technique, star (Sheet 2):** limb-darkened disc baked with a faint granulation fBm (±12%), a baked corona of radial streamers from polar fBm (out to 3R, `exp(-(r-1)/.42)`), drawn additive, and a 3-layer pre-rendered bloom (7R/3.2R/1.6R). The binary companion and starspots (already in the data) use the same sprites at small size. Throb, flare and eclipse modulate sprite alpha and scale only.
- **Technique, orbits/connections (Sheet 4):** each planet trails a "wake" along its orbit (1.6 rad behind the body; alpha .32 → 0, width 1.6 → .3 px), plus an almost invisible full orbit at alpha .035 so you can still see the path. Belt = an additive radial band gradient (dust) plus the existing ~90 rocks shaded by the angle to the star. Comet = straight blue ion tail plus curved warm dust tail (a few gradient splats), with a white coma, always pointing away from the star. Moons = small baked spheres (same bake as planets). Planet drag/nudge (GESTURES) shows the wake brightening while dragging.
- **Phone cost + caching:** star disc, corona and bloom are baked once per system (tens of ms, spread over frames on entry). Wakes are ~40 short arc strokes per planet; this can be cut to one arc with a conic or linear gradient stroke (6 planets ≈ 6 strokes). Belt: 1 gradient + 90 rects (as today).
- **Parameters:** `exposure` (.6-1.6, 1); `gamma` (.8-1.2, 1); `starSaturation` (.6); `starTempShift` (K, -500-500, 0); `limbDarkening` (star .6); `granulation` (new, 0-.25, .12); `coronaStrength` (new, 0-1, .55); `bloomRadius` (×R, 3-9, 7); `spikes` (0; 1 = telescope look, Sheet 2 option 3); `orbitAlpha` (0-.15, .035); `orbitWidth` (.5-1.5, .8); `wakeLength` (new, rad, .5-3, 1.6); `wakeAlpha` (new, 0-.5, .32); `beltDust` (new, 0-.25, .1); `cometTail` (new, px, 40-140, 90).

### 4.5 Planets (and moons)
- **Now:** flat fill + stroked atmosphere ring in the system view. From the surface at far zoom (cam.z < .35) the whole globe is the terrain polygon in a flat ground colour plus biome strokes.
- **Target:** every world is a lit sphere facing its star: day side, a soft dusk line with a warm edge, a dark night side, a glowing atmosphere rim on the sunward limb, clouds on wet worlds, bands on giants, caps on cold worlds, rings with gaps. No two worlds look alike (seeded). Ocean worlds get a small sun glint.
- **Technique (Sheet 3):** a per-planet bake. For each pixel in the disc, normal n = (dx, dy, mu). Albedo comes from 3D value fBm sampled on the rotated normal (seamless on a sphere): ocean/rocky = height threshold into deep sea/shallows/land/highlands + polar caps by temp; gas = latitude bands warped by fBm; icy = high albedo + ridged-noise cracks. Lighting per section 2 (soft terminator, limb, twilight, rim); clouds are a second fBm layer lit the same way. Bake size = the radius bucket. **Light direction changes as planets orbit**, so the bake is split in two: (1) an *albedo + limb* sprite, baked once per planet per bucket and rotated with the planet's spin; (2) a *lighting mask* sprite (terminator + night + rim), baked per bucket for a canonical light from +x, then **rotated** toward the star each frame with ctx.rotate and composited (multiply for shade, 'lighter' for the rim). This is the F plan; per frame it costs 2-3 drawImage calls per visible planet. Rings: 30-40 thin elliptical band strokes, alpha from 1D noise with seeded gaps, split into back and front halves around the planet; the planet's shadow on the ring is a clipped dark ellipse on the night side (`ringShadow`).
- **Phone cost + caching:** bake ≈ 20-32 ms per planet at R=60 on the box (estimate 80-150 ms on a mid phone, so bake in row strips across frames, or in a worker), done lazily on system entry, over frames, and cached in the LRU. Surface far-zoom (E band): use the same sprite at the largest bucket instead of the flat polygon until cam.z ≥ .05, then crossfade to the terrain.
- **Parameters:** `terminatorSoftness` (.1); `limbDarkening` (planet .35); `atmoStrength` (0-1.5, .9; × P.atmo); `atmoTint` (per type, overridable); `twilight` (new, 0-.6, .25); `cloudCover` (new, 0-1, seeded × wetness); `oceanGlint` (0-1, .4); `bandContrast` (0-1, .55); `iceCap` (0-1, from temp); `ringAlpha` (0-1, .75); `ringShadow` (0-1, .6); `lightZ` (new, 0-.6, .25); `planetBuckets` (new, [8,16,32,64,128,256]).

### 4.6 Zoom transitions (galaxy ⇄ system ⇄ planet ⇄ surface; E's seamless zoom)
- **Now:** `App.go` runs a 650 ms black iris (a black mask with a growing circle hole); App.iris is a 1.5 s white flash; App.fly is a 1.4 s smoothstep galaxy camera flight. The system → surface switch lands at cam.z .02 and zooms in. A 4-dot level trail sits top-left.
- **Target:** one continuous dive. Pinching into a star makes the star bloom and become the system's sun at the same spot. Pinching into a planet makes it grow from a lit dot to a globe to a curved horizon, and you fall through a glowing layer of air into the surface sky. Zooming out reverses: the surface sky thins to black, the globe appears, and its orbit and star fade in.
- **Technique (Sheet 5, option 2):** E's crossfade bands with matching screen position and scale. Visual glue: (1) a shared deep-space backdrop (4.1) never cuts; (2) the star sprite is the same object in galaxy, system and surface (only its scale and bloom change); (3) the planet sprite is the hand-off object between the system view and the surface; (4) the atmosphere entry is a vertical gradient from the planet's `atmoTint` to the palette sky, driven by band progress; (5) the black iris is retired *as a mask* but kept as a gentle radial vignette pulse (≤ .25 alpha) at the moment of the switch, so the "you changed level" cue Wilbow has seen remains (L31 precedent: clear entry/exit cues). The level trail and level tone stay.
- **Phone cost + caching:** both layers draw during a band (≤ 2× normal cost for ~300-600 ms). All sprites involved are already cached by 4.1-4.5, and E's budget applies (no frame > 16 ms).
- **Parameters:** `crossfadeCurve` ('smoothstep' | 'log', default 'log'); `bandEdges` (from E); `atmoEntry` (new, 0-1, .7, strength of the air layer); `switchVignette` (new, 0-.4, .2); `irisMode` (new: 'vignette' default | 'iris' legacy | 'bloom').

### 4.7 Surfaces (sky, sun, horizon, ground)
- **Now:** a 3-stop palette sky gradient; 90 night stars as fillRects; a sky sun as one radial gradient (60 px) with 2 spot circles and a binary companion; v0.5c parallax ridges (2 × 48 pts), horizon haze and a dawn/dusk glow; terrain as a flat fill plus per-segment biome strokes (lineWidth ≥ 2) and strata lines; gas worlds get haze strokes.
- **Target:** the same place, lit by its actual star: the day sky tinted by star colour and air, the sun as a small bright disc with bloom (not a soft blob), ridges fading into aerial haze (further = lighter and bluer), the ground lit from the sun's side, rim-lit at the horizon at dawn and dusk, and a night sky that is the real backdrop from 4.1 with this galaxy's band in it.
- **Technique:** the sky gradient gets a 4th stop: a horizon brightening `mix(sky, star, .25)` × atmo. The sun uses the baked star sprites from 4.4 at surface scale; the sky behind it gets a wide Mie-like forward glow (one cached radial sprite). Aerial perspective: ridge colour = `mix(ridge, haze, 1 - exp(-depth × airDensity))`. Ground: replace per-segment strokes with one filled band whose fill is a linear gradient across the surface normal (lit top edge → darker depth), plus a thin highlight on the sunward slopes (dot of slope normal and sun direction; a cheap per-segment alpha). Night: draw a crop of the 4.1 backdrop (already baked) instead of the 90 rects.
- **Phone cost + caching:** sun, glow and night sky become sprites (saves today's per-frame gradients). The ground gradient is one createLinearGradient per frame (as today). Slope highlights reuse today's segment loop.
- **Parameters (`RS.WorldLook`):** `skyStarTint` (0-.5, .2); `airDensity` (0-2, from atmo); `horizonGlow` (0-.5, .25); `groundShade` (0-1, .5); `slopeLight` (0-1, .35); `nightBackdrop` (0/1, 1).

### 4.8 Ohms (creatures)
- **Now:** soft polygon bodies with a flat genetic-colour fill and a 1.6 px stroke in col2; patterns (spots/stripes/rings) clipped to the body; limbs as stroked lines; white-and-black disc eyes; cues.js glows (jam tint, chord, crown, base, breath, ring); a night glow for glowing genes; instLook adds a drum-skin ring + rim beads, plucked spikes, or bowed haze.
- **Target:** soft, living, slightly translucent creatures that belong in the same light: lit from the sun's side with a darker underside, a Fresnel edge glow, a gentle subsurface warmth in thin parts, and eyes with a catchlight. **Roles stay readable** (Appendix B, t171-176: "roles must be visible"): role cues keep their shapes and positions; only their rendering softens from strokes to glows.
- **Technique:** body fill = a linear gradient along the light direction (lit side = `mix(col, star, .15)` lightened, shade side = `mix(col, ambient, .4)` darkened), then a rim pass: the same path stroked with a wide, low-alpha gradient or a radial gradient clipped to the body (edge-weighted, 'lighter'), brighter on the lit side. The col2 outline stroke drops to ≤ .35 alpha and 1 px (or none if `ohmOutline` is 0). Patterns get .8× alpha and follow the shade. Eyes keep their geometry and get a 1 px catchlight toward the sun. instLook ring/beads/spikes stay as role cues but are drawn as glow sprites + small lit beads (no hard rings). **No new continuous ripples** (t137); listening arcs stay (existing feature) but fade softer.
- **Phone cost + caching:** +1 gradient and +1 clipped pass per visible ohm (≈ +0.02-0.05 ms each). Cull by `inView` (exists). Glow sprites per colour bin replace per-frame radial gradients in cues.js (a net saving). The quality ladder drops the rim pass first.
- **Parameters:** `ohmShade` (0-1, .45); `ohmRim` (0-1, .5); `ohmOutline` (0-1, .35); `ohmSSS` (0-1, .2); `eyeCatchlight` (0/1, 1); `roleCueGlow` (0-1, .6).

### 4.9 Plants (sound-grown, phi/Fibonacci)
- **Now:** growth.js draws L-system-like nodes as two stroke passes (glow 3.6 px alpha .1 + core 1.3 px) in hsla from the pitch hue; flowers are Vogel discs (r = c√i, golden angle).
- **Target:** keep the luminous line-growth (the NOTES plant spec: "Render as luminous line growth with soft glow, cheap") but light it physically: stems darker at the base and brighter toward the tips, with a faint sun-side highlight; Vogel florets as tiny lit beads with a shared soft glow; at night they glow from within (bioluminescent) instead of being lit by the sun. Geometry stays exactly phi/Fibonacci-driven (R6.7).
- **Technique:** per-segment alpha/width from depth (already available: nd[4]); colour lerp base→tip `mix(h-dark, h-light)`; one glow sprite per flower head instead of per-floret arcs when zoomed out (z < .6).
- **Phone cost + caching:** neutral or cheaper (sprite per head). No new per-frame gradients.
- **Parameters:** `plantGlow` (0-1, .35); `plantTipLight` (0-1, .5); `plantNightLum` (0-1, .6).

### 4.10 Water
- **Now:** pools are filled runs (alpha .55+day×.15) with a 1.3 px light top stroke; orbs are wobbling polygons with a stroke; streaks and spray are lines and dots. It is membrane-like as asked (R6.10, t195).
- **Target:** still a cheap membrane, but it reads as water: a darker, more saturated depth gradient, a soft bright meniscus line (gradient, not a hard stroke), the sky colour reflected near the surface, and a sun glint where the surface faces the light. **No idle ripples**; waves stay event-only (t137).
- **Technique:** one linear gradient per pool run (top = mix(water, sky, .35), bottom = water darkened .5); the meniscus is the same polyline stroked twice (2.5 px at .12 alpha, then 1 px at .45); the glint is one additive sprite at the point whose normal best faces the sun. Orbs: a radial gradient fill with a highlight offset toward the light (glass bead).
- **Phone cost + caching:** +1 gradient per visible pool run; the glint sprite is cached.
- **Parameters:** `waterDepthTint` (0-1, .5); `waterSkyReflect` (0-.6, .35); `waterGlint` (0-1, .5); `meniscus` (0-1, .45).

### 4.11 Effects (events only)
- **Now:** R.fx draws stroked rings for most events, radial blooms for bloom/bud/launch, quadratic filaments, zig-zag clash lines, bolts, meteors, ink fades; sky events include supernova, black hole (black disc + stroked ellipse), pulsar (dot + line) and flare/lightning washes.
- **Target:** events feel like light and matter: expanding soft shells (gradient annuli) instead of 2 px rings, sparks that cool from white to the star or ohm colour, a black hole with a lensing ring of light (gradient annulus + an inner dark disc with a soft edge), and a pulsar as a sharp point with two soft beams. **Still events only** (t137, 12:09 AM steer); the shapes and timing of the cues stay the same so learned meanings survive.
- **Technique:** a cached "shell" sprite (annulus gradient, 128 px) scaled per event, replacing stroked circles; colour ramp over age: white → `col` → transparent; 'lighter' composite. Filaments: gradient strokes (bright at the ends). Clash: keep the zig-zag (it is a readable cue) but render it as two passes (glow + core).
- **Phone cost + caching:** neutral (sprite drawImage ≈ the cost of an arc stroke); the bloom budget (section 2.7) caps concurrent additive events at 8 on screen.
- **Parameters:** `fxShell` (0-1, .6); `fxCoolRamp` (0/1, 1); `fxMaxAdditive` (4-16, 8).

### 4.12 Hints and cues (no menus, buttons or text)
- **Now:** a level trail of 4 dots top-left; carried bubbles as stroked circles at the bottom; a red recording ring around the sky star; guide.js hints; the home beacon and life rings in the galaxy.
- **Target:** the same cues, drawn as light: the level trail becomes 4 tiny lit points (the current one brighter, with a soft halo); carried bubbles become glassy spheres (radial gradient + catchlight); the recording ring becomes a red-orange glowing loop (2-pass gradient stroke). Nothing is removed; hit areas and gestures are unchanged (GESTURES.md).
- **Technique and cost:** cached sprites; negligible.
- **Parameters:** `cueGlow` (0-1, .5); `trailAlpha` (0-1, .6, F); `trailWidth` (F).

## 5. Guardrails (checks for every visual change)
- No menus, buttons or text UI; no icons or badges (sockets and lineage "look like stars and constellations").
- Procedural and continuous from seeds and data; never themes, presets or stamped symbols (t167). Options in this doc are global looks for Wilbow to choose once, not in-game themes.
- Plants: phi/Fibonacci geometry unchanged; this doc only changes how they are lit.
- No constant ripples; waves only for events (t137).
  - Clarified by Wilbow, 3:43 PM MDT Oct 23 2026, verbatim: "The no constant ripples rule is only for preventing an early visual annoyance.  The visualizations should be especially visible when a jam which has underwent development of harmony and all ohms have synchronized.  You should be able to see basically everything about an ohms sound and the interplay in a jam". So the rule holds for lone, unsynced or early ohms; mature synced jams may show steady visuals (music-visuals direction is DISCUSSION ONLY, see BRAINSTORM.md rounds 2-3).
- Roles readable on ohm bodies (t171-176).
- Palette and sound coupling untouched (t106); rendering only.
- Hit areas and gestures unchanged.
- Never remove a feature Wilbow has seen: restyle the iris, rings, beacon and level trail; don't delete them.
- Canvas 2D; expensive layers are baked (starfields, nebulae, planet shading, limb darkening as cached radial sprites).

## 6. Preview sheets (light still renders of the actual techniques; scratch, outside www/)
Folder: `/workspace/softsound_previews/` (node-canvas 2.11 installed there; scripts s1-s5 and lib.js; each sheet renders in ≤ 1.2 s).
1. `01_galaxy_view.png`: (1) Clean starlight: only real-coloured star points + a warm core. (2) **Dusty spiral** *(recommended)*: soft glowing arms, dark dust lanes, pink/blue cluster knots, home beacon as a soft green glow. (3) Painterly: 2 plus coloured nebula clouds over the whole sky.
2. `02_star_look.png`: (1) Soft glow: a colour-true ball of light. (2) **Living sun** *(recommended)*: darker rim, boiling skin and corona streamers. (3) Telescope: glare spikes and a horizontal streak.
3. `03_planet_shading.png`: (1) Matte globe: lit side and soft shade, no air. (2) **Living world** *(recommended)*: glowing air rim, clouds, warm dusk line, dark night side. (3) Dramatic: thin bright crescents, black nights, strong rims.
4. `04_orbits_connections.png`: (1) Hairlines: faint full orbit circles (like now, softer). (2) **Wakes** *(recommended)*: each world trails a fading arc of its path, a dusty belt and a two-tailed comet. (3) No lines: only a glowing dust plane.
5. `05_zoom_transition_strip.png` (4 frames each, galaxy → system → planet → surface): (1) Iris (now): a dark circle closes and opens, flat cuts. (2) **Continuous dive** *(recommended)*: push into the star, the star becomes the system's sun, the planet grows, you fall through the air. (3) Light-through: each level blooms out into the next.

## 7. Suggested build order (fits V08 E/F)
1. **Cache what exists** (sun, glows, night stars as sprites): cheapest, makes room for everything else.
2. **Backdrop starfield + galaxy band** (4.1) in the system and galaxy views: cheap, biggest single "less cartoon" win.
3. **Star look** (4.4, sprites): cheap.
4. **Planet sphere bakes + rotated light mask** (4.5): the biggest visual win; medium cost.
5. **Orbit wakes, belt dust, comet tails, moons as spheres** (4.4): cheap.
6. **Galaxy arms, dust, bulge + clusters** (4.2-4.3, together with E's tiles).
7. **Continuous dive** (4.6, with E's crossfade bands).
8. Surface sun/sky/aerial haze (4.7) → ohm shading and rims (4.8) → water (4.10) → fx shells (4.11) → plants and cues (4.9, 4.12).

## 8. Change log
- 2026-10-23 2:37 AM MDT: first draft (Resonance Visuals bot). All PROPOSED.
