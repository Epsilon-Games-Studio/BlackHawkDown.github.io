/* ====================================================================================================
 * world/ground-chunk-texture.js
 *
 * Textura del suelo por chunk
 *
 * Colores del suelo y distancia a las carreteras para pintar la textura de cada chunk.
 * ================================================================================================== */

const GCOL = [
  [196, 178, 142],
  [210, 192, 156],
  [186, 166, 130],
  [214, 202, 176],
  [194, 174, 138],
  [204, 198, 182],
  [160, 144, 118],
  [150, 146, 96],
  [0, 0, 0],
  [98, 95, 90],
  [150, 138, 112],
  [224, 208, 172]
];
function roadDist(x, z, segs) {
  let best = 1e9,
    bw = 0,
    bp = false;
  for (const s of segs) {
    const dx = s[2] - s[0],
      dz = s[3] - s[1],
      L2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1),
      px = s[0] + dx * t - x,
      pz = s[1] + dz * t - z,
      d = Math.sqrt(px * px + pz * pz) - s[4] / 2;
    if (d < best) {
      best = d;
      bw = s[4];
      bp = s[5];
    }
  }
  return [best, bp];
}
const ROADSEG = [];
for (const r of ROADS)
  for (let k = 1; k < r.pts.length; k++)
    ROADSEG.push([r.pts[k - 1][0], r.pts[k - 1][1], r.pts[k][0], r.pts[k][1], r.w, !!r.paved]);
