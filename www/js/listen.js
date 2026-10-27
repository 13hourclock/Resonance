'use strict';
// Spoken words -> a creature. Hold a finger on a creature: it listens (ear ripple, leans toward you). Recognition: Android's
// on-device recognizer via @capacitor-community/speech-recognition (RECORD_AUDIO asked by the OS on first use), else the
// Web Speech API. In parallel the mic is pitch-tracked (autocorrelation) for the intonation + rhythm of the first echo.
// No recogniser / offline: the creature still mimics the syllable SHAPES from the audio (count, rhythm, pitch, vowel colour).
// Headless tests inject RS.Listen.mock = { text, samples, SR }.
(function (G) {
const RS = G.RS;
const LI = { active: null, mock: null, stats: { sessions: 0, recognised: 0, shapes: 0, deaf: 0 } };
// ---- analysis (pure): samples -> frames {t, hz, rms, zcr, cent}
LI.frameAt = (x, s, Wn, SR) => { let e = 0, z = 0; for (let i = s; i < s + Wn; i++) { e += x[i] * x[i]; if (i > s && (x[i] >= 0) !== (x[i - 1] >= 0)) z++; } const rms = Math.sqrt(e / Wn);
  let hz = 0; if (rms > .01) { let best = 0, lag = 0; const lo = Math.round(SR / 500), hi = Math.round(SR / 70); for (let L = lo; L <= hi; L++) { let c = 0; for (let i = s; i < s + Wn - L; i += 2) c += x[i] * x[i + L]; if (c > best) { best = c; lag = L; } } if (best > e * .3 / 2) hz = SR / lag; }
  return { t: s / SR, hz, rms, zcr: z / Wn * SR }; };
LI.track = (x, SR, hop = .01) => { const H = Math.round(SR * hop), Wn = Math.round(SR * .03), fr = [];
  for (let s = 0; s + Wn < x.length; s += H) fr.push(LI.frameAt(x, s, Wn, SR)); return fr; };
/* micfix (Wilbow 6:24 PM MDT: "audio dropouts with the mic control"): the live mic is analysed AS IT ARRIVES, decimated to ~12 kHz, a few
   10 ms frames per 43 ms buffer (~0.3 ms of main-thread work each). 0.8b1 ran LI.track over up to 8 s of 48 kHz audio in one go 0.7 s after
   release (~190 ms on a desktop, ~1 s on a phone): the main loop and the note scheduler stalled = gaps in the music. */
LI.tracker = SRin => { const D = Math.max(1, Math.round(SRin / 12000)), SR = SRin / D, H = Math.round(SR * .01), Wn = Math.round(SR * .03), MAX = Math.round(SR * 8);
  let y = new Float32Array(SR * 2 | 0), n = 0, pos = 0, acc = 0, k = 0, lp = 0; const fr = [];
  return { SR, frames: fr, push(chunk) { for (let i = 0; i < chunk.length; i++) { lp += (chunk[i] - lp) * .45; acc += lp; if (++k === D) { if (n < MAX) { if (n === y.length) { const z = new Float32Array(Math.min(MAX, y.length * 2)); z.set(y); y = z; } y[n++] = acc / D; } acc = 0; k = 0; } }
      while (pos + Wn < n) { fr.push(LI.frameAt(y, pos, Wn, SR)); pos += H; } },
    samples() { return y.subarray(0, n); } }; };
// syllables from the energy envelope: peaks separated by dips
LI.segment = fr => { if (!fr.length) return []; const mx = Math.max(...fr.map(f => f.rms)) || 1, th = mx * .18, out = []; let cur = null;
  for (const f of fr) { const on = f.rms > th; if (on && !cur) cur = { t0: f.t, fr: [] }; if (cur) { cur.fr.push(f); if (!on || (cur.fr.length > 6 && f.rms < Math.max(...cur.fr.map(q => q.rms)) * .45)) { if (cur.fr.length >= 4) out.push(cur); cur = on ? { t0: f.t, fr: [f] } : null; } } }
  if (cur && cur.fr.length >= 4) out.push(cur);
  return out.map(s => { const v = s.fr.filter(f => f.hz > 0), hz = v.length ? v.map(f => f.hz).sort((a, b) => a - b)[v.length >> 1] : 0, zc = s.fr.slice(0, 3).reduce((a, f) => a + f.zcr, 0) / 3, zv = s.fr.reduce((a, f) => a + f.zcr, 0) / s.fr.length;
    return { t0: s.t0, dur: s.fr.length * .01, hz, onsetNoise: zc > 3000, bright: zv }; }); };
// contour for the echo: semitones relative to the median pitch + durations
LI.contour = segs => { const hz = segs.map(s => s.hz).filter(h => h > 0).sort((a, b) => a - b), med = hz[hz.length >> 1] || 0; return segs.map(s => ({ st: s.hz && med ? 12 * Math.log2(s.hz / med) : 0, dur: s.dur })); };
// LPC formants (F1, F2) of a stretch of audio
LI.formants = (sig, SR) => { const D = Math.max(1, Math.round(SR / 10000)), fs = SR / D, y = []; let lp = 0; for (let i = 0; i < sig.length; i++) { lp += (sig[i] - lp) * .35; if (i % D === 0) y.push(lp); } const n = y.length; if (n < 64) return [];
  const x = new Float64Array(n); for (let i = 1; i < n; i++) x[i] = (y[i] - .94 * y[i - 1]) * (.54 - .46 * Math.cos(2 * Math.PI * i / (n - 1))); const p = 12, r = new Float64Array(p + 1); for (let k = 0; k <= p; k++) { let s2 = 0; for (let i = k; i < n; i++) s2 += x[i] * x[i - k]; r[k] = s2; } r[0] *= 1.0001;
  const a = new Float64Array(p + 1); a[0] = 1; let e = r[0] || 1e-9; for (let i = 1; i <= p; i++) { let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j]; const k = -acc / e, t = a.slice(); for (let j = 1; j < i; j++) a[j] = t[j] + k * t[i - j]; a[i] = k; e *= 1 - k * k; }
  const env = []; for (let f = 150; f < 3600; f += 20) { const w = 2 * Math.PI * f / fs; let re = 0, im = 0; for (let k = 0; k <= p; k++) { re += a[k] * Math.cos(w * k); im -= a[k] * Math.sin(w * k); } env.push([f, -Math.log(re * re + im * im)]); }
  const pk = []; for (let i = 1; i < env.length - 1; i++) if (env[i][1] > env[i - 1][1] && env[i][1] >= env[i + 1][1]) pk.push(env[i][0]); return pk; };
// syllable shapes when no words were recognised: vowel = nearest in (F1, F2) to the vowel targets, onset noise -> a fricative onset
const VREF = { AA: [760, 1150], IY: [260, 2600], UW: [320, 750], EH: [480, 1850], AO: [600, 900], IH: [380, 2050], AE: [620, 1800] };
LI.shapes = (segs, x, SR) => segs.map(s => { let nu = 'AA'; if (x) { const a = Math.round((s.t0 + s.dur * .35) * SR), b = Math.min(Math.round((s.t0 + s.dur * .85) * SR), a + Math.round(SR * .25)), f = LI.formants(x.subarray(a, b), SR); if (f.length >= 2) { let bd = 1e9; for (const k in VREF) { const d = Math.pow(Math.log(f[0] / VREF[k][0]), 2) + Math.pow(Math.log(f[1] / VREF[k][1]), 2); if (d < bd) { bd = d; nu = k; } } } }
  return { on: s.onsetNoise ? ['S'] : ['M'], nu, co: [] }; });
// apply a finished listening session to the creature
LI.apply = (Sf, c, text, samples, SR, frames) => { const C = RS.Creature; if (!c || c.dead) return null; if (c.P.sense.deaf) { LI.stats.deaf++; Sf.fx({ k: 'deafRipple', c, t: Sf.now(), dur: 1 }); return { k: 'deaf' }; }
  const segs = frames ? LI.segment(frames) : samples ? LI.segment(LI.track(samples, SR)) : [], ct = LI.contour(segs); let learned = [];
  if (text && text.trim()) { LI.stats.recognised++; const words = text.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 4); let k = 0;
    for (const w of words) { const n = RS.Vocal.text(w).length; if (C.learnWord(Sf, c, w, { src: 'voice', contour: ct.length ? ct.slice(k, k + n) : null })) learned.push(w); k += n; } }
  else if (segs.length) { LI.stats.shapes++; const ph = LI.shapes(segs, samples, SR); if (C.learnWord(Sf, c, null, { src: 'voice', ph, contour: ct })) learned.push(c.words[c.words.length - 1].w); }
  { let t = Sf.now() + .3; for (const w of c.words || []) if (!w.echoed && learned.includes(w.w)) t = C.echoWord(Sf, c, w, t) + .08; }   // one phrase: your words, your intonation
  Sf.fx({ k: 'absorb', c, t: Sf.now(), dur: 1.2, col: c.col }); return { k: learned.length ? 'learned' : 'nothing', words: learned, syllables: segs.length }; };
