# TEACHER_AURA.md: layered generative aura for experienced teachers (v3)

**Status: PROPOSED.** This is a design only. Nothing in www/js, tests or android has been changed, and nothing has been built. Wilbow approves it before any build.
Author: Resonance Visuals bot (art director). v1 about 2:55 PM MDT, v2 about 3:05 PM MDT, **v3 (layered rewrite) about 3:20 PM MDT, Oct 23 2026**. It extends ART_DIRECTION.md (4.8 ohms, 4.11 effects, 3 caching).

## Decisions (Wilbow, Oct 23 2026, MDT)
- **2:51 PM (card):** kept all 6 mappings: cultures → palette, scales/meters → symmetry, tempo range → pulse/spin, roles → pattern shapes, students → fractal depth, aura only at very high experience. *(All still hold. Each now lives inside its own layer, section 3.)*
- **3:01 PM, verbatim:** "Make them subtle and faded unless extremely experienced.  Glowing and pulsing when master level"
- **3:08 PM, verbatim:** "Those numbers seem extremely low.  I think you would barely see them forming faintly at that stage.  Size, brightness and pattern complexity should be a much larger scale"
- **3:08 PM card, kept all 6:**
  1. experience grows in separate layers
  2. each layer has tiers that take much longer each step
  3. rare combinations make ultra-rare teachers
  4. a tiny chance a hatchling is born gifted
  5. rare wild teachers live on distant planets
  6. students of masters inherit a hint of their aura
- **3:09 PM card, verbatim:** "Make the mastery ladder about 2x faster"
  - The default ladder is now first flicker ~3 jams, forming ~12, clear ~50, extreme ~200, master ~750 (across galaxies plus many students), with uncapped growth beyond. Every other layer's thresholds are scaled the same way (section 2.3).
- **SUPERSEDED:** the v2 skill bars (sk .75 faint / .90 extreme / .95 master), the `threshold`/`extremeAt`/`masterAt` params and the old Q-A2. `sk` saturates near 1 after ~15 jams, so it cannot drive a ladder that runs to 750+. `sk` is no longer used by the aura at all; it keeps its game role.
- **Kept from v2:** the master pulse (2.5, now 2.6), tempo → spin, the Ex.sheen (it is still drawn under the aura), the role-cue safe zone, and the cached-bitmap render model.

## 0. The ask (Wilbow, verbatim, Oct 23 2026, 2:44 + 2:48 PM MDT)
> "There should be beautiful fractal colors and generative patterns in the aura around very highly experienced teachers and the patterns should be formed by the attributes of their experience."

What this means: the aura is a portrait of what the ohm has lived, built as **separate layers that each grow on their own**. Two teachers never look alike. Nothing is a preset, theme or stamped symbol (t167, t163-165). Everything is procedural and continuous.

Previews (node-canvas, scratch only, not the game):
- `/workspace/softsound_previews/06_teacher_aura_options.png` (+ `.jpg`): **the tier ladder**. One teacher (raga profile, R 18 px) at flicker ~3 / forming ~12 / clear ~50 / extreme ~200 / master ~750 (downbeat) / beyond ~3000.
- `/workspace/softsound_previews/07_teacher_aura_mapping.png` (+ `.jpg`): **layers, combos, gifted, lineage**. Row 1: cultures field, jams rosette, roles motifs, students branching. Row 2: places halo, fusion bands, all layers together (extreme), gifted hatchling. Row 3: rare Star-road, Prism crown, Quiet master, and a master's student with a lineage trace.
  - Single-layer panels 1-6 are drawn alone at ×1.6 brightness so the element can be read.
- Code: `softsound_previews/aura2.js` (layer measures, ladder, gates, elements, combos, gifted, lineage, caps), `profiles2.js` (`grown(J)`: a teacher grown to ~J jams), `s6_aura_ladder.js`, `s7_aura_mapping.js`. Elements reuse `aura.js` (field, rosette, filaments, petal motifs).
- Not drawn in previews: the polymeter and bridge combos, wild-teacher seeding, eased level changes.

