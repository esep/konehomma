/* ================= Traktorin työkalut (Mikkolan talvi): kauha, puskulevy, linko, peräkärry =================
   Edessä on joko puskulevy tai kauha (vaihto: aja keula maassa olevan työkalun renkaaseen ja paina välilyöntiä).
   Takana on linko tai peräkärry tai ei mitään (irrotus: pidä välilyöntiä pohjassa; kytkentä: peruuta renkaaseen).
   Maassa olevalla työkalulla on oranssi rengas, joka muuttuu vihreäksi kun kone on kohdalla. */
const FU = 2.3, HU = -1.9, TRL_L = 2.0, TOOL_R = 0.8, LMAX = 60, TRL_MAX = 160;
const BK_Q0 = -0.32, BK_Q1 = 0.32, BK_HW = 0.9, BK_LEN = 0.88;
const BK_COL = [70, 72, 80], BK_IN = [52, 54, 60], BK_EDGE = [156, 158, 166];            // kauha on tummanharmaa
const ARM_BKT = [{ bl: 0, bb: 0 }, { bl: 1.7, bb: 0.55 }, { bl: 4.5, bb: -1.05 }];       // kauha: alhaalla, kuljetus, kippaus
const wrapA = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const TL = {
  plate: { on: true, x: 0, y: 0, h: 0, tx: 0, ty: 0 },
  bucket: { on: false, x: 0, y: 0, h: 0, tx: 0, ty: 0 },
  blower: { on: true, x: 0, y: 0, h: 0, armed: true },
  trailer: { on: false, x: 0, y: 0, h: 0, roll: 0, tilt: 0, load: 0, armed: true, trk: 0, dumpAcc: 0 }
};
const TRL_OBST = { x: -999, y: -999, h: 0, rect: [-1.15, 1.15, 0.92] }, BLW_OBST = { x: -999, y: -999, h: 0, rect: [-3.95, -2.1, 1.2] };
SNOW_OBST.push(TRL_OBST, BLW_OBST);
const AH = { on: false, t: 0, bar: 0, shown: false, done: false };                         // välilyönnin pito (irrotus)

function toolsReset() {
  const T = tractor;
  Object.assign(T, { fr: 'plate', rr: 'blower', bb: 0, load: 0, bclr: 0, dumpAcc: 0, still: 0 });
  Object.assign(TL.plate, { on: true });
  Object.assign(TL.bucket, { on: false, x: BUCKET_START.x, y: BUCKET_START.y, h: BUCKET_START.h, tx: BUCKET_START.x, ty: BUCKET_START.y });
  Object.assign(TL.blower, { on: true, armed: true });
  Object.assign(TL.trailer, { on: false, x: TRAILER_START.x, y: TRAILER_START.y, h: TRAILER_START.h, roll: 0, tilt: 0, load: 0, armed: true, trk: 0, dumpAcc: 0 });
  AH.on = false; AH.bar = 0; rearLock = false; frontLock = false;
  T.rect[0] = -3.95; T.rect[1] = 2.3;
  syncObst();
}
function syncObst() {
  const R = TL.trailer, B = TL.blower;
  TRL_OBST.x = R.x; TRL_OBST.y = R.y; TRL_OBST.h = R.h;
  if (B.on) { BLW_OBST.x = -999; BLW_OBST.y = -999; } else { BLW_OBST.x = B.x; BLW_OBST.y = B.y; BLW_OBST.h = B.h; }
}

