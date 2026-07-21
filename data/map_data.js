/* =========================================================================
   Fallowborn — MAP DATA (moddable)
   =========================================================================
   All coordinates are real-world [longitude, latitude] pairs. The engine
   projects them (Mercator) onto the game grid, so you can add or move
   provinces just by looking up a city on any real map.

   - bounds:      the lon/lat window of the playable world
   - land:        polygons of land (flat arrays: lon,lat,lon,lat,...)
   - seas:        polygons CARVED OUT of land (inland seas: Caspian etc.)
   - rivers:      decorative polylines
   - provinces:   seed points; province shapes are generated automatically
                  (every land pixel joins its nearest seed — no polygon
                  drawing needed to mod the map!)
   - realms:      starting realms of 867 AD
   - straits:     extra adjacency across water [provinceId, provinceId]
   - scripted:    dated historical invasions that spawn realms
   See docs/MODDING.md for the full reference.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.bounds = { lonMin: -11, lonMax: 70, latMin: 13, latMax: 66 };

FBDATA.land = [
/* ---- The great mainland: Africa + Europe + Asia in one polygon.
        Traced from Ceuta east along North Africa, around the Levant,
        Anatolia, Black Sea, Aegean, Adriatic, Italy, up western Europe,
        around the Baltic and Scandinavia, closing via map edges. ---- */
[
  -5.3,35.85, -3.0,35.3, -0.6,35.7, 3.1,36.8, 5.1,36.75, 7.8,36.9,
  9.9,37.3, 11.1,36.8, 10.6,36.4, 10.6,35.8, 10.8,34.7, 10.1,33.9,
  11.0,33.5, 13.2,32.9, 15.3,31.6, 17.5,31.1, 19.3,30.3, 20.1,32.1,
  21.7,32.9, 22.6,32.8, 24.0,32.1, 25.5,31.6, 27.2,31.2, 29.9,31.2,
  31.0,31.6, 32.3,31.2, 33.8,31.15, 34.3,31.5, 34.75,32.1, 35.0,32.8,
  35.2,33.3, 35.5,33.9, 35.85,34.45, 35.8,35.5, 36.0,36.2, 35.6,36.6,
  34.6,36.8, 33.6,36.2, 32.8,36.0, 31.5,36.6, 30.7,36.85, 29.5,36.5,
  28.3,36.8, 27.4,37.05, 27.2,37.7, 27.1,38.4, 26.3,38.4, 26.9,39.0,
  26.2,39.4, 26.2,39.95, 27.0,40.35, 28.0,40.35, 29.3,40.45, 29.25,40.9,
  29.4,41.15, 30.5,41.2, 31.8,41.45, 33.4,41.9, 35.15,42.03, 36.3,41.3,
  38.0,40.95, 39.7,41.0, 41.6,41.65, 41.6,42.15, 40.0,43.4, 38.5,44.3,
  37.8,44.7, 36.6,45.2, 35.4,45.0, 34.2,44.5, 33.5,44.55, 32.5,45.2,
  33.0,45.9, 32.5,46.1, 31.5,46.3, 30.7,46.5, 30.3,46.15, 29.7,45.2,
  28.8,44.6, 28.6,44.2, 27.9,43.2, 27.5,42.5, 28.1,41.5, 29.0,41.15,
  28.85,40.97, 27.9,40.97, 26.7,40.4, 26.1,40.6, 25.9,40.85, 24.4,40.9,
  23.9,40.55, 23.3,40.25, 22.9,40.5, 22.6,39.9, 23.0,39.35, 23.3,39.1,
  23.6,38.9, 24.05,38.5, 23.7,37.95, 23.15,37.9, 23.1,37.4, 23.2,36.4,
  22.5,36.55, 22.1,36.9, 21.7,36.8, 21.3,37.3, 21.7,38.25, 22.9,38.05,
  22.4,38.35, 21.8,38.45, 21.1,38.6, 20.75,38.95, 20.2,39.5, 20.0,39.9,
  19.4,40.45, 19.4,41.3, 19.1,42.1, 18.1,42.65, 16.4,43.5, 15.2,44.1,
  14.4,45.3, 13.9,44.8, 13.6,45.15, 13.75,45.65, 12.5,45.45, 12.4,44.9,
  12.3,44.4, 12.6,44.05, 13.5,43.6, 14.7,42.1, 15.9,41.9, 16.2,41.7,
  16.9,41.1, 18.0,40.65, 18.5,40.1, 18.35,39.8, 17.2,40.45, 16.6,40.0,
  16.5,39.7, 17.1,39.1, 16.1,38.2, 15.65,38.05, 15.9,38.7, 15.5,39.5,
  14.95,40.2, 14.75,40.65, 14.25,40.85, 13.6,41.2, 12.2,41.7, 11.8,42.1,
  10.5,42.9, 10.3,43.5, 9.8,44.05, 8.9,44.4, 8.5,44.3, 7.3,43.7,
  6.6,43.15, 5.9,43.1, 5.35,43.3, 4.8,43.35, 4.4,43.45, 3.9,43.5,
  3.0,43.15, 3.05,42.5, 3.2,41.9, 2.15,41.35, 1.1,41.05, 0.7,40.7,
  0.2,40.1, -0.3,39.45, -0.5,38.35, -1.0,37.6, -2.4,36.85, -4.4,36.7,
  -5.35,36.2, -6.3,36.5, -7.0,37.15, -8.9,37.0, -9.0,37.35, -8.8,38.4,
  -9.2,38.65, -9.5,38.75, -9.0,39.5, -8.9,40.15, -8.7,41.15, -8.9,42.2,
  -9.3,42.9, -8.4,43.4, -7.0,43.55, -5.7,43.55, -3.8,43.45, -3.0,43.35,
  -1.6,43.45, -1.3,44.5, -1.1,45.6, -1.15,46.15, -2.1,46.9, -2.2,47.25,
  -3.1,47.55, -4.4,47.8, -4.75,48.35, -3.5,48.75, -2.0,48.65, -1.6,48.65,
  -1.6,49.7, -0.4,49.35, 0.1,49.45, 1.55,50.2, 1.85,50.95, 2.35,51.05,
  3.5,51.4, 4.05,51.95, 4.75,52.95, 5.9,53.3, 6.7,53.45, 8.5,53.55,
  8.7,53.9, 8.1,55.55, 8.2,56.7, 8.6,57.1, 9.6,57.6, 10.6,57.75,
  10.4,56.9, 10.2,56.15, 9.8,55.3, 9.5,55.0, 9.45,54.8, 10.15,54.35,
  11.0,53.95, 12.1,54.1, 13.0,54.35, 13.9,54.05, 14.6,53.8, 15.6,54.2,
  16.9,54.55, 18.65,54.35, 19.4,54.75, 19.9,54.95, 21.1,55.7, 21.0,56.5,
  21.5,57.0, 23.6,56.95, 24.1,57.0, 24.4,57.9, 24.5,58.4, 23.5,58.65,
  24.75,59.45, 26.5,59.45, 28.2,59.45, 30.3,59.9, 28.7,60.7, 26.6,60.4,
  24.95,60.15, 23.0,59.85, 22.3,60.45, 21.8,61.5, 21.6,63.1, 22.5,64.2,
  25.5,65.0, 24.5,65.75, 22.1,65.6, 20.3,63.8, 18.3,62.8, 17.3,62.4,
  17.2,60.7, 18.6,60.2, 18.1,59.3, 17.0,58.9, 16.3,58.6, 16.4,56.7,
  15.6,56.2, 14.2,55.8, 13.8,55.4, 13.0,55.6, 12.7,56.05, 12.85,56.7,
  11.95,57.7, 11.2,58.35, 11.2,59.0, 10.9,59.2, 10.7,59.9, 10.0,59.0,
  9.0,58.6, 8.0,58.15, 5.7,58.95, 5.3,60.4, 5.0,61.5, 6.2,62.5,
  7.7,63.1, 9.5,63.6, 11.5,64.45, 13.0,65.3, 14.0,66.0,
  /* ---- east of 867: Arctic Russia, the steppe frontier, down the map
     edge past the Indus mouth, then west along the Makran coast to
     Hormuz and around Oman to Bab el-Mandeb ---- */
  28.0,66.0, 40.0,66.0, 55.0,66.0, 70.0,66.0,
  70.0,24.4, 68.4,23.9, 67.3,24.7, 66.5,25.2,
  64.6,25.2, 62.3,25.1, 61.0,25.3,
  57.8,25.6, 56.5,26.6,
  57.5,25.0, 58.5,24.0, 59.8,22.5,
  58.0,20.3, 55.5,17.2, 52.5,15.6, 50.0,15.0,
  47.5,14.3, 45.0,13.4, 44.0,13.1, 43.5,12.9,
  43.5,13.0, -11.0,13.0, -11.0,28.3,
  -10.3,29.0, -9.7,30.4, -9.8,31.5, -9.2,32.3, -7.6,33.6, -6.85,34.05,
  -5.9,35.75
],
/* ---- Britain ---- */
[
  -5.6,50.05, -4.6,50.9, -3.9,51.2, -5.1,51.7, -4.4,52.3, -4.7,52.9,
  -4.6,53.3, -3.0,53.45, -3.05,53.9, -2.9,54.05, -3.6,54.5, -3.6,54.9,
  -4.9,54.7, -5.1,55.0, -5.6,55.4, -5.4,56.4, -5.9,57.5, -5.7,58.6,
  -4.4,58.55, -3.1,58.65, -4.0,57.7, -2.1,57.7, -2.1,57.15, -2.8,56.4,
  -3.3,56.05, -2.0,55.75, -1.6,55.0, -0.4,54.3, -0.1,53.6, 0.35,53.1,
  0.2,52.9, 0.9,52.95, 1.7,52.75, 1.75,52.45, 1.6,52.1, 0.7,51.5,
  1.4,51.15, 0.3,50.75, -0.9,50.8, -1.9,50.6, -3.5,50.45, -4.1,50.35
],
/* ---- Ireland ---- */
[
  -6.2,53.35, -6.0,52.95, -6.4,52.3, -7.1,52.1, -8.5,51.6, -9.8,51.5,
  -10.3,52.0, -9.7,52.6, -9.5,53.25, -10.0,53.4, -9.9,54.1, -8.5,54.3,
  -8.4,54.65, -8.3,55.2, -7.4,55.35, -6.0,55.2, -5.9,54.6
],
/* ---- Sicily ---- */
[ 15.6,38.25, 13.35,38.15, 12.5,38.0, 12.45,37.8, 13.6,37.25, 15.15,36.95, 15.3,37.5 ],
/* ---- Sardinia ---- */
[ 8.4,40.85, 9.2,41.25, 9.6,40.9, 9.7,40.0, 9.5,39.1, 9.0,38.9, 8.4,38.9, 8.4,39.75, 8.15,40.6 ],
/* ---- Corsica ---- */
[ 9.35,43.0, 9.55,42.1, 9.2,41.35, 8.6,41.55, 8.6,42.35, 9.0,42.65 ],
/* ---- Crete ---- */
[ 23.55,35.3, 24.5,35.4, 25.7,35.35, 26.3,35.2, 25.5,34.95, 24.5,34.95, 23.6,35.1 ],
/* ---- Cyprus ---- */
[ 32.3,35.15, 33.0,35.35, 34.55,35.65, 33.9,35.0, 33.0,34.6, 32.4,34.75 ],
/* ---- Zealand (Denmark) ---- */
[ 11.1,55.65, 11.75,55.95, 12.05,56.0, 12.65,55.6, 12.1,55.15, 11.3,55.2 ],
/* ---- Gotland ---- */
[ 18.1,57.1, 18.35,57.45, 19.0,57.9, 18.8,57.4, 18.3,56.9 ],
/* ---- Mallorca ---- */
[ 2.35,39.55, 3.2,39.85, 3.45,39.7, 3.0,39.3, 2.4,39.45 ]
];