## 1. Facts from the code (read only)
- **Experience record `c.exp`** (exp.js `Ex.make`, `Ex.learn`):
  - `xp`: learning sum.
  - `jn`: distinct jams. A jam counts once familiarity `ex[jamId]` passes .2.
  - `pn`: distinct places (planet chunks).
  - `ids` (last 8 jams) and `pl` (last 12 places).
  - `bpm: [lo, hi]`: learned tempo range.
  - `en: [lo, hi]`: learned feel/energy range (the "feel" range).
  - Weight maps, each capped at 6 keys, values grow by `k` per learning tick:
    - `mx`: meter → weight. Keys are mind.js/trad.js METERS: '4/4', '3/4', '6/8', '5/8', '7/8', '12/8', '9/8', '11/8', rupak, jhaptal, adi, compas.
    - `sx`: scale → weight. Keys are tonal.js `To.CAT` indices, 51 systems with `cents`, `fam`, `bright`.
    - `rx`: role → weight (solo, melody, bass, comp, harmony, counter, answer, drone, listen…).
    - `tx`: tradition → weight. Keys are trad.js `Tr.T`: western, hindustani, carnatic, maqam, gamelan, wafrica, cuban, bossa, aksak, flamenco, japan, blues, celtic, andean.
    - `ex`: jam → familiarity.
  - `sk`: skill.
  - `inh`: parent ids.
  - `ih`: the inherited share, frozen at hatch: {mx, sx, rx, tx, ex, bpm, en, xp, sk}.
- **Tradition colours already exist.** trad.js `Tr.HUE` (e.g. hindustani 255,190,120; blues 170,190,255; celtic 180,230,190). The aura uses them, so the colours agree with the tradition rings that jams already show (Tr.draw).
- **Skill formula** (exp.js:32): `sk = 1 − exp(−(min(xp,12)·.04 + jn·.15 + pn·.1))`.
  - Hours alone cap at sk .38 (xp ≥ 12 gives .48 in the exponent). High skill needs breadth: many distinct jams and places.
  - Inheritance gives at most about .35 × .7 × the parents' mean sk, so a hatchling is always below .25.
  - Existing bars in the code: `Ex.sheen` from .05; qroom treats `sk > .6` as skilled; Ex.host picks the most skilled member as bridge.

| xp | jn | pn | sk |
|---|---|---|---|
| 6 | 2 | 2 | .52 |
| 12 | 3 | 2 | .68 |
| 12 | 4 | 3 | **.75** |
| 12 | 5 | 4 | .80 |
| 12 | 8 | 5 | .89 |
| 12 | 10 | 6 | .92 |
| 12 | 14 | 8 | .97 |
| 12 | 20 | 11 | .99 |

- **Teaching:**
  - `RS.Creature.teach(Sf, a, b)` (creature.js:51) is called when the player drags teacher→learner (surface.js:468, also undo/redo).
  - It pushes `{from: a.id}` onto the **learner's** `b.learn`, which is cleared when done.
  - persist.js:192 adds `a.id` to the **learner's** `tally.t`, which keeps only the last 2 teachers.
  - The skilled-host bridge `Ex.bridge` sets `c.hostedBy` on the newcomer and bumps a global `Sf.stats.bridged`.
  - **The teacher itself stores no count of the students it taught.** See section 5.
- **`c.tally {w, i, o, t}`** (persist.js:11): w = seconds watched on screen, i = player interactions, o = offspring, t = the ohm's own last 2 teachers.
- **Current hint:** `Ex.sheen` (exp.js:67) draws 1-4 thin hue-cycling arcs at R × 1.12-1.42 for sk > .05 (render.js:122, z > .5). Wilbow has seen it. **It stays**: below the threshold it is unchanged, and above it becomes the aura's innermost lineage band.
- **Draw order:** render.js:96 loops over creatures in view (`Sf.inView(x, y, 300)`), then calls `R.creature` (Cues.begin → creature0 → Cues.draw) and `R.instLook`. The role cues sit inside about 1.45 R:
  - drum skin ring at .62 R and rim beads at .95 R;
  - plucked spikes up to 1.22 R;
  - bowed haze to 1.45 R;
  - crown above the head;
  - base glow, word beads.


## 2. Layers, measures and the tier ladder

### 2.1 Why not sk
`sk = 1 − exp(−(min(xp,12)·.04 + jn·.15 + pn·.1))` is .97 at 14 jams and .99 at 20. It cannot tell a 20-jam ohm from a 750-jam one. The aura uses **uncapped counts** instead. Only `jn` and `pn` already exist; the rest are new fields (section 5).

### 2.2 Per-layer mastery, in jam-equivalents (exact formulas)
`e = c.exp`; `nk(o)` = number of keys; `Σo` = sum of values.

