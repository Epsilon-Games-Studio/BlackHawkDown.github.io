/* ====================================================================================================
 * units/swinging-kit.js
 *
 * Equipo que se balancea: una masa puntual en una varilla de largo fijo desde el enganche del que cuelga, tirada por la gravedad y por un muelle
 * hacia su posición de reposo, amortiguada contra el propio movimiento del enganche; así se queda atrás al arrancar, se balancea con la zancada,
 * sale despedida en los giros y se asienta al pararse. No se mete en el cuerpo y tiene un límite de oscilación.
 * ================================================================================================== */

'use strict';

const SW_DOWN = new T.Vector3(0, -1, 0),
  SW_UP = new T.Vector3(0, 1, 0),
  SW_TAIL = new T.Vector3(0, -0.97, -0.24).normalize(),
  SW_ANT = new T.Vector3(0, 0.989, -0.149);
const _swP = new T.Vector3(),
  _swS = new T.Vector3(),
  _swQ = new T.Quaternion(),
  _swQi = new T.Quaternion(),
  _swA = new T.Vector3(),
  _swB = new T.Vector3(),
  _swD = new T.Vector3(),
  _swV = new T.Vector3(),
  _swR = new T.Quaternion(),
  _swR0 = new T.Quaternion(),
  _swI = new T.Quaternion(),
  _swId = new T.Quaternion();
