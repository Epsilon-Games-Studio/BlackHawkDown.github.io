/* ====================================================================================================
 * units/living-body-3.js
 *
 * Tercera capa del cuerpo vivo, encima de liveBody():
 *  · Atender a un herido paso a paso: tomar el pulso, apretar la herida, vendar, poner un torniquete, pinchar la morfina,
 *    hablarle, pedir la evacuación por radio, buscar en la bolsa y levantar la vista por si viene alguien. Se encadenan
 *    sin repetir y el sanitario hace más torniquetes e inyecciones. Sin herido delante, se venda él mismo.
 *  · Señales con la mano (SIGNALS): avanzar, adelante, alto, reagruparse, esperar, cubridme, enemigo a la vista, escuchar,
 *    venid, de dos en dos, todo bien y vigilad, además de las de antes (señalar, al suelo, puño). sigGo() lanza una.
 *  · El arma: encasquillamiento (golpe al cargador, tirar del cerrojo y seguir), el cañón acompaña a la mirada al avanzar
 *    con miedo y un golpe seco al cargador al terminar de recargar.
 *  · Civiles: miran hacia los tiros antes de echar a correr; huyen de tres maneras (corriendo, agachados o con las manos
 *    sobre la cabeza) y se esconden de otras tres (cubriéndose la cabeza, rezando o abrazados a las rodillas).
 * ================================================================================================== */

// ---------- señales ----------
// f(p, G, dir): p de 0 a 1 a lo largo de la señal; dir hacia qué lado (para las que barren)
const SIGNALS = {
  advance: {
    // el brazo viene de atrás y barre hacia delante, dos veces
    f(p, G) {
      const s = 0.5 - 0.5 * Math.cos(p * Math.PI * 4);
      G.L(sm(0.35, -1.6, s), 0.1, -0.2, 0, 1);
      G.tw -= 0.12 * s;
    }
  },
  go: {
    // la mano sube y cae como un hachazo hacia el frente
    f(p, G) {
      const s = _lbSS(0.35, 0.55, p);
      G.L(sm(-2.7, -1.35, s), 0.1, -0.15, 0, 1);
      G.tor += 0.06 * s;
    }
  },
  halt: {
    // alto: el brazo arriba con la palma abierta
    f(p, G) {
      G.L(-2.45, 0.2, -1.55, -0.9, 1);
    }
  },
  rally: {
    // reagruparse: la mano hace círculos por encima de la cabeza
    f(p, G) {
      const a = p * Math.PI * 6;
      G.L(-2.9 + Math.sin(a) * 0.25, 0.3 + Math.cos(a) * 0.35, -0.4, 0, 1);
      G.hp -= 0.1;
    }
  },
  wait: {
    // esperad: la palma hacia fuera, al costado
    f(p, G) {
      G.L(-1.35, 0.9, -0.3, -1.2, 1);
    }
  },
  cover: {
    // cubridme: palmadas en lo alto del casco
    f(p, G) {
      G.L(-2.8, -0.5, -2.15 - Math.max(0, Math.sin(p * Math.PI * 8)) * 0.25, 0.2, 1);
    }
  },
  enemy: {
    // enemigo: dos dedos a los ojos y luego señala
    f(p, G) {
      const s = _lbSS(0.35, 0.5, p);
      G.L(sm(-2.4, -1.55, s), sm(-0.8, 0.1, s), sm(-2.4, -0.15, s), 0, 1);
      G.hp += 0.1 * (1 - s);
    }
  },
  listen: {
    // escuchad: la mano en la oreja, la cabeza ladeada
    f(p, G) {
      G.L(-2.2, -0.4, -2.4, 0.3, 1);
      G.hr += 0.25;
      G.hp += 0.08;
    }
  },
  come: {
    // venid: el antebrazo llama hacia sí
    f(p, G) {
      const s = Math.max(0, Math.sin(p * Math.PI * 6));
      G.L(-1.3, 0.1, -0.3 - s * 1.2, 0.2, 1);
    }
  },
  pair: {
    // de dos en dos: el brazo al frente sube y baja dos veces
    f(p, G) {
      G.L(-1.5 + Math.sin(p * Math.PI * 4) * 0.3, 0.05, -0.2, 0, 1);
    }
  },
  ok: {
    // todo bien: pulgar arriba bien alto
    f(p, G) {
      G.L(-1.8, 0.1, -1.8, 0.3, 1);
    }
  },
  sweep: {
    // marca una línea en el suelo: el brazo estirado va de un extremo al otro, despacio, y vuelve
    f(p, G) {
      const s = _lbSS(0.15, 0.75, p) - 0.5;
      G.L(-1.45, 0.1 + s * 1.3, -0.12, 0, 1);
      G.tw -= s * 0.35;
      G.hy += s * 0.5;
    }
  },
  watch: {
    // vigilad ese lado: a los ojos y barre hacia el sector
    f(p, G, dir) {
      const s = _lbSS(0.3, 0.45, p),
        sw = _lbSS(0.5, 0.9, p);
      G.L(sm(-2.4, -1.5, s), sm(-0.8, 0.1 + dir * 0.5 * sw, s), sm(-2.4, -0.15, s), 0, 1);
      G.hy += dir * 0.4 * sw;
    }
  }
};
// lanza una señal (si ya está haciendo otra, no la corta)
function sigGo(u, k, t) {
  if (!u || !u.alive || (u.sigT || 0) > 0.3) return;
  u.sigK = Array.isArray(k) ? pick(k) : k;
  u.sigT = t || 1.4;
  u.sigD = u.sigT;
  u.sigDir = rnd() < 0.5 ? -1 : 1;
}

