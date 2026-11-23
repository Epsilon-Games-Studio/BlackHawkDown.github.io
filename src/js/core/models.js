/* ====================================================================================================
 * core/models.js
 *
 * Modelos subidos: el Little Bird AH-6 y el Hercules (geometría en base64 + textura junto a la página; uvs de glTF, origen arriba a la izquierda)
 * ================================================================================================== */

'use strict';

const LB_HUB = [0.0372, 2.7509, -0.9839],
  LB_TAIL = [0.0405, 1.5415, -6.6042];
const MODELS = {};
function loadModel(name, prep, texPrep) {
  const M_ = (MODELS[name] = { ready: false, waiters: [], geos: null, mat: null });
  const bin = assetBin(name);
  const tex = new Promise((res, rej) => new T.TextureLoader().load(assetPng(name), res, undefined, rej));
  Promise.all([bin, tex])
    .then(([buf, map]) => {
      const geos = parseHeli(buf);
      if (prep) prep(geos);
      map.flipY = false;
      map.magFilter = T.LinearFilter;
      map.minFilter = T.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.anisotropy = 8;
      if (texPrep) texPrep(map);
      map.needsUpdate = true;
      M_.geos = geos;
      M_.mat = new T.MeshPhongMaterial({ map, alphaTest: 0.5, side: T.DoubleSide, specular: 0x202020, shininess: 20 });
      M_.ready = true;
      const w = M_.waiters;
      M_.waiters = [];
      for (const f of w) f(M_);
    })
    .catch(() => {});
}
function withModel(name, fn) {
  const M_ = MODELS[name];
  if (!M_) return;
  if (M_.ready) fn(M_);
  else M_.waiters.push(fn);
}
loadModel('mh6', g => {
  g.rotor.translate(-LB_HUB[0], -LB_HUB[1], -LB_HUB[2]);
  g.tail.translate(-LB_TAIL[0], -LB_TAIL[1], -LB_TAIL[2]);
});
loadModel('c130');
loadModel('crane', null, m => {
  m.magFilter = T.NearestFilter;
  m.minFilter = T.NearestFilter;
  m.generateMipmaps = false;
});
for (const n of PROP_N)
  loadModel(n, null, m => {
    m.anisotropy = 4;
  });
loadModel('paper', null, m => {
  m.anisotropy = 4;
});
loadModel('trees', null, m => {
  m.anisotropy = 4;
});
treeInit();
for (const n of ['w_b04', 'w_b05', 'w_vint', 'w_office', 'w_w2', 'w_w1', 'w_b04g'])
  loadModel(n, null, m => {
    m.anisotropy = 4;
  });
loadModel('awning', null, m => {
  m.anisotropy = 4;
});
// los modelos del 22-11: bastión Hesco de la muralla de la base, antena parabólica de las azoteas (blanca y con su mástil),
// la torre de antenas junto al objetivo, la boya del tutorial, el montón de neumáticos de las barricadas y el cohete del RPG
for (const n of ['u_hesco', 'u_dish', 'u_tower', 'u_buoy', 'u_tires', 'u_rocket', 'u_seat'])
  loadModel(n, null, m => {
    m.anisotropy = 4;
  });
loadModel('tent');
loadModel('humvee');
loadModel('crow');
loadModel('kc10');
loadModel('m939');
// el BTR-80 de la columna de la ONU (lo pide el jugador): casco y torreta, la torreta girando sobre su anillo
const BTR_PIV = [0.1084, 1.9236, 1.1979];
loadModel(
  'btr',
  g => {
    g.turret.translate(-BTR_PIV[0], -BTR_PIV[1], -BTR_PIV[2]);
  },
  m => {
    m.magFilter = T.LinearFilter;
    m.minFilter = T.LinearMipmapLinearFilter;
    m.generateMipmaps = true;
  }
);
loadModel('tech', null, m => {
  m.magFilter = T.LinearFilter;
  m.minFilter = T.LinearMipmapLinearFilter;
  m.generateMipmaps = true;
});
// la textura del hangar se repite a lo largo: la u se guardó apretada en 0..1 y aquí la vuelvo a estirar
for (const t of VEH_T)
  loadModel(t, null, m => {
    m.magFilter = T.LinearFilter;
    m.minFilter = T.LinearMipmapLinearFilter;
    m.generateMipmaps = true;
    m.anisotropy = 4;
  });
loadModel('hangar', null, map => {
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.repeat.set(8, 1);
  map.offset.set(-3, 0);
  map.minFilter = T.LinearMipmapLinearFilter;
});
