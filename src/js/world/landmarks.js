/* ====================================================================================================
 * world/landmarks.js
 *
 * Edificios y sitios clave
 * ================================================================================================== */

function arch(x, z) {
  MAT = M.STONE;
  const S = 0xe8e0cc;
  for (const pz of [z - 6.6, z + 6.6]) {
    B(x, 3, pz, 4, 6, 3, S);
    B(x, 0.3, pz, 4.8, 0.6, 3.6, shade(S, 0.9));
    B(x, 5.7, pz, 4.4, 0.3, 3.3, shade(S, 0.94));
    B(x, 2.6, pz + (pz < z ? 1.52 : -1.52), 1.2, 3.2, 0.06, shade(S, 0.86));
    B(x, 3, pz, 4.06, 0.2, 3.06, shade(S, 0.92));
  }
  B(x, 6.7, z, 4.2, 1.8, 16.2, S);
  B(x, 7.75, z, 4.6, 0.3, 16.8, shade(S, 0.9));
  B(x, 8.8, z, 3.6, 1.8, 12.6, S);
  B(x, 9.8, z, 3.9, 0.25, 13, shade(S, 0.9));
  B(x, 6.0, z, 3.9, 0.25, 10.2, shade(S, 0.82));
  for (let k = -2; k <= 2; k++) B(x + 2.12, 8.8, z + k * 2.4, 0.06, 1.1, 1.6, shade(S, 0.84));
  for (let k = -2; k <= 2; k++) B(x - 2.12, 8.8, z + k * 2.4, 0.06, 1.1, 1.6, shade(S, 0.84));
}
// El Arco (la viga de pilares de la boca del callejón) está en world/arch-trionfo.js
function k4() {
  MAT = M.STONE;
  B(330, 4.95, 410, 1.1, 7, 1.1, 0xe8e2d2);
  B(330, 1.3, 410, 1.5, 0.5, 1.5, 0xd8d0be);
  B(330, 8.85, 410, 1.5, 0.8, 1.5, 0xd8d0be);
  B(330, 9.85, 410, 0.5, 1.2, 0.5, 0xc89a40, { m: M.METAL });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    palm(330 + Math.cos(a) * 7, 410 + Math.sin(a) * 7, rr(3.6, 4.6));
  }
}
function mosqueTop(x, y, w, d, top) {
  MAT = M.PLASTER;
  const cx = x + w / 2,
    cz = y + d / 2;
  C(cx, top + 0.25, cz, w * 0.32, 0.5, 0xe8e2d4, { roof: 1, b: 0 });
  D(cx, top + 0.5, cz, w * 0.62, w * 0.42, w * 0.62, pick([0xe8e2d4, 0x5a8a8a, 0xd8c890]), { roof: 1, b: 0 });
  const mx = x + 0.9,
    mz = y + 0.9;
  C(mx, top + 3.5, mz, 0.55, 7, 0xf0ece0, { roof: 1, b: 0 });
  C(mx, top + 6.2, mz, 0.8, 0.25, 0xe0dace, { roof: 1, b: 0 });
  C(mx, top + 7.3, mz, 0.38, 1.8, 0xf0ece0, { roof: 1, b: 0 });
  D(mx, top + 8.2, mz, 0.8, 0.7, 0.8, 0x5a8a8a, { roof: 1, b: 0 });
}
function stadium() {
  const { x: cx, z: cz, rx, rz } = STADIUM,
    n = 72;
  MAT = M.CONC;
  for (let k = 0; k < n; k++) {
    const a = ((k + 0.5) / n) * Math.PI * 2;
    if ([0, Math.PI, Math.PI * 1.5, Math.PI * 2].some(g => Math.abs(a - g) < 0.09) || Math.abs(a - Math.PI / 2) < 0.17)
      continue;
    const ca = Math.cos(a),
      sa = Math.sin(a),
      tx = -sa * rx,
      tz = ca * rz,
      tl = Math.hypot(tx, tz),
      ry = Math.atan2(-tz, tx);
    const seg = ((tl * Math.PI * 2) / n) * 1.04;
    for (let t = 0; t < 4; t++) {
      const f = 0.8 + t * 0.055;
      B(
        cx + ca * rx * f,
        0.45 + t * 0.75,
        cz + sa * rz * f,
        seg,
        0.9 + t * 0.75 - t * 0.5,
        1.9,
        shade(0xc4bcaa, 1 - t * 0.03),
        { ry }
      );
    }
    B(cx + ca * rx * 1.0, 1.9, cz + sa * rz * 1.0, seg, 3.8, 0.45, 0xb8b0a0, { ry });
    // los toldos de colores sobre las gradas ya no están (se tira el color igual, para no mover nada más)
    if (k % 3 === 0) pick([0x3a6a8a, 0xb0a890, 0x8a3a2a]);
  }
  for (const [ax, az] of [
    [0.74, 0.7],
    [-0.74, 0.7],
    [0.74, -0.7],
    [-0.74, -0.7]
  ]) {
    const x = cx + ax * rx,
      z = cz + az * rz;
    MAT = M.METAL;
    B(x, 6, z, 0.5, 12, 0.5, 0x8a8a84, { hid: 1 });
    prop('lights', 'flood', x, 0, z, Math.atan2(az, -ax) + Math.PI, 1, 0xffffff);
  } // los focos miran al campo
  // la base paquistaní de la ONU en el campo: tiendas, vehículos blancos y puertas con sacos terreros
  MAT = M.CLOTH;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const x = cx - 14 + c * 6,
        z = cz - 8 + r * 7;
      B(x, 0.7, z, 4.2, 1.4, 3, 0xc8b88a, { hid: 1 });
      B(x, 1.55, z, 4.3, 0.5, 2.2, 0xb8a87a, { rx: 0, hid: 1 });
      stadTent(x, z, (r + c) % 2);
    }
  // el aparcamiento: un BTR y un camión blanco de la ONU por el lado este, otro camión y Humvees junto a la grada norte
  // (los blindados de cajas que había antes ya no están: solo quedan modelos de verdad)
  const par = CUR ? CUR.group : world,
    at = (g, x, z, ry) => {
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      if (g.parent !== par) par.add(g);
    };
  at(btrVehicle().g, cx + 21, cz - 11.5, -PH);
  at(m939White(), cx + 21, cz, -PH);
  at(m939White(), cx + 6, cz - 15.5, PH);
  stadVeh(cx - 6, cz - 16, 0, Math.PI * 0.1);
  stadVeh(cx - 1.5, cz - 16.4, 2, -Math.PI * 0.06);
  for (const [gx, gz, ax] of [
    [cx + rx + 1, cz, 'z'],
    [cx - rx - 1, cz, 'z'],
    [cx, cz + rz + 1, 'x'],
    [cx, cz - rz - 1, 'x']
  ])
    for (let k = -1; k <= 1; k++) {
      const i = Math.floor(gx + (ax === 'x' ? k * 2 + 3 : 2)),
        j = Math.floor(gz + (ax === 'z' ? k * 2 + 3 : 2));
      addCover('sandbag', i, j, ax);
    }
  rnd();
  rnd(); // las dos banderas que había aquí (dejo sus tiradas)
}
function stadTent(x, z, r) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = r ? Math.PI : 0;
  (CUR ? CUR.group : world).add(g);
  withModel('tent', M_ => {
    const q = lodMesh(M_.geos.body, M_.mat);
    q.scale.setScalar(0.56 / 1.5);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
}
// el modelo de Humvee sin el anillo de la torreta ni el arma (todos los triángulos por encima del techo de la cabina)
let HMV_BARE = null;
function humveeBare(M_) {
  if (HMV_BARE) return HMV_BARE;
  const src = M_.geos.body,
    P_ = src.attributes.position,
    I_ = src.index.array,
    out = [];
  for (let t = 0; t < I_.length; t += 3) {
    const y = Math.max(P_.getY(I_[t]), P_.getY(I_[t + 1]), P_.getY(I_[t + 2]));
    if (y < 2.0) out.push(I_[t], I_[t + 1], I_[t + 2]);
  } // conserva el techo, solo quita la antena de radio
  const g = new T.BufferGeometry();
  for (const k in src.attributes) g.setAttribute(k, src.attributes[k]);
  g.setIndex(out);
  g.computeBoundingSphere();
  return (HMV_BARE = g);
}
function stadVeh(x, z, k, dry) {
  const truck = k === 1 || k === 3,
    par = CUR ? CUR.group : world;
  if (truck) {
    const g = m939Covered();
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI / 2 + (dry || 0);
    par.add(g);
    return;
  }
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = -Math.PI / 2 + (dry || 0);
  g.scale.setScalar(1 / 1.5);
  par.add(g);
  withModel('humvee', M_ => {
    const q = lodMesh(humveeBare(M_), M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
}
/* Black Hawks derribados, hechos con el modelo de verdad en cuanto carga */
let WRECKS = {},
  WRECK_G = {};
const crashed = k => !!(MIS && MIS.crashed && MIS.crashed.includes(k)) || !!WRECKS[k];
function wreck(x, z, ry, s64) {
  WRECKS[s64 ? 's64' : 's61'] = true;
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
  const inner = new T.Group();
  g.add(inner);
  inner.scale.setScalar(1 / 1.5);
  WRECK_G[s64 ? 's64' : 's61'] = { g, inner };
  if (s64) {
    inner.rotation.set(0.06, 0, 0.1);
    inner.position.y = -0.15;
  } else {
    inner.rotation.set(0.12, 0, 1.3);
    inner.position.set(-0.4, 1.05, 0);
  }
  const fill = () => {
    const { geos, mat } = heliAsset;
    for (const n of ['Fuselage', 'Door open']) {
      const m = lodMesh(geos[n], mat);
      m.castShadow = m.receiveShadow = true;
      inner.add(m);
    }
    const r = new T.Mesh(geos['main rotor prop'], mat);
    r.castShadow = true;
    if (s64) {
      r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]);
      r.rotation.set(0, 0.7, 0);
      inner.add(r);
    } else {
      r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]);
      r.rotation.set(0, 0.5, 0);
      inner.add(r);
    } // todavía sobre su buje, con el helicóptero tumbado de lado
    const t = new T.Mesh(geos['TAIL ROTOR'], mat);
    t.position.set(HELI_TAIL[0], HELI_TAIL[1], HELI_TAIL[2]);
    t.rotation.x = 0.6;
    inner.add(t);
  };
  if (heliAsset) fill();
  else heliWaiters.push(fill);
  MAT = M.METAL;
  if (s64) GHOST = true; // el 6-4 queda entre escombros que coloca su misión: las placas se tiran solo por la secuencia aleatoria
  for (let k = 0; k < 14; k++) {
    const a = rnd() * 6.28,
      d = rr(1.5, 6);
    B(
      x + Math.cos(a) * d,
      0.06,
      z + Math.sin(a) * d,
      rr(0.2, 0.8),
      rr(0.04, 0.12),
      rr(0.2, 0.6),
      pick([0x3d4235, 0x2a2c28, 0x1c1c1a, 0x6a6a64]),
      { ry: rnd() * 3 }
    );
  }
  GHOST = false;
  emitters.push({
    x,
    z,
    y: 1.2,
    rate: 30,
    life: 9,
    vy: 1.2,
    s0: 0.35,
    s1: 1.8,
    fire: s64 ? 0.25 : 0.4,
    acc: 0,
    sp: 0.6
  });
  const cells = [],
    o = { kind: 'wreck', val: 0.8, cells, i: Math.floor(x), j: Math.floor(z), g: null };
  for (let j = Math.floor(z) - 2; j <= Math.floor(z) + 2; j++)
    for (let i = Math.floor(x) - 2; i <= Math.floor(x) + 2; i++) {
      if (!walk(i, j)) continue;
      if (Math.hypot(i + 0.5 - x, j + 0.5 - z) > 2.6) continue;
      const k = idx(i, j);
      cells.push(k);
      grid[k] = 2;
      cov[k] = o;
      topH[k] = 1.6;
    }
}
function parkedHeli(x, z, ry) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.scale.setScalar(1 / 1.5);
  (CUR ? CUR.group : world).add(g);
  const fill = () => {
    const { geos, mat } = heliAsset;
    for (const n of ['Fuselage', 'Door open']) {
      const m = lodMesh(geos[n], mat);
      m.castShadow = true;
      g.add(m);
    }
    const r = new T.Mesh(geos['main rotor prop'], mat);
    r.position.set(HELI_HUB[0], HELI_HUB[1], HELI_HUB[2]);
    r.rotation.y = rnd() * 1.5;
    r.castShadow = true;
    g.add(r);
    const t = new T.Mesh(geos['TAIL ROTOR'], mat);
    t.position.set(HELI_TAIL[0], HELI_TAIL[1], HELI_TAIL[2]);
    g.add(t);
  };
  if (heliAsset) fill();
  else heliWaiters.push(fill);
}
function littleBird() {
  const g = new T.Group(),
    body = [],
    K = 0x1a1a1a,
    proc = new T.Group();
  g.add(proc);
  REFL.push(g);
  body.push(
    [1.5, 1.3, 2.2, 0, 1.15, 0.2, K, 0, 0, 0, 's'],
    [0.5, 0.5, 4.2, 0, 1.35, -2.6, K, Math.PI / 2, 0, 0, 'c'],
    [1.25, 0.7, 1.3, 0, 1.2, 1.05, 0x2a3a44, 0, 0, 0, 's']
  );
  body.push(
    [0.07, 0.07, 2.6, 0.55, 0.25, 0.2, 0x2a2a28],
    [0.07, 0.07, 2.6, -0.55, 0.25, 0.2, 0x2a2a28],
    [0.05, 0.6, 0.05, 0.5, 0.55, 0.7, 0x2a2a28, 0, 0, -0.4],
    [0.05, 0.6, 0.05, -0.5, 0.55, 0.7, 0x2a2a28, 0, 0, 0.4],
    [0.05, 0.6, 0.05, 0.5, 0.55, -0.4, 0x2a2a28, 0, 0, -0.4],
    [0.05, 0.6, 0.05, -0.5, 0.55, -0.4, 0x2a2a28, 0, 0, 0.4],
    [0.08, 0.9, 0.6, 0, 1.9, -4.6, K],
    [1.1, 0.06, 0.4, 0, 1.45, -4.4, K]
  );
  body.push(
    [0.12, 0.12, 0.9, 0.9, 1.0, 0.4, 0x3a3a38, Math.PI / 2, 0, 0, 'c'],
    [0.12, 0.12, 0.9, -0.9, 1.0, 0.4, 0x3a3a38, Math.PI / 2, 0, 0, 'c'],
    [0.5, 0.08, 0.08, 0.7, 1.0, 0.4, 0x2a2a28],
    [0.5, 0.08, 0.08, -0.7, 1.0, 0.4, 0x2a2a28]
  );
  const m = new T.Mesh(partGeo(body), heliMat);
  m.castShadow = true;
  proc.add(m);
  const rotor = new T.Group();
  rotor.position.set(0, 2.05, 0.1);
  g.add(rotor);
  const RB = [[0.3, 0.25, 0, 0, 0, 0, K, 0, 0, 0, 'c']];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    RB.push([4.2, 0.04, 0.22, Math.cos(a) * 2.1, 0, -Math.sin(a) * 2.1, 0x222222, 0, a, 0]);
  }
  const prm = new T.Mesh(partGeo(RB), heliMat);
  rotor.add(prm);
  const tail = new T.Group();
  g.add(tail);
  g.scale.setScalar(1 / 1.5);
  // los dos pilotos en la cabina: el modelo Delta, desarmado, con las manos en el cíclico y el colectivo
  const pilots = [];
  const seatPilots = () =>
    [-1, 1].forEach(sd => {
      const r = buildRig('delta', { gun: 'car', pilot: true });
      r.gun.visible = false;
      r.root.scale.setScalar(1.5);
      r.root.position.set(sd * 0.36, 0.45, -0.14);
      if (r.model) r.pelvis.position.y = 0.52 / SOLD_K;
      r.hipL.rotation.x = r.hipR.rotation.x = -1.62;
      r.knL.rotation.x = r.knR.rotation.x = 1.32;
      r.chest.rotation.x = -0.08;
      r.hipL.rotation.z = 0.08;
      r.hipR.rotation.z = -0.08;
      r.shR.rotation.x = -0.75;
      r.elR.rotation.x = -0.85;
      r.shL.rotation.x = -0.55;
      r.elL.rotation.x = -1.0;
      r.shL.rotation.z = 0.12;
      r.neck.rotation.y = sd * -0.12;
      g.add(r.root);
      pilots.push(r);
    });
  // el modelo AH-6 subido (miniguns y lanzacohetes) sustituye al provisional en cuanto carga
  withModel('mh6', M_ => {
    const add = (geo, par) => {
      const q = lodMesh(geo, M_.mat);
      q.castShadow = true;
      q.receiveShadow = true;
      par.add(q);
      return q;
    };
    proc.visible = false;
    prm.visible = false;
    seatPilots(); // (aquí, ya con el modelo cargado: para entonces ya se pueden montar los soldados)
    add(M_.geos.body, g);
    const gl = add(M_.geos.glass, g);
    gl.material =
      LB_GLASS ||
      (LB_GLASS = new T.MeshPhongMaterial({ color: 0x1e2124, specular: 0x5a5e62, shininess: 70, side: T.DoubleSide }));
    rotor.position.set(LB_HUB[0], LB_HUB[1], LB_HUB[2]);
    add(M_.geos.rotor, rotor);
    tail.position.set(LB_TAIL[0], LB_TAIL[1], LB_TAIL[2]);
    add(M_.geos.tail, tail);
  });
  return { g, rotor, tail, pilots };
}
let LB_GLASS = null;
function rb(u, v, y, su, sy, sv, c, o) {
  const p = AIRP(u, v);
  B(p[0], y, p[1], su, sy, sv, c, Object.assign({ ry: AIR_RY }, o || {}));
}
