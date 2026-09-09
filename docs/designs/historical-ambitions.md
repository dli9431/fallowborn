# Historical ambitions

Historical ambitions recognize significant regional foundations in an alternate
campaign. They are optional ruler decisions, not accepted quests or dated conquests.
The existing scripted-history scheduler remains separate.

## Cards and resolution

Count-or-higher rulers have one **Historical ambitions…** deed. Its modal lists
geographically relevant cards, including unmet objectives. A card requires a county
held by the ruler or a subordinate vassal in its region; Normandy additionally
requires Norse culture. Superior lieges' unrelated lands never count. Completed
player foundations remain visible after land or culture changes while the player
remains Count or higher; other completed foundations appear when regionally relevant.

Cards show current/required county counts, unmet blockers, recognition costs, title
change, prestige reward, and regional bonus. Descriptions and the full prerequisite
audit use the shared desktop hover/focus tooltip and compact question-mark disclosure.
The title disclosure explains deadlines and bonus scope. Expanded card details survive
completion and acknowledgement alongside scroll and focus.
The named action is disabled until ready. Opening the list is free. Completion is
immediate, consumes no day, and requires a living adult player at home and outside
captivity. All foundations require peace, including the sovereign's wars and holy
wars. The list and success sheet pause time. Continue, Escape, and mobile Back
return from the settled result to the refreshed list, retaining scroll and focus.
Closing the journey restores previously running time subject to the auto-resume
preference. Double activation cannot charge or award twice.

## Initial foundations

| Foundation | Territorial and political requirements | Reward |
| --- | --- | --- |
| Normandy | Norse ruler; Rouen and the existing ducal threshold (at least two counties and half the duchy rounded up); independent or sworn to a king/emperor | Duke if needed; 150 prestige; +10% local county tax for 1,800 days |
| Norway | Independent; 75% of de jure Norway rounded up | King if needed; 250 prestige; +10% local county levy capacity for 1,800 days |
| England | Independent; 75% of de jure England rounded up | King if needed; 250 prestige; +10% local county tax for 1,800 days |
| Sicily | Independent; existing kingdom majority; at least half of the island duchy rounded up; at least one Apulian or Calabrian county | King if needed; 200 prestige; +10% local county tax for 1,800 days |

Recognition reuses ordinary rank restrictions and the full price of crossed ranks.
The regional target is explicit, even if another kingdom or an empire could be
claimed. Already holding the required rank removes the recognition charge; higher
ranks are never reduced. Rewards cannot pay the prerequisite price. Completion
does not grant unheld land, force conversion, or create soldiers.

Each foundation has technology impact **none**, recorded separately as
`historical_normandy`, `historical_norway`, `historical_england`, and
`historical_sicily`: territorial recognition is baseline political progression,
not a researched capability. Ordinary territorial expansion is the route to meeting
these objectives; there is no additional technology eligibility gate.

Normandy draws on the Norse foundation around Rouen; Sicily draws on a crown
uniting island and mainland possessions. These are campaign adaptations, not
precise reenactments or claims that a duchy appeared fully formed in one act.
References: [Normandy](https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Normandy)
and [Roger II's kingdom](https://assets.cambridge.org/97805212/62842/excerpt/9780521262842_excerpt.pdf).
The East–West Schism is outside this release: changing religious recognition
requires a separate design, rather than another territorial-reward card.

## Lifetime, scope, and AI

There is no earliest historical year or expiry date for an unfinished ambition.
Each completes once globally per campaign. All four start unfinished in 867;
Normandy, Norway, and England start established without rewards in 1066. Older
saves use their starting bookmark, never the current year, to initialize defaults.

Bonuses apply to currently controlled counties in the named region, including
later acquisitions and subordinate vassals. Local tax follows ordinary distribution.
Levy bonuses increase ordinary muster capacity, not existing hosts. Lost counties
stop benefiting; reconquest restores the bonus only before the original deadline.
Succession preserves it; dynastic absorption into the player's realm transfers the
record. Realm dissolution expires its bonuses, so reusing the realm ID cannot
revive an old reward. Conquest does not transfer the foundation reward.

AI checks relevant foundations once per season in authored ambition order and
sorted realm-ID order, including Observe mode. The first eligible ruler completes
the foundation. Territorial, cultural, peace, and liege rules are shared. AI uses
its existing realm rank model rather than introducing player-style treasury,
prestige, or piety accounts. It receives the regional bonus and world news, with
no player success interruption. AI levy bonuses feed its ordinary host projection;
AI tax bonuses use the county tax path wherever income is distributed.

## Boundaries

`data/ambitions.js` owns definitions; `js/ambitions.js` owns pure relevance/status
queries, completion, saved defaults, reward scope, and seasonal AI. Full player
eligibility is checked only on modal open/refresh and action activation. No
player readiness badge or periodic player scan exists. County bonus reads only
inspect completed records and never evaluate unfinished ambitions.

`FB.rankElevationStatus` accepts an optional `region`, carried through
`FB.rankElevationContext` and validated at claim time. `FB.claimRankElevation`
accepts `{combinedResult:true}` to omit its separate investiture result when the
ambition success sheet owns acknowledgement. Ordinary title deeds keep their
existing selection, price, and result behavior. The chosen regional primary title
is used only while its normal territorial qualification remains valid.

Save format stays 3. Completion stores semantic IDs and numbers, with durable
localized Chronicle descriptors for the foundation and actual player costs/rewards.
All four foundation announcements snapshot the completing character's name (the
player's full name or the AI ruler's name), preserving attribution after succession.
The legacy message parameter remains compatible with existing catalogs and saves;
older entries containing only a realm name retain their original attribution.
The extractor recognizes `ambition.<id>.name.default` and `.desc.default`; no
catalog regeneration is required to play in English or use English fallback.
