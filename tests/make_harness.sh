#!/bin/sh
# Builds tests/out/harness.html: index.html with a debug handle (window.__kh) injected before the first reset().
# Usage: sh tests/make_harness.sh && python3 tests/rk.py
cd "$(dirname "$0")" && mkdir -p out
sed 's/^reset();/window.__kh={loader,truck,exc,CR,HOLES,PIT,ROADHOLES,excGeo,balls:()=>balls,rocks:()=>rocks,smoke:()=>smoke,setActive,startGame};\nreset();/' ../index.html > out/harness.html
# syntax check of the inline script
node -e "const s=require('fs').readFileSync('out/harness.html','utf8');require('fs').writeFileSync('out/s.js',s.match(/<script>([\s\S]*)<\/script>/)[1])" && node --check out/s.js && echo "syntax ok"
