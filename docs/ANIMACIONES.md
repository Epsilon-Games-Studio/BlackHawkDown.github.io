# Catálogo de animaciones

Todas las animaciones del juego son procedurales: se calculan en cada fotograma sobre el esqueleto de cada muñeco
(`units/soldier-rig.js`), con muelles, curvas en el tiempo y algo de física. No hay clips grabados. Cada una sale en
partida por una de estas tres vías:

- **Orden**: la dispara algo que mandas tú (mover, a cubierto, alto, atacar, supresión, formación, atender heridos, entrar
  en un edificio…).
- **Vida**: la hacen solos, en reposo o mientras se mueven, según cómo están (tranquilos, con miedo, cansados, heridos).
- **Entorno**: la provoca lo que pasa alrededor (un balazo, una explosión, un compañero caído, un tropiezo, un arma que se
  encasquilla, el fuego enemigo).

Dónde vive cada capa:

| Archivo | Qué anima |
|---|---|
| `units/swinging-kit.js` | La base: poses, paso y carrera, IK de manos y pies, recarga, pistola, señales básicas, asomarse, saltar muretes |
| `units/death-physics.js` | Caídas con física, el arma que cae, tropiezos |
| `units/living-body.js` | Mirada, peso, gestos en reposo, balazos por zona, cobertura baja, maneras de recargar |
| `units/living-body-3.js` | Atender heridos, señales con la mano, encasquillamientos, civiles que huyen y se esconden |
| `units/living-body-4.js` | Arrastrar compañeros, formas de andar, explosiones, entrar por una puerta |
| `combat/bleeding.js` | Llevar a hombros a un caído (asentado sobre el hombro del que lo lleva) |

---

## Moverse (vida y órdenes)

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 1 | Andar | todos | Orden de mover |
| 2 | Correr | todos | Orden de mover a distancia o bajo fuego |
| 3 | Correr agachado | todos | Bajo fuego |
| 4 | Andar agachado | todos | Postura agachada |
| 5 | Andar de lado | todos | Moverse mirando a un objetivo |
| 6 | Andar hacia atrás | todos | Retroceder mirando a un objetivo |
| 7 | Esprintar con el fusil en una mano | algunos | Vida, corriendo |
| 8 | Cojear | heridos | Entorno: herido que sigue andando |
| 9 | Arrastrarse cuerpo a tierra | todos | Postura tumbada y mover |
| 10 | Girar sobre el sitio arrastrando los pies | todos | Cambiar de rumbo parado |
| 11 | Inclinarse en las curvas | todos | Vida, corriendo |
| 12 | Saltar un murete | todos | Entorno: un murete en el camino |
| 13 | En guardia (arma arriba, paso corto, vista barriendo) | nuestros | Vida: avanzar con amenaza |
| 14 | Cansado (hombros caídos, cabeza gacha) | todos | Vida: fatiga alta |
| 15 | Milicia relajada (fusil al hombro por el cañón) | milicia | Vida: un tercio de ellos, sin amenaza |
| 16 | Paso balanceado | civiles (mujeres) | Vida |
| 17 | Viejo encorvado | civiles | Vida |
| 18 | Con prisa | civiles | Vida |
| 19 | Huir corriendo | civiles | Entorno: tiros cerca |
| 20 | Huir agachado | civiles | Entorno: tiros cerca |
| 21 | Huir con las manos sobre la cabeza | civiles | Entorno: tiros cerca |
| 22 | Mirar hacia los tiros antes de huir | civiles | Entorno |
| 23 | Despacio y pegado al llegar a una puerta | nuestros | Orden: entrar en un edificio |
| 24 | Bajar por la cuerda | nuestros | Misiones con inserción en cuerda |
| 25 | Aterrizar al pie de la cuerda | nuestros | Misiones con inserción en cuerda |

