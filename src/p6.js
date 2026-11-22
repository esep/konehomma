
/* ================= SNOW YARD ================= */
const BL_U0 = -2.85, BL_U1 = -2.4, BL_HW = 1.3, PL_U0 = 2.05, PL_U1 = 2.45, PL_HW = 0.97, CH_MIN = Math.PI / 2, CH_MAX = Math.PI * 1.5, CH_U = -3.55;
const LD_P0 = [-0.2, 1.35], LD_B = 1.9, LD_S = 1.1;   // loader boom pivot, boom length, stick length
function loaderGeo(L) {                          // boom and stick with a bend between them; L: 0 = plate on the ground, 1 = raised
  const tb = 0.05 + 0.23 * L, ts = tb - 1.05;
  const E = [LD_P0[0] + LD_B * Math.cos(tb), LD_P0[1] + LD_B * Math.sin(tb)];
  return { E, F: [E[0] + LD_S * Math.cos(ts), E[1] + LD_S * Math.sin(ts)], tb, ts };
}
const SRS = 0.5, SCW = MS * TW * SRS, SCH = MS * TH * SRS;     // the snow layers are drawn at half resolution: the world is twice as wide
const gpr = (x, y) => [SCW / 2 + (y - x) * TW * SRS / 2, (x + y) * TH * SRS / 2];
const BKC = 0.3, BKN = Math.ceil(MS / BKC), bankN = new Uint8Array(BKN * BKN);
const SNOW_BG = '#e2e9f3';
const SN1 = [233, 239, 247], SN2 = [227, 234, 244], SN3 = [239, 244, 251], SND = [208, 219, 236], SNL = [252, 253, 255];
const flakes = [];
let snowReady = false, snowTop, snowSide, topC, sideC, groundS, banksC, topX, sideX, bctx;
const inPlot = (x, y) => x >= PX0 && y >= PY0 && y <= PY1 && x <= riverEdge(y) - 0.05 && !inBld(x, y);
const SNOWB = pix(['..www..', '.wWWWw.', 'wWWWWWw', 'wWWWWsw', '.sssss.'], { w: '#f2f6fc', W: '#ffffff', s: '#a9bbd9' });
const SPRUCE = pix([
  '......www......', '.....wgggw.....', '......ggg......', '.....wgGgw.....', '....wgggggw....', '.....gggGg.....', '....wgggggw....',
  '...wgggGgggw...', '....ggggggg....', '...wgggggggw...', '..wgggGggggGw..', '...ggggggggg...', '..wgggggggggw..', '.wgggGgggggGgw.',
  '..ggggggggggg..', '.wgggggggggggw.', 'wgggGgggggGgggw', '.ggggggggggggg.', '.sssssssssssss.', '......ttt......', '......ttt......', '.....kkkkk.....'],
  { g: '#31603f', G: '#264d33', s: '#1b3a27', w: '#eef4fb', t: '#5a3d28', k: '#b9c6dc' });