/* Inland seas carved OUT of land polygons */
FBDATA.seas = [
/* Caspian */
[ 48.5,46.9, 51.5,46.8, 53.3,45.5, 53.0,42.0, 53.9,38.5, 53.5,36.9,
  51.9,36.55, 50.2,36.7, 49.0,37.5, 49.2,39.5, 49.5,40.5, 48.4,41.8,
  47.9,43.5, 47.4,45.3 ],
/* Persian Gulf through the Strait of Hormuz */
[ 48.3,30.2, 49.9,30.0, 51.6,29.5, 53.6,28.6, 55.0,27.3, 56.4,26.6,
  57.5,26.0, 56.8,25.1, 55.6,25.6, 54.0,26.0, 52.5,24.6, 51.3,24.6,
  51.9,25.6, 50.8,25.9, 50.2,26.3, 49.8,27.4, 48.6,29.2, 47.9,29.9 ],
/* Red Sea to Bab el-Mandeb */
[ 32.6,29.95, 33.3,28.5, 34.3,27.5, 34.6,28.2, 35.0,29.3, 35.4,28.7,
  35.5,27.5, 36.5,26.0, 37.8,24.5, 39.1,22.3, 40.1,19.8, 41.8,16.0,
  43.4,13.0, 40.4,13.0, 40.0,15.5, 38.5,18.5, 37.0,21.0, 35.5,24.0,
  34.0,26.5, 33.2,27.8, 32.2,29.5 ],
/* Sea of Azov */
[ 34.9,45.9, 35.8,45.4, 36.9,45.4, 38.2,46.3, 39.2,47.2, 37.5,46.9, 35.3,46.2 ],
/* White Sea */
[ 32.0,66.0, 33.5,65.3, 34.8,64.8, 36.2,64.2, 36.8,63.8, 34.5,63.6,
  32.8,64.2, 31.8,65.0 ]
];

/* Decorative rivers: flat [lon,lat,...] polylines */
FBDATA.rivers = [
[ 32.9,24.0, 32.7,25.5, 31.3,27.5, 31.1,29.0, 31.2,30.1, 31.0,31.4 ],            /* Nile */
[ 8.2,48.1, 10.2,48.6, 13.0,48.6, 16.4,48.15, 18.9,47.8, 19.0,46.0, 20.3,45.3,
  22.7,44.7, 25.6,43.9, 28.0,44.4, 29.7,45.2 ],                                   /* Danube */
[ 7.6,47.55, 7.75,48.55, 8.3,50.0, 6.95,50.95, 5.5,51.6, 4.1,51.95 ],            /* Rhine */
[ 4.3,48.3, 3.4,48.6, 2.35,48.85, 1.1,49.4, 0.1,49.45 ],                          /* Seine */
[ 7.7,45.05, 9.7,45.05, 11.6,44.95, 12.4,44.95 ],                                 /* Po */
[ -4.3,42.8, -2.6,42.6, -0.9,41.65, 0.5,41.0, 0.85,40.7 ],                        /* Ebro */
[ 30.5,54.8, 30.9,53.0, 30.5,50.45, 32.5,49.0, 34.0,48.4, 35.0,47.85, 33.4,47.0,
  32.2,46.6, 31.5,46.35 ],                                                        /* Dnieper */
[ 36.0,56.8, 43.0,56.3, 49.1,55.8, 46.0,53.0, 44.5,48.7, 46.0,46.3, 47.6,45.9 ], /* Volga */
[ 38.5,54.0, 39.5,52.0, 40.5,50.0, 39.8,48.0, 39.2,47.3 ],                        /* Don */
[ 27.0,49.5, 28.0,48.4, 29.0,47.6, 30.2,46.3 ],                                   /* Dniester */
[ 41.2,38.1, 43.1,36.3, 44.4,33.9, 45.5,32.5, 47.5,31.0 ],                        /* Tigris */
[ 38.7,38.3, 38.0,36.9, 40.0,35.5, 41.7,34.6, 43.5,33.8, 46.0,31.8, 47.5,31.0 ], /* Euphrates */
[ 4.85,46.8, 4.85,45.75, 4.8,44.1, 4.6,43.5 ]                                     /* Rhone */
];

/* =========================================================================
   PROVINCES — the world of 867 AD, ONE HISTORICAL COUNTY PER PROVINCE
   (~460 counties + wastelands). The county table lives in data/counties.js
   (loaded right after this file) and expands itself into FBDATA.provinces
   as {id, name, x, y, duchy, realm, culture, religion, terrain, dev}
   objects (wasteland rows: {id, name, x, y, wasteland:true, terrain}).
   ========================================================================= */

/* =========================================================================
   DE JURE HIERARCHY of 867 AD: counties → duchies → kingdoms → empires.
   Counties name their duchy (data/counties.js); the rest is derived.
   ========================================================================= */
