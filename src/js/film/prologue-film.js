/* ====================================================================================================
 * film/prologue-film.js
 *
 * Las dos cinemáticas de la introducción de la campaña. Son cinemáticas de juego, como las de las misiones:
 * la misma cámara (se gira, se acerca y se inclina con los botones de la derecha o con los dedos), las frases en el
 * cuadro de radio de arriba y «Saltar escena». Cada una monta su propio escenario pequeño (un trozo de las afueras
 * hecho a medida, sin la ciudad), que se monta en un momento y se tira al acabar:
 *
 *   aid  · después de «El hambre se convierte en un arma» (8 s): el puesto internacional de ayuda humanitaria. La
 *          gente se pelea por los sacos del camión; desde el fondo llega una técnica con diez milicianos a los lados que
 *          disparan al aire; la gente se va apartando; a diez metros la ametralladora del 50 dispara tres veces y todos
 *          se asustan; el guerrillero del megáfono: «Esta comida es propiedad de Mohamed Farah Aidid...».
 *   raid · antes del aviso del 3 de octubre (20 s): tres todoterrenos por una pista de tierra entre las casas de las
 *          afueras; por detrás llegan el Black Hawk (con los dos tiradores en la puerta) y los dos Little Bird; la
 *          trazadora al capó del primero, humo negro, frenazos que marcan la tierra; los Little Bird les cierran, el
 *          Black Hawk se posa, bajan los Delta, sacan al detenido con las manos en alto y lo llevan a la puerta.
 * ================================================================================================== */

const PRO = { on: false };
const PRO_LEN = { aid: 24.0, raid: 46.5, city: 8.0 }; // el reparto acaba solo cuando la técnica termina de avanzar
const PRO_K = 1 / 1.5; // los modelos de vehículos están en metros; el mundo, en unidades de 1,5 m
const WILLYS_HUB = {FL:  [0.5545,  0.378,  1.1017],  FR:  [-0.6357,  0.378,  1.1152],  RL:  [0.5545,  0.378,  -0.8884],  RR:  [-0.6357,  0.378,  -0.8884]};
const JEEP_HUB = { FL: [0.721, 0.3443, 1.3991], FR: [-0.721, 0.3443, 1.3991], RL: [0.721, 0.3443, -1.2587], RR: [-0.721, 0.3443, -1.2587] };
const proGameScene = () => scene; // el mundo del juego (dentro de cada escena, «scene» es la suya)
const _pv = new T.Vector3(),
  _pv2 = new T.Vector3();

/* ---------------------------------------------------------------- utilidades ---------------------------------------------------------------- */
const proSS = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// una semilla fija por escena: el escenario sale siempre igual
const proRng = seed => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};
// una curva por fotogramas clave [t, x, y, z]: posición y velocidad (Hermite con tangentes por diferencias divididas)
function proPath(keys) {
  return t => {
    const K = keys,
      n = K.length;
    if (t <= K[0][0]) return { p: [K[0][1], K[0][2], K[0][3]], v: [0, 0, 0] };
    if (t >= K[n - 1][0]) return { p: [K[n - 1][1], K[n - 1][2], K[n - 1][3]], v: [0, 0, 0] };
    let i = 0;
    while (i < n - 2 && t > K[i + 1][0]) i++;
    const k0 = K[Math.max(0, i - 1)],
      k1 = K[i],
      k2 = K[i + 1],
      k3 = K[Math.min(n - 1, i + 2)];
    const h = k2[0] - k1[0],
      s = (t - k1[0]) / h;
    const p = [],
      v = [];
    for (let c = 1; c <= 3; c++) {
      const m1 = k1 === k0 ? 0 : ((k2[c] - k0[c]) / (k2[0] - k0[0])) * h,
        m2 = k3 === k2 ? 0 : ((k3[c] - k1[c]) / (k3[0] - k1[0])) * h;
      const s2 = s * s,
        s3 = s2 * s;
      p.push((2 * s3 - 3 * s2 + 1) * k1[c] + (s3 - 2 * s2 + s) * m1 + (-2 * s3 + 3 * s2) * k2[c] + (s3 - s2) * m2);
      v.push(((6 * s2 - 6 * s) * k1[c] + (3 * s2 - 4 * s + 1) * m1 + (-6 * s2 + 6 * s) * k2[c] + (3 * s2 - 2 * s) * m2) / h);
    }
    return { p, v };
  };
}

