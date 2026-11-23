/* ====================================================================================================
 * units/soldier-batches.js
 *
 * Batches de soldados: todos los hombres comparten material, así que hasta BATCH_MAX se pintan como una sola malla con skinning
 * con todos sus esqueletos uno junto a otro: una llamada de dibujo (y una de sombra) por batch en vez de una por soldado.
 * Cada esqueleto conserva sus huesos y se anima exactamente igual que antes; el batch solo los toma prestados.
 * ================================================================================================== */

'use strict';

const BATCH_ON = renderer.capabilities.floatVertexTextures && !/batch=0/.test(location.search);
const BATCH_MAX = 12;
let RIGS = [],
  BATCHES = [];
const _rigHid = [];
function rigInScene(r) {
  let o = r.root;
  while (o) {
    if (o === scene) return true;
    o = o.parent;
  }
  return false;
}
function rigShown(r) {
  let o = r.root;
  while (o && o !== scene) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return !!o;
}
function batchReset() {
  for (const b of BATCHES) batchDrop(b);
  BATCHES = [];
  RIGS = [];
}
function batchDrop(b) {
  if (b.mesh) {
    scene.remove(b.mesh);
    b.mesh.geometry.dispose();
    if (b.mesh.skeleton && b.mesh.skeleton.boneTexture) b.mesh.skeleton.boneTexture.dispose();
    b.mesh = null;
  }
}
function batchBuild(b) {
  batchDrop(b);
  if (!b.rigs.length) return;
  const names = ['position', 'normal', 'color', 'aPat', 'aLP', 'skinWeight', 'uv'];
  let nv = 0,
    ni = 0;
  for (const r of b.rigs) {
    const gg = r.skin.geometry;
    nv += gg.attributes.position.count;
    ni += gg.index.count;
  }
  const A = {};
  for (const n of names) {
    const s = b.rigs[0].skin.geometry.attributes[n];
    A[n] = new Float32Array(nv * s.itemSize);
  }
  const SI = new Uint16Array(nv * 4),
    IX = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni),
    bones = [],
    inv = [];
  let vo = 0,
    io = 0;
  for (const r of b.rigs) {
    const gg = r.skin.geometry,
      sk = r.skin.skeleton,
      bo = bones.length,
      n = gg.attributes.position.count;
    for (const nm of names) {
      const s = gg.attributes[nm];
      A[nm].set(s.array, vo * s.itemSize);
    }
    const si = gg.attributes.skinIndex.array;
    for (let k = 0; k < n * 4; k++) SI[vo * 4 + k] = si[k] + bo;
    const ix = gg.index.array;
    for (let k = 0; k < ix.length; k++) IX[io + k] = ix[k] + vo;
    for (let k = 0; k < sk.bones.length; k++) {
      bones.push(sk.bones[k]);
      inv.push(sk.boneInverses[k]);
    }
    r.bone0 = bo;
    vo += n;
    io += ix.length;
  }
  const geo = new T.BufferGeometry();
  for (const nm of names)
    geo.setAttribute(nm, new T.BufferAttribute(A[nm], b.rigs[0].skin.geometry.attributes[nm].itemSize));
  geo.setAttribute('skinIndex', new T.BufferAttribute(SI, 4));
  geo.setIndex(new T.BufferAttribute(IX, 1));
  geo.boundingSphere = new T.Sphere(new T.Vector3(), 1e4);
  const mesh = new T.SkinnedMesh(geo, unitSkinMat);
  mesh.bindMode = 'detached';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.raycast = () => {};
  mesh.bind(new T.Skeleton(bones, inv), new T.Matrix4());
  scene.add(mesh);
  b.mesh = mesh;
}
// una vez por frame, antes de pintar: los nuevos se unen al batch más cercano con sitio, los que se alejan se pasan a uno cercano,
// y los que salen del mundo dejan el suyo; luego cada batch se descarta entero con una esfera alrededor de sus hombres
let batchT = 0;
const rigPos = r => (r.root.parent === world ? r.root.position : _rp.setFromMatrixPosition(r.root.matrixWorld));
const _rp = new T.Vector3();
function batchCentre(b) {
  let x = 0,
    z = 0;
  for (const r of b.rigs) {
    const p = rigPos(r);
    x += p.x;
    z += p.z;
  }
  b.cx = x / b.rigs.length;
  b.cz = z / b.rigs.length;
}
// el detalle del soldado depende de lo grande que se vea en pantalla: el modelo completo de cerca y otros más ligeros (mismo esqueleto, mismo aspecto) de lejos
let SOLDIER_LV = 0;
const LV_CELL = [0, 0.028, 0.042];
function soldierLod() {
  const ppm = lowH / (2 * halfH());
  let lv = SOLDIER_LV;
  if (ppm > 36) lv = 0;
  else if (lv === 0 && ppm < 31) lv = 1;
  if (ppm < 13) lv = 2;
  else if (lv === 2 && ppm > 16) lv = 1;
  SOLDIER_LV = lv;
  let budget = 1; // como mucho un hombre simplificado nuevo por frame, y solo para los que se están viendo
  const one = r => {
    if (!r || r.lv === lv || !r.geo0) return;
    let geo = lv ? r.lods && r.lods[lv] : r.geo0;
    if (!geo && budget > 0 && rigShown(r)) {
      budget--;
      (r.lods || (r.lods = {}))[lv] = geo = simplifyGeo(r.geo0, LV_CELL[lv], 'skinIndex');
    }
    if (geo) {
      r.lv = lv;
      r.skin.geometry = geo;
      if (r.batch) r.batch.dirty = true;
    }
  };
  for (const r of RIGS) one(r);
  for (const u of them) one(u.m);
}
function batchFrame() {
  soldierLod();
  if (!BATCH_ON) return;
  const pend = [];
  // solo van en batch los que están de pie en el mundo; uno que va en un helicóptero o en un vehículo se mueve con él y se pinta solo
  for (const r of RIGS) {
    const inS = r.root.parent === world && rigInScene(r);
    r.skin.visible = !inS;
    if (r.batch && !inS) {
      r.batch.dirty = true;
      r.batch.rigs.splice(r.batch.rigs.indexOf(r), 1);
      r.batch = null;
    } else if (!r.batch && inS) pend.push(r);
  }
  RIGS = RIGS.filter(r => r.batch || r.root.parent);
  for (const b of BATCHES) if (b.rigs.length) batchCentre(b);
  if (performance.now() > batchT) {
    batchT = performance.now() + 500;
    let moved = 0;
    for (const b of BATCHES)
      for (const r of b.rigs.slice()) {
        if (moved >= 8) break;
        const p = rigPos(r);
        if (Math.hypot(p.x - b.cx, p.z - b.cz) > 16) {
          b.rigs.splice(b.rigs.indexOf(r), 1);
          b.dirty = true;
          r.batch = null;
          pend.push(r);
          moved++;
        }
      }
  }
  for (const r of pend) {
    const p = rigPos(r);
    let best = null,
      bd = 12;
    for (const b of BATCHES) {
      if (b.rigs.length >= BATCH_MAX || !b.rigs.length) continue;
      const d = Math.hypot(p.x - b.cx, p.z - b.cz);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (!best) {
      best = { rigs: [], mesh: null, dirty: true, cx: p.x, cz: p.z };
      BATCHES.push(best);
    }
    best.rigs.push(r);
    r.batch = best;
    best.dirty = true;
    batchCentre(best);
  }
  for (const b of BATCHES)
    if (b.dirty) {
      b.dirty = false;
      batchBuild(b);
    }
  BATCHES = BATCHES.filter(b => b.rigs.length || (batchDrop(b), false));
}
// la esfera de descarte de cada batch, con las matrices de este frame (se llama justo después de refrescar las de la escena)
function batchSpheres() {
  for (const b of BATCHES) {
    if (!b.mesh) continue;
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9,
      z0 = 1e9,
      z1 = -1e9;
    for (const r of b.rigs) {
      const e = r.root.matrixWorld.elements,
        x = e[12],
        y = e[13],
        z = e[14];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    const s = b.mesh.geometry.boundingSphere;
    s.center.set((x0 + x1) / 2, (y0 + y1) / 2 + 1, (z0 + z1) / 2);
    s.radius = Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 2.5;
  }
}
// se llama con las matrices de la escena recién calculadas: pliega a los que no se deben ver y devuelve sus huesos cuando el frame está pintado
function batchHide() {
  _rigHid.length = 0;
  if (!BATCH_ON) return;
  for (const b of BATCHES)
    for (const r of b.rigs)
      if (!rigShown(r))
        for (const bn of r.skin.skeleton.bones) {
          _rigHid.push(bn, bn.matrixWorld.clone());
          bn.matrixWorld.makeScale(0, 0, 0);
        }
}
function batchRestore() {
  for (let k = 0; k < _rigHid.length; k += 2) _rigHid[k].matrixWorld.copy(_rigHid[k + 1]);
  _rigHid.length = 0;
}
function makeUnit(team, i, j, spec) {
  if (team === 'them' && rpgEligible(spec) && ++RPG_CNT % 20 === 12)
    spec = Object.assign({}, spec, { gun: 'rpg', rpg: true, rpgLoaded: true, rpgReady: 0, name: 'Miliciano · RPG' });
  const u = Object.assign(
    {
      team,
      x: i + 0.5,
      z: j + 0.5,
      vx: 0,
      vz: 0,
      face: team === 'us' ? Math.PI / 2 : -Math.PI / 2,
      hp: 100,
      sup: 0,
      alive: true,
      down: false,
      path: [],
      order: null,
      stance: 'stand',
      pinned: false,
      scanT: rnd() * 0.3,
      auto: null,
      spotted: false,
      thinkT: rnd(),
      nextMove: 0,
      reviveT: 0,
      status: 'Listo',
      kind: 'us',
      ammo: 200,
      spd: 2.4,
      supRes: 1,
      gun: 'ak',
      reloadDur: 2.8,
      reloading: false,
      reloadT: 0
    },
    spec
  );
  u.ammo0 = u.ammo;
  u.hp0 = u.hp;
  u.cool0 = spec.cool || 1.4;
  u.cool = rnd() * 1.2;
  u.magSize = MAGS[u.gun] || 30;
  u.mag = Math.min(u.magSize, u.ammo);
  u.hasPistol = team === 'us' && (!spec.look || spec.look === 'ranger' || spec.look === 'delta');
  if (u.gun === 'saw') u.reloadDur *= 1.9;
  const rig = buildRig(spec.look || (team === 'us' ? 'ranger' : 'militia'), spec);
  // la milicia entra y sale de la vista todo el rato: cada uno sigue siendo su propia malla, descartada y oculta por separado
  if (team === 'them' && BATCH_ON) {
    rig.skin.visible = true;
    const i = RIGS.indexOf(rig);
    if (i >= 0) RIGS.splice(i, 1);
  }
  world.add(rig.root);
  const hb = new T.Mesh(hitGeo, hitMat);
  hb.position.y = 0.75;
  hb.userData.unit = u;
  rig.root.add(hb);
  const mark = box(0.14, 0.14, 0.14, 0xe05a42, 0, 1.55, 0, rig.root, false);
  mark.visible = false;
  const ring = unitRing(0.36, 0.42, team === 'us' ? 0x5c9cf0 : 0xe8584a, 0.35);
  const sel = team === 'us' ? unitRing(0.45, 0.52, 0xe7a63d, 0.85) : null;
  if (sel) sel.visible = false;
  const icon = ovIcon(team === 'us' ? 'us' : 'them');
  icon.visible = false;
  const ghost = new T.Mesh(
    ghostGeo,
    new T.MeshBasicMaterial({ color: COL_THEM, transparent: true, opacity: 0.7, depthTest: false })
  );
  ghost.visible = false;
  overlay.add(ghost);
  u.m = Object.assign(rig, { hb, mark, ring, sel, icon, ghost, iconKind: '' });
  units.push(u);
  (team === 'us' ? us : them).push(u);
  return u;
}
function makeSquad(type) {
  const S = SQUADS[type];
  const spawn = [
      [0, 0],
      [1, 1],
      [1, 3],
      [-1, 1],
      [-1, 3],
      [0, 4]
    ],
    s0 = MIS.start;
  S.list.forEach((sp, k) => {
    const c = findWalk(s0[0] + spawn[k][0], s0[1] + spawn[k][1]);
    makeUnit(
      'us',
      c[0],
      c[1],
      Object.assign({ kind: 'us', look: S.look, spd: S.spd, supRes: S.supRes, reloadDur: S.reload }, sp)
    );
  });
}
function dropOverlay(u) {
  for (const k of ['ring', 'sel', 'icon', 'ghost']) if (u.m[k] && u.m[k].parent) u.m[k].parent.remove(u.m[k]);
}
function swapSquad(type) {
  squadType = type;
  for (const u of us) {
    world.remove(u.m.root);
    dropOverlay(u);
  }
  units = units.filter(u => u.team !== 'us');
  us = [];
  makeSquad(type);
  G.sel = new Set(us);
  buildCards();
}
function poseFor(u) {
  if (u.carriedBy) return 'slung';
  if (u.poseName) return u.poseName;
  if (u.pushup != null) return 'pushup';
  if (u.team === 'civ') return u.stance === 'crouch' ? 'kneelR' : 'civ';
  if (!u.alive)
    return G.t - (u.deathT || -9) < 0.32 ? 'collapse' : u.down ? 'downed' : u.deadVar === 2 ? 'dead2' : 'dead';
  if (u.kdT > G.t) return G.t - (u.kd0 || 0) < 0.35 ? 'collapse' : 'downed';
  const firing = u.firing > 0;
  if (u.stance === 'prone') return u.pinned && !firing ? 'cower' : 'prone';
  if (u.healing && !u.moving) return 'treat';
  if (u.idleKneel && u.team === 'us' && u.stance === 'stand' && !u.moving && !(u.firing > 0) && !u.auto)
    return 'kneelR';
  if (u.team === 'them' && u.stance === 'crouch' && firing && u.sup > 55 && !u.moving) return 'blind';
  const aiming =
    !u.reloading &&
    (firing ||
      (u.auto && u.auto.alive && !u.moving) ||
      (u.order && (u.order.type === 'suppress' || u.order.type === 'attack') && !u.moving));
  if (u.stance === 'crouch' && !u.moving) return aiming ? 'kneel' : 'kneelR';
  if (u.reloading && u.team === 'us' && !u.moving && u.sup > 12) return 'kneelR'; // bajo fuego hinca una rodilla para cambiar el cargador
  return aiming && !u.moving ? 'aim' : 'ready';
}
const RL_ARM = [
  // fotogramas clave de la recarga para el brazo de apoyo: [t, lua x, lua z, lfa]
  [0, -0.9, -0.35, -1.0],
  [0.18, -1.0, -0.5, -1.5],
  [0.42, 0.1, -0.15, -0.7],
  [0.62, -0.95, -0.5, -1.5],
  [0.8, -0.9, -0.35, -1.0],
  [1, -0.9, -0.35, -1.0]
];
function rlArm(r) {
  for (let k = 1; k < RL_ARM.length; k++) {
    const a = RL_ARM[k - 1],
      b = RL_ARM[k];
    if (r <= b[0]) {
      const t = (r - a[0]) / (b[0] - a[0]),
        s = t * t * (3 - 2 * t);
      return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s, a[3] + (b[3] - a[3]) * s];
    }
  }
  return RL_ARM[RL_ARM.length - 1].slice(1);
}
/* Animación del esqueleto con muelles y capas procedurales encima: paso, carrera agachado, cojera, gestos, radio, curas y reacciones a impactos */
const PKEYS = [];
(function () {
  const p = POSES.ready;
  for (const k in p) {
    if (Array.isArray(p[k])) p[k].forEach((_, i) => PKEYS.push(k + i));
    else PKEYS.push(k);
  }
})();
const flatPose = {};
for (const n in POSES) {
  const o = {};
  for (const k in POSES[n]) {
    const v = POSES[n][k];
    if (Array.isArray(v)) v.forEach((x, i) => (o[k + i] = x));
    else o[k] = v;
  }
  flatPose[n] = o;
}
function initAnim(m) {
  m.c = Object.assign({}, flatPose.ready);
  m.v = {};
  for (const k of PKEYS) m.v[k] = 0;
  m.tyaw = 0;
  m.tyawV = 0;
  m.spd = 0;
  m.idle = rnd() * 10;
  m.cm = 0;
  m.limp = 0;
  m.healB = 0;
  // no hay dos que corran igual: zancada, elevación de rodilla, cadencia, inclinación, balanceo, rebote, y si el brazo izquierdo sigue en el fusil
  m.gA = rr(0.84, 1.2);
  m.gK = rr(0.8, 1.35);
  m.gF = rr(0.92, 1.1);
  m.gL = rr(-0.02, 0.12);
  m.gS = rr(0, 0.9);
  m.gB = rr(0.7, 1.45);
  m.gArm = rnd() < 0.35 ? 1 : 0;
  m.rdy = rnd() < 0.3 ? 1 : 0;
}
const FIDGETS = ['look', 'look', 'adjust', 'shift', 'check', 'stretch', 'vest', 'high'];
const sm = (a, b, k) => a + (b - a) * k;
