/* =========================================================================
   Fallowborn — COUNCIL EVENTS: the royal council at king/emperor tier.
   The great officers of the crown serve, flatter, and scheme. Triggers and
   effects named council_* live in js/council.js; the body itself forms in
   FB.councilEnsure. See docs/designs/council.md.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---- flattery & favor-seeking: the sycophants at the board ---- */
{ id:'council_flattery', title:'Honey at the Council Board',
  trigger:{ tierMin:6, custom:'council_has_sycophant', chance:0.14 }, weight:6, cooldown:6,
  text:'One of your councillors — all smiles and low bows — waylays you after the sitting with a small gift and large praise: your wisdom, your justice, your very profile on the coinage. He wants something, of course. They always do.',
  options:[
    { label:'Receive him graciously.', desc:'Flattery is cheap; let him feel heard.', effects:{ gold:8, prestige:2, custom:'council_flatter_kind' } },
    { label:'Send the flatterer off.', desc:'A king who feeds sycophants breeds them.', effects:{ custom:'council_flatter_cold' } }
  ]},
{ id:'council_gift', title:'A Token of Esteem',
  trigger:{ tierMin:6, custom:'council_has_sycophant', chance:0.12 }, weight:5, cooldown:8,
  text:'A devoted councillor sends a casket to your chamber: silver, and a letter protesting — at tedious length — that loyalty like his needs no reward. It is, of course, itemized.',
  options:[
    { label:'Accept with thanks.', desc:'Coin is coin, whatever the motive.', effects:{ gold:20, custom:'council_gift_take' } },
    { label:'Decline it with honor.', desc:'Some gifts cost more than they pay.', effects:{ prestige:3, custom:'council_gift_wave' } }
  ]},
{ id:'council_petition', title:'A Councillor’s Suit',
  trigger:{ tierMin:6, custom:'council_has_members', chance:0.13 }, weight:6, cooldown:6,
  text:'One of the great officers lingers after the business is done: his roof timbers are rotten, his second son needs a company of spears, his cousin’s widow — it hardly matters. Office, he hints, should carry some profit.',
  options:[
    { label:'Open the purse. (20 gold)', require:{ goldMin:20 }, desc:'A bought friend is still a friend.', effects:{ gold:-20, custom:'council_pet_grant' } },
    { label:'Sympathy, and nothing else.', desc:'The treasury is not a tit for officers.', effects:{ custom:'council_pet_deny' } }
  ]},
{ id:'council_demand_office', title:'The Empty Chair',
  trigger:{ tierMin:6, custom:'council_has_unseated', chance:0.12 }, weight:6, cooldown:8,
  text:'An ambitious vassal makes his case in public, voice carrying: has he not served? Is his house not great? Every eye at court turns to see whether the crown rewards merit — or can be seen to refuse it.',
  options:[
    { label:'Raise him to the council.', desc:'Better a schemer watched at your board than whispering in his hall.', effects:{ custom:'council_seat_demand_yes' } },
    { label:'Refuse him, coldly.', desc:'The crown gives; it is not taken from.', effects:{ custom:'council_seat_demand_no', prestige:2 } }
  ]},

/* ---- the schemers: ambition with a grievance ---- */
{ id:'council_scheme_discovered', title:'The Chamberlain’s Whisper',
  trigger:{ tierMin:6, custom:'council_scheme_watched', chance:0.12 }, weight:7, cooldown:6,
  text:'Your Chamberlain asks for a private word, and lays it out with a clerk’s calm: letters intercepted, retainers quietly paid, a seat at your board measuring you for a shroud. One of your own great officers weaves against the crown.',
  options:[
    { label:'Drag him from the board in disgrace.', desc:'Let every magnate watch what becomes of plotters.', effects:{ custom:'council_scheme_punish', prestige:2 } },
    { label:'Show him you know — and spare him.', desc:'A forgiven traitor is a debtor for life. Usually.', effects:{ custom:'council_scheme_mercy', prestige:-2 } }
  ]},
{ id:'council_scheme_strikes', title:'Knives in the Dark',
  trigger:{ tierMin:6, custom:'council_scheme_ripe', chance:0.12 }, weight:7, cooldown:6,
  text:'It begins with small things: a tax convoy that never arrives, your orders mysteriously delayed, a song about the king’s weakness in the ale-houses of your own capital. Somewhere on your council, ambition has stopped waiting.',
  options:[
    { label:'Hunt the spider yourself.', desc:'Your own agents against his — intrigue answers intrigue.', chance:'skill_int',
      success:{ text:'Your agents bring you names, letters, witnesses. The spider sits at your own board — and now the whole court knows it.', effects:{ custom:'council_scheme_rooted', prestige:3 } },
      failure:{ text:'Your agents find only dead ends and dead witnesses. The whispers grow bolder, and the treasury lighter.', effects:{ gold:-25, prestige:-6 } } },
    { label:'Endure it.', desc:'A crown that jumps at shadows looks afraid of everything.', effects:{ gold:-20, prestige:-5, custom:'council_scheme_fest' } }
  ]},

