/* ====================================================================================================
 * missions/tutorial/afternoon.js
 *
 * La tarde sigue: tres ejercicios y tres unidades, desde las cinco. La luz sigue a la historia, no al reloj:
 * una deriva lenta mientras tira el Romeo 4-1, el sol naranja en las tiendas y la última luz de la tarde en la playa.
 * ================================================================================================== */

'use strict';

const TZ_WD = { sgt: [-79, -146.4], lie: [-79, -144.4], flag: [-55.6, -137.4] };
const TZ_BC = {
  hv: [
    [-62, 76, 0],
    [-49.5, 77.2, 0.22]
  ],
  sgt: [-55.8, 80.6],
  buoys: [
    [-68, 103],
    [-38, 103]
  ],
  mid: [-53, 103],
  water: [-53, 105]
};
function tzSun(dt) {
  if (G.m.sunH == null) {
    G.m.sunH = MIS.hour;
    G.m.sunGoal = 16.95;
    G.m.sunRate = 0.0008;
  }
  G.m.sunH += clamp(G.m.sunGoal - G.m.sunH, -G.m.sunRate * dt, G.m.sunRate * dt);
  G.sunShift = G.m.sunH - G.sun0 - (G.t * TIMESCALE) / 3600;
}
// la clase de atención a heridos junto a las tiendas: el Romeo 5-1, cinco hombres alrededor de su sargento
function tzWoundClass(R) {
  const W = (G.m.wd = {}),
    names = ['Cabo Mike Hale', 'Esp. Pete Kowalski', 'Esp. Ray Dunn', 'Sold. Jim Cole', 'Esp. Luis Ortega'];
  W.specs = names.map((n, i) =>
    Object.assign({}, RANGERS[i === 4 ? 5 : i === 0 ? 0 : i], RSPEC, {
      name: n,
      unitName: 'Romeo 5-1',
      role: i === 4 ? 'Sanitario' : i === 0 ? 'Jefe · radio' : 'Fusilero'
    })
  );
  const sg = tzW(...TZ_WD.sgt);
  W.sgt = npcUnit(
    R('Sgto. 1º Bill Mercer', 'Instructor de sanidad', { kit: 'radio', unitName: 'Instrucción' }),
    sg.x,
    sg.z,
    0
  );
  W.men = W.specs.map((sp, i) => {
    const a = (i - 2) * 0.5,
      p = tzW(TZ_WD.sgt[0] + Math.sin(a) * 3.3, TZ_WD.sgt[1] + Math.cos(a) * 3.3),
      u = npcUnit(sp, p.x, p.z, Math.atan2(sg.x - p.x, sg.z - p.z));
    return u;
  });
  const cx = W.men.reduce((a, u) => a + u.x, 0) / 5,
    cz = W.men.reduce((a, u) => a + u.z, 0) / 5;
  W.sgt.face = Math.atan2(cx - sg.x, cz - sg.z);
  for (const u of [W.sgt].concat(W.men)) {
    u.noFire = true;
    u.noAid = true;
    u.idle = true;
  }
}
// la clase de apoyo aéreo en la playa: dos Humvees sin torreta, cuatro hombres junto a cada uno y su sargento; dos boyas amarillas en el agua
function tzHumveeBare(u, v, ry) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  g.rotation.y = ry;
  g.scale.setScalar(1 / 1.5);
  world.add(g);
  withModel('humvee', M_ => {
    const q = lodMesh(humveeBare(M_), M_.mat);
    q.castShadow = true;
    q.receiveShadow = true;
    g.add(q);
  });
  return g;
}
function tzBuoy(u, v) {
  const p = AIRP(u, v),
    g = new T.Group();
  g.position.set(p[0], 0, p[1]);
  world.add(g);
  const Y = 0xe8c21e,
    D = 0x2a2a26,
    cyl = (r0, r1, h, c, y) => {
      const m = new T.Mesh(
        new T.CylinderGeometry(r0, r1, h, 14),
        new T.MeshPhongMaterial({ color: c, shininess: 30, specular: 0x333333 })
      );
      m.position.y = y;
      m.castShadow = true;
      g.add(m);
      return m;
    };
  cyl(0.36, 0.3, 0.5, Y, 0.05);
  cyl(0.37, 0.37, 0.08, D, 0.2);
  cyl(0.28, 0.04, 0.42, Y, 0.5);
  cyl(0.025, 0.025, 0.5, D, 0.9);
  const top = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), new T.MeshPhongMaterial({ color: Y, emissive: 0x3a2a00 }));
  top.position.y = 1.17;
  g.add(top);
  // en cuanto carga, la boya de verdad (el modelo subido, pintada de amarillo) sustituye a la hecha de cilindros
  withModel('u_buoy', M_ => {
    for (const c of g.children.slice()) g.remove(c);
    const m = new T.Mesh(M_.geos.m, M_.mat);
    m.position.y = 0.05; // el casco medio hundido: el agua le llega por la cintura
    m.castShadow = true;
    g.add(m);
  });
  REFL.push(g);
  g.userData.ph = rnd() * 6.28;
  return g;
}
function tzBeachClass(R) {
  const B_ = (G.m.bch = {});
  B_.hv = TZ_BC.hv.map(([u, v, d]) => {
    tzCover(u - 2.3, u + 2.3, v - 0.85, v + 0.85, 'car');
    return tzHumveeBare(u, v, AIR_RY + PH + d);
  });
  const names = [
    'Sgto. Tom Briggs',
    'Cabo Andy Shaw',
    'Esp. Nick Varga',
    'Esp. Carl Penn',
    'Sold. Joe Mills',
    'Esp. Ben Ross',
    'Sold. Rick Yates',
    'Esp. Sam Tully'
  ];
  B_.specs = names.map((n, i) =>
    Object.assign({}, RANGERS[i === 7 ? 5 : i % 5], RSPEC, {
      name: n,
      unitName: 'Romeo 6-2',
      role: i === 7 ? 'Sanitario' : i === 0 ? 'Jefe · radio' : i === 2 ? 'Ametrallador M249' : 'Fusilero'
    })
  );
  const sg = tzW(...TZ_BC.sgt);
  B_.sgt = npcUnit(
    R('Sgto. Frank Doyle', 'Instructor · apoyo aéreo', { kit: 'radio', unitName: 'Instrucción' }),
    sg.x,
    sg.z,
    0
  );
  const spots = [
    [-63.6, 74.3],
    [-60.4, 74.3],
    [-63.2, 78.4],
    [-60.0, 78.6],
    [-51.2, 75.4],
    [-48.0, 75.6],
    [-51.4, 79.6],
    [-47.8, 79.4]
  ];
  B_.men = B_.specs.map((sp, i) => {
    const p = tzW(...spots[i]);
    return npcUnit(sp, p.x, p.z, Math.atan2(sg.x - p.x, sg.z - p.z));
  });
  B_.sgt.face = Math.atan2(tzW(-55.8, 76).x - sg.x, tzW(-55.8, 76).z - sg.z);
  for (const u of [B_.sgt].concat(B_.men)) {
    u.noFire = true;
    u.noAid = true;
    u.idle = true;
  }
  G.m.buoys = TZ_BC.buoys.map(q => tzBuoy(...q));
}
// el ejercicio pasa a la siguiente unidad: la anterior rompe filas y los que esperaban pasan a ser del jugador
function tzHandOver(oldName, npcs, name, role, specs) {
  const og = grpN(oldName);
  if (og) {
    og.hide = true;
    for (const u of og.members) {
      u.npc = true;
      u.noFire = true;
      u.noAid = true;
      u.order = null;
      G.sel.delete(u);
    }
  }
  const p0 = npcs[0],
    g = addGroup({ name, role, kind: 'chalk', specs, at: [p0.x, p0.z], face: p0.face });
  g.members.forEach((u, i) => {
    const n = npcs[i];
    u.x = n.x;
    u.z = n.z;
    u.face = n.face;
    u.stance = 'stand';
    u.path = [];
    u.order = null;
  });
  for (const n of npcs) {
    world.remove(n.m.root);
    dropOverlay(n);
    us = us.filter(o => o !== n);
    units = units.filter(o => o !== n);
  }
  G.sel = new Set();
  buildCards();
  refreshCards();
  return g;
}
// una baja de ejercicio: en el suelo y sangrando, con el reloj rojo alrededor, pero el reloj nunca se cierra y no hay sangre
function drillDown(u) {
  if (u.inB) leaveB(u);
  u.drill = true;
  u.wasDown = true;
  u.hp = 0;
  u.alive = false;
  u.down = true;
  u.bleedOut = true;
  u.dkT = 2.5;
  u.bleedT = 0;
  u.reviveT = 0;
  u.path = [];
  u.order = null;
  G.sel.delete(u);
  u.deathT = G.t;
  u.deadDir = -1;
  u.deadTwist = rr(-0.3, 0.3);
  u.vx = u.vz = 0;
  refreshCards();
}
// haciéndose el muerto: la unidad lo trata como a uno de sus muertos y lo carga; luego se levanta otra vez
function drillKia(b) {
  if (b.inB) leaveB(b);
  b.drill = true;
  b.alive = false;
  b.down = false;
  b.bleedOut = false;
  b.kia = true;
  b.hp = 0;
  b.path = [];
  b.order = null;
  G.sel.delete(b);
  b.deathT = G.t;
  b.deadDir = -1;
  b.deadTwist = rr(-0.3, 0.3);
  b.vx = b.vz = 0;
  b.fetchSaid = false;
  (G.bodies = G.bodies || []).push(b);
  G.bodyT = 0;
  refreshCards();
}
function drillRevive(b) {
  if (!b || b.alive) return;
  const c = b.carriedBy;
  if (c) c.carrying = null;
  b.carriedBy = null;
  b.fetcher = null;
  G.bodies = (G.bodies || []).filter(o => o !== b);
  if (c) {
    const q = findWalk(c.x + Math.cos(c.face) * 0.8, c.z - Math.sin(c.face) * 0.8);
    b.x = q[0] + 0.5;
    b.z = q[1] + 0.5;
  }
  b.kia = false;
  b.down = false;
  b.bleedOut = false;
  b.alive = true;
  b.hp = b.hp0;
  b.dkT = 0;
  b.bleedT = 0;
  b.drill = false;
  b.deathT = null;
  b.elev = 0;
  b.stance = 'stand';
  b.path = [];
  b.order = null;
  const r = b.m.root;
  r.rotation.set(0, r.rotation.y, 0);
  if (b.m.body) {
    b.m.body.rotation.set(0, 0, 0);
    b.m.body.position.set(0, 0, 0);
  }
  if (b.m.gun) b.m.gun.visible = true;
  tzSay(b, c ? `Gracias por el paseo, ${c.name.split(' ').pop()}. Muy cómodo.` : 'Ya estoy vivo otra vez, sargento.');
  refreshCards();
}
