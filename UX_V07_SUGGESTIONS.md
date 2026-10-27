# Resonance v0.7: UX suggestions (for Wilbow's approval)

*Prepared Fri Oct 23, 2026, 1:13 AM MDT. Suggestions only: no code or spec has been changed.*

**How to read this**
- Suggestions are numbered **globally** (S1, S2, …). The open-ended section comes first, then the 9 build steps in order.
- Each suggestion covers four things:
  - **Feel**: what the player experiences.
  - **Why**: the UX principle behind it, with a source.
  - **Fit**: how it sits alongside GESTURES.md and the spec, with any conflict stated outright.
  - **Off-screen**: what it costs for ohms you can't see.
- ⚠️ **CONSULT** marks anything that changes the game's feel in a major way.
- Risks are numbered separately (R1, R2, …) in §0.3.
- Everything here stays in-world. There are no menus, buttons or text.
- What's already built changes what these are:
  - **B (conducting)** and **H.4 (the roof waits for the ohm)** are already in the code, so suggestions for them would be adjustments.
  - **I (a random fresh world each launch)** is also in the code.

---

## 0. Open-ended and sandbox UX (top section)

Wilbow: *"UX is important with a game that is so open ended."* This section sets out the lens. The same lens is applied in every step below.

### 0.1 What the best open-ended toys do (with sources)

