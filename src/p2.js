(() => {
/* ---------- world constants ---------- */
const TW = 40, TH = 20, ZH = 22;          // isometric tile size and height scale (pixels per world unit)
let M = 60; const G0 = 6, G1 = 54, MS = 120;            // world size, gravel field bounds
const HW = 1.45;                          // road half width, in on-screen units of 20 px
const sd = (dx, dy) => Math.hypot((dy - dx) * 20, (dx + dy) * 10) / 20;   // on-screen distance of a ground offset
const BR = 0.12, D2 = (2 * BR) * (2 * BR); // dirt ball radius
let GW = M * TW, GH = M * TH;
const PILE = { x: 30, y: 30 };
const H0 = Math.atan2(3.7, 1.4);
const START_L = { x: 17, y: 36.8, h: -2.17 };
const START_T = { x: 37.5, y: 27.5, h: -Math.PI / 4 };
const START_E = { x: 26, y: 31.3, h: -0.31 };
let scene = 'yard';

const stage = document.getElementById('stage');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let IW = 0, IH = 0, SC = 2;

const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
if (isTouch) document.body.classList.add('touch');

function resize() {
  const W = stage.clientWidth, H = stage.clientHeight, dpr = window.devicePixelRatio || 1;
  SC = Math.max(dpr >= 2 ? 0.8 : 1.1, Math.min(W, H) / 440);
  if (dpr >= 2) SC = Math.max(1, Math.round(SC * dpr)) / dpr;   // whole device pixels per game pixel
  IW = Math.ceil(W / SC); IH = Math.ceil(H / SC);
  cv.width = IW; cv.height = IH;
  cv.style.width = IW * SC + 'px'; cv.style.height = IH * SC + 'px';
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

/* ---------- helpers ---------- */
function hh(x, y) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const gp = (x, y) => [GW / 2 + (y - x) * TW / 2, (x + y) * TH / 2];   // world -> ground canvas pixel

/* ---------- road: a wiggly closed loop ---------- */
const NS = 1440, RX = new Float32Array(NS), RY = new Float32Array(NS), RS = new Float32Array(NS);
{ let acc = 0;
  for (let i = 0; i < NS; i++) {
    const t = i / NS * Math.PI * 2, r = 16 + 2.4 * Math.sin(3 * t) + 1.4 * Math.cos(2 * t + 0.7);
    RX[i] = 30 + r * Math.cos(t); RY[i] = 30 + r * Math.sin(t);
    if (i) acc += sd(RX[i] - RX[i - 1], RY[i] - RY[i - 1]);
    RS[i] = acc;
  } }
const GR = 8, GN = M * GR + 1, DF = new Float32Array(GN * GN).fill(9), DI = new Int32Array(GN * GN);
for (let i = 0; i < NS; i++) {
  const x0 = Math.max(0, Math.floor((RX[i] - 3) * GR)), x1 = Math.min(GN - 1, Math.ceil((RX[i] + 3) * GR));
  const y0 = Math.max(0, Math.floor((RY[i] - 3) * GR)), y1 = Math.min(GN - 1, Math.ceil((RY[i] + 3) * GR));
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    const d = sd(gx / GR - RX[i], gy / GR - RY[i]), k = gy * GN + gx;
    if (d < DF[k]) { DF[k] = d; DI[k] = i; }
  }
}
let RD = 9, RSV = 0;
function roadAt(x, y) {
  const fx = x * GR, fy = y * GR, ix = Math.floor(fx), iy = Math.floor(fy);
  if (ix < 0 || iy < 0 || ix >= GN - 1 || iy >= GN - 1) { RD = 9; return; }
  const ax = fx - ix, ay = fy - iy, k = iy * GN + ix;
  RD = (DF[k] * (1 - ax) + DF[k + 1] * ax) * (1 - ay) + (DF[k + GN] * (1 - ax) + DF[k + GN + 1] * ax) * ay;
  RSV = RS[DI[Math.round(fy) * GN + Math.round(fx)]];
}
const gEdge = (x, y) => Math.min(x - G0, G1 - x, y - G0, G1 - y) + 0.35 * Math.sin(x * 1.3 + y * 0.7) + 0.25 * Math.sin(x * 0.5 - y * 2.1);

/* ---------- bake the ground once ---------- */
const ground = document.createElement('canvas'); ground.width = GW; ground.height = GH;
{
  const g = ground.getContext('2d'), img = g.createImageData(GW, GH), D = img.data;
  const C = {
    g1: [184, 167, 135], g2: [176, 159, 127], g3: [192, 176, 144], gD: [140, 124, 98], gL: [216, 202, 172], gM: [160, 144, 114], gS: [150, 135, 108],
    a: [78, 80, 87], aD: [67, 69, 75], aL: [98, 100, 108], aE: [58, 60, 66], line: [232, 230, 218], yel: [242, 196, 62],
    gr: [108, 143, 62], grD: [90, 122, 51], grL: [128, 165, 74], edge: [146, 128, 96]
  };
  let o = 0;
  for (let py = 0; py < GH; py++) for (let px = 0; px < GW; px++, o += 4) {
    const a = (px - GW / 2) / (TW / 2), b = py / (TH / 2), x = (b - a) / 2, y = (a + b) / 2;
    const n = hh(px, py); let col;
    const e = gEdge(x, y);
    if (e < 0) {
      col = n < 0.12 ? C.grD : n > 0.9 ? C.grL : C.gr;
      if (e > -0.2) col = n < 0.55 ? C.edge : C.grD;
    } else {
      roadAt(x, y);
      if (RD < HW) {
        if (RD > HW - 0.1) col = C.aE;
        else if (RD > HW - 0.34 && RD < HW - 0.22) col = C.line;
        else if (RD < 0.09 && (RSV % 1.5) < 0.8) col = C.yel;
        else col = n < 0.1 ? C.aD : n > 0.93 ? C.aL : C.a;
      } else {
        const pch = hh(Math.floor(x * 1.5) + 999, Math.floor(y * 1.5));
        col = pch < 0.33 ? C.g1 : pch < 0.66 ? C.g2 : C.g3;
        if (n < 0.07) col = C.gD; else if (n > 0.94) col = C.gL; else if (n > 0.45 && n < 0.5) col = C.gM;
        if (RD < HW + 0.14) col = n < 0.5 ? C.gS : C.gD;
      }
    }
    D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const R = rng(7);
  for (let i = 0; i < 180; i++) {               // stones on the gravel
    const x = G0 + 1 + R() * (G1 - G0 - 2), y = G0 + 1 + R() * (G1 - G0 - 2);
    roadAt(x, y);
    if (RD < HW + 0.5 || Math.hypot(x - PILE.x, y - PILE.y) < 3) continue;
    const [sx, sy] = gp(x, y).map(Math.round), big = R() < 0.3;
    g.fillStyle = '#76706a'; g.fillRect(sx, sy, big ? 4 : 3, big ? 3 : 2);
    g.fillStyle = '#a49e94'; g.fillRect(sx, sy, big ? 3 : 2, 1);
  }
  for (let i = 0; i < 650; i++) {               // grass tufts
    const x = R() * M, y = R() * M;
    if (gEdge(x, y) > -0.5) continue;
    const [sx, sy] = gp(x, y).map(Math.round);
    g.fillStyle = '#56772f'; g.fillRect(sx, sy, 1, 2); g.fillRect(sx + 2, sy, 1, 2); g.fillRect(sx + 1, sy + 1, 1, 1);
    g.fillStyle = '#8fb553'; g.fillRect(sx + 1, sy - 1, 1, 1);
  }
}
/* ---------- holes to fill with gravel ---------- */
const HOLES = [];
function holeDepth(H, x, y) {
  const d = Math.hypot(x - H.x, y - H.y);
  return d < H.r ? -H.d * Math.min(1, (1 - d / H.r) * 3.2) : 0;
}
function makeHole(x, y, r, d, cap, road) {
  const H = { x, y, r, d, cap, road, done: false, t: -99, h: 0, rect: [-r * 0.45, r * 0.45, r * 0.45] };
  const [cx, cy] = gp(x, y);
  H.bx = Math.floor(cx - r * 29 - 2); H.by = Math.floor(cy - r * 15 - 2);
  const w = Math.ceil(r * 58 + 4), h = Math.ceil(r * 30 + 4);
  const open = document.createElement('canvas'), patch = document.createElement('canvas');
  open.width = patch.width = w; open.height = patch.height = h;
  const io = open.getContext('2d').createImageData(w, h), ip = patch.getContext('2d').createImageData(w, h);
  const top = road ? [70, 70, 76] : [150, 122, 90], wall = road ? [132, 100, 68] : [140, 106, 72], deep = [74, 52, 34];
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const gx = H.bx + px + 0.5, gy = H.by + py + 0.5, a = (gx - GW / 2) / (TW / 2), b = gy / (TH / 2);
    const wx = (b - a) / 2, wy = (a + b) / 2, dist = Math.hypot(wx - x, wy - y);
    if (dist >= r) continue;
    // follow the view ray into the hole until it meets the bowl surface
    let z = 0;
    for (let k = 0; k <= 160; k++) {
      const dl = k * 0.012, rz = -dl * 10 / ZH, sz = holeDepth(H, wx - dl / 2, wy - dl / 2);
      if (sz >= rz) { z = sz; break; }
    }
    const f = -z / d, n = 0.9 + 0.2 * hh(px + 77, py + 13), o = (py * w + px) * 4;
    const c0 = f < 0.22 ? top : wall, c = f < 0.22 ? c0 : [0, 1, 2].map(i => wall[i] + (deep[i] - wall[i]) * Math.min(1, (f - 0.22) / 0.78));
    io.data[o] = c[0] * n; io.data[o + 1] = c[1] * n; io.data[o + 2] = c[2] * n; io.data[o + 3] = 255;
    const ring = dist > r * 0.86, pc = road ? (ring ? [104, 106, 112] : [60, 61, 67]) : (ring ? [138, 120, 92] : [158, 138, 106]);
    ip.data[o] = pc[0] * n; ip.data[o + 1] = pc[1] * n; ip.data[o + 2] = pc[2] * n; ip.data[o + 3] = 255;
  }
  open.getContext('2d').putImageData(io, 0, 0); patch.getContext('2d').putImageData(ip, 0, 0);
  H.spr = open; H.patch = patch;
  H.rim = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; H.rim.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 0]); }
  HOLES.push(H);
  return H;
}
function gz(x, y) {
  for (const H of HOLES) if (!H.done) { const z = holeDepth(H, x, y); if (z < 0) return z; }
  return 0;
}
function holeAt(x, y) {
  for (const H of HOLES) if (!H.done && Math.hypot(x - H.x, y - H.y) < H.r) return H;
  return null;
}
function roadPt(t) {
  const i = ((Math.round(t / (2 * Math.PI) * NS)) % NS + NS) % NS, j = (i + 4) % NS;
  const tx = RX[j] - RX[i], ty = RY[j] - RY[i], l = Math.hypot(tx, ty), nx = -ty / l, ny = tx / l;
  const k = 1 / sd(nx, ny);                                 // world length of one on-screen road unit across the road
  return (o) => [RX[i] + nx * o * k, RY[i] + ny * o * k];
}
const PIT = makeHole(33, 36.5, 1.6, 0.75, 85, false);
makeHole(36.5, 33, 1.2, 0.6, 40, false);
makeHole(24.5, 36, 1.2, 0.6, 40, false);
const ROADHOLES = [1.28, 1.44, 1.6, 1.76].map((t, i) => { const [x, y] = roadPt(t)(i % 2 ? 0.45 : -0.45); return makeHole(x, y, 0.62, 0.42, 17, true); });

