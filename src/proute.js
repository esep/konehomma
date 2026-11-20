/* ================= REITTI: katkoviiva tiellä, punainen -> vihreä ajetulta kohdalta; palkki; ilotulitus ja peukku ================= */
// Mikkolan talvi. Reitti seuraa tiehen piirrettyä sinistä merkintää: Hallin ovelta tielle, tietä risteykseen, lenkki Puojin ympäri
// ja sivu-ura Ladon pohjoisovelle. Pisteet ovat kartta-pikseleinä (wx, wy), kuten rakennukset p6m.js:ssä.
const ROUTE_MAP = [
  [[726, -64], [742, -62], [756, -54], [764, -42], [758, -30], [726, 2], [712, 14], [689, 29], [671, 39], [656, 50]],
  [[656, 50], [637, 55], [610, 56], [580, 56], [554, 55], [540, 57], [534, 65], [538, 83], [547, 107], [559, 130], [579, 151], [591, 159],
    [609, 158], [633, 149], [643, 137], [648, 122], [651, 98], [653, 75], [656, 50]],
  [[712, 14], [724, 34], [736, 62], [733, 66]]
];
const RT_STEP = 0.25, RT_R = 2.3;                 // pisteväli ja se, kuinka lähelle traktorin pitää ajaa (pelin yksiköitä); tie on ~7 leveä
const RT_DASH = 4, RT_PER = 7;                    // viivan pituus ja jakso pisteinä: 1,0 yksikön viiva, 0,75 yksikön väli
const RT = { lines: [], n: 0, done: 0, win: -1, sparks: [], rockets: [], nextRk: 0, shown: -1 };
const routeBarEl = document.getElementById('routebar'), routeFillEl = document.getElementById('routefill');

function routeReset() {
  RT.lines = []; RT.n = 0; RT.done = 0; RT.win = -1; RT.sparks.length = 0; RT.rockets.length = 0; RT.shown = -1;
  for (const poly of ROUTE_MAP) {
    const c = poly.map(([wx, wy]) => [gX(wy), gY(wx)]), s = [];
    for (let i = 0; i < c.length - 1; i++) {      // Catmull-Rom: pehmeät mutkat pisteiden välillä
      const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
      const k = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / RT_STEP));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
        s.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), d: 0 });
      }
    }
    const e = c[c.length - 1]; s.push({ x: e[0], y: e[1], d: 0 });
    RT.lines.push(s); RT.n += s.length;
  }
  routeBarSet();
}
function routeBarSet() {
  const left = RT.n ? Math.round(RT.done / RT.n * 1000) / 10 : 0;
  if (left === RT.shown) return; RT.shown = left;
  routeFillEl.style.width = left + '%';
}

function routeStep(dt) {
  if (RT.win >= 0) { celebStep(dt); return; }
  if (RT.win === -2) {                              // reitti on valmis: nollaus vasta kun traktori on takaisin hallissa
    const T = tractor;
    if (T.x > gX(-92) && T.x < gX(-49) && T.y > gY(618) && T.y < gY(708)) routeReset();
    return;
  }
  const T = tractor, R2 = RT_R * RT_R;
  for (const s of RT.lines) for (const p of s) {
    if (p.d) continue;
    const dx = p.x - T.x, dy = p.y - T.y;
    if (dx * dx + dy * dy < R2) { p.d = 1; RT.done++; }
  }
  routeBarSet();
  if (RT.n && RT.done >= RT.n) { RT.win = 0; RT.nextRk = 0; jingle(true); }
}

