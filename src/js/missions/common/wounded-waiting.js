/* ====================================================================================================
 * missions/common/wounded-waiting.js
 *
 * Heridos tendidos junto al derribo, esperando
 * ================================================================================================== */

function woundedAt(x, z, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = findWalk(x + (k % 2) * 1.1, z + (k >> 1) * 1.2),
      rig = buildRig(k % 3 ? 'ranger' : 'delta', { gun: 'm16' });
    const d = irDecor(rig, c[0] + 0.5, c[1] + 0.5, rnd() * 6.28, { alive: false, down: true, look: null });
    rig.gun.visible = false;
    out.push(d);
  }
  G.m.wounded = out;
  return out;
}
