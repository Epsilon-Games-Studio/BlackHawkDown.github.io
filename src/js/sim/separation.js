/* ====================================================================================================
 * sim/separation.js
 *
 * Dos hombres no pueden ocupar el mismo sitio.
 *  · cellTaken(): al mandar a alguien a un punto, las casillas donde ya hay alguien quieto (o adonde ya va otro) no cuentan
 *    como libres; se busca la libre más cercana.
 *  · separateUnits(): en cada paso, si dos quedan a menos de medio metro largo, se apartan lo justo, sin meterse en
 *    paredes. Un herido en el suelo, un muerto o alguien dentro de un edificio no se mueven: se aparta el otro.
 * ================================================================================================== */

const SEP_R = 0.42; // distancia mínima entre dos hombres, en unidades (unos 60 cm)
// ¿hay alguien (fuera del grupo «menos») quieto en esa casilla, o va alguien hacia ella?
function cellTaken(i, j, menos) {
  for (const u of units) {
    if (!u.alive && !u.down) continue;
    if (menos && (menos.has ? menos.has(u) : menos.includes(u))) continue;
    if (u.inB || u.carriedBy || (u.elev || 0) > 0.3) continue;
    const P = u.path;
    if (P && P.length) {
      const e = P[P.length - 1];
      if (e[0] === i && e[1] === j) return true;
    } else if (Math.floor(u.x) === i && Math.floor(u.z) === j) return true;
  }
  return false;
}
function sepMovable(u) {
  return u.alive && !u.down && !u.inB && !u.carriedBy && !u.slide && !u.mounted && !u.ride && u.board == null && !u.veh && !u.dummy && !(u.kdT > G.t);
}
function separateUnits(dt) {
  const L = [];
  for (const u of units) {
    if ((!u.alive && !u.down) || u.inB || u.carriedBy || u.slide || u.mounted || u.ride || u.board != null || u.veh || u.gone) continue;
    if ((u.elev || 0) > 0.3) continue;
    L.push(u);
  }
  // rejilla gruesa para no comparar a todos con todos
  const H = new Map(),
    key = (i, j) => i * 73856093 + j * 19349663;
  for (const u of L) {
    const k = key(Math.floor(u.x), Math.floor(u.z));
    const a = H.get(k);
    if (a) a.push(u);
    else H.set(k, [u]);
  }
  const R2 = SEP_R * SEP_R,
    k_ = Math.min(1, dt * 10); // se apartan en una décima de segundo, sin tirones
  for (const u of L) {
    if (!sepMovable(u)) continue;
    const ci = Math.floor(u.x),
      cj = Math.floor(u.z);
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) {
        const a = H.get(key(ci + di, cj + dj));
        if (!a) continue;
        for (const o of a) {
          if (o === u) continue;
          let dx = u.x - o.x,
            dz = u.z - o.z;
          const d2 = dx * dx + dz * dz;
          if (d2 >= R2) continue;
          let d = Math.sqrt(d2);
          if (d < 1e-4) {
            // exactamente encima: se aparta hacia un lado cualquiera, siempre el mismo para la misma pareja
            if (u.sepK == null) u.sepK = Math.random();
            if (o.sepK == null) o.sepK = Math.random();
            const ang = (u.sepK + o.sepK) * 9.7 + (u.sepK > o.sepK ? 0 : Math.PI);
            dx = Math.sin(ang);
            dz = Math.cos(ang);
            d = 1;
          } else {
            dx /= d;
            dz /= d;
          }
          const over = SEP_R - (d < 1e-4 ? 0 : d),
            both = sepMovable(o),
            // el que está andando cede menos que el que está parado: el parado se hace a un lado
            share = !both ? 1 : u.path.length && !o.path.length ? 0.3 : !u.path.length && o.path.length ? 0.7 : 0.5,
            push = over * share * k_,
            nx = u.x + dx * push,
            nz = u.z + dz * push;
          if (walk(Math.floor(nx), Math.floor(nz))) {
            u.x = nx;
            u.z = nz;
          } else if (walk(Math.floor(nx), Math.floor(u.z))) u.x = nx;
          else if (walk(Math.floor(u.x), Math.floor(nz))) u.z = nz;
        }
      }
  }
}
