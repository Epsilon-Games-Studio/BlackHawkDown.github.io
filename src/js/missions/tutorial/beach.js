/* ====================================================================================================
 * missions/tutorial/beach.js
 *
 * 3 · Apoyo aéreo, por la tarde en la playa (sin bengala: el sargento solo la menciona)
 * ================================================================================================== */

'use strict';

function tutBeachCine() {
  const B_ = G.m.bch;
  G.m.sunGoal = 17.55; // última luz de la tarde, todavía de día: nada de anochecer
  G.m.sunRate = 0.004;
  const g = tzHandOver('Romeo 5-1', B_.men, 'Romeo 6-2', 'Rangers · apoyo aéreo', B_.specs);
  G.m.b = { g };
  if (SUP) {
    SUP.dry = true;
    SUP.lbN = 3;
    SUP.lbCd = 0;
    SUP.flN = 0; // aquí no se lanzan bengalas: solo se habla de ellas
    SUP.flCd = 0;
    updSupBtns();
  }
  const sgt = B_.sgt,
    mid = tzW(-55, 88),
    [briggs, shaw] = g.members,
    W = G.m.w,
    tf = tzW(...TZ_WD.flag),
    T0 = 6;
  cineStart({
    zoom: 10,
    spin: 0,
    yaw0: -2.55,
    block: true,
    focus: () => (CINE.t < T0 ? [tf.x, tf.z] : [mid.x, mid.z]),
    keys: [
      {
        t: 2,
        fn: () => {
          if (W) drillRevive(W.kow);
        }
      },
      {
        t: T0,
        fn: () => {
          G.m.noLitter = true; // en la playa no hay papeles ni basura
          CINE.zoom = 12;
          CINE.yaw0 = AIR_RY;
          camS.tx = mid.x;
          camS.tz = mid.z;
          camS.zoom = camS.zoomT = 12;
          camS.yaw = camS.yawT = AIR_RY;
        }
      },
      { t: T0, text: 'Por la tarde, en la playa frente al campo de instrucción. Romeo 6-2, apoyo aéreo.' },
      {
        t: T0 + 2,
        fn: () => tzSay(sgt, 'Romeo 6-2, atentos. Esta tarde toca apoyo aéreo.')
      },
      {
        t: T0 + 7,
        fn: () =>
          tzSay(
            sgt,
            'Los Little Bird de Star 4-2 nos cubren desde el aire. Marcáis una línea en el suelo y la barren de punta a punta, con la minigun y los cohetes.'
          )
      },
      {
        t: T0 + 14,
        fn: () =>
          tzSay(
            sgt,
            'Todo lo que hay dentro de esa línea cae. Los nuestros también. Así que mirad muy bien dónde la dibujáis.'
          )
      },
      { t: T0 + 20, fn: () => tzSay(shaw, '¿Y si fallamos con la línea, sargento?') },
      { t: T0 + 22.5, fn: () => tzSay(sgt, 'Entonces lo lamentáis toda la vida, Shaw.') },
      {
        t: T0 + 25.5,
        fn: () =>
          tzSay(sgt, 'Ahí en el agua tenéis dos boyas amarillas. Pedid una pasada que vaya de una boya a la otra.')
      },
      {
        t: T0 + 31,
        fn: () => tzSay(sgt, 'Hoy es en seco: el helicóptero hará la pasada, pero no va a malgastar munición.')
      },
      { t: T0 + 35.5, fn: () => tzSay(briggs, 'Entendido. Romeo 6-2, atentos.') }
    ],
    dur: T0 + 38,
    tick: () => {
      for (const u of g.members) if (u.alive) u.sup = 0;
    },
    onEnd: () => {
      camS.tx = mid.x;
      camS.tz = mid.z;
      camS.zoomT = 13;
      camS.yawT = AIR_RY;
      G.sel = new Set(g.members.filter(u => u.alive));
      refreshCards();
      renderSubs();
      hint(MIS.subs[G.sub].tip);
    }
  });
}
// el final: el sargento repasa lo de la noche (visores y bengalas) solo de palabra, y se acaba la instrucción
function tutBeachEnd() {
  const sgt = G.m.bch.sgt,
    mid = tzW(-55, 88);
  cineStart({
    zoom: 13,
    spin: 0.004,
    yaw0: AIR_RY,
    block: true,
    focus: () => [mid.x, mid.z],
    keys: [
      { t: 0.5, fn: () => tzSay(sgt, 'Así se pide una pasada: corta, limpia y lejos de los nuestros.') },
      {
        t: 5.5,
        fn: () =>
          tzSay(
            sgt,
            'Y una cosa más. De noche, los visores de visión nocturna van siempre encima. El que los deje en la base lo va a lamentar.'
          )
      },
      {
        t: 12,
        fn: () =>
          tzSay(
            sgt,
            'Si no basta, se piden bengalas. Iluminan toda la zona... pero a todos: ellos también nos verán a nosotros.'
          )
      },
      {
        t: 18.5,
        fn: () =>
          tzSay(
            sgt,
            'Se acabó la instrucción por hoy. Cenad, dormid y revisad el equipo: mañana puede tocar de verdad.'
          )
      }
    ],
    dur: 25
  });
}
