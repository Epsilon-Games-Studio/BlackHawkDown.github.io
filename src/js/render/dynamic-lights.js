/* ====================================================================================================
 * render/dynamic-lights.js
 *
 * Luces dinámicas
 * ================================================================================================== */

const FLASH_N = 6,
  AMB_N = 8,
  TRL_N = 4,
  MZ_N = 4;
let RPG_CNT = 0,
  ROCKETS = [],
  rpgCallT = -99;
const flashL = [],
  ambL = [];
let flashHead = 0,
  ambPickT = 0,
  ambSrc = [];
for (let k = 0; k < FLASH_N; k++) {
  const L = new T.PointLight(0xffc070, 0, 5, 2);
  scene.add(L);
  flashL.push({ L, t: 1, life: 1, i0: 0 });
}
for (let k = 0; k < AMB_N; k++) {
  const L = new T.PointLight(0xff8a3a, 0, 8, 2);
  scene.add(L);
  ambL.push(L);
}
// luces que viajan con una parte de las trazadoras, para que una ráfaga eche luz en movimiento por las paredes
const trL = [];
let trHead = 0;
for (let k = 0; k < TRL_N; k++) {
  const L = new T.PointLight(0xff9a50, 0, 4, 2);
  scene.add(L);
  trL.push(L);
}
// fogonazos: luz corta, dura y parpadeante para los disparos más cercanos a la cámara; se iluminan las paredes y los hombres alrededor del arma
const mzL = [];
let mzHead = 0;
for (let k = 0; k < MZ_N; k++) {
  const L = new T.PointLight(0xffb45a, 0, 6, 2);
  scene.add(L);
  mzL.push({ L, t: 1, life: 1, i0: 0 });
}
function muzzleLight(x, y, z, big) {
  if (Math.hypot(x - camS.tx, z - camS.tz) > halfH() * 2.4) return;
  let f = mzL[0];
  for (const q of mzL) if (q.t / q.life > f.t / f.life) f = q; // la que está más cerca de terminar
  f.L.position.set(x, y + 0.15, z);
  f.L.color.setHex(big ? 0xffb860 : 0xffa850);
  f.i0 = (big ? 4.4 : 3.1) * (0.5 + nightF * 1.0);
  f.L.distance = (big ? 9 : 6.5) * (1 + nightF * 0.55);
  f.t = 0;
  f.life = big ? 0.1 : 0.075;
  f.L.intensity = f.i0;
}
const NIGHTG = { value: 0 };
function lightFlash(x, y, z, col, int, distc, life) {
  const f = flashL[flashHead];
  flashHead = (flashHead + 1) % FLASH_N;
  f.L.position.set(x, y, z);
  f.L.color.setHex(col);
  f.L.distance = distc;
  f.i0 = int;
  f.t = 0;
  f.life = life;
  f.L.intensity = int;
}
/* Luces de chaleco: de noche tres Rangers de cada equipo (de tiro, escuadra o chalk) llevan una luz blanca en el pecho. Un pool de seis focos
   (15 m, cono de 60 grados, sin sombras) se reparte entre los portadores más cercanos a la vista, apuntando hacia donde mira o apunta cada uno;
   quien queda dentro de un haz cuenta como iluminado, así que delata al enemigo tanto como alumbra el camino */
const VEST_N = 6,
  VEST_R = 10,
  VEST_A = Math.PI / 6,
  vestL = [];
