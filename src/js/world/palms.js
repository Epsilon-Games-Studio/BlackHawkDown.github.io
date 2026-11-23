/* ====================================================================================================
 * world/palms.js
 *
 * Las palmeras: tres modelos (tronco, bulbo de raíz y 42 tarjetas de hoja cada uno) que comparten textura. Se mueven en la GPU: el tronco
 * se dobla con el viento y se aparta de un rotor que pase por encima, las hojas cabecean y ondean, y bajo un helicóptero se sacuden y se aplastan.
 * ================================================================================================== */

'use strict';

const PALM_META = [
  { c: [-0.165, 5.834, -0.298], R: 1.596, top: 6.449 },
  { c: [0.231, 5.26, 0.004], R: 1.593, top: 6.079 },
  { c: [0.214, 6.648, -0.245], R: 1.516, top: 7.378 }
];
let PALM_GEO = null,
  PALM_MAT = null,
  PALM_DEP = null,
  palmWait = [];
function palmReady(fn) {
  if (PALM_GEO) fn();
  else palmWait.push(fn);
}
const PALM_VS = `
  #ifdef USE_INSTANCING
  mat4 pm_ = modelMatrix * instanceMatrix;
  #else
  mat4 pm_ = modelMatrix;
  #endif
  vec3 ip_ = pm_[3].xyz; mat3 im_ = mat3(pm_); float sc_ = length(im_[0]);
  float ph_ = ip_.x*1.7 + ip_.z*2.3;
  vec2 wd_ = vec2(.92, .39);
  vec2 bend_ = wd_*uWind*(.03 + .018*sin(uTime*.9 + ph_)) + vec2(-wd_.y, wd_.x)*uWind*.012*sin(uTime*.63 + ph_*1.3);
  float wash_ = 0.0; vec2 away_ = vec2(0.0);
  for (int k=0;k<3;k++){ vec2 d = ip_.xz - uHeli[k].xz; float r = length(d) + .001;
    float w = uHeli[k].w*(1.0 - smoothstep(4.0, 22.0, r))*(1.0 - smoothstep(12.0, 40.0, uHeli[k].y - ip_.y));
    wash_ += w; away_ += d/r*w; }
  wash_ = min(wash_, 1.0);
  bend_ += away_*(.08 + .045*sin(uTime*6.0 + ph_));
  transformed += (vec3(bend_.x, 0.0, bend_.y) * im_) / sc_ * transformed.y * aPalm.x;
  if (aPalm.y > 0.0){
    float f = aPalm.y, q = position.x*1.3 + position.z*1.1;
    vec3 wdL = (vec3(wd_.x, 0.0, wd_.y) * im_) / sc_, awL = (vec3(away_.x, 0.0, away_.y) * im_) / sc_;
    transformed.y += f*(uWind*.08*sin(uTime*2.3 + ph_ + q) + wash_*(.28*sin(uTime*15.0 + ph_ + q*2.0) - .32));
    transformed += f*(wdL*uWind*(.09 + .05*sin(uTime*1.7 + ph_ + q)) + awL*(.26 + .12*sin(uTime*11.0 + q*1.7)));
  }`;
