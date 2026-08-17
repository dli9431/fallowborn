# County commodity markets

## Purpose and scale

The market is a deterministic county simulation of five broad baskets:
`provisions`, `wares`, `materials`, `transport`, and `luxuries`. A unit is a
season-sized abstract share, not a bushel, bolt, log, horse, or individual
luxury. The baskets make scarcity legible without turning the game into an
inventory ledger or adding merchant agents.

Every county participates and every rank pays local prices. Direct production,
venture choice, and guild agency remain concentrated in the Freeholder/Gentry
Craft and Trade careers. Serfs can inspect supply and feel household hardship,
but cannot use guild charters or self-founded long-distance ventures.

Historical endowments are authored data. They consume no RNG and do not change
between the 867 and 1066 bookmarks. Temporary failed harvests, disease, and war
disruption are saved shocks; the underlying geographic advantage remains.

## Authored data

`data/markets.js` defines five complete tables or overlays:

- `FBDATA.marketGoods` gives each basket its stable id, order, icon, name, and
  description.
- `FBDATA.marketEndowmentTypes` defines ten named advantages. Grain adds 25%
  provisions; pastoral economy adds 15% provisions and 20% transport;
  fisheries add 20% provisions; wine and oil add 10% provisions and 20%
  luxuries; wool and textiles add 25% wares; timber adds 25% materials and 10%
  transport; metalworking adds 25% materials; horse breeding adds 30%
  transport; salt adds 10% provisions and 15% provisions-flow capacity; and a
  luxury entrepôt adds 30% luxury-flow capacity without creating luxuries.
- `FBDATA.marketEndowments.duchies` supplies regional defaults. A county row can
  `add` an exceptional tag or `suppress` a duchy tag. Resolution is stable and
  additive, with production bonuses capped at +40% per basket. Flow bonuses are
  not production and are not included in that cap.
- Core tangible definitions receive `marketBasket` weights after their owning
  data files load. An untagged mod definition deliberately keeps multiplier 1.
- `FBDATA.balance.market*` contains reserve, flow, price, hardship, and charter
  bounds. The simulation nevertheless always performs exactly two flow passes;
  this is an algorithm invariant rather than a balance choice.

Runtime definitions contain only ids, tags, display text, and mechanical
bonuses. The following source ledger records why every regional row was chosen.
These are deliberately broad, durable endowments: a tag describes a county's
geographic or long-lived commercial tendency, not a claim that one short-lived
industry operated uniformly across the whole duchy in both start years.

### Duchy endowment ledger

