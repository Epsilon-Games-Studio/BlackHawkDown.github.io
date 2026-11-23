/* ====================================================================================================
 * world/ocean.js
 *
 * El océano: agua pixel-art. Color en bandas de profundidad sobre una rejilla de píxeles en espacio de mundo, series de olas que rompen,
 * una lámina de resaca que sube por la arena y vuelve dejándola mojada, y destellos del sol (o la luna) en las facetas que se mueven
 * ================================================================================================== */

'use strict';

const OCEAN_FS = `
uniform float uTime; uniform vec3 uSunDir; uniform float uNightO; varying vec3 vWPo;
uniform sampler2D uRefl; uniform mat4 uRVP; uniform float uReflOn;
float oSpark = 0.0;
float coastG(vec2 p){ float u = p.x*.866 - p.y*.5; return (p.x+1200.0)*.5 + (p.y-1500.0)*.866 + 18.0*sin(u*.006) + 9.0*sin(u*.017 + 1.0); }
float oH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float oN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(oH(i), oH(i+vec2(1,0)), f.x), mix(oH(i+vec2(0,1)), oH(i+vec2(1,1)), f.x), f.y); }
float waves(vec2 p, float t, out vec2 gr){
  float h = 0.0; gr = vec2(0.0);
  vec2 D[5]; D[0] = vec2(-.50,-.866); D[1] = vec2(-.30,-.95); D[2] = vec2(-.72,-.69); D[3] = vec2(.20,-.98); D[4] = vec2(-.90,-.43);
  float F[5]; F[0] = .21; F[1] = .43; F[2] = .77; F[3] = 1.31; F[4] = 2.2;
  float A[5]; A[0] = .32; A[1] = .16; A[2] = .09; A[3] = .05; A[4] = .03;
  for (int k=0;k<5;k++){ float ph = dot(D[k], p)*F[k] + t*sqrt(F[k]*9.8)*.55 + float(k)*1.7; h += A[k]*sin(ph); gr += A[k]*F[k]*cos(ph)*D[k]; }
  return h;
}
// tramado ordenado 4x4 (Bayer), para transiciones pixel-art nitidas
float bay2(vec2 a){ a = floor(a); return fract(dot(a, vec2(.5, a.y*.75))); }
float bay4(vec2 a){ return bay2(.5*a)*.25 + bay2(a); }
`;
function makeOcean() {
  const mat = new T.MeshPhongMaterial({ color: 0x2a6a78, specular: 0x000000, shininess: 1, transparent: true });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = { value: 0 };
    sh.uniforms.uSunDir = { value: new T.Vector3(0.5, 0.8, 0.3) };
    sh.uniforms.uNightO = { value: 0 };
    sh.uniforms.uRefl = REFL_U.tex;
    sh.uniforms.uRVP = REFL_U.vp;
    sh.uniforms.uReflOn = REFL_U.on;
    mat.userData.sh = sh;
    sh.vertexShader =
      'varying vec3 vWPo;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWPo = (modelMatrix * vec4(position, 1.0)).xyz;'
      );
    let fs =
      OCEAN_FS +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      const float PX = 6.0;                                   // pixeles de agua por unidad
      vec2 cell = floor(vWPo.xz * PX), P = (cell + .5) / PX;
      float s = coastG(P), along = P.x*.866 - P.y*.5;
      vec2 gr; float wv = waves(P, uTime, gr);
      float bz = bay4(cell);
      // resaca: cada ola sube por la arena y vuelve, desfasada a lo largo de la orilla
      float ph = uTime*.55 + oN(vec2(along*.02, 3.0))*6.0;
      float up = -.8 - 3.2*smoothstep(-.3, 1.0, sin(ph)) + (oN(vec2(along*.45, uTime*.35)) - .5)*.7;
      float edge = s - up;
      const float WET = -4.6;
      if (edge < 0.0){
        // la arena que acaba de dejar el agua: oscura y brillante, secandose en un tramado hacia lo alto de la subida
        if (s < WET) discard;
        float k = clamp((s - WET) / max(up - WET, .25), 0.0, 1.0);
        if (k < bz*.85 + .08) discard;
        diffuseColor = vec4(.29, .25, .18, .32);
      } else {
        // color segun la profundidad: la arena asomando en lo poco hondo, turquesa y luego el azul profundo; sin bandas duras
        float d = clamp(s/90.0, 0.0, 1.0) + (oN(P*.05 + uTime*.012) - .5)*.09 + (bz - .5)*.025;
        vec3 col = d < .3 ? mix(vec3(.38,.80,.74), vec3(.11,.56,.68), smoothstep(0.0, .3, d)) : mix(vec3(.11,.56,.68), vec3(.03,.25,.47), smoothstep(.3, 1.0, d));
        col = mix(col, vec3(.80,.77,.60), (1.0 - smoothstep(0.0, 4.5, edge))*.7);
        // la superficie: el mar de fondo, las ondas del viento cruzandolo y las olas que llegan a la playa
        vec2 dr = vec2(uTime*.55, -uTime*.38), q1 = P*.8 + dr, q2 = P*1.9 - dr*1.3;
        vec2 rip = vec2(oN(q1 + vec2(.4, 0.0)) - oN(q1 - vec2(.4, 0.0)), oN(q1 + vec2(0.0, .4)) - oN(q1 - vec2(0.0, .4)))*.5
                 + vec2(oN(q2 + vec2(.4, 0.0)) - oN(q2 - vec2(.4, 0.0)), oN(q2 + vec2(0.0, .4)) - oN(q2 - vec2(0.0, .4)))*.22;
        float crestPh = s*.34 + uTime*1.0 + oN(vec2(along*.03, 1.0))*2.5, cr = fract(crestPh/6.2832);     // 0 en la cresta, creciendo mar adentro por detras
        float near = 1.0 - smoothstep(4.0, 36.0, s), set_ = oN(vec2(along*.3, floor(crestPh/6.2832)*1.7));
        float roll = .1 + .55*near;
        vec2 g2 = gr*1.1 + rip + vec2(.5, .866)*sin(crestPh)*.34*roll;
        vec3 nw = normalize(vec3(-g2.x*1.7, 1.0, -g2.y*1.7)), Ls = normalize(uSunDir), V = normalize(cameraPosition - vec3(P.x, 0.0, P.y)), Hh = normalize(Ls + V);
        // la luz en las facetas, con el cielo reflejado en diagonal
        col *= clamp(.94 + .4*(dot(nw, Ls) - Ls.y), .8, 1.16);
        float fr = pow(1.0 - max(dot(nw, V), 0.0), 3.0);
        col = mix(col, mix(vec3(.74,.84,.88), vec3(.07,.09,.15), uNightO), fr*.32);
        // la cara de una ola es oscura y verde antes de romper
        col *= 1.0 - .16*roll*smoothstep(.82, 1.0, cr);
        // espuma: la cresta rompiendo, el encaje que deja detras, el borde de la resaca con su encaje y algun borreguito mar adentro
        float brk = smoothstep(.42, .6, near + set_*.6 - .12) * step(.8, s);
        float line = (1.0 - smoothstep(0.0, .03 + .09*near, cr)) * brk;
        float lace = (1.0 - smoothstep(0.0, .1 + .32*near, cr)) * brk * step(.42 + cr*1.5, oN(P*1.6 + vec2(uTime*.25, uTime*.1)) + (bz - .5)*.2);
        float lip = step(edge, .5 + bz*.45) + step(edge, 2.2) * step(.56 + edge*.08, oN(P*2.0 + vec2(uTime*.8, 0.0)));
        float foam = clamp(max(max(lip, line), lace*.85), 0.0, 1.0);
        col = mix(col, vec3(.95, .97, .95), foam);
        if (uReflOn > .5){       // los helicopteros que pasan por encima, rotos por las ondas
          vec2 dP = rip*.7 + vec2(sin(P.y*1.4 + uTime*2.3), cos(P.x*1.2 + uTime*1.9))*.1;
          vec4 rc = uRVP * vec4(P.x + dP.x, .04, P.y + dP.y, 1.0); vec2 ruv = rc.xy/rc.w*.5 + .5;
          if (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0){
            vec4 rf = texture2D(uRefl, ruv);
            col = mix(col, rf.rgb*vec3(.66,.8,.84) + col*.22, rf.a*(.55 + .3*fr)*(1.0 - foam)*(1.0 - .4*near));
          }
        }
        // el sol (o la luna) sobre el agua: un brillo suave y un campo de destellos que van y vienen
        float sh1 = pow(max(dot(nw, Hh), 0.0), 30.0), sp = pow(max(dot(nw, Hh), 0.0), 160.0);
        col += vec3(1.0, .95, .82)*sh1*.12*(1.0 - foam)*(1.0 - .7*uNightO);
        oSpark = sp*1.5*(1.0 - foam)*step(.3, oH(cell + floor(uTime*7.0)*.37));
        diffuseColor.rgb = col;
        diffuseColor.a = foam > .5 ? 1.0 : edge < 1.2 ? .82 : 1.0;
      }
      vec2 oGr = gr;`
      );
    fs = fs.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
      { normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); }`
    );
    fs = fs.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      totalEmissiveRadiance += oSpark * mix(vec3(1.0, .95, .8), vec3(.55, .62, .8), uNightO) * mix(1.4, .5, uNightO);`
    );
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => 'ocean5';
  const m = new T.Mesh(new T.PlaneGeometry(5200, 4200, 1, 1), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(-300, 0.04, 900);
  m.receiveShadow = true;
  m.renderOrder = 1;
  world.add(m);
  return m;
}
let ocean = null;
/* Reflejos en el mar: solo los helicópteros (capa 2), pintados desde una cámara reflejada en el plano del agua a un render target
   pequeño después del frame principal; el océano lo muestrea en el siguiente */
const reflRT = new T.WebGLRenderTarget(64, 64, { minFilter: T.NearestFilter, magFilter: T.NearestFilter });
const REFL_U = { tex: { value: reflRT.texture }, vp: { value: new T.Matrix4() }, on: { value: 0 } };
const reflCam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
reflCam.matrixAutoUpdate = false;
reflCam.layers.set(2);
const _rM = new T.Matrix4().set(1, 0, 0, 0, 0, -1, 0, 0.08, 0, 0, 1, 0, 0, 0, 0, 1),
  _rCC = new T.Color();
let reflN = 0;
function reflOnScene(g) {
  for (let o = g; o; o = o.parent) if (o === scene) return true;
  return false;
}
function reflFrame() {
  const U = REFL_U;
  U.on.value = 0;
  if (!ocean || !ocean.visible || gfxQ() === GFXQ.low) return;
  let any = false;
  for (let i = REFL.length - 1; i >= 0; i--) {
    const g = REFL[i];
    if (!g.parent) {
      if ((g.userData.rfDead = (g.userData.rfDead || 0) + 1) > 300) REFL.splice(i, 1);
      continue;
    }
    g.userData.rfDead = 0;
    if (g.visible && reflOnScene(g)) {
      any = true;
      g.traverse(o => o.layers.enable(2));
    }
  }
  if (!any) return;
  if (reflN++ % 30 === 0)
    scene.traverse(o => {
      if (o.isLight) o.layers.enable(2);
    });
  const w = rt.width,
    h = rt.height;
  if (reflRT.width !== w || reflRT.height !== h) reflRT.setSize(w, h);
  reflCam.copy(cam, false);
  reflCam.matrixAutoUpdate = false;
  reflCam.layers.set(2);
  reflCam.projectionMatrix.elements[0] *= -1;
  reflCam.projectionMatrix.elements[4] *= -1;
  reflCam.projectionMatrix.elements[8] *= -1;
  reflCam.projectionMatrix.elements[12] *= -1;
  reflCam.projectionMatrixInverse.copy(reflCam.projectionMatrix).invert();
  reflCam.matrixWorld.multiplyMatrices(_rM, cam.matrixWorld);
  reflCam.matrixWorldInverse.copy(reflCam.matrixWorld).invert();
  reflCam.matrixWorldNeedsUpdate = false;
  const bg = scene.background,
    fog = scene.fog;
  renderer.getClearColor(_rCC);
  const ca = renderer.getClearAlpha();
  const fn = fog ? fog.near : 0,
    ff = fog ? fog.far : 0;
  if (fog) {
    fog.near = 1e5;
    fog.far = 1e5 + 1;
  } // sin bruma en el camino reflejado (así uso los mismos shaders)
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(reflRT);
  renderer.render(scene, reflCam);
  scene.background = bg;
  renderer.setClearColor(_rCC, ca);
  if (fog) {
    fog.near = fn;
    fog.far = ff;
  }
  U.vp.value.multiplyMatrices(reflCam.projectionMatrix, reflCam.matrixWorldInverse);
  U.on.value = 1;
}
