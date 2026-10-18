/* One current undertaking; later historical outcomes are not dated events. */
window.FBDATA = window.FBDATA || {};
(function () {
  'use strict';
  var bookmark = FBDATA.bookmarks['1096'];
  var tables = [FBDATA.bookmarkContent['1096'].campaigns, FBDATA.householdEffects_1096];
  var ids = [];
  tables.forEach(function (table) {
    Object.keys(table).forEach(function (id) {
      if (FBDATA.storyInstances[id] || bookmark.stories.indexOf(id) >= 0)
        throw new Error('Duplicate story instance ' + id + '.');
      FBDATA.storyInstances[id] = table[id];
      ids.push(id);
    });
  });
  bookmark.stories = bookmark.stories.concat(ids);
})();