// katkoviiva maassa: tumma reunus, sen päällä punaiset (ajamatta) ja vihreät (ajetut) viivat
function drawRoute() {
  const o = new Path2D(), r = new Path2D(), g = new Path2D();
  for (const s of RT.lines) {
    for (let i = 0; i + 1 < s.length; i++) {
      const m = i % RT_PER; if (m >= RT_DASH) continue;
      const a = P([s[i].x, s[i].y, 0.02]);
      if (a[0] < -16 || a[0] > IW + 16 || a[1] < -16 || a[1] > IH + 16) continue;
      const b = P([s[i + 1].x, s[i + 1].y, 0.02]), c = s[i].d && s[i + 1].d ? g : r, c0 = m && s[i - 1].d && s[i].d ? g : r;
      if (m === 0) o.moveTo(a[0], a[1]);
      o.lineTo(b[0], b[1]);
      if (m === 0 || c !== c0) c.moveTo(a[0], a[1]);
      c.lineTo(b[0], b[1]);
    }
  }
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(28,16,22,0.5)'; ctx.stroke(o);
  ctx.lineWidth = 4; ctx.strokeStyle = '#e5352b'; ctx.stroke(r);
  ctx.strokeStyle = '#38c850'; ctx.stroke(g);
  ctx.restore();
}

/* ---------- ilotulitus ja peukku ---------- */
const FW_COL = ['#ff4d4d', '#ffd23f', '#4dff88', '#4dd2ff', '#ff6ad5', '#ffffff', '#ff9a3c'];
const THUMB_ROWS = [
  '..........####..........',
  '.........#ssss#.........',
  '.........#wsyy#.........',
  '.........#wsyy#.........',
  '.........#wsyy#.........',
  '.#####...#ssyy#.........',
  '#ccccc#..#ssss#.........',
  '#ccccc#..#ssss#.........',
  '#bbbbb#..#ssss#########.',
  '#bbbbb####ssssyyywwwyyy#',
  '#bbbbbssssssssyyyyyyyyy#',
  '#bbbbbssssssssssswwsss#.',
  '#bbbbbsssssssssoosssss#.',
  '#bbbbbssssssssssswwss#..',
  '#dddddsssssssssoossss#..',
  '#dddddssssssssssswws#...',
  '#dddddoooooooosoosss#...',
  '#dddddooooooooss####....',
  '.###############........',
  '........................'];
const THUMB = (() => {
  const c = document.createElement('canvas'); c.width = 24; c.height = 20; const x = c.getContext('2d');
  const col = { '#': '#1b1b6b', b: '#1196ea', c: '#36cdf5', d: '#2d72b5', s: '#ee8c64', o: '#ff6a1a', y: '#f4c042', w: '#fff8dc' };
  THUMB_ROWS.forEach((row, j) => { for (let i = 0; i < 24; i++) if (col[row[i]]) { x.fillStyle = col[row[i]]; x.fillRect(i, j, 1, 1); } });
  return c;
})();
const RT_FW_END = 6.0, RT_WIN_END = 7.4;          // ilotulitteita tulee 6 s; reitti pysyy vihreänä ja nollautuu vasta kun traktori ajaa takaisin Halliin