FBDATA.empires = {
  e_hispania:{ name:'Hispania' }, e_francia:{ name:'Francia' },
  e_italia:{ name:'Italia' }, e_britannia:{ name:'Britannia' },
  e_scandinavia:{ name:'Scandinavia' }, e_carpathia:{ name:'Carpathia' },
  e_russia:{ name:'Russia' }, e_byzantium:{ name:'Byzantium' },
  e_arabia:{ name:'Arabia' }, e_persia:{ name:'Persia' }, e_kush:{ name:'Kush' }
};

FBDATA.kingdoms = {
  k_andalusia:{ name:'Andalusia', empire:'e_hispania' },
  k_asturias:{ name:'Asturias', empire:'e_hispania' },
  k_navarra:{ name:'Navarra', empire:'e_hispania' },
  k_west_francia:{ name:'West Francia', empire:'e_francia' },
  k_brittany:{ name:'Brittany', empire:'e_francia' },
  k_aquitaine:{ name:'Aquitaine', empire:'e_francia' },
  k_burgundy:{ name:'Burgundy', empire:'e_francia' },
  k_lotharingia:{ name:'Lotharingia', empire:'e_francia' },
  k_east_francia:{ name:'East Francia', empire:'e_francia' },
  k_italy:{ name:'Italy', empire:'e_italia' },
  k_england:{ name:'England', empire:'e_britannia' },
  k_wales:{ name:'Wales', empire:'e_britannia' },
  k_alba:{ name:'Alba', empire:'e_britannia' },
  k_ireland:{ name:'Ireland', empire:'e_britannia' },
  k_norway:{ name:'Norway', empire:'e_scandinavia' },
  k_sweden:{ name:'Sweden', empire:'e_scandinavia' },
  k_denmark:{ name:'Denmark', empire:'e_scandinavia' },
  k_moravia:{ name:'Moravia', empire:'e_carpathia' },
  k_bohemia:{ name:'Bohemia', empire:'e_carpathia' },
  k_poland:{ name:'Poland', empire:'e_carpathia' },
  k_pannonia:{ name:'Pannonia', empire:'e_carpathia' },
  k_novgorod:{ name:'Novgorod', empire:'e_russia' },
  k_rus:{ name:'Rus', empire:'e_russia' },
  k_lithuania:{ name:'Lithuania', empire:'e_russia' },
  k_finland:{ name:'Finland', empire:'e_russia' },
  k_khazaria:{ name:'Khazaria', empire:'e_russia' },
  k_volga:{ name:'Volga', empire:'e_russia' },
  k_hellas:{ name:'Hellas', empire:'e_byzantium' },
  k_anatolia:{ name:'Anatolia', empire:'e_byzantium' },
  k_bulgaria:{ name:'Bulgaria', empire:'e_byzantium' },
  k_serbia:{ name:'Serbia', empire:'e_byzantium' },
  k_croatia:{ name:'Croatia', empire:'e_byzantium' },
  k_armenia:{ name:'Armenia', empire:'e_byzantium' },
  k_georgia:{ name:'Georgia', empire:'e_byzantium' },
  k_ifriqiya:{ name:'Ifriqiya', empire:'e_arabia' },
  k_maghreb:{ name:'Maghreb', empire:'e_arabia' },
  k_egypt:{ name:'Egypt', empire:'e_arabia' },
  k_syria:{ name:'Syria', empire:'e_arabia' },
  k_jazira:{ name:'Jazira', empire:'e_arabia' },
  k_iraq:{ name:'Iraq', empire:'e_arabia' },
  k_arabia:{ name:'Arabia', empire:'e_arabia' },
  k_yemen:{ name:'Yemen', empire:'e_arabia' },
  k_oman:{ name:'Oman', empire:'e_arabia' },
  k_jibal:{ name:'Jibal', empire:'e_persia' },
  k_fars:{ name:'Fars', empire:'e_persia' },
  k_khorasan:{ name:'Khorasan', empire:'e_persia' },
  k_daylam:{ name:'Daylam', empire:'e_persia' },
  k_sindh:{ name:'Sindh', empire:'e_persia' },
  k_makuria:{ name:'Makuria', empire:'e_kush' },
  k_abyssinia:{ name:'Abyssinia', empire:'e_kush' }
};