/* ---------------------------------------------------------------- efectos: los mismos del juego ---------------------------------------------------------------- */
// las partículas del juego (polvo, humo, motas) se pintan dentro de la escena mientras dura; al entrar y al salir se apagan todas
function proParticles(S) {
  for (let k = 0; k < PN; k++) PT[k] = PL[k];
  updParticles(0);
  const pts = new T.Points(pGeo, pMat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  S.scene.add(pts);
}
// la tierra que se levanta, del mismo color que las rachas de polvo del juego
function proDust(x, y, z, vx, vy, vz, life, s0, s1, a) {
  spawnP(x, y, z, vx, vy, vz, life, s0, s1, jit(0xc9bb9c, 0.05), 0xd2c6aa, a, 0, 0);
}
// humo negro, el de los fuegos del juego
function proSmoke(x, y, z, vx, vy, vz, life, s0, s1, a) {
  spawnP(x, y, z, vx, vy, vz, life, s0, s1, jit(SMK0, 0.1), jit(SMK1, 0.08), a, 0, 0);
}
// el aire de Mogadiscio: motas suspendidas y rachas de polvo a ras de suelo, como en las misiones
function proAmbient(S, dt) {
  const hh = halfH();
  S.dA = (S.dA || 0) + dt * 26;
  S.gA = (S.gA || 0) + dt * 2.2;
  while (S.dA > 1) {
    S.dA -= 1;
    const x = camS.tx + rr(-hh * 1.6, hh * 1.6),
      z = camS.tz + rr(-hh * 1.6, hh * 1.6);
    spawnP(x, S.hf(x, z) + rr(0.1, 2.5), z, rr(0.2, 0.6), rr(-0.05, 0.08), rr(-0.1, 0.2), rr(4, 8), 0.05, 0.1, 0xd8ccb0, 0xc8bca0, rr(0.35, 0.6), 0, 0);
  }
  while (S.gA > 1) {
    S.gA -= 1;
    const x = camS.tx + rr(-hh * 1.5, hh * 1.5),
      z = camS.tz + rr(-hh * 1.5, hh * 1.5),
      y = S.hf(x, z);
    for (let k = 0; k < 6; k++)
      spawnP(x + rr(-1, 1), y + rr(0.05, 0.5), z + rr(-1, 1), rr(0.5, 1.1), rr(0.02, 0.15), rr(0.0, 0.3), rr(5, 9), rr(0.6, 1), rr(1.8, 3.2), 0xc9bb9c, 0xd2c6aa, rr(0.18, 0.3), 0, 0);
  }
}
// un disparo: el fogonazo del juego con su luz, y su bocanada de humo
function proMuzzle(S, x, y, z, big) {
  const sp = new T.Sprite(mzMats[ri(3)]),
    s = (big ? rr(0.9, 1.3) : rr(0.5, 0.75)) * (1 + nightF * 0.25);
  sp.material.rotation = rnd() * 6.28;
  sp.scale.set(s, s, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 6;
  S.scene.add(sp);
  S.fx.push({ type: 'fl', obj: sp, t: 0, life: big ? 0.07 : 0.05 });
  muzzleLight(x, y, z, big);
  if (rnd() < (big ? 0.9 : 0.5))
    spawnP(x, y, z, rr(-0.2, 0.2), rr(0.2, 0.5), rr(-0.2, 0.2), rr(0.6, 1.1) * (big ? 1.6 : 1), big ? 0.14 : 0.08, big ? 0.45 : 0.25, 0x9a9488, 0xc8c0b0, 0.7, 0, 0);
}
// una trazadora del juego (verde la milicia, naranja los americanos), con la luz que viaja con ella
function proTracer(S, a, b, col, delay, spd, w) {
  const ln = new T.Mesh(UBOX, trM(col));
  ln.visible = false;
  ln.renderOrder = 6;
  S.scene.add(ln);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const tl = d > 4 ? trL[(trHead = (trHead + 1) % TRL_N)] : null;
  if (tl) {
    tl.color.setHex(col);
    tl.userData.owner = ln;
  }
  S.fx.push({ type: 'tr', obj: ln, t: -(delay || 0), life: Math.max(0.1, d / (spd || 65)), a, b, d, L: tl, w: w || 0.03 });
}
function proFxStep(S, dt) {
  for (let k = S.fx.length - 1; k >= 0; k--) {
    const f = S.fx[k];
    f.t += dt;
    if (f.type === 'tr') {
      if (f.t < 0) continue;
      f.obj.visible = true;
      const u = clamp(f.t / f.life, 0, 1),
        seg = Math.min(1, 1.7 / (f.d || 1)),
        a = f.a,
        b = f.b,
        u0 = Math.max(0, u - seg);
      const ax = a[0] + (b[0] - a[0]) * u0,
        ay = a[1] + (b[1] - a[1]) * u0,
        az = a[2] + (b[2] - a[2]) * u0,
        bx = a[0] + (b[0] - a[0]) * u,
        by = a[1] + (b[1] - a[1]) * u,
        bz = a[2] + (b[2] - a[2]) * u;
      const L = Math.hypot(bx - ax, by - ay, bz - az) || 0.01;
      f.obj.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      f.obj.lookAt(bx, by, bz);
      f.obj.scale.set(f.w || 0.03, f.w || 0.03, L);
      if (f.L && f.L.userData.owner === f.obj) {
        f.L.position.set(bx, by, bz);
        f.L.intensity = (1.4 + nightF * 2.2) * (u < 1 ? 1 : 0);
        f.L.distance = 3.5 + nightF * 2.5;
        if (u >= 1) f.L.userData.owner = null;
      }
    }
    if (f.t >= f.life) {
      if (f.L && f.L.userData.owner === f.obj) {
        f.L.intensity = 0;
        f.L.userData.owner = null;
      }
      S.scene.remove(f.obj);
      S.fx.splice(k, 1);
    }
  }
  // lo que queda programado (las ráfagas van bala a bala)
  for (let k = S.sched.length - 1; k >= 0; k--)
    if (S.t >= S.sched[k].at) {
      const f = S.sched[k].fn;
      S.sched.splice(k, 1);
      f();
    }
}
// las marcas de los frenazos en la tierra
function proSkids(S) {
  const g = new T.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new T.MeshLambertMaterial({ color: 0x4a3524, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const im = new T.InstancedMesh(g, m, 700);
  im.count = 0;
  im.renderOrder = 2;
  im.receiveShadow = true;
  S.scene.add(im);
  S.skid = { im, n: 0, dm: new T.Object3D() };
  S.trash.push(g, m);
}
function proSkid(S, x, z, hd, len) {
  const K = S.skid;
  if (K.n >= 700) return;
  K.dm.position.set(x, 0.045 + K.n * 0.00002, z);
  K.dm.rotation.set(0, hd, 0);
  K.dm.scale.set(0.2, 1, len);
  K.dm.updateMatrix();
  K.im.setMatrixAt(K.n++, K.dm.matrix);
  K.im.count = K.n;
  K.im.instanceMatrix.needsUpdate = true;
}

/* ---------------------------------------------------------------- sonido ---------------------------------------------------------------- */
// la cámara de la escena es la del juego: el oído es el centro de la vista (camS), igual que en una misión
function proShot(w, x, z) {
  if (!AC || !SND || !soundOn) return;
  try {
    gunSnd(w, x, z);
  } catch (e) {}
}
function proLoops(lvl) {
  if (!AC || !SND || !SND.loops) return;
  const L_ = SND.loops,
    now = AC.currentTime,
    on = soundOn ? 1 : 0;
  try {
    SND.master.gain.setTargetAtTime(on * 0.9, now, 0.06);
  } catch (e) {}
  for (const k of ['rotor_bh', 'rotor_lb', 'wash', 'truck', 'tyres', 'eng_hum', 'eng_idle', 'eng_move', 'mini'])
    if (L_[k]) L_[k].g.gain.setTargetAtTime(on * ((lvl && lvl[k]) || 0), now, 0.25);
}
/* ---------------------------------------------------------------- el campo: suelo, pista, monte, rocas, basura ---------------------------------------------------------------- */
function proEnv(S, o) {
  const scene = S.scene;
  // la luz, la calima y el cielo son los del juego (proStart trae aquí su sol y su luz de ambiente)
  scene.fog = proGameScene().fog;
  scene.background = proGameScene().background;
  const rx = o.road || (() => null);
  const flats = o.flats || [];
  const hf = (x, z) => {
    let flat = 1,
      farK = 1;
    const r = rx(z);
    if (r != null) {
      flat = proSS(5, 22, Math.abs(x - r));
      farK = proSS(10, 70, Math.abs(x - r));
    }
    for (const F of flats) flat = Math.min(flat, proSS(F[2], F[2] + 14, Math.hypot(x - F[0], z - F[1])));
    const d = Math.hypot(x - (o.cx || 0), z - (o.cz || 0));
    const near = (fbm(x * 0.05 + 3.1, z * 0.05 + 1.7) - 0.5) * 1.6 * flat,
      far = Math.pow(fbm(x * 0.011 + 7.7, z * 0.014 + 2.2), 1.6) * 26 * proSS(70, 260, d) * farK;
    return near + far;
  };
  S.hf = hf;
  const SZ = 900,
    N = 220;
  const gg = new T.PlaneGeometry(SZ, SZ, N, N);
  gg.rotateX(-Math.PI / 2);
  gg.translate(o.cx || 0, 0, o.cz || 0);
  const pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setY(i, hf(pa.getX(i), pa.getZ(i)));
  gg.computeVertexNormals();
  // tierra rojiza, manchas de arena, tierra oscura donde hay monte, la pista apisonada y lo que pinte cada escena
  const TN = 1024,
    data = new Uint8Array(TN * TN * 4);
  for (let j = 0; j < TN; j++)
    for (let i = 0; i < TN; i++) {
      const x = (o.cx || 0) - SZ / 2 + ((i + 0.5) / TN) * SZ,
        z = (o.cz || 0) + SZ / 2 - ((j + 0.5) / TN) * SZ;
      const n1 = fbm(x * 0.03 + 11, z * 0.03 + 5),
        n2 = fbm(x * 0.11 + 2, z * 0.11 + 9),
        n3 = vnoise(x * 0.4, z * 0.4);
      let r = 0.52 + (n1 - 0.5) * 0.18,
        g = 0.455 + (n1 - 0.5) * 0.14,
        b = 0.36 + (n1 - 0.5) * 0.1;
      const sand = proSS(0.52, 0.72, n2);
      r += sand * 0.16;
      g += sand * 0.15;
      b += sand * 0.12;
      const scrub = proSS(0.55, 0.75, fbm(x * 0.07 + 4, z * 0.07 + 8)) * (1 - sand);
      r -= scrub * 0.14;
      g -= scrub * 0.06;
      b -= scrub * 0.08;
      const rr_ = rx(z);
      if (rr_ != null) {
        const dx = Math.abs(x - rr_),
          on = 1 - proSS(1.6, 2.8, dx),
          berm = proSS(1.4, 2.0, dx) * (1 - proSS(2.4, 3.2, dx));
        r = r * (1 - on) + (0.63 + (n3 - 0.5) * 0.05) * on - berm * 0.05;
        g = g * (1 - on) + (0.54 + (n3 - 0.5) * 0.045) * on - berm * 0.045;
        b = b * (1 - on) + (0.43 + (n3 - 0.5) * 0.035) * on - berm * 0.035;
      }
      if (o.paint) {
        const q = o.paint(x, z, n3);
        if (q) {
          r = r * (1 - q[3]) + q[0] * q[3];
          g = g * (1 - q[3]) + q[1] * q[3];
          b = b * (1 - q[3]) + q[2] * q[3];
        }
      }
      const k = (j * TN + i) * 4;
      data[k] = clamp(r * 255, 0, 255);
      data[k + 1] = clamp(g * 255, 0, 255);
      data[k + 2] = clamp(b * 255, 0, 255);
      data[k + 3] = 126; // el shader del suelo lo lee como campo
    }
  const tex = new T.DataTexture(data, TN, TN, T.RGBAFormat);
  tex.flipY = false;
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const gm = groundMat();
  gm.map = tex;
  const ground = new T.Mesh(gg, gm);
  ground.receiveShadow = true;
  scene.add(ground);
  S.trash.push(gg, gm, tex);
  if (o.road) proRoad(S, rx, o.roadZ || [-200, 360]);
  proScrub(S, o);
  proRocks(S, o);
  proLitter(S, o);
  return hf;
}
function proRoad(S, rx, zr, pts, W0) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const x = c.getContext('2d');
  const im = x.createImageData(128, 512);
  for (let j = 0; j < 512; j++)
    for (let i = 0; i < 128; i++) {
      const u = i / 127,
        e = Math.min(u, 1 - u);
      const rut = Math.exp(-Math.pow((u - 0.3) / 0.045, 2)) + Math.exp(-Math.pow((u - 0.7) / 0.045, 2));
      const hump = Math.exp(-Math.pow((u - 0.5) / 0.08, 2));
      const n = vnoise(i * 0.35, j * 0.12) * 0.6 + vnoise(i * 1.3, j * 0.9) * 0.4;
      const k = (j * 128 + i) * 4;
      im.data[k] = 150 + (n - 0.5) * 26 - rut * 20 + hump * 7;
      im.data[k + 1] = 126 + (n - 0.5) * 22 - rut * 17 + hump * 6;
      im.data[k + 2] = 100 + (n - 0.5) * 16 - rut * 13 + hump * 4;
      im.data[k + 3] = 255 * proSS(0.0, 0.22, e) * (0.75 + 0.25 * n);
    }
  x.putImageData(im, 0, 0);
  const tex = new T.CanvasTexture(c);
  tex.wrapS = T.ClampToEdgeWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 8;
  const P = [],
    U = [],
    I = [];
  const W = W0 || 2.3; // una pista estrecha: cabe un coche y poco más
  // el eje: la pista principal (x en función de z) o una lista de puntos (los caminos que la cruzan); sigue el relieve
  if (!pts) {
    pts = [];
    for (let z = zr[0]; z <= zr[1]; z += 1.5) pts.push([rx(z), z]);
  }
  let n = 0,
    acc = 0;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)],
      b = pts[Math.min(pts.length - 1, k + 1)],
      tx = b[0] - a[0],
      tz = b[1] - a[1],
      L = Math.hypot(tx, tz) || 1,
      nx = tz / L,
      nz = -tx / L,
      [cx, cz] = pts[k];
    if (k) acc += Math.hypot(cx - pts[k - 1][0], cz - pts[k - 1][1]);
    const x0 = cx - nx * W,
      z0 = cz - nz * W,
      x1 = cx + nx * W,
      z1 = cz + nz * W;
    P.push(x0, S.hf(x0, z0) + 0.035, z0, x1, S.hf(x1, z1) + 0.035, z1);
    U.push(0, acc / 9, 1, acc / 9);
    if (n) I.push((n - 1) * 2, n * 2, (n - 1) * 2 + 1, (n - 1) * 2 + 1, n * 2, n * 2 + 1);
    n++;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  const m = new T.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const mesh = new T.Mesh(g, m);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  S.scene.add(mesh);
  S.trash.push(g, m, tex);
}
function proBushGeo() {
  if (PRO.bushGeo) return PRO.bushGeo;
  const R = proRng(5),
    P = [],
    C = [];
  for (let k = 0; k < 5; k++) {
    const s = new T.IcosahedronGeometry(0.38 + R() * 0.22, 1).toNonIndexed();
    s.translate(R() * 0.9 - 0.45, 0.15 + R() * 0.3, R() * 0.9 - 0.45);
    const pa = s.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      let x = pa.getX(i),
        y = pa.getY(i),
        z = pa.getZ(i);
      const n = vnoise(x * 4 + 3, z * 4 + y * 3) - 0.5;
      x *= 1 + n * 0.4;
      z *= 1 + n * 0.4;
      y = Math.max(0, y * (1 + n * 0.3));
      P.push(x, y, z);
      const kk = 0.55 + clamp(y / 0.9, 0, 1) * 0.55 + n * 0.3;
      C.push(0.27 * kk, 0.31 * kk, 0.17 * kk);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  g.computeVertexNormals();
  return (PRO.bushGeo = g);
}
function proScrub(S, o) {
  const hf = S.hf,
    rx = o.road || (() => null),
    keep = o.keep || (() => false),
    R = proRng(o.seed || 7);
  const B = [];
  for (let k = 0; k < (o.bushes ?? 1800); k++) {
    const x = (o.cx || 0) + (R() - 0.5) * 520,
      z = (o.cz || 0) + (R() - 0.5) * 520;
    const r = rx(z);
    if (r != null && Math.abs(x - r) < 4.2) continue;
    if (keep(x, z)) continue;
    if (R() > 0.3 + 0.9 * fbm(x * 0.07 + 4, z * 0.07 + 8)) continue;
    B.push([x, z, (0.55 + R() * 0.95) * (R() < 0.1 ? 1.6 : 1), R() * 6.28]);
  }
  for (const c of o.thickets || [])
    for (let k = 0; k < c[3]; k++) {
      const a = R() * 6.28,
        rd = Math.sqrt(R()) * c[2];
      B.push([c[0] + Math.cos(a) * rd, c[1] + Math.sin(a) * rd, 0.7 + R() * 1.1, R() * 6.28]);
    }
  const bm = new T.MeshLambertMaterial({ vertexColors: true });
  const im = new T.InstancedMesh(proBushGeo(), bm, B.length);
  const dm = new T.Object3D(),
    cc = new T.Color();
  B.forEach((b, k) => {
    dm.position.set(b[0], hf(b[0], b[1]) - 0.08, b[1]);
    dm.rotation.set(0, b[3], 0);
    dm.scale.set(b[2] * (0.9 + R() * 0.35), b[2] * (0.6 + R() * 0.35), b[2] * (0.9 + R() * 0.35));
    dm.updateMatrix();
    im.setMatrixAt(k, dm.matrix);
    const t = 0.8 + R() * 0.4;
    im.setColorAt(k, cc.setRGB(t * (0.9 + R() * 0.2), t, t * (0.85 + R() * 0.2)));
  });
  im.castShadow = true;
  im.receiveShadow = true;
  S.scene.add(im);
  S.trash.push(bm);
  // hierba seca y matojos del juego, sobre el relieve
  const V = { P: [], N: [], C: [], A: [], I: [], G: { P: [], N: [], C: [], A: [], I: [], U: [] } };
  for (let k = 0; k < (o.grass || 3500); k++) {
    const x = (o.cx || 0) + (R() - 0.5) * (o.grassR || 160),
      z = (o.cz || 0) + (R() - 0.5) * (o.grassR || 160);
    const r = rx(z);
    if (r != null && Math.abs(x - r) < 2.1) continue;
    if (keep(x, z)) continue;
    const p0 = V.P.length,
      g0 = V.G.P.length;
    if (R() < (o.shrubK ?? 0.22)) vegShrub(V, x, z, R, R() < 0.4);
    else vegGrass(V, x, z, R, R() < 0.25);
    const y = hf(x, z);
    for (let q = p0 + 1; q < V.P.length; q += 3) V.P[q] += y;
    for (let q = g0 + 1; q < V.G.P.length; q += 3) V.G.P[q] += y;
  }
  const mk = (A, mat, uv) => {
    if (!A.I.length) return;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(A.P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(A.N, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(A.C, 3));
    g.setAttribute('aVeg', new T.Float32BufferAttribute(A.A, 4));
    if (uv) g.setAttribute('uv', new T.Float32BufferAttribute(A.U, 2));
    g.setIndex(A.P.length / 3 > 65535 ? new T.Uint32BufferAttribute(A.I, 1) : new T.Uint16BufferAttribute(A.I, 1));
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat);
    m.receiveShadow = true;
    S.scene.add(m);
    S.trash.push(g);
  };
  mk(V.G, VEG_GMAT, true);
  mk(V, VEG_MAT, false);
  // acacias: sueltas, en grupos y las que ponga la escena
  if (typeof TREE_GEO !== 'undefined' && TREE_GEO && TREE_MAT) {
    const all = (o.trees || []).slice();
    for (let k = 0; k < (o.treeN || 40); k++) {
      const x = (o.cx || 0) + (R() - 0.5) * 380,
        z = (o.cz || 0) + (R() - 0.5) * 380;
      const r = rx(z);
      if ((r != null && Math.abs(x - r) < 9) || keep(x, z) || Math.hypot(x - (o.cx || 0), z - (o.cz || 0)) < 22) continue;
      all.push([x, z, 0.7 + R() * 0.4, k % 4]);
    }
    for (const c of o.groves || [])
      for (let k = 0; k < c[3]; k++) {
        const a = R() * 6.28,
          rd = Math.sqrt(R()) * c[2];
        all.push([c[0] + Math.cos(a) * rd, c[1] + Math.sin(a) * rd, 0.65 + R() * 0.5, Math.floor(R() * 4)]);
      }
    for (let v = 0; v < 4; v++) {
      const L_ = all.filter(t => (t[3] | 0) % 4 === v);
      if (!L_.length || !TREE_GEO[v]) continue;
      const m = new T.InstancedMesh(TREE_GEO[v], TREE_MAT, L_.length);
      m.castShadow = true;
      m.receiveShadow = true;
      m.customDepthMaterial = TREE_DEP;
      m.frustumCulled = false;
      const dm2 = new T.Object3D();
      L_.forEach((e, k) => {
        dm2.position.set(e[0], hf(e[0], e[1]) - 0.05, e[1]);
        dm2.rotation.set(0, R() * 6.28, 0);
        dm2.scale.setScalar(e[2]);
        dm2.updateMatrix();
        m.setMatrixAt(k, dm2.matrix);
        m.setColorAt(k, new T.Color(0.95, 0.93, 0.85));
      });
      S.scene.add(m);
    }
  }
}
// piedras: de canto rodado a peñas, medio enterradas
function proRocks(S, o) {
  if (!o.rocks) return;
  const R = proRng((o.seed || 7) + 31),
    hf = S.hf,
    rx = o.road || (() => null),
    keep = o.keep || (() => false);
  const g = new T.IcosahedronGeometry(1, 1),
    pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i),
      y = pa.getY(i),
      z = pa.getZ(i),
      n = 0.75 + vnoise(x * 2.3 + 5, z * 2.3 + y * 1.7) * 0.5;
    pa.setXYZ(i, x * n, y * n * 0.62, z * n);
  }
  g.computeVertexNormals();
  const m = new T.MeshLambertMaterial({ color: 0xffffff });
  const L = [];
  for (let k = 0; k < o.rocks * 4 && L.length < o.rocks; k++) {
    const x = (o.cx || 0) + (R() - 0.5) * (o.rockR || 200),
      z = (o.cz || 0) + (R() - 0.5) * (o.rockR || 200);
    const r = rx(z);
    if ((r != null && Math.abs(x - r) < 2.6) || keep(x, z)) continue;
    const big = R() < 0.08;
    L.push([x, z, big ? 0.6 + R() * 0.9 : 0.08 + R() * 0.28]);
  }
  for (const c of o.boulders || []) L.push(c);
  const im = new T.InstancedMesh(g, m, L.length),
    dm = new T.Object3D(),
    cc = new T.Color();
  L.forEach((e, k) => {
    dm.position.set(e[0], hf(e[0], e[1]) - e[2] * 0.25, e[1]);
    dm.rotation.set(R() * 0.4, R() * 6.28, R() * 0.4);
    dm.scale.set(e[2] * (0.8 + R() * 0.5), e[2], e[2] * (0.8 + R() * 0.5));
    dm.updateMatrix();
    im.setMatrixAt(k, dm.matrix);
    const t = 0.5 + R() * 0.25;
    im.setColorAt(k, cc.setRGB(t * 1.05, t * 0.96, t * 0.86));
  });
  im.castShadow = true;
  im.receiveShadow = true;
  S.scene.add(im);
  S.trash.push(g, m);
}
// la basura: papeles, bolsas de plástico, latas y cartones; algunos papeles se los lleva el viento
function proLitter(S, o) {
  if (!o.litter) return;
  const R = proRng((o.seed || 7) + 57),
    hf = S.hf;
  const g = new T.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide });
  const n = o.litter,
    im = new T.InstancedMesh(g, m, n),
    cc = new T.Color(),
    cols = [
      [0.92, 0.9, 0.84],
      [0.85, 0.82, 0.74],
      [0.55, 0.62, 0.72],
      [0.72, 0.6, 0.42],
      [0.25, 0.26, 0.24],
      [0.78, 0.25, 0.2],
      [0.9, 0.88, 0.8]
    ];
  S.papers = [];
  for (let k = 0; k < n; k++) {
    const c = o.litterAt && R() < 0.75 ? o.litterAt : [o.cx || 0, o.cz || 0, 60];
    const a = R() * 6.28,
      rd = Math.sqrt(R()) * c[2];
    const p = { x: c[0] + Math.cos(a) * rd, z: c[1] + Math.sin(a) * rd, ry: R() * 6.28, s: 0.12 + R() * 0.22, s2: 0.1 + R() * 0.2, fly: R() < 0.12, ph: R() * 10, k };
    p.y = hf(p.x, p.z) + 0.03;
    S.papers.push(p);
    const q = cols[Math.floor(R() * cols.length)];
    im.setColorAt(k, cc.setRGB(q[0], q[1], q[2]));
  }
  im.receiveShadow = true;
  S.scene.add(im);
  S.litter = { im, dm: new T.Object3D() };
  S.trash.push(g, m);
  proLitterStep(S, 0);
}
function proLitterStep(S, dt) {
  if (!S.litter) return;
  const { im, dm } = S.litter,
    W = [0.93, 0.36]; // el viento del juego
  for (const p of S.papers) {
    if (p.fly) {
      // los papeles sueltos van a saltos con el viento, volteándose
      p.ph += dt;
      const gust = Math.max(0, Math.sin(p.ph * 1.3 + p.k)) * 1.6;
      p.x += W[0] * gust * dt * 1.4;
      p.z += W[1] * gust * dt * 1.4;
      p.y = S.hf(p.x, p.z) + 0.03 + Math.max(0, Math.sin(p.ph * 2.6)) * 0.35 * gust;
      p.ry += dt * gust * 3;
    }
    dm.position.set(p.x, p.y, p.z);
    dm.rotation.set(p.fly ? Math.sin(p.ph * 3) * 0.8 : 0, p.ry, p.fly ? Math.cos(p.ph * 2.3) * 0.6 : 0);
    dm.scale.set(p.s, 1, p.s2);
    dm.updateMatrix();
    im.setMatrixAt(p.k, dm.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
}
// casas de adobe de las afueras, las mismas del juego (sin tapias)
function proHouses(S, list) {
  adobeLoad();
  const byT = {};
  for (const h of list) (byT[h.t] = byT[h.t] || []).push(h);
  withModel('adobe', M_ => {
    if (!PRO.S) return;
    for (const t in byT) {
      const L = byT[t];
      for (const part of ['w', 'd']) {
        const geo = M_.geos[part + t];
        if (!geo) continue;
        const im = new T.InstancedMesh(geo, propMat('adobe', M_, part + t), L.length),
          dm = new T.Object3D(),
          cc = new T.Color();
        L.forEach((h, k) => {
          dm.position.set(h.x, S.hf(h.x, h.z) - 0.05, h.z);
          dm.rotation.set(0, h.ry, 0);
          dm.scale.setScalar(1);
          dm.updateMatrix();
          im.setMatrixAt(k, dm.matrix);
          im.setColorAt(k, cc.setHex(part === 'w' ? ADOBE_TONES[k % ADOBE_TONES.length] : 0xffffff));
        });
        im.castShadow = im.receiveShadow = true;
        S.scene.add(im);
      }
    }
  });
}
// gallinas: picotean, dan un par de pasos y salen corriendo con los tiros
function proChickens(S, spots) {
  const R = proRng(77);
  const bodyG = new T.SphereGeometry(0.16, 8, 6);
  bodyG.scale(1, 0.85, 1.35);
  const headG = new T.SphereGeometry(0.07, 6, 5),
    combG = new T.BoxGeometry(0.02, 0.05, 0.07),
    tailG = new T.ConeGeometry(0.08, 0.16, 5),
    legG = new T.CylinderGeometry(0.012, 0.012, 0.16, 4);
  tailG.rotateX(-0.9);
  const mats = [0xf2ece0, 0x8a5a32, 0x5a3a24, 0xc49a6a].map(c => new T.MeshLambertMaterial({ color: c })),
    red = new T.MeshLambertMaterial({ color: 0xb02a20 }),
    leg = new T.MeshLambertMaterial({ color: 0xc8a050 });
  S.trash.push(bodyG, headG, combG, tailG, legG, red, leg, ...mats);
  S.hens = [];
  for (const sp of spots)
    for (let k = 0; k < sp[2]; k++) {
      const g = new T.Group(),
        mt = mats[Math.floor(R() * mats.length)];
      const b = new T.Mesh(bodyG, mt);
      b.position.y = 0.24;
      const hd = new T.Group();
      hd.position.set(0, 0.36, 0.17);
      const h = new T.Mesh(headG, mt),
        cb = new T.Mesh(combG, red);
      cb.position.y = 0.07;
      hd.add(h, cb);
      const tl = new T.Mesh(tailG, mt);
      tl.position.set(0, 0.34, -0.2);
      const l1 = new T.Mesh(legG, leg),
        l2 = new T.Mesh(legG, leg);
      l1.position.set(0.05, 0.08, 0);
      l2.position.set(-0.05, 0.08, 0);
      g.add(b, hd, tl, l1, l2);
      g.traverse(q => {
        if (q.isMesh) q.castShadow = true;
      });
      g.scale.setScalar(0.62);
      S.scene.add(g);
      const hen = { g, hd, l1, l2, x: sp[0] + (R() - 0.5) * 3, z: sp[1] + (R() - 0.5) * 3, face: R() * 6.28, t: R() * 3, peck: 0, run: 0, ph: R() * 6 };
      hen.tx = hen.x;
      hen.tz = hen.z;
      S.hens.push(hen);
    }
}
function proChickensStep(S, dt) {
  for (const h of S.hens || []) {
    h.t -= dt;
    h.ph += dt;
    if (S.scare && !h.fled && Math.hypot(h.x - S.scare[0], h.z - S.scare[1]) < 40) {
      // con los tiros salen corriendo, lejos del ruido
      h.fled = true;
      const a = Math.atan2(h.x - S.scare[0], h.z - S.scare[1]) + rr(-0.6, 0.6);
      h.tx = h.x + Math.sin(a) * rr(4, 7);
      h.tz = h.z + Math.cos(a) * rr(4, 7);
      h.run = 1;
    }
    if (h.t <= 0 && !h.run) {
      if (rnd() < 0.5) {
        h.tx = h.x + rr(-1.2, 1.2);
        h.tz = h.z + rr(-1.2, 1.2);
      } else h.peck = rr(0.6, 1.4);
      h.t = rr(0.8, 2.2);
    }
    const dx = h.tx - h.x,
      dz = h.tz - h.z,
      d = Math.hypot(dx, dz),
      sp = h.run ? 2.8 : 0.55;
    let mv = 0;
    if (d > 0.05) {
      const st = Math.min(d, sp * dt);
      h.x += (dx / d) * st;
      h.z += (dz / d) * st;
      h.face = Math.atan2(dx, dz);
      mv = 1;
    } else h.run = 0;
    h.peck = Math.max(0, h.peck - dt);
    h.g.position.set(h.x, S.hf(h.x, h.z) + (mv ? Math.abs(Math.sin(h.ph * (h.run ? 22 : 12))) * 0.03 : 0), h.z);
    h.g.rotation.y = h.face;
    h.hd.rotation.x = h.peck > 0 ? 0.6 + Math.sin(h.ph * 16) * 0.5 : mv ? Math.sin(h.ph * 12) * 0.15 : 0;
    h.hd.position.z = 0.17 + (mv ? Math.sin(h.ph * 12) * 0.03 : 0);
    h.l1.rotation.x = mv ? Math.sin(h.ph * (h.run ? 24 : 12)) * 0.6 : 0;
    h.l2.rotation.x = -h.l1.rotation.x;
  }
}
// pájaros: cuervos dando vueltas en lo alto; con los tiros, se van
function proBirds(S, cx, cz, n) {
  const g = new T.BufferGeometry();
  // un cuerpo y dos alas que se doblan por la punta
  g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0.18, -0.05, 0, -0.2, 0.05, 0, -0.2, 0, 0, 0.08, 0, 0, -0.08, 0.5, 0, -0.02, 0, 0, 0.08, -0.5, 0, -0.02, 0, 0, -0.08], 3));
  g.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const m = new T.MeshLambertMaterial({ color: 0x1c1b18, side: T.DoubleSide });
  S.trash.push(g, m);
  S.birds = [];
  for (let k = 0; k < n; k++) {
    const ms = new T.Mesh(g.clone(), m);
    ms.castShadow = true;
    ms.scale.setScalar(1.3);
    S.scene.add(ms);
    S.trash.push(ms.geometry);
    S.birds.push({ ms, cx: cx + rr(-8, 8), cz: cz + rr(-8, 8), r: rr(6, 14), y: rr(9, 16), a: rr(0, 6.28), w: rr(0.35, 0.6) * (rnd() < 0.5 ? 1 : -1), ph: rr(0, 6) });
  }
}
function proBirdsStep(S, dt) {
  for (const b of S.birds || []) {
    b.ph += dt;
    if (S.scare && !b.fled) {
      b.fled = true;
      b.dir = Math.atan2(b.cx - S.scare[0], b.cz - S.scare[1]) + rr(-0.5, 0.5);
    }
    let x, z, hd;
    if (b.fled) {
      b.cx += Math.sin(b.dir) * dt * 9;
      b.cz += Math.cos(b.dir) * dt * 9;
      b.y += dt * 2.5;
      b.a += b.w * dt * 0.4;
      x = b.cx + Math.cos(b.a) * b.r;
      z = b.cz + Math.sin(b.a) * b.r;
      hd = b.dir;
    } else {
      b.a += b.w * dt;
      x = b.cx + Math.cos(b.a) * b.r;
      z = b.cz + Math.sin(b.a) * b.r;
      hd = Math.atan2(-Math.sin(b.a) * b.w, Math.cos(b.a) * b.w);
    }
    b.ms.position.set(x, b.y + Math.sin(b.ph * 1.3) * 0.3, z);
    b.ms.rotation.set(0, hd, b.fled ? 0 : -Math.sign(b.w) * 0.35);
    const flap = b.fled ? Math.sin(b.ph * 16) : Math.sin(b.ph * 7) * (Math.sin(b.ph * 0.7) > 0.3 ? 1 : 0.15);
    const pa = b.ms.geometry.attributes.position;
    pa.setY(5, flap * 0.3);
    pa.setY(7, flap * 0.3);
    pa.needsUpdate = true;
  }
}

