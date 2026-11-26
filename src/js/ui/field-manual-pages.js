/* ====================================================================================================
 * ui/field-manual-pages.js
 *
 * El manual de campo en pantalla: portada, maquetación en hojas fijas y paso de página.
 * ================================================================================================== */

/* El manual de campo: la página 0 es la portada y luego las páginas de MANUAL; una página cada vez, pasando con las flechas, deslizando o con las teclas */
let manK = 0,
  MANP = null,
  manW = 0;
function manText(k) {
  const P_ = MANUAL[k - 1],
    en = LANG === 'en';
  const l = t => (en ? MAN_SK_EN[t] || t : t);
  let h = (en ? P_[2] : P_[1])
    .replace(/\{sk:(\w+)\}/g, (_, n) => (MAN_SK[n] ? MAN_SK[n](l) : ''))
    .replace(/\{btn:(\w+)\}/g, (_, id) => {
      const b = $(id),
        sv = b && b.querySelector('svg');
      return `<span class="kb">${sv ? sv.outerHTML : `<small>${b ? b.textContent.trim().slice(0, 4).toUpperCase() : ''}</small>`}</span>`;
    });
  return `<h3>${L(P_[0])}</h3>${h}`;
}
/* Hojas fijas, sin scroll: cada capítulo se reparte en tantas hojas como necesite. Lo que no cabe en una hoja
   pasa a la siguiente, un elemento de lista o una fila de tabla cada vez, medido en una hoja invisible del mismo tamaño. */
