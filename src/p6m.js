
/* ================= MIKKOLA: map, buildings, road ================= */
// the map picture is turned so the buildings line up with the world axes: x runs east-south-east, y runs south-south-west
// (wx, wy) are map pixels in the turned frame: wx runs east-south-east, wy south-south-west. In the game x runs south-south-west (down-left on screen)
// and y runs east-south-east (down-right), so the map comes out with north up
const MK = 0.184;
const gX = wy => (wy + 215) * MK + 6, gY = wx => (wx - 441) * MK + 28;
const mwx = Y => (Y - 28) / MK + 441, mwy = X => (X - 6) / MK - 215;
const RIVER = gX(335), PX0 = 7, PX1 = RIVER - 2.8, PY0 = 7, PY1 = 113;
const FLAG = { x: gX(197), y: gY(603) };                   // K1: the flag pole stands here
const START_S = { x: gX(-65), y: gY(720) - 4.6, h: Math.PI / 2 };   // the tractor starts inside the Halli, nose towards the open door (east)

const ROADG = (() => { const bin = atob(ROAD.d), g = new Uint8Array(ROAD.w * ROAD.h); for (let i = 0; i < g.length; i++) g[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1; return g; })();
function mikRoad(wx, wy) {
  const fx = Math.max(0, Math.min(ROAD.w - 1.001, (wx - ROAD.x0) / ROAD.st)), fy = Math.max(0, Math.min(ROAD.h - 1.001, (wy - ROAD.y0) / ROAD.st));
  const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, o = iy * ROAD.w + ix;
  return (ROADG[o] * (1 - tx) + ROADG[o + 1] * tx) * (1 - ty) + (ROADG[o + ROAD.w] * (1 - tx) + ROADG[o + ROAD.w + 1] * tx) * ty;
}
const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const SAND = [[742, -171], [776, -181], [820, -123], [773, -66], [719, -12], [657, 39], [667, 18], [680, -8], [693, -42], [688, -84], [680, -89], [738, -119]];   // the sand between the Halli and the road
const YARD_N = [[464, 51], [508, -90], [597, -95], [616, -209], [749, -220], [840, -100], [840, 60], [464, 60]];
const YARD_S = [[466, 77], [720, 16], [833, 19], [818, 326], [561, 359], [552, 453], [441, 423]];

const MC = { RED: [190, 48, 40], YEL: [222, 166, 44], WHT: [240, 236, 226], PLINTH: [112, 104, 96], BROWN: [104, 66, 44], GLASS: [112, 150, 176], GLASSW: [255, 222, 140],
  RF_HALL: [168, 182, 178], RF_KUIV: [186, 190, 194], RF_LATO: [108, 114, 122], RF_NAV: [138, 144, 152], RF_TILE: [78, 82, 92], RF_BLK: [46, 46, 52], BRICK: [150, 62, 44] };
const snowMix = (c, k) => c.map((v, i) => v + ([232, 238, 248][i] - v) * k);
const FACE = { E: 0.94, S: 0.76 };
const sh = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
const pw = (pts, col) => ({ w: pts, col });
const MPARTS = [], MINT = [], footU = [], HB = [], SHAD = [];

function wbox(x0, y0, z0, x1, y1, z1, col, key, rad = 1) {
  MPARTS.push({ k: key, wp: true, c: [(x0 + x1) / 2, (y0 + y1) / 2, z1], rad, polys: [
    pw([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], sh(col, 1.04)),
    pw([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], sh(col, FACE.E)),
    pw([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], sh(col, FACE.S))] });
}

const HOUSES = [
  { r: [612, -97, 720, -44], eave: 4.3, ridge: 5.7, ax: 'x', wall: MC.RED, roof: MC.RF_HALL, enter: true,                          // 1 Halli
    open: [{ w: 'E', a: [-85, -44], h: 3.5 }],
    win: [{ w: 'S', c: 686, u: 1.1, z: [2.0, 3.1] }, { w: 'S', c: 704, u: 1.1, z: [2.0, 3.1] }] },
  { r: [629, -44, 670, -7], eave: 3.0, ridge: 4.2, ax: 'y', wall: MC.RED, roof: MC.RF_HALL,
    door: [{ w: 'S', a: [635, 653], h: 2.4 }], win: [{ w: 'E', c: -25, u: 0.9, z: [1.3, 2.2] }] },
  { r: [522, -21, 558, 28], eave: 3.6, ridge: 4.8, ax: 'x', wall: MC.RED, roof: MC.RF_KUIV, enter: true,                          // 6 Kuivaaja
    open: [{ w: 'E', a: [-15, 20], h: 3.3 }],
    door: [{ w: 'S', a: [524, 534], h: 2.3 }, { w: 'S', a: [546, 556], h: 2.3 }] },
  { r: [688, 77, 786, 124], eave: 4.4, ridge: 6.0, ax: 'y', wall: MC.YEL, roof: MC.RF_LATO, enter: true,                           // 2 Lato
    open: [{ w: 'N', a: [700, 740], h: 3.4 }, { w: 'S', a: [695, 745], h: 3.4, nohole: true }] },
  { r: [695, 124, 745, 261], eave: 3.4, ridge: 4.5, ax: 'y', wall: MC.YEL, roof: MC.RF_NAV, enter: true, nowallN: true,                // 3 Navetta
    open: [{ w: 'S', a: [700, 740], h: 3.3 }],
    win: [140, 158, 176, 238, 252].map(c => ({ w: 'E', c, u: 1.4, z: [1.7, 2.6], col: [58, 72, 88] })) },
  { r: [680, 196, 695, 224], eave: 2.7, ridge: 3.6, ax: 'x', wall: MC.YEL, roof: MC.RF_NAV,                                       // maitohuone, on the west side of the Navetta
    door: [{ w: 'S', a: [684, 692], h: 2.2, col: MC.WHT }] },
  { r: [572, 101, 624, 134], eave: 4.1, ridge: 5.4, ax: 'x', wall: MC.RED, roof: MC.RF_TILE,                                       // 4 Puoji
    door: [{ w: 'S', a: [578, 583], h: 2.2 }, { w: 'S', a: [591.5, 601.5], h: 2.2 }, { w: 'S', a: [610, 615], h: 2.2 }],
    deco: [{ w: 'S', c: 575.4, hw: 0.3, z: 2.2, t: 'lamp' },
      { w: 'S', c: 596.5, hw: 0.3, z: 3.0, t: 'lamp' },
      { w: 'S', c: 618.2, hw: 0.3, z: 2.2, t: 'lamp' },
      { w: 'S', c: 605.75, hw: 0.55, z: 1.0, t: 'dart' },
      { w: 'S', c: 577.511, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 583.489, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 580.5, hw: 0.640, z: 2.2, z1: 2.4, t: 'board' },
      { w: 'S', c: 591.011, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 601.989, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 596.5, hw: 1.100, z: 2.2, z1: 2.4, t: 'board' },
      { w: 'S', c: 609.511, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 615.489, hw: 0.09, z: 0, z1: 2.4, t: 'board' },
      { w: 'S', c: 612.5, hw: 0.640, z: 2.2, z1: 2.4, t: 'board' },
      { w: 'S', c: 587.25, hw: 0.1, z: 0.22, z1: 'top', t: 'board' },
      { w: 'S', c: 603.4, hw: 0.1, z: 0.22, z1: 'top', t: 'board' },
      { w: 'S', c: 608.1, hw: 0.1, z: 0.22, z1: 'top', t: 'board' }],
    win: [580.5, 596.5, 612.5].map(c => ({ w: 'S', c, u: 0.85, z: [3.4, 4.3] })), gline: true },
  { r: [578, 77, 606, 95], eave: 0.9, ridge: 1.7, ax: 'x', wall: MC.RED, roof: MC.RF_BLK, snow: 0.2 },                           // kellari
  { id: 'taloM', r: [459, 147, 494, 236], eave: 2.9, ridge: 4.5, ax: 'y', wall: MC.RED, roof: MC.RF_BLK, snow: 0.05, trim: true, glE: true, noroof: true, chim: [476.5, 174], skip: { E: [145, 202] },     // 5 Talo: main wing, ridge north-south
    win: [{ w: 'S', c: 476.5, u: 0.85, z: [4.5, 5.4] }, { w: 'S', c: 468, u: 0.9, z: [1.3, 2.5], col: MC.GLASSW }, { w: 'S', c: 488, u: 0.9, z: [1.3, 2.5], col: MC.GLASSW },
      { w: 'E', c: 219, u: 1.0, z: [1.3, 2.5], col: MC.GLASSW }] },
  { id: 'taloC', r: [494, 147, 510, 201], eave: 2.9, ridge: 4.5, ax: 'x', wall: MC.RED, roof: MC.RF_BLK, snow: 0.05, trim: true, noroof: true, gline: true,     // 5 Talo: cross wing, ridge east-west, gable end towards the terrace
    door: [{ w: 'E', a: [163, 173], h: 2.2 }],
    win: [{ w: 'E', c: 153, u: 1.1, z: [1.3, 2.5], col: MC.GLASSW }, { w: 'E', c: 179.8, u: 1.5, z: [1.1, 2.6], col: MC.GLASSW }, { w: 'E', c: 188.6, u: 0.85, z: [1.4, 2.5] }, { w: 'E', c: 195.7, u: 0.85, z: [1.4, 2.5] }] }
];

const WALLMAP = { S: 'E', E: 'S', N: 'W', W: 'N' };       // map-frame wall names -> game-frame names
function buildHouse(h0) {
  const h = Object.assign({}, h0);
  h.ax = h0.ax === 'x' ? 'y' : 'x';
  h.open = (h0.open || []).map(o => Object.assign({}, o, { w: WALLMAP[o.w] }));
  h.door = (h0.door || []).map(o => Object.assign({}, o, { w: WALLMAP[o.w] }));
  h.win = (h0.win || []).map(o => Object.assign({}, o, { w: WALLMAP[o.w] }));
  h.nowall = h0.nowallN ? 'W' : null;
  h.deco = (h0.deco || []).map(o => Object.assign({}, o, { w: WALLMAP[o.w] }));
  h.skip = null; if (h0.skip) { h.skip = {}; for (const w in h0.skip) h.skip[WALLMAP[w]] = h0.skip[w].map(v => (WALLMAP[w] === 'S' || WALLMAP[w] === 'N') ? gX(v) : gY(v)).sort((a, b) => a - b); }
  const x0 = gX(h0.r[1]), x1 = gX(h0.r[3]), y0 = gY(h0.r[0]), y1 = gY(h0.r[2]), E = h.eave, Rg = h.ridge, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
  h.u = [x0, y0, x1, y1];
  footU.push(h.u); HB.push({ x0, y0, x1, y1, e: E, r: Rg, ax: h.ax, enter: !!h.enter, a: 0 }); const bi = HB.length - 1, tag = h.enter ? (vis => ({ bi, vis })) : (vis => vis === 'roof' ? { rb: bi } : {}); SHAD.push({ u: h.u, h: E + 0.4 * (Rg - E) });
  const topS = a => h.ax === 'y' ? E + (Rg - E) * (1 - Math.abs(a - xm) / ((x1 - x0) / 2)) : E;
  const topE = a => h.ax === 'x' ? E + (Rg - E) * (1 - Math.abs(a - ym) / ((y1 - y0) / 2)) : E;
  const cv = (w, v) => w === 'S' || w === 'N' ? gX(v) : gY(v);
  const F = [];
  for (const o of h.open || []) F.push({ w: o.w, k: 'open', a0: cv(o.w, o.a[0]), a1: cv(o.w, o.a[1]), z1: o.h, nohole: o.nohole });
  for (const d of h.door || []) F.push({ w: d.w, k: 'door', a0: cv(d.w, d.a[0]), a1: cv(d.w, d.a[1]), z0: 0, z1: d.h, col: d.col || MC.BROWN, big: d.big });
  for (const n of h.win || []) { const c = cv(n.w, n.c); F.push({ w: n.w, k: 'win', a0: c - n.u / 2, a1: c + n.u / 2, z0: n.z[0], z1: n.z[1], col: n.col || MC.GLASS }); }
  h.F = F;
  // ---- walls (only the two that face the viewer), cut into slices so painter's order works along them ----
  const WL = [['S', 'full'], ['E', 'full']]; if (h.enter) WL.push(['S', 'low'], ['E', 'low'], ['N', 'far'], ['W', 'far']);
  for (const [wall, mode] of WL) {
    if (mode === 'far' && wall === h.nowall) continue;
    const alongX = wall === 'S' || wall === 'N', far = mode === 'far', low = mode === 'low', det = mode === 'full';
    const A0 = alongX ? x0 : y0, A1 = alongX ? x1 : y1, plane = wall === 'S' ? y1 : wall === 'E' ? x1 : wall === 'N' ? y0 : x0, k = (alongX ? FACE.S : FACE.E) * (far ? 0.62 : 1);
    const pt = (a, z) => alongX ? [a, plane, z] : [plane, a, z];
    const top = a => Math.min(alongX ? topS(a) : topE(a), low ? 1.05 : 99);
    const fl = F.filter(f => f.w === wall), cuts = new Set([A0, A1]), sk = h.skip && h.skip[wall];
    if (sk) { cuts.add(sk[0]); cuts.add(sk[1]); }
    const dl = h.deco.filter(o => o.w === wall).map(o => Object.assign({}, o, { c: cv(wall, o.c) }));
    for (const o of dl) { cuts.add(o.c - o.hw); cuts.add(o.c + o.hw); }
    for (const f of fl) { cuts.add(Math.max(A0, f.a0)); cuts.add(Math.min(A1, f.a1)); }
    const cs = [...cuts].sort((a, b) => a - b), iv = [];
    for (let i = 0; i < cs.length - 1; i++) { const p = cs[i], q = cs[i + 1]; if (q - p < 0.02) continue; const n = Math.ceil((q - p) / 1.0); for (let j = 0; j < n; j++) iv.push([p + (q - p) * j / n, p + (q - p) * (j + 1) / n]); }
    const wc = sh(h.wall, k), wt = sh(MC.WHT, k);
    for (const [p, q] of iv) {
      const m = (p + q) / 2, f = fl.find(f => m >= f.a0 && m <= f.a1), polys = [];
      if (sk && m > sk[0] && m < sk[1]) continue;
      const drawWin = f => {
        const lit = f.col === MC.GLASSW, d = lit ? 0.22 : h.trim ? 0.17 : 0.08, c0 = (f.a0 + f.a1) / 2, zc = (f.z0 + f.z1) / 2, Q = (a0, z0, a1, z1, col) => polys.push(pw([pt(a0, z0), pt(a1, z0), pt(a1, z1), pt(a0, z1)], col));
        Q(f.a0 - d, f.z0 - d, f.a1 + d, f.z1 + d, wt);
        if (lit) {                                         // old-style casing: side boards, top board with a small pediment, projecting sill, star light and a bit of curtain
          const zt = f.z1 + d;
          Q(f.a0 - d - 0.08, f.z0 - d - 0.12, f.a1 + d + 0.08, f.z0 - d + 0.04, wt);
          Q(f.a0 - d, zt, f.a1 + d, zt + 0.14, wt);
          polys.push(pw([pt(f.a0 - d - 0.05, zt + 0.14), pt(f.a1 + d + 0.05, zt + 0.14), pt(c0, zt + 0.14 + 0.38)], wt));
          polys.push(pw([pt(f.a0 - d + 0.1, zt + 0.14), pt(f.a1 + d - 0.1, zt + 0.14), pt(c0, zt + 0.14 + 0.28)], sh(h.wall, k * 0.8)));
          Q(f.a0, f.z0, f.a1, f.z1, 'rgb(42,30,28)');
          Q(f.a0, f.z1 - 0.3, f.a1, f.z1, 'rgb(232,150,110)');                       // curtain, top
          Q(f.a0, f.z1 - 0.35, f.a1, f.z1 - 0.3, wt);
          Q(f.a0, f.z0, f.a1, f.z0 + 0.22, 'rgb(226,168,150)');                      // curtain, bottom
          for (let i = 0; i < 4; i++) { const x = f.a0 + (i + 0.5) / 4 * (f.a1 - f.a0); Q(x - 0.05, f.z0, x + 0.05, f.z0 + 0.22, 'rgb(246,208,190)'); Q(x - 0.05, f.z1 - 0.3, x + 0.05, f.z1, 'rgb(250,196,150)'); }
          const zs = zc - 0.05, rs = Math.min(0.42, (f.a1 - f.a0) * 0.36), halo = [], star = [], core = [];
          for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; halo.push(pt(c0 + Math.cos(an) * rs * 1.6, zs + Math.sin(an) * rs * 1.6)); }
          polys.push(pw(halo, 'rgba(255,190,80,0.28)'));
          for (let i = 0; i < 10; i++) { const an = Math.PI / 2 + i / 10 * 6.283, r = i % 2 ? rs * 0.45 : rs; star.push(pt(c0 + Math.cos(an) * r, zs + Math.sin(an) * r)); }
          polys.push(pw(star, 'rgb(255,208,72)'));
          for (let i = 0; i < 10; i++) { const an = Math.PI / 2 + i / 10 * 6.283, r = i % 2 ? rs * 0.2 : rs * 0.5; core.push(pt(c0 + Math.cos(an) * r, zs + Math.sin(an) * r)); }
          polys.push(pw(core, 'rgb(255,244,170)'));
          return;
        }
        if (h.trim) { Q(f.a0 - d, f.z1 + d, f.a1 + d, f.z1 + d + 0.15, wt); Q(f.a0 - d, f.z1 + d + 0.15, f.a1 + d, f.z1 + d + 0.19, sh([196, 198, 200], k)); }
        Q(f.a0, f.z0, f.a1, f.z1, sh(f.col, k + 0.1));
        Q(c0 - 0.03, f.z0, c0 + 0.03, f.z1, wt);
        Q(f.a0, zc - 0.03, f.a1, zc + 0.03, wt);
      };
      if (f && f.k === 'open' && !low) {
        if (top(p) > f.z1 + 0.01 || top(q) > f.z1 + 0.01) polys.push(pw([pt(p, f.z1), pt(q, f.z1), pt(q, top(q)), pt(p, top(p))], wc));
        polys.push(pw([pt(p, f.z1 - 0.14), pt(q, f.z1 - 0.14), pt(q, f.z1), pt(p, f.z1)], wt));
        if (det && h.enter) {                             // the door frame stays visible even when the near walls give way (tractor inside)
          const fp = [pw([pt(p, f.z1 - 0.16), pt(q, f.z1 - 0.16), pt(q, f.z1 + 0.06), pt(p, f.z1 + 0.06)], wt)];
          if (p <= f.a0 + 1e-6 || p <= A0 + 1e-6) fp.push(pw([pt(Math.max(p, f.a0), 0), pt(Math.max(p, f.a0) + 0.2, 0), pt(Math.max(p, f.a0) + 0.2, f.z1), pt(Math.max(p, f.a0), f.z1)], wt));
          if (q >= f.a1 - 1e-6 || q >= A1 - 1e-6) fp.push(pw([pt(Math.min(q, f.a1) - 0.2, 0), pt(Math.min(q, f.a1), 0), pt(Math.min(q, f.a1), f.z1), pt(Math.min(q, f.a1) - 0.2, f.z1)], wt));
          MPARTS.push({ k: plane + m + 0.02, wp: true, c: [...pt(m, 1.2)], rad: 1.6, polys: fp });
        }
        if (!f.nohole && det) MINT.push({ ...tag('full'), k: -300, wp: true, c: [...pt(m, 1), 0], rad: 1.5, polys: [pw([pt(p, 0), pt(q, 0), pt(q, f.z1 - 0.14), pt(p, f.z1 - 0.14)], 'rgb(36,31,29)')] });
      } else {
        polys.push(pw([pt(p, 0), pt(q, 0), pt(q, top(q)), pt(p, top(p))], wc));
        polys.push(pw([pt(p, 0), pt(q, 0), pt(q, 0.22), pt(p, 0.22)], sh(MC.PLINTH, k)));
        if ((h.gline && wall === 'S') || (h.glE && wall === 'E')) polys.push(pw([pt(p, E - 0.07), pt(q, E - 0.07), pt(q, E + 0.05), pt(p, E + 0.05)], wt));
        if (f && f.k === 'door' && det) {
          const d = 0.07;
          polys.push(pw([pt(f.a0 - d, 0), pt(f.a1 + d, 0), pt(f.a1 + d, f.z1 + d), pt(f.a0 - d, f.z1 + d)].map((v, i) => i < 4 ? v : v), sh(MC.WHT, k)));
          polys.push(pw([pt(f.a0, 0), pt(f.a1, 0), pt(f.a1, f.z1), pt(f.a0, f.z1)], sh(f.col, k)));
          polys.push(pw([pt(m - 0.015, 0), pt(m + 0.015, 0), pt(m + 0.015, f.z1), pt(m - 0.015, f.z1)], 'rgba(30,20,14,0.55)'));
          const g2 = fl.find(g => g.k === 'win' && m >= g.a0 && m <= g.a1); if (g2) drawWin(g2);
        } else if (f && f.k === 'win' && det) {
          drawWin(f);
        }
      }
      if (det) for (const o of dl) if (m > o.c - o.hw && m < o.c + o.hw) {
        const c = o.c;
        if (o.t === 'lamp') {
          polys.push(pw([pt(c - 0.55, o.z - 0.5), pt(c + 0.55, o.z - 0.5), pt(c + 0.55, o.z + 0.6), pt(c - 0.55, o.z + 0.6)], 'rgba(255,214,110,0.16)'));
          polys.push(pw([pt(c - 0.28, o.z - 0.3), pt(c + 0.28, o.z - 0.3), pt(c + 0.28, o.z + 0.35), pt(c - 0.28, o.z + 0.35)], 'rgba(255,224,130,0.22)'));
          polys.push(pw([pt(c - 0.13, o.z - 0.17), pt(c + 0.13, o.z - 0.17), pt(c + 0.13, o.z + 0.2), pt(c - 0.13, o.z + 0.2)], 'rgb(60,50,40)'));
          polys.push(pw([pt(c - 0.09, o.z - 0.13), pt(c + 0.09, o.z - 0.13), pt(c + 0.09, o.z + 0.16), pt(c - 0.09, o.z + 0.16)], 'rgb(255,232,120)'));
        } else if (o.t === 'board') {
          polys.push(pw([pt(c - o.hw, o.z), pt(c + o.hw, o.z), pt(c + o.hw, o.z1 === 'top' ? top(m) : o.z1), pt(c - o.hw, o.z1 === 'top' ? top(m) : o.z1)], sh(MC.WHT, k)));
        } else {
          const z0 = o.z, zs = z0 + 0.9, zt = z0 + 1.35, zc = z0 + 0.5, ring = (r, col) => { const q = []; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; q.push(pt(c + Math.cos(an) * r, zc + Math.sin(an) * r)); } polys.push(pw(q, col)); };
          polys.push(pw([pt(c - 0.5, z0), pt(c + 0.5, z0), pt(c + 0.5, zs), pt(c, zt), pt(c - 0.5, zs)], sh(MC.WHT, k)));
          polys.push(pw([pt(c - 0.42, z0 + 0.08), pt(c + 0.42, z0 + 0.08), pt(c + 0.42, zs - 0.02), pt(c, zt - 0.13), pt(c - 0.42, zs - 0.02)], 'rgb(44,66,52)'));
          ring(0.34, 'rgb(214,40,48)'); ring(0.24, 'rgb(240,236,226)'); ring(0.14, 'rgb(214,40,48)'); ring(0.05, 'rgb(240,236,226)');
        }
      }
      if (p <= A0 + 1e-6) polys.push(pw([pt(p, 0), pt(p + 0.13, 0), pt(p + 0.13, top(p + 0.13)), pt(p, top(p))], wt));
      if (q >= A1 - 1e-6) polys.push(pw([pt(q - 0.13, 0), pt(q, 0), pt(q, top(q)), pt(q - 0.13, top(q - 0.13))], wt));
      if (f && f.k === 'open' && low) continue;
      MPARTS.push({ ...tag(mode), side: far ? wall : undefined, k: (far ? -0.6 : 0) + plane + m, wp: true, c: [...pt(m, 1.2)], rad: 1.6, polys });
    }
  }
  if (!h.noroof) {
  // ---- roof: gable roof in 1-unit slices, far slope first ----
  const B = Math.max(h.enter ? 6 : 0, (h.ax === 'y' ? x1 - x0 : y1 - y0) / 2 + 0.8), ov = 0.28, og = 0.18, rc = snowMix(h.roof, h.snow ?? 0.5);
  const fas = [226, 228, 232];
  if (h.ax === 'y') {
    const hw = (x1 - x0) / 2, sl = (Rg - E) / hw, ze = E - ov * sl, ya = y0 - og, yb = y1 + og, n = Math.max(1, Math.ceil((yb - ya) / 1.0));
    for (let i = 0; i < n; i++) {
      const s = ya + (yb - ya) * i / n, t = ya + (yb - ya) * (i + 1) / n, ym2 = (s + t) / 2;
      MPARTS.push({ ...tag('roof'), k: (x0 + xm) / 2 + ym2 + B, wp: true, c: [(x0 + xm) / 2, ym2, E], rad: hw + 1, polys: [pw([[x0 - ov, s, ze], [xm, s, Rg], [xm, t, Rg], [x0 - ov, t, ze]], sh(rc, 0.8))] });
      MPARTS.push({ ...tag('roof'), k: (xm + x1) / 2 + ym2 + B, wp: true, c: [(xm + x1) / 2, ym2, E], rad: hw + 1, polys: [
        pw([[xm, s, Rg], [x1 + ov, s, ze], [x1 + ov, t, ze], [xm, t, Rg]], sh(rc, 1.04)),
        pw([[x1 + ov, s, ze], [x1 + ov, t, ze], [x1 + ov, t, ze - 0.16], [x1 + ov, s, ze - 0.16]], sh(fas, FACE.E))] });
    }
  } else {
    const hw = (y1 - y0) / 2, sl = (Rg - E) / hw, ze = E - ov * sl, xa = x0 - og, xb = x1 + og, n = Math.max(1, Math.ceil((xb - xa) / 1.0));
    for (let i = 0; i < n; i++) {
      const s = xa + (xb - xa) * i / n, t = xa + (xb - xa) * (i + 1) / n, xm2 = (s + t) / 2;
      MPARTS.push({ ...tag('roof'), k: xm2 + (y0 + ym) / 2 + B, wp: true, c: [xm2, (y0 + ym) / 2, E], rad: hw + 1, polys: [pw([[s, y0 - ov, ze], [s, ym, Rg], [t, ym, Rg], [t, y0 - ov, ze]], sh(rc, 0.78))] });
      MPARTS.push({ ...tag('roof'), k: xm2 + (ym + y1) / 2 + B, wp: true, c: [xm2, (ym + y1) / 2, E], rad: hw + 1, polys: [
        pw([[s, ym, Rg], [s, y1 + ov, ze], [t, y1 + ov, ze], [t, ym, Rg]], sh(rc, 0.97)),
        pw([[s, y1 + ov, ze], [t, y1 + ov, ze], [t, y1 + ov, ze - 0.16], [s, y1 + ov, ze - 0.16]], sh(fas, FACE.S))] });
    }
  }
  }
  if (h.chim) { const cx = gX(h.chim[1]), cy = gY(h.chim[0]), BR2 = [184, 66, 46]; wbox(cx - 0.3, cy - 0.3, Rg - 0.5, cx + 0.3, cy + 0.3, Rg + 1.4, BR2, cx + cy + 8.2, 0.7); wbox(cx - 0.38, cy - 0.38, Rg + 1.4, cx + 0.38, cy + 0.38, Rg + 1.55, [226, 232, 242], cx + cy + 8.3, 0.7); }
  if (h.gablet) {                                           // a small pitched roof over the front door
    const yw = y1, xd = (cv('S', h.gablet[0]) + cv('S', h.gablet[1])) / 2, hw = Math.abs(cv('S', h.gablet[1]) - cv('S', h.gablet[0])) / 2 + 0.5, zh = (h.door[0].h) + 0.2, dp = 0.55, ph = 0.8, RB = sh([40, 40, 46], 1);
    MPARTS.push({ k: xd + yw + 0.5, wp: true, c: [xd, yw, zh], rad: 3, polys: [
      pw([[xd - hw, yw, zh], [xd - hw, yw + dp, zh], [xd, yw + dp, zh + ph], [xd, yw, zh + ph]], sh([30, 30, 34], 0.8)),
      pw([[xd + hw, yw, zh], [xd + hw, yw + dp, zh], [xd, yw + dp, zh + ph], [xd, yw, zh + ph]], sh([46, 46, 52], 1.0)),
      pw([[xd + hw, yw + dp, zh - 0.1], [xd - hw, yw + dp, zh - 0.1], [xd, yw + dp, zh + ph - 0.1]], sh(MC.WHT, FACE.S)),
      pw([[xd + hw - 0.14, yw + dp + 0.001, zh - 0.02], [xd - hw + 0.14, yw + dp + 0.001, zh - 0.02], [xd, yw + dp + 0.001, zh + ph - 0.32]], sh(MC.RED, 0.9))] });
  }
  // ---- collisions ----
  const T = 0.2, ins = 0.18;
  if (!h.enter) SNOW_OBST.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, h: 0, rect: [-(x1 - x0) / 2, (x1 - x0) / 2, (y1 - y0) / 2] });
  else for (const wall of ['N', 'S', 'W', 'E']) {
    if (wall === h.nowall) continue;
    const horiz = wall === 'N' || wall === 'S', A0 = horiz ? x0 : y0, A1 = horiz ? x1 : y1, plane = wall === 'N' ? y0 + ins : wall === 'S' ? y1 - ins : wall === 'W' ? x0 + ins : x1 - ins;
    const gaps = (h.open || []).filter(o => o.w === wall).map(o => [cv(wall, o.a[0]), cv(wall, o.a[1])]).sort((a, b) => a[0] - b[0]);
    let cur = A0; const segs = [];
    for (const g of gaps) { if (g[0] > cur) segs.push([cur, g[0]]); cur = Math.max(cur, g[1]); }
    if (cur < A1) segs.push([cur, A1]);
    for (const [a, b] of segs) { if (b - a < 0.05) continue; const mid = (a + b) / 2, len = (b - a) / 2;
      SNOW_OBST.push(horiz ? { x: mid, y: plane, h: 0, rect: [-len, len, T] } : { x: plane, y: mid, h: 0, rect: [-len, len, T], rot: 1 }); }
  }
}
for (const h of HOUSES) if (h.eave > 1) { const e = h.eave; h.eave = e * 1.25; h.ridge = h.eave + (h.ridge - e) * 1.8; }   // the world is twice as wide: taller walls and a roof pitch that still looks right
for (const h of HOUSES) buildHouse(h);

