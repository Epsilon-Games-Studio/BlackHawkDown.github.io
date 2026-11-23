/* ====================================================================================================
 * world/buildings.js
 *
 * Edificios: el bloque con sus plantas, fachadas, azoteas y ruinas, más chabolas, obras y grúas.
 * ================================================================================================== */

'use strict';

function building(x, y, w, d, floors, o) {
  o = o || {};
  if (PLANNING) {
    if (!o.force && !freeLot(x, y, w, d)) return false;
    markB(x, y, w, d);
    const sF = !!o.damaged && floors >= 2 ? floors - 1 : floors;
    setTop(x, y, w, d, sF * FH + 0.1 + (o.mosque ? 2 : 0));
    regB(x, y, w, d, sF * FH + 0.1);
    lazyAdd(x + w / 2, y + d / 2, () => building(x, y, w, d, floors, Object.assign({}, o, { force: true })));
    return true;
  }
  if (!o.force && !freeLot(x, y, w, d)) return false;
  markB(x, y, w, d);
  MAT = M.PLASTER;
  const b = nBld++;
  const wall = o.col || jit(pick(WALLS), 0.05);
  const damaged = !!o.damaged && floors >= 2;
  const solidF = damaged ? floors - 1 : floors;
  const h = floors * FH,
    hs = solidF * FH,
    cx = x + w / 2,
    cz = y + d / 2;
  setTop(x, y, w, d, hs + 0.1);
  const base = o.base || (rnd() < 0.5 ? pick(BASES) : shade(wall, 0.78));
  const ledge = shade(wall, rnd() < 0.5 ? 0.86 : 1.06);
  B(cx, hs / 2, cz, w - 0.04, hs, d - 0.04, wall, { b });
  B(cx, 0.45, cz, w + 0.01, 0.9, d + 0.01, base, { b });
  for (let f = 1; f < solidF; f++) B(cx, f * FH, cz, w + 0.08, 0.07, d + 0.08, ledge, { b });
  // azotea
  const roofC = pick(ROOFS);
  B(cx, hs + 0.05, cz, w + 0.06, 0.1, d + 0.06, roofC, { b, m: M.CONC });
  if (!damaged) {
    const ph = o.hotel ? 0.5 : rr(0.25, 0.45),
      pc = shade(wall, 0.95);
    B(cx, hs + ph / 2 + 0.1, y + 0.06, w, ph, 0.12, pc, { b, roof: 1 });
    B(cx, hs + ph / 2 + 0.1, y + d - 0.06, w, ph, 0.12, pc, { b, roof: 1 });
    B(x + 0.06, hs + ph / 2 + 0.1, cz, 0.12, ph, d, pc, { b, roof: 1 });
    B(x + w - 0.06, hs + ph / 2 + 0.1, cz, 0.12, ph, d, pc, { b, roof: 1 });
    if (o.cren || rnd() < 0.25) {
      for (let t = 0.3; t < w - 0.1; t += 0.6) {
        B(x + t, hs + ph + 0.22, y + 0.06, 0.24, 0.24, 0.14, pc, { b, roof: 1 });
        B(x + t, hs + ph + 0.22, y + d - 0.06, 0.24, 0.24, 0.14, pc, { b, roof: 1 });
      }
      for (let t = 0.3; t < d - 0.1; t += 0.6) {
        B(x + 0.06, hs + ph + 0.22, y + t, 0.14, 0.24, 0.24, pc, { b, roof: 1 });
        B(x + w - 0.06, hs + ph + 0.22, y + t, 0.14, 0.24, 0.24, pc, { b, roof: 1 });
      }
    }
    roofProps(x, y, w, d, hs + 0.1, wall, b, o.hotel);
    lseed = (Math.imul(x | 0, 7919) ^ Math.imul(y | 0, 104729) ^ 0x2545f491) >>> 0;
    lrnd();
    const xtraW = Math.hypot(x + w / 2 - LM.s61.x, y + d / 2 - LM.s61.z) > 48; // el sitio del Super 6-1 se queda como está: ahí no tiendo ropa
    if (!o.hotel && w >= 3 && d >= 3 && rnd() < 0.38) {
      const top = hs + 1.0,
        along = w >= d; // un tendedero cruzando la azotea
      if (along) {
        const z = y + 0.7 + rnd() * (d - 1.4);
        hangLine(x + 0.35, z, x + w - 0.35, z, top);
      } else {
        const xx = x + 0.7 + rnd() * (w - 1.4);
        hangLine(xx, y + 0.35, xx, y + d - 0.35, top);
      }
    } else if (xtraW && !o.hotel && w >= 3 && d >= 3 && lrnd() < 0.3) {
      const top = hs + 1.0; // otra oportunidad de ropa tendida en la azotea
      if (lrnd() < 0.5) hangLine(x + 0.35, y + d * 0.5, x + w - 0.35, y + d * 0.5, top, true);
      else hangLine(x + w * 0.5, y + 0.35, x + w * 0.5, y + d - 0.35, top, true);
    }
    // ropa tendida desde las ventanas en una pared que da a la calle
    if (xtraW && !o.hotel && solidF >= 2 && lrnd() < 0.4) {
      const f = lrnd() < 0.5 ? 0 : 1 + Math.floor(lrnd() * 3),
        fl = 1 + Math.floor(lrnd() * (solidF - 1)),
        yy = fl * FH + FH * 0.72;
      const ff = [0, 1, 2, 3].map(k => (f + k) % 4).find(k => faceOpen(x, y, w, d, k));
      if (ff === 0 && w >= 3) hangLine(x + 0.5, y - 0.42, x + w - 0.5, y - 0.42, yy, true);
      else if (ff === 1 && w >= 3) hangLine(x + 0.5, y + d + 0.42, x + w - 0.5, y + d + 0.42, yy, true);
      else if (ff === 2 && d >= 3) hangLine(x - 0.42, y + 0.5, x - 0.42, y + d - 0.5, yy, true);
      else if (ff === 3 && d >= 3) hangLine(x + w + 0.42, y + 0.5, x + w + 0.42, y + d - 0.5, yy, true);
    }
    if (o.mosque) mosqueTop(x, y, w, d, hs + 0.1);
  } else {
    // última planta en ruinas: pilares en las esquinas, muros rotos y escombro sobre el forjado
    const top = hs + FH;
    for (const [px, pz] of [
      [x + 0.2, y + 0.2],
      [x + w - 0.2, y + 0.2],
      [x + 0.2, y + d - 0.2],
      [x + w - 0.2, y + d - 0.2]
    ])
      if (rnd() < 0.8) {
        const ph = rr(0.5, FH);
        B(px, hs + ph / 2, pz, 0.3, ph, 0.3, wall, { b });
      }
    const sides = [
      [cx, y + 0.08, w * rr(0.3, 0.7), 0.16],
      [cx, y + d - 0.08, w * rr(0.3, 0.7), 0.16]
    ];
    sides.forEach(([sx_, sz_, len, th]) => {
      if (rnd() < 0.7) {
        const ph = rr(0.4, FH * 0.8);
        B(x + len / 2 + rnd() * (w - len), hs + ph / 2, sz_, len, ph, th, wall, { b });
      }
    });
    for (let k = 0; k < 10; k++)
      B(
        x + rr(0.3, w - 0.3),
        hs + 0.1 + rnd() * 0.15,
        y + rr(0.3, d - 0.3),
        rr(0.2, 0.6),
        rr(0.12, 0.3),
        rr(0.2, 0.6),
        pick([0xb4aa98, 0x9d9484, 0xa0644a]),
        { b, ry: rnd() * 3, m: M.CONC }
      );
    for (let k = 0; k < 3; k++) {
      rr(0, 1);
      rr(0, 1);
      rr(0, 1);
      rr(0, 1);
    } // (las varillas sueltas ya no están: dejo las tiradas para que el resto no cambie)
  }
  // fachadas
  const wc = rnd() < 0.4 ? pick([0x3e6b6a, 0x5a7d9a, 0x6f8a4a, 0x7a5a3a]) : 0x2b2925;
  const frame = shade(wall, rnd() < 0.5 ? 1.12 : 0.82);
  const WS = winStyle(x, y, wall, o.hotel);
  const arcade = o.arcade || rnd() < 0.18;
  const balc = rnd() < 0.4;
  for (let face = 0; face < 4; face++) {
    const F = { face, x, y, w, d },
      L = face < 2 ? w : d;
    const street = faceOpen(x, y, w, d, face);
    const n = Math.max(1, Math.floor((L - 0.3) / 1.15)),
      step = L / n;
    const arc = arcade && street && face < 2;
    if (arc) {
      FB(F, L / 2, 0.47, 0.012, L - 0.2, 0.92, 0.02, shade(wall, 0.42), b);
      for (let k = 0; k <= n; k++)
        FB(F, Math.min(L - 0.12, Math.max(0.12, k * step)), 0.5, 0.2, 0.22, 1.0, 0.22, shade(wall, 1.05), b);
      FB(F, L / 2, 1.08, 0.2, L, 0.22, 0.32, shade(wall, 0.97), b);
    }
    for (let f = 0; f < solidF + (damaged ? 1 : 0); f++) {
      const yy = f * FH + 0.72;
      for (let k = 0; k < n; k++) {
        const t = step * (k + 0.5);
        if (damaged && f === solidF) continue;
        if (f === 0 && street && !arc) {
          if (rnd() < 0.65) {
            FB(
              F,
              t,
              0.47,
              0.03,
              Math.min(0.92, step * 0.82),
              0.9,
              0.05,
              pick([0x6b6f70, 0x5a6a6a, 0x4a5a52, 0x7a6a52]),
              b,
              { m: M.SHUTTER }
            );
            if (rnd() < 0.55) awnModel(F, t, step * 0.95, pick(AWN), b);
            else if (rnd() < 0.6) {
              const sc = pick(SIGN);
              FB(F, t, 1.12, 0.04, step * 0.9, 0.3, 0.05, sc, b, { m: M.METAL });
              FB(F, t, 1.12, 0.05, step * 0.6, 0.08, 0.05, shade(sc, 0.5), b, { m: M.METAL });
            }
            continue;
          }
        }
        if (f === 0 && arc) continue;
        if (rnd() < 0.06) continue;
        FB(F, t, yy, 0.02, WIN_W, 0.7, 0.04, frame, b, { hid: 1 });
        const boarded = rnd() < 0.1,
          wo = winModel(F, t, yy, WS);
        if (wo)
          FB(
            F,
            t,
            yy + wo.y,
            boarded ? 0.006 : 0,
            wo.w,
            wo.h,
            0.02,
            boarded ? 0x7a5a3a : wo.broken ? 0x1e1c19 : o.hotel ? 0x5f8aa8 : wc,
            b,
            { m: boarded ? M.WOOD : M.GLASS }
          );
        if (!boarded && rnd() < 0.25) {
          const sh = pick([0x3e6b6a, 0x6a5236, 0x5a7d9a, 0x8a8a7a]);
          if (wo) {
            FB(F, t - 0.375, yy, 0.05, 0.16, 0.52, 0.04, sh, b, { m: M.WOOD });
            FB(F, t + 0.375, yy, 0.05, 0.16, 0.52, 0.04, sh, b, { m: M.WOOD });
          }
        }
        if (rnd() < 0.16) {
          FB(F, t, yy - 0.46, 0.1, 0.42, 0.28, 0.17, 0xd6d2c6, b, { m: M.METAL, hid: 1 });
          acUnit(F, t, yy - 0.46 - 0.14);
        }
        if (balc && street && f >= 1 && k % 2 === 0 && rnd() < 0.7) {
          FB(F, t, yy - 0.38, 0.26, Math.min(1.05, step * 0.95), 0.07, 0.52, shade(wall, 0.9), b, { m: M.CONC });
          FB(F, t, yy - 0.05, 0.5, Math.min(1.05, step * 0.95), 0.04, 0.04, 0x3a3630, b, { m: M.METAL });
          FB(F, t - 0.45, yy - 0.2, 0.5, 0.04, 0.32, 0.04, 0x3a3630, b, { m: M.METAL });
          FB(F, t + 0.45, yy - 0.2, 0.5, 0.04, 0.32, 0.04, 0x3a3630, b, { m: M.METAL });
          if (rnd() < 0.4)
            FB(
              F,
              t,
              yy - 0.15,
              0.48,
              Math.min(0.9, step * 0.8),
              0.24,
              0.02,
              pick([0xd8d1c1, 0xc9bc9f, 0xbcad8c, 0xe2dccd]),
              b,
              { m: M.CLOTH }
            );
        }
      }
    }
    if (damaged || rnd() < 0.25) {
      // agujeros de metralla y ladrillo a la vista
      const holes = damaged ? 3 : 1;
      for (let k = 0; k < holes; k++) {
        const t = rr(0.6, L - 0.6),
          yy = rr(0.9, Math.max(1, hs - 0.4));
        FB(F, t + 0.08, yy + 0.05, 0.015, rr(0.6, 1.1), rr(0.5, 0.8), 0.03, 0xa0644a, b, { m: M.BRICK });
        FB(F, t, yy, 0.03, rr(0.35, 0.6), rr(0.3, 0.5), 0.04, 0x221f1b, b, { m: M.BURNT });
      }
    }
  }
  if (damaged || rnd() < 0.15) rubbleAround(x, y, w, d);
  if (o.hotel) {
    // marquesina de la entrada y el cartel de la azotea
    hotelSign(x, y, w, d, hs + 0.1, b);
    FB({ face: 1, x, y, w, d }, w / 2, 1.2, 0.6, 2.4, 0.1, 1.2, 0xe8e2d0, b);
    FB({ face: 1, x, y, w, d }, w / 2 - 1.1, 0.6, 1.1, 0.1, 1.2, 0.1, 0xd9d2c0, b);
    FB({ face: 1, x, y, w, d }, w / 2 + 1.1, 0.6, 1.1, 0.1, 1.2, 0.1, 0xd9d2c0, b);
  }
  return true;
}
function roofProps(x, y, w, d, top, wall, b, hotel) {
  const P = (px, py, pz, sx, sy, sz, c, ex) => B(px, py, pz, sx, sy, sz, c, Object.assign({ b, roof: 1 }, ex || {}));
  const tanks = rnd() < 0.6 ? 1 + ri(2) : 0;
  for (let k = 0; k < tanks; k++) {
    const tx = x + rr(0.8, w - 0.8),
      tz = y + rr(0.8, d - 0.8),
      tc = pick([0x7a776c, 0x8a6446, 0x56697a, 0xb4a280, 0x4a4640]); // arena, marrón, azul, oscuro: todo polvoriento
    const tall = rnd() < 0.5 ? 0.5 : 0;
    if (tall)
      for (const [a, c] of [
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2]
      ])
        P(tx + a, top + 0.25, tz + c, 0.06, 0.5, 0.06, 0x3a3630, { m: M.METAL }); // las patas bien metidas bajo el depósito
    C(tx, top + tall + 0.38, tz, 0.42, 0.75, tc, { b, roof: 1, m: M.METAL });
    C(tx, top + tall + 0.78, tz, 0.3, 0.06, shade(tc, 0.8), { b, roof: 1, m: M.METAL });
  }
  if (rnd() < 0.5) {
    const sx = x + rr(0.9, w - 0.9),
      sz = y + rr(0.9, d - 0.9);
    P(sx, top + 0.45, sz, 1.1, 0.9, 1.0, shade(wall, 0.95));
    P(sx, top + 0.95, sz, 1.2, 0.08, 1.1, 0x8f866f, { m: M.TIN });
  }
  if (rnd() < 0.3 || hotel) {
    const dx = x + rr(0.6, w - 0.6),
      dz = y + rr(0.6, d - 0.6);
    // la antena parabólica: el modelo subido, blanca y sobre su mástil hasta la azotea. Todas miran al mismo satélite
    // (hacia el oeste y muy levantadas), con un poco de holgura cada una; la tirada de su giro se hace igual que antes
    const ry = rnd() * 6;
    for (const part of ['dish', 'pole'])
      prop('u_dish', part, dx, top, dz, -Math.PI / 2 + (ry - 3) * 0.05, 1, 0xffffff, { roof: 1 });
  }
  if (rnd() < 0.35 || hotel) {
    const ax = x + rr(0.4, w - 0.4),
      az = y + rr(0.4, d - 0.4),
      ah = hotel ? 3.2 : rr(1.2, 2.2);
    if (hotel) {
      P(ax, top + ah / 2, az, 0.05, ah, 0.05, 0x4a4844, { m: M.METAL });
      for (let k = 0; k < 3; k++)
        P(ax, top + ah * (0.55 + k * 0.15), az, 0.5 - k * 0.12, 0.03, 0.03, 0x4a4844, { m: M.METAL });
    } else {
      const h = phs(ax, az, 61);
      prop('deco9', 'ant', ax, top, az, h * 6.283, 0.85 + (ah - 1.2) * 0.45, 0xffffff, { roof: 1 });
    }
  }
  if (rnd() < 0.5)
    for (let k = 0; k < 2 + ri(3); k++) {
      const bx = x + rr(0.5, w - 0.5),
        bz = y + rr(0.5, d - 0.5),
        sx = rr(0.25, 0.5),
        sy = rr(0.2, 0.35),
        sz = rr(0.25, 0.5),
        bc = pick([0x8b6a42, 0x6b6f70, 0xa79e8c, 0x3a5a7a]),
        bry = rnd() * 3;
      roofBox(bx, top, bz, sx, sy, sz, bc, bry, b);
    }
  if (rnd() < 0.22) {
    const lx = x + rr(0.5, w - 1.5),
      lz = y + rr(0.6, d - 0.6);
    P(lx, top + 0.35, lz, 0.04, 0.7, 0.04, 0x3a3630, { m: M.METAL });
    P(lx + 1.2, top + 0.35, lz, 0.04, 0.7, 0.04, 0x3a3630, { m: M.METAL });
    for (let k = 0; k < 4; k++)
      P(
        lx + 0.15 + k * 0.28,
        top + 0.36,
        lz,
        0.2,
        0.3,
        0.02,
        pick([0xd8d1c1, 0xc9bc9f, 0xbcad8c, 0xe2dccd, 0xb2a283]),
        { awn: 2, m: M.CLOTH }
      );
  }
  if (rnd() < 0.2) {
    const sx = x + rr(0.8, w - 0.8),
      sz = y + rr(0.8, d - 0.8);
    P(sx, top + 0.12, sz, 1.2, 0.05, 0.7, 0x2a3a5a, { rx: -0.3, m: M.GLASS });
  }
}
function rubbleAround(x, y, w, d) {
  for (let k = 0; k < 14; k++) {
    let i, j;
    const f = ri(4);
    if (f === 0) {
      i = x + ri(w);
      j = y - 1;
    } else if (f === 1) {
      i = x + ri(w);
      j = y + d;
    } else if (f === 2) {
      i = x - 1;
      j = y + ri(d);
    } else {
      i = x + w;
      j = y + ri(d);
    }
    if (!inB(i, j) || grid[idx(i, j)] === 1) continue;
    if (rnd() < 0.3) {
      const bx = i + rnd(),
        bz = j + rnd();
      prop(
        'kit3',
        rnd() < 0.55 ? 'brick0' : 'brick1',
        bx,
        0,
        bz,
        rnd() * 6.283,
        rr(0.9, 1.15),
        rnd() < 0.5 ? 0xffd2b8 : 0xffffff,
        { rx: rnd() < 0.3 ? PH : 0, rz: rr(-0.15, 0.15) }
      );
      continue;
    }
    B(
      i + rnd(),
      rr(0.05, 0.15),
      j + rnd(),
      rr(0.15, 0.55),
      rr(0.1, 0.3),
      rr(0.15, 0.5),
      pick([0xb4aa98, 0x9d9484, 0x8a8070]),
      { ry: rnd() * 3, rx: rr(-0.3, 0.3), m: M.CONC }
    );
  }
}
// la mercancía de una tienda junto a la puerta, contra la pared, a los dos lados
function shopFront(cx, z, face) {
  const h = mkH(cx, z, 64),
    L_ = [
      [-0.85, 'vb3a'],
      [-0.55, 'msack1'],
      [0.6, 'vb3b'],
      [0.9, 'mpot4'],
      [0.75, 'vb2'],
      [-0.75, 'mstack']
    ];
  const a = L_[Math.floor(h * 3)],
    b = L_[3 + Math.floor(((h * 7) % 1) * 3)];
  for (const [lx, q] of [a, b])
    mkP(q, cx, z, face, lx, 0.28, 0, (((h * 13) % 1) - 0.5) * 0.2, q === 'mstack' ? 0.75 : 0.85);
}
function shack(x, y, w, d) {
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) if (!inB(i, j) || grid[idx(i, j)] !== 0) return false;
  markB(x, y, w, d);
  const b = nBld++;
  MAT = M.TIN;
  const c = pick([0x8a5a3c, 0x5a7a8a, 0x9a8a6a, 0x7a6a52, 0x6a8a6a, 0xa86a3a]);
  const h = rr(1.0, 1.3);
  setTop(x, y, w, d, h + 0.1);
  B(x + w / 2, h / 2, y + d / 2, w - 0.05, h, d - 0.05, c, { b });
  for (let t = 0.2; t < w; t += 0.35) B(x + t, h / 2, y + d + 0.005, 0.03, h, 0.03, shade(c, 0.75), { b });
  B(x + w / 2, h + 0.1, y + d / 2, w + 0.3, 0.06, d + 0.4, pick([0x8a5a3c, 0x7a7a72, 0x9a6a40]), { b, rx: 0.12 });
  B(x + w / 2, 0.5, y + d + 0.03, 0.6, 0.9, 0.05, 0x3a3028, { b, m: M.WOOD });
  return true;
}
function constructionSite(x, y, w, d, floors) {
  markB(x, y, w, d);
  const b = nBld++;
  const cc = 0xb9b3a6;
  MAT = M.CONC;
  setTop(x, y, w, d, FH * 1.1 + 0.08);
  for (let f = 0; f < floors; f++) {
    const yy = f * FH * 1.1;
    for (let i = 0; i <= w; i += 2)
      for (let j = 0; j <= d; j += 2) {
        if (f === floors - 1 && rnd() < 0.4) continue;
        B(
          x + Math.min(i, w - 0.15) + 0.075,
          yy + FH * 0.55,
          y + Math.min(j, d - 0.15) + 0.075,
          0.22,
          FH * 1.1,
          0.22,
          cc,
          { b }
        );
      }
    if (f < floors - 1 || rnd() < 0.5) B(x + w / 2, yy + FH * 1.1, y + d / 2, w, 0.16, d, shade(cc, 0.95), { b });
  }
  for (let k = 0; k < 14; k++)
    B(x + rr(0.2, w - 0.2), floors * FH * 1.1 + 0.4, y + rr(0.2, d - 0.2), 0.03, rr(0.5, 1.1), 0.03, 0x5a3a2a, {
      b,
      roof: 1,
      rz: rr(-0.2, 0.2),
      m: M.METAL
    });
  for (let i = 0; i < w; i += 1) B(x + i + 0.5, 0.45, y + d - 0.15, 0.95, 0.9, 0.25, 0xa0644a, { b, m: M.BRICK });
}
// la grúa torre: el modelo subido, con la pluma girada a su ángulo; la celda bajo el mástil es sólida, y unas cuantas cajas
// a lo largo del mástil paran las balas (no se pintan)
function crane(i, j) {
  markB(i, j, 1, 1);
  const b = nBld++,
    x = i + 0.5,
    z = j + 0.5;
  const L_ = CUR || chunkFor(x, z);
  L_.CR.push({ x, z, ry: -0.35 });
  for (let y = 1; y < 21; y += 4) B(x, y + 2, z, 1.1, 4, 1.1, 0xd8a428, { b, m: M.METAL, hid: 1 });
}
function buildCranes(ch) {
  if (!ch.CR.length) return;
  withModel('crane', M_ => {
    if (!ch.group) return;
    for (const e of ch.CR) {
      const q = lodMesh(M_.geos.body, M_.mat);
      q.position.set(e.x, 0, e.z);
      q.rotation.y = e.ry;
      q.castShadow = true;
      q.receiveShadow = true;
      ch.group.add(q);
      CRANEM.push(q);
    }
  });
}
const CRANEM = [];
