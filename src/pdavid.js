/* ================= DAVID BROWN: traktori, pyörivä nosturi ja halkosäkit (Mikkolan talvi) ================= */
// Nosturi on katolla ja osoittaa aluksi taakse. Se laskeutuu aina saman matkan (DC.R) päähän navasta, joten tartuntakohta on helppo osua:
// ajetaan säkin kohdalle, lasketaan nosturi alas -> "kiinni"-ääni ja säkki tarttuu. Ylös nostettaessa säkki nousee ilmaan ja tornia voi kääntää 360°.
// Jos ajetaan tai käännetään nosturi alhaalla, säkki irtoaa ("irti"-ääni) ja jää paikalleen.
const DC = { PV: -0.65, ROOF: 2.38, PH: 3.0, LA: 2.2, LB: 2.6, R: 3.2, WUP: 3.6, WDN: 1.95, BH: 1.3, BW: 1.0 };   // navan paikka (u), katto, navan korkeus, puomit, ulottuma, jaa-korkeudet (ylhäällä/alhaalla), säkin koko
const DCOL = { MAR: [128, 30, 30], MARD: [92, 20, 22], CRM: [248, 247, 242], CRML: [255, 255, 252], YEL: [240, 180, 28], YELD: [204, 144, 18], RIMY: [214, 166, 50], RD: [204, 40, 34],
  BAG: [236, 235, 228], BAGG: [150, 150, 154], MESH: [60, 186, 112], WOOD: [208, 190, 124], LOOP: [58, 58, 64] };
const START_D = { x: 64.0, y: 79.4, h: Math.PI };                     // Ladon sisällä, nokka länsiaukkoa (pohjoiseen kartalla) kohti
const BAG_START = [[51.55, 88.15], [47.15, 91.55], [53.75, 95.45]];          // kolme halkosäkkiä aukealla Ladon edessä
const DRY_X0 = gX(-21), DRY_X1 = gX(28), DRY_Y0 = gY(522);             // Kuivaajan sisäpuoli (x:n väli ja takaseinän ulkoreuna)
const DSLOT = [-1, 0, 1].map(i => ({ x: (DRY_X0 + DRY_X1) / 2 + i * 1.75, y: DRY_Y0 + 0.38 + 1.1, hw: 0.85, hd: 1.1 }));   // kolme paikkaa seinän vieressä (vastapäätä ovea)
const DRY_C = [(DRY_X0 + DRY_X1) / 2, DRY_Y0 + 1.5];                   // alueen keskipiste (nuolen kohde)
let BAGS = [];

function davidReset() {
  resetMachine(david, START_D);
  Object.assign(david, { swing: 0, cs: 0, cz: 0, grip: 1, held: null, lock: false, smk: 0 });
  BAGS = BAG_START.map(([x, y]) => ({ x, y, z: 0 }));
  DV.cel = false;
}
const DV = { cel: false, pulse: 0 };

function craneTip(D) {                                                  // tartuntakohta maassa (x, y) ja nosturin suunta
  const a = D.h + Math.PI + D.swing, px = D.x + DC.PV * Math.cos(D.h), py = D.y + DC.PV * Math.sin(D.h);
  return { x: px + Math.cos(a) * DC.R, y: py + Math.sin(a) * DC.R, a, px, py };
}
function armPts(x, y, h, sw) {                                          // nosturin pisteet maassa (pivotista kärkeen)
  const a = h + Math.PI + sw, px = x + DC.PV * Math.cos(h), py = y + DC.PV * Math.sin(h), pts = [[x, y]];
  for (let r = 0.6; r <= DC.R + 0.01; r += 0.55) pts.push([px + Math.cos(a) * r, py + Math.sin(a) * r]);
  return pts;
}
function armHits(x, y, h, sw) {                                         // nosturi osuu seinään (oviaukon ulkopuolella)
  for (const [qx, qy] of armPts(x, y, h, sw)) for (const o of SNOW_OBST) if (o.tall && hits({ x: qx, y: qy, h: 0, rect: [-0.3, 0.3, 0.3] }, o)) return true;
  return false;
}
function inDoorway(x, y, h, sw) {                                       // nosturi (tai kone) on oviaukon kohdalla: nosturi painuu alas
  for (const [qx, qy] of armPts(x, y, h, sw)) for (const d of DOORS) {
    const u = d.horiz ? qx : qy, w = d.horiz ? qy : qx;
    if (u > d.a0 - 0.3 && u < d.a1 + 0.3 && Math.abs(w - d.plane) < 1.0) return true;
  }
  return false;
}
function craneGeo(cz) {                                                 // kaksiniveinen puomi: ylhäällä (cz 0) ... alhaalla (cz 1), vaakaetäisyys aina DC.R
  const dz = DC.WUP + (DC.WDN - DC.WUP) * cz - DC.PH, d = Math.hypot(DC.R, dz);
  const al = Math.acos(Math.max(-1, Math.min(1, (DC.LA * DC.LA + d * d - DC.LB * DC.LB) / (2 * DC.LA * d)))), ba = Math.atan2(dz, DC.R) + al;
  return { wf: DC.PH + dz, E: [DC.LA * Math.cos(ba), DC.PH + DC.LA * Math.sin(ba)], F: [DC.R, DC.PH + dz] };
}
const bagInSlot = (b, S) => !b.held && b.z < 0.05 && Math.abs(b.x - S.x) < S.hw && Math.abs(b.y - S.y) < S.hd;
const bagDone = b => DSLOT.some(S => bagInSlot(b, S));