// ---------- atender heridos ----------
const MED_STEPS = {
  pulse: {
    d: [2, 3],
    f(p, G) {
      G.L(-1.0, -0.1, -0.6, 0.3, 1);
      G.R(-0.4, 0.2, -0.9, 0.8);
      G.hp += 0.3;
      G.tor += 0.08;
    }
  },
  press: {
    // las dos manos aprietan la herida con todo el peso
    d: [3, 4.5],
    f(p, G) {
      const pump = Math.max(0, Math.sin(p * Math.PI * 7)) * 0.6 + 0.4;
      G.L(-1.05, -0.35, -0.45 - 0.15 * pump, 0.3, 1);
      G.R(-1.05, 0.35, -0.45 - 0.15 * pump, 1);
      G.tor += 0.12 * pump;
      G.py -= 0.02 * pump;
    }
  },
  wrap: {
    // vendar: las manos dan vueltas alrededor del miembro
    d: [3.5, 5],
    f(p, G) {
      const a = p * Math.PI * 7;
      G.L(-0.9 + Math.sin(a) * 0.25, -0.3 + Math.cos(a) * 0.2, -1.0, 0.3, 1);
      G.R(-0.9 - Math.sin(a) * 0.25, 0.3 - Math.cos(a) * 0.2, -1.0, 1);
      G.hp += 0.15;
    }
  },
  tourniquet: {
    // el torniquete: una mano sujeta, la otra gira la varilla y al final tira fuerte
    d: [3, 4],
    medic: 2,
    f(p, G) {
      const twist = p < 0.75 ? Math.sin(p * Math.PI * 12) * 0.3 : 0,
        pull = _lbSS(0.75, 0.85, p);
      G.L(-0.95, -0.2, -0.7, 0.2, 1);
      G.R(-1.0 + 0.25 * pull, 0.2 + twist, -1.2 - 0.3 * pull, 1);
      G.tor -= 0.12 * pull;
    }
  },
  inject: {
    // la morfina: la mano sube y pincha en el muslo
    d: [1.8, 2.4],
    medic: 2,
    f(p, G) {
      const s = _lbSS(0.45, 0.55, p) * (1 - _lbSS(0.75, 0.9, p));
      G.R(sm(-1.6, -0.9, s), 0.15, sm(-1.6, -0.5, s), 1);
      G.L(-0.95, -0.25, -0.6, 0.2, 0.8);
      G.hp += 0.25;
    }
  },
  talk: {
    // le habla: la mano en el hombro y la cabeza cerca
    d: [2.2, 3.2],
    f(p, G) {
      G.L(-0.95, -0.1, -0.4, 0.2, 1);
      G.hp += 0.2 + Math.sin(p * 14) * 0.06;
      G.tor += 0.1;
    }
  },
  radio: {
    // pide la evacuación por radio
    d: [2.5, 3.5],
    f(p, G, dir) {
      G.L(-2.25, -0.75, -2.3, 0.3, 1);
      G.hp -= 0.15;
      G.hy += dir * Math.sin(p * 3) * 0.4;
    }
  },
  bag: {
    // rebusca en la bolsa del costado
    d: [1.8, 2.6],
    f(p, G) {
      G.R(0.2, -0.25, -1.0 + Math.sin(p * 18) * 0.15, 1);
      G.hy -= 0.5;
      G.hp += 0.35;
      G.tw -= 0.25;
    }
  },
  scan: {
    // levanta la vista por si viene alguien
    d: [1.4, 2],
    f(p, G, dir) {
      G.hp -= 0.35;
      G.tor -= 0.12;
      G.hy += dir * Math.sin(p * Math.PI * 2) * 0.8;
    }
  }
};
const SELF_STEPS = {
  // sin nadie delante: se venda él mismo un brazo o una pierna
  selfWrap: {
    d: [3, 4.5],
    f(p, G) {
      const a = p * Math.PI * 6;
      G.L(-0.5 + Math.sin(a) * 0.2, -0.45 + Math.cos(a) * 0.15, -1.25, 0.3, 1);
      G.R(-0.5 - Math.sin(a) * 0.2, 0.3, -1.25, 1);
      G.hp += 0.4;
      G.tor += 0.15;
    }
  },
  selfPress: {
    d: [2.5, 3.5],
    f(p, G) {
      G.L(-0.45, -0.8, -1.5, 0.3, 1);
      G.hp += 0.3;
      G.tor += 0.2;
    }
  }
};
function medPick(u, m, steps) {
  const ks = Object.keys(steps).filter(k => k !== m.mdLast);
  let tot = 0;
  const w = k => (u.medic ? steps[k].medic || 1 : steps[k].medic ? 0.5 : 1);
  for (const k of ks) tot += w(k);
  let r = rnd() * tot;
  for (const k of ks) if ((r -= w(k)) <= 0) return k;
  return ks[0];
}

