/* ====================================================================================================
 * audio/gunfire.js
 *
 * Sonido. Cada disparo se construye con tres partes (el chasquido de la boca, el cuerpo del estampido y un golpe grave) con
 * valores propios para cada arma, así una M16, una CAR-15, una SAW, un AK, una .50 y una pistola no suenan igual. Lo lejano suena
 * más apagado, más tarde y con más eco: cada sonido pasa por un paso bajo que se cierra con la distancia, se panea según dónde está en pantalla
 * y manda una parte a un eco pensado para una calle entre paredes. Los impactos se construyen según el material. Rotores, motores, ruedas y el
 * rebufo del rotor son bucles cuyo volumen y tono siguen a lo que hay cerca de la cámara.
 * Grabaciones reales: si junto a la página hay una carpeta 'sounds' con archivos con los nombres de SND_NAMES (todos .mp3, .ogg o .wav; variantes
 * como nombre_2, nombre_3), se cargan y se usan en lugar de los sonidos construidos.
 * ================================================================================================== */

'use strict';

let SND = null,
  SMP = {},
  sndTried = false,
  washLvl = 0;
const SND_NAMES = [
  'm16',
  'car15',
  'saw',
  'dmr',
  'ak47',
  'm2',
  'pistol',
  'whiz',
  'rpg_launch',
  'rpg_blast',
  'explosion',
  'collapse',
  'imp_wall',
  'imp_stone',
  'imp_sand',
  'imp_wood',
  'imp_glass',
  'imp_metal',
  'imp_soft',
  'ricochet',
  'casing',
  'rotor_bh',
  'rotor_lb',
  'wash',
  'truck',
  'tyres'
];
const GUNS = {
  // chasquido [Hz paso alto, nivel, s], cuerpo [Hz banda, Q, nivel, s], golpe [de Hz, a Hz, nivel, s], hasta dónde llega y el clac del mecanismo
  m16: { c: [5200, 0.9, 0.012], b: [1250, 0.9, 0.75, 0.11], t: [190, 70, 0.7, 0.09], r: 62 },
  car15: { c: [4600, 1, 0.014], b: [980, 0.8, 0.85, 0.13], t: [170, 60, 0.8, 0.1], r: 64 },
  saw: { c: [4800, 0.85, 0.012], b: [1050, 0.9, 0.8, 0.1], t: [175, 65, 0.75, 0.09], r: 64, mech: 0.22 },
  dmr: { c: [4200, 1, 0.016], b: [820, 0.8, 0.9, 0.16], t: [150, 50, 0.95, 0.13], r: 70 },
  ak47: { c: [3600, 0.85, 0.016], b: [640, 1.1, 0.95, 0.17], t: [125, 45, 1, 0.14], r: 66, mech: 0.16 },
  m2: { c: [2800, 1, 0.02], b: [380, 0.8, 1.2, 0.26], t: [90, 32, 1.4, 0.22], r: 86, mech: 0.28 },
  pistol: { c: [4000, 0.7, 0.01], b: [900, 1.2, 0.6, 0.075], t: [210, 90, 0.5, 0.06], r: 46 }
};
function sndInit() {
  const master = AC.createGain();
  master.gain.value = 0.9;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 5;
  comp.attack.value = 0.003;
  comp.release.value = 0.18;
  const gate = AC.createGain();
  gate.gain.value = 1;
  master.connect(gate);
  gate.connect(comp);
  comp.connect(AC.destination);
  const sr = AC.sampleRate,
    L = Math.floor(sr * 1.5),
    ir = AC.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < L; i++) {
      const t = i / sr;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.3) * (t < 0.015 ? t / 0.015 : 1) * 0.6;
    }
    for (const [tt, g] of [
      [0.085, 0.55],
      [0.16, 0.4],
      [0.3, 0.25],
      [0.47, 0.14]
    ]) {
      const k = Math.floor((tt + c * 0.011) * sr);
      for (let i = 0; i < 420; i++) d[k + i] += (Math.random() * 2 - 1) * g * (1 - i / 420);
    }
  } // rebota en las paredes de enfrente
  const rev = AC.createConvolver();
  rev.buffer = ir;
  const rg = AC.createGain();
  rg.gain.value = 0.55;
  rev.connect(rg);
  rg.connect(master);
  const nb = AC.createBuffer(1, sr * 2, sr),
    ch = nb.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  SND = { master, gate, rev, noise: nb, last: {}, ambT: 6, loops: {}, gOn: 1 };
  sndLoops();
  loadSamples();
}
const ar = (a, b) => a + Math.random() * (b - a),
  ai = n => Math.floor(Math.random() * n),
  ap = a => a[ai(a.length)];
const SB = {}; // clips decodificados: buf, sh (adelanto del decodificador), r (inicios de disparo), t (inicio de la cola), s (trozos), loop
let SB_LOOPS = 0;
const SFX_RAW = {};
const SFX_PROM = fetch('assets/audio/sfx.json')
  .then(r => (r.ok ? r.json() : null))
  .then(D => {
    if (!D) return null;
    for (const k in D) {
      SFX_RAW[k] = fetch('assets/audio/sfx/' + k + '.mp3')
        .then(r => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);
    }
    return D;
  })
  .catch(() => null);
