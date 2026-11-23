/* ====================================================================================================
 * ui/planned-routes.js
 *
 * Rutas planificadas: pintadas planas sobre el suelo, por encima de todo, como en Door Kickers
 * ================================================================================================== */

'use strict';

const RT_MAX = 30000,
  rtPos = new Float32Array(RT_MAX * 3),
  rtCol = new Float32Array(RT_MAX * 3);
const rtGeo = new T.BufferGeometry();
rtGeo.setAttribute('position', new T.BufferAttribute(rtPos, 3).setUsage(T.DynamicDrawUsage));
rtGeo.setAttribute('color', new T.BufferAttribute(rtCol, 3).setUsage(T.DynamicDrawUsage));
const rtMesh = new T.Mesh(
  rtGeo,
  new T.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    depthTest: true,
    depthWrite: false,
    fog: false,
    side: T.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  })
);
rtMesh.frustumCulled = false;
rtMesh.renderOrder = 2;
let rtY = 0.07;
const ROUTE_COLS = [0x4fe0b8, 0xf2d14b, 0xc08cff, 0xff8fb8, 0x9be15d, 0x5fd4ff, 0xffffff, 0xffb070].map(
  c => new T.Color(c)
);
let routeColI = 0;
const nextRouteCol = () => ROUTE_COLS[routeColI++ % ROUTE_COLS.length];
const RC_LB = new T.Color(0xff8a2a),
  RC_NVG = new T.Color(0x56e86a),
  RC_SEL = new T.Color(0xffffff),
  RC_DIM = new T.Color(0xd8d8d8),
  RC_ATK = new T.Color(0xff4a36),
  RC_SUP = new T.Color(0xe7a63d);
