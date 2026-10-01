Scheduled tournaments and regional games

Purpose and scope

Replace newly selected instant invitations with scheduled seven-day gatherings at named established settlements. Baron and higher rulers may host single editions or annual series. Free adults, including rulers, may travel between editions and compete, perform, trade, work or socialize. Serfs may attend qualifying games in their home county while remaining subject to customary duties. No new building, permanent profession, automatic grant of land or rank, or external runtime asset is introduced.

Historical presentation

Regional martial games are available from 867. Programmes reflect the venue culture and faith: martial exercises and open games at the baseline, mounted martial games in appropriate courts, and western tournament presentation in later centuries. Formal jousting remains an optional advanced contest requiring the venue sovereign's cavalry_lances technology. Previously accepted entries are grandfathered. Melee, open archery, wrestling and social activities provide ungated alternatives.

Nithard describes organized martial exercises involving Louis and Charles and their followers in 842. This supports early martial games, not universal ninth-century formal jousting. https://fr.wikisource.org/wiki/Page%3ANithard_-_Histoire_des_fils_de_Louis_le_Pieux%2C_trad._Lauer%2C_1926.djvu/139

The Metropolitan Museum's Court and Cosmos supplies context for courtly martial skills and entertainment in the medieval Islamic world. Regional presentation must not imply that western lists were universal. https://resources.metmuseum.org/resources/metpublications/pdf/Court_and_Cosmos.pdf

Harvard's Tournament in the Romances of Chretien de Troyes and L'Histoire de Guillaume le Marechal describes the travelling knightly circuit, team melee, captures and negotiated monetary obligations, and distinguishes its twelfth-century form from later spectacle. https://chaucer.fas.harvard.edu/pages/tournament-romances-chr%C3%A9tien-de-troyes-lhistoire-de-guillaume-le-mar%C3%A9chal

FitzStephen's description of London documents urban recreation and martial exercises. It supports open local games, not the exact admission rules used here. https://buildinghistory.org/primary/fitzstephen.shtml

Worcester Cathedral Library discusses records of visiting players, minstrels and entertainers. It supports itinerant entertainment and patronage, not one uniform festival economy throughout the map or period. https://worcestercathedrallibrary.wordpress.com/2025/08/26/play-on-companies-of-players-minstrels-and-other-entertainers-visiting-the-medieval-cathedral/

Seven-day duration, regulated prize pools, sponsored commoner admission, local serf participation, protected monetary forfeits, unified capacity and the universal peacetime restriction are explicit gameplay adaptations. The historical references do not establish these numerical rules.

Hosting and review

Host games... appears in ruler Deeds and eligible settlement sheets. The host must be alive, adult, tier 3 or higher, free from imprisonment, in peacetime, and the actual direct owner of the established venue. County sovereignty alone does not confer another baron's settlement. Staff can organize a remote edition; personal competition, patronage and social encounters require physical attendance.

The player chooses venue, scale, programme, start date and optional annual recurrence. Starts require 60 to 180 days' notice and must fall in spring or summer. The event lasts seven days, with an inclusive opening and exclusive closing turn. A host can fund only one active edition; successive starts must be at least 360 days apart. A review shows all eligibility blockers, the exact income calculation and allocations, remaining treasury, capacity occupants and their closing dates, and the annual spending ceiling when applicable. Confirmation recomputes and matches the reviewed quote before atomically reserving capacity and charging. Stale reviews spend nothing.

Funding

Let I = max(0, current recurring net seasonal income projection, arithmetic mean of the most recent one to four recorded recurring seasonal samples). Older saves without samples use the current projection. Samples represent underlying economic values in the host's real accounts, not total cash movement or display-scaled money. Include represented property, enterprise, wage, office, tax, toll and vassal receipts after ordinary recurring expenses. Exclude daily focus income, temporary campaign spending, loans, asset sales, gifts, tournament earnings and other one-time transactions. Record no more than four samples per host.

Local: tier 3+, any established settlement, minimum 500, income multiplier 2.

Regional: tier 4+, town or city, minimum 2500, income multiplier 4.

Grand: tier 6+, city, minimum 10000, income multiplier 8.

Funding = ceil(max(minimum, multiplier * I) / 25) * 25. Once paid, funding and promised purses are frozen even if income, technology, rank or treasury later changes.