function fwLaunch() {
  const ty = IH * (0.12 + Math.random() * 0.38);
  RT.rockets.push({ x: IW * (0.12 + Math.random() * 0.76), y: IH + 4, vy: -(IH - ty) / (0.85 + Math.random() * 0.3), vx: (Math.random() - 0.5) * 12, ty, c: FW_COL[Math.random() * FW_COL.length | 0] });
}
function fwBurst(x, y, c1) {
  const fs = Math.max(0.8, IH / 340), n = 56 + (Math.random() * 24 | 0), ring = Math.random() < 0.5, c2 = FW_COL[Math.random() * FW_COL.length | 0];
  for (let i = 0; i < n; i++) {
    const an = i / n * 6.283 + Math.random() * 0.1, sp = (ring ? 112 + Math.random() * 10 : 36 + Math.random() * 100) * fs;
    RT.sparks.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, age: 0, life: 1.0 + Math.random() * 0.7, c: i % 3 === 0 ? c2 : c1 });
  }
  RT.sparks.push({ x, y, vx: 0, vy: 0, age: 0, life: 0.14, c: '#ffffff', flash: 1 });
  fwPop();
}
function celebStep(dt) {
  RT.win += dt;
  if (RT.win < RT_FW_END) {
    RT.nextRk -= dt;
    if (RT.nextRk <= 0) { fwLaunch(); RT.nextRk = RT.win < 0.2 ? 0.12 : 0.28 + Math.random() * 0.4; }
  }
  for (let i = RT.rockets.length - 1; i >= 0; i--) {
    const k = RT.rockets[i]; k.x += k.vx * dt; k.y += k.vy * dt;
    RT.sparks.push({ x: k.x, y: k.y + 2, vx: (Math.random() - 0.5) * 8, vy: 14, age: 0, life: 0.3, c: '#ffd866' });
    if (k.y <= k.ty) { fwBurst(k.x, k.y, k.c); RT.rockets.splice(i, 1); }
  }
  const drag = Math.exp(-1.0 * dt), grav = 52 * Math.max(0.8, IH / 340);
  for (let i = RT.sparks.length - 1; i >= 0; i--) {
    const s = RT.sparks[i]; s.age += dt;
    if (s.age >= s.life) { RT.sparks.splice(i, 1); continue; }
    s.vx *= drag; s.vy = s.vy * drag + grav * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  }
  if (RT.win >= RT_WIN_END) { RT.win = -2; RT.sparks.length = 0; RT.rockets.length = 0; }   // valmis-tila: vihreä reitti, odottaa paluuta Halliin
}
function drawCelebration() {
  if (RT.win < 0) return;
  const w = RT.win, dim = Math.min(1, w / 0.6) * Math.min(1, Math.max(0, (RT_WIN_END - 0.3 - w) / 0.8));
  ctx.fillStyle = 'rgba(8,12,40,' + (0.55 * dim).toFixed(3) + ')'; ctx.fillRect(0, 0, IW, IH);        // yötaivas: ilotulitus näkyy lumen päällä
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const k of RT.rockets) { ctx.fillStyle = '#fff3b0'; ctx.fillRect(Math.round(k.x) - 1, Math.round(k.y) - 1, 3, 3); }
  for (const s of RT.sparks) {
    const a = 1 - s.age / s.life;
    if (s.flash) { ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(s.x, s.y, 14 * (1 - a) + 5, 0, 6.283); ctx.fill(); continue; }
    ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = s.c; const z = s.age < s.life * 0.55 ? 3 : 2; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, z, z);
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // peukku: pomppaa esiin, keikkuu ja häipyy lopussa
  const t = w - 0.25;
  if (t > 0) {
    const sc0 = Math.max(3, Math.round(Math.min(IW, IH) / 58)), e = Math.min(1, t / 0.55), back = 1 + 2.7 * Math.pow(e - 1, 3) + 1.7 * Math.pow(e - 1, 2);   // easeOutBack
    const k = Math.max(0.01, back), sw = Math.round(24 * sc0 * k), sh = Math.round(20 * sc0 * k), bob = Math.round(Math.sin(t * 5) * sc0 * 0.8);
    const cx = Math.round(IW / 2), cy = Math.round(IH * 0.26) + bob;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = Math.min(1, Math.max(0, (RT_WIN_END - 0.7 - w) / 0.6 + 1));
    ctx.drawImage(THUMB, cx - (sw >> 1), cy - (sh >> 1), sw, sh);
    ctx.fillStyle = '#fff6b0';                    // pienet tähdet peukun ympärillä
    for (let i = 0; i < 6; i++) {
      const an = i * 1.0472 + t * 0.6, rr = sc0 * (11 + (i % 2) * 3), sx = Math.round(cx + Math.cos(an) * rr * 1.2), sy = Math.round(cy + Math.sin(an) * rr), on = ((t * 4 + i) % 2) < 1.4, q = sc0 > 4 ? 2 : 1;
      if (on) { ctx.fillRect(sx - q, sy, q * 3, q); ctx.fillRect(sx, sy - q, q, q * 3); }
    }
    ctx.restore();
  }
}
