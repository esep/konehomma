# Konehomma

Yksinkertainen isometrinen pixel art -työkonepeli taaperolle. Avaa `index.html` selaimessa tai julkaise staattisena sivuna.

Ohjaus: nuolinäppäimet ajaa, välilyönti kauha/lava/kaivu, 1 2 3 vaihtaa konetta, Delete/Page Down kääntää kaivurin tornia. Puhelimessa virtuaalinapit.

Testit: `sh tests/make_harness.sh && python3 tests/rk.py` (tarvitsee Playwrightin).


## v2

Nykyinen versio: `v2/index.html` (lähteet `src/`, rakennus `sh src/build.sh`). Julkaisu itch.io:hon tapahtuu GitHub Actionilla, kun `main`iin pushataan muutos `v2/`-kansioon. Katso `CLAUDE.md`.
