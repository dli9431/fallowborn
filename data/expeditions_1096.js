/* Accepted expedition story declarations for the Spring 1096 opening.
   An empty batch adds no people, preparation reserves, hosts or routes. */
window.FBDATA = window.FBDATA || {};
FBDATA.storyExpeditions1096 = {};

(function () {
  'use strict';
  Object.keys(FBDATA.storyExpeditions1096).forEach(function (id) {
    if (FBDATA.storyInstances[id]) throw new Error('Duplicate story instance ' + id + '.');
    FBDATA.storyInstances[id] = FBDATA.storyExpeditions1096[id];
  });
})();