/* ---- the Talo roof: a long north-south gable with a cross gable towards the terrace; valleys where the two meet ---- */
function buildTaloRoof() {
  const M0 = HOUSES.find(h => h.id === 'taloM'), C0 = HOUSES.find(h => h.id === 'taloC'), E = M0.eave, Rg = M0.ridge;
  const Xn = gX(M0.r[1]), Xs = gX(M0.r[3]), Yw = gY(M0.r[0]), Ye = gY(M0.r[2]), Ym = (Yw + Ye) / 2, Yg = gY(C0.r[2]);
  const Xcn = gX(C0.r[1]), Xcs = gX(C0.r[3]), Xc = (Xcn + Xcs) / 2, ov = 0.3, og = 0.22, B = 5.5;
  const sm = (Rg - E) / (Ye - Ym), sc = (Rg - E) / (Xcs - Xc), rc = snowMix(MC.RF_BLK, 0.05);
  const hE = Y => Rg - sm * (Y - Ym), hW = Y => Rg - sm * (Ym - Y), hS = X => Rg - sc * (X - Xc), hN = X => Rg - sc * (Xc - X);
  const strips = (a, b, extra = []) => { const cs = new Set([a, b, ...extra.filter(v => v > a && v < b)]), c = [...cs].sort((p, q) => p - q), out = []; for (let i = 0; i < c.length - 1; i++) { const n = Math.max(1, Math.ceil((c[i + 1] - c[i]) / 1.0)); for (let j = 0; j < n; j++) out.push([c[i] + (c[i + 1] - c[i]) * j / n, c[i] + (c[i + 1] - c[i]) * (j + 1) / n]); } return out; };
  const put = (poly, col, cx, cy) => MPARTS.push({ k: cx + cy + B, wp: true, c: [cx, cy, E], rad: 2.4, polys: [pw(poly, col)] });
  // west slope of the long roof
  for (const [a, b] of strips(Xn - og, Xs + og)) put([[a, Ym, Rg], [b, Ym, Rg], [b, Yw - ov, hW(Yw - ov)], [a, Yw - ov, hW(Yw - ov)]], sh(rc, 0.8), (a + b) / 2, (Ym + Yw) / 2);
  // east slope of the long roof: bounded by the valleys where the cross gable stands
  const Yv = X => X >= Xs ? null : X <= Xcn ? null : X >= Xc ? Ym + (X - Xc) / (Xcs - Xc) * (Ye - Ym) : Ym + (Xc - X) / (Xc - Xcn) * (Ye - Ym);
  const edgeE = X => { const v = (X > Xcn && X < Xcs) ? Yv(X) : null; return v === null ? Ye + ov : v; };
  for (const [a, b] of strips(Xn - og, Xs + og, [Xcn, Xc, Xcs])) {
    const ya = (a > Xcn - 1e-6 && a < Xcs + 1e-6) ? edgeE(a + 1e-6) : Ye + ov, yb = (b > Xcn - 1e-6 && b < Xcs + 1e-6) ? edgeE(b - 1e-6) : Ye + ov;
    put([[a, Ym, Rg], [b, Ym, Rg], [b, yb, hE(yb)], [a, ya, hE(ya)]], sh(rc, 1.04), (a + b) / 2, (Ym + Math.max(ya, yb)) / 2);
  }
  // cross gable, south slope and north slope, from the valleys out to the gable end
  const Yvs = Y => Y >= Ye ? Xc : Xc + (Y - Ym) / (Ye - Ym) * (Xcs - Xc), Yvn = Y => Y >= Ye ? Xc : Xc - (Y - Ym) / (Ye - Ym) * (Xc - Xcn);
  const eps = 1e-6, hiS = Y => Y >= Ye - eps ? Xcs + ov : Yvs(Y), loN = Y => Y >= Ye - eps ? Xcn - ov : Yvn(Y);
  for (const [a, b] of strips(Ym, Yg + og, [Ye])) {
    const ma = (a + b) / 2, Ya = ma > Ye ? a : a, ea = ma > Ye ? Xcs + ov : Yvs(a), eb = ma > Ye ? Xcs + ov : Yvs(b);
    put([[Xc, a, hS(Xc)], [Xc, b, hS(Xc)], [eb, b, hS(eb)], [ea, a, hS(ea)]], sh(rc, 0.97), (Xc + (ea + eb) / 2) / 2 + 0.4, ma);
    const na = ma > Ye ? Xcn - ov : Yvn(a), nb = ma > Ye ? Xcn - ov : Yvn(b);
    put([[na, a, hN(na)], [nb, b, hN(nb)], [Xc, b, hN(Xc)], [Xc, a, hN(Xc)]], sh(rc, 0.78), (Xc + (na + nb) / 2) / 2, ma);
  }
  // white barge boards along the gable end
  const bg = (X0, X1, h0, h1) => MPARTS.push({ k: (X0 + X1) / 2 + Yg + og + B + 0.2, wp: true, c: [(X0 + X1) / 2, Yg, E], rad: 6, polys: [pw([[X0, Yg + og, h0], [X1, Yg + og, h1], [X1, Yg + og, h1 - 0.2], [X0, Yg + og, h0 - 0.2]], sh([240, 238, 232], FACE.S))] });
  bg(Xcs + ov, Xc, hS(Xcs + ov), Rg); bg(Xc, Xcn - ov, Rg, hN(Xcn - ov));
}
buildTaloRoof();
// vertical walls are stored along u; turn the ones that run along y by a quarter turn
for (const o of SNOW_OBST) if (o.rot) { o.h = Math.PI / 2; delete o.rot; }

