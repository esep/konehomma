# Testaa Mikkolan talven reitti: punainen -> vihreä, palkki, ilotulitus + peukku, uusi kierros.
# Käyttö: python3 tests/v2/route.py [v2/index.html:n polku] ; kuvat /tmp/rt_*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
PATH = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/konehomma/v2/index.html'
AUTO = """
window.__auto = {i:0, pts:null, run:false};
window.__auto.start = (step) => {
  const L = __game.RT.lines, pts = [];
  for (const s of L) for (const p of s) pts.push([p.x, p.y]);
  const A = window.__auto; A.pts = pts; A.i = 0; A.run = true;
  const T = __game.tractor;
  const loop = () => { if (!A.run) return;
    if (A.i < pts.length) { const ii = Math.floor(A.i), p = pts[ii], q = pts[Math.min(pts.length - 1, ii + 3)];
      T.x = p[0]; T.y = p[1]; T.speed = 0; if (Math.hypot(q[0]-p[0], q[1]-p[1]) > 0.1) T.h = Math.atan2(q[1]-p[1], q[0]-p[0]); A.i += step; }
    requestAnimationFrame(loop); };
  loop();
};
window.__auto.stop = () => { window.__auto.run = false; };
"""
async def frac(pg): return await pg.evaluate("(()=>{const R=__game.RT;return [R.done,R.n,R.win,R.sparks.length]})()")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=1)).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        print('start', await frac(pg), 'bar', await pg.evaluate("document.getElementById('routefill').style.width"))
        await pg.screenshot(path='/tmp/rt_0_start.png')
        await pg.evaluate(AUTO)
        await pg.evaluate("__auto.start(1.4)")
        shots = {0.12: 'a', 0.4: 'b', 0.75: 'c'}
        todo = sorted(shots)
        while True:
            d, n, w, s = await frac(pg)
            if todo and d / n >= todo[0]:
                f = todo.pop(0); await pg.screenshot(path=f'/tmp/rt_1{shots[f]}.png'); print('shot at', round(d/n, 2), await pg.evaluate("document.getElementById('routefill').style.width"))
            if w >= 0: break
            await pg.wait_for_timeout(60)
            if (await pg.evaluate('__auto.i')) > 4000: break
        await pg.evaluate("__auto.stop()")
        print('won', await frac(pg), 'bar', await pg.evaluate("document.getElementById('routefill').style.width"))
        for k, t in enumerate([700, 1000, 1800, 2200]):
            await pg.wait_for_timeout(t); await pg.screenshot(path=f'/tmp/rt_2{k}.png'); print('fw', await frac(pg))
        await pg.wait_for_timeout(4500)
        print('still full (not reset)', await frac(pg), 'bar', await pg.evaluate("document.getElementById('routefill').style.width"))
        await pg.evaluate("(()=>{const T=__game.tractor;T.x=__game.gX(-70);T.y=__game.gY(660);T.speed=0})()"); await pg.wait_for_timeout(500)
        print('after reset', await frac(pg), 'bar', await pg.evaluate("document.getElementById('routefill').style.width"))
        await pg.screenshot(path='/tmp/rt_3_reset.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
