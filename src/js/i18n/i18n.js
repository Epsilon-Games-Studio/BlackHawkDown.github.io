/* ====================================================================================================
 * i18n/i18n.js
 *
 * Traducción al vuelo: L() busca cada texto en el diccionario EN y, si no está, prueba los patrones
 * (EN_RX) para las frases con números o nombres. También traduce el HTML de la página y los empleos militares.
 * ================================================================================================== */

const DIRS_EN = {
  norte: 'north',
  noreste: 'northeast',
  este: 'east',
  sureste: 'southeast',
  sur: 'south',
  suroeste: 'southwest',
  oeste: 'west',
  noroeste: 'northwest'
};
const ORD_EN = { primer: 'first', segundo: 'second', tercer: 'third' };
const dirEN = d => DIRS_EN[d] || d;
const EN_RX = [
  [/^(Delta (?:\d+\/\d+|✓).* — Romeo .*)$/, m => m[1].replace(/milicia/g, 'militia')],
  [/^quedan (.+)$/, m => m[1] + ' left'],
  [/^edificio (\d+) %$/, m => 'building ' + m[1] + ' %'],
  [/^¡Fogonazo al (\S+)!$/, m => `Flash to the ${dirEN(m[1])}!`],
  [/^Asegurar el (primer|segundo|tercer) cruce$/, m => `Secure the ${ORD_EN[m[1]]} crossing`],
  [
    /^Columna en marcha hacia el (primer|segundo|tercer) cruce\. Aseguradlo antes de que llegue\.$/,
    m => `Column moving to the ${ORD_EN[m[1]]} crossing. Secure it before it arrives.`
  ],
  [/^Escuadra (\S+)$/, m => 'Squad ' + m[1]],
  [/^Fuerza (\S+)$/, m => 'Force ' + m[1]],
  [/^Caídos (\S+)$/, m => 'Down ' + m[1]],
  [/^Abatidos (\S+)$/, m => 'Kills ' + m[1]],
  [
    /^Grupo de unos (\d+) armados por el (\S+), van hacia (.+)\.$/,
    m => `About ${m[1]} armed men to the ${dirEN(m[2])}, heading for ${m[3]}.`
  ],
  [
    /^Unos (\d+) armados por el (\S+), vienen hacia vosotros\.$/,
    m => `About ${m[1]} armed men to the ${dirEN(m[2])}, coming your way.`
  ],
  [/^Misión (\d+)$/, m => 'Mission ' + m[1]],
  [
    /^Tengo (\d+) heridos y los vehículos acribillados\. No podemos llegar\. Volvemos a la base\.$/,
    m => `I have ${m[1]} wounded and the vehicles shot to pieces. We can't get through. Returning to base.`
  ],
  [/^heridos en la columna: (\d+)$/, m => 'wounded in the column: ' + m[1]],
  [/^milicia cerca del helicóptero: (\d+)$/, m => 'militia near the helicopter: ' + m[1]],
  [/^milicia en la zona: (\d+)$/, m => 'militia in the area: ' + m[1]],
  [/^milicia dentro: (\d+)$/, m => 'militia inside: ' + m[1]],
  [/^zona limpia (\S+) s$/, m => `area clear ${m[1]} s`],
  [/^limpio (\S+) s$/, m => `clear ${m[1]} s`],
  [/^¡Contacto, al (\S+)!$/, m => `Contact, ${dirEN(m[1])}!`],
  [/^¡Hombre caído! (.+)$/, m => 'Man down! ' + trName(m[1])],
  [/^¡Voy a por (.+)!$/, m => `Going for ${trName(m[1])}!`],
  [/^(.+) se está desangrando$/, m => trName(m[1]) + ' is bleeding out'],
  [/^¡(.+) cae desangrado!$/, m => trName(m[1]) + ' collapses from blood loss!'],
  [/^(.+) ha muerto$/, m => trName(m[1]) + ' is dead'],
  [/^¡Lo hemos perdido! ¡(.+) ha muerto!$/, m => `We lost him! ${trName(m[1])} is dead!`],
  [/^¡(.+)! ¡Mierda, se nos ha ido!$/, m => `${trName(m[1])}! Damn it, he's gone!`],
  [/^(.+) suelta el cuerpo de (.+)$/, m => `${trName(m[1])} drops ${trName(m[2])}'s body`],
  [/^(.+) carga con (.+)$/, m => `${trName(m[1])} picks up ${trName(m[2])}`],
  [
    /^¡La onda expansiva derriba a (\d+) (hombres|hombre)!$/,
    m => `The blast throws ${m[1]} ${m[1] === '1' ? 'man' : 'men'} down!`
  ],
  [/^(.+) herido$/, m => trName(m[1]) + ' wounded'],
  [/^(.+) levanta a (.+)$/, m => `${trName(m[1])} gets ${trName(m[2])} up`],
  [/^(.+) en posición de bloqueo\.$/, m => m[1] + ' in blocking position.'],
  [/^(\d+) caídos?$/, m => m[1] + ' down'],
  [/^(\d+) embarcados$/, m => m[1] + ' mounted'],
  [/^orden en (.+)$/, m => 'order in ' + m[1]],
  [/^(\d+) m hasta que pase$/, m => m[1] + ' m to go'],
  [/^(\d+) m$/, m => m[1] + ' m'],
  [/^prisioneros (.+)$/, m => 'prisoners ' + m[1]],
  [
    /^Pausa automática: (.+)\. Da órdenes y reanuda con Espacio$/,
    m => `Auto-pause: ${L(m[1])}. Give orders and resume with Space`
  ],
  [/^ataque desde el (\S+)$/, m => 'attack from the ' + dirEN(m[1])],
  [/^Nuevo objetivo: (.+)$/, m => 'New objective: ' + L(m[1])],
  [/^contacto$/, () => 'contact'],
  [/^refuerzos$/, () => 'reinforcements'],
  [/^nuevo objetivo$/, () => 'new objective'],
  [/^Radio: milicia acercándose desde el (\S+)\.$/, m => `Radio: militia closing in from the ${dirEN(m[1])}.`],
  [/^Star 4-2 está rearmando: (.+)$/, m => 'Star 4-2 is rearming: ' + m[1]],
  [/^Siguiente bengala en (.+)$/, m => 'Next flare in ' + m[1]],
  [
    /^Star 4-2: recibido, entro desde el (\S+)\. En camino\.$/,
    m => `Star 4-2: roger, coming in from the ${dirEN(m[1])}. On the way.`
  ],
  [
    /^Pasada: (\d+) m × 15 m( \(máximo\))?\. Todo lo que quede dentro, aliado o enemigo, cae\.$/,
    m => `Run: ${m[1]} m × 15 m${m[2] ? ' (maximum)' : ''}. Everything inside, friend or foe, goes down.`
  ],
  [/^(.+) seleccionado$/, m => m[1] + ' selected'],
  [/^Azotea · fuego$/, () => 'Roof · firing'],
  [/^Ventana · fuego$/, () => 'Window · firing']
];
// empleos, tal como los escribe el US Army
function trName(n) {
  if (LANG !== 'en' || !n) return n;
  return n
    .replace(/^Sgto\. Mayor /, 'MSG ')
    .replace(/^Sgto\. 1º /, 'SFC ')
    .replace(/^Sgto\. /, 'Sgt. ')
    .replace(/^Cap\. /, 'Capt. ')
    .replace(/^Tte\. Cor\. /, 'Lt. Col. ')
    .replace(/^Tte\. /, 'Lt. ')
    .replace(/^Esp\. /, 'Spc. ')
    .replace(/^Cabo /, 'Cpl. ')
    .replace(/^Sold\. /, 'Pvt. ');
}
let LANG = 'es';
function L(s) {
  if (LANG !== 'en' || s == null || s === '') return s;
  const k = String(s);
  if (EN[k] != null) return EN[k];
  if (FIELD_TIPS_EN[k]) return FIELD_TIPS_EN[k];
  for (const [re, f] of EN_RX) {
    const m = k.match(re);
    if (m) return f(m);
  }
  if (k.includes(' · '))
    return k
      .split(' · ')
      .map(p => L(trName(p)))
      .join(' · ');
  return trName(k);
}
// el texto propio de la página: cada nodo de texto y cada tooltip, a partir del español en que se escribieron
function applyLangDOM(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentNode;
    if (!p || p.closest('script,style,#chatLive,#chatHist,#squad,#subs,#flyUnits')) continue;
    if (n._o == null) {
      if (!/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(n.nodeValue)) continue;
      n._o = n.nodeValue;
    }
    const o = n._o,
      t = o.trim();
    n.nodeValue = o.replace(t, L(t));
  }
  for (const el of root.querySelectorAll('[title],[aria-label]'))
    for (const a of ['title', 'aria-label']) {
      if (!el.hasAttribute(a)) continue;
      const key = '_' + a;
      if (el[key] == null) el[key] = el.getAttribute(a);
      el.setAttribute(a, L(el[key]));
    }
}
function setLang(l) {
  LANG = l === 'en' ? 'en' : 'es';
  OPT.lang = LANG;
  saveOpt();
  document.documentElement.lang = LANG;
  applyLangDOM(document.body);
  for (const b of document.querySelectorAll('.langbtn')) b.setAttribute('aria-pressed', b.dataset.lang === LANG);
  if (SCREEN === 'scrCamp') renderCampaign();
  if (SCREEN === 'brief') fillBrief();
  renderOpts();
  if (G && G.started) {
    renderSubs();
    refreshCards();
  }
  for (const k in SYM_TEX) delete SYM_TEX[k];
}

