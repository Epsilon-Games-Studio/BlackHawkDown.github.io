/* ====================================================================================================
 * world/palm-crowns.js
 *
 * Copas de palmera: hojas arqueadas con filas de folíolos colgando en V, hechas con geometría de verdad
 * ================================================================================================== */

function frondGeo(fronds) {
  const pos = [],
    nor = [],
    col = [];
  const tri = (p0, p1, p2, c) => {
    const ux = p1[0] - p0[0],
      uy = p1[1] - p0[1],
      uz = p1[2] - p0[2],
      vx = p2[0] - p0[0],
      vy = p2[1] - p0[1],
      vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    ny += 0.5;
    const l2 = Math.hypot(nx, ny, nz);
    nx /= l2;
    ny /= l2;
    nz /= l2;
    for (const p of [p0, p1, p2, p0, p2, p1]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(nx, ny, nz);
      col.push(c.r, c.g, c.b);
    }
  };
  const cc = new T.Color();
  for (const f of fronds) {
    const ca = Math.cos(f.a),
      sa = Math.sin(f.a),
      ce = Math.cos(f.e0),
      se = Math.sin(f.e0);
    const P = t => [ca * f.L * t * ce, f.L * t * se - f.droop * f.L * t * t, -sa * f.L * t * ce];
    const N = 8;
    let prev = P(0);
    for (let k = 1; k <= N; k++) {
      const t = k / N,
        p = P(t),
        tx = p[0] - prev[0],
        ty = p[1] - prev[1],
        tz = p[2] - prev[2],
        tl = Math.hypot(tx, ty, tz) || 1;
      const Tx = tx / tl,
        Ty = ty / tl,
        Tz = tz / tl,
        sx = -Tz,
        sz = Tx,
        sl = Math.hypot(sx, sz) || 1;
      // raquis
      const w = 0.035 * (1 - t * 0.6);
      cc.setHex(f.col).multiplyScalar(0.8);
      tri(
        [prev[0] - (sx / sl) * w, prev[1], prev[2] - (sz / sl) * w],
        [prev[0] + (sx / sl) * w, prev[1], prev[2] + (sz / sl) * w],
        [p[0], p[1], p[2]],
        cc
      );
      // folíolos a cada lado, más largos a media hoja, caídos
      if (t > 0.12) {
        const ll = f.L * 0.34 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.9 + 0.05;
        for (const s of [-1, 1]) {
          cc.setHex(f.col).multiplyScalar(0.82 + 0.3 * t + (rnd() - 0.5) * 0.12);
          const tip = [
            p[0] + (sx / sl) * s * ll + Tx * ll * 0.3,
            p[1] - ll * 0.5 + Ty * ll * 0.3,
            p[2] + (sz / sl) * s * ll + Tz * ll * 0.3
          ];
          tri(
            [p[0] - Tx * 0.07, p[1] - Ty * 0.07, p[2] - Tz * 0.07],
            [p[0] + Tx * 0.07, p[1] + Ty * 0.07, p[2] + Tz * 0.07],
            tip,
            cc
          );
        }
      }
      prev = p;
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setAttribute('aPat', new T.Float32BufferAttribute(new Float32Array(pos.length / 3), 1));
  g.setAttribute('aLP', new T.Float32BufferAttribute(pos.slice(), 3));
  return g;
}