## Combate (órdenes y entorno)

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 26 | Apuntar de pie | todos | Orden de atacar o fuego automático |
| 27 | Apuntar rodilla en tierra | todos | Igual, agachado |
| 28 | Apuntar tumbado | todos | Igual, tumbado |
| 29 | Retroceso del disparo | todos | Al disparar |
| 30 | Fuego a ciegas | milicia | Entorno: muy suprimidos y agachados |
| 31 | Asomarse por una esquina | todos | Vida/entorno junto a una esquina |
| 32 | Levantarse por encima de la cobertura baja para disparar | todos | Entorno: agachado tras sacos, murete o coche |
| 33 | Esconderse tras la cobertura baja entre ráfagas | todos | Igual |
| 34 | Recarga normal | todos | Al vaciar el cargador |
| 35 | Recarga inclinando el arma | todos | Igual (sorteada) |
| 36 | Recarga sacando el cargador del chaleco | todos | Igual (sorteada) |
| 37 | Recarga rápida sin quitar ojo | todos | Igual (sorteada) |
| 38 | Recargar rodilla en tierra | todos | Igual, con fuego encima |
| 39 | Golpe al cargador al terminar | todos | Al recargar |
| 40 | Recargar el lanzacohetes | milicia | Tras cada disparo de RPG |
| 41 | Sacar la pistola | nuestros | Entorno: fusil vacío con el enemigo encima |
| 42 | Guardar la pistola | nuestros | Igual |
| 43 | Encasquillamiento (golpe al cargador, tirón del cerrojo) | todos | Entorno: al azar al disparar |
| 44 | El cañón sigue a la mirada | nuestros | Vida: avanzar con miedo |
| 45 | Fusil bajo (posición de reposo) | todos | Vida: sin amenaza |
| 46 | Respingo con las balas cerca | todos | Entorno: fuego cercano |
| 47 | Traspié | todos | Entorno: corriendo |
| 48 | Tropezar y caer de bruces, y levantarse | todos | Entorno: corriendo |
| 49 | Acobardado, encogido | todos | Entorno: clavados por el fuego |

## Balazos y explosiones (entorno)

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 50 | Balazo en el tronco: se dobla | todos | Herida |
| 51 | Balazo en la pierna izquierda: la rodilla cede | todos | Herida |
| 52 | Balazo en la pierna derecha | todos | Herida |
| 53 | Balazo en el brazo izquierdo: sale despedido | todos | Herida |
| 54 | Balazo en el brazo derecho: baja el arma | todos | Herida |
| 55 | Balazo en el hombro: le hace girar | todos | Herida |
| 56 | Roce en la cabeza: la cabeza atrás y la mano a la cara | todos | Herida |
| 57 | Explosión: agacharse con el brazo sobre la cabeza | todos | Explosión a 5–22 m |
| 58 | Explosión: taparse el oído, la cabeza sacudida | todos | Igual |
| 59 | Explosión: aturdido, tambaleándose | todos | Igual, más cerca |
| 60 | Explosión: taparse la cara del polvo y toser | todos | Igual, más lejos |
| 61 | Derribado por la onda (diez segundos en el suelo) | todos | Explosión a menos de 6 m |
| 62 | Levantarse tras ser derribado | todos | Igual |

## Muertes y caídos (entorno)

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 63 | Caer de espaldas | todos | Muerte, bala de frente |
| 64 | Caer de bruces | todos | Muerte, bala por la espalda |
| 65 | Caer corriendo y resbalar | todos | Muerte a la carrera |
| 66 | Desplomarse sobre sí mismo | todos | Muerte |
| 67 | Caer en seco | todos | Muerte |
| 68 | Caer girando | todos | Muerte, bala de lado |
| 69 | Caer desde la rodilla | todos | Muerte, agachado |
| 70 | Quedarse quieto tumbado | todos | Muerte, tumbado |
| 71 | Postura final boca arriba (sorteada) | todos | Tras la caída |
| 72 | Postura final boca abajo (sorteada) | todos | Tras la caída |
| 73 | Postura final de lado, encogido (sorteada) | todos | Tras la caída |
| 74 | Latigazo de brazos, piernas y cabeza al golpear el suelo | todos | Tras la caída |
| 75 | El arma sale despedida, rebota y queda de lado | todos | Al morir |
| 76 | Herido en el suelo: se retuerce, respira con dolor | nuestros | Herida grave |
| 77 | Herido en el suelo: la mano a la herida | nuestros | Igual |
| 78 | Herido en el suelo: una pierna empuja, la otra encogida | nuestros | Igual |
| 79 | Llevar a un caído a hombros | nuestros | Entorno: nadie se queda atrás |
| 80 | El cuerpo doblado sobre el hombro | caídos | Igual |
| 81 | Arrastrar a un caído del asa del chaleco | nuestros | Igual, bajo fuego o agachado |
| 82 | El cuerpo arrastrado, a tirones | caídos | Igual |
| 83 | Mirar atrás mientras arrastra | nuestros | Igual |