FBDATA.duchies = {
  /* Hispania */
  d_galicia:{ name:'Galicia', kingdom:'k_asturias' },
  d_asturias:{ name:'Asturias', kingdom:'k_asturias' },
  d_castilla:{ name:'Castilla', kingdom:'k_asturias' },
  d_salamanca:{ name:'Salamanca', kingdom:'k_asturias' },
  d_navarra:{ name:'Navarra', kingdom:'k_navarra' },
  d_sevilla:{ name:'Sevilla', kingdom:'k_andalusia' },
  d_granada:{ name:'Granada', kingdom:'k_andalusia' },
  d_toledo:{ name:'Toledo', kingdom:'k_andalusia' },
  d_badajoz:{ name:'Badajoz', kingdom:'k_andalusia' },
  d_lisboa:{ name:'Lisboa', kingdom:'k_andalusia' },
  d_algarve:{ name:'Algarve', kingdom:'k_andalusia' },
  d_valencia:{ name:'Valencia', kingdom:'k_andalusia' },
  d_tortosa:{ name:'Tortosa', kingdom:'k_andalusia' },
  d_zaragoza:{ name:'Zaragoza', kingdom:'k_andalusia' },
  d_baleares:{ name:'Baleares', kingdom:'k_andalusia' },
  d_barcelona:{ name:'Barcelona', kingdom:'k_andalusia' },
  /* Francia */
  d_ile:{ name:'Île-de-France', kingdom:'k_west_francia' },
  d_normandy:{ name:'Normandy', kingdom:'k_west_francia' },
  d_anjou:{ name:'Anjou', kingdom:'k_west_francia' },
  d_blois:{ name:'Blois', kingdom:'k_west_francia' },
  d_champagne:{ name:'Champagne', kingdom:'k_west_francia' },
  d_vermandois:{ name:'Vermandois', kingdom:'k_west_francia' },
  d_flanders:{ name:'Flanders', kingdom:'k_west_francia' },
  d_brittany:{ name:'Brittany', kingdom:'k_brittany' },
  d_penthievre:{ name:'Penthièvre', kingdom:'k_brittany' },
  d_aquitaine:{ name:'Aquitaine', kingdom:'k_aquitaine' },
  d_poitou:{ name:'Poitou', kingdom:'k_aquitaine' },
  d_toulouse:{ name:'Toulouse', kingdom:'k_aquitaine' },
  d_auvergne:{ name:'Auvergne', kingdom:'k_aquitaine' },
  d_gascogne:{ name:'Gascogne', kingdom:'k_aquitaine' },
  d_narbonne:{ name:'Narbonne', kingdom:'k_aquitaine' },
  d_burgundy:{ name:'Burgundy', kingdom:'k_burgundy' },
  d_lyonnais:{ name:'Lyonnais', kingdom:'k_burgundy' },
  d_provence:{ name:'Provence', kingdom:'k_burgundy' },
  d_savoy:{ name:'Savoy', kingdom:'k_burgundy' },
  d_lorraine:{ name:'Lorraine', kingdom:'k_lotharingia' },
  d_alsace:{ name:'Alsace', kingdom:'k_lotharingia' },
  d_luxembourg:{ name:'Luxembourg', kingdom:'k_lotharingia' },
  d_frisia:{ name:'Frisia', kingdom:'k_lotharingia' },
  d_franconia:{ name:'Franconia', kingdom:'k_east_francia' },
  d_swabia:{ name:'Swabia', kingdom:'k_east_francia' },
  d_bavaria:{ name:'Bavaria', kingdom:'k_east_francia' },
  d_ostmark:{ name:'Ostmark', kingdom:'k_east_francia' },
  d_carantania:{ name:'Carantania', kingdom:'k_east_francia' },
  d_saxony:{ name:'Saxony', kingdom:'k_east_francia' },
  d_thuringia:{ name:'Thuringia', kingdom:'k_east_francia' },
  d_rhineland:{ name:'Rhineland', kingdom:'k_east_francia' },
  /* Italia */
  d_piedmont:{ name:'Piedmont', kingdom:'k_italy' },
  d_lombardy:{ name:'Lombardy', kingdom:'k_italy' },
  d_verona:{ name:'Verona', kingdom:'k_italy' },
  d_veneto:{ name:'Veneto', kingdom:'k_italy' },
  d_friuli:{ name:'Friuli', kingdom:'k_italy' },
  d_emilia:{ name:'Emilia', kingdom:'k_italy' },
  d_tuscany:{ name:'Tuscany', kingdom:'k_italy' },
  d_spoleto:{ name:'Spoleto', kingdom:'k_italy' },
  d_roma:{ name:'Roma', kingdom:'k_italy' },
  d_benevento:{ name:'Benevento', kingdom:'k_italy' },
  d_apulia:{ name:'Apulia', kingdom:'k_italy' },
  d_calabria:{ name:'Calabria', kingdom:'k_italy' },
  d_sicily:{ name:'Sicily', kingdom:'k_italy' },
  d_sardinia:{ name:'Sardinia', kingdom:'k_italy' },
  d_corsica:{ name:'Corsica', kingdom:'k_italy' },
  /* Britannia */
  d_wessex:{ name:'Wessex', kingdom:'k_england' },
  d_devon:{ name:'Devon', kingdom:'k_england' },
  d_kent:{ name:'Kent', kingdom:'k_england' },
  d_essex:{ name:'Essex', kingdom:'k_england' },
  d_sussex:{ name:'Sussex', kingdom:'k_england' },
  d_mercia:{ name:'Mercia', kingdom:'k_england' },
  d_hwicce:{ name:'Hwicce', kingdom:'k_england' },
  d_east_anglia:{ name:'East Anglia', kingdom:'k_england' },
  d_lindsey:{ name:'Lindsey', kingdom:'k_england' },
  d_northampton:{ name:'Northampton', kingdom:'k_england' },
  d_york:{ name:'York', kingdom:'k_england' },
  d_northumbria:{ name:'Northumbria', kingdom:'k_england' },
  d_chester:{ name:'Chester', kingdom:'k_england' },
  d_gwynedd:{ name:'Gwynedd', kingdom:'k_wales' },
  d_deheubarth:{ name:'Deheubarth', kingdom:'k_wales' },
  d_glamorgan:{ name:'Glamorgan', kingdom:'k_wales' },
  d_alba:{ name:'Alba', kingdom:'k_alba' },
  d_moray:{ name:'Moray', kingdom:'k_alba' },
  d_lothian:{ name:'Lothian', kingdom:'k_alba' },
  d_strathclyde:{ name:'Strathclyde', kingdom:'k_alba' },
  d_galloway:{ name:'Galloway', kingdom:'k_alba' },
  d_isles:{ name:'The Isles', kingdom:'k_alba' },
  d_ulster:{ name:'Ulster', kingdom:'k_ireland' },
  d_meath:{ name:'Meath', kingdom:'k_ireland' },
  d_leinster:{ name:'Leinster', kingdom:'k_ireland' },
  d_connacht:{ name:'Connacht', kingdom:'k_ireland' },
  d_munster:{ name:'Munster', kingdom:'k_ireland' },
  /* Scandinavia */
  d_agder:{ name:'Agder', kingdom:'k_norway' },
  d_vestland:{ name:'Vestland', kingdom:'k_norway' },
  d_oppland:{ name:'Oppland', kingdom:'k_norway' },
  d_trondelag:{ name:'Trøndelag', kingdom:'k_norway' },
  d_svealand:{ name:'Svealand', kingdom:'k_sweden' },
  d_gotaland:{ name:'Götaland', kingdom:'k_sweden' },
  d_smaland:{ name:'Småland', kingdom:'k_sweden' },
  d_gotland:{ name:'Gotland', kingdom:'k_sweden' },
  d_norrland:{ name:'Norrland', kingdom:'k_sweden' },
  d_jylland:{ name:'Jylland', kingdom:'k_denmark' },
  d_sjaelland:{ name:'Sjælland', kingdom:'k_denmark' },
  d_scania:{ name:'Skåne', kingdom:'k_denmark' },
  /* Carpathia */
  d_moravia:{ name:'Moravia', kingdom:'k_moravia' },
  d_slovakia:{ name:'Slovakia', kingdom:'k_moravia' },
  d_bohemia:{ name:'Bohemia', kingdom:'k_bohemia' },
  d_poland:{ name:'Poland', kingdom:'k_poland' },
  d_mazovia:{ name:'Mazovia', kingdom:'k_poland' },
  d_krakow:{ name:'Kraków', kingdom:'k_poland' },
  d_silesia:{ name:'Silesia', kingdom:'k_poland' },
  d_pomerania:{ name:'Pomerania', kingdom:'k_poland' },
  d_wendland:{ name:'Wendland', kingdom:'k_poland' },
  d_transdanubia:{ name:'Transdanubia', kingdom:'k_pannonia' },
  d_syrmia:{ name:'Syrmia', kingdom:'k_pannonia' },
  d_transylvania:{ name:'Transylvania', kingdom:'k_pannonia' },
  /* Russia & the steppe */
  d_novgorod:{ name:'Novgorod', kingdom:'k_novgorod' },
  d_rostov:{ name:'Rostov', kingdom:'k_novgorod' },
  d_beloozero:{ name:'Beloozero', kingdom:'k_novgorod' },
  d_smolensk:{ name:'Smolensk', kingdom:'k_novgorod' },
  d_kiev:{ name:'Kiev', kingdom:'k_rus' },
  d_chernigov:{ name:'Chernigov', kingdom:'k_rus' },
  d_polotsk:{ name:'Polotsk', kingdom:'k_rus' },
  d_turov:{ name:'Turov', kingdom:'k_rus' },
  d_volhynia:{ name:'Volhynia', kingdom:'k_rus' },
  d_etelkoz:{ name:'Etelköz', kingdom:'k_rus' },
  d_prussia:{ name:'Prussia', kingdom:'k_lithuania' },
  d_samogitia:{ name:'Samogitia', kingdom:'k_lithuania' },
  d_lithuania:{ name:'Lithuania', kingdom:'k_lithuania' },
  d_latvia:{ name:'Latvia', kingdom:'k_lithuania' },
  d_estonia:{ name:'Estonia', kingdom:'k_lithuania' },
  d_finland:{ name:'Finland', kingdom:'k_finland' },
  d_karelia:{ name:'Karelia', kingdom:'k_finland' },
  d_savo:{ name:'Savo', kingdom:'k_finland' },
  d_itel:{ name:'Itil', kingdom:'k_khazaria' },
  d_sarkel:{ name:'Sarkel', kingdom:'k_khazaria' },
  d_tmutarakan:{ name:'Tmutarakan', kingdom:'k_khazaria' },
  d_samandar:{ name:'Samandar', kingdom:'k_khazaria' },
  d_cherson:{ name:'Cherson', kingdom:'k_khazaria' },
  d_bulgar:{ name:'Bolghar', kingdom:'k_volga' },
  /* Byzantium & the Balkans */
  d_thrace:{ name:'Thrace', kingdom:'k_hellas' },
  d_macedonia:{ name:'Macedonia', kingdom:'k_hellas' },
  d_thessaly:{ name:'Thessaly', kingdom:'k_hellas' },
  d_hellas:{ name:'Hellas', kingdom:'k_hellas' },
  d_peloponnese:{ name:'Peloponnese', kingdom:'k_hellas' },
  d_epirus:{ name:'Epirus', kingdom:'k_hellas' },
  d_crete:{ name:'Crete', kingdom:'k_hellas' },
  d_bithynia:{ name:'Bithynia', kingdom:'k_anatolia' },
  d_opsikion:{ name:'Opsikion', kingdom:'k_anatolia' },
  d_thrakesion:{ name:'Thrakesion', kingdom:'k_anatolia' },
  d_kibyrrhaiot:{ name:'Kibyrrhaiot', kingdom:'k_anatolia' },
  d_lykaonia:{ name:'Lykaonia', kingdom:'k_anatolia' },
  d_cappadocia:{ name:'Cappadocia', kingdom:'k_anatolia' },
  d_armeniac:{ name:'Armeniac', kingdom:'k_anatolia' },
  d_chaldia:{ name:'Chaldia', kingdom:'k_anatolia' },
  d_paphlagonia:{ name:'Paphlagonia', kingdom:'k_anatolia' },
  d_cilicia:{ name:'Cilicia', kingdom:'k_anatolia' },
  d_cyprus:{ name:'Cyprus', kingdom:'k_anatolia' },
  d_moesia:{ name:'Moesia', kingdom:'k_bulgaria' },
  d_thrace_bulg:{ name:'Sredets', kingdom:'k_bulgaria' },
  d_skopje:{ name:'Skopje', kingdom:'k_bulgaria' },
  d_rascia:{ name:'Raška', kingdom:'k_serbia' },
  d_zeta:{ name:'Zeta', kingdom:'k_serbia' },
  d_bosnia:{ name:'Bosnia', kingdom:'k_serbia' },
  d_croatia:{ name:'Croatia', kingdom:'k_croatia' },
  d_slavonia:{ name:'Slavonia', kingdom:'k_croatia' },
  d_vaspurakan:{ name:'Vaspurakan', kingdom:'k_armenia' },
  d_ani:{ name:'Ani', kingdom:'k_armenia' },
  d_ararat:{ name:'Ararat', kingdom:'k_armenia' },
  d_kartli:{ name:'Kartli', kingdom:'k_georgia' },
  d_abkhazia:{ name:'Abkhazia', kingdom:'k_georgia' },
  d_alania:{ name:'Alania', kingdom:'k_georgia' },
  /* Arabia & Africa */
  d_tunis:{ name:'Tunis', kingdom:'k_ifriqiya' },
  d_tripoli:{ name:'Tripoli', kingdom:'k_ifriqiya' },
  d_barqa:{ name:'Barqa', kingdom:'k_ifriqiya' },
  d_fes:{ name:'Fes', kingdom:'k_maghreb' },
  d_tlemcen:{ name:'Tlemcen', kingdom:'k_maghreb' },
  d_tahert:{ name:'Tahert', kingdom:'k_maghreb' },
  d_algiers:{ name:'Algiers', kingdom:'k_maghreb' },
  d_oran:{ name:'Oran', kingdom:'k_maghreb' },
  d_morocco:{ name:'Morocco', kingdom:'k_maghreb' },
  d_sous:{ name:'Sous', kingdom:'k_maghreb' },
  d_sijilmasa:{ name:'Sijilmasa', kingdom:'k_maghreb' },
  d_delta:{ name:'The Delta', kingdom:'k_egypt' },
  d_cairo:{ name:'Cairo', kingdom:'k_egypt' },
  d_fayyum:{ name:'Fayyum', kingdom:'k_egypt' },
  d_upper_egypt:{ name:'Upper Egypt', kingdom:'k_egypt' },
  d_damascus:{ name:'Damascus', kingdom:'k_syria' },
  d_aleppo:{ name:'Aleppo', kingdom:'k_syria' },
  d_antioch:{ name:'Antioch', kingdom:'k_syria' },
  d_jerusalem:{ name:'Jerusalem', kingdom:'k_syria' },
  d_jordan:{ name:'Jordan', kingdom:'k_syria' },
  d_mosul:{ name:'Mosul', kingdom:'k_jazira' },
  d_diyarbakir:{ name:'Diyarbakır', kingdom:'k_jazira' },
  d_edessa:{ name:'Edessa', kingdom:'k_jazira' },
  d_baghdad:{ name:'Baghdad', kingdom:'k_iraq' },
  d_kufa:{ name:'Kufa', kingdom:'k_iraq' },
  d_basra:{ name:'Basra', kingdom:'k_iraq' },
  d_hejaz:{ name:'Hejaz', kingdom:'k_arabia' },
  d_najd:{ name:'Najd', kingdom:'k_arabia' },
  d_bahrain:{ name:'Bahrayn', kingdom:'k_arabia' },
  d_sanaa:{ name:'Sanaa', kingdom:'k_yemen' },
  d_aden:{ name:'Aden', kingdom:'k_yemen' },
  d_hadhramaut:{ name:'Hadhramaut', kingdom:'k_yemen' },
  d_oman:{ name:'Oman', kingdom:'k_oman' },
  /* Persia */
  d_rayy:{ name:'Rayy', kingdom:'k_jibal' },
  d_hamadan:{ name:'Hamadan', kingdom:'k_jibal' },
  d_isfahan:{ name:'Isfahan', kingdom:'k_jibal' },
  d_azerbaijan:{ name:'Azerbaijan', kingdom:'k_jibal' },
  d_fars:{ name:'Fars', kingdom:'k_fars' },
  d_kerman:{ name:'Kerman', kingdom:'k_fars' },
  d_merv:{ name:'Merv', kingdom:'k_khorasan' },
  d_nishapur:{ name:'Nishapur', kingdom:'k_khorasan' },
  d_herat:{ name:'Herat', kingdom:'k_khorasan' },
  d_balkh:{ name:'Balkh', kingdom:'k_khorasan' },
  d_sistan:{ name:'Sistan', kingdom:'k_khorasan' },
  d_transoxiana:{ name:'Transoxiana', kingdom:'k_khorasan' },
  d_kabul:{ name:'Kabul', kingdom:'k_khorasan' },
  d_zabulistan:{ name:'Zabulistan', kingdom:'k_khorasan' },
  d_tabaristan:{ name:'Tabaristan', kingdom:'k_daylam' },
  d_gilan:{ name:'Gilan', kingdom:'k_daylam' },
  d_makran:{ name:'Makran', kingdom:'k_sindh' },
  d_sindh:{ name:'Sindh', kingdom:'k_sindh' },
  /* Kush */
  d_makuria:{ name:'Makuria', kingdom:'k_makuria' },
  d_alodia:{ name:'Alodia', kingdom:'k_makuria' },
  d_axum:{ name:'Axum', kingdom:'k_abyssinia' },
  d_amhara:{ name:'Amhara', kingdom:'k_abyssinia' }
};

