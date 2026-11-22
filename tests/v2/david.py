import asyncio,sys,json
from playwright.async_api import async_playwright
AP = """
window.__ap = (function(){
  const g=__game, d=g.david, k=g.keys;
  let tgt=null, rev=false, done=null;
  const norm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
  setInterval(()=>{
    if(!tgt){k.up=k.down=k.left=k.right=0;return;}
    const dx=tgt.x-d.x, dy=tgt.y-d.y, dist=Math.hypot(dx,dy);
    if(dist<tgt.r){tgt=null;k.up=k.down=k.left=k.right=0; if(done)done(); return;}
    let want=Math.atan2(dy,dx); if(rev) want=norm(want+Math.PI);
    const err=norm(want-d.h);
    k.left = err>0.12?1:0; k.right= err<-0.12?1:0;
    k.up = (!rev && Math.abs(err)<2.2)?1:0; k.down=(rev && Math.abs(err)<2.2)?1:0;
  },40);
  return { go:(x,y,r,rv)=>{tgt={x,y,r:r||1};rev=!!rv;}, idle:()=>!tgt };
})();
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width':900,'height':680}, device_scale_factor=1)).new_page()
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/konehomma/v2/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("__game.startLevel('snow')"); await pg.wait_for_timeout(2000)
        await pg.evaluate("__game.setActive(__game.david)")
        await pg.evaluate(AP)
        async def goto(x,y,r=1.0,rev=False,tmo=40):
            await pg.evaluate(f"__ap.go({x},{y},{r},{str(rev).lower()})")
            for i in range(tmo*5):
                await pg.wait_for_timeout(200)
                if await pg.evaluate("__ap.idle()"): return True
            return False
        async def st(tag):
            print(tag, await pg.evaluate("JSON.stringify({x:+__game.david.x.toFixed(1),y:+__game.david.y.toFixed(1),h:+__game.david.h.toFixed(2),held:!!__game.david.held,cz:+__game.david.cz.toFixed(2),win:+__game.RT.win.toFixed(1),bags:__game.BAGS().map(b=>[+b.x.toFixed(1),+b.y.toFixed(1),+b.z.toFixed(1)])})"))
        # crane to front so that we can drive forwards to the bag
        await pg.evaluate("__game.david.swing=Math.PI")
        await st('start')
        ok=await goto(55,76,1.5); print('wp1',ok); await st('wp1')
        # approach bag0 so that crane tip (3.2 ahead of pivot) is on the bag: stop at distance ~ 3.2-0.65
        b0=await pg.evaluate("__game.BAGS()[2]")
        ok=await goto(b0['x'],b0['y'],2.9); print('near bag0',ok); await st('near0')
        await pg.screenshot(path='/tmp/o/ap_0.png')
        print(await pg.evaluate('JSON.stringify([__game.david.swing,__game.craneTip(__game.david)])')); await pg.keyboard.press('Space')
        for i in range(8):
            await pg.wait_for_timeout(200); print(await pg.evaluate('JSON.stringify([__game.david.cz.toFixed(2),!!__game.david.held,__game.david.lock,__game.david.speed,__game.david.swung])'))
        await st('lowered')
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(1500); await st('raised')
        await pg.screenshot(path='/tmp/o/ap_1.png')
        print(errs)
        await b.close()
asyncio.run(main())
