/* ====================================================================================================
 * boot/splash.js
 *
 * El logo de Épsilon Games Studio al abrir la página: se monta solo, suena y se abre como las puertas
 * de un hangar hacia la pantalla de título. Va aparte del juego para que salga mientras carga todo lo demás.
 * ================================================================================================== */


(function () {
  'use strict';
// ---- ya no hay código de acceso: el logo del estudio sale nada más abrir la página y luego la pantalla de título
var sp = document.getElementById('epsSplash');
var EVS = [
  'keydown',
  'keyup',
  'pointerdown',
  'pointerup',
  'touchstart',
  'touchend',
  'mousedown',
  'mouseup',
  'click',
  'wheel'
];
// ---- golpe sonoro del logo: un barrido que sube y un impacto grave cuando aterriza el símbolo (nada de campanita en el nombre)
var AC = null,
  OUT = null,
  muted = false;
try {
  var o = JSON.parse(localStorage.getItem('bhd.opt') || '{}');
  muted = o.sound === false;
} catch (e) {}
function noise(sec) {
  var b = AC.createBuffer(1, Math.ceil(AC.sampleRate * sec), AC.sampleRate),
    d = b.getChannelData(0);
  for (var k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  var s = AC.createBufferSource();
  s.buffer = b;
  return s;
}
function env(gn, t, a, peak, rel) {
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(peak, t + a);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + a + rel);
}
function audioStart() {
  if (muted) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    var cp = AC.createDynamicsCompressor();
    OUT = AC.createGain();
    OUT.gain.value = 0.8;
    OUT.connect(cp);
    cp.connect(AC.destination);
    var t = AC.currentTime;
    var w = noise(1.3),
      bp = AC.createBiquadFilter(),
      wg = AC.createGain();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(260, t + 0.2);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 1.3);
    wg.gain.setValueAtTime(0.0001, t + 0.2);
    wg.gain.exponentialRampToValueAtTime(0.16, t + 1.22);
    wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.42);
    w.connect(bp);
    bp.connect(wg);
    wg.connect(OUT);
    w.start(t + 0.2);
    w.stop(t + 1.5);
    var o = AC.createOscillator(),
      og = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(78, t + 1.25);
    o.frequency.exponentialRampToValueAtTime(34, t + 2.6);
    env(og, t + 1.25, 0.015, 0.55, 1.9);
    o.connect(og);
    og.connect(OUT);
    o.start(t + 1.25);
    o.stop(t + 3.3);
    var h = noise(0.6),
      lp = AC.createBiquadFilter(),
      hg = AC.createGain();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    env(hg, t + 1.25, 0.01, 0.22, 0.45);
    h.connect(lp);
    lp.connect(hg);
    hg.connect(OUT);
    h.start(t + 1.25);
    h.stop(t + 1.9);
  } catch (e) {
    AC = null;
  }
}
function rumble() {
  if (!AC) return;
  try {
    var t = AC.currentTime,
      n = noise(1.8),
      lp = AC.createBiquadFilter(),
      ng = AC.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(140, t);
    lp.frequency.linearRampToValueAtTime(320, t + 1.1);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.3, t + 0.35);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(OUT);
    n.start(t);
    n.stop(t + 1.8);
    setTimeout(function () {
      try {
        AC.close();
      } catch (e) {}
    }, 2600);
  } catch (e) {}
}

// después del código: deshago el zoom que hiciera el móvil sobre la caja del código
function unZoom() {
  var m = document.querySelector('meta[name=viewport][content*="user-scalable"]');
  if (!m) return;
  var c = m.getAttribute('content');
  m.setAttribute(
    'content',
    'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no'
  );
  setTimeout(function () {
    m.setAttribute('content', c);
    try {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('resize'));
    } catch (e) {}
  }, 350);
}
// ---- secuencia: el logo se monta solo y luego el negro se va rápido hacia la pantalla de título, cuya animación arranca en ese momento
var T = [],
  phase = 0;
function at(ms, fn) {
  T.push(setTimeout(fn, ms));
}
function sblock(e) {
  if (!sp.isConnected) return;
  e.stopImmediatePropagation();
  if (e.cancelable) e.preventDefault();
  if ((e.type === 'pointerdown' || e.type === 'keydown') && phase === 1) skip();
}
function exitLogo(fast) {
  phase = 2;
  sp.classList.add('out');
  at(fast ? 260 : 480, reveal);
}
function reveal() {
  phase = 3;
  window.__gateOpen = true;
  if (window.__onGateOpen) {
    var f = window.__onGateOpen;
    window.__onGateOpen = null;
    f();
  }
  var tt = document.getElementById('scrTitle');
  if (tt) {
    tt.classList.remove('tt-in');
    void tt.offsetWidth;
    tt.classList.add('tt-in');
  }
  sp.classList.add('fade');
  at(600, finish);
}
function finish() {
  phase = 4;
  if (AC)
    setTimeout(function () {
      try {
        AC.close();
      } catch (e) {}
    }, 1500);
  sp.remove();
  EVS.forEach(function (t) {
    removeEventListener(t, sblock, true);
  });
}
function skip() {
  T.forEach(clearTimeout);
  T = [];
  exitLogo(true);
}
function splash() {
  sp.hidden = false;
  EVS.forEach(function (t) {
    addEventListener(t, sblock, { capture: true, passive: false });
  });
  audioStart();
  void sp.offsetWidth;
  sp.classList.add('es-go');
  phase = 1;
  at(4600, function () {
    exitLogo(false);
  });
}
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', splash);
else splash();
})();