function manPaginate() {
  const B_ = $('manBook'),
    probe = document.createElement('div');
  probe.className = 'man-page';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  const inner = document.createElement('div');
  inner.className = 'mp-in';
  probe.appendChild(inner);
  B_.appendChild(probe);
  const pages = [],
    first = [];
  for (let c = 1; c <= MANUAL.length; c++) {
    const tmp = document.createElement('div');
    tmp.innerHTML = manText(c);
    // las piezas que pueden ir en una hoja: un título, un boceto, un párrafo, un elemento de lista, una fila de tabla
    const blocks = [];
    for (const el of [...tmp.children]) {
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        let i = 0;
        for (const li of [...el.children]) blocks.push({ wrap: el, start: ++i, el: li });
      } else if (el.tagName === 'TABLE') {
        for (const tr of [...el.querySelectorAll('tr')]) blocks.push({ wrap: el, el: tr });
      } else blocks.push({ el });
    }
    const title = tmp.querySelector('h3') ? tmp.querySelector('h3').textContent : '';
    first[c] = pages.length;
    let k = 0,
      cont = false;
    while (k < blocks.length) {
      inner.innerHTML = '';
      let cur = null,
        curWrap = null,
        n = 0;
      if (cont) {
        const h = document.createElement('h3');
        h.textContent = title + ' ' + L('(sigue)');
        inner.appendChild(h);
      }
      while (k < blocks.length) {
        const bk = blocks[k];
        let node;
        if (bk.wrap) {
          if (curWrap !== bk.wrap) {
            cur = bk.wrap.cloneNode(false);
            if (bk.wrap.tagName === 'OL') cur.setAttribute('start', bk.start);
            if (bk.wrap.tagName === 'TABLE') cur.appendChild(document.createElement('tbody'));
            inner.appendChild(cur);
            curWrap = bk.wrap;
          }
          node = bk.el.cloneNode(true);
          (cur.tagName === 'TABLE' ? cur.tBodies[0] : cur).appendChild(node);
        } else {
          node = bk.el.cloneNode(true);
          inner.appendChild(node);
          cur = null;
          curWrap = null;
        }
        if (inner.scrollHeight > inner.clientHeight + 1 && n > 0 && !(n === 1 && blocks[k - 1].el.tagName === 'H3')) {
          node.remove();
          if (cur && !cur.querySelector('li,tr')) cur.remove();
          break;
        }
        n++;
        k++;
      }
      // un título que se queda solo al final de una hoja pasa a la siguiente con lo que le sigue
      const last = inner.lastElementChild;
      if (last && last.tagName === 'H3' && k < blocks.length && n > 1 && !cont) {
        last.remove();
        k--;
      }
      pages.push({ html: inner.innerHTML, ch: c });
      cont = true;
    }
  }
  probe.remove();
  MANP = { pages, first };
  manW = B_.clientWidth + 'x' + B_.clientHeight;
}
function manRender(dir) {
  const B_ = $('manBook');
  if (!MANP || manW !== B_.clientWidth + 'x' + B_.clientHeight) manPaginate();
  const n = MANP.pages.length + 1;
  manK = clamp(manK, 0, n - 1);
  if (manK === 0)
    B_.innerHTML = `<div class="man-cover"><span class="mc-strip"></span><div class="mc-stencil">${L('MANUAL DE CAMPO')}</div>
      <div class="mc-sub">FM 93-M · TASK FORCE RANGER</div><div class="mc-label"><span>${L('Mogadiscio, Somalia')}</span><span>${L('Sgto. — Cía. B, 3/75')}</span><span>Oct. 1993</span></div>
      <div class="mc-stamp">${L('RESTRINGIDO')}</div><span class="mc-ring"></span><button id="manOpen" class="mc-open">${L('Abrir el cuaderno')}</button></div>`;
  else
    B_.innerHTML = `<div class="man-page${manK % 4 === 1 ? ' stain' : manK % 4 === 3 ? ' stain stain2' : ''}"><div class="mp-in">${MANP.pages[manK - 1].html}</div><span class="mp-n">${manK}</span></div>`;
  B_.classList.remove('turnL', 'turnR');
  void B_.offsetWidth;
  if (dir) B_.classList.add(dir > 0 ? 'turnR' : 'turnL');
  $('manPg').textContent = manK === 0 ? L('Portada') : `${manK} / ${n - 1}`;
  $('manPrev').disabled = manK === 0;
  $('manNext').disabled = manK === n - 1;
  const op = $('manOpen');
  if (op)
    op.onclick = () => {
      manK = 1;
      manRender(1);
    };
  for (const li of B_.querySelectorAll('[data-go]'))
    li.onclick = () => {
      manK = MANP.first[+li.dataset.go] + 1;
      manRender(1);
    };
}
function manLast() {
  return MANP ? MANP.pages.length : MANUAL.length;
}
// las hojas se vuelven a medir cuando la ventana cambia de tamaño o llega la letra manuscrita
addEventListener('resize', () => {
  if (SCREEN !== 'scrMan') return;
  clearTimeout(manRender.t);
  manRender.t = setTimeout(() => {
    const ch = manK > 0 && MANP ? MANP.pages[manK - 1].ch : 0;
    MANP = null;
    manRender(0);
    if (ch) {
      manK = MANP.first[ch] + 1;
      manRender(0);
    }
  }, 200);
});
if (document.fonts && document.fonts.ready)
  document.fonts.ready.then(() => {
    MANP = null;
    if (SCREEN === 'scrMan') manRender(0);
  });
function openManual() {
  manK = 0;
  MANP = null;
  showScreen('scrMan');
  manRender(0);
}
$('mMan').onclick = () => openManual();
$('manPrev').onclick = () => {
  manK--;
  manRender(-1);
};
$('manNext').onclick = () => {
  manK++;
  manRender(1);
};
$('manClose').onclick = () => showScreen('scrMenu');
addEventListener(
  'keydown',
  e => {
    if (SCREEN !== 'scrMan') return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (manK < manLast()) {
        manK++;
        manRender(1);
      }
    } else if (k === 'ArrowLeft' || k === 'PageUp') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (manK > 0) {
        manK--;
        manRender(-1);
      }
    } else if (k === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      showScreen('scrMenu');
    }
  },
  true
);
{
  let sx = null,
    sy = 0;
  const bk = $('manBook');
  bk.addEventListener('pointerdown', e => {
    sx = e.clientX;
    sy = e.clientY;
  });
  bk.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx,
      dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && manK < manLast()) {
        manK++;
        manRender(1);
      } else if (dx > 0 && manK > 0) {
        manK--;
        manRender(-1);
      }
    }
  });
}
$('campBack').onclick = () => {
  if (MIS.id !== 'attract') goMenu();
  else showScreen('scrMenu');
};
$('credBack').onclick = () => showScreen('scrMenu');
$('scrTitle').addEventListener('pointerdown', e => {
  e.preventDefault();
  leaveTitle();
});
