/* Story registry. A story is a registered module with one lifecycle and one
   shared presentation. World stories attach when the campaign's bookmark
   lists them in `stories`; player tracks attach when the chosen start
   scenario lists them in `tracks`. Each attached story keeps one saved
   record at state.stories[id]. Engine code calls only this registry, never
   a story by name, and stories register at load time only. */
(function () {
  'use strict';
  var registry = [], byId = {}, types = {}, sealed = false;
  var KINDS = { world:true, track:true };
  var HOOKS = ['appliesTo', 'init', 'day', 'season', 'year', 'title', 'intro',
    'status', 'choices', 'quote', 'blocker', 'review', 'apply',
    'validate', 'migrate', 'restore'];
  function own(o, key) {
    return !!o && Object.prototype.hasOwnProperty.call(o, key);
  }
  function record(s, id) {
    return s && s.stories && own(s.stories, id) ? s.stories[id] : null;
  }
  function attachedList(s) {
    if (!s || !s.stories) return [];
    return registry.filter(function (story) { return !!record(s, story.id); });
  }
  function run(s, hook) {
    var list = attachedList(s);
    for (var i = 0; i < list.length; i++) {
      if (list[i][hook]) list[i][hook](s, record(s, list[i].id));
    }
  }

  FB.stories = {
    /* Trusted classic scripts register reusable factories before boot seals
       the registry. Definitions contain data, not executable save fields. */
    registerType:function (id, factory) {
      if (sealed) throw new Error('Story types register at load time only.');
      if (!/^[a-z][a-z0-9_]*$/.test(id) || own(types, id) || typeof factory !== 'function')
        throw new Error('Invalid or duplicate story type ' + id + '.');
      types[id] = factory;
    },
    registerData:function (def) {
      if (sealed) throw new Error('Stories register at load time only.');
      if (!def || !own(types, def.type)) throw new Error('Unknown story type.');
      return FB.stories.register(types[def.type](def));
    },
    /* def: { id, kind:'world'|'track', requires:[story ids], and any of the
       HOOKS above }. A required story must already be registered, so the
       registration order is also the attachment and dispatch order. */
    register:function (def) {
      if (sealed) throw new Error('Stories register at load time only: ' +
        String(def && def.id) + '.');
      if (!def || typeof def.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(def.id))
        throw new Error('A story needs a lowercase slug id.');
      if (own(byId, def.id)) throw new Error('Duplicate story ' + def.id + '.');
      if (!own(KINDS, def.kind))
        throw new Error('Story ' + def.id + ' needs kind world or track.');
      if (typeof def.init !== 'function')
        throw new Error('Story ' + def.id + ' needs an init hook.');
      for (var i = 0; i < HOOKS.length; i++) {
        if (def[HOOKS[i]] !== undefined && typeof def[HOOKS[i]] !== 'function')
          throw new Error('Story ' + def.id + ' hook ' + HOOKS[i] + ' must be a function.');
      }
      if (def.requires !== undefined && (!Array.isArray(def.requires) ||
          def.requires.some(function (id) { return !own(byId, id); })))
        throw new Error('Story ' + def.id + ' requires a story registered before it.');
      registry.push(def);
      byId[def.id] = def;
      return def;
    },
    /* Boot calls this once every script has loaded. */
    seal:function () { sealed = true; },
    get:function (id) {
      return typeof id === 'string' && own(byId, id) ? byId[id] : null;
    },
    list:function () { return registry.slice(); },
    record:record,
    attached:function (s) {
      return attachedList(s).map(function (story) { return story.id; });
    },
    /* Campaign creation. World stories listed by the bookmark attach first in
       registration order, then the scenario's tracks. A story attaches only
       when every required story is attached, appliesTo agrees and init
       returns its record. A campaign with no story gets no state.stories. */
    start:function (s, options) {
      var bookmark = FB.bookmark(s.start && s.start.id);
      var world = bookmark && Array.isArray(bookmark.stories) ? bookmark.stories : [];
      var tracks = options && Array.isArray(options.tracks) ? options.tracks : [];
      var added = [];
      for (var i = 0; i < registry.length; i++) {
        var story = registry[i];
        var wanted = story.kind === 'world' ? world : tracks;
        if (wanted.indexOf(story.id) < 0 || record(s, story.id)) continue;
        if ((story.requires || []).some(function (id) { return !record(s, id); })) continue;
        if (story.appliesTo && !story.appliesTo(s)) continue;
        var created = story.init(s);
        if (!created || typeof created !== 'object' || Array.isArray(created)) continue;
        if (!s.stories) s.stories = {};
        s.stories[story.id] = created;
        added.push(story.id);
      }
      return added;
    },
    day:function (s) { run(s, 'day'); },
    season:function (s) { run(s, 'season'); },
    year:function (s) { run(s, 'year'); },
    restore:function (s) { run(s, 'restore'); },
    /* Save migration on the detached copy, before validation. */
    migrate:function (state) {
      for (var i = 0; i < registry.length; i++) {
        if (registry[i].migrate) registry[i].migrate(state);
      }
    },
    /* Deeds cards: every attached story whose status hook answers. */
    cards:function (s) {
      var out = [];
      attachedList(s).forEach(function (story) {
        var status = story.status && story.status(s, record(s, story.id));
        if (!status) return;
        out.push({ id:story.id, kind:story.kind,
          title:story.title ? story.title(s, record(s, story.id)) : story.id,
          phase:status.phase, name:status.name, lines:status.lines || [] });
      });
      return out;
    },
    status:function (s, id) {
      var story = FB.stories.get(id), rec = record(s, id);
      return story && rec && story.status ? story.status(s, rec) : null;
    },
    choices:function (s, id) {
      var story = FB.stories.get(id), rec = record(s, id);
      return story && rec && story.choices ? story.choices(s, rec) : [];
    },
    /* Quotes are pure and stamped from current facts; apply rechecks the
       reviewed quote and refuses a decision whose facts changed. */
    quote:function (s, id, choiceId) {
      var story = FB.stories.get(id), rec = record(s, id);
      if (!story || !rec || !story.quote) return { id:choiceId, allowed:false,
        reason:'no_story', facts:null, stamp:'null' };
      return story.quote(s, rec, choiceId);
    },
    apply:function (s, id, choiceId, reviewed) {
      var story = FB.stories.get(id), rec = record(s, id);
      return !!(story && rec && story.apply && story.apply(s, rec, choiceId, reviewed));
    }
  };

  /* The shared story sheet. One story card in Deeds opens a list of choices
     with their effects and conditions; each choice opens a reviewed modal,
     and confirmation rechecks the quote. Back returns to the list; Close and
     the outcome acknowledgment return to the Deeds card with its scroll
     position and focus (docs/designs/ui.md). */
  if (FB.ui) {
    var UI = FB.ui;
    var cardNode = function (id) {
      var nodes = document.querySelectorAll('[data-story-card]');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].getAttribute('data-story-card') === id) return nodes[i];
      }
      return null;
    };
    var blockerText = function (story, s, quote) {
      var text = story.blocker && story.blocker(s, record(s, story.id), quote.reason);
      return text || FB.T('The current people, territory, route, or mandate no longer allows this choice.');
    };
    UI.showStorySheet = function (id) {
      var s = FB.state, story = FB.stories.get(id), rec = record(s, id);
      if (!story || !rec) return;
      if (s.player.flags && s.start && s.start.onboarding === 'ruler') s.player.flags.tut_ruler_story = 1;
      var esc = FB.esc, status = FB.stories.status(s, id);
      var html = '<div class="gm-body-text">';
      if (story.intro) html += '<p>' + esc(story.intro(s, rec)) + '</p>';
      if (status) {
        html += '<h3>' + esc(status.name) + '</h3>';
        for (var line of status.lines || []) html += '<p class="hint">' + esc(line) + '</p>';
      }
      html += '</div>';
      for (var choice of FB.stories.choices(s, id)) {
        var quote = FB.stories.quote(s, id, choice.id);
        html += '<button type="button" class="actionbtn" data-story-choice="' +
          esc(choice.id) + '" aria-disabled="' + (!quote.allowed) + '">' +
          '<b>' + esc(choice.label) + '</b><br><span class="hint">' +
          esc(choice.detail) + '</span></button>';
      }
      UI.openModal(story.title ? story.title(s, rec) : id, html,
        { returnFocus:document.activeElement });
      document.querySelectorAll('[data-story-choice]').forEach(function (node) {
        node.addEventListener('click', function () {
          reviewChoice(id, node.getAttribute('data-story-choice'));
        });
      });
    };
    var reviewChoice = function (id, choiceId) {
      var esc = FB.esc, story = FB.stories.get(id);
      var selected = FB.stories.choices(FB.state, id).filter(function (item) {
        return item.id === choiceId;
      })[0];
      if (!story || !selected) return;
      var reviewed = FB.stories.quote(FB.state, id, choiceId);
      var body = '<div class="gm-body-text"><p>' + esc(selected.detail) + '</p>' +
        (reviewed.allowed ? '' : '<p class="hint">' +
          esc(blockerText(story, FB.state, reviewed)) + '</p>') + '</div>';
      if (reviewed.allowed && story.review) {
        for (var line of story.review(FB.state, record(FB.state, id), choiceId, reviewed) || [])
          body += '<p class="hint">' + esc(line) + '</p>';
      }
      if (reviewed.allowed) body += '<button type="button" class="btn primary" id="gm-story-confirm">' +
        esc(FB.T('Confirm {choice}', { choice:selected.label })) + '</button>';
      UI.openModal(FB.T('Review {choice}', { choice:selected.label }),
        body, { historyView:true, historyBack:true });
      var confirm = document.getElementById('gm-story-confirm');
      if (!confirm) return;
      confirm.addEventListener('click', function () {
        if (!FB.stories.apply(FB.state, id, choiceId, reviewed)) {
          UI.openModal(FB.T('Terms changed'),
            '<p>' + esc(FB.T('This decision changed while it was open. Return to the situation and review it again.')) + '</p>');
          return;
        }
        var deeds = document.getElementById('tab-actions');
        var scroll = deeds && deeds.scrollTop;
        UI.closeModal();
        UI.refresh();
        if (deeds) deeds.scrollTop = scroll;
        var updated = FB.stories.status(FB.state, id);
        UI.openModal(FB.T('Decision recorded'),
          '<div class="gm-body-text"><p>' + esc(selected.label) + '</p>' +
          (updated ? '<p>' + esc(updated.name) + '</p>' : '') +
          '</div><button type="button" class="btn primary" id="gm-story-continue">' +
          esc(FB.T('Continue')) + '</button>',
          { returnFocus:cardNode(id) });
        document.getElementById('gm-story-continue').addEventListener('click',
          UI.closeModal);
      });
    };
  }
})();
