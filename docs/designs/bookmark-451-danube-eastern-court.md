# Spring 451: Danube districts and the eastern court

The hidden Spring 451 world corrects the Danube and eastern provincial literals
in `data/bookmark_451_scaffold_c.js`. The physical map, settlement slots,
development, resident cultures and population shares retain the widened scaffold.
These are coarse playable districts, not reconstructed fifth-century censuses.
The date remains hidden and existing bookmarks keep their own definitions.

## Courts and ordinary landholding

| Correction | Evidence and interpretation |
| --- | --- |
| Sirmium belongs only to `sirmium_local_451`, a generated Roman/Nicene local custodian with `lineage_kingship`. | [Priscus, embassy narrative](https://faculty.georgetown.edu/jod/texts/priscus.html), the captured city's vessels and captive bath-builder passages, establishes conquest and settled inhabitants. Local custody is a simulation choice, not an attested independent dynasty or restored Roman sovereignty. |
| The remaining Pannonian districts keep `gepids_476` as their stable scaffold owner, displayed as Pannonian Communities, with its anchor moved to the Pannonian interior (`szekesfehervar`). | Priscus distinguishes settled provisioning districts from the campaigning court but supplies no complete district boundaries. This anchor and local custodial form are explicit abstractions. No claim of an independent Ardaric monarchy or precisely located Gepid capital is made. |
| Marcian replaces Basiliscus in `east_451`, at Constantinople, with Pulcheria as his sole authored consort and no invented children. | [Hydatius, Chronicon](https://www.thelatinlibrary.com/hydatiuschronicon.html), Theodosius XXVII, records Marcian's accession at Constantinople and marriage to Pulcheria. The institutional capital is an opening convention, not a dated personal itinerary. |
| The eastern court retains `roman_civic`, its ordinary provincial appointments and public territory. All local references, including the Pontic following's patron, name `east_451`. | Hydatius's accession entry supports a distinct eastern imperial court. Its specific delegation scopes remain inherited game abstractions. It has no feudal dependency on the western court and no seeded tribute agreement. |
| Feletheus, Theoderic the Amal and Theoderic Strabo are replaced by generated adults; the Amal-labelled following becomes Gothic Following. | These later copied identities are not established as opening incumbents by the accepted contemporary evidence. Their districts and following anchors remain qualified scaffold values. No replacement named subject king is invented. The Rugian court uses the existing settled `regnum` form. |

Sirmium is the only county reassigned in this correction. Its Roman/Nicene,
Gepid/Homoian and Gothic/Homoian communities retain their respective 7000, 2500
and 500 shares. The Pannonian interior, Upper Pannonia, Mursa, Rugian and other
Danubian districts likewise retain their distinct ordinary holders and settled
communities. Coalition dominance supplies no territorial award, liege link,
private property, recruitment transfer or tax entitlement. A later camp can use
Sirmium as a coordinate without owning it. This file declares neither the
coalition nor its principals, military opening or access agreement.

The two local custodial courts use generated adults with a founder-only family
graph. The graph asserts no historical ancestry, spouse or children. Marcian's
birth seed of 391, Pulcheria's 399 and the custodian's 416 are approximate gameplay
ages; ordinary numeric and trait seeds carry no biographical skill claim.

## Spring Christian presentation

The copied `chalcedonian` values become the broader `nicene` category across this
region's counties, resident components, governing identity, officials and local
institutions except the Constantinople see described below. This is initial dated
classification, with no live conversion or population movement. Existing Homoian
and Miaphysite components remain distinct;
the latter are broad retrospective labels for tendencies rather than a claim
that all later ecclesiastical divisions already existed.

[The Council of Chalcedon, Acts](https://www.newadvent.org/fathers/3811.htm),
sessions I-III, supplies the qualified 451 incumbents Anatolius at Constantinople
and Dioscorus at Alexandria. The opening uses their incumbency without importing
the autumn council's verdicts, canon 28 or a predetermined deposition. Copied
Acacius, Timothy Aelurus, Peter the Fuller, Anastasius, Constantius, Severinus,
Paul and Longinus identities are removed. Unverified local office holders and
representatives remain generated; existing civic and religious institutions and
their physical sites remain in place.

The Constantinople see retains its scaffold `chalcedonian` label as an explicit
presentation hold. Its stable `constantinople_patriarch` office is also the
shared Chalcedonian head office. The local-institution validator in
`js/world.js` rejects a different local faith at that same office unless the
faith shares the head definition. Reclassifying it as Nicene therefore cannot
preserve the existing office identity through this declaration alone. The
institution and Anatolius remain, but this one label is not a claim that the
autumn settlement already applied in spring. Other sees and the eastern ruler
use the supported spring classifications without changing their stable offices.

## Retained uncertainties and coverage

Noricum, Raetia, Morava, northern Danubian districts, Gothic following locations,
Pontic sponsorship and the eastern frontier retain scaffold boundaries and
institutions. Their precise spring jurisdiction, demography, confession and
office personnel are unresolved. Regional court faiths are working defaults,
not evidence for Ardaric's or another coalition principal's personal confession.
No later conquest, restoration or compulsory payment is seeded.

`tests/e2e/fixtures/authoring/world-451-corrections-c.json` pins every regional
county's ordinary owner, culture, faith and resident mixture, every court,
institution, opening actor and appointment through the shared canonical bookmark
validator. The shared checks retain complete physical coverage, pure validation,
other-world fingerprints, malformed JSON rejection and current-content save
replay. This correction introduces no gameplay capability or technology gate.
