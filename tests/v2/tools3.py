# Testaa peräkärryn kytkennän (peruuttamalla), vedon, kippauksen sekä kauhan kippauksen kärryyn. Kuvat /tmp/t/*.png
import asyncio, sys, json
from playwright.async_api import async_playwright
PATH = '/home/claude/esep/konehomma/v2/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        ev = pg.evaluate
        async def shot(n, wait=600): await pg.wait_for_timeout(wait); await pg.screenshot(path=f'/tmp/t/{n}.png', clip={'x':180,'y':120,'width':500,'height':380})
        async def st(): return await ev("(()=>{const T=__game.tractor,G=__game;return JSON.stringify({fr:T.fr,rr:T.rr,state:T.state,bl:+T.bl.toFixed(2),bb:+T.bb.toFixed(2),load:+T.load.toFixed(1),x:+T.x.toFixed(2),y:+T.y.toFixed(2),h:+T.h.toFixed(2),rings:G.ringInfo().map(r=>r.n+':'+(r.ok?'GREEN':'orange')),trl:{on:G.TL.trailer.on,x:+G.TL.trailer.x.toFixed(2),y:+G.TL.trailer.y.toFixed(2),h:+G.TL.trailer.h.toFixed(2),load:G.TL.trailer.load,tilt:+G.TL.trailer.tilt.toFixed(2)}})})()")
        async def tap(): await ev("__game.actPress()"); await pg.wait_for_timeout(60); await ev("__game.actRelease()")
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        # irrota linko ensin pitämällä
        await ev("(()=>{const T=__game.tractor;T.x=50;T.y=92;T.h=Math.PI/2;T.speed=0;})()")
        await pg.wait_for_timeout(500)
        await ev("__game.actPress()"); await pg.wait_for_timeout(1600); await ev("__game.actRelease()")
        print('detach blower', await st())
        # ajetaan eteen (+y) pois lingon luota, sitten peruutetaan kärryn vetotangon kohdalle
        await ev("__game.keys.up=1"); await pg.wait_for_timeout(1500); await ev("__game.keys.up=0"); await pg.wait_for_timeout(500)
        print('away', await st()); await shot('d0')
        await ev("(()=>{const T=__game.tractor;T.x=42.7;T.y=81;T.h=Math.PI/2-0.15;T.speed=0;})()")
        await pg.wait_for_timeout(300); await ev("__game.keys.down=1")
        for i in range(80):
            await pg.wait_for_timeout(100)
            s = json.loads(await st())
            if s['rr']=='trailer': break
        await ev("__game.keys.down=0"); print('coupling', i, await st()); await shot('d1', 700)
        # vedetään: käännetään ja ajetaan
        await ev("__game.keys.up=1; __game.keys.left=1"); await pg.wait_for_timeout(2600); await ev("__game.keys.up=0; __game.keys.left=0"); await pg.wait_for_timeout(500)
        print('towing', await st()); await shot('d2')
        # kippaus: tyhjänä; täytetään käsin ja kipataan
        await ev("__game.TL.trailer.load=120")
        await tap(); await tap(); print('trailer state', await st()); await shot('d3', 1800)
        await shot('d4', 1800); print('dumped', await st())
        print('errors', errs); await b.close()
asyncio.run(main())
