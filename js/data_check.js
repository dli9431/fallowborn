/* =========================================================================
   Fallowborn — DATA LOAD CHECK

   Loaded after every data/*.js file and before the game scripts. A browser
   keeps booting when a single classic script fails to download or run (a
   content blocker, a bad offline cache, a dropped connection), which leaves
   one FBDATA table missing and surfaces later as a long list of unrelated
   validation errors. This names the missing file at once instead.

   It reads only top-level tables that each file has always defined, so one
   copy works for every branch. window.FB_DATA_FAULTS holds the data files that
   did not run; FB.validateBookmark reports them first. This runs before the
   i18n layer exists, so the notice is plain English.
   ========================================================================= */
(function () {
  'use strict';

  var REQUIRED = [
    ['data/map_data.js', 'land'],
    ['data/counties.js', 'provinces'],
    ['data/cultures.js', 'cultures'],
    ['data/technology.js', 'tech'],
    ['data/actions.js', 'focuses'],
    ['data/units.js', 'unitClasses'],
    ['data/bookmarks.js', 'bookmarks'],
    ['data/starts.js', 'startScenarios'],
    ['data/traits.js', 'traits'],
    ['data/economy.js', 'abbeys'],
    ['data/markets.js', 'marketGoods'],
    ['data/modifiers.js', 'modifiers'],
    ['data/intrigue.js', 'intrigue'],
    ['data/travel.js', 'travelSites'],
    ['data/policies.js', 'policies']
  ];

  var data = window.FBDATA, faults = [];
  for (var i = 0; i < REQUIRED.length; i++) {
    var table = data && data[REQUIRED[i][1]];
    if (!table || typeof table !== 'object') faults.push(REQUIRED[i][0]);
  }
  window.FB_DATA_FAULTS = faults;
  if (!faults.length) return;

  var message = 'Fallowborn could not load part of its game data (' +
    faults.join(', ') + '). A content blocker, a stale cached copy or a ' +
    'dropped connection can cause this.';
  if (window.console && console.warn) console.warn(message);

  function show() {
    if (!document.body || document.getElementById('fb-data-fault')) return;
    var banner = document.createElement('div');
    banner.id = 'fb-data-fault';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;' +
      'padding:12px 16px;background:#5a1d12;color:#fff;font:14px/1.4 sans-serif;' +
      'text-align:center;';
    banner.appendChild(document.createTextNode(message + ' Reload the page; if it ' +
      'persists, allow this site in your blocker or clear its site data. '));
    var reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = 'Reload';
    reload.style.cssText = 'margin-left:8px;padding:4px 12px;cursor:pointer;';
    reload.onclick = function () { window.location.reload(); };
    banner.appendChild(reload);
    document.body.appendChild(banner);
  }
  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
}());
