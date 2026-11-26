/* ====================================================================================================
 * render/camera.js
 *
 * Cámara
 *
 * Estado de la cámara (camS) y la escala de píxel (PS) de la vista pixel-art.
 * ================================================================================================== */

const camS = { tx: 8, tz: 31.5, yaw: -Math.PI * 0.75, yawT: -Math.PI * 0.75, pitch: 0.64, zoom: 10, zoomT: 10 };
const PSS = [0.75, 1, 1.5, 2.5];
let PS = 1,
  lowW = 200,
  lowH = 200;
