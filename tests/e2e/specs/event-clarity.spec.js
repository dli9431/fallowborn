'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function openChildFever(page) {
  await page.evaluate(function () {
    var s = FB.state;
    var p = s.player;
    var me = s.chars[p.charId];
    var child = FB.makeCharacter(s, {
      culture:me.culture,
      religion:me.religion,
      born:s.date.year - 6,
      traitsN:0,
      fatherId:me.sex === 'm' ? me.id : null,
      motherId:me.sex === 'f' ? me.id : null,
      dyn:me.dyn
    });
    me.childrenIds.push(child.id);
    p.gold = Math.max(40, p.gold);
    FB.game.auto.all = false;
    FB.ui.runEvents([{
      id:'child_fever',
      ctx:FB.eventContext(s, { childId:child.id })
    }]);
  });
  await expect(page.getByRole('dialog', {
    name:'A Child Burns With Fever'
  })).toBeVisible();
}

test('previews are pure, hide rewards, and the shared resolver preserves mechanics',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      p.gold = 3;
      p.prestige = 10;
      p.piety = 4;
      me.health = 5;
      var option = {
        label:'Take the measured risk.',
        desc:'Flavor remains flavor.',
        chance:0.65,
        effects:{ gold:-5, prestige:10, setFlag:'e2e_clarity_decision' },
        success:{
          text:'The venture succeeds.',
          effects:{ piety:7, traitProgress:{ id:'hearth_steady', amount:2 } }
        },
        failure:{
          text:'The venture fails.',
          effects:{ health:-2, declareIndependence:true }
        }
      };
      var ev = {
        id:'e2e_event_clarity_resolution',
        title:'A Measured Venture',
        text:'The road divides.',
        options:[option]
      };
      FB.setRngState(246813579);
      var saveBeforePreview = FB.save.serialize();
      var rngBeforePreview = FB.getRngState();
      var preview = FB.previewEventOption(s, ev, option, {});
      var previewText = preview.sections.map(function (section) {
        return {
          id:section.id,
          text:section.impacts.map(function (record) {
            return FB.eventImpactText(s, record, 'preview');
          })
        };
      });
      var pure = saveBeforePreview === FB.save.serialize() &&
        rngBeforePreview === FB.getRngState();
      var saved = JSON.parse(saveBeforePreview);

      function mechanics() {
        var state = FB.state;
        var character = state.chars[state.player.charId];
        return {
          gold:state.player.gold,
          prestige:state.player.prestige,
          piety:state.player.piety,
          health:character.health,
          tier:state.player.tier,
          liege:state.player.liege,
          traitProgress:JSON.stringify(state.player.traitProgress || {}),
          rng:FB.getRngState()
        };
      }

      FB.setRngState(975318642);
      var oldSucceeded = FB.chance(option.chance);
      FB.applyEffects(FB.state, option.effects, {}, ev);
      FB.applyEffects(FB.state,
        (oldSucceeded ? option.success : option.failure).effects, {}, ev);
      var oldMechanics = mechanics();

      FB.save.restore(saved);
      FB.setRngState(975318642);
      var receipt = FB.resolveEventOption(FB.state, ev, option, {}, {
        automated:false
      });
      var resolvedMechanics = mechanics();
      var choiceEntries = FB.state.log.filter(function (entry) {
        return entry.kind === 'choice';
      });
      var receiptText = receipt.impacts.map(function (record) {
        return FB.eventImpactText(FB.state, record, 'resolved');
      });

      var emittedToasts = 0;
      var stopListening = FB.fx.on(function (intent) {
        if (intent.kind === 'toast') emittedToasts++;
      });
      FB.fns.e2e_receipt_custom = function (state) {
        state.player.gold = Math.max(0, state.player.gold - 2);
        FB.news(state, 'Intermediate custom news');
        FB.ui.toast('Intermediate direct toast');
      };
      FB.eventImpactAdapters.e2e_receipt_custom = {
        preview:function () {
          return [{ type:'gold', amount:-2 }];
        },
        report:function () {
          return [{
            type:'system', system:'property', customId:'e2e_receipt_custom',
            resolved:true
          }];
        }
      };
      var customEvent = {
        id:'e2e_custom_receipt', title:'Custom Terms', text:'Terms are offered.',
        options:[{ label:'Pay.', effects:{ custom:'e2e_receipt_custom' } }]
      };
      var customPreview = FB.previewEventOption(FB.state, customEvent,
        customEvent.options[0], {});
      var customReceipt = FB.resolveEventOption(FB.state, customEvent,
        customEvent.options[0], {}, {});
      stopListening();
      FB.ui.eventReceiptToast(customReceipt);
      FB.ui.eventReceiptToast(customReceipt);
      var receiptToastCount = document.querySelectorAll(
        '.event-receipt-toast').length;

      var unknownEvent = {
        id:'e2e_unknown_custom', title:'Mod Story', text:'A mod speaks.',
        options:[{
          label:'Answer.', desc:'The authored description remains.',
          effects:{ custom:'e2e_unregistered_mod_effect' }
        }]
      };
      var unknown = FB.previewEventOption(FB.state, unknownEvent,
        unknownEvent.options[0], {});
      return {
        pure:pure,
        band:preview.chance.band,
        sections:previewText,
        oldSucceeded:oldSucceeded,
        result:receipt.result,
        mechanicsEqual:JSON.stringify(oldMechanics) ===
          JSON.stringify(resolvedMechanics),
        actualGold:receipt.impacts.filter(function (record) {
          return record.type === 'gold';
        })[0],
        receiptText:receiptText,
        choiceCount:choiceEntries.length,
        fallbackKey:choiceEntries[0] && choiceEntries[0].msg.key,
        descriptorFields:!!(receipt.title.key && receipt.option.key &&
          receipt.outcome && receipt.outcome.key),
        customCost:customPreview.compact.some(function (record) {
          return record.type === 'gold' && record.amount === -2;
        }),
        customSemantic:customReceipt.impacts.some(function (record) {
          return record.customId === 'e2e_receipt_custom';
        }),
        emittedToasts:emittedToasts,
        receiptToastCount:receiptToastCount,
        unknownFallback:unknown.compact.some(function (record) {
          return record.unknown;
        })
      };
    });

    expect(result.pure).toBe(true);
    expect(result.band).toBe('likely');
    expect(result.sections.map(function (section) {
      return section.id;
    })).toEqual(['guaranteed', 'success', 'failure']);
    var previewWords = JSON.stringify(result.sections);
    expect(previewWords).toContain('Money');
    expect(previewWords).toContain('Permanent story decision');
    expect(previewWords).toContain('Prestige may increase');
    expect(previewWords).toContain('Piety may increase');
    expect(previewWords).not.toContain('Prestige +10');
    expect(previewWords).not.toContain('Piety +7');
    expect(result.result).toBe(result.oldSucceeded ? 'success' : 'failure');
    expect(result.mechanicsEqual).toBe(true);
    expect(result.actualGold).toMatchObject({
      type:'gold', before:3, after:0, amount:-3
    });
    expect(result.receiptText.join(' ')).toContain('Money');
    expect(result.choiceCount).toBe(1);
    expect(result.fallbackKey).toBe('news.event.autoresolved');
    expect(result.descriptorFields).toBe(true);
    expect(result.customCost).toBe(true);
    expect(result.customSemantic).toBe(true);
    expect(result.emittedToasts).toBe(0);
    expect(result.receiptToastCount).toBe(1);
    expect(result.unknownFallback).toBe(true);
  });