/* ---- by the Halli: a stack of boards drying (1) and an orange trailer (2) ---- */
{
  const Cx = gX(-44), Cy = gY(670);
  // (1) stack of boards: layers of planks separated by sticks, snow on top
  {
    const x0 = Cx + 0.8, x1 = Cx + 2.7, y0 = Cy + 1.7, y1 = Cy + 5.7, kb = x1 + y1 - 0.8, W1 = [218, 180, 124], W2 = [202, 162, 106], DK = [96, 70, 46];
    wbox(x0 + 0.06, y0 + 0.06, 0, x1 - 0.06, y1 - 0.06, 1.95, DK, kb - 0.05, 3);            // dark core shows in the gaps between layers
    for (let i = 0; i < 7; i++) {
      const z0 = 0.22 + i * 0.255, z1 = z0 + 0.2, c = i % 2 ? W2 : W1;
      wbox(x0, y0, z0, x1, y1, z1, c, kb + i * 0.002, 3);
    }
    wbox(x0, y0, 0, x1, y0 + 0.28, 0.22, DK, kb - 0.04, 3); wbox(x0, y1 - 0.28, 0, x1, y1, 0.22, DK, kb - 0.04, 3);   // bearers
    for (const yy of [y0 + 0.5, (y0 + y1) / 2, y1 - 0.5]) wbox(x0 - 0.05, yy - 0.06, 1.96, x1 + 0.05, yy + 0.06, 2.04, DK, kb + 0.02, 3);   // top sticks
    wbox(x0 + 0.05, y0 + 0.05, 2.04, x1 - 0.05, y1 - 0.05, 2.18, [240, 244, 250], kb + 0.03, 3);   // snow cap
    footU.push([x0, y0, x1, y1]);
    SNOW_OBST.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, h: 0, rect: [-(x1 - x0) / 2, (x1 - x0) / 2, (y1 - y0) / 2] });
  }
  // (2) orange two-wheel trailer with a drawbar towards the east
  {
    const x0 = Cx + 4.1, x1 = Cx + 5.8, y0 = Cy + 1.5, y1 = Cy + 3.7, xm = (x0 + x1) / 2, kb = x1 + y1, OR = [226, 112, 36], OD = [176, 80, 24], th = 0.1;
    wbox(x0, y0, 0.5, x1, y1, 0.62, OD, kb - 0.5, 2.5);                                      // floor
    wbox(x0, y0, 0.62, x0 + th, y1, 1.12, OR, kb - 0.45, 2.5); wbox(x0, y0, 0.62, x1, y0 + th, 1.12, OR, kb - 0.44, 2.5);   // far sides
    wbox(x0 + th, y0 + th, 0.62, x1 - th, y1 - th, 0.68, [236, 240, 246], kb - 0.4, 2.5);   // snow in the bed
    wbox(x0, y1 - th, 0.62, x1, y1, 1.12, OR, kb - 0.3, 2.5); wbox(x1 - th, y0, 0.62, x1, y1, 1.12, OR, kb - 0.29, 2.5);   // near sides
    wbox(x0 - 0.03, y0 - 0.03, 1.1, x1 + 0.03, y0 + th + 0.03, 1.16, OD, kb - 0.28, 2.5);   // rim
    wbox(xm - 0.07, y1, 0.47, xm + 0.07, y1 + 0.9, 0.57, [60, 60, 64], kb - 0.1, 2.5);      // drawbar
    wbox(xm - 0.1, y1 + 0.78, 0.2, xm + 0.1, y1 + 0.92, 0.47, [60, 60, 64], kb - 0.05, 2.5); // little stand
    const yc = (y0 + y1) / 2 - 0.05, wheel = (px, r, col) => { const q = []; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283; q.push([px, yc + Math.cos(an) * r, 0.42 + Math.sin(an) * r]); } return pw(q, col); };
    MPARTS.push({ k: kb - 0.2, wp: true, c: [x1, yc, 0.4], rad: 2.5, polys: [wheel(x1 + 0.2, 0.42, sh([34, 34, 38], FACE.E)), wheel(x1 + 0.21, 0.24, sh([168, 168, 172], FACE.E)), wheel(x1 + 0.22, 0.08, sh([70, 70, 74], FACE.E))] });
    MPARTS.push({ k: kb - 0.7, wp: true, c: [x0, yc, 0.4], rad: 2.5, polys: [wheel(x0 - 0.2, 0.42, sh([34, 34, 38], FACE.E))] });
    footU.push([x0, y0, x1, y1]);
    SNOW_OBST.push({ x: xm, y: (y0 + y1) / 2, h: 0, rect: [-(x1 - x0) / 2, (x1 - x0) / 2, (y1 - y0) / 2] });
  }
}

