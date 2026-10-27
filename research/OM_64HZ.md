# Is a 64 Hz om a smart choice? (research note, Q264 follow-up)

Asked by Wilbow, 10:43 PM MDT, Oct 24 2026: "I like the idea of 64 hz, but is it a smart move musically and computationally? Research that in context and get back to me. Let's use 64 for now and come back."
Status: research only, no code. Builds on SCALE_MUSIC.md §7.1–7.4 (D7), CONCEPTS.md §10 item 10 and PHILOSOPHY_SOURCES.md (the −37.6 cent figure, the 432/528 claims). Those points are not repeated here.
"[calc]" marks arithmetic I did myself. Everything else cites a source.

## Recommendation (first)

**Keep 64 Hz.** Make it **one global reference constant** in the engine. Add an **optional "tune to standard (A440)" setting later**, and only if the game adds play-along with real instruments, a mic, or 440-tuned recorded samples. With 64 Hz the heartbeat stays exactly the om slowed down. Nothing about phones or the audio engine argues against it. The real cost shows up only where the game meets real-world instruments.

For the player: the game sounds a little under a third of a semitone lower than a piano tuned to 440. On its own that's inaudible to almost everyone. It only clashes if they play a real guitar or piano alongside it.

## 1. Musically

### 1.1 Can a phone even play 64 Hz? (Mostly no. But that's equally true of 65.4 Hz.)
1. Phone speakers reproduce little true bass. One informal measurement (Nexus 5, Sony Z1) showed "nearly no response under 500 Hz". An audio engineer's unmeasured estimate puts general smartphone roll-off near 85–110 Hz. Sources: http://jeremyallin.blogspot.com/2015/05/mobile-phone-speaker-frequency-response.html ; https://www.reddit.com/r/audioengineering/comments/9ni20f/ . (These are weak sources. I didn't find good published data on modern phones in this pass.)
2. **The speaker question doesn't separate 64 from 65.41 Hz.** They're 1.4 Hz apart [calc]. Either fundamental is mostly lost on a phone speaker and present on headphones.
3. The missing-fundamental effect saves the om. If the om sound carries strong harmonics (128, 192, 256, 320 Hz... [calc]), the brain hears the 64 Hz pitch even when the speaker can't play it. Telephones (under 300 Hz cut) still convey male voices around 150 Hz this way. Bass-enhancement products for small speakers and earbuds (Waves MaxxBass and others) synthesise harmonics on purpose to fake low bass. Source: https://en.wikipedia.org/wiki/Missing_fundamental (citing Howard & Angus 2017; Mather 2006; US patent 5,930,373).
4. Caveat from the same source: not everyone hears missing fundamentals equally. Some listeners mainly hear the overtones (Schneider et al. 2005, Nature Neuroscience; Ladd et al. 2013).
5. **Design consequence (it applies whatever the om pitch):** the om voice must be harmonic-rich, with clear partials 2 to 8 or so. Don't make it a pure sine. If the engine ever does phone-speaker bass enhancement, it should add harmonics, not boost below 100 Hz. The 1 Hz heartbeat is felt as rhythm, never heard as pitch, so speakers don't affect it.

### 1.2 Does being 37.6 cents flat of A440 matter?
1. Size: the pitch JND is about 5 cents (nominal), roughly 5–6 cents for complex tones in musical listening, and 10–15 cents for untrained listeners. A quarter tone (50 cents) sounds out of tune if sustained. Sources: https://www.hyperphysics.gsu.edu/hbase/Music/cents.html ; https://www.voicescience.org/lexicon/cents/ . So 37.6 cents is **clearly audible as a comparison**: next to a 440 instrument it's a strong mistuning, about 2.7× the 13.7-cent error of an equal-tempered major third [calc].
2. **Alone, it's a comparison nobody can make.** The whole game is synthesised from one reference, so every interval inside the game is unchanged. Only a listener with absolute pitch would notice the game is "low". (Qualitative point; I didn't look up a prevalence figure.)
3. Where it does bite:
   1. **Playing along with real instruments or singing to a 440 track:** a guitar or keyboard tuned normally clashes by about 38 cents. That's the main real cost.
   2. **Recorded samples tuned to 440** (if any are ever used) must be repitched by ×0.97850 [calc]. That's a single playback-rate factor and cheap.
   3. **Mic pitch detection** (if the game ever listens): detectors work at any frequency, so this isn't a technical problem. But "in tune" must be judged against the game's own reference, or players with 440 instruments get flagged ~38 cents flat. An option to follow 440 solves it.
   4. **Many traditions aren't anchored to 440 anyway** (SCALE_MUSIC §7.4: each keeps its own cents relative to its tonic). The absolute reference matters most for the 12-TET, play-along case.