/* roadwork cones and signs */
function pix(rows, pal) {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const CONE = pix(['...o...', '..oOo..', '..wWw..', '..wWw..', '.ooOOo.', '.ooOOo.', '.wwWWw.', 'ooooOOo', 'kkkkkkk'],
  { o: '#ff7a24', O: '#d9561a', w: '#fff4e0', W: '#d8cdbd', k: '#2a2420' });
const SIGN = pix([
  '......r......', '.....rrr.....', '.....ryr.....', '....ryyyr....', '....ryyyr....', '...ryykyyr...', '...ryykkyr...', '..ryykkykyr..',
  '..ryykyykyr..', '.ryyykyyyykr.', '.ryykkyykkkr.', 'rrrrrrrrrrrrr', '......g......', '......g......', '......g......', '......g......', '......g......', '.....ggg.....'],
  { r: '#d8331f', y: '#ffd23a', k: '#2a2420', g: '#8a8a90' });
const DECO = [];
for (const t of [1.14, 1.9]) for (const o of [-1.05, -0.35, 0.35, 1.05]) DECO.push({ p: roadPt(t)(o), spr: CONE, ax: 3, ay: 8 });
for (let t = 1.22; t < 1.86; t += 0.155) for (const o of [-1.25, 1.25]) DECO.push({ p: roadPt(t)(o), spr: CONE, ax: 3, ay: 8 });
for (const t of [1.03, 2.01]) DECO.push({ p: roadPt(t)(-2.3), spr: SIGN, ax: 6, ay: 17 });

/* tyre tracks live on their own layer so a reset can wipe them */
const tracks = document.createElement('canvas'); tracks.width = GW; tracks.height = GH;
const tctx = tracks.getContext('2d');

/* ---------- ball sprites ---------- */
function ballSprite(k) {
  const c = document.createElement('canvas'); c.width = c.height = 7;
  const g = c.getContext('2d');
  const pal = [['#4a2f17', '#6e4522', '#8a5a2e', '#a8743f', '#c99a62'],
               ['#45301c', '#684628', '#835c35', '#9f7647', '#c09466'],
               ['#4d2c14', '#74431f', '#93592a', '#b2733b', '#d09358'],
               ['#3c3b3a', '#5e5b57', '#7b7771', '#99948c', '#bdb7ad'],
               ['#433d38', '#655d55', '#837a70', '#a2988c', '#c4baad']][k];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const dx = x - 3, dy = y - 3, r2 = dx * dx + dy * dy;
    if (r2 > 10) continue;
    const l = (-dx * 0.55 - dy * 0.85) / 3;
    let ci = r2 > 6 ? 0 : l > 0.55 ? 4 : l > 0.15 ? 3 : l > -0.35 ? 2 : 1;
    if (r2 > 6 && l > 0.3) ci = 1;
    g.fillStyle = pal[ci]; g.fillRect(x, y, 1, 1);
  }
  return c;
}
const BALLSPR = [0, 1, 2, 3, 4].map(ballSprite);
/* big grey boulders: hand-shaded pixel rocks, three different outlines */
function rockSprite(seed) {
  const W = 24, H = 22, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rng(seed * 97 + 5), n = 9, rad = [];
  for (let i = 0; i < n; i++) rad.push(0.8 + R() * 0.2);
  const rf = a => { const t = ((a / 6.2832) + 1) % 1 * n, i = Math.floor(t), f = t - i; return rad[i % n] * (1 - f) + rad[(i + 1) % n] * f; };
  const pal = ['#2c2d31', '#4a4b50', '#686a6f', '#85878b', '#a6a8a8', '#c8c8c2'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - W / 2) / 11.4, dy = (y + 0.5 - H / 2) / 10.4, d = Math.hypot(dx, dy), lim = rf(Math.atan2(dy, dx));
    if (d > lim) continue;
    const e = d / lim, nz = Math.sqrt(Math.max(0, 1 - e * e)), nx = dx / lim, ny = dy / lim;
    const l = -nx * 0.45 - ny * 0.7 + nz * 0.6 + (hh(Math.floor(x / 4) + seed * 11, Math.floor(y / 4) + seed * 5) - 0.5) * 0.7;
    let ci = e > 0.88 ? 0 : l > 0.95 ? 5 : l > 0.7 ? 4 : l > 0.45 ? 3 : l > 0.2 ? 2 : 1;
    if (e <= 0.88 && hh(x * 7 + seed, y * 13) < 0.06) ci = Math.max(1, ci - 1);
    g.fillStyle = pal[ci]; g.fillRect(x, y, 1, 1);
  }
  return c;
}
const ROCKSPR = [1, 2, 3].map(rockSprite);
const RR = 0.36;                              // boulder radius

