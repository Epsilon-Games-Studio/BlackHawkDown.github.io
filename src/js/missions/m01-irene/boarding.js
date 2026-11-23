/* ====================================================================================================
 * missions/m01-irene/boarding.js
 *
 * Irene: el embarque. Los aparatos esperan fríos y vacíos en la línea; cada chalk sale corriendo de su hangar en dos filas sueltas
 * hacia su Black Hawk, rodea la cola y entra por el costado. El jefe del chalk se queda junto a la puerta metiéndoles prisa y sube el último;
 * los de los asientos de dentro se suben y los de la puerta se dan la vuelta y se sientan en el borde. Los equipos Delta siguen corriendo
 * entre la fila de Black Hawks hasta los Little Birds y se sientan directamente en los bancos, una pareja por lado. Luego el vuelo sigue como siempre.
 * ================================================================================================== */

'use strict';

const BOARD_J = [
  'body',
  'pelvis',
  'abd',
  'chest',
  'neck',
  'head',
  'shL',
  'elL',
  'wrL',
  'shR',
  'elR',
  'wrR',
  'hipL',
  'knL',
  'anL',
  'hipR',
  'knR',
  'anR'
];
function boardSetup(F) {
  const B = (F.board = { on: true, t: 0, men: [], endT: null, said: {} });
  for (const h of F.helis) {
    h.g.updateMatrixWorld(true);
    const e = h.g.matrixWorld.elements,
      sx = Math.hypot(e[0], e[2]) || 1,
      sz = Math.hypot(e[8], e[10]) || 1;
    h.ex = [e[0] / sx, e[2] / sx];
    h.ez = [e[8] / sz, e[10] / sz];
    h.pax = [];
    h.bSide = { '-1': [], 1: [] };
    h.yawW = h.g.rotation.y;
  }
  const HP = (h, a, b) => [h.home[0] + h.ex[0] * a + h.ez[0] * b, h.home[1] + h.ex[1] * a + h.ez[1] * b]; // a: a la derecha del aparato, b: hacia su morro (unidades de mundo)
  const bhs = F.helis.filter(h => !h.lb);
  const hangU = u => (u < -131 ? -150 : -112);
  const spawn = (h, look, S, seat, wp, o) => {
    const m = addMan(
      F,
      look,
      S[0],
      0,
      S[1],
      Math.atan2(h.ez[0], h.ez[1]),
      'board',
      Object.assign(
        {
          bh: h,
          seat,
          wp,
          wi: 0,
          st: 'wait',
          spdB: 0,
          dir: [h.ez[0], h.ez[1]],
          mprog: 0,
          vmax: rr(3.35, 4.35),
          vf: rr(0.5, 1.1),
          vp: rr(0, 6.28),
          ny: rr(-0.4, 0.4)
        },
        o
      )
    );
    const r = m.m;
    r.rest = {
      px: r.pelvis.position.x,
      py: r.pelvis.position.y,
      pz: r.pelvis.position.z,
      bx: r.body.position.x,
      by: r.body.position.y,
      bz: r.body.position.z
    };
    B.men.push(m);
    return m;
  };
  B.runIn = true;
  bhs.forEach((h, k) => {
    if (h.role !== 'corner') return;
    const u0 = clamp(h.uv[0], hangU(h.uv[0]) - 10, hangU(h.uv[0]) + 10),
      sL = k % 2 ? 1 : -1,
      t0 = k * 0.45 + rr(0, 0.3);
    const from = (s, row) => {
      const q = AIRP(u0, -124.5 - row * 1.75 + rr(-0.25, 0.25));
      return [q[0] + h.ex[0] * s * (1.05 + rr(-0.2, 0.2)), q[1] + h.ex[1] * s * (1.05 + rr(-0.2, 0.2))];
    };
    const route = (s, last) => [
      HP(h, s * (4.3 + rr(-0.5, 0.5)), -10 + rr(-1, 1)),
      HP(h, s * (3.3 + rr(-0.3, 0.3)), -1.2 + rr(-0.4, 0.4)),
      last
    ];
    for (const s of [-1, 1]) {
      const seats = [
        { lx: s * 0.3, lz: 2.25, inner: true },
        { lx: s * 0.9, lz: 1.82 },
        { lx: s * 0.9, lz: 2.68 }
      ];
      seats.forEach((st, r) => {
        st.s = s;
        st.ly = -0.03;
        st.dur = st.inner ? 2.1 : 1.75;
        st.D = st.inner ? HP(h, s * 1.32, 1.5) : HP(h, s * ((st.lx * s) / 1.5 + 0.78), st.lz / 1.5);
        const lead = s === sL && r === 2;
        const hold = lead ? HP(h, s * 1.7, 2.9) : r === 0 ? st.D : HP(h, s * (1.95 + 0.5 * r), 1.45 - 1.3 * r);
        const m = spawn(
          h,
          'ranger',
          lead
            ? (() => {
                const q = AIRP(u0, -122.6);
                return [q[0], q[1]];
              })()
            : from(s, r),
          st,
          route(s, hold),
          { lead, delay: lead ? t0 : t0 + 0.35 + r * 0.32 + rr(0, 0.25), rank: r }
        );
        if (lead) {
          m.vmax = rr(4.3, 4.6);
          m.lookAt = HP(h, s * 4.5, -7);
        }
        h.bSide[s].push(m);
      });
    }
  });
  F.helis
    .filter(h => h.lb)
    .forEach((h, k) => {
      const u0 = clamp(h.uv[0], hangU(h.uv[0]) - 10, hangU(h.uv[0]) + 10),
        t0 = k * 0.3 + rr(0, 0.3);
      for (const s of [-1, 1])
        [-0.36, -1.3].forEach((lz, r) => {
          const st = { lx: s * 1.27, lz, ly: 0.03, s, dur: 1.6 };
          st.D = HP(h, s * (1.27 / 1.5 + 0.74), lz / 1.5);
          // cruzando la fila de Black Hawks por el hueco más cercano al lado de su Little Bird que le toca a este hombre
          let lane = null,
            bd = 1e9;
          for (const b of bhs)
            for (const sg of [-1, 1]) {
              const L_ = HP(b, sg * 6.5, 0),
                d = Math.abs((L_[0] - st.D[0]) * h.ex[0] + (L_[1] - st.D[1]) * h.ex[1]);
              if (d < bd) {
                bd = d;
                lane = L_;
              }
            }
          const jx = rr(-0.9, 0.9),
            q = AIRP(u0, -103 - r * 1.9 + rr(-0.3, 0.3));
          const wp = [
            [lane[0] + h.ex[0] * jx - h.ez[0] * 7, lane[1] + h.ex[1] * jx - h.ez[1] * 7],
            [lane[0] + h.ex[0] * jx + h.ez[0] * 7, lane[1] + h.ex[1] * jx + h.ez[1] * 7],
            HP(h, s * (3.1 + rr(-0.3, 0.3)), -4.6 + rr(-0.5, 0.5)),
            st.D
          ];
          const m = spawn(h, 'delta', [q[0] + h.ex[0] * s * 1.0, q[1] + h.ex[1] * s * 1.0], st, wp, {
            delay: t0 + r * 0.3 + rr(0, 0.3),
            rank: 0,
            solo: true
          });
          h.bSide[s].push(m);
        });
    });
  boardRunIn(B);
}
// los suelto ya corriendo: cada uno arranca a toda velocidad, retrasado en su primer tramo lo que habría tenido que esperar
function boardRunIn(B) {
  const T0 = 1.6; // salieron del hangar este tiempo antes de que empezara la misión
  for (const m of B.men) {
    const tg = m.wp[0],
      dx = tg[0] - m.x,
      dz = tg[1] - m.z,
      d = Math.hypot(dx, dz) || 1,
      ux = dx / d,
      uz = dz / d,
      back = (m.delay - T0) * m.vmax;
    m.x -= ux * back;
    m.z -= uz * back;
    m.delay = 0;
    m.st = 'run';
    m.spdB = m.vmax * rr(0.85, 1);
    m.dir = [ux, uz];
    m.face = Math.atan2(ux, uz);
    m.vx = ux * m.spdB;
    m.vz = uz * m.spdB;
    m.m.root.position.set(m.x, 0, m.z);
    m.m.root.rotation.y = m.face;
    m.m.prevYaw = m.face;
    if (m.m.spd != null) m.m.spd = m.spdB;
  }
}
function boardReady(m) {
  if (m.solo) return true;
  const h = m.bh,
    side = h.bSide[m.seat.s],
    ok = (o, p) => o.st === 'done' || (o.st === 'mount' && o.mprog >= p);
  for (const o of side) {
    if (o === m) break;
    if (!ok(o, 0.55)) return false;
  }
  if (m.lead) for (const o of h.bSide[-m.seat.s]) if (!ok(o, 0.3)) return false; // el jefe del chalk cuenta al último antes de subir él
  return true;
}
// poses clave para subir: [progreso, { 'joint.axis': ángulo, py: altura de la pelvis }]; lo que no se nombra está en reposo
function boardKeys(m) {
  const r = m.m,
    py0 = r.rest.py,
    sy = r.model ? 0.52 / SOLD_K : py0 * 0.62,
    ny = m.ny;
  const seat = {
    'hipL.x': -1.45,
    'hipR.x': -1.45,
    'knL.x': 1.25,
    'knR.x': 1.4,
    'hipL.z': 0.12,
    'hipR.z': -0.12,
    'shR.x': -0.5,
    'elR.x': -1.0,
    'shL.x': -0.65,
    'elL.x': -1.1,
    'neck.y': ny,
    py: sy
  };
  if (m.seat.inner)
    return [
      // sube por el borde con una mano en el marco, agacha la cabeza, se da la vuelta y se sienta
      [
        0.14,
        {
          'chest.x': 0.18,
          'hipL.x': -0.5,
          'knL.x': 0.7,
          'shL.x': -1.2,
          'elL.x': -0.5,
          'shR.x': -0.4,
          'elR.x': -1.2,
          py: py0 - 0.02
        }
      ],
      [
        0.34,
        {
          'chest.x': 0.4,
          'hipL.x': -1.35,
          'knL.x': 1.55,
          'hipR.x': 0.25,
          'knR.x': 0.25,
          'shL.x': -2.1,
          'elL.x': -0.35,
          'shR.x': -0.4,
          'elR.x': -1.2,
          'neck.x': -0.2,
          py: py0 + 0.04
        }
      ],
      [
        0.55,
        {
          'chest.x': 0.55,
          'abd.x': 0.25,
          'hipL.x': -1.0,
          'knL.x': 1.35,
          'hipR.x': -0.85,
          'knR.x': 1.45,
          'shL.x': -1.3,
          'elL.x': -0.8,
          'shR.x': -0.4,
          'elR.x': -1.2,
          py: py0 - 0.1
        }
      ],
      [
        0.8,
        {
          'chest.x': 0.3,
          'hipL.x': -1.25,
          'hipR.x': -1.3,
          'knL.x': 1.4,
          'knR.x': 1.45,
          'shL.x': 0.35,
          'elL.x': -0.3,
          'shR.x': -0.45,
          'elR.x': -1.1,
          'neck.y': ny * 0.5,
          py: sy + 0.1
        }
      ],
      [0.93, Object.assign({}, seat, { py: sy - 0.025, 'chest.x': 0.07, 'hipL.x': -1.5, 'hipR.x': -1.5 })],
      [1, seat]
    ];
  return [
    // se pone de espaldas a la puerta, apoya una mano en el suelo y se sienta hacia atrás
    [
      0.2,
      {
        'chest.x': 0.12,
        'hipL.x': -0.25,
        'knL.x': 0.45,
        'hipR.x': -0.1,
        'knR.x': 0.3,
        'shR.x': -0.45,
        'elR.x': -1.2,
        'shL.x': 0.2,
        'elL.x': -0.3,
        'neck.y': 0.5 * m.seat.s,
        py: py0 - 0.03
      }
    ],
    [
      0.42,
      {
        'chest.x': 0.42,
        'abd.x': 0.15,
        'hipL.x': -0.85,
        'hipR.x': -0.85,
        'knL.x': 1.15,
        'knR.x': 1.15,
        'shR.x': -0.45,
        'elR.x': -1.25,
        'shL.x': 0.95,
        'elL.x': -0.25,
        'neck.x': -0.25,
        py: py0 - 0.13
      }
    ],
    [
      0.62,
      {
        'chest.x': 0.3,
        'hipL.x': -1.2,
        'hipR.x': -1.25,
        'knL.x': 0.8,
        'knR.x': 0.7,
        'shR.x': -0.45,
        'elR.x': -1.2,
        'shL.x': 0.75,
        'elL.x': -0.5,
        py: sy + 0.12
      }
    ],
    [
      0.8,
      {
        'chest.x': 0.1,
        'hipL.x': -1.55,
        'hipR.x': -1.5,
        'knL.x': 1.05,
        'knR.x': 1.2,
        'hipL.z': 0.1,
        'hipR.z': -0.1,
        'shR.x': -0.5,
        'elR.x': -1.1,
        'shL.x': 0.25,
        'elL.x': -0.7,
        py: sy - 0.03
      }
    ],
    [0.92, Object.assign({}, seat, { py: sy + 0.012, 'chest.x': -0.06, 'knL.x': 1.4, 'knR.x': 1.5 })],
    [1, seat]
  ];
}
function boardMountStart(m) {
  const r = m.m,
    snap = {};
  for (const j of BOARD_J) {
    const q = r[j].rotation;
    snap[j + '.x'] = q.x;
    snap[j + '.y'] = q.y;
    snap[j + '.z'] = q.z;
  }
  snap.py = r.pelvis.position.y;
  m.keys = [[0, snap]].concat(boardKeys(m));
  m.st = 'mount';
  m.mprog = 0;
  m.moving = false;
  m.vx = m.vz = 0;
  m.r0 = [m.x, m.z];
  m.yaw0 = r.root.rotation.y;
  m.p0 = [
    r.pelvis.position.x,
    r.pelvis.position.z,
    r.body.position.x,
    r.body.position.y,
    r.body.position.z,
    r.body.rotation.x,
    r.body.rotation.y,
    r.body.rotation.z
  ];
}
function boardMount(m, dt) {
  const r = m.m,
    h = m.bh,
    st = m.seat,
    ss = t => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };
  m.mprog = Math.min(1, m.mprog + dt / st.dur);
  const p = m.mprog;
  // la pose, entre las dos claves que hay a cada lado de p
  let k = 0;
  while (k < m.keys.length - 2 && m.keys[k + 1][0] < p) k++;
  const A = m.keys[k],
    Bk = m.keys[k + 1],
    f = ss((p - A[0]) / Math.max(1e-4, Bk[0] - A[0])),
    py0 = r.rest.py;
  for (const j of BOARD_J) {
    const q = r[j].rotation,
      g = ax => {
        const n = j + '.' + ax,
          a = A[1][n] || 0,
          b = Bk[1][n] || 0;
        return a + (b - a) * f;
      };
    q.set(g('x'), g('y'), g('z'));
  }
  const pa = A[1].py != null ? A[1].py : py0,
    pb = Bk[1].py != null ? Bk[1].py : py0,
    e0 = 1 - ss(p / 0.25);
  r.pelvis.position.set(
    r.rest.px + (m.p0[0] - r.rest.px) * e0,
    pa + (pb - pa) * f,
    r.rest.pz + (m.p0[1] - r.rest.pz) * e0
  );
  r.body.position.set(
    r.rest.bx + (m.p0[2] - r.rest.bx) * e0,
    r.rest.by + (m.p0[3] - r.rest.by) * e0,
    r.rest.bz + (m.p0[4] - r.rest.bz) * e0
  );
  r.body.rotation.set(m.p0[5] * e0, m.p0[6] * e0, m.p0[7] * e0);
  // dónde está: desde donde estaba de pie, al borde y al asiento
  const S_ = [
    h.home[0] + (h.ex[0] * st.lx + h.ez[0] * st.lz) / 1.5,
    h.home[1] + (h.ex[1] * st.lx + h.ez[1] * st.lz) / 1.5
  ];
  const sill = st.inner
    ? [h.home[0] + h.ex[0] * st.s * 0.66 + h.ez[0] * 1.5, h.home[1] + h.ex[1] * st.s * 0.66 + h.ez[1] * 1.5]
    : [S_[0] + h.ex[0] * st.s * 0.3, S_[1] + h.ex[1] * st.s * 0.3];
  const t1 = st.inner ? 0.36 : 0.46,
    t2 = st.inner ? 0.62 : 0.8,
    a1 = ss(p / t1),
    a2 = ss((p - t1) / (t2 - t1));
  const x = (m.r0[0] + (sill[0] - m.r0[0]) * a1) * (1 - a2) + S_[0] * a2,
    z = (m.r0[1] + (sill[1] - m.r0[1]) * a1) * (1 - a2) + S_[1] * a2;
  const yOut = h.yawW + st.s * PH,
    dAng = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  let yaw;
  if (st.inner) {
    const yIn = yOut + Math.PI;
    yaw = p < 0.46 ? m.yaw0 + dAng(m.yaw0, yIn) * ss(p / 0.16) : yIn - st.s * Math.PI * ss((p - 0.46) / 0.34);
  } else {
    const d = dAng(m.yaw0, yOut),
      dd = Math.abs(d) > 2.6 ? st.s * -Math.abs(d) : d;
    yaw = m.yaw0 + dd * ss(p / 0.36);
  }
  m.x = x;
  m.z = z;
  m.y = (st.ly / 1.5) * ss((p - t1) / (t2 - t1));
  r.root.position.set(x, m.y, z);
  r.root.rotation.y = yaw;
  if (p >= 1) boardSeat(m);
}
function boardSeat(m) {
  const r = m.m,
    h = m.bh,
    st = m.seat;
  if (m.st !== 'mount') {
    boardMountStart(m);
  }
  const last = m.keys[m.keys.length - 1][1];
  for (const j of BOARD_J) r[j].rotation.set(last[j + '.x'] || 0, last[j + '.y'] || 0, last[j + '.z'] || 0);
  r.pelvis.position.set(r.rest.px, last.py, r.rest.pz);
  r.body.position.set(r.rest.bx, r.rest.by, r.rest.bz);
  r.body.rotation.set(0, 0, 0);
  h.g.add(r.root);
  r.root.scale.setScalar(1.5);
  r.root.position.set(st.lx, st.ly, st.lz);
  r.root.rotation.set(0, st.s * PH, 0);
  r.gun.visible = false;
  h.pax.push({ rig: r, look: m.look || (h.lb ? 'delta' : 'ranger'), side: st.s });
  m.st = 'done';
  m.mprog = 1;
  const i = FLIGHT.men.indexOf(m);
  if (i >= 0) FLIGHT.men.splice(i, 1);
}
function boardStep(F, dt) {
  const B = F.board;
  B.t += dt;
  if (!B.warm) {
    B.warm = 1;
    for (const m of B.men) {
      m.moving = true;
      m.m.spd = m.spdB;
      for (let k = 0; k < 6; k++) animRig(m, 1 / 30);
    }
  }
  const act = B.men.filter(m => m.st !== 'done');
  for (const m of act) {
    m.bmov = false;
    if (m.st === 'wait') {
      if (B.t >= m.delay) m.st = 'run';
      continue;
    }
    if (m.st === 'run' || m.st === 'todoor') {
      const tg = m.wp[m.wi],
        last = m.wi === m.wp.length - 1,
        dx = tg[0] - m.x,
        dz = tg[1] - m.z,
        d = Math.hypot(dx, dz) || 1e-4;
      const vm = m.st === 'todoor' ? 2.2 : m.vmax * (1 + 0.07 * Math.sin(B.t * m.vf + m.vp)),
        vt = last ? Math.min(vm, Math.sqrt(2 * 4.5 * d) + 0.2) : vm;
      m.spdB += clamp(vt - m.spdB, -10 * dt, 4.5 * dt);
      if (d < (last ? 0.1 : 1.1)) {
        if (!last) {
          m.wi++;
        } else if (m.st === 'todoor') {
          boardMountStart(m);
          continue;
        } else {
          m.st = m.lead ? 'lead' : 'hold';
          m.spdB = 0;
        }
      } else {
        const k = last && d < 0.7 ? 1 : Math.min(1, dt * 5.5);
        m.dir[0] += (dx / d - m.dir[0]) * k;
        m.dir[1] += (dz / d - m.dir[1]) * k;
        const n = Math.hypot(m.dir[0], m.dir[1]) || 1;
        m.dir[0] /= n;
        m.dir[1] /= n;
        const st = Math.min(d, m.spdB * dt);
        m.x += m.dir[0] * st;
        m.z += m.dir[1] * st;
        m.vx = m.dir[0] * m.spdB;
        m.vz = m.dir[1] * m.spdB;
        m.face = Math.atan2(m.dir[0], m.dir[1]);
        m.bmov = m.spdB > 0.3;
      }
    }
    if (m.st === 'hold' || m.st === 'lead') {
      const D = m.seat.D,
        dd = Math.hypot(D[0] - m.x, D[1] - m.z);
      m.face =
        m.st === 'lead'
          ? Math.atan2(m.lookAt[0] - m.x, m.lookAt[1] - m.z)
          : Math.atan2(m.bh.home[0] - m.x, m.bh.home[1] - m.z);
      if (boardReady(m)) {
        if (dd > 0.12) {
          m.st = 'todoor';
          m.wp = [D];
          m.wi = 0;
        } else {
          m.face = Math.atan2(m.bh.home[0] - m.x, m.bh.home[1] - m.z);
          boardMountStart(m);
        }
      }
    }
  }
  // nadie atraviesa a nadie
  for (let i = 0; i < act.length; i++) {
    const a = act[i];
    if (a.st !== 'run') continue;
    for (let j = i + 1; j < act.length; j++) {
      const b = act[j];
      if (b.st !== 'run') continue;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz);
      if (d < 0.85 && d > 1e-3) {
        const q = (0.85 - d) * 0.5 * Math.min(1, dt * 8);
        a.x -= (dx / d) * q;
        a.z -= (dz / d) * q;
        b.x += (dx / d) * q;
        b.z += (dz / d) * q;
      }
    }
  }
  // las tripulaciones arrancan los motores en el 0:30 de la música (o unos segundos después si no hay música), siga corriendo quien siga
  {
    const go = B.t >= CI_ROT;
    if (B.t >= CI_ROT - 7) cmusStart(); // la música entra 7 s antes que los motores
    if (go && B.rotT == null) {
      B.rotT = B.t;
      say('Super 6-1', 'Arrancando motores.', 'air');
      cmusStart();
    }
    let rsSum = 0;
    for (const h of F.helis) {
      const x = B.rotT == null ? 0 : clamp((B.t - B.rotT - h.spool) / 5.5, 0, 1);
      h.rs = x * x * (3 - 2 * x);
      rsSum += h.rs;
      h.rotor.rotation.y += dt * (h.lb ? 26 : 17) * h.rs;
      if (h.tail) h.tail.rotation.x += dt * 42 * h.rs;
      if (h.rs > 0.05) rotorWash(h.x, h.z, 0, dt, (h.lb ? 0.6 : 1) * h.rs);
    }
    if (AC && rotorGain)
      rotorGain.gain.setTargetAtTime(soundOn ? (0.55 * rsSum) / F.helis.length : 0, AC.currentTime, 0.2);
  }
  updMen(F, dt);
  for (const m of act) {
    if (m.st === 'mount') boardMount(m, dt);
    else if (m.st === 'lead') {
      const r = m.m,
        w = Math.sin(B.t * 6.5 + m.vp); // «¡vamos, vamos!»: el brazo del lado de la puerta les hace molinetes para que entren
      const sh = m.seat.s > 0 ? r.shL : r.shR,
        el = m.seat.s > 0 ? r.elL : r.elR;
      sh.rotation.x = -1.35 + 0.55 * w;
      sh.rotation.z = (m.seat.s > 0 ? 1 : -1) * 0.25;
      el.rotation.x = -0.9 - 0.45 * Math.sin(B.t * 6.5 + m.vp + 1.2);
    }
  }
  const once = (k, c, fn) => {
    if (!B.said[k] && c) {
      B.said[k] = 1;
      fn();
    }
  };
  once('a', B.t > 0.6, () =>
    say('Uniform 6-4', 'Tenemos la palabra clave. ¡Todo el mundo a los helicópteros!', 'hq', true)
  );
  once('b', B.t > 7, () =>
    say('Romeo 6-4', '¡Vamos, vamos! ¡Cada uno a su pájaro, por los lados, lejos del rotor de cola!', 'hq')
  );
  once(
    'c',
    B.men.some(m => m.lead && m.st === 'mount'),
    () => say('Super 6-1', 'Los jefes de equipo cuentan al último y suben. Listos para arrancar.', 'air')
  );
  // la cámara va con los que corren y luego se queda en la línea de vuelo
  {
    let cx = 0,
      cz = 0,
      n = 0;
    for (const m of act) {
      cx += m.x;
      cz += m.z;
      n++;
    }
    const hc = AIRP(-134, -62),
      w = n ? clamp(B.t / 16, 0, 1) * 0.6 : 1;
    if (n) {
      cx /= n;
      cz /= n;
    } else {
      cx = hc[0];
      cz = hc[1];
    }
    const fx = cx * (1 - w) + hc[0] * w,
      fz = cz * (1 - w) + hc[1] * w,
      a = Math.min(1, dt * 1.8);
    if (F.sel != null) {
      const c = unitCentre(F, F.sel);
      camS.tx += (c[0] - camS.tx) * Math.min(1, dt * 4);
      camS.tz += (c[2] - camS.tz) * Math.min(1, dt * 4);
      camS.zoomT = clamp(8 * F.uz, 4, 30);
    } else {
      camS.tx += (fx - camS.tx) * a;
      camS.tz += (fz - camS.tz) * a;
      camS.zoomT = clamp(13.5 * F.uz, 4, 30);
    }
    camS.yawT = F.yaw0 + F.uyaw;
  }
  if (!act.length && B.endT == null) B.endT = B.t;
  if (B.t > 55) for (const m of act) boardSeat(m); // nunca dejo el vuelo esperando
  if (B.endT != null && B.rotT == null && B.t > B.endT + 20) {
    B.rotT = B.t;
    cmusStart();
  }
  if (B.endT != null && B.t > B.endT + 0.9 && B.rotT != null && B.t > B.rotT + 4) {
    B.on = false;
    // F.t vuelve a 0: los rotores conservan la velocidad que ya tienen
    for (const h of F.helis) h.spool -= B.t - B.rotT;
    cineText('Operación Irene · 15:32 · arrancan los rotores en el aeródromo');
  }
}
