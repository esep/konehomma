
/* ---------- machines ---------- */
// Loader bucket states: 0 = down, 1 = up (carry), 2 = dump
const ARM = [-0.42, 0.75, 0.75], BKT = [0, 0.55, -1.05];
// Truck bed states: 0 = down, 1 = tipped
const TILT = [0, 0.85];
const BED_HU = -2.0, BED_HW = 0.95, BED_LEN = 2.9, BED_V = 0.88;   // bed hinge at the back of the truck

// Excavator poses [boom, stick, bucket] as absolute angles in the side plane:
// 0 = up (start), 1 = down, 2 = scoop, 3 = up with load, 4 = dump (then back to 0 by itself)
const EXP = [[0.9, -1.2, -2.9], [0.27, -1.25, -1.45], [0.3, -1.75, -3.0], [0.9, -1.2, -2.9], [0.75, -0.5, 0.6]];
const EX_RATE = [0.7, 1.0, 1.9];
const EX_P0 = [0.55, 1.45], EX_LB = 2.0, EX_LS = 1.5, EX_BL = 0.6, EX_V = -0.25, EX_BV = 0.38;
const EXSLOTS = [];
for (const p of [0.12, 0.26, 0.4]) for (const v of [-0.27, -0.09, 0.09, 0.27]) EXSLOTS.push([p, 0.13, v]);
for (const p of [0.18, 0.36]) for (const v of [-0.18, 0, 0.18]) EXSLOTS.push([p, 0.32, v]);

const SLOTS = [];
{ const R = rng(3), q0 = -0.32 + BR + 0.02;
  for (const p of [0.14, 0.38, 0.62]) for (const v of [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6]) SLOTS.push([p, q0, v]);
  for (const p of [0.16, 0.4]) for (const v of [-0.48, -0.24, 0, 0.24, 0.48]) SLOTS.push([p, q0 + 0.21, v]);
  for (const v of [-0.24, 0, 0.24]) SLOTS.push([0.28, q0 + 0.42, v]);
  for (const s of SLOTS) { s[0] += (R() - 0.5) * 0.05; s[2] += (R() - 0.5) * 0.06; }
}

