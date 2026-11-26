/* ====================================================================================================
 * audio/menu-music.js
 *
 * Música del menú: una banda sonora original de película de guerra, generada en directo con Web Audio. Re menor, 84 bpm.
 * Las cuerdas graves llevan un ostinato, los metales crecen en los acordes, una trompa lleva el tema, un coro sube por debajo,
 * los taikos y una caja militar lo empujan, y en el centro tranquilo vuelve la voz de lamento del Mogadiscio de la película.
 * Empieza cuando sale el menú principal (nunca en el título), suena por los menús y el briefing,
 * se corta al empezar una misión y vuelve en la pantalla de final de misión.
 * ================================================================================================== */

const MUS = { on: false, out: null, rev: null, bus: null, bar: 0, next: 0, voices: [], want: false, offAt: -99 };
const MUS_SCREENS = new Set([
  'scrMenu',
  'scrCamp',
  'scrOpts',
  'brief',
  'scrCred',
  'scrIntro',
  'scrLoad',
  'endScr',
  'scrMan'
]);
const MUS_BPM = 84,
  MUS_BEAT = 60 / MUS_BPM,
  MUS_BAR = MUS_BEAT * 4;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// la escala de la voz (Re Hiyaz) para el centro tranquilo
const MUS_SCALE = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78];
// dos acordes por frase: i - VI - III - VII, luego i - VI - iv - V
const MUS_PROG = [
  [38, 50, 53, 57],
  [34, 46, 50, 53],
  [41, 48, 53, 57],
  [36, 48, 52, 55],
  [38, 50, 53, 57],
  [34, 46, 50, 53],
  [31, 43, 50, 55],
  [33, 45, 49, 52]
];
// el tema, un compás por acorde: [midi, tiempos]
const MUS_THEME = [
  [
    [62, 1.5],
    [69, 0.5],
    [69, 2]
  ],
  [
    [70, 1],
    [69, 1],
    [65, 2]
  ],
  [
    [65, 1.5],
    [67, 0.5],
    [69, 1],
    [72, 1]
  ],
  [[67, 4]],
  [
    [74, 1.5],
    [72, 0.5],
    [69, 2]
  ],
  [
    [70, 1],
    [69, 1],
    [65, 2]
  ],
  [
    [67, 1.5],
    [69, 0.5],
    [70, 1],
    [69, 1]
  ],
  [
    [69, 3],
    [64, 1]
  ]
];
function musImpulse(sec) {
  const n = Math.floor(AC.sampleRate * sec),
    b = AC.createBuffer(2, n, AC.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3.0);
  }
  return b;
}
function musInit() {
  if (MUS.out || !AC) return;
  MUS.out = AC.createGain();
  MUS.out.gain.value = 0;
  MUS.out.connect(AC.destination);
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.01;
  comp.release.value = 0.25;
  comp.connect(MUS.out);
  MUS.bus = comp;
  MUS.rev = AC.createConvolver();
  MUS.rev.buffer = musImpulse(3.6);
  const rg = AC.createGain();
  rg.gain.value = 0.5;
  MUS.rev.connect(rg);
  rg.connect(comp);
  // un bordón grave en Re bajo todo, respirando despacio
  const dl = AC.createBiquadFilter();
  dl.type = 'lowpass';
  dl.frequency.value = 180;
  dl.Q.value = 1.5;
  const lfo = AC.createOscillator(),
    lg = AC.createGain();
  lfo.frequency.value = 0.07;
  lg.gain.value = 60;
  lfo.connect(lg);
  lg.connect(dl.frequency);
  lfo.start();
  const dg = AC.createGain();
  dg.gain.value = 0.11;
  dl.connect(dg);
  dg.connect(comp);
  dg.connect(MUS.rev);
  MUS.drone = dg;
  for (const [m, det] of [
    [26, -6],
    [26, 7],
    [38, 3]
  ]) {
    const o = AC.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz(m);
    o.detune.value = det;
    o.connect(dl);
    o.start();
    MUS.voices.push(o);
  }
}
const musSend = (g, k) => {
  g.connect(MUS.bus);
  if (k) {
    const s = AC.createGain();
    s.gain.value = k;
    g.connect(s);
    s.connect(MUS.rev);
  }
};
// cuerdas graves: notas cortas con arco, el ostinato que mueve la pieza
function musOst(t, root, vol) {
  const pat = [0, 0, 12, 0, 0, 0, 10, 7],
    acc = [1, 0.55, 0.8, 0.55, 0.9, 0.55, 0.8, 0.7];
  for (let k = 0; k < 8; k++) {
    const tt = t + (k * MUS_BEAT) / 2,
      m = root + 12 + pat[k];
    const f = AC.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1500, tt);
    f.frequency.exponentialRampToValueAtTime(420, tt + 0.2);
    f.Q.value = 3;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.exponentialRampToValueAtTime(0.075 * vol * acc[k], tt + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.24);
    f.connect(g);
    musSend(g, 0.25);
    for (const det of [-7, 6]) {
      const o = AC.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      o.detune.value = det;
      o.connect(f);
      o.start(tt);
      o.stop(tt + 0.28);
    }
    if (k % 4 === 0) {
      const o = AC.createOscillator(),
        og = AC.createGain();
      o.type = 'sawtooth';
      o.frequency.value = hz(m - 12);
      og.gain.setValueAtTime(0.0001, tt);
      og.gain.exponentialRampToValueAtTime(0.05 * vol, tt + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, tt + 0.5);
      o.connect(f);
      o.start(tt);
      o.stop(tt + 0.55);
    }
  }
}
// metales: el acorde crece y se abre, como lo haría una sección de trompas y trombones
function musBrass(t, ch, dur, vol) {
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t);
  f.frequency.linearRampToValueAtTime(1300 + vol * 900, t + dur * 0.35);
  f.frequency.linearRampToValueAtTime(700, t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.045 * vol, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.036 * vol, t + dur * 0.8);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
  f.connect(g);
  musSend(g, 0.7);
  for (const m of ch.slice(1))
    for (const [ty, det] of [
      ['sawtooth', -5],
      ['square', 6]
    ]) {
      const o = AC.createOscillator();
      o.type = ty;
      o.frequency.value = hz(m);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.6);
    }
}
// el coro: vocales abiertas sobre el acorde, muy arriba
function musChoir(t, ch, dur, vol) {
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05 * vol, t + dur * 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
  musSend(g, 1.2);
  const f1 = AC.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 760;
  f1.Q.value = 4;
  const f2 = AC.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 1180;
  f2.Q.value = 5;
  f1.connect(g);
  f2.connect(g);
  for (const m of ch.slice(1))
    for (const det of [-11, 0, 10]) {
      const o = AC.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m + 24);
      o.detune.value = det + (Math.random() - 0.5) * 6;
      const v = AC.createOscillator(),
        vg = AC.createGain();
      v.frequency.value = 4.6 + Math.random();
      vg.gain.value = 9;
      v.connect(vg);
      vg.connect(o.detune);
      o.connect(f1);
      o.connect(f2);
      o.start(t);
      o.stop(t + dur + 1);
      v.start(t);
      v.stop(t + dur + 1);
    }
}
// la trompa: el tema, ligado, con un poco de vibrato que crece en cada nota larga
function musHorn(t, notes, up, vol) {
  const o = AC.createOscillator();
  o.type = 'sawtooth';
  const o2 = AC.createOscillator();
  o2.type = 'triangle';
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1300 + up * 500;
  f.Q.value = 1.5;
  const vib = AC.createOscillator(),
    vg = AC.createGain();
  vib.frequency.value = 5;
  vg.gain.value = 0;
  vib.connect(vg);
  vg.connect(o.detune);
  vg.connect(o2.detune);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  o.connect(f);
  o2.connect(f);
  f.connect(g);
  musSend(g, 0.9);
  let tt = t;
  o.frequency.setValueAtTime(hz(notes[0][0] + up), t);
  o2.frequency.setValueAtTime(hz(notes[0][0] + up), t);
  for (const [m, beats] of notes) {
    const d = beats * MUS_BEAT;
    o.frequency.setTargetAtTime(hz(m + up), tt, 0.03);
    o2.frequency.setTargetAtTime(hz(m + up), tt, 0.03);
    g.gain.setTargetAtTime(0.085 * vol, tt, 0.05);
    vg.gain.setValueAtTime(0, tt);
    vg.gain.linearRampToValueAtTime(d > 0.8 ? 14 : 4, tt + d * 0.9);
    tt += d;
  }
  g.gain.setTargetAtTime(0.0001, tt - 0.12, 0.18);
  o.start(t);
  o2.start(t);
  vib.start(t);
  o.stop(tt + 1);
  o2.stop(tt + 1);
  vib.stop(tt + 1);
}
// la voz del Mogadiscio de la película: un lamento nasal con glissandos y adornos
function musVoice(t, notes) {
  const o = AC.createOscillator();
  o.type = 'sawtooth';
  const vib = AC.createOscillator(),
    vg = AC.createGain();
  vib.frequency.value = 5.2;
  vg.gain.value = 0;
  vib.connect(vg);
  vg.connect(o.detune);
  const f1 = AC.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 650;
  f1.Q.value = 5;
  const f2 = AC.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 1150;
  f2.Q.value = 7;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  o.connect(f1);
  o.connect(f2);
  f1.connect(g);
  f2.connect(g);
  musSend(g, 1.4);
  let tt = t;
  o.frequency.setValueAtTime(hz(notes[0][0]), t);
  for (const [m, d] of notes) {
    o.frequency.setTargetAtTime(hz(m), tt, 0.09);
    g.gain.setTargetAtTime(0.08, tt, 0.12);
    vg.gain.setValueAtTime(0, tt);
    vg.gain.linearRampToValueAtTime(28, tt + d * 0.8);
    if (Math.random() < 0.35) {
      o.frequency.setTargetAtTime(hz(m + 1), tt + d * 0.45, 0.05);
      o.frequency.setTargetAtTime(hz(m), tt + d * 0.6, 0.05);
    }
    tt += d;
  }
  g.gain.setTargetAtTime(0, tt - 0.2, 0.35);
  o.start(t);
  vib.start(t);
  o.stop(tt + 2);
  vib.stop(tt + 2);
}
function musPhrase() {
  const n = 3 + Math.floor(Math.random() * 3),
    out = [];
  let i = 4 + Math.floor(Math.random() * 3);
  for (let k = 0; k < n; k++) {
    i = Math.max(0, Math.min(MUS_SCALE.length - 1, i + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
    out.push([MUS_SCALE[i], MUS_BEAT * (k === n - 1 ? 3 : [1, 1, 2, 0.5][Math.floor(Math.random() * 4)])]);
  }
  out.push([62, MUS_BEAT * 3]);
  return out;
}
// percusión: el gran tambor de guerra, una caja militar, un redoble de timbal y un platillo creciendo hasta el clímax
function musTaiko(t, vol) {
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7 * vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g);
  musSend(g, 0.5);
  o.start(t);
  o.stop(t + 1.2);
  const s = AC.createBufferSource();
  s.buffer = noiseBuf;
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const sg = AC.createGain();
  sg.gain.setValueAtTime(0.45 * vol, t);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  s.connect(f);
  f.connect(sg);
  musSend(sg, 0.3);
  s.start(t, Math.random() * 0.5);
  s.stop(t + 0.3);
}
function musSnare(t, vol) {
  const s = AC.createBufferSource();
  s.buffer = noiseBuf;
  const f = AC.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2400;
  f.Q.value = 0.8;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.32 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  s.connect(f);
  f.connect(g);
  musSend(g, 0.25);
  s.start(t, Math.random() * 0.5);
  s.stop(t + 0.16);
  const o = AC.createOscillator(),
    og = AC.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
  og.gain.setValueAtTime(0.12 * vol, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(og);
  og.connect(MUS.bus);
  o.start(t);
  o.stop(t + 0.1);
}
function musRoll(t, beats, v0, v1) {
  const n = Math.round(beats * 4);
  for (let k = 0; k < n; k++) musSnare(t + (k * MUS_BEAT) / 4, v0 + ((v1 - v0) * k) / n);
}
function musTimp(t, beats, root) {
  const n = Math.round(beats * 6);
  for (let k = 0; k < n; k++) {
    const tt = t + (k * MUS_BEAT) / 6,
      o = AC.createOscillator(),
      g = AC.createGain();
    o.type = 'sine';
    o.frequency.value = hz(root);
    g.gain.setValueAtTime(0.0001, tt);
    g.gain.exponentialRampToValueAtTime(0.05 + (0.25 * k) / n, tt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.35);
    o.connect(g);
    musSend(g, 0.4);
    o.start(tt);
    o.stop(tt + 0.4);
  }
}
function musSwell(t, beats) {
  const d = beats * MUS_BEAT,
    s = AC.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = AC.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 3500;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + d);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.6);
  s.connect(f);
  f.connect(g);
  musSend(g, 1);
  s.start(t);
  s.stop(t + d + 1.7);
}
// compás a compás, un poco por delante del reloj. Un arco de 32 compases: las cuerdas solas, entran los tambores, el tema, el tema en los metales con
// el coro encima, un centro tranquilo donde la voz se lamenta, y un clímax; luego vuelve a empezar desde los tambores
function musBar(t) {
  const b = MUS.bar++,
    sec = b < 32 ? b : 4 + ((b - 4) % 28),
    ch = MUS_PROG[sec % 8],
    root = ch[0];
  const intro = sec < 4,
    build = sec >= 4 && sec < 8,
    A = sec >= 8 && sec < 16,
    B = sec >= 16 && sec < 24,
    mid = sec >= 24 && sec < 28,
    top = sec >= 28;
  if (MUS.drone) MUS.drone.gain.setTargetAtTime(mid || intro ? 0.13 : 0.07, t, 0.8);
  musOst(t, root, intro ? 0.5 : mid ? 0.35 : build ? 0.75 : 1);
  if (!intro) musBrass(t, ch, MUS_BAR, mid ? 0.35 : B || top ? 1.15 : build ? 0.55 : 0.75);
  if (B || top || (mid && sec % 2 === 0) || (intro && sec >= 2))
    musChoir(t, ch, MUS_BAR, mid ? 0.8 : B || top ? 1 : 0.5);
  if (A) musHorn(t, MUS_THEME[sec % 8], 0, 0.95);
  if (B || top) musHorn(t, MUS_THEME[sec % 8], 12, B ? 0.8 : 1);
  // tambores
  if (build) {
    musTaiko(t, 0.55);
    musTaiko(t + 2 * MUS_BEAT, 0.4);
    if (sec === 7) musTimp(t + 2 * MUS_BEAT, 2, 38);
  }
  if (A || B || top) {
    musTaiko(t, 1);
    musTaiko(t + 1.5 * MUS_BEAT, 0.5);
    musTaiko(t + 2 * MUS_BEAT, 0.85);
    if (top || sec % 2) musTaiko(t + 3.5 * MUS_BEAT, 0.5);
    for (const s of [1, 3]) musSnare(t + s * MUS_BEAT, 0.7);
    musSnare(t + 3.75 * MUS_BEAT, 0.4);
    if (sec % 4 === 3) musRoll(t + 3 * MUS_BEAT, 1, 0.2, 0.8);
  }
  if (mid) {
    if (sec % 2 === 0) musTaiko(t, 0.45);
    if (sec % 2 === 0) musVoice(t + MUS_BEAT * 0.5, musPhrase());
  }
  if (sec === 23 || sec === 27) {
    musSwell(t, 4);
    musRoll(t + 2 * MUS_BEAT, 2, 0.15, 1);
    musTimp(t, 4, root);
  }
  if (sec === 31) {
    musRoll(t, 4, 0.1, 1);
    musSwell(t, 4);
  }
}
function musTick() {
  if (!AC) return;
  const want = false; // los menús van en silencio: sin música de menú
  if (want && !MUS.out) musInit();
  if (!MUS.out) return;
  if (want !== MUS.want) {
    MUS.want = want;
    const now = AC.currentTime;
    MUS.out.gain.cancelScheduledValues(now);
    MUS.out.gain.setValueAtTime(MUS.out.gain.value, now);
    if (want) {
      if (now - MUS.offAt > 2.5) {
        MUS.bar = 0;
        MUS.next = now + 0.15;
      } else if (MUS.next < now) MUS.next = now + 0.1;
      MUS.out.gain.setTargetAtTime(0.6, now, 0.5);
    } else {
      MUS.offAt = now;
      MUS.out.gain.setTargetAtTime(0, now, 0.18);
    }
  } // un corte rápido, no un fundido largo
  if (!want) return;
  while (MUS.next < AC.currentTime + 0.6) {
    musBar(MUS.next);
    MUS.next += MUS_BAR;
  }
}
