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
      column_operation:FB.T('This action is unavailable for a following with separate columns.'),
      commitment:FB.T('Finish current service, movement or military commitments first.'),
      following:FB.T('The pledged following cannot supply this many fighters.'),
      technology:FB.T('The chosen unit requires its normal equipment, culture and technology qualifications.'),
      funds:FB.T('The paying treasury lacks the exact cost.'), access:FB.T('Every peaceful route county requires current access.'),
      provisioning:FB.T('The current ration target, cash reserve, stock or eligible fighters leave no affordable replenishment.'),
      capacity:FB.T('The site lacks unallocated capacity, or the commitment limit has been reached.'),
      partner:FB.T('The living outside court must accept an unchanged offer.'),
      population:FB.T('The transfer exceeds available people or would deplete the local population floor.'),
      award:FB.T('Settlement requires owned land or an ordinary consented land award.'), food:FB.T('The seller lacks the requested food stock.'),
      funding:FB.T('Funding requires consent, a permitted source, distinct available accounts and an active command.'),
      guard:FB.T('Release requires the original available hosting ruler, unchanged lawful local authority and presence with the original party.')
    };
    return messages[id] || FB.T('Review the current terms again.');
  }
  function county(pid) { return FB.world.byId[pid] && FB.world.byId[pid].name || pid; }
  function termsHtml(s,t,rid) {
    var text = '';
    var row=rid && M.row(s,rid),entries=row && row.columns && row.columns.entries;
    function columnName(id) {var i=entries ? entries.map(function (c) {return c.id;}).indexOf(id) : -1;return FB.T('Column {number}',{number:i+1});}
    if (t.columnId) text+=kv(FB.T('Field command'),columnName(t.columnId));
    if (t.otherColumnId) text+=kv(FB.T('Other column'),columnName(t.otherColumnId));
    if (t.unitId && FBDATA.unitClasses[t.unitId]) text+=kv(FB.T('Unit class'),FB.dataText(s,null,'unitClass',t.unitId,FBDATA.unitClasses[t.unitId],'name',{}));
    if (t.causes) text+=kv(FB.T('Campaign objective'),t.causes.map(function (c) {return county(c.target);}).join(', '));
    if (t.fundingKind) text += kv(FB.T('Paying account'),t.fundingKind === 'private' ? FB.T('Your private purse') :
      FB.T('Public treasury of {realm}',{realm:s.realms[t.payerRealmId].name})) +
      kv(FB.T('Recipient'),s.realms[t.recipientRealmId].name) + kv(FB.T('Contribution'),FB.money(t.amount,s));
    if (t.count !== undefined) text += kv(FB.T('People or food units'),t.count);
    if (t.countyId) text += kv(FB.T('County'),county(t.countyId));
    if (t.countyIds) text += kv(FB.T('Access corridor'),t.countyIds.map(county).join(', '));
    if (t.partnerId) text += kv(FB.T('Outside court'),s.realms[t.partnerId].name);
    if (t.capacity !== undefined) text += kv(FB.T('Seasonal capacity'),t.capacity);
    if (t.duration) text += kv(FB.T('Duration'),FB.T('{days} days',{days:t.duration}));
    if (t.price !== undefined) text += kv(FB.T('Payment on acceptance'),FB.money(t.price,s));
    if (t.final !== undefined) text += kv(FB.T('Settlement'),t.final ? FB.T('Entire following and territorial government') : FB.T('Partial civilian settlement; mobile court continues'));
    if (t.candidateId) text += kv(FB.T('Candidate'),s.chars[t.candidateId].name);
    if (t.partyIds) text += kv(FB.T('Original personal party'),t.partyIds.map(function (id) {return s.chars[id].name;}).join(', ')) +
      '<p>'+esc(FB.T('Release costs nothing and ends only this protective restriction. Nobody moves. Command still requires actual presence at the civilian camp; ordinary custody, travel costs and access remain binding.'))+'</p>';
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
  function routeHtml(s,q) {
    return q.path && q.stop!==undefined ? kv(FB.T('Reviewed route'),q.path.length ? q.path.map(county).join(', ') : FB.T('Remain at the current location'))+
      kv(FB.T('Route ends at'),county(q.stop))+kv(FB.T('Travel time'),FB.T('{days} days',{days:q.days})) : '';
  }
  UI.showMobileConfederation = function (rid,view) {
    var s = FB.state, r = M.row(s,rid), migration = M.migration(s,rid), profile = M.profile(s,rid);
    if (!r || !migration || !profile) return;
    view = view || {}; var actions = [], actor = {kind:'character',id:s.player.charId}, leader = M.leader(s,rid);
    var host = M.host(s,rid), columns=M.columnSnapshot && M.columnSnapshot(s,rid);
    var ownMember = M.members(s,rid).filter(function (m) {return m.principal.id === actor.id;})[0];
    var parts = '', people = '', facts = '';
    if (leader) people += SH.reviewPersonHtml(leader,r.command ? FB.T('Commander') : FB.T('Coalition leader'),'mobile-leader');
    facts += SH.reviewPeopleHtml(people) + kv(FB.T('Court and civilian camp'),county(migration.at)) +
      (columns ? '' : kv(FB.T('Field host'),host ? FB.T('{men} fighters at {place}',{men:host.men,place:county(host.at)}) : FB.T('No deployed host; the court survives'))) +
      kv(FB.T('Civilian following'),r.members.reduce(function (n,m) {return n + m.civilians.reduce(function (v,c) {return v+c.count;},0);},0)) +
      kv(FB.T('Resting fighters'),r.members.reduce(function (n,m) {return n + m.reserve.reduce(function (v,c) {return v+c.count;},0);},0)) +
      kv(columns ? FB.T('Camp food stock') : FB.T('Food stock'),Math.floor(r.food)) + kv(r.command ? FB.T('Public treasury') : FB.T('Coalition treasury'),FB.money(FB.treasuryAvailable(s,rid),s)) +
      (columns ? '' : kv(FB.T('Carried host food'),host ? Math.floor(host.mobileFood || 0) : 0)) +
      kv(FB.T('Local inhabitants'),s.population.counties[migration.at].count) +
      kv(FB.T('County sovereignty'),s.realms[s.owner[migration.at]].name);
    if (columns) columns.entries.forEach(function (c,index) {
      var commander=s.chars[c.commanderId];
      facts+=kv(FB.T('Column {number}',{number:index+1}),c.host ?
        FB.T('{men} fighters at {place}; commander {name}; carried food {food}; {status}',
          {men:c.host.men,place:county(c.host.at),name:commander ? commander.name : FB.T('Unavailable member'),
            food:Math.floor(c.host.mobileFood),status:c.effective ? FB.T('Active') : FB.T('Suspended')}) : FB.T('Retired'));
    });
    if (!r.command) facts += kv(FB.T('Leadership and settlement threshold'),FB.T('{percent}% of living member weight',{percent:Math.round(profile.threshold*100)}));
    else {
      var command=M.commandSnapshot(s,rid), superior=command.superior && s.chars[command.superior.characterId];
      var external=command.authority && command.authority.kind==='external_authority';
      if (command.landed) {
        var homeId=FB.startRealmId(s,command.landed.link.homeRealmId);
        facts+=kv(FB.T('Home office'),s.realms[homeId].name)+
          kv(FB.T('Personal command term'),FB.T('{days} days remaining',{days:Math.max(0,command.landed.endTurn-s.turn)}))+
          '<p>'+esc(FB.T('This command belongs to the original home officeholder. It cannot pass to an heir or another member. Home decisions require local presence or an existing deputy with the exact civil power.'))+'</p>';
      }
      facts += kv(FB.T('Command mandate'),command.effective ? FB.T('Active') : FB.T('Suspended')) +
        kv(FB.T('Appointing superior'),external ? command.authority.name : superior ? superior.name : FB.T('No current appointing superior')) +
        '<p>'+esc(FB.T('Public command grants no private rank, land or county income. Death, custody, recall or a changed issuer requires a fresh mandate. A retained following has no automatic replacement rule.'))+'</p>';
      if (external) facts += kv(FB.T('External commission'),command.superior ?
        FB.T('{days} days remaining',{days:Math.max(0,command.authority.endTurn-s.turn)}) : FB.T('Expired')) +
        '<p>'+esc(FB.T('This outside authority has no local person or treasury. Local actors cannot appoint a successor or renew its commission.'))+'</p>';
    }
    if (migration.sponsorship) facts += kv(FB.T('Expedition sponsor'),FB.T('Independent')) +
      '<p>'+esc(FB.T('The origin is a place, not a sponsor. Local access, paid service and land require their own lawful agreements.'))+'</p>';
    var supply=M.supplySnapshot(s,rid);
    if (supply) facts += kv(FB.T('Ration target'),FB.T('{days} days',{days:supply.targetDays})) +
      kv(FB.T('Camp food target'),Math.ceil(supply.campTarget)) +
      kv(FB.T('Host carrying limit'),FB.T('{days} days',{days:supply.carryDays})) +
      kv(FB.T('Public cash reserve'),FB.money(supply.cashReserve,s));
    if (supply && supply.entries) supply.entries.forEach(function (entry,index) {
      facts+=kv(FB.T('Column {number} food target',{number:index+1}),Math.ceil(entry.target))+
        kv(FB.T('Column {number} daily rations',{number:index+1}),entry.daily.toFixed(2));
    });
    function add(label,action,terms,details,columnReview) {
      var transition=action==='appoint' || action==='recall';
      var permission=action==='load' || action==='unload' ? 'trade' : action;
      if (r.command && !transition && command.operations.indexOf(permission)<0) return;
      if (r.command && ['offer','war','peace','land','contract','settle','service'].indexOf(action)>=0) {
        label=action==='offer' ? terms.kind==='access' ? FB.T('Offer seasonal access') : terms.kind==='tribute' ? FB.T('Offer tribute') : FB.T('Offer protection service') :
          {war:FB.T('Review campaign'),peace:FB.T('Conclude white peace'),land:FB.T('Request land terms'),
            contract:FB.T('Accept service terms'),settle:FB.T('Review civilian settlement'),service:FB.T('Fulfil protection service')}[action];
        details=FB.T('The commander acts within the declared mandate. Ordinary local rights, outside consent, existing service, conserved people, supplies and public funds are checked again.');
      }
      var request={realmId:rid,commandId:r.command && r.command.id,action:action,actor:actor};
      if (terms && terms.candidateId) request.candidateId=terms.candidateId;
      var review = transition ? M.reviewCommand(s,request) : (columnReview ? M.reviewColumns : M.review)(s,{realmId:rid,action:action,terms:terms || {},actor:actor}), q = review.review, i = actions.length;
      actions.push({label:label,review:review});
      parts += SH.reviewActionCardHtml({id:'mobile-action-'+i,label:label,disabled:!q.allowed,warn:!q.allowed,
        note:q.allowed ? FB.T('Immediate cost: {money:cost}. Review before committing.',{cost:q.cost || 0}) : reason(q.reason),
        details:'<p>'+esc(details)+'</p>'+termsHtml(s,q.terms,rid)+routeHtml(s,q),data:{mobileReview:i}});
    }
    var guard=M.guardSnapshot && M.guardSnapshot(s,rid);
    if (guard) {
      var guardLabels={guarded:FB.T('Under protective guard'),expired:FB.T('Term expired; release unresolved'),
        interrupted:FB.T('Authority interrupted; release unresolved'),released:FB.T('Released')};
      facts+=kv(FB.T('Original personal party'),guard.characterIds.map(function (id) {return s.chars[id].name;}).join(', '))+
        kv(FB.T('Actual party positions'),guard.characterIds.map(function (id) {
          return FB.T('{name} at {place}',{name:s.chars[id].name,place:county(FB.characterLocation(s,s.chars[id]))});
        }).join('; '))+
        kv(FB.T('Guard locality'),county(guard.location.countyId))+
        kv(FB.T('Hosting ruler'),s.chars[guard.authority.characterId].name)+
        kv(FB.T('Protective guard'),guardLabels[guard.status])+
        kv(FB.T('Guard term'),FB.T('{days} days remaining',{days:Math.max(0,guard.endTurn-s.turn)}));
      var guardReview=M.reviewGuard(s,{realmId:rid,action:'release',actor:actor}), guardIndex=actions.length;
      actions.push({label:FB.T('Review protective release'),review:guardReview});
      parts+=SH.reviewActionCardHtml({id:'mobile-action-'+guardIndex,label:FB.T('Review protective release'),
        disabled:!guardReview.review.allowed,warn:!guardReview.review.allowed,
        note:guardReview.review.allowed ? FB.T('Immediate cost: {money:cost}. Review before committing.',{cost:0}) : reason('guard'),
        details:termsHtml(s,guardReview.review.terms,rid),data:{mobileReview:guardIndex}});
    }
    function number(id,fallback) { return view[id] !== undefined ? view[id] : fallback; }
    if (s.greatHolyWar && r.command && FB.mobileGreatHolyWarReview) {
      var holyTarget=FBDATA.kingdoms[s.greatHolyWar.targetKingdom];
      facts+=kv(FB.T('Religious campaign'),FB.holyWarName(s,s.greatHolyWar.callingReligion))+
        kv(FB.T('Target'),holyTarget ? holyTarget.name : s.greatHolyWar.targetKingdom);
      var holyJoin = FB.mobileGreatHolyWarReview(s,rid,actor.id,'join');
      var holyLeave = FB.mobileGreatHolyWarReview(s,rid,actor.id,'withdraw');
      [holyJoin,holyLeave].forEach(function (q) {
        var label = q.action === 'join' ? FB.T('Pledge the existing host') : FB.T('Withdraw the host from the holy war');
        var detail = FB.T('The vow requests honor for four seasons of service. Only the existing field host serves; the civilian camp stays in place. No fighters, food, land or personal vow are granted. Withdrawal retains losses and recorded service; an unfinished vow is broken.');
        var i=actions.length;
        actions.push({label:label,holy:true,review:{review:q}});
        parts+=SH.reviewActionCardHtml({id:'mobile-action-'+i,label:label,disabled:!q.allowed,warn:!q.allowed,
          note:q.allowed ? FB.T('No immediate payment. Review before committing.') :
            FB.T('A current war mandate, compatible faith and available host are required. Existing vows cannot be enrolled again.'),
          details:'<p>'+esc(detail)+'</p>',data:{mobileReview:i}});
      });
    }
    var count = Number(number('mobile-count',50)), destination = number('mobile-county',migration.at);
    var price = Number(number('mobile-price',profile.accessPrice)), days = Number(number('mobile-days',profile.accessDays));
    var options = Object.keys(s.owner).filter(function (pid) {return !!s.owner[pid];}).sort().map(function (pid) {
      return '<option value="'+esc(pid)+'"'+(destination===pid ? ' selected' : '')+'>'+esc(county(pid))+'</option>';
    }).join('');
    var controls = '<label>'+esc(FB.T('County'))+'<select id="mobile-county">'+options+'</select></label>'+
      '<label>'+esc(FB.T('People or food units'))+'<input id="mobile-count" type="number" min="1" max="1000000" step="1" value="'+esc(count)+'"></label>'+
      '<label>'+esc(FB.T('Agreement price'))+'<input id="mobile-price" type="number" min="0" step="1" value="'+esc(price)+'"></label>'+
      '<label>'+esc(FB.T('Agreement duration in days'))+'<input id="mobile-days" type="number" min="1" max="1440" step="1" value="'+esc(days)+'"></label>';
    if (columns) {
      var chosen=number('mobile-column',columns.entries[0].id),other=number('mobile-other-column',columns.entries[1].id);
      var unit=number('mobile-unit',FB.unitRoleClass('levy_infantry')),candidate=number('mobile-commander',r.leaderId);
      function columnOptions(selected) {return columns.entries.map(function (c,i) {return '<option value="'+esc(c.id)+'"'+
        (c.id===selected ? ' selected' : '')+'>'+esc(FB.T('Column {number}',{number:i+1}))+'</option>';}).join('');}
      controls+='<label>'+esc(FB.T('Field command'))+'<select id="mobile-column">'+columnOptions(chosen)+'</select></label>'+
        '<label>'+esc(FB.T('Other column'))+'<select id="mobile-other-column">'+columnOptions(other)+'</select></label>'+
        '<label>'+esc(FB.T('Unit class'))+'<select id="mobile-unit">'+Object.keys(FBDATA.unitClasses).filter(function (id) {
          return !FBDATA.unitClasses[id].hired;
        }).map(function (id) {return '<option value="'+esc(id)+'"'+(id===unit ? ' selected' : '')+'>'+esc(FB.dataText(s,null,'unitClass',id,FBDATA.unitClasses[id],'name',{}))+'</option>';}).join('')+'</select></label>'+
        '<label>'+esc(FB.T('Member commander'))+'<select id="mobile-commander">'+r.openingBindings.map(function (b) {
          var person=s.chars[b.characterId];return '<option value="'+esc(person.id)+'"'+(person.id===candidate ? ' selected' : '')+'>'+esc(person.name)+'</option>';
        }).join('')+'</select></label>';
      add(FB.T('Order selected column'),'march',{columnId:chosen,countyId:destination},FB.T('Only this field host follows the ordinary route. Other columns and the civilian camp keep their actual positions.'),true);
      add(FB.T('Move camp with selected column'),'move',{columnId:chosen,countyId:destination},FB.T('The overall commander selects one escort already at camp. The camp follows actual arrivals; every peaceful route county needs access.'),true);
      add(FB.T('Halt selected column'),'stop',{columnId:chosen},FB.T('Halt this host and leave the camp at its last committed location.'),true);
      add(FB.T('Assign selected commander'),'assign',{columnId:chosen,candidateId:candidate},FB.T('The overall commander assigns an existing eligible member to this column. Its current order stops. This grants no authority over other columns.'),true);
      add(FB.T('Divide into retired column'),'split',{columnId:chosen,otherColumnId:other,unitId:unit,count:count},FB.T('Move this many existing fighters of the selected class, their demographic roster and proportional carried food into the other retired slot. Both hosts must retain the normal minimum.'),true);
      add(FB.T('Reunite into selected column'),'merge',{columnId:chosen,otherColumnId:other},FB.T('Both hosts must be halted at the same place with the same war commitment. Their exact units, people and food join the selected column; the other slot retires.'),true);
      add(FB.T('Demuster selected column'),'demuster',{columnId:chosen},FB.T('After actual camp reunion and completion of military service, surviving fighters enter their member resting pools and carried food returns to camp.'),true);
      add(FB.T('Recruit for selected column'),'recruit',{columnId:chosen,unitId:unit,count:count},FB.T('Train the selected class from currently pledged people at camp, paying the public treasury cost. Normal equipment and technology gates apply. A remote host cannot receive replacements.'),true);
      if (supply) {
        ['trade','load','unload'].forEach(function (action) {
          var review=M.columnSupplyReview(s,rid,chosen,action,actor);
          var labels={trade:FB.T('Buy selected column supplies'),load:FB.T('Load selected column from camp'),unload:FB.T('Return selected column food to camp')};
          add(labels[action],action,review.request.terms,
            FB.T('A halted column buys only at its actual local market within its carrying target and the public cash reserve. Camp transfers require actual reunion and preserve one day of camp rations when loading.'),true);
        });
      }
      var objective={type:'aggression',enemy:FB.warTargetDefender(s,rid,destination),target:destination};
      add(FB.T('Review selected column campaign'),'war',{columnId:chosen,causes:[objective]},FB.T('The overall commander reviews an ordinary connected war objective from this host. Other hosts keep their existing campaigns. A separate field order is required to march.'),true);
    }
    var fundingPolicy = FB.homeAuthority.fundingPolicy(s,rid);
    if (fundingPolicy) {
      var amount = Number(number('mobile-funding',10)), payer = number('mobile-public-source','player');
      var sources = Object.keys(s.realms).filter(function (source) {
        return source !== rid && FB.homeAuthority.fundingQuote(s,{source:{kind:'public',realmId:source},
          recipientRealmId:rid,amount:1,characterId:s.player.charId}).allowed;
      }).sort().map(function (source) {
        return '<option value="'+esc(source)+'"'+(source === payer ? ' selected' : '')+'>'+esc(s.realms[source].name)+'</option>';
      }).join('');
      controls += '<label>'+esc(FB.T('Contribution amount'))+'<input id="mobile-funding" type="number" min="1" max="'+esc(fundingPolicy.maximum)+'" step="1" value="'+esc(amount)+'"></label>'+
        '<label>'+esc(FB.T('Public paying account'))+'<select id="mobile-public-source"><option value="">'+esc(FB.T('Choose a public account'))+'</option>'+sources+'</select></label>';
      function funding(label,source) {
        var q = FB.homeAuthority.fundingQuote(s,{source:source,recipientRealmId:rid,amount:amount,characterId:s.player.charId}), i = actions.length;
        actions.push({label:label,review:{review:q},funding:true});
        parts += SH.reviewActionCardHtml({id:'mobile-action-'+i,label:label,disabled:!q.allowed,warn:!q.allowed,
          note:q.allowed ? FB.T('Contribution: {money:cost}. Review the paying account before confirming.',{cost:q.cost}) : reason(q.reason),
          details:'<p>'+esc(FB.T('The selected account pays once into this command’s separate public treasury. No private rank, rights, credit or supplies are created.'))+'</p>'+termsHtml(s,q.terms),data:{mobileReview:i}});
      }
      if (fundingPolicy.privateContributions) funding(FB.T('Contribute private funds'),{kind:'private',characterId:s.player.charId});
      if (fundingPolicy.publicGrants) funding(FB.T('Grant public funds'),{kind:'public',realmId:payer});
    }
    var membership = r.members.map(function (m) {
      var c = s.chars[m.principal.id];
      var values={weight:m.weight,percent:Math.round(m.pledge*100),status:m.allegiance ? FB.T('Allegiant') : FB.T('Withheld')};
      return kv(c ? c.name : FB.T('Unavailable member'),r.command ? FB.T('Pledge {percent}%; {status}',values) :
        FB.T('Weight {weight}; pledge {percent}%; {status}',values));
    }).join('');
    if (r.command && command.superior && !external) {
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
    if (supply) {
      add(FB.T('Replenish supplies'),'trade',supply.purchase,
        FB.T('Buy only the current ration shortfall available locally and affordable above the public cash reserve. A remote host keeps its own food.'));
      if (profile.supplyPolicy.replacement) add(FB.T('Replace pledged fighters'),'recruit',supply.replacement ||
        (columns ? {columnId:columns.entries[0].id,count:0,provisioning:true} : {provisioning:true}),
        FB.T('Replace the configured shortfall from eligible pledged people, within the training budget and public cash reserve. Current rations, ordinary unit qualifications and actual camp presence remain required.'),!!columns);
    }
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
      ['mobile-count','mobile-county','mobile-price','mobile-days','mobile-column','mobile-other-column','mobile-unit','mobile-commander','mobile-funding','mobile-public-source'].forEach(function (id) {if(SH.$(id)) v[id]=SH.$(id).value;});
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
    ['mobile-count','mobile-county','mobile-price','mobile-days','mobile-column','mobile-other-column','mobile-unit','mobile-commander','mobile-funding','mobile-public-source'].forEach(function (id) {
      if (SH.$(id)) SH.$(id).onchange=function () {var v=position();v.replace=true;UI.showMobileConfederation(rid,v);};
    });
    if(SH.$('mobile-leader')) SH.$('mobile-leader').onclick=function () {UI.showCharModal(leader.id);};
    list.querySelectorAll('[data-mobile-review]').forEach(function (button) {
      button.onclick=function () {
        var entry=actions[Number(button.getAttribute('data-mobile-review'))], pos=position(), q=entry.review.review;
        function back() {var v=copyView(pos);v.replace=true;UI.showMobileConfederation(rid,v);}
        UI.openModal(entry.label,SH.reviewFactsCard(FB.T('Exact terms'),(entry.holy ?
          '<p>'+esc(FB.T('This binds the current commander and existing field host to the current religious campaign, requesting honor for four seasons of service. The civilian camp remains separate. No troops, supplies, land or personal vow are created. Withdrawal preserves casualties and earlier service.'))+'</p>' :
          termsHtml(s,q.terms,rid)+routeHtml(s,q))+
          kv(FB.T('Immediate cost'),FB.money(q.cost || 0,s)))+SH.reviewActionsHtml(SH.reviewActionCardHtml({
            id:'mobile-confirm',label:FB.T('Confirm decision'),note:FB.T('Current people, principals, position, ownership, stock and funds are checked again.'),
            details:'<p>'+esc(FB.T('A stale review spends nothing and transfers no people.'))+'</p>'})),
          {modalClass:'fullsheet-modal',historyView:true,historyBack:true,historyBackRender:back});
        SH.$('mobile-confirm').onclick=function () {
          var success=s===FB.state && (entry.holy ? FB.commitMobileGreatHolyWar(s,q) :
            entry.funding ? FB.homeAuthority.fund(s,q) : M.commit(s,entry.review));
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
