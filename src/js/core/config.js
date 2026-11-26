/* ====================================================================================================
 * core/config.js
 *
 * Constantes globales: tamaño de la rejilla, escala de tiempo, fases del día y el atajo $() para el DOM.
 * Todo lo demás cuelga de aquí, así que va lo primero.
 * ================================================================================================== */

const T = THREE;
const W = 768,
  H = 768,
  RANGE = 24,
  FH = 1.25,
  CUT = 0.85;
const OX = 224,
  OZ = 224; // el barrio de la misión 1 dentro de la rejilla de la ciudad
const OBJ = { x: OX + 32, z: OZ + 32, r: 3.6 };
const TIMESCALE = 3;
const PHASES = {
  day: { h: 15.7, d: '3 OCT 1993' },
  dusk: { h: 17.33, d: '3 OCT 1993' },
  night: { h: 23.0, d: '3 OCT 1993' },
  dawn: { h: 6.33, d: '4 OCT 1993' }
};
let phaseSel = 'day';
const $ = id => document.getElementById(id);
