/* ====================================================================================================
 * sim/force-groups.js
 *
 * La fuerza: grupos de hombres, cada uno con su ficha, como los chalks de Irene
 * ================================================================================================== */

const SPAWN_OFF = [
  [0, 0],
  [1.3, 1.2],
  [-1.3, 1.2],
  [1.3, -1.2],
  [-1.3, -1.2],
  [2.6, 0],
  [-2.6, 0],
  [0, 2.5],
  [0, -2.5],
  [2.6, 2.5]
];
function spawnForce(defs) {
  for (const u of us) {
    world.remove(u.m.root);
    dropOverlay(u);
  }
  units = units.filter(u => u.team !== 'us');
  us = [];
  IRN = { groups: [] };
  for (const d of defs) addGroup(d);
  return IRN.groups;
}
function addGroup(d) {
  if (!IRN.groups) IRN.groups = [];
  const gi = IRN.groups.length,
    g = { name: d.name, role: d.role || '', kind: d.kind || 'chalk', members: [] };
  IRN.groups.push(g);
  (d.specs || []).forEach((sp, k) =>
    addMember(g, sp, d.at[0] + SPAWN_OFF[k % SPAWN_OFF.length][0], d.at[1] + SPAWN_OFF[k % SPAWN_OFF.length][1], d.face)
  );
  if (G && G.started) buildCards();
  return g;
}
function addMember(g, sp, x, z, face) {
  const c = findWalk(x, z),
    gi = IRN.groups.indexOf(g);
  const u = makeUnit('us', c[0], c[1], Object.assign({ kind: 'us', grp: gi }, sp));
  if (face != null) u.face = face;
  g.members.push(u);
  return u;
}
const grpN = n => (IRN.groups ? IRN.groups.find(g => g.name === n) : null);
const gLive = g => (g ? g.members.filter(u => u.alive) : []);
const gIn = (g, x, z, r) => gLive(g).filter(u => Math.hypot(u.x - x, u.z - z) < r).length;
const gNeed = (g, need) => Math.min(need || 4, gLive(g).length);
const gReady = (g, x, z, r, need) => gLive(g).length > 0 && gIn(g, x, z, r) >= gNeed(g, need);
// milicia que de verdad puede disparar a un punto: dentro del radio y, o bien vista, o con línea de tiro hasta él
const foesNear = (x, z, r) =>
  them.filter(e => e.alive && Math.hypot(e.x - x, e.z - z) < r && (e.spotted || los(e.x, e.z, x, z))).length;
const usNear = (x, z, r) => us.filter(u => u.alive && Math.hypot(u.x - x, u.z - z) < r).length;
function ringAt(x, z, r, col) {
  const m = ovRing(r - 0.35, r, col || 0x7fb6ff, 0.8);
  m.position.set(x, 0.05, z);
  return grounded(m, 0.08);
}

/* Una oleada que corre hacia un punto, no hacia la escuadra */
