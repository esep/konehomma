import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        await pg.goto('file:///home/claude/esep/konehomma/v2/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        for i,(wx,wy,h) in enumerate(eval(sys.argv[1])):
            await pg.evaluate(f"(()=>{{const t=__game.tractor;t.x=__game.gX({wy});t.y=__game.gY({wx});t.h={h};t.speed=0;}})()"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'o{i}.png')
        await b.close()
asyncio.run(main())
