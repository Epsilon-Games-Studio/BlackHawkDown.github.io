/* ====================================================================================================
 * world/civilians.js
 *
 * Civiles: a lo suyo hasta que empiezan los tiros, y entonces corren a la puerta más cercana
 * ================================================================================================== */

let civs = [];
/* ----------------------------------------------------------------------------------------------------
 * Gente que no se alegra de ver a los soldados. Con la calle tranquila y soldados a la vista, un hombre enfadado se encara con ellos:
 * les señala con el brazo y grita, y algunos cogen una piedra del suelo y la tiran. No hace daño. El primer disparo los hace
 * salir corriendo como a todos.
 * -------------------------------------------------------------------------------------------------- */
function civAngry(c, dt) {
  if (!c.angry || c.state === 'flee' || c.state === 'enter' || c.state === 'cower') {
    if (c.state !== 'shout') return false;
  }
  if (c.state === 'flee' || c.state === 'enter' || c.state === 'cower') return false;
  c.angT = (c.angT || 0) - dt;
  if (c.angT <= 0) {
    c.angT = 0.7;
    let best = null,
      bd = 11.5;
    if (!G.noise.some(n => G.t - n.t < 9 && Math.hypot(n.x - c.x, n.z - c.z) < 30)) {
      for (const u of us) {
        if (!u.alive || u.inB || u.mounted) continue;
        const d = Math.hypot(u.x - c.x, u.z - c.z);
        if (d < bd && d > 2.2 && los(c.x, c.z, u.x, u.z)) {
          bd = d;
          best = u;
        }
      }
    }
    if (best && c.state !== 'shout' && (c.calmT || 0) < G.t) {
      c.state = 'shout';
      c.path = [];
      c.shT = rr(7, 15);
      c.thrT = rr(2.5, 6);
    }
    if (c.state === 'shout') {
      if (!best) {
        c.state = 'idle';
        c.tgt = null;
        c.waitT = rr(1, 4);
        return false;
      }
      c.tgt = best;
    }
  }
  if (c.state !== 'shout') return false;
  if (c.tgt) c.face = Math.atan2(c.tgt.x - c.x, c.tgt.z - c.z);
  c.shT -= dt;
  c.thrT -= dt;
  if (c.thrT <= 0 && c.thrower && c.tgt) {
    c.throwA = 1.1;
    c.thrAt = c.tgt;
    c.thrT = rr(5, 11);
  }
  if (c.throwA > 0) {
    const p = c.throwA;
    c.throwA -= dt;
    if (p > 0.26 && c.throwA <= 0.26 && c.thrAt) throwStone(c, c.thrAt);
  }
  if (c.shT <= 0 && !(c.throwA > 0)) {
    c.state = 'idle';
    c.tgt = null;
    c.waitT = rr(2, 6);
    c.calmT = G.t + rr(10, 22);
    return false;
  }
  return true;
}
function throwStone(c, t) {
  const f = c.m.root.rotation.y,
    x0 = c.x + Math.sin(f) * 0.25,
    z0 = c.z + Math.cos(f) * 0.25,
    y0 = 1.45;
  const tx = t.x + rr(-0.7, 0.7),
    tz = t.z + rr(-0.7, 0.7),
    ty = rr(0.1, 1.1),
    d = Math.hypot(tx - x0, tz - z0),
    T_ = clamp(d / 8.5, 0.35, 1.2);
  spawnChunk(
    x0,
    y0,
    z0,
    (tx - x0) / T_,
    (ty - y0) / T_ + 4.5 * T_,
    (tz - z0) / T_,
    0.055,
    pick([0xb09a72, 0xa58d68, 0xbfa880])
  );
  if (t.alive && t.team === 'us' && G.t - (G.stoneT || -99) > 45 && rnd() < 0.5) {
    G.stoneT = G.t;
    radio(t, pick(['¡Nos tiran piedras!', 'Piedras desde la esquina. No disparéis.', 'Solo son piedras. Seguimos.']));
  }
}
function civGesture(c, adt) {
  const m = c.m,
    sh = c.state === 'shout' || c.gest;
  if (sh) {
    c.gph = (c.gph || 0) + adt * (6.5 + (c.woman ? 1.5 : 0));
    const a = Math.sin(c.gph),
      b = Math.sin(c.gph * 0.37 + 1);
    m.shR.rotation.x = -1.75 + a * 0.3;
    m.elR.rotation.x = -0.25 - Math.max(0, a) * 0.55;
    m.shR.rotation.z = -0.12;
    if (b > 0.2) {
      m.shL.rotation.x = -2.3 + Math.sin(c.gph * 1.3) * 0.35;
      m.elL.rotation.x = -0.7;
    }
    m.chest.rotation.x += 0.1 + a * 0.05;
    m.neck.rotation.x -= 0.12;
  }
  if (c.throwA > 0) {
    const k = 1 - c.throwA / 1.1;
    if (k < 0.36) {
      const q = Math.sin((k / 0.36) * Math.PI);
      m.chest.rotation.x = 0.95 * q;
      m.shR.rotation.x = -0.9 * q;
      m.elR.rotation.x = -0.2;
      m.hipL.rotation.x = -0.7 * q;
      m.hipR.rotation.x = -0.7 * q;
      m.knL.rotation.x = 1.2 * q;
      m.knR.rotation.x = 1.2 * q;
    } else if (k < 0.76) {
      const q = (k - 0.36) / 0.4;
      m.shR.rotation.x = -1.2 - 1.9 * q;
      m.elR.rotation.x = -1.3 * q;
      m.chest.rotation.y = -0.5 * q;
      m.chest.rotation.x = -0.15 * q;
    } else {
      const q = (k - 0.76) / 0.24;
      m.shR.rotation.x = -3.1 + 2.4 * q;
      m.elR.rotation.x = -1.3 + 1.2 * q;
      m.chest.rotation.y = -0.5 + 1.0 * q;
      m.chest.rotation.x = 0.25 * q;
    }
  }
}
