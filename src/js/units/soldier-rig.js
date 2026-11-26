/* ====================================================================================================
 * units/soldier-rig.js
 *
 * Unidades: los esqueletos articulados de los soldados
 * ================================================================================================== */

const MAGS = { m16: 30, car: 30, m203: 30, dmr: 20, saw: 100, ak: 30 };
const RANGERS = [
  {
    name: 'Sgto. Reyes',
    role: 'Jefe · radio',
    gun: 'm16',
    kit: 'radio',
    acc: 0.62,
    burst: 3,
    cool: 1.2,
    supp: 14,
    ammo: 210,
    skin: 0xc48b63
  },
  {
    name: 'Cabo Walsh',
    role: 'Fusilero',
    gun: 'm16',
    kit: 'pack',
    acc: 0.6,
    burst: 3,
    cool: 1.2,
    supp: 13,
    ammo: 210,
    skin: 0xd8a77f
  },
  {
    name: 'Soto',
    role: 'Ametrallador M249',
    gun: 'saw',
    kit: 'pack',
    acc: 0.46,
    burst: 6,
    cool: 1.5,
    supp: 28,
    ammo: 600,
    skin: 0xb07a52
  },
  {
    name: 'Kim',
    role: 'Granadero M203',
    gun: 'm203',
    kit: 'none',
    acc: 0.6,
    burst: 3,
    cool: 1.2,
    supp: 13,
    ammo: 210,
    skin: 0xd9ad84
  },
  {
    name: 'Doyle',
    role: 'Tirador',
    gun: 'dmr',
    kit: 'pack',
    acc: 0.82,
    burst: 1,
    cool: 1.35,
    supp: 9,
    ammo: 150,
    skin: 0xe0b38e
  },
  {
    name: 'Price',
    role: 'Sanitario',
    gun: 'car',
    kit: 'medic',
    acc: 0.52,
    burst: 3,
    cool: 1.4,
    supp: 12,
    ammo: 180,
    skin: 0x8d5a3c,
    medic: true
  }
];
const DELTA = [
  {
    name: 'Sgto. 1º Paul Howe',
    role: 'Jefe de equipo',
    gun: 'car',
    kit: 'radio',
    acc: 0.76,
    burst: 3,
    cool: 1.0,
    supp: 14,
    ammo: 240,
    skin: 0xd4a27a
  },
  {
    name: 'Sgto. 1º Norm Hooten',
    role: 'Operador',
    gun: 'car',
    kit: 'hydra',
    acc: 0.74,
    burst: 3,
    cool: 1.0,
    supp: 13,
    ammo: 240,
    skin: 0xc48b63
  },
  {
    name: 'Sgto. 1º John Macejunas',
    role: 'Operador',
    gun: 'car',
    kit: 'hydra',
    acc: 0.74,
    burst: 4,
    cool: 1.0,
    supp: 16,
    ammo: 280,
    skin: 0xdcae88
  },
  {
    name: 'Sgto. 1º Earl Fillmore',
    role: 'Operador · brecha',
    gun: 'car',
    kit: 'breach',
    acc: 0.74,
    burst: 3,
    cool: 1.0,
    supp: 13,
    ammo: 240,
    skin: 0xe0b38e
  },
  {
    name: 'Sgto. Brad Hallings',
    role: 'Tirador',
    gun: 'car',
    kit: 'hydra',
    acc: 0.84,
    burst: 2,
    cool: 1.0,
    supp: 11,
    ammo: 240,
    skin: 0xd8a77f
  },
  {
    name: 'Sgto. 1º Kurt Schmid',
    role: 'Sanitario',
    gun: 'car',
    kit: 'medic',
    acc: 0.68,
    burst: 3,
    cool: 1.1,
    supp: 12,
    ammo: 200,
    skin: 0xa86e48,
    medic: true
  }
];
const SQUADS = {
  rangers: { list: RANGERS, look: 'ranger', spd: 2.4, supRes: 0.6, reload: 2.3 },
  delta: { list: DELTA, look: 'delta', spd: 2.7, supRes: 0.45, reload: 1.8 }
};
let squadType = 'rangers';

const unitMat = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x141414, shininess: 7 });
const _m4 = new T.Matrix4(),
  _q = new T.Quaternion(),
  _e = new T.Euler(),
  _v = new T.Vector3(),
  _sc = new T.Vector3(),
  _c = new T.Color(),
  _c2 = new T.Color();
