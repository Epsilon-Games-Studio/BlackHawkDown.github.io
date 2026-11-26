/* ====================================================================================================
 * sim/formations.js
 *
 * Formaciones: el de punta recorre la ruta y el resto guarda su sitio a su alrededor, mirando hacia donde va él.
 * El grupo mantiene la formación hasta que se separa, se manda a cubierto o caen hombres heridos o agotados; cuando se les vuelve a mandar
 * juntos, la recuperan. Los sitios van en celdas del mapa, x a la derecha del de punta y z por delante de él
 * ================================================================================================== */

const FORM_SP = 1.55,
  FORM_N = { col: 'Columna', wedge: 'Punta de flecha', stag: 'Columna escalonada', ech: 'Escalón izquierda' };
let FORMS = [];
function formSlot(type, k) {
  const s = FORM_SP;
  if (type === 'col') return [0, -k * s];
  if (type === 'stag') return [(k % 2 ? 1 : -1) * 0.7 * s, -k * 0.85 * s];
  if (type === 'wedge') {
    const r = Math.ceil(k / 2);
    return [(k % 2 ? -1 : 1) * r * 0.95 * s, -r * 0.95 * s];
  }
  return [-k * 0.8 * s, -k * 0.8 * s]; // escalón a la izquierda: cada uno detrás y a la izquierda del anterior
}
const formAble = u => u.alive && !u.spent && !u.npc;
function formOf(sel) {
  if (sel.length < 2) return null;
  const F = sel[0].fg;
  if (!F || sel.some(u => u.fg !== F)) return null;
  return F.m.filter(formAble).every(u => sel.includes(u)) ? F : null;
}
function formOfSel() {
  const sel = alive();
  return sel.length && sel.every(u => u.fg === sel[0].fg) ? sel[0].fg : null;
}
function setFormation(type) {
  const sel = alive().filter(u => !u.npc);
  if (sel.length < 2) {
    hint('Selecciona una unidad de dos o más soldados');
    return;
  }
  for (const u of sel)
    if (u.fg) {
      u.fg.m = u.fg.m.filter(o => !sel.includes(o));
    }
  FORMS = FORMS.filter(F => F.m.length > 1);
  const F = { type, m: sel.slice(), hd: null, active: false, lead: null, goal: null };
  FORMS.push(F);
  sigGo(sel[0], ['rally', 'pair'], 1.6); // reagruparse en la nueva formación
  for (const u of sel) {
    u.fg = F;
    u.fgOff = false;
  }
  updFormIco();
  hint('Formación: ' + L(FORM_N[type]) + '. La mantendrán en cada ruta que les des juntos');
  if (G.started)
    radio(
      sel[0],
      pick(['En ' + L(FORM_N[type]).toLowerCase() + '.', 'Formación, ' + L(FORM_N[type]).toLowerCase() + '.'])
    );
}
// cada unidad conserva su formación: empieza en columna escalonada, y el botón enseña la de lo que esté seleccionado
function formDefaults(groups) {
  for (const g of groups) {
    const live = g.filter(u => !u.npc);
    if (live.length < 2 || live.some(u => u.fg)) continue;
    const F = { type: 'stag', m: live.slice(), hd: null, active: false, lead: null, goal: null };
    FORMS.push(F);
    for (const u of live) u.fg = F;
  }
}
function updFormIco() {
  const F = formOfSel(),
    b = $('oForm');
  if (!b) return;
  const o = document.querySelector('#formMenu .fopt[data-f="' + (F ? F.type : 'stag') + '"] svg');
  $('oFormIco').innerHTML = o.innerHTML;
  b.classList.toggle('off', !F);
  const t = F ? L('Formación') + ': ' + L(FORM_N[F.type]) : L('Formación');
  b.title = t;
  b.setAttribute('aria-label', t);
}
function formLeader(F) {
  return F.m.find(u => formAble(u) && !u.fgOff && !u.inB) || null;
}
function formHolding(F) {
  return F.active && F.lead && F.lead.alive && F.lead.path.length > 0;
}
// la punta la toma el que ya va más adelantado hacia el destino: así nadie tiene que volver atrás para ponerse detrás de él
function formFront(F, ci, cj) {
  const c = F.m.filter(u => formAble(u) && !u.fgOff);
  if (!c.length) return null;
  const n = c.length,
    mx = c.reduce((a, u) => a + u.x, 0) / n,
    mz = c.reduce((a, u) => a + u.z, 0) / n,
    dx = ci + 0.5 - mx,
    dz = cj + 0.5 - mz,
    L = Math.hypot(dx, dz) || 1;
  const cur = formLeader(F);
  let best = cur,
    bv = -1e9;
  for (const u of c) {
    // avance hacia el destino; el jefe de siempre tiene un poco de ventaja para no cambiar de punta por nada
    const v = ((u.x - mx) * dx + (u.z - mz) * dz) / L + (u === cur ? 1.2 : 0);
    if (v > bv) {
      bv = v;
      best = u;
    }
  }
  return best;
}
// rumbo al final de la ruta del de punta: con él se colocan los demás al llegar
function formEndHd(F) {
  const L_ = F.lead,
    P = L_ && L_.path;
  if (!P || !P.length) return F.hd || 0;
  const b = P[P.length - 1],
    a = P.length > 1 ? [P[P.length - 2][0] + 0.5, P[P.length - 2][1] + 0.5] : [L_.x, L_.z];
  const dx = b[0] + 0.5 - a[0],
    dz = b[1] + 0.5 - a[1];
  return dx * dx + dz * dz > 1e-4 ? Math.atan2(dx, dz) : F.hd || 0;
}
function formMove(F, ci, cj, append) {
  const L_ = append && F.active && F.lead && formAble(F.lead) ? F.lead : formFront(F, ci, cj);
  if (!L_) return;
  if (L_ !== F.m[0] && F.m.includes(L_)) F.m = [L_].concat(F.m.filter(u => u !== L_)); // el de punta va el primero: los demás, en su orden, detrás
  for (const u of F.m) u.fgOff = false;
  if (L_.inB) leaveB(L_);
  const last = append && F.active && L_.path.length ? L_.path[L_.path.length - 1] : null;
  const seg = last
    ? smoothPath(findPath(last[0], last[1], ci, cj), last[0] + 0.5, last[1] + 0.5)
    : smoothPath(findPath(Math.floor(L_.x), Math.floor(L_.z), ci, cj), L_.x, L_.z);
  L_.chainN = last ? (L_.chainN || 1) + 1 : 1;
  if (MIS.id === 'tutorial') L_.tzMv = (L_.tzMv || 0) + 1;
  L_.order = { type: 'move' };
  L_.path = last ? L_.path.concat(seg || []) : seg || [];
  L_.stance = 'stand';
  L_.routeCol = null;
  sigGo(L_, ['point', 'advance', 'pair', 'go'], 1.4);
  if (!last) {
    const p0 = L_.path[0] || [ci, cj];
    F.hd = Math.atan2(p0[0] + 0.5 - L_.x, p0[1] + 0.5 - L_.z);
  }
  F.active = true;
  F.lead = L_;
  F.goal = [ci + 0.5, cj + 0.5];
  F.endHd = formEndHd(F);
  let k = 0;
  for (const u of F.m) {
    if (u === L_ || !u.alive) continue;
    k++;
    if (u.inB) leaveB(u);
    u.chainN = L_.chainN;
    if (MIS.id === 'tutorial') u.tzMv = (u.tzMv || 0) + 1;
    u.order = { type: 'move', form: F, kneel: k % 2 === 1 };
    u.fT = k * 0.05;
    u.fCell = null;
    u.stance = 'stand';
    u.routeCol = null;
  }
  if (F.m.filter(u => u.alive).length >= us.filter(u => u.alive && !u.npc).length) G.m.allMove = true;
  moveMark.position.set(ci + 0.5, 0.06, cj + 0.5);
  moveMark.material.opacity = 1;
  moveMark.material.color.set(0x7fb8ff);
}
function formStep(dt) {
  for (const F of FORMS) {
    for (const u of F.m) u.fgMul = 1;
    if (!F.active) continue;
    let L_ = F.lead;
    if (!L_ || !formAble(L_) || L_.fgOff) {
      // el de punta ha caído o no está: el siguiente toma la punta y el resto de la ruta
      const N = formLeader(F);
      if (!N) {
        F.active = false;
        continue;
      }
      const rest = L_ && L_.path.length ? L_.path.slice() : null;
      F.lead = L_ = N;
      if (rest && rest.length) {
        const g = rest[rest.length - 1];
        L_.path = smoothPath(findPath(Math.floor(L_.x), Math.floor(L_.z), g[0], g[1]), L_.x, L_.z);
        L_.order = { type: 'move' };
      }
      F.endHd = formEndHd(F);
    }
    const moving = L_.path.length > 0;
    if (moving) {
      const p = L_.path[Math.min(1, L_.path.length - 1)],
        want = Math.atan2(p[0] + 0.5 - L_.x, p[1] + 0.5 - L_.z);
      if (F.hd == null) F.hd = want;
      else {
        let d = want - F.hd;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        F.hd += d * Math.min(1, dt * 2.2);
      }
    }
    const bx = moving ? L_.x : F.goal[0],
      bz = moving ? L_.z : F.goal[1],
      h = moving ? F.hd || 0 : F.endHd != null ? F.endHd : F.hd || 0,
      fx = Math.sin(h),
      fz = Math.cos(h),
      rx = -Math.cos(h),
      rz = Math.sin(h);
    const taken = new Set([idx(Math.floor(bx), Math.floor(bz))]);
    let k = 0,
      any = false,
      lag = 0;
    for (const u of F.m) {
      if (u === L_ || !u.alive) continue;
      k++;
      if (!u.order || u.order.form !== F) continue; // tiene otra orden: fuera de la formación por ahora
      any = true;
      if (u.spent || u.pinned || u.inB) {
        continue;
      } // agotado o clavado: se queda donde está y vuelve cuando pueda
      const [sx, sz] = formSlot(F.type, k);
      let tx = bx + rx * sx + fx * sz,
        tz = bz + rz * sx + fz * sz;
      // cuánto va por delante de su sitio, en el sentido de la marcha: si va adelantado no da media vuelta,
      // sigue por su carril sin avanzar más y deja que la formación le alcance
      const ahead = moving ? (u.x - tx) * fx + (u.z - tz) * fz : 0;
      if (ahead > 0.6) {
        tx += fx * ahead;
        tz += fz * ahead;
      }
      {
        const d = Math.hypot(tx - u.x, tz - u.z);
        lag = Math.max(lag, d);
        u.fgMul = d > 1.2 ? 1.25 : 1;
      } // por detrás de su sitio: se da prisa
      u.fT -= dt;
      if (u.fT > 0) continue;
      u.fT = moving ? 0.45 : 9;
      let c = nearestFree(Math.floor(tx), Math.floor(tz));
      if (taken.has(idx(c[0], c[1]))) {
        for (const [dx, dz] of DIRS) {
          const q = [c[0] + dx, c[1] + dz];
          if (walk(q[0], q[1]) && !taken.has(idx(q[0], q[1]))) {
            c = q;
            break;
          }
        }
      }
      taken.add(idx(c[0], c[1]));
      if (u.fCell && u.fCell[0] === c[0] && u.fCell[1] === c[1] && u.path.length) continue;
      u.fCell = c;
      u.path = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z) || [];
      if (!u.path.length && !moving) arrive(u);
    }
    if (moving) L_.fgMul = lag > 3 ? 0.5 : lag > 1.8 ? 0.75 : 1; // el de punta afloja hasta que los demás están en su sitio
    if (!moving && !any) F.active = false;
  }
}
// dónde acabará cada uno cuando el de punta llegue al final de su ruta (para pintar su círculo de destino)
function formFinalSlots(F) {
  const out = new Map();
  if (!F.active || !F.lead || !F.goal) return out;
  const P = F.lead.path,
    g = P.length ? [P[P.length - 1][0] + 0.5, P[P.length - 1][1] + 0.5] : F.goal,
    h = F.lead.path.length ? formEndHd(F) : F.endHd != null ? F.endHd : F.hd || 0,
    fx = Math.sin(h),
    fz = Math.cos(h),
    rx = -Math.cos(h),
    rz = Math.sin(h),
    taken = new Set([idx(Math.floor(g[0]), Math.floor(g[1]))]);
  let k = 0;
  for (const u of F.m) {
    if (u === F.lead || !u.alive) continue;
    k++;
    if (!u.order || u.order.form !== F) continue;
    const [sx, sz] = formSlot(F.type, k);
    let c = nearestFree(Math.floor(g[0] + rx * sx + fx * sz), Math.floor(g[1] + rz * sx + fz * sz));
    if (taken.has(idx(c[0], c[1])))
      for (const [dx, dz] of DIRS) {
        const q = [c[0] + dx, c[1] + dz];
        if (walk(q[0], q[1]) && !taken.has(idx(q[0], q[1]))) {
          c = q;
          break;
        }
      }
    taken.add(idx(c[0], c[1]));
    out.set(u, [c[0] + 0.5, c[1] + 0.5]);
  }
  return out;
}
function cmdAttack(e) {
  for (const u of alive()) {
    u.order = { type: 'attack', target: e, rT: 0 };
    u.path = [];
  }
  sigGo(alive()[0], ['enemy', 'point'], 1.2); // señala el objetivo antes de abrir fuego
  radio(alive()[0], pick(['Fuego sobre el objetivo.', '¡Abrid fuego!', 'Lo tengo, disparando.']));
}
function cmdSuppress(x, z) {
  G.m.supUsed = true;
  for (const u of alive()) {
    u.order = { type: 'suppress', x, z, until: G.t + 12 };
    u.path = [];
    if (u.stance === 'stand') u.stance = 'crouch';
  }
  supMark.position.set(x, 0.06, z);
  supMark.material.opacity = 0.9;
  sigGo(alive()[0], ['point', 'go'], 1.2);
  radio(alive()[0], pick(['¡Fuego de supresión!', 'Mantened sus cabezas abajo.', 'Barred esa posición.']));
}
function cmdCover() {
  G.m.covUsed = true;
  for (const u of alive()) if (u.fg) u.fg.active = false; // a cubierto: la formación se deshace hasta que se les vuelva a mandar juntos
  const sel = alive();
  if (sel[0]) {
    sigGo(sel[0], ['down', 'down', 'cover'], 1.2);
  }
  const taken = new Set(
    units.filter(u => u.alive && u.team === 'us' && !G.sel.has(u)).map(u => idx(Math.floor(u.x), Math.floor(u.z)))
  );
  for (const u of sel) {
    if (u.inB) continue;
    const thr = nearestThreat(u);
    const c = findCover(Math.floor(u.x), Math.floor(u.z), thr, 6, taken);
    if (c) {
      taken.add(idx(c[0], c[1]));
      u.path = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z);
    } else u.path = [];
    u.order = { type: 'cover' };
    if (!u.path.length) {
      u.stance = 'crouch';
    }
  }
  radio(sel[0], pick(['¡A cubierto!', '¡Buscad cobertura!', '¡Cubríos, cubríos!']));
}
function cmdStop() {
  sigGo(alive()[0], ['fist', 'halt'], 1.3); // ¡alto!
  for (const u of alive()) {
    u.path = [];
    u.order = null;
    if (u.fg) u.fg.active = false;
  }
}
/* Atender a los heridos lo decide el jugador: los seleccionados se paran, el sanitario (o el que esté más cerca) va a por cada
   caído y lo levanta, y luego el sanitario cura a los heridos que pueden andar; sin sanitario, cada uno se venda sus heridas.
   El resto se agacha y vigila. Termina solo cuando todos están atendidos. */
