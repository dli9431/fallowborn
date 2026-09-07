'use strict';

// Explicit contacts for scenarios about reform consequences, rather than discovery.
async function seedDoctrineContacts(page) {
  await page.evaluate(function () {
    var s = FB.state, p = s.player;
    var id = FB.foundFaith(s, {
      name:'Encountered fellowship', parent:'catholic', relationToParent:'foreign',
      properties:{ marriage:{ kinship:{ siblingRite:'sanctioned' }, spouseLimit:{ m:3, f:3 } } }
    }, { convertFounder:false });
    p.encounteredFaiths = p.encounteredFaiths || {};
    p.encounteredFaiths[id] = 1;
    p.encounteredFaiths.norse_pagan = 1;
    p.encounteredCultures = p.encounteredCultures || {};
    p.encounteredCultures.norse = 1;
    p.encounteredCultures.turkic = 1;
  });
}

module.exports = { seedDoctrineContacts };