/* ---- paikat ---- */
const frontPt = () => [tractor.x + Math.cos(tractor.h) * FU, tractor.y + Math.sin(tractor.h) * FU];
const hitchPt = () => [tractor.x + Math.cos(tractor.h) * HU, tractor.y + Math.sin(tractor.h) * HU];
const trlHitch = () => [TL.trailer.x + Math.cos(TL.trailer.h) * TRL_L, TL.trailer.y + Math.sin(TL.trailer.h) * TRL_L];
const blwHitch = () => [TL.blower.x + Math.cos(TL.blower.h) * HU, TL.blower.y + Math.sin(TL.blower.h) * HU];
const groundFront = () => tractor.fr === 'plate' ? 'bucket' : 'plate';
const rearRef = () => {                                        // pisteen, jonka pitää osua maassa olevan työkalun renkaaseen: takana olevan työkalun päätypiste
  const T = tractor, R = TL.trailer;
  if (T.rr === 'blower') return [T.x - Math.cos(T.h) * 3.8, T.y - Math.sin(T.h) * 3.8];
  if (T.rr === 'trailer') return [R.x - Math.cos(R.h) * 1.1, R.y - Math.sin(R.h) * 1.1];
  return hitchPt();
};
let rearLock = false, frontLock = false;                                          // vaihdon jälkeen rengas on pois käytöstä kunnes ajetaan siitä pois (ettei vaihto pomppaa takaisin)
const REAR_R = 2.6, toolCenter = n => { const o = TL[n]; return n === 'blower' ? [o.x - Math.cos(o.h) * 3.0, o.y - Math.sin(o.h) * 3.0] : [o.x, o.y]; };
function ringInfo() {                                         // maassa olevat työkalut: rengas ja onko kone kohdalla (vihreä)
  const out = [], g = groundFront(), R = TL[g], F = frontPt();
  const fx = R.x + Math.cos(R.h) * 0.3, fy = R.y + Math.sin(R.h) * 0.3;               // etutyökalun rengas on työkalun ympärillä (näkyy kauhan alta)
  const df = Math.hypot(F[0] - fx, F[1] - fy);
  out.push({ n: g, x: fx, y: fy, r: 1.15, ok: !frontLock && df < 1.0, near: df < 3.2 });
  for (const n of ['blower', 'trailer']) if (!TL[n].on) { const c = toolCenter(n); out.push({ n, x: c[0], y: c[1], r: REAR_R, ok: !rearLock && Math.hypot(rearRef()[0] - c[0], rearRef()[1] - c[1]) < REAR_R, near: Math.hypot(rearRef()[0] - c[0], rearRef()[1] - c[1]) < 5.0 }); }   // takatyökalu: iso rengas työkalun päällä, ei suuntavaatimusta
  return out;
}

/* ---- tilat: yksi nappi kiertää työkalun asentoja ---- */
function cycle() {
  const T = tractor, tr = T.rr === 'trailer';
  if (T.fr === 'bucket') { const S = ARM_BKT.map(s => ({ bl: s.bl, bb: s.bb })); if (tr) S.push({ bl: 0, bb: 0, tt: 1 }); return S; }   // alas, ylös, kippaa (, kärry kallelleen)
  if (T.rr === 'blower') return [{ bl: 1, bw: 1 }, { bl: 1, bw: 0 }, { bl: 0, bw: 0 }];        // linko alas | molemmat ylös | levy alas
  if (tr) return [{ bl: 1 }, { bl: 0 }, { bl: 1, tt: 1 }];                                       // levy ylös | levy alas | kärry kallelleen
  return [{ bl: 1 }, { bl: 0 }];
}
function toolTargets(dt) {
  const T = tractor, S = cycle(), st = S[Math.min(T.state, S.length - 1)], R = TL.trailer;
  const bl0 = T.bl, bb0 = T.bb, bw0 = T.bw, tl0 = R.tilt;
  T.bl = approach(T.bl, st.bl, (T.fr === 'bucket' ? 2.0 : 1.4) * dt);                           // etutyökalun nostovarret: 0 maassa
  T.bb = approach(T.bb, st.bb || 0, 1.4 * dt);                                                  // kauhan kallistus
  T.bw = approach(T.bw, st.bw || 0, 1.4 * dt);                                                  // linko: 1 alhaalla (työssä)
  R.tilt = approach(R.tilt, T.rr === 'trailer' && st.tt ? 0.85 : 0, 0.55 * dt);                 // kärryn kippaus
  toolSnd('Tl', T.fr === 'bucket' ? 'kauha' : 'levy', T.bl !== bl0 || T.bb !== bb0, 0.5);
  toolSnd('Tw', 'linko', T.bw !== bw0 && T.rr === 'blower', 0.5);
  toolSnd('Tt', 'kauha', R.tilt !== tl0, 0.5);                                                  // kippaus kuulostaa samalta kuin kuorma-autossa
  return T.bl !== bl0 || T.bb !== bb0 || T.bw !== bw0 || R.tilt !== tl0;
}