### 1.3 Just intonation, equal temperament and harmonic-ratio tempos
1. The reference choice **doesn't change any interval**. JI stays JI and 12-TET stays 12-TET, relative to the tonic.
2. Nice property [calc]: from 64 Hz, the common JI ratios land on whole-number Hz: 9:8 = 72, 5:4 = 80, 11:8 = 88, 3:2 = 96, 13:8 = 104, 7:4 = 112, 2:1 = 128. Equal-tempered notes are irrational from any reference, so neither choice helps them.
3. **The real benefit is coherence between tempo and pitch.** At 64 Hz, a tempo ratio and a pitch ratio are literally the same number six octaves apart. 90 BPM (3:2) is the 96 Hz fifth slowed down, and 120 BPM is the 128 Hz octave [calc]. At 65.41 Hz you'd have to choose: keep 60 BPM, and the om is no longer exactly the heartbeat (off by 2.2%), or make the heartbeat 61.3 BPM [calc]. That's the whole case for 64. It's a design and story advantage, not a sound-quality one.

### 1.4 Precedent
1. C4 = 256 Hz (C2 = 64 Hz) is "scientific", "philosophical" or "Sauveur" pitch. Joseph Sauveur proposed it in 1713. It was revived by Herschel and Hullah in the 19th century, and Verdi mentioned it, but it was never adopted by orchestras. It's still used in physics texts because every C is a power of two, all the way down to 1 Hz. A4 = 430.54 Hz, 37.63 cents below A440. Source: https://en.wikipedia.org/wiki/Scientific_pitch (citing Maor 2002; Allen & Moore 1916; Haynes 2002).
2. **Caution:** since 1988 the LaRouche-linked Schiller Institute has promoted it as "Verdi tuning" alongside 432 Hz and esoteric claims (same source). So present the choice as "the heartbeat and the om are the same vibration", never as healing or a "natural" tuning. This fits the existing respect rules in PHILOSOPHY_SOURCES.md.

## 2. Computationally (AudioWorklet, 44.1/48 kHz)

Verdict: **neutral in practice**, with two small conveniences. None of it should drive the decision.

1. **Render quantum:** process() runs in blocks of 128 frames, and the spec may allow other sizes, so code must not assume 128. Source: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process . A 64 Hz cycle is 750 samples at 48 kHz, or 5.86 blocks, so it doesn't line up with blocks anyway [calc]. Events are scheduled at a sample offset inside a block either way. Neutral.
2. **Integer samples per cycle:** 48000/64 = 750 exactly, but 44100/64 = 689.06 and 48000/65.41 = 733.87 [calc]. Oscillators use fractional phase increments, so non-integer periods cost nothing. Neutral.
3. **Integer samples per beat come from the tempo, not the pitch:** 60 BPM is 48,000 or 44,100 samples per beat at either rate, and 90 BPM and 120 BPM are also whole numbers at both rates [calc]. So sample-exact beats are true with or without 64 Hz. Neutral as far as the pitch choice goes.
4. **Phase alignment of beat and tone (small plus for 64):** 64 whole om cycles fit in each beat. That gives every beat the same oscillator phase, and every whole-Hz JI partial (§1.3) also restarts each second. So a 1-second loop of the drone or bed is seamless with no click, and a visualizer can draw a waveform that stands still on the beat [calc]. Not audible by itself, but tidy for loops and for the music/visualizer-first engine.
5. **Exact phase from a counter (small plus for 64 at 48 kHz):** phase = (n mod 750)/750 is exact integer math [calc]. In general, computing phase from a float64 sample counter (exact up to 2^53 samples, about 5,950 years at 48 kHz [calc]) and wrapping it avoids long-session drift at any frequency. JS numbers are float64. Only the Float32 output buffers are 32-bit. Drift is a coding-practice issue, not a frequency issue. Neutral.
6. **Wavetables:** tables are power-of-two sizes read with fractional increments and band-limited per octave. The base frequency doesn't matter. Neutral.
7. **Device sample rate:** if 750-sample exactness were ever wanted, the AudioContext can request 48 kHz, but the browser may resample if the hardware differs. Not needed. Uncertain per device, not tested.

## 3. Options in player terms

| Option | What the player gets | Cost |
|---|---|---|
| **A. Keep 64 Hz (recommended)** | The heartbeat really is the om slowed down: tempos and notes are the same ratios. Sounds identical to standard inside the game. | ~38 cents off a normally tuned real instrument played alongside. |
| B. Standard 65.41 Hz | Matches pianos, guitars and 440 samples. | The heartbeat–om link becomes approximate (2.2% off), or the heartbeat becomes 61.3 BPM. |
| C. Hybrid: 64 Hz internally + optional "standard tuning" toggle | Story coherence by default, play-along when wanted. | One multiplier (×1.02197) on all pitches in that mode [calc]. The heartbeat stays 60 BPM, so the link is approximate only in that mode. Build only if play-along/mic/samples are approved. |

## 4. Uncertainty
1. Phone-speaker bass figures here are informal. Modern phones vary. Worth checking on Wilbow's phone (Q283) by ear, with harmonic-rich vs pure om tones, when building resumes.
2. How strongly players hear missing fundamentals varies between people (sources above).
3. Nothing was tested in code. The computational points are reasoning plus arithmetic.