const loader = {
  kind: 'loader', icon: 'M7 1H10V2H7ZM0 2H1V3H0ZM4 2H11V3H4ZM0 3H7V4H0ZM9 3H11V4H9ZM1 4H5V5H1ZM9 4H11V5H9ZM2 5H4V6H2ZM9 5H11V6H9ZM2 6H4V7H2ZM9 6H11V7H9ZM1 7H3V8H1ZM9 7H11V8H9ZM2 8H4V9H2ZM9 8H11V9H9ZM2 9H4V10H2ZM10 9H12V10H10ZM3 10H6V11H3ZM10 10H12V11H10ZM4 11H7V12H4ZM11 11H13V12H11ZM5 12H16V13H5ZM7 13H16V14H7Z',   // sivuprofiili 16x16 -ruudukossa
  art: true,   // frame-steered: steer is the bend angle at the centre joint, x/y is that joint, h is the rear frame heading
  rect: [-1.65, 1.3, 0.92], wb: 1.6, R: 0.45, tyre: 0.16, vmax: 2.3, vrev: 1.4, maxSteer: 0.6, top: 2.1,
  wheels: [[-0.8, 0.72, 0, 0], [-0.8, -0.72, 0, 0], [0.8, 0.72, 0, 1], [0.8, -0.72, 0, 1]]
};
const truck = {
  kind: 'truck', icon: 'M10 1H12V2H10ZM9 2H13V3H9ZM8 3H14V4H8ZM7 4H13V5H7ZM6 5H12V6H6ZM5 6H11V7H5ZM4 7H10V8H4ZM12 7H15V8H12ZM2 8H9V9H2ZM11 8H16V9H11ZM1 9H7V10H1ZM11 9H12V10H11ZM14 9H16V10H14ZM0 10H5V11H0ZM11 10H12V11H11ZM14 10H16V11H14ZM0 11H16V12H0ZM0 12H16V13H0ZM2 13H5V14H2ZM11 13H14V14H11ZM2 14H5V15H2ZM11 14H14V15H11Z',
  rect: [-2.15, 2.28, 1.0], wb: 2.8, R: 0.42, tyre: 0.16, vmax: 2.6, vrev: 1.4, maxSteer: 0.5, top: 2.1,
  wheels: [[1.45, 0.78, 1], [1.45, -0.78, 1], [-0.4, 0.78, 0], [-0.4, -0.78, 0], [-1.2, 0.78, 0], [-1.2, -0.78, 0]]
};
const exc = {
  kind: 'exc', swingable: true, icon: 'M7 1H10V2H7ZM0 2H1V3H0ZM4 2H11V3H4ZM0 3H7V4H0ZM9 3H11V4H9ZM1 4H5V5H1ZM9 4H11V5H9ZM2 5H4V6H2ZM9 5H11V6H9ZM2 6H4V7H2ZM9 6H11V7H9ZM1 7H3V8H1ZM9 7H11V8H9ZM2 8H4V9H2ZM9 8H11V9H9ZM2 9H4V10H2ZM10 9H12V10H10ZM3 10H6V11H3ZM10 10H12V11H10ZM4 11H7V12H4ZM11 11H13V12H11ZM5 12H16V13H5ZM7 13H16V14H7Z',
  rect: [-1.6, 1.3, 0.95], wb: 1.8, R: 0.42, tyre: 0.16, vmax: 2.2, vrev: 1.3, maxSteer: 0.5, top: 2.4,
  wheels: [[0.9, 0.72, 1], [0.9, -0.72, 1], [-0.9, 0.72, 0], [-0.9, -0.72, 0]]
};
// Orange tractor with a front loader push plate and a rear-mounted V-shaped snow blower (snow yard only). wheels: [u, v, steered, half width]
const tractor = {
  kind: 'tractor', icon: 'M4 1L8 5.5H5.5V10H2.5V5.5H0Z M12 15L16 10.5H13.5V6H10.5V10.5H8Z',
  rect: [-3.95, 2.3, 1.3], wb: 2.3, R: 0.62, tyre: 0.2, vmax: 2.4, vrev: 1.4, maxSteer: 0.62, top: 2.9,
  wheels: [[1.0, 0.8, 1, 0.14], [1.0, -0.8, 1, 0.14], [-0.85, 1.02, 0, 0.2], [-0.85, -1.02, 0, 0.2]]
};
// David Brown: iso takarengas, pienet renkaat niiden edessä, eturenkaat; kääntyvä nosturi katolla (pdavid.js). wheels: [u, v, steered, half width]
const david = {
  kind: 'david', swingable: true, icon: 'M7 1H9V2H10V3H11V4H5V3H6V2H7Z M7 4H9V12H7Z M5 11H11V12H10V13H9V14H7V13H6V12H5Z',
  rect: [-2.2, 2.5, 1.2], wb: 2.4, R: 0.62, tyre: 0.2, vmax: 2.2, vrev: 1.3, maxSteer: 0.6, top: 3.1,
  wheels: [[1.6, 0.82, 1, 0.14], [1.6, -0.82, 1, 0.14], [0.5, 0.88, 0, 0.12], [0.5, -0.88, 0, 0.12], [-0.8, 1.05, 0, 0.2], [-0.8, -1.05, 0, 0.2]]
};
const snowMachines = [tractor, david];
loader.phase = 0; truck.phase = 2; exc.phase = 4; tractor.phase = 1; david.phase = 3;
// Rock crusher on tracks with a conveyor that keeps a gravel pile topped up
const CR = { x: 21, y: 28.5, h: -Math.PI / 4, rect: [-2.75, 2.7, 0.95], roll: 0, phase: 0, timer: 0, belt: 0 };
const CR_B0 = [1.1, 0, 0.62], CR_B1 = [4.4, 0, 2.3];      // conveyor tail and head (u, v, w)
const CR_LEN = Math.hypot(CR_B1[0] - CR_B0[0], CR_B1[2] - CR_B0[2]);
const CR_DU = (CR_B1[0] - CR_B0[0]) / CR_LEN, CR_DW = (CR_B1[2] - CR_B0[2]) / CR_LEN;
const crLocal = (u, v, w) => { const c = Math.cos(CR.h), s = Math.sin(CR.h); return [CR.x + u * c - v * s, CR.y + u * s + v * c, w]; };
const CR_DROP = crLocal(4.85, 0, 0);
const machines = [loader, truck, exc];
let active = loader;
let balls = [], rocks = [];
const keys = { left: 0, right: 0, up: 0, down: 0, swl: 0, swr: 0 };
const SNOW_OBST = [], DOORS = [];   // DOORS: oviaukot { horiz, plane, a0, a1 } (nosturi painuu matalaksi niiden kohdalla)
   // later: buildings in the snow yard, each { x, y, h, rect: [u0, u1, vHalf] }