Prize reserve = floor(funding * 0.50). Service reserve = floor(funding * 0.30). Headline prize = floor(prize reserve / 2), archery prize = floor(prize reserve / 8), wrestling prize = floor(prize reserve / 8), performer awards = floor(prize reserve / 4). Preparation and hospitality receive funding minus the sum of actual prize allocations minus the service reserve, including all rounding remainders. Preparation is committed at announcement. Unawarded prizes and unspent services return to the host on completion or cancellation; completed services and legitimately awarded prizes remain earned. Reserved payments carry unique saved settlement keys so neither reload nor stale choices repeat them.

Service reserves cover the whole workforce, not a single protagonist's windfall. Contracts use ordinary work rates with a festival premium and bounded prestige commissions. Larger budgets support more workers and commissions. Carrying, kitchens, stables, repairs, guarding and treatment have distinct skill/career requirements; specialist contracts preserve career restrictions. Entrant difficulty responds to purse size, host reputation and scale. Completing an event and handling its incidents may reward prestige, county Popular support and named guest Standing, never automatic land or rank.

Annual series

Save venue, scale, programme, calendar day and an explicit maximum spending amount. Attempt the next edition's renewal exactly 60 days before its scheduled start, allowing restoration to catch up once. Recheck price, peace, eligibility, ownership, treasury, host spacing and shared capacity. An unsuccessful attempt skips that year without charging and advances the intention by 360 days. Unfunded annual settings never occupy capacity. Stopping recurrence does not cancel a funded edition. Eligible successors retaining the venue may inherit funded commitments; future annual funding always requires a fresh renewal check. Death and succession never duplicate cash or substitute a visitor in a pending round.

Shared capacity

All player and AI hosts use the same booking transaction. Funded editions occupy slots from announcement until closing or cancellation, not merely during festival days. Count settled counties in the venue's de jure kingdom in the active world definition, independently of current sovereignty. For N counties, all events have max(1, floor(N / 5)) slots; regional and grand together have max(1, floor(N / 10)); grand alone have max(1, floor(N / 15)). A grand edition consumes all three nested pools.

N=5 gives 1/1/1; N=15 gives 3/1/1; N=30 gives 6/3/2; N=45 gives 9/4/3. There is also one active edition per county and a worldwide maximum of 64. Counties without a de jure kingdom share a two-slot frontier pool, local editions only. Conquest and political fragmentation do not create slots. Changing the active world definition recalculates limits; existing funded commitments are grandfathered and further bookings are blocked while at or above a limit. Completion and cancellation immediately release slots.

AI checks candidates seasonally in stable order with a saved rotating regional cursor. It uses actual host accounts and preserves fiscal reserves. Seeded decisions, wealth, peace and host cooldown determine frequency; capacity is a ceiling, not a target. AI participation and outcomes resolve without player modal chains.

Peacetime eligibility

One shared read-only calculation is authoritative for reviews, confirmation, registration, attendance, departure, onward travel, AI, queued choices and lifecycle reconciliation. A character is blocked by personal war or military service; war involving the character's realm, ruling chain or household home county's ruling chain; war involving the host's ruling chain or venue's governing chain; a siege or hostile occupation at the venue. Include active ordinary wars, active great holy war participation and armed rebellions. Threats, truces and unarmed unrest do not count. Resolve political allegiance separately from de jure capacity geography. Apply identically to nobles, commoners, serfs and AI. Spectating, performing, trading, work and patronage confer no exemption. Calendar browsing remains available and identifies the specific wartime blocker.

Reconcile at war transitions, on save restoration and before daily tournament travel. If host or venue becomes ineligible, cancel the whole edition and release capacity. If only a visitor becomes ineligible, withdraw that visitor and continue an otherwise eligible edition. Invalidate pending rounds, jobs, sponsorship choices and exact event contexts before further choices or payouts. Refund unused entry payments and unspent participant commitments, preserve earned prizes/completed contracts, and apply no voluntary-withdrawal penalty. Keep annual settings and skip wartime editions. Peace restores future eligibility, never resurrects a cancelled booking or charges again automatically.

Tournament travellers start physical forced returns using the reserved allowance before generic travel cancellation. Wartime entry remains forbidden, but that return is permitted. Keep the current physical county and return route; never teleport home on a war transition. Death, captivity and succession retain their existing overriding lifecycle rules. Local attendance neither creates travel nor alters a different journey's obligations.

Discovery and navigation

