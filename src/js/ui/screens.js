/* ====================================================================================================
 * ui/screens.js
 *
 * Pantallas: título, menú principal, campaña, briefing, final, opciones, créditos y pausa
 * ================================================================================================== */

'use strict';

const SCREENS = [
  'scrTitle',
  'scrMenu',
  'scrCamp',
  'brief',
  'endScr',
  'scrOpts',
  'scrCred',
  'scrPause',
  'scrLoad',
  'scrIntro',
  'scrMan'
];
let SCREEN = 'scrTitle',
  optBack = 'scrMenu';
function showScreen(n) {
  SCREEN = n;
  if (n) {
    const el = $('curtain');
    if (el) {
      el.hidden = true;
      el.style.opacity = 0;
      el.classList.remove('epi');
    }
    m9EpiClear();
  }
  if (n === 'scrMenu') renderSaveInfo();
  for (const id of SCREENS) {
    const el = $(id);
    if (el) el.hidden = id !== n;
  }
  const ov = $('overlay');
  ov.hidden = !n;
  ov.classList.toggle('ov-title', n === 'scrTitle');
  ov.classList.toggle('ov-intro', n === 'scrIntro');
  ov.classList.toggle('ov-menu', n === 'scrMenu' || n === 'scrCred' || (n === 'scrOpts' && MIS.id === 'attract'));
  document.body.classList.toggle('attract', !!MIS && MIS.id === 'attract');
  document.body.classList.toggle('menuopen', !!n && !(n === 'brief' && $('overlay').classList.contains('peek')));
  if (n) closeCtx();
}
function initSound() {
  if (!AC) initAudio();
  else if (AC.state === 'suspended') AC.resume();
  startRotorSound();
}
// el toque que sale del título no puede caer también en el botón del menú que aparece bajo el dedo
function leaveTitle() {
  initSound();
  showScreen('scrMenu');
  const t0 = performance.now(),
    eat = e => {
      if (performance.now() - t0 < 500) {
        e.stopPropagation();
        e.preventDefault();
      }
      removeEventListener('click', eat, true);
    };
  addEventListener('click', eat, true);
  setTimeout(() => removeEventListener('click', eat, true), 600);
}
function startAttract() {
  setMission('attract');
  G.started = true;
  G.paused = false;
  G.autoP = false;
  G.speed = 0.65;
  document.body.classList.add('att-blur');
  launchAttractFlight();
  camS.yaw = camS.yawT;
  camS.zoom = camS.zoomT;
  setTimeout(() => document.body.classList.remove('att-blur'), 1100);
}
/* La pantalla de carga: la parte pesada que bloquea se ejecuta cuando la pantalla ya se ha pintado; la barra se llena con los pasos,
   con una nota del manual de campo para leer mientras tanto */
let ldTipK = -1;
function loadSeq(eye, title, sub, steps, work, done) {
  $('ldEye').textContent = L(eye);
  $('ldTitle').textContent = L(title);
  $('ldSub').textContent = L(sub || '');
  const tips = FIELD_TIPS;
  ldTipK = (ldTipK + 1 + Math.floor(Math.random() * (tips.length - 1))) % tips.length;
  $('ldTip').textContent = L(tips[ldTipK]);
  const fill = $('ldFill'),
    st = $('ldStep'),
    bar = fill.parentNode;
  const set = (f, t) => {
    fill.style.width = (f * 100).toFixed(0) + '%';
    bar.setAttribute('aria-valuenow', Math.round(f * 100));
    if (t) st.textContent = L(t);
  };
  fill.style.transition = 'none';
  set(0, steps[0]);
  void fill.offsetWidth;
  fill.style.transition = '';
  showScreen('scrLoad');
  const t0 = performance.now();
  setTimeout(() => {
    set(0.18, steps[0]);
    setTimeout(() => {
      set(0.34, steps[1]);
      setTimeout(() => {
        work(); // bloquea mientras se construye la ciudad
        const n = steps.length - 2,
          dur = Math.max(450, 1300 - (performance.now() - t0));
        for (let k = 0; k < n; k++)
          setTimeout(() => set(0.34 + (0.66 * (k + 1)) / n, steps[k + 2]), (dur * (k + 1)) / (n + 1));
        setTimeout(done, dur + 160);
      }, 60);
    }, 220);
  }, 30);
}
const LOAD_STEPS = [
  'Recibiendo las órdenes…',
  'Cargando el mapa de Mogadiscio…',
  'Desplegando las unidades…',
  'Comprobando las radios…',
  'Listos para salir'
];
function goMenu() {
  loadSeq(
    'Regresando',
    'Cuartel general',
    'Aeropuerto de Mogadiscio',
    ['Cerrando la misión…', 'Volviendo a la base…', 'Listo'],
    () => startAttract(),
    () => showScreen('scrMenu')
  );
}
const nextMission = () => {
  const k = CAMPAIGN.indexOf(MIS.id);
  return k >= 0 && k < CAMPAIGN.length - 1 ? CAMPAIGN[k + 1] : null;
};
const hhmm = h => {
  const m = Math.round(h * 60);
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
function openMission(id, direct) {
  markLast(id);
  const M_ = MISSIONS[id] || {};
  loadSeq(
    M_.n > 0 ? `Misión ${M_.n}` : 'Instrucción',
    M_.title || 'Mogadiscio',
    `${M_.date || '3 OCT 1993'} · ${hhmm(M_.hour || 12)} · ${M_.place || 'Mogadiscio'}`,
    LOAD_STEPS,
    () => {
      setMission(id);
      if (id === 'irene') {
        const a_ = cmusEl();
        if (a_) a_.load();
      }
    },
    () => {
      if (direct) startMission();
      else {
        fillBrief();
        showScreen('brief');
      }
    }
  );
}
function fillBrief() {
  $('bDate').textContent = `${MIS.date || '3 OCT 1993'} · ${hhmm(MIS.hour)} · ${L('MOGADISCIO')}`;
  $('bEyebrow').textContent = MIS.n > 0 ? `${L('Misión')} ${MIS.n} · ${hhmm(MIS.hour)}` : L('Instrucción');
  $('bTitle').textContent = L(MIS.title);
  $('bName').textContent = L(MIS.title);
  $('bCard').textContent = L(MIS.summary || '');
  $('bText').textContent = L(MIS.text || '');
  $('bPlace').textContent = L(MIS.place || '');
  $('bSquad').textContent = L(MIS.squadTxt || '');
  $('bOpt').textContent = ['Que nadie caiga']
    .concat((MIS.opt || []).map(o => o.text))
    .map(L)
    .join(' · ');
  $('bBack').textContent = L(MIS.id === 'tutorial' ? 'Menú principal' : 'Campaña');
  $('bFinale').hidden = !FINALES[MIS.id];
}
$('bBack').onclick = () => {
  if (MIS.id === 'tutorial') goMenu();
  else {
    renderCampaign();
    showScreen('scrCamp');
  }
};