/* =========================================================================
   REALMS of 867 AD  {id, name, color, capital, aggression 0..2, rank, liege}
   rank: 1 count, 2 duke (petty king, chief, doge, emir…), 3 king, 4 emperor.
   liege: realm id this realm answers to; omit for sovereign realms.
   Only realms above the county level are authored here — dukes and counts
   inside a realm are generated by the engine at world creation.
   ========================================================================= */
FBDATA.realms = [
/* ---- Francia ---- */
{id:'west_francia', name:'West Francia', color:'#4f7fd0', capital:'paris', aggression:1, rank:3},
{id:'aquitaine', name:'Aquitaine', color:'#4f9fd0', capital:'bordeaux', aggression:0, rank:3, liege:'west_francia'},
{id:'brittany', name:'Brittany', color:'#a8a8b8', capital:'rennes', aggression:0, rank:3},
{id:'lotharingia', name:'Lotharingia', color:'#b08bd0', capital:'aachen', aggression:0, rank:3},
{id:'east_francia', name:'East Francia', color:'#6f7d8c', capital:'regensburg', aggression:1, rank:3},
/* ---- Italia ---- */
{id:'italy', name:'Carolingian Italy', color:'#7fae5f', capital:'pavia', aggression:1, rank:4},
{id:'burgundy', name:'Burgundy', color:'#9fbf5f', capital:'vienne', aggression:0, rank:3, liege:'italy'},
{id:'papacy', name:'The Papacy', color:'#e8e0b0', capital:'roma', aggression:0, rank:3},
{id:'benevento', name:'Benevento', color:'#c98f4a', capital:'benevento', aggression:1, rank:2},
{id:'venice', name:'Venice', color:'#2f8f8f', capital:'venezia', aggression:0, rank:2, liege:'byzantium'},
{id:'sardinia', name:'Sardinian Judgedoms', color:'#8fae7f', capital:'cagliari', aggression:0, rank:2},
/* ---- Iberia ---- */
{id:'asturias', name:'Asturias', color:'#e0e4ee', capital:'oviedo', aggression:1, rank:3},
{id:'navarra', name:'Pamplona', color:'#c04070', capital:'pamplona', aggression:0, rank:3},
{id:'cordoba', name:'Emirate of Córdoba', color:'#3f9f5f', capital:'cordoba', aggression:1, rank:3},
/* ---- Britain & Ireland ---- */
{id:'wessex', name:'Wessex', color:'#d0a03f', capital:'winchester', aggression:1, rank:3},
{id:'mercia', name:'Mercia', color:'#3f6fa0', capital:'tamworth', aggression:1, rank:3},
{id:'east_anglia', name:'East Anglia', color:'#d0d84f', capital:'norwich', aggression:0, rank:3},
{id:'northumbria', name:'Northumbria', color:'#a07850', capital:'bamburgh', aggression:0, rank:2},
{id:'york', name:'Kingdom of Jórvík', color:'#8c3a3a', capital:'york', aggression:2, rank:3},
{id:'gwynedd', name:'Gwynedd', color:'#cf6f4f', capital:'gwynedd', aggression:0, rank:3},
{id:'alba', name:'Alba', color:'#5f5fc0', capital:'scone', aggression:1, rank:3},
{id:'strathclyde', name:'Strathclyde', color:'#7f5f9f', capital:'dumbarton', aggression:0, rank:2},
{id:'isles', name:'Kingdom of the Isles', color:'#4f7f9f', capital:'man', aggression:1, rank:2},
{id:'ulaid', name:'Ulaid', color:'#d08f4f', capital:'ulaid', aggression:0, rank:2},
{id:'connacht', name:'Connacht', color:'#9fbf4f', capital:'galway', aggression:0, rank:2},
{id:'leinster', name:'Leinster', color:'#5f9f6f', capital:'kilkenny', aggression:0, rank:2},
{id:'munster', name:'Munster', color:'#3f7f5f', capital:'cashel', aggression:0, rank:2},
{id:'dublin', name:'Norse Dublin', color:'#4fb0d0', capital:'dublin', aggression:2, rank:2},
/* ---- Scandinavia ---- */
{id:'denmark', name:'Denmark', color:'#c03f5f', capital:'hedeby', aggression:2, rank:3},
{id:'sweden', name:'Sweden', color:'#e8d84f', capital:'uppsala', aggression:1, rank:3},
{id:'geats', name:'Geats', color:'#b8b03f', capital:'skara', aggression:1, rank:2},
{id:'vestfold', name:'Vestfold', color:'#7fa8d8', capital:'tonsberg', aggression:2, rank:2},
{id:'trondelag', name:'Trøndelag', color:'#5f88b8', capital:'trondheim', aggression:1, rank:2},
/* ---- Eastern Europe ---- */
{id:'moravia', name:'Great Moravia', color:'#6f4fa0', capital:'veligrad', aggression:1, rank:3},
{id:'bohemia', name:'Bohemia', color:'#af5f2f', capital:'praha', aggression:1, rank:2, liege:'moravia'},
{id:'polans', name:'Polans', color:'#d87f9f', capital:'gniezno', aggression:1, rank:2},
{id:'vistulans', name:'Vistulans', color:'#c86f8f', capital:'krakow', aggression:1, rank:2},
{id:'pomerania', name:'Pomeranians', color:'#b85f7f', capital:'gdansk', aggression:1, rank:2},
{id:'wends', name:'Wends', color:'#7f4f6f', capital:'mecklenburg', aggression:1, rank:2},
{id:'pannonia', name:'Pannonia', color:'#8f9f7f', capital:'szekesfehervar', aggression:0, rank:2, liege:'east_francia'},
{id:'prussia', name:'Old Prussians', color:'#6f6f4f', capital:'sambia', aggression:0, rank:2},
{id:'lithuania', name:'Lithuanians', color:'#8f6f2f', capital:'vilnius', aggression:1, rank:2},
{id:'livonia', name:'Livonians', color:'#7f5f3f', capital:'riga', aggression:0, rank:2},
{id:'finland', name:'Suomi', color:'#9fb8c8', capital:'turku', aggression:0, rank:2},
{id:'karelia', name:'Karelians', color:'#8fa8b8', capital:'kexholm', aggression:0, rank:2},
{id:'rus_novgorod', name:'Novgorod Rus', color:'#d06f2f', capital:'novgorod', aggression:2, rank:3},
{id:'rus_kiev', name:'Kievan Rus', color:'#c05f1f', capital:'kiev', aggression:2, rank:3},
{id:'polotsk', name:'Polotsk', color:'#a06f4f', capital:'polotsk', aggression:1, rank:2},
{id:'turov', name:'Turov', color:'#907f5f', capital:'turov', aggression:0, rank:2},
{id:'chernigov', name:'Chernigov', color:'#b07f3f', capital:'chernigov', aggression:1, rank:2},
{id:'volhynia', name:'Volhynia', color:'#9f6f5f', capital:'volodymyr', aggression:0, rank:2},
{id:'magyars', name:'Magyars', color:'#d05f3f', capital:'etelkoz', aggression:2, rank:3},
/* ---- Balkans & Caucasus ---- */
{id:'bulgaria', name:'Bulgaria', color:'#5f9f3f', capital:'pliska', aggression:2, rank:3},
{id:'serbia', name:'Serbia', color:'#7f6fbf', capital:'ras', aggression:0, rank:2},
{id:'croatia', name:'Croatia', color:'#4f9fbf', capital:'split', aggression:0, rank:2},
{id:'georgia', name:'Abkhazia-Kartli', color:'#cf4f8f', capital:'kutaisi', aggression:0, rank:3},
{id:'alania', name:'Alania', color:'#a08f5f', capital:'magas', aggression:0, rank:2},
{id:'byzantium', name:'Byzantine Empire', color:'#a04fb0', capital:'constantinople', aggression:1, rank:4},
{id:'khazaria', name:'Khazar Khaganate', color:'#8f7f4f', capital:'atil', aggression:1, rank:3},
{id:'volga_bulgaria', name:'Volga Bulgaria', color:'#7f6f3f', capital:'bolghar', aggression:1, rank:2},
/* ---- Islam & Africa ---- */
{id:'abbasid', name:'Abbasid Caliphate', color:'#4a4a52', capital:'baghdad', aggression:1, rank:4},
{id:'tahirids', name:'Tahirid Khorasan', color:'#6a6a72', capital:'nishapur', aggression:1, rank:3, liege:'abbasid'},
{id:'aghlabids', name:'Aghlabids', color:'#b8b04f', capital:'kairouan', aggression:1, rank:3, liege:'abbasid'},
{id:'armenia', name:'Bagratid Armenia', color:'#e09f6f', capital:'dvin', aggression:0, rank:3, liege:'abbasid'},
{id:'saffarids', name:'Saffarids', color:'#d0b03f', capital:'zaranj', aggression:2, rank:3},
{id:'kabul_shahi', name:'Kabul Shahi', color:'#aa6f4f', capital:'kabul', aggression:0, rank:2},
{id:'habbarids', name:'Habbarid Sindh', color:'#6f8f3f', capital:'mansura', aggression:0, rank:2},
{id:'makran', name:'Emirate of Makran', color:'#9f8f5f', capital:'tiz', aggression:0, rank:2},
{id:'tabaristan', name:'Tabaristan', color:'#5f8f6f', capital:'amol', aggression:0, rank:2},
{id:'yemen', name:'Ziyadid Yemen', color:'#9f8f6f', capital:'sanaa', aggression:0, rank:2, liege:'abbasid'},
{id:'oman', name:'Imamate of Oman', color:'#6f9f8f', capital:'muscat', aggression:0, rank:2},
{id:'idrisids', name:'Idrisids', color:'#2f6f4f', capital:'fes', aggression:0, rank:2},
{id:'rustamids', name:'Rustamids', color:'#6fae8f', capital:'tahert', aggression:0, rank:2},
{id:'barghawata', name:'Barghawata', color:'#8fae4f', capital:'sale', aggression:0, rank:2},
{id:'sijilmasa', name:'Sijilmasa', color:'#c9b06f', capital:'sijilmasa', aggression:0, rank:2},
{id:'makuria', name:'Makuria', color:'#6fcfcf', capital:'dongola', aggression:0, rank:3},
{id:'abyssinia', name:'Abyssinia', color:'#4f9f9f', capital:'axum', aggression:0, rank:3},
{id:'crete', name:'Emirate of Crete', color:'#5fbf8f', capital:'candia', aggression:1, rank:2}
];

