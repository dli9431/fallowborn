/* =========================================================================
   Fallowborn — TUTORIAL CHAIN: three code-queued chapters for a new life
   =========================================================================
   The scripted companion to the staged checklist tracks (TUTORIAL_TRACKS in
   js/main.js). Every event here is trigger:{never:true} and queued only from
   FB.tutorialCheck: tut_welcome a couple of days into the life, tut_legacy
   when Family & legacy completes through play (an already-established
   marriage silently skips it), and tut_livelihood when the lower-rank
   Making-a-living track completes. Once per first campaign; unfinished stage
   flags follow the household through succession while other life-local flags
   reset, so a child or collateral heir resumes the remaining lesson. Options
   are small and all-positive so autoresolve scores them sanely. See
   docs/designs/events.md. */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

{ id:'tut_welcome', title:'A Neighbor’s Welcome', once:true,
  trigger:{ never:true },
  text:'A new face is news in a place like this. Before the first week is out, a neighbor is at the door with a loaf of bread and a lifetime of advice: the days flow on their own once you let them; a daily focus bends them toward your purpose; a deed is done once and done with; and when the world brings you a choice, time itself will wait for your answer.',
  options:[
    { label:'Take the bread — and the advice.', desc:'A focus for every day; a deed when the day calls for it. Let the days flow, and answer what they bring you.',
      effects:{ prestige:1, log:'Welcomed to the neighborhood with bread and good counsel.' } },
    { label:'Thank them, and keep your own counsel.', desc:'The same lessons, heard with a polite nod and a closed door.',
      effects:{ piety:1 } }
  ]},

{ id:'tut_livelihood', title:'The Fruits of Labor', once:true,
  trigger:{ never:true },
  text:'The work of your hands is beginning to tell. Coin gathers a little at a time — a livelihood pays season by season, an enterprise grows what it touches, and land underpins it all. And silver spent well buys more than things: freedom, favor, and a name that opens doors.',
  options:[
    { label:'Put every lesson to work.', desc:'Steady work, steady coin — and a name for reliability.',
      effects:{ prestige:1, log:'Made a name for steady work.' } },
    { label:'Set aside what can be spared.', desc:'A coin saved is a coin toward the next door.',
      effects:{ gold:1 } }
  ]},

{ id:'tut_legacy', title:'What Outlives a Life', once:true,
  trigger:{ never:true },
  text:'By the fire, when the day’s work is done, the thought comes unbidden: a life is short, but a house endures. The children who carry your name will inherit more than your goods — your standing, your grudges, your chronicle. What you begin, they will continue; what you become, they will remember.',
  options:[
    { label:'Vow to build something worth inheriting.', desc:'The chronicle is only beginning.',
      effects:{ prestige:1, log:'Vowed to raise a house worth remembering.' } },
    { label:'Say a prayer for those who come after.', desc:'Bless the line, and the road ahead of it.',
      effects:{ piety:2 } }
  ]}

);
