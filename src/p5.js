
/* ---------- rendering ---------- */
let OX = 0, OY = 0;
const LX = 0.22, LY = -0.48, LZ = 0.85;   // light from upper left
const PJ = [0, 0];                         // jitter applied while the shaking crusher is drawn
const P = p => [Math.round(OX + GW / 2 + (p[1] - p[0]) * TW / 2) + PJ[0], Math.round(OY + (p[0] + p[1]) * TH / 2 - p[2] * ZH) + PJ[1]];
const depth = p => p[0] + p[1] + 0.8 * p[2];
const vis = n => n[0] + n[1] + 1.2 * n[2] > 1e-6;
function lit(rgb, n) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1, d = (n[0] * LX + n[1] * LY + n[2] * LZ) / l;
  const k = Math.round((0.6 + 0.4 * Math.max(0, d)) * 10) / 10;
  return `rgb(${rgb[0] * k | 0},${rgb[1] * k | 0},${rgb[2] * k | 0})`;
}
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const COL = {
  Y: [244, 184, 28], BK: [232, 166, 20], DK: [64, 64, 70], GL: [150, 214, 240], TIRE: [44, 43, 47], TIRE2: [60, 59, 64],
  HUB: [80, 80, 86], CYL: [176, 178, 184], ORON: [255, 150, 30], OROFF: [170, 90, 24], EDGE: [96, 96, 102],
  CAB: [62, 128, 214], BED: [226, 86, 44], CH: [72, 72, 80], LAMP: [255, 236, 160],
  ORMID: [236, 128, 34], OR: [240, 122, 26], ORD: [178, 84, 20], TEETH: [120, 120, 126],
  CRM: [226, 216, 184], CRM2: [200, 190, 158], DK2: [52, 54, 58], SIL: [204, 206, 210], BELT: [92, 94, 100], LBL: [226, 110, 50], ROCK: [118, 108, 96],
  RED: [214, 38, 34], BLW: [196, 40, 38], BLW2: [128, 26, 26], STEEL: [112, 114, 122], AUG: [58, 60, 66], RIM: [228, 222, 206],
  ORG: [226, 98, 36], ROOF: [226, 222, 212], FEND: [210, 212, 214], LDR: [48, 50, 56]
};
let beacons = [], lamps = [];
function beaconState(m) {
  if (m !== active && Object.getPrototypeOf(m) !== active) return { mode: 'steady' };      // parked machines keep a steady light
  const t = (time + m.phase) % 6;
  if (t < 3) { const f = t % 0.5; return { mode: 'flash', on: f < 0.1 || (f > 0.18 && f < 0.28) }; }
  return { mode: 'rot', ang: (t - 3) * 8 };
}

