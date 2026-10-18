/* Coalition review uses the existing fact/action cards and modal history. */
(function () {
  'use strict';
  var UI = FB.ui, SH = UI._shared, M = FB.mobile;
  function esc(v) { return FB.esc(String(v)); }
  function kv(k,v) { return SH.kv(k,esc(v)); }
  function reason(id) {
    var messages = {
      inactive:FB.T('This coalition is no longer mobile.'), principal:FB.T('The acting person lacks this member or leadership mandate.'),
      candidate:FB.T('An eligible living member principal and an open leadership review are required.'),
      withheld:FB.T('Members must approve these exact terms before the leader can act.'),
      command:FB.T('A current command mandate and permission for this operation are required.'),
      commitment:FB.T('Finish current service, movement or military commitments first.'),
      following:FB.T('The pledged following cannot supply this many fighters.'),
      technology:FB.T('The chosen unit requires its normal equipment, culture and technology qualifications.'),
      funds:FB.T('The paying treasury lacks the exact cost.'), access:FB.T('Every peaceful route county requires current access.'),
      capacity:FB.T('The site lacks unallocated capacity, or the commitment limit has been reached.'),
      partner:FB.T('The living outside court must accept an unchanged offer.'),
      population:FB.T('The transfer exceeds available people or would deplete the local population floor.'),
      award:FB.T('Settlement requires owned land or an ordinary consented land award.'), food:FB.T('The seller lacks the requested food stock.')
    };
    return messages[id] || FB.T('Review the current terms again.');
  }
  function county(pid) { return FB.world.byId[pid] && FB.world.byId[pid].name || pid; }
  function termsHtml(s,t) {
    var text = '';
    if (t.count !== undefined) text += kv(FB.T('People or food units'),t.count);
    if (t.countyId) text += kv(FB.T('County'),county(t.countyId));
    if (t.countyIds) text += kv(FB.T('Access corridor'),t.countyIds.map(county).join(', '));
    if (t.partnerId) text += kv(FB.T('Outside court'),s.realms[t.partnerId].name);
    if (t.capacity !== undefined) text += kv(FB.T('Seasonal capacity'),t.capacity);
    if (t.duration) text += kv(FB.T('Duration'),FB.T('{days} days',{days:t.duration}));
    if (t.price !== undefined) text += kv(FB.T('Payment on acceptance'),FB.money(t.price,s));
    if (t.final !== undefined) text += kv(FB.T('Settlement'),t.final ? FB.T('Entire following and territorial government') : FB.T('Partial civilian settlement; mobile court continues'));
    if (t.candidateId) text += kv(FB.T('Candidate'),s.chars[t.candidateId].name);
    if (t.allowRecruit !== undefined) text += kv(FB.T('Local voluntary recruitment'),t.allowRecruit ? FB.T('Allowed by this offer') : FB.T('Excluded'));
    if (t.contractId) {
      var contract=FB.political.contract(s,t.contractId);
      if (contract) text += kv(FB.T('Land-grant patron'),s.realms[contract.patronRealmId].name)+
        kv(FB.T('Promised counties'),contract.settlementCountyIds.map(county).join(', '))+
        kv(FB.T('Seasonal service pay'),FB.money(contract.payPerSeason,s))+
        kv(FB.T('Initial service pay'),FB.money(contract.initialPay || 0,s))+
        kv(FB.T('Duration'),FB.T('{days} days',{days:Math.max(0,contract.endTurn-s.turn)}));
    }
    return text;
  }
  UI.showMobileConfederation = function (rid,view) {
    var s = FB.state, r = M.row(s,rid), migration = M.migration(s,rid), profile = M.profile(s,rid);
    if (!r || !migration || !profile) return;
    view = view || {}; var actions = [], actor = {kind:'character',id:s.player.charId}, leader = M.leader(s,rid);
    var host = M.host(s,rid), ownMember = M.members(s,rid).filter(function (m) {return m.principal.id === actor.id;})[0];
    var parts = '', people = '', facts = '';
    if (leader) people += SH.reviewPersonHtml(leader,r.command ? FB.T('Commander') : FB.T('Coalition leader'),'mobile-leader');
    facts += SH.reviewPeopleHtml(people) + kv(FB.T('Court and civilian camp'),county(migration.at)) +
      kv(FB.T('Field host'),host ? FB.T('{men} fighters at {place}',{men:host.men,place:county(host.at)}) : FB.T('No deployed host; the court survives')) +
      kv(FB.T('Civilian following'),r.members.reduce(function (n,m) {return n + m.civilians.reduce(function (v,c) {return v+c.count;},0);},0)) +
      kv(FB.T('Resting fighters'),r.members.reduce(function (n,m) {return n + m.reserve.reduce(function (v,c) {return v+c.count;},0);},0)) +
      kv(FB.T('Food stock'),Math.floor(r.food)) + kv(r.command ? FB.T('Public treasury') : FB.T('Coalition treasury'),FB.money(FB.treasuryAvailable(s,rid),s)) +
      kv(FB.T('Carried host food'),host ? Math.floor(host.mobileFood || 0) : 0) +
      kv(FB.T('Local inhabitants'),s.population.counties[migration.at].count) +
      kv(FB.T('County sovereignty'),s.realms[s.owner[migration.at]].name);
    if (!r.command) facts += kv(FB.T('Leadership and settlement threshold'),FB.T('{percent}% of living member weight',{percent:Math.round(profile.threshold*100)}));
    else {
      var command=M.commandSnapshot(s,rid), superior=command.superior && s.chars[command.superior.characterId];
      facts += kv(FB.T('Command mandate'),command.effective ? FB.T('Active') : FB.T('Suspended')) +
        kv(FB.T('Appointing superior'),superior ? superior.name : FB.T('No current appointing superior')) +
        '<p>'+esc(FB.T('Public command grants no private rank, land or county income. Death, custody, recall or a changed issuer requires a fresh mandate. A retained following has no automatic replacement rule.'))+'</p>';
    }
    function add(label,action,terms,details) {
      var transition=action==='appoint' || action==='recall';
      if (r.command && !transition && command.operations.indexOf(action)<0) return;
      if (r.command && ['offer','war','peace','land','contract','settle','service'].indexOf(action)>=0) {
        label=action==='offer' ? terms.kind==='access' ? FB.T('Offer seasonal access') : terms.kind==='tribute' ? FB.T('Offer tribute') : FB.T('Offer protection service') :
          {war:FB.T('Review campaign'),peace:FB.T('Conclude white peace'),land:FB.T('Request land terms'),
            contract:FB.T('Accept service terms'),settle:FB.T('Review civilian settlement'),service:FB.T('Fulfil protection service')}[action];
        details=FB.T('The commander acts within the declared mandate. Ordinary local rights, outside consent, existing service, conserved people, supplies and public funds are checked again.');
      }
      var request={realmId:rid,commandId:r.command && r.command.id,action:action,actor:actor};
      if (terms && terms.candidateId) request.candidateId=terms.candidateId;
      var review = transition ? M.reviewCommand(s,request) : M.review(s,{realmId:rid,action:action,terms:terms || {},actor:actor}), q = review.review, i = actions.length;
      actions.push({label:label,review:review});
      parts += SH.reviewActionCardHtml({id:'mobile-action-'+i,label:label,disabled:!q.allowed,warn:!q.allowed,
        note:q.allowed ? FB.T('Immediate cost: {money:cost}. Review before committing.',{cost:q.cost || 0}) : reason(q.reason),
        details:'<p>'+esc(details)+'</p>'+termsHtml(s,q.terms),data:{mobileReview:i}});
    }
    function number(id,fallback) { return view[id] !== undefined ? view[id] : fallback; }
    var count = Number(number('mobile-count',50)), destination = number('mobile-county',migration.at);
    var price = Number(number('mobile-price',profile.accessPrice)), days = Number(number('mobile-days',profile.accessDays));
    var options = Object.keys(s.owner).filter(function (pid) {return !!s.owner[pid];}).sort().map(function (pid) {
      return '<option value="'+esc(pid)+'"'+(destination===pid ? ' selected' : '')+'>'+esc(county(pid))+'</option>';
    }).join('');
    var controls = '<label>'+esc(FB.T('County'))+'<select id="mobile-county">'+options+'</select></label>'+
      '<label>'+esc(FB.T('People or food units'))+'<input id="mobile-count" type="number" min="1" max="1000000" step="1" value="'+esc(count)+'"></label>'+
      '<label>'+esc(FB.T('Agreement price'))+'<input id="mobile-price" type="number" min="0" step="1" value="'+esc(price)+'"></label>'+
      '<label>'+esc(FB.T('Agreement duration in days'))+'<input id="mobile-days" type="number" min="1" max="1440" step="1" value="'+esc(days)+'"></label>';
    var membership = r.members.map(function (m) {
      var c = s.chars[m.principal.id];
      var values={weight:m.weight,percent:Math.round(m.pledge*100),status:m.allegiance ? FB.T('Allegiant') : FB.T('Withheld')};
      return kv(c ? c.name : FB.T('Unavailable member'),r.command ? FB.T('Pledge {percent}%; {status}',values) :
        FB.T('Weight {weight}; pledge {percent}%; {status}',values));
    }).join('');
    if (r.command && command.superior) {
      r.members.forEach(function (m) {
        var person=s.chars[m.principal.id];
        add(FB.T('Commission {name}',{name:person.name}),'appoint',{candidateId:person.id},
          FB.T('Only the living appointing superior may commission an eligible member. This costs no money and transfers no people, property or private rank. Existing host orders stop for review.'));
      });
      add(FB.T('Recall commander'),'recall',{},FB.T('Only the living appointing superior may recall this mandate. Existing host orders stop; people, supplies and public money remain with the following.'));
    }
    add(FB.T('Work with the following'),'work',{},FB.T('A local adult can take one paid service per day. The coalition pays from its treasury and consumes one food unit.'));
    add(FB.T('Join with a civilian following'),'join',{countyId:migration.at,count:count},FB.T('People leave the local population through a conserved transfer. The local court must have allowed voluntary recruitment in its access agreement. Joining grants a member voice, not county ownership.'));
    if (ownMember) {
      add(ownMember.allegiance ? FB.T('Withhold allegiance') : FB.T('Renew allegiance'),'pledge',{
        memberId:ownMember.id,allegiance:!ownMember.allegiance,pledge:ownMember.pledge},FB.T('Only this member principal can change its allegiance. Existing deployed fighters and obligations remain recorded.'));
      add(FB.T('Pledge fighters'),'pledge',{memberId:ownMember.id,allegiance:true,pledge:profile.recruitShare},FB.T('Pledges set the maximum share that the leader may recruit. Recruitment still needs living people and training money.'));
      add(FB.T('Leave and settle locally'),'leave',{memberId:ownMember.id,countyId:migration.at},FB.T('The member must recover its deployed fighters and finish outside commitments. Its people and share of camp food enter the local county; its coalition voice ends.'));
    }
    if (r.selection) M.members(s,rid).forEach(function (m) {
      var c = s.chars[m.principal.id];
      add(FB.T('Support {name}',{name:c.name}),'support',{candidateId:c.id},FB.T('The living principal records its own support. Dead, captive, excluded or departed candidates cannot accede.'));
      add(FB.T('Confirm {name} as leader',{name:c.name}),'select',{candidateId:c.id},FB.T('The shared selection review checks the full current constituency and the required weighted majority again.'));
    });
    r.members.filter(function (m) {return s.chars[m.principal.id] && s.chars[m.principal.id].dead;}).forEach(function (m) {
      add(FB.T('Represent an unled following'),'replace_member',{memberId:m.id,candidateId:actor.id},FB.T('A local adult with diplomacy of at least 3 can represent a following whose principal has died. The existing leader must appoint a replacement, or all former principals must be unavailable. Leadership still requires the current members’ separate support.'));
    });
    if (r.decision) {
      membership += SH.reviewFactsCard(FB.T('Pending member decision'),termsHtml(s,r.decision.terms));
      add(FB.T('Assent to the pending terms'),'assent',{assent:true},FB.T('The current terms receive this principal’s assent. A changed proposal needs new assent.'));
      add(FB.T('Withhold assent'),'assent',{assent:false},FB.T('Remove this member’s approval of the pending proposal.'));
    }
    add(FB.T('Recruit fighters'),'recruit',{count:count,unitId:FB.unitRoleClass('levy_infantry')},FB.T('The fighters leave civilian or resting pools. Deployment creates no extra people; ordinary equipment gates and upkeep still apply.'));
    add(FB.T('Return the host to its following'),'demuster',{},FB.T('Reunite the host with its camp before demustering. Surviving fighters become resting fighters. Lost fighters never return.'));
    add(FB.T('Move court and following'),'move',{countyId:destination},FB.T('The ordinary host carries the court. Every peaceful route county needs an access agreement; pasture use grants no land.'));
    add(FB.T('Order the field host'),'march',{countyId:destination},FB.T('The civilian court stays at camp. The host carries its remaining supply and must return to the camp for food.'));
    add(FB.T('Buy food'),'trade',{countyId:migration.at,count:count,direction:'buy'},FB.T('The coalition pays the county treasury and removes real food stock from the local market.'));
    add(FB.T('Sell food'),'trade',{countyId:migration.at,count:count,direction:'sell'},FB.T('The county treasury pays for food delivered from the coalition’s actual stock.'));
    var terms = {kind:'access',partnerId:s.owner[destination],countyIds:[destination],capacity:count,allowRecruit:true,price:price,duration:days};
    add(FB.T('Propose seasonal access to members'),'propose',{operation:'agreement',proposal:terms},FB.T('Members review capacity, payment, recruitment rights and duration. The outside owner must then accept the exact offer.'));
    add(FB.T('Offer approved seasonal access'),'offer',terms,FB.T('This creates a bounded offer. Access starts only after the outside court accepts and the treasury pays.'));
    var tribute={kind:'tribute',partnerId:s.owner[destination],levy:0,price:price,duration:days};
    var protection={kind:'protection',partnerId:s.owner[destination],levy:count,price:price,duration:days};
    add(FB.T('Propose tribute to members'),'propose',{operation:'agreement',proposal:tribute},FB.T('This pays the outside treasury once on acceptance and binds the coalition for the stated duration.'));
    add(FB.T('Offer approved tribute'),'offer',tribute,FB.T('Both living courts must accept the exact bounded commitment.'));
    add(FB.T('Propose protection service'),'propose',{operation:'agreement',proposal:protection},FB.T('The outside treasury pays once for the stated troop commitment. The same fighters cannot be pledged beyond the host’s actual strength.'));
    add(FB.T('Offer approved protection'),'offer',protection,FB.T('Members and the outside court must consent. Ordinary campaigns, actual fighters and finite supplies govern service.'));
    r.agreements.forEach(function (a) {
      membership += SH.reviewFactsCard(FB.T('Outside agreement'),termsHtml(s,a)+kv(FB.T('Status'),a.status==='active' ? FB.T('Active') : a.status==='offered' ? FB.T('Awaiting outside consent') : FB.T('Ended')));
      if (a.status==='offered') add(FB.T('Accept as the outside court'),'accept',{agreementId:a.id},FB.T('Only the actual outside ruler can accept. Current ownership, capacity, rulers and funds are checked again.'));
      if(a.kind==='protection' && a.status==='active') FB.realmWars(s,a.partnerId).forEach(function (war) {
        add(FB.T('Fulfil protection service'),'service',{agreementId:a.id,warId:war.id},FB.T('The existing host joins an ordinary defensive campaign. No troops are created or drawn from the protected county.'));
      });
    });
    var enemy=FB.warTargetDefender(s,rid,destination), warTerms={causes:[{type:'aggression',enemy:enemy,target:destination}]};
    add(FB.T('Propose a campaign to members'),'propose',{operation:'war',proposal:warTerms},FB.T('The ordinary war review checks a live opponent, truce and a connected objective beside the current court.'));
    add(FB.T('Launch the approved campaign'),'war',warTerms,FB.T('The field host fights an ordinary campaign while civilian households remain at camp. Victories do not automatically settle them.'));
    FB.realmWars(s,rid).forEach(function (war) {
      add(FB.T('Propose white peace'),'propose',{operation:'treaty',proposal:{warId:war.id}},FB.T('Members review an end to the campaign without a land award.'));
      add(FB.T('Conclude approved white peace'),'peace',{warId:war.id},FB.T('The ordinary war owner records the outcome; surviving people and finite supplies remain in the coalition.'));
    });
    var land={countyId:destination};
    add(FB.T('Propose a consented land request'),'propose',{operation:'land',proposal:land},FB.T('Members approve asking the current patron for the camp county. This request grants no sovereignty.'));
    add(FB.T('Request approved land terms'),'land',land,FB.T('The ordinary service owner offers land and payment terms. Both courts must consent before settlement.'));
    (s.authority.contracts || []).filter(function (c) {return c.status==='offered' && [c.patronRealmId,c.federateRealmId].indexOf(rid)>=0;}).forEach(function (c) {
      var terms=M.contractTerms(s,c.id);
      add(FB.T('Propose offered land and service terms'),'propose',{operation:'contract',proposal:terms},FB.T('Members review the exact current shared contract. A change to promised land, pay, duration or rulers requires new assent.'));
      add(FB.T('Accept approved land and service terms'),'contract',terms,FB.T('The ordinary contract owner records this court\'s consent and any due payment. Settlement still requires a separate decision about actual people.'));
    });
    var partial = {countyId:destination,count:count,final:false}, final = {countyId:destination,count:M.total(s,rid),final:true};
    add(FB.T('Propose partial settlement'),'propose',{operation:'settle',proposal:partial},FB.T('Members approve the exact civilian transfer. Owned land or an ordinary award is required.'));
    add(FB.T('Settle the approved civilians'),'settle',partial,FB.T('The county gains exactly the people who leave the following. The mobile government and court continue.'));
    add(FB.T('Propose final settlement'),'propose',{operation:'settle',proposal:final},FB.T('All remaining civilians and fighters enter the county. The coalition changes to its declared territorial form after member assent.'));
    add(FB.T('Complete approved settlement'),'settle',final,FB.T('Settlement preserves local inhabitants, food, treasury and the living leader. Current military service must finish first.'));
    function position() {
      var list = SH.$('mobile-list'), body=SH.$('gm-body'), v = {scroll:list ? list.scrollTop : 0,bodyScroll:body.scrollTop,details:[],focus:document.activeElement && document.activeElement.id};
      if (list) list.querySelectorAll('.settcard-info[aria-expanded="true"]').forEach(function (d) {v.details.push(d.getAttribute('aria-controls'));});
      ['mobile-count','mobile-county','mobile-price','mobile-days'].forEach(function (id) {if(SH.$(id)) v[id]=SH.$(id).value;});
      return v;
    }
    UI.openModal(r.command ? FB.T('Mobile command') : FB.T('Mobile coalition'),'<div id="mobile-list" data-modal-scroll>'+
      SH.reviewFactsCard(FB.T('Court, host and population'),facts)+SH.reviewFactsCard(FB.T('Members and commitments'),membership)+
      SH.reviewFactsCard(FB.T('Review inputs'),controls)+SH.reviewActionsHtml(parts)+'</div>',
      {modalClass:'fullsheet-modal',historyView:true,replaceView:!!view.replace});
    var list = SH.$('mobile-list');
    (view.details || []).forEach(function (id) {var node=list.querySelector('[aria-controls="'+id+'"]');if(node) node.click();});
    list.scrollTop = view.scroll || 0; SH.$('gm-body').scrollTop=view.bodyScroll || 0;
    if(view.focus && SH.$(view.focus)) SH.$(view.focus).focus({preventScroll:true});
    ['mobile-count','mobile-county','mobile-price','mobile-days'].forEach(function (id) {
      SH.$(id).onchange=function () {var v=position();v.replace=true;UI.showMobileConfederation(rid,v);};
    });
    if(SH.$('mobile-leader')) SH.$('mobile-leader').onclick=function () {UI.showCharModal(leader.id);};
    list.querySelectorAll('[data-mobile-review]').forEach(function (button) {
      button.onclick=function () {
        var entry=actions[Number(button.getAttribute('data-mobile-review'))], pos=position(), q=entry.review.review;
        function back() {var v=copyView(pos);v.replace=true;UI.showMobileConfederation(rid,v);}
        UI.openModal(entry.label,SH.reviewFactsCard(FB.T('Exact terms'),termsHtml(s,q.terms)+
          kv(FB.T('Immediate cost'),FB.money(q.cost || 0,s)))+SH.reviewActionsHtml(SH.reviewActionCardHtml({
            id:'mobile-confirm',label:FB.T('Confirm decision'),note:FB.T('Current people, principals, position, ownership, stock and funds are checked again.'),
            details:'<p>'+esc(FB.T('A stale review spends nothing and transfers no people.'))+'</p>'})),
          {modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back});
        SH.$('mobile-confirm').onclick=function () {
          var success=s===FB.state && M.commit(s,entry.review);
          UI.openModal(success ? FB.T('Decision recorded') : FB.T('Terms changed'),
            SH.reviewFactsCard('', '<p>'+esc(success ? FB.T('The decision is recorded.') : FB.T('Review the current terms again.'))+'</p>')+
            '<button type="button" class="actionbtn" id="mobile-continue">'+esc(FB.T('Continue'))+'</button>',{replaceView:true});
          SH.$('mobile-continue').onclick=function () {SH.modalHistoryBack(back);};
          if(SH.markActionsDirty) SH.markActionsDirty();
        };
      };
    });
  };
  function copyView(v) {return JSON.parse(JSON.stringify(v));}
})();
