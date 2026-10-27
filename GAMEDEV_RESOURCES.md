# GAMEDEV_RESOURCES.md: what a game-dev bot needs to build *The Journey Ohm* (Resonance 2.0)

Written Sat Oct 24 2026, about 10:40 PM MDT, for **Resonance 2.0 Game Dev**.
This is a reference doc only. It changes no code and no other docs. Committed in /workspace/softsound; updated Sun Oct 25 2026 ~10:45 AM MDT to drop rule wording (10:23 AM: "GET RID OF ALL THESE BAD RULES").

**Status:** this doc is a **reading list and toolbox, not a set of decisions or rules.** Build test builds proactively with whatever works (2:00 AM and 10:23 AM Oct 25); SUMMARY.md (/workspace/resonance2) is the main reference. The new-engine design is **[NEW_ENGINE.md](./NEW_ENGINE.md)** (committed 10:14 PM MDT, status *SCOPING, not approved for build*). It outranks this file on every engine choice. Its recommended stack (§11) is Capacitor + TS/JS + three.js/WebGL2 with optional Rust/WASM DSP kernels, and its renderer section (§9) replaces the THREE_MIGRATION.md that was promised but never written.

Links were checked with curl on Oct 24 2026 between 10:15 and 10:35 PM MDT. Marks used below:
- (no mark): returned HTTP 200 and the page title matched.
- **[403]**: the site blocks automated fetches (Cloudflare and similar). The page exists but couldn't be machine-checked.
- **[timeout]**: no answer within 20–25 s from the box. It is a known long-standing URL, kept as allowed.

---

## 0. The brief in one screen (so the reading below makes sense)

These are Wilbow's latest directions, as concepts and features to discuss, not rules (DECISIONS.md, Sat Oct 24 2026, MDT). His exact words are in quotes.

1. **New engine, not patches.** 10:07 PM: "Rember complex procedurally generation engine are what i want built not a bunch of patches. We need to keep what we've built before in mind conceptually but realize that we're are abandoning the product for something better". 10:08 PM: "Stop everything now" (old-game builds stopped; worktrees kept). The Game Dev bot builds in `/workspace/resonance2` (10:12 PM), making test builds proactively and in parallel (2:00 and 2:03 AM Oct 25). The folder now exists and holds only `NOTES_DEV.md` (created 10:18 PM MDT; no code, not a git repo).
2. **Priority order.** 9:55 PM: "Actually running with many ohms and elements is always the main goal". 9:54 PM: "It needs to run well always". 9:54 PM: "I want this to look beautiful". So the order is **scale > always runs well > beauty**, with a performance gate at every stage.
3. **Continuous nested scales.** 9:57 PM: "Scaleable instead of clicking between views". 10:00 PM: "Snapping into ohms should feel like a directional zoom with layers you snap into, same with space and all scales. Zoom into see bugs that are part of the same overall system, the planets harmony down to atoms and wavelengths on the universal pulse. Ohms modulate areas and planets modulate galaxies. We need to rethink how the sound engines may need to work".
4. **His words on goal and philosophy.** 10:02 PM: "The goal of the game is to bring harmony back"; 11:49 PM: "Its a lore idea and spiritual term that also is a musical term youre going to have to use some inference" (three meanings at once: lore, spiritual, musical; not a rule). 10:03 PM: "Like an om in spirituality. Use this philosophy in the design". Title: "The Journey Ohm" (10:02–10:03 PM; no in-app rename until he approves).
5. **Living world.** 9:56 PM: "I also want terrain deformation and a dynamic environment". 10:05 PM: "The ground should pulse and the environment lightly react to it".
6. **Rendering.** 9:51 PM: "Three.js sounds great" (approved as a WebGL overlay for fourth-wall moments and device focus). 9:52 PM: "Why aren't we using that as the main way?" three.js as the **main** renderer is proposed in NEW_ENGINE.md §9 but **not approved**.
7. **Text.** 9:45 PM: "For dev mode it can have words". 9:47 PM: "Let's keep the now words rule as consideration for the released game experience, not a crucial rule for development". So the released game is text-free, and dev builds and tools may use text.
8. **Music.** Jam and song are separate states (9:18 PM). There is one tradition per planet for now (8:55 PM), and much bigger planets with blended regions later (8:56 PM). Every ohm is its own instrument and generally keeps its sound, but can learn sounds, be changed by the player and be modulated by items; there is no central composer. A jam has no single key, chord or leader: it can switch keys and contain many chords and sounds (2:21–2:22 AM Oct 25). SCALE_MUSIC.md proposes one universal pulse (60 BPM) and one fundamental "om" tone that every layer is a partial or echo of. That is a **proposal** (questions 258–276).

The old engine, for reference only: Canvas 2D, AudioWorklet synth, Verlet/PBD soft bodies, 84 modules in `www/js/`, Capacitor 8 Android. These are concepts to keep, not code to port.

---

## 1. Reference reading