/* drawing kit bound to one machine's pose (u forward, v left, w up) */
function kit(m, parts, off = 0) {
  const c = Math.cos(m.h), s = Math.sin(m.h);
  const W = (u, v, w) => [m.x + u * c - v * s, m.y + u * s + v * c, w];
  const Dv = (u, v, w) => [u * c - v * s, u * s + v * c, w];
  function addBox(C, A, B, H, col, bias = 0) {
    const polys = [];
    for (const [N, Pv, Q] of [[A, B, H], [B, H, A], [H, A, B]]) for (const sg of [1, -1]) {
      const n = [N[0] * sg, N[1] * sg, N[2] * sg];
      if (!vis(n)) continue;
      const F = add3(C, n);
      polys.push({ pts: [add3(add3(F, Pv), Q), add3(add3(F, Pv), Q, -1), add3(add3(F, Pv, -1), Q, -1), add3(add3(F, Pv, -1), Q)].map(P), col: lit(col, n) });
    }
    parts.push({ k: depth(C) + bias + off, polys });
  }
  const box = (u0, u1, v0, v1, w0, w1, col, bias) =>
    addBox(W((u0 + u1) / 2, (v0 + v1) / 2, (w0 + w1) / 2), Dv((u1 - u0) / 2, 0, 0), Dv(0, (v1 - v0) / 2, 0), [0, 0, (w1 - w0) / 2], col, bias);
  function plate(pts, col, bias = 0, out = null) {
    if (out && !vis(out)) return;                 // a decal that only exists on a face turned towards the viewer
    let n = cross(add3(pts[1], pts[0], -1), add3(pts[2], pts[0], -1));
    if (!vis(n)) n = [-n[0], -n[1], -n[2]];
    const cen = pts.reduce((a, p) => add3(a, p, 1 / pts.length), [0, 0, 0]);
    parts.push({ k: depth(cen) + bias + off, polys: [{ pts: pts.map(P), col: lit(col, n) }] });
  }
  // a beam between two local points (u,v,w) with half sizes in v and across
  function beam(a, b, hv, hx, col) {
    const half = [(b[0] - a[0]) / 2, 0, (b[2] - a[2]) / 2], l = Math.hypot(half[0], half[2]) || 1;
    addBox(W((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2), Dv(half[0], 0, half[2]), Dv(0, hv, 0), Dv(-half[2] / l * hx, 0, half[0] / l * hx), col);
  }
  function wheel(u, v, st, side, R, hub, hw = 0.17, n = 12) {
    const C = W(u, v, R), ax = Dv(-Math.sin(st), Math.cos(st), 0), f = Dv(Math.cos(st), Math.sin(st), 0);
    const ring = (off, rad) => { const r = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - m.roll;
        r.push(add3(add3(add3(C, ax, off), f, rad * Math.cos(a)), [0, 0, 1], rad * Math.sin(a))); }
      return r; };
    const out = ring(hw * side, R), inn = ring(-hw * side, R), polys = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, am = (i + 0.5) / n * Math.PI * 2 - m.roll;
      const nr = add3([f[0] * Math.cos(am), f[1] * Math.cos(am), 0], [0, 0, 1], Math.sin(am));
      if (vis(nr)) polys.push({ pts: [out[i], out[j], inn[j], inn[i]].map(P), col: lit(i % 2 ? COL.TIRE : COL.TIRE2, nr) });
    }
    const no = [ax[0] * side, ax[1] * side, 0], ni = [-no[0], -no[1], 0];
    if (vis(ni)) polys.push({ pts: inn.map(P), col: lit(COL.TIRE, ni) });
    if (vis(no)) {
      polys.push({ pts: out.map(P), col: lit(COL.TIRE, no) });
      polys.push({ pts: ring(hw * side * 1.05, R * 0.6).map(P), col: lit(hub, no) });
      polys.push({ pts: ring(hw * side * 1.1, R * 0.2).map(P), col: lit(COL.HUB, no) });
    }
    parts.push({ k: depth(add3(C, ax, side * 0.2)) + off, polys });
  }
  function beacon(u, v, w) {
    const bs = beaconState(m);
    box(u - 0.08, u + 0.08, v - 0.08, v + 0.08, w, w + 0.15, bs.mode === 'flash' ? (bs.on ? COL.ORON : COL.OROFF) : bs.mode === 'rot' ? COL.ORMID : COL.ORON);
    beacons.push(Object.assign({ p: W(u, v, w + 0.09) }, bs));
  }
  // forward-facing headlight with a pool of light on the ground ahead
  function lamp(u, v, w, sc = 1, nobox = false) {
    if (!nobox) box(u - 0.03, u + 0.03, v - 0.1, v + 0.1, w, w + 0.12, COL.LAMP, 0.03);
    lamps.push({ p: W(u + 0.04, v, w + 0.06), g0: W(u + 0.2, v, 0), g1: W(u + 2.6 * sc, v + 0.75 * sc, 0), g2: W(u + 2.6 * sc, v - 0.75 * sc, 0) });
  }
  return { W, Dv, addBox, box, plate, beam, wheel, beacon, lamp };
}


