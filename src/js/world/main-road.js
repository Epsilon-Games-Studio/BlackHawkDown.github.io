/* ====================================================================================================
 * world/main-road.js
 *
 * La carretera principal: asfalto viejo desde el aeropuerto, por la rotonda del K-4 y subiendo la Milla hasta el estadio. Es una malla
 * aparte, apenas por encima del suelo, para que donde la cruce una calle de tierra o una pista el asfalto quede siempre encima. Una textura
 * gastada sin costuras (grietas, juntas selladas con brea, parches, baches) se repite en espacio de mundo; las marcas viales borradas, las rodadas
 * de aceite y el borde roto y lleno de arena se pintan en el shader según la posición a lo ancho y a lo largo. La rotonda es un círculo de verdad,
 * pintado al final, por encima de las carreteras que llegan a ella.
 * ================================================================================================== */

'use strict';

const RD_TILE = 12;
const ASPH_TEX = rdTex('assets/textures/asfalto.jpg', true),
  ISLE_TEX = rdTex('assets/textures/isleta.jpg', false);
const RD_NOISE = `
float rdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rdN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(rdH(i), rdH(i + vec2(1.0, 0.0)), f.x), mix(rdH(i + vec2(0.0, 1.0)), rdH(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
const RD_FRAG = `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv * 4.0 );
  texelColor.rgb *= 0.9 + 0.2 * texture2D( map, vUv * 0.61 + vec2(0.37, 0.61) ).g / 0.414;
  texelColor.rgb *= 0.82;   // apisonado y con aceite: un tono mas oscuro que la piedra suelta   // una segunda muestra lenta: que no se note la repeticion
  texelColor = mapTexelToLinear( texelColor );
  float across = vRoad.x, along = vRoad.y, hw = vRoad.z;
  float e = hw - abs(across);                                       // cuanto hacia dentro desde el borde
  float n1 = rdN(vWXZ * 1.3), n2 = rdN(vWXZ * 5.1), n3 = rdN(vWXZ * 17.0);
  float lim = -0.3 + 0.5 * n1 + 0.22 * n2 + 0.08 * n3;              // el borde se deshace en la arena
  if (e < lim) discard;
  // rodadas: bandas mas oscuras y aceitosas en cada carril
  float lane = abs(abs(across) - hw * 0.5);
  float track = 1.0 - smoothstep(0.12, 0.42, abs(lane - 0.6));
  texelColor.rgb *= 1.0 - 0.09 * track * (0.6 + 0.4 * n2);
  // marcas viales: una linea blanca discontinua por el centro y lineas en los bordes, casi borradas
  float paint = 0.0;
  if (hw > 2.0 && vRoad.x > -50.0){
    float dash = step(fract(along / 4.8), 0.5);
    paint = max(paint, (1.0 - smoothstep(0.05, 0.085, abs(across))) * dash);
    paint = max(paint, (1.0 - smoothstep(0.035, 0.07, abs(e - 0.45))) * 0.8);
  }
  paint *= smoothstep(0.3, 0.62, rdN(vWXZ * 2.3 + 11.0)) * smoothstep(0.15, 0.5, n3 * 0.6 + n2 * 0.4);
  texelColor.rgb = mix(texelColor.rgb, vec3(0.78, 0.76, 0.68), paint * 0.55);
  // arena arrastrada sobre los bordes, y polvo por encima de todo
  vec3 sand = vec3(0.80, 0.72, 0.57) * (0.93 + 0.12 * n2);
  float sd = 1.0 - smoothstep(lim, lim + 0.7 + 0.9 * n1, e);
  texelColor.rgb = mix(texelColor.rgb, sand, clamp(sd * 0.85 + 0.07 * smoothstep(0.6, 0.95, n1), 0.0, 1.0));
  diffuseColor *= texelColor;
