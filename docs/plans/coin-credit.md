# Coin, credit, and financial contracts

Status: implemented (phases 1–4; phase 5 remains conditional as specified)

## Goal

Add inflation and historically grounded finance without turning Fallowborn into
a commodity-market simulator or forcing every authored gold amount to be
rewritten.

The system should:

- make a large idle purse less universally safe over a long dynasty;
- let households borrow against income, reputation, and property;
- make debt useful for investment without making refinancing an infinite-money
  loop;
- give merchants a financial path built around partnerships and trade credit;
- give sovereign rulers a dangerous emergency coinage lever;
- preserve the existing balance language in which wages, rents, buildings,
  holdings, items, and event choices are written in familiar gold amounts;
- remain deterministic, serializable, compatible with old version-3 saves, and
  usable from `file://`.

## Recommendation

Build a compact **Coin & Credit** layer, not a simulated money supply and not a
modern savings bank.

Keep `player.gold` denominated in constant-purchasing-power game gold. Add a
price index behind it and fixed nominal financial contracts. When the price
index changes, revalue liquid gold rather than multiplying every authored price,
wage, reward, requirement, and event effect.

This is the smallest model that makes inflation strategically meaningful:

- inflation erodes liquid cash;
- deflation increases the purchasing power of cash;
- holdings, buildings, and items are real assets and are not automatically
  eroded;
- a fixed nominal debt becomes easier to repay under inflation and harder under
  deflation;
- trade partnerships can remain real, risk-sharing investments;
- the existing economy keeps its current readable numbers.

Call the player-facing system **Finance** or **Coin & Credit**. Avoid presenting
it as a modern bank with guaranteed deposits, passive interest, and a universal
credit score.

## Non-goals

The first implementation should not add:

- per-realm money supplies;
- AI realm treasuries;
- commodity production and consumption;
- province-by-province prices;
- exchange rates between every realm;
- a central bank or policy interest rate;
- a passive interest-bearing savings account;
- interbank lending or systemic contagion;
- a modern annual-percentage-rate simulation;
- negative `player.gold`.

Those systems need economic agents and balance sheets that the game does not
currently simulate. Adding them only for the player would create false
precision and substantial maintenance cost.

## Existing foundations and constraints

The current architecture is player-centric:

- `player.gold` is the one liquid balance.
- Daily focuses add wages and profits directly.
- The season boundary applies noble income, household upkeep, building upkeep,
  and property bonuses.
- `FB.playerTax` derives rents and vassal dues from development.
- `FB.incomeBreakdown` itemizes the standing seasonal flow.
- Holdings and items persist across generations.
- Buildings persist with land and can produce income or upkeep.
- Event data contains fixed gold rewards, losses, and `goldMin` requirements.
- Direct gold changes clamp at zero rather than creating a debt balance.

A static inventory at the time of this plan found approximately:

- 85 direct `player.gold` or `p.gold` references in engine code;
- 70 event `goldMin` gates;
- 233 authored event effects containing gold;
- 48 data or engine cost definitions.

A conventional `price × inflation` rewrite would therefore cross nearly every
content pack and would leave embedded labels such as “(10 gold)” vulnerable to
disagreeing with their actual cost. Revaluing the liquid balance avoids that
entire class of mismatch.

Do not compute lending capacity by parsing `FB.incomeBreakdown`. It contains
localized display labels and is intentionally presentation-oriented. Extract a
shared numeric reliable-income helper, then let both the ledger and finance
system read it.

## Monetary unit

### Base gold

All authored gold remains **base gold**: the purchasing power represented by one
gold at the system's baseline.

Examples remain unchanged:

- a 10-gold event choice costs 10 base gold;
- a 40-gold Watermill costs 40 base gold;
- a seasonal income of 6 gold adds 6 base gold;
- the top bar continues to display the player's current real purchasing power.

### Price index

`state.economy.price` is the nominal amount of circulating coin needed to buy
one base gold of goods and services.

It begins at `1`. If prices rise from `1` to `1.05`, liquid gold is revalued:

```js
player.gold *= oldPrice / newPrice;
```

