/* ====================================================================================================
 * world/tfr-base.js
 *
 * La base de la Task Force Ranger, trazada sobre el plano que hice (marco del aeropuerto: u a lo largo de la pista, v hacia ella)
 * ================================================================================================== */

'use strict';

const RWY = { L: 210, W: 12 }; // media longitud y media anchura de la pista
const BASE = { u0: -195, u1: 195, v0: -185, v1: -16, gateV: -105 };
const APRON = { u0: -185, u1: 185, v0: -118, v1: -30 };
const JOINS = [-172, 0, 162]; // calles de rodaje de la plataforma a la pista
const BHROW = { u: -155, v: -72, n: 8, step: 13, fly: 4 }; // Black Hawks uno al lado del otro, con el morro hacia la pista, como en la película; los seis primeros vuelan la misión
const LBROW = { u: -150, v: -46, n: 6, step: 8, fly: 4 }; // Little Birds en fila delante de ellos
const C130S = [
  [55, -48],
  [90, -48],
  [125, -48]
];
const TENTB = [
  [-70, -145],
  [-36, -145]
]; // dos bloques de cuatro tiendas
const TENTA = { u0: -92, u1: -14, v0: -172, v1: -118 }; // las filas de tiendas: tierra apisonada y calles de tierra con rodadas
const TAXI_V = -95; // la calle de rodaje de la plataforma
function wireV(v0, v1, u) {
  MAT = M.METAL;
  const a = AIRP(u, (v0 + v1) / 2);
  Cs(a[0], 0.45, a[1], 0.8, Math.abs(v1 - v0), 0.8, 0x4a4a46, { rx: PH, ry: AIR_RY, ord: 'YXZ' });
}
/* M2 sobre afuste de anillo con el tirador de pie en la escotilla (metros, morro hacia +z, techo a 1,70) */
let GUNNER_GEO = null;
function gunnerGeo() {
  if (GUNNER_GEO) return GUNNER_GEO;
  const L = [],
    R0 = 1.7,
    z0 = -0.35,
    DCU_ = 0xc8b48c,
    VEST = 0x56653a,
    SKIN = 0xb98a62,
    GUN = 0x22221f;
  L.push([0.95, 0.1, 0, 0, R0 + 0.05, z0, 0x3a3d30, 0, 0, 0, 'c']); // afuste de anillo
  L.push([0.9, 0.32, 0.06, 0, R0 + 0.22, z0 + 0.5, 0x4a4f3a]); // escudo bajo
  L.push([0.07, 0.55, 0.07, 0, R0 + 0.3, z0 + 0.32, GUN]); // pedestal
  L.push([0.22, 0.2, 0.72, 0, R0 + 0.62, z0 + 0.38, GUN]); // cajón de mecanismos de la M2
  L.push([0.09, 0.24, 0, 0, R0 + 0.64, z0 + 0.86, 0x2c2c28, PH, 0, 0, 'c']); // camisa del cañón
  L.push([0.05, 0.5, 0, 0, R0 + 0.64, z0 + 1.2, GUN, PH, 0, 0, 'c']); // cañón (corto)
  L.push([0.08, 0.07, 0.09, 0, R0 + 0.64, z0 + 1.46, GUN]); // bocacha
  L.push([0.18, 0.2, 0.3, 0.2, R0 + 0.55, z0 + 0.32, 0x4e5a36]); // caja de munición
  for (const s of [-1, 1]) L.push([0.04, 0.14, 0.04, s * 0.07, R0 + 0.6, z0 + 0.0, GUN]); // empuñaduras de pala
  // el tirador, de cintura para arriba, echado sobre el arma
  L.push([0.42, 0.5, 0.27, 0, R0 + 0.25, z0 - 0.22, DCU_, -0.12]); // torso
  L.push([0.46, 0.4, 0.3, 0, R0 + 0.33, z0 - 0.2, VEST, -0.12]); // chaleco
  L.push([0.11, 0.1, 0.11, 0, R0 + 0.62, z0 - 0.17, SKIN]); // cuello
  L.push([0.22, 0.26, 0.24, 0, R0 + 0.78, z0 - 0.14, SKIN, 0, 0, 0, 's']); // cabeza
  L.push([0.29, 0.2, 0.31, 0, R0 + 0.86, z0 - 0.15, VEST, 0, 0, 0, 'h']); // casco
  L.push([0.28, 0.03, 0.07, 0, R0 + 0.8, z0 - 0.02, 0x111111]); // gafas
  for (const s of [-1, 1]) {
    L.push([0.1, 0.38, 0.1, s * 0.2, R0 + 0.44, z0 - 0.03, DCU_, -0.95]);
    L.push([0.09, 0.32, 0.09, s * 0.13, R0 + 0.52, z0 + 0.16, DCU_, -1.45]);
  }
  GUNNER_GEO = partGeo(L);
  return GUNNER_GEO;
}
const BASE_CONVOY = [];
BASE_CONVOY.hide = false;
function baseConvoyShow(on) {
  BASE_CONVOY.hide = !on;
  for (const o of BASE_CONVOY) o.visible = on;
}
/* La M2 sobre el anillo de la torreta, girando entera, con un Ranger en la escotilla: en los metros del propio Humvee, techo a 1,70 */
const HMV_RING = { y: 1.7, z: -0.35 };
function hmvTurret(par) {
  const t = new T.Group();
  t.position.set(0, HMV_RING.y + 0.012, HMV_RING.z);
  par.add(t);
  withModel('kit3', M_ => {
    const m = new T.Mesh(M_.geos.m2t, propMat('kit3', M_));
    m.castShadow = true;
    m.receiveShadow = true;
    t.add(m);
  });
  const r = buildRig('ranger', { gun: 'm16' });
  r.gun.visible = false;
  r.root.scale.setScalar(1.5);
  r.root.position.set(0, -0.89, -0.32);
  r.root.rotation.y = 0;
  r.chest.rotation.x = 0.12;
  r.neck.rotation.x = -0.1;
  r.shR.rotation.x = -1.05;
  r.shR.rotation.z = -0.18;
  r.elR.rotation.x = -0.75;
  r.shL.rotation.x = -1.05;
  r.shL.rotation.z = 0.18;
  r.elL.rotation.x = -0.75;
  r.hipL.rotation.x = r.hipR.rotation.x = -0.05;
  t.add(r.root);
  t.userData.rig = r;
  return t;
}
function humveeAt(u, v, ry) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = ry;
  g.scale.setScalar(1 / 1.5);
  (CUR ? CUR.group : world).add(g);
  hmvTurret(g);
  withModel('humvee', M_ => {
    const q = lodMesh(humveeBare(M_), M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
/* Camión de carga M813 de 5 t: capó largo, cabina abierta con capota de lona, tres ejes y lona sobre la caja (metros, morro hacia +z) */
let M813_GEO = null;
function m813Geo() {
  if (M813_GEO) return M813_GEO;
  const L = [],
    OD_ = 0x4e5638,
    OD2 = 0x434a30,
    CAN = 0x6a6a4a,
    BLK_ = 0x1c1c1a,
    GL = 0x23292c;
  L.push([0.95, 0.25, 7.2, 0, 0.95, -0.2, 0x2a2a26]); // largueros del bastidor
  for (const [z, w] of [
    [2.55, 0.34],
    [-1.55, 0.62],
    [-2.95, 0.62]
  ])
    for (const s of [-1, 1]) {
      L.push([1.12, w, 0, s * (1.24 - w / 2 + 0.17), 0.56, z, BLK_, 0, 0, PH, 'c']);
      L.push([0.55, w + 0.02, 0, s * (1.24 - w / 2 + 0.17), 0.56, z, 0x3a3d30, 0, 0, PH, 'c']);
    }
  L.push([2.45, 0.28, 0.22, 0, 0.9, 3.72, OD2]); // parachoques
  L.push([0.1, 0.1, 0.3, -0.8, 0.9, 3.9, BLK_]);
  L.push([0.1, 0.1, 0.3, 0.8, 0.9, 3.9, BLK_]); // ganchos de remolque
  L.push([1.25, 0.85, 0.08, 0, 1.55, 3.63, 0x2e3226]); // calandra
  for (const s of [-1, 1]) L.push([0.18, 0.18, 0.06, s * 0.48, 1.55, 3.68, 0xd8d4c0]); // faros
  L.push([1.35, 0.8, 1.25, 0, 1.55, 3.0, OD_]); // capó
  L.push([1.38, 0.08, 1.28, 0, 1.97, 3.0, OD2]);
  for (const s of [-1, 1]) {
    L.push([0.55, 0.14, 1.55, s * 0.95, 1.25, 2.95, OD_, 0.0]);
    L.push([0.55, 0.5, 0.14, s * 0.95, 1.0, 2.2, OD_]);
  } // aletas
  L.push([2.3, 1.05, 1.35, 0, 1.75, 1.7, OD_]); // cabina
  L.push([2.0, 0.55, 0.05, 0, 2.55, 2.37, GL, -0.12]); // parabrisas
  L.push([2.06, 0.08, 0.1, 0, 2.83, 2.38, OD2]);
  L.push([2.34, 0.45, 1.4, 0, 3.05, 1.7, CAN]); // capota de lona de la cabina
  for (const s of [-1, 1]) {
    L.push([0.06, 0.4, 0.5, s * 1.17, 2.5, 1.7, GL]);
    L.push([0.06, 0.35, 0.22, s * 1.35, 2.55, 2.3, 0x2a2a28]);
  } // ventanillas laterales y retrovisores
  L.push([0.5, 0.5, 0, -1.05, 1.05, 0.6, OD2, PH, 0, 0, 'c']); // depósito
  L.push([2.45, 0.2, 4.6, 0, 1.35, -1.55, OD2]); // caja
  for (const s of [-1, 1]) L.push([0.08, 0.6, 4.6, s * 1.2, 1.75, -1.55, OD_]); // laterales
  L.push([2.45, 0.6, 0.08, 0, 1.75, 0.72, OD_]);
  L.push([2.45, 0.5, 0.08, 0, 1.7, -3.82, OD_]);
  L.push([2.5, 1.35, 4.55, 0, 2.75, -1.55, CAN]); // lona
  L.push([2.3, 0.12, 4.4, 0, 3.47, -1.55, shade(CAN, 0.9)]);
  for (let k = 0; k < 5; k++) L.push([2.54, 1.3, 0.06, 0, 2.75, -3.55 + k * 1.0, shade(CAN, 0.82)]); // arcos bajo la lona
  L.push([0.9, 0.9, 0.06, 0, 2.55, -3.86, shade(CAN, 0.75)]); // faldón trasero enrollado
  M813_GEO = partGeo(L);
  return M813_GEO;
}
function m813At(u, v, ry) {
  const p = AIRP(u, v),
    m = m939Covered();
  m.position.set(p[0], 0, p[1]);
  m.rotation.y = ry;
  (CUR ? CUR.group : world).add(m);
  return m;
}
/* El camión del convoy: el M939 subido, con una lona sobre la caja: arcos bajo lona oliva, frontal cerrado y el faldón trasero medio enrollado */
let TARP_GEO = null;
function mergeGeos(list) {
  const P = [],
    N = [],
    C = [],
    I = [];
  let off = 0;
  for (const gm of list) {
    const n = gm.attributes.position.count;
    P.push(...gm.attributes.position.array);
    N.push(...gm.attributes.normal.array);
    C.push(...gm.attributes.color.array);
    const ix = gm.index ? gm.index.array : [...Array(n).keys()];
    for (const i of ix) I.push(i + off);
    off += n;
  }
  const o = new T.BufferGeometry();
  o.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  o.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  o.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  o.setIndex(I);
  return o;
}
function tarpGeo() {
  if (TARP_GEO) return TARP_GEO;
  const z0 = -2.62,
    z1 = -0.33,
    hw = 0.845,
    y0 = 1.12,
    yS = 1.72,
    yT = 2.06,
    segZ = 26,
    ring = [];
  // la sección: laterales rectos y luego un techo redondeado
  ring.push([-hw, y0]);
  ring.push([-hw, yS]);
  for (let k = 1; k <= 8; k++) {
    const a = Math.PI - (k / 9) * Math.PI;
    ring.push([Math.cos(a) * hw, yS + Math.sin(a) * (yT - yS)]);
  }
  ring.push([hw, yS]);
  ring.push([hw, y0]);
  const pos = [],
    col = [],
    idx = [],
    R = ring.length;
  const CAN = [0.37, 0.38, 0.27];
  for (let s = 0; s <= segZ; s++) {
    const t = s / segZ,
      z = z0 + (z1 - z0) * t;
    const hoop = Math.abs(((t * 5) % 1) - 0.5) > 0.44 || s === 0 || s === segZ; // los cinco arcos se marcan como lomos
    const sag = hoop ? 0 : 0.035 * Math.sin(((t * 5) % 1) * Math.PI); // la lona cede un poco entre ellos
    for (let r = 0; r < R; r++) {
      const [x, y] = ring[r],
        top = y > yS - 0.01 ? (y - yS) / (yT - yS) : 0;
      pos.push(x * (1 - (hoop ? 0 : 0.012)), y - sag * top * 1.4 + (hoop ? 0.012 : 0), z);
      const f =
        (hoop ? 0.86 : 1) * (0.94 + 0.1 * Math.sin(z * 7.3 + r * 1.7) * 0.5) * (r === 0 || r === R - 1 ? 0.8 : 1);
      col.push(CAN[0] * f, CAN[1] * f, CAN[2] * f);
    }
  }
  for (let s = 0; s < segZ; s++)
    for (let r = 0; r < R - 1; r++) {
      const a = s * R + r,
        b = a + 1,
        c = a + R,
        d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  // el panel delantero, contra la cabina, cerrado
  const f0 = pos.length / 3;
  pos.push(0, y0, z1);
  col.push(...CAN.map(v => v * 0.8));
  for (let r = 0; r < R; r++) {
    pos.push(ring[r][0], ring[r][1], z1);
    col.push(...CAN.map(v => v * 0.8));
  }
  for (let r = 0; r < R - 1; r++) idx.push(f0, f0 + 1 + r, f0 + 2 + r);
  // la trasera: el faldón cerrado abajo, enrollado en un rulo por arriba
  const b0 = pos.length / 3;
  pos.push(0, y0, z0);
  col.push(...CAN.map(v => v * 0.72));
  for (let r = 0; r < R; r++) {
    const [x, y] = ring[r];
    pos.push(x, Math.min(y, 1.62), z0);
    col.push(...CAN.map(v => v * 0.72));
  }
  for (let r = 0; r < R - 1; r++) idx.push(b0, b0 + 2 + r, b0 + 1 + r);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const roll = new T.CylinderGeometry(0.11, 0.11, hw * 2 - 0.06, 8);
  roll.rotateZ(Math.PI / 2);
  roll.translate(0, 1.7, z0 - 0.06);
  const rc = [];
  for (let k = 0; k < roll.attributes.position.count; k++) rc.push(CAN[0] * 0.78, CAN[1] * 0.78, CAN[2] * 0.78);
  roll.setAttribute('color', new T.Float32BufferAttribute(rc, 3));
  const geoM = mergeGeos([geo, roll]);
  TARP_GEO = geoM;
  return geoM;
}
const TARP_MAT = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
function m939Covered() {
  const g = new T.Group();
  const t = new T.Mesh(tarpGeo(), TARP_MAT);
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  withModel('m939', M_ => {
    if (!M_.lit) {
      M_.lit = true;
      M_.mat.color.setRGB(1.8, 1.8, 1.7);
    }
    const q = lodMesh(M_.geos.body, M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
let M939W = null,
  TARPW = null;
function whiteMap(src, all) {
  const cv = document.createElement('canvas'),
    tex = new T.CanvasTexture(cv);
  tex.flipY = typeof ImageBitmap !== 'undefined' && src.image instanceof ImageBitmap ? false : src.flipY; // un ImageBitmap nunca se voltea al subirlo tex.wrapS = src.wrapS; tex.wrapT = src.wrapT; tex.anisotropy = src.anisotropy;
  const draw = () => {
    const im = src.image;
    if (!im || !im.width) {
      setTimeout(draw, 200);
      return;
    }
    cv.width = im.width;
    cv.height = im.height;
    const x = cv.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, cv.width, cv.height),
      a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255;
      if (l < 0.13 && !all) continue; // neumáticos, cristales y chasis se quedan oscuros
      const v = all ? Math.min(238, 176 + l * 230) : Math.min(242, 150 + (l - 0.13) * 260);
      a[i] = v;
      a[i + 1] = v * 0.985;
      a[i + 2] = v * 0.95;
    }
    x.putImageData(d, 0, 0);
    tex.needsUpdate = true;
  };
  draw();
  return tex;
}
function m939White() {
  const g = new T.Group();
  if (!TARPW) {
    TARPW = tarpGeo().clone();
    const c = TARPW.attributes.color;
    for (let k = 0; k < c.count; k++) {
      const l = (c.getX(k) + c.getY(k) + c.getZ(k)) / 3 / 0.34;
      c.setXYZ(k, 0.84 * l, 0.82 * l, 0.76 * l);
    }
  }
  const t = new T.Mesh(TARPW, TARP_MAT);
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  withModel('m939', M_ => {
    if (!M939W) {
      M939W = M_.mat.clone();
      M939W.map = whiteMap(M_.mat.map);
      M939W.color.setRGB(1.05, 1.05, 1.05);
    }
    const q = lodMesh(M_.geos.body, M939W);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
function planAirport() {
  const at = (u, v, fn) => {
    const p = AIRP(u, v);
    lazyAdd(p[0], p[1], fn);
  };
  // hangares (el tipo J subido), con las puertas hacia la pista: dos juntos al oeste y uno al este
  for (const [u, v] of [
    [-150, -147],
    [-112, -147],
    [150, -147]
  ])
    at(u, v, () => hangarJ(u, v));
  // terminal y torre de control
  at(25, -130, () => {
    MAT = M.PLASTER;
    rb(25, -130, 2.6, 42, 5.2, 12, 0xe6dfcc);
    rb(25, -123.9, 2.6, 38, 2, 0.1, 0x2b2925, { m: M.GLASS });
    rb(25, -130, 5.35, 43, 0.3, 13, 0xb0a690, { m: M.CONC });
    rb(25, -123.2, 4.4, 43, 0.18, 2.2, 0xc8c0b0, { m: M.CONC });
  });
  at(64, -132, () => {
    const p = AIRP(64, -132);
    MAT = M.CONC;
    rb(64, -132, 7.5, 4.2, 15, 4.2, 0xd8d0c0, { hid: 1 });
    prop('kit3', 'atct', p[0], 0, p[1], AIR_RY, 1, 0xffffff);
  }); // la torre de control subida (estilo Segunda Guerra Mundial)
  // contenedores apilados detrás de los C-130
  at(100, -140, () => {
    MAT = M.METAL;
    const cc = () => pick([0xffffff, 0xf0f0e8, 0xe4e8dc, 0xfff4e0]),
      H_ = 1.364;
    const box = (u, v, y, rot) => {
      const p = AIRP(u, v);
      rb(u, v, y + H_ / 2, 4, H_, 1.32, 0x4a5236, { hid: 1 });
      prop('kit3', 'cont', p[0], y, p[1], AIR_RY + (rot ? Math.PI : 0), 1, cc());
    };
    for (let k = 0; k < 5; k++) {
      box(88 + k * 4.6, -136.6, 0, k % 2);
      box(88 + k * 4.6, -138.6, 0, (k + 1) % 2);
    }
    for (const k of [0, 1, 3]) box(88 + k * 4.6, -136.6, H_, k % 2);
    box(92.6, -138.6, H_, 0);
  }); // los contenedores militares subidos, apilados
  // tiendas en dos bloques de cuatro
  for (const [cu, cv] of TENTB)
    for (const [a, b] of [
      [-6.5, -6.5],
      [6.5, -6.5],
      [-6.5, 6.5],
      [6.5, 6.5]
    ])
      at(cu + a, cv + b, () => tentM(cu + a, cv + b, b > 0 ? 1 : 0));
  // C-130
  for (const [u, v] of C130S) at(u, v, () => c130(u, v));
  // los helicópteros en línea, con el morro hacia la pista y los Little Birds delante
  for (let k = BHROW.fly; k < BHROW.n; k++) {
    const u = BHROW.u + k * BHROW.step,
      v = BHROW.v;
    at(u, v, () => {
      const p = AIRP(u, v);
      parkedHeli(p[0], p[1], AIR_RY);
    });
  }
  for (let k = LBROW.fly; k < LBROW.n; k++) {
    const u = LBROW.u + k * LBROW.step,
      v = LBROW.v;
    at(u, v, () => {
      const p = AIRP(u, v),
        lb = littleBird();
      lb.g.position.set(p[0], 0, p[1]);
      lb.g.rotation.y = AIR_RY;
      lb.rotor.rotation.y = k * 0.7;
      (CUR ? CUR.group : world).add(lb.g);
    });
  }
  // el convoy, de morro a cola hacia la puerta: Humvees con la M2 tripulada y camiones M813
  for (let k = 0; k < 6; k++) {
    const u = 100 + k * 9,
      v = -106,
      kind = [0, 0, 1, 0, 1, 0][k];
    at(u, v, () => {
      const o = kind ? m813At(u, v, AIR_RY + PH) : humveeAt(u, v, AIR_RY + PH);
      if (o) {
        BASE_CONVOY.push(o);
        o.visible = !BASE_CONVOY.hide;
      }
    });
  }
  // banderas: el mástil de la base junto a la terminal y otro junto a la puerta
  at(0, -122, () => {
    const p = AIRP(0, -122);
    makeFlag(p[0], p[1], 8, 0, 'us');
  });
  at(186, -92, () => {
    const p = AIRP(186, -92);
    makeFlag(p[0], p[1], 6, 0, 'us');
  });
  // perímetro: valla y concertina, una puerta con guardia en la carretera hacia la ciudad y torres de vigilancia en las esquinas
  const B_ = BASE,
    gv0 = B_.gateV - 6,
    gv1 = B_.gateV + 6;
  // la muralla: bastiones Hesco (el modelo subido) uno detrás de otro, de 1,4 unidades (2,1 m) de lado, por los tres lados
  // de tierra; el lado de la pista queda abierto y en la puerta se deja el hueco. Una caja oculta por tramo para las balas.
  const HS = 1.4,
    RUN = HS * 6;
  for (let u = B_.u0 - HS / 2; u < B_.u1 + HS / 2; u += RUN)
    at(u + RUN / 2, B_.v0, () => {
      const n = Math.min(6, Math.round((B_.u1 + HS / 2 - u) / HS));
      for (let k = 0; k < n; k++) {
        const p = AIRP(u + HS / 2 + k * HS, B_.v0);
        prop('u_hesco', 'm', p[0], 0, p[1], AIR_RY + (phs(p[0], p[1], 73) - 0.5) * 0.05, 1, 0xffffff);
      }
      MAT = M.BAG;
      rb(u + (n * HS) / 2, B_.v0, 0.66, n * HS, 1.32, HS, 0xa89a7a, { hid: 1 });
    });
  for (let u = B_.u0; u < B_.u1; u += 24) at(u + 12, B_.v0 - 2, () => wire(u, Math.min(B_.u1, u + 24), B_.v0 - 2));
  for (const us_ of [B_.u0, B_.u1])
    for (let v = B_.v0 + HS / 2; v <= B_.v1 - 4; v += RUN) {
      at(us_, v + RUN / 2, () => {
        let k0 = -1;
        for (let k = 0; k < 6; k++) {
          const vv = v + HS / 2 + k * HS;
          if (vv > B_.v1 - 4) break;
          if (us_ === B_.u1 && vv > gv0 - HS / 2 && vv < gv1 + HS / 2) continue; // el hueco de la puerta
          const p = AIRP(us_, vv);
          prop('u_hesco', 'm', p[0], 0, p[1], AIR_RY + PH + (phs(p[0], p[1], 73) - 0.5) * 0.05, 1, 0xffffff);
          MAT = M.BAG;
          rb(us_, vv, 0.66, HS, 1.32, HS, 0xa89a7a, { hid: 1 });
        }
      });
      if (!(us_ === B_.u1 && v + RUN > gv0 && v < gv1))
        at(us_ + (us_ < 0 ? -2 : 2), v + RUN / 2, () =>
          wireV(v, Math.min(v + RUN, B_.v1 - 4), us_ + (us_ < 0 ? -2 : 2))
        );
    }
  at(B_.u1, B_.gateV, () => {
    MAT = M.WOOD;
    rb(B_.u1 - 6, gv0 - 4, 1.2, 2.4, 2.4, 2.4, 0xc8c0aa);
    rb(B_.u1 - 6, gv0 - 4, 2.5, 2.8, 0.15, 2.8, 0x7a7a72, { m: M.TIN }); // garita
    MAT = M.BAG;
    rb(B_.u1 - 2, gv0 - 2, 0.5, 1.4, 1, 3, 0xb4a173);
    rb(B_.u1 - 2, gv1 + 2, 0.5, 1.4, 1, 3, 0xb4a173);
    MAT = M.METAL;
    for (let k = 0; k < 6; k++) rb(B_.u1, gv0 + 1 + k * 1.7, 1.0, 0.1, 0.1, 1.7, k % 2 ? 0xd8d4c8 : 0xb02a1c);
    rb(B_.u1, gv0 + 0.4, 0.5, 0.15, 1.0, 0.15, 0x6a6a64);
    // barreras new jersey a los dos lados de la carretera por fuera, nunca cruzándola
    jersey(B_.u1 + 4, B_.gateV - 5.6, 5, true);
    jersey(B_.u1 + 4, B_.gateV + 5.6, 5, true);
  });
  for (const [u, v] of [
    [B_.u0 + 5, B_.v0 + 5],
    [B_.u1 - 5, B_.v0 + 5],
    [B_.u0 + 5, B_.v1 - 8],
    [B_.u1 - 5, B_.v1 - 8]
  ])
    at(u, v, () => guardTower(u, v));
  taxiLines();
  // noche: balizas de pista, calles de rodaje y focos sobre la plataforma y las tiendas
  for (let u = -RWY.L + 10; u <= RWY.L - 10; u += 25)
    for (const s of [-1, 1]) {
      const p = AIRP(u, s * (RWY.W + 0.3));
      GLOWS.push([
        p[0],
        0.12,
        p[1],
        Math.abs(u) > RWY.L - 20 ? (u > 0 ? 0xff5040 : 0x50ff70) : 0xfff4dc,
        0.3,
        0.14,
        0.3
      ]);
    }
  for (const J of JOINS)
    for (const s of [-1, 1])
      for (const v of [-18, -27]) {
        const p = AIRP(J + s * 8.6, v);
        GLOWS.push([p[0], 0.1, p[1], 0x4a8aff, 0.22, 0.12, 0.22]);
      }
  for (const [u, v] of [
    [-172, -90],
    [-60, -90],
    [40, -90],
    [150, -92],
    [-90, -121],
    [100, -125],
    [180, -116]
  ]) {
    const p = AIRP(u, v);
    lazyAdd(p[0], p[1], () => {
      MAT = M.METAL;
      C(p[0], 3.5, p[1], 0.14, 7, 0x6a6a64);
      B(p[0], 7.1, p[1], 1.6, 0.5, 0.5, 0x3a3a38, { ry: AIR_RY });
      B(p[0], 0.6, p[1], 1.4, 1.2, 1, 0x6a6a4a, { ry: AIR_RY });
    });
    GLOWS.push([p[0], 7.05, p[1], 0xfff2d8, 1.4, 0.3, 0.3]);
    LIGHTSRC.push({ x: p[0], y: 6.6, z: p[1], col: 0xfff0d8, i: 2.6, d: 24, fl: 0, lamp: 1 });
  }
}
/* Suelo de la base: pista, calles de rodaje, la plataforma (solo su borde y las líneas de rodaje: nada pintado bajo los aviones ni
   los vehículos), y alrededor de las tiendas las mismas calles de tierra con rodadas que en Mogadiscio */
function airRuts(pos, across, lanes, sep) {
  let d = 9;
  for (let l = 0; l < lanes.length; l++) {
    const c = lanes[l] + Math.sin(pos * 0.21 + l * 3.1) * 0.28 + (vnoise(pos * 0.35, l * 11.3) - 0.5) * 0.5;
    d = Math.min(d, Math.abs(across - (c - sep)), Math.abs(across - (c + sep)));
  }
  return d;
}
function airHiRes(ch) {
  const [u, v] = airUV(ch.x0 + CS / 2, ch.z0 + CS / 2);
  if (TZONE && u > TZONE.u0 - 60 - CS && u < TZONE.u1 + CS && v > -CS && v < TZONE.v1 + CS) return true;
  return u > TENTA.u0 - 24 && u < TENTA.u1 + 24 && v > TENTA.v0 - 24 && v < TENTA.v1 + 24;
}
function apronConc(u, v) {
  const sl = vnoise(u * 0.3, v * 0.3),
    oil = fbm(u * 0.15 + 7, v * 0.15 + 3);
  let c = [156 - sl * 12, 152 - sl * 12, 142 - sl * 11];
  if (oil > 0.68) {
    const w = Math.min(1, (oil - 0.68) * 6) * 0.25;
    c = c.map(x => x * (1 - w));
  }
  if ((u + 400) % 9 < 0.15 || (v + 400) % 9 < 0.15) c = [c[0] - 6, c[1] - 6, c[2] - 6];
  return c;
}
/* Las líneas amarillas de rodaje con su borde negro y las barras de espera, como una malla justo encima del hormigón: las pinta un shader
   según la posición a lo ancho y a lo largo de cada tira, así se ven nítidas con cualquier zoom. Dos pasadas de las mismas tiras: primero el
   negro y luego el amarillo, para que donde se cruzan dos líneas el amarillo siga de corrido. */
function taxiLines() {
  const segs = [],
    add = (u0, v0, u1, v1, type) => segs.push([u0, v0, u1, v1, type]);
  const A = APRON,
    i = 1.3;
  for (const J of JOINS) {
    add(J, -5, J, J < 0 ? -60 : TAXI_V, 0); // eje: desde la pista, por la calle de rodaje, hasta la plataforma
    for (const s of [-1, 1]) add(J + s * 8.0, -RWY.W - 0.6, J + s * 8.0, A.v1 - i + 0.48, 0); // los bordes de la calle de rodaje, hasta el borde de la plataforma
    add(J - 6, -RWY.W - 2, J + 6, -RWY.W - 2, 1); // espera antes de la pista
  }
  add(-40, TAXI_V, A.u1 - 6, TAXI_V, 0); // la calle de rodaje de la plataforma, solo donde no hay nada aparcado
  // el borde de la plataforma, abierto donde entran las calles de rodaje
  add(A.u0 + i, A.v0 + i, A.u1 - i, A.v0 + i, 0);
  add(A.u0 + i, A.v0 + i, A.u0 + i, A.v1 - i, 0);
  add(A.u1 - i, A.v0 + i, A.u1 - i, A.v1 - i, 0);
  {
    let u = A.u0 + i;
    for (const J of JOINS.slice().sort((a, b) => a - b)) {
      if (J - 8 > u) add(u, A.v1 - i, J - 8, A.v1 - i, 0);
      u = J + 8;
    }
    if (u < A.u1 - i) add(u, A.v1 - i, A.u1 - i, A.v1 - i, 0);
  }
  const P = [],
    L = [],
    I = [];
  for (const [u0, v0, u1, v1, ty] of segs) {
    const len = Math.hypot(u1 - u0, v1 - v0),
      du = (u1 - u0) / len,
      dv = (v1 - v0) / len,
      hw = ty ? 0.8 : 0.5,
      ext = ty ? 0 : 0.48;
    const o = P.length / 3;
    for (const [t, s] of [
      [-ext, -1],
      [-ext, 1],
      [len + ext, -1],
      [len + ext, 1]
    ]) {
      const uu = u0 + du * t - dv * s * hw,
        vv = v0 + dv * t + du * s * hw,
        w = AIRP(uu, vv);
      P.push(w[0], 0.035, w[1]);
      L.push(s * hw, t, ty);
    }
    I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  g.setAttribute('aL', new T.Float32BufferAttribute(L, 3));
  g.setAttribute(
    'normal',
    new T.Float32BufferAttribute(
      new Array(P.length).fill(0).map((_, k) => (k % 3 === 1 ? 1 : 0)),
      3
    )
  );
  g.setIndex(I);
  g.computeBoundingSphere();
  const mk = pass => {
    const m = new T.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x111111,
      shininess: 8,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8 - pass * 4
    });
    m.onBeforeCompile = sh => {
      sh.vertexShader =
        'attribute vec3 aL; varying vec3 vL;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = aL;');
      sh.fragmentShader =
        'varying vec3 vL;\n' +
        sh.fragmentShader.replace(
          '#include <map_fragment>',
          `
  float a = vL.x, along = vL.y, aw = abs(a);
  #if __VERSION__ >= 300
    float px = max(fwidth(a), .004);
  #else
    float px = .03;
  #endif
  vec3 Y = vec3(.87, .70, .16), K = vec3(.11, .10, .09);
  float wear = .9 + .1 * fract(sin(dot(floor(vec2(along*1.7, a*3.0)), vec2(12.9898, 78.233))) * 43758.5453);
  ${
    pass === 0
      ? `
  float al; vec3 c = K;
  if (vL.z < .5){ al = 1.0 - smoothstep(.48 - px, .48 + px, aw); }
  else {                                       // espera: dos barras continuas del lado de la calle de rodaje y dos discontinuas del lado de la pista, sobre negro
    al = 1.0 - smoothstep(.8 - px, .8 + px, aw);
    float bar = 0.0;
    for (int k = 0; k < 4; k++){ float c0 = -.6 + float(k)*.4; float b = 1.0 - smoothstep(.09 - px, .09 + px, abs(a - c0));
      if (k >= 2) b *= step(fract(along/1.0), .55); bar = max(bar, b); }
    c = mix(K, Y*wear, bar);
  }
  diffuseColor.rgb = c; diffuseColor.a = al * .96;`
      : `
  if (vL.z > .5) discard;
  float al = 1.0 - smoothstep(.2 - px, .2 + px, aw);
  if (al <= 0.0) discard;
  diffuseColor.rgb = Y * wear; diffuseColor.a = al;`
  }
`
        );
    };
    m.customProgramCacheKey = () => 'taxi' + pass;
    const me = new T.Mesh(g, m);
    me.receiveShadow = true;
    me.renderOrder = 2 + pass;
    world.add(me);
    return me;
  };
  mk(0);
  mk(1);
}
function airGround(u, v, out) {
  const Y = [222, 178, 40],
    K = [28, 26, 22];
  const setc = c => {
    out[0] = c[0];
    out[1] = c[1];
    out[2] = c[2];
  };
  const ybl = (d, w) => {
    const a = Math.abs(d);
    if (a < w) {
      setc(Y);
      return true;
    }
    if (a < w + 0.28) {
      setc(K);
      return true;
    }
    return false;
  };
  if (Math.abs(v) < RWY.W && Math.abs(u) < RWY.L) {
    let r = 78,
      g = 77,
      b = 74;
    const cr = vnoise(u * 0.4, v * 0.4);
    r += cr * 10;
    g += cr * 10;
    b += cr * 9;
    if (Math.abs(v) < 0.45 && (((u / 10) % 2) + 2) % 2 < 1.1 && Math.abs(u) < RWY.L - 22) {
      r = g = b = 225;
    }
    if (Math.abs(Math.abs(v) - (RWY.W - 1.2)) < 0.35) {
      r = g = b = 210;
    }
    if (
      Math.abs(u) > RWY.L - 18 &&
      Math.abs(u) < RWY.L - 8 &&
      (((v / 2.2) % 2) + 2) % 2 < 1 &&
      Math.abs(v) < RWY.W - 2
    ) {
      r = g = b = 220;
    }
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = 0;
    return true;
  }
  for (const J of JOINS)
    if (Math.abs(u - J) < 9 && v <= -RWY.W && v > APRON.v1 - 6) {
      setc(apronConc(u, v));
      out[3] = 0;
      return true;
    } // las calles de rodaje: el hormigón de la plataforma
  if (u > APRON.u0 && u < APRON.u1 && v > APRON.v0 && v < APRON.v1) {
    setc(apronConc(u, v));
    out[3] = 0;
    return true;
  } // sus líneas son una malla aparte (taxiLines)
  if (u > TENTA.u0 && u < TENTA.u1 && v > TENTA.v0 && v < TENTA.v1) {
    const m = sandM(u, v, hash2(Math.floor(u * 8) * 7 + 3, Math.floor(v * 8) * 13 + 1));
    // calles de tierra de cinco unidades de ancho: entre las columnas y filas de tiendas, y alrededor de cada bloque
    let best = 9,
      onSt = false;
    const SW = 5;
    const st = (pos, across) => {
      if (across < 0 || across > SW) return;
      onSt = true;
      best = Math.min(best, airRuts(pos, across, [1.6, SW - 1.6], 0.42));
    };
    for (const [cu, cv] of TENTB) {
      for (const o of [-16.5, 0, 16.5]) st(v, u - (cu + o) + SW / 2);
      for (const o of [-16.5, 0, 16.5]) st(u, v - (cv + o) + SW / 2);
    }
    let c = onSt ? [210 * m, 192 * m, 156 * m] : [196 * m, 178 * m, 142 * m],
      h = fbm(u * 1.4 + 40, v * 1.4 + 40) * 0.07;
    if (onSt) {
      if (best < 0.17) {
        const f = 0.8 + best * 1.1;
        c = [c[0] * f, c[1] * f, c[2] * f * 0.97];
        h -= (0.17 - best) * 2.2;
      }
      const pn = fbm(u * 0.33 + 5, v * 0.33 + 9);
      if (pn > 0.66) {
        const w = Math.min(1, (pn - 0.66) * 12);
        c = [c[0] + 18 * w, c[1] + 16 * w, c[2] + 14 * w];
      }
    }
    // se funden con la arena en el borde de las filas de tiendas
    const ed = Math.min(u - TENTA.u0, TENTA.u1 - u, v - TENTA.v0, TENTA.v1 - v),
      f = clamp(ed / 4, 0, 1);
    if (f < 1) {
      const s = fbm(u * 0.1, v * 0.1),
        sc = [206 - s * 14, 186 - s * 12, 146 - s * 10];
      c = c.map((x, i) => x * f + sc[i] * (1 - f));
    }
    setc(c);
    out[3] = h;
    return true;
  }
  if (u > BASE.u0 && u < BASE.u1 && v > BASE.v0 && v < BASE.v1) {
    const n = fbm(u * 0.1, v * 0.1);
    setc([206 - n * 14, 186 - n * 12, 146 - n * 10]);
    out[3] = 0.15;
    return true;
  }
  return false;
}

function planRegion() {
  for (const v of VILLAGES) {
    const pts = [];
    for (let k = 0; k < v.n * 4 && pts.length < v.n; k++) {
      const a = rnd() * 6.28,
        d = Math.sqrt(rnd()) * v.r,
        x = v.x + Math.cos(a) * d,
        z = v.z + Math.sin(a) * d;
      if (coastS(x, z) > -26 || roadDist(x, z, ROADSEG)[0] < 5 || pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 9))
        continue;
      pts.push([x, z]);
      lazyAdd(x, z, () => smallHouse(x, z, { rot: true }));
    }
    // el pozo en medio de cada aldea
    lazyAdd(v.x, v.z, () => {
      MAT = M.STONE;
      C(v.x, 0.35, v.z, 1.0, 0.7, 0x9a9484);
      MAT = M.WOOD;
      B(v.x, 1.2, v.z, 1.8, 0.08, 0.08, 0x5a4a3a);
      B(v.x - 0.8, 0.9, v.z, 0.08, 1.0, 0.08, 0x5a4a3a);
      B(v.x + 0.8, 0.9, v.z, 0.08, 1.0, 0.08, 0x5a4a3a);
      if (v.n >= 22) pick([0, 0]);
    }); // ya no hay mezquita en las aldeas (dejo la tirada para que el resto de la aldea no cambie)
  }
  // recintos sueltos a lo largo de la carretera del aeropuerto
  const r0 = ROADS[0];
  for (let k = 1; k < r0.pts.length - 2; k++) {
    const a = r0.pts[k],
      b = r0.pts[k + 1];
    for (let t = 0.1; t < 1; t += 0.13) {
      const x = a[0] + (b[0] - a[0]) * t,
        z = a[1] + (b[1] - a[1]) * t,
        side = rnd() < 0.5 ? -1 : 1,
        L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const off = rr(12, 30),
        hx = x - ((b[1] - a[1]) / L) * side * off,
        hz = z + ((b[0] - a[0]) / L) * side * off;
      if (rnd() < 0.55 && coastS(hx, hz) < -28 && !(hx >= -6 && hz >= -6 && hx < W + 6 && hz < H + 6))
        lazyAdd(hx, hz, () => smallHouse(hx, hz, { rot: true }));
    }
  }
}
