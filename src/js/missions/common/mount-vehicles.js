/* ====================================================================================================
 * missions/common/mount-vehicles.js
 *
 * Montar en los vehículos cuando sale la columna
 * ================================================================================================== */

function mount(u) {
  u.mounted = true;
  u.alive = false;
  u.down = false;
  u.path = [];
  u.order = null;
  G.sel.delete(u);
  if (u.inB) leaveB(u);
  world.remove(u.m.root);
  dropOverlay(u);
  units = units.filter(o => o !== u);
}
function mountNear(C) {
  for (const u of us) {
    if (u.mounted || (!u.alive && !u.down)) continue;
    const v = C.veh.find(v => Math.hypot(v.x - u.x, v.z - u.z) < 3.8);
    if (!v) continue;
    if (u.alive && !u.inB) mount(u);
    else if (u.down && us.some(o => o.alive && Math.hypot(o.x - u.x, o.z - u.z) < 2.2)) mount(u);
  }
}
