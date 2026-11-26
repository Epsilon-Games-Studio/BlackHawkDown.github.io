/* ====================================================================================================
 * world/airport.js
 *
 * El aeropuerto: la base de la Task Force Ranger
 * ================================================================================================== */

let C130_GEO = null;
function c130Geo() {
  if (C130_GEO) return C130_GEO;
  const L = [],
    gc = 0x7c837f,
    dk = 0x5a615c;
  L.push([3.2, 15, 0, 0, 2.6, 0, gc, PH, 0, 0, 'c']);
  L.push([3.2, 3.0, 3.6, 0, 2.55, 8.3, gc, 0, 0, 0, 's']);
  L.push([3.2, 6.2, 0, 0, 3.0, -10.6, gc, -PH, 0, 0, 'c', 0.42]);
  L.push([2.0, 0.55, 1.1, 0, 3.55, 9.0, 0x1c2830, -0.45]);
  L.push([27, 0.38, 2.9, 0, 4.25, 1.0, gc]);
  L.push([26, 0.12, 0.5, 0, 4.25, -0.55, dk]);
  for (const s of [-1, 1])
    for (const e of [4.6, 8.7]) {
      L.push([1.15, 3.3, 0, s * e, 3.85, 2.7, dk, PH, 0, 0, 'c']);
      L.push([0.5, 0.5, 0.5, s * e, 3.85, 4.4, 0x2a2a2a, 0, 0, 0, 's']);
      L.push([3.6, 0.07, 0.24, s * e, 3.85, 4.5, 0x232323, 0, 0, 0.35]);
      L.push([3.6, 0.07, 0.24, s * e, 3.85, 4.5, 0x232323, 0, 0, -1.22]);
    }
  L.push([0.35, 4.8, 4.4, 0, 5.6, -11.6, gc]);
  L.push([10.5, 0.25, 2.7, 0, 4.0, -12.1, gc]);
  for (const s of [-1, 1]) {
    L.push([0.95, 1.25, 4.8, s * 1.85, 1.45, 0.4, dk]);
    L.push([0.9, 0.45, 0, s * 1.85, 0.45, -0.4, 0x1a1a1a, 0, 0, PH, 'c']);
    L.push([0.9, 0.45, 0, s * 1.85, 0.45, 1.2, 0x1a1a1a, 0, 0, PH, 'c']);
  }
  L.push([0.6, 0.5, 0, 0, 0.35, 7.4, 0x1a1a1a, 0, 0, PH, 'c']);
  L.push([0.12, 1.4, 0.12, 0, 1.0, 7.4, dk]);
  L.push([2.8, 0.06, 1.4, 0, 2.6, -13.2, 0x2a2e2c]);
  C130_GEO = partGeo(L);
  return C130_GEO;
}
function c130(u, v) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = AIR_RY;
  (CUR ? CUR.group : world).add(g);
  const m = new T.Mesh(c130Geo(), heliMat);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  // el modelo Hercules subido (40 m de envergadura) sustituye al provisional cuando llega
  if (CUR) CUR.ext = Math.max(CUR.ext || 0, 22);
  withModel('c130', M_ => {
    m.visible = false;
    const q = lodMesh(M_.geos.body, M_.mat);
    q.scale.setScalar(1.39);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
}
function truck(u, v, kind) {
  MAT = M.METAL;
  const tan = pick([0xb8a47c, 0xa89a6e, 0x6a6a4a]);
  rb(u, v + 2.6, 1.2, 2.3, 1.5, 1.7, tan);
  rb(u, v + 3.6, 0.9, 2.2, 0.8, 0.6, shade(tan, 0.9));
  rb(u, v + 3.0, 1.55, 2.0, 0.5, 0.08, 0x2c3a44, { m: M.GLASS });
  if (kind === 'fuel') {
    const p = AIRP(u, v - 1.2);
    Cs(p[0], 1.6, p[1], 2.1, 5.2, 2.1, 0xc8c4b8, { rx: PH, ry: AIR_RY, ord: 'YXZ', m: M.METAL });
  } else {
    rb(u, v - 1.2, 0.95, 2.3, 0.3, 5.2, shade(tan, 0.85));
    rb(u, v - 1.2, 1.75, 2.3, 1.3, 5.0, pick([0x6a6448, 0x8a7a54]), { m: M.CLOTH });
  }
  for (const k of [3.0, -0.4, -2.4])
    for (const s of [-1.05, 1.05]) {
      const q = AIRP(u + s, v + k);
      C(q[0], 0.45, q[1], 0.45, 0.35, 0x1d1c1a, { rx: PH, ry: AIR_RY + PH, ord: 'YXZ', m: M.WHEEL });
    }
}
function tentM(u, v, r) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = AIR_RY + (r % 2 ? Math.PI : 0);
  (CUR ? CUR.group : world).add(g);
  withModel('tent', M_ => {
    const q = lodMesh(M_.geos.body, M_.mat);
    q.scale.setScalar(1 / 1.5);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
}
function hangarJ(u, v) {
  if (CUR) CUR.ext = Math.max(CUR.ext || 0, 30); // 50 m de largo: se mete en los chunks de al lado
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = AIR_RY;
  (CUR ? CUR.group : world).add(g);
  // plataforma de hormigón delante de las puertas mientras llega el modelo
  MAT = M.CONC;
  rb(u, v + 27, 0.02, 30, 0.04, 6, 0x9a968c);
  withModel('hangar', M_ => {
    M_.mat.color.setRGB(1.38, 1.34, 1.24);
    const q = lodMesh(M_.geos.body, M_.mat);
    q.scale.setScalar(1 / 1.8);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
}
function hangar(u, v, L, Wd, col) {
  MAT = M.METAL;
  rb(u, v, 3.2, L, 6.4, Wd, col);
  const p = AIRP(u, v);
  Cs(p[0], 6.4, p[1], Wd, L, Wd * 0.55, shade(col, 0.95), { rx: PH, ry: AIR_RY + PH, ord: 'YXZ', m: M.METAL });
  for (let k = -2; k <= 2; k++)
    rb(u + (k * L) / 5.2, v, 6.4 + Wd * 0.275 - 0.05, 0.25, 0.12, Wd * 0.5, shade(col, 0.8));
  rb(u, v + Wd / 2 + 0.02, 3.0, L * 0.7, 6, 0.2, 0x1c1c1a, { m: M.GEN });
  rb(u, v + Wd / 2 + 0.1, 6.2, L * 0.74, 0.4, 0.4, 0x7a7a74, { m: M.METAL });
}
function guardTower(u, v) {
  // la torre de guardia subida; unas cajas ocultas le dan la plataforma y los postes a las balas
  MAT = M.WOOD;
  for (const [a, b] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ])
    rb(u + a * 1.2, v + b * 1.2, 2.3, 0.2, 4.6, 0.2, 0x5a4a38, { hid: 1 });
  rb(u, v, 4.7, 3.2, 0.3, 3.2, 0x6a5a44, { hid: 1 });
  const p = AIRP(u, v);
  prop('kit3', 'gtow', p[0], 0, p[1], AIR_RY + Math.round(phs(u, v, 23) * 4) * PH, 1, 0xffffff);
}
// las barreras de la base: filas de bastiones rellenos (la barrera de sacos subida), tres por cada vano de 2,3 m, en escuadra con la línea
function jersey(u, v, n, along) {
  MAT = M.BAG;
  for (let k = 0; k < n; k++) {
    const uu = along ? u + k * 2.3 : u,
      vv = along ? v : v + k * 2.3;
    rb(uu, vv, 0.35, along ? 2.2 : 0.73, 0.69, along ? 0.73 : 2.2, 0xa89a7a, { hid: 1 });
    for (let q = -1; q <= 1; q++) {
      const pu = uu + (along ? q * 0.735 : 0),
        pv = vv + (along ? 0 : q * 0.735),
        p = AIRP(pu, pv),
        h = phs(pu, pv, 72);
      prop('deco8', 'hesco', p[0], 0, p[1], AIR_RY + (h - 0.5) * 0.06, 1, 0xffffff);
    }
  }
}
function wire(u0, u1, v) {
  MAT = M.METAL;
  const a = AIRP((u0 + u1) / 2, v);
  Cs(a[0], 0.45, a[1], 0.8, Math.abs(u1 - u0), 0.8, 0x4a4a46, { rx: PH, ry: AIR_RY + PH, ord: 'YXZ' });
}