/* Estampados de la ropa: se pintan por píxel desde las coordenadas locales de cada pieza, así el camuflaje y los cuadros se quedan pegados a la tela al moverse */
const UPT = {
  NONE: 0,
  DCU: 1,
  WDL: 2,
  CLOTH: 3,
  SKIN: 4,
  GUN: 5,
  LEATHER: 6,
  PLAID: 8,
  STRIPE: 9,
  WOOD: 10,
  WEB: 11,
  RUBBER: 12,
  HAIR: 13
};
const UNIT_FS_HEAD = `
uniform float uBumpU;
varying float vPat; varying vec3 vUP;
float uH(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float uN(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(uH(i), uH(i + vec3(1.0,0.0,0.0)), f.x), mix(uH(i + vec3(0.0,1.0,0.0)), uH(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(uH(i + vec3(0.0,0.0,1.0)), uH(i + vec3(1.0,0.0,1.0)), f.x), mix(uH(i + vec3(0.0,1.0,1.0)), uH(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
vec3 uPat(vec3 base, out float h){
  h = 0.0; int p = int(vPat + .5); vec3 q = vUP; vec3 c = base;
  if (p == 0) return c;
  float fold = uN(q * vec3(9.0, 26.0, 9.0) + 4.0);
  if (p == 1){
    float n1 = uN(q * vec3(13.0, 8.0, 13.0) + 3.0), n2 = uN(q * vec3(9.0, 6.0, 9.0) + 17.0), n3 = uN(q * vec3(18.0, 11.0, 18.0) + 31.0);
    if (n2 > .58) c = base * vec3(1.08, 1.08, 1.1) + vec3(.06);
    if (n3 > .66) c = base * vec3(.8, .8, .72);
    if (n1 > .64) c = base * vec3(.66, .58, .5);
    c *= .9 + fold * .16; h = fold * .8;
  } else if (p == 2){
    float n1 = uN(q * vec3(12.0, 8.0, 12.0) + 5.0), n2 = uN(q * vec3(10.0, 7.0, 10.0) + 23.0), n3 = uN(q * vec3(16.0, 9.0, 16.0) + 41.0);
    if (n2 > .6) c = vec3(.47, .44, .28);
    if (n1 > .57) c = vec3(.33, .26, .18);
    if (abs(n3 - .5) < .055) c = vec3(.12, .11, .1);
    c *= .9 + fold * .16; h = fold * .8;
  } else if (p == 3 || p == 11){
    c *= .9 + fold * .16 + (uH(floor(q * 90.0)) - .5) * .05;
    if (p == 11) c *= .95 + .07 * step(.5, fract(q.y * 55.0));
    h = fold * .6;
  } else if (p == 4){
    float n = uN(q * 30.0); c *= .93 + n * .1; h = n * .15;
  } else if (p == 5){
    c *= .85 + uN(q * 45.0) * .2;
    float wear = step(.9, uH(floor(q * 80.0))); c = mix(c, vec3(.42, .42, .4), wear * .45);
  } else if (p == 6){
    float n = uN(q * 36.0); c *= .8 + n * .3; h = n * .5;
  } else if (p == 8){
    float a = fract((q.x + q.z) * 11.0), b = fract(q.y * 11.0);
    c = base * (.7 + .2 * step(.55, a) + .2 * step(.55, b));
    float ln = clamp(step(.9, a) + step(.9, b), 0.0, 1.0);
    c = mix(c, min(base * 1.6 + .12, vec3(1.0)), ln * .7);
    c *= .92 + fold * .12; h = fold * .7;
  } else if (p == 9){
    c = base * (fract((q.x + q.z) * 9.0) > .5 ? 1.15 : .72); c *= .92 + fold * .12; h = fold * .7;
  } else if (p == 10){
    float g = uN(vec3(q.x * 70.0, q.y * 70.0, q.z * 7.0)); c *= .72 + g * .4; h = g * .3;
  } else if (p == 12){
    c *= .9 + uN(q * 50.0) * .15;
  } else if (p == 13){
    float hr = uH(floor(q * 120.0)); c *= .8 + hr * .35; h = hr * .3;
  }
  return c;
}
`;
const UNIT_FS_COLOR = `
#include <color_fragment>
float uHt = 0.0;
#ifdef USE_COLOR
if (vPat < .5 && vUP.y > 50.0) diffuseColor.rgb = mix(diffuseColor.rgb, vColor * diffuse, clamp(vUP.x, 0.0, 1.0));   // una pieza recoloreada de un soldado del modelo
#endif
diffuseColor.rgb = uPat(diffuseColor.rgb, uHt);
`;
const UNIT_FS_BUMP = `
#include <normal_fragment_begin>
if (vPat > .5){
  vec3 dsX = dFdx(-vViewPosition), dsY = dFdy(-vViewPosition);
  float dhx = dFdx(uHt) * uBumpU, dhy = dFdy(uHt) * uBumpU;
  vec3 dR1 = cross(dsY, normal), dR2 = cross(normal, dsX);
  float dDet = dot(dsX, dR1);
  vec3 dN = normalize(abs(dDet) * normal - sign(dDet) * (dhx * dR1 + dhy * dR2));
  normal = normalize(mix(normal, dN, .7));
}
`;
const UNIT_ON = { v: true };
unitMat.extensions = { derivatives: true };
unitMat.onBeforeCompile = sh => {
  if (!UNIT_ON.v) return;
  sh.uniforms.uBumpU = { value: 0.55 };
  sh.vertexShader =
    'attribute float aPat; attribute vec3 aLP; varying float vPat; varying vec3 vUP;\n' +
    sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPat = aPat; vUP = aLP;');
  let fs = UNIT_FS_HEAD + sh.fragmentShader.replace('#include <color_fragment>', UNIT_FS_COLOR);
  if (fs.indexOf('vViewPosition') >= 0) fs = fs.replace('#include <normal_fragment_begin>', UNIT_FS_BUMP);
  sh.fragmentShader = fs;
};
unitMat.customProgramCacheKey = () => 'unit' + (UNIT_ON.v ? 1 : 0);
detailMats.push(unitMat);
/* Los Rangers y los Delta son los modelos subidos, con skinning al esqueleto de los soldados: un atlas para los dos (y blanco para
   todos los que siguen hechos de piezas, así un solo material y un solo batch sirven para todos) */
const SOLD_TEX = (() => {
  const t = new T.TextureLoader().load(assetPng('soldiers'));
  t.flipY = false;
  t.anisotropy = 4;
  t.magFilter = T.LinearFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  return t;
})();
const SOLD_SRC = __INLINE__('data/soldados.json'),
  SOLD = {};
// la milicia y la gente de la calle: un modelo y doce texturas (celdas de 256 px a la derecha del atlas); los civiles llevan las que
// no tienen cananas. Cada hombre coge la siguiente en una rotación fija, así no se tira nada de la secuencia aleatoria del juego.
const MIL_ALL = [0, 1, 6, 7, 10, 2, 4, 3, 8, 5, 9, 11],
  CIV_TEX = [2, 3, 5, 8, 9, 11];
let MIL_N = 0,
  CIV_N = 0;
function milCell(k) {
  const e = 0.5 / 2048,
    f = 0.5 / 1024;
  return [0.5 + (k % 4) * 0.125 + e, Math.floor(k / 4) * 0.25 + f, 0.125 - 2 * e, 0.25 - 2 * f];
}
const SOLD_UV0 = [0.25, 0.75],
  SOLD_K = 1.15;
/* El modelo del Ranger, vértice a vértice: 1 casco, 2 chaleco (torso y cuello), 3 parte alta de la manga, 4 resto del brazo, 5 mano. Las tropas
   de la ONU lo llevan con el casco pintado de azul; los de la base van sin casco (recortado a una cabeza con el pelo corto) y sin chaleco
   (el torso metido hasta quedar en camisa): los soldados rasos en camiseta oliva con los brazos al aire y los oficiales con la guerrera del desierto */
