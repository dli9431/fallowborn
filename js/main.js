/* Fallowborn — boot, scenarios, turn loop, life & death */
window.FB = window.FB || {};

(function () {
  'use strict';

  const G = {};
  FB.game = G;
  FB.state = null;

  /* version & changelog — numbering and entry rules: docs/VERSIONS.md */
  FB.VERSION = '1.82.1';
  FB.CHANGELOG = [
    { v: '1.82.1', date: '2026-07-28', changes: [
      'Building works now keep county selection visible on mobile so rulers can raise buildings throughout their lands.'
    ] },
    { v: '1.82.0', date: '2026-07-28', changes: [
      'Family enterprises now offer a staffing preview that maximizes seasonal yield while preserving locked assignments.'
    ] },
    { v: '1.81.0', date: '2026-07-28', changes: [
      'Household education policies can now fill empty study focuses and choose the strongest affordable instruction without replacing existing choices.'
    ] },
    { v: '1.80.4', date: '2026-07-28', changes: [
      'Pregnancies now continue across succession, preserving the newborn’s recorded parents and family line.'
    ] },
    { v: '1.80.3', date: '2026-07-28', changes: [
      'Assets and lasting effects now share clear summaries of their costs, benefits, scope, duration, and transfer rules throughout the game.'
    ] },
    { v: '1.80.2', date: '2026-07-28', changes: [
      'Settings can now keep all daily focuses together above the categorized deeds.'
    ] },
    { v: '1.80.1', date: '2026-07-28', changes: [
      'Tutor, enterprise, retainer, and council pickers now show consistent candidate cards with benefits, costs, assignments, and replacement consequences.'
    ] },
    { v: '1.80.0', date: '2026-07-28', changes: [
      'The Network tab now opens a Household Plan ledger for reviewing and managing every living family member and retainer.'
    ] },
    { v: '1.79.0', date: '2026-07-28', changes: [
      'Lay and vocational religious standing now remain visible together, with only the stronger piety yield applied.',
      'Catholic abbots and bishops now receive contested appointments, and bishops govern personal non-hereditary sees with their own income, household, powers, and events.'
    ] },
    { v: '1.78.0', date: '2026-07-28', changes: [
      'Catholic bishops can now become Cardinals, elect Popes under changing historical rules, govern Papal authority and investiture, and confront rival obediences during a schism.'
    ] },
    { v: '1.77.0', date: '2026-07-27', changes: [
      'Raised hosts can now de-muster during ordinary wars, with surviving troops depending on where they stand.',
      'Sunni kings and emperors can now contest a sitting Caliph in an office-only succession war.'
    ] },
    { v: '1.76.0', date: '2026-07-27', changes: [
      'Great holy-war leaders can now reinforce a live field host with pilgrims, mercenaries, landless cavalry, or adventurers through wartime events.'
    ] },
    { v: '1.75.1', date: '2026-07-27', changes: [
      'Great holy-war settlement text, temporary modifier labels, and Roadwise guidance now read more clearly.'
    ] },
    { v: '1.75.0', date: '2026-07-27', changes: [
      'Character traits are now grouped as dispositions, formations, reputations, and conditions, with five new traits earned through votes, journeys, war service, rents, and family choices.'
    ] },
    { v: '1.74.0', date: '2026-07-27', changes: [
      'Great holy wars now end in settlement councils where vows, service, occupation, rights, and local support shape claims to captured land and sacred-site custody.'
    ] },
    { v: '1.73.0', date: '2026-07-27', changes: [
      'Temporary county and campaign modifiers now make relief, charters, vows, and military conditions visible until their effects expire.'
    ] },
    { v: '1.72.2', date: '2026-07-27', changes: [
      'Rulers who marry during a courtship visit can now abdicate and settle with their spouse or continue as their lawful heir, or defer the choice until the journey ends.'
    ] },
    { v: '1.72.1', date: '2026-07-27', changes: [
      'A generated ruler\'s heraldry and identity card now opens their full character sheet.'
    ] },
    { v: '1.72.0', date: '2026-07-27', changes: [
      'Living rulers can now be cultivated through capital visits, and gifts sent beyond the household’s realm travel by courier with visible delivery or return times.',
      'Gift choices remain readable in narrow dialogs.'
    ] },
    { v: '1.71.1', date: '2026-07-27', changes: [
      'Travel destination and trade venture screens now calculate large route lists faster, while relationship visits and ruler standing labels stay consistent as circumstances change.'
    ] },
    { v: '1.71.0', date: '2026-07-26', changes: [
      'Relationship cultivation and courtship now follow character residence, with personal visits to distant contacts and royal courts.'
    ] },
    { v: '1.70.0', date: '2026-07-26', changes: [
      'Guildmasters can now petition for time-limited monopolies, while barons and higher rulers can grant local charters with enterprise and tax effects.'
    ] },
    { v: '1.69.0', date: '2026-07-26', changes: [
      'Adult freeholders and gentry can now found trade ventures, choose a market, stake, and strategy, then dispatch the venture or accompany it on the road.'
    ] },
    { v: '1.68.0', date: '2026-07-26', changes: [
      'Gentry households can now send young family members to a Noble Academy for advanced lessons, noble connections, and new school events.'
    ] },
    { v: '1.67.0', date: '2026-07-26', changes: [
      'Unmarried grandchildren now join the managed household, with the same education, work, equipment, upkeep, and arranged-marriage controls as children.'
    ] },
    { v: '1.66.0', date: '2026-07-26', changes: [
      'Character and ruler sheets now offer cash and armory gifts, with recipient cooldowns and rank-based ruler prices.'
    ] },
    { v: '1.65.8', date: '2026-07-26', changes: [
      'The Land tab’s Notable folk list now shows the county holder, direct vassals, and liege chain.'
    ] },
    { v: '1.65.7', date: '2026-07-26', changes: [
      'Drawer and dialog exit controls now share consistent bottom-centered footers.',
      'Birthplace selection now advances without a redundant Next step, and fully zoomed-out mobile map dragging stays stable.'
    ] },
    { v: '1.65.6', date: '2026-07-26', changes: [
      'Equipment sheets now center their headings and split character names from the Equipment label on mobile.'
    ] },
    { v: '1.65.5', date: '2026-07-26', changes: [
      'Generic dialogs no longer show a shared Back button in their headers on embedded mobile layouts.'
    ] },
    { v: '1.65.4', date: '2026-07-26', changes: [
      'The Land tab now shows county economic development and its sovereign’s technological development.'
    ] },
    { v: '1.65.3', date: '2026-07-26', changes: [
      'Mobile dialogs and pickers now show complete bottom frames above device safe areas.',
      'Mobile tabs now use full labels without desktop keycap styling.'
    ] },
    { v: '1.65.2', date: '2026-07-26', changes: [
      'National technology research now takes longer across every historical era.'
    ] },
    { v: '1.65.1', date: '2026-07-26', changes: [
      'Desktop panel tabs now fold their keyboard shortcuts into compact keycap labels.'
    ] },
    { v: '1.65.0', date: '2026-07-26', changes: [
      'Technology research now offers automatic cheapest or domain-priority project selection, clearer project details, and faster realm processing.',
      'Later innovations and Patronize Scholars now follow a longer historical research curve.'
    ] },
    { v: '1.64.1', date: '2026-07-26', changes: [
      'Technology screens now open reliably from saved games and restore the correct menu when closed.',
      'Technology details now name concrete gameplay effects, and every prerequisite technology grants a modest direct benefit.'
    ] },
    { v: '1.64.0', date: '2026-07-26', changes: [
      'Technology now follows historical regional adoption and spreads through neighboring realms, alliances, wars, shared traditions, and faith networks.'
    ] },
    { v: '1.63.0', date: '2026-07-26', changes: [
      'Technology now belongs to sovereign nations, with shared research projects and military, economic, and administrative branches.'
    ] },
    { v: '1.62.0', date: '2026-07-26', changes: [
      'Wars now raise household necessity costs and charge seasonal logistics based on the live host’s composition.'
    ] },
    { v: '1.61.0', date: '2026-07-26', changes: [
      'Commoner households can now choose a living standard that shapes their daily expenses, provisions, comfort, health, and standing.'
    ] },
    { v: '1.60.2', date: '2026-07-25', changes: [
      'Great holy wars now announce the religious head’s call and the assembled armies’ march through wartime events.'
    ] },
    { v: '1.60.1', date: '2026-07-25', changes: [
      'Mobile Back now returns through previously selected Deeds, Land, Network, and Chronicle panels before leaving the game.'
    ] },
    { v: '1.60.0', date: '2026-07-25', changes: [
      'Crusades and Jihads now gather sovereign camps for field battles and objective sieges, with contribution deciding the territorial partition.'
    ] },
    { v: '1.59.1', date: '2026-07-25', changes: [
      'Wealthier households now protect children from mortality and may improve their health, while childhood fevers offer three paid tiers of care.'
    ] },
    { v: '1.59.0', date: '2026-07-25', changes: [
      'Events, tasks, and livelihoods now follow societal role, with new stories for gentry, lords, and crowned rulers.'
    ] },
    { v: '1.58.0', date: '2026-07-25', changes: [
      'Character sheets now let you cultivate one personal relationship alongside daily work, with deliberate friendship and courtship thresholds and shared gift cooldowns.'
    ] },
    { v: '1.57.0', date: '2026-07-25', changes: [
      'Religious heads can now fall vacant and recover. Faith & Community now offers Papal restoration, Caliphate claims, and absolution after sacrilegious wars.'
    ] },
    { v: '1.56.3', date: '2026-07-25', changes: [
      'Island counties now remain on their own landmasses, restoring Man and removing disconnected coastal fragments.'
    ] },
    { v: '1.56.2', date: '2026-07-25', changes: [
      'Skills can now rise beyond 40, with sharply diminishing advancement after mastery.'
    ] },
    { v: '1.56.1', date: '2026-07-25', changes: [
      'Embedded phone play now shows an in-game Back control for dismissible dialogs, keeping itch fullscreen active.'
    ] },
    { v: '1.56.0', date: '2026-07-25', changes: [
      'Two authored starting dates now let a dynasty begin in Spring 867 or Spring 1066, with historical rulers and bookmark-aware starts, saves, and Observe mode.'
    ] },
    { v: '1.55.0', date: '2026-07-25', changes: [
      'The new Network tab gathers household, personal, guild, vassal, and levy relationships, with paid retainers and continuing office perks.'
    ] },
    { v: '1.54.8', date: '2026-07-25', changes: [
      'Catholicism and Sunni Islam now have centralized heads, styling the rulers of the Papacy as Pope and the Abbasid Caliphate as Caliph.'
    ] },
    { v: '1.54.7', date: '2026-07-25', changes: [
      'Starting county development now reflects the economic landscape of 867, with stronger Abbasid and Nile heartlands and less later-era weight on famous western cities.'
    ] },
    { v: '1.54.6', date: '2026-07-25', changes: [
      'The Work & Enterprises guild ladder now distinguishes Master from Guildmaster.'
    ] },
    { v: '1.54.5', date: '2026-07-25', changes: [
      'Mobile browser Back now steps through drawers, dialogs, and equipment views without undoing game decisions.'
    ] },
    { v: '1.54.4', date: '2026-07-25', changes: [
      'The title screen now keeps its name visible in narrow embedded views.',
      'The Self panel now groups identity details compactly, opens equipment from the portrait, and collapses titles and possessions.'
    ] },
    { v: '1.54.3', date: '2026-07-25', changes: [
      'Desktop scrollbars now use slim bronze styling throughout the game.',
      'The title screen now compacts itself to fit common browser and itch iframe heights without unnecessary scrolling.'
    ] },
    { v: '1.54.2', date: '2026-07-25', changes: [
      'Equipment figures now align boots with legs and place hands around one- and two-handed weapon grips.',
      'Equipment slot pickers now open over the equipment sheet and apply selections without a second confirmation.'
    ] },
    { v: '1.54.1', date: '2026-07-25', changes: [
      'Settlement names in province Land tabs now stay on one line and wrap cleanly between places.',
      'Finance, council, and estates displays now use the broadly supported money icon.'
    ] },
    { v: '1.54.0', date: '2026-07-25', changes: [
      'Journeys now include destination stays with local work, a three-month return gate, and one permanent household move per character life.',
      'A succeeding heir now equips the strongest usable items from the family armory.'
    ] },
    { v: '1.53.2', date: '2026-07-25', changes: [
      'Equipment sheets now list worn bonuses beneath the full figure, and Coin & Credit uses a broadly supported icon.'
    ] },
    { v: '1.53.1', date: '2026-07-25', changes: [
      'Character sheets use compact portraits again, with the full equipment figure opening from an Equip items button on desktop and mobile.'
    ] },
    { v: '1.53.0', date: '2026-07-24', changes: [
      'Household members now wear procedural full-body equipment from a shared family armory, with repeatable quality gear and wearer-specific powers. Death sheets remember the final outfit and battlefield provenance.'
    ] },
    { v: '1.52.0', date: '2026-07-24', changes: [
      'Currency mods can now define single or compound denominations used throughout prices, events, ledgers, and the household purse.'
    ] },
    { v: '1.51.5', date: '2026-07-24', changes: [
      'On touch, event choices accept deliberate taps sooner while still rejecting instant repeated taps.'
    ] },
    { v: '1.51.4', date: '2026-07-24', changes: [
      'Journeys now depart, return, settle, and cancel without province lookup errors.'
    ] },
    { v: '1.51.3', date: '2026-07-24', changes: [
      'Journey departure and cancellation now restore a clock that was running before destination selection.'
    ] },
    { v: '1.51.2', date: '2026-07-24', changes: [
      'Wars now keep every sovereign to one conflict, travel selection stays paused, titles render reliably, and army markers redraw only when their visible state changes.'
    ] },
    { v: '1.51.0', date: '2026-07-24', changes: [
      'A new 🧭 Take to the road deed lets freeholders and gentry set out on a journey — pilgrimage, trade, study, or paid service — traveling county by county across the map over game time, meeting events on the road, before turning back home or settling where they arrive.'
    ] },
    { v: '1.50.0', date: '2026-07-24', changes: [
      'Catholic and Muslim household members can now climb a religious ladder beside their livelihood — a lay path of almsgiving and pilgrimage, or a monk’s or priest’s vocation — and rising to high office (abbot, qadi, bishop, chief qadi) lifts standing and can open the clerical route into gentry and baron.'
    ] },
    { v: '1.49.0', date: '2026-07-24', changes: [
      'Keeping a household now costs coin — resident spouses and children add to seasonal upkeep — and children’s schooling gains paid options (home lessons, charity or merchant schools, personal tutors), each with its own fees and yearly learning odds.'
    ] },
    { v: '1.48.0', date: '2026-07-24', changes: [
      'Dynastic alliances and casus belli: marry into a realm’s ruling house to forge ties and claims — the designated heir’s line can carry a crown to your house — and fabricate claims to justify wars of conquest.'
    ] },
    { v: '1.47.0', date: '2026-07-24', changes: [
      'Petitioning for a barony now needs an established gentle house — an heir must inherit your gentry standing before a lord will grant one.'
    ] },
    { v: '1.46.0', date: '2026-07-24', changes: [
      'Freeholders now buy inherited land plot by plot, earn more from consolidated holdings, and may declare five plots in one settlement a manor.'
    ] },
    { v: '1.45.2', date: '2026-07-24', changes: [
      'Daily focuses now train skills more slowly.'
    ] },
    { v: '1.45.0', date: '2026-07-24', changes: [
      'Rivalries come alive: anger someone enough and they may declare a feud, whose heat escalates toward claims and knives until it is settled — by mediation, oaths, common cause, or a duel — or dies with an heir.'
    ] },
    { v: '1.44.0', date: '2026-07-24', changes: [
      'Coin, credit, and prices arrive: a yearly price index nudges the value of loose coin, and the 💰 Finance sheet lets you take loans, pledge collateral, and back trade ventures. Debt can be inherited, and a king may debase the coin.'
    ] },
    { v: '1.43.0', date: '2026-07-24', changes: [
      'Independent rulers can steer foreign policy — the 🕊 Foreign policy deed sets whether neighboring sovereigns warm to you or sour, within a limited span of attention.'
    ] },
    { v: '1.42.0', date: '2026-07-24', changes: [
      'Livelihoods for the whole household: choose work, apprentice your children, and run fields, workshops, and trading houses with guild rank that opens the grander trades. The Deeds panel is now sorted into collapsible sections.'
    ] },
    { v: '1.41.0', date: '2026-07-24', changes: [
      'A liege’s generosity now runs dry within a lifetime — each grant makes the next far less likely, and a new heir starts fresh.'
    ] },
    { v: '1.40.1', date: '2026-07-24', changes: [
      'Italia now contains the kingdoms of Italy and Sicily, making its imperial crown attainable.'
    ] },
    { v: '1.40.0', date: '2026-07-24', changes: [
      'Barracks and Archery Butts now cost seasonal upkeep too — a barracks’ paid men-at-arms are the dearest of all to keep.'
    ] },
    { v: '1.39.0', date: '2026-07-24', changes: [
      'Several buildings now cost seasonal upkeep, some are limited or can be demolished into ruins, and Raise Next streamlines repeated construction.'
    ] },
    { v: '1.38.0', date: '2026-07-24', changes: [
      'The Estates: vassals sworn to a liege now meet in assembly to vote the terms of service — the liege’s aid and scutage. The 🏛 Estates deed shows your terms and lets you put your own motion before the lords.'
    ] },
    { v: '1.37.0', date: '2026-07-24', changes: [
      'Random treasure keeps its rarity odds however full your hoard grows, and an offered barony can now be declined graciously.'
    ] },
    { v: '1.36.0', date: '2026-07-24', changes: [
      'The Royal Council: crowned rulers govern through five great officers raised from their vassals, each lending real strength. Manage crown authority, schemers, and flatterers from the 🏛 Royal Council deed.'
    ] },
    { v: '1.35.0', date: '2026-07-24', changes: [
      'Armies are a composition now, not a headcount — peasant levy, archers, mercenaries, and a hard core of men-at-arms who punch above their weight. New 🛡 Barracks and 🏹 Archery Butts recruit them, and the Land tab shows what your host is made of.'
    ] },
    { v: '1.34.0', date: '2026-07-24', changes: [
      'A new story for a low-born woman who cuts her hair and follows the man she loves into the war levy in disguise — a year of chapters that teach real martial skill and end on her own terms. Adds humble new armor, the Padded Jack.'
    ] },
    { v: '1.33.0', date: '2026-07-24', changes: [
      'Buildings now rise settlement by settlement within a county, and repeatable capstone innovations arrive. Arms training becomes a man’s road — women instead keep the household or cultivate the court — plus assorted war and revolt fixes.'
    ] },
    { v: '1.32.0', date: '2026-07-24', changes: [
      '💍 Seek a match now offers three families at once — an established house, a peer your own age, and a younger match — and they wait until you choose.'
    ] },
    { v: '1.31.0', date: '2026-07-23', changes: [
      'Every event choice now carries a short hint, new ways to spend piety appear at the temple (including a 🕯 Give alms deed), and the mobile event dialog no longer clips at the bottom.'
    ] },
    { v: '1.30.0', date: '2026-07-23', changes: [
      'Rivals are now your choice — a ⚡ Declare rival button appears when someone’s regard sinks low enough. Plus twice as many names per culture, deeper map zoom with county labels, clearer war guidance, and a 🛑 No more children toggle.'
    ] },
    { v: '1.29.0', date: '2026-07-23', changes: [
      'Tap a settlement in your own county (Land tab) to see the buildings standing there and what each provides, with a button to raise new works.'
    ] },
    { v: '1.28.0', date: '2026-07-23', changes: [
      'Vassals now send a share of their levy to your host, not just taxes, so granting land no longer weakens your army. A new domain limit drains income from counties held over your cap — 🎁 Grant land to vassals to relieve it and still rise in rank.'
    ] },
    { v: '1.27.0', date: '2026-07-23', changes: [
      'Hover or tap your gold, prestige, or piety in the top bar to see what each brings in every season, source by source.'
    ] },
    { v: '1.26.2', date: '2026-07-23', changes: [
      'A very long name no longer breaks the top bar on mobile — it now trims with an ellipsis.'
    ] },
    { v: '1.26.1', date: '2026-07-23', changes: [
      'On mobile, menus and end-of-life screens now fill the screen with a button pinned to the bottom, and the date sits on its own line above your resources.'
    ] },
    { v: '1.26.0', date: '2026-07-23', changes: [
      '⚙ Automation is now four clear choices, your host musters itself the moment war is declared, and you can command it in war — Defensive or Offensive.'
    ] },
    { v: '1.25.3', date: '2026-07-23', changes: [
      'On mobile, the top bar now shows the full date, including the year, beside your name.'
    ] },
    { v: '1.25.2', date: '2026-07-23', changes: [
      'On touch, event choices ignore taps for a moment after the dialog appears, so a stray tap can no longer pick an outcome by accident.'
    ] },
    { v: '1.25.1', date: '2026-07-23', changes: [
      'Fixed the skip and automation time buttons stacking onto two lines in the mobile bar.'
    ] },
    { v: '1.25.0', date: '2026-07-23', changes: [
      'New de jure map filters: the 🗺 button / R key now also paints duchies and kingdoms, and a county panel shows your progress toward its duke, king, and emperor.'
    ] },
    { v: '1.24.0', date: '2026-07-23', changes: [
      'Three field victories no longer force a war to end in tribute — the beaten enemy sends envoys, and you choose to take the silver or press on to the siege.'
    ] },
    { v: '1.23.2', date: '2026-07-23', changes: [
      'Fixed garbled characters on the title-screen menu when the game is served with a non-UTF-8 charset, as on itch.io.'
    ] },
    { v: '1.23.1', date: '2026-07-23', changes: [
      'Report a bug dialog reordered: describe the bug or idea first, then 📋 Copy report, with the links below.'
    ] },
    { v: '1.23.0', date: '2026-07-23', changes: [
      'New ☰ menu button, 🐞 Report a bug: describe the problem and copy a ready-made report to paste on Discord, in an email, or as a GitHub issue.'
    ] },
    { v: '1.22.0', date: '2026-07-23', changes: [
      '📤 Export a life as text and 📥 import it back — a copied save survives storage wipes and moves between devices, and the game now warns when saving is blocked.'
    ] },
    { v: '1.21.1', date: '2026-07-23', changes: [
      'Browser tabs and iOS home-screen shortcuts now show a Fallowborn icon.'
    ] },
    { v: '1.21.0', date: '2026-07-23', changes: [
      'Settings can now switch the game to French, German, Italian, or Spanish — marked AI Preview, with proper names and old saved prose staying English.'
    ] },
    { v: '1.20.2', date: '2026-07-23', changes: [
      'The Play/Pause button now flips to ▶ Play when the game pauses itself, instead of showing a stale Pause.'
    ] },
    { v: '1.20.1', date: '2026-07-23', changes: [
      'On phones the game pauses and autosaves the moment the page loses focus — switching apps no longer lets days run on unseen.'
    ] },
    { v: '1.20.0', date: '2026-07-22', changes: [
      'Low-born lives gain a five-part struggle over common rights, more short stories, and everyday incidents — winning the Old Custom can secure heritable rights or a serf’s freedom.'
    ] },
    { v: '1.19.3', date: '2026-07-22', changes: [
      'The ☰ menu button stays pinned to the top right on portrait phones.'
    ] },
    { v: '1.19.2', date: '2026-07-22', changes: [
      'On portrait phones the four resources move to their own row so gold no longer clips off the edge.'
    ] },
    { v: '1.19.1', date: '2026-07-22', changes: [
      'The Settings dialog picks the speed of days with a single slider instead of five buttons.'
    ] },
    { v: '1.19.0', date: '2026-07-22', changes: [
      'New Game now takes a start seed — paste a friend’s code for their exact world and character, and your own seed shows in the ☰ menu to copy and share.'
    ] },
    { v: '1.18.0', date: '2026-07-22', changes: [
      'New deeds to expand by land: petition for a neighbor’s fief, buy out a weak count, or settle the wasteland — and heirless neighboring counties can now fall to you if your standing wins the scramble.'
    ] },
    { v: '1.17.2', date: '2026-07-22', changes: [
      'Hold F to fast-forward repeatedly, instead of one skip per press.'
    ] },
    { v: '1.17.1', date: '2026-07-22', changes: [
      'On phones the Changelog now sits as a framed panel with a Close button pinned to the bottom.'
    ] },
    { v: '1.17.0', date: '2026-07-22', changes: [
      'Wounds and sicknesses now have names, listed on your character sheet and drawn on your portrait as bandages, cuts, bruises, and a haggard face.'
    ] },
    { v: '1.16.4', date: '2026-07-22', changes: [
      'A large batch of fixes and performance work — real defensive wars against breakaway vassals, more reliable autosaving, steadier touch input on the map, and faster fast-forward among many others.'
    ] },
    { v: '1.16.3', date: '2026-07-22', changes: [
      'Death no longer flashes by at speed: a fatal event is always shown, and the succession screen waits for a deliberate choice.'
    ] },
    { v: '1.16.2', date: '2026-07-22', changes: [
      'Fixed a baron left sworn to a lord who lost his home county — he now answers to the county’s new holder.'
    ] },
    { v: '1.16.1', date: '2026-07-22', changes: [
      'Older saves now name your late parents, instead of “Unrecorded”, above your siblings.'
    ] },
    { v: '1.16.0', date: '2026-07-22', changes: [
      'Name your newborn children: the birth event shows a name field you can edit or reroll.'
    ] },
    { v: '1.15.1', date: '2026-07-22', changes: [
      'Fixed the panels and map bouncing while time runs, and kept the date a fixed width.'
    ] },
    { v: '1.15.0', date: '2026-07-22', changes: [
      'While observing, ☰ → Settings can silence the world-news toasts and hide the Land & Chronicle panel — the map alone on stage.'
    ] },
    { v: '1.14.4', date: '2026-07-22', changes: [
      'Long dialogs — the Changelog and How to Play — now open at the top instead of jumping down to the Close button.'
    ] },
    { v: '1.14.3', date: '2026-07-22', changes: [
      'Your host always marches under a green banner, your war enemy’s under red.'
    ] },
    { v: '1.14.2', date: '2026-07-22', changes: [
      'Hosts stand on a disc of their realm’s color, and a clash shows a ⚔ for the day — battles read at a glance on the map.'
    ] },
    { v: '1.14.1', date: '2026-07-22', changes: [
      'Hosts on the map are drawn on the province they stand in, not mid-road — no more floating in the Channel.'
    ] },
    { v: '1.14.0', date: '2026-07-22', changes: [
      'New Game offers an 👁 Observe mode: no character, no events — watch the centuries flow as realms war, fall, and redraw the map, with the chronicle reporting the whole world.'
    ] },
    { v: '1.13.0', date: '2026-07-22', changes: [
      'The menu gains a Settings dialog with a tap-friendly speed chooser, and the help no longer mislabels −/+ as zoom keys.'
    ] },
    { v: '1.12.0', date: '2026-07-22', changes: [
      'The menu gains a Changelog button and shows the game version at its foot.'
    ] },
    { v: '1.11.1', date: '2026-07-22', changes: [
      'Hosts on the map are easier to tap and re-task, hunting an enemy host tracks it day by day, and fast-forward is quicker.'
    ] },
    { v: '1.11.0', date: '2026-07-22', changes: [
      'New deed: ⚑ Declare independence — a sworn lord or baron with enough prestige can renounce his liege, seize his home county, and fight for his own banner.'
    ] },
    { v: '1.10.0', date: '2026-07-22', changes: [
      'Wars now take the field: realms raise hosts on the map that march province to province and fight where they meet. Muster your own (🚩), march it, and take a county by siege.'
    ] },
    { v: '1.9.0', date: '2026-07-21', changes: [
      'Events now show a card for every character they name — face, house arms, home, allegiance, skills, and traits — so a rival never arrives as a bare name.'
    ] },
    { v: '1.8.0', date: '2026-07-21', changes: [
      'The end screen rolls the dynasty’s dead: every life you played, with years, title, and a parting line from the chronicler.'
    ] },
    { v: '1.7.0', date: '2026-07-21', changes: [
      'Great houses can fall: ignore a rising, a rival’s claim, or a murder plot through three warnings and you lose every acre, dropping to landless gentry.'
    ] },
    { v: '1.6.1', date: '2026-07-20', changes: [
      'A child’s Study focus trains more slowly, and childhood lesson events recur less often.'
    ] },
    { v: '1.6.0', date: '2026-07-20', changes: [
      'The climb is steeper — freedom, manors, baronies, and liege grants all cost more, and lieges grant land more grudgingly. Every culture’s name pool roughly tripled.'
    ] },
    { v: '1.5.0', date: '2026-07-20', changes: [
      'Only gentle households may send a child to be educated by the lord, and a baron raised to a county now answers to the granting lord’s own liege.'
    ] },
    { v: '1.4.0', date: '2026-07-20', changes: [
      'Clicking the dead in the family tree opens their sheet — birth and death years, skills, and traits.'
    ] },
    { v: '1.3.0', date: '2026-07-20', changes: [
      'Clicking your own province now highlights your own realm, and a new map filter (🗺 button or R key) cycles Realm → Mine → Liege.'
    ] },
    { v: '1.2.0', date: '2026-07-20', changes: [
      'The liege’s name in the Deeds banner opens his sheet.'
    ] },
    { v: '1.1.0', date: '2026-07-20', changes: [
      'The title screen shows the game version, and the Changelog opens from it.'
    ] },
    { v: '1.0.0', date: '2026-07-20', changes: [
      'First release.'
    ] }
  ];

  function $(id) { return document.getElementById(id); }

  /* ================= scenarios ================= */
  G.SCENARIOS = [
    { id: 'serf', name: 'Serf', diff: '★★★★★ hardest',
      desc: 'Bound to the soil, owning nothing — not even yourself. Every step upward must be bought, begged, or bled for.',
      tier: 0, profession: 'farmer', gold: 5, prestige: 0, piety: 0,
      intro: 'You are {name}, a serf of {province}. The lord owns your labor; the church owns your Sundays; the soil will own your bones — unless you claw your way to something more.' },
    { id: 'farmer', name: 'Free Farmer', diff: '★★★★ hard',
      desc: 'A small plot, a strong back, and your own name in the rolls. Freedom is a start — now make it into wealth.',
      tier: 1, profession: 'farmer', gold: 20, prestige: 5, piety: 0,
      intro: 'You are {name}, a free farmer of {province}. Your land is small, your debts are few, and your ambitions need not be.' },
    { id: 'apprentice', name: 'Craftsman’s Apprentice', diff: '★★★★ hard',
      desc: 'Sawdust, burns, and a trade worth silver. Guilds and town councils are ladders for those who can climb.',
      tier: 1, profession: 'craftsman', gold: 15, prestige: 5, piety: 0,
      intro: 'You are {name}, apprenticed to a master of the craft in {province}. Your hands are learning what your purse will someday know.' },
    { id: 'monk', name: 'Novice of the Faith', diff: '★★★ tricky',
      desc: 'The path of learning — the only career open to talent regardless of birth. In Christian lands a monk bound for the mitre; in Muslim lands a madrasa student bound for the qadi’s seat.',
      tier: 1, profession: 'monk', gold: 2, prestige: 0, piety: 25,
      intro: 'You are Brother {name} of {province}, newly sworn. Letters, prayer, and patience can raise a nobody higher than any sword — but a dynasty will need... arrangements.',
      intro_muslim: 'You are {name}, a student of the madrasa of {province}. Ink, memory, and the law can raise a nobody higher than any sword — and unlike the Christians’ monks, a scholar may yet marry and found a house.' },
    { id: 'soldier', name: 'Man-at-Arms', diff: '★★★ tricky',
      desc: 'Paid to stand where the arrows land. Glory is quick, death is quicker, and lords remember men who save them.',
      tier: 1, profession: 'soldier', gold: 10, prestige: 10, piety: 0, mar: 3, sex: 'm',
      intro: 'You are {name}, a spear in the service of the lord of {province}. Wages are thin, but battlefields are where nobodies become somebodies.' },
    { id: 'knight', name: 'Hedge Knight', diff: '★★ fair',
      desc: 'Gentle blood, empty purse. A horse, a blade, and admittance to halls where futures are granted.',
      tier: 2, profession: 'noble', gold: 40, prestige: 60, piety: 0, mar: 4, focus: 'train_arms',
      intro: 'You are {name}, gently born and poorly landed. The gentry’s door is open; the baron’s hall is the next to force.' },
    { id: 'baron', name: 'Petty Baron', diff: '★ classic',
      desc: 'A drafty tower, a hundred spears, and a liege watching your loyalty. The traditional start.',
      tier: 3, profession: 'noble', gold: 80, prestige: 150, piety: 0,
      intro: 'You are {name}, Baron in {province}, sworn to {realm}. Your tower is small and your ambitions are welcome to be otherwise.' }
  ];

  /* ================= seeds =================
     A start is reproducible because G.start re-seeds the RNG from the seed
     string before initPolitics and character generation draw on it — see
     docs/designs/seeds.md. Two shareable forms:
     - world seed: any text normalized to A-Z0-9 (fresh ones are base36)
     - start code: SEED-BOOKMARK-SCENARIO-PROVINCE-SEX-NAME
       (legacy five-part codes imply bookmark 867) */

  // a fresh seed is one-time seed initialization — the legitimate Math.random use
  function freshSeed() {
    return ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0).toString(36).toUpperCase();
  }

  function seedCode(seed, bookmarkId, scenId, provId, sex, name) {
    const n = (name || '').replace(/-/g, '').replace(/\s+/g, '_');
    return seed + '-' + bookmarkId + '-' + scenId + '-' + provId + '-' + sex + '-' + n;
  }

  /* parse what a player pasted: a full start code, a bare world seed, or an
     error to show inline. Five- and six-part shapes must validate as codes —
     silently falling back to a bare seed would hand them another world. */
  function parseSeedInput(raw) {
    const txt = (raw || '').trim();
    if (!txt) return { error: 'Paste a start code or world seed first.' };
    const parts = txt.split('-');
    if (parts.length >= 5) {
      const bad = 'That start code doesn’t parse — check it was copied whole.';
      if (parts.length !== 5 && parts.length !== 6) return { error: bad };
      const seed = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      const legacy = parts.length === 5;
      const bookmarkId = legacy ? '867' : parts[1].toLowerCase();
      const bookmark = FB.bookmark(bookmarkId);
      if (bookmark && FB.mods && FB.mods.bookmarkAvailable &&
          !FB.mods.bookmarkAvailable(bookmarkId)) {
        return { error: FB.mods.bookmarkWarning() };
      }
      const scenarioPart = legacy ? 1 : 2;
      const provincePart = legacy ? 2 : 3;
      const sexPart = legacy ? 3 : 4;
      const namePart = legacy ? 4 : 5;
      const scen = G.SCENARIOS.filter(function (s) {
        return s.id === parts[scenarioPart].toLowerCase();
      })[0];
      const prov = bookmark && bookmark.provinces.filter(function (p) {
        return p.id === parts[provincePart].toLowerCase();
      })[0];
      const sex = parts[sexPart].toLowerCase();
      const name = parts[namePart].replace(/_/g, ' ').trim();
      if (!seed || !scen || !prov || prov.wasteland || (sex !== 'm' && sex !== 'f') ||
        !name || name.length > 20) return { error: bad };
      if (scen.sex && sex !== scen.sex) {
        return { error: 'That start code pairs a scenario and a sex that don’t go together.' };
      }
      return {
        seed:seed, bookmarkId:bookmarkId, scenario:scen,
        provinceId:prov.id, sex:sex, name:name
      };
    }
    const bare = txt.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!bare) return { error: 'That seed has no usable letters or digits.' };
    return { seed: bare };
  }

  /* ================= boot ================= */
  document.addEventListener('DOMContentLoaded', function () {
    // the one legitimate Math.random(): seed the game RNG once at boot, so
    // pre-game draws (random province, name suggestions) differ per visit;
    // loading a save overwrites the state from the file
    FB.seedRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    FB.loadSelectedLocale(function (loaded) {
      /* Mods establish the effective English source before hashes are checked.
         A changed mod string therefore falls back to that exact current English. */
      FB.mods.applyStored();
      if (FB.indexEventMessages) FB.indexEventMessages();
      FB.finalizeLocale(loaded);
      FB.activateBookmark(FBDATA.defaultBookmark || '867',
        function (frac, msg) {
          $('loadbar').style.width = Math.round(frac * 100) + '%';
          $('loadmsg').textContent = FB.T(msg);
        },
        function (error) {
          if (error) {
            $('loadmsg').textContent = error.message;
            return;
          }
          FB.map.init($('map'));
          FB.ui.wire();
          wireMenus();
          FB.drawCrest($('titlecrest'), 'Fallowborn');
          refreshTitle();
          FB.ui.showScreen('title');
        }
      );
    });
  });

  /* the title screen must say which world it will spawn: with mods active
     (bundled or stored), new lives and the map behind the menu are modded ones */
  function refreshTitle() {
    $('title-version').textContent = 'v' + FB.VERSION;
    $('btn-continue').classList.toggle('hidden', !FB.save.hasAuto());
    const note = $('title-mods');
    if (!note) return;
    const names = FB.mods.bundled()
      .filter(function (m) { return FB.mods.isEnabled(m.id); })
      .map(function (m) { return m.name; });
    FB.mods.list().forEach(function (m) { names.push(m.name); });
    if (names.length) {
      note.textContent = FB.T(names.length > 1
        ? '🧩 Mods active: {names}'
        : '🧩 Mod active: {names}', { names: names.join(' · ') });
      note.classList.remove('hidden');
    } else {
      note.classList.add('hidden');
    }
  }

  function wireMenus() {
    $('btn-newgame').addEventListener('click', function () { showNewGame(); });
    $('btn-continue').addEventListener('click', function () { G.loadSlot('auto'); });
    $('btn-load').addEventListener('click', function () { FB.ui.showSaveLoad(false); });
    $('btn-mods').addEventListener('click', function () { FB.ui.showMods(); });
    $('btn-settings').addEventListener('click', function () { FB.ui.showSettings(); });
    $('btn-help').addEventListener('click', function () { FB.ui.showHelp(); });
    $('btn-changelog').addEventListener('click', function () { FB.ui.showChangelog(); });
    $('btn-bm-back').addEventListener('click', function () { FB.ui.showScreen('title'); });
    $('btn-ng-back').addEventListener('click', function () { showBookmarks(); });
    $('btn-pick-back').addEventListener('click', function () {
      G.pickMode = false;
      document.body.classList.remove('picking');
      FB.ui.showScreen('newgame');
    });
    $('btn-pick-random').addEventListener('click', function () {
      const cands = FB.world.provs.filter(function (p) { return !p.wasteland; });
      G.pickProvince(FB.pick(cands));
    });
    $('cg-reroll').addEventListener('click', function () {
      const sex = document.querySelector('input[name=cg-sex]:checked').value;
      $('cg-name').value = FB.randomName(G.pending.culture, sex);
    });
    document.querySelectorAll('input[name=cg-sex]').forEach(function (r) {
      r.addEventListener('change', function () {
        $('cg-name').value = FB.randomName(G.pending.culture, r.value);
      });
    });
    $('btn-cg-back').addEventListener('click', function () { showPickProv(); });
    $('btn-cg-start').addEventListener('click', function () { G.start(); });
  }

  /* New Game opens here: roll a fresh seed, or play one someone shared.
     Errors show inline — toasts live on the game screen, hidden at title. */
  function showNewGame() {
    let h = '<div class="gm-list">' +
      '<button class="actionbtn" id="ng-fresh">🌱 Fresh start' +
      '<span class="adesc">A new seed is rolled — choose which age will be yours to shape.</span></button>' +
      '</div>' +
      '<div class="gm-body-text" style="margin-top:10px"><p>…or play a start someone shared:</p></div>' +
      '<input id="ng-seed" type="text" maxlength="96" placeholder="' +
      FB.esc(FB.T('Paste a start code or world seed')) + '">' +
      '<div id="ng-seed-err" class="hint"></div>' +
      '<div class="gm-list">' +
      '<button class="actionbtn" id="ng-seed-go">🔑 Use this seed</button>' +
      '</div>' +
      '<button class="btn" id="ng-cancel">Cancel</button>';
    FB.ui.openModal('New Game', h);
    $('ng-fresh').addEventListener('click', function () {
      FB.ui.closeModal();
      G.pending = { seed: freshSeed() };
      showBookmarks();
    });
    $('ng-cancel').addEventListener('click', FB.ui.closeModal);
    function useSeed() {
      const r = parseSeedInput($('ng-seed').value);
      if (r.error) { $('ng-seed-err').textContent = FB.T(r.error); return; }
      FB.ui.closeModal();
      if (r.scenario) { // a full start code: straight to the pre-filled details
        G.pending = {
          seed:r.seed, bookmarkId:r.bookmarkId, scenario:r.scenario,
          provinceId:r.provinceId, sex:r.sex, name:r.name
        };
        activatePendingBookmark(r.bookmarkId, function () {
          const pr = FB.world.byId[r.provinceId];
          G.pending.culture = pr.culture;
          G.pending.religion = pr.religion;
          showChargen();
        });
      } else {
        G.pending = { seed: r.seed };
        showBookmarks();
      }
    }
    $('ng-seed-go').addEventListener('click', useSeed);
    $('ng-seed').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.stopPropagation(); useSeed(); }
    });
  }

  function activatePendingBookmark(id, next) {
    FB.ui.showScreen('loading');
    $('loadbar').style.width = '0%';
    $('loadmsg').textContent = FB.T('Drawing the known world…');
    FB.activateBookmark(id, function (frac, msg) {
      $('loadbar').style.width = Math.round(frac * 100) + '%';
      $('loadmsg').textContent = FB.T(msg);
    }, function (error, bookmark) {
      if (error) {
        FB.ui.showScreen('title');
        FB.ui.openModal('Bookmark unavailable',
          '<div class="gm-body-text"><p>' + FB.esc(error.message) + '</p></div>' +
          '<button class="btn primary" id="gm-go">' + FB.esc(FB.T('Close')) + '</button>');
        $('gm-go').addEventListener('click', function () { FB.ui.closeModal(); });
        return;
      }
      G.pending = G.pending || {};
      G.pending.bookmarkId = bookmark.id;
      next();
    });
  }

  function showBookmarks() {
    const box = $('bookmarklist');
    box.innerHTML = '';
    const bookmarks = FB.bookmarks(false);
    for (const bookmark of bookmarks) {
      const el = document.createElement('button');
      el.className = 'scencard';
      el.innerHTML = '<h3>' + FB.esc(FB.T('{season} {year} — {name}', {
        season:FB.seasonName(bookmark.date.season),
        year:bookmark.date.year, name:FB.L(bookmark.name || bookmark.id)
      })) + '</h3><p>' + FB.esc(FB.L(bookmark.desc || '')) + '</p>';
      (function (selected) {
        el.addEventListener('click', function () {
          activatePendingBookmark(selected.id, showScenarios);
        });
      })(bookmark);
      box.appendChild(el);
    }
    const note = $('bookmark-note');
    const warning = FB.mods && FB.mods.bookmarkWarning ? FB.mods.bookmarkWarning() : '';
    note.textContent = warning ? FB.T(warning) : '';
    note.classList.toggle('hidden', !warning);
    FB.ui.showScreen('bookmarks');
  }

  function showScenarios() {
    const bookmark = FB.activeBookmark;
    $('ng-heading').textContent = FB.T('Choose Your Beginning — Anno Domini {year}', {
      year:bookmark.date.year
    });
    const box = $('scenariolist');
    box.innerHTML = '';
    for (const sc of G.SCENARIOS) {
      const el = document.createElement('button');
      el.className = 'scencard';
      el.innerHTML = '<h3>' + FB.esc(FB.L(sc.name)) + '</h3><div class="diff">' +
        FB.esc(FB.L(sc.diff)) + '</div><p>' + FB.esc(FB.L(sc.desc)) + '</p>';
      (function (scenario) {
        el.addEventListener('click', function () {
          G.pending = {
            seed:G.pending && G.pending.seed,
            bookmarkId:bookmark.id,
            scenario:scenario,
            provinceId:null
          };
          showPickProv();
        });
      })(sc);
      box.appendChild(el);
    }
    // observe mode: no province, no character — just a world to watch
    const obs = document.createElement('button');
    obs.className = 'scencard';
    obs.innerHTML = '<h3>' + FB.esc(FB.T('👁 Observe')) + '</h3><div class="diff">' +
      FB.esc(FB.T('no one, watching')) + '</div><p>' +
      FB.esc(FB.T('Be born as no one. The centuries flow and the realms war, rise, and ruin while you simply watch the map. No character, no events, no interruptions.')) +
      '</p>';
    obs.addEventListener('click', function () { G.startObserve(); });
    box.appendChild(obs);
    FB.ui.showScreen('newgame');
  }

  function showPickProv() {
    FB.ui.showScreen('pickprov');
    $('pickprov').classList.add('asbar');
    $('game').classList.remove('hidden');
    G.pickMode = true;
    document.body.classList.add('picking'); // mobile: hides the fixed time bar
    // paint the selected bookmark from static data (no game state yet)
    const realmById = {};
    for (const r of FBDATA.realms) realmById[r.id] = r;
    function topOf(rid) { // resolve authored vassal realms to their sovereign
      let cur = rid, g = 0;
      while (cur && realmById[cur] && realmById[cur].liege && g++ < 10) cur = realmById[cur].liege;
      return cur || rid;
    }
    FB.map.setOwnerFns(
      function (pid) { const pr = FB.world.byId[pid]; return pr ? topOf(pr.realm0) : null; },
      function (rid) { return realmById[rid] ? realmById[rid].color : '#777777'; },
      FBDATA.realms.filter(function (r) { return !r.liege; }).map(function (r) { return r.capital; })
    );
    FB.map.resize();
    FB.map.buildBase();
    FB.map.fitView();
    FB.map.playerProv = null;
    FB.map.select(null);
    updatePickInfo();
  }

  G.pickProvince = function (pr) {
    if (!pr) return false;
    if (pr.wasteland) {
      FB.ui.toast('No one is born in {province}. Pick a settled land.', { province: pr.name });
      return false;
    }
    G.pending.provinceId = pr.id;
    G.pending.culture = pr.culture;
    G.pending.religion = pr.religion;
    FB.map.select(pr.id);
    updatePickInfo();
    G.pickMode = false;
    document.body.classList.remove('picking');
    showChargen();
    return true;
  };

  function updatePickInfo() {
    const el = $('pickinfo');
    if (!G.pending || !G.pending.provinceId) {
      el.textContent = FB.T('No province chosen yet. Tap the map or use Random Province.');
      return;
    }
    const pr = FB.world.byId[G.pending.provinceId];
    const realm = FBDATA.realms.filter(function (r) { return r.id === pr.realm0; })[0];
    const culture = FB.cultureOf(pr.culture);
    const religion = FB.religionOf(pr.religion);
    el.innerHTML = '<b>' + FB.esc(FB.L(pr.name)) + '</b> — ' +
      FB.esc(realm ? FB.L(realm.name) : FB.T('independent')) + ' · ' +
      FB.esc(FB.renderKey('culture.' + pr.culture + '.name.default',
        { text: culture.name }, {})) + ' · ' +
      FB.esc(FB.renderKey('religion.' + pr.religion + '.name.default',
        { text: religion.name }, {})) + ' · ' + FB.esc(FB.terrainName(pr.terrain));
  }

  function showChargen() {
    const bookmark = FB.activeBookmark;
    /* a sex-locked scenario (Man-at-Arms is male-only) pins the matching radio
       and disables the other; any other scenario leaves both free */
    const scenSex = G.pending.scenario && G.pending.scenario.sex;
    document.querySelectorAll('input[name=cg-sex]').forEach(function (r) {
      r.disabled = !!(scenSex && r.value !== scenSex);
      if (scenSex) r.checked = r.value === scenSex;
    });
    // a shared start code arrives with its hero chosen — pre-fill instead of suggesting
    if (G.pending.sex) {
      document.querySelector('input[name=cg-sex][value="' + G.pending.sex + '"]').checked = true;
    }
    const sex = document.querySelector('input[name=cg-sex]:checked').value;
    $('cg-name').value = G.pending.name || FB.randomName(G.pending.culture, sex);
    const pr = FB.world.byId[G.pending.provinceId];
    const culture = FB.cultureOf(pr.culture);
    const religion = FB.religionOf(pr.religion);
    $('cg-era-hint').textContent = FB.T(
      'Playing a woman in {year} is a harder road: some doors open only by marriage, others only by defiance.',
      { year:bookmark.date.year });
    $('cg-summary').innerHTML = '<b>' + FB.esc(FB.T('{scenario} in {province}', {
      scenario: FB.L(G.pending.scenario.name), province: FB.L(pr.name)
    })) + '</b><br>' +
      FB.esc(FB.renderKey('culture.' + pr.culture + '.name.default',
        { text: culture.name }, {})) + ' · ' +
      FB.esc(FB.renderKey('religion.' + pr.religion + '.name.default',
        { text: religion.name }, {})) + ' · ' +
      FB.esc(FB.T('beginning in {year} AD, aged {age}.', {
        year: bookmark.date.year, age: FBDATA.balance.startAge
      })) + '<br>' + FB.esc(FB.T('🔑 World seed:')) + ' <b>' +
      FB.esc(G.pending.seed || '') + '</b> — ' +
      FB.esc(FB.T('once your story begins, the ☰ menu holds the full start code to share.'));
    FB.ui.showScreen('chargen');
  }

  /* ================= new game ================= */
  G.start = function () {
    G.observe = false;
    document.body.classList.remove('observing');
    // re-seed before politics and characters draw on the RNG, so anyone holding
    // the same seed and making the same picks gets this exact start
    const seedStr = (G.pending && G.pending.seed) || freshSeed();
    FB.seedRng(FB.hashSeed(seedStr));
    const bookmark = FB.activeBookmark;
    const start = {
      id:bookmark.id, year:bookmark.date.year,
      season:bookmark.date.season, day:bookmark.date.day
    };
    const sc = G.pending.scenario;
    const provId = G.pending.provinceId;
    const pr = FB.world.byId[provId];
    const sex = document.querySelector('input[name=cg-sex]:checked').value;
    const name = ($('cg-name').value || '').trim() || FB.randomName(pr.culture, sex);
    G.pending.name = null; G.pending.sex = null; // a shared code's pre-fill is spent

    const state = {
      v: 2,
      seed: seedCode(seedStr, bookmark.id, sc.id, provId, sex, name),
      start: start,
      date: { year:start.year, season:start.season, day:start.day },
      turn: 0, generation: 1, slotDays: [],
      chars: {}, roles: {}, eventQueue: [], log: [], legends: [], flags: {}, buildings: {},
      realmTech: {}, realmTechMigration: 2, techSeeded:0,
      itemInstances: {}, itemNextId: 1,
      armies: [], armyDown: {},
      alliances: [],
      religiousHeads: {},
      religiousHeadVacancies: {},
      papacy: null,
      greatHolyWar: null,
      greatHolyWarHistory: {},
      modifiers: { county:{} },
      player: {
        charId: null, tier: sc.tier, profession: sc.profession, professionBack: null,
        gold: sc.gold, prestige: sc.prestige, piety: sc.piety,
        provinceId: provId, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        foreignPolicy: {},
        warService: 0, liegeGrants: 0, gentryGeneration: sc.tier >= 2 ? 0 : null,
        traitProgress: {},
        flags: {}, cooldowns: {}, fired: {}, courtingId: null, suitorIds: null,
        socialAttention: {}, friendContacts: {}, socialGiftTurns: {}, realmGiftTurns: {},
        giftDeliveries: [],
        rivalContacts: {}, rivalPeace: {}, rivalry: null,
        provs: [], war: null, greatHolyWar: null, focus: null, dead: false,
        holdings: [], enterprises: [], householdStandards: {},
        educationPolicy: { focus:null, instructionMode:'manual', feeCap:0 },
        guildMonopolies: { incoming:null, outgoing:null },
        items: [], loadouts: {}, itemMigration: 1,
        landPlots: sc.id === 'farmer' ? [{ provinceId:provId, settlement:0 }] : [],
        landPlotMigration: 1, manor: null, fabricatedClaim: null, royalCompact: null
      },
      pregnant: null, peakTier: sc.tier, peakTitleData: null,
      economy: {
        price:1, lastRate:0, pressure:0, lastAdjustment:0,
        shocks:[], loans:[], investments:[], nextId:1, defaults:0
      },
      seasonMark: { gold: sc.gold, prestige: sc.prestige, piety: sc.piety }, seasonNet: null
    };
    FB.state = state;
    FB.initPolitics(state);
    FB.scriptedTick(state);
    scheduleSlots(state);

    const me = FB.makeCharacter(state, {
      name: name, sex: sex, culture: pr.culture, religion: pr.religion,
      born: start.year - FBDATA.balance.startAge,
      quality: sc.tier >= 2 ? 2 : 0, traitsN: 2
    });
    me.health = 8;
    me.dyn = FB.dynastyName(pr.culture, me.name, pr.name);
    if (sc.mar) me.skills.mar = Math.max(0, me.skills.mar + sc.mar);
    state.player.charId = me.id;
    FB.setCareer(state, me, sc.profession, 'journeyman');

    /* Issued kit is ordinary gear, not an immortal named artifact. Its
       quality is authored by the start and its appearance is saved normally. */
    if (sc.id === 'soldier') {
      const spear = FB.grantItem(state, 'ash_spear', { quality:'plain' });
      const jack = FB.grantItem(state, 'padded_jack', { quality:'plain' });
      if (spear) FB.equipItem(state, me.id, 'rightHand', spear);
      if (jack) FB.equipItem(state, me.id, 'body', jack);
    } else if (sc.id === 'knight') {
      const sword = FB.grantItem(state, 'broad_sword', { quality:'well' });
      const shield = FB.grantItem(state, 'round_shield', { quality:'plain' });
      if (sword) FB.equipItem(state, me.id, 'rightHand', sword);
      if (shield) FB.equipItem(state, me.id, 'leftHand', shield);
    }

    // parents — the first rung of the kin tree
    const dad = FB.makeCharacter(state, {
      sex: 'm', culture: pr.culture, religion: pr.religion,
      born: me.born - FB.ri(20, 40), role: 'parent', quality: 1, dyn: me.dyn
    });
    const mom = FB.makeCharacter(state, {
      sex: 'f', culture: pr.culture, religion: pr.religion,
      born: me.born - FB.ri(20, 34), role: 'parent'
    });
    dad.health = 8; mom.health = 8;
    dad.spouseId = mom.id; mom.spouseId = dad.id;
    dad.childrenIds.push(me.id); mom.childrenIds.push(me.id);
    me.fatherId = dad.id; me.motherId = mom.id;

    // siblings — a safety net of heirs
    const nSib = FB.ri(1, 2);
    for (let i = 0; i < nSib; i++) {
      const sib = FB.makeCharacter(state, {
        culture: pr.culture, religion: pr.religion,
        born: me.born + (FB.ri(-6, 6) || 2), // never a same-year twin
        role: 'sibling', dyn: me.dyn
      });
      sib.health = 8;
      sib.fatherId = dad.id; sib.motherId = mom.id;
      dad.childrenIds.push(sib.id); mom.childrenIds.push(sib.id);
    }

    if (FB.ensurePapacyState) FB.ensurePapacyState(state);

    if (sc.tier >= 3) {
      state.player.liege = (state.holder && state.holder[provId]) || state.owner[provId];
      state.player.liegeOp = 10;
    }
    state.player.focus = sc.focus || FB.defaultFocus(state);
    state.peakTitleData = FB.titleSnapshot(state);
    G.paused = true;

    FB.ui.mapDirty();
    FB.map.playerProv = provId;
    FB.ui.showGame();
    FB.map.centerOn(provId, 2.0);
    FB.ui.refresh();
    if (!state.player.flags.mapHintShown) {
      state.player.flags.mapHintShown = 1; // once per save: how to work the map
      FB.ui.toast('Drag to pan, scroll or pinch to zoom — tap a province for details. Zoom in to see county names.');
    }
    FB.news(state, FB.msg('news.life.chronicle_begins',
      '📖 The chronicle of {dynasty} begins in {province}, {year} AD.',
      { dynasty: me.dyn, province: pr.name, year: state.date.year }));
    const introPath = (FB.religionOf(pr.religion).group === 'muslim' && sc.intro_muslim)
      ? 'intro_muslim' : 'intro';
    FB.ui.openModal('Your Story Begins', '<div class="gm-body-text"><p>' +
      FB.esc(FB.dataText(state, state.player.charId, 'scenario', sc.id, sc, introPath, {})) +
      '</p><p class="hint">' +
      FB.esc(FB.T('Set a daily focus (it continues until you change it) and act on deeds when the moment is right. Press Space to let the days flow — and again to pause. F skips to the next happening. Watch the Deeds tab for your path upward.')) +
      '</p></div><button class="btn primary" id="gm-go">' + FB.esc(FB.T('Begin')) + '</button>');
    $('gm-go').addEventListener('click', function () { FB.ui.closeModal(); });
    FB.save.autosave();
    FB.save.warnIfBlocked();
  };

  /* ================= observe mode =================
     New Game → 👁 Observe: a world without a protagonist. The player object
     exists so every system that reads it keeps working, but nothing personal
     ever ticks — passDay only turns the calendar and runs the world. Nothing
     is autosaved: an afternoon of watching must not bury a real life. */
  G.startObserve = function () {
    G.observe = false; // startObserve sets it below; clear any stale state first
    document.body.classList.remove('observing');
    // watchers share worlds too: a bare seed re-seeds the home pick and politics
    const seedStr = (G.pending && G.pending.seed) || freshSeed();
    FB.seedRng(FB.hashSeed(seedStr));
    const bookmark = FB.activeBookmark;
    const start = {
      id:bookmark.id, year:bookmark.date.year,
      season:bookmark.date.season, day:bookmark.date.day
    };
    const home = FB.pick(FB.world.provs.filter(function (p) { return !p.wasteland; }));
    const state = {
      v: 2,
      seed: seedStr,
      start:start,
      date: { year:start.year, season:start.season, day:start.day },
      turn: 0, generation: 1, slotDays: [],
      chars: {}, roles: {}, eventQueue: [], log: [], legends: [], flags: {}, buildings: {},
      realmTech: {}, realmTechMigration: 2, techSeeded:0,
      itemInstances: {}, itemNextId: 1,
      armies: [], armyDown: {},
      alliances: [],
      religiousHeads: {},
      religiousHeadVacancies: {},
      papacy: null,
      greatHolyWar: null,
      greatHolyWarHistory: {},
      modifiers: { county:{} },
      player: {
        charId: null, tier: 0, profession: 'farmer', professionBack: null,
        gold: 0, prestige: 0, piety: 0,
        provinceId: home.id, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        warService: 0, liegeGrants: 0, gentryGeneration: null,
        traitProgress: {},
        flags: {}, cooldowns: {}, fired: {}, courtingId: null, suitorIds: null,
        socialAttention: {}, friendContacts: {}, socialGiftTurns: {}, realmGiftTurns: {},
        giftDeliveries: [],
        rivalContacts: {}, rivalPeace: {}, rivalry: null,
        provs: [], war: null, greatHolyWar: null, focus: null, dead: false, holdings: [],
        householdStandards: {},
        educationPolicy: { focus:null, instructionMode:'manual', feeCap:0 },
        guildMonopolies: { incoming:null, outgoing:null },
        items: [], loadouts: {}, itemMigration: 1,
        landPlots: [], landPlotMigration:1, manor:null, fabricatedClaim: null, royalCompact: null
      },
      pregnant: null, peakTier: 0, peakTitleData: null,
      seasonMark: { gold: 0, prestige: 0, piety: 0 }, seasonNet: null
    };
    FB.state = state;
    FB.initPolitics(state);
    FB.scriptedTick(state);
    // a placeholder soul, never shown — some panels dereference it blindly
    const me = FB.makeCharacter(state, {
      name: FB.randomName(home.culture, 'm'), sex: 'm',
      culture: home.culture, religion: home.religion,
      born: start.year - 30, quality: 0, traitsN: 0
    });
    state.player.charId = me.id;
    if (FB.ensurePapacyState) FB.ensurePapacyState(state);

    G.observe = true;
    G.paused = false;
    document.body.classList.add('observing');
    document.body.classList.toggle('obshidepanel', G.obsBare); // a returning watcher's preference
    FB.ui.mapDirty();
    FB.map.playerProv = null;
    FB.ui.showGame();
    FB.map.fitView();
    FB.map.select(null);
    FB.ui.showTab('log', { history:false });
    FB.ui.refresh();
    FB.news(state, FB.msg('news.life.observe_begins',
      '👁 You settle in to watch the realms go about their centuries.', {}));
    FB.ui.toast('☰ → Settings sets the speed of days.');
  };

  /* ================= daily loop ================= */
  function scheduleSlots(s) {
    // 1-2 random event days this season, mirroring the old per-season pacing;
    // war is busier — a personal war guarantees an extra happening
    s.slotDays = [FB.ri(3, 88)];
    if (FB.chance(0.3)) s.slotDays.push(FB.ri(3, 88));
    if (FB.atWarPersonally(s)) s.slotDays.push(FB.ri(3, 88));
  }
  G.scheduleSlots = scheduleSlots;

  /* Advance one day. opts.skipFocus: an instant deed filled this day instead.
     Returns 'event' | 'dead' | 'season' | 'day' (or undefined if blocked). */
  G.passDay = function (opts) {
    const s = FB.state;
    if (!s || s.player.dead) return undefined;
    if (FB.ui.eventsBusy()) return undefined;
    if (FB.ui.travelPickerOpen && FB.ui.travelPickerOpen()) return undefined;
    const papalDecision = FB.papacyPendingDecision &&
      FB.papacyPendingDecision(s);
    if (!G.observe && papalDecision) {
      G.setPaused(true);
      if (FB.ui.showPapacy) FB.ui.showPapacy(papalDecision);
      return undefined;
    }
    if (!G.observe && FB.greatHolyWarSettlementNeedsPlayer &&
        FB.greatHolyWarSettlementNeedsPlayer(s)) {
      G.setPaused(true);
      if (FB.ui.showGreatHolyWarSettlement) FB.ui.showGreatHolyWarSettlement();
      return undefined;
    }
    const p = s.player;

    if (!G.observe) {
      if (!p.travel) {
        if (!(opts && opts.skipFocus)) FB.tickFocus(s);
        else FB.validateFocus(s);
      }
      FB.tickSocialAttention(s);
      if (FB.syncMaterializedRealmRulers) {
        FB.syncMaterializedRealmRulers(s);
      }
    }

    // advance date: 90-day seasons, 360-day years
    s.turn++;
    s.date.day++;
    let seasonBoundary = false, newYear = false;
    if (s.date.day > 90) {
      s.date.day = 1;
      s.date.season++;
      seasonBoundary = true;
      if (s.date.season > 3) { s.date.season = 0; s.date.year++; newYear = true; }
    }
    FB.scriptedTick(s);
    if (FB.religiousHeadRecoveryTick) FB.religiousHeadRecoveryTick(s);
    if (FB.papacyDay) FB.papacyDay(s);
    if (FB.guildMonopolyTick) FB.guildMonopolyTick(s);
    if (FB.modifierTick) FB.modifierTick(s);

    /* observe mode: the calendar turns, the realms tick once a year, hosts
       march daily — and that is all. No focus, upkeep, mortality, births,
       events, or autosaves; nothing personal ever reaches the watcher. */
    if (G.observe) {
      if (seasonBoundary && FB.techSeason) FB.techSeason(s, false);
      if (seasonBoundary && newYear) FB.worldTick(s);
      FB.armyTick(s);
      if (FB.greatHolyWarTick) FB.greatHolyWarTick(s);
      s.eventQueue.length = 0;
      FB.ui.refresh();
      return seasonBoundary ? 'season' : 'day';
    }

    if (FB.financeDay) FB.financeDay(s);

    if (seasonBoundary) {
      const upkeep = FB.householdUpkeep(s);
      const income = p.tier >= 3 ? FB.playerTax(s) : 0;
      const buildingUpkeep = p.tier >= 3 ? FB.buildingBonus(s, 'upkeep') : 0;
      const modifierUpkeep = FB.modifierUpkeep ? FB.modifierUpkeep(s, 'gold') : 0;
      FB.enterpriseList(s); // migrate legacy business holdings before either income path reads them
      /* Settle ordinary household income together; livelihoodSeason clamps the
         combined result once, so family wages really can meet family costs. */
      p.gold += income - upkeep - buildingUpkeep - modifierUpkeep +
        FB.holdingBonus(s, 'gold') + FB.landYield(s) + FB.itemBonus(s, 'gold') +
        (FB.positionBonus ? FB.positionBonus(s, 'gold') : 0);
      FB.livelihoodSeason(s);
      if (FB.papacySeason) FB.papacySeason(s);
      if (FB.householdStandardsSeason) FB.householdStandardsSeason(s);
      if (FB.retainerSeason) FB.retainerSeason(s);
      FB.educationSeason(s);
      p.prestige += FB.holdingBonus(s, 'prestige') + FB.itemBonus(s, 'prestige');
      p.piety += FB.holdingBonus(s, 'piety') + FB.itemBonus(s, 'piety');
      if (p.tier >= 3) {
        p.piety += FB.buildingBonus(s, 'piety') + (FB.councilBonus ? FB.councilBonus(s, 'piety') : 0);
        FB.addResearch(s, FB.buildingBonus(s, 'research'));
        if (FB.councilEnsure) FB.councilEnsure(s); // the royal council forms at a coronation — and heals old saves
        if (FB.parliamentEnsure) FB.parliamentEnsure(s); // the liege's terms of service — heals old saves too
        if (G.auto.build) FB.autoBuild(s);
      }
      /* A raised host costs its live composition once per season, for both
         ordinary and great holy wars. Shattered/disbanded hosts return zero. */
      if (FB.playerHostUpkeepParts) {
        const hostUpkeep = FB.playerHostUpkeepParts(s);
        p.gold = Math.max(0, p.gold - hostUpkeep.total);
      }
      if (FB.techSeason) FB.techSeason(s, G.auto.research);
      FB.playerWarTick(s);
      if (FB.greatHolyWarSeason) FB.greatHolyWarSeason(s);
      if (FB.sacredCustodySeason) FB.sacredCustodySeason(s);
      FB.tickForeignPolicy(s);
      FB.financeSeason(s);
      FB.tickRivalry(s);
      // the season's ledger: what each stat truly did since the last
      // boundary (focus trickle, upkeep, taxes, events and all) — shown
      // beside the topbar stats. Old saves lack the mark; start one.
      if (s.seasonMark) {
        s.seasonNet = {
          gold: p.gold - s.seasonMark.gold,
          prestige: p.prestige - s.seasonMark.prestige,
          piety: p.piety - s.seasonMark.piety
        };
      }
      s.seasonMark = { gold: p.gold, prestige: p.prestige, piety: p.piety };
      scheduleSlots(s);
      /* Annual revaluation follows the completed winter ledger. Its purse
         adjustment is therefore measured in the next spring-to-summer net,
         while Finance and the gold sheet show it immediately. */
      if (newYear) FB.financeYear(s);
      if (newYear) FB.worldTick(s);
      FB.save.autosave(); // snapshot before any mortality roll, never a dead state
      if (newYear) {
        yearlyLife(s);
        if (p.dead) return 'dead';
      }
    }

    birthTick(s);
    FB.armyTick(s); // hosts march and fight on the map every day
    if (FB.greatHolyWarTick) FB.greatHolyWarTick(s);
    if (FB.travelTick) FB.travelTick(s);
    if (FB.giftDeliveryTick) FB.giftDeliveryTick(s);
    if (s.peakTier === undefined || p.tier > s.peakTier) {
      s.peakTier = p.tier; s.peakTitleData = FB.titleSnapshot(s);
    }

    const events = FB.pickDailyEvents(s);
    FB.ui.refresh();
    if (events.length) {
      // runEvents reports whether a modal actually opened; autoresolved
      // events pass silently and the day keeps flowing
      if (FB.ui.runEvents(events)) return 'event';
      G.afterEvents(); // a silently resolved blow can still prove mortal
      return p.dead ? 'dead' : (seasonBoundary ? 'season' : 'day');
    }
    G.afterEvents();
    return p.dead ? 'dead' : (seasonBoundary ? 'season' : 'day');
  };

  /* Fast-forward until something happens: an event, a new season, or death. */
  G.skipAhead = function () {
    for (let i = 0; i < 92; i++) {
      const r = G.passDay();
      if (r !== 'day') break;
    }
  };

  /* ---------- the flow of days: auto-tick with pause/unpause ----------
     Speed is adjustable (+/- keys or menu → Settings); the default middle
     step is the old 350 ms ≈ 3 days per second. */
  G.SPEEDS = [700, 500, 350, 230, 140]; // ms per day, slowest → fastest
  G.speedIdx = 2;
  G.paused = true;
  G.observe = false; // New Game → 👁 Observe: watch a character-less world
  G.obsQuiet = false; //   …silence the world-news toasts while watching
  G.obsBare = false;  //   …hide the Land & Chronicle panel while watching
  G.uiPrefs = { combinedFocuses:false };
  try {
    const storedUiPrefs = JSON.parse(localStorage.getItem('fb_ui') || 'null');
    if (storedUiPrefs && typeof storedUiPrefs === 'object') {
      G.uiPrefs.combinedFocuses = !!storedUiPrefs.combinedFocuses;
    }
  } catch (e) { /* keep defaults */ }
  G.saveUiPrefs = function () {
    try { localStorage.setItem('fb_ui', JSON.stringify(G.uiPrefs)); } catch (e) { /* private mode */ }
  };
  G.setPaused = function (v) {
    G.paused = !!v;
    if (FB.state && FB.ui && FB.ui.refresh) FB.ui.refresh();
  };
  G.togglePause = function () { G.setPaused(!G.paused); };

  let tickTimer = null;
  function startTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (G.paused || !FB.state || FB.state.player.dead || G.pickMode) return;
      if (FB.ui.eventsBusy()) return; // an event awaits your choice
      if (!$('genmodal').classList.contains('hidden')) return; // a dialog is open
      if (document.hidden) return;
      G.passDay();
    }, G.SPEEDS[G.speedIdx]);
  }
  G.setSpeed = function (d) {
    G.speedIdx = FB.clamp(G.speedIdx + d, 0, G.SPEEDS.length - 1);
    startTicker();
    if (FB.ui && FB.ui.toast) {
      FB.ui.toast('⏱ Speed {current}/{total}',
        { current: G.speedIdx + 1, total: G.SPEEDS.length });
    }
  };
  startTicker();

  /* ---------- autoresolve (the Z button) ----------
     While days flow or fast-forward, selected event categories resolve
     themselves (see autoResolve in ui.js); outcomes go to the chronicle. */
  G.auto = {
    minor:false, major:false, war:false, all:false, style:'safe',
    hosts:'manual', build:false, research:false, researchMode:'cheapest'
  };
  /* NOTE: the settings once shared a key with the AUTOSAVE SLOT (save.js)
     and each overwrote the other; they now live under their own key. */
  try {
    const storedAuto = JSON.parse(localStorage.getItem('fb_automation') || 'null');
    if (storedAuto && typeof storedAuto === 'object') {
      for (const ak in G.auto) if (storedAuto[ak] !== undefined) G.auto[ak] = storedAuto[ak];
      // pre-1.25 the master switch `on` governed everyday events — now `minor`
      if (storedAuto.on !== undefined && storedAuto.minor === undefined) G.auto.minor = !!storedAuto.on;
    }
  } catch (e) { /* keep defaults */ }
  if (typeof G.auto.researchMode !== 'string') G.auto.researchMode = 'cheapest';
  G.saveAuto = function () {
    try { localStorage.setItem('fb_automation', JSON.stringify(G.auto)); } catch (e) { /* private mode */ }
  };

  function pauseForBackground() {
    G.setPaused(true); // setPaused, not a bare flag: the button must flip to ▶ Play
    // a backgrounded mobile tab may never come back — keep what was played
    FB.save.autosave();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseForBackground();
  });
  /* phones: switching apps, the app drawer, or a call overlay can blur the
     page without firing visibilitychange — pause so days don't run unseen */
  window.addEventListener('blur', function () {
    if (FB.isSmallScreen()) pauseForBackground();
  });

  G.afterEvents = function () {
    const s = FB.state;
    if (!s || s.player.dead) return;
    if (FB.syncMaterializedRealmRulers) {
      FB.syncMaterializedRealmRulers(s);
    }
    const me = s.chars[s.player.charId];
    if (me.health <= 0) {
      const provenance = s.player.pendingDeathProvenance || null;
      delete s.player.pendingDeathProvenance;
      G.die(FB.msg('legend.death.wounds',
        'Wounds and sickness prove too much. {name} does not see another season.',
        { name: me.name }), provenance);
      return;
    }
    if (FB.ui && FB.ui.showPendingMarriageResidence &&
        FB.ui.showPendingMarriageResidence()) {
      return;
    }
    FB.checkTierPromotions(s);
    FB.ui.refresh();
  };

  /* ---------- yearly aging, mortality, coming of age ---------- */
  function yearlyLife(s) {
    const p = s.player;
    const me = s.chars[p.charId];
    const year = s.date.year;

    // paid-term risks resolve now; surviving story candidates wait through mortality
    const schoolingAnnual = FB.schoolingYear ? FB.schoolingYear(s) : null;
    if (schoolingAnnual === false) return;

    // managed descendants: schooling, then coming of age
    educationTick(s);
    FB.livelihoodYearly(s);
    for (const c of FB.householdMembers(s)) {
      if (FB.playerDescendantKind(s, c.id) && FB.ageOf(c, year) === 16) {
        if (c.edu && c.edu.focus) {
          FB.gainSkill(c, c.edu.focus, 2);
          if (c.edu.focus === 'lea') FB.addTrait(c, 'literate');
          FB.queueEvent(s, 'child_educated', { childId:c.id });
        } else {
          FB.queueEvent(s, 'child_comes_of_age', { childId:c.id });
        }
      }
    }

    // the player, when still a child, comes of age the same way
    if (FB.ageOf(me, year) === 16) {
      if (me.edu && me.edu.focus) {
        FB.gainSkill(me, me.edu.focus, 2);
        if (me.edu.focus === 'lea') FB.addTrait(me, 'literate');
        FB.queueEvent(s, 'player_educated', {});
      } else {
        FB.queueEvent(s, 'player_comes_of_age', {});
      }
    }

    // an heir who succeeded while pledged honors the match their parent made:
    // once both are of age the wedding follows through the ordinary door
    if (me.betrothedId && !FB.spouseOf(s, me)) {
      const b = s.chars[me.betrothedId];
      if (!b || b.dead) { me.betrothedId = null; }
      else if (FB.ageOf(me, year) >= 16 && FB.ageOf(b, year) >= 16) {
        me.betrothedId = null; b.betrothedId = null;
        delete b.dowryAsk; delete b.dowryDue; // settled between the houses long ago
        p.courtingId = b.id;
        FB.doMarry(s);
        FB.news(s, FB.msg('news.life.pledged_wedding',
          '💒 You wed {name}, as your late parent pledged.', { name: b.name }));
      }
    }

    // the wider family weds, bears children, and is mourned
    kinLifeTick(s);
    const kinRel = FB.kinOf(s).byId;

    // player mortality (curve scaled by the balance knob, 0.012 = as-authored)
    const mortScale = (FBDATA.balance.mortalityBase || 0.012) / 0.012;
    const standardMortality = FB.householdStandardEffect ?
      FB.householdStandardEffect(s, 'mortality') : 0;
    const age = FB.ageOf(me, year);
    const station = FB.playerStation(s);
    let q = (age < 30 ? 0.008 : age < 45 ? 0.012 : age < 60 ? 0.03 : age < 70 ? 0.07 : age < 80 ? 0.14 : 0.28) * mortScale;
    // a child ruler or rich merchant's heir is better fed than a serf's child
    if (age < 16) q *= 1 - station * (FBDATA.balance.richChildMortalityBonus || 0);
    if (me.health <= 2) q += 0.12; else if (me.health <= 5) q += 0.03;
    if (p.flags.ill) q += 0.05;
    if (p.flags.plague_here) q += 0.06;
    q -= FB.traitAgg(me).health;
    q -= FB.techBonus(s, 'health') + FB.holdingBonus(s, 'health') + FB.itemBonus(s, 'health'); // physicians, hearth gardens, remedies
    q -= standardMortality;
    q = FB.clamp(q, 0.002, 0.6);
    if (age > 90 || FB.chance(q)) {
      G.die(FB.msg('legend.death.age', {
        forms: {
          select: 'value', param: 'cause', cases: {
            old: '{name} dies in {year} AD, aged {age} — full of years.',
            sickness: '{name} dies in {year} AD, aged {age} — taken by sickness.',
            early: '{name} dies in {year} AD, aged {age} — before their time.',
            other: '{name} dies in {year} AD, aged {age}.'
          }
        }
      }, {
        cause: age > 60 ? 'old' : (p.flags.ill || p.flags.plague_here ? 'sickness' : 'early'),
        name: me.name, year: year, age: age
      }));
      return;
    }
    const healthChance = 0.35 + (age < 16 ? station * (FBDATA.balance.richChildHealthChance || 0) : 0);
    if (FB.chance(FB.clamp(healthChance, 0, 1)) && me.health < 8 && !p.flags.ill) me.health++;
    if (!p.flags.ill && me.health >= 7) FB.cureAilments(me, 'wound', 1); // one old wound knits each year

    // everyone else ages & sometimes dies
    const maintainedHousehold = {};
    if (standardMortality && FB.householdMembers) {
      for (const member of FB.householdMembers(s)) maintainedHousehold[member.id] = 1;
    }
    for (const id in s.chars) {
      const c = s.chars[id];
      if (c.dead || id === p.charId) continue;
      /* The compact realm yearly roll is authoritative for a reigning ruler,
         including a materialized ruler married to the player. */
      if (FB.isReigningRealmRuler && FB.isReigningRealmRuler(s, c)) continue;
      const a = FB.ageOf(c, year);
      let cq = (a < 5 ? 0.03 : a < 16 ? 0.006 : a < 50 ? 0.008 : a < 65 ? 0.03 : a < 80 ? 0.1 : 0.25) * mortScale;
      /* the house's resident descendants share its table: each station above serf means
         better food and water — slightly fewer child deaths and slightly
         hardier children (rulers and rich merchants alike) */
      if (a < 16 && FB.playerDescendantKind(s, c.id) &&
          FB.isHouseholdCharacter(s, c.id)) {
        const station = FB.playerStation(s);
        cq *= 1 - station * (FBDATA.balance.richChildMortalityBonus || 0);
        if (c.health < 8 && FB.chance(station * (FBDATA.balance.richChildHealthChance || 0))) c.health++;
      }
      if (p.flags.plague_here) cq += 0.05;
      cq -= FB.traitAgg(c).health + FB.itemBonus(s, 'health', c.id);
      if (maintainedHousehold[c.id]) cq -= standardMortality;
      if (FB.chance(FB.clamp(cq, 0.002, 0.6))) {
        const wasSpouse = c.id === me.spouseId || c.spouseId === me.id;
        const wasChild = me.childrenIds.indexOf(c.id) >= 0;
        const wasLord = s.roles.lord === c.id;
        const wasCourted = s.player.courtingId === c.id;
        const pledgedChild = c.betrothedId &&
          FB.playerDescendantKind(s, c.betrothedId) ?
          s.chars[c.betrothedId] : null;
        const pledgedKind = pledgedChild ?
          FB.playerDescendantKind(s, pledgedChild.id) : null;
        const refund = pledgedChild && c.dowryAsk ? c.dowryAsk : 0;
        FB.killChar(s, c);
        if (wasSpouse) {
          FB.news(s, FB.msg('news.life.spouse_died',
            '🕯 Your spouse {name} has died. The house is quieter, and colder.', { name: c.name }));
          FB.spouseDied(s, c); // a grand house owes its widow(er) a reckoning
          FB.promoteSpouse(s); // under polygamy, the next wife steps up
        }
        else if (wasChild) FB.news(s, FB.msg('news.life.child_died',
          '🕯 Your child {name} has died, aged {age}.', { name: c.name, age: a }));
        else if (wasCourted) FB.news(s, FB.msg('news.life.courted_died',
          '🕯 {name}, whom you courted, has died before any wedding.', { name: c.name }));
        else if (pledgedChild) {
          const pledgeCase = (pledgedChild.sex === 'f' ? 'daughter' : 'son') +
            (refund ? '_refund' : '');
          if (pledgedKind === 'grandchild') {
            FB.news(s, FB.msg('news.life.grandchild_betrothed_died', {
              forms: {
                select: 'value', param: 'case', cases: {
                  daughter: '🕯 {name}, betrothed to your granddaughter {child}, has died before the wedding.',
                  daughter_refund: '🕯 {name}, betrothed to your granddaughter {child}, has died before the wedding. The dowry returns to your coffers.',
                  son: '🕯 {name}, betrothed to your grandson {child}, has died before the wedding.',
                  son_refund: '🕯 {name}, betrothed to your grandson {child}, has died before the wedding. The dowry returns to your coffers.',
                  other: '🕯 {name}, betrothed to your grandchild {child}, has died before the wedding.'
                }
              }
            }, { case:pledgeCase, name:c.name, child:pledgedChild.name }));
          } else {
            FB.news(s, FB.msg('news.life.betrothed_died', {
              forms: {
                select: 'value', param: 'case', cases: {
                  daughter: '🕯 {name}, betrothed to your daughter {child}, has died before the wedding.',
                  daughter_refund: '🕯 {name}, betrothed to your daughter {child}, has died before the wedding. The dowry returns to your coffers.',
                  son: '🕯 {name}, betrothed to your son {child}, has died before the wedding.',
                  son_refund: '🕯 {name}, betrothed to your son {child}, has died before the wedding. The dowry returns to your coffers.',
                  other: '🕯 {name}, betrothed to your child {child}, has died before the wedding.'
                }
              }
            }, { case:pledgeCase, name:c.name, child:pledgedChild.name }));
          }
        }
        else if (wasLord) FB.news(s, FB.msg('news.life.lord_died',
          '🕯 The lord {name} is dead. Another will take his seat.', { name: c.name }));
        else if (kinRel[c.id]) FB.news(s, FB.msg('news.life.kin_died', {
          forms: {
            select: 'value', param: 'relation', cases: {
              father: '🕯 Your father {name} has died, aged {age}.',
              mother: '🕯 Your mother {name} has died, aged {age}.',
              grandfather: '🕯 Your grandfather {name} has died, aged {age}.',
              grandmother: '🕯 Your grandmother {name} has died, aged {age}.',
              brother: '🕯 Your brother {name} has died, aged {age}.',
              sister: '🕯 Your sister {name} has died, aged {age}.',
              son: '🕯 Your son {name} has died, aged {age}.',
              daughter: '🕯 Your daughter {name} has died, aged {age}.',
              grandson: '🕯 Your grandson {name} has died, aged {age}.',
              granddaughter: '🕯 Your granddaughter {name} has died, aged {age}.',
              nephew: '🕯 Your nephew {name} has died, aged {age}.',
              niece: '🕯 Your niece {name} has died, aged {age}.',
              uncle: '🕯 Your uncle {name} has died, aged {age}.',
              aunt: '🕯 Your aunt {name} has died, aged {age}.',
              cousin: '🕯 Your cousin {name} has died, aged {age}.',
              other: '🕯 Your kinsman {name} has died, aged {age}.'
            }
          }
        }, { relation: kinRel[c.id].toLowerCase(), name: c.name, age: a }));
      }
    }

    if (FB.schoolingYearEvents) FB.schoolingYearEvents(s, schoolingAnnual);

    // popular opinion drifts toward 0
    p.pop = Math.round(p.pop * 0.85);
    p.liegeOp = Math.round((p.liegeOp || 0) * 0.9);
    if (p.liegeOps) for (const rid in p.liegeOps) p.liegeOps[rid] = Math.round(p.liegeOps[rid] * 0.9);
    if (FB.councilYearly) FB.councilYearly(s); // crown authority settles back toward custom
    if (FB.parliamentYearly) FB.parliamentYearly(s); // the liege may summon the estates to sit
  }

  /* ---------- education (yearly) ----------
     A managed descendant aged 6-15 with an education focus gains that skill
     at a rate built by completed school/tutor terms; a named tutor's habits
     can also rub off. Covers the player themselves when still a child. */
  function educationTick(s) {
    for (const c of FB.educationStudents(s)) educateChar(s, c);
  }
  function educateChar(s, c) {
    const me = s.chars[s.player.charId];
    if (!c || c.dead || !c.edu || !c.edu.focus) return;
    const age = FB.ageOf(c, s.date.year);
    if (age < 6 || age >= 16) return;
    const tutor = FB.educationTutor(s, c, true);
    const base = FBDATA.balance.educationBaseChance === undefined ?
      0.18 : FBDATA.balance.educationBaseChance;
    const lessonBoost = c.edu.lessonBoost || 0;
    const p = base + lessonBoost + FB.holdingBonus(s, 'edu') +
      (FB.householdStandardEffect ? FB.householdStandardEffect(s, 'education') : 0);
    c.edu.lessonBoost = 0;
    if (FB.chance(Math.min(FBDATA.balance.educationChanceCap || 0.9, p))) {
      FB.gainSkill(c, c.edu.focus, 1);
    }
    if (FB.chance(0.15)) {
      FB.gainSkill(c, FB.pick(FB.SKILLS), 1);
    }
    if (tutor && tutor !== me && lessonBoost > 0 && FB.chance(0.08)) {
      const cand = tutor.traits.filter(function (t) {
        const td = FBDATA.traits[t];
        return td && td.inherit && c.traits.indexOf(t) < 0;
      });
      if (cand.length) {
        const t = FB.pick(cand);
        if (FB.addTrait(c, t)) {
          FB.news(s, FB.msg('news.life.tutor_trait', {
            forms: {
              select: 'value', param: 'self', cases: {
                yes: '🎓 You grow {trait}, like your tutor.',
                other: '🎓 {name} grows {trait}, like their tutor.'
              }
            }
          }, {
            self: c.id === me.id ? 'yes' : 'other',
            name: c.name,
            trait: FB.dataParam('trait', t, 'name', 'lower')
          }));
        }
      }
    }
  }

  /* ---------- the wider family (yearly) ----------
     Adult blood kin wed and bear children of their own, so grandparents,
     grandchildren, uncles, aunts, and cousins exist beyond the player's own
     nursery. House membership passes through sons (baby.dyn), which is what
     makes kin eligible to inherit. */
  function kinLifeTick(s) {
    const me = s.chars[s.player.charId];
    const year = s.date.year;
    const kin = FB.kinOf(s);
    const all = [];
    for (const g of ['parents', 'grandparents', 'siblings', 'children', 'grandchildren',
      'niecesNephews', 'unclesAunts', 'cousins']) {
      for (const e of kin[g]) all.push(e);
    }
    for (const e of all) {
      const k = e.c;
      if (k.dead || k.id === s.player.charId) continue;
      const age = FB.ageOf(k, year);
      if (age < 16 || age > 55) continue;
      const close = ['Son', 'Daughter', 'Grandson', 'Granddaughter',
        'Brother', 'Sister'].indexOf(e.rel) >= 0;
      let sp = FB.spouseOf(s, k);
      // a sealed betrothal weds as soon as both are of age — before chance
      // gets a say
      if (!sp && k.betrothedId) {
        const b = s.chars[k.betrothedId];
        if (b && !b.dead && FB.ageOf(b, year) >= 16) {
          FB.doKinWedding(s, k, b);
          sp = b;
        } else if (!b || b.dead) {
          // the player's own death bypasses killChar, which would have cut
          // this bond — a stale pledge must not bar remarriage forever
          k.betrothedId = null;
        }
      } else if (!sp && age <= 40 && FB.chance(FBDATA.balance.kinMarryChance)) {
        FB.discardMatches(s, k, null); // the sounded-out families are passed over
        sp = FB.makeCharacter(s, {
          sex: k.sex === 'm' ? 'f' : 'm',
          culture: k.culture, religion: k.religion,
          born: year - FB.clamp(age + FB.ri(-6, 4), 16, 45),
          role: 'kinspouse'
        });
        sp.health = 8;
        /* A managed descendant establishing a household through the
           unscripted yearly match leaves work and equipment assignments
           behind, just as a pledged wedding does through FB.doKinWedding. */
        if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(s, k.id);
        if (FB.clearLoadout) FB.clearLoadout(s, k.id);
        k.spouseId = sp.id; sp.spouseId = k.id;
        if (close) {
          if (e.rel === 'Grandson' || e.rel === 'Granddaughter') {
            FB.news(s, FB.msg('news.life.close_grandchild_wedding', {
              forms: {
                select:'value', param:'sex', cases:{
                  f:'💍 Your granddaughter {name} weds {spouse}.',
                  m:'💍 Your grandson {name} weds {spouse}.',
                  other:'💍 Your grandchild {name} weds {spouse}.'
                }
              }
            }, { sex:k.sex, name:k.name, spouse:sp.name }));
          } else {
            FB.news(s, FB.msg('news.life.close_kin_wedding', {
              forms: {
                select: 'value', param: 'relation', cases: {
                  Son: '💍 Your son {name} weds {spouse}.',
                  Daughter: '💍 Your daughter {name} weds {spouse}.',
                  Brother: '💍 Your brother {name} weds {spouse}.',
                  Sister: '💍 Your sister {name} weds {spouse}.',
                  other: '💍 Your kinsman {name} weds {spouse}.'
                }
              }
            }, { relation:e.rel, name:k.name, spouse:sp.name }));
          }
        }
      }
      if (!sp) continue;
      const mother = k.sex === 'f' ? k : sp;
      const father = k.sex === 'f' ? sp : k;
      const mAge = FB.ageOf(mother, year);
      if (mAge < 16 || mAge > 45) continue;
      const fert = FBDATA.balance.kinChildChance * FB.traitAgg(mother).fert *
        FB.traitAgg(father).fert * mother.fertility * (father.fertility || 1) *
        FB.ageFert('f', mAge) * FB.ageFert('m', FB.ageOf(father, year));
      if (FB.chance(fert)) {
        const baby = FB.makeCharacter(s, {
          culture: k.culture, religion: k.religion, born: year,
          traits: FB.inheritTraits(father, mother), traitsN: 0,
          fatherId: father.id, motherId: mother.id,
          dyn: k.sex === 'm' ? (k.dyn || me.dyn) : sp.dyn || null
        });
        baby.health = 7;
        k.childrenIds.push(baby.id); sp.childrenIds.push(baby.id);
        if (FB.registerRoyalBirth) FB.registerRoyalBirth(s, baby, father, mother);
        if (close) {
          FB.news(s, FB.msg('news.life.close_kin_birth', {
            forms: {
              select: 'value', param: 'case', cases: {
                Son_f: '👶 Your son {parent} has a daughter, {baby}.',
                Son_m: '👶 Your son {parent} has a son, {baby}.',
                Daughter_f: '👶 Your daughter {parent} has a daughter, {baby}.',
                Daughter_m: '👶 Your daughter {parent} has a son, {baby}.',
                Brother_f: '👶 Your brother {parent} has a daughter, {baby}.',
                Brother_m: '👶 Your brother {parent} has a son, {baby}.',
                Sister_f: '👶 Your sister {parent} has a daughter, {baby}.',
                Sister_m: '👶 Your sister {parent} has a son, {baby}.',
                other: '👶 Your kinsman {parent} has a child, {baby}.'
              }
            }
          }, { case: e.rel + '_' + baby.sex, parent: k.name, baby: baby.name }));
        }
      }
    }
  }

  /* ---------- pregnancy & birth (daily; conception chance is per-season in
     the balance data, so divide by the 90-day season) ---------- */
  function birthTick(s) {
    const p = s.player;
    const me = s.chars[p.charId];
    const sp = FB.spouseOf(s, me);
    if (s.pregnant) {
      const pregnancy = s.pregnant;
      const mother = s.chars[pregnancy.motherId];
      const father = s.chars[pregnancy.fatherId];
      /* Pregnancy belongs to its recorded parents, not to whichever member
         of the dynasty is currently playable. A dead mother ends it; a dead
         father does not prevent the surviving mother from giving birth. */
      if (!mother || mother.dead) {
        s.pregnant = null;
        return;
      }
      if (s.turn >= pregnancy.due) {
        const lineParent = s.chars[pregnancy.lineParentId] ||
          (mother.id === me.id || (father && father.id === me.id)
            ? me : (father || mother));
        s.pregnant = null;
        const baby = FB.makeCharacter(s, {
          culture: lineParent.culture, religion: lineParent.religion,
          born: s.date.year,
          traits: FB.inheritTraits(father, mother), traitsN: 0,
          fatherId: father ? father.id : null, motherId: mother.id,
          dyn: lineParent.dyn
        });
        baby.health = 7;
        const parents = [father, mother];
        for (const parent of parents) {
          if (parent && parent.childrenIds.indexOf(baby.id) < 0) {
            parent.childrenIds.push(baby.id);
          }
        }
        if (FB.registerRoyalBirth) FB.registerRoyalBirth(s, baby, father, mother);
        FB.queueEvent(s, 'child_born_flavor', { childId:baby.id });
      }
      return;
    }
    if (p.flags.noChildren) return; // the house is full enough — no new conceptions
    // every wife of the household may conceive (one pregnancy at a time) —
    // the all-characters spousesOf scan runs only under polygynous doctrine
    const mates = me.sex === 'f' || FB.marriageDoctrine(me.religion).wives <= 1
      ? (sp ? [sp] : []) : FB.spousesOf(s, me);
    for (const mate of mates) {
      if (FB.isReigningRealmRuler && FB.isReigningRealmRuler(s, mate)) {
        const rulerResidence = FB.characterResidence(s, mate);
        const playerLocation = FB.travelLocation
          ? FB.travelLocation(s) : FB.world.byId[p.provinceId];
        if (!playerLocation || playerLocation.id !== rulerResidence) continue;
      }
      const mother = me.sex === 'f' ? me : mate;
      const father = me.sex === 'f' ? mate : me;
      const mAge = FB.ageOf(mother, s.date.year);
      if (mAge < 16 || mAge > 45) continue;
      let fert = FBDATA.balance.childChance / 90 * FB.traitAgg(mother).fert * FB.traitAgg(father).fert *
        mother.fertility * (father.fertility || 1) *
        FB.ageFert('f', mAge) * FB.ageFert('m', FB.ageOf(father, s.date.year));
      if (s.player.flags.blessed_union) fert *= 1.6;
      if (FB.chance(fert)) {
        delete s.player.flags.blessed_union; // the prayer is answered
        s.pregnant = {
          due: s.turn + 270,
          motherId: mother.id,
          fatherId: father.id,
          lineParentId: me.id
        };
        if (mother.id === me.id) FB.news(s, FB.msg('news.life.player_pregnant',
          '🤰 You are with child.', {}));
        else FB.news(s, FB.msg('news.life.spouse_pregnant',
          '🤰 {name} is with child.', { name: mother.name }));
        return;
      }
    }
  }

  /* ---------- death & succession ---------- */
  /* Eligible heirs in order: named heir first, then sons, daughters, siblings. */
  FB.heirsOf = function (s) {
    const me = s.chars[s.player.charId];
    const kids = me.childrenIds.map(function (id) { return s.chars[id]; })
      .filter(function (c) { return c && !c.dead; });
    const sons = kids.filter(function (c) { return c.sex === 'm'; }).sort(function (a, b) { return a.born - b.born; });
    const daughters = kids.filter(function (c) { return c.sex === 'f'; }).sort(function (a, b) { return a.born - b.born; });
    let heirs = sons.concat(daughters);
    if (!heirs.length) {
      // no children of the body — grandchildren first, then the wider house:
      // siblings, their children, uncles/aunts, cousins
      const kin = FB.kinOf(s);
      const groups = [kin.grandchildren, kin.siblings, kin.niecesNephews, kin.unclesAunts, kin.cousins];
      for (const g of groups) {
        const live = [];
        for (const e of g) {
          if (!e.c.dead && e.c.dyn === me.dyn) live.push(e.c);
        }
        heirs = heirs.concat(
          live.filter(function (c) { return c.sex === 'm'; }).sort(function (a, b) { return a.born - b.born; }),
          live.filter(function (c) { return c.sex === 'f'; }).sort(function (a, b) { return a.born - b.born; })
        );
      }
    }
    const nid = s.player.namedHeirId;
    if (nid) {
      for (let i = 0; i < heirs.length; i++) {
        if (heirs[i].id === nid) {
          const named = heirs.splice(i, 1)[0];
          heirs.unshift(named);
          break;
        }
      }
    }
    return heirs;
  };

  G.die = function (cause, provenance) {
    G.setPaused(true); // refresh now, while the topbar still repaints behind the death modal
    const s = FB.state;
    const p = s.player;
    const me = s.chars[p.charId];
    const papalClaimant = FB.isPapalClaimant &&
      FB.isPapalClaimant(s, me);
    if (FB.travelCancel) FB.travelCancel(s, '', true);
    const causeMsg = cause && typeof cause === 'object' && typeof cause.key === 'string'
      ? FB.message(cause.key, cause.params) : null;
    const causeText = causeMsg
      ? FB.renderMessage(causeMsg, { state: s, viewer: p.charId })
      : String(cause === undefined || cause === null ? '' : cause);
    const titleDataAtDeath = FB.titleSnapshot(s);
    me.dead = true;
    me.died = s.date.year; // killChar is bypassed for the player's own death
    if (FB.endRoyalCompact) FB.endRoyalCompact(s);
    if (FB.breakAlliance) FB.breakAlliance(s, 'player');
    if (FB.papacyCharacterDied) FB.papacyCharacterDied(s, me, { preserve:true });
    if (!papalClaimant && FB.royalCharDied) FB.royalCharDied(s, me);
    p.dead = true;
    recordLegend(s, me, causeMsg, causeText, provenance,
      titleDataAtDeath);
    if (causeMsg) {
      FB.news(s, FB.msg('news.life.death', '☠ {cause}',
        { cause: FB.messageParam(causeMsg) }));
    } else {
      /* Compatibility for mods that still pass rendered death prose. */
      FB.news(s, '☠ ' + causeText);
    }
    FB.ui.showDeath(FB.heirsOf(s).slice(0, 4), causeText);
  };

  /* the chronicle keeps one entry per life the player lived; the end screen
     reads this roll. Saves from before the roll existed grow it at the
     first death after they load. */
  function recordLegend(s, me, causeMsg, causeText, provenance, titleData) {
    if (!s.legends) s.legends = [];
    const legend = {
      id: me.id,
      name: FB.fullName(me),
      born: me.born,
      died: s.date.year,
      titleData: titleData || FB.titleSnapshot(s),
      quipMsg: legendQuip(s, me, causeMsg, causeText),
      loadout:FB.snapshotLoadout ? FB.snapshotLoadout(s, me.id) : {}
    };
    if (provenance) legend.deathProvenance = {
      kind:provenance.kind || 'event',
      eventId:provenance.eventId || null,
      provinceId:provenance.provinceId || null,
      enemyId:provenance.enemyId || null
    };
    if (causeMsg) legend.causeMsg = causeMsg;
    else legend.cause = causeText;
    s.legends.push(legend);
  }

  /* a parting sentence for the dead — rolled at death and saved with the
     legend, so the end screen shows the same line every time */
  function legendQuip(s, me, causeMsg, causeText) {
    const TRAIT_QUIPS = {
      brave: FB.msg('legend.trait.brave', 'Never once ran. Running would have helped, but still.', {}),
      craven: FB.msg('legend.trait.craven', 'Attended every battle from the safety of the rear.', {}),
      ambitious: FB.msg('legend.trait.ambitious', 'Wanted more. Got a grave, which is technically more.', {}),
      content: FB.msg('legend.trait.content', 'Wanted nothing, received exactly that, and was pleased.', {}),
      greedy: FB.msg('legend.trait.greedy', 'Left instructions about the money. Nobody can find them.', {}),
      generous: FB.msg('legend.trait.generous', 'Gave away everything except the debts.', {}),
      cruel: FB.msg('legend.trait.cruel', 'Feared in life; the mourning is largely procedural.', {}),
      kind: FB.msg('legend.trait.kind', 'Genuinely mourned, which surprised no one more than them.', {}),
      deceitful: FB.msg('legend.trait.deceitful', 'Died insisting they felt perfectly fine.', {}),
      honest: FB.msg('legend.trait.honest', 'Never told a lie. The family found this exhausting.', {}),
      lustful: FB.msg('legend.trait.lustful', 'Mourned by more households than the family admits.', {}),
      chaste: FB.msg('legend.trait.chaste', 'Pure to the end, and faintly smug about it.', {}),
      gluttonous: FB.msg('legend.trait.gluttonous', 'Out-ate every harvest set before them, and several that were not.', {}),
      temperate: FB.msg('legend.trait.temperate', 'Moderate in all things, including, at the last, breathing.', {}),
      wrathful: FB.msg('legend.trait.wrathful', 'Died angry. The wake was quieter than the life.', {}),
      patient: FB.msg('legend.trait.patient', 'Waited for everything. Waited for this, too.', {}),
      proud: FB.msg('legend.trait.proud', 'Bowed to no one. The grave accepts all bows as given.', {}),
      humble: FB.msg('legend.trait.humble', 'Asked for a plain funeral and was, for once, obeyed.', {}),
      zealous: FB.msg('legend.trait.zealous', 'Corrected priests on doctrine; has presumably gone to check.', {}),
      cynical: FB.msg('legend.trait.cynical', 'Expected nothing of the afterlife and declines to be surprised.', {}),
      genius: FB.msg('legend.trait.genius', 'Knew everything except how to stay.', {}),
      quick: FB.msg('legend.trait.quick', 'Quick of wit, and quicker to mention it.', {}),
      dull: FB.msg('legend.trait.dull', 'Untroubled by thought; slipped away in the absence of one.', {}),
      strong: FB.msg('legend.trait.strong', 'Could lift an ox. The ox sends no condolences.', {}),
      frail: FB.msg('legend.trait.frail', 'Fragile in body, punctual in the end.', {}),
      comely: FB.msg('legend.trait.comely', 'The fairest burial the parish has managed in years.', {}),
      homely: FB.msg('legend.trait.homely', 'A face only a mother could love, and she kept her counsel.', {}),
      sickly: FB.msg('legend.trait.sickly', 'So often ill that the end registered as a scheduling change.', {}),
      robust: FB.msg('legend.trait.robust', 'Never ill a day. The last day declined to comment.', {}),
      drunkard: FB.msg('legend.trait.drunkard', 'The cup won in the end, exactly as the cup predicted.', {}),
      scarred: FB.msg('legend.trait.scarred', 'Wore their scars like debts others owed. All settled now.', {}),
      one_eyed: FB.msg('legend.trait.one_eyed', 'Lost an eye, gained a story, told it ten thousand times.', {}),
      maimed: FB.msg('legend.trait.maimed', 'Broken in body, never once in complaint.', {}),
      literate: FB.msg('legend.trait.literate', 'Read everything in reach, including, twice, a menu.', {}),
      veteran: FB.msg('legend.trait.veteran', 'Survived the shield-wall. The years fought sneakier.', {}),
      pilgrim: FB.msg('legend.trait.pilgrim', 'Walked the holy roads; took the last one without luggage.', {}),
      kinslayer: FB.msg('legend.trait.kinslayer', 'The family attended the grave at a careful distance.', {}),
      excommunicated: FB.msg('legend.trait.excommunicated', 'Buried at a crossroads by popular ecclesiastical demand.', {})
    };
    const SKILL_QUIPS = {
      dip: FB.msg('legend.skill.dip', 'Could talk a beggar into lending money, and did.', {}),
      mar: FB.msg('legend.skill.mar', 'Settled most disputes by winning them.', {}),
      ste: FB.msg('legend.skill.ste', 'Counted everything. The graveyard steward sends regards.', {}),
      int: FB.msg('legend.skill.int', 'Knew everyone’s secrets and took the best ones along.', {}),
      lea: FB.msg('legend.skill.lea', 'Read more books than the parish owned.', {})
    };
    const pool = [];
    const age = FB.ageOf(me, s.date.year);
    const kids = me.childrenIds.length;
    for (const tid of me.traits) if (TRAIT_QUIPS[tid]) pool.push(TRAIT_QUIPS[tid]);
    let causeKind = causeMsg && causeMsg.params ? causeMsg.params.cause : null;
    if (!causeKind && /sickness/i.test(causeText || '')) causeKind = 'sickness';
    else if (!causeKind && /full of years/.test(causeText || '')) causeKind = 'old';
    else if (!causeKind && /before their time/.test(causeText || '')) causeKind = 'early';
    if (causeMsg && (causeMsg.key === 'legend.death.wounds' || causeKind === 'sickness')) {
      pool.push(FB.msg('legend.condition.sickness',
        'Complained about the leech bill until the very end.', {}));
    }
    if (causeKind === 'old') pool.push(FB.msg('legend.condition.old',
      'Died full of years and of opinions about the young.', {}));
    if (causeKind === 'early') pool.push(FB.msg('legend.condition.early',
      'Gone before their time; the time was never consulted.', {}));
    if (age >= 75) pool.push(FB.msg('legend.condition.very_old',
      'Reached {age}, an age the neighbors called showing off.', { age: age }));
    if (age <= 20) pool.push(FB.msg('legend.condition.young',
      'Gone at {age}; the chronicle leaves most of the page blank.', { age: age }));
    if (kids >= 8) pool.push(FB.msg('legend.condition.many_children',
      'Leaves {count} children and not one quiet meal behind.', { count: kids }));
    if (kids === 0) pool.push(FB.msg('legend.condition.no_children',
      'Leaves no children; the gossips needed no invitation.', {}));
    if (s.player.gold >= 1000) pool.push(FB.msg('legend.condition.rich',
      'Died rich. The coffers were pried from still-warm fingers.', {}));
    if (s.player.gold < 10) pool.push(FB.msg('legend.condition.poor',
      'Died owing a goat. The goat has not forgotten.', {}));
    if (s.player.prestige >= 400) pool.push(FB.msg('legend.condition.famous',
      'So famous that strangers are mourning professionally.', {}));
    if (s.player.tier === 0) pool.push(FB.msg('legend.condition.serf',
      'Born a serf, died a serf, and outstubborned everyone in between.', {}));
    if (s.player.tier >= 6) pool.push(FB.msg('legend.condition.emperor',
      'Ruled an empire; the empire has been formally notified.', {}));
    let best = null, bestV = 0;
    for (const k of FB.SKILLS) {
      const v = FB.skillOf(me, k);
      if (v > bestV) { bestV = v; best = k; }
    }
    if (bestV >= 16) pool.push(SKILL_QUIPS[best]);
    if (!pool.length) pool.push(FB.msg('legend.condition.default',
      'Lived. Died. The chronicle splits the difference.', {}));
    return FB.pick(pool);
  }

  G.succeedTo = function (heirId, opts) {
    opts = opts || {};
    const livingAbdication = !!opts.livingAbdication;
    const s = FB.state;
    const p = s.player;
    const old = s.chars[p.charId];
    const heir = s.chars[heirId];
    if (!heir || heir.dead) {
      if (!livingAbdication) FB.ui.gameOver();
      return false;
    }
    /* A bishop's see is returned before the dynasty changes hands. Secular
       counties remain in the ordinary succession; a see-only household falls
       back to its established gentry standing. */
    if (FB.releaseBishopric) {
      FB.releaseBishopric(s, old, { succession:true });
    }
    if (FB.travelCancel) FB.travelCancel(s, '', true);
    if (livingAbdication) {
      if (FB.endRoyalCompact) FB.endRoyalCompact(s);
      if (FB.breakAlliance) FB.breakAlliance(s, 'player');
    }

    s.generation++;
    heir.dyn = old.dyn;
    heir.role = null;
    if (heir.health === undefined) heir.health = 8;
    // a tutor of 'self' was the predecessor; the new life names its own teachers
    if (heir.edu && heir.edu.tutorId === 'self') heir.edu.tutorId = null;
    // coming-of-age events queued for a player who died a teen must not fire for the heir
    s.eventQueue = s.eventQueue.filter(function (ev) {
      return ev.id !== 'player_comes_of_age' && ev.id !== 'player_educated' &&
        ev.id !== 'station_farewell';
    });
    /* Old saves did not record which parent supplied the playable line's
       culture, faith, and dynasty. Capture that identity before succession
       changes the player pointer so a posthumous child retains it. */
    if (s.pregnant && !s.pregnant.lineParentId &&
        (s.pregnant.motherId === old.id || s.pregnant.fatherId === old.id)) {
      s.pregnant.lineParentId = old.id;
    }
    FB.careerOf(s, heir); // initialize from the heir's own life before changing the player pointer
    FB.removeTrait(heir, 'excommunicated'); // the sentence was personal to the dead ruler
    p.charId = heir.id;
    p.traitProgress = {};
    if (FB.cleanupManagedMatches) FB.cleanupManagedMatches(s);
    if (FB.greatHolyWarSuccession) FB.greatHolyWarSuccession(s);
    p.dead = false;
    if (!livingAbdication) p.gold = Math.round(p.gold * 0.9); // death dues
    FB.financeSuccession(s); // household contracts survive; mature ones settle at transition
    p.courtingId = null;
    p.suitorIds = null; // the predecessor's prospects do not follow the heir
    p.socialAttention = {};
    p.socialGiftTurns = {};
    p.realmGiftTurns = {};
    p.plot = null; // plots die with their plotter
    p.royalCompact = null; // the predecessor's marriage compact ends
    p.rivalContacts = {};
    p.rivalPeace = {};
    p.stationFarewell = null;
    if (FB.clearItemOffer) FB.clearItemOffer(s); // the peddler moves on
    else p.itemOffer = null;
    /* The predecessor's equipment stays in place through the transition.
       Succession returns every assignment outside the new household to the
       armory, while an heir who owned gifts outside it brings those exact
       objects home. */
    if (FB.reclaimCharacterItems) FB.reclaimCharacterItems(s, heir.id);
    if (FB.reconcileHouseholdLoadouts) FB.reconcileHouseholdLoadouts(s);
    else if (FB.clearLoadout) FB.clearLoadout(s, old.id);
    if (FB.autoEquipBest) FB.autoEquipBest(s, heir.id);
    if (FB.retainerSuccession) FB.retainerSuccession(s);
    if (FB.enterpriseList) FB.enterpriseList(s);

    // only property passes; personal standing must be rebuilt somewhat
    FB.landPlots(s); // normalize a legacy farm before its old flag is discarded
    if (FB.clearFriendship) FB.clearFriendship(s, true);
    const keep = {};
    for (const fl of ['own_ox']) if (p.flags[fl]) keep[fl] = 1; // household property passes separately
    p.flags = keep;
    /* A chosen heir may already hold a separately appointed see. Activate
       that personal office after clearing the predecessor's life flags. */
    if (FB.activateBishopricForPlayer) {
      FB.activateBishopricForPlayer(s, heir);
    }
    p.fired = {}; p.cooldowns = {};
    p.prestige = Math.round(p.prestige * 0.6);
    p.piety = Math.round(p.piety * 0.5);
    p.liegeOp = 0; p.liegeOps = {}; p.foreignPolicy = {};
    p.vassalLevyFavors = {};
    p.warService = 0; p.liegeGrants = 0;
    p.travelHistory = [];
    p.travelSettlement = null;
    p.pop = Math.round(p.pop * 0.5);
    // transition costs and standing cuts must not read as a season's losses
    s.seasonMark = { gold: p.gold, prestige: p.prestige, piety: p.piety };
    s.seasonNet = null;
    FB.syncPlayerCareer(s);
    delete s.roles.spouse; delete s.roles.suitor; delete s.roles.friend;
    const inheritedRival = FB.getRole(s, 'rival', false);
    const inheritedIsKin = inheritedRival && !!FB.kinOf(s).byId[inheritedRival.id];
    const inheritedIsSpouse = inheritedRival && FB.spousesOf(s, heir).some(function (sp) {
      return sp.id === inheritedRival.id;
    });
    if (inheritedRival && !inheritedIsKin && !inheritedIsSpouse) {
      p.rivalry = {
        heat: FBDATA.balance.rivalHeatLegacyStart !== undefined
          ? FBDATA.balance.rivalHeatLegacyStart : 25,
        startedTurn: s.turn,
        lastMoveTurn: s.turn,
        initiator: 'legacy',
        cause: 'inherited'
      };
      FB.queueEvent(s, 'rival_legacy', {});
    } else {
      if (inheritedRival) FB.endRivalry(s, inheritedRival.id, true);
      else p.rivalry = null;
    }
    p.namedHeirId = null; // the new life names its own successor
    p.focus = FB.defaultFocus(s);

    // heirs of ruling houses keep the liege bond
    if (p.tier >= 3 && !p.liege && !FB.isPlayerSovereign(s)) {
      const rid = (s.holder && s.holder[p.provinceId]) || s.owner[p.provinceId];
      if (rid && rid !== 'player') p.liege = rid;
    }
    if (heir.royalLine) {
      const rr = s.realms[heir.royalLine.realmId];
      const rs = rr && FB.ensureRealmSuccession(s, heir.royalLine.realmId);
      if (rr && rr.alive && rs && rs.rulerMemberId === heir.royalLine.memberId) {
        FB.absorbRealm(s, heir.royalLine.realmId, heir);
      }
    }
    if (s.realms.player && s.realms.player.alive) {
      const oldGeneration = s.realms.player.ruler &&
        s.realms.player.ruler.generation !== undefined
        ? s.realms.player.ruler.generation : 1;
      s.realms.player.ruler = {
        name: heir.name, sex: heir.sex, culture: heir.culture,
        age: FB.ageOf(heir, s.date.year), mar: FB.skillOf(heir, 'mar'),
        generation: oldGeneration + 1
      };
      s.realms.player.succession = s.realms.player.succession || { playerDynasty: true };
      s.realms.player.succession.rulerGeneration = oldGeneration + 1;
      s.realms.player.succession.heirCharId = null;
      s.realms.player.liege = p.liege || null;
      s.realms.player.religion = heir.religion;
    }
    if (FB.papacyPlayerSuccession) FB.papacyPlayerSuccession(s, old.id);
    if (FB.enterpriseList) FB.enterpriseList(s);
    if (FB.repairAlliances) FB.repairAlliances(s);

    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(s);
    if (livingAbdication) {
      const destination = opts.destinationId && FB.world.byId[opts.destinationId];
      FB.news(s, FB.msg('news.life.living_abdication',
        '👤 {heir} takes up the family’s story while {former} retires to {destination}. Generation {generation}.',
        {
          heir:FB.fullName(heir),
          former:opts.formerName || FB.fullName(old),
          destination:destination ? destination.name : '',
          generation:s.generation
        }));
    } else {
      FB.news(s, FB.msg('news.life.succession',
        '👤 {name} takes up the family’s story. Generation {generation}.',
        { name: FB.fullName(heir), generation: s.generation }));
    }
    G.paused = true; // a new life begins at rest
    FB.ui.refresh();
    FB.save.autosave();
    return true;
  };

  /* ================= save/load/title ================= */
  G.loadSlot = function (slot) {
    const data = FB.save.read(slot);
    if (!data) { FB.ui.toast('No save found.'); return; }
    G.loadData(data);
  };

  /* shared wake-up for a save read from a slot or pasted as export text;
     false when the life belongs to another mod world */
  G.loadData = function (data, afterLoad) {
    // a life cannot wake up in the wrong world: the map ids would not fit
    if (FB.save.otherWorld(data)) {
      FB.ui.toast(data.mods ?
        '🧩 That life was lived in a modded world. Enable the same mod(s) (Mods menu) to continue it.' :
        '🧩 That life was lived in the unmodded world. Remove all mods (Mods menu) to continue it.');
      return false;
    }
    const bookmarkId = FB.save.bookmarkOf(data);
    if (!FB.bookmark(bookmarkId)) {
      FB.ui.toast('That life uses a starting date this game does not know.');
      return false;
    }
    FB.ui.showScreen('loading');
    $('loadbar').style.width = '0%';
    FB.activateBookmark(bookmarkId, function (frac, msg) {
      $('loadbar').style.width = Math.round(frac * 100) + '%';
      $('loadmsg').textContent = FB.T(msg);
    }, function (error) {
      if (error) {
        FB.ui.showScreen('title');
        FB.ui.toast('That life’s world could not be activated.');
        return;
      }
      FB.save.restore(data);
      FB.syncPlayerCareer(FB.state);
      if (FB.enterpriseList) FB.enterpriseList(FB.state);
      if (FB.travelEnsure) FB.travelEnsure(FB.state);
      if (FB.travelValidate) FB.travelValidate(FB.state);
      if (FB.validateFocus) FB.validateFocus(FB.state);
      G.observe = false;
      document.body.classList.remove('observing');
      G.pickMode = false;
      G.paused = true;
      FB.ui.mapDirty();
      FB.map.playerProv = FB.state.player.provinceId;
      FB.ui.showGame();
      const wakeLocation = FB.travelLocation ? FB.travelLocation(FB.state) : null;
      FB.map.centerOn(wakeLocation ? wakeLocation.id : FB.state.player.provinceId, 2.0);
      FB.map.select(null);
      FB.ui.refresh();
      FB.ui.toast('The chronicle resumes — {season} {year} AD.', {
        season: FB.seasonName(FB.state.date.season),
        year: FB.state.date.year
      });
      FB.save.warnIfBlocked();
      if (FB.ui.showPendingMarriageResidence) {
        FB.ui.showPendingMarriageResidence();
      }
      if (afterLoad) afterLoad();
    });
    return true;
  };

  G.toTitle = function () {
    // an observe session is never saved — it must not bury a real life
    if (FB.state && !FB.state.player.dead && !G.observe) FB.save.autosave();
    FB.state = null;
    G.observe = false;
    document.body.classList.remove('observing');
    G.pickMode = false;
    G.paused = true;
    refreshTitle();
    FB.ui.showScreen('title');
  };
})();