function swingRig(m, dt, lie) {
  if (!m.sw || !m.sw.length || !(dt > 0)) return;
  const e = m.root.matrixWorld.elements,
    far = Math.hypot(e[12] - camS.tx, e[14] - camS.tz) > halfH() * 2.6 + 6;
  if (far || SOLDIER_LV > 1) return;
  m.chest.updateWorldMatrix(true, false);
  m.neck.updateWorldMatrix(false, false);
  m.gun.updateWorldMatrix(false, false);
  const g0 = 9.8 * (1 - lie * 0.85);
  for (const s of m.sw) {
    const par = s.b.parent;
    par.matrixWorld.decompose(_swP, _swQ, _swS);
    if (_swS.x < 0.01) continue; // el fusil está guardado
    const piv = _swA.copy(s.b.position).applyMatrix4(par.matrixWorld),
      restW = _swB.copy(s.rest).applyQuaternion(_swQ);
    // el balanceo se sigue respecto al enganche: lo mueve la aceleración del enganche (suavizada y escalada según lo
    // suelta que cuelgue la pieza), la gravedad, un muelle que la devuelve al reposo y la amortiguación
    if (!s.r || s.pv.distanceToSquared(piv) > 2.25) {
      s.r = (s.r || new T.Vector3()).copy(restW).multiplyScalar(s.L);
      s.rv = (s.rv || new T.Vector3()).set(0, 0, 0);
      s.pv = (s.pv || new T.Vector3()).copy(piv);
      s.vp = (s.vp || new T.Vector3()).set(0, 0, 0);
      s.ap = (s.ap || new T.Vector3()).set(0, 0, 0);
      s.fresh = 2;
    }
    _swV.copy(piv).sub(s.pv).divideScalar(dt);
    s.pv.copy(piv);
    if (s.fresh > 0) {
      s.fresh--;
      s.vp.copy(_swV);
    }
    _swS.copy(_swV).sub(s.vp).divideScalar(dt);
    s.vp.copy(_swV);
    const al = _swS.length();
    if (al > 28) _swS.multiplyScalar(28 / al);
    s.ap.lerp(_swS, 1 - Math.exp(-dt * 22));
    const n = dt > 1 / 45 ? 3 : dt > 1 / 90 ? 2 : 1,
      h = Math.min(dt, 0.06) / n,
      g = g0 * (s.gs == null ? 1 : s.gs),
      fi = s.in == null ? 1 : s.in;
    for (let k = 0; k < n; k++) {
      s.rv.x += (s.k * (restW.x * s.L - s.r.x) - s.c * s.rv.x - s.ap.x * fi) * h;
      s.rv.y += (s.k * (restW.y * s.L - s.r.y) - s.c * s.rv.y - s.ap.y * fi - g) * h;
      s.rv.z += (s.k * (restW.z * s.L - s.r.z) - s.c * s.rv.z - s.ap.z * fi) * h;
      s.r.addScaledVector(s.rv, h);
      const l = s.r.length() || 1e-5;
      s.r.multiplyScalar(s.L / l);
      _swD.copy(s.r).multiplyScalar(1 / s.L);
      s.rv.addScaledVector(_swD, -s.rv.dot(_swD));
    }
    // al marco de la articulación de la que cuelga; no puede meterse en el cuerpo ni ir más lejos de lo que deja la correa
    _swQi.copy(_swQ).invert();
    _swD.copy(s.r).normalize().applyQuaternion(_swQi);
    if (s.zMax != null && _swD.z > s.zMax) _swD.z = s.zMax;
    if (s.xMin != null && _swD.x < s.xMin) _swD.x = s.xMin;
    _swD.normalize();
    const a = s.rest.angleTo(_swD);
    if (a > 1e-4) {
      const a2 = s.lim * Math.tanh(a / s.lim);
      if (a2 < a - 1e-4) {
        _swR.setFromUnitVectors(s.rest, _swD);
        _swI.copy(_swId).slerp(_swR, a2 / a);
        _swD.copy(s.rest).applyQuaternion(_swI);
      }
    }
    if (!s.b2) {
      s.b.quaternion.setFromUnitVectors(s.axis, _swD);
      continue;
    }
    // la antena se dobla a lo largo: la mitad de abajo se lleva algo más de la mitad del balanceo y la de arriba el resto
    _swR0.setFromUnitVectors(s.axis, s.rest);
    _swR.setFromUnitVectors(s.rest, _swD);
    _swI.copy(_swId).slerp(_swR, 0.58);
    s.b.quaternion.copy(_swI).multiply(_swR0);
    s.b2.quaternion.copy(_swId).slerp(_swR, 0.5);
  }
}
function animRig(u, dt) {
  const m = u.m;
  if (!m.c) initAnim(m);
  const c = m.c,
    v = m.v,
    P = flatPose[poseFor(u)];
  const K = u.alive ? 115 : 60,
    D = 2 * (u.alive ? 0.86 : 1) * Math.sqrt(K);
  const steps = dt > 1 / 45 ? 2 : 1,
    h = Math.min(dt, 0.05) / steps;
  for (let s = 0; s < steps; s++)
    for (const k of PKEYS) {
      const a = K * (P[k] - c[k]) - D * v[k];
      v[k] += a * h;
      c[k] += v[k] * h;
    }
  c.lie = clamp(c.lie, 0, 1);
  const ek = 1 - Math.exp(-8 * dt);
  // girar sobre el sitio hace que los pies se arrastren
  const yaw = m.root.rotation.y;
  if (m.prevYaw == null) m.prevYaw = yaw;
  let dy = yaw - m.prevYaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  m.prevYaw = yaw;
  m.turnW = sm(m.turnW, dt > 0 ? clamp(Math.abs(dy) / dt / 3, 0, 1) : 0, ek);
  const spRaw = Math.hypot(u.vx || 0, u.vz || 0),
    spPrev = m.spd;
  m.spd += (spRaw - m.spd) * (1 - Math.exp(-10 * dt));
  const sp = u.alive ? m.spd : 0;
  const turnRate = dt > 0 ? dy / dt : 0;
  m.bank = sm(m.bank || 0, u.alive ? clamp(-turnRate * sp * 0.075, -0.24, 0.24) : 0, 1 - Math.exp(-6 * dt)); // inclinándose en la curva
  m.accL = sm(
    m.accL || 0,
    u.alive && dt > 0 ? clamp(((m.spd - spPrev) / dt) * 0.06, -0.18, 0.2) : 0,
    1 - Math.exp(-5 * dt)
  ); // arrancando / frenando
  m.fat = clamp((m.fat || 0) + dt * (sp > 1.6 ? 0.12 : -0.045), 0, 1); // sin aliento después de correr
  m.cm = sm(m.cm, u.alive && u.moving && (u.sup > 25 || u.pinned || u.sneak) ? 1 : 0, ek);
  m.limp = sm(m.limp, u.alive && u.hp < u.hp0 * 0.5 ? 1 : 0, ek);
  const wWalk = clamp(sp / 0.9, 0, 1),
    wTurn = (1 - wWalk) * m.turnW * 0.45;
  const w = Math.max(wWalk, wTurn) * (1 - c.lie),
    run = clamp((sp - 1.4) / 1.0, 0, 1) * (1 - m.cm * 0.6);
  // la dirección de la marcha en el marco del cuerpo (izquierda +x, delante +z) y el paso: más largo cuanto más rápido, más corto de lado, agachado o cojeando
  const KS = m.body.scale.x || 1,
    spB = sp / KS;
  {
    const vx = u.vx || 0,
      vz = u.vz || 0,
      q = Math.hypot(vx, vz),
      cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      kd = 1 - Math.exp(-10 * dt);
    if (q > 0.05) {
      m.gdx = sm(m.gdx || 0, (vx * cy - vz * sy) / q, kd);
      m.gdz = sm(m.gdz == null ? 1 : m.gdz, (vx * sy + vz * cy) / q, kd);
    } else if (m.gdz == null) {
      m.gdx = 0;
      m.gdz = 1;
    }
  }
  const side_ = Math.abs(m.gdx || 0),
    back_ = Math.max(0, -(m.gdz == null ? 1 : m.gdz));
  m.stepLen =
    clamp(0.33 + 0.2 * spB, 0.26, 0.92) *
    clamp(m.gA || 1, 0.9, 1.12) *
    (1 - 0.22 * m.cm) *
    (1 - 0.2 * m.limp) *
    (1 - 0.5 * side_) *
    (1 - 0.35 * back_);
  m.phase += dt * ((Math.PI * spB) / m.stepLen + m.turnW * 5 * (1 - wWalk));
  // hasta dónde se puede quedar atrás un pie apoyado antes de que la pierna no dé más: eso marca cuánto está apoyado cada pie (el resto es vuelo)
  legInit(m);
  const Lr = (m.lgL1 + m.lgL2) * 0.997,
    dropG = 0.04 + 0.035 * run + 0.03 * side_,
    offG = 0.07 + 0.04 * run;
  const hLow = m.lgL1 + m.lgL2 - dropG - Math.abs(0.016 - 0.05 * run) * (m.gB || 1) - m.cm * 0.09;
  const aMax = Math.max(
    0.05,
    Math.min(
      Math.sqrt(Math.max(1e-4, Lr * Lr - hLow * hLow)) + 0.04,
      Math.sqrt(Math.max(1e-4, Lr * Lr - (hLow - offG) * (hLow - offG))) - 0.04
    )
  );
  const duty = Math.min(0.64 - 0.26 * run, aMax / m.stepLen),
    fL = (((m.phase / (2 * Math.PI) + 0.25) % 1) + 1) % 1; // el pie izquierdo apoya en fL = 0 y se queda en el suelo durante 'duty'
  m.gOff = offG;
  const wLeg = Math.max(clamp(sp / 0.3, 0, 1), wTurn) * (1 - c.lie) * (u.alive ? 1 : 0);
  m.recoil = Math.max(0, m.recoil - dt * 9);
  m.hit = Math.max(0, (m.hit || 0) - dt * 4.5);
  m.breathe += dt * (1.5 + clamp(u.sup / 60, 0, 1.5) + m.fat * 1.8);
  m.idle += dt;
  const ph = m.phase,
    sL = Math.sin(ph),
    sR = Math.sin(ph + Math.PI);
  const still = (1 - w) * (u.alive ? 1 : 0) * (1 - c.lie);
  const br = Math.sin(m.breathe) * (0.018 + m.fat * 0.03) * (u.alive ? 1 : 0) * (1 - c.lie * 0.5);
  // guiñada de apuntado: la parte de arriba sigue al objetivo sin depender de las piernas
  let want = 0;
  const tgt =
    u.order && u.order.type === 'attack' && u.order.target.alive
      ? u.order.target
      : u.auto && u.auto.alive
        ? u.auto
        : null;
  const busy = u.reloading || u.firing > 0 || !!tgt || u.healing || !!u.pist;
  // capas encima de la pose: un respingo cuando caen balas cerca, un traspié, saltar un murete, asomarse por una esquina, la pistola
  u.flinchT = Math.max(0, (u.flinchT || 0) - dt);
  m.flB = sm(m.flB || 0, u.alive && u.flinchT > 0 && c.lie < 0.3 ? 1 : 0, 1 - Math.exp(-(u.flinchT > 0 ? 22 : 7) * dt));
  const stum = u.alive && u.stumT > 0 ? Math.sin(Math.PI * clamp(1 - u.stumT / 0.8, 0, 1)) : 0;
  let V_ = 0;
  if (u.vault) {
    const q = u.vault,
      sv = (u.x - q.cx) * q.dx + (u.z - q.cz) * q.dz;
    q.t = (q.t || 0) + dt;
    if (sv > 0.95 || q.t > 2.2 || !u.alive) {
      u.vault = null;
      if (u.alive) u.landT = Math.max(u.landT || 0, 0.42);
    } else {
      m.vP = clamp((sv + 0.95) / 1.9, 0, 1);
      V_ = Math.pow(Math.sin(Math.PI * m.vP), 0.8);
    }
  }
  m.vB = sm(m.vB || 0, V_, 1 - Math.exp(-14 * dt));
  const vB = m.vB;
  const vwin = c0 => {
    const q = clamp(1 - Math.abs((m.vP || 0) - c0) / 0.42, 0, 1);
    return q * q * (3 - 2 * q);
  };
  m.vL = sm(m.vL || 0, V_ > 0 ? vwin(0.36) : 0, 1 - Math.exp(-16 * dt));
  m.vR = sm(m.vR || 0, V_ > 0 ? vwin(0.62) : 0, 1 - Math.exp(-16 * dt));
  u.peekT = Math.max(0, (u.peekT || 0) - dt);
  {
    const tp = u.alive && u.peekT > 0 && c.lie < 0.3 ? u.peekS || 1 : 0,
      hh = Math.min(dt, 0.04);
    m.pkV = (m.pkV || 0) + (70 * (tp - (m.pkB || 0)) - 13 * (m.pkV || 0)) * hh;
    m.pkB = (m.pkB || 0) + m.pkV * hh;
    m.pkH = sm(m.pkH || 0, tp, 1 - Math.exp(-11 * dt));
  }
  const pisT =
    u.alive && u.pist
      ? u.pist.st === 0
        ? clamp(u.pist.t / 0.5, 0, 1)
        : u.pist.st === 1
          ? 1
          : 1 - clamp(u.pist.t / 0.45, 0, 1)
      : 0;
  m.pisB = sm(m.pisB || 0, pisT, 1 - Math.exp(-12 * dt));
  const pis = m.pisB,
    pisA = clamp((pis - 0.45) / 0.55, 0, 1);
  u.giveT = Math.max(0, (u.giveT || 0) - dt);
  u.tapT = Math.max(0, (u.tapT || 0) - dt);
  m.gvB = sm(m.gvB || 0, u.alive && u.giveT > 0 ? 1 : 0, 1 - Math.exp(-8 * dt));
  m.tpB = sm(m.tpB || 0, u.alive && u.tapT > 0 ? 1 : 0, 1 - Math.exp(-9 * dt));
  if (u.alive && tgt && !u.reloading) {
    let d = Math.atan2(tgt.x - u.x, tgt.z - u.z) - yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) > 2.3 && m.tyaw * d < 0) d = Math.sign(m.tyaw || 1) * 2.3; // un objetivo justo detrás: sigue girando hacia donde ya iba, nunca da un latigazo al otro lado
    want = clamp(d, -1.1, 1.1);
  } else if (still > 0.5 && u.alive) want = Math.sin(m.idle * 0.35 + m.phase) * 0.3 * still;
  // el giro del tronco hacia el objetivo: en pasos pequeños, para que un salto grande de frame (las unidades lejanas o fuera de pantalla se animan menos) no haga explotar el muelle
  {
    const n = Math.ceil(Math.min(dt, 0.25) / 0.02),
      h = Math.min(dt, 0.25) / n;
    for (let k = 0; k < n; k++) {
      m.tyawV += (60 * (want - m.tyaw) - 14 * m.tyawV) * h;
      m.tyaw += m.tyawV * h;
    }
    if (!isFinite(m.tyaw) || !isFinite(m.tyawV)) {
      m.tyaw = 0;
      m.tyawV = 0;
    }
    m.tyaw = clamp(m.tyaw, -1.3, 1.3);
    m.tyawV = clamp(m.tyawV, -12, 12);
  }
  // gestos en reposo
  if (u.alive && still > 0.8 && !busy && !u.moving && c.lie < 0.1) {
    if (!m.fid) {
      m.fidT -= dt;
      if (m.fidT <= 0) {
        m.fid = { k: pick(FIDGETS), t: 0, d: rr(1.6, 2.8), dir: rnd() < 0.5 ? -1 : 1 };
        m.fidT = rr(5, 11);
      }
    }
  } else if (m.fid && (busy || u.moving)) m.fid = null;
  let fk = '',
    fs = 0,
    fdir = 1;
  if (m.fid) {
    m.fid.t += dt;
    fk = m.fid.k;
    fdir = m.fid.dir;
    fs = Math.sin(Math.PI * clamp(m.fid.t / m.fid.d, 0, 1));
    fs = fs * fs * (3 - 2 * fs);
    if (m.fid.t >= m.fid.d) m.fid = null;
  }
  u.talkT = Math.max(0, (u.talkT || 0) - dt);
  u.chatT = Math.max(0, (u.chatT || 0) - dt);
  u.listenT = Math.max(0, (u.listenT || 0) - dt);
  u.glanceT = Math.max(0, (u.glanceT || 0) - dt);
  m.glB = sm(m.glB || 0, u.alive && u.glanceT > 0 && !busy ? 1 : 0, 1 - Math.exp(-5 * dt));
  let glY = 0;
  if (m.glB > 0.01 && u.glanceA != null) {
    glY = u.glanceA - yaw;
    glY = clamp(Math.atan2(Math.sin(glY), Math.cos(glY)), -1.5, 1.5) * m.glB;
  }
  m.lsB = sm(m.lsB || 0, u.alive && u.listenT > 0 && !busy ? 1 : 0, 1 - Math.exp(-6 * dt));
  m.talkB = sm(
    m.talkB,
    u.alive && u.talkT > 0 && !u.reloading && u.firing <= 0 && c.lie < 0.3 ? 1 : 0,
    1 - Math.exp(-7 * dt)
  );
  m.healB = sm(m.healB, u.healing ? 1 : 0, ek);
  // cuerpo: tumbado, torsión de muerto, tambaleo por impacto
  const ld = !u.alive && u.deadDir ? u.deadDir : 1;
  m.body.rotation.x = ((c.lie * Math.PI) / 2) * ld;
  m.body.rotation.y = !u.alive ? c.lie * (u.deadTwist || 0) : 0;
  m.body.rotation.z = u.alive ? m.bank * (1 - c.lie) : 0;
  m.body.position.set(
    m.hit * 0.05 * m.hitSide * (u.alive ? 1 : 0) + m.pkB * 0.12,
    c.lie * 0.13 + vB * 0.6 - stum * 0.1 - m.flB * 0.07,
    -c.lie * 0.5 * ld
  );
  m.body.rotation.z += -m.pkB * 0.06 + vB * 0.4;
  m.body.rotation.x += vB * 0.3;
  m.body.rotation.y += -vB * 0.3;
  const bounce = (0.028 + 0.045 * run) * wWalk * (1 - c.lie) * (m.gB || 1);
  const limpDip = m.limp * wWalk * Math.max(0, Math.sin(ph)) * 0.03;
  m.pelvis.position.y =
    (m.model ? c.py + (m.py0 - 0.52) * clamp((c.py - 0.14) / 0.38, 0, 1) : c.py) -
    wLeg * dropG +
    wLeg * (0.016 - 0.05 * run) * (m.gB || 1) * Math.cos(4 * Math.PI * (fL - duty / 2)) +
    Math.sin(m.idle * 0.5) * 0.006 * still -
    m.cm * 0.09 * (1 - c.lie) -
    limpDip -
    Math.abs(m.pkB) * 0.025;
  m.pelvis.position.x = wLeg * (0.02 - 0.012 * run) * Math.cos(2 * Math.PI * (fL - duty / 2));
  m.pelvis.rotation.set(
    0,
    w * sL * (0.1 + 0.06 * run) * (1 + (m.gS || 0) * 0.6),
    w * Math.cos(ph) * 0.045 * (1 + (m.gS || 0)) +
      Math.sin(m.idle * 0.45) * 0.02 * still +
      (fk === 'shift' ? fs * 0.07 * fdir : 0) +
      m.limp * 0.05 * wWalk
  );
  const lean =
    (0.08 + 0.22 * run + 0.3 * m.cm + (m.gL || 0) * run) * wWalk + m.limp * 0.06 * wWalk + stum * 0.75 + m.flB * 0.3;
  const tor =
    c.tor +
    lean +
    m.accL * (1 - c.lie) -
    m.recoil * 0.14 +
    br -
    m.hit * 0.32 -
    (m.wallB || 0) * 0.14 +
    (fk === 'stretch' ? -0.16 * fs : 0) +
    (fk === 'check' ? 0.08 * fs : 0);
  const twist = -m.pelvis.rotation.y * 1.1 + m.tyaw * 0.85;
  const strike = wLeg * run * 0.035 * Math.cos(4 * Math.PI * (fL - duty / 2)); // el tronco cede un poco cada vez que apoya un pie
  m.abd.rotation.set(
    tor * 0.4 - strike,
    twist * 0.4,
    -m.pelvis.rotation.z * 0.4 + m.hit * m.hitSide * 0.12 - m.pkB * 0.13
  );
  m.chest.rotation.set(
    tor * 0.6 - strike * 0.6,
    twist * 0.6,
    -m.pelvis.rotation.z * 0.4 + m.hit * m.hitSide * 0.15 - m.pkB * 0.15 + w * run * sL * 0.035
  );
  const lookYaw =
    m.tyaw * 0.25 -
    m.bank * 1.6 +
    (m.pkH || 0) * 0.95 +
    (m.wallB || 0) * (u.wallLook || 0.9) +
    Math.sin(m.idle * 0.6 + 1) * 0.12 * still +
    (fk === 'look' ? fdir * 0.85 * fs : 0) +
    glY;
  const headP =
    c.head -
    lean * 0.7 -
    br * 0.5 +
    (u.reloading ? 0.3 : 0) +
    (fk === 'check' ? 0.35 * fs : 0) +
    (fk === 'vest' ? 0.42 * fs : 0) +
    (fk === 'inspect' ? 0.42 * fs : 0) +
    m.flB * 0.4 +
    stum * 0.25 +
    m.healB * 0.15 +
    m.lsB * Math.sin(m.idle * 3.4) * 0.09;
  m.neck.rotation.set(headP * 0.4, lookYaw * 0.4, 0);
  m.head.rotation.set(
    headP * 0.6 - m.hit * 0.25 + (bounce - Math.abs(Math.cos(ph)) * bounce) * 1.2,
    lookYaw * 0.6,
    m.hit * m.hitSide * 0.25 + m.talkB * 0.12 - m.bank * 0.5
  );
  const gunBob = Math.abs(Math.sin(ph)) * 0.025 * wWalk;
  let lx = c.lua0,
    ly = c.lua1,
    lz = c.lua2,
    lf = c.lfa,
    lw = c.lwr,
    gx = c.gun3,
    gy = c.gun4,
    gz = c.gun5;
  let rx = c.rua0,
    rz = c.rua2,
    rf = c.rfa;
  m.gunMag.visible = true;
  m.handMag.visible = false;
  if (u.reloading && u.alive) {
    const r = clamp(u.reloadT / u.reloadDur, 0, 1),
      a = rlArm(r),
      b0 = Math.min(1, Math.min(r, 1 - r) * 6),
      blend = b0 * b0 * (3 - 2 * b0);
    const seat = Math.exp(-Math.pow((r - 0.68) / 0.035, 2)),
      rack = Math.exp(-Math.pow((r - 0.86) / 0.04, 2));
    lx += (a[0] - lx) * blend;
    lz += (a[1] - lz) * blend;
    lf += (a[2] - lf) * blend;
    gx += 0.35 * blend - 0.14 * seat + 0.06 * rack;
    gy += 0.45 * blend;
    gz += -0.35 * blend - 0.1 * rack;
    m.rlB = blend;
    m.rlK = rack;
    m.chest.rotation.x += 0.1 * blend;
    m.abd.rotation.x += 0.05 * blend;
    m.neck.rotation.y += 0.22 * blend;
    m.head.rotation.z += -0.1 * blend;
    m.gunMag.visible = r < 0.16 || r > 0.66;
    m.handMag.visible = r > 0.3 && r < 0.66;
  } else {
    m.rlB = 0;
    m.rlK = 0;
  }
  if (u.rpg) {
    m.handMag.visible = false;
    m.gunMag.visible = u.alive ? u.rpgLoaded || (u.reloading && u.reloadT / u.reloadDur > 0.6) : false;
  }
  // la mano izquierda a la oreja para la radio, al casco cuando está inquieto y a la herida cuando está herido
  const tb = m.talkB;
  if (tb > 0.01) {
    if ((u.kit === 'radio' || u.talkRadio) && !(u.chatT > 0)) {
      lx = sm(lx, -2.3, tb);
      lz = sm(lz, -0.75, tb);
      lf = sm(lf, -2.25, tb);
      lw = sm(lw, 0.3, tb);
    } else {
      const t = m.idle; // hablando cara a cara: la mano libre se mueve con las palabras
      lx = sm(lx, -1.05 + Math.sin(t * 4.3) * 0.28, tb);
      lz = sm(lz, -0.25 + Math.sin(t * 2.7) * 0.15, tb);
      lf = sm(lf, -1.35 + Math.sin(t * 5.1 + 1) * 0.3, tb);
      lw = sm(lw, Math.sin(t * 3.3) * 0.3, tb);
    }
  }
  // señales con la mano: el brazo hacia donde va la escuadra, o la mano plana empujando hacia abajo para ponerse a cubierto
  u.sigT = Math.max(0, (u.sigT || 0) - dt);
  m.sigB = sm(m.sigB || 0, u.alive && u.sigT > 0 && c.lie < 0.3 && !u.reloading ? 1 : 0, 1 - Math.exp(-9 * dt));
  if (m.sigB > 0.01) {
    const sb = m.sigB,
      dn = u.sigK === 'down',
      fist = u.sigK === 'fist';
    if (fist) {
      lx = sm(lx, -2.75, sb);
      lz = sm(lz, -0.42, sb);
      lf = sm(lf, -1.95, sb);
      lw = sm(lw, 0.15, sb);
    } else {
      const ch = dn ? 0 : Math.max(0, Math.sin(m.idle * 7.5)) * sb;
      lx = sm(lx, dn ? -1.3 + Math.sin(m.idle * 9) * 0.25 : -1.5 - ch * 0.12, sb);
      lz = sm(lz, dn ? -0.2 : -0.12, sb);
      lf = sm(lf, dn ? -0.25 : -0.42 + ch * 0.4, sb);
      lw = sm(lw, dn ? 0.9 : 0, sb);
    }
    m.chest.rotation.y += 0.14 * sb;
    m.chest.rotation.x += (dn ? 0.1 : 0.04) * sb;
  }
  // de espaldas a una pared: se apoya y mira a lo largo de ella
  m.wallB = sm(
    m.wallB || 0,
    u.alive && u.wall != null && !busy && !u.moving ? (u.wallVar === 1 ? 0.35 : 1) : 0,
    1 - Math.exp(-5 * dt)
  );
  if (fk === 'adjust') {
    lx = sm(lx, -2.6, fs);
    lz = sm(lz, -0.35, fs);
    lf = sm(lf, -2.0, fs);
  }
  if (fk === 'vest') {
    lx = sm(lx, -0.95 + Math.sin(m.idle * 2.2) * 0.12, fs);
    lz = sm(lz, -0.6, fs);
    lf = sm(lf, -2.0 + Math.sin(m.idle * 8) * 0.2, fs);
    lw = sm(lw, 0.4, fs);
  } // palpándose los bolsillos del chaleco
  if (fk === 'high') {
    rf = sm(rf, rf - 0.35, fs);
    lx = sm(lx, lx - 0.25, fs);
  }
  if (m.gvB > 0.01) {
    lx = sm(lx, -1.45, m.gvB);
    lz = sm(lz, -0.08, m.gvB);
    lf = sm(lf, -0.22, m.gvB);
    lw = sm(lw, 0.45, m.gvB);
  } // pasando algo
  if (m.tpB > 0.01) {
    lx = sm(lx, -1.62, m.tpB);
    lz = sm(lz, -0.12, m.tpB);
    lf = sm(lf, -0.5 + Math.sin(m.idle * 15) * 0.14, m.tpB);
  } // una palmada en el hombro del otro
  if (m.flB > 0.01 && !busy) {
    lx = sm(lx, -2.2, m.flB * 0.8);
    lz = sm(lz, -0.5, m.flB * 0.8);
    lf = sm(lf, -2.0, m.flB * 0.8);
  } // un brazo levantado por encima de la cabeza
  if (stum > 0.01) {
    lx = sm(lx, -1.7, stum);
    lf = sm(lf, -0.5, stum);
    rx = sm(rx, rx - 0.5, stum);
  }
  if (vB > 0.01) {
    lx = sm(lx, -0.55, vB);
    lz = sm(lz, -0.9, vB);
    lf = sm(lf, -0.2 - 0.3 * (1 - vB), vB);
    gx += 0.25 * vB;
    gy += 0.35 * vB;
  } // la mano izquierda sobre el muro
  if ((m.noGun || u.team === 'civ') && !u.poseName) {
    const sw = w * (1 - tb) * (1 - (m.sigB || 0)) * (1 - m.flB);
    lx -= sL * (0.5 + 0.45 * run) * sw;
    rx -= sR * (0.5 + 0.45 * run) * sw;
    lf -= sw * (0.18 + 0.95 * run + 0.3 * Math.max(0, sL));
    rf -= sw * (0.18 + 0.95 * run + 0.3 * Math.max(0, sR));
  }
  m.carB = sm(m.carB || 0, run * w * (busy || m.sigB > 0.1 || u.rpg ? 0 : 1), 1 - Math.exp(-5 * dt));
  if (m.carB > 0.01 && !m.noGun) {
    gx += 0.28 * m.carB;
    gy += 0.42 * m.carB;
    gz += Math.sin(ph) * 0.07 * m.carB;
  }
  const pump = (m.gArm || 0) * run * w * (busy || m.sigB > 0.1 ? 0 : 1); // algunos corren con el fusil en una mano
  if (pump > 0.01) {
    lx = sm(lx, 0.15 + sL * 0.8, pump);
    lz = sm(lz, -0.12, pump);
    lf = sm(lf, -1.25, pump);
    gx += 0.32 * pump;
    gy += 0.22 * pump;
  }
  if (pis > 0.01) {
    const d0 = Math.min(1, pis * 2.2); // el fusil cuelga de la correa; la mano derecha va a la funda y saca la pistola, la izquierda la acompaña
    rx = sm(sm(rx, 0.28, d0), -1.42, pisA);
    rz = sm(sm(rz, 0.22, d0), 0.2, pisA);
    rf = sm(sm(rf, -0.95, d0), -0.14, pisA);
    lx = sm(lx, -1.22, pisA);
    lz = sm(lz, -0.6, pisA);
    lf = sm(lf, -0.6, pisA);
    gx = sm(gx, 1.3, pis);
    gy = sm(gy, 0.1, pis);
    gz = sm(gz, 0.32, pis);
  }
  if (m.pistol) m.pistol.visible = pis > 0.42;
  if (fk === 'inspect') {
    lx = sm(lx, -1.15, fs);
    lz = sm(lz, -0.42, fs);
    lf = sm(lf, -1.75, fs);
    lw = sm(lw, 0.5, fs);
    rx = sm(rx, -0.55, fs);
    rf = sm(rf, -1.55, fs);
  }
  if (fk === 'stretch') {
    rx = sm(rx, -0.6, fs * 0.5);
    lx = sm(lx, -0.6, fs * 0.5);
  }
  const hurtIdle = m.limp * still * (busy ? 0 : 1) * (1 - tb);
  if (hurtIdle > 0.01) {
    lx = sm(lx, -0.45, hurtIdle);
    lz = sm(lz, -0.75, hurtIdle);
    lf = sm(lf, -1.5, hurtIdle);
  }
  if (m.healB > 0.01) {
    const t = m.idle;
    rf += Math.sin(t * 6.5) * 0.22 * m.healB;
    lf += Math.cos(t * 5.3) * 0.22 * m.healB;
    rx += Math.sin(t * 3.1) * 0.08 * m.healB;
  }
  if (u.down) {
    rx += Math.sin(m.idle * 2.1) * 0.3;
    lx += Math.cos(m.idle * 1.6) * 0.22;
  }
  const calm = u.alive && !busy && u.sup < 15 && !m.sigB ? 1 : 0; // sin amenaza: fusil en posición baja
  m.lowB = sm(m.lowB || 0, calm * (1 - c.lie) * (1 - pis), 1 - Math.exp(-3 * dt));
  const aO = (m.armOut || 0) * (1 - c.lie * 0.6);
  m.shR.rotation.set(rx + w * sR * (0.1 + 0.06 * run) + m.lowB * 0.12, c.rua1, rz - aO);
  m.elR.rotation.x = rf - m.recoil * 0.1 + w * Math.sin(ph * 2) * 0.05;
  m.wrR.rotation.set(c.rwr, 0, 0);
  m.shL.rotation.set(lx + w * sL * (0.1 + 0.08 * run) + m.lowB * 0.1, ly, lz + aO + w * Math.cos(ph) * 0.04);
  m.elL.rotation.x = lf + w * Math.sin(ph * 2 + 1) * 0.06;
  m.wrL.rotation.set(lw, 0, 0);
  // piernas: paso con carrera agachada y cojera; los tobillos mantienen los pies planos, con despegue de punta y apoyo de talón
  const lim = 1 - m.limp * 0.45;
  const amp = (0.42 + 0.36 * run) * (1 - m.cm * 0.2) * (m.gA || 1),
    kAmp = (0.75 + 0.75 * run) * (m.gK || 1),
    kBase = 0.08 + 0.14 * run + 0.45 * m.cm * wWalk + m.flB * 0.3 + stum * 0.35;
  const hipL = c.lth0 + w * (sL * amp - 0.05 * run) - m.cm * 0.35 * wWalk,
    kneeL = c.lsh + w * (Math.max(0, -Math.cos(ph + 0.35)) * kAmp + kBase) + m.cm * 0.25 * wWalk;
  const hipR = c.rth0 + w * (sR * amp * lim - 0.05 * run) - m.cm * 0.35 * wWalk,
    kneeR = c.rsh + w * (Math.max(0, -Math.cos(ph + Math.PI + 0.35)) * kAmp * lim + kBase) + m.cm * 0.25 * wWalk;
  const vL = m.vL || 0,
    vR = m.vR || 0,
    pkL = Math.max(0, m.pkB),
    pkR = Math.max(0, -m.pkB);
  m.hipL.rotation.set(sm(hipL, -1.5, vL) - stum * 0.3, 0, c.lth1 + vL * 0.3 + pkL * 0.2);
  m.knL.rotation.x = sm(kneeL, 1.7, vL) + stum * 0.5 + pkR * 0.22;
  m.hipR.rotation.set(sm(hipR, -1.2, vR), 0, c.rth1 + vR * 0.3 - pkR * 0.2);
  m.knR.rotation.x = sm(kneeR, 1.8, vR) + pkL * 0.22;
  const flat = (hp, kn) => clamp(-(hp + kn), -0.9, 0.8) * (1 - c.lie);
  m.anL.rotation.x = flat(hipL, kneeL) + c.lft + w * (Math.max(0, sL) * 0.45 - Math.max(0, -sL) * 0.2);
  m.anR.rotation.x = flat(hipR, kneeR) + c.rft + w * (Math.max(0, sR) * 0.45 * lim - Math.max(0, -sR) * 0.2);
  legGait(u, m, c, wLeg * (1 - vB), fL, duty, run, spB);
  {
    const cr = c.lie * clamp(sp / 0.2, 0, 1) * (u.alive && !u.down ? 1 : 0); // arrastrándose: la rodilla sube por un lado mientras el codo del otro avanza
    if (cr > 0.01) {
      const a = Math.max(0, sL),
        b = Math.max(0, sR);
      m.hipL.rotation.z += cr * a * 0.55;
      m.hipL.rotation.x += -cr * a * 0.5;
      m.knL.rotation.x += cr * a * 1.0;
      m.hipR.rotation.z += -cr * b * 0.55;
      m.hipR.rotation.x += -cr * b * 0.5;
      m.knR.rotation.x += cr * b * 1.0;
      m.chest.rotation.y += cr * sL * 0.14;
      m.pelvis.rotation.y += -cr * sL * 0.12;
      m.body.position.x += cr * sL * 0.02;
    }
  }
  m.gun.position.set(
    c.gun0 + pis * 0.03 + (m.carB || 0) * (0.03 + Math.sin(ph) * 0.012) + (m.pkH || 0) * 0.03,
    c.gun1 + br * 0.3 + gunBob - pis * 0.2 - (m.carB || 0) * 0.035 + (m.rlB || 0) * 0.02,
    c.gun2 - m.recoil * 0.05 * (1 - pis) - pis * 0.06 - (m.rlB || 0) * 0.035 - (m.rlK || 0) * 0.02
  );
  const insp = fk === 'inspect' ? fs : 0,
    turnG = insp ? Math.sin(m.fid ? m.fid.t * 2.1 : 0) * 0.55 : 0;
  if (insp) ((m.gun.position.y += 0.1 * insp), (m.gun.position.z += 0.06 * insp));
  if (m.model) m.gun.position.z -= 0.025 * (1 - pis); // los brazos de los modelos son del largo de un hombre: el fusil se sujeta un poco más cerca
  m.gun.rotation.set(
    gx -
      m.recoil * 0.08 * (1 - pis) +
      w * run * 0.15 +
      m.lowB * (m.rdy ? -0.28 : 0.22) +
      (fk === 'check' ? -0.35 * fs : 0) +
      (fk === 'high' ? -0.8 * fs : 0) -
      0.55 * insp,
    gy + (fk === 'check' ? 0.4 * fs : 0) + (0.5 * fdir + turnG) * insp,
    gz + (fk === 'check' ? 0.7 * fs : 0) + (0.9 + turnG * 0.6) * insp
  );
  // la cuerda, un herido en el suelo, la llegada al pie de la cuerda
  animRope(u, m, dt, c);
  animDowned(u, m, dt, c);
  aimGun(u, m, dt, tgt, pis, insp);
  // las manos en el arma: la derecha en la empuñadura y la izquierda bajo el guardamanos, haga lo que haga el cuerpo (IK de dos huesos)
  if (m.model && !m.noGun) {
    const pd = Math.min(1, pis * 2.2),
      carryG = u.poseName && !/^kneel/.test(u.poseName) ? 1 : 0,
      shown = m.gun.scale.x > 0.5 ? 1 : 0;
    const baseR =
      (u.alive && !u.down ? 1 : 0) *
      shown *
      (1 - carryG) *
      (1 - pd) *
      (1 - insp) *
      (1 - (fk === 'stretch' ? fs : 0)) *
      (1 - m.healB) *
      (1 - (m.ropeB || 0));
    let rb = 0;
    if (u.reloading && u.alive) {
      const r = clamp(u.reloadT / u.reloadDur, 0, 1);
      rb = Math.min(1, Math.min(r, 1 - r) * 8);
    }
    const freeL = Math.max(
      rb,
      tb,
      m.sigB || 0,
      fk === 'adjust' || fk === 'vest' || fk === 'high' ? fs : 0,
      m.gvB || 0,
      m.tpB || 0,
      busy ? 0 : m.flB || 0,
      stum,
      vB,
      pump,
      pisA,
      hurtIdle,
      u.rpg ? 0 : 0
    );
    m.ikR = sm(m.ikR == null ? baseR : m.ikR, baseR, 1 - Math.exp(-14 * dt));
    m.ikL = sm(m.ikL == null ? baseR : m.ikL, baseR * (1 - freeL), 1 - Math.exp(-14 * dt));
    if (m.ikR > 0.01 || m.ikL > 0.01) {
      m.gun.updateMatrix();
      armIK(m, -1, m.gripR, m.ikR, _IK_PR);
      armIK(m, 1, m.gripL, m.ikL, _IK_PL);
    }
  }
  groundGun(u, m, c);
  swingRig(m, dt, c.lie);
}
// el arma de un caído (herido o muerto) se queda tirada en el suelo a su lado, quieta: ya no la tiene en las manos.
// Se decide dónde cae una sola vez; el hueso del arma se coloca para que en el mundo quede justo ahí, plana sobre un costado.
const _ggM = new T.Matrix4(),
  _ggI = new T.Matrix4(),
  _ggQ = new T.Quaternion(),
  _ggE = new T.Euler(),
  _ggP = new T.Vector3(),
  _ggS = new T.Vector3();