function mkCanvas() { const c = document.createElement('canvas'); c.width = SCW; c.height = SCH; return c; }
function bakeSnow(under) {
  const T = snowTop.data, S = snowSide.data, G = under ? under.data : null;
  let o = 0;
  for (let py = 0; py < SCH; py++) for (let px = 0; px < SCW; px++, o += 4) {
    const a = (px + 0.5 - SCW / 2) / (TW * SRS / 2), b = (py + 0.5) / (TH * SRS / 2), x = (b - a) / 2, y = (a + b) / 2;
    if (x < 0 || y < 0 || x >= MS || y >= MS) { T[o + 3] = 0; S[o + 3] = 0; if (G) G[o + 3] = 0; continue; }
    const n = hh(px, py);
    if (x > riverEdge(y) || inBld(x, y)) { T[o + 3] = 0; S[o + 3] = 0; }
    else {
      const pch = hh(Math.floor(x * 1.5) + 555, Math.floor(y * 1.5) + 77);
      let col = pch < 0.33 ? SN1 : pch < 0.66 ? SN2 : SN3;
      if (n < 0.06) col = SND; else if (n > 0.955) col = SNL;
      let r = col[0], g = col[1], bl = col[2];
      const road = x > 2 && x < MS - 2 && y > 2 && y < MS - 2 && mikRoad(mwx(y), mwy(x)) > 0.5;      // the road is kept open: gravel shows, with a few specks of snow
      T[o] = r; T[o + 1] = g; T[o + 2] = bl; T[o + 3] = road ? (n < 0.15 ? 150 : 225) : 255;     // a layer of snow on the road, deeper snow beside it
      const k = 0.94 + 0.1 * hh(px + 5, py + 9);
      S[o] = 150 * k; S[o + 1] = 170 * k; S[o + 2] = 204 * k; S[o + 3] = 255;
    }
    if (G) { const c = mikGround(x, y, n); G[o] = c[0]; G[o + 1] = c[1]; G[o + 2] = c[2]; G[o + 3] = 255; }
  }
}
function initSnow() {
  groundS = mkCanvas(); topC = mkCanvas(); sideC = mkCanvas(); banksC = mkCanvas();
  topX = topC.getContext('2d'); sideX = sideC.getContext('2d'); bctx = banksC.getContext('2d');
  const gx = groundS.getContext('2d'), under = gx.createImageData(SCW, SCH);
  snowTop = topX.createImageData(SCW, SCH); snowSide = sideX.createImageData(SCW, SCH);
  bakeSnow(under); gx.putImageData(under, 0, 0);
  snowReady = true;
  resetSnow(true);
}
function resetSnow(first) {
  if (!first) bakeSnow(null);
  topX.putImageData(snowTop, 0, 0); sideX.putImageData(snowSide, 0, 0);
  bctx.clearRect(0, 0, SCW, SCH); bankN.fill(0);
  flakes.length = 0; smoke.length = 0;
  resetMachine(tractor, START_S);
  Object.assign(tractor, { state: 0, bl: 1, bw: 1, rpm: 0, aug: 0, chute: Math.PI / 2, clr: 0, pclr: 0, pile: 0, em: 0, smk: 0 });
  camInit = false;
  routeReset(); foxReset();
}

