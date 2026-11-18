# Local decisions in the 451 world

The dated pack contains 22 once-only household events. Its explicit late antique
window is 451-453, and `bookmarkIds:['451']` binds it to the original campaign.
Reaching 451 in another campaign never adds this pack, including after complete
catalogue preparation and current-content restoration. The source retains its
registered deferred event-pack boundary and literal declaration order.

## Audiences and choices

Every event combines a county selector with `county_holder_government`. Roman
civic holders serve Ravenna, Arelate, Aureliani, Lutetia, Lugdunum, Aquileia,
Augustobona, Thessalonica, Constantinople, Antioch, Alexandria and Rome. The
Durocortorum scene instead requires a regnum holder; Sirmium requires the local
lineage-kingship custodian. These are live holder requirements, independent of
sovereign titles. A missing or differently constituted holder excludes the scene.

Requisition, gate, road and displaced-traveler scenes also require the actual
local sovereign to be at war. They do not predict the army’s route, a siege,
the closing of a gate or a compulsory departure. The Sirmium workbench and
household collection accounts describe settled work beside the staging ground,
without awarding provisions or receipts to the mobile following. Thessalonica’s
collection questions distinguish household arithmetic from public demands.
The local bishop’s proposed mediation remains a proposal: the bound local
priest hears concerns but is not granted a bishopric or diplomatic commission.

Five purchases add existing household property: letters in Ravenna and
Constantinople, craft tools in Arelate and Sirmium, and a hearth garden in
Lugdunum. Existing prices, duplicate-property restrictions, adult household
station and craft-role requirements apply. Three further decisions buy useful
household preparation for one private coin: an Aureliani gate list, Lutetia road
notes and a Thessalonica reserve list. Their flags each add fifteen percentage
points to the corresponding later named chance, capped at 85%. This gives eight
non-scalar decisions without inventing a public transaction. Preparation cannot
be purchased twice; refusal retains the household’s resources.

All five named chances start at 50%, add two percentage points per relevant
Diplomacy, Stewardship or Learning, and clamp to 10-85%. Only the three explicitly
paired preparations add a flag bonus. Skill checks describe understanding and
personal goodwill, never guaranteed passage, payment, mediation or an official
verdict. Required friend and priest participants bind existing local people with
no creation fallback. Their saved identities and portrait cards remain exact;
personal Standing changes affect only that bound person.

## Church reports and historical limits

The five church scenes are narrower: winter in 451 or 452. This deliberately
conservative news delay follows the conventional autumn 451 council window;
it avoids placing completed deliberations in the spring opening. They report
arguments, letters and proposals. They impose no historical council outcome,
deposition, religious conversion or communal change. Rome receives reports in
the same winter window; no exact courier travel date is claimed.

These are fictional local incidents informed by Priscus’s account of the
Danubian court and village provisioning, Salvian’s account of fiscal pressure
and displacement, Jordanes’s later account of the 451 Gallic campaign, and the
letters and acts associated with Chalcedon. Local prices, meetings, private
lists and particular travelers are simulation choices, not recovered dated
incidents. The accounts’ different dates and partisan perspectives do not
establish universal tax rates or exact routes. No historical surrender, border,
office, personal death or doctrinal settlement is scripted.

Technology impact is **none**: these configurations reuse household property,
pure event observations, bound relationships and named chances. They introduce
no independently gateable gameplay capability. Reusable imperial office,
federate, mobile-coalition and imperial-service decisions remain with their
shared packs and canonical system reviews.

## Event inventory

| Local setting | Event ids |
| --- | --- |
| Ravenna | `ravenna_requisition_copy_451`, `ravenna_double_demand_451` |
| Arelate | `arles_wagon_repairs_451`, `arles_river_news_451` |
| Aureliani | `orleans_door_list_451`, `orleans_gate_hearing_451`, `orleans_bishop_petition_451` |
| Lutetia | `paris_road_notes_451`, `paris_road_inquiry_451` |
| Durocortorum | `reims_displaced_meal_451` |
| Lugdunum | `lyon_household_plot_451` |
| Aquileia | `aquileia_lodging_451` |
| Sirmium | `sirmium_workbench_451`, `sirmium_collection_accounts_451` |
| Thessalonica | `thessalonica_reserve_list_451`, `thessalonica_collection_query_451` |
| Constantinople | `constantinople_church_copy_451`, `constantinople_church_questions_451` |
| Antioch | `antioch_church_messenger_451` |
| Alexandria | `alexandria_church_waiting_451` |
| Rome | `rome_church_correspondence_451` |

## Presentation and regression coverage

Literal event titles, prose, labels and outcomes use the existing structured
event localization owners. Currency uses typed money placeholders. The shared
event sheet supplies consequence previews, participant portraits, keyboard and
compact-screen controls; each scene retains an unconditional costless leave
option. No new modal or navigation path is introduced.

The declarative pack fixture covers every event’s positive and negative reader
facts, county, era, inclusive year bounds, missing holder, war requirement where
applicable, church season delay and other-campaign exclusion at the same live
year. The shared validation spec retains its common assertions and registers
this fixture. Additional isolated cases exercise private purchases/preparation,
refusal, affordability, duplicate prevention, chance bonuses and two actual save
restores with retained costs, property, flags, identity, RNG and UID.
The dated isolation spec separately restores the real 451 campaign after warming
a foreign pool, checks queued delivery and the restored pool, and tests every
other prepared campaign’s direct, queued, option and random routes at the same
year without changing the positive local facts. Owner play, visual and device
acceptance remain separate from these focused regressions.
