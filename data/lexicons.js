/* =========================================================================
   Fallowborn: LEXICONS
   =========================================================================
   One place for the words that name political concepts, so the same county
   can read as a fief or a province and a new period changes words through
   data. js/lexicon.js resolves every lookup.

   Layers, from least to most specific:
     base         today's shared vocabulary; every term must exist here
     eras         FBDATA.eras id (the campaign's stamped era)
     governments  FBDATA.governmentForms id (the viewer's own realm or immediate liege)
     faiths       FBDATA.religions id; a faith inherits its ancestors'
                  entries (nicene reads christian), nearest first
     cultures     FBDATA.cultures id
   A more specific layer overrides a less specific one: culture, then faith,
   then government, then era, then base.

   Each entry may hold:
     terms: termId -> { one, other, title? } noun forms. one is the singular,
       other the plural, title the capitalized standalone label (defaults to
       one with its first letter capitalized). An optional f object holds the
       same forms for a female viewer when the word changes with sex.
       Running text reaches a term with {term:id}, {term:id.other} or
       {term:id.title}; {Term:...} capitalizes the first letter.
     rank: { m:[8], f:[8] } the station ladder labels, tiers 0 to 7.
     labels: kind -> id -> field path -> English. Display relabels for
       structured data text (FB.dataText). The unitRole kind names a unit
       role (FB.unitClassRole) and relabels that role's default class.

   Only display text lives here. Ids, mechanics and saved records never
   change with the lexicon.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.lexicons = {
  base:{
    terms:{
      vassal:{ one:'vassal', other:'vassals' },
      liege:{ one:'liege', other:'lieges' },
      fief:{ one:'fief', other:'fiefs' },
      holding:{ one:'holding', other:'holdings' },
      levy:{ one:'levy', other:'levies' },
      crown_authority:{ one:'crown authority', other:'crown authority',
        title:'Crown Authority' },
      council:{ one:'council', other:'councils' },
      estates:{ one:'estates', other:'estates', title:'Estates' },
      manor:{ one:'manor', other:'manors' },
      serf:{ one:'serf', other:'serfs' },
      knight:{ one:'knight', other:'knights' },
      baron:{ one:'baron', other:'barons' },
      county:{ one:'county', other:'counties' },
      duchy:{ one:'duchy', other:'duchies' },
      kingdom:{ one:'kingdom', other:'kingdoms' },
      empire:{ one:'empire', other:'empires' },
      duke:{ one:'duke', other:'dukes' },
      duchess:{ one:'duchess', other:'duchesses' },
      king:{ one:'king', other:'kings' },
      queen:{ one:'queen', other:'queens' },
      emperor:{ one:'emperor', other:'emperors' },
      empress:{ one:'empress', other:'empresses' }
    },
    rank:{
      m:['Serf','Freeholder','Gentry','Baron','Count','Duke','King','Emperor'],
      f:['Serf','Freeholder','Gentlewoman','Baroness','Countess','Duchess','Queen','Empress']
    }
  },

  eras:{
    late_antique:{
      terms:{
        duchy:{ one:'district', other:'districts' },
        kingdom:{ one:'realm', other:'realms' },
        duke:{ one:'dux', other:'duces' },
        duchess:{ one:'ducissa', other:'ducissae' },
        king:{ one:'rex', other:'reges' },
        queen:{ one:'regina', other:'reginae' },
        emperor:{ one:'augustus', other:'augusti' },
        empress:{ one:'augusta', other:'augustae' }
      },
      rank:{
        m:['Dependent','Free Citizen','Curialis','Decurion','Comes','Dux','Rex','Augustus'],
        f:['Dependent','Free Citizen','Curialis','Decurion','Comitissa','Ducissa','Regina','Augusta']
      },
      labels:{
        career:{
          soldier:{
            name:'Federate service',
            'ranks.apprentice':'New recruit',
            'ranks.journeyman':'Federate soldier',
            'ranks.master':'Veteran of the host',
            desc:'Drill, guard duty, and paid service in a federate host.'
          }
        },
        unitRole:{
          levy_infantry:{ name:'Local militia' },
          missile:{ name:'Bowmen' },
          cavalry:{ name:'Mounted retainers' },
          household:{ name:'Household soldiers' },
          mercenary:{ name:'Contracted bands' },
          polearm:{ name:'Spearmen' }
        },
        holding:{
          common_rights:{ name:'Communal grazing rights' },
          hearth_garden:{ name:'Household plot' },
          house_shrine:{ name:'Household oratory' },
          letters:{ name:'Household letters' },
          press:{ name:'Oil press' },
          good_mail:{ name:'Mail shirt' },
          warhorse:{ name:'Riding horse' }
        }
      }
    }
  },

  governments:{
    roman_civic:{ rank:{
      m:['Dependent','Free Citizen','Curialis','Decurion','Comes','Magister militum','Patrician','Augustus'],
      f:['Dependent','Free Citizen','Curialis','Decurion','Comitissa','Magistra militum','Patrician','Augusta']
    }, terms:{
      duchy:{ one:'province', other:'provinces' },
      kingdom:{ one:'diocese', other:'dioceses' },
      empire:{ one:'prefecture', other:'prefectures' }
    } },
    federate_polity:{ rank:{
      m:['Dependent','Free Citizen','Host Notable','Veteran','Comes','Dux','Rex','Augustus'],
      f:['Dependent','Free Citizen','Host Notable','Veteran','Comitissa','Ducissa','Regina','Augusta']
    } },
    regnum:{ terms:{ kingdom:{ one:'kingdom', other:'kingdoms' } } }
  },

  faiths:{
    /* germanic_pagan descends from pagan, so it repeats the late antique
       ladder to keep it ahead of the pagan entry. */
    germanic_pagan:{
      rank:{
        m:['Dependent','Free Citizen','Curialis','Decurion','Comes','Dux','Rex','Augustus'],
        f:['Dependent','Free Citizen','Curialis','Decurion','Comitissa','Ducissa','Regina','Augusta']
      }
    },
    muslim:{
      rank:{
        m:['Fellah','Freeman','Sayyid','Sheikh','Emir','Grand Emir','Sultan','Great Sultan'],
        f:['Fellaha','Freewoman','Sayyida','Sheikha','Emira','Grand Emira','Sultana','Great Sultana']
      }
    },
    pagan:{
      rank:{
        m:['Thrall','Karl','Huscarl','Hersir','Jarl','High Chief','King','High King'],
        f:['Thrall','Karl','Shieldmaiden','Lady','Jarl','High Chief','Queen','High Queen']
      }
    },
    zoroastrian:{
      rank:{
        m:['Bondman','Freeman','Dehqan','Azat','Marzban','Satrap','Shah','Shahanshah'],
        f:['Bondwoman','Freewoman','Dehqan','Azat','Marzban','Satrap','Banbishn','Banbishnan Banbishn']
      }
    },
    jewish:{
      rank:{
        m:['Serf','Freeholder','Gentry','Elder','Bek','Great Bek','Khagan','Khagan'],
        f:['Serf','Freeholder','Gentlewoman','Elder','Begum','Great Begum','Khatun','Khatun']
      }
    }
  },

  cultures:{}
};
