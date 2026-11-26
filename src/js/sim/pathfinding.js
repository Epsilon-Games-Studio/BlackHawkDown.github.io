/* ====================================================================================================
 * sim/pathfinding.js
 *
 * Búsqueda de caminos
 *
 * A* sobre la rejilla, suavizado de rutas y saltos de muretes.
 * ================================================================================================== */

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, 1.414],
  [1, -1, 1.414],
  [-1, 1, 1.414],
  [-1, -1, 1.414]
];
function hpush(h, f, k) {
  h.push([f, k]);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    const t = h[p];
    h[p] = h[i];
    h[i] = t;
    i = p;
  }
}
function hpop(h) {
  const top = h[0],
    last = h.pop();
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1,
        r = l + 1;
      let m = i;
      if (l < h.length && h[l][0] < h[m][0]) m = l;
      if (r < h.length && h[r][0] < h[m][0]) m = r;
      if (m === i) break;
      const t = h[m];
      h[m] = h[i];
      h[i] = t;
      i = m;
    }
  }
  return top;
}
const PF = { stamp: 0 },
  FC = { stamp: 0 };
// un camino recto de a a b, con un poco de holgura a cada lado, que nunca toca una pared ni un obstáculo
function clearWalk(ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az),
    n = Math.ceil(L / 0.25);
  for (let k = 1; k < n; k++) {
    const t = k / n,
      x = ax + (bx - ax) * t,
      z = az + (bz - az) * t;
    for (const [ox, oz] of [
      [0, 0],
      [0.32, 0],
      [-0.32, 0],
      [0, 0.32],
      [0, -0.32]
    ])
      if (!walk(Math.floor(x + ox), Math.floor(z + oz))) return false;
  }
  return true;
}
// tirar de la cuerda: desde cada esquina salto a la celda más lejana que se alcanza en línea recta; luego el soldado redondea las esquinas
function smoothPath(p, sx, sz) {
  if (!p || p.length < 3) return p || [];
  const out = [];
  let ax = sx,
    az = sz,
    i = 0;
  while (i < p.length) {
    let j = Math.min(p.length - 1, i + 48);
    while (j > i && !clearWalk(ax, az, p[j][0] + 0.5, p[j][1] + 0.5)) j--;
    out.push(p[j]);
    ax = p[j][0] + 0.5;
    az = p[j][1] + 0.5;
    i = j + 1;
  }
  return out;
}
// la curva que se pinta en el suelo: recorte de esquinas de Chaikin, para que los giros se lean como arcos
function curvePts(pts, it) {
  let P = pts;
  for (let r = 0; r < (it || 3); r++) {
    if (P.length < 3) break;
    const Q = [P[0]];
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k],
        b = P[k + 1];
      Q.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]
      );
    }
    Q.push(P[P.length - 1]);
    P = Q;
  }
  return P;
}
const VAULT = { wall: 1, sandbag: 1 };
function vaultCell(i, j) {
  if (!inB(i, j)) return false;
  const k = idx(i, j),
    o = cov[k];
  return grid[k] === 2 && !!o && !!VAULT[o.kind] && !o.barricade && !o.dead;
}
// ¿hay un murete cruzando el siguiente tramo de su ruta? Entonces lo salta
function vaultScan(u) {
  const n = u.path[0];
  if (!n) return;
  const dx = n[0] + 0.5 - u.x,
    dz = n[1] + 0.5 - u.z,
    d = Math.hypot(dx, dz);
  if (d < 0.6 || d > 3.4) return;
  for (let q = 0.3; q < d && q < 1.5; q += 0.25) {
    const i = Math.floor(u.x + (dx / d) * q),
      j = Math.floor(u.z + (dz / d) * q);
    if (vaultCell(i, j)) {
      u.vault = { cx: i + 0.5, cz: j + 0.5, dx: dx / d, dz: dz / d, t: 0 };
      return;
    }
  }
}
function findPath(si, sj, gi, gj) {
  if (!walk(gi, gj)) return null;
  const N = W * H;
  if (!PF.gc) {
    PF.gc = new Float32Array(N);
    PF.came = new Int32Array(N);
    PF.seen = new Uint32Array(N);
    PF.shut = new Uint32Array(N);
  }
  const st = ++PF.stamp,
    gcA = PF.gc,
    came = PF.came,
    seen = PF.seen,
    shut = PF.shut;
  const gc = { get: k => (seen[k] === st ? gcA[k] : 1e9) };
  const s = idx(si, sj),
    goal = idx(gi, gj);
  const hh = (i, j) => Math.hypot(i - gi, j - gj);
  const open = [];
  hpush(open, hh(si, sj), s);
  seen[s] = st;
  gcA[s] = 0;
  came[s] = -1;
  let it = 0;
  while (open.length && it++ < 40000) {
    const cur = hpop(open)[1];
    if (shut[cur] === st) continue;
    shut[cur] = st;
    if (cur === goal) break;
    const ci = kI(cur),
      cj = kJ(cur);
    for (const [dx, dy, c] of DIRS) {
      const ni = ci + dx,
        nj = cj + dy;
      if (!walk(ni, nj)) {
        if (c === 1 && !PF.noVault && vaultCell(ni, nj) && walk(ni + dx, nj + dy)) {
          const vk = idx(ni + dx, nj + dy),
            vg = gcA[cur] + 5.5;
          if (vg < gc.get(vk)) {
            seen[vk] = st;
            gcA[vk] = vg;
            came[vk] = cur;
            hpush(open, vg + hh(ni + dx, nj + dy), vk);
          }
        }
        continue;
      }
      if (dx && dy && (!walk(ci + dx, cj) || !walk(ci, cj + dy))) continue;
      const nk = idx(ni, nj),
        ng = gcA[cur] + c;
      if (ng < gc.get(nk)) {
        seen[nk] = st;
        gcA[nk] = ng;
        came[nk] = cur;
        hpush(open, ng + hh(ni, nj), nk);
      }
    }
  }
  if (seen[goal] !== st && goal !== s) return null;
  const out = [];
  let k = goal;
  while (k !== s && k !== -1) {
    out.push([kI(k), kJ(k)]);
    k = came[k];
  }
  return out.reverse();
}
