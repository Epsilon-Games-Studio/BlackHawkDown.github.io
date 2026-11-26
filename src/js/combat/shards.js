/* ====================================================================================================
 * combat/shards.js
 *
 * Esquirlas: la mampostería rota sale volando en terrones, astillas y lascas irregulares (tres formas dentadas, cada pieza escalada
 * a su manera), cae, rebota y se queda donde aterriza; cuando el pool se llena se van primero las más viejas
 * ================================================================================================== */

const SHN = 1500;
let SHD = null;
function jagGeo(base, amp, sx, sy, sz, seed) {
  let sd = seed;
  const rn = () => {
    sd = (sd * 16807) % 2147483647;
    return sd / 2147483647;
  };
  const g = base.index ? base.toNonIndexed() : base,
    P_ = g.attributes.position,
    off = new Map();
  for (let i = 0; i < P_.count; i++) {
    const k = P_.getX(i).toFixed(3) + ',' + P_.getY(i).toFixed(3) + ',' + P_.getZ(i).toFixed(3);
    if (!off.has(k)) off.set(k, [1 + (rn() - 0.5) * 2 * amp, 1 + (rn() - 0.5) * 2 * amp, 1 + (rn() - 0.5) * 2 * amp]);
    const o = off.get(k);
    P_.setXYZ(i, P_.getX(i) * o[0] * sx, P_.getY(i) * o[1] * sy, P_.getZ(i) * o[2] * sz);
  }
  g.computeVertexNormals();
  return g;
}
function initShards() {
  if (SHD) for (const v of SHD.v) if (v.mesh.parent) v.mesh.parent.remove(v.mesh);
  const mat = new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x000000, shininess: 1, flatShading: true });
  const geos = [
    jagGeo(new T.IcosahedronGeometry(0.62, 0), 0.32, 1, 0.8, 1.1, 11),
    jagGeo(new T.TetrahedronGeometry(0.8, 0), 0.25, 1.1, 0.75, 1.4, 23),
    jagGeo(new T.IcosahedronGeometry(0.6, 0), 0.28, 1.25, 0.32, 1, 37),
    jagGeo(new T.OctahedronGeometry(0.62, 0), 0.3, 0.8, 0.6, 1.5, 53)
  ];
  SHD = {
    v: geos.map(g => {
      const mesh = new T.InstancedMesh(g, mat, SHN);
      mesh.frustumCulled = false;
      mesh.castShadow = gfxQ().dsh;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      const L = [];
      for (let k = 0; k < SHN; k++) {
        L.push({ on: false });
        mesh.setMatrixAt(k, ZERO_M);
        mesh.setColorAt(k, tmpCol.setHex(0xffffff));
      }
      world.add(mesh);
      return { mesh, L, head: 0, dirty: true };
    })
  };
}
function spawnShard(x, y, z, vx, vy, vz, s, col, flat, rest) {
  if (!SHD) return null;
  const vi = flat ? 2 : [0, 0, 1, 3][ri(4)],
    V = SHD.v[vi],
    k = V.head;
  V.head = (V.head + 1) % SHN;
  const c = V.L[k];
  Object.assign(c, {
    on: true,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    rx: rnd() * 6,
    ry: rnd() * 6,
    rz: rnd() * 6,
    wx: rr(-14, 14),
    wy: rr(-14, 14),
    wz: rr(-14, 14),
    sx: s * rr(0.55, 1.35),
    sy: s * rr(0.45, 1.1),
    sz: s * rr(0.55, 1.4),
    t: 0,
    rest: !!rest,
    life: s < 0.05 ? rr(14, 22) : 1e9
  });
  if (rest) {
    const fl = Math.max(0, floorAt(x, z, y + 1));
    c.y = fl + c.sy * 0.25;
    c.rx = rr(-0.5, 0.5);
    c.rz = rr(-0.5, 0.5);
  }
  V.mesh.setColorAt(k, tmpCol.setHex(col));
  V.mesh.instanceColor.needsUpdate = true;
  V.dirty = true;
  return c;
}
function updShards(dt) {
  if (!SHD) return;
  for (const V of SHD.v) {
    let any = V.dirty;
    V.dirty = false;
    for (let k = 0; k < SHN; k++) {
      const c = V.L[k];
      if (!c.on) continue;
      if (!c.rest) {
        any = true;
        c.t += dt;
        c.vy -= 9.5 * dt;
        const nx = c.x + c.vx * dt,
          nz = c.z + c.vz * dt,
          bot = c.sy * 0.3;
        if (floorAt(nx, nz, c.y - bot) < 0) {
          c.vx *= -0.3;
          c.vz *= -0.3;
        } else {
          c.x = nx;
          c.z = nz;
        }
        c.y += c.vy * dt;
        const fl = Math.max(0, floorAt(c.x, c.z, c.y));
        if (c.y - bot < fl) {
          c.y = fl + bot;
          if (Math.abs(c.vy) < 1.2) {
            c.vy = 0;
            c.vx *= 0.5;
            c.vz *= 0.5;
            c.wx *= 0.4;
            c.wy *= 0.4;
            c.wz *= 0.4;
            if (Math.hypot(c.vx, c.vz) < 0.25) c.rest = true;
          } else {
            c.vy *= -0.28;
            c.vx *= 0.6;
            c.vz *= 0.6;
          }
        }
        c.rx += c.wx * dt;
        c.ry += c.wy * dt;
        c.rz += c.wz * dt;
      } else if (c.life < 1e8) {
        c.t += dt;
        if (c.t > c.life - 2) any = true;
      }
      if (c.t >= c.life) {
        c.on = false;
        V.mesh.setMatrixAt(k, ZERO_M);
        any = true;
        continue;
      }
      const f = c.life < 1e8 && c.t > c.life - 2 ? Math.max(0, (c.life - c.t) / 2) : 1;
      if (any || !c.rest) {
        dummy.position.set(c.x, c.y, c.z);
        dummy.rotation.set(c.rx, c.ry, c.rz);
        dummy.scale.set(c.sx * f, c.sy * f, c.sz * f);
        dummy.updateMatrix();
        V.mesh.setMatrixAt(k, G && G.roofs && c.y > CUT ? ZERO_M : dummy.matrix);
      }
    }
    if (any) V.mesh.instanceMatrix.needsUpdate = true;
  }
}
function initChunks() {
  chunkMesh = new T.InstancedMesh(
    UBOX,
    new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x000000, shininess: 1 }),
    CHN
  );
  chunkMesh.frustumCulled = false;
  chunkMesh.castShadow = gfxQ().dsh;
  chunkMesh.receiveShadow = true;
  chunkMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  CH = [];
  chHead = 0;
  dummy.position.set(0, -50, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  for (let k = 0; k < CHN; k++) {
    CH.push({ on: false });
    chunkMesh.setMatrixAt(k, dummy.matrix);
    chunkMesh.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(chunkMesh);
}
function spawnChunk(x, y, z, vx, vy, vz, s, col, shape) {
  if (shape !== 'splinter' && SHD) return spawnShard(x, y, z, vx, vy, vz, s, col, shape === 'flake');
  const k = chHead;
  chHead = (chHead + 1) % CHN;
  const c = CH[k];
  const lng = shape === 'splinter',
    flat = shape === 'flake';
  Object.assign(c, {
    on: true,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    rx: rnd() * 6,
    ry: rnd() * 6,
    rz: rnd() * 6,
    wx: rr(-16, 16),
    wy: rr(-16, 16),
    wz: rr(-16, 16),
    sx: s * (lng ? 0.3 : rr(0.6, 1.2)),
    sy: s * (flat ? 0.22 : lng ? 0.3 : rr(0.5, 1)),
    sz: s * (lng ? rr(2.2, 3.4) : rr(0.6, 1.2)),
    t: 0,
    life: rr(8, 12),
    rest: false,
    brass: false,
    col
  });
  chunkMesh.setColorAt(k, tmpCol.setHex(col));
  chunkMesh.instanceColor.needsUpdate = true;
  return c;
}
function floorAt(x, z, y) {
  const i = Math.floor(x),
    j = Math.floor(z);
  if (!inB(i, j)) return 0;
  const h = topH[idx(i, j)];
  if (h <= 0) return 0;
  return y >= h - 0.12 ? h : -1;
}
function updChunks(dt) {
  if (!chunkMesh) return;
  let any = false;
  for (let k = 0; k < CHN; k++) {
    const c = CH[k];
    if (!c.on) continue;
    any = true;
    c.t += dt;
    const bot = c.sy * 0.5;
    if (!c.rest) {
      c.vy -= 9 * dt;
      const nx = c.x + c.vx * dt,
        nz = c.z + c.vz * dt;
      if (floorAt(nx, nz, c.y - bot) < 0) {
        c.vx *= -0.3;
        c.vz *= -0.3;
      } else {
        c.x = nx;
        c.z = nz;
      }
      c.y += c.vy * dt;
      const fl = Math.max(0, floorAt(c.x, c.z, c.y - bot + 0.1));
      if (c.y - bot < fl) {
        c.y = fl + bot;
        if (Math.abs(c.vy) < 1.1) {
          c.vy = 0;
          c.vx *= 0.55;
          c.vz *= 0.55;
          c.wx *= 0.5;
          c.wy *= 0.5;
          c.wz *= 0.5;
          if (Math.hypot(c.vx, c.vz) < 0.2) {
            c.rest = true;
            c.rx = Math.round(c.rx / 1.5708) * 1.5708;
            c.rz = Math.round(c.rz / 1.5708) * 1.5708;
            c.life = Math.max(c.life, c.t + 18);
            if (!c.brass && RUB) {
              addRubble(c);
              c.on = false;
              chunkMesh.setMatrixAt(k, ZERO_M);
              continue;
            }
            if (c.brass) {
              addCasing(c.x, c.y, c.z, c.ry, c.sx, c.sz, c.col);
              impSnd('brass', c.x, c.z);
              c.on = false;
              dummy.position.set(0, -50, 0);
              dummy.scale.set(0, 0, 0);
              dummy.rotation.set(0, 0, 0);
              dummy.updateMatrix();
              chunkMesh.setMatrixAt(k, dummy.matrix);
              continue;
            }
          }
        } else {
          c.vy *= -0.3;
          c.vx *= 0.6;
          c.vz *= 0.6;
          c.wx *= 0.6;
          c.wy *= 0.6;
          c.wz *= 0.6;
        }
      }
      c.rx += c.wx * dt;
      c.ry += c.wy * dt;
      c.rz += c.wz * dt;
    }
    if (c.t >= c.life) {
      c.on = false;
      dummy.position.set(0, -50, 0);
      dummy.scale.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
    } else {
      const f = c.t > c.life - 1.5 ? (c.life - c.t) / 1.5 : 1;
      dummy.position.set(c.x, c.y - bot * (1 - f), c.z);
      dummy.rotation.set(c.rx, c.ry, c.rz);
      dummy.scale.set(c.sx * f, c.sy * f, c.sz * f);
    }
    dummy.updateMatrix();
    chunkMesh.setMatrixAt(k, dummy.matrix);
  }
  if (any) chunkMesh.instanceMatrix.needsUpdate = true;
}

/* Agujeros de bala: calcas pixel-art instanciadas sobre la superficie que recibió el impacto */
const DECN = 900;
let decMesh = null,
  decHead = 0,
  DEC = [];
const ZERO_M = new T.Matrix4().makeScale(0, 0, 0);
const HOLE_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d'),
    img = x.createImageData(16, 16),
    D = img.data;
  let sd = 77;
  const r = () => {
    sd = (sd * 1103515245 + 12345) >>> 0;
    return sd / 4294967296;
  };
  for (let j = 0; j < 16; j++)
    for (let i = 0; i < 16; i++) {
      const a = Math.atan2(j - 7.5, i - 7.5),
        d = Math.hypot(i - 7.5, j - 7.5),
        w = 0.9 * Math.sin(a * 3 + 1) + 0.6 * Math.sin(a * 5 + 2),
        p = (j * 16 + i) * 4;
      let v = -1;
      if (d < 1.9 + w * 0.3) v = 30;
      else if (d < 3.6 + w) v = 200 + r() * 55;
      else if (d < 6.2 && r() < 0.22) v = 225;
      if (v >= 0) {
        D[p] = D[p + 1] = D[p + 2] = v;
        D[p + 3] = 255;
      }
    }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter;
  t.minFilter = T.NearestFilter;
  return t;
})();
function initDecals() {
  decMesh = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshLambertMaterial({
      map: HOLE_TEX,
      alphaTest: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    }),
    DECN
  );
  decMesh.frustumCulled = false;
  decMesh.receiveShadow = true;
  decMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  DEC = [];
  decHead = 0;
  for (let k = 0; k < DECN; k++) {
    decMesh.setMatrixAt(k, ZERO_M);
    decMesh.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(decMesh);
}
function decal(h, tint, s) {
  const k = decHead;
  decHead = (decHead + 1) % DECN;
  dummy.position.set(h.x + h.nx * 0.012, h.y + h.ny * 0.012, h.z + h.nz * 0.012);
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);
  dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz);
  dummy.rotateZ(rnd() * 6.28);
  dummy.scale.set(s, s, s);
  dummy.updateMatrix();
  DEC[k] = { m: dummy.matrix.clone(), cut: !!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)), ent: h.e };
  decMesh.setMatrixAt(k, G.roofs && DEC[k].cut ? ZERO_M : DEC[k].m);
  decMesh.instanceMatrix.needsUpdate = true;
  decMesh.setColorAt(k, tmpCol.setHex(tint));
  decMesh.instanceColor.needsUpdate = true;
}
// casquillos en el suelo: un anillo de instancias que guarda los últimos disparados; brillan con la luz
const CASN = 1800;
let casMesh = null,
  casHead = 0,
  CAS = [];