function loadSamples() {
  if (sndTried || !AC) return;
  sndTried = true;
  SFX_PROM.then(D => {
    if (!D || !AC) return;
    const loopTotal = Object.keys(D).filter(q => D[q].loop).length;
    for (const k in D) {
      const e = D[k];
      SFX_RAW[k].then(ab => {
        if (!ab || !AC) return;
        const done = buf => {
          const ch = buf.getChannelData(0),
            sr = buf.sampleRate;
          let mx = 0;
          for (let i = 0; i < ch.length; i++) {
            const q = Math.abs(ch[i]);
            if (q > mx) mx = q;
          }
          const th = mx * (e.loop ? 0.003 : 0.02);
          let i0 = 0;
          while (i0 < ch.length - 1 && Math.abs(ch[i0]) < th) i0++;
          const z = i0 / sr,
            ref = e.loop ? 0 : e.r ? e.r[0] : 0.003;
          const sh = e.loop ? Math.min(z, 0.08) : clamp(z - ref, 0, 0.08);
          SB[k] = { buf, sh, d: e.d, r: e.r, t: e.t, s: e.s, loop: !!e.loop };
          if (e.loop && ++SB_LOOPS === loopTotal) sndLoops();
        };
        try {
          const pr = AC.decodeAudioData(ab.slice(0), done, () => {});
          if (pr && pr.catch) pr.catch(() => {});
        } catch (_) {}
      });
    }
  });
}
// un tramo [a, b) de un clip (segundos desde su inicio real) en dest en el instante 'at', con fundidos para que nada haga clic
function clipPart(k, dest, at, a, b, vol, rate, fi, fo) {
  const c = SB[k];
  if (!c) return 0;
  rate = rate || 1;
  a = Math.max(0, a) + c.sh;
  b = Math.min(b + c.sh, c.buf.duration);
  if (b <= a + 0.005) return 0;
  const src = AC.createBufferSource();
  src.buffer = c.buf;
  src.playbackRate.value = rate;
  const g = AC.createGain(),
    dur = (b - a) / rate;
  fi = Math.min(fi || 0.003, dur * 0.3);
  fo = Math.min(fo == null ? 0.02 : fo, dur * 0.6);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + fi);
  g.gain.setValueAtTime(vol, at + dur - fo);
  g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(g);
  g.connect(dest);
  src.start(at, a, dur + 0.01);
  src.stop(at + dur + 0.02);
  return dur;
}
// un clip entero, o uno de sus trozos, en un punto del mundo
function clipOne(k, g, vol, rate, out) {
  const c = SB[k];
  if (!c) return false;
  out = out || sndOut(g);
  if (c.s) {
    const q = c.s[ai(c.s.length)];
    clipPart(k, out, g.at, q[0], q[1], vol * g.vol, rate, 0.002, Math.min(0.12, (q[1] - q[0]) * 0.4));
  } else clipPart(k, out, g.at, 0, c.d, vol * g.vol, rate, 0.003, 0.05);
  return true;
}
/* Una ráfaga de n disparos sacada de una grabación de fuego automático: los disparos desde un punto al azar y luego, donde empezaría
   el siguiente, la propia cola de la grabación (la caída después de su último disparo), con fundido cruzado para que la ráfaga acabe natural */
