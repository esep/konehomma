/* ================= KETTU: kävelee Mikkolan talvessa ja jättää jalanjäljet lumeen (kokeilu) ================= */
// Kun traktori lähtee hallista, kettu tulee kuvan koillisnurkasta, pysähtyy Hallin nurkalle ja kävelee siitä Talon luo.
// Se pysyttelee kaukana traktorista (jos traktori tulee lähelle, kettu hölkkää pois päin) mutta jää välillä näkyviin,
// ja lopulta se menee kauemmas ja poistuu ruudusta. Jäljet haalenevat lumessa parissakymmenessä sekunnissa.
// Kaikki on pelin yksiköissä (x = lounaaseen, y = itään); reitti on piirretty käsin rakennusten, puiden ja Kuivaajan välistä.
const FOXC = { WALK: 1.8, TROT: 3.2, ENTER: 2.4, SHY: 8, NEAR: 12, FAR: 24, STEP: 0.55, LIFE: 14, FADE: 5 };
const FOX = { st: 'wait', x: 0, y: 0, h: 0, face: 1, ph: 0, t: 0, wi: 0, wp: [], stride: 0, side: 1, mv: 0, pause: 0, waitT: 0, flee: false, idle: 0, nextAt: 30, fleeT: 0, sniff: 0, stuck: 0, sx: 0, sy: 0 };
const FOXPR = [];                                           // jalanjäljet: { x, y, h, a (ikä, s) }

function foxReset() { FOX.st = 'wait'; FOXPR.length = 0; }
function foxPath() {                                        // Hallin koillisnurkka -> Talo; viimeinen luku = tauko pisteessä (s)
  const H = HB[0];
  return [[H.x0 - 1.5, H.y1 + 1.2, 0], [H.x0 - 2.3, 68, 0], [H.x0 - 2.1, 56.5, 1.4], [38, 54.5, 0], [53, 51, 1.6], [58, 44, 0], [66, 44.5, 0], [70.5, 46, 0]];
}
const FOX_EXIT = [[64, 40, 0], [63.5, 27, 0], [63.5, -8, 0]];   // Talolta länteen metsän väliin ja pois kartalta

function foxFree(x, y) {
  for (const f of footU) if (x > f[0] - 0.9 && x < f[2] + 0.9 && y > f[1] - 0.9 && y < f[3] + 0.9) return false;
  for (const o of SNOW_OBST) {                              // seinät, puut ja kivet: suorakaide kääntyneenä suuntaan o.h (kuten traktorin törmäys)
    const c = Math.cos(o.h || 0), s = Math.sin(o.h || 0), u = (x - o.x) * c + (y - o.y) * s, v = -(x - o.x) * s + (y - o.y) * c;
    if (u > o.rect[0] - 0.6 && u < o.rect[1] + 0.6 && Math.abs(v) < o.rect[2] + 0.6) return false;
  }
  return true;
}
function foxMove(dx, dy) {                                  // liukuu esteen reunaa pitkin
  const F = FOX, nx = F.x + dx, ny = F.y + dy;
  if (foxFree(nx, ny)) { F.x = nx; F.y = ny; return true; }
  if (foxFree(nx, F.y)) { F.x = nx; return true; }
  if (foxFree(F.x, ny)) { F.y = ny; return true; }
  return false;
}
function foxSpawn() {                                       // kuvan oikea yläkulma (koillinen) kartan koordinaateissa
  const F = FOX, u = (IW + 14 - OX - GW / 2) / (TW / 2), v = (-14 - OY) / (TH / 2);
  const p = foxPath()[0];
  F.x = Math.max(1.5, (v - u) / 2); F.y = (v + u) / 2;
  F.h = Math.atan2(p[1] - F.y, p[0] - F.x); F.face = Math.sin(F.h) - Math.cos(F.h) >= 0 ? 1 : -1;
  F.st = 'enter'; F.wp = [p]; F.wi = 0; F.t = 0; F.pause = 0; F.waitT = 0; F.fleeT = 0; F.idle = 0; F.nextAt = 20 + Math.random() * 15; F.stride = 0; F.mv = 0; F.flee = false; F.stuck = 0; F.sx = F.x; F.sy = F.y;
}
function foxGo(st, wp) { const F = FOX; F.st = st; F.wp = wp; F.wi = 0; F.t = 0; F.pause = 0; F.stuck = 0; F.sx = F.x; F.sy = F.y; }
function foxLeave() {                                       // pois ruudusta: lähin piste reitillä ja siitä Talon ohi länteen
  const F = FOX, R = foxPath().slice(1).concat(FOX_EXIT); let bi = 0, bd = 1e9;
  R.forEach((w, i) => { const dd = Math.hypot(w[0] - F.x, w[1] - F.y); if (dd < bd) { bd = dd; bi = i; } });
  foxGo('leave', R.slice(bi));
}

