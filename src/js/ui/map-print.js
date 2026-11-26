/* ====================================================================================================
 * ui/map-print.js
 *
 * Las hojas impresas del mapa táctico (ciudad y región), dibujadas una vez en un canvas.
 * ================================================================================================== */

function buildTacSheet() {
  const S = 3,
    MW = W * S,
    MRG = 150,
    FOOT = 430,
    CWd = MW + MRG * 2,
    CHt = MRG + MW + 100 + (FOOT - 130) + 70;
  const cv = document.createElement('canvas');
  cv.width = CWd;
  cv.height = CHt;
  const x = cv.getContext('2d');
  const F = '"Barlow Condensed", "Arial Narrow", sans-serif',
    FM = '"IBM Plex Mono", monospace';
  const INK = '#2e2618',
    RED = '#9c2e1c',
    BLUE = '#24548f',
    PAPER = '#e9dfc3';
  x.fillStyle = PAPER;
  x.fillRect(0, 0, CWd, CHt);
  // ---- base: edificios, calles, suelo y mar, sacados de la propia ciudad del juego
  const img = x.createImageData(MW, MW),
    d = img.data;
  const isB = (i, j) => inB(i, j) && grid[idx(i, j)] === 1;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = idx(i, j),
        g = grid[k],
        D_ = cityDs(i + 0.5, j + 0.5);
      let c;
      if (g === 3) c = null;
      else if (g === 1) {
        const edge = !(isB(i - 1, j) && isB(i + 1, j) && isB(i, j - 1) && isB(i, j + 1));
        c = edge ? [92, 74, 54] : [150, 126, 96];
      } else if (STR[k] === 2) c = [250, 244, 226];
      else if (STR[k] === 1) c = [228, 212, 172];
      else if (ground[k] === 7) c = [168, 186, 118];
      else if (ground[k] === 4) c = [226, 190, 132];
      else if (ground[k] === 11) c = [242, 232, 200];
      else if (g === 2) c = [176, 158, 124];
      else if (ground[k] === 2) c = [220, 206, 168];
      else {
        const f = sstep(0.05, 0.5, D_);
        c = [212 + 18 * f, 198 + 18 * f, 156 + 30 * f];
      }
      for (let b = 0; b < S; b++)
        for (let a = 0; a < S; a++) {
          const px = i * S + a,
            py = j * S + b,
            p = (py * MW + px) * 4;
          let cc = c;
          if (!cc) {
            const s = coastS(i + 0.5, j + 0.5);
            cc = s > 30 ? [150, 186, 200] : [166, 198, 210];
            if ((px + py) % 9 === 0) cc = [126, 164, 184];
          } else if (g === 1 && (a === 0 || b === 0) && !isB(i - (a === 0 ? 1 : 0), j - (b === 0 ? 1 : 0)))
            cc = [70, 56, 40];
          else if (!g && !STR[k] && !ground[k] && D_ < 0.3 && hash2(px * 3 + 1, py * 5 + 7) < 0.02) cc = [146, 138, 92];
          d[p] = cc[0];
          d[p + 1] = cc[1];
          d[p + 2] = cc[2];
          d[p + 3] = 255;
        }
    }
  x.putImageData(img, MRG, MRG);
  x.save();
  x.translate(MRG, MRG);
  x.beginPath();
  x.rect(0, 0, MW, MW);
  x.clip();
  // línea de costa
  x.strokeStyle = 'rgba(30,70,96,.95)';
  x.lineWidth = 2.5;
  x.beginPath();
  for (let t = -200; t <= 900; t += 3) {
    let X = t,
      Z = 1500 - ((t + 1200) * COAST_NX) / COAST_NZ;
    for (let it = 0; it < 4; it++) {
      const s = coastS(X, Z) + 3;
      X -= s * COAST_NX;
      Z -= s * COAST_NZ;
    }
    t === -200 ? x.moveTo(X * S, Z * S) : x.lineTo(X * S, Z * S);
  }
  x.stroke();
  // cuadrícula: cuadrados de 100 m (66,7 celdas), con marcas más finas cada 50 m
  const G100 = (100 / 1.5) * S;
  x.strokeStyle = 'rgba(40,32,20,.55)';
  x.lineWidth = 1.6;
  for (let k = 0; k * G100 <= MW + 1; k++) {
    x.beginPath();
    x.moveTo(k * G100, 0);
    x.lineTo(k * G100, MW);
    x.stroke();
    x.beginPath();
    x.moveTo(0, k * G100);
    x.lineTo(MW, k * G100);
    x.stroke();
  }
  x.strokeStyle = 'rgba(40,32,20,.18)';
  x.lineWidth = 1;
  for (let k = 0; k * G100 <= MW; k++) {
    const h = (k + 0.5) * G100;
    x.beginPath();
    x.moveTo(h, 0);
    x.lineTo(h, MW);
    x.stroke();
    x.beginPath();
    x.moveTo(0, h);
    x.lineTo(MW, h);
    x.stroke();
  }
  const lab = (t, px, py, o) => {
    t = L(t);
    o = o || {};
    x.save();
    x.translate(px, py);
    if (o.rot) x.rotate(o.rot);
    x.font = (o.it ? 'italic ' : '') + (o.w || 'bold') + ' ' + (o.size || 22) + 'px ' + (o.mono ? FM : F);
    x.textAlign = o.align || 'center';
    x.textBaseline = 'middle';
    let tx = t;
    if (o.sp) tx = t.split('').join(String.fromCharCode(8201));
    if (o.halo !== false) {
      x.lineWidth = o.hw || 6;
      x.strokeStyle = o.haloC || 'rgba(240,232,208,.92)';
      x.lineJoin = 'round';
      x.strokeText(tx, 0, 0);
    }
    x.fillStyle = o.col || INK;
    x.fillText(tx, 0, 0);
    x.restore();
  };
  const P = (X, Z) => [X * S, Z * S];
  // barrios
  for (const [n, X, Z] of DISTRICTS)
    if (X > 10 && Z > 10 && X < W - 10 && Z < H - 10)
      lab(n, ...P(X, Z), { size: 40, it: true, col: 'rgba(110,60,28,.8)', sp: true, hw: 8 });
  // calles
  const st = (t, X, Z, rot) => lab(t, ...P(X, Z), { size: 24, rot, hw: 6 });
  st('CALLE HAWLWADIG', 256, 128, -Math.PI / 2);
  st('CALLE HAWLWADIG', 256, 300, -Math.PI / 2);
  st('LA MILLA · AV. DEL ESTADIO', MILE_X - 6, 268, -Math.PI / 2);
  st('CALLE NACIONAL', 300, 321);
  st('CALLE WARSHADAHA', 172, 168.5);
  st('AV. 21 DE OCTUBRE', 150, 255.5);
  st('MAKKA AL-MUKARAMA', 352, 352, Math.atan2(300 - 410, 380 - 330));
  st('CTRA. DEL AEROPUERTO', 180, 492, Math.atan2(512 - 410, 150 - 330) + Math.PI);
  lab('← CTRA. DE AFGOOYE', ...P(40, 250), { size: 22, align: 'left' });
  lab('OCÉANO ÍNDICO', ...P(650, 640), {
    size: 46,
    it: true,
    col: '#1e4a66',
    sp: true,
    haloC: 'rgba(170,204,218,.9)',
    rot: Math.atan2(COAST_DZ, COAST_DX)
  });
  lab('Playa del Lido', ...P(700, 392), { size: 24, it: true, col: '#1e4a66', haloC: 'rgba(200,220,226,.9)' });
  // sitios clave: solo lugares, nada de sucesos
  const LMK = [
    ['hotel', 'Hotel Olympic'],
    ['bakara', 'Mercado de Bakara'],
    ['k4', 'Rotonda K-4'],
    ['arch', 'El Arco'],
    ['stadium', 'Estadio · base paquistaní (ONU)'],
    ['oldtown', 'Hamar Weyne'],
    ['villa', 'Villa Somalia']
  ];
  for (const [k, n] of LMK) {
    const m = LM[k];
    if (!m || m.x < 0 || m.z < 0 || m.x > W || m.z > H) continue;
    const [px, py] = P(m.x, m.z);
    x.save();
    x.lineWidth = 3;
    if (k === 'stadium') {
      x.fillStyle = 'rgba(80,140,210,.28)';
      x.strokeStyle = BLUE;
      x.fillRect(px - 26, py - 17, 52, 34);
      x.strokeRect(px - 26, py - 17, 52, 34);
      x.fillStyle = BLUE;
      x.font = 'bold 18px ' + F;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(L('ONU'), px, py);
    } else {
      x.fillStyle = '#f0dca0';
      x.strokeStyle = INK;
      x.beginPath();
      x.arc(px, py, 10, 0, 6.3);
      x.fill();
      x.stroke();
      x.fillStyle = INK;
      x.beginPath();
      x.arc(px, py, 3, 0, 6.3);
      x.fill();
    }
    x.restore();
    lab(n, px + (k === 'stadium' ? 34 : 18), py, { size: 24, align: 'left', col: k === 'stadium' ? BLUE : INK });
  }

  x.restore();
  // ---- el marco: línea limpia y coordenadas en el margen
  x.strokeStyle = INK;
  x.lineWidth = 4;
  x.strokeRect(MRG, MRG, MW, MW);
  x.lineWidth = 1.5;
  x.strokeRect(MRG - 14, MRG - 14, MW + 28, MW + 28);
  x.fillStyle = INK;
  x.font = 'bold 26px ' + FM;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let k = 0; k * G100 <= MW + 1; k++) {
    const v = String(40 + k).padStart(2, '0'),
      h = k * G100 + MRG;
    x.fillText(v, h, MRG - 40);
    x.fillText(v, h, MRG + MW + 40);
    const n = String(60 - k).padStart(2, '0');
    x.fillText(n, MRG - 52, h);
    x.fillText(n, MRG + MW + 52, h);
  }
  x.font = 'bold 20px ' + F;
  x.textAlign = 'left';
  x.fillText(L('CUADRÍCULA 100 m'), MRG, MRG - 90);
  x.textAlign = 'right';
  x.fillText(L('CUADRÍCULA DE REFERENCIA DEL JUEGO'), MRG + MW, MRG - 90);
  // flecha del norte y declinación
  {
    const px = MRG + MW - 90,
      py = MRG + 140;
    x.save();
    x.translate(px, py);
    x.fillStyle = 'rgba(240,232,208,.92)';
    x.beginPath();
    x.arc(0, 0, 76, 0, 6.3);
    x.fill();
    x.strokeStyle = INK;
    x.lineWidth = 2;
    x.stroke();
    x.rotate(NORTH_ANG);
    x.fillStyle = INK;
    x.beginPath();
    x.moveTo(0, -60);
    x.lineTo(16, 18);
    x.lineTo(0, 6);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(0, -60);
    x.lineTo(-16, 18);
    x.lineTo(0, 6);
    x.closePath();
    x.stroke();
    x.font = 'bold 30px ' + F;
    x.textAlign = 'center';
    x.fillText(L('N'), 0, -72 + 8);
    x.restore();
  }
  // ---- el cajetín y la leyenda
  const y0 = MRG + MW + 100;
  x.strokeStyle = INK;
  x.lineWidth = 3;
  x.strokeRect(MRG - 14, y0, MW + 28, FOOT - 130);
  x.fillStyle = INK;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.font = 'bold 22px ' + F;
  x.fillText(L('PLANO TÁCTICO · USO EN EL JUEGO'), MRG + 16, y0 + 44);
  x.font = 'bold 76px ' + F;
  x.fillText(L('MOGADISCIO'), MRG + 16, y0 + 128);
  x.font = 'bold 30px ' + F;
  x.fillText(L('Distritos centrales · Hawl Wadaag, Wardhigley, Hodan, Hamar Weyne'), MRG + 16, y0 + 172);
  x.font = '24px ' + F;
  x.fillStyle = '#5a4a32';
  x.fillText(
    L('Black Hawk Down · creado y desarrollado por Jesús Navas Aller · plano original, no a escala real'),
    MRG + 16,
    y0 + 214
  );
  x.fillText(L('Plano de situación: unidades, objetivo y contactos se actualizan en tiempo real.'), MRG + 16, y0 + 248);
  // escala gráfica: 100 m = G100 px
  {
    const sx = MRG + 16,
      sy = y0 + 278;
    x.fillStyle = INK;
    x.strokeStyle = INK;
    x.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      (k % 2 ? x.strokeRect : x.fillRect).call(x, sx + (k * G100) / 1, sy - 4, G100, 12);
    }
    x.font = 'bold 20px ' + F;
    x.textAlign = 'center';
    for (let k = 0; k <= 5; k++) x.fillText(String(k * 100), sx + k * G100, sy - 14);
    x.textAlign = 'left';
    x.fillText(L('metros'), sx + 5 * G100 + 20, sy + 8);
  }
  // leyenda
  const lx = MRG + MW - 760,
    ly = y0 + 28;
  x.font = 'bold 24px ' + F;
  x.fillStyle = INK;
  x.fillText(L('LEYENDA'), lx, ly + 10);
  const rows = [
    [
      (a, b) => {
        x.fillStyle = '#faf4e2';
        x.fillRect(a, b - 10, 56, 20);
        x.strokeStyle = INK;
        x.lineWidth = 1.5;
        x.strokeRect(a, b - 10, 56, 20);
      },
      'Calle asfaltada (en mal estado)'
    ],
    [
      (a, b) => {
        x.fillStyle = '#e4d4ac';
        x.fillRect(a, b - 10, 56, 20);
      },
      'Calle o pista de tierra'
    ],
    [
      (a, b) => {
        x.fillStyle = '#967e60';
        x.fillRect(a + 8, b - 12, 40, 24);
        x.strokeStyle = '#463826';
        x.lineWidth = 3;
        x.strokeRect(a + 8, b - 12, 40, 24);
      },
      'Edificios y muros'
    ],
    [
      (a, b) => {
        x.fillStyle = '#e2be84';
        x.fillRect(a, b - 10, 56, 20);
      },
      'Mercado'
    ],
    [
      (a, b) => {
        x.fillStyle = '#a6c6d2';
        x.fillRect(a, b - 10, 56, 20);
        x.strokeStyle = '#1e4660';
        x.lineWidth = 2.5;
        x.beginPath();
        x.moveTo(a, b - 10);
        x.lineTo(a + 56, b - 10);
        x.stroke();
      },
      'Mar y línea de costa'
    ],
    [
      (a, b) => {
        x.fillStyle = '#f0dca0';
        x.strokeStyle = INK;
        x.lineWidth = 3;
        x.beginPath();
        x.arc(a + 28, b, 10, 0, 6.3);
        x.fill();
        x.stroke();
      },
      'Punto de referencia'
    ],
    [
      (a, b) => {
        x.strokeStyle = RED;
        x.lineWidth = 4;
        x.strokeRect(a + 10, b - 12, 36, 24);
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(a + 28, b - 16);
        x.lineTo(a + 28, b + 16);
        x.moveTo(a + 4, b);
        x.lineTo(a + 52, b);
        x.stroke();
      },
      'Objetivo'
    ],
    [
      (a, b) => {
        x.strokeStyle = RED;
        x.lineWidth = 3.5;
        x.beginPath();
        x.arc(a + 28, b, 13, 0, 6.3);
        x.stroke();
        x.beginPath();
        x.moveTo(a + 20, b - 8);
        x.lineTo(a + 36, b + 8);
        x.moveTo(a + 36, b - 8);
        x.lineTo(a + 20, b + 8);
        x.stroke();
      },
      'Black Hawk derribado'
    ],
    [
      (a, b) => {
        x.strokeStyle = RED;
        x.lineWidth = 4;
        x.setLineDash([12, 6]);
        x.strokeRect(a + 2, b - 12, 52, 24);
        x.setLineDash([]);
      },
      'Zona de operaciones'
    ],
    [
      (a, b) => {
        x.fillStyle = 'rgba(80,140,210,.28)';
        x.strokeStyle = BLUE;
        x.lineWidth = 3;
        x.fillRect(a + 6, b - 12, 44, 24);
        x.strokeRect(a + 6, b - 12, 44, 24);
      },
      'Fuerzas de la ONU'
    ]
  ];
  rows.forEach((r, k) => {
    const col = k < 5 ? 0 : 1,
      row = k % 5,
      a = lx + col * 390,
      b = ly + 48 + row * 40;
    r[0](a, b);
    x.fillStyle = INK;
    x.font = '22px ' + F;
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText(r[1], a + 70, b);
    x.textBaseline = 'alphabetic';
  });
  return { cv, S, MRG };
}

