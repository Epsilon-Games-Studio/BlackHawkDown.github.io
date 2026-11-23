/* ====================================================================================================
 * core/random.js
 *
 * Aleatorio con semilla (LCG): misma semilla, misma ciudad, siempre
 * ================================================================================================== */

'use strict';

let seed = 1993;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = n => Math.floor(rnd() * n);
const rr = (a, b) => a + rnd() * (b - a);
const pick = a => a[ri(a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const c255 = v => clamp(Math.round(v), 0, 255);
const shade = (c, f) => (c255(((c >> 16) & 255) * f) << 16) | (c255(((c >> 8) & 255) * f) << 8) | c255((c & 255) * f);
const jit = (c, a) => shade(c, 1 + ((ri(5) - 2) * a) / 2);
