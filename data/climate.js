/* =========================================================================
   Fallowborn - CLIMATE ZONES AND SEASON KINDS
   =========================================================================
   The calendar is global: state.date.season counts 0 to 3 for every county
   and the top bar names it. What a season means on the ground is local. A
   climate zone maps the four calendar seasons to season kinds, and a
   geography base assigns a zone to each county (data/geographies.js).

   Engine rules ask for a county's local season kind and read the kind's
   properties instead of the calendar index:
   - hardship: armies in the field draw extra supply
     (balance.supplyWinterDrainMult).
   - fairWeather: outdoor games may open (scheduled tournaments).
   Event triggers name kinds with seasonKinds, evaluated at the player's
   county. The legacy index trigger seasons:[0..3] still reads the calendar.

   Zones other than northern_temperate are placeholders that keep today's
   behavior on the regional Europe base; assigning real regional climates is
   content work for a bookmark's geography. southern_temperate turns the
   calendar half a year around. Season kinds and zones are derived, never
   saved. See docs/MODDING.md (Climate zones).
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.seasonKinds = {
  spring:{ name:'Spring', fairWeather:true },
  summer:{ name:'Summer', fairWeather:true },
  autumn:{ name:'Autumn' },
  winter:{ name:'Winter', hardship:true }
};

/* seasons lists the season kind of calendar seasons 0 (Spring) to 3
   (Winter) in order. */
FBDATA.climateZones = {
  northern_temperate:{ name:'Northern temperate',
    seasons:['spring', 'summer', 'autumn', 'winter'] },
  mediterranean:{ name:'Mediterranean',
    seasons:['spring', 'summer', 'autumn', 'winter'] },
  arid:{ name:'Arid',
    seasons:['spring', 'summer', 'autumn', 'winter'] },
  steppe:{ name:'Steppe',
    seasons:['spring', 'summer', 'autumn', 'winter'] },
  southern_temperate:{ name:'Southern temperate',
    seasons:['autumn', 'winter', 'spring', 'summer'] }
};

/* The zone of a county whose geography base assigns none. */
FBDATA.defaultClimateZone = 'northern_temperate';
