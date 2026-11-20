# Testaa traktorin työkalutilat (välilyönti: 0 linko alas+levy ylös, 1 molemmat ylös, 2 levy alas+linko ylös) ja zoomin. Kuvat /tmp/tl_*.png
import asyncio, sys
from playwright.async_api import async_playwright
PATH = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/konehomma/v2/index.html'
async def st(pg): return await pg.evaluate("(()=>{const T=__game.tractor;return JSON.stringify({state:T.state,bl:+T.bl.toFixed(2),bw:+T.bw.toFixed(2),rpm:+T.rpm.toFixed(2)})})()")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664})).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + PATH); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        await pg.evaluate("(()=>{const T=__game.tractor;T.x=__game.gX(330);T.y=__game.gY(520);T.h=0;T.speed=0})()")   # ulos pihalle lumelle
        for k in range(4):
            await pg.wait_for_timeout(1800); print(k, await st(pg), flush=True)
            await pg.screenshot(path=f'/tmp/tl_{k}.png')
            await pg.keyboard.press('Space')
        print('errors', errs); await b.close()
asyncio.run(main())
