/* ====================================================================================================
 * missions/m04-wolcott.js
 *
 * 4 · Wolcott: un perímetro alrededor del Super 6-1, el Super 6-8 baja por cuerda un equipo MEDEVAC, cinco minutos para mantenerlos con vida, y cae el Super 6-4
 * ================================================================================================== */

'use strict';

const S61_N = () => findWalk(S61.x, S61.z - 11),
  S61_S = () => findWalk(S61.x, S61.z + 19);
const W4C = { x: 379.2, z: 307.2 },
  W4R = 14.3,
  W4_LZ = { x: 373.1, z: 307.0 },
  W4_CP = { x: 379.9, z: 303.9 };
// los cuatro puntos verdes alrededor del derribo, cada uno contra un edificio, y la unidad que lo toma
// tal como los marqué en mi mapa: el arco, la calle del este y las azoteas de los dos edificios del suroeste y del sureste
const W4P = [
  { k: 'N', x: 372.2, z: 287.9, r: 6.7, g: 'Romeo 4-1', n: 'el arco' },
  { k: 'E', x: 386.1, z: 301.4, r: 6.8, g: 'Romeo 3-1', n: 'este' },
  { k: 'SO', x: 363.8, z: 313.4, r: 5.8, g: D_B, n: 'azotea suroeste', roof: true },
  { k: 'SE', x: 386.4, z: 326.9, r: 6.2, g: 'Romeo 1-1', n: 'azotea sureste', roof: true }
];
const w4Bld = p => {
  const b = bAt(Math.floor(p.x), Math.floor(p.z));
  return b >= 0 ? BLDS[b] : null;
};
// un punto en el suelo se tiene cuando hay tres hombres dentro de su círculo; uno de azotea cuando hay tres arriba en la azotea de ese edificio
// …y un punto solo está asegurado cuando no queda ningún miliciano vivo cerca, ni en la calle ni en las azoteas de al lado
const w4Foes = p => them.filter(e => e.alive && Math.hypot(e.x - p.x, e.z - p.z) < p.r + 9).length;
function w4Held(p) {
  const L_ = gLive(grpN(p.g)),
    need = Math.min(3, L_.length);
  if (!need || w4Foes(p) > 2) return false; // la zona no tiene que estar vacía: dos rezagados alrededor de un punto no paran el MEDEVAC
  if (p.roof) {
    const b = w4Bld(p);
    return !!b && L_.filter(u => u.inB && u.inB.b === b.id && u.inB.level === 'roof').length >= need;
  }
  return L_.filter(u => !u.inB && Math.hypot(u.x - p.x, u.z - p.z) < p.r).length >= need;
}
// manda un grupo a su punto: escaleras arriba si es una azotea; si no, repartidos alrededor del círculo
function w4Send(p) {
  const L_ = gLive(grpN(p.g));
  if (!L_.length) return;
  if (p.roof) {
    const b = w4Bld(p);
    if (!b) return;
    const keep = G.sel;
    G.sel = new Set(L_);
    cmdEnter(b.id, 'roof');
    G.sel = keep;
    return;
  }
  L_.forEach((u, i) => {
    const a = (i / L_.length) * 6.283,
      q = nearestFree(Math.floor(p.x + Math.cos(a) * p.r * 0.45), Math.floor(p.z + Math.sin(a) * p.r * 0.45));
    const pth = findPath(Math.floor(u.x), Math.floor(u.z), q[0], q[1]);
    if (pth) {
      u.path = pth;
      u.order = { type: 'move' };
    }
  });
}
// donde se arrodillan los sanitarios contra los restos, alrededor de la cabina y de la puerta de carga
const W4_MED = [
  [378.71, 304.71, -1.07],
  [377.53, 303.08, -1.07],
  [374.98, 305.61, 2.07],
  [374.46, 303.61, 2.07]
]; // x, z, orientación: de rodillas contra el fuselaje, que está tumbado de lado
const W4_HOLD = 300;
function w4Label(text, col) {
  const c = document.createElement('canvas');
  c.width = 448;
  c.height = 56;
  const x = c.getContext('2d');
  x.font = '700 30px "Barlow Condensed", "Arial Narrow", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 6;
  x.strokeStyle = 'rgba(8,12,10,.9)';
  x.strokeText(L(text), 224, 28);
  x.fillStyle = col || '#bff0b8';
  x.fillText(L(text), 224, 28);
  const t = new T.CanvasTexture(c);
  t.minFilter = T.LinearFilter;
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true }));
  overlay.add(s);
  return s;
}
function w4Points() {
  G.m.pts = W4P.map(p => {
    const lab = w4Label(p.g + ' · ' + L(p.n).toUpperCase()),
      b = p.roof ? w4Bld(p) : null,
      y = b ? b.top + 0.08 : 0.05;
    lab.position.set(p.x, y + 3.2, p.z);
    const ring = ringAt(p.x, p.z, p.r, 0x7fb6ff);
    ring.position.y = b ? y : 0.08;
    if (b) {
      ring.material.depthTest = false;
      overlay.add(ring);
    }
    return { p, ring, lab, ok: false };
  });
}
function w4Clear() {
  for (const q of G.m.pts || []) {
    overlay.remove(q.ring);
    overlay.remove(q.lab);
  }
  G.m.pts = null;
}
// sanitarios: hombres con guion en los colores del equipo, que el jugador nunca manda
function w4MedSpecs() {
  const D = (i, o) =>
    Object.assign(
      {},
      DELTA[i],
      DSPEC,
      { npc: true, noFire: true, medevac: true, unitName: 'MEDEVAC · Super 6-8', gun: 'car' },
      o
    );
  return [
    D(5, { name: 'Sgto. Tim Wilkinson', role: 'PJ · sanitario jefe', pj: true }),
    D(3, { name: 'Sgto. Scott Fales', role: 'PJ · sanitario', pj: true }),
    D(2, { name: 'Sgto. 1º Bob Mabry', role: 'Sanitario' }),
    D(4, { name: 'Sgto. Hale', role: 'CSAR' })
  ];
}
function w4Rope(S) {
  S.rope = ropeMesh();
  G.m.meds = [];
  w4MedSpecs().forEach((sp, k) =>
    sched.push({
      at: G.t + 0.5 + k * 1.25,
      fn: () => {
        const x = S.x + Math.sin(S.yaw + PH) * 1.0 + rr(-0.3, 0.3),
          z = S.z + Math.cos(S.yaw + PH) * 1.0 + rr(-0.3, 0.3);
        const u = npcUnit(sp, x, z);
        u.slide = true;
        u.elev = Math.max(0, S.y + 1.2);
        u.stance = 'stand';
        u.medSpot = W4_MED[k];
        G.m.meds.push(u);
        if (k === 3)
          sched.push({
            at: G.t + 2.6,
            fn: () => {
              if (S.rope) {
                world.remove(S.rope);
                S.rope = null;
              }
              G.m.roped = true;
            }
          });
      }
    })
  );
}
// cada sanitario va andando a su sitio junto a los restos y se pone a trabajar
function w4Meds() {
  for (const u of G.m.meds || []) {
    if (!u.alive || u.slide) continue;
    const [sx, sz] = u.medSpot;
    if (!u.atWreck) {
      const dd = Math.hypot(u.x - sx, u.z - sz);
      if (dd < 1.1 || (!u.path.length && dd < 3.2 && u.medTried)) {
        u.atWreck = true;
        u.path = [];
        u.order = { type: 'hold' };
        u.x = sx;
        u.z = sz;
      } else if (!u.path.length) {
        goTo(u, sx, sz);
        u.medTried = true;
      }
    }
    if (u.atWreck) {
      u.x = sx;
      u.z = sz;
      u.vx = u.vz = 0;
      u.stance = 'crouch';
      u.face = u.medSpot[2];
      u.sup = 0;
      u.working = true;
    }
  }
}
// aquí la milicia solo quiere una cosa: llegar a los restos
function w4Push(tag) {
  for (const e of them)
    if (e.alive && e.tag === tag && !e.roof && !e.tech) {
      e.push = true;
      e.goal = { x: S61.x + rr(-3, 3), z: S61.z + rr(-3, 3) };
    }
}
// el combate del despliegue: unos cincuenta hombres a la vez alrededor del derribo, un tercio en las azoteas; los que caen no vuelven
function w4Swarm() {
  // Kilo 1-1 empieza en la esquina suroeste: durante el primer medio minuto solo hay un puñado de milicianos cerca; el resto de lo que le
  // toca a ese cuarto llega de más lejos pasados 30 s. Y en los primeros 10 s no dispara ningún RPG.
  const SW = W4P.find(p => p.k === 'SO'),
    nearSW = (x, z) => Math.hypot(x - SW.x, z - SW.z) < 20;
  let roofs = 0,
    sw = 0,
    later = 0;
  const SW_CAP = 3;
  G.m.noRpgUntil = G.t + 10;
  for (let k = 0; k < 17; k++) {
    const a = (k / 17) * 6.283 + rr(-0.15, 0.15),
      r = rr(17, 36),
      x = W4C.x + Math.cos(a) * r,
      z = W4C.z + Math.sin(a) * r;
    if (nearSW(x, z) && sw >= SW_CAP) {
      later++;
      continue;
    }
    if (nearSW(x, z)) sw++;
    if (roofFoe(x, z, 'w4s')) roofs++;
  }
  for (let k = 0; k < 50 - roofs - later; k++) {
    const a = rnd() * 6.283,
      r = rr(16, 40),
      x = W4C.x + Math.cos(a) * r,
      z = W4C.z + Math.sin(a) * r;
    if (nearSW(x, z) && sw >= SW_CAP) {
      later++;
      continue;
    }
    if (nearSW(x, z)) sw++;
    const push = k % 3 === 0,
      e = foe(x, z, push ? 'wave' : rnd() < 0.5 ? 'post' : 'rifle', 'w4s', CAMP_ESPEC);
    if (push) {
      e.push = true;
      e.goal = { x: S61.x + rr(-3, 3), z: S61.z + rr(-3, 3) };
      e.nextMove = G.t + rr(4, 20);
    }
  }
  // los que se guardan llegan desde el otro extremo del cuarto suroeste pasados 30 s
  if (later)
    sched.push({
      at: G.t + 30,
      fn: () => {
        if (G.sub !== 0 || G.over) return;
        for (let k = 0; k < later; k++) {
          const a = Math.atan2(SW.z - W4C.z, SW.x - W4C.x) + rr(-0.5, 0.5),
            r = rr(34, 42);
          const e = foe(W4C.x + Math.cos(a) * r, W4C.z + Math.sin(a) * r, 'wave', 'w4s', CAMP_ESPEC);
          e.goal = { x: SW.x + rr(-4, 4), z: SW.z + rr(-4, 4) };
          e.nextMove = G.t + rr(0, 4);
        }
        say('Super 6-4', 'Más milicia entrando por el suroeste, hacia la azotea de Delta.', 'air', true);
      }
    });
  G.alert = true;
}
function w4Wave(n, who) {
  const a = rnd() * 6.283;
  waveGoal(S61.x, S61.z, a, n, 'w4', 42, S61, who);
  w4Push('w4');
}
// fuego desde las azoteas y la calle contra un helicóptero en estacionario: trazadoras hacia arriba y chispas donde pegan
function w4FireAt(H, n) {
  for (let k = 0; k < n; k++) {
    const a = rnd() * 6.283,
      r = rr(14, 30),
      x = H.x + Math.cos(a) * r,
      z = H.z + Math.sin(a) * r,
      roof = rnd() < 0.5,
      y = roof ? rr(6, 11) : 1.3;
    const tx = H.x + rr(-1.5, 1.5),
      ty = H.y + rr(-0.5, 1.5),
      tz = H.z + rr(-1.5, 1.5);
    sched.push({
      at: G.t + rnd() * 0.6,
      fn: () => {
        tracer(x, y, z, tx, ty, tz, 0x9aff5a, 0);
        flash(x, y, z);
        sfx('ak', x, z);
        if (rnd() < 0.35)
          sched.push({
            at: G.t + 0.25,
            fn: () => {
              lightFlash(tx, ty, tz, 0xffd080, 1.6, 3, 0.08);
              for (let q = 0; q < 5; q++)
                spawnP(
                  tx,
                  ty,
                  tz,
                  rr(-3, 3),
                  rr(-1, 3),
                  rr(-3, 3),
                  rr(0.2, 0.4),
                  0.05,
                  0.02,
                  0xfff0b0,
                  0xff8030,
                  1,
                  1,
                  9
                );
            }
          });
      }
    });
  }
}
function w4Intro() {
  const d = grpN(D_B),
    c4 = grpN('Romeo 4-1'),
    c1 = grpN('Romeo 1-1'),
    c3 = grpN('Romeo 3-1');
  const hoot = d.members[0],
    ev = c4.members[0],
    steele = c1.members[0],
    oka = c3.members[0];
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  const RALLY = [
    [c1, 357, 293.5],
    [c3, 368.5, 274.5]
  ]; // como en mi mapa: Romeo 1-1 por la calle desde el oeste y Romeo 3-1 bajando la calle desde el norte
  const run = (g, x, z) =>
    g.members.forEach((u, i) => {
      goTo(u, x + (i % 3) - 1, z + ((i / 3) | 0));
      u.spd = 3.1;
    });
  // a lo largo de la pared: cada hombre en la franja junto al muro oeste, uno detrás de otro, y se agacha a cubierto donde se para
  const wallRun = (g, x, z) =>
    g.members.forEach((u, i) => {
      const p = findPath(Math.floor(u.x), Math.floor(u.z), Math.floor(x), Math.floor(z - i * 1.1));
      u.path = p || [];
      u.order = { type: 'move' };
      u.stance = 'stand';
      u.spd = 3.1;
      u.cover = true;
    });
  const ctr = g => {
    const L_ = gLive(g);
    return L_.length
      ? [L_.reduce((a, u) => a + u.x, 0) / L_.length, L_.reduce((a, u) => a + u.z, 0) / L_.length]
      : [S61.x, S61.z];
  };
  let foc = () => ctr(c1);
  cineStart({
    zoom: 8,
    spin: 0.008,
    yaw0: -0.18,
    focus: () => foc(),
    keys: [
      // primero los dos chalks suben corriendo por las calles, cada uno avisado por radio
      {
        t: 0.3,
        fn: () => {
          run(c1, RALLY[0][1], RALLY[0][2]);
          wallRun(c3, 368.5, 277.5);
        }
      },
      { t: 1.2, fn: () => sayU(steele, '¡No disparéis al oeste! ¡Rangers acercándose por el lado oeste!') },
      { t: 5, fn: () => sayU(hoot, '¡Alto el fuego al oeste! ¡Son de los nuestros!') },
      {
        t: 9,
        fn: () => {
          foc = () => ctr(c3);
          sayU(oka, '¡No disparéis al norte! ¡Rangers acercándose por el lado norte!');
        }
      },
      { t: 13, fn: () => sayU(ev, '¡Alto el fuego al norte! Os vemos, 3-1. Venid pegados a la pared.') },
      // luego la orden desde el aire y el plan
      {
        t: 18,
        fn: () => {
          foc = () => [W4C.x - 2, W4C.z - 3];
          CINE.zoom = 11;
          for (const [g_, x, z] of RALLY.slice(0, 1))
            gLive(g_).forEach((u, i) => {
              if (Math.hypot(u.x - x, u.z - z) > 5) {
                const q = findWalk(x + (i % 3) - 1, z + ((i / 3) | 0));
                u.x = q[0] + 0.5;
                u.z = q[1] + 0.5;
                u.path = [];
              }
              u.stance = 'crouch';
            });
          say(
            'Uniform 6-4',
            'A todas las unidades, está en camino un helicóptero de evacuación médica (MEDEVAC). Necesito un perímetro de seguridad en Wolcott para que el helicóptero pueda entrar y desplegar a los médicos.',
            'hq',
            true
          );
        }
      },
      { t: 25.5, fn: () => sayU(steele, 'Recibido, Uniform 6-4. Montamos el perímetro.') },
      {
        t: 31.5,
        fn: () =>
          sayU(hoot, 'Nosotros subimos a esa azotea, la del suroeste. Desde arriba vemos el callejón y el pájaro.')
      },
      { t: 36, fn: () => sayU(hoot, 'Eversmann, tú te quedas en el arco. Que no entre nadie por el norte.') },
      { t: 39.5, fn: () => sayU(ev, 'Recibido. Aseguraremos la posición.') },
      {
        t: 41.5,
        fn: () => {
          sayU(hoot, '3-1, la calle del este. Steele, tu gente a la azotea del sureste, cubriendo la calle de abajo.');
          w4Points();
          CINE.zoom = 15;
          foc = () => [W4C.x - 2, W4C.z + 1];
        }
      },
      { t: 46.5, fn: () => sayU(steele, 'Entendido. Romeo 1-1, en marcha.') },
      { t: 49, fn: () => say('Uniform 6-4', 'Avisad cuando estéis los cuatro en posición.', 'hq', true) }
    ],
    dur: 53,
    tick: () => {
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 10);
      for (const u of c3.members)
        if (u.cover && u.alive && !u.path.length) {
          u.stance = 'crouch';
          u.face = Math.PI;
        }
    },
    onEnd: () => {
      if (!G.m.pts) w4Points();
      for (const [g_, x, z] of RALLY)
        gLive(g_).forEach((u, i) => {
          u.spd = 2.4;
          if (Math.hypot(u.x - x, u.z - z) > 6) {
            const q = findWalk(x + (i % 3) - 1, z + ((i / 3) | 0));
            u.x = q[0] + 0.5;
            u.z = q[1] + 0.5;
            u.path = [];
          }
        });
      G.sel = new Set(us.filter(u => u.alive && !u.npc));
      refreshCards();
      renderSubs();
      camS.tx = W4C.x - 2;
      camS.tz = W4C.z;
      camS.zoomT = 15;
      hint(
        'Lleva cada unidad a su círculo azul (se vuelve verde cuando está ocupado): Romeo 4-1 al arco, Romeo 3-1 a la calle del este, y Kilo 1-1 y Romeo 1-1 a sus azoteas (toca el edificio y elige Subir a la azotea).'
      );
    }
  });
}
function w4Drop() {
  const LZ = W4_LZ,
    K = (x, z, y, t, yaw, ev) => ({ t, x, y, z, yaw, ev });
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  let H = null,
    fireT = 0,
    rpgDone = false;
  const x0 = LZ.x + 80,
    z0 = LZ.z - 70;
  H = G.m.h68 = scriptHeli(
    'bh',
    [
      K(x0, z0, 28, 0),
      K(LZ.x + 34, LZ.z - 30, 18, 7),
      K(LZ.x + 8, LZ.z - 6, 10.5, 12.5),
      K(LZ.x, LZ.z, 8.5, 15.5, -2.3),
      K(LZ.x, LZ.z, 8.5, 16, -2.3, S => w4Rope(S)),
      K(LZ.x, LZ.z, 8.5, 29, -2.3),
      K(LZ.x - 6, LZ.z + 12, 11, 32),
      K(LZ.x - 30, LZ.z + 42, 18, 36),
      K(LZ.x - 80, LZ.z + 90, 28, 42),
      K(LZ.x - 140, LZ.z + 140, 34, 50, null, S => {
        S.gone = true;
      })
    ],
    { spline: true }
  );
  say('Super 6-8', 'Super 6-8 entrando. Cuerdas en quince segundos.', 'air', true);
  cineStart({
    zoom: 9.5,
    spin: 0.02,
    yaw0: camS.yaw,
    focus: () => (H && !H.gone ? [H.x, H.z, H.y] : [S61.x, S61.z, 0]),
    keys: [
      { t: 10, fn: () => say('Super 6-8', '¡Nos disparan desde los tejados! ¡Desde la calle también!', 'air', true) },
      { t: 16.5, fn: () => say('Super 6-8', '¡Cuerdas fuera! ¡Fuera, fuera!', 'air', true) },
      {
        t: 20.5,
        fn: () => {
          H.smoke = {
            x: H.x,
            z: H.z,
            y: H.y,
            rate: 10,
            life: 3.5,
            vy: 0.4,
            s0: 0.25,
            s1: 1.2,
            fire: 0,
            acc: 0,
            sp: 0.4
          };
          emitters.push(H.smoke);
        }
      },
      {
        t: 22,
        fn: () =>
          say(
            'Uniform 6-4',
            'Super 6-8, te sale humo del rotor de cola. Vuelve a la base para que te lo revisen.',
            'hq',
            true
          )
      },
      {
        t: 25.5,
        fn: () =>
          say('Super 6-8', 'Recibido, Uniform 6-4. El equipo está en tierra. Super 6-8 regresa a la base.', 'air', true)
      },
      {
        t: 29.6,
        fn: () => {
          rpgDone = true;
          const a = Math.atan2(H.x - S61.x, H.z - S61.z) + 2.4,
            ox = H.x + Math.sin(a) * 24,
            oz = H.z + Math.cos(a) * 24,
            b = BLDS.filter(b => b.top > 4)
              .map(b => [Math.hypot(b.x + b.w / 2 - ox, b.y + b.d / 2 - oz), b])
              .sort((p, q) => p[0] - q[0])[0];
          const sx = b ? b[1].x + b[1].w / 2 : ox,
            sz = b ? b[1].y + b[1].d / 2 : oz,
            sy = b ? b[1].top + 1.3 : 1.4;
          // apuntado un par de metros por delante de la cola: pasa cerca y revienta en un muro más allá
          rocketAt(sx, sy, sz, H.x + 2.2, H.y + 0.8, H.z - 1.8, null);
        }
      },
      { t: 31, fn: () => say('Super 6-8', '¡RPG! ¡Nos ha pasado rozando!', 'air', true) },
      { t: 33.5, fn: () => say('Uniform 6-4', 'Sal de ahí, 6-8. Ya está, ya está.', 'hq', true) },
      {
        t: 36,
        fn: () => {
          const w = (G.m.meds || [])[0];
          sayU(w, 'MEDEVAC en el 6-1. Empezamos a trabajar.');
        }
      }
    ],
    dur: 39,
    tick: dt => {
      w4Meds();
      fireT -= dt;
      if (H && !H.gone && CINE.t > 6 && CINE.t < 33 && fireT <= 0) {
        fireT = 0.35;
        w4FireAt(H, 2);
      }
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 15);
      if (H.smoke && !H.gone) {
        const a = H.yaw + Math.PI;
        H.smoke.x = H.x + Math.sin(a) * 5;
        H.smoke.z = H.z + Math.cos(a) * 5;
        H.smoke.y = H.y + 1.2;
      }
    },
    onEnd: () => {
      G.m.dropDone = true;
      for (const u of G.m.meds || [])
        if (u.slide) {
          u.slide = false;
          u.elev = 0;
        }
      camS.tx = W4C.x;
      camS.tz = W4C.z;
      camS.zoomT = 14;
    }
  });
}
function w4Shot64() {
  const sayU = (u, t) => {
    if (u) {
      u.talkT = 2.6;
      radio(u, t, true);
    }
  };
  const w = (G.m.meds || [])[0],
    K = (x, z, y, t, yaw, ev) => ({ t, x, y, z, yaw, ev });
  for (const e of them)
    if (e.alive && Math.hypot(e.x - S61.x, e.z - S61.z) < 22) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  G.noLose = true;
  // dos aparatos esperando al suroeste: el C2 arriba y Durant más bajo
  const A = { x: S61.x - 62, z: S61.z + 48 };
  const c2 = scriptHeli(
    'bh',
    [
      K(A.x - 20, A.z + 30, 34, 0),
      K(A.x + 10, A.z + 10, 33, 10),
      K(A.x + 30, A.z - 20, 33, 20),
      K(A.x + 10, A.z - 50, 34, 32),
      K(A.x - 30, A.z - 60, 35, 46),
      K(A.x - 60, A.z - 40, 36, 60)
    ],
    { spline: true }
  );
  c2Cabin(c2.h);
  const T0 = 10.5,
    P = []; // la trayectoria del Super 6-4: entra hacia el sitio de Wolcott sobre el derribo, los impactos, un giro al oeste, la barrena y la caída en el segundo sitio
  const h64 = scriptHeli(
    'bh',
    [
      K(A.x - 8, A.z + 4, 24, 0),
      K(A.x + 4, A.z - 2, 23, 6),
      K(A.x + 10, A.z - 6, 23, T0),
      K(S61.x - 22, S61.z + 12, 22, T0 + 4.5),
      K(S61.x - 8, S61.z + 2, 21, T0 + 8),
      K(S61.x - 2, S61.z - 14, 21, T0 + 12),
      K(S61.x - 30, S61.z - 6, 21, T0 + 17),
      K(S64.x + 50, S64.z - 30, 19, T0 + 22),
      K(S64.x + 22, S64.z - 10, 13, T0 + 26),
      K(S64.x + 6, S64.z - 2, 6, T0 + 29.5),
      K(S64.x, S64.z, 0, T0 + 32)
    ],
    { spline: true }
  );
  let tailFx = null,
    ended = false;
  const crash = () => {
    if (ended) return;
    ended = true;
    h64.gone = true;
    boom(S64.x, S64.z);
    if (!heliSnd('heli_crash', S64.x, S64.z)) {
      sfx('boom', S64.x, S64.z);
      rpgSnd(S64.x, S64.z, true);
    }
    wreck(S64.x, S64.z, -0.9, true);
    G.m.down64 = true;
    emitters.push({ x: S64.x, z: S64.z, y: 2, rate: 60, life: 12, vy: 2, s0: 0.6, s1: 3.4, fire: 0.3, acc: 0, sp: 1 });
    if (tailFx) tailFx.until = G.t + 0.01;
  };
  const shooter = (dx, dz) => {
    const ox = S61.x + dx,
      oz = S61.z + dz,
      b = BLDS.filter(b => b.top > 4)
        .map(b => [Math.hypot(b.x + b.w / 2 - ox, b.y + b.d / 2 - oz), b])
        .sort((p, q) => p[0] - q[0])[0][1];
    return { x: b.x + b.w / 2, z: b.y + b.d / 2, elev: b.top, face: 0, stance: 'stand', firing: 0 };
  };
  const hit = () => {
    lightFlash(h64.x, h64.y, h64.z, 0xffa040, 9, 18, 0.9);
    if (!heliSnd('heli_hit', h64.x, h64.z)) {
      sfx('boom', h64.x, h64.z);
      rpgSnd(h64.x, h64.z, true);
    }
    for (let q = 0; q < 40; q++) {
      const a = rnd() * 6.28,
        s = rr(1, 5);
      spawnP(
        h64.x,
        h64.y,
        h64.z,
        Math.cos(a) * s,
        rr(-1, 3),
        Math.sin(a) * s,
        rr(0.3, 0.7),
        rr(0.25, 0.5),
        0.1,
        pick([0xffe7a0, 0xffc050, 0xff9030]),
        0xc0301a,
        1,
        1,
        6
      );
    }
    for (let q = 0; q < 10; q++)
      spawnChunk(
        h64.x,
        h64.y,
        h64.z,
        rr(-4, 4),
        rr(-1, 3),
        rr(-4, 4),
        rr(0.05, 0.12),
        pick([0x3a3d33, 0x2a2a26, 0x4a4a44]),
        'flake'
      );
  };
  cineStart({
    zoom: 9,
    spin: 0.015,
    yaw0: camS.yaw,
    focus: () => (CINE.t < 6 ? [S61.x, S61.z, 0] : !h64.gone ? [h64.x, h64.z, h64.y] : [S64.x, S64.z, 0]),
    keys: [
      { t: 0.6, fn: () => sayU(w, 'No podemos moverlos, los mataríamos. Los estabilizaremos dentro del Black Hawk.') },
      { t: 4.5, fn: () => say('Uniform 6-4', 'Recibido, MEDEVAC. Seguid con ellos.', 'hq', true) },
      {
        t: 6.5,
        fn: () => {
          CINE.zoom = 16;
          say('Uniform 6-4', 'Super 6-4, entra en la zona y toma la posición de Wolcott.', 'hq', true);
        }
      },
      {
        t: T0,
        fn: () => {
          CINE.zoom = 11;
          say('Super 6-4', 'Recibido.', 'air', true);
          // el Uniform 6-4 se retira alto hacia el suroeste, bien lejos del aparato de Durant
          c2.keys = [
            K(c2.x, c2.z, c2.y, 0),
            K(c2.x - 30, c2.z + 40, c2.y + 6, 5),
            K(c2.x - 110, c2.z + 130, c2.y + 12, 13, null, H => {
              H.gone = true;
            })
          ];
          c2.t = 0;
          c2.k = 0;
        }
      },
      {
        t: T0 + 4,
        fn: () => {
          CINE.zoom = 8.5;
        }
      },
      {
        t: T0 + 5.2,
        fn: () => {
          const s = shooter(-14, 6);
          fireRPG(s, { pos: () => [h64.x, h64.y + 0.6, h64.z] }, () => {
            hit();
            h64.smoke = {
              x: h64.x,
              z: h64.z,
              y: h64.y,
              rate: 18,
              life: 4,
              vy: 0.5,
              s0: 0.3,
              s1: 1.6,
              fire: 0,
              acc: 0,
              sp: 0.4
            };
            emitters.push(h64.smoke);
          });
        }
      },
      {
        t: T0 + 6.6,
        fn: () => {
          const s = shooter(8, -10);
          fireRPG(s, { pos: () => [h64.x, h64.y + 0.4, h64.z] }, () => {
            hit();
            if (h64.smoke) {
              h64.smoke.rate = 24;
              h64.smoke.s1 = 1.9;
            }
          });
        }
      },
      {
        t: T0 + 9,
        fn: () => {
          CINE.zoom = 11;
          say('Uniform 6-4', 'Super 6-4, ¿estáis bien?', 'hq', true);
        }
      },
      {
        t: T0 + 11.5,
        fn: () =>
          say(
            'Super 6-4',
            'Sí... Tengo vibraciones en los mandos, pero seguimos volando. Tomamos la posición.',
            'air',
            true
          )
      },
      {
        t: T0 + 16.5,
        fn: () => {
          tailFx = {
            x: h64.x,
            z: h64.z,
            y: h64.y,
            rate: 30,
            life: 4.5,
            vy: 0.6,
            s0: 0.35,
            s1: 1.8,
            fire: 0.55,
            acc: 0,
            sp: 0.3
          };
          emitters.push(tailFx);
          lightFlash(h64.x, h64.y, h64.z, 0xff8030, 6, 12, 0.6);
          sfx('boom', h64.x, h64.z);
        }
      },
      {
        t: T0 + 18,
        fn: () => {
          h64.spin = 1.4;
          h64.noTail = true;
          say('Super 6-4', '¡Hemos perdido el rotor de cola! ¡Estamos cayendo!', 'air', true);
        }
      },
      {
        t: T0 + 21,
        fn: () => {
          h64.spin = 2.8;
          say('Super 6-4', '¡Super 6-4 cayendo! ¡Super 6-4 cayendo!', 'air', true);
        }
      },
      {
        t: T0 + 26,
        fn: () => {
          h64.spin = 4.2;
        }
      },
      { t: T0 + 32, fn: () => crash() },
      {
        t: T0 + 34,
        fn: () => {
          CINE.zoom = 11;
          say('Uniform 6-4', 'Super 6-4 derribado. Tenemos dos aparatos en el suelo.', 'hq', true);
        }
      },
      {
        t: T0 + 39,
        fn: () =>
          say(
            'JOC',
            'Mandad la columna de Struecker de nuevo allí. Que lleguen enseguida a la zona de impacto de Durant. Tenemos que sacarlos a todos de ahí.',
            'hq',
            true
          )
      }
    ],
    dur: T0 + 47,
    tick: () => {
      w4Meds();
      for (const u of us) if (u.alive) u.sup = Math.min(u.sup, 10);
      if (tailFx && !h64.gone) {
        const a = h64.yaw + Math.PI;
        tailFx.x = h64.x + Math.sin(a) * 5.5;
        tailFx.z = h64.z + Math.cos(a) * 5.5;
        tailFx.y = h64.y + 1.3;
      }
      if (!ended && h64.k >= h64.keys.length - 1) crash();
    },
    onEnd: () => {
      crash();
      G.m.shotEnd = true;
    }
  });
}
MISSIONS.wolcott = {
  id: 'wolcott',
  n: 4,
  title: 'Wolcott',
  hud: 'Proteger al equipo MEDEVAC en el Super 6-1',
  phase: 'day',
  hour: 16.58,
  crashed: ['s61'],
  place: 'Lugar del derribo del Super 6-1',
  squadTxt: 'Delta + Rangers',
  date: '3 OCT 1993',
  summary:
    'Desplegar a cuatro unidades alrededor del Super 6-1 para que el Super 6-8 descuelgue a un equipo MEDEVAC, y proteger a los sanitarios durante cinco minutos mientras intentan sacar a los pilotos.',
  text: '16:35. Kilo 1-1 y el Romeo 4-1 han llegado al Super 6-1. El mando quiere meter un equipo MEDEVAC de evacuación médica en el Super 6-8, pero antes hay que montar un perímetro. Dos unidades Romeo más vienen a pie por las calles. Los milicianos tienen un único objetivo: llegar hasta el helicóptero.',
  start: [S61.x - 6, S61.z - 9],
  cam: [S61.x - 4, S61.z - 2, 11],
  civ: [S61.x - 30, S61.z],
  spawn() {
    const hoot = Object.assign({}, DELTA[1], DSPEC, {
      name: 'Sgto. 1º Hoot Gibson',
      role: 'Jefe de equipo',
      kit: 'radio'
    });
    const chalk = rangerSpecs([
      'Sgto. Matt Eversmann',
      'Esp. John Waddell',
      'Esp. Shawn Nelson',
      'Esp. Lance Twombly',
      'Esp. John Grimes',
      'Vega'
    ]).map((s, i) => Object.assign(s, i === 0 ? { role: 'Jefe · radio', kit: 'radio' } : {}));
    const lead = (L_, role) => L_.map((s, i) => Object.assign(s, i === 0 ? { role, kit: 'radio' } : {}));
    spawnForce([
      {
        name: D_B,
        role: 'Perímetro · azotea suroeste',
        kind: 'delta',
        specs: [hoot].concat(deltaSpecs(6).slice(2)),
        at: [S61_BX.x, S61_BX.z]
      },
      { name: 'Romeo 4-1', role: 'Rangers · el arco', kind: 'chalk', specs: chalk, at: [369.5, 290.5] },
      {
        name: 'Romeo 1-1',
        role: 'Rangers · azotea sureste',
        kind: 'chalk',
        specs: lead(chalkSpecs(0), 'Jefe de compañía'),
        at: [330, 293]
      },
      {
        name: 'Romeo 3-1',
        role: 'Rangers · este',
        kind: 'chalk',
        specs: lead(chalkSpecs(2), 'Jefe · radio').map((s, i) =>
          i === 0 ? Object.assign(s, { name: 'Sgto. Di Tomasso' }) : s
        ),
        at: [368.5, 222]
      }
    ]);
    grpN('Romeo 3-1').members.forEach((u, i) => {
      u.x = 368.5;
      u.z = 222 - i * 1.3;
      u.face = 0;
    }); // en fila calle arriba, contra la pared oeste
    // donde los dejó la misión 3: los Rangers en sus puntos azules y los Delta en su esquina
    const spots = [
      [368.7, 290.4],
      [369.9, 290.3],
      [372.0, 290.3],
      [373.1, 290.5],
      [367.0, 293.9],
      [367.5, 295.4]
    ];
    grpN('Romeo 4-1').members.forEach((u, i) => {
      u.x = spots[i][0];
      u.z = spots[i][1];
      u.stance = 'crouch';
      u.face = 2.4;
    });
    grpN(D_B).members.forEach(u => {
      u.stance = 'crouch';
      u.face = 0.6;
    });
    for (const u of us)
      if (!u.npc) {
        u.ammo = u.ammo0 = Math.round(u.ammo * 1.5);
      }
    G.m.medHp = null;
  },
  onStart() {
    w4Intro();
  },
  subs: [
    {
      text: 'Desplegar las cuatro unidades en sus posiciones',
      zone: { x: W4C.x, z: W4C.z + 2, r: 16 },
      start: () => {
        if (!G.m.pts) w4Points();
        w4Swarm();
        SUP.lbN = 1;
        SUP.lbCd = 0;
        updSupBtns();
        say(
          'Super 6-4',
          'Uniform 6-4, hay milicia por todas partes alrededor del 6-1: en las azoteas y en todas las calles. Calculo medio centenar.',
          'air',
          true
        );
        sched.push({
          at: G.t + 5,
          fn: () => say('Uniform 6-4', 'Os queda una sola pasada de Little Bird. Usadla bien.', 'hq', true)
        });
      },
      tick: () => {
        for (const q of G.m.pts) {
          const ok = w4Held(q.p);
          if (ok !== q.ok) {
            q.ok = ok;
            q.ring.material.color.setHex(ok ? 0x6fd36a : 0x7fb6ff);
            q.ring.material.opacity = ok ? 0.95 : 0.8;
          }
        }
      },
      count: () =>
        G.m.pts.map(q => q.p.k + (q.ok ? ' ✓' : w4Foes(q.p) > 2 ? ' ' + w4Foes(q.p) + '✕' : ' ·')).join('  '),
      done: () => G.m.pts.every(q => q.ok),
      onDone: () => {
        const h = grpN(D_B).members[0];
        if (h && h.alive) {
          h.talkT = 2.6;
          radio(h, 'Uniform 6-4, aquí Kilo 1-1. Zona asegurada en el 6-1. Podéis meter al MEDEVAC.', true);
        }
        sched.push({
          at: G.t + 3.5,
          fn: () => say('Uniform 6-4', 'Recibido, Kilo 1-1. Super 6-8, adelante.', 'hq', true)
        });
      }
    },
    {
      text: 'El Super 6-8 descuelga al equipo MEDEVAC',
      zone: { x: W4_LZ.x, z: W4_LZ.z, r: 5 },
      start: () => {
        sched.push({ at: G.t + 5, fn: () => w4Drop() });
      },
      count: () => (G.m.roped ? 'equipo en tierra' : 'Super 6-8 en aproximación'),
      done: () => !!G.m.dropDone
    },
    {
      text: 'Proteger a la unidad MEDEVAC',
      zone: { x: W4C.x, z: W4C.z, r: W4R },
      start: () => {
        G.m.medHp = 100;
        G.m.held = 0;
        G.m.ring = ringAt(W4C.x, W4C.z, W4R, 0x3d8bff);
        G.nextWave = G.t + 10;
        G.waveN = 0;
        G.m.medSaid = {};
        for (const q of G.m.pts || []) q.ring.material.opacity = 0.35;
        hint('Que ningún miliciano entre en el anillo azul: desde dentro hacen mucho más daño al equipo MEDEVAC.');
      },
      tick: () => {
        w4Meds();
        G.m.held += G.dt;
        const t = G.m.held,
          S_ = G.m.medSaid,
          meds = G.m.meds || [];
        const line = (k, at, fn) => {
          if (!S_[k] && t >= at) {
            S_[k] = true;
            fn();
          }
        };
        const med = (i, txt) => {
          const u = meds[i];
          if (u) {
            u.talkT = 2.6;
            radio(u, txt, true);
          }
        };
        line('a', 5, () => med(0, 'Dos pilotos atrapados en el interior.'));
        line('b', 16, () => med(1, 'Están encerrados en la cabina, nos va a costar sacarlos.'));
        line('c', 25, () => say('JOC', 'No abandonaremos a nadie. Sáquenlos de ahí.', 'hq', true));
        line('d', 70, () => med(0, 'El fuselaje está aplastado contra el asiento del piloto. Hay que cortar.'));
        line('e', 115, () => med(1, 'Tengo pulso en uno. Muy débil.'));
        line('f', 160, () => {
          const h = grpN(D_B).members[0];
          if (h && h.alive) {
            h.talkT = 2.6;
            radio(h, 'Mantened el perímetro. Que nadie entre en el anillo.', true);
          }
        });
        line('g', 205, () => med(0, 'Seguimos trabajando. ¡Cubridnos!'));
        line('h', 245, () => say('Uniform 6-4', 'Un minuto más, MEDEVAC. Aguantad.', 'hq', true));
        if (G.m.medHp < 60) line('x', 0, () => med(0, '¡Nos disparan desde dentro del perímetro!'));
        if (G.m.medHp < 30) line('y', 0, () => med(1, '¡Estamos recibiendo mucho fuego aquí! ¡No vamos a aguantar!'));
        if (G.t >= G.nextWave && t < W4_HOLD - 25) {
          G.nextWave = G.t + 25;
          // nunca más de unos dieciocho milicianos vivos a la vez alrededor del derribo: una oleada nueva espera hasta que la anterior se ha aclarado
          if (them.filter(e => e.alive && Math.hypot(e.x - W4C.x, e.z - W4C.z) < 48).length >= 18) G.nextWave = G.t + 8;
          else {
            G.waveN++;
            w4Wave(4 + Math.min(3, G.waveN >> 1), 'Super 6-4');
            if (G.waveN >= 3 && G.waveN % 2) w4Wave(3, false);
            if (G.waveN >= 2 && G.waveN % 2 === 0) {
              const a = rnd() * 6.283;
              roofFoe(S61.x + Math.cos(a) * 20, S61.z + Math.sin(a) * 20, 'w4r');
            }
          }
        }
        // fuego contra los restos: el que está dentro del anillo está encima de los sanitarios; de fuera, solo los que disparan con línea hasta los restos
        G.m.presT = (G.m.presT || 0) - G.dt;
        if (G.m.presT <= 0) {
          G.m.presT = 1;
          let dm = 0;
          for (const e of them) {
            if (!e.alive || e.pinned) continue;
            const d = Math.hypot(e.x - S61.x, e.z - S61.z);
            if (d > 32) continue;
            if (d < W4R) dm += 0.85;
            else if (e.firing > 0 && los(e.x, e.z, S61.x, S61.z)) dm += 0.22;
          }
          if (dm) {
            G.m.medHp = Math.max(0, G.m.medHp - dm);
            G.m.medFlash = 1;
          }
        }
        if (G.m.medHp <= 0 && !G.over) {
          say('Uniform 6-4', 'Hemos perdido al equipo MEDEVAC.', 'hq', true);
          endGame(false);
        }
      },
      count: () => 'MEDEVAC ' + Math.max(0, Math.round(G.m.medHp)) + '% · quedan ' + fmtLeft(W4_HOLD - G.m.held),
      done: () => G.m.held >= W4_HOLD,
      onDone: () => {
        if (G.m.ring) {
          overlay.remove(G.m.ring);
          G.m.ring = null;
        }
        w4Clear();
        G.m.medEnd = true;
      }
    },
    {
      text: 'Super 6-4 entra en la zona',
      zone: { x: S61.x, z: S61.z, r: 4 },
      start: () => w4Shot64(),
      count: () => (G.m.down64 ? 'derribado' : 'en el aire'),
      done: () => !!G.m.shotEnd
    }
  ],
  opt: [{ text: 'La unidad MEDEVAC termina por encima del 50 %', ok: () => G.m.medHp != null && G.m.medHp >= 50 }]
};
// un impacto en un sanitario resta de la barra única del equipo: un poco desde fuera del anillo y mucho desde dentro
function w4MedHit(u, dmg, src) {
  const inside = src && Math.hypot(src.x - W4C.x, src.z - W4C.z) < W4R;
  G.m.medHp = Math.max(0, G.m.medHp - (inside ? 7 : 1.6) * clamp(dmg / 30, 0.6, 3));
  G.m.medFlash = 1;
  u.hp = u.hp0;
  bleed(u, src, 2);
}
function medBar() {
  if (G && G.m && G.m.pts) {
    const s = halfH() * 0.085;
    for (const q of G.m.pts) {
      q.lab.scale.set(s * 8, s, 1);
      q.lab.visible = !G.over;
    }
  }
  const pm = G && G.started && MIS.id === 'perim' && G.m.pmHp != null && G.m.pmRing && !G.m.p2;
  const m8 = G && G.started && MIS.id === 'night' && G.m.bHp != null && !G.m.mDone && !MAPOPEN;
  const on =
    G && G.started && !G.over && !CINE.on && (pm || m8 || (MIS.id === 'wolcott' && G.m.medHp != null && !G.m.medEnd));
  let el = $('medBar');
  if (!el) {
    if (!on) return;
    el = document.createElement('div');
    el.id = 'medBar';
    el.innerHTML = '<b>MEDEVAC</b><i><s></s></i>';
    document.body.appendChild(el);
  }
  el.style.display = on ? 'block' : 'none';
  if (!on) return;
  const lb = pm ? 'PROTEGER' : m8 ? 'EDIFICIO DE LOS HERIDOS' : 'MEDEVAC',
    bl = el.querySelector('b');
  if (bl.textContent !== L(lb)) bl.textContent = L(lb);
  if (pm) {
    const c = pmMid(),
      s_ = halfH() * 0.16;
    _tv.set(c[0], 4.5 + s_ * 1.2, c[1]).project(cam);
  } // encima del símbolo de la unidad
  else if (m8) _tv.set(M8_HOUSE.x, 7.2, M8_HOUSE.z).project(cam);
  else _tv.set(S61.x, 3.4, S61.z).project(cam);
  el.style.left = ((_tv.x + 1) / 2) * innerWidth + 'px';
  el.style.top = ((1 - _tv.y) / 2) * innerHeight + 'px';
  const v = clamp(pm ? G.m.pmHp : m8 ? G.m.bHp : G.m.medHp, 0, 100),
    s = el.querySelector('s');
  if (m8) {
    G.m.medFlash = Math.max(G.m.medFlash || 0, G.m.bFlash || 0);
    G.m.bFlash = 0;
  }
  s.style.width = v + '%';
  s.style.background = v > 60 ? '#5cbf6a' : v > 30 ? '#e7a63d' : '#e0503e';
  G.m.medFlash = Math.max(0, (G.m.medFlash || 0) - 0.06);
  el.style.filter = G.m.medFlash > 0.05 ? `brightness(${1 + G.m.medFlash})` : '';
}
