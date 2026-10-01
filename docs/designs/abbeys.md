# Abbeys and noble women's communities

Catholic women can turn religious service into institutional political power.
The existing monastic rank indices remain unchanged. An abbacy is a separate,
non-hereditary office, with an endowed house that survives its holder. Existing
Abbess ranks qualify for office without manufacturing inherited estates on load.

Historical models are Gandersheim and Quedlinburg (family patronage, contested
appointments and privileges), and the continued authority of Fontevraud after
1100. See [Sarah Greer's research](https://doi.org/10.17630/10023-10136),
[Quedlinburg's account of women's communities](https://media.domschatzquedlinburg.de/en/detailpage/who-worked-at-the-collegiate-school-of-quedlinburg)
and [Fontevraud](https://www.fontevraud.fr/labbesse-de-fontevraud-figure-de-la-vie-monastique/).
These are bounded gameplay abstractions, not a universal medieval constitution.
Patronage, temporary residence and religious profession are separate commitments.
No calendar cutoff removes women's authority in 1100.

## Technology decisions (before implementation)

Each independently usable capability has a `none` review: `abbey_appointments`,
`abbey_foundations`, `abbey_endowments`, `abbey_residents`, `abbey_estate_management`,
`abbey_schooling`, `abbey_relief`, `abbey_mediation`, `abbey_patronage`,
`abbey_privileges`, and `abbey_succession`. These depend on personal competence,
religious institutions, property, consent and relationships; sovereign research
does not credibly gate them. Existing property acquisition gates remain intact.

## Institutional contract

One house per county, at most twelve active houses, bounds simulation and save
growth. Houses are established by an explicit foundation or an application to
an existing local religious community; merely browsing does not create a house.
They hold their own treasury, capital endowment, donated plots, community support,
patron dynasty, holder, privileges, residents and dated relationships. No county
ownership or independent realm is fabricated. Royal protection and papal exemption
grant institutional benefits; neither is a territorial sovereignty title.

Appointments use Learning, service or mature noble administrative experience,
piety, prestige, community support and patronage. Donation never guarantees office.
An unmarried or widowed qualified woman can stand for election. Office entails
permanent vows; a lay founder need not take vows. A house-only abbess receives
tier-3 office compatibility, with ordinary secular title, tax and war shortcuts
excluded as for a personal bishopric. Private secular titles can coexist.
The existing Work election delegates to this same appointment; it cannot bypass
the house, vacancy or vows. Copy manuscripts and Serve the faithful remain available
to an abbess, and Serve the faithful is the default for an office-only household.

Foundations and donations are permanent. Donated freehold plots cease paying the
family and pay the institution instead; pledged property is unavailable. No loan
collateral, county title or other person's property can be donated. A house pays
its upkeep and a bounded office allowance from available resources. The holder
can manage rents, schooling, relief, mediation and patronage. Cooldowns, exact
costs and tradeoffs are exposed before decisions.

Named noble pupils and adult guests join for fixed terms with an explicit
acceptance chance and capacity/upkeep. Temporary residents take no vows and
retain marriage eligibility. Their home and personal connections survive departure;
schooling teaches pupils, and hospitality builds relations with actual patrons.
Refuge may provoke the named local lord. Institutional disputes require a choice
of defense, mediation or concession; privileges improve protection.

Death or retirement vacates the abbacy, retaining the institution and endowed
assets. The family can nominate a qualified relative in a contested election;
an unattended vacancy eventually receives a qualified religious successor.
Dynastic inheritance never transfers the abbacy automatically.
An unattended vacancy lasts a year. A recent election petition leaves one full
season to retry after its one-year cooldown before automatic succession can act.

## Interface and persistence

The Abbeys deed, Work and Self lead to the same responsive management sheet.
Shared review cards expose office, treasury, gross revenue, upkeep, allowance,
residents, support and privileges. Permanent endowments and appointments receive
a review and outcome. Permanent capital, donated plot counts and lasting named
connections with their current Standing remain visible on the house sheet.
Back, Cancel, Escape and character-sheet returns preserve
scroll, disclosures and focus. Saved state contains only ids, proper names,
numbers and message descriptors. Restore is RNG-neutral and creates no people
or houses. Standard and CrazyGames distributions share these mechanics.

## Initial balance and bounds

Every value below lives in FBDATA.abbeys (data/economy.js), including each
estate action's effects. The engine and the review text read the same record, so
rebalancing never leaves a displayed cost stale.

A foundation costs 160 family gold and 80 piety standing (not spent), starts
with 80 permanent capital and 40 treasury, and grants 10 prestige. Capital pays
5% per season; an existing community starts with 12 estate rent and 40 treasury.
Base upkeep is 4, and the office allowance ceiling is 6. An allowance is paid
only from funds remaining after current upkeep and is included in the ordinary
seasonal budget exactly once. Endowments add 8 piety and 5 community support.

The house has three temporary resident places before privileges. Pupils aged
6–15 stay 720 days; unmarried adult guests or refugees stay 360 days. Admission
requires a known noble lay person in the county, outside the managed household.
Each resident costs 2 each season; invitations have a 180-day cooldown including
refusals. Successful hospitality strengthens named sponsor connections; natural
completion preserves those connections and gives a further relationship benefit.
Marriage, accession to a ruling office, death or insolvency also ends residence.
Departure settlement occurs at season boundaries. Refuge can provoke an existing
local lord, costing Standing and opening an institutional dispute.

Estate actions use abbey funds: extra rents add 8 but cost 8 support (360-day
cooldown); schooling costs 8, raises support 5 and trains each pupil's Learning
(180 days); relief costs 10, adds support 8, piety 3 and Popular support 3 (180
days); mediation costs 4, adds support 4, prestige 6 and connection Standing 4,
and settles a dispute (180 days). Patronage costs 4 and secures a bounded
20-capital institutional subscription through a contact at Standing 20 (360
days); this abstracts community gifts, not a transfer from an AI ruler's treasury.

An unresolved dispute reduces estate revenue by up to 2 each season.
Defending disputed rights costs 12, with disclosed Diplomacy/privilege odds;
success adds support 8 and costs lord Standing 5, while failure loses support 8,
lord Standing 10 and up to 8 more treasury. Concession costs 8 and support 5 but
adds lord Standing 8. Both close the specific dispute. At most one annual
encroachment roll occurs for a player-led house below support 60: 20% ordinarily
or 8% with privileges. Connections are capped at sixteen; dated invitation and
election records expire. All uncertainty uses the saved game RNG.

Royal protection, followed by papal exemption, requires a living external
authority, one year in office, community support 60, piety 160 and prestige 80.
Each petition spends 30 from the abbey whether granted or refused, with a
720-day cooldown. Each grant adds one resident place, 20 household troops,
2 seasonal estate revenue and 2 to the allowance ceiling, and 20 immediate
prestige. The first privilege raises the holder's station to at least 4 and
annual religious prestige from 24 to 40. Neither privilege transfers secular
land, and both remain with the institution when its holder changes.
