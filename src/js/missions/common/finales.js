/* ====================================================================================================
 * missions/common/finales.js
 *
 * Solo para desarrollo: saltar directamente a la cinemática final de cada misión desde el briefing.
 * ================================================================================================== */

'use strict';

// versión de desarrollo: en el briefing, jugar solo la cinemática final de la misión
const FINALES = {
  hawl() {
    const C = G.m.conv;
    for (const e of them)
      if (e.alive && e.tag !== 'rpg') {
        e.alive = false;
        world.remove(e.m.root);
        dropOverlay(e);
      }
    C.go = false;
    C.s = C.limit = routeS(C, 256.5, HW_STOP[2]);
    convoyStep(C, 0);
    G.subsDone = [0, 1, 2];
    G.sub = 3;
    G.subStarted = false;
    renderSubs();
  },
  s61() {
    for (const e of them)
      if (e.alive) {
        e.alive = false;
        world.remove(e.m.root);
        dropOverlay(e);
      }
    const C = G.m.conv;
    if (C) {
      for (const v of C.veh) world.remove(v.g);
      C.veh = [];
    }
    for (const g of G.m.routes || []) overlay.remove(g);
    for (const r of [G.m.rb, G.m.rg]) if (r) overlay.remove(r);
    const put = (g, P_) =>
      gLive(g).forEach((u, i) => {
        const c = findWalk(P_.x + (i % 3) - 1, P_.z + ((i / 3) | 0));
        u.x = c[0] + 0.5;
        u.z = c[1] + 0.5;
        u.path = [];
        u.order = null;
        u.stance = 'crouch';
      });
    put(grpN(D_B), S61_BX);
    put(grpN('Romeo 4-1'), S61_GX);
    G.subsDone = [0, 1];
    G.sub = 2;
    G.subStarted = false;
    renderSubs();
    s61Star();
  }
};
FINALES.wolcott = () => {
  for (const e of them)
    if (e.alive) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  w4Clear();
  G.m.meds = w4MedSpecs().map((sp, k) => {
    const u = npcUnit(sp, W4_MED[k][0], W4_MED[k][1]);
    u.medSpot = W4_MED[k];
    u.atWreck = true;
    return u;
  });
  W4P.forEach(p =>
    gLive(grpN(p.g)).forEach((u, i) => {
      u.path = [];
      u.order = null;
      u.stance = 'crouch';
      if (p.roof) {
        const b = w4Bld(p);
        if (b) {
          placeInB(u, b, 'roof');
          return;
        }
      }
      const c = findWalk(p.x + (i % 3) - 1, p.z + ((i / 3) | 0));
      u.x = c[0] + 0.5;
      u.z = c[1] + 0.5;
    })
  );
  G.m.medHp = 100;
  G.m.medEnd = true;
  G.subsDone = [0, 1, 2];
  G.sub = 3;
  G.subStarted = false;
  renderSubs();
};
FINALES.convoy = () => {
  for (const e of them)
    if (e.alive) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  const C = G.m.conv;
  cvMountAll();
  C.s = C.limit = cvS(C, 1);
  C.go = false;
  convoyStep(C, 0);
  G.subsDone = [0, 1, 2, 3, 4];
  G.sub = 5;
  G.subStarted = false;
  renderSubs();
};
FINALES.perim = () => {
  if (G.m.pmG) dropGuide(G.m.pmG);
  G.m.pmG = null;
  pmNight();
  gLive(grpN(D_B)).forEach((u, i) => {
    const c = findWalk(
      PM_BLUE[PM_BLUE.length - 2][0] - 2 + (i % 3),
      PM_BLUE[PM_BLUE.length - 2][1] + 1 + ((i / 3) | 0)
    );
    u.x = c[0] + 0.5;
    u.z = c[1] + 0.5;
    goTo(u, S64.x + 6, S64.z);
  });
  G.subsDone = [0];
  G.sub = 1;
  G.subStarted = false;
  renderSubs();
};
// 8 · el mortero ha caído y las azoteas están marcadas: directo a la última resistencia y su final
FINALES.night = () => {
  for (const e of them)
    if (e.alive && !e.tech) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  G.m.mDone = true;
  G.m.irDone = [true, true];
  for (const r of G.m.zr || []) overlay.remove(r);
  G.m.zr = [];
  G.m.mzMap = null;
  G.subsDone = [0, 1];
  G.sub = 2;
  G.subStarted = false;
  renderSubs();
};
// 9 · todos en la multitud antes del estadio, con la columna por delante: la entrada andando, los heridos y el fundido
FINALES.mile = () => {
  for (const e of them)
    if (e.alive) {
      e.alive = false;
      world.remove(e.m.root);
      dropOverlay(e);
    }
  for (const S of G.m.str || []) m9StrGone(S);
  const C = G.m.C;
  G.m.phase = 'B';
  C.go = true;
  C.vmax = 3.0;
  C.s = C.limit = routeS(C, MILE_X, 104);
  C.limit = C.L;
  convoyStep(C, 0);
  const all = us.filter(u => u.alive && !u.gone);
  all.forEach((u, k) => {
    if (u.inB) leaveB(u);
    const c = findWalk(MILE_X - 1.4 + (k % 3) * 1.4, 124 + ((k / 3) | 0) * 1.3);
    u.x = c[0] + 0.5;
    u.z = c[1] + 0.5;
    u.path = [];
    u.order = null;
    u.stance = 'stand';
    u.m8in = false;
  });
  G.m.fol = (G.m.fol || []).concat(G.m.r41 || []);
  camS.tx = MILE_X;
  camS.tz = 118;
  G.subsDone = [0];
  G.sub = 1;
  G.subStarted = false;
  renderSubs();
  m9FinalCine();
};
FINALES.s64 = () => {
  if (!G.m.dg) return;
  for (const u of gLive(G.m.dg)) damage(u, 9999, null);
};
function playFinale() {
  const f = FINALES[MIS.id];
  if (!f) return;
  startMission();
  if (CINE.on) cineSkip();
  if (FLIGHT.on) return;
  clearChat();
  sched = sched.filter(s => !s.say);
  G.autoP = false;
  f();
  G.paused = false;
  updPause();
}
$('bFinale').onclick = () => playFinale();
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (SCREEN === 'scrTitle') {
    e.preventDefault();
    leaveTitle();
    return;
  }
  if (SCREEN === 'scrIntro') {
    e.preventDefault();
    stopIntro();
    return;
  }
  if (SCREEN === 'scrPause' && k === 'escape') {
    resumeGame();
    return;
  }
  if (!G || !G.started || MIS.id === 'attract' || SCREEN) return;
  if (CINE.on) {
    if (k === ' ') {
      e.preventDefault();
      $('bPause').click();
    } else if (k === 'escape') pauseMenu();
    return;
  }
  if (k === 'escape' && !(G.mode !== 'move' || !$('ctx').hidden || !$('mapPanel').hidden)) {
    pauseMenu();
    return;
  }
  if (k === 'escape' && !$('mapPanel').hidden) {
    openMap(false);
    return;
  }
  if (k === ' ') {
    e.preventDefault();
    $('bPause').click();
  } else if (k === 'q') $('cRotL').click();
  else if (k === 'e') $('cRotR').click();
  else if (k === 't') selectAll();
  else if (k === 'h') cmdTreat();
  else if (k === 'm') $('oChain').click();
  else if (k === 'g') formMenu();
  else if (k === 'a') $('oAtk').click();
  else if (k === 's') $('oSup').click();
  else if (k === 'c') $('oCov').click();
  else if (k === 'x') cmdStop();
  else if (k === 'l') $('oLB').click();
  else if (k === 'f') $('oFlr').click();
  else if (k === 'v') $('oNV').click();
  else if (k === 'escape') {
    closeCtx();
    setMode('move');
  } else if (k === 'n') openMap($('mapPanel').hidden);
  else if (k >= '1' && k <= '9' && IRN.groups) {
    const g = IRN.groups[+k - 1];
    if (g) {
      const live = g.members.filter(u => u.alive);
      if (live.length) {
        G.sel = new Set(live);
        refreshCards();
      }
    }
  } else if (k >= '1' && k <= '6') {
    const u = us[+k - 1];
    if (u && u.alive) {
      if (e.shiftKey) G.sel.add(u);
      else {
        G.sel.clear();
        G.sel.add(u);
      }
      refreshCards();
    }
  } else if (k === 'arrowleft') pan(60, 0);
  else if (k === 'arrowright') pan(-60, 0);
  else if (k === 'arrowup') pan(0, 60);
  else if (k === 'arrowdown') pan(0, -60);
});