// ---------- civiles ----------
function civFlee(u, m, G, dt) {
  const st = u.state;
  if (st !== m.cvSt) {
    m.cvSt = st;
    if (st === 'flee') {
      m.cvF = pick(['run', 'duck', 'head']);
      // antes de correr mira hacia donde suenan los tiros
      const n = G_lastNoise(u);
      if (n) {
        u.glanceA = Math.atan2(n.x - u.x, n.z - u.z);
        u.glanceT = 0.7;
      }
    }
    if (st === 'cower') m.cvC = pick(['head', 'pray', 'hug']);
  }
  if (st === 'flee' && u.moving) {
    if (m.cvF === 'duck') {
      G.tor += 0.45;
      G.kL += 0.35;
      G.kR += 0.35;
      G.py -= 0.08;
    } else if (m.cvF === 'head') {
      G.L(-2.7, -0.7, -2.3, 0.2, 1);
      G.R(-2.7, 0.7, -2.3, 1);
      G.tor += 0.3;
      G.hp += 0.3;
    }
  }
  if (st === 'cower') {
    const t = m.lbT || 0;
    if (m.cvC === 'head') {
      G.L(-2.6, -0.75, -2.35, 0.2, 1);
      G.R(-2.6, 0.75, -2.35, 1);
      G.tor += 0.35 + Math.sin(t * 2.2) * 0.05;
      G.hp += 0.45;
    } else if (m.cvC === 'pray') {
      G.L(-0.9, -0.85, -2.2, 0.3, 1);
      G.R(-0.9, 0.85, -2.2, 1);
      G.tor += 0.2 + Math.sin(t * 1.6) * 0.08;
      G.hp += 0.4;
    } else {
      G.L(-0.75, -0.6, -1.2, 0.2, 1);
      G.R(-0.75, 0.6, -1.2, 1);
      G.tor += 0.4;
      G.hp += 0.5;
    }
  }
}
// el último ruido fuerte cerca (disparos, explosiones)
function G_lastNoise(u) {
  let best = null,
    bd = 40;
  for (const n of G.noise || []) {
    if (G.t - n.t > 4) continue;
    const d = Math.hypot(n.x - u.x, n.z - u.z);
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

// ejecuta fn con todo lo que añade escalado por w (0..1): los brazos pesan w y lo que suma al tronco o la cabeza, w veces
const LB_ADD = ['tor', 'tw', 'rl', 'pz', 'py', 'hp', 'hy', 'hr', 'kL', 'kR', 'hL', 'hR', 'gx', 'gy', 'gz', 'gpx', 'gpy', 'gpz'];
function lbScaled(G, w, fn) {
  if (w <= 0.001) return;
  const b = LB_ADD.map(k => G[k]);
  G.ws = w;
  fn();
  G.ws = 1;
  LB_ADD.forEach((k, i) => (G[k] = b[i] + (G[k] - b[i]) * w));
}
// el reloj de la partida (dentro de liveBody3 «G» son los canales, no la partida)
function lbNow() {
  return G.t;
}
// ---------- la capa entera ----------
function liveBody3(u, m, c, dt, G, tgt, fear) {
  // las señales nuevas: mandan en el brazo según lo metido que esté (m.sigB)
  if ((u.sigT || 0) > 0 && SIGNALS[u.sigK] && m.sigB > 0.01) {
    const D = u.sigD || 1.4,
      p = clamp(1 - u.sigT / D, 0, 1);
    lbScaled(G, m.sigB, () => SIGNALS[u.sigK].f(p, G, u.sigDir || 1));
    G.tw += 0.12 * m.sigB;
  }
  // un nuevo enemigo a la vista: a veces lo avisa con la mano antes de abrir fuego
  if (u.team === 'us' && !u.npc) {
    if (tgt && tgt !== m.lastTgt && !(u.firing > 0) && rnd() < 0.25) sigGo(u, 'enemy', 1.3);
    m.lastTgt = tgt;
  }
  // atender heridos
  if (u.healing && m.healB > 0.2) {
    const pat = u.order && u.order.pat,
      steps = pat ? MED_STEPS : SELF_STEPS;
    let S = m.mdS;
    if (!S || S.self !== !pat || S.t >= S.d) {
      const k = !S && pat ? 'pulse' : medPick(u, m, steps);
      const d = steps[k].d;
      S = m.mdS = { k, t: 0, d: rr(d[0], d[1]), self: !pat, dir: rnd() < 0.5 ? -1 : 1 };
      m.mdLast = k;
    }
    S.t += dt;
    const p = clamp(S.t / S.d, 0, 1),
      e = lbEnv(p, 0, 0.12, 0.88, 1),
      b = m.healB;
    // cada paso entra y sale suave; entre pasos las manos vuelven a la herida (la pose de curar)
    lbScaled(G, e * b, () => steps[S.k].f(p, G, S.dir));
  } else m.mdS = null;
  // el arma
  if (!m.noGun && u.team !== 'civ') {
    // encasquillado: golpe al cargador, tirón del cerrojo, sigue
    if (u.jamT > lbNow()) {
      const p = clamp(1 - (u.jamT - lbNow()) / 1.6, 0, 1),
        slap = lbBell(p, 0.25, 0.07),
        rack = lbBell(p, 0.6, 0.08);
      G.L(sm(-1.0, -0.75, slap), -0.35 + rack * 0.3, -1.6 + rack * 0.6, 0.4, lbEnv(p, 0, 0.1, 0.85, 1));
      G.gz += 0.45 * lbEnv(p, 0, 0.1, 0.85, 1);
      G.gpy += 0.03 * slap;
      G.gpz -= 0.04 * rack;
      G.hp += 0.3 * lbEnv(p, 0, 0.1, 0.8, 1);
    }
    // con miedo y avanzando, el cañón va donde va la vista
    if (fear && u.moving && !tgt && m.lbLook) G.gy += m.lbLook.hy * 0.35;
    // al terminar de recargar, un golpe seco al cargador
    if (u.reloading && !u.rpg) {
      const r = clamp(u.reloadT / (u.reloadDur || 1), 0, 1);
      G.gpy += 0.025 * lbBell(r, 0.72, 0.03);
    }
  }
  if (u.team === 'civ' && u.state) civFlee(u, m, G, dt);
}
