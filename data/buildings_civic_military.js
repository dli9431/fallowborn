/* Paid facilities retain their original mechanics and technology gates. */
window.FBDATA = window.FBDATA || {};

FBDATA.buildingCorrections_civic_military = {
  guildhall:{
    role:'civic', aiBuildOrder:3,
    name:{ default:'Chartered Guildhall', italian:'Guild Hall' }, icon:'🏛',
    cost:120, upkeep:2, devMin:5, maxCounty:1, tax:4, dev:1,
    migrationAttraction:1, retinue:15, requiresTech:'guild_charters',
    desc:'A maintained hall supports chartered guild business and urban defense. It establishes no commune or public office. (+15 men-at-arms)'
  },
  archery_butts:{
    role:'training', name:'Archery Butts', icon:'🏹',
    cost:70, upkeep:1, archers:50, requiresTech:'crossbows',
    desc:'A specialized military range supports organized missile training. Ordinary archery needs neither this facility nor a universal Sunday law. (+50 archers)'
  },
  foundry:{
    role:'industry', aiBuildOrder:5, name:'Foundry and Forge Works', icon:'🔥',
    cost:130, upkeep:2, devMin:6, maxCounty:1, tax:3, retinue:30,
    requiresTech:'blast_furnace',
    desc:'Advanced furnace and forge works support a maintained military workforce. Ordinary smithing and older metal casting remain distinct. (+30 men-at-arms)'
  }
};

(function () {
  'use strict';
  var rows = FBDATA.buildingCorrections_civic_military;
  for (var id in rows) if (Object.prototype.hasOwnProperty.call(rows, id)) {
    FBDATA.buildings[id] = rows[id];
  }
})();
