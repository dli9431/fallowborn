Engineered conveyance and storage

Catalogue and simulation boundary

Three discoveries add three optional maintained civic facilities. Aqueduct Maintenance requires Lime Mortar and Practical Geometry, costs 50 research and unlocks Maintained Aqueduct. Qanat Construction requires Irrigation Channels and Practical Geometry, costs 50 and unlocks Qanat Works. Engineered Cisterns requires only Lime Mortar, costs 20 and unlocks Maintained Urban Cisterns. All three have empty passive effects and capability grants. Each optional new investment has its own hard technology-impact review with ordinary wells, carriage, channels, domestic collection and inherited repair as appropriate fallbacks.

Aqueduct construction costs 90 gold, upkeep 2 per season, devMin 4, one per county, AI order 23. It requires years 476-649 inclusive, a stamped late_antique campaign and the paying sovereign's Latin or Byzantine traditions. Qanat construction costs 65, upkeep 1, devMin 2, one per county, AI order 24, years 476-1300 inclusive and Persianate or Islamic traditions. Cistern construction costs 65, upkeep 1, devMin 4, one per county, AI order 25 and years 476-1300 inclusive. No construction development, population or prestige is awarded, and settlementDraw is false. These are simulation budgets and scoped investment permissions, not claims that inherited works vanished at a boundary.

Physical service

Each facility requires an actual declared water flow and lawful connected storage at its real destination. Aqueduct intake requires source and gradient; qanat intake also requires explicit groundwater suitability. Cisterns may use a finite rain catchment without an aqueduct. Source declarations and rights are not inferred from terrain, development, faith or knowledge. Every canonical service consumes two actual water units through the connected route, including terminal storage, and funds at most 30 campaign days. Aqueduct and qanat work cost 2 gold each; cistern work costs 1, plus actual funded upkeep prorated over 90 days. Period boundaries may shorten service. These dimensionless water quantities and cash-service rates are simulation parameters, not measured ancient capacities or labor estimates.

Only the canonical paid operation receipt supplies aqueduct/qanat populationCapacity 0.03 or cistern populationFamineProtection 0.05. The same site/effect demand cannot receive two conveyance bonuses, and every separate service consumes separate water. Transfer through intermediate storage grants no second benefit. An empty unoperated basin has zero protection. Work, lawful source access, current property/incumbent, uncontested receiving county and real payer reserves are rechecked on confirmation. Loss of eligibility or expiry stops the projection while property remains. Repairs do not require a current construction window or new discovery and do not manufacture operating water. Existing unopted legacy assets retain their ordinary defaults; no legacy record is rebound during restore.

Knowledge schedules

Every pair below is emergence/widespread, inclusive. Column order is default, Latin, Byzantine, Islamic, Persianate, Slavic, Nordic, Steppe, Baltic/Finnic, Caucasian, Northeast African. These literal schedules are simulation choices, separate from historical evidence windows. Mixed traditions select one whole pair by earliest emergence, then earliest widespread. Transmission traditions do not imply religion.

Aqueduct Maintenance: 400/1000; 1/400; 1/350; 200/800; 200/600; 700/1050; 800/1150; 700/1200; 900/1250; 200/700; 100/700.

Qanat Construction: 600/1100; 500/1000; 200/850; 200/800; -200/400; 850/1200; 900/1250; 500/1000; 950/1300; 300/850; 200/850.

Engineered Cisterns: 400/850; 1/400; 1/350; 200/700; 200/700; 600/1000; 750/1100; 600/1050; 800/1200; 200/800; 1/500.

At 867 Latin completes aqueduct and cistern knowledge; Byzantine, Islamic, Persianate, Caucasian and Northeast African traditions complete all three; default completes cisterns; the remaining traditions complete none. At 1066 Latin joins the all-three group; Slavic and default complete aqueduct/cistern knowledge, Steppe completes qanat/cistern knowledge, and Nordic/Baltic-Finnic complete none. All three are exposed at 1066; at 867 Baltic/Finnic has neither aqueduct nor qanat exposed and Nordic has no qanat exposed. Existing prerequisites are already complete at these released dates. Earlier knowledge can close Practical Geometry early, including its existing 0.1 research effect. Authoritative omissions remove descendants; retained campaigns are never reseeded and partial projects remain exact.

Evidence and holds

Vitruvius, On Architecture VIII.6.1-8 and 14-15, Joseph Gwilt translation, describes engineered channels, repair isolation and cement cisterns. This supports the engineering distinction and the -100/600 evidence envelope for conveyance and storage; it does not inventory later standing works. https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Vitruvius/8*.html

Cassiodorus, Variae VII.6, Hodgkin abridgment (1886), pages 324-326, describes an aqueduct official's maintenance and distribution responsibilities. The prescription supports organized upkeep, while opening condition and operating capacity remain unestablished. https://www.gutenberg.org/files/18590/18590-h/18590-h.htm

Brian Spooner, Abyari, Encyclopaedia Iranica I/4 (1983), pages 405-411, discusses qanat groundwater engineering. UNESCO's Persian Qanat Brief synthesis and Integrity sections distinguish aquifer access, gravity conduits and distribution. These support explicit groundwater/gradient constraints and a conservative -300/650 evidence envelope; they do not date a single invention or assign a county source. https://www.iranicaonline.org/articles/abyari-irrigation-in-iran/ and https://whc.unesco.org/en/list/1506/

Rika Gyselen, Economy iv, Encyclopaedia Iranica VIII/1 (1997), pages 104-107, supplies corroborating Sasanian hydraulic-property context. The earlier evidence review inspected indexed text but could not retrieve the direct page or inspect the underlying legal editions; that limitation remains. https://www.iranicaonline.org/articles/economy-iv/

Procopius, Buildings II.2.1-6, II.4.13 and II.6.10-11, supplies examples of reservoirs and rain capture in imperial praise. This corroborates the functional distinction without establishing uniform continuous operation or game-scale capacity. No named aqueduct, qanat, cistern, intake, route, holder, stock or date-specific inventory is accepted by this catalogue. https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Procopius/Buildings/2*.html

Authoring, compatibility and review

The complete engineered-waterworks-supplied.json and engineered-waterworks-rain.json files use the ordinary Mods picker and detached built-in validators. They differ in date, independent physical geography, gradient/groundwater versus rain inputs, capacity, payer hierarchy and useful demand. Both start with empty property and water stores. The supplied example makes aqueduct and qanat alternatives for one demand, while cistern service consumes a separate allocation. The rain example uses no aqueduct or qanat and has insufficient flow for repeated service. These fictional configurations are not historical installations.

Strict existing version-1 resource, binding and operation receipts preserve paid quantity, period, original actor, source route and definition fingerprints. Matching restores replay no delivery or charge. Missing opted-in records or changed definitions reject. Ordinary old knowledge, property, cost floors, fort levels and national caps keep their existing owners. Standard and CrazyGames tracked-directory allowlists cover the two new data scripts, and offline discovery follows index.html; no distribution flag or package policy changes.

Prospective owner review: engineered-waterworks.spec.js, water-operation-requirements.spec.js and the retained water-operation, profile-inheritance and catalogue-composition specs cover construction funding, paid service, competing demand, dry/blocked sources, current payer reserves, conditional effects, date/tradition boundaries, repairs, partial knowledge and strict saves. tools/test_i18n_waterworks.py checks the six structured display owners. These authored cases do not establish runtime, historical, device or balance acceptance.
