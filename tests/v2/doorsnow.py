# lumilinko heittää lunta oviaukkoon: oviaukosta lentää sisälle, ruskeaan oveen (ja seinään) tarttuu
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/konehomma/v2/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        n = int(sys.argv[1]) if len(sys.argv)>1 else 0
        info = await pg.evaluate("""(n)=>{const G=__game,t=G.tractor;
          const vis=G.DOORS.filter(d=>G.HB.some(b=>d.horiz?Math.abs(b.y1-0.18-d.plane)<.03:Math.abs(b.x1-0.18-d.plane)<.03));
          const d=vis[n]; const m=(d.a0+d.a1)/2;
          const P=d.horiz?[m,d.plane+0.18+8,Math.PI/2]:[d.plane+0.18+8,m,0];
          t.state=0; t.chute=Math.PI;
          setInterval(()=>{t.x=P[0];t.y=P[1];t.h=P[2];t.speed=1.6;},30);
          return {count:vis.length,d};}""", n)
        print(info)
        for i in range(3):
            await pg.wait_for_timeout(2500)
            print(i, await pg.evaluate("({n:__game.flakes.length,stuck:__game.flakes.filter(f=>f.s!==undefined).length})"))
            await pg.screenshot(path=f'/tmp/t/d{n}_{i}.png')
        print('errs', errs)
        await b.close()
asyncio.run(main())