function groundGun(u, m, c) {
  if (u.alive) {
    u.gunG = null;
    return;
  }
  if (u.carriedBy || u.dummy || c.lie < 0.5 || !m.gun || !m.chest || !m.root) return;
  if (!u.gunG) {
    const yaw = m.root.rotation.y,
      sd = (u.dnSeed || 1) % 2 < 1 ? 1 : -1;
    m.root.getWorldPosition(_ggP);
    u.gunG = {
      x: _ggP.x + Math.cos(yaw) * 0.55 * sd - Math.sin(yaw) * 0.25,
      y: _ggP.y + 0.035,
      z: _ggP.z - Math.sin(yaw) * 0.55 * sd - Math.cos(yaw) * 0.25,
      yaw: yaw + 1.1 * sd
    };
  }
  const g = u.gunG;
  m.chest.updateWorldMatrix(true, false);
  m.chest.getWorldScale(_ggS);
  _ggQ.setFromEuler(_ggE.set(0, g.yaw, Math.PI / 2, 'YXZ'));
  _ggM.compose(_ggP.set(g.x, g.y, g.z), _ggQ, _ggS);
  _ggI.copy(m.chest.matrixWorld).invert().multiply(_ggM);
  _ggI.decompose(m.gun.position, m.gun.quaternion, _ggS);
}
/* Las piernas según dónde están los pies: cada pie se queda donde apoyó mientras el cuerpo pasa por encima (así las piernas van al ritmo
   del terreno recorrido, se mueva hacia donde se mueva: delante, atrás o de lado), luego se levanta, pasa y apoya un paso más allá. El talón
   se despega primero y la punta la última; corriendo, el pie sube por detrás y la rodilla empuja hacia delante. IK de dos huesos de cadera a tobillo. */