| Layer | Mastery `M_L` (uncapped) | Fields |
|---|---|---|
| **Jams** | `jn + 2·jl` | `jn` (exists), `jl` jams led (new) |
| **Places** | `pn + 6·wn + 60·(gn − 1)` | `pn` (exists), `wn` worlds/bodies visited, `gn` galaxies visited (new) |
| **Cultures** | `6·tn + 2·Σtx` | `tn` distinct traditions ever (new; `tx` keeps only 6 keys), `tx` (exists) |
| **Roles** | `5·rn + Σrx` | `rn` distinct roles ever (new), `rx` (exists) |
| **Students** | `5·st + 2·hn` | `st` distinct students, `hn` newcomers hosted (new) |
| **Fusions** | `20·fu` | `fu` fusions this ohm enabled (new) |

Level of a layer: `λ(M) = M < 3 ? M/3 : 1 + log4(M/3)`.
- This gives tier 1 at 3, 2 at 12, 3 at 48, 4 at 192 and 5 at 768. Each tier takes ×4 more than the last (the 3:08 "much longer each step"), and growth beyond 5 is uncapped and logarithmic.
- `λ` is continuous, so nothing pops between tiers.
- The `xp` weight maps are capped at 6 keys and their values only grow. That is why `tn`/`rn` count distinct keys ever, and the sums `Σtx`/`Σrx` keep growing uncapped.

### 2.3 Thresholds per layer (2× faster ladder, 3:09 card)
| Tier (λ) | M | Jams (`jn+2jl`) | Places | Cultures | Roles | Students | Fusions |
|---|---|---|---|---|---|---|---|
| 1 flicker | 3 | ~3 jams | 3 places | 1 tradition | 1 role | 1 student | (1 fusion = λ 2.4) |
| 2 forming | 12 | ~12 | 12 places or 2 worlds | 2 traditions | 2 roles | 2-3 students | 1 |
| 3 clear | 48 | ~50 | ~18 places + 5 worlds | 4 traditions, Σtx ~12 | 4 roles, Σrx ~28 | ~10 (or 6 + 9 hosted) | 3 |
| 4 extreme | 192 | ~200 | a 2nd galaxy + ~12 worlds + ~60 places | 6 traditions, Σtx ~78 | 6 roles, Σrx ~160 | ~38 | 10 |
| 5 master | 768 | ~750 | 3 galaxies + ~60 worlds + ~290 places | 8+ traditions, Σtx ~360 | Σrx ~730 | ~150 (or 100 + 130 hosted) | 38 |
| beyond | ×4 per +1 | 3000 → 6 | | | | | |

### 2.4 Overall tier Λ (breadth is needed for the top)
`Λ = min(λ_jams, cap)`. Jams pace the ladder, and breadth unlocks the top:
- **Extreme (Λ ≥ 4)** needs at least 3 layers at λ ≥ 2. Otherwise `cap = 3.95`.
- **Master (Λ ≥ 5)** needs at least 4 layers at λ ≥ 3, **and** λ_students ≥ 3.5 (~20 students), **and** `gn ≥ 2` (more than one galaxy). Otherwise `cap = 4.95`.
  - This is Wilbow's "across galaxies plus many students". Wild teachers are exempt from the galaxy part (section 4.3).
- In-game Λ eases toward its target over ~20 s, so a gate opening grows the aura rather than popping it. The rebake key changes in steps of .25.

### 2.5 Tier visuals: much larger range (3:08 PM)
Values are interpolated between anchors (`aura2.js` ROWS). Size is the outer radius `Rout` in body radii R.

| Tier | ~jams | Λ | Size (Rout/R) | Steady alpha | Fractal depth | Field octaves | Saturation | Bloom | Pulse | What you see |
|---|---|---|---|---|---|---|---|---|---|---|
| — | <1 | 0 | — | 0 | 0 | — | — | 0 | 0 | sheen only (as today) |
| First flicker | 3 | 1 | 1.15 | .12 | 0 | 1 | .25 | 0 | 0 | barely visible haze hugging the body |
| Forming | 12 | 2 | 1.7 | .32 | 1 | 2 | .45 | 0 | 0 | faint colour, first symmetry (rosette fold) |
| Clear | 50 | 3 | 2.2 (~2× body) | .42 | 3 | 3 | .70 | 0 | 0 | real fractal detail, motifs, halo stars |
| Extreme | 200 | 4 | 3.6 | .58 | 5 | 4 | .90 | 0 | 0 | bright, deep patterns, all layers |
| **Master** | 750 | 5 | **6.0** | .64 (×1.4 on the downbeat) | 7 | 5 | .95 | .22 | 1 | glow + beat-locked pulse, maximum complexity |
| Beyond | 3000 | 6 | 6.9 | .68 | 7.7 | 5 | .95 | .27 | 1 | slow uncapped growth (size cap 9 R, depth 9, alpha .76) |