An independent Events map overlay preserves political and market views. Distant markers cluster; close markers anchor to exact settlements. Keyboard-accessible controls and the matching Deeds calendar provide Upcoming, Reachable, Local and My bookings filters. Event sheets show venue, host, dates, programme, actual remaining and promised purses, named entrant field and difficulty, admission rules, journey costs, arrival estimate and wartime blockers. Calendar, sheet, review and Back/Cancel/Not now use shared modal history so filters, selection, scroll and focus are restored. Native controls, focusable blocked actions and shared Details patterns remain accessible on mobile and keyboard.

Tournament journeys

A targeted, repeatable tournament purpose accepts free adults at tiers 1 through 7. Reuse county routes, transport quotes, road incidents, exile restrictions and physical location. These journeys bypass the ordinary annual departure cooldown and 90-day destination stay, and do not consume an ordinary journey's cooldown. Quote outbound costs and reserve a return-home allowance at departure. At a venue, onward travel requotes from the current physical county to another eligible scheduled event while preserving the household home and replacing the return reserve only through a disclosed difference. Onward travel cannot target arbitrary counties. Arrival after opening permits remaining festivities but cannot admit a competitor once that competition has begun.

At closure, permit onward booking or funded return. After three days without another booking, start the funded return automatically. Returning consumes the reservation once; route movement, incidents, death and captivity stay in the ordinary travel engine. Exile constraints continue to apply to homeward routing. Tournament attendance at a local venue leaves other travel records and household location untouched.

Admission and attendance

Hosting, watching, patronage, performance, trading and ordinary work are open to adults of either sex. Armed contests and wrestling require adult men. Elite contests require tier 2+ with qualifying skill, equipment and health. Free commoner men can receive event-specific sponsorship after completed Soldiering training, Martial 8 and either a recorded open-competition victory or at least 40 Standing with the actual host. Sponsorship supplies equipment access and backing for that edition without promotion. Serfs can watch, work, and enter open archery or wrestling only in their home county; duties are neither cleared nor delayed by attendance.

Each participant may choose one primary competition or livelihood per edition plus bounded social decisions. Admission, contract and entry payment are explicit, fixed and stored. Accepted formal jousts keep the cavalry_lances permission if technology later changes. No rank, acreage, levy size or army strength enters individual contest performance.

Competitions and work

Each competition has eight named entrants and three meaningful rounds. Jousting and wrestling use elimination brackets, archery uses cumulative scores across three rounds, and melee uses team phases. Save entrants and results, never regenerate opponents during previews. Shared preview/resolution calculations use relevant individual skills, traits, worn equipment, health, fatigue, opponent ability, preparation and tactics. Conservative, balanced and aggressive tactics trade performance against fatigue and injury. Rest/preparation, teammate assistance and withdrawal are explicit choices. Injury previews include rare severe wounds that may cause death through the ordinary health system. Skill improvement is capped at one increase per completed edition.

Performing uses Diplomacy and Learning with bounded award/commission payouts. Trading uses the existing merchant and market mechanics, with capital at risk disclosed. Work contracts pay only for completed service and consume their reserved amounts once. Tournament captures resolve only through disclosed bounded monetary forfeits; never create wartime imprisonment or silently confiscate heirlooms. Track circuit victories, earnings and reputation per protagonist, retaining no more than eight recurring contacts. Close abandoned participant references when the edition ends.

Authored choices

Keep data/events_tournament.js as the authored-choice pack. Include preparation disputes, field damage, security, equipment trouble, rivals, disputed results, injuries, commissions, recruitment, patron introductions, wagers or faith-appropriate gifts, and celebrations. New invitations name an actual scheduled edition. Legacy tournament_invitation and tournament_invitation_lord remain resolvable for queued old saves but use never triggers for new random selection. Every scheduled choice identifies event id, protagonist id, track/contest and exact round or incident serial. Revalidate before all effects and reject duplicate or superseded resolution.

Architecture and interfaces

data/tournaments.js owns scales, programmes, contest rules, work contracts and bounded simulation constants on FBDATA. js/tournaments.js owns additive records and public FB.tournaments operations. Read interfaces include event lookup, list/calendar, host quote, capacity, eligibility, entry quote, round preview and travel quote. Mutation interfaces include ensure/restore, book, set/stop annual, enter, prepare, resolve round, social/incident resolution, withdraw, cancel, reconcile, seasonal planning/sampling and daily progression. Preview methods never consume RNG, spend money, create participants or mutate saved records. Mutators reuse the same quote/eligibility inputs and transact once. js/travel.js owns actual journey progression; UI only invokes the public engine interface.