| Lesson | Source | What it means for Resonance |
|---|---|---|
| **Make a toy, not a scoreboard.** "When you keep score, you play to the score… you stop watching the actual world." Townscaper has only two verbs, and the algorithm does the rest. | [PC Gamer: Stålberg on Townscaper](https://www.pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint/), [How Townscaper Works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) | Resonance already has no score. Progress should be *heard and seen in the world*: jams that grow, ohms that change, places that sound different. It should never be counted. Stålberg also warns that Townscaper-likes go wrong by adding "more tools and gestures". v0.7 adds a lot of gestures (see R1). |
| **Attractive at first sight, understood by instinct, immediate reward.** Electroplankton has no score, no end and no save menus, so play stays "extemporary and visceral". | [Design Week: Iwai](https://www.designweek.co.uk/issues/8-june-2006/use-your-intuition/), [Iwai interview](https://www.videogamesblogger.com/2006/08/19/electroplankton-for-ds-inventor-toshio-iwai-interview-have-a-look-at-the-music-videos.htm), [Wired](https://www.wired.com/2005/10/toshio-iwais-legacy-system/) | Every touch should make a sound within a heartbeat. The closest relative is Iwai's SimTunes/Electroplankton lineage, where sound-making creatures are steered by the player. |
| **Music as the reward for curiosity.** In Proteus every object has its own motif, so wandering composes the score. "If you reward people for quantifiable things, it devalues everything else." Proteus never says "100%". | [Kill Screen: Ed Key](https://www.killscreen.com/we-talked-creator-proteus-about-vulcan-gypsy-music-and-whether-his-game-game/), [Sound of Proteus case study](https://www.gamedeveloper.com/audio/the-sound-and-music-of-proteus-an-academic-case-study), [PCWorld interview](https://www.pcworld.com/article/468804/one_on_one_with_proteus_developer_ed_key.html) | The birthplace lean (F), the cultures (G) and experience (D) are Proteus-style rewards. They pay off only if the player can *hear the place* (S6, S38). |
| **Magic crayons: disproportionate feedback, soft mastery.** In the Spore creator, a small act produces a big, living result, and people "still loved what they made" when it went wrong. | [Gingold, Magic Crayons](https://www.gamedeveloper.com/game-platforms/gingold-talks-i-spore-i-s-magic-crayon-approach), [GDC 2007 talk](https://archive.org/details/GDC2007Gingold) | The egg hatching and a jam growing are magic-crayon moments. Exaggerate them a little (S24, S29). |
| **Organise freedom.** Toca Boca gives no goals, no points and no wrong answers. Its scaffolding comes from the world itself, including *randomised pre-built worlds* that "serve as a playground… or the first blocks to add to". | [Kidscreen: Toca talks](https://kidscreen.com/2014/02/20/toca-talks-why-freedom-is-best-for-kids-and-apps/), [Toca Builders design notes](https://joanganzcooneycenter.org/2013/11/07/being-a-toca-builder-creating-construction-play-on-touchscreen-devices/), [New Yorker](https://www.newyorker.com/culture/culture-desk/how-to-make-a-great-kids-app) | v0.7's random fresh scene (I) is exactly Toca's pre-built-world scaffold. Make sure the opening scene *invites* (S46). |
| **Optional, discoverable prompts beat quests.** Players pick their own projects. In Minecraft, advancements nudge without constraining. | [Minecraft educational benefits (SDT)](https://education.minecraft.net/content/dam/education-edition/learning-experiences/research_folder/Minecraft%20Educational%20Benefits%20Whitepaper.pdf), [Minecraft advancements](https://minecraft.wiki/w/Advancement) | The hints should work as *invitations*, not instructions (§7). |
| **Autonomy plus competence predict enjoyment and return play. Intuitive controls feed both.** | [Ryan, Rigby & Przybylski 2006 (SDT)](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2006_RyanRigbyPrzybylski_MandE.pdf) | Each new system should leave the player as author (birthplace lean stays subtle) and make them feel *able* (conducting that forgives sloppy beats). |
| **Procedural novelty alone doesn't carry an opening.** Early No Man's Sky left players adrift. Later updates added guided first steps while keeping exploration open. | [Ars Technica: first dozen hours](https://arstechnica.com/gaming/2016/08/the-first-dozen-hours-of-no-mans-sky-soaring-past-disappointment/), [The Verge: NMS fundamentals](https://www.theverge.com/2022/10/3/23380392/no-mans-sky-switch-launch-interview-sean-murray-4-0-update) | A random world needs a reliable "first good thing to do" in every seed (S46). |
| **Visible chain reactions make cause and effect delightful.** In Fantavision you see a flare chain spread from your action. | [Fantavision](https://en.wikipedia.org/wiki/Fantavision_(video_game)) | Jam growth, cueing and joins should show a visible "spread" from the player's act. |
| **Tight cause and effect, exaggerated a little.** | [Lostgarden: tight systems of cause and effect](https://lostgarden.com/2012/07/01/building-tight-game-systems-of-cause-and-effect/), [Exaggerated causality](https://rewardingplay.com/2011/01/31/exaggerated-causality/), [Procedural personalities](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities) | **The legibility rule for v0.7: every hidden system answers the player within a second or two, in the same place they acted.** |
| **About four things in mind at once.** | [Cowan 2001, "magical number 4"](https://doi.org/10.1017/s0140525x01003922), [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/), [NN/g instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/) | Show no more than about four hint marks at once, and only **one** teaching hint on screen at a time (S12, S41). |
| **User control and freedom: an "emergency exit" and undo.** | [NN/g heuristic #3](https://www.nngroup.com/articles/user-control-and-freedom/) | Experimenting only feels safe if undo is reliable. The three-finger undo has a phone-specific risk (R7). |
| **The world changes while you're away, and coming back is a gentle ritual.** In Animal Crossing changes are visible but rarely punishing. | [ACM: Animal Crossing temporal design](https://dl.acm.org/doi/fullHtml/10.1145/3641237.3691689) | This needs continuity between sessions, and v0.7 currently starts a new world every launch (R4). |
| **Level as tutorial.** World 1-1 teaches by safe, staged situations. Journey teaches without words. | [World 1-1 analysis](https://www.youtube.com/watch?v=ZH2wGpEZVgE), [Implicit tutorials study](https://www.sciencedirect.com/science/article/pii/S2405844022027700), [Designing Journey (GDC)](https://gdcvault.com/play/1017700) | The opening scene and the ghost hints should stage one idea at a time. |

### 0.2 The open-ended principles, applied to all 9 steps

| Step | Lens |
|---|---|
| 1. Measure | An open toy lives on long, idle sessions, so steady smoothness and no heat build-up matter more than peak speed. |
| 2. Roofs, birthplace lean, egg polish | Where you make an ohm should *audibly* matter (Proteus). The egg must never slow down quick spawning, because play needs to be fast. |
| 3. Conducting | A new verb with high payoff. It must forgive sloppiness (soft mastery) and show what each motion did. |
| 4. Experience | A self-directed progress signal ("my ohms are getting worldly"). It must be visible, never counted. |
| 5. Watched jams grow | The clearest "progress without quests" in v0.7, but only if the player can tell that *watching* causes it. |
| 6. Cultures | A reward for exploring. It has to sound like a place, not a random change of style. |
| 7. Hints | Pacing all of the above: one idea at a time, as invitations, then fading away. |
| 8. Walk in an ohm's shoes | A second way to experience the same world. Comfort and accessibility come first. |
| 9. Finish | Test the first five minutes and the return visit, not just the features. |

### 0.3 The biggest open-ended UX risks in v0.7 (numbered and candid)

**R1. Gesture overload.**
- v0.7 adds or changes about ten things to learn at once:
  - the 4 egg words;
  - doubled words;
  - six hidden combos;
  - drum taps with the pause lock;
  - hold-for-clay with its ring;
  - a two-hand baton and conducting strokes, including a cut-off;
  - three-finger undo and four-finger redo;
  - the left-thumb stick with flick-to-jump;
  - sense effects.
- Stålberg names "more tools and gestures" as the trap.
- **Remedy (no system removed):** pace the *hints*, not the features, as a discovery ladder (S42). Each hint appears only once the previous idea has been used. Features stay available from minute one for anyone who stumbles on them.

**R2. A crowd of marks around the egg.**
- The egg draws 4 first-tier marks, 3 doubled-word marks, 6 hidden-combo dots and a hold mark. That's up to **14 orbiting marks** around a small egg, in a 1.5 s window.
- That is far past what anyone can take in at a glance.
- **Remedy:** S12. Show about four, and let them grow with the player.

**R3. The egg makes the plain spiral slower to hatch.**
- GESTURES §13 flags this: a plain spiral now hatches when the egg window closes (about 1.5 s), instead of v0.6.2's quick 0.45 s spawn.
- Wilbow has previously called slow spawning a problem.
- **Remedy:** S9 hatches early when the finger clearly moves on. ⚠️ CONSULT (it changes spawn feel).

**R4. A random world each launch means there's no "coming back".**
- The ohms you raised, their experience (D) and their grown jams (E) are gone at the next launch.
- On top of that, hint and guide progress lives in the world (`Sf.mods.guide`), so **hints and the guide start over every launch and never truly fade** (S43).
- I is a deliberate testing setting, and save/load is for later. The risk is that v0.7's long-term systems (D and E) can't be felt across sessions at all.
- **Remedy:** S43 (keep hint progress outside the world) now. Restoring the last world on launch belongs with the save/load design. ⚠️ CONSULT.

**R5. Invisible slow systems.**
- Experience, compatibility and attention-driven growth all happen slowly and quietly.
- Without an instant answer, players won't connect *what they did* (watched, waited, let an ohm listen) with *what happened*.
- **Remedy:** S24, S27, S29 and S30. Each slow system gets a small instant echo.

**R6. Conducting is two-handed, hidden and has a sharp cut-off.**
- Sky's designers observed that phone players "would never put two hands on the screen at the same time" ([Apple: Behind the Design, Sky](https://developer.apple.com/news/?id=zm47it7t)).
- Accessibility guidance asks for single-point alternatives to multi-finger input ([WCAG 2.5.1](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures), [XAG 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)).
- **Remedy:** S17 (a one-hand hand-off). ⚠️ CONSULT.

**R7. Undo is the safety net, and three fingers is the most hijacked gesture on Android.**
- Xiaomi, OnePlus and others use three fingers for screenshots ([Xiaomi](https://www.mi.com/global/support/faq/details/KA-673391/), [OnePlus](https://www.makeuseof.com/how-to-use-gaming-mode-on-oneplus-phones/)).
- Four fingers for redo is a stretch one-handed.
- The hooked-arrow undo glyph that the spec kept is the right backup.
- **Remedy:** S44 makes the glyph part of the undo hint.

**R8. Hints piling up.**
- The egg marks, the guide ghost, the baton ring and ghost, the undo ghost and the stick ghost could all be on screen together.
- **Remedy:** S41, a single hint lane.

**R9. Ohms that seek jams vs ohms that stay home.**
- D says ohms "seek out successful jams".
- Established v0.6 behaviour keeps ohms home: pairings were removed *because* ohms stay home.
- Wandering toward jams could undo that settled feel, and if it happened off-screen it would add cost.
- **Remedy:** S26.

**R10. Cultures that read as random genre swaps or wrong notes.**
- Microtonal traditions next to Western-tuned jams can sound "out of tune" rather than "another tradition".
- Thin versions of many traditions can feel like caricature. OPEN_NOTES #9 already leans toward doing a few properly.
- **Remedy:** S36 to S39.

**R11. The comfort of the senses (K).**
- Each effect has its own risk:
  - darkness can hide the path;
  - a camera shake can bring on motion sickness;
  - a pulsing vignette plus a heartbeat buzz can tire people;
  - flashes can be a photosensitivity risk.
- **Remedy:** S51 to S54.

**R12. Phone heat in long sessions.**
- Open-ended sessions are long. Thermal throttling shows up as stutter and timing drift after 10 to 20 minutes, which is worst for a music game.
- **Remedy:** S1 and S3.

**R13. Experience could blur identity.**
- OPEN_NOTES #7: experienced ohms could converge, losing the "this is *my* ohm's voice" bond.
- **Remedy:** S25.

**R14. The 0.4 s drum lock fights slow rhythms.**
- Tapping a slow pattern naturally leaves gaps longer than 0.4 s, so the drum type would lock mid-thought.
- **Remedy:** S8.

**R15. A stick flick could trigger the play-mode exit.**
- In shoes mode, a fast "flick up to jump", or a hard stick push, may match the play-mode exit rule ("fast swipe away").
- **Remedy:** S48.

### 0.4 Where the spec already follows best practice (brief)

- **No score, no quests, no text.** This matches Townscaper, Toca, Proteus and Electroplankton (§0.1).
- **The random fresh scene (I) acts as scaffolding.** It matches Toca's randomised pre-built worlds.
- **The egg's hit area** is a 46 px radius (about 92 px across). That is well above the [48dp Android minimum](https://support.google.com/accessibility/android/answer/7101858?hl=en) and [NN/g's 1 cm](https://www.nngroup.com/articles/touch-target-size/). OPEN_NOTES #3 ("small target") is fine on hit area, though the *drawn* egg is small (S11).
- **Hold durations:**
  - The 450 ms hold and 0.6 s baton are close to Android's 400 ms long-press default ([ViewConfiguration](https://developer.android.com/reference/android/view/ViewConfiguration)) and clearly separate from a tap.
  - The H.1 ring starting at 120 ms gives early feedback that a hold is under way. This is good practice.
- **The egg window ring closes visibly.** This shows the system's state ([NN/g heuristic #1](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- **Two-finger tap does nothing.** That removes a conflict, and fewer meanings per gesture is good.
- **The hooked-arrow undo stays** as a single-point alternative (WCAG 2.5.1).
- **Hints fade after use (L), never block the view, and ghosts wait for the player to copy.** This matches NN/g's contextual, just-in-time help ([NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)) and World 1-1.
- **Tempos snap to world-synced ratios**, so the player can't make a mess.
- **The floating stick:**
  - It appears only while touched, only on empty screen, and on the left.
  - Flick-up to jump matches Sky and Brawl Stars ([Sky help](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/489-how-do-i-get-my-character-to-move/?mobile-app=true&theme=false%29), [Brawl Stars](https://brawlstars.fandom.com/wiki/Beginner%27s_Guide), [Terraria mobile](https://medium.com/@watsonwelch/the-making-of-terraria-mobile-part-2-touch-controls-706cbdc61d64)).
- **Heavy systems are visible-only, and off-screen ohms stay cheap (J).** This matches [Android's thermal guidance](https://developer.android.com/games/optimize/adpf/thermal).
- **Senses are whole-screen effects with no per-ohm work.** That is cheap.

---

## Step 1: Measure first (frame time, off-screen cost)

**S1. Judge smoothness by the worst moments and by long sessions, not by the average.**
- **Feel:** music and motion never hiccup, even 20 minutes in with a busy world.
- **Why:** players perceive uneven frame pacing as stutter even when the average looks fine. Phones slow down when hot. [Android Frame Pacing](https://developer.android.com/games/sdk/frame-pacing), [Android Thermal API](https://developer.android.com/games/optimize/adpf/thermal).
- **Fit:** extends perf_j.js to record the slowest frames and a long run alongside the average. Test-only, with no gameplay change.
- **Off-screen:** none. It measures the cheap off-screen tick so that it stays cheap.

**S2. Measure the delay from touch to sound inside the game, without recording anything.**
- **Feel:** a tap on the egg, a conducting beat, or a note in shoes mode feels like playing an instrument, not sending a message.
- **Why:**
  - Musical control aims for roughly 10 ms gesture-to-sound with very low jitter ([Wessel & Wright 2002](https://cnmat.berkeley.edu/sites/default/files/attachments/2002_problems-and-prospects-for-intimate-musical-control-of-computers.pdf)).
  - Android touch input alone costs about 10 to 35 ms ([OboeTester TapToTone](https://github.com/google/oboe/wiki/OboeTester_TapToTone), [Oboe low latency](https://developer.android.com/games/sdk/oboe/low-latency-audio)).
  - So the game's own share must be tiny.
- **Fit:** log the time from the touch event to the moment the sound is scheduled, in code. No microphone and no recording, in line with Wilbow's rule.
- **Off-screen:** none.

**S3. Graceful quality steps when the phone gets warm.**
- **Feel:** in long sessions the world might lose a little sparkle, but the music never stutters.
- **Why:** reduce workload gradually as thermal headroom drops ([Android Thermal API](https://developer.android.com/games/optimize/adpf/thermal)). Sky treated battery and heat as part of the design ([Apple: Sky](https://developer.apple.com/news/?id=zm47it7t)).
- **Fit:** if frame time stays high, decorative extras go first: experience sheen detail, extra orbit marks, link lines, sense particles. Audio and creature motion are never reduced. No gesture change.
- **Off-screen:** none, because it only reduces on-screen work.

---

## Step 2: Cave roofs (H.4), birthplace lean (F tuning), egg polish (F1, F2, F7)

**S4. The roof gap fills in gently once the ohm moves away.** *(H.4 is built. This would be an adjustment.)*
- **Feel:** the cave roof grows closed over a moment, like rock settling. It doesn't pop in, so it never looks like a glitch.
- **Why:** sudden visual jumps break comfort and read as bugs. Smooth transitions keep attention calm ([Keren, Scroll Back](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers), [Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg)).
- **Fit:** visual only, with no gestures. The spec says the roof stays silent like the ground, so no sound is added.
- **Off-screen:** none. It only runs when an on-screen chunk completes.

**S5. Avoid closing the roof while the player is looking right at the spot.**
- **Feel:** caves "just are". You don't watch them get built.
- **Why:** players notice procedural seams when they're watched. Keep changes out of the focus of attention (the Keren camera goals: attention and comfort).
- **Fit:** complete the waiting roof when the area is clear *and* it's away from the centre of the screen, or after a short delay. Same behaviour, different timing.
- **Off-screen:** zero, because off-screen chunks simply complete when they load.

**S6. Make the birthplace audible and visible at the moment of birth.**
- **Feel:**
  - An ohm made in a cave hatches with a darker, echoing first note and a dusky tint.
  - One made by the pool hatches with a watery shimmer.
  - Without being told, you learn that *where* you make something matters.
- **Why:** Proteus ties every place to sound. Cause and effect must land at the moment and place of the act ([Lostgarden](https://lostgarden.com/2012/07/01/building-tight-game-systems-of-cause-and-effect/), [Exaggerated causality](https://rewardingplay.com/2011/01/31/exaggerated-causality/)).
- **Fit:**
  - It fits whichever lean options Wilbow picks (3+4 recommended, still pending).
  - The emphasis is only in the first second. The lasting lean stays subtle, so the stroke still defines the ohm (SDT autonomy).
  - No gesture change.
- **Off-screen:** none. It happens once, at birth, on screen.

**S7. The drum tap preview sounds on touch-down, and each tap leaves a mark on the egg.**
- **Feel:**
  - Each tap on the egg instantly sounds the drum you're choosing: kick, then snare, then hat.
  - A matching dot appears on the shell, so you can see and hear where you are.
- **Why:**
  - Immediate feedback ([Wessel & Wright](https://cnmat.berkeley.edu/sites/default/files/attachments/2002_problems-and-prospects-for-intimate-musical-control-of-computers.pdf)).
  - Visibility of system status ([NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)).
  - Feedback should be designed together across sound, visuals and touch ([Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)).
- **Fit:**
  - Taps that start on the egg are already routed to the egg (A, egg.js), so playing the preview on touch-down doesn't change the tap rule elsewhere.
  - The marks reuse the existing glyph style.
- **Off-screen:** none.

**S8. Make the drum lock pause follow the player's own tapping speed.** *(Remedy for R14)*
- **Feel:** you can tap a slow, laid-back pattern without the egg deciding too early. A soft "click shut" tells you when it has locked.
- **Why:** tap-tempo tools judge a pause against the user's recent intervals, not a fixed clock ([LMMS tap tempo](https://github.com/LMMS/lmms/pull/8098), [ArduinoTapTempo](https://github.com/dxinteractive/ArduinoTapTempo)). Gaps in a slow pattern often run past 0.4 s.
- **Fit:**
  - Lock after a pause clearly longer than the player's own taps so far (never shorter than 0.4 s).
  - The lock moment gets a small shell "click" sound plus the mark settling.
  - If haptics are kept (still pending with Wilbow), a single light tick.
  - No gesture change.
- **Off-screen:** none.

**S9. A plain spiral hatches early when the finger moves on.** ⚠️ **CONSULT** *(Remedy for R3, changes spawn feel)*
- **Feel:** drawing spiral after spiral to scatter ohms feels as quick as v0.6.2. The egg only waits when you show interest in it.
- **Why:** high-frequency actions need fast paths, so expert speed shouldn't pay for a beginner feature ([NN/g UI accelerators](https://www.nngroup.com/articles/ui-accelerators/)).
- **Fit:**
  - If the next touch starts *away* from the egg (outside its hit area), the egg hatches at once as the plain kind, and that touch carries on as normal.
  - If no touch arrives, keep a shorter quiet window. Any stroke that starts on the egg extends it as now.
  - No new gesture. It removes the §13 slowdown.
- **Off-screen:** none.

**S10. The F2 slide-aside moves in a short, eased glide and keeps the egg in plain sight.**
- **Feel:** the egg politely steps out from under your finger and keeps its glow and ring, so you know it's still listening.
- **Why:** easing and continuity make motion read as intentional ([Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg)). Fingers and the hand hide what's below and beside them ([Hoober, fingers and thumbs](https://www.uxmatters.com/mt/archives/2013/11/design-for-fingers-and-thumbs-instead-of-touch.php)).
- **Fit:** slide toward open space, preferably upward and away from the drawing hand. Never off screen and never onto an ohm. The hit area moves with it.
- **Off-screen:** none.

**S11. Draw the egg a little larger while its window is open.**
- **Feel:** the egg looks as touchable as it actually is.
- **Why:** the hit area is generous, but the drawn egg is small. A target's apparent size guides aim ([NN/g Fitts's law](https://www.nngroup.com/articles/fitts-law/)).
- **Fit:** visual only, with the hit area unchanged. It shrinks back as F7 hints fade.
- **Off-screen:** none.

**S12. About four orbit marks at a time, growing with the player.** ⚠️ **CONSULT** *(Remedy for R2. It changes what A's hints show, though not what the egg can do.)*
- **Feel:** a new player sees four simple marks around the egg: taps, wave, circle, flick. As you use them, the doubled marks join. Hidden-combo dots appear only after you've found your first combo by accident.
- **Why:** working memory holds about four chunks ([Cowan](https://doi.org/10.1017/s0140525x01003922)). [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) applies. Hidden combos then stay a reward for curiosity, Proteus-style.
- **Fit:**
  - Every combo still works from day one. Only the marks are paced.
  - The hold mark shows only until the player has made clay once.
  - Fading follows `mods.guide.eggWords` as now (but see S43).
- **Off-screen:** none.

**S13. F7 fading: marks shrink toward the shell and dim, rather than vanishing all at once.**
- **Feel:** guidance quietly steps back as you become fluent. It's never abruptly gone, and you never feel abandoned.
- **Why:** coach marks should go away once learned, while help stays recoverable ([NN/g instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/)).
- **Fit:** the floor stays faint, as egg.js already does with its 0.2 floor. Pairs with S43's refresher.
- **Off-screen:** none.

---

## Step 3: Conducting (B, F5), built, so these are adjustments

**S14. Tempo follows a steady average of your last few beats and ignores one odd stroke.**
- **Feel:** a sloppy beat doesn't jerk the music. Two or three steady beats and the world follows you.
- **Why:** robust tap tempo uses a rolling window of intervals, rejects outliers and resets after a pause ([LMMS tap tempo](https://github.com/LMMS/lmms/pull/8098), [ArduinoTapTempo](https://github.com/dxinteractive/ArduinoTapTempo)).
- **Fit:** it still snaps to the existing F4 tempo steps (built), so it can only become calmer. No gesture change.
- **Off-screen:** none, because tempo is global anyway.

**S15. Count the beat at the sharp turn at the bottom of the stroke, not at the lowest pixel.**
- **Feel:** the beat lands where your hand "bounces", the way a conductor's ictus feels.
- **Why:** conducting studies detect beats from acceleration peaks and the change of direction, with timing tolerances of about ±70 ms ([Training conductors, ACM](https://dl.acm.org/doi/fullHtml/10.1145/3610543.3626155), [PHENICX](https://phenicx.upf.edu/system/files/publications/moco-ready.pdf), [conga, NIME 2006](https://nime.org/proceedings/2006/nime2006_260.pdf)).
- **Fit:** recogniser detail only. Upbeats and the cut-off flick are unchanged.
- **Off-screen:** none.

**S16. Every beat answers at once. Tempo changes land on the next bar.**
- **Feel:**
  - Each stroke gets an instant soft spark at your fingertip, and the ohms in view nod.
  - The music changes speed at a musical moment, so it never stumbles.
  - Beats are treated as landing a touch early, the way people naturally anticipate.
- **Why:**
  - Immediate response ([Wessel & Wright](https://cnmat.berkeley.edu/sites/default/files/attachments/2002_problems-and-prospects-for-intimate-musical-control-of-computers.pdf)).
  - People tap slightly *ahead* of the beat ([Repp 2005](https://doi.org/10.3758/bf03206433), [Repp & Su 2013](https://doi.org/10.3758/s13423-012-0371-2)).
  - Musical changes feel right on phrase boundaries ([Butler](https://wayneandwax.com/academic/mts-butler-unlocking-groove.pdf)).
- **Fit:** visual and timing only. "Ohms in view turn their eyes" is already built, and nodding extends it.
- **Off-screen:** none. Off-screen ohms only receive the new tempo.

**S17. One-hand hand-off: after the baton is raised, lifting both fingers keeps it up briefly so the same hand can conduct.** ⚠️ **CONSULT** *(Remedy for R6)*
- **Feel:** you can conduct holding the phone in one hand. Two fingers rest to raise the baton, then one finger beats.
- **Why:**
  - Sky's observation that phone players rarely use two hands ([Apple: Sky](https://developer.apple.com/news/?id=zm47it7t)).
  - Grips shift constantly, and about half of phone use is one-handed ([Hoober](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)).
  - Single-point alternatives ([WCAG 2.5.1](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures), [XAG 107](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)).
- **Fit (with conflict):**
  - **Conflict:** B says lifting a baton finger releases. This changes that rule.
  - **Conflict:** while the baton stays up, single-finger strokes on open ground would conduct instead of drawing.
  - **Mitigation:** the baton glows visibly while it's up. It releases on 3 s without a beat, or on the cut-off flick.
  - The two-hand version keeps working as built.
- **Off-screen:** none.

**S18. The cut-off needs a clear "ending" motion, and the next beat through the ohms brings them back.**
- **Feel:** an energetic downbeat doesn't accidentally silence everyone. If you do cut off by mistake, one stroke through the ohms brings them back.
- **Why:** prevent slips, and make recovery cheap ([NN/g user control and freedom](https://www.nngroup.com/articles/user-control-and-freedom/)). This also answers OPEN_NOTES #10 (accidental cueing).
- **Fit:**
  - Keep the built thresholds, plus a requirement that the flick ends with the finger lifting, not turning back up.
  - Cueing by stroking through ohms is already built.
- **Off-screen:** none.

**S19. Show loudness as you conduct.**
- **Feel:** a soft glow at your baton fingertip brightens as you conduct higher and dims lower, and you hear the swell at once.
- **Why:** visible cause and effect ([Lostgarden](https://lostgarden.com/2012/07/01/building-tight-game-systems-of-cause-and-effect/)).
- **Fit:** visual only. Height-to-loudness is already built.
- **Off-screen:** none.

**S20. No buzz on every beat. Use haptics only at the baton raise and the cut-off, if kept.**
- **Feel:** the phone stays calm while you conduct. You feel a single "baton up" moment.
- **Why:**
  - Frequent events need very subtle or no haptics, and strength should scale with importance ([Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)).
  - Avoid overuse ([Apple HIG haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)).
  - Android also discourages raw one-shot buzzes, which the game uses today (`navigator.vibrate` in app.js and water.js), in favour of the system's predefined effects ([Android haptic feedback](https://developer.android.com/develop/ui/views/haptics/haptic-feedback)).
- **Fit:** keeping haptics at all is pending with Wilbow. The built baton buzz stays a single event.
- **Off-screen:** none.

---

## Step 4: Experience and the compatibility skill (D, D2)

**S21. You can *see* an ohm listening and learning.**
- **Feel:** an ohm turned away from a jam sways in time at its edge and leans in, so you can tell it's paying attention.
- **Why:** procedural characters feel alive when their internal state shows in behaviour ([Procedural personalities](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities)). This is the legibility rule (§0.1).
- **Fit:** an animation layer on existing idle motion. No gesture.
- **Off-screen:** none. Learning stays on the cheap tick, and the sway is drawn only on screen.

**S22. A "got in" moment.**
- **Feel:** the first time an ohm that was once turned away joins a jam, there's a small bloom and the jam's chord swells. It feels like your ohm *grew up*.
- **Why:**
  - Self-set goals feel achieved when competence is visible ([SDT](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2006_RyanRigbyPrzybylski_MandE.pdf)).
  - Disproportionate feedback ([Gingold](https://www.gamedeveloper.com/game-platforms/gingold-talks-i-spore-i-s-magic-crayon-approach)).
  - Visible chains (Fantavision).
- **Fit:** event-driven. It uses the join that D already defines.
- **Off-screen:** none. Off-screen joins happen silently.

**S23. The host link line appears only while helping, then fades.**
- **Feel:** you see which experienced ohm brought the newcomer in. The screen never fills with lines.
- **Why:** show cause briefly, avoid clutter ([Cowan](https://doi.org/10.1017/s0140525x01003922)).
- **Fit:** D already specifies the line. This sets how long it stays.
- **Off-screen:** none.

**S24. Experience sheen in a few clearly different steps.**
- **Feel:** at a glance you can tell a newborn ohm from a seasoned one, roughly three looks, without any numbers.
- **Why:** a few distinct levels are readable. Continuous gradients aren't ([Cowan](https://doi.org/10.1017/s0140525x01003922), [Exaggerated causality](https://rewardingplay.com/2011/01/31/exaggerated-causality/)).
- **Fit:**
  - The sheen goes *over* the ohm's own colour, never replacing it (see S25).
  - A brief pulse when a step is reached gives the instant echo for R5.
- **Off-screen:** none. Sheen is drawn only on screen, and the step is a stored number.

**S25. Experience widens what an ohm will try, but its own voice always leads.** *(Remedy for R13)*
- **Feel:** a worldly ohm still sounds unmistakably like *itself*. It just has more moves.
- **Why:** players bond with recognisable individuals. Their identity must survive their growth ([Procedural personalities](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities)). This answers OPEN_NOTES #7.
- **Fit:** consistent with D's "the genome is never changed". It suggests keeping borrowed habits to a minority share of the ohm's phrases.
- **Off-screen:** none.

**S26. "Seeking" jams means listening from home, not travelling.** ⚠️ **CONSULT** *(Remedy for R9)*
- **Feel:** ohms still keep their homes, as players have come to expect. Curious ones turn toward a successful jam within earshot and might drift a short way inside their home range.
- **Why:** don't break established mental models ([NN/g heuristic: consistency](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- **Fit:**
  - **Conflict** with D's "ohms seek out successful jams" if that is read literally as travel.
  - Settled v0.6 behaviour is that ohms stay home. This proposes leash-limited seeking.
- **Off-screen:** cheaper than travel. Off-screen ohms don't seek at all. Only their learning counter ticks.

---

## Step 5: Watched jams grow (E)

**S27. Watching shows up as a slowly filling arc on the jam's loop ring.**
- **Feel:** as you watch a jam, a faint arc creeps around its ring. Look away and it pauses but doesn't drain. You learn that your attention feeds it.
- **Why:** visible system status ([NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)). Cause and effect within a second or two ([Lostgarden](https://lostgarden.com/2012/07/01/building-tight-game-systems-of-cause-and-effect/)).
- **Fit:** draws on the existing loop ring. No gesture.
- **Off-screen:** none. Attention is measured only for the watched jam (E).

**S28. Small pans and glances don't count as looking away.**
- **Feel:** you can nudge the view or glance at a neighbour without "losing" your jam.
- **Why:** camera-window thinking: a central zone, with tolerance for brief excursions ([Keren](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers)). This answers OPEN_NOTES #11.
- **Fit:** the jam counts as watched while it's in roughly the central part of the screen, and brief glances away of a second or two are forgiven. No gesture.
- **Off-screen:** none.

**S29. Growth arrives with a short build-up, then lands on the phrase.**
- **Feel:** just before a jam grows, you hear a little lift (a riser or the filter opening), then the new part drops in on the downbeat. You hear the reward coming.
- **Why:** build-up and drop on 8/16/32-bar phrases is how dance music signals change ([Butler](https://wayneandwax.com/academic/mts-butler-unlocking-groove.pdf), [Trance/house formal devices](https://digital.library.unt.edu/ark:/67531/metadc103332/m2/1/high_res_d/thesis.pdf)). Players notice and learn adaptive layers ([CoG 2019](https://ieee-cog.org/2019/papers/paper_106.pdf), [Ashton](https://pure.southwales.ac.uk/ws/portalfiles/portal/3519156/W._Ashton_2015_2064869.pdf)).
- **Fit:** uses E's existing EDM knowledge and section structure.
- **Off-screen:** none, because growth only happens while watched.

**S30. When growth pauses, gently mark which member is holding it back.**
- **Feel:** if a jam stops growing because one ohm is out of step, that ohm wobbles softly. You can tap to mute it (the existing gesture) or let it learn. You become a helper, not a spectator.
- **Why:** players need to see *why* an emergent system stalled ([Lostgarden](https://lostgarden.com/2012/07/01/building-tight-game-systems-of-cause-and-effect/)). A slow wobble, never a flicker ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold)).
- **Fit:** tap-to-mute already exists, so no new gesture. The quality gate (E) already identifies who is off.
- **Off-screen:** none.

**S31. The home section returns often enough to anchor long loops.**
- **Feel:** even a 32-bar grown jam keeps coming "home" to a part you recognise. It feels like a song, not wandering.
- **Why:** repetition is what makes music feel familiar and meaningful ([Margulis, On Repeat](https://doi.org/10.1093/acprof:oso/9780199990825.003.0003)).
- **Fit:** E already has "A is home base". This suggests A comes back at least every other section.
- **Off-screen:** none. Sections are stored as references (J).

**S32. Only the one jam you're focused on grows, and the others keep their shape.**
- **Feel:** clear cause: *this* jam grew because *I* watched *it*.
- **Why:** a single, clear focus keeps attribution legible.
- **Fit:** matches E's "the same jam". It just states the rule for when two jams are on screen: the more centred one wins.
- **Off-screen:** none. This is a cost limit in itself.

---

## Step 6: Music from many cultures (G)

**S33. Each tradition has one signature visual cue on its jam.**
- **Feel:** examples:
  - a raga or maqam jam has a steady drone glow;
  - a gamelan jam has a slow gong-ring pulse at the end of its cycle;
  - a clave-based jam has dots that pulse in the pattern.
- **Why:** players attribute music to its source when sound and image coincide (§0.1 legibility). Visual support for significant sounds also helps players who are deaf or hard of hearing ([GAG visuals for background sounds](https://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/)).
- **Fit:** visual only. No text and no gesture.
- **Off-screen:** none. Drawn only on screen, and the tradition is a per-jam label.

**S34. A change of tradition happens only at the end of a cycle, with a crossfade.**
- **Feel:** a jam turning toward another tradition sounds like a natural shift, never a glitch.
- **Why:** adaptive music transitions work on musical boundaries ([CoG 2019](https://ieee-cog.org/2019/papers/paper_106.pdf)).
- **Fit:** the gong cycle or tala end serves as the boundary. Same as E's phrase-boundary rule.
- **Off-screen:** none.

**S35. Microtonal jams keep their own space, and an experienced ohm bridges them.**
- **Feel:** a maqam jam sounds like a *different place*, not wrong notes, because it isn't playing over a Western-tuned jam.
- **Why:** listeners judge clashing tunings as errors when they lack context. Legibility needs separation and a cue (S33).
- **Fit:** consistent with G and with "any of these through a well-travelled ohm". This answers OPEN_NOTES #9.
- **Off-screen:** none.

**S36. Do a few traditions properly before many thinly.** *(Agreeing with OPEN_NOTES #9)*
- **Feel:** each tradition feels respectful and alive rather than like a costume.
- **Why:** depth beats breadth for recognisability, and it lowers the risk of caricature (R10). Margulis on repetition and recognisable form.
- **Fit:** scope choice only.
- **Off-screen:** none.

**S37. Discovering a tradition is its own reward, never ticked off.**
- **Feel:** stumbling on a world where gamelan has emerged is a surprise. No list says "3 of 12".
- **Why:** Proteus's "never say 100%" ([Kill Screen](https://www.killscreen.com/we-talked-creator-proteus-about-vulcan-gypsy-music-and-whether-his-game-game/)).
- **Fit:** consistent with no text and no score.
- **Off-screen:** none.

**S38. Places tilt the odds toward a tradition, and the player can hear the link.**
- **Feel:** cave worlds and pool-side ohms lean toward certain flavours, so exploring different places brings different music.
- **Why:** Proteus ties music to place. It pairs with the birthplace lean (S6).
- **Fit:** it uses the birthplace data from F, nudging G's tradition choice. ⚠️ **CONSULT** if it should affect G at all.
- **Off-screen:** none. Decided at birth.

---

## Step 7: Text-free hints (L), including the undo hint

**S39. Ghost hints happen in the real place, at real speed, then wait for the player to copy.** *(Mostly already true. Keep it.)*
- **Feel:** a ghost fingertip shows the move right where it matters, then pauses while you try it.
- **Why:** World 1-1 and Journey teach by safe demonstration ([World 1-1](https://www.youtube.com/watch?v=ZH2wGpEZVgE), [Designing Journey](https://gdcvault.com/play/1017700)). Contextual, just-in-time help beats tutorials up front ([NN/g](https://www.nngroup.com/articles/onboarding-tutorials/)).
- **Fit:** matches guide.js and the conducting ghost.
- **Off-screen:** none.

**S40. Hints are triggered by what the player is already doing.**
- **Feel:** the conducting ghost appears when you happen to rest two fingers, and the undo ghost when you two-finger tap. The game seems to read your mind instead of lecturing.
- **Why:** contextual tips ([NN/g instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/)).
- **Fit:** already the pattern in B and L (twoTapHint). Apply the same rule to the stick ghost, which appears on first entry to shoes mode.
- **Off-screen:** none.

**S41. One teaching hint at a time, across the whole game.** *(Remedy for R8)*
- **Feel:** the screen never fills with ghosts. Whatever you're touching gets the hint, and everything else waits.
- **Why:** one tip at a time ([NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)). Limited attention ([Cowan](https://doi.org/10.1017/s0140525x01003922)).
- **Fit:**
  - A single hint lane with priority: the gesture in progress first, then the guide, then idle invitations.
  - The egg marks (S12) count as one hint.
  - No hints at all while a jam is being conducted or in shoes mode, except that mode's own first hint.
- **Off-screen:** none.

**S42. A discovery ladder: hints appear in order, features stay unlocked.** *(Remedy for R1)*
- **Feel:**
  - The first sessions feel simple: spiral, then hear an ohm, then shape the egg with a word.
  - Later the world invites you to hold for clay, then to conduct, then to walk in an ohm's shoes.
  - Anyone can find anything early by accident.
- **Why:** progressive disclosure ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). Staged teaching (World 1-1). Optional prompts rather than quests (Minecraft advancements).
- **Fit:** pacing of hints only. No gesture is gated. It uses the existing guide steps and their stored progress.
- **Off-screen:** none.

**S43. Hint and guide progress belongs to the *player*, not to the world.** *(Remedy for R4. A real issue with I as built.)*
- **Feel:** once you've learned something, the game stops teaching it, even when the next launch is a brand-new random world.
- **Why:**
  - Hints should fade for good once learned ([NN/g](https://www.nngroup.com/articles/mobile-instructional-overlay/)).
  - Repeating them every launch is nagging, which runs against Apple's guidance on overuse for haptics ([HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)).
  - The spec says L hints fade after a few uses.
- **Fit:**
  - Today the progress lives in `Sf.mods.guide`, inside the world (guide.js, the egg's `eggWords`, `hint3`).
  - With I's "no auto-load", it starts over every launch.
  - Keep it in a small player record that is separate from the world. No gesture.
- **Off-screen:** none.

**S44. The undo hint shows both ways: three fingers *and* the hooked arrow.** *(Remedy for R7)*
- **Feel:** if your phone grabs three fingers for a screenshot, you still know there's an arrow to touch.
- **Why:**
  - OEM three-finger screenshot gestures ([Xiaomi](https://www.mi.com/global/support/faq/details/KA-673391/), [OnePlus](https://www.makeuseof.com/how-to-use-gaming-mode-on-oneplus-phones/)).
  - Single-point alternatives ([WCAG 2.5.1](https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures)).
  - Recoverability ([NN/g](https://www.nngroup.com/articles/user-control-and-freedom/)).
- **Fit:** the arrow glyph stays as the spec says. The ghost simply alternates between the two.
- **Off-screen:** none.

**S45. Hints never flash. They breathe slowly.**
- **Feel:** gentle and calm, comfortable for everyone.
- **Why:** no more than three flashes a second ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold), [GAG flicker](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)).
- **Fit:** visual timing only.
- **Off-screen:** none.

**S46. Every random world opens with something already happening.** *(The first five minutes)*
- **Feel:**
  - Within seconds of a fresh launch you hear music: one opening ohm is already singing, or two are about to find each other.
  - The guide's first spiral feels like *joining in*, not starting from silence.
- **Why:**
  - Attractive at first sight, rewarded at once (Iwai, [Design Week](https://www.designweek.co.uk/issues/8-june-2006/use-your-intuition/)).
  - Pre-built random worlds as a playground (Toca, [Cooney Center](https://joanganzcooneycenter.org/2013/11/07/being-a-toca-builder-creating-construction-play-on-touchscreen-devices/)).
  - No Man's Sky's lesson that novelty alone doesn't onboard ([Ars Technica](https://arstechnica.com/gaming/2016/08/the-first-dozen-hours-of-no-mans-sky-soaring-past-disappointment/)).
- **Fit:** a rule for `freshScene` (I, built): at least one opening ohm sings straight away. ⚠️ **CONSULT** (it changes the opening mood).
- **Off-screen:** none.

**S47. A refresher for a long-unused move.**
- **Feel:** if you haven't conducted in ages, the world offers the conducting ghost once more when you rest two fingers. It's a reminder, not a lesson.
- **Why:** help should be available again when needed, for returning players ([NN/g onboarding](https://www.nngroup.com/articles/onboarding-tutorials/)). The Animal Crossing "coming home" ritual.
- **Fit:** uses the player record from S43. Still one hint at a time.
- **Off-screen:** none.

---

## Step 8: Walk in an ohm's shoes (K)

**S48. Play-mode exit swipes only count when they start on the ohm. The stick never triggers them.** *(Remedy for R15)*
- **Feel:** you can push the stick hard or flick to jump without being thrown out of the ohm.
- **Why:** gesture conflicts must be resolved by where a touch starts and by mode ([Norman: gestural interfaces](https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/)).
- **Fit:**
  - **Possible conflict:** K's flick-up jump against GESTURES' "fast swipe away" exit.
  - Pinch-in and Android back remain the exits.
  - Check how playmode.js measures "away". If it is measured from the ohm, there is no conflict.
- **Off-screen:** none.

**S49. The floating stick: a small central dead zone, smooth beyond it, and it follows the thumb if you overreach.**
- **Feel:**
  - Resting your thumb doesn't jitter the ohm.
  - A gentle push walks, a full push runs.
  - If your thumb slides past the ring, the stick slides with it, so you never "fall off".
- **Why:**
  - Radial dead zones with rescaling ([Doing dead zones right](https://www.gamedeveloper.com/business/doing-thumbstick-dead-zones-right)).
  - Movement should continue past the ring, and the stick should appear at the touch and vanish on lift ([Baldauf study](https://www.matthiasbaldauf.com/publications/Baldauf15a.pdf), [Terraria mobile](https://medium.com/@watsonwelch/the-making-of-terraria-mobile-part-2-touch-controls-706cbdc61d64), [iOS twin-stick](https://www.gamedeveloper.com/design/a-guide-to-ios-twin-stick-shooter-usability)).
- **Fit:** K already specifies a floating, empty-space-only, left-side stick. This adds the feel details.
- **Off-screen:** none, because only one ohm is driven.

**S50. Walk inside the ring, run beyond it. A faint ring shows the edge.**
- **Feel:** you always know how fast you'll go before you push. The ring is a gentle guide, not a control panel.
- **Why:** Sky's corner rings and its walk/run-by-distance ([Apple: Sky](https://developer.apple.com/news/?id=zm47it7t), [Sky help](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/489-how-do-i-get-my-character-to-move/?mobile-app=true&theme=false%29)).
- **Fit:**
  - The ring appears only while the thumb is down (K).
  - Speed still follows the body plan (K).
  - The flick-up jump matches Sky's flick-in-pad.
- **Off-screen:** none.

**S51. A follow camera with a calm window and a little look-ahead. Eased in and out.**
- **Feel:**
  - The view stays steady while your ohm potters about, then glides to show where you're heading.
  - Entering and leaving shoes mode is a smooth swoop, and you end up back where you were.
- **Why:**
  - Camera windows and forward focus give attention, interaction and comfort ([Keren](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers)).
  - Avoid unnecessary camera motion ([XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/Xbox-accessibility-guidelines/117)).
- **Fit:** K says "the camera follows". This sets how it follows. No gesture.
- **Off-screen:** none.

**S52. The deaf effect shakes the *ohm*, not the camera, and calms down under Android's "Remove animations" setting.**
- **Feel:** you feel the muffled world through your ohm trembling and through soft ripple rings, with no queasy screen shake.
- **Why:**
  - Avoid or allow disabling screen shake ([XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/Xbox-accessibility-guidelines/117)).
  - The WebView's reduced-motion setting follows Android's setting ([web.dev](https://web.dev/learn/accessibility/motion), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)).
- **Fit:**
  - K offers "a gentle shake *or* vibration", and an ohm-local shake fits within that wording.
  - Vibration depends on the pending haptics decision.
- **Off-screen:** none, because it's a whole-screen or single-ohm effect.

**S53. The blind effect never goes fully black. The ground line and your ohm stay faintly visible, and echo ripples are clear, slow rings.**
- **Feel:** spooky and intimate, but you can always steer.
- **Why:**
  - Tunnelling and vignette research says to restrict the edges and keep the ground visible ([Unity tunneling vignette](https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.1/manual/tunneling-vignette-controller.html), [Asymmetric FOV restrictor](https://doi.org/10.1145/3485279.3485284)).
  - High contrast without flashing ([GAG flicker](https://gameaccessibilityguidelines.com/avoid-flickering-images-and-repetitive-patterns/)).
- **Fit:** K's "darkness plus echo ripples", tuned.
- **Off-screen:** none.

**S54. Keep the mood vignette mild and slow. The heartbeat haptic is soft, occasional and optional.**
- **Feel:** you sense your ohm's mood without fatigue. A gentle thrum at moments of change, not a constant buzz.
- **Why:**
  - Avoid overuse and make haptics optional ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)).
  - Keep frequent haptics subtle ([Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)).
  - Avoid repetitive motion ([XAG 117](https://learn.microsoft.com/en-us/gaming/accessibility/Xbox-accessibility-guidelines/117)).
  - No more than three flashes a second ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold)).
- **Fit:** K's vignette and heartbeat. Haptics depend on Wilbow's pending decision.
- **Off-screen:** none.

**S55. Notes played as the ohm land gently in the local jam's key and time.** ⚠️ **CONSULT** *(changes play-mode feel)*
- **Feel:** walk up to a jam as your ohm, play along, and it sounds good. You feel like part of the band straight away.
- **Why:** Electroplankton's "anyone can make music" ([Iwai](http://2005to2007.fabrica.it/blog/2006/07/toshio_iwai_on_pixelsurgeon.html)). Soft mastery (Gingold).
- **Fit:**
  - Snap timing lightly, never fully, so skill still shows.
  - Only near a jam. Play mode elsewhere is unchanged.
  - No gesture change.
- **Off-screen:** none.

**S56. One-handed option: the stick also works on the right side when nothing playable is under the thumb.** ⚠️ **CONSULT**
- **Feel:** left-handers and one-handed players can move the ohm too.
- **Why:** Sky added a one-handed mode and side flipping ([Sky help](https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/489-how-do-i-get-my-character-to-move/?mobile-app=true&theme=false%29)). Brawl Stars has a floating left stick and a right side for actions ([Brawl Stars guide](https://brawlstars.fandom.com/wiki/Beginner%27s_Guide)). About half of phone use is one-handed ([Hoober](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)).
- **Fit:**
  - **Conflict:** K places the stick on the left only. On the right, empty-screen drags would no longer be "nothing".
  - Nodes and handles still win, as K requires.
- **Off-screen:** none.

---

## Step 9: Finish

**S57. A "first five minutes" feel test on three fresh random worlds.**
- **Feel:** confidence that every world opens with an invitation and a quick win.
- **Why:** No Man's Sky's lesson about openings. Lean, feel-based testing (§0.1).
- **Fit:** Wilbow plays three fresh launches and notes what he found without the guide. No recording.
- **Off-screen:** none.

**S58. A "coming back" check.**
- **Feel:** a second launch shouldn't re-teach what you already know (S43).
- **Why:** returning-player experience (Animal Crossing).
- **Fit:** test-only. This is where R4 (no continuity) gets decided with Wilbow.
- **Off-screen:** none.

**S59. One pass over all feedback: each buzz and chime has a single meaning.**
- **Feel:** sounds and buzzes become a language you learn without noticing.
- **Why:** consistent cause and effect ([Apple HIG haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics), [Android haptics principles](https://developer.android.com/develop/ui/views/haptics/haptics-principles)).
- **Fit:**
  - List every vibrate call: the 8 ms tick, 28 ms thump, 18 ms baton, H.1 chime and lock click.
  - Merge any duplicates.
  - All of it is subject to the pending haptics decision.
- **Off-screen:** none.

**S60. A long-session smoothness and heat check on the phone.**
- **Feel:** a 20-minute play still feels as smooth as the first minute.
- **Why:** [Thermal API](https://developer.android.com/games/optimize/adpf/thermal), [Frame Pacing](https://developer.android.com/games/sdk/frame-pacing).
- **Fit:** uses S1 and S3. Compare against v0.6.2 with perf_j.js.
- **Off-screen:** confirms that off-screen ohms stayed on the cheap tick.

---

## Summary of what needs Wilbow's call (⚠️ CONSULT)

| # | Suggestion | Why it needs his call |
|---|---|---|
| S9 | A plain spiral hatches early when the finger moves on | Changes spawn timing back toward v0.6.2 |
| S12 | About four egg marks, growing with use | Changes what A's hints show |
| S17 | One-hand baton hand-off | Changes B's "lifting releases" rule |
| S26 | Seeking means listening from home | Reinterprets D against the stay-home rule |
| S38 | Places nudge which tradition appears | Couples F with G |
| S46 | Every fresh world opens with something singing | Changes the opening mood of I |
| S55 | Gentle snapping to the jam in shoes mode | Changes play-mode feel |
| S56 | Right-side or one-handed stick | Changes K's left-only stick |
| R4 | Random world each launch vs coming back | Belongs with the save/load design |

Pending decisions this list relies on (no change from me): haptics on or off, and the birthplace lean options (3+4 recommended).