/* ---- toiminta: tap = vaihto / asento, pito = irrotus ---- */
function actPress() { action(); }                            // yksi nappi: vaihto (rengas vihreä) tai työkalun asento
function actRelease() {}
function tractorTap() {
  const T = tractor;
  for (const r of ringInfo()) if ((r.n === 'plate' || r.n === 'bucket') && r.ok) { swapFront(); return; }
  for (const r of ringInfo()) if ((r.n === 'trailer' || r.n === 'blower') && r.ok) { swapRear(r.n); return; }
  T.state = (T.state + 1) % cycle().length;
}
function swapRear(g) {                                       // linko ja kärry vaihtavat paikkaa: takana oleva menee maassa olevan paikalle, maassa oleva kytkeytyy traktoriin
  const T = tractor, old = T.rr, G = TL[g], gc = toolCenter(g), gh = G.h;
  if (g === 'trailer') {                                       // kärry ei saa tulla kiinni seinän/kasan sisään: ei vaihtoa jos sen paikka traktorin takana on varattu
    const H = hitchPt(), body = { x: H[0] - Math.cos(T.h) * TRL_L, y: H[1] - Math.sin(T.h) * TRL_L, h: T.h, rect: [-1.25, 2.1, 1.1] };
    for (const o of SNOW_OBST) if (o !== TRL_OBST && o !== BLW_OBST && hits(body, o)) return;
  }
  if (old) {
    const O = TL[old], ob = old === 'blower' ? BLW_OBST : TRL_OBST; O.on = false; O.sl = false; O.tilt = 0; ob.h = gh;
    const put = (cx, cy) => old === 'blower' ? [cx + Math.cos(gh) * 3.0, cy + Math.sin(gh) * 3.0] : [cx, cy];
    let q = put(gc[0] - Math.cos(T.h) * 1.4, gc[1] - Math.sin(T.h) * 1.4);          // hieman kauemmas taakse, ettei se osu traktoriin kytkeytyvään työkaluun
    if (!looseFree(ob, q[0], q[1])) q = put(gc[0], gc[1]);
    O.x = q[0]; O.y = q[1]; O.h = gh; if (old === 'blower') T.rpm = 0;
  }
  if (g === 'trailer') { const H = hitchPt(); G.x = H[0] - Math.cos(T.h) * TRL_L; G.y = H[1] - Math.sin(T.h) * TRL_L; G.h = T.h; G.tilt = 0; }
  rearLock = true; T.rr = g; G.on = true; G.sl = false; T.state = 0; oneShot('kytke', 0.5); syncObst();
}
function swapFront() {
  const T = tractor, old = T.fr, nw = groundFront(), R = TL[nw], O = TL[old], c = Math.cos(T.h), s = Math.sin(T.h);
  if (old === 'bucket' && T.load > 0) {                      // kauhassa ollut lumi tippuu eteen kasaan
    const L2W = (u, v) => [T.x + u * c - v * s, T.y + u * s + v * c];
    for (let i = 0; i < T.load; i++) addBank(...L2W(2.6 + Math.random() * 0.9, (Math.random() - 0.5) * 1.6));
  }
  T.load = 0; T.pile = 0;
  R.on = true; O.on = false;
  O.x = R.x; O.y = R.y; O.h = R.h; O.tx = R.x; O.ty = R.y; frontLock = true;     // vanha työkalu jää paikoilleen (ei liu'u)
  T.fr = nw; T.state = 0; T.bb = 0;
  oneShot('vaihto', 0.5);
}

/* ---- peräkärry seuraa traktoria (vetotanko: akseli roikkuu perässä) ---- */
const trailerBody = R => ({ x: R.x, y: R.y, h: R.h, steer: 0, wheels: [[0, 0.97, 0, 0.1], [0, -0.97, 0, 0.1]] });
function trailerBlocked(x, y, h, prev) {                      // osuuko perävaunu seinään tai esteeseen jos traktori menee paikkaan (x,y,h)
  const R = TL.trailer; if (!R.on) return false;
  const body = (px, py, ph) => {
    const hx = px + Math.cos(ph) * HU, hy = py + Math.sin(ph) * HU, dx = hx - R.x, dy = hy - R.y, d = Math.hypot(dx, dy) || 1e-6;
    return { x: hx - dx / d * TRL_L, y: hy - dy / d * TRL_L, h: Math.atan2(dy, dx), rect: [-1.25, 1.2, 1.0] };
  };
  const bad = b => { for (const o of SNOW_OBST) if (o !== TRL_OBST && hits(b, o)) return true; return false; };
  return bad(body(x, y, h)) && !bad(body(prev[0], prev[1], prev[2]));
}
function trailerStep(dt) {
  const T = tractor, R = TL.trailer, H = hitchPt();
  if (frontLock) { const g = groundFront(), R2 = TL[g], F = frontPt(); if (Math.hypot(F[0] - (R2.x + Math.cos(R2.h) * 0.3), F[1] - (R2.y + Math.sin(R2.h) * 0.3)) > 2.0) frontLock = false; }
  if (rearLock) { const g = TL.blower.on ? 'trailer' : 'blower', c = toolCenter(g), q = rearRef(); if (Math.hypot(q[0] - c[0], q[1] - c[1]) > REAR_R + 0.6) rearLock = false; }
  T.still = Math.abs(T.speed) < 0.05 ? T.still + dt : 0;
  if (R.on) {
    const dx = H[0] - R.x, dy = H[1] - R.y;
    let nh = Math.atan2(dy, dx); const rel = wrapA(nh - T.h); if (Math.abs(rel) > 1.25) nh = T.h + Math.sign(rel) * 1.25;
    const ox = R.x, oy = R.y;
    R.x = H[0] - Math.cos(nh) * TRL_L; R.y = H[1] - Math.sin(nh) * TRL_L; R.h = nh;
    const mv = Math.hypot(R.x - ox, R.y - oy), fw = Math.cos(nh) * (R.x - ox) + Math.sin(nh) * (R.y - oy);
    R.roll += fw / 0.42; R.trk += mv;
    while (R.trk >= 0.12) { R.trk -= 0.12; stampSnowTracks(trailerBody(R)); }
  } else {
  }
  for (const g of [TL.blower, TL.trailer]) if (!g.on && g.sl) {                                    // pudotettu työkalu liukuu viereen
    g.x += (g.tx - g.x) * Math.min(1, dt * 5); g.y += (g.ty - g.y) * Math.min(1, dt * 5);
    if (Math.hypot(g.tx - g.x, g.ty - g.y) < 0.03) g.sl = false;
  }
  // tavallisten työkalujen siirtyminen paikalleen (vanha työkalu liukuu eteen)
  for (const g of [TL.plate, TL.bucket]) if (!g.on) { g.x += (g.tx - g.x) * Math.min(1, dt * 7); g.y += (g.ty - g.y) * Math.min(1, dt * 7); }
  syncObst();
}


