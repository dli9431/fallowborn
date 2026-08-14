# Coin & Credit

**Gold remains constant-purchasing-power game gold.** `state.economy.price` is the
nominal coin needed to buy one gold of goods. Once each spring
`FB.financeYear` evolves a slow, bounded, mean-reverting price index and revalues
only the liquid purse by `oldPrice / newPrice`. Authored costs, wages, rewards,
holdings, buildings, and items keep their familiar gold values. The annual
revaluation runs after the completed winter ledger, so it appears immediately
as **Coin and prices this year** and is included in the following measured
season net.

Currency mods change only this system's presentation boundary. Faces, stakes,
payouts, purse adjustments, credit limits, and price-index calculations stay
numeric in game gold; the Finance sheet and durable messages pass those numbers to
`FB.money` at display time. `smallestPerGold` rounding is never written back to the
purse or a contract, so affordability and settlement use the original values.

`FB.ensureEconomy` lazily creates JSON-safe price, shock, loan, partnership,
self-founded venture, default, and stable-id state. Old version-3 saves therefore begin at a price
index of 1 on their next annual tick; no past inflation is reconstructed.
`FB.addPricePressure(state, amount, years, source)` adds deterministic saved
shocks. Lean harvests and pestilence add scarcity/disruption pressure, plague
recovery eases it, war in the player's sovereign realm adds annual pressure,
and sovereign coinage adds explicit monetary shocks. Ordinary variation and
investment outcomes use the saved `FB.rng` stream only. `lastYear` and stored investment resolutions
prevent reloads from applying or rolling an outcome twice.

War also has an immediate seasonal price. While `FB.playerRealmAtWar(state)` is true,
`FB.householdUpkeepParts` adds `wartime`, equal by default to 25% of the station base
plus resident-family provisions. Retainer contracts, schooling, buildings, and other
authored charges are not multiplied. This is computed on demand, so peace removes the
surcharge without a save field.

**Contracts state exact terms.** Pledged loans, merchant advances, and loans
against revenues grant base gold now and record a fixed face value. A nominal
face is divided by the current price index when repaid, so inflation eases it
and deflation increases it. A lender faced with repeated defaults or crown
debasement may instead demand a real, weight-denominated contract whose due
value does not move. `FB.reliableGoldIncome` is the shared numeric seasonal net
used by the gold ledger and credit capacity; windfalls, sales, other loans, and
unmatured investments never count. Its recurring costs include resident-family upkeep,
active maintained household standards, retainer contracts, wartime household scarcity,
the live raised host's base/levy/archer/cavalry/retinue/mercenary logistics, and the disclosed
fees of current schooling arrangements. The same components are itemized by
`FB.incomeBreakdown`, with maintained standards separate from basic household and family
costs, so the gold sheet, Finance net, credit capacity, and prudent building automation
share one result.

Landed income keeps one calculation order in `FB.playerTax` and its displayed mirror.
Direct demesne rent first takes the domain penalty, then grouped `estate.rent` trait
bonuses are added as localized named ledger lines. Rent-Shrewd contributes +10%.
The enlarged rent participates in the later national-technology, Royal Council,
position, guild-monopoly, and liege-aid arithmetic; vassal dues are never included in
the trait base. The two profitable Rent-Day choices and each extraordinary-tax
collection that actually yields coin add one Rent-Shrewd acquisition point; three
award the reputation.

Loans mature as lump sums at season boundaries. An affordable maturity repays
automatically. The first miss adds the signed 10% face penalty and grants two
seasons; the second enforces the disclosed default. Pledged property is taken
in settlement. Merchant and landed defaults assign one quarter of regular
revenue until the remaining obligation is cleared. At most two loans may be
open, no loan may begin during a revenue default, every default closes the
credit market to the household for four seasons, and pledged treasures cannot
be sold or gifted. Death dues are assessed first; mature debt then settles if
possible and every remaining id, face, denomination, deadline, and pledge
passes unchanged to the successor.

