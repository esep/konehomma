# Konehomma – ohjeet Claudelle

Taaperolle (3–4 v) tehty selainpeli: isometrinen pixel art -työmaa. **Pidä kaikki hyvin yksinkertaisena ja lapsiystävällisenä.**
Käyttäjä (Esko) puhuu suomea – vastaa suomeksi, tiiviisti. UI-teksti on suomea.

## Rakenne
- `index.html` – koko peli yhdessä tiedostossa (HTML + CSS + JS, canvas). Ei riippuvuuksia; ainoa ulkoinen resurssi on Google Fonts (Pixelify Sans). Numeroille käytetään monospace-fonttia, koska Pixelifyn "2" näyttää peilatulta.
- `tests/` – Playwright-testit (Python). `sh tests/make_harness.sh` rakentaa `tests/out/harness.html` (index.html + `window.__kh` -debugkahva ja syntaksitarkistus), sen jälkeen esim. `python3 tests/rk.py` (lohkareet + murskain), `rk2/3/4.py` (kaivurin ja kuormaajan poiminta), `exc_shots.py` (kaivurin käännön kuvakaappaukset). Kuvat menevät `tests/out/` (gitignore).
- Julkaisu: peli on julkaistu Claude-artifactina (Artifact-työkalu, sama `file_path` säilyttää URLin) ja kopio on Claude-projektin ("Konehomma") dokumentissa `claude/konehomma-v1.html`. Julkaisun jälkeen päivitä molemmat sekä commitoi tähän repoon (`index.html` on totuus).

## Pelin ohjaus
- Koneet: 1 pyöräkuormaaja, 2 kuorma-auto, 3 kaivuri (numeronäppäimet/virtuaalinapit, Tab/Enter vaihtaa, koneen napautus).
- Nuolet: ↑ eteen, ↓ peruutus (piippaus), ←/→ renkaiden kääntö (kuormaaja taittuu keskeltä). Välilyönti: kauha/lava/kaivun vaihe (kuormaaja 3 tilaa, auto 2, kaivuri 5 vaihetta, tila etenee yhdellä painalluksella).
- Kaivurin tornin kääntö: Delete (vasen) ja Page Down (oikea) / puhelimessa kaksi oranssia kiertonappia (näkyvät vain kaivurilla). Nuolet eivät käännä tornia.
- Ohjeteksti alareunassa pysyy koko ajan PC:llä, piilossa kosketuslaitteella.

## Arkkitehtuuri (pääkohdat)
- Painter's algorithm: osat piirretään `parts`-listana, avain `depth = x+y+0.8z + bias`. `kit(m, parts, off)` rakentaa laatikot/levyt/palkit/renkaat koneen paikallisessa koordinaatistossa. Järjestysvirheet korjataan biasilla/`off`-offsetilla (esim. kaivurin alusta `off = -0.7`). `plate(pts,col,bias,out)`: `out` = ulospäin osoittava normaali, tarra piirretään vain jos se on katsojaan päin.
- Pallofysiikka: pienet kivet/maa ovat palloja (BR=0.12), spatial hash, tilat `rest/fall/bkt/ebkt/belt/bed`. Kuopat `makeHole`, täytetyt pysyvät täytettyinä (reset-nappi aloittaa alusta). Kuoppien estoalue on kavennettu (0.45·r), jotta auto pääsee kippaamaan kuopan päälle.
- Lohkareet (`rocks`, RR=0.36): luoteessa soraalueella; kuormaaja ottaa 2, kaivuri 1; pudotus murskaimen oikeaan päähän (`inHopper`) → `crushRock()` → +45 pientä kiveä hihnalle (`CR.burst`), rouskahdus, pöly, murskaimen tärinä. Murskain tuottaa myös taustavirtaa.
- Valot: kattovilkut (vilkku → pyörivä → vilkku), etuvalot + valokeilat (`lamps`), kaivurin alustan pienet etuvalot, punaiset takakolmiot kuormaajalla ja kaivurilla jotka hehkuvat + punainen valokeila peruuttaessa.
- Ääni (WebAudio, käynnistyy START-napista): moottori, peruutuspiippaus (hiljainen), thud/plop, jingle, murskaus, paineilmasihahdus (`hiss()`, satunnaistettu, hiljainen; soi kun kuorma-auto/kuormaaja on pysähtynyt ajonäppäimen vapautuksen jälkeen).
- Savu (`smoke`): musta pakokaasu pakoputkista (kuormaaja, kaivuri, auton takapää): vähän tyhjäkäynnillä, enemmän ajaessa, eniten kun kone työskentelee.
- Aloitusruudun otsikko: "AARON KONEHOMMA".

## Käyttäjän toiveet (pysyviä)
- Peruutusääni ja sihahdus pidetään hiljaisina. Vauhti hieman reipas, mutta helppo ohjata.
- Muutokset testataan Playwrightilla ennen julkaisua; kuvakaappaukset tarkistetaan silmällä.
- Älä lisää monimutkaisuutta (valikoita, pisteitä, häviötiloja).
