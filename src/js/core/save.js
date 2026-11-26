/* ====================================================================================================
 * core/save.js
 *
 * Guardado de la campaña: en este navegador y, cuando el juego corre como página publicada en claude.ai, también en el almacén
 * privado del jugador allí, para que el progreso sobreviva a cerrar el juego, borrar el navegador o abrirlo en otro dispositivo
 * ================================================================================================== */

const SAVE = { v: 1, done: [], res: {}, last: null, intro: false, at: 0 };
let cloud = null,
  cloudQ = Promise.resolve(),
  saveReady = false;
function saveMerge(o) {
  if (!o || typeof o !== 'object') return false;
  let ch = false;
  for (const id of Array.isArray(o.done) ? o.done : [])
    if (typeof id === 'string' && MISSIONS[id] && !SAVE.done.includes(id)) {
      SAVE.done.push(id);
      ch = true;
    }
  for (const id in o.res || {}) {
    const a = SAVE.res[id],
      b = o.res[id];
    if (!b || !MISSIONS[id]) continue;
    if (!a || (b.opt || 0) > (a.opt || 0) || ((b.opt || 0) === (a.opt || 0) && (b.secs || 1e9) < (a.secs || 1e9))) {
      SAVE.res[id] = b;
      ch = true;
    }
  }
  if (o.intro && !SAVE.intro) {
    SAVE.intro = true;
    ch = true;
  }
  if ((o.at || 0) > (SAVE.at || 0) && o.last && MISSIONS[o.last]) {
    SAVE.last = o.last;
    SAVE.at = o.at;
    ch = true;
  }
  return ch;
}
function saveLocal() {
  try {
    localStorage.setItem('bhd.save', JSON.stringify(SAVE));
    localStorage.setItem('bhd.done', JSON.stringify(SAVE.done));
  } catch (e) {}
}
function saveCloud() {
  if (!cloud) return;
  const body = JSON.parse(JSON.stringify(SAVE));
  cloudQ = cloudQ.then(() => cloud.set(body)).catch(() => {});
} // una escritura cada vez, en orden
function saveNow() {
  SAVE.at = Date.now();
  saveLocal();
  saveCloud();
  renderSaveInfo();
}
(function loadSave() {
  try {
    saveMerge(JSON.parse(localStorage.getItem('bhd.save') || 'null'));
  } catch (e) {}
  try {
    saveMerge({ done: JSON.parse(localStorage.getItem('bhd.done') || '[]') });
  } catch (e) {} // progreso de antes de que existiera este guardado
  introSeen = introSeen || SAVE.intro;
  saveReady = true;
  // la copia privada en la nube: solo en claude.ai y solo con el jugador identificado; el juego nunca la espera
  if (window.claude && typeof window.claude.use === 'function')
    (async () => {
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        const id = await user.id();
        if (!id) return;
        const ref = db.doc('data/users/' + id + '/campaign'),
          snap = await ref.get();
        cloud = ref;
        const theirs = snap.exists ? snap.data() : null;
        saveMerge(theirs);
        introSeen = introSeen || SAVE.intro;
        saveLocal();
        if (!theirs || JSON.stringify(theirs) !== JSON.stringify(SAVE)) saveCloud(); // la copia de la nube se pone al día con lo que tenía este navegador
        SAVE.cloud = true;
        renderSaveInfo();
        if (SCREEN === 'scrCamp') renderCampaign();
      } catch (e) {}
    })();
})();
function doneSet() {
  return new Set(SAVE.done);
}
function markDone(id, r) {
  if (!SAVE.done.includes(id)) SAVE.done.push(id);
  if (r) saveMerge({ res: { [id]: r } });
  saveNow();
}
function markLast(id) {
  if (id && CAMPAIGN.includes(id) && SAVE.last !== id) {
    SAVE.last = id;
    saveNow();
  }
}
function markIntro() {
  if (!SAVE.intro) {
    SAVE.intro = true;
    saveNow();
  }
}
// la siguiente misión a jugar: la que va después de la última ganada, o la última que se abrió
function resumeMission() {
  for (const id of CAMPAIGN) if (!SAVE.done.includes(id)) return id;
  return SAVE.last || CAMPAIGN[0];
}
function renderSaveInfo() {
  const b = $('mCont');
  if (!b) return;
  const any = SAVE.done.length > 0 || !!SAVE.last;
  b.hidden = !any;
  if (!any) return;
  const id = resumeMission(),
    M_ = MISSIONS[id];
  b.querySelector('em').textContent =
    `${L('Misión')} ${M_.n} · ${L(M_.title)} · ${SAVE.done.length}/${CAMPAIGN.length} ${L('cumplidas')}` +
    (SAVE.cloud ? ' · ' + L('guardado en tu cuenta') : '');
}