| Region and runtime ids | Curation rationale | Sources |
| --- | --- | --- |
| Francia and the Low Countries: `d_ile`, `d_normandy`, `d_champagne`, `d_flanders`, `d_brittany`, `d_aquitaine`, `d_burgundy`, `d_provence`, `d_frisia` | Arable basins support grain; Atlantic and Channel coasts support fisheries and pastoral use; Champagne/Aquitaine/Burgundy/Provence retain vine country; Flanders/Frisia receive the durable wool-and-cloth complex. | [1], [2], [3] |
| Central Europe: `d_saxony`, `d_bavaria`, `d_bohemia`, `d_silesia`, `d_transylvania` | Forest and ore zones support timber and metalworking; the Danubian and Bohemian basins retain arable/pastoral supply; Transylvania's long-lived salt geology supports preservation and exchange. | [1], [2], [4] |
| Italy and the large islands: `d_lombardy`, `d_verona`, `d_veneto`, `d_emilia`, `d_tuscany`, `d_apulia`, `d_calabria`, `d_sicily`, `d_sardinia` | The Po basin is treated as grain/pastoral country; the peninsula and islands retain Mediterranean vines and olives; Tuscan/Lombard cloth and Sardinian ore, pastoral, and salt advantages are broad regional endowments. | [2], [5], [6] |
| Britain and Ireland: `d_wessex`, `d_east_anglia`, `d_york`, `d_gwynedd`, `d_alba`, `d_munster` | Southern/eastern arable land supports grain and wool; northern and western uplands support pastoralism, fisheries, and Welsh metal resources. | [1], [2], [3] |
| Scandinavia, Rus, and the western steppe: `d_svealand`, `d_gotaland`, `d_gotland`, `d_jylland`, `d_scania`, `d_novgorod`, `d_kiev`, `d_etelkoz`, `d_itel`, `d_bulgar` | Northern woodland, ores, coasts, lakes, and fur/fish routes support timber, metals, and fisheries; the Dnieper basin supports grain; open steppe supports livestock and horse breeding. | [1], [2], [3], [7] |
| Byzantium and Anatolia: `d_thrace`, `d_hellas`, `d_peloponnese`, `d_crete`, `d_thrakesion`, `d_cappadocia`, `d_cilicia` | Aegean and southern Anatolian agriculture supplies grain, wine, oil, and fish; the central plateau's grazing and remount tradition is represented as pastoral horse country. | [5], [8] |
| Iberia and the Maghreb: `d_sevilla`, `d_granada`, `d_valencia`, `d_tunis`, `d_fes`, `d_sijilmasa` | Durable irrigated/arable pockets, Mediterranean wine/olive cultivation, pastoral interiors, Andalusi horse country, and Sijilmasa's desert salt-and-caravan setting define the mix. | [5], [9] |
| Nile valley: `d_delta`, `d_cairo`, `d_fayyum`, `d_upper_egypt` | Nile agriculture gives a grain default throughout; the Delta also receives fisheries. The abstraction follows the long-lived food supply of the river corridor rather than modern administrative borders. | [5], [8] |
| Syria and Mesopotamia: `d_damascus`, `d_aleppo`, `d_antioch`, `d_mosul`, `d_baghdad`, `d_kufa`, `d_basra` | Irrigated grain, pastoral hinterlands, textile production, Levantine vines/olives, and the fisheries and waterways of lower Mesopotamia are represented as durable regional supply. | [5], [8], [10] |
| Arabia and Oman: `d_hejaz`, `d_najd`, `d_sanaa`, `d_aden`, `d_oman` | Pastoral and horse supply dominates the dry interior; Yemeni highlands add cultivated provisions; Red Sea and Arabian Sea coasts add fisheries and maritime access. | [2], [7], [10] |
| Iran and Central Asia: `d_isfahan`, `d_fars`, `d_kerman`, `d_merv`, `d_herat`, `d_transoxiana`, `d_tabaristan` | Oasis grain and textiles, Iranian pastoral/vine country, Caspian woodland, and the horse-and-wool exchange between steppe and oasis towns give the regional defaults. | [7], [10] |
| Eastern edge: `d_sindh`, `d_axum` | The lower Indus is represented by irrigated grain and textiles; the Ethiopian highlands by mixed grain and pastoral production. These are cautious, broad baskets rather than detailed export claims. | [2], [10] |

### County exception ledger

| Runtime ids | Exception rationale | Sources |
| --- | --- | --- |
| `bruges`, `ghent`, `london`, `york` | Major northern exchange centers gain luxury distribution; Bruges also receives its coastal fishery. | [3], [11] |
| `genoa`, `venezia`, `palermo`, `constantinople`, `thessaloniki` | Mediterranean ports distribute distant luxuries. Genoa also receives fisheries; Venice suppresses the Veneto grain default and adds lagoon salt; Constantinople adds textile production. | [5], [6], [8], [12] |
| `tunis`, `tangier`, `sijilmasa`, `alexandria`, `fustat` | Maghrebi, trans-Saharan, and Nile/Red Sea route junctions gain entrepôt flow; Fustat also receives textiles. | [5], [8], [9] |
| `damascus`, `aleppo`, `antioch`, `baghdad`, `basra`, `mecca`, `aden`, `hormuz` | These cities anchor Levantine, Mesopotamian, pilgrimage, Gulf, and Indian Ocean routes, so they distribute luxuries rather than manufacture free stock. | [8], [10] |
| `novgorod`, `visby`, `bremen` | Northern river and sea exchange nodes gain entrepôt flow for the region's raw-material/manufacture trade. | [3], [11] |
| `salzburg`, `krakow` | Long-lived Alpine salt geology and the medieval Kraków saltworks justify local preservation/flow bonuses. Kraków is a durable geographic endowment even in starts before the thirteenth-century royal mine organization. | [4] |
| `cordoba`, `toledo` | Córdoba adds the Andalusi textile and exchange complex; Toledo adds textiles and metalworking. | [9], [10] |
| `samarkand`, `bukhara`, `merv` | The principal oasis cities on the Khurasan–Transoxiana caravan routes receive luxury distribution, while their duchies retain local wool, horse, and food production. | [7], [13] |