function clipBurst(k, n, g, vol, rate, out) {
  const c = SB[k];
  if (!c || !c.r) return false;
  const R = c.r,
    N = R.length;
  n = Math.max(1, Math.min(n, N));
  rate = rate || 1;
  const i = Math.random() < 0.3 ? N - n : ai(Math.max(1, Math.floor((N - n) * 0.75) + 1));
  out = out || sndOut(g);
  const v = vol * g.vol;
  if (i + n >= N) {
    clipPart(k, out, g.at, R[i] - 0.004, c.d, v, rate, 0.002, 0.06);
    return true;
  }
  const bd = clipPart(k, out, g.at, R[i] - 0.004, R[i + n] - 0.004, v, rate, 0.002, 0.016);
  clipPart(k, out, g.at + bd - 0.016, c.t - 0.02, c.d, v, rate, 0.016, 0.06);
  return true;
}
const GUN_SB = {
  // qué grabación usa cada arma, su nivel, su tono, la versión lejana y los casquillos
  m16: { b: 'm16b', one: 'm16', v: 0.41, cas: 'cas_s' },
  car15: { b: 'car15b', one: 'm16', v: 0.6, rate: 1.05, cas: 'cas_s' },
  dmr: { one: 'm16', v: 0.58, rate: 0.88, cas: 'cas_s' },
  saw: { b: 'saw', v: 0.4, cas: 'cas_s' },
  ak47: { b: 'ak', v: 0.5, far: ['akf', 'akf2'], fv: 1.15, cas: 'cas_s' },
  pkm: { b: 'pkm', v: 0.37, far: ['akf'], fv: 2.6, frate: 0.92, cas: 'cas_b' },
  m2: { b: 'm2', v: 0.39, cas: 'cas_b' },
  pistol: { seg: 'pistol', v: 0.32 }
};
// dónde está un sonido para el oído: nivel, lado, lo apagado y lo húmedo que suena; null si queda fuera del alcance del oído
function sndGeo(x, z, range) {
  const dx = x - camS.tx,
    dz = z - camS.tz,
    d = Math.hypot(dx, dz),
    k = d / range;
  if (k >= 1) return null;
  return {
    k,
    vol: Math.pow(1 - k, 1.5),
    pan: clamp((dx * Math.cos(camS.yaw) - dz * Math.sin(camS.yaw)) / (halfH() * 1.7 + 4), -1, 1) * 0.8,
    lp: 17000 * Math.pow(1 - k, 2.4) + 480,
    wet: 0.14 + 0.7 * k,
    at: AC.currentTime + Math.min(0.22, d * 0.0035)
  };
}
function sndOut(g) {
  const lp = AC.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = g.lp;
  let node = lp;
  if (AC.createStereoPanner) {
    const p_ = AC.createStereoPanner();
    p_.pan.value = g.pan;
    lp.connect(p_);
    node = p_;
  }
  node.connect(SND.master);
  const sd = AC.createGain();
  sd.gain.value = g.wet;
  node.connect(sd);
  sd.connect(SND.rev);
  return lp;
}
function nz(dest, t0, type, f0, f1, q, vol, dur, att) {
  const src = AC.createBufferSource();
  src.buffer = SND.noise;
  const f = AC.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(f0, t0);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  f.Q.value = q;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t0 + (att || 0.0015));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + dur + 0.03);
}
function tone(dest, t0, type, f0, f1, vol, dur, att) {
  const o = AC.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t0 + (att || 0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
function smp(name, g, vol) {
  const L_ = SMP[name];
  if (!L_ || !L_.length) return false;
  const src = AC.createBufferSource();
  src.buffer = L_[ri(L_.length)];
  src.playbackRate.value = rr(0.96, 1.04);
  const gn = AC.createGain();
  gn.gain.value = vol * g.vol;
  src.connect(gn);
  gn.connect(sndOut(g));
  src.start(g.at);
  return true;
}
const sndGate = (k, gap) => {
  const now = AC.currentTime;
  if (now - (SND.last[k] || -9) < gap) return false;
  SND.last[k] = now;
  return true;
};
function gunSnd(w, x, z, g, n) {
  n = n || 1;
  const P_ = GUNS[w] || GUNS.m16;
  if (!g) {
    if (!sndGate(w, n > 1 ? 0.05 : 0.028)) return;
    g = sndGeo(x, z, P_.r);
  }
  if (!g) return;
  const B_ = GUN_SB[w];
  if (B_ && SB[B_.b || B_.one || B_.seg]) {
    const j = ar(0.97, 1.03) * (B_.rate || 1);
    if (B_.far && (g.k || 0) > 0.45 && SB[B_.far[0]]) {
      // lejos: la grabación hecha a distancia, más brillante de lo que la dejaría el filtro
      g.lp = Math.max(g.lp, 5200);
      clipBurst(ap(B_.far.filter(f => SB[f])), n, g, B_.v * B_.fv, j * (B_.frate || 1));
    } else if (B_.seg) {
      const out = sndOut(g);
      for (let q = 0; q < n; q++) {
        const gq = Object.assign({}, g, { at: g.at + q * 0.12 });
        clipOne(B_.seg, gq, B_.v, j, out);
      }
    } else if (n === 1 && B_.one) clipOne(B_.one, g, B_.v * 1.1, j);
    else if (B_.b) clipBurst(B_.b, n, g, B_.v, j);
    else {
      const out = sndOut(g);
      for (let q = 0; q < n; q++)
        clipOne(B_.one, Object.assign({}, g, { at: g.at + q * 0.09 }), B_.v, j * ar(0.98, 1.02), out);
    }
    // los casquillos sonando en el suelo a los pies del tirador, solo de cerca
    if (B_.cas && (g.k || 0) < 0.2 && x != null && SB[B_.cas] && sndGate('cas' + B_.cas, 0.35)) {
      const gc = sndGeo(x, z, 15);
      if (gc) {
        gc.at += 0.18;
        gc.wet = 0.05;
        clipOne(B_.cas, gc, B_.cas === 'cas_b' ? 0.5 : 0.32, ar(0.92, 1.08));
      }
    }
    return;
  }
  if (smp(w, g, 0.8)) return;
  const out = sndOut(g),
    t0 = g.at,
    j = rr(0.94, 1.06),
    v = g.vol * 0.55 * rr(0.88, 1.06);
  nz(out, t0, 'highpass', P_.c[0] * j, 0, 0.7, v * P_.c[1], P_.c[2] + 0.02);
  nz(out, t0, 'bandpass', P_.b[0] * j, P_.b[0] * j * 0.55, P_.b[1], v * P_.b[2] * 1.6, P_.b[3]);
  tone(out, t0, 'sine', P_.t[0] * j, P_.t[1], v * P_.t[2], P_.t[3]);
  if (P_.mech) nz(out, t0 + 0.028, 'bandpass', 3300 * j, 0, 7, v * P_.mech, 0.03);
}
function sfx(kind, x, z, s, n) {
  if (!AC || !soundOn || !SND) return;
  if (kind === 'boom') return blastSnd(x, z, 1);
  if (kind === 'crash') return crashSnd(x, z);
  if (kind === 'mini' && SB.mini) {
    const g = sndGeo(x, z, 110);
    if (g) {
      SND.miniT = AC.currentTime;
      SND.miniV = Math.max(SND.miniV && AC.currentTime - SND.miniT0 < 0.3 ? SND.miniV : 0, g.vol);
      SND.miniT0 = AC.currentTime;
    }
    return;
  }
  let w = kind === 'pistol' ? 'pistol' : kind === 'm2' ? 'm2' : kind === 'ak' ? 'ak47' : kind === 'saw' ? 'saw' : 'm16';
  if (s && kind !== 'pistol')
    w = s.tech
      ? 'm2'
      : s.team === 'us'
        ? { car: 'car15', saw: 'saw', dmr: 'dmr' }[s.gun] || 'm16'
        : s.gun === 'saw'
          ? 'pkm'
          : 'ak47';
  gunSnd(w, x, z, null, n);
}
// una recarga cerca: fuera el cargador, dentro el cargador, el cerrojo
function reloadSnd(u) {
  if (!AC || !soundOn || !SND || !SB.reload || !u || u.gun === 'rpg') return;
  const g = sndGeo(u.x, u.z, 16);
  if (!g) return;
  g.wet = 0.06;
  g.at += ar(0.05, 0.3);
  clipOne('reload', g, 0.7, u.team === 'us' ? ar(0.98, 1.04) : ar(0.9, 0.96));
}
// un helicóptero alcanzado por un cohete, un helicóptero estrellándose: se oye en toda la ciudad
function heliSnd(k, x, z) {
  if (!AC || !soundOn || !SND || !SB[k]) return false;
  const g = sndGeo(x, z, 170);
  if (!g) return true;
  g.wet = Math.min(1, g.wet + 0.2);
  g.lp = Math.max(g.lp, 2400);
  clipOne(k, g, k === 'heli_crash' ? 1.5 : 0.72, 1);
  return true;
}
// una bala pasando junto a la oreja: su chasquido y el siseo detrás
function whizSnd(x, z) {
  if (!AC || !soundOn || !SND || !sndGate('whiz', 0.11)) return;
  const g = sndGeo(x, z, 9);
  if (!g) return;
  g.wet = 0.1;
  if (SB.whiz) {
    clipOne('whiz', g, 0.23, ar(0.9, 1.15));
    return;
  }
  if (smp('whiz', g, 0.5)) return;
  const out = sndOut(g),
    t0 = g.at;
  nz(out, t0, 'highpass', 6000, 0, 0.7, g.vol * 0.2, 0.012);
  nz(out, t0 + 0.004, 'bandpass', rr(4600, 6200), rr(1100, 1700), 2.2, g.vol * 0.2, rr(0.1, 0.16), 0.01);
}
function impSnd(kind, x, z) {
  if (!AC || !soundOn || !SND || !sndGate('i' + kind, kind === 'brass' ? 0.07 : 0.035)) return;
  const g = sndGeo(x, z, kind === 'brass' ? 14 : 38);
  if (!g) return;
  const v = g.vol * 0.3,
    t0 = g.at;
  if (kind === 'brass' && SB.cas_s) return; // los casquillos se oyen con la ráfaga
  const CK = {
    dirt: [['imp_sand'], 0.21, 1],
    soft: [['imp_sand'], 0.11, 0.78],
    metal: [['imp_metal', 'imp_metal2'], 0.31, 1],
    glass: [['imp_glass'], 0.3, 1],
    ric: [['ric'], 0.52, 1]
  }[kind];
  if (CK && SB[CK[0][0]]) {
    clipOne(ap(CK[0]), g, CK[1], CK[2] * ar(0.9, 1.1));
    return;
  }
  const nm = {
    thud: 'imp_wall',
    stone: 'imp_stone',
    dirt: 'imp_sand',
    wood: 'imp_wood',
    glass: 'imp_glass',
    metal: 'imp_metal',
    soft: 'imp_soft',
    ric: 'ricochet',
    brass: 'casing'
  }[kind];
  if (nm && smp(nm, g, kind === 'brass' ? 0.25 : 0.6)) return;
  const out = sndOut(g),
    j = rr(0.88, 1.14);
  if (kind === 'ric') {
    tone(out, t0, 'sine', rr(2400, 3600), rr(500, 900), v * 0.5, rr(0.22, 0.34));
    nz(out, t0, 'bandpass', 3000, 0, 5, v * 0.5, 0.03);
  } else if (kind === 'metal') {
    nz(out, t0, 'highpass', 2500, 0, 0.7, v * 0.8, 0.02);
    for (const f of [1750, 2630, 4120, 5400]) tone(out, t0, 'sine', f * j * rr(0.97, 1.03), 0, v * 0.3, rr(0.12, 0.3));
  } else if (kind === 'glass') {
    nz(out, t0, 'highpass', 4200, 0, 0.7, v * 1.1, 0.09);
    for (let k = 0; k < 6; k++)
      tone(out, t0 + k * rr(0.012, 0.05), 'sine', rr(2800, 7600), 0, v * 0.22, rr(0.08, 0.28));
    for (let k = 0; k < 5; k++) nz(out, t0 + 0.1 + k * rr(0.04, 0.09), 'bandpass', rr(5000, 8000), 0, 9, v * 0.3, 0.03);
  } // y los trozos cayendo
  else if (kind === 'wood') {
    nz(out, t0, 'bandpass', 620 * j, 0, 6, v * 2.2, 0.07);
    nz(out, t0, 'highpass', 2600, 0, 0.7, v * 0.6, 0.016);
    tone(out, t0, 'sine', 240 * j, 150, v * 0.6, 0.05);
  } else if (kind === 'stone') {
    nz(out, t0, 'bandpass', 1900 * j, 0, 3.5, v * 1.6, 0.045);
    nz(out, t0, 'lowpass', 600, 0, 0.7, v * 1.2, 0.07);
    for (let k = 0; k < 3; k++)
      nz(out, t0 + 0.05 + k * rr(0.03, 0.07), 'bandpass', rr(2200, 3600), 0, 6, v * 0.3, 0.025);
  } else if (kind === 'dirt') {
    nz(out, t0, 'lowpass', 480 * j, 0, 0.7, v * 1.5, 0.08);
    nz(out, t0, 'highpass', 3200, 0, 0.7, v * 0.22, 0.13, 0.01);
  } else if (kind === 'soft') {
    nz(out, t0, 'lowpass', 330 * j, 0, 0.7, v * 1.4, 0.06);
  } else if (kind === 'brass') {
    const f = rr(5200, 7400);
    tone(out, t0, 'sine', f, 0, v * 0.3, 0.07);
    tone(out, t0 + rr(0.05, 0.09), 'sine', f * rr(0.9, 1.1), 0, v * 0.2, 0.06);
    tone(out, t0, 'sine', f * 1.5, 0, v * 0.1, 0.04);
  } else {
    nz(out, t0, 'lowpass', 720 * j, 0, 0.7, v * 1.6, 0.085);
    nz(out, t0, 'bandpass', 1500 * j, 0, 1.5, v * 0.6, 0.04);
    for (let k = 0; k < 3; k++)
      nz(out, t0 + 0.05 + k * rr(0.03, 0.08), 'bandpass', rr(1800, 3200), 0, 5, v * 0.22, 0.03);
  } // enlucido y bloque: un golpe sordo y la arenilla que cae
}
function blastSnd(x, z, size) {
  if (!AC || !soundOn || !SND) return;
  const g = sndGeo(x, z, 120);
  if (!g) return;
  g.wet = Math.min(1, g.wet + 0.25);
  if (SB.exp1) {
    const far = (g.k || 0) > 0.5 && SB.rpg_far;
    if (far) g.lp = Math.max(g.lp, 3200);
    clipOne(
      far ? 'rpg_far' : size < 1 ? 'rpg_hit' : ap(['exp1', 'exp2', 'rpg_hit']),
      g,
      far ? 1.25 : 0.9 * Math.min(1.2, size + 0.1),
      ar(0.94, 1.04)
    );
    return;
  }
  if (smp(size < 1 ? 'rpg_blast' : 'explosion', g, 1) || (size < 1 && smp('explosion', g, 0.85))) return;
  const out = sndOut(g),
    t0 = g.at,
    v = g.vol * size;
  nz(out, t0, 'highpass', 1800, 0, 0.7, v * 0.9, 0.05);
  nz(out, t0, 'bandpass', 420, 120, 0.7, v * 1.5, 0.5);
  nz(out, t0, 'lowpass', 190, 55, 0.7, v * 2.2, 1.9, 0.004);
  tone(out, t0, 'sine', 95, 28, v * 1.1, 1.1);
  for (let k = 0; k < 12; k++)
    nz(out, t0 + 0.25 + k * rr(0.05, 0.14), 'bandpass', rr(900, 3200), 0, 4, v * rr(0.05, 0.14), rr(0.03, 0.07)); // lo que salió despedido vuelve a caer
}
function launchSnd(x, z) {
  const g = sndGeo(x, z, 70);
  if (!g) return;
  if (SB.rpg_launch) {
    clipOne('rpg_launch', g, 0.48, ar(0.95, 1.05));
    return;
  }
  if (smp('rpg_launch', g, 0.9)) return;
  const out = sndOut(g),
    t0 = g.at,
    v = g.vol * 0.6;
  nz(out, t0, 'highpass', 2200, 0, 0.7, v * 0.8, 0.03);
  tone(out, t0, 'sine', 130, 45, v * 0.9, 0.16);
  nz(out, t0, 'bandpass', 700, 0, 0.8, v * 1.2, 0.18);
  nz(out, t0 + 0.03, 'bandpass', 1700, 420, 1.3, v * 0.9, 1.0, 0.05); // el motor alejándose calle abajo
}
function rpgSnd(x, z, big) {
  if (!AC || !soundOn || !SND) return;
  if (big) blastSnd(x, z, 0.85);
  else launchSnd(x, z);
}
function crashSnd(x, z) {
  const g = sndGeo(x, z, 60);
  if (!g) return;
  if (smp('collapse', g, 0.9)) return;
  const out = sndOut(g),
    t0 = g.at,
    v = g.vol * 0.5;
  nz(out, t0, 'lowpass', 300, 80, 0.7, v * 1.8, 0.7, 0.01);
  nz(out, t0, 'bandpass', 900, 0, 1, v * 0.8, 0.25);
  for (let k = 0; k < 14; k++)
    nz(out, t0 + k * rr(0.03, 0.08), 'bandpass', rr(700, 2800), 0, 4, v * rr(0.12, 0.3), rr(0.03, 0.08));
}
// los bucles: rotores del Black Hawk y del Little Bird, el rebufo en el suelo, un diésel y sus ruedas
function sndLoops() {
  if (!SND) return;
  const now = AC.currentTime;
  for (const k in SND.loops) {
    for (const n of SND.loops[k].src)
      try {
        n.stop();
      } catch (e) {}
  }
  const mk = (name, lvl, build) => {
    const old = SND.loops[name],
      g = old ? old.g : AC.createGain();
    if (!old) {
      g.gain.value = 0;
      g.connect(SND.master);
    }
    const src = [];
    if (SMP[name] && SMP[name][0]) {
      const b = AC.createBufferSource();
      b.buffer = SMP[name][0];
      b.loop = true;
      const pre = AC.createGain();
      pre.gain.value = lvl;
      b.connect(pre);
      pre.connect(g);
      b.start();
      src.push(b);
      SND.loops[name] = { g, src, rate: b.playbackRate };
    } else {
      const o = build(g, src) || {};
      SND.loops[name] = Object.assign({ g, src }, o);
    }
  };
  const noise = () => {
    const b = AC.createBufferSource();
    b.buffer = SND.noise;
    b.loop = true;
    b.start(0, Math.random());
    return b;
  };
  const rotor = (bp, thump, slapF, whine) => (g, src) => {
    const lfo = AC.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = bp;
    lfo.start();
    src.push(lfo);
    const n1 = noise(),
      f1 = AC.createBiquadFilter();
    f1.type = 'lowpass';
    f1.frequency.value = thump;
    const a1 = AC.createGain();
    a1.gain.value = 0.55;
    const d1 = AC.createGain();
    d1.gain.value = 0.55;
    lfo.connect(d1);
    d1.connect(a1.gain);
    n1.connect(f1);
    f1.connect(a1);
    a1.connect(g);
    const n2 = noise(),
      f2 = AC.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = slapF;
    f2.Q.value = 0.8;
    const a2 = AC.createGain();
    a2.gain.value = 0.12;
    const d2 = AC.createGain();
    d2.gain.value = 0.14;
    lfo.connect(d2);
    d2.connect(a2.gain);
    n2.connect(f2);
    f2.connect(a2);
    a2.connect(g);
    const n3 = noise(),
      f3 = AC.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.value = whine;
    f3.Q.value = 5;
    const a3 = AC.createGain();
    a3.gain.value = 0.035;
    n3.connect(f3);
    f3.connect(a3);
    a3.connect(g);
    const o = AC.createOscillator();
    o.type = 'sine';
    o.frequency.value = whine * 0.74;
    const a4 = AC.createGain();
    a4.gain.value = 0.006;
    o.connect(a4);
    a4.connect(g);
    o.start();
    src.push(n1, n2, n3, o);
  };
  mk('rotor_bh', 1, rotor(17.2, 170, 760, 3900));
  mk('rotor_lb', 1, rotor(39, 330, 1500, 5200));
  mk('wash', 1, (g, src) => {
    const n = noise(),
      f = AC.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 0.5;
    const lf = AC.createOscillator();
    lf.frequency.value = 0.7;
    const d = AC.createGain();
    d.gain.value = 320;
    lf.connect(d);
    d.connect(f.frequency);
    lf.start();
    n.connect(f);
    f.connect(g);
    src.push(n, lf);
  });
  mk('truck', 1, (g, src) => {
    const o1 = AC.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 46;
    const o2 = AC.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 23;
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 340;
    f.Q.value = 1.2;
    const am = AC.createGain();
    am.gain.value = 0.6;
    const lf = AC.createOscillator();
    lf.type = 'square';
    lf.frequency.value = 11.5;
    const d = AC.createGain();
    d.gain.value = 0.3;
    lf.connect(d);
    d.connect(am.gain);
    const g1 = AC.createGain();
    g1.gain.value = 0.5;
    const g2 = AC.createGain();
    g2.gain.value = 0.35;
    o1.connect(g1);
    o2.connect(g2);
    g1.connect(f);
    g2.connect(f);
    f.connect(am);
    am.connect(g);
    const n = noise(),
      nf = AC.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 220;
    const ng = AC.createGain();
    ng.gain.value = 0.5;
    n.connect(nf);
    nf.connect(ng);
    ng.connect(g);
    o1.start();
    o2.start();
    lf.start();
    src.push(o1, o2, lf, n);
    return { f1: o1.frequency, f2: o2.frequency, f3: lf.frequency, cut: f.frequency };
  });
  mk('tyres', 1, (g, src) => {
    const n = noise(),
      f = AC.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 620;
    f.Q.value = 0.6;
    n.connect(f);
    f.connect(g);
    src.push(n);
    return { cut: f.frequency };
  });
  // las grabaciones, una vez decodificadas, toman el relevo: capas de clips en bucle, cada uno con su nivel y su tono
  const mkS = (name, layers) => {
    if (!layers.every(l => SB[l[0]])) return;
    const old = SND.loops[name],
      g = old ? old.g : AC.createGain();
    if (!old) {
      g.gain.value = 0;
      g.connect(SND.master);
    }
    const src = [],
      rates = [];
    for (const [k, lvl, rt] of layers) {
      const c = SB[k],
        b = AC.createBufferSource();
      b.buffer = c.buf;
      b.loop = true;
      b.loopStart = c.sh;
      b.loopEnd = Math.min(c.buf.duration, c.sh + c.d);
      b.playbackRate.value = rt;
      const pre = AC.createGain();
      pre.gain.value = lvl;
      b.connect(pre);
      pre.connect(g);
      b.start(0, c.sh + Math.random() * c.d * 0.9);
      src.push(b);
      rates.push([b.playbackRate, rt]);
    }
    SND.loops[name] = { g, src, rates };
  };
  mkS('rotor_bh', [
    ['heli_amb', 0.75, 1],
    ['rotor', 0.6, 1]
  ]);
  mkS('rotor_lb', [
    ['rotor', 0.7, 1.62],
    ['heli_amb', 0.32, 1.3]
  ]);
  mkS('eng_idle', [['truck_idle', 1, 1]]);
  mkS('eng_move', [['truck_move', 1, 1]]);
  mkS('eng_hum', [['humvee', 1, 1]]);
  mkS('tyres', [['tyres', 1, 1]]);
  mkS('mini', [['mini', 1, 1]]);
  mkS('run1', [['run1', 1, 1]]);
  mkS('run2', [['run2', 1, 1]]);
  mkS('war', [['war', 1, 1]]);
  rotorGain = SND.loops.rotor_bh.g;
}
function updLoops(dt) {
  if (!AC || !SND) return;
  const now = AC.currentTime,
    on = soundOn ? 1 : 0,
    L_ = SND.loops,
    cx = camS.tx,
    cz = camS.tz;
  SND.master.gain.setTargetAtTime(on * 0.9, now, 0.06);
  // los Little Birds
  let lb = 0;
  for (const o of ORBITS)
    if (o.lb) {
      const d = Math.hypot(o.h.g.position.x - cx, o.h.g.position.z - cz);
      lb = Math.max(lb, Math.max(0, 1 - d / 50) * 0.4);
    }
  if (FLIGHT.on)
    for (const h of FLIGHT.helis)
      if (h.lb && !h.gone && h.rs > 0.2) {
        const d = Math.hypot(h.g.position.x - cx, h.g.position.z - cz);
        lb = Math.max(lb, Math.max(0, 1 - d / 55) * 0.34 * h.rs);
      }
  L_.rotor_lb.g.gain.setTargetAtTime(lb, now, 0.25);
  // polvo y aire bajo un rotor
  L_.wash.g.gain.setTargetAtTime(0, now, 0.1);
  washLvl = 0;
  // el vehículo más cercano: el tono y el volumen del motor siguen su velocidad, y las ruedas solo cuando rueda
  let bd = 40,
    sp = 0,
    pet = false,
    vk = 't';
  const see = (x, z, v, p_, kd) => {
    const d = Math.hypot(x - cx, z - cz);
    if (d < bd) {
      bd = d;
      sp = v;
      pet = !!p_;
      vk = kd || 't';
    }
  };
  for (const C of CONVOYS) for (const v of C.veh) if (v.x != null) see(v.x, v.z, C.v, false, v.kind);
  for (const t of TECHS) if (t.alive && t.g) see(t.g.position.x, t.g.position.z, t.v || 0, true, 'tech');
  if (IRN.convoy) for (const v of IRN.convoy) see(v.x, v.z, v.v || 0, false, v.kind);
  if (FLIGHT.on && FLIGHT.convoy)
    for (const v of FLIGHT.convoy) if (v.g) see(v.g.position.x, v.g.position.z, 2, false, v.kind);
  const near = bd < 40 ? 1 - bd / 40 : 0,
    k = Math.min(1, sp / 2.3),
    e = L_.truck;
  if (L_.eng_idle) {
    // las grabaciones: un Humvee (o un pick-up, más agudo) o un camión (o un blindado, más grave), al ralentí o tirando
    const hum = vk === 'h' || vk === 'tech',
      apc = vk === 'un' || vk === 'btr',
      pr = apc ? 0.78 : vk === 'tech' ? 1.16 : 1;
    L_.eng_hum.g.gain.setTargetAtTime(hum ? near * (0.15 + 0.13 * k) : 0, now, 0.25);
    L_.eng_idle.g.gain.setTargetAtTime(hum ? 0 : near * 0.2 * (1 - k * 0.7), now, 0.3);
    L_.eng_move.g.gain.setTargetAtTime(hum ? 0 : near * 0.22 * k, now, 0.3);
    for (const [nm, b0, b1] of [
      ['eng_hum', 0.88, 0.4],
      ['eng_idle', 0.95, 0.15],
      ['eng_move', 0.85, 0.3]
    ])
      for (const [rp, r0] of L_[nm].rates) rp.setTargetAtTime(r0 * pr * (b0 + b1 * k), now, 0.3);
    L_.tyres.g.gain.setTargetAtTime(near * 0.16 * k, now, 0.2);
    e.g.gain.setTargetAtTime(0, now, 0.1);
  } else {
    e.g.gain.setTargetAtTime(near * (0.15 + 0.16 * k), now, 0.2);
    if (e.f1) {
      const f0 = (pet ? 62 : 44) + (pet ? 46 : 36) * k;
      e.f1.setTargetAtTime(f0, now, 0.25);
      e.f2.setTargetAtTime(f0 / 2, now, 0.25);
      e.f3.setTargetAtTime(f0 / 4, now, 0.25);
      e.cut.setTargetAtTime(300 + 380 * k, now, 0.3);
    } else if (e.rate) e.rate.setTargetAtTime(0.8 + 0.5 * k, now, 0.3);
    L_.tyres.g.gain.setTargetAtTime(near * 0.085 * k, now, 0.2);
  }
  // las miniguns de los Little Birds: suenan mientras salen balas y se cortan un instante después
  if (L_.mini) {
    const fir = SND.miniT != null && now - SND.miniT < 0.13;
    L_.mini.g.gain.setTargetAtTime(fir ? Math.min(0.7, (SND.miniV || 0) * 0.62) : 0, now, fir ? 0.02 : 0.07);
    if (!fir) SND.miniV = 0;
  }
  // pasos: hombres corriendo cerca de la cámara cuando está baja
  if (L_.run1) {
    let nr = 0;
    const R = halfH() * 0.8 + 2,
      zz = clamp((24 - camS.zoom) / 14, 0, 1);
    if (zz > 0 && G && G.started)
      for (const u of units) if (u.alive && u.moving && !u.down && Math.hypot(u.x - cx, u.z - cz) < R) nr++;
    L_.run1.g.gain.setTargetAtTime(zz * Math.min(1, nr / 2) * 0.25, now, 0.25);
    L_.run2.g.gain.setTargetAtTime(zz * clamp((nr - 2) / 4, 0, 1) * 0.22, now, 0.3);
  }
  // la batalla por la ciudad: solo en la ciudad y solo cuando ha empezado el tiroteo; entra despacio y se va despacio
  if (L_.war) {
    const city = G && G.started && !G.over && MIS && MIS.id !== 'tutorial' && MIS.id !== 'attract' && G.alert;
    L_.war.g.gain.setTargetAtTime(city ? (nightF > 0.5 ? 0.24 : 0.3) : 0, now, city ? 2.5 : 1.2);
  }
  // la batalla más allá de la calle: de vez en cuando una ráfaga en otra parte de la ciudad
  if (G && G.started && !G.over && !G.paused && on && MIS && MIS.id !== 'tutorial' && MIS.id !== 'attract' && G.alert) {
    SND.ambT -= dt;
    if (SND.ambT <= 0) {
      SND.ambT = rr(2.5, 8);
      const w = pick(['ak47', 'ak47', 'ak47', 'm16', 'm16', 'saw', 'm2']),
        n = w === 'm2' ? 3 + ri(4) : 1 + ri(5),
        pan = rr(-0.9, 0.9),
        vol = rr(0.05, 0.13),
        lp = rr(650, 1500),
        gap = w === 'saw' ? 0.075 : w === 'm2' ? 0.12 : rr(0.09, 0.14);
      if (SB.akf) {
        const ww = w === 'saw' ? 'pkm' : w === 'm16' ? 'ak47' : w;
        gunSnd(ww, null, null, { k: 0.9, vol: vol * 1.1, pan, lp: Math.max(lp, 3000), wet: 0.7, at: now }, n);
      } else for (let q = 0; q < n; q++) gunSnd(w, 0, 0, { vol, pan, lp, wet: 0.9, at: now + q * gap + ar(0, 0.01) });
      if (rnd() < 0.12) {
        const g = { vol: rr(0.12, 0.22), pan, lp: 500, wet: 1, at: now + rr(0.5, 1.5) },
          out = sndOut(g);
        nz(out, g.at, 'lowpass', 160, 50, 0.7, g.vol * 2, 1.6, 0.01);
      }
    }
  }
}
