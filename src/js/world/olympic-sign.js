/* ====================================================================================================
 * world/olympic-sign.js
 *
 * El cartel de la azotea del Olympic
 * ================================================================================================== */

function hotelSign(x, y, w, d, top, b) {
  // letras rojas recortadas sobre un bastidor ligero de acero, cruzado en la esquina de la azotea como el de verdad
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 112;
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 512, 112);
  // letras perfiladas: un borde rojo alrededor de cada letra con el centro oscuro, como las letras de chapa doblada del hotel de verdad
  c.font = '600 92px "Arial Narrow", "Roboto Condensed", Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.save();
  c.translate(256, 94);
  c.scale(0.74, 1);
  c.lineJoin = 'miter';
  c.lineWidth = 13;
  c.strokeStyle = '#5a120e';
  c.strokeText('OLYMPIC', 0, 0);
  c.lineWidth = 9;
  c.strokeStyle = '#cf2c20';
  c.strokeText('OLYMPIC', 0, 0);
  c.fillStyle = '#4a1612';
  c.fillText('OLYMPIC', 0, 0);
  c.lineWidth = 2;
  c.strokeStyle = '#f0675a';
  c.strokeText('OLYMPIC', -1, -3);
  c.restore();
  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearFilter;
  const SW = Math.min(w * 0.62, 4.2),
    SH = (SW * 112) / 512,
    par = CUR ? CUR.group : world,
    mat = new T.MeshPhongMaterial({ map: tex, alphaTest: 0.5, specular: 0x331111, shininess: 12 });
  // la esquina de la azotea que da al cruce (suroeste), con el cartel girado 45 grados sobre ella
  const ang = -Math.PI / 4,
    ca = Math.cos(ang),
    sa = Math.sin(ang);
  const cx = x + 0.95,
    cz = y + d - 0.95,
    yy = top + 0.95 + SH / 2;
  const g = new T.Group();
  g.position.set(cx, 0, cz);
  g.rotation.y = ang;
  par.add(g);
  const front = new T.Mesh(new T.PlaneGeometry(SW, SH), mat);
  front.position.set(0, yy, 0.03);
  front.castShadow = true;
  g.add(front);
  const back = new T.Mesh(front.geometry, mat);
  back.rotation.y = Math.PI;
  back.position.set(0, yy, -0.03);
  back.castShadow = true;
  g.add(back);
  // bastidor: un raíl fino bajo las letras, otro más ligero por arriba, dos postes y tirantes hasta la azotea
  const P = (lx, y_, lz, sx, sy, sz, col, ex) =>
    B(
      cx + lx * ca + lz * sa,
      y_,
      cz - lx * sa + lz * ca,
      sx,
      sy,
      sz,
      col,
      Object.assign({ b, ry: ang, m: M.METAL }, ex || {})
    );
  P(0, yy - SH / 2 + 0.02, 0, SW * 1.02, 0.05, 0.05, 0x2a2a28);
  P(0, yy + SH / 2 - 0.04, -0.02, SW * 0.98, 0.03, 0.03, 0x3a3a38);
  for (const t of [-0.38, 0.38]) {
    P(t * SW, top + (yy - top) / 2 + 0.1, -0.02, 0.06, yy - top + 0.3, 0.06, 0x2a2a28);
    P(t * SW, top + 0.5, -0.45, 0.04, 1.1, 0.04, 0x2a2a28, { rx: 0.75 });
  }
}