/* ---- yard furniture: flag pole, garden swing, trees ---- */
{
  const fx = FLAG.x, fy = FLAG.y;
  wbox(fx - 0.1, fy - 0.1, 0, fx + 0.1, fy + 0.1, 8.4, MC.WHT, fx + fy + 0.3, 0.5);
  MPARTS.push({ k: fx + fy + 0.5, wp: true, c: [fx, fy + 0.8, 7.8], rad: 1.4, polys: [
    pw([[fx, fy, 8.3], [fx, fy + 1.8, 8.3], [fx, fy + 1.8, 7.0], [fx, fy, 7.0]], sh(MC.WHT, FACE.E)),
    pw([[fx, fy + 0.5, 8.3], [fx, fy + 0.76, 8.3], [fx, fy + 0.76, 7.0], [fx, fy + 0.5, 7.0]], sh([44, 84, 170], FACE.E)),
    pw([[fx, fy, 7.78], [fx, fy + 1.8, 7.78], [fx, fy + 1.8, 7.52], [fx, fy, 7.52]], sh([44, 84, 170], FACE.E))] });
  SNOW_OBST.push({ x: fx, y: fy, h: 0, rect: [-0.2, 0.2, 0.2] });
  // wooden terrace on the east side of the Talo
  {
    const xa = gX(145), xb = gX(203), ya = gY(510) + 0.05, yb = gY(527), zt = 0.5, WD = [158, 114, 72], n = Math.ceil(xb - xa), dx = (xb - xa) / n;
    const np = Math.round((yb - ya) / 0.34), dy = (yb - ya) / np;
    for (let i = 0; i < n; i++) {
      const x0 = xa + i * dx, x1 = x0 + dx, polys = [pw([[x0, ya, zt], [x1, ya, zt], [x1, yb, zt], [x0, yb, zt]], sh([84, 58, 38], 1))];
      for (let j = 0; j < np; j++) {
        const y0 = ya + j * dy + 0.02, y1 = ya + (j + 1) * dy - 0.02, v = 0.9 + 0.2 * hh(j * 7 + 3, 11), tz = zt + 0.004;
        polys.push(pw([[x0, y0, tz], [x1, y0, tz], [x1, y1, tz], [x0, y1, tz]], sh(WD, v * 1.04)));
        if (hh(i * 13 + j, 5) > 0.55) { const a = x0 + dx * (0.2 + 0.5 * hh(i, j)), tz2 = zt + 0.008; polys.push(pw([[a, y0 + 0.04, tz2], [a + 0.05, y0 + 0.04, tz2], [a + 0.05, y1 - 0.04, tz2], [a, y1 - 0.04, tz2]], sh(WD, v * 0.8))); }
      }
      polys.push(pw([[x1, ya, 0], [x1, yb, 0], [x1, yb, zt], [x1, ya, zt]], sh(WD, FACE.E * 0.85)));
      polys.push(pw([[x0, yb, 0], [x1, yb, 0], [x1, yb, zt], [x0, yb, zt]], sh(WD, FACE.S * 0.85)));
      MPARTS.push({ k: (x0 + x1) / 2 + yb - 0.2, wp: true, c: [(x0 + x1) / 2, (ya + yb) / 2, zt], rad: dx + 1.6, polys });
    }
    SNOW_OBST.push({ x: (xa + xb) / 2, y: (ya + yb) / 2, h: 0, rect: [-(xb - xa) / 2, (xb - xa) / 2, (yb - ya) / 2] });
    // steps down to the yard, in front of the deck near the north end
    const sa = gX(160), sb = gX(176), WS = [150, 108, 68];
    for (let k = 0; k < 3; k++) wbox(sa, yb + 0.5 * k, 0, sb, yb + 0.5 * (k + 1), zt - 0.17 * (k + 1), WS, (sa + sb) / 2 + yb + 0.5 * k + 0.3, 2);
    SNOW_OBST.push({ x: (sa + sb) / 2, y: yb + 0.75, h: 0, rect: [-(sb - sa) / 2, (sb - sa) / 2, 0.75] });
    // white fence with vertical pickets: south end, front (with a gap for the steps) and north end
    const FW = [244, 242, 236], fk = (x, y) => x + yb + 0.45 + (y - yb) * 0.001, FH = 1.0, pw2 = 0.07;
    const post = (x, y) => wbox(x - 0.09, y - 0.09, zt, x + 0.09, y + 0.09, zt + FH + 0.1, FW, fk(x, y), 0.6);
    const run = (x0, y0, x1, y1) => {          // a straight fence run from (x0,y0) to (x1,y1) along one axis
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 0.32)), alongX = Math.abs(x1 - x0) > 1e-6;
      const h = (a, b, c0, c1, za, zb) => alongX ? wbox(a, y0 - 0.04, za, b, y0 + 0.04, zb, FW, fk((a + b) / 2, y0), 1) : wbox(x0 - 0.04, a, za, x0 + 0.04, b, zb, FW, fk(x0, (a + b) / 2), 1);
      const lo = alongX ? Math.min(x0, x1) : Math.min(y0, y1), hi = alongX ? Math.max(x0, x1) : Math.max(y0, y1);
      h(lo, hi, 0, 0, zt + FH - 0.06, zt + FH + 0.06); h(lo, hi, 0, 0, zt + 0.18, zt + 0.26);          // top rail and bottom rail
      for (let i = 1; i < n; i++) { const c = lo + (hi - lo) * i / n; if (alongX) wbox(c - pw2 / 2, y0 - pw2 / 2, zt + 0.26, c + pw2 / 2, y0 + pw2 / 2, zt + FH - 0.06, FW, fk(c, y0), 0.5); else wbox(x0 - pw2 / 2, c - pw2 / 2, zt + 0.26, x0 + pw2 / 2, c + pw2 / 2, zt + FH - 0.06, FW, fk(x0, c), 0.5); }
    };
    const yf = yb - 0.1, xs = xb - 0.1, xn = xa + 0.1;
    run(xs, ya, xs, yf);                      // south end (runs along y)
    run(xn, ya, xn, yf);                      // north end
    run(xs, yf, sb, yf);                      // front, south part
    run(sa, yf, xn, yf);                      // front, north part
    for (const [x, y] of [[xs, ya + 0.1], [xs, yf], [sb, yf], [sa, yf], [xn, yf], [xn, ya + 0.1]]) post(x, y);
  }
}
/* ---- small glass greenhouse south of the Talo ---- */
{
  const gx0 = gX(268), gx1 = gX(290), gy0 = gY(468), gy1 = gY(503), E = 1.7, Rg = 2.7, ym = (gy0 + gy1) / 2;
  const GL = 'rgba(176,222,238,0.34)', GL2 = 'rgba(196,232,244,0.42)', FR = 'rgb(236,238,232)', polys = [];
  footU.push([gx0, gy0, gx1, gy1]);
  // plants and a bench inside
  for (const yy of [gy0 + 1.0, ym + 0.5]) for (let i = 0; i < 4; i++) {
    const xa = gx0 + 0.5 + i * (gx1 - gx0 - 1) / 4, xb = xa + (gx1 - gx0 - 1) / 4 - 0.25, col = i % 2 ? [60, 130, 70] : [72, 150, 78];
    polys.push(pw([[xa, yy, 0.7], [xb, yy, 0.7], [xb, yy + 1.5, 0.7], [xa, yy + 1.5, 0.7]], sh([128, 94, 62], 1)));
    polys.push(pw([[xa + 0.1, yy + 0.2, 1.15], [xb - 0.1, yy + 0.2, 1.15], [xb - 0.1, yy + 1.3, 1.15], [xa + 0.1, yy + 1.3, 1.15]], sh(col, 1)));
    polys.push(pw([[xb, yy, 0], [xb, yy + 1.5, 0], [xb, yy + 1.5, 0.7], [xb, yy, 0.7]], sh([110, 80, 54], FACE.E)));
    polys.push(pw([[xa, yy + 1.5, 0], [xb, yy + 1.5, 0], [xb, yy + 1.5, 0.7], [xa, yy + 1.5, 0.7]], sh([110, 80, 54], FACE.S)));
  }
  // back glass first: north-west gable end, back slope
  polys.push(pw([[gx0, gy0, 0], [gx0, gy1, 0], [gx0, gy1, E], [gx0, ym, Rg], [gx0, gy0, E]], GL));
  polys.push(pw([[gx0, gy0, E], [gx1, gy0, E], [gx1, ym, Rg], [gx0, ym, Rg]], GL));
  polys.push(pw([[gx0, gy0, 0], [gx1, gy0, 0], [gx1, gy0, E], [gx0, gy0, E]], GL));
  // front glass: south gable end (x1), east wall (y1), front roof slope
  polys.push(pw([[gx1, gy0, 0], [gx1, gy1, 0], [gx1, gy1, E], [gx1, ym, Rg], [gx1, gy0, E]], GL2));
  polys.push(pw([[gx0, gy1, 0], [gx1, gy1, 0], [gx1, gy1, E], [gx0, gy1, E]], GL2));
  polys.push(pw([[gx0, ym, Rg], [gx1, ym, Rg], [gx1, gy1, E], [gx0, gy1, E]], GL2));
  // frame: posts, eaves, ridge, glazing bars
  const bar = (a, b, w = 0.05) => polys.push(pw([[a[0] - w, a[1], a[2]], [a[0] + w, a[1], a[2]], [b[0] + w, b[1], b[2]], [b[0] - w, b[1], b[2]]], FR));
  const bary = (a, b, w = 0.05) => polys.push(pw([[a[0], a[1] - w, a[2]], [a[0], a[1] + w, a[2]], [b[0], b[1] + w, b[2]], [b[0], b[1] - w, b[2]]], FR));
  for (const x of [gx0, gx1]) for (const y of [gy0, gy1]) bar([x, y, 0], [x, y, E], 0.07);
  for (let i = 1; i < 4; i++) { const x = gx0 + (gx1 - gx0) * i / 4; bar([x, gy1, 0], [x, gy1, E]); bar([x, gy1, E], [x, ym, Rg]); }
  for (let i = 1; i < 3; i++) { const y = gy0 + (gy1 - gy0) * i / 3; bary([gx1, y, 0], [gx1, y, y < ym ? E + (Rg - E) * (y - gy0) / (ym - gy0) : E + (Rg - E) * (gy1 - y) / (gy1 - ym)]); }
  bary([gx1, ym, 0], [gx1, ym, Rg]);
  bary([gx1, gy1, E], [gx0, gy1, E], 0.07); bar([gx1, gy1, 0.02], [gx1, gy1, 0.02], 0.0);
  polys.push(pw([[gx0, ym - 0.06, Rg], [gx1, ym - 0.06, Rg], [gx1, ym + 0.06, Rg], [gx0, ym + 0.06, Rg]], FR));
  polys.push(pw([[gx1, gy0, 0], [gx1, gy1, 0], [gx1, gy1, 0.06], [gx1, gy0, 0.06]], FR));
  polys.push(pw([[gx0, gy1, 0], [gx1, gy1, 0], [gx1, gy1, 0.06], [gx0, gy1, 0.06]], FR));
  MPARTS.push({ k: (gx0 + gx1) / 2 + gy1 + 0.5, wp: true, c: [(gx0 + gx1) / 2, ym, 1.2], rad: 6, polys });
  SNOW_OBST.push({ x: (gx0 + gx1) / 2, y: ym, h: 0, rect: [-(gx1 - gx0) / 2, (gx1 - gx0) / 2, (gy1 - gy0) / 2] });
}
/* ---- a heap of stones from the river, on the lawn ---- */
const STONES = [];
{
  const X = gX(306), Y = gY(630), R = rng(77);
  const place = (dx, dy, lift, sc) => STONES.push({ x: X + dx, y: Y + dy, lift, sc, s: Math.floor(R() * 3) });
  for (let i = 0; i < 13; i++) { const a = i / 13 * 6.283 + R() * 0.4, r = 0.9 + R() * 1.1; place(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.0, 0, 1.5 + R() * 0.9); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + R(), r = 0.3 + R() * 0.7; place(Math.cos(a) * r, Math.sin(a) * r * 0.8, 0.5 + R() * 0.2, 1.3 + R() * 0.7); }
  place(0.05, 0, 1.0, 1.6); place(-0.4, 0.3, 0.95, 1.2);
  for (let i = 0; i < 5; i++) place(-1.0 + R() * 2.0, 2.0 + R() * 2.4, 0, 0.9 + R() * 0.7);   // a few that have rolled towards the river
  SNOW_OBST.push({ x: X, y: Y, h: 0, rect: [-2.4, 2.4, 2.0] });
}
const TREES = [];
{
  const R = rng(11), add = (X, Y, t, obst) => { TREES.push({ x: X, y: Y, t, s: 0.8 + R() * 0.45 }); if (obst) SNOW_OBST.push({ x: X, y: Y, h: 0, rect: [-0.45, 0.45, 0.45] }); };
  for (const [wx, wy, t] of [[485, 112, 'b'], [772, 190, 'b'], [806, 150, 'b'], ])
    add(gX(wy), gY(wx), t, true);
  // two bare trees west of the Talo, on the line between field and lawn
  add(gX(160), gY(445), 'b', true); add(gX(214), gY(448), 'b', true);
  // spruces along the west edge of the field, from the south up to the road
  { const Rw = rng(31); for (let wy = 318; wy > 100; wy -= 17 + Rw() * 6) add(gX(wy), gY(340 + Rw() * 10), 's', true); }
  for (let i = 0; i < 900 && TREES.length < 110; i++) {
    const x = 1.6 + R() * (MS - 3.2), y = 1.6 + R() * (MS - 3.2);
    if (x > PX0 - 2.8 && x < RIVER + 3.5 && y > PY0 - 2.8 && y < PY1 + 2.8) continue;
    if (x > RIVER - 1.5) continue;
    if (TREES.some(t => Math.hypot(t.x - x, t.y - y) < 3.2)) continue;
    add(x, y, 's', false);
  }
}
const BARE = (() => {
  const c = document.createElement('canvas'); c.width = 44; c.height = 60; const g = c.getContext('2d'), R = rng(3);
  const br = (x, y, a, l, w, d) => {
    if (d < 0) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
    g.strokeStyle = '#4a3f38'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = 'rgba(244,247,255,0.8)'; g.lineWidth = Math.max(1, w - 1); g.beginPath(); g.moveTo(x - 1, y - 1); g.lineTo(x2 - 1, y2 - 1); g.stroke();
    const n = d > 1 ? 2 : 1 + (R() < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) br(x2, y2, a + (i ? 1 : -1) * (0.35 + R() * 0.35), l * (0.66 + R() * 0.12), Math.max(1, w * 0.7), d - 1);
  };
  br(22, 58, -Math.PI / 2, 16, 3, 3); br(22, 44, -Math.PI / 2 - 0.9, 11, 2, 2); br(22, 40, -Math.PI / 2 + 0.9, 11, 2, 2);
  return c;
})();

