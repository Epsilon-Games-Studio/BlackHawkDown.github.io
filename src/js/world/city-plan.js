/* ====================================================================================================
 * world/city-plan.js
 *
 * Plano de la ciudad
 * ================================================================================================== */

function vline(x0, x1, z0, z1, paved) {
  for (let z = Math.max(0, z0); z <= Math.min(H - 1, z1); z++)
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      const k = idx(x, z);
      STR[k] = Math.max(STR[k], paved ? 2 : 1);
      SVX[k] = x0;
      SVW[k] = x1 - x0 + 1;
    }
}
function hline(z0, z1, x0, x1, paved) {
  for (let z = Math.max(0, z0); z <= Math.min(H - 1, z1); z++)
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      const k = idx(x, z);
      STR[k] = Math.max(STR[k], paved ? 2 : 1);
      SHZ[k] = z0;
      SHW[k] = z1 - z0 + 1;
    }
}
function dline(ax, az, bx, bz, w, dirt) {
  const L = Math.hypot(bx - ax, bz - az);
  for (let t = 0; t <= L; t += 0.4) {
    const x = ax + ((bx - ax) * t) / L,
      z = az + ((bz - az) * t) / L;
    for (let a = -w / 2; a <= w / 2; a += 0.5)
      for (let b = -w / 2; b <= w / 2; b += 0.5) {
        const i = Math.floor(x + a),
          j = Math.floor(z + b);
        if (inB(i, j) && Math.hypot(a, b) <= w / 2) {
          const k = idx(i, j);
          if (dirt) {
            if (!reserved[k] && grid[k] === 0) STR[k] = Math.max(STR[k], 1);
          } else STR[k] = 2;
        }
      }
  }
}
function genLines(lo, hi, avoid) {
  const out = [];
  let p = lo;
  while (true) {
    p += Math.round(rr(26, 40));
    if (p > hi) break;
    const w = rnd() < 0.2 ? 6 : 4 + ri(2);
    if (avoid.some(a => p + w + 10 > a[0] && p - 10 < a[1])) continue;
    out.push([p, p + w - 1]);
    p += w;
  }
  return out;
}
let VALL = [],
  HALL = [],
  TRACKS = [];
