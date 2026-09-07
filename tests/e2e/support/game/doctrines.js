'use strict';

// Explicit contacts for scenarios about reform consequences, rather than discovery.
async function seedDoctrineContacts(page) {
  await page.evaluate(function () {
    var s = FB.state, p = s.player;
    var id = FB.foundFaith(s, {
      name:'Encountered fellowship', parent:'catholic', relationToParent:'schismatic',
      properties:{ marriage:{ kinship:{ siblingRite:'sanctioned' }, spouseLimit:{ m:3, f:3 } } }
    }, { convertFounder:false });
    if (!id || !FB.faithAssignable(id, s) ||
        FB.doctrineOption(s, 'faith', id, 'close_kin').definition.id !== 'sanctioned') {
      throw new Error('Doctrine contact setup must create an assignable faith with sanctioned close-kin marriage.');
    }
    p.encounteredFaiths = p.encounteredFaiths || {};
    p.encounteredFaiths[id] = 1;
    p.encounteredFaiths.norse_pagan = 1;
    p.encounteredCultures = p.encounteredCultures || {};
    p.encounteredCultures.norse = 1;
    p.encounteredCultures.turkic = 1;
  });
}

module.exports = { seedDoctrineContacts };