function resetMachine(m, s) { Object.assign(m, { x: s.x, y: s.y, h: s.h, steer: 0, speed: 0, roll: 0, beep: 0, trackAcc: 0 }); }
function reset() {
  resetMachine(loader, START_L); resetMachine(truck, START_T);
  Object.assign(loader, { alpha: ARM[0], beta: BKT[0], state: 0, slots: SLOTS.map(() => null), rk: [null, null], rkT: 0 });
  Object.assign(truck, { tilt: 0, state: 0, bed: [] });
  resetMachine(exc, START_E);
  Object.assign(exc, { rock: null, swing: 0, swung: false, state: 0, j: EXP[0].slice(), slots: EXSLOTS.map(() => null), wait: 0, tm: 0 });
  tctx.clearRect(0, 0, GW, GH);
  for (const H of HOLES) { H.done = false; H.t = -99; }
  sparks = []; smoke = [];
  balls = [];
  grid.clear();
  const R = rng(11);
  for (let i = 0; i < 360; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 1.45;
    const b = { x: PILE.x + Math.cos(a) * r, y: PILE.y + Math.sin(a) * r, z: 6, st: 'rest', v: i % 3, vx: 0, vy: 0, vz: 0 };
    settle(b); balls.push(b); gridAdd(b);
  }
  for (let i = 0; i < 70; i++) {               // gravel already under the conveyor
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.8;
    const b = { x: CR_DROP[0] + Math.cos(a) * r, y: CR_DROP[1] + Math.sin(a) * r, z: 6, st: 'rest', v: 3 + i % 2, vx: 0, vy: 0, vz: 0 };
    settle(b); balls.push(b); gridAdd(b);
  }
  CR.timer = 0; CR.burst = 0; CR.shake = 0;
  rocks = [];                                  // boulders on the gravel next to the grass in the north-west
  { const Rk = rng(21); let tries = 0;
    while (rocks.length < 12 && tries++ < 600) {
      const x = 8.4 + (Rk() + Rk() + Rk() - 1.5) / 1.5 * 1.1, y = 23.5 + (Rk() + Rk() + Rk() - 1.5) / 1.5 * 5.2;
      if (x < 7.2 || x > 9.8 || y < 17.5 || y > 29.5) continue;
      if (rocks.some(r => Math.hypot(r.x - x, r.y - y) < 1.0)) continue;
      rocks.push({ x, y, z: RR, vx: 0, vy: 0, vz: 0, st: 'rest', s: rocks.length % 3, lt: 1 });
    }
  }
  setActive(loader);
}