/* ---- maassa olevan lingon ja kärryn työntö: traktori työntää ne edellään (ei jumita konetta) ---- */
function mtvRects(a, b) {                                      // pienin siirto jolla b pääsee irti a:sta (SAT), null jos erillään
  const A = corners(a), B = corners(b); let best = Infinity, out = null;
  const ca = [(A[0][0] + A[2][0]) / 2, (A[0][1] + A[2][1]) / 2], cb = [(B[0][0] + B[2][0]) / 2, (B[0][1] + B[2][1]) / 2];
  for (const Pp of [A, B]) for (let i = 0; i < 2; i++) {
    let ax = -(Pp[i + 1][1] - Pp[i][1]), ay = Pp[i + 1][0] - Pp[i][0]; const l = Math.hypot(ax, ay) || 1; ax /= l; ay /= l;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const d = q[0] * ax + q[1] * ay; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const q of B) { const d = q[0] * ax + q[1] * ay; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    const o = Math.min(a1 - b0, b1 - a0); if (o <= 0) return null;
    if (o < best) { best = o; const sg = ((cb[0] - ca[0]) * ax + (cb[1] - ca[1]) * ay) >= 0 ? 1 : -1; out = [ax * sg * o, ay * sg * o]; }
  }
  return out;
}
function looseFree(ob, x, y) {
  const body = { x, y, h: ob.h, rect: (ob === TRL_OBST ? [-1.25, 2.1, 1.1] : ob.rect).map((v, i) => v + (i === 0 ? -0.3 : 0.3)) };     // kärryllä tonkikin ja pyörät lasketaan mukaan
  for (const c of corners(body)) if (!inPlot(c[0], c[1])) return false;
  for (const q of SNOW_OBST) if (q !== ob && hits(body, q)) return false;
  return true;
}
function pushLoose(prev, dt) {
  const T = tractor;
  const front = T.fr === 'bucket' && T.bl > 1.0 ? 1.75 : T.rect[1];          // nostettu kauha kulkee kärryn laidan yli: vain konepelti työntää
  const bodyAt = (x, y, h) => ({ x, y, h, rect: [T.rect[0], front, T.rect[2]] });
  const now = bodyAt(T.x, T.y, T.h), old = bodyAt(prev[0], prev[1], prev[2]);
  const disp = Math.hypot(T.x - prev[0], T.y - prev[1]), allow = disp + 2 * dt;
  for (const [o, ob] of [[TL.blower, BLW_OBST], [TL.trailer, TRL_OBST]]) {
    if (o.on) continue;
    const m = mtvRects(now, ob); if (!m) continue;
    const len = Math.hypot(m[0], m[1]), k = Math.min(1, allow / len), mx = m[0] * k, my = m[1] * k;
    let ok = false;
    for (const [dx, dy] of [[mx, my], [mx, 0], [0, my]]) if (Math.hypot(dx, dy) > 1e-4 && looseFree(ob, o.x + dx, o.y + dy)) {
      o.x += dx; o.y += dy; ob.x = o.x; ob.y = o.y; ok = true;
      if (o === TL.trailer) o.roll += (dx * Math.cos(o.h) + dy * Math.sin(o.h)) / 0.42;
      break;
    }
    if (!ok) {                                                  // kärry/linko ei liiku (seinä takana): kone pysähtyy, ellei se vain ole jo sisällä ja peräänny
      const m0 = mtvRects(old, ob), l0 = m0 ? Math.hypot(m0[0], m0[1]) : 0;
      if (len > l0 + 0.001) { T.x = prev[0]; T.y = prev[1]; T.h = prev[2]; T.steer = prev[3]; T.speed = 0; return; }
    }
  }
}