/* Extra adjacency across water: [countyId, countyId] */
FBDATA.straits = [
['canterbury','boulogne'], ['dorset','caen'], ['lewes','rouen'],
['hedeby','roskilde'], ['roskilde','lund'], ['roskilde','lubeck'],
['messina','reggio'], ['palermo','tunis'], ['malaga','tangier'],
['silves','tangier'], ['constantinople','nicaea'], ['candia','athens'],
['nicosia','antioch'], ['cagliari','pisa'], ['ajaccio','lucca'],
['ajaccio','nice'], ['dublin','gwynedd'], ['man','dublin'],
['whithorn','ulaid'], ['visby','birka'], ['visby','riga'],
['scarborough','arhus'], ['tonsberg','arhus'], ['cherson','sinope'],
['zeila','aden'], ['sohar','hormuz'], ['muscat','tiz']
];

/* Dated historical shocks. type 'conquest': newRealm (same shape as a
   realm, or null) spawns at that date before seizing the target counties. */
FBDATA.scripted = [
{ year:869, type:'conquest', realm:'abbasid', newRealm:{id:'tulunids', name:'Tulunid Egypt', color:'#8f9f3f', capital:'fustat', aggression:1, rank:3},
  targets:['fustat','alexandria','rosetta','fayyum','asyut','luxor','aswan','barqa'],
  news:'Ahmad ibn Tulun, governor of Egypt, casts off Baghdad’s yoke. Egypt is his.' },
{ year:895, type:'conquest', realm:'magyars', newRealm:null,
  targets:['szekesfehervar','moson','sirmium','osijek','wien','linz'],
  news:'The Magyar horde crosses the Carpathians! Pannonia burns beneath their hooves.' },
{ year:878, type:'conquest', realm:'york', newRealm:null,
  targets:['nottingham','derby','leicester','lincoln','stamford','norwich','ipswich','cambridge'],
  news:'The Great Heathen Army sweeps over the English kingdoms.' },
{ year:870, type:'conquest', realm:'saffarids', newRealm:null,
  targets:['kabul','bamiyan'],
  news:'Ya’qub the Coppersmith storms the Kabul valley; the Shahi king flees his throne.' }
];

