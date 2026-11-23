/* ====================================================================================================
 * core/game-state.js
 *
 * Estado de la partida
 *
 * El estado de la partida (G) y newGame(), que lo deja limpio antes de cada misión.
 * ================================================================================================== */

'use strict';

function newGame() {
  irReset();
  CONVOYS = [];
  SCRIPTED = [];
  convSyms = [];
  RPGS = [];
  TECHS = [];
  ROCKETS = [];
  RPG_CNT = 0;
  rpgCallT = -99;
  if (CINE.on) {
    CINE = { on: false };
    document.body.classList.remove('cine');
    $('bSkip').hidden = true;
    $('cine').hidden = true;
  }
  if (FLIGHT.on && FLIGHT.attract) {
    FLIGHT = { on: false };
    FOCUS2 = null;
  }
  // el estado de la partida existe antes de construir el mundo: los spawns de las misiones escriben en él
  G = {
    t: 0,
    started: false,
    paused: true,
    speed: 1,
    over: false,
    mode: 'move',
    sel: new Set(),
    roofs: false,
    kills: 0,
    waveSpawned: false,
    alert: false,
    lastKnown: null,
    ghosts: new Map(),
    visT: 0,
    hudT: 0,
    contactT: -9,
    fired: 0,
    startHour: missionHour(),
    startClock: Math.round(missionHour() * 3600),
    sun0: MIS.sunHour != null ? MIS.sunHour : missionHour(),
    sunShift: 0,
    sub: 0,
    subStarted: false,
    subsDone: [],
    downs: 0,
    autoP: OPT.autoP,
    lastAuto: -9,
    chain: false,
    noise: [],
    civT: 15,
    draft: null,
    nv: false,
    nvGlare: 0,
    m: {},
    dt: 0,
    endAt: null,
    noLose: !!MIS.noLose
  };
  buildWorld();
  G.sel = new Set(us.filter(u => u.alive && !u.npc));
  $('bAuto').setAttribute('aria-pressed', G.autoP);
  if ($('oNV')) $('oNV').setAttribute('aria-pressed', false);
  resetSupport();
  CRATES = [];
  camS.tx = MIS.cam[0];
  camS.tz = MIS.cam[1];
  camS.zoom = camS.zoomT = 13;
  camS.yaw = camS.yawT = -Math.PI * 0.75;
  camS.zoom = camS.zoomT = MIS.cam[2] || 13;
  $('log').innerHTML = '';
  if (MIS.id !== 'irene') clearChat();
  mapMode = 'city';
  $('oChain').setAttribute('aria-pressed', false);
  $('subs').innerHTML = '';
  FORMS = [];
  buildCards();
  setMode('move');
  hint('');
}
