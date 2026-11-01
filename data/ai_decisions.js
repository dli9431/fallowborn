/* Pure decision defaults. Live consumers migrate individually. */
window.FBDATA = window.FBDATA || {};
FBDATA.aiDecisionPolicies = {
  ordinary_war:{ family:'war', mode:'first', parameters:{ chance:0.025,
    bellicoseChance:0.08, minimumStrengthRatio:1.2, maximumCommitments:2,
    aggressionAppetite:1, bellicoseAppetite:1.5 }, order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_expansion:{ family:'expansion', mode:'ordered', parameters:{},
    order:[{metric:'aggression',direction:'asc'}], weights:{}, bias:0, tieBreak:'id', adjustments:[] },
  ordinary_tactics:{ family:'tactics', mode:'first', parameters:{ engagementMargin:1.1, objectiveFirst:0 },
    order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_investment:{ family:'investment', mode:'first', parameters:{capitalPriority:0,frontierPriority:1,
    interiorPriority:2,developmentWeight:0,fortDevelopmentWeight:1,buildOrderWeight:1,
    benefitWeight:0,costWeight:0,upkeepWeight:0,profileScoreWeight:1,baronPreference:0,operationSpending:1},
    order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_research:{ family:'research', mode:'weighted', parameters:{ baseScore:10, exposureMultiplier:2.25,
    historicalBase:1.5, historicalSlope:0.18, historicalFloor:0.25,
    horizonFloor:0.35, horizonCap:2, horizonMultiplier:3, futureThreshold:4,
    futureMultiplier:0.12, timelyMultiplier:1.35, aggressionMultiplier:0.4,
    wartimeMultiplier:2, rankMultiplier:0.2, commerceCoastalMultiplier:1.2,
    seaCoastalMultiplier:1.8, seaInlandMultiplier:0.45, priorityMultiplier:6,
    transportCoastalMultiplier:1.25,transportInlandMultiplier:0.5,slotUnlockMultiplier:1.8,
    economyUnlockMultiplier:1.35,unitUnlockMultiplier:1.25,ruleUnlockMultiplier:1.1,practiceUnlockMultiplier:1.03 },
    order:[], weights:{score:1}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_intrigue:{ family:'intrigue', mode:'first', parameters:{ baseWeight:1,
    chanceRate:0.25, maximumChance:0.8, minimumWeight:0.25 }, order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_diplomacy:{ family:'diplomacy', mode:'first', parameters:{ allianceChance:0.08,
    cultivationMultiplier:1,peerCultivationMultiplier:1,rebelSupportCap:3,relationshipDivisor:6,
    relationshipCap:15,courtAmbitionMultiplier:1,courtMartialCenter:6,courtMartialCap:12,
    courtAgeCenter:40,courtAgeScale:10,courtAgeCap:8,courtEconomicCap:8 },
    order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_religion:{ family:'religion', mode:'first', parameters:{ minimumTargetRatio:0.5 },
    order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] },
  ordinary_government:{ family:'government', mode:'first', parameters:{},
    order:[], weights:{}, bias:0, tieBreak:'input', adjustments:[] }
};
Object.assign(FBDATA.balance, {
  aiRaidTargetDevelopmentWeight:0,
  aiWarPolicy:'ordinary_war', aiExpansionPolicy:'ordinary_expansion', aiTacticsPolicy:'ordinary_tactics',
  aiInvestmentPolicy:'ordinary_investment', aiResearchPolicy:'ordinary_research',
  aiIntriguePolicy:'ordinary_intrigue', aiDiplomacyPolicy:'ordinary_diplomacy',
  aiReligionPolicy:'ordinary_religion', aiGovernmentPolicy:'ordinary_government'
});