const RG_CLS =
  '11111111111111111111111111111111111111101011111110000000011100000011111100000011111100000000000000000000100000000000000000000000000000000222222202200222223222222222233222332222322233222444332223222222222222226666666666666666666600060000000600066343343433433343334444444444444444444444444444444444444444444544444455454555454455555555555555555555555555545555555555555555555555555550000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001100011000000000444445555551111111111111111111111111111111110101111111000000111000000111111000000111111000000000000000000100000000000000000000000000002222202222222223222222233332222323322244334222222000226666662266666666666000000000606600033434334333433343444444444444444444444444444444444444444444444454445454554554455555555555555555555555555545555555555555555555555555555000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110001100000000444445555556666666666666666666666666666666666666666666622222222222220222222222222222222222224222222222244222222244442222222232322223233222223232222323222222322322222232222222222323222222222232332222222222222222222222222222222222222222222222222222222222222222223323232333323322323333326222222622266666622262222222222222222622622222622266666622262222222222226226222226222666666222622222222222262266222226622224466666622264232332222226226222446622222666666222622242244222462666666666666666666666666666666666666666666666666666666666600006666666666666600066660666600666600066660666666666600000006006666666666666666666666666666666666666666000066666666666666000666606666006666000666606666666666000000060066666666666666666666666666666600066666666600000600600666660066666666222222222222222222222222222222226666666666666622222222222222222222222222222222226666662222222222222222222222222222222200000000000000000000000000000000000000000000000000000000000000000000000044444444441111111111111111110111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111010000011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111000000012200220000000122002222222266666666666666666666666666666666666666666666666666666666666666662226222622262226222622262226222622262226222622262226222662226222622222222222222222222222222222222222222222222222222222222222222222222222222222442222422222222222222222222222222242224422222222222222222222222332222232222222222222222232222232222222222222222232222232222222222222222232222232222222222222222232222232222222222222222223222223322222222222222222232233222222222222223222322222222222222222222222222222222222222222222222322232223223333333333332322232223223333333333332222222222222222222222222222222266666666666666666666666666666666666666666666666666666666666666666666666666666666';
const UN_BLUE = 0x4a8fd6,
  TEE_OD = 0x56603e,
  BLOUSE = 0xbcaa86,
  CREW_HAIR = [0x2a2018, 0x1a1612, 0x3a2a1c, 0x4a3a2a, 0x2a1d14];
let RV_N = 0;
function rgVariant(i, S_, out, nor, col, rv) {
  const P_ = S_.P,
    c = +RG_CLS[i] || 0;
  let x = P_[i * 3],
    y = P_[i * 3 + 1],
    z = P_[i * 3 + 2],
    r = null,
    n = null;
  // meto un punto dentro de una elipse alrededor de un eje vertical (o de un elipsoide) y le doy la normal de esa superficie
  const ell = (cx, cz, a, b) => {
    const d = Math.hypot((x - cx) / a, (z - cz) / b);
    if (d <= 1) return false;
    x = cx + (x - cx) / d;
    z = cz + (z - cz) / d;
    n = [(x - cx) / (a * a), 0, (z - cz) / (b * b)];
    return true;
  };
  const elp = (cx, cy, cz, a, b, e) => {
    const d = Math.hypot((x - cx) / a, (y - cy) / b, (z - cz) / e);
    if (d <= 1) return false;
    x = cx + (x - cx) / d;
    y = cy + (y - cy) / d;
    z = cz + (z - cz) / d;
    n = [(x - cx) / (a * a), (y - cy) / (b * b), (z - cz) / (e * e)];
    return true;
  };
  if (c === 1) {
    if (rv.helmet === 'un') r = UN_BLUE;
    else if (rv.helmet === 'none') {
      elp(0, 1.046, -0.006, 0.051, 0.056, 0.06);
      r = rv.hair;
    }
  } else if (c === 2 && rv.torso) {
    if (y > 0.95) ell(0, -0.005, 0.05, 0.048);
    else ell(0, -0.004, 0.116, 0.078);
    if (y < 0.95 && !n) n = [x / (0.116 * 0.116), 0, (z + 0.004) / (0.078 * 0.078)];
    r = rv.torso === 'tee' ? TEE_OD : BLOUSE;
  } else if ((c === 3 || c === 4) && rv.torso && y > 0.76) {
    // el brazo, metido alrededor de su hueso (fuera las hombreras del chaleco)
    const ax = x > 0 ? 0.1267 : -0.1267,
      sy = 0.8887;
    if (y < sy) ell(ax, -0.0067, 0.042, 0.042);
    else elp(ax, sy, -0.0067, 0.05, 0.062, 0.05);
    r = rv.torso === 'tee' ? (c === 3 ? TEE_OD : rv.skin) : n ? BLOUSE : null;
  } else if ((c === 4 || c === 5) && rv.torso === 'tee') r = rv.skin;
  else if (c === 6 && rv.torso) {
    if (ell(0, -0.004, 0.126, 0.086)) r = 0xb4a07e;
    if (y > 0.618) r = 0x3a3a2e;
  }
  out.push(x, y, z);
  if (n) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    nor.push(n[0] / l, n[1] / l, n[2] / l);
  } else nor.push(S_.N[i * 3], S_.N[i * 3 + 1], S_.N[i * 3 + 2]);
  if (r == null) {
    col.push(1, 1, 1);
    return 0;
  }
  tmpCol.setHex(r);
  col.push(tmpCol.r, tmpCol.g, tmpCol.b);
  return 1; // un color plano en lugar de la textura (ver UNIT_FS_COLOR)
}
const ALICE_AT = { dy: -0.02, dz: -0.085, sx: 0.95, sy: 0.95, sz: 0.9 }; // donde va la mochila en la espalda de los soldados del modelo
const SCOPE_Y = 0.093,
  SCOPE_R = 0.079; // la mira del Delta: altura de su eje y parte de arriba del raíl de debajo   // un texel blanco