/* ---------------------------------------------------------------- gente ---------------------------------------------------------------- */
function proMan(S, look, x, z, face, o) {
  o = o || {};
  const rig = buildRig(look, o.spec || (look === 'civ' ? { woman: !!o.woman } : { gun: o.gun || 'ak' }));
  if (o.noGun || look === 'civ') rig.gun.visible = false;
  const u = {
    team: o.team || (look === 'civ' ? 'civ' : look === 'militia' ? 'them' : 'us'),
    look,
    x,
    z,
    y: o.y || 0,
    vx: 0,
    vz: 0,
    face,
    alive: true,
    down: false,
    hp: 100,
    hp0: 100,
    sup: 0,
    pinned: false,
    stance: 'stand',
    moving: false,
    path: [],
    order: null,
    auto: null,
    firing: 0,
    reloading: false,
    healing: false,
    talkT: 0,
    state: 'idle',
    woman: !!o.woman,
    m: rig,
    gest: o.gest || null,
    film: true
  };
  if (o.pose) u.poseName = o.pose;
  rig.root.position.set(x, u.y, z);
  rig.root.rotation.y = face;
  (o.parent || S.scene).add(rig.root);
  S.men.push(u);
  return u;
}
function proMenStep(S, dt) {
  for (const u of S.men) {
    const r = u.m.root;
    r.visible = !u.hidden;
    if (u.hidden) continue;
    if (!u.ride) r.position.set(u.x, (u.y || 0) + (u.onGround !== false && S.hf ? S.hf(u.x, u.z) : 0), u.z);
    const fc = u.look2 != null ? u.look2 : u.face;
    let df = fc - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, dt * (u.turnK || 7)), -dt * 7, dt * 7);
    u.moving = Math.hypot(u.vx, u.vz) > 0.08;
    const m = u.m;
    if (u.gest && !m.lbGst && u.stance === 'stand' && (!u.moving || u.gestMove)) {
      const G_ = GESTURES[u.gest];
      if (G_) m.lbGst = { k: u.gest, t: rr(0, 0.3), d: rr(G_.d[0], G_.d[1]), dir: rnd() < 0.5 ? -1 : 1, force: true };
    }
    animRig(u, dt);
    if (u.team === 'civ' && !u.gestMove) {
      const sp = Math.hypot(u.vx, u.vz),
        run = clamp((sp - 1.2) / 1.5, 0, 1),
        w = clamp(sp / 0.9, 0, 1),
        s = Math.sin(m.phase || 0);
      m.shR.rotation.x += s * (0.35 + 0.5 * run) * w;
      m.shL.rotation.x -= s * (0.35 + 0.5 * run) * w;
    }
    if (u.post) u.post(u, m, dt);
  }
}
function proWalk(u, tx, tz, sp, dt) {
  const dx = tx - u.x,
    dz = tz - u.z,
    d = Math.hypot(dx, dz);
  if (d < 0.08) {
    u.vx = u.vz = 0;
    return true;
  }
  const v = Math.min(sp, d / Math.max(dt, 1e-3), d * 3 + 0.4);
  u.vx = (dx / d) * v;
  u.vz = (dz / d) * v;
  u.x += u.vx * dt;
  u.z += u.vz * dt;
  u.face = Math.atan2(dx, dz);
  return false;
}
// el megáfono: una bocina blanca con su empuñadura, en la mano izquierda
function proMegaphone(u) {
  const g = new T.Group(),
    m = new T.MeshLambertMaterial({ color: 0xe8e4da }),
    d = new T.MeshLambertMaterial({ color: 0x2a2a2a });
  const horn = new T.Mesh(new T.CylinderGeometry(0.11, 0.035, 0.3, 12, 1, true), m);
  horn.rotation.x = Math.PI / 2;
  horn.position.z = 0.17;
  const back = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.1, 10), d);
  back.rotation.x = Math.PI / 2;
  back.position.z = -0.02;
  const grip = new T.Mesh(new T.BoxGeometry(0.035, 0.11, 0.04), d);
  grip.position.set(0, -0.07, 0.02);
  g.add(horn, back, grip);
  g.position.set(0, -0.08, 0.04);
  g.rotation.set(-1.45, 0, 0);
  g.traverse(q => {
    if (q.isMesh) q.castShadow = true;
  });
  u.m.wrL.add(g);
  return g;
}

/* ---------------------------------------------------------------- vehículos y objetos ---------------------------------------------------------------- */
function proJeep(S, model, hubs) {
  const g = new T.Group(),
    body = new T.Group();
  g.add(body);
  g.scale.setScalar(PRO_K);
  const wheels = [];
  withModel(model || 'f_jeep', M_ => {
    const b = new T.Mesh(M_.geos.body, M_.mat);
    b.castShadow = b.receiveShadow = true;
    body.add(b);
    for (const k of ['FL', 'FR', 'RL', 'RR']) {
      const w = new T.Mesh(M_.geos['w' + k], M_.mat);
      w.castShadow = true;
      w.position.set(...(hubs || JEEP_HUB)[k]);
      g.add(w);
      wheels.push(w);
    }
  });
  S.scene.add(g);
  return { g, body, wheels, s: 0, v: 0 };
}
function proTruck(S) {
  const g = new T.Group();
  g.scale.setScalar(PRO_K);
  withModel('f_truck', M_ => {
    const b = new T.Mesh(M_.geos.body, M_.mat);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
  });
  S.scene.add(g);
  return g;
}
function proSackGeo() {
  if (PRO.sackGeo) return PRO.sackGeo;
  const g = new T.BoxGeometry(0.84, 0.26, 0.5, 8, 3, 6),
    pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i) / 0.42,
      y = pa.getY(i) / 0.13,
      z = pa.getZ(i) / 0.25;
    const bulge = (1 - x * x * 0.55) * (1 - z * z * 0.5);
    pa.setY(i, pa.getY(i) * (0.55 + 0.6 * bulge));
    pa.setZ(i, pa.getZ(i) * (0.82 + 0.18 * (1 - y * y)) * (1 - 0.18 * x * x * x * x));
    pa.setX(i, pa.getX(i) * (0.94 + 0.06 * (1 - y * y)));
  }
  g.computeVertexNormals();
  return (PRO.sackGeo = g);
}
// la bandera de la Cruz Roja: tela con caída, pliegues que corren con el viento y rachas
function proFlag(S, x, z) {
  const g = new T.Group();
  g.position.set(x, S.hf(x, z), z);
  const pm = new T.MeshLambertMaterial({ color: 0x9a9a94 });
  const pole = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 5.4, 8), pm);
  pole.position.y = 2.7;
  pole.castShadow = true;
  const knob = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), pm);
  knob.position.y = 5.42;
  g.add(pole, knob);
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 256;
  const x2 = c.getContext('2d');
  x2.fillStyle = '#efece3';
  x2.fillRect(0, 0, 384, 256);
  for (let k = 0; k < 1600; k++) {
    x2.fillStyle = `rgba(${140 + Math.random() * 40},${120 + Math.random() * 30},${95 + Math.random() * 20},${Math.random() * 0.05})`;
    x2.fillRect(Math.random() * 384, Math.random() * 256, 2 + Math.random() * 10, 1 + Math.random() * 3);
  }
  const gr = x2.createLinearGradient(0, 0, 384, 256);
  gr.addColorStop(0, 'rgba(120,100,70,0)');
  gr.addColorStop(1, 'rgba(120,100,70,0.18)');
  x2.fillStyle = gr;
  x2.fillRect(0, 0, 384, 256);
  x2.fillStyle = '#c11a1f';
  x2.fillRect(192 - 27, 128 - 90, 54, 180);
  x2.fillRect(192 - 90, 128 - 27, 180, 54);
  x2.fillStyle = '#d8d4c8';
  x2.fillRect(0, 0, 10, 256);
  const tex = new T.CanvasTexture(c);
  tex.anisotropy = 4;
  const fg = new T.PlaneGeometry(1.6, 1.07, 28, 14);
  fg.translate(0.8, 0, 0);
  const fm = new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide });
  const flag = new T.Mesh(fg, fm);
  flag.position.set(0.04, 4.75, 0);
  flag.castShadow = true;
  g.add(flag);
  S.scene.add(g);
  S.flag = { g, flag, base: Float32Array.from(fg.attributes.position.array), t: 0 };
  S.trash.push(pole.geometry, knob.geometry, pm, fg, fm, tex);
  g.rotation.y = 0.6;
  return g;
}
function proFlagStep(S, dt) {
  const F = S.flag;
  if (!F) return;
  F.t += dt;
  const t = F.t,
    gust = 0.75 + 0.25 * Math.sin(t * 0.9) + 0.15 * Math.sin(t * 2.3 + 1),
    pa = F.flag.geometry.attributes.position,
    B = F.base;
  for (let i = 0; i < pa.count; i++) {
    const x = B[i * 3],
      y = B[i * 3 + 1],
      k = x / 1.6;
    // las ondas nacen en el mástil y corren hacia el borde, creciendo; la punta cae un poco cuando afloja el viento
    const w1 = Math.sin(x * 4.2 - t * 7.5 + y * 0.6) * 0.16 * k * gust,
      w2 = Math.sin(x * 9.1 - t * 12.3 + y * 2.1) * 0.045 * k,
      w3 = Math.sin(y * 3.2 + t * 3.1 + x) * 0.03 * k * k;
    pa.setZ(i, w1 + w2 + w3);
    pa.setX(i, x * (1 - 0.06 * k * (1 - gust)) - Math.abs(w1) * 0.25 * k);
    pa.setY(i, y - k * k * (0.28 - 0.18 * gust) + Math.sin(x * 2.3 - t * 4) * 0.025 * k);
  }
  pa.needsUpdate = true;
  F.flag.geometry.computeVertexNormals();
}
function proTent(S, x, z, ry, sc) {
  const g = new T.Group();
  g.position.set(x, S.hf(x, z), z);
  g.rotation.y = ry;
  withModel('tent', M_ => {
    // la misma tienda de la base, en lona blanca
    if (!PRO.tentMat) PRO.tentMat = new T.MeshLambertMaterial({ color: 0xf2efe6, side: T.DoubleSide });
    const q = new T.Mesh(M_.geos.body, PRO.tentMat);
    q.scale.setScalar(sc / 1.5);
    q.castShadow = q.receiveShadow = true;
    g.add(q);
  });
  S.scene.add(g);
  return g;
}
function proTech(S) {
  const tg = new T.Group(),
    body = new T.Group(),
    piv = new T.Group();
  tg.add(body);
  piv.position.set(...TECH_PIV);
  body.add(piv);
  withModel('tech', M_ => {
    if (!M_.fix) {
      M_.fix = true;
      M_.geos.gun.translate(-TECH_PIV[0], -TECH_PIV[1], -TECH_PIV[2]);
    }
    const b = new T.Mesh(M_.geos.body, M_.mat);
    b.castShadow = b.receiveShadow = true;
    body.add(b);
    const q = new T.Mesh(M_.geos.gun, M_.mat);
    q.castShadow = true;
    piv.add(q);
  });
  S.scene.add(tg);
  return { g: tg, body, piv };
}