/* ---- kauhan työ: kauhaisu, kippaus; kärryn kippaus ---- */
function bucketFrame(L, beta) { const G = loaderGeo(L); return { Tu: G.F[0] - 0.1, Tw: G.F[1] - 0.18, cb: Math.cos(beta), sb: Math.sin(beta) }; }
function bucketMouth() {
  const T = tractor, f = bucketFrame(T.bl, T.bb), c = Math.cos(T.h), s = Math.sin(T.h);
  const u = f.Tu + BK_LEN * f.cb - BK_Q0 * f.sb, w = f.Tw + BK_LEN * f.sb + BK_Q0 * f.cb;
  return [T.x + u * c, T.y + u * s, w];
}
function onBed(x, y, R) {
  const c = Math.cos(R.h), s = Math.sin(R.h), dx = x - R.x, dy = y - R.y, lu = dx * c + dy * s, lv = -dx * s + dy * c;
  return Math.abs(lu) < 1.12 && Math.abs(lv) < 0.86;
}
function bedHit(f) {                                           // putoava lumi osuu kärryn lavalle: lisää kuormaa
  const R = TL.trailer;
  if (R.tilt > 0.1 || f.d || f.vz >= 0 || R.load >= TRL_MAX || f.z > 0.62 + 0.5 * R.load / TRL_MAX) return false;
  if (!onBed(f.x, f.y, R)) return false;
  R.load += 1; return true;
}
function toolWork(dt, L2W) {
  const T = tractor, R = TL.trailer, c = Math.cos(T.h), s = Math.sin(T.h);
  T.rect[0] = T.rr === 'blower' ? -3.95 : -1.75; T.rect[1] = T.fr === 'bucket' ? 2.9 : 2.3;
  if (T.fr === 'bucket' && T.bl < 0.15 && Math.abs(T.bb) < 0.12 && T.speed > 0.05 && T.load < LMAX) {   // kauha maassa: kauhaisee lunta ajaessa
    T.bclr += T.speed * dt;
    while (T.bclr >= 0.1) {
      T.bclr -= 0.1;
      const had = [-0.6, 0, 0.6].some(v => snowAt(...L2W(3.3, v)));
      snowCut(T.x, T.y, T.h, 2.4, 3.1, -BK_HW, BK_HW, 0);
      clearBanks(T.x, T.y, T.h, 2.4, 3.1, -BK_HW, BK_HW);
      if (had) T.load = Math.min(LMAX, T.load + 1.4);
    }
  } else T.bclr = 0;
  if (T.fr === 'bucket' && T.bb < -0.55 && T.load > 0) {       // kauha kallellaan: lumi putoaa
    T.dumpAcc += 55 * dt;
    while (T.dumpAcc >= 1 && T.load > 0 && flakes.length < 420) {
      T.dumpAcc -= 1; T.load = Math.max(0, T.load - 1);
      const m = bucketMouth(), v = (Math.random() - 0.5) * 1.4, sp = 1.0 + Math.random() * 0.9, a = T.h + (Math.random() - 0.5) * 0.3;
      flakes.push({ x: m[0] + c * 0.25 - s * v, y: m[1] + s * 0.25 + c * v, z: m[2], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0, d: false, c: Math.random() < 0.5 });
    }
    if (T.load < 0.5) T.load = 0;
  } else T.dumpAcc = 0;
  if (R.tilt > 0.35 && R.load > 0) {                           // kärry kallellaan: lumi liukuu perälaudan yli maahan
    R.dumpAcc += 60 * dt;
    const rc = Math.cos(R.h), rs = Math.sin(R.h);
    while (R.dumpAcc >= 1 && R.load > 0 && flakes.length < 420) {
      R.dumpAcc -= 1; R.load -= 1;
      const v = (Math.random() - 0.5) * 1.4, sp = 0.8 + Math.random() * 0.8;
      flakes.push({ x: R.x - rc * 1.3 - rs * v, y: R.y - rs * 1.3 + rc * v, z: 0.6, vx: -rc * sp, vy: -rs * sp, vz: 0, d: false, c: Math.random() < 0.5 });
    }
  } else R.dumpAcc = 0;
}
function toolStep(dt) {
  trailerStep(dt);
}

