/* Spring 568 identity declarations, published by the complete 568 composer.
   Keep these tables inert until that bookmark is registered: faith availability
   accepts only known bookmark ids, and cultures have no dated-availability gate.
   No existing catalogue, opening, saved identity or doctrine is changed here.
   See docs/research/568-bookmark.md for evidence and publication boundaries. */
FBDATA.bookmarkCultures568 = {
  /* A standalone early Langobard presentation. Shared Germanic-style names,
     portrait probabilities and affinity are simulation choices, not ancestry,
     attested sixth-century name frequencies or the later Romance Lombard culture.
     The ordinary defaults supply mechanics; there is no ethnic combat bonus. */
  langobard_568: {
    name:'Langobard', tradition:'west_european', dyn:'of_place',
    appearance:{ tone:0.6, fair:0.42, red:0.07 },
    male:['Wulfhard','Adalmar','Raginwald','Bernward'],
    female:['Adalhild','Bertruna','Wulfrun'],
    nameEras:{ late_antique:{
      male:['Wulfhard','Adalmar','Raginwald','Bernward'],
      female:['Adalhild','Bertruna','Wulfrun']
    } }
  },
  /* A bounded Avar court presentation, without an asserted cultural parent.
     These reconstructed campaign names reuse the generic steppe naming pool;
     that borrowing establishes no language, ancestry, faith or legal equivalence.
     Neutral affinity avoids importing another people's mechanical traditions. */
  avar_568: {
    name:'Avar court communities', tradition:'other', dyn:'of_place',
    appearance:{ tone:1.5, fair:0.05, red:0.02 },
    male:['Aruk','Saran','Tulan','Bora'],
    female:['Aruna','Sula','Alana'],
    nameEras:{ late_antique:{
      male:['Aruk','Saran','Tulan','Bora'],
      female:['Aruna','Sula','Alana']
    } }
  }
};

/* Additive bookmark selectors, using the existing faith availability schema.
   The composer unions these ids into each existing availability.bookmarkIds;
   it preserves every other selector and the entire definition. These are not
   replacement faiths or permission to remove a year/era/consumer restriction. */
FBDATA.bookmarkFaithAvailability568 = {
  insular_traditional_476:{ bookmarkIds:['568'] },
  finnic_traditional_476:{ bookmarkIds:['568'] },
  woodland_traditional_476:{ bookmarkIds:['568'] },
  steppe_traditional_476:{ bookmarkIds:['568'] },
  caucasian_traditional_476:{ bookmarkIds:['568'] },
  nile_traditional_476:{ bookmarkIds:['568'] },
  horn_traditional_476:{ bookmarkIds:['568'] },
  arabian_traditional_476:{ bookmarkIds:['568'] },
  iranian_traditional_476:{ bookmarkIds:['568'] },
  sogdian_traditional_476:{ bookmarkIds:['568'] },
  caucasian_christian_476:{ bookmarkIds:['568'] },
  aksumite_christian_476:{ bookmarkIds:['568'] },
  buddhist_476:{ bookmarkIds:['568'] },
  brahmanical_476:{ bookmarkIds:['568'] },
  sahel_traditional_476:{ bookmarkIds:['568'] }
};