A purse worth 100 base gold becomes worth about 95.24 base gold. The number of
coins in the fictional purse has not vanished; what those coins can buy has
fallen. The top bar deliberately reports the useful gameplay value rather than
an otherwise unused nominal coin count.

If prices later fall from `1.05` back to `1`, the purchasing power of remaining
cash rises by the inverse factor.

Do not round the stored balance during revaluation. Existing daily income
already produces fractional gold. Continue to round only for appropriate UI
display and whole-number transaction prices.

### Price changes and the season ledger

Let revaluation change `player.gold` normally. The existing `seasonMark` and
`seasonNet` mechanism should therefore report the purchasing-power gain or loss
in the next completed season.

Add a dedicated line to the standing gold explanation:

> Coin and prices: −2.4 gold this year

The line must be derived from a stored numeric adjustment, not reconstructed
from a localized Chronicle message.

## Inflation model

Inflation should be slow, bounded, persistent for a few years, and capable of
reversing. A permanent modern-style positive target would explode over a
centuries-long dynasty and make old authored values meaningless.

Suggested annual model:

```js
pressure = pressure * persistence +
  randomPressure +
  warPressure +
  scarcityPressure +
  debasementPressure;

rate = FB.clamp(
  pressure + (1 - price) * meanReversion,
  minAnnualRate,
  maxAnnualRate
);

newPrice = FB.clamp(
  price * (1 + rate),
  minPrice,
  maxPrice
);
```

Initial balance targets:

- pressure persistence: `0.55`;
- ordinary seeded variation: roughly `−0.015` through `+0.015`;
- player's realm at war: up to `+0.01`;
- ordinary annual rate clamp: `−0.03` through `+0.04`;
- explicit famine, bullion, or debasement shocks: permitted to push a year as
  far as roughly `+0.10` through `+0.15`;
- price-index bounds: initially `0.5` through `3`;
- mean reversion: strong enough that quiet decades tend toward the baseline
  rather than compounding forever.

All random pressure must use `FB.rng` helpers. Do not use `Math.random()`.

Only add a Chronicle entry when the annual rate or purse adjustment is
material, for example:

- absolute annual rate at least 1%; or
- absolute purchasing-power change at least 1 gold.

Minor movement can remain visible in the Finance panel without producing news.

### Economic shocks

Add a simple simulation helper:

```js
FB.addPricePressure(state, amount, years, source)
```

Persist active shocks as JSON-safe records, not functions or rendered text.
Examples:

- war and prolonged host upkeep;
- famine or failed harvest;
- plague disruption;
- bullion scarcity;
- a flood of new coin;
- sovereign debasement;
- a later recoinage that applies negative pressure.

If event data needs direct access, prefer a documented numeric effect such as
`pricePressure` plus an optional duration rather than one custom handler per
event. Update `docs/MODDING.md` if the effect becomes public.

The first version should use one player-facing price index. Per-realm indices
would add hundreds of values despite AI realms having no treasuries, contracts,
or prices of their own.

## Saved state

Use a lazy initializer so old version-3 saves remain valid:

```js
state.economy = {
  price: 1,
  lastRate: 0,
  pressure: 0,
  lastAdjustment: 0,
  shocks: [],
  loans: [],
  investments: [],
  nextId: 1,
  defaults: 0
};
```

All records must be plain JSON data.

Do not put financial state in browser-local automation settings. Contracts,
prices, collateral, and due dates belong to one saved world and must survive
slot saves, autosaves, export/import, and succession.

Old saves should begin participating from the first annual tick after the
feature is introduced. Do not retroactively calculate centuries of inflation
and unexpectedly destroy an existing purse on load.

## Nominal contracts

A loan grants base gold today but records its obligation at the current price
index.

Suggested record:

```js
{
  id: 1,
  kind: 'pledge',
  lender: 'moneychanger',
  principal: 40,
  issuePrice: 1.05,
  face: 50.4,
  dueTurn: 16200,
  collateral: { kind: 'item', id: 'silver_ring' },
  arrears: 0,
  status: 'active'
}
```

`face` is the nominal obligation:

```js
face = principal * issuePrice * (1 + totalMarkup);
```

