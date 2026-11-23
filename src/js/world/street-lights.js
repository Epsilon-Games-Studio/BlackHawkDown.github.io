/* ====================================================================================================
 * world/street-lights.js
 *
 * Farolas (pocas, muchas rotas), bidones con fuego y ventanas encendidas: la luz propia de la ciudad de noche
 * ================================================================================================== */

'use strict';

let LIGHTSRC = [],
  GLOWS = [],
  glowMesh = null;
function lamp(x, z, ry, on) {
  MAT = M.METAL;
  const s = Math.sin(ry),
    c = Math.cos(ry);
  B(x, 2.6, z, 0.16, 5.2, 0.16, 0x5a5a56, { hid: 1 });
  prop('lights', 'lamp', x, 0, z, ry, 1, 0xffffff);
  const hx = x + s * 0.98,
    hz = z + c * 0.98;
  if (on) {
    GLOWS.push([hx, 4.79, hz, 0xffc27a, 0.2, 0.05, 0.34]);
    LIGHTSRC.push({ x: hx, y: 4.4, z: hz, col: 0xffb36a, i: 2.4, d: 12, fl: 0, lamp: 1 });
  }
}
function fireBarrel(i, j) {
  if (!walk(i, j)) return;
  const o = addCover('barrel', i, j);
  if (!o) return;
  const em = {
    x: i + 0.5,
    z: j + 0.5,
    y: 1.25,
    rate: 16,
    life: 8,
    vy: 1.15,
    s0: 0.24,
    s1: 1.8,
    fire: 0.45,
    acc: 0,
    sp: 0.24
  };
  em.lsrc = true;
  emitters.push(em);
  const ls = { x: i + 0.5, y: 1.5, z: j + 0.5, col: 0xff7428, i: 2.6, d: 9, fl: 1 };
  LIGHTSRC.push(ls);
  o.em = em;
  o.ls = ls;
}
function planLights() {
  const along = (vert, fixed, a, b, step, side) => {
    for (let t = a; t <= b; t += step) {
      const x = vert ? fixed : t,
        z = vert ? t : fixed,
        i = Math.floor(x),
        j = Math.floor(z);
      if (!inB(i, j) || grid[idx(i, j)] !== 0 || cityDs(x, z) < 0.4 || coastS(x, z) > -27) continue;
      lamp(x, z, side, rnd() < 0.62);
    }
  };
  along(true, MILE_X - 3.6, 100, 405, 17, Math.PI / 2);
  along(true, OX + 28.6, 12, H - 12, 22, Math.PI / 2);
  along(false, OZ + 27.6, 12, W - 12, 23, 0);
  along(false, 317.6, 30, W - 12, 24, 0);
  along(true, 289.6, 40, 480, 26, Math.PI / 2);
  along(false, 217.6, 20, 500, 26, 0);
  const spots = [];
  for (let n = 0; n < 6000 && spots.length < 130; n++) {
    const i = 20 + ri(W - 40),
      j = 20 + ri(H - 40),
      k = idx(i, j);
    if (!STR[k] || grid[k] !== 0 || reserved[k] || cityDs(i, j) < 0.3) continue;
    if (spots.some(p => Math.hypot(p[0] - i, p[1] - j) < 13)) continue;
    spots.push([i, j]);
  }
  for (const [i, j] of spots) fireBarrel(i, j);
  for (const [i, j] of [
    [39, 31],
    [33, 22],
    [36, 41],
    [20, 27]
  ])
    fireBarrel(OX + i, OZ + j);
}
function buildGlows() {
  if (!GLOWS.length) return;
  glowMesh = new T.InstancedMesh(
    new T.BoxGeometry(1, 1, 1),
    new T.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    GLOWS.length
  );
  glowMesh.frustumCulled = false;
  GLOWS.forEach((g, k) => {
    dummy.position.set(g[0], g[1], g[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(g[4], g[5], g[6]);
    dummy.updateMatrix();
    glowMesh.setMatrixAt(k, dummy.matrix);
    glowMesh.setColorAt(k, tmpCol.setHex(g[3]));
  });
  world.add(glowMesh);
}
