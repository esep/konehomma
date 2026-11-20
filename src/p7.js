let bktBump = 0, LKC = -1e9, EKC = -1e9;
function render() {
  hintStep();
  const snowy = scene === 'snow';
  ctx.fillStyle = snowy ? SNOW_BG : '#6c8f3e'; ctx.fillRect(0, 0, IW, IH);
  OX = Math.round(IW / 2 - camX); OY = Math.round(IH / 2 - camY);
  if (snowy) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundS, OX, OY, GW, GH);
    ctx.drawImage(sideC, OX, OY + 6, GW, GH);              // the cut edge of the snow layer: deep snow outside the road
    ctx.drawImage(sideC, OX, OY + 3, GW, GH);
    ctx.drawImage(topC, OX, OY, GW, GH);
    ctx.drawImage(banksC, OX, OY, GW, GH);
    ctx.fillStyle = 'rgba(36,56,120,0.14)'; ctx.fillRect(0, 0, IW, IH);   // winter dusk, so the lights show
    ctx.fillStyle = 'rgba(30,44,90,0.2)';
    for (const s of SHAD) {                                 // building shadows: hull of the footprint and the footprint shifted away from the light
      const [a0, b0, a1, b1] = s.u, dx = -0.16 * s.h, dy = 0.45 * s.h, pts = [];
      for (const [x, y] of [[a0, b0], [a1, b0], [a1, b1], [a0, b1]]) { pts.push(P([x, y, 0]), P([x + dx, y + dy, 0])); }
      pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
      for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      const hull = lo.slice(0, -1).concat(up.slice(0, -1));
      ctx.beginPath(); hull.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,44,90,0.3)';
    drawShadow(tractor, -3.95, 2.3, 1.3);
  } else {
  ctx.drawImage(ground, OX, OY);
  for (const H of HOLES) ctx.drawImage(H.done ? H.patch : H.spr, OX + H.bx, OY + H.by);
  ctx.drawImage(tracks, OX, OY);

  ctx.fillStyle = 'rgba(40,30,20,0.28)';
  drawShadow(loader, -1.7, 0.05, 0.95);
  drawShadow({ x: loader.x, y: loader.y, h: loader.h + loader.steer }, -0.05, Math.max(1.35, 0.35 + 1.6 * Math.cos(loader.alpha) + 0.6), 0.95);
  drawShadow(CR, -2.85, 1.6, 1.05);
  ctx.fillStyle = 'rgba(40,30,20,0.18)';
  drawShadow(CR, 1.6, 4.7, 0.5);
  ctx.fillStyle = 'rgba(40,30,20,0.28)';
  drawShadow(truck, -2.15, 2.25, 1.0);
  drawShadow(exc, -1.65, 1.3, 1.0);
  if (active === exc && !(exc.state === 3 && (exc.rock || exc.slots.some(Boolean)))) {      // dashed guide (hidden while the red drop circle is shown) on the ground: where the bucket points
    const a = exc.h + exc.swing, c = Math.cos(a), s = Math.sin(a), q0 = P([exc.x + c * 3.3, exc.y + s * 3.3, 0]), q1 = P([exc.x + c * 7.5, exc.y + s * 7.5, 0]);
    ctx.save(); ctx.strokeStyle = 'rgba(255,250,225,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(40,30,20,0.3)';
  for (const b of balls) if (b.st === 'fall' && b.z > 0.4) { const q = P([b.x, b.y, 0]); ctx.fillRect(q[0] - 2, q[1] - 1, 5, 2); }
  for (const r of rocks) if (r.st === 'rest' || r.st === 'fall') {
    const q = P([r.x, r.y, 0]), k = r.st === 'rest' ? 1 : 0.7;
    ctx.beginPath(); ctx.ellipse(q[0] + 1, q[1] + 2, 10 * k, 4.5 * k, 0, 0, 6.283); ctx.fill();
  }
  }

  const parts = [];
  beacons = []; lamps = [];
  let tp = null;
  if (snowy) {
    buildTractor(parts); tp = parts.slice();
    for (const t of TREES) {
      const q = P([t.x, t.y, 0]); if (q[0] < -50 || q[0] > IW + 50 || q[1] < -10 || q[1] > IH + 300) continue;
      const b = t.t === 'b';
      { const spr = b ? BARE_L : SPRUCE_L, sc = t.s * (b ? 1.0 : 1.05); parts.push({ k: depth([t.x, t.y, 0.2]), deco: { p: [t.x, t.y], spr, ax: spr.width * sc / 2, ay: (spr.height - 4) * sc, sc } }); }
    }
    for (const st of STONES) { const q = P([st.x, st.y, 0]); if (q[0] < -40 || q[0] > IW + 40 || q[1] < -40 || q[1] > IH + 60) continue; const spr = ROCKSPR[st.s]; parts.push({ k: depth([st.x, st.y, 0.2 + st.lift]), deco: { p: [st.x, st.y], spr, ax: spr.width * st.sc / 2, ay: spr.height * st.sc * 0.8 + st.lift * ZH, sc: st.sc } }); }
    for (const list of [MINT, MPARTS]) for (const mp of list) {
      if (mp.bi !== undefined) { const ca = HB[mp.bi].a; if (mp.vis === 'full' || mp.vis === 'roof' ? ca > 0.5 : ca <= 0.5) continue; mp._fa = mp.side === 'W' && tractor.x < HB[mp.bi].x0 || mp.side === 'N' && tractor.y < HB[mp.bi].y0; }   // a far wall is see-through when the tractor is outside it
      const q = P(mp.c), r = mp.rad * TW + 20;
      if (q[0] > -r && q[0] < IW + r && q[1] > -r - 90 && q[1] < IH + r + 90) parts.push(mp);
    }
  } else {
    buildLoader(parts);
    buildTruck(parts);
    buildExc(parts);
    PJ[1] = CR.shake > 0 ? Math.round(Math.sin(time * 70) * Math.min(1, CR.shake) * 1.4) : 0;
    const cr0 = parts.length;
    buildCrusher(parts);
    PJ[1] = 0;
    // bucket parts nearer to the viewer than the bucket centre are drawn after the rocks inside it, the rest before them
    const roles = flag => { const ps = parts.filter(q => q[flag]); if (!ps.length) return -1e9; let kc = 0; for (const q of ps) kc += q.k; kc /= ps.length;
      for (const q of ps) { if (q.flr) q.k = Math.min(q.k, kc - 0.3); else if (q.k > kc + 0.02) q.k = Math.max(q.k, kc + 0.1); else q.k = Math.min(q.k, kc - 0.1); } return kc; };
    LKC = roles('bkt'); EKC = roles('ebk');
    // a bucket raised towards the crusher is drawn completely on top of it (a lowered one stays behind it)
    bktBump = 0;
    if (loader.alpha > 0.3 && Math.hypot(loader.x - CR.x, loader.y - CR.y) < 10) {
      let crK = -1e9, bk = 1e9; for (let i = cr0; i < parts.length; i++) crK = Math.max(crK, parts[i].k);
      for (const q of parts) if (q.bkt) bk = Math.min(bk, q.k);
      if (bk < 1e9 && crK > bk) { bktBump = crK - bk + 0.02; for (const q of parts) if (q.bkt) q.k += bktBump; LKC += bktBump; }
    }
  }
  // headlight pools on the ground, under everything standing
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of lamps) {
    ctx.fillStyle = l.col || (snowy ? 'rgba(255,236,170,0.17)' : 'rgba(255,236,170,0.07)');
    const a = P(l.g0), b = P(l.g1), c2 = P(l.g2);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  if (!snowy) {
    for (const b of balls) parts.push({ k: b.st === 'bkt' && LKC > -1e8 ? LKC : b.st === 'ebkt' && EKC > -1e8 ? EKC : depth([b.x, b.y, b.z]) + 0.05, ball: b });
    for (const r of rocks) parts.push({ k: r.st === 'lbkt' && LKC > -1e8 ? LKC : r.st === 'ebkt' && EKC > -1e8 ? EKC : depth([r.x, r.y, r.z]) + (r.st === 'lbkt' || r.st === 'ebkt' ? 0.45 : 0.05), rock: r });
    for (const d of DECO) parts.push({ k: depth([d.p[0], d.p[1], 0.2]), deco: d });
  }
  if (snowy) for (const f of flakes) parts.push({ k: f.x + f.y + 0.3 * f.z, flake: f });     // thrown snow is sorted with the buildings, so roofs cover it
  parts.sort((a, b) => a.k - b.k);
  ctx.lineWidth = 1; ctx.lineJoin = 'round';
  for (const p of parts) {
    if (p.flake) { const f = p.flake, q = P([f.x, f.y, f.z]), sz = f.d ? 1 : 2; ctx.fillStyle = f.c ? '#ffffff' : '#cfdcf0'; ctx.fillRect(q[0], q[1], sz, sz); continue; }
    if (p.wp) {
      const fa = p._fa; if (fa) ctx.globalAlpha = 0.4;
      for (const pl of p.polys) {
        const w = pl.w; ctx.fillStyle = ctx.strokeStyle = pl.col; ctx.beginPath();
        for (let i = 0; i < w.length; i++) { const q = P(w[i]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
        ctx.closePath(); ctx.fill(); if (!fa) ctx.stroke();
      }
      if (fa) ctx.globalAlpha = 1;
      continue;
    }
    if (p.rock) { const q = P([p.rock.x, p.rock.y, p.rock.z]); ctx.drawImage(ROCKSPR[p.rock.s], q[0] - 12, q[1] - 13); continue; }
    if (p.sb) { const q = P(p.sb); ctx.drawImage(SNOWB, q[0] - 4, q[1] - 6, 9, 7); continue; }
    if (p.deco) { const q = P([p.deco.p[0], p.deco.p[1], 0]); const sc = p.deco.sc || 1; ctx.drawImage(p.deco.spr, q[0] - p.deco.ax, q[1] - p.deco.ay, p.deco.spr.width * sc, p.deco.spr.height * sc); continue; }
    if (p.ball) {
      const b = p.ball, q = P([b.x, b.y, b.z]);
      if (q[0] > -10 && q[1] > -10 && q[0] < IW + 10 && q[1] < IH + 10) {
        const H = b.z < BR - 0.01 ? holeAt(b.x, b.y) : null;
        if (H) {                                    // the near rim hides gravel deep in a hole
          ctx.save(); ctx.beginPath();
          H.rim.forEach((r, i) => { const s2 = P(r); i ? ctx.lineTo(s2[0], s2[1]) : ctx.moveTo(s2[0], s2[1]); });
          ctx.closePath(); ctx.clip(); ctx.drawImage(BALLSPR[b.v], q[0] - 3, q[1] - 3); ctx.restore();
        } else ctx.drawImage(BALLSPR[b.v], q[0] - 3, q[1] - 3);
      }
      continue;
    }
    for (const pl of p.polys) {
      const q = pl.pts; ctx.fillStyle = ctx.strokeStyle = pl.col;
      ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (snowy && tp && (occludedAt(tractor.x, tractor.y, 1.2) || occludedAt(tractor.x, tractor.y, 2.4))) {   // a building is in the way: show the tractor through it
    ctx.globalAlpha = 0.55;
    for (const p of tp) if (p.polys) for (const pl of p.polys) {
      const q = pl.pts; ctx.fillStyle = ctx.strokeStyle = pl.col; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
      for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // excavator (drawn over the ground pile): with a loaded, raised bucket the next press dumps it - show where it will land
  if (!snowy && exc.state === 3 && (exc.rock || exc.slots.some(Boolean))) {
    const g4 = excGeo(Object.assign({}, exc, { j: EXP[4].slice() })), dp = g4.loc(0.3, 0.2, 0), R0 = 0.95;
    ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 14; ctx.strokeStyle = 'rgba(235,40,36,0.97)'; ctx.fillStyle = 'rgba(235,40,36,0.2)';
    ctx.beginPath(); for (let i = 0; i <= 28; i++) { const an = i / 28 * 6.283, q = P([dp[0] + Math.cos(an) * R0, dp[1] + Math.sin(an) * R0, 0.02]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  const SPC = ['#fff6b0', '#ffd866', '#ff9a3c', '#ffffff', '#d9d2c2', '#a89f8e'];
  for (const k of sparks) { const q = P([k.x, k.y, k.z]), d = k.c >= 4; ctx.globalAlpha = d ? Math.min(1, k.life * 1.4) : 1; ctx.fillStyle = SPC[k.c]; ctx.fillRect(q[0] - 1, q[1] - 1, d ? 3 : 2, d ? 3 : 2); }
  ctx.globalAlpha = 1;
  if (snowy) drawSnowfall();
  // beacon light: flashing halo, then a rotating beam
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = (q, r, a) => { ctx.fillStyle = `rgba(255,160,40,${a})`; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.283); ctx.fill(); };
  for (const bc of beacons) {
    const q = P(bc.p);
    if (bc.mode === 'steady') { glow(q, 4, 0.3); continue; }
    if (bc.mode === 'flash') { if (bc.on) { glow(q, 9, 0.25); glow(q, 5, 0.45); } continue; }
    const a = bc.ang, Lr = 1.9, sp = 0.24, e1 = P([bc.p[0] + Math.cos(a - sp) * Lr, bc.p[1] + Math.sin(a - sp) * Lr, bc.p[2]]),
      e2 = P([bc.p[0] + Math.cos(a + sp) * Lr, bc.p[1] + Math.sin(a + sp) * Lr, bc.p[2]]);
    ctx.fillStyle = 'rgba(255,150,30,0.2)';
    ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.fill();
    glow(P([bc.p[0] + Math.cos(a) * 0.08, bc.p[1] + Math.sin(a) * 0.08, bc.p[2]]), 3, 0.6);
  }
  for (const l of lamps) {
    const q = P(l.p);
    ctx.fillStyle = l.dot || 'rgba(255,240,190,0.35)'; ctx.beginPath(); ctx.arc(q[0], q[1], l.r || 3, 0, 6.283); ctx.fill();
  }
  ctx.restore();
  for (const k of smoke) {
    const q = P([k.x, k.y, k.z]), f = k.age / k.life, sz = Math.round(k.sz + f * 9);
    ctx.globalAlpha = k.a * (1 - f) * Math.min(1, k.age * 6); ctx.fillStyle = f < 0.5 ? '#16161a' : '#34343a';
    ctx.fillRect(q[0] - (sz >> 1), q[1] - (sz >> 1), sz, sz);
  }
  ctx.globalAlpha = 1;
  drawPointer(active);
}

/* ---------- levels and the start menu ---------- */
const hint = document.getElementById('hint');
const HINT_SNOW = '<b>← → ↑ ↓</b> ajaminen · <b>välilyönti</b> puskulevy ylös/alas · <b>Del PgDn</b> lingon suunta · <b>M</b> valikko';
const hintYard = m => '<b>← → ↑ ↓</b> ajaminen · <b>välilyönti</b> ' + (m === truck ? 'lava' : 'kauha') + (m === exc ? ' · <b>Del PgDn</b> tornin kääntö' : '') + ' · <b class="num">1 2 3</b> vaihtaa konetta · <b>M</b> valikko';
let hintKey = '';
function hintStep() { const k = scene === 'snow' ? 'snow' : String(machines.indexOf(active)); if (k === hintKey) return; hintKey = k; hint.innerHTML = scene === 'snow' ? HINT_SNOW : hintYard(active); }
hint.innerHTML = hintYard(active);
let lastYard = null;
function setScene(s) {
  if (s === scene) return;
  for (const k in keys) keys[k] = 0;
  M = s === 'snow' ? MS : 60; GW = M * TW; GH = M * TH;           // the Mikkola world is twice as wide as the pit
  if (s === 'snow') { if (!snowReady) initSnow(); lastYard = active; scene = 'snow'; setActive(tractor); }
  else { scene = 'yard'; setActive(lastYard && lastYard !== tractor ? lastYard : loader); }
  const sn = scene === 'snow';
  document.body.classList.toggle('snowmode', sn);
  camInit = false;
  hintKey = ''; hintStep();
  const lbl = sn ? ['Käännä puhallusta vasemmalle', 'Käännä puhallusta oikealle'] : ['Käännä tornia vasemmalle', 'Käännä tornia oikealle'];
  document.getElementById('swlb').setAttribute('aria-label', lbl[0]); document.getElementById('swrb').setAttribute('aria-label', lbl[1]);
  document.getElementById('act').setAttribute('aria-label', sn ? 'Nosta tai laske puskulevy' : 'Kauha tai lava');
}

/* ---------- input ---------- */
let hinted = false;
function firstInput() { audio(); if (!hinted && isTouch) { hinted = true; setTimeout(() => hint.classList.add('gone'), 4000); } }
/* start screen: the first tap unlocks sound, so the engine is heard as soon as a machine can be driven */
let started = false;
const startEl = document.getElementById('start');
function crank() {
  if (!AC) return; const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(18, t); o.frequency.linearRampToValueAtTime(34, t + 0.5); o.frequency.exponentialRampToValueAtTime(60, t + 0.9);
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.08);
  g.gain.setValueAtTime(0.16, t + 0.75); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.25);
}
const cards = [...document.querySelectorAll('.card')];
function startLevel(lv, el) {
  if (started) return;
  firstInput();                                        // unlock the sound inside the tap itself
  const go = () => { setScene(lv); started = true; startEl.hidden = true; el && el.classList.remove('load'); crank(); };
  if (lv === 'snow' && !snowReady) { el && el.classList.add('load'); setTimeout(go, 50); } else go();
}
function showMenu() {
  if (!started) return;
  started = false; startEl.hidden = false; for (const k in keys) keys[k] = 0;
  const c = cards[scene === 'snow' ? 1 : 0]; if (c) c.focus();
}
cards.forEach(c => c.addEventListener('click', () => startLevel(c.dataset.lv, c)));
document.getElementById('menubtn').addEventListener('click', e => { e.currentTarget.blur(); showMenu(); });
cards[0].focus();
function pickMachine(i) { firstInput(); if (scene === 'snow') return; setActive(machines[i]); }
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Delete: 'swl', PageDown: 'swr' };
addEventListener('keydown', e => {
  if (!started) {
    const fi = cards.indexOf(document.activeElement);
    if (e.key === '1' || e.key === '2') { e.preventDefault(); startLevel(cards[+e.key - 1].dataset.lv, cards[+e.key - 1]); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); cards[fi === 0 ? 1 : 0].focus(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); const c = cards[fi < 0 ? 0 : fi]; startLevel(c.dataset.lv, c); }
    return;
  }
  if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') { e.preventDefault(); showMenu(); return; }
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = 1; e.preventDefault(); firstInput(); }
  else if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); firstInput(); if (!e.repeat) action(); }
  else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); firstInput(); if (!e.repeat) nextMachine(); }
  else if (e.key === '1' || e.key === '2' || e.key === '3') pickMachine(+e.key - 1);
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = 0; e.preventDefault(); } });
addEventListener('blur', () => { for (const k in keys) keys[k] = 0; });

