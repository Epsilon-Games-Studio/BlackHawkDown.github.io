/* ====================================================================================================
 * world/target-house.js
 *
 * El objetivo del asalto: una casa de patio de dos plantas como la de la película, arcadas y galerías alrededor
 * de un patio abierto, almenas escalonadas en el pretil, tejadillos de teja sobre la galería de arriba y hiedra en las columnas
 * ================================================================================================== */

function targetCompound(x0, y0, w, d) {
  const T2 = 2,
    gx0 = x0 + 6,
    gx1 = x0 + 7; // grosor del anillo, celdas de la puerta (lado sur)
  const inCourt = (i, j) => i >= x0 + T2 && i < x0 + w - T2 && j >= y0 + T2 && j < y0 + d - T2;
  const inGate = (i, j) => i >= gx0 && i <= gx1 && j >= y0 + d - T2;
  const inPortico = (i, j) => i === x0 && j >= y0 + 1 && j <= y0 + d - 2; // arcada a la calle ancha
  const inPass = (i, j) => i === x0 + 1 && (j === y0 + 4 || j === y0 + 5); // paso de la arcada al patio
  for (let j = y0; j < y0 + d; j++)
    for (let i = x0; i < x0 + w; i++) {
      const k = idx(i, j);
      reserved[k] = 1;
      if (inCourt(i, j) || inGate(i, j) || inPortico(i, j) || inPass(i, j)) {
        grid[k] = 0;
        ground[k] = 3;
        topH[k] = 0;
      } else {
        grid[k] = 1;
        topH[k] = 3.55;
      }
    }
  const bid = regB(x0, y0, w, d, 3.2);
  BLDS[bid].ring = true;
  for (let j = y0; j < y0 + d; j++) for (let i = x0; i < x0 + w; i++) if (grid[idx(i, j)] === 0) BID[idx(i, j)] = -1;
  // cosas del patio que importan en un tiroteo: sacos terreros, cajas, un pozo
  addCover('sandbag', x0 + 3, y0 + 5, 'x');
  addCover('sandbag', x0 + 4, y0 + 5, 'x');
  addCover('crates', x0 + 9, y0 + 3);
  addCover('barrel', x0 + 10, y0 + 6);
  addCover('fountain', x0 + 6, y0 + 3);
  lazyAdd(x0 + w / 2, y0 + d / 2, () => buildTargetCompound(x0, y0, w, d, T2, gx0, gx1));
}
/* La arcada de la fachada: una fila de arcos de herradura recortados en un paño enlucido, cada uno enmarcado por un alfiz labrado,
   sobre columnas de mármol pareadas; detrás, un pórtico profundo con zócalo de azulejo y un paso al patio */
