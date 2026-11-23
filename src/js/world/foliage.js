/* ====================================================================================================
 * world/foliage.js
 *
 * Follaje: las copas son nubes de pequeñas hojas en punta, fusionadas por chunk en una sola malla
 * ================================================================================================== */

'use strict';

const LEAF_MAT = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
const _lc = new T.Color();
let LEAF_OFF = false; // activo mientras se dibuja una copa solo para la secuencia aleatoria (ahora el árbol es un modelo)
function leafCanopy(x, y, z, rx, ry, rz, col, n) {
  const L = LEAF_OFF ? [] : (CUR || chunkFor(x, z)).LF;
  _lc.setHex(col);
  const sz = clamp((rx + rz) * 0.16, 0.2, 0.42);
  for (let k = 0; k < n; k++) {
    let px, py, pz;
    do {
      px = rr(-1, 1);
      py = rr(-1, 1);
      pz = rr(-1, 1);
    } while (px * px + py * py + pz * pz > 1);
    const top = py * 0.5 + 0.5,
      f = 0.66 + 0.44 * top + rr(-0.08, 0.08),
      yel = rnd() < 0.12 ? 0.1 : 0;
    L.push(
      x + px * rx,
      y + py * ry,
      z + pz * rz,
      sz * rr(0.75, 1.25),
      rnd() * 6.283,
      rr(-0.55, 0.55) + (1 - top) * 0.3,
      _lc.r * f + yel,
      _lc.g * f + yel * 0.8,
      _lc.b * f
    );
  }
}
function buildLeaves(ch) {
  const L = ch.LF,
    n = L.length / 9;
  if (!n) return;
  const P = new Float32Array(n * 12),
    N = new Float32Array(n * 12),
    Cc = new Float32Array(n * 12),
    I = new Uint32Array(n * 6);
  for (let k = 0; k < n; k++) {
    const o = k * 9,
      x = L[o],
      y = L[o + 1],
      z = L[o + 2],
      s = L[o + 3],
      a = L[o + 4],
      t = L[o + 5];
    const ca = Math.cos(a),
      sa = Math.sin(a),
      ct = Math.cos(t),
      st = Math.sin(t);
    const ax = ca * s,
      az = -sa * s,
      bx = sa * s * 0.42 * ct,
      by = st * s * 0.42,
      bz = ca * s * 0.42 * ct;
    const V = [
      [x - ax, y, z - az],
      [x + bx, y + by, z + bz],
      [x + ax, y, z + az],
      [x - bx, y - by, z - bz]
    ];
    const nx = -st * sa * 0.4,
      ny = ct + 0.6,
      nz = -st * ca * 0.4,
      nl = Math.hypot(nx, ny, nz);
    for (let v = 0; v < 4; v++) {
      const q = (k * 4 + v) * 3;
      P[q] = V[v][0];
      P[q + 1] = V[v][1];
      P[q + 2] = V[v][2];
      N[q] = nx / nl;
      N[q + 1] = ny / nl;
      N[q + 2] = nz / nl;
      const sh = v === 1 ? 1.08 : v === 3 ? 0.86 : 1;
      Cc[q] = L[o + 6] * sh;
      Cc[q + 1] = L[o + 7] * sh;
      Cc[q + 2] = L[o + 8] * sh;
    }
    I.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(P, 3));
  g.setAttribute('normal', new T.BufferAttribute(N, 3));
  g.setAttribute('color', new T.BufferAttribute(Cc, 3));
  g.setIndex(new T.BufferAttribute(I, 1));
  const m = new T.Mesh(g, LEAF_MAT);
  m.castShadow = true;
  m.receiveShadow = true;
  ch.group.add(m);
  ch.leaf = m;
}
const VEG_MAT = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
VEG_MAT.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, LAUN_U);
  sh.vertexShader =
    'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3]; attribute vec4 aVeg;\n' +
    sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
    vec2 rb = aVeg.xy; float hk = aVeg.z, stiff = aVeg.w;
    vec2 wd = vec2(.92, .39);
    float gust = .5 + .5*sin(uTime*1.25 - dot(rb, wd)*.42 + sin(rb.y*.11)*2.0);
    vec2 off = wd*uWind*(.07 + .2*gust*gust) + vec2(wd.y, -wd.x)*uWind*.035*sin(uTime*3.7 + rb.x*2.9 + rb.y*1.7);
    off += wd*uWind*.05*sin(uTime*6.3 + rb.x*5.1 + rb.y*3.3 + hk*2.0)*hk;
    for (int k=0;k<3;k++){ vec2 d = rb - uHeli[k].xz; float r = length(d) + .001;
      float w = uHeli[k].w*(1.0 - smoothstep(3.0, 18.0, r))*(1.0 - smoothstep(9.0, 32.0, uHeli[k].y));
      off += d/r*w*(.95 + .45*sin(uTime*19.0 + r*2.3 + rb.x*4.0) + .3*sin(uTime*31.0 + rb.y*6.0)); }
    float L = length(off), a = min(L, 1.25)*stiff*(.35 + .65*hk);
    vec2 dir = off/(L + 1e-4); float hy = transformed.y;
    transformed.xz += dir*hy*sin(a); transformed.y = hy*cos(a);`
    );
  // las dos caras de una brizna cogen la luz de su frente, para que el lado de atrás de una mata no salga negro
  sh.fragmentShader = sh.fragmentShader
    .replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront')
    .replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront');
};
const VEG_DRY = [0xc9b25c, 0xb89c4c, 0xa89048, 0xd4bc6a, 0x9c9446, 0x8f8c44, 0xb6a258],
  VEG_LUSH = [0x7a8a3a, 0x6c7c34, 0x889646, 0x94943e, 0x7e8c40];
const VEG_TWIG = [0x5a4a38, 0x665440, 0x4e4234, 0x705e48, 0x7a6a56],
  VEG_LEAF = [0x7e7c40, 0x6c6c36, 0x8c8448, 0x9a8e50, 0x60683a, 0x8e8c58];
const _vc = new T.Color();
function vegTri(V, ax, ay, az, bx, by, bz, cx, cy, cz, rx, rz, ha, hb, hc, st, col, ka, kc, nx, nz) {
  const o = V.P.length / 3;
  V.P.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  for (let q = 0; q < 3; q++) V.N.push(nx, 1, nz);
  _vc.setHex(col);
  V.C.push(_vc.r * ka, _vc.g * ka, _vc.b * ka, _vc.r * ka, _vc.g * ka, _vc.b * ka, _vc.r * kc, _vc.g * kc, _vc.b * kc);
  V.A.push(rx, rz, ha, st, rx, rz, hb, st, rx, rz, hc, st);
  V.I.push(o, o + 1, o + 2);
}
// una mata de hierba: una de las subidas (textura clara), girada y escalada, teñida de seco o de verde y más oscura en la base
const GRASS_TEX = (() => {
  const t = new T.TextureLoader().load(assetPng('grasst'));
  t.flipY = false;
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
})();
function vegGrass(V, x, z, R, lush) {
  const G_ = V.G,
    tf = GRASS_TUFTS[Math.floor(R() * GRASS_TUFTS.length)],
    hh = (0.26 + R() * 0.3) * (lush ? 1.25 : 1),
    wd = hh * (0.9 + R() * 0.45),
    a = R() * 6.283,
    ca = Math.cos(a),
    sa = Math.sin(a);
  const pal = lush && R() < 0.7 ? VEG_LUSH : VEG_DRY,
    c0 = pal[Math.floor(R() * pal.length)];
  _vc.setHex(c0);
  const tip = 1.12 + R() * 0.2,
    o = G_.P.length / 3;
  for (let q = 0; q < tf.length; q += 5) {
    const lx = tf[q] * wd,
      ly = tf[q + 1] * hh,
      lz = tf[q + 2] * wd,
      hk = Math.max(0, tf[q + 1]);
    G_.P.push(x + lx * ca + lz * sa, ly, z - lx * sa + lz * ca);
    G_.U.push(tf[q + 3], tf[q + 4]);
    G_.N.push(0, 1, 0);
    const k = 0.6 + (tip - 0.6) * Math.min(1, hk);
    G_.C.push(_vc.r * k, _vc.g * k, _vc.b * k);
    G_.A.push(x, z, hk, 1);
  }
  for (let q = 0; q < tf.length / 5; q++) G_.I.push(o + q);
}
// las matas de briznas de antes (no sirven para nada: las subidas las sustituyen)
function vegGrassOld(V, x, z, R, lush) {
  const nb = 6 + Math.floor(R() * 5),
    hh = (0.18 + R() * 0.24) * (lush ? 1.25 : 1),
    rad = 0.04 + R() * 0.08;
  const pal = lush && R() < 0.7 ? VEG_LUSH : VEG_DRY,
    c0 = pal[Math.floor(R() * pal.length)];
  for (let b = 0; b < nb; b++) {
    const a = R() * 6.283,
      r0 = rad * Math.sqrt(R()),
      bx = x + Math.cos(a) * r0,
      bz = z + Math.sin(a) * r0;
    const ld = a + (R() - 0.5) * 0.9,
      lean = 0.12 + R() * 0.5,
      h = hh * (0.55 + R() * 0.65),
      w = 0.02 + R() * 0.018;
    const dx = Math.cos(ld),
      dz = Math.sin(ld),
      px = -dz * w,
      pz = dx * w;
    const col = R() < 0.2 ? pal[Math.floor(R() * pal.length)] : c0;
    vegTri(
      V,
      bx - px,
      0,
      bz - pz,
      bx + px,
      0,
      bz + pz,
      bx + dx * Math.sin(lean) * h,
      h * Math.cos(lean),
      bz + dz * Math.sin(lean) * h,
      x,
      z,
      0,
      0,
      1,
      1,
      col,
      0.55,
      1.18 + R() * 0.24,
      dx * 0.35,
      dz * 0.35
    );
  }
}
// un arbusto seco: ramitas abiertas en abanico desde la raíz con unas pocas hojas polvorientas y espinas en las puntas; o una mata baja y enredada
function vegShrub(V, x, z, R, clump) {
  const H = clump ? 0.2 + R() * 0.16 : 0.32 + R() * 0.45,
    nt = clump ? 14 + Math.floor(R() * 8) : 8 + Math.floor(R() * 6);
  const tw = VEG_TWIG[Math.floor(R() * VEG_TWIG.length)],
    lf = VEG_LEAF[Math.floor(R() * VEG_LEAF.length)];
  for (let t = 0; t < nt; t++) {
    const a = R() * 6.283,
      lean = clump ? 0.5 + R() * 0.9 : 0.2 + R() * 0.65,
      h = H * (0.5 + R() * 0.6),
      w = 0.012 + R() * 0.01;
    const dx = Math.cos(a),
      dz = Math.sin(a),
      px = -dz * w,
      pz = dx * w,
      bx = x + dx * R() * 0.04,
      bz = z + dz * R() * 0.04;
    const tx = bx + dx * Math.sin(lean) * h,
      ty = h * Math.cos(lean),
      tz = bz + dz * Math.sin(lean) * h,
      hk = ty / H;
    vegTri(
      V,
      bx - px,
      0,
      bz - pz,
      bx + px,
      0,
      bz + pz,
      tx,
      ty,
      tz,
      x,
      z,
      0,
      0,
      hk,
      0.55,
      tw,
      0.7,
      1.05,
      dx * 0.3,
      dz * 0.3
    );
    const nl = clump ? 1 : 1 + Math.floor(R() * 3);
    for (let l = 0; l < nl; l++) {
      const f = 0.45 + R() * 0.55,
        lx = bx + (tx - bx) * f,
        ly = ty * f,
        lz = bz + (tz - bz) * f,
        s = (clump ? 0.05 : 0.07) + R() * 0.05,
        b2 = R() * 6.283;
      const ex = Math.cos(b2) * s,
        ez = Math.sin(b2) * s,
        up = s * (0.4 + R() * 0.6),
        lh = ly / H;
      vegTri(
        V,
        lx - ex * 0.5,
        ly,
        lz - ez * 0.5,
        lx + ex * 0.5,
        ly + up * 0.3,
        lz + ez * 0.5,
        lx + ez * 0.6,
        ly + up,
        lz - ex * 0.6,
        x,
        z,
        lh,
        lh,
        Math.min(1.2, lh + 0.1),
        0.55,
        R() < 0.25 ? VEG_TWIG[Math.floor(R() * VEG_TWIG.length)] : lf,
        0.95,
        1.18,
        dx * 0.4,
        dz * 0.4
      );
    }
  }
}
function vegChunk(ch) {
  const V = { P: [], N: [], C: [], A: [], I: [], G: { P: [], N: [], C: [], A: [], I: [], U: [] } };
  let vs = (Math.imul(ch.i, 2654435761) ^ Math.imul(ch.j, 40503) ^ 0x9e3779b9) >>> 0; // su propio generador aleatorio: la ciudad no se mueve
  const R = () => {
    vs = (Math.imul(vs, 1664525) + 1013904223) >>> 0;
    return vs / 4294967296;
  };
  const inGrid = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  if (inGrid)
    for (let j = Math.max(0, ch.z0); j < Math.min(H, ch.z0 + CS); j++)
      for (let i = Math.max(0, ch.x0); i < Math.min(W, ch.x0 + CS); i++) {
        const k = idx(i, j);
        if (grid[k] !== 0 || STR[k] === 2) continue;
        const gk = ground[k];
        if (gk === 3 || gk === 4 || gk === 5 || gk === 7 || gk === 10 || gk === 11) continue;
        let wx = 0,
          wz = 0,
          nW = 0;
        for (let q = 0; q < 4; q++) {
          const di = q === 0 ? 1 : q === 1 ? -1 : 0,
            dj = q === 2 ? 1 : q === 3 ? -1 : 0,
            ii = i + di,
            jj = j + dj;
          if (inB(ii, jj)) {
            const g = grid[idx(ii, jj)];
            if (g === 1 || g === 2) {
              wx += di;
              wz += dj;
              nW++;
            }
          }
        }
        const street = STR[k] === 1;
        if (street && !nW) continue;
        let pr = street ? 0.35 : gk === 0 ? (nW ? 0.85 : 0.28) : gk === 2 ? (nW ? 0.6 : 0.1) : nW ? 0.4 : 0.05;
        pr *= (0.7 + (1 - cityDc(i + 0.5, j + 0.5)) * 0.9) * (0.2 + 1.6 * vnoise(i * 0.13 + 7.1, j * 0.13 + 3.3));
        if (R() > pr) continue;
        const n = 1 + (R() < 0.6 ? 1 : 0) + (nW && !street && R() < 0.6 ? 1 : 0) + (gk === 0 && R() < 0.4 ? 1 : 0);
        for (let t = 0; t < n; t++) {
          let x = i + 0.15 + R() * 0.7,
            z = j + 0.15 + R() * 0.7;
          if (wx) x = i + 0.5 + Math.sign(wx) * (0.3 + R() * 0.15); // pegado al pie de la pared
          if (wz) z = j + 0.5 + Math.sign(wz) * (0.3 + R() * 0.15);
          const sp = street ? 0.1 : nW ? 0.2 : 0.3;
          if (R() < sp) vegShrub(V, x, z, R, R() < 0.35);
          else vegGrass(V, x, z, R, nW > 0);
        }
      }
  // el monte más allá de las calles: matas en manchas, que se aclaran hasta desaparecer en las carreteras, la playa y el aeródromo
  const tmp = [0, 0, 0, 0];
  for (let k = 0; k < 300; k++) {
    const x = ch.x0 + R() * CS,
      z = ch.z0 + R() * CS;
    if (x >= 0 && z >= 0 && x < W && z < H) continue; // dentro de la rejilla mandan las celdas
    if (R() > 0.25 + 0.9 * vnoise(x * 0.08 + 2.3, z * 0.08 + 5.9)) continue;
    if (coastS(x, z) > -28) continue;
    const [u, v] = airUV(x, z);
    if (u > BASE.u0 - 10 && u < BASE.u1 + 30 && v > BASE.v0 - 10 && v < 30) continue;
    if (u > -300 && u < 340 && v > -292 && v < 16 && airGround(u, v, tmp)) continue;
    if (TZONE && u > TZONE.u0 - 6 && u < TZONE.u1 + 6 && v > TZONE.v0 - 8 && v < TZONE.v1 + 6) continue;
    if (roadDist(x, z, ROADSEG)[0] < 1.5 || roadDist(x, z, TRACKS)[0] < 0.8) continue;
    if (VILLAGES.some(vl => Math.hypot(x - vl.x, z - vl.z) < vl.r * 0.7)) continue;
    if (R() < 0.18) vegShrub(V, x, z, R, R() < 0.4);
    else vegGrass(V, x, z, R, false);
  }
  return V;
}
const VEG_GMAT = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide, map: GRASS_TEX, alphaTest: 0.32 });
VEG_GMAT.onBeforeCompile = VEG_MAT.onBeforeCompile;
VEG_GMAT.customProgramCacheKey = () => 'vegG';
function buildVeg(ch) {
  const V = vegChunk(ch),
    G_ = V.G;
  if (G_.I.length) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(G_.P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(G_.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(G_.C, 3));
    g.setAttribute('aVeg', new T.Float32BufferAttribute(G_.A, 4));
    g.setAttribute('uv', new T.Float32BufferAttribute(G_.U, 2));
    g.setIndex(G_.P.length / 3 > 65535 ? new T.Uint32BufferAttribute(G_.I, 1) : new T.Uint16BufferAttribute(G_.I, 1));
    g.computeBoundingSphere();
    g.boundingSphere.radius += 1.5;
    const m = new T.Mesh(g, VEG_GMAT);
    m.receiveShadow = true;
    m.castShadow = false;
    ch.group.add(m);
    ch.vegG = m;
  }
  if (!V.I.length) return;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(V.P, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(V.N, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(V.C, 3));
  g.setAttribute('aVeg', new T.Float32BufferAttribute(V.A, 4));
  g.setIndex(V.P.length / 3 > 65535 ? new T.Uint32BufferAttribute(V.I, 1) : new T.Uint16BufferAttribute(V.I, 1));
  g.computeBoundingSphere();
  g.boundingSphere.radius += 1.5;
  const m = new T.Mesh(g, VEG_MAT);
  m.receiveShadow = true;
  m.castShadow = false;
  ch.group.add(m);
  ch.veg = m;
}
const _vY = new T.Vector3(0, 1, 0);
const VEH_T = ['car_topaz', 'car_kcar', 'car_wreck'],
  VEH_MAT = {};
function vehMat(t, M_) {
  if (VEH_MAT[t]) return VEH_MAT[t];
  const mask = new T.TextureLoader().load(assetPng(t + '_m'));
  mask.flipY = false;
  mask.minFilter = T.LinearFilter;
  mask.magFilter = T.LinearFilter;
  const mat = new T.MeshPhongMaterial({
    map: M_.mat.map,
    specular: 0x1c1c1a,
    shininess: 16,
    side: t === 'car_wreck' ? T.DoubleSide : T.FrontSide
  }); // el casco quemado está abierto por algunos sitios
  mat.onBeforeCompile = sh => {
    sh.uniforms.tPaint = { value: mask };
    sh.fragmentShader =
      'uniform sampler2D tPaint;\n' +
      sh.fragmentShader
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  texelColor = mapTexelToLinear( texelColor );
  #ifdef USE_COLOR
  texelColor.rgb *= mix( vec3( 1.0 ), vColor, texture2D( tPaint, vUv ).r );
  #endif
  diffuseColor *= texelColor;
#endif`
        )
        .replace('#include <color_fragment>', '');
  };
  mat.customProgramCacheKey = () => 'vehPaint';
  return (VEH_MAT[t] = mat);
}
function vehWrite(r) {
  if (!r.mesh) return;
  dummy.position.set(r.x, 0, r.z);
  dummy.rotation.set(0, r.ry, 0);
  dummy.scale.setScalar(r.dead ? 0 : 1);
  dummy.updateMatrix();
  r.mesh.setMatrixAt(r.k, dummy.matrix);
  r.mesh.instanceMatrix.needsUpdate = true;
}
function buildVeh(ch) {
  if (!ch.VH.length) return;
  for (const t of VEH_T) {
    const L_ = ch.VH.filter(r => r.t === t);
    if (!L_.length) continue;
    withModel(t, M_ => {
      if (!ch.group) return;
      const m = new T.InstancedMesh(M_.geos.body, vehMat(t, M_), L_.length);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      lodReg(m);
      L_.forEach((r, k) => {
        r.mesh = m;
        r.k = k;
        vehWrite(r);
        m.setColorAt(k, tmpCol.setHex(r.col));
      });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      ch.group.add(m);
    });
  }
}
