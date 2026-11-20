# Konehomma – ohjeet Claudelle

Taaperolle (3–4 v) tehty selainpeli: isometrinen pixel art -työmaa. **Pidä kaikki hyvin yksinkertaisena ja lapsiystävällisenä.**
Käyttäjä (Esko) puhuu suomea – vastaa suomeksi, tiiviisti. UI-teksti on suomea.

## Kaksi versiota
- **v2 (nykyinen, julkaistaan itch.io:hon):** lähteet `src/`, rakennettu tiedosto `v2/index.html` (älä muokkaa sitä käsin). Kentät: 1 Tietyö (kuormaaja, kuorma-auto, kaivuri, murskain), 2 Mikkolan talvi (traktori, aura + takalinko; Halli, Lato, Navetta, Puoji, Talo, Kuivaaja). Mikkolan kesä (vihreä nurmi) on suunniteltu myöhemmin – älä tuhoa vihreää varianttia. Ohjaus: nuolet + välilyönti ohjaa kaikkia koneita.
- **v1:** juuren `index.html` + alla oleva v1-kuvaus. Ei enää kehitetä, älä koske.

## v2: kloonaus, rakennus, testit, julkaisu
```
git clone https://github.com/esep/konehomma && cd konehomma
sh src/build.sh            # kokoaa src/ -> v2/index.html (lisää versiotekstin oikeaan alanurkkaan)
```
- **Lähteet (`src/`)**: `p1.html` (HTML+CSS, `__VERSION__`-paikka), `p2.js` (äänen apuja, hiss/crunch), `p3.js`, `p4.js` (ohjaus, moottoriäänet), `p5.js` (koneiden mallit), `p6m.js` (kartta, rakennukset, piha, katot), `p6.js` (traktori), `p7.js` (piirto, ohjepalkki), `mikroad.js` (tiet), `snd.js`/`snd_exc.js` (base64-äänet). `build.sh` liimaa ne järjestyksessä: mikroad+snd+snd_exc lisätään `p2.js`:n ensimmäisen rivin jälkeen, sitten p2,p3,p4,p5,p6m,p6,p7.
- **Versio**: muuta `src/VERSION` (esim. `2.2`) aina kun julkaiset muutoksen; build lisää päivämäärän. Teksti näkyy pienellä oikeassa alakulmassa.
- **Testit**: Playwright (Python, `/usr/bin/google-chrome`). `tests/v2/t34.py "[(wx,wy,suunta),...]"` käynnistää Mikkolan talven, siirtää traktorin kartta-koordinaatteihin ja tallentaa `o0.png…`; katso kuvat silmällä. Peli paljastaa `window.__game` (`startLevel('snow')`, `tractor`, `gX/gY` ym.). Muokkaa tiedostopolku osoittamaan `v2/index.html`:ään.
- **Rakennusten muokkaus** (`p6m.js`): `HOUSES`-lista kartta-koordinaateissa (`r:[wx0,wy0,wx1,wy1]`); ovet/ikkunat/koristeet kartta-seinillä `w:'S'|'E'|…` (kartta-S = pelin E). Koristeen `c` on kartta-yksikkö, mutta `hw` peliyksikköä (kartta×0.184) – sekoittaminen venyttää viipaleita ja rikkoo seinän. `deco`-tyypit: `lamp`, `dart`, `board` (valkoinen lauta, `z`..`z1`/`'top'`). `gline` = vaakalauta kartta-itäseinällä, `glE` = kartta-eteläseinällä. Katot (Talo) rakennetaan `buildTaloRoof()`:ssa; laaksot: pääkaton itälappe päättyy laaksoon, poikkipäädyn lappeet ovat laakson ja harjan välissä.
- **Julkaisu itch.io:hon (GitHub Actions)**: commitoi muutos (`src/` + rakennettu `v2/index.html`) ja pushaa `main`iin. `.github/workflows/itch.yml` ajaa butlerin ja työntää `v2/`-kansion kanavalle `walksonlegos/konehomma:html5` (secret `BUTLER_API_KEY` on repon Actions-secreteissä). Voi ajaa myös käsin Actions-välilehdeltä. Älä pushaa `main`iin ilman että build on ajettu ja kuvat tarkistettu. Claude-ympäristöstä itch.io ei ole tavoitettavissa, siksi julkaisu tehdään Actionilla.
- **Claude-projekti ("Konehomma")**: päivitä myös `claude/konehomma-v2.html` (`project_write`, edellyttää ensin `project_read`) ja artifact; `claude/konehomma-ohje.md` on sama ohje projektin puolella.

# v1

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
