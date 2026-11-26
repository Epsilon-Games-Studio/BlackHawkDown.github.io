/* ====================================================================================================
 * world/ground.js
 *
 * El suelo: una única textura pintada y continua
 * ================================================================================================== */

function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const i = Math.floor(x),
    j = Math.floor(y),
    fx = x - i,
    fy = y - j,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j),
    b = hash2(i + 1, j),
    c = hash2(i, j + 1),
    d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) =>
  vnoise(x, y) * 0.5 + vnoise(x * 2.03 + 7.1, y * 2.03 + 3.3) * 0.3 + vnoise(x * 4.1 + 1.7, y * 4.1 + 9.2) * 0.2;
/* ----------------------------------------------------------------------------------------------------
 * LA CIUDAD Y LA REGIÓN ===================
 * Una rejilla táctica de 768 x 768 contiene la ciudad (1 unidad = 1,5 m). Alrededor, la región baja hacia el suroeste
 * por la costa hasta el aeropuerto y la base de la Task Force Ranger. Todo se planifica una vez (calles, parcelas,
 * edificios clave, carreteras, aldeas) pero solo se convierte en 3D, chunk a chunk, cuando la cámara se acerca.
 * -------------------------------------------------------------------------------------------------- */
const CS = 32; // tamaño de chunk en unidades
const WB = { x0: -1500, x1: 900, z0: -160, z1: 1700 };
const COAST_DX = 0.866,
  COAST_DZ = -0.5,
  COAST_NX = 0.5,
  COAST_NZ = 0.866;
// distancia con signo a la orilla, positiva mar adentro (el Índico queda al sureste)
function coastS(x, z) {
  const u = x * COAST_DX + z * COAST_DZ;
  return (x + 1200) * COAST_NX + (z - 1500) * COAST_NZ + 18 * Math.sin(u * 0.006) + 9 * Math.sin(u * 0.017 + 1.0);
}
const AIR = { x: -1100, z: 1330 },
  AIR_RY = Math.PI / 6;
const AIRP = (u, v) => [AIR.x + COAST_DX * u + COAST_NX * v, AIR.z + COAST_DZ * u + COAST_NZ * v];
function airUV(x, z) {
  const dx = x - AIR.x,
    dz = z - AIR.z;
  return [dx * COAST_DX + dz * COAST_DZ, dx * COAST_NX + dz * COAST_NZ];
}
const ROADS = [
  {
    w: 7,
    paved: true,
    n: 'Carretera del aeropuerto',
    pts: [AIRP(184.7, -105), AIRP(225, -105), [-700, 930], [-450, 800], [-200, 680], [0, 590], [150, 512], [330, 410]]
  },
  {
    w: 5,
    pts: [
      [-1000, 1338],
      [-760, 1196],
      [-500, 1050],
      [-250, 905],
      [0, 761],
      [200, 646],
      [400, 530],
      [530, 455]
    ]
  },
  {
    w: 5,
    pts: [
      [0, 256],
      [-300, 300],
      [-700, 420],
      [-1100, 500],
      [-1450, 560]
    ]
  },
  {
    w: 4,
    pts: [
      [256, 0],
      [150, -80],
      [-200, -140]
    ]
  },
  {
    w: 4,
    pts: [
      [-450, 800],
      [-560, 660],
      [-650, 500]
    ]
  },
  {
    w: 4,
    pts: [
      [-880, 1010],
      [-1000, 760]
    ]
  },
  {
    w: 4,
    pts: [
      [-200, 680],
      [-60, 760]
    ]
  }
];
const VILLAGES = [
  { x: -880, z: 1010, r: 45, n: 30, nm: 'Lafoole' },
  { x: -560, z: 860, r: 35, n: 22, nm: 'Siinka Dheer' },
  { x: -330, z: 930, r: 40, n: 26, fish: true, nm: 'Jasiira' },
  { x: -150, z: 640, r: 30, n: 18, nm: 'Ex Control Afgooye' },
  { x: -650, z: 500, r: 40, n: 26, nm: 'Garasbaley' },
  { x: -320, z: 330, r: 35, n: 22, nm: 'Daynile' },
  { x: -1000, z: 760, r: 35, n: 20, nm: 'Elasha Biyaha' },
  { x: -60, z: 760, r: 30, n: 18, fish: true, nm: 'Dharkenley (afueras)' }
];
// barrios de Mogadiscio, colocados como están respecto a los sitios clave de la batalla
const DISTRICTS = [
  ['HAWL WADAAG', 192, 232],
  ['HODAN', 105, 330],
  ['WARDHIGLEY', 265, 150],
  ['YAQSHID', 330, 62],
  ['HELIWA', 150, 58],
  ['KARAAN', 590, 80],
  ['ABDIAZIZ', 650, 215],
  ['SHIBIS', 455, 205],
  ['BONDHERE', 530, 300],
  ['SHINGANI', 560, 372],
  ['HAMAR WEYNE', 440, 420],
  ['HAMAR JABJAB', 372, 520],
  ['WABERI', 250, 470],
  ['WADAJIR', 140, 570],
  ['DHARKENLEY', 60, 430]
];
const LM = {
  hotel: { n: 'Hotel Olympic', x: OX + 40.5, z: OZ + 18.5 },
  target: { n: 'Edificio objetivo', x: OX + 43.5, z: OZ + 5 },
  cross: { n: 'Cruce (misión 1)', x: OX + 32, z: OZ + 32 },
  bakara: { n: 'Mercado de Bakara', x: 180, z: 266 },
  s61: { n: 'Super 6-1 derribado', x: 377, z: 302 },
  s64: { n: 'Super 6-4 derribado', x: 271, z: 360 },
  k4: { n: 'Rotonda K-4', x: 330, z: 410 },
  arch: { n: 'El Arco', x: 373.5, z: 288.6 },
  stadium: { n: 'Estadio · base paquistaní', x: 415, z: 62 },
  oldtown: { n: 'Hamar Weyne', x: 425, z: 385 },
  port: { n: 'Puerto nuevo', x: 600, z: 428 },
  air: { n: 'Aeropuerto · base TFR', x: AIR.x, z: AIR.z },
  villa: { n: 'Villa Somalia', x: 468, z: 318 }
};
const STADIUM = { x: 415, z: 62, rx: 38, rz: 30 };
// dentro del óvalo del estadio (gradas incluidas)
const inStadium = (x, z) => ((x - STADIUM.x) / STADIUM.rx) ** 2 + ((z - STADIUM.z) / STADIUM.rz) ** 2 < 1;
const MILE_X = 415; // la Milla: desde la carretera del K-4 hacia el norte hasta la puerta del estadio
const BAKARA = { x0: 140, x1: 216, y0: 226, y1: 306 },
  SHANTY = { x0: 262, x1: 300, y0: 336, y1: 380 },
  OLDTOWN = { x0: 370, x1: 470, y0: 330, y1: 430 };
const OLDW = [0xf2eee4, 0xebe4d2, 0xe6dccb, 0xf0e8d8, 0xdfe2dc];
