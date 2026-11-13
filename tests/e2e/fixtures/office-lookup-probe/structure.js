'use strict';

// Count native loop bodies separately from the lookup probe's logical sizes.
function instrument(source) {
  function add(marker, counter) {
    if (source.indexOf(marker) < 0 || source.indexOf(marker) !== source.lastIndexOf(marker)) {
      throw new Error('Office structure probe source marker changed: ' + marker);
    }
    source = source.replace(marker, marker + '\n    if (window.__officeStructureProbe) window.__officeStructureProbe.count(' + JSON.stringify(counter) + ');');
  }
  add('  function sameOfficeInput(value, snapshot) {', 'valueComparisons');
  add('  function sameOfficeInputs(state, local, bookmark, era, form, snapshot) {', 'comparisons');
  add('\n      const def = local[id], profile = profiles[def.profileId];', 'localComparisonRows');
  add('    const heads = Object.keys(bookmark.religiousHeads || {}), priorHeads = parts[8].values;', 'headKeyArrays');
  add('    for (let i = 0; i < realms.length; i++) {', 'realmComparisonRows');
  add('    for (let i = 0; i < provinces.length; i++) {', 'provinceComparisonRows');
  add('      const localInputs = Object.keys(local).map(function (id) {', 'serializedLocalRows');
  add('  function withLocalReligiousOffices(state, definitions, local) {', 'tableBuilds');
  add('    for (const id in local) {', 'tableLocalRows');
  add('  function religiousHeadHolderEligible(state, office, realmId) {', 'holderEvaluations');
  return source;
}

function install() {
  if (window.__officeStructureProbe) throw new Error('Office structure probe already installed');
  let counts;
  window.__officeStructureProbe = {
    count:function (key) { counts[key]++; },
    reset:function () {
      counts = {comparisons:0, valueComparisons:0, localComparisonRows:0, headKeyArrays:0,
        realmComparisonRows:0, provinceComparisonRows:0, serializedLocalRows:0,
        tableBuilds:0, tableLocalRows:0, holderEvaluations:0};
    },
    snapshot:function () { return Object.assign({}, counts); },
    stop:function () { delete window.__officeStructureProbe; }
  };
  window.__officeStructureProbe.reset();
}

module.exports = {instrument:instrument, install:install};