function buildLoader(parts) {
  const L = loader, F = Object.create(L);
  F.h = L.h + L.steer;                                          // front frame turns at the centre joint
  const R = kit(L, parts), { W, Dv, addBox, box, plate, beam, wheel, lamp } = kit(F, parts);
  // rear frame: engine, cab, rear axle
  R.wheel(-0.8, 0.72, 0, 1, L.R, COL.Y); R.wheel(-0.8, -0.72, 0, -1, L.R, COL.Y);
  R.box(-1.55, -0.12, -0.58, 0.58, 0.38, 1.0, COL.Y);          // engine / rear frame
  R.box(-1.62, -1.55, -0.45, 0.45, 0.5, 0.9, COL.DK);          // grille
  const rev = L.speed < -0.03 || (active === L && keys.down && L.speed < 0.2);   // reversing: the rear triangle glows
  R.plate([R.W(-1.635, -0.4, 0.55), R.W(-1.635, -0.1, 0.55), R.W(-1.635, -0.25, 0.78)], rev ? [255, 70, 60] : [232, 36, 40], 0.5, R.Dv(-1, 0, 0));
  if (rev) lamps.push({ col: 'rgba(255,40,30,0.16)', dot: 'rgba(255,90,70,0.7)', r: 5, p: R.W(-1.65, -0.25, 0.64), g0: R.W(-1.7, -0.25, 0), g1: R.W(-3.6, 0.35, 0), g2: R.W(-3.6, -0.85, 0) });
  R.box(-1.3, -0.3, 0.58, 0.92, 0.9, 0.98, COL.Y, 0.05);       // rear fenders
  R.box(-1.3, -0.3, -0.92, -0.58, 0.9, 0.98, COL.Y, 0.05);
  R.box(-1.35, -1.23, 0.22, 0.34, 1.0, 1.4, COL.DK);           // exhaust
  R.box(-0.95, -0.05, -0.5, 0.5, 1.0, 1.2, COL.Y);             // cab
  R.box(-0.9, -0.1, -0.47, 0.47, 1.2, 1.72, COL.GL);
  R.box(-1.0, 0.0, -0.55, 0.55, 1.72, 1.84, COL.Y);
  R.beacon(-0.5, 0, 1.84);
  R.lamp(0.02, 0.38, 1.7); R.lamp(0.02, -0.38, 1.7);          // work lights on the cab roof
  R.box(-0.2, 0.0, -0.22, 0.22, 0.45, 0.8, COL.DK);            // centre joint
  // front frame: axle, arms, bucket
  wheel(0.8, 0.72, 0, 1, L.R, COL.Y); wheel(0.8, -0.72, 0, -1, L.R, COL.Y);
  box(0.0, 1.15, -0.42, 0.42, 0.4, 0.78, COL.Y);               // front frame
  box(0.35, 1.25, 0.58, 0.92, 0.9, 0.98, COL.Y, 0.05);         // front fenders
  box(0.35, 1.25, -0.92, -0.58, 0.9, 0.98, COL.Y, 0.05);
  lamp(1.24, 0.78, 0.98); lamp(1.24, -0.78, 0.98);             // headlights on the fenders
  for (const sg of [1, -1]) box(0.2, 0.5, sg * 0.42, sg * 0.66, 0.6, 1.08, COL.Y);   // arm towers

  const ca = Math.cos(L.alpha), sa = Math.sin(L.alpha);
  for (const sg of [1, -1]) {
    beam([0.35, sg * 0.6, 1.0], [0.35 + ca * 1.72, sg * 0.6, 1.0 + sa * 1.72], 0.07, 0.1, COL.Y);     // lift arm
    beam([0.95, sg * 0.43, 0.55], [0.35 + ca * 0.75, sg * 0.43, 1.0 + sa * 0.75], 0.05, 0.06, COL.CYL); // cylinder
  }
  addBox(W(0.35 + ca * 0.9, 0, 1.0 + sa * 0.9), Dv(ca * 0.09, 0, sa * 0.09), Dv(0, 0.56, 0), Dv(-sa * 0.09, 0, ca * 0.09), COL.Y);

  const bk0 = parts.length;
  const Tu = 0.35 + 1.6 * ca, Tw = 1.0 + 1.6 * sa, cb = Math.cos(L.beta), sb = Math.sin(L.beta);
  const B = (p, q, v) => W(Tu + p * cb - q * sb, v, Tw + p * sb + q * cb);
  const bv = 0.8, q0 = -0.32, q1 = 0.32;
  plate([B(0, q0, -bv), B(0, q0, bv), B(0, q1, bv), B(0, q1, -bv)], COL.BK);
  plate([B(0, q0, -bv), B(0, q0, bv), B(0.8, q0, bv), B(0.8, q0, -bv)], COL.BK, -0.02);
  plate([B(0.74, q0 - 0.01, -bv), B(0.74, q0 - 0.01, bv), B(0.88, q0 - 0.03, bv), B(0.88, q0 - 0.03, -bv)], COL.EDGE, -0.01);
  for (const sg of [1, -1]) plate([B(0, q0, sg * bv), B(0.8, q0, sg * bv), B(0.55, -0.02, sg * bv), B(0, q1, sg * bv)], COL.BK, 0.02);
  for (let i = bk0; i < parts.length; i++) parts[i].bkt = true;
  if (parts[bk0 + 1]) parts[bk0 + 1].flr = true;                   // the bucket floor always lies under the load       // the bucket is flagged so it can be drawn over the crusher when raised
}