/* ---------------------------------------------------------------- texto y radio ---------------------------------------------------------------- */
// atrezo del juego (los modelos subidos), puesto en la escena
function proProp(S, n, part, x, y, z, ry, sc, col) {
  withModel(n, M_ => {
    if (PRO.S !== S || !M_.geos[part]) return;
    const m = new T.InstancedMesh(M_.geos[part], propMat(n, M_, part), 1),
      dm = new T.Object3D();
    dm.position.set(x, S.hf(x, z) + (y || 0), z);
    dm.rotation.set(0, ry || 0, 0);
    dm.scale.setScalar(sc || 1);
    dm.updateMatrix();
    m.setMatrixAt(0, dm.matrix);
    m.setColorAt(0, new T.Color(col == null ? 0xffffff : col));
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    S.scene.add(m);
  });
}
// los puestos de mercado del juego (world/markets.js), montados aquí: el mismo código, que en vez de al mundo los pone en la escena
function proMarket(S, list) {
  const keep = prop;
  prop = (n, part, x, y, z, ry, sc, col) => {
    proProp(S, n, part, x, y, z, ry, sc, col);
    return null;
  };
  try {
    for (const m of list) marketStall(m[0], m[1], m[2], m[3], !!m[4]);
  } finally {
    prop = keep;
  }
}
// el cobertizo de lona verde del puesto (como el de la película): postes de madera y una lona combada
function proTarp(S, x, z, ry, w, d, col) {
  const g = new T.Group();
  g.position.set(x, S.hf(x, z), z);
  g.rotation.y = ry;
  const H = 1.55,
    pm = new T.MeshLambertMaterial({ color: 0x5a4632 }),
    pg = new T.CylinderGeometry(0.035, 0.045, H, 5);
  pg.translate(0, H / 2, 0);
  const nx = Math.max(2, Math.round(w / 2.2) + 1);
  for (let i = 0; i < nx; i++)
    for (const sz of [-1, 1]) {
      const p = new T.Mesh(pg, pm);
      p.position.set(-w / 2 + (i * w) / (nx - 1), 0, (sz * d) / 2);
      p.scale.y = sz > 0 ? 1 : 0.86; // la lona cae hacia atrás
      p.castShadow = true;
      g.add(p);
    }
  const tg = new T.PlaneGeometry(w + 0.3, d + 0.3, 24, 8);
  tg.rotateX(-Math.PI / 2);
  const pa = tg.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const u = pa.getX(i) / (w / 2),
      v = pa.getZ(i) / (d / 2);
    const sag = Math.abs(Math.sin((u * (nx - 1) * Math.PI) / 2)) * 0.07 + (1 - v * v) * 0.05;
    pa.setY(i, H * (0.93 + 0.07 * v) - sag + vnoise(pa.getX(i) * 2, pa.getZ(i) * 2) * 0.04);
  }
  tg.computeVertexNormals();
  const tm = new T.MeshLambertMaterial({ color: col || 0x4f7d4c, side: T.DoubleSide });
  const tarp = new T.Mesh(tg, tm);
  tarp.castShadow = tarp.receiveShadow = true;
  g.add(tarp);
  S.scene.add(g);
  S.trash.push(pm, pg, tg, tm);
  return g;
}
// un perro del juego (el modelo de los animales de la ciudad): husmea, trota y se aparta de los coches
function proDog(S, x, z) {
  const d = { x, z, hx: x, hz: z, face: rnd() * 6.28, t: 1, ph: 0, v: 0, m: null };
  withModel('animals', M_ => {
    if (PRO.S !== S) return;
    const m = new T.InstancedMesh(M_.geos.dog, M_.mat, 1);
    m.setColorAt(0, new T.Color(0x4a3426));
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    S.scene.add(m);
    d.m = m;
  });
  (S.dogs = S.dogs || []).push(d);
  return d;
}
const _dogM = new T.Object3D();
function proDogsStep(S, dt) {
  for (const d of S.dogs || []) {
    d.t -= dt;
    // si pasa un coche cerca, se aparta corriendo
    let flee = null;
    for (const c of S.cars || []) {
      const p = c.g.position;
      if ((c.v || 0) > 1 && Math.hypot(p.x - d.x, p.z - d.z) < 6) flee = [d.x + (d.x - p.x) * 1.5, d.z + (d.z - p.z) * 0.6];
    }
    if (flee) {
      d.tx = flee[0];
      d.tz = flee[1];
      d.run = 1.2;
    } else if (d.t <= 0) {
      d.t = rr(1.2, 3.5);
      d.run = 0;
      if (rnd() < 0.6) {
        d.tx = d.hx + rr(-4, 4);
        d.tz = d.hz + rr(-4, 4);
      }
    }
    d.run = Math.max(0, (d.run || 0) - dt);
    const sp = d.run > 0 ? 3.6 : 0.75;
    let mv = 0;
    if (d.tx != null) {
      const dx = d.tx - d.x,
        dz = d.tz - d.z,
        L = Math.hypot(dx, dz);
      if (L > 0.1) {
        const st = Math.min(L, sp * dt);
        d.x += (dx / L) * st;
        d.z += (dz / L) * st;
        let df = Math.atan2(dx, dz) - d.face;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        d.face += df * Math.min(1, dt * 8);
        mv = st / Math.max(dt, 1e-3);
      }
    }
    d.ph += mv * dt * 13;
    if (!d.m) continue;
    const w = Math.min(1, mv / 0.3),
      sw = Math.sin(d.ph) * w;
    _dogM.position.set(d.x, S.hf(d.x, d.z) + Math.abs(sw) * 0.03, d.z);
    _dogM.rotation.set(sw * 0.05 + (d.run > 0 ? 0.08 : 0), d.face, Math.sin(d.ph) * 0.04 * w, 'YXZ');
    _dogM.scale.setScalar(0.95);
    _dogM.updateMatrix();
    d.m.setMatrixAt(0, _dogM.matrix);
    d.m.instanceMatrix.needsUpdate = true;
  }
}
// gente de alrededor, fuera del tumulto: unos miran, otros pasan andando; con los tiros se agachan o se van
function proOnlookers(S, spots, R) {
  S.look = S.look || [];
  for (const [x0, z0, n, rad, mode] of spots)
    for (let k = 0; k < n; k++) {
      const x = x0 + (R() - 0.5) * rad * 2,
        z = z0 + (R() - 0.5) * rad * 2;
      const u = proMan(S, 'militia', x, z, R() * 6.28, { noGun: true, team: 'civ' });
      u.home = [x, z];
      u.mode = mode === 'walk' || (mode === 'mix' && R() < 0.4) ? 'walk' : 'watch';
      u.wt = R() * 3;
      u.gest = u.mode === 'watch' && R() < 0.25 ? 'argue' : null;
      S.look.push(u);
    }
}
function proOnlookersStep(S, dt, scareAt, watchX, watchZ) {
  for (const u of S.look || []) {
    u.wt -= dt;
    if (scareAt != null && S.t > scareAt && !u.sc) {
      u.sc = true;
      u.gest = null;
      u.m.lbGst = null;
      const d = Math.hypot(u.x - watchX, u.z - watchZ);
      if (d < 14 && rnd() < 0.5) {
        u.stance = 'crouch';
        u.upAt = S.t + rr(0.8, 2);
      }
      const a = Math.atan2(u.x - watchX, u.z - watchZ) + rr(-0.6, 0.6);
      u.goal = [u.x + Math.sin(a) * rr(2, 6), u.z + Math.cos(a) * rr(2, 6)];
      u.mode = 'flee';
    }
    if (u.stance === 'crouch' && S.t > u.upAt) u.stance = 'stand';
    if (u.mode === 'walk') {
      if (!u.goal || u.wt <= 0) {
        u.goal = [u.home[0] + rr(-6, 6), u.home[1] + rr(-6, 6)];
        u.wt = rr(4, 9);
      }
      if (proWalk(u, u.goal[0], u.goal[1], 0.75, dt)) u.wt = Math.min(u.wt, 1);
    } else if (u.mode === 'flee' && u.stance === 'stand') {
      if (proWalk(u, u.goal[0], u.goal[1], 2.2, dt)) u.face = Math.atan2(watchX - u.x, watchZ - u.z);
    } else {
      u.vx = u.vz = 0;
      u.face = Math.atan2(watchX - u.x, watchZ - u.z) + Math.sin(S.t * 0.3 + u.home[0]) * 0.25;
    }
  }
}
function proUI() {
  let el = $('filmUI');
  if (!el) {
    el = document.createElement('div');
    el.id = 'filmUI';
    el.innerHTML = '<div class="film-fade"></div><div class="film-tag"><b></b><span></span></div>';
    document.body.appendChild(el);
  }
  return el;
}
function proTag(t1, t2) {
  const el = proUI().querySelector('.film-tag');
  el.querySelector('b').textContent = t1 ? L(t1) : '';
  el.querySelector('span').textContent = t2 ? L(t2) : '';
  el.classList.toggle('on', !!t1);
}
function proFade(a) {
  proUI().querySelector('.film-fade').style.opacity = clamp(a, 0, 1);
}
// las frases van por la radio de arriba, como en las misiones
function proSay(who, text, cls) {
  chatLine(who, text, cls || 'sys');
}

/* ---------------------------------------------------------------- arranque, fotograma y fin ---------------------------------------------------------------- */
// las luces del juego que se pasan a la escena mientras dura: el sol (con su mapa de sombras), la luz de ambiente
// y los fogonazos, las trazadoras y los destellos; así la luz es exactamente la del juego
function proLights() {
  return [hemi, sun, sun.target, ...mzL.map(f => f.L), ...flashL.map(f => f.L), ...trL];
}
function proStart(kind, done) {
  proStop(true);
  const S = {
    kind,
    t: 0,
    D: PRO_LEN[kind],
    done,
    scene: new T.Scene(),
    men: [],
    fx: [],
    sched: [],
    trash: [],
    helis: [],
    hour: kind === 'aid' ? 9.2 : kind === 'city' ? 15.4 : 16.75 // la captura, al empezar a caer la tarde: luz anaranjada y sombras largas
  };
  // como una cinemática de las misiones: fuera los menús, la cámara del juego con sus botones, la radio arriba y «Saltar escena»
  const B = document.body;
  PRO.prev = {
    ov: $('overlay').hidden,
    cls: ['menuopen', 'attract', 'cine'].filter(c => B.classList.contains(c)),
    cine: CINE,
    cam: { tx: camS.tx, tz: camS.tz, yaw: camS.yaw, yawT: camS.yawT, zoom: camS.zoom, zoomT: camS.zoomT },
    skip: $('bSkip').hidden,
    skipT: $('bSkip').textContent
  };
  $('overlay').hidden = true;
  B.classList.remove('menuopen', 'attract');
  B.classList.add('cine', 'prolog');
  CINE = { on: true, pro: true, t: 0, k: 0, uyaw: 0, uz: 1, keys: [], dur: 1e9, block: true };
  $('bSkip').hidden = false;
  $('bSkip').textContent = L('Saltar escena');
  $('flyUnits').innerHTML = '';
  clearChat();
  proTag(null);
  try {
    if (!AC) initAudio();
    else if (AC.state === 'suspended') AC.resume();
    startRotorSound();
    // detrás del menú el juego baja todo menos la música: aquí se oye la escena
    if (SND && SND.gate) {
      SND.gOn = 1;
      SND.gate.gain.cancelScheduledValues(AC.currentTime);
      SND.gate.gain.setTargetAtTime(1, AC.currentTime, 0.1);
    }
  } catch (e) {}
  Object.assign(PRO, { on: true, S });
  if (kind === 'city') {
    // la vista de la ciudad es la ciudad del juego: lo de la escena va en un grupo dentro del mundo y se quita al acabar
    S.world = true;
    S.scene = new T.Group();
    scene.add(S.scene);
    for (let k = 0; k < PN; k++) PT[k] = PL[k];
    cityBuild(S);
  } else {
    for (const l of proLights()) {
      S.scene.add(l);
      l.visible = true;
    }
    proParticles(S);
    if (kind === 'aid') aidBuild(S);
    else raidBuild(S);
  }
  // en el juego a los hombres los pinta su batch; aquí cada uno se pinta solo, con su sombra
  S.scene.traverse(o => {
    if (o.isSkinnedMesh) o.visible = o.castShadow = true;
  });
  const f = S.focus(0);
  camS.tx = f[0];
  camS.tz = f[2];
  camS.yaw = camS.yawT = S.yaw0;
  camS.zoom = camS.zoomT = S.zoom;
  proUI().classList.add('on');
  proFade(1);
}
function proStop(quiet) {
  const S = PRO.S;
  if (!S) return;
  PRO.on = false;
  PRO.S = null;
  proLoops(null);
  // las luces vuelven al mundo del juego, y las partículas de la escena se apagan
  for (const l of proLights()) scene.add(l);
  for (const f of S.fx) if (f.L) f.L.intensity = 0;
  if (S.world) {
    CITY_WARM.keep = CITY_WARM.on = false;
    scene.remove(S.scene);
    for (const [o, v] of S.hid) o.visible = v;
  }
  for (let k = 0; k < PN; k++) PT[k] = PL[k];
  LP_N = 0;
  SHK.force = true;
  for (const u of S.men) if (u.m.root.parent) u.m.root.parent.remove(u.m.root);
  const mine = new Set();
  S.scene.traverse(o => mine.add(o));
  for (const u of S.men) mine.add(u.m.root);
  RIGS = RIGS.filter(r => !mine.has(r.root));
  for (const h of S.helis) {
    const i = REFL.indexOf(h.g);
    if (i >= 0) REFL.splice(i, 1);
  }
  for (const t of S.trash)
    try {
      t.dispose();
    } catch (e) {}
  // todo como estaba: el menú o la pantalla de los textos, la cámara y la radio vacía
  const P_ = PRO.prev,
    B = document.body;
  if (P_) {
    $('overlay').hidden = P_.ov;
    B.classList.remove('cine', 'prolog');
    for (const c of P_.cls) B.classList.add(c);
    CINE = P_.cine && P_.cine.on ? P_.cine : { on: false };
    Object.assign(camS, P_.cam);
    $('bSkip').hidden = P_.skip;
    $('bSkip').textContent = P_.skipT;
    PRO.prev = null;
  }
  clearChat();
  const el = $('filmUI');
  if (el) {
    el.classList.remove('on');
    proTag(null);
  }
  if (!quiet && S.done) S.done();
}
function proFrame(rdt) {
  const S = PRO.S;
  if (!S) return;
  const dt = window.__proDT != null ? window.__proDT : Math.min(rdt, 0.05); // en las pruebas se avanza a mano
  const now = performance.now();
  S.t += dt;
  proFade(Math.max(1 - S.t / 1.0, (S.t - (S.D - 1.1)) / 1.0));
  if (S.tagOff && S.t > S.tagOff && !S.tagGone) {
    S.tagGone = true;
    proTag(null);
  }
  if (S.world) return cityFrame(S, dt, now);
  if (S.kind === 'aid') aidStep(S, dt);
  else raidStep(S, dt);
  proMenStep(S, dt);
  proFlagStep(S, dt);
  proChickensStep(S, dt);
  proDogsStep(S, dt);
  proBirdsStep(S, dt);
  proLitterStep(S, dt);
  proFxStep(S, dt);
  // la cámara del juego: sigue lo que importa, y el jugador la gira, la acerca y la inclina como en las demás cinemáticas
  const f = S.focus(S.t),
    a = Math.min(1, dt * 2.4);
  camS.tx += (f[0] - camS.tx) * a;
  camS.tz += (f[2] - camS.tz) * a;
  camS.zoomT = clamp(S.zoom * CINE.uz, 4, 30);
  camS.yawT = S.yaw0 + CINE.uyaw + S.t * (S.spin || 0);
  camS.yaw += (camS.yawT - camS.yaw) * Math.min(1, dt * 9);
  camS.zoom += (camS.zoomT - camS.zoom) * Math.min(1, dt * 10);
  camPitchStep(dt);
  updCam();
  // el sol, la calima, las luces de los disparos y el polvo del aire: lo mismo que en una misión
  setSun(S.hour);
  updLights(dt, now);
  proAmbient(S, dt);
  updParticles(dt);
  pMat.uniforms.uScale.value = lowH / (2 * halfH());
  pMat.uniforms.fNear.value = S.scene.fog.near;
  pMat.uniforms.fFar.value = S.scene.fog.far;
  const U = postMat.uniforms;
  U.uTime.value = (now / 1000) % 100;
  U.uNight.value = nightF;
  U.uGold.value = goldF;
  if (S.gold) {
    // el tono de la escena: más dorado/anaranjado que lo que da la hora por sí sola
    U.uGold.value = Math.max(goldF, S.gold[0]);
    goldT.set(S.gold[1], S.gold[2], S.gold[3]);
  }
  U.uNVOn.value = 0;
  // y se pinta igual: escena, oclusión ambiental y rayos de sol, y la pasada de película (calima, cielo, etalonaje y antialias)
  renderer.shadowMap.needsUpdate = true;
  S.scene.updateMatrixWorld();
  renderer.setRenderTarget(rt);
  renderer.render(S.scene, cam);
  atmoFrame(now);
  if (S.rayK != null) postMat.uniforms.uRay.value *= S.rayK; // con el sol bajo, los rayos sobre tanto polvo lo velan todo
  renderRays();
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  if (S.t >= S.D) proStop();
}

