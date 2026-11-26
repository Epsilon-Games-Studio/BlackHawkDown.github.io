/* ====================================================================================================
 * boot/assets.js
 *
 * Acceso a los modelos 3D embebidos en los paquetes de static/ (window.__EMBED).
 * Si no están, los intenta bajar como archivos .txt/.png sueltos junto a la página.
 * ================================================================================================== */

const EMB = window.__EMBED || null;
function assetTxt(n) {
  if (EMB && EMB[n]) return Promise.resolve(EMB[n].t);
  return fetch(n + '.txt').then(r => {
    if (!r.ok) throw new Error(n);
    return r.text();
  });
}
function assetPng(n) {
  if (!(EMB && EMB[n])) return n + '.png';
  const p = EMB[n].p;
  return (p.startsWith('/9j/') ? 'data:image/jpeg;base64,' : 'data:image/png;base64,') + p;
}