// ---- live session (device): recogniser + mic pitch tracking
/* v0.8b micfix (Wilbow 6:18 PM MDT Oct 23 2026, 0.8b1: after holding an ohm to listen, the game's sound never came back). Causes fixed here:
   (1) the mic was opened with echoCancellation on: Android's WebView then switches the phone into voice-call mode (MODE_IN_COMMUNICATION,
       call routing / call volume) and the game's output could stay there; now all voice processing is off (plain mic, MODE_NORMAL);
   (2) cleanups registered after an await were lost if the finger lifted first (permission prompt mid-hold): the recogniser could start
       AFTER release and keep the mic / audio focus; now every late resource is stopped at once if the session already ended;
   (3) nothing brought the output back: release / cancel / error / app hidden now always stop the mic, restore the native audio mode,
       resume the context and fade the sound back in (~0.3 s). The short dip WHILE listening is wanted (Wilbow 6:22 PM) and is explicit. */
LI.MIC = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 };
LI.SKIP = .4;
const MIC_SRC = `class RsMic extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0;}process(i,o){const x=i[0]&&i[0][0];if(x){for(let k=0;k<x.length;k++){this.b[this.n++]=x[k];if(this.n===2048){this.port.postMessage(this.b.slice());this.n=0;}}}return true;}}registerProcessor('rs-mic',RsMic);`;
LI.micNode = async ac => { if (!ac.audioWorklet || typeof AudioWorkletNode === 'undefined') return null; if (!ac.__rsMic) ac.__rsMic = ac.audioWorklet.addModule('data:application/javascript;base64,' + btoa(MIC_SRC)); await ac.__rsMic; return new AudioWorkletNode(ac, 'rs-mic', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }); };   // s of mic audio dropped at the start: the ohm's own chirp
LI.start = (Sf, c) => { if (LI.active) return false; LI.stats.sessions++; const s = LI.active = { c, Sf, t0: Sf.now(), w0: Date.now(), text: '', buf: [], SR: 48000, stop: [], ended: false }; c.listenT = Sf.now();
  s.own = f => { if (s.ended) { try { f(); } catch (e) { } } else s.stop.push(f); };   // a resource acquired after release is let go at once
  if (c.P.sense.deaf) { Sf.fx({ k: 'deafRipple', c, t: Sf.now(), dur: 1 }); return true; }
  const A = RS.audio; if (A && A.duck) A.duck(true, 'listen');
  if (LI.mock) return true;
  const Cap = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.SpeechRecognition;
  const web = G.SpeechRecognition || G.webkitSpeechRecognition;
  (async () => { try { if (Cap) { const av = await Cap.available(); if (!s.ended && av && av.available) { try { await Cap.requestPermissions(); } catch (e) { }
          if (!s.ended && Cap.addListener) { const h = await Cap.addListener('partialResults', d => { if (d && d.matches && d.matches[0]) s.text = d.matches[0]; }); s.own(() => h.remove()); }
          if (!s.ended) { Cap.start({ language: 'en-US', maxResults: 1, partialResults: true, popup: false }).then(r => { if (r && r.matches && r.matches[0]) s.text = r.matches[0]; }).catch(() => { }); s.own(() => Cap.stop().catch(() => { })); s.rec = 'native'; } } }
      if (!s.ended && !s.rec && web) { const r = new web(); r.lang = 'en-US'; r.interimResults = true; r.onresult = e => { s.text = [...e.results].map(x => x[0].transcript).join(' '); }; r.onerror = () => { }; r.start(); s.own(() => r.stop()); s.rec = 'web'; } } catch (e) { s.err = String(e); }
    // pitch contour from the mic (may be refused while the native recogniser holds it: then shapes come from the recogniser text alone)
    try { const A = RS.audio; if (!s.ended && A && A.ctx && G.navigator && navigator.mediaDevices) { const st = await navigator.mediaDevices.getUserMedia({ audio: LI.MIC }); s.stream = st; s.own(() => st.getTracks().forEach(t => t.stop())); if (s.ended) return;
        const ac = A.ctx, src = ac.createMediaStreamSource(st), mute = ac.createGain(); mute.gain.value = 0; s.SR = ac.sampleRate; const tk = s.tk = LI.tracker(ac.sampleRate);
        const take = ch => { if (s.ended || Date.now() - s.w0 < LI.SKIP * 1000) return; tk.push(ch); };
        let node = null; try { node = await LI.micNode(ac); } catch (e) { node = null; } if (s.ended) return;
        if (node) { node.port.onmessage = e => take(e.data); s.cap = 'worklet'; }   // capture on the audio thread, no main-thread dependency
        else { node = ac.createScriptProcessor(2048, 1, 1); node.onaudioprocess = e => take(e.inputBuffer.getChannelData(0)); s.cap = 'script'; }
        LI.lastCap = s.cap; src.connect(node); node.connect(mute); mute.connect(ac.destination);
        s.own(() => { try { src.disconnect(); node.disconnect(); mute.disconnect(); } catch (e) { } if (node.port) node.port.onmessage = null; else node.onaudioprocess = null; }); } } catch (e) { s.micErr = String(e); } })();
  return true; };
