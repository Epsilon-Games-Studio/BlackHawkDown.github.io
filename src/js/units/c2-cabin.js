/* ====================================================================================================
 * units/c2-cabin.js
 *
 * El Black Hawk de mando (C2, Uniform 6-4): dos asientos verdes justo detrás de los pilotos, donde empieza
 * la puerta, mirando hacia la cola, y en ellos dos Rangers sin casco ni armas, que son los que llevan la
 * radio y el mapa. Se lo pongo al aparato que haga de C2 en cada misión con c2Cabin(h).
 * ================================================================================================== */

'use strict';

// todo en metros del UH-60 (el grupo del helicóptero ya va escalado a 1/1,5): suelo de la cabina, mamparo
// de detrás de los pilotos y separación de los dos asientos
const C2_FLOOR = 0.68,
  C2_BACK = 3.1,
  C2_X = 0.36;

function c2Cabin(h) {
  if (h.c2) return;
  h.c2 = [];
  // los hombres sacan su pelo y su piel del aleatorio: lo dejo como estaba para no mover la ciudad
  const s0 = seed;
  for (const s of [-1, 1]) {
    const rig = buildRig('base', {});
    if (rig.gun) rig.gun.visible = false;
    rig.root.scale.setScalar(1.5);
    // de espaldas a los pilotos: la cadera un palmo delante del respaldo, sentado sobre el cojín (a 0,43 m)
    rig.root.position.set(s * C2_X, C2_FLOOR + 0.51 - 0.78, C2_BACK - 0.2);
    rig.root.rotation.y = Math.PI;
    if (rig.model) rig.pelvis.position.y = 0.52 / SOLD_K;
    rig.hipL.rotation.x = rig.hipR.rotation.x = -1.5;
    rig.knL.rotation.x = 1.45;
    rig.knR.rotation.x = 1.55;
    rig.hipL.rotation.z = 0.08;
    rig.hipR.rotation.z = -0.08;
    // las manos en los muslos, uno algo más echado hacia delante que el otro
    rig.shR.rotation.x = s > 0 ? -0.3 : -0.4;
    rig.elR.rotation.x = -1.15;
    rig.shL.rotation.x = s > 0 ? -0.4 : -0.3;
    rig.elL.rotation.x = -1.2;
    rig.neck.rotation.y = s * 0.25;
    h.g.add(rig.root);
    h.c2.push(rig);
  }
  seed = s0;
  withModel('u_seat', M => {
    for (const s of [-1, 1]) {
      const m = new T.Mesh(M.geos.m, M.mat);
      m.position.set(s * C2_X, C2_FLOOR, C2_BACK);
      m.rotation.y = Math.PI;
      m.receiveShadow = true;
      h.g.add(m);
    }
  });
}
