/* ====================================================================================================
 * units/death-physics.js
 *
 * Caídas con física: cuando alguien muere (o cae herido) el cuerpo no se tumba con una pose fija, cae.
 *  · deathStyle(): al recibir el disparo decide cómo cae según de dónde viene la bala, si iba corriendo y cómo estaba
 *    (de pie, agachado, tumbado). Son 8 estilos y cada uno acaba en una postura distinta, sorteada.
 *  · fallSim(): el cuerpo es una barra que pivota sobre los pies (o las rodillas, si se le doblan antes) con gravedad real;
 *    choca contra el suelo, rebota un poco y se asienta. Brazos, piernas y cabeza siguen con su propia inercia: se abren
 *    al caer y dan un latigazo con el golpe.
 *  · gunSim(): el arma se suelta de las manos y es un sólido rígido: sale despedida, gira, rebota y se queda tumbada de lado.
 *  · tropiezos: el que corre puede tropezar de verdad: se va de bruces, para la caída con las manos y se levanta.
 * Todo es para soldados, milicianos y civiles: usan el mismo esqueleto.
 * ================================================================================================== */

const FALL_G = 9.8 / 1.5; // la gravedad en unidades del mapa (1 unidad = 1,5 m)
const DEATH_STYLES = {
  // dir: 1 de bruces, -1 de espaldas · w0: el empujón inicial (rad/s) · col: lo que tardan en doblarse las rodillas · tw: giro del cuerpo
  back: { dir: -1, w0: [1.5, 2.4], col: 0.14, tw: 0.5, var: 1 }, // de frente: el impacto lo echa hacia atrás
  fwd: { dir: 1, w0: [1.0, 1.7], col: 0.16, tw: 0.5, var: 1 }, // por la espalda: se va de bruces
  run: { dir: 1, w0: [1.4, 2.2], col: 0.1, tw: 0.4, var: 1 }, // corriendo: la inercia lo lanza hacia delante y resbala
  crumple: { dir: 1, w0: [0.15, 0.4], col: 0.55, tw: 0.9, var: 2 }, // se le doblan las piernas y se desploma sobre sí mismo
  drop: { dir: 0, w0: [0.2, 0.5], col: 0.2, tw: 0.6, var: 2 }, // en seco, como un saco
  spin: { dir: 0, w0: [0.8, 1.3], col: 0.18, tw: 1.6, var: 1 }, // de lado: gira sobre sí mismo al caer
  kneel: { dir: 0, w0: [0.5, 1.0], col: 0.1, tw: 0.7, var: 2 }, // agachado: cae de lado desde la rodilla
  prone: { dir: 1, w0: [0, 0], col: 0.05, tw: 0.2, var: 1 } // tumbado: solo se queda quieto
};
// al morir: cómo va a caer
function deathStyle(u, src) {
  const sp = u.m ? u.m.spd || 0 : 0;
  let rel = rnd() * 6.283 - 3.14; // de dónde viene la bala, respecto a hacia dónde mira (0 = de frente)
  if (src && src.x != null) {
    rel = Math.atan2(src.x - u.x, src.z - u.z) - (u.face || 0);
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  }
  const front = Math.abs(rel) < 1.1,
    back = Math.abs(rel) > 2.1,
    r = rnd();
  let k;
  if (u.stance === 'prone') k = 'prone';
  else if (sp > 1.3) k = r < 0.8 ? 'run' : 'crumple';
  else if (u.stance === 'crouch') k = r < 0.6 ? 'kneel' : r < 0.85 ? 'crumple' : 'drop';
  else if (front) k = r < 0.42 ? 'back' : r < 0.68 ? 'crumple' : r < 0.84 ? 'drop' : 'spin';
  else if (back) k = r < 0.6 ? 'fwd' : r < 0.85 ? 'crumple' : 'drop';
  else k = r < 0.5 ? 'spin' : r < 0.75 ? 'crumple' : r < 0.9 ? 'back' : 'drop';
  if (u.down && (k === 'fwd' || k === 'run')) k = r < 0.5 ? 'crumple' : 'back'; // los nuestros caídos quedan boca arriba para poder atenderlos
  const S = DEATH_STYLES[k],
    side = rel >= 0 ? -1 : 1; // gira alejándose de la bala
  u.dType = k;
  u.deadDir = u.down ? -1 : S.dir || (rnd() < 0.5 ? 1 : -1);
  // los que se desploman sobre sí mismos acaban a menudo de lado y encogidos (giro de ~80º); el resto, boca arriba o boca abajo
  const curl = S.var === 2 && !u.down && rnd() < 0.7;
  u.deadVar = curl ? 2 : 1;
  u.deadTwist = curl
    ? (rnd() < 0.5 ? -1 : 1) * rr(1.2, 1.45)
    : (k === 'spin' ? side * rr(0.6, 0.95) : rr(-1, 1) * Math.min(0.6, S.tw)) * (u.down ? 0.4 : 1);
  u.collT = S.col * rr(0.85, 1.2);
  u.fallW0 = rr(S.w0[0], S.w0[1]);
  u.fallSlide = k === 'run' ? sp * rr(0.35, 0.55) : k === 'fwd' ? rr(0, 0.25) : 0;
  u.fallSeed = rnd() * 1000;
}
// la postura final de cada muerto: la de su estilo con brazos y piernas sorteados, para que no haya dos iguales.
// Lo que se sortea depende de cómo ha quedado: boca abajo, boca arriba o de lado; nada puede quedar metido en el suelo
function deadPoseOf(u, m, pn) {
  if (m.deadP && m.deadPn === pn) return m.deadP;
  const P = Object.assign({}, flatPose[pn]),
    side = pn === 'dead2' || Math.abs(u.deadTwist || 0) > 1.0, // de lado, encogido
    down = !side && (u.deadDir || 1) > 0; // boca abajo
  const arm = (s, k) => {
    // s: 'l' o 'r'; los brazos caen pegados al cuerpo, abiertos o por encima de la cabeza, apoyados en el suelo
    const sg = s === 'l' ? 1 : -1,
      r = rnd();
    if (side) {
      P[s + 'ua0'] = rr(-1.6, -0.4);
      P[s + 'ua2'] = sg * rr(-0.2, 0.5);
      P[s + 'fa'] = rr(-1.6, -0.3);
    } else if (r < 0.35) {
      P[s + 'ua0'] = rr(-0.15, 0.25);
      P[s + 'ua2'] = sg * rr(0.1, 0.45);
      P[s + 'fa'] = rr(-0.5, -0.05);
    } else if (r < 0.75) {
      P[s + 'ua0'] = rr(-0.3, 0.1);
      P[s + 'ua2'] = sg * rr(0.9, 1.5);
      P[s + 'fa'] = rr(-1.2, -0.1);
    } else {
      P[s + 'ua0'] = rr(-3.1, -2.6);
      P[s + 'ua2'] = sg * rr(-0.1, 0.4);
      P[s + 'fa'] = rr(-0.9, -0.1);
    }
    P[s + 'wr'] = rr(-0.3, 0.7);
  };
  arm('l');
  arm('r');
  const leg = s => {
    const sg = s === 'l' ? 1 : -1,
      bent = rnd() < (side ? 0.8 : 0.3);
    if (side) {
      P[s + 'th0'] = rr(-1.3, -0.3);
      P[s + 'sh'] = rr(0.5, 1.6);
    } else if (down) {
      P[s + 'th0'] = rr(-0.12, 0.25); // boca abajo la cadera no se dobla hacia el suelo
      P[s + 'sh'] = bent ? rr(0.6, 1.4) : rr(0, 0.25);
    } else {
      P[s + 'th0'] = bent ? rr(-0.9, -0.4) : rr(-0.15, 0.05);
      P[s + 'sh'] = bent ? rr(0.8, 1.5) : rr(0, 0.2);
    }
    P[s + 'th1'] = sg * rr(0, 0.35);
    P[s + 'ft'] = rr(0.3, 0.9);
  };
  leg('l');
  leg('r');
  P.head = rr(-0.1, 0.5);
  P.tor = side ? rr(0.1, 0.45) : rr(-0.08, 0.12);
  m.deadP = P;
  m.deadPn = pn;
  return P;
}
// la caída: una barra rígida que pivota sobre los pies con gravedad, rebote contra el suelo y extremidades que van por detrás
function fallSim(u, m, c, dt) {
  if (u.alive) {
    m.fall = null;
    m.deadP = null;
    return;
  }
  if (u.carriedBy || u.dummy) return;
  let F = m.fall;
  if (!F) {
    // un muerto que ya estaba tumbado (o de hace rato, al cargar una partida): no hay nada que simular
    if (c.lie > 0.6 || u.deathT == null || G.t - u.deathT > 2.5) {
      m.fall = { done: true, sx: 0 };
      return;
    }
    F = m.fall = {
      th: (c.lie * Math.PI) / 2,
      w: 0,
      t: 0,
      hits: 0,
      kicked: false,
      sx: 0,
      sv: u.fallSlide || 0,
      done: false,
      del: u.collT || 0.16,
      dust: false
    };
  }
  if (F.done) {
    F.sv *= Math.exp(-8 * dt);
    F.sx += F.sv * dt;
    return;
  }
  const n = Math.ceil(Math.min(dt, 0.2) / 0.008),
    h = Math.min(dt, 0.2) / n,
    v = m.v,
    ld = u.deadDir || 1;
  for (let i = 0; i < n; i++) {
    F.t += h;
    if (!F.kicked && F.t >= F.del * 0.4) {
      F.kicked = true;
      F.w += u.fallW0 || 1;
    }
    // con las rodillas dobladas el centro de masas está más bajo: cae antes (gravedad efectiva mayor)
    const knees = F.t < F.del ? 0.45 : 1,
      g = ((3 * FALL_G) / (2 * 1.15)) * knees;
    F.w += g * Math.sin(F.th + 0.12) * h;
    F.w *= Math.exp(-0.25 * h);
    F.th += F.w * h;
    // los brazos se abren y suben con la caída, la cabeza se queda atrás
    const aw = Math.abs(F.w);
    v.lua0 -= aw * 3.5 * h;
    v.rua0 -= aw * 3.5 * h;
    v.lua2 += aw * 3.5 * h;
    v.rua2 -= aw * 3.5 * h;
    v.head -= F.w * 3 * h;
    F.sx += F.sv * h;
    F.sv *= Math.exp(-(F.hits ? 7 : 0.8) * h);
    if (F.th >= Math.PI / 2) {
      F.th = Math.PI / 2;
      const imp = clamp(F.w / 4, 0, 1);
      if (F.w > 0.7 && F.hits < 2) {
        // el golpe contra el suelo: rebota un poco y cada miembro da un latigazo
        F.hits++;
        F.w = -F.w * (F.hits === 1 ? 0.2 : 0.1);
        const kick = (k, a) => {
          if (v[k] != null) v[k] += rr(-a, a) * imp;
        };
        ['lua0', 'rua0', 'lua2', 'rua2'].forEach(k => kick(k, 9));
        ['lfa', 'rfa'].forEach(k => kick(k, 10));
        ['lth0', 'rth0', 'lsh', 'rsh'].forEach(k => kick(k, 6));
        v.head += (2 + rr(0, 5)) * imp * ld;
        v.tor += rr(-3, 3) * imp;
        if (!F.dust && u.m && u.m.root.visible !== false) {
          F.dust = true;
          const yaw = m.root.rotation.y,
            dd = 0.75 * ld;
          puff(u.x + Math.sin(yaw) * dd, (u.elev || 0) + 0.12, u.z + Math.cos(yaw) * dd, 0xb39b78, 3 + Math.round(imp * 4));
        }
      } else {
        F.w = 0;
        F.done = true;
        break;
      }
    }
    if (F.th < 0) {
      F.th = 0;
      F.w = Math.max(0, F.w);
    }
  }
  c.lie = F.th / (Math.PI / 2);
  v.lie = 0;
}
/* El arma: un sólido rígido (un palo de 0,6 unidades con el pivote en la empuñadura). Sale de las manos con la velocidad del cuerpo
   y un empujón propio, gira, choca con el suelo perdiendo energía y, cuando ya casi no se mueve, se acuesta de lado. Después se queda
   quieta en el mundo; cada fotograma se recoloca en el marco del pecho porque el arma cuelga del pecho en el esqueleto. */
