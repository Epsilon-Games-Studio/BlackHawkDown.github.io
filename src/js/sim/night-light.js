/* ====================================================================================================
 * sim/night-light.js
 *
 * Luz de noche: al que está en ella se le ve
 * ================================================================================================== */

function lightAt(x, z) {
  let L = 0;
  if (SUP)
    for (const f of SUP.flares) {
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < FLARE_R * 0.85) L = Math.max(L, f.lit * (1 - d / (FLARE_R * 0.85)) * 1.6);
    }
  for (const s of LIGHTSRC) {
    if (s.off || (s.lamp && nightF < 0.15)) continue;
    const r = s.lamp ? s.d * 0.7 : 6;
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < r) L = Math.max(L, 1 - d / r);
  }
  for (const e of emitters) {
    if (!e.fire || e.lsrc) continue;
    const r = 3 + 7 * e.fire,
      d = Math.hypot(e.x - x, e.z - z);
    if (d < r) L = Math.max(L, 1 - d / r);
  }
  if (nightF > 0.3) L = Math.max(L, vestLit(x, z));
  return L;
}
function updLit() {
  for (const u of units) u.lit = u.alive ? lightAt(u.x, u.z) > 0.22 : false;
  // una bengala ardiendo dentro del campo de visión de quien lleva visores le deslumbra los tubos
  for (const u of us) {
    u.nvBlind = 0;
    if (!u.alive || u.look !== 'delta' || !G.nv || !SUP) continue;
    for (const f of SUP.flares) {
      const d = Math.hypot(f.x - u.x, f.z - u.z);
      if (d < NV_R) u.nvBlind = Math.max(u.nvBlind, f.lit * clamp(1.35 - d / NV_R, 0, 1));
    }
  }
}
const NV_R = 33;
function setNV(on) {
  if (on && !us.some(u => u.alive && u.look === 'delta')) {
    hint('Los Rangers dejaron los visores nocturnos en la base: solo Delta los lleva');
    on = false;
  } else if (on && nightF <= 0.25) {
    hint('El visor nocturno solo sirve de noche');
    on = false;
  }
  G.nv = on;
  $('oNV').setAttribute('aria-pressed', on);
  if (on)
    radio(
      us.find(u => u.alive),
      pick(['Bajad visores.', 'Visores abajo, ojos abiertos.', 'NODs puestos.'])
    );
}