function updateDavid(dt) {
  const D = david, cz0 = D.cz;
  D.duck = inDoorway(D.x, D.y, D.h, D.swing);                           // oviaukossa nosturi painuu itsestään matalaksi
  D.cz = approach(D.cz, D.duck ? 1 : D.cs, 0.8 * dt);
  D.grip = approach(D.grip, D.held ? 0 : 1, 3 * dt);
  if (D.cz < 0.6) D.lock = false;
  const G = craneTip(D), cg = craneGeo(D.cz);
  if (!D.held && !D.lock && D.cz > 0.97) {                              // laskettu säkin kohdalle: tarttuu
    let best = null, bd = 0.9;
    for (const b of BAGS) { const d = Math.hypot(b.x - G.x, b.y - G.y); if (d < bd) { bd = d; best = b; } }
    if (best) { D.held = best; best.held = true; oneShot('kiinni', 0.55); }
  }
  if (D.held && D.cz > 0.9 && !D.duck && (Math.abs(D.speed) > 0.2 || D.swung)) {  // lähdettiin liikkeelle nosturi alhaalla: säkki irtoaa ja jää paikalleen
    D.held.held = false; D.held.z = 0; D.held = null; D.lock = true; oneShot('irti', 0.5);
  }
  if (D.held) { D.held.x = G.x; D.held.y = G.y; D.held.z = Math.max(0, cg.wf - DC.WDN); }
  for (let i = 0; i < BAGS.length; i++) {                               // maassa olevat säkit eivät mene päällekkäin
    const a = BAGS[i]; if (a.held) continue;
    for (let j = i + 1; j < BAGS.length; j++) {
      const b = BAGS[j]; if (b.held) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 1.05 && Math.abs(dy) < 1.05) {
        if (Math.abs(dx) > Math.abs(dy)) { const k = (1.05 - Math.abs(dx)) / 2 * Math.sign(dx || 1); a.x -= k; b.x += k; }
        else { const k = (1.05 - Math.abs(dy)) / 2 * Math.sign(dy || 1); a.y -= k; b.y += k; }
      }
    }
  }
  toolSnd('Dc', 'kauha', Math.abs(D.cz - cz0) > 1e-4, 0.5);             // nosturi ylös/alas
  toolSnd('Ds', 'linko', !!D.swung, 0.45, true);                        // tornin pyöritys: sama ääni kuin kaivurin tornilla
  // kaikki kolme paikkaa täynnä: ilotulitus (sama kuin reitin valmistuessa), sitten säkit takaisin alkuun
  if (!DV.cel && !D.held && DSLOT.every(S => BAGS.some(b => bagInSlot(b, S))) && RT.win === -1) { DV.cel = true; RT.win = 0; RT.nextRk = 0; jingle(true); }
  if (DV.cel && RT.win < 0) { DV.cel = false; BAGS = BAG_START.map(([x, y]) => ({ x, y, z: 0 })); D.held = null; D.lock = false; }
  return Math.abs(D.cz - cz0) > 1e-4 || !!D.swung;
}

