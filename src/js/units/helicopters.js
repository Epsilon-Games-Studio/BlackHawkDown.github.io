/* ====================================================================================================
 * units/helicopters.js
 *
 * Los helicópteros: el Black Hawk procedural (fuselaje por secciones) que hace de reserva y el modelo real
 * del UH-60, con su cargador (parseHeli lee el formato binario HELI que usan todos los modelos subidos).
 * ================================================================================================== */

/* MH-60 Black Hawk: fuselaje por secciones en metros (1 unidad = 1,5 m), morro hacia +z */
function catm(p0, p1, p2, p3, t) {
  const t2 = t * t,
    t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function loftGeo(st, seg, colFn, step) {
  const rings = [];
  for (let s = 0; s < st.length - 1; s++) {
    const a = st[Math.max(0, s - 1)],
      b = st[s],
      c = st[s + 1],
      d = st[Math.min(st.length - 1, s + 2)];
    const n = Math.max(1, Math.ceil((b.z - c.z) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n,
        f = key => catm(a[key] || 0, b[key] || 0, c[key] || 0, d[key] || 0, t);
      rings.push({
        z: b.z + (c.z - b.z) * t,
        w: Math.max(0.01, f('w')),
        h: Math.max(0.01, f('h')),
        y: f('y'),
        x: f('x'),
        p: Math.max(2, f('p'))
      });
    }
  }
  const Lr = st[st.length - 1];
  rings.push({ z: Lr.z, w: Lr.w, h: Lr.h, y: Lr.y, x: Lr.x || 0, p: Lr.p });
  const pos = [],
    col = [],
    ind = [],
    C = new T.Color();
  for (const r of rings) {
    const ex = 2 / r.p;
    for (let i = 0; i < seg; i++) {
      const an = (i / seg) * Math.PI * 2,
        c = Math.cos(an),
        s = Math.sin(an);
      const x = r.x + (r.w / 2) * Math.sign(c) * Math.pow(Math.abs(c), ex),
        y = r.y + (r.h / 2) * Math.sign(s) * Math.pow(Math.abs(s), ex);
      pos.push(x, y, r.z);
      C.setHex(colFn(x, y, r.z));
      col.push(C.r, C.g, C.b);
    }
  }
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < seg; i++) {
      const a = r * seg + i,
        b = r * seg + ((i + 1) % seg),
        c = (r + 1) * seg + i,
        d = (r + 1) * seg + ((i + 1) % seg);
      ind.push(a, c, b, b, c, d);
    }
  const cap = (r, flip) => {
    const ci = pos.length / 3,
      R = rings[r];
    pos.push(R.x, R.y, R.z);
    C.setHex(colFn(R.x, R.y, R.z));
    col.push(C.r, C.g, C.b);
    for (let i = 0; i < seg; i++) {
      const a = r * seg + i,
        b = r * seg + ((i + 1) % seg);
      if (flip) ind.push(ci, b, a);
      else ind.push(ci, a, b);
    }
  };
  cap(0, false);
  cap(rings.length - 1, true);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  return geo;
}
const heliMat = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x101010, shininess: 12, side: T.DoubleSide });
const OLV = 0x3d4235,
  OLV2 = 0x353a2e,
  GLS = 0x1b252b,
  HDK = 0x1b1c1a;
function fusCol(x, y, z) {
  const ax = Math.abs(x);
  if (z > 4.65 && z < 6.25 && y > 1.78) {
    if (Math.abs(z - 5.42) < 0.05 || ax < 0.05 || (z > 5.95 && y > 2.3)) return 0x2e3329;
    return GLS;
  }
  if (z > 5.5 && z < 6.35 && y > 1.05 && y < 1.5 && ax > 0.32) return GLS;
  if (z > 3.95 && z < 4.7 && y > 1.85 && y < 2.65 && ax > 0.95) return GLS;
  if (z > 3.15 && z < 3.9 && y > 1.9 && y < 2.55 && ax > 1.0) return 0x101214;
  if (z > 0.6 && z < 2.95 && y > 1.05 && y < 2.8 && ax > 1.0) return y < 1.2 ? 0x2a2c28 : 0x141618;
  if (z > -0.9 && z < 0.35 && y > 2.1 && y < 2.55 && ax > 1.0) return GLS;
  for (const k of [3.05, 0.5, -1.45, -3.3, -6.2]) if (Math.abs(z - k) < 0.045) return 0x30352a;
  if (y < 1.05) return 0x363b2f;
  return (Math.floor(z * 1.3) + (y > 2.2 ? 1 : 0)) & 1 ? OLV : 0x3a3f32;
}
/* El modelo real del UH-60 (uh60.txt = geometría en base64, uh60.png = textura, junto a la página), se carga una vez. En metros, morro +z, y hacia arriba.
   El helicóptero procedural de arriba se queda de reserva hasta que llega (o si no se puede cargar). */