/* cut a rectangle (in the frame of centre cx,cy and heading h) out of the snow (mode 0), or press a tyre track into it (mode 1) */
function snowCut(cx, cy, h, u0, u1, v0, v1, mode) {
  const c = Math.cos(h), s = Math.sin(h);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) {
    const [px, py] = gpr(cx + u * c - v * s, cy + u * s + v * c);
    x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
  }
  x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
  x1 = Math.min(SCW - 1, Math.ceil(x1) + 1); y1 = Math.min(SCH - 1, Math.ceil(y1) + 1);
  if (x1 < x0 || y1 < y0) return;
  const T = snowTop.data, S = snowSide.data;
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const a = (px + 0.5 - SCW / 2) / (TW * SRS / 2), b = (py + 0.5) / (TH * SRS / 2), x = (b - a) / 2, y = (a + b) / 2;
    const dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c, nz = mode ? 0 : (hh(px, py) - 0.5) * 0.08;
    if (u < u0 || u > u1 || v < v0 + nz || v > v1 + nz) continue;
    const i = (py * SCW + px) * 4;
    if (mode === 0) { if (!inPlot(x, y)) continue; T[i + 3] = 0; S[i + 3] = 0; }
    else if (T[i + 3]) { T[i] = T[i] * 0.55 + 146 * 0.45; T[i + 1] = T[i + 1] * 0.55 + 162 * 0.45; T[i + 2] = T[i + 2] * 0.55 + 192 * 0.45; }
  }
  const w = x1 - x0 + 1, hgt = y1 - y0 + 1;
  topX.putImageData(snowTop, 0, 0, x0, y0, w, hgt);
  if (mode === 0) sideX.putImageData(snowSide, 0, 0, x0, y0, w, hgt);
}
function stampSnowTracks(m) {
  const c = Math.cos(m.h), s = Math.sin(m.h);
  for (const [u, v, st, hw] of m.wheels) snowCut(m.x + u * c - v * s, m.y + u * s + v * c, m.h + (st ? m.steer : 0), -0.07, 0.07, -hw, hw, 1);
}
function clearBanks(cx, cy, h, u0, u1, v0, v1) {
  const c = Math.cos(h), s = Math.sin(h);
  const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]);
  bctx.save(); bctx.globalCompositeOperation = 'destination-out'; bctx.fillStyle = '#000';
  for (const dy of [0, -2, -4, -6]) {
    bctx.beginPath();
    q.forEach(([x, y], i) => { const [px, py] = gpr(x, y); i ? bctx.lineTo(px, py + dy) : bctx.moveTo(px, py + dy); });
    bctx.closePath(); bctx.fill();
  }
  bctx.restore();
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  for (let gy = Math.floor(Math.min(...ys) / BKC); gy <= Math.floor(Math.max(...ys) / BKC); gy++)
    for (let gx = Math.floor(Math.min(...xs) / BKC); gx <= Math.floor(Math.max(...xs) / BKC); gx++) {
      if (gx < 0 || gy < 0 || gx >= BKN || gy >= BKN) continue;
      const dx = (gx + 0.5) * BKC - cx, dy = (gy + 0.5) * BKC - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
      if (u > u0 - 0.15 && u < u1 + 0.15 && v > v0 - 0.15 && v < v1 + 0.15) bankN[gy * BKN + gx] = 0;
    }
}
function addBank(x, y) {                       // a lump of thrown snow lands: the more land in one place, the higher the bank
  const gx = Math.floor(x / BKC), gy = Math.floor(y / BKC);
  if (gx < 0 || gy < 0 || gx >= BKN || gy >= BKN || inBld(x, y) || x > RIVER - 0.3) return;
  const k = gy * BKN + gx, n = bankN[k] = Math.min(255, bankN[k] + 1), lift = Math.min(12, Math.floor(n * 0.4));
  const [sx, sy] = gpr(x + (Math.random() - 0.5) * 0.14, y + (Math.random() - 0.5) * 0.14), px = Math.round(sx), py = Math.round(sy), lf = Math.round(lift * SRS);
  if (lift > 1) { bctx.fillStyle = 'rgba(86,108,150,0.55)'; bctx.fillRect(px - 2, py - 1, 4, 2); }
  bctx.drawImage(SNOWB, px - 2, py - 3 - lf, 5, 4);
}
function snowAt(x, y) {
  if (!inPlot(x, y)) return false;
  const [px, py] = gpr(x, y);
  if (snowTop.data[(Math.round(py) * SCW + Math.round(px)) * 4 + 3]) return true;
  const gx = Math.floor(x / BKC), gy = Math.floor(y / BKC);
  return gx >= 0 && gy >= 0 && gx < BKN && gy < BKN && bankN[gy * BKN + gx] > 2;
}
function chuteOut() {                          // where the snow leaves the chute: [x, y, z, throw direction]
  const T = tractor, c = Math.cos(T.h), s = Math.sin(T.h), a = T.chute, d = 0.85;
  const u = CH_U + Math.cos(a) * d, v = Math.sin(a) * d;
  return [T.x + u * c - v * s, T.y + u * s + v * c, 1.4, T.h + a];
}