The real amount due at any later moment is:

```js
dueNow = face / state.economy.price;
```

Inflation therefore lowers the real burden of a fixed contract; deflation
raises it.

The UI should always show:

- gold received now;
- current real repayment value;
- nominal face value or an explanation that the due amount moves with prices;
- exact due season and year;
- pledged collateral;
- consequences of missing payment.

Do not show only “15% interest.” Prefer exact contract terms:

> Receive 40 gold now. Face value 48 gold, due in Winter 912. The amount that
> face value can buy may change with prices.

### Indexed contracts

Some later or sophisticated lenders may demand repayment by weight or in
base-value goods. Represent that explicitly:

```js
denomination: 'real'
```

A real-denominated contract ignores price changes and remains due at its stored
base-gold amount. It is more expensive or less available to a ruler known for
debasement.

Do not silently change denomination after a contract is signed.

## Credit capacity

Credit should be based on reliable repayment capacity and collateral, not on
the current purse.

Add a numeric helper such as:

```js
FB.reliableGoldIncome(state)
```

It should include stable recurring sources:

- expected focus income;
- rents and vassal dues;
- holding income;
- building income;
- item income;
- regular household and building upkeep;
- reliable council or Estates modifiers where appropriate.

It should exclude:

- random event windfalls;
- sale of items;
- tribute;
- one-time extraordinary taxes;
- another new loan;
- an investment that has not matured.

Suggested capacity:

```text
capacity =
  reliable positive net income × term factor
  + collateral value × collateral factor
  + a modest prestige allowance
  − current real value of outstanding obligations
```

Initial guidelines:

- unsecured capacity: about two seasons of positive reliable income;
- secured capacity: up to four seasons plus 25–40% of pledged asset value;
- prestige contribution capped so a famous but insolvent house cannot borrow
  without limit;
- no new borrowing while a loan is in default;
- at most two active loans in the first release.

Stewardship may improve terms slightly, but it must not generate capacity from a
negative household cash flow.

## Contract families

### Pledged loan

Purpose: emergency liquidity for commoners and minor households.

- Available broadly to adults.
- Small principal.
- High total markup.
- Four-season term.
- Requires an item or eligible household holding.
- Default transfers or removes the pledged asset.

Do not allow essential story-only holdings such as Rights of Common to be
pledged unless an event explicitly handles that consequence.

### Merchant advance

Purpose: finance property, inventory, or advancement from reliable income.

- Available to merchants, craftsmen with standing, and gentry with positive
  cash flow.
- Medium principal.
- Six- to eight-season term.
- Moderate markup.
- May be secured by a trading property or future income.

### Loan against revenues

Purpose: let landed rulers fund construction, war, settlement, or diplomacy.

- Available at tier 3+ with reliable noble income.
- Principal based on several seasons of rents and dues.
- Eight- to twelve-season term.
- Default assigns part of seasonal tax income to the lender until the real
  obligation is cleared.
- Sovereign or council behavior can affect terms.

Do not seize a random county on ordinary default. County transfer is too large a
consequence for a generic financial contract and interacts with title, liege,
and realm cleanup code.

### Benevolent or relationship loan

Purpose: occasional event contract with a friend, kin member, religious house,
or loyal vassal.

- Favorable or zero explicit markup.
- Lower principal.
- Failure harms opinion, piety, prestige, or political standing.
- Offered through events, not as an always-available optimal button.

## Maturity, arrears, and default

Use lump-sum maturity plus optional early repayment in the first version.
Seasonal installments add bookkeeping without adding enough choice.

At each season boundary:

1. Recompute the real value due.
2. If the loan is not yet due, leave it alone.
3. If due and the purse can cover it, repay automatically.
4. If due and underfunded, mark one arrears period and extend by two seasons
   with a fixed nominal penalty.
5. On the second missed deadline, queue a default event.
6. Apply the contract's stated collateral or revenue consequence.
7. Record the default in `state.economy.defaults`.

Allow manual early repayment from the Finance panel. Early repayment should use
the signed face value without an extra penalty unless the contract explicitly
says otherwise.