function soldMesh(look) {
  if (SOLD[look]) return SOLD[look];
  const s = atob(SOLD_SRC[look]),
    u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  const dv = new DataView(u.buffer),
    nv = dv.getUint32(0, true),
    ni = dv.getUint32(4, true);
  let o = 8;
  const P_ = new Float32Array(u.buffer.slice(o, o + nv * 12));
  o += nv * 12;
  const N_ = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) N_[i] = dv.getInt8(o + i) / 127;
  o += nv * 3;
  const U_ = new Float32Array(nv * 2);
  for (let i = 0; i < nv * 2; i++) U_[i] = dv.getUint16(o + i * 2, true) / 65535;
  o += nv * 4;
  if (look !== 'militia') for (let i = 0; i < nv; i++) U_[i * 2] *= 0.5; // Ranger y Delta están en la mitad izquierda del atlas
  const SI = new Uint16Array(nv * 4);
  for (let i = 0; i < nv * 4; i++) SI[i] = u[o + i];
  o += nv * 4;
  const SW = new Float32Array(nv * 4);
  for (let i = 0; i < nv * 4; i++) SW[i] = u[o + i] / 255;
  o += nv * 4;
  if (o % 2) o++;
  // los pesos tienen que sumar exactamente uno: los batches hacen el skinning en coordenadas de mundo, donde un 0,4 % de menos es un metro fuera de sitio
  for (let i = 0; i < nv; i++) {
    const k = i * 4,
      t = SW[k] + SW[k + 1] + SW[k + 2] + SW[k + 3];
    for (let q = 0; q < 4; q++) SW[k + q] /= t;
  }
  const I_ = new Uint16Array(ni);
  for (let i = 0; i < ni; i++) I_[i] = dv.getUint16(o + i * 2, true);
  return (SOLD[look] = { nv, P: P_, N: N_, U: U_, SI, SW, I: I_ });
}
const unitSkinMat = new T.MeshPhongMaterial({
  vertexColors: true,
  specular: 0x141414,
  shininess: 7,
  skinning: true,
  map: SOLD_TEX
});
unitSkinMat.extensions = { derivatives: true };
unitSkinMat.onBeforeCompile = unitMat.onBeforeCompile;
unitSkinMat.customProgramCacheKey = () => 'unitS' + (UNIT_ON.v ? 1 : 0);
detailMats.push(unitSkinMat);

// pieza: [w,h,d, x,y,z, color, rx,ry,rz, tipo, proporciónArriba, estampado, orden, abombado]
// tipo: undefined caja (redondeada si lleva estampado) | 'c' cilindro (w diámetro, h largo) | 'e' miembro afilado | 's' esfera | 'h' cúpula
function roundBox(w, h, d, r, seg) {
  const g = new T.BoxGeometry(w, h, d, seg, seg, seg),
    p = g.attributes.position,
    n = g.attributes.normal;
  const ix = w / 2 - r,
    iy = h / 2 - r,
    iz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const cx = clamp(x, -ix, ix),
      cy = clamp(y, -iy, iy),
      cz = clamp(z, -iz, iz);
    let nx = x - cx,
      ny = y - cy,
      nz = z - cz;
    const L = Math.hypot(nx, ny, nz);
    if (L > 1e-6) {
      nx /= L;
      ny /= L;
      nz /= L;
      p.setXYZ(i, cx + nx * r, cy + ny * r, cz + nz * r);
      n.setXYZ(i, nx, ny, nz);
    }
  }
  return g;
}
// mallas de armas: por triángulo 9 int16 (x 1/8000), r, g, b, flags (1 cargador o cabeza de guerra, 2 madera)
const GUNM_SRC3 = __INLINE__('data/armas-3.json'); // 14-11: la M249, la CAR-15 de los Delta (Aimpoint, Divelight) y la mochila ALICE de los sanitarios
const GUNM_SRC2 = __INLINE__('data/armas-2.json');
const GUNM_SRC = __INLINE__('data/armas-1.json'),
  GUNM = {};
function gunMesh(k) {
  if (GUNM[k]) return GUNM[k];
  const s = atob(GUNM_SRC3[k] || GUNM_SRC[k] || GUNM_SRC2[k]),
    u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  const dv = new DataView(u.buffer),
    n = dv.getUint16(0, true),
    P_ = new Float32Array(n * 9),
    C_ = new Float32Array(n * 3),
    F_ = new Uint8Array(n);
  for (let t = 0; t < n; t++) {
    const o = 2 + t * 22;
    for (let q = 0; q < 9; q++) P_[t * 9 + q] = dv.getInt16(o + q * 2, true) / 8000;
    C_[t * 3] = u[o + 18] / 255;
    C_[t * 3 + 1] = u[o + 19] / 255;
    C_[t * 3 + 2] = u[o + 20] / 255;
    F_[t] = u[o + 21];
  }
  return (GUNM[k] = { n, P: P_, C: C_, F: F_ });
}
// una entrada para partGeo: la parte del modelo k que es (mag) o no es el cargador, con su largo escalado por sz y la madera en el color wood
const GmE = (L, k, mag, o) =>
  L.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'm', 1, UPT.GUN, 'XYZ', undefined, Object.assign({ k, mag }, o || {})]);
