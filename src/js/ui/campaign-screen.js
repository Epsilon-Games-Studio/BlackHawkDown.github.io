/* ====================================================================================================
 * ui/campaign-screen.js
 *
 * La pantalla de campaña: la lista de misiones por fases del día, con lo ya jugado marcado.
 * ================================================================================================== */

const PHASE_HEAD = {
  irene: 'Día · 3 de octubre',
  perim: 'Atardecer y noche · visores y bengalas',
  mile: 'Amanecer · 4 de octubre'
};
function renderCampaign() {
  const done = doneSet();
  const tl = CAMPAIGN.map(id => {
    const M_ = MISSIONS[id];
    return `<button class="tl-n${done.has(id) ? ' done' : ''}" data-m="${id}" title="${L(M_.title)}"><i></i><b>${hhmm(M_.hour)}</b><span>${L(M_.title)}</span></button>`;
  }).join('');
  let rows = '';
  for (const id of CAMPAIGN) {
    const M_ = MISSIONS[id];
    if (PHASE_HEAD[id]) rows += `<li class="ph-head">${L(PHASE_HEAD[id])}</li>`;
    rows += `<li><button class="mrow2${done.has(id) ? ' done' : ''}" data-m="${id}">
      <span class="mn">${M_.n}</span><span class="mh">${hhmm(M_.hour)}</span>
      <span class="mt"><b>${L(M_.title)}</b><em>${L(M_.place)} · ${L(M_.squadTxt)}</em><small>${L(M_.summary)}</small></span>
      <span class="ms">${done.has(id) ? L('Cumplida') + (SAVE.res[id] ? `<small>${SAVE.res[id].opt}/${SAVE.res[id].of} ${L('opcionales')}</small>` : '') : ''}</span></button></li>`;
  }
  $('campTl').innerHTML = tl;
  $('campList').innerHTML = rows;
  for (const b of document.querySelectorAll('#scrCamp [data-m]')) b.onclick = () => openMission(b.dataset.m);
}