const _lgQ = new T.Quaternion(),
  _lgV = new T.Vector3(),
  _lgH = new T.Vector3();
function legInit(m) {
  if (m.lgL1 == null) {
    m.lgL1 = m.knL.position.length();
    m.lgL2 = m.anL.position.length();
    m.lgY = (m.model ? m.py0 : flatPose.ready.py) + m.hipL.position.y - m.lgL1 - m.lgL2;
    m.lgW = Math.abs(m.hipL.position.x) + 0.012;
  }
}
function legGait(u, m, c, wI, fL, duty, run, spB) {
  if (wI < 0.01) return;
  const L1 = m.lgL1,
    L2 = m.lgL2,
    dx = m.gdx || 0,
    dz = m.gdz == null ? 1 : m.gdz,
    mv = clamp(spB / 0.3, 0, 1);
  const a = duty * m.stepLen * mv,
    lim = 1 - m.limp * 0.3,
    hSw = (0.045 + 0.075 * run + 0.03 * m.cm) * (m.gK || 1),
    off = m.gOff || 0.07;
  _lgQ.copy(m.pelvis.quaternion).invert();
  for (let k = 0; k < 2; k++) {
    const sd = k ? -1 : 1,
      f = k ? (fL + 0.5) % 1 : fL,
      hip = k ? m.hipR : m.hipL,
      kn = k ? m.knR : m.knL,
      an = k ? m.anR : m.anL;
    let al, y, pt;
    if (f < duty) {
      const q = f / duty,
        o = clamp((q - 0.62) / 0.38, 0, 1);
      al = a * (1 - 2 * q);
      y = o * o * off;
      pt = o * (0.5 + 0.25 * run) - clamp(1 - q / 0.14, 0, 1) * 0.22;
    } else {
      const q = (f - duty) / (1 - duty),
        e = 0.5 - 0.5 * Math.cos(Math.PI * q),
        kick = Math.sin(Math.PI * Math.min(1, q * 1.55));
      al = a * (2 * e - 1);
      y = off * (1 - q) * (1 - q) + hSw * Math.sin(Math.PI * q) * (k && m.limp ? lim : 1) + run * 0.12 * kick * kick;
      pt =
        (0.5 + 0.25 * run) * (1 - q) * (1 - q) +
        run * 0.45 * Math.sin(Math.PI * q) -
        clamp((q - 0.68) / 0.32, 0, 1) * 0.22;
    }
    _lgH.copy(hip.position).applyQuaternion(m.pelvis.quaternion).add(m.pelvis.position);
    _lgV
      .set(
        sd * (m.lgW + 0.012 * m.cm) + dx * (al - 0.04 * mv),
        m.lgY + y * mv + (1 - mv) * y * 0.5,
        dz * (al - 0.04 * mv)
      )
      .sub(_lgH)
      .applyQuaternion(_lgQ);
    const D = clamp(_lgV.length(), 0.14, (L1 + L2) * 0.997);
    _lgV.setLength(D);
    const kx = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
    const ay = -L1 - L2 * Math.cos(kx),
      az = -L2 * Math.sin(kx),
      psi = Math.asin(clamp(_lgV.x / -ay, -0.7, 0.7));
    let th = Math.atan2(_lgV.z, _lgV.y) - Math.atan2(az, ay * Math.cos(psi));
    th = Math.atan2(Math.sin(th), Math.cos(th));
    hip.rotation.x = sm(hip.rotation.x, th, wI);
    hip.rotation.z = sm(hip.rotation.z, psi, wI);
    kn.rotation.x = sm(kn.rotation.x, kx, wI);
    an.rotation.x = sm(an.rotation.x, clamp(-(th + kx), -1.1, 0.9) + pt * mv + (k ? c.rft : c.lft), wI);
  }
}
/* El fusil al objetivo: cuando dispara o tiene objetivo, el cañón se gira (sobre el propio pivote del fusil, en el marco del pecho)
   para que apunte a donde van las balas: el punto del último disparo o, si no, el pecho del objetivo. Las manos lo siguen por IK. */