const TREAT_R = 18;
let treatN = 0;
function cmdTreat() {
  const sel = alive().filter(u => !u.npc);
  if (!sel.length) {
    hint('Selecciona primero a un pelotón');
    return;
  }
  const id = ++treatN;
  for (const u of sel) {
    if (u.inB) leaveB(u);
    u.order = { type: 'treat', id, until: G.t + 75, rT: 0, pat: null };
    u.path = [];
    if (u.stance === 'stand') u.stance = 'crouch';
  }
  G.m.medUsed = true;
  sigGo(sel.find(u => u.medic) || sel[0], ['come', 'rally'], 1.4);
  hint('');
  const cx = sel.reduce((a, u) => a + u.x, 0) / sel.length,
    cz = sel.reduce((a, u) => a + u.z, 0) / sel.length;
  const nDown = us.filter(u => u.down && Math.hypot(u.x - cx, u.z - cz) < TREAT_R).length,
    med = sel.find(u => u.medic);
  radio(
    med || sel[0],
    nDown
      ? pick([
          '¡Sanitario! ¡Cubridnos, vamos a por los heridos!',
          '¡Atended a los heridos! ¡Perímetro!',
          '¡Vamos a por él, cubridme!'
        ])
      : pick([
          'Vendaos, rápido. Ojos abiertos.',
          'Revisad las heridas. Seguridad alrededor.',
          'Aprovechad para atender a los heridos.'
        ])
  );
  $('oMed').setAttribute('aria-pressed', 'true');
}
function treatOrders(dt) {
  const groups = new Map();
  for (const u of us)
    if (u.alive && u.order && u.order.type === 'treat') {
      const k = u.order.id;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(u);
    }
  for (const [, g] of groups) {
    const cx = g.reduce((a, u) => a + u.x, 0) / g.length,
      cz = g.reduce((a, u) => a + u.z, 0) / g.length;
    const downs = us
      .filter(u => u.down && Math.hypot(u.x - cx, u.z - cz) < TREAT_R && !(u.noReach > G.t))
      .sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    const meds = g.filter(u => u.medic);
    const hurt = g.filter(u => u.hp < (meds.length ? 85 : 60) && !(meds.length === 1 && u === meds[0] && u.hp >= 70));
    for (const u of g) u.order.pat = null;
    // primero los caídos: el sanitario coge al más cercano y a cada uno de los demás le va el hombre libre más cercano
    const free = g.slice();
    for (const d of downs) {
      if (!free.length) break;
      free.sort((a, b) => dist(a, d) - (a.medic ? 6 : 0) - (dist(b, d) - (b.medic ? 6 : 0)));
      const c = free.shift();
      c.order.pat = d;
    }
    // luego el sanitario atiende a los heridos que andan, primero el más cercano
    for (const m of meds)
      if (!m.order.pat) {
        const w = hurt
          .filter(u => u !== m && !g.some(o => o.order.pat === u))
          .sort((a, b) => dist(a, m) - dist(b, m))[0];
        if (w) m.order.pat = w;
      }
    for (const u of g) {
      const o = u.order,
        pt = o.pat;
      if (G.t > o.until) {
        u.order = null;
        continue;
      }
      if (pt) {
        const d = dist(u, pt);
        if (d > 1.35) {
          o.rT -= dt;
          if ((o.rT <= 0 || !u.path.length) && !u.pinned && !u.spent) {
            o.rT = 1.6;
            const c = nearestFree(Math.floor(pt.x), Math.floor(pt.z));
            const pth = smoothPath(findPath(Math.floor(u.x), Math.floor(u.z), c[0], c[1]), u.x, u.z);
            if (pth && pth.length) {
              u.path = pth;
              u.stance = 'stand';
            } else if (!pt.alive) pt.noReach = G.t + 10;
          }
        } else {
          if (u.path.length) u.path = [];
          u.stance = 'crouch';
          u.face = Math.atan2(pt.x - u.x, pt.z - u.z);
          u.healing = true;
          if (pt.alive && u.medic) {
            pt.hp = Math.min(85, pt.hp + 7 * dt);
          }
        }
      } else if (!u.moving) {
        if (u.path.length) u.path = [];
        if (!meds.length && u.hp < 60) {
          u.hp = Math.min(60, u.hp + 2.2 * dt);
          u.healing = true;
        } // se pone él mismo el vendaje
        else if (u.medic && u.hp < 70) {
          u.hp = Math.min(85, u.hp + 3 * dt);
          u.healing = true;
        }
      }
    }
    const left = downs.length + hurt.filter(u => u.alive).length;
    if (!left && g.every(u => !u.moving)) {
      for (const u of g) if (u.order && u.order.type === 'treat') u.order = null;
      radio(
        meds[0] || g[0],
        pick(['Heridos atendidos. Listos para movernos.', 'Todos vendados. Seguimos.', 'Heridos estabilizados.'])
      );
    }
  }
  const on = [...G.sel].some(u => u.alive && u.order && u.order.type === 'treat');
  $('oMed').setAttribute('aria-pressed', on ? 'true' : 'false');
}