// sound back after any end of listening (release, cancel, error, hidden): restore the native audio mode, resume the context, fade in
LI.restore = why => { const A = RS.audio; try { const N = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.AudioMode; if (N && N.restore) N.restore().then(r => { LI.lastNative = r; }).catch(() => { }); } catch (e) { }
  if (A) { if (A.heal) A.heal('listen:' + why); if (A.duck && A.ducked) A.duck(false, why); } };
LI.end = (Sf, cb) => { const s = LI.active; if (!s) return null; LI.active = null; s.ended = true; s.c.listenT = null; Sf = Sf || s.Sf; for (const f of s.stop) try { f(); } catch (e) { } s.stop = [];
  LI.restore('end');
  const finish = () => { let r = null; try { let text = s.text, samples = null, SR = s.SR; if (LI.mock) { text = LI.mock.text; samples = LI.mock.samples || null; SR = LI.mock.SR || SR; }
      let frames = null; if (!LI.mock && s.tk && s.tk.frames.length) { frames = s.tk.frames; samples = s.tk.samples(); SR = s.tk.SR; }
      r = LI.apply(Sf, s.c, text, samples, SR, frames); } catch (e) { LI.err = String(e); }
    LI.restore('late');   // again once the recogniser has really let go of the mic / audio focus
    if (cb) cb(r); return r; };
  if (LI.mock) return finish(); setTimeout(finish, 700); return 'pending'; };   // the recogniser delivers its final result shortly after stop
// the app going to the background ends a session (the mic is never kept open behind the player's back)
if (G.document && G.document.addEventListener) G.document.addEventListener('visibilitychange', () => { if (G.document.hidden && LI.active) LI.end(null); });
RS.Listen = LI;
})(typeof window !== 'undefined' ? window : globalThis);
