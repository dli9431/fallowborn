# Spring 1066 bookmark: sources and editorial decisions

This note records the historical frame behind `data/bookmarks.js`. The bookmark is an
authored grand-strategy snapshot, not a claim that every county border, title, or
population value can be reconstructed exactly.

## Chosen instant

The campaign begins on **Spring day 1, 1066**, after Harold Godwinson's coronation on
6 January and before the Norwegian and Norman invasions. This gives England one
unambiguous crowned ruler while leaving the year's succession crisis poised rather
than resolved. The invasion chain is intentionally future work: the present war model
cannot faithfully express two concurrent foreign invasions and the English succession
struggle as independent belligerents.

The chronology was checked against:

- [The Royal Family, “Harold II (r. Jan–Oct 1066)”](https://www.royal.uk/harold-ii-r-jan-oct-1066)
- [British Library, “And always after that it grew much worse”](https://www.bl.uk/stories/blogs/posts/and-always-after-that-it-grew-much-worse)
- [Library of Congress, “1066 and the Bayeux Tapestry”](https://blogs.loc.gov/law/2016/10/1066-and-the-bayeux-tapestry/)

## Map and political sources

The snapshot was cross-checked at regional scale rather than traced from a single
modern boundary dataset:

- [Oxford Academic, *The Historical Geography of Europe*](https://academic.oup.com/book/53924/chapter-abstract/422194568)
  for the limits of translating medieval political relationships into a modern
  territorial map.
- [The Metropolitan Museum of Art, Iberian Peninsula chronology](https://82nd-and-fifth.metmuseum.org/toah/ht/06/eusi.html)
  for the post-caliphate Christian and taifa landscape.
- [The Metropolitan Museum of Art, Western North Africa chronology](https://82nd-and-fifth.metmuseum.org/toah/ht/07/afw.html)
  and [Art of the Islamic World: A Resource for Educators](https://www.metmuseum.org/learn/educators/curriculum-resources/art-of-the-islamic-world/~/media/Files/Learn/For%20Educators/Publications%20for%20Educators/Islamic%20Teacher%20Resource/Introduction.pdf)
  for the western Islamic world and its dynastic context.
- [Encyclopaedia Iranica, “Alp Arslan”](https://www.iranicaonline.org/articles/alp-arslan-saljuq-sultan/)
  and [“Malekšāh”](https://www.iranicaonline.org/articles/maleksah/)
  for Seljuk chronology and succession context.
- [The National Archives, *Domesday Book* education resource](https://cdn.nationalarchives.gov.uk/documents/education/domesday.pdf)
  for the character and limits of the near-contemporary English evidence.

Historical ruler names are proper names and deliberately bypass localization. Birth
years and martial values are gameplay inputs: well-attested dates use the historical
year, while uncertain dates are rounded. Martial is a 1–20 characterization, not a
source claim.

## Deliberate simplifications and disputed frontiers

- The existing coastline, projection bounds, and county seed ids are retained. County
  cells are nearest-seed gameplay regions, not surveyed medieval borders.
- De jure duchies, kingdoms, and empires are stable promotion groupings. They express a
  plausible regional hierarchy and campaign continuity, not universal legal consensus
  in 1066.
- Realm ownership assigns every playable county to one direct authored realm before
  generated vassals are created. Tributaries, marches, overlapping claims, condominium,
  ecclesiastical immunities, and intermittent suzerainty therefore resolve to one
  gameplay owner.
- The Holy Roman Empire and France use a simplified liege tree. Normandy is represented
  as a French vassal even though the duke's cross-Channel position and obligations were
  more complicated than an ordinary hierarchy edge.
- Southern Italy is divided between Norman Apulia/Calabria, Benevento, the Papacy, and
  Byzantine Bari at the chosen instant. Sicily is split between Muslim authority and
  Norman footholds; the county cells cannot show the rapid, local sequence of conquest.
- Iberian taifa states are aggregated around the major courts. Frontier lordships and
  tribute relationships could change faster than the game's county granularity.
- Kievan Rus is represented as a senior Kievan realm with important princely
  sub-realms plus independent Polotsk. Appanage precedence is compressed into the
  engine's single-parent liege hierarchy.
- Baltic, Finnic, steppe, Caucasian, Arabian, Saharan, and Horn of Africa frontiers are
  especially approximate. Where no secure individual ruler for an authored tribal
  polity was available, a conventional, representative, or later-attested name is used
  and should not be read as a firm identification.
- Selected counties carry ordered, static culture-and-faith communities for character
  creation; the curated 1066 set and sources are recorded in
  [county-communities.md](county-communities.md). The first pair remains the principal
  county identity used by simulation. The model does not claim population shares and
  still leaves local rites, conversion, migration, unrest, and demographic change
  below its scope.
- Development is a relative **1–10 gameplay index**, informed by urban, agricultural,
  and trade importance. It is not a population estimate. The 1066 values generally
  raise established towns and core farming regions from their 867 baseline without
  pre-building holdings or assigning technologies.

## Stable-id policy

An enduring county keeps its 867 id even where its name, owner, culture, faith,
terrain judgment, de jure placement, or development changes. A genuinely different
future geography must receive a new id; a retired id is never recycled. Precise
scripted events likewise require stable bookmark-local ids so inserting or reordering
history cannot change saved once-only flags or durable message identities.
