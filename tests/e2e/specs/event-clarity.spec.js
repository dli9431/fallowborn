'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'css/style.css',
  'js/events.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'data/events_common.js',
  'data/events_world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

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
        decisionImpacts:receipt.impacts.filter(function (record) {
          return record.type === 'system' && record.system === 'decision';
        }).length,
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
    expect(previewWords).not.toContain('Permanent story decision');
    expect(previewWords).toContain('Prestige may increase');
    expect(previewWords).toContain('Piety may increase');
    expect(previewWords).not.toContain('Prestige +10');
    expect(previewWords).not.toContain('Piety +7');
    expect(result.result).toBe(result.oldSucceeded ? 'success' : 'failure');
    expect(result.mechanicsEqual).toBe(true);
    expect(result.actualGold).toMatchObject({
      type:'gold', before:3, after:0, amount:-3
    });
    expect(result.decisionImpacts).toBe(0);
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

test('wedding receipts retain the named suitor after marriage clears courtship',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);

    var result = await page.evaluate(function () {
      var s = FB.state;
      var p = s.player;
      var me = s.chars[p.charId];
      var suitor = FB.makeCharacter(s, {
        name:'Aelfred',
        dyn:'Ash',
        sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture,
        religion:me.religion,
        born:s.date.year - 22,
        traitsN:0,
        role:'suitor'
      });
      p.gold = 1000;
      p.courtingId = suitor.id;
      p.flags.courting = 1;
      p.courtshipTerms = null;

      var proposal = FBDATA.events.filter(function (event) {
        return event.id === 'proposal_made';
      })[0];
      var authored = proposal.options[0];
      var option = {
        label:authored.label,
        desc:authored.desc,
        chance:1,
        success:authored.success,
        failure:authored.failure
      };
      var event = {
        id:proposal.id,
        title:proposal.title,
        text:proposal.text,
        options:[option]
      };

      /* Ordinary English boot has no generated lang_en catalog. The source
         registered by eventMessage must be sufficient to render every param. */
      delete FBDATA.lang.en;
      var receipt = FB.resolveEventOption(s, event, option, {}, {
        automated:false
      });
      return {
        rendered:FB.renderMessage(receipt.outcome, {
          state:s,
          viewer:p.charId
        }),
        suitorParam:receipt.outcome.params.suitor,
        courtingId:p.courtingId,
        spouseLinked:suitor.spouseId === me.id
      };
    });

    expect(result.rendered).toContain('Aelfred Ash');
    expect(result.rendered).not.toContain('fx.param.');
    expect(result.suitorParam).toBe('Aelfred Ash');
    expect(result.courtingId).toBeNull();
    expect(result.spouseLinked).toBe(true);
  });

