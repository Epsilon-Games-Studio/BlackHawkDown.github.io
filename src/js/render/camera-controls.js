/* ====================================================================================================
 * render/camera-controls.js
 *
 * Tamaño de la vista, posición de la cámara, desplazamiento, zoom y el corte de tejados.
 * ================================================================================================== */

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
/* La inclinación: el jugador la elige (camS.pitchU) entre 15º sobre el horizonte y 90º (vista cenital) con los botones
 * de la derecha, PageUp/PageDown o arrastrando en vertical al girar. Por debajo hay un suelo calculado: lo justo para
 * que los edificios entre la cámara y el centro de la vista no lo tapen (en calles abiertas, 15º; entre bloques
 * altos y estrechos, más). Las cinemáticas, el vuelo y el menú van siempre con el ángulo de siempre. */
const PITCH_DEF = 0.64,
  PITCH_LO = (15 * Math.PI) / 180,
  PITCH_HI = Math.PI / 2,
  PITCH_CAP = (45 * Math.PI) / 180; // el suelo calculado nunca sube de aquí
const OCC = { t: 0, x: 1e9, z: 1e9, yaw: 1e9, v: PITCH_LO };
// el ángulo mínimo para ver por encima de lo que hay entre la cámara y el centro de la vista
function camOccPitch() {
  const now = performance.now();
  if (now - OCC.t < 200 && Math.hypot(camS.tx - OCC.x, camS.tz - OCC.z) < 0.6 && Math.abs(camS.yaw - OCC.yaw) < 0.05) return OCC.v;
  OCC.t = now;
  OCC.x = camS.tx;
  OCC.z = camS.tz;
  OCC.yaw = camS.yaw;
  const fx = Math.sin(camS.yaw),
    fz = Math.cos(camS.yaw),
    eye = 1.2; // la cabeza de un hombre de pie en el centro de la vista
  let a = PITCH_LO;
  for (let s = 1.2; s <= 60; s += 0.5) {
    const i = Math.floor(camS.tx + fx * s),
      j = Math.floor(camS.tz + fz * s);
    if (!inB(i, j)) continue;
    const k = idx(i, j),
      h = grid[k] === 1 ? topH[k] || 3 : topH[k] || 0;
    if (h > eye) a = Math.max(a, Math.atan((h - eye + 0.3) / s));
  }
  return (OCC.v = Math.min(a, PITCH_CAP));
}
function camPitchStep(rdt) {
  if (camS.pitchU == null) camS.pitchU = OPT.pitch != null ? OPT.pitch : PITCH_DEF;
  // también en todas las cinemáticas, en el vuelo y en las escenas de la introducción; solo el menú va con el ángulo de siempre
  const inPro = typeof PRO !== 'undefined' && PRO.on,
    free = inPro || (MIS && MIS.id !== 'attract' && ((G && G.started) || CINE.on || (FLIGHT.on && !FLIGHT.attract)));
  let want = PITCH_DEF;
  if (free) {
    camS.floor = inPro ? PITCH_LO : camOccPitch();
    want = Math.max(clamp(camS.pitchU, PITCH_LO, PITCH_HI), camS.floor);
  }
  camS.pitch += (want - camS.pitch) * Math.min(1, rdt * 6);
  // de 75º a 90º la imagen pasa poco a poco a la señal azulada de satélite
  const deg = (camS.pitch * 180) / Math.PI;
  postMat.uniforms.uFeed.value = free ? clamp((deg - 75) / 14, 0, 1) ** 1.4 : 0;
  tiltUI(free);
}
function tiltBy(da) {
  camS.pitchU = clamp(Math.max(camS.pitchU == null ? PITCH_DEF : camS.pitchU, camS.floor || PITCH_LO) + da, PITCH_LO, PITCH_HI);
  OPT.pitch = camS.pitchU;
  clearTimeout(tiltBy.sv);
  tiltBy.sv = setTimeout(saveOpt, 600);
}
let TILT_SHOWN = '';
// los mismos tres controles en la columna del juego (c…) y en la de las cinemáticas y el vuelo (f…)
function tiltUI(free) {
  const deg = Math.round((camS.pitch * 180) / Math.PI),
    lim = free && camS.floor > (camS.pitchU || 0) + 0.02;
  const key = deg + (lim ? 'l' : '') + (free ? 'f' : '');
  if (key === TILT_SHOWN) return;
  TILT_SHOWN = key;
  for (const p of ['c', 'f']) {
    const v = $(p + 'TiltV');
    if (!v) continue;
    v.textContent = deg + '°';
    v.classList.toggle('lim', !!lim);
    v.title = lim ? L('Ángulo limitado por los edificios') : L('Ángulo de la cámara');
    $(p + 'TiltU').disabled = !free || camS.pitch >= PITCH_HI - 0.01;
    $(p + 'TiltD').disabled = !free || camS.pitch <= Math.max(PITCH_LO, camS.floor || 0) + 0.01;
  }
}
function updCam() {
  const d = 110,
    cp = Math.cos(camS.pitch);
  // casi en vertical, «arriba» en pantalla es hacia donde mira la cámara (si no, lookAt no sabe girar)
  if (camS.pitch > 1.4) cam.up.set(-Math.sin(camS.yaw) * Math.sin(camS.pitch), cp, -Math.cos(camS.yaw) * Math.sin(camS.pitch));
  else cam.up.set(0, 1, 0);
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
  // la niebla, según lo lejos que llega a verse el suelo por arriba de la pantalla con esta inclinación
  scene.fog.near = d - 2 * hh;
  scene.fog.far = d + hh * Math.min(6, 1.95 + 1 / Math.tan(Math.max(0.2, camS.pitch)));
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
