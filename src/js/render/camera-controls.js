/* ====================================================================================================
 * render/camera-controls.js
 *
 * Tamaño de la vista, posición de la cámara, desplazamiento, zoom y el corte de tejados.
 * ================================================================================================== */

'use strict';

function resize() {
  lowW = Math.max(80, Math.round(innerWidth / PS));
  lowH = Math.max(80, Math.round(innerHeight / PS));
  renderer.domElement.style.imageRendering = PS >= 2 ? '' : 'auto';
  renderer.setSize(lowW, lowH, false);
  rt.setSize(lowW, lowH);
  postMat.uniforms.uRes.value.set(lowW, lowH);
  const rw = Math.max(32, lowW >> 1),
    rh = Math.max(32, lowH >> 1);
  rayRT.setSize(rw, rh);
  postMat.uniforms.uRayRes.value.set(rw, rh);
}
addEventListener('resize', resize);
resize();
function halfH() {
  const a = innerWidth / innerHeight;
  return a < 1 ? camS.zoom / a : camS.zoom;
}
function updCam() {
  const d = 110,
    cp = Math.cos(camS.pitch);
  cam.position.set(
    camS.tx + Math.sin(camS.yaw) * cp * d,
    Math.sin(camS.pitch) * d,
    camS.tz + Math.cos(camS.yaw) * cp * d
  );
  cam.lookAt(camS.tx, 0, camS.tz);
  const hh = halfH(),
    a = innerWidth / innerHeight;
  {
    const left = SHAKE.until - performance.now();
    if (left > 0) {
      const k = SHAKE.a * hh * 0.05 * Math.min(1, left / (SHAKE.t * 1000));
      cam.position.x += (Math.random() - 0.5) * k;
      cam.position.y += (Math.random() - 0.5) * k;
      cam.position.z += (Math.random() - 0.5) * k;
    }
  }
  cam.left = -hh * a;
  cam.right = hh * a;
  cam.top = hh;
  cam.bottom = -hh;
  cam.updateProjectionMatrix();
  scene.fog.near = d - 2 * hh;
  scene.fog.far = d + 3.3 * hh;
}
function pan(dx, dy) {
  const k = (2 * halfH()) / innerHeight,
    sp = 1 / Math.sin(camS.pitch);
  const rx = Math.cos(camS.yaw),
    rz = -Math.sin(camS.yaw),
    fx = -Math.sin(camS.yaw),
    fz = -Math.cos(camS.yaw);
  camS.tx = clamp(camS.tx - dx * k * rx + dy * k * sp * fx, WB.x0 + 20, WB.x1 - 20);
  camS.tz = clamp(camS.tz - dx * k * rz + dy * k * sp * fz, WB.z0 + 20, WB.z1 - 20);
}
const zoomBy = f => {
  if (FLIGHT.on) {
    FLIGHT.uz = clamp(FLIGHT.uz * f, 0.3, 1.6);
    return;
  }
  if (CINE.on) {
    CINE.uz = clamp(CINE.uz * f, 0.3, 1.8);
    return;
  }
  camS.zoomT = clamp(camS.zoomT * f, 4, 22);
};
function setRoof(on) {
  G.roofs = on;
  if (G.m && G.m.net) G.m.net.visible = !on;
  for (const ch of GEN) cutChunk(ch, on);
  refreshDecals();
}