test('desktop choices keep side tooltips visible and separate from resolution',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await openChildFever(page);

    var dialog = page.getByRole('dialog', {
      name:'A Child Burns With Fever'
    });
    var firstChoice = page.locator('#ev-options .event-choice').first();
    var resolveButton = firstChoice.locator('.evopt');
    var details = firstChoice.locator('.event-choice-details');
    await expect(dialog).toHaveAttribute('aria-describedby', 'ev-text');
    await expect(resolveButton).not.toContainText('Likely');
    await expect(resolveButton).not.toContainText('Lethal risk to a child');
    await expect(firstChoice.locator('.event-impact-chips.compact')).toHaveCount(0);
    await expect(firstChoice.locator('.event-details-button')).toHaveCount(0);
    await expect(resolveButton).toHaveAttribute('aria-describedby',
      await details.getAttribute('id'));

    var beforeTooltip = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState(),
        log:FB.state.log.length
      };
    });

    await resolveButton.hover();
    await expect(page.locator('#tooltip')).toBeVisible();
    await expect(page.locator('#tooltip')).not.toContainText('Guaranteed');
    await expect(page.locator('#tooltip')).not.toContainText(
      'No direct mechanical change');
    await expect(page.locator('#tooltip')).toContainText('If failed');

    var lowestChoice = page.locator('#ev-options .event-choice .evopt').last();
    await lowestChoice.hover();
    var tooltipPlacement = await page.evaluate(function () {
      var choices = document.querySelectorAll('#ev-options .event-choice .evopt');
      var choice = choices[choices.length - 1];
      var tooltip = document.getElementById('tooltip');
      var choiceRect = choice.getBoundingClientRect();
      var tooltipRect = tooltip.getBoundingClientRect();
      return {
        choiceLeft:choiceRect.left,
        choiceRight:choiceRect.right,
        tipLeft:tooltipRect.left,
        tipRight:tooltipRect.right,
        tipBottom:tooltipRect.bottom,
        viewportHeight:window.innerHeight,
        roomOnRight:choiceRect.right + 10 + tooltipRect.width <=
          window.innerWidth - 8
      };
    });
    expect(tooltipPlacement.tipBottom).toBeLessThanOrEqual(
      tooltipPlacement.viewportHeight - 7);
    if (tooltipPlacement.roomOnRight) {
      expect(tooltipPlacement.tipLeft).toBeGreaterThanOrEqual(
        tooltipPlacement.choiceRight + 9);
    } else {
      expect(tooltipPlacement.tipRight).toBeLessThanOrEqual(
        tooltipPlacement.choiceLeft - 9);
    }

    await resolveButton.focus();
    await expect(resolveButton).toBeFocused();
    await expect(page.locator('#tooltip')).toBeVisible();
    var afterTooltip = await page.evaluate(function () {
      return {
        save:FB.save.serialize(),
        rng:FB.getRngState(),
        log:FB.state.log.length
      };
    });
    expect(afterTooltip).toEqual(beforeTooltip);

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

test('touch choices use a full-size question-mark Details control without inline chips',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.isTouch = true; });
    await openChildFever(page);

    var row = page.locator('#ev-options .event-choice').first();
    var details = row.locator('.event-details-button');
    await expect(row.locator('.event-impact-chips.compact')).toHaveCount(0);
    await expect(details).toHaveText('?');
    await expect(details).toHaveAttribute('aria-label', 'Details');
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
    await expect(details).toHaveText('?');
    await expect(details).toHaveAttribute('aria-label', 'Hide details');
    await expect(row.locator('.event-choice-details')).toBeVisible();
    await expect(row.locator('.event-choice-details')).not.toContainText('Guaranteed');
    await expect(row.locator('.event-choice-details')).not.toContainText(
      'No direct mechanical change');
    await expect(page.getByRole('dialog', {
      name:'A Child Burns With Fever'
    })).toBeVisible();
  });

test('event result toasts stay in the bottom-left map toast region',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:740 });
    await startGame(page, testInfo);
    await expect(page.locator('#mobile-pane-resizer'))
      .toHaveAttribute('aria-valuetext', 'Balanced');
    await expect(page.locator('#maphud')).toBeVisible();
    expect(await page.locator('#mapwrap').evaluate(function (map) {
      return map.getBoundingClientRect().height;
    })).toBeGreaterThanOrEqual(189);
    await openChildFever(page);

    await page.locator('#ev-options .event-choice .evopt').first().click();
    var toast = page.locator('.event-receipt-toast');
    await expect(toast).toHaveCount(1);
    var placement = await toast.evaluate(function (element) {
      var toastRect = element.getBoundingClientRect();
      var mapRect = document.getElementById('mapwrap').getBoundingClientRect();
      var panelsRect = document.getElementById('panels').getBoundingClientRect();
      return {
        parentId:element.parentNode.id,
        leftGap:toastRect.left - mapRect.left,
        bottomGap:mapRect.bottom - toastRect.bottom,
        toastWidth:Math.round(toastRect.width),
        mapWidth:Math.round(mapRect.width),
        insideMap:toastRect.top >= mapRect.top &&
          toastRect.right <= mapRect.right &&
          toastRect.bottom <= mapRect.bottom,
        clearsRightButtons:toastRect.right <= mapRect.right - 90,
        clearsPanels:toastRect.bottom <= panelsRect.top + 1
      };
    });
    expect(placement.parentId).toBe('toasts');
    expect(placement.leftGap).toBeGreaterThanOrEqual(9);
    expect(placement.leftGap).toBeLessThanOrEqual(11);
    expect(placement.bottomGap).toBeGreaterThanOrEqual(9);
    expect(placement.bottomGap).toBeLessThanOrEqual(11);
    expect(placement.toastWidth).toBeGreaterThanOrEqual(placement.mapWidth - 118);
    expect(placement.insideMap).toBe(true);
    expect(placement.clearsRightButtons).toBe(true);
    expect(placement.clearsPanels).toBe(true);
  });