const acticon = document.getElementById('acticon');
const mbtns = [...document.querySelectorAll('.mb[data-m]')], sbtns = [...document.querySelectorAll('.mb[data-s]')];
function setActive(m) {
  active = m; acticon.setAttribute('d', m.icon);
  document.body.classList.toggle('exc', !!m.swingable);
  mbtns.forEach((b, i) => b.classList.toggle('sel', machines[i] === m));
  sbtns.forEach((b, i) => b.classList.toggle('sel', snowMachines[i] === m));
  if (scene === 'snow') {
    const dv = m === david, sw = dv ? ['Käännä nosturia vasemmalle', 'Käännä nosturia oikealle'] : ['Käännä puhallusta vasemmalle', 'Käännä puhallusta oikealle'];
    document.getElementById('swlb').setAttribute('aria-label', sw[0]); document.getElementById('swrb').setAttribute('aria-label', sw[1]);
    document.getElementById('act').setAttribute('aria-label', dv ? 'Nosturi ylös tai alas' : 'Vaihda työkalu: linko, ei työkaluja tai puskulevy');
  }
}
function nextMachine() { if (scene === 'snow') setActive(snowMachines[(snowMachines.indexOf(active) + 1) % snowMachines.length]); else setActive(machines[(machines.indexOf(active) + 1) % machines.length]); }
function action() {
  if (active === david) david.cs = david.cs ? 0 : 1;                  // nosturi ylös <-> alas
  else if (active === tractor) tractor.state = (tractor.state + 1) % 3;   // 0 linko alas + levy ylös (oletus), 1 molemmat ylös, 2 levy alas + linko ylös
  else if (active === loader) loader.state = (loader.state + 1) % 3;
  else if (active === truck) truck.state = (truck.state + 1) % 2;
  else if (exc.state < 4) exc.state++;
}
function excGeo(E) {
  const [B, S, K] = E.j, c = Math.cos(E.h + E.swing), s = Math.sin(E.h + E.swing);
  const p1 = [EX_P0[0] + EX_LB * Math.cos(B), EX_P0[1] + EX_LB * Math.sin(B)];
  const p2 = [p1[0] + EX_LS * Math.cos(S), p1[1] + EX_LS * Math.sin(S)];
  const d = [Math.cos(K), Math.sin(K)], n = [d[1], -d[0]];       // n points into the bucket's opening
  const loc = (p, q, v) => { const u = p2[0] + d[0] * p + n[0] * q, w = p2[1] + d[1] * p + n[1] * q, vv = v + EX_V;
    return [E.x + u * c - vv * s, E.y + u * s + vv * c, w]; };
  return { p1, p2, d, n, loc };
}

/* oriented rectangles for machine-to-machine bumping */
function bodiesOf(m) {
  if (!m.art) return [m];
  return [{ x: m.x, y: m.y, h: m.h, rect: [-1.65, 0.05, 0.92] }, { x: m.x, y: m.y, h: m.h + m.steer, rect: [-0.05, 1.3, 0.92] }];
}
function hits(a, b) {
  for (const p of bodiesOf(a)) for (const q of bodiesOf(b)) if (overlap(p, q)) return true;
  return false;
}
function corners(m) {
  const c = Math.cos(m.h), s = Math.sin(m.h), [u0, u1, vm] = m.rect;
  return [[u0, -vm], [u1, -vm], [u1, vm], [u0, vm]].map(([u, v]) => [m.x + u * c - v * s, m.y + u * s + v * c]);
}
function overlap(a, b) {
  const A = corners(a), B = corners(b);
  for (const Pp of [A, B]) for (let i = 0; i < 2; i++) {
    const ax = -(Pp[i + 1][1] - Pp[i][1]), ay = Pp[i + 1][0] - Pp[i][0];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const p of A) { const d = p[0] * ax + p[1] * ay; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const p of B) { const d = p[0] * ax + p[1] * ay; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 < b0 || b1 < a0) return false;
  }
  return true;
}