/* ---------- piirto ---------- */
function buildDavid(parts) {
  const D = david, K = kit(D, parts), { W, Dv, addBox, box, plate, wheel, beacon, lamp } = K;
  const MAR = DCOL.MAR, sv = (a, b, sg) => sg > 0 ? [a, b] : [-b, -a];
  const MK = Object.create(D), FK = Object.create(D);
  MK.roll = D.roll * D.R / 0.32; FK.roll = D.roll * D.R / 0.44;          // pienemmät renkaat pyörivät nopeammin
  const KM = kit(MK, parts), KF = kit(FK, parts);
  for (const sg of [1, -1]) {
    wheel(-0.8, sg * 1.05, 0, sg, D.R, DCOL.RIMY, 0.2, 16);              // isot takarenkaat
    KM.wheel(0.5, sg * 0.88, 0, sg, 0.32, DCOL.RIMY, 0.12, 12);          // niiden edessä pienet renkaat
    KF.wheel(1.6, sg * 0.82, D.steer, sg, 0.44, DCOL.RIMY, 0.14, 14);    // eturenkaat
  }
  box(-1.3, 0.25, -0.42, 0.42, 0.42, 0.75, DCOL.MARD);                     // runko
  box(0.4, 0.6, -0.88, 0.88, 0.22, 0.36, COL.DK);                         // keskiakseli
  box(1.5, 1.7, -0.84, 0.84, 0.4, 0.54, COL.DK);                          // etuakseli
  box(0.3, 1.9, -0.38, 0.38, 0.5, 0.8, COL.DK2);                          // moottori
  box(0.25, 2.0, -0.46, 0.46, 0.62, 1.45, DCOL.CRM);                       // konepelti (kerma)
  box(0.3, 1.95, -0.38, 0.38, 1.45, 1.53, DCOL.CRML);
  box(2.0, 2.1, -0.38, 0.38, 0.82, 1.34, COL.DK2);                        // säleikkö
  for (const v of [-0.24, -0.08, 0.08, 0.24]) box(2.05, 2.12, v - 0.03, v + 0.03, 0.86, 1.3, COL.SIL, 0.02);
  lamp(2.1, 0.3, 0.9); lamp(2.1, -0.3, 0.9);
  box(2.1, 2.5, -0.75, 0.75, 0.42, 0.55, COL.DK);                         // etupuskuri / painokehys
  for (const sg of [1, -1]) box(2.1, 2.4, ...sv(0.68, 0.76, sg), 0.55, 0.95, COL.DK);
  box(-1.5, 0.1, -0.82, 0.82, 0.62, 0.8, COL.DK2);                        // hytin pohja
  box(-1.45, 0.05, -0.78, 0.78, 0.8, 1.2, MAR);
  box(-1.38, -0.02, -0.74, 0.74, 1.2, 2.25, COL.GL);                      // hytin lasit
  for (const [a, b] of [[-1.45, -1.33], [-0.07, 0.05]]) for (const sg of [1, -1]) box(a, b, ...sv(0.7, 0.78, sg), 1.2, 2.25, MAR);
  for (const sg of [1, -1]) {                                              // hytin kylki: ovi ja ikkunat
    const out = Dv(0, sg, 0); if (!vis(out)) continue;
    const polys = [], sp = (pts, col, v) => {
      const p3 = pts.map(([u, z]) => W(u, sg * v, z)); let n = cross(add3(p3[1], p3[0], -1), add3(p3[2], p3[0], -1)); if (!vis(n)) n = [-n[0], -n[1], -n[2]];
      polys.push({ pts: p3.map(P), col: lit(col, n) });
    };
    sp([[-1.45, 1.2], [0.05, 1.2], [0.05, 2.25], [-1.45, 2.25]], MAR, 0.79);
    sp([[-0.74, 0.84], [-0.7, 0.84], [-0.7, 2.25], [-0.74, 2.25]], DCOL.MARD, 0.795);
    sp([[0.0, 1.42], [-0.62, 1.42], [-0.5, 2.18], [-0.17, 2.18]], COL.GL, 0.8);
    sp([[-0.82, 1.5], [-0.82, 2.18], [-1.38, 2.18]], COL.GL, 0.8);
    sp([[-0.66, 1.26], [-0.46, 1.26], [-0.46, 1.32], [-0.66, 1.32]], DCOL.MARD, 0.8);
    parts.push({ k: depth(W(-0.7, sg * 0.79, 1.7)) + 0.1, polys });
  }
  box(-1.55, 0.1, -0.86, 0.86, 2.25, DC.ROOF, DCOL.MARD);                 // katto
  for (const sg of [1, -1]) box(-1.75, -0.1, ...sv(0.84, 1.26, sg), 1.34, 1.42, DCOL.RD, 0.05);   // punaiset siivet
  box(-1.8, -1.55, -0.6, 0.6, 0.5, 0.9, COL.DK);                          // takapainot
  const rev = D.speed < -0.03 || (active === D && keys.down && D.speed < 0.2);
  plate([W(-1.805, -0.4, 0.58), W(-1.805, -0.1, 0.58), W(-1.805, -0.25, 0.82)], rev ? [255, 70, 60] : [232, 36, 40], 0.5, Dv(-1, 0, 0));
  if (rev) lamps.push({ col: 'rgba(255,40,30,0.16)', dot: 'rgba(255,90,70,0.7)', r: 5, p: W(-1.82, -0.25, 0.68), g0: W(-1.9, -0.25, 0), g1: W(-3.8, 0.35, 0), g2: W(-3.8, -0.85, 0) });
  box(0.15, 0.35, 0.5, 0.7, 1.4, 2.32, DCOL.RD); box(0.12, 0.38, 0.47, 0.73, 2.32, 2.38, COL.DK);   // punainen pakoputki
  beacon(0.0, 0.5, DC.ROOF); lamp(0.1, 0.55, 2.3); lamp(0.1, -0.55, 2.3);

  // nosturi: kääntyvä jalusta katolla, kaksiosainen puomi, sylinterit, roikkuva tartuin
  const cg = craneGeo(D.cz), a = D.h + Math.PI + D.swing, ca = Math.cos(a), sa = Math.sin(a), piv = W(DC.PV, 0, DC.ROOF);
  const at = (r, w) => [piv[0] + ca * r, piv[1] + sa * r, w];            // (ulospäin, korkeus) -> maailma
  const RD = [ca, sa, 0], LT = [-sa, ca, 0], sc = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
  const cb = (r0, w0, r1, w1, hl, hx, col, bias = 0) => {
    const l = Math.hypot(r1 - r0, w1 - w0) || 1, dr = (r1 - r0) / l, dw = (w1 - w0) / l;
    addBox(at((r0 + r1) / 2, (w0 + w1) / 2), [ca * (r1 - r0) / 2, sa * (r1 - r0) / 2, (w1 - w0) / 2], sc(LT, hl), [ca * -dw * hx, sa * -dw * hx, dr * hx], col, bias + 0.4);
  };
  addBox(at(0, DC.ROOF + 0.14), sc(RD, 0.4), sc(LT, 0.36), [0, 0, 0.14], DCOL.YELD, 0.4);       // alusta
  addBox(at(-0.1, DC.ROOF + 0.55), sc(RD, 0.3), sc(LT, 0.26), [0, 0, 0.28], DCOL.YEL, 0.45);    // kääntyvä runko
  cb(0, DC.PH, cg.E[0], cg.E[1], 0.15, 0.18, DCOL.YEL);                                         // nostopuomi
  const jr = (k) => [cg.E[0] + (cg.F[0] - cg.E[0]) * k, cg.E[1] + (cg.F[1] - cg.E[1]) * k];
  cb(...cg.E, ...jr(0.55), 0.13, 0.15, DCOL.YEL);                                               // jatkopuomi, paksu osa
  cb(...jr(0.5), ...cg.F, 0.1, 0.11, DCOL.YELD);                                                // ohuempi pää
  addBox(at(cg.E[0], cg.E[1]), sc(RD, 0.2), sc(LT, 0.21), [0, 0, 0.2], DCOL.YEL, 0.45);        // polvi
  const c1 = [cg.E[0] * 0.5, DC.PH + (cg.E[1] - DC.PH) * 0.5 - 0.16];
  cb(-0.35, DC.ROOF + 0.5, ...c1, 0.07, 0.07, COL.CYL, 0.05);                                  // nostosylinteri
  const c2a = [cg.E[0] * 0.8, DC.PH + (cg.E[1] - DC.PH) * 0.8 + 0.15], c2b = jr(0.25);
  cb(...c2a, c2b[0], c2b[1] + 0.12, 0.05, 0.05, COL.CYL, 0.05);                                // jatkopuomin sylinteri
  const jaw = 0.52 + 0.28 * D.grip, hw = cg.F[1];
  cb(cg.F[0], hw, cg.F[0], hw - 0.42, 0.09, 0.09, COL.DK2, 0.1);                               // rotaattori
  addBox(at(cg.F[0], hw - 0.46), sc(RD, 0.28), sc(LT, jaw + 0.08), [0, 0, 0.07], DCOL.YELD, 0.5);   // tarttujan yläosa (leveys seuraa leukoja)
  for (const sg of [1, -1]) {                                                                   // leuat: auki ennen tarttumista, kiinni säkin ympärillä
    const c = at(cg.F[0], hw - 0.72);
    addBox([c[0] + LT[0] * jaw * sg, c[1] + LT[1] * jaw * sg, c[2]], sc(RD, 0.34), sc(LT, 0.045), [0, 0, 0.32], COL.SIL, 0.55);
  }
}