let rtN = 0;
function rtQuad(ax, az, bx, bz, w, col) {
  if (rtN + 6 > RT_MAX) return;
  const dx = bx - ax,
    dz = bz - az,
    L = Math.hypot(dx, dz) || 1,
    px = ((-dz / L) * w) / 2,
    pz = ((dx / L) * w) / 2;
  const P = [ax + px, az + pz, ax - px, az - pz, bx + px, bz + pz, bx - px, bz - pz];
  for (const k of [0, 1, 2, 2, 1, 3]) {
    const o = rtN * 3;
    rtPos[o] = P[k * 2];
    rtPos[o + 1] = rtY;
    rtPos[o + 2] = P[k * 2 + 1];
    rtCol[o] = col.r;
    rtCol[o + 1] = col.g;
    rtCol[o + 2] = col.b;
    rtN++;
  }
}
function rtLine(pts, w, col, dash) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-4) continue;
    if (!dash) {
      rtQuad(a[0], a[1], b[0], b[1], w, col);
      continue;
    }
    for (let t = 0, guard = 0; t < L && guard < 400; guard++) {
      const ph = acc % 0.5,
        on = ph < 0.3,
        step = Math.max(0.004, Math.min(L - t, on ? 0.3 - ph : 0.5 - ph));
      if (on) {
        const t0 = t / L,
          t1 = (t + step) / L;
        rtQuad(
          a[0] + (b[0] - a[0]) * t0,
          a[1] + (b[1] - a[1]) * t0,
          a[0] + (b[0] - a[0]) * t1,
          a[1] + (b[1] - a[1]) * t1,
          w,
          col
        );
      }
      t += step;
      acc += step;
    }
  }
}
function rtMark(x, z, s, col) {
  rtQuad(x - s, z, x + s, z, s * 2, col);
}
function rtCircle(x, z, r, w, col) {
  const n = 18;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * 6.2832,
      a1 = ((k + 1) / n) * 6.2832;
    rtQuad(x + Math.sin(a0) * r, z + Math.cos(a0) * r, x + Math.sin(a1) * r, z + Math.cos(a1) * r, w, col);
  }
}
function drawRoutes() {
  if (rtMesh.parent !== world) world.add(rtMesh);
  rtN = 0;
  rtY = 0.07;
  const nt = clamp(NIGHTG.value, 0, 1);
  rtMesh.material.opacity = 0.75 + 0.25 * nt;
  const nw = 1 + 0.6 * nt;
  if (G.started && !G.over && MIS.id !== 'attract' && !CINE.on)
    for (const u of us) {
      if (!u.alive || u.npc) continue; // los hombres con guion (la vida de la base, los sanitarios) andan sin ruta pintada
      const sel = G.sel.has(u),
        w = (sel ? 0.1 : 0.065) * nw,
        col = u.routeCol || (sel ? RC_SEL : RC_DIM);
      rtY = (u.elev || 0) + 0.07;
      if (u.path.length) {
        const pts = [[u.x, u.z]];
        for (const c of u.path) pts.push([c[0] + 0.5, c[1] + 0.5]);
        rtLine(curvePts(pts, 3), u.routeCol ? w * 1.1 : w, col, !sel && !u.routeCol);
        const e = pts[pts.length - 1];
        rtCircle(e[0], e[1], sel ? 0.26 : 0.2, (sel ? 0.07 : 0.055) * nw, col);
      }
      const o = u.order;
      if (o && o.type === 'attack' && o.target.alive && (o.target.spotted || sel))
        rtLine(
          [
            [u.x, u.z],
            [o.target.x, o.target.z]
          ],
          0.055,
          RC_ATK,
          true
        );
      if (o && o.type === 'suppress')
        rtLine(
          [
            [u.x, u.z],
            [o.x, o.z]
          ],
          0.055,
          RC_SUP,
          true
        );
    }
  rtY = 0.07;
  if (G.started && !G.over) {
    if (G.draft && G.draft.length > 1) rtLine(curvePts(G.draft, 2), 0.1 * nw, RC_SEL, false);
    if (SUP) {
      const lbLine = (a, b) => {
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          L = Math.hypot(dx, dz) || 1,
          ux = dx / L,
          uz = dz / L,
          nx = -uz * LB_HW,
          nz = ux * LB_HW;
        // la franja que se va a barrer: borde discontinuo, rayado por dentro, la línea de vuelo por el centro y una flecha grande
        const c1 = [a[0] + nx, a[1] + nz],
          c2 = [b[0] + nx, b[1] + nz],
          c3 = [b[0] - nx, b[1] - nz],
          c4 = [a[0] - nx, a[1] - nz];
        const k = Math.max(1, camS.zoom / 9);
        rtLine([c1, c2, c3, c4, c1], 0.32 * k, RC_LB, false);
        for (let t = 1.2; t < L; t += 2.4) {
          const p = [a[0] + ux * t, a[1] + uz * t];
          rtQuad(
            p[0] + nx * 0.95 - ux * 1.3,
            p[1] + nz * 0.95 - uz * 1.3,
            p[0] - nx * 0.95 + ux * 1.3,
            p[1] - nz * 0.95 + uz * 1.3,
            0.16 * k,
            RC_LB
          );
        }
        for (let t = 0; t < L; t += 2.2)
          rtQuad(
            a[0] + ux * t,
            a[1] + uz * t,
            a[0] + ux * Math.min(L, t + 1.3),
            a[1] + uz * Math.min(L, t + 1.3),
            0.22 * k,
            RC_LB
          );
        rtQuad(b[0] + ux * 2.5, b[1] + uz * 2.5, b[0] - ux * 1.5 - uz * 2.2, b[1] - uz * 1.5 + ux * 2.2, 0.4, RC_LB);
        rtQuad(b[0] + ux * 2.5, b[1] + uz * 2.5, b[0] - ux * 1.5 + uz * 2.2, b[1] - uz * 1.5 - ux * 2.2, 0.4, RC_LB);
        rtMark(a[0], a[1], 0.6, RC_LB);
      };
      if (SUP.draft) lbLine(SUP.draft[0], SUP.draft[1]);
      else if (SUP.lbA && G.mode === 'lb') rtMark(SUP.lbA[0], SUP.lbA[1], 0.7, RC_LB);
      for (const r of SUP.runs) if (r.s < r.cum[2] && !r.noMark) lbLine(r.a, r.b);
    }
  }
  rtGeo.setDrawRange(0, rtN);
  rtGeo.attributes.position.needsUpdate = true;
  rtGeo.attributes.color.needsUpdate = true;
}