test('tablet-width choices use question-mark details and suppress event tooltips',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:900, height:700 });
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.isTouch = false; });
    await openChildFever(page);

    var row = page.locator('#ev-options .event-choice').first();
    var choice = row.locator('.evopt');
    var detailsButton = row.locator('.event-details-button');
    await expect(detailsButton).toBeVisible();
    await expect(detailsButton).toHaveText('?');

    await choice.hover();
    await expect(page.locator('#tooltip')).toBeHidden();
    await choice.focus();
    await expect(page.locator('#tooltip')).toBeHidden();

    await detailsButton.click();
    await expect(detailsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('.event-choice-details')).toBeVisible();
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
          impacts:[
            { type:'gold', amount:i + 1, before:0, after:i + 1 },
            {
              type:'system', system:'decision', permanent:true, resolved:true
            }
          ]
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
    await page.setViewportSize({ width:390, height:740 });
    var choicePadding = await page.locator('#tab-log .choice-entry').first()
      .evaluate(function (entry) {
        var style = getComputedStyle(entry);
        return [style.paddingTop, style.paddingRight,
          style.paddingBottom, style.paddingLeft];
      });
    expect(choicePadding).toEqual(['12px', '12px', '12px', '12px']);
    var exactMoney = await page.evaluate(function () {
      return FB.eventImpactText(FB.state, {
        type:'gold', amount:90, before:0, after:90
      }, 'resolved');
    });
    await expect(page.locator('#tab-log .choice-entry').first())
      .toContainText(exactMoney);
    await expect(page.locator('#tab-log .choice-entry').last())
      .toContainText('Recorded choice 10');
    await expect(page.locator('#tab-log')).not.toContainText(
      'Permanent story decision');

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

test('event option buttons do not render helper desc text under label',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () {
      var event = {
        id: 'test_desc_event',
        title: 'A Test Event With Descs',
        text: 'An event testing option helper text omission.',
        options: [
          {
            label: 'Acknowledge the cost in public.',
            desc: 'Common Voice recovers, but thin ranks lower abstract condition.',
            effects: { popularOpinion: 3, prestige: -2 }
          },
          {
            label: 'Demand one more effort.',
            desc: 'Discipline rises while Common Voice falls.',
            effects: { popularOpinion: -2 }
          }
        ]
      };
      var eventById = FB.eventById;
      FB.eventById = function (id) {
        return id === event.id ? event : eventById(id);
      };
      FB.ui.runEvents([{ id:event.id, ctx:{} }]);
    });

    var dialog = page.getByRole('dialog', { name: 'A Test Event With Descs' });
    await expect(dialog).toBeVisible();

    var buttons = page.locator('#ev-options .evopt');
    await expect(buttons).toHaveCount(2);

    // Labels are rendered
    await expect(buttons.first()).toContainText('Acknowledge the cost in public.');
    await expect(buttons.last()).toContainText('Demand one more effort.');

    // Helper descs are NOT rendered inside the buttons
    await expect(buttons.first()).not.toContainText('Common Voice recovers');
    await expect(buttons.first()).not.toContainText('thin ranks lower abstract condition');
    await expect(buttons.last()).not.toContainText('Discipline rises while Common Voice falls');

    // Tooltip provides the effect preview instead
    await buttons.first().hover();
    var tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Guaranteed');
  });
