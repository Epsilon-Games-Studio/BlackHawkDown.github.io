/* ====================================================================================================
 * units/living-body.js
 *
 * El cuerpo vivo: lo que hace que un hombre parado no parezca un maniquí.
 *  · Una capa continua: la mirada salta de un punto a otro (la cabeza llega primero, el pecho la sigue tarde y a medias), el peso
 *    pasa de una pierna a otra y la rodilla libre se afloja, el tronco se mece con la respiración. Con miedo todo va más rápido y encogido.
 *  · Un catálogo de gestos (GESTURES): beber de la cantimplora, mirar el reloj, secarse el sudor, colocarse el casco, comprobar el
 *    cargador, otear el cielo… Cada uno dice quién lo hace (nuestros, milicia, civiles), en qué postura y cuánto dura, y su
 *    movimiento son curvas sobre el tiempo, no una pose fija.
 *  · Reacciones al impacto según dónde dé la bala (pierna, brazo, hombro, tronco, roce en la cabeza).
 *  · Asomarse por encima de la cobertura baja: agachado detrás de sacos o de un murete, se levanta para disparar y se esconde entre ráfagas.
 *  · Cuatro maneras de recargar (normal, inclinando el arma, sacando el cargador del chaleco, rápida sin quitar ojo) y recargar
 *    rodilla en tierra cuando aprietan.
 * liveBody() devuelve los canales que animRig suma o mezcla en su sitio (tronco, cabeza, pelvis, brazos, rodillas, arma).
 * ================================================================================================== */

const _lbSS = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// sube en [a0,a1], se mantiene y baja en [b0,b1] (todo en tiempo normalizado 0..1)
const lbEnv = (p, a0, a1, b0, b1) => _lbSS(a0, a1, p) * (1 - _lbSS(b0, b1, p));
const lbBell = (p, c, w) => Math.exp(-Math.pow((p - c) / w, 2));

/* Cada gesto: who (quién: 'us' nuestros, 'them' milicia, 'civ' civiles, 'nogun' cualquiera sin arma), st (postura: 'stand',
   'crouch' o 'any'), d (duración en s), calm (solo sin amenaza), fear (solo con miedo), w (peso en el sorteo) y f(p, G, dir, t),
   que rellena los canales para el instante p (0..1). Brazo izquierdo: Lx (adelante/arriba negativo), Lz (hacia dentro negativo),
   Lf (codo), Lw (muñeca) y Lb (cuánto manda el gesto sobre el brazo). Igual el derecho con R*. */
