# Fallowborn

A browser grand-strategy dynasty saga — except you probably start as a **serf**.
Begin in **Spring 867** or **Spring 1066**, then guide one family through the
generations: from mud-floored huts toward
manors, baronies, and — if fortune and cunning allow — crowns.

## Play

Open `index.html` in any modern browser. That's it — no build step, no server, no dependencies.

- On **play.fallowborn.com**, one complete online visit prepares the core game for offline play. Once
  **Game available offline** appears on the title screen, the hosted URL can be refreshed, closed, and
  reopened without connectivity, including in the selected language. Supporting browsers can
  also install it from their address bar or browser menu. Offline availability is not permanent:
  clearing site data removes both cached game files and local saves, and browsers may evict cache
  storage under pressure, so export important lives as text.
- On first load, choose whether to play music. The intro theme is bundled with the core game;
  other Opus tracks stream only when needed and remain cached after a complete download. The
  initial choice, volume, background playback, preferred tracks, and ratings can be changed later
  under **Settings**. Background playback is off by default; turn it on to keep the soundtrack
  playing from the title screen onward when the game loses focus or the screen locks.
  The now-playing title at the bottom of the map opens track controls with **Previous**, **Next**,
  **Hear this more**, and **Repeat**. Ratings are available only on play.fallowborn.com.
- Music needs its own preparation for offline play. On play.fallowborn.com, open
  **Settings → Music → Offline music** while online, then download one or more named banks or the
  complete soundtrack. Offline play selects the closest fully downloaded bank and otherwise uses
  the bank marked as the fallback. With only one bank downloaded, that bank simply loops. itch.io
  does not offer offline music downloads and shuffles all music included in its upload for variety.
- **Desktop (mouse):** drag to pan the map, scroll to zoom (county names appear as you zoom
  in — small counties name themselves only close up; closer still, settlements appear as
  generated emblems — towns, cities, and villages you can click for their sheet), click
  provinces for details.
- **Desktop (keyboard only):** fully playable without a mouse —
  arrows pan · Shift+arrows hop between neighboring provinces · `PgUp`/`PgDn` zoom · `H` center
  home · `Enter` selects the province at screen center · `T` `G` `B` `Y` `N` `U` open the
  Self/Kin/Deeds/Land/Network/Chronicle panels (shown in badges beside the tab titles) · in Deeds,
  `1–6` select Daily Focus and the five deed sections, then `Q W E` / `A S D` / `Z X C`
  activate the first nine entries in that section (and `Shift+Q W E` / `A S D` / `Z X C` for
  items 10–18) · Network uses `1–5` and the same letter grid for management actions only ·
  in events and dialogs, `1–9` choose an
  item and `Shift+1–9` reaches items 10–18 (the number row and numpad both work) · `Space`/`E` play/pause the
  flow of days · `+`/`−` change the speed of days · `F` skips to the next happening ·
  `V` opens autoresolve settings · `R` cycles the map filter (Realm / Mine / Liege /
  De jure duchies / De jure kingdoms / War) ·
  `[` `]` cycle panels · `Esc` menu/back/close ·
  `Tab` moves between buttons.
- **Mobile / touch:** drag to pan, pinch to zoom, tap provinces. In portrait the map sits
  above a full-width Deeds/Land/Network/Chronicle panel with the time controls fixed at the bottom
  in thumb reach; **tap your portrait in the top bar** to open the Self/Kin sheet. Dialogs
  open as bottom sheets, and tapping an item chip opens its exact card — appearance,
  quality, powers, worth, wearer, and valid actions. The speed of days lives in
  **☰ → Settings**.
- **Equip the household from character sheets.** Use **Equip items…** beneath the current
  head’s portrait or on a household character’s sheet to open their full figure and eight
  keyboard/touch-friendly slots. Choose a slot, then an object from the shared armory.
  Two-handed weapons reserve both hands; changing an outfit costs no day, but cannot be
  done while traveling or resolving an event. Only worn objects grant bonuses.