/* ---- large tree sprites (the world is twice as wide, so the trees have to be taller too) ---- */
const SPRUCE_L = (() => {
  const c = document.createElement('canvas'); c.width = 100; c.height = 210; const g = c.getContext('2d'), R = rng(5);
  g.fillStyle = '#5a3d28'; g.fillRect(45, 190, 10, 18);
  for (let i = 0; i < 7; i++) {
    const top = 6 + i * 25, bot = top + 50, w = 15 + i * 5.6;
    const tier = (col, dx, ww) => { g.fillStyle = col; g.beginPath(); g.moveTo(50, top); g.lineTo(50 + ww + dx, bot);
      for (let k = 1; k < 8; k++) g.lineTo(50 + ww + dx - (2 * ww) * k / 8, bot - (k % 2 ? 0 : 5)); g.lineTo(50 - ww + dx, bot); g.closePath(); g.fill(); };
    tier('#264d33', 0, w); tier('#31603f', -2, w * 0.82);
    g.fillStyle = '#eef4fb'; g.beginPath(); g.moveTo(50, top); g.lineTo(50 + w * 0.5, top + 25); g.lineTo(50 + w * 0.22, top + 21); g.lineTo(50 + w * 0.05, top + 29); g.lineTo(50 - w * 0.3, top + 22); g.lineTo(50 - w * 0.5, top + 25); g.closePath(); g.fill();
    g.fillStyle = 'rgba(27,58,39,0.55)'; g.fillRect(50 - w, bot - 3, 2 * w, 3);
  }
  return c;
})();
const BARE_L = (() => {
  const c = document.createElement('canvas'); c.width = 130; c.height = 200; const g = c.getContext('2d'), R = rng(8);
  const br = (x, y, a, l, w, d) => {
    if (d < 0) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
    g.strokeStyle = '#4a3f38'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = 'rgba(244,247,255,0.8)'; g.lineWidth = Math.max(1.5, w * 0.4); g.beginPath(); g.moveTo(x - w * 0.2, y - 1); g.lineTo(x2 - w * 0.2, y2 - 1); g.stroke();
    const n = d > 1 ? 2 : 1 + (R() < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) br(x2, y2, a + (i ? 1 : -1) * (0.35 + R() * 0.35), l * (0.68 + R() * 0.12), Math.max(1.5, w * 0.68), d - 1);
  };
  br(65, 198, -Math.PI / 2, 52, 9, 4); br(65, 150, -Math.PI / 2 - 0.8, 36, 5, 3); br(65, 138, -Math.PI / 2 + 0.8, 36, 5, 3);
  return c;
})();

