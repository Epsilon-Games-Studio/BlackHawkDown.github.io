/* ====================================================================================================
 * sim/simulation.js
 *
 * Simulación
 *
 * step(): un paso de simulación. Mueve unidades, resuelve disparos, actualiza la visibilidad
 * y avanza la misión. Todo el juego avanza por aquí.
 * ================================================================================================== */

'use strict';

function step(dt) {
  G.t += dt;
  G.dt = dt;
  scriptStep(dt);
  updRPGs(dt);
  updRockets(dt);
  cineStep(dt);
  if (MIS.id === 'tutorial') tutTick(dt);
  for (const C of CONVOYS) convoyStep(C, dt);
  for (const T_ of TECHS) techStep(T_, dt);
  for (const d of G.m.wounded || []) if (!d.gone) irDecorStep(d, dt);
  if (G.endAt != null && G.t >= G.endAt && !G.over) {
    endGame(true);
    return;
  }
  for (let k = sched.length - 1; k >= 0; k--)
    if (sched[k].at <= G.t) {
      const s = sched[k];
      sched.splice(k, 1);
      s.fn();
    }
  for (let k = emitters.length - 1; k >= 0; k--)
    if (emitters[k].until && G.t > emitters[k].until) emitters.splice(k, 1);
  G.visT -= dt;
  if (G.visT <= 0) {
    G.visT = 0.2;
    updVisibility();
  }
  for (const u of units) updUnit(u, dt);
  formStep(dt);
  for (const u of us) idleLife(u, dt);
  medic(dt);
  bleedTick(dt);
  farRpgTick(dt);
  updRuns(dt);
  updCivs(dt);
  G.supT = (G.supT || 0) - dt;
  if (G.supT <= 0) {
    G.supT = 0.5;
    updSupBtns();
  }
  updMission();
  if (MIS.id === 'irene') irTick(dt);
  if (moveMark.material.opacity > 0) moveMark.material.opacity = Math.max(0, moveMark.material.opacity - dt * 1.2);
  const supOn = us.some(u => u.alive && u.order && u.order.type === 'suppress');
  supMark.material.opacity = supOn ? 0.55 + Math.sin(G.t * 8) * 0.25 : Math.max(0, supMark.material.opacity - dt * 2);
  checkEnd();
}
function updVisibility() {
  updLit();
  for (const e of them) {
    if (!e.alive) {
      e.spotted = false;
      continue;
    }
    const was = e.spotted;
    e.spotted = us.some(u => u.alive && dist(u, e) < sightR(u, e) + 2 && losU(u, e));
    if (e.spotted) {
      G.ghosts.set(e, { x: e.x, z: e.z, t: G.t });
      if (!was && !e.dummy && G.t - G.contactT > 5) {
        G.contactT = G.t;
        const sp = us.filter(u => u.alive).sort((a, b) => dist(a, e) - dist(b, e))[0];
        radio(sp, `¡Contacto, ${dirName(sp, e)}!`);
        autoPause('contacto');
      }
    }
  }
}
function dirName(a, b) {
  const ang = (Math.atan2(b.x - a.x, -(b.z - a.z)) * 180) / Math.PI;
  const n = ['al norte', 'al noreste', 'al este', 'al sureste', 'al sur', 'al suroeste', 'al oeste', 'al noroeste'];
  return n[((Math.round(ang / 45) % 8) + 8) % 8];
}