function drive(m, dt, on) {
  const k = on ? keys : { left: 0, right: 0, up: 0, down: 0 };
  const prev = [m.x, m.y, m.h, m.steer], s0 = m.steer;
  m.swung = false;
  if (m.swingable && on && keys.swl !== keys.swr) {
    const sw0 = m.swing; m.swing += (keys.swl ? 1 : -1) * 0.9 * dt; m.swung = true;
    if (m === david && scene === 'snow' && armHits(m.x, m.y, m.h, m.swing) && !armHits(m.x, m.y, m.h, sw0)) { m.swing = sw0; m.swung = false; if (m === active) bump(1.2); }   // nosturi ei käänny seinän läpi   // turn the upper structure with its own buttons
  }
  if (k.left && !k.right) m.steer = Math.min(m.maxSteer, m.steer + (m.art ? 0.9 : 1.5) * dt);
  else if (k.right && !k.left) m.steer = Math.max(-m.maxSteer, m.steer - (m.art ? 0.9 : 1.5) * dt);
  else if (on) m.steer = approach(m.steer, 0, 0.8 * dt * (m.art ? Math.min(1, Math.abs(m.speed) / 0.5) : 1));
  const target = k.up ? m.vmax : k.down ? -m.vrev : 0;
  m.speed = approach(m.speed, target, (target === 0 ? 2.8 : 1.8) * dt);
  if (m.art) {
    // bending: both halves swing around the centre joint
    m.h -= (m.steer - s0) / 2;
    // driving: the joint moves along the mid heading, the rear axle follows without sliding
    const hl = m.wb / 2, rx = m.x - hl * Math.cos(m.h), ry = m.y - hl * Math.sin(m.h), hm = m.h + m.steer / 2;
    m.x += Math.cos(hm) * m.speed * dt; m.y += Math.sin(hm) * m.speed * dt;
    m.h = Math.atan2(m.y - ry, m.x - rx);
  } else {
    m.h += m.speed / m.wb * Math.tan(m.steer) * dt;
    m.x += Math.cos(m.h) * m.speed * dt; m.y += Math.sin(m.h) * m.speed * dt;
  }
  const snow = scene === 'snow', lo = snow ? PX0 + 0.8 : 3, hi = snow ? PX1 : M - 3, loy = snow ? PY0 + 0.8 : 3, hiy = snow ? PY1 - 0.8 : M - 3;
  m.x = Math.max(lo, Math.min(hi, m.x)); m.y = Math.max(loy, Math.min(hiy, m.y));
  if (snow) {                                              // buildings: a slight touch only slows the tractor, and it slides along the wall
    const r0 = m.rect, sm = [r0[0] + 0.3, r0[1] - 0.3, r0[2] - 0.25];
    const ot = m === tractor ? david : m === david ? tractor : null;   // the two tractors do not drive through each other
    const blocked = (x, y, h) => { const q = { x, y, h, rect: sm }; for (const o of SNOW_OBST) if (hits(q, o)) return true; if (ot && hits(q, { x: ot.x, y: ot.y, h: ot.h, rect: [ot.rect[0] + 0.3, ot.rect[1] - 0.3, ot.rect[2] - 0.25] })) return true;
      for (const b of BAGS) if (!b.held && b.z < 0.3) { const o = { x: b.x, y: b.y, h: 0, rect: [-0.5, 0.5, 0.5] }; if (hits(q, o) && !hits({ x: prev[0], y: prev[1], h: prev[2], rect: sm }, o)) return true; }   // wood bags on the ground are in the way (unless we already overlap one)
      if (m === david && armHits(x, y, h, m.swing) && !armHits(prev[0], prev[1], prev[2], m.swing)) return true;   // nosturi osuu seinään
      return false; };
    if (blocked(m.x, m.y, m.h)) {
      const nx = m.x, ny = m.y, nh = m.h, ns = m.steer;
      const tries = [[nx, prev[1], nh, ns], [prev[0], ny, nh, ns], [nx, ny, prev[2], prev[3]], [nx, prev[1], prev[2], prev[3]], [prev[0], ny, prev[2], prev[3]], [prev[0], prev[1], nh, ns]];
      let ok = false;
      for (const t of tries) if (!blocked(t[0], t[1], t[2])) { [m.x, m.y, m.h, m.steer] = t; ok = true; break; }
      if (!ok) { [m.x, m.y, m.h, m.steer] = prev; if (m === active) bump(Math.abs(m.speed)); }
      if (ok && m === active) bump(Math.abs(m.speed) >= 1.0 ? Math.abs(m.speed) : 0);   // kovempi osuma seinään kuuluu, hipaisu ei
      m.speed *= ok ? 0.9 : 0.5;
    }
  } else for (const o of [...machines, CR, ...HOLES.filter(H => !H.done)]) if (o !== m && hits(m, o)) { [m.x, m.y, m.h, m.steer] = prev; if (m === active) bump(Math.abs(m.speed)); m.speed = 0; break; }
  m.roll += m.speed * dt / m.R;
  m.trackAcc += Math.abs(m.speed) * dt;
  while (m.trackAcc >= 0.12) { m.trackAcc -= 0.12; if (snow) stampSnowTracks(m); else stampTracks(m); }
}
function stampTracks(m) {
  tctx.fillStyle = 'rgba(70,52,34,0.36)';
  for (const [u, v, steered, fr] of m.wheels) {
    const fh = m.h + (fr ? m.steer : 0), a = fh + (steered ? m.steer : 0), c = Math.cos(fh), s = Math.sin(fh);
    const cx = m.x + u * c - v * s, cy = m.y + u * s + v * c;
    const fx = Math.cos(a) * 0.035, fy = Math.sin(a) * 0.035, sx = -Math.sin(a) * m.tyre, sy = Math.cos(a) * m.tyre;
    const q = [[fx + sx, fy + sy], [fx - sx, fy - sy], [-fx - sx, -fy - sy], [-fx + sx, -fy + sy]].map(([dx, dy]) => gp(cx + dx, cy + dy));
    tctx.beginPath(); tctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) tctx.lineTo(q[i][0], q[i][1]);
    tctx.closePath(); tctx.fill();
  }
}

