'use strict';
const {test,expect} = require('../fixture');
const {prepareGameContent} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const {load,
  prepareConfiguration,preparedJourney} = require('./retained-shared-identities-world');

function registerRevisionCases(fixture) {
  test.describe(fixture.bookmark.id,function () {
    const prepared=prepareConfiguration(fixture,{revisions:true});
    const getOld=prepared.old,getVariants=prepared.variants;
    for (const revision of fixture.supportedRevisions) preparedJourney('retains exact ' + revision + ' identity across fresh revision switches',fixture,getOld,async function (page) {
      const old = getOld(), envelope = getVariants()[revision];
      await load(page,envelope);
      const inspect = async function () {
        return page.evaluate(function (input) {
          var actual = JSON.parse(FB.save.serialize()), expected = input.save;
          return {same:['start','player','chars','population','stories','bookmarkSetup','owner','holder','wastelandSettlements','authority'].every(function (key) {
            return JSON.stringify(actual.state[key]) === JSON.stringify(expected.state[key]);
          }),rng:(actual.rng >>> 0) === (expected.rng >>> 0),uid:actual.uid === expected.uid,
            faith:FB.campaignStart(FB.state).startReligion,law:FB.faithValue(FB.state,FB.state.chars[FB.state.player.charId].religion,'legalTradition').value};
        },{save:envelope});
      };
      expect(await inspect()).toEqual({same:true,rng:true,uid:true,faith:fixture.start.startReligion,law:'customary'});
      await load(page,envelope);
      expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
      await page.evaluate(function () { FB.game.toTitle(); });
      await beginBookmarkFromTitle(page,fixture.bookmark.id,fixture.start.id);
      expect(await page.evaluate(function () {
        var s=FB.state,c=s.chars[s.player.charId];
        return {revision:s.start.revision,faith:c.religion,projected:FB.campaignStart(s).startReligion,law:FB.faithValue(s,c.religion,'legalTradition').value};
      })).toEqual({revision:fixture.addedRevision,faith:fixture.currentStart.startReligion,projected:fixture.currentStart.startReligion,
        law:Object.keys(fixture.currentCatalogs.legalTraditions)[0]});
      await load(page,envelope);
      expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
      const resaved=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(resaved.mods).not.toBe(envelope.mods);
      await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,resaved);
      expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
    });

  });
}

module.exports = {registerRevisionCases};