function planStreets() {
  STR = new Uint8Array(W * H);
  SVX = new Int16Array(W * H).fill(-1);
  SVW = new Uint8Array(W * H);
  SHZ = new Int16Array(W * H).fill(-1);
  SHW = new Uint8Array(W * H);
  // las calles de barrio atraviesan toda la ciudad: Hawlwadig Road de norte a sur y la avenida principal de este a oeste
  // todas las calles son de tierra batida con rodadas; la única carretera asfaltada de la ciudad es la avenida destrozada
  // que sube al norte desde el K-4, pasa junto al derribo del Super 61 y llega al estadio: el recorrido de la Milla de Mogadiscio
  const V = [
    [OX + 9, OX + 13],
    [OX + 29, OX + 35],
    [OX + 51, OX + 55],
    [218, 222],
    [290, 294],
    [329, 333],
    [348, 352],
    [368, 372],
    [389, 393],
    [MILE_X - 3, MILE_X + 3, 'mile']
  ];
  // al norte del objetivo, una tirada de calles transversales muy juntas sube hasta el estadio
  const Hh = [
    [OZ + 10, OZ + 14],
    [OZ + 28, OZ + 35],
    [OZ + 50, OZ + 54],
    [99, 103],
    [115, 119],
    [132, 136],
    [149, 153],
    [166, 171],
    [182, 186],
    [199, 203],
    [218, 222],
    [290, 294],
    [318, 324],
    [407, 413, 'k4']
  ];
  const vAll = V.concat(genLines(-30, 214, V), genLines(294, W - 12, V));
  const hAll = Hh.concat(genLines(-30, 214, Hh), genLines(294, H - 12, Hh));
  VALL = vAll;
  HALL = hAll;
  // las calles viven y mueren con la ciudad: pavimentadas en el centro, de tierra en las afueras y desaparecidas en el monte.
  // Las avenidas grandes siguen como pistas de tierra casi hasta el borde; las calles secundarias se acaban al azar.
  const lay = (l, vert, main) => {
    const thr = main ? 0.045 : 0.14 + rnd() * 0.14,
      pv = main ? 0.22 : 0.5,
      c = (l[0] + l[1]) / 2,
      N = vert ? H : W;
    for (let t = 0; t < N; t++) {
      const d = vert ? cityDs(c, t + 0.5) : cityDs(t + 0.5, c);
      if (d < thr) continue;
      const paved =
        (l[2] === 'mile' && t >= STADIUM.z + STADIUM.rz - 2 && t <= 412) ||
        (l[2] === 'k4' && t >= 338 && t <= MILE_X + 3);
      if (vert) vline(l[0], l[1], t, t, paved);
      else hline(l[0], l[1], t, t, paved);
    }
  };
  vAll.forEach((l, k) => lay(l, true, k < V.length));
  hAll.forEach((l, k) => lay(l, false, k < Hh.length));
  // pistas: senderos y caminos de pick-up que se escapan de las últimas calles hacia el monte
  TRACKS = [];
  for (let n = 0; n < 26; n++) {
    const a0 = (n / 26) * Math.PI * 2 + rr(-0.1, 0.1);
    let x = 286,
      z = 270;
    for (let st = 0; st < 60; st++) {
      x += Math.cos(a0) * 5;
      z += Math.sin(a0) * 5;
      if (cityDs(clamp(x, 0, W - 1), clamp(z, 0, H - 1)) < 0.3 || coastS(x, z) > -30) break;
    }
    if (coastS(x, z) > -30) continue;
    let a = a0,
      L = rr(90, 260),
      px = x,
      pz = z;
    for (let s = 0; s < L; s += 14) {
      a += rr(-0.35, 0.35);
      const nx = px + Math.cos(a) * 14,
        nz = pz + Math.sin(a) * 14;
      if (coastS(nx, nz) > -26) break;
      TRACKS.push([px, pz, nx, nz, 2.6, false]);
      dline(px, pz, nx, nz, 2.6, true);
      px = nx;
      pz = nz;
    }
  }
  vline(376, 378, 295, 317, false); // el callejón donde cayó el Super 6-1
  for (const sg of ROADSEG) {
    if (
      Math.max(sg[0], sg[2]) < -10 ||
      Math.max(sg[1], sg[3]) < -10 ||
      Math.min(sg[0], sg[2]) > W + 10 ||
      Math.min(sg[1], sg[3]) > H + 10
    )
      continue;
    const L = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]),
      t0 = 0;
    let a0 = 0,
      a1 = 1;
    for (let t = 0; t <= 1; t += 4 / L) {
      const x = sg[0] + (sg[2] - sg[0]) * t,
        z = sg[1] + (sg[3] - sg[1]) * t;
      if (x < -12 || z < -12 || x > W + 12 || z > H + 12) {
        if (t < 0.5) a0 = t;
        else {
          a1 = t;
          break;
        }
      }
    }
    dline(
      sg[0] + (sg[2] - sg[0]) * a0,
      sg[1] + (sg[3] - sg[1]) * a0,
      sg[0] + (sg[2] - sg[0]) * a1,
      sg[1] + (sg[3] - sg[1]) * a1,
      sg[4],
      !sg[5]
    );
  }
  dline(330, 410, 380, 300, 6, true); // la carretera del aeropuerto y una diagonal desde el K-4
  // rotonda del K-4
  for (let j = 390; j <= 430; j++)
    for (let i = 310; i <= 350; i++) {
      const d = Math.hypot(i + 0.5 - 330, j + 0.5 - 410);
      const k = idx(i, j);
      if (d <= 17 && d >= 10) {
        STR[k] = 2;
        SVX[k] = -1;
        SHZ[k] = -1;
      } else if (d < 10) {
        STR[k] = 0;
        SVX[k] = -1;
        SHZ[k] = -1;
        reserved[k] = 1;
        ground[k] = 3;
        if (d < 2.5) {
          grid[k] = 1;
          topH[k] = 3;
        }
      }
    }
  // estadio
  for (let j = STADIUM.z - STADIUM.rz - 3; j <= STADIUM.z + STADIUM.rz + 3; j++)
    for (let i = STADIUM.x - STADIUM.rx - 3; i <= STADIUM.x + STADIUM.rx + 3; i++) {
      const e = Math.hypot((i + 0.5 - STADIUM.x) / STADIUM.rx, (j + 0.5 - STADIUM.z) / STADIUM.rz),
        k = idx(i, j);
      if (e > 1.08) continue;
      STR[k] = 0;
      SVX[k] = -1;
      SHZ[k] = -1;
      reserved[k] = 1;
      const a = Math.atan2(j + 0.5 - STADIUM.z, i + 0.5 - STADIUM.x),
        gate =
          [0, Math.PI, -Math.PI / 2, -Math.PI].some(g => Math.abs(a - g) < 0.07) || Math.abs(a - Math.PI / 2) < 0.16; // la puerta sur es ancha: la Milla termina en ella
      if (e > 0.78 && e <= 1 && !gate) {
        grid[k] = 1;
        topH[k] = 3.2;
      } else if (e <= 0.78) ground[k] = 7;
    }
  // mar y playa
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const s = coastS(i + 0.5, j + 0.5),
        k = idx(i, j);
      if (s > -3) {
        grid[k] = 3;
        STR[k] = 0;
        reserved[k] = 1;
      } else if (s > -24) {
        reserved[k] = 1;
        ground[k] = 11;
        STR[k] = Math.min(STR[k], 1);
      }
    }
  // el arco sobre National Street
  for (const zz of [
    [313, 316],
    [326, 329]
  ])
    for (let j = zz[0]; j <= zz[1]; j++)
      for (let i = 398; i <= 403; i++) {
        const k = idx(i, j);
        grid[k] = 1;
        topH[k] = 9;
        reserved[k] = 1;
      }
  for (let j = 317; j <= 325; j++) for (let i = 398; i <= 403; i++) reserved[idx(i, j)] = 1;
  for (let j = 297; j <= 307; j++) for (let i = 374; i <= 380; i++) reserved[idx(i, j)] = 1;
  for (let j = 352; j <= 368; j++) for (let i = 263; i <= 279; i++) reserved[idx(i, j)] = 1;
}
function reservePort() {
  // el recinto del puerto detrás de la playa se queda sin manzanas
  const P = LM.port,
    N_ = [COAST_NX, COAST_NZ],
    U_ = [COAST_DX, COAST_DZ];
  const at = (du, dn) => [P.x + U_[0] * du + N_[0] * dn, P.z + U_[1] * du + N_[1] * dn];
  {
    const c = at(0, -38);
    for (let j = Math.floor(c[1]) - 26; j <= c[1] + 26; j++)
      for (let i = Math.floor(c[0]) - 30; i <= c[0] + 30; i++) {
        if (!inB(i, j)) continue;
        const q = [i + 0.5 - c[0], j + 0.5 - c[1]],
          du = q[0] * U_[0] + q[1] * U_[1],
          dn = q[0] * N_[0] + q[1] * N_[1];
        if (Math.abs(du) < 40 && Math.abs(dn) < 16) {
          reserved[idx(i, j)] = 1;
        }
      }
  }
}
function planBlocks() {
  reservePort();
  const vAll = VALL,
    hAll = HALL;
  for (let j = OZ; j < OZ + 64; j++) for (let i = OX; i < OX + 64; i++) reserved[idx(i, j)] = 1;
  // mezquitas: blancas, con cúpula y minarete
  for (const [mx, mz] of [
    [200, 190],
    [350, 262],
    [150, 340],
    [430, 362],
    [300, 95],
    [95, 220],
    [214, 430],
    [470, 250],
    [250, 140],
    [330, 470]
  ])
    if (cityDs(mx, mz) > 0.4)
      placeNear(mx, mz, 8, 8, (x, y) =>
        building(x, y, 8, 8, 2, { force: true, col: pick(OLDW), base: 0xd8d2c2, mosque: true })
      );
  // Villa Somalia: el recinto presidencial en su loma sobre la ciudad vieja
  placeNear(462, 312, 12, 9, (x, y) => {
    building(x, y, 12, 9, 2, { force: true, col: 0xf4f0e6, base: 0xd8d2c2, cren: true, arcade: true });
    courtyard(x - 3, y - 3, 18, 15);
    LM.villa.x = x + 6;
    LM.villa.z = y + 4.5;
  });
  // manzanas entre las líneas de calle
  const xs = vAll.map(l => l).sort((a, b) => a[0] - b[0]),
    zs = hAll.map(l => l).sort((a, b) => a[0] - b[0]);
  const bx = [],
    bz = [];
  let prev = 0;
  for (const l of xs) {
    if (l[0] - 1 >= prev) bx.push([prev, l[0] - 1]);
    prev = Math.max(prev, l[1] + 1);
  }
  if (prev <= W - 1) bx.push([prev, W - 1]);
  prev = 0;
  for (const l of zs) {
    if (l[0] - 1 >= prev) bz.push([prev, l[0] - 1]);
    prev = Math.max(prev, l[1] + 1);
  }
  if (prev <= H - 1) bz.push([prev, H - 1]);
  for (const xr of bx)
    for (const zr of bz) {
      const cx = (xr[0] + xr[1]) / 2,
        cz = (zr[0] + zr[1]) / 2;
      if (cx >= OX && cx < OX + 64 && cz >= OZ && cz < OZ + 64) continue;
      if (inR(BAKARA, cx, cz)) bakaraBlock(xr[0], zr[0], xr[1], zr[1]);
      else if (inR(SHANTY, cx, cz)) shantyBlock(xr[0], zr[0], xr[1], zr[1]);
      else fillCityBlock(xr[0], zr[0], xr[1], zr[1], { old: inR(OLDTOWN, cx, cz) });
    }
}
function placeNear(x, y, w, d, fn) {
  for (let r = 0; r < 14; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (freeLot(x + dx, y + dy, w, d)) {
          fn(x + dx, y + dy);
          return true;
        }
      }
  return false;
}
function fillCityBlock(x0, y0, x1, y1, st) {
  st = st || {};
  // cada parcela lee el campo de densidad: bloques altos y apretados en el centro, recintos con tapia, luego alguna casa suelta y luego monte
  const tierAt = (x, y) => {
    let d = cityDs(x, y) + (hash2(x * 7 + 3, y * 13 + 1) - 0.5) * 0.08;
    if (st.old) d = Math.max(d, 0.66);
    return d > 0.62 ? 0 : d > 0.42 ? 1 : d > 0.25 ? 2 : d > 0.1 ? 3 : 4;
  };
  let x = x0;
  while (x <= x1) {
    const tx = tierAt(x + 3, (y0 + y1) / 2),
      lw = [4, 4, 6, 7, 9][tx];
    let w = lw + ri(4);
    if (x + w - 1 > x1) w = x1 - x + 1;
    if (x1 - (x + w - 1) < 3 && x1 - (x + w - 1) > 0) w = x1 - x + 1;
    let y = y0;
    while (y <= y1) {
      const tier = tierAt(x + w / 2, y + 3),
        ld = [4, 4, 6, 7, 9][tier];
      let d = ld + ri(4);
      if (y + d - 1 > y1) d = y1 - y + 1;
      if (y1 - (y + d - 1) < 3 && y1 - (y + d - 1) > 0) d = y1 - y + 1;
      const pB = [0.72, 0.55, 0.34, 0.16, 0][tier],
        mxF = [4, 2, 1, 1, 0][tier],
        r = rnd();
      if (tier < 4 && w >= 2 && d >= 2 && r < pB) {
        const fl = Math.min(mxF, 1 + ri(4) + (rnd() < 0.12 ? 1 : 0));
        if (tier >= 2 && w >= 5 && d >= 5) {
          const bw = Math.min(w - 3, 3 + ri(3)),
            bd = Math.min(d - 3, 3 + ri(2));
          building(x + 1 + ri(Math.max(1, w - 2 - bw)), y + 1 + ri(Math.max(1, d - 2 - bd)), bw, bd, 1, {
            damaged: rnd() < 0.1
          });
          if (tier === 2 || rnd() < 0.5) courtyard(x, y, w, d);
        } else if (tier < 2)
          building(x, y, w, d, fl, {
            damaged: rnd() < 0.18,
            col: st.old ? pick(OLDW) : undefined,
            cren: st.old && rnd() < 0.55,
            arcade: st.old && rnd() < 0.35
          });
      } else if (tier < 3 && r < pB + (1 - pB) * [0.6, 0.55, 0.3][tier]) courtyard(x, y, w, d);
      else if (tier === 0 && r < 0.96) ruinLot(x, y, w, d);
      y += d;
      if (rnd() < 0.3 && y < y1 - 3) y += 2;
    }
    x += w;
    if (rnd() < 0.3 && x < x1 - 3) x += 2;
  }
}
function bakaraBlock(x0, y0, x1, y1) {
  MKT = MKT_BIG = true;
  try {
    bakaraFill(x0, y0, x1, y1);
  } finally {
    MKT = MKT_BIG = false;
  }
}
function bakaraFill(x0, y0, x1, y1) {
  for (let j = y0; j <= y1; j++)
    for (let i = x0; i <= x1; i++)
      if (inB(i, j) && grid[idx(i, j)] === 0 && !reserved[idx(i, j)]) ground[idx(i, j)] = 4;
  for (let i = x0; i <= x1 - 2; i += 3) {
    if (shack(i, y0, 3, 2)) shopFront(i + 1.5, y0 + 2, 0);
    shack(i, y1 - 1, 3, 2);
  }
  for (let j = y0 + 3; j <= y1 - 4; j += 3) {
    shack(x0, j, 2, 3);
    shack(x1 - 1, j, 2, 3);
  }
  for (let j = y0 + 4; j <= y1 - 4; j += 3)
    for (let i = x0 + 3; i <= x1 - 3; i += 2) if (rnd() < 0.78) addCover('stall', i, j);
  for (let k = 0; k < ((x1 - x0) * (y1 - y0)) / 40; k++)
    addCover(
      pick(['crates', 'crates', 'tires', 'barrel', 'rubble']),
      x0 + 2 + ri(Math.max(1, x1 - x0 - 3)),
      y0 + 2 + ri(Math.max(1, y1 - y0 - 3))
    );
  MAT = M.TIN;
  const NB = () => {}; // (las chapas sueltas que flotaban sobre los pasillos ya no están; dejo sus tiradas para que la ciudad no cambie)
  for (let j = y0 + 5; j <= y1 - 5; j += 6)
    for (let i = x0 + 3; i <= x1 - 6; i += 7)
      if (rnd() < 0.5)
        NB(i + 2.5, 2.15, j + 0.5, rr(4, 6), 0.06, rr(2, 3), pick([0x8a5a3c, 0x7a7a72, 0x9a6a40, 0x6a7a7a]), {
          b: 0,
          roof: 1,
          rx: rr(-0.08, 0.08)
        });
}
/* El claro junto al segundo derribo, donde el Super 6-2 deja a Gordon y Shughart: ahí no hay chabolas en ninguna misión */
const S62_CLEAR = [
  [286.3, 340.5],
  [283.9, 353.9],
  [279.7, 353.6],
  [264.5, 351.9],
  [264.6, 341.7],
  [265, 335.6],
  [266.7, 335.2],
  [281.4, 337.5]
];
function inPoly(P, x, z) {
  let c = false;
  for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
    const [xa, za] = P[a],
      [xb, zb] = P[b];
    if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa) c = !c;
  }
  return c;
}
// las chabolas y la chatarra del claro se "construyen" como fantasmas: mismas tiradas aleatorias y mismas celdas ocupadas mientras se planifica la ciudad,
// así todo lo demás sale exactamente igual que antes; las celdas se vacían cuando termina la planificación (s62Clear)
let S62_GHOSTS = [];
function shantyBlock(x0, y0, x1, y1) {
  for (let j = y0; j <= y1 - 1; j += 3)
    for (let i = x0; i <= x1 - 2; i += 4) {
      const ii = i + ri(2);
      let ok = rnd() < 0.82;
      for (let jj = j; jj < j + 2; jj++)
        for (let k = ii; k < ii + 3; k++) if (!inB(k, jj) || reserved[idx(k, jj)]) ok = false;
      if (ok && inPoly(S62_CLEAR, ii + 1.5, j + 1)) {
        GHOST = true;
        if (shack(ii, j, 3, 2))
          for (let jj = j; jj < j + 2; jj++) for (let k = ii; k < ii + 3; k++) S62_GHOSTS.push(idx(k, jj));
        GHOST = false;
      } else if (ok) shack(ii, j, 3, 2);
    }
  for (let k = 0; k < 6; k++) {
    const kd = pick(['rubble', 'tires', 'crates', 'wall']),
      ci = x0 + ri(Math.max(1, x1 - x0)),
      cj = y0 + ri(Math.max(1, y1 - y0)),
      dr = rnd() < 0.5 ? 'x' : 'z';
    if (inPoly(S62_CLEAR, ci + 0.5, cj + 0.5)) {
      GHOST = true;
      const o = addCover(kd, ci, cj, dr);
      GHOST = false;
      if (o) S62_GHOSTS.push(...o.cells);
    } else addCover(kd, ci, cj, dr);
  }
}
function s62Clear() {
  for (const [o, k] of MKT_WIDE) {
    const k0 = o.cells[0];
    if (grid[k] !== 0 || k0 == null) continue;
    grid[k] = grid[k0];
    topH[k] = topH[k0];
    cov[k] = o;
    o.cells.push(k);
  }
  MKT_WIDE = [];
  for (const k of STAD_GH) {
    grid[k] = 0;
    topH[k] = 0;
    cov[k] = null;
  }
  STAD_GH = [];
  for (const k of S62_GHOSTS) {
    grid[k] = 0;
    topH[k] = 0;
    cov[k] = null;
  }
  S62_GHOSTS = [];
}
function streetJunk() {
  const spots = [];
  for (let n = 0; n < 20000; n++) {
    const i = ri(W),
      j = ri(H),
      k = idx(i, j);
    if (STR[k] && grid[k] === 0 && !reserved[k]) spots.push([i, j]);
  }
  for (let k = 0; k < Math.min(spots.length, 1150); k++) {
    const s = spots[k],
      p = 0.1 + 0.75 * cityDs(s[0], s[1]);
    if (rnd() > p) continue;
    const kd = pick([
      'car',
      'car',
      'car',
      'rubble',
      'crates',
      'tires',
      'barrel',
      'pickup',
      'van',
      'wall',
      'bus',
      'rubble',
      'tires'
    ]);
    let si = s[0],
      sj = s[1],
      sd = rnd() < 0.5 ? 'x' : 'z';
    const burnt = rnd() < 0.35;
    if (VEH_KIND[kd]) {
      const k = idx(si, sj),
        vr = vehRnd(si, sj);
      if (SVX[k] >= 0 && (SHZ[k] < 0 || vr() < 0.5)) {
        sd = 'z';
        si = vr() < 0.5 ? SVX[k] : SVX[k] + SVW[k] - 1;
      } // a lo largo de una calle norte-sur, contra uno de los lados
      else if (SHZ[k] >= 0) {
        sd = 'x';
        sj = vr() < 0.5 ? SHZ[k] : SHZ[k] + SHW[k] - 1;
      }
    }
    addCover(kd, si, sj, sd, { burnt });
  }
}