/* ---------- dirt physics on the ground ---------- */
let SJ = null;
// spatial grid of resting stones so each lookup only checks close neighbours
const GC = 0.25, grid = new Map();
const gkey = (ix, iy) => ix * 4096 + iy;
function gridAdd(b) {
  const k = gkey(Math.floor(b.x / GC), Math.floor(b.y / GC));
  let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b);
}
function gridBuild() { grid.clear(); for (const b of balls) if (b.st === 'rest') gridAdd(b); }
function sup(b, maxZ) {
  let h = BR + gz(b.x, b.y); SJ = null;
  const ix = Math.floor(b.x / GC), iy = Math.floor(b.y / GC);
  for (let gx = ix - 1; gx <= ix + 1; gx++) for (let gy = iy - 1; gy <= iy + 1; gy++) {
  const cell = grid.get(gkey(gx, gy)); if (!cell) continue;
  for (const o of cell) {
    if (o === b || o.st !== 'rest' || o.z >= maxZ) continue;
    const dx = b.x - o.x, dy = b.y - o.y, d2 = dx * dx + dy * dy;
    if (d2 >= D2) continue;
    const z = o.z + Math.sqrt(D2 - d2);
    if (z > h) { h = z; SJ = o; }
  }
  }
  return h;
}
function settle(b) {
  for (let it = 0; it < 30; it++) {
    b.z = sup(b, b.z + 0.01);
    if (!SJ) {                         // on the bare ground: roll down into a hole
      const H = holeAt(b.x, b.y);
      if (H) {
        const dx = H.x - b.x, dy = H.y - b.y, dd = Math.hypot(dx, dy);
        if (dd > 0.05) {
          const st = Math.min(0.08, dd), nx = b.x + dx / dd * st, ny = b.y + dy / dd * st;
          if (gz(nx, ny) < gz(b.x, b.y) - 1e-4) { b.x = nx; b.y = ny; continue; }
        }
      }
      return;
    }
    const dx = b.x - SJ.x, dy = b.y - SJ.y, d = Math.hypot(dx, dy);
    if (d < BR * 1.75) {              // perched on top of one ball: roll off
      let ux, uy;
      if (d < 1e-4) { const a = Math.random() * 6.283; ux = Math.cos(a); uy = Math.sin(a); } else { ux = dx / d; uy = dy / d; }
      b.x += ux * BR * 0.6; b.y += uy * BR * 0.6; continue;
    }
    return;
  }
}

