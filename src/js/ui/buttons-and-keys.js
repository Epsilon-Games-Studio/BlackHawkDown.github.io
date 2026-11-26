/* ====================================================================================================
 * ui/buttons-and-keys.js
 *
 * Botones y teclas
 * ================================================================================================== */

function updPause() {
  $('bPause').innerHTML = G.paused
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  $('bPause').setAttribute('aria-label', L(G.paused ? 'Reanudar' : 'Pausa'));
  $('bPause').title = L(G.paused ? 'Reanudar' : 'Pausa') + (LANG === 'en' ? ' (Space)' : ' (Espacio)');
  $('bPause').setAttribute('aria-pressed', G.paused && G.started && !G.over);
}
$('bPause').onclick = () => {
  if (!G.started || G.over) return;
  G.paused = !G.paused;
  updPause();
  if (!G.paused) hint('');
};
$('bMap').onclick = () => openMap(true);
$('bMap2').onclick = () => openMap(true);
$('mpClose').onclick = () => openMap(false);
$('mpCity').onclick = () => {
  mapMode = 'city';
  openMap(true);
};
$('mpReg').onclick = () => {
  mapMode = 'reg';
  openMap(true);
};
$('cMap').onclick = () => openMap(true);
$('bSkip').onclick = () => {
  // una escena de la introducción: se acaba y siguen los textos
  if (PRO.on) {
    proStop();
    return;
  }
  if (CINE.on) {
    cineSkip();
    return;
  }
  if (FLIGHT.mis) {
    let n = 0;
    while (FLIGHT.on && n++ < 1600) updFlight(0.25);
  } else endFlight();
};
{
  const mp = document.querySelector('.mission'),
    tg = () => {
      mp.classList.toggle('open');
      mp.setAttribute('aria-expanded', mp.classList.contains('open'));
      placeChat();
    };
  mp.addEventListener('click', tg);
  mp.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      tg();
    }
  });
}
$('chatHead').onclick = () => toggleChat();
$('chatLive').onclick = () => toggleChat(true);
$('fZin').onclick = () => zoomBy(1 / 1.25);
$('fZout').onclick = () => zoomBy(1.25);
$('fRotL').onclick = () => {
  if (FLIGHT.on) FLIGHT.uyaw -= Math.PI / 4;
  else if (CINE.on) CINE.uyaw -= Math.PI / 4;
};
$('fRotR').onclick = () => {
  if (FLIGHT.on) FLIGHT.uyaw += Math.PI / 4;
  else if (CINE.on) CINE.uyaw += Math.PI / 4;
};
addEventListener('keydown', e => {
  if (CINE.on && (SCREEN == null || PRO.on)) {
    const k = e.key.toLowerCase();
    if (k === 'pageup' || k === 'pagedown') {
      e.preventDefault();
      tiltBy(((k === 'pageup' ? 10 : -10) * Math.PI) / 180);
    } else if (k === 'q') CINE.uyaw -= Math.PI / 4;
    else if (k === 'e') CINE.uyaw += Math.PI / 4;
    else if (k === '+' || k === '=') zoomBy(1 / 1.25);
    else if (k === '-') zoomBy(1.25);
    return;
  }
  if (!FLIGHT.on || FLIGHT.attract) return;
  const k = e.key.toLowerCase();
  if (k === 'pageup' || k === 'pagedown') {
    e.preventDefault();
    tiltBy(((k === 'pageup' ? 10 : -10) * Math.PI) / 180);
  } else if (k === 'q') FLIGHT.uyaw -= Math.PI / 4;
  else if (k === 'e') FLIGHT.uyaw += Math.PI / 4;
  else if (k === '+' || k === '=') zoomBy(1 / 1.25);
  else if (k === '-') zoomBy(1.25);
  else if (k >= '1' && k <= '6') flightSelect(+k - 1);
});
$('bAuto').onclick = () => {
  G.autoP = !G.autoP;
  OPT.autoP = G.autoP;
  saveOpt();
  $('bAuto').setAttribute('aria-pressed', G.autoP);
};
$('oChain').onclick = () => {
  setMode('move');
  hint(
    alive().length ? 'Ruta nueva: toca el suelo punto a punto' : 'Selecciona una unidad y toca el suelo punto a punto'
  );
};
/* Selector de formación: funciona como el menú de apoyo. La elección se queda en los hombres seleccionados */
function formMenu(on) {
  const m = $('formMenu');
  on = on == null ? m.hidden : on;
  m.hidden = !on;
  $('oForm').setAttribute('aria-expanded', on);
  if (on) {
    const cur = formOfSel();
    for (const b of m.querySelectorAll('.fopt')) b.setAttribute('aria-pressed', !!cur && cur.type === b.dataset.f);
    const r = $('oForm').getBoundingClientRect(),
      w = m.offsetWidth;
    m.style.left = Math.round(clamp(r.left, 8, innerWidth - w - 8)) + 'px';
    m.style.bottom = Math.round(innerHeight - r.top + 6) + 'px';
  }
}
$('oForm').onclick = e => {
  e.stopPropagation();
  formMenu();
};
addEventListener('pointerdown', e => {
  if (!$('formWrap').contains(e.target)) formMenu(false);
});
for (const b of document.querySelectorAll('#formMenu .fopt'))
  b.onclick = () => {
    formMenu(false);
    setFormation(b.dataset.f);
  };
