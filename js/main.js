/* Fallowborn — boot, scenarios, turn loop, life & death */
window.FB = window.FB || {};

(function () {
  'use strict';

  const G = {};
  FB.game = G;
  FB.state = null;
  G.bootReady = false;

  /* version & changelog — numbering and entry rules: docs/VERSIONS.md */
  FB.VERSION = '1.160.2';
  FB.CHANGELOG = [
    { v: '1.160.2', date: '2026-08-26', changes: [
      'Serf life now has clearer duty encounters, more fitting work and equipment details, and easier access to lieges and family status history.',
      'Game speed now starts fastest and persists locally, while compact tooltips keep event choices and participants in view.'
    ] },
    { v: '1.160.1', date: '2026-08-26', changes: [
      'The serf opening now links its tenure guidance, scheduled duties, freedom terms, and family history through one accessible household story.'
    ] },
    { v: '1.160.0', date: '2026-08-25', changes: [
      'Serf households now review customary duties and rights when their local or political authority changes.'
    ] },
    { v: '1.159.0', date: '2026-08-25', changes: [
      'Serf households now reflect pastoral steppe, woodland, and Norse coastal customary tenure through regional work, duties, rights, and event language.'
    ] },
    { v: '1.158.0', date: '2026-08-25', changes: [
      'Freedom purchases now account for the living family being released, and saved offers preserve that household price.',
      'Deeds hotkeys keep their selected section unless repeat-to-toggle is enabled in Settings, and fast-forward now safely starts a fresh paused game.'
    ] },
    { v: '1.157.0', date: '2026-08-25', changes: [
      'Serf manor and village events now reuse named local people across recurring stories, and trusted stewards or priests can support a household’s freedom petition.'
    ] },
    { v: '1.156.0', date: '2026-08-25', changes: [
      'Serf households can now pursue freedom through purchase, negotiated manumission, the Old Custom, or flight, with completed routes preserved in family history.'
    ] },
    { v: '1.155.2', date: '2026-08-25', changes: [
      'Losses and incurred commitments can now push household gold below zero; future income clears the shortfall while cash-priced deeds and purchases remain affordability-gated.'
    ] },
    { v: '1.155.1', date: '2026-08-25', changes: [
      'Child heirs keep their Deeds catalogue visible and can reduce inherited household standards, while adult purchases remain unavailable until age 16.'
    ] },
    { v: '1.155.0', date: '2026-08-25', changes: [
      'Serf households now live under persistent customary tenure, with culture- and faith-aware service cycles, recognized customary rights, and obligation details in Station & home.'
    ] },
    { v: '1.154.1', date: '2026-08-24', changes: [
      'The Self panel now keeps Age, Health, and Common Voice current while time is flowing or fast-forwarding.',
      'Fast-forward yields more often and reuses unchanged army supply routes to keep the interface responsive.',
      'Wedding and marriage-ending outcomes retain the named partner after relationship state changes.',
      'Household standards now use inline −/+ controls, with desktop tooltips and compact ? disclosures replacing separate sheets.',
      'Equipment slots use even rows and desktop or compact details; Equip Best now applies immediately from the same centered sheet.',
      'Freehold-land choices now keep cost and seasonal yield on the row and move their complete terms into tooltips.',
      'Great holy-war progress now appears in Deeds only when your character has joined that campaign.',
      'Gentry households can continue buying available freehold plots after declaring their first manor.'
    ] },
    { v: '1.154.0', date: '2026-08-24', changes: [
      'Chronicle war, battle, and raid notices now open compact saved result reports; wartime map orders show enemy movement and resolve battles only when hostile hosts share a county.',
      'Dense Governance, Council, Papacy, conquest, and privilege sheets now use consistent controls, navigation, and tooltips.'
    ] },
    { v: '1.153.4', date: '2026-08-23', changes: [
      'Raiding expeditions now offer target sorting, last-target reuse, repeat-raiding and summary preferences, with compact header guidance.',
      'Deed cooldowns stay current during flowing time and fast-forward, and modal exits now use consistent Close, Back, and Cancel labels.'
    ] },
    { v: '1.153.3', date: '2026-08-23', changes: [
      'Manual field command now lets you select, halt, and march the entrusted host without its orders reverting to AI control.'
    ] },
    { v: '1.153.2', date: '2026-08-23', changes: [
      'Network and dense dialog details now use hover or tap tooltips, leaving their primary choices easier to scan.',
      'Fast-forwarding stays more responsive by retaining unchanged event, political, army, and interface state between days.'
    ] },
    { v: '1.153.1', date: '2026-08-23', changes: [
      'Preview French, German, Italian, and Spanish translations have been refreshed for recent game and modding updates.'
    ] },
    { v: '1.153.0', date: '2026-08-23', changes: [
      'Runtime mods can now offer safe choice-backed deeds and opt-in deterministic fallback focuses.'
    ] },
    { v: '1.152.0', date: '2026-08-22', changes: [
      'Runtime mods can now add safe daily focuses with exact effect previews, explicit contexts, and deterministic skill training.'
    ] },
    { v: '1.151.0', date: '2026-08-22', changes: [
      'Runtime mods can now add safe manual deeds with exact resource previews, fixed cooldowns, static eligibility, or a queued story.'
    ] },
    { v: '1.150.0', date: '2026-08-22', changes: [
      'Runtime mods can now customize existing focuses and deeds while their protected behavior and save identities remain intact.'
    ] },
    { v: '1.149.1', date: '2026-08-22', changes: [
      'Focuses and deeds now use validated data catalogues while keeping their existing behavior and save identities.'
    ] },
    { v: '1.149.0', date: '2026-08-22', changes: [
      'Royal Council offices are now data-driven, letting mods add validated seats, bonuses, activation ranks, and schemer traits while existing special offices keep their identities.'
    ] },
    { v: '1.148.0', date: '2026-08-22', changes: [
      'Religious progression paths and rank names are now data-driven, letting mods add validated faith and vocation ladders without changing existing saves.'
    ] },
    { v: '1.147.1', date: '2026-08-22', changes: [
      'Plot-only runtime mods now validate their intrigue method references correctly.'
    ] },
    { v: '1.147.0', date: '2026-08-22', changes: [
      'Starting scenarios and family presets are now data-driven, letting mods add validated beginnings, resources, equipment, careers, and household shapes.'
    ] },
    { v: '1.146.1', date: '2026-08-22', changes: [
      'Preview translations now stay active while new or changed records temporarily fall back to English.'
    ] },
    { v: '1.146.0', date: '2026-08-22', changes: [
      'Runtime mods can now configure intrigue, raiding traditions, authored-work pools, and generated ruler traits, with invalid definitions rejected before play.'
    ] },
    { v: '1.145.2', date: '2026-08-22', changes: [
      'Save Game now downloads a text file, and Load Game accepts that file while keeping pasted saves compatible.'
    ] },
    { v: '1.145.1', date: '2026-08-22', changes: [
      'The title appears sooner, campaign creation gives immediate feedback, and map travel interactions stay responsive.'
    ] },
    { v: '1.145.0', date: '2026-08-22', changes: [
      'Cultures are now fully data-driven, with new regional identities and historically grounded paired communities across the 867 and 1066 worlds.'
    ] },
    { v: '1.144.7', date: '2026-08-21', changes: [
      'The family tree now marks the house founder, opens on the current character, and keeps its guidance in an info tooltip. Portrait play has a draggable balanced map and panel split whose controls and notices realign with the map.'
    ] },
    { v: '1.144.6', date: '2026-08-21', changes: [
      'New games now open directly on starting date selection, with shared seeds behind a separate option. Starting roles and birthplace selection are clearer and more compact.'
    ] },
    { v: '1.144.5', date: '2026-08-21', changes: [
      'Panel tabs, especially Deeds, now switch faster by retaining unchanged content and avoiding work for unopened deed groups.'
    ] },
    { v: '1.144.4', date: '2026-08-21', changes: [
      'The family tree now connects the house founder through recorded ancestry, labels distant kin, and opens on the current character on mobile. Desktop trees fill the available screen, pan by dragging, preview characters on hover, and return from character sheets with Back.'
    ] },
    { v: '1.144.3', date: '2026-08-21', changes: [
      'Panels and Network now provide clearer keyboard navigation, responsive action details, ruler previews, and more legible map labels across desktop and mobile. Ruler sheets show each side’s war goals, and starting a war makes the opposing ruler Hostile.'
    ] },
    { v: '1.144.2', date: '2026-08-21', changes: [
      'Family & legacy guidance now shows how many days of personal attention a courtship needs before a marriage proposal.'
    ] },
    { v: '1.144.1', date: '2026-08-21', changes: [
      'New-player guidance now leads through the first story result, poaching, and the Family & legacy checklist. Army feedback and markers, match pickers, shortcuts, and long-life saves now remain reliable across supported layouts and reloads.'
    ] },
    { v: '1.144.0', date: '2026-08-20', changes: [
      'New games now begin with only the Serf start; reaching Freeholder, Gentry, and Baron across your lives permanently unlocks their starting scenarios in this browser.'
    ] },
    { v: '1.143.2', date: '2026-08-20', changes: [
      'Seek a match now draws prospects from the cultures and faiths of the local county, with mixed matches requiring more Standing.'
    ] },
    { v: '1.143.1', date: '2026-08-19', changes: [
      'Apostasy previews in the faith conversion picker now read the Church’s saved state directly instead of re-checking the whole world for every candidate faith.'
    ] },
    { v: '1.143.0', date: '2026-08-19', changes: [
      'War councils now issue real map orders — hunt the enemy host, refit, or seek terms — while a host standing on the war target presses the siege on its own each season. Campaign condition, field leadership, rest, and blessings now shape every real battle.',
      'Press R to cycle new map filters: Realm, Mine, Liege, the de jure duchies and kingdoms, and a War view that outlines your enemy in red.',
      'Long deed and focus lists now offer Shift+letter shortcuts beyond the first nine items, and pressing a modal’s hotkey again closes it.',
      'The map and the Deeds and Land tabs stay smoother while time flows and while panning across the wider world.'
    ] },
    { v: '1.142.1', date: '2026-08-19', changes: [
      'Completing a mercenary contract now smoothly transitions to the journey home, and wartime battle records track win/loss tallies consistently.'
    ] },
    { v: '1.142.0', date: '2026-08-19', changes: [
      'Field armies are now made up of distinct unit classes — beyond the baseline levy, archers, cavalry, men-at-arms, and mercenaries, crossbow and pike companies unlock through innovations while horse-archer, huscarl, camel-rider, and cataphract companies muster from the cultures that field them, each with its own counters and terrain strengths.',
      'Realms can now field several hosts at once: split a halted army or merge co-located ones from the Land tab, march and fight with supply that refills on friendly land and starves abroad, and read the ground — terrain now shapes marches and battles.',
      'Kings and emperors can proclaim royal policies on religious tolerance and frontier settlement from the council.',
      'New life paths let you command soldiers, practice as a physician, pursue scholarship, compose works for patrons, serve mercenary contracts, and join foreign expeditions — each leaving durable accomplishments.',
      'Freeholders and gentry can now withdraw into the wastes to found a frontier county of their own.'
    ] },
    { v: '1.141.1', date: '2026-08-18', changes: [
      'The Deeds tab now supports two-stage keyboard navigation across category groups, and culture and faith conversion options are now soft-gated to traditions you have encountered with clearer highlighted costs.'
    ] },
    { v: '1.141.0', date: '2026-08-18', changes: [
      'The Deeds tab now offers deliberate conversion: adopt a new culture or convert to a new faith for yourself, your household, or your whole realm — paid in prestige or piety, with real penalties from those you leave behind.'
    ] },
    { v: '1.140.3', date: '2026-08-18', changes: [
      'Building ledger digit hotkeys work again even when the county protection checkbox has focus, and loading a life no longer leaves reattached vassals missing from your vassal lists.'
    ] },
    { v: '1.140.2', date: '2026-08-18', changes: [
      'Settlement sheets now feature top-aligned building actions, interactive fortification tooltips with inline requirements, and contextual Back navigation.'
    ] },
    { v: '1.140.1', date: '2026-08-17', changes: [
      'The market gear stall now shows buying and selling side by side on wide screens, with a Buy/Sell toggle above the list on phones and tablets.'
    ] },
    { v: '1.140.0', date: '2026-08-17', changes: [
      'Town and city visits now offer a market gear stall where you can buy and sell equipment from a seasonal stock that improves with urban market innovations.',
      'Eleven legendary artifacts — from Excalibur to the Holy Lance — can now be sought through rumor events by the faithful and cultures that claim them, though each prize carries a dangerous edge and can be lost forever.'
    ] },
    { v: '1.139.3', date: '2026-08-17', changes: [
      'Fast-forward now reuses each season’s settled finance and papal records instead of rescanning loans, investments, and church courts on every skipped day.'
    ] },
    { v: '1.139.2', date: '2026-08-17', changes: [
      'The raiding expedition modal now features standardized toolbar styles with custom strategy dropdowns, search inputs, and instant clear controls.',
      'Fast-forward now stays responsive and avoids rebuilding unchanged world, market, institution, and save data on every skipped day.'
    ] },
    { v: '1.139.1', date: '2026-08-17', changes: [
      'Raid target evaluation and spoils calculation now handle market endowments correctly, and naval navigation and cavalry raid reach are tuned to period innovations.'
    ] },
    { v: '1.139.0', date: '2026-08-17', changes: [
      'Eligible cultures and pagan faiths can now launch peacetime raiding expeditions from the Deeds tab to plunder target provinces and seize captives.'
    ] },
    { v: '1.138.4', date: '2026-08-17', changes: [
      'AI rulers now respect social station when offering marriages, preventing royal proposals to distant commoner households.'
    ] },
    { v: '1.138.3', date: '2026-08-17', changes: [
      'The Land tab now summarizes starting development directly in settlement growth and simplifies county population details.'
    ] },
    { v: '1.138.2', date: '2026-08-17', changes: [
      'Music boot now avoids unsupported persistent-cache access on local hosted copies.'
    ] },
    { v: '1.138.1', date: '2026-08-17', changes: [
      'Character creation now keeps family choices concise, hides redundant community choices, and leaves the final card focused on the shareable world seed.',
      'Title music controls now yield the corner to Back on phone-sized birthplace and character screens.'
    ] },
    { v: '1.138.0', date: '2026-08-17', changes: [
      'Beginner lessons now appear as coachmarks that point at the control they teach and wait for you, with Back and Next paging through the tour.'
    ] },
    { v: '1.137.0', date: '2026-08-17', changes: [
      'First-time tips introduce the interface and key milestones to brand-new players, with controls under Settings.',
      'AI rulers no longer build over player-held holdings.'
    ] },
    { v: '1.136.2', date: '2026-08-16', changes: [
      'Save compaction keeps long campaigns within browser storage limits.'
    ] },
    { v: '1.136.1', date: '2026-08-16', changes: [
      'Sovereign realm checks now tolerate partially initialized player state, preventing setup-time errors.'
    ] },
    { v: '1.136.0', date: '2026-08-16', changes: [
      'Added 8 late-medieval settlement buildings and 6 historical technologies, expanding high-development cities with universities, cathedrals, guildhalls, arsenals, and foundries.'
    ] },
    { v: '1.135.1', date: '2026-08-16', changes: [
      'Accompanied trade ventures can now purchase return cargo at destination markets to bring home and sell at live local prices.'
    ] },
    { v: '1.135.0', date: '2026-08-16', changes: [
      'Counties now simulate population growth, carrying capacity, and land migration, scaling tax yields, levies, and market demand.',
      'Land rents and feudal tier progression scale with active settlements, while peaceful AI rulers construct buildings based on technology.'
    ] },
    { v: '1.134.1', date: '2026-08-16', changes: [
      'Directly held counties now gain economic development from productive buildings and lose it to demolition or completed sieges, while AI-governed counties retain yearly drift.',
      'Older saves restore directly held development once from bookmark values and standing buildings.'
    ] },
    { v: '1.134.0', date: '2026-08-16', changes: [
      'Added a map search overlay to quickly find and jump to any settlement, county, duchy, or kingdom.',
      'Map controls now fit compact viewports, and ruler gift sheets return directly to their source.'
    ] },
    { v: '1.133.16', date: '2026-08-16', changes: [
      'The mobile music overlay has been refined to fit comfortably in shallow map views without overlapping active notifications.'
    ] },
    { v: '1.133.15', date: '2026-08-16', changes: [
      'De jure title promotion progress notes in the Land panel now only appear for titles where you hold an active stake.'
    ] },
    { v: '1.133.14', date: '2026-08-16', changes: [
      'Added Basque culture and expanded Mozarab, Berber, and Basque starting communities across Spain in both bookmarks.'
    ] },
    { v: '1.133.13', date: '2026-08-15', changes: [
      'Guard tab rendering when no active life is loaded.'
    ] },
    { v: '1.133.12', date: '2026-08-15', changes: [
      'A settlement holding your buildings, enterprises, or home no longer vanishes from the map when county development declines.',
      'A development decline in your own counties is now reported in the Chronicle.'
    ] },
    { v: '1.133.11', date: '2026-08-15', changes: [
      'Rank details for serfs and commoners now present their home settlement, local ruler, and station context.'
    ] },
    { v: '1.133.10', date: '2026-08-15', changes: [
      'Event toasts on mobile now expand to use available screen width alongside map controls.'
    ] },
    { v: '1.133.9', date: '2026-08-15', changes: [
      'The Work & Enterprises modal has been decluttered by removing redundant explanatory text blocks.'
    ] },
    { v: '1.133.8', date: '2026-08-15', changes: [
      'The map HUD music overlay is now compact and scroll-free on mobile devices.'
    ] },
    { v: '1.133.7', date: '2026-08-15', changes: [
      'The map HUD now features a dedicated music overlay with quick access to soundtrack controls.',
      'The Work & Enterprises view is streamlined with a collapsible filters and sorting section.'
    ] },
    { v: '1.133.6', date: '2026-08-15', changes: [
      'Ruler sheets now combine realm and personal dealings, with linked war notices and each realm’s muster.',
      'Settlement sites stay clear of coasts, and legacy mods retain their named settlement slots.'
    ] },
    { v: '1.133.5', date: '2026-08-15', changes: [
      'Religious offices now respect their historical holder requirements, while secular succession remains distinct.'
    ] },
    { v: '1.133.4', date: '2026-08-15', changes: [
      'Realm ruler sheets now use linked family portraits, courtesy titles, and map-centering character portraits.',
      'Unavailable actions now show their blocking reason without repeated helper text.'
    ] },
    { v: '1.133.3', date: '2026-08-15', changes: [
      'Interface text is larger and clearer, with shorter status messages and Guide links in key management sheets.'
    ] },
    { v: '1.133.2', date: '2026-08-15', changes: [
      'Modal controls and Work selectors now use a more compact, consistent presentation.'
    ] },
    { v: '1.133.1', date: '2026-08-15', changes: [
      'Enterprise catalogues now show exact availability requirements, while idle family businesses explain their staffing problems.'
    ] },
    { v: '1.133.0', date: '2026-08-15', changes: [
      'Settings → Accessibility now offers separate colors for main and helper text, with brighter defaults throughout the interface.',
      'Market controls, side panels, and the mobile map HUD now stay clear and readable across compact layouts.'
    ] },
    { v: '1.132.0', date: '2026-08-14', changes: [
      'Counties can now contain multiple cultural and religious communities, with a local identity chosen for the starting family during character creation.'
    ] },
    { v: '1.131.0', date: '2026-08-14', changes: [
      'County commodity markets now connect local scarcity, historical endowments, trade ventures, and guild charters through the Market lens.'
    ] },
    { v: '1.130.2', date: '2026-08-14', changes: [
      'The barber sheet now keeps its controls usable on short phone screens.'
    ] },
    { v: '1.130.1', date: '2026-08-14', changes: [
      'Royal marriage offers now respect the householdâ€™s station and prestige, preventing implausible matches far above its standing.'
    ] },
    { v: '1.130.0', date: '2026-08-14', changes: [
      'Fortifications now act as strategic strongpoints: build and upgrade them at settlements to block hostile passage and force invading hosts into sieges.'
    ] },
    { v: '1.129.0', date: '2026-08-14', changes: [
      'Craft and Trade guildmasters can now choose permanent specialty paths, with advanced paths shaped by national technology.',
      'Households can now attend bounded market auctions for items, enterprises, and documented county title rights.'
    ] },
    { v: '1.128.0', date: '2026-08-14', changes: [
      'Technology now governs select advanced institutional, charter, and tournament choices while preserving ordinary alternatives.'
    ] },
    { v: '1.127.1', date: '2026-08-14', changes: [
      'Local-government dialogs now show clearer selections and keep confirmation and Back controls in consistent sticky footers.'
    ] },
    { v: '1.127.0', date: '2026-08-14', changes: [
      'Local government now brings town-council motions and appointed Castellan tenures.',
      'Land grants now combine a chosen recipient with a service charter and hereditary, life, or fixed-term tenure.'
    ] },
    { v: '1.126.1', date: '2026-08-14', changes: [
      'Barber controls now keep the portrait fixed, use compact mobile selectors, and separate facial-hair families from their styles.',
      'Beard and moustache designs now have clearer, better-aligned silhouettes.'
    ] },
    { v: '1.126.0', date: '2026-08-14', changes: [
      'Manual land grants can now install eligible adult relatives as county or duchy vassals.'
    ] },
    { v: '1.125.0', date: '2026-08-14', changes: [
      'Visit the barber from Equipment to customize the protagonist’s hair and facial hair.'
    ] },
    { v: '1.124.1', date: '2026-08-13', changes: [
      'Title-screen music controls now sit in the lower-left, with a next button for cycling through all three themes.'
    ] },
    { v: '1.124.0', date: '2026-08-13', changes: [
      'Play now announces when a newer version is ready and offers to save and reload without interrupting the current session.',
      'Event result notices now remain anchored while they fade into the map.'
    ] },
    { v: '1.123.0', date: '2026-08-13', changes: [
      'Social access now follows rank: warm intermediaries can open higher courts, while distant contacts make cultivation, gifts, courtship, and bought intrigue less effective and more costly.'
    ] },
    { v: '1.122.2', date: '2026-08-13', changes: [
      'Marriage searches now offer age-relative prospects, with a fourth young-adult option for protagonists aged forty or older.'
    ] },
    { v: '1.122.1', date: '2026-08-13', changes: [
      'Event result notices now stay anchored inside the map when tutorial notices stack.'
    ] },
    { v: '1.122.0', date: '2026-08-13', changes: [
      'Serf and other commoner lives now face new customary burdens and rare culture-specific slave raids with plunder, captivity, and forced settlement.',
      'Event result notices now appear above the map’s bottom-left edge instead of covering action controls.'
    ] },
    { v: '1.121.1', date: '2026-08-12', changes: [
      'Music now switches immediately from the title theme into gameplay, with compact mobile controls that stay clear of map notices.',
      'Guide hints can now be disabled in Settings.',
      'Chronicle choices and event consequence details now use clearer spacing and omit internal or empty outcome labels.'
    ] },
    { v: '1.121.0', date: '2026-08-12', changes: [
      'Battle-proven founders can now command a patron’s wartime host and earn their first barony through a field victory.'
    ] },
    { v: '1.120.1', date: '2026-08-12', changes: [
      'Marriage searches can now sound out new families every 30 days for the protagonist and each eligible descendant.'
    ] },
    { v: '1.120.0', date: '2026-08-12', changes: [
      'Rival AI kings now keep their crown while they hold land in its kingdom, then fall to their true rank once driven out.'
    ] },
    { v: '1.119.1', date: '2026-08-12', changes: [
      'Event stakes now use side tooltips on desktop and question-mark details on touch and tablet layouts.'
    ] },
    { v: '1.119.0', date: '2026-08-12', changes: [
      'Events now preview their stakes and record exact results in a filterable Chronicle, with touch-friendly details.'
    ] },
    { v: '1.118.3', date: '2026-08-12', changes: [
      'Local lords now keep their own households through friendship and marriage and cannot be hired or directed into household careers.'
    ] },
    { v: '1.118.2', date: '2026-08-12', changes: [
      'Settlement fill now uses more medieval place names and skips modern-only towns across the map.'
    ] },
    { v: '1.118.1', date: '2026-08-12', changes: [
      'The title screen now chooses among Christian, Muslim, and pagan themes, and each theme joins its faith’s in-game soundtrack.'
    ] },
    { v: '1.118.0', date: '2026-08-11', changes: [
      'Hostile intrigue now brings targeted assassination, abduction, blackmail, fabricated charges, and sabotage to Deeds, with accomplices, captives, and evidence hearings.'
    ] },
    { v: '1.117.16', date: '2026-08-11', changes: [
      'Guide More info links now land on the exact documentation section for each topic.'
    ] },
    { v: '1.117.15', date: '2026-08-11', changes: [
      'Every in-game Guide topic now links to the matching GitHub documentation for deeper detail.'
    ] },
    { v: '1.117.14', date: '2026-08-11', changes: [
      'Long-running lives now spend less time on daily simulation, army route planning, autosaves, and Chronicle refreshes.'
    ] },
    { v: '1.117.13', date: '2026-08-11', changes: [
      'A newly gentle house must pass to a true next-generation heir — a child, nephew, or adopted heir — before it can petition for a barony; a sibling who inherits no longer counts.'
    ] },
    { v: '1.117.12', date: '2026-08-10', changes: [
      'The title screen plays its new intro theme again — the soundtrack catalog still pointed at the retired file.'
    ] },
    { v: '1.117.11', date: '2026-08-10', changes: [
      'Background soundtrack now prepares the next song before the current one ends, so locked Android sessions continue across tracks.'
    ] },
    { v: '1.117.10', date: '2026-08-10', changes: [
      'Background music now stays active through Android screen locks and loop boundaries, with lock-screen controls and playback recovery.'
    ] },
    { v: '1.117.9', date: '2026-08-10', changes: [
      'A new Music setting can keep the soundtrack, including the title theme, playing when the game loses focus instead of pausing it.'
    ] },
    { v: '1.117.8', date: '2026-08-10', changes: [
      'County borders no longer stretch across straits and seas — Tangier keeps no Spanish shore, Mecca no Nubian coast, and counties everywhere hold to their own side of the water. A few settlements moved to the county they really belong to.'
    ] },
    { v: '1.117.7', date: '2026-08-10', changes: [
      'The Papacy & College deed now appears only for those who deal with the Church — landed rulers, monks and priests, bishops, and cardinals — instead of every Catholic serf.'
    ] },
    { v: '1.117.6', date: '2026-08-10', changes: [
      'New games let you choose the exact settlement you were born in: pick a county and the map zooms in so you can tap a town or village — or take the county seat. Shared start codes remember the choice.'
    ] },
    { v: '1.117.5', date: '2026-08-10', changes: [
      'Settlements whose real-world names are modern now go by their older names instead — Jaffa for Tel Aviv, Constantinople-era names across Anatolia, Königsberg and Memel on the Baltic, and over a hundred more.'
    ] },
    { v: '1.117.4', date: '2026-08-10', changes: [
      'Coastal settlements no longer hang over the waterline at close zoom, and Venice now sits on its own lagoon island.',
      'Sovereign capitals stand out: a gold star rides beside the capital county’s name on the map, and the Land tab tells you when a county is its realm’s capital.',
      'Real settlement names that carried modern district numbers now use their historical names instead.'
    ] },
    { v: '1.117.3', date: '2026-08-09', changes: [
      'Settlements now use real place names and locations — nearly three thousand towns and villages from the GeoNames database fill every county, alongside the curated historical sites.'
    ] },
    { v: '1.117.2', date: '2026-08-09', changes: [
      'Counties grow more settlements as they develop — six or seven in the most developed lands — and generated villages now spread across the county instead of clustering around its head.'
    ] },
    { v: '1.117.1', date: '2026-08-09', changes: [
      'Settlements are easier to read on the map: names sit beneath clearer house, town, and city emblems at close zoom, county land and borders render smoothly, and the map zooms much further in. Settlement names in the Land tab now open that settlement and center the map on its county.',
      'The Guide gains a Back button when opened from another dialog, and Close simply dismisses it.',
      'Music downloads now show their progress anywhere, and a finished download posts a toast instead of reopening the downloads window over the game.'
    ] },
    { v: '1.117.0', date: '2026-08-08', changes: [
      'Towns, castles, abbeys, and other settlements now appear as shape-coded markers on the map at close zoom — tap one to inspect the site and its holders. Around 140 historical settlements are authored across the 867 and 1066 starts.'
    ] },
    { v: '1.116.4', date: '2026-08-08', changes: [
      'Realm map color and fill opacity now live in Settings, and modal content keeps clear of its scrollbars.'
    ] },
    { v: '1.116.3', date: '2026-08-08', changes: [
      'Realm and map-filter selections now preserve political colors, with customizable outlines and a realm-and-demesne summary on the Self tab.'
    ] },
    { v: '1.116.2', date: '2026-08-08', changes: [
      'Trade guild officers once again require Lettered and Learning 6.'
    ] },
    { v: '1.116.1', date: '2026-08-08', changes: [
      'The itch build now ships the complete soundtrack and follows the same contextual folk, court, and war selection as hosted play.'
    ] },
    { v: '1.116.0', date: '2026-08-08', changes: [
      'Added dedicated Muslim and pagan folk, court, and war soundtrack banks, with a tighter Christian track selection.'
    ] },
    { v: '1.115.1', date: '2026-08-07', changes: [
      'The Land tab now groups realm, county, and development details into responsive cards, with long explanations stacked for easier reading on desktop and mobile.'
    ] },
    { v: '1.115.0', date: '2026-08-07', changes: [
      'The soundtrack now includes dedicated court and war music, follows wars involving the player’s realm without interrupting the current song, and pauses while the game is unfocused. Quick playback controls are available beside the song title and inside its details.',
      'Main-menu actions now have distinct icons.'
    ] },
    { v: '1.114.0', date: '2026-08-07', changes: [
      'Added an optional contextual soundtrack with remembered title controls, cached Opus playback, and downloadable offline music banks. Compact Settings now hides desktop keyboard controls.'
    ] },
    { v: '1.113.4', date: '2026-08-07', changes: [
      'Council dismissals and punishments now leave the intended office vacant instead of immediately moving the removed magnate into another seat.'
    ] },
    { v: '1.113.3', date: '2026-08-07', changes: [
      'Faith details now recount each branch’s origin, lineage, doctrine, and authority, while newly founded faiths no longer inherit a Pope or Caliph unless they explicitly retain the office. Election, privilege, debt, family, and exceptional-courtship dialogs now use consistent exits and safer confirmation focus.'
    ] },
    { v: '1.113.2', date: '2026-08-06', changes: [
      'Submitting a shared start code with Enter no longer reopens New Game over character creation.'
    ] },
    { v: '1.113.1', date: '2026-08-06', changes: [
      'Faith relationships now shape Standing: shared and related faiths begin warmer, foreign faiths guarded, and explicitly hostile faiths sharply opposed.'
    ] },
    { v: '1.113.0', date: '2026-08-06', changes: [
      'Guild officers and guildmasters now win fixed-term elections, while charters can require confirmation of great Council offices and organized groups can demand durable privileges.'
    ] },
    { v: '1.112.0', date: '2026-08-06', changes: [
      'AI rulers now pursue long-term aims, maintain political relationships, and make bounded approaches, while managed relatives develop ambitions and can hold family offices.'
    ] },
    { v: '1.111.0', date: '2026-08-06', changes: [
      'Faiths can now fracture into new reform movements that spread through families and realms, reshape diplomacy and war, and persist in saves and mods.'
    ] },
    { v: '1.110.6', date: '2026-08-06', changes: [
      'Hosted play analytics now use clearer campaign and active-play events, with one campaign resume counted per page.'
    ] },
    { v: '1.110.5', date: '2026-08-06', changes: [
      'Rome is reserved for the Pope and can no longer be granted as a personal Bishopric.'
    ] },
    { v: '1.110.4', date: '2026-08-05', changes: [
      'First-party play analytics now distinguish starts, returns, engagement, succession, and completed sagas without sending names, seeds, or save contents.'
    ] },
    { v: '1.110.3', date: '2026-08-05', changes: [
      'Technology and realm automation controls now appear only for roles that can use them, while locked household choices still name their national prerequisite.'
    ] },
    { v: '1.110.2', date: '2026-08-05', changes: [
      'Defaults now show their path to distraint, can be settled directly, and end in station-specific manor forfeiture, serfdom, or labor service.'
    ] },
    { v: '1.110.1', date: '2026-08-04', changes: [
      'Practitioners now provide their intended household protection, and Bailiffs gain Standing with the local authority even without a direct liege.'
    ] },
    { v: '1.110.0', date: '2026-08-04', changes: [
      'Literacy now opens Administration, Medicine, and Scholarship career trees with professional examinations, specialist work, and family treatises. Advanced Trade guild leadership also requires letters.'
    ] },
    { v: '1.109.1', date: '2026-08-04', changes: [
      'Governance vassal rows are more compact, and county autobuild now handles a fully reserved domain cleanly.'
    ] },
    { v: '1.109.0', date: '2026-08-04', changes: [
      'Management screens now keep their place after nested actions, with reservations that protect land, people, items, and projects from automatic or batch choices. Governance also offers a reviewed domain-cleanup proposal when holdings exceed the limit.'
    ] },
    { v: '1.108.0', date: '2026-08-03', changes: [
      'The First steps checklist grows into a full tutorial for a new life: staged tracks now walk through the daily loop, making a living, and starting a family, joined by short scripted story events, tab nudges, and first-look intro sheets on the Land, Network, and Kin tabs.'
    ] },
    { v: '1.107.2', date: '2026-08-03', changes: [
      'Petitioning your liege for title now grants land inside the realm — never your liege’s seat or his last county — and only a king or emperor can raise you to duke: a duke’s man who gathers a duchy’s lands keeps them as a claim until he answers to the crown or stands alone.'
    ] },
    { v: '1.107.1', date: '2026-08-03', changes: [
      'The First steps checklist now disappears as soon as its final task is completed.'
    ] },
    { v: '1.107.0', date: '2026-08-03', changes: [
      'A new life now opens with a dismissible First steps checklist atop the Deeds tab that walks through the daily loop once, plus one-line hints the first time their moment arrives.',
      'Reaching a new rank or vocation now briefs you on a small focused sheet with a link into the Guide, instead of opening the whole Guide.'
    ] },
    { v: '1.106.1', date: '2026-08-03', changes: [
      'The Deeds tab now hides what your station cannot use: serfs no longer see Coin & Credit (unless the family holds debts or pawnable goods) or the ongoing-commitments ledger, and Technology appears only at landed rank.'
    ] },
    { v: '1.106.0', date: '2026-08-03', changes: [
      'Rank can now be lost as well as won: a dignity that outlives its lands slowly lapses, a beaten ruler may kneel to the victor or be captured for ransom, and a defiant vassal can be attainted and lose his fief.',
      'Debt now has teeth: a common family that cannot pay can be distrained of its goods and bound back to the land, and raiders burning your home parish may drive you to trade freedom for a lord’s protection.'
    ] },
    { v: '1.105.2', date: '2026-08-02', changes: [
      'A peddler’s stock now matches your station and your purse — a serf is shown mostly common gear and a wealthy house finer wares, with the rare glimpse of a piece plainly not made for your station.'
    ] },
    { v: '1.105.1', date: '2026-08-01', changes: [
      'Standing figures on the equipment and death screens stand taller with truer proportions, staged against a darker backdrop that lets faces and cloth stand out.'
    ] },
    { v: '1.105.0', date: '2026-08-01', changes: [
      'The Estates now debate a whole catalog of policies — subsidies, scutage, levy relief, market charters, confirmations of custom, and wartime authorizations — with each political bloc lobbying and voting its own posture.'
    ] },
    { v: '1.104.4', date: '2026-08-01', changes: [
      'Orchards no longer require Seed Selection, and a Press House now earns half again as much when your household also runs an Orchard in the same province.'
    ] },
    { v: '1.104.3', date: '2026-08-01', changes: [
      'Portraits now paint at your screen’s full resolution, so faces and full-figure dolls look sharp on phones and high-DPI displays.'
    ] },
    { v: '1.104.2', date: '2026-08-01', changes: [
      'Internal reorganization of the interface code into four files. Nothing changes in play.'
    ] },
    { v: '1.104.1', date: '2026-08-01', changes: [
      'The Guide now opens on the selected topic reliably and its search also matches what each skill affects, war catalogue filters properly hide filtered targets, and collapsing a family tree branch hides that branch again.'
    ] },
    { v: '1.104.0', date: '2026-08-01', changes: [
      'An aging family head can now retire and hand the house to an adult heir, unwed siblings at home can be put to work in careers and enterprises, new games offer a choice of starting family ages, and the house can be renamed from the family screen.'
    ] },
    { v: '1.103.0', date: '2026-08-01', changes: [
      'Gentry and landed lords now receive invitations to jousting tournaments in the dry seasons — ride in the joust or melee, wager on the champion, or simply attend as the host’s guest.'
    ] },
    { v: '1.102.0', date: '2026-07-31', changes: [
      'Portraits are redrawn in the illustrated Court style: every character is a unique painted face with real hair, beards, headwear, and marks of age and health, and the equipment screen shows gear worn on the full figure with hand weapons in side panels.'
    ] },
    { v: '1.101.4', date: '2026-07-31', changes: [
      'Female rulers across the map now use proper female titles — Sultana, Emira, Duchess, Khatun, and the like — instead of male forms like Sultan or Emir.'
    ] },
    { v: '1.101.3', date: '2026-07-31', changes: [
      'Families past a safe record size pause new kin weddings and births so saving keeps working, and extreme fertility can no longer make every kin birth a certainty.'
    ] },
    { v: '1.101.2', date: '2026-07-31', changes: [
      'Character, technology, enterprise, building, and item details now list their terms as compact rows instead of boxed tables.'
    ] },
    { v: '1.101.1', date: '2026-07-31', changes: [
      'The Guide now keeps search results, full topic explanations, and role orientations together in one expandable screen.'
    ] },
    { v: '1.101.0', date: '2026-07-31', changes: [
      'Wars now track recent battles, troop losses, campaign effects, and live logistics, with new personal, host, and whole-war events.'
    ] },
    { v: '1.100.0', date: '2026-07-31', changes: [
      'Settings now offers configurable action shortcuts, while family trees, conquest targets, and enterprise lists gain navigation, filtering, grouping, and sorting tools.'
    ] },
    { v: '1.99.0', date: '2026-07-31', changes: [
      'Mods can now customize technology domains, traditions, caps, and the default bookmark.'
    ] },
    { v: '1.98.1', date: '2026-07-31', changes: [
      'The Guide now explains wars, claims, aggression, and sieges, with a direct link from the conquest picker.'
    ] },
    { v: '1.98.0', date: '2026-07-31', changes: [
      'Independent rulers can now declare Wars of Aggression without a claim after reviewing the political costs and unrest their conquest will cause.'
    ] },
    { v: '1.97.0', date: '2026-07-31', changes: [
      'A new searchable Guide explains skills, roles, family and inheritance, settlements, and technology from the screens where those rules matter.',
      'One-time role orientations now introduce newly unlocked responsibilities and useful first steps.'
    ] },
    { v: '1.96.5', date: '2026-07-31', changes: [
      'Save files now store realm courts more compactly while restoring the same characters, families, and national knowledge.'
    ] },
    { v: '1.96.4', date: '2026-07-31', changes: [
      'Realm courts now recover missing household members when opened and continue past malformed heirs instead of leaving a throne stalled.'
    ] },
    { v: '1.96.3', date: '2026-07-31', changes: [
      'Court houses with qualifying Crown or Mercantile commitments now keep those allegiances ahead of broader Magnate affinities.'
    ] },
    { v: '1.96.2', date: '2026-07-31', changes: [
      'Realm courts now preserve thrones, pledges, and child accessions correctly, while Papal households and yearly family cleanup stay bounded.'
    ] },
    { v: '1.96.1', date: '2026-07-30', changes: [
      'The Land tab’s Notable folk list now shows each ruler’s portrait instead of their realm crest.',
      'Political court ordering and narrow-screen Estates lobbying controls now stay consistent.'
    ] },
    { v: '1.96.0', date: '2026-07-30', changes: [
      'Reigning dynasties now keep their ruler, consort, and heirs as full characters, with portraits, character sheets, and identity preserved through succession.',
      'Baronial county modifiers and Estates sessions begun while travelling now apply to the correct home seat.'
    ] },
    { v: '1.95.0', date: '2026-07-30', changes: [
      'Political blocs now reveal court alliances, influence, and vote forecasts in Governance and Network. Estates motions now use bloc campaigning and influence-weighted votes.'
    ] },
    { v: '1.94.0', date: '2026-07-30', changes: [
      'Field armies now cross water according to national transport capacity and seafaring technology, with route and crossing details shown when orders are issued.'
    ] },
    { v: '1.93.6', date: '2026-07-30', changes: [
      'Family names, marriage terms, stepchildren, career histories, Guild Standing, and enterprise staffing now follow consistent household rules. Large-list returns and building previews no longer disturb focus or play state.'
    ] },
    { v: '1.93.5', date: '2026-07-30', changes: [
      'Ongoing commitments no longer repeats the daily focus on desktop, while its mobile focus shortcut now opens the top of the focus list.'
    ] },
    { v: '1.93.4', date: '2026-07-30', changes: [
      'The Deeds panel now keeps daily focuses together, collapses ongoing commitments from their heading, and lets players hide beginner path hints.'
    ] },
    { v: '1.93.3', date: '2026-07-30', changes: [
      'Governance now uses compact section tabs and a denser vassal ledger on desktop and mobile.'
    ] },
    { v: '1.93.2', date: '2026-07-29', changes: [
      'Work & Enterprises now returns to the exact managed enterprise, while list browsing and fresh-game intrigue state remain stable.'
    ] },
    { v: '1.93.1', date: '2026-07-29', changes: [
      'Household standard details now present the current state and next upgrade in a shorter, clearer layout.'
    ] },
    { v: '1.93.0', date: '2026-07-29', changes: [
      'Council and Estates stories now leave visible county consequences through trade, service, roads, custom, and local grievances.'
    ] },
    { v: '1.92.0', date: '2026-07-29', changes: [
      'Intrigue gains five political plots, while foreign-policy directions, pacts, alliances, and ruler succession now produce new diplomatic events.'
    ] },
    { v: '1.91.0', date: '2026-07-29', changes: [
      'Work & Enterprises and Network now use counted, collapsible sections with attention filters and search for large lists.'
    ] },
    { v: '1.90.2', date: '2026-07-29', changes: [
      'Household standards, work outfits, and permanent property now use a compact catalogue with full details available from each row.'
    ] },
    { v: '1.90.1', date: '2026-07-29', changes: [
      'Standing stays synchronized for reigning rulers, and Governance remains stable on narrow screens and older saves.'
    ] },
    { v: '1.90.0', date: '2026-07-29', changes: [
      'Character and ruler sheets now use consistent interaction cards that group available actions, commitments, costs, consequences, and blocked reasons.'
    ] },
    { v: '1.89.0', date: '2026-07-29', changes: [
      'play.fallowborn.com now prepares a complete offline copy after one online visit and can be installed from supported browsers.'
    ] },
    { v: '1.88.0', date: '2026-07-29', changes: [
      'Territorial rulers now have a Governance sheet for realm structure, demesne, vassals, military service, and their Council or Estates.'
    ] },
    { v: '1.87.0', date: '2026-07-29', changes: [
      'Personal, feudal, and diplomatic relationships now use one Standing score and consistent terminology across character, ruler, Council, Estates, and event surfaces.'
    ] },
    { v: '1.86.0', date: '2026-07-29', changes: [
      'Household Plan now offers an optional descendant match assistant that recommends families within saved station and expense limits without making a pledge.'
    ] },
    { v: '1.85.0', date: '2026-07-29', changes: [
      'Each managed character’s Equipment sheet can now preview and apply the strongest available outfit.'
    ] },
    { v: '1.84.2', date: '2026-07-29', changes: [
      'Freeholders can now buy every remaining plot needed for a manor in one reviewed purchase from the land market.'
    ] },
    { v: '1.84.1', date: '2026-07-29', changes: [
      'The Deeds panel’s commitments ledger can now be hidden in Settings, and its Daily focus shortcut places focus choices at the top of the panel.'
    ] },
    { v: '1.84.0', date: '2026-07-29', changes: [
      'Counts and higher rulers can now move their capital and household home once per lifetime from the Land panel.'
    ] },
    { v: '1.83.1', date: '2026-07-29', changes: [
      'Dialogs now keep keyboard focus contained and return it reliably after closing.'
    ] },
    { v: '1.83.0', date: '2026-07-28', changes: [
      'The Deeds panel now gathers ongoing commitments into one responsive ledger with direct links to manage each one.'
    ] },
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

  /* Anonymous gameplay events are a progressive enhancement on the official
     play origin only. index.html owns the exact-origin gate and Umami queue;
     this layer owns the small, low-cardinality gameplay vocabulary. */
  const TELEMETRY_MILESTONES = [
    { seconds:60, name:'active-play-reached-1-minute' },
    { seconds:300, name:'active-play-reached-5-minutes' },
    { seconds:900, name:'active-play-reached-15-minutes' },
    { seconds:1800, name:'active-play-reached-30-minutes' }
  ];
  let telemetrySession = null;
  let telemetryTimer = null;
  let telemetryResumeReported = false;
  let newGameTelemetrySeen = null;

  const NEW_GAME_TELEMETRY_EVENTS = {
    'starting-date':'new-game-starting-date-viewed',
    'seed-dialog':'new-game-seed-dialog-viewed',
    'beginning':'new-game-beginning-viewed',
    'birthplace':'new-game-birthplace-viewed',
    'character':'new-game-character-viewed'
  };

  function telemetryEnabled() {
    return !!(FB.telemetry &&
      typeof FB.telemetry.enabled === 'function' &&
      FB.telemetry.enabled());
  }

  function telemetryData(extra) {
    const s = FB.state;
    const data = {
      telemetry_schema:2,
      game_version:FB.VERSION,
      locale:FB.locale || 'en'
    };
    if (s && s.player) {
      data.player_tier = Number(s.player.tier) || 0;
      data.dynasty_generation = Number(s.generation) || 1;
    }
    if (extra) {
      for (const key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) {
          data[key] = extra[key];
        }
      }
    }
    /* Campaign context wins over event-specific fields so every active event
       that names its bookmark also reports the matching current game year.
       Pre-campaign setup events have no state yet and remain intentionally
       bookmark-only. */
    if (s && s.start && s.start.id) {
      data.start_bookmark = String(s.start.id);
      if (s.date && Number.isFinite(Number(s.date.year))) {
        data.game_year = Number(s.date.year);
      } else if (Number.isFinite(Number(s.start.year))) {
        data.game_year = Number(s.start.year);
      }
    }
    return data;
  }

  function trackTelemetry(name, extra) {
    if (!telemetryEnabled() ||
        typeof FB.telemetry.track !== 'function') return false;
    return FB.telemetry.track(name, telemetryData(extra));
  }
  FB.trackTelemetry = trackTelemetry;

  function trackNewGameScreen(screen, extra) {
    const eventName = NEW_GAME_TELEMETRY_EVENTS[screen];
    if (!eventName || !newGameTelemetrySeen || newGameTelemetrySeen[screen]) return;
    newGameTelemetrySeen[screen] = true;
    trackTelemetry(eventName, extra);
  }

  function clearTelemetryTimer() {
    if (telemetryTimer) clearInterval(telemetryTimer);
    telemetryTimer = null;
  }

  function telemetryPulse(now) {
    if (!telemetrySession) return 0;
    const at = typeof now === 'number' ? now : Date.now();
    const elapsed = Math.max(0, Math.min(30000, at - telemetrySession.lastAt));
    telemetrySession.lastAt = at;
    if (!document.hidden && FB.state && FB.state.player &&
        !FB.state.player.dead) {
      telemetrySession.activeMs += elapsed;
    }
    while (telemetrySession.nextMilestone < TELEMETRY_MILESTONES.length &&
        telemetrySession.activeMs >=
          TELEMETRY_MILESTONES[telemetrySession.nextMilestone].seconds * 1000) {
      const milestone = TELEMETRY_MILESTONES[telemetrySession.nextMilestone++];
      trackTelemetry(milestone.name, {
        entry_type:telemetrySession.entryType,
        active_seconds:milestone.seconds
      });
    }
    return Math.floor(telemetrySession.activeMs / 1000);
  }

  function beginTelemetrySession(entryType) {
    clearTelemetryTimer();
    telemetrySession = null;
    if (!telemetryEnabled()) return;
    telemetrySession = {
      entryType:entryType,
      activeMs:0,
      lastAt:Date.now(),
      nextMilestone:0,
      lastCheckpointSeconds:0
    };
    telemetryTimer = setInterval(function () {
      telemetryPulse();
    }, 15000);
  }

  function telemetryCheckpoint(reason) {
    if (!telemetrySession) return;
    const activeSeconds = telemetryPulse();
    if (activeSeconds <= telemetrySession.lastCheckpointSeconds) return;
    telemetrySession.lastCheckpointSeconds = activeSeconds;
    const extra = {
      entry_type:telemetrySession.entryType,
      active_seconds:activeSeconds,
      checkpoint_reason:reason
    };
    if (FB.state && FB.state.date) extra.game_year = FB.state.date.year;
    trackTelemetry('active-play-checkpoint', extra);
  }

  function endTelemetrySession() {
    if (!telemetrySession) return null;
    const summary = {
      entry_type:telemetrySession.entryType,
      active_seconds:telemetryPulse()
    };
    clearTelemetryTimer();
    telemetrySession = null;
    return summary;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) telemetryCheckpoint('page-hidden');
    else telemetryPulse();
  });
  window.addEventListener('pagehide', function () {
    telemetryCheckpoint('page-hide');
  });

  function refreshOfflineStatus() {
    const note = document.getElementById('offline-status');
    let ready = false;
    try {
      ready = FB.platform.isPlay && 'serviceWorker' in navigator &&
        !!navigator.serviceWorker.controller;
    } catch (error) {
      ready = false;
    }
    if (!note) return;
    note.classList.toggle('hidden', !ready);
    if (ready) note.textContent = FB.T('Game available offline');
  }

  const HOSTED_UPDATE_CHECK_MS = 5 * 60 * 1000;
  const HOSTED_UPDATE_MIN_GAP_MS = 60 * 1000;
  let hostedWorkerRegistration = null;
  let hostedWorkerController = null;
  let hostedUpdateAvailable = false;
  let hostedUpdateLastCheck = 0;

  function loadedHostedBuildKey() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].getAttribute('src') || '';
      if (!/(^|\/)js\/main\.js(?:[?#]|$)/.test(src)) continue;
      const version = /[?&]v=([^&#]+)/.exec(src);
      if (!version) return FB.VERSION;
      try { return decodeURIComponent(version[1]); } catch (error) { return version[1]; }
    }
    return FB.VERSION;
  }
  const hostedPageBuildKey = loadedHostedBuildKey();

  function noteHostedBuild(buildKey) {
    if (!FB.platform.isPlay || !buildKey ||
        String(buildKey) === hostedPageBuildKey || hostedUpdateAvailable) return false;
    const banner = document.getElementById('update-banner');
    if (!banner) return false;
    hostedUpdateAvailable = true;
    banner.classList.remove('hidden');
    return true;
  }
  G.noteHostedBuild = noteHostedBuild;

  function saveAndReloadHostedUpdate() {
    const button = document.getElementById('update-reload');
    if (button) button.disabled = true;
    if (FB.state && FB.state.player && !FB.state.player.dead && !G.observe) {
      /* An older deferred autosave must land before the current synchronous
         snapshot, or pagehide could overwrite the newer state during reload. */
      if (FB.save.flushPending) FB.save.flushPending();
      if (!FB.save.toSlot('auto')) {
        if (button) button.disabled = false;
        return false;
      }
    }
    window.location.reload();
    return true;
  }

  const hostedReloadButton = document.getElementById('update-reload');
  if (hostedReloadButton) {
    hostedReloadButton.addEventListener('click', saveAndReloadHostedUpdate);
  }

  function requestHostedBuildKey(worker) {
    if (!worker || typeof worker.postMessage !== 'function') return;
    try { worker.postMessage({ type:'fallowborn-build-key-request' }); } catch (error) {}
  }

  function hostedControllerChanged() {
    const current = navigator.serviceWorker.controller;
    refreshOfflineStatus();
    if (hostedWorkerController && current && current !== hostedWorkerController) {
      requestHostedBuildKey(current);
    }
    if (current) hostedWorkerController = current;
  }

  function checkHostedUpdate() {
    if (!hostedWorkerRegistration || hostedUpdateAvailable || document.hidden ||
        typeof hostedWorkerRegistration.update !== 'function') return;
    const now = Date.now();
    if (now - hostedUpdateLastCheck < HOSTED_UPDATE_MIN_GAP_MS) return;
    hostedUpdateLastCheck = now;
    hostedWorkerRegistration.update().catch(function () {
      /* Being offline is ordinary; the current complete shell keeps running. */
    });
  }

  /* Offline refresh belongs only to the first-party hosted surface. A failed
     registration is progressive-enhancement failure and must not stop boot. */
  if (FB.platform.isPlay && 'serviceWorker' in navigator) {
    try {
      hostedWorkerController = navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('message', function (event) {
        const data = event.data;
        if (!data || data.type !== 'fallowborn-build-key-response') return;
        noteHostedBuild(data.buildKey);
      });
      navigator.serviceWorker.addEventListener('controllerchange', hostedControllerChanged);
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      }).then(function (registration) {
        hostedWorkerRegistration = registration;
        hostedControllerChanged();
        checkHostedUpdate();
        setInterval(checkHostedUpdate, HOSTED_UPDATE_CHECK_MS);
      }).catch(function () {
        /* Ordinary online play remains available without the offline shell. */
      });
      window.addEventListener('focus', checkHostedUpdate);
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) checkHostedUpdate();
      });
    } catch (error) {
      /* Older or restricted browsers may reject registration synchronously. */
    }
  }
  refreshOfflineStatus();

  function $(id) { return document.getElementById(id); }

  /* ================= scenarios ================= */
  /* Compatibility aliases for console helpers and older integrations. The
     public authored source and runtime-mod surface are the FBDATA tables. */
  G.SCENARIOS = FBDATA.startScenarios;
  G.FAMILY_PRESETS = FBDATA.familyPresets;

  const START_TIER_NAMES = ['Serf', 'Freeholder', 'Gentry', 'Baron'];

  function scenarioUnlocked(scenario) {
    return !!scenario && (!FB.startProgression ||
      FB.startProgression.isTierUnlocked(scenario.tier));
  }

  function scenarioUnlockText(scenario, startCode) {
    const station = FB.T(START_TIER_NAMES[Math.min(3, scenario.tier)] || 'Baron');
    if (startCode) {
      return FB.T(
        'That beginning is locked. Reach {station} in any life to use this start code.',
        { station:station });
    }
    return FB.T('Reach {station} in any life to unlock this beginning.', {
      station:station
    });
  }

  /* Starting-family presets: a small authored set of age/household shapes,
     picked on the character screen and carried in the start code's optional
     seventh part. 'standard' must stay exactly the historical start, so every
     extra RNG draw a richer preset needs runs only for that preset, in a
     fixed order after the shared parents/siblings. Ages are authored fields,
     never player-edited; every preset keeps the protagonist an adult (>= 16)
     and leaves siblings and/or children behind as heirs. */
  function familyPresetById(id) {
    return FBDATA.familyPresets.filter(function (p) { return p.id === id; })[0] || null;
  }

  /* ================= seeds =================
     A start is reproducible because G.start re-seeds the RNG from the seed
     string before initPolitics and character generation draw on it — see
     docs/designs/seeds.md. Two shareable forms:
     - world seed: any text normalized to A-Z0-9 (fresh ones are base36)
     - start code: SEED-BOOKMARK-SCENARIO-PROVINCE-SEX-NAME[-FAMILYPRESET[-SETTLEMENT[-CULTURE.RELIGION]]]
       (a birthplace settlement slot rides as an eighth part, always behind an
       explicit preset part; a non-principal community rides as a ninth part)
       (legacy five-part codes imply bookmark 867; the family preset part is
       omitted for the standard start) */

  // a fresh seed is one-time seed initialization — the legitimate Math.random use
  function freshSeed() {
    return ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0).toString(36).toUpperCase();
  }

  function provinceCommunity(province, cultureId, religionId) {
    const communities = FB.provinceCommunities(province);
    for (const community of communities) {
      if (community.culture === cultureId && community.religion === religionId) {
        return community;
      }
    }
    return communities[0] || null;
  }

  function communityLabel(community) {
    const culture = FB.cultureOf(community.culture);
    const religion = FB.religionOf(community.religion);
    return FB.renderKey('culture.' + community.culture + '.name.default',
      { text:culture.name }, {}) + ' · ' +
      FB.renderKey('religion.' + community.religion + '.name.default',
        { text:religion.name }, {});
  }

  function seedCode(seed, bookmarkId, scenId, provId, sex, name, presetId,
      settlementIdx, cultureId, religionId, province) {
    const n = (name || '').replace(/-/g, '').replace(/\s+/g, '_');
    const code = seed + '-' + bookmarkId + '-' + scenId + '-' + provId + '-' + sex + '-' + n;
    const nonPrincipal = province &&
      (cultureId !== province.culture || religionId !== province.religion);
    if (nonPrincipal) {
      return code + '-' + (presetId && presetId !== 'standard' ? presetId : 'standard') +
        '-' + (settlementIdx > 0 ? settlementIdx : 0) + '-' +
        cultureId + '.' + religionId;
    }
    /* a chosen birthplace beyond the county seat adds an eighth part — the
       settlement slot — and always spells the preset part before it so the
       split stays aligned. The standard family start at the county seat takes
       no extra parts, so old five/six/seven-part codes keep spelling — and
       reproducing — the exact same start */
    if (settlementIdx > 0) {
      return code + '-' + (presetId && presetId !== 'standard' ? presetId : 'standard') +
        '-' + settlementIdx;
    }
    return presetId && presetId !== 'standard' ? code + '-' + presetId : code;
  }

  /* parse what a player pasted: a full start code, a bare world seed, or an
     error to show inline. Five- through nine-part shapes must validate as
     codes — silently falling back to a bare seed would hand them another
     world. */
  function parseSeedInput(raw) {
    const txt = (raw || '').trim();
    if (!txt) return { error: 'Paste a start code or world seed first.' };
    const parts = txt.split('-');
    if (parts.length >= 5) {
      const bad = 'That start code doesn’t parse — check it was copied whole.';
      if (parts.length < 5 || parts.length > 9) return { error: bad };
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
      const scen = FBDATA.startScenarios.filter(function (s) {
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
      /* an optional seventh part names a starting-family preset; an eighth
         (which always carries an explicit preset part before it) is the
         birthplace settlement slot. A ninth names one exact authored county
         community. The slot is validated as a number here and clamped to the
         county's visible settlements once the bookmark is active. */
      let familyPreset = 'standard';
      if (!legacy && parts.length >= 7) {
        familyPreset = parts[6].toLowerCase();
        if (!familyPresetById(familyPreset)) return { error: bad };
      }
      let settlementIdx = 0;
      if (!legacy && parts.length >= 8) {
        if (!/^\d+$/.test(parts[7])) return { error: bad };
        settlementIdx = parseInt(parts[7], 10);
      }
      let cultureId = prov.culture, religionId = prov.religion;
      if (!legacy && parts.length === 9) {
        const identity = parts[8].toLowerCase().split('.');
        if (identity.length !== 2 || !identity[0] || !identity[1] ||
            !Array.isArray(prov.communities)) return { error: bad };
        const authored = prov.communities.filter(function (community) {
          return community.culture === identity[0] &&
            community.religion === identity[1];
        })[0];
        if (!authored) return { error: bad };
        cultureId = authored.culture;
        religionId = authored.religion;
      }
      return {
        seed:seed, bookmarkId:bookmarkId, scenario:scen,
        provinceId:prov.id, sex:sex, name:name, familyPreset:familyPreset,
        settlementIdx:settlementIdx, culture:cultureId, religion:religionId
      };
    }
    const bare = txt.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!bare) return { error: 'That seed has no usable letters or digits.' };
    return { seed: bare };
  }

  /* ================= boot ================= */
  function loadDeferredUi(done) {
    if (FB.ui && FB.ui.showMenu) { done(null); return; }
    const source = $('ui-modals-source');
    const script = document.createElement('script');
    script.src = source && source.href ? source.href : 'js/ui_modals.js';
    script.setAttribute('data-deferred-ui', 'modals');
    script.onload = function () { done(null); };
    script.onerror = function () {
      done(new Error(FB.T('The interface could not be prepared. Reload to try again.')));
    };
    document.head.appendChild(script);
  }

  function waitForFullStyles(done) {
    const link = $('full-stylesheet');
    if (!link || link.getAttribute('data-ready') === 'true') { done(null); return; }
    if (link.getAttribute('data-error') === 'true') {
      done(new Error(FB.T('The interface styles could not be loaded. Reload to try again.')));
      return;
    }
    function finish(error) {
      link.removeEventListener('load', loaded);
      link.removeEventListener('error', failed);
      done(error);
    }
    function loaded() { finish(null); }
    function failed() {
      finish(new Error(FB.T('The interface styles could not be loaded. Reload to try again.')));
    }
    link.addEventListener('load', loaded);
    link.addEventListener('error', failed);
  }

  function resolveMusicChoiceShell() {
    const root = document.documentElement;
    root.classList.remove('music-choice-pending');
    root.classList.add('music-choice-resolved');
    const choice = $('music-choice');
    if (choice) {
      choice.classList.add('hidden');
      choice.querySelectorAll('button').forEach(function (button) {
        button.disabled = true;
      });
    }
  }

  function finishTitleBoot() {
    refreshTitle();
    FB.ui.showScreen('title');
    resolveMusicChoiceShell();
    if (FB.music) FB.music.showTitle();
  }

  function readyTitleShell() {
    FB.map.init($('map'));
    FB.ui.wire();
    wireMenus();
    FB.drawCrest($('titlecrest'), 'Fallowborn');
    refreshTitle();
    FB.ui.showScreen('title');
    document.documentElement.classList.remove('boot-loading');
    $('title').setAttribute('aria-busy', 'false');
    $('title-boot-status').classList.add('hidden');
    document.querySelectorAll('#title button[disabled]').forEach(function (button) {
      button.disabled = false;
    });
    G.bootReady = true;
    if (FB.music && FB.music.offerBootChoice(finishTitleBoot)) return;
    finishTitleBoot();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // the one legitimate Math.random(): seed the game RNG once at boot, so
    // pre-game draws (random province, name suggestions) differ per visit;
    // loading a save overwrites the state from the file
    FB.seedRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    if (FB.music) FB.music.init();
    FB.loadSelectedLocale(function (loaded) {
      /* Mods establish the effective English source before hashes are checked.
         A changed mod string therefore falls back to that exact current English. */
      FB.mods.applyStored();
      if (FB.configureReligions) FB.configureReligions();
      if (FB.indexEventMessages) FB.indexEventMessages();
      FB.finalizeLocale(loaded);
      refreshOfflineStatus();
      /* Let the static title shell paint before parsing the large modal sheet.
         New Game and save loading already activate their selected bookmark,
         so the title no longer constructs an unused default world. */
      setTimeout(function () {
        loadDeferredUi(function (error) {
          if (error) {
            $('title-boot-status').textContent = error.message;
            return;
          }
          waitForFullStyles(function (styleError) {
            if (styleError) {
              $('title-boot-status').textContent = styleError.message;
              return;
            }
            readyTitleShell();
          });
        });
      }, 0);
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
    $('btn-bm-seed').addEventListener('click', function () { showSeedInput(); });
    $('btn-ng-back').addEventListener('click', function () { showBookmarks(); });
    $('btn-pick-back').addEventListener('click', function () {
      /* with a county chosen, Back steps from the settlement stage to the
         province stage instead of leaving the picker */
      if (G.pickStage === 'settlement' && G.pending && G.pending.provinceId) {
        G.pending.provinceId = null;
        G.pending.settlementIdx = 0;
        G.pickStage = 'province';
        FB.map.select(null);
        FB.map.fitView();
        updatePickInfo();
        return;
      }
      G.pickMode = false;
      document.body.classList.remove('picking');
      FB.ui.showScreen('newgame');
    });
    $('btn-pick-random').addEventListener('click', function () {
      /* settlement stage: the primary button commits the dropdown choice */
      if (G.pickStage === 'settlement' && G.pending && G.pending.provinceId) {
        G.pickSettlement({
          pid:G.pending.provinceId,
          index:G.pending.settlementIdx || 0
        });
        return;
      }
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
    $('btn-cg-start').addEventListener('click', function () { beginCampaignStart(); });
  }

  /* The ordinary path starts at the first real choice. A fresh seed is ready
     before the player chooses a date; shared starts stay available as a
     secondary action on that screen. */
  function showNewGame() {
    newGameTelemetrySeen = {};
    G.pending = { seed:freshSeed() };
    showBookmarks();
  }

  /* Shared starts are an advanced path behind the starting-date screen, so
     they do not add a decision to every ordinary new game. Errors show inline
     because toasts live on the hidden game screen. */
  function showSeedInput() {
    trackNewGameScreen('seed-dialog');
    let h = '<div class="gm-body-text"><p>' + FB.esc(FB.T(
      'Paste a shared start code to recreate every choice, or enter a world seed and choose the rest yourself.')) +
      '</p></div>' +
      '<input id="ng-seed" type="text" maxlength="128" placeholder="' +
      FB.esc(FB.T('Paste a start code or world seed')) + '">' +
      '<div id="ng-seed-err" class="hint"></div>' +
      '<div class="gm-list">' +
      '<button class="actionbtn" id="ng-seed-go">🔑 Use this seed</button>' +
      '</div>' +
      '<button class="btn" id="ng-cancel">Cancel</button>';
    FB.ui.openModal('Use a Seed or Start Code', h);
    $('ng-cancel').addEventListener('click', FB.ui.closeModal);
    function useSeed() {
      const r = parseSeedInput($('ng-seed').value);
      if (r.error) { $('ng-seed-err').textContent = FB.T(r.error); return; }
      if (r.scenario && !scenarioUnlocked(r.scenario)) {
        $('ng-seed-err').textContent = scenarioUnlockText(r.scenario, true);
        return;
      }
      FB.ui.closeModal();
      if (r.scenario) { // a full start code: straight to the pre-filled details
        G.pending = {
          seed:r.seed, bookmarkId:r.bookmarkId, scenario:r.scenario,
          provinceId:r.provinceId, sex:r.sex, name:r.name,
          familyPreset:r.familyPreset, settlementIdx:r.settlementIdx,
          culture:r.culture, religion:r.religion,
          communityProvinceId:r.provinceId
        };
        activatePendingBookmark(r.bookmarkId, function () {
          G.pending.settlementIdx = clampSettlementIdx(r.provinceId, r.settlementIdx);
          showChargen();
        });
      } else {
        G.pending = { seed: r.seed };
        showBookmarks();
      }
    }
    $('ng-seed-go').addEventListener('click', useSeed);
    $('ng-seed').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        /* closeModal restores the title-screen trigger's focus. Consume this
           key before that happens, or the same Enter can activate New Game
           again and reopen its dialog over character creation. */
        e.preventDefault();
        e.stopPropagation();
        useSeed();
      }
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
    trackNewGameScreen('starting-date');
    const box = $('bookmarklist');
    box.innerHTML = '';
    const bookmarks = FB.bookmarks(false);
    for (const bookmark of bookmarks) {
      const el = document.createElement('button');
      el.className = 'scencard';
      el.innerHTML = '<h3>' + FB.esc(FB.T('{season} {year}: {name}', {
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
    trackNewGameScreen('beginning', { start_bookmark:bookmark.id });
    $('ng-heading').textContent = FB.T('Choose Your Beginning in {year} AD', {
      year:bookmark.date.year
    });
    const box = $('scenariolist');
    box.innerHTML = '';
    for (const sc of FBDATA.startScenarios) {
      const el = document.createElement('button');
      const locked = !scenarioUnlocked(sc);
      el.type = 'button';
      el.className = 'scencard' + (locked ? ' locked' : '');
      if (locked) el.setAttribute('aria-disabled', 'true');
      el.innerHTML = '<h3>' + (locked ? '🔒 ' : '') +
        FB.esc(FB.dataText(null, null, 'scenario', sc.id, sc, 'name', {})) +
        '</h3><p>' +
        FB.esc(FB.dataText(null, null, 'scenario', sc.id, sc, 'desc', {})) +
        '</p>' + (locked
          ? '<p class="scenario-lock">' + FB.esc(scenarioUnlockText(sc, false)) + '</p>'
          : '');
      if (!locked) {
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
      }
      box.appendChild(el);
    }
    // observe mode: no province, no character — just a world to watch
    const obs = document.createElement('button');
    obs.className = 'scencard';
    obs.innerHTML = '<h3>' + FB.esc(FB.T('👁 Observe')) + '</h3><p>' +
      FB.esc(FB.T('Watch the world without a playable character or personal events.')) +
      '</p>';
    obs.addEventListener('click', function () { G.startObserve(); });
    box.appendChild(obs);
    FB.ui.showScreen('newgame');
  }

  /* birthplace picking is two stages on the same map screen: first a county,
     then — zoomed close enough that its settlements draw with emblems and
     name labels (SITE_Z_DETAIL in js/mapview.js is 12) — the settlement
     itself. Markers render from the compiled bookmark data, so no game state
     is needed for either stage. */
  const PICK_SETTLEMENT_ZOOM = 14;
  /* explicit stage: G.pending.provinceId survives into a started game, so it
     cannot speak for the picker on its own */
  G.pickStage = 'province';

  function showPickProv() {
    trackNewGameScreen('birthplace', {
      start_bookmark:G.pending && G.pending.bookmarkId,
      scenario:G.pending && G.pending.scenario && G.pending.scenario.id
    });
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
    FB.map.playerProv = null;
    /* returning via Back from character creation keeps the chosen county and
       resumes on the settlement stage, zoomed in on it */
    const chosen = G.pending && G.pending.provinceId
      ? FB.world.byId[G.pending.provinceId] : null;
    G.pickStage = chosen ? 'settlement' : 'province';
    if (chosen) {
      FB.map.select(chosen.id);
      FB.map.centerOn(chosen.id, PICK_SETTLEMENT_ZOOM);
    } else {
      FB.map.fitView();
      FB.map.select(null);
    }
    updatePickInfo();
  }

  G.pickProvince = function (pr) {
    if (!pr) return false;
    if (pr.wasteland) {
      FB.ui.toast('No one is born in {province}. Pick a settled land.', { province: pr.name });
      return false;
    }
    const sameCommunityCounty = G.pending.communityProvinceId === pr.id;
    G.pending.provinceId = pr.id;
    const preserved = sameCommunityCounty
      ? provinceCommunity(pr, G.pending.culture, G.pending.religion) : null;
    G.pending.culture = preserved ? preserved.culture : pr.culture;
    G.pending.religion = preserved ? preserved.religion : pr.religion;
    G.pending.communityProvinceId = pr.id;
    G.pending.settlementIdx = 0; // a new county restarts the birthplace pick
    G.pickStage = 'settlement';
    FB.map.select(pr.id);
    FB.map.centerOn(pr.id, PICK_SETTLEMENT_ZOOM);
    updatePickInfo();
    return true;
  };

  /* A settlement tap settles the birthplace only once its county is the chosen
     one; anything else falls through to pickProvince (so tapping a marker in
     another county just switches counties). Also the click target of the
     fallback settlement buttons in the pick info bar. */
  G.pickSettlement = function (site) {
    if (!G.pickMode || G.pickStage !== 'settlement') return false;
    if (!G.pending || !G.pending.provinceId) return false;
    if (!site || site.pid !== G.pending.provinceId) return false;
    G.pending.settlementIdx = site.index;
    G.pickMode = false;
    G.pickStage = 'province';
    document.body.classList.remove('picking');
    showChargen();
    return true;
  };

  /* Settlement slots never renumber, but a hand-typed start code can still
     overshoot what a county shows at its starting development — clamp rather
     than reject, so a generous code never becomes a different world. */
  function clampSettlementIdx(pid, idx) {
    const n = FB.settlementVisibleCount(null, pid);
    idx = idx | 0;
    return n > 0 ? FB.clamp(idx, 0, n - 1) : 0;
  }

  function updatePickInfo() {
    const el = $('pickinfo');
    if (!G.pending || !G.pending.provinceId) {
      el.textContent = FB.T('No province chosen yet. Tap the map or use Random Province.');
      $('btn-pick-random').textContent = FB.T('Random Province');
      return;
    }
    const pr = FB.world.byId[G.pending.provinceId];
    const realm = FBDATA.realms.filter(function (r) { return r.id === pr.realm0; })[0];
    const communities = FB.provinceCommunities(pr);
    el.innerHTML = '<div class="pick-location-title">' +
      FB.esc(FB.L(pr.name)) + '</div>' +
      '<div class="pick-location-meta">' +
      FB.esc(realm ? FB.L(realm.name) : FB.T('independent')) + ' · ' +
      FB.esc(FB.terrainName(pr.terrain)) + '</div>' +
      '<div class="pick-community">' + FB.esc(FB.T('Communities: {communities}', {
        communities:communities.map(communityLabel).join(' → ')
      })) + '</div>';
    /* One compact native picker replaces the settlement button row. The
       county seat is index 0 and every newly selected county resets to it. */
    const kindName = FB.ui._shared.settlementKindName;
    const setts = FB.settlementsOf(null, pr.id);
    const field = document.createElement('label');
    field.className = 'picksett-field';
    const label = document.createElement('span');
    label.textContent = FB.T('Birthplace');
    const select = document.createElement('select');
    select.id = 'pick-settlement';
    setts.forEach(function (st, i) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = st.name + ' (' + kindName(st.kind) + ')' +
        (i === 0 ? ' · ' + FB.T('County seat') : '');
      select.appendChild(option);
    });
    G.pending.settlementIdx = clampSettlementIdx(pr.id, G.pending.settlementIdx);
    select.value = String(G.pending.settlementIdx);
    select.addEventListener('change', function () {
      G.pending.settlementIdx = clampSettlementIdx(pr.id, parseInt(select.value, 10));
    });
    field.appendChild(label);
    field.appendChild(select);
    el.appendChild(field);
    $('btn-pick-random').textContent = FB.T('Continue');
  }

  function showChargen() {
    trackNewGameScreen('character', {
      start_bookmark:G.pending && G.pending.bookmarkId,
      scenario:G.pending && G.pending.scenario && G.pending.scenario.id
    });
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
    /* Culture and faith are chosen as one authored county community. The
       pending pair survives a trip back to the same county; pickProvince
       restores the principal pair when the county actually changes. */
    const pr = FB.world.byId[G.pending.provinceId];
    const communities = FB.provinceCommunities(pr);
    const currentCommunity = provinceCommunity(
      pr, G.pending.culture, G.pending.religion);
    G.pending.culture = currentCommunity.culture;
    G.pending.religion = currentCommunity.religion;
    const communityBox = $('cg-community');
    /* the community choice only exists when the county actually holds more
       than one — a single-community county has nothing to ask */
    communityBox.classList.toggle('hidden', communities.length < 2);
    if (communities.length > 1) {
      communityBox.setAttribute('role', 'radiogroup');
      communityBox.setAttribute('aria-label', FB.T('Choose your community'));
      communityBox.innerHTML = '<div class="hint">' +
        FB.esc(FB.T('Choose your community')) + '</div>';
      communities.forEach(function (community, index) {
        const label = document.createElement('label');
        label.className = 'radio cgfamily-card';
        label.innerHTML = '<input type="radio" name="cg-community" value="' + index + '">' +
          '<span><b>' + FB.esc(communityLabel(community)) + '</b></span>';
        communityBox.appendChild(label);
      });
      let wantedCommunity = 0;
      for (let ci = 0; ci < communities.length; ci++) {
        if (communities[ci].culture === currentCommunity.culture &&
            communities[ci].religion === currentCommunity.religion) {
          wantedCommunity = ci;
          break;
        }
      }
      communityBox.querySelector(
        'input[name=cg-community][value="' + wantedCommunity + '"]').checked = true;
      communityBox.querySelectorAll('input[name=cg-community]').forEach(function (radio) {
        radio.addEventListener('change', function () {
          const selected = communities[parseInt(radio.value, 10)] || communities[0];
          G.pending.culture = selected.culture;
          G.pending.religion = selected.religion;
          const selectedSex = document.querySelector('input[name=cg-sex]:checked').value;
          $('cg-name').value = FB.randomName(selected.culture, selectedSex);
          G.pending.name = null;
          updateCgSummary();
        });
      });
    } else {
      communityBox.innerHTML = '';
    }
    /* the starting-family preset picker, rebuilt per visit so a shared start
       code's preset (or a pick made before stepping Back) survives */
    const famBox = $('cg-family');
    famBox.innerHTML = '';
    for (const fp of FBDATA.familyPresets) {
      const label = document.createElement('label');
      label.className = 'radio cgfamily-card';
      label.innerHTML = '<input type="radio" name="cg-family" value="' + fp.id + '">' +
        '<span><b>' + FB.esc(FB.dataText(null, null, 'familyPreset', fp.id,
          fp, 'name', {})) + '</b> — ' +
        FB.esc(FB.dataText(null, null, 'familyPreset', fp.id, fp, 'diff', {})) +
        '<br><span class="hint">' +
        FB.esc(FB.dataText(null, null, 'familyPreset', fp.id, fp, 'desc', {})) +
        '</span></span>';
      famBox.appendChild(label);
    }
    const wantedPreset = familyPresetById(G.pending.familyPreset) ? G.pending.familyPreset : 'standard';
    document.querySelector('input[name=cg-family][value="' + wantedPreset + '"]').checked = true;
    famBox.querySelectorAll('input[name=cg-family]').forEach(function (r) {
      r.addEventListener('change', function () {
        G.pending.familyPreset = r.value;
        updateCgSummary();
      });
    });
    updateCgSummary();
    FB.ui.showScreen('chargen');
  }

  function selectedFamilyPreset() {
    const r = document.querySelector('input[name=cg-family]:checked');
    return (r && familyPresetById(r.value)) || familyPresetById('standard');
  }

  function selectedCommunity() {
    const pr = FB.world.byId[G.pending.provinceId];
    const communities = FB.provinceCommunities(pr);
    const radio = document.querySelector('input[name=cg-community]:checked');
    const index = radio ? parseInt(radio.value, 10) : -1;
    return communities[index] ||
      provinceCommunity(pr, G.pending.culture, G.pending.religion);
  }

  function updateCgSummary() {
    /* the bottom card holds only the start seed — the scenario, birthplace,
       and community already say themselves on the cards above */
    $('cg-summary').innerHTML = FB.esc(FB.T('🔑 World seed:')) + ' <b>' +
      FB.esc(G.pending.seed || '') + '</b> — ' +
      FB.esc(FB.T('once your story begins, the ☰ menu holds the full start code to share.'));
  }

  /* ================= new game ================= */
  let campaignStartPending = false;
  function lockCampaignStart(locked) {
    const screen = $('chargen');
    if (!screen) return;
    campaignStartPending = locked;
    screen.classList.toggle('start-pending', locked);
    screen.setAttribute('aria-busy', locked ? 'true' : 'false');
    screen.querySelectorAll('button, input, select').forEach(function (control) {
      if (locked) {
        if (!control.disabled) {
          control.disabled = true;
          control.setAttribute('data-start-lock', 'true');
        }
      } else if (control.getAttribute('data-start-lock') === 'true') {
        control.disabled = false;
        control.removeAttribute('data-start-lock');
      }
    });
  }

  /* The click must produce a paint before deterministic campaign creation and
     first-map setup occupy the main thread. G.start itself stays synchronous
     for seed tests and internal callers; only the player gesture takes this
     painted handoff. */
  function beginCampaignStart() {
    if (campaignStartPending) return;
    lockCampaignStart(true);
    requestAnimationFrame(function () {
      setTimeout(function () {
        try {
          G.start();
        } finally {
          lockCampaignStart(false);
        }
      }, 0);
    });
  }

  function startFlags(effects) {
    const out = {};
    for (const key in ((effects && effects.flags) || {})) {
      if (Object.prototype.hasOwnProperty.call(effects.flags, key)) {
        out[key] = effects.flags[key];
      }
    }
    return out;
  }

  function startLandPlots(effects, provinceId, settlementIdx) {
    const out = [];
    const count = effects && effects.landPlots ? effects.landPlots : 0;
    for (let i = 0; i < count; i++) {
      out.push({ provinceId:provinceId, settlement:settlementIdx });
    }
    return out;
  }

  function grantStartingItems(state, character, effects) {
    const entries = (effects && effects.items) || [];
    for (const entry of entries) {
      const pool = entry.pool && FBDATA.itemPools[entry.pool];
      const defId = entry.item || (pool && pool.length ? FB.pick(pool) : null);
      if (!defId) continue;
      const ref = FB.grantItem(state, defId,
        entry.quality ? { quality:entry.quality } : undefined);
      if (ref && entry.equip) FB.equipItem(state, character.id, entry.equip, ref);
    }
  }

  G.start = function () {
    G.observe = false;
    document.body.classList.remove('observing');
    const sc = G.pending && G.pending.scenario;
    if (!scenarioUnlocked(sc)) {
      showScenarios();
      return false;
    }
    const startEffects = sc.startEffects || {};
    // re-seed before politics and characters draw on the RNG, so anyone holding
    // the same seed and making the same picks gets this exact start
    const seedStr = (G.pending && G.pending.seed) || freshSeed();
    FB.seedRng(FB.hashSeed(seedStr));
    const bookmark = FB.activeBookmark;
    const start = {
      id:bookmark.id, year:bookmark.date.year,
      season:bookmark.date.season, day:bookmark.date.day
    };
    const provId = G.pending.provinceId;
    const pr = FB.world.byId[provId];
    const settIdx = clampSettlementIdx(provId, G.pending.settlementIdx);
    const community = selectedCommunity();
    const cultureId = community.culture;
    const religionId = community.religion;
    const sex = document.querySelector('input[name=cg-sex]:checked').value;
    const name = ($('cg-name').value || '').trim() || FB.randomName(cultureId, sex);
    const preset = selectedFamilyPreset();
    G.pending.name = null; G.pending.sex = null; // a shared code's pre-fill is spent
    G.pending.familyPreset = null;
    G.pending.settlementIdx = null;

    const state = {
      v: 2,
      seed: seedCode(seedStr, bookmark.id, sc.id, provId, sex, name, preset.id,
        settIdx, cultureId, religionId, pr),
      start: start,
      date: { year:start.year, season:start.season, day:start.day },
      turn: 0, generation: 1, slotDays: [],
      chars: {}, roles: {}, eventQueue: [], log: [], legends: [], flags: {}, buildings: {},
      realmTech: {}, realmTechMigration: 2, techSeeded:0,
      itemInstances: {}, itemNextId: 1,
      armies: [], armyDown: {}, armyDownSurvival: {}, armyDetachmentDown: {},
      alliances: [],
      faiths: {}, faithRelations: {}, faithNextId: 1,
      religiousHeads: {},
      religiousHeadVacancies: {},
      papacy: null,
      greatHolyWar: null,
      greatHolyWarHistory: {},
      modifiers: { county:{} },
      siblingCourtships: {},
      politics: null,
      player: {
        charId: null, houseFounderId:null,
        tier: sc.tier, profession: sc.profession, professionBack: null,
        gold: sc.gold, prestige: sc.prestige, piety: sc.piety,
        provinceId: provId, homeSettlement: settIdx, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        faithStandingMigration:0, realmStandingFaithBases:{},
        foreignPolicy: {},
        warService: startEffects.warService || 0,
        liegeGrants: 0, gentryGeneration: sc.tier >= 2 ? 0 : null,
        developmentBaselineMigration: 1,
        militaryCommand:null,
        lineDepth: 1,
        traitProgress: {},
        flags: startFlags(startEffects), cooldowns: {}, fired: {}, courtingId: null,
        courtshipTerms: null, suitorIds: null,
        socialAttention: {}, friendContacts: {}, socialGiftTurns: {}, realmGiftTurns: {},
        giftDeliveries: [],
        rivalContacts: {}, rivalPeace: {}, rivalry: null,
        provs: [], war: null, greatHolyWar: null, plot: null,
        aggressiveWars: [],
        focus: null, dead: false,
        localCouncil:null, castellany:null,
        capitalRelocation: null,
        protections: {},
        holdings: (startEffects.holdings || []).slice(),
        enterprises: [], retainers: [], householdStandards: {},
        educationPolicy: { focus:null, instructionMode:'manual', feeCap:0 },
        matchPolicy: {
          enabled:false, minStation:0, maxDowry:null,
          maxGold:null, maxPrestige:null
        },
        guildMonopolies: { incoming:null, outgoing:null },
        items: [], loadouts: {}, itemMigration: 1,
        landPlots: startLandPlots(startEffects, provId, settIdx),
        landPlotMigration: 1, manor: null, fabricatedClaim: null, auction: null, royalCompact: null
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
    if (FB.repairForts) FB.repairForts(state);
    FB.scriptedTick(state);
    scheduleSlots(state);

    const me = FB.makeCharacter(state, {
      name: name, sex: sex, culture: cultureId, religion: religionId,
      born: start.year - (preset.age || FBDATA.balance.startAge),
      quality: sc.tier >= 2 ? 2 : 0, traitsN: 2
    });
    me.health = 8;
    me.dyn = FB.dynastyName(cultureId, me.name, pr.name, me.sex);
    for (const skill in (startEffects.skills || {})) {
      if (Object.prototype.hasOwnProperty.call(startEffects.skills, skill)) {
        me.skills[skill] = Math.max(0, me.skills[skill] + startEffects.skills[skill]);
      }
    }
    state.player.charId = me.id;
    state.player.houseFounderId = me.id;
    FB.setCareer(state, me, sc.profession,
      startEffects.careerRank || 'journeyman');
    if (me.career && startEffects.careerExperience !== undefined) {
      me.career.experience = startEffects.careerExperience;
    }

    /* Issued kit is ordinary exact-instance gear. Exact definitions consume
       the historical item draws; a named pool adds one deliberate seeded pick. */
    grantStartingItems(state, me, startEffects);

    // parents — the first rung of the kin tree
    const dad = FB.makeCharacter(state, {
      sex: 'm', culture: cultureId, religion: religionId,
      born: me.born - FB.ri(20, 40), role: 'parent', quality: 1, dyn: me.dyn
    });
    const mom = FB.makeCharacter(state, {
      sex: 'f', culture: cultureId, religion: religionId,
      born: me.born - FB.ri(20, 34), role: 'parent'
    });
    dad.health = 8; mom.health = 8;
    dad.spouseId = mom.id; mom.spouseId = dad.id;
    dad.childrenIds.push(me.id); mom.childrenIds.push(me.id);
    me.fatherId = dad.id; me.motherId = mom.id;

    /* Patronymic starts record the father whose name each byname actually
       carries. The house id remains stable even though personal bynames vary. */
    if (FB.cultureOf(cultureId).dyn === 'patronym') {
      const granddad = FB.makeCharacter(state, {
        sex:'m', culture:cultureId, religion:religionId,
        born:dad.born - FB.ri(20, 40), role:'grandparent',
        quality:1, dyn:me.dyn, byname:''
      });
      const grandmom = FB.makeCharacter(state, {
        sex:'f', culture:cultureId, religion:religionId,
        born:dad.born - FB.ri(18, 34), role:'grandparent'
      });
      granddad.health = 8; grandmom.health = 8;
      granddad.spouseId = grandmom.id; grandmom.spouseId = granddad.id;
      granddad.childrenIds.push(dad.id); grandmom.childrenIds.push(dad.id);
      dad.fatherId = granddad.id; dad.motherId = grandmom.id;
      dad.byname = FB.patronym(granddad.name, dad.sex);
      me.byname = FB.patronym(dad.name, me.sex);
    }

    // siblings — a safety net of heirs
    const nSib = FB.ri(1, 2);
    for (let i = 0; i < nSib; i++) {
      const sib = FB.makeCharacter(state, {
        culture: cultureId, religion: religionId,
        born: me.born + (FB.ri(-6, 6) || 2), // never a same-year twin
        role: 'sibling', dyn: me.dyn,
        fatherId:dad.id, motherId:mom.id
      });
      sib.health = 8;
      sib.fatherId = dad.id; sib.motherId = mom.id;
      dad.childrenIds.push(sib.id); mom.childrenIds.push(sib.id);
    }

    /* A preset with a spouse shape adds its family here, in a fixed draw order
       after the shared kin. Standard and custom unmarried shapes add no draws,
       so every old standard code reproduces bit-for-bit. */
    if (preset.spouseAge) {
      const spouse = FB.makeCharacter(state, {
        sex: me.sex === 'm' ? 'f' : 'm',
        culture: cultureId, religion: religionId,
        born: me.born - FB.ri(preset.spouseAge[0], preset.spouseAge[1]),
        role: 'spouse'
      });
      spouse.health = 8;
      me.spouseId = spouse.id; spouse.spouseId = me.id;
      state.roles.spouse = spouse.id;
      /* no child predates either parent turning sixteen */
      const oldestChild = Math.max(1,
        Math.min(preset.age, start.year - spouse.born) - 16);
      const nKids = FB.ri(preset.children[0], preset.children[1]);
      for (let k = 0; k < nKids; k++) {
        const minChildAge = k === 0 ? Math.min(preset.eldestMin, oldestChild) : 1;
        const child = FB.makeCharacter(state, {
          culture: cultureId, religion: religionId,
          born: start.year - FB.ri(minChildAge, oldestChild),
          dyn: me.dyn, // children of the playable line carry the house name
          fatherId: me.sex === 'm' ? me.id : spouse.id,
          motherId: me.sex === 'm' ? spouse.id : me.id
        });
        child.health = 8;
        me.childrenIds.push(child.id); spouse.childrenIds.push(child.id);
      }
    }

    if (FB.ensurePapacyState) FB.ensurePapacyState(state);
    if (FB.ensurePopulationState) FB.ensurePopulationState(state);
    if (FB.ensureMarket) FB.ensureMarket(state);
    if (sc.tier === 0) {
      /* The integrated tenure sheet and lawful-freedom routes name the exact
         home authority from the first playable frame. Establish the bounded
         local lord/steward cast before tenure snapshots that authority. */
      if (FB.getRole) FB.getRole(state, 'lord', true);
      if (FB.ensureSerfTenure) FB.ensureSerfTenure(state, 'new_game');
    }

    if (sc.tier >= 3) {
      state.player.liege = (state.holder && state.holder[provId]) || state.owner[provId];
      state.player.liegeOp = 10;
    }
    if (FB.ensureFaithStandingBaselines) {
      FB.ensureFaithStandingBaselines(state);
    }
    if (FB.ensureAgency) FB.ensureAgency(state);
    if (FB.ensureIntrigue) FB.ensureIntrigue(state);
    if (FB.ensurePolitics) FB.ensurePolitics(state);
    if (FB.ensureInstitutions) FB.ensureInstitutions(state, { silent:true });
    state.player.focus = startEffects.focus || FB.defaultFocus(state);
    const firstPlayerOnboarding = !G.uiPrefs.tipsGrandfathered &&
      !G.uiPrefs.onboardingStarted;
    if (firstPlayerOnboarding) {
      G.uiPrefs.onboardingStarted = true;
      G.saveUiPrefs();
      state.player.flags.tutorial = 1; // offered once per browser profile
    }
    state.peakTitleData = FB.playerStatusTitleSnapshot
      ? FB.playerStatusTitleSnapshot(state) : FB.titleSnapshot(state);
    if (FB.notePlayerStatus) FB.notePlayerStatus(state, state.peakTitleData);
    G.paused = true;

    FB.ui.mapDirty();
    FB.map.playerProv = provId;
    FB.ui.showGame();
    FB.map.centerOn(provId, 2.0);
    FB.ui.refresh();
    FB.news(state, FB.msg('news.life.chronicle_begins',
      '📖 The chronicle of {dynasty} begins in {province}, {year} AD.',
      { dynasty: me.dyn, province: pr.name, year: state.date.year }));
    const introGroup = FB.religionOf(religionId).group;
    let introPath = 'intro';
    if (introGroup === 'muslim' && sc.intro_muslim) introPath = 'intro_muslim';
    else if (introGroup === 'christian' && sex === 'f' && sc.intro_f) {
      introPath = 'intro_f';
    } else if (introGroup !== 'christian' && sc.intro_other) {
      introPath = 'intro_other';
    }
    const introHint = !firstPlayerOnboarding ||
      (G.uiPrefs && G.uiPrefs.hideBeginnerHints)
      ? FB.T('The Deeds tab lists your daily focus and one-shot deeds.')
      : FB.T('Watch the Deeds tab: your First steps are listed there.');
    const serfIntroPointer = FB.activeSerfTenure &&
      FB.activeSerfTenure(state)
      ? '<p class="hint" data-serf-start-pointer>' + FB.esc(FB.T(
        "Your household's terms and routes to freedom are in Rank & Realm. First steps remain in Deeds.")) + '</p>'
      : '';
    FB.ui.openModal('Your Story Begins', '<div class="gm-body-text"><p>' +
      FB.esc(FB.dataText(state, state.player.charId, 'scenario', sc.id, sc, introPath, {})) +
      '</p><p class="hint">' +
      FB.esc(introHint) +
      '</p>' + serfIntroPointer +
      '</div><button class="btn primary" id="gm-go">' + FB.esc(FB.T('Begin')) + '</button>');
    $('gm-go').addEventListener('click', function () {
      FB.ui.closeModal();
      if (firstPlayerOnboarding && FB.ui.resumeFirstPlayerTip) {
        FB.ui.resumeFirstPlayerTip();
      }
    });
    FB.save.autosave();
    FB.save.warnIfBlocked();
    beginTelemetrySession('new-campaign');
    trackTelemetry('campaign-started', {
      entry_type:'new-campaign',
      scenario:sc.id,
      family_preset:preset.id,
      starting_location:provId,
      starting_culture:me.culture,
      starting_religion:me.religion
    });
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
      armies: [], armyDown: {}, armyDownSurvival: {}, armyDetachmentDown: {},
      alliances: [],
      faiths: {}, faithRelations: {}, faithNextId: 1,
      religiousHeads: {},
      religiousHeadVacancies: {},
      papacy: null,
      greatHolyWar: null,
      greatHolyWarHistory: {},
      modifiers: { county:{} },
      siblingCourtships: {},
      politics: null,
      player: {
        charId: null, tier: 0, profession: 'farmer', professionBack: null,
        gold: 0, prestige: 0, piety: 0,
        provinceId: home.id, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        faithStandingMigration:0, realmStandingFaithBases:{},
        warService: 0, liegeGrants: 0, gentryGeneration: null,
        developmentBaselineMigration: 1,
        militaryCommand:null,
        lineDepth: 1,
        traitProgress: {},
        flags: {}, cooldowns: {}, fired: {}, courtingId: null,
        courtshipTerms: null, suitorIds: null,
        socialAttention: {}, friendContacts: {}, socialGiftTurns: {}, realmGiftTurns: {},
        giftDeliveries: [],
        rivalContacts: {}, rivalPeace: {}, rivalry: null,
        provs: [], war: null, greatHolyWar: null, plot: null,
        aggressiveWars: [],
        focus: null, dead: false, holdings: [], retainers: [],
        localCouncil:null, castellany:null,
        capitalRelocation: null,
        protections: {},
        householdStandards: {},
        educationPolicy: { focus:null, instructionMode:'manual', feeCap:0 },
        matchPolicy: {
          enabled:false, minStation:0, maxDowry:null,
          maxGold:null, maxPrestige:null
        },
        guildMonopolies: { incoming:null, outgoing:null },
        items: [], loadouts: {}, itemMigration: 1,
        landPlots: [], landPlotMigration:1, manor:null, fabricatedClaim: null, auction: null, royalCompact: null
      },
      pregnant: null, peakTier: 0, peakTitleData: null,
      seasonMark: { gold: 0, prestige: 0, piety: 0 }, seasonNet: null
    };
    FB.state = state;
    FB.initPolitics(state);
    if (FB.repairForts) FB.repairForts(state);
    FB.scriptedTick(state);
    // a placeholder soul, never shown — some panels dereference it blindly
    const me = FB.makeCharacter(state, {
      name: FB.randomName(home.culture, 'm'), sex: 'm',
      culture: home.culture, religion: home.religion,
      born: start.year - 30, quality: 0, traitsN: 0
    });
    state.player.charId = me.id;
    if (FB.ensurePapacyState) FB.ensurePapacyState(state);
    if (FB.ensurePopulationState) FB.ensurePopulationState(state);
    if (FB.ensureMarket) FB.ensureMarket(state);
    if (FB.ensureFaithStandingBaselines) {
      FB.ensureFaithStandingBaselines(state);
    }

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
    beginTelemetrySession('observer-mode');
    trackTelemetry('observer-mode-started', { entry_type:'observer-mode' });
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

  /* Advance one day. opts.skipFocus: an instant deed filled this day instead;
     opts.liveTick: the natural clock may leave heavy panel DOM mounted;
     opts.deferUi: an active fast-forward owns the completion refresh.
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

    /* skipFocus means a player-chosen one-shot deed filled this day. This is
       the authoritative completion point for picker-backed deeds; direct
       deeds also stamp at execution so their feedback does not depend on the
       rest of the daily pass succeeding. */
    if (opts && opts.skipFocus && FB.noteDeedCompleted) {
      FB.noteDeedCompleted(s);
    }

    if (!G.observe) {
      if (!p.travel) {
        if (!(opts && opts.skipFocus)) FB.tickFocus(s);
        else FB.validateFocus(s);
      }
      FB.tickSocialAttention(s);
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
    if (FB.localGovernmentDay) FB.localGovernmentDay(s);
    FB.scriptedTick(s);
    if (FB.fortificationDay) FB.fortificationDay(s);
    if (FB.religiousHeadRecoveryTick) FB.religiousHeadRecoveryTick(s);
    if (FB.papacyDay) FB.papacyDay(s);
    if (FB.guildMonopolyTick) FB.guildMonopolyTick(s);
    if (FB.modifierTick) FB.modifierTick(s);
    if (FB.intrigueDay) FB.intrigueDay(s);
    if (FB.politicsDay) FB.politicsDay(s);

    /* observe mode: the calendar turns, the realms tick once a year, hosts
       march daily — and that is all. No focus, upkeep, mortality, births,
       events, or autosaves; nothing personal ever reaches the watcher. */
    if (G.observe) {
      if (seasonBoundary && FB.marketSeason) FB.marketSeason(s);
      if (seasonBoundary && FB.intrigueSeason) FB.intrigueSeason(s);
      if (seasonBoundary && FB.techSeason) FB.techSeason(s, false);
      if (seasonBoundary && newYear) FB.worldTick(s);
      FB.armyTick(s);
      if (FB.greatHolyWarTick) FB.greatHolyWarTick(s);
      s.eventQueue.length = 0;
      if (!(opts && opts.deferUi)) {
        FB.ui.refresh(opts && opts.liveTick ? { liveTick:true } : undefined);
      }
      return seasonBoundary ? 'season' : 'day';
    }

    if (FB.institutionsDay) FB.institutionsDay(s);
    if (FB.financeDay) FB.financeDay(s);

    if (seasonBoundary) {
      if (FB.intrigueSeason) FB.intrigueSeason(s);
      if (p.dead) return 'dead';
      if (FB.marketSeason) FB.marketSeason(s);
      const income = p.tier >= 3 ? FB.playerTax(s) : 0;
      const buildingUpkeep = p.tier >= 3
        ? FB.buildingBonus(s, 'upkeep') + (FB.fortUpkeep ? FB.fortUpkeep(s) : 0)
        : 0;
      const modifierUpkeep = FB.modifierUpkeep ? FB.modifierUpkeep(s, 'gold') : 0;
      FB.enterpriseList(s); // migrate legacy business holdings before either income path reads them
      /* Income is credited before necessities are settled. This lets family
         wages meet the table and leaves any unfunded share as hardship rather
         than silently discarding which obligation went unpaid. */
      p.gold += income - buildingUpkeep - modifierUpkeep +
        FB.holdingBonus(s, 'gold') + FB.landYield(s) + FB.itemBonus(s, 'gold') +
        (FB.positionBonus ? FB.positionBonus(s, 'gold') : 0);
      FB.livelihoodSeason(s);
      if (FB.marketSettleHouseholdNecessities) {
        FB.marketSettleHouseholdNecessities(s);
      } else p.gold -= Math.min(Math.max(0, p.gold), FB.householdUpkeep(s));
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
      if (FB.realmPolicySeason) FB.realmPolicySeason(s); // standing royal policy: piety trickle, settler development
      /* A raised host costs its live composition once per season, for both
         ordinary and great holy wars. Shattered/disbanded hosts return zero. */
      if (FB.playerHostUpkeepParts) {
        const hostUpkeep = FB.playerHostUpkeepParts(s);
        p.gold -= hostUpkeep.total;
      }
      if (FB.techSeason) FB.techSeason(s, G.auto.research);
      FB.playerWarTick(s);
      if (FB.devastationSeason) FB.devastationSeason(s);
      if (FB.greatHolyWarSeason) FB.greatHolyWarSeason(s);
      if (FB.sacredCustodySeason) FB.sacredCustodySeason(s);
      FB.tickForeignPolicy(s);
      const seasonEconomy = FB.financeSeason(s);
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
      if (newYear) FB.financeYear(s, seasonEconomy);
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

    if (FB.freedomDay) FB.freedomDay(s);
    if (FB.tenureDay) FB.tenureDay(s);
    if (FB.reconcileSerfStory) FB.reconcileSerfStory(s);
    if (FB.reconcileSerfNeighborConsequence) {
      FB.reconcileSerfNeighborConsequence(s);
    }
    const events = FB.pickDailyEvents(s);
    if (!(opts && opts.deferUi)) {
      FB.ui.refresh(opts && opts.liveTick ? { liveTick:true } : undefined);
    }
    if (events.length) {
      // runEvents reports whether a modal actually opened; autoresolved
      // events pass silently and the day keeps flowing
      if (FB.ui.runEvents(events)) return 'event';
      /* runEvents closes its queue through afterEvents, including the mortal
         and promotion checks. Do not repeat that whole post-event pass. */
      return p.dead ? 'dead' : (seasonBoundary ? 'season' : 'day');
    }
    G.afterEvents({
      syncRulers:seasonBoundary,
      liveTick:!!(opts && opts.liveTick),
      deferUi:!!(opts && opts.deferUi)
    });
    return p.dead ? 'dead' : (seasonBoundary ? 'season' : 'day');
  };

  /* Fast-forward until something happens: an event, a new season, or death.
     The simulation remains one authoritative day at a time, but a whole
     autoresolved season must not monopolize the browser's main thread. */
  const FAST_FORWARD_FRAME_BUDGET = 4;
  const FAST_FORWARD_MAX_DAYS_PER_FRAME = 2;
  G.fastForwarding = false;

  function notePlayerTimeStarted() {
    if (FB.state && FB.state.player && FB.state.player.flags && !G.observe) {
      FB.state.player.flags.tut_unpause = 1;
    }
  }

  G.skipAhead = function () {
    if (G.fastForwarding ||
        (FB.ui && FB.ui.coachmarkOpen && FB.ui.coachmarkOpen())) return;
    /* The button and F pause the ordinary ticker before entering this
       burst. Clear only that existing pause so a new pause raised
       by a coachmark remains distinguishable and can still stop the skip. */
    G.fastForwarding = true;
    G.paused = false;
    notePlayerTimeStarted();

    let daysLeft = 92;
    function finishFastForward() {
      G.fastForwarding = false;
      /* The burst already deferred every intermediate refresh. Ending it with
         setPaused() promoted that work into an exact panel rebuild, so a
         large data-driven Deeds catalogue could monopolize the first usable
         frame after the simulation had actually finished. The live refresh
         below updates the date, resources, controls, and Chronicle while
         retaining the same panel trees ordinary flowing time retains. */
      G.paused = true;
      if (FB.ui && FB.ui.fastForwardFinished) {
        FB.ui.fastForwardFinished({ liveTick:true });
      } else {
        if (FB.ui && FB.ui.refresh) FB.ui.refresh({ liveTick:true });
        if (FB.map && FB.map.request) FB.map.request();
      }
    }
    function runFastForwardChunk() {
      if (G.paused || !FB.state || FB.state.player.dead) {
        finishFastForward();
        return;
      }
      const now = window.performance && window.performance.now
        ? function () { return window.performance.now(); }
        : function () { return Date.now(); };
      const started = now();
      let daysThisFrame = 0;
      while (daysLeft > 0) {
        daysLeft--;
        daysThisFrame++;
        const r = G.passDay({ liveTick:true, deferUi:true });
        if (r !== 'day' || G.paused) {
          finishFastForward();
          return;
        }
        if (daysThisFrame >= FAST_FORWARD_MAX_DAYS_PER_FRAME ||
            now() - started >= FAST_FORWARD_FRAME_BUDGET) break;
      }
      if (daysLeft <= 0) {
        finishFastForward();
        return;
      }
      requestAnimationFrame(runFastForwardChunk);
    }
    requestAnimationFrame(runFastForwardChunk);
  };

  /* ---------- the flow of days: auto-tick with pause/unpause ----------
     Speed is adjustable (+/- keys or menu → Settings), persists as a
     browser-local UI preference, and defaults to the fastest step. */
  G.SPEEDS = [700, 500, 350, 230, 140]; // ms per day, slowest → fastest
  G.speedIdx = G.SPEEDS.length - 1;
  G.paused = true;
  G.observe = false; // New Game → 👁 Observe: watch a character-less world
  G.obsQuiet = false; //   …silence the world-news toasts while watching
  G.obsBare = false;  //   …hide the Land & Chronicle panel while watching
  G.ACTION_SHORTCUT_DEFAULTS = { q:'action:livelihoods' };
  G.MAIN_TEXT_COLOR_DEFAULT = '#f2eadb';
  G.HELPER_TEXT_COLOR_DEFAULT = '#c9b991';
  G.uiPrefs = {
    speedIdx:G.speedIdx,
    commitmentsCollapsed:false,
    workFiltersCollapsed:true,
    hideBeginnerHints:false,
    hideTips:false,
    tipsSeen:{},
    tipsGrandfathered:false,
    onboardingStarted:false,
    mainTextColor:G.MAIN_TEXT_COLOR_DEFAULT,
    helperTextColor:G.HELPER_TEXT_COLOR_DEFAULT,
    realmHighlightColor:'#e8dec4',
    realmHighlightOpacity:1,
    musicChoice:null,
    musicVolume:0.55,
    musicBackgroundPlayback:false,
    musicPreferred:{},
    musicRatings:{},
    musicOfflineBanks:{},
    musicOfflineFallback:null,
    musicOfflineAll:false,
    repeatDeedSectionHotkeys:false,
    actionBindings:{ q:'action:livelihoods' }
  };
  let storedTipsLayer = false;
  let storedOnboardingLayer = false;
  try {
    const storedUiPrefs = JSON.parse(localStorage.getItem('fb_ui') || 'null');
    if (storedUiPrefs && typeof storedUiPrefs === 'object') {
      if (typeof storedUiPrefs.speedIdx === 'number' &&
          isFinite(storedUiPrefs.speedIdx) &&
          Math.floor(storedUiPrefs.speedIdx) === storedUiPrefs.speedIdx &&
          storedUiPrefs.speedIdx >= 0 &&
          storedUiPrefs.speedIdx < G.SPEEDS.length) {
        G.speedIdx = storedUiPrefs.speedIdx;
        G.uiPrefs.speedIdx = storedUiPrefs.speedIdx;
      }
      G.uiPrefs.commitmentsCollapsed =
        Object.prototype.hasOwnProperty.call(
          storedUiPrefs, 'commitmentsCollapsed')
          ? !!storedUiPrefs.commitmentsCollapsed
          : !!storedUiPrefs.hideOngoingCommitments;
      G.uiPrefs.workFiltersCollapsed =
        Object.prototype.hasOwnProperty.call(
          storedUiPrefs, 'workFiltersCollapsed')
          ? !!storedUiPrefs.workFiltersCollapsed
          : true;
      G.uiPrefs.hideBeginnerHints = !!storedUiPrefs.hideBeginnerHints;
      G.uiPrefs.hideTips = !!storedUiPrefs.hideTips;
      if (storedUiPrefs.tipsSeen && typeof storedUiPrefs.tipsSeen === 'object') {
        G.uiPrefs.tipsSeen = storedUiPrefs.tipsSeen;
      }
      G.uiPrefs.tipsGrandfathered = !!storedUiPrefs.tipsGrandfathered;
      G.uiPrefs.onboardingStarted = !!storedUiPrefs.onboardingStarted;
      storedOnboardingLayer = Object.prototype.hasOwnProperty.call(
        storedUiPrefs, 'onboardingStarted');
      storedTipsLayer = Object.prototype.hasOwnProperty.call(
        storedUiPrefs, 'tipsSeen') ||
        Object.prototype.hasOwnProperty.call(storedUiPrefs, 'tipsGrandfathered');
      if (typeof storedUiPrefs.mainTextColor === 'string' &&
          /^#[0-9a-fA-F]{6}$/.test(storedUiPrefs.mainTextColor)) {
        G.uiPrefs.mainTextColor = storedUiPrefs.mainTextColor.toLowerCase();
      }
      if (typeof storedUiPrefs.helperTextColor === 'string' &&
          /^#[0-9a-fA-F]{6}$/.test(storedUiPrefs.helperTextColor)) {
        G.uiPrefs.helperTextColor = storedUiPrefs.helperTextColor.toLowerCase();
      }
      if (typeof storedUiPrefs.realmHighlightColor === 'string' &&
          /^#[0-9a-fA-F]{6}$/.test(storedUiPrefs.realmHighlightColor)) {
        G.uiPrefs.realmHighlightColor =
          storedUiPrefs.realmHighlightColor.toLowerCase();
      }
      if (typeof storedUiPrefs.realmHighlightOpacity === 'number' &&
          isFinite(storedUiPrefs.realmHighlightOpacity)) {
        G.uiPrefs.realmHighlightOpacity =
          FB.clamp(storedUiPrefs.realmHighlightOpacity, 0, 1);
      }
      G.uiPrefs.musicChoice = storedUiPrefs.musicChoice === 'on' ||
        storedUiPrefs.musicChoice === 'off' ? storedUiPrefs.musicChoice : null;
      if (typeof storedUiPrefs.musicVolume === 'number') {
        G.uiPrefs.musicVolume = FB.clamp(storedUiPrefs.musicVolume, 0, 1);
      }
      G.uiPrefs.musicBackgroundPlayback =
        !!storedUiPrefs.musicBackgroundPlayback;
      if (storedUiPrefs.musicPreferred &&
          typeof storedUiPrefs.musicPreferred === 'object') {
        G.uiPrefs.musicPreferred = storedUiPrefs.musicPreferred;
      }
      if (storedUiPrefs.musicRatings &&
          typeof storedUiPrefs.musicRatings === 'object') {
        G.uiPrefs.musicRatings = storedUiPrefs.musicRatings;
      }
      if (storedUiPrefs.musicOfflineBanks &&
          typeof storedUiPrefs.musicOfflineBanks === 'object') {
        G.uiPrefs.musicOfflineBanks = storedUiPrefs.musicOfflineBanks;
      }
      if (typeof storedUiPrefs.musicOfflineFallback === 'string') {
        G.uiPrefs.musicOfflineFallback = storedUiPrefs.musicOfflineFallback;
      }
      G.uiPrefs.musicOfflineAll = !!storedUiPrefs.musicOfflineAll;
      G.uiPrefs.repeatDeedSectionHotkeys =
        !!storedUiPrefs.repeatDeedSectionHotkeys;
      if (storedUiPrefs.actionBindings &&
          typeof storedUiPrefs.actionBindings === 'object') {
        G.uiPrefs.actionBindings = {};
        for (const key in storedUiPrefs.actionBindings) {
          const target = storedUiPrefs.actionBindings[key];
          if (/^[abgijopqtuwxyz]$/.test(key) &&
              typeof target === 'string' && target) {
            G.uiPrefs.actionBindings[key] = target;
          }
        }
      }
    }
  } catch (e) { /* keep defaults */ }
  /* First-time tips belong to first-time players: an install that already
     holds a save when the tips layer first initializes (an upgrade, not a
     fresh player) never starts the lessons. Once decided either way the
     stored tipsSeen/tipsGrandfathered keys keep this from re-deciding. */
  if (!storedTipsLayer && !G.uiPrefs.tipsGrandfathered) {
    try {
      if (FB.save && FB.save.hasAnySave && FB.save.hasAnySave()) {
        G.uiPrefs.tipsGrandfathered = true;
        G.uiPrefs.onboardingStarted = true;
      }
    } catch (e2) { /* storage probe failed: leave tips on */ }
  }
  if (!storedOnboardingLayer && !G.uiPrefs.onboardingStarted) {
    try {
      if (FB.save && FB.save.hasAnySave && FB.save.hasAnySave()) {
        G.uiPrefs.onboardingStarted = true;
      }
    } catch (e3) { /* storage probe failed: leave onboarding available */ }
  }
  G.saveUiPrefs = function () {
    try { localStorage.setItem('fb_ui', JSON.stringify(G.uiPrefs)); } catch (e) { /* private mode */ }
  };
  if ((!storedTipsLayer && G.uiPrefs.tipsGrandfathered) ||
      (!storedOnboardingLayer && G.uiPrefs.onboardingStarted)) {
    G.saveUiPrefs();
  }
  G.applyMainTextColor = function (color) {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      color = G.MAIN_TEXT_COLOR_DEFAULT;
    }
    color = color.toLowerCase();
    document.documentElement.style.setProperty('--main-text-color', color);
    return color;
  };
  G.setMainTextColor = function (color) {
    G.uiPrefs.mainTextColor = G.applyMainTextColor(color);
    G.saveUiPrefs();
    return G.uiPrefs.mainTextColor;
  };
  G.applyHelperTextColor = function (color) {
    if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      color = G.HELPER_TEXT_COLOR_DEFAULT;
    }
    color = color.toLowerCase();
    document.documentElement.style.setProperty('--helper-text-color', color);
    return color;
  };
  G.setHelperTextColor = function (color) {
    G.uiPrefs.helperTextColor = G.applyHelperTextColor(color);
    G.saveUiPrefs();
    return G.uiPrefs.helperTextColor;
  };
  G.uiPrefs.mainTextColor = G.applyMainTextColor(G.uiPrefs.mainTextColor);
  G.uiPrefs.helperTextColor = G.applyHelperTextColor(G.uiPrefs.helperTextColor);

  /* ---------- Tutorial: staged checklist tracks that teach the game ----------
     Offered only to the first campaign begun by a fresh browser profile
     (player.flags.tutorial is stamped at game start and follows an unfinished
     checklist through succession). Tracks run in order;
     the first eligible unfinished track shows in the Deeds tab. Steps flip
     from ordinary play — some read live state, some read one-time flags
     written at the action's choke point. FB.tutorialCheck runs from the
     coalesced UI refresh: pure state reads, no RNG, and each completion
     toasts once. Completing a track writes a chronicle line and queues the
     matching chapter of the scripted tutorial chain (data/events_tutorial.js);
     completing every eligible track retires the tutorial for this life. */
  const TUTORIAL_TRACKS = [
    { id:'first_steps', icon:'🌱', event:null,
      title:function () { return FB.T('First steps'); },
      note:function (s) {
        return FB.activeSerfTenure && FB.activeSerfTenure(s)
          ? FB.T('Home terms: Review your tenure and routes to freedom in Rank & Realm.')
          : '';
      },
      link:function (s) {
        return FB.activeSerfTenure && FB.activeSerfTenure(s)
          ? 'serf-tenure' : '';
      },
      steps:[
        { id:'deed',    label:function () {
          return FB.T('Complete a one-time deed (not a Daily Focus)');
        } },
        { id:'unpause', label:function () { return FB.T('Let the days flow'); } },
        { id:'event',   label:function () { return FB.T('Answer an event'); } }
      ] },
    { id:'family_legacy', icon:'👪', event:'tut_legacy',
      title:function () { return FB.T('Family & legacy'); },
      note:function (s) {
        const p = s.player;
        const flags = p.flags || {};
        const me = s.chars[p.charId];
        const spouses = me && FB.spousesSnapshot
          ? FB.spousesSnapshot(s, me) : (me && me.spouseId ? [me.spouseId] : []);
        if (me && spouses.length && FB.marriageDoctrine) {
          const doctrine = FB.marriageDoctrine(me.religion, s);
          const limit = doctrine.spouseLimit[me.sex === 'f' ? 'f' : 'm'];
          if (limit > 1) {
            return FB.T(
              'Your faith permits up to {count} spouses. Your first marriage completes this lesson; additional marriages are optional.', {
                count:limit
              });
          }
        }
        if (flags.match_refused) {
          const status = FB.instantStatus
            ? FB.instantStatus(s, 'seek_match') : null;
          if (status && status.shown && !status.can && status.reason) {
            return FB.translateKnown(status.reason);
          }
          return FB.T(
            'That proposal was refused. Seek another match when you are ready.');
        }
        return '';
      },
      steps:[
        { id:'kin_tab', label:function () { return FB.T('Meet your household in the Kin tab'); } },
        { id:'wed',     label:function () { return FB.T('Wed your first spouse'); } },
        { id:'heir',    label:function () { return FB.T('Welcome your first child'); } }
      ] },
    { id:'making_a_living', icon:'🌾', event:'tut_livelihood',
      title:function () { return FB.T('Making a living'); },
      // livelihoods and enterprises belong to the lower stations — landed
      // rulers (tier 3+) finish with the family track instead
      when:function (s) { return s.player.tier <= 2; },
      note:function (s) {
        const flags = s.player.flags || {};
        if (!flags.tut_successor_child && !flags.tut_successor_relative) {
          return '';
        }
        const me = s.chars[s.player.charId];
        const minor = me && FB.ageOf(me, s.date.year) < 16;
        if (flags.tut_successor_child) {
          return minor
            ? FB.T('You now play as the previous head’s child. Household progress carries over; adult deeds unlock at age 16.')
            : FB.T('You now play as the previous head’s child. Continue the household’s unfinished work.');
        }
        return minor
          ? FB.T('You now play as a young relative. Household progress carries over; adult deeds unlock at age 16.')
          : FB.T('You now play as a relative. Continue the household’s unfinished work.');
      },
      steps:[
        { id:'livelihood', label:function (s) {
          const flags = s.player.flags || {};
          const successor = flags.tut_successor_child ||
            flags.tut_successor_relative;
          const me = s.chars[s.player.charId];
          if (successor && me && FB.ageOf(me, s.date.year) < 16) {
            return FB.T('Come of age and take up a livelihood');
          }
          return successor
            ? FB.T('Continue or take up a livelihood')
            : FB.T('Take up a livelihood');
        } },
        { id:'enterprise', label:function (s) {
          const flags = s.player.flags || {};
          const successor = flags.tut_successor_child ||
            flags.tut_successor_relative;
          const me = s.chars[s.player.charId];
          if (successor && !(s.player.enterprises || []).length && me &&
              FB.ageOf(me, s.date.year) < 16) {
            return FB.T('Come of age and start an enterprise');
          }
          return successor
            ? FB.T('Start or continue a household enterprise')
            : FB.T('Start an enterprise');
        } },
        { id:'land', label:function (s) {
          const flags = s.player.flags || {};
          const successor = flags.tut_successor_child ||
            flags.tut_successor_relative;
          const me = s.chars[s.player.charId];
          const minor = successor && me && FB.ageOf(me, s.date.year) < 16;
          if (s.player.tier === 0) {
            return minor
              ? FB.T('Come of age, petition or buy freedom, then acquire land')
              : FB.T('Petition or buy freedom, then acquire your first land plot');
          }
          return minor
            ? FB.T('Come of age, then buy your first land plot')
            : FB.T('Buy your first land plot');
        } }
      ] }
  ];
  function tutorialStepDone(s, id) {
    const p = s.player, flags = p.flags || {};
    if (flags.tut_family_established &&
        (id === 'kin_tab' || id === 'wed' || id === 'heir')) return true;
    if (id === 'focus') return !!p.focus;
    if (id === 'unpause') return !!flags.tut_unpause;
    if (id === 'deed') {
      if (flags.tut_deed) return true;
      /* Repair tutorial lives created while modal-backed deeds spent their
         day without stamping tut_deed. A retained authored deed cooldown is
         durable evidence that the action was taken; keep this a pure read so
         tutorial status remains deterministic. */
      const cooldowns = p.cooldowns || {};
      for (const action of FB.instants || []) {
        if (Object.prototype.hasOwnProperty.call(cooldowns, action.id)) {
          return true;
        }
      }
      /* Some affected modal actions leave no authored cooldown. Do not strand
         a first-life checklist when every other outcome of the opening loop
         is already complete; at that point the lesson has done its job. */
      return p.startGold !== undefined && !!flags.tut_unpause &&
        !!flags.tut_event && p.gold > p.startGold;
    }
    if (id === 'event') return !!flags.tut_event;
    if (id === 'livelihood') {
      const me = s.chars[p.charId];
      const successor = flags.tut_successor_child ||
        flags.tut_successor_relative;
      if (successor && me && FB.ageOf(me, s.date.year) < 16) return false;
      return !!p.profession;
    }
    if (id === 'enterprise') return (p.enterprises || []).length > 0;
    if (id === 'land') return FB.landPlots(s).length > 0;
    if (id === 'kin_tab') return !!flags.tut_kin_tab;
    if (id === 'wed' || id === 'heir') {
      const me = s.chars[p.charId];
      if (!me) return false;
      const spouses = FB.spousesSnapshot
        ? FB.spousesSnapshot(s, me) : (me.spouseId ? [me.spouseId] : []);
      return id === 'wed' ? spouses.length > 0
        : !!(me.childrenIds && me.childrenIds.length);
    }
    return false;
  }
  FB.tutorialActive = function (s) {
    return !!(s && s.player && s.player.flags && s.player.flags.tutorial &&
      !s.player.flags.tutorial_done);
  };
  /* a "tutorial life" is one the checklist was offered to, finished or not —
     the wider beginner-guidance layer (panel intros, tab nudges) keys off it */
  FB.tutorialLife = function (s) {
    return !!(s && s.player && s.player.flags &&
      (s.player.flags.tutorial || s.player.flags.tutorial_done));
  };
  FB.serfOnboardingState = function (s) {
    s = s || FB.state;
    const flags = s && s.player && s.player.flags || {};
    return {
      active:!!(s && FB.activeSerfTenure && FB.activeSerfTenure(s)),
      tutorial:!!(s && FB.tutorialActive && FB.tutorialActive(s)),
      firstStepsDone:!!flags.tut_track_first_steps,
      rankRealmSeen:!!flags.hint_serf_tenure,
      freedomRoutesSeen:!!flags.hint_serf_freedom_routes,
      firstDutySeen:!!flags.hint_serf_first_duty,
      offerTermsSeen:!!flags.hint_serf_offer_terms,
      lawfulFreedomSeen:!!flags.hint_serf_freed
    };
  };
  FB.noteDeedCompleted = function (s, id) {
    if (G.observe || !FB.tutorialLife(s)) return false;
    s.player.flags = s.player.flags || {};
    s.player.flags.tut_deed = 1;
    if (id === 'poach') s.player.flags.tut_poach = 1;
    return true;
  };
  function tutorialTrackStatus(s, track) {
    const steps = [];
    let done = 0;
    for (const step of track.steps) {
      const isDone = tutorialStepDone(s, step.id);
      if (isDone) done++;
      steps.push({ id:step.id, label:step.label(s), done:isDone });
    }
    return { track:{ id:track.id, icon:track.icon, title:track.title(),
        note:track.note ? track.note(s) : '',
        link:track.link ? track.link(s) : '' },
      steps:steps, done:done, total:track.steps.length };
  }
  FB.tutorialStatus = function (s) {
    const flags = (s.player && s.player.flags) || {};
    for (const track of TUTORIAL_TRACKS) {
      if (track.when && !track.when(s)) continue;
      if (flags['tut_track_' + track.id]) continue;
      const status = tutorialTrackStatus(s, track);
      if (status.done < status.total) return status;
    }
    return null; // every eligible track is finished
  };
  FB.tutorialCheck = function (s) {
    if (!FB.tutorialActive(s)) return;
    const hidden = !!(G.uiPrefs && G.uiPrefs.hideBeginnerHints);
    const flags = s.player.flags;
    // chapter one of the scripted chain, a couple of days into the life
    if (!flags.tut_ev_welcome && s.turn >= 2) {
      flags.tut_ev_welcome = 1;
      if (!hidden) FB.queueEvent(s, 'tut_welcome', {});
    }
    let allDone = true;
    for (const track of TUTORIAL_TRACKS) {
      if (track.when && !track.when(s)) continue;
      /* Tracks are instructional stages, not merely a display order. Do not
         toast, flag, or launch a later chapter because its live-state goal
         happened early; it becomes guidance only after the prior track. */
      if (track.id === 'family_legacy' &&
          !flags.tut_track_first_steps) {
        allDone = false;
        continue;
      }
      if (track.id === 'making_a_living' &&
          !flags.tut_track_family_legacy) {
        allDone = false;
        continue;
      }
      /* A completed chapter belongs to the household's tutorial history.
         Do not reopen Family & legacy when its child later becomes the
         unmarried protagonist, or repeat any earlier completion feedback. */
      if (flags['tut_track_' + track.id]) continue;
      if (track.id === 'family_legacy' && flags.tut_track_first_steps &&
          !flags.tut_track_family_legacy &&
          !flags.tut_family_guidance_started &&
          !flags.tut_family_established) {
        const me = s.chars[s.player.charId];
        const spouses = me && FB.spousesSnapshot
          ? FB.spousesSnapshot(s, me) : (me && me.spouseId ? [me.spouseId] : []);
        if (me && spouses.length) {
          /* A household already established before this track becomes active
             needs no courtship tutorial. Complete the whole chapter without
             inventing a child record or flashing three synthetic toasts. */
          flags.tut_family_established = 1;
          flags.tut_kin_tab = 1;
          flags.tut_seen_kin_tab = 1;
          flags.tut_seen_wed = 1;
          flags.tut_seen_heir = 1;
        } else {
          flags.tut_family_guidance_started = 1;
        }
      }
      const status = tutorialTrackStatus(s, track);
      for (const step of status.steps) {
        if (!step.done || flags['tut_seen_' + step.id]) continue;
        flags['tut_seen_' + step.id] = 1; // seen marks survive a hints-off phase
        if (!hidden && FB.ui && FB.ui.toast) {
          FB.ui.toast('{track} {done}/{total}: {label}', {
            track:status.track.title, done:status.done,
            total:status.total, label:step.label
          });
        }
        if (step.id === 'enterprise' && FB.ui &&
            FB.ui.resumeMakingLivingTips) {
          FB.ui.resumeMakingLivingTips();
        }
      }
      if (status.done < status.total) { allDone = false; continue; }
      flags['tut_track_' + track.id] = 1;
      if (track.id === 'first_steps' && FB.ui &&
          FB.ui.resumePostFirstStepsTips) {
        FB.ui.resumePostFirstStepsTips();
      }
      if (track.id === 'family_legacy' && FB.ui &&
          FB.ui.resumeMakingLivingTips) {
        FB.ui.resumeMakingLivingTips();
      }
      const autoCompletedFamily = track.id === 'family_legacy' &&
        !!flags.tut_family_established;
      if (track.event && !hidden && !autoCompletedFamily) {
        FB.queueEvent(s, track.event, {}); // scripted chain chapter
      }
      if (!hidden && !autoCompletedFamily) {
        FB.news(s, FB.msg('news.tutorial.track_done',
          '{icon} {track} — the lessons take root.', {
            icon:track.icon, track:track.title()
          }));
      }
    }
    if (FB.ui && FB.ui.resumeFamilyLegacyTips) {
      FB.ui.resumeFamilyLegacyTips();
    }
    if (!allDone) return;
    flags.tutorial_done = 1;
    delete flags.tutorial;
    if (hidden) return;
    // the news line both toasts (via FB.fx) and lands in the chronicle
    FB.news(s, FB.msg('news.tutorial.all_done',
      '🌱 The first lessons are behind you — the chronicle is yours to write.', {}));
  };

  G.setPaused = function (v) {
    G.paused = !!v;
    if (!v) notePlayerTimeStarted(); // First steps: let the days flow
    if (FB.state && FB.ui && FB.ui.refresh) FB.ui.refresh();
  };
  G.togglePause = function () { G.setPaused(!G.paused); };

  let tickTimer = null;
  function startTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      if (G.paused || G.fastForwarding || !FB.state ||
          FB.state.player.dead || G.pickMode) return;
      if (FB.ui.eventsBusy()) return; // an event awaits your choice
      if (!$('genmodal').classList.contains('hidden')) return; // a dialog is open
      if (document.hidden) return;
      G.passDay({ liveTick:true });
    }, G.SPEEDS[G.speedIdx]);
  }
  G.setSpeed = function (d) {
    G.speedIdx = FB.clamp(G.speedIdx + d, 0, G.SPEEDS.length - 1);
    G.uiPrefs.speedIdx = G.speedIdx;
    G.saveUiPrefs();
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
    // (flush: autosave's storage write is deferred now, and this page may
    // never run another timer)
    FB.save.autosave();
    if (FB.save.flushPending) FB.save.flushPending();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseForBackground();
  });
  /* phones: switching apps, the app drawer, or a call overlay can blur the
     page without firing visibilitychange — pause so days don't run unseen */
  window.addEventListener('blur', function () {
    if (FB.isSmallScreen()) pauseForBackground();
  });

  let promotionCheckState = null;
  let promotionCheckRealmRevision = -1;
  let promotionCheckSignature = '';

  function promotionSignature(s) {
    const p = s.player;
    return [p.charId, p.tier, p.liege || '', p.provinceId || '',
      (p.provs || []).join('|')].join(':');
  }

  function checkPromotionsWhenChanged(s, force) {
    const revision = FB.realmStateRevision
      ? FB.realmStateRevision() : s.turn;
    const signature = promotionSignature(s);
    if (!force && !s.player.titleLapse && promotionCheckState === s &&
        promotionCheckRealmRevision === revision &&
        promotionCheckSignature === signature) return;
    FB.checkTierPromotions(s);
    promotionCheckState = s;
    promotionCheckRealmRevision = FB.realmStateRevision
      ? FB.realmStateRevision() : s.turn;
    promotionCheckSignature = promotionSignature(s);
  }

  G.afterEvents = function (options) {
    const s = FB.state;
    if (!s || s.player.dead) return;
    options = options || {};
    if (options.syncRulers && FB.syncMaterializedRealmRulers) {
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
    checkPromotionsWhenChanged(s, !!options.forcePromotionCheck);
    if (!options.deferUi) {
      FB.ui.refresh(options.liveTick ? { liveTick:true } : undefined);
    }
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
    if (me.betrothedId && !FB.spouseOf(s, me) &&
        !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, me.id))) {
      const b = s.chars[me.betrothedId];
      if (!b || b.dead) { me.betrothedId = null; }
      else if (FB.ageOf(me, year) >= 16 && FB.ageOf(b, year) >= 16 &&
          !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, b.id))) {
        me.betrothedId = null; b.betrothedId = null;
        delete b.dowryAsk; delete b.dowryDue; // settled between the houses long ago
        p.courtingId = b.id;
        FB.doMarry(s, { settleDowry:false });
        FB.news(s, FB.msg('news.life.pledged_wedding',
          '💒 You wed {name}, as your late parent pledged.', { name: b.name }));
      }
    }

    // the assistant may sound out eligible descendants, but never pledges them
    if (FB.recommendDescendantMatches) FB.recommendDescendantMatches(s);

    // the wider family weds, bears children, and is mourned
    kinLifeTick(s);
    const familyLinks = FB.familyLinksSnapshot
      ? FB.familyLinksSnapshot(s) : null;
    const kinRel = familyLinks ? familyLinks.kinById : FB.kinOf(s).byId;

    // player mortality (curve scaled by the balance knob, 0.012 = as-authored)
    const mortScale = (FBDATA.balance.mortalityBase || 0.012) / 0.012;
    const standardMortality = FB.householdStandardEffect ?
      FB.householdStandardEffect(s, 'mortality') : 0;
    const medicalProtection = FB.householdMedicalProtection ?
      FB.householdMedicalProtection(s) : 0;
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
    if (!s.player.travel) q -= medicalProtection;
    if (!s.player.travel && FB.marketMortalityPressure) {
      q += FB.marketMortalityPressure(s);
    }
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
      /* The same exemption covers the rest of a court. A consort or heir the
         player has no tie to is aged and killed by tickRoyalFamily, which also
         compacts the record; one the player can reach stays here, where the
         death is reported. The two conditions are exact complements, so no
         court character is rolled twice and none is immortal. */
      if (FB.isCourtCharacter && FB.isCourtCharacter(s, c) &&
          !FB.courtRecordRetained(s, c, kinRel)) continue;
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
      if (medicalProtection && FB.isHouseholdCharacter(s, c.id)) {
        cq -= medicalProtection;
      }
      if (FB.marketMortalityPressure && FB.isHouseholdCharacter(s, c.id) &&
          (!FB.characterResidence || FB.characterResidence(s, c) === p.provinceId)) {
        cq += FB.marketMortalityPressure(s);
      }
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
        /* A royal whose realm has since died reaches this loop rather than
           tickRoyalFamily, so the record compacts from here. Read retention
           BEFORE the death: FB.killChar severs the very links the predicate
           consults, and a spouse checked afterwards reads as a stranger. */
        const compactRoyal = !!(c.royalLine && FB.courtRecordRetained &&
          !FB.courtRecordRetained(s, c, kinRel));
        FB.killChar(s, c, { familyLinks:familyLinks });
        if (compactRoyal && FB.compactRoyalRecordOnDeath) {
          FB.compactRoyalRecordOnDeath(s, c, {
            retentionChecked:true,
            kinById:kinRel
          });
        }
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
    const standingRealms = p.liegeOps ? Object.keys(p.liegeOps) : [];
    if (p.liege && standingRealms.indexOf(p.liege) < 0) {
      standingRealms.push(p.liege);
    }
    for (const rid of standingRealms) {
      const standing = FB.standingOf(s, { kind:'realm', id:rid });
      const settled = Math.round(standing * 0.9);
      FB.adjustStanding(s, { kind:'realm', id:rid },
        settled - standing, 'time:annual_drift');
    }
    if (FB.councilYearly) FB.councilYearly(s); // crown authority settles back toward custom
    if (FB.politicsYearly) FB.politicsYearly(s);
    if (FB.parliamentYearly) FB.parliamentYearly(s); // the liege may summon the estates to sit
    if (FB.institutionsYearly) FB.institutionsYearly(s);
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
    /* Fail-closed backstop for the localStorage quota: family records are never
       deleted (the tree is the product), so past familyMaxChars the wider
       family stops growing — no new kinspouses, no new babies. The automatic
       counterpart of p.flags.noChildren's "the house is full enough". Sealed
       betrothals below still wed: they join two existing records. */
    const familyFull = FB.familySize(s) >=
      (FBDATA.balance.familyMaxChars !== undefined ? FBDATA.balance.familyMaxChars : 4000);
    const kin = FB.kinOf(s);
    const all = [];
    for (const g of ['parents', 'grandparents', 'siblings', 'children', 'grandchildren',
      'niecesNephews', 'unclesAunts', 'cousins']) {
      for (const e of kin[g]) all.push(e);
    }
    for (const e of all) {
      const k = e.c;
      if (k.dead || k.id === s.player.charId) continue;
      if (FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, k.id)) continue;
      const age = FB.ageOf(k, year);
      if (age < 16 || age > 55) continue;
      const close = ['Son', 'Daughter', 'Grandson', 'Granddaughter',
        'Brother', 'Sister'].indexOf(e.rel) >= 0;
      let sp = FB.spouseOf(s, k);
      // a sealed betrothal weds as soon as both are of age — before chance
      // gets a say
      if (!sp && k.betrothedId) {
        const b = s.chars[k.betrothedId];
        if (b && !b.dead && FB.ageOf(b, year) >= 16 &&
            !(FB.intrigueCaptivityOf && FB.intrigueCaptivityOf(s, b.id))) {
          FB.doKinWedding(s, k, b);
          sp = b;
        } else if (!b || b.dead) {
          // the player's own death bypasses killChar, which would have cut
          // this bond — a stale pledge must not bar remarriage forever
          k.betrothedId = null;
        }
      } else if (!sp && !familyFull && age <= 40 && FB.chance(FBDATA.balance.kinMarryChance)) {
        FB.discardMatches(s, k, null); // the sounded-out families are passed over
        sp = FB.makeCharacter(s, {
          sex: k.sex === 'm' ? 'f' : 'm',
          culture: k.culture, religion: k.religion,
          born: year - FB.clamp(age + FB.ri(-6, 4), 16, 45),
          role: 'kinspouse'
        });
        sp.health = 8;
        /* A managed kinsman (descendant or resident unwed sibling)
           establishing a household through the unscripted yearly match
           leaves work and equipment assignments behind, just as a pledged
           wedding does through FB.doKinWedding. */
        if (FB.unassignEnterpriseWorker) FB.unassignEnterpriseWorker(s, k.id);
        if (FB.clearLoadout) FB.clearLoadout(s, k.id);
        k.spouseId = sp.id; sp.spouseId = k.id;
        FB.touchFamily();
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
      /* clamp: stacked fertility multipliers must stay a probability, never a
         certainty — an extreme trait means very fertile, not 29 births per couple */
      if (!familyFull && FB.chance(Math.min(fert, FBDATA.balance.kinConceiveCap || 0.75))) {
        const baby = FB.makeCharacter(s, {
          culture: k.culture, religion: k.religion, born: year,
          traits: FB.inheritTraits(father, mother), traitsN: 0,
          fatherId: father.id, motherId: mother.id,
          dyn: k.sex === 'm' ? (k.dyn || me.dyn) : sp.dyn || null
        });
        baby.health = 7;
        if (FB.applyCloseKinBirthRisk) {
          FB.applyCloseKinBirthRisk(s, baby, father, mother);
        }
        k.childrenIds.push(baby.id); sp.childrenIds.push(baby.id);
        FB.touchFamily();
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
        if (FB.applyCloseKinBirthRisk) {
          FB.applyCloseKinBirthRisk(s, baby, father, mother);
        }
        const parents = [father, mother];
        for (const parent of parents) {
          if (parent && parent.childrenIds.indexOf(baby.id) < 0) {
            parent.childrenIds.push(baby.id);
          }
        }
        FB.touchFamily();
        if (FB.registerRoyalBirth) FB.registerRoyalBirth(s, baby, father, mother);
        FB.queueEvent(s, 'child_born_flavor', { childId:baby.id });
        if (FB.ui && FB.ui.maybeTip) {
          FB.ui.maybeTip('first-heir',
            '💡 A child of the house! Heirs carry the chronicle forward; as they grow, their education is set from the Kin tab.',
            '#lefttabs .tab[data-tab="family"]');
        }
      }
      return;
    }
    if (p.flags.noChildren) return; // the house is full enough — no new conceptions
    // Every spouse pairing may conceive (one household pregnancy at a time).
    // The all-characters scan runs only when this faith permits several spouses.
    const marriage = FB.marriageDoctrine(me.religion, s);
    const mates = marriage.spouseLimit[me.sex === 'f' ? 'f' : 'm'] <= 1
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
      const beginnerHeirPending = FB.tutorialActive(s) &&
        p.flags.tut_family_guidance_started &&
        !p.flags.tut_track_family_legacy &&
        !(me.childrenIds && me.childrenIds.length);
      let tutorialConceptionDue = false;
      if (beginnerHeirPending && fert > 0) {
        const tutorialChance = Number(
          FBDATA.balance.tutorialChildChance) || 0;
        if (tutorialChance > 0) {
          fert = Math.max(fert, tutorialChance / 90);
        }
        const configuredGrace = Number(
          FBDATA.balance.tutorialConceptionPityDays);
        const graceDays = isFinite(configuredGrace)
          ? Math.max(0, Math.floor(configuredGrace)) : 90;
        const tutorialMarriageTurn =
          p.flags.tut_family_marriage_char_id === me.id &&
          isFinite(Number(p.flags.tut_family_married_at))
            ? Number(p.flags.tut_family_married_at) : p.marriedAt;
        tutorialConceptionDue = tutorialMarriageTurn !== undefined &&
          s.turn - tutorialMarriageTurn >= graceDays;
      }
      if (tutorialConceptionDue || FB.chance(fert)) {
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
  FB.childIdentityPreview = function (s, familyParent, spouse, playableLine) {
    const me = s && s.player && s.chars[s.player.charId];
    const source = playableLine ? me : familyParent;
    const father = familyParent && familyParent.sex === 'm'
      ? familyParent : spouse;
    return {
      culture:source && source.culture,
      cultureParentId:source && source.id,
      religion:source && source.religion,
      religionParentId:source && source.id,
      dynasty:playableLine
        ? (source && source.dyn) : (father && father.dyn || null),
      dynastyParentId:playableLine
        ? (source && source.id) : (father && father.id || null),
      playableLine:!!playableLine
    };
  };

  /* The review is the single source for both the playable successor list and
     the explanations shown beside relatives who cannot currently inherit. */
  FB.heirReview = function (s) {
    const me = s.chars[s.player.charId];
    const rows = [], seen = {};
    function add(c, eligible, code, group) {
      if (!c || seen[c.id]) return;
      seen[c.id] = true;
      rows.push({
        character:c,
        eligible:!!eligible,
        code:code,
        group:group
      });
    }
    function ordered(list) {
      const live = list.filter(function (c) { return c && !c.dead; });
      return live.filter(function (c) { return c.sex === 'm'; })
        .sort(function (a, b) { return a.born - b.born; })
        .concat(live.filter(function (c) { return c.sex === 'f'; })
          .sort(function (a, b) { return a.born - b.born; }));
    }

    const kids = me.childrenIds.map(function (id) { return s.chars[id]; });
    const livingKids = ordered(kids);
    for (const child of livingKids) add(child, true, 'child', 'children');
    for (const child of kids) {
      if (child && child.dead) add(child, false, 'dead', 'children');
    }
    const spouse = FB.spouseOf(s, me);
    if (spouse) add(spouse, false, 'spouse', 'household');

    if (livingKids.length) {
      // Wider relatives stay visible for explanation, but living children
      // keep every more distant branch out of the current successor list.
      const kin = FB.kinOf(s);
      const groups = [kin.grandchildren, kin.siblings, kin.niecesNephews, kin.unclesAunts, kin.cousins];
      for (const group of groups) {
        for (const entry of group) {
          const c = entry.c;
          add(c, false, c.dead ? 'dead' :
            (c.dyn !== me.dyn ? 'different_house' : 'closer_children'),
          entry.rel);
        }
      }
    } else {
      const kin = FB.kinOf(s);
      const groups = [
        { list:kin.grandchildren, name:'grandchildren' },
        { list:kin.siblings, name:'siblings' },
        { list:kin.niecesNephews, name:'nieces_nephews' },
        { list:kin.unclesAunts, name:'uncles_aunts' },
        { list:kin.cousins, name:'cousins' }
      ];
      for (const group of groups) {
        const eligible = ordered(group.list.map(function (entry) {
          const c = entry.c;
          return c && c.dyn === me.dyn ? c : null;
        }));
        for (const c of eligible) add(c, true, group.name, group.name);
        for (const entry of group.list) {
          const c = entry.c;
          if (!c || seen[c.id]) continue;
          add(c, false, c.dead ? 'dead' : 'different_house', group.name);
        }
      }
    }
    const nid = s.player.namedHeirId;
    if (nid) {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].character.id === nid && rows[i].eligible) {
          const named = rows.splice(i, 1)[0];
          rows.unshift(named);
          break;
        }
      }
    }
    return rows;
  };

  /* Eligible heirs in order: named heir first, then sons, daughters, and the
     wider same-house branches when no living child survives. */
  FB.heirsOf = function (s) {
    return FB.heirReview(s).filter(function (row) {
      return row.eligible;
    }).map(function (row) {
      return row.character;
    });
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
    const telemetryEntryType = telemetrySession ?
      telemetrySession.entryType : 'unknown';
    const activeSeconds = telemetryPulse();
    const titleDataAtDeath = FB.titleSnapshot(s);
    if (FB.endLocalCouncil) FB.endLocalCouncil(s, 'death', true);
    if (FB.endCastellany) FB.endCastellany(s, 'death', true);
    if (FB.intrigueCharacterDied) FB.intrigueCharacterDied(s, me);
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
    const heirs = FB.heirsOf(s).slice(0, 4);
    const deathTelemetry = {
      entry_type:telemetryEntryType,
      active_seconds:activeSeconds,
      lifespan_years:Math.max(0, s.date.year - me.born)
    };
    if (heirs.length) {
      trackTelemetry('player-life-ended', deathTelemetry);
    } else {
      endTelemetrySession();
      deathTelemetry.campaign_duration_years = FB.campaignYears(s);
      deathTelemetry.peak_player_tier = Number(s.peakTier) || 0;
      trackTelemetry('campaign-ended-no-heir', deathTelemetry);
    }
    FB.ui.showDeath(heirs, causeText);
  };

  /* the chronicle keeps one entry per life the player lived; the end screen
     reads this roll. Saves from before the roll existed grow it at the
     first death after they load. */
  function recordLegend(s, me, causeMsg, causeText, provenance, titleData) {
    if (!s.legends) s.legends = [];
    if (FB.noteCharacterStatus) {
      FB.noteCharacterStatus(s, me, s.player.tier,
        titleData || FB.playerStatusTitleSnapshot(s));
    }
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
    if (FB.notePlayerStatus) FB.notePlayerStatus(s);
    const successorIsChild = (old.childrenIds || []).indexOf(heir.id) >= 0;
    const tutorialCarry = FB.tutorialActive(s) ? {} : null;
    if (tutorialCarry) {
      for (const key in p.flags) {
        if (key === 'tutorial' || key.indexOf('tut_') === 0) {
          tutorialCarry[key] = p.flags[key];
        }
      }
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
    /* The saga counter advances on every succession, but the house's line
       depth only advances when the heir is a genuinely later generation.
       Gentry establishment compares against this, so a sibling or cousin of
       the founder's own generation inheriting a newly gentle house does not
       count as its heir generation. Legacy saves holding a saga-generation
       gentry number keep the old rule and never mix the two scales. */
    if (p.lineDepth !== undefined ||
        p.gentryGeneration === null || p.gentryGeneration === undefined) {
      const oldDepth = FB.lineDepthOf ? FB.lineDepthOf(s, old) : 1;
      let heirDepth;
      if (!heir.fatherId && !heir.motherId &&
          (old.childrenIds || []).indexOf(heir.id) >= 0) {
        // an adopted child has no blood links, but is still the next generation
        heirDepth = oldDepth + 1;
      } else {
        heirDepth = FB.lineDepthOf ? FB.lineDepthOf(s, heir) : oldDepth;
      }
      p.lineDepth = p.lineDepth === undefined ?
        heirDepth : p.lineDepth + (heirDepth - oldDepth);
    }
    heir.dyn = old.dyn;
    heir.role = null;
    if (heir.health === undefined) heir.health = 8;
    // a tutor of 'self' was the predecessor; the new life names its own teachers
    if (heir.edu && heir.edu.tutorId === 'self') heir.edu.tutorId = null;
    // coming-of-age events queued for a player who died a teen must not fire for the heir
    s.eventQueue = s.eventQueue.filter(function (ev) {
      return !(ev.ctx && ev.ctx.protagonistId === old.id) &&
        ev.id !== 'player_comes_of_age' && ev.id !== 'player_educated' &&
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
    if (FB.freedomSuccession) FB.freedomSuccession(s);
    if (FB.serfParticipantSuccession) FB.serfParticipantSuccession(s);
    if (FB.resetStandingsForSuccession) {
      FB.resetStandingsForSuccession(s);
    } else {
      p.liegeOp = 0;
      p.liegeOps = {};
    }
    p.traitProgress = {};
    if (FB.cleanupManagedMatches) FB.cleanupManagedMatches(s);
    if (FB.greatHolyWarSuccession) FB.greatHolyWarSuccession(s);
    p.dead = false;
    /* Death dues take liquid coin; they do not forgive an inherited
       household shortfall. */
    if (!livingAbdication && p.gold > 0) p.gold = Math.round(p.gold * 0.9);
    FB.financeSuccession(s); // household contracts survive; mature ones settle at transition
    p.courtingId = null;
    p.courtshipTerms = null;
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
    /* Serf onboarding describes the inherited household tenure rather than
       one protagonist's memory. Carry its semantic acknowledgements with the
       same tenure so succession cannot repeat already-seen teaching. */
    for (const key in p.flags) {
      if (key.indexOf('hint_serf_') === 0 && p.flags[key]) keep[key] = 1;
    }
    if (tutorialCarry) {
      for (const key in tutorialCarry) keep[key] = tutorialCarry[key];
      delete keep.tut_successor_child;
      delete keep.tut_successor_relative;
      keep[successorIsChild
        ? 'tut_successor_child' : 'tut_successor_relative'] = 1;
    }
    p.flags = keep;
    if (FB.intriguePlayerSuccession) {
      FB.intriguePlayerSuccession(s, old.id, heir.id);
    }
    /* A chosen heir may already hold a separately appointed see. Activate
       that personal office after clearing the predecessor's life flags. */
    if (FB.activateBishopricForPlayer) {
      FB.activateBishopricForPlayer(s, heir);
    }
    p.fired = {}; p.cooldowns = {};
    p.prestige = Math.round(p.prestige * 0.6);
    p.piety = Math.round(p.piety * 0.5);
    p.foreignPolicy = {};
    p.vassalLevyFavors = {};
    p.aggressiveWars = [];
    p.warService = 0; p.liegeGrants = 0; p.militaryCommand = null;
    p.professionBack = null;
    p.travelHistory = [];
    p.travelSettlement = null;
    p.capitalRelocation = null;
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
      if (rid && rid !== 'player') {
        FB.changePlayerLiege(s, rid, 'succession:restore_liege');
      }
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
        age: FB.ageOf(heir, s.date.year),
        mar: FB.skillSnapshot(s, heir, 'mar'),
        generation: oldGeneration + 1
      };
      s.realms.player.succession = s.realms.player.succession || { playerDynasty: true };
      s.realms.player.succession.rulerGeneration = oldGeneration + 1;
      s.realms.player.succession.heirCharId = null;
      s.realms.player.liege = p.liege || null;
      s.realms.player.religion = heir.religion;
    }
    if (FB.notePlayerStatus) FB.notePlayerStatus(s);
    if (FB.papacyPlayerSuccession) FB.papacyPlayerSuccession(s, old.id);
    if (FB.enterpriseList) FB.enterpriseList(s);
    if (FB.repairAlliances) FB.repairAlliances(s);

    if (FB.invalidateGuildMonopolies) FB.invalidateGuildMonopolies(s);
    if (livingAbdication) {
      const destination = opts.destinationId && FB.world.byId[opts.destinationId];
      if (opts.retirement && !destination) {
        FB.news(s, FB.msg('news.life.retirement',
          '👤 {heir} takes up the family’s story while {former} retires from the headship. Generation {generation}.',
          {
            heir:FB.fullName(heir),
            former:opts.formerName || FB.fullName(old),
            generation:s.generation
          }));
      } else {
        FB.news(s, FB.msg('news.life.living_abdication',
          '👤 {heir} takes up the family’s story while {former} retires to {destination}. Generation {generation}.',
          {
            heir:FB.fullName(heir),
            former:opts.formerName || FB.fullName(old),
            destination:destination ? destination.name : '',
            generation:s.generation
          }));
      }
    } else {
      FB.news(s, FB.msg('news.life.succession',
        '👤 {name} takes up the family’s story. Generation {generation}.',
        { name: FB.fullName(heir), generation: s.generation }));
    }
    if (!livingAbdication && FB.ui && FB.ui.maybeTip) {
      const minor = FB.ageOf(heir, s.date.year) < 16;
      let successionTip;
      if (successorIsChild) {
        successionTip = minor
          ? '💡 The chronicle continues through your child. You now play as them; household gold, property, enterprises, and debts carry over. Childhood uses Play or Study; adult deeds remain visible and unlock at 16.'
          : '💡 The chronicle continues through your child. You now play as them; household gold, property, enterprises, and debts carry over.';
      } else {
        successionTip = minor
          ? '💡 The chronicle continues through a young relative. You now play as them; household gold, property, enterprises, and debts carry over. Childhood uses Play or Study; adult deeds remain visible and unlock at 16.'
          : '💡 The chronicle continues through a relative. You now play as them; household gold, property, enterprises, and debts carry over.';
      }
      FB.ui.maybeTip('succession', successionTip,
        '#sidetabs .tab[data-tab="log"]');
    }
    G.paused = true; // a new life begins at rest
    FB.ui.refresh();
    FB.save.autosave();
    trackTelemetry(livingAbdication ?
      'retirement-completed' : 'succession-completed', {
      entry_type:telemetrySession ? telemetrySession.entryType : 'unknown',
      active_seconds:telemetryPulse()
    });
    return true;
  };

  /* ---------- voluntary retirement ----------
     An aging head hands the house to an adult successor without dying. The
     transition reuses the living-abdication succession; the gates below are
     the single source the deed and the modal both quote, and retireTo
     re-checks them before changing any state. */
  G.retirementAge = function () {
    return FBDATA.balance.retirementAge !== undefined ?
      FBDATA.balance.retirementAge : 50;
  };

  G.retirementHeirs = function (s) {
    const year = s.date.year;
    return FB.heirsOf(s).filter(function (c) {
      return FB.ageOf(c, year) >= 16;
    });
  };

  G.retirementBlockers = function (s) {
    const blockers = [];
    const p = s && s.player;
    const me = p && s.chars[p.charId];
    if (!me || me.dead) {
      blockers.push(FB.T('Only a living head of the house can retire.'));
      return blockers;
    }
    if (FB.ageOf(me, s.date.year) < G.retirementAge()) {
      blockers.push(FB.T('Retirement waits until age {age}.',
        { age: G.retirementAge() }));
    }
    if (p.flags.in_prison) {
      blockers.push(FB.T('A prisoner cannot hand over the house.'));
    }
    if (p.war) {
      blockers.push(FB.T('Make peace before retiring; a war cannot be handed over.'));
    } else if (p.flags.on_campaign) {
      blockers.push(FB.T('Return from campaign before retiring.'));
    } else if (FB.playerGreatHolyWarHostActive &&
        FB.playerGreatHolyWarHostActive(s)) {
      blockers.push(FB.T('The great holy war must be resolved before retiring.'));
    } else if (FB.atWarPersonally && FB.atWarPersonally(s)) {
      blockers.push(FB.T('Resolve the current wartime duty before retiring.'));
    }
    if (p.travel) {
      blockers.push(FB.T('Finish the current journey before retiring.'));
    }
    if (!G.retirementHeirs(s).length) {
      blockers.push(FB.T('No adult successor can take over the house.'));
    }
    return blockers;
  };

  G.retirePreview = function () {
    const s = FB.state;
    const blockers = G.retirementBlockers(s);
    return {
      eligible: !blockers.length,
      blockers: blockers,
      minAge: G.retirementAge(),
      review: FB.heirReview(s),
      heirs: G.retirementHeirs(s)
    };
  };

  G.retireTo = function (heirId) {
    const s = FB.state;
    const p = s.player;
    const old = s.chars[p.charId];
    if (!old || old.dead || G.retirementBlockers(s).length) return false;
    const heir = s.chars[heirId];
    const eligible = G.retirementHeirs(s).some(function (c) {
      return c.id === heirId;
    });
    if (!heir || !eligible) return false;
    /* Additive marker (no save-version change): the retired elder stays
       ordinary family. Retirement grants no benefits, so there is nothing a
       repeat could duplicate; the marker is for display and clarity. */
    old.retired = true;
    // the old head stays at the family home rather than following the roster
    if (!old.homeProvinceId) old.homeProvinceId = p.provinceId;
    return G.succeedTo(heirId, {
      livingAbdication: true,
      retirement: true,
      formerName: FB.fullName(old)
    });
  };

  /* ================= save/load/title ================= */
  G.loadSlot = function (slot) {
    const data = FB.save.read(slot);
    if (!data) { FB.ui.toast('No save found.'); return; }
    G.loadData(data);
  };

  /* shared wake-up for a save read from a slot, file, or pasted export text;
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
      beginTelemetrySession('resumed-campaign');
      if (!telemetryResumeReported) {
        telemetryResumeReported = true;
        trackTelemetry('campaign-resumed', {
          entry_type:'resumed-campaign'
        });
      }
      if (FB.ui.resumeFirstPlayerTip) FB.ui.resumeFirstPlayerTip();
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
    const telemetrySummary = endTelemetrySession();
    if (telemetrySummary) {
      trackTelemetry('returned-to-title', telemetrySummary);
    }
    FB.state = null;
    G.observe = false;
    document.body.classList.remove('observing');
    G.pickMode = false;
    G.paused = true;
    refreshTitle();
    FB.ui.showScreen('title');
    if (FB.music) FB.music.showTitle(true);
  };
})();