/* ---- piirto: kauha, levy, linko ja kärry ---- */
function frontToolParts(K, parts, kind, L, beta, load, pile) {
  const { W, box, plate } = K, G = loaderGeo(L);
  if (kind === 'plate') {
    const pz = Math.max(0, G.F[1] - 0.5), pu = G.F[0] - 0.1;
    box(pu - 0.12, pu, -0.65, 0.65, pz + 0.3, pz + 0.38, COL.LDR);
    box(pu, pu + 0.08, -1.0, 1.0, pz + 0.05, pz + 0.6, COL.BLW);    // push plate
    box(pu + 0.04, pu + 0.14, -1.0, 1.0, pz, pz + 0.07, COL.SIL, 0.02);   // cutting edge
    if (pile > 0) {                                                 // snow piled up in front of the plate
      const n = Math.floor(pile);
      for (let i = 0; i < n; i++) {
        const v = (hh(i, 1) - 0.5) * 1.9, u = pu + 0.18 + hh(i, 2) * (0.15 + n * 0.01), z = 0.12 + Math.max(0, 1 - Math.abs(v) / 1.0) * (0.05 + n * 0.008) * (0.5 + hh(i, 4)) * (1 - (u - pu) / 1.0);
        const p = W(u, v, Math.min(0.95, z));
        parts.push({ k: depth(p) + 0.1, sb: p });
      }
    }
    return;
  }
  const f = bucketFrame(L, beta), B = (p, q, v) => W(f.Tu + p * f.cb - q * f.sb, v, f.Tw + p * f.sb + q * f.cb), hw = BK_HW, q0 = BK_Q0, q1 = BK_Q1;
  const k0 = parts.length;
  box(f.Tu - 0.14, f.Tu + 0.02, -0.5, 0.5, f.Tw - 0.12, f.Tw + 0.16, COL.LDR);               // kiinnitys varren päähän
  plate([B(0, q0, -hw), B(0, q0, hw), B(0, q1, hw), B(0, q1, -hw)], BK_COL);                   // takalevy
  plate([B(0, q0, -hw), B(0, q0, hw), B(BK_LEN - 0.08, q0, hw), B(BK_LEN - 0.08, q0, -hw)], BK_IN, -0.02);   // pohja
  plate([B(BK_LEN - 0.14, q0 - 0.01, -hw), B(BK_LEN - 0.14, q0 - 0.01, hw), B(BK_LEN, q0 - 0.03, hw), B(BK_LEN, q0 - 0.03, -hw)], BK_EDGE, -0.01);   // terä
  for (const sg of [1, -1]) plate([B(0, q0, sg * hw), B(BK_LEN - 0.08, q0, sg * hw), B(0.6, -0.02, sg * hw), B(0, q1, sg * hw)], BK_COL, 0.02);   // sivulevyt
  const nb = parts.length;
  if (load > 0) {                                                 // lumikasa kauhassa: näkyy vain lähemmän laidan takaa, ei sen läpi
    const n = Math.ceil(load / 0.9), fr = Math.min(1, load / LMAX), sk = parts.slice(nb - 2).map(p => p.k), kb = Math.min(...sk) + 0.6 * (Math.max(...sk) - Math.min(...sk));
    for (let i = 0; i < n; i++) {
      const v = (hh(i, 11) - 0.5) * 1.6, p = 0.06 + hh(i, 12) * 0.68, q = q0 + 0.08 + Math.max(0, 1 - Math.abs(v) / 0.9) * (0.14 + 0.5 * fr) * (0.4 + 0.6 * hh(i, 13));
      parts.push({ k: kb + hh(i, 14) * 0.01, sb: B(p, q, v) });
    }
  }
  for (let i = k0; i < parts.length; i++) parts[i].bk = 1;       // kauhan osat: nousevat kärryn laidan yli
}
function blowerParts(K, bw, chute) {                              // rear blower: delta/V opening forwards, apex at the back where the chute is
  const { W, Dv, addBox, box, beam } = K, BLF = (1 - bw) * 0.9;     // raised blower: the whole rear unit lifts
  for (const sg of [1, -1]) beam([-1.55, sg * 0.45, 0.6], [-2.4, sg * 0.95, 0.55 + BLF], 0.05, 0.07, COL.CH);
  box(-3.95, -3.3, -0.4, 0.4, 0.15 + BLF, 0.9 + BLF, COL.BLW);
  for (const sg of [1, -1]) {
    const du = 0.707, dv = sg * 0.707, pu2 = -sg * 0.707, pv2 = 0.707;   // wing direction (apex to tip) and across-wing direction
    addBox(W(-3.1, sg * 0.65, 0.53 + BLF), Dv(du * 0.92, dv * 0.92, 0), Dv(pu2 * 0.3, pv2 * 0.3, 0), [0, 0, 0.38], COL.BLW);
    addBox(W(-2.45, sg * 1.3, 0.5 + BLF), Dv(du * 0.04, dv * 0.04, 0), Dv(pu2 * 0.32, pv2 * 0.32, 0), [0, 0, 0.4], COL.BLW2, 0.02);
  }
  // chute: turntable, tube, elbow pointing the way the snow is thrown, deflector cap
  const a = chute, ca = Math.cos(a), sa = Math.sin(a);
  box(-3.85, -3.25, -0.3, 0.3, 0.9 + BLF, 1.0 + BLF, COL.BLW2);
  box(-3.7, -3.4, -0.15, 0.15, 1.0 + BLF, 1.28 + BLF, COL.BLW);
  addBox(W(CH_U + ca * 0.34, sa * 0.34, 1.26 + BLF), Dv(ca * 0.36, sa * 0.36, 0), Dv(-sa * 0.17, ca * 0.17, 0), [0, 0, 0.14], COL.BLW, 0.02);
  addBox(W(CH_U + ca * 0.72, sa * 0.72, 1.32 + BLF), Dv(ca * 0.1, sa * 0.1, 0), Dv(-sa * 0.21, ca * 0.21, 0), [0, 0, 0.1], COL.BLW2, 0.03);
}
function trailerParts(K, parts, R, hitched) {
  const { W, Dv, addBox, box, wheel } = K, OR = [226, 112, 36], OD = [176, 80, 24], DKG = [60, 60, 64];
  const ct = Math.cos(R.tilt), st = Math.sin(R.tilt), PU = -1.1, PW = 0.5;       // lava kääntyy takareunan ympäri
  const BW = (pu, pv, pw) => W(PU + pu * ct - pw * st, pv, PW + pu * st + pw * ct);
  const U = Dv(ct, 0, st), V = Dv(0, 1, 0), Wd = Dv(-st, 0, ct);
  const bb = (pu, pv, pw, hu, hv, hw, col, bias) => addBox(BW(pu, pv, pw), U.map(x => x * hu), V.map(x => x * hv), Wd.map(x => x * hw), col, bias);
  wheel(0, 0.97, 0, 1, 0.42, COL.CYL, 0.1, 14); wheel(0, -0.97, 0, -1, 0.42, COL.CYL, 0.1, 14);
  box(-0.9, 0.9, -0.8, 0.8, 0.42, 0.5, DKG);                                      // alusta
  box(1.1, TRL_L, -0.07, 0.07, 0.47, 0.57, DKG);                                  // vetotanko
  if (!hitched) box(TRL_L - 0.12, TRL_L + 0.06, -0.1, 0.1, 0.2, 0.47, DKG);     // pieni tuki jalka maassa
  else box(TRL_L - 0.1, TRL_L + 0.05, -0.1, 0.1, 0.47, 0.6, COL.CYL);           // kytketty: kiinnike
  bb(1.1, 0, 0.06, 1.1, 0.86, 0.06, OD, -0.05);                                   // lattia
  bb(1.1, 0.8, 0.37, 1.1, 0.05, 0.25, OR);                                        // reunat
  bb(1.1, -0.8, 0.37, 1.1, 0.05, 0.25, OR);
  bb(2.15, 0, 0.37, 0.05, 0.86, 0.25, OR);                                        // etulauta
  {                                                                                // perälauta: saranat pohjassa, aukeaa kippauksessa taakse
    const a = Math.min(1, Math.max(0, (R.tilt - 0.1) / 0.25)) * 1.45, ca = Math.cos(a), sa = Math.sin(a);
    const BV = (x, z, k) => Dv((x * ct - z * st) * k, 0, (x * st + z * ct) * k);
    addBox(BW(0.05 - 0.25 * sa, 0, 0.12 + 0.25 * ca), BV(ca, sa, 0.05), V.map(x => x * 0.86), BV(-sa, ca, 0.25), OR, 0.02);
    bb(0.05, 0.86, 0.14, 0.04, 0.03, 0.04, OD, 0.03); bb(0.05, -0.86, 0.14, 0.04, 0.03, 0.04, OD, 0.03);   // saranat
  }
  bb(1.1, 0.86, 0.66, 1.12, 0.03, 0.03, OD, 0.03); bb(1.1, -0.86, 0.66, 1.12, 0.03, 0.03, OD, 0.03);
  const fr = Math.min(1, R.load / TRL_MAX);
  bb(1.1, 0, 0.12 + (0.04 + 0.5 * fr) / 2 + 0.01, 1.0, 0.76, (0.04 + 0.5 * fr) / 2, [238, 243, 250], 0.04);   // lumi lavalla (tyhjänä ohut kerros)
}

