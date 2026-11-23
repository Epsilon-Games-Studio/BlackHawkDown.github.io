/* ====================================================================================================
 * world/ambience-update.js
 *
 * updDynamic(): mueve cada frame todo lo vivo del ambiente (viento, palmeras, toldos, banderas, pájaros,
 * rotores) y el sonido de los rotores.
 * ================================================================================================== */

'use strict';

function updDynamic(t, dt) {
  const wnd = windAt(t);
  for (const f of flags) {
    const pa = f.m.geometry.attributes.position.array,
      b = f.base;
    for (let i = 0; i < pa.length; i += 3) {
      const u = b[i] / 1.4;
      pa[i + 2] = b[i + 2] + Math.sin(t * 6.5 * (0.6 + wnd * 0.4) - u * 7 + f.ph) * 0.13 * u * (0.5 + wnd * 0.5);
      pa[i + 1] = b[i + 1] - u * u * 0.08 * (1.2 - wnd);
    }
    f.m.geometry.attributes.position.needsUpdate = true;
    f.m.geometry.computeVertexNormals();
  }
  for (const ch of GEN) {
    if (!ch.aw || ch.seen !== frameStamp) continue;
    const AW = ch.AW,
      awMesh = ch.aw;
    for (let k = 0; k < AW.length; k++) {
      const e = AW[k];
      let rx = e.rx,
        rz = e.rz,
        hide = false;
      if (G && G.roofs && e.b >= 0 && (e.roof || e.y > CUT)) hide = true;
      if (e.inv || e.gone) hide = true;
      if (e.awn === 2) rx = Math.sin(t * 2.6 + e.ph) * 0.3 * wnd;
      else {
        const fl = (Math.sin(t * 3.3 + e.ph) * 0.06 + Math.sin(t * 8.1 + e.ph * 2.3) * 0.025) * wnd;
        if (e.rx) rx += fl * Math.sign(e.rx);
        if (e.rz) rz += fl * Math.sign(e.rz);
        if (!e.rx && !e.rz) rx = fl;
      }
      dummy.position.set(e.x, e.y, e.z);
      dummy.rotation.set(rx, e.ry, rz, e.ord);
      if (hide) dummy.scale.set(0, 0, 0);
      else dummy.scale.set(e.sx, e.sy, e.sz);
      dummy.updateMatrix();
      awMesh.setMatrixAt(k, dummy.matrix);
    }
    awMesh.instanceMatrix.needsUpdate = true;
  }
  for (const ch of GEN) {
    if (!ch.awm || ch.seen !== frameStamp) continue;
    const A = ch.AWM,
      m = ch.awm,
      roofs = G && G.roofs;
    for (let k = 0; k < A.length; k++) {
      const e = A[k],
        fl = (Math.sin(t * 3.3 + e.ph) * 0.05 + Math.sin(t * 8.1 + e.ph * 2.3) * 0.02) * wnd;
      dummy.position.set(e.x, e.y, e.z);
      dummy.rotation.set(fl, e.ry, 0, 'YXZ');
      if (e.gone || (roofs && e.y > CUT)) dummy.scale.set(0, 0, 0);
      else dummy.scale.set(e.w, AWM_H, AWM_D);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }
  if (wireGeo) {
    const pa = wireGeo.attributes.position.array;
    for (let i = 0, v = 0; i < pa.length; i += 3, v++) {
      const m = wireMeta[v],
        s = Math.sin(t * 1.9 + m[3]) * 0.14 * m[0] * wnd;
      pa[i] = wireBase[i] + m[1] * s;
      pa[i + 1] = wireBase[i + 1] + Math.cos(t * 1.9 + m[3]) * 0.04 * m[0] * wnd;
      pa[i + 2] = wireBase[i + 2] + m[2] * s;
    }
    wireGeo.attributes.position.needsUpdate = true;
  }
  for (const bd of birds) {
    bd.a += dt * bd.w;
    const x = bd.cx + Math.cos(bd.a) * bd.r,
      z = bd.cz + Math.sin(bd.a) * bd.r,
      sg = Math.sign(bd.w);
    // rachas de aleteos y luego planeo: el aleteo entra y sale suave en vez de cambiar de golpe
    const want = Math.sin(t * 0.45 + bd.ph) > 0.2 ? 1 : 0;
    bd.amp += (want - bd.amp) * Math.min(1, dt * 1.8);
    bd.wp += dt * (7.5 + 2.5 * bd.amp);
    if (bd.k < 0) {
      const s_ = birdTake(1);
      if (!s_) continue;
      bd.k = s_[0];
    }
    const [a1, a2] = wingBeat(bd.wp, bd.amp),
      lift = Math.sin(bd.wp - 1.2) * 0.05 * bd.amp;
    birdPut(
      bd.k,
      x,
      bd.y + Math.sin(t * 0.6 + bd.ph) * 0.6 + lift,
      z,
      Math.atan2(-Math.sin(bd.a) * sg, Math.cos(bd.a) * sg),
      0.06 - 0.1 * bd.amp,
      -0.3 * sg,
      a1,
      a2,
      0,
      bd.sc
    );
  }
  birdFlush();
  for (const o of ORBITS) {
    o.a += dt * o.w;
    const x = o.x + Math.cos(o.a) * o.rx,
      z = o.z + Math.sin(o.a) * o.rz,
      vx = -Math.sin(o.a) * o.rx * o.w,
      vz = Math.cos(o.a) * o.rz * o.w;
    o.h.g.position.set(x, o.alt + Math.sin(t * 0.4 + o.a) * 0.4, z);
    o.h.g.rotation.set(0.08, Math.atan2(vx, vz), Math.sign(o.w) * -0.2, 'YXZ');
    o.h.rotor.rotation.y += dt * (o.lb ? 26 : 17);
    if (o.h.tail) o.h.tail.rotation.x += dt * 42;
    rotorWash(x, z, o.alt, dt, o.lb ? 0.4 : 0.7);
  }
  if (heli) {
    const h = heli;
    h.a += dt * h.w;
    const x = h.cx + Math.cos(h.a) * h.R,
      z = h.cz + Math.sin(h.a) * h.R;
    rotorWash(x, z, h.alt, dt, 0.75);
    h.g.position.set(x, h.alt + Math.sin(t * 0.5) * 0.5, z);
    h.g.rotation.set(0.07 + Math.sin(t * 0.4) * 0.02, Math.atan2(-Math.sin(h.a), Math.cos(h.a)), 0.17, 'YXZ');
    h.rotor.rotation.y += dt * 17;
    h.tail.rotation.x += dt * 42;
    h.beacon.intensity = (t * 1.3) % 1 < 0.12 ? 1.6 + nightF * 2 : 0;
    if (AC && rotorGain) {
      const d = Math.hypot(x - camS.tx, z - camS.tz);
      rotorGain.gain.setTargetAtTime(soundOn ? Math.max(0, 1 - d / 55) * 0.22 : 0, AC.currentTime, 0.1);
    }
  } else if (AC && rotorGain && !FLIGHT.on && !SCRIPTED.length && !AIRBG) {
    let v = 0;
    for (const o of ORBITS)
      if (!o.lb) {
        const d = Math.hypot(o.h.g.position.x - camS.tx, o.h.g.position.z - camS.tz);
        v = Math.max(v, Math.max(0, 1 - d / 70) * 0.42);
      }
    rotorGain.gain.setTargetAtTime(soundOn ? v : 0, AC.currentTime, 0.3);
  }
}
let rotorGain = null;
function startRotorSound() {
  if (AC && !SND)
    try {
      sndInit();
    } catch (e) {}
}
