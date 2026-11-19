'use strict';
const {EventEmitter} = require('events');
const {test,expect} = require('../support/fixture');
const {createPredecessorSource} = require('../support/game/retained-catalogue-compatibility');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[]);

test('predecessor teardown closes a context acquired after setup is interrupted exactly once',async function () {
  const source = createPredecessorSource();
  let acquired, openedPages = 0, closes = 0;
  const browser = {newContext:() => new Promise(resolve => { acquired = resolve; })};
  const opening = source.open(browser);
  const interrupted = expect(opening).rejects.toThrow('closed during context creation');
  const closing = source.close();
  const repeated = source.close();
  acquired({newPage:async () => { openedPages++; },close:async () => { closes++; }});
  await Promise.all([interrupted,closing,repeated]);
  await source.close();
  expect(openedPages).toBe(0);
  expect(closes).toBe(1);
});

test('predecessor teardown keeps a page creation error when closing also fails',async function () {
  const source = createPredecessorSource();
  const pageError = new Error('Predecessor page creation failed');
  const closeError = new Error('Predecessor context close failed');
  let closes = 0;
  const browser = {newContext:async () => ({
    newPage:async () => { throw pageError; },
    close:async () => { closes++; throw closeError; }
  })};
  await expect(source.open(browser)).rejects.toBe(pageError);
  await expect(source.close()).rejects.toBe(closeError);
  await source.close();
  expect(closes).toBe(1);
});

test('predecessor teardown reports page faults when preparation stops before a save',async function () {
  const source = createPredecessorSource();
  const page = new EventEmitter();
  let closes = 0;
  const browser = {newContext:async () => ({newPage:async () => page,close:async () => { closes++; }})};
  await source.open(browser);
  page.emit('console',{type:() => 'error',text:() => 'Interrupted predecessor preparation'});
  await expect(source.close()).rejects.toThrow('console error: Interrupted predecessor preparation');
  await source.close();
  expect(closes).toBe(1);
});