/* ---- maassa olevat työkalut ja kärry (piirretään traktorin jälkeen) ---- */
function toolParts(parts) {
  const T = tractor, mk = (x, y, h) => ({ x, y, h, roll: 0, steer: 0, speed: 0, R: 0.62 });
  for (const n of ['plate', 'bucket']) {
    const g = TL[n]; if (g.on) continue;
    const base = mk(g.x - Math.cos(g.h) * FU, g.y - Math.sin(g.h) * FU, g.h), K = kit(base, parts);
    frontToolParts(K, parts, n, 0, n === 'bucket' ? 0.08 : 0, 0, 0);
  }
  if (!TL.blower.on) { const B = TL.blower, K = kit(mk(B.x, B.y, B.h), parts); blowerParts(K, 1, T.chute); }
  const R = TL.trailer, t0 = parts.length; trailerParts(kit(Object.assign(mk(R.x, R.y, R.h), { roll: R.roll }), parts), parts, R, R.on);
  if (T.fr === 'bucket' && T.bl > 1.0 && onBed(...bucketMouth(), R)) {      // nostettu kauha kärryn päällä piirretään kärryn edelle
    const kt = Math.max(...parts.slice(t0).map(p => p.k)), bks = parts.filter(p => p.bk), d = kt + 0.05 - Math.min(...bks.map(p => p.k));
    if (d > 0) for (const p of bks) p.k += d;
  }
}
function drawRing(x, y, ok, r = TOOL_R * 0.8) {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.beginPath(); for (let i = 0; i <= 28; i++) { const an = i / 28 * 6.283, q = P([x + Math.cos(an) * r, y + Math.sin(an) * r, 0.03]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  if (ok) { ctx.fillStyle = 'rgba(56,200,80,0.28)'; ctx.fill(); }
  ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 10; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,16,22,0.45)'; ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = ok ? '#38c850' : '#ff9a2e'; ctx.stroke();
  ctx.restore();
}
function drawToolsGround() {                                      // varjot ja renkaat maahan (lumen päälle, koneiden alle)
  const T = tractor;
  ctx.fillStyle = 'rgba(30,44,90,0.3)';
  drawShadow(T, T.rect[0], T.rect[1], 1.3);
  for (const n of ['plate', 'bucket']) { const g = TL[n]; if (!g.on) drawShadow({ x: g.x, y: g.y, h: g.h }, -0.1, n === 'bucket' ? 0.95 : 0.2, n === 'bucket' ? 0.9 : 1.0); }
  if (!TL.blower.on) drawShadow(TL.blower, -3.95, -1.6, 1.3);
  drawShadow(TL.trailer, -1.2, 2.0, 0.95);
  if (scene === 'snow' && active === T) for (const r of ringInfo()) if (r.ok || r.near) drawRing(r.x, r.y, r.ok, r.r);
}
function drawHoldBar() {
  if (!(AH.bar > 0) || active !== tractor) return;
  const T = tractor, q = P([T.x, T.y, T.top + 1.7]), w = 64, h = 9, x = Math.round(q[0] - w / 2), y = Math.round(q[1] - h / 2);
  ctx.fillStyle = 'rgba(42,36,32,0.9)'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#fff6d8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff9a2e'; ctx.fillRect(x, y, Math.round(w * AH.bar), h);
  ctx.font = 'bold 11px "Pixelify Sans", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(42,36,32,0.9)'; ctx.fillStyle = '#fff6d8';
  ctx.strokeText('irroitus', q[0], y - 6); ctx.fillText('irroitus', q[0], y - 6); ctx.textAlign = 'left';
}

/* ---- joen solina: silmukka, kovempi kun lähestyy vettä (vain Mikkolan talvi) ---- */
let riverSrc = null, riverG = null, riverV = 0;
function riverStep(dt) {
  if (!AC || !TB.joki) return;
  if (!riverSrc) {
    riverSrc = AC.createBufferSource(); riverSrc.buffer = TB.joki; riverSrc.loop = true;
    riverG = AC.createGain(); riverG.gain.value = 0; riverSrc.connect(riverG).connect(master); riverSrc.start(AC.currentTime, Math.random() * 10);
  }
  let target = 0;
  if (scene === 'snow') {
    const d = Math.max(0, riverEdge(active.y) - active.x), k = Math.max(0, 1 - d / 32);
    target = 0.012 + 0.2 * k * k;
  }
  riverV += (target - riverV) * Math.min(1, dt * 2);
  riverG.gain.setTargetAtTime(riverV, AC.currentTime, 0.05);
}
