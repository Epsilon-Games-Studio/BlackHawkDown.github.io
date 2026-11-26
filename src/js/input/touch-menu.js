/* ====================================================================================================
 * input/touch-menu.js
 *
 * Táctil: un menú contextual bajo el dedo, para edificios y pulsaciones largas
 * ================================================================================================== */

function closeCtx() {
  const el = $('ctx');
  if (el) {
    el.hidden = true;
    el.innerHTML = '';
  }
}
function openCtx(cx, cy, items, title) {
  const el = $('ctx');
  el.innerHTML = '';
  if (title) {
    const t = document.createElement('span');
    t.className = 'ctt';
    t.textContent = L(title);
    el.appendChild(t);
  }
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = L(it[0]);
    if (it[2]) b.className = it[2];
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      closeCtx();
      it[1]();
    });
    el.appendChild(b);
  }
  el.hidden = false;
  const r = el.getBoundingClientRect(),
    x = clamp(cx - r.width / 2, 8, innerWidth - r.width - 8),
    y = clamp(cy - r.height - 18, 8, innerHeight - r.height - 8);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}
function pickAt(cx, cy) {
  ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, cam);
  const hbs = units
    .filter(u => (u.team === 'us' && u.alive && !u.npc) || (u.team === 'them' && u.alive && u.spotted))
    .map(u => u.m.hb);
  const hu = ray.intersectObjects(hbs, false)[0];
  let pt = null;
  const bh = ray.intersectObjects(visibleBoxMeshes(), false).find(h => h.point.y > 0.15);
  if (bh) pt = bh.point.clone().addScaledVector(ray.ray.direction, 0.06);
  else if (ray.ray.intersectPlane(plane, hitP)) pt = hitP.clone();
  const bid = pt ? bAt(Math.floor(pt.x), Math.floor(pt.z)) : -1;
  return { unit: hu ? hu.object.userData.unit : null, pt, bid };
}
function buildingMenu(cx, cy, bid, pt) {
  const b = BLDS[bid];
  openCtx(
    cx,
    cy,
    [
      ['Entrar · planta baja', () => cmdEnter(bid, 'ground')],
      ['Subir a la azotea', () => cmdEnter(bid, 'roof')],
      [
        'Ir junto al edificio',
        () => {
          const c = nearestFree(Math.floor(pt.x), Math.floor(pt.z));
          cmdMove(c[0], c[1], !G.newRoute);
        },
        'dim'
      ]
    ],
    b && b.ring ? 'Edificio objetivo' : 'Edificio'
  );
}
function groundMenu(cx, cy) {
  const P_ = pickAt(cx, cy);
  if (!P_.pt && !P_.unit) return;
  const sel = alive().length > 0,
    items = [];
  if (P_.unit && P_.unit.team === 'them') {
    const e = P_.unit;
    if (sel) {
      items.push(['Atacar', () => cmdAttack(e)]);
      items.push(['Suprimir', () => cmdSuppress(e.x, e.z)]);
    }
  } else if (P_.bid >= 0) {
    if (sel) {
      items.push(['Entrar · planta baja', () => cmdEnter(P_.bid, 'ground')]);
      items.push(['Subir a la azotea', () => cmdEnter(P_.bid, 'roof')]);
    }
  } else if (P_.pt) {
    const p = P_.pt;
    if (sel) {
      items.push([
        'Mover aquí',
        () => {
          const c = nearestFree(Math.floor(p.x), Math.floor(p.z));
          cmdMove(c[0], c[1], false);
        }
      ]);
      items.push(['Suprimir zona', () => cmdSuppress(p.x, p.z)]);
      items.push(['Cubrirse', () => cmdCover()]);
      items.push(['Atender heridos', () => cmdTreat()]);
    }
    items.push([
      'Little Bird desde aquí',
      () => {
        setMode('lb');
        SUP.lbA = [p.x, p.z];
        hint('Toca o arrastra hasta el final de la pasada');
      },
      'sup'
    ]);
    if (nightF > 0.25) items.push(['Bengala aquí', () => callFlare(p.x, p.z), 'sup']);
  }
  if (items.length) openCtx(cx, cy, items);
}
function drawInto(u, pts) {
  // una ruta dibujada con el dedo desde un soldado: caminos encadenados por los puntos muestreados
  const sel = G.sel.has(u) ? alive() : [u];
  if (!sel.length || pts.length < 2) return;
  const wps = [];
  for (const p of pts) {
    const c = nearestFree(Math.floor(p[0]), Math.floor(p[1]));
    const l = wps[wps.length - 1];
    if (!l || Math.hypot(l[0] - c[0], l[1] - c[1]) >= 2.5) wps.push(c);
  }
  const end = wps[wps.length - 1];
  const cells = [];
  const seen = new Set([idx(end[0], end[1])]);
  const q = [end];
  while (q.length && cells.length < sel.length) {
    const [i, j] = q.shift();
    if (walk(i, j)) cells.push([i, j]);
    for (const [dx, dy] of DIRS) {
      const ni = i + dx,
        nj = j + dy;
      if (!walk(ni, nj)) continue;
      const k = idx(ni, nj);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([ni, nj]);
    }
  }
  sel.forEach((s, k) => {
    leaveB(s);
    let cur = [Math.floor(s.x), Math.floor(s.z)],
      path = [];
    const list = wps.slice(0, -1).concat([cells[k] || end]);
    for (const w of list) {
      const seg = findPath(cur[0], cur[1], w[0], w[1]);
      if (seg) {
        path = path.concat(seg);
        cur = w;
      }
    }
    s.path = smoothPath(path, s.x, s.z);
    s.order = { type: 'move' };
    s.stance = 'stand';
    s.routeCol = sel.length === 1 ? nextRouteCol() : null;
  });
  moveMark.position.set(end[0] + 0.5, 0.06, end[1] + 0.5);
  moveMark.material.opacity = 1;
}