// halkosäkit: valkoinen kudos, vihreä verkkoikkuna ja halkoja näkyvissä, nostosilmukat päällä
function bagParts(parts) {
  const KW = kit({ x: 0, y: 0, h: 0, roll: 0 }, parts);
  for (const b of BAGS) {
    const x0 = b.x - DC.BW / 2, x1 = b.x + DC.BW / 2, y0 = b.y - DC.BW / 2, y1 = b.y + DC.BW / 2, z0 = b.z, z1 = b.z + DC.BH;
    KW.box(x0, x1, y0, y1, z0, z1, DCOL.BAG);
    const polys = [], quad = (pts, col, n) => polys.push({ pts: pts.map(P), col: lit(col, n) });
    const NY = [0, 1, 0], NX = [1, 0, 0], e = 0.004, my = y1 + e, mx = x1 + e;
    quad([[x0 + 0.1, my, z0 + 0.1], [x1 - 0.1, my, z0 + 0.1], [x1 - 0.1, my, z1 - 0.12], [x0 + 0.1, my, z1 - 0.12]], DCOL.MESH, NY);   // verkkoikkuna (itäsivu)
    for (let i = 0; i < 11; i++) {                                                                                                       // halkoja verkon takana
      const cx = x0 + 0.2 + hh(b.x * 7 + i, 3) * 0.6, cz = z0 + 0.2 + hh(i, b.y * 5) * (DC.BH - 0.5), w = 0.12 + hh(i, 9) * 0.2, t = 0.05 + hh(i, 4) * 0.04;
      const wc = hh(i, 2) < 0.5 ? DCOL.WOOD : [186, 208, 120];
      quad([[cx - w, my + e, cz - t], [cx + w, my + e, cz - t], [cx + w, my + e, cz + t], [cx - w, my + e, cz + t]], wc, NY);
    }
    quad([[mx, y0 + 0.1, z0 + 0.1], [mx, y1 - 0.1, z0 + 0.1], [mx, y1 - 0.1, z1 - 0.1], [mx, y0 + 0.1, z1 - 0.1]], DCOL.BAG, NX);       // valkoinen kudossivu (eteläsivu)
    for (const f of [0.22, 0.42, 0.62, 0.82]) quad([[mx + e, y0 + f - 0.015, z0 + 0.1], [mx + e, y0 + f + 0.015, z0 + 0.1], [mx + e, y0 + f + 0.015, z1 - 0.1], [mx + e, y0 + f - 0.015, z1 - 0.1]], DCOL.BAGG, NX);
    for (const [px, py, n] of [[x1, y0, NX], [x1, y1, NX], [x1, y1, NY], [x0, y1, NY]]) {                                                // pystysaumat (nauhat)
      const o = n === NX ? [e * 2, 0] : [0, e * 2], d = n === NX ? [0, 0.05] : [0.05, 0];
      quad([[px + o[0] - d[0], py + o[1] - d[1], z0], [px + o[0] + d[0], py + o[1] + d[1], z0], [px + o[0] + d[0], py + o[1] + d[1], z1], [px + o[0] - d[0], py + o[1] - d[1], z1]], DCOL.LOOP, n);
    }
    parts.push({ k: depth([b.x, b.y, z0 + DC.BH / 2]) + 0.5, polys });
    for (const [lx, ly] of [[x0 + 0.05, y0 + 0.05], [x1 - 0.05, y0 + 0.05], [x0 + 0.05, y1 - 0.05], [x1 - 0.05, y1 - 0.05]]) KW.box(lx - 0.05, lx + 0.05, ly - 0.05, ly + 0.05, z1, z1 + 0.26, DCOL.LOOP, 0.2);   // nostosilmukat
  }
}

