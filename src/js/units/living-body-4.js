/* ====================================================================================================
 * units/living-body-4.js
 *
 * Cuarta capa del cuerpo vivo:
 *  · Arrastrar a un compañero caído: bajo fuego (o agachado) ya no se lo echa al hombro, lo arrastra con una mano
 *    tirando del asa del chaleco, el fusil en la otra, encorvado y mirando atrás de vez en cuando. El cuerpo va boca
 *    arriba, con los hombros levantados, la cabeza colgando hacia atrás y los talones por el suelo.
 *  · Formas de andar: en guardia (arma arriba y la vista de lado a lado), cansado (hombros caídos, cabeza gacha),
 *    milicia relajada (el fusil al hombro), y entre los civiles la mujer con el paso balanceado, el viejo encorvado
 *    y el que va con prisa.
 *  · La onda de una explosión cercana (las muy cercanas ya derriban, combat/knockdown.js): agacharse con el brazo sobre
 *    la cabeza, taparse el oído, quedarse aturdido tambaleándose, o taparse la cara del polvo y toser.
 *  · Entrar en un edificio: en los últimos pasos hasta la puerta va agachado, pegado, con el arma arriba y despacio.
 * ================================================================================================== */

// el cuerpo arrastrado: tumbado boca arriba detrás del que tira, con los brazos sueltos y las piernas estiradas
flatPose.dragged = Object.assign({}, flatPose.slung, {
  tor: -0.15,
  head: -0.45,
  lua0: 0.35,
  lua1: 0,
  lua2: 0.75,
  rua0: 0.35,
  rua1: 0,
  rua2: -0.75,
  lfa: -0.35,
  rfa: -0.25,
  lth0: 0.05,
  lth1: 0.12,
  rth0: 0.02,
  rth1: -0.12,
  lsh: 0.15,
  rsh: 0.25,
  lft: 0.9,
  rft: 0.7
});
const DRAG = { back: 1.45, pitch: Math.PI / 2 - 0.32, y: 0.06 };
// ¿lo arrastra o lo lleva al hombro? Arrastra si le disparan o va agachado; con un margen para no cambiar a cada momento
function dragMode(c) {
  const want = c.sup > 30 || c.pinned || c.stance !== 'stand';
  if (want) c.dragT = G.t + 2.5;
  return want || c.dragT > G.t;
}
// coloca el cuerpo arrastrado detrás del que tira de él (lo llama syncBody)
function syncDragged(u, c) {
  const r = u.m.root,
    yaw = c.m.root.rotation.y;
  r.position.set(c.x - Math.sin(yaw) * DRAG.back, (c.elev || 0) + DRAG.y, c.z - Math.cos(yaw) * DRAG.back);
  r.rotation.y = yaw + Math.PI; // los pies hacia atrás, la cabeza hacia el que tira
  r.visible = c.m.root.visible;
  const b = u.m.body,
    sp = Math.hypot(c.vx || 0, c.vz || 0),
    jolt = Math.sin(G.t * 9) * 0.02 * clamp(sp / 0.6, 0, 1); // a tirones, con cada paso del que tira
  b.rotation.set(-DRAG.pitch + jolt, 0, Math.sin(G.t * 4.5) * 0.04 * clamp(sp / 0.6, 0, 1));
  b.position.set(0, 0, 0);
  if (u.m.gun) u.m.gun.visible = false;
}

// los gestos de la onda expansiva
const BLAST_REACT = {
  duck: { d: [1.2, 1.8] },
  ears: { d: [1.6, 2.4] },
  dazed: { d: [2.6, 3.8] },
  dust: { d: [2.0, 2.8] }
};
// una explosión: cada uno de los que están cerca (pero no tanto como para caer) reacciona a su manera, un instante después
function blastReact(x, z) {
  const near = [];
  for (const list of [us, them, typeof civs !== 'undefined' ? civs : []])
    for (const u of list) {
      if (!u.alive || u.down || u.carriedBy || u.mounted || u.ride || u.board || (u.kdT > G.t) || u.inB) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < 3.5 || d > 15) continue;
      near.push([u, d]);
    }
  for (const [u, d] of near) {
    const r = rnd();
    const k = d < 7 ? (r < 0.45 ? 'dazed' : r < 0.8 ? 'duck' : 'ears') : r < 0.45 ? 'duck' : r < 0.7 ? 'ears' : 'dust';
    const S = BLAST_REACT[k];
    u.blR = { k, t: -rr(0.05, 0.2) - d / 230, d: rr(S.d[0], S.d[1]) * (d < 7 ? 1.2 : 1), dir: rnd() < 0.5 ? -1 : 1 };
    u.blA = Math.atan2(x - u.x, z - u.z);
    if (u.team === 'us' && !u.npc && k === 'dazed' && rnd() < 0.3)
      radio(u, pick(['No oigo nada…', '¡Estoy bien! Estoy bien.', 'Joder, me pita el oído.']));
  }
}
// cuánto le deja avanzar lo que le está pasando (aturdido, metiéndose por una puerta, arrastrando)
function moveSlow(u) {
  let k = 1;
  if (u.blR && u.blR.t > 0 && u.blR.t < u.blR.d) k *= u.blR.k === 'dazed' ? 0.5 : u.blR.k === 'duck' ? 0.3 : 0.85;
  if (u.carrying && u.dragging) k *= 0.75; // sobre el 0,58 de llevarlo a cuestas
  if (u.doorB > 0.5) k *= 0.7;
  return k;
}

