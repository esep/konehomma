# Lähikuvat kauhasta ja levystä eri asennoissa. Kuvat /tmp/t/f*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
PATH = '/home/claude/esep/konehomma/v2/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        await ev("__game.zoom(1.6)")
        await ev("(()=>{const G=__game,T=G.tractor;T.fr='bucket';G.TL.plate.on=false;G.TL.plate.x=T.x;G.TL.bucket.on=true;T.rr=null;G.TL.blower.on=false;G.TL.blower.x=-999;T.x=52;T.y=95;T.speed=0;})()")
        i=0
        for h in (0.0, 1.57):
            for stt in (0,1,2):
                await ev(f"(()=>{{const T=__game.tractor;T.h={h};T.state={stt};T.load={ 30 if stt else 0};T.speed=0;T.x=52;T.y=95;}})()")
                await pg.wait_for_timeout(2400)
                await pg.screenshot(path=f'/tmp/t/f{i}.png', clip={'x':250,'y':150,'width':360,'height':300}); i+=1
        print('errors', errs); await b.close()
asyncio.run(main())