- From flicker to master: size ×5.2 (area ×27), alpha ×5.3, fractal depth 0 → 7, florets 3 → 144.
- Bloom = `min(.4, .22·ss(4.4,5,Λ) + .05·(Λ−5))`. Pulse = `ss(4.6, 5, Λ)`.
- Beyond 5 (b = Λ − 5): size `min(9, 6·(1 + .15b))`, alpha `min(.76, .64 + .04b)`, depth `min(9, 7 + .7b)`.
- **Inner clear zone:** `Rin = R·(1.15 + .15·ss(2,4,Λ))`. Patterns stay outside the role cues (≤1.45 R), so roles stay readable on ohm bodies (t171-176). Only the soft haze passes under the body edge.

### 2.6 Master pulse (unchanged from v2; Wilbow 3:01 PM "Glowing and pulsing when master level")
- **What it is:** a brightness swell of the cached layers, `globalAlpha·(1 + pulseDepth·pulse·env)`, plus one additive bloom sprite at `bloom·(.6 + .8·pulse·env)` that grows ≤5 % in place.
- **What it is not:** no rings, ripples or outlines (t137 holds for everything else).
- **In a jam:** locked to the jam leader's mind `L` (as `Ex.bridge`, exp.js:41): `pos` 16ths, `barLen(L)`, rate `L.bpm/60·4`.
  - Fast attack, `exp(−5·phase)` decay.
  - The downbeat gets the full swell; other beats get 1/1.6.
  - Additive meters swell on `L.groups` starts (7/8 → 2+2+3).
- **No music:** a slow breath, one per 8 beats of its own `e.bpm` mid, never faster than 1 per 3 s.
- **Events** (teach/host/fuse): +15 % brightening on top, capped at alpha 1.

## 3. Each layer's own element (each grows with its own λ_L)
- All layers share the ohm's seed `RS.hash('aura', c.id)`, its palette (`tx` top-3 → `Tr.HUE` ramps) and its rotation period (`e.bpm`).
- Each layer is one cached bitmap, slowly rotated at its own rate.
- A layer appears once both the overall Λ and its own λ_L pass its start. Its alpha is `k(λ_L)·k(Λ)·weight`.

| Layer | Element | Grows with its own λ | Start | Rotation |
|---|---|---|---|---|
| (base) | **Haze**: soft radial glow from .9 R to 1.35·Rout | overall Λ only | Λ > 0 | none |
| Cultures | **Colour field**: domain-warped fBm in the top-n tradition hues, kaleidoscope fold `2π/N1` from the `sx` top-1 scale | number of hue families = `min(3, tn)`; saturation and octaves | Λ ≥ 1.3 | .5× |
| Jams | **Rosette**: petals from the scale's cents (N1 = 5-9, microtonal spacing kept), plus Vogel florets; carries the master pulse | florets `Fib(round(1.5·λ_J))`: 3 → 233; petal length | Λ ≥ 1.8, λ_J ≥ 1.5 | 1× (−1× if the bpm range is wide) |
| Roles | **Motif ring**: one petal motif per distinct role (melody twist, bass lobe, comp triplet, counter pair, drone band, listen seed), placed on the `mx` top-1 meter's beat groups | motif count and length | Λ ≥ 2.2, λ_R ≥ 1.5 | −.7× |
| Students | **Branching filaments**: 1/φ-scaled fractal branches from Rin | depth `D = round(min(depth(Λ), 1.6·λ_S))`; cap 6 for comp/harmony, else 8 | Λ ≥ 2.5 | .8× |
| Fusions | **Interference lattice**: two crossing log-spirals (`n` and `n+2` arms, pitch ratio φ) in the two top hues, so an iridescent moiré | arm count `3 + round(λ_F)` | Λ ≥ 2.6, λ_F ≥ 1 | −.3× (static shape, slow turn; it never expands, so it is not a ripple) |
| Places | **Starry outer halo**: Fibonacci star count on golden-angle spirals from .55 of the span to 1.1·Rout; plus `gn` faint log-spiral galaxy arms when gn ≥ 2 | stars `Fib(round(3 + 1.6·λ_P))`: up to 377 | Λ ≥ 2.4, λ_P ≥ 1 | .2× |

