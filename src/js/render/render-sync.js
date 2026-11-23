/* ====================================================================================================
 * render/render-sync.js
 *
 * Sincronía de render
 *
 * sync(): coloca cada malla donde dice el estado del juego justo antes de pintar.
 * ================================================================================================== */

'use strict';

function sync(rdt) {
  const iconF = clamp((camS.zoom - 10.5) / 3, 0, 1),
    closeF = clamp((9 - camS.zoom) / 4, 0, 1);
  const ringS = 1 + Math.max(0, camS.zoom - 6) * 0.05,
    iconS = halfH() * 0.075;
  const adt = G.paused && G.started ? 0 : rdt * (G.started ? G.speed : 1);
  for (const u of units) {
    const r = u.m.root;
    r.position.set(u.x, u.elev || 0, u.z);
    if (u.m.wallB > 0.01) {
      r.position.x -= Math.sin(u.wall || r.rotation.y) * 0.24 * u.m.wallB;
      r.position.z -= Math.cos(u.wall || r.rotation.y) * 0.24 * u.m.wallB;
    }
    let df = u.face - r.rotation.y;
    df = Math.atan2(Math.sin(df), Math.cos(df));
    r.rotation.y += clamp(df * Math.min(1, adt * 6), -adt * 5.5, adt * 5.5);
    if (animDue(u, adt)) animRig(u, u._anD);
    if (u.pushup != null) pushupPose(u);
    r.visible =
      u.team === 'us' || !u.alive || u.spotted || CINE.on || MIS.id === 'attract' || !!u.dummy || !!u.showAlways;
    if (u.carriedBy) syncBody(u);
    if (u.m.tg) u.m.tg.rotation.x += ((u.alive ? 0 : -1.42) - u.m.tg.rotation.x) * Math.min(1, adt * 5);
    const vis = u.alive && !u.npc && (u.team === 'us' || u.spotted) && MIS.id !== 'attract' && !CINE.on,
      M = u.m;
    M.ring.visible = vis && u.team === 'us' && iconF < 0.95;
    M.ring.position.set(u.x, (u.elev || 0) + 0.03, u.z);
    M.ring.scale.setScalar(ringS);
    M.ring.material.opacity = (0.38 + 0.2 * closeF) * (1 - iconF * 0.8);
    if (M.sel) {
      M.sel.visible = G.sel.has(u) && u.alive && iconF < 0.95 && !CINE.on;
      M.sel.position.set(u.x, (u.elev || 0) + 0.035, u.z);
      M.sel.scale.setScalar(ringS * (1 + Math.sin(performance.now() / 260) * 0.025));
    }
    const kind = u.team === 'them' ? 'them' : !u.alive ? 'down' : G.sel.has(u) ? 'sel' : 'us';
    const inside = !!(u.alive && u.inB && u.inB.level === 'ground');
    M.icon.visible =
      MIS.id !== 'attract' &&
      !CINE.on &&
      !u.npc &&
      (iconF > 0.02 || inside) &&
      (u.team === 'us' ? u.alive || u.down : vis);
    if (M.icon.visible) {
      if (M.iconKind !== kind) {
        M.icon.material.map = ICONS[kind];
        M.icon.material.needsUpdate = true;
        M.iconKind = kind;
      }
      M.icon.material.opacity = Math.max(iconF, inside ? 0.9 : 0);
      M.icon.scale.set(iconS, iconS, 1);
      M.icon.position.set(u.x, (u.elev || 0) + (inside ? 2.4 : 1.6) + iconS * 0.5, u.z);
    }
    dkClock(u, M);
    M.mark.visible = false;
    if (u.down) {
      M.mark.visible = false;
      M.mark.position.y = 0.6 + Math.sin(G.t * 4) * 0.08;
    } else M.mark.position.y = u.stance === 'prone' ? 0.7 : u.stance === 'crouch' ? 1.25 : 1.55;
    if (u.team === 'them') {
      const g = G.ghosts.get(u),
        gh = M.ghost;
      gh.visible = false;
      if (gh.visible) {
        gh.position.set(g.x, 1.1 + Math.sin(G.t * 3) * 0.08, g.z);
        gh.rotation.y += rdt * 2;
        gh.material.opacity = 0.7 * (1 - (G.t - g.t) / 10);
        gh.scale.setScalar(ringS);
      }
    }
  }
  updCrew(adt);
  updStadCrew(adt);
  syncCivs(adt);
  objRing.visible = MIS.id !== 'attract' && !CINE.on && !MIS.noObjRing;
  objRing.material.color.setHex(MIS.objCol || 0xe7a63d);
  objRing.material.opacity = 0.45 + Math.sin(performance.now() / 300) * 0.25;
  updConvoySyms();
}
