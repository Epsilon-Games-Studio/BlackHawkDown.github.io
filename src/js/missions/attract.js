/* ====================================================================================================
 * missions/attract.js
 *
 * La pantalla de título: un combate en el objetivo, sin fin
 * ================================================================================================== */

MISSIONS.attract = {
  id: 'attract',
  n: -1,
  hidden: true,
  title: 'Black Hawk Down',
  hud: '',
  phase: 'day',
  hour: 15.7,
  crashed: [],
  start: [258, 236],
  cam: [264, 234, 15],
  civ: [256, 256],
  summary: '',
  text: '',
  spawn() {
    spawnForce([]);
    for (const [x, z, k] of [
      [250, 214, 'post'],
      [247, 222, 'rifle'],
      [280, 238, 'post'],
      [276, 214, 'rifle'],
      [252, 252, 'post'],
      [266, 252, 'rifle'],
      [244, 236, 'rifle'],
      [284, 226, 'post'],
      [257, 200, 'post'],
      [290, 230, 'rifle']
    ])
      foe(x, z, k, 'a', { acc: 0.12 });
    G.alert = true;
  },
  subs: [{ text: '', zone: { x: 267.5, z: 229, r: 1 }, tick: () => attractTick(), done: () => false }],
  opt: []
};
/* La pantalla de título repite la inserción de Irene sobre el objetivo una y otra vez, mientras la milicia se pega con los que bajan */
function launchAttractFlight() {
  startFlight({ attract: true });
  let n = 0;
  while (FLIGHT.on && FLIGHT.L - FLIGHT.s > 230 && n++ < 4000) updFlight(0.25);
  for (let k = 0; k < 8 && FLIGHT.on; k++) updFlight((3 * 0.65) / 8);
}
function attractFlight(F, dt) {
  // uno que ya está en el suelo y en posición pasa a ser un soldado que combate
  for (let k = F.men.length - 1; k >= 0; k--) {
    const m = F.men[k];
    if (m.mode !== 'cover' || m.y > 1) continue;
    const delta = m.unit >= 4,
      sp = delta ? Object.assign({}, DELTA[k % 6], DSPEC) : Object.assign({}, RANGERS[k % 6], RSPEC);
    const c = nearestFree(Math.floor(m.x), Math.floor(m.z)),
      u = makeUnit('us', c[0], c[1], Object.assign({ kind: 'us' }, sp));
    u.face = m.face;
    u.stance = 'crouch';
    world.remove(m.m.root);
    F.men.splice(k, 1);
  }
  // la milicia dispara a los helicópteros cuando entran bajos
  F.aT = (F.aT || 0) - dt;
  if (F.aT <= 0) {
    F.aT = 0.35;
    const H_ = F.helis.filter(h => !h.gone && h.y > 2 && h.y < 34);
    if (H_.length) {
      const h = pick(H_),
        E = them.filter(e => e.alive && Math.hypot(e.x - h.x, e.z - h.z) < 50);
      if (E.length) {
        const e = pick(E);
        e.face = Math.atan2(h.x - e.x, h.z - e.z);
        e.firing = 0.5;
        tracer(e.x, 1.2, e.z, h.x + rr(-2, 2), h.y + rr(0, 2), h.z + rr(-2, 2), 0xffd27a, 0);
      }
    }
  }
  const down =
    F.helis.filter(h => !h.lb).every(h => h.doneT) &&
    F.helis.filter(h => h.lb).every(h => !h.pax || h.pax.every(p => p.gone));
  if (down && !F.cycT) F.cycT = F.t;
  if (F.cycT && F.t > F.cycT + 55) restartAttractFlight();
}
function restartAttractFlight() {
  const F = FLIGHT;
  for (const h of F.helis) world.remove(h.g);
  for (const r of F.ropes || []) world.remove(r);
  for (const R of FROPES) world.remove(R.m);
  FROPES = [];
  for (const e of F.smoke || []) {
    const i = emitters.indexOf(e);
    if (i >= 0) emitters.splice(i, 1);
  }
  for (const m of F.men) world.remove(m.m.root);
  for (const u of us) {
    world.remove(u.m.root);
    dropOverlay(u);
  }
  units = units.filter(u => u.team !== 'us');
  us = [];
  const yaw = F.attYaw;
  FLIGHT = { on: false };
  launchAttractFlight();
  FLIGHT.attYaw = yaw;
}
function attractTick() {
  const T_ = irT(),
    cx = T_ ? T_.x + T_.w / 2 : 267.5,
    cz = T_ ? T_.y + T_.d / 2 : 229;
  if (them.filter(e => e.alive).length < 10 && G.t > (G.m.nextW || 0)) {
    G.m.nextW = G.t + 7;
    const a = rnd() * 6.283;
    for (let k = 0; k < 3; k++) {
      const e = foe(cx + Math.cos(a) * 30 + rr(-3, 3), cz + Math.sin(a) * 30 + rr(-3, 3), 'wave', 'a', { acc: 0.1 });
      e.goal = { x: cx + rr(-10, 10), z: cz + rr(-6, 14) };
    }
  }
  for (const e of them)
    if (!e.alive && G.t - (e.deathT || 0) > 25 && e.m.root.parent) {
      world.remove(e.m.root);
      dropOverlay(e);
    }
  them = them.filter(e => e.alive || G.t - (e.deathT || 0) < 26);
  units = units.filter(u => u.team !== 'them' || them.includes(u));
  for (const u of us) {
    if (u.down) {
      u.down = false;
      u.alive = true;
      u.hp = 80;
    }
    if (u.hp < 60) u.hp = 80;
    if (u.ammo < 60) u.ammo = u.ammo0;
  }
  if (!FLIGHT.on) {
    camS.tx += (cx - 3 - camS.tx) * 0.02;
    camS.tz += (cz + 4 - camS.tz) * 0.02;
  }
}
const CAMPAIGN = ['irene', 'hawl', 's61', 'wolcott', 'convoy', 's64', 'perim', 'night', 'mile'];
let missionSel = 'attract',
  MIS = MISSIONS.attract;
function setHudTitle() {
  document.querySelector('.mission .eyebrow').textContent =
    (MIS.n > 0 ? L('Misión') + ' ' + MIS.n + ' · ' : '') + L(MIS.title);
  $('obj').textContent = L(MIS.hud);
}
function setMission(id) {
  missionSel = id;
  MIS = MISSIONS[id];
  phaseSel = MIS.phase || 'day';
  if (MIS.squad) squadType = MIS.squad;
  newGame();
  setPhase(phaseSel);
  setHudTitle();
}