test('desktop choices separate resolution from accessible hover and focus details',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await openChildFever(page);

    var dialog = page.getByRole('dialog', {
      name:'A Child Burns With Fever'
    });
    var firstChoice = page.locator('#ev-options .event-choice').first();
    var resolveButton = firstChoice.locator('.evopt');
    var detailsButton = firstChoice.locator('.event-details-button');
    await expect(dialog).toHaveAttribute('aria-describedby', 'ev-text');
    await expect(resolveButton).toContainText('Likely');
    await expect(resolveButton).toContainText('Lethal risk to a child');
    await expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    await expect(resolveButton).toHaveAttribute('aria-describedby',
      await detailsButton.getAttribute('aria-controls'));

    var beforeDetails = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState(),
        log:FB.state.log.length
      };
    });
    await detailsButton.click();
    await expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(firstChoice.locator('.event-choice-details')).toContainText(
      'Guaranteed');
    await expect(firstChoice.locator('.event-choice-details')).toContainText(
      'No direct mechanical change');
    await expect(firstChoice.locator('.event-choice-details')).toContainText(
      'If successful');
    await expect(firstChoice.locator('.event-choice-details')).toContainText(
      'If failed');
    await expect(dialog).toBeVisible();
    var afterDetails = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState(),
        log:FB.state.log.length
      };
    });
    expect(afterDetails).toEqual(beforeDetails);

    await resolveButton.hover();
    await expect(page.locator('#tooltip')).toBeVisible();
    await expect(page.locator('#tooltip')).toContainText('If failed');
    await detailsButton.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(resolveButton).toBeFocused();
    await expect(page.locator('#tooltip')).toBeVisible();

    await resolveButton.click();
    await expect(dialog).toBeHidden();
    await expect(resolveButton).toBeHidden();
    await expect(page.locator('#ev-options .evopt', { hasText:'Continue' }))
      .toHaveCount(0);
    var toast = page.locator('.event-receipt-toast');
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText('A Child Burns With Fever');
    await toast.click();
    await expect(page.locator('[data-chronicle-filter="choices"]'))
      .toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tab-log .choice-entry')).toHaveCount(1);
    await expect(page.locator('#tab-log .choice-entry')).toContainText(
      'Pay for a physician.');
  });