/* ---- the ground under the snow ---- */
const SANDC = [176, 150, 108], SAND2 = [160, 136, 98], FLOOR = [96, 92, 88], GRASS = [82, 104, 62], GRASS2 = [70, 92, 52], FIELD = [118, 106, 74], FIELD2 = [102, 92, 64], GRAVEL = [124, 110, 92], GRAV2 = [136, 121, 100], GRAV3 = [112, 100, 86];
function inBld(x, y) { for (const f of footU) if (x > f[0] && x < f[2] && y > f[1] && y < f[3]) return true; return false; }
const riverEdge = y => RIVER + 0.22 * Math.sin(y * 1.7) + 0.14 * Math.sin(y * 4.3 + 1);
const WINTER = true;
function mikGround(x, y, n) {
  if (x > riverEdge(y)) { const rp = hh(Math.floor(x * 3), Math.floor(y * 6)); return x < riverEdge(y) + 0.3 ? [196, 210, 228] : rp > 0.85 ? [92, 124, 150] : n > 0.9 ? [74, 104, 130] : [46, 76, 100]; }
  const wx = mwx(y), wy = mwy(x);
  if (inBld(x, y)) return FLOOR;
  if (mikRoad(wx, wy) > 0.5) return n < 0.12 ? GRAV3 : n > 0.88 ? GRAV2 : GRAVEL;
  if (inPoly(SAND, wx, wy)) return n < 0.3 ? SAND2 : n > 0.9 ? [190, 165, 122] : SANDC;
  if (inPoly(YARD_N, wx, wy) || inPoly(YARD_S, wx, wy)) {
    const g = n < 0.3 ? GRASS2 : GRASS;
    if (!WINTER) return g;                                   // (the summer level keeps the plain green lawn)
    const pt = hh(Math.floor(x * 4), Math.floor(y * 4)), pt2 = hh(Math.floor(x * 11) + 7, Math.floor(y * 11) + 3);      // frost and thin snow lie in patches on the lawn
    const f = pt > 0.5 ? 0.35 + (pt - 0.5) * 0.9 : 0, k = Math.max(f * (pt2 > 0.35 ? 1 : 0.35), n > 0.86 ? 0.55 : 0);
    return k > 0 ? [g[0] + (222 - g[0]) * k, g[1] + (230 - g[1]) * k, g[2] + (238 - g[2]) * k] : g;
  }
  return n < 0.4 ? FIELD2 : FIELD;
}

