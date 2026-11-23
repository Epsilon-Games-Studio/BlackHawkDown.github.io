/* ====================================================================================================
 * combat/knockdown.js
 *
 * Derribados: la onda de un cohete grande tira al suelo a todos los que están cerca. Ni herida ni sangre: diez segundos
 * boca arriba antes de poder levantarse y volver a disparar
 * ================================================================================================== */

'use strict';

const KD_T = 10,
  KD_R = 4; // diez segundos en el suelo para todo el que esté a menos de seis metros (4 unidades de mapa) de la explosión
function knockDown(u, x, z) {
  if (!u.alive || u.mounted || u.ride || u.board || u.immortal || (u.inB && u.inB.level === 'ground') || u.slide)
    return;
  u.kdT = G.t + KD_T;
  u.kd0 = G.t;
  u.vx = u.vz = 0;
  u.firing = 0;
  u.reloading = false;
  u.auto = null;
  u.sup = 100;
  u.rpgAim = 0;
  u.face = Math.atan2(u.x - x, u.z - z) + Math.PI; // cae mirando hacia la explosión
}
function kdUpd(u) {
  if (!(u.kdT > G.t)) {
    if (u.kdT) {
      u.kdT = 0;
      if (u.stance === 'stand') u.stance = 'crouch';
    }
    return false;
  }
  u.vx = u.vz = 0;
  u.firing = 0;
  u.auto = null;
  u.sup = Math.max(u.sup, 60);
  return true;
}