- Mix weights: haze .9, cultures 1, jams .75, roles .9, students .5, fusions .45, places .85. These keep master colourful rather than white.
- Sheet 06 shows the layers arriving one by one: flicker = haze; forming = haze + field + rosette; clear = all but fusions; extreme and above = all 7.
- **Mapping detail kept from v2 (2:51 card):**
  - cultures → palette (`tx` top-3 weights)
  - scales → primary fold (`sx` top-1 cents) and counter-ring (`sx` 2nd)
  - meters → the motif ring's beat groups and the branch fan angle `.62/√groups + .12`
  - tempo range → revolution period `240·100/bpmMid` s and counter-rotation if `log2(hi/lo) > .8`
  - feel range → curl/warp `.12 + .9·enMid` and softness `.5 + (hi − lo)`
  - roles → motif type
  - students → depth
  - `ih` → the inherited-hue arcs at Rin
  - `ex` keys → glint florets

## 4. Rarity

### 4.1 Rare combinations (deterministic: same record, same result)
- Each needs two or more layers deep at once.
- Because every layer costs ×4 per tier, a combination costs the **product** of separate long journeys. Most master teachers have none; a very few have one; two at once is ultra-rare.
- A combo changes **how** existing elements look. It never adds a stamped symbol.

| Combo | Condition (exact) | Look | Why rare |
|---|---|---|---|
| **Star-road** | `gn ≥ 3`, λ_places ≥ 4.5, λ_cultures ≥ 4 | Halo stars take the culture hues instead of white. The galaxy arms become threaded constellations, one colour per tradition met. | 3 galaxies is above the master gate (2). Most travellers don't also absorb many traditions. |
| **Orchard** | λ_students ≥ 4.5 (~75 students) and `sm ≥ 5` (5 students who themselves reached clear) | Fruit florets at the branch tips in each student's own top hue | Needs a second generation of teachers, which takes the most time in the game. |
| **Prism crown** | λ_fusions ≥ 4.5 (~19 fusions), λ_cultures ≥ 4.5, `tn ≥ 6` | The interference lattice turns full-spectrum (hue runs with radius and angle) | Fusions are rare events; 19 plus 6 traditions is a lifetime. |
| **Polymeter** | λ_roles ≥ 3.5, λ_jams ≥ 3, and ≥3 meters in `mx` with different group counts | A second, counter-rotating motif ring on the 3rd meter's groups (e.g. 3 against 4 against 7) | Needs wide role and meter range at once. |
| **Quiet master** | Λ ≥ 4, `jl/jn < .05`, `rx` top-1 is drone or listen | Velvet/silver palette, no rosette, double field strength: a calm glow | It is the opposite path: huge experience without leading. |
| **Bridge-keeper** | `hn ≥ 150`, λ_fusions ≥ 3 | Proposed look (not yet previewed): fine bridging strands that join the inner and outer layers, in host hue | Hosting 150 newcomers is very slow. |

- Sheet 07 row 3 shows Star-road, Prism crown and Quiet master. In the test profiles, an ordinary master (`grown(750)`) triggers **no** combo, which is the intended baseline.

### 4.2 Gifted-born hatchling
- **Gene:** add `g[240] 'gift'` (genome NG 240 → 241; a new gene at the end, so existing genomes are read as 0 = ungifted after a default fill).
  - It is inherited like any other gene by `C.child` crossover and mutate.
- **Odds at hatch:** `gifted = hash(c.id, 'gift') < .001 + .009·g^8`.
  - About **1 in 500** on average (uniform g), up to ~1 in 100 in lines that carry a high gift gene.
  - Deterministic per id. Stored as `c.gift = 1`.
- **Cue from birth (distinct from earned auras):**
  - 5 pearl-white motes on a golden-angle spiral at 1.45-1.7 R, slowly orbiting, plus a faint pearl rim.
  - It is colourless and crisp, while earned auras are coloured and soft. The motes sit just outside the role cues.
- **Later:** the motes stay as a white glint in the aura's inner zone at every tier, so a gifted master is recognisable.
- **Effect on play:** none by default (Q-A6).