/* Player rank titles by religion group (index = tier 0..7) */
FBDATA.titles = {
  christian: ['Serf','Freeholder','Gentry','Baron','Count','Duke','King','Emperor'],
  christian_f: ['Serf','Freeholder','Gentlewoman','Baroness','Countess','Duchess','Queen','Empress'],
  muslim: ['Fellah','Freeman','Sayyid','Sheikh','Emir','Grand Emir','Sultan','Caliph'],
  muslim_f: ['Fellaha','Freewoman','Sayyida','Sheikha','Emira','Grand Emira','Sultana','Caliph'],
  pagan: ['Thrall','Karl','Huscarl','Hersir','Jarl','High Chief','King','High King'],
  pagan_f: ['Thrall','Karl','Shieldmaiden','Lady','Jarl','High Chief','Queen','High Queen'],
  jewish: ['Serf','Freeholder','Gentry','Elder','Bek','Great Bek','Khagan','Khagan']
};

/* Demesne buildings (tier 3+; one of each per province, raised in the home
   province via the "Raise a building…" deed) — modders welcome.
   cost: gold (a visiting master mason discounts it) · siting: devMin,
   coastal, terrains · ongoing: tax & piety per season, levy men ·
   one-time on completion: dev, pop (popular opinion), prestige.
   The 'walls' id is special: it strengthens the ruler when defending. */
FBDATA.buildings = {
  mill:    { name:'Watermill', icon:'⚙', cost:40, tax:2,
    desc:'Grinds the valley’s grain for a fee.' },
  granary: { name:'Granary', icon:'🌾', cost:40,
    desc:'Grain laid up against the hungry years.' },
  bridge:  { name:'Stone Bridge', icon:'🌉', cost:50, dev:1, pop:10,
    desc:'Trade crosses where the ford once drowned it.' },
  walls:   { name:'Stone Walls', icon:'🧱', cost:60,
    desc:'A wall pays its mason once and its lord forever. (stronger when defending)' },
  market:  { name:'Market Square', icon:'⚖', cost:60, devMin:4, tax:3,
    desc:'Tolls, stalls, and strangers’ silver.' },
  temple:  { name:'Great {temple}', icon:'🛐', cost:70, piety:2, pop:5,
    desc:'Stone raised toward heaven — and remembered on earth.' },
  harbor:  { name:'Harbor', icon:'⚓', cost:80, coastal:true, tax:4,
    desc:'Every tide brings someone who owes you a toll.' },
  library: { name:{ default:'Library', muslim:'House of Wisdom' }, icon:'📚', cost:80, devMin:4, research:1,
    desc:'Shelves of knowledge — and the men who argue over it. (+1 scholarship per season)' },
  keep:    { name:'Stone Keep', icon:'🏰', cost:100, devMin:5, levy:60, prestige:10,
    desc:'The last argument of a lord — and the first thing raiders see.' }
};

/* Household holdings (tiers 0-2; bought with gold via the "Better the
   household…" deed) — the commoner's way of playing tall. Holdings live in
   player.holdings and PERSIST across generations: property passes to heirs.
   cost: gold · gates: tierMin/tierMax, professions, req (holding id) ·
   fx keys (summed by FB.holdingBonus): gold/prestige/piety (per season),
   battle (added to 'battle' odds), edu (children learn faster),
   health (lower yearly mortality). */
FBDATA.holdings = {
  /* any household */
  hearth_garden: { name:'Hearth Garden', icon:'🌿', cost:10, tierMax:2,
    desc:'Herbs and onions by the door — fewer coins to the market, fewer fevers in the house.', fx:{ gold:0.5, health:0.004 } },
  house_shrine:  { name:{ default:'Household Shrine', muslim:'Prayer Niche' }, icon:'📿', cost:20, tierMax:2,
    desc:'A corner kept holy. The household prays, and is seen to.', fx:{ piety:1 } },
  letters:       { name:'Letters in the Family', icon:'📖', cost:30, tierMax:2,
    desc:'Someone under this roof can read — and the children learn young.', fx:{ edu:0.08 } },
  /* the land */
  orchard:    { name:'Orchard', icon:'🌳', cost:30, tierMax:2, professions:['farmer'],
    desc:'Trees bear fruit long after their planter is gone.', fx:{ gold:1 } },
  press:      { name:{ default:'Cider Press', muslim:'Oil Press' }, icon:'🏺', cost:60, tierMax:2, professions:['farmer'], req:'orchard',
    desc:'The fruit is good; what the fruit becomes is better.', fx:{ gold:2 } },
  /* the bench */
  fine_tools: { name:'Fine Tools', icon:'🛠', cost:25, tierMax:2, professions:['craftsman'],
    desc:'Good steel in skilled hands.', fx:{ gold:1 } },
  workshop:   { name:'A Shop of Your Own', icon:'⚒', cost:80, tierMax:2, professions:['craftsman'], req:'fine_tools',
    desc:'Your name over your own door.', fx:{ gold:2.5 } },
  famed_mark: { name:'A Famed Mark', icon:'🏅', cost:150, tierMax:2, professions:['craftsman'], req:'workshop',
    desc:'Buyers ask for your mark by name.', fx:{ gold:3, prestige:1 } },
  /* the road */
  pack_mule:  { name:'Pack Mule', icon:'🐴', cost:20, tierMax:2, professions:['merchant'],
    desc:'Stubborn, surefooted, profitable.', fx:{ gold:1.5 } },
  stall:      { name:'Market Stall', icon:'⛺', cost:60, tierMax:2, professions:['merchant'], req:'pack_mule',
    desc:'A fixed place in the market square.', fx:{ gold:2.5 } },
  trade_house:{ name:'Trading House', icon:'🏛', cost:150, tierMax:2, professions:['merchant'], req:'stall',
    desc:'Ledgers, agents, and a name that opens doors.', fx:{ gold:4, prestige:1 } },
  /* the sword */
  good_mail:  { name:'A Hauberk That Fits', icon:'🛡', cost:30, tierMax:2, professions:['soldier'],
    desc:'Dead men earn no wages.', fx:{ battle:0.04 } },
  warhorse:   { name:'Warhorse', icon:'🐎', cost:80, tierMax:2, professions:['soldier'], req:'good_mail',
    desc:'Half a knight is the horse.', fx:{ battle:0.06, prestige:0.5 } }
};

/* Items — personal treasures carried by the player and passed to heirs.
   Bought from peddlers and town markets, looted in war, stolen by plot, or
   dug from the earth. value: gold price · rarity: common|fine|famed (famed
   pieces mostly surface as spoils and finds) · fx keys (summed by
   FB.itemBonus): mar/dip/ste/int/lea (added to the player's skills),
   battle (added to battle odds), prestige/piety (per season),
   health (lower yearly mortality). */