function palmShader(sh, lit) {
  Object.assign(sh.uniforms, LAUN_U);
  sh.vertexShader =
    'uniform float uTime; uniform float uWind; uniform vec4 uHeli[3]; attribute vec2 aPalm;\n' +
    sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + PALM_VS);
  // la cara de atrás de una hoja coge la luz de la de delante, para que la copa no enseñe tarjetas negras
  if (lit)
    sh.fragmentShader = sh.fragmentShader
      .replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront')
      .replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront');
}
(function () {
  const bin = n => assetBin(n);
  const tex = new Promise((res, rej) => new T.TextureLoader().load(assetPng('palms'), res, undefined, rej));
  Promise.all([bin('palm1'), bin('palm2'), bin('palm3'), tex])
    .then(([b1, b2, b3, map]) => {
      map.flipY = false;
      map.magFilter = T.LinearFilter;
      map.minFilter = T.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.anisotropy = 4;
      map.needsUpdate = true;
      PALM_GEO = [b1, b2, b3].map((b, v) => {
        const P_ = PALM_META[v],
          g = parseHeli(b),
          parts = [g.trunk, g.fronds];
        let nv = 0,
          ni = 0;
        for (const q of parts) {
          nv += q.attributes.position.count;
          ni += q.index.count;
        }
        const pos = new Float32Array(nv * 3),
          nor = new Float32Array(nv * 3),
          uv = new Float32Array(nv * 2),
          ap = new Float32Array(nv * 2),
          idx = new Uint16Array(ni);
        let o = 0,
          oi = 0;
        parts.forEach((q, pi) => {
          const pa = q.attributes.position,
            na = q.attributes.normal,
            ua = q.attributes.uv,
            ia = q.index.array;
          for (let i = 0; i < pa.count; i++) {
            const x = pa.getX(i),
              y = pa.getY(i),
              z = pa.getZ(i),
              k = o + i;
            pos[k * 3] = x;
            pos[k * 3 + 1] = y;
            pos[k * 3 + 2] = z;
            nor[k * 3] = na.getX(i) / 127;
            nor[k * 3 + 1] = na.getY(i) / 127;
            nor[k * 3 + 2] = na.getZ(i) / 127; // guardado como bytes y shorts: getX devuelve los valores en crudo
            uv[k * 2] = ua.getX(i) / 65535;
            uv[k * 2 + 1] = ua.getY(i) / 65535;
            ap[k * 2] = Math.min(1.4, Math.pow(Math.max(0, y) / P_.c[1], 2)); // cuánto arrastra a este punto la curva del tronco
            ap[k * 2 + 1] = pi
              ? Math.pow(Math.min(1, Math.hypot(x - P_.c[0], y - P_.c[1], z - P_.c[2]) / P_.R), 1.5)
              : 0; // lo suelta que está una hoja aquí
          }
          for (let i = 0; i < ia.length; i++) idx[oi + i] = ia[i] + o;
          o += pa.count;
          oi += ia.length;
        });
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
        geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
        geo.setAttribute('aPalm', new T.BufferAttribute(ap, 2));
        geo.setIndex(new T.BufferAttribute(idx, 1));
        geo.computeBoundingSphere();
        return geo;
      });
      PALM_MAT = new T.MeshLambertMaterial({ map, alphaTest: 0.5, side: T.DoubleSide });
      PALM_MAT.onBeforeCompile = sh => palmShader(sh, true);
      PALM_MAT.customProgramCacheKey = () => 'palmL';
      PALM_DEP = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5, side: T.DoubleSide });
      PALM_DEP.onBeforeCompile = sh => palmShader(sh, false);
      PALM_DEP.customProgramCacheKey = () => 'palmD';
      const w = palmWait;
      palmWait = [];
      for (const f of w) f();
    })
    .catch(() => {});
})();
function palmMesh(L_, v, parent) {
  const m = new T.InstancedMesh(PALM_GEO[v], PALM_MAT, L_.length);
  m.castShadow = true;
  m.receiveShadow = true;
  m.customDepthMaterial = PALM_DEP;
  m.frustumCulled = false;
  L_.forEach((e, k) => {
    dummy.position.set(e.x, 0, e.z);
    dummy.rotation.set(0, e.ry, 0);
    dummy.scale.setScalar(e.s);
    dummy.updateMatrix();
    m.setMatrixAt(k, dummy.matrix);
    m.setColorAt(k, tmpCol.setRGB(e.c, e.c * 0.985, e.c * 0.955));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  parent.add(m);
  return m;
}
// ninguna palmera sale de un edificio: el tronco y un poco de espacio alrededor tienen que estar libres de celdas construidas
function palmFree(x, z) {
  for (const [dx, dz] of [
    [0, 0],
    [0.45, 0],
    [-0.45, 0],
    [0, 0.45],
    [0, -0.45],
    [0.32, 0.32],
    [-0.32, 0.32],
    [0.32, -0.32],
    [-0.32, -0.32]
  ]) {
    const i = Math.floor(x + dx),
      j = Math.floor(z + dz);
    if (inB(i, j) && grid[idx(i, j)] === 1) return false;
  }
  return true;
}
function buildPalms(ch) {
  ch.PM = ch.PM.filter(e => palmFree(e.x, e.z));
  if (!ch.PM.length) return;
  palmReady(() => {
    if (!ch.group) return;
    for (let v = 0; v < 3; v++) {
      const L_ = ch.PM.filter(e => e.v === v);
      if (L_.length) palmMesh(L_, v, ch.group);
    }
  });
}
function makeFlag(x, z, poleH, base, kind) {
  B(x, base + poleH / 2, z, 0.06, poleH, 0.06, 0x8a8a84);
  const cv = document.createElement('canvas');
  cv.width = 48;
  cv.height = 32;
  const c = cv.getContext('2d');
  if (kind === 'us') {
    for (let k = 0; k < 13; k++) {
      c.fillStyle = k % 2 ? '#f4f0e8' : '#b22234';
      c.fillRect(0, (k * 32) / 13, 48, 32 / 13 + 0.5);
    }
    c.fillStyle = '#3c3b6e';
    c.fillRect(0, 0, 20, 17.2);
    c.fillStyle = '#f4f0e8';
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < 6; q++) c.fillRect(1.6 + q * 3.1 + (r % 2) * 1.5, 1.6 + r * 3.2, 1, 1);
  } else {
    c.fillStyle = '#4a8ad0';
    c.fillRect(0, 0, 48, 32);
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        r = k % 2 ? 4 : 10;
      c.lineTo(24 + Math.cos(a) * r, 16 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  }
  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.NearestFilter;
  const fs_ = kind === 'us' ? 1.6 : 1,
    geo = new T.PlaneGeometry(1.4 * fs_, 0.9 * fs_, 12, 4);
  geo.translate(0.7 * fs_, 0, 0);
  const m = new T.Mesh(
    geo,
    new T.MeshPhongMaterial({ map: tex, side: T.DoubleSide, specular: 0x000000, shininess: 1 })
  );
  m.position.set(x + 0.03, base + poleH - 0.5, z);
  m.castShadow = true;
  world.add(m);
  flags.push({ m, base: Float32Array.from(geo.attributes.position.array), ph: rnd() * 6 });
}