let ZELLIGE = null;
function zelligeTex() {
  if (ZELLIGE) return ZELLIGE;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#efe8d8';
  c.fillRect(0, 0, 64, 64);
  const star = (x, y, r, col) => {
    c.fillStyle = col;
    c.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        rr_ = k % 2 ? r * 0.55 : r;
      c.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_);
    }
    c.closePath();
    c.fill();
  };
  for (const [x, y] of [
    [0, 0],
    [64, 0],
    [0, 64],
    [64, 64],
    [32, 32]
  ])
    star(x, y, 15, '#22436e');
  for (const [x, y] of [
    [32, 0],
    [0, 32],
    [64, 32],
    [32, 64]
  ]) {
    c.fillStyle = '#1f6a5a';
    c.beginPath();
    c.moveTo(x, y - 9);
    c.lineTo(x + 9, y);
    c.lineTo(x, y + 9);
    c.lineTo(x - 9, y);
    c.closePath();
    c.fill();
  }
  for (const [x, y] of [
    [16, 16],
    [48, 16],
    [16, 48],
    [48, 48]
  ])
    star(x, y, 5, '#c9a24a');
  c.strokeStyle = 'rgba(40,40,40,.35)';
  c.lineWidth = 1;
  for (let k = 0; k <= 64; k += 16) {
    c.beginPath();
    c.moveTo(k, 0);
    c.lineTo(k, 64);
    c.stroke();
    c.beginPath();
    c.moveTo(0, k);
    c.lineTo(64, k);
    c.stroke();
  }
  ZELLIGE = new T.CanvasTexture(cv);
  ZELLIGE.magFilter = T.NearestFilter;
  ZELLIGE.wrapS = ZELLIGE.wrapT = T.RepeatWrapping;
  return ZELLIGE;
}
function porticoWest(x0, z0, L, H, b, WALL, TRIM, pass0, pass1) {
  const par = CUR ? CUR.group : world,
    depth = 0.22;
  const n = Math.max(3, Math.round(L / 1.45)),
    step = L / n,
    a = 0.42,
    r = 0.5,
    s = 0.82;
  // el paño de arcos como una sola forma extruida con agujeros de cerradura
  // un contorno que baja en cada arco desde el suelo (los agujeros no pueden tocar el borde, así que los arcos son muescas)
  const al = Math.acos(a / r),
    jambTop = s - r * Math.sin(al);
  const sh = new T.Shape();
  sh.moveTo(0, 0);
  for (let k = 0; k < n; k++) {
    const cx = (k + 0.5) * step;
    sh.lineTo(cx - a, 0);
    sh.lineTo(cx - a, jambTop);
    const N = 22;
    for (let q = 0; q <= N; q++) {
      const th = Math.PI + al - ((Math.PI + 2 * al) * q) / N;
      sh.lineTo(cx + r * Math.cos(th), s + r * Math.sin(th));
    }
    sh.lineTo(cx + a, 0);
  }
  sh.lineTo(L, 0);
  sh.lineTo(L, H);
  sh.lineTo(0, H);
  sh.closePath();
  const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 4 });
  const mat = new T.MeshPhongMaterial({ color: WALL, specular: 0x000000, shininess: 1, side: T.DoubleSide });
  const screen = new T.Mesh(geo, mat);
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(x0 + depth, 0, z0);
  screen.castShadow = screen.receiveShadow = true;
  par.add(screen);
  // una banda moldurada alrededor de cada herradura, en resalte sobre el muro, en una piedra labrada más oscura
  const mshape = new T.Shape(),
    M2 = 26,
    w_ = 0.085;
  {
    const ro = r + w_,
      alo = Math.acos(Math.min(0.99, (a + w_ * 0.6) / ro));
    mshape.moveTo(-a, jambTop);
    for (let q = 0; q <= M2; q++) {
      const th = Math.PI + al - ((Math.PI + 2 * al) * q) / M2;
      mshape.lineTo(r * Math.cos(th), s + r * Math.sin(th));
    }
    mshape.lineTo(a + w_ * 0.6, jambTop - 0.02);
    for (let q = 0; q <= M2; q++) {
      const th = -alo + ((Math.PI + 2 * alo) * q) / M2;
      mshape.lineTo(ro * Math.cos(th), s + ro * Math.sin(th));
    }
    mshape.closePath();
  }
  const mgeo = new T.ExtrudeGeometry(mshape, { depth: 0.05, bevelEnabled: false, curveSegments: 4 });
  const mmat = new T.MeshPhongMaterial({ color: 0xc8b896, specular: 0x000000, shininess: 1, side: T.DoubleSide });
  for (let k = 0; k < n; k++) {
    const m = new T.Mesh(mgeo, mmat);
    m.rotation.y = -Math.PI / 2;
    m.position.set(x0 - 0.045 + 0.05, 0, z0 + (k + 0.5) * step);
    m.castShadow = true;
    par.add(m);
  }
  // por arco: el alfiz y las enjutas labradas en la cara de la calle, y columnas pareadas en cada machón
  const fx = x0 - 0.03;
  for (let k = 0; k < n; k++) {
    const cz = z0 + (k + 0.5) * step;
    B(fx, s + r + 0.11, cz, 0.05, 0.06, 2 * r + 0.26, TRIM, { b }); // parte de arriba del alfiz
    B(fx, (s + r + 0.11 + jambTop) / 2 + 0.05, cz - r - 0.12, 0.05, s + r + 0.11 - jambTop, 0.06, TRIM, { b });
    B(fx, (s + r + 0.11 + jambTop) / 2 + 0.05, cz + r + 0.12, 0.05, s + r + 0.11 - jambTop, 0.06, TRIM, { b });
    for (const sg of [-1, 1])
      B(fx + 0.01, s + r * 0.72, cz + sg * (r * 0.82), 0.03, r * 0.55, r * 0.32, shade(WALL, 0.9), { b, m: M.STONE }); // enjutas labradas
    B(fx, s + r - 0.01, cz, 0.04, 0.1, 0.12, shade(TRIM, 0.92), { b, m: M.STONE }); // clave
  }
  for (let k = 0; k <= n; k++) {
    const pz = z0 + k * step;
    for (const off of k === 0 || k === n ? [k === 0 ? 0.14 : -0.14] : [-0.13, 0.13]) {
      const z = pz + off,
        x = x0 - 0.1;
      C(x, jambTop / 2 + 0.06, z, 0.065, jambTop - 0.1, 0xf2ecde, { b, m: M.STONE });
      B(x, 0.05, z, 0.2, 0.1, 0.2, TRIM, { b, m: M.STONE });
      B(x, jambTop + 0.02, z, 0.2, 0.12, 0.2, TRIM, { b, m: M.STONE }); // capitel
    }
  }
  // zócalo de la fachada y un friso entre la arcada y la planta de arriba
  B(x0 - 0.04, H - 0.1, z0 + L / 2, 0.1, 0.14, L + 0.1, TRIM, { b });
  for (let t = 0.2; t < L; t += 0.42)
    B(x0 - 0.07, H - 0.1, z0 + t, 0.04, 0.08, 0.16, shade(TRIM, 0.86), { b, m: M.STONE });
  // el muro del fondo del pórtico, con el zócalo de azulejo, dos puertas y el paso abierto
  const back = x0 + 1;
  const seg = (za, zb) => {
    if (zb - za < 0.05) return;
    B(back + 0.06, H / 2, (za + zb) / 2, 0.12, H, zb - za, shade(WALL, 0.72), { b });
  };
  seg(z0, pass0);
  seg(pass1, z0 + L);
  const dado = new T.MeshPhongMaterial({ map: zelligeTex(), specular: 0x333333, shininess: 30 });
  for (const [za, zb] of [
    [z0, pass0],
    [pass1, z0 + L]
  ]) {
    if (zb - za < 0.1) continue;
    const g = new T.PlaneGeometry(zb - za, 0.62);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (zb - za)) / 0.45, (uv.getY(i) * 0.62) / 0.45);
    const m = new T.Mesh(g, dado);
    m.rotation.y = -Math.PI / 2;
    m.position.set(back - 0.002, 0.33, (za + zb) / 2);
    m.receiveShadow = true;
    par.add(m);
    B(back - 0.01, 0.66, (za + zb) / 2, 0.03, 0.04, zb - za, 0x8a6a3a, { b, m: M.WOOD });
  }
  // puertas en el muro del fondo
  for (const zc of [z0 + 1.1, z0 + L - 1.1])
    if (zc < pass0 - 0.6 || zc > pass1 + 0.6) {
      B(back - 0.02, 0.75, zc, 0.05, 1.35, 0.7, 0x4a3424, { b, m: M.WOOD });
      B(back - 0.03, 1.48, zc, 0.05, 0.12, 0.84, TRIM, { b });
    }
  // el paso: un arco sencillo hasta el patio
  B(back + 0.06, H - 0.22, (pass0 + pass1) / 2, 0.12, 0.44, pass1 - pass0, WALL, { b });
  // tinajas grandes de barro y un banco bajo los arcos
  C(x0 + 0.7, 0.3, z0 + 0.5, 0.22, 0.6, 0xb87a4a, { b, m: M.BRICK });
  C(x0 + 0.72, 0.26, z0 + L - 0.55, 0.2, 0.52, 0xa86a3e, { b, m: M.BRICK });
  // faroles colgados bajo la arcada
  for (let k = 1; k < n; k += 2) {
    const z = z0 + k * step;
    B(x0 + 0.5, H - 0.25, z, 0.02, 0.3, 0.02, 0x2a2a28, { b, m: M.METAL });
    B(x0 + 0.5, H - 0.45, z, 0.12, 0.14, 0.12, 0x6a5a3a, { b, m: M.METAL });
  }
}
function buildTargetCompound(x0, y0, w, d, T2, gx0, gx1) {
  const b = nBld++,
    WALL = 0xe9e0cc,
    TRIM = 0xd6cbb2,
    STONE = 0xcfc4ad,
    TILE = 0xa8583a,
    IVY = 0x4e6a34,
    FH2 = 1.55;
  const top = FH2 * 2,
    X1 = x0 + w,
    Y1 = y0 + d;
  const P = (x, y, z, sx, sy, sz, c, ex) => B(x, y, z, sx, sy, sz, c, Object.assign({ b }, ex || {}));
  MAT = M.PLASTER;
  // la carcasa exterior: cuatro alas; la mitad interior de cada una es galería, así que lo macizo es el metro de fuera
  const shell = (ax, az, bx, bz) => P((ax + bx) / 2, top / 2, (az + bz) / 2, bx - ax, top, bz - az, WALL);
  shell(x0, y0, X1, y0 + 1); // norte
  shell(x0, Y1 - 1, gx0, Y1);
  shell(gx1 + 1, Y1 - 1, X1, Y1); // sur, partida por la puerta
  shell(X1 - 1, y0 + 1, X1, Y1 - 1); // este
  P(x0 + 0.5, (FH2 + top) / 2 + 0.07, (y0 + 1 + Y1 - 1) / 2, 1, top - FH2 - 0.14, d - 2, WALL); // planta alta del oeste, apoyada en la arcada
  P(x0 + 0.5, FH2 + 0.02, (y0 + 1 + Y1 - 1) / 2, 1.02, 0.16, d - 2, TRIM, { m: M.CONC }); // su forjado, el techo del pórtico
  porticoWest(x0, y0 + 1, d - 2, FH2, b, WALL, TRIM, y0 + 4, y0 + 6);

  // la puerta: un arco casi de herradura en un portal profundo, con portones de madera abiertos de par en par
  P((gx0 + gx1 + 1) / 2, top - 0.45, Y1 - 1, 2.1, 0.9, 2, WALL);
  P((gx0 + gx1 + 1) / 2, 2.05, Y1 + 0.02, 2.3, 0.22, 0.1, TRIM);
  P(gx0 - 0.02, 1.1, Y1 + 0.02, 0.22, 2.2, 0.1, TRIM);
  P(gx1 + 1.02, 1.1, Y1 + 0.02, 0.22, 2.2, 0.1, TRIM);
  P(gx0 + 0.25, 1.0, Y1 - 0.3, 0.08, 2.0, 0.9, 0x5a3e28, { m: M.WOOD, ry: 0.6 });
  P(gx1 + 0.75, 1.0, Y1 - 0.3, 0.08, 2.0, 0.9, 0x5a3e28, { m: M.WOOD, ry: -0.6 });
  // zócalo y moldura corrida por fuera
  P(x0 + w / 2, 0.25, y0 - 0.02, w + 0.05, 0.5, 0.06, STONE, { m: M.STONE });
  P(x0 - 0.02, 0.25, y0 + 0.5, 0.06, 0.5, 1.05, STONE, { m: M.STONE });
  P(x0 - 0.02, 0.25, Y1 - 0.5, 0.06, 0.5, 1.05, STONE, { m: M.STONE });
  P(X1 + 0.02, 0.25, y0 + d / 2, 0.06, 0.5, d + 0.05, STONE, { m: M.STONE });
  P(x0 + 3.2, 0.25, Y1 + 0.02, 6.3, 0.5, 0.06, STONE, { m: M.STONE });
  P(X1 - 2.6, 0.25, Y1 + 0.02, 5.1, 0.5, 0.06, STONE, { m: M.STONE });
  for (const [ax, az, bx, bz] of [
    [x0, y0, X1, y0],
    [x0, Y1, X1, Y1],
    [x0, y0, x0, Y1],
    [X1, y0, X1, Y1]
  ]) {
    const horiz = az === bz,
      L = horiz ? bx - ax : bz - az,
      o = (horiz ? (az === y0 ? -1 : 1) : ax === x0 ? -1 : 1) * 0.03;
    P(
      horiz ? (ax + bx) / 2 : ax + o,
      FH2 + 0.05,
      horiz ? az + o : (az + bz) / 2,
      horiz ? L + 0.08 : 0.1,
      0.12,
      horiz ? 0.1 : L + 0.08,
      TRIM
    );
    // ventanas: pequeñas y profundas, con contraventanas de madera; el remate en arco se finge con una clave más clara
    const n = Math.floor(L / 1.6);
    for (let f = 0; f < 2; f++)
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) * L) / n,
          cx = horiz ? ax + t : ax + o,
          cz = horiz ? az + o : az + t;
        if (horiz && az === Y1 && cx > gx0 - 0.6 && cx < gx1 + 1.6) continue;
        if (f === 0 && rnd() < 0.35) continue;
        if (f === 0 && !horiz && ax === x0) continue;
        const yy = f * FH2 + 0.95;
        P(cx, yy, cz, horiz ? 0.5 : 0.05, 0.7, horiz ? 0.05 : 0.5, 0x26221d, { m: M.GLASS });
        P(cx, yy + 0.43, cz, horiz ? 0.62 : 0.07, 0.14, horiz ? 0.07 : 0.62, TRIM);
        if (rnd() < 0.5) {
          const sc = pick([0x3e6b6a, 0x6a5236, 0x5a7d9a]);
          const off = 0.36;
          P(horiz ? cx - off : cx, yy, horiz ? cz : cz - off, horiz ? 0.2 : 0.05, 0.68, horiz ? 0.05 : 0.2, sc, {
            m: M.WOOD
          });
          P(horiz ? cx + off : cx, yy, horiz ? cz : cz + off, horiz ? 0.2 : 0.05, 0.68, horiz ? 0.05 : 0.2, sc, {
            m: M.WOOD
          });
        }
      }
  }
  // pretil con almenas escalonadas
  const parapet = (ax, az, bx, bz) => {
    const horiz = az === bz,
      L = horiz ? bx - ax : bz - az;
    P(
      horiz ? (ax + bx) / 2 : ax,
      top + 0.2,
      horiz ? az : (az + bz) / 2,
      horiz ? L : 0.16,
      0.4,
      horiz ? 0.16 : L,
      WALL,
      { roof: 1 }
    );
    for (let t = 0.35; t < L; t += 0.7) {
      const cx = horiz ? ax + t : ax,
        cz = horiz ? az : az + t;
      P(cx, top + 0.52, cz, horiz ? 0.34 : 0.18, 0.26, horiz ? 0.18 : 0.34, WALL, { roof: 1 });
      P(cx, top + 0.72, cz, horiz ? 0.18 : 0.16, 0.16, horiz ? 0.16 : 0.18, WALL, { roof: 1 });
    }
  };
  parapet(x0, y0 + 0.08, X1, y0 + 0.08);
  parapet(x0, Y1 - 0.08, X1, Y1 - 0.08);
  parapet(x0 + 0.08, y0, x0 + 0.08, Y1);
  parapet(X1 - 0.08, y0, X1 - 0.08, Y1);
  // cubiertas de las alas (planas y pisables) y los tejadillos de teja roja hacia dentro sobre las galerías altas
  const ix0 = x0 + T2,
    ix1 = X1 - T2,
    iz0 = y0 + T2,
    iz1 = Y1 - T2;
  P(x0 + w / 2, top + 0.03, y0 + 0.5, w, 0.08, 1, 0xa49b88, { m: M.CONC });
  P(x0 + w / 2, top + 0.03, Y1 - 0.5, w, 0.08, 1, 0xa49b88, { m: M.CONC });
  P(x0 + 0.5, top + 0.03, y0 + d / 2, 1, 0.08, d, 0xa49b88, { m: M.CONC });
  P(X1 - 0.5, top + 0.03, y0 + d / 2, 1, 0.08, d, 0xa49b88, { m: M.CONC });
  const tile = (cx, cz, sx, sz, ex) =>
    P(cx, top - 0.02, cz, sx, 0.1, sz, TILE, Object.assign({ m: M.BRICK, roof: 1 }, ex));
  tile((ix0 + ix1) / 2, iz0 - 0.45, ix1 - ix0 + 2, 1.1, { rx: 0.42 });
  tile((ix0 + ix1) / 2, iz1 + 0.45, ix1 - ix0 + 2, 1.1, { rx: -0.42 });
  tile(ix0 - 0.45, (iz0 + iz1) / 2, 1.1, iz1 - iz0, { rz: -0.42 });
  tile(ix1 + 0.45, (iz0 + iz1) / 2, 1.1, iz1 - iz0, { rz: 0.42 });
  // galerías alrededor del patio: dos alturas de columnas finas y arcos, balaustrada arriba, zócalo de azulejo y puertas detrás
  const side = (ax, az, bx, bz, nx, nz) => {
    const horiz = az === bz,
      L = horiz ? bx - ax : bz - az,
      n = Math.max(2, Math.round(L / 1.3)),
      step = L / n;
    const at = (t, off) => (horiz ? [ax + t, az + nz * off] : [ax + nx * off, az + t]);
    // forjado de la galería y detalles del muro del fondo
    // (el forjado de la galería de arriba, el zócalo de azulejo azul y las puertas y ventanas que había detrás ya no están: con el techo cortado
    // parecían muros sueltos y un suelo flotando dentro del patio)
    for (let f = 0; f < 2; f++) {
      const y0f = f * FH2 + (f ? 0.14 : 0),
        ch = f ? 1.1 : 1.25;
      for (let k = 0; k <= n; k++) {
        const p = at(k * step, 0);
        C(p[0], y0f + ch / 2, p[1], 0.09, ch, 0xf0e8d6, { b, m: M.STONE });
        P(p[0], y0f + ch + 0.06, p[1], 0.26, 0.1, 0.26, TRIM, { m: M.STONE });
        P(p[0], y0f + 0.05, p[1], 0.22, 0.1, 0.22, TRIM, { m: M.STONE });
        if (rnd() < 0.45) leafCanopy(p[0], y0f + rr(0.3, ch), p[1], 0.22, rr(0.3, 0.6), 0.22, IVY, 10);
      }
      // banda de arcos sobre las columnas: un dintel con arcos festoneados recortados por dos bloques inclinados en cada vano
      const lin = at(L / 2, 0);
      P(lin[0], y0f + ch + 0.32, lin[1], horiz ? L : 0.2, 0.4, horiz ? 0.2 : L, WALL);
      for (let k = 0; k < n; k++) {
        const p0 = at(k * step + step * 0.22, 0),
          p1 = at(k * step + step * 0.78, 0),
          pc = at((k + 0.5) * step, 0);
        const r = horiz ? { rz: 0.8 } : { rx: -0.8 },
          r2 = horiz ? { rz: -0.8 } : { rx: 0.8 };
        P(p0[0], y0f + ch + 0.05, p0[1], horiz ? 0.42 : 0.19, 0.2, horiz ? 0.19 : 0.42, WALL, r);
        P(p1[0], y0f + ch + 0.05, p1[1], horiz ? 0.42 : 0.19, 0.2, horiz ? 0.19 : 0.42, WALL, r2);
        P(pc[0], y0f + ch + 0.16, pc[1], horiz ? 0.3 : 0.19, 0.08, horiz ? 0.19 : 0.3, TRIM);
      }
      if (f === 1) {
        // balaustrada
        const bl = at(L / 2, 0.02);
        P(bl[0], FH2 + 0.7, bl[1], horiz ? L : 0.1, 0.07, horiz ? 0.1 : L, 0x6a4a30, { m: M.WOOD });
        for (let t = 0.2; t < L; t += 0.26) {
          const q = at(t, 0.02);
          P(q[0], FH2 + 0.42, q[1], 0.045, 0.5, 0.045, 0x6a4a30, { m: M.WOOD });
        }
      }
    }
    // hiedra cayendo por el borde de la cubierta
    for (let k = 0; k < 3; k++) {
      const q = at(rr(0.5, L - 0.5), -0.2);
      leafCanopy(q[0], top - 0.3, q[1], 0.5, 0.5, 0.5, IVY, 26);
    }
  };
  side(ix0, iz0, ix1, iz0, 0, -1);
  side(ix0, iz1, ix1, iz1, 0, 1);
  side(ix0, iz0, ix0, iz1, -1, 0);
  side(ix1, iz0, ix1, iz1, 1, 0);
  // trastos del patio: una escalera contra la galería, cajas y un bidón, ropa tendida arriba
  P(ix1 - 1.2, 1.3, iz0 + 0.35, 0.05, 2.6, 0.05, 0x7a5a3a, { m: M.WOOD, rx: -0.25 });
  P(ix1 - 0.8, 1.3, iz0 + 0.35, 0.05, 2.6, 0.05, 0x7a5a3a, { m: M.WOOD, rx: -0.25 });
  for (let k = 0; k < 7; k++)
    P(ix1 - 1, 0.3 + k * 0.34, iz0 + 0.2 + k * 0.085, 0.45, 0.04, 0.04, 0x7a5a3a, { m: M.WOOD });
  P(ix0 + 0.6, 0.2, iz1 - 0.5, 0.3, 0.4, 0.2, 0x3a5a3a, { m: M.METAL });
  for (let k = 0; k < 4; k++)
    P(ix0 + 1.5 + k * 0.32, FH2 + 1.05, iz1 + 0.55, 0.26, 0.34, 0.02, pick([0xd8d1c1, 0xc9bc9f, 0xbcad8c, 0xe2dccd]), {
      awn: 2,
      m: M.CLOTH
    });
  // un depósito de agua y una antena en la azotea
  C(X1 - 0.6, top + 0.5, y0 + 0.6, 0.35, 0.8, 0x6c6f6a, { b, roof: 1, m: M.METAL });
  rubbleAround(x0, y0, w, d);
}
