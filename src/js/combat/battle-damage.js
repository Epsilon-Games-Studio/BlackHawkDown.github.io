/* ====================================================================================================
 * combat/battle-damage.js
 *
 * Lo que deja un combate. Las paredes llevan la cuenta de los disparos que recibe cada tramo: primero una grieta, luego se cae el
 * enlucido y asoma el ladrillo, y al final una brecha ancha con un montón de escombro al pie; un impacto cerca de un borde le arranca un
 * trozo a la esquina. Los muretes, las pilas de cajas y los puestos se vienen abajo del todo cuando han recibido bastante. Los escombros se quedan
 * donde caen. Botas y ruedas marcan la arena, y las marcas se borran cuando las rellena el viento.
 * ================================================================================================== */

const MARKL = [];
let CRACKS = null,
  PATCHES = null,
  RUB = null,
  RUBS = [],
  rubHead = 0,
  CHIPS = null,
  CHIPL = [],
  chipHead = 0,
  WDMG = new Map(),
  WID = 0,
  FPL = null,
  TKL = null,
  TRT = 0;
const RUBN = 2600,
  CHIPN = 420;
let TKH = new Map();
const CRACK_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  let sd = 4107;
  const r = () => {
    sd = (sd * 1103515245 + 12345) >>> 0;
    return sd / 4294967296;
  };
  x.strokeStyle = '#fff';
  x.fillStyle = '#fff';
  x.lineCap = 'round';
  for (let b = 0; b < 6; b++) {
    let a = (b / 6) * 6.283 + r() * 0.7,
      px = 32,
      py = 32,
      w = 2.6;
    const n = 5 + ((r() * 4) | 0);
    for (let q = 0; q < n; q++) {
      const L = 3.5 + r() * 4;
      a += (r() - 0.5) * 1.1;
      const ex = px + Math.cos(a) * L,
        ey = py + Math.sin(a) * L;
      x.lineWidth = Math.max(1, w);
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(ex, ey);
      x.stroke();
      px = ex;
      py = ey;
      w *= 0.82;
      if (r() < 0.3) {
        let ba = a + (r() < 0.5 ? 1 : -1) * (0.6 + r() * 0.5),
          bx = px,
          by = py;
        for (let k = 0; k < 3; k++) {
          const l2 = 2.5 + r() * 3,
            fx_ = bx + Math.cos(ba) * l2,
            fy = by + Math.sin(ba) * l2;
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(bx, by);
          x.lineTo(fx_, fy);
          x.stroke();
          bx = fx_;
          by = fy;
          ba += (r() - 0.5) * 0.8;
        }
      }
    }
  }
  x.beginPath();
  x.arc(32, 32, 3, 0, 7);
  x.fill();
  const img = x.getImageData(0, 0, 64, 64),
    D = img.data;
  for (let k = 0; k < D.length; k += 4) {
    const on = D[k + 3] > 110;
    D[k] = D[k + 1] = D[k + 2] = 255;
    D[k + 3] = on ? 255 : 0;
  }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearFilter;
  return t;
})();
const PATCH_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'),
    img = x.createImageData(64, 64),
    D = img.data;
  let sd = 2281;
  const r = () => {
    sd = (sd * 1103515245 + 12345) >>> 0;
    return sd / 4294967296;
  };
  const lobes = [0, 1, 2, 3, 4, 5].map(() => [r() * 6.28, 0.5 + r() * 0.5]),
    bc = [];
  for (let k = 0; k < 80; k++) bc.push([150 + r() * 30 - 15, 92 + r() * 20 - 10, 66 + r() * 16 - 8]);
  for (let j = 0; j < 64; j++)
    for (let i = 0; i < 64; i++) {
      const dx = (i - 31.5) / 31.5,
        dz = (j - 31.5) / 31.5,
        d = Math.hypot(dx, dz),
        a = Math.atan2(dz, dx);
      let edge = 0.82;
      lobes.forEach(([la, lr], q) => {
        edge += 0.09 * lr * Math.cos(a * (2 + (q % 4)) - la);
      });
      const k = edge - d,
        p = (j * 64 + i) * 4;
      if (k < 0 && !(k > -0.12 && r() < 0.12)) {
        D[p + 3] = 0;
        continue;
      }
      const row = Math.floor(j / 6),
        bx = Math.floor((i + (row % 2) * 6) / 12),
        mortar = j % 6 === 0 || (i + (row % 2) * 6) % 12 === 0;
      let col = mortar ? [176, 160, 140] : bc[(row * 7 + bx) % 80];
      if (k < 0.09) col = [92, 72, 56];
      else if (k < 0.16 && dz < 0) col = [70, 56, 44]; // el borde roto del enlucido, más oscuro bajo su labio de arriba
      const n = 0.9 + r() * 0.2;
      D[p] = col[0] * n;
      D[p + 1] = col[1] * n;
      D[p + 2] = col[2] * n;
      D[p + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearFilter;
  return t;
})();
const BOOT_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 16, 32);
  x.fillStyle = 'rgb(150,138,122)';
  x.beginPath();
  x.ellipse(8, 11, 5.2, 9, 0, 0, 7);
  x.fill();
  x.beginPath();
  x.ellipse(8, 26, 4.2, 4.6, 0, 0, 7);
  x.fill();
  x.fillStyle = 'rgb(118,106,92)';
  for (let j = 4; j < 19; j += 3) x.fillRect(4, j, 8, 1);
  x.fillRect(5, 25, 6, 1);
  x.fillRect(5, 28, 6, 1);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  return t;
})();
const TREAD_TEX = (function () {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = 'rgb(200,190,174)';
  x.fillRect(2, 0, 12, 16);
  x.fillStyle = 'rgb(160,148,130)';
  for (let j = 0; j < 16; j += 4) {
    for (let i = 0; i < 5; i++) {
      x.fillRect(3 + i, j + (i % 4), 1, 2);
      x.fillRect(12 - i, j + (i % 4), 1, 2);
    }
  }
  x.fillStyle = 'rgb(226,218,204)';
  x.fillRect(1, 0, 1, 16);
  x.fillRect(14, 0, 1, 16);
  const t = new T.CanvasTexture(c);
  t.wrapT = T.RepeatWrapping;
  t.magFilter = T.NearestFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  return t;
})();
function markLayer(tex, n, off) {
  const mesh = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshLambertMaterial({
      map: tex,
      alphaTest: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: off,
      polygonOffsetUnits: off
    }),
    n
  );
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < n; k++) {
    mesh.setMatrixAt(k, ZERO_M);
    mesh.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(mesh);
  const L_ = { mesh, n, head: 0, list: [] };
  MARKL.push(L_);
  return L_;
}
function markAdd(L_, h, size, tint) {
  const e0 = h.e;
  if (e0 && e0.sx != null && !e0.rx && !e0.rz && Math.abs(h.ny) < 0.5) {
    _hv.set(h.x - e0.x, h.y - e0.y, h.z - e0.z);
    if (e0.qi) _hv.applyQuaternion(e0.qi);
    const hx = e0.sx / 2,
      hy = e0.sy / 2,
      hz = e0.sz / 2,
      fx = Math.abs(Math.abs(_hv.x) - hx) < 0.05,
      fz = Math.abs(Math.abs(_hv.z) - hz) < 0.05;
    if (fx || fz) {
      const hu = fx ? hz : hx,
        lo = Math.max(-hy, -e0.y);
      size = Math.min(size, hu * 2, hy - lo);
      const r = size / 2;
      if (fx) _hv.z = clamp(_hv.z, -hu + r, hu - r);
      else _hv.x = clamp(_hv.x, -hu + r, hu - r);
      _hv.y = clamp(_hv.y, lo + r, hy - r);
      if (e0.q) _hv.applyQuaternion(e0.q);
      h = { x: e0.x + _hv.x, y: e0.y + _hv.y, z: e0.z + _hv.z, nx: h.nx, ny: h.ny, nz: h.nz, e: e0 };
    }
  }
  const k = L_.head;
  L_.head = (k + 1) % L_.n;
  dummy.position.set(h.x + h.nx * 0.018, h.y + h.ny * 0.018, h.z + h.nz * 0.018);
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);
  if (Math.abs(h.ny) > 0.9) dummy.rotation.set(-Math.PI / 2, 0, rnd() * 6.28);
  else {
    dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz);
    dummy.rotateZ(rnd() * 6.28);
  }
  dummy.scale.set(size, size, 1);
  dummy.updateMatrix();
  L_.list[k] = { m: dummy.matrix.clone(), cut: !!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)), ent: h.e };
  L_.mesh.setMatrixAt(k, G && G.roofs && L_.list[k].cut ? ZERO_M : L_.list[k].m);
  L_.mesh.instanceMatrix.needsUpdate = true;
  L_.mesh.setColorAt(k, tmpCol.setHex(tint));
  L_.mesh.instanceColor.needsUpdate = true;
}
// una capa de marcas hundidas en el suelo: cada una oscurece lo que tiene debajo y se aclara al envejecer
function fadeLayer(tex, n, life) {
  const mat = new T.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: T.MultiplyBlending,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <color_fragment>',
      'diffuseColor.rgb = mix(vec3(1.0), diffuseColor.rgb, vColor.r);'
    );
  };
  mat.customProgramCacheKey = () => 'fadeMul';
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, n);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.renderOrder = 1;
  for (let k = 0; k < n; k++) {
    mesh.setMatrixAt(k, ZERO_M);
    mesh.setColorAt(k, tmpCol.setRGB(0, 0, 0));
  }
  world.add(mesh);
  return { mesh, n, head: 0, t: new Float32Array(n).fill(-1e9), life };
}
function fadeAdd(L_, x, z, yaw, w, len, y) {
  const k = L_.head;
  L_.head = (k + 1) % L_.n;
  dummy.position.set(x, y, z);
  dummy.rotation.set(-Math.PI / 2, yaw + Math.PI, 0, 'YXZ');
  dummy.scale.set(w, len, 1);
  dummy.updateMatrix();
  dummy.rotation.order = 'XYZ';
  L_.mesh.setMatrixAt(k, dummy.matrix);
  L_.mesh.instanceMatrix.needsUpdate = true;
  L_.t[k] = G ? G.t : 0;
  L_.mesh.setColorAt(k, tmpCol.setRGB(1, 1, 1));
  L_.mesh.instanceColor.needsUpdate = true;
}
function fadeTick(L_) {
  const now = G.t;
  let any = false;
  for (let k = 0; k < L_.n; k++) {
    const t0 = L_.t[k];
    if (t0 < -1e8) continue;
    const a = (now - t0) / L_.life;
    any = true;
    if (a >= 1 || a < 0) {
      L_.t[k] = -1e9;
      L_.mesh.setMatrixAt(k, ZERO_M);
      L_.mesh.instanceMatrix.needsUpdate = true;
      continue;
    }
    const v = Math.min(1, (1 - a) * 1.7);
    L_.mesh.setColorAt(k, tmpCol.setRGB(v, v, v));
  }
  if (any) L_.mesh.instanceColor.needsUpdate = true;
}
function initTraces() {
  MARKL.length = 0;
  WDMG = new Map();
  RUBS = [];
  rubHead = 0;
  CHIPL = [];
  chipHead = 0;
  CRACKS = markLayer(CRACK_TEX, 420, -5);
  PATCHES = markLayer(PATCH_TEX, 200, -3);
  RUB = new T.InstancedMesh(UBOX, new T.MeshLambertMaterial({ color: 0xffffff }), RUBN);
  RUB.frustumCulled = false;
  RUB.receiveShadow = true;
  RUB.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < RUBN; k++) {
    RUB.setMatrixAt(k, ZERO_M);
    RUB.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(RUB);
  CHIPS = new T.InstancedMesh(UBOX, new T.MeshLambertMaterial({ color: 0xffffff }), CHIPN);
  CHIPS.frustumCulled = false;
  CHIPS.receiveShadow = true;
  CHIPS.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let k = 0; k < CHIPN; k++) {
    CHIPS.setMatrixAt(k, ZERO_M);
    CHIPS.setColorAt(k, tmpCol.setHex(0xffffff));
  }
  world.add(CHIPS);
  initLife();
  FPL = fadeLayer(BOOT_TEX, 900, 46);
  TKL = fadeLayer(TREAD_TEX, 1100, 110);
  TRT = 0;
  TKH = new Map();
}
function rubbleAt(x, y, z, rx, ry, rz, sx, sy, sz, col) {
  if (!RUB) return;
  const k = rubHead;
  rubHead = (rubHead + 1) % RUBN;
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  RUBS[k] = { m: dummy.matrix.clone(), cut: y > CUT };
  RUB.setMatrixAt(k, G && G.roofs && RUBS[k].cut ? ZERO_M : RUBS[k].m);
  RUB.instanceMatrix.needsUpdate = true;
  RUB.setColorAt(k, tmpCol.setHex(col));
  RUB.instanceColor.needsUpdate = true;
}
function addRubble(c) {
  rubbleAt(c.x, c.y, c.z, c.rx, c.ry, c.rz, c.sx, c.sy, c.sz, c.col);
}
// piedras y bloques rotos lanzados alrededor de un punto (una explosión en la calle)
function blastRubble(x, z, n) {
  for (let k = 0; k < n; k++) {
    const a = rnd() * 6.283,
      d = rr(0.3, 2.4),
      px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d,
      i = Math.floor(px),
      j = Math.floor(pz);
    if (inB(i, j) && grid[idx(i, j)] === 1) continue;
    const s = rr(0.05, 0.17),
      fl = inB(i, j) ? Math.max(0, topH[idx(i, j)] < 1 ? topH[idx(i, j)] : 0) : 0;
    rubbleAt(
      px,
      fl + s * 0.3,
      pz,
      rr(-0.3, 0.3),
      rnd() * 3,
      rr(-0.3, 0.3),
      s * rr(1, 1.7),
      s * rr(0.5, 0.9),
      s * rr(1, 1.5),
      jit(pick([0x8a7c68, 0x6a5e50, 0x9d9484, 0x4a4038, 0xa0644a]), 0.08)
    );
  }
}
function clearMarksOf(set) {
  for (const L_ of MARKL) {
    let any = false;
    for (let k = 0; k < L_.list.length; k++) {
      const d = L_.list[k];
      if (d && d.ent && set.has(d.ent)) {
        L_.list[k] = null;
        L_.mesh.setMatrixAt(k, ZERO_M);
        any = true;
      }
    }
    if (any) L_.mesh.instanceMatrix.needsUpdate = true;
  }
  if (decMesh) {
    let any = false;
    for (let k = 0; k < DEC.length; k++) {
      const d = DEC[k];
      if (d && d.ent && set.has(d.ent)) {
        DEC[k] = null;
        decMesh.setMatrixAt(k, ZERO_M);
        any = true;
      }
    }
    if (any) decMesh.instanceMatrix.needsUpdate = true;
  }
  if (scMesh) {
    let any = false;
    for (let k = 0; k < SCS.length; k++) {
      const d = SCS[k];
      if (d && d.ent && set.has(d.ent)) {
        SCS[k] = null;
        scMesh.setMatrixAt(k, ZERO_M);
        any = true;
      }
    }
    if (any) scMesh.instanceMatrix.needsUpdate = true;
  }
  for (let k = 0; k < CHIPL.length; k++) {
    const d = CHIPL[k];
    if (d && set.has(d.ent)) {
      CHIPL[k] = null;
      CHIPS.setMatrixAt(k, ZERO_M);
      CHIPS.instanceMatrix.needsUpdate = true;
    }
  }
}
function coverDmg(o, d) {
  if (!o || !o.es || !o.es.length || o.dead || o.barricade || o.falling || TZONE) return;
  o.dm = (o.dm || 0) + d;
  if (o.dm < (COVER_HP[o.kind] || 1e9)) return;
  o.falling = true;
  sched.push({ at: G.t + 0.06, fn: () => collapseCover(o) });
}
function blastCover(x, z, R) {
  for (let j = Math.floor(z - R); j <= Math.floor(z + R); j++)
    for (let i = Math.floor(x - R); i <= Math.floor(x + R); i++) {
      if (!inB(i, j)) continue;
      const o = cov[idx(i, j)];
      if (o && o.es && Math.hypot(i + 0.5 - x, j + 0.5 - z) < R) coverDmg(o, 99);
    }
}
function collapseCover(o) {
  if (o.dead || !cov || cov[o.cells[0]] !== o) return;
  let cx = 0,
    cz = 0;
  for (const e of o.es) {
    cx += e.x / o.es.length;
    cz += e.z / o.es.length;
    const wood = e.m === M.WOOD,
      n = clamp(Math.round(e.sx * e.sy * e.sz * 38), 1, 9);
    for (let k = 0; k < n; k++)
      spawnChunk(
        e.x + rr(-0.45, 0.45) * Math.max(e.sx, e.sz),
        Math.max(0.1, e.y + rr(-0.4, 0.4) * e.sy),
        e.z + rr(-0.2, 0.2),
        rr(-1.2, 1.2),
        rr(0.4, 2.2),
        rr(-1.2, 1.2),
        wood ? rr(0.07, 0.14) : rr(0.09, 0.26),
        jit(shade(e.c, rr(0.8, 1)), 0.08),
        wood ? 'splinter' : null
      );
    for (let k = 0; k < n * 2; k++)
      spawnChunk(
        e.x + rr(-0.45, 0.45) * Math.max(e.sx, e.sz),
        Math.max(0.1, e.y + rr(-0.4, 0.4) * e.sy),
        e.z + rr(-0.2, 0.2),
        rr(-1.8, 1.8),
        rr(0.6, 3),
        rr(-1.8, 1.8),
        rr(0.035, 0.07),
        jit(shade(e.c, rr(0.75, 1.05)), 0.1),
        rnd() < 0.3 ? 'flake' : null
      );
  }
  const dc = o.kind === 'wall' ? 0xcbbfa6 : 0xb8a888;
  for (let k = 0; k < 26; k++)
    spawnP(
      cx + rr(-0.5, 0.5),
      rr(0.1, 0.7),
      cz + rr(-0.5, 0.5),
      rr(-0.9, 0.9),
      rr(0.2, 1.1),
      rr(-0.9, 0.9),
      rr(1.4, 3),
      rr(0.2, 0.34),
      rr(0.8, 1.5),
      jit(dc, 0.05),
      shade(dc, 1.06),
      rr(0.5, 0.8),
      0,
      0
    );
  impSnd('thud', cx, cz);
  if (typeof sfx === 'function') sfx('crash', cx, cz);
  destroyCover(o);
}
// desgaste de una pared: h es el impacto; chunks y dust son los lanzadores de quien llama, así los trozos son del color de la pared
function wallWear(h, col, brick, chunks, dust, dc) {
  const e = h.e;
  if (!e || !CRACKS || Math.abs(h.ny) > 0.5) return;
  if (!(e.m === M.PLASTER || e.m === M.CONC || e.m === M.STONE || e.m === M.BRICK)) return;
  if (e.sy < 0.5 || Math.max(e.sx, e.sz) < 0.5) return;
  const id = e.wid || (e.wid = ++WID),
    key = id + ':' + Math.round(h.x / 0.7) + ':' + Math.round(h.y / 0.7) + ':' + Math.round(h.z / 0.7);
  let w = WDMG.get(key);
  if (!w) {
    if (WDMG.size > 4000) WDMG.clear();
    w = { n: 0, h: { x: h.x, y: h.y, z: h.z, nx: h.nx, ny: h.ny, nz: h.nz, e } };
    WDMG.set(key, w);
  }
  w.n++;
  const c0 = w.h,
    dark = shade(col, 0.4);
  const foot = n => {
    for (let k = 0; k < n; k++) {
      const s = rr(0.06, 0.16);
      rubbleAt(
        c0.x + c0.nx * rr(0.1, 0.7) + c0.nz * rr(-0.6, 0.6),
        s * 0.3,
        c0.z + c0.nz * rr(0.1, 0.7) + c0.nx * rr(-0.6, 0.6),
        rr(-0.3, 0.3),
        rnd() * 3,
        rr(-0.3, 0.3),
        s * rr(1, 1.7),
        s * rr(0.5, 0.9),
        s * rr(1, 1.5),
        rnd() < 0.35 ? jit(0xa0644a, 0.1) : jit(shade(col, rr(0.78, 0.98)), 0.08)
      );
    }
  };
  if (w.n === 3) markAdd(CRACKS, c0, rr(0.45, 0.6), dark);
  else if (w.n === 6) {
    markAdd(CRACKS, c0, rr(0.85, 1.05), dark);
    markAdd(PATCHES, c0, rr(0.42, 0.55), brick ? 0xb09a86 : 0xffffff);
    chunks(4, () => jit(shade(col, 0.95), 0.08), 0.1, 2.6);
    dust(4, dc, 1.1);
    if (c0.y < 2.2) foot(3);
  } else if (w.n === 10) {
    markAdd(PATCHES, c0, rr(0.85, 1.05), brick ? 0xb09a86 : 0xffffff);
    markAdd(
      CRACKS,
      { x: c0.x, y: c0.y + rr(0.1, 0.3), z: c0.z, nx: c0.nx, ny: c0.ny, nz: c0.nz, e },
      rr(1.2, 1.5),
      dark
    );
    chunks(7, () => (rnd() < 0.4 ? jit(0xa0644a, 0.1) : jit(shade(col, 0.92), 0.08)), 0.15, 3);
    dust(8, dc, 1.3);
    if (c0.y < 3) foot(8);
  } else if (w.n > 10 && w.n % 5 === 0) {
    markAdd(
      PATCHES,
      {
        x: c0.x + c0.nz * rr(-0.4, 0.4),
        y: c0.y + rr(-0.35, 0.35),
        z: c0.z + c0.nx * rr(-0.4, 0.4),
        nx: c0.nx,
        ny: c0.ny,
        nz: c0.nz,
        e
      },
      rr(0.4, 0.6),
      brick ? 0xb09a86 : 0xffffff
    );
    chunks(3, () => jit(0xa0644a, 0.1), 0.12, 2.6);
    if (c0.y < 3) foot(3);
  }
  // cerca de un borde vertical del bloque: un mordisco en la esquina
  if (e.rx || e.rz) return;
  _hv.set(h.x - e.x, h.y - e.y, h.z - e.z);
  if (e.qi) _hv.applyQuaternion(e.qi);
  const hx = e.sx / 2,
    hz = e.sz / 2,
    onX = Math.abs(Math.abs(_hv.x) - hx) < 0.03,
    onZ = Math.abs(Math.abs(_hv.z) - hz) < 0.03;
  const near = onX ? hz - Math.abs(_hv.z) : onZ ? hx - Math.abs(_hv.x) : 9;
  if (near > 0.16 || (e.chips || 0) >= 16) return;
  const sgx = _hv.x < 0 ? -1 : 1,
    sgz = _hv.z < 0 ? -1 : 1,
    ck = id + 'c' + sgx + sgz + ':' + Math.round(h.y / 0.22);
  if (WDMG.has(ck)) return;
  WDMG.set(ck, 1);
  e.chips = (e.chips || 0) + 1;
  const s = rr(0.1, 0.19);
  _hd.set(sgx * (hx - s * 0.2), _hv.y, sgz * (hz - s * 0.2));
  if (e.q) _hd.applyQuaternion(e.q);
  const k = chipHead;
  chipHead = (chipHead + 1) % CHIPN;
  dummy.position.set(e.x + _hd.x, e.y + _hd.y, e.z + _hd.z);
  dummy.rotation.set(rr(-0.25, 0.25), (e.ry || 0) + Math.PI / 4 + rr(-0.3, 0.3), rr(-0.25, 0.25));
  dummy.scale.set(s, s * rr(0.8, 1.5), s);
  dummy.updateMatrix();
  CHIPL[k] = { ent: e };
  CHIPS.setMatrixAt(k, dummy.matrix);
  CHIPS.instanceMatrix.needsUpdate = true;
  CHIPS.setColorAt(k, tmpCol.setHex(brick || rnd() < 0.6 ? jit(0x7a4a38, 0.1) : shade(col, 0.5)));
  CHIPS.instanceColor.needsUpdate = true;
  chunks(3, () => (rnd() < 0.5 ? jit(0xa0644a, 0.1) : jit(shade(col, 0.95), 0.08)), 0.11, 3);
  if (h.y < 2.5) foot(2);
}
// un cohete contra una pared: el enlucido se va de un golpe y el escombro queda al pie
function wallBlast(h) {
  const e = h.e;
  if (
    !CRACKS ||
    !(e.m === M.PLASTER || e.m === M.CONC || e.m === M.STONE || e.m === M.BRICK) ||
    Math.abs(h.ny) > 0.5 ||
    e.sy < 0.5
  )
    return;
  const col = h.c == null ? 0xb0a080 : h.c;
  markAdd(PATCHES, h, rr(1.1, 1.4), e.m === M.BRICK ? 0xb09a86 : 0xffffff);
  markAdd(CRACKS, h, rr(1.7, 2.1), shade(col, 0.38));
  for (let k = 0; k < 14; k++) {
    const s = rr(0.07, 0.2);
    rubbleAt(
      h.x + h.nx * rr(0.1, 1.3) + h.nz * rr(-1, 1),
      s * 0.3,
      h.z + h.nz * rr(0.1, 1.3) + h.nx * rr(-1, 1),
      rr(-0.3, 0.3),
      rnd() * 3,
      rr(-0.3, 0.3),
      s * rr(1, 1.7),
      s * rr(0.5, 0.9),
      s * rr(1, 1.5),
      rnd() < 0.4 ? jit(0xa0644a, 0.1) : jit(shade(col, rr(0.75, 0.98)), 0.08)
    );
  }
}
// botas y ruedas en la arena
const _trkOK = (x, z) => {
  const i = Math.floor(x),
    j = Math.floor(z);
  if (!inB(i, j)) return false;
  const k = idx(i, j);
  return grid[k] !== 1 && STR[k] !== 2;
};
function stepMark(o, x, z, face, dt, sp) {
  if (sp < 0.25) return;
  o.fpD = (o.fpD || 0) + sp * dt;
  const stride = sp > 2 ? 0.62 : 0.44;
  if (o.fpD < stride) return;
  o.fpD = 0;
  o.fpS = -(o.fpS || 1);
  if (!_trkOK(x, z) || inStadium(x, z)) return; // dentro del estadio no quedan huellas de botas
  fadeAdd(
    FPL,
    x + Math.cos(face) * 0.075 * o.fpS,
    z - Math.sin(face) * 0.075 * o.fpS,
    face + o.fpS * 0.12,
    0.1,
    0.19,
    0.013
  );
}
function tyreMark(v, hw) {
  const g = v.g;
  if (!g || !g.visible) return;
  const x = g.position.x,
    z = g.position.z;
  if (!v.trk) {
    v.trk = [x, z];
    return;
  }
  const dx = x - v.trk[0],
    dz = z - v.trk[1],
    d = Math.hypot(dx, dz);
  if (d < 0.5) return;
  const tkk = (px_, pz_) => Math.floor(px_ / 0.34) + ':' + Math.floor(pz_ / 0.34),
    seen = TKH.get(tkk(x, z));
  if (TKH.size > 9000) TKH.clear();
  if (d < 3 && _trkOK(x, z) && !(seen != null && G.t - seen < 45 && G.t >= seen)) {
    for (let q = 0; q <= d; q += 0.17) TKH.set(tkk(v.trk[0] + (dx * q) / d, v.trk[1] + (dz * q) / d), G.t);
    TKH.set(tkk(x, z), G.t);
    const yaw = Math.atan2(dx, dz),
      mx = (x + v.trk[0]) / 2,
      mz = (z + v.trk[1]) / 2,
      px = Math.cos(yaw) * hw,
      pz = -Math.sin(yaw) * hw;
    fadeAdd(TKL, mx + px, mz + pz, yaw, 0.2, d + 0.04, 0.011);
    fadeAdd(TKL, mx - px, mz - pz, yaw, 0.2, d + 0.04, 0.011);
  }
  v.trk[0] = x;
  v.trk[1] = z;
}
function updTraces(dt) {
  if (!FPL || !G || dt <= 0 || (MIS && MIS.id === 'attract')) return;
  for (const u of units) {
    if (!u.alive || !u.moving || u.mounted || u.inB || (u.elev || 0) > 0.05 || u.ride) continue;
    stepMark(u, u.x, u.z, u.face, dt, Math.hypot(u.vx, u.vz));
  }
  for (const c of civs) {
    if (c.gone || !c.moving) continue;
    stepMark(c, c.x, c.z, c.face, dt, Math.hypot(c.vx, c.vz));
  }
  if (typeof CONVOYS !== 'undefined')
    for (const C of CONVOYS) {
      if (MIS.id === 'mile' && C === G.m.C && G.m.phase === 'B') continue;
      for (const v of C.veh) tyreMark(v, 0.56);
    }
  if (typeof TECHS !== 'undefined') for (const t of TECHS) tyreMark(t, 0.46);
  if (typeof IRN !== 'undefined' && IRN.convoy) for (const v of IRN.convoy) tyreMark(v, 0.56);
  TRT -= dt;
  if (TRT <= 0) {
    TRT = 0.4;
    fadeTick(FPL);
    fadeTick(TKL);
  }
}
function addCasing(x, y, z, ry, sx, sz, col) {
  if (!casMesh) return;
  const k = casHead;
  casHead = (casHead + 1) % CASN;
  dummy.position.set(x, Math.max(y, 0.012), z);
  dummy.rotation.set(0, ry, 0);
  dummy.scale.set(0.017, 0.014, Math.max(0.042, sz));
  dummy.updateMatrix();
  CAS[k] = { m: dummy.matrix.clone(), cut: y > CUT };
  casMesh.setMatrixAt(k, G && G.roofs && CAS[k].cut ? ZERO_M : CAS[k].m);
  casMesh.instanceMatrix.needsUpdate = true;
  casMesh.setColorAt(k, tmpCol.setHex(jit(col || 0x8e7c52, 0.06)));
  casMesh.instanceColor.needsUpdate = true;
}
function scorch(h, size) {
  if (!scMesh) return;
  const k = scHead;
  scHead = (scHead + 1) % SCN;
  dummy.position.set(h.x + h.nx * 0.02, h.y + h.ny * 0.02, h.z + h.nz * 0.02);
  dummy.scale.set(1, 1, 1);
  dummy.rotation.set(0, 0, 0);
  if (Math.abs(h.ny) > 0.9)
    dummy.rotation.set(-Math.PI / 2, 0, rnd() * 6.28); // plano sobre el suelo (lookAt no está definido mirando justo hacia arriba)
  else {
    dummy.lookAt(h.x + h.nx, h.y + h.ny, h.z + h.nz);
    dummy.rotateZ(rnd() * 6.28);
  }
  dummy.scale.set(size, size * rr(0.8, 1.15), 1);
  dummy.updateMatrix();
  SCS[k] = {
    m: dummy.matrix.clone(),
    cut: !!(h.e && h.e.b >= 0 && (h.e.roof || h.y > CUT)) || (h.ny > 0.5 && h.y > CUT),
    ent: h.e
  };
  scMesh.setMatrixAt(k, G && G.roofs && SCS[k].cut ? ZERO_M : SCS[k].m);
  scMesh.instanceMatrix.needsUpdate = true;
  scMesh.setColorAt(k, tmpCol.setHex(jit(0xffffff, 0.06)));
  scMesh.instanceColor.needsUpdate = true;
}
// una explosión en la calle: una mancha negra en el suelo y hollín subiendo por las paredes que estaban lo bastante cerca
function scorchAround(x, y, z, size) {
  scorch({ x, y: Math.max(0.03, y), z, nx: 0, ny: 1, nz: 0, e: null }, size);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 6.283 + rnd() * 0.4,
      R = size * 1.1;
    const h = traceShot(x, 0.7, z, x + Math.cos(a) * R, 0.7 + rr(-0.1, 0.3), z + Math.sin(a) * R, 0);
    if (h && h.m !== -1 && Math.hypot(h.x - x, h.z - z) < R) scorch(h, size * rr(0.55, 0.8));
  }
}
function refreshDecals() {
  if (casMesh) {
    for (let k = 0; k < CAS.length; k++) if (CAS[k]) casMesh.setMatrixAt(k, G.roofs && CAS[k].cut ? ZERO_M : CAS[k].m);
    casMesh.instanceMatrix.needsUpdate = true;
  }
  if (scMesh) {
    for (let k = 0; k < SCS.length; k++) if (SCS[k]) scMesh.setMatrixAt(k, G.roofs && SCS[k].cut ? ZERO_M : SCS[k].m);
    scMesh.instanceMatrix.needsUpdate = true;
  }
  if (RUB) {
    for (let k = 0; k < RUBS.length; k++) if (RUBS[k]) RUB.setMatrixAt(k, G.roofs && RUBS[k].cut ? ZERO_M : RUBS[k].m);
    RUB.instanceMatrix.needsUpdate = true;
  }
  for (const L_ of MARKL) {
    for (let k = 0; k < L_.list.length; k++)
      if (L_.list[k]) L_.mesh.setMatrixAt(k, G.roofs && L_.list[k].cut ? ZERO_M : L_.list[k].m);
    L_.mesh.instanceMatrix.needsUpdate = true;
  }
  if (!decMesh) return;
  for (let k = 0; k < DEC.length; k++) if (DEC[k]) decMesh.setMatrixAt(k, G.roofs && DEC[k].cut ? ZERO_M : DEC[k].m);
  decMesh.instanceMatrix.needsUpdate = true;
}