/* ---- falling snow (screen space) ---- */
const SF = [], SFR = 30, SFH = 18; let sfInit = false;
for (let i = 0; i < 420; i++) SF.push({ x: 0, y: 0, z: 0, vz: 1.3 + Math.random() * 1.2, ph: Math.random() * 6.28, big: Math.random() < 0.25 });
function snowfallStep(dt) {                      // flakes live in the world: they fall straight down and drift with the wind, whatever the tractor does
  const cx = tractor.x, cy = tractor.y;
  if (!sfInit) { sfInit = true; for (const f of SF) { f.x = cx + (Math.random() * 2 - 1) * SFR; f.y = cy + (Math.random() * 2 - 1) * SFR; f.z = Math.random() * SFH; } }
  for (const f of SF) {
    f.z -= f.vz * dt; f.x += (0.25 + Math.sin(f.ph + time * 0.8) * 0.18) * dt; f.y += (0.35 + Math.cos(f.ph * 1.3 + time * 0.7) * 0.18) * dt;
    if (f.z < 0) { f.z += SFH; f.x = cx + (Math.random() * 2 - 1) * SFR; f.y = cy + (Math.random() * 2 - 1) * SFR; }
    f.x = cx + (((f.x - cx + SFR) % (2 * SFR)) + 2 * SFR) % (2 * SFR) - SFR; f.y = cy + (((f.y - cy + SFR) % (2 * SFR)) + 2 * SFR) % (2 * SFR) - SFR;
  }
}
function drawSnowfall() {
  ctx.fillStyle = '#ffffff';
  for (const f of SF) { const q = P([f.x, f.y, f.z]); if (q[0] < -2 || q[1] < -2 || q[0] > IW || q[1] > IH) continue; ctx.globalAlpha = f.big ? 0.9 : 0.6; const s = f.big ? 2 : 1; ctx.fillRect(q[0], q[1], s, s); }
  ctx.globalAlpha = 1;
}

/* ---- can the tractor be seen from the camera, or is a building in the way? ---- */
function occByB(b, x, y, z) {                  // is the point hidden behind building b (seen from the camera)?
  for (let t = 0.3; t < 16; t += 0.3) {
    const px = x + t, py = y + t, pz = z + 0.909 * t;
    if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) {
      const top = b.ax === 'y' ? b.e + (b.r - b.e) * (1 - Math.abs(px - (b.x0 + b.x1) / 2) / ((b.x1 - b.x0) / 2)) : b.e + (b.r - b.e) * (1 - Math.abs(py - (b.y0 + b.y1) / 2) / ((b.y1 - b.y0) / 2));
      if (pz < top) return true;
    }
  }
  return false;
}
function occludedAt(x, y, z) {
  for (const b of HB) if (b.a < 0.5 && occByB(b, x, y, z)) return true;
  return false;
}
