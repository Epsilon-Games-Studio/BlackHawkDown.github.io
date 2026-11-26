/* ====================================================================================================
 * missions/tutorial/guide.js
 *
 * Guía del tutorial: una flecha azul sobre el botón que hay que pulsar (que parpadea) o sobre el sitio que hay que tocar
 * ================================================================================================== */

let TUT_EL = null,
  TUT_ARROW = null;
const _tv = new T.Vector3();
function tutGuide() {
  if (!TUT_ARROW) {
    TUT_ARROW = document.createElement('div');
    TUT_ARROW.id = 'tutArrow';
    TUT_ARROW.setAttribute('aria-hidden', 'true');
    TUT_ARROW.innerHTML =
      '<svg viewBox="0 0 34 42" width="34" height="42"><path d="M10 1h14v20h9L17 41 1 21h9z" fill="#3b8bff" stroke="#0b1d33" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(TUT_ARROW);
  }
  let el = null,
    wp = null;
  const on =
    MIS.id === 'tutorial' && G && G.started && !G.over && !CINE.on && !document.body.classList.contains('menuopen');
  if (on) {
    const P = tutPlayers(),
      all = P.length && P.every(u => G.sel.has(u)),
      k = G.sub,
      one = G.sel.size === 1 && P.some(u => G.sel.has(u));
    const at = (u, v) => {
        const p = tzW(u, v);
        return [p.x, 0.2, p.z];
      },
      onU = u => (u ? [u.x, (u.elev || 0) + 2, u.z] : null);
    if (k === 0) {
      if (!all) wp = onU(P[0]);
      else if (!G.m.allMove) wp = at(...TZ_START);
    } else if (k === 1) {
      if (!all) wp = onU(P[0]);
      else if (!G.m.covUsed) el = 'oCov';
    } else if (k === 2) {
      if (!one) wp = onU(P.find(u => !u.inB) || P[0]);
      else wp = [tzW(TZ_BLD.u, TZ_BLD.v).x, TZ_BLD.top + 0.4, tzW(TZ_BLD.u, TZ_BLD.v).z];
    } else if (k === 3) {
      if (!G.sel.size) wp = onU(P[0]);
      else if (G.mode !== 'suppress' && !(G.m.supT > 0)) el = 'oSup';
      else if (G.mode === 'suppress') wp = at(-35.5, 32);
    } else if (k === 4) {
      if (!one) wp = onU(P.filter(u => !u.inB && !(u.soloT >= G.m.soloStart)).sort((a, b) => b.x - a.x)[0]);
      else wp = at(...TZ_FWD);
    } else if (k === 5) {
      if (!G.sel.size) wp = onU(P[0]);
      else if (!G.m.chainOK) {
        const S = P.filter(u => G.sel.has(u)),
          n = Math.max(0, ...S.map(u => (u.path.length ? u.tzMv || 0 : 0)));
        wp = at(...TZ_CHAIN[Math.min(2, n)]);
      }
    } else if (k === 6) {
      if (!G.sel.size) wp = onU(P[0]);
      else if (G.mode !== 'attack') el = 'oAtk';
      else {
        const t = (G.m.tg || []).find(e => e.alive);
        if (t) wp = [t.x, 1.9, t.z];
      }
    }
  }
  const E = el ? $(el) : null;
  if (TUT_EL && TUT_EL !== E) TUT_EL.classList.remove('tut-blink');
  TUT_EL = E;
  if (E) E.classList.add('tut-blink');
  let x = null,
    y = null;
  if (E) {
    const r = E.getBoundingClientRect();
    if (r.width > 0) {
      x = r.left + r.width / 2;
      y = r.top - 6;
    }
  } else if (wp) {
    _tv.set(wp[0], wp[1], wp[2]).project(cam);
    if (_tv.z < 1) {
      x = ((_tv.x + 1) / 2) * innerWidth;
      y = ((1 - _tv.y) / 2) * innerHeight;
    }
  }
  if (x == null) {
    TUT_ARROW.style.display = 'none';
    return;
  }
  TUT_ARROW.style.display = 'block';
  TUT_ARROW.style.left = x + 'px';
  TUT_ARROW.style.top = y + 'px';
}
const tutPlayers = () => us.filter(u => u.alive && !u.npc);
function tutSgt(t) {
  const s = G.m.sgt;
  if (s) {
    s.talkT = 2.4;
    radio(s, t, true);
  }
}
function tzSay(u, t) {
  if (u) {
    u.talkT = 2.4;
    radio(u, t, true);
  }
}