/* La apertura de la campaña: Somalia en unas pocas líneas, blanco sobre negro */
const INTRO = {
  es: [
    'Somalia, África Oriental. 1992.',
    'Tras la caída del dictador Siad Barre, los clanes se disputan el país. La guerra y la sequía traen una hambruna que mata a cientos de miles de personas.',
    'El hambre se convierte en un arma: las milicias se quedan con la ayuda que llega a los puertos.',
    'Diciembre de 1992. Una fuerza internacional encabezada por Estados Unidos desembarca para que la comida llegue a quien la necesita.',
    'Junio de 1993. Una emboscada de la milicia del general Mohamed Farrah Aidid mata a veinticuatro cascos azules paquistaníes. La ONU ordena detener a los responsables.',
    'Agosto de 1993. Llega a Mogadiscio la Task Force Ranger: operadores de Delta, Rangers del 75º Regimiento y los pilotos del 160º SOAR.',
    '3 de octubre de 1993. Un informante confirma que dos de los lugartenientes de Aidid se reunirán esa tarde en el centro de Mogadiscio.',
    'El edificio está en pleno territorio de Aidid, junto al mercado de Bakara: el lugar más hostil de Mogadiscio.'
  ],
  en: [
    'Somalia, East Africa. 1992.',
    'After the fall of the dictator Siad Barre, the clans fight over the country. War and drought bring a famine that kills hundreds of thousands of people.',
    'Hunger becomes a weapon: the militias seize the aid that reaches the ports.',
    'December 1992. An international force led by the United States lands so the food reaches those who need it.',
    "June 1993. An ambush by General Mohamed Farrah Aidid's militia kills twenty-four Pakistani peacekeepers. The UN orders those responsible to be arrested.",
    'August 1993. Task Force Ranger arrives in Mogadishu: Delta operators, Rangers of the 75th Regiment and the pilots of the 160th SOAR.',
    "3 October 1993. An informant confirms that two of Aidid's lieutenants will meet that afternoon in central Mogadishu.",
    "The building lies deep in Aidid's territory, beside the Bakara Market: the most hostile place in Mogadishu."
  ]
};
// las escenas de cine que se intercalan: después de la línea 3 («El hambre se convierte en un arma») el reparto de comida;
// después de la 6 (la llegada de la Task Force Ranger) la captura en la pista, justo antes del aviso del informante;
// y después de la última (el edificio junto a Bakara) la ciudad desde las afueras, con la música entrando, y el título
const INTRO_FILM = { 2: 'aid', 5: 'raid', 7: 'city' };
let introRun = null;
var introSeen = false;
/* La introducción: los textos, las dos cinemáticas y el título, en cadena: cada paso espera a que acabe el anterior
 * (una cinemática que va lenta en un móvil, o que se salta, no descuadra nada). Al final, fundido a negro y BLACK HAWK DOWN. */
