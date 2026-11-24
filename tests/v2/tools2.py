# Testaa kauhan vaihdon, lingon irrotuksen ja peräkärryn kytkennän. Kuvat /tmp/t/*.png
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
        async def drive(key, ms):
            await ev(f"__game.keys.{key}=1"); await pg.wait_for_timeout(ms); await ev(f"__game.keys.{key}=0"); await pg.wait_for_timeout(200)
        async def tap(): await ev("__game.actPress()"); await pg.wait_for_timeout(60); await ev("__game.actRelease()")
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        B = await ev("__game.TL.bucket")
        await ev(f"(()=>{{const T=__game.tractor;T.x={B['x']};T.y={B['y']+6};T.h=-Math.PI/2;T.speed=0;}})()")
        await shot('a0', 1200); print('start', await st())
        await ev("__game.keys.up=1")
        for i in range(60):
            await pg.wait_for_timeout(100)
            s = json.loads(await st())
            if any('GREEN' in r for r in s['rings']): break
        await ev("__game.keys.up=0"); await pg.wait_for_timeout(600)
        print('at bucket', await st()); await shot('a1')
        await tap(); await shot('a2', 1500); print('after swap', await st())
        # ---- kauhaisu: kauha alhaalla, ajetaan lumelle
        await ev("(()=>{const T=__game.tractor;T.x=40;T.y=84;T.h=-Math.PI/2;T.speed=0;})()")
        await pg.wait_for_timeout(500)
        await ev("__game.keys.up=1"); await pg.wait_for_timeout(2600); await ev("__game.keys.up=0"); await pg.wait_for_timeout(700)
        print('scooped', await st()); await shot('b0')
        await tap(); await shot('b1', 1800); print('carry', await st())
        await tap(); await shot('b2', 700); print('dumping', await st())
        await shot('b3', 1500); print('dumped', await st())
        print('bank sum', await ev("__game.bankN().reduce((a,b)=>a+b,0)"))
        await tap(); await pg.wait_for_timeout(1500); print('state back', await st())
        # ---- irrotus: linko
        await ev("__game.actPress()"); await pg.wait_for_timeout(900); await shot('c0', 0); print('holding', await ev("JSON.stringify(__game.AH)"))
        await pg.wait_for_timeout(700); await ev("__game.actRelease()"); await shot('c1', 600); print('detached', await st())
        print('errors', errs); await b.close()
asyncio.run(main())