function foxVisit() {                                       // kettu kävelee ruudun poikki: reuna -> keskelle nuuskimaan -> toiselle reunalle
  const F = FOX, T = tractor, w = (sx, sy) => { const u = (sx - OX - GW / 2) / (TW / 2), v = (sy - OY) / (TH / 2); return [(v - u) / 2, (v + u) / 2]; };
  F.idle = 0; F.nextAt = 25 + Math.random() * 25;
  for (let k = 0; k < 300; k++) {
    const l = Math.random() < 0.5, band = () => IH * (Math.random() < 0.5 ? 0.08 + Math.random() * 0.22 : 0.7 + Math.random() * 0.22), a = w(l ? -30 : IW + 30, band()), b = w(l ? IW + 30 : -30, band());
    let ok = a[0] > 2 && a[0] < 117 && a[1] > 2 && a[1] < 117 && b[0] > 2 && b[0] < 117 && b[1] > 2 && b[1] < 117;
    for (let t = 0; ok && t <= 1; t += 0.02) { const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; if (!foxFree(x, y) || Math.hypot(x - T.x, y - T.y) < FOXC.SHY + 1) ok = false; }
    if (!ok) continue;
    F.x = a[0]; F.y = a[1]; F.h = Math.atan2(b[1] - a[1], b[0] - a[0]); F.face = Math.sin(F.h) - Math.cos(F.h) >= 0 ? 1 : -1;
    F.flee = false; F.fleeT = 0; F.stride = 0; F.mv = 0;
    foxGo('leave', [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 2.5], [b[0], b[1], 0]]); return;
  }
  F.idle = F.nextAt - 4;                                    // ei sopivaa reittiä juuri nyt: yritä pian uudestaan
}

function foxStep(dt) {
  for (let i = FOXPR.length - 1; i >= 0; i--) { FOXPR[i].a += dt; if (FOXPR[i].a > FOXC.LIFE) FOXPR.splice(i, 1); }
  const F = FOX, T = tractor;
  if (F.st === 'done') { F.idle += dt; if (F.idle > F.nextAt) foxVisit(); return; }      // käy välillä kylässä
  if (F.st === 'wait') { if (T.y > HB[0].y1 + 1.0) foxSpawn(); return; }      // traktori on ajanut ulos hallista
  F.t += dt; F.sniff += dt;
  const d = Math.hypot(F.x - T.x, F.y - T.y), lv = F.st === 'leave', wp = F.wp[F.wi];
  let sp = 0, dir = null;
  if (F.st === 'sniff' || F.st === 'loiter') {              // seisoo ja nuuskii
    if (F.st === 'sniff' && F.t > 3.2) foxGo('path', foxPath().slice(1));
    else if (F.st === 'loiter' && F.t > 7) foxGo('leave', FOX_EXIT);
  } else if (wp) {
    if (F.pause > 0) F.pause -= dt;
    else {
      const tx = wp[0] - F.x, ty = wp[1] - F.y, td = Math.hypot(tx, ty) || 1;
      if (td < 0.7) {                                       // perillä: seuraava piste (tai tila vaihtuu)
        F.pause = F.st !== 'enter' ? wp[2] || 0 : 0; F.wi++;
        if (F.wi >= F.wp.length) { if (F.st === 'enter') foxGo('sniff', []); else if (F.st === 'path') foxGo('loiter', []); else { F.st = 'done'; return; } }
      } else {
        dir = [tx / td, ty / td]; sp = F.st === 'enter' ? FOXC.ENTER : FOXC.WALK;
        if (F.st === 'path' && d > FOXC.FAR && F.waitT < 20) { F.waitT += dt; sp = 0; }   // odottaa, että traktori tulee näkyviin
      }
    }
  }
  if (d < FOXC.SHY) F.flee = true;
  if (F.flee) {                                             // pelästyy: hölkkää pois traktorin luota (reitin suuntaan, jos se ei ole traktoria kohti)
    if (d > FOXC.NEAR) F.flee = false;
    else {
      const ax = (F.x - T.x) / (d || 1), ay = (F.y - T.y) / (d || 1);
      let vx = ax, vy = ay; if (dir && dir[0] * ax + dir[1] * ay > -0.3) { vx += dir[0] * 0.8; vy += dir[1] * 0.8; }
      const vl = Math.hypot(vx, vy) || 1; dir = [vx / vl, vy / vl]; sp = FOXC.TROT;
      F.fleeT += dt; if (F.fleeT > 6 && !lv) { F.fleeT = 0; F.flee = false; foxLeave(); return; }   // liikaa kiusaamista: lähtee pois
    }
  }
  if (dir && sp > 0) {
    const ox = F.x, oy = F.y, a = Math.atan2(dir[1], dir[0]);
    let dh = a - F.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    F.h += dh * Math.min(1, dt * 7);
    foxMove(Math.cos(F.h) * sp * dt, Math.sin(F.h) * sp * dt);
    if (!lv) { F.x = Math.max(1, Math.min(118, F.x)); F.y = Math.max(1, Math.min(118, F.y)); }
    const mv = Math.hypot(F.x - ox, F.y - oy);
    F.mv = mv / dt; F.ph += mv * 1.55; F.stride += mv;
    const su = Math.sin(F.h) - Math.cos(F.h); if (Math.abs(su) > 0.2) F.face = su > 0 ? 1 : -1;
    while (F.stride >= FOXC.STEP) {                         // jalanjälki: vuorotellen vasen ja oikea
      F.stride -= FOXC.STEP; F.side = -F.side;
      FOXPR.push({ x: F.x - Math.cos(F.h) * 0.5 - Math.sin(F.h) * 0.16 * F.side, y: F.y - Math.sin(F.h) * 0.5 + Math.cos(F.h) * 0.16 * F.side, h: F.h, a: 0 });
    }
    F.stuck += dt;                                          // jumissa: ohita piste tai poistu
    if (Math.hypot(F.x - F.sx, F.y - F.sy) > 0.8) { F.sx = F.x; F.sy = F.y; F.stuck = 0; }
    else if (F.stuck > 3) { F.stuck = 0; if (lv) { F.st = 'done'; return; } if (F.st === 'path' || F.st === 'enter') F.wi++; }
  } else { F.mv = 0; F.stuck = 0; F.sx = F.x; F.sy = F.y; }
  if (lv) { const q = P([F.x, F.y, 0]); if (q[0] < -70 || q[0] > IW + 70 || q[1] < -70 || q[1] > IH + 90) F.st = 'done'; }   // poissa ruudulta
}