const _agA = new T.Vector3(),
  _agO = new T.Vector3(),
  _agF = new T.Vector3(),
  _agQ = new T.Quaternion(),
  _agP = new T.Quaternion(),
  _agI = new T.Quaternion(),
  _agZ = new T.Vector3(0, 0, 1);
function aimGun(u, m, dt, tgt, pis, insp) {
  let P = null;
  if (u.aimP && G && G.t - u.aimP[3] < 1.4 && (u.firing > 0 || tgt)) P = _agA.set(u.aimP[0], u.aimP[1], u.aimP[2]);
  else if (tgt && tgt.x != null)
    P = _agA.set(
      tgt.x,
      (tgt.elev || 0) + (tgt.stance === 'prone' ? 0.2 : tgt.stance === 'crouch' ? 0.55 : 0.78),
      tgt.z
    );
  const on = !!(
    P &&
    u.alive &&
    !u.down &&
    !u.reloading &&
    !u.mounted &&
    pis < 0.2 &&
    !insp &&
    !(m.ropeB > 0.05) &&
    m.gun.scale.x > 0.5
  );
  m.agB = sm(m.agB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 12 : 6) * dt));
  if (on) m.agP = [P.x, P.y, P.z];
  else if (!m.agP) return;
  if (m.agB < 0.01) return;
  m.root.updateMatrixWorld(true);
  m.gun.getWorldPosition(_agO);
  _agF.copy(_agZ).transformDirection(m.gun.matrixWorld);
  _agA.set(m.agP[0], m.agP[1], m.agP[2]).sub(_agO);
  const d = _agA.length();
  if (d < 0.5) return;
  _agA.divideScalar(d);
  let ang = Math.acos(clamp(_agF.dot(_agA), -1, 1));
  if (ang < 0.002) return;
  _agQ.setFromUnitVectors(_agF, _agA);
  if (ang > 1.3) {
    _agQ.slerp(_agI.identity(), 1 - 1.3 / ang);
  }
  m.gun.parent.getWorldQuaternion(_agP); // corrección del mundo -> marco del pecho
  _agQ.premultiply(_agI.copy(_agP).invert()).multiply(_agP);
  _agI.identity().slerp(_agQ, m.agB);
  m.gun.quaternion.premultiply(_agI);
  const pit = clamp(Math.asin(clamp(_agA.y, -1, 1)), -0.7, 0.9) * m.agB; // la cabeza sube o baja con el cañón, con el ojo detrás de las miras
  m.neck.rotation.x -= pit * 0.35;
  m.head.rotation.x -= pit * 0.45;
  m.chest.rotation.x -= pit * 0.2;
}
/* IK de dos huesos en el marco del pecho: el hombro gira el brazo hacia el objetivo y el codo se dobla (hacia delante, sobre su propio
   eje x, como en todas las poses) para que la mano acabe en él; el codo se mantiene hacia un polo (abajo y afuera). Se mezcla sobre la pose según w. */
