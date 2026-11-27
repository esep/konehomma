

/* ---------- recorded tractor engine (idle, pull-away, running, slowing down) and a quiet wind ---------- */
const SB = {}; let sndLoading = false, tGain = null, wGain = null, wSrc = null, windT = 0, windLv = 0.05;
function loadSounds() {
  if (sndLoading || !AC) return; sndLoading = true;
  tGain = AC.createGain(); tGain.gain.value = 0; tGain.connect(master);
  wGain = AC.createGain(); wGain.gain.value = 0; wGain.connect(master);
  const total = Object.keys(SND_DATA).length + Object.keys(SND_EXC).length + Object.keys(SND_TOOL).length; let done = 0;
  const ld = document.getElementById('loading'), fin = () => { if (++done >= total && ld) ld.classList.remove('show'); };
  setTimeout(() => { if (done < total && ld) ld.classList.add('show'); }, 2000);   // ladataan-animaatio vasta jos äänten lataus kestää yli 2 s
  const load = (data, bank) => { for (const k in data) {
    const bin = atob(data[k].split(',')[1]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    let once = false; const end = () => { if (!once) { once = true; fin(); } }, ok = b => { bank[k] = b; end(); }, bad = end;
    try { const p = AC.decodeAudioData(u.buffer, ok, bad); if (p && p.catch) p.catch(bad); } catch (e) { bad(); }
  } };
  load(SND_DATA, SB); load(SND_EXC, EXB); load(SND_TOOL, TB);
}
// one state machine per engine: idle -> start -> run -> decel -> idle (the excavator also has a digging rev)
// työkaluäänet (kauha, levy, linko) ja törmäys: leikkeet Pixabay-äänistä; pidetään hiljaisina
const TB = {}, TS = {}; let lastBump = -9, bumpN = 0;
function toolSnd(key, name, on, vol, loop) {
  if (!AC || !TB[name]) return; const o = TS[key], t = AC.currentTime;
  if (on && !o) {
    const s = AC.createBufferSource(); s.buffer = TB[name]; s.loop = !!loop; const g = AC.createGain(); g.gain.value = vol;
    s.connect(g).connect(master); s.start(t); TS[key] = { s, g };
  } else if (!on && o) {
    o.g.gain.setTargetAtTime(0, t, 0.04); try { o.s.stop(t + 0.2); } catch (e) {} TS[key] = null;
  }
}
function oneShot(name, vol) {                        // nosturin tartunta (kiinni) ja irtoaminen (irti)
  if (!AC || !TB[name]) return; const s = AC.createBufferSource(); s.buffer = TB[name]; const g = AC.createGain(); g.gain.value = vol;
  s.connect(g).connect(master); s.start(AC.currentTime);
}
function bump(sp) {                                  // törmäys: kone pysähtyi esteeseen
  if (!AC || !TB.hit || sp < 0.6) return; const t = AC.currentTime; if (t - lastBump < 1.2) return; lastBump = t; bumpN++;
  const s = AC.createBufferSource(); s.buffer = TB.hit; const g = AC.createGain(); g.gain.value = 0.4 + 0.45 * Math.min(1, sp / 3);
  s.connect(g).connect(master); s.start(t);
}
const ENG = {}, EXB = {}; let curEng = null, excDig = false;
function engOf(id, bank, pitch) { return ENG[id] || (ENG[id] = { id, bank, pitch, gm: id === 'exc' ? 1.45 : 1, st: 'idle', T: 0, still: 0, noDig: 0, ramp: 0, now: null }); }
function tPlay(E, name, loop, fade) {
  const b = E.bank[name]; if (!b) return;
  const s = AC.createBufferSource(); s.buffer = b; s.loop = loop; s.playbackRate.value = E.pitch;
  const g = AC.createGain(), t = AC.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + fade);
  s.connect(g).connect(tGain); s.start(t);
  if (E.now) { const o = E.now; o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(Math.max(0.0001, o.g.gain.value), t); o.g.gain.linearRampToValueAtTime(0.0001, t + fade); try { o.s.stop(t + fade + 0.05); } catch (e) {} }
  E.now = { s, g };
}
function stopEng(E) {
  if (!E || !E.now || !AC) return; const o = E.now, t = AC.currentTime;
  o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(Math.max(0.0001, o.g.gain.value), t); o.g.gain.linearRampToValueAtTime(0.0001, t + 0.25);
  try { o.s.stop(t + 0.3); } catch (e) {} E.now = null; E.st = 'idle';
}
function pickEngine() {
  const ok = B => B.idle && B.start && B.run && B.decel;
  if (!ok(SB)) return null;
  if (scene === 'snow') return active === tractor ? engOf('tractor', SB, 1.0) : active === david ? engOf('david', SB, 0.9) : null;   // David: hieman matalampi
  if (active === truck) return engOf('truck', SB, 0.72);          // heavy diesel: lower
  if (active === loader) return engOf('loader', SB, 1.22);        // wheel loader: higher
  if (active === exc && ok(EXB) && EXB.dig) return engOf('exc', EXB, 1.0);
  return null;
}
function recEngine(E, m, dt, blow, dig) {
  const sp = Math.abs(m.speed), want = keys.up || keys.down, B = E.bank, dur = n => B[n].duration / E.pitch;
  if (!E.now) { tPlay(E, 'idle', true, 0.3); E.st = 'idle'; E.T = 0; }
  E.T += dt; E.still = want ? 0 : E.still + dt; E.noDig = dig ? 0 : E.noDig + dt;
  const still = E.still > 0.12, go = (n, loop, f) => { tPlay(E, n, loop, f); E.ramp = n === 'run' && E.st !== 'start' && E.id === 'exc' ? 1.6 : 0; E.st = n; E.T = 0; }, canDig = dig && !!B.dig;
  if (E.st === 'idle') { if (want) go('start', false, 0.15); else if (canDig) go('dig', false, 0.3); }
  else if (E.st === 'start') { if (still) go('decel', false, 0.12); else if (E.T > dur('start') - 0.7) go('run', true, 0.7); }
  else if (E.st === 'run') { if (still) go('decel', false, 0.12); }
  else if (E.st === 'decel') { if (want) go('run', true, 0.4); else if (canDig) go('dig', false, 0.3); else if (E.T > dur('decel') - 0.15) go('idle', true, 0.15); }
  else if (E.st === 'dig') { if (want) go('run', true, 0.5); else if (E.T > dur('dig') - 0.3 || (E.noDig > 1.6 && E.T > 3)) go('idle', true, 0.6); }
  if (E.now && E.now.s.loop && E.st === 'run') {
    const k = E.ramp > 0 ? 0.8 + 0.2 * (1 - E.ramp / 1.6) : 1; E.ramp = Math.max(0, E.ramp - dt);
    E.now.s.playbackRate.setTargetAtTime(E.pitch * k * (want ? 0.94 + 0.1 * Math.min(1, sp / (m.vmax || 2)) + 0.03 * blow : 0.84), AC.currentTime, want ? 0.25 : 0.07);   // revs fall quickly when the pedal is released
  } else if (E.now && E.st === 'idle') E.now.s.playbackRate.setTargetAtTime(E.pitch, AC.currentTime, 0.3);
  setG(tGain, (E.st === 'idle' ? 0.5 : 0.7) * E.gm);
}
function windStep(dt) {
  if (!SB.wind || !wGain) return;
  const on = scene === 'snow';
  if (on && !wSrc) { wSrc = AC.createBufferSource(); wSrc.buffer = SB.wind; wSrc.loop = true; wSrc.connect(wGain); wSrc.start(); }
  windT -= dt; if (windT <= 0) { windT = 3 + Math.random() * 4; windLv = 0.035 + Math.random() * 0.05; }
  wGain.gain.setTargetAtTime(on ? windLv : 0, AC.currentTime, 1.2);
  if (!on && wSrc && wGain.gain.value < 0.002) { try { wSrc.stop(); } catch (e) {} wSrc = null; }
}

