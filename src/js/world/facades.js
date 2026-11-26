/* ====================================================================================================
 * world/facades.js
 *
 * Lo que va pegado a las fachadas: aires acondicionados, ventanas (modelos subidos) y toldos.
 * ================================================================================================== */

/* ayudante de fachadas: cara 0 N(z=y) 1 S(z=y+d) 2 O(x=x) 3 E(x=x+w) */
// un aparato de aire acondicionado en una fachada (del pack subido): de espaldas a la pared, con los ventiladores hacia fuera
function acUnit(F, t, y0) {
  const f = F.face,
    h = phs(F.x + t * 1.3, F.y + y0 * 7.1, 31),
    part = 'ac' + (1 + (Math.floor(h * 4) % 4)),
    o = 0.012;
  let x, z, ry;
  if (f === 0) {
    x = F.x + t;
    z = F.y - o;
    ry = Math.PI;
  } else if (f === 1) {
    x = F.x + t;
    z = F.y + F.d + o;
    ry = 0;
  } else if (f === 2) {
    x = F.x - o;
    z = F.y + t;
    ry = -Math.PI / 2;
  } else {
    x = F.x + F.w + o;
    z = F.y + t;
    ry = Math.PI / 2;
  }
  prop('junk2', part, x, y0, z, ry, 1, [0xffffff, 0xf2ece0, 0xe4dccc][Math.floor(h * 37) % 3]);
}
/* Un toldo de tienda: la lona vieja que subí (sin estructura), colgada lo bastante alta para que un soldado pase por debajo
   sin meter la cabeza. Arriba toca la pared en AWM_Y y cae AWM_H hasta la punta del faldón, AWM_D separado de la pared.
   Las balas chocan con una placa fina e invisible con la misma pendiente (va en la rejilla de impactos como las cajas de antes). */
/* Ventanas: los modelos subidos, horneados a una cara frontal con algo de fondo; el cristal del juego queda detrás, metido,
   para que siga reflejando y rompiéndose con los disparos. Cada edificio tiene un diseño y un color de marco (pintura vieja
   y quemada por el sol, elegida para que destaque de sus paredes); de vez en cuando una está rota (cuarto oscuro detrás) o con las persianas cerradas. */
const WIN_M = {
  b04: { asp: 1.2546, gb: [-0.4509, -0.4353, 0.4462, 0.4764] },
  b05: { asp: 1.2546, gb: [-0.4509, -0.4353, 0.4462, 0.4764] },
  vint: { asp: 1.2018, gb: null },
  office: { asp: 1.2424, gb: [-0.4002, -0.4777, 0.4225, 0.4804] },
  w2: { asp: 0.9572, gb: [-0.4254, -0.4209, 0.4263, 0.4209] },
  w1: { asp: 1.4243, gb: [-0.4035, -0.4175, 0.4036, 0.4297] }
};
const WIN_W = 0.58,
  WIN_TINT = [0x6f8f8a, 0x7f98a6, 0x8d9876, 0x9c6e50, 0xc4a46e, 0xe4dccb, 0x8e7658, 0xa66e5c, 0xaaa496];
const hexLum = c => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.55 + (c & 255) * 0.15) / 255;
function winStyle(bx, bz, wall, hotel) {
  const h = phs(bx, bz, 61),
    des = hotel
      ? h < 0.5
        ? 'office'
        : 'w2'
      : ['b05', 'w2', 'w1', 'office', 'b05', 'w1', 'w2', 'vint'][Math.floor(h * 8)];
  const L = hexLum(wall),
    pal = WIN_TINT.filter(c => Math.abs(hexLum(c) - L) > 0.12);
  return { des, tint: pal[Math.floor(phs(bx, bz, 62) * pal.length)] || 0x8e7658 };
}
function winModel(F, t, yy, S) {
  const f = F.face,
    wx = F.x + (f < 2 ? t : 0),
    wz = F.y + (f < 2 ? 0 : t),
    h = phs(wx + yy * 3.1, wz - yy * 1.7, 63),
    h2 = phs(wz, wx + yy, 64);
  let des = S.des;
  if (h < 0.08) des = 'b04';
  else if (h > 0.9 && des !== 'office') des = 'vint';
  const M_ = WIN_M[des],
    H_ = Math.min(0.8, WIN_W * M_.asp),
    o = -0.02; // metida en la piel del muro
  let x, z, ry;
  if (f === 0) {
    x = F.x + t;
    z = F.y - o;
    ry = Math.PI;
  } else if (f === 1) {
    x = F.x + t;
    z = F.y + F.d + o;
    ry = 0;
  } else if (f === 2) {
    x = F.x - o;
    z = F.y + t;
    ry = -Math.PI / 2;
  } else {
    x = F.x + F.w + o;
    z = F.y + t;
    ry = Math.PI / 2;
  }
  const col = new T.Color(S.tint).multiplyScalar(1.08 + h2 * 0.16).getHex();
  prop('w_' + des, 'f', x, yy, z, ry, WIN_W, col, { sy: H_ / WIN_W });
  if (des === 'b04') prop('w_b04g', 'f', x, yy, z, ry, WIN_W, 0xffffff, { sy: H_ / WIN_W });
  if (!M_.gb) return null;
  const g = M_.gb;
  return { w: (g[2] - g[0]) * WIN_W, h: (g[3] - g[1]) * H_, y: ((g[1] + g[3]) / 2) * H_, broken: des === 'b04' };
}
const AWM_Y = 1.64,
  AWM_H = 0.26,
  AWM_D = 0.6;
