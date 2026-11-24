#!/bin/sh
# Rakentaa v2/index.html lähteistä (src/). Aja: sh src/build.sh
cd "$(dirname "$0")" || exit 1
python3 - <<'P'
import datetime
ver = 'v' + open('VERSION').read().strip() + ' · ' + datetime.date.today().strftime('%d.%m.%Y')
road = open('mikroad.js').read() + open('snd.js').read() + open('snd_exc.js').read() + open('snd_tool.js').read()
parts = [open(f).read() for f in ['p2.js', 'p3.js', 'p4.js', 'p5.js', 'p6m.js', 'p6.js', 'ptool.js', 'pdavid.js', 'proute.js', 'pfox.js', 'p7.js']]
p2 = parts[0]; i = p2.index('\n') + 1
parts[0] = p2[:i] + road + p2[i:]
head = open('p1.html').read().replace('__VERSION__', ver)
import os
os.makedirs('../v2', exist_ok=True)
open('../v2/index.html', 'w').write(head + ''.join(parts) + '\n</script></body></html>')
print('v2/index.html', ver)
P