/* ---------- sound for whichever machine is driven ---------- */
function soundStep(dt, moving, blow) {
  // pedal released on the truck or loader: air-brake hiss
  // (the brake has just finished when the machine has come to a stop after the pedal was released)
  if (keys.up || keys.down) { pedalT += dt; if (pedalT > 0.25) braked = true; }
  if ((active === loader || active === truck) && braked && !keys.up && !keys.down && Math.abs(active.speed) < 0.12) { hiss(); braked = false; }
  if (active !== lastActive) { braked = false; lastActive = active; }
  if (!keys.up && !keys.down) pedalT = 0;
  if (!AC) return;
  const sp = Math.abs(active.speed);
  const E = pickEngine(), rec = !!E;                                      // the recorded engine replaces the synthetic one
  if (E !== curEng) { stopEng(curEng); curEng = E; }
  windStep(dt);
  if (E) recEngine(E, active, dt, blow, excDig); else if (tGain) setG(tGain, 0);
  setG(engG, rec ? 0 : 0.05 + 0.05 * sp + (moving ? 0.03 : 0) + blow * 0.03);
  engO.frequency.setTargetAtTime((active === truck ? 38 : active === exc ? 41 : active === tractor ? 34 : active === david ? 31 : 44) + sp * 22 + (moving ? 10 : 0) + blow * 8, AC.currentTime, 0.1);
  setG(hydG, moving ? 0.035 : 0);
  setG(blowG, blow * 0.42);
  blowF.frequency.setTargetAtTime(380 + 800 * blow, AC.currentTime, 0.2);
  const m = active;
  if (m.speed < -0.03 || (keys.down && m.speed < 0.2)) { m.beep += dt; setG(beepG, (m.beep % 0.6) < 0.3 ? 0.0035 : 0); }
  else { m.beep = 0; setG(beepG, 0); }
}