### 4.3 Master lineage (students inherit a hint)
- **Field:** `e.lm = [{id, seed, hue, N1, gen}]`, at most 2 entries.
  - In `C.teach(a, b)`, when the teacher's Λ ≥ 5, the learner gets `{id: a.id, seed, hue: a's top tradition hue, N1: a's fold, gen: 1}`.
  - `Ex.inherit` passes entries to hatchlings with `gen + 1`. An entry is dropped after gen 3.
- **Look:**
  - A ghost of the master's rosette fold (its N1 and seed), whitened 20 %, at 1.3-2.6 R.
  - Alpha `.75·.5^(gen−1)` × the base alpha: gen 1 visible, gen 2 faint, gen 3 a whisper.
  - It is drawn even when the ohm has no aura of its own, and it is baked once.
- Sheet 07 panel 12 shows a forming-tier student of a master, with the master's fold faintly around it.

### 4.4 Wild teachers on distant planets
- **Seeding:** deterministic, at world generation.
  - Use `u = hash(useed, sys, body, 'wild')`.
  - A world has a wild teacher if `u < .03` (same galaxy, ≥3 systems from home) or `u < .08` (another galaxy). Home systems never have one.
- **Level:**
  - `Λ = 3 + (−ln u2)/1.2`.
  - At least clear always. P(≥ extreme) ≈ 30 %. P(master) ≈ **9 %**, i.e. overall about 1 in 370 eligible home-galaxy worlds and 1 in 140 worlds in other galaxies hold a wild master.
  - The layer λs come from that world's local tradition and `RS.galaxyPersona`: its tradition dominates cultures, and its meter/scale set the folds.
  - `e.wild = 1` exempts it from the `gn ≥ 2` part of the master gate (it never left).
- **Same system:** it is drawn by the same code, with no special art. It is saved only once it has interacted (`rs2:w:` diff); otherwise it is regenerated from the seed.

## 4b. Cost (bounded)
1. **Bake only on tier change.**
   - The rebake key is computed at the existing 2 s Exp tick, never per frame:
     `key = [round(Λ·4), each round(λ_L·2), comboBits, gift, lm[0].id+gen, LODbucket]`.
   - Most learning ticks don't change it.
   - Layers bake in order (haze → field → rosette → …), one layer per frame, or in an OffscreenCanvas worker where available.
2. **Bitmap caps:**
   - Soft layers (haze, field, lattice, bloom) are baked at ≤ **256 px** side.
   - Sharp layers (rosette, motifs, branches, halo) are baked at ≤ **384 px**.
   - Bigger auras are drawn by scaling the capped bitmap up (soft layers hide it; sharp layers lose only sub-pixel detail).
3. **Blur cost:**
   - No `ctx.filter` and no `shadowBlur`, anywhere.
   - The bloom is a 48 px downscale upscaled once to 160 px at bake time, so it is a free blur.
4. **On-screen cap:**
   - The aura diameter is capped at `min(2·Rout_true, .45·min(viewW, viewH))`, so a zoomed-in master never fills the screen.
   - Nothing is baked or drawn off screen: the `Sf.inView(c.x, c.y, Rout)` test uses the aura radius, not the body radius.
5. **How many:**
   - `maxOnScreen` full layered auras = 3 (of which masters ≤ 2), nearest to the view centre first.
   - Other teachers draw a **flattened** single bitmap (all layers composited at bake, one drawImage, no per-layer rotation).
   - Tiers ≤ clear always use the flattened version.
6. **LRU cache:**
   - Capped by bytes (16 MB inside the 24 MB ART_DIRECTION budget), not by count. Evict the least recently drawn.
   - A master costs 7 layers × ≤384² × 4 B + bloom ≈ 3.6 MB worst case.
   - A flattened aura costs ≤ 590 KB.
7. **Measured on this box** (node-canvas/cairo software, Xeon, 1 thread, median of 5 bakes, `grown(J)` raga teacher):