Credit forms are discrete technology unlocks. Standardized coinage opens pledged
moneychanging, notarial contracts open merchant advances, exchequer accounts open landed
revenue credit, and sea loans open trade partnerships. Mint assaying is required for
sovereign debasement and recoinage. These gates are checked when offers/actions are
enumerated; an already signed contract remains enforceable if sovereignty later changes.
Self-founded trade ventures are a household action for adult freeholders and gentry and
do not require sea-loans technology.
Finance and trade scalar technology bonuses are capped by `FBDATA.techCaps`. The finance
bonus multiplies computed credit capacity before outstanding debt is subtracted; the
trade bonus multiplies staffed merchant and craft enterprise yield.

Every default also costs prestige. A crowned ruler loses council authority and
Standing with each councillor; a sworn landed ruler loses Standing with the liege, giving
the existing political institutions a visible hold over failed finance.

**A default left to rot becomes a writ of distraint (tiers 0–2).** Coin & Credit
shows the remaining grace beside an active default and retains a full-balance
settlement action throughout default. The contract confirmation warns of the
court path before signature. Once a defaulted loan is older than
`balance.distraintGraceDays`, the creditor can bring the lord's writ
(`distraint_writ` → `distraint_seizure`): the household may settle, yield an
asset, or stall and be seized. Bailiffs take holdings at cost value, then land plots
at `FB.landPlotCost`, cheapest first, until the book-debt is covered — items are never
distrained, and the take reduces the defaulted loans' faces directly. The event
previews the exact balance, holdings, number of plots, and final station consequence.
If nothing remains and the debt still stands, the last claim is split by current
station: gentry forfeit the manor (`manor_forfeit`), freeholders are bound as serfs
(`bondage_sentence`), and existing serfs receive extraordinary labor service
(`debt_labor_sentence`). Flight preserves the current tier but carries the debt to a
new parish. See [descent.md](descent.md).

**Trade partnerships are real investments, not deposits.** A merchant or
craft household can commit coin for four seasons; established trade houses and
guild rank open larger stakes. At maturity a single stored seeded roll produces
loss, partial recovery, ordinary profit, or exceptional profit. The existing
Caravan event uses the same contract path. The Finance sheet calls the form a
commenda, qirad, or trade partnership as appropriate. There is no passive
interest-bearing savings account. These records are explicitly presented as backing
another merchant and retain their independent three-partnership capacity.

Guild rank above master is political rather than a purchase. Membership and master rank
retain their direct advancement gates, but officer and guildmaster require a vacant office,
an eligible current rank, nomination expense, and a vote defined in
`FBDATA.elections`. The campaign shows each weighted constituency and rival, then permits
one of canvassing, favors, expense, or reputation before the recorded vote. Victory creates
a territorial profession-specific fixed term; defeat creates the rival term and a
candidacy cooldown. Expiry returns the worker to master (or from guildmaster to a still
valid officer term). Guild Standing remains both visible support and, for favor tactics,
a spendable reputation rather than a second currency.

**Bounded market auctions are immediate household choices, not a market simulation.**
**Attend auction…** is available once per configured year in a home town or city with a
valid lot; a rare invitation opens that same flow. `FB.beginAuction` owns the shared
cooldown and revalidates age, captivity, venue, and lot availability, so the deed,
invitation, and direct callers cannot create separate market clocks. Opening saves exactly
one `player.auction` record containing the venue, lot, opening call, fixed increment,
seeded rival maximum, and bid count. The player has at most three bids of one, two, or
three increments. The rival either counters immediately from its saved ceiling or
drops out; only a winner pays, so a loss or withdrawal costs no coin.

