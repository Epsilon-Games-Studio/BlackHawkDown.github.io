/* ====================================================================================================
 * world/birds.js
 *
 * Los pájaros: el cuervo subido, una sola malla instanciada para todos. Las alas se doblan en la GPU: el hombro y la muñeca
 * giran sobre el eje del cuerpo, la muñeca un poco por detrás del hombro para que cada aleteo llegue a las puntas, y un pájaro posado
 * las tiene plegadas a lo largo de los costados. Por pájaro: ángulo del hombro, ángulo de la muñeca y cuánto están plegadas.
 * ================================================================================================== */

'use strict';

const BIRD_N = 240;
let BIRD = null;
const BIRD_GLSL = `
attribute vec3 aWing;
vec2 bRot(vec2 d, float a){ float c = cos(a), s = sin(a); return vec2(c*d.x - s*d.y, s*d.x + c*d.y); }
vec3 birdP(vec3 p, vec3 w){
  float sx = p.x < 0.0 ? -1.0 : 1.0, ax = abs(p.x);
  float w1 = smoothstep(0.012, 0.03, ax), w2 = smoothstep(0.1, 0.13, ax);
  vec2 q = vec2(ax, p.y);
  q = vec2(0.12, 0.113) + bRot(q - vec2(0.12, 0.113), w.y*w2);
  q = vec2(0.019, 0.116) + bRot(q - vec2(0.019, 0.116), w.x*w1);
  vec3 o = vec3(sx*q.x, q.y, p.z);
  float s = clamp((ax - 0.02)/0.28, 0.0, 1.0);
  vec3 f = vec3(sx*(0.03 + 0.008*(1.0 - s)), 0.112 + (p.z - 0.01)*0.33 - s*0.02, 0.025 - s*0.14 + (p.z - 0.01)*0.12);
  return mix(o, f, w.z*w1);
}
vec3 birdN(vec3 n, vec3 p, vec3 w){
  float sx = p.x < 0.0 ? -1.0 : 1.0, ax = abs(p.x), w1 = smoothstep(0.012, 0.03, ax);
  float a = w.x*w1 + w.y*smoothstep(0.1, 0.13, ax);
  vec2 q = bRot(vec2(n.x*sx, n.y), a);
  return normalize(mix(vec3(q.x*sx, q.y, n.z), vec3(sx*0.8, 0.5, 0.0), w.z*w1*0.7));
}
`;
function birdIM() {
  if (BIRD && BIRD.m.parent === world) return BIRD;
  const M_ = MODELS.crow;
  if (!M_ || !M_.ready) return null;
  const geo = M_.geos.crow,
    wa = new T.InstancedBufferAttribute(new Float32Array(BIRD_N * 3), 3);
  wa.setUsage(T.DynamicDrawUsage);
  geo.setAttribute('aWing', wa);
  const mat = new T.MeshLambertMaterial({ map: M_.mat.map, side: T.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.vertexShader =
      BIRD_GLSL +
      sh.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          '#include <beginnormal_vertex>\nobjectNormal = birdN(objectNormal, position, aWing);'
        )
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = birdP(position, aWing);');
  };
  mat.customProgramCacheKey = () => 'bird';
  const m = new T.InstancedMesh(geo, mat, BIRD_N);
  m.frustumCulled = false;
  m.receiveShadow = true;
  m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < BIRD_N; k++) m.setMatrixAt(k, ZERO_M);
  world.add(m);
  BIRD = { m, wa, free: [], dirty: true };
  for (let k = BIRD_N - 1; k >= 0; k--) BIRD.free.push(k);
  for (const bd of birds) bd.k = -1;
  return BIRD;
}
function birdTake(n) {
  const B = birdIM();
  if (!B || B.free.length < n) return null;
  const a = [];
  for (let k = 0; k < n; k++) a.push(B.free.pop());
  return a;
}
function birdFree(a) {
  if (!BIRD || !a) return;
  for (const k of a) {
    BIRD.m.setMatrixAt(k, ZERO_M);
    BIRD.free.push(k);
  }
  BIRD.dirty = true;
}
function birdHide(k) {
  BIRD.m.setMatrixAt(k, ZERO_M);
  BIRD.dirty = true;
}
function birdPut(k, x, y, z, yaw, pitch, roll, a1, a2, fold, sc) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(pitch, yaw, roll, 'YXZ');
  dummy.scale.setScalar(sc);
  dummy.updateMatrix();
  BIRD.m.setMatrixAt(k, dummy.matrix);
  dummy.rotation.order = 'XYZ';
  const a = BIRD.wa.array;
  a[k * 3] = a1;
  a[k * 3 + 1] = a2;
  a[k * 3 + 2] = fold;
  BIRD.dirty = true;
}
function birdFlush() {
  if (BIRD && BIRD.dirty) {
    BIRD.m.instanceMatrix.needsUpdate = true;
    BIRD.wa.needsUpdate = true;
    BIRD.dirty = false;
  }
}
// un aleteo: el hombro barre y la muñeca le sigue un poco después; el golpe hacia abajo es la mitad más rápida. amp 0 = planeando, alas en una V abierta
function wingBeat(ph, amp) {
  const c = ph % 6.2832,
    d = c < 2.6 ? Math.cos((c / 2.6) * Math.PI) : -Math.cos(((c - 2.6) / 3.6832) * Math.PI); // +1 arriba del aleteo, -1 abajo
  const c2 = (ph - 0.8) % 6.2832,
    cc = c2 < 0 ? c2 + 6.2832 : c2,
    d2 = cc < 2.6 ? Math.cos((cc / 2.6) * Math.PI) : -Math.cos(((cc - 2.6) / 3.6832) * Math.PI);
  return [0.1 + amp * (0.12 + 0.72 * d), 0.04 + amp * (0.1 + 0.5 * d2)];
}
function makeBirds() {
  for (let k = 0; k < 16; k++) {
    pick([0x2a2622, 0x3a3228, 0x4a3e30]); // (la tirada que hacían los pájaros-caja antiguos para su color: la secuencia aleatoria sigue igual)
    birds.push({
      k: -1,
      cx: OX + rr(8, 56),
      cz: OZ + rr(8, 56),
      r: rr(3, 8),
      y: rr(15, 23),
      w: rr(0.25, 0.45) * (rnd() < 0.5 ? 1 : -1),
      a: rnd() * 6,
      ph: rnd() * 6,
      amp: 1,
      wp: 0,
      sc: 1.05 + (k % 5) * 0.05
    });
  }
}
