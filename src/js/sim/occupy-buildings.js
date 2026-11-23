/* ====================================================================================================
 * sim/occupy-buildings.js
 *
 * Edificios que se pueden ocupar: planta baja (oculta, muros macizos) o la azotea (pretil, fuego sobre los tejados más bajos)
 * ================================================================================================== */

'use strict';

let BLDS = [],
  BID = null;
function regB(x, y, w, d, top) {
  const id = BLDS.length;
  BLDS.push({ id, x, y, w, d, top });
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (inB(i, j)) BID[idx(i, j)] = id;
  return id;
}
function bAt(i, j) {
  return inB(i, j) && grid[idx(i, j)] === 1 ? BID[idx(i, j)] : -1;
}
function bSlots(b, level) {
  if (b.pts) return b.pts;
  // puestos a lo largo de las paredes (ventanas abajo, el pretil arriba), media celda hacia dentro desde el borde
  const pts = [],
    m = 0.55,
    x0 = b.x + m,
    x1 = b.x + b.w - m,
    z0 = b.y + m,
    z1 = b.y + b.d - m;
  const ok = (x, z) => {
    const k = idx(Math.floor(x), Math.floor(z));
    return grid[k] === 1 && BID[k] === b.id;
  };
  const push = (x, z) => {
    if (ok(x, z) && !pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 0.9)) pts.push([x, z]);
  };
  for (let t = x0; t <= x1 + 0.01; t += 1.1) {
    push(t, z0);
    push(t, z1);
  }
  for (let t = z0; t <= z1 + 0.01; t += 1.1) {
    push(x0, t);
    push(x1, t);
  }
  if (b.ring)
    for (let t = b.x + b.w / 2 - 3; t <= b.x + b.w / 2 + 3; t += 1.1) {
      push(t, b.y + 1.5);
      push(t, b.y + b.d - 1.5);
    }
  if (!pts.length) pts.push([b.x + b.w / 2, b.y + b.d / 2]);
  return pts;
}
function bDoors(b) {
  const out = [];
  for (let j = b.y - 1; j <= b.y + b.d; j++)
    for (let i = b.x - 1; i <= b.x + b.w; i++) {
      if (!walk(i, j)) continue;
      if (
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ].some(([dx, dy]) => bAt(i + dx, j + dy) === b.id)
      )
        out.push([i, j]);
    }
  return out;
}
function cmdEnter(bid, level) {
  const b = BLDS[bid],
    sel = alive();
  if (!b || !sel.length) return;
  const doors = bDoors(b);
  if (!doors.length) {
    hint('No hay acceso a ese edificio');
    return;
  }
  for (const u of sel) {
    if (u.inB && u.inB.b === bid) {
      if (u.inB.level !== level) placeInB(u, b, level);
      continue;
    }
    leaveB(u);
    const dd = doors
      .slice()
      .sort(
        (p, q) => Math.hypot(p[0] + 0.5 - u.x, p[1] + 0.5 - u.z) - Math.hypot(q[0] + 0.5 - u.x, q[1] + 0.5 - u.z)
      )[0];
    const here = Math.floor(u.x) === dd[0] && Math.floor(u.z) === dd[1];
    const pth = here ? [] : findPath(Math.floor(u.x), Math.floor(u.z), dd[0], dd[1]);
    if (!here && !pth) continue;
    u.path = pth;
    u.order = { type: 'enter', b: bid, level, door: dd };
    u.stance = 'stand';
    if (here) placeInB(u, b, level);
  }
  radio(
    sel[0],
    level === 'roof'
      ? pick(['¡Arriba, a la azotea!', '¡Todos al tejado!'])
      : pick(['¡Dentro del edificio, rápido!', '¡Adentro, tomad las ventanas!'])
  );
}
function placeInB(u, b, level) {
  const slots = bSlots(b, level);
  const used = new Set(
    units.filter(o => o !== u && o.alive && o.inB && o.inB.b === b.id && o.inB.level === level).map(o => o.inB.slot)
  );
  const thr = nearestThreat(u);
  let best = -1,
    bs = -1e9;
  slots.forEach((s, k) => {
    if (used.has(k)) return;
    const sc = -Math.hypot(s[0] - thr.x, s[1] - thr.z) * 0.25 - Math.hypot(s[0] - u.x, s[1] - u.z) * 0.05;
    if (sc > bs) {
      bs = sc;
      best = k;
    }
  });
  if (best < 0) {
    hint('Ese edificio ya está lleno');
    u.order = null;
    return;
  }
  const door = u.order && u.order.door ? u.order.door : nearestFree(Math.floor(u.x), Math.floor(u.z));
  u.inB = { b: b.id, level, slot: best, door };
  u.x = slots[best][0];
  u.z = slots[best][1];
  u.vx = u.vz = 0;
  u.path = [];
  u.order = { type: 'hold' };
  u.stance = 'crouch';
  u.elev = level === 'roof' ? b.top : 0;
  u.face = Math.atan2(thr.x - u.x, thr.z - u.z);
}
function leaveB(u) {
  if (!u.inB) return;
  const d = u.inB.door;
  u.x = d[0] + 0.5;
  u.z = d[1] + 0.5;
  u.inB = null;
  u.elev = 0;
  u.stance = 'stand';
}
const eyeH = u => (u.elev || 0) + (u.stance === 'prone' ? 0.25 : u.stance === 'crouch' ? 0.7 : 1.0);
function losE(ax, az, ha, ba, bx, bz, hb, bb) {
  const dx = bx - ax,
    dz = bz - az,
    d = Math.hypot(dx, dz),
    steps = Math.ceil(d * 3);
  for (let s = 1; s < steps; s++) {
    const t = s / steps,
      i = Math.floor(ax + dx * t),
      j = Math.floor(az + dz * t);
    if (!inB(i, j)) continue;
    const k = idx(i, j);
    if (grid[k] !== 1) continue;
    const bid = BID[k];
    if (bid >= 0 && (bid === ba || bid === bb)) continue;
    if (topH[k] < ha + (hb - ha) * t - 0.15) continue;
    return false;
  }
  return true;
}
function losU(a, b) {
  if (!a.inB && !b.inB) return los(a.x, a.z, b.x, b.z);
  return losE(a.x, a.z, eyeH(a), a.inB ? a.inB.b : -1, b.x, b.z, eyeH(b), b.inB ? b.inB.b : -1);
}
function losP(u, x, z) {
  return u.inB ? losE(u.x, u.z, eyeH(u), u.inB.b, x, z, 0.4, -1) : los(u.x, u.z, x, z);
}
function wallPoint(t, s) {
  const b = BLDS[t.inB.b];
  return [
    clamp(s.x, b.x + 0.02, b.x + b.w - 0.02),
    t.inB.level === 'roof' ? b.top + rr(0.1, 0.45) : rr(0.35, 1.1),
    clamp(s.z, b.y + 0.02, b.y + b.d - 0.02)
  ];
}