/* ---------- dirt on the truck bed (bed coordinates pu, pv, pw) ---------- */
const BED_FLOOR = 0.05;
function supBed(b, maxW) {
  let h = BED_FLOOR + BR; SJ = null;
  for (const o of truck.bed) {
    if (o === b || o.pw >= maxW) continue;
    const du = b.pu - o.pu, dv = b.pv - o.pv, d2 = du * du + dv * dv;
    if (d2 >= D2) continue;
    const w = o.pw + Math.sqrt(D2 - d2);
    if (w > h) { h = w; SJ = o; }
  }
  return h;
}
function clampBed(b) {
  b.pu = Math.max(0.08 + BR, Math.min(BED_LEN - 0.06 - BR, b.pu));
  b.pv = Math.max(-BED_V + 0.04 + BR, Math.min(BED_V - 0.04 - BR, b.pv));
}
function settleBed(b) {
  clampBed(b);
  // like a load being levelled: look around the landing spot and pick the lowest place nearby
  { const pu = b.pu, pv = b.pv, top = b.pw + 0.01;
    let best = [pu, pv], bh = supBed(b, top) - 0.02;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.283, r = 0.15 + Math.random() * 0.75;
      b.pu = pu + Math.cos(a) * r; b.pv = pv + Math.sin(a) * r; clampBed(b);
      const h = supBed(b, top);
      if (h < bh) { bh = h; best = [b.pu, b.pv]; }
    }
    [b.pu, b.pv] = best; }
  for (let it = 0; it < 60; it++) {
    b.pw = supBed(b, b.pw + 0.01);
    if (!SJ) return;                                   // lying on the bed floor
    // resting on another stone: try a few steps outwards and take the lowest one
    const du = b.pu - SJ.pu, dv = b.pv - SJ.pv, d = Math.hypot(du, dv);
    const a0 = d < 1e-4 ? Math.random() * 6.283 : Math.atan2(dv, du);
    const pu = b.pu, pv = b.pv, pw = b.pw;
    let best = null, bh = pw - 0.005;
    for (const da of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4]) {
      b.pu = pu + Math.cos(a0 + da) * BR * 0.7; b.pv = pv + Math.sin(a0 + da) * BR * 0.7; clampBed(b);
      const h = supBed(b, pw + 0.01);
      if (h < bh) { bh = h; best = [b.pu, b.pv]; }
    }
    if (!best) { b.pu = pu; b.pv = pv; b.pw = pw; return; }
    [b.pu, b.pv] = best;
  }
  b.pw = supBed(b, b.pw + 0.01);
}
function bedToWorld(pu, pv, pw) {
  const m = truck, c = Math.cos(m.h), s = Math.sin(m.h), ct = Math.cos(m.tilt), st = Math.sin(m.tilt);
  const u = BED_HU + pu * ct - pw * st, w = BED_HW + pu * st + pw * ct;
  return [m.x + u * c - pv * s, m.y + u * s + pv * c, w];
}

/* ---------- boulders and the crusher hopper ---------- */
function inHopper(x, y, z) {
  if (z > 2.7 || z < 0.9) return false;
  const c = Math.cos(CR.h), s = Math.sin(CR.h), dx = x - CR.x, dy = y - CR.y, u = dx * c + dy * s, v = -dx * s + dy * c;
  return u > -3.0 && u < -1.1 && Math.abs(v) < 1.02;
}
function crushRock() {
  CR.burst += 45; CR.shake = 1; crunch();
  const hp = crLocal(-2.1, 0, 2.0);
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * 6.283, sp = 0.3 + Math.random() * 0.8;
    sparks.push({ x: hp[0], y: hp[1], z: 2.0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.8 + Math.random() * 1.4, life: 0.9 + Math.random() * 0.7, c: 4 + (i & 1) });
  }
}