Never route scheduled repayment through `FB.applyEffects` if its zero clamp
would erase the unpaid remainder. Contract code must know exactly how much was
paid and how much remains.

### Default consequences

Use consequences the player can understand before accepting:

- pledged item or holding is lost;
- a fraction of future rents is assigned;
- prestige and relevant opinion fall;
- the lender refuses further credit;
- piety may fall when the contract carried an oath;
- a ruler's council or Estates may gain leverage.

Avoid instant game-over bankruptcy. A failed contract should create a recovery
story, not end the dynasty.

## Succession

Financial obligations belong to the household or estate and must not disappear
when the current character dies.

Recommended order:

1. Existing death dues are assessed.
2. Mature obligations are offered payment from the remaining purse.
3. Active future loans pass to the successor unchanged.
4. Pledged collateral remains pledged.
5. Personal relationship loans may queue an estate-settlement event.

Keep loan ids and face values stable. Do not reroll terms, lender, or
denomination at succession.

The end-of-life and succession UI should disclose inherited active debt. Death
must not become a refinancing exploit.

## Trade finance and investment

The existing caravan and merchant-credit events should eventually become real
timed contracts rather than immediate success/failure gold effects.

Suggested investment record:

```js
{
  id: 4,
  kind: 'trade_partnership',
  stake: 50,
  dueTurn: 17100,
  risk: 0.25,
  profitShare: 0.45,
  status: 'active'
}
```

The stake leaves the purse immediately. At maturity, use seeded randomness to
resolve:

- total loss;
- partial recovery;
- ordinary profit;
- rare exceptional profit.

Resolve randomness only once and store the result before presenting it. Reloads
must not reroll an investment.

A partnership is a real risk-sharing claim, not a fixed nominal loan. Its return
may therefore be paid in base gold and naturally hedge inflation. This
distinction gives the player a reason to choose productive risk over a liquid
purse.

### Merchant-dynasty path

The existing Trading House is a natural prerequisite for a later financial
enterprise, for example:

- Exchange Bench;
- Counting House;
- Banking House.

Such an enterprise should unlock contract capacity, trade ventures, or the
ability to finance another lord. Do not make it merely another passive
gold-per-season upgrade.

A merchant lender could eventually:

- finance the liege for favor and profit;
- accept a toll or revenue right after default;
- fund a caravan through a partnership;
- provide exchange or remittance services;
- suffer a bank failure event if too much capital is committed.

This is a later phase. The initial release needs borrowing and investment
contracts before it needs a playable banking house.

## Deposits

Do not add a guaranteed interest-bearing deposit account in the first version.

The game does not currently model:

- the danger of transporting a large purse;
- routine theft of a percentage of cash;
- foreign-coin exchange during travel;
- payments between distant markets;
- a distinction between money available locally and abroad.

Without those pressures, a deposit would either be a dominant inflation hedge or
free passive income.

A later moneychanger's ledger becomes worthwhile if it offers one or more
specific services:

- safe remittance between distant places;
- protection from a local recoinage or confiscation;
- payment of large contracts without carrying coin;
- access to merchant overdraft;
- exposure to a visible bank-failure risk.

Any such deposit must state whether it is nominal coin, silver by weight, or a
real-valued claim. Do not let “banked gold” ambiguously escape every monetary
shock.

## Culture, faith, and legal form

Use the same economic core with culturally appropriate contract presentation.

Examples:

- a pledged loan or moneychanger's advance is broadly available;
- `commenda` may name a Mediterranean Christian partnership;
- `qirad` or `mudaraba` may name a Muslim profit-sharing partnership;
- a benevolent loan may use locally appropriate religious language;
- a bill of exchange belongs to later or highly developed merchant networks.

Do not implement a blanket “Christians cannot lend” or “Muslims cannot charge
interest” rule. Medieval practice used pledges, exchange, markups, partnerships,
annuities, fees, and relationship credit under varied laws.

Faith variants should change complete phrases and contract form, not impose a
simple balance penalty. Use existing `{ default, muslim, jewish }` data records
where appropriate.

Institutional access should depend mainly on:

