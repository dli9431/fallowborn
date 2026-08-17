'use strict';

const { expect } = require('../fixture');

async function waitForUiRefresh(page) {
  await page.evaluate(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  });
}

async function openMenu(page) {
  await page.getByRole('button', { name:'Menu', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Menu', exact:true })).toBeVisible();
}

module.exports = {
  openMenu:openMenu,
  waitForUiRefresh:waitForUiRefresh
};
