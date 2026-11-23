/* ====================================================================================================
 * world/city-shape.js
 *
 * La forma de la ciudad: un campo de densidad orgánico, estirado a lo largo de la costa y deshilachado con ruido
 * ================================================================================================== */

'use strict';

const ROAD0SEG = ROADSEG.slice(0, ROADS[0].pts.length - 1);
function cityD(x, z) {
  const sc = coastS(x, z);
  if (sc > -24) return 0;
  // deformo las coordenadas para que el contorno serpentee: bahías de descampado, lenguas de casas
  const wx = x + 70 * (fbm(x * 0.0062 + 11.3, z * 0.0062 + 2.1) - 0.5),
    wz = z + 70 * (fbm(x * 0.0062 + 5.7, z * 0.0062 + 8.9) - 0.5);
  const dx = wx - 340,
    dz = wz - 315;
  const u = dx * COAST_DX + dz * COAST_DZ,
    v = dx * COAST_NX + dz * COAST_NZ;
  const r = Math.hypot(u / 1.75, v < 0 ? v / 1.2 : v / 1.45);
  const n = fbm(x * 0.013 + 3.7, z * 0.013 + 9.1) - 0.5,
    n2 = fbm(x * 0.034 + 1.3, z * 0.034 + 4.4) - 0.5;
  let d = 1 - sstep(60, 235, r * (1 + n * 0.9 + n2 * 0.3));
  d = Math.min(1, d + 0.32 * (1 - sstep(30, 140, -sc)) * (1 - sstep(170, 380, r))); // los barrios viejos de la costa son los más densos
  // lenguas de edificación a lo largo de las carreteras de salida: la de Afgooye al oeste, la del norte y la del aeropuerto
  const lobe = (ax, az, bx, bz, w, k) => {
    const L = Math.hypot(bx - ax, bz - az),
      t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L), 0, 1),
      px = ax + (bx - ax) * t - x,
      pz = az + (bz - az) * t - z;
    return (1 - sstep(w * 0.3, w, Math.hypot(px, pz))) * (1 - t * 0.85) * k * (1 + n2 * 1.5);
  };
  d = Math.max(
    d,
    lobe(200, 256, 0, 262, 40, 0.62),
    lobe(256, 170, 250, 0, 34, 0.5),
    lobe(330, 410, 0, 590, 40, 0.58),
    lobe(450, 210, 760, 40, 40, 0.55)
  );
  // bordes irregulares: donde la ciudad se aclara, las manzanas van y vienen a parches
  {
    const n3 = fbm(x * 0.045 + 21.1, z * 0.045 + 3.3) - 0.5;
    d = clamp(d + n3 * 1.1 * d * (1 - d) * 2.2, 0, 1);
  }
  // los barrios del norte: un trozo de ciudad desde el objetivo hasta el estadio, a los dos lados de la Milla
  {
    const e = Math.hypot((x - 340) / 175, (z - 150) / (z < 150 ? 125 : 160));
    d = Math.max(d, (1 - sstep(0.6, 1.05, e * (1 + n * 0.45 + n2 * 0.2))) * 0.92);
  }
  d = Math.max(d, lobe(MILE_X, 412, MILE_X, 40, 46, 0.85));
  // el borde de la rejilla: la ciudad densa nunca lo toca, así se deshilacha antes que el mapa (el borde norte es más ajustado)
  const ed = Math.min(x, z * 3.2, W - x, H - z);
  d = Math.min(d, 0.14 + 0.86 * sstep(4, 170, ed) * (0.75 + 0.5 * fbm(x * 0.02 + 7.7, z * 0.02 + 1.9)));
  // un halo leve de recintos sueltos bastante más allá de las últimas calles
  d = Math.max(d, 0.16 * (1 - sstep(220, 560, r)) * clamp(0.55 + n2 * 2.2 + n, 0, 1.4));
  // casas en fila a lo largo de la carretera del aeropuerto saliendo del K-4
  const rd = roadDist(x, z, ROAD0SEG)[0],
    kk = Math.hypot(x - 330, z - 410);
  d = Math.max(d, (1 - sstep(5, 50, rd)) * (1 - sstep(60, 560, kk)) * 0.36 * (1 + n2 * 1.4));
  return clamp(d, 0, 1);
}
// caché gruesa para consultas por píxel
let DCACHE = null;
function cityDc(x, z) {
  const S = 4,
    i = Math.floor((x - WB.x0) / S),
    j = Math.floor((z - WB.z0) / S),
    NX = Math.ceil((WB.x1 - WB.x0) / S) + 2;
  if (!DCACHE) DCACHE = new Map();
  const k = j * NX + i;
  let v = DCACHE.get(k);
  if (v === undefined) {
    v = cityD(WB.x0 + i * S + S / 2, WB.z0 + j * S + S / 2);
    DCACHE.set(k, v);
  }
  return v;
}
function cityDs(x, z) {
  // suave, bilineal sobre la caché
  const S = 4,
    fx = (x - WB.x0) / S - 0.5,
    fz = (z - WB.z0) / S - 0.5,
    i = Math.floor(fx),
    j = Math.floor(fz),
    tx = fx - i,
    tz = fz - j;
  const g = (a, b) => cityDc(WB.x0 + (a + 0.5) * S, WB.z0 + (b + 0.5) * S);
  return (g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - tz) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * tz;
}
// tipos de suelo en la rejilla: 0 parcela, 1 calle, 2 patio, 3 plaza, 4 mercado, 5 acera, 6 bajo edificio, 7 campo, 9 asfalto, 10 arena mojada, 11 playa
function cityKind(i, j) {
  const k = idx(i, j),
    g = grid[k];
  if (g === 3) return 10;
  if (g === 1) return 6;
  if (ground[k] === 5) return 5;
  if (STR[k] === 2) return 9;
  if (STR[k] === 1) return 1;
  if (ground[k]) return ground[k];
  return 0;
}
function landColor(wx, wz, out) {
  const s = coastS(wx, wz);
  let r,
    g,
    b,
    h = fbm(wx * 1.3 + 40, wz * 1.3 + 40) * 0.5;
  const n = fbm(wx * 0.08, wz * 0.08),
    n2 = fbm(wx * 0.9 + 7, wz * 0.9 + 3);
  if (s > -3) {
    const f = clamp((s + 3) / 6, 0, 1);
    r = 222 - 60 * f;
    g = 206 - 60 * f;
    b = 172 - 52 * f;
    h = 0.2;
  } else if (s > -24) {
    r = 224;
    g = 208;
    b = 172;
    const rip = Math.sin(s * 1.7 + n2 * 3);
    r -= 6 * rip;
    g -= 6 * rip;
    b -= 5 * rip;
    h = rip * 0.1;
  } else {
    r = 200 - n * 18;
    g = 172 - n * 16;
    b = 128 - n * 14;
    if (n2 > 0.62) {
      const w = Math.min(1, (n2 - 0.62) * 6);
      r = r * (1 - w) + 132 * w;
      g = g * (1 - w) + 128 * w;
      b = b * (1 - w) + 88 * w;
    }
    if (s > -60) {
      const w = (s + 60) / 36;
      r = r * (1 - w * 0.4) + 220 * w * 0.4;
      g = g * (1 - w * 0.4) + 200 * w * 0.4;
      b = b * (1 - w * 0.4) + 160 * w * 0.4;
    }
    // donde la ciudad se aclara el suelo está pisado y polvoriento: mezclo hacia el color de las parcelas de la ciudad
    const cd = wx > WB.x0 && wx < WB.x1 && wz > WB.z0 && wz < WB.z1 ? cityDs(wx, wz) : 0;
    if (cd > 0.005) {
      const w = sstep(0, 0.4, cd) * 0.75;
      r = r * (1 - w) + 192 * w;
      g = g * (1 - w) + 173 * w;
      b = b * (1 - w) + 136 * w;
    }
  }
  // aldeas: tierra apisonada
  for (const v of VILLAGES) {
    const d = Math.hypot(wx - v.x, wz - v.z);
    if (d > v.r * 1.6) continue;
    const vr = v.r * 1.15 * (0.8 + 0.55 * fbm(wx * 0.04 + v.x, wz * 0.04));
    if (d < vr) {
      const w = clamp(1 - d / vr, 0, 1) * 0.8;
      r = r * (1 - w) + 172 * w;
      g = g * (1 - w) + 146 * w;
      b = b * (1 - w) + 112 * w;
    }
  }
  // carreteras
  const [rd, paved] = roadDist(wx, wz, ROADSEG_LOCAL);
  if (rd < 0) {
    if (paved && false) {
      r = 104;
      g = 99;
      b = 90;
      const pot = vnoise(wx * 0.6, wz * 0.6);
      if (pot > 0.72) {
        r = 160;
        g = 140;
        b = 108;
      }
      if (rd > -0.6) {
        r = 150;
        g = 138;
        b = 112;
      }
      h = 0.1;
    } else {
      r = 186;
      g = 156;
      b = 116;
      const rut = Math.abs(Math.sin(rd * 2.6));
      if (rut > 0.92) {
        r -= 18;
        g -= 16;
        b -= 12;
        h -= 0.3;
      }
    }
  } else if (rd < 2.2) {
    const w = 1 - rd / 2.2;
    r = r * (1 - w * 0.3) + 190 * w * 0.3;
    g = g * (1 - w * 0.3) + 164 * w * 0.3;
    b = b * (1 - w * 0.3) + 124 * w * 0.3;
  }
  // superficies del aeropuerto: la pista, las calles de rodaje, la plataforma y la base dentro de la valla
  const [u, v] = airUV(wx, wz);
  if (TZONE && TZTRACK.length) {
    let best = null;
    for (const s of TZTRACK) {
      const dx = s[2] - s[0],
        dz = s[3] - s[1],
        L2 = dx * dx + dz * dz,
        L = Math.sqrt(L2),
        t = clamp(((wx - s[0]) * dx + (wz - s[1]) * dz) / L2, 0, 1),
        px = s[0] + dx * t,
        pz = s[1] + dz * t,
        d = Math.hypot(wx - px, wz - pz);
      if (!best || d < best[0]) best = [d, ((wx - s[0]) * dz - (wz - s[1]) * dx) / L, s[6] + t * L];
    }
    if (best && best[0] < 2.9) {
      const SW = 5,
        across = best[1] + SW / 2,
        pos = best[2];
      const m = sandM(wx, wz, hash2(Math.floor(wx * 8) * 7 + 5, Math.floor(wz * 8) * 13 + 9)),
        rd_ = airRuts(pos, across, [1.6, SW - 1.6], 0.42);
      let c = [204 * m, 184 * m, 148 * m];
      if (rd_ < 0.2) {
        const f = 0.62 + rd_ * 1.9;
        c = [c[0] * f, c[1] * f, c[2] * f * 0.97];
      }
      const e = clamp((2.9 - best[0]) / 0.8, 0, 1);
      out[0] = r * (1 - e) + c[0] * e;
      out[1] = g * (1 - e) + c[1] * e;
      out[2] = b * (1 - e) + c[2] * e;
      out[3] = rd_ < 0.17 ? -0.2 : 0;
      return;
    }
  }
  if (TZONE && u > TZONE.u0 - 1 && u < TZONE.u1 + 1 && v > TZONE.v0 - 4 && v < TZONE.v1 + 1) {
    const w = sstep(0, 2, Math.min(u - TZONE.u0 + 1, TZONE.u1 + 1 - u, v - TZONE.v0 + 4, TZONE.v1 + 1 - v)) * 0.7,
      p = fbm(wx * 0.6 + 3, wz * 0.6 + 9);
    r = r * (1 - w) + (186 - p * 22) * w;
    g = g * (1 - w) + (162 - p * 20) * w;
    b = b * (1 - w) + (124 - p * 16) * w;
    h = h * (1 - w) + 0.04 * w;
  }
  if (u > -300 && u < 340 && v > -292 && v < 16 && rd >= 0 && airGround(u, v, out)) return;
  out[0] = r;
  out[1] = g;
  out[2] = b;
  out[3] = h;
}
let ROADSEG_LOCAL = ROADSEG;
// arena limpia: cambios de tono amplios y suaves a lo largo de decenas de metros, un sombreado algo más blando a escala de metro y un grano fino y uniforme,
// en lugar de las manchas bastas de antes; las rodadas, los baches y los bordes de calle se pintan encima sin cambios
function sandM(x, z, fine) {
  return (
    0.965 +
    (fbm(x * 0.11 + 13, z * 0.11 + 7) - 0.5) * 0.11 +
    (fbm(x * 0.55 + 3, z * 0.55 + 1) - 0.5) * 0.035 +
    (fine - 0.5) * 0.028
  );
}
const GDET_C = rdTex('assets/textures/detalle-suelo-color.jpg', true),
  GDET_S = rdTex('assets/textures/detalle-suelo-relieve.jpg', true);
