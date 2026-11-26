/* ====================================================================================================
 * audio/intro-score.js
 *
 * La música del final de la introducción, con los mismos instrumentos de la banda sonora del juego (audio/menu-music.js):
 * entra con la ciudad vista desde arriba, crece por debajo de la última frase y estalla al salir el título BLACK HAWK DOWN.
 * ================================================================================================== */

const ISC = { on: false, hit: false, timer: null, next: 0, bar: 0 };
const ISC_PROG = [
  [38, 50, 53, 57],
  [34, 46, 50, 53],
  [31, 43, 50, 55],
  [33, 45, 49, 52]
];
function iscVol() {
  return soundOn && OPT.music !== false ? 0.72 : 0;
}
// empieza: el bordón, las cuerdas graves y los tambores lejanos; cada compás un poco más
function iscStart() {
  try {
    if (!AC || ISC.on) return;
    musInit();
    if (!MUS.out) return;
    Object.assign(ISC, { on: true, hit: false, bar: 0 });
    const now = AC.currentTime;
    MUS.out.gain.cancelScheduledValues(now);
    MUS.out.gain.setValueAtTime(0.0001, now);
    MUS.out.gain.linearRampToValueAtTime(iscVol(), now + 2.5);
    if (MUS.drone) MUS.drone.gain.setTargetAtTime(0.12, now, 0.5);
    ISC.next = now + 0.15;
    clearInterval(ISC.timer);
    ISC.timer = setInterval(iscTick, 120);
    iscTick();
  } catch (e) {}
}
function iscTick() {
  if (!ISC.on || ISC.hit || !AC) return;
  while (ISC.next < AC.currentTime + 0.5) {
    iscBar(ISC.next);
    ISC.next += MUS_BAR;
  }
}
function iscBar(t) {
  const b = ISC.bar++,
    k = Math.min(1, b / 4),
    ch = ISC_PROG[b % 4];
  musOst(t, ch[0], 0.5 + 0.5 * k);
  musBrass(t, ch, MUS_BAR, 0.3 + 0.55 * k);
  if (b >= 1) musChoir(t, ch, MUS_BAR, 0.3 + 0.5 * k);
  musTaiko(t, 0.5 + 0.45 * k);
  musTaiko(t + 2 * MUS_BEAT, 0.35 + 0.45 * k);
  if (b >= 2) {
    musTaiko(t + 1.5 * MUS_BEAT, 0.45 * k);
    musTaiko(t + 3.5 * MUS_BEAT, 0.5 * k);
    for (const s of [1, 3]) musSnare(t + s * MUS_BEAT, 0.35 * k);
  }
  if (b % 4 === 3) musTimp(t + 2 * MUS_BEAT, 2, ch[0]);
}
// la subida hasta el título: platillo creciendo, redoble de caja y de timbal durante «sec» segundos
function iscRise(sec) {
  if (!ISC.on || ISC.hit || !AC) return;
  try {
    const t = AC.currentTime + 0.05,
      beats = sec / MUS_BEAT;
    musSwell(t, beats);
    musTimp(t + Math.max(0, sec - 4 * MUS_BEAT), 4, 38);
    musRoll(t + Math.max(0, sec - 3 * MUS_BEAT), 3, 0.15, 1);
  } catch (e) {}
}
// el golpe del título: tambores, un acorde enorme de metales y coro, y el tema en la trompa, que se apaga despacio
function iscHit() {
  if (!ISC.on || ISC.hit || !AC) return;
  ISC.hit = true;
  clearInterval(ISC.timer);
  try {
    const t = AC.currentTime + 0.03;
    musTaiko(t, 1.6);
    musTaiko(t + 0.04, 1.2);
    musTaiko(t + 2 * MUS_BEAT, 0.9);
    // un golpe grave por debajo de todo
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.8, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(g);
    musSend(g, 0.6);
    o.start(t);
    o.stop(t + 3.1);
    // el platillo
    const s = AC.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = AC.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 4200;
    const sg = AC.createGain();
    sg.gain.setValueAtTime(0.28, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    s.connect(f);
    f.connect(sg);
    musSend(sg, 1);
    s.start(t);
    s.stop(t + 3.6);
    musBrass(t, [26, 38, 45, 50, 53, 57, 62], 6.5, 1.6);
    musChoir(t, [38, 50, 53, 57], 6.5, 1.3);
    musHorn(t + MUS_BEAT, MUS_THEME[0], 12, 1.1);
    musOst(t, 38, 0.9);
    musOst(t + MUS_BAR, 38, 0.6);
    MUS.out.gain.setTargetAtTime(0.0001, t + 6.5, 1.1);
  } catch (e) {}
}
function iscStop(fast) {
  if (!ISC.on) return;
  ISC.on = false;
  clearInterval(ISC.timer);
  try {
    if (MUS.out && AC) {
      const now = AC.currentTime;
      MUS.out.gain.cancelScheduledValues(now);
      MUS.out.gain.setValueAtTime(Math.max(0.0001, MUS.out.gain.value), now);
      MUS.out.gain.setTargetAtTime(0.0001, now, fast ? 0.12 : 1.2);
    }
  } catch (e) {}
}