function missionHour() {
  return MIS && MIS.hour != null ? MIS.hour : PHASES[phaseSel].h;
}
function setPhase(ph) {
  phaseSel = ph;
  const hr = missionHour();
  G.startHour = hr;
  G.startClock = Math.round(hr * 3600);
  G.sun0 = MIS.sunHour != null ? MIS.sunHour : hr;
  setSun(G.sun0);
  updSupBtns();
}
$('bPeek').onclick = () => {
  const on = !$('overlay').classList.contains('peek');
  $('overlay').classList.toggle('peek', on);
  $('brief').classList.toggle('peek', on);
  $('bPeek').textContent = L(on ? 'Volver al briefing' : 'Ver escenario');
  $('bPeek').setAttribute('aria-pressed', on);
};
function startMission() {
  showScreen(null);
  $('overlay').classList.remove('peek');
  $('brief').classList.remove('peek');
  $('bPeek').textContent = L('Ver escenario');
  if (MIS.flight) return irStartMission();
  G.started = true;
  G.paused = false;
  G.speed = 1;
  $('bSpeed').textContent = '1×';
  updSupBtns();
  camS.tx = MIS.cam[0];
  camS.tz = MIS.cam[1];
  camS.zoomT = MIS.cam[2];
  camS.yawT = -Math.PI * 0.75;
  if (!AC) initAudio();
  else if (AC.state === 'suspended') AC.resume();
  startRotorSound();
  updPause();
  renderSubs();
  refreshCards();
  if (MIS.intro && us[0]) radio(us[0], MIS.intro);
  for (const [w, t, c] of MIS.introSay || []) {
    const g = grpN(w);
    if (g && gLive(g)[0]) radio(gLive(g)[0], t);
    else say(w, t, c);
  }
  hint((MIS.subs[0] && MIS.subs[0].tip) || 'Selecciona y toca el suelo: la línea marca la ruta. Espacio pausa.');
  if (MIS.onStart) MIS.onStart();
}
$('bSpeed').onclick = () => {
  G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 0.5 : 1;
  $('bSpeed').textContent = (G.speed === 0.5 ? '½' : G.speed) + '×';
};
const setSound = on => {
  soundOn = on;
  OPT.sound = on;
  saveOpt();
  $('bSound').setAttribute('aria-pressed', !soundOn);
  $('bSound').innerHTML = soundOn
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';
  $('bSound').setAttribute('aria-label', L(soundOn ? 'Sonido' : 'Silencio'));
  if (AC && rotorGain && !on) rotorGain.gain.setTargetAtTime(0, AC.currentTime, 0.1);
  renderOpts();
};
$('bSound').onclick = () => setSound(!soundOn);
$('cRotL').onclick = () => {
  camS.yawT -= Math.PI / 2;
};
$('cRotR').onclick = () => {
  camS.yawT += Math.PI / 2;
};
// inclinar: un toque, 5º; manteniendo pulsado, sigue subiendo o bajando
for (const [id, sg] of [
  ['cTiltU', 1],
  ['cTiltD', -1],
  ['fTiltU', 1],
  ['fTiltD', -1]
]) {
  const b = $(id);
  let iv = null;
  const stop = () => {
    clearInterval(iv);
    iv = null;
  };
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    tiltBy((sg * 5 * Math.PI) / 180);
    stop();
    iv = setInterval(() => tiltBy((sg * 3 * Math.PI) / 180), 70);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
  b.onclick = e => e.stopPropagation();
}
// tocar el número vuelve al ángulo de siempre
$('cTiltV').onclick = $('fTiltV').onclick = () => tiltBy(PITCH_DEF - Math.max(camS.pitchU == null ? PITCH_DEF : camS.pitchU, camS.floor || PITCH_LO));
$('cZin').onclick = () => zoomBy(1 / 1.25);
$('cZout').onclick = () => zoomBy(1.25);

function selectAll() {
  G.sel = new Set(us.filter(u => u.alive && !u.npc));
  refreshCards();
}
$('oMed').onclick = () => cmdTreat();
$('oAtk').onclick = () => setMode(G.mode === 'attack' ? 'move' : 'attack');
$('oSup').onclick = () => setMode(G.mode === 'suppress' ? 'move' : 'suppress');
$('oCov').onclick = () => {
  if (alive().length) cmdCover();
};
$('oStop').onclick = () => cmdStop();
$('oNV').onclick = () => {
  setNV(!G.nv);
  supMenu(false);
};
function supMenu(on) {
  const m = $('supMenu');
  on = on == null ? m.hidden : on;
  m.hidden = !on;
  $('oSupport').setAttribute('aria-expanded', on);
  if (on) {
    const r = $('oSupport').getBoundingClientRect(),
      w = m.offsetWidth;
    m.style.left = Math.round(clamp(r.right - w, 8, innerWidth - w - 8)) + 'px';
    m.style.bottom = Math.round(innerHeight - r.top + 6) + 'px';
  }
}
$('oSupport').onclick = e => {
  e.stopPropagation();
  supMenu();
};
addEventListener('pointerdown', e => {
  if (!$('supWrap').contains(e.target)) supMenu(false);
});
$('oLB').onclick = () => {
  supMenu(false);
  if (!SUP || SUP.lbN <= 0) {
    hint('No quedan pasadas de Little Bird');
    return;
  }
  setMode(G.mode === 'lb' ? 'move' : 'lb');
};
$('oFlr').onclick = () => {
  supMenu(false);
  if (nightF <= 0.25) {
    hint('Las bengalas solo están disponibles de noche');
    return;
  }
  if (!SUP || SUP.flN <= 0) {
    hint('No quedan bengalas');
    return;
  }
  setMode(G.mode === 'flare' ? 'move' : 'flare');
};
$('bStart').onclick = () => startMission();