const _IK_PR = new T.Vector3(-0.55, -1, -0.35).normalize(),
  _IK_PL = new T.Vector3(0.25, -1, 0.05).normalize();
const _ikT = new T.Vector3(),
  _ikD = new T.Vector3(),
  _ikP = new T.Vector3(),
  _ikU = new T.Vector3(),
  _ikF = new T.Vector3(),
  _ikZ = new T.Vector3(),
  _ikX = new T.Vector3(),
  _ikY = new T.Vector3(),
  _ikM = new T.Matrix4(),
  _ikQ = new T.Quaternion();
function armIK(m, side, grip, w, pole) {
  if (w < 0.01) return;
  const sh = side > 0 ? m.shL : m.shR,
    el = side > 0 ? m.elL : m.elR,
    L1 = m.L1,
    L2 = m.L2 + 0.035;
  _ikT.set(grip[0], grip[1], grip[2]).applyMatrix4(m.gun.matrix); // la empuñadura, en el marco del pecho
  _ikD.copy(_ikT).sub(sh.position);
  let d = _ikD.length();
  if (d < 1e-4) return;
  _ikD.divideScalar(d);
  d = clamp(d, Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.995);
  const ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1),
    sa = Math.sqrt(1 - ca * ca);
  _ikP.copy(pole).addScaledVector(_ikD, -pole.dot(_ikD));
  if (_ikP.lengthSq() < 1e-6) _ikP.set(0, -1, 0);
  _ikP.normalize();
  _ikU.copy(_ikD).multiplyScalar(ca).addScaledVector(_ikP, sa); // el brazo
  _ikF.copy(_ikD).multiplyScalar(d).addScaledVector(_ikU, -L1).normalize(); // el antebrazo
  const cf = clamp(_ikU.dot(_ikF), -1, 1);
  _ikZ.copy(_ikF).addScaledVector(_ikU, -cf);
  if (_ikZ.lengthSq() < 1e-8) _ikZ.copy(_ikP).negate();
  _ikZ.normalize();
  _ikY.copy(_ikU).negate();
  _ikX.crossVectors(_ikY, _ikZ).normalize();
  _ikZ.crossVectors(_ikX, _ikY);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  _ikQ.setFromRotationMatrix(_ikM);
  sh.quaternion.slerp(_ikQ, w);
  el.rotation.x = sm(el.rotation.x, -Math.acos(cf), w);
  el.rotation.y = sm(el.rotation.y, 0, w);
  el.rotation.z = sm(el.rotation.z, 0, w);
  const wr = side > 0 ? m.wrL : m.wrR;
  wr.rotation.x = sm(wr.rotation.x, side > 0 ? 0.25 : -0.15, w);
}
/* Fast-rope: las dos manos en la cuerda por encima de la cabeza (una sobre otra, cerrándose y abriéndose al frenar), las piernas enroscadas
   en ella, la cabeza agachada mirando al suelo y el fusil colgado; un giro lento y un vaivén en la cuerda, y una flexión profunda de rodillas al llegar */