const GESTURES = {
  scan: {
    who: 'all', st: 'any', d: [2.2, 3.4], w: 3,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.18, 0.82, 1);
      G.hy += dir * (0.9 * _lbSS(0.05, 0.25, p) - 1.8 * _lbSS(0.45, 0.65, p) * a) * a;
      G.tw += dir * 0.25 * a * (1 - 2 * _lbSS(0.45, 0.65, p));
      G.hp -= 0.08 * a;
    }
  },
  lookBack: {
    who: 'all', st: 'stand', d: [1.6, 2.4], w: 2,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.25, 0.7, 1);
      G.hy += dir * 1.25 * a;
      G.tw += dir * 0.45 * a;
      G.pz += dir * 0.03 * a;
    }
  },
  sky: {
    // otea el cielo buscando los helicópteros, haciéndose sombra con la mano
    who: 'all', st: 'any', d: [2.4, 3.6], w: 2,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.2, 0.78, 1);
      G.hp -= 0.6 * a;
      G.hy += dir * Math.sin(p * 4) * 0.35 * a;
      G.tor -= 0.08 * a;
      G.L(-2.45, -0.85, -2.05, 0.5, a);
    }
  },
  neck: {
    // estira el cuello
    who: 'all', st: 'any', d: [2.0, 2.8], w: 1.5, calm: true,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.hr += dir * Math.sin(p * Math.PI * 2) * 0.35 * a;
      G.hp += Math.sin(p * Math.PI * 2 + 1.5) * 0.2 * a;
    }
  },
  shoulders: {
    who: 'all', st: 'any', d: [1.4, 2.0], w: 1.2,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1),
        s = Math.sin(p * Math.PI * 2);
      G.rl += s * 0.06 * a;
      G.tor -= Math.max(0, s) * 0.06 * a;
      G.py += Math.max(0, s) * 0.01 * a;
    }
  },
  brow: {
    // se seca el sudor de la frente con el dorso de la mano
    who: 'all', st: 'any', d: [1.5, 2.1], w: 2.2,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.L(-2.55, -0.75 + 0.6 * _lbSS(0.35, 0.65, p), -2.3, 0.2, a);
      G.hp += 0.18 * a;
      G.hy -= 0.15 * a * (_lbSS(0.35, 0.65, p) - 0.5);
    }
  },
  canteen: {
    // bebe de la cantimplora: la mano va al costado, sube a la boca, la cabeza se echa atrás y vuelve
    who: 'us', st: 'any', d: [3.2, 4.2], w: 2, calm: true,
    f(p, G) {
      const fetch = lbEnv(p, 0, 0.12, 0.88, 1),
        up = lbEnv(p, 0.16, 0.3, 0.72, 0.84);
      G.L(sm(0.25, -2.05, up), sm(0.35, -0.95, up), sm(-0.9, -2.35, up), 0.4 * up, fetch);
      G.hp -= 0.55 * lbEnv(p, 0.28, 0.38, 0.62, 0.72);
      G.tor -= 0.08 * up;
    }
  },
  watch: {
    // mira el reloj
    who: 'us', st: 'any', d: [1.5, 2.2], w: 1.8,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.L(-1.0, -0.55, -1.95, 0.6, a);
      G.hp += 0.48 * lbEnv(p, 0.15, 0.3, 0.7, 0.85);
      G.hy -= 0.15 * a;
    }
  },
  mag: {
    // palpa el cargador: lo empuja para asegurarse de que está bien puesto
    who: 'armed', st: 'any', d: [1.2, 1.7], w: 2,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1),
        tap = lbBell(p, 0.45, 0.06) + lbBell(p, 0.58, 0.05);
      G.gz += 0.35 * a;
      G.gx += 0.1 * a;
      G.hp += 0.35 * a;
      G.Lb = Math.max(G.Lb, 0);
      G.gpy += 0.02 * tap;
    }
  },
  chamber: {
    // comprueba la recámara: inclina el arma y mira por la ventana de expulsión
    who: 'armed', st: 'any', d: [1.6, 2.2], w: 1.5,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.gz += 0.85 * a;
      G.gy += 0.25 * a;
      G.gx -= 0.2 * a;
      G.hp += 0.4 * a;
      G.hr += 0.18 * a;
    }
  },
  helmet: {
    // se coloca el casco o la gorra
    who: 'all', st: 'any', d: [1.3, 1.8], w: 1.5,
    f(p, G) {
      const a = lbEnv(p, 0, 0.3, 0.7, 1),
        pull = lbBell(p, 0.5, 0.1);
      G.L(-2.75, -0.5, -2.05 - 0.15 * pull, 0.2, a);
      G.hp += 0.1 * pull;
    }
  },
  nape: {
    // se frota la nuca
    who: 'all', st: 'any', d: [1.8, 2.6], w: 1.2,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1),
        rub = Math.sin(p * 22) * 0.12;
      G.L(-2.7, -0.2 + rub, -2.5, 0.3, a);
      G.hp += 0.22 * a;
    }
  },
  weight: {
    // cambia el peso de pierna: la cadera se va a un lado y la otra rodilla se afloja
    who: 'all', st: 'stand', d: [2.6, 4], w: 3,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.3, 0.75, 1);
      G.pz += dir * 0.085 * a;
      G.rl -= dir * 0.035 * a;
      G.py -= 0.012 * a;
      if (dir > 0) G.kR += 0.3 * a;
      else G.kL += 0.3 * a;
    }
  },
  squat: {
    // se agacha un momento para descansar las piernas
    who: 'all', st: 'stand', d: [2.4, 3.2], w: 1, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.3, 0.7, 1);
      G.kL += 0.9 * a;
      G.kR += 0.9 * a;
      G.hL -= 0.55 * a;
      G.hR -= 0.55 * a;
      G.py -= 0.12 * a;
      G.tor += 0.25 * a;
    }
  },
  backStretch: {
    who: 'all', st: 'stand', d: [2.0, 2.8], w: 1, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.3, 0.7, 1);
      G.tor -= 0.28 * a;
      G.hp -= 0.3 * a;
      G.L(-0.1, 0.25, -2.0, 0.6, a * 0.8);
    }
  },
  kneeRub: {
    // agachado, se frota la rodilla
    who: 'all', st: 'crouch', d: [1.8, 2.6], w: 1.5,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.L(-0.55, -0.15, -0.35 + Math.sin(p * 20) * 0.12, 0.2, a);
      G.tor += 0.2 * a;
      G.hp += 0.3 * a;
    }
  },
  spit: {
    who: 'all', st: 'any', d: [0.9, 1.2], w: 0.8,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.3, 0.6, 1),
        j = lbBell(p, 0.5, 0.06);
      G.hy += dir * 0.6 * a;
      G.hp += 0.25 * j - 0.1 * a;
      G.tor += 0.08 * j;
    }
  },
  cough: {
    who: 'all', st: 'any', d: [1.4, 1.9], w: 1,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.8, 1),
        k = lbBell(p, 0.3, 0.04) + lbBell(p, 0.45, 0.04) + lbBell(p, 0.62, 0.05);
      G.L(-2.0, -0.95, -2.35, 0.3, a);
      G.tor += 0.14 * k;
      G.hp += 0.22 * k;
    }
  },
  yawn: {
    who: 'all', st: 'any', d: [2.2, 3.0], w: 0.8, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0.1, 0.35, 0.65, 0.95);
      G.hp -= 0.4 * a;
      G.tor -= 0.1 * a;
      G.L(-2.0, -0.9, -2.3, 0.2, lbEnv(p, 0.25, 0.4, 0.6, 0.75));
    }
  },
  doze: {
    // el cansancio: la cabeza se le cae y la levanta de golpe
    who: 'all', st: 'any', d: [2.6, 3.4], w: 0.6, calm: true, tired: true,
    f(p, G) {
      const drop = _lbSS(0.05, 0.6, p) * (1 - _lbSS(0.62, 0.7, p));
      G.hp += 0.6 * drop;
      G.tor += 0.1 * drop;
      G.py -= 0.01 * drop;
    }
  },
  earpiece: {
    // aprieta el auricular para oír mejor la radio
    who: 'us', st: 'any', d: [1.8, 2.6], w: 1.6,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1);
      G.L(-2.25, -0.75, -2.3, 0.3, a);
      G.hr += 0.2 * a;
      G.hp += 0.1 * a;
    }
  },
  point: {
    // señala algo a lo lejos
    who: 'all', st: 'any', d: [1.5, 2.1], w: 1.2,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.25, 0.7, 1),
        j = lbBell(p, 0.45, 0.07);
      G.L(-1.55 - 0.15 * j, 0.1 + dir * 0.35, -0.2, 0, a);
      G.hy += (0.3 + dir * 0.35) * a;
    }
  },
  thumb: {
    who: 'us', st: 'any', d: [1.0, 1.4], w: 0.7,
    f(p, G) {
      const a = lbEnv(p, 0, 0.3, 0.7, 1);
      G.L(-1.3, -0.1, -1.7, 0.3, a);
    }
  },
  muzzleUp: {
    // descansa el fusil con el cañón hacia arriba
    who: 'armed', st: 'any', d: [2.4, 3.6], w: 1.5,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.gx -= 0.95 * a;
      G.gpy += 0.08 * a;
      G.Lb = Math.max(G.Lb, 0);
      G.L(-0.15, 0.05, -0.35, 0, a * 0.85);
    }
  },
  hang: {
    // deja colgar el fusil y suelta la mano izquierda
    who: 'armed', st: 'stand', d: [2.6, 3.8], w: 1.4, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.gx += 0.6 * a;
      G.gpy -= 0.05 * a;
      G.L(0.08, 0.12, -0.15 - Math.sin(p * 9) * 0.05, 0, a);
    }
  },
  fist: {
    // abre y cierra la mano entumecida
    who: 'all', st: 'any', d: [1.4, 2], w: 0.8,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1);
      G.L(-0.7, -0.25, -1.6, 0.6 * Math.sin(p * 18), a);
      G.hp += 0.25 * a;
    }
  },
  tap: {
    // golpecitos con el pie
    who: 'all', st: 'stand', d: [1.6, 2.4], w: 0.8,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.kL += Math.max(0, Math.sin(p * 30)) * 0.18 * a;
      G.hL -= Math.max(0, Math.sin(p * 30)) * 0.08 * a;
    }
  },
  strap: {
    // tira de la correa del fusil o del chaleco
    who: 'armed', st: 'any', d: [1.2, 1.7], w: 1.3,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1),
        tug = lbBell(p, 0.5, 0.08);
      G.L(-1.6 + 0.2 * tug, -0.5, -2.4, 0.2, a);
      G.rl += 0.06 * tug;
      G.py += 0.008 * tug;
    }
  },
  nervous: {
    // con miedo: la cabeza va de un lado a otro a saltos
    who: 'all', st: 'any', d: [1.6, 2.2], w: 2, fear: true,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.1, 0.9, 1),
        s = p < 0.3 ? 1 : p < 0.55 ? -1 : p < 0.8 ? 0.6 : -0.3;
      G.hy += dir * s * 0.75 * a;
      G.tor += 0.08 * a;
    }
  },
  rise: {
    // agachado, se incorpora un poco para ver por encima
    who: 'all', st: 'crouch', d: [1.8, 2.6], w: 2,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.3, 0.7, 1);
      G.py += 0.09 * a;
      G.kL -= 0.35 * a;
      G.kR -= 0.35 * a;
      G.hp -= 0.15 * a;
      G.hy += dir * Math.sin(p * 5) * 0.4 * a;
    }
  },
  crossed: {
    // de brazos cruzados (civiles)
    who: 'nogun', st: 'stand', d: [4, 7], w: 3,
    f(p, G) {
      const a = lbEnv(p, 0, 0.12, 0.88, 1);
      G.L(-1.05, -0.8, -2.05, 0.2, a);
      G.R(-1.05, 0.8, -2.05, a);
      G.tor -= 0.04 * a;
    }
  },
  hips: {
    // con las manos en la cintura
    who: 'nogun', st: 'stand', d: [3.5, 6], w: 2.5,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.L(0.3, 0.55, -1.7, 0.4, a);
      G.R(0.3, -0.55, -1.7, a);
      G.tor -= 0.05 * a;
    }
  },
  headScratch: {
    who: 'all', st: 'any', d: [1.5, 2.2], w: 1,
    f(p, G) {
      const a = lbEnv(p, 0, 0.3, 0.75, 1);
      G.L(-2.8, -0.45 + Math.sin(p * 26) * 0.1, -2.15, 0.2, a);
      G.hp += 0.12 * a;
      G.hr -= 0.1 * a;
    }
  },
  khat: {
    // la milicia mascando khat: la mano a la boca una y otra vez
    who: 'them', st: 'any', d: [3, 4.5], w: 2, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.1, 0.9, 1),
        b = Math.max(0, Math.sin(p * Math.PI * 4));
      G.L(sm(-0.7, -2.0, b), sm(-0.3, -0.95, b), sm(-1.2, -2.35, b), 0.3, a);
      G.hp += Math.sin(p * 40) * 0.03 * a;
    }
  },
  shrug: {
    who: 'all', st: 'any', d: [1.0, 1.4], w: 0.8,
    f(p, G) {
      const a = lbBell(p, 0.45, 0.2);
      G.py += 0.015 * a;
      G.hr += 0.12 * a;
      G.L(-0.5, 0.45, -1.4, -0.6, a);
    }
  },
  wave: {
    // un civil que saluda o llama a alguien
    who: 'nogun', st: 'stand', d: [1.6, 2.4], w: 1,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1);
      G.L(-2.85, 0.3 + Math.sin(p * 24) * 0.35, -0.55, 0, a);
      G.hp -= 0.1 * a;
    }
  },
  pray: {
    // un civil con las manos juntas
    who: 'civ', st: 'stand', d: [3, 5], w: 0.8,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.L(-0.9, -0.85, -2.2, 0.3, a);
      G.R(-0.9, 0.85, -2.2, a);
      G.hp += 0.35 * a;
    }
  },
  gunShoulder: {
    // la milicia apoya el fusil en el hombro, cañón arriba
    who: 'them', st: 'stand', d: [3, 5], w: 1.5, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1);
      G.gx -= 1.25 * a;
      G.gpy += 0.14 * a;
      G.gpx += 0.05 * a;
      G.L(0.1, 0.1, -0.2, 0, a);
    }
  },
  explain: {
    // explicar: la mano abierta marca el ritmo de las palabras, la cabeza asiente; solo lo usan los instructores (w: 0)
    who: 'none', st: 'any', d: [2.2, 3.4], w: 0,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1),
        beat = Math.max(0, Math.sin(p * Math.PI * 7)),
        sw = Math.sin(p * Math.PI * 2.5);
      G.L(-1.25 - beat * 0.25, 0.25 + sw * 0.35, -1.0 - beat * 0.4, -0.7 + beat * 0.3, a);
      G.hp += (0.06 - beat * 0.08) * a;
      G.hy += dir * sw * 0.15 * a;
      G.tw += dir * sw * 0.08 * a;
    }
  },
  smoke: {
    // un cigarrillo: la mano a la boca, una calada larga y el humo fuera
    who: 'notus', st: 'any', d: [3.5, 5], w: 1.5, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.1, 0.9, 1),
        drag = lbEnv(p, 0.2, 0.32, 0.5, 0.6);
      G.L(sm(-0.9, -2.0, drag), sm(-0.35, -0.95, drag), sm(-1.5, -2.35, drag), 0.3, a);
      G.hp -= 0.2 * lbBell(p, 0.66, 0.06);
    }
  },
  // los de las escenas de cine (who: 'none': el juego nunca los elige solo, los pide la escena)
  reach: {
    // la multitud del reparto: los dos brazos arriba hacia el camión, pidiendo, cada uno a su ritmo
    who: 'none', st: 'stand', d: [1.8, 2.8], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.12, 0.9, 1),
        k = Math.sin(t * 6.5 + dir * 1.3),
        k2 = Math.sin(t * 5.7 + 1.9 + dir);
      G.L(-2.5 + k * 0.28, 0.22 + k2 * 0.12, -0.3 - Math.max(0, k) * 0.45, 0.35 * k, a);
      G.R(-2.35 + k2 * 0.28, -0.22 - k * 0.1, -0.35 - Math.max(0, k2) * 0.45, a);
      G.hp -= 0.34 * a;
      G.tor -= 0.05 * a;
      G.py += 0.025 * Math.max(0, k) * a;
    }
  },
  clamor: {
    // un brazo en alto que se agita, la mano abierta, y la cabeza arriba gritando
    who: 'none', st: 'stand', d: [1.4, 2.2], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1),
        k = Math.sin(t * 13);
      if (dir > 0) G.L(-2.75, 0.32 + k * 0.3, -0.45 - Math.max(0, k) * 0.3, 0.3 * k, a);
      else G.R(-2.75, -0.32 - k * 0.3, -0.45 - Math.max(0, k) * 0.3, a);
      G.hp -= 0.3 * a;
      G.hy += Math.sin(t * 2.6) * 0.25 * a;
      G.tor += 0.04 * Math.max(0, k) * a;
    }
  },
  handsUp: {
    // el detenido: las dos manos en alto, abiertas, y la cabeza un poco gacha
    who: 'none', st: 'any', d: [3, 4], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.1, 0.95, 1),
        k = Math.sin(t * 1.7) * 0.05;
      G.L(-2.75 + k, 0.42, -0.35, 0.2, a);
      G.R(-2.75 - k, -0.42, -0.35, a);
      G.hp += 0.18 * a;
      G.tor += 0.04 * a;
    }
  },
  shove: {
    // empujar con las dos manos al de delante para llegar a los sacos
    who: 'none', st: 'stand', d: [0.9, 1.4], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.1, 0.8, 1),
        k = Math.max(0, Math.sin(p * Math.PI * 2.2)),
        e = 1 - k;
      G.L(-1.35 - k * 0.2, -0.15, -1.5 * e, 0, a);
      G.R(-1.35 - k * 0.2, 0.15, -1.5 * e, a);
      G.tor += 0.22 * k * a;
      G.pz += 0.07 * k * a;
      G.hp += 0.1 * a;
    }
  },
  megaphone: {
    // el megáfono en la boca con la izquierda y la derecha señalando y barriendo a la gente
    who: 'none', st: 'any', d: [3.5, 4.5], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.12, 0.92, 1),
        k = Math.sin(t * 1.8);
      G.L(-1.55, -0.55, -2.25, 0, a);
      G.hy += k * 0.3 * a;
      G.hp -= 0.05 * a;
    }
  },
  harangue: {
    // el que manda desde arriba: el brazo libre señala y barre a la gente
    who: 'none', st: 'stand', d: [2.2, 3.2], w: 0,
    f(p, G, dir, t) {
      const a = lbEnv(p, 0, 0.12, 0.88, 1),
        k = Math.sin(t * 2.2);
      G.L(-1.55 + Math.sin(t * 7) * 0.12, 0.35 + k * 0.35, -0.12, 0, a);
      G.hy += k * 0.35 * a;
      G.tor += 0.06 * a;
      G.hp += 0.08 * a;
    }
  },
  argue: {
    // discute: la mano libre corta el aire
    who: 'them', st: 'stand', d: [2.5, 4], w: 1.2,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.12, 0.88, 1),
        k = Math.sin(p * 17);
      G.L(-1.3 + k * 0.35, 0.2 + Math.sin(p * 9) * 0.25, -0.6 - Math.max(0, k) * 0.5, -0.5, a);
      G.hy += dir * 0.3 * a;
      G.tor += 0.06 * Math.max(0, k) * a;
    }
  },
  leanRifle: {
    // la milicia se apoya en el fusil con la culata en el suelo
    who: 'them', st: 'stand', d: [4, 7], w: 1, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.gx += 1.2 * a;
      G.gpy -= 0.12 * a;
      G.gpz += 0.08 * a;
      G.L(-0.55, -0.15, -0.4, 0, a);
      G.tor += 0.1 * a;
      G.pz += 0.05 * a;
    }
  },
  carryHead: {
    // un civil con un fardo o un bidón sobre la cabeza
    who: 'civ', st: 'stand', d: [4, 7], w: 1,
    f(p, G) {
      const a = lbEnv(p, 0, 0.15, 0.85, 1);
      G.L(-2.95, -0.35, -1.0, 0, a);
      G.R(-2.95, 0.35, -1.0, a);
      G.tor -= 0.05 * a;
    }
  },
  boot: {
    // agachado, se ata la bota
    who: 'us', st: 'crouch', d: [2.8, 4], w: 1, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1),
        t = Math.sin(p * 24) * 0.1;
      G.L(-0.15, -0.1 + t, -0.25, 0.3, a);
      G.tor += 0.45 * a;
      G.hp += 0.4 * a;
    }
  },
  map: {
    // mira el mapa
    who: 'us', st: 'any', d: [3, 4.5], w: 1,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1),
        up = lbBell(p, 0.6, 0.08);
      G.L(-1.0, -0.6, -1.85, 0.5, a);
      G.hp += (0.5 - 0.6 * up) * a;
      G.hy += dir * 0.6 * up;
    }
  },
  compass: {
    // la brújula a la altura del pecho, la vista arriba y abajo
    who: 'us', st: 'any', d: [2.4, 3.2], w: 0.8,
    f(p, G, dir) {
      const a = lbEnv(p, 0, 0.2, 0.8, 1),
        up = Math.max(0, Math.sin(p * Math.PI * 3));
      G.L(-0.85, -0.55, -2.05, 0.5, a);
      G.hp += (0.45 - 0.55 * up) * a;
      G.hy += dir * 0.25 * up * a;
    }
  },
  rubEyes: {
    // se frota los ojos (polvo, cansancio)
    who: 'all', st: 'any', d: [1.5, 2.2], w: 1,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1);
      G.L(-2.25, -0.95 + Math.sin(p * 30) * 0.06, -2.4, 0.3, a);
      G.hp += 0.25 * a;
    }
  },
  knuckles: {
    who: 'all', st: 'any', d: [1.2, 1.6], w: 0.6,
    f(p, G) {
      const a = lbEnv(p, 0, 0.25, 0.75, 1),
        c = lbBell(p, 0.5, 0.05);
      G.L(-0.9, -0.7, -1.9, 0.6 * c, a);
      G.hp += 0.2 * a;
      G.rl += 0.04 * c;
    }
  },
  armStretch: {
    // estira el brazo por encima de la cabeza
    who: 'all', st: 'stand', d: [1.8, 2.4], w: 0.8, calm: true,
    f(p, G) {
      const a = lbEnv(p, 0, 0.35, 0.65, 1);
      G.L(-3.0, 0.15, -0.2, 0, a);
      G.rl -= 0.08 * a;
      G.hp -= 0.12 * a;
    }
  }
};
const GESTURE_KEYS = Object.keys(GESTURES);
// los canales de un fotograma (un objeto por unidad, reutilizado)
function lbChannels(m) {
  const G = m.lbG || (m.lbG = {});
  G.tor = G.tw = G.rl = G.pz = G.py = G.hp = G.hy = G.hr = 0;
  G.kL = G.kR = G.hL = G.hR = 0;
  G.gx = G.gy = G.gz = G.gpx = G.gpy = G.gpz = 0;
  G.Lx = G.Lz = G.Lf = G.Lw = G.Lb = 0;
  G.Rx = G.Rz = G.Rf = G.Rb = 0;
  G.ws = 1; // peso con el que entra lo que se pida ahora (lbScaled)
  if (!G.L) {
    // mezcla los objetivos de un brazo: si dos cosas lo piden, la más fuerte manda
    G.L = (x, z, f, w_, b) => {
      b *= G.ws;
      if (b <= 0) return;
      const k = G.Lb + b > 0 ? b / (G.Lb + b) : 1;
      G.Lx = sm(G.Lx, x, k);
      G.Lz = sm(G.Lz, z, k);
      G.Lf = sm(G.Lf, f, k);
      G.Lw = sm(G.Lw, w_, k);
      G.Lb = Math.max(G.Lb, b);
    };
    G.R = (x, z, f, b) => {
      b *= G.ws;
      if (b <= 0) return;
      const k = G.Rb + b > 0 ? b / (G.Rb + b) : 1;
      G.Rx = sm(G.Rx, x, k);
      G.Rz = sm(G.Rz, z, k);
      G.Rf = sm(G.Rf, f, k);
      G.Rb = Math.max(G.Rb, b);
    };
  }
  return G;
}
// ¿quién puede hacer este gesto?
function gestureOk(g, u, m, fear) {
  const armed = !m.noGun && u.team !== 'civ';
  if (g.who === 'us' && u.team !== 'us') return false;
  if (g.who === 'them' && u.team !== 'them') return false;
  if (g.who === 'civ' && u.team !== 'civ') return false;
  if (g.who === 'notus' && u.team === 'us') return false;
  if (g.who === 'none') return false;
  if (g.who === 'armed' && !armed) return false;
  if (g.who === 'nogun' && armed) return false;
  if (g.st === 'stand' && u.stance !== 'stand') return false;
  if (g.st === 'crouch' && u.stance !== 'crouch') return false;
  if (g.calm && fear) return false;
  if (g.fear && !fear) return false;
  if (g.tired && (m.fat || 0) < 0.25 && rnd() < 0.8) return false;
  return true;
}
function pickGesture(u, m, fear) {
  let tot = 0;
  const ok = [];
  for (const k of GESTURE_KEYS) {
    const g = GESTURES[k];
    if (k === m.lbLast || !gestureOk(g, u, m, fear)) continue;
    ok.push(k);
    tot += g.w;
  }
  let r = rnd() * tot;
  for (const k of ok) if ((r -= GESTURES[k].w) <= 0) return k;
  return ok[0];
}
// ¿hay cobertura baja (sacos, murete, coche) entre él y el enemigo? Se mira cada medio segundo
function lowCoverToward(u, tgt) {
  let dx = tgt.x - u.x,
    dz = tgt.z - u.z;
  const L = Math.hypot(dx, dz) || 1;
  dx /= L;
  dz /= L;
  const i = Math.floor(u.x + dx * 0.9),
    j = Math.floor(u.z + dz * 0.9);
  if (!inB(i, j)) return false;
  const k = idx(i, j);
  return grid[k] === 2 && !!cov[k];
}
const HIT_ZONES = [
  ['torso', 0.42],
  ['legL', 0.12],
  ['legR', 0.12],
  ['armL', 0.1],
  ['armR', 0.08],
  ['shoulder', 0.1],
  ['head', 0.06]
];
// al recibir un balazo que no mata: dónde le ha dado
function hitZone(u) {
  if (!u.m) return;
  let r = rnd();
  for (const [k, w_] of HIT_ZONES) if ((r -= w_) <= 0) return (u.m.hitZ = k);
  u.m.hitZ = 'torso';
}
// las maneras de recargar
const RELOAD_STYLES = ['std', 'std', 'tilt', 'pouch', 'fast'];

