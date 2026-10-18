Occupation, claims and county receipts

The existing political, war and fiscal owners distinguish a county's territorial hierarchy, direct holder, temporary military control, scoped rights and recognized political standing. These are separate facts. No new gameplay capability or saved ledger is introduced by this audit.

Declaration boundary

A bookmark province's realm selects its opening territorial court. Fresh initialization derives state.owner from the top realm and state.holder from the direct holder. A real liege relationship includes the existing subject government and fiscal obligations; use it only when that institutional relationship is intended. A superior's claim, military presence or diplomatic recognition alone does not establish such a relationship.

A realm with nonTerritorial:true may use an inhabited county as its diplomatic capital anchor without owning it. The realm remains a living political actor. The flag does not create an expedition mandate, hosted access, a garrison, an army, a revenue right or a displaced historical household. An off-map command or superior still needs its own supported declaration and authority contract.

The fictional river-control.json and upland-control.json files under tests/e2e/fixtures/authoring are complete ordinary JSON imports using the existing geographies and bookmarks roots. Both keep the outside court at a local court's anchor without granting it territory or income. River Courts grants the outside actor no local right. Upland Courts explicitly grants that actor an effective county Peace right under a fictional judgment, while the local court retains possession and ordinary revenue. This is an active jurisdiction example, not a way to encode an unproved or merely asserted claim. The two examples use different resident identities; the outside court's identity does not replace either population.

Rights and recognition

Province customaryRights can seed Peace, Revenue or Consent under the existing possession, tenure or judgment rules. Possession requires actual holding. Detached tenure and judgment require a nonempty basisRef. Opening recognition seeds are rejected because recognition needs a live canonical record. A Peace right can support territorial recovery through FB.political.territorialClaims and the existing war review; it does not allocate the county's ordinary tax. A Revenue right permits an eligible reviewed render, rather than creating another automatic county tax stream.

FB.authorityRecognize records a typed issuer, subject, source, scope and succession stamp. Recognition neither changes owner/holder nor grants an unconditional appointment or power. Sources with countyRights:true may strengthen or establish recognition-based rights only for powers the subject already possesses. Do not use recognition as a shortcut to invent a historical grant or bootstrap collection. Ordinary scoped appointments retain the appointing institution, living issuer, recognition and succession checks.

Military control and settlement

Ordinary campaigns retain temporary siege and occupation state in state.wars[warId].occupations. FB.ordinaryOccupationControl resolves camp control for that campaign's endpoint army, independently of the legal holder. A staged or completed siege does not transfer county ownership, appoint a governor or change resident culture or religion. Recapture reverses the campaign's occupation; white peace clears it without awarding land. Territorial victory uses the existing objective settlement transaction. Holy-war and rebel occupations retain their own owners and are not interchangeable opening records.

There is no bookmark field for a free-standing historical occupation, permanent garrison or displaced-claimant administration. Starting an invented live war to obtain its occupation record would add unsupported objectives and a peace lifecycle. Do not seed state.wars or state.authority through arbitrary JSON fields. A future concrete requirement for an enduring military controller, a nonpossessing fiscal collector or a displaced claimant must first identify the accepted scope and review the missing consumer. The existing campaign record is not that extension.

Fiscal boundary

FB.treasurySnapshot enumerates each county's direct holder and composes FB.settlementActorFiscal with the realm's revenue strategy. Settlement lordship receipts and liege remittances follow their existing obligations. A second political actor or campaign occupation does not add a second county tax allocation. Ordinary wartime occupation does not itself replace the holder in this fiscal pass, and this audit does not promise that every occupied county stops producing income. Any actual interruption continues to depend on the existing economic, population, modifier and government rules.

FB.political.renderQuote requires effective Revenue, a distinct real payer and public payee, finite positive amount, funds and a unique obligationId. FB.authorityCollectRender rechecks the complete quote and transfers the money once. A fiscal agent collects for the appointing institution, not the agent's private purse. Repeating the obligation is rejected. This is a conserved specific transfer, not evidence for tribute, a census, an annual historical assessment or an automatic occupation levy.

1241 boundary

The current 1241 opening supplies first-pass regional courts and fictional household starts. It does not install an operating western expedition or historical occupation/tribute administration. Prior conquest does not resolve an opening collector, local official, surviving claimant or later recognition. The current declarations can retain bounded local courts and resident continuity without granting an outside command their revenues. Unknown opening roles remain unresolved; no 1243 recognition, mature successor court, garrison total or later fiscal institution follows from this audit. Historical named courts and operational links require their own accepted evidence and supported contracts.

Compatibility and coverage

Existing state.owner, state.holder, authority and ordinary campaign records retain their meanings. No save-schema change, runtime script, import root, distribution flag or initialization hook is added. Matching restore must retain the existing rights and temporary campaign facts without replaying initialization or renders. Technology impact requires no new entry because this work documents and exercises existing capabilities; the existing county recovery and authority rules retain their own reviews and military equipment gates.

tests/e2e/specs/occupation-claim-boundaries.spec.js covers both real file imports, detached rejection without state/RNG/uid/catalogue mutation, jurisdiction without fiscal possession, recognition without a collection right, conserved one-time institutional renders, campaign-local control, matching restore, recapture and white peace. Existing authority-phase-2.spec.js, customary-governing-identity.spec.js and claim-packages.spec.js cover succession, stale authority, right decay and territorial settlement. Execution and device review remain owner-controlled.
