'use strict';
// Scenario-local SDK double. The game still loads through its real HTML entrypoint.
async function mockCrazyGames(page, options) {
  await page.addInitScript(function (options) {
    var data = JSON.parse(sessionStorage.getItem('__cg_test_data') || JSON.stringify(options.data || {}));
    var api = window.__cgTest = { data:data, calls:[], failWrite:false, auth:null };
    function persist() { sessionStorage.setItem('__cg_test_data', JSON.stringify(data)); }
    window.CrazyGames = { SDK:{
      init:function () {
        api.calls.push('init');
        return options.failInit ? Promise.reject(new Error('SDK connection failed')) : Promise.resolve();
      },
      data:{
        getItem:function (key) { api.calls.push('get:' + key); return data[key] || null; },
        setItem:function (key, value) {
          if (api.failWrite) throw { code:'dataLimitExcedeed', message:'SDK quota rejected' };
          var next = Object.assign({}, data); next[key] = value;
          if (new TextEncoder().encode(JSON.stringify(next)).length > 1048576) throw new Error('quota');
          data[key] = value; persist(); api.calls.push('set:' + key);
        },
        removeItem:function (key) { delete data[key]; persist(); }
      },
      user:{ isUserAccountAvailable:true, addAuthListener:function (fn) { api.auth = fn; } },
      game:{ gameplayStart:function () { api.calls.push('start'); }, gameplayStop:function () { api.calls.push('stop'); } }
    } };
  }, options || {});
}
module.exports = { mockCrazyGames };