#endif
`;
function asphMat(prio) {
  const m = new T.MeshPhongMaterial({
    map: ASPH_TEX,
    specular: 0x0b0b0a,
    shininess: 5,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4 - prio * 4
  });
  m.onBeforeCompile = sh => {
    sh.vertexShader =
      'attribute vec3 aRoad; varying vec3 vRoad; varying vec2 vWXZ;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRoad = aRoad; vWXZ = (modelMatrix * vec4(position, 1.0)).xz;'
      );
    sh.fragmentShader =
      'varying vec3 vRoad; varying vec2 vWXZ;\n' +
      RD_NOISE +
      sh.fragmentShader.replace('#include <map_fragment>', RD_FRAG);
  };
  m.customProgramCacheKey = () => 'asph';
  return m;
}
// una tira a lo largo de una polilínea: esquinas a inglete, con la distancia recorrida pasada al shader
function rdStrip(P, R, I, A, pts, hw, y) {
  const n = pts.length,
    pad = 0.5;
  let along = 0;
  for (let k = 0; k < n; k++) {
    const a = pts[Math.max(0, k - 1)],
      b = pts[k],
      c = pts[Math.min(n - 1, k + 1)];
    let d0x = b[0] - a[0],
      d0z = b[1] - a[1],
      d1x = c[0] - b[0],
      d1z = c[1] - b[1];
    const l0 = Math.hypot(d0x, d0z) || 1,
      l1 = Math.hypot(d1x, d1z) || 1;
    d0x /= l0;
    d0z /= l0;
    d1x /= l1;
    d1z /= l1;
    if (k === 0) {
      d0x = d1x;
      d0z = d1z;
    }
    if (k === n - 1) {
      d1x = d0x;
      d1z = d0z;
    }
    let tx = d0x + d1x,
      tz = d0z + d1z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const nx = -tz,
      nz = tx,
      miter = 1 / Math.max(0.35, nx * -d1z + nz * d1x);
    if (k) along += Math.hypot(b[0] - a[0], b[1] - a[1]);
    const w = (hw + pad) * miter,
      o = P.length / 3;
    for (const sg of [-1, 1]) {
      const x = b[0] + nx * w * sg,
        z = b[1] + nz * w * sg;
      P.push(x, y, z);
      A.push(x / RD_TILE, z / RD_TILE);
      R.push(sg * (hw + pad), along, hw);
    }
    if (k) I.push(o - 2, o - 1, o, o - 1, o + 1, o);
  }
}
function rdMesh(P, R, I, A, mat) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(A, 2));
  g.setAttribute('aRoad', new T.Float32BufferAttribute(R, 3));
  g.setAttribute(
    'normal',
    new T.Float32BufferAttribute(
      new Array(P.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3
    )
  );
  g.setIndex(I);
  g.computeBoundingSphere();
  const m = new T.Mesh(g, mat);
  m.receiveShadow = true;
  world.add(m);
  return m;
}
const K4C = [330, 410],
  K4_R0 = 10,
  K4_R1 = 17;
function mainRoad() {
  // la carretera del aeropuerto, cortada donde llega al anillo de la rotonda
  const ap = ROADS[0].pts.map(q => q.slice()),
    last = ap[ap.length - 1],
    prev = ap[ap.length - 2];
  {
    const dx = prev[0] - last[0],
      dz = prev[1] - last[1],
      L = Math.hypot(dx, dz);
    ap[ap.length - 1] = [K4C[0] + (dx / L) * 15.5, K4C[1] + (dz / L) * 15.5];
  }
  // la Milla desde la puerta del estadio hasta la carretera del K-4, y esa carretera hacia el oeste hasta la rotonda
  const mile = [
    [MILE_X + 0.5, 90.5],
    [MILE_X + 0.5, 410.5],
    [K4C[0] + 15.5, 410.5]
  ];
  let P = [],
    R = [],
    I = [],
    A = [];
  rdStrip(P, R, I, A, ap, ROADS[0].w / 2, 0.006);
  rdStrip(P, R, I, A, mile, 3.5, 0.006);
  rdMesh(P, R, I, A, asphMat(0));
  // el anillo: un círculo de verdad con muchos segmentos, pintado sobre los extremos de las carreteras
  P = [];
  R = [];
  I = [];
  A = [];
  const N = 160,
    rm = (K4_R0 + K4_R1) / 2,
    hw = (K4_R1 - K4_R0) / 2;
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2,
      ca = Math.cos(a),
      sa = Math.sin(a),
      o = P.length / 3;
    for (const r of [K4_R0 - 0.05, K4_R1 + 0.5]) {
      const x = K4C[0] + ca * r,
        z = K4C[1] + sa * r;
      P.push(x, 0.009, z);
      A.push(x / RD_TILE, z / RD_TILE);
      R.push(r - rm, a * rm, hw);
    }
    if (k) I.push(o - 2, o, o - 1, o - 1, o, o + 1);
  }
  rdMesh(P, R, I, A, asphMat(1));
  k4Island();
}
// la isleta: un bordillo redondo pintado en blanco y negro, un jardín radial de adoquines, hierba seca y caminos, y el monumento sobre escalones redondos
function k4Island() {
  const g = new T.Group();
  g.position.set(K4C[0], 0, K4C[1]);
  world.add(g);
  const disc = new T.Mesh(
    new T.CircleGeometry(K4_R0, 96).rotateX(-Math.PI / 2),
    new T.MeshPhongMaterial({
      map: ISLE_TEX,
      specular: 0x080808,
      shininess: 4,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -12
    })
  );
  disc.position.y = 0.1;
  disc.receiveShadow = true;
  g.add(disc);
  // el bordillo: bloques alrededor del círculo, alternando blanco y negro
  const NB = 104,
    r0 = K4_R0 - 0.32,
    r1 = K4_R0 + 0.06,
    h = 0.16,
    P = [],
    C = [],
    Nn = [];
  const quad = (a, b, c, d, n, col) => {
    for (const v of [a, b, c, a, c, d]) {
      P.push(...v);
      Nn.push(...n);
      C.push(...col);
    }
  };
  for (let k = 0; k < NB; k++) {
    const a0 = (k / NB) * Math.PI * 2,
      a1 = ((k + 0.94) / NB) * Math.PI * 2,
      col = k % 2 ? [0.16, 0.16, 0.15] : [0.88, 0.87, 0.82];
    const p = (r, a, y) => [Math.cos(a) * r, y, Math.sin(a) * r],
      am = (a0 + a1) / 2;
    quad(p(r0, a0, h), p(r0, a1, h), p(r1, a1, h), p(r1, a0, h), [0, 1, 0], col);
    quad(
      p(r1, a0, h),
      p(r1, a1, h),
      p(r1, a1, 0),
      p(r1, a0, 0),
      [Math.cos(am), 0, Math.sin(am)],
      col.map(c => c * 0.92)
    );
    quad(
      p(r0, a1, h),
      p(r0, a0, h),
      p(r0, a0, 0),
      p(r0, a1, 0),
      [-Math.cos(am), 0, -Math.sin(am)],
      col.map(c => c * 0.85)
    );
  }
  const kg = new T.BufferGeometry();
  kg.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  kg.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
  kg.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  const kerb = new T.Mesh(
    kg,
    new T.MeshPhongMaterial({ vertexColors: true, specular: 0x111111, shininess: 10, side: T.DoubleSide })
  );
  kerb.castShadow = true;
  kerb.receiveShadow = true;
  g.add(kerb);
  // los escalones del monumento: tres gradas redondas, cada una con su pequeña moldura
  const stone = new T.MeshPhongMaterial({ color: 0xd6cdb6, specular: 0x141414, shininess: 8 });
  let y = 0.1;
  for (const [r, th] of [
    [3.25, 0.32],
    [2.55, 0.32],
    [1.85, 0.36]
  ]) {
    const prof = [
      [0, y],
      [r, y],
      [r, y + th * 0.75],
      [r - 0.08, y + th * 0.82],
      [r - 0.08, y + th],
      [0, y + th]
    ].map(q => new T.Vector2(q[0], q[1]));
    const m = new T.Mesh(new T.LatheGeometry(prof, 64), stone);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    y += th;
  }
  // un anillo bajo de adoquines rodeando el parterre
  const bed = new T.Mesh(new T.TorusGeometry(4.65, 0.07, 4, 96).rotateX(Math.PI / 2), stone);
  bed.position.y = 0.12;
  g.add(bed);
}
function shrub(x, z) {
  const s = rr(0.6, 1.5);
  D(x, 0, z, s * 1.4, s * 0.8, s * 1.2, pick([0x7a7a50, 0x6a6e48, 0x8a8456, 0x5e6440]), { m: M.LEAF });
}
