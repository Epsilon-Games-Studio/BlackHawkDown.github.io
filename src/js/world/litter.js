/* ====================================================================================================
 * world/litter.js
 *
 * Basura: hojas de papel, bolsas de plástico y envoltorios tirados por las calles. El viento los arrastra y les da la vuelta de vez en cuando;
 * bajo un helicóptero bajo salen despedidos girando hacia fuera del rotor. Los que quedan lejos de la vista se vuelven a poner cerca.
 * ================================================================================================== */

'use strict';

let HELI_NEAR = [],
  litter = null,
  litterB = null,
  LIT = [];
const litSet = (o, k, mx) => {
  if (o.bot) {
    if (litterB) litterB.setMatrixAt(o.bi, mx);
  } else litter.setMatrixAt(k, mx);
};
const LIT_N = 1100,
  _lm = new T.Object3D(),
  _lc2 = new T.Color();
const LIT_COL = [
  0xf4f3f0, 0xeceae6, 0xe2e0dc, 0xd6d4d0, 0xc8c6c2, 0xb8b6b2, 0xa6a4a0, 0x949290, 0x82807e, 0x6e6c6a, 0x5a5856, 0xfafaf8
]; // solo blancos y grises
function litterSpot(o, cx, cz, R) {
  for (let k = 0; k < 12; k++) {
    const x = cx + rr(-R, R),
      z = cz + rr(-R, R),
      i = Math.floor(x),
      j = Math.floor(z);
    if (inB(i, j) && grid[idx(i, j)] !== 1 && grid[idx(i, j)] !== 3 && !(coastS(x, z) > -3)) {
      o.x = x;
      o.z = z;
      o.y = 0.02;
      o.vx = o.vz = o.vy = 0;
      o.air = 0;
      return true;
    }
  }
  return false;
}
function makeLitter() {
  const geo = new T.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  litter = new T.InstancedMesh(geo, new T.MeshLambertMaterial({ side: T.DoubleSide }), LIT_N);
  litter.instanceMatrix.setUsage(T.DynamicDrawUsage);
  litter.frustumCulled = false;
  litter.receiveShadow = true;
  world.add(litter);
  LIT = [];
  const LB_ = MIS && MIS.litter && MIS.litter.big ? 1.45 : 1; // una misión puede pedir más basura y más grande (papeles, bolsas, cartones)
  for (let k = 0; k < LIT_N; k++) {
    const bag = rnd() < 0.25,
      q = rnd(),
      sc = (q < 0.45 ? rr(0.45, 0.8) : q < 0.85 ? rr(0.85, 1.2) : rr(1.4, 2.3)) * LB_, // de todos los tamaños: trocitos, hojas y alguna grande
      o = {
        sx: (bag ? rr(0.22, 0.34) : rr(0.13, 0.24)) * sc,
        sz: (bag ? rr(0.2, 0.3) : rr(0.17, 0.3)) * sc,
        ry: rnd() * 6.28,
        rx: 0,
        rz: 0,
        wr: rr(-6, 6),
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        air: 0,
        gust: rr(0, 9),
        bag
      };
    LIT.push(o);
    litter.setColorAt(k, _lc2.setHex(bag ? pick([0x4a4a4a, 0x6a6a6a, 0x8c8c8c, 0xd8d8d8, 0xf0f0f0]) : pick(LIT_COL)));
  }
  litter.instanceColor.needsUpdate = true;
  LIT.placed = false;
  // solo uso una de cada dos piezas (las tiradas se hacen para todas): de las que no uso, una de cada cuatro es una botella de plástico
  let nb = 0;
  LIT.forEach((o, k) => {
    litter.setMatrixAt(k, ZERO_M);
    if (k % 2) {
      if (k % 16 === 1) {
        o.bot = true;
        o.bi = nb++;
        o.bag = false;
        o.sx = o.sz = 0.9 + (k % 5) * 0.06;
      } else o.skip = true;
    } else if (k % 4 === 2) o.skip = true;
  }); // y quito la mitad de los papeles: las calles estaban demasiado sucias
  litterB = null;
  const NB = nb,
    lmB = litter;
  withModel('junk2', M_ => {
    if (lmB !== litter) return;
    const m = new T.InstancedMesh(M_.geos.bottle, new T.MeshLambertMaterial({ map: M_.mat.map }), NB);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = true;
    for (let k = 0; k < NB; k++) {
      m.setMatrixAt(k, ZERO_M);
      m.setColorAt(k, tmpCol.setHex([0xffffff, 0xe6f2ec, 0xdce6f2, 0xf2ead6][k % 4]));
    }
    m.instanceColor.needsUpdate = true;
    world.add(m);
    litterB = m;
  });
  const lm = litter;
  withModel('paper', M_ => {
    if (lm !== litter) return;
    const g = M_.geos.paper.clone();
    g.scale(1 / 0.18, 1, 1 / 0.24);
    g.setAttribute(
      'normal',
      new T.Float32BufferAttribute(
        new Float32Array(g.attributes.position.count * 3).map((v, i) => (i % 3 === 1 ? 1 : 0)),
        3
      )
    );
    {
      const P_ = g.attributes.position,
        I_ = g.index.array;
      for (let t = 0; t < I_.length; t += 3) {
        const a = I_[t],
          b = I_[t + 1],
          c = I_[t + 2]; // todas boca arriba: nada de reversos oscuros
        const ux = P_.getX(b) - P_.getX(a),
          uz = P_.getZ(b) - P_.getZ(a),
          vx = P_.getX(c) - P_.getX(a),
          vz = P_.getZ(c) - P_.getZ(a);
        if (uz * vx - ux * vz < 0) {
          I_[t + 1] = c;
          I_[t + 2] = b;
        }
      }
      g.index.needsUpdate = true;
    }
    lm.geometry = g;
    lm.material.map = M_.mat.map;
    lm.material.needsUpdate = true;
  });
}
function updLitter(dt, t) {
  if (MIS && MIS.id === 'attract') return;
  updLife(dt, t);
  if (!litter || !world || litter.parent !== world || dt <= 0) return;
  const hh = halfH(),
    R = hh * 1.7,
    cx = camS.tx,
    cz = camS.tz,
    wnd = windAt(t),
    wx = 0.9,
    wz = 0.35;
  if (LIT.blast) {
    LIT.blast.t += dt;
    if (LIT.blast.t > 2) LIT.blast = null;
  }
  if (!LIT.placed) {
    LIT.placed = true;
    const F = MIS && MIS.litter;
    LIT.forEach((o, k) => {
      if (F && k % 3 !== 0) litterSpot(o, F.x, F.z, F.r);
      else litterSpot(o, cx, cz, R);
    });
  }
  const act = G && G.m && G.m.noLitter ? 0 : Math.round(LIT_N * clamp((R / 37) * (R / 37), 0.45, 1)); // una misión puede pedir el suelo limpio
  for (let k = 0; k < LIT_N; k++) {
    const o = LIT[k];
    if (o.skip) continue;
    if (k >= act) {
      if (!o.off) {
        o.off = true;
        litSet(o, k, ZERO_M);
      }
      continue;
    }
    if (o.off) {
      o.off = false;
      if (!litterSpot(o, cx, cz, R)) o.y = -50;
    }
    if (Math.abs(o.x - cx) > R * 1.25 || Math.abs(o.z - cz) > R * 1.25) {
      if (!litterSpot(o, cx, cz, R)) o.y = -50;
    }
    // viento: cada pocos segundos una racha levanta las piezas más ligeras y las arrastra a favor del viento, dándoles la vuelta
    o.gust -= dt * (0.6 + wnd);
    if (o.gust <= 0) {
      o.gust = rr(3, 11);
      if (rnd() < 0.55 * wnd) {
        const f = (o.bag ? 1.6 : 1) * rr(0.8, 2.2) * wnd;
        o.vx += wx * f;
        o.vz += wz * f + rr(-0.4, 0.4);
        o.vy += rr(0.3, 1.2) * (o.bag ? 1.5 : 1);
        o.wr = rr(-9, 9);
      }
    }
    // el frente de arena pasando: un empujón a favor del viento y un poco de elevación cuando llega a la pieza, y luego un empuje constante mientras pasa el polvo
    const SW = sandWave;
    if (SW) {
      const d = (o.x - SW.cx) * SW_DX + (o.z - SW.cz) * SW_DZ - SW.p;
      const ac = (o.x - SW.cx) * -SW_DZ + (o.z - SW.cz) * SW_DX;
      if (d < 0 && d > -10 && Math.abs(ac) < SW.W + 0.5) {
        if (o.sw !== SW.id && d > -2.5) {
          o.sw = SW.id;
          const f = rr(1.6, 3.4) * (o.bag ? 1.5 : 1) * (o.bot ? 0.55 : 1);
          o.vx += SW_DX * f;
          o.vz += SW_DZ * f + rr(-0.3, 0.3);
          o.vy += rr(0.25, 0.9) * (o.bot ? 0.35 : 1) * (o.bag ? 1.4 : 1);
          o.wr = rr(-12, 12);
        }
        const a = dt * (o.bot ? 1.2 : 2.4) * (1 + d / 10);
        o.vx += SW_DX * a;
        o.vz += SW_DZ * a;
      }
    }
    // una onda expansiva: sale despedida hacia arriba y hacia fuera cuando el anillo llega a la pieza
    const bl = LIT.blast;
    if (bl && o.bh !== bl.id) {
      const dx = o.x - bl.x,
        dz = o.z - bl.z,
        d = Math.hypot(dx, dz);
      if (d < 38 && d < bl.t * 26) {
        o.bh = bl.id;
        const f = 1 - d / 38;
        o.vx += (dx / (d + 0.3)) * f * rr(10, 16);
        o.vz += (dz / (d + 0.3)) * f * rr(10, 16);
        o.vy += f * rr(3, 7);
        o.wr = rr(-30, 30);
      }
    }
    // el rebufo del rotor: soplada con fuerza hacia fuera y hacia arriba bajo cualquier helicóptero que vuele bajo
    for (const h of HELI_NEAR) {
      const dx = o.x - h[0],
        dz = o.z - h[2],
        d = Math.hypot(dx, dz),
        alt = h[1];
      if (alt > 26 || d > 22) continue;
      const s = (1 - alt / 26) * (1 - d / 22);
      if (s <= 0) continue;
      const a = s * dt * (o.bag ? 34 : 26);
      o.vx += (dx / (d + 0.3)) * a;
      o.vz += (dz / (d + 0.3)) * a;
      o.vy += a * rr(0.3, 0.9);
      o.wr += rr(-30, 30) * s * dt * 4;
    }
    // la estela de un vehículo en marcha: sale despedida hacia arriba, hacia los lados y arrastrada detrás de él
    for (const C of CONVOYS) {
      if (C.v < 0.4) continue;
      const sp = Math.min(1.5, C.v / 2.2);
      for (const v of C.veh) {
        const dx = o.x - v.x,
          dz = o.z - v.z,
          d = Math.hypot(dx, dz);
        if (d > 4.5) continue;
        const ry = v.g ? v.g.rotation.y : 0,
          s = (1 - d / 4.5) * sp,
          a = s * dt * 22,
          fx = v.fx || 0,
          fz = v.fz || 0;
        o.vx += ((dx / (d + 0.3)) * 0.8 + fx * 0.9) * a;
        o.vz += ((dz / (d + 0.3)) * 0.8 + fz * 0.9) * a;
        o.vy += a * rr(0.35, 0.8);
        o.wr += rr(-30, 30) * s * dt * 3;
      }
    }
    // vuelo y asentado
    if (o.y > 0.021 || o.vy > 0 || Math.abs(o.vx) + Math.abs(o.vz) > 0.02) {
      o.vy -= (o.bag ? 2.2 : 3.4) * dt;
      o.vy *= 1 - 1.2 * dt;
      o.vx *= 1 - (o.y > 0.05 ? 0.6 : 3.5) * dt;
      o.vz *= 1 - (o.y > 0.05 ? 0.6 : 3.5) * dt;
      o.vy = Math.min(o.vy, 5.5);
      o.vx = clamp(o.vx, -13, 13);
      o.vz = clamp(o.vz, -13, 13);
      const nx = o.x + o.vx * dt,
        nz = o.z + o.vz * dt;
      const i = Math.floor(nx),
        j = Math.floor(nz);
      if (inB(i, j) && grid[idx(i, j)] === 1 && o.y < (topH[idx(i, j)] || 3)) {
        o.vx *= -0.3;
        o.vz *= -0.3;
      } else {
        o.x = nx;
        o.z = nz;
      }
      o.y += o.vy * dt;
      if (o.y < 0.02) {
        o.y = 0.02;
        o.vy = 0;
      }
      o.ry += o.wr * dt * 0.4;
      o.rx = o.y > 0.05 ? Math.sin(t * o.wr * 0.7 + k) * 1.1 : o.rx * 0.9;
      o.rz = o.y > 0.05 ? Math.cos(t * o.wr * 0.5 + k) * 0.8 : o.rz * 0.9;
      o.wr *= 1 - 0.5 * dt;
    }
    _lm.position.set(o.x, o.y, o.z);
    _lm.rotation.set(o.rx, o.ry, o.rz);
    _lm.scale.set(o.sx, o.bot ? o.sx : 1, o.sz);
    _lm.updateMatrix();
    litSet(o, k, _lm.matrix);
  }
  litter.instanceMatrix.needsUpdate = true;
  if (litterB) litterB.instanceMatrix.needsUpdate = true;
}
