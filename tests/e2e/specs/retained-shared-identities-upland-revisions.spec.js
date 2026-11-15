'use strict';
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {registerRevisionCases} = require('../support/game/retained-shared-identities-revisions');
const fixture = require('../fixtures/retained-shared-identities/upland.json');

dependsOnRuntime(__filename,['index.html','js/mods.js','js/save.js','js/save_v4.js','js/main.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/title_ids.js',
  'js/stories.js','js/starts.js','js/balance.js','js/settlement.js','js/population.js',
  'js/ui_modals.js','js/model.js','js/justice.js','js/story_household.js','js/crazygames.js','data/bookmark_sources.js','data/bookmarks.js',
  'data/geographies.js','data/starts.js','data/eras.js','data/cultures.js','data/map_data.js','data/distribution_crazygames.js']);

registerRevisionCases(fixture);