### 1.1 Procedural generation: noise
1. Ken Perlin, *Improving Noise* (SIGGRAPH 2002), the improved Perlin noise paper: https://mrl.cs.nyu.edu/~perlin/paper445.pdf
2. Ken Perlin's reference implementation page: https://mrl.cs.nyu.edu/~perlin/noise/
3. Stefan Gustavson, *Simplex noise demystified*, the clearest simplex explainer: https://weber.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf **[timeout]**
4. OpenSimplex2 (KdotJPG), the patent-free successor family with reference code: https://github.com/KdotJPG/OpenSimplex2
5. The Book of Shaders, *Noise*: https://thebookofshaders.com/11/ · *Cellular noise*: https://thebookofshaders.com/12/ · *Fractal Brownian Motion*: https://thebookofshaders.com/13/
6. Inigo Quilez, *fBm*: https://iquilezles.org/articles/fbm/ · *Domain warping* (organic, "trippy" shapes): https://iquilezles.org/articles/warp/
7. Inigo Quilez, *Smooth minimum* (blending SDF shapes, good for soft ohm bodies and blob terrain): https://iquilezles.org/articles/smin/ · *Distance functions*: https://iquilezles.org/articles/distfunctions/
8. Red Blob Games, *Making maps with noise functions*: https://www.redblobgames.com/maps/terrain-from-noise/ · *Noise functions and map generation*: https://www.redblobgames.com/articles/noise/introduction.html
9. Red Blob Games, *Procedural map generation on a sphere* (planets): https://www.redblobgames.com/x/1843-planet-generation/
10. Catlike Coding, *Pseudorandom Noise* tutorials (Unity-based, but the hashing and seeding ideas carry over): https://catlikecoding.com/unity/tutorials/pseudorandom-noise/

### 1.2 Procedural generation: L-systems, plants and sacred geometry
1. Prusinkiewicz and Lindenmayer, *The Algorithmic Beauty of Plants* (free PDF from the authors' lab): https://algorithmicbotany.org/papers/abop/abop.pdf
2. Algorithmic Botany publication list (phyllotaxis, the golden angle and Fibonacci spirals, which fit his plant concept (HANDOFF item 17): "phi and Fibonacci, never stamped symbols"): https://algorithmicbotany.org/papers/

### 1.3 Procedural generation: wave function collapse and grammars
1. Maxim Gumin, WaveFunctionCollapse (the original repo, MIT): https://github.com/mxgmn/WaveFunctionCollapse
2. BorisTheBrave, *Wave Function Collapse Explained*: https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/
3. gridbugs, *Procedural generation with Wave Function Collapse*: https://www.gridbugs.org/wave-function-collapse/
4. Kate Compton, Tracery (a generative text grammar; the idea maps onto musical phrase and form grammars): https://tracery.io/ · repo: https://github.com/galaxykate/tracery
5. Shaker, Togelius and Nelson, *Procedural Content Generation in Games* (free online book): https://www.pcgbook.com/
6. PCG Wiki: https://pcg.wikidot.com/

### 1.4 Seeded hierarchical worlds
1. Innes McKendrick, *Continuous World Generation in No Man's Sky* (GDC 2017): https://www.youtube.com/watch?v=sCRzxEEcO2Y · Vault: https://www.gdcvault.com/play/1024265/Continuous-World-Generation-in-No
2. Sean Murray, *Building Worlds in No Man's Sky Using Math(s)* (GDC 2017): https://www.youtube.com/watch?v=C9RyEiEzMiU · Vault: https://www.gdcvault.com/play/1024514/Building-Worlds-Using
3. Paul Weir, *The Sound of No Man's Sky* (GDC 2017; procedural audio, the VocAlien vocal-tract synth, a generative music system tied to game state; very close to ohm voices and mouths): https://www.youtube.com/watch?v=zKJ_XuQjjiw · Vault: https://www.gdcvault.com/play/1024067/The-Sound-of-No-Man
4. Will Wright, *The Future of Content* (GDC 2005, the Spore reveal and his case for procedural methods): https://www.youtube.com/watch?v=ofA6YWVTURU · Vault: https://gdcvault.com/play/1019981/The-Future-of-Content · written report: https://www.gamedeveloper.com/design/gdc-2005-report-the-future-of-content
5. Chris Hecker, *How To Animate a Character You've Never Seen Before* (GDC 2007, Spore's procedural animation for arbitrary bodies, directly relevant to gene-built ohm bodies): https://archive.org/details/GDC2007Hecker · slides and audio: https://chrishecker.com/How_To_Animate_a_Character_You've_Never_Seen_Before
6. Dwarf Fortress (Bay 12 Games), history-simulated worlds: https://www.bay12games.com/dwarves/ · world-generation parameters: https://dwarffortresswiki.org/index.php/World_generation
7. Sean O'Neil, *A Real-Time Procedural Universe, Part Three: Matters of Scale* (floating-point precision across planet-to-galaxy scales): https://www.gamedeveloper.com/programming/a-real-time-procedural-universe-part-three-matters-of-scale

