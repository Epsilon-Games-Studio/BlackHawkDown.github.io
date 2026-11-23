/* ====================================================================================================
 * input/input.js
 *
 * Entrada (ratón, táctil y teclado)
 *
 * Ratón y táctil: toques, arrastres, pellizcos y dibujo de rutas con el dedo.
 * Un toque decide si selecciona un soldado, ataca a un enemigo o manda moverse.
 * ================================================================================================== */

'use strict';

const ray = new T.Raycaster(),
  ndc = new T.Vector2(),
  plane = new T.Plane(new T.Vector3(0, 1, 0), 0),
  hitP = new T.Vector3();
const ptrs = new Map();
let gest = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  closeCtx();
  if (ptrs.size === 1) {
    gest = {
      type: 'tap',
      btn: e.button,
      sx: e.clientX,
      sy: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      shift: e.shiftKey || e.ctrlKey || e.metaKey,
      t0: performance.now(),
      maxD: 0,
      touch: e.pointerType !== 'mouse'
    };
    if (G && G.started && !G.over && e.button === 0) {
      if (G.mode === 'lb') {
        const p = groundPt(e.clientX, e.clientY);
        if (p) gest.lbA = SUP.lbA || p;
      }
      // solo se dibuja una ruta pulsando sobre un soldado que ya está seleccionado; cualquier otro arrastre mueve la cámara
      else if (G.mode === 'move' && OPT.draw) {
        const P_ = pickAt(e.clientX, e.clientY);
        if (P_.unit && P_.unit.team === 'us' && G.sel.has(P_.unit)) gest.unit = P_.unit;
      }
      const gg = gest;
      gest.lpT = setTimeout(() => {
        if (gest === gg && gg.type === 'tap' && ptrs.size === 1) {
          gg.type = 'lp';
          groundMenu(gg.sx, gg.sy);
        }
      }, 520);
    }
  } else if (ptrs.size === 2) {
    if (gest && gest.lpT) clearTimeout(gest.lpT);
    G.draft = null;
    G.panT = performance.now();
    if (SUP) SUP.draft = null;
    const [a, b] = [...ptrs.values()];
    gest = {
      type: 'pinch',
      d0: Math.hypot(a.x - b.x, a.y - b.y),
      a0: Math.atan2(b.y - a.y, b.x - a.x),
      z0: camS.zoomT,
      y0: camS.yawT,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2
    };
  }
});
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gest) return;
  if (gest.type === 'tap') gest.maxD = Math.max(gest.maxD, Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy));
  if (gest.type === 'tap' && gest.maxD > (gest.touch ? 12 : 6)) {
    if (gest.lpT) clearTimeout(gest.lpT);
    // para dibujar hay que pulsar a propósito sobre el soldado primero; un deslizamiento rápido siempre mueve la cámara
    const held = performance.now() - gest.t0 > 160;
    gest.type = gest.btn === 2 ? 'rot' : gest.lbA ? 'lbdraw' : gest.unit && held ? 'draw' : 'pan';
    if (gest.type === 'pan' || gest.type === 'rot') G.panT = performance.now();
    if (gest.type === 'draw') {
      gest.pts = [[gest.unit.x, gest.unit.z]];
      G.draft = gest.pts;
    }
  }
  if (gest.type === 'lbdraw') {
    const p = groundPt(e.clientX, e.clientY);
    if (p) {
      SUP.draft = [gest.lbA, lbClamp(gest.lbA, p)];
      lbHint();
    }
  } else if (gest.type === 'draw') {
    const p = groundPt(e.clientX, e.clientY);
    if (p) {
      const l = gest.pts[gest.pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.7) gest.pts.push(p);
    }
  } else if (gest.type === 'pan' || (gest.type === 'rot' && (FLIGHT.on || CINE.on))) {
    if (FLIGHT.on) FLIGHT.uyaw -= (e.clientX - gest.lx) * 0.008;
    else if (CINE.on) CINE.uyaw -= (e.clientX - gest.lx) * 0.008;
    else pan(e.clientX - gest.lx, e.clientY - gest.ly);
  } else if (gest.type === 'rot') {
    camS.yawT -= (e.clientX - gest.lx) * 0.008;
    camS.yaw = camS.yawT;
  } else if (gest.type === 'pinch' && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y),
      an = Math.atan2(b.y - a.y, b.x - a.x);
    const CC = FLIGHT.on ? FLIGHT : CINE.on ? CINE : null;
    if (CC) {
      if (gest.fuz == null) {
        gest.fuz = CC.uz;
        gest.fyw = CC.uyaw;
      }
      CC.uz = clamp((gest.fuz * gest.d0) / Math.max(20, d), 0.3, 1.8);
      CC.uyaw = gest.fyw - (an - gest.a0);
    } else {
      camS.zoomT = clamp((gest.z0 * gest.d0) / Math.max(20, d), 4, 22);
      camS.zoom = camS.zoomT;
      camS.yawT = gest.y0 - (an - gest.a0);
      camS.yaw = camS.yawT;
    }
    const cx = (a.x + b.x) / 2,
      cy = (a.y + b.y) / 2;
    pan(cx - gest.cx, cy - gest.cy);
    gest.cx = cx;
    gest.cy = cy;
  }
  if (gest) {
    gest.lx = e.clientX;
    gest.ly = e.clientY;
  }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (gest && gest.lpT) clearTimeout(gest.lpT);
  // un toque es corto y quieto; lo que haya desplazado, pellizcado o durado demasiado nunca da una orden
  if (
    gest &&
    gest.type === 'tap' &&
    e.type === 'pointerup' &&
    performance.now() - gest.t0 < 450 &&
    ptrs.size === 0 &&
    !gest.multi
  ) {
    if (FLIGHT.on) flightTap(e.clientX, e.clientY);
    else if (!CINE.on) tap(e.clientX, e.clientY, gest.shift);
  } else if (gest && gest.type === 'lbdraw') {
    const p = groundPt(e.clientX, e.clientY) || (SUP.draft && SUP.draft[1]);
    SUP.draft = null;
    if (e.type === 'pointerup' && p && callLB(gest.lbA, p)) {
      SUP.lbA = null;
      setMode('move');
    }
  } else if (gest && gest.type === 'draw') {
    G.draft = null;
    if (e.type === 'pointerup') {
      const u = gest.unit;
      if (!G.sel.has(u)) {
        G.sel.clear();
        G.sel.add(u);
        refreshCards();
      }
      drawInto(u, gest.pts);
    }
  }
  if (ptrs.size === 0) gest = null;
  else if (gest && gest.type === 'pinch') gest = { type: 'dead', multi: true }; // el dedo que se queda después de un pellizco no hace nada hasta que se levantan todos
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointermove', e => {
  if (ptrs.size || !G || G.mode !== 'lb' || !SUP || !SUP.lbA) return;
  const p = groundPt(e.clientX, e.clientY);
  if (p) {
    SUP.draft = [SUP.lbA, lbClamp(SUP.lbA, p)];
    lbHint();
  }
});
canvas.addEventListener(
  'wheel',
  e => {
    e.preventDefault();
    zoomBy(Math.exp(e.deltaY * 0.0012));
  },
  { passive: false }
);

