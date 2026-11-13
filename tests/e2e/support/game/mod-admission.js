'use strict';
const {expect}=require('../fixture');

// Check the exact candidate before waiting for a Mods reload. A rejected import
// leaves the current document in place and must report its contract faults.
async function expectModAdmission(page,mod,label){
  const faults=await page.evaluate(function(candidate){return FB.mods.validate(candidate);},mod);
  expect(faults,label || mod.name || 'Ordinary JSON import').toEqual([]);
}

module.exports={expectModAdmission};
