# Storyboard – „Deutschland: 24 Stunden ohne Strom“

TikTok · 1080 × 1920 · 30 fps · **61 s = 1830 Frames** · H.264/AAC

Alle Szenen sind **illustrative Rekonstruktionen** (prozedural mit React/SVG/Canvas erzeugt) und im Bild durchgehend als „SZENARIO · ILLUSTRATIVE REKONSTRUKTION“ gekennzeichnet. Es werden keine echten Nachrichtenaufnahmen vorgetäuscht.

Schnitte innerhalb der Szenen sind an Wörter der echten Sprachaufnahme gekoppelt (`src/data/timeline.json`), damit Bild und Stimme synchron bleiben.

## Durchgehende Elemente

- **Hook-Titel** (0–4 s): „DEUTSCHLAND.“ ab Frame 0, „24 STUNDEN OHNE STROM.“ exakt im Moment des Blackouts.
- **Zeitleiste oben** (4–53 s): T+-Digitaluhr zählt hoch, Fortschrittsbalken 10 MIN → 1 STD → 6 STD → 12 STD → 24 STD.
- **Zeiteinblendung** am Szenenanfang mit animierter Analoguhr: „00:10 MINUTEN“, „1 STUNDE“, „6 STUNDEN“, „12 STUNDEN“, „24 STUNDEN“.
- **Untertitel**: eingebrannt, max. 2 Zeilen, wortgenau aus der Sprachaufnahme; Schlüsselbegriffe in Bernstein.
- **Callouts**: kleine dokumentarische Info-Tags, an gesprochene Wörter gekoppelt.
- **Look**: Vignette, Filmkorn, kühle Nachtfarben, Lichthöfe; dezente Kamerafahrten/Handkamera.

## Einstellungen


### Szene 1 – Der Hook (00–04 s)

**Sprecher:** „Was wäre, wenn Deutschland von jetzt auf gleich 24 Stunden keinen Strom mehr hätte?“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 00.00–04.00 s | 0–119 | `cityHook` | Drohnenflug über das nächtliche Berlin (Fernsehturm, Spree, Ausfallstraßen). Die Stadt ist hell – dann fallen die Bezirke kaskadenartig aus, Erschütterung, schneller Zoom in die dunklen Straßen. Nur Autoscheinwerfer und die Flugwarnlichter des Fernsehturms (Akku) bleiben. |

### Szene 2 – Die ersten 10 Minuten (04–12 s)

**Sprecher:** „Nach wenigen Minuten stehen Ampeln still, Bahnen bleiben liegen – und plötzlich merken Millionen Menschen: Nichts funktioniert mehr wie gewohnt.“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 04.00–06.67 s | 120–199 | `traffic` | Kreuzung: Die rote Ampel flackert und erlischt genau beim Wort „Ampeln“, die Autos davor bremsen (Bremslichter, Spiegelung auf nasser Fahrbahn). Callout „AMPELN: AUS“. |
| 06.67–08.07 s | 200–241 | `subway` | U-Bahnhof: Deckenleuchten fallen reihenweise aus, der Zug steht, nur das grüne Notausgangsschild leuchtet. Callout „U-BAHN: STILLSTAND“. |
| 08.07–09.61 s | 242–287 | `phones` | Menschen auf der dunklen Straße, Gesichter nur vom Smartphone-Licht beleuchtet. |
| 09.61–12.00 s | 288–359 | `office` | Bürohochhaus in Untersicht: Etage für Etage geht das Licht aus, synchron zu „Nichts funktioniert mehr“. |

### Szene 3 – Die erste Stunde (12–21 s)

**Sprecher:** „Schon nach einer Stunde geraten Alltag und Versorgung unter Druck. Kassen, Tankstellen und viele Kommunikationssysteme brauchen Strom – und nicht überall gibt es eine Alternative.“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 12.00–15.06 s | 360–451 | `supermarket` | Supermarktgang: Leuchtstoffröhren gehen von hinten nach vorne aus, Kunden mit Handylampe. Callout „KÜHLTRUHEN: AUS“. |
| 15.06–16.01 s | 452–479 | `checkout` | Kasse: schwarzer Kassenbildschirm, totes Kartenterminal, Aufsteller „KASSE GESCHLOSSEN“, Warteschlange. Callout „KARTENZAHLUNG: NICHT MÖGLICH“. |
| 16.01–17.05 s | 480–510 | `gasStation` | Tankstelle: dunkle Zapfsäulen („--.--“), Zettel „AUSSER BETRIEB“, wartendes Auto. Callout „ZAPFSÄULEN: KEIN STROM“. |
| 17.05–19.01 s | 511–569 | `phoneSignal` | Smartphone in der Hand: Empfangsbalken fallen weg, „Kein Netz“, Nachricht „Nicht zugestellt“. |
| 19.01–21.00 s | 570–629 | `atm` | Geldautomat „VORÜBERGEHEND AUSSER BETRIEB“, von einer Taschenlampe abgetastet. Callout „GELDAUTOMAT: AUS“. |

### Szene 4 – Nach 6 Stunden (21–31 s)

