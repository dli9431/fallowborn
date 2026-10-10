/* Header reader retained from public game revision 580d55be, js/save.js.
   Loaded only inside a test browser to exercise backward rejection. */
(function () {
  const S = {};
  S.FORMAT = Object.freeze({ v:4, titleIds:1, authoritySchema:4, platformSchema:1 });
  S.envelopeIssue = function (data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.v !== 3 && data.v !== S.FORMAT.v) return 'v';
    for (const key of ['titleIds', 'authoritySchema', 'platformSchema']) {
      if (data[key] === undefined && (data.v === 3 || key === 'platformSchema')) continue;
      if (data[key] !== S.FORMAT[key]) return key;
    }
    return null;
  };
  window.legacyPlatformReader = S;
})();
