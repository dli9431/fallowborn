Maritime catalogue and consumer corrections

Implemented scope

data/technology_maritime.js provides eight complete replacements: clinker_shipbuilding, knarrs, longships, coastal_piloting, celestial_navigation, naval_logbooks, harbor_works and dry_docks. All prerequisite graphs, explicit costs, first-evidence envelopes, inherited approximate regional adoption pairs, scalar effects, transport quantities and capability grants are retained. These adoption pairs are simulation defaults, not newly verified local dates. The changes distinguish practical navigation, specialized hulls, written directions, outfitting and drainable graving basins.

Yards and docks

Attested context: Museu Maritim de Barcelona, Les Drassanes, the origin and later rebuilding sections distinguish the shore complex used for galley construction and maintenance from its later fabric. They do not establish a drainable basin or a precise completed opening inventory. Source: https://www.mmb.cat/visita/descobreix/les-drassanes/

Simulation choice: the existing arsenal becomes Naval Outfitting Yard and requires harbor_works. Maintained slips, stores and workshops are distinct from the dry_docks technology's drainable-basin engineering. The harbor and arsenal discovery unlocks belong to harbor_works; dry_docks retains its own rule and effects. The yard keeps cost 140, upkeep 3, development minimum 5, county limit 1, tax 5, development 1, retinue 20 and AI priority 4. Its workforce is the existing funded manpower abstraction, not a fleet transaction or newly accepted historical installation.

Fishing and navigation

Simulation choice: the optional commercial Fishing Boat requires coastal_piloting instead of the northern cargo-vessel technology knarrs. Its two ordered expansions require harbor_works and naval_levies instead of sternpost_rudder and dry_docks. These choices express practical coastal work and organized paid scale, not claims that all Mediterranean or northern fishing shared one boat, instrument or institution. Existing enterprise cost 40, base seasonal yield 2.5, laborPay 1.25, expansion costs 140/420, staffing 2/3 and effects are retained. Full staffing controls production and ancillary capacity; ordinary household fishing remains baseline.

Clinker construction and longships retain their existing graphs, including the mortise_tenon_shipbuilding prerequisite. Removing that joinery relationship requires specialist evidence and is outside this correction. Celestial Navigation and Sailing Directions remain optional navigation refinements under their existing grants; descriptions do not require instruments or written routes for every ordinary voyage. No new oceanic-navigation grant, sea route, ship, fleet, remount model or transport quantity is added.

Ownership and limits

Standing and ruined buildings, owned boats, completed upgrade indexes and development receipts retain their saved identities. New purchases use current requirements and ordinary funds; completed property is not revalidated as a new purchase or awarded again on restore. Ordinary JSON examples exercise independently configured coastal businesses and yards through the existing validators and transactions. This correction accepts no named site, opening building inventory, local adoption date, catch total, ecological claim or new political right. Tests are authored in tests/e2e/specs/maritime-catalogue-corrections.spec.js; runtime, device and balance acceptance remain separate owner work.
