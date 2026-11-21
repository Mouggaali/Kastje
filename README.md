# Kastje 🧥

Je digitale kledingkast. Kastje stelt elke dag een outfit voor die past bij het weer van vandaag en morgen.

## Starten

Je hebt [Node.js](https://nodejs.org) nodig (versie 20 of nieuwer). Open daarna een terminal in deze map en typ:

```
npm install
npm run dev
```

`npm install` hoef je alleen de eerste keer te doen (en na een update). Open daarna de link die verschijnt, meestal http://localhost:5173.

Stoppen doe je met `Ctrl + C` in de terminal.

## Op je telefoon, als echte app

De beste manier: zet Kastje online via **GitHub Pages**. Dat is gratis, werkt via https (dan werkt ook je locatie), en je computer hoeft niet aan te staan. Je gegevens blijven gewoon op je telefoon; GitHub host alleen de app zelf.

**Eenmalig instellen** (op github.com, in de repository `Kastje`):
1. Ga naar **Settings → Pages**.
2. Kies bij **Source**: **GitHub Actions**.

Vanaf dan bouwt en publiceert GitHub de app automatisch bij elke `git push`. Eerst draaien de linter en de tests; faalt er iets, dan wordt er niets gepubliceerd. Je ziet de voortgang onder het tabblad **Actions**. Na een paar minuten staat de app op:

```
https://<jouw-gebruikersnaam>.github.io/Kastje/
```

**Installeren op je telefoon:**
- **iPhone (Safari):** open de link, tik op het deel-icoon en kies **Zet op beginscherm**.
- **Android (Chrome):** open de link, tik op ⋮ en kies **App installeren** (of **Toevoegen aan startscherm**).

Kastje heeft dan een eigen icoon en opent als losse app, ook zonder internet. Zonder internet zie je het laatst opgehaalde weer, met een melding erbij.

> **Let op:** de geïnstalleerde app heeft zijn eigen opslag, los van je browser. Wil je je kast overzetten van je computer (of uit Safari), maak dan daar een back-up (tabblad **Inzicht → Back-up maken**) en zet die terug in de geïnstalleerde app.

### Zonder internet-hosting: via je wifi

Je kunt Kastje ook tijdelijk vanaf je computer op je telefoon openen. Zorg dat beide op hetzelfde wifi-netwerk zitten en start:

```
npm run dev:telefoon
```

Open op je telefoon het adres achter **Network** (bijvoorbeeld `http://192.168.1.20:5173`). Je computer moet dan wel aan blijven. Telefoons geven je locatie niet door via zo'n http-adres, dus je zoekt je woonplaats één keer zelf op.

## Back-up

Alles staat alleen op het apparaat waarop je Kastje gebruikt. Wis je je browsergegevens, dan ben je je kast kwijt. Daarom:

- **Inzicht → Back-up maken** zet al je kleding, foto's, outfits, planning en draaggeschiedenis in één bestand (`kastje-backup-2026-11-21.json`). Op een telefoon opent het deelmenu, zodat je het direct in je cloud of bestanden kunt zetten.
- **Inzicht → Back-up terugzetten** zet zo'n bestand terug. Alles wat nu in Kastje staat, wordt daarbij vervangen; de app vraagt eerst om bevestiging.
- Heb je eigen kleding ingevoerd en al 14 dagen geen back-up gemaakt, dan krijg je een herinnering op Vandaag.

## Andere commando's

| Commando | Wat het doet |
|---|---|
| `npm test` | Draait alle tests: de rekenregels én de schermen zelf (in een nagebootste browser) |
| `npm run lint` | Controleert de code op veelgemaakte fouten |
| `npm run build` | Controleert de types en maakt de publiceerbare versie in de map `dist` |
| `npm run preview` | Start de gebouwde versie, om de app-functies (offline, installeren) lokaal te proberen |
| `node scripts/make-icons.mjs` | Maakt de app-iconen opnieuw (alleen nodig als je het ontwerp aanpast) |

## Hoe werkt het?

Kastje heeft vijf tabbladen: **Vandaag · Plannen · Outfits · Kast · Inzicht**.

- **☀️ Vandaag:** de app haalt het weer op bij [Open-Meteo](https://open-meteo.com) (gratis, zonder account) en toont een outfit als collage van je eigen foto's. Tik op de kaart van morgen om de outfit voor morgen te zien.
  - **Gelegenheid** (Casual, Werk, Sport, Feest): de app kiest stukken die je voor die gelegenheid hebt gelabeld.
  - **Harmoniescore** (0–100): hoe goed de kleuren samengaan, met een korte uitleg zoals "Neutraal met één accent".
  - **Tik op een foto** om dat stuk vast te zetten (📌). De rest van de outfit wordt eromheen gekozen. Nog eens tikken maakt het weer los.
  - **👍 / 👎:** combinaties die je goedkeurt komen vaker terug, en afgekeurde minder. 👎 geeft meteen iets anders.
  - **Andere suggestie** geeft een nieuwe variant.
  - **Dit draag ik vandaag** onthoudt wat je aanhebt. Wat je de afgelopen 3 dagen droeg, komt achteraan in de rij.
  - **♡ Bewaren** zet de outfit bij je outfits. Daarbij kun je meteen nog stukken wisselen.
  - **Laagjes en accessoires:** bij kou (of een koude ochtend en warme middag) komt er een shirt onder je trui. Sjaal, muts en handschoenen bij kou, zonnebril en pet bij zon, een paraplu bij regen. Geef je accessoires daarvoor de juiste soort in het formulier.
  - **Tips per uur**, zoals "Regen vanaf 15:00, neem een paraplu mee" of "'s Avonds wordt het een stuk kouder".
  - Heb je voor vandaag of morgen iets gepland, dan zie je eerst die outfit (📅).
- **📅 Plannen:** de komende 7 dagen met het weerbericht. Tik op **Plan**: Kastje stelt iets voor dat bij het weer van die dag past, en jij past het aan zoals je wilt.
  - **🧳 Reis plannen:** kies een bestemming en data (tot 16 dagen vooruit). Kastje haalt het weer daar op, maakt per dag een outfit en één **paklijst** om af te vinken. Dagen met vergelijkbaar weer krijgen dezelfde kleding, zodat je koffer klein blijft.
- **👗 Outfits:** stel zelf outfits samen. Tik per onderdeel (bovenstuk, laag eronder, onderstuk, schoenen, jas, accessoires) op een foto. Bovenaan zie je direct hoe het samen staat, met de harmoniescore.
- **🧥 Kast:**
  - **Zoeken** op naam, kleur, patroon, categorie of gelegenheid ("zwart werk", "streep wit").
  - **✂️ Bijsnijden:** sleep, zoom en draai je foto tot het kledingstuk mooi in het vierkant past. Daarna wordt de kleur opnieuw herkend; zonder vloer eromheen is dat nauwkeuriger.
  - **Patroon en tweede kleur:** geef aan of iets effen, gestreept, geruit, gestippeld of geprint is. Ziet Kastje een tweede kleur in de foto (bijvoorbeeld wit bij een navy-wit gestreept shirt), dan stelt hij die voor. De harmoniescore houdt er rekening mee: één druk patroon is prima, twee botsen.
  - **📷 Foto maken** opent de camera. Leg het kledingstuk op een rustige ondergrond, midden in beeld. Kastje verkleint de foto, herkent de kleur en opent het formulier. Vul daarna de naam, categorie, warmte (1–5), waterdicht, gelegenheden en eventueel de prijs in.
  - **🖼️ Meerdere foto's:** kies een hele reeks foto's tegelijk en loop ze één voor één door ("Foto 2 van 5"), met de kleur al herkend.
  - **🛍️ Koop-check:** twijfel je in de winkel? Maak een foto. Kastje zegt **Koop het**, **Twijfel** of **Sla over**: heb je al iets vergelijkbaars, en in hoeveel goede outfits past het?
  - Tik op een stuk om het te bewerken, te archiveren, of **✨ een outfit rond dit stuk** te maken.
  - Verwijderd of gearchiveerd per ongeluk? Tik binnen 6 seconden op **Ongedaan maken** in de melding onderin.
- **📊 Inzicht:** bovenaan het **draagdagboek**: een kalender met wat je elke dag droeg. Tik op een dag om hem te bekijken, of om een vergeten dag toe te voegen, te wijzigen of te wissen. Daaronder: hoeveel van je kast je echt draagt, je meest gedragen stukken, **slapers** (30+ dagen niet gedragen), je kleurverdeling, de prijs per keer dragen, gearchiveerde stukken die je kunt terugzetten, en je **back-up**.

De kleurherkenning gebeurt op je eigen apparaat: Kastje kijkt naar de meest voorkomende kleur in het midden van de foto. Er gaat geen foto naar een externe dienst.

### De outfitregels

Je vindt ze in `src/outfit/outfitLogic.ts`. Bovenaan dat bestand staan de instellingen waar je zelf aan kunt draaien:

| Gevoelstemperatuur | Warmteniveau |
|---|---|
| boven 22 °C | 1 |
| 17–22 °C | 2 |
| 11–16 °C | 3 |
| 5–10 °C | 4 |
| onder 5 °C | 5 |

- Bij veel wind (vanaf 30 km/u) wordt het een niveau warmer.
- Een jas komt erbij onder 15 °C, bij regen (vanaf 40 % kans) of bij veel wind.
- Bij regen krijgen waterdichte jassen en schoenen de voorkeur.
- **Kleuren:** neutrale kleuren (zwart, wit, grijs, beige, bruin, navy, denim) passen bij alles. Per outfit is er maximaal één felle kleur (rood, oranje, geel, roze, felgroen).
- Elk kledingstuk krijgt strafpunten en het stuk met de minste punten wint. Strafpunten krijg je voor:
  - te warm of te koud
  - niet waterdicht bij regen
  - onlangs gedragen
  - niet gelabeld voor de gekozen gelegenheid
  - een lage kleurharmonie
  - een combinatie die je eerder met 👎 afkeurde

  Een stuk dat bij het weer past, wint daarbij van een stuk dat je minder recent droeg.
- De harmonieregels staan in `src/outfit/harmony.ts`, de koop-check in `buyCheck.ts` en de statistieken in `stats.ts`.

### Geïnspireerd door

Kastje leent ideeën van Nouva, Wardrowbe, Acloset en GetWardrobe: de harmoniescore, een outfit rond één stuk, de gelegenheid, 👍/👎, de weekplanner, statistieken en opruimen, de koop-check en snel veel foto's toevoegen.

Bewust níét overgenomen, omdat daarvoor een AI-dienst of server nodig is en je gegevens dan je apparaat verlaten:
- automatisch de categorie herkennen
- achtergrond weghalen
- virtueel passen
- een style-check met een selfie
- synchroniseren tussen apparaten

## Privacy

Alles blijft op je eigen apparaat. Kleding, outfits, planning, reizen, 👍/👎 en draaggeschiedenis staan in `localStorage`, foto's in `IndexedDB`. Alleen je (afgeronde) locatie, de plaatsnaam die je zoekt of je reisbestemming gaat naar Open-Meteo, om het weer op te halen. Er zijn geen accounts en er worden geen gegevens verzameld. Ook als de app op GitHub Pages staat, host GitHub alleen de app; jouw kleding komt daar nooit.

## Mappen

```
src/
├─ App.tsx              tabbladen en gedeelde gegevens (+ schermtests in App.test.tsx)
├─ types.ts             de datatypes (kledingstuk, weer, reis, …)
├─ styles.css           alle opmaak
├─ data/                opslag, foto's, back-up, kleurherkenning, voorbeeldkleding
├─ weather/             Open-Meteo: weer, tips per uur, plaatsen zoeken
├─ outfit/              outfitregels, harmonie, koop-check, paklijst, statistieken (+ tests)
├─ components/          de schermen en onderdelen
└─ test/                nagemaakt weer voor de tests
public/                 app-iconen, manifest en service worker (offline)
scripts/make-icons.mjs  maakt de app-iconen
.github/workflows/      automatisch testen en publiceren op GitHub Pages
```