Additive format-3 state records store monotonically increasing edition ids, events, frozen funding buckets, participants, brackets/progress, paid transaction keys, annual intentions, last host starts, four income samples, AI cursors and bounded finished summaries. Player circuit records store protagonist id, totals and up to eight contacts. Do not store localized prose or DOM state. Protect live host and participant character ids from cleanup and release those roots after closure; keep bounded detached summaries for history. Major victories and hosting milestones use durable news descriptors and ordinary life-history facts.

Daily order: reconcile tournament war/lifecycle eligibility before travel; advance ordinary travel; progress tournaments before selecting story events. Season boundaries sample recurring income and attempt AI planning. Save restoration normalizes optional records, invalidates stale contexts and reconciles war before any journey can advance. Simulation mutations alone use FB.rng/FB.ri/FB.pick. AI events do not create modal backlogs. Public mod documentation describes schemas, stable ids, load order, extension contracts and limits.

Technology review

Hosting/annual series/capacity: none, ordinary civic and courtly gatherings require no credible universal research gate. Targeted circuit travel: none, itinerant personal travel is baseline. Regional martial games and open competitions: none, early exercises remain playable. Formal jousting: hard cavalry_lances under the venue sovereign, with martial games, archery, wrestling and social alternatives and accepted-entry grandfathering. Sponsored entry: none, patronage is social admission rather than an invention. Festival performance, work, trade and patronage: none, reuse existing livelihoods and market capabilities and their existing restrictions. Record each independently gateable capability in FBDATA.techImpactReviews before implementation.

Compatibility and delivery

Keep classic scripts, zero runtime dependencies, synchronous deterministic simulation and file:// loading. Register data and engine scripts in index.html, offline assets and all named deployment allowlists. Keep ordinary itch/play assets and CrazyGames flag-gated packaging isolated. No private workspace files or site content may enter the game repository. Route UI text through FB.T, structured display fields through dataText and durable messages through FB.msg. Existing generated catalogs may fall back to English; regeneration needs its separate owner request. Update events, travel, economy/finance, time, state/save, technology, map/UI and mod design documentation. A specification-only edit needs no version bump; implementation follows integration-owned version/changelog rules.

Acceptance coverage

Author deterministic browser-harness coverage for funding floors, multipliers, 25-unit rounding, four-sample history, exclusions of nonrecurring transactions, old-save projection fallback, frozen prizes, allocations, finite whole-workforce contracts and annual ceilings. Assert cancelled or repeated transactions never mint money.

Cover capacity at 5/15/30/45 counties, nested grand/regional occupancy, announcement occupancy, one-per-county, frontier and world caps, shared AI/player booking, stale quote atomicity, immediate release and conquest without additional slots. World-definition changes grandfather active commitments but prevent overbooking.

Cover personal war/service, home county/realm/liege chain, host realm/chain and venue governing chain; ordinary wars, active holy wars and armed rebellions; exclude threats and truces. Begin war during announcement, outbound travel, registration, competition, work and renewal. Assert whole-event cancellation versus visitor-only withdrawal, unused refunds, preserved earned rewards, released slots, invalid pending choices and physical forced returns. Peace restores eligibility without resurrecting bookings or duplicate charges.

Cover direct settlement ownership, eligible succession, adults/sex/station admission, serf locality and unchanged duties, sponsorship skill/training/victory-or-Standing, accepted technology grandfathering, eight entrants, three rounds, tactics/fatigue/teamwork, injury health effects, one skill increase per event and exactly-once payouts.

Cover journey deadlines, late admission, onward costs and preserved home, three-day automatic return, exile, ordinary cooldown/stay compatibility, local attendance with other journeys, save/load mid-round and mid-return, legacy invitation ids, bounded contacts/history/records and unchanged RNG/state for all previews.

Cover Events overlay independence and clustering, exact settlement anchors, all calendar filters, keyboard/mobile labels, modal list position/focus restoration, English fallback, standard and CrazyGames script registration and file:// loading. Owner playtesting assesses hosting costs against developed household and ruler incomes, event scarcity, circuit earnings and wartime interruption. Tests are authored but not executed by agents, including syntax gates, runtime checks and ad hoc browser/server runs, under AGENTS.md's owner-controlled policy.