// hollín: las explosiones ennegrecen el suelo y las paredes de alrededor
const SCN = 64;
let scMesh = null,
  scHead = 0,
  SCS = [];
const SOOT_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'),
    img = x.createImageData(64, 64),
    D = img.data;
  let sd = 1993;
  const r = () => {
    sd = (sd * 1103515245 + 12345) >>> 0;
    return sd / 4294967296;
  };
  const lobes = [0, 1, 2, 3, 4, 5, 6].map(() => [r() * 6.28, 0.55 + r() * 0.45]);
  for (let j = 0; j < 64; j++)
    for (let i = 0; i < 64; i++) {
      const dx = (i - 31.5) / 31.5,
        dz = (j - 31.5) / 31.5,
        d = Math.hypot(dx, dz),
        a = Math.atan2(dz, dx);
      let edge = 0.8;
      lobes.forEach(([la, lr], q) => {
        edge += 0.07 * lr * Math.cos(a * (2 + (q % 4)) - la);
      });
      // hollín pixel-art nítido: una mancha negra irregular, más parda hacia el borde, con salpicaduras más allá
      const k = 1 - Math.min(1, Math.max(0, (d - edge * 0.45) / (edge * 0.55))),
        p = (j * 64 + i) * 4,
        on = k > 0.14 + r() * 0.26 || (d < 1 && r() < 0.05);
      const v = 8 + (1 - k) * 34 + r() * 12;
      D[p] = v * 1.12;
      D[p + 1] = v * 0.98;
      D[p + 2] = v * 0.85;
      D[p + 3] = on ? 255 : 0;
    }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearFilter;
  return t;
})();
function initMarks() {
  dummy.position.set(0, -50, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  casMesh = new T.InstancedMesh(
    UBOX,
    new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x2e2818, shininess: 24 }),
    CASN
  );
  casMesh.frustumCulled = false;
  casMesh.receiveShadow = true;
  casMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  CAS = [];
  casHead = 0;
  for (let k = 0; k < CASN; k++) {
    casMesh.setMatrixAt(k, dummy.matrix);
    casMesh.setColorAt(k, tmpCol.setHex(0x8e7c52));
  }
  world.add(casMesh);
  scMesh = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshLambertMaterial({
      map: SOOT_TEX,
      alphaTest: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6
    }),
    SCN
  );
  scMesh.frustumCulled = false;
  scMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  SCS = [];
  scHead = 0;
  for (let k = 0; k < SCN; k++) {
    scMesh.setMatrixAt(k, dummy.matrix);
    scMesh.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(scMesh);
  initTraces();
}
