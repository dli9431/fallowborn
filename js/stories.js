/* Story registry. A story is a registered module with one lifecycle and one
   shared presentation. World stories attach when the campaign's bookmark
   lists them in `stories`; player tracks attach when the chosen start
   scenario lists them in `tracks`. Each attached story keeps one saved
   record at state.stories[id]. Engine code calls only this registry, never
   a story by name, and stories register at load time only. */
(function () {
  'use strict';
  var registry = [], byId = {}, types = {}, typeFiles = {}, validators = {}, sealed = false;
  var nativeStories = [], typesSealed = false;
  var KINDS = { world:true, track:true };
  var HOOKS = ['appliesTo', 'init', 'day', 'season', 'year', 'title', 'intro',
    'status', 'choices', 'quote', 'blocker', 'review', 'apply',
    'validate', 'migrate', 'restore', 'foundRevolt', 'appliesToBookmark', 'observe', 'people'];
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
      if (hook !== 'restore') observe(s, list[i].id);
    }
  }
  // Observers consume committed facts, including boundaries inside a source
  // dispatch. Restore deliberately never delivers new household opportunities.
  function observe(s, sourceId) {
    attachedList(s).forEach(function (story) {
      if (story.observe) story.observe(s, record(s, story.id), sourceId);
    });
  }

  function plain(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function pathValue(row, path) {
    return path.split('.').reduce(function (value, key) {
      return value && own(value, key) ? value[key] : null;
    }, row);
  }
  function referenceValid(ref, def) {
    if (typeof ref === 'string') return !!ref;
    if (!plain(ref)) return false;
    var kind = ref.kind || (ref.storyId ? 'story' : null), keys;
    if (kind === 'realm_ruler') keys = ['kind','realmId'];
    else if (kind === 'story') keys = ['kind','storyId','field'];
    else if (kind === 'opening_actor') keys = ['kind','actorId'];
    else if (kind === 'region') keys = ['kind','regionId'];
    else if (kind === 'provinces') keys = ['kind','provinceIds'];
    else return false;
    if (Object.keys(ref).some(function (key) { return keys.indexOf(key) < 0; })) return false;
    if (kind === 'story') return typeof ref.storyId === 'string' &&
      Array.isArray(def.requires) && def.requires.indexOf(ref.storyId) >= 0 && typeof ref.field === 'string' &&
      /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/.test(ref.field);
    if (kind === 'provinces') return Array.isArray(ref.provinceIds) && !!ref.provinceIds.length &&
      ref.provinceIds.every(function (id, i) { return typeof id === 'string' && !!id && ref.provinceIds.indexOf(id) === i; });
    return typeof ref[keys[1]] === 'string' && !!ref[keys[1]];
  }
  function resolve(s, ref) {
    if (typeof ref === 'string') return ref;
    if (!ref) return null;
    var kind = ref.kind || (ref.storyId ? 'story' : null);
    if (kind === 'story') return pathValue(record(s, ref.storyId), ref.field);
    if (kind === 'realm_ruler') {
      var person = FB.stories.ruler(s, ref.realmId);
      return person && person.id || null;
    }
    if (kind === 'opening_actor') {
      var person = FB.bookmarkActor(s, ref.actorId);
      return person && person.id || null;
    }
    if (kind === 'provinces') return ref.provinceIds.slice();
    if (kind === 'region') {
      var bm = FB.campaignBookmark(s), region = bm.storyRegions && bm.storyRegions[ref.regionId];
      if (!region) return [];
      return (bm.provinces || []).filter(function (p) {
        return !p.wasteland && (region.provinceIds ? region.provinceIds.indexOf(p.id) >= 0 :
          (region.duchies || []).indexOf(p.duchy) >= 0);
      }).map(function (p) { return p.id; }).sort();
    }
    return null;
  }
  function declarationFaults(def, bm, attached, context) {
    var lookup = context || FB.stories, entries = lookup.list();
    var errors = [];
    function bad(detail) { errors.push('story ' + String(def && def.id) + ': ' + detail); }
    if (!plain(def) || !own(types, def.type)) { bad('unknown story type'); return errors; }
    if ((def.firstYear !== undefined || def.lastYear !== undefined) && (!Number.isInteger(def.firstYear) || !Number.isInteger(def.lastYear) ||
        def.firstYear <= 0 || def.lastYear < def.firstYear)) bad('invalid date window');
    function date(d) { return plain(d) && Number.isInteger(d.year) && d.year > 0 &&
      Number.isInteger(d.season) && d.season >= 0 && d.season < 4 &&
      Number.isInteger(d.day) && d.day >= 1 && d.day <= 90; }
    function day(d) { return d.year * 360 + d.season * 90 + d.day; }
    if ((def.firstDate !== undefined || def.lastDate !== undefined) && (!date(def.firstDate) || !date(def.lastDate) ||
        day(def.lastDate) < day(def.firstDate))) bad('invalid date window');
    if (def.requires !== undefined && (!Array.isArray(def.requires) || def.requires.some(function (id, i) {
      return typeof id !== 'string' || id === def.id || def.requires.indexOf(id) !== i ||
        !lookup.get(id) || attached && attached.indexOf(id) < 0 ||
        lookup.get(def.id) && entries.indexOf(lookup.get(id)) >= entries.indexOf(lookup.get(def.id));
    }))) bad('unreachable requires');
    function walk(row) {
      if (!row || typeof row !== 'object') return;
      if (Array.isArray(row)) { row.forEach(walk); return; }
      if (row.kind === 'realm_ruler' || row.kind === 'story' || row.kind === 'opening_actor' ||
          row.kind === 'region' || row.kind === 'provinces' || row.storyId && row.field) {
        if (!referenceValid(row, def)) { bad('invalid reference'); return; }
        if (bm) {
          if (row.kind === 'realm_ruler' && !(bm.realms || []).some(function (r) { return r.id === row.realmId; })) bad('unresolved ruler reference');
          if (row.kind === 'opening_actor' && !own(bm.opening && bm.opening.actors, row.actorId)) bad('unresolved opening actor reference');
          if (row.kind === 'region' && !own(bm.storyRegions, row.regionId)) bad('unresolved region reference');
          if (row.kind === 'provinces' && row.provinceIds.some(function (id) {
            return !(bm.provinces || []).some(function (p) { return p.id === id && !p.wasteland; });
          })) bad('unresolved province reference');
        }
        if (row.storyId) {
          var parent = lookup.get(row.storyId);
          if (!parent || parent.fields && parent.fields.indexOf(row.field) < 0) bad('unresolved story field reference');
        }
        return;
      }
      Object.keys(row).forEach(function (key) { if (key !== 'news') walk(row[key]); });
    }
    walk(def);
    if (bm) {
      (Array.isArray(def.regions) ? def.regions : []).forEach(function (region) {
        if (!plain(region)) return;
        var grant = region.grant;
        var titles = grant && { duchy:bm.duchies, kingdom:bm.kingdoms, empire:bm.empires }[grant.titleKind];
        var knownTitle = grant && (grant.titleKind === 'county' ? (bm.provinces || []).some(function (p) {
          return p.id === grant.titleId && !p.wasteland;
        }) : !!FB.titleIds.resolve(grant.titleKind, grant.titleId, titles));
        if (grant && (!(bm.provinces || []).some(function (p) { return p.id === grant.capital && !p.wasteland; }) ||
            !knownTitle)) bad('unresolved regional grant');
        if (region.titleId && !FB.titleIds.resolve('kingdom', region.titleId, bm.kingdoms)) bad('unresolved regional title');
      });
    }
    if (validators[def.type]) {
      try { validators[def.type](def, lookup, bm); } catch (error) { bad(error.message); }
    }
    return errors;
  }
  function validateModule(def, context) {
    if (!def || typeof def.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(def.id))
      throw new Error('A story needs a lowercase slug id.');
    if (context.get(def.id)) throw new Error('Duplicate story ' + def.id + '.');
    if (!own(KINDS, def.kind) || typeof def.init !== 'function')
      throw new Error('Story ' + def.id + ' needs a kind and init hook.');
    HOOKS.forEach(function (hook) {
      if (def[hook] !== undefined && typeof def[hook] !== 'function')
        throw new Error('Story ' + def.id + ' hook ' + hook + ' must be a function.');
    });
    if (def.requires !== undefined && (!Array.isArray(def.requires) ||
        def.requires.some(function (id) { return !context.get(id); })))
      throw new Error('Story ' + def.id + ' requires a story registered before it.');
  }

  /* Factories build detached products. Their context resolves dependencies in
     this candidate, never by temporarily replacing the live registry. */
  function compile(table) {
    if (!plain(table)) throw new Error('Mod data storyInstances must be an object keyed by id.');
    table = JSON.parse(JSON.stringify(table));
    var ordered = [], index = Object.create(null), visiting = Object.create(null);
    var natives = Object.create(null), ids = Object.keys(table);
    if (ids.length > 2048) throw new Error('storyInstances exceeds the 2048 instance limit.');
    var context = {
      get:function (id) { return own(index, id) ? index[id] : null; },
      list:function () { return ordered.slice(); },
      definitionFaults:function (def, bm, attached) { return declarationFaults(def, bm, attached, context); }
    };
    nativeStories.forEach(function (story) { natives[story.id] = story; });
    ids.forEach(function (id) {
      var d = table[id], path = 'storyInstances.' + id;
      if (!plain(d) || d.id !== id || !/^[a-z][a-z0-9_]*$/.test(id) || own(natives, id))
        throw new Error('Invalid or duplicate ' + path + '.');
      if (!own(types, d.type)) throw new Error(path + ': unknown story type.');
      if (d.requires !== undefined && (!Array.isArray(d.requires) || d.requires.length > 32 || d.requires.some(function (ref, i) {
        return typeof ref !== 'string' || ref === id || d.requires.indexOf(ref) !== i || !own(table, ref) && !own(natives, ref);
      }))) throw new Error(path + ': unreachable requires.');
      ['registrationBefore','registrationAfter'].forEach(function (key) {
        if (d[key] !== undefined && (typeof d[key] !== 'string' || d[key] === id || !own(table, d[key]) && !own(natives, d[key])))
          throw new Error(path + '.' + key + ': unknown or cyclic registration anchor.');
      });
      if (d.registrationBefore && d.registrationAfter) throw new Error(path + ': choose one registration anchor.');
      if (d.news !== undefined) {
        if (!plain(d.news)) throw new Error(path + '.news must be an object.');
        Object.keys(d.news).forEach(function (key) {
          var message = d.news[key];
          if (!plain(message) || !/^(?:news|fx|legend|event)\.[a-z0-9_.-]+$/.test(message.key) || typeof message.text !== 'string')
            throw new Error(path + '.news.' + key + ': invalid message.');
        });
      }
    });
    function add(id, native) {
      if (visiting[id]) throw new Error('Cyclic story registration anchor: ' + id + '.');
      visiting[id] = true;
      batch(id, 'registrationBefore', false);
      var d = table[id], story = native;
      if (!native) {
        var faults = declarationFaults(d, null, null, context);
        if (faults.length) throw new Error('storyInstances.' + id + ': ' + faults.join('\n'));
        story = types[d.type](d, context);
        story.declaration = d;
      }
      validateModule(story, context);
      ordered.push(story); index[id] = story;
      batch(id, 'registrationAfter', false);
      delete visiting[id];
    }
    function batch(anchor, placement, final) {
      var pending = ids.filter(function (id) { return !own(index, id) && (final || table[id][placement] === anchor); });
      while (pending.length) {
        var ready = [];
        pending.forEach(function (id) {
          if (own(index, id)) { ready.push(id); return; }
          var d = table[id];
          if (final && [d.registrationBefore,d.registrationAfter].some(function (ref) {
            return ref && !own(index, ref);
          })) return;
          if ((d.requires || []).every(function (ref) { return own(index, ref); })) {
            add(id); ready.push(id);
          }
        });
        if (!ready.length) throw new Error('Unreachable story instance dependencies or anchors: ' + pending.join(', ') + '.');
        pending = pending.filter(function (id) { return ready.indexOf(id) < 0; });
      }
    }
    nativeStories.forEach(function (story) { add(story.id, story); });
    batch(null, null, true);
    return context;
  }

  function publish(candidate) {
    var next = candidate.list(), nextIndex = Object.create(null);
    next.forEach(function (story) { nextIndex[story.id] = story; });
    registry = next; byId = nextIndex;
    next.forEach(function (story) {
      var news = story.declaration && story.declaration.news || {};
      Object.keys(news).forEach(function (key) { FB.registerMessage(news[key].key, { text:news[key].text }); });
    });
  }

  FB.stories = {
    /* Trusted classic scripts register reusable factories before boot seals
       the registry. Definitions contain data, not executable save fields. */
    registerType:function (id, factory, file, validator) {
      if (typesSealed) throw new Error('Story types register at load time only.');
      if (!/^[a-z][a-z0-9_]*$/.test(id) || own(types, id) || typeof factory !== 'function')
        throw new Error('Invalid or duplicate story type ' + id + '.');
      types[id] = factory;
      typeFiles[id] = file;
      validators[id] = validator;
    },
    registerData:function (def) {
      if (sealed) throw new Error('Stories register at load time only.');
      if (!def || !own(types, def.type)) throw new Error('Unknown story type.');
      var table = Object.assign({}, FBDATA.storyInstances || {});
      if (own(table, def.id)) throw new Error('Duplicate story ' + def.id + '.');
      table[def.id] = def;
      var candidate = compile(table);
      FBDATA.storyInstances = table; publish(candidate);
      return byId[def.id];
    },
    /* Native adapters are trusted scripts, never JSON content. */
    register:function (def) {
      if (sealed) throw new Error('Stories register at load time only: ' + String(def && def.id) + '.');
      validateModule(def, FB.stories);
      nativeStories.push(def);
      registry.push(def); byId[def.id] = def;
      return def;
    },
    compile:compile,
    publish:publish,
    load:function () { publish(compile(FBDATA.storyInstances || {})); },
    sealTypes:function () { typesSealed = true; },
    seal:function () { sealed = true; typesSealed = true; },
    typeFiles:function () { return Object.assign({}, typeFiles); },
    definitionFaults:declarationFaults,
    referenceValid:referenceValid,
    resolve:resolve,
    ruler:function (s, rid) {
      rid = FB.startRealmId(s, rid);
      return rid === 'player' ? s.chars[s.player.charId] : FB.realmRulerCharacterSnapshot(s, rid);
    },
    definition:function (s, def) { return FB.startRealmDefinition(s, def); },
    get:function (id) {
      return typeof id === 'string' && own(byId, id) ? byId[id] : null;
    },
    list:function () { return registry.slice(); },
    record:record,
    observe:observe,
    attached:function (s) {
      return attachedList(s).map(function (story) { return story.id; });
    },
    /* Campaign creation. World stories listed by the bookmark attach first in
       registration order, then the scenario's tracks. A story attaches only
       when every required story is attached, appliesTo agrees and init
       returns its record. A campaign with no story gets no state.stories. */
    start:function (s, options) {
      var bookmark = FB.campaignBookmark(s);
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
    /* Called only by the revolt settlement after actual rebel occupation.
       The first attached story accepting this component owns its foundation;
       otherwise the ordinary unnamed independent realm is created. */
    foundRevolt:function (s, group, counties) {
      var list = attachedList(s);
      for (var i = 0; i < list.length; i++) {
        if (!list[i].foundRevolt) continue;
        var realm = list[i].foundRevolt(s, record(s, list[i].id), group, counties);
        if (realm) return realm;
      }
      return null;
    },
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
      var applied = !!(story && rec && story.apply && story.apply(s, rec, choiceId, reviewed));
      if (applied) {
        observe(s, id);
        if (FB.openingGoals) FB.openingGoals.note(s, { storyId:id, choiceId:choiceId });
      }
      return applied;
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
    var returnToCard = function (id) {
      var scroller = document.getElementById('sidebody');
      var scroll = scroller && scroller.scrollTop;
      return { returnFocus:cardNode(id), onDismiss:function () {
        // Deeds can refresh while the sheet is open. Resolve the current card
        // after modal navigation finishes rather than focusing a detached node.
        window.setTimeout(function () {
          var modal = document.getElementById('genmodal');
          var event = document.getElementById('eventmodal');
          var card = cardNode(id);
          if (!card || !modal.classList.contains('hidden') ||
              !event.classList.contains('hidden')) return;
          if (scroller) scroller.scrollTop = scroll;
          card.focus({ preventScroll:true });
        }, 0);
      } };
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
      var people = story.people ? story.people(s, rec) : [];
      people.forEach(function (person) {
        var c = person.characterId && s.chars[person.characterId];
        html += '<button type="button" class="actionbtn" data-story-person="' + esc(person.characterId || '') +
          '" aria-disabled="' + (!c) + '"><b>' + esc(person.label) + (c ? ': ' + esc(FB.fullName(c)) : '') +
          '</b><br><span class="hint">' + esc(person.detail) + ' ' + esc(person.reason) + '</span></button>';
      });
      for (var choice of FB.stories.choices(s, id)) {
        var quote = FB.stories.quote(s, id, choice.id);
        html += '<button type="button" class="actionbtn" data-story-choice="' +
          esc(choice.id) + '" aria-disabled="' + (!quote.allowed) + '">' +
          '<b>' + esc(choice.label) + '</b><br><span class="hint">' +
          esc(choice.detail) + '</span></button>';
      }
      UI.openModal(story.title ? story.title(s, rec) : id, html,
        returnToCard(id));
      document.querySelectorAll('[data-story-choice]').forEach(function (node) {
        node.addEventListener('click', function () {
          reviewChoice(id, node.getAttribute('data-story-choice'));
        });
      });
      document.querySelectorAll('[data-story-person]').forEach(function (node) {
        node.addEventListener('click', function () {
          var cid = node.getAttribute('data-story-person');
          if (cid && FB.state.chars[cid]) UI.showCharModal(cid, { view:'story', storyId:id });
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
        var deeds = document.getElementById('sidebody');
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
          returnToCard(id));
        document.getElementById('gm-story-continue').addEventListener('click',
          UI.closeModal);
      });
    };
  }
})();
