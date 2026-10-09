/* The single load-time instance catalogue. Source tables organize bookmark
   authoring; only this table registers instances. Anchors preserve the original
   story and RNG dispatch order across the declaration batches. */
(function () {
  'use strict';
  FBDATA.storyInstances = {};
  function add(table, placement, anchor) {
    Object.keys(table || {}).forEach(function (id) {
      if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
      var def = Object.assign({}, table[id]);
      def[placement] = anchor;
      FBDATA.storyInstances[id] = def;
    });
  }
  add(FBDATA.storySettlements800, 'registrationBefore', 'western_court_476');
  add(FBDATA.storyCampaigns, 'registrationAfter', 'zeno_return_476');
  add(FBDATA.storyFoundations, 'registrationAfter', 'western_office_476');
  add(FBDATA.storyGovernmentSelections, 'registrationAfter', 'western_office_476');
  add(FBDATA.storyGovernmentSelections711, 'registrationAfter', 'western_office_476');
  Object.keys(FBDATA.storyCourts476 || {}).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.storyCourts476[id];
  });
})();
