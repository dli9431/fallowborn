# Coin & Credit

**Gold remains constant-purchasing-power game gold.** `state.economy.price` is the
nominal coin needed to buy one gold of goods. Once each spring
`FB.financeYear` evolves a slow, bounded, mean-reverting price index and revalues
only the liquid purse by `oldPrice / newPrice`. Authored costs, wages, rewards,
holdings, buildings, and items keep their familiar gold values. The annual
revaluation runs after the completed winter ledger, so it appears immediately
as **Coin and prices this year** and is included in the following measured
season net.

`FB.ensureEconomy` lazily creates JSON-safe price, shock, loan, investment,
default, and stable-id state. Old version-3 saves therefore begin at a price
index of 1 on their next annual tick; no past inflation is reconstructed.
`FB.addPricePressure(state, amount, years, source)` adds deterministic saved
shocks. Ordinary variation and investment outcomes use the saved `FB.rng`
stream only. `lastYear` and stored investment resolutions prevent reloads from
applying or rolling an outcome twice.

**Contracts state exact terms.** Pledged loans, merchant advances, and loans
against revenues grant base gold now and record a fixed face value. A nominal
face is divided by the current price index when repaid, so inflation eases it
and deflation increases it. A lender faced with repeated defaults or crown
debasement may instead demand a real, weight-denominated contract whose due
value does not move. `FB.reliableGoldIncome` is the shared numeric seasonal net
used by the gold ledger and credit capacity; windfalls, sales, other loans, and
unmatured investments never count.

Loans mature as lump sums at season boundaries. An affordable maturity repays
automatically. The first miss adds the signed 10% face penalty and grants two
seasons; the second enforces the disclosed default. Pledged property is taken
in settlement. Merchant and landed defaults assign one quarter of regular
revenue until the remaining obligation is cleared. At most two loans may be
open, no loan may begin during a revenue default, and pledged treasures cannot
be sold or gifted. Death dues are assessed first; mature debt then settles if
possible and every remaining id, face, denomination, deadline, and pledge
passes unchanged to the successor.

**Trade partnerships are real investments, not deposits.** A merchant or
craft household can commit coin for four seasons; established trade houses and
guild rank open larger stakes. At maturity a single stored seeded roll produces
loss, partial recovery, ordinary profit, or exceptional profit. The existing
Caravan event uses the same contract path. The Finance sheet calls the form a
commenda, qirad, or trade partnership as appropriate. There is no passive
interest-bearing savings account.

Independent Kings and Emperors may debase the coin once every five years for
seigniorage. The action previews the exact grant and price shock, damages
prestige, popular trust, council relations, and future terms, and never rewrites
signed contracts. A later costly recoinage applies negative price pressure and
restores lender confidence gradually.

Tunables live in `FBDATA.balance`; contract terms live in `FBDATA.finance`
(`data/economy.js`) and may be overridden by runtime mods. The Finance sheet is
a no-day-cost deed and keeps the nearest deadline at the top on narrow screens.
Routine checks remain silent; signing, repayment, arrears, default, inheritance,
investment resolution, material price movement, debasement, and recoinage use
durable Chronicle message descriptors.

Related: [time.md](time.md) for tick order, [state-and-saves.md](state-and-saves.md)
for persistence, [holdings.md](holdings.md) for pledged property, and
[ui.md](ui.md) for the Finance sheet.
