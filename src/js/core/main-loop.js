/* ====================================================================================================
 * core/main-loop.js
 *
 * El bucle principal: un requestAnimationFrame que simula (step), mueve la cámara, sincroniza
 * lo que se ve con el estado del juego y pinta el frame (escena, postproceso y overlay).
 * ================================================================================================== */

'use strict';

let last = performance.now(),
  ambT = 0,
  frameN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  try {
    tutGuide();
  } catch (e) {}
  try {
    medBar();
  } catch (e) {}
  try {
    musTick();
  } catch (e) {}
  try {
    mapTick();
  } catch (e) {}
  // detrás de la puerta de acceso de pruebas no se mueve nada: la animación del título empieza cuando se pasa
  if (!window.__gateOpen && document.getElementById('epsSplash')) {
    last = now;
    return;
  }
  dynTick((now - last) / 1000);
  const rdt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  {
    const ps = OPT.q * DYN_K[DYN.i];
    if (PS !== ps && !window.__noAutoPS) {
      PS = ps;
      resize();
    }
  }
  camS.yaw += (camS.yawT - camS.yaw) * Math.min(1, rdt * 9);
  camS.zoom += (camS.zoomT - camS.zoom) * Math.min(1, rdt * 10);
  if (!(camS.zoom >= 2)) camS.zoom = Math.max(2, camS.zoomT || 12);
  updChat(rdt);
  if (FLIGHT.on) updFlight(FLIGHT.attract ? rdt * 0.65 : rdt);
  if (CINE.on) cineCam(rdt);
  updCam();
  updWorld(FLIGHT.on ? 2 : GEN.filter(c => c.seen === frameStamp).length < 6 ? 4 : 1);
  if (ocean && ocean.material.userData.sh) {
    const U = ocean.material.userData.sh.uniforms;
    U.uTime.value = now / 1000;
    U.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
    U.uNightO.value = nightF;
  }
  if (G.started && !G.paused && !G.over) {
    const dt = rdt * G.speed;
    cpTick();
    if (G.speed > 1) {
      step(dt / 2);
      step(dt / 2);
    } else step(dt);
    updFx(dt);
  }
  if (!G.paused || !G.started) {
    const adt = G.started ? rdt * G.speed : rdt;
    ambT += adt;
    updAmbient(adt);
    updLights(adt, now);
    updDynamic(ambT, adt);
    updLaundry(ambT);
    updLitter(adt, ambT);
  }
  const sr = MIS.sunRamp,
    srk = sr ? 1 - clamp(G.t / sr[1], 0, 1) : 0; // algunas misiones empiezan con más luz y se van fundiendo hasta la suya
  setSun(G.sun0 + (G.t * TIMESCALE) / 3600 + (G.sunShift || 0) - (sr ? sr[0] * srk * srk * (3 - 2 * srk) : 0));
  pMat.uniforms.uScale.value = lowH / (2 * halfH());
  pMat.uniforms.fNear.value = scene.fog.near;
  pMat.uniforms.fFar.value = scene.fog.far;
  sync(rdt);
  drawRoutes();
  if (!G.started && !FLIGHT.on && !$('overlay').classList.contains('peek')) camS.yawT += rdt * 0.05;
  G.hudT -= rdt;
  if (G.hudT <= 0) {
    G.hudT = 0.15;
    refreshCards();
    placeChat();
  }
  postMat.uniforms.uTime.value = (now / 1000) % 100;
  postMat.uniforms.uNight.value = nightF;
  postMat.uniforms.uGold.value = goldF;
  {
    const U = postMat.uniforms,
      on = !!(G && (G.nv || G.nvAt) && G.started && nightF > 0.25);
    U.uNVOn.value = on ? 1 : 0;
    U.uNVR.value = (G && G.nvAt && G.nvR) || 33;
    if (on) {
      let k = 0,
        bl = 0;
      if (G.nvAt)
        for (const p of G.nvAt) {
          if (k < 6) NVP[k++].set(p[0], p[1], p[2]);
        }
      else
        for (const u of us) {
          if (k >= 6) break;
          if (!u.alive || u.look !== 'delta') continue;
          NVP[k++].set(u.x, u.elev || 0, u.z);
          bl = Math.max(bl, u.nvBlind || 0);
        }
      for (; k < 6; k++) NVP[k].set(0, -999, 0);
      G.nvGlare = Math.max(bl, (G.nvGlare || 0) - rdt * 0.6);
      U.uBlind.value = clamp(G.nvGlare, 0, 1);
      cam.updateMatrixWorld();
      _ipv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
      U.uInvPV.value.copy(_ipv);
    }
  }
  if (CMUS && CMUS.on && CMUS.el && !CINTRO) {
    const out =
      !(MIS && MIS.id === 'irene') ||
      (!FLIGHT.on && G.started && !CINE.on) ||
      SCREEN === 'scrMenu' ||
      SCREEN === 'scrCamp' ||
      SCREEN === 'brief';
    // en cuanto empieza la parte jugable, un fundido lento de 2 segundos al silencio
    if (out) {
      if (!CMUS.fadeT) {
        CMUS.fadeT = performance.now();
        CMUS.fadeV = CMUS.el.volume;
      }
      CMUS.el.volume = clamp(CMUS.fadeV * (1 - (performance.now() - CMUS.fadeT) / 2000), 0, 1);
    } else {
      CMUS.fadeT = 0;
      CMUS.el.volume = clamp(CMUS.el.volume + clamp(cmusVol() - CMUS.el.volume, -0.02, 0.02), 0, 1);
    }
    if (out && CMUS.el.volume <= 0.001) {
      CMUS.el.pause();
      CMUS.on = false;
      CMUS.fadeT = 0;
    }
  }
  // detrás de los menús (la batalla de fondo) solo suena la música: todo lo demás se baja
  if (SND && SND.gate) {
    const on = MIS && MIS.id === 'attract' ? 0 : 1;
    if (on !== SND.gOn) {
      SND.gOn = on;
      const t = AC.currentTime;
      SND.gate.gain.cancelScheduledValues(t);
      SND.gate.gain.setTargetAtTime(on, t, on ? 0.25 : 0.08);
    }
  }
  batchFrame();
  lodFrame();
  scene.updateMatrixWorld();
  batchSpheres();
  batchHide();
  lightPool();
  shadowFrame();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  atmoFrame(now);
  renderRays();
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  reflFrame();
  renderer.setRenderTarget(null);
  batchRestore();
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(overlay, cam);
  renderer.autoClear = true;
  if (++frameN === 4 || frameN === 40) checkDetailShaders();
}