function lbHint() {
  if (!SUP.draft) return;
  const d = SUP.draft,
    L = Math.hypot(d[1][0] - d[0][0], d[1][1] - d[0][1]);
  hint(
    'Pasada: ' +
      Math.round(L * 1.5) +
      ' m × 15 m' +
      (L >= LB_LEN - 0.1 ? ' (máximo)' : '') +
      '. Todo lo que quede dentro, aliado o enemigo, cae.'
  );
}
function groundPt(cx, cy) {
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  return ray.ray.intersectPlane(plane, hitP) ? [hitP.x, hitP.z] : null;
}
let lastUTap = { u: null, t: 0 };
function tap(cx, cy, shift) {
  if (!G.started || G.over) return;
  if (G.mode === 'lb') {
    const p = groundPt(cx, cy);
    if (!p) return;
    if (!SUP.lbA) {
      SUP.lbA = p;
      SUP.draft = null;
      hint('Arrastra o toca el final de la pasada (máx. 50 m)');
    } else if (callLB(SUP.lbA, p)) {
      SUP.lbA = null;
      setMode('move');
    }
    return;
  }
  if (G.mode === 'flare') {
    const p = groundPt(cx, cy);
    if (p && callFlare(p[0], p[1])) setMode('move');
    return;
  }
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hbs = units
    .filter(u => (u.team === 'us' && u.alive && !u.npc) || (u.team === 'them' && u.alive && u.spotted))
    .map(u => u.m.hb);
  const hit = ray.intersectObjects(hbs, false)[0];
  if (hit) {
    const u = hit.object.userData.unit;
    if (u.team === 'us') {
      const now = performance.now();
      if (!shift && lastUTap.u === u && now - lastUTap.t < 380) {
        if (IRN.groups) {
          const g = irGroupSel(u);
          lastUTap.u = null;
          refreshCards();
          if (g) hint(g.name + ' seleccionado');
          return;
        }
        G.sel = new Set(us.filter(o => o.alive && !o.npc));
        lastUTap.u = null;
        refreshCards();
        hint('Toda la escuadra seleccionada');
        return;
      }
      lastUTap = { u, t: now };
      if (shift) {
        G.sel.has(u) ? G.sel.delete(u) : G.sel.add(u);
      } else {
        G.sel.clear();
        G.sel.add(u);
      }
      setMode('move');
      refreshCards();
      return;
    }
    if (!alive().length) {
      hint('Selecciona primero a un soldado');
      return;
    }
    if (G.mode === 'suppress') cmdSuppress(u.x, u.z);
    else cmdAttack(u);
    setMode('move');
    return;
  }
  let pt = null;
  const bh = ray.intersectObjects(visibleBoxMeshes(), false).find(h => h.point.y > 0.15);
  if (bh) pt = bh.point;
  else if (ray.ray.intersectPlane(plane, hitP)) pt = hitP;
  if (!pt) return;
  if (!alive().length) {
    hint('Selecciona primero a un soldado');
    return;
  }
  if (G.mode === 'suppress') {
    cmdSuppress(pt.x, pt.z);
    setMode('move');
    return;
  }
  if (G.mode === 'move') {
    const bid = bAt(Math.floor(pt.x + ray.ray.direction.x * 0.06), Math.floor(pt.z + ray.ray.direction.z * 0.06));
    if (bid >= 0) {
      buildingMenu(cx, cy, bid, pt);
      return;
    }
  }
  if (G.mode === 'attack') {
    hint('Toca un enemigo visible, o usa Suprimir sobre una zona');
    return;
  }
  const c = nearestFree(Math.floor(pt.x), Math.floor(pt.z));
  cmdMove(c[0], c[1], !G.newRoute);
}