Lots are an unowned Fine/Famed item (transferred through the ordinary item API), one
valid neighboring foreign county title right (the existing single fabricated-claim
record, with `source:'auction'`), or an ordinary family enterprise at the exact venue.
The auction itself and item lots have no technology gate. Enterprise lots inherit the
selected enterprise's own `requiresTech`; county title rights require Notarial Contracts,
with ordinary claim fabrication and other war rights as the fallback. Once a lot opens,
it is grandfathered through resolution if allegiance changes its effective technology.
An existing fabricated claim excludes title rights rather than being replaced. A
temporary repeatable item is discarded if the sale is cancelled or becomes invalid;
the normal enterprise acquisition and staffing rules apply to a winning business, so
it can be idle. Lot-family weights and requirements live in `FBDATA.auctionLotTypes`;
opening/increment ratios, rival range, cooldown, and round cap live in `FBDATA.balance`.
There are no bidder purses, stock lists, clocks, or daily auction work.

**Self-founded ventures are separate household investments.** Any adult tier-1/2
protagonist may choose a configured stake, select a reachable development-4+ market,
and pay route overhead separately from the invested capital. Maintained transport may
reduce the overhead and route time but never the stake. The household may have one
active self-founded venture by default regardless of its passive partnership count.

A venture dispatched from home records the destination, exact route, cautious/bold
strategy, stake, overhead, due turn, outcome bands, and a formation-time modifier
snapshot. Its duration is `max(90, 30 + round-trip route days)`. Stewardship, merchant
or craft guild privilege, a Trading House, national trade knowledge, and destination
development improve its eventual roll; route length adds risk. Positive household
bonuses are capped before the destination and route adjustments. `FB.financeDay`
resolves the record on its exact due day, stores the one seeded roll and payout before
publishing the result, and pays the current household head. Promotion and succession
therefore do not cancel or retarget it.

An accompanied venture is stored only inside `player.travel`. Its selected stake and
separate overhead are charged at departure, while the existing road encounters,
destination stay, cautious return, bold Stewardship bargain, return journey, and
settlement rules remain the travel system’s responsibility. The old ten-gold direct
`FB.travelStart("trade")` compatibility path remains valid for mods, but the core UI
routes Trade Venture through the stake-and-market setup.

The owned-venture API is `FB.tradeVentureStakes`, `FB.tradeVentureEligible`,
`FB.tradeVentureMarkets`, `FB.tradeVenturePreview`, `FB.tradeVentureCanStart`,
`FB.startTradeVenture`, `FB.activeTradeVentures`, `FB.tradeVentureActive`, and
`FB.resolveTradeVenture`. `FB.financeActivePartnerships` and
`FB.financeActiveTradeVentures` keep the two investment capacities explicit.

Independent Kings and Emperors may debase the coin once every five years for
seigniorage. The action previews the exact grant and price shock, damages
prestige, popular trust, council relations, and future terms, and never rewrites
signed contracts. A later costly recoinage applies negative price pressure and
restores lender confidence gradually.

Tunables live in `FBDATA.balance`; contract and venture terms live in `FBDATA.finance`
(`data/economy.js`) and may be overridden by runtime mods. The Finance sheet is
a no-day-cost deed and keeps the nearest deadline at the top on narrow screens.
Routine checks remain silent; signing, repayment, arrears, default, inheritance,
investment resolution, material price movement, debasement, and recoinage use
durable Chronicle message descriptors. Finance actions and notices use the broadly
supported money-bag icon rather than the unsupported coin glyph.

Related: [time.md](time.md) for tick order, [state-and-saves.md](state-and-saves.md)
for persistence, [holdings.md](holdings.md) for pledged property, and
[ui.md](ui.md) for the Finance sheet.

County modifier upkeep is another disclosed recurring cost. It is charged only for
directly held counties and enters seasonal settlement, `FB.reliableGoldIncome`, and
`FB.incomeBreakdown` through the same `FB.modifierUpkeep` source. Great-holy-war
`supplyUse` adjusts the live raised-host logistics total and receives its own ledger
line. See [modifiers.md](modifiers.md).
