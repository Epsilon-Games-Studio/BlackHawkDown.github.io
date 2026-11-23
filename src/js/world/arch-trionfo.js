/* ====================================================================================================
 * world/arch-trionfo.js
 *
 * El Arco ("Arco Trionfo Popolare"): una viga larga de hormigón enlucido sobre pilares cuadrados que va de
 * fachada a fachada en la boca del callejón al norte del Super 6-1, como el de la película. Cinco vanos
 * (dos estrechos a los lados, dos anchos para los coches y uno estrecho en el centro), un pretil escalonado
 * con hombros curvos, un frontón en el centro con una estrella, y las letras "ARCO" y "TRIONFO POPOLARE"
 * en la viga, por las dos caras. Todo una sola forma extruida con una textura de enlucido sucio pintada a mano.
 * ================================================================================================== */

'use strict';

// de la pared este de una casa a la pared oeste de la de enfrente; z0..z1 es el grueso del arco
const ARCH = { x0: 367.95, x1: 379.05, z0: 288.225, z1: 288.975, cx: 373.5, top: 3.65 };
const ARCH_OPEN = 2.85; // alto de los vanos (4,3 m)
const ARCH_BEAM = 3.65; // arriba de la viga

// el arco viejo gastaba números del aleatorio de la ciudad: los gasto igual para que el resto no se mueva
function archOldRnd() {
  const hole = (cx, a, s, t, x) => {
    const u = Math.abs(x - cx) / a;
    return u >= 1 ? 0 : s + (t - s) * Math.pow(1 - u, 0.55);
  };
  for (let f = 0; f < 2; f++)
    for (let k = 0; k < 5; k++) {
      const x = 367.5 + rnd() * 6,
        y = 0.7 + rnd() * 2.8;
      if (hole(370.5, 1.75, 1.75, 3.25, x) > y - 0.4) continue;
      rnd();
      rnd();
      rnd();
    }
  for (let k = 0; k < 42; k++) rnd();
}

// los pilares a lo largo del arco, desde x0: [inicio, ancho]
function archPiers() {
  const W = [0.4, 1.25, 0.3, 2.75, 0.4, 0.9, 0.4, 2.75, 0.3, 1.25, 0.4]; // pilar, vano, pilar... (suma 11,1)
  const P = [];
  let x = 0;
  W.forEach((w, k) => {
    if (k % 2 === 0) P.push([x, w]);
    x += w;
  });
  return P;
}

// alto del pretil sobre la viga en cada punto (mitad izquierda; la otra es su espejo). Tramos rectos y hombros curvos
function archProfile(L) {
  const c = L / 2;
  // [x de inicio del tramo, alto], con una curva de cuarto de círculo en cada cambio de altura
  const half = [
    [0, 0.5],
    [1.1, 0.22],
    [2.85, 0.48],
    [3.95, 0.22],
    [4.65, 0.52],
    [5.12, 0.8]
  ];
  const pts = [];
  const R = 0.24;
  for (let k = 0; k < half.length; k++) {
    const [xa, ha] = half[k];
    const xb = k + 1 < half.length ? half[k + 1][0] : c;
    const hb = k + 1 < half.length ? half[k + 1][1] : ha;
    if (k === 0) pts.push([xa, ha]);
    if (hb === ha) {
      pts.push([xb, ha]);
      continue;
    }
    // el hombro: si sube, una curva convexa que arranca en el tramo bajo; si baja, una curva convexa que cae del alto
    const up = hb > ha,
      d = Math.abs(hb - ha),
      r = Math.min(R, d);
    const N = 8;
    if (up) {
      // sube casi en vertical y se redondea hacia dentro arriba
      const xs = xb - r / 2;
      pts.push([xs, ha]);
      for (let q = 1; q <= N; q++) {
        const t = (q / N) * (Math.PI / 2);
        pts.push([xs + r * (1 - Math.cos(t)), ha + d * Math.sin(t)]);
      }
    } else {
      // cae: plano arriba y se redondea hacia abajo hasta el tramo bajo
      const xe = xb + r / 2;
      for (let q = 0; q <= N; q++) {
        const t = (q / N) * (Math.PI / 2);
        pts.push([xe - r + r * Math.sin(t), hb + d * Math.cos(t)]);
      }
    }
  }
  // espejo de la mitad derecha
  const right = pts
    .slice()
    .reverse()
    .map(([x, h]) => [L - x, h]);
  const all = pts.concat(right),
    out = [];
  for (const p of all) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push(p);
  }
  return out;
}