### 1.5 Continuous-scale zoom (galaxies down to atoms)
1. Charles and Ray Eames, *Powers of Ten* (1977), the original continuous zoom (official Eames Office upload): https://www.youtube.com/watch?v=0fKBhvDjuy0 · background: https://en.wikipedia.org/wiki/Powers_of_Ten_(film)
2. Cell to Singularity (Steam), a progression across scales of life and cosmos: https://store.steampowered.com/app/977400/
3. Kosmos (John Judnich), an open-source WebGL procedural universe you can fly through, from galaxies down to planet surfaces, in a browser. Check its licence in the repo before reusing any code. https://github.com/judnich/Kosmos
4. Universe Atlas (chrisjz), a true-scale continuous zoom across 43 orders of magnitude in WebGPU. Its README explains hierarchical double-precision frames, camera-relative rendering and log-compressed render space: https://github.com/chrisjz/universe
5. The Scale of the Universe 2 (Huang twins), a simple slider zoom useful as an interaction reference: https://htwins.net/scale2/
6. Floating origin (the technique and its history): https://en.wikipedia.org/wiki/Floating_origin
7. Outerra, *Maximizing Depth Buffer Range and Precision* (logarithmic depth): https://outerra.blogspot.com/2012/11/maximizing-depth-buffer-range-and.html
8. three.js `logarithmicDepthBuffer` docs: https://threejs.org/docs/#api/en/renderers/WebGLRenderer.logarithmicDepthBuffer · live example: https://threejs.org/examples/webgl_camera_logarithmicdepthbuffer.html

Engineering takeaway for "snap zoom": keep each layer (galaxy, system, planet, region, ohm, sound/partials) in its **own local frame**. Render camera-relative, hand focus down and up the chain, and drive the snap with an eased log-scale parameter. Only the focus layer and its two neighbours are live; the rest are cheap "beds" (SCALE_MUSIC.md §0.1, item 18).