const GDET_U = { c: { value: GDET_C }, s: { value: GDET_S } };
const GDET_TILE = 2.6; // unidades por repetición (unos 4 m)
function groundMat() {
  const m = new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x000000, shininess: 1 });
  m.extensions = { derivatives: true };
  m.onBeforeCompile = sh => {
    sh.uniforms.uDetC = GDET_U.c;
    sh.uniforms.uDetS = GDET_U.s;
    sh.vertexShader =
      'varying vec2 vGW;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xz;'
      );
    sh.fragmentShader =
      'uniform sampler2D uDetC, uDetS; varying vec2 vGW;\nfloat gHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }\n' +
      sh.fragmentShader.replace(
        '#include <map_fragment>',
        `
#ifdef USE_MAP
  vec4 texelColor = texture2D( map, vUv );
  float ga = texelColor.a * 255.0, on = smoothstep(108.0, 126.0, ga), wC = clamp((255.0 - ga)/127.0, 0.0, 1.0) * step(120.0, ga);
  texelColor.a = 1.0;
  texelColor = mapTexelToLinear( texelColor );
  vec2 q = vGW / ${GDET_TILE.toFixed(2)};
  // solo el grano de la foto, las piedrecitas y las manchas pequenas (dividida por una copia borrosa de si misma), asi no hay manchas grandes ni se nota la repeticion
  vec2 q2 = mat2(.8, -.6, .6, .8) * q * 1.37 + vec2(.31, .67);
  vec3 dC = texture2D(uDetC, q).rgb / max(texture2D(uDetC, q, 5.0).rgb, vec3(.05)) * .6 + texture2D(uDetC, q2).rgb / max(texture2D(uDetC, q2, 5.0).rgb, vec3(.05)) * .4;
  vec3 dS = texture2D(uDetS, q).rgb / max(texture2D(uDetS, q, 5.0).rgb, vec3(.05)) * .6 + texture2D(uDetS, q2).rgb / max(texture2D(uDetS, q2, 5.0).rgb, vec3(.05)) * .4;
  vec3 det = 1.0 + (mix(dS, dC, wC) - 1.0) * 1.5;
  // y un poco de su color: la ciudad con un tono mas pardo y arenoso, el campo con una arena mas calida
  vec3 avg = mix(vec3(.603, .451, .321), vec3(.572, .434, .299), wC);
  float lum = dot(texelColor.rgb, vec3(.3, .55, .15));
  vec3 tint = avg / dot(avg, vec3(.3, .55, .15)) * lum;
  texelColor.rgb = mix(texelColor.rgb, mix(texelColor.rgb, tint, .22) * det, on);
  // arena: montones de granitos cuadrados, mas claros u oscuros que el suelo, en espacio de mundo para que se vean nitidos; se desvanecen cuando son mas pequenos que un pixel
  float gPx = max(fwidth(vGW.x), fwidth(vGW.y));
  vec3 gMul = vec3(1.0);
  for (int k = 0; k < 2; k++){
    float cs = k == 0 ? .042 : .07, kf = float(k);
    vec2 gc = floor(vGW / cs), gf = fract(vGW / cs);
    float h = gHash(gc + kf*71.3), h2 = gHash(gc*1.7 + 13.1 + kf*5.0), sz = .38 + gHash(gc + 4.2)*.3;
    vec2 o = vec2(gHash(gc + 1.3), gHash(gc + 9.1)) * (1.0 - sz);
    float inG = step(o.x, gf.x) * step(gf.x, o.x + sz) * step(o.y, gf.y) * step(gf.y, o.y + sz);
    float amt = step(k == 0 ? .42 : .72, h) * inG * (1.0 - smoothstep(.45, 1.1, gPx/cs));
    vec3 tone = h2 > .55 ? vec3(1.12 + h2*.22, 1.1 + h2*.2, 1.04 + h2*.16) : vec3(.66 + h2*.3, .64 + h2*.3, .62 + h2*.3);
    gMul *= mix(vec3(1.0), tone, amt);
  }
  // piedras: unas pocas mas grandes, redondeadas e irregulares, con la parte de arriba iluminada, un borde oscuro y un poco de sombra
  {
    float cs = .6;
    vec2 pc = floor(vGW / cs), pf = fract(vGW / cs);
    float h = gHash(pc + 211.0), h2 = gHash(pc + 37.7), h3 = gHash(pc + 91.4);
    if (h > .7){
      float r = (.08 + h2*.14) * (h > .96 ? 1.6 : 1.0);
      vec2 ctr = vec2(.25 + gHash(pc + 5.5)*.5, .25 + gHash(pc + 8.8)*.5);
      float an = h3*6.283, ca = cos(an), sa = sin(an);
      vec2 d = pf - ctr; d = vec2(ca*d.x - sa*d.y, sa*d.x + ca*d.y); d.y *= 1.25 + h2*.5;
      float ang = atan(d.y, d.x), wob = 1.0 + .16*sin(ang*3.0 + h*20.0) + .08*sin(ang*5.0 + h3*30.0);
      float dist = length(d) / (r * wob);
      vec2 sd = pf - ctr - vec2(.035, .045) * (r/.14); sd = vec2(ca*sd.x - sa*sd.y, sa*sd.x + ca*sd.y); sd.y *= 1.25 + h2*.5;
      float sh = (1.0 - smoothstep(.85, 1.25, length(sd)/(r*wob))) * step(1.0, dist);
      float vis = 1.0 - smoothstep(.35, .9, gPx/(r*cs));
      gMul *= mix(1.0, .74, sh * vis);
      float inP = 1.0 - smoothstep(.9, 1.0, dist);
      vec3 pcol = h3 < .33 ? vec3(.86, .84, .82) : h3 < .66 ? vec3(1.05, .92, .74) : vec3(.95, .78, .64);
      float lit = clamp(1.0 - dot(d / (r*wob), vec2(.6, .7)) * .45, .55, 1.35) * (1.0 - .35*smoothstep(.6, 1.0, dist));
      texelColor.rgb = mix(texelColor.rgb, vec3(dot(texelColor.rgb, vec3(.3, .55, .15))) * 1.25 * pcol * lit, inP * vis * on);
    }
  }
  texelColor.rgb *= mix(vec3(1.0), gMul, on);
  diffuseColor *= texelColor;
#endif`
      );
  };
  m.customProgramCacheKey = () => 'gdet';
  return m;
}
function genGroundTex(ch) {
  const inCity = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  const S = inCity || airHiRes(ch) ? 8 : 4,
    N = CS * S;
  ROADSEG_LOCAL = ROADSEG.concat(TRACKS).filter(
    s =>
      Math.min(s[0], s[2]) - 12 < ch.x0 + CS &&
      Math.max(s[0], s[2]) + 12 > ch.x0 &&
      Math.min(s[1], s[3]) - 12 < ch.z0 + CS &&
      Math.max(s[1], s[3]) + 12 > ch.z0
  );
  const col = new Float32Array(N * N * 3),
    hgt = new Float32Array(N * N),
    tmp = [0, 0, 0, 0];
  const occ = (i, j) => (inB(i, j) && grid[idx(i, j)] === 1 ? 1 : 0);
  const occAt = (x, z) => {
    x -= 0.5;
    z -= 0.5;
    const i = Math.floor(x),
      j = Math.floor(z),
      fx = x - i,
      fz = z - j;
    return (
      (occ(i, j) * (1 - fx) + occ(i + 1, j) * fx) * (1 - fz) + (occ(i, j + 1) * (1 - fx) + occ(i + 1, j + 1) * fx) * fz
    );
  };
  const ruts = (pos, across, lanes, sep) => {
    let d = 9;
    for (let l = 0; l < lanes.length; l++) {
      const c = lanes[l] + Math.sin(pos * 0.21 + l * 3.1) * 0.28 + (vnoise(pos * 0.35, l * 11.3) - 0.5) * 0.5;
      d = Math.min(d, Math.abs(across - (c - sep)), Math.abs(across - (c + sep)));
    }
    return d;
  };
  // el color del terreno bajo las afueras, muestreado cuatro veces por unidad y guardado en caché
  const LC = new Map(),
    landAt = (wx, wz) => {
      const a = Math.floor(wx * 4),
        b = Math.floor(wz * 4),
        k = a * 65536 + b;
      let v = LC.get(k);
      if (!v) {
        landColor((a + 0.5) / 4, (b + 0.5) / 4, tmp);
        v = [tmp[0], tmp[1], tmp[2], tmp[3]];
        LC.set(k, v);
      }
      tmp[0] = v[0];
      tmp[1] = v[1];
      tmp[2] = v[2];
      tmp[3] = v[3];
    };
  for (let py = 0; py < N; py++) {
    const wz = ch.z0 + (py + 0.5) / S;
    for (let px = 0; px < N; px++) {
      const wx = ch.x0 + (px + 0.5) / S,
        p = py * N + px;
      if (!(wx >= 0 && wz >= 0 && wx < W && wz < H)) {
        landColor(wx, wz, tmp);
        col[p * 3] = tmp[0];
        col[p * 3 + 1] = tmp[1];
        col[p * 3 + 2] = tmp[2];
        hgt[p] = tmp[3];
        continue;
      }
      const oi = Math.floor(wx),
        oj = Math.floor(wz),
        own = cityKind(oi, oj);
      const ji = clamp(Math.floor(wx + (vnoise(wx * 0.9, wz * 0.9) - 0.5) * 0.8), 0, W - 1),
        jj = clamp(Math.floor(wz + (vnoise(wx * 0.9 + 31, wz * 0.9 + 17) - 0.5) * 0.8), 0, H - 1);
      let t = cityKind(ji, jj);
      if (own === 5) t = 5;
      else if (t === 5) t = own === 9 ? 9 : 1;
      if (own === 6 && t !== 6) t = 6;
      if (t === 6 && own !== 6) t = own === 5 ? 5 : own;
      if (own === 10 || own === 11 || own === 7) t = own;
      if (t === 9) t = 1;
      const c = GCOL[t];
      let m = sandM(wx, wz, hash2(Math.floor(wx * S) * 7 + 1, Math.floor(wz * S) * 13 + 5)),
        r = c[0] * m,
        g = c[1] * m,
        b = c[2] * m;
      let h = fbm(wx * 1.4 + 40, wz * 1.4 + 40) * 0.07;
      const k = idx(oi, oj);
      if (t === 1 || t === 9) {
        let best = 9;
        if (SVX[k] >= 0) {
          const wide = SVW[k] > 5;
          best = Math.min(best, ruts(wz, wx - SVX[k], wide ? [2.4, SVW[k] - 2.4] : [1.6, SVW[k] - 1.6], 0.42));
        }
        if (SHZ[k] >= 0) {
          const wide = SHW[k] > 5;
          best = Math.min(best, ruts(wx, wz - SHZ[k], wide ? [2.6, SHW[k] - 2.6] : [1.6, SHW[k] - 1.6], 0.42));
        }
        if (t === 1) {
          if (best < 0.17) {
            const f = 0.8 + best * 1.1;
            r *= f;
            g *= f;
            b *= f * 0.97;
            h -= (0.17 - best) * 2.2;
          }
          const pn = fbm(wx * 0.33 + 5, wz * 0.33 + 9);
          if (pn > 0.66) {
            const w = Math.min(1, (pn - 0.66) * 12);
            r += 18 * w;
            g += 16 * w;
            b += 14 * w;
          }
        } else {
          const cr = Math.abs(vnoise(wx * 1.7, wz * 1.7) - 0.5);
          if (cr < 0.02) {
            r *= 0.7;
            g *= 0.7;
            b *= 0.7;
            h -= 0.3;
          }
          let ed = 9;
          if (SVX[k] >= 0) ed = Math.min(wx - SVX[k], SVX[k] + SVW[k] - wx);
          if (SHZ[k] >= 0) ed = Math.min(ed, wz - SHZ[k], SHZ[k] + SHW[k] - wz);
          const sd = 1 - sstep(0.3, 1.6 + fbm(wx * 0.4, wz * 0.4) * 1.4, ed);
          if (sd > 0) {
            r = r * (1 - sd) + 196 * sd;
            g = g * (1 - sd) + 174 * sd;
            b = b * (1 - sd) + 134 * sd;
          }
          const pot = fbm(wx * 0.5 + 3, wz * 0.5 + 8) + (vnoise(wx * 1.3 + 9, wz * 1.3) - 0.5) * 0.12;
          if (pot > 0.6) {
            const w = Math.min(1, (pot - 0.6) * 8);
            r = r * (1 - w) + 178 * w;
            g = g * (1 - w) + 158 * w;
            b = b * (1 - w) + 122 * w;
            h += w * 0.2;
          }
          let ctr = 9;
          if (SVX[k] >= 0 && SVW[k] >= 7) ctr = Math.abs(wx - (SVX[k] + SVW[k] / 2));
          if (SHZ[k] >= 0 && SHW[k] >= 7) ctr = Math.min(ctr, Math.abs(wz - (SHZ[k] + SHW[k] / 2)));
          if (ctr < 0.08 && Math.floor((SVX[k] >= 0 ? wz : wx) * 0.8) & 1) {
            r = 200;
            g = 190;
            b = 160;
          }
        }
      } else if (t === 3) {
        const row = Math.floor(wz / 0.62),
          sx = wx / 0.62 + (row & 1) * 0.5,
          fx = sx - Math.floor(sx),
          fz = wz / 0.62 - row;
        if (fx < 0.07 || fz < 0.08) {
          r *= 0.82;
          g *= 0.82;
          b *= 0.8;
          h -= 0.15;
        } else {
          const sv = 0.94 + hash2(Math.floor(sx), row) * 0.12;
          r *= sv;
          g *= sv;
          b *= sv;
        }
      } else if (t === 5) {
        const fx = wx - Math.floor(wx),
          fz = wz - Math.floor(wz);
        if (fx < 0.04 || fz < 0.04) {
          r *= 0.88;
          g *= 0.88;
          b *= 0.86;
        }
        h = 0.6;
      } else if (t === 4) {
        if (hash2(Math.floor(wx * S) * 3 + 11, Math.floor(wz * S) * 5 + 2) > 0.965) {
          r = 205;
          g = 178;
          b = 96;
        }
      } else if (t === 7) {
        const ex = (wx - STADIUM.x) / (STADIUM.rx * 0.72),
          ez = (wz - STADIUM.z) / (STADIUM.rz * 0.72);
        if (Math.abs(ex) < 1 && Math.abs(ez) < 1) {
          const ln =
            Math.abs(Math.abs(ex) - 0.98) < 0.012 ||
            Math.abs(Math.abs(ez) - 0.98) < 0.016 ||
            Math.abs(ex) < 0.006 ||
            Math.abs(Math.hypot(ex * 1.3, ez) - 0.25) < 0.012;
          if (ln) {
            r = 214;
            g = 208;
            b = 186;
          }
        }
      } else if (t === 10 || t === 11) {
        landColor(wx, wz, tmp);
        r = tmp[0];
        g = tmp[1];
        b = tmp[2];
        h = tmp[3];
      }
      if (t !== 6 && t !== 10) {
        const ao = occAt(wx, wz);
        const f = 1 - 0.3 * Math.min(1, ao * 1.3);
        r *= f;
        g *= f;
        b *= f;
      }
      // las afueras se funden con el monte: las parcelas y las calles de tierra toman el color del terreno que las rodea
      if (t !== 6 && t !== 9 && t < 7) {
        const cd = cityDs(wx, wz),
          f = 1 - sstep(0.04, 0.36, cd);
        if (f > 0.01) {
          landAt(wx, wz);
          const ff = t === 1 ? f * 0.5 : t === 5 ? f * 0.3 : f;
          r = r * (1 - ff) + tmp[0] * ff;
          g = g * (1 - ff) + tmp[1] * ff;
          b = b * (1 - ff) + tmp[2] * ff;
          h = h * (1 - ff) + tmp[3] * ff;
        }
      }
      col[p * 3] = r;
      col[p * 3 + 1] = g;
      col[p * 3 + 2] = b;
      hgt[p] = h;
    }
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d'),
    img = ctx.createImageData(N, N),
    Dd = img.data;
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      const p = py * N + px;
      const hx = hgt[p + (px < N - 1 ? 1 : 0)] - hgt[p - (px > 0 ? 1 : 0)],
        hz = hgt[p + (py < N - 1 ? N : 0)] - hgt[p - (py > 0 ? N : 0)];
      let s = 1 + (hx * 0.9 - hz * 0.35) * 2.2;
      const r_ = hash2(px * 17 + ch.i * 991, py * 29 + ch.j * 577);
      if (r_ < 0.006) s *= 0.86;
      else if (r_ < 0.012) s *= 1.06;
      Dd[p * 4] = c255(col[p * 3] * s);
      Dd[p * 4 + 1] = c255(col[p * 3 + 1] * s);
      Dd[p * 4 + 2] = c255(col[p * 3 + 2] * s);
      // qué foto va encima: la de ciudad, la de campo abierto o ninguna (el aeropuerto y el campo del estadio)
      const wx = ch.x0 + (px + 0.5) / S,
        wz = ch.z0 + (py + 0.5) / S,
        [au, av] = airUV(wx, wz),
        gi = Math.floor(wx),
        gj = Math.floor(wz);
      let a_;
      if (
        (au > -300 && au < 340 && av > -292 && av < 16) ||
        (TZONE && au > TZONE.u0 - 6 && au < TZONE.u1 + 6 && av > TZONE.v0 - 8 && av < TZONE.v1 + 6) ||
        (inB(gi, gj) && ground[idx(gi, gj)] === 7)
      )
        a_ = 100;
      else {
        const cd = wx > WB.x0 && wx < WB.x1 && wz > WB.z0 && wz < WB.z1 ? cityDs(wx, wz) : 0;
        a_ = 255 - Math.round(127 * sstep(0.04, 0.32, cd));
      }
      Dd[p * 4 + 3] = a_;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  return tex;
}
/* Lo que se reparte por chunk: escombros en la ciudad, acacias y matorral fuera */
function dressChunk(ch) {
  const city = ch.x0 < W && ch.z0 < H && ch.x0 + CS > 0 && ch.z0 + CS > 0;
  if (city) {
    MAT = M.GEN;
    for (let k = 0; k < 26; k++) {
      const i = ch.x0 + ri(CS),
        j = ch.z0 + ri(CS);
      if (!inB(i, j) || grid[idx(i, j)] === 1 || grid[idx(i, j)] === 3 || ground[idx(i, j)] === 11) continue;
      const g0 = GHOST;
      GHOST = stadIn(i + 0.5, j + 0.5) || g0;
      B(
        i + rnd(),
        0.04,
        j + rnd(),
        rr(0.08, 0.3),
        rr(0.04, 0.12),
        rr(0.08, 0.25),
        pick([0x6b5a45, 0x3a3a36, 0x8a7a62, 0xd8d0bc, 0x9d9484, 0x4d6a5a, 0xb4aa98]),
        { ry: rnd() * 3 }
      );
      GHOST = g0;
    }
    // ladrillos sueltos (los dos tipos subidos) y piedras en el suelo abierto
    for (let k = 0; k < 9; k++) {
      const i = ch.x0 + ri(CS),
        j = ch.z0 + ri(CS);
      if (
        !inB(i, j) ||
        grid[idx(i, j)] === 1 ||
        grid[idx(i, j)] === 3 ||
        ground[idx(i, j)] === 11 ||
        reserved[idx(i, j)]
      )
        continue;
      const bx = i + rnd(),
        bz = j + rnd(),
        h = phs(bx, bz, 24),
        g0 = GHOST;
      GHOST = stadIn(bx, bz) || g0;
      if (k < 5)
        prop(
          'kit3',
          h < 0.55 ? 'brick0' : 'brick1',
          bx,
          0,
          bz,
          (h * 31) % 6.283,
          rr(0.9, 1.15),
          (h * 7) % 1 < 0.5 ? 0xffd2b8 : 0xffffff,
          { rx: (h * 13) % 1 < 0.25 ? PH : 0, rz: rr(-0.12, 0.12) }
        );
      else prop('kit3', 'st' + Math.floor(h * 12), bx, -0.01, bz, (h * 31) % 6.283, rr(0.35, 0.8), 0xffffff);
      GHOST = g0;
    }
    // tablones y postes sueltos (el pack subido, todo menos su poste oscuro): algún montón aquí y allá y alguna pieza suelta. Sale de un hash
    // del chunk, no de la secuencia aleatoria, así no se mueve nada más de la ciudad
    for (let k = 0; k < 5; k++) {
      const h0 = phs(ch.x0 + k * 7.3, ch.z0 - k * 3.1, 41);
      if (h0 < 0.45) continue;
      const cx = ch.x0 + phs(ch.x0, ch.z0 + k, 42) * CS,
        cz = ch.z0 + phs(ch.z0 + k, ch.x0, 43) * CS,
        n = h0 > 0.8 ? 2 + Math.floor(phs(cx, cz, 44) * 4) : 1;
      for (let q = 0; q < n; q++) {
        const h = phs(cx + q * 1.7, cz - q * 2.3, 45),
          bx = cx + (n > 1 ? (phs(cz, cx + q, 46) - 0.5) * 2.4 : 0),
          bz = cz + (n > 1 ? (phs(cx + q, cz, 47) - 0.5) * 2.4 : 0);
        const i = Math.floor(bx),
          j = Math.floor(bz);
        if (
          !inB(i, j) ||
          grid[idx(i, j)] === 1 ||
          grid[idx(i, j)] === 3 ||
          ground[idx(i, j)] === 11 ||
          reserved[idx(i, j)] ||
          stadIn(bx, bz)
        )
          continue;
        prop(
          'wood',
          'wd' + Math.floor(h * 7),
          bx,
          0.003 + q * 0.012,
          bz,
          (h * 47) % 6.283,
          0.85 + ((h * 13) % 0.3),
          0xffffff,
          { rz: (((h * 29) % 1) - 0.5) * 0.12, rx: (((h * 61) % 1) - 0.5) * 0.08 }
        );
      }
    }
    for (let k = 0; k < 7; k++) {
      const h0 = phs(ch.x0 - k * 5.7, ch.z0 + k * 4.9, 71);
      if (h0 < 0.3) continue;
      const cx = ch.x0 + phs(ch.x0 + k * 2.1, ch.z0, 72) * CS,
        cz = ch.z0 + phs(ch.z0, ch.x0 - k * 1.3, 73) * CS,
        i0 = Math.floor(cx),
        j0 = Math.floor(cz);
      if (
        !inB(i0, j0) ||
        grid[idx(i0, j0)] !== 0 ||
        ground[idx(i0, j0)] === 11 ||
        reserved[idx(i0, j0)] ||
        stadIn(cx, cz) ||
        (MIS && MIS.laneFree && MIS.laneFree(i0, j0))
      )
        continue;
      // al lado de una pared si la hay, para que los montones queden arrimados a las casas
      let wx = 0,
        wz = 0;
      for (const [a, b] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ])
        if (inB(i0 + a, j0 + b) && grid[idx(i0 + a, j0 + b)] === 1) {
          wx = a;
          wz = b;
          break;
        }
      const ry0 = wx || wz ? Math.atan2(wx, wz) : (h0 * 31) % 6.283,
        bx0 = i0 + 0.5 + wx * 0.22,
        bz0 = j0 + 0.5 + wz * 0.22;
      const kind = phs(cx, cz, 74);
      if (kind < 0.1) {
        prop('deco9', 'ibc', bx0, 0, bz0, ry0, 0.95, 0xffffff);
        continue;
      }
      const n = kind < 0.45 ? 1 : 2 + Math.floor(phs(cz, cx, 75) * 3);
      for (let q = 0; q < n; q++) {
        const h = phs(cx + q * 2.3, cz - q * 1.9, 76),
          ox = q ? (phs(cz + q, cx, 77) - 0.5) * 1.3 : 0,
          oz = q ? (phs(cx, cz + q, 78) - 0.5) * 1.3 : 0;
        const bx = bx0 + ox - wx * Math.abs(ox) * 0.3,
          bz = bz0 + oz - wz * Math.abs(oz) * 0.3,
          i = Math.floor(bx),
          j = Math.floor(bz);
        if (!inB(i, j) || grid[idx(i, j)] === 1 || grid[idx(i, j)] === 3) continue;
        const pt =
          q === 0 && kind < 0.7
            ? h < 0.7
              ? 'can'
              : 'canlay'
            : ['tbag', 'tbag', 'tbox', 'litter', 'litter', 'canlay'][Math.floor(h * 6)];
        prop(
          'deco9',
          pt,
          bx,
          0,
          bz,
          pt === 'can' ? ry0 + (h - 0.5) * 0.6 : (h * 41) % 6.283,
          pt === 'litter' ? 0.9 + h * 0.4 : 0.78 + h * 0.12,
          0xffffff
        );
      }
    }
    for (let k = 0; k < 4; k++) {
      const i = ch.x0 + ri(CS),
        j = ch.z0 + ri(CS);
      if (!inB(i, j) || grid[idx(i, j)] !== 0 || ground[idx(i, j)] === 11 || reserved[idx(i, j)]) continue;
      const bx = i + rnd(),
        bz = j + rnd(),
        sx = rr(0.15, 0.35),
        sy = rr(0.08, 0.2),
        sz = rr(0.15, 0.35),
        c = pick([0x9a9468, 0xa8a072, 0x8e8660]);
      if (!stadIn(bx, bz))
        prop(
          'bags',
          'bag',
          bx,
          0,
          bz,
          phs(bx, bz, 11) * 6.283,
          0.8 + sx,
          { 0x9a9468: 0xc8b890, 0xa8a072: 0xd2c29a, 0x8e8660: 0xbcae86 }[c],
          { sy: 1.5, rz: 0.1 }
        );
    }
  }
  // campo: acacias, matorral y rocas, lejos del agua, las carreteras, el aeródromo y el centro de las aldeas; dentro de la rejilla solo en las afueras vacías
  const nT = 16;
  for (let k = 0; k < nT; k++) {
    const x = ch.x0 + rnd() * CS,
      z = ch.z0 + rnd() * CS;
    if (x >= -1 && z >= -1 && x < W + 1 && z < H + 1) {
      const i = Math.floor(x),
        j = Math.floor(z);
      if (!inB(i, j) || grid[idx(i, j)] !== 0 || STR[idx(i, j)] || reserved[idx(i, j)] || ground[idx(i, j)]) continue;
      if (rnd() > 1 - sstep(0.08, 0.3, cityDs(x, z))) continue;
    }
    const s = coastS(x, z);
    if (s > -28) continue;
    const [u, v] = airUV(x, z);
    if (u > BASE.u0 - 12 && u < BASE.u1 + 40 && v > BASE.v0 - 12 && v < 30) continue;
    if (TZONE && u > TZONE.u0 - 10 && u < TZONE.u1 + 10 && v > TZONE.v0 - 12 && v < TZONE.v1 + 8) continue;
    if (TZONE && roadDist(x, z, TZTRACK)[0] < 4) continue;
    if (roadDist(x, z, ROADSEG)[0] < 4) continue;
    if (VILLAGES.some(vl => Math.hypot(x - vl.x, z - vl.z) < vl.r * 0.6)) continue;
    const r = rnd();
    if (r < 0.22) acacia(x, z, rr(0.8, 1.3));
    else if (r < 0.82) shrub(x, z);
    else {
      MAT = M.STONE;
      const sx = rr(0.3, 0.8),
        sy = rr(0.2, 0.4),
        sz = rr(0.3, 0.7),
        c = pick([0x9a8a70, 0xa89878, 0x8a7a62]),
        ry = rnd() * 3;
      B(x, 0.12, z, sx, sy, sz, c, { ry, hid: 1 });
      const h = phs(x, z, 8),
        rk = 'r' + Math.floor(h * 8);
      prop(
        'rocks',
        rk,
        x,
        0,
        z,
        ry,
        (sx + sz) / (rk === 'r4' ? 1.25 : 0.9),
        [0xe8d8c0, 0xf0e0c4, 0xd8c8b0][Math.floor(h * 24) % 3]
      );
      if (h > 0.5)
        prop(
          'rocks',
          'r' + Math.floor(phs(z, x, 9) * 8),
          x + (h - 0.75) * 1.6,
          0,
          z + (phs(z, x, 9) - 0.5) * 1.4,
          ry * 2,
          0.45 + h * 0.3,
          0xe8d8c0
        );
    }
    // unas cuantas piedras sueltas (el set subido) alrededor de cada sitio en campo abierto
    for (let q = 0; q < 3; q++) {
      const h = phs(x + q, z, 25);
      if (h < 0.45) continue;
      prop(
        'kit3',
        'st' + Math.floor((h * 41) % 12),
        x + (phs(x, z + q, 26) - 0.5) * 5,
        -0.01,
        z + (phs(z, x + q, 27) - 0.5) * 5,
        (h * 17) % 6.283,
        rr(0.3, 0.75),
        0xffffff
      );
    }
  }
  // recintos sueltos más allá de las calles, tan apretados como diga el campo de densidad
  if (!city || ch.x0 < 0 || ch.z0 < 0 || ch.x0 + CS > W || ch.z0 + CS > H) {
    const placed = [];
    for (let k = 0; k < 7; k++) {
      const x = ch.x0 + 3 + rnd() * (CS - 6),
        z = ch.z0 + 3 + rnd() * (CS - 6);
      if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 10)) continue;
      if (x >= -6 && z >= -6 && x < W + 6 && z < H + 6) continue;
      const cd = cityDs(x, z);
      if (rnd() > cd * 2.4) continue;
      if (coastS(x, z) > -28 || roadDist(x, z, ROADSEG)[0] < 7) continue;
      const [u, v] = airUV(x, z);
      if (u > BASE.u0 - 20 && u < BASE.u1 + 45 && v > BASE.v0 - 20 && v < 30) continue;
      placed.push([x, z]);
      smallHouse(x, z, { rot: true });
    }
  }
}
function acacia(x, z, s) {
  MAT = M.WOOD;
  C(x, 1.1 * s, z, 0.13 * s, 2.2 * s, 0x4a3a2a, { hid: 1 });
  const cl = pick([0x5a6a34, 0x667438, 0x4e5e30, 0x707a40]);
  LEAF_OFF = true;
  leafCanopy(x, 2.42 * s, z, 1.85 * s, 0.26 * s, 1.55 * s, cl, 70);
  leafCanopy(x + 0.3 * s, 2.7 * s, z - 0.2 * s, 1.2 * s, 0.22 * s, 1.1 * s, shade(cl, 1.12), 34);
  LEAF_OFF = false;
  treeAt(x, z, 3.3 * s, false);
}