/* ================================================================ escena 1 · el puesto de ayuda ================================================================ */
// el camión con la caja hacia el sur y la gente apiñada detrás; la técnica llega desde el fondo (el sur) con su escolta
// la pista de tierra que pasa por detrás de la gente, y el camino de la técnica: llega por ella y gira hacia el camión
const aidRoadZ = x => -15.7 + 0.5 * Math.sin(x / 7);
const AID_CURVE = new T.CatmullRomCurve3(
  [
    [-31, aidRoadZ(-31)],
    [-20, aidRoadZ(-20)],
    [-10, aidRoadZ(-10)],
    [-4.2, aidRoadZ(-4.2) + 0.1],
    [-1.3, -13.9],
    [-1.0, -11.2],
    [-0.75, -8.4],
    [-0.6, -6.6]
  ].map(p => new T.Vector3(p[0], 0, p[1])),
  false,
  'centripetal'
);
const AID_MEET = [-1.35, -14.0]; // donde esperan los milicianos, justo donde empieza la gente
function aidTechAt(s) {
  const L = AID_CURVE.getLength(),
    u = clamp(s / L, 0, 1),
    p = AID_CURVE.getPointAt(u),
    d = AID_CURVE.getTangentAt(u);
  return [p.x, p.z, Math.atan2(d.x, d.z)];
}
function aidMeetS() {
  // la distancia por el camino hasta el punto de encuentro
  if (PRO.meetS != null) return PRO.meetS;
  const L = AID_CURVE.getLength();
  let best = 0,
    bd = 1e9;
  for (let k = 0; k <= 400; k++) {
    const p = AID_CURVE.getPointAt(k / 400),
      d = Math.hypot(p.x - AID_MEET[0], p.z - AID_MEET[1]);
    if (d < bd) {
      bd = d;
      best = (k / 400) * L;
    }
  }
  return (PRO.meetS = best);
}
function aidBuild(S) {
  const R = proRng(19);
  S.yaw0 = Math.PI + 0.75; // desde detrás de la técnica, un poco de lado: el camión al fondo
  S.zoom = 8.2;
  S.spin = 0.01;
  S.tagOff = 9;
  const houses = [
    { t: 2, x: -19, z: 9, ry: 0.4 },
    { t: 5, x: 17, z: 14, ry: -2.3 },
    { t: 0, x: 24, z: -6, ry: -1.4 },
    { t: 7, x: -25, z: -24, ry: 1.2 },
    { t: 3, x: -6, z: 24, ry: 3.0 },
    { t: 1, x: 14, z: -27, ry: 2.6 }
  ];
  // el mercadillo: un cobertizo de lona verde a un lado y unos puestos al otro
  const TARP = [-11.5, -1.5],
    STALLS = [
      [11.5, -7.5, -Math.PI / 2, 0.07, 1],
      [11.8, -4.4, -Math.PI / 2, 0.33, 0],
      [12.1, -1.4, -Math.PI / 2, 0.52, 1],
      [12.3, 1.8, -Math.PI / 2 - 0.1, 0.71, 0],
      [8.5, 6.6, -2.6, 0.86, 1],
      [-12.4, -7.6, Math.PI / 2, 0.45, 0]
    ];
  const keep = (x, z) =>
    Math.hypot(x, z + 5) < 15 ||
    Math.abs(z - aidRoadZ(x)) < 3 ||
    Math.hypot(x - TARP[0], z - TARP[1]) < 7 ||
    STALLS.some(q => Math.hypot(x - q[0], z - q[1]) < 3) ||
    houses.some(h => Math.hypot(x - h.x, z - h.z) < 11);
  proEnv(S, {
    keep,
    bushes: 420,
    grass: 3600,
    grassR: 140,
    shrubK: 0.3,
    treeN: 12,
    seed: 11,
    rocks: 220,
    rockR: 110,
    litter: 160,
    litterAt: [0, -5, 16],
    flats: [[0, -5, 14]],
    // el suelo pisoteado alrededor del camión y la pista de tierra que cruza por detrás de la gente
    paint: (x, z, n3) => {
      const d = Math.hypot(x * 0.9, z + 5);
      let a = (1 - proSS(9, 18, d)) * 0.8;
      const dz = Math.abs(z - aidRoadZ(x)),
        on = 1 - proSS(1.0, 2.0, dz),
        rut = Math.exp(-Math.pow((dz - 0.55) / 0.12, 2)) * 0.5;
      if (on > 0.01) return [0.63 - rut * 0.08 + (n3 - 0.5) * 0.04, 0.54 - rut * 0.07, 0.43 - rut * 0.05, Math.max(a, on * 0.9)];
      return a > 0.01 ? [0.66, 0.57, 0.45, a] : null;
    },
    trees: [
      [12.5, -14, 1.15, 1],
      [-15, -27, 0.9, 3],
      [-20, 3, 1.0, 2]
    ],
    thickets: [
      [-17, -32, 4, 3],
      [19, -26, 4, 3]
    ]
  });
  {
    const pts = [];
    for (let x = -90; x <= 90; x += 1.5) pts.push([x, aidRoadZ(x)]);
    proRoad(S, null, null, pts, 1.7);
  }
  proHouses(S, houses);
  proChickens(S, [
    [-16, 13, 5],
    [14, 11, 4],
    [21, -2, 3]
  ]);
  proBirds(S, 2, -4, 7);
  // el camión, los sacos y los que ya están en el suelo
  const tr = proTruck(S);
  S.truck = tr;
  const sg = proSackGeo(),
    sm_ = new T.MeshLambertMaterial({ color: 0xffffff });
  const sacks = [];
  for (let l = 0; l < 3; l++)
    for (let r = 0; r < 6; r++)
      for (const sx of [-0.5, 0.5]) {
        if (l === 2 && (r < 1 || R() < 0.3)) continue;
        sacks.push([sx + (R() - 0.5) * 0.08, 1.47 + l * 0.22, -3.45 + r * 0.5 + (R() - 0.5) * 0.06, (R() - 0.5) * 0.16]);
      }
  const sim = new T.InstancedMesh(sg, sm_, sacks.length + 9);
  const dm = new T.Object3D(),
    cc = new T.Color();
  sacks.forEach((s, k) => {
    dm.position.set(s[0], s[1], s[2]);
    dm.rotation.set(0, s[3], (R() - 0.5) * 0.1);
    dm.updateMatrix();
    sim.setMatrixAt(k, dm.matrix);
    const t = 0.82 + R() * 0.14;
    sim.setColorAt(k, cc.setRGB(t, t * 0.95, t * 0.84));
  });
  for (let k = 0; k < 9; k++) {
    dm.position.set((R() - 0.5) * 2.6, 0.13, -4.3 - R() * 1.4);
    dm.rotation.set(0, R() * 3, (R() - 0.5) * 0.3);
    dm.updateMatrix();
    sim.setMatrixAt(sacks.length + k, dm.matrix);
    sim.setColorAt(sacks.length + k, cc.setRGB(0.88, 0.84, 0.74));
  }
  sim.castShadow = sim.receiveShadow = true;
  tr.add(sim);
  S.trash.push(sm_);
  // la bandera, la tienda blanca del puesto y el Willys blanco de la Cruz Roja junto al camión
  proFlag(S, 3.6, 3.4);
  proTent(S, 9.5, 6.5, -0.35, 1.0);
  const jw = proJeep(S, 'f_willys', WILLYS_HUB);
  jw.g.position.set(-4.6, 0, 1.6);
  jw.g.rotation.y = 0.28;
  // el mercadillo
  proTarp(S, TARP[0], TARP[1], Math.PI / 2 + 0.08, 7.5, 3.4);
  proMarket(S, STALLS);
  for (let k = 0; k < 6; k++) proProp(S, 'market', ['msack1', 'msack2', 'mstack'][k % 3], TARP[0] + (R() - 0.5) * 2.4, 0, TARP[1] + (R() - 0.5) * 6, R() * 6, 0.9);
  // el hombre de pie sobre los sacos, repartiendo
  const top = proMan(S, 'militia', 0.05, -2.27, Math.PI, { y: 1.84 * PRO_K, gest: 'harangue', noGun: true, team: 'civ' });
  top.onGround = false;
  S.top = top;
  // la multitud: como la milicia, pero sin armas; apiñada y peleándose contra la trasera, más suelta hacia fuera
  const rear = [0, -2.9];
  S.crowd = [];
  const GS = ['reach', 'reach', 'clamor', 'shove', 'fist', 'argue', 'reach', 'clamor'];
  for (let k = 0; k < 900 && S.crowd.length < 128; k++) {
    const a = (R() * 2 - 1) * Math.PI * 0.97 - Math.PI / 2,
      r = 0.9 + Math.pow(R(), 0.7) * 9.5,
      x = rear[0] + Math.cos(a) * r * 1.2,
      z = rear[1] + Math.sin(a) * r;
    if (z > -2.6 && Math.abs(x) < 1.9) continue;
    if (z > 2.2) continue;
    if (Math.hypot(x + 4.6, z - 1.6) < 2.6) continue; // el jeep de la Cruz Roja
    if (S.crowd.some(c => Math.hypot(c.home[0] - x, c.home[1] - z) < 0.56)) continue;
    const face = Math.atan2(rear[0] - x, rear[1] + 0.6 - z) + (R() - 0.5) * 0.7;
    const near = r < 4.5;
    const c = proMan(S, 'militia', x, z, face, { noGun: true, team: 'civ', gest: near ? GS[Math.floor(R() * GS.length)] : R() < 0.5 ? 'reach' : 'clamor' });
    c.home = [x, z];
    c.ph = R() * 6.28;
    c.push = near ? 0.25 + R() * 0.3 : 0.1;
    S.crowd.push(c);
  }
  // la gente de alrededor, que no se mete en el tumulto: en el mercadillo, junto a las casas y a la orilla de la pista
  proOnlookers(
    S,
    [
      [TARP[0], TARP[1], 7, 2.4, 'watch'],
      [10.2, -2, 6, 3.5, 'mix'],
      [-17, 7, 4, 3, 'mix'],
      [15, 11, 4, 3, 'mix'],
      [7, -19, 5, 4, 'walk'],
      [-9, -20, 4, 4, 'watch'],
      [-2, 16, 5, 5, 'mix'],
      [20, -10, 3, 3, 'walk']
    ],
    R
  );
  // la técnica, el ametrallador, el del megáfono y diez milicianos a los lados
  const T_ = proTech(S);
  S.tech = T_;
  T_.L = AID_CURVE.getLength();
  T_.s = 0;
  const gun = proMan(S, 'militia', 0, 0, 0, { noGun: true, pose: 'ready' });
  gun.ride = true;
  gun.post = (u, m) => {
    m.shR.rotation.x = -1.25;
    m.shL.rotation.x = -1.25;
    m.elR.rotation.x = -0.5;
    m.elL.rotation.x = -0.5;
  };
  const spk = proMan(S, 'militia', 0, 0, 0, { gun: 'ak' });
  spk.ride = true;
  proMegaphone(spk);
  T_.g.add(gun.m.root, spk.m.root);
  gun.m.root.position.set(TECH_PIV[0] - 0.05, 0.62, TECH_PIV[2] - 0.45);
  spk.m.root.position.set(-0.5, 0.62, -1.45);
  S.gunner = gun;
  S.speaker = spk;
  // los milicianos armados esperan a la técnica donde empieza la gente; cuando llega se ponen a sus lados y avanzan con ella
  S.esc = [];
  const [mx0, mz0, mh0] = aidTechAt(aidMeetS());
  for (let k = 0; k < 10; k++) {
    const side = k < 5 ? -1 : 1,
      i = k % 5;
    const off = [side * (2.1 + (i % 2) * 0.7 + R() * 0.3), 2.4 - i * 1.5 + R() * 0.4];
    const cx = mx0 + off[0] * Math.cos(mh0) + off[1] * Math.sin(mh0),
      cz = mz0 - off[0] * Math.sin(mh0) + off[1] * Math.cos(mh0);
    // de momento sueltos, a la orilla de la pista, mirando por donde viene
    const e = proMan(S, 'militia', cx + (R() - 0.5) * 2.2 - 1.2, cz + (R() - 0.5) * 1.6 - 1.4, -Math.PI / 2 + (R() - 0.5) * 0.8, { gun: 'ak' });
    e.off = off;
    e.rel = [];
    const n = 2 + Math.floor(R() * 2);
    for (let q = 0; q < n; q++) e.rel.push(0.2 + R() * 2.4);
    e.shots = [];
    e.up = 0;
    e.post = (u, m) => {
      // el fusil apuntando al cielo mientras dispara
      const k2 = u.up;
      if (k2 > 0.01) {
        m.shR.rotation.x -= 1.35 * k2;
        m.shL.rotation.x -= 1.25 * k2;
        m.chest.rotation.x -= 0.25 * k2;
      }
    };
    S.esc.push(e);
  }
  proTag('Puesto internacional de ayuda humanitaria', 'Afueras de Mogadiscio · 1992');
  // la cámara: primero la pelea por los sacos; luego la técnica que llega por la pista; al final, entre la técnica y la gente
  S.focus = t => {
    const [x, z] = aidTechAt(T_.s);
    const a = proSS(2.5, 5.5, t),
      b = proSS(9.5, 12.5, t);
    const cx = x * 0.82 * a,
      cz = -4.5 * (1 - a) + (z * 0.82 - 4.5 * 0.18) * a;
    return [cx * (1 - b) + x * 0.5 * b, 0, cz * (1 - b) + ((z - 3) * 0.5) * b];
  };
}
function aidStep(S, dt) {
  const t = S.t,
    T_ = S.tech,
    meet = aidMeetS();
  // la técnica: llega por la pista y para donde la esperan; luego avanza al paso de los milicianos hacia el camión;
  // tras los tiros y el aviso, sigue unos segundos más, despacio
  let v = 0;
  if (S.adv == null) {
    v = t < 1.0 ? 0 : Math.min(3.4, (t - 1.0) * 1.6, 0.25 + (meet - T_.s) * 0.55);
    if (T_.s >= meet - 0.03) {
      v = 0;
      if (S.met == null) S.met = t;
      if (t > S.met + 1.7) {
        S.adv = t;
        for (const e of S.esc) e.shots = e.rel.map(r => t + r);
      }
    }
  } else {
    const fin = S.said != null ? S.said + 3 : 1e9;
    v = Math.min(0.85, (t - S.adv) * 0.8);
    if (S.said != null) v = Math.min(v, 0.55);
    if (t > fin) v = Math.max(0, 0.55 - (t - fin) * 0.6);
  }
  T_.s = Math.min(T_.L, T_.s + v * dt);
  if (S.adv == null) T_.s = Math.min(T_.s, meet);
  const [x, z, hd] = aidTechAt(T_.s);
  T_.g.position.set(x, S.hf(x, z) + (v > 0.2 ? Math.sin(t * 15) * 0.012 : 0), z);
  T_.g.rotation.y = hd;
  T_.body.rotation.x = clamp((-(v - (T_.v == null ? v : T_.v)) / Math.max(dt, 1e-3)) * 0.01, -0.03, 0.03);
  T_.v = v;
  T_.piv.rotation.y = -0.1;
  T_.piv.rotation.x = -0.34;
  for (const r of [S.gunner, S.speaker]) r.face = 0;
  // la polvareda de la técnica
  S.dAcc = (S.dAcc || 0) + dt * 55 * clamp(v / 2.2, 0, 1) + dt * 6 * clamp(v / 0.5, 0, 1);
  while (S.dAcc > 1) {
    S.dAcc -= 1;
    const bx = x - Math.sin(hd) * 1.5 + rr(-0.8, 0.8),
      bz = z - Math.cos(hd) * 1.5 + rr(-0.5, 0.5);
    proDust(bx, S.hf(bx, bz) + 0.15, bz, -Math.sin(hd) * rr(0.3, 0.9) + rr(-0.4, 0.4), rr(0.15, 0.5), -Math.cos(hd) * rr(0.3, 0.9) + rr(-0.4, 0.4), rr(3, 5), rr(0.6, 1.0), rr(3, 5), rr(0.3, 0.42));
  }
  // los milicianos: esperan sueltos; cuando para la técnica se ponen a sus lados y avanzan a su paso
  const ch = Math.cos(hd),
    sh = Math.sin(hd);
  for (const e of S.esc) {
    const tx = x + e.off[0] * ch + e.off[1] * sh,
      tz = z - e.off[0] * sh + e.off[1] * ch;
    if (S.met == null) {
      e.vx = e.vz = 0;
      const [qx, qz] = aidTechAt(T_.s);
      e.face = Math.atan2(qx - e.x, qz - e.z); // miran cómo llega
    } else if (proWalk(e, tx, tz, S.adv == null ? 1.6 : v * 1.15 + 0.35, dt)) e.face = S.adv == null ? Math.atan2(x - e.x, z - e.z) : hd;
    const firing = e.shots.some(s => t > s - 0.25 && t < s + 0.35);
    e.up += ((firing ? 1 : 0) - e.up) * Math.min(1, dt * 8);
    for (let q = 0; q < e.shots.length; q++)
      if (!e.shots['d' + q] && t >= e.shots[q]) {
        e.shots['d' + q] = true;
        // una ráfaga corta al cielo: fogonazo, trazadora verde y el ruido del AK, bala a bala
        const ry = e.m.root.rotation.y,
          n = 2 + ri(3);
        for (let b = 0; b < n; b++)
          S.sched.push({
            at: t + b * 0.11,
            fn: () => {
              const mx = e.x + Math.sin(ry) * 0.3,
                my = S.hf(e.x, e.z) + 2.05,
                mz = e.z + Math.cos(ry) * 0.3;
              proMuzzle(S, mx, my, mz, false);
              if (b === 0) proTracer(S, [mx, my, mz], [mx + Math.sin(ry) * 8 + rr(-3, 3), my + 40, mz + Math.cos(ry) * 8 + rr(-3, 3)], 0x9aff5a, 0);
              if (b === 0) proShot('ak47', e.x, e.z);
            }
          });
      }
  }
  // tres disparos del 50 al aire cuando ya van entre la gente
  if (S.adv != null && t > S.adv + 2.9 && !S.fifty) S.fifty = t;
  if (S.fifty)
    for (let q = 0; q < 3; q++) {
      const key = 'f50' + q;
      if (t >= S.fifty + q * 0.32 && !S[key]) {
        S[key] = true;
        const ca = Math.cos(hd - 0.1),
          sa = Math.sin(hd - 0.1);
        const mx = x + sa * (TECH_PIV[2] + 1.25) + ch * TECH_PIV[0],
          my = TECH_PIV[1] + 0.55,
          mz = z + ca * (TECH_PIV[2] + 1.25) - sh * TECH_PIV[0];
        proMuzzle(S, mx, my, mz, true);
        proTracer(S, [mx, my, mz], [mx + sa * 60, my + 34, mz + ca * 60], 0x9aff5a, 0);
        proShot('m2', mx, mz);
        if (!S.scare) S.scare = [x, z];
      }
    }
  // la gente: pelea por los sacos; según se acerca la técnica se va apartando, y con el 50 se asustan
  const lane = -0.9;
  for (const c of S.crowd) {
    const [hx, hz] = c.home;
    c.ph += dt;
    const dT = Math.hypot(c.x - x, c.z - z);
    let tx = hx,
      tz = hz;
    // los empujones: se mecen hacia los sacos y atrás
    if (!S.fifty) {
      const k = Math.sin(c.ph * 2.3 + hx) * c.push;
      tx = hx - hx * 0.04 * k + Math.sin(c.ph * 1.7 + hz) * 0.12;
      tz = hz + (-2.6 - hz) * 0.05 * k;
    }
    // abrir paso: los que están en el camino de la técnica se apartan poco a poco a los lados
    const inLane = hz < -5.2 && Math.abs(hx - lane) < 3.8;
    if (inLane && S.adv != null && z > hz - 4.6) {
      const side = hx < lane ? -1 : 1;
      tx = lane + side * (3.9 + Math.abs(hx - lane) * 0.3);
      tz = hz + 0.8;
    }
    // con los tiros del 50: un respingo, se agachan los más cercanos y se alejan de la técnica
    if (S.fifty && t > S.fifty + 0.05) {
      if (!c.scared) {
        c.scared = true;
        c.m.lbGst = null;
        c.gest = null;
        c.gestMove = false;
        if (dT < 10 && rnd() < 0.6) {
          c.stance = 'crouch';
          c.upAt = t + rr(0.6, 1.4);
        }
        const a = Math.atan2(c.x - x, c.z - z) + rr(-0.5, 0.5);
        c.flee = [c.x + Math.sin(a) * rr(1.5, 4), c.z + Math.cos(a) * rr(1.5, 4)];
      }
      if (c.stance === 'crouch' && t > c.upAt) c.stance = 'stand';
      if (c.stance === 'stand') {
        tx = c.flee[0];
        tz = c.flee[1];
      } else {
        tx = c.x;
        tz = c.z;
      }
    }
    if (Math.hypot(tx - c.x, tz - c.z) > 0.12) {
      const sp = S.fifty && t > S.fifty ? 2.4 : inLane ? 1.15 : 0.55;
      proWalk(c, tx, tz, sp, dt);
      c.gestMove = !inLane && !c.scared; // empujando sin dejar de pedir
      if (c.gestMove) c.face = Math.atan2(-c.x, -2.2 - c.z);
    } else {
      c.vx = c.vz = 0;
      c.gestMove = false;
      const fx = c.scared ? x : 0,
        fz = c.scared ? z : -2.2;
      c.face = Math.atan2(fx - c.x, fz - c.z) + (c.scared ? 0 : Math.sin(c.ph * 0.7) * 0.3);
    }
    if (c.scared && !c.gest && c.stance === 'stand' && t > S.fifty + 1.6 && rnd() < dt * 0.5) c.gest = 'fist';
  }
  if (S.fifty && !S.calm) {
    S.calm = true;
    S.top.gest = null;
    S.top.m.lbGst = null;
    S.top.stance = 'crouch';
  }
  proOnlookersStep(S, dt, S.fifty, x, z);
  // el del megáfono, un poco después de los tiros
  if (S.fifty && t > S.fifty + 1.4 && S.said == null) {
    S.said = t;
    S.speaker.gest = 'megaphone';
    S.speaker.m.lbGst = null;
    proSay('Guerrillero de Aidid', '¡Esta comida es propiedad de Mohamed Farah Aidid! ¡Volved a vuestras casas!', 'bad');
  }
  if (S.said != null && t > S.said + 4.6 && !S.ended) {
    S.ended = true;
    S.D = Math.min(S.D, t + 1.4);
  }
  S.zoom = 8.2 + proSS(2.5, 5.5, t) * 2.6 - proSS(9.5, 12.5, t) * 2.2;
  const vn = clamp(v / 2.6, 0, 1);
  proLoops({ eng_hum: 0.14 * vn + 0.05 * (t > 1 ? 1 : 0), tyres: 0.06 * vn, truck: 0.1 * vn });
}

