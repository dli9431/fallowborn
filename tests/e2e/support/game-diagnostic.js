'use strict';

async function attachPageDiagnostic(page, testInfo, name) {
  if (page.isClosed()) return;
  let diagnostic;
  try {
    diagnostic = await page.evaluate(function () {
      const screens = Array.from(document.querySelectorAll('.screen')).filter(function (screen) {
        return !screen.classList.contains('hidden');
      }).map(function (screen) {
        return screen.id;
      });
      let save = null;
      if (window.FB && FB.state && FB.save && FB.save.serialize) {
        try {
          save = JSON.parse(FB.save.serialize());
        } catch (error) {
          save = { serializationError: String(error) };
        }
      }
      return {
        url: location.href,
        title: document.title,
        visibleScreens: screens,
        genericModalOpen: !!document.querySelector('#genmodal:not(.hidden)'),
        eventModalOpen: !!document.querySelector('#eventmodal:not(.hidden)'),
        bodyText: (document.body.innerText || '').slice(0, 12000),
        save: save
      };
    });
  } catch (error) {
    diagnostic = {
      url: page.url(),
      diagnosticError: String(error)
    };
  }
  await testInfo.attach(name || 'game-state', {
    body: Buffer.from(JSON.stringify(diagnostic, null, 2), 'utf8'),
    contentType: 'application/json'
  });
}

module.exports = {
  attachPageDiagnostic:attachPageDiagnostic
};