function awnModel(F, t, along, c, b) {
  if (GHOST) return;
  const f = F.face,
    tilt = 0.38;
  let x, z, ry;
  if (f === 0) {
    x = F.x + t;
    z = F.y;
    ry = Math.PI;
  } else if (f === 1) {
    x = F.x + t;
    z = F.y + F.d;
    ry = 0;
  } else if (f === 2) {
    x = F.x;
    z = F.y + t;
    ry = -Math.PI / 2;
  } else {
    x = F.x + F.w;
    z = F.y + t;
    ry = Math.PI / 2;
  }
  if (phs(x, z, 41) > 0.222) return; // solo unas tres tiendas de cada diez conservan el toldo
  FB(
    F,
    t,
    AWM_Y - 0.12,
    AWM_D * 0.5,
    along,
    0.04,
    AWM_D * 1.05,
    c,
    b,
    Object.assign(f === 0 ? { rx: -tilt } : f === 1 ? { rx: tilt } : f === 2 ? { rz: tilt } : { rz: -tilt }, {
      awn: 1,
      m: M.CLOTH,
      hid: 1
    })
  );
  (CUR || chunkFor(x, z)).AWM.push({ x, y: AWM_Y, z, ry, w: along, c, b, ph: Math.random() * 6.283 });
}
let AWM_MAT = null;
function buildAwnings(ch) {
  if (ch.aw) {
    let h = false;
    ch.AW.forEach((e, k) => {
      if (e.inv) {
        ch.aw.setMatrixAt(k, ZERO_M);
        h = true;
      }
    });
    if (h) ch.aw.instanceMatrix.needsUpdate = true;
  } // las placas de impacto no se pintan nunca, ni siquiera antes del primer frame
  if (!ch.AWM.length) return;
  withModel('awning', M_ => {
    if (ch.awm || !ch.group) return;
    if (!AWM_MAT) AWM_MAT = new T.MeshLambertMaterial({ map: M_.mat.map, side: T.DoubleSide });
    const m = new T.InstancedMesh(M_.geos.tarp, AWM_MAT, ch.AWM.length);
    m.castShadow = true;
    m.receiveShadow = false;
    m.frustumCulled = false;
    ch.AWM.forEach((e, k) => {
      m.setColorAt(k, tmpCol.setHex(e.c).multiplyScalar(1.15));
      dummy.position.set(e.x, e.y, e.z);
      dummy.rotation.set(0, e.ry, 0, 'YXZ');
      dummy.scale.set(e.w, AWM_H, AWM_D);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
    });
    m.instanceColor.needsUpdate = true;
    ch.awm = m;
    ch.group.add(m);
  });
}
function FB(F, t, yy, o, along, h, depth, c, b, extra) {
  const f = F.face;
  let x, z, sx, sz;
  if (f === 0) {
    x = F.x + t;
    z = F.y - o;
    sx = along;
    sz = depth;
  } else if (f === 1) {
    x = F.x + t;
    z = F.y + F.d + o;
    sx = along;
    sz = depth;
  } else if (f === 2) {
    x = F.x - o;
    z = F.y + t;
    sx = depth;
    sz = along;
  } else {
    x = F.x + F.w + o;
    z = F.y + t;
    sx = depth;
    sz = along;
  }
  B(x, yy, z, sx, h, sz, c, Object.assign({ b }, extra || {}));
}
function faceOpen(x, y, w, d, f) {
  const cells = [];
  if (f === 0) for (let i = x; i < x + w; i++) cells.push([i, y - 1]);
  if (f === 1) for (let i = x; i < x + w; i++) cells.push([i, y + d]);
  if (f === 2) for (let j = y; j < y + d; j++) cells.push([x - 1, j]);
  if (f === 3) for (let j = y; j < y + d; j++) cells.push([x + w, j]);
  return cells.filter(c => openArea(c[0], c[1])).length > cells.length / 2;
}
