# Spring 451 beginnings

Spring 451 is hidden from the ordinary date picker and new campaign codes. When
the date is explicitly enabled for review, it offers four personal beginnings
alongside the generic farmer. Each personal beginning uses the ordinary picker,
fixed birthplace, family selection and start code, with a native storyline in
Deeds and a matching optional opening profile.

| Beginning | Identity and family | First decision |
| --- | --- | --- |
| Attila | Existing central-following principal at Sirmium, simulated age 50; protagonist only | Propose actual coalition terms or defer without spending |
| Aetius in court service | Existing western court member at Ravenna, simulated age 60; protagonist only | Review consent under the existing finite service warrant; actual contract eligibility still applies |
| Gothic soldier household | Fictional Gothic/Homoian household at Toulouse, age 24; unmarried or established | Select ordinary garrison work; wages require actual work |
| Aurelianum civic household | Fictional Gallo-Roman/Nicene curialis at Aurelianum, age 30; unmarried or established | Select Keep records in Deeds. A paid day of work at home completes the opening goal. |

Named selection reuses the original person. Attila uses `mobilePrincipal`, keeps
the countyless coalition's institutional identity and public account, and does
not receive a fictitious county or extra forces. His private career slot supplies
ordinary livelihood only. No named spouse, heir or household carriage is invented.
Aetius uses `existingPerson`, retaining his dated appointment and its original
360-day limit. He is neither emperor nor commander of an authored host.

The civic and tenant declarations use their counties' authored `gallo_roman`
community. The soldier uses Toulouse's explicit Gothic/Homoian minority.
Start codes preserve the chosen resident community.

The fictional household definitions also attach `gallic_household_party_451`. This is
an eight-person, ninety-day invitation plan using the existing voluntary adult
and actual caregiver consent rules. It starts empty. Association grants no
movement, camp place, shelter, military admission or release from estate duties.
No refuge provider or funded journey is declared. Cancelling a review spends
nothing; existing story sheets retain their shared Back, Escape and Close paths.

The soldier profession supplies ordinary work, not an opening federate contract,
enlistment receipt or command. Local work stories observe real war and changed
sovereigns; selecting a focus alone does not finish their earnings goals.

The civic household starts with 80 private gold, 30 prestige and 10 piety.
Choosing Keep records costs no gold or time. The ordinary daily focus pays the
household for work and the story observes those earnings. Council appointments
and the court's relocation decision require their own authority and reviews.
The opening reuses the existing `none` technology decisions for civic careers,
household decisions and paid household work. The independent Ravenna ledger
example uses the same work rules through an ordinary JSON import, as described
in [the dated story design](bookmark-451-story-tracks.md).

## Held beginnings and capabilities

| Beginning or capability | Reason |
| --- | --- |
| Ardaric, subject principal | His personal faith remains unestablished. Neither a Homoian substitution nor a different named principal is offered. |
| Arles tenant household | The estate archetypes in `data/economy.js` admit only 476 and 493. `js/events.js` cannot initialize a matching 451 colonate tenure or living possessor from these declarations. No tenant label substitutes for actual estate duties. |
| Valentinian III, Theodoric and Marcian | The dated story set holds their court agendas: the current nonmobile agenda contract advances on priority acknowledgment rather than canonical transaction evidence. Complete matching personal graphs and opening profiles are absent. No reduced ruler start substitutes for them. |
| Camp household | No dated complete camp household graph and opening profile is present. The camp-household reader observes residence and presence, granting no membership or whole-family carriage. A nearby farm is not offered as a following household. |
| Aetius as host-scoped western commander | His dated court-service warrant commissions no forces. The offered court-service perspective retains that limitation. |
| Opening federate service | The existing declaration requires a broader court-settlement story and its host. The soldier beginning promises neither a standing contract nor paid enlistment. |
| Camp carriage and refuge | Household association alone supplies neither a civilian admission/migration carrier nor a dated provider, seat and finite shelter terms. |

Six perspectives remain held. The Arles tenant declaration retains `hidden:true`,
its family presets and graph attachments. Ardaric, Valentinian III, Theodoric,
Marcian and the camp household have no scenario declarations. The date review
uses the normal start rules with `reviewOpenStarts` disabled, so those six
perspectives remain unavailable in the review picker and by code.

The court, contract and camp boundaries are also described in
[the dated story design](bookmark-451-story-tracks.md). Existing government,
mandate, work, colonate and household-party capability decisions continue to
apply; these declarations introduce no independently gateable mechanic or save
format. Start prose uses the existing structured-text owner. The party reuses
shared exact English display sources through its existing story renderer,
without new extractor registration. English fallback remains available and no
generated catalogue changes are needed.

Focused fixture coverage enumerates the offered and held ids, validates each
runtime start, boots every offered personal family preset, rejects the held
tenant's code, checks the displayed start code and original named actors, and
reaches the first shared story decision. It checks optional profile and
household-party attachment and the absence of commissioned forces. The civic
journey checks date visibility, the review picker, paid work and resumption
from the title with the original person, family and earnings.
