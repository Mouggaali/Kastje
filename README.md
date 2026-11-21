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

### Op je telefoon gebruiken

Zorg dat je telefoon en computer op hetzelfde wifi-netwerk zitten en start de app met:

```
npm run dev:telefoon
```

Open op je telefoon het adres dat achter **Network** staat (bijvoorbeeld `http://192.168.1.20:5173`).

De knop **📷 Foto maken** werkt ook via dit adres.

Twee dingen om te weten:
- Telefoonbrowsers geven je locatie alleen door bij beveiligde (https) sites. Via dit adres zoek je je woonplaats dus even zelf op. Dat hoeft maar één keer, want de app onthoudt het.
- Elke browser heeft zijn eigen opslag. Kleding die je op je telefoon invoert, staat dus niet op je computer, en andersom.

## Andere commando's

| Commando | Wat het doet |
|---|---|
| `npm test` | Draait de unit tests van de outfit-, weer- en kleurlogica |
| `npm run build` | Controleert de code en maakt een versie voor publicatie in de map `dist` |

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
  - Heb je voor vandaag of morgen iets gepland, dan zie je eerst die outfit (📅).
- **📅 Plannen:** de komende 7 dagen met het weerbericht. Tik op **Plan**: Kastje stelt iets voor dat bij het weer van die dag past, en jij past het aan zoals je wilt.
- **👗 Outfits:** stel zelf outfits samen. Tik per onderdeel (bovenstuk, onderstuk, schoenen, eventueel een jas) op een foto. Bovenaan zie je direct hoe het samen staat, met de harmoniescore.
- **🧥 Kast:**
  - **📷 Foto maken** opent de camera. Leg het kledingstuk op een rustige ondergrond, midden in beeld. Kastje verkleint de foto, herkent de kleur en opent het formulier. Vul daarna de naam, categorie, warmte (1–5), waterdicht, gelegenheden en eventueel de prijs in.
  - **🖼️ Meerdere foto's:** kies een hele reeks foto's tegelijk en loop ze één voor één door ("Foto 2 van 5"), met de kleur al herkend.
  - **🛍️ Koop-check:** twijfel je in de winkel? Maak een foto. Kastje zegt **Koop het**, **Twijfel** of **Sla over**: heb je al iets vergelijkbaars, en in hoeveel goede outfits past het?
  - Tik op een stuk om het te bewerken, te archiveren, of **✨ een outfit rond dit stuk** te maken.
- **📊 Inzicht:** hoeveel van je kast je echt draagt, je meest gedragen stukken, **slapers** (30+ dagen niet gedragen), je kleurverdeling, de prijs per keer dragen, en gearchiveerde stukken die je kunt terugzetten.

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

Alles blijft op je eigen apparaat. Kleding, outfits, planning, 👍/👎 en draaggeschiedenis staan in `localStorage`, foto's in `IndexedDB`. Alleen je (afgeronde) locatie of de plaatsnaam die je zoekt gaat naar Open-Meteo, om het weer op te halen. Er zijn geen accounts en er worden geen gegevens verzameld.

## Mappen

```
src/
├─ App.tsx              tabbladen en gedeelde gegevens
├─ types.ts             de datatypes (kledingstuk, weer, …)
├─ styles.css           alle opmaak
├─ data/                opslag, foto's, kleurherkenning, voorbeeldkleding
├─ weather/             Open-Meteo: weer (7 dagen) en plaatsen zoeken
├─ outfit/              outfitregels, harmonie, koop-check, statistieken (+ tests)
└─ components/          de schermen en onderdelen
```
