/* ====================================================================================================
 * ui/radio-chat.js
 *
 * Chat de radio: las voces de cada misión en una única conversación continua
 * ================================================================================================== */

'use strict';

const CHAT = { q: [], t: 0, hist: [], open: false };
function chatLine(who, text, cls) {
  CHAT.hist.push([who, text, cls || 'sys', G && G.started ? fmtClock() : '']);
  if (CHAT.hist.length > 120) CHAT.hist.shift();
  CHAT.fresh = performance.now();
  renderChatLive();
  if (CHAT.open) renderChatHist();
}
const chatEl = (w, t, c, ck) => {
  const el = document.createElement('div');
  el.className = 'cl ' + c;
  if (ck) {
    const i = document.createElement('i');
    i.textContent = ck;
    el.appendChild(i);
  }
  if (w) {
    const b = document.createElement('b');
    b.textContent = L(w);
    el.appendChild(b);
  }
  const s = document.createElement('span');
  s.textContent = L(t);
  el.appendChild(s);
  return el;
};
// plegado: las dos o tres últimas líneas, menos si son largas
function renderChatLive() {
  const L = $('chatLive');
  if (!L) return;
  L.innerHTML = '';
  const out = [];
  let budget = 190;
  for (let k = CHAT.hist.length - 1; k >= 0 && out.length < 3; k--) {
    const len = CHAT.hist[k][1].length + 30;
    if (out.length >= 1 && (budget -= len) < 0) break;
    if (!out.length) budget -= len;
    out.unshift(CHAT.hist[k]);
  }
  out.forEach((h, i) => {
    const el = chatEl(h[0], h[1], h[2]);
    if (i === out.length - 1) el.classList.add('new');
    L.appendChild(el);
  });
  $('chat').classList.toggle('empty', !CHAT.hist.length);
}
// las líneas hacen cola para que una conversación se lea como tal: una pausa entre ellas, más larga después de una línea larga
const SPK = {
  'Delta A': 'Cap. Scott Miller · Kilo 2-1',
  'Uniform 6-4': 'Tte. Cor. Tom Matthews · Uniform 6-4 · Mando aéreo (C2)',
  JOC: 'Gen. William Garrison · JOC',
  'Sgto. Struecker': 'Sgto. Jeff Struecker · Ranger · Columna McKnight',
  'Cap. Steele': 'Cap. Mike Steele · Juliet 6-4 · Ranger · Romeo 1-1',
  'Tte. Cor. McKnight': 'Tte. Cor. McKnight · Ranger · Jefe de la columna',
  Maddox: 'Esp. Maddox · Conductor · Columna McKnight',
  'Cabo Ottie': 'Cabo Ottie · Ranger · Columna McKnight',
  'Super 6-1': 'CW3 Cliff Wolcott · Super 6-1 · 160º SOAR',
  'Super 6-2': 'CW3 Mike Goffena · Super 6-2 · 160º SOAR',
  'Super 6-4': 'CW4 Mike Durant · Super 6-4 · 160º SOAR',
  'Super 6-3': 'Super 6-3 · 160º SOAR',
  'Super 6-8': 'CW3 Dan Jollota · Super 6-8 · CSAR',
  'Star 4-1': 'CW3 Keith Jones · Star 4-1 · 160º SOAR',
  'Star 4-4': 'Star 4-4 · 160º SOAR',
  Gordon: 'Sgto. Mayor Gary Gordon · Kilo 4-1',
  Shughart: 'Sgto. 1º Randy Shughart · Kilo 4-1',
  PJ: 'Sgto. Tim Wilkinson · PJ · CSAR · Super 6-8',
  Base: 'Base TFR · Aeropuerto',
  'Romeo 6-4': 'Romeo 6-4 · Columna de vehículos',
  ONU: 'Columna de la ONU · 10ª Div. de Montaña'
};
// la etiqueta en las líneas de un soldado: quién es, si es Delta o Ranger y a qué unidad pertenece
function unitLabel(u) {
  if (!u) return '';
  const g = IRN.groups && u.grp != null ? IRN.groups[u.grp] : null;
  // el indicativo real de la unidad: Kilo 1-1, o Ranger · Romeo 2-1
  const unit = u.unitName || (g ? g.name : u.look === 'delta' ? 'Kilo 1-1' : 'Escuadra');
  const force = /^Delta/.test(unit) ? null : u.pj ? 'PJ' : u.look === 'delta' ? 'Delta' : 'Ranger';
  return [u.name, /Steele/.test(u.name || '') ? 'Juliet 6-4' : null, force, unit].filter(Boolean).join(' · ');
}
function say(who, text, cls, pri) {
  if (!text || (MIS && MIS.id === 'attract')) return;
  if (SPK[who]) who = SPK[who];
  else if (who && !who.includes(' · ')) {
    const u = us.find(o => o.name === who);
    if (u) who = unitLabel(u);
  }
  if (!pri && CHAT.q.length > 6) return;
  if (pri) CHAT.q.unshift([who, text, cls]);
  else CHAT.q.push([who, text, cls]);
}
function updChat(rdt) {
  CHAT.t -= rdt;
  if (CHAT.t > 0 || !CHAT.q.length) return;
  const [w, t, c] = CHAT.q.shift();
  chatLine(w, t, c);
  CHAT.t = 1.1 + Math.min(2.6, t.length / 36);
}
function clearChat() {
  CHAT.q = [];
  CHAT.hist = [];
  CHAT.t = 0;
  renderChatLive();
  if (CHAT.open) renderChatHist();
}
function renderChatHist() {
  const H = $('chatHist');
  H.innerHTML = '';
  for (const [w, t, cl, ck] of CHAT.hist.slice(-80)) H.appendChild(chatEl(w, t, cl, ck));
  H.scrollTop = H.scrollHeight;
}
function toggleChat(on) {
  CHAT.open = on == null ? !CHAT.open : on;
  $('chatHist').hidden = !CHAT.open;
  $('chatLive').hidden = CHAT.open;
  $('chat').classList.toggle('open', CHAT.open);
  $('chatHead').setAttribute('aria-expanded', CHAT.open);
  if (CHAT.open) renderChatHist();
  placeChat();
}
// la radio cuelga justo debajo del panel de la misión, mida lo que mida
function placeChat() {
  const ch = $('chat'),
    m = document.querySelector('.mission');
  if (!ch) return;
  if (document.body.classList.contains('cine') || !m || !m.offsetParent) {
    ch.style.top = '';
    return;
  }
  const mb = m.getBoundingClientRect().bottom,
    tb = document.querySelector('#top .topbtns'),
    r = tb && tb.getBoundingClientRect();
  ch.style.top = Math.round((r && r.top >= mb - 4 ? r.bottom : mb) + 6) + 'px';
  ch.style.width = Math.max(260, Math.round(m.getBoundingClientRect().width)) + 'px';
}
function logMsg(t, cls) {
  if (CINE.on) return;
  const m = /^Radio: (.*)$/.exec(t);
  if (m) say('Radio', m[1], 'bad', true);
  else chatLine(null, t, cls === 'bad' ? 'bad' : cls === 'us' ? 'us' : 'sys');
}
function radio(u, t, force) {
  if (!u || !t || (CINE.on && !force)) return;
  if (u.alive) {
    u.talkT = 1.8;
    u.talkRadio = !CINE.on;
  }
  say(u.team === 'us' ? unitLabel(u) : u.name, t, u.team === 'us' ? (u.look === 'delta' ? 'delta' : 'us') : 'bad');
}
