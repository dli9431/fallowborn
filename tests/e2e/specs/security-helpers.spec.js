'use strict';

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/util.js', 'js/model.js', 'data/cultures.js']);

// These boundaries must behave identically on chromium-file and served origins.

test('escaped text round-trips through text and either quoted attribute boundary',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const rows = await page.evaluate(function () {
      return [
        '" data-injected="yes"><img src=x> & &#39;',
        "' data-injected='yes'><img src=x> & &quot;",
        null, undefined, 42
      ].map(function (value) {
        const escaped = FB.esc(value);
        const root = document.createElement('div');
        root.innerHTML = '<span>' + escaped + '</span>' +
          '<input value="' + escaped + '">' +
          "<input value='" + escaped + "'>" + FB.crestTag(value, 24, 24);
        return {
          source:String(value),
          text:root.querySelector('span').textContent,
          doubleQuoted:root.querySelectorAll('input')[0].getAttribute('value'),
          singleQuoted:root.querySelectorAll('input')[1].getAttribute('value'),
          crest:root.querySelector('canvas').getAttribute('data-seed'),
          injected:root.querySelectorAll('[data-injected], img').length
        };
      });
    });
    for (const row of rows) {
      expect(row.text).toBe(row.source);
      expect(row.doubleQuoted).toBe(row.source);
      expect(row.singleQuoted).toBe(row.source);
      expect(row.crest).toBe(row.source);
      expect(row.injected).toBe(0);
    }
  });

test('JSON faith properties cannot change prototypes during inheritance or cloning',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      FBDATA.religions.scan_parent = {
        name:'Scan parent', group:'christian',
        properties:{ custom:{ keep:1, inherited:true } }
      };
      FBDATA.religions.scan_child = JSON.parse(
        '{"name":"Scan child","group":"scan_parent","properties":{' +
        '"__proto__":{"scanPolluted":true},' +
        '"constructor":{"prototype":{"scanPolluted":true}},' +
        '"prototype":{"scanPolluted":true},' +
        '"custom":{"keep":2,"__proto__":{"scanPolluted":true},' +
        '"rows":[{"__proto__":{"scanPolluted":true},"value":3}]}}}');
      const errors = FB.configureReligions();
      const faith = FB.religionOf('scan_child', null);
      const properties = faith.properties;
      const own = Object.prototype.hasOwnProperty;
      return {
        errors:errors,
        inherited:properties.custom.inherited,
        keep:properties.custom.keep,
        row:properties.custom.rows[0].value,
        cleanPrototype:Object.getPrototypeOf(properties) === Object.prototype &&
          Object.getPrototypeOf(properties.custom) === Object.prototype &&
          Object.getPrototypeOf(properties.custom.rows[0]) === Object.prototype,
        polluted:({}).scanPolluted === true || properties.scanPolluted === true ||
          properties.custom.scanPolluted === true ||
          properties.custom.rows[0].scanPolluted === true,
        reserved:['__proto__', 'constructor', 'prototype'].some(function (key) {
          return own.call(properties, key) || own.call(properties.custom, key) ||
            own.call(properties.custom.rows[0], key);
        }),
        parentUnchanged:FBDATA.religions.scan_parent.properties.custom.keep === 1,
        sourceUnchanged:own.call(FBDATA.religions.scan_child.properties, '__proto__')
      };
    });
    expect(result).toEqual({
      errors:[], inherited:true, keep:2, row:3, cleanPrototype:true,
      polluted:false, reserved:false, parentUnchanged:true, sourceUnchanged:true
    });
  });