| J (tier) | Size | R 18: bake / max side | R 32 | R 64 |
|---|---|---|---|---|
| 3 flicker | 1.15 R | 0.3 ms / 56 px | 0.2 ms / 100 px | 0.6 ms / 199 px |
| 12 forming | 1.7 R | 2.7 ms / 83 | 2.5 ms / 147 | 7.7 ms / 256 |
| 50 clear | 2.2 R | 4.7 ms / 109 | 5.9 ms / 194 | 13.8 ms / 316 |
| 200 extreme | 3.7 R | 13 ms / 179 | 23 ms / 259 | 24 ms / 384 (cap) |
| 750 master | 6.0 R | 39 ms / 256 | 45 ms / 384 (cap) | 39 ms / 384 (cap) |
| 3000 beyond | 6.9 R | 56 ms / 273 | 56 ms / 384 (cap) | 53 ms / 384 (cap) |

   - **The caps work:** bake time stops growing with zoom (master ≈ 40-55 ms total at any R). Split over 7 layers, that is ≤ ~10 ms per frame on the box.
   - **Phone estimate (3-5×):**
     - Up to ~50 ms per layer for a master bake. Do it one layer per frame or in a worker, and only on a tier change (rare by design).
     - The extreme tier is ~5-25 ms per layer.
   - **Draw** (per frame, cairo software, R 32): extreme (317 px on screen) 6.5 ms; master (515 px, 8 drawImages) 25 ms; beyond 34 ms.
     - Cairo is CPU-only; Chrome's GPU drawImage is typically 10-30× cheaper.
     - This is still the main risk. That is why only 3 full auras (2 masters) draw per-layer, and the rest are flattened (1 drawImage).
     - If a frame runs > 11 ms, the adaptive ladder drops masters to flattened, then auras to haze-only, then to the plain sheen.

## 5. New fields (for Resonance to build later; none added now)
All of them sit in `c.exp`, which is already saved with the world. The genome gene is the exception.

| Field | Type | Updated in | Feeds |
|---|---|---|---|
| `e.jl` | int | jam.js, when this ohm is leader at jam start | Jams |
| `e.wn` | int | voyage/landing on a new body key `sys:body` (keep a 32-entry recent set to dedupe) | Places |
| `e.gn` | int (≥1) | on entering a galaxy `useed` not in `e.gl` (new small set) | Places, master gate |
| `e.tn` | int | `Ex.learn` when a tradition key is new for this ohm ever (keep a bitset of the 14 `Tr.T` keys) | Cultures |
| `e.rn` | int | same, roles bitset | Roles |
| `e.st`, `e.su` | int, last 8 ids | `C.teach` on teacher `a` (distinct learners) | Students |
| `e.hn` | int | `Ex.bridge` on host `h` | Students, Bridge-keeper |
| `e.fu` | int | Trad fusion event, on the enabling ohm(s) (`K.fuse` / `fuseTick`) | Fusions |
| `e.sm` | int | when a former student reaches Λ ≥ 3, increment its teachers' `sm` (via `e.su` back-links held by the student's `tally.t`) | Orchard |
| `e.lm` | ≤2 entries `{id, seed, hue, N1, gen}` | `C.teach` (master → student), `Ex.inherit` (gen+1) | Lineage |
| `e.wild` | 0/1 | world gen (4.4) | gate exemption |
| `g[240]` gift | gene 0-1 | genome NG 241 (C.child crossover/mutate) | Gifted |
| `c.gift` | 0/1 | at hatch | Gifted cue |
| runtime only | `c._auraKey`, `c._auraΛ` (eased) | render | not saved |

Fallback before the fields exist: `jn` and `pn` alone give the jams and places layers. The other layers stay at 0, so teachers top out at forming/clear. That is safe but not the design.