function animRope(u, m, dt, c) {
  const on = !!(u.slide || u.mode === 'slide');
  m.ropeB = sm(m.ropeB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 18 : 6) * dt));
  u.landT = Math.max(0, (u.landT || 0) - dt);
  m.landB = sm(
    m.landB || 0,
    u.landT > 0 ? Math.sin(Math.PI * clamp(1 - u.landT / 0.55, 0, 1)) : 0,
    1 - Math.exp(-25 * dt)
  );
  const b = m.ropeB,
    t = m.idle,
    v = clamp((u.ropeV || 4) / 5.5, 0, 1);
  if (b > 0.01) {
    const grip = Math.sin(t * (4 + 5 * v)) * 0.1 * (0.4 + v),
      brake = 1 - v;
    m.shR.rotation.set(
      sm(m.shR.rotation.x, -2.95 + grip + brake * 0.2, b),
      sm(m.shR.rotation.y, 0, b),
      sm(m.shR.rotation.z, 0.3, b)
    );
    m.elR.rotation.x = sm(m.elR.rotation.x, -0.45 - brake * 0.3, b);
    m.shL.rotation.set(
      sm(m.shL.rotation.x, -2.4 - grip, b),
      sm(m.shL.rotation.y, 0, b),
      sm(m.shL.rotation.z, -0.35, b)
    );
    m.elL.rotation.x = sm(m.elL.rotation.x, -1.05 + brake * 0.2, b);
    m.wrR.rotation.x = sm(m.wrR.rotation.x, 0.4, b);
    m.wrL.rotation.x = sm(m.wrL.rotation.x, 0.5, b);
    m.hipL.rotation.set(sm(m.hipL.rotation.x, -0.55 - brake * 0.25, b), 0, sm(m.hipL.rotation.z, -0.2, b));
    m.knL.rotation.x = sm(m.knL.rotation.x, 0.85 + brake * 0.3, b);
    m.hipR.rotation.set(sm(m.hipR.rotation.x, -0.3, b), 0, sm(m.hipR.rotation.z, 0.24, b));
    m.knR.rotation.x = sm(m.knR.rotation.x, 0.6, b);
    m.anL.rotation.x = sm(m.anL.rotation.x, 0.45, b);
    m.anR.rotation.x = sm(m.anR.rotation.x, 0.2, b);
    m.abd.rotation.x = sm(m.abd.rotation.x, 0.05, b);
    m.chest.rotation.x = sm(m.chest.rotation.x, -0.12, b);
    m.chest.rotation.y = sm(m.chest.rotation.y, 0, b);
    m.neck.rotation.x = sm(m.neck.rotation.x, 0.35, b);
    m.head.rotation.x = sm(m.head.rotation.x, 0.45 + Math.sin(t * 1.3) * 0.06, b);
    m.head.rotation.y = sm(m.head.rotation.y, Math.sin(t * 0.7) * 0.35, b);
    m.body.rotation.z = sm(m.body.rotation.z, Math.sin(t * 1.9) * 0.07, b);
    m.body.rotation.x = sm(m.body.rotation.x, Math.sin(t * 1.3 + 1) * 0.05, b);
    m.pelvis.position.y = sm(m.pelvis.position.y, (m.py0 || 0.52) + 0.02, b);
    m.gun.position.set(sm(m.gun.position.x, -0.17, b), sm(m.gun.position.y, -0.05, b), sm(m.gun.position.z, -0.13, b));
    m.gun.rotation.set(sm(m.gun.rotation.x, 1.35, b), sm(m.gun.rotation.y, 0, b), sm(m.gun.rotation.z, 0.25, b));
  }
  const l = m.landB;
  if (l > 0.01) {
    m.pelvis.position.y -= 0.16 * l;
    m.hipL.rotation.x -= 0.75 * l;
    m.hipR.rotation.x -= 0.6 * l;
    m.knL.rotation.x += 1.2 * l;
    m.knR.rotation.x += 1.0 * l;
    m.anL.rotation.x -= 0.4 * l;
    m.anR.rotation.x -= 0.35 * l;
    m.chest.rotation.x += 0.35 * l;
    m.abd.rotation.x += 0.2 * l;
    m.neck.rotation.x -= 0.25 * l;
  }
}
/* Un hombre caído: boca arriba, una rodilla encogida meciéndose y la otra pierna empujando el suelo; una mano apretando la herida y
   temblando, la otra levantándose cada pocos segundos para pedir ayuda; levanta la cabeza para mirarse la herida y la deja caer; respiración rápida y corta */
