'use strict';
// Creature instruments (v0.3): every genome is a point in a continuous timbre space, rendered by pooled voices on the audio thread.
// Excitation (pluck / strike / scrape / bow / blow / voiced pulse) x resonator (waveguide string, inverted waveguide tube/reed,
// modal bar/bell/membrane bank, FM operator pair, formant pair) blended by genes; then a state-variable filter (lp/bp/hp morph,
// cutoff, resonance, filter envelope, filter LFO), saturation, ADSR amp envelope with curve, pitch envelope (drop/swoop), vibrato,
// tremolo, detuned unison and stereo width. Self-contained factory: stringified into the AudioWorklet, also runs offline (tests).
(function (G) { const RS = G.RS = G.RS || {};
function InstFactory(SR, FX) {
  // GB: the world's own recent sound (mono, 2 s), the granular engine's source; written by feed() from the final mix
  const GBN = SR * 2, GB = new Float32Array(GBN); let gbw = 0, gbE = 0; const feed = (L, R, n) => { for (let i = 0; i < n; i++) { const v = (L[i] + R[i]) * .5; GB[gbw] = v; gbw = (gbw + 1) % GBN; gbE += (v * v - gbE) * .0005; } };
  const blep = (t, dt) => t < dt ? (t /= dt, t + t - t * t - 1) : t > 1 - dt ? (t = (t - 1) / dt, t * t + t + t + 1) : 0;
  const NI = 14, TAU = Math.PI * 2, TL = 4096, SIN = new Float32Array(TL + 1); for (let i = 0; i <= TL; i++) SIN[i] = Math.sin(TAU * i / TL);
  const sn = p => { p -= Math.floor(p); const x = p * TL, i = x | 0; return SIN[i] + (SIN[i + 1] - SIN[i]) * (x - i); };   // phase in cycles
  let ns = 77; const noise = () => { ns = (ns * 1664525 + 1013904223) >>> 0; return ns / 2147483648 - 1; };
  const DLN = Math.ceil(SR / 25) + 4, V = []; let stolen = 0;
  for (let i = 0; i < NI; i++) V.push({ on: 0, id: 0, dl: new Float32Array(DLN), dw: 0, lp: 0, P: null, t: 0, f: 220, rel: 0, relT: 0, envA: 0, envF: 0, ph: 0, ph2: 0, mph: 0, lfo: 0, s1: 0, s2: 0, m: [0, 0, 0, 0, 0, 0, 0, 0], nz: 0, f1a: 0, f1b: 0, f2a: 0, f2b: 0, gain: .1, pl: .7, pr: .7, send: .3, fade: 1, fading: 0, next: null, relLvl: 0, p2: 0, p3: 0, p4: 0, fbS: 0, lpg: 0, gr: [{ a: 0, l: 1, p: 0, r: 1, on: 0 }, { a: 0, l: 1, p: 0, r: 1, on: 0 }], gT: 0, fx: -1, glide: 1, wtS: 0 });
  function setup(v, n) { const P = n.P; v.on = 1; v.id = n.id; v.P = P; v.t = 0; v.f = n.f; v.dur = Math.max(.02, n.dur || .3) * SR; v.rel = 0; v.envA = 0; v.envF = 0; v.ph = 0; v.ph2 = .25; v.mph = 0; v.lfo = (n.id * .137) % 1; v.s1 = v.s2 = 0; v.lp = 0; v.nz = 0; v.fade = 1; v.fading = 0; v.relLvl = 0; v.p2 = v.p3 = v.p4 = 0; v.fbS = 0; v.lpg = 0; v.gT = 0; v.gr[0].on = v.gr[1].on = 0; v.fx = n.fx == null ? -1 : n.fx; v.glide = n.from > 20 && P.glT ? n.from / n.f : 1;
    v.dl.fill(0); v.dw = 0; for (let k = 0; k < 8; k++) v.m[k] = 0; v.f1a = v.f1b = v.f2a = v.f2b = 0; v.vel = n.vel == null ? .8 : n.vel; v.gain = (n.gain == null ? .12 : n.gain) * (.35 + .65 * v.vel);
    { const u0 = Math.max(0, Math.min(1, v.vel)), u = P.velB != null ? .6 + (u0 - .6) * P.velB : u0; v.cutM = Math.pow(2, 1.7 * (u - .6)); v.ixM = .55 + .75 * u; v.wtO = .25 * (u - .6); v.tiltM = 1.35 - .6 * u; v.pdM = .6 + .65 * u; v.foldM = .5 + .85 * u; v.ringAM = Math.max(0, Math.min(1, P.ringAM * (1.25 - .5 * u))); v.grM = .4 + 1.3 * u; v.abM = .6 + .9 * u; v.satM = .75 + .5 * u; v.modM = .6 + .8 * u; }   /* v0.8b3 Q173a: a harder hit is BRIGHTER on every engine, not just louder (per-note constants: no per-sample cost) */
    const pan = Math.max(-1, Math.min(1, n.pan || 0)); v.pl = Math.cos((pan + 1) * Math.PI / 4); v.pr = Math.sin((pan + 1) * Math.PI / 4); v.send = n.send == null ? .3 : n.send;
    // modal bank coefficients (ratios blend harmonic -> bar/bell -> membrane by genes; set once per note)
    const R = P.ratios; v.mc = []; for (let k = 0; k < 4; k++) { const fr = Math.min(n.f * R[k], SR * .45), r = Math.exp(-1 / (Math.max(.02, P.mdec * (1 - k * .18)) * SR)); v.mc.push({ c: 2 * r * Math.cos(TAU * fr / SR), r2: r * r, g: (1 - r) * (k ? .55 / k * v.modM : 1) }); }
    // excitation burst for plucks/strikes into the waveguide
    const L = Math.max(2, Math.min(DLN - 2, SR / (n.f * (P.tube > P.str ? 2 : 1)))); v.L = L; let lpN = 0; const ab = Math.min(1, P.noiseLP * v.abM); for (let i = 0; i < Math.min(DLN, Math.ceil(L)); i++) { lpN += (noise() - lpN) * ab; v.dl[i] = (P.pluck * lpN + P.strike * (i < L * .5 ? Math.sin(Math.PI * i / (L * .5)) : 0)) * .9; } v.dw = Math.ceil(L) % DLN; }
  function note(n) { let free = null; for (const v of V) if (!v.on && !v.next) { free = v; break; } if (!free) { let best = null, be = 1e9; for (const v of V) { if (v.fading) continue; const e = v.envA * (v.rel ? .3 : 1); if (e < be) { be = e; best = v; } } if (!best) return false; best.fading = 1 / (SR * .05); best.next = n; stolen++; return true; } setup(free, n); return true; }
  function msg(d) { if (d.t === 'inst') note(d); else if (d.t === 'instOff') { for (const v of V) if (v.on && v.id === d.id && !v.rel) v.dur = v.t; } }
  function render(L, R, wet, n) { let act = 0;
    for (const v of V) { if (!v.on) { if (v.next) { const nn = v.next; v.next = null; setup(v, nn); } else continue; } act++; const P = v.P, dl = v.dl;
      const aT = P.att * SR, dT = P.dec * SR, rT = P.rel * SR, sus = P.sus, cu = P.curve, fdT = P.fdec * SR, lfoInc = P.lfoR / SR, g = v.gain, fb = P.fb * (P.tube > P.str ? -1 : 1), damp = P.damp;
      const wDL = P.str + P.tube, wM = P.modal, wO = P.osc, wF = P.form, bowE = P.bow, blowE = P.blow, scrE = P.scrape, vocE = P.voc, nAmt = P.noise, ab = Math.min(1, P.noiseLP * v.abM);
      const phys = P.phys == null ? 1 : P.phys, eng = P.eng || [], nres = P.nres || 0, trem = P.trem || 0, tPer = trem > .12 && v.dur > SR * 2 / P.techRate ? Math.round(SR / P.techRate) : 0, glK = P.glT ? Math.exp(-1 / (P.glT * SR)) : 0, FXB = v.fx >= 0 && FX ? FX.bus(v.fx) : null;
      let ph = v.ph, ph2 = v.ph2, mph = v.mph, lfo = v.lfo, s1 = v.s1, s2 = v.s2, lp = v.lp, nz = v.nz, envA = v.envA, fade = v.fade;
      for (let i = 0; i < n; i++) { const t = v.t++;
        // envelopes (amp ADSR with curve; filter AD)
        if (!v.rel && t >= v.dur) { v.rel = 1; v.relT = t; v.relLvl = envA; }
        if (v.rel) { const u = (t - v.relT) / rT; envA = u >= 1 ? 0 : v.relLvl * Math.pow(1 - u, cu); }
        else if (t < aT) envA = Math.pow(t / aT, 1 / cu); else if (t < aT + dT) envA = 1 - (1 - sus) * Math.pow((t - aT) / dT, 1 / cu); else envA = sus;
        const envF = Math.exp(-t / fdT); lfo += lfoInc; const lf = sn(lfo);
        if (v.glide !== 1) { v.glide = 1 + (v.glide - 1) * glK; if (Math.abs(v.glide - 1) < 1e-4) v.glide = 1; }
        const pe = Math.pow(2, P.penv * Math.exp(-t / (P.ptime * SR)) + P.lfoP * lf / 12) * v.glide, f = v.f * pe;
        const tu = tPer ? (t % tPer) : t, tk = tPer ? .45 + .55 * Math.exp(-tu / tPer * 4) : 1;   /* tremolo picking / rolls: re-articulate at the technique rate */
        // exciters (continuous ones follow the amp envelope)
        nz += (noise() - nz) * ab; const cont = envA * (bowE * ((ph % 1) * 2 - 1) * .5 + blowE * nz * 1.4 + scrE * nz * (noise() > .6 ? 2 : .3)) + vocE * envA * (Math.pow(sn(ph), 9) * .8) + (tPer && tu < 48 && t > tPer ? (P.pluck + P.strike) * noise() * .9 : 0);
        // waveguide (string: +feedback; tube/reed: inverted feedback + reed nonlinearity)
        let wg = 0; if (wDL > .02) { const Lc = v.L / pe, rp = v.dw - Lc + DLN * 2, i0 = Math.floor(rp) % DLN, fr = rp - Math.floor(rp), x = dl[i0] + (dl[(i0 + 1) % DLN] - dl[i0]) * fr; lp += (x - lp) * damp; let y = lp * fb + cont * .25; if (fb < 0) y = Math.tanh(y * 1.6) * .8; dl[v.dw] = y; v.dw = (v.dw + 1) % DLN; wg = x; }
        // modal bank (bar/bell/membrane), driven by the exciters + the initial strike
        let md = 0; if (wM * phys > .02 || nres > .02) { const ex = cont + (tu < 64 ? (P.strike + P.pluck) * (1 - tu / 64) * (tu & 1 ? 1 : -1) : 0) + nres * nz * envA * 1.6; for (let k = 0; k < 4; k++) { const m = v.mc[k], y = m.c * v.m[k] - m.r2 * v.m[k + 4] + ex * m.g; v.m[k + 4] = v.m[k]; v.m[k] = y; md += y; } md *= 2.5; }
        // FM operator pair (+ detuned unison), and its formant-filtered version
        ph += f / SR; ph2 += f * P.det / SR; mph += f * P.fmR / SR; const ix = P.fmI * (.25 + .75 * (P.fmEnvK ? envF : 1));
        const o1 = sn(ph + ix * sn(mph) / TAU * 1.0), o2 = P.uni > 0 ? sn(ph2 + ix * sn(mph * 1.003) / TAU) : 0; const osc = o1 + o2 * P.uni;
        let fm = 0; if (wF > .02) { const src = osc + nz * .4 + vocE * Math.pow(sn(ph), 9); const a1 = P.F1k, a2 = P.F2k; v.f1a += a1 * (src - v.f1a - v.f1b * 1.6); v.f1b += a1 * v.f1a; v.f2a += a2 * (src - v.f2a - v.f2b * 1.3); v.f2b += a2 * v.f2a; fm = (v.f1a * 1.2 + v.f2a * .8); }
        let x = phys * (wDL * wg * 1.6 + wM * md + wO * osc * .55 + wF * fm) + nAmt * nz * envA * 1.5 + nres * md * .8;
        // ---- synth engines (at most two per voice, chosen + weighted by genes) ----
        for (let e = 0; e < eng.length; e++) { const E = eng[e], ew = E[1]; let y = 0; const fr = ph - Math.floor(ph), dt = f / SR;
          switch (E[0]) {
            case 0: { /* virtual analog: saw <-> PWM pulse (polyBLEP) */ const pw = .5 - P.pwm * .42 * (.6 + .4 * lf); const saw = 2 * fr - 1 - blep(fr, dt); let fq = fr + (1 - pw); fq -= Math.floor(fq); const pu = (fr < pw ? 1 : -1) + blep(fr, dt) - blep(fq, dt); y = saw * (1 - P.vaShape) + pu * P.vaShape; break; }
            case 1: { /* FM 2-4 operators: op3 (self-feedback) -> op2 -> carrier, op4 parallel */ const ix = P.fmIx * v.ixM * (.3 + .7 * envF); v.p2 += f * P.fmR / SR; let m2 = 0; if (P.fmOps > 2) { v.p3 += f * P.fmR2 / SR; const o3 = sn(v.p3 + P.fmFb * v.fbS); v.fbS = o3; m2 = o3 * ix * .5; } const o2 = sn(v.p2 + m2 / TAU * 2); let m1 = o2 * ix; if (P.fmOps > 3) { v.p4 += f * (P.fmR2 * .5 + .5) * 1.002 / SR; m1 += sn(v.p4) * ix * .4; } y = sn(ph + m1 / TAU * 2); break; }
            case 2: { /* wavetable morph sine -> tri -> saw -> square -> formant, scanned by the env + LFO */ const pos = Math.max(0, Math.min(3.999, (P.wtPos + v.wtO + P.wtScan * (envF - .5) + P.wtScan * .25 * lf) * 4)), k0 = pos | 0, u = pos - k0; const sh = k => k === 0 ? sn(fr) : k === 1 ? 1 - 4 * Math.abs(fr - .5) : k === 2 ? 2 * fr - 1 - blep(fr, dt) : k === 3 ? (fr < .5 ? 1 : -1) : sn(fr * 3.02) * (1 - fr); y = sh(k0) * (1 - u) + sh(k0 + 1) * u; break; }
            case 3: { /* additive: 8 partials, spectral tilt (opens with the env) + inharmonic spread */ const tl = P.addTilt * v.tiltM * (1.2 - .7 * envF); for (let k = 1; k <= 8; k++) { const kr = k * (1 + P.addSpread * (k - 1) * .045); if (f * kr > SR * .45) break; y += sn(ph * kr) * Math.pow(k, -tl); } y *= .55; break; }
            case 4: { /* phase distortion (CZ): warped phase cosine, resonant with depth */ const d = .5 - Math.min(1, P.pdAmt * v.pdM) * .46 * (.35 + .65 * envF), w = fr < d ? .5 * fr / d : .5 + .5 * (fr - d) / (1 - d); y = -sn(w + .25); break; }
            case 5: { /* west coast: wavefolder into a low-pass gate (vactrol-ish: brightness + level follow the env) */ const b0 = sn(fr) * .8 + (1 - 4 * Math.abs(fr - .5)) * .2, xf = b0 * (1 + P.fold * v.foldM * 7 * (.25 + .75 * envF)); const fo = sn(xf * .25); v.lpg += (fo - v.lpg) * (.015 + .85 * Math.pow(envA, P.lpg)); y = v.lpg; break; }
            case 6: { /* ring / AM against an (often inharmonic) modulator */ const mo = sn(ph * P.ringR + .1); const cc = sn(fr); y = cc * (v.ringAM * (.5 + .5 * mo) + (1 - v.ringAM) * mo); break; }
            case 7: { /* granular: grains of the world's own recent sound, pitched to the note */ const gl = P.granSize * SR; if (--v.gT <= 0) { const g2 = v.gr[v.gr[0].a >= v.gr[0].l ? 0 : 1]; g2.on = 1; g2.a = 0; g2.l = gl; g2.r = Math.max(.25, Math.min(4, f / 261.6)); g2.p = (gbw - SR * (.05 + Math.abs(noise()) * 1.4) - gl * g2.r + GBN * 4) % GBN; v.gT = gl / (1 + P.granDens * 5); }
              for (const g2 of v.gr) { if (!g2.on || g2.a >= g2.l) continue; const pp = (g2.p + g2.a * g2.r) % GBN, i0 = pp | 0, s0 = GB[i0] + (GB[(i0 + 1) % GBN] - GB[i0]) * (pp - i0); y += s0 * (.5 - .5 * sn(g2.a / g2.l + .25)) * 6; g2.a++; }
              const lvl = Math.sqrt(gbE); y = y / Math.max(.02, lvl * 6) * .5 * Math.min(1, lvl * 40) + sn(fr) * .22 * (1 - Math.min(1, lvl * 40)) + sn(fr * 2.01) * .08 * v.grM + sn(fr * 3.02) * .05 * (v.grM - .4); break; }   /* silent world -> a soft tone instead of nothing */
          }
          x += y * ew * .9; }
        x *= tk;
        // SVF (Chamberlin, 2x oversampled) with lp/bp/hp morph, filter envelope + LFO
        const fc = Math.min(SR * .2, P.cut * v.cutM * Math.pow(2, P.fenv * envF + P.lfoF * lf)), F = 2 * Math.sin(Math.PI * fc / (SR * 2)), q = P.q;
        for (let os = 0; os < 2; os++) { const hp = x - s1 - q * s2; s2 += F * hp; s1 += F * s2; v.hp = hp; }
        const lpo = s1, bpo = s2, hpo = v.hp, ft = P.ftype; let y = ft < .5 ? lpo * (1 - ft * 2) + bpo * ft * 2 : bpo * (2 - ft * 2) + hpo * (ft * 2 - 1);
        if (P.sat > .02) y = Math.tanh(y * (1 + P.sat * v.satM * 5)) / (1 + P.sat * 1.5);
        y *= envA * g * (1 - P.lfoA * (.5 + .5 * lf));
        if (v.fading) { fade -= v.fading; if (fade < 0) fade = 0; } y *= fade;
        const w = P.width * (o2 * P.uni * .3); if (FXB) { FXB.L[i] += y * v.pl + w * envA * g; FXB.R[i] += y * v.pr - w * envA * g; } else { L[i] += y * v.pl + w * envA * g; R[i] += y * v.pr - w * envA * g; wet[i] += y * v.send; } }
      v.ph = ph % 1e3; v.ph2 = ph2 % 1e3; v.mph = mph % 1e3; v.lfo = lfo % 1e3; v.s1 = s1; v.s2 = s2; v.lp = lp; v.nz = nz; v.envA = envA; v.fade = fade;
      if (fade <= 0 || (v.rel && envA < 1e-4) || !isFinite(s1)) { v.on = 0; v.fading = 0; }
    } return act; }
  return { render, msg, feed, stats: () => ({ act: V.filter(v => v.on).length, stolen }), NI };
}
RS.InstFactory = InstFactory;
// ---- main thread: genes -> instrument parameters (all continuous) ----
const tri = (x, pos, w) => pos.map(p => Math.max(0, 1 - Math.abs(x - p) * w));
const norm = a => { const s = a.reduce((p, q) => p + q, 0) || 1; return a.map(v => v / s); };
const EXC = ['pluck', 'strike', 'scrape', 'bow', 'blow', 'voc'], RES = ['str', 'modal', 'membrane', 'tube', 'form'];
RS.Inst = {
  EXC, RES,
  fromGenome: g => { const I = RS.IG, q = k => { const v = g[I[k]]; return v == null || isNaN(v) ? .5 : Math.max(0, Math.min(.9999, v)); }, ex = norm(tri(q('exc'), [0, .2, .4, .6, .8, 1], 4.5)), rs = norm(tri(q('res'), [0, .25, .5, .75, 1], 3.6));
    const P = {}; EXC.forEach((k, i) => P[k] = ex[i]); P.str = rs[0]; const bar = rs[1], mem = rs[2]; P.tube = rs[3]; P.form = rs[4]; P.modal = bar + mem;
    const ih = q('inharm'); const H = [1, 2, 3, 4], B = [1, 2.756, 5.404, 8.933], M2 = [1, 1.594, 2.136, 2.296]; P.ratios = H.map((h, k) => { const bb = h + (B[k] - h) * ih, w = P.modal ? mem / P.modal : 0; return bb * (1 - w) + M2[k] * w; });
    P.fmI = Math.pow(q('fmI'), 2) * 5; P.fmR = [.5, 1, 1, 2, 2, 3, 4, 5, 7][Math.floor(q('fmR') * 8.99)] * (1 + ih * .07); P.fmEnvK = q('fmI') > .5 ? 1 : 0;
    P.osc = Math.min(1, .15 + P.fmI * .15 + P.voc * .5 + (P.form ? .1 : 0));
    P.noise = Math.pow(q('noise'), 2) * .6; P.noiseLP = .05 + Math.pow(q('noiseCol'), 1.5) * .9;
    const percussive = P.pluck + P.strike; P.att = .001 * Math.pow(1000, q('att')) * (1 - .9 * percussive) + .0015; P.dec = .05 + Math.pow(q('dec'), 1.5) * 2.4; P.sus = q('sus') * (1 - .8 * percussive); P.rel = .03 + Math.pow(q('rel'), 1.6) * 2.5; P.curve = Math.pow(2, (q('curve') - .5) * 3);
    P.ftype = q('ftype') < .55 ? q('ftype') * .5 : q('ftype'); P.cut = 180 * Math.pow(60, q('cut')); P.q = 2 - 1.85 * Math.pow(q('reso'), 1.3); P.fenv = (q('fenv') - .3) * 4; P.fdec = .02 + Math.pow(q('fdec'), 1.5) * 1.4;
    P.penv = (q('penv') - .5) * 1.2 * Math.abs(q('penv') - .5) * 2; P.ptime = .005 + Math.pow(q('ptime'), 2) * .4;
    P.lfoR = .3 + Math.pow(q('lfoR'), 1.4) * 8; P.lfoP = Math.pow(q('lfoP'), 1.5) * .6; P.lfoF = Math.pow(q('lfoF'), 2) * 1.2; P.lfoA = Math.pow(q('lfoA'), 2) * .55;
    P.det = Math.pow(2, Math.pow(q('detune'), 2) * 25 / 1200); P.uni = q('detune') > .35 ? .7 : 0; if (g.sec > 0) { const s = Math.min(5, g.sec); P.uni = Math.min(1, .55 + .09 * s); P.det = Math.max(P.det, Math.pow(2, (7 + 3 * s) / 1200)); P.att += .003 * s; P.sec = s; }   /* v0.8b2 R7.10: a section = unison copies inside the ohm's one voice (no extra voices) */ P.sat = Math.pow(q('sat'), 2); P.width = q('width');
    const fs = .7 + q('formant') * .8, F1 = 500 * fs, F2 = 1500 * fs; P.F1k = Math.min(.9, 2 * Math.sin(Math.PI * F1 / 96000)); P.F2k = Math.min(.9, 2 * Math.sin(Math.PI * F2 / 96000)); P.F1 = F1; P.F2 = F2;
    P.mdec = .15 + Math.pow(q('dec'), 1.2) * 2.5 * (1 - mem * .6); P.fb = .95 + .045 * (1 - q('cut') * .3) * (P.bow + P.blow > .3 ? .99 : 1); P.fb = Math.min(.996, P.fb + q('dec') * .04); P.damp = .25 + .7 * q('cut');
    P.complexity = q('complexity');
    // ---- percussiveness (continuous): blend toward physical drum models. bodyRes: wood -> membrane -> metal shell -> bell; pitched: noise/unpitched -> tuned (marimba/kalimba)
    const pk = RS.clamp((q('perc') - .45) / .35, 0, 1), k = pk * pk * (3 - 2 * pk); P.percK = k; P.perc = q('perc'); P.pitched = q('pitched'); P.transient = q('transient'); P.bodyRes = q('bodyRes');
    if (k > 0) { const br = q('bodyRes'), pt = q('pitched'), tr = q('transient'), L = (a2, b2) => a2 + (b2 - a2) * k, mixR = (A, B, u) => A.map((v, i) => v + (B[i] - v) * u);
      const WOOD = [1, 2.76, 5.4, 8.93], MEMB = [1, 1.594, 2.136, 2.296], METAL = [1, 1.483, 1.932, 2.546], BELL = [1, 1.2, 1.5, 2.0], MARIMBA = [1, 3.99, 10.65, 4.0], TABLA = [1, 2, 3, 4];
      let R2 = br < .33 ? mixR(WOOD, MEMB, br / .33) : br < .66 ? mixR(MEMB, METAL, (br - .33) / .33) : mixR(METAL, BELL, (br - .66) / .34); R2 = mixR(R2, br < .5 ? MARIMBA : TABLA, Math.max(0, pt - .6) / .4 * .8);
      P.ratios = mixR(P.ratios, R2, k);
      for (const e of EXC) P[e] = L(P[e], e === 'strike' ? .85 : e === 'scrape' ? (1 - pt) * .15 : 0); P.str = L(P.str, 0); P.tube = L(P.tube, 0); P.form = L(P.form, 0); P.modal = L(P.modal, 1); P.osc = L(P.osc, pt > .7 ? .2 : .05);
      const dec = br < .33 ? .05 + br * .6 : br < .66 ? .25 + (br - .33) * 1.5 : .7 + (br - .66) * 7; P.mdec = L(P.mdec, dec * (.6 + .8 * q('dec'))); P.dec = L(P.dec, dec * .8); P.sus = L(P.sus, 0); P.att = L(P.att, .0008); P.rel = L(P.rel, .04 + dec * .3);
      P.noise = L(P.noise, (1 - pt) * .55 + tr * .1); P.noiseLP = L(P.noiseLP, .2 + q('noiseCol') * .75); P.penv = L(P.penv, br > .2 && br < .55 ? -(.4 + (1 - pt) * .5) : 0); P.ptime = L(P.ptime, .012 + (1 - tr) * .05);
      P.cut = L(P.cut, 1500 + 9000 * (tr * .6 + (1 - pt) * .4)); P.ftype = L(P.ftype, pt < .3 && br > .5 ? .85 : .1); P.q = L(P.q, 1.2); P.lfoP = L(P.lfoP, 0); P.lfoA = L(P.lfoA, 0); P.fenv = L(P.fenv, 1 + tr * 2); P.fdec = L(P.fdec, .03 + (1 - tr) * .1); P.uni = L(P.uni, 0); }
    // ---- v0.3.2 DRUM TYPES: a drummer (perc > .7) is ONE drum voice, read from its genes; each type has its own synthesis character and the
    // remaining genes (dec, noiseCol, cut, sat, inharm) vary voices inside a type
    if (q('perc') > .7) { const dt = RS.Inst.drumType(g || null, P), dg = q('dec'), nc = q('noiseCol'), cu = q('cut'), tr = q('transient'); P.drum = dt;
      if (dt === 'kick') { P.ratios = [1, 1.47 + q('inharm') * .3, 2.1, 2.9]; P.modal = 1; P.penv = -(.55 + .35 * (1 - tr)); P.ptime = .025 + .05 * dg; P.noise = .04 + .08 * nc; P.noiseLP = .2; P.cut = 700 + 1600 * cu; P.ftype = .1; P.mdec = .16 + .34 * dg; P.dec = P.mdec * .8; P.rel = .05; P.drumF = 42 + 34 * cu; P.osc = Math.max(P.osc || 0, .25 + .3 * q('sat')); P.clickK = tr; }
      else if (dt === 'snare') { P.ratios = [1, 1.594, 2.136, 2.296]; P.modal = 1; P.clap = nc < .3; P.noise = P.clap ? .95 : .55 + .35 * nc; P.noiseLP = .45 + .5 * nc; P.cut = 3500 + 6500 * cu; P.ftype = P.clap ? .5 : .1; P.mdec = (P.clap ? .03 : .07) + .14 * dg; P.dec = P.mdec; P.rel = .04 + .1 * dg; P.penv = -.12; P.ptime = .02; P.drumF = 150 + 140 * q('inharm'); P.osc = .05; }
      else if (dt === 'hat') { P.ratios = [1, 1.483, 1.932, 2.546].map((x, i) => x * (1 + i * q('inharm') * .07)); P.modal = 1; P.shaker = nc < .35; P.noise = P.shaker ? .97 : .82; P.noiseLP = .7 + .3 * nc; P.cut = 6500 + 6000 * cu; P.ftype = .85; P.mdec = .025 + .07 * dg; P.dec = P.mdec; P.rel = .03; P.att = P.shaker ? .006 : .0008; P.penv = 0; P.drumF = 420 + 380 * q('inharm'); P.osc = 0; }
      else if (dt === 'tom') { const wood = q('bodyRes') < .3; P.wood = wood; P.ratios = wood ? [1, 2.76, 5.4, 8.93] : [1, 1.594, 2.136, 2.296]; P.modal = 1; P.noise = wood ? .05 : .1 + .15 * nc; P.cut = 1800 + 5000 * cu; P.ftype = .1; P.mdec = wood ? .06 + .1 * dg : .18 + .35 * dg; P.dec = P.mdec * .8; P.penv = wood ? 0 : -(.15 + .2 * (1 - tr)); P.ptime = .04; P.osc = .15; } }
    // ---- synth engines (12:29 steer): sparse gene-weighted blend of at most 2 engines + the physical models; technique genes
    { const E = RS.ENGINES || [], ws = E.map((e, i) => [i, q(e)]).filter(w => w[1] > .3 && E[w[0]] !== 'eNRES').sort((a2, b2) => b2[1] - a2[1]).slice(0, 2), nr = q('eNRES') > .3 ? q('eNRES') : 0;
      let phys = ws.length || nr ? q('engMix') : 1; phys = Math.max(phys, k * .75); if ((ws.length || nr) && k < .5) phys = Math.min(phys, .07);   /* v0.3.1: the chosen engine IS the sound source (>= ~85 %), the physical body is only colour (drummers stay physical) */
      if (ws.length > 1) ws[1][1] = Math.min(ws[1][1], ws[0][1] * .35);   /* a second engine only colours the first */ const tot = ws.reduce((a2, w) => a2 + w[1], 0) + nr, rest = 1 - phys, EG = { eGRAN: 1.6, eRING: 1.1, eNRES: 1.2 };
      P.eng = ws.map(w => [w[0], rest * w[1] / (tot || 1) * (1.15 - k * .5) * (EG[E[w[0]]] || 1)]); P.nres = rest * nr / (tot || 1) * 1.3; P.phys = phys;
      P.vaShape = q('pwm') > .35 ? Math.min(1, (q('pwm') - .35) * 2.5) : 0; P.pwm = q('pwm');
      P.fmOps = 2 + Math.floor(q('fmOps') * 2.99); P.fmIx = .5 + Math.pow(q('fmI'), 1.3) * 6; P.fmFb = Math.pow(q('fmFb'), 1.5) * .9; P.fmR2 = [.5, 1, 1.414, 2, 3, 3.5, 5, 7.1][Math.floor(q('fmR2') * 7.99)];
      P.wtPos = q('wtPos'); P.wtScan = (q('wtScan') - .3) * 1.4; P.addTilt = .4 + q('addTilt') * 2.2; P.addSpread = Math.pow(q('addSpread'), 2) * 1.8; P.pdAmt = q('pdAmt');
      P.fold = q('fold'); P.lpg = .3 + q('lpg') * 2.5; P.ringR = [.5, 1.5, 2.01, 2.76, 3.3, 4.2, 5.4, 7.1][Math.floor(q('ringR') * 7.99)]; P.ringAM = q('ringR') * 3 % 1;
      P.granDens = q('granDens'); P.granSize = .02 + Math.pow(q('granSize'), 1.4) * .16;
      P.trem = q('trem') > .55 ? (q('trem') - .55) / .45 : 0; P.techRate = 6 + q('techRate') * 12; P.glT = q('gliss') > .3 ? .02 + (q('gliss') - .3) * .5 : 0; P.droneK = q('drone');
      if (ws.length) { const top = E[ws[0][0]]; P.engName = top; } else P.engName = nr ? 'eNRES' : 'phys';
      /* engines with sustained tone need some sustain to be heard when the physical model was percussive */ if (rest > .4 && P.sus < .25 && !k) P.sus = .25 + P.sus; }
    if (g && g.dk && g.dk.length && RS.Drums && q('perc') > .7) RS.Drums.attach(P, g);   // v0.8 drums: a drummer born with its own drum set (drums.js); old saves have no g.dk and keep the gene drum above
    return P; },
  // instrument identity for distinctness: the engine family that makes the sound ('tract' = sings through the vocal tract, 'perc' = drummer)
  identity: (P, g) => (g && g[168] >= .5 && (P.percK || 0) < .5) ? 'tract' : (P.percK || 0) > .5 ? 'perc' + (P.dk && P.dk.length ? ':' + P.dk[0].h : P.drum ? ':' + P.drum : '') : P.engName === 'phys' ? 'phys:' + RS.Inst.physFam(P) : P.engName,
  // v0.3.2: physical-model voices are told apart by what excites them (pluck / strike / bow / blow...) on which body
  physFam: P => { const ex = ['pluck', 'strike', 'scrape', 'bow', 'blow', 'voc'], rs = ['str', 'modal', 'membrane', 'tube', 'form']; let e = ex[0], r = rs[0]; for (const k of ex) if ((P[k] || 0) > (P[e] || 0)) e = k; for (const k of rs) if ((P[k] || 0) > (P[r] || 0)) r = k; return e + '-' + r; },
  // v0.3.2 drum type from the percussion genes (perc, bodyRes, pitched, transient); only meaningful for drummers (perc > .7)
  drumType: (g, P) => { const I = RS.IG, v = k => g ? g[I[k]] : P[k]; if ((g ? g[I.perc] : P.perc) <= .7) return null; const br = v('bodyRes'), pt = v('pitched'), tr = v('transient');
    return br >= .72 && pt < .6 ? 'hat' : pt >= .6 ? 'tom' : tr >= .68 ? 'snare' : tr < .22 ? 'kit' : 'kick'; },
  // v0.3.2 texture-capable voices: long, slow, sustained (beds, wind, shimmer, drones, moving pads)
  isTex: P => !P.drum && (P.percK || 0) < .3 && ((P.droneK || 0) > .78 || ((P.att || 0) > .05 && (P.sus || 0) > .7 && (P.rel || 0) > 1.2)),
  // a percussive creature's KIT: different strokes from its body (strike point / area / force), like a hand drummer
  STROKES: ['bass', 'tone', 'slap', 'ghost', 'mute', 'ring'],
  stroke: (P, kind) => { P._kit = P._kit || {}; if (P._kit[kind]) return P._kit[kind]; const Q = Object.assign({}, P); Q.ratios = P.ratios.slice(); const k = P.percK || 0;
    if (kind === 'bass') { Q.cut *= .5; Q.noise *= .4; Q.penv = Math.min(P.penv, -.3 * k) ; Q.mdec *= 1.2; Q.fstr = .5; }   // centre: deep, pitch drop
    else if (kind === 'tone') { Q.ratios = Q.ratios.map((r, i) => i ? r * 1.05 : r); Q.cut *= 1.4; Q.noise *= .6; }   // edge: brighter partials
    else if (kind === 'slap') { Q.noise = Math.min(.9, Q.noise + .45); Q.mdec *= .35; Q.dec *= .4; Q.cut *= 2; Q.fenv += 1.5; }   // snappy noise body (snare-like)
    else if (kind === 'ghost') { Q.mdec *= .5; Q.dec *= .5; Q.noise *= .7; Q.cut *= .8; Q.ghost = 1; }
    else if (kind === 'mute') { Q.mdec *= .22; Q.dec *= .25; Q.rel = .03; }   // damped (hats closed / dead stroke)
    else if (kind === 'ring') { Q.mdec *= 2.2; Q.dec *= 2; Q.penv = .12 * k; Q.ptime = .25; Q.rel *= 2; }   // tabla-like syahi ring with a bend up
    return P._kit[kind] = Q; },
  // the look follows the sound: hue per resonator family, lightness from brightness, saturation from purity, spikes from a percussive attack
  look: P => { const wl = P.str * 600 + (P.modal) * 575 + P.tube * 520 + P.form * 450; return { wl: RS.clamp(wl / Math.max(.01, P.str + P.modal + P.tube + P.form), 420, 680), light: RS.clamp(.35 + Math.log(P.cut / 180) / Math.log(60) * .6, .3, 1), sat: RS.clamp(1 - P.noise * 1.3, .3, 1), spiky: P.pluck + P.strike, soft: P.bow + P.blow + P.voc }; },
  // a note message for the worklet
  msg: (P, f, dur, vel, o = {}) => ({ t: 'inst', id: o.id || 0, P, f, dur, vel, gain: o.gain, pan: o.pan, send: o.send, fx: o.fx == null ? -1 : o.fx, from: o.from || 0 }),
  // offline render (tests, descriptors)
  render: (P, f = 220, dur = .5, secs = 1.2, SR = 48000, vel = .9) => { const D = InstFactory(SR), n = Math.round(secs * SR), L = new Float32Array(n), R = new Float32Array(n), W = new Float32Array(n); D.msg({ t: 'inst', id: 1, P, f, dur, vel, gain: .3 }); for (let i = 0; i < n; i += 128) { const m = Math.min(128, n - i); const l = L.subarray(i, i + m), r = R.subarray(i, i + m), w = W.subarray(i, i + m); D.render(l, r, w, m); } return L; },
};
})(typeof window !== 'undefined' ? window : globalThis);
