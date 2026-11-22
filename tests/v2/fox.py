"""Kettu (src/pfox.js): ajaa ketun käytöksen ilman piirtoa kolmessa tilanteessa ja tallentaa kuvat /tmp/fox_*.png.
  still: traktori seisoo hallin ovella   far: traktori on kaukana   chase: traktori jahtaa kettua
Tarkistaa, että kettu lähtee liikkeelle hallin jälkeen, ei kävele rakennusten tai puiden läpi ja poistuu ruudusta.
Aja: python3 tests/v2/fox.py   (ensin sh src/build.sh)"""
import asyncio, os, sys
from playwright.async_api import async_playwright

URL = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '../../v2/index.html'))
SIM = """(mode) => {
  const g = __game, F = g.FOX, T = g.tractor; g.FOXPR.length = 0;
  F.st = 'wait'; T.x = 33.6; T.y = 84; T.h = 1.57; T.speed = 0;
  let t = 0, minD = 1e9, bad = 0, first = null, maxPrints = 0;
  for (let i = 0; i < 6000; i++) {
    const dt = 0.05; t += dt;
    if (mode === 'chase' && F.st !== 'wait' && F.st !== 'done' && t > 8) { const dx = F.x - T.x, dy = F.y - T.y, d = Math.hypot(dx, dy) || 1; T.x += dx / d * 2.4 * dt; T.y += dy / d * 2.4 * dt; }
    if (mode === 'far') { T.x = 60; T.y = 100; }
    g.foxStep(dt);
    if (F.st !== 'wait' && F.st !== 'done') {
      if (first === null) first = t;
      if (!g.foxFree(F.x, F.y) && F.st !== 'enter' && F.st !== 'leave') bad++;
      minD = Math.min(minD, Math.hypot(F.x - T.x, F.y - T.y)); maxPrints = Math.max(maxPrints, g.FOXPR.length);
    }
    if (F.st === 'done') {
      let visits = 0, vbad = 0, prev = 'done';                  // kyläily: kettu palaa ruutuun ja poistuu taas
      for (let j = 0; j < 4000; j++) { g.foxStep(0.05); if (F.st === 'leave' && prev === 'done') visits++; if (F.st === 'leave' && !g.foxFree(F.x, F.y) && Math.hypot(F.x - T.x, F.y - T.y) > 0 && F.x > 2 && F.x < 117 && F.y > 2 && F.y < 117) vbad++; prev = F.st; }
      return { t, first, bad, minD, maxPrints, done: true, visits, vbad };
    }
  }
  return { t, first, bad, minD, maxPrints, done: false, st: F.st };
}"""

async def main():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width': 853, 'height': 664}, device_scale_factor=2)).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(1500)
        for mode in ['still', 'far', 'chase']:
            r = await pg.evaluate(SIM, mode); print(mode, r)
            if not r['done']: fails.append(mode + ': kettu ei poistunut (tila ' + str(r.get('st')) + ')')
            if r['bad']: fails.append(mode + ': kettu oli esteen sisällä %d askelta' % r['bad'])
            if mode == 'still' and r.get('visits', 0) < 2: fails.append('still: kettu ei käynyt uudestaan (%s)' % r.get('visits'))
            if r.get('vbad'): fails.append(mode + ': kyläilevä kettu esteen sisällä')
            if r['first'] is None: fails.append(mode + ': kettu ei ilmestynyt')
        # kuvat: kettu tulee kuvaan, kun traktori ajaa ulos hallista (oikeassa ajassa)
        await pg.evaluate("__game.FOX.st = 'wait'; __game.FOXPR.length = 0"); await pg.keyboard.down('ArrowUp'); await pg.wait_for_timeout(3400); await pg.keyboard.up('ArrowUp')
        for i, w in enumerate([2500, 4000, 5000]):
            await pg.wait_for_timeout(w); await pg.screenshot(path=f'/tmp/fox_{i}.png')
            print(i, await pg.evaluate("(()=>{const f=__game.FOX;return [f.st,+f.x.toFixed(1),+f.y.toFixed(1),__game.FOXPR.length]})()"))
        if errs: fails.append('sivuvirheet: ' + '; '.join(errs))
        await b.close()
    print('VIRHEET:' if fails else 'OK', *fails, sep='\n')
    sys.exit(1 if fails else 0)
asyncio.run(main())