- profession;
- station;
- local development;
- owned enterprise;
- reliable income;
- reputation and prior default;
- date or technology for genuinely later instruments.

## Sovereign coinage

Add a dangerous emergency deed after the ordinary credit system works:

> Debase the coinage

Initial scope: independent Kings and Emperors. Expanding mint rights to lower
independent tiers can be considered after balance testing.

Effects:

- immediate gold based on realm development or several seasons of tax;
- a large temporary price-pressure shock;
- popular-opinion and prestige loss;
- worse terms on new loans;
- increased chance that sophisticated lenders demand real-denominated
  repayment;
- council or Estates consequences;
- a multi-year cooldown;
- escalating penalties for repeated use.

The deed must show the estimated immediate gold and likely price pressure before
confirmation.

Debasement should not directly rewrite every active contract. Nominal contracts
become easier in real terms by design; real-denominated contracts do not.

Possible later actions:

- call in and recoin the currency;
- restore weight and confidence at a high immediate cost;
- grant a mint privilege;
- accept a foreign strong coin;
- punish clipping or counterfeiting.

## User interface

Add one no-day-cost deed:

> Coin & Credit…

The Finance panel should show:

- current purse;
- current price index and last annual movement;
- last purchasing-power adjustment;
- reliable seasonal net income;
- credit available and the factors that determine it;
- active loans with current due value and due date;
- pledged collateral;
- investments and their maturity dates;
- buttons to borrow, repay early, or make an available investment.

Use cards or short rows rather than a spreadsheet. On mobile, the most urgent
obligation and its due date must appear first.

The top bar should not gain another permanent resource. The existing gold
breakdown may add a link or row for price movement, while the detailed contract
state lives in the Finance panel.

### Transaction confirmation

Every borrowing action should have a final confirmation stating:

- amount received;
- current value due;
- date due;
- denomination behavior;
- collateral;
- first missed-payment consequence;
- default consequence.

Keyboard focus must enter the modal at the heading or first control, Tab through
every action, and return to the invoking control on close. Narrow mobile layouts
must not hide the due date or default terms below a fixed button.

### Chronicle

Use durable message descriptors for:

- taking a loan;
- repaying a loan;
- entering arrears;
- default and collateral loss;
- investment maturity;
- material annual inflation or deflation;
- debasement and recoinage.

Routine seasonal contract checks and minor price movements should remain silent.

## Determinism

The system must consume randomness only at documented ticks:

- annual price-pressure variation;
- investment maturity;
- explicit finance events.

Do not reroll an investment when its UI opens. At maturity, resolve once, store
the result, then queue or display the event.

Stable iteration order matters when multiple contracts mature together. Sort by
numeric contract id before processing.

Automation may choose an event outcome, but it must not automatically originate
a new loan or investment. Borrowing changes long-term obligations and always
requires explicit player intent.

## Balance data

Put tunable values under `FBDATA.balance`, for example:

```js
pricePressurePersistence: 0.55,
priceRandomPressure: 0.015,
priceWarPressure: 0.01,
priceMeanReversion: 0.04,
priceAnnualMin: -0.03,
priceAnnualMax: 0.04,
priceMin: 0.5,
priceMax: 3,
financeMaxLoans: 2,
financeUnsecuredSeasons: 2,
financeSecuredSeasons: 4,
financeCollateralRatio: 0.35,
financeArrearsSeasons: 2,
financeArrearsPenalty: 0.10,
financeDefaultPrestige: 15
```

Exact names may be shortened to match existing balance conventions.

Contract definitions may live in `FBDATA.finance` if they become moddable.
Document every public key and schema in `docs/MODDING.md`.

## File-level implementation

### `js/economy.js`

Prefer a dedicated engine file once implementation starts.

- Lazy state initialization.
- Price-pressure and annual revaluation helpers.
- Reliable numeric income helper or calls to a shared economy calculation.
- Credit-capacity calculation.
- Loan creation, valuation, early repayment, maturity, arrears, and default.
- Investment creation and maturity.
- Stable contract ids and iteration order.

Load it after `js/actions.js` and before council/parliament/UI, unless the
reliable-income calculation is first extracted into an earlier shared module.
Update the architecture list and preserve classic-script load order.