FBDATA.items = {
  keen_seax:       { name:'Keen Seax', icon:'🔪', rarity:'common', value:20, fx:{ mar:1 },
    desc:'A fighting knife of honest steel.' },
  silver_ring:     { name:'Silver Ring', icon:'💍', rarity:'common', value:20, fx:{ dip:1 },
    desc:'Small enough to be modest, bright enough to be noticed.' },
  merchant_ledger: { name:'Merchant’s Ledger', icon:'📒', rarity:'common', value:20, fx:{ ste:1 },
    desc:'Every debt in one place — most of them owed to you.' },
  old_grammar:     { name:'Old Grammar', icon:'📕', rarity:'common', value:20, fx:{ lea:1 },
    desc:'A battered book in a dead tongue that still has things to say.' },
  damascene_blade: { name:'Damascene Blade', icon:'🗡', rarity:'fine', value:60, fx:{ mar:2, battle:0.03 },
    desc:'Water-patterned steel from the east. It does not forgive.' },
  signet_ring:     { name:'Signet Ring', icon:'🔏', rarity:'fine', value:60, fx:{ dip:2 },
    desc:'Wax obeys it; men follow.' },
  physicians_chest:{ name:'Physician’s Chest', icon:'⚗', rarity:'fine', value:55, fx:{ health:0.008 },
    desc:'Salves, simples, and a small saw you hope stays clean.' },
  jeweled_girdle:  { name:'Jeweled Girdle', icon:'💎', rarity:'fine', value:55, fx:{ prestige:1 },
    desc:'Wealth worn where everyone must see it.' },
  lockpicks:       { name:'Thieves’ Picks', icon:'🗝', rarity:'fine', value:50, fx:{ int:2 },
    desc:'They open more than doors.' },
  hero_sword:      { name:'Blade with a Name', icon:'⚔', rarity:'famed', value:250, fx:{ mar:3, battle:0.05, prestige:1 },
    desc:'Songs already exist about this sword. Now they are about you.' },
  crown_of_old:    { name:'Crown of the Old Empire', icon:'👑', rarity:'famed', value:220, fx:{ prestige:2, dip:1 },
    desc:'A diadem of an empire nobody remembers — and everybody bows to.' },
  holy_relic:      { name:'Holy Relic', icon:'✨', rarity:'famed', value:180, fx:{ piety:2, prestige:1 },
    desc:'Holiness beyond question, provenance beyond recovery.' }
};

/* Plots (the intrigue game) — begun with the "Begin a plot…" deed, woven
   daily by the Scheming focus, sprung as a decision event when power
   reaches `need`. trigger: standard event-trigger conditions gating who may
   attempt it · event: resolution event id (its options must carry the
   {custom:'plot_end'} effect). Scheming risks a plot_discovered event. */
FBDATA.plots = {
  ruin_rival: { name:'Bring Down {rival}', icon:'🗡', need:12, event:'plot_ruin_rival',
    trigger:{ hasRole:'rival' },
    desc:'Debts called in, rumors seeded, friends bought away.' },
  tithe_barn: { name:'The Tithe Barn', icon:'🌾', need:8, event:'plot_tithe_barn',
    trigger:{ tierMax:1 },
    desc:'The lord’s stores are full, the nights are long, and hunger keeps no law.' },
  court_whispers: { name:'Whispers at Court', icon:'🎭', need:12, event:'plot_court_whispers',
    trigger:{ tierMin:2, tierMax:4 },
    desc:'Turn the hall against a man in your way and take his place in the lord’s regard.' },
  skim_taxes: { name:'Cook the Ledgers', icon:'📜', need:14, event:'plot_skim_taxes',
    trigger:{ tierMin:3, isVassal:true },
    desc:'What the liege’s tax men never see, the liege never misses.' },
  locked_chest: { name:'The Locked Chest', icon:'🗝', need:10, event:'plot_locked_chest',
    trigger:{ tierMax:2 },
    desc:'A wealthy house, a careless steward, and a chest that sings when tapped.' },
  widow_veil: { name:'A Quiet Grave', icon:'🕯', need:16, event:'plot_spouse_end',
    trigger:{ married:true },
    desc:'Foxglove in the stew, a loose stair, a hunting mishap — and mourning clothes that fit you well.' }
};

/* Technology (tier 3+; adopted with scholarship via the "Adopt an
   innovation…" deed) — modders welcome. Adopted innovations live in
   state.tech and PERSIST across generations: the tall ruler's legacy.
   cost: scholarship · yearMin: era gate · req: prerequisite tech id ·
   fx keys (summed by FB.techBonus): tax/levy (fractional multipliers),
   battle (added to war odds), build (fractional building discount),
   devCap (+demesne development ceiling), health (lower yearly mortality),
   research (+scholarship per season). */
FBDATA.tech = {
  /* husbandry */
  heavy_plough:  { name:'Heavy Plough', icon:'🌾', cost:30, yearMin:880,
    desc:'Iron shares turn the deep clays. (+10% tax)', fx:{ tax:0.10 } },
  three_field:   { name:'Three-Field Rotation', icon:'🌱', cost:60, yearMin:920, req:'heavy_plough',
    desc:'Two crops in the ground, one field at rest. (+10% tax, higher development ceiling)', fx:{ tax:0.10, devCap:1 } },
  horse_collar:  { name:'Horse Collar', icon:'🐴', cost:100, yearMin:980, req:'three_field',
    desc:'A horse ploughs twice as fast as an ox. (+15% tax, higher development ceiling)', fx:{ tax:0.15, devCap:1 } },
  /* arms */
  ringworks:     { name:'Ringworks', icon:'🛡', cost:30, yearMin:880,
    desc:'Earth and timber around every village. (+10% levy)', fx:{ levy:0.10 } },
  stirrups:      { name:'Stirrup Cavalry', icon:'🐎', cost:60, yearMin:920, req:'ringworks',
    desc:'Shock riders who stay in the saddle. (+5% battle odds)', fx:{ battle:0.05 } },
  mail_hauberks: { name:'Mail Hauberks', icon:'⛓', cost:100, yearMin:980, req:'stirrups',
    desc:'A shirt of rings for every serious man. (+15% levy, +3% battle odds)', fx:{ levy:0.15, battle:0.03 } },
  /* learning */
  scriptoria:    { name:{ default:'Scriptoria', muslim:'Paper Mills' }, icon:'📜', cost:30, yearMin:880,
    desc:'Knowledge that outlives its keepers. (+1 scholarship per season)', fx:{ research:1 } },
  physicians:    { name:'Court Physicians', icon:'🌿', cost:60, yearMin:920, req:'scriptoria',
    desc:'Learned men against fevers and wounds. (you live longer)', fx:{ health:0.012 } },
  guild_charters:{ name:'Guild Charters', icon:'📯', cost:100, yearMin:980, req:'physicians',
    desc:'Chartered crafts and honest weights. (+10% tax, buildings cost 20% less)', fx:{ tax:0.10, build:0.20 } }
};

/* Game balance knobs — modders welcome */
FBDATA.balance = {
  startYear: 867, startSeason: 0, startAge: 16,
  freedomCost: 100, farmCost: 120, manorCost: 600, manorPrestige: 150,
  baronyGold: 2500, baronyPrestige: 400,
  taxPerDev: 1.5, levyPerDev: 90,
  levyPerMartial: 0.02, // player levy grows this fraction per point of martial
  serfWage: [1,3], freeWage: [2,5], manorIncome: [5,9],
  childChance: 0.16, mortalityBase: 0.012,
  kinMarryChance: 0.22, kinChildChance: 0.12,
  /* age → conception multiplier, [age, mult] points read by FB.ageFert:
     flat before the first point, linear between, flat past the last.
     Women past 45 cannot conceive at all regardless of this curve. */
  fertilityByAge: {
    f: [[25, 1], [30, 0.9], [35, 0.7], [40, 0.4], [45, 0.1]],
    m: [[40, 1], [50, 0.85], [60, 0.65], [75, 0.5]]
  },
  dowryByStation: [2, 5, 12, 30, 60], marryUpPrestige: 12, marryDownPrestigeLoss: 6,
  proposalStationPenalty: 0.22,
  itemSellRatio: 0.5, // what a buyer gives against an item's value
  wivesByGroup: { muslim: 4, pagan: 3 },
  warWinsToTakeProvince: 3, aiWarChance: 0.14,
  breakawayChance: 0.015, vassalTaxRate: 0.3, appealBase: 0.25, homageOpinion: 12,
  skillSoftCap: 20, // past this, skill gains must beat a (softCap/current)^2 roll
  skillHardCap: 40  // the true ceiling no stat can pass
};