// tap or click a machine to drive it
cv.addEventListener('pointerdown', e => {
  firstInput();
  if (scene === 'snow') return;
  const r = cv.getBoundingClientRect(), ix = (e.clientX - r.left) / r.width * IW, iy = (e.clientY - r.top) / r.height * IH;
  let best = null, bd = 60;
  for (const m of machines) {
    const q = P([m.x, m.y, 1.0]), d = Math.hypot(q[0] - ix, q[1] - iy);
    if (d < bd) { bd = d; best = m; }
  }
  if (best) setActive(best);
});

for (const el of document.querySelectorAll('.btn[data-k]')) {
  const k = el.dataset.k;
  const on = e => { e.preventDefault(); firstInput(); keys[k] = 1; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) {} };
  const off = () => { keys[k] = 0; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
mbtns.forEach((b, i) => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); pickMachine(i); b.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => b.classList.remove('on'));
});
const act = document.getElementById('act');
act.addEventListener('pointerdown', e => { e.preventDefault(); firstInput(); action(); act.classList.add('on'); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) act.addEventListener(ev, () => act.classList.remove('on'));
document.getElementById('reset').addEventListener('click', e => { e.currentTarget.blur(); if (scene === 'snow') resetSnow(); else reset(); });
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- loop ---------- */
reset();
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
  update(dt); render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__game = { setScene, keys, tractor, loader, truck, exc, CR, rocks, balls, action, gX, gY, startLevel: lv => startLevel(lv), snd: () => ({ loaded: Object.keys(SB), exc: Object.keys(EXB), st: curEng && curEng.st, eng: curEng && curEng.id, wind: !!wSrc, wl: wGain && wGain.gain.value, tg: tGain && tGain.gain.value, ac: AC && AC.state }) };
})();