function liveBody(u, m, c, dt, still, busy, tgt) {
  const G = lbChannels(m);
  if (!u.alive || u.down || c.lie > 0.4 || u.carriedBy) {
    m.lbGst = null;
    return G;
  }
  const fear = u.sup > 25 || u.pinned,
    calm = !fear && !tgt,
    talk = m.talkB > 0.2 || (m.sigB || 0) > 0.2 || m.healB > 0.2;
  m.lbT = (m.lbT || 0) + dt;
  // 1. La mirada: un punto nuevo cada pocos segundos (más a menudo con miedo); la cabeza llega rápido, el pecho la sigue despacio
  if (!m.lbLook) m.lbLook = { y: 0, p: 0, t: rr(0.5, 2), hy: 0, hv: 0, hp: 0, pv: 0, cy: 0 };
  const Lk = m.lbLook;
  Lk.t -= dt;
  if (Lk.t <= 0) {
    const mv = u.moving ? 0.45 : 1;
    Lk.y = tgt ? rr(-0.12, 0.12) : rr(-0.85, 0.85) * mv;
    Lk.p = tgt ? 0 : rr(-0.12, 0.2) * mv;
    Lk.t = tgt ? rr(0.6, 1.4) : fear ? rr(0.5, 1.4) : rr(1.4, 4.2);
  }
  {
    const n = Math.ceil(Math.min(dt, 0.25) / 0.02),
      h = Math.min(dt, 0.25) / n,
      k = fear ? 140 : 70,
      d = 2 * Math.sqrt(k) * 0.9;
    for (let i = 0; i < n; i++) {
      Lk.hv += (k * (Lk.y - Lk.hy) - d * Lk.hv) * h;
      Lk.hy += Lk.hv * h;
      Lk.pv += (k * (Lk.p - Lk.hp) - d * Lk.pv) * h;
      Lk.hp += Lk.pv * h;
    }
    Lk.cy += (Lk.hy - Lk.cy) * (1 - Math.exp(-1.6 * dt));
  }
  const lookW = talk ? 0.2 : busy && !tgt ? 0.4 : 1;
  G.hy += Lk.hy * 0.75 * lookW;
  G.hp += Lk.hp * lookW;
  G.tw += Lk.cy * 0.28 * lookW;
  // 2. El peso y el balanceo: nunca del todo quieto
  const t = m.lbT + (m.lbSeed || (m.lbSeed = rnd() * 100));
  const sway = Math.sin(t * 0.37) * 0.6 + Math.sin(t * 0.91 + 1.3) * 0.4;
  G.tor += sway * 0.018 * still + (fear ? 0.06 : 0) * still;
  G.rl += Math.sin(t * 0.53 + 2.1) * 0.02 * still;
  G.hr += Math.sin(t * 0.71 + 0.4) * 0.04 * still;
  if (u.stance === 'stand' && still > 0.5 && !tgt) {
    m.lbWT = (m.lbWT || rr(3, 6)) - dt;
    if (m.lbWT <= 0) {
      m.lbWS = -(m.lbWS || 1);
      m.lbWT = rr(4, 9);
    }
    m.lbW = sm(m.lbW || 0, m.lbWS || 1, 1 - Math.exp(-1.2 * dt));
    const ws = m.lbW * still;
    G.pz += ws * 0.05;
    G.rl -= ws * 0.02;
    if (ws > 0) G.kR += ws * 0.18;
    else G.kL -= ws * 0.18;
  }
  // 3. Un gesto del catálogo, de vez en cuando, si no está haciendo nada
  const free = u.alive && still > 0.8 && !busy && !u.moving && !talk && !m.fid && !(u.tripT > 0);
  if (!m.lbGst && free) {
    m.lbGT = (m.lbGT == null ? (u.team === 'civ' ? rr(0.3, 2) : rr(2, 7)) : m.lbGT) - dt;
    if (m.lbGT <= 0) {
      const k = pickGesture(u, m, fear);
      if (k) {
        const g = GESTURES[k];
        m.lbGst = { k, t: 0, d: rr(g.d[0], g.d[1]), dir: rnd() < 0.5 ? -1 : 1 };
        m.lbLast = k;
      }
      m.lbGT = u.team === 'civ' ? rr(1, 3) : fear ? rr(2.5, 6) : rr(3.5, 9);
    }
  }
  if (m.lbGst) {
    const S = m.lbGst;
    if (!free && S.t > 0.05 && !S.force) S.t = Math.max(S.t, S.d * 0.82); // lo interrumpen: lo termina deprisa
    S.t += dt;
    const p = clamp(S.t / S.d, 0, 1);
    GESTURES[S.k].f(p, G, S.dir, S.t);
    if (p >= 1) m.lbGst = null;
  }
  // 4. El balazo: cada zona reacciona a su manera
  const hb = m.hit || 0;
  if (hb > 0.01 && m.hitZ) {
    const s = m.hitSide || 1;
    switch (m.hitZ) {
      case 'legL':
        G.kL += 1.0 * hb;
        G.hL -= 0.45 * hb;
        G.py -= 0.1 * hb;
        G.pz -= 0.08 * hb;
        G.tor += 0.15 * hb;
        break;
      case 'legR':
        G.kR += 1.0 * hb;
        G.hR -= 0.45 * hb;
        G.py -= 0.1 * hb;
        G.pz += 0.08 * hb;
        G.tor += 0.15 * hb;
        break;
      case 'armL':
        G.L(-0.3, 0.7, -0.4, 0.4, hb);
        G.rl += 0.1 * hb;
        break;
      case 'armR':
        G.R(0.25, -0.5, -0.35, hb * 0.8);
        G.gx += 0.5 * hb;
        break;
      case 'shoulder':
        G.tw += s * 0.45 * hb;
        G.rl += s * 0.12 * hb;
        G.hr += s * 0.2 * hb;
        break;
      case 'head':
        G.hp -= 0.5 * hb;
        G.hy += s * 0.35 * hb;
        G.L(-2.5, -0.8, -2.2, 0.3, hb * 0.9);
        break;
      default:
        G.tor += 0.22 * hb;
        G.L(-0.5, -0.8, -1.6, 0.3, hb * 0.7);
    }
  }
  // 5. Detrás de una cobertura baja: arriba para disparar, abajo entre ráfagas
  m.ovT = (m.ovT || 0) - dt;
  if (m.ovT <= 0) {
    m.ovT = 0.5;
    m.ovC = u.stance === 'crouch' && tgt && !u.moving ? lowCoverToward(u, tgt) : false;
  }
  if (u.firing > 0) m.ovF = 0.9;
  else m.ovF = Math.max(0, (m.ovF || 0) - dt);
  const ovUp = m.ovC && m.ovF > 0 && !u.reloading ? 1 : 0,
    ovDn = m.ovC && !ovUp ? 1 : 0;
  m.ovU = sm(m.ovU || 0, ovUp, 1 - Math.exp(-9 * dt));
  m.ovD = sm(m.ovD || 0, ovDn, 1 - Math.exp(-6 * dt));
  if (m.ovU > 0.01) {
    G.py += 0.15 * m.ovU;
    G.kL -= 0.55 * m.ovU;
    G.kR -= 0.4 * m.ovU;
    G.hL += 0.3 * m.ovU;
    G.tor -= 0.08 * m.ovU;
  }
  if (m.ovD > 0.01) {
    G.py -= 0.05 * m.ovD;
    G.tor += 0.2 * m.ovD;
    G.hp += 0.28 * m.ovD;
    G.gx -= 0.35 * m.ovD;
  }
  // 6. La recarga: cada uno a su manera
  if (u.reloading && !u.rpg) {
    if (!m.rlWas) {
      m.rlWas = true;
      m.rlS = pick(RELOAD_STYLES);
      m.rlKn = u.stance === 'stand' && c.py > 0.45 && u.sup > 30 && !u.moving && rnd() < 0.6;
    }
    const r = clamp(u.reloadT / (u.reloadDur || 1), 0, 1),
      b = _lbSS(0, 0.12, Math.min(r, 1 - r) * 1.2);
    if (m.rlS === 'tilt') {
      G.gz += 0.75 * b;
      G.gy += 0.2 * b;
      G.hr += 0.16 * b;
      G.hp += 0.12 * b;
    } else if (m.rlS === 'pouch') {
      const dig = lbEnv(r, 0.1, 0.2, 0.38, 0.48);
      G.L(-0.55, -0.7, -1.85, 0.5, dig);
      G.hp += 0.25 * dig;
    } else if (m.rlS === 'fast') {
      G.gx -= 0.2 * b;
      G.hp -= 0.25 * b;
      G.tw += 0.1 * b;
    }
    if (m.rlKn) {
      // rodilla en tierra para recargar
      const kn = _lbSS(0, 0.15, r) * (1 - _lbSS(0.88, 1, r));
      G.kL += 1.5 * kn;
      G.hL -= 1.25 * kn;
      G.kR += 1.2 * kn;
      G.hR -= 0.5 * kn;
      G.py -= 0.19 * kn;
    }
  } else m.rlWas = false;
  liveBody3(u, m, c, dt, G, tgt, fear); // heridos, señales, el arma y los civiles
  liveBody4(u, m, c, dt, G, tgt, fear); // arrastrar, formas de andar, explosiones y puertas
  return G;
}