## 6. Parameters: `RS.WorldLook.teacherAura.*`
| Name | Range | Default | Meaning |
|---|---|---|---|
| `on` | 0/1 | 1 | master switch |
| **`ladder`** | list | **[3, 12, 50, 200, 750]** | M for tiers 1-5 (the 3:09 2× faster ladder). Internally `λ = 1 + log_step(M/base)`, base 3, step 4 |
| `paceScale` | .25-4 | 1 | multiplies every threshold (one knob for the whole ladder) |
| `layerWeights` | object | jl 2, wn 6, galaxy 60, tn 6, tx 2, rn 5, rx 1, st 5, hn 2, fu 20 | jam-equivalent weights in 2.2 |
| `extremeBreadth` | 2-6 / λ | 3 layers ≥ 2 | gate for Λ ≥ 4 |
| `masterBreadth` | 3-6 / λ | 4 layers ≥ 3, students ≥ 3.5, gn ≥ 2 | gate for Λ ≥ 5 |
| `sizeRows` | list | 1.15, 1.7, 2.2, 3.6, 6.0 | Rout/R per tier |
| `alphaRows` | list | .12, .32, .42, .58, .64 | steady alpha per tier |
| `depthRows` | list | 0, 1, 3, 5, 7 | fractal depth per tier |
| `beyondMax` | size / depth / alpha | 9 R / 9 / .76 | uncapped-growth ceilings |
| `easeSec` | 0-60 | 20 | Λ easing time |
| `bloom`, `pulseDepth`, `bloomScale`, `downbeatBoost`, `breathBeats` | as v2 | .22 (+.05/tier beyond), .4, .05, 1.6, 8 | master pulse |
| `comboRarity` | .5-2 | 1 | shifts all combo λ conditions by ×this |
| `giftBase`, `giftGene` | 0-.01 | .001, .009 | P(gifted) = base + gene·g^8 |
| `lineageGens`, `lineageAlpha` | 1-4, 0-1 | 3, .75 | lineage fade |
| `wildNear`, `wildFar`, `wildMean` | 0-.2, 0-.2, 1/1.2 | .03, .08, .83 | wild teacher odds and level spread |
| `capSoft`, `capSharp` | 128-512 | 256, 384 | bake side caps |
| `maxScreenFrac` | .2-.8 | .45 | on-screen aura diameter cap |
| `maxOnScreen`, `maxMasters` | 1-8 | 3, 2 | full layered auras; the rest are flattened |
| `cacheMB` | 4-24 | 16 | LRU byte cap |
| `bakePerFrame` | 1-3 | 1 | layers baked per frame |
| `innerClear`, `opacity`, `rotSpeed`, `warp`, `saturation`, `eventPulse` | as v2 | as v2 | unchanged |
| removed | | | `threshold`, `extremeAt`, `masterAt`, `alphaMin/Extreme/Max`, `satMin`, `needStudent` (superseded by the ladder and gates) |

## 7. Guardrail check
- **Roles readable:** patterns start beyond Rin ≥ 1.15-1.3 R and draw behind the body. Only the soft haze crosses the edge.
- **No constant ripples:** layers rotate, the lattice is static and never expands, and the master pulse is Wilbow's explicit exception as a brightness swell.
- **No text, symbols, presets or UI:** combos only re-colour or re-arrange computed elements.
- **phi/Fibonacci:** floret and star counts are Fibonacci, the golden angle is used, branches scale by 1/φ, the lattice pitch ratio is φ, and gifted motes sit on a golden-angle spiral.
- **Palette↔sound (t106):** untouched.
- **Ex.sheen:** still drawn, unchanged.
- **Cached on phones:** yes, with caps (section 4b).

## Open questions for Wilbow
1. **Q-A2' (main): the pace ladder.** Confirm first flicker ~3 jams, forming ~12, clear ~50, extreme ~200, master ~750 (with ×4 per tier and log growth beyond). Also confirm the master gate: ≥4 layers at clear+, ~20+ students, and more than one galaxy.
2. **Q-A3 (still open):** must an ohm have taught or hosted for any aura to show? The default is no: the flicker comes from jams alone, and students gate only master.
3. **Q-A5:** should the combos list (Star-road, Orchard, Prism crown, Polymeter, Quiet master, Bridge-keeper) be kept, cut or extended?
4. **Q-A6:** should gifted hatchlings also learn faster (e.g. +25 % `xp` gain), or stay purely visual? The default is visual only.
5. **Q-A7:** wild teacher odds: 3 % of far home-galaxy worlds and 8 % in other galaxies, with ~9 % of those at master.


## Build status (v0.8b6, vc31, branch v08-b6, Oct 23 2026)
Built: www/js/teacher.js (measures, ladder, gates, counters, students, lineage, gifted, wild teachers, jam novelty learning) and www/js/aura.js (layers, bake queue, flatten, bloom, LRU, caps, ladder, ghost, motes); render.js draws auras before the bodies. Parameters live in `RS.WorldLook.teacherAura` (alias `RS.Teacher.P`).
Additions from the 4:28 PM decisions: J also counts novelty learning (pxp, weight 1) and all-teacher jams (at, weight 6).
Deviations: (1) wild teachers are saved like natives from the start, not only once interacted; (2) home = the first world entered after the upgrade; (3) the key bucket uses round(level x 4) and the LOD bucket = round(2 log2(on-screen px)).
Known cost: on node-canvas (software) the field layer bake takes up to ~14 ms on the one frame it runs; draw of a cached master ~3 ms. On device the adaptive ladder steps down if the aura draw goes over 4 ms or frames over 11 ms.
Tests: tests/v08y_check.js Y10-Y36.