/* ---------- audio ---------- */
let AC = null, master, engO, engG, beepG, hydG, blowG, blowF, noise, lastThud = 0, lastPlop = 0;
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
  engO = AC.createOscillator(); engO.type = 'sawtooth'; engO.frequency.value = 46;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280;
  engG = AC.createGain(); engG.gain.value = 0; engO.connect(lp).connect(engG).connect(master); engO.start();
  const bo = AC.createOscillator(); bo.type = 'square'; bo.frequency.value = 1080;
  beepG = AC.createGain(); beepG.gain.value = 0; bo.connect(beepG).connect(master); bo.start();
  const ho = AC.createOscillator(); ho.type = 'triangle'; ho.frequency.value = 150;
  hydG = AC.createGain(); hydG.gain.value = 0; ho.connect(hydG).connect(master); ho.start();
  noise = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.25), AC.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // snow blower: a long looping noise through a band-pass filter
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const bs = AC.createBufferSource(); bs.buffer = nb; bs.loop = true;
  blowF = AC.createBiquadFilter(); blowF.type = 'bandpass'; blowF.frequency.value = 400; blowF.Q.value = 0.7;
  blowG = AC.createGain(); blowG.gain.value = 0; bs.connect(blowF).connect(blowG).connect(master); bs.start();
  loadSounds();
}
const setG = (g, v) => { if (AC) g.gain.setTargetAtTime(v, AC.currentTime, 0.015); };
function thud(v) {
  if (!AC) return; const t = AC.currentTime; if (t - lastThud < 0.05) return; lastThud = t;
  const s = AC.createBufferSource(); s.buffer = noise;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
  const g = AC.createGain(); g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.16);
}
function hiss() {                              // compressed-air brake release, a bit different every time
  if (!AC) return; const t = AC.currentTime, R = Math.random, dur = 0.55 + R() * 0.7, peak = 0.16 + R() * 0.06;
  const s = AC.createBufferSource(); s.buffer = noise; s.loop = true; s.playbackRate.value = 0.85 + R() * 0.4;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400 + R() * 1400;
  const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 6500 + R() * 4000;
  const g = AC.createGain(), tail = dur * (0.55 + R() * 0.3);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + 0.02 + R() * 0.03);
  g.gain.setValueAtTime(peak * (0.7 + R() * 0.3), t + 0.1 + R() * 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  f.frequency.linearRampToValueAtTime(f.frequency.value * (0.5 + R() * 0.3), t + tail);
  s.connect(f).connect(f2).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
}
let pedalT = 0, braked = false, lastActive = null;
function crunch() {                           // rock into the crusher: a few hard knocks that cut through the engine
  if (!AC) return; const t = AC.currentTime, R = Math.random;
  for (let i = 0; i < 6; i++) {
    const t0 = t + i * (0.075 + R() * 0.04), v = 1 - i * 0.1;
    const s = AC.createBufferSource(); s.buffer = noise;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 + R() * 1800; f.Q.value = 1.4;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setValueAtTime(1.1 * v, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + 0.1);
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190 + R() * 60, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 0.1);
    const g2 = AC.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.setValueAtTime(0.7 * v, t0); g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    o.connect(g2).connect(master); o.start(t0); o.stop(t0 + 0.13);
  }
}
function jingle(big) {
  if (!AC) return; const t = AC.currentTime;
  const notes = big ? [523, 659, 784, 1047, 784, 1047, 1319] : [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = AC.createGain(), s0 = t + i * 0.11;
    g.gain.setValueAtTime(0.0001, t); g.gain.setValueAtTime(0.12, s0); g.gain.exponentialRampToValueAtTime(0.001, s0 + 0.22);
    o.connect(g).connect(master); o.start(s0); o.stop(s0 + 0.25);
  });
}
function plop() {
  if (!AC) return; const t = AC.currentTime; if (t - lastPlop < 0.07) return; lastPlop = t;
  const o = AC.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(440 + Math.random() * 80, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.09);
  const g = AC.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.12);
}