function buildRegSheet() {
  const PXU = 1.05,
    MWd = Math.round((WB.x1 - WB.x0) * PXU),
    MHt = Math.round((WB.z1 - WB.z0) * PXU),
    MRG = 150,
    FOOT = 330;
  const CWd = MWd + MRG * 2,
    CHt = MHt + MRG + 100 + FOOT + 60;
  const cv = document.createElement('canvas');
  cv.width = CWd;
  cv.height = CHt;
  const x = cv.getContext('2d');
  const F = '"Barlow Condensed", "Arial Narrow", sans-serif',
    FM = '"IBM Plex Mono", monospace';
  const INK = '#2e2618',
    RED = '#9c2e1c',
    BLUE = '#24548f',
    PAPER = '#e9dfc3';
  x.fillStyle = PAPER;
  x.fillRect(0, 0, CWd, CHt);
  const img = x.createImageData(MWd, MHt),
    d = img.data,
    out = [0, 0, 0, 0];
  for (let py = 0; py < MHt; py++)
    for (let px = 0; px < MWd; px++) {
      const X = WB.x0 + (px + 0.5) / PXU,
        Z = WB.z0 + (py + 0.5) / PXU,
        s = coastS(X, Z),
        p = (py * MWd + px) * 4;
      let c;
      if (s > -3) {
        c = s > 60 ? [140, 178, 196] : s > 15 ? [154, 190, 204] : [168, 200, 212];
        if ((px + py) % 9 === 0) c = [126, 164, 184];
      } else if (s > -24) c = [242, 232, 200];
      else {
        const n = fbm(X * 0.01, Z * 0.01),
          D_ = cityDs(X, Z);
        c = [220 - n * 16, 204 - n * 15, 162 - n * 12];
        if (X >= 0 && Z >= 0 && X < W && Z < H) {
          const i = Math.floor(X),
            j = Math.floor(Z),
            k = idx(i, j);
          if (grid[k] === 1) c = [118, 96, 72];
          else if (STR[k] === 2) c = [248, 242, 224];
          else if (STR[k] === 1) c = [230, 214, 176];
          else if (ground[k] === 7) c = [168, 186, 118];
          else if (ground[k] === 4) c = [226, 190, 132];
          else if (D_ > 0.05) {
            const f = sstep(0.05, 0.5, D_) * 0.25;
            c = [c[0] * (1 - f) + 236 * f, c[1] * (1 - f) + 222 * f, c[2] * (1 - f) + 186 * f];
          }
        } else {
          if (D_ > 0.03 && hash2(Math.floor(X / 3) * 13 + 5, Math.floor(Z / 3) * 7 + 3) < D_ * 0.5) c = [124, 102, 78];
          else if (hash2(Math.floor(X / 4) * 7 + 3, Math.floor(Z / 4) * 11 + 1) < 0.012 && s < -40) c = [128, 140, 86];
        }
        const [u, v] = airUV(X, Z);
        if (u > -300 && u < 340 && v > -292 && v < 16 && airGround(u, v, out)) c = [out[0], out[1], out[2]];
      }
      d[p] = c[0];
      d[p + 1] = c[1];
      d[p + 2] = c[2];
      d[p + 3] = 255;
    }
  x.putImageData(img, MRG, MRG);
  x.save();
  x.translate(MRG, MRG);
  x.beginPath();
  x.rect(0, 0, MWd, MHt);
  x.clip();
  const R = (X, Z) => [(X - WB.x0) * PXU, (Z - WB.z0) * PXU];
  const poly = (pts, w, col, dash) => {
    x.save();
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.strokeStyle = col;
    x.lineWidth = w;
    if (dash) x.setLineDash(dash);
    x.beginPath();
    pts.forEach((q, k) => {
      const [a, b] = R(q[0], q[1]);
      k ? x.lineTo(a, b) : x.moveTo(a, b);
    });
    x.stroke();
    x.restore();
  };
  const lab = (t, px, py, o) => {
    t = L(t);
    o = o || {};
    x.save();
    x.translate(px, py);
    if (o.rot) x.rotate(o.rot);
    x.font = (o.it ? 'italic ' : '') + (o.w || 'bold') + ' ' + (o.size || 22) + 'px ' + F;
    x.textAlign = o.align || 'center';
    x.textBaseline = 'middle';
    let tx = t;
    if (o.sp) tx = t.split('').join(String.fromCharCode(8201));
    if (o.halo !== false) {
      x.lineWidth = o.hw || 6;
      x.strokeStyle = o.haloC || 'rgba(240,232,208,.92)';
      x.lineJoin = 'round';
      x.strokeText(tx, 0, 0);
    }
    x.fillStyle = o.col || INK;
    x.fillText(tx, 0, 0);
    x.restore();
  };
  // línea de costa
  x.strokeStyle = 'rgba(30,70,96,.95)';
  x.lineWidth = 2.5;
  x.beginPath();
  for (let t = -1700; t <= 1100; t += 4) {
    let X = t,
      Z = 1500 - ((t + 1200) * COAST_NX) / COAST_NZ;
    for (let it = 0; it < 5; it++) {
      const s = coastS(X, Z) + 3;
      X -= s * COAST_NX;
      Z -= s * COAST_NZ;
    }
    const [a, b] = R(X, Z);
    t === -1700 ? x.moveTo(a, b) : x.lineTo(a, b);
  }
  x.stroke();
  // pistas y carreteras
  for (const t of TRACKS)
    poly(
      [
        [t[0], t[1]],
        [t[2], t[3]]
      ],
      2,
      'rgba(110,80,44,.5)',
      [4, 6]
    );
  for (const r of ROADS) {
    if (r.paved) {
      poly(r.pts, 9, INK);
      poly(r.pts, 5.5, '#f6eed4');
    } else {
      poly(r.pts, 5, 'rgba(90,64,36,.85)');
      poly(r.pts, 2.6, '#e6d4a8');
    }
  }
  // el perímetro de la base
  {
    const B_ = BASE,
      pts = [
        [B_.u0, B_.v0],
        [B_.u1, B_.v0],
        [B_.u1, B_.v1],
        [B_.u0, B_.v1],
        [B_.u0, B_.v0]
      ].map(q => AIRP(q[0], q[1]));
    poly(pts, 3, BLUE, [12, 6]);
  }
  {
    const T_ = TZ,
      pts = [
        [T_.u0, T_.v0],
        [T_.u1, T_.v0],
        [T_.u1, T_.v1],
        [T_.u0, T_.v1],
        [T_.u0, T_.v0]
      ].map(q => AIRP(q[0], q[1]));
    poly(pts, 2.5, BLUE, [6, 4]);
  }
  // aldeas
  for (const v of VILLAGES) {
    for (let k = 0; k < v.n; k++) {
      const a = hash2(k * 7 + 1, v.x | 0) * 6.28,
        dd = Math.sqrt(hash2(k * 3, v.z | 0)) * v.r,
        X = v.x + Math.cos(a) * dd,
        Z = v.z + Math.sin(a) * dd;
      if (coastS(X, Z) > -26) continue;
      const [a_, b_] = R(X, Z);
      x.fillStyle = '#5a4630';
      x.fillRect(a_ - 3, b_ - 3, 6, 5);
    }
    const [X, Y] = R(v.x, v.z);
    lab(v.nm, X + v.r * PXU + 10, Y, { size: 24, it: true, align: 'left' });
  }
  // cuadrícula: cuadrados de 500 m
  const G5 = (500 / 1.5) * PXU;
  x.strokeStyle = 'rgba(40,32,20,.5)';
  x.lineWidth = 1.6;
  for (let k = 0; k * G5 <= MWd + 1; k++) {
    x.beginPath();
    x.moveTo(k * G5, 0);
    x.lineTo(k * G5, MHt);
    x.stroke();
  }
  for (let k = 0; k * G5 <= MHt + 1; k++) {
    x.beginPath();
    x.moveTo(0, k * G5);
    x.lineTo(MWd, k * G5);
    x.stroke();
  }
  // nombres y lugares, nada de sucesos
  const sym = (X, Z, kind) => {
    const [a, b] = R(X, Z);
    x.save();
    x.lineWidth = 3;
    if (kind === 'un' || kind === 'base') {
      x.fillStyle = 'rgba(80,140,210,.3)';
      x.strokeStyle = BLUE;
      x.fillRect(a - 24, b - 15, 48, 30);
      x.strokeRect(a - 24, b - 15, 48, 30);
      if (kind === 'un') {
        x.fillStyle = BLUE;
        x.font = 'bold 17px ' + F;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(L('ONU'), a, b);
      } else {
        x.beginPath();
        x.moveTo(a - 24, b - 15);
        x.lineTo(a + 24, b + 15);
        x.moveTo(a + 24, b - 15);
        x.lineTo(a - 24, b + 15);
        x.stroke();
      }
    } else {
      x.fillStyle = '#f0dca0';
      x.strokeStyle = INK;
      x.beginPath();
      x.arc(a, b, 9, 0, 6.3);
      x.fill();
      x.stroke();
      x.fillStyle = INK;
      x.beginPath();
      x.arc(a, b, 3, 0, 6.3);
      x.fill();
    }
    x.restore();
    return [a, b];
  };
  {
    const [a, b] = R(300, 230);
    lab('MOGADISCIO', a, b - 70, { size: 64, sp: true, col: '#5a3a1c', hw: 9 });
    lab('Muqdisho', a, b - 22, { size: 28, it: true, col: '#5a3a1c', hw: 6 });
  }
  {
    const q = AIRP(60, -250),
      [a, b] = sym(q[0], q[1], 'base');
    lab('Aeropuerto Internacional de Mogadiscio', a + 40, b - 14, { size: 26, align: 'left' });
    lab('Base de la Task Force Ranger', a + 40, b + 18, { size: 22, it: true, col: BLUE, align: 'left' });
  }
  {
    const p = AIRP(-80, 40),
      [a, b] = R(p[0], p[1]);
    lab('Campo de instrucción', a - 14, b, { size: 19, it: true, col: BLUE, align: 'right' });
  }
  {
    const [a, b] = sym(LM.stadium.x, LM.stadium.z, 'un');
    lab('Estadio · base paquistaní', a + 34, b, { size: 22, align: 'left', col: BLUE });
  }
  for (const [k, n] of [
    ['k4', 'Rotonda K-4'],
    ['villa', 'Villa Somalia'],
    ['bakara', 'Mercado de Bakara']
  ]) {
    const [a, b] = sym(LM[k].x, LM[k].z, 'pt');
    lab(n, a + 16, b, { size: 21, align: 'left' });
  }
  {
    const [a, b] = R(-560, 345);
    lab('Carretera de Afgooye', a, b - 16, { size: 22, it: true, rot: Math.atan2(-120, 400) });
  }
  {
    const [a, b] = R(-360, 750);
    lab('Carretera del aeropuerto', a, b + 22, { size: 22, it: true, rot: Math.atan2(-120, 250) });
  }
  {
    const [a, b] = R(760, 330);
    lab('Playa del Lido', a, b, { size: 22, it: true, col: '#1e4a66', haloC: 'rgba(200,220,226,.9)' });
  }
  {
    const [a, b] = R(-100, 1420);
    lab('OCÉANO ÍNDICO', a, b, {
      size: 60,
      it: true,
      sp: true,
      col: '#1e4a66',
      haloC: 'rgba(170,204,218,.9)',
      rot: Math.atan2(COAST_DZ, COAST_DX)
    });
  }
  x.restore();
  // marco y coordenadas
  x.strokeStyle = INK;
  x.lineWidth = 4;
  x.strokeRect(MRG, MRG, MWd, MHt);
  x.lineWidth = 1.5;
  x.strokeRect(MRG - 14, MRG - 14, MWd + 28, MHt + 28);
  x.fillStyle = INK;
  x.font = 'bold 26px ' + FM;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let k = 0; k * G5 <= MWd + 1; k++) {
    const v = String(30 + k * 5).padStart(2, '0'),
      h = k * G5 + MRG;
    x.fillText(v, h, MRG - 40);
    x.fillText(v, h, MRG + MHt + 40);
  }
  for (let k = 0; k * G5 <= MHt + 1; k++) {
    const v = String(95 - k * 5).padStart(2, '0'),
      h = k * G5 + MRG;
    x.fillText(v, MRG - 56, h);
    x.fillText(v, MRG + MWd + 56, h);
  }
  x.font = 'bold 20px ' + F;
  x.textAlign = 'left';
  x.fillText(L('CUADRÍCULA 500 m'), MRG, MRG - 90);
  x.textAlign = 'right';
  x.fillText(L('CUADRÍCULA DE REFERENCIA DEL JUEGO'), MRG + MWd, MRG - 90);
  {
    const px = MRG + MWd - 100,
      py = MRG + 130;
    x.save();
    x.translate(px, py);
    x.fillStyle = 'rgba(240,232,208,.92)';
    x.beginPath();
    x.arc(0, 0, 76, 0, 6.3);
    x.fill();
    x.strokeStyle = INK;
    x.lineWidth = 2;
    x.stroke();
    x.rotate(NORTH_ANG);
    x.fillStyle = INK;
    x.beginPath();
    x.moveTo(0, -60);
    x.lineTo(16, 18);
    x.lineTo(0, 6);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(0, -60);
    x.lineTo(-16, 18);
    x.lineTo(0, 6);
    x.closePath();
    x.stroke();
    x.font = 'bold 30px ' + F;
    x.textAlign = 'center';
    x.fillText(L('N'), 0, -64);
    x.restore();
  }
  // cajetín
  const y0 = MRG + MHt + 100;
  x.strokeStyle = INK;
  x.lineWidth = 3;
  x.strokeRect(MRG - 14, y0, MWd + 28, FOOT);
  x.fillStyle = INK;
  x.textAlign = 'left';
  x.textBaseline = 'alphabetic';
  x.font = 'bold 22px ' + F;
  x.fillText(L('PLANO REGIONAL · USO EN EL JUEGO'), MRG + 16, y0 + 44);
  x.font = 'bold 76px ' + F;
  x.fillText(L('MOGADISCIO Y ALREDEDORES'), MRG + 16, y0 + 128);
  x.font = 'bold 30px ' + F;
  x.fillText(
    L('La ciudad, el aeropuerto con la base de la TFR, la costa y los pueblos del interior'),
    MRG + 16,
    y0 + 172
  );
  x.font = '24px ' + F;
  x.fillStyle = '#5a4a32';
  x.fillText(
    L('Black Hawk Down · creado y desarrollado por Jesús Navas Aller · plano original, no a escala real'),
    MRG + 16,
    y0 + 214
  );
  x.fillText(L('Plano de situación: unidades, objetivo y contactos se actualizan en tiempo real.'), MRG + 16, y0 + 248);
  {
    const sx = MRG + 16,
      sy = y0 + 290,
      k1 = ((1000 / 1.5) * PXU) / 2;
    x.fillStyle = INK;
    x.strokeStyle = INK;
    x.lineWidth = 2;
    for (let k = 0; k < 4; k++) (k % 2 ? x.strokeRect : x.fillRect).call(x, sx + k * k1, sy - 4, k1, 12);
    x.font = 'bold 20px ' + F;
    x.textAlign = 'center';
    for (let k = 0; k <= 4; k++) x.fillText(String(k * 500), sx + k * k1, sy - 14);
    x.textAlign = 'left';
    x.fillText(L('metros'), sx + 4 * k1 + 20, sy + 8);
  }
  const lx = MRG + MWd - 800,
    ly = y0 + 30;
  x.font = 'bold 24px ' + F;
  x.fillStyle = INK;
  x.fillText(L('LEYENDA'), lx, ly + 10);
  const rows = [
    [
      (a, b) => {
        x.strokeStyle = INK;
        x.lineWidth = 9;
        x.beginPath();
        x.moveTo(a, b);
        x.lineTo(a + 56, b);
        x.stroke();
        x.strokeStyle = '#f6eed4';
        x.lineWidth = 5.5;
        x.stroke();
      },
      'Carretera asfaltada'
    ],
    [
      (a, b) => {
        x.strokeStyle = 'rgba(90,64,36,.85)';
        x.lineWidth = 5;
        x.beginPath();
        x.moveTo(a, b);
        x.lineTo(a + 56, b);
        x.stroke();
        x.strokeStyle = '#e6d4a8';
        x.lineWidth = 2.6;
        x.stroke();
      },
      'Carretera de tierra'
    ],
    [
      (a, b) => {
        x.strokeStyle = 'rgba(110,80,44,.6)';
        x.lineWidth = 2;
        x.setLineDash([4, 6]);
        x.beginPath();
        x.moveTo(a, b);
        x.lineTo(a + 56, b);
        x.stroke();
        x.setLineDash([]);
      },
      'Pista o sendero'
    ],
    [
      (a, b) => {
        x.fillStyle = '#76604a';
        x.fillRect(a + 12, b - 10, 32, 20);
      },
      'Edificios y caseríos'
    ],
    [
      (a, b) => {
        x.fillStyle = '#5a4630';
        for (const [p, q] of [
          [10, -6],
          [24, 4],
          [38, -4],
          [30, -10]
        ])
          x.fillRect(a + p, b + q, 6, 5);
      },
      'Pueblo'
    ],
    [
      (a, b) => {
        x.fillStyle = '#5e5c56';
        x.fillRect(a, b - 7, 56, 14);
        x.fillStyle = '#fff';
        x.fillRect(a + 6, b - 1, 10, 2);
        x.fillRect(a + 24, b - 1, 10, 2);
        x.fillRect(a + 42, b - 1, 10, 2);
      },
      'Pista de aterrizaje'
    ],
    [
      (a, b) => {
        x.strokeStyle = BLUE;
        x.lineWidth = 3;
        x.setLineDash([12, 6]);
        x.strokeRect(a + 2, b - 11, 52, 22);
        x.setLineDash([]);
      },
      'Perímetro de la base'
    ],
    [
      (a, b) => {
        x.fillStyle = 'rgba(80,140,210,.3)';
        x.strokeStyle = BLUE;
        x.lineWidth = 3;
        x.fillRect(a + 6, b - 12, 44, 24);
        x.strokeRect(a + 6, b - 12, 44, 24);
      },
      'Fuerzas de EE. UU. y ONU'
    ]
  ];
  rows.forEach((r, k) => {
    const col = k < 4 ? 0 : 1,
      row = k % 4,
      a = lx + col * 400,
      b = ly + 52 + row * 44;
    r[0](a, b);
    x.fillStyle = INK;
    x.font = '22px ' + F;
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.fillText(r[1], a + 70, b);
    x.textBaseline = 'alphabetic';
  });
  return { cv, PXU, MRG };
}