## Atender heridos (orden: Atender heridos)

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 84 | Postura de curar, rodilla en tierra | nuestros | Orden |
| 85 | Tomar el pulso | nuestros | Orden, el primer paso |
| 86 | Apretar la herida con las dos manos | nuestros | Orden |
| 87 | Vendar dando vueltas | nuestros | Orden |
| 88 | Poner un torniquete | nuestros (más el sanitario) | Orden |
| 89 | Pinchar la morfina | nuestros (más el sanitario) | Orden |
| 90 | Hablarle con la mano en el hombro | nuestros | Orden |
| 91 | Pedir la evacuación por radio | nuestros | Orden |
| 92 | Rebuscar en la bolsa | nuestros | Orden |
| 93 | Levantar la vista por si viene alguien | nuestros | Orden |
| 94 | Vendarse uno mismo | nuestros | Orden, sin herido delante |
| 95 | Apretarse uno mismo la herida | nuestros | Igual |
| 96 | La mano a la herida al estar parado | heridos | Vida |

## Señales con la mano (órdenes y vida)

| # | Señal | Cómo sale |
|---|---|---|
| 97 | Señalar | Orden de mover, de supresión, al avisarse en reposo |
| 98 | Al suelo (palma hacia abajo) | Orden a cubierto |
| 99 | Puño (alto) | Llegar al destino, orden de parar |
| 100 | Avanzar (el brazo barre adelante) | Orden de mover, formación en marcha |
| 101 | Adelante (hachazo) | Orden de mover, de supresión, entrar en un edificio |
| 102 | Alto con la palma abierta | Llegar al destino, orden de parar |
| 103 | Reagruparse (círculos sobre la cabeza) | Formar una formación, atender heridos, llegar |
| 104 | Esperad | Llegar al destino, la milicia |
| 105 | Cubridme (palmadas en el casco) | Orden a cubierto |
| 106 | Enemigo a la vista | Orden de atacar, un enemigo nuevo, avisarse en reposo |
| 107 | Escuchad | Llegar al destino |
| 108 | Venid | Atender heridos, avisarse en reposo, la milicia |
| 109 | De dos en dos | Formación en marcha, formar, entrar |
| 110 | Todo bien | Llegar al destino |
| 111 | Vigilad ese lado | Avisarse en reposo |

## Vida en reposo

| # | Animación | Quién | Cómo sale |
|---|---|---|---|
| 112 | La mirada salta de un punto a otro (cabeza y pecho) | todos | Siempre |
| 113 | Cambiar el peso de pierna | todos | De pie, parados |
| 114 | Balanceo de tronco, hombros y cabeza | todos | Siempre |
| 115 | Respiración (más rápida si está cansado o con miedo) | todos | Siempre |
| 116 | Encogerse con miedo | todos | Con miedo |
| 117 | Rodilla en tierra en reposo | nuestros | Vida |
| 118 | Apoyado en una pared mirando a lo largo | todos | Vida, junto a una pared |
| 119 | Hablar por radio | nuestros | Vida y órdenes |
| 120 | Hablar cara a cara, la mano con las palabras | todos | Vida |
| 121 | Escuchar asintiendo | todos | Vida |
| 122 | Mirar hacia donde señala otro | todos | Vida |
| 123 | Pasar algo a un compañero | nuestros | Vida |
| 124 | Palmada en el hombro | nuestros | Vida |
| 125 | Flexiones | nuestros | Vida en la base |
| 126 | Sentado | todos | Vida en la base y en vehículos |
| 127 | Sentado en la puerta del helicóptero | nuestros | Misiones |
| 128 | Civil gritando y gesticulando | civiles | Entorno: soldados cerca |
| 129 | Civil tirando piedras | civiles | Entorno: soldados cerca |
| 130–137 | Gestos de antes: mirar, colocarse el equipo, cambiar el peso, comprobar el arma, estirarse, palparse el chaleco, levantar el arma, inspeccionarla | todos | Vida |