### `js/actions.js`

- Add the no-consume Coin & Credit deed.
- Replace duplicated standing-income arithmetic with a shared numeric helper.
- Keep `FB.incomeBreakdown` as presentation built on that helper.
- Add sovereign coinage actions in the later phase.

### `js/main.js`

- Run contract maturity at the season boundary.
- Run price evolution once per year.
- Preserve the intended ordering with war upkeep, building upkeep, the season
  ledger, world tick, mortality, and autosave.
- Ensure succession keeps household obligations.
- Bump `FB.VERSION` and add the changelog when each player-facing phase ships.

Suggested seasonal order:

1. Apply normal income and upkeep.
2. Process due contracts.
3. Complete the season ledger.
4. On a new year, evolve prices and revalue the purse.
5. Run world tick and yearly life in their established safe order.

The exact ledger placement may change if the annual revaluation should appear in
the winter season rather than the following spring; choose one behavior and
document it.

### `js/events.js`

- Add a documented `pricePressure` effect only if data-authored shocks require
  it.
- Add finance-related requirements only when declarative events need them.
- Keep stored Chronicle output descriptor-based.

### `js/ui.js`

- Add the Finance panel.
- Add borrowing, collateral, early-repayment, and investment dialogs.
- Show price movement in the gold explanation.
- Preserve keyboard and mobile requirements.

### `js/save.js`

No outer save-version bump should be necessary. Confirm that lazy state and all
contract records serialize through existing save/export paths.

### `data/map_data.js`

- Add balance knobs.
- Add moddable contract definitions only if required.
- Add a later Banking House or related enterprise only after its active
  mechanics exist.

### Event data

Use existing packs for a very small number of related events, or add
`data/events_finance.js` if the content grows into a coherent pack. If a new pack
is added, update `index.html`, load-order documentation, mod schemas, and the
catalog extractor's assumptions.

### Documentation and localization

When implementation begins, update:

- `docs/designs/finance.md` as the authoritative built-system design;
- `docs/designs/time.md`;
- `docs/designs/state-and-saves.md`;
- `docs/designs/holdings.md`;
- `docs/designs/development.md`;
- `docs/designs/piety-intrigue-diplomacy.md`;
- `docs/designs/ui.md`;
- `docs/README.md`;
- `docs/MODDING.md`;
- `AGENTS.md` architecture and design indexes if a new module or event pack is
  added.

Regenerate and validate all language catalogs after adding player-facing text.

## Implementation phases

### Phase 1: contracts without price movement

- Add the Finance state, panel, reliable income, credit capacity, and one
  pledged loan.
- Add maturity, arrears, default, collateral, early repayment, save/load, and
  succession behavior.
- Keep `price` at 1.

This proves that debt is useful and recoverable before inflation changes its
value.

### Phase 2: inflation and nominal valuation

- Add annual price pressure and purse revaluation.
- Make existing loans nominal.
- Show current due values and annual purchasing-power change.
- Add material inflation/deflation Chronicle messages.

This is the minimum complete Coin & Credit loop and should ship as one minor
release if Phase 1 is not released independently.

### Phase 3: ruler finance

- Add revenue-backed loans.
- Add tax assignment after default.
- Integrate council and Estates consequences.
- Add sovereign debasement and later recoinage.

### Phase 4: trade finance

- Convert appropriate caravan and merchant-credit events to timed investments.
- Add culturally varied partnership names.
- Add the active merchant-enterprise path.
- Add lending to a liege or neighboring ruler only after default consequences
  can produce political leverage.

### Phase 5: deposits and remittance, only if justified

- Add moneychanger accounts if travel, foreign payments, confiscation, or
  transport risk gives them a distinct purpose.
- Add bank failure risk and clear denomination rules.
- Do not add this phase merely to complete a modern checklist.

## Release and validation

Each implemented player-facing phase is a backward-compatible new feature and
should receive a MINOR version. Documentation-only follow-ups or fixes receive a
PATCH according to `docs/VERSIONS.md` and the repository cache-busting rule.

Permitted automated checks:

```text
node --check js/economy.js
node --check js/actions.js
node --check js/events.js
node --check js/main.js
node --check js/ui.js
python tools/i18n_catalog.py extract
python tools/i18n_catalog.py translate fr de it es
python tools/i18n_catalog.py validate
```

The game itself must not be run from a shell, local server, headless browser, or
Node logic harness.

Manual browser checks should cover:

1. A new loan shows exact principal, due date, current repayment value,
   collateral, and default consequence.
2. Loan gold arrives once and cannot be duplicated by reopening a dialog.
3. Early repayment removes the obligation once.
4. A due loan pays automatically when affordable.
5. First arrears extend once and add the documented penalty.
6. Second failure applies the stated collateral or revenue consequence.
7. The player cannot originate unlimited overlapping loans or borrow while in
   default.
8. Positive reliable income produces capacity; event windfalls and new loans do
   not.
9. Building upkeep reduces capacity.
10. Save/load and export/import preserve every face value, due date, id,
    denomination, and collateral reference.
11. Succession preserves household debt and does not reroll its terms.
12. Inflation reduces liquid purchasing power by the exact inverse price
    factor.
13. Deflation raises remaining liquid purchasing power.
14. Nominal debt gets cheaper under inflation and dearer under deflation.
15. Real-denominated debt ignores price movement.
16. An annual update cannot apply twice after save/load.
17. Investment maturity resolves once and cannot be rerolled by reloading or
    reopening the event.
18. Sovereign debasement grants only the previewed gold range and applies its
    documented pressure and political costs.
19. Finance dialogs remain operable by keyboard and on a narrow mobile
    viewport.
20. French, German, Italian, and Spanish catalogs contain every new string and
    preserve all placeholders.

## Historical grounding

The model intentionally abstracts several documented features:

- medieval debasements involved old and new coins circulating together, high
  minting volumes, seigniorage, and at least some valuation by weight;
- price movements reflected both monetary policy and demographic or real
  economic conditions;
- medieval continental banks were important payment intermediaries, using
  deposits, book transfers, and overdraft credit;
- deposits and bills of exchange supported payment and trade credit but
  depended on reputation and fragile institutions;
- Christian and Islamic legal environments both supported finance through
  varied contract forms rather than a simple allowed/forbidden split;
- profit-and-loss-sharing partnerships are a better model for trade investment
  than a guaranteed savings yield.

Useful references:

- Arthur J. Rolnick, Warren E. Weber, and François R. Velde,
  [“The Debasement Puzzle: An Essay on Medieval Monetary History”](https://www.minneapolisfed.org/research/quarterly-review/the-debasement-puzzle-an-essay-on-medieval-monetary-history).
- Nick Mayhew and Katherine Ball,
  [“Debasement and demography in England and France in the Later Middle Ages”](https://www.cambridge.org/core/journals/continuity-and-change/article/abs/debasement-and-demography-in-england-and-france-in-the-later-middle-ages/C30D6C58A921ED5C2D8DB0482DF31B1E).
- James McAndrews and William Roberds,
  [“Payment Intermediation and the Origins of Banking”](https://www.newyorkfed.org/research/staff_reports/sr85.html).
- Steffen Murau and others,
  [“Elastic infrastructure: A historical perspective on credit in global correspondent banking and the cross-border payments system”](https://www.cambridge.org/core/journals/finance-and-society/article/elastic-infrastructure-a-historical-perspective-on-credit-in-global-correspondent-banking-and-the-crossborder-payments-system/4D61CD4A483537060E30419D99045B9B).
- Charles Richard Baker and Bruno Cohanier,
  [“The emergence of bills of exchange in the late medieval and early modern periods in Europe”](https://scholarlyworks.adelphi.edu/esploro/outputs/journalArticle/The-emergence-of-bills-of-exchange/991004465653406266).
- Shaheen Sardar Ali,
  [“In Search of Legitimacy: The Dilemma of Islamic Finance”](https://www.cambridge.org/core/books/abs/modern-challenges-to-islamic-law/in-search-of-legitimacy-the-dilemma-of-islamic-finance/6933D5B61F87CDE0C349F3CB9782DF81).