function buildTruck(parts) {
  const T = truck, { W, Dv, addBox, box, beam, wheel, beacon, lamp } = kit(T, parts);
  for (const [u, v, st] of T.wheels) wheel(u, v, st ? T.steer : 0, v > 0 ? 1 : -1, T.R, COL.CYL);
  box(-2.05, 1.2, -0.5, 0.5, 0.42, 0.88, COL.CH);               // chassis
  box(-2.15, -2.05, -0.8, 0.8, 0.4, 0.55, COL.CH);              // rear bumper
  box(-2.38, -2.12, 0.56, 0.68, 0.3, 0.42, COL.DK);             // tailpipe
  box(1.15, 2.15, -0.9, 0.9, 0.5, 1.35, COL.CAB);               // cab
  box(1.25, 2.02, -0.86, 0.86, 1.35, 1.88, COL.GL);
  box(1.15, 2.08, -0.92, 0.92, 1.88, 2.0, COL.CAB);
  box(2.15, 2.26, -0.86, 0.86, 0.42, 0.62, COL.DK);              // front bumper
  lamp(2.18, 0.62, 0.8); lamp(2.18, -0.62, 0.8);               // headlights
  box(1.95, 2.15, -0.2, 0.2, 0.62, 1.2, COL.DK, 0.01);          // grille
  beacon(1.63, 0, 2.0);
  box(1.0, 1.12, 0.62, 0.72, 0.9, 2.05, COL.DK);                // exhaust stack

  // tipping bed, rotated around the rear hinge
  const ct = Math.cos(T.tilt), st = Math.sin(T.tilt);
  const BW = (pu, pv, pw) => W(BED_HU + pu * ct - pw * st, pv, BED_HW + pu * st + pw * ct);
  const U = Dv(ct, 0, st), V = Dv(0, 1, 0), Wd = Dv(-st, 0, ct);
  const bbox = (pu, pv, pw, hu, hv, hw, col, bias) => addBox(BW(pu, pv, pw), U.map(x => x * hu), V.map(x => x * hv), Wd.map(x => x * hw), col, bias);
  bbox(BED_LEN / 2, 0, 0.025, BED_LEN / 2, BED_V + 0.02, 0.025, COL.BED, -0.05);   // floor
  bbox(BED_LEN / 2, BED_V, 0.3, BED_LEN / 2, 0.03, 0.27, COL.BED);                // side walls
  bbox(BED_LEN / 2, -BED_V, 0.3, BED_LEN / 2, 0.03, 0.27, COL.BED);
  bbox(BED_LEN - 0.04, 0, 0.42, 0.04, BED_V + 0.02, 0.4, COL.BED);               // headboard
  bbox(BED_LEN + 0.1, 0, 0.8, 0.14, 0.7, 0.025, COL.BED);                         // cab guard
  bbox(0.04, 0, 0.12, 0.04, BED_V + 0.02, 0.1, COL.BED, 0.02);                    // low tail lip
  if (T.tilt > 0.02) {                                                             // lift ram
    const top = [BED_HU + 2.3 * ct - 0.0 * st, 0, BED_HW + 2.3 * st];
    beam([0.7, 0, 0.8], top, 0.08, 0.08, COL.CYL);
  }
}