### Gestos del catálogo (`GESTURES`, vida)

| # | Gesto | Quién |
|---|---|---|
| 138 | Otear a los lados | todos |
| 139 | Mirar atrás por encima del hombro | todos |
| 140 | Buscar helicópteros con la mano de visera | todos |
| 141 | Estirar el cuello | todos |
| 142 | Encoger los hombros | todos |
| 143 | Secarse el sudor | todos |
| 144 | Beber de la cantimplora | nuestros |
| 145 | Mirar el reloj | nuestros |
| 146 | Palpar el cargador | con arma |
| 147 | Comprobar la recámara | con arma |
| 148 | Colocarse el casco o la gorra | todos |
| 149 | Frotarse la nuca | todos |
| 150 | Cambiar el peso con la rodilla floja | todos |
| 151 | Agacharse a descansar | todos |
| 152 | Estirar la espalda | todos |
| 153 | Frotarse la rodilla | agachados |
| 154 | Escupir | todos |
| 155 | Toser | todos |
| 156 | Bostezar | todos |
| 157 | Cabecear de sueño | cansados |
| 158 | Apretar el auricular | nuestros |
| 159 | Señalar algo a lo lejos | todos |
| 160 | Pulgar arriba | nuestros |
| 161 | Cañón arriba | con arma |
| 162 | Dejar colgar el fusil | con arma |
| 163 | Abrir y cerrar la mano | todos |
| 164 | Golpecitos con el pie | todos |
| 165 | Tirar de la correa | con arma |
| 166 | Mirar a saltos, nervioso | con miedo |
| 167 | Incorporarse para mirar | agachados |
| 168 | Brazos cruzados | sin arma |
| 169 | Manos en la cintura | sin arma |
| 170 | Rascarse la cabeza | todos |
| 171 | Mascar khat | milicia |
| 172 | Encogerse de hombros | todos |
| 173 | Saludar con la mano | sin arma |
| 174 | Manos juntas | civiles |
| 175 | Fusil apoyado en el hombro | milicia |
| 176 | Fumar | milicia y civiles |
| 177 | Discutir | milicia |
| 178 | Apoyarse en el fusil | milicia |
| 179 | Fardo sobre la cabeza | civiles |
| 180 | Atarse la bota | nuestros, agachados |
| 181 | Mirar el mapa | nuestros |
| 182 | Mirar la brújula | nuestros |
| 183 | Frotarse los ojos | todos |
| 184 | Crujirse los nudillos | todos |
| 185 | Estirar el brazo | todos |

## Civiles escondidos (entorno)

| # | Animación |
|---|---|
| 186 | Cubriéndose la cabeza |
| 187 | Rezando |
| 188 | Abrazados a las rodillas |

## Escenas de cine de la introducción (las pide la escena)

| # | Animación | Quién |
|---|---|---|
| 189 | Pedir con los dos brazos en alto (`reach`) | la multitud del reparto |
| 190 | Un brazo en alto que se agita, gritando (`clamor`) | la multitud del reparto |
| 191 | Manos en alto (`handsUp`) | el detenido |
| 192 | Arengar señalando y barriendo con el brazo (`harangue`) | el hombre del camión |
| 193 | Empujar con las dos manos (`shove`) | la multitud del reparto |
| 194 | Hablar por el megáfono (`megaphone`) | el guerrillero de Aidid |

---

**Total: 194.** Todas se han visto salir en una partida simulada de dos minutos por misión, dando órdenes al azar,
salvo las de misiones concretas (cuerda, puerta del helicóptero, base), que salen en sus misiones, y las seis de las
escenas de cine de la introducción (`who: 'none'`: el juego nunca las elige solo).
