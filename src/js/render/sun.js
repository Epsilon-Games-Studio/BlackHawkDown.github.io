/* ====================================================================================================
 * render/sun.js
 *
 * El sol y la hora del día
 * ================================================================================================== */

'use strict';

let nightF = 0,
  goldF = 0;
const goldT = new T.Vector3(1, 1, 1);
const C_SUN_HI = new T.Color(0xffe4c0),
  C_SUN_LO = new T.Color(0xff8a48),
  C_MOON = new T.Color(0x8a9ac8);
const C_SKY_D = new T.Color(0xfff0d0),
  C_SKY_DUSK = new T.Color(0xd8a0a0),
  C_SKY_N = new T.Color(0x3a4a78);
const C_GR_D = new T.Color(0x6a5638),
  C_GR_N = new T.Color(0x1a1a22);
const C_HAZE_D = new T.Color(HAZE),
  C_HAZE_DUSK = new T.Color(0xb88a66),
  C_HAZE_N = new T.Color(0x1d2232);
const C_SUN_DAWN = new T.Color(0xffa585),
  C_SKY_DAWN = new T.Color(0xc8a8c8),
  C_HAZE_DAWN = new T.Color(0xb49aa0);
const tc = new T.Color(),
  tc2 = new T.Color();
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const _sl = new T.Vector3(),
  _sr2 = new T.Vector3(),
  _su2 = new T.Vector3(),
  _st = new T.Vector3(),
  _sUp = new T.Vector3(0, 1, 0);
function setSun(hour) {
  hour = ((hour % 24) + 24) % 24;
  // el sol sale por el este (+x) hacia las 05:55 y se pone por el oeste (-x) hacia las 17:57
  const e = ((hour - 5.9) / 12.05) * Math.PI,
    se = Math.sin(e),
    day = sstep(-0.12, 0.2, se),
    low = 1 - sstep(0.05, 0.45, se);
  const morn = hour < 12 ? 1 : 0;
  nightF = 1 - day;
  goldF = low * day;
  if (morn) goldT.set(1.12, 0.92, 0.98);
  else goldT.set(1.13, 0.97, 0.8);
  const ce = Math.cos(Math.asin(clamp(se, 0.05, 1))),
    hx = 0.93 * Math.cos(e),
    hz = 0.37;
  {
    const hh = halfH(),
      a = innerWidth / innerHeight,
      need = Math.hypot(hh * a, hh / Math.sin(camS.pitch)) + 20;
    const ext = [50, 62, 78, 98, 122, 150].find(v => v >= need) || 150,
      sc = sun.shadow.camera;
    if (sc.right !== ext) {
      sc.left = sc.bottom = -ext;
      sc.right = sc.top = ext;
      sc.updateProjectionMatrix();
      sun.shadow.bias = (-0.0016 * ext) / 50;
      SHK.force = true;
    }
  }
  let sx0 = camS.tx,
    sz0 = camS.tz;
  if (day > 0.02) _sl.set(hx * ce, Math.max(se, 0.05), hz * ce).normalize();
  else _sl.set(30, 70, -40).normalize();
  {
    const ext = sun.shadow.camera.right,
      tx = (2 * ext) / sun.shadow.mapSize.x;
    _sr2.crossVectors(_sUp, _sl).normalize();
    _su2.crossVectors(_sl, _sr2);
    const a = sx0 * _sr2.x + sz0 * _sr2.z,
      b = sx0 * _su2.x + sz0 * _su2.z,
      da = Math.round(a / tx) * tx - a,
      db = Math.round(b / tx) * tx - b;
    _st.set(sx0, 0, sz0).addScaledVector(_sr2, da).addScaledVector(_su2, db);
  }
  sun.target.position.copy(_st);
  sun.target.updateMatrixWorld();
  sun.position.copy(_st).addScaledVector(_sl, day > 0.02 ? 80 : 86);
  tc.copy(C_SUN_HI).lerp(morn ? C_SUN_DAWN : C_SUN_LO, low);
  sun.color.copy(tc).lerp(C_MOON, nightF);
  sun.intensity = 0.9 * day * (1 - low * 0.3) + 0.34 * nightF;
  tc.copy(C_SKY_D)
    .lerp(morn ? C_SKY_DAWN : C_SKY_DUSK, low * 0.6)
    .lerp(C_SKY_N, nightF);
  hemi.color.copy(tc);
  hemi.groundColor.copy(C_GR_D).lerp(C_GR_N, nightF);
  hemi.intensity = 0.74 - 0.36 * nightF;
  tc.copy(C_HAZE_D)
    .lerp(morn ? C_HAZE_DAWN : C_HAZE_DUSK, low * 0.7)
    .lerp(C_HAZE_N, nightF);
  scene.fog.color.copy(tc);
  scene.background.copy(tc);
  if (pMat) {
    pMat.uniforms.fCol.value.copy(tc);
    tc2.setRGB(1, 1, 1).lerp(new T.Color(0.25, 0.28, 0.4), nightF);
    pMat.uniforms.uTint.value.copy(tc2);
  }
}
