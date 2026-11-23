/* ====================================================================================================
 * render/film-grade.js
 *
 * Postproceso de etalonaje tipo película
 * ================================================================================================== */

'use strict';

const rt = new T.WebGLRenderTarget(64, 64, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
const HAS_DEPTH = renderer.capabilities.isWebGL2 || !!renderer.extensions.get('WEBGL_depth_texture');
if (HAS_DEPTH) {
  rt.depthTexture = new T.DepthTexture();
  rt.depthTexture.type = T.UnsignedIntType;
}
const NVP = [0, 1, 2, 3, 4, 5].map(() => new T.Vector3(0, -999, 0)),
  _ipv = new T.Matrix4();
const postScene = new T.Scene(),
  postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new T.ShaderMaterial({
  uniforms: {
    tD: { value: rt.texture },
    uRes: { value: new T.Vector2(64, 64) },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uGold: { value: 0 },
    uGoldT: { value: goldT },
    tDepth: { value: HAS_DEPTH ? rt.depthTexture : null },
    uHasDepth: { value: HAS_DEPTH ? 1 : 0 },
    uInvPV: { value: new T.Matrix4() },
    uNVP: { value: NVP },
    uNVOn: { value: 0 },
    uNVR: { value: 33 },
    uBlind: { value: 0 },
    tShadow: { value: null },
    uShadowM: { value: new T.Matrix4() },
    uRay: { value: 0 },
    uSunCol: { value: new T.Color() },
    uFwd: { value: new T.Vector3() },
    uCamP: { value: new T.Vector3() },
    uFogN: { value: 90 },
    uFogF: { value: 150 },
    uSkyTop: { value: new T.Color() },
    uSkyHz: { value: new T.Color() },
    uSunScr: { value: new T.Vector2() },
    uGlow: { value: 0 },
    uCloud: { value: 0 },
    uCT: { value: 0 },
    tRay: { value: null },
    uRayRes: { value: new T.Vector2(32, 32) },
    uAO: { value: 0 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
uniform sampler2D tD; uniform vec2 uRes; uniform float uTime; uniform float uNight; uniform float uGold; uniform vec3 uGoldT; varying vec2 vUv;
uniform sampler2D tDepth; uniform float uHasDepth; uniform mat4 uInvPV; uniform vec3 uNVP[6]; uniform float uNVOn; uniform float uNVR; uniform float uBlind;
uniform sampler2D tShadow; uniform mat4 uShadowM; uniform float uRay; uniform sampler2D tRay; uniform vec2 uRayRes; uniform float uAO; uniform vec3 uSunCol; uniform vec3 uFwd; uniform vec3 uCamP;
uniform float uCT; uniform float uFogN; uniform float uFogF; uniform vec3 uSkyTop; uniform vec3 uSkyHz; uniform vec2 uSunScr; uniform float uGlow; uniform float uCloud;
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hash2(i), hash2(i + vec2(1,0)), f.x), mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k=0;k<4;k++){ s += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
vec3 worldAt(vec2 uv){
  vec2 nd = uv*2.0 - 1.0;
  vec3 res;
  if (uHasDepth > .5){
    float z = texture2D(tDepth, uv).x;
    vec4 p = uInvPV * vec4(nd, z*2.0 - 1.0, 1.0);
    res = p.xyz / p.w;
  } else {
    vec4 a = uInvPV * vec4(nd, -1.0, 1.0), b = uInvPV * vec4(nd, 1.0, 1.0);
    a /= a.w; b /= b.w;
    res = mix(a.xyz, b.xyz, clamp(a.y / max(a.y - b.y, 1e-4), 0.0, 1.0));
  }
  return res;
}
void main(){
  vec3 c = texture2D(tD, vUv).rgb;
  // cielo: donde la ciudad se funde con la calima arriba de la vista, la calima pasa a ser cielo, mas intenso arriba, calido hacia el sol y con nubes
  if (uHasDepth > .5 && uGlow > -1.0){
    vec3 wp0 = worldAt(vUv); float vd = dot(wp0 - uCamP, uFwd);
    float far = smoothstep(uFogN + (uFogF - uFogN)*.35, uFogF, vd) * smoothstep(.5, .95, vUv.y);
    if (far > 0.001){
      float up = clamp((vUv.y - .5)*2.0, 0.0, 1.0);
      vec3 sky = mix(uSkyHz, uSkyTop, smoothstep(.25, 1.0, up));
      vec2 sd = vUv - .5; float g = max(dot(normalize(sd + 1e-4), uSunScr), 0.0);
      sky += uSunCol * uGlow * (pow(g, 6.0)*.55 + pow(g, 40.0)*.6) * (.35 + up*.65);
      vec2 cp = wp0.xz*.018 + vec2(uCT*.006, uCT*.0025);
      float cl = smoothstep(.48, .8, fbm(cp)) * uCloud;
      vec3 cc = mix(uSkyHz*1.06, uSunCol*1.05 + vec3(.06), .35 + .4*g);
      sky = mix(sky, cc, cl*.75);
      c = mix(c, sky, far*.9);
    }
  }
  // rayos de luz: recorro el aire sobre cada punto de vuelta hacia la camara; el aire al que llega el sol brilla y el que esta a la sombra de un edificio se queda oscuro
  if (uRay > .002 || uAO > .5){
    // los rayos y la oclusion se calcularon a media resolucion; un pequeno desenfoque en tienda aqui convierte su tramado en una calima suave
    vec2 px = 1.0/uRayRes; vec3 s = vec3(0.0); float wsum = 0.0;
    for (int y=-2;y<=2;y++) for (int x=-2;x<=2;x++){ float w = (3.0 - abs(float(x))) * (3.0 - abs(float(y))); s += texture2D(tRay, vUv + vec2(float(x), float(y))*px).rgb * w; wsum += w; }
    s /= wsum; float lit = s.x, air = s.y;
    if (uAO > .5){ float lc = dot(c, vec3(.299, .587, .114)); c *= mix(1.0, s.z, (1.0 - uNight*.3) * (1.0 - .35*smoothstep(.45, .8, lc))); }
    c = c*(1.0 - uRay*.26*air*(1.0 - lit/max(air, .001))) + uSunCol*uRay*lit*.44;
  }
  vec3 raw = c;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
  float hot = smoothstep(0.7, 0.95, mx) * smoothstep(0.25, 0.5, mx - mn);
  c = mix(vec3(l), c, mix(0.46 + uGold * .34, 0.95, hot));
  c *= mix(vec3(1.0), uGoldT, uGold);
  vec3 lum = vec3(l);
  vec3 ov = mix(2.0*c*lum, 1.0 - 2.0*(1.0-c)*(1.0-lum), step(0.5, lum));
  c = mix(c, ov, 0.3 * (1.0 - hot));
  vec3 shadowT = mix(vec3(0.90, 0.97, 0.98), vec3(0.78, 0.88, 1.05), uNight);
  vec3 lightT = mix(vec3(1.06, 1.0, 0.86), vec3(0.95, 0.97, 1.02), uNight);
  c *= mix(shadowT, lightT, smoothstep(0.15, 0.75, l));
  c = (c - 0.5) * 1.1 + 0.5;
  c = mix(c, vec3(0.76, 0.71, 0.62) * (1.0 - uNight*0.8), 0.04 * (1.0 - hot));
  c = max(c, vec3(0.058, 0.053, 0.046));
  float n = fract(sin(dot(floor(vUv * uRes) + vec2(uTime * 13.0, uTime * 7.0), vec2(12.9898, 78.233))) * 43758.5453);
  // vision nocturna: dentro del alcance de los visores el intensificador sube la oscuridad a un verde fosforo suave, con grano, nada de neon
  if (uNVOn > .5){
    vec3 wp = worldAt(vUv); float m = 0.0, rim = 0.0;
    for (int k=0;k<6;k++){ vec3 p = uNVP[k]; if (p.y < -100.0) continue;
      float d = length(wp.xz - p.xz); m = max(m, 1.0 - smoothstep(uNVR - 9.0, uNVR, d)); }
    if (m > 0.0){
      float lr = dot(raw, vec3(0.299, 0.587, 0.114));
      float v = 1.0 - exp(-lr * 3.6);                             // ganancia: lo oscuro sube a un verde tenue y las luces siguen deslumbrando
      v = v * .78 + .035;
      float g2 = fract(sin(dot(floor(vUv * uRes) + vec2(uTime * 31.0, uTime * 17.0), vec2(39.346, 11.135))) * 43758.5453);
      v += (g2 - .5) * .1;                                         // grano del intensificador
      vec3 nv = vec3(.40, .62, .37) * v + vec3(.02, .035, .018);   // un verde P43 apagado, mas cerca del gris verdoso que del neon
      nv = mix(nv, vec3(.85, .92, .8), uBlind*.45);               // una bengala a la vista deslumbra los tubos, sin dejar la pantalla en blanco
      c = mix(c, nv, m);
    }
  }
  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 1.1;
  c += (n - 0.5) * 0.04;
  gl_FragColor = vec4(c, 1.0);
}`
});
postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
// rayos de luz, calculados a media resolución en su propio render target: r = aire iluminado por el sol a lo largo del rayo de vista, g = cuánto aire hay
const rayRT = new T.WebGLRenderTarget(32, 32, {
  minFilter: T.LinearFilter,
  magFilter: T.LinearFilter,
  depthBuffer: false
});
postMat.uniforms.tRay.value = rayRT.texture;
const rayScene = new T.Scene(),
  PU = postMat.uniforms;
const rayMat = new T.ShaderMaterial({
  uniforms: {
    tDepth: PU.tDepth,
    uHasDepth: PU.uHasDepth,
    uInvPV: PU.uInvPV,
    tShadow: PU.tShadow,
    uShadowM: PU.uShadowM,
    uFwd: PU.uFwd,
    uTexel: { value: new T.Vector2(0.01, 0.01) },
    uRayOn: { value: 0 },
    uPPM: { value: 30 }
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
uniform sampler2D tDepth; uniform float uHasDepth; uniform mat4 uInvPV; uniform sampler2D tShadow; uniform mat4 uShadowM; uniform vec3 uFwd; varying vec2 vUv;
const vec4 UNP = vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0) * (255.0/256.0);
vec3 worldAt(vec2 uv){ vec2 nd = uv*2.0 - 1.0; float z = texture2D(tDepth, uv).x; vec4 p = uInvPV * vec4(nd, z*2.0 - 1.0, 1.0); return p.xyz / p.w; }
float shadowLit(vec3 p){ vec4 s = uShadowM * vec4(p, 1.0); s.xyz /= s.w;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  return step(s.z - 0.003, dot(texture2D(tShadow, s.xy), UNP)); }
float shadowEdge(vec3 p){ vec4 s = uShadowM * vec4(p, 1.0); s.xy /= s.w; vec2 e = min(s.xy, 1.0 - s.xy); return smoothstep(0.0, 0.14, min(e.x, e.y)); }
uniform vec2 uTexel; uniform float uRayOn; uniform float uPPM;
void main(){
  if (uHasDepth < .5){ gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0); return; }
  vec3 wp = worldAt(vUv), dir = -uFwd;
  // oclusion ambiental: los vecinos que quedan por encima de este punto y cerca de el (el pie de un muro, una esquina, un callejon estrecho) lo sombrean
  // tres anillos, un poco girados en cada pixel (el desenfoque del etalonaje suaviza el patron): el pie de cada muro, el hueco bajo un coche,
  // la esquina de una puerta y los pies de un hombre en el suelo se oscurecen; el terreno abierto y las azoteas planas quedan limpios
  vec3 ex1 = worldAt(vUv + vec2(uTexel.x, 0.0)) - wp, ex2 = wp - worldAt(vUv - vec2(uTexel.x, 0.0));
  vec3 ey1 = worldAt(vUv + vec2(0.0, uTexel.y)) - wp, ey2 = wp - worldAt(vUv - vec2(0.0, uTexel.y));
  vec3 nrm = normalize(cross(dot(ex1, ex1) < dot(ex2, ex2) ? ex1 : ex2, dot(ey1, ey1) < dot(ey2, ey2) ? ey1 : ey2));
  if (dot(nrm, dir) < 0.0) nrm = -nrm;                            // mirando a la camara
  float occ = 0.0, rot = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) * 1.5708;
  for (int k=0;k<12;k++){ float a = float(k)*0.523599 + rot; float rw = k < 4 ? .13 : k < 8 ? .3 : .6;     // unidades de mundo: 20, 45 y 90 cm
    vec2 o = vec2(cos(a), sin(a)) * uTexel * clamp(rw * uPPM, 1.0, 22.0);
    vec3 d = worldAt(vUv + o) - wp; float dist = length(d);
    occ += max(0.0, dot(nrm, d) / (dist + 1e-3) - .12) * (1.0 - smoothstep(.55, 1.5, dist)); }
  float ao = 1.0 - clamp(occ / 12.0 * 1.5, 0.0, .5);
  if (uRayOn < .5){ gl_FragColor = vec4(0.0, 0.0, ao, 1.0); return; }
  float tTop = max(0.0, (16.0 - wp.y) / max(dir.y, .05));
  vec2 fq = mod(floor(gl_FragCoord.xy), 4.0);
  float j = fract((fq.x*4.0 + fq.y + mod(fq.x + fq.y, 2.0)*8.0) / 16.0 * 1.618 + .13);
  float lit = 0.0;
  for (int k=0;k<12;k++){ float t = (float(k) + j) / 12.0; lit += shadowLit(wp + dir*(t*tTop)); }
  float air = clamp(tTop / 22.0, 0.0, 1.0) * shadowEdge(wp) * shadowEdge(wp + dir*tTop);
  gl_FragColor = vec4(lit/12.0*air, air, ao, 1.0);
}`
});
rayScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), rayMat));
function renderRays() {
  PU.uAO.value = HAS_DEPTH && OPT.ao !== false ? 1 : 0;
  if (!PU.uAO.value && !(PU.uRay.value > 0.002)) return;
  rayMat.uniforms.uRayOn.value = PU.uRay.value > 0.002 && PU.tShadow.value ? 1 : 0;
  if (!rayMat.uniforms.uRayOn.value) PU.uRay.value = 0;
  rayMat.uniforms.uTexel.value.set(1 / lowW, 1 / lowH);
  rayMat.uniforms.uPPM.value = lowH / (2 * halfH());
  renderer.setRenderTarget(rayRT);
  renderer.render(rayScene, postCam);
}
