/* ====================================================================================================
 * missions/common/mission-flow.js
 *
 * El motor de las misiones, común a todas: el jefe del grupo (leader), los puntos de control
 * (guardar y volver al último), el avance de subobjetivos (updMission), la lista de objetivos del HUD,
 * la pausa automática y el final de la misión con su resumen.
 *
 * Cómo funciona una misión: MISSIONS.<id> tiene una lista de subs (subobjetivos). Cada sub puede tener
 * start() (al empezar), tick() (cada paso), count() (el contador del HUD), done() (cuando se cumple),
 * onDone() (al cumplirse), zone (el anillo en el suelo), tip (consejo) y radio (la frase al cumplirlo).
 * Cuando se cumple el último, la misión termina tras endDelay segundos.
 * ================================================================================================== */

function leader() {
  return us.find(u => u.alive);
}
// la fuerza y los valores simples de la misión, guardados en memoria
function cpSave(say) {
  if (!G || !G.started || G.over || MIS.id === 'attract' || MIS.id === 'tutorial') return;
  const keep = {};
  for (const k in G.m) {
    const v = G.m[k];
    if (v == null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') keep[k] = v;
  }
  G.cp = {
    mis: MIS.id,
    t: G.t,
    sub: G.sub,
    subsDone: G.subsDone.slice(),
    downs: G.downs,
    m: keep,
    men: us
      .filter(u => !u.npc)
      .map(u => ({
        u,
        x: u.x,
        z: u.z,
        hp: Math.max(u.hp, u.down ? 35 : 0),
        down: u.down,
        kia: !!u.kia,
        mounted: u.mounted,
        alive: u.alive,
        fat: u.fat,
        stance: u.stance,
        inB: u.inB ? { b: u.inB.b, level: u.inB.level } : null
      }))
  };
  G.cpT = G.t;
  if (say) {
    logMsg(L('Punto de control guardado'), 'us');
    cpToast();
  }
}
function cpToast() {
  const el = $('cpToast');
  if (!el) return;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
function cpTick() {
  if (!G || !G.started || G.over || CINE.on || FLIGHT.on) return;
  if (G.cpT == null) {
    if (G.t > 2) cpSave(false);
    return;
  }
  const pl = us.filter(u => !u.npc);
  if (
    G.t - G.cpT > 120 &&
    pl.every(u => !u.down && !u.pinned && (!u.alive || u.hp > 45)) &&
    !pl.some(u => u.alive && u.sup > 30)
  )
    cpSave(true);
}
function cpRestore() {
  const C = G.cp;
  if (!C || C.mis !== MIS.id) return false;
  showScreen(null);
  G.over = false;
  G.endAt = null;
  G.paused = true;
  sched = sched.filter(e => !/endGame/.test(String(e.fn)));
  Object.assign(G.m, C.m);
  G.sub = C.sub;
  G.subsDone = C.subsDone.slice();
  G.subStarted = true;
  for (const u of us) {
    if (u.carrying) u.carrying = null;
    u.carriedBy = null;
    u.fetcher = null;
    u.kdT = 0;
    u.bleedT = 0;
    u.bleedOut = false;
    u.dkT = 0;
  }
  G.bodies = (G.bodies || []).filter(b => C.men.some(r => r.u === b && r.kia));
  for (const r of C.men) {
    const u = r.u;
    if (u.mounted || r.mounted) {
      u.hp = Math.max(u.hp, r.hp);
      continue;
    }
    if (r.kia) {
      u.kia = true;
      u.alive = false;
      u.down = false;
      continue;
    }
    u.kia = false;
    u.down = false;
    u.alive = true;
    u.hp = Math.max(r.hp, 35);
    u.reviveT = 0;
    u.sup = 0;
    u.pinned = false;
    u.path = [];
    u.order = null;
    u.fat = Math.max(60, r.fat || 100);
    u.spent = false;
    u.vx = u.vz = 0;
    u.deathT = null;
    u.stance = r.stance === 'prone' ? 'crouch' : r.stance || 'crouch';
    if (u.inB) leaveB(u);
    if (r.inB && BLDS[r.inB.b]) placeInB(u, BLDS[r.inB.b], r.inB.level);
    else {
      u.x = r.x;
      u.z = r.z;
    }
    if (!units.includes(u)) units.push(u);
    if (u.m && u.m.root && !u.m.root.parent) world.add(u.m.root);
  }
  // a los que se les echaron encima se les hace retroceder: nadie lo bastante cerca para rematarlos antes de que se recompongan
  for (const e of them) {
    if (!e.alive || e.tech) continue;
    if (us.some(u => u.alive && Math.hypot(u.x - e.x, u.z - e.z) < 13)) {
      e.alive = false;
      e.hp = 0;
      if (e.m) world.remove(e.m.root);
      dropOverlay(e);
    }
  }
  G.sel = new Set();
  updPause();
  refreshCards();
  renderSubs();
  hint('Punto de control: la misión sigue desde aquí. Da órdenes y reanuda con Espacio.');
  cpToast();
  return true;
}
function updMission() {
  const s = MIS.subs[G.sub];
  if (!s || G.over || (CINE.on && CINE.block)) return;
  if (!G.subStarted && s.tip && G.sub === 0) hint(s.tip);
  if (!G.subStarted) {
    G.subStarted = true;
    if (s.start) s.start();
    objRing.position.set(s.zone.x, 0.08, s.zone.z);
    objRing.scale.setScalar(s.zone.r / OBJ.r);
    if (G.sub > 0) {
      logMsg('Nuevo objetivo: ' + s.text, 'us');
      autoPause('nuevo objetivo');
    }
    renderSubs();
  }
  if (s.tick) s.tick();
  if (s.done()) {
    G.subsDone.push(G.sub);
    if (s.onDone) s.onDone();
    radio(leader(), s.radio);
    G.sub++;
    G.subStarted = false;
    renderSubs();
    if (G.sub < MIS.subs.length) cpSave(true);
    if (G.sub >= MIS.subs.length) G.endAt = G.t + (MIS.endDelay || 1.5);
    else if (MIS.subs[G.sub].tip) hint(MIS.subs[G.sub].tip);
  }
}
const lowFirst = t => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
function renderSubs() {
  const el = $('subs');
  if (!el || !G) return;
  const items = [];
  if (G.sub > 0) items.push(`<li class="done">${L(MIS.subs[G.sub - 1].text)}</li>`);
  const s = MIS.subs[G.sub];
  if (s) {
    const c = s.count && G.subStarted ? s.count() : null;
    items.push(`<li>${L(s.text)}${c ? ` <em>${typeof c === 'string' ? L(c) : c[0] + '/' + c[1]}</em>` : ''}</li>`);
  }
  items.push(`<li class="opt${G.downs ? ' fail' : ''}">${L('Opcional')}: ${lowFirst(L('Que nadie caiga'))}</li>`);
  for (const o of MIS.opt || [])
    items.push(`<li class="opt${o.ok() ? '' : ' fail'}">${L('Opcional')}: ${lowFirst(L(o.text))}</li>`);
  const html = items.join('');
  if (el.innerHTML !== html) el.innerHTML = html;
}
function autoPause(why) {
  if (CINE.on) return;
  if (!G || !G.autoP || G.paused || G.over || !G.started || G.t - G.lastAuto < 4) return;
  G.lastAuto = G.t;
  G.paused = true;
  updPause();
  hint('Pausa automática: ' + why + '. Da órdenes y reanuda con Espacio');
}
function checkEnd() {
  const pl = us.filter(u => !u.npc);
  if (G.over || G.noLose || !pl.length || CINE.on) return;
  if (IRN.groups)
    for (const g of IRN.groups) {
      const m = g.members.filter(u => !u.npc && !u.medevac);
      if (m.length && !m.some(u => u.alive || u.mounted)) {
        endGame(false, L(g.name) + ' ' + L('ha caído'));
        return;
      }
    }
  if (!pl.some(u => u.alive || u.mounted)) endGame(false, L('Toda la fuerza ha caído'));
}
function endGame(win, why) {
  if (G.over) return;
  G.over = true;
  G.paused = true;
  closeCtx();
  openMap(false);
  const secs = Math.floor(G.t),
    mm = Math.floor(secs / 60),
    ss = secs % 60;
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  // los objetivos tal como se leían durante la partida: cumplidos, fallado el que estaba en curso al acabar, o sin alcanzar
  const mains = MIS.subs
    .map(
      (s, k) =>
        `<li class="${G.subsDone.includes(k) ? 'ok' : k === G.sub ? 'no' : 'na'}"><span>${esc(L(s.text))}</span><em>${L(G.subsDone.includes(k) ? 'Conseguido' : k === G.sub ? 'No conseguido' : 'Sin alcanzar')}</em></li>`
    )
    .join('');
  const opts = [{ text: 'Que nadie caiga', ok: () => !G.downs }]
    .concat(MIS.opt || [])
    .map(o => {
      const ok = win && o.ok();
      return `<li class="${ok ? 'ok' : 'no'}"><span>${esc(L(o.text))}</span><em>${L(ok ? 'Conseguido' : 'No conseguido')}</em></li>`;
    })
    .join('');
  const all = us;
  const wounded = all.filter(u => !u.mounted && u.hp < u.hp0).length;
  $('endScr').innerHTML = `
    <span class="date">${MIS.date || '3 OCT 1993'} · ${fmtClock()} · ${L('Tiempo de misión')} ${mm}:${String(ss).padStart(2, '0')}</span>
    <span class="eyebrow">${MIS.n > 0 ? L('Misión') + ' ' + MIS.n : L('Instrucción')}</span>
    <b class="endname">${esc(L(MIS.title))}</b>
    <h1 class="${win ? 'win' : 'lose'}">${L(win ? 'Objetivo cumplido' : 'Objetivo no cumplido')}</h1>${!win && why ? `<b class="why">${esc(why)}</b>` : ''}
    <p>${esc(L(MIS.summary || ''))}</p>
    <div class="objs"><span class="picklabel">${L('Objetivos principales')}</span><ul>${mains}</ul></div>
    <div class="objs"><span class="picklabel">${L('Objetivos secundarios')}</span><ul>${opts}</ul></div>
    <div class="stats"><span>${L('Milicianos abatidos')}</span><b>${G.kills}</b><span>${L('Veces que cayó alguien')}</span><b>${G.downs}</b><span>${L('Muertos')}</span><b>${G.kia || 0}</b><span>${L('Heridos al final')}</span><b>${wounded}</b><span>${L('Cartuchos disparados')}</span><b>${G.fired}</b></div>
    <div class="gorow">${win && nextMission() ? `<button class="go" id="eNext">${L('Siguiente misión')}</button>` : ''}${!win && G.cp && G.cp.mis === MIS.id ? `<button class="go" id="eCp">${L('Volver al punto de control')}</button>` : ''}<button class="${(win && nextMission()) || (!win && G.cp && G.cp.mis === MIS.id) ? '' : 'go'}" id="eRetry">${L('Repetir misión')}</button><button id="eMenu">${L('Menú principal')}</button></div>`;
  if (win) {
    const ol = [{ ok: () => !G.downs }].concat(MIS.opt || []);
    markDone(MIS.id, {
      opt: ol.filter(o => {
        try {
          return o.ok();
        } catch (e) {
          return false;
        }
      }).length,
      of: ol.length,
      secs,
      downs: G.downs
    });
  }
  showScreen('endScr');
  const n = $('eNext');
  if (n) n.onclick = () => openMission(nextMission());
  $('eRetry').onclick = () => openMission(MIS.id, true);
  const cpb = $('eCp');
  if (cpb) cpb.onclick = () => cpRestore();
  $('eMenu').onclick = () => goMenu();
}