const _gsM = new T.Matrix4(),
  _gsI = new T.Matrix4(),
  _gsQ = new T.Quaternion(),
  _gsD = new T.Quaternion(),
  _gsE = new T.Euler(),
  _gsS = new T.Vector3(),
  _gsA = new T.Vector3(),
  _gsB = new T.Vector3(),
  _gsX = new T.Vector3(),
  _gsZ = new T.Vector3(0, 0, 1),
  _gsP = new T.Vector3();
const GUN_ENDS = [0.44, -0.2]; // la boca del cañón y la culata, a lo largo del eje del arma
function gunFlat(G_) {
  // tumbada de lado: el cañón horizontal hacia donde apuntaba, apoyada sobre el costado más cercano al suelo
  _gsA.copy(_gsZ).applyQuaternion(G_.q);
  const yaw = Math.atan2(_gsA.x, _gsA.z);
  _gsX.set(1, 0, 0).applyQuaternion(G_.q);
  return new T.Quaternion().setFromEuler(_gsE.set(0, yaw, _gsX.y >= 0 ? Math.PI / 2 : -Math.PI / 2, 'YXZ'));
}
function groundGun(u, m, c, dt) {
  if (u.alive) {
    u.gunG = null;
    return;
  }
  if (u.carriedBy || u.dummy || !m.gun || !m.chest || !m.root || m.noGun) return;
  dt = dt || 0;
  if (!u.gunG) {
    m.root.updateMatrixWorld(true);
    m.root.getWorldPosition(_gsP);
    const fresh = u.deathT != null && G.t - u.deathT < 1.5 && c.lie < 0.6;
    const G_ = (u.gunG = { p: new T.Vector3(), q: new T.Quaternion(), v: new T.Vector3(), w: new T.Vector3(), floor: _gsP.y + 0.035, rest: !fresh, low: 0, fq: null, ft: 0 });
    if (fresh) {
      m.gun.matrixWorld.decompose(G_.p, G_.q, _gsS);
      const yaw = m.root.rotation.y,
        sd = rnd() < 0.5 ? 1 : -1,
        fw = (u.deadDir || 1) * rr(0.1, 0.7) + (u.fallSlide || 0) * 1.5,
        sw = sd * rr(0.4, 1.3);
      G_.v.set(Math.sin(yaw) * fw + Math.cos(yaw) * sw, rr(0.4, 1.4), Math.cos(yaw) * fw - Math.sin(yaw) * sw);
      G_.w.set(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize().multiplyScalar(rr(3, 9));
    } else {
      // sin caída que ver (cargado de una partida o caído hace rato): directamente en el suelo a su lado
      const yaw = m.root.rotation.y,
        sd = (u.dnSeed || 1) % 2 < 1 ? 1 : -1;
      G_.p.set(_gsP.x + Math.cos(yaw) * 0.55 * sd - Math.sin(yaw) * 0.25, G_.floor, _gsP.z - Math.sin(yaw) * 0.55 * sd - Math.cos(yaw) * 0.25);
      G_.q.setFromEuler(_gsE.set(0, yaw + 1.1 * sd, Math.PI / 2, 'YXZ'));
    }
  }
  const G_ = u.gunG;
  if (!G_.rest && dt > 0) {
    const n = Math.ceil(Math.min(dt, 0.2) / 0.008),
      h = Math.min(dt, 0.2) / n;
    for (let i = 0; i < n; i++) {
      G_.v.y -= FALL_G * h;
      G_.p.addScaledVector(G_.v, h);
      const wl = G_.w.length();
      if (wl > 1e-4) {
        _gsD.setFromAxisAngle(_gsA.copy(G_.w).divideScalar(wl), wl * h);
        G_.q.premultiply(_gsD).normalize();
      }
      // el punto más bajo del arma: la boca, la culata o la empuñadura
      _gsA.copy(_gsZ).applyQuaternion(G_.q);
      let low = G_.p.y,
        lx = 0;
      for (const e of GUN_ENDS) {
        const y = G_.p.y + _gsA.y * e;
        if (y < low) {
          low = y;
          lx = e;
        }
      }
      low -= 0.025;
      if (low < G_.floor) {
        G_.p.y += G_.floor - low;
        if (G_.v.y < 0) {
          const vi = -G_.v.y;
          G_.v.y = vi > 0.6 ? vi * 0.28 : 0;
          G_.v.x *= 0.62;
          G_.v.z *= 0.62;
          // el golpe en una punta hace girar el arma sobre ella
          G_.w.multiplyScalar(0.5);
          if (lx) {
            _gsB.crossVectors(_gsA, new T.Vector3(0, 1, 0)).multiplyScalar(-Math.sign(lx) * vi * 1.6);
            G_.w.add(_gsB);
          }
          if (vi > 0.5 && !G_.clk) {
            G_.clk = true;
            puff(G_.p.x, G_.floor + 0.04, G_.p.z, 0xb8a27e, 2);
          }
        } else {
          // deslizándose: rozamiento
          const f = Math.exp(-7 * h);
          G_.v.x *= f;
          G_.v.z *= f;
          G_.w.multiplyScalar(Math.exp(-5 * h));
        }
        G_.low += h;
      } else G_.low = 0;
      if (G_.low > 0.12 && G_.v.length() < 0.35) {
        G_.rest = true;
        G_.fq = gunFlat(G_);
        G_.ft = 0;
        break;
      }
      if (G_.p.y < G_.floor - 2) G_.p.y = G_.floor; // por si se cuela
    }
  }
  if (G_.rest && G_.fq) {
    // se acuesta de lado en un cuarto de segundo
    G_.ft = Math.min(1, G_.ft + dt / 0.25);
    G_.q.slerp(G_.fq, G_.ft);
    G_.p.y += (G_.floor - G_.p.y) * G_.ft;
    if (G_.ft >= 1) G_.fq = null;
  }
  m.chest.updateWorldMatrix(true, false);
  m.chest.getWorldScale(_gsS);
  _gsM.compose(G_.p, G_.q, _gsS);
  _gsI.copy(m.chest.matrixWorld).invert().multiply(_gsM);
  _gsI.decompose(m.gun.position, m.gun.quaternion, _gsS);
}
/* Tropezar de verdad: un pie que se engancha, el cuerpo se va hacia delante, las manos paran la caída, un momento en el suelo
   y se levanta. Mientras, no avanza (solo la inercia de los primeros pasos). */
const TRIP_T = 2.3;
function tripStart(u) {
  if (u.tripT > 0 || !u.alive) return;
  u.tripT = TRIP_T;
  u.tripK = rnd() < 0.5 ? 1 : -1; // hacia qué lado gira un poco al caer
  if (u.team === 'us' && rnd() < 0.5) radio(u, pick(['¡Mierda!', '¡Joder!', 'Estoy bien, estoy bien.']));
}
// cuánto le deja avanzar el tropiezo (1 = normal)
function tripSpeed(u) {
  if (!(u.tripT > 0)) return 1;
  const p = 1 - u.tripT / TRIP_T;
  return p < 0.18 ? 0.55 : p > 0.9 ? 0.5 : 0;
}
// la pose del tropiezo encima de todo lo demás; devuelve cuánto pesa (0 = nada) para soltar la mano del arma
function tripPose(u, m, c, dt) {
  if (!(u.tripT > 0) || !u.alive) {
    m.trB = 0;
    return 0;
  }
  const p = 1 - u.tripT / TRIP_T,
    ss = (a, b, x) => {
      const t = clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
  const reach = ss(0.06, 0.24, p) * (1 - ss(0.6, 0.8, p)), // los brazos estirados para parar la caída
    hit = Math.exp(-Math.pow((p - 0.31) / 0.035, 2)), // el golpe de las manos contra el suelo
    kneel = ss(0.25, 0.4, p) * (1 - ss(0.82, 1, p));
  m.body.rotation.z += u.tripK * 0.15 * reach;
  m.shL.rotation.x = sm(m.shL.rotation.x, -2.4 + hit * 0.5, reach);
  m.shL.rotation.z = sm(m.shL.rotation.z, -0.25, reach);
  m.elL.rotation.x = sm(m.elL.rotation.x, -0.25 - hit * 0.9, reach);
  m.shR.rotation.x = sm(m.shR.rotation.x, -2.1 + hit * 0.5, reach * 0.8);
  m.elR.rotation.x = sm(m.elR.rotation.x, -0.5 - hit * 0.8, reach * 0.8);
  m.hipL.rotation.x = sm(m.hipL.rotation.x, -1.25, kneel);
  m.knL.rotation.x = sm(m.knL.rotation.x, 1.7, kneel);
  m.hipR.rotation.x = sm(m.hipR.rotation.x, -0.7, kneel);
  m.knR.rotation.x = sm(m.knR.rotation.x, 1.2, kneel);
  m.neck.rotation.x -= 0.5 * reach; // la cara arriba, lejos del suelo
  m.head.rotation.x -= 0.4 * reach + hit * 0.2;
  return reach;
}
// cuánto se inclina hacia delante: 0 de pie, 1 tumbado; se queda a cuatro patas (0,72) y vuelve. Va antes que el resto de la pose
function tripLie(u, m, c) {
  if (!(u.tripT > 0) || !u.alive) return;
  const p = 1 - u.tripT / TRIP_T,
    ss = (a, b, x) => {
      const t = clamp((x - a) / (b - a), 0, 1);
      return t * t * (3 - 2 * t);
    };
  c.lie = Math.max(c.lie, 0.22 * ss(0, 0.12, p) + 0.5 * ss(0.12, 0.3, p) - 0.72 * ss(0.62, 0.95, p));
  m.v.lie = 0;
}