test('touch choices keep compact stakes and a full-size independent Details control',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.isTouch = true; });
    await openChildFever(page);

    var row = page.locator('#ev-options .event-choice').first();
    var details = row.locator('.event-details-button');
    var compact = row.locator('.event-impact-chips.compact');
    await expect(compact).toBeVisible();
    var layout = await row.evaluate(function (element) {
      var button = element.querySelector('.event-details-button');
      var card = element.closest('.modalcard');
      return {
        detailsHeight:button.getBoundingClientRect().height,
        rowFits:element.scrollWidth <= element.clientWidth + 1,
        cardOverflow:getComputedStyle(card).overflowY
      };
    });
    expect(layout.detailsHeight).toBeGreaterThanOrEqual(44);
    expect(layout.rowFits).toBe(true);
    expect(['auto', 'scroll']).toContain(layout.cardOverflow);

    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('.event-choice-details')).toBeVisible();
    await expect(page.getByRole('dialog', {
      name:'A Child Burns With Fever'
    })).toBeVisible();
  });

test('Chronicle filters typed receipts, caps each view, and preserves metadata',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var saved = await page.evaluate(function () {
      var s = FB.state;
      s.log = [];
      for (var i = 0; i < 90; i++) {
        FB.news(s, FB.msg('news.e2e.event_clarity_news',
          'Ordinary news {n}', { n:i }), { toast:false });
        var receipt = {
          schema:1,
          eventId:'e2e_choice_' + i,
          optionIndex:0,
          result:'success',
          automated:i % 2 === 0,
          title:FB.msg('news.e2e.event_clarity_title',
            'Recorded choice {n}', { n:i }),
          option:FB.msg('news.e2e.event_clarity_option',
            'Choose path {n}', { n:i }),
          outcome:FB.msg('news.e2e.event_clarity_outcome',
            'Outcome {n}', { n:i }),
          impacts:[{ type:'gold', amount:i + 1, before:0, after:i + 1 }]
        };
        FB.news(s, FB.msg('news.event.autoresolved', {
          forms:{
            select:'value', param:'result', cases:{
              outcome:'⚙ {title}: {choice} — {outcome}',
              other:'⚙ {title}: {choice}'
            }
          }
        }, {
          result:'outcome',
          title:FB.messageParam(receipt.title),
          choice:FB.messageParam(receipt.option),
          outcome:FB.messageParam(receipt.outcome)
        }), { kind:'choice', receipt:receipt, toast:false });
      }
      FB.ui.setChronicleFilter('all');
      FB.ui.showTab('log');
      var payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      return { v:payload.v };
    });

    await page.evaluate(function () {
      FB.ui.setChronicleFilter('all');
      FB.ui.showTab('log');
    });
    await expect(page.locator('#tab-log .logentry')).toHaveCount(80);
    await expect(page.locator('#tab-log .choice-entry').first())
      .toContainText('Recorded choice 89');

    await page.locator('[data-chronicle-filter="choices"]').click();
    await expect(page.locator('#tab-log .logentry')).toHaveCount(80);
    await expect(page.locator('#tab-log .logentry:not(.choice-entry)')).toHaveCount(0);
    var exactMoney = await page.evaluate(function () {
      return FB.eventImpactText(FB.state, {
        type:'gold', amount:90, before:0, after:90
      }, 'resolved');
    });
    await expect(page.locator('#tab-log .choice-entry').first())
      .toContainText(exactMoney);
    await expect(page.locator('#tab-log .choice-entry').last())
      .toContainText('Recorded choice 10');

    await page.locator('[data-chronicle-filter="news"]').click();
    await expect(page.locator('#tab-log .logentry')).toHaveCount(80);
    await expect(page.locator('#tab-log .choice-entry')).toHaveCount(0);
    await expect(page.locator('#tab-log .logentry').first())
      .toContainText('Ordinary news 89');
    await expect(page.locator('#tab-log .logentry').last())
      .toContainText('Ordinary news 10');

    expect(saved.v).toBe(3);
    var metadata = await page.evaluate(function () {
      var choices = FB.state.log.filter(function (entry) {
        return entry.kind === 'choice';
      });
      var legacy = JSON.parse(JSON.stringify(choices[0]));
      delete legacy.kind;
      delete legacy.receipt;
      FB.state.log.push(legacy);
      FB.ui.setChronicleFilter('all');
      FB.ui.setChronicleFilter('news');
      return {
        choices:choices.length,
        descriptor:!!(choices[0].msg && choices[0].receipt.title.key &&
          choices[0].receipt.option.key && choices[0].receipt.outcome.key),
        legacyCountsAsNews:document.querySelector('#tab-log')
          .textContent.indexOf('Recorded choice 0') >= 0
      };
    });
    expect(metadata).toEqual({
      choices:90,
      descriptor:true,
      legacyCountsAsNews:true
    });
  });

test('every core option effect is previewable and every custom effect has an adapter',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var coverage = await page.evaluate(function () {
      var missingKeys = {};
      var missingAdapters = {};
      function inspectEffects(fx) {
        if (!fx) return;
        Object.keys(fx).forEach(function (key) {
          if (!FB.eventPreviewEffectKeys[key]) missingKeys[key] = true;
        });
        if (fx.custom) {
          var adapter = FB.eventImpactAdapters[fx.custom];
          if (!adapter || typeof adapter.preview !== 'function' ||
              typeof adapter.report !== 'function') {
            missingAdapters[fx.custom] = true;
          }
        }
      }
      FBDATA.events.forEach(function (event) {
        (event.options || []).forEach(function (option) {
          inspectEffects(option.effects);
          inspectEffects(option.success && option.success.effects);
          inspectEffects(option.failure && option.failure.effects);
        });
      });
      return {
        missingKeys:Object.keys(missingKeys).sort(),
        missingAdapters:Object.keys(missingAdapters).sort()
      };
    });
    expect(coverage).toEqual({ missingKeys:[], missingAdapters:[] });
  });
