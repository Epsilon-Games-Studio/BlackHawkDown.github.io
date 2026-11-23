/* ====================================================================================================
 * render/atmosphere.js
 *
 * Atmósfera: el cielo en el borde lejano de la vista y los rayos de sol entre los edificios, las dos cosas pintadas en la pasada
 * de película a partir del buffer de profundidad y el mapa de sombras del sol; su fuerza sigue a la hora (largas y doradas al amanecer y al atardecer)
 * ================================================================================================== */

'use strict';

const SKY_D = new T.Color(0.5, 0.64, 0.82),
  SKY_G = new T.Color(0.46, 0.44, 0.62),
  SKY_N = new T.Color(0.035, 0.05, 0.09),
  _sv = new T.Vector3(),
  _sr = new T.Vector3(),
  _su = new T.Vector3();
function atmoFrame(now) {
  const U = postMat.uniforms,
    day = 1 - nightF;
  cam.updateMatrixWorld();
  _ipv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
  U.uInvPV.value.copy(_ipv);
  cam.getWorldDirection(U.uFwd.value);
  U.uCamP.value.copy(cam.position);
  U.uFogN.value = scene.fog.near;
  U.uFogF.value = scene.fog.far;
  U.uCT.value = (now / 1000) % 20000;
  U.uSkyHz.value.copy(scene.fog.color).multiplyScalar(1.04);
  U.uSkyTop.value
    .copy(SKY_D)
    .lerp(SKY_G, goldF * 0.8)
    .lerp(SKY_N, nightF)
    .lerp(scene.fog.color, 0.45);
  _sv.copy(sun.position).sub(sun.target.position).normalize();
  _sr.setFromMatrixColumn(cam.matrixWorld, 0);
  _su.setFromMatrixColumn(cam.matrixWorld, 1);
  U.uSunScr.value.set(_sv.dot(_sr), _sv.dot(_su));
  if (U.uSunScr.value.lengthSq() < 1e-6) U.uSunScr.value.set(0, 1);
  U.uSunScr.value.normalize();
  U.uSunCol.value.copy(sun.color);
  U.uGlow.value = day * (0.45 + goldF * 0.9);
  U.uCloud.value = 0.55 * day + 0.25 * nightF;
  const map = sun.shadow && sun.shadow.map;
  const on = OPT.rays !== false && !!map && !(G && G.nv && nightF > 0.25);
  U.tShadow.value = map ? map.texture : null;
  if (map) U.uShadowM.value.copy(sun.shadow.matrix);
  U.uRay.value = window.__rayF != null ? window.__rayF : on ? Math.min(1.0, day * (0.3 + goldF * 1.0)) : 0;
}
