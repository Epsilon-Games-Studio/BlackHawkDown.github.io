/* ====================================================================================================
 * fx/particles.js
 *
 * Partículas: humo, fuego y polvo
 * ================================================================================================== */

'use strict';

const PN = 16000;
let PX,
  PY,
  PZ,
  PVX,
  PVY,
  PVZ,
  PT,
  PL,
  PS0,
  PS1,
  PA,
  PC,
  PE,
  PG,
  pHead = 0,
  pGeo,
  pMat,
  aPos,
  aSize,
  aAlpha,
  aCol,
  aEmi;
const PVS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aEmi;
uniform float uScale; uniform vec3 uTint; uniform float fNear; uniform float fFar;
varying float vA; varying vec3 vC; varying float vFog; varying float vE; varying float vS;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize > 0.0 ? max(1.0, aSize * uScale) : 0.0; vE = aEmi; vS = gl_PointSize;
  vA = aAlpha; vC = mix(aColor * uTint, aColor, aEmi);
  vFog = smoothstep(fNear, fFar, -mv.z) * (1.0 - aEmi * 0.7);
}`;
const PFS = `
uniform vec3 fCol; varying float vA; varying vec3 vC; varying float vFog; varying float vE; varying float vS;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);
  if (d > 0.25) discard;
  // una bocanada redonda, densa en el centro y que desaparece en el borde; las motas de un pixel o dos y todo lo que brilla se quedan solidas
  float big = smoothstep(2.0, 7.0, vS);
  float a = clamp(vA * (1.25 - d * 2.6), 0.0, 1.0) * mix(1.0, smoothstep(0.25, 0.1, d), big) * mix(1.0, 0.5, big * (1.0 - vE));
  if (a < 0.015) discard;
  gl_FragColor = vec4(mix(vC, fCol, vFog), a);
}`;
function initParticles() {
  const F = n => new Float32Array(n);
  PX = F(PN);
  PY = F(PN);
  PZ = F(PN);
  PVX = F(PN);
  PVY = F(PN);
  PVZ = F(PN);
  PT = F(PN).fill(1);
  PL = F(PN).fill(1);
  PS0 = F(PN);
  PS1 = F(PN);
  PA = F(PN);
  PC = F(PN * 6);
  PE = F(PN);
  PG = F(PN);
  aPos = F(PN * 3);
  aSize = F(PN);
  aAlpha = F(PN);
  aCol = F(PN * 3);
  aEmi = F(PN);
  pGeo = new T.BufferGeometry();
  const at = (a, n) => {
    const b = new T.BufferAttribute(a, n);
    b.setUsage(T.DynamicDrawUsage);
    return b;
  };
  pGeo.setAttribute('position', at(aPos, 3));
  pGeo.setAttribute('aSize', at(aSize, 1));
  pGeo.setAttribute('aAlpha', at(aAlpha, 1));
  pGeo.setAttribute('aColor', at(aCol, 3));
  pGeo.setAttribute('aEmi', at(aEmi, 1));
  pMat = new T.ShaderMaterial({
    vertexShader: PVS,
    fragmentShader: PFS,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uScale: { value: 10 },
      uTint: { value: new T.Color(1, 1, 1) },
      fNear: { value: 100 },
      fFar: { value: 150 },
      fCol: { value: new T.Color(HAZE) }
    }
  });
  const pts = new T.Points(pGeo, pMat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  world.add(pts);
}
const hexRGB = c => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
function spawnP(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, emi, grav) {
  const k = pHead;
  pHead = (pHead + 1) % PN;
  PX[k] = x;
  PY[k] = y;
  PZ[k] = z;
  PVX[k] = vx;
  PVY[k] = vy;
  PVZ[k] = vz;
  PT[k] = 0;
  PL[k] = life;
  PS0[k] = s0;
  PS1[k] = s1;
  PA[k] = a0;
  PE[k] = emi || 0;
  PG[k] = grav || 0;
  const A = hexRGB(c0),
    Bc = hexRGB(c1);
  PC.set(A, k * 6);
  PC.set(Bc, k * 6 + 3);
}
const SMK0 = 0x1b1917,
  SMK1 = 0x6c665d;
function emitFrom(e, dt) {
  e.acc += dt * e.rate;
  while (e.acc > 1) {
    e.acc -= 1;
    const sp = e.sp || 0.35;
    spawnP(
      e.x + rr(-sp, sp),
      e.y + rnd() * 0.2,
      e.z + rr(-sp, sp),
      rr(-0.15, 0.15),
      e.vy * rr(0.7, 1.3),
      rr(-0.15, 0.15),
      e.life * rr(0.7, 1.2),
      e.s0 * rr(0.7, 1.3),
      e.s1 * rr(0.7, 1.3),
      jit(SMK0, 0.1),
      jit(SMK1, 0.08),
      rr(0.9, 1),
      0,
      0
    );
  }
  if (e.fire) {
    e.facc = (e.facc || 0) + dt * 34 * e.fire;
    while (e.facc > 1) {
      e.facc -= 1;
      const f = e.fire;
      spawnP(
        e.x + rr(-0.45, 0.45) * f,
        e.y - 0.35 + rnd() * 0.25,
        e.z + rr(-0.35, 0.35) * f,
        rr(-0.2, 0.2),
        rr(1.0, 2.4) * f,
        rr(-0.2, 0.2),
        rr(0.3, 0.75),
        rr(0.22, 0.38) * f,
        0.05,
        pick([0xffe7a0, 0xffd060, 0xffb040]),
        pick([0xd8401a, 0xb02a10]),
        1,
        1,
        0
      );
    }
  }
}
function updParticles(dt) {
  for (let k = 0; k < PN; k++) {
    if (PT[k] >= PL[k]) {
      if (aSize[k] !== 0) {
        aSize[k] = 0;
        aAlpha[k] = 0;
      }
      continue;
    }
    PT[k] += dt;
    const u = Math.min(1, PT[k] / PL[k]);
    if (PE[k] && !PG[k]) {
      PVY[k] += 0.6 * dt;
    } else if (PG[k]) {
      PVY[k] -= PG[k] * dt;
      if (PY[k] < 0.02 && PVY[k] < 0) {
        PVY[k] = 0;
        PVX[k] *= 0.5;
        PVZ[k] *= 0.5;
        PY[k] = 0.02;
      }
    } else {
      PVX[k] += (0.55 * u + 0.1 - PVX[k]) * 0.6 * dt + (Math.random() - 0.5) * 0.8 * dt;
      PVZ[k] += (0.2 * u - PVZ[k]) * 0.6 * dt + (Math.random() - 0.5) * 0.8 * dt;
      PVY[k] *= 1 - 0.12 * dt;
    }
    PX[k] += PVX[k] * dt;
    PY[k] += PVY[k] * dt;
    PZ[k] += PVZ[k] * dt;
    aPos[k * 3] = PX[k];
    aPos[k * 3 + 1] = PY[k];
    aPos[k * 3 + 2] = PZ[k];
    aSize[k] = u >= 1 ? 0 : PS0[k] + (PS1[k] - PS0[k]) * Math.sqrt(u);
    aAlpha[k] = PA[k] * (u < 0.08 ? u / 0.08 : 1) * (1 - u * u);
    const c = k * 6;
    aCol[k * 3] = PC[c] + (PC[c + 3] - PC[c]) * u;
    aCol[k * 3 + 1] = PC[c + 1] + (PC[c + 4] - PC[c + 1]) * u;
    aCol[k * 3 + 2] = PC[c + 2] + (PC[c + 5] - PC[c + 2]) * u;
    aEmi[k] = PE[k];
  }
  const A = pGeo.attributes;
  A.position.needsUpdate =
    A.aSize.needsUpdate =
    A.aAlpha.needsUpdate =
    A.aColor.needsUpdate =
    A.aEmi.needsUpdate =
      true;
}
let dustAcc = 0,
  gustAcc = 0;
function updAmbient(dt) {
  const hh = halfH(),
    att = MIS && MIS.id === 'attract',
    eR = att ? hh * 1.25 + 6 : hh * 2.2 + 30;
  for (const e of emitters)
    if (Math.abs(e.x - camS.tx) < eR && Math.abs(e.z - camS.tz) < eR) emitFrom(e, att ? dt * 0.6 : dt); // el humo y el fuego fuera de cámara no cuestan nada
  dustAcc += dt * 26;
  gustAcc += dt * 2.2;
  while (dustAcc > 1) {
    dustAcc -= 1;
    spawnP(
      camS.tx + rr(-hh * 1.6, hh * 1.6),
      rr(0.1, 2.5),
      camS.tz + rr(-hh * 1.6, hh * 1.6),
      rr(0.2, 0.6),
      rr(-0.05, 0.08),
      rr(-0.1, 0.2),
      rr(4, 8),
      0.05,
      0.1,
      0xd8ccb0,
      0xc8bca0,
      rr(0.35, 0.6),
      0,
      0
    );
  }
  while (gustAcc > 1) {
    gustAcc -= 1;
    const x = camS.tx + rr(-hh * 1.5, hh * 1.5),
      z = camS.tz + rr(-hh * 1.5, hh * 1.5);
    for (let k = 0; k < 6; k++)
      spawnP(
        x + rr(-1, 1),
        rr(0.05, 0.5),
        z + rr(-1, 1),
        rr(0.5, 1.1),
        rr(0.02, 0.15),
        rr(0.0, 0.3),
        rr(5, 9),
        rr(0.6, 1),
        rr(1.8, 3.2),
        0xc9bb9c,
        0xd2c6aa,
        rr(0.18, 0.3),
        0,
        0
      );
  }
  paperAcc += dt * 3.5;
  while (paperAcc > 1) {
    paperAcc -= 1;
    spawnP(
      camS.tx + rr(-hh * 1.4, hh * 1.4),
      rr(0.05, 0.6),
      camS.tz + rr(-hh * 1.4, hh * 1.4),
      rr(0.9, 2.2) * windAt(ambT),
      rr(0.4, 1.4),
      rr(0.1, 0.8),
      rr(3, 6),
      rr(0.06, 0.1),
      0.07,
      pick([0xf0f0ee, 0xdcdcda, 0xc4c4c2, 0xa8a8a6, 0xe8e8e6]),
      0xd0d0ce,
      1,
      0,
      2.2
    );
  }
  sandWaveFrame(dt, hh, att);
  updParticles(dt);
  updLoops(dt);
}
let paperAcc = 0;
/* Un frente de racha que viene del desierto: una lámina baja de arena corriendo por el suelo delante de un muro de polvo, que cruza
   la vista a favor del viento; arrastra la arena en líneas serpenteantes, levanta la basura y dobla la hierba a su paso */
const SW_DX = 0.932,
  SW_DZ = 0.362; // a favor del viento, igual que la deriva de la basura
let sandWave = null,
  sandWaveT = 14,
  sandWaveN = 0,
  sandBoost = 0;
function sandWaveFrame(dt, hh, att) {
  sandWaveT -= dt;
  if (!sandWave && sandWaveT <= 0 && !att) {
    sandWaveT = rr(38, 70);
    const L = hh * 1.9 + 12,
      off = rr(-hh * 0.6, hh * 0.6);
    sandWave = {
      id: ++sandWaveN,
      cx: camS.tx - SW_DZ * off,
      cz: camS.tz + SW_DX * off,
      p: -L,
      end: L,
      v: rr(6.5, 8.5),
      W: rr(2.5, 4.5),
      sAcc: 0,
      dAcc: 0,
      wl: rr(0, 6)
    };
  }
  const w = sandWave;
  if (!w) {
    sandBoost = sm(sandBoost, 0, 1 - Math.exp(-1.5 * dt));
    return;
  }
  w.p += w.v * dt;
  const fade = clamp((w.end - w.p) / 10, 0, 1) * clamp((w.p + w.end) / 8, 0, 1);
  sandBoost = sm(sandBoost, 0.3 * fade, 1 - Math.exp(-2 * dt));
  const nx = -SW_DZ,
    nz = SW_DX; // a lo largo del frente
  const at = (back, across) => [w.cx + SW_DX * (w.p - back) + nx * across, w.cz + SW_DZ * (w.p - back) + nz * across];
  // la lámina de arena: granos finos corriendo rápido pegados al suelo en líneas que serpentean, más densa justo detrás del frente
  w.sAcc += dt * 30 * w.W * fade;
  while (w.sAcc > 1) {
    w.sAcc -= 1;
    const lane = Math.round(rr(-w.W, w.W) / 1.1) * 1.1,
      a = lane + Math.sin(lane * 0.9 + w.p * 0.15 + w.wl) * 0.6 + rr(-0.2, 0.2),
      back = Math.pow(rnd(), 1.8) * 7;
    const [x, z] = at(back, a),
      sp = w.v * rr(0.95, 1.35);
    spawnP(
      x,
      rr(0.02, 0.22),
      z,
      SW_DX * sp + rr(-0.3, 0.3),
      rr(-0.05, 0.25),
      SW_DZ * sp + rr(-0.3, 0.3),
      rr(0.45, 0.9),
      rr(0.06, 0.1),
      rr(0.08, 0.14),
      0xf3e6c4,
      0xe2cfa4,
      rr(0.5, 0.8),
      0,
      0
    );
  }
  // el polvo: un rizo que rueda en el frente y luego un muro de calima que se aclara y sube por detrás
  w.dAcc += dt * 14 * w.W * fade;
  while (w.dAcc > 1) {
    w.dAcc -= 1;
    const lip = rnd() < 0.45,
      back = lip ? rr(-0.5, 2) : 1.5 + Math.pow(rnd(), 1.4) * 9,
      [x, z] = at(back, rr(-w.W, w.W) * 0.85),
      sp = w.v * (lip ? rr(0.8, 1.0) : rr(0.55, 0.85));
    spawnP(
      x,
      lip ? rr(0.05, 0.4) : rr(0.15, 0.9 + back * 0.06),
      z,
      SW_DX * sp,
      lip ? rr(0.3, 0.9) : rr(0.15, 0.6),
      SW_DZ * sp,
      lip ? rr(1.0, 1.8) : rr(2.0, 3.6),
      lip ? rr(0.6, 1.1) : rr(1.2, 2.0),
      lip ? rr(1.8, 2.8) : rr(2.8, 4.4),
      lip ? 0x9c7c50 : 0xa98b5f,
      0xc2a77c,
      lip ? rr(0.42, 0.6) : rr(0.26, 0.4),
      0,
      0
    );
  }
  if (w.p > w.end + 18) sandWave = null;
}