let heliAsset = null;
const HELI_HUB = [0, 0, 2.296],
  HELI_TAIL = [-0.398, 3.787, -7.589];
function parseHeli(buf) {
  const dv = new DataView(buf);
  let o = 8;
  const n = dv.getUint32(4, true),
    out = {};
  for (let p = 0; p < n; p++) {
    const l = dv.getUint8(o);
    o += 1;
    const name = String.fromCharCode(...new Uint8Array(buf, o, l));
    o += l;
    const nv = dv.getUint32(o, true),
      ni = dv.getUint32(o + 4, true);
    o += 8;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(buf.slice(o, o + nv * 12)), 3));
    o += nv * 12;
    geo.setAttribute('normal', new T.BufferAttribute(new Int8Array(buf.slice(o, o + nv * 3)), 3, true));
    o += nv * 3;
    geo.setAttribute('uv', new T.BufferAttribute(new Uint16Array(buf.slice(o, o + nv * 4)), 2, true));
    o += nv * 4;
    if (nv < 65536) {
      geo.setIndex(new T.BufferAttribute(new Uint16Array(buf.slice(o, o + ni * 2)), 1));
      o += ni * 2 + (ni % 2 ? 2 : 0);
    } else {
      geo.setIndex(new T.BufferAttribute(new Uint32Array(buf.slice(o, o + ni * 4)), 1));
      o += ni * 4;
    }
    o += (4 - (o % 4)) % 4;
    out[name] = geo;
  }
  return out;
}
function loadHeliAsset() {
  const bin = assetTxt('uh60').then(t => {
    const s = atob(t.trim()),
      u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u.buffer;
  });
  const tex = new Promise((res, rej) => new T.TextureLoader().load(assetPng('uh60'), res, undefined, rej));
  Promise.all([bin, tex])
    .then(([buf, map]) => {
      const geos = parseHeli(buf);
      geos['main rotor prop'].translate(-HELI_HUB[0], -HELI_HUB[1], -HELI_HUB[2]);
      geos['TAIL ROTOR'].translate(-HELI_TAIL[0], -HELI_TAIL[1], -HELI_TAIL[2]);
      map.magFilter = T.LinearFilter;
      map.minFilter = T.LinearMipmapLinearFilter;
      map.anisotropy = 8;
      const mat = new T.MeshPhongMaterial({
        map,
        alphaTest: 0.5,
        side: T.DoubleSide,
        specular: 0x161616,
        shininess: 18
      });
      heliAsset = { geos, mat };
      const wt = heliWaiters;
      heliWaiters = [];
      for (const f of wt) f();
    })
    .catch(() => {});
}
function fitHeliModel(h) {
  if (!heliAsset || h.real) return;
  const { geos, mat } = heliAsset;
  const mk = (geo, parent) => {
    const m = lodMesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const real = new T.Group();
  h.g.add(real);
  mk(geos['Fuselage'], real);
  mk(geos['Door open'], real);
  const rotor = new T.Group();
  rotor.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]);
  real.add(rotor);
  mk(geos['main rotor prop'], rotor);
  const tail = new T.Group();
  tail.position.set(HELI_TAIL[0], HELI_TAIL[1], HELI_TAIL[2]);
  real.add(tail);
  mk(geos['TAIL ROTOR'], tail);
  rotor.rotation.y = h.rotor.rotation.y;
  h.proc.visible = false;
  h.rotor = rotor;
  h.tail = tail;
  h.real = real;
  h.beacon.position.set(0, 4.3, -1.2);
}
loadHeliAsset();
function makeHeli(o) {
  heli = makeHeliObj();
  Object.assign(heli, { a: rnd() * 6, R: o.R || 27, cx: o.x, cz: o.z, alt: o.alt || 15.5, w: (2 * Math.PI) / 95 });
}
function makeHeliObj() {
  const g = new T.Group();
  world.add(g);
  REFL.push(g);
  const proc = new T.Group();
  g.add(proc);
  const add = (geo, mat) => {
    const m = new T.Mesh(geo, mat || heliMat);
    m.castShadow = true;
    m.receiveShadow = true;
    proc.add(m);
    return m;
  };
  add(
    loftGeo(
      [
        { z: 6.78, w: 0.22, h: 0.22, y: 1.52, p: 2 },
        { z: 6.55, w: 0.95, h: 0.9, y: 1.5, p: 2.2 },
        { z: 6.1, w: 1.55, h: 1.45, y: 1.6, p: 2.6 },
        { z: 5.4, w: 1.95, h: 1.95, y: 1.85, p: 3.2 },
        { z: 4.6, w: 2.15, h: 2.15, y: 1.95, p: 4 },
        { z: 3.6, w: 2.3, h: 2.1, y: 1.95, p: 5 },
        { z: 0.5, w: 2.36, h: 2.1, y: 1.95, p: 5.5 },
        { z: -1.0, w: 2.25, h: 2.0, y: 2.0, p: 5 },
        { z: -2.2, w: 1.75, h: 1.55, y: 2.2, p: 4 },
        { z: -3.3, w: 1.05, h: 1.05, y: 2.45, p: 2.8 },
        { z: -5.5, w: 0.8, h: 0.85, y: 2.6, p: 2.3 },
        { z: -8.0, w: 0.62, h: 0.7, y: 2.8, p: 2.2 },
        { z: -9.25, w: 0.5, h: 0.6, y: 2.9, p: 2.2 }
      ],
      40,
      fusCol,
      0.11
    )
  );
  add(
    loftGeo(
      [
        { z: 3.65, w: 0.3, h: 0.12, y: 2.95, p: 2 },
        { z: 3.2, w: 1.3, h: 0.6, y: 3.1, p: 3 },
        { z: 1.5, w: 1.6, h: 0.8, y: 3.2, p: 3.5 },
        { z: -1.0, w: 1.6, h: 0.8, y: 3.2, p: 3.5 },
        { z: -2.6, w: 1.1, h: 0.55, y: 3.05, p: 3 },
        { z: -3.9, w: 0.35, h: 0.18, y: 2.85, p: 2 }
      ],
      24,
      (x, y, z) => (Math.abs(z - 1.9) < 0.04 || Math.abs(z + 0.4) < 0.04 ? 0x30352a : OLV2),
      0.12
    )
  );
  for (const s of [-1, 1]) {
    add(
      loftGeo(
        [
          { z: 1.35, w: 0.2, h: 0.2, y: 3.18, x: s * 0.86, p: 2 },
          { z: 1.1, w: 0.72, h: 0.72, y: 3.18, x: s * 0.86, p: 2.2 },
          { z: -1.4, w: 0.82, h: 0.82, y: 3.18, x: s * 0.86, p: 2.4 },
          { z: -2.0, w: 0.6, h: 0.6, y: 3.15, x: s * 0.86, p: 2.2 }
        ],
        18,
        (x, y, z) => (z > 0.98 ? 0x0e0f0e : OLV),
        0.12
      )
    );
  }
  const L = [];
  for (const s of [-1, 1]) {
    L.push([0.55, 0.5, 0.95, s * 1.18, 3.2, -2.3, 0x2c2d29, 0, s * 0.45, 0]);
    L.push([0.36, 0.36, 0.1, s * 1.42, 3.2, -2.78, 0x0c0c0c, 0, s * 0.45, 0]);
    L.push([0.08, 1.0, 0.08, s * 1.12, 0.9, 3.35, HDK, 0, 0, s * 0.35]);
    L.push([0.06, 0.06, 1.0, s * 1.2, 0.7, 3.35, HDK]);
    L.push([0.8, 0.3, 0, s * 1.42, 0.4, 3.35, 0x141412, 0, 0, Math.PI / 2, 'c']);
    L.push([0.4, 0.32, 0, s * 1.43, 0.4, 3.35, 0x3a3c36, 0, 0, Math.PI / 2, 'c']);
    L.push([0.05, 1.62, 2.0, s * 1.21, 1.95, -0.15, OLV]);
    L.push([0.055, 0.42, 0.6, s * 1.215, 2.3, -0.2, GLS]);
    L.push([0.18, 0.18, 0.36, s * 1.22, 2.18, 3.5, HDK]);
    L.push([0.12, 0.75, 0, s * 1.42, 2.16, 3.86, 0x0e0e0e, Math.PI / 2, s * 0.5, 0, 'c', 1, null, 'YXZ']);
    L.push([0.03, 0.03, 0.9, s * 0.45, 1.85, 6.45, HDK]);
    L.push([0.06, 0.06, 0.06, s * 1.12, 1.3, 5.6, s > 0 ? 0x2a8a3a : 0xb02020]);
  }
  L.push(
    [0.35, 0.13, 0, 0, 0.32, -8.25, HDK, 0, 0, Math.PI / 2, 'c'],
    [0.07, 0.5, 0.07, 0, 0.58, -8.25, HDK],
    [0.06, 0.55, 0.1, 0, 3.2, 5.0, HDK, 0.5],
    [0.06, 0.45, 0.1, 0, 0.78, 6.0, HDK, -0.5]
  );
  L.push(
    [0.3, 0.15, 0.3, 0, 0.86, 4.6, 0x8a8c84, 0, 0, 0, 's'],
    [0.03, 0.95, 0.03, 0.25, 3.55, -4.2, HDK, -0.7],
    [0.03, 0.6, 0.03, 0, 0.6, -2.5, HDK]
  );
  L.push(
    [4.5, 0.08, 1.0, 0, 2.78, -9.35, OLV],
    [0.55, 0.75, 0, 0, 3.78, 0.25, HDK, 0, 0, 0, 'c'],
    [0.12, 0.14, 0.12, 0, 3.42, -1.3, 0xc0281a]
  );
  L.push([0.55, 0.12, 0.3, -0.32, 5.0, -9.6, 0xd8d4c8], [0.55, 0.12, 0.3, 0.32, 5.0, -9.6, 0xd8d4c8]);
  add(partGeo(L));
  // pilón de cola
  const sh = new T.Shape();
  sh.moveTo(-7.3, 2.7);
  sh.lineTo(-8.9, 5.15);
  sh.lineTo(-9.55, 5.2);
  sh.lineTo(-9.75, 4.6);
  sh.lineTo(-9.45, 3.6);
  sh.lineTo(-9.2, 2.7);
  const pg = new T.ExtrudeGeometry(sh, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1
  });
  pg.rotateY(-Math.PI / 2);
  pg.translate(0.16, 0, 0);
  const pc = [];
  for (let i = 0; i < pg.attributes.position.count; i++) pc.push(0.24, 0.26, 0.2);
  pg.setAttribute('color', new T.Float32BufferAttribute(pc, 3));
  add(pg);
  // rotor principal
  const rotor = new T.Group();
  rotor.position.set(0, 4.18, 0.25);
  proc.add(rotor);
  const RB = [
    [0.95, 0.22, 0, 0, 0, 0, HDK, 0, 0, 0, 'c'],
    [0.45, 0.3, 0, 0, 0.2, 0, 0x262624, 0, 0, 0, 'c']
  ];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2,
      cs = Math.cos(a),
      sn = -Math.sin(a);
    RB.push([0.75, 0.16, 0.22, cs * 0.62, 0, sn * 0.62, 0x2a2b28, 0, a, 0]);
    RB.push([6.9, 0.07, 0.53, cs * 4.35, -0.05, sn * 4.35, 0x272926, 0, a, 0]);
    RB.push([0.38, 0.075, 0.54, cs * 7.6, -0.08, sn * 7.6, 0xd2cfc2, 0, a, 0]);
    RB.push([0.45, 0.07, 0.36, cs * 8.0, -0.09, sn * 8.0 - 0.06, 0x272926, 0, a + 0.35, 0]);
  }
  const rm = new T.Mesh(partGeo(RB), heliMat);
  rm.castShadow = true;
  rotor.add(rm);
  // rotor de cola en el lado derecho, inclinado
  const tail = new T.Group();
  tail.position.set(-0.35, 4.55, -9.35);
  proc.add(tail);
  const tiltG = new T.Group();
  tiltG.rotation.z = 0.35;
  tail.add(tiltG);
  const spin = new T.Group();
  tiltG.add(spin);
  const TB = [[0.22, 0.18, 0, 0, 0, 0, HDK, 0, 0, Math.PI / 2, 'c']];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    TB.push([0.05, 1.5, 0.2, -0.05, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0x262824, a, 0, 0]);
    TB.push([0.055, 0.18, 0.21, -0.05, Math.cos(a) * 1.48, Math.sin(a) * 1.48, 0xd2cfc2, a, 0, 0]);
  }
  spin.add(new T.Mesh(partGeo(TB), heliMat));
  const beacon = new T.PointLight(0xff3020, 0, 7, 2);
  beacon.position.set(0, 3.5, -1.3);
  g.add(beacon);
  g.scale.setScalar(1 / 1.5);
  const h = { g, proc, rotor, tail: spin, beacon, real: null };
  if (heliAsset) fitHeliModel(h);
  else heliWaiters.push(() => fitHeliModel(h));
  return h;
}