function liveBody4(u, m, c, dt, G, tgt, fear) {
  const now = lbNow(),
    sp = m.spd || 0,
    walk = u.moving && sp > 0.15;
  // arrastrando a un compañero
  if (u.carrying) {
    u.dragging = dragMode(u);
    m.drB = sm(m.drB || 0, u.dragging ? 1 : 0, 1 - Math.exp(-6 * dt));
    const b = m.drB;
    if (b > 0.01) {
      // la mano derecha atrás y abajo, agarrando el asa del chaleco; la izquierda lleva el fusil
      G.R(0.75, -0.15, -0.35, b);
      G.tor += 0.4 * b;
      G.tw -= 0.3 * b;
      G.kL += 0.35 * b;
      G.kR += 0.35 * b;
      G.py -= 0.08 * b;
      G.rl -= 0.06 * b;
      // de vez en cuando mira atrás para ver cómo va
      const lb = Math.max(0, Math.sin(now * 0.9 + (m.lbSeed || 0))) > 0.85 ? 1 : 0;
      m.drL = sm(m.drL || 0, lb, 1 - Math.exp(-5 * dt));
      G.hy -= 1.1 * m.drL * b;
      // cada paso es un tirón
      G.tor += Math.max(0, Math.sin((m.phase || 0) * 2)) * 0.06 * b * (walk ? 1 : 0);
    }
    // a hombros: el brazo derecho abraza las piernas del que lleva por delante; el izquierdo lleva el fusil
    const sh = 1 - b;
    if (sh > 0.01) {
      G.R(-1.25, -0.35, -1.85, sh);
      G.tor += 0.12 * sh;
      G.rl -= 0.05 * sh;
      G.kL += 0.1 * sh;
      G.kR += 0.1 * sh;
    }
  } else {
    u.dragging = false;
    m.drB = 0;
  }
  // formas de andar
  if (walk) {
    const run = clamp((sp - 1.1) / 0.8, 0, 1),
      wk = 1 - run,
      ph = m.phase || 0;
    if (m.gaitS == null) {
      // la manera de andar de cada uno se decide una vez
      if (u.team === 'civ') m.gaitS = u.woman ? 'sway' : pick(['plain', 'plain', 'elder', 'hurry']);
      else if (u.team === 'them') m.gaitS = rnd() < 0.35 ? 'slack' : 'plain';
      else m.gaitS = 'plain';
    }
    if (u.team === 'us' && !tgt && !u.carrying) {
      // en guardia: el arma arriba, el paso corto y la vista barriendo
      const g = (fear || u.sup > 8 ? 1 : 0) * wk;
      m.grdB = sm(m.grdB || 0, g, 1 - Math.exp(-4 * dt));
      if (m.grdB > 0.01) {
        G.gx -= 0.18 * m.grdB;
        G.tor += 0.08 * m.grdB;
        G.kL += 0.12 * m.grdB;
        G.kR += 0.12 * m.grdB;
        G.py -= 0.025 * m.grdB;
        if (m.lbLook) G.tw += m.lbLook.hy * 0.25 * m.grdB;
      }
    }
    const tired = clamp(((m.fat || 0) - 0.35) / 0.4, 0, 1) * wk;
    if (tired > 0.01) {
      // cansado: los hombros caídos, la cabeza gacha y el arma baja
      G.tor += 0.12 * tired;
      G.hp += 0.22 * tired;
      G.gx += 0.25 * tired;
      G.rl += Math.sin(ph) * 0.04 * tired;
    }
    if (m.gaitS === 'slack' && !tgt && !fear) {
      // la milicia tranquila lleva el fusil al hombro, sujeto por el cañón
      G.gx -= 1.2 * wk;
      G.gpy += 0.14 * wk;
      G.gpx += 0.05 * wk;
      G.L(0.1 - Math.sin(ph) * 0.45, 0.1, -0.25, 0, wk);
      G.pz += Math.cos(ph) * 0.03 * wk;
    }
    if (m.gaitS === 'sway') {
      G.pz += Math.cos(ph) * 0.07 * wk;
      G.rl -= Math.cos(ph) * 0.03 * wk;
    }
    if (m.gaitS === 'elder') {
      G.tor += 0.28;
      G.hp -= 0.15;
      G.kL += 0.15;
      G.kR += 0.15;
      G.py -= 0.03;
    }
    if (m.gaitS === 'hurry') {
      G.tor += 0.15;
      G.hp += 0.08;
    }
  }
  // la onda de una explosión
  const R_ = u.blR;
  if (R_) {
    R_.t += dt;
    const p = clamp(R_.t / R_.d, 0, 1);
    if (R_.t > 0) {
      if (R_.k === 'duck') {
        const a = lbEnv(p, 0, 0.06, 0.55, 1);
        G.kL += 0.85 * a;
        G.kR += 0.85 * a;
        G.hL -= 0.55 * a;
        G.hR -= 0.55 * a;
        G.py -= 0.13 * a;
        G.tor += 0.38 * a;
        G.hp += 0.5 * a;
        G.L(-2.6, -0.7, -2.3, 0.2, a);
        if (u.team === 'civ') G.R(-2.6, 0.7, -2.3, a);
      } else if (R_.k === 'ears') {
        const a = lbEnv(p, 0, 0.08, 0.7, 1),
          sh = Math.sin(R_.t * 14) * Math.exp(-R_.t * 1.5);
        G.L(-2.3, -0.8, -2.3, 0.3, a);
        if (u.team === 'civ') G.R(-2.3, 0.8, -2.3, a);
        G.hy += sh * 0.35 * a;
        G.tor += 0.15 * a;
        G.hp += 0.2 * a;
      } else if (R_.k === 'dazed') {
        const a = lbEnv(p, 0, 0.05, 0.7, 1),
          t = R_.t;
        G.rl += Math.sin(t * 2.6) * 0.12 * a;
        G.pz += Math.sin(t * 2.6 + 0.8) * 0.07 * a;
        G.hr += Math.sin(t * 1.9) * 0.22 * a;
        G.hp += (0.2 + Math.sin(t * 1.3) * 0.12) * a;
        G.tor += 0.12 * a;
        G.kL += Math.max(0, Math.sin(t * 2.6)) * 0.3 * a;
        G.kR += Math.max(0, -Math.sin(t * 2.6)) * 0.3 * a;
        G.L(-2.5, -0.6, -2.2, 0.2, a * lbEnv(p, 0.05, 0.15, 0.4, 0.55)); // la mano a la cabeza un momento
        G.gx += 0.3 * a;
      } else if (R_.k === 'dust') {
        const a = lbEnv(p, 0, 0.1, 0.75, 1),
          k = lbBell(p, 0.45, 0.05) + lbBell(p, 0.6, 0.05);
        G.L(-2.0, -1.0, -2.4, 0.2, a);
        let away = (u.blA || 0) - (m.root ? m.root.rotation.y : 0);
        away = Math.atan2(Math.sin(away), Math.cos(away));
        G.hy -= Math.sign(away || 1) * 0.6 * a;
        G.tor += (0.2 + 0.15 * k) * a;
        G.hp += 0.3 * a + 0.2 * k;
      }
    }
    if (R_.t >= R_.d) u.blR = null;
  }
  // los últimos pasos hasta una puerta: agachado, pegado, el arma arriba
  const door = u.order && u.order.type === 'enter' && u.path.length > 0 && u.path.length <= 3 && !u.inB ? 1 : 0;
  m.doorB = sm(m.doorB || 0, door, 1 - Math.exp(-5 * dt));
  u.doorB = m.doorB;
  if (m.doorB > 0.01) {
    const a = m.doorB;
    G.kL += 0.4 * a;
    G.kR += 0.4 * a;
    G.hL -= 0.2 * a;
    G.hR -= 0.2 * a;
    G.py -= 0.07 * a;
    G.tor += 0.16 * a;
    G.gx -= 0.12 * a;
    G.hp -= 0.05 * a;
  }
}
