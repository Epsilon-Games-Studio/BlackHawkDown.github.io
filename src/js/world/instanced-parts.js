/* ====================================================================================================
 * world/instanced-parts.js
 *
 * Piezas instanciadas del mundo
 *
 * Piezas instanciadas: el mundo se pinta con InstancedMesh agrupando cajas iguales.
 * B() y C() son los ladrillos con los que se monta casi todo.
 * ================================================================================================== */

let BX, CY, FAR;
let GHOST = false; // mientras está activo no se guarda la geometría: sirve para "construir" cosas que no deben aparecer sin alterar la secuencia aleatoria
let COVREC = null;
function B(x, y, z, sx, sy, sz, c, o) {
  if (GHOST) return;
  const e = inst(x, y, z, sx, sy, sz, c, o),
    L = CUR || chunkFor(x, z);
  (o && o.awn ? L.AW : e.mn ? L.BXm : L.BX).push(e);
  if (COVREC) {
    COVREC.push(e);
    e.chL = L;
  }
}
function C(x, y, z, r, h, c, o) {
  if (GHOST) return;
  const e = inst(x, y, z, r * 2, h, r * 2, c, o);
  (CUR || chunkFor(x, z)).CY.push(e);
}
function inst(x, y, z, sx, sy, sz, c, o) {
  o = o || {};
  return {
    x,
    y,
    z,
    sx,
    sy,
    sz,
    c,
    mn: Math.max(sx, sy, sz) < 0.3 && !o.awn,
    m: o.m != null ? o.m : MAT,
    rx: o.rx || 0,
    ry: o.ry || 0,
    rz: o.rz || 0,
    ord: o.ord || 'XYZ',
    b: o.b == null ? -1 : o.b,
    roof: o.roof ? 1 : 0,
    awn: o.awn || 0,
    ph: o.awn ? Math.random() * 6 : 0,
    inv: o.hid ? 1 : 0
  };
}
const dummy = new T.Object3D(),
  tmpCol = new T.Color();
function writeInst(mesh, list, cut) {
  for (let k = 0; k < list.length; k++) {
    const e = list[k];
    let y = e.y,
      sy = e.sy,
      hide = !!e.gone || !!e.inv;
    if (cut && e.b >= 0) {
      if (e.roof) hide = true;
      else {
        const bot = e.y - e.sy / 2,
          top = e.y + e.sy / 2;
        if (bot >= CUT) hide = true;
        else if (top > CUT) {
          sy = CUT - bot;
          y = bot + sy / 2;
        }
      }
    }
    dummy.position.set(e.x, y, e.z);
    dummy.rotation.set(e.rx, e.ry, e.rz, e.ord);
    if (hide) dummy.scale.set(0, 0, 0);
    else dummy.scale.set(e.sx, sy, e.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(k, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
function makeInst(geo, list, shadow, parent) {
  const n = Math.max(1, list.length),
    g = geo.clone(),
    am = new Float32Array(n);
  list.forEach((e, k) => (am[k] = e.m || 0));
  g.setAttribute('aMat', new T.InstancedBufferAttribute(am, 1));
  const m = new T.InstancedMesh(
    g,
    patchDetail(new T.MeshPhongMaterial({ color: 0xffffff, specular: 0x000000, shininess: 1 }), { cyl: geo === UCYL }),
    n
  );
  m.frustumCulled = false;
  list.forEach((e, k) => {
    tmpCol.setHex(e.c);
    m.setColorAt(k, tmpCol);
  });
  writeInst(m, list, false);
  m.receiveShadow = true;
  if (shadow) m.castShadow = true;
  (parent || world).add(m);
  return m;
}
