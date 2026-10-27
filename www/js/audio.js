'use strict';
// Audio engine: ONE AudioWorkletNode running a fixed pool of modal voices + shared FDN reverb + gentle limiter + real-time monitor.
// No per-note node chains. The same DSP class runs in a ScriptProcessor fallback. Module is loaded from a data: URL (blob URLs can fail in WebView).
(function (G) {
const RS = G.RS;
// ---------------- DSP (runs on the audio thread; must be self-contained) ----------------
function DSPFactory(SR, TF, IF, XF) {
  const TR = TF ? TF(SR) : null, FXI = XF ? XF(SR) : null, IN = IF ? IF(SR, FXI) : null;   /* + effect-item inserts (fx.js) */   // + pooled creature instrument voices (inst.js)   // pooled articulatory tract voices (tract.js)
  const NV = 32, NM = 8, TAU = Math.PI * 2;
  const V = []; for (let i = 0; i < NV; i++) V.push({ on: 0, id: 0, body: 0, re: new Float32Array(NM), im: new Float32Array(NM), cr: new Float32Array(NM), ci: new Float32Array(NM), g: new Float32Array(NM), nm: 0,
    env: 0, att: 0, fade: 1, fading: 0, next: null, pl: .5, pr: .5, send: .3, click: 0, clickD: 0, lp: 0, glide: 1, vib: 0, vibR: 0, vibP: 0, freq: new Float32Array(NM), dec: new Float32Array(NM), age: 0, level: 0, damp: 1, prio: 1 });
  // FDN reverb, lengths scaled to the sample rate
  const DL = [1557, 1617, 1491, 1422].map(n => Math.round(n * SR / 44100)), dl = DL.map(n => new Float32Array(n)), dp = [0, 0, 0, 0], lpz = [0, 0, 0, 0];
  const pre = new Float32Array(Math.round(.021 * SR)); let pp = 0;
  let wetB = new Float32Array(128); const o = [0, 0, 0, 0];
  let env = 0, gr = 1, frames = 0, peak = 0, mon = 0, ns = 12345, revFb = .78, master = .8;
  const noise = () => { ns = (ns * 1664525 + 1013904223) >>> 0; return ns / 2147483648 - 1; };
  function setup(v, n) { v.on = 1; v.id = n.id; v.body = n.body || 0; v.nm = Math.min(NM, n.modes.length); v.age = 0; v.fade = 1; v.fading = 0; v.damp = 1; v.prio = n.prio || 1;
    const pan = Math.max(-1, Math.min(1, n.pan || 0)); v.pl = Math.cos((pan + 1) * Math.PI / 4); v.pr = Math.sin((pan + 1) * Math.PI / 4); v.send = n.send == null ? .3 : n.send;
    v.att = Math.max(1, (n.att || .002) * SR); v.env = 0; v.glide = n.glide ? Math.pow(n.glide, 1 / SR) : 1; v.vib = n.vib || 0; v.vibR = TAU * (n.vibR || 5) / SR; v.vibP = 0;
    v.click = (n.click || 0) * (n.gain || 1); v.clickD = Math.exp(-1 / (.004 * SR)); v.lp = 0; v.level = n.gain || 1;
    for (let k = 0; k < v.nm; k++) { const m = n.modes[k], f = Math.min(m.f, SR * .45); v.freq[k] = f; v.dec[k] = Math.exp(-1 / (Math.max(.01, m.d) * SR)); const w = TAU * f / SR; v.cr[k] = Math.cos(w) * v.dec[k]; v.ci[k] = Math.sin(w) * v.dec[k]; v.re[k] = 0; v.im[k] = 0; v.g[k] = (m.a || 0) * (n.gain || 1); }
    for (let k = v.nm; k < NM; k++) v.g[k] = 0;
    // excite: initial phasor amplitude
    for (let k = 0; k < v.nm; k++) { v.re[k] = 0; v.im[k] = 0; v.re[k] = v.g[k]; } }
  function energy(v) { let e = 0; for (let k = 0; k < v.nm; k++) e += v.re[k] * v.re[k] + v.im[k] * v.im[k]; return e * v.fade * v.fade; }
  function note(n) { let free = null; for (const v of V) if (!v.on && !v.next) { free = v; break; }
    if (!free) { // steal: prefer quiet tails (lowest energy / priority), fade 60-120 ms
      let best = null, be = 1e9; for (const v of V) { if (v.fading) continue; const e = energy(v) * v.prio; if (e < be) { be = e; best = v; } }
      if (!best) { for (const v of V) if (v.fading && !v.next) { best = v; break; } } if (!best) return false; best.fading = 1 / (SR * (.06 + .06 * Math.min(1, be * 10))); best.next = n; stolen++; return true; }
    setup(free, n); return true; }
  let stolen = 0;
  function msg(d) { if (d.t === 'note') note(d); else if (d.t === 'inst' || d.t === 'instOff') { if (IN) IN.msg(d); } else if (d.t === 'fx') { if (FXI) FXI.msg(d); } else if (d.t === 'tract') { if (TR) TR.msg(d); } else if (d.t === 'damp') { for (const v of V) if (v.on && v.body === d.body) { const f = d.f; for (let k = 0; k < v.nm; k++) { const dd = Math.exp(-1 / (Math.max(.005, d.tau) * SR)); if (dd < v.dec[k]) { const s = dd / v.dec[k]; v.dec[k] = dd; v.cr[k] *= s; v.ci[k] *= s; } } } }
    else if (d.t === 'retune') { for (const v of V) if (v.on && v.body === d.body) for (let k = 0; k < v.nm; k++) { const f = Math.min(v.freq[k] * d.r, SR * .45); v.freq[k] = f; const w = TAU * f / SR; v.cr[k] = Math.cos(w) * v.dec[k]; v.ci[k] = Math.sin(w) * v.dec[k]; } }
    else if (d.t === 'all') { for (const v of V) if (v.on) v.fading = 1 / (SR * .1); }
    else if (d.t === 'master') { master = d.v; } }
  function render(L, R, n) {
    for (let i = 0; i < n; i++) { L[i] = 0; R[i] = 0; }
    if (wetB.length < n) wetB = new Float32Array(n); const wet = wetB; wet.fill(0, 0, n); let act = 0;
    for (const v of V) { if (!v.on) { if (v.next) { const nn = v.next; v.next = null; setup(v, nn); } else continue; } act++;
      const nm = v.nm, re = v.re, im = v.im, cr = v.cr, ci = v.ci; let e = v.env; const ai = 1 / v.att; let fade = v.fade; let click = v.click, lp = v.lp; const pl = v.pl, pr = v.pr, sd = v.send;
      const gl = v.glide !== 1, vb = v.vib > 0;
      for (let i = 0; i < n; i++) { let s = 0;
        if (gl || vb) { let m = 1; if (gl) { for (let k = 0; k < nm; k++) v.freq[k] *= v.glide; } if (vb) { v.vibP += v.vibR; m = 1 + v.vib * Math.sin(v.vibP); }
          if ((i & 15) === 0) for (let k = 0; k < nm; k++) { const w = TAU * Math.min(v.freq[k] * m, SR * .45) / SR, dd = v.dec[k]; cr[k] = Math.cos(w) * dd; ci[k] = Math.sin(w) * dd; } }
        for (let k = 0; k < nm; k++) { const a = re[k], b = im[k]; re[k] = a * cr[k] - b * ci[k]; im[k] = a * ci[k] + b * cr[k]; s += im[k]; }
        if (e < 1) { e += ai; if (e > 1) e = 1; }
        if (click > 1e-5) { lp += (noise() * click - lp) * .35; s += lp; click *= v.clickD; }
        if (v.fading) { fade -= v.fading; if (fade <= 0) { fade = 0; } }
        s *= e * fade; L[i] += s * pl; R[i] += s * pr; wet[i] += s * sd; }
      v.env = e; v.fade = fade; v.click = click; v.lp = lp; v.age += n;
      if (fade <= 0 || ((v.age & 1023) < n && energy(v) < 1e-9 && click < 1e-6 && e >= 1)) { v.on = 0; v.fading = 0; }
    }
    if (TR) act += TR.render(L, R, wet, n); if (IN) act += IN.render(L, R, wet, n); if (FXI) act += FXI.render(L, R, wet, n); if (IN && IN.feed) IN.feed(L, R, n);
    // reverb (pre-delay -> 4-line FDN with Householder mix, damped)
    for (let i = 0; i < n; i++) { const x = pre[pp]; pre[pp] = wet[i]; pp = (pp + 1) % pre.length;
      for (let j = 0; j < 4; j++) { o[j] = dl[j][dp[j]]; lpz[j] += (o[j] - lpz[j]) * .45; o[j] = lpz[j]; }
      const sum = (o[0] + o[1] + o[2] + o[3]) * .5;
      for (let j = 0; j < 4; j++) { dl[j][dp[j]] = (o[j] - sum) * revFb + x * .35; dp[j] = (dp[j] + 1) % DL[j]; }
      L[i] += (o[0] + o[2]) * .5; R[i] += (o[1] + o[3]) * .5; }
    // gentle limiter: fast attack, slow (~0.4 s) release, soft clip
    const rel = Math.exp(-1 / (.4 * SR));
    for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * master; env = a > env ? a : env * rel + a * (1 - rel); const tg = env > .7 ? .7 / env : 1; gr = tg < gr ? tg : gr + (tg - gr) * .0005;
      let l = L[i] * master * gr, r = R[i] * master * gr; l = Math.tanh(l * 1.1) / 1.1; r = Math.tanh(r * 1.1) / 1.1; L[i] = l; R[i] = r; const pk = Math.abs(l) > Math.abs(r) ? Math.abs(l) : Math.abs(r); if (pk > peak) peak = pk; }
    frames += n; return act; }
  return { render, msg, stats: () => { const s = { frames, peak, gr, act: V.filter(v => v.on).length, stolen, tract: TR ? TR.stats().act : 0, inst: IN ? IN.stats().act : 0, instStolen: IN ? IN.stats().stolen : 0 }; peak = 0; return s; }, NV, NM, TR };
}
const TF_SRC = RS.TractFactory ? RS.TractFactory.toString() : 'null';
const IF_SRC = RS.InstFactory ? RS.InstFactory.toString() : 'null', XF_SRC = RS.FXFactory ? RS.FXFactory.toString() : 'null';
const WORKLET_SRC = `const TractFactory=${TF_SRC};const InstFactory=${IF_SRC};const FXFactory=${XF_SRC};const DSPFactory=${DSPFactory.toString()};
class ResonanceProc extends AudioWorkletProcessor{constructor(){super();this.d=DSPFactory(sampleRate,TractFactory,InstFactory,FXFactory);this.n=0;this.lastAct=0;this.port.onmessage=e=>{const m=e.data;if(Array.isArray(m))for(const x of m)this.d.msg(x);else this.d.msg(m);};}
process(i,o){const out=o[0];const L=out[0],R=out[1]||out[0];this.lastAct=this.d.render(L,R,L.length);if(++this.n%96===0){const s=this.d.stats();s.ct=currentTime;this.port.postMessage(s);}return true;}}
registerProcessor('resonance-proc',ResonanceProc);`;
// ---------------- main-thread engine ----------------
const A = RS.audio = { ctx: null, node: null, ready: false, mode: null, q: [], stats: { notes: 0, sent: 0 }, mon: [], nextId: 1, err: null };
A.init = async () => {
  if (A.ctx) { if (A.ctx.state !== 'running') try { await A.ctx.resume(); } catch (e) { } return; }
  await A.build(null);
};
/* v0.8b micfix (Wilbow 6:18/6:22 PM MDT Oct 23 2026: "tried to get one of them to listen to my mic and the audio stopped coming out" /
   "its good that it cuts for a second while they listen but it should return after release"). The context is built by A.build so a dead
   one (device error / closed) can be rebuilt with the clock kept continuous (t0 = the old game time). */
A.build = async (t0) => {
  const AC = G.AudioContext || G.webkitAudioContext; if (!AC) { A.err = 'no audio'; return; }
  let c; try { c = new AC({ latencyHint: 'balanced' }); } catch (e) { c = new AC(); }
  const tk = t0 == null ? A.now() : t0; A.ctx = c; A.off = tk - c.currentTime;   /* songsave: continuous with the page clock (incl. a restored / paused offset) */ A.out = c.createGain(); A.out.gain.value = A.ducked ? A.DUCK : 1; A.out.connect(c.destination); A._dest = null;
  A.watch(c);
  try { if (!c.audioWorklet) throw new Error('no worklet');
    const url = 'data:application/javascript;base64,' + btoa(unescape(encodeURIComponent(WORKLET_SRC)));
    await c.audioWorklet.addModule(url);
    A.node = new AudioWorkletNode(c, 'resonance-proc', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    A.node.port.onmessage = e => A.onStats(e.data); A.mode = 'worklet';
  } catch (e) { A.err = String(e);
    const d = DSPFactory(c.sampleRate, RS.TractFactory, RS.InstFactory, RS.FXFactory), sp = c.createScriptProcessor(1024, 0, 2); let n = 0;
    sp.onaudioprocess = ev => { const L = ev.outputBuffer.getChannelData(0), R = ev.outputBuffer.getChannelData(1); d.render(L, R, L.length); if (++n % 12 === 0) { const s = d.stats(); s.ct = c.currentTime; A.onStats(s); } };
    A.node = sp; A.dsp = d; A.mode = 'script'; }
  A.node.connect(A.out); A.ready = true; A.lastStatT = performance.now(); if (A.onRebuilt) { try { A.onRebuilt(t0 != null); } catch (e) { } }   /* songsave: a new / rebuilt renderer has no effect-item inserts (sends before the first touch were dropped): let the game resend them */
  if (A.hidT != null && G.document && G.document.hidden) { try { c.suspend(); } catch (e) { } } else { try { await c.resume(); } catch (e) { } }
};
// ---- keep the output alive (micfix). Stats: A.heals = { resume, rebuild, unduck, last }
A.DUCK = .06; A.DUCK_IN = .08; A.FADE_IN = .3; A.ducked = null; A.heals = { resume: 0, rebuild: 0, unduck: 0, last: null };
A.want = () => !(G.document && G.document.hidden);
A.watch = c => { c.onstatechange = () => { if (c !== A.ctx) return; A.lastState = c.state; if (c.state === 'closed') A.rebuild('closed'); else if (c.state !== 'running' && A.want()) A.heal('statechange:' + c.state); };
  try { c.addEventListener('error', () => { if (c === A.ctx) A.rebuild('error'); }); } catch (e) { } };   // Chromium fires 'error' when the output device dies (e.g. a routing change)
// resume a suspended / interrupted context, retrying a few times (Android may refuse while the recogniser still holds audio focus)
A.heal = (why, tries = 6) => { const c = A.ctx; if (!c) return null; A.heals.last = why; if (c.state === 'closed') { A.rebuild(why); return 'closed'; }
  if (c.state !== 'running') { A.heals.resume++; try { const pr = c.resume(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { }
    clearTimeout(A._healT); if (tries > 1) A._healT = setTimeout(() => { if (A.ctx === c && c.state !== 'running' && A.want()) A.heal(why, tries - 1); }, 150); }
  return c.state; };
A.rebuild = async why => { if (A._rebuilding || (A._rebuiltAt && performance.now() - A._rebuiltAt < 3000)) return; A._rebuilding = true; A.heals.rebuild++; A.heals.last = why;
  const old = A.ctx, t0 = old ? A.now() : null; A.ready = false; try { if (old && old.state !== 'closed') old.close(); } catch (e) { }
  try { await A.build(t0); } catch (e) { A.err = String(e); } A._rebuilding = false; A._rebuiltAt = performance.now(); };
// the deliberate dip while an ohm listens: quiet in ~80 ms, back with a soft ~0.3 s fade-in. Never left on (A.tick un-ducks if no session).
A.duck = (on, why) => { A.ducked = on ? (why || 'listen') : null; A.duckT = performance.now(); if (!on) A.heals.unduck++; const c = A.ctx; if (!c || !A.out) return;
  const g = A.out.gain, t = c.currentTime, to = on ? A.DUCK : 1; try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to, t + (on ? A.DUCK_IN : A.FADE_IN)); } catch (e) { g.value = to; } };
// watchdog (1 Hz): a stuck duck, a context that stopped running, or a renderer that stopped reporting while the app is visible
A.tick = () => { if (!A.ready || !A.ctx) return; const L = RS.Listen;
  if (A.ducked && !(L && L.active) && performance.now() - A.duckT > 1000) A.duck(false, 'stuck');
  if (!A.want()) return; if (A.ctx.state !== 'running') A.heal('watchdog');
  else if (A.lastStatT && performance.now() - A.lastStatT > 6000) { A.lastStatT = performance.now(); A.rebuild('stalled'); } };
/* v0.8b songsave (Wilbow 7:27 PM MDT Oct 23 2026: "When exiting the game the song didn't sound the same on return" / "Switched away" / "It should preserve it in both cases").
   The game clock (A.now) is the musical time of the world. It PAUSES while the app is in the background: on hide the time is noted (and the context suspended),
   on return the clock carries on from that moment, so every jam / ensemble / section timer, grid step and sky phase sees no gap - the song resumes as if paused.
   A frame gap with no hide event (an Android WebView that stopped drawing without telling us) is folded out the same way (A.skip from App.frame1). */
A.hidT = null; A.pauses = { n: 0, away: 0, gaps: 0, last: null };
A.setNow = t => { if (!Number.isFinite(t)) return; if (A.ctx) A.off = t - A.ctx.currentTime; else A.poff = t - performance.now() / 1000; };
A.pause = why => { if (A.hidT != null) return; A.hidT = A.now(); A.pauses.last = why; const c = A.ctx; if (c && c.state === 'running') { try { const pr = c.suspend(); if (pr && pr.catch) pr.catch(() => { }); } catch (e) { } } };
A.unpause = why => { if (A.hidT == null) return false; const away = A.now() - A.hidT; A.setNow(A.hidT); A.hidT = null; A.pauses.n++; A.pauses.away += Math.max(0, away); A.pauses.last = why; return true; };
A.skip = sec => { if (!(sec > 0) || A.hidT != null) return; A.setNow(A.now() - sec); A.pauses.gaps++; A.pauses.away += sec; };
if (G.setInterval && G.document) { G.setInterval(A.tick, 1000); G.document.addEventListener('visibilitychange', () => { if (G.document.hidden) A.pause('hidden'); else { A.unpause('visible'); A.heal('visible'); } });
  if (G.addEventListener) { G.addEventListener('pagehide', () => A.pause('pagehide')); G.addEventListener('pageshow', () => { if (!G.document.hidden) { A.unpause('pageshow'); A.heal('pageshow'); } }); }
  try { const CA = G.Capacitor && G.Capacitor.Plugins && G.Capacitor.Plugins.App; if (CA && CA.addListener) CA.addListener('appStateChange', s => { if (s && s.isActive === false) A.pause('appState'); else if (s && s.isActive) { A.unpause('appState'); A.heal('appState'); } }); } catch (e) { } }
A.onStats = s => { s.wall = performance.now(); A.lastStatT = s.wall; A.last = s; A.mon.push(s); if (A.mon.length > 200) A.mon.shift(); };
// rendered audio time vs wall time over the last ~window ms (1.0 = real time)
A.ratio = (win = 2000) => { const m = A.mon; if (m.length < 3) return null; const b = m[m.length - 1]; let a = null; for (let i = m.length - 2; i >= 0; i--) { a = m[i]; if (b.wall - m[i].wall >= win) break; } if (!a || b.wall === a.wall) return null; return ((b.frames - a.frames) / A.ctx.sampleRate) / ((b.wall - a.wall) / 1000); };
A.send = m => { if (!A.ready) return; A.stats.sent++; if (A.mode === 'worklet') A.node.port.postMessage(m); else if (Array.isArray(m)) m.forEach(x => A.dsp.msg(x)); else A.dsp.msg(m); };   // script fallback: batched sends were dropped
A.off = 0; A.poff = 0; A.now = () => A.ctx ? A.ctx.currentTime + A.off : performance.now() / 1000 + A.poff;   /* songsave: poff = the page clock's offset (a restored song's time before audio starts; pauses) */   /* v0.8a7 fix: the clock stays continuous when audio starts (was: jumped back to 0 at the first touch, so every timestamp was 'in the future') */
// scheduled notes: queued on the main thread, dispatched a little before their audio-clock time (lookahead), never per-note nodes
A.play = (spec, when) => { if (!A.ready) return 0; const n = { t: 'note', id: A.nextId++, modes: (spec.modes || []).slice(0, 8).map(m => ({ f: m.f, a: m.a, d: m.d })), gain: spec.gain, att: spec.att, vib: spec.vib, vibR: spec.vibR, glide: spec.glide, click: spec.click, send: spec.send, pan: spec.pan, body: spec.body, prio: spec.prio, lp: spec.lp }; A.stats.notes++;
  // a creature voice with a vocal-tract part: the tract sings the syllable on the gate-placed pitch; the formant voice keeps (1 - amt) of the level
  if (spec.tract && RS.Vocal) { const tm = RS.Vocal.message(spec, when); if (tm) { const k = 1 - spec.tract.amt * .9; for (const m of n.modes) m.a *= k; A.stats.tract = (A.stats.tract || 0) + 1; if (when && when > A.now() + .012) A.q.push({ when, n: tm }); else A.send(tm); if (A.onNote) A.onNote(tm); } }
  // v0.3 creature instrument: one pooled synth voice instead of a modal note (strokes/envelopes travel in spec.inst)
  if (spec.inst) { spec._id = n.id; const k = spec.tract ? 1 - spec.tract.amt * .9 : 1; const im = { t: 'inst', id: n.id, P: spec.inst, f: spec.f0 || (n.modes[0] && n.modes[0].f) || 220, dur: spec.dur || spec.len || .3, vel: spec.vel == null ? .8 : spec.vel, gain: (spec.gain || .1) * k, pan: spec.pan, send: spec.send, fx: spec.fx == null ? -1 : spec.fx, from: spec.from || 0 }; A.stats.inst = (A.stats.inst || 0) + 1; if (when && when > A.now() + .012) A.q.push({ when, n: im }); else A.send(im); if (A.onNote) A.onNote(im); return n.id; }
  if (spec.shapeVoice && spec.shapeVoice.P) { const L = spec.shapeVoice, im = { t: 'inst', id: A.nextId++, P: L.P, f: spec.f0 || (n.modes[0] && n.modes[0].f) || 220, dur: L.dur, vel: L.vel, gain: (spec.gain || .1) * L.share, pan: spec.pan, send: spec.send, fx: -1, from: 0 }; n.gain = (spec.gain || .1) * (1 - L.share); A.stats.inst = (A.stats.inst || 0) + 1; A.stats.layer = (A.stats.layer || 0) + 1; if (when && when > A.now() + .012) A.q.push({ when, n: im }); else A.send(im); }   // v0.8a5 P3: a drawn shape's own engine voice on top of its modal ring
  if (when && when > A.now() + .012) { A.q.push({ when, n }); } else A.send(n); if (A.onNote) A.onNote(n); return n.id; };
// songsave: notes already decided but not yet due (game time) go out with the song and come back with it, so a reopened song does not drop its next beat
A.qOut = () => A.q.filter(e => e.when >= A.now()).map(e => ({ when: e.when, n: e.n }));
A.qIn = l => { for (const e of l || []) if (e && e.n && e.when != null) { A.q.push(e); if (e.n.id >= A.nextId) A.nextId = e.n.id + 1; } };
A.pump = () => { if (!A.q.length) return; const t = A.now() + .03, due = [], keep = []; for (const e of A.q) (e.when <= t ? due : keep).push(e); A.q = keep; if (due.length) A.send(due.map(e => e.n)); };
A.damp = (body, tau) => A.send({ t: 'damp', body, tau });
A.retune = (body, r) => A.send({ t: 'retune', body, r });
// recording a performance: canvas video + the worklet's output (webm, mp4 fallback)
A.recDest = () => { if (!A.ctx) return null; if (!A._dest) { A._dest = A.ctx.createMediaStreamDestination(); A.out.connect(A._dest); } return A._dest; };
A.DSPFactory = DSPFactory;
})(typeof window !== 'undefined' ? window : globalThis);