function animDowned(u, m, dt, c) {
  const on = !!(u.down && !u.alive && c.lie > 0.5);
  m.dnB = sm(m.dnB || 0, on ? 1 : 0, 1 - Math.exp(-(on ? 2.2 : 8) * dt));
  const b = m.dnB;
  if (b < 0.01) return;
  const t = m.idle + (u.dnSeed || (u.dnSeed = rnd() * 20));
  const n = (f, p) =>
    (Math.sin(t * f + p) + 0.5 * Math.sin(t * f * 2.13 + p * 1.7 + 1.3) + 0.25 * Math.sin(t * f * 0.47 + p * 0.6 + 4)) /
    1.75; // un valor que deambula despacio, -1..1
  const pain = 0.5 + 0.5 * n(0.21, 0),
    sp_ = Math.pow(Math.max(0, n(0.33, 2.2)), 4) * 1.6; // oleadas de dolor; de vez en cuando un espasmo
  const breath = t * (4.2 + 2.6 * pain) + Math.sin(t * 0.9) * 0.6,
    heave = Math.sin(breath) * (0.035 + 0.03 * pain) + Math.max(0, Math.sin(breath * 0.5)) * 0.02;
  const rock = n(0.42, 1),
    roll = n(0.17, 3) * (0.7 + 0.3 * pain),
    call = Math.pow(Math.max(0, n(0.19, 5)), 2) * 1.3,
    callC = Math.min(1, call);
  const lift = Math.pow(Math.max(0, n(0.26, 7)), 2) * 1.2,
    push = Math.max(0, n(0.2, 4)),
    trem = Math.sin(t * 23) * 0.02 * (0.3 + pain) + Math.sin(t * 31) * 0.012 * sp_;
  m.body.rotation.y += b * (roll * 0.28 + sp_ * 0.08);
  m.body.position.x += b * roll * 0.03;
  // la pierna que todavía puede mover se encoge y se mece; la otra empuja el suelo, arrastrando el talón
  m.hipL.rotation.set(
    sm(m.hipL.rotation.x, -0.95 - 0.3 * rock - 0.35 * sp_, b),
    0,
    sm(m.hipL.rotation.z, 0.14 + 0.12 * rock - roll * 0.2, b)
  );
  m.knL.rotation.x = sm(m.knL.rotation.x, 1.5 + 0.35 * rock + 0.3 * sp_, b);
  m.anL.rotation.x = sm(m.anL.rotation.x, -0.3 + 0.3 * rock, b);
  m.hipR.rotation.set(
    sm(m.hipR.rotation.x, -0.08 - 0.42 * push + trem, b),
    0,
    sm(m.hipR.rotation.z, -0.1 - roll * 0.12, b)
  );
  m.knR.rotation.x = sm(m.knR.rotation.x, 0.12 + 0.75 * push, b);
  m.anR.rotation.x = sm(m.anR.rotation.x, 0.5 - 0.3 * push + n(1.1, 2) * 0.08, b);
  // una mano aprieta la herida, temblando; la otra tantea el suelo, sube para pedir ayuda y vuelve a caer
  m.shR.rotation.set(
    sm(m.shR.rotation.x, -0.45 + trem * 1.5 - sp_ * 0.12, b),
    0,
    sm(m.shR.rotation.z, 0.6 + heave * 0.6, b)
  );
  m.elR.rotation.x = sm(m.elR.rotation.x, -1.85 + trem, b);
  m.wrR.rotation.x = sm(m.wrR.rotation.x, 0.6, b);
  m.shL.rotation.set(
    sm(m.shL.rotation.x, sm(-0.3 + n(0.5, 9) * 0.18, -1.7 + n(0.9, 1) * 0.2, callC), b),
    0,
    sm(m.shL.rotation.z, sm(-0.8 + n(0.37, 6) * 0.25, -0.12 + n(1.2, 3) * 0.2, callC), b)
  );
  m.elL.rotation.x = sm(m.elL.rotation.x, sm(-1.3 + n(0.6, 2) * 0.35, -0.4 + n(1.4, 8) * 0.15, callC), b);
  m.wrL.rotation.x = sm(m.wrL.rotation.x, 0.3 + n(1.3, 4) * 0.3, b);
  // el pecho subiendo y bajando, la espalda arqueándose en un espasmo y el tronco girando de un lado a otro
  m.abd.rotation.x = sm(m.abd.rotation.x, heave + 0.12 * lift - sp_ * 0.14, b);
  m.chest.rotation.x = sm(m.chest.rotation.x, heave * 1.5 + 0.2 * lift - sp_ * 0.2, b);
  m.abd.rotation.y = sm(m.abd.rotation.y, rock * 0.12 + roll * 0.1, b);
  m.chest.rotation.y = sm(m.chest.rotation.y, roll * 0.14, b);
  m.pelvis.rotation.y = sm(m.pelvis.rotation.y, -rock * 0.1, b);
  // la cabeza rueda despacio, se levanta para mirar la herida y cae; echada hacia atrás en un espasmo
  const hy = n(0.23, 11) * 0.6 * (1 - Math.min(1, lift));
  m.neck.rotation.set(sm(m.neck.rotation.x, 0.08 + 0.45 * lift - 0.25 * sp_, b), sm(m.neck.rotation.y, hy, b), 0);
  m.head.rotation.set(
    sm(m.head.rotation.x, 0.08 + 0.35 * lift - 0.2 * sp_, b),
    sm(m.head.rotation.y, hy * 0.7, b),
    sm(m.head.rotation.z, roll * 0.15, b)
  );
  m.gun.position.set(sm(m.gun.position.x, -0.42, b), sm(m.gun.position.y, 0.05, b), sm(m.gun.position.z, 0.12, b));
  m.gun.rotation.set(sm(m.gun.rotation.x, 0.25, b), sm(m.gun.rotation.y, 0, b), sm(m.gun.rotation.z, 1.35, b));
}
