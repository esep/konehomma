from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':700})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
    pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'out','harness.html'))+''); pg.wait_for_timeout(500)
    pg.evaluate("__kh.startGame()")
    print(pg.evaluate("[__kh.rocks().length, JSON.stringify(__kh.rocks().slice(0,2).map(r=>[r.x.toFixed(1),r.y.toFixed(1)]))]"))
    pg.screenshot(path='tests/out/rk_start.png')
    # drive the loader to a rock and scoop with real keys
    r=pg.evaluate("(()=>{const L=__kh.loader,r=__kh.rocks()[0];return [L.x,L.y,L.h,r.x,r.y]})()"); print(r)
    # excavator test: place excavator near rock, run dig cycle
    pg.evaluate("""(()=>{const E=__kh.exc,r=__kh.rocks()[0];E.x=r.x+2.6;E.y=r.y;E.h=Math.PI;__kh.setActive(E)})()""")
    pg.keyboard.press('Space'); pg.wait_for_timeout(6000)
    print('exc rock', pg.evaluate("!!__kh.exc.rock"), pg.evaluate("__kh.rocks().map(r=>r.st).join()"))
    pg.screenshot(path='tests/out/rk_exc.png')
    # simulate drop in hopper
    pg.evaluate("""(()=>{const CR=__kh.CR,c=Math.cos(CR.h),s=Math.sin(CR.h),rk=__kh.rocks()[1];rk.x=CR.x-2.0*c;rk.y=CR.y-2.0*s;rk.z=2.5;rk.st='fall';rk.vx=rk.vy=rk.vz=0})()""")
    n0=pg.evaluate("__kh.balls().length"); pg.wait_for_timeout(2500)
    print('rocks',pg.evaluate("__kh.rocks().length"),'balls',n0,pg.evaluate("__kh.balls().length"),'belt',pg.evaluate("__kh.balls().filter(b=>b.st==='belt').length"))
    pg.screenshot(path='tests/out/rk_crush.png')
    print('errs',errs); b.close()
