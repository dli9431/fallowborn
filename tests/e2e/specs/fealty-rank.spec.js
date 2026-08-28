'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('Swear Fealty only offers and accepts rulers above the player title rank',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var center = FB.world.provs.filter(function (province) {
        if (province.wasteland) return false;
        var neighbors = Object.keys(FB.world.adj[province.id] || {}).filter(
          function (id) {
            return FB.world.byId[id] && !FB.world.byId[id].wasteland;
          });
        return neighbors.length >= 3;
      })[0];
      var neighbors = Object.keys(FB.world.adj[center.id]).filter(
        function (id) {
          return FB.world.byId[id] && !FB.world.byId[id].wasteland;
        }).slice(0, 3);
      var dukeId = 'fealty_duke';
      var kingId = 'fealty_king';
      var emperorId = 'fealty_emperor';

      function addRealm(id, name, rank, capital) {
        s.realms[id] = {
          id:id,
          name:name,
          color:'#704830',
          capital:capital,
          aggression:0,
          rank:rank,
          liege:null,
          alive:true,
          war:null,
          ruler:{
            name:name + ' Ruler',
            sex:'m',
            culture:me.culture,
            age:40,
            mar:7,
            generation:1
          }
        };
        s.owner[capital] = id;
        s.holder[capital] = id;
      }

      p.tier = 6;
      p.liege = null;
      p.provs = [center.id];
      p.provinceId = center.id;
      p.war = null;
      s.owner[center.id] = 'player';
      s.holder[center.id] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.war = null;

      addRealm(dukeId, 'Neighboring Duchy', 2, neighbors[0]);
      addRealm(kingId, 'Neighboring Kingdom', 3, neighbors[1]);
      addRealm(emperorId, 'Neighboring Empire', 4, neighbors[2]);
      FB.invalidateRealmCache();

      var targets = FB.fealtyTargets(s);
      var readyWithEmperor = FB.instantStatus(s, 'swear_fealty');
      var ownerBeforeRejectedOath = s.owner[center.id];
      var rejectedLowerRank = FB.swearFealty(s, dukeId);
      var rejectedOathUntouched = !p.liege &&
        s.realms.player.liege === null &&
        s.owner[center.id] === ownerBeforeRejectedOath;

      p.tier = 7;
      s.realms.player.rank = 4;
      var emperorTargets = FB.fealtyTargets(s);
      var blockedWithoutHigher = FB.instantStatus(s, 'swear_fealty');
      p.tier = 6;
      s.realms.player.rank = 3;
      var acceptedHigherRank = FB.swearFealty(s, emperorId);

      return {
        targets:targets,
        readyWithEmperor:readyWithEmperor.can,
        rejectedLowerRank:rejectedLowerRank,
        rejectedOathUntouched:rejectedOathUntouched,
        emperorTargets:emperorTargets,
        blockedWithoutHigher:blockedWithoutHigher.can,
        blockedReason:blockedWithoutHigher.reason,
        acceptedHigherRank:acceptedHigherRank,
        directLiege:p.liege,
        realmLiege:s.realms.player.liege,
        owner:s.owner[center.id]
      };
    });

    expect(result).toEqual({
      targets:['fealty_emperor'],
      readyWithEmperor:true,
      rejectedLowerRank:false,
      rejectedOathUntouched:true,
      emperorTargets:[],
      blockedWithoutHigher:false,
      blockedReason:'No higher-ranked neighboring sovereign would take your oath.',
      acceptedHigherRank:true,
      directLiege:'fealty_emperor',
      realmLiege:'fealty_emperor',
      owner:'fealty_emperor'
    });
  });
