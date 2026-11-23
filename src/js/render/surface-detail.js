/* ====================================================================================================
 * render/surface-detail.js
 *
 * Detalle de superficie: texturizado procedural por material para todo el mundo instanciado
 * Ids de material: 0 genérico 1 enlucido 2 hormigón 3 metal 4 cristal 5 madera 6 tela 7 rueda 8 saco terrero 9 chapa
 *               10 piedra 11 hojas 12 persiana 13 quemado 14 ladrillo 15 pila de neumáticos
 * ================================================================================================== */

'use strict';

const DET_VS_HEAD = `
#ifdef USE_INSTANCING
attribute float aMat;
#endif
uniform float uMat; uniform vec3 uExt;
varying vec3 vLP; varying vec3 vLN; varying vec3 vSc; varying vec3 vWP; varying vec3 vWN; varying vec3 vSeed; varying float vMat;
`;
const DET_VS_BODY = `
{
#ifdef USE_INSTANCING
  mat4 dIM = instanceMatrix;
  vMat = aMat;
#else
  mat4 dIM = mat4(1.0);
  vMat = uMat;
#endif
  vec3 dS = vec3(length(dIM[0].xyz), length(dIM[1].xyz), length(dIM[2].xyz));
  vSc = dS * uExt;
  vLP = position * dS;
  vLN = normal;
  vWP = (modelMatrix * dIM * vec4(position, 1.0)).xyz;
  vWN = normalize(mat3(modelMatrix) * (mat3(dIM) * (normal / max(dS * dS, vec3(1e-6)))));
  vSeed = (modelMatrix * dIM[3]).xyz;
}
`;
const DET_FS_HEAD = `
uniform float uCyl; uniform float uBump;
varying vec3 vLP; varying vec3 vLN; varying vec3 vSc; varying vec3 vWP; varying vec3 vWN; varying vec3 vSeed; varying float vMat;
float dHash(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float dNoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dHash(i), dHash(i + vec3(1.0,0.0,0.0)), f.x), mix(dHash(i + vec3(0.0,1.0,0.0)), dHash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(dHash(i + vec3(0.0,0.0,1.0)), dHash(i + vec3(1.0,0.0,1.0)), f.x), mix(dHash(i + vec3(0.0,1.0,1.0)), dHash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
float dFbm(vec3 p){ return dNoise(p) * .5 + dNoise(p * 2.07 + 3.1) * .3 + dNoise(p * 4.13 + 7.7) * .2; }
vec3 dBrick(vec2 q, float sd, out float hb){
  vec2 bu = q / vec2(.15, .07); float row = floor(bu.y); bu.x += mod(row, 2.0) * .5; vec2 f = fract(bu);
  float mort = max(step(f.x, .12), step(f.y, .2));
  vec3 bc = vec3(.6, .33, .23) * (.78 + dHash(vec3(floor(bu.x), row, sd)) * .42);
  hb = 1.0 - mort;
  return mix(bc, vec3(.66, .62, .54), mort);
}
vec3 dDetail(vec3 base, out float h){
  h = 0.0;
  int m = int(vMat + .5);
  vec3 an = abs(vLN);
  float side = 1.0 - step(.5, abs(vWN.y));
  vec2 uv; vec2 ex;
  if (an.y > .5){ uv = vLP.xz; ex = vSc.xz; } else if (an.x > .5){ uv = vLP.zy; ex = vSc.zy; } else { uv = vLP.xy; ex = vSc.xy; }
  bool uDom = ex.x >= ex.y;
  float dom = uDom ? uv.x : uv.y;
  float crs = uDom ? uv.y : uv.x;
  float hx = abs(vWN.x) > .5 ? vWP.z : vWP.x;
  float sd = dHash(floor(vSeed * 7.3) + .5);
  float b = dFbm(vWP * 1.4 + sd * 9.0);
  float g = dHash(floor(vWP * 11.0));
  float lowY = 1.0 - smoothstep(0.0, 0.8, vWP.y);
  vec3 dust = vec3(.62, .54, .42);
  vec3 c = base;
  if (m == 1 || m == 14){
    c *= .84 + b * .3; c *= .97 + g * .05;
    float st = smoothstep(.5, .9, dNoise(vec3(hx * 5.0, vWP.y * .4, sd * 13.0)));
    c *= 1.0 - st * .16 * side;
    c = mix(c, c * dust * 1.3, lowY * .55 * side);
    float cr = abs(dNoise(vWP * 2.6 + 11.0) - .5);
    float crack = (1.0 - smoothstep(0.0, .016, cr)) * smoothstep(.72, .82, dNoise(vWP * .6 + 5.0)) * side;
    c *= 1.0 - crack * .5; h -= crack * .6;
    float exB = smoothstep(.64, .67, dFbm(vWP * .55 + 17.0 + sd * 3.0)) * side;
    if (m == 14) exB = 1.0;
    if (exB > 0.0){
      float hb; vec3 bc = dBrick(side > .5 ? vec2(hx, vWP.y) : vWP.xz, sd, hb);
      c = mix(c, bc * (.9 + b * .2), exB); h += exB * (hb * .6 - .7);
    }
    h += b * .5;
  } else if (m == 2){
    c *= .85 + b * .25; c *= .96 + g * .06;
    float pore = step(.985, dHash(floor(vWP * 16.0) + 3.0)); c *= 1.0 - pore * .18; h -= pore * .3;
    float form = side * step(fract(vWP.y / .42), .04); c *= 1.0 - form * .12; h -= form * .3;
    c = mix(c, c * dust * 1.25, lowY * .4 * side);
    h += b * .4;
  } else if (m == 3){
    c *= .93 + dFbm(vWP * 3.0 + sd * 5.0) * .12;
    float seam = side * step(fract(dom / .58 + sd), .035);
    c *= 1.0 - seam * .35; h -= seam * .6;
    float rust = smoothstep(.7, .8, dFbm(vWP * 2.4 + sd * 7.0) + lowY * .2);
    c = mix(c, vec3(.42, .24, .12) * (.8 + g * .4), rust * .85); h += rust * .3;
    float scr = (1.0 - smoothstep(0.0, .02, abs(dNoise(vec3(dom * 1.5, crs * 28.0, sd * 9.0)) - .5))) * step(.6, dNoise(vWP * 1.3 + 2.0));
    c += scr * .1;
    c = mix(c, dust * .9, lowY * .45 * smoothstep(.3, .7, dNoise(vWP * 4.0)));
    if (uCyl > .5){ float rb = step(fract((vLP.y / max(vSc.y, .01) + .5) * 3.0), .07); c *= 1.0 - rb * .22; h += rb * .7; }
  } else if (m == 4){
    float vt = clamp(vLP.y / max(vSc.y, .01) + .5, 0.0, 1.0);
    c = mix(base * .6, base * 1.35 + vec3(.1, .12, .13), vt * vt);
    float refl = smoothstep(0.0, .05, .1 - abs(fract((hx + vWP.y) * 1.1 + sd) - .5));
    c += refl * vec3(.22, .25, .27) * side;
    c = mix(c, dust, (1.0 - vt) * .22 + g * .06);
    if (sd > .8){ float ck = 1.0 - smoothstep(0.0, .03, abs(dNoise(vWP * 9.0 + sd) - .5)); c = mix(c, vec3(.8, .85, .85), ck * .7); }
  } else if (m == 5){
    float gr = dNoise(vec3(dom * 1.8, crs * 26.0, sd * 11.0));
    c *= .78 + .3 * smoothstep(.2, .8, gr);
    float plank = step(fract(crs / .16 + sd), .07); c *= 1.0 - plank * .4; h -= plank * .7;
    float knot = step(.965, dHash(floor(vec3(dom * 6.0, crs * 6.0, sd * 5.0)))); c *= 1.0 - knot * .35;
    c = mix(c, c * .75 + dust * .15, b * .4);
    h += gr * .25;
  } else if (m == 6){
    float weave = dHash(floor(vec3(uv * 24.0, sd))); c *= .95 + weave * .07;
    if (sd > .45){ float s = step(.5, fract(dom / .2)); c = mix(c, vec3(.88, .85, .76) * (.9 + b * .1), s * .8); }
    c = mix(c, c * .7 + vec3(.22), b * .35);
    float fold = dNoise(vec3(dom * 3.0, crs * .5, sd * 3.0)); h += fold * .8; c *= .9 + fold * .15;
  } else if (m == 7 || m == 15){
    c = base * (.94 + g * .1);
    if (uCyl > .5){
      float r = length(vLP.xz) / max(.5 * vSc.x, .01);
      if (an.y > .5){
        if (m == 7){ float hub = 1.0 - step(.56, r); c = mix(c, vec3(.5, .5, .47) * (.8 + b * .3), hub); h += hub * .6;
          float nut = hub * step(.3, r) * step(.9, dHash(floor(vLP * 70.0))); c *= 1.0 - nut * .5; }
        else { float hole = 1.0 - step(.5, r); c *= 1.0 - hole * .65; h -= hole; }
        c *= .85 + .2 * smoothstep(.6, 1.0, r);
      } else { float tread = step(.5, fract(atan(vLP.z, vLP.x) * 3.82)); c *= .8 + tread * .25; h += tread * .5; }
    }
    c = mix(c, dust * .7, lowY * .3);
  } else if (m == 8){
    float e = max(abs(uv.x) / max(ex.x * .5, .01), abs(uv.y) / max(ex.y * .5, .01));
    float puff = 1.0 - e * e;
    c *= .76 + puff * .32;
    float wv = dHash(floor(vec3(uv * 25.0, 1.0))); c *= .96 + wv * .06;
    float tie = step(.9, e) * step(fract(dom * 9.0), .5); c *= 1.0 - tie * .15;
    c = mix(c, dust, lowY * .25 + b * .15);
    h += puff * 1.6;
  } else if (m == 9){
    float u = side > .5 ? hx : vWP.x;
    float cor = sin(u * 70.0);
    float pan = dHash(vec3(floor(u / .55), floor(vWP.y / .9), sd * 4.0));
    c *= .85 + pan * .25; c *= .92 + cor * .06; h += cor * .5;
    float rs = smoothstep(.45, .75, dNoise(vec3(u * 6.0, vWP.y * .7, sd * 8.0)) + (pan > .7 ? .25 : 0.0));
    c = mix(c, vec3(.45, .27, .15) * (.8 + g * .3), rs * .8);
  } else if (m == 10){
    vec2 q = (side > .5 ? vec2(hx, vWP.y) : vWP.xz) / vec2(.32, .2); float row = floor(q.y); q.x += mod(row, 2.0) * .5; vec2 f = fract(q);
    float mort = max(step(f.x, .06), step(f.y, .1));
    c *= .88 + dHash(vec3(floor(q.x), row, 2.0)) * .14; c *= .94 + b * .12; c *= 1.0 - mort * .14; h += (1.0 - mort) * .5;
  } else if (m == 11){
    float lv = dNoise(vWP * 9.0); c *= .62 + lv * .6 + b * .2; h += lv * .8;
  } else if (m == 12){
    float sl = fract(vWP.y / .07); c *= .82 + .22 * smoothstep(.1, .5, sl); h += smoothstep(0.0, .5, sl) * .6;
    float rs = smoothstep(.62, .8, dFbm(vWP * 2.0 + sd * 6.0) + lowY * .2); c = mix(c, vec3(.44, .26, .14), rs * .7);
    if (sd > .55){ float gf = smoothstep(.6, .64, dFbm(vWP * 2.8 + sd * 20.0));
      vec3 gc = normalize(vec3(dHash(vec3(sd, 1.0, 2.0)), dHash(vec3(sd, 3.0, 4.0)), dHash(vec3(sd, 5.0, 6.0))) + .05) * .95;
      c = mix(c, gc, gf * .85); }
  } else if (m == 13){
    c = vec3(.09, .085, .08) * (.85 + g * .3);
    float rs = smoothstep(.5, .7, dFbm(vWP * 2.2 + sd * 4.0)); c = mix(c, vec3(.36, .2, .11) * (.8 + g * .3), rs);
    float ash = smoothstep(.65, .8, dNoise(vWP * 5.0)); c = mix(c, vec3(.42, .4, .37), ash * .6 * (1.0 - side * .5));
    h += rs * .5 + b * .3;
  } else {
    c *= .9 + b * .15 + g * .04;
  }
  return clamp(c, 0.0, 1.5);
}
`;
const DET_FS_COLOR = `
#include <color_fragment>
float dH = 0.0;
diffuseColor.rgb = dDetail(diffuseColor.rgb, dH);
`;
const DET_FS_BUMP = `
#include <normal_fragment_begin>
{
  vec3 dsX = dFdx(-vViewPosition), dsY = dFdy(-vViewPosition);
  float dhx = dFdx(dH) * uBump, dhy = dFdy(dH) * uBump;
  vec3 dR1 = cross(dsY, normal), dR2 = cross(normal, dsX);
  float dDet = dot(dsX, dR1);
  vec3 dGrad = sign(dDet) * (dhx * dR1 + dhy * dR2);
  vec3 dN = normalize(abs(dDet) * normal - dGrad);
  normal = normalize(mix(normal, dN, .85));
}
`;
const DETAIL_ON = { v: true };
const detailMats = [];
function patchDetail(mat, opt) {
  opt = opt || {};
  mat.extensions = Object.assign(mat.extensions || {}, { derivatives: true });
  mat.onBeforeCompile = sh => {
    if (!DETAIL_ON.v) return;
    sh.uniforms.uMat = { value: opt.m || 0 };
    sh.uniforms.uCyl = { value: opt.cyl ? 1 : 0 };
    sh.uniforms.uExt = { value: new T.Vector3().fromArray(opt.ext || [1, 1, 1]) };
    sh.uniforms.uBump = { value: opt.bump || 0.9 };
    sh.vertexShader =
      DET_VS_HEAD + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + DET_VS_BODY);
    let fs = DET_FS_HEAD + sh.fragmentShader.replace('#include <color_fragment>', DET_FS_COLOR);
    if (fs.indexOf('#include <normal_fragment_begin>') >= 0 && fs.indexOf('vViewPosition') >= 0)
      fs = fs.replace('#include <normal_fragment_begin>', DET_FS_BUMP);
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'det' + (DETAIL_ON.v ? 1 : 0) + (opt.cyl ? 'c' : 'b') + (opt.m || 0);
  detailMats.push(mat);
  return mat;
}
function checkDetailShaders() {
  if (!DETAIL_ON.v) return;
  const bad = (renderer.info.programs || []).some(p => p.diagnostics && p.diagnostics.runnable === false);
  if (bad) {
    DETAIL_ON.v = false;
    UNIT_ON.v = false;
    for (const m of detailMats) m.needsUpdate = true;
  }
}
function rdTex(uri, rep_) {
  const t = new T.TextureLoader().load(uri);
  if (rep_) {
    t.wrapS = t.wrapT = T.RepeatWrapping;
  }
  t.minFilter = T.LinearMipmapLinearFilter;
  t.magFilter = T.LinearFilter;
  t.anisotropy = 4;
  return t;
}
