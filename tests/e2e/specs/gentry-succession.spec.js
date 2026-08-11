'use strict';

/* Gentry establishment across succession (docs/designs/realms.md): a house
   that has just reached the gentry may not petition for a barony until an
   heir of a genuinely later generation inherits its standing. The saga
   counter advances on every succession, so the gate tracks the line's
   genealogical depth (`player.lineDepth`) instead — a sibling or cousin of
   the founder's own generation must not unlock the petition, while a child,
   a nephew, or an adopted heir must. Legacy saves holding only a
   saga-generation number keep the original counter comparison. Exercised at
   the engine level in a fresh deterministic context. */

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('a sibling inheriting a newly gentle house is not yet established',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const out = {
        startLineDepth:p.lineDepth,
        startGentry:p.gentryGeneration
      };
      FB.setPlayerTier(s, 2);
      out.riseRecorded = p.gentryGeneration;
      out.founderEstablished = FB.gentryEstablished(s);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      out.siblingFound = !!sibling;
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      out.sagaAdvanced = s.generation === 2;
      out.lineDepthHeld = p.lineDepth === 1;
      out.siblingEstablished = FB.gentryEstablished(s);
      return out;
    });

    expect(result).toEqual({
      startLineDepth:1,
      startGentry:null,
      riseRecorded:1,
      founderEstablished:false,
      siblingFound:true,
      sagaAdvanced:true,
      lineDepthHeld:true,
      siblingEstablished:false
    });
  });

test('a child inheriting the newly gentle house establishes it',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      const child = FB.makeCharacter(s, {
        name:'Godric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 20, motherId:me.id, dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [child.id];
      FB.game.succeedTo(child.id);
      return {
        sagaAdvanced:s.generation === 2,
        lineDepthAdvanced:p.lineDepth === 2,
        established:FB.gentryEstablished(s)
      };
    });

    expect(result).toEqual({
      sagaAdvanced:true,
      lineDepthAdvanced:true,
      established:true
    });
  });

test('a nephew inheriting after a sibling is a later generation',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      const nephew = FB.makeCharacter(s, {
        name:'Aelfric', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 18, fatherId:sibling.id, dyn:me.dyn, traitsN:0
      });
      sibling.childrenIds = (sibling.childrenIds || []).concat([nephew.id]);
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      const afterSibling = {
        established:FB.gentryEstablished(s),
        lineDepth:p.lineDepth
      };
      FB.game.succeedTo(nephew.id);
      return {
        siblingFound:!!sibling,
        afterSibling:afterSibling,
        afterNephew:{
          established:FB.gentryEstablished(s),
          lineDepth:p.lineDepth
        }
      };
    });

    expect(result).toEqual({
      siblingFound:true,
      afterSibling:{ established:false, lineDepth:1 },
      afterNephew:{ established:true, lineDepth:2 }
    });
  });

test('an adopted child counts as the next generation',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      FB.setPlayerTier(s, 2);
      // adoption records no blood parents, only the childrenIds back-link
      const adopted = FB.makeCharacter(s, {
        name:'Wulfstan', sex:'m', culture:me.culture, religion:me.religion,
        born:s.date.year - 16, fatherId:null, motherId:null,
        dyn:me.dyn, traitsN:0
      });
      me.childrenIds = [adopted.id];
      FB.game.succeedTo(adopted.id);
      return {
        lineDepthAdvanced:p.lineDepth === 2,
        established:FB.gentryEstablished(s)
      };
    });

    expect(result).toEqual({
      lineDepthAdvanced:true,
      established:true
    });
  });

test('legacy saves keep their original establishment rule',
  async function ({ page }) {
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const out = {};

      // pre-gate save: neither field exists — always treated as established
      delete p.gentryGeneration;
      delete p.lineDepth;
      p.tier = 2;
      out.preGateEstablished = FB.gentryEstablished(s);

      // scenario start shape: established marker 0 with line-depth tracking
      p.gentryGeneration = 0;
      p.lineDepth = 1;
      out.scenarioStartEstablished = FB.gentryEstablished(s);

      // save holding only a saga-generation number: the old counter rule
      p.gentryGeneration = 1;
      delete p.lineDepth;
      out.legacyFounderEstablished = FB.gentryEstablished(s);
      const sibling = FB.siblingsOf(s, me).filter(function (c) {
        return !c.dead;
      })[0];
      me.childrenIds = [];
      FB.game.succeedTo(sibling.id);
      out.legacyLineDepthUntracked = p.lineDepth === undefined;
      out.legacySiblingEstablished = FB.gentryEstablished(s);
      return out;
    });

    expect(result).toEqual({
      preGateEstablished:true,
      scenarioStartEstablished:true,
      legacyFounderEstablished:false,
      legacyLineDepthUntracked:true,
      // the pre-fix behavior is preserved for saves that predate lineDepth
      legacySiblingEstablished:true
    });
  });
