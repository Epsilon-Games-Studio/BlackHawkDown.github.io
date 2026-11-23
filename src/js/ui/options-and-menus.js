/* ====================================================================================================
 * ui/options-and-menus.js
 *
 * Opciones (guardadas en este navegador), menú de pausa y menú principal.
 * ================================================================================================== */

'use strict';

/* Opciones: guardadas en este navegador */
const OPT = { sound: true, autoP: true, draw: true, q: 1, rays: true, music: true };
try {
  Object.assign(OPT, JSON.parse(localStorage.getItem('bhd.opt') || '{}'));
} catch (e) {}
if (!OPT.q2) {
  OPT.q2 = 1;
  OPT.q = OPT.q >= 3 ? 2.5 : OPT.q >= 2 ? 1.5 : 1;
} // los pasos de antes eran más gruesos: todo el mundo sube uno
function saveOpt() {
  try {
    localStorage.setItem('bhd.opt', JSON.stringify(OPT));
  } catch (e) {}
}
function renderOpts() {
  const set = (id, on) => {
    const b = $(id);
    if (b) {
      b.setAttribute('aria-pressed', on);
      b.querySelector('em').textContent = L(on ? 'Sí' : 'No');
    }
  };
  for (const b of document.querySelectorAll('.langbtn')) b.setAttribute('aria-pressed', b.dataset.lang === LANG);
  set('opSound', soundOn);
  set('opAuto', OPT.autoP);
  set('opDraw', OPT.draw);
  set('opRays', OPT.rays !== false);
  set('opMusic', OPT.music !== false);
  for (const b of document.querySelectorAll('#opQ button')) b.setAttribute('aria-pressed', +b.dataset.q === OPT.q);
  const g = OPT.gfx || (GFX_PHONE ? 'mid' : 'high');
  for (const b of document.querySelectorAll('#opG button')) b.setAttribute('aria-pressed', b.dataset.g === g);
  set('opDyn', OPT.dyn !== false);
  set('opFps', !!OPT.fps);
}
$('opSound').onclick = () => setSound(!soundOn);
$('opAuto').onclick = () => {
  OPT.autoP = !OPT.autoP;
  if (G && MIS.id !== 'attract') G.autoP = OPT.autoP;
  $('bAuto').setAttribute('aria-pressed', OPT.autoP);
  saveOpt();
  renderOpts();
};
$('opDraw').onclick = () => {
  OPT.draw = !OPT.draw;
  saveOpt();
  renderOpts();
};
$('opRays').onclick = () => {
  OPT.rays = OPT.rays === false;
  saveOpt();
  renderOpts();
};
$('opMusic').onclick = () => {
  OPT.music = OPT.music === false;
  saveOpt();
  renderOpts();
};
// el navegador solo deja que suene algo después de un toque o una tecla: el primero, donde sea, despierta el audio para que pueda empezar la música
addEventListener(
  'pointerdown',
  () => {
    if (!AC) initAudio();
    else if (AC.state === 'suspended') AC.resume();
  },
  { once: true, capture: true }
);
addEventListener(
  'keydown',
  () => {
    if (!AC) initAudio();
    else if (AC.state === 'suspended') AC.resume();
  },
  { once: true, capture: true }
);
for (const b of document.querySelectorAll('#opQ button'))
  b.onclick = () => {
    OPT.q = +b.dataset.q;
    PS = OPT.q;
    resize();
    saveOpt();
    renderOpts();
  };
$('opBack').onclick = () => showScreen(optBack);
for (const b of document.querySelectorAll('#opG button'))
  b.onclick = () => {
    OPT.gfx = b.dataset.g;
    applyGfx();
    saveOpt();
    renderOpts();
  };
$('opDyn').onclick = () => {
  OPT.dyn = OPT.dyn === false;
  if (OPT.dyn === false) DYN.i = 0;
  saveOpt();
  renderOpts();
};
$('opFps').onclick = () => {
  OPT.fps = !OPT.fps;
  const el = $('fpsC');
  if (el) el.hidden = !OPT.fps;
  saveOpt();
  renderOpts();
};
{
  const el = document.createElement('div');
  el.id = 'fpsC';
  el.hidden = true;
  el.style.cssText =
    'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 3px);transform:translateX(-50%);z-index:60;pointer-events:none;font:600 11px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#f2ead8;background:rgba(0,0,0,.42);padding:1px 7px;border-radius:4px;letter-spacing:.04em';
  document.body.appendChild(el);
}
applyGfx();

/* Menú de pausa durante una misión */
function pauseMenu() {
  if (!G.started || G.over) return;
  G.wasPaused = G.paused;
  G.paused = true;
  updPause();
  showScreen('scrPause');
}
function resumeGame() {
  showScreen(null);
  G.paused = !!G.wasPaused;
  updPause();
}
$('bMenu').onclick = () => pauseMenu();
$('pResume').onclick = () => resumeGame();
$('pRestart').onclick = () => openMission(MIS.id, true);
$('pOpts').onclick = () => {
  optBack = 'scrPause';
  renderOpts();
  showScreen('scrOpts');
};
$('pQuit').onclick = () => {
  if (FLIGHT.on) endFlightQuiet();
  goMenu();
};
function endFlightQuiet() {
  for (const h of FLIGHT.helis) world.remove(h.g);
  FLIGHT = { on: false };
  FOCUS2 = null;
  document.body.classList.remove('cine');
  $('bSkip').hidden = true;
  $('cine').hidden = true;
  $('flyUnits').innerHTML = '';
}

/* Menú principal */
$('mCont').onclick = () => {
  const id = resumeMission();
  const go = () => openMission(id);
  if (!introSeen) playIntro(go);
  else go();
};
$('mCamp').onclick = () => {
  const go = () => {
    renderCampaign();
    showScreen('scrCamp');
  };
  if (!introSeen) playIntro(go);
  else go();
};
$('campIntro').onclick = () =>
  playIntro(() => {
    renderCampaign();
    showScreen('scrCamp');
  });
$('introSkip').onclick = e => {
  e.stopPropagation();
  stopIntro();
};
$('scrIntro').addEventListener('pointerdown', e => {
  if (e.target.id !== 'introSkip') stopIntro();
});
for (const b of document.querySelectorAll('.langbtn')) b.onclick = () => setLang(b.dataset.lang);
$('mTut').onclick = () => openMission('tutorial');
$('mOpts').onclick = () => {
  optBack = 'scrMenu';
  renderOpts();
  showScreen('scrOpts');
};
$('mCred').onclick = () => showScreen('scrCred');