const INTRO_LINE_MS = (t) => 2600 + t.length * 62; // lo que tarda en leerse con calma cada texto
function introTitleEl() {
  let e = $('introTitle');
  if (!e) {
    e = document.createElement('div');
    e.id = 'introTitle';
    e.className = 'intro-title';
    e.textContent = 'BLACK HAWK DOWN';
    $('scrIntro').appendChild(e);
  }
  return e;
}
function introSeq(onEnd) {
  const lines = INTRO[LANG],
    el = $('introLine'),
    R = { t: null, alive: true };
  let k = -1;
  const wait = (ms, f) => {
    clearTimeout(R.t);
    R.t = setTimeout(() => {
      if (R.alive) f();
    }, ms);
  };
  const title = () => {
    el.classList.remove('on');
    const tt = introTitleEl();
    wait(1100, () => {
      tt.classList.add('on');
      iscHit();
      wait(4300, () => {
        tt.classList.remove('on');
        wait(1500, () => {
          R.alive = false;
          iscStop(false);
          onEnd();
        });
      });
    });
  };
  const next = () => {
    k++;
    if (k >= lines.length) return title();
    el.classList.remove('on');
    wait(450, () => {
      el.textContent = lines[k];
      el.classList.add('on');
      // mientras se leen los textos de antes, se va cargando la ciudad que se verá desde las afueras
      if (Object.keys(INTRO_FILM).some(q => INTRO_FILM[q] === 'city' && q - k <= 1 && q - k >= 0)) cityWarm();
      wait(INTRO_LINE_MS(lines[k]), () => {
        const film = INTRO_FILM[k];
        if (!film) return next();
        el.classList.remove('on');
        wait(650, () =>
          proStart(film, () => {
            if (R.alive) wait(500, next);
          })
        );
      });
    });
  };
  R.stop = () => {
    R.alive = false;
    iscStop(true);
    clearTimeout(R.t);
    el.classList.remove('on');
    introTitleEl().classList.remove('on');
  };
  next();
  return R;
}
function playIntro(after) {
  showScreen('scrIntro');
  introRun = { after, seq: null };
  introRun.seq = introSeq(() => stopIntro());
}
function stopIntro() {
  proStop(true);
  if (typeof CINTRO !== 'undefined' && CINTRO) {
    campIntroGo(true);
    return;
  }
  if (!introRun) return;
  if (introRun.seq) introRun.seq.stop();
  const f = introRun.after;
  introRun = null;
  introSeen = true;
  markIntro();
  $('introLine').classList.remove('on');
  if (f) f();
}
