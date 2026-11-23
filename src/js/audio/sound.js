/* ====================================================================================================
 * audio/sound.js
 *
 * Sonido
 *
 * El contexto de audio (Web Audio) y su arranque.
 * ================================================================================================== */

'use strict';

let AC = null,
  noiseBuf = null,
  soundOn = true,
  lastSnd = 0;
function initAudio() {
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 1.0, AC.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let k = 0; k < ch.length; k++) ch[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / ch.length, 2);
    sndInit();
  } catch (e) {
    AC = null;
  }
}
