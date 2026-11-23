/* ====================================================================================================
 * world/chunks.js
 *
 * Chunks y construcción perezosa (solo se monta lo que la cámara va a ver)
 * ================================================================================================== */

'use strict';

let CHUNKS = new Map(),
  GEN = [],
  CUR = null,
  PLANNING = false,
  frameStamp = 0,
  heliWaiters = [];
let STR, SVX, SVW, SHZ, SHW; // raster de calles: 0 nada, 1 tierra, 2 pavimentada; inicios de línea y anchos para las rodadas
function chunkAt(i, j) {
  const k = i + ',' + j;
  let c = CHUNKS.get(k);
  if (!c) {
    c = {
      i,
      j,
      x0: i * CS,
      z0: j * CS,
      BX: [],
      BXm: [],
      AW: [],
      AWM: [],
      CY: [],
      DM: [],
      LF: [],
      VH: [],
      PM: [],
      CR: [],
      TR: [],
      PR: [],
      lz: [],
      gen: false,
      group: null
    };
    CHUNKS.set(k, c);
  }
  return c;
}
const chunkFor = (x, z) => chunkAt(Math.floor(x / CS), Math.floor(z / CS));
function lazyAdd(x, z, fn) {
  const s =
    (Math.imul(Math.floor(x * 7) | 0, 73856093) ^ Math.imul(Math.floor(z * 7) | 0, 19349663) ^ 0x5bd1e995) >>> 0;
  chunkFor(x, z).lz.push({ seed: s, fn });
}
const UDOME = new T.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
function D(x, y, z, w, h, d, c, o) {
  const e = inst(x, y, z, w, h, d, c, o);
  (CUR || chunkFor(x, z)).DM.push(e);
}
function Cs(x, y, z, sx, sy, sz, c, o) {
  const e = inst(x, y, z, sx, sy, sz, c, o);
  (CUR || chunkFor(x, z)).CY.push(e);
}
const GPLANE = new T.PlaneGeometry(CS, CS);
GPLANE.rotateX(-Math.PI / 2);

function genChunk(ch) {
  const ps = seed,
    pm = MAT;
  ch.group = new T.Group();
  world.add(ch.group);
  CUR = ch;
  for (const e of ch.lz) {
    seed = e.seed;
    MAT = 0;
    e.fn();
  }
  seed = (Math.imul(ch.i, 73856093) ^ Math.imul(ch.j, 19349663) ^ 1993) >>> 0;
  MAT = 0;
  dressChunk(ch);
  scatterProps(ch);
  CUR = null;
  seed = ps;
  MAT = pm;
  const mk = (geo, L, sh) => (L.length ? makeInst(geo, L, sh, ch.group) : null);
  ch.box = mk(UBOX, ch.BX, true);
  ch.bxm = mk(UBOX, ch.BXm, false);
  ch.aw = mk(UBOX, ch.AW, false);
  buildAwnings(ch);
  ch.cyl = mk(UCYL, ch.CY, true);
  ch.dome = mk(UDOME, ch.DM, true);
  buildLeaves(ch);
  buildVeg(ch);
  buildVeh(ch);
  buildPalms(ch);
  buildCranes(ch);
  buildTrees(ch);
  buildProps(ch);
  if (G && G.roofs) cutChunk(ch, true);
  ch.gm = new T.Mesh(GPLANE, groundMat());
  ch.gm.position.set(ch.x0 + CS / 2, 0, ch.z0 + CS / 2);
  ch.gm.receiveShadow = true;
  ch.group.add(ch.gm);
  ch.tex = null;
  ensureGround(ch);
  hgAddChunk(ch);
  ch.gen = true;
  GEN.push(ch);
}
function cutChunk(ch, on) {
  if (ch.box) writeInst(ch.box, ch.BX, on);
  if (ch.bxm) writeInst(ch.bxm, ch.BXm, on);
  if (ch.cyl) writeInst(ch.cyl, ch.CY, on);
  if (ch.dome) writeInst(ch.dome, ch.DM, on);
  for (const r of ch.PR) if (r.roof || r.gone || r.y >= CUT) propWrite(r, on);
}
function ensureGround(ch) {
  if (ch.tex) return;
  ch.tex = genGroundTex(ch);
  ch.gm.material.map = ch.tex;
  ch.gm.material.needsUpdate = true;
}
function hgAddChunk(ch) {
  const add = e => {
    e.r = 0.5 * Math.hypot(e.sx, e.sy, e.sz);
    e.st = 0;
    if (e.rx || e.ry || e.rz) {
      _e.set(e.rx, e.ry, e.rz, e.ord);
      e.q = new T.Quaternion().setFromEuler(_e);
      e.qi = e.q.clone().invert();
    }
    const i0 = Math.max(ORX, Math.floor(e.x - e.r)),
      i1 = Math.min(ORX + W - 1, Math.floor(e.x + e.r)),
      j0 = Math.max(ORZ, Math.floor(e.z - e.r)),
      j1 = Math.min(ORZ + H - 1, Math.floor(e.z + e.r));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const k = idx(i, j);
        (HG[k] || (HG[k] = [])).push(e);
      }
  };
  if (ch.x0 + CS < ORX - 8 || ch.z0 + CS < ORZ - 8 || ch.x0 > ORX + W + 8 || ch.z0 > ORZ + H + 8) return;
  for (const L of [ch.BX, ch.BXm, ch.AW, ch.CY, ch.DM]) for (const e of L) add(e);
}
// qué chunks ve la cámara; los que faltan se generan unos pocos por frame, primero los más cercanos
let FOCUS2 = null;
const _wfr = new T.Frustum(),
  _wfm = new T.Matrix4(),
  _wbx = new T.Box3(),
  _wbx2 = new T.Box3();