/* ---- the charter: how barons limit a king ---- */
{ id:'council_charter', title:'The Charter of Liberties',
  trigger:{ tierMin:6, custom:'council_charter_due', chance:0.4 }, weight:9, cooldown:12,
  text:'They come to you together — the whole council, unsmiling, with a parchment already drafted. Extraordinary taxes without consent. Revocations without judgment. They ask — the word "ask" doing heavy work — that the crown bind itself by charter to govern with its great officers, as kings are meant to govern.',
  options:[
    { label:'Seal the charter.', desc:'Yield a little power now, keep the crown and their love.', effects:{ custom:'council_charter_seal', prestige:-5, log:'Sealed a charter of liberties for the great council.' } },
    { label:'Tear it up before their faces.', desc:'The crown answers to God, not to its own servants.', chance:0.5,
      success:{ text:'A long, dangerous silence — and then they kneel, one by one. The crown stands alone, and stands supreme. They will remember this.', effects:{ custom:'council_defy_hold', prestige:5 } },
      failure:{ text:'The eldest of them picks up the pieces, bows with insulting correctness, and rides home. Within the month, his defiance is armed.', effects:{ custom:'council_defy_fail' } } }
  ]},

/* ---- the working council ---- */
{ id:'council_feud', title:'Quarrel at the Board',
  trigger:{ tierMin:6, custom:'council_two_members', chance:0.12 }, weight:5, cooldown:8,
  text:'Two of your great officers have not spoken in a month, and today the quarrel spills onto the council table — an old boundary, an older insult, voices rising. Both look to you. Both will remember who you favored.',
  options:[
    { label:'Side with the one in the right.', desc:'Justice first; the loser must swallow it.', effects:{ custom:'council_feud_side' } },
    { label:'Make them shake hands like children.', desc:'A king’s patience, firmly applied.', chance:'skill_dip',
      success:{ text:'You talk them around the table and out the far side of it. They leave laughing — at you, a little, but together.', effects:{ custom:'council_feud_peace', prestige:3 } },
      failure:{ text:'Your mediation convinces each that you favor the other. Masterful.', effects:{ custom:'council_feud_fail' } } }
  ]},
{ id:'council_war_chest', title:'A Subsidy for the War',
  trigger:{ tierMin:6, atWar:true, custom:'council_has_members', chance:0.3 }, wartime:true, weight:7, cooldown:3,
  text:'The great officers sit in council on the war: the realm bleeds, they say, and the realm’s silver should bleed with it. They offer a subsidy from their own coffers — for the duration, and not, they make clear, as a precedent. It is absolutely a precedent.',
  options:[
    { label:'Take the subsidy gratefully.', desc:'Their gold, their strings — but the war needs both.', effects:{ custom:'council_war_chest' } },
    { label:'Refuse: the crown funds its own wars.', desc:'Independence is bought one refusal at a time.', effects:{ prestige:3 } }
  ]},
{ id:'council_wise_counsel', title:'Good Counsel',
  trigger:{ tierMin:6, custom:'council_has_members', chance:0.10 }, weight:4, cooldown:8,
  text:'For once, the council earns its keep: the Seneschal’s tidy ledgers, the Almoner’s quiet wisdom, a long evening of actual governance. It is almost pleasant. You understand why your grandfather drank.',
  options:[
    { label:'Note it, and them, with favor.', desc:'Good servants should know they are seen.', effects:{ prestige:3, research:5 } }
  ]}
);