/* ---------- update ---------- */
let camX = 0, camY = 0, camInit = false, time = 0, holeTimer = 0, sparks = [], smoke = [];
function followCam(dt) {
  const tx = GW / 2 + (active.y - active.x) * TW / 2, ty = (active.x + active.y) * TH / 2 - 18 + (isTouch ? IH * 0.1 : 0);
  if (!camInit) { camX = tx; camY = ty; camInit = true; }
  const k = Math.min(1, dt * 3.5); camX += (tx - camX) * k; camY += (ty - camY) * k;
}
function update(dt) {
  riverStep(dt);
  if (scene === 'snow') { updateSnow(dt); return; }
  time += dt;
  gridBuild();
  for (const m of machines) drive(m, dt, m === active);

  // loader arms and bucket
  const L = loader, a0 = L.alpha, b0 = L.beta, t0 = truck.tilt;
  L.alpha = approach(L.alpha, ARM[L.state], 0.8 * dt);
  L.beta = approach(L.beta, BKT[L.state], 1.4 * dt);
  truck.tilt = approach(truck.tilt, TILT[truck.state], 0.55 * dt);
  const E = exc, tgt = EXP[E.state];
  let tm = 0;
  for (let i = 0; i < 3; i++) tm = Math.max(tm, Math.abs(tgt[i] - E.j[i]) / EX_RATE[i]);
  if (tm > 1e-4) for (let i = 0; i < 3; i++) E.j[i] = approach(E.j[i], tgt[i], Math.abs(tgt[i] - E.j[i]) / tm * dt);
  E.tm = tm;
  const moving = Math.abs(L.alpha - a0) + Math.abs(L.beta - b0) + Math.abs(truck.tilt - t0) > 1e-4 || tm > 1e-3 || E.swung;
  toolSnd('L', 'kauha', Math.abs(L.alpha - a0) + Math.abs(L.beta - b0) > 1e-4, 0.5);
  toolSnd('T', 'kauha', Math.abs(truck.tilt - t0) > 1e-4, 0.5);
  toolSnd('E', 'kauha', tm > 1e-3, 0.5);
  toolSnd('Es', 'linko', !!E.swung, 0.45, true);

  excDig = tm > 1e-3 || !!E.swung;
  soundStep(dt, moving, 0);

  const LF = { x: L.x, y: L.y, h: L.h + L.steer };          // front frame carries arms and bucket
  const c = Math.cos(LF.h), s = Math.sin(LF.h);
  const Tu = 0.35 + 1.6 * Math.cos(L.alpha), Tw = 1.0 + 1.6 * Math.sin(L.alpha);
  const cb = Math.cos(L.beta), sb = Math.sin(L.beta);
  const bw = (p, q, v) => { const u = Tu + p * cb - q * sb, w = Tw + p * sb + q * cb; return [L.x + u * c - v * s, L.y + u * s + v * c, w]; };

  // balls riding in the bucket
  for (let i = 0; i < SLOTS.length; i++) {
    const b = L.slots[i]; if (!b) continue;
    const t = bw(...SLOTS[i]);
    if (b.lt < 1) { b.lt = Math.min(1, b.lt + dt * 7); const k = b.lt;
      b.x = b.sx + (t[0] - b.sx) * k; b.y = b.sy + (t[1] - b.sy) * k; b.z = b.sz + (t[2] - b.sz) * k; }
    else { b.x = t[0]; b.y = t[1]; b.z = t[2]; }
  }
  // tipping the bucket: dirt falls out a couple at a time
  if (L.beta < -0.55) {
    let rel = 0;
    for (let i = SLOTS.length - 1; i >= 0 && rel < 2; i--) {
      const b = L.slots[i]; if (!b) continue;
      L.slots[i] = null; rel++;
      b.st = 'fall'; b.vx = c * 0.9 + (Math.random() - 0.5) * 0.4; b.vy = s * 0.9 + (Math.random() - 0.5) * 0.4; b.vz = -0.3;
    }
  }

  // boulders riding in the loader bucket, released one at a time when it tips
  for (let i = 0; i < 2; i++) {
    const r = L.rk[i]; if (!r) continue;
    const t = bw(0.4, -0.32 + RR - 0.02, i ? 0.42 : -0.42);
    if (r.lt < 1) { r.lt = Math.min(1, r.lt + dt * 4); const k = r.lt;
      r.x = r.sx + (t[0] - r.sx) * k; r.y = r.sy + (t[1] - r.sy) * k; r.z = r.sz + (t[2] - r.sz) * k; }
    else { r.x = t[0]; r.y = t[1]; r.z = t[2]; }
  }
  L.rkT -= dt;
  if (L.beta < -0.55 && L.rkT <= 0) {
    const i = L.rk[0] ? 0 : L.rk[1] ? 1 : -1;
    if (i >= 0) {
      const r = L.rk[i]; L.rk[i] = null; L.rkT = 0.3;
      r.st = 'fall'; r.vx = c * 0.8 + (Math.random() - 0.5) * 0.3; r.vy = s * 0.8 + (Math.random() - 0.5) * 0.3; r.vz = -0.3;
    }
  }

  // excavator bucket: scoop, carry, dump
  {
    const G = excGeo(E), ec = Math.cos(E.h + E.swing), es = Math.sin(E.h + E.swing);
    for (let i = 0; i < EXSLOTS.length; i++) {
      const b = E.slots[i]; if (!b) continue;
      const t = G.loc(...EXSLOTS[i]);
      if (b.lt < 1) { b.lt = Math.min(1, b.lt + dt * 6); const k = b.lt;
        b.x = b.sx + (t[0] - b.sx) * k; b.y = b.sy + (t[1] - b.sy) * k; b.z = b.sz + (t[2] - b.sz) * k; }
      else { b.x = t[0]; b.y = t[1]; b.z = t[2]; }
    }
    if (G.n[1] < -0.3) {                       // opening faces down: dirt pours out
      let rel = 0;
      for (let i = EXSLOTS.length - 1; i >= 0 && rel < 2; i--) {
        const b = E.slots[i]; if (!b) continue;
        E.slots[i] = null; rel++;
        b.st = 'fall'; b.vx = ec * 0.5 + (Math.random() - 0.5) * 0.4; b.vy = es * 0.5 + (Math.random() - 0.5) * 0.4; b.vz = -0.4;
      }
    }
    if (E.rock) {                              // a boulder in the bucket
      const r = E.rock, t = G.loc(0.3, 0.2, 0);
      if (r.lt < 1) { r.lt = Math.min(1, r.lt + dt * 4); const k = r.lt;
        r.x = r.sx + (t[0] - r.sx) * k; r.y = r.sy + (t[1] - r.sy) * k; r.z = r.sz + (t[2] - r.sz) * k; }
      else { r.x = t[0]; r.y = t[1]; r.z = t[2]; }
      if (G.n[1] < -0.3) { E.rock = null; r.st = 'fall'; r.vx = ec * 0.5 + (Math.random() - 0.5) * 0.3; r.vy = es * 0.5 + (Math.random() - 0.5) * 0.3; r.vz = -0.4; }
    }
    if (E.state === 2 && tm > 0.01 && !E.rock) {
      const tip = G.loc(EX_BL, 0.05, 0), mid = G.loc(0.3, 0.12, 0);
      if (tip[2] < 1.0) for (const r of rocks) {
        if (r.st !== 'rest') continue;
        if (Math.min(Math.hypot(r.x - tip[0], r.y - tip[1], r.z - tip[2]), Math.hypot(r.x - mid[0], r.y - mid[1], r.z - mid[2])) > 0.62) continue;
        E.rock = r; r.st = 'ebkt'; r.lt = 0; r.sx = r.x; r.sy = r.y; r.sz = r.z; plop(); break;
      }
    }
    if (E.state === 2 && tm > 0.01) {          // scooping sweep picks up dirt near the teeth
      const tip = G.loc(EX_BL, 0.05, 0), mid = G.loc(0.3, 0.12, 0);
      if (tip[2] < 1.0) for (const b of balls) {
        if (b.st !== 'rest') continue;
        const d1 = Math.hypot(b.x - tip[0], b.y - tip[1], b.z - tip[2]), d2 = Math.hypot(b.x - mid[0], b.y - mid[1], b.z - mid[2]);
        if (Math.min(d1, d2) > 0.45) continue;
        const slot = E.slots.indexOf(null); if (slot < 0) break;
        E.slots[slot] = b; b.st = 'ebkt'; b.lt = 0; b.sx = b.x; b.sy = b.y; b.sz = b.z; plop();
      }
    }
    if (E.state === 1 && tm < 1e-3) E.state = 2;                 // down -> scoop -> up with the load, all by itself
    else if (E.state === 2 && tm < 1e-3) E.state = 3;
    if (E.state === 4 && tm < 1e-3) {         // after dumping, go back to the start pose
      E.wait += dt;
      if (E.wait > 0.5 && !E.slots.some(Boolean)) { E.state = 0; E.wait = 0; }
    } else E.wait = 0;
  }

  // crusher: new gravel rides up the conveyor whenever the pile below gets small
  {
    CR.belt = (CR.belt + dt * 1.8) % 0.45;
    CR.timer += dt;
    CR.shake = Math.max(0, CR.shake - dt * 1.2); if (CR.burst > 0) CR.shake = Math.max(CR.shake, 0.4);
    if (CR.timer > 0.15) {
      CR.timer = 0;
      let n = 0;
      for (const b of balls) if (b.st === 'belt' || (b.st === 'rest' && Math.hypot(b.x - CR_DROP[0], b.y - CR_DROP[1]) < 1.8)) n++;
      const mk = () => balls.push({ st: 'belt', t: 0, side: (Math.random() - 0.5) * 0.36, v: 3 + (balls.length % 2), x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
      if (CR.burst > 0 && balls.length < 800) { for (let i = 0; i < 3 && CR.burst > 0; i++) { mk(); CR.burst--; } }   // a crushed boulder: lots of gravel
      else if (n < 110 && balls.length < 800) mk();
    }
    const cc = Math.cos(CR.h), cs = Math.sin(CR.h);
    for (const b of balls) if (b.st === 'belt') {
      b.t += dt * 1.8 / CR_LEN;
      const d = b.t * CR_LEN, off = 0.1 + BR;
      [b.x, b.y, b.z] = crLocal(CR_B0[0] + CR_DU * d - CR_DW * off, b.side, CR_B0[2] + CR_DW * d + CR_DU * off);
      if (b.t >= 1) { b.st = 'fall'; const fw = 0.5 + Math.random() * 1.6, sd = (Math.random() - 0.5) * 1.0;   // the stream fans out: different throw lengths and sideways scatter, so the pile is a wide heap, not a column
        b.vx = cc * fw - cs * sd; b.vy = cs * fw + cc * sd; b.vz = 0.4; }
    }
  }

  // dirt on the truck bed: slides back and pours out when the bed is tipped
  {
    const T = truck, slide = T.tilt > 0.3 ? 1.8 * (Math.sin(T.tilt) - 0.27) * dt : 0;
    const tc = Math.cos(T.h), ts = Math.sin(T.h);
    for (let i = T.bed.length - 1; i >= 0; i--) {
      const b = T.bed[i];
      b.pu -= slide * (0.85 + (b.v * 0.1));
      const p = bedToWorld(b.pu, b.pv, b.pw);
      b.x = p[0]; b.y = p[1]; b.z = p[2];
      if (b.pu < 0.02) {
        T.bed.splice(i, 1);
        b.st = 'fall'; b.vx = -tc * 0.8 + (Math.random() - 0.5) * 0.4; b.vy = -ts * 0.8 + (Math.random() - 0.5) * 0.4; b.vz = -0.2;
      }
    }
  }

  // scooping and pushing
  const canScoop = L.state === 0 && Math.abs(L.alpha - ARM[0]) < 0.04 && Math.abs(L.beta) < 0.05 && L.speed > 0.05;
  const bucketLow = Tw < 0.9;
  const push = (m, b, u0, u1, vm, lu, lv) => {
    const mc = Math.cos(m.h), ms = Math.sin(m.h);
    const pf = u1 - lu, pb = lu - u0, pl = vm - lv, pr = lv + vm, mn = Math.min(pf, pb, pl, pr);
    if (mn === pf) lu = u1 + 0.02; else if (mn === pb) lu = u0 - 0.02; else if (mn === pl) lv = vm + 0.02; else lv = -vm - 0.02;
    b.x = m.x + lu * mc - lv * ms; b.y = m.y + lu * ms + lv * mc; b.st = 'fall'; b.vx = b.vy = b.vz = 0;
  };
  const tc = Math.cos(truck.h), ts = Math.sin(truck.h);
  const bodies = [truck, exc, CR, { x: L.x, y: L.y, h: L.h, rect: [-1.7, 0.0, 0.88] }];
  for (const b of balls) {
    if (b.st !== 'rest' && b.st !== 'fall') continue;
    if (b.z < 1.25) {
      const dx = b.x - L.x, dy = b.y - L.y, lu = dx * c + dy * s, lv = -dx * s + dy * c;
      if (bucketLow && lu > Tu - 0.05 && lu < Tu + 0.85 && Math.abs(lv) < 0.84 && b.z < Tw + 0.45) {
        const slot = canScoop && b.st === 'rest' ? L.slots.indexOf(null) : -1;
        if (slot >= 0) { L.slots[slot] = b; b.st = 'bkt'; b.lt = 0; b.sx = b.x; b.sy = b.y; b.sz = b.z; plop(); continue; }
        if (Math.abs(L.speed) > 0.03) push(LF, b, Tu - 0.05, Tu + 0.85, 0.84, lu, lv);
        continue;
      }
      if (lu > -0.05 && lu < 1.3 && Math.abs(lv) < 0.9) { push(LF, b, -0.05, 1.3, 0.9, lu, lv); continue; }
    }
    if (b.st === 'fall' && b.z < 2.05 && b.z >= 0.95) {   // falling stones must not pass through the cab roof: they slide off the cab (towards the bed or the side)
      const dx = b.x - truck.x, dy = b.y - truck.y, lu = dx * tc + dy * ts, lv = -dx * ts + dy * tc;
      if (lu > 1.1 && lu < 2.2 && Math.abs(lv) < 0.95) { push(truck, b, 1.1, 2.2, 0.95, lu, lv); continue; }
    }
    if (b.z < 0.95) for (const m of bodies) {
      const mc = Math.cos(m.h), ms = Math.sin(m.h), dx = b.x - m.x, dy = b.y - m.y, lu = dx * mc + dy * ms, lv = -dx * ms + dy * mc;
      const [u0, u1, vm] = m.rect;
      if (lu > u0 - 0.05 && lu < u1 + 0.05 && Math.abs(lv) < vm + 0.05) { push(m, b, u0 - 0.05, u1 + 0.05, vm + 0.05, lu, lv); break; }
    }
  }

  // boulders: scooped by the loader, pushed aside by machine bodies, dropped into the hopper
  const pushRock = (m, r, u0, u1, vm, lu, lv) => {
    const mc = Math.cos(m.h), ms = Math.sin(m.h);
    const pf = u1 - lu, pb = lu - u0, pl = vm - lv, pr = lv + vm, mn = Math.min(pf, pb, pl, pr);
    if (mn === pf) lu = u1 + 0.02; else if (mn === pb) lu = u0 - 0.02; else if (mn === pl) lv = vm + 0.02; else lv = -vm - 0.02;
    r.x = m.x + lu * mc - lv * ms; r.y = m.y + lu * ms + lv * mc;
  };
  for (const r of rocks) {
    if ((r.st !== 'rest' && r.st !== 'fall') || r.z > 1.3) continue;
    const dx = r.x - L.x, dy = r.y - L.y, lu = dx * c + dy * s, lv = -dx * s + dy * c;
    if (bucketLow && lu > Tu - 0.05 && lu < Tu + 0.95 && Math.abs(lv) < 0.94 && r.z < Tw + 0.7) {
      const slot = canScoop && r.st === 'rest' ? L.rk.indexOf(null) : -1;
      if (slot >= 0) { L.rk[slot] = r; r.st = 'lbkt'; r.lt = 0; r.sx = r.x; r.sy = r.y; r.sz = r.z; plop(); continue; }
      if (Math.abs(L.speed) > 0.03) pushRock(LF, r, Tu - 0.05, Tu + 0.95, 0.94, lu, lv);
      continue;
    }
    if (lu > -0.05 - RR && lu < 1.3 + RR && Math.abs(lv) < 0.9 + RR) { pushRock(LF, r, -0.05 - RR, 1.3 + RR, 0.9 + RR, lu, lv); continue; }
    for (const m of bodies) {
      const mc = Math.cos(m.h), ms = Math.sin(m.h), ex = r.x - m.x, ey = r.y - m.y, mu = ex * mc + ey * ms, mv = -ex * ms + ey * mc;
      const [u0, u1, vm] = m.rect;
      if (mu > u0 - RR && mu < u1 + RR && Math.abs(mv) < vm + RR) { pushRock(m, r, u0 - RR, u1 + RR, vm + RR, mu, mv); break; }
    }
  }
  for (const r of rocks) if (r.st === 'fall') {
    r.vz -= 9 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
    r.x = Math.max(1, Math.min(M - 1, r.x)); r.y = Math.max(1, Math.min(M - 1, r.y));
    if (inHopper(r.x, r.y, r.z)) { r.dead = true; crushRock(); continue; }
    if (r.z <= RR) { const imp = -r.vz; r.z = RR; r.st = 'rest'; r.vx = r.vy = r.vz = 0; thud(Math.min(1, 0.4 + imp / 5)); }
  }
  if (rocks.some(r => r.dead)) rocks = rocks.filter(r => !r.dead);
  for (let i = 0; i < rocks.length; i++) {           // resting boulders keep clear of open holes and of each other
    const r = rocks[i]; if (r.st !== 'rest') continue;
    for (const H of HOLES) if (!H.done) {
      const hx = r.x - H.x, hy = r.y - H.y, d = Math.hypot(hx, hy), lim = H.r + RR * 0.6;
      if (d < lim) { const k = d < 1e-4 ? 1 : lim / d; r.x = H.x + (d < 1e-4 ? lim : hx * k); r.y = H.y + (d < 1e-4 ? 0 : hy * k); }
    }
    for (let j = i + 1; j < rocks.length; j++) {
      const o = rocks[j]; if (o.st !== 'rest') continue;
      const ox = o.x - r.x, oy = o.y - r.y, d = Math.hypot(ox, oy), lim = RR * 1.96;
      if (d < lim && d > 1e-4) { const k = (lim - d) / 2 / d; r.x -= ox * k; r.y -= oy * k; o.x += ox * k; o.y += oy * k; }
    }
  }

  // falling and settling (on the ground or into the truck bed)
  for (const b of balls) {
    if (b.st === 'fall') {
      b.vz -= 9 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.x = Math.max(1, Math.min(M - 1, b.x)); b.y = Math.max(1, Math.min(M - 1, b.y));
      if (truck.tilt < 0.12 && b.z > BED_HW + 0.05) {
        const dx = b.x - truck.x, dy = b.y - truck.y, lu = dx * tc + dy * ts, lv = -dx * ts + dy * tc;
        const pu = lu - BED_HU, pv = lv;
        if (pu > 0.02 && pu < BED_LEN && Math.abs(pv) < BED_V + 0.12) {
          b.pu = pu; b.pv = pv; b.pw = b.z - BED_HW;
          clampBed(b);
          const h = supBed(b, b.pw + 0.1);
          if (b.pw <= h) {
            const imp = -b.vz; settleBed(b); b.st = 'bed'; b.vx = b.vy = b.vz = 0; truck.bed.push(b);
            if (imp > 1.5) thud(Math.min(1, imp / 5));
          }
          continue;
        }
      }
      const h = sup(b, b.z + 0.1);
      if (b.z <= h) { const imp = -b.vz; settle(b); b.st = 'rest'; gridAdd(b); b.vx = b.vy = b.vz = 0; if (imp > 2) thud(Math.min(1, imp / 6)); }
    } else if (b.st === 'rest') {
      if (sup(b, b.z - 0.02) < b.z - 0.03) { b.st = 'fall'; b.vz = 0; }
    }
  }

  // holes: count the gravel inside, close a hole when it is full
  holeTimer += dt;
  if (holeTimer > 0.4) {
    holeTimer = 0;
    for (const H of HOLES) if (!H.done) {
      let n = 0;
      for (const b of balls) if (b.st === 'rest' && Math.hypot(b.x - H.x, b.y - H.y) < H.r) n++;
      if (n >= H.cap) {
        H.done = true; H.t = time;
        balls = balls.filter(b => !(b.st === 'rest' && Math.hypot(b.x - H.x, b.y - H.y) < H.r + 0.05));
        for (let i = 0; i < (H.road ? 22 : 40); i++) {
          const a = Math.random() * 6.283, sp = 0.6 + Math.random() * 1.4;
          sparks.push({ x: H.x, y: H.y, z: 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 2 + Math.random() * 2.5, life: 1 + Math.random() * 0.6, c: i % 4 });
        }
        jingle(H.road && ROADHOLES.every(r => r.done));
      }
    }
  }
  // exhaust smoke: a little when idling, more when driving, most while the machine works
  const exhaust = [
    [loader, (u, v) => { const c = Math.cos(L.h), s = Math.sin(L.h); return [L.x + u * c - v * s, L.y + u * s + v * c]; }, -1.29, 0.28, 1.42,
      Math.abs(L.alpha - ARM[L.state]) > 0.02 || Math.abs(L.beta - BKT[L.state]) > 0.02],
    [truck, (u, v) => { const c = Math.cos(truck.h), s = Math.sin(truck.h); return [truck.x + u * c - v * s, truck.y + u * s + v * c]; }, -2.4, 0.62, 0.38,
      Math.abs(truck.tilt - TILT[truck.state]) > 0.02],
    [exc, (u, v) => { const a = exc.h + exc.swing, c = Math.cos(a), s = Math.sin(a); return [exc.x + u * c - v * s, exc.y + u * s + v * c]; }, -0.94, -0.54, 2.04,
      exc.tm > 1e-3 || exc.swung],
  ];
  for (const [m, tf, u, v, w, working] of exhaust) {
    const act = m === active, drv = Math.abs(m.speed) > 0.1;
    const rate = act ? (working ? 9 : drv ? 6 : 1.6) : 0.6, big = act && (working || drv);
    m.smk = (m.smk || 0) + rate * dt;
    while (m.smk >= 1 && smoke.length < 160) {
      m.smk -= 1; const [x, y] = tf(u, v);
      smoke.push({ x, y, z: w, vx: (Math.random() - 0.5) * 0.25 + 0.12, vy: (Math.random() - 0.5) * 0.25 - 0.08, vz: 0.45 + Math.random() * 0.35 + (big ? 0.2 : 0),
        age: 0, life: 1.4 + Math.random() * 1.1, sz: big ? 4.5 : 3, a: big ? 0.85 : 0.6 });
    }
    if (m.smk >= 1) m.smk = 0;
  }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const k = smoke[i]; k.age += dt; k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt; k.vz *= 1 - 0.4 * dt;
    if (k.age >= k.life) smoke.splice(i, 1);
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const k = sparks[i]; k.vz -= (k.c >= 4 ? 1.2 : 6) * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.z = Math.max(0, k.z + k.vz * dt); k.life -= dt;
    if (k.life <= 0) sparks.splice(i, 1);
  }

  followCam(dt);
}
