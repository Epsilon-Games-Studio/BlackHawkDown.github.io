/* ====================================================================================================
 * ui/tactical-map.js
 *
 * Mapa táctico: las hojas impresas de la ciudad y de la región, con las posiciones en vivo encima, zoom y desplazamiento
 * ================================================================================================== */

'use strict';

let mapMode = 'city',
  SHEETS = { city: null, reg: null };
const MV = { s: 1, ox: 0, oy: 0, ptrs: new Map(), lightX: null, lightY: null, moved: 0, downT: 0 };
function sheet(mode) {
  if (mode === 'city') {
    if (!SHEETS.city && ORX === 0 && ORZ === 0) SHEETS.city = buildTacSheet();
    return SHEETS.city;
  }
  if (!SHEETS.reg) SHEETS.reg = buildRegSheet();
  return SHEETS.reg;
}
const sheetPx = (sh, x, z) =>
  sh.S ? [sh.MRG + x * sh.S, sh.MRG + z * sh.S] : [sh.MRG + (x - WB.x0) * sh.PXU, sh.MRG + (z - WB.z0) * sh.PXU];
const sheetW = (sh, px, py) =>
  sh.S
    ? [(px - sh.MRG) / sh.S, (py - sh.MRG) / sh.S]
    : [WB.x0 + (px - sh.MRG) / sh.PXU, WB.z0 + (py - sh.MRG) / sh.PXU];