/* Arena saliendo de un saco terrero agujereado */
function updTrickles(dt) {
  for (let k = trickles.length - 1; k >= 0; k--) {
    const t = trickles[k];
    t.t += dt;
    t.acc += dt * 34 * (1 - t.t / t.life);
    while (t.acc > 1) {
      t.acc -= 1;
      spawnP(
        t.x + rr(-0.02, 0.02),
        t.y,
        t.z + rr(-0.02, 0.02),
        t.nx * rr(0.2, 0.5),
        rr(-0.2, 0.1),
        t.nz * rr(0.2, 0.5),
        rr(0.5, 0.9),
        rr(0.035, 0.055),
        0.03,
        pick([0xc8b080, 0xb8a070, 0xd2bc8c]),
        0xb09868,
        1,
        0,
        9
      );
    }
    if (t.t > t.life) trickles.splice(k, 1);
  }
}

/* Lo que suelta un impacto depende de lo que golpea */
function impactFx(h) {
  const { x, y, z, nx, ny, nz, m } = h,
    col = h.c == null ? 0xb0a080 : h.c;
  if (h.e && h.e.cv) coverDmg(h.e.cv, 1);
  const px = x + nx * 0.04,
    py = y + ny * 0.04,
    pz = z + nz * 0.04;
  const spray = (n, c0, c1, sp, life, s0, s1, grav, cone, emi, up) => {
    for (let k = 0; k < n; k++) {
      const v = sp * rr(0.35, 1);
      spawnP(
        px,
        py,
        pz,
        (nx + rr(-cone, cone)) * v - h.dx * 0.15 * v,
        (ny + rr(-cone, cone) * 0.6 + (up == null ? 0.3 : up)) * v,
        (nz + rr(-cone, cone)) * v - h.dz * 0.15 * v,
        life * rr(0.6, 1.25),
        s0 * rr(0.7, 1.3),
        s1,
        typeof c0 === 'function' ? c0() : c0,
        c1,
        rr(0.75, 1),
        emi || 0,
        grav
      );
    }
  };
  const dust = (n, c, sp) => {
    for (let k = 0; k < n; k++) {
      const v = (sp || 0.9) * rr(0.3, 1);
      spawnP(
        px,
        py,
        pz,
        (nx + rr(-0.5, 0.5)) * v,
        (ny * 0.6 + rr(0.1, 0.6)) * v,
        (nz + rr(-0.5, 0.5)) * v,
        rr(0.9, 1.8),
        rr(0.05, 0.1),
        rr(0.3, 0.55),
        c,
        shade(c, 1.08),
        rr(0.55, 0.85),
        0,
        0
      );
    }
  };
  const chunks = (n, c, s, sp, shape) => {
    for (let k = 0; k < n; k++) {
      const v = sp * rr(0.4, 1);
      spawnChunk(
        px,
        py,
        pz,
        (nx + rr(-0.6, 0.6)) * v - h.dx * 0.2 * v,
        (ny * 0.5 + rr(0.2, 0.9)) * v,
        (nz + rr(-0.6, 0.6)) * v - h.dz * 0.2 * v,
        s * rr(0.6, 1.3),
        typeof c === 'function' ? c() : c,
        shape
      );
    }
  };
  const sparks = n => {
    spray(n * 2, () => pick([0xffffff, 0xfff4c0, 0xffe080, 0xffc050]), 0xff6a20, 7, 0.42, 0.06, 0.02, 7, 0.75, 1, 0.45);
    spray(Math.ceil(n * 0.7), () => pick([0xfff4c0, 0xffd060]), 0xff5010, 3.2, 0.9, 0.05, 0.015, 14, 0.9, 1, 0.9);
    spawnP(px, py, pz, 0, 0, 0, 0.07, 0.16, 0.05, 0xffffff, 0xffd080, 1, 1, 0);
    lightFlash(px, py, pz, 0xffd890, 2.6 + nightF * 2, 3.6, 0.09);
  };
  if (m === -1) {
    // suelo
    spray(12, () => jit(0x8a7454, 0.1), 0x7a6648, 3.4, 0.75, 0.05, 0.04, 9, 0.45, 0, 0.9);
    dust(4, shade(col, 1.02), 0.7);
    chunks(2, () => jit(shade(col, 0.78), 0.1), 0.055, 2.2);
    decal(h, shade(col, 0.95), 0.1);
    impSnd('dirt', x, z);
  } else if (m === M.METAL || m === M.TIN || m === M.SHUTTER) {
    sparks(9 + ri(5));
    dust(1, 0x9a948a, 0.5);
    chunks(1 + ri(2), shade(col, 1.05), 0.045, 2.6, 'flake');
    decal(h, 0xd8d6cc, 0.08);
    impSnd(rnd() < 0.45 ? 'ric' : 'metal', x, z);
  } else if (m === M.BURNT) {
    sparks(4);
    dust(4, 0x2c2824, 0.8);
    chunks(2, () => pick([0x1e1c1a, 0x3a2a20, 0x5a3a24]), 0.05, 2.2, 'flake');
    decal(h, 0x8a7a6a, 0.08);
    impSnd('metal', x, z);
  } else if (m === M.GLASS) {
    spray(16, () => pick([0xf2fbff, 0xcfe6ee, 0xa8c8d4]), 0x9ab8c4, 3.2, 0.7, 0.035, 0.025, 9, 0.7, 0, 0.1);
    chunks(3 + ri(3), () => pick([0xbcd4dc, 0x9ab4bf, 0xd8ecf0]), 0.06, 2.4, 'flake');
    decal(h, 0xeaf2f4, 0.16);
    if (CRACKS) markAdd(CRACKS, h, rr(0.3, 0.52), 0xeef6f8);
    impSnd('glass', x, z);
  } else if (m === M.WOOD) {
    chunks(3 + ri(3), () => jit(shade(col, 1.15), 0.1), 0.07, 3.2, 'splinter');
    spray(6, shade(col, 1.1), shade(col, 0.9), 2.6, 0.6, 0.04, 0.03, 9, 0.6);
    dust(3, shade(col, 1.35), 0.7);
    decal(h, shade(col, 1.35), 0.085);
    impSnd('wood', x, z);
  } else if (m === M.BAG) {
    spray(14, () => pick([0xc8b080, 0xb8a070, 0xd2bc8c]), 0xb09868, 2.2, 0.8, 0.045, 0.03, 9, 0.5, 0, 0.4);
    dust(5, 0xcbb890, 0.8);
    chunks(1, shade(col, 1.05), 0.05, 1.8, 'flake');
    decal(h, 0x6a5a40, 0.08);
    if (trickles.length < 24) trickles.push({ x: px, y: py, z: pz, nx, nz, t: 0, life: rr(1.4, 2.6), acc: 0 });
    impSnd('soft', x, z);
  } else if (m === M.CLOTH) {
    spray(7, shade(col, 1.1), shade(col, 0.9), 1.4, 1.4, 0.04, 0.035, 1.6, 0.9);
    dust(1, 0xc8bca4, 0.5);
    decal(h, shade(col, 0.6), 0.06);
    impSnd('soft', x, z);
  } else if (m === M.WHEEL || m === M.TIRE) {
    spray(5, 0x1c1b1a, 0x2a2826, 2.2, 0.6, 0.05, 0.04, 9, 0.6);
    chunks(1, 0x1a1918, 0.05, 2, 'flake');
    dust(2, 0x4a4642, 0.5);
    impSnd('soft', x, z);
  } else if (m === M.LEAF) {
    spray(8, () => pick([0x5d7a3c, 0x6b7a3a, 0x4f6a34, 0x8a8a44]), 0x6a6a3a, 1.2, 2.4, 0.06, 0.05, 1.0, 1.1, 0, 0.2);
    impSnd('soft', x, z);
  } else {
    // enlucido, ladrillo, hormigón, piedra, varios
    const brick = m === M.BRICK,
      base = brick ? 0xa0644a : col;
    const dc = brick ? 0xb08060 : shade(col, 1.12);
    dust(6 + ri(3), dc, 1.0);
    spray(9, () => jit(base, 0.12), shade(base, 0.85), 3.2, 0.7, 0.045, 0.03, 9, 0.55);
    chunks(
      2 + ri(3),
      () => (rnd() < 0.25 && !brick && m === M.PLASTER ? jit(0xa0644a, 0.1) : jit(shade(base, 0.95), 0.1)),
      0.065,
      2.8
    );
    const cx_ = (MIS && MIS.chipX) || 0; // calles donde las paredes se están deshaciendo a tiros: más trozos y más grandes
    if (cx_) {
      chunks(Math.round(cx_ * (2 + ri(3))), () => jit(shade(base, rr(0.85, 1.02)), 0.1), 0.085, 3.4);
      chunks(ri(2) + (cx_ > 1 ? 1 : 0), () => jit(shade(base, 0.9), 0.08), 0.16, 2.4);
      dust(3, dc, 1.2);
    }
    decal(h, brick ? 0xc89070 : shade(col, 1.18), 0.1);
    impSnd(m === M.STONE || m === M.CONC ? 'stone' : 'thud', x, z);
    wallWear(h, col, brick, chunks, dust, dc);
  }
}
