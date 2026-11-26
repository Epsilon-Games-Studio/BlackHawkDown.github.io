/* ====================================================================================================
 * core/boot.js
 *
 * Arranque: aplica las opciones guardadas, el idioma, lanza la batalla de fondo del título y el primer frame.
 * Tiene que ser lo último de todo: aquí ya existe cada función del juego.
 * ================================================================================================== */

soundOn = OPT.sound;
PS = OPT.q;
resize();
LANG = OPT.lang === 'en' ? 'en' : 'es';
applyLangDOM(document.body);
document.documentElement.lang = LANG;
startAttract();
if (window.__gateOpen || !document.getElementById('epsSplash')) showScreen('scrTitle');
else
  window.__onGateOpen = () => {
    last = performance.now();
    showScreen('scrTitle');
  };
if (!OPT.sound) setSound(false);
requestAnimationFrame(frame);