for (let k = 0; k < VEST_N; k++) {
  const L = new T.SpotLight(0xfff1dc, 0, VEST_R, VEST_A, 0.5, 1.3);
  L.castShadow = false;
  scene.add(L);
  scene.add(L.target);
  vestL.push(L);
}
let VEST_MIS = null;
function vestCarriers() {
  if (VEST_MIS !== MIS) {
    VEST_MIS = MIS;
    for (const u of units || []) u.vest = false;
  }
  if (!us || nightF < 0.3 || MIS.id === 'tutorial') return []; // en la instrucción nadie lleva la luz del chaleco
  const cnt = {};
  for (const u of us)
    if (u.vest) {
      const t = u.grp != null ? 'g' + u.grp : u.unitName || 'all';
      cnt[t] = (cnt[t] || 0) + 1;
    }
  for (const u of us) {
    if (u.vest || u.vestNo || !u.alive || u.look !== 'ranger') continue;
    const t = u.grp != null ? 'g' + u.grp : u.unitName || 'all';
    if ((cnt[t] || 0) < 3) {
      u.vest = true;
      cnt[t] = (cnt[t] || 0) + 1;
    } else u.vestNo = true;
  }
  return us.filter(u => u.vest && u.alive && !u.down);
}
function vestDir(u) {
  const a = u.m && u.m.root ? u.m.root.rotation.y : u.face;
  return [Math.sin(a), Math.cos(a)];
}
function vestLit(x, z) {
  let L = 0;
  if (!VEST_C.length) return 0;
  for (const u of VEST_C) {
    const dx = x - u.x,
      dz = z - u.z,
      d = Math.hypot(dx, dz);
    if (d > VEST_R || d < 0.3) continue;
    const [fx, fz] = vestDir(u);
    if ((dx * fx + dz * fz) / d < Math.cos(VEST_A)) continue;
    L = Math.max(L, (1 - d / VEST_R) * 1.1);
  }
  return L;
}
let VEST_C = [];
function updVest() {
  VEST_C = vestCarriers();
  const cx = camS.tx,
    cz = camS.tz,
    on = VEST_C.filter(u => Math.abs(u.x - cx) < 60 && Math.abs(u.z - cz) < 60).sort(
      (a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz)
    );
  for (let k = 0; k < VEST_N; k++) {
    const L = vestL[k],
      u = on[k];
    if (!u) {
      L.intensity = 0;
      continue;
    }
    const [fx, fz] = vestDir(u),
      y = (u.elev || 0) + (u.stance === 'prone' ? 0.3 : u.stance === 'crouch' ? 0.75 : 1.0);
    L.position.set(u.x + fx * 0.18, y, u.z + fz * 0.18);
    L.target.position.set(u.x + fx * VEST_R, (u.elev || 0) + 0.15, u.z + fz * VEST_R);
    L.intensity = 3.2 * sstep(0.3, 0.7, nightF);
    L.updateMatrixWorld();
    L.target.updateMatrixWorld();
  }
}
function updLights(dt, now) {
  updVest();
  for (const f of flashL) {
    if (f.t >= f.life) {
      f.L.intensity = 0;
      continue;
    }
    f.t += dt;
    f.L.intensity = f.i0 * Math.max(0, 1 - f.t / f.life);
  }
  for (const f of mzL) {
    if (f.t >= f.life) {
      f.L.intensity = 0;
      continue;
    }
    f.t += dt;
    const u = f.t / f.life;
    f.L.intensity = f.i0 * (u < 0.4 ? 1 : 0.55) * Math.max(0, 1 - u * u);
  }
  // cada pocas décimas de segundo reparto el pool de luces entre las fuentes más cercanas: fuegos, bidones ardiendo y (de noche) las farolas que funcionan
  ambPickT -= dt;
  if (ambPickT <= 0) {
    ambPickT = 0.3;
    const cx = camS.tx,
      cz = camS.tz,
      cand = [];
    for (const e of emitters) {
      if (!e.fire || e.lsrc) continue;
      const d = Math.hypot(e.x - cx, e.z - cz);
      if (d < 60)
        cand.push([d - e.fire * 6, { x: e.x, y: e.y + 0.5, z: e.z, col: 0xff8a3a, fire: e.fire, fl: 1, em: e }]);
    }
    for (const s of LIGHTSRC) {
      if (s.off || (s.lamp && nightF < 0.15)) continue;
      const d = Math.hypot(s.x - cx, s.z - cz);
      if (d < 60) cand.push([d, s]);
    }
    cand.sort((p, q) => p[0] - q[0]);
    ambSrc = cand.slice(0, AMB_N).map(c => c[1]);
  }
  for (let k = 0; k < AMB_N; k++) {
    const L = ambL[k],
      s = ambSrc[k];
    if (!s) {
      L.intensity = 0;
      continue;
    }
    const fl = s.fl ? 0.72 + 0.18 * Math.sin(now * 0.017 + k * 2) + 0.1 * Math.sin(now * 0.041 + k) : 1;
    L.position.set(s.x, s.y, s.z);
    L.color.setHex(s.col);
    if (s.em) {
      L.intensity = (1.2 + nightF * 2.4) * s.em.fire * fl;
      L.distance = (6 + 4 * s.em.fire) * (1 + nightF * 0.7);
    } else if (s.lamp) {
      L.intensity = s.i * nightF * fl;
      L.distance = s.d;
    } else {
      L.intensity = s.i * (0.35 + nightF * 0.9) * fl;
      L.distance = s.d * (0.7 + nightF * 0.5);
    }
  }
  NIGHTG.value = sstep(0.25, 0.8, nightF);
  if (glowMesh) glowMesh.visible = nightF > 0.12;
  updFlareLights(now);
}
