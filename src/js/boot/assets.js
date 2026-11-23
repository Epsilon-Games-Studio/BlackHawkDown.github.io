'use strict';
/* ====================================================================================================
 * boot/assets.js
 *
 * Acceso a los modelos 3D (.heli y .png) en assets/models/.
 * ================================================================================================== */

function assetBin(n) {
  return fetch('assets/models/' + n + '.heli').then(r => {
    if (!r.ok) throw new Error(n);
    return r.arrayBuffer();
  });
}
function assetPng(n) {
  return 'assets/models/' + n + '.png';
}
