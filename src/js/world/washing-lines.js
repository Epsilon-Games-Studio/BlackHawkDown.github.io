/* ====================================================================================================
 * world/washing-lines.js
 *
 * Ropa tendida en las azoteas: sábanas y prendas en una cuerda, moviéndose con el viento y sacudiéndose bajo un rotor
 * ================================================================================================== */

'use strict';

const LAUN_N = 6000;
let laundry = null,
  launN = 0;
const LAUN_U = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uHeli: { value: [new T.Vector4(0, -99, 0, 0), new T.Vector4(0, -99, 0, 0), new T.Vector4(0, -99, 0, 0)] }
};
function makeLaundry() {
  const geo = new T.PlaneGeometry(1, 1, 5, 6);
  geo.translate(0, -0.5, 0);
  const mat = new T.MeshLambertMaterial({ side: T.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, LAUN_U);
    sh.vertexShader =
      'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3];\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float ph = ip.x*1.7 + ip.z*2.3;
      float hang = clamp(-position.y, 0.0, 1.0);
      float wash = 0.0;
      for (int k=0;k<3;k++){ vec3 d = ip - uHeli[k].xyz; float r = length(d.xz); wash += uHeli[k].w * (1.0 - smoothstep(4.0, 16.0, r)) * (1.0 - smoothstep(6.0, 22.0, max(0.0, -d.y))); }
      float sway = uWind*(.2 + .12*sin(uTime*.7 + ph)) * sin(uTime*2.6 + ph + position.x*2.5) + uWind*.06*sin(uTime*5.3 + ph*1.7 + position.x*4.0);
      float flap = wash * (.55*sin(uTime*17.0 + ph + position.x*5.0) + .3*sin(uTime*23.0 + position.y*7.0));
      transformed.z += hang*(sway + flap) + hang*hang*(.15*uWind + wash*.6);
      transformed.x += hang*flap*.25;`
      );
  };
  laundry = new T.InstancedMesh(geo, mat, LAUN_N);
  laundry.count = 0;
  laundry.instanceColor = new T.InstancedBufferAttribute(new Float32Array(LAUN_N * 3).fill(1), 3);
  laundry.castShadow = true;
  laundry.receiveShadow = true;
  laundry.frustumCulled = false;
  laundry.instanceMatrix.setUsage(T.DynamicDrawUsage);
  world.add(laundry);
  launN = 0;
}
const LAUN_COL = [
  0xdcd6c8, 0xd2c9b4, 0xc8bb9c, 0xbfb092, 0xe2dccd, 0xb6a888, 0xd6ccb4, 0xcabfa6, 0xc2b494, 0xddd5c2, 0xb8aa8c, 0xd0c6ae
]; // blancos sucios, beige y arena
// la ropa extra usa su propio generador, así añadirla nunca mueve nada más de la ciudad
let lseed = 4417;
const lrnd = () => {
  lseed = (lseed * 1664525 + 1013904223) >>> 0;
  return lseed / 4294967296;
};
function hangLine(x0, z0, x1, z1, y, wall) {
  if (!laundry) return;
  const Rn = wall ? lrnd : rnd,
    rr_ = (a, b) => a + Rn() * (b - a),
    pk = a => a[Math.floor(Rn() * a.length)];
  const L = Math.hypot(x1 - x0, z1 - z0),
    ry = Math.atan2(-(z1 - z0), x1 - x0);
  MAT = M.METAL;
  for (const [px, pz] of [
    [x0, z0],
    [x1, z1]
  ])
    if (wall) B(px, y, pz, 0.05, 0.05, 0.5, 0x5a5a54, { ry });
    else B(px, y - 0.45, pz, 0.05, 0.9, 0.05, 0x5a5a54);
  B((x0 + x1) / 2, y, (z0 + z1) / 2, L, 0.015, 0.015, 0x3a3a36, { ry });
  let t = 0.15;
  while (t < L - 0.3 && launN < LAUN_N) {
    const w = rr_(0.32, 0.85),
      h = w > 0.6 ? rr_(0.55, 0.85) : rr_(0.3, 0.55);
    if (t + w > L - 0.1) break;
    const f = (t + w / 2) / L;
    dummy.position.set(x0 + (x1 - x0) * f, y - 0.01, z0 + (z1 - z0) * f);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.set(w * 0.96, h, 1);
    dummy.updateMatrix();
    laundry.setMatrixAt(launN, dummy.matrix);
    laundry.setColorAt(launN, tmpCol.setHex(pk(LAUN_COL)).multiplyScalar(rr_(0.85, 1)));
    launN++;
    t += w + rr_(0.04, 0.25);
  }
  laundry.count = launN;
  laundry.instanceMatrix.needsUpdate = true;
  if (laundry.instanceColor) laundry.instanceColor.needsUpdate = true;
}
function updLaundry(t) {
  if (!laundry) return;
  LAUN_U.uTime.value = t;
  LAUN_U.uWind.value = windAt(t);
  const H = [];
  for (const S of SCRIPTED) if (!S.gone) H.push([S.x, S.y, S.z]);
  if (FLIGHT.on) for (const h of FLIGHT.helis) if (!h.gone) H.push([h.g.position.x, h.g.position.y, h.g.position.z]);
  for (const o of ORBITS || []) H.push([o.h.g.position.x, o.h.g.position.y, o.h.g.position.z]);
  H.sort((a, b) => Math.hypot(a[0] - camS.tx, a[2] - camS.tz) - Math.hypot(b[0] - camS.tx, b[2] - camS.tz));
  for (let k = 0; k < 3; k++) {
    const h = H[k],
      v = LAUN_U.uHeli.value[k];
    if (h) v.set(h[0], h[1], h[2], 1);
    else v.set(0, -99, 0, 0);
  }
  HELI_NEAR = H;
}