// maahan piirrettävät: säkkien varjot, nosturin osumarengas, Kuivaajan paikat (vain kun David on valittuna)
function drawDavidGround() {
  ctx.fillStyle = 'rgba(30,44,90,0.3)';
  for (const b of BAGS) {
    const q = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([dx, dy]) => P([b.x + dx + 0.1 + b.z * 0.12, b.y + dy - 0.14 - b.z * 0.1, 0]));
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); ctx.fill();
  }
  if (active !== david) return;
  const D = david, G = craneTip(D);
  ctx.save(); ctx.lineJoin = 'round';
  for (const S of DSLOT) {                                              // kolme paikkaa: punainen -> vihreä kun säkki on paikallaan
    const ok = BAGS.some(b => bagInSlot(b, S)), q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => P([S.x + sx * (S.hw - 0.08), S.y + sy * (S.hd - 0.08), 0.03]));
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath();
    ctx.fillStyle = ok ? 'rgba(56,200,80,0.35)' : 'rgba(229,53,43,0.18)'; ctx.fill();
    ctx.setLineDash([7, 5]); ctx.lineDashOffset = -time * 12; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,16,22,0.5)'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = ok ? '#38c850' : '#e5352b'; ctx.stroke();
  }
  if (!D.held) {                                                        // rengas: tähän tartunta osuu; vihreä kun säkki on tarttuvissa
    const on = BAGS.some(b => Math.hypot(b.x - G.x, b.y - G.y) < 0.9);
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const an = i / 24 * 6.283, q = P([G.x + Math.cos(an) * 0.6, G.y + Math.sin(an) * 0.6, 0.03]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -time * 10; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(28,16,22,0.45)'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = on ? '#38c850' : '#fff6d8'; ctx.stroke();
  }
  ctx.restore();
}

