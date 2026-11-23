/* ====================================================================================================
 * sim/commands.js
 *
 * Órdenes
 *
 * Órdenes básicas del jugador: quién está seleccionado, el modo de orden y mover.
 * ================================================================================================== */

'use strict';

const alive = () => [...G.sel].filter(u => u.alive);
function setMode(m) {
  G.mode = m;
  $('oChain').setAttribute('aria-pressed', m === 'move');
  G.newRoute = true;
  $('oAtk').setAttribute('aria-pressed', m === 'attack');
  $('oSup').setAttribute('aria-pressed', m === 'suppress');
  $('oLB').setAttribute('aria-pressed', m === 'lb');
  $('oFlr').setAttribute('aria-pressed', m === 'flare');
  $('oSupport').setAttribute('aria-pressed', m === 'lb' || m === 'flare');
  if (m !== 'lb' && SUP) {
    SUP.lbA = null;
    SUP.draft = null;
  }
  hint(
    m === 'attack'
      ? 'Toca un enemigo visible'
      : m === 'suppress'
        ? 'Toca una zona o un enemigo'
        : m === 'lb'
          ? 'Little Bird: arrastra una línea por donde quieres la pasada (o toca el inicio y el final)'
          : m === 'flare'
            ? 'Bengala: toca la zona que quieres iluminar'
            : ''
  );
}
function cmdMove(ci, cj, append) {
  let sel = alive();
  if (!sel.length) return;
  G.newRoute = false;
  {
    const F = formOf(sel);
    if (F) return formMove(F, ci, cj, append);
    for (const u of sel) if (u.fg) u.fgOff = true;
  } // parte de una formación mandada por su cuenta: sale de ella
  if (sel.some(u => u.spent)) {
    sel = sel.filter(u => !u.spent);
    hint(
      sel.length
        ? 'Los agotados se quedan a cubierto hasta recuperar el aliento'
        : 'Agotados: necesitan recuperar el aliento a cubierto'
    );
    if (!sel.length) return;
  }
  if (sel.length === 1) sel[0].soloT = G.t;
  else {
    const ld = sel[0];
    ld.sigT = 1.3;
    ld.sigK = 'point';
  }
  if (sel.length >= 2 && sel.length >= us.filter(u => u.alive && !u.npc).length) G.m.allMove = true;
  const cells = [];
  const seen = new Set();
  const q = [[ci, cj]];
  seen.add(idx(ci, cj));
  while (q.length && cells.length < sel.length) {
    const [i, j] = q.shift();
    if (walk(i, j)) cells.push([i, j]);
    for (const [dx, dy] of DIRS) {
      const ni = i + dx,
        nj = j + dy;
      if (!walk(ni, nj)) continue;
      const k = idx(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([ni, nj]);
    }
  }
  sel.sort((a, b) => Math.hypot(a.x - ci, a.z - cj) - Math.hypot(b.x - ci, b.z - cj));
  const solo = sel.length === 1 ? nextRouteCol() : null; // un hombre solo: su ruta lleva su propio color
  sel.forEach((u, k) => {
    const c = cells[k] || cells[0];
    if (!c) return;
    if (u.inB) {
      leaveB(u);
      append = false;
    }
    const last = append && u.path.length ? u.path[u.path.length - 1] : null;
    const seg = last
      ? smoothPath(findPath(last[0], last[1], c[0], c[1]), last[0] + 0.5, last[1] + 0.5)
      : smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z);
    u.chainN = last ? (u.chainN || 1) + 1 : 1;
    if (MIS.id === 'tutorial') u.tzMv = (u.tzMv || 0) + 1;
    u.order = { type: 'move', kneel: sel.length > 1 && k % 2 === 1 };
    u.path = last ? u.path.concat(seg || []) : seg || [];
    u.stance = 'stand';
    u.routeCol = solo;
  }); // al llegar, uno sí y uno no hincan la rodilla a la vez
  moveMark.position.set(ci + 0.5, 0.06, cj + 0.5);
  moveMark.material.opacity = 1;
  moveMark.material.color.set(solo || 0x7fb8ff);
}
