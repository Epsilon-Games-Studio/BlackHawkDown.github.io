/* ====================================================================================================
 * world/world-build.js
 *
 * Construcción del mundo: el barrio de la misión 1 y buildWorld(), que monta la ciudad,
 * la región y todo lo que no va por chunks.
 * ================================================================================================== */

let G, objRing, moveMark, supMark;
function buildDistrict() {
  const X = OX,
    Z = OZ;
  const rsv = (x0, y0, x1, y1) => {
    for (let j = y0; j <= y1; j++)
      for (let i = x0; i <= x1; i++) if (inB(X + i, Z + j)) reserved[idx(X + i, Z + j)] = 1;
  };
  const cv = (k, i, j, dir, opt) => addCover(k, X + i, Z + j, dir, opt);
  // sitios clave: el Hotel Olympic y, una manzana al norte, el edificio objetivo
  building(X + 37, Z + 15, 7, 7, 6, { col: 0xf1eee4, base: 0xd8d2c2, hotel: true, force: true, cren: true });
  targetCompound(X + 37, Z + 0, 13, 10);
  tower(X + 46, Z + 17);
  constructionSite(X + 15, Z + 37, 7, 6, 4);
  crane(X + 24, Z + 39);
  rsv(14, 36, 28, 44);
  for (let j = 36; j <= 44; j++)
    for (let i = 14; i <= 28; i++) if (grid[idx(X + i, Z + j)] === 0) ground[idx(X + i, Z + j)] = 2;
  rsv(36, 36, 50, 49);
  for (let i = 36; i <= 48; i += 3) shack(X + i, Z + 48, 3, 2);
  for (let j = 37; j <= 45; j += 3) shack(X + 49, Z + j, 2, 3);
  MKT = true;
  for (const j of [38, 41, 44]) for (let i = 37; i <= 47; i += 2) if (rnd() < 0.85) cv('stall', i, j);
  for (let k = 0; k < 8; k++) cv(pick(['crates', 'crates', 'tires', 'barrel']), 37 + ri(12), 37 + ri(10));
  MKT = false;
  const XS = [
      [0, 8],
      [14, 28],
      [36, 50],
      [56, 63]
    ],
    YS = [
      [0, 9],
      [15, 27],
      [36, 49],
      [55, 63]
    ];
  for (const xr of XS)
    for (const yr of YS) {
      if (xr[0] === 36 && yr[0] === 36) continue;
      if (xr[0] === 36 && yr[0] === 0) continue; // el recinto del objetivo ocupa esta manzana
      if (xr[0] === 14 && yr[0] === 36) continue;
      if (xr[0] === 36 && yr[0] === 15) {
        fillBlock(X + 44, Z + 15, X + 50, Z + 16);
        fillBlock(X + 48, Z + 18, X + 50, Z + 21);
        continue;
      }
      fillBlock(X + xr[0], Z + yr[0], X + xr[1], Z + yr[1]);
    }
  fillBlock(X + 14, Z + 45, X + 28, Z + 49);
  // (la fuente que había aquí fuera ya no está: ahora la fuente es la del patio del objetivo)
  cv('bus', 37, 26, 'x', { burnt: true });
  for (const [i, j] of [
    [45, 26],
    [47, 26],
    [49, 26]
  ])
    cv('stall', i, j);
  cv('sandbag', 42, 22, 'x');
  cv('sandbag', 43, 22, 'x');
  cv('crates', 48, 23);
  for (const x of [36.6, 40.6, 44.6, 48.6]) palm(X + x, Z + 22.4);
  palm(X + 39.5, Z + 27.4);
  palm(X + 46.5, Z + 24.8);
  // avenida al oeste (aproximación)
  cv('car', 6, 29, 'x', { burnt: true });
  cv('crates', 4, 34);
  cv('barrel', 9, 35, null, { fuel: true });
  cv('van', 13, 32, 'x');
  cv('rubble', 16, 29);
  cv('rubble', 17, 30);
  cv('tires', 11, 28);
  cv('pickup', 19, 34, 'x', { burnt: true });
  cv('barrier', 23, 30, 'z');
  cv('barrier', 23, 31, 'z');
  cv('sandbag', 26, 28, 'z');
  cv('barrel', 21, 28);
  cv('barrel', 25, 35, null, { fuel: true });
  cv('car', 26, 33, 'x');
  cv('crates', 2, 28);
  cv('wall', 15, 35, 'x');
  // cruce
  cv('car', 31, 30, 'z', { burnt: true });
  cv('barrel', 34, 29);
  cv('crates', 29, 35);
  cv('tires', 35, 34);
  // barricadas de la milicia
  for (const j of [28, 29, 30, 33, 34, 35]) cv('sandbag', 40, j, 'z');
  cv('barrel', 41, 32, null, { fuel: true });
  cv('tires', 41, 31);
  for (const i of [29, 30, 31, 33, 34, 35]) cv('sandbag', i, 24, 'x');
  cv('barrel', 32, 23, null, { fuel: true });
  for (const i of [29, 30, 34, 35]) cv('barrier', i, 39, 'x');
  cv('crates', 32, 40);
  cv('van', 46, 29, 'x', { burnt: true });
  cv('car', 44, 34, 'x', { burnt: true });
  cv('rubble', 49, 31);
  cv('car', 53, 33, 'x');
  cv('rubble', 58, 30);
  cv('bus', 59, 33, 'x');
  cv('car', 31, 15, 'z');
  cv('rubble', 33, 8);
  cv('crates', 30, 4);
  cv('pickup', 30, 46, 'z');
  cv('rubble', 34, 52);
  cv('barrel', 33, 58);
  for (const i of [3, 15, 24, 44, 52, 60]) palm(X + i + 0.5, Z + 35.6);
  for (const j of [5, 17, 46, 57]) palm(X + 29.4, Z + j + 0.5);
}
function buildWorld() {
  if (world) scene.remove(world);
  batchReset();
  SHK.force = true;
  while (overlay.children.length) overlay.remove(overlay.children[0]);
  seed = 1993;
  S62_GHOSTS = [];
  STAD_GH = [];
  MKT_WIDE = [];
  GHOST = false;
  world = new T.Group();
  scene.add(world);
  ORX = ORZ = 0;
  TZONE = null;
  grid = new Uint8Array(W * H);
  topH = new Float32Array(W * H);
  cov = new Array(W * H).fill(null);
  reserved = new Uint8Array(W * H);
  ground = new Uint8Array(W * H);
  HG = new Array(W * H);
  CHUNKS = new Map();
  GEN = [];
  CUR = null;
  heliWaiters = [];
  FOCUS2 = null;
  units = [];
  us = [];
  them = [];
  fx = [];
  sched = [];
  BX = [];
  CY = [];
  nBld = 0;
  emitters = [];
  poles = [];
  wires = [];
  POLE_I = 0;
  FROPES = [];
  palms = [];
  flags = [];
  birds = [];
  AW = [];
  awMesh = null;
  wireGeo = null;
  heli = null;
  LIGHTSRC = [];
  GLOWS = [];
  glowMesh = null;
  BLDS = [];
  BID = new Int32Array(W * H).fill(-1);
  PLANNING = true;
  noVehPlan();
  planStreets();
  buildDistrict();
  planBlocks();
  stadium();
  archGate();
  k4();
  mainRoad();
  // en las calles solo está lo que ya se ha caído a estas alturas de la batalla
  WRECKS = {};
  if (crashed('s61')) wreck(LM.s61.x, LM.s61.z, 0.5, false);
  if (crashed('s64')) wreck(LM.s64.x, LM.s64.z, -0.9, true);
  for (let j = 352; j <= 368; j++) for (let i = 263; i <= 279; i++) if (grid[idx(i, j)] === 0) ground[idx(i, j)] = 2;
  streetJunk();
  planLights();
  planAirport();
  planRegion();
  // aceras donde las calles tocan los edificios
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const k = idx(i, j);
      if (STR[k] !== 2 || grid[k] === 1) continue;
      if (
        (i + 1 < W && grid[k + 1] === 1 && !STR[k + 1]) ||
        (i > 0 && grid[k - 1] === 1 && !STR[k - 1]) ||
        (j + 1 < H && grid[k + W] === 1 && !STR[k + W]) ||
        (j > 0 && grid[k - W] === 1 && !STR[k - W])
      )
        ground[k] = 5;
    }
  // postes y cables: las líneas del barrio y las avenidas largas
  const P = (x, z) => [OX + x, OZ + z];
  const pl = [];
  for (let i = 1; i < 64; i += 6) pl.push(P(i + 0.5, 28.2));
  poleLine(pl);
  const pl2 = [];
  for (let j = 1; j < 64; j += 6) pl2.push(P(35.8, j + 0.5));
  poleLine(pl2);
  const pl3 = [];
  for (let i = 2; i < 64; i += 7) pl3.push(P(i + 0.5, 14.8));
  poleLine(pl3);
  const pl4 = [];
  for (let j = 3; j < 64; j += 7) pl4.push(P(9.2, j + 0.5));
  poleLine(pl4);
  const pl5 = [];
  for (let i = 4; i < 64; i += 7) pl5.push(P(i + 0.5, 50.2));
  poleLine(pl5);
  const av = (a, b, step, fixed, vert) => {
    const L = [];
    for (let t = a; t <= b; t += step) {
      const x = vert ? fixed : t,
        z = vert ? t : fixed;
      if (
        inB(Math.floor(x), Math.floor(z)) &&
        grid[idx(Math.floor(x), Math.floor(z))] === 0 &&
        cityDs(x, z) > 0.18 &&
        coastS(x, z) < -27
      )
        L.push([x, z]);
      else if (L.length > 1) {
        poleLine(L.splice(0));
      } else L.length = 0;
    }
    if (L.length > 1) poleLine(L);
  };
  av(4, OZ - 6, 8, OX + 35.8, true);
  av(OZ + 70, H - 12, 8, OX + 35.8, true);
  av(4, OX - 6, 8, OZ + 28.2, false);
  av(OX + 70, W - 12, 8, OZ + 28.2, false);
  av(4, W - 12, 8, 317.5, false);
  s62Clear();
  PLANNING = false;

  // cables (animados)
  const wp = [],
    wm = [];
  let span = 0;
  for (const line of wires)
    for (let k = 0; k < line.length - 1; k++) {
      const a = line[k],
        b = line[k + 1];
      span++;
      for (const off of [-0.4, 0.4]) {
        const dx = b[0] - a[0],
          dz = b[2] - a[2],
          horiz = Math.abs(dx) > Math.abs(dz),
          L = Math.hypot(dx, dz) || 1;
        const perp = [-dz / L, dx / L];
        let prev = null,
          prevM = null;
        const down = a[1] < 1 || b[1] < 1,
          NS = down ? 24 : 10;
        let dc = null;
        for (let s = 0; s <= NS; s++) {
          const t = s / NS,
            sf = Math.sin(t * Math.PI),
            sag = sf * (down ? 2.6 : 0.55);
          const y = Math.max(0.03 + Math.abs(off) * 0.02 * (off > 0 ? 1 : 2), a[1] + (b[1] - a[1]) * t - sag),
            lie = y < 0.1;
          const p = [
              a[0] + dx * t + (horiz ? 0 : off) * (lie ? 0.6 : 1),
              y,
              a[2] + dz * t + (horiz ? off : 0) * (lie ? 0.6 : 1)
            ],
            mm = [lie ? 0 : sf * (down ? 0.35 : 1), perp[0], perp[1], span * 1.7 + off];
          if (prev) {
            wp.push(...prev, ...p);
            wm.push(prevM, mm);
          }
          prev = p;
          prevM = mm;
          if (down) (dc || (dc = [])).push(new T.Vector3(p[0], p[1] + 0.015, p[2]));
        }
        if (dc) {
          world.add(
            new T.Mesh(
              new T.TubeGeometry(new T.CatmullRomCurve3(dc), 48, 0.022, 5, false),
              CABLE_MAT || (CABLE_MAT = new T.MeshLambertMaterial({ color: 0x1e1b18 }))
            )
          );
          dc = null;
        }
      }
    }
  wireBase = new Float32Array(wp);
  wireMeta = wm;
  wireGeo = new T.BufferGeometry();
  wireGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(wp), 3));
  world.add(new T.LineSegments(wireGeo, new T.LineBasicMaterial({ color: 0x2a2622 })));

  ocean = makeOcean();
  buildGlows();
  makeLaundry();
  makeLitter();
  makeBirds();
  if (MIS.ambHeli) makeHeli(MIS.ambHeli);
  ORBITS = (MIS.orbits || []).map(o => {
    const h = o.lb ? littleBird() : makeHeliObj();
    if (o.lb) world.add(h.g);
    if (o.c2) c2Cabin(h);
    return Object.assign({ h, a: rnd() * 6.283 }, o);
  });
  initParticles();
  initChunks();
  initShards();
  initDecals();
  initMarks();
  trickles = [];
  const E = (x, z, o) => emitters.push(Object.assign({ x, z, acc: 0 }, o));
  E(OX + 45, OZ + 34.5, { y: 0.9, rate: 60, life: 8, vy: 1.3, s0: 0.3, s1: 1.5, fire: 1, sp: 0.5 });
  E(OX + 47, OZ + 29.5, { y: 1.2, rate: 45, life: 8, vy: 1.2, s0: 0.28, s1: 1.3, fire: 0.6, sp: 0.5 });
  E(OX + 20, OZ + 20.5, { y: 3.9, rate: 55, life: 10, vy: 1.4, s0: 0.35, s1: 1.9, fire: 0.7, sp: 0.7 });
  // barricadas de neumáticos ardiendo y fuegos por toda la ciudad
  for (const [x, z] of [
    [150, 180],
    [330, 300],
    [420, 205],
    [200, 380],
    [118, 300],
    [380, 450],
    [290, 150],
    [460, 330],
    [236, 470],
    [90, 120]
  ])
    if (cityDs(x, z) > 0.3) E(x, z, { y: 1.2, rate: 38, life: 13, vy: 1.6, s0: 0.6, s1: 2.8, fire: 0.35, sp: 0.9 });

  // objetivo y marcadores
  const zg = new T.RingGeometry(OBJ.r - 0.3, OBJ.r, 48);
  zg.rotateX(-Math.PI / 2);
  objRing = new T.Mesh(zg, new T.MeshBasicMaterial({ color: 0xe7a63d, transparent: true, opacity: 0.75 }));
  objRing.position.set(OBJ.x, 0.08, OBJ.z);
  grounded(objRing);
  moveMark = new T.Mesh(
    new T.RingGeometry(0.36, 0.47, 20),
    new T.MeshBasicMaterial({ color: 0x7fb8ff, transparent: true, opacity: 0, side: T.DoubleSide, depthTest: false })
  );
  moveMark.rotation.x = -Math.PI / 2;
  grounded(moveMark);
  supMark = new T.Mesh(
    new T.RingGeometry(1.9, 2.1, 24),
    new T.MeshBasicMaterial({ color: 0xe7a63d, transparent: true, opacity: 0, side: T.DoubleSide })
  );
  supMark.rotation.x = -Math.PI / 2;
  grounded(supMark);

  makeSquad(squadType);
  MIS.spawn();
  spawnCivs();
}

function nearestFree(i, j) {
  for (let r = 0; r < 14; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (walk(i + di, j + dj)) return [i + di, j + dj];
      }
  return [i, j];
}