### Historical sources

1. Chris Wickham, *Framing the Early Middle Ages* (Oxford University Press,
   2005), used for broad early-medieval agrarian regionalism.
2. Norman J. G. Pounds, *An Economic History of Medieval Europe*, 2nd ed.
   (Longman, 1994), used for durable European land use and resource geography.
3. Mika Kallioinen, [“Long-Distance Trade in Medieval Europe”](https://academic.oup.com/edited-volume/61801/chapter/546473063),
   *Oxford Research Encyclopedia of Economics and Finance* (2020), especially
   the Flanders/Italy poles and northern exchange of cloth, wine, fish, furs,
   and skins.
4. UNESCO, [Wieliczka and Bochnia Royal Salt Mines](https://whc.unesco.org/en/list/0032/),
   used with general histories of Alpine and Transylvanian salt for the durable
   salt-geology choices.
5. Chris Wickham, [*The Donkey and the Boat: Reinterpreting the Mediterranean
   Economy, 950–1180*](https://academic.oup.com/book/46069) (Oxford University
   Press, 2023), used for Mediterranean regional production and the limits of
   treating long-distance trade as local production.
6. David Abulafia, *The Great Sea* (Oxford University Press, 2011), including
   the [1000–1100 Mediterranean comparison](https://academic.oup.com/book/40877/chapter-abstract/348940181).
7. UNESCO, [“The Samanid State: Domestic and External Trade”](https://en.unesco.org/silkroad/sites/default/files/knowledge-bank-article/vol_IVa%20silk%20road_the%20samanid%20state.pdf),
   used for ninth–tenth-century routes and town production from Merv through
   Bukhara and Samarkand.
8. Metropolitan Museum of Art, [*Byzantium and Islam: Age of
   Transition*](https://www.metmuseum.org/exhibitions/listings/2012/byzantium-and-islam),
   used for Egyptian grain, southern textiles, and the eastern Mediterranean,
   Red Sea, Alexandria, and Constantinople exchange routes.
9. Olivia Remie Constable, *Trade and Traders in Muslim Spain* (Cambridge
   University Press, 1994), used for Andalusi and Maghrebi production and
   exchange.
10. Eliyahu Ashtor, *A Social and Economic History of the Near East in the
    Middle Ages* (University of California Press, 1976), used for the Levant,
    Mesopotamia, Arabia, Iran, and Egypt.
11. M. M. Postan, E. E. Rich, and Edward Miller, eds., [*The Cambridge Economic
    History of Europe*, vol. II](https://www.cambridge.org/core/books/cambridge-economic-history-of-europe-from-the-decline-of-the-roman-empire/trade-of-medieval-europe-the-north/013D037DD5F22CEE68254D7CF3B5BE05),
    used for northern European trade and industry.
12. Metropolitan Museum of Art, [“Venice and the Islamic World,
    828–1797”](https://www.metmuseum.org/it/essays/venice-and-the-islamic-world-828-1797),
    used for Venice's role as a distributor of Near Eastern supplies and
    luxuries.
13. UNESCO, [Cities along the Silk Roads](https://en.unesco.org/silkroad/silk-road-themes/cities-silk-roads)
    and the [Zarafshan–Karakum Corridor](https://whc.unesco.org/en/list/1675/),
    used for the entrepôt status of Samarkand, Bukhara, and Merv.

## Seasonal simulation

`FB.ensureMarket(state)` lazily creates additive save-format-3 state:

```text
state.market = { goods, lastTurn, counties, shocks }
counties[pid] = [stock[], smoothedPrice[], lastNetFlow[]]
```

The saved `goods` order remaps vectors safely when a complete mod table changes.
Unknown old baskets are dropped, new baskets receive a two-season reserve and
price 1, invalid shock references are discarded, and no RNG is consumed.

Once per 90-day season, `FB.marketSeason`:

1. Computes county production and demand from terrain, coast, development,
   settlement weight, county population factor (`clamp(sqrt(P / P0), 0.60, 1.60)`), buildings, effective-sovereign trade technology,
   modifiers, endowments, armies, and saved shocks.
2. Adds exact resident-player-household demand and staffed family-enterprise
   output. No synthetic AI households are materialized.
3. Runs exactly two synchronous passes across one cached, sorted adjacency
   list. Each edge proposal is capped by donor surplus, recipient shortage,
   and edge capacity; competing exports are proportionally scaled before any
   application. Strait classes use water distribution bonuses. Flow therefore
   creates or destroys no stock.
4. Quantizes stock to tenths and price to hundredths, stores last net flow, and
   ages shocks.

The target reserve is two seasons of demand. Desired price is
`1 / sqrt(stock / reserve)`, normally clamped to 0.75–1.50. Stock below 25% of
reserve or an explicit severe shock opens the 0.50–2.50 crisis range. A price
moves no more than 20% from its prior value in one season and is additionally
smoothed halfway toward the desired price.

The runtime is `O(goods × (counties + 2 × edges))` once per season. It has no
daily scans, merchant actors, all-pairs searches, flow pathfinding, or serialized
reports. The county report shown in the UI is an in-memory view of the last
season only. The market save target is under 64 KB and the complete long-campaign
save target remains under 1.6 MB.

## Production, distribution, and shocks

Staffed Farms, Orchards, and Fishing Boats supply provisions. Presses split
output between provisions and luxuries. A Workshop supplies materials for a
smith, transport for a cooper, and wares for a weaver or unspecialized legacy
craft worker. Market Stalls and Trading Houses add distribution capacity rather
than stock. Broker improves local exchange, Caravan Factor overland capacity,
and Maritime Factor strait capacity.

`FB.addMarketShock` accepts a JSON-safe record with stable `id`, optional
`provinceId` and `goodId`, signed `production`, `demand`, and `flow` fractions,
`severe`, and `remaining` seasons. Values and ids are normalized. Re-adding the
same id replaces it, so continuing war does not stack duplicate disruptions.
Lean-harvest, pestilence, and recovery effects use this path. Hostile armies add
local food demand and a saved severe war disruption. Legacy nominal finance
shocks already in a save continue to age out; new material shocks no longer
enter the coinage index.

## Prices and hardship

`FB.marketCostQuote` applies weighted local basket prices only to tangible,
location-specific spending: ordinary household necessities, maintained
standards, holdings and land plots, item offers, enterprise setup, buildings
and fortifications, travel supplies, and non-contract host logistics. One-time
purchases round upward to whole gold; seasonal upkeep retains fractional
precision.

Wages, taxes, rents, titles, gifts, dowries, ransoms, fines, political and
service fees, credit, retainer pay, schooling, mercenary contracts, and other
signed obligations remain fixed real-gold agreements. `state.economy.price`
remains the distinct nominal coinage/debasement layer.

Ordinary seasonal income is credited before household necessities settle. An
unpaid share becomes `player.marketHardship`. Each consecutive provision-short
season adds 0.5 percentage points to yearly mortality for resident household
members, capped at 2 points; a fully funded season resets it. Chronicle entries
announce the start, two bounded escalation milestones, and recovery rather than
repeating each season. Maintained standards retain their existing lapse order.

## Ventures and charters

A new venture chooses stake, commodity, destination, and strategy. Departure
buys `stake / originPrice`, removes that quantity from origin stock, and stores
the good, quantity, route, origin quote, and existing outcome bands. Arrival
pays `quantity × liveDestinationPrice × outcomeMultiplier × charterBonus` and
delivers only `quantity × min(1, outcomeMultiplier)`. Thus a loss destroys
goods and an exceptional return cannot manufacture them. A saved venture with
no `goodId` follows the old fixed-stake payout path.

Incoming and outgoing guild-monopoly records may add `mode`, `goodId`,
`originId`, `destinationId`, and `route`. A Craft charter matches local Workshop
output. A Trade charter covers either local merchant exchange or one exact
corridor. Corridor charters improve matching edge capacity, merchant-enterprise
returns at their endpoints, and exact-route venture returns. Broad legacy
records remain valid until expiry, numeric terms remain frozen, and exact
`contractId` lookup continues to protect intrigue targets.

The existing petition and ruler-grant dialogs collect commodity, local/craft
or corridor mode, and an exact destination where applicable before committing
the day. They do not add another deed, charter slot, or governance capacity.

Chartered corridors are hard-gated by `guild_charters`; ordinary commodity
ventures remain the visible fallback. The county market itself is a soft
technology interaction: exchange is universal while `urban_markets` and
`trade_houses` improve capacity. Commodity selection on the existing venture
has no separate technology gate. These decisions are recorded in
`FBDATA.techImpactReviews`.

## Presentation and public API

The Market lens has one styled native basket selector. On narrow screens its
label stacks above the selector and Market action; that action row stays paired
when space permits and wraps into two full-width rows before either label clips.
The county Market sheet always stacks its label over a full-width disclosure menu.
Its keyboard-navigable option list overlays the sheet without changing modal size,
but remains locked to the trigger and clipped by the modal viewport rather than using
a browser popup that can escape the window. The lens's
centered legend and the map use the same high-contrast teal `▼ cheap`, gold
`● steady`, and coral
`▲ dear` language; county shading strengthens the same three bands without
making price depend on color alone. Patterned lines are bounded to four active
player ventures/charters and never expose the full simulation graph. All
controls remain native keyboard-focusable buttons/selects with the repository's
44-pixel mobile target floor.

The fixed desktop side panels can leave the center map column narrow before the
mobile layout applies. At compact desktop widths the lens uses the same stacked
label, action row, and legend structure, caps itself to the map column minus the
right HUD lane, and never overlays the Land tabs or panel.

The county Market sheet is reachable from the lens, the Market card inside the
Land panel's Development section, the county-head settlement sheet, venture
review, and Network → Trade & Guild. Secondary settlement sheets do not repeat
the county-wide shortcut. The sheet's selector uses the same dark parchment
field and dropdown styling as the lens, stacking below its label on mobile.
The sheet shows endowments and their effects, stock, price/trend, last-season
production/demand/import/export,
player household/enterprise contributions, shocks, ventures, charters, and
hardship. Before the first seasonal report, transient fields say when they will
update.

The public engine surface is `FB.ensureMarket`, `FB.marketSeason`,
`FB.marketCounty`, `FB.marketPrice`, `FB.marketCostQuote`,
`FB.marketHouseholdDemand`, `FB.marketEnterpriseOutput`,
`FB.marketEndowments`, `FB.addMarketShock`, and `FB.marketRouteLines`.

## Raiding and market shocks

Raiding expeditions extract commodities directly from a victim county based on its local
endowments: provisions from grain/pastoral/fisheries, wares from textiles, materials from
timber/metalworking, and luxuries from entrepôts and fine vineyards. Successful raids inflict a
severe 4-season `market_shock` (`FB.addMarketShock`), reducing local production (−35% on a deep
sack, −20% on a skirmish) and restricting inter-county flows (−25%), resulting in immediate local
scarcity, hardship, and price surges in the victim province.
