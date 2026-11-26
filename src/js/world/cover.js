/* ====================================================================================================
 * world/cover.js
 *
 * Objetos que dan cobertura
 * ================================================================================================== */

const COVER_HP = { wall: 40, crates: 18, stall: 18 }; // disparos de fusil que aguanta un murete, una pila de cajas o un puesto del mercado antes de venirse abajo
const COVER_VAL = {
  sandbag: 0.72,
  barrier: 0.75,
  wall: 0.6,
  car: 0.5,
  van: 0.55,
  pickup: 0.5,
  bus: 0.6,
  barrel: 0.35,
  rubble: 0.55,
  crates: 0.55,
  tires: 0.4,
  stall: 0.35,
  tree: 0.3,
  fountain: 0.7
};
const LEN = { car: 3, van: 3, pickup: 3, bus: 3 };
function vpart(cx, cz, rot, lx, ly, lz, sx, sy, sz, c, ex) {
  const cs = Math.cos(rot),
    sn = Math.sin(rot);
  B(cx + lx * cs + lz * sn, ly, cz - lx * sn + lz * cs, sx, sy, sz, c, Object.assign({ ry: rot }, ex || {}));
}
function vwheel(cx, cz, rot, lx, lz, r) {
  const cs = Math.cos(rot),
    sn = Math.sin(rot);
  C(cx + lx * cs + lz * sn, r, cz - lx * sn + lz * cs, r, 0.16, 0x1d1c1a, {
    rx: Math.PI / 2,
    ry: rot,
    ord: 'YXZ',
    m: M.WHEEL
  });
}
const VEH_KIND = { car: 1, van: 1, pickup: 1, bus: 1 };
let NOVEH = null;
function noVehPlan() {
  NOVEH = new Uint8Array(W * H);
  const lines = [
    [
      [256.5, 180],
      [256.5, 500]
    ], // Hawlwadig: las columnas de las misiones 1 a 3 y la de Irene
    CV_RT,
    M9_ROUTE, // el convoy perdido y la columna de rescate
    [
      [MILE_X + 0.5, 85],
      [MILE_X + 0.5, 410.5],
      [338, 410.5]
    ], // la Milla y la carretera del K-4: todo el asfalto
    ROADS[0].pts, // la carretera del aeropuerto (la columna de Struecker)
    [
      [380, 320.5],
      [318, 320.5]
    ],
    [
      [438, 168.5],
      [425, 168.5]
    ]
  ]; // por donde circulan las técnicas
  const HW_ = 4.3;
  for (const L_ of lines)
    for (let k = 1; k < L_.length; k++) {
      const a = L_[k - 1],
        b = L_[k];
      const i0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - HW_ - 1)),
        i1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0]) + HW_ + 1));
      const j0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - HW_ - 1)),
        j1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1]) + HW_ + 1));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) if (segDist(i + 0.5, j + 0.5, a, b) < HW_) NOVEH[idx(i, j)] = 1;
    }
  const disc = (x, z, r) => {
    for (let j = Math.floor(z - r); j <= z + r; j++)
      for (let i = Math.floor(x - r); i <= x + r; i++)
        if (inB(i, j) && Math.hypot(i + 0.5 - x, j + 0.5 - z) < r) NOVEH[idx(i, j)] = 1;
  };
  disc(330, 410, 21); // la rotonda
  disc(LM.s64.x, LM.s64.z, 16);
  disc(274.5, 345, 15); // el derribo de Durant, y donde el Super 6-2 deja a Shughart y Gordon
  for (let j = 330; j <= 360; j++)
    for (let i = 258; i <= 292; i++) if (inPoly(S62_CLEAR, i + 0.5, j + 0.5)) NOVEH[idx(i, j)] = 1;
}
// cada coche tira de su propio generador (con semilla según dónde está), así el modelo y la pintura no mueven nada más de la ciudad
function vehRnd(i, j) {
  let v = (Math.imul(i, 2654435761) ^ Math.imul(j, 40503) ^ 0x2545f491) >>> 0;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}
const VEH_DIM = { car_topaz: [2.9, 1.19, 0.92], car_kcar: [2.95, 1.14, 0.84], car_wreck: [2.84, 1.28, 1.0] }; // largo, ancho, alto
// solo colores gastados: blancos sucios y amarillentos, grises desvaídos y marrones oscuros; nada chillón
const VEH_PAINT = [
  0xeae5d9, 0xdfd9cb, 0xd2cbbb, 0xe4ded0, 0xc9c2b2, 0xa3a19a, 0x8d8b85, 0x77756f, 0xb6b4ac, 0x5c4434, 0x4c382b, 0x664c3a
];
