/* ====================================================================================================
 * missions/m06-super64.js
 *
 * 6 · Super 6-4: Gordon y Shughart piden tres veces bajar a por Durant; aguantan en el sitio del derribo hasta el final
 * ================================================================================================== */

'use strict';

const S64_RY = -0.9,
  S64_PIL = (() => {
    const fx = Math.sin(S64_RY),
      fz = Math.cos(S64_RY),
      px = Math.cos(S64_RY),
      pz = -Math.sin(S64_RY);
    return { x: S64.x + fx * 2.2 + px * 1.8, z: S64.z + fz * 2.2 + pz * 1.8, face: Math.atan2(px, pz) };
  })();
const S64_R = 15;
// Durant, sentado contra la cabina con las piernas estiradas, un arma al lado y sangre debajo
function s64Pilot() {
  const rig = buildRig('delta', { gun: 'car' }),
    d = irDecor(rig, S64_PIL.x, S64_PIL.z, S64_PIL.face, { alive: true, poseName: 'sit', name: 'CW4 Mike Durant' });
  rig.gun.visible = false;
  const gm = new T.Mesh(partGeo(gunParts('saw')[0]), heliMat);
  gm.position.set(S64_PIL.x + Math.cos(S64_PIL.face) * 0.55, 0.06, S64_PIL.z - Math.sin(S64_PIL.face) * 0.55);
  gm.rotation.set(-Math.PI / 2, 0, S64_PIL.face + 0.4);
  gm.castShadow = true;
  world.add(gm);
  for (let k = 0; k < 4; k++) bloodDecal(S64_PIL.x + rr(-0.5, 0.6), S64_PIL.z + rr(-0.5, 0.6), rr(0.3, 0.55), 0.1);
  G.m.pilot = d;
  return d;
}
// un sitio despejado a unos quince metros de los restos donde un Black Hawk puede apoyar las ruedas
const S62_LZ = { x: 274.5, z: 345 }; // el claro abierto en el chabolismo (S62_CLEAR)
function s64LandSpot() {
  let best = null;
  for (let a = 0; a < 6.28; a += 0.13)
    for (const r of [15, 14, 16, 13, 17]) {
      const x = S64.x + Math.cos(a) * r,
        z = S64.z + Math.sin(a) * r;
      let ok = true;
      for (let dz = -3; dz <= 3 && ok; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const i = Math.floor(x) + dx,
            j = Math.floor(z) + dz;
          if (!inB(i, j) || grid[idx(i, j)] === 1 || topH[idx(i, j)] > 1.6) {
            ok = false;
            break;
          }
        }
      if (ok) {
        best = { x, z };
        break;
      }
      if (best) break;
    }
  return best || { x: S64.x + 12, z: S64.z + 9 };
}
function s62Door(h) {
  return [2.68, 1.82].map(z => ({ m: seatRig('delta', h.g, 0.9, -0.03, z, PH).rig }));
}
function s64Intro() {
  const pil = s64Pilot(),
    LS = S62_LZ,
    K = (x, z, y, t, ev) => ({ t, x, y, z, ev });
  // el Super 6-2 da vueltas sobre el derribo con los dos francotiradores sentados en la puerta derecha
  const orbit = [];
  const R = 55,
    ALT = 36;
  for (let k = 0; k <= 24; k++) {
    const a = (k / 24) * Math.PI * 2 * 2.2;
    orbit.push(K(S64.x + Math.cos(a) * R, S64.z + Math.sin(a) * R, ALT, k * 4.2));
  }
  const H = (G.m.h62 = scriptHeli('bh', orbit, { spline: true }));
  // sentados en el borde de la puerta derecha con las piernas fuera, igual que los Rangers del vuelo de la misión 1
  const door = s62Door(H.h);
  G.m.door = door;
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  let foc = () => [H.x, H.z, H.y],
    landT = null,
    S = {};
  cineStart({
    zoom: 11,
    spin: 0,
    yaw0: 0,
    focus: () => foc(),
    keys: [
      {
        t: 1,
        fn: () =>
          say(
            'Super 6-2',
            'Super 6-2 a Uniform 6-4. Los tiradores Delta Shughart y Gordon solicitan ser introducidos en la segunda zona de impacto para asegurarla.',
            'air',
            true
          )
      },
      {
        t: 8,
        fn: () =>
          say(
            'Uniform 6-4',
            'No, Super 6-2. Negativo a la petición. No podemos arriesgar otra nave. No vemos movimiento ahí abajo, ni siquiera sabemos si hay supervivientes. Estamos organizando un equipo de tierra que llegará pronto.',
            'hq',
            true
          )
      },
      { t: 17, fn: () => say('Super 6-2', '¿Cuál es su hora de llegada estimada? Cambio.', 'air', true) },
      {
        t: 20,
        fn: () => say('Uniform 6-4', 'No lo sabemos, pero no tardarán. Hagan lo que puedan desde el aire.', 'hq', true)
      },
      {
        t: 25,
        fn: () =>
          say(
            'Super 6-2',
            'Un gentío enorme está avanzando a seis o siete manzanas de la zona de impacto. Shughart y Gordon vuelven a solicitar permiso para asegurar la zona hasta que llegue el convoy.',
            'air',
            true
          )
      },
      {
        t: 33,
        fn: () =>
          say(
            'JOC',
            'Soy el general Garrison. Quiero estar seguro de que comprenden lo que están pidiendo. Así que díganlo alto y claro.',
            'hq',
            true
          )
      },
      {
        t: 39,
        fn: () =>
          say(
            'Gordon',
            'Permiso para asegurar la zona de impacto hasta que lleguen refuerzos terrestres.',
            'delta',
            true
          )
      },
      {
        t: 44,
        fn: () =>
          say('JOC', '¿Se dan cuenta de que no puedo decirles cuánto tiempo tardarán? Puede ser bastante.', 'hq', true)
      },
      { t: 49, fn: () => say('Gordon', 'Entendido, señor.', 'delta', true) },
      { t: 51.5, fn: () => say('JOC', '¿Siguen queriendo ir?', 'hq', true) },
      { t: 54, fn: () => say('Gordon', 'Sí, señor.', 'delta', true) },
      { t: 56, fn: () => say('JOC', 'Coronel Harrell, usted decide.', 'hq', true) },
      {
        t: 59,
        fn: () => {
          say('Uniform 6-4', 'Super 6-2, bájelos.', 'hq', true);
          // sale del círculo y se posa en el descampado junto a los restos
          const t0 = H.t,
            a0 = Math.atan2(LS.z - S64.z, LS.x - S64.x);
          H.keys = [
            K(H.x, H.z, H.y, t0),
            K(LS.x + Math.cos(a0) * 26, LS.z + Math.sin(a0) * 26, 22, t0 + 9),
            K(LS.x + Math.cos(a0) * 8, LS.z + Math.sin(a0) * 8, 8, t0 + 17),
            K(LS.x, LS.z, 1.2, t0 + 23),
            K(LS.x, LS.z, 0, t0 + 26, () => {
              landT = G.t;
            }),
            K(LS.x, LS.z, 0, t0 + 900)
          ];
          H.k = 0;
          H.turn = 0.45;
          foc = () => [H.x, H.z, H.y];
          CINE.zoom = 12;
        }
      }
    ],
    dur: 1e9,
    tick: dt => {
      animRig(pil, dt);
      // la cámara mira al lado del helicóptero donde van sentados los dos
      if (!landT) CINE.yaw0 = H.yaw + PH - 0.35;
      if (landT && !S.out && G.t > landT + 1) {
        S.out = true;
        for (const d of door) H.h.g.remove(d.m.root);
        const g = addGroup({ name: 'Kilo 4-1', role: 'Francotiradores', kind: 'delta', specs: [], at: [LS.x, LS.z] }),
          sx = Math.cos(H.yaw),
          sz = -Math.sin(H.yaw);
        const specs = [
          Object.assign({}, DELTA[4], DSPEC, {
            name: 'Sgto. Mayor Gary Gordon',
            role: 'Francotirador · jefe',
            gun: 'car',
            burst: 3,
            hp: 150,
            ammo: 420
          }),
          Object.assign({}, DELTA[4], DSPEC, {
            name: 'Sgto. 1º Randy Shughart',
            role: 'Francotirador',
            gun: 'car',
            burst: 2,
            hp: 150,
            ammo: 320
          })
        ];
        // uno al lado del otro delante del piloto, separados metro y medio largo
        const fx = Math.sin(S64_PIL.face),
          fz = Math.cos(S64_PIL.face),
          qx = Math.cos(S64_PIL.face),
          qz = -Math.sin(S64_PIL.face);
        specs.forEach((sp, i) => {
          const u = addMember(g, sp, LS.x + sx * 1.8, LS.z + sz * 1.8 + (i ? 1 : -1) * 0.7),
            sd = i ? 1 : -1;
          goTo(u, S64_PIL.x + fx * 1.7 + qx * sd * 0.95, S64_PIL.z + fz * 1.7 + qz * sd * 0.95);
          u.spd = 3;
        });
        G.m.dg = g;
        foc = () => {
          const L_ = gLive(g);
          return L_.length ? [L_[0].x, L_[0].z] : [S64.x, S64.z];
        };
        CINE.zoom = 7;
      }
      if (S.out && !S.lift && G.t > landT + 4) {
        S.lift = true;
        const t0 = H.t;
        H.keys = [
          K(LS.x, LS.z, 0, t0),
          K(LS.x, LS.z, 1.5, t0 + 3),
          K(LS.x, LS.z, 6, t0 + 7),
          K(LS.x + 30, LS.z - 36, 20, t0 + 18),
          K(LS.x + 120, LS.z - 140, 36, t0 + 32, S_ => {
            S_.gone = true;
          })
        ];
        H.k = 0;
        H.turn = 0.35;
      }
      if (S.out && !S.meet && G.m.dg && gLive(G.m.dg).every(u => !u.path.length)) {
        S.meet = G.t;
        const [gd, sh] = G.m.dg.members;
        foc = () => [S64_PIL.x, S64_PIL.z];
        CINE.zoom = 5.5;
        if (sh) sh.stance = 'crouch';
        if (gd) gd.stance = 'stand';
        sched.push({ at: G.t + 0.3, fn: () => sayU(sh, '¡Amigos!') });
        sched.push({
          at: G.t + 2.3,
          fn: () => {
            pil.talkT = 2.4;
            say('Super 6-4', 'Me alegro de veros.', 'air', true);
          }
        });
        sched.push({ at: G.t + 4.6, fn: () => sayU(gd, 'Yo también me alegro de verte. ¿Cómo estás?') });
        sched.push({
          at: G.t + 7.6,
          fn: () => {
            pil.talkT = 2.4;
            say('Super 6-4', 'Me he roto una pierna.', 'air', true);
          }
        });
        sched.push({ at: G.t + 10, fn: () => sayU(gd, 'Tendrás que aguantar un poco más.') });
        sched.push({ at: G.t + 13, fn: () => cineEnd() });
      }
    },
    onEnd: () => {
      if (!G.m.dg) {
        const g = (G.m.dg = addGroup({
          name: 'Kilo 4-1',
          role: 'Francotiradores',
          kind: 'delta',
          specs: [
            Object.assign({}, DELTA[4], DSPEC, {
              name: 'Sgto. Mayor Gary Gordon',
              role: 'Francotirador · jefe',
              gun: 'car',
              burst: 3,
              hp: 150,
              ammo: 420
            }),
            Object.assign({}, DELTA[4], DSPEC, {
              name: 'Sgto. 1º Randy Shughart',
              role: 'Francotirador',
              gun: 'car',
              burst: 2,
              hp: 150,
              ammo: 320
            })
          ],
          at: [S64_PIL.x + 1.5, S64_PIL.z + 1]
        }));
      }
      for (const d of door) if (d.m.root.parent) d.m.root.parent.remove(d.m.root);
      if (G.m.h62 && !G.m.h62.gone) G.m.h62.gone = true;
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      buildCards();
      refreshCards();
      renderSubs();
      camS.tx = S64.x;
      camS.tz = S64.z;
      camS.zoomT = 12;
      hint('Defiende la zona de impacto con Gordon y Shughart. El anillo azul marca el perímetro.');
    }
  });
}
// montones bajos de piedra y ladrillo roto alrededor del 6-4: algo detrás de lo que tirarse al suelo
function rubblePile(x, z) {
  const i = Math.floor(x),
    j = Math.floor(z),
    k = idx(i, j);
  if (!walk(i, j)) return null;
  const g = new T.Group();
  world.add(g);
  const mats = [0xb4aa98, 0x9d9484, 0xa0644a, 0x8a8070, 0xc8c0ae, 0x7a6a58].map(c => lmat(c));
  for (let n = 0; n < 14; n++) {
    const m = new T.Mesh(UBOX, pick(mats)),
      s = rr(0.12, 0.38);
    m.scale.set(s * rr(1, 1.8), s * rr(0.5, 1), s * rr(1, 1.6));
    m.position.set(i + 0.5 + rr(-0.55, 0.55), s * 0.3 + (n > 9 ? 0.18 : 0), j + 0.5 + rr(-0.55, 0.55));
    m.rotation.set(rr(-0.4, 0.4), rnd() * 3, rr(-0.4, 0.4));
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  const o = { kind: 'rubble', val: COVER_VAL.rubble || 0.6, cells: [k], i, j, g };
  grid[k] = 2;
  cov[k] = o;
  topH[k] = 0.5;
  return o;
}
function s64Rubble() {
  const lz = S62_LZ,
    n0 = [
      [-6, -3],
      [-7, 2],
      [-4, 6],
      [2, 7],
      [6, 5],
      [8, 0],
      [7, -5],
      [3, -8],
      [-2, -9],
      [-9, -7],
      [10, 4],
      [-10, 3],
      [5, 10],
      [-5, 10],
      [11, -3]
    ];
  for (const [dx, dz] of n0) {
    const x = S64.x + dx,
      z = S64.z + dz;
    if (Math.hypot(x - lz.x, z - lz.z) < 8 || Math.hypot(x - S64_PIL.x, z - S64_PIL.z) < 2.5) continue;
    rubblePile(x, z);
  }
}
// el final: Durant solo; llega la multitud, armada, y le rodea
function s64Final() {
  const pil = G.m.pilot;
  for (const e of them) if (e.alive) e.noFire = true;
  const crowd = [];
  for (let k = 0; k < 100; k++) {
    const a = rnd() * 6.283,
      r = rr(22, 46),
      e = foe(S64.x + Math.cos(a) * r, S64.z + Math.sin(a) * r, 'wave', 'crowd', CAMP_ESPEC);
    e.noFire = true;
    e.push = true;
    const b = rnd() * 6.283,
      rb = rr(2.2, 7);
    e.goal = { x: S64_PIL.x + Math.cos(b) * rb, z: S64_PIL.z + Math.sin(b) * rb };
    e.nextMove = G.t + rr(0, 4);
    crowd.push(e);
  }
  for (const e of them)
    if (e.alive && !crowd.includes(e)) {
      e.push = true;
      const b = rnd() * 6.283;
      e.goal = { x: S64_PIL.x + Math.cos(b) * rr(2.5, 6), z: S64_PIL.z + Math.sin(b) * rr(2.5, 6) };
    }
  G.alert = true;
  cineStart({
    zoom: 6.5,
    spin: 0.03,
    yaw0: camS.yaw,
    focus: () => [S64_PIL.x, S64_PIL.z],
    keys: [
      {
        t: 4,
        fn: () => {
          CINE.zoom = 8.5;
        }
      },
      {
        t: 14,
        fn: () => {
          CINE.zoom = 11;
        }
      }
    ],
    dur: 26,
    tick: dt => {
      animRig(pil, dt);
      for (const e of them)
        if (e.alive) {
          e.noFire = true;
          e.sup = 0;
          if (Math.hypot(e.x - S64_PIL.x, e.z - S64_PIL.z) < 7) {
            e.face = Math.atan2(S64_PIL.x - e.x, S64_PIL.z - e.z);
            e.stance = 'stand';
          }
        }
    },
    onEnd: () => {
      G.m.end64 = true;
    }
  });
}
MISSIONS.s64 = {
  id: 's64',
  n: 6,
  title: 'Super 6-4',
  hud: 'Defender la segunda zona de impacto',
  phase: 'day',
  hour: 16.75,
  sunHour: 17.35,
  sunRamp: [0.75, 180],
  objCol: 0x3d8bff,
  crashed: ['s61', 's64'],
  noLose: true,
  place: 'Segunda zona de impacto',
  squadTxt: 'Kilo 4-1 · Gordon y Shughart',
  date: '3 OCT 1993',
  summary:
    'Los francotiradores de Delta Gary Gordon y Randy Shughart piden bajar junto al Super 6-4 para proteger a Mike Durant. Defender la zona de impacto hasta que lleguen los refuerzos.',
  text: '16:45. El Super 6-4 de Mike Durant está en el suelo y nadie ha llegado hasta él. Durant sigue vivo, sentado junto a la cabina con una pierna rota. Desde el Super 6-2, que da vueltas sobre la zona, los tiradores de Delta Gordon y Shughart piden permiso para bajar.',
  start: [S64.x + 6, S64.z + 6],
  cam: [S64.x, S64.z, 12],
  civ: [S64.x, S64.z],
  litter: { x: S64.x + 2, z: S64.z - 6, r: 16 },
  spawn() {
    spawnForce([]);
    s64Rubble();
  },
  onStart() {
    s64Intro();
  },
  subs: [
    {
      text: 'Defender la zona de impacto hasta que lleguen refuerzos',
      zone: { x: S64.x, z: S64.z, r: S64_R },
      start: () => {
        G.nextWave = G.t + 8;
        G.waveN = 0;
      },
      tick: () => {
        const pil = G.m.pilot;
        if (pil) animRig(pil, G.dt);
        // la milicia no para de llegar, cada vez más, hasta que no queda nadie para pararla
        if (G.t >= G.nextWave) {
          G.waveN++;
          G.nextWave = G.t + Math.max(12, 26 - G.waveN * 1.5);
          const n = 4 + G.waveN,
            a = rnd() * 6.283;
          waveGoal(S64.x, S64.z, a, n, 'w64', 40, S64, G.waveN === 1 ? 'Super 6-2' : false, {
            acc: 0.24 + Math.min(0.16, G.waveN * 0.015),
            hp: 80
          });
          for (const e of them) if (e.alive && e.tag === 'w64') e.push = true;
          if (G.waveN >= 2) {
            for (let r = 0; r < Math.min(4, G.waveN >> 1); r++) {
              const b = rnd() * 6.283;
              roofFoe(S64.x + Math.cos(b) * 20, S64.z + Math.sin(b) * 20, 'w64r');
            }
          }
        }
        if (!G.m.s1 && G.waveN >= 3) {
          G.m.s1 = true;
          say('Super 6-2', 'Están llegando por todas partes. No podemos acercarnos más.', 'air', true);
        }
        if (!G.m.s2 && G.waveN >= 6) {
          G.m.s2 = true;
          say('Uniform 6-4', 'Aguantad, el convoy está en camino.', 'hq', true);
        }
      },
      count: () => 'oleada ' + (G.waveN || 0) + ' · ' + gLive(G.m.dg).length + ' en pie',
      done: () => !!G.m.dg && G.m.dg.members.length > 0 && gLive(G.m.dg).length === 0,
      onDone: () => {
        if (G.m.ring) {
          overlay.remove(G.m.ring);
          G.m.ring = null;
        }
      }
    },
    {
      text: 'Durant se queda solo',
      zone: { x: S64_PIL.x, z: S64_PIL.z, r: 4 },
      start: () => s64Final(),
      count: () => '',
      done: () => !!G.m.end64
    }
  ]
};