// una textura de enlucido gastado: blanco roto con manchas grises, chorreones bajo el pretil y la tierra subida desde el suelo
function archPlasterCanvas(L, HT, CW, CH, faceDetail) {
  const cv = document.createElement('canvas');
  cv.width = CW;
  cv.height = CH;
  const c = cv.getContext('2d');
  let s = 77;
  const R = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const X = x => (x / L) * CW,
    Y = y => CH * (1 - y / HT),
    U = CW / L; // píxeles por unidad
  c.fillStyle = '#d4cebf';
  c.fillRect(0, 0, CW, CH);
  // manchas grandes, más claras y más oscuras
  for (let k = 0; k < 260; k++) {
    const x = R() * CW,
      y = R() * CH,
      r = (0.15 + R() * 0.7) * U;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = R() < 0.6;
    const a = 0.05 + R() * 0.1;
    g.addColorStop(0, dark ? `rgba(120,112,96,${a})` : `rgba(240,236,226,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(x, y, r * (0.6 + R()), r * (0.5 + R() * 0.6), R() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // grano fino
  for (let k = 0; k < 9000; k++) {
    c.fillStyle = R() < 0.5 ? 'rgba(90,84,72,0.08)' : 'rgba(255,252,244,0.08)';
    c.fillRect(R() * CW, R() * CH, 1 + R() * 2, 1 + R() * 2);
  }
  if (faceDetail) {
    // chorreones grises que bajan del pretil y de la viga
    for (let k = 0; k < 140; k++) {
      const x = R() * CW,
        y0 = Y(ARCH_BEAM + 0.8 * R()),
        len = (0.3 + R() * 1.2) * U,
        w = 1 + R() * 4;
      const g = c.createLinearGradient(0, y0, 0, y0 + len);
      g.addColorStop(0, `rgba(95,90,80,${0.08 + R() * 0.14})`);
      g.addColorStop(1, 'rgba(95,90,80,0)');
      c.fillStyle = g;
      c.fillRect(x, y0, w, len);
    }
    // la línea de sombra de la cornisa sobre la viga y la arista de abajo de la viga, algo más sucia
    c.fillStyle = 'rgba(70,66,58,0.22)';
    c.fillRect(0, Y(ARCH_BEAM), CW, 0.05 * U);
    c.fillStyle = 'rgba(80,74,64,0.14)';
    c.fillRect(0, Y(ARCH_OPEN + 0.1), CW, 0.1 * U);
    // desconchones: el enlucido caído deja ver un gris más oscuro con borde claro
    for (let k = 0; k < 34; k++) {
      const x = R() * CW,
        y = Y(0.3 + R() * 3.9),
        w = (0.05 + R() * 0.25) * U,
        h = (0.04 + R() * 0.16) * U;
      // un borde irregular, no un óvalo
      c.beginPath();
      for (let q = 0; q < 9; q++) {
        const a = (q / 9) * Math.PI * 2,
          f = 0.55 + R() * 0.6;
        c.lineTo(x + Math.cos(a) * w * f, y + Math.sin(a) * h * f);
      }
      c.closePath();
      c.fillStyle = 'rgba(150,142,124,0.3)';
      c.fill();
      c.strokeStyle = 'rgba(245,240,230,0.3)';
      c.lineWidth = 1;
      c.stroke();
    }
  }
  // la tierra que sube desde la calle
  const g = c.createLinearGradient(0, Y(0), 0, Y(1.1));
  g.addColorStop(0, 'rgba(128,106,78,0.6)');
  g.addColorStop(0.35, 'rgba(140,120,92,0.25)');
  g.addColorStop(1, 'rgba(140,120,92,0)');
  c.fillStyle = g;
  c.fillRect(0, Y(1.1), CW, Y(0) - Y(1.1));
  return cv;
}

// las letras y la estrella del frontón, gris gastado, en un lienzo transparente que va pegado a cada cara
function archLettering(W_, H_, CW, CH) {
  const cv = document.createElement('canvas');
  cv.width = CW;
  cv.height = CH;
  const c = cv.getContext('2d');
  const U = CW / W_;
  let s = 913;
  const R = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const ink = 'rgba(96,92,84,0.78)';
  // texto con espaciado a mano, estrecho como las letras de molde del arco
  const spaced = (txt, cx, cy, h, sp) => {
    c.font = `700 ${Math.round(h)}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const sx = 0.78;
    const ws = [...txt].map(ch => c.measureText(ch).width * sx);
    const tot = ws.reduce((a, b) => a + b, 0) + sp * (txt.length - 1);
    let x = cx - tot / 2;
    [...txt].forEach((ch, k) => {
      c.save();
      c.translate(x, cy);
      c.scale(sx, 1);
      c.fillStyle = 'rgba(70,66,60,0.35)';
      c.fillText(ch, 1.5, 1.5);
      c.fillStyle = ink;
      c.fillText(ch, 0, 0);
      c.restore();
      x += ws[k] + sp;
    });
  };
  // lienzo: x de 0 a W_ centrado en el arco, y de ARCH_OPEN a ARCH_OPEN + H_
  const Y = y => CH * (1 - (y - ARCH_OPEN) / H_);
  spaced('ARCO', CW / 2, Y(3.47), 0.27 * U, 0.08 * U);
  spaced('TRIONFO  POPOLARE', CW / 2, Y(3.08), 0.28 * U, 0.06 * U);
  // la estrella en relieve del frontón, dentro de un óvalo, todo muy gastado
  const sx = CW / 2,
    sy = Y(4.03),
    r = 0.2 * U;
  c.strokeStyle = 'rgba(110,104,94,0.5)';
  c.lineWidth = 0.025 * U;
  c.beginPath();
  c.ellipse(sx, sy, r * 1.35, r * 1.15, 0, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = 'rgba(112,106,96,0.6)';
  c.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5,
      rr_ = k % 2 ? r * 0.42 : r;
    c.lineTo(sx + Math.cos(a) * rr_, sy + Math.sin(a) * rr_);
  }
  c.closePath();
  c.fill();
  // borrar a trozos: la pintura saltada
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 900; k++) {
    c.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`;
    const w = 1 + R() * 0.03 * U;
    c.fillRect(R() * CW, R() * CH, w, w * (0.5 + R()));
  }
  c.globalCompositeOperation = 'source-over';
  return cv;
}

function archGate() {
  archOldRnd();
  const A = ARCH,
    L = A.x1 - A.x0,
    D = A.z1 - A.z0,
    zc = (A.z0 + A.z1) / 2,
    par = CUR ? CUR.group : world;
  const prof = archProfile(L);
  const HT = ARCH_BEAM + 0.85; // lo más alto del frontón y un poco de margen para la textura
  // el contorno: por abajo, metiéndose en cada vano (con las esquinas de arriba redondeadas), y por arriba el pretil
  const sh = new T.Shape();
  sh.moveTo(0, 0);
  const piers = archPiers(),
    rc = 0.16;
  for (let k = 0; k < piers.length - 1; k++) {
    const xl = piers[k][0] + piers[k][1],
      xr = piers[k + 1][0];
    sh.lineTo(xl, 0);
    sh.lineTo(xl, ARCH_OPEN - rc);
    for (let q = 1; q <= 6; q++) {
      const t = (q / 6) * (Math.PI / 2);
      sh.lineTo(xl + rc - Math.cos(t) * rc, ARCH_OPEN - rc + Math.sin(t) * rc);
    }
    sh.lineTo(xr - rc, ARCH_OPEN);
    for (let q = 1; q <= 6; q++) {
      const t = (q / 6) * (Math.PI / 2);
      sh.lineTo(xr - rc + Math.sin(t) * rc, ARCH_OPEN - (1 - Math.cos(t)) * rc);
    }
    sh.lineTo(xr, 0);
  }
  sh.lineTo(L, 0);
  for (let k = prof.length - 1; k >= 0; k--) sh.lineTo(prof[k][0], ARCH_BEAM + prof[k][1]);
  sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 4 });
  // las caras usan la textura con todo su detalle; los cantos y el intradós, un enlucido sin chorreones repetido
  const faceTex = new T.CanvasTexture(archPlasterCanvas(L, HT, 2048, 1024, true));
  faceTex.repeat.set(1 / L, 1 / HT);
  faceTex.anisotropy = 4;
  const sideTex = new T.CanvasTexture(archPlasterCanvas(L, HT, 1024, 512, false));
  sideTex.wrapS = sideTex.wrapT = T.RepeatWrapping;
  sideTex.repeat.set(1 / L, 1 / HT);
  const mFace = new T.MeshPhongMaterial({ map: faceTex, specular: 0x000000, shininess: 1 });
  const mSide = new T.MeshPhongMaterial({ map: sideTex, color: 0xe6e0d2, specular: 0x000000, shininess: 1 });
  const arch = new T.Mesh(geo, [mFace, mSide]);
  arch.position.set(A.x0, 0, A.z0);
  arch.castShadow = arch.receiveShadow = true;
  par.add(arch);
  // las letras y la estrella, por delante y por detrás (cada una legible desde su lado)
  const LW = 5.4,
    LH = 1.6;
  const ltex = new T.CanvasTexture(archLettering(LW, LH, 1536, 456));
  ltex.anisotropy = 4;
  const lmat = new T.MeshPhongMaterial({
    map: ltex,
    transparent: true,
    depthWrite: false,
    specular: 0x000000,
    shininess: 1,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  for (const f of [-1, 1]) {
    const p = new T.Mesh(new T.PlaneGeometry(LW, LH), lmat);
    p.position.set(A.cx, ARCH_OPEN + LH / 2, f < 0 ? A.z0 - 0.006 : A.z1 + 0.006);
    p.rotation.y = f < 0 ? Math.PI : 0;
    p.receiveShadow = true;
    par.add(p);
  }
  // la cornisa fina sobre la viga y el zócalo sucio de cada pilar
  MAT = M.STONE;
  B(A.cx, ARCH_BEAM - 0.035, zc, L - 0.02, 0.07, D + 0.08, 0xcdc6b4);
  for (const [px, pw] of piers) B(A.x0 + px + pw / 2, 0.16, zc, pw + 0.08, 0.32, D + 0.08, 0x9e927a);
  // los pilares cortan el paso y la vista; por los vanos anchos se pasa (y pasan los coches)
  for (const [px, pw] of piers) {
    const i0 = Math.floor(A.x0 + px + 0.08),
      i1 = Math.floor(A.x0 + px + pw - 0.08);
    for (let i = i0; i <= i1; i++)
      for (let j = Math.floor(A.z0); j <= Math.floor(A.z1 - 0.01); j++) {
        if (!inB(i, j) || grid[idx(i, j)] === 1) continue;
        const k = idx(i, j);
        grid[k] = 1;
        topH[k] = Math.max(topH[k], ARCH_BEAM);
      }
  }
}