function buildExc(parts) {
  const E = exc, C = kit(E, parts, -0.7);                        // the undercarriage is always drawn before the turning upper part
  const U = Object.create(E); U.h = E.h + E.swing;               // upper structure turns on the slewing ring
  const { W, Dv, addBox, box, plate, beam, wheel, beacon, lamp } = kit(U, parts);
  for (const [u, v, st] of E.wheels) C.wheel(u, v, st ? E.steer : 0, v > 0 ? 1 : -1, E.R, COL.OR);
  C.box(-1.3, 1.25, -0.55, 0.55, 0.38, 0.82, COL.CH);            // undercarriage
  C.box(-1.15, 1.1, -0.95, 0.95, 0.82, 0.9, COL.CH, 0.03);      // mudguards
  C.box(1.25, 1.33, 0.3, 0.5, 0.46, 0.62, [255, 255, 240], 0.05);      // front lights of the undercarriage
  C.box(1.25, 1.33, -0.5, -0.3, 0.46, 0.62, [255, 255, 240], 0.05);
  C.lamp(1.33, 0.4, 0.5, 0.5, true); C.lamp(1.33, -0.4, 0.5, 0.5, true);   // small beams ahead of the undercarriage
  const rev = E.speed < -0.03 || (active === E && keys.down && E.speed < 0.2);   // reversing: the triangle glows
  C.plate([C.W(-1.32, -0.46, 0.45), C.W(-1.32, -0.14, 0.45), C.W(-1.32, -0.3, 0.68)], rev ? [255, 70, 60] : [232, 36, 40], 0.5, C.Dv(-1, 0, 0));
  if (rev) lamps.push({ col: 'rgba(255,40,30,0.16)', dot: 'rgba(255,90,70,0.7)', r: 5, p: C.W(-1.34, -0.3, 0.54), g0: C.W(-1.4, -0.3, 0), g1: C.W(-3.4, 0.3, 0), g2: C.W(-3.4, -0.9, 0) });   // red warning triangle at the rear
  C.box(-0.55, 0.55, -0.55, 0.55, 0.82, 0.9, COL.DK, 0.04);     // slewing ring
  box(-1.4, 0.85, -0.85, 0.85, 0.9, 1.45, COL.OR);               // upper house
  box(-1.6, -1.25, -0.85, 0.85, 0.9, 1.35, COL.ORD);             // counterweight
  box(-1.35, -0.25, -0.85, 0.05, 1.45, 1.62, COL.OR);            // engine hood
  box(-1.0, -0.88, -0.6, -0.48, 1.62, 2.0, COL.DK);              // exhaust
  box(-0.15, 0.82, 0.12, 0.82, 1.45, 2.12, COL.GL);              // cab glass
  box(-0.2, 0.86, 0.08, 0.86, 2.12, 2.24, COL.OR);               // cab roof
  box(-0.2, -0.1, 0.08, 0.86, 1.45, 2.12, COL.OR);               // cab back post
  beacon(0.3, 0.47, 2.24);
  lamp(0.89, 0.3, 2.08); lamp(0.89, 0.7, 2.08);                 // cab roof lights
  box(0.3, 0.95, EX_V - 0.22, EX_V + 0.22, 1.1, 1.62, COL.OR);   // boom foot
  lamp(0.98, EX_V, 1.42);

  const G = excGeo(E), [B, S] = E.j, v0 = EX_V;
  const P0 = [EX_P0[0], v0, EX_P0[1]], P1 = [G.p1[0], v0, G.p1[1]], P2 = [G.p2[0], v0, G.p2[1]];
  beam(P0, P1, 0.15, 0.14, COL.OR);                              // boom (puomi)
  const back = [P1[0] - Math.cos(S) * 0.35, v0, P1[2] - Math.sin(S) * 0.35];
  beam(back, P2, 0.1, 0.09, COL.OR);                             // stick (varsi)
  for (const sg of [1, -1]) {                                    // boom cylinders
    const a = [0.95, v0 + sg * 0.2, 1.05], b = [EX_P0[0] + Math.cos(B) * 1.0, v0 + sg * 0.2, EX_P0[1] + Math.sin(B) * 1.0 - 0.12];
    beam(a, b, 0.05, 0.06, COL.CYL);
  }
  beam([EX_P0[0] + Math.cos(B) * 1.1, v0, EX_P0[1] + Math.sin(B) * 1.1 + 0.16], [back[0], v0, back[2] + 0.08], 0.05, 0.06, COL.CYL);   // stick cylinder
  const sm = [P1[0] + Math.cos(S) * 0.25, v0, P1[2] + Math.sin(S) * 0.25 + 0.0];
  beam([sm[0] - Math.sin(S) * 0.14, v0, sm[2] + Math.cos(S) * 0.14], [P2[0] - Math.sin(S) * 0.14, v0, P2[2] + Math.cos(S) * 0.14], 0.04, 0.05, COL.CYL); // bucket cylinder

  const eb0 = parts.length;
  // bucket (kauha): side plates, curved back and teeth
  const bv = EX_BV, Lb = (p, q, v) => G.loc(p, q, v);
  const prof = [[0, 0], [0.22, -0.11], [EX_BL, 0], [0.04, 0.4]];
  for (const sg of [1, -1]) plate(prof.map(([p, q]) => Lb(p, q, sg * bv)), COL.OR, 0.02);
  plate([Lb(0, 0, -bv), Lb(0, 0, bv), Lb(0.22, -0.11, bv), Lb(0.22, -0.11, -bv)], COL.OR);
  plate([Lb(0.22, -0.11, -bv), Lb(0.22, -0.11, bv), Lb(EX_BL, 0, bv), Lb(EX_BL, 0, -bv)], COL.OR);
  plate([Lb(0, 0, -bv), Lb(0, 0, bv), Lb(0.04, 0.4, bv), Lb(0.04, 0.4, -bv)], COL.ORD, -0.02);
  for (const v of [-0.27, -0.09, 0.09, 0.27])
    plate([Lb(EX_BL - 0.02, -0.01, v - 0.05), Lb(EX_BL - 0.02, -0.01, v + 0.05), Lb(EX_BL + 0.12, 0.03, v)], COL.TEETH, -0.01);
  for (let i = eb0; i < parts.length; i++) parts[i].ebk = true;
}

