# lumilinko heittää lunta Puojin näkyvään seinään: 40 % jää seinään hetkeksi, loput putoavat kasaksi maahan
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':853,'height':664}, device_scale_factor=2)).new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/konehomma/v2/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2500)
        face = sys.argv[1] if len(sys.argv)>1 else 'x1'
        # Puoji: kartta r [572,101,624,134] -> peli x: gX(wy), y: gY(wx)
        await pg.evaluate("""(face)=>{const G=__game,t=G.tractor;const b=[G.gX(101),G.gY(572),G.gX(134),G.gY(624)];
          window.__t={b,face};
          const x1=b[2],y1=b[3],xm=(b[0]+b[2])/2,ym=(b[1]+b[3])/2;
          const P=face==='x1'?[x1+8,ym,0]:[xm,y1+8,Math.PI/2];
          window.__P=P;
          t.state=0; t.chute=Math.PI;
          setInterval(()=>{t.x=P[0];t.y=P[1];t.h=P[2];t.speed=1.6;},30);}""", face)
        for i in range(4):
            await pg.wait_for_timeout(2500)
            n = await pg.evaluate("({n:__game.flakes.length,stuck:__game.flakes.filter(f=>f.s!==undefined).length,banks:Array.from(__game.bankN()).reduce((a,v)=>a+v,0)})")
            print(i, n)
            await pg.screenshot(path=f'/tmp/t/w_{face}_{i}.png')
        print('errs', errs)
        await b.close()
asyncio.run(main())