function partGeo(list) {
  const pos = [],
    nor = [],
    col = [],
    pat = [],
    lp = [],
    ind = [];
  let off = 0;
  for (const b of list) {
    const t = b[10],
      pt = b[12],
      hasPat = typeof pt === 'number';
    let g,
      vcol = null,
      vpat = null;
    if (t === 'm') {
      const o = b[15],
        G_ = gunMesh(o.k),
        ps = [],
        cs = [],
        pp = [],
        wc = o.wood != null ? new T.Color(o.wood) : null;
      for (let q = 0; q < G_.n; q++) {
        if ((G_.F[q] & 1 ? 1 : 0) !== (o.mag ? 1 : 0)) continue;
        for (let v = 0; v < 3; v++) {
          ps.push(
            G_.P[q * 9 + v * 3] * (o.sx || 1),
            G_.P[q * 9 + v * 3 + 1] * (o.sy || 1) + (o.dy || 0),
            G_.P[q * 9 + v * 3 + 2] * (o.sz || 1) + (o.dz || 0)
          );
          if (G_.F[q] & 2 && wc) cs.push(wc.r, wc.g, wc.b);
          else cs.push(G_.C[q * 3], G_.C[q * 3 + 1], G_.C[q * 3 + 2]);
          pp.push(G_.F[q] & 2 ? UPT.WOOD : UPT.GUN);
        }
      }
      g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(ps.length ? ps : [0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
      g.computeVertexNormals();
      const nv = g.attributes.position.count,
        ix = [];
      for (let i = 0; i < nv; i++) ix.push(i);
      g.setIndex(ix);
      vcol = cs.length ? cs : [0, 0, 0, 0, 0, 0, 0, 0, 0];
      vpat = pp.length ? pp : [0, 0, 0];
    } else if (t === 'c') g = new T.CylinderGeometry((b[0] / 2) * (b[11] || 1), b[0] / 2, b[1], hasPat ? 12 : 8);
    else if (t === 'e') {
      g = new T.CylinderGeometry(0.5 * (b[11] || 1), 0.5, 1, hasPat ? 12 : 8, hasPat ? 4 : 1);
      const bul = b[14] == null ? 0.08 : b[14],
        pa = g.attributes.position;
      if (bul)
        for (let i = 0; i < pa.count; i++) {
          const y = pa.getY(i);
          if (Math.abs(y) < 0.499) {
            const f = 1 + bul * Math.sin(Math.PI * (y + 0.5));
            pa.setX(i, pa.getX(i) * f);
            pa.setZ(i, pa.getZ(i) * f);
          }
        }
      g.computeVertexNormals();
    } else if (t === 's') g = new T.SphereGeometry(0.5, hasPat ? 12 : 8, hasPat ? 9 : 6);
    else if (t === 'h') g = new T.SphereGeometry(0.5, hasPat ? 12 : 8, hasPat ? 5 : 4, 0, Math.PI * 2, 0, Math.PI / 2);
    else {
      const mn = Math.min(b[0], b[1], b[2]);
      g =
        hasPat && mn >= 0.018
          ? roundBox(b[0], b[1], b[2], Math.min(0.022, mn * 0.32), Math.max(b[0], b[1], b[2]) > 0.09 ? 3 : 2)
          : new T.BoxGeometry(b[0], b[1], b[2]);
    }
    _e.set(b[7] || 0, b[8] || 0, b[9] || 0, b[13] || 'XYZ');
    _q.setFromEuler(_e);
    _v.set(b[3], b[4], b[5]);
    if (t === 'e' || t === 's' || t === 'h') _sc.set(b[0], b[1], b[2]);
    else _sc.set(1, 1, 1);
    _m4.compose(_v, _q, _sc);
    g.applyMatrix4(_m4);
    const p = g.attributes.position.array,
      n = g.attributes.normal.array;
    _c.setHex(b[6]);
    const pv = hasPat ? pt : 0;
    for (let i = 0; i < p.length; i++) {
      pos.push(p[i]);
      nor.push(n[i]);
      lp.push(p[i]);
    }
    if (vcol)
      for (let i = 0; i < p.length / 3; i++) {
        col.push(vcol[i * 3], vcol[i * 3 + 1], vcol[i * 3 + 2]);
        pat.push(vpat[i]);
      }
    else
      for (let i = 0; i < p.length / 3; i++) {
        col.push(_c.r, _c.g, _c.b);
        pat.push(pv);
      }
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) ind.push(ix[i] + off);
    off += p.length / 3;
    g.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('aPat', new T.Float32BufferAttribute(pat, 1));
  geo.setAttribute('aLP', new T.Float32BufferAttribute(lp, 3));
  geo.setIndex(ind);
  return geo;
}
const PD = v => (v == null ? UPT.CLOTH : v);
const Bx = (L, w, h, d, x, y, z, c, pt, rx, ry, rz) =>
  L.push([w, h, d, x, y, z, c, rx || 0, ry || 0, rz || 0, undefined, 1, PD(pt)]);
const E = (L, w, h, d, x, y, z, c, top, pt, rx, ry, rz, bul) =>
  L.push([w, h, d, x, y, z, c, rx || 0, ry || 0, rz || 0, 'e', top || 1, PD(pt), 'XYZ', bul]);
const Sp = (L, w, h, d, x, y, z, c, pt) => L.push([w, h, d, x, y, z, c, 0, 0, 0, 's', 1, PD(pt)]);
const SpR = (L, w, h, d, x, y, z, c, pt, rx, ry, rz) =>
  L.push([w, h, d, x, y, z, c, rx || 0, ry || 0, rz || 0, 's', 1, PD(pt)]);
const Dm = (L, w, h, d, x, y, z, c, pt, rx) => L.push([w, h, d, x, y, z, c, rx || 0, 0, 0, 'h', 1, PD(pt)]);
const Cy = (L, dia, len, x, y, z, c, pt, rx, ry, rz) =>
  L.push([dia, len, 0, x, y, z, c, rx || 0, ry || 0, rz || 0, 'c', 1, pt == null ? UPT.GUN : pt]);
const DCU = 0xc8b48c,
  WDL = 0x56653a;
const BLK = 0x262624,
  OD = 0x5e5d42,
  GM = 0x1e1e1d,
  BOOT = 0xa48760,
  PH = Math.PI / 2;

/* Armas: +z es hacia delante, con la boca en z .5 (M16/M249), .37 (CAR-15) o .38 (AK) */
function gunParts(type) {
  const G_ = [],
    M_ = [];
  if (type === 'rpg') {
    // RPG-7 al hombro (el modelo subido): la cabeza de guerra hace de 'mag' para que desaparezca después del disparo
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20]);
    GmE(G_, 'rpg', 0, { wood });
    GmE(M_, 'rpg', 1, { wood });
    return [G_, M_];
  }
  if (type === 'rpgOld') {
    const tube = 0x3a3d33,
      wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20]),
      Y = 0.1;
    Cy(G_, 0.056, 0.95, 0, Y, 0.03, tube, UPT.GUN, PH);
    Cy(G_, 0.074, 0.27, 0, Y, 0.0, wood, UPT.WOOD, PH);
    Cy(G_, 0.09, 0.1, 0, Y, -0.43, 0x2a2a26, UPT.GUN, PH);
    Cy(G_, 0.072, 0.07, 0, Y, -0.35, 0x2e2e2a, UPT.GUN, PH);
    Cy(G_, 0.066, 0.03, 0, Y, 0.49, 0x2a2a26, UPT.GUN, PH);
    Bx(G_, 0.032, 0.085, 0.04, 0, 0.02, -0.04, 0x2a2826, UPT.GUN, 0.3);
    Bx(G_, 0.03, 0.075, 0.035, 0, 0.025, 0.13, 0x2a2826, UPT.GUN, 0.2);
    Bx(G_, 0.008, 0.03, 0.05, 0, 0.035, 0.03, GM, UPT.GUN);
    Bx(G_, 0.03, 0.05, 0.09, -0.05, Y + 0.05, 0.03, 0x22221f, UPT.GUN);
    Cy(G_, 0.03, 0.02, -0.05, Y + 0.06, -0.025, 0x6a8a7a, UPT.NONE, PH);
    Cy(M_, 0.05, 0.08, 0, Y, 0.54, 0x4a5236, UPT.GUN, PH);
    Cy(M_, 0.095, 0.16, 0, Y, 0.64, 0x58623e, UPT.GUN, PH);
    Cy(M_, 0.065, 0.06, 0, Y, 0.745, 0x4e5838, UPT.GUN, PH);
    Cy(M_, 0.028, 0.06, 0, Y, 0.8, 0x8a8a70, UPT.GUN, PH);
    return [G_, M_];
  }
  if (type === 'ak') {
    // el AK-47 subido, con la madera en uno de unos pocos tintes
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20, 0x84522a]);
    GmE(G_, 'ak', 0, { wood });
    GmE(M_, 'ak', 1, { wood });
    return [G_, M_];
  }
  if (type === 'akOld') {
    const wood = pick([0x6a4426, 0x7a4a24, 0x5a3a20, 0x84522a]),
      st = 0x2a2826;
    Bx(G_, 0.045, 0.065, 0.2, 0, 0.01, 0.02, st, UPT.GUN);
    Bx(G_, 0.04, 0.022, 0.18, 0, 0.05, 0.015, 0x33312e, UPT.GUN);
    Bx(G_, 0.04, 0.07, 0.21, 0, -0.012, -0.17, wood, UPT.WOOD, -0.13);
    Bx(G_, 0.044, 0.085, 0.025, 0, -0.03, -0.275, shade(wood, 0.8), UPT.WOOD, -0.13);
    Bx(G_, 0.03, 0.07, 0.035, 0, -0.055, -0.04, wood, UPT.WOOD, 0.38);
    Bx(G_, 0.05, 0.045, 0.13, 0, 0, 0.165, wood, UPT.WOOD);
    Bx(G_, 0.04, 0.026, 0.1, 0, 0.042, 0.15, wood, UPT.WOOD);
    Cy(G_, 0.022, 0.12, 0, 0.045, 0.21, GM, UPT.GUN, PH);
    Cy(G_, 0.02, 0.18, 0, 0.018, 0.29, GM, UPT.GUN, PH);
    Bx(G_, 0.012, 0.045, 0.015, 0, 0.048, 0.352, GM, UPT.GUN);
    Cy(G_, 0.028, 0.035, 0, 0.018, 0.37, GM, UPT.GUN, PH);
    Bx(G_, 0.008, 0.012, 0.05, 0, -0.035, 0.03, GM, UPT.GUN);
    Bx(G_, 0.012, 0.025, 0.03, 0, 0.07, 0.08, GM, UPT.GUN);
    Bx(M_, 0.035, 0.07, 0.045, 0, -0.07, 0.06, 0x2a2622, UPT.GUN, 0.3);
    Bx(M_, 0.035, 0.07, 0.045, 0, -0.125, 0.095, 0x2a2622, UPT.GUN, 0.7);
    return [G_, M_];
  }
  if (type === 'm16' || type === 'm203') {
    // el M16A1 de los Rangers (modelo subido), con el M203 debajo para los granaderos
    GmE(G_, 'm16a1', 0);
    GmE(M_, 'm16a1', 1);
    if (type === 'm203') {
      Cy(G_, 0.045, 0.19, 0, -0.03, 0.21, 0x2c2c2a, UPT.GUN, PH);
      Bx(G_, 0.02, 0.035, 0.03, 0, -0.055, 0.12, GM, UPT.GUN);
    }
    return [G_, M_];
  }
  if (type === 'saw') {
    // la M249 de los Rangers (modelo subido); el cañón fino lo dibujo aquí y el cargador de caja hace de 'mag'
    GmE(G_, 'm249', 0);
    GmE(M_, 'm249', 1);
    Cy(G_, 0.024, 0.2, 0, 0.035, 0.4, GM, UPT.GUN, PH);
    Cy(G_, 0.034, 0.045, 0, 0.035, 0.485, GM, UPT.GUN, PH);
    Cy(G_, 0.012, 0.17, 0, 0.0, 0.33, GM, UPT.GUN, PH);
    return [G_, M_];
  }
  if (type === 'car') {
    // la CAR-15 de los Delta (modelo subido: Aimpoint en el asa de transporte, Divelight bajo el guardamanos)
    const ck = Math.random() < 0.5 ? 'car15' : 'car15n';
    GmE(G_, ck, 0);
    GmE(M_, ck, 1);
    Cy(G_, 0.032, 0.19, 0, 0.028, -0.12, BLK, UPT.GUN, PH); // tubo del amortiguador entre culata y cajón
    return [G_, M_];
  }
  if (type === 'carOld') {
    GmE(G_, 'car15', 0);
    GmE(M_, 'car15', 1);
    const SY = SCOPE_Y;
    Cy(G_, 0.012, 0.075, 0, SY, 0, BLK, UPT.GUN, PH); // tubo
    Cy(G_, 0.017, 0.023, 0, SY, 0.048, BLK, UPT.GUN, PH);
    Cy(G_, 0.015, 0.003, 0, SY, 0.06, 0x5a7a8a, UPT.NONE, PH); // campana del objetivo y su cristal
    Cy(G_, 0.015, 0.018, 0, SY, -0.045, BLK, UPT.GUN, PH);
    Cy(G_, 0.013, 0.003, 0, SY, -0.055, 0x3a4a52, UPT.NONE, PH); // ocular
    Cy(G_, 0.015, 0.015, 0, SY, 0.003, BLK, UPT.GUN); // torreta
    Bx(G_, 0.009, SY - SCOPE_R, 0.01, 0, (SY + SCOPE_R) / 2, -0.022, GM, UPT.GUN);
    Bx(G_, 0.009, SY - SCOPE_R, 0.01, 0, (SY + SCOPE_R) / 2, 0.025, GM, UPT.GUN); // anillas
    return [G_, M_];
  }
  if (type === 'dmr') {
    // el M16A2 con visor
    const o = {};
    GmE(G_, 'm16', 0, o);
    GmE(M_, 'm16', 1, o);
    if (type === 'dmr') {
      Cy(G_, 0.042, 0.19, 0, 0.115, 0.03, BLK, UPT.GUN, PH);
      Cy(G_, 0.055, 0.04, 0, 0.115, 0.13, BLK, UPT.GUN, PH);
      Cy(G_, 0.05, 0.035, 0, 0.115, -0.07, BLK, UPT.GUN, PH);
    }
    return [G_, M_];
  }
  const car = type === 'car',
    saw = type === 'saw',
    muz = car ? 0.37 : 0.5;
  Bx(G_, 0.04, 0.055, 0.15, 0, -0.005, 0.03, GM, UPT.GUN);
  Bx(G_, saw ? 0.06 : 0.045, saw ? 0.07 : 0.045, saw ? 0.2 : 0.19, 0, saw ? 0.045 : 0.04, 0.05, GM, UPT.GUN);
  Bx(G_, 0.032, 0.075, 0.04, 0, -0.06, -0.02, GM, UPT.GUN, 0.35);
  Bx(G_, 0.008, 0.008, 0.06, 0, -0.038, 0.03, GM, UPT.GUN);
  const hz = 0.15,
    hl = car ? 0.12 : 0.17;
  Cy(G_, saw ? 0.05 : 0.055, hl, 0, 0.035, hz + hl / 2, 0x2a2a28, UPT.GUN, PH);
  for (let k = 1; k < 4; k++)
    Cy(G_, (saw ? 0.05 : 0.055) + 0.006, 0.008, 0, 0.035, hz + (hl * k) / 4, 0x232321, UPT.GUN, PH);
  const b0 = hz + hl,
    bl = muz - 0.025 - b0;
  Cy(G_, 0.02, bl, 0, 0.035, b0 + bl / 2, GM, UPT.GUN, PH);
  Cy(G_, 0.028, 0.045, 0, 0.035, muz - 0.02, GM, UPT.GUN, PH);
  if (!saw) {
    Bx(G_, 0.012, 0.05, 0.015, 0, 0.075, b0 + 0.015, GM, UPT.GUN);
    Bx(G_, 0.03, 0.02, 0.02, 0, 0.05, b0 + 0.015, GM, UPT.GUN);
  }
  if (car) {
    Cy(G_, 0.022, 0.14, 0, 0.03, -0.1, GM, UPT.GUN, PH);
    Bx(G_, 0.035, 0.07, 0.07, 0, -0.005, -0.18, BLK, UPT.GUN);
    Cy(G_, 0.036, 0.075, 0, 0.088, 0.05, BLK, UPT.GUN, PH);
    Bx(G_, 0.02, 0.022, 0.04, 0, 0.066, 0.05, GM, UPT.GUN);
    Cy(G_, 0.03, 0.004, 0, 0.088, 0.09, 0x6a8a7a, UPT.NONE, PH);
  } else {
    Bx(G_, 0.042, 0.075, 0.21, 0, -0.002, -0.17, GM, UPT.GUN);
    Bx(G_, 0.045, 0.09, 0.02, 0, -0.01, -0.282, 0x141414, UPT.RUBBER);
    if (!saw && type !== 'dmr') {
      Bx(G_, 0.018, 0.03, 0.12, 0, 0.08, 0.03, GM, UPT.GUN);
      Bx(G_, 0.014, 0.03, 0.02, 0, 0.072, -0.02, GM, UPT.GUN);
    }
  }
  if (saw) {
    Bx(G_, 0.05, 0.02, 0.13, 0, 0.07, 0.2, 0x2a2a28, UPT.GUN);
    Bx(G_, 0.016, 0.05, 0.06, 0, 0.1, 0.06, GM, UPT.GUN);
    Bx(G_, 0.012, 0.012, 0.17, 0.02, -0.015, 0.33, GM, UPT.GUN, 0.15);
    Bx(G_, 0.012, 0.012, 0.17, -0.02, -0.015, 0.33, GM, UPT.GUN, 0.15);
    Bx(M_, 0.085, 0.1, 0.1, 0.045, -0.065, 0.04, OD, UPT.WEB);
    Bx(M_, 0.08, 0.03, 0.08, 0.045, -0.005, 0.04, shade(OD, 0.85), UPT.WEB);
  } else {
    Bx(M_, 0.03, 0.08, 0.05, 0, -0.08, 0.06, GM, UPT.GUN, 0.12);
    Bx(M_, 0.03, 0.06, 0.05, 0, -0.14, 0.075, GM, UPT.GUN, 0.3);
  }
  if (type === 'm203') {
    Cy(G_, 0.045, 0.19, 0, -0.018, 0.21, 0x2c2c2a, UPT.GUN, PH);
    Bx(G_, 0.02, 0.035, 0.03, 0, -0.045, 0.12, GM, UPT.GUN);
  }
  if (type === 'dmr') {
    Cy(G_, 0.042, 0.19, 0, 0.095, 0.03, BLK, UPT.GUN, PH);
    Cy(G_, 0.055, 0.04, 0, 0.095, 0.13, BLK, UPT.GUN, PH);
    Cy(G_, 0.05, 0.035, 0, 0.095, -0.07, BLK, UPT.GUN, PH);
    Bx(G_, 0.02, 0.03, 0.02, 0, 0.07, 0.08, GM, UPT.GUN);
    Bx(G_, 0.02, 0.03, 0.02, 0, 0.07, -0.02, GM, UPT.GUN);
  }
  return [G_, M_];
}
const HAIRS = [0x1a1512, 0x2a1d14, 0x3a2a1c, 0x4a3a2a, 0x6a5038];
function lipCol(c) {
  const r = (c >> 16) & 255,
    g = (c >> 8) & 255,
    b = c & 255;
  return (Math.min(255, Math.round(r * 0.98 + 10)) << 16) | (Math.round(g * 0.74) << 8) | Math.round(b * 0.74);
}
// una bandera de manga de unos 5 por 7,5 cm: fondo blanco, franjas rojas y el cantón azul arriba, hacia delante
function usFlag(L, x, y) {
  const W_ = 0.05,
    H_ = 0.034;
  Bx(L, 0.004, H_ + 0.004, W_ + 0.004, x, y, 0, 0x3a3a30, UPT.NONE); // el borde cosido
  Bx(L, 0.004, H_, W_, x + 0.0015, y, 0, 0xeeeae0, UPT.NONE);
  for (let k = 0; k < 4; k++)
    Bx(L, 0.002, 0.0046, W_, x + 0.0035, y + H_ / 2 - 0.0023 - k * 0.0098, 0, 0xb3283a, UPT.NONE);
  Bx(L, 0.0025, 0.018, 0.022, x + 0.0045, y + H_ / 2 - 0.009, W_ / 2 - 0.011, 0x2f3468, UPT.NONE);
}
function face(P, skin, hair, opt) {
  opt = opt || {};
  const sh = k => shade(skin, k),
    brow = shade(hair, 0.82),
    H_ = P.head;
  Sp(H_, 0.15, 0.18, 0.165, 0, 0.1, 0, skin, UPT.SKIN); // cráneo
  E(H_, 0.13, 0.068, 0.13, 0, 0.043, 0.012, skin, 0.92, UPT.SKIN); // mandíbula
  Bx(H_, 0.05, 0.026, 0.02, 0, 0.019, 0.068, skin, UPT.SKIN); // barbilla
  for (const s of [-1, 1]) {
    const ry = s * 0.42;
    Bx(H_, 0.044, 0.026, 0.012, s * 0.031, 0.1, 0.075, sh(0.72), UPT.NONE, 0, ry, 0); // la cuenca del ojo, en sombra
    Bx(H_, 0.03, 0.015, 0.01, s * 0.031, 0.0995, 0.079, 0xf1ebdf, UPT.NONE, 0, ry, 0); // blanco del ojo
    Bx(H_, 0.014, 0.016, 0.01, s * 0.029, 0.0995, 0.081, 0x17120e, UPT.NONE, 0, ry, 0); // iris y pupila
    Bx(H_, 0.044, 0.014, 0.016, s * 0.033, 0.1175, 0.078, brow, UPT.NONE, 0, ry, -s * 0.14); // ceja
    Bx(H_, 0.028, 0.018, 0.012, s * 0.047, 0.077, 0.067, sh(1.07), UPT.SKIN, 0, s * 0.62, 0); // pómulo cogiendo la luz
    Bx(H_, 0.02, 0.03, 0.01, s * 0.05, 0.056, 0.064, sh(0.88), UPT.NONE, 0, s * 0.7, 0); // hueco de la mejilla
    Sp(H_, 0.026, 0.052, 0.04, s * 0.079, 0.096, -0.005, sh(0.93), UPT.SKIN); // oreja
    Bx(H_, 0.006, 0.026, 0.018, s * 0.092, 0.096, -0.002, sh(0.62), UPT.NONE);
  }
  Bx(H_, 0.024, 0.038, 0.022, 0, 0.083, 0.082, sh(0.98), UPT.SKIN, -0.3); // puente de la nariz
  Bx(H_, 0.032, 0.018, 0.024, 0, 0.067, 0.087, sh(1.02), UPT.SKIN); // punta
  Bx(H_, 0.03, 0.007, 0.014, 0, 0.0575, 0.088, sh(0.5), UPT.NONE); // la sombra de debajo
  if (opt.beard) {
    const bc = hair;
    E(H_, 0.142, 0.072, 0.138, 0, 0.036, 0.016, bc, 0.95, UPT.HAIR); // a lo largo de la mandíbula
    Bx(H_, 0.064, 0.044, 0.03, 0, 0.02, 0.071, bc, UPT.HAIR); // barbilla
    Bx(H_, 0.062, 0.016, 0.018, 0, 0.0515, 0.088, bc, UPT.HAIR); // bigote
    for (const s of [-1, 1]) Bx(H_, 0.018, 0.07, 0.06, s * 0.068, 0.07, 0.03, bc, UPT.HAIR); // patillas
  } else if (opt.stubble) {
    E(H_, 0.134, 0.062, 0.134, 0, 0.04, 0.014, sh(0.74), 0.92, UPT.HAIR);
    Bx(H_, 0.052, 0.013, 0.012, 0, 0.0525, 0.085, sh(0.7), UPT.HAIR);
  }
  Bx(H_, 0.05, 0.009, 0.012, 0, 0.044, 0.085, sh(0.46), UPT.NONE); // boca
  Bx(H_, 0.036, 0.01, 0.012, 0, 0.0355, 0.083, lipCol(sh(0.92)), UPT.SKIN); // labio inferior
}
function hand(L, c, glove, side) {
  const pt = glove ? UPT.LEATHER : UPT.SKIN;
  Bx(L, 0.068, 0.08, 0.036, 0, -0.035, 0.004, c, pt);
  Bx(L, 0.064, 0.05, 0.034, 0, -0.082, 0.02, shade(c, 0.95), pt, 0.55);
  E(L, 0.026, 0.055, 0.026, -side * 0.03, -0.035, 0.03, c, 0.9, pt, 0.7, 0, side * 0.4);
}
function legs(P, cloth, pt, boot, opt) {
  opt = opt || {};
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1;
    E(P['th' + s], 0.135, 0.28, 0.145, 0, -0.13, 0, cloth, 1.15, pt);
    if (opt.cargo) Bx(P['th' + s], 0.035, 0.09, 0.085, sg * 0.07, -0.15, 0.0, cloth, pt);
    Sp(P['sh' + s], 0.12, 0.11, 0.125, 0, 0, 0, cloth, pt);
    E(P['sh' + s], 0.105, 0.19, 0.11, 0, -0.1, 0, cloth, 1.05, pt);
    if (opt.pads) Sp(P['sh' + s], 0.12, 0.1, 0.08, 0, -0.005, 0.055, BLK, UPT.RUBBER);
    E(P['sh' + s], 0.12, 0.04, 0.124, 0, -0.165, 0, cloth, 1, pt);
    E(P['sh' + s], 0.112, 0.075, 0.118, 0, -0.2, 0, boot, 1, UPT.LEATHER, 0, 0, 0, 0.02);
    Bx(P['ft' + s], 0.112, 0.065, 0.2, 0, -0.022, 0.04, boot, UPT.LEATHER);
    Sp(P['ft' + s], 0.11, 0.062, 0.08, 0, -0.028, 0.125, boot, UPT.LEATHER);
    Bx(P['ft' + s], 0.12, 0.02, 0.225, 0, -0.06, 0.045, 0x3a3226, UPT.RUBBER);
    Bx(P['ft' + s], 0.04, 0.008, 0.08, 0, 0.012, 0.075, shade(boot, 0.6), UPT.NONE);
  }
}