// nuoli Davidin vierellä: ensin lähimpään säkkiin, sitten (säkki mukana) Kuivaajaan; katoaa kun perillä
function drawDavidGuide() {
  if (active !== david || RT.win >= 0) return;
  const D = david; let tx, ty, near = 4;
  if (D.held && D.cz > 0.9 && D.cs > 0.5 && !D.duck) {                     // tarttui kiinni: nuoli ylös säkin kohdalla (nosta!)
    const q = P([D.held.x, D.held.y, D.held.z + 2.3 + Math.sin(time * 7) * 0.25]);
    ctx.save(); ctx.translate(Math.round(q[0]), Math.round(q[1])); ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(-14, -2); ctx.lineTo(-6, -2); ctx.lineTo(-6, 14); ctx.lineTo(6, 14); ctx.lineTo(6, -2); ctx.lineTo(14, -2); ctx.closePath();
    ctx.lineWidth = 5; ctx.strokeStyle = '#2a2420'; ctx.stroke(); ctx.fillStyle = '#ffd866'; ctx.fill(); ctx.restore();
  }
  if (D.held) { tx = DRY_C[0]; ty = DRY_C[1]; near = 6; }
  else {
    let bd = 1e9; for (const b of BAGS) if (!bagDone(b)) { const d = Math.hypot(b.x - D.x, b.y - D.y); if (d < bd) { bd = d; tx = b.x; ty = b.y; } }
    if (bd >= 1e9) return;
  }
  if (Math.hypot(tx - D.x, ty - D.y) < near) return;
  const q0 = P([D.x, D.y, 1.6]), q1 = P([tx, ty, 1.6]);
  let dx = q1[0] - q0[0], dy = q1[1] - q0[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const r = 62 + Math.sin(time * 6) * 4, ax = q0[0] + dx * r, ay = q0[1] + dy * r - 14, an = Math.atan2(dy, dx);
  ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(an); ctx.lineJoin = 'miter';
  const pth = () => { ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, -11); ctx.lineTo(0, -5); ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.lineTo(0, 5); ctx.lineTo(0, 11); ctx.closePath(); };
  pth(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a2420'; ctx.stroke(); ctx.fillStyle = '#ffd866'; ctx.fill();
  ctx.restore();
}
