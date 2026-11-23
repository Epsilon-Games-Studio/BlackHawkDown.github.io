/* ====================================================================================================
 * missions/tutorial/wounded.js
 *
 * 2 · Los heridos, al atardecer
 * ================================================================================================== */

'use strict';

function tutWoundCine() {
  const W = G.m.wd;
  G.m.sunGoal = 17.46;
  G.m.sunRate = 0.0045;
  const g = tzHandOver('Romeo 4-1', W.men, 'Romeo 5-1', 'Rangers · sanidad', W.specs),
    [hale, kow, dunn, cole, ort] = g.members;
  G.m.w = { g, hale, kow, dunn, cole, ort };
  const lie = tzW(...TZ_WD.lie),
    sgt = W.sgt,
    mid = [(lie.x + sgt.x) / 2, (lie.z + sgt.z) / 2];
  camS.tx = mid[0];
  camS.tz = mid[1];
  camS.zoom = camS.zoomT = 8;
  camS.yaw = camS.yawT = -2.55; // un corte, no un barrido por toda la base
  cineStart({
    zoom: 8,
    spin: 0,
    yaw0: -2.55,
    block: true,
    focus: () => mid,
    keys: [
      { t: 0, text: 'Esa tarde, junto a las tiendas de la base. Romeo 5-1, instrucción de sanidad.' },
      {
        t: 1,
        fn: () => tzSay(sgt, 'Romeo 5-1, atentos. Hoy no se dispara: hoy practicamos la atención a los heridos.')
      },
      {
        t: 5.5,
        fn: () =>
          tzSay(
            sgt,
            'Ahí fuera, lo que salva a un hombre son los primeros minutos. Un torniquete a tiempo vale más que un cargador lleno.'
          )
      },
      { t: 11, fn: () => tzSay(sgt, 'Necesito un voluntario.') },
      { t: 13, fn: () => tzSay(dunn, 'Hale se ofrece, sargento.') },
      { t: 15, fn: () => tzSay(hale, '¿Yo? Muchas gracias, Dunn...') },
      {
        t: 17,
        fn: () => {
          tzSay(sgt, 'Hale, al suelo. Te han dado y te estás desangrando. Que se te vea convencido.');
          goTo(hale, lie.x, lie.z);
        }
      },
      {
        t: 20.5,
        fn: () => {
          drillDown(hale);
          tzSay(hale, '¡Ah! ¡Me han dado! ¡Sanitario!');
        }
      },
      {
        t: 23.5,
        fn: () =>
          tzSay(
            sgt,
            'Mirad el suelo alrededor de Hale: ese círculo rojo es su reloj. Un herido que sangra aguanta un minuto en pie; cuando cae, tenéis diez segundos antes de que el círculo se cierre.'
          )
      },
      {
        t: 32,
        fn: () =>
          tzSay(
            sgt,
            'En la ficha de la unidad, su punto también se pone rojo. Si veis rojo, alguien se os está muriendo.'
          )
      },
      {
        t: 37.5,
        fn: () =>
          tzSay(sgt, 'Mientras alguien le atiende, el reloj se para. Ortega, tú eres el sanitario: sácale de esta.')
      },
      { t: 42, fn: () => tzSay(ort, 'Listo, sargento.') }
    ],
    dur: 44,
    tick: () => {
      for (const u of g.members)
        if (u.alive) {
          u.sup = 0;
          if (u !== hale && !u.path.length) u.face = Math.atan2(sgt.x - u.x, sgt.z - u.z);
        }
    },
    onEnd: () => {
      if (hale.alive) {
        const c = findWalk(lie.x, lie.z);
        hale.x = c[0] + 0.5;
        hale.z = c[1] + 0.5;
        drillDown(hale);
      }
      camS.tx = mid[0];
      camS.tz = mid[1];
      camS.zoomT = 9;
      camS.yawT = -2.55;
      G.sel = new Set();
      refreshCards();
      renderSubs();
      hint(MIS.subs[G.sub].tip);
    }
  });
}
function tutDeadStart() {
  const W = G.m.w,
    sgt = G.m.wd.sgt;
  if (!W) return;
  for (const u of W.g.members) {
    if (u.order && u.order.type === 'treat') u.order = null;
  }
  $('oMed').setAttribute('aria-pressed', 'false');
  G.m.dead0 = G.t;
  G.m.slowSaid = false;
  tzSay(sgt, 'Ahora lo peor. Kowalski: estás muerto. Al suelo y no te muevas.');
  sched.push({
    at: G.t + 2.6,
    fn: () => {
      drillKia(W.kow);
      tzSay(W.kow, 'Muerto. Entendido, sargento.');
    }
  });
  sched.push({
    at: G.t + 6,
    fn: () =>
      tzSay(
        sgt,
        'A un muerto no se le deja atrás. Uno de vosotros carga con él, nunca el sanitario: él tiene que tener las manos libres.'
      )
  });
  sched.push({
    at: G.t + 13,
    fn: () => {
      tzSay(sgt, 'Y ahora, toda la unidad hasta la bandera. Fijaos bien en lo que cuesta.');
      const f = tzW(...TZ_WD.flag);
      goTo(sgt, f.x - 2.4, f.z + 1.6);
    }
  });
}
function tutDeadTick() {
  const W = G.m.w;
  if (!W) return;
  const b = W.kow,
    c = b.carriedBy;
  if (!G.m.slowSaid && c && c.path.length && c.moving && G.t - G.m.dead0 > 14) {
    G.m.slowSaid = true;
    sched.push({
      at: G.t + 3,
      fn: () =>
        tzSay(
          G.m.wd.sgt,
          '¿Lo veis? El que carga con él se queda atrás. Con un hombre a cuestas se va mucho más despacio.'
        )
    });
  }
  if (!c && G.t - G.m.dead0 > 16 && tutPlayers().some(u => u.path.length) && G.t > (G.m.deadHint || 0)) {
    G.m.deadHint = G.t + 12;
    hint('Primero, que alguien cargue con Kowalski: deja quietos a los hombres un momento y uno irá a por él.');
  }
}
