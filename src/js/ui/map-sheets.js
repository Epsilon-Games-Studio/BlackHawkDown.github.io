/* ====================================================================================================
 * ui/map-sheets.js
 *
 * Mapas tácticos: papel, mar rayado, cuadrículas y nombres
 * ================================================================================================== */

let MAPC = null;
const MAP_INK = '#3a2e1c',
  MAP_RED = '#a8321e',
  MAP_BLUE = '#2a5a9a';
function mapLabel(x, t, px, py, o) {
  t = L(t);
  o = o || {};
  x.save();
  x.translate(px, py);
  if (o.rot) x.rotate(o.rot);
  x.font =
    (o.it ? 'italic ' : '') + (o.w || 600) + ' ' + (o.size || 15) + 'px "Barlow Condensed", "Arial Narrow", sans-serif';
  x.textAlign = o.align || 'left';
  x.textBaseline = 'middle';
  let tx = t;
  if (o.sp) {
    tx = t.split('').join(String.fromCharCode(8202));
  }
  const w = x.measureText(tx).width;
  if (!o.rot && (!o.align || o.align === 'left')) {
    const cw = x.canvas.width;
    if (px + w > cw - 4) {
      x.translate(-(px + w - (cw - 4)), 0);
    }
  }
  if (o.halo !== false) {
    x.lineWidth = o.hw || 3.5;
    x.strokeStyle = o.haloC || 'rgba(236,226,196,.92)';
    x.lineJoin = 'round';
    x.strokeText(tx, 0, 0);
  }
  x.fillStyle = o.col || MAP_INK;
  x.fillText(tx, 0, 0);
  x.restore();
}
function mapSym(x, kind, px, py) {
  x.save();
  x.lineWidth = 2;
  if (kind === 'crash') {
    x.strokeStyle = MAP_RED;
    x.beginPath();
    x.arc(px, py, 9, 0, 6.3);
    x.stroke();
    x.beginPath();
    x.moveTo(px - 6, py - 6);
    x.lineTo(px + 6, py + 6);
    x.moveTo(px + 6, py - 6);
    x.lineTo(px - 6, py + 6);
    x.stroke();
  } else if (kind === 'target') {
    x.strokeStyle = MAP_RED;
    x.strokeRect(px - 8, py - 8, 16, 16);
    x.beginPath();
    x.moveTo(px - 12, py);
    x.lineTo(px + 12, py);
    x.moveTo(px, py - 12);
    x.lineTo(px, py + 12);
    x.stroke();
  } else if (kind === 'un') {
    x.fillStyle = 'rgba(80,140,210,.25)';
    x.strokeStyle = MAP_BLUE;
    x.fillRect(px - 11, py - 7, 22, 14);
    x.strokeRect(px - 11, py - 7, 22, 14);
    x.fillStyle = MAP_BLUE;
    x.font = '700 10px "Arial Narrow", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('ONU', px, py + 0.5);
  } else if (kind === 'base') {
    x.fillStyle = 'rgba(80,140,210,.25)';
    x.strokeStyle = MAP_BLUE;
    x.fillRect(px - 13, py - 8, 26, 16);
    x.strokeRect(px - 13, py - 8, 26, 16);
    x.beginPath();
    x.moveTo(px - 13, py - 8);
    x.lineTo(px + 13, py + 8);
    x.moveTo(px + 13, py - 8);
    x.lineTo(px - 13, py + 8);
    x.stroke();
  } else {
    x.fillStyle = '#e8d8a8';
    x.strokeStyle = MAP_INK;
    x.beginPath();
    x.arc(px, py, 5, 0, 6.3);
    x.fill();
    x.stroke();
  }
  x.restore();
}
function mapGrid(x, w, h, n, cell, ox, oy) {
  x.save();
  x.strokeStyle = 'rgba(58,46,28,.38)';
  x.lineWidth = 1;
  for (let k = 0; k <= n; k++) {
    x.beginPath();
    x.moveTo(ox + k * cell, 0);
    x.lineTo(ox + k * cell, h);
    x.stroke();
    x.beginPath();
    x.moveTo(0, oy + k * cell);
    x.lineTo(w, oy + k * cell);
    x.stroke();
  }
  x.fillStyle = 'rgba(58,46,28,.75)';
  x.font = '700 14px "Arial Narrow", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let k = 0; k < n; k++) {
    const L = String.fromCharCode(65 + k);
    x.fillText(L, ox + (k + 0.5) * cell, 10);
    x.fillText(String(k + 1), 10, oy + (k + 0.5) * cell);
  }
  x.restore();
}
function mapNorth(x, px, py, ang) {
  x.save();
  x.translate(px, py);
  x.rotate(ang);
  x.fillStyle = MAP_INK;
  x.strokeStyle = MAP_INK;
  x.lineWidth = 1.5;
  x.beginPath();
  x.moveTo(0, -22);
  x.lineTo(7, 8);
  x.lineTo(0, 3);
  x.closePath();
  x.fill();
  x.beginPath();
  x.moveTo(0, -22);
  x.lineTo(-7, 8);
  x.lineTo(0, 3);
  x.closePath();
  x.stroke();
  x.font = '700 15px "Arial Narrow", sans-serif';
  x.textAlign = 'center';
  x.fillText('N', 0, -30);
  x.restore();
}
function mapScale(x, px, py, pxPerM, m) {
  const L = pxPerM * m;
  x.save();
  x.fillStyle = MAP_INK;
  x.strokeStyle = MAP_INK;
  x.lineWidth = 1.5;
  x.strokeRect(px, py, L, 6);
  x.fillRect(px, py, L / 2, 6);
  x.font = '600 13px "Arial Narrow", sans-serif';
  x.textBaseline = 'bottom';
  x.fillText('0', px - 3, py - 2);
  x.textAlign = 'right';
  x.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', px + L + 6, py - 2);
  x.restore();
}
function mapLegend(x, px, py, rows) {
  x.save();
  const h = rows.length * 20 + 30;
  x.fillStyle = 'rgba(240,232,208,.93)';
  x.strokeStyle = MAP_INK;
  x.lineWidth = 1.2;
  x.fillRect(px, py, 196, h);
  x.strokeRect(px, py, 196, h);
  x.fillStyle = MAP_INK;
  x.font = '700 14px "Arial Narrow", sans-serif';
  x.textBaseline = 'middle';
  x.fillText('LEYENDA', px + 10, py + 14);
  rows.forEach((r, k) => {
    const y = py + 34 + k * 20;
    r[0](x, px + 22, y);
    x.fillStyle = MAP_INK;
    x.font = '600 13px "Arial Narrow", sans-serif';
    x.textAlign = 'left';
    x.fillText(L(r[1]), px + 42, y);
  });
  x.restore();
}
const NORTH_ANG = Math.atan2(COAST_DZ, COAST_DX) + Math.PI / 2 - Math.PI / 4; // la costa va de suroeste a noreste
function buildMaps() {
  // ---- la hoja de la ciudad: 2 px por celda
  const CSC = 2,
    CWp = W * CSC,
    city = document.createElement('canvas');
  city.width = city.height = CWp;
  const cx = city.getContext('2d'),
    ci = cx.createImageData(CWp, CWp),
    cd = ci.data;
  const isB = (i, j) => inB(i, j) && grid[idx(i, j)] === 1;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = idx(i, j),
        g = grid[k],
        D_ = cityDs(i + 0.5, j + 0.5);
      let c;
      if (g === 3) c = null;
      else if (g === 1)
        c = isB(i - 1, j) && isB(i + 1, j) && isB(i, j - 1) && isB(i, j + 1) ? [152, 130, 100] : [104, 86, 64];
      else if (STR[k] === 2) c = [248, 242, 224];
      else if (STR[k] === 1) c = [226, 210, 170];
      else if (ground[k] === 7) c = [170, 186, 122];
      else if (ground[k] === 4) c = [224, 186, 130];
      else if (ground[k] === 11) c = [240, 230, 198];
      else if (g === 2) c = [150, 130, 100];
      else if (ground[k] === 2) c = [218, 204, 166];
      else {
        const f = sstep(0.05, 0.5, D_);
        c = [214 + 16 * f, 198 + 18 * f, 154 + 30 * f];
      }
      for (let b = 0; b < CSC; b++)
        for (let a = 0; a < CSC; a++) {
          const px = i * CSC + a,
            py = j * CSC + b,
            p = (py * CWp + px) * 4;
          let cc = c;
          if (!cc) {
            cc = (px + py) % 7 === 0 ? [118, 160, 182] : [156, 192, 206];
          } else if (!g && !STR[k] && !ground[k] && D_ < 0.3 && hash2(px * 3 + 1, py * 5 + 7) < 0.035)
            cc = [150, 140, 96];
          cd[p] = cc[0];
          cd[p + 1] = cc[1];
          cd[p + 2] = cc[2];
          cd[p + 3] = 255;
        }
    }
  cx.putImageData(ci, 0, 0);
  // tinta de la línea de costa
  cx.strokeStyle = 'rgba(42,80,104,.9)';
  cx.lineWidth = 1.5;
  cx.beginPath();
  for (let t = -200; t <= 900; t += 4) {
    const x0 = t,
      z0 = 1500 - ((t + 1200) * COAST_NX) / COAST_NZ;
    let x = x0,
      z = z0;
    for (let it = 0; it < 4; it++) {
      const s = coastS(x, z) + 3;
      x -= s * COAST_NX;
      z -= s * COAST_NZ;
    }
    t === -200 ? cx.moveTo(x * CSC, z * CSC) : cx.lineTo(x * CSC, z * CSC);
  }
  cx.stroke();
  mapGrid(cx, CWp, CWp, 8, CWp / 8, 0, 0);
  for (const [n, X, Z] of DISTRICTS)
    mapLabel(cx, n, X * CSC, Z * CSC, {
      size: 21,
      w: 700,
      it: true,
      col: 'rgba(120,70,34,.78)',
      sp: true,
      align: 'center',
      hw: 4
    });
  // calles
  mapLabel(cx, 'CALLE HAWLWADIG', 256 * CSC, 128 * CSC, { rot: -Math.PI / 2, size: 15, w: 700, align: 'center' });
  mapLabel(cx, 'CALLE HAWLWADIG', 256 * CSC, 300 * CSC, { rot: -Math.PI / 2, size: 15, w: 700, align: 'center' });
  mapLabel(cx, 'LA MILLA · AV. DEL ESTADIO', (MILE_X - 6) * CSC, 268 * CSC, {
    rot: -Math.PI / 2,
    size: 15,
    w: 700,
    align: 'center',
    col: '#5a2a14'
  });
  mapLabel(cx, 'CALLE NACIONAL', 300 * CSC, 321 * CSC, { size: 15, w: 700, align: 'center' });
  mapLabel(cx, 'CALLE WARSHADAHA', 200 * CSC, 168.5 * CSC, { size: 15, w: 700, align: 'center' });
  mapLabel(cx, 'AV. 21 DE OCTUBRE', 150 * CSC, 255.5 * CSC, { size: 15, w: 700, align: 'center' });
  mapLabel(cx, '← CTRA. AFGOOYE', 34 * CSC, 255.5 * CSC, { size: 14, w: 700 });
  mapLabel(cx, 'MAKKA AL-MUKARAMA', 352 * CSC, 352 * CSC, {
    rot: Math.atan2(300 - 410, 380 - 330),
    size: 15,
    w: 700,
    align: 'center'
  });
  mapLabel(cx, 'CTRA. DEL AEROPUERTO', 180 * CSC, 492 * CSC, {
    rot: Math.atan2(512 - 410, 150 - 330) + Math.PI,
    size: 15,
    w: 700,
    align: 'center'
  });
  mapLabel(cx, 'OCÉANO ÍNDICO', 640 * CSC, 640 * CSC, {
    size: 24,
    w: 700,
    it: true,
    col: '#2a5068',
    sp: true,
    align: 'center',
    haloC: 'rgba(170,204,218,.9)',
    rot: Math.atan2(COAST_DZ, COAST_DX)
  });
  mapLabel(cx, 'Playa del Lido', 700 * CSC, 392 * CSC, {
    size: 14,
    it: true,
    col: '#2a5068',
    haloC: 'rgba(200,220,226,.9)'
  });
  // sitios clave
  const SYM = {
    hotel: 'pt',
    target: 'target',
    cross: 'pt',
    bakara: 'pt',
    s61: null,
    s64: null,
    k4: 'pt',
    arch: 'pt',
    stadium: 'un',
    oldtown: null,
    port: null,
    air: null,
    villa: 'pt'
  };
  for (const k in LM) {
    const m = LM[k];
    if (!SYM[k] || m.x < 0 || m.z < 0 || m.x > W || m.z > H) continue;
    mapSym(cx, SYM[k], m.x * CSC, m.z * CSC);
    mapLabel(cx, m.n, m.x * CSC + 14, m.z * CSC + (k === 'hotel' ? 10 : k === 'target' ? -10 : 0), {
      size: 15,
      w: 700,
      col: SYM[k] === 'crash' || SYM[k] === 'target' ? MAP_RED : MAP_INK
    });
  }
  mapNorth(cx, CWp - 46, 90, NORTH_ANG);
  mapScale(cx, CWp - 300, CWp - 64, CSC / 1.5, 200);
  mapLegend(cx, 14, CWp - 186, [
    [
      (x, a, b) => {
        x.fillStyle = '#f8f2e0';
        x.strokeStyle = MAP_INK;
        x.lineWidth = 1;
        x.fillRect(a - 12, b - 4, 24, 8);
        x.strokeRect(a - 12, b - 4, 24, 8);
      },
      'Asfalto en mal estado'
    ],
    [
      (x, a, b) => {
        x.fillStyle = '#e2d2aa';
        x.fillRect(a - 12, b - 4, 24, 8);
      },
      'Calle o pista de tierra'
    ],
    [
      (x, a, b) => {
        x.fillStyle = '#987e5c';
        x.fillRect(a - 10, b - 6, 20, 12);
        x.strokeStyle = '#68563e';
        x.strokeRect(a - 10, b - 6, 20, 12);
      },
      'Edificios'
    ],
    [(x, a, b) => mapSym(x, 'crash', a, b), 'Black Hawk derribado'],
    [(x, a, b) => mapSym(x, 'target', a, b), 'Objetivo de la misión'],
    [(x, a, b) => mapSym(x, 'un', a, b), 'Fuerzas de la ONU'],
    [
      (x, a, b) => {
        x.fillStyle = MAP_BLUE;
        x.fillRect(a - 4, b - 4, 8, 8);
      },
      'Tu escuadra'
    ]
  ]);
  // ---- la hoja de la región
  const RW = 1000,
    sc = (WB.x1 - WB.x0) / RW,
    RH = Math.round((WB.z1 - WB.z0) / sc);
  const reg = document.createElement('canvas');
  reg.width = RW;
  reg.height = RH;
  const rx = reg.getContext('2d'),
    ri_ = rx.createImageData(RW, RH),
    rd = ri_.data;
  for (let py = 0; py < RH; py++)
    for (let px = 0; px < RW; px++) {
      const x = WB.x0 + (px + 0.5) * sc,
        z = WB.z0 + (py + 0.5) * sc,
        s = coastS(x, z),
        p = (py * RW + px) * 4;
      let c;
      if (s > -3) c = (px + py) % 7 === 0 ? [118, 160, 182] : s > 60 ? [146, 184, 200] : [160, 196, 210];
      else if (s > -24) c = [240, 230, 198];
      else {
        const n = fbm(x * 0.01, z * 0.01),
          D_ = cityDs(x, z);
        c = [222 - n * 14, 206 - n * 14, 166 - n * 12];
        if (x >= 0 && z >= 0 && x < W - 2 && z < H - 2) {
          let nb = 0,
            ns = 0;
          for (let b = 0; b < 3; b++)
            for (let a = 0; a < 3; a++) {
              const k = idx(Math.floor(x + a * 0.8), Math.floor(z + b * 0.8));
              if (grid[k] === 1) nb++;
              else if (STR[k]) ns++;
            }
          const f = (nb / 9) * 0.85;
          c = [c[0] * (1 - f) + 120 * f, c[1] * (1 - f) + 98 * f, c[2] * (1 - f) + 74 * f];
          const sw = ns > 4 ? clamp((D_ - 0.12) * 2.2, 0, 0.4) : 0;
          if (sw > 0) c = [c[0] * (1 - sw) + 246 * sw, c[1] * (1 - sw) + 238 * sw, c[2] * (1 - sw) + 216 * sw];
        } else if (D_ > 0.03) {
          const f = sstep(0.03, 0.5, D_) * 0.3;
          c = [c[0] * (1 - f) + 150 * f, c[1] * (1 - f) + 124 * f, c[2] * (1 - f) + 94 * f];
        }
        if (!(x >= 0 && z >= 0 && x < W - 2 && z < H - 2) && D_ > 0.03 && hash2(px * 13 + 5, py * 7 + 3) < D_ * 0.55)
          c = [112, 92, 70]; // recintos sueltos
        if (hash2(px * 7 + 3, py * 11 + 1) < 0.02 && D_ < 0.1) c = [150, 140, 96];
      }
      const [u, v] = airUV(x, z);
      if (Math.abs(u) < RWY.L && Math.abs(v) < RWY.W) c = [96, 92, 86];
      else if (v < APRON.v1 && v > APRON.v0 && u > APRON.u0 && u < APRON.u1) c = [178, 172, 160];
      else if (v <= -RWY.W && v > APRON.v1 - 6 && JOINS.some(J => Math.abs(u - J) < 9)) c = [178, 172, 160];
      else if (u > BASE.u0 && u < BASE.u1 && v > BASE.v0 && v < BASE.v1) c = [200, 184, 150];
      rd[p] = c[0];
      rd[p + 1] = c[1];
      rd[p + 2] = c[2];
      rd[p + 3] = 255;
    }
  rx.putImageData(ri_, 0, 0);
  const R = (x, z) => [(x - WB.x0) / sc, (z - WB.z0) / sc];
  const poly = (pts, w, col, dash) => {
    rx.save();
    rx.lineCap = 'round';
    rx.lineJoin = 'round';
    rx.strokeStyle = col;
    rx.lineWidth = w;
    if (dash) rx.setLineDash(dash);
    rx.beginPath();
    pts.forEach((p, k) => {
      const [X, Y] = R(p[0], p[1]);
      k ? rx.lineTo(X, Y) : rx.moveTo(X, Y);
    });
    rx.stroke();
    rx.restore();
  };
  for (const t of TRACKS)
    poly(
      [
        [t[0], t[1]],
        [t[2], t[3]]
      ],
      1,
      'rgba(120,90,50,.35)',
      [2, 4]
    );
  for (const r of ROADS) {
    if (r.paved) {
      poly(r.pts, 5, MAP_INK);
      poly(r.pts, 3, '#f4ecd2');
    } else poly(r.pts, 2.2, '#8a6a40', [6, 3]);
  }
  for (const v of VILLAGES) {
    for (let k = 0; k < 14; k++) {
      const a = hash2(k * 7 + 1, v.x | 0) * 6.28,
        d = Math.sqrt(hash2(k * 3, v.z | 0)) * v.r,
        [X, Y] = R(v.x + Math.cos(a) * d, v.z + Math.sin(a) * d);
      if (coastS(v.x + Math.cos(a) * d, v.z + Math.sin(a) * d) > -26) continue;
      rx.fillStyle = '#5a4630';
      rx.fillRect(X - 1.5, Y - 1.5, 3, 3);
    }
    const [X, Y] = R(v.x, v.z);
    mapLabel(rx, v.nm, X + v.r / sc + 4, Y, { size: 15, w: 700, it: true });
  }
  // la ruta de Irene
  poly(ireneRoute(), 2, 'rgba(42,90,154,.9)', [8, 5]);
  {
    const pts = ireneRoute(),
      a = R(pts[pts.length - 2][0], pts[pts.length - 2][1]),
      b = R(pts[pts.length - 1][0], pts[pts.length - 1][1]),
      ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    rx.save();
    rx.translate(b[0], b[1]);
    rx.rotate(ang);
    rx.fillStyle = MAP_BLUE;
    rx.beginPath();
    rx.moveTo(0, 0);
    rx.lineTo(-10, -5);
    rx.lineTo(-10, 5);
    rx.fill();
    rx.restore();
  }
  {
    const [X, Y] = R(-520, 1335);
    mapLabel(rx, 'Ruta de vuelo · Operación Irene', X, Y, {
      size: 14,
      w: 700,
      it: true,
      col: MAP_BLUE,
      rot: -0.52,
      align: 'center',
      haloC: 'rgba(200,220,226,.9)'
    });
  }
  const [ax, ay] = R(AIR.x, AIR.z);
  mapSym(rx, 'base', ax, ay);
  mapLabel(rx, 'Aeropuerto Int. de Mogadiscio', ax + 18, ay - 8, { size: 15, w: 700 });
  mapLabel(rx, 'base de la Task Force Ranger', ax + 18, ay + 9, { size: 13, it: true, col: MAP_BLUE });

  {
    const [X, Y] = R(LM.stadium.x, LM.stadium.z);
    mapSym(rx, 'un', X, Y);
  }
  {
    const [X, Y] = R(LM.target.x, LM.target.z);
    mapSym(rx, 'target', X, Y);
  }
  {
    const [X, Y] = R(LM.k4.x, LM.k4.z);
    mapSym(rx, 'pt', X, Y);
    mapLabel(rx, 'K-4', X + 8, Y + 4, { size: 13, w: 700 });
  }
  {
    const [X, Y] = R(250, 250);
    mapLabel(rx, 'MOGADISCIO', X, Y - 40, { size: 26, w: 800, sp: true, align: 'center', col: '#5a3a1c', hw: 5 });
  }
  {
    const [X, Y] = R(-500, 352);
    mapLabel(rx, 'Carretera de Afgooye', X, Y - 9, {
      size: 14,
      w: 700,
      it: true,
      rot: Math.atan2(-120, 400),
      align: 'center'
    });
  }
  {
    const [X, Y] = R(-330, 735);
    mapLabel(rx, 'Carretera del aeropuerto', X, Y + 12, {
      size: 14,
      w: 700,
      it: true,
      rot: Math.atan2(-120, 250),
      align: 'center'
    });
  }
  {
    const [X, Y] = R(745, 318);
    mapLabel(rx, 'Playa del Lido', X, Y, { size: 13, it: true, col: '#2a5068', haloC: 'rgba(200,220,226,.9)' });
  }
  {
    const [X, Y] = R(-60, 1350);
    mapLabel(rx, 'OCÉANO ÍNDICO', X, Y, {
      size: 28,
      w: 700,
      it: true,
      sp: true,
      col: '#2a5068',
      haloC: 'rgba(170,204,218,.9)',
      rot: Math.atan2(COAST_DZ, COAST_DX),
      align: 'center'
    });
  }
  const cell = 300 / sc;
  mapGrid(rx, RW, RH, Math.ceil(RW / cell), cell, 0, 0);
  mapNorth(rx, RW - 50, 90, NORTH_ANG);
  mapScale(rx, 30, RH - 30, 1 / (1.5 * sc), 1000);
  MAPC = { city, reg, sc, RW, RH, CSC };
}