function buildCrusher(parts) {
  const { W, Dv, box, plate, beam } = kit(CR, parts);
  for (const sg of [1, -1]) {                                   // tracks
    box(-2.3, 1.3, sg > 0 ? 0.46 : -0.88, sg > 0 ? 0.88 : -0.46, 0.02, 0.4, COL.TIRE);
    for (let i = 0; i < 9; i++) box(-2.25 + i * 0.4, -2.05 + i * 0.4, sg > 0 ? 0.88 : -0.9, sg > 0 ? 0.9 : -0.88, 0.05, 0.37, COL.TIRE2, 0.01);
  }
  box(-2.6, 1.5, -0.56, 0.56, 0.4, 0.66, COL.DK2);             // main frame
  box(-2.6, -1.4, -0.6, 0.6, 0.66, 1.28, COL.CRM2);            // hopper stand
  // feed hopper, flared walls with rock inside
  const hp = [[-2.75, -0.8, 1.28], [-1.3, -0.8, 1.28], [-1.3, 0.8, 1.28], [-2.75, 0.8, 1.28]];
  const ht = [[-2.98, -1.02, 2.05], [-1.12, -1.02, 2.05], [-1.12, 1.02, 2.05], [-2.98, 1.02, 2.05]];
  const h0 = parts.length;
  // an open shaft: dark floor deep down, the far walls show their inside (darker), the near walls their outside
  plate([W(-2.75, -0.8, 1.3), W(-1.3, -0.8, 1.3), W(-1.3, 0.8, 1.3), W(-2.75, 0.8, 1.3)], [30, 29, 30], -0.3);
  for (const [u, v] of [[-2.4, -0.3], [-1.9, 0.35], [-2.2, 0.55], [-1.6, -0.5]]) plate([W(u - 0.18, v - 0.1, 1.33), W(u + 0.18, v - 0.12, 1.33), W(u + 0.1, v + 0.12, 1.4), W(u - 0.12, v + 0.1, 1.38)], COL.ROCK, -0.25);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, a = hp[i], b = hp[j];
    const out = Dv((a[0] + b[0]) / 2 + 2.05, (a[1] + b[1]) / 2, 0);                  // outward direction of this wall
    const far = vis([-out[0], -out[1], 0.4]);
    plate([W(...hp[i]), W(...hp[j]), W(...ht[j]), W(...ht[i])], far ? [112, 106, 90] : COL.CRM, far ? -0.2 : 0);
    if (!far) parts[parts.length - 1].nw = true;
  }
  for (let i = h0; i < parts.length; i++) parts[i].hop = true;
  box(-1.3, -0.15, -0.6, 0.6, 0.66, 1.95, COL.CRM);             // crusher box
  box(-1.2, -0.25, -0.5, 0.5, 1.95, 2.0, COL.DK2);
  box(-1.0, -0.4, 0.6, 0.62, 0.85, 1.0, COL.LBL, 0.02);      // orange name plate
  box(-0.15, 1.35, -0.72, 0.72, 0.66, 1.75, COL.CRM);           // engine housing
  box(0.15, 1.05, 0.72, 0.76, 0.85, 1.55, COL.DK2, 0.02);    // radiator grille
  for (let i = 0; i < 5; i++) box(0.2, 1.0, 0.76, 0.78, 0.9 + i * 0.13, 0.95 + i * 0.13, COL.CRM2, 0.03);
  for (const sg of [1, -1]) {                                   // railings on top
    beam([-0.1, sg * 0.66, 2.1], [1.3, sg * 0.66, 2.1], 0.025, 0.025, COL.DK2);
    for (const u of [-0.08, 0.6, 1.28]) box(u - 0.025, u + 0.025, sg * 0.66 - 0.025, sg * 0.66 + 0.025, 1.75, 2.1, COL.DK2);
  }
  box(-0.42, -0.34, -0.44, -0.36, 2.0, 3.0, COL.DK2);             // light mast
  box(-0.47, -0.29, -0.49, -0.31, 3.0, 3.12, COL.SIL);
  // conveyor: frame, moving belt with cleats, supports and head hood
  const at = d => [CR_B0[0] + CR_DU * d, 0, CR_B0[2] + CR_DW * d];
  const segs = 4;
  for (let i = 0; i < segs; i++) {
    const a = at(CR_LEN * i / segs), b = at(CR_LEN * (i + 1) / segs);
    beam(a, b, 0.38, 0.08, COL.DK2);
    const lift = (p, k) => [p[0] - CR_DW * k, p[1], p[2] + CR_DU * k];
    beam(lift(a, 0.09), lift(b, 0.09), 0.3, 0.012, COL.BELT);
    for (const sg of [1, -1]) beam([...lift(a, 0.16)].map((x, j) => j === 1 ? sg * 0.4 : x), [...lift(b, 0.16)].map((x, j) => j === 1 ? sg * 0.4 : x), 0.025, 0.05, COL.DK2);
  }
  for (let d = CR.belt; d < CR_LEN - 0.1; d += 0.45) {          // belt cleats sliding up
    const p = at(d), k = 0.11;
    box(p[0] - CR_DW * k - 0.03, p[0] - CR_DW * k + 0.03, -0.3, 0.3, p[2] + CR_DU * k - 0.01, p[2] + CR_DU * k + 0.02, COL.CH, 0.02);
  }
  for (const sg of [1, -1]) {
    const u2 = 2.9, w2 = CR_B0[2] + (u2 - CR_B0[0]) * CR_DW / CR_DU;
    beam([1.45, sg * 0.42, 0.62], [u2, sg * 0.42, w2 - 0.08], 0.04, 0.05, COL.DK2);       // lower strut
    beam([1.2, sg * 0.5, 1.75], [3.4, sg * 0.5, w2 + 0.75], 0.03, 0.04, COL.DK2);         // upper frame
  }
  box(4.05, 4.65, -0.46, 0.46, 2.18, 2.62, COL.SIL);            // head hood
  box(4.45, 4.62, -0.4, 0.4, 1.9, 2.18, COL.DK2);               // drop curtain
}

function drawShadow(m, u0, u1, vm) {
  const c = Math.cos(m.h), s = Math.sin(m.h);
  const sh = [[u0, -vm], [u1, -vm], [u1, vm], [u0, vm]].map(([u, v]) => P([m.x + u * c - v * s + 0.08, m.y + u * s + v * c - 0.12, 0]));
  ctx.beginPath(); ctx.moveTo(sh[0][0], sh[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(sh[i][0], sh[i][1]);
  ctx.closePath(); ctx.fill();
}

function drawPointer(m) {
  const bob = Math.round(Math.sin(time * 5) * 2);
  const q = P([m.x, m.y, m.top + 0.55]);
  const x = q[0], y = q[1] + bob;
  ctx.fillStyle = '#2a2420';
  for (let r = 0; r < 6; r++) ctx.fillRect(x - 6 + r, y + r - 1, 13 - 2 * r, 1);
  ctx.fillRect(x - 3, y - 6, 7, 6);
  ctx.fillStyle = '#ffd866';
  for (let r = 0; r < 4; r++) ctx.fillRect(x - 4 + r, y + r, 9 - 2 * r, 1);
  ctx.fillRect(x - 2, y - 5, 5, 5);
}
