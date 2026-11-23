# kaivuri kaksitoimisena: 1. välilyönti kauhaisee (alas, kauhaisu, ylös itsestään), 2. tiputtaa ja kauha jää ylös
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/konehomma/v2/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('yard')"); await pg.wait_for_timeout(1500)
        print(await pg.evaluate("""()=>{const G=__game,e=G.exc;G.setActive(e);
          const r=G.balls.filter(b=>b.st==='rest');
          // kaivuri heiluttaa kauhaa kohti lähintä multaa: etsi pallo ja aseta kone sen taakse
          const b=r.sort((a,c)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(c.x-e.x,c.y-e.y))[0];
          e.h=0;e.swing=0;e.x=b.x-3.0;e.y=b.y;e.speed=0;return {balls:r.length,b:[b.x,b.y]};}"""))
        async def st(tag):
            print(tag, await pg.evaluate("({s:__game.exc.state,slots:__game.exc.slots.filter(Boolean).length,rock:!!__game.exc.rock,j:__game.exc.j.map(v=>+v.toFixed(2))})"))
        await st('alku')
        await pg.evaluate("__game.action()")
        for i in range(8):
            await pg.wait_for_timeout(700); await st(f'a{i}')
            if i in (2,5): await pg.screenshot(path=f'/tmp/t/e_{i}.png')
        await pg.evaluate("__game.action()")   # tiputus
        for i in range(8):
            await pg.wait_for_timeout(700); await st(f'd{i}')
        await pg.screenshot(path='/tmp/t/e_end.png')
        # painallus kesken liikkeen ei tee mitään
        await pg.evaluate("__game.action()"); await pg.wait_for_timeout(200); await pg.evaluate("__game.action()"); await st('kaksi nopeaa')
        await pg.wait_for_timeout(5000); await st('lopuksi')
        print('errs', errs)
        await b.close()
asyncio.run(main())
