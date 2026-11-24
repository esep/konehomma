# Testaa: kauhan kippaus kärryyn, kärryn irrotus, lingon uudelleenkytkentä peruuttamalla. Kuvat /tmp/t/e*.png
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
        async def st(): return await ev("(()=>{const T=__game.tractor,G=__game;return JSON.stringify({fr:T.fr,rr:T.rr,state:T.state,bl:+T.bl.toFixed(2),bb:+T.bb.toFixed(2),load:+T.load.toFixed(1),x:+T.x.toFixed(2),y:+T.y.toFixed(2),h:+T.h.toFixed(2),rings:G.ringInfo().map(r=>r.n+':'+(r.ok?'GREEN':'orange')),trl:{on:G.TL.trailer.on,load:G.TL.trailer.load,tilt:+G.TL.trailer.tilt.toFixed(2)}})})()")
        async def tap(): await ev("__game.actPress()"); await pg.wait_for_timeout(60); await ev("__game.actRelease()")
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        # kauha kiinni suoraan, lumikuorma, kärry paikallaan (irrallaan)
        await ev("(()=>{const G=__game,T=G.tractor;T.fr='bucket';G.TL.plate.on=false;G.TL.plate.x=60;G.TL.plate.y=60;G.TL.plate.tx=60;G.TL.plate.ty=60;G.TL.bucket.on=true;T.state=1;T.load=40;T.x=42.41;T.y=76.7;T.h=-Math.PI/2;T.speed=0;})()")
        await pg.wait_for_timeout(2500); print('carry', await st()); await shot('e0', 100)
        await tap(); await shot('e1', 500); print('dump start', await st())
        await shot('e2', 1500); print('dumped into trailer', await st())
        await tap(); await pg.wait_for_timeout(1800); print('bucket down', await st())
        # kärry kytketty: peruuta tangon kohdalle (kauha edessä, linko irti-tilassa ei)
        await ev("(()=>{const T=__game.tractor;T.x=42.7;T.y=81;T.h=Math.PI/2-0.1;T.speed=0;T.state=0;})()")
        await pg.wait_for_timeout(300); await ev("__game.keys.down=1")
        for i in range(80):
            await pg.wait_for_timeout(100)
            if json.loads(await st())['rr']=='trailer': break
        await ev("__game.keys.down=0"); print('coupled', i, await st()); await shot('e3', 600)
        # irrota kärry pitämällä
        await ev("__game.actPress()"); await pg.wait_for_timeout(900); await shot('e4', 0); await pg.wait_for_timeout(700); await ev("__game.actRelease()")
        print('trailer detached', await st())
        # tap ilman irrotettavaa: ei saa irrottaa, vaan vaihtaa tilaa
        s0 = json.loads(await st())['state']; await ev("__game.actPress()"); await pg.wait_for_timeout(700); await ev("__game.actRelease()")
        print('long press w/o rear: state', s0, '->', json.loads(await st())['state'])
        print('errors', errs); await b.close()
asyncio.run(main())