- **Hover or tap your gold, prestige, or piety** in the top bar for a source-by-source
  breakdown of what each brings in every season — focus, rents, dues, buildings,
  household improvements, maintained standards, resident-family costs, school fees,
  treasures, and upkeep.
  The gold sheet also records this year's
  purchasing-power change from coin prices.
- **Observe mode** (New Game → 👁 Observe): no character at all — the world simulates
  from the bookmark you selected while you watch the map, tap provinces, and read the
  chronicle. Its ☰ →
  Settings can also silence the news toasts or hide the panel for a pure-map view.
- The game autosaves every spring; three manual save slots live in the ☰ menu, beside 📤 Export / 📥 Import for keeping a life as text — the fallback for browsers that wipe local storage (some iPhones), and a way to move a life between devices.
- **☰ → 🐞 Report a bug** builds a ready-made report: your description (bug or suggestion)
  bundled with the game version, start seed, and your current life as save text — copy it and
  paste on [Discord](https://discord.gg/G8E67hY2pj), by email to hello@fallowborn.com, or as a
  [GitHub issue](https://github.com/dli9431/fallowborn/issues).

### Languages

English is the source language. Settings also offers AI-translated Preview catalogs for
French, German, Italian, and Spanish. The selection is saved in this browser and applies
after a reload; changing it during a life autosaves first. Interface text, core events, and
new chronicle messages are localized; proper names, mod-authored text, old prose already
frozen into a save, and the changelog may remain English. Invalid or outdated catalogs
safely fall back to English.

### Resources and reputation

**Money** belongs to the playable household and pays its costs, upkeep, wages, gifts, and
contracts. **Prestige** supports social and political advancement, while **piety** supports
religious acts and offices. **Common Voice** measures popular support.

**Standing** always belongs to a particular relationship. A person, realm, lord, Pope,
guild, or institution can each hold a different opinion of the current protagonist. Guild
Standing is part of an active vocational guild record rather than a general household
resource. Hover or tap the top-bar resources for their current sources and seasonal effects.

### The loop

Time passes **day by day** (90-day seasons, 360-day years).

1. Set a **focus** in the *Deeds* tab — it is pursued every day until you change it: work your
   land, drill with the levy, haggle at market, copy manuscripts, or manage your household.
   The **Ongoing commitments** ledger above the deeds keeps personal and political attention,
   national research policy, active travel, and financial contracts together; compact layouts
   also show the daily focus and link it to the top of the focus list. Select a row to reach
   its existing control, or select the ledger title to collapse it.
2. Act on **deeds** when the moment is right — one-shot acts like poaching, scheming, proposing
   marriage, or petitioning your lord. Each spends the day; many need time before repeating.
   Commoners can open **🏠 Better the household…** without spending a day. Five living
   standards and profession-specific work outfits rise through purchased levels with
   seasonal upkeep; the sheet previews the next season before every upgrade. Better food
   and quarters protect the household, wares aid education, luxuries bring prestige,
   transport makes later journeys cheaper or faster, and work outfits improve matching
   paid work and enterprises. If upkeep cannot be met, optional levels lapse in a safe,
   predictable order rather than creating debt. Levels pass to heirs, but a lost or
   voluntarily reduced level must be bought again. Permanent Pack Mules, tools, mail,
   Warhorses, and productive holdings remain a separate buy-once property section.
   **Coin & Credit** is a no-day-cost household ledger: borrow against reliable income or
   named collateral, repay early, and commit merchant coin to four-season trade
   partnerships. Nominal coin prices can raise or lower the purchasing power of idle coin
   and fixed nominal debts. Separately, every county keeps seasonal stocks and local prices
   for provisions, wares, materials, transport, and luxuries; tangible purchases and
   household necessities use those local quotes while wages, taxes, contracts, and service
   fees stay fixed in real gold. Open the **Market** map lens or a county sheet to compare
   price symbols, stocks, historical endowments, disruptions, and your routes. Miss one loan
   deadline and its face grows; miss the extension and the disclosed
   pledge or revenue assignment is enforced. Debt passes to heirs.
   Adult freeholders and gentry can **🧭 Take to the road…** for pilgrimage, trade,
   study, or paid service; barons and higher may travel for pilgrimage or study.
   Choose a marked county from the map/list, then let days
   pass as the traveler crosses each county; maintained transport changes the quoted
   cost and leg duration when departure begins, and that quote stays fixed for the
   whole journey. Their focus and personally staffed
   enterprise pause while the household continues at home. At the destination,
   finish the purpose, stay at least three months, and keep living there for
   as long as you wish. After a year of building a life there, you may make that
   county the household’s permanent home—but only as a freeholder or gentry
   traveler, and each character can relocate only once. Rulers remain temporary
   guests and receive court-residence stories instead of looking for local wages.
   One exception follows a destination wedding: a baron or greater ruler who
   marries the person they came to visit may abdicate and stay there as landless
   gentry, abdicate and continue as their lawful heir while the couple remains
   there, or decide later. The **Stay after marriage…** deed remains available
   until the visit ends; this wedding move skips the one-year wait but still uses
   that character’s single lifetime relocation.
   Named characters remember personal encounters. Assign your one **personal-attention**
   slot to cultivate a local character’s Standing each day alongside your ordinary
   focus. A distant character offers a targeted visit: review the route, cost,
   three-month stay, daily rate, and time to +40, then travel to them. Road days
   pause the relationship; Standing starts changing after arrival, pauses again on the
   return, and a later visit can resume the same assignment. At
   sufficient Standing you may explicitly name an eligible contact as your friend; events that
   call for a friend use that canonical relationship. Friendship belongs to the current life
   rather than the dynasty.
   Anger someone deeply enough and they may
   declare a rivalry of their own. A feud has visible heat, can grow from insults into claims
   and knives, or end through compensation, mediation, a witnessed oath, common cause, or
   satisfaction by duel. Your heir chooses whether an old ruler's quarrel belongs to the house.
3. Press **Space** (or the Play/Pause button) to set time flowing — days pass on their own
   (~3 per second) — and press it again to pause. **F** / the ▶▶ button skips straight to the
   next happening. Events pause the days while they await your choice; they land on their own
   schedule, and your choices in them shape your life.
4. Marry and raise children — but mind your **station**: matches are weighed by rank, and the
   great houses bar their doors to suitors from far beneath them. Marrying up takes long
   courtship, renown, and luck (and pays a dowry to match); marrying down is easy, and noted.
   And should you outlive a grander spouse, their house owes you a settlement — while a child
   of that blood carries a claim worth pressing. Faith writes the marriage law: some grant
   divorce, some let a man keep several wives, and a Christian match can only be unmade by
   the church. The desperate have been known to plot darker exits.
   Choose each child's education focus, then arrange home teaching, charity or merchant
   school, a known tutor, the Noble Academy, or a personal learned master. Better
   instruction raises the yearly learning chance, while schools and masters charge every
   season. Gentry households whose realm knows Scholarly Networks may pay dearly for the
   academy's broad 75% instruction and noble connections, but each completed term adds a
   small fatality risk at New Year—four terms reach 2%. From age twelve you can also arrange
   a child's match from
   their sheet: three families stand ready to hear an offer — a daughter's dowry is paid when
   the pledge is sealed, a son's bride brings hers to the wedding, and the vows follow once
   both are sixteen. Left alone, grown children find their own (unremarkable) matches —
   and when the nursery is full enough, a 🛑 No more children toggle on your spouse's
   sheet stops further conceptions.
   Realm-ruler sheets show their sons and daughters and the one designated heir. Courting
   one materializes that royal child at the realm capital and uses the same
   targeted visit before courtship begins. Any
   listed child makes a dynastic tie, but only the designated heir's branch can transmit
   the crown: the royal spouse succeeds first, shared descendants follow that branch, and
   the realms join only when the rightful ruler becomes your protagonist.
   When death comes (it will), continue as your heir — and if
   your heir is still a child, their upbringing is yours to direct from the *Self* tab.
   From age ten onward (depending on the trade), **Work & Enterprises** on a family
   member's sheet can place them in an apprenticeship. Adult spouses and unmarried children
   bring wages home or staff family fields, workshops, stalls, and other enterprises; a
   business left idle earns nothing. Resident spouses and children also add provisions and
   quarters to seasonal household upkeep. Craft and merchant careers can climb the guild from
   ordinary membership to guildmaster, and landing does not erase a person's learned
   occupation. Once the sovereign nation completes **Guild Charters**, a guildmaster with
   60 guild standing and 40 Standing with the grantor can petition the local lord or a landed vassal's direct
   liege for a commodity-specific monopoly. Baron and greater rulers can grant one local
   Craft output, local Trade exchange, or exact trade-corridor monopoly instead. Chartered
   corridors improve distribution and matching venture returns; ordinary commodity ventures
   remain available without one. Incoming and outgoing charters can coexist, matching enterprise
   bonuses add together up to +50%, and **Network → Trade & Guild** shows their terms and
   remaining days. A charter cannot be renewed or revoked early.
   Reading and writing also open three scarce learned careers: Administration, Medicine,
   and Scholarship. Trainees become Lettered through practice, then sit risky paid exams
   for a license and one of two permanent specialties. Their work can produce income and
   Standing, protect the resident household from mortality, contribute national research,
   or create an inherited family treatise. Merchant Guild officers and guildmasters must
   also be Lettered and meet Learning requirements, so literacy supports the wider career
   ladder rather than acting only as a small skill bonus.
   The **Network** tab gathers household, personal, guild, trade, vassal, and foreign ties.
   Its Household, Connections, Trade & Guild, Political Blocs, and Realm sections show total
   and needs-attention counts and collapse independently. Large sections add a **Show all**
   route after the first five routine rows; warnings and active commitments stay visible first.
   Its household block also shows active standard icons/levels and their seasonal upkeep.
   Open **Household Plan…** there to scan every living managed family member and retainer
   in one place: education, instruction and fees, work and standing, enterprise or office
   assignments, match eligibility, and equipped-item/slot counts. Select an available cell
   to use the same detailed controls found on character and Work & Enterprises sheets.
   **Work & Enterprises** uses the same counted sections and large-list search. Its filters
   separate attention, settled work, staffed or idle enterprises, and unavailable people;
   every enterprise row still opens the exact owned instance.
   The Education Policy above that ledger can fill empty education focuses and choose the
   strongest currently available school, known tutor, or home instruction under a seasonal
   fee cap for each child. It previews every immediate choice before saving, never hires a
   personal master, never replaces an existing manual or policy choice, and does not reserve
   the quoted coin. A later unaffordable fee still pauses that term normally. Use Follow
   household policy in either detailed picker to clear and reconsider only that child’s
   focus or instruction; completed terms and lesson progress remain intact. The policy
   passes to each succeeding household head.
   Established households can hire a limited number of paid retainers as stewards, factors,
   captains, or tutors. Their seasonal contracts pass to an heir, but their personal loyalties
   may not. The same tab shows every source and modifier behind the current levy instead of
   storing a separate army total.
5. Watch the *Kin* tab fill in: parents, siblings, uncles and aunts, cousins, grandchildren.
   The **🌳 See the family tree** button at the top of that tab draws the whole house as a
   tree — couples share a box, each brood hangs beneath its parents, † marks the dead.
   Your kin wed and have children of their own, and when your own line runs out, a sibling,
   nephew, or cousin of the house can carry the name onward.

### The ladder

Serf → Freeholder → Gentry → Baron → Count → Duke → King → Emperor.
A brand-new life finds a dismissible **First steps** checklist atop the *Deeds* tab —
five tiny goals that teach the core loop once — and the tab shows a hint for the
next rung by default; experienced players can disable guide hints in Settings. Wealth
buys freedom; Freeholders then buy inherited plots settlement by settlement. Land held together grows more
productive, and five plots in one settlement can be declared a manor once the family has
the standing to join the gentry. Standing with a lord then earns an established gentle house a
banner, normally after the manor has passed to an heir; battlefield glory during an active
war and the church can still raise an exceptional life more quickly. A founder who rose into the gentry
from below and has already fought and saved the lord may, with Martial 12 and 120 prestige, take command
of a count-or-greater ruler's live field host; leading that host to a real map victory
earns an immediate barony offer. Marriage and scheming offer other shortcuts. Meanwhile
~65 sovereign realms fight their own wars — and their dukes and counts
sometimes break away — so the map redraws itself decade by decade.

#### The religious ladder

The household also has a **religious ladder** under **Work, training & enterprises**.
Catholic and Muslim laypeople can become known for almsgiving, pilgrimage, and patronage;
religious workers instead rise through historically distinct paths. Catholic monks and
clerics move through profession, priory, ordination, and high office. Muslim students earn
scholarly standing and may become teachers, muftis, or judges, while mosque servants may
become muezzins, imams, and khatibs. These are not treated as one interchangeable
priesthood: Islamic learning and judicial appointment form their own path. Every resident
spouse and dependent child can pursue a rank, not only the player.

Catholic **Abbot/Abbess** and **Bishop** are contested appointments rather than ranks bought
from a menu. A qualified Abbot or Archpriest may seek a Bishopric on merit under the realm's
investiture policy, optionally endow the cathedral to improve the chance, or encounter a
rare corrupt offer after a refusal. A Bishop's personal, non-hereditary see has its own
income, household troops, focuses, diocesan powers, and events. It is not a generic barony:
the Bishop keeps homage, the Estates, construction, feasts, and liege service, but does not
gain ordinary baron taxes, court, monopolies, title petitions, private wars, or independence.

Catholic Bishops may petition the Pope for appointment as a **Cardinal** once their age,
Learning, religious standing, and Standing with the Pope qualify. Cardinals belong to a named College and vote
in Papal elections whose rules change with the century; an elected player hands secular
land to the lawful heir while governing the Church through the **Papacy** deed. That screen
also shows Papal authority, investiture policy, sanctions, and—if rival claimants divide
Catholic rulers—the durable obediences of a schism.

### The feudal ladder

Every county on the map belongs to someone: a count, who answers to a duke, who answers to
a king, who may answer to an emperor (the Land tab shows the whole chain, and the de jure —
"by ancient right" — duchy/kingdom/empire each county belongs to). Once you hold land of your own you play that
game in both directions. As a **vassal** you can petition your liege for land (you will need
Standing with him — 65 or more — and real standing of your own, 400+ prestige, and each grant costs
both), pay homage at
any court along your chain, appeal over a harsh liege's head to a higher lord, swear fealty
to a different sovereign — or raise your own banner and fight for independence (the
⚑ Declare independence deed, once you have 200+ prestige). A sworn baron, count, or duke
also sits in the realm's **estates** (the 🏛 Estates deed): summoned about once a year, the
assembled lords vote on the terms of service — the liege's aid (his cut of your revenue,
10–40%) and scutage (silver in place of banner service). Their houses form visible Crown,
Mercantile, Magnate, and Independent blocs with influence based on rank, land, and office.
Your own redress or scutage motion costs 15 gold, opens a 90-day campaign, and includes one
attempt to lobby an undecided bloc before you call the influence-weighted vote; Governance
and Network show the same leaders, members, interests, and forecast. As a **liege**
you can grant counties to sworn men, squeeze them for extraordinary taxes, revoke the fiefs
of the disloyal, and weather their petitions, feuds, and revolts. Titles follow the land —
and the promotion is automatic the day you hold it: the majority of a duchy's counties makes
you its duke (a duchy must span at least two counties and always demands at least two), the
majority of a kingdom's counties makes you its king, and the majority in two kingdoms of one
empire makes you its emperor. A king or emperor must also stand **independent**. Empty
wastelands — and any colony you settle on them — belong to no de jure title and count toward
nothing, and a duchy of a single county carries no duke's title. The de jure map filters
(`R`, or the 🗺 button) paint every duchy and kingdom on the map and name your strongest
claim; a tapped county's panel lists exactly how many of its counties you hold and how many
the title still demands.

Once you are a **count or higher**, your directly held counties can also become the
family's seat. Select one in the **Land** tab and choose **🏰 Move capital here…**.
Moving the capital and permanent household home costs 200 prestige, lowers Common Voice
by 15, and lowers Standing with every direct vassal by 15. Each ruler may choose only
once, never while travelling or personally serving in a war; the next protagonist
receives a new choice. Land, titles, buildings, and property stay in their counties.
If war tears away the current seat, a surviving directly held county becomes capital
and home automatically without cost or using the ruler's voluntary move.

As an **independent count or higher**, the **🕊 Foreign policy** deed assigns your limited
political attention to neighboring sovereigns. Counts and dukes can direct two courts,
kings three, and emperors four. **Improve** builds Standing with the court each season;
**Provoke** erodes it and can deliberately invite a more likely defensive war. Diplomacy
strengthens either direction. Friendly courts receive envoys more readily and are less
likely to attack. A two-year pact makes peace certain. Independent kings and emperors can
instead offer one adjacent sovereign an alliance at Standing 60+ for 25 gold, or gain one
through a royal marriage. Allies cannot attack each other; when one is attacked, the other
contributes an abstract defensive levy without joining the war. Alliances end when either
ruler changes. A war suspends that court’s direction until peace, and succession clears
the late ruler’s personal Standing and diplomatic network.

### War

From **baron** upward the *Deeds* tab always shows **⚔ Declare war**, with the exact lock
reason when no neighboring hostile realm can be reached. New county conquests prefer
either a bordering **de jure** right through a duchy, kingdom, or empire you actually
hold, or your single fabricated claim. Counts and higher fabricate one claim through a
targeted plot; it survives
succession and defeat, follows the county when ownership changes, and is consumed only when
that county is captured. Pacts and alliances remain absolute declaration blocks.

Where neither recognized right applies, the picker names the alternative plainly as a
**War of Aggression** and shows its target, siege objective, and political costs before
opening a required confirmation. It costs prestige and Common Voice, lowers Standing
with direct vassals and foreign sovereigns, and becomes harsher when the current ruler
has declared other recent aggressive wars. It grants none of the normal automatic
offensive-war prestige. Victory burdens the county for six years with **Conquered Without
Right**, reducing tax and levy while worsening Common Voice and unrest; repeated aggression
also makes poorly disposed vassals more likely to break away.

A displaced king or emperor whose intact crowned realm was handed to a usurper keeps one
narrow restoration right. It reaches the usurper’s current capital without adjacency and,
on victory, restores the whole realm and its vassals. Ordinary conquest and realm destruction
create no such right.

Your host musters the moment war begins — tap it on the map, then tap a
province to march it (the ⚙ automation can also command it, defensively or
offensively). Water links use local boats at low throughput. If the host is larger
than the available transport, it waits through repeated crossing cycles before the
whole host arrives; national seafaring and naval-organization technologies raise
transport capacity and crossing speed. You do not raise a separate fleet.
**Land is taken only by siege:** keep your host standing on the prize
and press the siege at each season's war council. An unfortified county takes three
steps. A fort adds one to four steps, pins hostile hosts that enter its county, requires
three times its garrison in uncontested besiegers, and inflicts predictable casualties
each active season; another road may bypass it. Field victories never hand over land by themselves; enough of
them make the enemy sue for peace, and then the choice is yours — take the tribute,
or press on for the walls. Defense cuts the same way against you: keep the enemy's
host out of your lands, because only a completed breach can take a fortified border
county. Fortified works extend the normal eight-season exhaustion limit by their tier.
Wars bleed gold and men throughout.

Great holy wars are separate global campaigns with many sovereign hosts on two camps.
Catholic Crusades may be called from late 1095 when Jerusalem is outside Christian rule;
Sunni Jihads may be called from 1105 when Jerusalem, Baghdad, Mecca, or Medina is outside
Muslim rule. An active Pope or Caliph makes the call, then banners gather for 180 days.
Adult freeholders and higher ranks may answer from the Deeds tab. Sovereigns command their
own host; vassals and unlanded volunteers serve through campaign events. Attackers must
occupy every lost holy objective, at least half the frozen target counties, and 60% of
their development within eight years. Battles, occupations, and seasons of service build
dynasty-persistent contribution.

When you answer an attacking call, you promise four, eight, or twelve seasons and name
what you seek: the target crown, sacred custody, an exact objective duchy or county, or
honor. A duchy or county may be promised to a living adult close relative. Service already
given survives succession; the heir may renew it or decline without penalty. Leaving
before the term is fulfilled costs 200 piety and 100 prestige and records a broken vow.
After the promised term, withdrawal costs the ordinary 100 piety and 50 prestige. Staying
enrolled until an earlier campaign resolution also fulfills the vow.

An attacker victory pauses at a non-dismissable settlement council before any occupied
land changes hands. The council weighs contribution alongside the vow, occupation,
existing rights, local culture and faith, and religious standing. You may accept the
leading claim, press your own, endorse a rival, offer vassalage or 50 gold in close cases,
or spend one of two standing points to object. A player religious head may bless one
non-player claim. Local same-faith lords can be confirmed intact when their whole realm
fits inside the award; otherwise a local cadet represents their claim without taking
uncaptured land. A personal land award still ends with an accept-or-decline choice.
Sacred custody pays 2 piety each season while your realm or one of its vassals holds it
and the same sovereign bloc controls at least one named site.

### Starts

Every browser profile begins with Serf as its only character start. Reaching Freeholder
in play permanently unlocks Free Farmer, Craftsman's Apprentice, Novice Monk, and
Man-at-Arms; reaching Gentry unlocks Hedge Knight; reaching Baron unlocks Petty Baron.
Locked beginnings stay visible and name the achievement they require. Observe remains
available without an unlock because it creates no character. These seven scenarios can
begin anywhere on a map spanning Europe, the Middle East, and North Africa. Before choosing
a scenario, choose the authored Spring 867 or Spring 1066 world. The latter begins after
Harold Godwinson's coronation and before the Norwegian and Norman invasions; those invasion
chains are not yet scripted.

**Sharing a start (seeds):** New Game offers a **Fresh start** or **🔑 Use this seed**.
Paste a friend's full start code to begin with their exact bookmark, world,
scenario, province, character, family preset, birthplace settlement, and—where a
county has more than one—the chosen culture-and-faith community. Six-part principal
starts keep their compact spelling; optional preset, settlement, and community fields
extend the code to as many as nine parts. The character screen comes pre-filled, so
you can check the details before committing. A shared code cannot bypass a locked
starting station. Old five-part codes still select 867. A
bare word or code preserves the
random world seed but lets you choose the bookmark and other details. Your own start
code waits in the ☰ menu once your story begins —
tap it to copy and share. Codes reproduce exactly only on the same game version and mod
set.

## Modding

The entire world — map, provinces, realms, events, cultures, traits, balance — is plain data in
`data/*.js`, using **real longitude/latitude coordinates** (province shapes are generated
automatically from seed points, so adding a province is three lines of text). Import
third-party JSON mods from the **Mods** menu at runtime without touching any files; bundled
`.js` conversions dropped into `mods/` get an Enable/Disable toggle there too.
See **[MODDING.md](MODDING.md)** for the full reference.

## Credits & license

All art is procedural (canvas-drawn map, generated heraldry) or standard system emoji/fonts —
no external assets are used, so the game folder is fully self-contained.
Written in dependency-free vanilla JavaScript.

Settlement names and locations in `data/settlements_real.js` are derived from the
[GeoNames](https://www.geonames.org/) geographical database (CC BY 4.0), with optional
top-up data from OpenStreetMap (© OpenStreetMap contributors, ODbL);
the curated historical layer in `data/settlements.js` is original work.

Source available under the [PolyForm Noncommercial License 1.0.0](../LICENSE) — free to
play, mod, and share noncommercially.
