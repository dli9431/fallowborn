/* Fallowborn — boot, scenarios, turn loop, life & death */
window.FB = window.FB || {};

(function () {
  'use strict';

  const G = {};
  FB.game = G;
  FB.state = null;

  /* version & changelog — numbering and entry rules: docs/VERSIONS.md */
  FB.VERSION = '1.23.0';
  FB.CHANGELOG = [
    { v: '1.23.0', date: '2026-07-23', changes: [
      'Three field victories no longer force an attacking war to end in tribute — the beaten enemy now sends envoys, and you choose: take the silver, or press on to besiege the prize you declared for.'
    ] },
    { v: '1.22.0', date: '2026-07-23', changes: [
      '📤 Export a life as text and 📥 import it back — new buttons in the save and load dialogs. A copied save survives browsers that wipe local storage (a known iPhone trouble) and moves a life between devices.',
      'The game now warns when the browser is blocking save storage, instead of letting a dynasty vanish silently.'
    ] },
    { v: '1.21.1', date: '2026-07-23', changes: [
      'Browser tabs and iOS home-screen shortcuts now show a Fallowborn icon.'
    ] },
    { v: '1.21.0', date: '2026-07-23', changes: [
      'Settings can now switch the interface, core stories, and new Chronicle entries to French, German, Italian, or Spanish.',
      'The four new languages are marked AI Preview; proper names, mod text, prose frozen in old saves, and the Changelog may remain English.'
    ] },
    { v: '1.20.2', date: '2026-07-23', changes: [
      'The Play/Pause button now flips to ▶ Play when the game pauses itself — on losing focus, or at your death — instead of keeping the stale ❚❚ Pause.'
    ] },
    { v: '1.20.1', date: '2026-07-23', changes: [
      'On phone-sized screens the game pauses and autosaves the moment the page loses focus — switching apps or answering a call no longer lets days run on unseen.'
    ] },
    { v: '1.20.0', date: '2026-07-22', changes: [
      'Lower-status lives gain a five-part struggle over common rights, three two-part stories, and five everyday incidents shaped by skills, profession, property, relationships, and faith.',
      'Winning the Old Custom can secure heritable Rights of Common, personal freedom for a serf, or favor toward the next rung.'
    ] },
    { v: '1.19.3', date: '2026-07-22', changes: [
      'The ☰ menu button stays pinned to the top right on portrait phones — the new resources row no longer drags it toward the middle.'
    ] },
    { v: '1.19.2', date: '2026-07-22', changes: [
      'On portrait phones the four resources move to their own full-width row under the topbar — gold no longer clips off the edge on narrow screens.'
    ] },
    { v: '1.19.1', date: '2026-07-22', changes: [
      'The Settings dialog picks the speed of days with a single slider instead of five buttons.'
    ] },
    { v: '1.19.0', date: '2026-07-22', changes: [
      'New Game now asks Fresh start or I have a seed — paste a friend’s start code for their exact world and character, or a bare world seed for the same 867 with your own picks.',
      'Your start’s seed shows in the ☰ menu — tap it to copy and share.'
    ] },
    { v: '1.18.0', date: '2026-07-22', changes: [
      'New deed: Petition for a neighbor’s fief — a liege who loves you and despises the sitting lord may strip him and invest you with his county. Riding to the liege’s wars now builds a service tally that convinces him.',
      'New deed: Buy out a weak neighbor — a struggling count beside you sells his county for gold.',
      'New deed: Settle the wasteland — found a new county on empty land bordering your demesne.',
      'Petty counts can now die without an heir: the fief escheats to the liege — unless you border it and your standing wins the scramble. Heirless fiefs of your own vassals return to your hand.',
      'AI vassal houses now carry a standing at their liege’s court that drifts over the years.'
    ] },
    { v: '1.17.2', date: '2026-07-22', changes: [
      'Hold F to fast-forward again — keeping it pressed skips ahead repeatedly, instead of one skip per press.'
    ] },
    { v: '1.17.1', date: '2026-07-22', changes: [
      'On phones the Changelog now sits as an evenly framed panel with a Close button pinned to the bottom middle — no more scrolling to the end of a long list to shut it.'
    ] },
    { v: '1.17.0', date: '2026-07-22', changes: [
      'Wounds and sicknesses now have names: hard blows leave a named wound and falling ill names the sickness — listed on your character sheet with a detail note, and visible on your portrait as bandages, cuts, bruises, and a pale, haggard face.',
      'Scarred and one-eyed characters now bear their marks on every portrait, yours and others’.'
    ] },
    { v: '1.16.4', date: '2026-07-22', changes: [
      'A vassal breaking away from YOUR realm now starts a real defensive war — no more eternal war flag and an enemy host squatting unfightable in your capital.',
      'Losing a defensive war now takes one of your own border counties, as the siege warning promises — it used to fizzle into reparations whenever the roll landed on a vassal’s land.',
      'The game autosaves when the tab is hidden or closed — a backgrounded phone no longer loses everything since the last season.',
      'The 🎲 random province and name suggestions differ per visit — the pre-game dice were stuck on the same roll for everyone.',
      'Cancelling the Pay Homage or Appeal pickers no longer burns their long cooldowns.',
      'Holding Space/E no longer flickers pause, and holding F fires one skip per press, not a stream.',
      'Sickness events about a young child now name the child — and the one named is the one at risk.',
      'A kinsman betrothed to you when you die can wed again; the stale pledge used to bar marriage forever.',
      'An arranged-match shortlist thinned by a death is topped back up to three families.',
      'Gifting items to your lord now caps his opinion at 100 like every other favor.',
      'Starting siblings are never same-year twins (the intended guard was inert).',
      'The Chronicle shows the full last 80 entries, not 79.',
      'Loading a save right after another life no longer briefly reads the old realm’s lands (taxes, borders) until the next day.',
      'Enemy strength readouts (“fields ~N men”) follow the aiHostPerDev balance knob instead of a hardcoded 0.3.',
      'balance.mortalityBase now truly scales the yearly mortality curve.',
      'A cancelled touch gesture (notification shade, incoming call) no longer counts as a map tap or march order.',
      'Tapping stacked hosts prefers your own; halting or releasing a host repaints at once; an impossible march order says so.',
      'Map label and marker outlines scale with screen density — readable halos on high-DPI phones.',
      'Faster: hidden Self/Kin drawer skips its rebuild each tick, the map skips the highlight layer when nothing is selected, the Chronicle skips identical rebuilds, save dialogs parse each slot once, and the daily focus check, tier check, and yearly breakaway sweep drop most of their work.'
    ] },
    { v: '1.16.3', date: '2026-07-22', changes: [
      'Death no longer flashes by at high speed: automation never resolves an event whose outcome could kill you — the blow is always shown — and the succession screen waits for a deliberate choice instead of taking a stray Space/Enter on the first heir.',
      'The death screen now speaks the chronicler’s parting line for the life just ended.'
    ] },
    { v: '1.16.2', date: '2026-07-22', changes: [
      'Fixed a baron left sworn to a lord who lost his home county: when the county changes hands the baron answers to its new holder, and stale liege bonds in old saves are re-homed to the county’s holder.'
    ] },
    { v: '1.16.1', date: '2026-07-22', changes: [
      'Older saves that knew only your brothers and sisters now name your late parents too — the family tree no longer shows "Unrecorded" above your brood.'
    ] },
    { v: '1.16.0', date: '2026-07-22', changes: [
      'Name your newborn children: the birth event shows a name field with the generated name — edit it or roll the dice for another.'
    ] },
    { v: '1.15.1', date: '2026-07-22', changes: [
      'Fixed the panels and map bouncing while time runs: the topbar stats stay on one line and clip instead of wrapping when space is tight.',
      'Single-digit days keep the date a fixed width (a collapsing space used to shrink it).'
    ] },
    { v: '1.15.0', date: '2026-07-22', changes: [
      'While observing, ☰ → Settings can silence the world-news toasts and hide the Land & Chronicle panel — the map alone on stage.'
    ] },
    { v: '1.14.4', date: '2026-07-22', changes: [
      'Long dialogs — the Changelog and How to Play — open at the top instead of jumping down to the Close button.'
    ] },
    { v: '1.14.3', date: '2026-07-22', changes: [
      'Your host always marches under a green banner; your war enemy’s host always marches under a red one.'
    ] },
    { v: '1.14.2', date: '2026-07-22', changes: [
      'Hosts stand on a disc of their realm’s color, and hosts clashing in a province bear a ⚔ for the day — battles on the map read at a glance.'
    ] },
    { v: '1.14.1', date: '2026-07-22', changes: [
      'Hosts on the map are drawn on the province they stand in, not mid-road toward the next — a host crossing the Channel no longer floats in the sea.'
    ] },
    { v: '1.14.0', date: '2026-07-22', changes: [
      'New Game offers an 👁 Observe mode: no character, no events — the centuries flow and the realms war, fall, and redraw the map while you watch.',
      'While observing, the chronicle reports every war, battle, succession, and conquest in the world, not only those near home.'
    ] },
    { v: '1.13.0', date: '2026-07-22', changes: [
      'The menu gains a Settings dialog with a tap-friendly chooser for the speed of days — the five speeds used to be reachable only by the −/+ keys.',
      'The in-game help no longer mislabels −/+ as zoom keys.'
    ] },
    { v: '1.12.0', date: '2026-07-22', changes: [
      'The menu gains a Changelog button above Abandon to title and shows the game version at its foot.'
    ] },
    { v: '1.11.1', date: '2026-07-22', changes: [
      'Hosts on the map are drawn larger and easier to tap; ordering a march now lets go of the host, so further taps browse the map instead of re-tasking it.',
      'A side whose host was shattered fields only a remnant in the war council’s pitched battle while it re-forms — no more phantom full-strength armies.',
      'Hunting an enemy host now tracks it day by day instead of marching to where it stood; every march leg costs the full march time; hosts resting on home ground slowly refill their ranks.',
      'Faster fast-forward: the daily army tick no longer grinds through every pair of realms.'
    ] },
    { v: '1.11.0', date: '2026-07-22', changes: [
      'New deed: ⚑ Declare independence — any sworn lord or baron with 200+ prestige can renounce his liege and fight for his own banner.',
      'Declaring independence now puts you on a war footing and calls the muster, like any other defensive war.',
      'Fixed barons left "independent" with no path upward when their lord’s house died: a baron now answers to whoever holds his home county.',
      'A baron who declares independence properly seizes his home county — a lord left landless by the seizure no longer lingers as a realm.'
    ] },
    { v: '1.10.0', date: '2026-07-22', changes: [
      'Wars take the field: realms at war raise hosts of spearmen on the map that march province to province and fight where they meet.',
      'Muster your own host (🚩 deed or the muster event), hire companies to swell it, then tap the host and tap a province to march it.',
      'A siege now needs your host standing in the target province; an invader kept out of your lands can no longer take a county.',
      'The war council’s pitched battle is for an enemy without a host in the field — to beat their army, hunt it on the map.'
    ] },
    { v: '1.9.0', date: '2026-07-21', changes: [
      'Events show a card for every character they name — face, house arms, home, allegiance, skills, and traits — so a rival never arrives as a bare name.',
      'Character cards and sheets show the character’s house arms and the coat of arms of the realm that holds their home.'
    ] },
    { v: '1.8.0', date: '2026-07-21', changes: [
      'The end screen rolls the dynasty’s dead: every life you played, with years, title, and one line the chronicler should have kept to themselves.'
    ] },
    { v: '1.7.0', date: '2026-07-21', changes: [
      'Great houses can fall: neglect a rising of the commons, a rival’s claim, or a murder plot through three warnings, and you lose every acre.',
      'Deposed sovereigns are replaced by a usurper realm that keeps the realm’s name, color, and vassals; a deposed vassal’s fiefs escheat to the liege.',
      'The fallen drop to landless gentry, keeping gold, treasures, and family property.'
    ] },
    { v: '1.6.1', date: '2026-07-20', changes: [
      'A child’s Study focus trains half as fast (it was twice the best adult focus).',
      'Childhood lesson events recur half as often (cooldowns doubled to 6–8 seasons).'
    ] },
    { v: '1.6.0', date: '2026-07-20', changes: [
      'The ladder is steeper: freedom costs 100 gold, a manor 600 gold and 150 prestige, a barony 250 prestige, a liege’s grant 400 prestige and favor 65.',
      'Petitions to lord and liege can be brought less often, and lieges grant land more grudgingly.',
      'Name pools for every culture roughly tripled — fewer repeating faces across the generations.',
      'Fixed a fleeing lord being named vassal of himself when he landed in his own demesne.'
    ] },
    { v: '1.5.0', date: '2026-07-20', changes: [
      'Only gentle households (gentry and above) may send a child to be educated by the lord.',
      'A baron raised to a county answers to the granting lord’s own liege — counts no longer answer to counts.',
      'A lord who grants away his last county no longer lingers as a landless realm.'
    ] },
    { v: '1.4.0', date: '2026-07-20', changes: [
      'Clicking the dead in the family tree opens their sheet: birth and death years, skills, and traits.'
    ] },
    { v: '1.3.0', date: '2026-07-20', changes: [
      'Clicking your own province highlights your own realm, not your liege’s.',
      'New map filter (🗺 button or R key) cycles the highlight: Realm → Mine → Liege.'
    ] },
    { v: '1.2.0', date: '2026-07-20', changes: [
      'The liege’s name in the Deeds banner opens his sheet.'
    ] },
    { v: '1.1.0', date: '2026-07-20', changes: [
      'Title screen shows the game version.',
      'Changelog opens from the title screen.'
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
      tier: 1, profession: 'soldier', gold: 10, prestige: 10, piety: 0, mar: 3,
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
     - start code: SEED-SCENARIO-PROVINCE-SEX-NAME (the menu shows this one) */

  // a fresh seed is one-time seed initialization — the legitimate Math.random use
  function freshSeed() {
    return ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0).toString(36).toUpperCase();
  }

  function seedCode(seed, scenId, provId, sex, name) {
    const n = (name || '').replace(/-/g, '').replace(/\s+/g, '_');
    return seed + '-' + scenId + '-' + provId + '-' + sex + '-' + n;
  }

  /* parse what a player pasted: a full start code, a bare world seed, or an
     error to show inline. A 5-part shape must validate as a code — silently
     falling back to a bare seed would hand them a different world than the
     one their friend shared. */
  function parseSeedInput(raw) {
    const txt = (raw || '').trim();
    if (!txt) return { error: 'Paste a start code or world seed first.' };
    const parts = txt.split('-');
    if (parts.length >= 5) {
      const bad = 'That start code doesn’t parse — check it was copied whole.';
      if (parts.length !== 5) return { error: bad };
      const seed = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      const scen = G.SCENARIOS.filter(function (s) { return s.id === parts[1].toLowerCase(); })[0];
      const prov = FB.world.byId[parts[2].toLowerCase()];
      const sex = parts[3].toLowerCase();
      const name = parts[4].replace(/_/g, ' ').trim();
      if (!seed || !scen || !prov || prov.wasteland || (sex !== 'm' && sex !== 'f') ||
        !name || name.length > 20) return { error: bad };
      return { seed: seed, scenario: scen, provinceId: prov.id, sex: sex, name: name };
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
      FB.generateWorld(
        function (frac, msg) {
          $('loadbar').style.width = Math.round(frac * 100) + '%';
          $('loadmsg').textContent = FB.T(msg);
        },
        function () {
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
    $('btn-ng-back').addEventListener('click', function () { FB.ui.showScreen('title'); });
    $('btn-pick-back').addEventListener('click', function () {
      G.pickMode = false;
      document.body.classList.remove('picking');
      FB.ui.showScreen('newgame');
    });
    $('btn-pick-random').addEventListener('click', function () {
      const cands = FB.world.provs.filter(function (p) { return !p.wasteland; });
      G.pickProvince(FB.pick(cands));
    });
    $('btn-pick-next').addEventListener('click', function () {
      if (!G.pending.provinceId) {
        const cands = FB.world.provs.filter(function (p) { return !p.wasteland; });
        G.pickProvince(FB.pick(cands));
      }
      G.pickMode = false;
      document.body.classList.remove('picking');
      showChargen();
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
      '<span class="adesc">A new seed is rolled — your own 867 to shape.</span></button>' +
      '</div>' +
      '<div class="gm-body-text" style="margin-top:10px"><p>…or play a start someone shared:</p></div>' +
      '<input id="ng-seed" type="text" maxlength="60" placeholder="' +
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
      showScenarios();
    });
    $('ng-cancel').addEventListener('click', FB.ui.closeModal);
    function useSeed() {
      const r = parseSeedInput($('ng-seed').value);
      if (r.error) { $('ng-seed-err').textContent = FB.T(r.error); return; }
      FB.ui.closeModal();
      if (r.scenario) { // a full start code: straight to the pre-filled details
        const pr = FB.world.byId[r.provinceId];
        G.pending = { seed: r.seed, scenario: r.scenario, provinceId: r.provinceId,
          culture: pr.culture, religion: pr.religion, sex: r.sex, name: r.name };
        showChargen();
      } else {
        G.pending = { seed: r.seed };
        showScenarios();
      }
    }
    $('ng-seed-go').addEventListener('click', useSeed);
    $('ng-seed').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.stopPropagation(); useSeed(); }
    });
  }

  function showScenarios() {
    const box = $('scenariolist');
    box.innerHTML = '';
    for (const sc of G.SCENARIOS) {
      const el = document.createElement('button');
      el.className = 'scencard';
      el.innerHTML = '<h3>' + FB.esc(FB.L(sc.name)) + '</h3><div class="diff">' +
        FB.esc(FB.L(sc.diff)) + '</div><p>' + FB.esc(FB.L(sc.desc)) + '</p>';
      (function (scenario) {
        el.addEventListener('click', function () {
          G.pending = { seed: G.pending && G.pending.seed, scenario: scenario, provinceId: null };
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
    // paint the 867 map from static data (no game state yet)
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
    if (!pr) return;
    if (pr.wasteland) {
      FB.ui.toast('No one is born in {province}. Pick a settled land.', { province: pr.name });
      return;
    }
    G.pending.provinceId = pr.id;
    G.pending.culture = pr.culture;
    G.pending.religion = pr.religion;
    FB.map.select(pr.id);
    updatePickInfo();
  };

  function updatePickInfo() {
    const el = $('pickinfo');
    if (!G.pending || !G.pending.provinceId) {
      el.textContent = FB.T('No province chosen — a random home will be found.');
      return;
    }
    const pr = FB.world.byId[G.pending.provinceId];
    const realm = FBDATA.realms.filter(function (r) { return r.id === pr.realm0; })[0];
    const culture = FB.cultureOf(pr.culture);
    const religion = FB.religionOf(pr.religion);
    el.innerHTML = '<b>' + FB.esc(pr.name) + '</b> — ' +
      FB.esc(realm ? realm.name : FB.T('independent')) + ' · ' +
      FB.esc(FB.renderKey('culture.' + pr.culture + '.name.default',
        { text: culture.name }, {})) + ' · ' +
      FB.esc(FB.renderKey('religion.' + pr.religion + '.name.default',
        { text: religion.name }, {})) + ' · ' + FB.esc(FB.terrainName(pr.terrain));
  }

  function showChargen() {
    // a shared start code arrives with its hero chosen — pre-fill instead of suggesting
    if (G.pending.sex) {
      document.querySelector('input[name=cg-sex][value="' + G.pending.sex + '"]').checked = true;
    }
    const sex = document.querySelector('input[name=cg-sex]:checked').value;
    $('cg-name').value = G.pending.name || FB.randomName(G.pending.culture, sex);
    const pr = FB.world.byId[G.pending.provinceId];
    const culture = FB.cultureOf(pr.culture);
    const religion = FB.religionOf(pr.religion);
    $('cg-summary').innerHTML = '<b>' + FB.esc(FB.T('{scenario} in {province}', {
      scenario: FB.L(G.pending.scenario.name), province: pr.name
    })) + '</b><br>' +
      FB.esc(FB.renderKey('culture.' + pr.culture + '.name.default',
        { text: culture.name }, {})) + ' · ' +
      FB.esc(FB.renderKey('religion.' + pr.religion + '.name.default',
        { text: religion.name }, {})) + ' · ' +
      FB.esc(FB.T('beginning in {year} AD, aged {age}.', {
        year: FBDATA.balance.startYear, age: FBDATA.balance.startAge
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
    const sc = G.pending.scenario;
    const provId = G.pending.provinceId;
    const pr = FB.world.byId[provId];
    const sex = document.querySelector('input[name=cg-sex]:checked').value;
    const name = ($('cg-name').value || '').trim() || FB.randomName(pr.culture, sex);
    G.pending.name = null; G.pending.sex = null; // a shared code's pre-fill is spent

    const state = {
      v: 2,
      seed: seedCode(seedStr, sc.id, provId, sex, name), // the start actually taken, edits included
      date: { year: FBDATA.balance.startYear, season: FBDATA.balance.startSeason, day: 1 },
      turn: 0, generation: 1, slotDays: [],
      chars: {}, roles: {}, eventQueue: [], log: [], legends: [], flags: {}, buildings: {}, tech: [],
      armies: [], armyDown: {},
      player: {
        charId: null, tier: sc.tier, profession: sc.profession, professionBack: null,
        gold: sc.gold, prestige: sc.prestige, piety: sc.piety,
        provinceId: provId, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        flags: {}, cooldowns: {}, fired: {}, courtingId: null,
        provs: [], war: null, focus: null, dead: false, holdings: [], research: 0
      },
      pregnant: null, peakTier: sc.tier, peakTitleData: null,
      seasonMark: { gold: sc.gold, prestige: sc.prestige, piety: sc.piety }, seasonNet: null
    };
    FB.state = state;
    FB.initPolitics(state);
    scheduleSlots(state);

    const me = FB.makeCharacter(state, {
      name: name, sex: sex, culture: pr.culture, religion: pr.religion,
      born: FBDATA.balance.startYear - FBDATA.balance.startAge,
      quality: sc.tier >= 2 ? 2 : 0, traitsN: 2
    });
    me.health = 8;
    me.dyn = FB.dynastyName(pr.culture, me.name, pr.name);
    if (sc.mar) me.skills.mar = FB.clamp(me.skills.mar + sc.mar, 0, FBDATA.balance.skillHardCap || 40);
    state.player.charId = me.id;

    // parents — the first rung of the kin tree
    const dad = FB.makeCharacter(state, {
      sex: 'm', culture: pr.culture, religion: pr.religion,
      born: me.born - FB.ri(20, 40), role: 'parent', quality: 1
    });
    const mom = FB.makeCharacter(state, {
      sex: 'f', culture: pr.culture, religion: pr.religion,
      born: me.born - FB.ri(20, 34), role: 'parent'
    });
    dad.dyn = me.dyn;
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
        role: 'sibling'
      });
      sib.dyn = me.dyn;
      sib.health = 8;
      sib.fatherId = dad.id; sib.motherId = mom.id;
      dad.childrenIds.push(sib.id); mom.childrenIds.push(sib.id);
    }

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
    const home = FB.pick(FB.world.provs.filter(function (p) { return !p.wasteland; }));
    const state = {
      v: 2,
      seed: seedStr,
      date: { year: FBDATA.balance.startYear, season: FBDATA.balance.startSeason, day: 1 },
      turn: 0, generation: 1, slotDays: [],
      chars: {}, roles: {}, eventQueue: [], log: [], legends: [], flags: {}, buildings: {}, tech: [],
      armies: [], armyDown: {},
      player: {
        charId: null, tier: 0, profession: 'farmer', professionBack: null,
        gold: 0, prestige: 0, piety: 0,
        provinceId: home.id, liege: null, liegeOp: 0, liegeOps: {}, pop: 0,
        flags: {}, cooldowns: {}, fired: {}, courtingId: null,
        provs: [], war: null, focus: null, dead: false, holdings: [], research: 0
      },
      pregnant: null, peakTier: 0, peakTitleData: null,
      seasonMark: { gold: 0, prestige: 0, piety: 0 }, seasonNet: null
    };
    FB.state = state;
    FB.initPolitics(state);
    // a placeholder soul, never shown — some panels dereference it blindly
    const me = FB.makeCharacter(state, {
      name: FB.randomName(home.culture, 'm'), sex: 'm',
      culture: home.culture, religion: home.religion,
      born: FBDATA.balance.startYear - 30, quality: 0, traitsN: 0
    });
    state.player.charId = me.id;

    G.observe = true;
    G.paused = false;
    document.body.classList.add('observing');
    document.body.classList.toggle('obshidepanel', G.obsBare); // a returning watcher's preference
    FB.ui.mapDirty();
    FB.map.playerProv = null;
    FB.ui.showGame();
    FB.map.fitView();
    FB.map.select(null);
    FB.ui.showTab('log');
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
    const p = s.player;

    if (!G.observe) {
      if (!(opts && opts.skipFocus)) FB.tickFocus(s);
      else FB.validateFocus(s);
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

    /* observe mode: the calendar turns, the realms tick once a year, hosts
       march daily — and that is all. No focus, upkeep, mortality, births,
       events, or autosaves; nothing personal ever reaches the watcher. */
    if (G.observe) {
      if (seasonBoundary && newYear) FB.worldTick(s);
      FB.armyTick(s);
      s.eventQueue.length = 0;
      FB.ui.refresh();
      return seasonBoundary ? 'season' : 'day';
    }

    if (seasonBoundary) {
      const upkeep = [1, 1, 2, 4, 6, 9, 14, 20][p.tier] || 1;
      const income = p.tier >= 3 ? FB.playerTax(s) : 0;
      p.gold = Math.max(0, p.gold + income - upkeep + FB.holdingBonus(s, 'gold'));
      p.prestige += FB.holdingBonus(s, 'prestige') + FB.itemBonus(s, 'prestige');
      p.piety += FB.holdingBonus(s, 'piety') + FB.itemBonus(s, 'piety');
      if (p.tier >= 3) {
        p.piety += FB.buildingBonus(s, 'piety');
        p.research = (p.research || 0) + FB.buildingBonus(s, 'research') + FB.techBonus(s, 'research');
        if (G.auto.build) FB.autoBuild(s);
        if (G.auto.research) FB.autoResearch(s);
      }
      FB.playerWarTick(s);
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
      if (newYear) FB.worldTick(s);
      FB.save.autosave(); // snapshot before any mortality roll, never a dead state
      if (newYear) {
        yearlyLife(s);
        if (p.dead) return 'dead';
      }
    }

    birthTick(s);
    FB.armyTick(s); // hosts march and fight on the map every day
    if (s.peakTier === undefined || p.tier > s.peakTier) {
      s.peakTier = p.tier; s.peakTitleData = FB.titleSnapshot(s);
    }

    const events = FB.pickDailyEvents(s);
    FB.ui.refresh();
    if (events.length) {
      // runEvents reports whether a modal actually opened; autoresolved
      // events pass silently and the day keeps flowing
      if (FB.ui.runEvents(events)) return 'event';
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
  G.auto = { on: false, major: false, war: false, style: 'safe', build: false, research: false };
  /* NOTE: the settings once shared a key with the AUTOSAVE SLOT (save.js)
     and each overwrote the other; they now live under their own key. */
  try {
    const storedAuto = JSON.parse(localStorage.getItem('fb_automation') || 'null');
    if (storedAuto && typeof storedAuto === 'object') {
      for (const ak in G.auto) if (storedAuto[ak] !== undefined) G.auto[ak] = storedAuto[ak];
    }
  } catch (e) { /* keep defaults */ }
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
    const me = s.chars[s.player.charId];
    if (me.health <= 0) {
      G.die(FB.msg('legend.death.wounds',
        'Wounds and sickness prove too much. {name} does not see another season.',
        { name: me.name }));
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

    // children: schooling, then coming of age
    educationTick(s);
    for (const cid of me.childrenIds) {
      const c = s.chars[cid];
      if (c && !c.dead && FB.ageOf(c, year) === 16) {
        if (c.edu && c.edu.focus) {
          FB.gainSkill(c, c.edu.focus, 2);
          if (c.edu.focus === 'lea') FB.addTrait(c, 'literate');
          s.eventQueue.push({ id: 'child_educated', ctx: { childId: cid } });
        } else {
          s.eventQueue.push({ id: 'child_comes_of_age', ctx: { childId: cid } });
        }
      }
    }

    // the player, when still a child, comes of age the same way
    if (FB.ageOf(me, year) === 16) {
      if (me.edu && me.edu.focus) {
        FB.gainSkill(me, me.edu.focus, 2);
        if (me.edu.focus === 'lea') FB.addTrait(me, 'literate');
        s.eventQueue.push({ id: 'player_educated', ctx: {} });
      } else {
        s.eventQueue.push({ id: 'player_comes_of_age', ctx: {} });
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
    const age = FB.ageOf(me, year);
    let q = (age < 30 ? 0.008 : age < 45 ? 0.012 : age < 60 ? 0.03 : age < 70 ? 0.07 : age < 80 ? 0.14 : 0.28) * mortScale;
    if (me.health <= 2) q += 0.12; else if (me.health <= 5) q += 0.03;
    if (p.flags.ill) q += 0.05;
    if (p.flags.plague_here) q += 0.06;
    q -= FB.traitAgg(me).health;
    q -= FB.techBonus(s, 'health') + FB.holdingBonus(s, 'health') + FB.itemBonus(s, 'health'); // physicians, hearth gardens, remedies
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
    if (FB.chance(0.35) && me.health < 8 && !p.flags.ill) me.health++;
    if (!p.flags.ill && me.health >= 7) FB.cureAilments(me, 'wound', 1); // one old wound knits each year

    // everyone else ages & sometimes dies
    for (const id in s.chars) {
      const c = s.chars[id];
      if (c.dead || id === p.charId) continue;
      const a = FB.ageOf(c, year);
      let cq = (a < 5 ? 0.03 : a < 16 ? 0.006 : a < 50 ? 0.008 : a < 65 ? 0.03 : a < 80 ? 0.1 : 0.25) * mortScale;
      if (p.flags.plague_here) cq += 0.05;
      cq -= FB.traitAgg(c).health;
      if (FB.chance(FB.clamp(cq, 0.002, 0.6))) {
        const wasSpouse = c.id === me.spouseId || c.spouseId === me.id;
        const wasChild = me.childrenIds.indexOf(c.id) >= 0;
        const wasLord = s.roles.lord === c.id;
        const wasCourted = s.player.courtingId === c.id;
        const pledgedChild = c.betrothedId && me.childrenIds.indexOf(c.betrothedId) >= 0 ?
          s.chars[c.betrothedId] : null;
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
          }, { case: pledgeCase, name: c.name, child: pledgedChild.name }));
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

    // popular opinion drifts toward 0
    p.pop = Math.round(p.pop * 0.85);
    p.liegeOp = Math.round((p.liegeOp || 0) * 0.9);
    if (p.liegeOps) for (const rid in p.liegeOps) p.liegeOps[rid] = Math.round(p.liegeOps[rid] * 0.9);
  }

  /* ---------- education (yearly) ----------
     A child aged 6-15 with an education focus gains that skill at a rate set
     by the tutor's own ability in it; a tutor's habits can also rub off.
     Covers the player's children and the player themselves when still a child. */
  function educationTick(s) {
    const me = s.chars[s.player.charId];
    for (const cid of me.childrenIds) educateChar(s, s.chars[cid]);
    educateChar(s, me);
  }
  function educateChar(s, c) {
    const me = s.chars[s.player.charId];
    if (!c || c.dead || !c.edu || !c.edu.focus) return;
    const age = FB.ageOf(c, s.date.year);
    if (age < 6 || age >= 16) return;
    let tutor = null;
    // 'self' means the player tutoring their own child — a child player can't self-tutor
    if (c.edu.tutorId === 'self') tutor = (c.id === me.id) ? null : me;
    else if (c.edu.tutorId) {
      tutor = s.chars[c.edu.tutorId];
      if (!tutor || tutor.dead) {
        c.edu.tutorId = null;
        tutor = null;
        FB.news(s, FB.msg('news.life.tutor_died', {
          forms: {
            select: 'value', param: 'self', cases: {
              yes: '🕯 Your tutor has died; the lessons pause.',
              other: '🕯 {name}’s tutor has died; the lessons pause.'
            }
          }
        }, { self: c.id === me.id ? 'yes' : 'other', name: c.name }));
      }
    }
    const tSkill = tutor ? FB.skillOf(tutor, c.edu.focus) : 0;
    const p = (tutor ? 0.3 + tSkill * 0.04 : 0.18) + FB.holdingBonus(s, 'edu');
    if (FB.chance(Math.min(0.9, p))) {
      FB.gainSkill(c, c.edu.focus, 1);
    }
    if (FB.chance(0.15)) {
      FB.gainSkill(c, FB.pick(FB.SKILLS), 1);
    }
    if (tutor && tutor !== me && FB.chance(0.08)) {
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
      const close = ['Son', 'Daughter', 'Brother', 'Sister'].indexOf(e.rel) >= 0;
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
        k.spouseId = sp.id; sp.spouseId = k.id;
        if (close) FB.news(s, FB.msg('news.life.close_kin_wedding', {
          forms: {
            select: 'value', param: 'relation', cases: {
              Son: '💍 Your son {name} weds {spouse}.',
              Daughter: '💍 Your daughter {name} weds {spouse}.',
              Brother: '💍 Your brother {name} weds {spouse}.',
              Sister: '💍 Your sister {name} weds {spouse}.',
              other: '💍 Your kinsman {name} weds {spouse}.'
            }
          }
        }, { relation: e.rel, name: k.name, spouse: sp.name }));
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
          fatherId: father.id, motherId: mother.id
        });
        baby.health = 7;
        baby.dyn = k.sex === 'm' ? (k.dyn || me.dyn) : sp.dyn || null;
        k.childrenIds.push(baby.id); sp.childrenIds.push(baby.id);
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
      if (s.turn >= s.pregnant.due) {
        const mother = s.chars[s.pregnant.motherId];
        const father = s.chars[s.pregnant.fatherId];
        s.pregnant = null;
        if (mother && !mother.dead) {
          const baby = FB.makeCharacter(s, {
            culture: me.culture, religion: me.religion, born: s.date.year,
            traits: FB.inheritTraits(father, mother), traitsN: 0,
            fatherId: father ? father.id : null, motherId: mother.id
          });
          baby.dyn = me.dyn;
          baby.health = 7;
          me.childrenIds.push(baby.id);
          s.eventQueue.push({ id: 'child_born_flavor', ctx: { childId: baby.id } });
        }
      }
      return;
    }
    // every wife of the household may conceive (one pregnancy at a time) —
    // the all-characters spousesOf scan runs only under polygynous doctrine
    const mates = me.sex === 'f' || FB.marriageDoctrine(me.religion).wives <= 1
      ? (sp ? [sp] : []) : FB.spousesOf(s, me);
    for (const mate of mates) {
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
        s.pregnant = { due: s.turn + 270, motherId: mother.id, fatherId: father.id };
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

  G.die = function (cause) {
    G.setPaused(true); // refresh now, while the topbar still repaints behind the death modal
    const s = FB.state;
    const p = s.player;
    const me = s.chars[p.charId];
    const causeMsg = cause && typeof cause === 'object' && typeof cause.key === 'string'
      ? FB.message(cause.key, cause.params) : null;
    const causeText = causeMsg
      ? FB.renderMessage(causeMsg, { state: s, viewer: p.charId })
      : String(cause === undefined || cause === null ? '' : cause);
    me.dead = true;
    me.died = s.date.year; // killChar is bypassed for the player's own death
    p.dead = true;
    recordLegend(s, me, causeMsg, causeText);
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
  function recordLegend(s, me, causeMsg, causeText) {
    if (!s.legends) s.legends = [];
    const legend = {
      id: me.id,
      name: FB.fullName(me),
      born: me.born,
      died: s.date.year,
      titleData: FB.titleSnapshot(s),
      quipMsg: legendQuip(s, me, causeMsg, causeText)
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
      greedy: FB.msg('legend.trait.greedy', 'Left instructions about the gold. Nobody can find them.', {}),
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

  G.succeedTo = function (heirId) {
    const s = FB.state;
    const p = s.player;
    const old = s.chars[p.charId];
    const heir = s.chars[heirId];
    if (!heir) { FB.ui.gameOver(); return; }

    s.generation++;
    heir.dyn = old.dyn;
    heir.role = null;
    if (heir.health === undefined) heir.health = 8;
    // a tutor of 'self' was the dead parent; the new life names its own teachers
    if (heir.edu && heir.edu.tutorId === 'self') heir.edu.tutorId = null;
    // coming-of-age events queued for a player who died a teen must not fire for the heir
    s.eventQueue = s.eventQueue.filter(function (ev) {
      return ev.id !== 'player_comes_of_age' && ev.id !== 'player_educated';
    });
    p.charId = heir.id;
    p.dead = false;
    p.gold = Math.round(p.gold * 0.9); // death dues
    p.courtingId = null;
    p.plot = null; // plots die with their plotter
    p.itemOffer = null; // the peddler moves on; carried items pass to the heir
    s.pregnant = null;
    // treasures gifted to the heir in life rejoin the family hoard
    if (heir.items && heir.items.length) {
      const hoard = FB.itemList(s);
      for (const iid of heir.items) if (hoard.indexOf(iid) < 0) hoard.push(iid);
      heir.items = null;
    }

    // only property passes; personal standing must be rebuilt somewhat
    const keep = {};
    for (const fl of ['has_farm', 'own_ox']) if (p.flags[fl]) keep[fl] = 1; // buildings pass with the land itself
    p.flags = keep;
    p.fired = {}; p.cooldowns = {};
    p.prestige = Math.round(p.prestige * 0.6);
    p.piety = Math.round(p.piety * 0.5);
    p.liegeOp = 0; p.liegeOps = {};
    p.pop = Math.round(p.pop * 0.5);
    // death dues and standing cuts must not read as a season's losses
    s.seasonMark = { gold: p.gold, prestige: p.prestige, piety: p.piety };
    s.seasonNet = null;
    if (p.profession === 'monk' || p.profession === 'priest') p.profession = 'farmer';
    if (p.tier >= 2) p.profession = 'noble';
    delete s.roles.spouse; delete s.roles.suitor;
    p.namedHeirId = null; // the new life names its own successor
    p.focus = FB.defaultFocus(s);

    // heirs of ruling houses keep the liege bond
    if (p.tier >= 3 && !p.liege && !(s.realms.player && s.realms.player.alive)) {
      const rid = (s.holder && s.holder[p.provinceId]) || s.owner[p.provinceId];
      if (rid && rid !== 'player') p.liege = rid;
    }
    if (s.realms.player && s.realms.player.alive) {
      s.realms.player.ruler = {
        name: heir.name, culture: heir.culture,
        age: FB.ageOf(heir, s.date.year), mar: FB.skillOf(heir, 'mar')
      };
    }

    FB.news(s, FB.msg('news.life.succession',
      '👤 {name} takes up the family’s story. Generation {generation}.',
      { name: FB.fullName(heir), generation: s.generation }));
    G.paused = true; // a new life begins at rest
    FB.ui.refresh();
    FB.save.autosave();
  };

  /* ================= save/load/title ================= */
  G.loadSlot = function (slot) {
    const data = FB.save.read(slot);
    if (!data) { FB.ui.toast('No save found.'); return; }
    G.loadData(data);
  };

  /* shared wake-up for a save read from a slot or pasted as export text;
     false when the life belongs to another mod world */
  G.loadData = function (data) {
    // a life cannot wake up in the wrong world: the map ids would not fit
    if (FB.save.otherWorld(data)) {
      FB.ui.toast(data.mods ?
        '🧩 That life was lived in a modded world. Enable the same mod(s) (Mods menu) to continue it.' :
        '🧩 That life was lived in the unmodded world. Remove all mods (Mods menu) to continue it.');
      return false;
    }
    FB.save.restore(data);
    G.observe = false;
    document.body.classList.remove('observing');
    G.pickMode = false;
    G.paused = true;
    FB.ui.mapDirty();
    FB.map.playerProv = FB.state.player.provinceId;
    FB.ui.showGame();
    FB.map.centerOn(FB.state.player.provinceId, 2.0);
    FB.map.select(null);
    FB.ui.refresh();
    FB.ui.toast('The chronicle resumes — {season} {year} AD.', {
      season: FB.seasonName(FB.state.date.season),
      year: FB.state.date.year
    });
    FB.save.warnIfBlocked();
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