### 1.6 Generative music, Web Audio, AudioWorklet and WASM DSP
1. MDN, Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
2. MDN, AudioWorklet: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
3. The W3C Web Audio API spec: https://webaudio.github.io/web-audio-api/
4. Chrome, *Audio Worklet is now available by default*: https://developer.chrome.com/blog/audio-worklet · *Audio worklet design pattern* (WASM plus SharedArrayBuffer ring buffers): https://developer.chrome.com/blog/audio-worklet-design-pattern
5. Chris Wilson, *A tale of two clocks* (look-ahead scheduling, essential for a universal pulse): https://web.dev/articles/audio-scheduling
6. Paul Adenot, *Web Audio API performance and debugging notes*: https://padenot.github.io/web-audio-perf/
7. MDN, `AudioContext()` constructor (`latencyHint`, `sampleRate`): https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext · `baseLatency`: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency · `outputLatency`: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency
8. Faust (functional DSP language that compiles to WASM AudioWorklets): https://faust.grame.fr/ · *Deploying on the Web*: https://faustdoc.grame.fr/manual/deploying/ · faustwasm: https://github.com/grame-cncm/faustwasm · libraries: https://github.com/grame-cncm/faustlibraries
9. Csound for the web (WASM): https://csound.com/wasm/
10. Tone.js: https://tonejs.github.io/
11. Elementary Audio (declarative, functional audio graphs): https://www.elementary.audio/
12. Julius O. Smith III (CCRMA), *Physical Audio Signal Processing* (waveguides, vocal tracts, plucked and struck models; the stick-on-rock first sound): https://ccrma.stanford.edu/~jos/pasp/ · all his books: https://ccrma.stanford.edu/~jos/
13. Steven W. Smith, *The Scientist and Engineer's Guide to DSP* (free): https://www.dspguide.com/
14. Tero Parviainen, *How Generative Music Works*: https://teropa.info/loop/
15. Brian Eno and Peter Chilvers, generative music apps (Bloom and others): https://generativemusic.com/
16. William Sethares, *Tuning, Timbre, Spectrum, Scale* (matching a timbre's partials to its tuning, useful for musical-harmony puzzles): https://sethares.engr.wisc.edu/ttss.html · *Relating Tuning and Timbre*: https://sethares.engr.wisc.edu/consemi.html
17. Chrome Music Lab (wordless, touch-first music toys): https://musiclab.chromeexperiments.com/
18. Magenta (ML music research; reference only, probably too heavy for on-device): https://magenta.tensorflow.org/

### 1.7 three.js / WebGL: instancing, LOD, GPU terrain and marching cubes
1. three.js manual, *Optimize lots of objects*: https://threejs.org/manual/#en/optimize-lots-of-objects · *animated*: https://threejs.org/manual/#en/optimize-lots-of-objects-animated
2. `InstancedMesh`: https://threejs.org/docs/#api/en/objects/InstancedMesh · `BatchedMesh`: https://threejs.org/docs/#api/en/objects/BatchedMesh · `LOD`: https://threejs.org/docs/#api/en/objects/LOD
3. `WebGPURenderer` (falls back to WebGL2; a check for Android WebView support is needed): https://threejs.org/docs/#api/en/renderers/webgpu/WebGPURenderer · Chrome WebGPU overview: https://developer.chrome.com/docs/web-platform/webgpu/overview
4. three.js marching-cubes example: https://threejs.org/examples/webgl_marchingcubes.html
5. Paul Bourke, *Polygonising a scalar field* (the classic marching-cubes tables): https://paulbourke.net/geometry/polygonise/
6. 0fps, *Smooth Voxel Terrain (Part 2)* (marching cubes, surface nets, dual contouring compared): https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/
7. NVIDIA GPU Gems 3, ch. 1, *Generating Complex Procedural Terrains Using the GPU*: https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu
8. WebGL Fundamentals, *Instanced drawing*: https://webglfundamentals.org/webgl/lessons/webgl-instanced-drawing.html · WebGL2 Fundamentals: https://webgl2fundamentals.org/
9. MDN, *WebGL best practices*: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
10. Discover three.js, *The Big List of three.js Tips and Tricks*: https://discoverthreejs.com/tips-and-tricks/

### 1.8 Android, Capacitor and WebView: performance and audio latency
1. Capacitor Android docs: https://capacitorjs.com/docs/android · troubleshooting: https://capacitorjs.com/docs/android/troubleshooting · config: https://capacitorjs.com/docs/config · `cap sync`: https://capacitorjs.com/docs/cli/commands/sync
2. Android, *Build web apps in WebView*: https://developer.android.com/develop/ui/views/layout/webapps/webview · *Best practices for web apps*: https://developer.android.com/develop/ui/views/layout/webapps/best-practices
3. Android NDK, *Audio latency*: https://developer.android.com/ndk/guides/audio/audio-latency · AOSP, *Measure audio latency*: https://source.android.com/docs/core/audio/latency/measure
4. Oboe (Google's low-latency native audio library; a fallback if WebView audio latency is too high on test phones, via a Capacitor plugin): https://github.com/google/oboe
5. Chrome DevTools, *Remote debug Android devices* (inspect the Capacitor WebView over USB): https://developer.chrome.com/docs/devtools/remote-debugging · *Analyze runtime performance*: https://developer.chrome.com/docs/devtools/performance
6. web.dev, *Rendering performance*: https://web.dev/articles/rendering-performance
7. Android, *Slow rendering* (frame-time vitals): https://developer.android.com/topic/performance/vitals/render · system tracing for games: https://developer.android.com/games/optimize · Perfetto: https://perfetto.dev/
8. MDN, OffscreenCanvas (render off the main thread in a worker): https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas · Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

### 1.9 Wordless game design
1. Journey (thatgamecompany): https://thatgamecompany.com/journey/ · Jenova Chen, *Designing Journey* (GDC 2013): https://archive.org/details/GDC2013Chen · Vault: https://gdcvault.com/play/1017700 · overview: https://en.wikipedia.org/wiki/Journey_(2012_video_game)
2. Proteus (Ed Key and David Kanaga; an island whose music is the landscape): https://store.steampowered.com/app/219680/Proteus/ · https://en.wikipedia.org/wiki/Proteus_(video_game)
3. Electroplankton (Toshio Iwai, Nintendo DS; touch-only music creatures, the closest ancestor of ohms): https://en.wikipedia.org/wiki/Electroplankton
4. Rez / Rez Infinite (Tetsuya Mizuguchi; synaesthesia, where actions quantise to the beat): https://rezinfinite.com/ · https://en.wikipedia.org/wiki/Rez_(video_game)
5. FRACT OSC (Phosfiend; a ruined world restored by solving synth puzzles, the closest match to "chaos re-tuning"): https://store.steampowered.com/app/243220/ · https://en.wikipedia.org/wiki/Fract_OSC
6. Sound Shapes (Queasy Games; levels are loops and pickups are notes): https://en.wikipedia.org/wiki/Sound_Shapes

---

## 2. Libraries and tools (candidates only; licences checked Oct 24 2026 via GitHub API, LICENSE files or npm)

Licence rule of thumb for an APK: MIT, ISC, BSD, Zlib, Apache-2.0 and CC0 are fine with attribution. MPL-2.0 is fine if changed library files stay open. LGPL needs care in a bundled WASM or JS app, so ask Wilbow before shipping it.

**Rendering and geometry**
1. **three.js** (r186 on npm): MIT. Approved for the fourth-wall overlay; the main-renderer question is open. https://github.com/mrdoob/three.js
2. **postprocessing** (pmndrs): Zlib. Efficient bloom and glow passes for "beautiful", but every pass costs fill rate on phones. https://github.com/pmndrs/postprocessing
3. **three-mesh-bvh**: MIT. Fast raycasts on large deformable meshes (touch picking, ground contact). https://github.com/gkjohnson/three-mesh-bvh
4. **meshoptimizer**: MIT. Simplifies meshes to build LOD levels. https://github.com/zeux/meshoptimizer
5. **glTF-Transform**: MIT. An asset pipeline, only if hand-made assets appear (most content should be procedural). https://github.com/donmccurdy/glTF-Transform
6. **isosurface** (mikolalysenko): MIT. Tiny marching cubes and surface nets in JS; old (2014) but simple to read and adapt in a worker. https://github.com/mikolalysenko/isosurface
7. **delaunator**: ISC. Fast Delaunay triangulation for region and blend-zone maps. https://github.com/mapbox/delaunator
8. **earcut**: ISC. Polygon triangulation (drawn shapes into meshes). https://github.com/mapbox/earcut
9. **twgl.js**: MIT, and **regl**: MIT. Thin WebGL helpers, if three.js turns out too heavy for a layer. https://github.com/greggman/twgl.js · https://github.com/regl-project/regl

**Procedural generation**
10. **simplex-noise** (jwagner): MIT. Small, seedable 2D/3D/4D simplex in JS. https://github.com/jwagner/simplex-noise.js
11. **FastNoiseLite**: MIT. One file with OpenSimplex2, cellular and domain warp, plus JS and GLSL ports (the same noise on CPU and GPU). https://github.com/Auburn/FastNoiseLite
12. **OpenSimplex2**: CC0-1.0. Reference implementations. https://github.com/KdotJPG/OpenSimplex2
13. **seedrandom**: MIT (npm). Seeded PRNG, though a 20-line hash such as splitmix or PCG keyed by the layer path may be lighter and fully deterministic. https://github.com/davidbau/seedrandom
14. **WaveFunctionCollapse** (mxgmn): MIT (the bundled sample tilesets may differ). https://github.com/mxgmn/WaveFunctionCollapse · JS port (kchapelier): MIT. https://github.com/kchapelier/wavefunctioncollapse
15. **Tracery**: Apache-2.0. A grammar engine; a pattern for phrase and form grammars (jam into song). https://github.com/galaxykate/tracery
16. **thi.ng/umbrella**: Apache-2.0. A huge modular toolkit (geometry, noise, L-systems, DSP, ECS); pick single packages. https://github.com/thi-ng/umbrella
17. **rbush**: MIT. A spatial index for "who's near whom" queries across many ohms. https://github.com/mourner/rbush

**Simulation and architecture**
18. **bitECS**: MPL-2.0. Data-oriented ECS with typed arrays, built for thousands of entities (scale first). https://github.com/NateTheGreatt/bitECS
19. **Rapier** (WASM physics): Apache-2.0. Note that `rapier.js` was archived on Jul 12 2026 and merged into the main repo. It is only needed if the custom PBD soft bodies are replaced. https://github.com/dimforge/rapier
20. **Comlink**: Apache-2.0. Makes Web Worker calls simple (terrain meshing, world gen off the main thread). https://github.com/GoogleChromeLabs/comlink

**Audio and music**
21. **Tone.js**: MIT. Transport, scheduling and synths, good for prototyping. The current engine already has its own AudioWorklet synth, so this is mainly for its scheduling ideas. https://github.com/Tonejs/Tone.js
22. **Elementary Audio**: MIT. Declarative audio graphs and a good fit for "each layer modulates the next". Check that the WASM runtime works in Android WebView. https://github.com/elemaudio/elementary
23. **Faust** / **faustwasm**: the compiler is LGPL-2.1+ (COPYING.txt), and the faustwasm npm package says LGPL-3.0. Generated DSP code is not bound by the compiler licence, but each faustlibraries function has its own licence header, so check them. A strong fit for writing many ohm voices as compact DSP. https://github.com/grame-cncm/faust · https://github.com/grame-cncm/faustwasm
24. **Csound** (WASM): the core is LGPL-2.1; `@csound/browser` npm metadata says Apache-2.0. Huge and mature, but heavy for a phone; best kept as a reference. https://github.com/csound/csound · https://www.npmjs.com/package/@csound/browser **[403]**
25. **ringbuf.js**: MPL-2.0. Wait-free SharedArrayBuffer ring buffer between the main thread, workers and AudioWorklet (control data for many ohms). https://github.com/padenot/ringbuf.js
26. **tonal**: MIT (npm). Music theory in JS (scales, chords, intervals): a quick check against TRADITION_REFERENCE.md. https://github.com/tonaljs/tonal
27. **@tonejs/midi**: MIT. Reads MIDI, if the dev song library (TRADITION_REFERENCE.md) ever ships as MIDI files. https://github.com/Tonejs/Midi
28. **Oboe**: Apache-2.0. Native low-latency Android audio (see 1.8). https://github.com/google/oboe
29. **Scala** (Huygens-Fokker): a free tuning tool with a large scale archive, for checking just intonation and world tunings: https://www.huygens-fokker.org/scala/

**WASM toolchains**
30. **Emscripten**: MIT / University of Illinois NCSA. Compiles C or C++ DSP to WASM. https://emscripten.org/
31. **AssemblyScript**: Apache-2.0. TypeScript-like code to WASM; an easy route for hot loops (partials, beating maps). https://github.com/AssemblyScript/assemblyscript
32. **wasm-pack**: MIT OR Apache-2.0. The Rust-to-WASM route (the repo moved to wasm-bindgen/wasm-pack). https://github.com/wasm-bindgen/wasm-pack

**Dev, debug and test (dev builds may use text)**
33. **lil-gui**: MIT. Floating tuning panels for dev mode. https://github.com/georgealways/lil-gui
34. **stats.js**: MIT. FPS and ms counter. https://github.com/mrdoob/stats.js
35. **Spector.js**: MIT. Captures and inspects WebGL frames (draw calls, state changes). https://github.com/BabylonJS/Spector.js
36. **detect-gpu**: MIT. Classifies the GPU tier for adaptive quality ("must always run well"). https://github.com/pmndrs/detect-gpu
37. **Playwright**: Apache-2.0. Already the project's headless browser test runner (devDependency `playwright ^1.64.1`). https://github.com/microsoft/playwright
38. **Capacitor**: MIT. Already the app shell (`@capacitor/android` and `@capacitor/core` ^8.5.3, `@capacitor/cli` ^7.6.9, plus the app, filesystem and share plugins, and `@capacitor-community/speech-recognition` ^7.0.1, MIT). https://github.com/ionic-team/capacitor

---

## 3. Music and philosophy sources (brief)

The deep, sourced background (om/AUM, nada brahma, music of the spheres, cymatics, the harmonic series) lives in **[PHILOSOPHY_SOURCES.md](./PHILOSOPHY_SOURCES.md)**, written alongside this file. The concept overview is **[CONCEPTS.md](./CONCEPTS.md)**, and the engine design is **[NEW_ENGINE.md](./NEW_ENGINE.md)**. Project-internal music specs: **SCALE_MUSIC.md** (pulse, fundamental and layer harmony; proposal) and **TRADITION_REFERENCE.md** (real-note reference for 27+ traditions, song recipes, jam to song).

1. Om / AUM: overview https://en.wikipedia.org/wiki/Om · Britannica https://www.britannica.com/topic/om-Indian-religion **[403]** · the Mandukya Upanishad (the AUM text) https://en.wikipedia.org/wiki/Mandukya_Upanishad · public-domain Upanishad translations https://www.sacred-texts.com/hin/upan/index.htm
2. Nāda yoga (sound as a spiritual path; "nada brahma"): https://en.wikipedia.org/wiki/Nada_yoga
3. Music of the spheres: https://en.wikipedia.org/wiki/Musica_universalis · Stanford Encyclopedia of Philosophy, *Pythagoreanism*: https://plato.stanford.edu/entries/pythagoreanism/
4. Harmonic series: https://en.wikipedia.org/wiki/Harmonic_series_(music) · cymatics: https://en.wikipedia.org/wiki/Cymatics
5. Just intonation: https://en.wikipedia.org/wiki/Just_intonation · Kyle Gann, *Just Intonation Explained*: https://www.kylegann.com/tuning.html · Harry Partch: https://en.wikipedia.org/wiki/Harry_Partch · Plainsound (extended just intonation notation): https://www.plainsound.org/
6. Tuning bibliography (Huygens-Fokker): https://www.huygens-fokker.org/docs/bibliography.html
7. World tuning systems: Arabic maqam (Maqam World) https://www.maqamworld.com/ · https://en.wikipedia.org/wiki/Arabic_maqam · raga https://en.wikipedia.org/wiki/Raga · shruti https://en.wikipedia.org/wiki/Shruti_(music) · dastgah https://en.wikipedia.org/wiki/Dastgah · gamelan https://en.wikipedia.org/wiki/Gamelan · slendro https://en.wikipedia.org/wiki/Slendro · pelog https://en.wikipedia.org/wiki/Pelog · Tuvan throat singing https://en.wikipedia.org/wiki/Tuvan_throat_singing
8. Community archives and ethics: Smithsonian Folkways https://folkways.si.edu/ **[403]** · Society for Ethnomusicology https://www.ethnomusicology.org/ **[403]**
9. A worked example of respectful co-creation in games: *Never Alone*, made with the Iñupiat community: https://en.wikipedia.org/wiki/Never_Alone_(video_game)

### 3.1 Cultural check list (run it for every tradition, symbol or sacred idea the engine uses)
1. **Inspiration, not depiction.** The om is a *design philosophy* (one vibration under everything), not a game asset. Use no Devanagari ॐ glyph, no chanted "aum" sample and no mantra as a sound effect unless Wilbow explicitly approves after a respect review (question 272).
2. **No health or spiritual claims.** Make no "healing frequencies", chakra tuning, 432 Hz or "miracle tone" claims anywhere, including store copy.
3. **Name the source honestly in dev docs.** Every scale, rhythm cycle or form gets its tradition and region named correctly (for example "Hindustani raga" or "Central Javanese gamelan", not "Asian"). TRADITION_REFERENCE.md already does this; keep it that way.
4. **Exact tunings over approximations** where a tradition depends on them (maqam quarter tones, gamelan slendro and pelog, shruti). Default question 239 says exact tunings. Never "fix" them to 12-TET and call them by the tradition's name.
5. **No fixed ethnic roles or costumes.** This also fits Wilbow's concept of no themes, presets, genres or fixed roles (t167). A planet's tradition is musical grammar, not a people, a skin colour or a costume.
6. **Sacred versus secular.** Some repertoire is ritual (for example certain gamelan pieces, Vedic chant, Sufi dhikr, sacred drumming). Keep ritual material out of play loops and the song library unless a culture bearer says it is fine.
7. **Public domain is not the same as permission.** Song-library pieces must be public domain everywhere (default question 238) *and* not sacred-restricted.
8. **Mixing (blend zones) is fusion, not ranking.** No tradition is "chaos" and none is the "correct" harmony. Chaos means faults (detuned devices, wrong speeds, clashing neighbours), never "other music".
9. **Consultation before release.** Have the title, om visuals and each tradition's sound checked by people from those traditions (question 272). Budget for paid consultants and credit them.
10. **Record decisions.** Any new cultural question goes into QUESTIONS_FOR_WILBOW.md with the next free number (see 4.6).

---

## 4. Project infrastructure (as of Oct 24 2026, ~10:30 PM MDT)

### 4.1 Paths
1. Old game (concept reference, **frozen**): `/workspace/softsound`. Git repo, branch `master`, **no remote**. Latest commit at writing: `3927468` (10:15 PM MDT, "questions 277-296: new engine decisions"). Code is in `www/js/*.js` (84 modules), entry `www/index.html`, Android project `android/`, APKs `dist/`, tests `tests/`.
2. New engine (Game Dev bot): `/workspace/resonance2`, per DECISIONS (10:12 PM). It exists and holds only `NOTES_DEV.md` (10:18 PM MDT; not a git repo yet). Build there proactively (2:00 AM Oct 25).
3. Old-game worktrees (kept, builds stopped at 10:08 PM): `/workspace/softsound_wt/` (25 worktrees, e.g. daux, diag, fourthwall, jamsong, pulse, voice, voicestuck).
4. v0.6.2 rollback snapshot: `/workspace/softsound_v062_src`.
5. **Never touch** `/workspace/lightsynth` (Lensure, paused; HANDOFF rule 13). The signing keystore lives there (see 4.3); it is read-only use for signing, nothing else.
6. Record-keeping scripts: `/workspace/audit/` (DECISIONS.md is generated; see START_HERE.md "Record keeping").
7. Key docs in `/workspace/softsound`: START_HERE.md, HANDOFF.md, DECISIONS.md (authoritative), WILBOW_VERBATIM.md (search with `rg`, don't read in full), QUESTIONS_FOR_WILBOW.md, SCALE_MUSIC.md, TRADITION_REFERENCE.md, GESTURES.md, VISION_PROPOSAL.md (draft), BRAINSTORM.md, CONCEPTS.md, PHILOSOPHY_SOURCES.md, NEW_ENGINE.md (new-engine scoping, §15 = decisions 277–296).
8. Roadmap Page: canvas `537d9336-cb72-4705-b175-70a79233c55d` in store `store-0adb6cb5-b723-4194-8359-5f07727e8ca0`. Another bot's store, so it may be read-only for you.

### 4.2 Build and run (web)
1. `npm ci` in the project root (Node v20.19.2 on the box).
2. Local server: `cd www && python3 -m http.server 8811`. `tests/runser.sh` starts it automatically if port 8811 is free.
3. Open `http://localhost:8811/index.html` (tests use `?fixed=1` for a fixed scene). Mobile viewport in tests: 412×860, `hasTouch`, `isMobile`.
4. The current app config is `capacitor.config.json`: appId `com.lensure.resonance`, appName `Resonance`, webDir `www`, Android background `#000000`. Whether the new engine keeps this appName and appId is decision 278 in QUESTIONS_FOR_WILBOW.md.

### 4.3 Android build and delivery
1. Toolchain: JDK 21 at `/home/box/jdk`; Android SDK at `/home/box/android` (build-tools 35.0.0 with `zipalign`, `apksigner`, `aapt2`); `compileSdk`/`targetSdk` 35, `minSdk` 23 (`android/variables.gradle`). Last old-game version: versionCode 35, versionName `0.8b10` (`android/app/build.gradle`).
2. Flow (START_HERE.md, NOTES.md): suite green → `npx cap sync` → `cd android && ./gradlew assembleRelease` → `zipalign -p 4` → `apksigner` (v1+v2+v3) → check the cert SHA-256 (starts `db171c70`, ends `dc7d1f`) and `aapt2 dump badging` versionCode → copy to `dist/` → upload.
3. Signing: keystore `/workspace/lightsynth/lensure-upload.jks`, alias `lensure`. The password is a **placeholder** recorded in HANDOFF.md rule 11. Read it there when signing; **never print, copy or commit it**. It must be replaced before any Play Store release (START_HERE question 12).
4. Delivery: upload the signed APK once to Wilbow's Google Drive with the `UploadFile` tool (user-Google-drive connector), never tmpfiles, then give him the Drive link. Recent builds went into the Drive folder **"Resonance overnight"** (NOTES.md; no folder link is recorded in HANDOFF.md). Never delete Drive files without his OK.
5. Run builds through an executor subagent and keep the chat with Wilbow light (START_HERE fact 20).

### 4.4 Test conventions (old suite; the new engine should copy the style)
1. Runner: `tests/runser.sh`, **serial only, never parallel**, with a 900 s timeout per test. A crash or non-zero exit counts as a failure even with no `FAIL` lines.
2. Results: one file per test in `/tmp/res/<test>.txt` (`name | fails=N | last line | seconds`), then `SUITE_DONE`.
3. Env knobs: `RS_T="a b"` runs only those tests; `RS_ROOT`, `RS_PORT` and `RS_RES` let a worktree run its own suite on its own port and results dir (defaults: main tree, 8811, `/tmp/res`).
4. Naming: `*_check.js` and `test_*.js` are headless Node checks of pure modules through `tests/node_env.js` (fake audio clock, note capture, `T.scene()`, deterministic `ID_SEED`). `pw_*.js` are Playwright Chromium checks against the served app. `perf_*.js` are frame-time gates (`perf_j` reports frameHome / frameHome2 mean ms). `soak_save` runs with `--expose-gc`. Fixtures are in `tests/fixtures/`.
5. Output convention: print `FAIL ...` lines for failures and a final summary line (e.g. `jamview_check 62/62`).
6. Policy (HANDOFF rule 6, START_HERE fact 15): lean headless checks only. **No audio recordings or analysis, and no screenshots.** Wilbow phone-tests the feel.
7. Known flaky tests in the old suite get a standalone rerun before they count as failures (NOTES.md b6–b10 entries).
8. For the new engine, add a **perf gate per stage** (9:54 PM "It needs to run well always") and a **scale test** (many ohms and elements, 9:55 PM) as first-class suite members.

### 4.5 Concepts and working notes (from HANDOFF.md, summarised; these are concepts and features to discuss, not rules; his words in WILBOW_VERBATIM.md win)
Working notes:
1. Build test builds proactively and in parallel (2:00 and 2:03 AM Oct 25). "DO WHAT WORKS" (10:23 AM Oct 25).
2. Lean headless checks; no recordings or screenshots (old HANDOFF policy).
3. Delivery by signed APK to the Drive folder 'Resonance overnight' (see 4.3). Report times in MDT (America/Denver).
4. Keep separate from Lensure; never modify `/workspace/lightsynth`; port nothing from it.

Game concepts:
1. Released game: no menus, buttons or text UI as a goal; in-world gestures plus text-free hints and the guide ohm. Dev mode and dev builds may use text (9:45 and 9:47 PM Oct 24).
2. No spontaneous mutation for now ("till we can get good music out of the base systems", t108). Many things can tweak an ohm's synthesis engine (2:32 AM Oct 25). Randomness at creation is fine.
3. Ohms stay near home; physics particle density stays capped. Background (off-screen) ohms stay cheap; heavy systems run on screen.
4. Music first: cohesion without a central composer (for example listening, shared pulse, cueing, cadences, register space). A jam can switch keys and contain many chords and sounds, with no leader (2:21–2:22 AM Oct 25).
5. One app only ("I dont want 2 apps").
6. No themes, presets, genres or fixed roles; biomes are blended fields; the environment only lightly influences sound. (One tradition per planet for now, 8:55 PM.)
7. Every ohm is clearly a different instrument. Ohms generally keep their own sound, but can learn sounds, the player can change them, and carried items modulate them (3:38–3:41 AM and 6:57–6:59 PM Oct 23). Music develops instead of repeating the same song.
8. Visuals: no constant ripples early on; plants grow organically from nearby music with phi and Fibonacci patterns, not stamped symbols.
9. Life is naturally very rare but creatable; changes persist; time passes while away.
10. "Be careful to not Disrupt patterns of what we've discussed and ive agreed to".
11. The creatures are "ohms".
12. Since HANDOFF (DECISIONS.md, Oct 24): priority **scale > always runs well > beauty**; a new procedural engine, not patches; "bring harmony back" (lore, spiritual and musical at once, 11:49 PM); the om philosophy; continuous nested-scale zoom; deformable terrain and a dynamic, pulsing environment.

### 4.6 Where questions and records go
1. Questions for Wilbow go in `/workspace/softsound/QUESTIONS_FOR_WILBOW.md`. **Never renumber.** The highest number now is **296** (277–296 are NEW_ENGINE.md decisions; 293 is answered), so the next new question is **297**, then 298, and so on. Re-check the last number before adding, because other bots also append. Give each a default so work can proceed.
2. Wilbow's messages are appended to WILBOW_VERBATIM.md and DECISIONS.md (append-only, never committed). Never run /workspace/audit gen.py or wv.py.
3. Offer Wilbow decisions as widgets where there is a clear set of choices, and number every list so he can reply with numbers.

### 4.7 Secrets
1. Never print, paste, log or commit secrets or tokens. Refer to them by file or name only: the keystore password (HANDOFF.md rule 11), the Google Drive connector (user-Google-drive, managed by the bot platform), and any API keys or tokens a future service would need: keep them in the vault or env files, never in docs.