/* ---- pikselikettu: 28x18, katsoo oikealle; vasen on peilikuva. Jalat: 4 kävelykuvaa, seisova ja nuuskiva ---- */
const FOXK = 1.5;                                           // pikselikoko suhteessa kuvasuunnitteluun (28x18)
const FOXS = (() => {
  const OR = '#e2792b', OL = '#f2983f', OD = '#b05519', WH = '#f8f2ea', BK = '#2a211d', GR = '#8a8f9c';
  function frame(ph, mode) {
    const K = FOXK, c = document.createElement('canvas'); c.width = Math.ceil(28 * K); c.height = Math.ceil(18 * K); const g = c.getContext('2d');
    const R = (x, y, w, h, col) => { const x0 = Math.round(x * K), y0 = Math.round(y * K); g.fillStyle = col; g.fillRect(x0, y0, Math.max(1, Math.round((x + w) * K) - x0), Math.max(1, Math.round((y + h) * K) - y0)); };
    const walk = mode === 'walk', hy = mode === 'sniff' ? 3 : (walk && ph % 2 ? 1 : 0), hx = mode === 'sniff' ? 1 : 0, ty = mode === 'idle' || mode === 'sniff' ? 1 : (walk && ph % 2 ? 1 : 0);
    const leg = (bx, p, col, sock) => {
      const s = walk ? Math.round(Math.sin(p * 6.283) * 2) : 0, lift = walk && Math.cos(p * 6.283) > 0.5 ? 1 : 0, x = bx + s;
      R(x, 11, 2, 2, col); R(x + (s > 0 ? 0 : 0), 13, 2, 4 - lift, sock);
      R(x, 16 - lift, 2, 1, BK);
    };
    const q = ph / 4;
    // hännän taakse, kauempi jalkapari, vartalo, lähempi jalkapari, rinta, pää
    R(4, 2 + ty, 3, 1, OL); R(2, 3 + ty, 6, 1, OR); R(1, 4 + ty, 7, 1, OR); R(0, 5 + ty, 8, 3, OR); R(1, 8 + ty, 6, 1, OD); R(3, 9 + ty, 4, 1, OD); R(0, 4 + ty, 3, 4, WH); R(1, 8 + ty, 2, 1, WH); R(3, 3 + ty, 1, 1, OL);
    leg(14, q + 0.5, OD, BK); leg(10, q, OD, BK);
    R(6, 6, 13, 5, OR); R(5, 7, 15, 3, OR); R(8, 6, 9, 1, OL); R(7, 10, 11, 1, OD); R(6, 7, 3, 1, OL);
    leg(7, q + 0.5, OR, BK); leg(17, q, OR, BK);
    R(17, 8, 3, 4, WH);
    R(18, 5 + hy, 2, 5 - hy, OR);
    R(19 + hx, 4 + hy, 6, 6, OR); R(21 + hx, 8 + hy, 4, 2, WH); R(25 + hx, 6 + hy, 3, 3, OR); R(25 + hx, 8 + hy, 2, 1, WH); R(27 + hx, 6 + hy, 1, 1, BK); R(22 + hx, 6 + hy, 1, 1, BK);
    R(19 + hx, 1 + hy, 2, 3, OR); R(23 + hx, 1 + hy, 2, 3, OR); R(19 + hx, 1 + hy, 2, 1, BK); R(23 + hx, 1 + hy, 2, 1, BK);
    return c;
  }
  const flip = c => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  const R = [frame(0, 'walk'), frame(1, 'walk'), frame(2, 'walk'), frame(3, 'walk'), frame(0, 'idle'), frame(0, 'sniff')];
  return [R.map(flip), R];                                  // [0] vasen, [1] oikea
})();
function foxSprite() {
  const F = FOX, side = FOXS[F.face > 0 ? 1 : 0];
  if (F.mv > 0.05) return side[Math.floor(F.ph) % 4 | 0];
  return side[Math.floor(F.sniff * 1.1) % 2 ? 5 : 4];
}
function foxParts(parts) {                                  // kettu lajiteltuna rakennusten ja puiden kanssa
  const F = FOX; if (F.st === 'wait' || F.st === 'done') return;
  const q = P([F.x, F.y, 0]); if (q[0] < -40 || q[0] > IW + 40 || q[1] < -40 || q[1] > IH + 60) return;
  parts.push({ k: depth([F.x, F.y, 0.3]), deco: { p: [F.x, F.y], spr: foxSprite(), ax: Math.round(14 * FOXK), ay: Math.round(17 * FOXK), sc: 1 } });
}
function foxGhost() {                                      // rakennuksen takana: kettu näkyy läpi himmeänä (kuten traktori)
  const F = FOX; if (F.st === 'wait' || F.st === 'done') return;
  if (!HB.some(b => occByB(b, F.x, F.y, 0.5) || occByB(b, F.x, F.y, 1.3))) return;      // (ei a-ehtoa: Hallin taka-seinä on aina paikallaan)
  const q = P([F.x, F.y, 0]); ctx.globalAlpha = 0.7; ctx.drawImage(foxSprite(), q[0] - Math.round(14 * FOXK), q[1] - Math.round(17 * FOXK)); ctx.globalAlpha = 1;
}
/* tassunjälki 5x4 pikseliä: varpaat edellä; kuvasta neljä suuntaa (ylös, alas, oikealle, vasemmalle) näkyvän kulkusuunnan mukaan */
const PAWS = (() => {
  const up = ['.a.a.', 'a...a', '.aaa.', '.aaa.'], rot = (m, cw) => m[0].split('').map((_, x) => m.map((r, y) => cw ? m[m.length - 1 - y][x] : m[y][m[0].length - 1 - x]).join(''));
  const mk = (m, col) => { const c = document.createElement('canvas'); c.width = m[0].length; c.height = m.length; const g = c.getContext('2d'); g.fillStyle = col;
    m.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'a') g.fillRect(x, y, 1, 1); })); return c; };
  const dirs = [up, up.slice().reverse(), rot(up, true), rot(up, false)];       // 0 ylös, 1 alas, 2 oikealle, 3 vasemmalle
  return { dent: dirs.map(m => mk(m, '#7d8fb8')), rim: dirs.map(m => mk(m, '#ffffff')) };
})();
function drawFoxGround() {                                  // jalanjäljet ja varjo lumen päällä
  for (const p of FOXPR) {
    const f = p.a < FOXC.LIFE - FOXC.FADE ? 1 : Math.max(0, (FOXC.LIFE - p.a) / FOXC.FADE), q = P([p.x, p.y, 0]);
    const sx = Math.sin(p.h) - Math.cos(p.h), sy = (Math.cos(p.h) + Math.sin(p.h)) * 0.5, k = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 2 : 3) : (sy > 0 ? 1 : 0);
    const w = PAWS.dent[k].width, h = PAWS.dent[k].height;
    ctx.globalAlpha = 0.6 * f; ctx.drawImage(PAWS.rim[k], q[0] - (w >> 1) + 1, q[1] - (h >> 1) + 1);   // reunan kohokohta
    ctx.globalAlpha = 0.9 * f; ctx.drawImage(PAWS.dent[k], q[0] - (w >> 1), q[1] - (h >> 1));
  }
  ctx.globalAlpha = 1;
  const F = FOX;
  if (F.st !== 'wait' && F.st !== 'done') {
    const q = P([F.x, F.y, 0]); ctx.fillStyle = 'rgba(30,44,90,0.28)'; ctx.beginPath(); ctx.ellipse(q[0], q[1] + 1, 11 * FOXK, 4 * FOXK, 0, 0, 6.283); ctx.fill();
  }
}