/* ================================================================ escena 3 · Mogadiscio desde las afueras ================================================================ */
// la ciudad del juego vista casi en horizontal desde las afueras del oeste: una cámara con perspectiva, a unos 50 m de altura
// y 10° hacia abajo, con el horizonte y el cielo arenoso arriba; se desplaza despacio de lado. Gente y algún coche por las
// calles, milicianos en las esquinas, sin humo ni combate. En el centro de la vista, Bakara y las calles hacia Hawlwadig.
const CITY_CAM = { x: -6, y: 34, z0: 384, z1: 362, pitch: (10 * Math.PI) / 180, fov: 24, far: 320 };
// los trozos de ciudad que caen en la vista (un trapecio hacia el este); se van generando antes, durante los textos
function cityChunks() {
  const C = CITY_CAM,
    zm = (C.z0 + C.z1) / 2,
    out = [];
  for (let j = Math.floor((zm - 200) / CS); j <= Math.floor((zm + 200) / CS); j++)
    for (let i = Math.floor(C.x / CS); i <= Math.floor((C.x + C.far) / CS); i++) {
      const f = i * CS + CS / 2 - C.x,
        l = Math.abs(j * CS + CS / 2 - zm);
      if (f < 30 || f > C.far || l > 40 + f * 0.46) continue;
      out.push([f, i, j]);
    }
  return out.sort((a, b) => a[0] - b[0]).map(q => [q[1], q[2]]);
}
const CITY_WARM = { list: null, on: false };
function cityWarm() {
  if (CITY_WARM.on) return;
  CITY_WARM.on = CITY_WARM.keep = true; // mientras, el mundo de fondo no tira las texturas de suelo de esos trozos
  CITY_WARM.list = cityChunks();
  CITY_WARM.k = 0;
  const step = () => {
    if (!CITY_WARM.on) return;
    const t0 = performance.now();
    while (CITY_WARM.k < CITY_WARM.list.length && performance.now() - t0 < 12) {
      const [i, j] = CITY_WARM.list[CITY_WARM.k++],
        ch = chunkAt(i, j);
      if (!ch.gen) genChunk(ch);
      if (!ch.tex) ensureGround(ch);
    }
    if (CITY_WARM.k < CITY_WARM.list.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function cityBuild(S) {
  const R = proRng(53),
    C = CITY_CAM;
  S.hf = () => 0;
  S.zoom = 26;
  S.yaw0 = -Math.PI / 2;
  S.focus = () => [camS.tx, 0, camS.tz];
  S.pcam = new T.PerspectiveCamera(C.fov, innerWidth / innerHeight, 2, 900);
  // fuera lo que hay en el mundo de fondo: los soldados, los helicópteros, los disparos y el humo
  S.hid = [];
  const hide = o => {
    if (o && o.visible) {
      S.hid.push([o, true]);
      o.visible = false;
    }
  };
  for (const r of RIGS) hide(r.root);
  for (const o of scene.children) if (o.isSkinnedMesh) hide(o);
  for (const g of REFL) hide(g);
  if (FLIGHT && FLIGHT.helis) for (const h of FLIGHT.helis) hide(h.g);
  for (const f of fx) hide(f.obj);
  // la ciudad de la vista entera, cargada (casi toda se ha ido generando durante los textos anteriores) y a la vista
  CITY_WARM.on = false;
  S.chunks = [];
  for (const [i, j] of cityChunks()) {
    const ch = chunkAt(i, j);
    if (!ch.gen) genChunk(ch);
    if (!ch.tex) ensureGround(ch);
    S.chunks.push(ch);
  }
  // los cables de la luz de lejos, de canto, se ven como una raya oscura que cruza todo el horizonte: fuera en esta vista
  for (const o of world.children) if ((o.isLineSegments && o.geometry === wireGeo) || (o.isMesh && CABLE_MAT && o.material === CABLE_MAT)) hide(o);
  // gente andando por las calles del centro de la vista, y algunos parados hablando
  const spot = () => [C.x + 115 + R() * 120, (C.z0 + C.z1) / 2 + (R() - 0.5) * 60];
  S.walkers = [];
  for (let k = 0; k < 500 && S.walkers.length < 90; k++) {
    const [bx, bz] = spot(),
      g = nearestFree(Math.floor(bx), Math.floor(bz));
    if (!walk(g[0], g[1])) continue;
    const woman = R() < 0.35;
    const u = proMan(S, woman ? 'civ' : 'militia', g[0] + 0.5, g[1] + 0.5, R() * 6.28, { noGun: true, team: 'civ', woman });
    u.cw = { path: [], wait: R() * 2.5, spd: 0.75 + R() * 0.45, still: R() < 0.25 };
    if (u.cw.still && R() < 0.6) u.gest = 'argue';
    S.walkers.push(u);
  }
  // y la milicia: grupos de hombres armados en las esquinas, sin combate todavía
  S.mil = [];
  for (let tries = 0; S.mil.length < 16 && tries < 300; tries++) {
    const [bx, bz] = spot(),
      g = nearestFree(Math.floor(bx), Math.floor(bz));
    if (!walk(g[0], g[1])) continue;
    const n = 2 + Math.floor(R() * 3);
    for (let i = 0; i < n && S.mil.length < 16; i++) {
      const a = (i / n) * 6.28;
      const u = proMan(S, 'militia', g[0] + 0.5 + Math.cos(a) * 0.7, g[1] + 0.5 + Math.sin(a) * 0.7, a + Math.PI + (R() - 0.5), { gun: 'ak' });
      if (R() < 0.4) u.gest = 'argue';
      S.mil.push(u);
    }
  }
  // algún coche por las calles que se ven de frente y de lado
  S.cars = [];
  const car = (model, a, b, v, hubs) => {
    const c = proJeep(S, model, hubs);
    Object.assign(c, { a, b, v, L: Math.hypot(b[0] - a[0], b[1] - a[1]) });
    S.cars.push(c);
  };
  car('f_jeep', [235, 345], [235, 400], 3.6);
  car('f_willys', [220.3, 395], [220.3, 340], 3.2, WILLYS_HUB);
  car('f_jeep', [256, 340], [256, 400], 3.8);
  // el Black Hawk de mando (C2) cruza a lo lejos por encima de la ciudad, de derecha a izquierda
  const c2 = makeHeliObj();
  S.scene.add(c2.g);
  S.helis.push(c2);
  S.c2 = c2;
  proTag('Mogadiscio · 3 de octubre de 1993', 'Territorio de la milicia de Aidid');
  iscStart(); // la música entra con la ciudad
}
function cityStep(S, dt) {
  for (const u of S.walkers) {
    const c = u.cw;
    if (c.still) {
      u.vx = u.vz = 0;
      continue;
    }
    if (!c.path.length) {
      c.wait -= dt;
      u.vx = u.vz = 0;
      if (c.wait <= 0) {
        const g = nearestFree(Math.floor(u.x + rr(-9, 9)), Math.floor(u.z + rr(-9, 9)));
        c.path = findPath(Math.floor(u.x), Math.floor(u.z), g[0], g[1]) || [];
        c.wait = rr(1, 4);
      }
      continue;
    }
    const n = c.path[0];
    if (proWalk(u, n[0] + 0.5, n[1] + 0.5, c.spd, dt) || Math.hypot(n[0] + 0.5 - u.x, n[1] + 0.5 - u.z) < 0.3) c.path.shift();
  }
  for (const c of S.cars) {
    const k = clamp((S.t * c.v) / c.L, 0, 1),
      x = c.a[0] + (c.b[0] - c.a[0]) * k,
      z = c.a[1] + (c.b[1] - c.a[1]) * k;
    c.g.position.set(x, 0, z);
    c.g.rotation.y = Math.atan2(c.b[0] - c.a[0], c.b[1] - c.a[1]);
    for (const w of c.wheels) w.rotation.x += (c.v * dt) / 0.36;
  }
}
function cityFrame(S, dt, now) {
  const C = CITY_CAM;
  cityStep(S, dt);
  proMenStep(S, dt);
  // la cámara con perspectiva: va de lado, despacio; el jugador puede girarla un poco
  const k = clamp((S.t + 0.6) / (S.D + 0.6), 0, 1),
    z = C.z0 + (C.z1 - C.z0) * (k * k * (3 - 2 * k) * 0.35 + k * 0.65),
    yaw = CINE.uyaw * 0.35,
    cp = Math.cos(C.pitch);
  cam.position.set(C.x, C.y, z);
  cam.up.set(0, 1, 0);
  cam.lookAt(C.x + Math.cos(yaw) * cp * 100, C.y - Math.sin(C.pitch) * 100, z + Math.sin(yaw) * cp * 100);
  S.pcam.fov = C.fov / clamp(CINE.uz, 0.6, 1.6);
  S.pcam.aspect = innerWidth / innerHeight;
  S.pcam.updateProjectionMatrix();
  cam.projectionMatrix.copy(S.pcam.projectionMatrix);
  cam.projectionMatrixInverse.copy(S.pcam.projectionMatrixInverse);
  // el sol, las sombras y lo que sigue a la cámara del juego, centrados donde mira la vista
  camS.tx = C.x + C.y / Math.tan(C.pitch);
  camS.tz = z;
  camS.zoom = camS.zoomT = S.zoom;
  camS.pitch = 0.64;
  camS.yaw = camS.yawT = S.yaw0;
  postMat.uniforms.uFeed.value = 0;
  setSun(S.hour);
  scene.fog.near = 150;
  scene.fog.far = C.far - 30; // la calima se traga el borde de la ciudad cargada antes del horizonte
  // el C2, a unos 300 m, cruzando despacio por encima de los tejados
  {
    // cruza toda la vista (más ancha o más estrecha según la pantalla), por encima de la calima y por debajo de la radio
    const h = S.c2,
      u = clamp(S.t / S.D, 0, 1),
      hw = 205 * Math.tan(Math.atan(Math.tan(((S.pcam.fov / 2) * Math.PI) / 180) * S.pcam.aspect)) + 10;
    h.g.position.set(C.x + 205, (S.pcam.aspect < 1 ? 20.5 : 24) + Math.sin(S.t * 0.7) * 0.3, z + hw * (1 - 2 * u));
    h.g.rotation.set(0, Math.PI, -0.07);
    h.rotor.rotation.y += dt * 17;
    if (h.tail) h.tail.rotation.x += dt * 42;
  }
  if (S.t > 2.2 && !S.said) {
    S.said = true;
    proSay(SPK['Uniform 6-4'], 'A todas las unidades: edificio objetivo confirmado. ¡Irene! Repito: ¡Irene!', 'hq'); // el teniente coronel Matthews, desde el C2
  }
  for (const ch of S.chunks) {
    ch.group.visible = true;
    if (ch.scr !== true) {
      ch.scr = true;
      ch.group.traverse(o => {
        if (!o.isLight) o.layers.mask = 3;
      });
    }
    if (ch.bxm) ch.bxm.visible = true;
    if (ch.veg) ch.veg.visible = true;
    if (ch.vegG) ch.vegG.visible = true;
  }
  S.amb = (S.amb || 0) + dt;
  updDynamic(S.amb, dt);
  updLaundry(S.amb);
  updLights(dt, now);
  const U = postMat.uniforms;
  U.uTime.value = (now / 1000) % 100;
  U.uNight.value = nightF;
  U.uGold.value = goldF;
  U.uNVOn.value = 0;
  scene.updateMatrixWorld();
  lightPool();
  shadowFrame();
  // una vista tan larga es cara: las sombras se rehacen solo de vez en cuando (el sol no se mueve) y sin oclusión ni rayos
  S.shF = (S.shF || 0) + 1;
  renderer.shadowMap.needsUpdate = S.shF % 10 === 1;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  atmoFrame(now);
  // el cielo de la tarde, limpio: azul claro arriba y arenoso en el horizonte, sin rayos de luz ni nubes que lo manchen
  U.uSkyTop.value.setRGB(0.4, 0.66, 1.0);
  U.uSkyHz.value.setRGB(0.86, 0.85, 0.8);
  U.uRay.value = 0;
  U.uCloud.value = 0;
  U.uAO.value = 0;
  U.uGlow.value *= 0.35; // sin el resplandor del sol que en vertical se ve como una columna
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  // la música sube hasta el golpe del título
  if (S.t > S.D - 2.4 && !S.rise) {
    S.rise = true;
    iscRise(4.0);
  }
  if (S.t >= S.D) proStop();
}

/* ================================================================ escena 2 · la captura en la pista ================================================================ */
const RAID_V = 5; // unos 27 km/h, en unidades por segundo
const raidRx = z => 5 * Math.sin(z / 85) + 2.5 * Math.sin(z / 37 + 1.2);
// lo que ha recorrido cada coche: los tres en fila; el primero recibe el disparo y frena, los otros detrás
function raidS(k, t) {
  const brake = [28.1, 28.5, 28.85][k],
    dec = [2.0, 2.3, 2.4][k],
    s0 = -90 - 9 * k;
  if (t < brake) return [s0 + RAID_V * t, RAID_V];
  const tau = Math.min(t - brake, RAID_V / dec);
  return [s0 + RAID_V * brake + RAID_V * tau - 0.5 * dec * tau * tau, Math.max(0, RAID_V - dec * (t - brake))];
}
function raidBuild(S) {
  const rx = raidRx,
    st = raidS(0, 60)[0],
    s3 = raidS(2, 60)[0];
  S.yaw0 = Math.PI + 0.5; // por detrás de la columna y del lado del Black Hawk
  S.rayK = 0.35;
  S.gold = [0.85, 1.2, 0.95, 0.7]; // principio del atardecer
  S.zoom = 13;
  S.spin = 0.004;
  S.tagOff = 12;
  // primero el pueblo: casas apretadas a los dos lados de la pista; luego campo abierto, sin casas, hasta el cruce y la detención
  const houses = [];
  const R = proRng(41);
  for (let k = 0; k < 20; k++) {
    const z = -124 + k * 3.4 + R() * 2,
      side = k % 2 ? 1 : -1,
      far = R() < 0.35;
    const x = rx(z) + side * (far ? 13 + R() * 6 : 5.4 + R() * 4.5);
    houses.push({ t: Math.floor(R() * 8), x, z, ry: (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (R() - 0.5) * 0.35 });
  }
  // el camino pequeño de tierra que cruza la pista en el campo, antes de la detención
  const CZ = 18,
    CA = 0.55;
  const crossD = (x, z) => Math.abs((x - rx(CZ)) * Math.sin(CA) - (z - CZ) * Math.cos(CA));
  const keep = (x, z) => (Math.abs(x - rx(z) + 8) < 7 && Math.abs(z - st) < 9) || crossD(x, z) < 1.8 || houses.some(h => Math.hypot(x - h.x, z - h.z) < 6.5);
  proEnv(S, {
    road: rx,
    roadZ: [-220, 320],
    cz: st - 50,
    cx: 0,
    bushes: 0,
    grass: 6500,
    grassR: 260,
    shrubK: 0.1,
    treeN: 10,
    seed: 23,
    rocks: 420,
    rockR: 180,
    litter: 90,
    litterAt: [rx(-90), -90, 26],
    flats: [[rx(st) - 7.6, st + 1, 7], ...houses.map(h => [h.x, h.z, 5])],
    keep,
    // el pueblo pisoteado y el camino del cruce
    paint: (x, z, n3) => {
      const d = crossD(x, z),
        on = 1 - proSS(0.8, 1.6, d);
      if (on > 0.01) return [0.64 + (n3 - 0.5) * 0.05, 0.53, 0.42, on * 0.85];
      const v = (1 - proSS(-60, -50, z)) * proSS(-140, -128, z) * (1 - proSS(8, 20, Math.abs(x - rx(z))));
      return v > 0.01 ? [0.66, 0.57, 0.45, v * 0.6] : null;
    },
    groves: [[rx(st + 22) + 14, st + 22, 6, 2]],
    boulders: [
      [rx(st - 6) + 6.5, st - 6, 1.1],
      [rx(st + 6) - 14, st + 6, 1.4],
      [rx(-20) + 7, -20, 0.9]
    ]
  });
  {
    const pts = [],
      cx = rx(CZ);
    for (let d = -140; d <= 140; d += 1.5) pts.push([cx + Math.cos(CA) * d, CZ + Math.sin(CA) * d]);
    proRoad(S, null, null, pts, 1.5);
  }
  proHouses(S, houses);
  proChickens(S, [
    [houses[3].x, houses[3].z + 2.5, 4],
    [houses[8].x, houses[8].z - 2.5, 3],
    [houses[13].x, houses[13].z + 2, 4]
  ]);
  // un perro en el pueblo, que se aparta al pasar los coches
  proDog(S, rx(-96) + 3.2, -96);
  proBirds(S, rx(-60), -60, 5);
  proSkids(S);
  S.cars = [0, 1, 2].map(() => proJeep(S));
  // el Black Hawk con los dos tiradores sentados en la puerta que da a la pista
  const bh = makeHeliObj();
  S.scene.add(bh.g);
  S.helis.push(bh);
  bh.snip = [2.68, 1.82].map(z => seatRig('delta', bh.g, 0.9, -0.03, z, PH));
  for (const p of bh.snip) p.rig.gun.visible = true;
  S.bh = bh;
  const mkLB = () => {
    const lb = littleBird();
    S.scene.add(lb.g);
    const h = { g: lb.g, rotor: lb.rotor, tail: lb.tail };
    S.helis.push(h); // solo el piloto y el copiloto: en esta captura no llevan tiradores en los bancos
    return h;
  };
  S.lb1 = mkLB();
  S.lb2 = mkLB();
  S.stops = [st, raidS(1, 40)[0], s3];
  const A = (z, off, y, t) => [t, rx(z) + off, y, z];
  // entran por detrás, desde fuera de la pantalla, y se ponen a la altura de los coches a pocos metros del suelo
  const L0 = t => raidS(0, t)[0];
  // entran por detrás, desde fuera de la pantalla, y van un rato en paralelo a la columna a pocos metros del suelo
  const P = (o, y, dz) => t => A(L0(t) + dz, o, y, t);
  // aparecen por detrás al salir la columna del pueblo y van un rato en paralelo, a pocos metros del suelo
  S.bhP = proPath([
    A(L0(5) - 110, -19, 15, 5),
    A(L0(10) - 58, -16, 11, 10),
    A(L0(14) - 14, -12.5, 6, 14),
    P(-10.5, 3.6, -1)(17.5),
    P(-10.6, 3.4, -1)(23),
    P(-10.5, 3.3, -1)(28),
    A(st + 0.5, -9.6, 3.6, 30.5),
    A(st + 1.0, -8.0, 1.9, 32.1),
    A(st + 1.1, -7.6, 0.0, 33.2),
    A(st + 1.1, -7.6, 0.0, 70)
  ]);
  S.lb1P = proPath([
    A(L0(5) - 95, 15, 11, 5),
    A(L0(10) - 44, 13, 8, 10),
    A(L0(14) - 4, 10.5, 4.5, 14),
    P(9, 3.0, 6)(17.5),
    P(8.6, 2.9, 6.5)(23),
    P(8, 2.9, 7)(28),
    A(st + 10.5, 4, 2.6, 30.2),
    A(st + 9.4, 0.4, 1.8, 32.3),
    A(st + 8.8, 0, 1.25, 34),
    A(st + 8.8, 0, 1.25, 70)
  ]);
  // el de atrás: al frenar la columna sigue de largo, se abre hacia fuera y da la vuelta despacio en una gota amplia,
  // hasta quedarse detrás del último coche mirando hacia ellos
  S.lb2P = proPath([
    A(L0(5) - 125, 17, 10, 5),
    A(L0(10) - 72, 14, 7, 10),
    A(L0(14) - 26, 11.5, 4.4, 14),
    P(9.6, 3.2, -8)(17.5),
    P(10, 3.3, -8.5)(23),
    P(9.6, 3.3, -8)(28),
    A(s3 + 9, 14.5, 3.9, 30.8),
    A(s3 + 4, 18, 4.2, 33.4),
    A(s3 - 5, 15.5, 3.9, 35.8),
    A(s3 - 11.5, 8, 3.0, 38),
    A(s3 - 10, 2.2, 1.9, 40),
    A(s3 - 8.4, 0, 1.3, 41.6),
    A(s3 - 8.4, 0, 1.3, 70)
  ]);
  S.walk = [0, 1].map(k => {
    const u = proMan(S, 'delta', 0, 0, 0, { gun: k ? 'dmr' : 'car' });
    u.hidden = true;
    return u;
  });
  S.prisoner = proMan(S, 'militia', 0, 0, 0, { noGun: true, team: 'civ' });
  S.prisoner.hidden = true;
  proTag('Afueras de Mogadiscio · 21 de septiembre de 1993', 'Captura de Osman Atto, el financiero de Aidid');
  S.yawBase = S.yaw0;
  S.focus = t => {
    const s = raidS(0, t)[0];
    // con la columna (algo por detrás mientras llegan los helicópteros); antes del disparo, sobre el primer coche;
    // ya en tierra, entre el coche y el helicóptero
    const back = proSS(8, 15, t) * (1 - proSS(20, 24, t)) * 5,
      shot = proSS(21.5, 25.5, t);
    if (t < 29) return [rx(s) - shot * 1.2, 0, s - 2 - back + shot * 2.2];
    const k = proSS(29, 33.5, t);
    return [(rx(s) - 1.2) * (1 - k) + (rx(st) - 4.2) * k, 0, (s + 0.2) * (1 - k) + (st + 0.5) * k];
  };
}
function raidCarPose(S, k, t, dt) {
  const C = S.cars[k],
    [s, v] = raidS(k, t);
  const x = raidRx(s),
    hd = Math.atan2(raidRx(s + 0.6) - raidRx(s - 0.6), 1.2);
  const acc = (v - (C.v == null ? v : C.v)) / Math.max(dt, 1e-3);
  C.v = v;
  C.s = s;
  C.g.position.set(x, 0, s);
  C.g.rotation.y = hd;
  C.pitch = sm(C.pitch || 0, clamp(-acc * 0.012, -0.05, 0.05), 1 - Math.exp(-6 * dt));
  C.body.rotation.x = C.pitch + (v > 0.5 ? Math.sin(t * 13 + k * 2) * 0.004 : 0);
  C.body.rotation.z = v > 0.5 ? Math.sin(t * 7.3 + k) * 0.006 : 0;
  C.body.position.y = v > 0.5 ? Math.abs(Math.sin(t * 9 + k)) * 0.012 : 0;
  for (const w of C.wheels) w.rotation.x += ((v * 1.5) / 0.344) * dt;
  // la polvareda detrás de cada coche
  // la polvareda detrás de cada coche: una nube espesa que se abre y se queda flotando sobre la pista
  C.dAcc = (C.dAcc || 0) + dt * 44 * clamp(v / RAID_V, 0, 1);
  while (C.dAcc > 1) {
    C.dAcc -= 1;
    const back = rr(1.5, 2.2),
      side = rr(-0.8, 0.8),
      bx = x - Math.sin(hd) * back + Math.cos(hd) * side,
      bz = s - Math.cos(hd) * back - Math.sin(hd) * side;
    proDust(bx, rr(0.1, 0.35), bz, Math.sin(hd) * v * 0.22 + rr(-0.6, 0.6), rr(0.25, 0.8), Math.cos(hd) * v * 0.22 + rr(-0.6, 0.6), rr(2.5, 4.2), rr(0.6, 1.0), rr(2.6, 4.4), rr(0.12, 0.2));
  }
  // los frenazos: cuatro rayas que se van marcando en la tierra mientras patinan
  if (acc < -1 && v > 0.15) {
    C.skD = (C.skD || 0) + v * dt;
    if (C.skD > 0.22) {
      C.skD = 0;
      const ch = Math.cos(hd),
        sh = Math.sin(hd);
      for (const w of ['FL', 'FR', 'RL', 'RR']) {
        const hb = JEEP_HUB[w],
          lx = hb[0] * PRO_K,
          lz = hb[2] * PRO_K;
        proSkid(S, x + lx * ch + lz * sh, s - lx * sh + lz * ch, hd, 0.3);
      }
      for (let q = 0; q < 3; q++) proDust(x - sh * 1.2 + rr(-0.8, 0.8), 0.15, s - ch * 1.2 + rr(-0.5, 0.5), sh * v * 0.4 + rr(-0.5, 0.5), rr(0.2, 0.5), ch * v * 0.4 + rr(-0.5, 0.5), rr(2.5, 4), 0.7, rr(3, 4.5), 0.38);
    }
  }
  return [x, s, hd, v];
}
function raidHeli(S, h, P, t, dt, o) {
  const { p, v } = P(t);
  h.g.position.set(p[0], p[1], p[2]);
  const sp = Math.hypot(v[0], v[2]);
  const hdV = sp > 0.6 ? Math.atan2(v[0], v[2]) : h.yaw == null ? 0 : h.yaw;
  const want = o.yaw != null && t > o.yawAt ? o.yaw : hdV;
  if (h.yaw == null) h.yaw = want;
  let d = want - h.yaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  h.yaw += clamp(d * Math.min(1, dt * (sp > 0.6 && !(o.yaw != null && t > o.yawAt) ? o.turnK || 1.6 : o.yawK || 1.6)), -dt * 0.9, dt * 0.9);
  const pv = h.pv || v;
  const ax = (v[0] - pv[0]) / Math.max(dt, 1e-3),
    az = (v[2] - pv[2]) / Math.max(dt, 1e-3);
  h.pv = v.slice();
  const fx = Math.sin(h.yaw),
    fz = Math.cos(h.yaw);
  const along = ax * fx + az * fz,
    side = ax * fz - az * fx;
  const onG = p[1] < 0.05;
  h.pitch = sm(h.pitch || 0, onG ? 0 : clamp(0.012 * (v[0] * fx + v[2] * fz) + 0.035 * along, -0.28, 0.3), 1 - Math.exp(-3 * dt));
  h.roll = sm(h.roll || 0, onG ? 0 : clamp(-0.04 * side - d * 0.4, -0.35, 0.35), 1 - Math.exp(-3 * dt));
  h.g.position.y += onG ? 0 : Math.sin(t * 1.7 + (o.ph || 0)) * 0.05;
  h.g.rotation.set(h.pitch, h.yaw, h.roll, 'YXZ');
  h.rotor.rotation.y += dt * (o.lb ? 26 : 17);
  if (h.tail) h.tail.rotation.x += dt * 42;
  // el polvo del rotor cuando va bajo: un anillo que sale hacia fuera
  // el polvo del rotor cuando va bajo: un anillo que sale en todas direcciones y se abre en círculo
  const alt = p[1],
    top = o.lb ? 4.2 : 6.2;
  if (alt < top) {
    const k = (1 - alt / top) * (alt < 0.05 ? 0.6 : 1);
    h.dAcc = (h.dAcc || 0) + (o.lb ? 30 : 70) * k * dt;
    while (h.dAcc > 1) {
      h.dAcc -= 1;
      const a = rnd() * 6.283,
        r = rr(0.6, 2.4) * (o.lb ? 0.7 : 1),
        out = rr(3.5, 7.5) * (o.lb ? 0.7 : 1) * (0.5 + k * 0.5),
        gx = p[0] + Math.cos(a) * r,
        gz = p[2] + Math.sin(a) * r;
      proDust(gx, S.hf(gx, gz) + rr(0.1, 0.4), gz, Math.cos(a) * out, rr(0.1, 0.5), Math.sin(a) * out, rr(2.5, 4.5), rr(0.8, 1.2), (o.lb ? 4.5 : 7) * rr(0.8, 1.2), rr(0.24, 0.4) * (0.5 + k * 0.5));
    }
  }
  return { p, v, sp, alt };
}
function raidStep(S, dt) {
  const t = S.t;
  const lead = raidCarPose(S, 0, t, dt);
  raidCarPose(S, 1, t, dt);
  raidCarPose(S, 2, t, dt);
  const B = raidHeli(S, S.bh, S.bhP, t, dt, { yaw: 0, yawAt: 30.6, yawK: 1.0, ph: 0.4 });
  const L1 = raidHeli(S, S.lb1, S.lb1P, t, dt, { lb: true, yaw: Math.PI, yawAt: 30.2, yawK: 1.2, ph: 1.7 });
  // el de atrás encara la curva con el morro (el ángulo sigue a la velocidad) y gira despacio hasta mirar a la columna
  const L2 = raidHeli(S, S.lb2, S.lb2P, t, dt, { lb: true, yaw: 0, yawAt: 39, yawK: 0.8, turnK: 1.1, ph: 2.9 });
  // el tirador: fogonazo, la trazadora cruzando y el impacto en el capó
  if (t >= 28.0 && !S.shot) {
    S.shot = true;
    const sn = S.bh.snip[0].rig;
    sn.root.updateMatrixWorld();
    const m = sn.root.getWorldPosition(_pv);
    const mz = [m.x + 0.45, m.y + 0.8, m.z];
    const hit = [lead[0] + Math.sin(lead[2]) * 1.15, 0.95, lead[1] + Math.cos(lead[2]) * 1.15];
    proMuzzle(S, mz[0], mz[1], mz[2], false);
    proShot('dmr', mz[0], mz[2]);
    // la bala, algo más lenta que en el juego para que se vea cruzar hasta el capó
    proTracer(S, mz, hit, 0xff7a3a, 0, 30, 0.07);
    S.hitAt = t + Math.max(0.1, Math.hypot(hit[0] - mz[0], hit[1] - mz[1], hit[2] - mz[2]) / 30);
    S.hitP = hit;
  }
  if (S.hitAt && t >= S.hitAt && !S.hitDone) {
    S.hitDone = true;
    const H = S.hitP;
    lightFlash(H[0], H[1] + 0.2, H[2], 0xffc070, 2.2, 4, 0.08);
    for (let q = 0; q < 10; q++) spawnP(H[0], H[1], H[2], rr(-1.2, 1.2), rr(0.6, 2.2), rr(-1.2, 1.2), rr(0.25, 0.5), 0.05, 0.03, 0xffe2a0, 0xff9a40, 1, 1, 6);
    for (let q = 0; q < 8; q++) spawnP(H[0], H[1], H[2], rr(-0.8, 0.8), rr(0.4, 1.4), rr(-0.8, 0.8), rr(0.8, 1.4), 0.15, 0.9, 0x6e6a62, 0x9a948a, 0.75, 0, 0);
    S.scare = [S.hitP[0], S.hitP[2]];
  }
  // humo negro del motor: sale del capó con la velocidad del coche, el viento se lo lleva y sube ensanchándose
  if (S.hitDone) {
    const C = S.cars[0],
      hd = lead[2],
      hx = lead[0] + Math.sin(hd) * 1.15,
      hz = lead[1] + Math.cos(hd) * 1.15,
      k = proSS(0, 2.5, t - S.hitAt);
    // el humo de los fuegos del juego: sale del capó con la velocidad del coche, sube y el aire se lo lleva
    S.smA = (S.smA || 0) + dt * (16 + 18 * k);
    while (S.smA > 1) {
      S.smA -= 1;
      const vx = Math.sin(hd) * C.v * 0.6,
        vz = Math.cos(hd) * C.v * 0.6;
      proSmoke(hx + rr(-0.3, 0.3), 0.95, hz + rr(-0.3, 0.3), vx + rr(-0.5, 0.5), rr(0.25, 0.65), vz + rr(-0.5, 0.5), rr(5, 8.5), rr(0.25, 0.4), rr(1.8, 3.8), rr(0.26, 0.42));
    }
    // alguna bocanada de vapor claro al principio, del radiador
    if (t - S.hitAt < 1.2 && rnd() < dt * 10) spawnP(hx, 0.9, hz, rr(-0.3, 0.3), 1.2, rr(-0.3, 0.3), rr(1, 1.8), 0.3, 1.6, 0xd8d6d0, 0xe6e4de, 0.5, 0, 0);
  }
  // en tierra: los Delta saltan, corren al coche, dan las voces, sale el detenido con las manos en alto
  // y lo llevan despacio a la puerta: uno lo agarra por la espalda, el otro cubre
  const W = S.walk,
    pr = S.prisoner,
    bhP = S.bh.g.position;
  const car = [lead[0] - Math.cos(lead[2]) * 1.15, lead[1] + Math.sin(lead[2]) * 1.15 - 0.2];
  const door = [bhP.x + 1.25, bhP.z + 1.6];
  if (t > 33.5 && !S.out) {
    S.out = true;
    for (const p of S.bh.snip) p.rig.root.visible = false;
    W[0].hidden = W[1].hidden = false;
    W[0].x = bhP.x + 1.05;
    W[0].z = bhP.z + 1.8;
    W[1].x = bhP.x + 1.05;
    W[1].z = bhP.z + 0.5;
    for (const u of W) u.face = u.m.root.rotation.y = Math.PI / 2;
  }
  if (S.out) {
    if (t < 37.6) {
      // a la carrera hasta el coche, apuntando; allí esperan en la puerta a que salga
      proWalk(W[0], car[0] - 1.1, car[1] + 0.6, 3.3, dt);
      proWalk(W[1], car[0] - 1.6, car[1] - 1.0, 3.1, dt);
      W[0].firing = W[1].firing = 1;
      for (const u of W) if (Math.hypot(u.vx, u.vz) < 0.05) u.look2 = Math.atan2(car[0] - u.x, car[1] - u.z);
      if (t > 34.2 && !S.said1) {
        S.said1 = true;
        proSay('Delta · Kilo 1-1', '¡Pare el coche! ¡Fuera del coche, las manos donde las vea!', 'delta');
      }
    } else {
      if (!S.pulled) {
        S.pulled = true;
        pr.hidden = false;
        pr.x = car[0] - 0.15;
        pr.z = car[1];
        pr.face = pr.m.root.rotation.y = -Math.PI / 2;
        pr.gest = 'handsUp';
        pr.gestMove = true;
      }
      if (t > 38.2 && !S.said2) {
        S.said2 = true;
        proSay('Delta · Kilo 1-1', 'Usted se viene con nosotros.', 'delta');
      }
      // el detenido, despacio, con las manos en alto hacia la puerta
      const go = t > 38.9;
      if (go) proWalk(pr, door[0], door[1], 0.95, dt);
      else proWalk(pr, car[0] - 1.0, car[1] - 0.2, 0.7, dt);
      if (!pr.m.lbGst) pr.m.lbGst = { k: 'handsUp', t: 0.5, d: 30, dir: 1, force: true };
      // el que lo lleva: detrás y un poco a un lado, con la mano izquierda en su espalda
      const hd = Math.atan2(door[0] - pr.x, door[1] - pr.z);
      const bx = pr.x - Math.sin(hd) * 0.55 + Math.cos(hd) * 0.3,
        bz = pr.z - Math.cos(hd) * 0.55 - Math.sin(hd) * 0.3;
      proWalk(W[0], bx, bz, 2.6, dt);
      W[0].look2 = hd;
      W[0].firing = 0;
      W[0].post = (u, m) => {
        m.shL.rotation.x = -1.25;
        m.shL.rotation.z = -0.25;
        m.elL.rotation.x = -0.25;
      };
      // el que cubre: al otro lado y un paso atrás, apuntando hacia los coches
      const cx = pr.x - Math.sin(hd) * 1.2 - Math.cos(hd) * 0.9,
        cz = pr.z - Math.cos(hd) * 1.2 + Math.sin(hd) * 0.9;
      proWalk(W[1], cx, cz, 2.6, dt);
      W[1].firing = 1;
      W[1].look2 = Math.atan2(lead[0] - W[1].x, lead[1] - W[1].z);
    }
  }
  // sonido: rotores según lo cerca que estén del centro de la vista, el polvo y los motores
  const near = (p, Rr) => Math.max(0, 1 - Math.hypot(p[0] - camS.tx, p[2] - camS.tz) / Rr);
  proLoops({
    rotor_bh: 0.5 * near(B.p, 70),
    rotor_lb: 0.42 * Math.max(near(L1.p, 55), near(L2.p, 55)),
    wash: 0.25 * (B.alt < 6 ? 1 - B.alt / 6 : 0) * near(B.p, 50),
    eng_hum: 0.18 * near([lead[0], 0, lead[1]], 40) * (lead[3] > 0.3 ? 1 : 0.4),
    tyres: 0.12 * near([lead[0], 0, lead[1]], 40) * (lead[3] / RAID_V)
  });
  // el zoom: algo más abierto mientras llegan los helicópteros, y se cierra sobre la captura
  // algo más abierto mientras llegan y van en paralelo los helicópteros; se cierra sobre la captura
  S.zoom = 13 + proSS(8, 14, t) * 3 - proSS(20, 24, t) * 4.5 - proSS(30, 35, t) * 4.5;
  // antes del disparo la cámara se va al lado de los Little Bird: ellos delante, el coche en medio y el Black Hawk al fondo,
  // para ver el fogonazo y la bala hasta el capó; después vuelve a donde estaba para la detención
  S.yaw0 = S.yawBase - (Math.PI / 2 + 0.25) * proSS(21.5, 25.5, t) * (1 - proSS(29.5, 33.5, t));
}
