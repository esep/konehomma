import asyncio, sys
from playwright.async_api import async_playwright
from PIL import Image
tag = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':700,'height':520}, device_scale_factor=2)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        html=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'out','harness.html')).read()
        await pg.set_content('<!doctype html><html><head><meta charset=utf-8></head><body>'+html+'</body></html>')
        await pg.wait_for_timeout(400)
        await pg.keyboard.press('Space'); await pg.keyboard.press('3'); await pg.wait_for_timeout(1500)
        ims=[]
        for i,sw in enumerate([0, 1.2, 2.4, 3.6, 4.8, 6.0]):
            await pg.evaluate(f"()=>{{__kh.exc.swing={sw};__kh.exc.h=-0.31;}}")
            await pg.wait_for_timeout(250)
            path=f'/home/claude/tests/out/e_{tag}_{i}.png'
            await pg.screenshot(path=path, clip={'x':350-130,'y':230-120,'width':260,'height':220})
            ims.append(Image.open(path))
        W=sum(i.width for i in ims[:3]); H=ims[0].height*2
        sheet=Image.new('RGB',(W,H))
        for k,im in enumerate(ims): sheet.paste(im,((k%3)*im.width,(k//3)*im.height))
        sheet.save(f'/home/claude/tests/out/sheet_{tag}.png')
        print(errs)
        await b.close()
asyncio.run(main())
