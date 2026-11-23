/* ====================================================================================================
 * missions/common/spawn.js
 *
 * Datos de las misiones
 * ================================================================================================== */

'use strict';

function spawnM1() {
  const posts = [
    [41, 29],
    [41, 34],
    [30, 23],
    [34, 23],
    [30, 40],
    [34, 40]
  ];
  const rifles = [
    [46, 25],
    [44, 40],
    [40, 46],
    [47, 32],
    [22, 20],
    [18, 46],
    [33, 48],
    [26, 12],
    [48, 14]
  ];
  posts.forEach(p => foe(OX + p[0], OZ + p[1], 'post'));
  rifles.forEach(p => foe(OX + p[0], OZ + p[1], 'rifle'));
}
function spawnDay() {
  // a lo largo de Hawlwadig, en el cruce de Warshadaha y alrededor del derribo
  for (const p of [
    [251, 222],
    [261, 214],
    [250, 204],
    [262, 196],
    [252, 186]
  ])
    foe(p[0], p[1], 'post', 'g1');
  for (const p of [
    [266, 226],
    [246, 210],
    [267, 200],
    [244, 192]
  ])
    foe(p[0], p[1], 'rifle', 'g1');
  for (const p of [
    [250, 163],
    [262, 173],
    [256, 158],
    [265, 163],
    [248, 174]
  ])
    foe(p[0], p[1], 'post', 'g2');
  for (const p of [
    [240, 168],
    [272, 168],
    [256, 150]
  ])
    foe(p[0], p[1], 'rifle', 'g2');
  for (const p of [
    [299, 199],
    [315, 209],
    [303, 215],
    [311, 195]
  ])
    foe(p[0], p[1], 'post', 'g3');
  for (const p of [
    [294, 190],
    [320, 198],
    [311, 224],
    [298, 226],
    [325, 212]
  ])
    foe(p[0], p[1], 'rifle', 'g3');
}
function spawnNight() {
  for (const p of [
    [330, 190],
    [284, 222],
    [288, 182]
  ])
    foe(p[0], p[1], 'rifle', 'probe');
}
/* ----------------------------------------------------------------------------------------------------
 * CAMPAÑA · la batalla del 3 y 4 de octubre de 1993, misión a misión, tal como la cuenta la cronología
 * -------------------------------------------------------------------------------------------------- */
let CONVOYS = [],
  SCRIPTED = [],
  ORBITS = [];
const RSPEC = { look: 'ranger', spd: 2.4, supRes: 0.6, reloadDur: 2.3 },
  DSPEC = { look: 'delta', spd: 2.7, supRes: 0.45, reloadDur: 1.8 };
const chalkSpecs = k => RANGERS.map((s, i) => Object.assign({}, s, RSPEC, { name: IR_NAMES[k][i] }));
const deltaSpecs = (n, names) =>
  DELTA.concat(IR_DELTA_X)
    .slice(0, n)
    .map((s, i) => Object.assign({}, s, DSPEC, names && names[i] ? names[i] : {}));
const rangerSpecs = names => names.map((n, i) => Object.assign({}, RANGERS[i % 6], RSPEC, { name: n }));
const CAMP_ESPEC = { acc: 0.2, hp: 80 };