**Sprecher:** „Nach sechs Stunden wird es für viele Menschen ernst. Wohnungen bleiben kalt oder dunkel, manche Mobilfunkstandorte können ausfallen. Krankenhäuser müssen kritische Systeme mit Notstrom absichern.“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 21.00–22.53 s | 630–675 | `flashlightWalk` | Dämmerung wird zur Nacht: Menschen gehen mit Taschenlampen nach Hause. |
| 22.53–23.73 s | 676–711 | `elevator` | Aufzug mit Zettel „AUSSER BETRIEB“, Notruftaste blinkt über Akku. Callout „AUFZÜGE STEHEN STILL“. |
| 23.73–25.86 s | 712–775 | `apartments` | Plattenbau bei Nacht: fast alle Fenster dunkel, vereinzelt Kerzen und Taschenlampen. Beim Wort „kalt“: Callout „HEIZUNG: AUS – Auch Heizungspumpen brauchen Strom“. |
| 25.86–28.14 s | 776–843 | `cellTower` | Mobilfunkmast: Akku-Reserve zählt herunter, beim Wort „ausfallen“ verschwinden die Funkwellen → „STANDORT: OFFLINE“. |
| 28.14–31.00 s | 844–929 | `hospital` | Krankenhaus außen: Nur kritische Bereiche (Intensiv/OP/Notaufnahme) sind hell, Notstromaggregat mit Abgas, Rettungswagen mit Blaulicht. Callout „NOTSTROMAGGREGAT: AKTIV – Laufzeit hängt vom Treibstoff ab“ (kein Totalausfall behauptet). |

### Szene 5 – Nach 12 Stunden (31–41 s)

**Sprecher:** „Nach zwölf Stunden werden die Unsicherheit und die logistischen Probleme größer. Wer kein Wasser, keine geladenen Akkus oder wichtige Medikamente vorbereitet hat, könnte jetzt Schwierigkeiten bekommen.“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 31.00–33.64 s | 930–1008 | `closedShops` | Geschlossene Geschäfte (Bäckerei, Apotheke, Supermarkt) mit heruntergelassenen Rollläden, Zettel „HEUTE GESCHLOSSEN (Stromausfall)“, Menschen davor. |
| 33.64–35.31 s | 1009–1058 | `emergency` | Einsatzfahrzeug mit Blaulicht fährt durch die dunkle Straße, blaue Reflexe auf den Fassaden. |
| 35.31–41.00 s | 1059–1229 | `family` | Familie am Tisch im Taschenlampenlicht. Wasser, geladene Akkus und Medikamente werden exakt bei den gesprochenen Wörtern markiert. |

### Szene 6 – Nach 24 Stunden (41–53 s)

**Sprecher:** „Nach 24 Stunden wäre Deutschland nicht automatisch im Chaos. Aber Verkehr, Kommunikation und Versorgung könnten massiv beeinträchtigt sein. Wie schwer die Folgen wären, hinge davon ab, wo der Strom fehlt – und wie schnell er zurückkommt.“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 41.00–45.12 s | 1230–1353 | `cityWide` | Weitwinkel: die fast vollständig dunkle Großstadt. Nur Notstrom-Inseln, Blaulicht, Kerzen in einzelnen Fenstern. |
| 45.12–46.82 s | 1354–1404 | `controlRoom` | Leitstelle mit Bildschirmwand und Lagekarte (USV/Notstrom). Callouts „VERKEHR“, „KOMMUNIKATION“ synchron zur Stimme. |
| 46.82–48.97 s | 1405–1468 | `hospitalIcu` | Intensivstation: Monitor mit EKG, Anzeige „NOTSTROM AKTIV“. Callout „VERSORGUNG – Kritische Bereiche über Notstrom“. |
| 48.97–51.32 s | 1469–1539 | `flashlightCrowd` | Totale von oben: viele Taschenlampenkegel kreuzen sich auf einer dunklen Straße. |
| 51.32–53.00 s | 1540–1589 | `cityReturn` | Luftaufnahme: Bei „… wie schnell er zurückkommt“ gehen erste Bezirke flackernd wieder an. |

### Szene 7 – Das Finale (53–61 s)

**Sprecher:** „Und jetzt die Frage: Hättest du genug Wasser, Licht und einen geladenen Akku, um 24 Stunden durchzuhalten?“

| Zeit | Frames | Einstellung | Bild |
|---|---|---|---|
| 53.00–61.00 s | 1590–1829 | `map` | Dunkle Deutschlandkarte (Natural-Earth-Grenzen). Nach und nach kehren Lichtpunkte und Städte zurück, die Kamera zoomt heraus. Text „WÄRST DU VORBEREITET?“, Checkliste WASSER / LICHT / AKKU synchron zur Stimme; zum Schluss fast vollständig dunkel, dann „SCHREIB ES IN DIE KOMMENTARE.“ |

## Ton

- **Stimme:** Piper TTS „Thorsten“ (CC0), satzweise synthetisiert, Pitch −1 Halbton, EQ/Kompression/kleiner Raum.
- **Musikbett:** prozedural (Python/NumPy): tiefer D-Moll-Drone mit sich öffnendem Filter, Herzschlag-Sub ab 6 Std. (schneller bis 24 Std.), elektronische Pings mit Echo, hohe Streicherfläche ab 12 Std.
- **Sounddesign:** Stadtatmo + 50-Hz-Netzbrummen bis zum Blackout, dann abfallendes Brummen + tiefer Impact; Wind-Atmo danach; Whooshes an Szenenwechseln; Uhr-Ticks bei Zeiteinblendungen; ferne, gedämpfte Martinshörner; leiser Schlusspunkt beim CTA.
- **Mix:** Musik wird unter der Stimme automatisch ca. 7 dB abgesenkt (Ducking), Gesamtmix auf −14 LUFS, Spitzen ≈ −1,9 dBFS.