function updateSnow(dt) {
  time += dt;
  const T = tractor;
  for (const b of HB) if (b.enter) { const m = 2.4, inside = T.x > b.x0 - m && T.x < b.x1 + m && T.y > b.y0 - m && T.y < b.y1 + m;
    const cc = Math.cos(T.h), ss = Math.sin(T.h);
    let hid = inside; if (!hid) for (const u of [-3.4, -1.5, 0, 1.6]) for (const z of [0.4, 1.2, 2.4, 3.4]) if (occByB(b, T.x + u * cc, T.y + u * ss, z)) { hid = true; break; }
    if (!hid && T.x < b.x1 + 1 && T.y < b.y1 + 1) { const nx = Math.max(b.x0 - T.x, 0, T.x - b.x1), ny = Math.max(b.y0 - T.y, 0, T.y - b.y1); if (Math.hypot(nx, ny) < 8) hid = true; }   // rakennuksen takana (kameraan nähden) lähellä: katto pois, jotta traktori ja reitti näkyvät
    b.a = approach(b.a, hid ? 1 : 0, 5 * dt); }   // the roof and the near walls give way when the tractor is inside or hidden behind the building   // roof off while the tractor is in or at the door
  for (const b of HB) if (!b.enter) {                // ei-sisäänajettavien rakennusten katto läpinäkyväksi kun traktori on lähellä: näkee traktorin ja reitin
    const dx = Math.max(b.x0 - T.x, 0, T.x - b.x1), dy = Math.max(b.y0 - T.y, 0, T.y - b.y1);
    b.fa = approach(b.fa || 0, Math.hypot(dx, dy) < 20 ? 1 : 0, 4 * dt); }
  drive(T, dt, true);
  routeStep(dt);
  foxStep(dt);
  const bl0 = T.bl, ch0 = T.chute;
  const bw0 = T.bw;
  T.bl = approach(T.bl, T.state === 2 ? 0 : 1, 1.4 * dt);      // loader plate: 1 = raised, 0 = lowered
  T.bw = approach(T.bw, T.state === 0 ? 1 : 0, 1.4 * dt);      // rear blower: 1 = lowered (works), 0 = raised
  if (keys.swl !== keys.swr) T.chute = Math.max(CH_MIN, Math.min(CH_MAX, T.chute + (keys.swl ? 1 : -1) * 1.1 * dt));      // only the rear half circle: never towards the front
  const moving = T.bl !== bl0 || T.bw !== bw0 || T.chute !== ch0;
  toolSnd('Tl', 'levy', T.bl !== bl0, 0.5); toolSnd('Tw', 'linko', T.bw !== bw0, 0.5);
  const indoors = inBld(T.x, T.y) || inBld(T.x - 3 * Math.cos(T.h), T.y - 3 * Math.sin(T.h));   // no blowing inside a building
  T.rpm = approach(T.rpm, T.bl > 0.7 && T.bw > 0.7 && !indoors ? 1 : 0, 4 * dt);   // the blower only runs lowered and with the plate up
  T.aug += T.rpm * 14 * dt;
  const c = Math.cos(T.h), s = Math.sin(T.h), L2W = (u, v) => [T.x + u * c - v * s, T.y + u * s + v * c];

  if (T.rpm > 0.5 && T.speed > 0.05) {         // rear blower cuts the snow behind the tractor and throws it
    let sn = 0;
    for (const v of [-0.9, 0, 0.9]) if (snowAt(...L2W(-1.9, v))) sn++;
    T.clr += T.speed * dt;
    while (T.clr >= 0.1) {
      T.clr -= 0.1;
      snowCut(T.x, T.y, T.h, BL_U0, BL_U1, -BL_HW, BL_HW, 0);
      clearBanks(T.x, T.y, T.h, BL_U0, BL_U1, -BL_HW, BL_HW);
    }
    T.em = Math.min(4, T.em + sn / 3 * T.speed * 80 * dt);
    const out = chuteOut();
    while (T.em >= 1 && flakes.length < 420) {
      T.em -= 1;
      const dust = Math.random() < 0.2, sp = dust ? 0.8 + Math.random() : 6.4 + Math.random() * 1.6, an = out[3] + (Math.random() - 0.5) * 0.22;
      flakes.push({ x: out[0], y: out[1], z: out[2], vx: Math.cos(an) * sp + c * T.speed * 0.6, vy: Math.sin(an) * sp + s * T.speed * 0.6,
        vz: dust ? 0.8 + Math.random() * 1.2 : 3.0 + Math.random() * 0.9, d: dust, c: Math.random() < 0.5 });
    }
    if (sn && Math.random() < 0.4) {           // a puff of loose snow at the blower
      const [x, y] = L2W(-3.0, (Math.random() - 0.5) * 1.6);
      flakes.push({ x, y, z: 0.4, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: 0.8 + Math.random() * 0.8, d: true, c: true });
    }
  } else { T.clr = 0; T.em = 0; }

  if (T.bl < 0.15 && T.speed > 0.05) {         // plate lowered: it pushes the snow ahead of it, the blower stays quiet
    T.pclr += T.speed * dt;
    const front = snowAt(...L2W(PL_U1 + 0.2, 0)) || snowAt(...L2W(PL_U1 + 0.2, 0.7)) || snowAt(...L2W(PL_U1 + 0.2, -0.7));
    while (T.pclr >= 0.1) {
      T.pclr -= 0.1;
      snowCut(T.x, T.y, T.h, PL_U0, PL_U1, -PL_HW, PL_HW, 0);
      clearBanks(T.x, T.y, T.h, PL_U0, PL_U1, -PL_HW, PL_HW);
      if (front) {
        T.pile = Math.min(90, T.pile + 1.6);                                           // the pile in front of the plate grows
        if (T.pile > 40) for (const sg of [1, -1]) if (Math.random() < 0.5) addBank(...L2W(2.2 + Math.random() * 0.4, sg * (1.0 + Math.random() * 0.4)));   // and spills over the ends
      }
    }
  } else T.pclr = 0;
  if (T.pile > 0 && (T.bl > 0.3 || T.speed < -0.05)) {   // plate lifted or reversing: the pile is left where it is
    const n = Math.floor(T.pile * 0.9);
    for (let i = 0; i < n; i++) addBank(...L2W(2.3 + Math.random() * (0.3 + T.pile * 0.008), (Math.random() - 0.5) * 1.8));
    T.pile = 0; thud(0.5);
  }
  for (let i = flakes.length - 1; i >= 0; i--) {
    const f = flakes[i];
    f.vz -= 8 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    if (f.z <= 0) { if (!f.d) addBank(f.x, f.y); flakes[i] = flakes[flakes.length - 1]; flakes.pop(); }
  }

  // exhaust smoke
  const drv = Math.abs(T.speed) > 0.1, work = T.rpm > 0.5, rate = work ? 9 : drv ? 6 : 1.6, big = work || drv;
  T.smk = (T.smk || 0) + rate * dt;
  while (T.smk >= 1 && smoke.length < 160) {
    T.smk -= 1;
    smoke.push({ x: T.x + 1.05 * c - 0.35 * s, y: T.y + 1.05 * s + 0.35 * c, z: 2.25, vx: (Math.random() - 0.5) * 0.25 + 0.12, vy: (Math.random() - 0.5) * 0.25 - 0.08,
      vz: 0.45 + Math.random() * 0.35 + (big ? 0.2 : 0), age: 0, life: 1.4 + Math.random() * 1.1, sz: big ? 4.5 : 3, a: big ? 0.85 : 0.6 });
  }
  if (T.smk >= 1) T.smk = 0;
  for (let i = smoke.length - 1; i >= 0; i--) {
    const k = smoke[i]; k.age += dt; k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt; k.vz *= 1 - 0.4 * dt;
    if (k.age >= k.life) smoke.splice(i, 1);
  }
  soundStep(dt, moving, T.rpm * (0.4 + 0.6 * Math.min(1, Math.abs(T.speed) / 2.2)));
  snowfallStep(dt);
  followCam(dt);
}

