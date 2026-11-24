# Takatyökalun vaihto: linko <-> peräkärry peruuttamalla renkaaseen ja välilyönnillä. Kuvat /tmp/t/s*.png
import asyncio, json
from playwright.async_api import async_playwright
PATH = '/home/claude/esep/konehomma/v2/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        st = "(()=>{const T=__game.tractor,G=__game,R=G.TL.trailer,B=G.TL.blower;return JSON.stringify({rr:T.rr,T:[T.x,T.y,T.h].map(v=>+v.toFixed(2)),R:[R.on,+R.x.toFixed(2),+R.y.toFixed(2)],B:[B.on,+B.x.toFixed(2),+B.y.toFixed(2)],rings:G.ringInfo().map(r=>r.n+':'+(r.ok?'GREEN':'o'))})})()"
        async def shot(n): await pg.screenshot(path=f'/tmp/t/{n}.png', clip={'x':150,'y':120,'width':560,'height':420})
        async def back(until, tmax=60):
            await ev("__game.keys.down=1")
            for i in range(tmax):
                await pg.wait_for_timeout(100)
                if any(until in r for r in json.loads(await ev(st))['rings'] if 'GREEN' in r): break
            await ev("__game.keys.down=0"); await pg.wait_for_timeout(500)
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await ev("__game.startLevel('snow')"); await pg.wait_for_timeout(2000)
        await ev("__game.zoom(1.5)")
        await ev("(()=>{const T=__game.tractor;T.x=42.41;T.y=83;T.h=Math.PI/2;T.speed=0;})()"); await pg.wait_for_timeout(600)
        await back('trailer'); print('at trailer ring', await ev(st)); await shot('s0')
        await ev("__game.actPress()"); await ev("__game.actRelease()"); await pg.wait_for_timeout(300); print('swapped', await ev(st)); await shot('s1')
        await pg.wait_for_timeout(1200); print('settled', await ev(st)); await shot('s2')
        # aja pois ja takaisin linkoon
        await ev("(()=>{const T=__game.tractor,B=__game.TL.blower,R=__game.TL.trailer;T.h=Math.PI/2;T.x=B.x;T.y=B.y+8;T.speed=0;R.x=B.x;R.y=T.y-3.9;R.h=Math.PI/2;})()")
        await pg.wait_for_timeout(500); print('before blower', await ev(st))
        await back('blower', 80); print('at blower ring', await ev(st)); await shot('s3')
        await ev("__game.actPress()"); await ev("__game.actRelease()"); await pg.wait_for_timeout(1500); print('swapped back', await ev(st)); await shot('s4')
        # ei vihreää: tap vaihtaa vain työkalun asentoa
        await ev("(()=>{const T=__game.tractor;T.x=60;T.y=100;})()"); await pg.wait_for_timeout(300); s0=json.loads(await ev(st)); await ev("__game.actPress()"); print('plain tap, rr same:', s0['rr'], json.loads(await ev(st))['rr'])
        print(errs); await b.close()
asyncio.run(main())
