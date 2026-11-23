/* ====================================================================================================
 * world/small-houses.js
 *
 * Casitas de bloque: las afueras, las aldeas y las granjas sueltas comparten estilo
 * ================================================================================================== */

'use strict';

function smallHouse(x, z, opt) {
  opt = opt || {};
  const w = rr(3, 5.4),
    d = rr(2.6, 4),
    h = rr(1.25, 1.7),
    c = pick(WALLS),
    ry = pick([0, Math.PI / 2]) + (opt.rot ? rr(-0.3, 0.3) : 0);
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  const P = (lx, y, lz, sx, sy, sz, col, ex) =>
    B(x + lx * cs + lz * sn, y, z - lx * sn + lz * cs, sx, sy, sz, col, Object.assign({ ry }, ex || {}));
  MAT = M.PLASTER;
  P(0, h / 2, 0, w, h, d, c);
  P(0, h * 0.17, 0, w + 0.02, h * 0.34, d + 0.02, shade(c, 0.78));
  if (rnd() < 0.5) P(0, h + 0.05, 0, w + 0.14, 0.1, d + 0.14, shade(c, 0.92), { m: M.CONC });
  else
    P(0, h + 0.14, 0, w + 0.45, 0.07, d + 0.55, pick([0x8a5a3c, 0x7a7a72, 0x9a6a40, 0x6a6e70]), { m: M.TIN, rx: 0.1 });
  P(-w * 0.2, 0.52, d / 2 + 0.03, 0.55, 1.0, 0.05, pick([0x3a5a6a, 0x5a3a2a, 0x2a4a3a, 0x7a3a2a]), { m: M.WOOD });
  P(w * 0.24, 0.9, d / 2 + 0.03, 0.45, 0.4, 0.05, 0x2b2925, { m: M.GLASS });
  if (rnd() < 0.6) P(w / 2 + 0.03, 0.9, 0, 0.05, 0.4, 0.45, 0x2b2925, { m: M.GLASS });
  if (opt.wall !== false && rnd() < 0.62) {
    const mw = w / 2 + rr(1.6, 3),
      md = d / 2 + rr(1.6, 3),
      wc = shade(pick(WALLS), 0.95),
      wh = rr(0.8, 1.1);
    P(0, wh / 2, -md, mw * 2, wh, 0.2, wc);
    P(-mw, wh / 2, 0, 0.2, wh, md * 2, wc);
    P(mw, wh / 2, 0, 0.2, wh, md * 2, wc);
    P(-mw / 2 - 0.7, wh / 2, md, mw - 1.4, wh, 0.2, wc);
    P(mw / 2 + 0.7, wh / 2, md, mw - 1.4, wh, 0.2, wc);
    if (rnd() < 0.35) P(mw - 1, 0.4, -md + 1, 0.7, 0.8, 0.7, pick([0x3d5a80, 0x5e6b3a, 0x8a3a2a]), { m: M.METAL });
  }
  if (rnd() < 0.28) acacia(x + rr(-6, 6), z + rr(-6, 6), rr(0.7, 1.1));
}
