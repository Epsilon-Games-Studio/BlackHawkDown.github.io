/* ====================================================================================================
 * ui/convoy-symbol.js
 *
 * El símbolo militar del convoy: un marco OTAN sobre la columna, visible desde cualquier sitio y nunca seleccionable
 * ================================================================================================== */

'use strict';

const NATO_BLUE = '#5c8fca',
  NATO_BLUE_SEL = '#9cc2ec';
function natoTex(label, inf) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 84;
  const x = c.getContext('2d');
  x.fillStyle = NATO_BLUE;
  x.strokeStyle = '#0b0f14';
  x.lineWidth = 4;
  x.fillRect(10, 8, 76, 48);
  x.strokeRect(10, 8, 76, 48);
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(10, 8);
  x.lineTo(86, 56);
  x.moveTo(86, 8);
  x.lineTo(10, 56);
  x.stroke(); // infantería
  if (!inf) {
    x.beginPath();
    x.moveTo(48, 8);
    x.lineTo(48, 56);
    x.stroke();
  } // motorizada
  x.font = '700 17px "Barlow Condensed", "Arial Narrow", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  label = L(label);
  x.lineWidth = 4;
  x.strokeStyle = 'rgba(10,12,16,.85)';
  x.strokeText(label, 48, 72);
  x.fillStyle = '#e8f4ff';
  x.fillText(label, 48, 72);
  const t = new T.CanvasTexture(c);
  t.minFilter = T.LinearFilter;
  return t;
}
const SYM_TEX = {};
let convSyms = [];
function convoyLists() {
  const L = [];
  for (const C of CONVOYS)
    if (C.veh.length) L.push([C.veh.map(v => [v.g.position.x, v.g.position.z]), C.un ? 'ONU' : C.label || 'ROMEO 6-4']);
  if (IRN.convoy) L.push([IRN.convoy.map(v => [v.g.position.x, v.g.position.z]), 'ROMEO 6-4']);
  if (FLIGHT.on && FLIGHT.convoy && !FLIGHT.attract)
    L.push([FLIGHT.convoy.map(v => [v.g.position.x, v.g.position.z]), 'ROMEO 6-4']);
  if (G && G.m && G.m.syms)
    for (const s of G.m.syms) {
      const p = s.pts();
      if (p.length) L.push([p, s.label, true]);
    } // infantería que no manda el jugador
  return L;
}
function updConvoySyms() {
  const L = (MIS && MIS.id === 'attract') || CINE.on ? [] : convoyLists(),
    s = halfH() * 0.16;
  while (convSyms.length < L.length) {
    const sp = new T.Sprite(new T.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true }));
    overlay.add(sp);
    convSyms.push(sp);
  }
  convSyms.forEach((sp, k) => {
    if (!sp.parent) overlay.add(sp);
    const e = L[k];
    sp.visible = !!e;
    if (!e) return;
    const lab = e[1],
      key = lab + (e[2] ? '|i' : '');
    if (!SYM_TEX[key]) SYM_TEX[key] = natoTex(lab, e[2]);
    if (sp.material.map !== SYM_TEX[key]) {
      sp.material.map = SYM_TEX[key];
      sp.material.needsUpdate = true;
    }
    const cx = e[0].reduce((a, p) => a + p[0], 0) / e[0].length,
      cz = e[0].reduce((a, p) => a + p[1], 0) / e[0].length;
    sp.position.set(cx, 4.5 + s * 0.6, cz);
    sp.scale.set(s * 1.14, s, 1);
    sp.material.opacity = 0.92;
  });
}
