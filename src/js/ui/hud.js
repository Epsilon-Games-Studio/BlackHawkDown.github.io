/* ====================================================================================================
 * ui/hud.js
 *
 * HUD
 *
 * HUD: las fichas de las unidades abajo, el reloj de la misión y los avisos (hint).
 * ================================================================================================== */

function buildCards() {
  if (MIS.id === 'irene' || IRN.groups) return irCards();
  formDefaults([us]);
  const box_ = $('squad');
  box_.innerHTML = '';
  us.forEach((u, k) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.id = 'card' + k;
    b.innerHTML = `<span class="cn">${trName(u.name)}</span><span class="cr">${L(u.role)}</span><span class="men"></span><span class="cs"><b>Listo</b><em></em></span>`;
    let lastTap = 0;
    b.addEventListener('click', ev => {
      if (!u.alive) return;
      const now = performance.now();
      if (now - lastTap < 350) {
        camS.tx = u.x;
        camS.tz = u.z;
      }
      lastTap = now;
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
        G.sel.has(u) ? G.sel.delete(u) : G.sel.add(u);
      } else {
        G.sel.clear();
        G.sel.add(u);
      }
      G.newRoute = true;
      refreshCards();
    });
    u.card = {
      el: b,
      men: b.querySelector('.men'),
      st: b.querySelector('.cs b'),
      am: b.querySelector('.cs em'),
      cells: []
    };
    box_.appendChild(b);
  });
  refreshCards();
}
function refreshCards() {
  updFormIco();
  if (MIS.id === 'irene' || IRN.groups) {
    irRefresh();
    if (G.started) renderSubs();
    $('clock').textContent = fmtClock();
    return;
  }
  for (const u of us) {
    const c = u.card;
    if (!c) continue;
    c.el.classList.toggle('sel', G.sel.has(u));
    c.el.classList.toggle('down', !u.alive && !u.down);
    // la ficha de un herido parpadea: ámbar mientras su barra está naranja o amarilla, rojo cuando está muy tocado o en el suelo
    c.el.classList.toggle('hurt', u.alive && u.hp < 70 && u.hp >= 40);
    c.el.classList.toggle('crit', u.down || (u.alive && u.hp < 40));
    menCells(c, [u]);
    const st = u.down
      ? u.reviveT > 0
        ? 'Atendido'
        : u.bleedOut
          ? 'Desangrándose'
          : 'Caído'
      : u.kia
        ? 'Muerto'
        : u.kdT > G.t
          ? 'Derribado'
          : u.carrying
            ? 'Lleva un cuerpo'
            : u.status;
    c.st.textContent = L(st);
    c.st.className = u.pinned || u.down ? 'st-pin' : u.sup > 50 || u.spent ? 'st-sup' : 'st-ok';
    c.am.textContent = '';
  }
  const ok = us.filter(u => u.alive).length;
  $('tally').textContent = L(`Escuadra ${ok}/6 · Caídos ${us.filter(u => u.down).length} · Abatidos ${G.kills}`);
  if (G.started) renderSubs();
  $('clock').textContent = fmtClock();
}
function fmtClock() {
  const s = G.startClock + Math.floor(G.t * TIMESCALE);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, '0')).join(':');
}
function hint(t) {
  $('hint').textContent = L(t);
}