function mapFit(center) {
  const cv = $('mpCanvas'),
    sh = sheet(mapMode);
  if (!sh) return;
  const W_ = cv.width,
    H_ = cv.height,
    fit = Math.min(W_ / sh.cv.width, H_ / sh.cv.height);
  MV.min = fit * 0.9;
  MV.max = fit * 8;
  if (center) {
    MV.s = clamp(Math.max(fit * 2.2, Math.min(W_, H_) / (sh.S ? 140 * sh.S : 900 * sh.PXU)), MV.min, MV.max);
    const [px, py] = sheetPx(sh, center[0], center[1]);
    MV.ox = W_ / 2 - px * MV.s;
    MV.oy = H_ / 2 - py * MV.s;
  } else {
    MV.s = fit;
    MV.ox = (W_ - sh.cv.width * fit) / 2;
    MV.oy = (H_ - sh.cv.height * fit) / 2;
  }
}
function mapZoom(f, cx, cy) {
  const cv = $('mpCanvas');
  cx = cx == null ? cv.width / 2 : cx;
  cy = cy == null ? cv.height / 2 : cy;
  const ns = clamp(MV.s * f, MV.min || 0.05, MV.max || 20);
  MV.ox = cx - ((cx - MV.ox) * ns) / MV.s;
  MV.oy = cy - ((cy - MV.oy) * ns) / MV.s;
  MV.s = ns;
}
function unitsCentre() {
  const L = us.filter(u => u.alive && !u.npc);
  if (!L.length) return [camS.tx, camS.tz];
  return [L.reduce((a, u) => a + u.x, 0) / L.length, L.reduce((a, u) => a + u.z, 0) / L.length];
}
// un marco OTAN: rectángulo azul con la cruz de infantería, un punto encima para el tamaño y el indicativo al lado
function natoSym(x, px, py, s, col, kind, label, fill) {
  const w = 30 * s,
    h = 20 * s;
  x.save();
  x.lineWidth = 2.2 * s;
  x.strokeStyle = col;
  x.fillStyle = fill || 'rgba(128,180,232,.88)';
  if (kind === 'hostile') {
    x.beginPath();
    x.moveTo(px, py - h * 0.8);
    x.lineTo(px + h * 0.8, py);
    x.lineTo(px, py + h * 0.8);
    x.lineTo(px - h * 0.8, py);
    x.closePath();
    x.fill();
    x.stroke();
  } else {
    x.fillRect(px - w / 2, py - h / 2, w, h);
    x.strokeRect(px - w / 2, py - h / 2, w, h);
    x.beginPath();
    x.moveTo(px - w / 2, py - h / 2);
    x.lineTo(px + w / 2, py + h / 2);
    x.moveTo(px + w / 2, py - h / 2);
    x.lineTo(px - w / 2, py + h / 2);
    x.stroke();
    if (kind === 'delta') {
      x.fillStyle = col;
      x.font = `700 ${9 * s}px "Barlow Condensed", sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('SOF', px, py + h / 2 + 7 * s);
    }
    if (kind === 'mech') {
      x.beginPath();
      x.ellipse(px, py, w * 0.3, h * 0.25, 0, 0, 6.3);
      x.stroke();
    }
    x.fillStyle = col;
    for (let k = -1; k <= 1; k++) {
      x.beginPath();
      x.arc(px + k * 5 * s, py - h / 2 - 5 * s, 1.8 * s, 0, 6.3);
      x.fill();
    }
  }
  if (label) {
    x.font = `700 ${13 * s}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    x.textAlign = 'left';
    x.textBaseline = 'middle';
    x.lineWidth = 4 * s;
    x.strokeStyle = 'rgba(240,232,208,.92)';
    x.strokeText(label, px + w / 2 + 5 * s, py);
    x.fillStyle = col;
    x.fillText(label, px + w / 2 + 5 * s, py);
  }
  x.restore();
}
function drawMap() {
  const cv = $('mpCanvas'),
    x = cv.getContext('2d'),
    sh = sheet(mapMode);
  if (!sh) return;
  const W_ = cv.width,
    H_ = cv.height,
    dpr = cv.width / Math.max(1, cv.clientWidth);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#0e0f0a';
  x.fillRect(0, 0, W_, H_);
  x.imageSmoothingEnabled = MV.s < 1.5;
  x.drawImage(sh.cv, MV.ox, MV.oy, sh.cv.width * MV.s, sh.cv.height * MV.s);
  const P = (wx, wz) => {
    const [a, b] = sheetPx(sh, wx, wz);
    return [MV.ox + a * MV.s, MV.oy + b * MV.s];
  };
  const k = dpr * clamp(0.7 + MV.s * 0.25, 0.8, 1.6),
    wpx = MV.s * (sh.S || sh.PXU);
  // luz: la hora de la misión también cae sobre el papel; de noche solo se ve con una linterna
  const nf = nightF,
    gf = goldF;
  if (gf > 0.02 && nf < 0.9) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const dawn = MIS.phase === 'dawn' || (MIS.hour || 12) < 9;
    x.fillStyle = dawn ? `rgba(236,196,206,${0.55 * gf})` : `rgba(246,170,92,${0.6 * gf})`;
    x.fillRect(0, 0, W_, H_);
    x.restore();
  }
  if (nf > 0.05) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = `rgba(${Math.round(255 - 205 * nf)},${Math.round(255 - 195 * nf)},${Math.round(255 - 160 * nf)},1)`;
    x.fillRect(0, 0, W_, H_);
    x.restore();
    const lx = MV.lightX != null ? MV.lightX : W_ / 2,
      ly = MV.lightY != null ? MV.lightY : H_ / 2,
      R = Math.min(W_, H_) * 0.32;
    x.save();
    x.globalCompositeOperation = 'lighter';
    const gr = x.createRadialGradient(lx, ly, 0, lx, ly, R);
    gr.addColorStop(0, `rgba(255,236,190,${0.62 * nf})`);
    gr.addColorStop(0.55, `rgba(240,210,150,${0.3 * nf})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, W_, H_);
    x.restore();
    x.save();
    x.globalCompositeOperation = 'multiply';
    const g2 = x.createRadialGradient(lx, ly, R * 0.4, lx, ly, R * 1.25);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(
      1,
      `rgba(${Math.round(255 - 230 * nf)},${Math.round(255 - 228 * nf)},${Math.round(255 - 215 * nf)},1)`
    );
    x.fillStyle = g2;
    x.fillRect(0, 0, W_, H_);
    x.restore();
  }
  // lo que ha caído, el objetivo, las columnas, el enemigo que conocemos y cada unidad bajo su marco OTAN
  for (const kk of ['s61', 's64'])
    if (crashed(kk) || (G.m && ((kk === 's61' && G.m.down61) || (kk === 's64' && G.m.down64)))) {
      const [px, py] = P(LM[kk].x, LM[kk].z);
      x.save();
      x.strokeStyle = MAP_RED;
      x.lineWidth = 3 * k;
      x.beginPath();
      x.arc(px, py, 11 * k, 0, 6.3);
      x.stroke();
      x.beginPath();
      x.moveTo(px - 7 * k, py - 7 * k);
      x.lineTo(px + 7 * k, py + 7 * k);
      x.moveTo(px + 7 * k, py - 7 * k);
      x.lineTo(px - 7 * k, py + 7 * k);
      x.stroke();
      x.restore();
      mapLabel(x, kk === 's61' ? 'Super 6-1' : 'Super 6-4', px + 15 * k, py - 12 * k, {
        size: 14 * k,
        w: 700,
        col: MAP_RED
      });
    }
  const sub = G && MIS.subs && MIS.subs[G.sub];
  if (sub && sub.zone && G.started) {
    const [px, py] = P(sub.zone.x, sub.zone.z),
      r = Math.max(10 * k, sub.zone.r * wpx);
    x.save();
    x.strokeStyle = '#d0661c';
    x.lineWidth = 3 * k;
    x.setLineDash([8 * k, 5 * k]);
    x.beginPath();
    x.arc(px, py, r, 0, 6.3);
    x.stroke();
    x.setLineDash([]);
    x.beginPath();
    x.moveTo(px - 9 * k, py);
    x.lineTo(px + 9 * k, py);
    x.moveTo(px, py - 9 * k);
    x.lineTo(px, py + 9 * k);
    x.stroke();
    x.restore();
    mapLabel(x, L('Objetivo') + ': ' + L(sub.text), px, py + r + 14 * k, {
      size: 13 * k,
      w: 700,
      col: '#a8461a',
      align: 'center'
    });
  }
  if (G && G.m && G.m.mzMap && G.started)
    for (const z of G.m.mzMap) {
      const [px, py] = P(z.x, z.z),
        r = Math.max(8 * k, z.r * wpx);
      x.save();
      x.strokeStyle = z.col || '#c0391c';
      x.lineWidth = 2.5 * k;
      x.setLineDash([6 * k, 4 * k]);
      x.beginPath();
      x.arc(px, py, r, 0, 6.3);
      x.stroke();
      x.setLineDash([]);
      x.restore();
      mapLabel(x, z.lab || (G.m.found ? 'Mortero' : '¿Mortero?'), px, py, {
        size: 13 * k,
        w: 700,
        col: z.col || '#a8321e',
        align: 'center'
      });
    }
  if (G && G.m && G.m.mapRoutes && G.started)
    for (const r of G.m.mapRoutes) {
      x.save();
      x.strokeStyle = r.col;
      x.lineWidth = (r.w || 4) * k;
      x.lineJoin = 'round';
      x.lineCap = 'round';
      x.globalAlpha = 0.9;
      if (r.pts) {
        x.beginPath();
        r.pts.forEach((q, i) => {
          const [px, py] = P(q[0], q[1]);
          if (i) x.lineTo(px, py);
          else x.moveTo(px, py);
        });
        x.stroke();
      }
      if (r.x) {
        const [px, py] = P(r.x[0], r.x[1]),
          s_ = 8 * k;
        x.beginPath();
        x.moveTo(px - s_, py - s_);
        x.lineTo(px + s_, py + s_);
        x.moveTo(px + s_, py - s_);
        x.lineTo(px - s_, py + s_);
        x.stroke();
      }
      if (r.box) {
        const [ax, ay] = P(r.box[0], r.box[1]),
          [bx, by] = P(r.box[2], r.box[3]);
        x.strokeRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
      }
      if (r.lab) {
        const q = r.labAt || (r.pts ? r.pts[r.pts.length - 1] : r.x);
        const [px, py] = P(q[0], q[1]);
        x.restore();
        mapLabel(x, L(r.lab), px + 12 * k, py, { size: 12 * k, w: 700, col: r.col });
        continue;
      }
      x.restore();
    }
  {
    const T_ = typeof irT === 'function' && ORX === 0 ? irT() : null;
    if (T_ && MIS.id === 'irene') {
      const [px, py] = P(T_.x + T_.w / 2, T_.y + T_.d / 2);
      x.save();
      x.strokeStyle = MAP_RED;
      x.lineWidth = 3 * k;
      x.strokeRect(px - 9 * k, py - 9 * k, 18 * k, 18 * k);
      x.restore();
    }
  }
  for (const [pts, lab, inf] of convoyLists()) {
    const cx_ = pts.reduce((a, p) => a + p[0], 0) / pts.length,
      cz_ = pts.reduce((a, p) => a + p[1], 0) / pts.length,
      [px, py] = P(cx_, cz_);
    natoSym(
      x,
      px,
      py,
      k,
      '#1e3f66',
      inf ? 'inf' : 'mech',
      lab === 'ONU' ? L('Columna ONU') : inf ? lab.charAt(0) + lab.slice(1).toLowerCase() : 'Romeo 6-4'
    );
  }
  for (const e of them) {
    if (!e.alive || e.dummy) continue;
    const gh = G.ghosts.get(e),
      seen = e.spotted || (gh && G.t - gh.t < 15);
    if (!seen) continue;
    const [px, py] = P(e.spotted ? e.x : gh.x, e.spotted ? e.z : gh.z);
    x.save();
    x.globalAlpha = e.spotted ? 1 : 0.55;
    x.fillStyle = 'rgba(214,72,52,.9)';
    x.strokeStyle = '#6a1a10';
    x.lineWidth = 1.4 * k;
    const r = (e.tech ? 7 : 4.5) * k;
    x.beginPath();
    x.moveTo(px, py - r);
    x.lineTo(px + r, py);
    x.lineTo(px, py + r);
    x.lineTo(px - r, py);
    x.closePath();
    x.fill();
    x.stroke();
    x.restore();
  }
  for (const T_ of TECHS)
    if (T_.alive && T_.gunner.spotted) {
      const [px, py] = P(T_.g.position.x, T_.g.position.z);
      mapLabel(x, L('Técnica'), px + 10 * k, py, { size: 12 * k, w: 700, col: MAP_RED });
    }
  const groups =
    IRN.groups && IRN.groups.length
      ? IRN.groups.map(g => ({ name: g.name, kind: g.kind, L: g.members.filter(u => u.alive || u.down) }))
      : [
          {
            name: MIS.squadTxt || L('Escuadra'),
            kind: squadType === 'delta' ? 'delta' : 'chalk',
            L: us.filter(u => !u.npc && (u.alive || u.down))
          }
        ];
  for (const g of groups) {
    if (!g.L.length) continue;
    for (const u of g.L) {
      const [px, py] = P(u.x, u.z);
      x.fillStyle = u.alive ? '#24548f' : '#777';
      x.beginPath();
      x.arc(px, py, 2.4 * k, 0, 6.3);
      x.fill();
    }
    const L_ = g.L.filter(u => u.alive),
      cx_ = (L_.length ? L_ : g.L).reduce((a, u) => a + u.x, 0) / (L_.length || g.L.length),
      cz_ = (L_.length ? L_ : g.L).reduce((a, u) => a + u.z, 0) / (L_.length || g.L.length);
    const [px, py] = P(cx_, cz_);
    natoSym(
      x,
      px,
      py - 16 * k,
      k,
      '#1e3f66',
      g.kind === 'delta' ? 'delta' : 'inf',
      g.name + ' · ' + L_.length + '/' + g.L.length
    );
  }
  if (FLIGHT.on)
    for (const h of FLIGHT.helis) {
      const [px, py] = P(h.g.position.x, h.g.position.z);
      x.fillStyle = MAP_BLUE;
      x.beginPath();
      x.arc(px, py, 4 * k, 0, 6.3);
      x.fill();
    }
  // lo que ve la cámara
  {
    const [vx, vy] = P(camS.tx, camS.tz),
      r = halfH() * 1.5 * wpx;
    x.save();
    x.strokeStyle = 'rgba(168,50,30,.85)';
    x.lineWidth = 1.5 * dpr;
    x.setLineDash([6 * dpr, 4 * dpr]);
    x.strokeRect(vx - r, vy - r * 0.7, r * 2, r * 1.4);
    x.restore();
  }
}
function sizeMap() {
  const cv = $('mpCanvas'),
    r = cv.getBoundingClientRect(),
    dpr = Math.min(2, devicePixelRatio || 1);
  const w = Math.round(r.width * dpr),
    h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
    return true;
  }
  return false;
}
function openMap(on) {
  $('mapPanel').hidden = !on;
  MAPOPEN = !!on;
  if (!on) return;
  if (ORX !== 0 || ORZ !== 0) mapMode = 'reg';
  $('mpCity').disabled = ORX !== 0 || ORZ !== 0;
  $('mpCity').setAttribute('aria-pressed', mapMode === 'city');
  $('mpReg').setAttribute('aria-pressed', mapMode === 'reg');
  $('mpPause').setAttribute('aria-pressed', !!(G && G.paused));
  $('mpPause').textContent = L(G && G.paused ? 'Reanudar' : 'Pausa');
  const go = () => {
    sizeMap();
    mapFit(unitsCentre());
    MV.lightX = MV.lightY = null;
    drawMap();
  };
  if (!SHEETS[mapMode === 'city' && (ORX !== 0 || ORZ !== 0) ? 'reg' : mapMode]) {
    $('mpLoading').hidden = false;
    setTimeout(() => {
      go();
      $('mpLoading').hidden = true;
    }, 30);
  } else go();
}
let MAPOPEN = false;
function mapTick() {
  if (!MAPOPEN) return;
  if (sizeMap()) mapFit();
  drawMap();
}
{
  const cv = $('mpCanvas'),
    pos = e => {
      const r = cv.getBoundingClientRect(),
        d = cv.width / Math.max(1, r.width);
      return [(e.clientX - r.left) * d, (e.clientY - r.top) * d];
    };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    MV.ptrs.set(e.pointerId, pos(e));
    MV.moved = 0;
    MV.downT = performance.now();
    [MV.lightX, MV.lightY] = pos(e);
  });
  cv.addEventListener('pointermove', e => {
    const p = pos(e);
    if (e.pointerType === 'mouse' && !MV.ptrs.size) {
      MV.lightX = p[0];
      MV.lightY = p[1];
      return;
    }
    const prev = MV.ptrs.get(e.pointerId);
    if (!prev) return;
    if (MV.ptrs.size === 1) {
      MV.ox += p[0] - prev[0];
      MV.oy += p[1] - prev[1];
      MV.moved += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      MV.lightX = p[0];
      MV.lightY = p[1];
    } else if (MV.ptrs.size === 2) {
      const [a, b] = [...MV.ptrs.entries()].map(([id, q]) => (id === e.pointerId ? p : q)),
        [c0, d0] = [...MV.ptrs.values()];
      const d1 = Math.hypot(a[0] - b[0], a[1] - b[1]),
        dP = Math.hypot(c0[0] - d0[0], c0[1] - d0[1]);
      const mx = (a[0] + b[0]) / 2,
        my = (a[1] + b[1]) / 2;
      if (dP > 0) mapZoom(d1 / dP, mx, my);
      MV.moved += 99;
    }
    MV.ptrs.set(e.pointerId, p);
  });
  const up = e => {
    const was = MV.ptrs.get(e.pointerId);
    MV.ptrs.delete(e.pointerId);
    if (was && !MV.ptrs.size && MV.moved < 8 && performance.now() - MV.downT < 350) {
      const sh = sheet(mapMode);
      if (!sh) return;
      const [wx, wz] = sheetW(sh, (was[0] - MV.ox) / MV.s, (was[1] - MV.oy) / MV.s);
      camS.tx = clamp(wx, WB.x0 + 20, WB.x1 - 20);
      camS.tz = clamp(wz, WB.z0 + 20, WB.z1 - 20);
      openMap(false);
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', e => MV.ptrs.delete(e.pointerId));
  cv.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      const p = pos(e);
      mapZoom(Math.exp(-e.deltaY * 0.0015), p[0], p[1]);
    },
    { passive: false }
  );
  $('mpZin').onclick = () => mapZoom(1.4);
  $('mpZout').onclick = () => mapZoom(1 / 1.4);
  $('mpCentre').onclick = () => {
    mapFit(unitsCentre());
  };
  $('mpAll').onclick = () => mapFit();
  $('mpPause').onclick = () => {
    if (!G.started || G.over) return;
    G.paused = !G.paused;
    updPause();
    $('mpPause').textContent = L(G.paused ? 'Reanudar' : 'Pausa');
    $('mpPause').setAttribute('aria-pressed', G.paused);
  };
}
