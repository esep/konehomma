from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':700})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'out','harness.html'))+''); pg.wait_for_timeout(500)
    pg.evaluate("__kh.startGame()")
    pg.evaluate("(()=>{const E=__kh.exc;E.x=20;E.y=20;E.h=0;E.swing=0;__kh.setActive(E);const r=__kh.rocks()[0];r.x=22.4;r.y=19.75;r.z=0.36})()")
    pg.keyboard.press('Space'); pg.wait_for_timeout(2500)
    pg.keyboard.press('Space')
    for i in range(10):
        pg.wait_for_timeout(500)
        print(pg.evaluate("[__kh.exc.state,!!__kh.exc.rock,__kh.rocks()[0].st,__kh.rocks()[0].z.toFixed(2)]"))
    pg.screenshot(path='tests/out/rk_exc2.png')
    # continue: lift, swing and dump over hopper not needed; press space to lift & dump
    pg.keyboard.press('Space'); pg.wait_for_timeout(3000); pg.keyboard.press('Space'); pg.wait_for_timeout(3000)
    print(pg.evaluate("[__kh.exc.state,!!__kh.exc.rock,__kh.rocks()[0]&&__kh.rocks()[0].st]"), errs)
    b.close()