function updWorld(budget) {
  frameStamp++;
  const hh = halfH(),
    a = innerWidth / innerHeight;
  const att = MIS && MIS.id === 'attract' && !FLIGHT.sel;
  const R = Math.hypot(hh * a, hh / Math.sin(camS.pitch)) + (att ? 4 : 20);
  const pts = [[camS.tx, camS.tz, R]];
  if (FOCUS2 && !att) pts.push(FOCUS2);
  if (att) {
    updCam();
    cam.updateMatrixWorld();
    _wfr.setFromProjectionMatrix(_wfm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  }
  const want = [];
  for (const [cx, cz, r] of pts) {
    const i0 = Math.floor((cx - r) / CS),
      i1 = Math.floor((cx + r) / CS),
      j0 = Math.floor((cz - r) / CS),
      j1 = Math.floor((cz + r) / CS);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const mx = i * CS + CS / 2,
          mz = j * CS + CS / 2;
        if (mx < WB.x0 || mx > WB.x1 || mz < WB.z0 || mz > WB.z1) continue;
        const d = Math.hypot(mx - cx, mz - cz);
        if (d > r + CS * 0.72) continue;
        if (att) {
          _wbx.min.set(i * CS - 12, -1, j * CS - 12);
          _wbx.max.set(i * CS + CS + 12, 30, j * CS + CS + 12);
          if (!_wfr.intersectsBox(_wbx)) continue;
        }
        const ch = chunkAt(i, j);
        ch.seen = frameStamp;
        if (!ch.gen) want.push([d, ch]);
        else if (!ch.tex) want.push([d, ch]);
      }
  }
  want.sort((p, q) => p[0] - q[0]);
  for (let k = 0; k < want.length && budget > 0; k++) {
    const ch = want[k][1];
    if (!ch.gen) genChunk(ch);
    else {
      ensureGround(ch);
    }
    budget--;
  }
  const lod = camS.zoom < 15;
  // solo se pinta si el chunk (con margen por las sombras que sus edificios echan hacia la vista) cae dentro de lo que ve la cámara
  updCam();
  cam.updateMatrixWorld();
  _wfr.setFromProjectionMatrix(_wfm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const sdx = sun.position.x - sun.target.position.x,
    sdz = sun.position.z - sun.target.position.z,
    sdy = sun.position.y - sun.target.position.y;
  const mg = clamp((16 * Math.hypot(sdx, sdz)) / Math.max(sdy, 1e-3), 14, 44); // con el sol bajo las sombras son largas: mantengo más chunks alrededor de la vista
  for (const ch of GEN) {
    const ex = ch.ext || 0;
    _wbx.min.set(ch.x0 - mg - ex, -1, ch.z0 - mg - ex);
    _wbx.max.set(ch.x0 + CS + mg + ex, 26, ch.z0 + CS + mg + ex);
    const vis = ch.seen === frameStamp && _wfr.intersectsBox(_wbx);
    ch.group.visible = vis;
    // una zona que solo sigue viva por las sombras que mete en pantalla va a la capa 1: la cámara de sombras del sol la ve, la vista no
    if (vis) {
      const e2 = 1.5 + (ch.ext || 0);
      _wbx2.min.set(ch.x0 - e2, -1, ch.z0 - e2);
      _wbx2.max.set(ch.x0 + CS + e2, 26, ch.z0 + CS + e2); // un hangar se sale de su propio chunk
      const scr = _wfr.intersectsBox(_wbx2),
        nc = ch.group.children.length;
      if (scr !== ch.scr || nc !== ch.layC) {
        ch.scr = scr;
        ch.layC = nc;
        const mk = scr ? 3 : 2;
        ch.group.traverse(o => {
          if (!o.isLight) o.layers.mask = mk;
        });
      }
    }
    if (ch.bxm) ch.bxm.visible = camS.zoom < 24;
    if (ch.veg) ch.veg.visible = camS.zoom < 24;
    if (ch.vegG) ch.vegG.visible = camS.zoom < 24;
    if (!vis && ch.tex) {
      const d = Math.hypot(ch.x0 + CS / 2 - camS.tx, ch.z0 + CS / 2 - camS.tz);
      if (d > R + CS * (MIS && MIS.id === 'attract' ? 1.2 : 7)) {
        ch.tex.dispose();
        ch.tex = null;
        ch.gm.material.map = null;
        ch.gm.material.needsUpdate = true;
      }
    }
  }
}
function visibleBoxMeshes() {
  const out = [];
  for (const ch of GEN) if (ch.seen === frameStamp && ch.box) out.push(ch.box);
  return out;
}