function buildTractor(parts) {
  const T = tractor, K = kit(T, parts), { W, Dv, addBox, box, plate, beam, wheel, beacon, lamp } = K;
  const FT = Object.create(T); FT.roll = T.roll * T.R / 0.45;     // the smaller front wheels turn faster
  const FK = kit(FT, parts);
  const sv = (a, b, sg) => sg > 0 ? [a, b] : [-b, -a];
  for (const sg of [1, -1]) { wheel(-0.85, sg * 1.02, 0, sg, T.R, COL.RIM, 0.2, 16); FK.wheel(1.0, sg * 0.8, T.steer, sg, 0.45, COL.RIM, 0.14, 14); }
  box(-0.4, 1.55, -0.42, 0.42, 0.45, 0.75, COL.CH);               // chassis
  box(0.9, 1.1, -0.8, 0.8, 0.38, 0.5, COL.DK);                    // front axle
  box(0.05, 1.5, -0.42, 0.42, 0.75, 1.28, COL.ORG);               // hood
  box(0.1, 1.4, -0.3, 0.3, 1.28, 1.34, COL.ORG);
  box(1.5, 1.56, -0.36, 0.36, 0.78, 1.2, COL.DK);                 // grille
  for (const v of [-0.22, -0.07, 0.08, 0.23]) box(1.55, 1.58, v - 0.03, v + 0.03, 0.82, 1.16, COL.SIL, 0.02);
  lamp(1.57, 0.3, 0.88); lamp(1.57, -0.3, 0.88);
  box(-1.5, 0.1, -0.82, 0.82, 0.62, 0.8, COL.DK2);                // cab deck
  box(-1.45, 0.05, -0.78, 0.78, 0.8, 1.2, COL.ORG);               // cab base
  box(-1.38, -0.02, -0.74, 0.74, 1.2, 2.25, COL.GL);              // cab glass
  for (const [a, b] of [[-1.45, -1.33], [-0.07, 0.05]]) for (const sg of [1, -1]) box(a, b, ...sv(0.7, 0.78, sg), 1.2, 2.25, COL.ORG);   // pillars
  // side skin, door and windows: the door ends just ahead of the rear wheel, the glass is a trapezoid and a triangle over the wheel
  for (const sg of [1, -1]) {                                    // one part per side, so the glass can never sort behind the skin
    const out = Dv(0, sg, 0); if (!vis(out)) continue;
    const polys = [], sp = (pts, col, v) => {
      const p3 = pts.map(([u, z]) => W(u, sg * v, z)); let n = cross(add3(p3[1], p3[0], -1), add3(p3[2], p3[0], -1)); if (!vis(n)) n = [-n[0], -n[1], -n[2]];
      polys.push({ pts: p3.map(P), col: lit(col, n) });
    };
    sp([[-1.45, 1.2], [0.05, 1.2], [0.05, 2.25], [-1.45, 2.25]], COL.ORG, 0.79);
    sp([[-0.74, 0.84], [-0.7, 0.84], [-0.7, 2.25], [-0.74, 2.25]], COL.DK2, 0.795);          // door seam (rear edge)
    sp([[-0.74, 0.84], [0.05, 0.84], [0.05, 0.88], [-0.74, 0.88]], COL.DK2, 0.795);           // door seam (lower edge)
    sp([[0.0, 1.42], [-0.62, 1.42], [-0.5, 2.18], [-0.17, 2.18]], COL.GL, 0.8);              // door glass
    sp([[-0.82, 1.5], [-0.82, 2.18], [-1.38, 2.18]], COL.GL, 0.8);                           // quarter window over the rear wheel
    sp([[-0.66, 1.26], [-0.46, 1.26], [-0.46, 1.32], [-0.66, 1.32]], COL.DK2, 0.8);          // door handle
    parts.push({ k: depth(W(-0.7, sg * 0.79, 1.7)) + 0.1, polys });
  }
  box(-1.55, 0.1, -0.86, 0.86, 2.25, 2.38, COL.ROOF);             // roof
  box(-1.2, -0.6, -0.3, 0.3, 2.38, 2.44, COL.DK2);                // roof vent
  for (const sg of [1, -1]) box(-1.6, -0.1, ...sv(0.84, 1.24, sg), 1.34, 1.42, COL.FEND, 0.05);   // mudguards
  box(-1.7, -1.5, -0.6, 0.6, 0.5, 0.9, COL.DK);                   // rear weight
  const rev = T.speed < -0.03 || (active === T && keys.down && T.speed < 0.2);
  plate([W(-1.705, -0.4, 0.58), W(-1.705, -0.1, 0.58), W(-1.705, -0.25, 0.82)], rev ? [255, 70, 60] : [232, 36, 40], 0.5, Dv(-1, 0, 0));
  if (rev) lamps.push({ col: 'rgba(255,40,30,0.16)', dot: 'rgba(255,90,70,0.7)', r: 5, p: W(-1.72, -0.25, 0.68), g0: W(-1.8, -0.25, 0), g1: W(-3.7, 0.35, 0), g2: W(-3.7, -0.85, 0) });
  box(1.0, 1.1, 0.3, 0.4, 1.34, 2.25, COL.DK); box(0.98, 1.12, 0.28, 0.42, 2.25, 2.31, COL.CH);   // exhaust stack
  beacon(-0.4, 0.45, 2.44);
  lamp(0.05, 0.45, 2.38); lamp(0.05, -0.45, 2.38);
  // front loader: posts, boom and stick with a bend between them, the push plate
  const G = loaderGeo(T.bl), pz = Math.max(0, G.F[1] - 0.5), pu = G.F[0] - 0.1;
  const onB = k => [LD_P0[0] + (G.E[0] - LD_P0[0]) * k, LD_P0[1] + (G.E[1] - LD_P0[1]) * k];
  const onS = k => [G.E[0] + (G.F[0] - G.E[0]) * k, G.E[1] + (G.F[1] - G.E[1]) * k];
  for (const sg of [1, -1]) {
    box(-0.45, -0.05, ...sv(0.5, 0.64, sg), 0.7, 1.5, COL.LDR);
    beam([LD_P0[0], sg * 0.58, LD_P0[1]], [G.E[0], sg * 0.58, G.E[1]], 0.06, 0.1, COL.LDR);            // boom
    beam([G.E[0], sg * 0.58, G.E[1]], [G.F[0], sg * 0.58, G.F[1]], 0.06, 0.09, COL.LDR);              // stick
    box(G.E[0] - 0.12, G.E[0] + 0.12, ...sv(0.52, 0.66, sg), G.E[1] - 0.12, G.E[1] + 0.12, COL.LDR);   // knee joint
    const a = onB(0.2), b = onS(0.5);
    beam([0.1, sg * 0.5, 0.8], [a[0], sg * 0.5, a[1] - 0.12], 0.04, 0.05, COL.CYL);                    // boom cylinder
    beam([a[0], sg * 0.5, a[1] - 0.12], [b[0], sg * 0.5, b[1] + 0.05], 0.03, 0.04, COL.CYL);          // plate cylinder
  }
  box(pu - 0.12, pu, -0.65, 0.65, pz + 0.3, pz + 0.38, COL.LDR);
  box(pu, pu + 0.08, -1.0, 1.0, pz + 0.05, pz + 0.6, COL.BLW);    // push plate
  box(pu + 0.04, pu + 0.14, -1.0, 1.0, pz, pz + 0.07, COL.SIL, 0.02);   // cutting edge
  if (T.pile > 0) {                                                 // snow piled up in front of the plate
    const n = Math.floor(T.pile);
    for (let i = 0; i < n; i++) {
      const v = (hh(i, 1) - 0.5) * 1.9, u = pu + 0.18 + hh(i, 2) * (0.15 + n * 0.01), z = 0.12 + Math.max(0, 1 - Math.abs(v) / 1.0) * (0.05 + n * 0.008) * (0.5 + hh(i, 4)) * (1 - (u - pu) / 1.0);
      const p = W(u, v, Math.min(0.95, z));
      parts.push({ k: depth(p) + 0.1, sb: p });
    }
  }
  // rear blower: delta/V opening forwards, apex at the back where the chute is
  const BLF = (1 - T.bw) * 0.9;                                   // raised blower: the whole rear unit lifts
  for (const sg of [1, -1]) beam([-1.55, sg * 0.45, 0.6], [-2.4, sg * 0.95, 0.55 + BLF], 0.05, 0.07, COL.CH);
  box(-3.95, -3.3, -0.4, 0.4, 0.15 + BLF, 0.9 + BLF, COL.BLW);
  for (const sg of [1, -1]) {
    const du = 0.707, dv = sg * 0.707, pu2 = -sg * 0.707, pv2 = 0.707;   // wing direction (apex to tip) and across-wing direction
    addBox(W(-3.1, sg * 0.65, 0.53 + BLF), Dv(du * 0.92, dv * 0.92, 0), Dv(pu2 * 0.3, pv2 * 0.3, 0), [0, 0, 0.38], COL.BLW);
    addBox(W(-2.45, sg * 1.3, 0.5 + BLF), Dv(du * 0.04, dv * 0.04, 0), Dv(pu2 * 0.32, pv2 * 0.32, 0), [0, 0, 0.4], COL.BLW2, 0.02);
  }
  // chute: turntable, tube, elbow pointing the way the snow is thrown, deflector cap
  const a = T.chute, ca = Math.cos(a), sa = Math.sin(a);
  box(-3.85, -3.25, -0.3, 0.3, 0.9 + BLF, 1.0 + BLF, COL.BLW2);
  box(-3.7, -3.4, -0.15, 0.15, 1.0 + BLF, 1.28 + BLF, COL.BLW);
  addBox(W(CH_U + ca * 0.34, sa * 0.34, 1.26 + BLF), Dv(ca * 0.36, sa * 0.36, 0), Dv(-sa * 0.17, ca * 0.17, 0), [0, 0, 0.14], COL.BLW, 0.02);
  addBox(W(CH_U + ca * 0.72, sa * 0.72, 1.32 + BLF), Dv(ca * 0.1, sa * 0.1, 0), Dv(-sa * 0.21, ca * 0.21, 0), [0, 0, 0.1], COL.BLW2, 0.03);
}
