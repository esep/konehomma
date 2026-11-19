from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1100,'height':700})
    pg.goto('file://'+__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'out','harness.html'))+''); pg.wait_for_timeout(500)
    pg.evaluate("__kh.startGame()")
    pg.evaluate("(()=>{const E=__kh.exc;E.x=20;E.y=20;E.h=0;E.swing=0;__kh.setActive(E)})()")
    pg.keyboard.press('Space')
    for i in range(14):
        pg.wait_for_timeout(450)
        print(pg.evaluate("(()=>{const E=__kh.exc,G=__kh.excGeo(E),t=G.loc(0.6,0.05,0);return [E.state,(t[0]-E.x).toFixed(2),(t[1]-E.y).toFixed(2),t[2].toFixed(2)]})()"))
    b.close()
