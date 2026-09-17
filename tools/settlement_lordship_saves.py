"""Prepare owner-local lordship scenarios from an export, without running game code.

Uses the permanent FBS1 interchange format. These are deliberately edited scenarios,
not simulated outcomes or runtime validation. Original exports are never overwritten.
"""
import argparse
import base64
import copy
import hashlib
import json
from pathlib import Path

from logistics_stress_save import decode_export


def free_test_family(state):
    """Make living relatives free; adult relatives qualify for noble grants."""
    chars = state['chars']
    links = {cid:set() for cid in chars}
    for cid, c in chars.items():
        relatives = [c.get('fatherId'), c.get('motherId')] + c.get('childrenIds', [])
        for other in relatives:
            if other in chars:
                links[cid].add(other)
                links[other].add(cid)
    family = set()
    pending = [state['player']['charId'], state['player'].get('houseFounderId')]
    while pending:
        cid = pending.pop()
        if cid not in chars or cid in family:
            continue
        family.add(cid)
        pending.extend(links[cid] - family)
    family.update(c.get('spouseId') for cid, c in chars.items() if cid in family)
    family.update(cid for cid, c in chars.items() if c.get('spouseId') in family)
    changed = 0
    for cid in family:
        c = chars.get(cid)
        if not c or c.get('dead'):
            continue
        c.pop('unfree', None)
        tier = 2 if state['date']['year'] - c['born'] >= 16 else 1
        c['station'] = max(tier, c.get('station', 0))
        c['statusTier'] = max(tier, c.get('statusTier', 0))
        changed += 1
    return changed


def prepare(source):
    data = copy.deepcopy(source)
    s = data['state']
    p = s['player']
    me = s['chars'][p['charId']]
    home = 'barcelona'
    count = s['holder'][home]
    superior = 'west_francia'
    if count == superior or count == 'player':
        raise ValueError('Source must have a separate Barcelona holder')
    p.update(tier=2, provs=[], provinceId=home, homeSettlement=0,
             liege=count, gold=10000, prestige=2500, piety=1500,
             dead=False, travel=None, war=None, plot=None, focus=None,
             cooldowns={}, gentryGeneration=-1, liegeOp=100)
    p['liegeOps'] = {rid:100 for rid in s['realms']}
    p['flags'] = {}
    p['fabricatedClaims'] = {}
    p['fabricatedClaim'] = None
    p['greatHolyWar'] = None
    p['tenure'] = None
    me.update(station=2, statusTier=2, unfree=False, health=100)
    me.pop('dead', None)
    me['skills']['ste'] = 5
    s['eventQueue'] = []
    s['wars'] = {}
    s['armies'] = []
    s['rebellions'] = {}
    s['truces'] = {}
    s['alliances'] = []
    s['greatHolyWar'] = None
    for rid, realm in s['realms'].items():
        realm['war'] = None
        if rid == 'player':
            realm['alive'] = False
    s['realms'][count].update(alive=True, rank=1, liege=superior, capital=home)
    s['realms'][superior].update(alive=True, liege=None, capital='paris')
    for pid in ['paris', 'orleans']:
        s['holder'][pid] = superior
        s['owner'][pid] = superior
    s['owner'][home] = superior
    s['dev'][home] = 9
    # Retain property and works at established sites; free later slots for founding.
    s['buildings'][home] = [{'s':0, 'id':'mill', 'devGranted':1},
                           {'s':1, 'id':'mill', 'devGranted':1}]
    for key in ['landPlots', 'enterprises']:
        p[key] = [r for r in p.get(key, [])
                  if r.get('provinceId') != home or r.get('settlement', 0) < 2]
    p['manor'] = {'provinceId':home, 'settlement':1}
    s['settlementLordships'] = {
        'version':1, 'foundingVersion':1, 'legacyBarony':'none',
        'counties':{home:{'established':2, 'lordships':{}}}}
    # Compact exports omit character ids; explicit ids are legal on interchange.
    for cid, character in s['chars'].items():
        character['id'] = cid
        if character.get('realmStanding') is not None or character.get('royalLine'):
            character['opinion'] = 100
            character['realmStanding'] = 100
    free_test_family(s)
    data['meta'] = {'name':me['name'], 'year':s['date']['year'],
                    'season':s['date']['season']}
    return data, home, count, superior


def scenarios(source):
    base, home, count, superior = prepare(source)

    def fresh(tier):
        d = copy.deepcopy(base)
        s, p = d['state'], d['state']['player']
        p['tier'] = tier
        s['chars'][p['charId']]['station'] = tier
        s['chars'][p['charId']]['statusTier'] = tier
        return d

    def barony(d, cid=None, slot=1):
        s = d['state']; p = s['player']; cid = cid or p['charId']
        s['settlementLordships']['counties'][home]['lordships'][str(slot)] = {
            'holderId':cid, 'founderId':cid, 'dynasty':s['chars'][cid].get('dyn', ''),
            'playerHouse':cid == p['charId'], 'successorId':None,
            'obligations':{'charterId':'customary_service'},
            'grantedTurn':s['turn'], 'source':'grant'}

    def count_save(d):
        s = d['state']; p = s['player']; me = s['chars'][p['charId']]
        p.update(tier=4, provs=[home], liege=superior)
        s['holder'][home] = 'player'
        s['realms']['player'] = {
            'id':'player', 'name':'County of Barcelona', 'color':'#f0c840',
            'capital':home, 'religion':me['religion'], 'alive':True,
            'rank':1, 'liege':superior, 'war':None, 'op':0, 'aggression':0,
            'ruler':{'name':me['name'], 'sex':me['sex'], 'culture':me['culture'],
                     'age':s['date']['year'] - me['born'], 'mar':me['skills']['mar'],
                     'generation':1}, 'succession':{'playerDynasty':True}}
        # Preserve the displaced realm with another county for stable scenario politics.
        s['holder']['girona'] = count
        s['owner']['girona'] = superior
        s['realms'][count]['capital'] = 'girona'
        s['settlementLordships']['counties'][home]['established'] = 6

    yield '01-gentry-petition', fresh(2), 'Petition for an existing barony. Inspect the named county ruler, site, costs and chance; compare founding. A manor is at slot 1.'
    d = fresh(2)
    d['state']['player']['gentryGeneration'] = 999
    yield '02-first-generation-founding', d, 'Use Found a Settlement. Ordinary barony petition is blocked for this new gentle house. Fund, inspect Ongoing commitments, save/reload, advance one year, then complete. Reload to try cancellation; funding is not refunded.'
    d = fresh(3); barony(d)
    yield '03-landed-baron', d, 'Open Barcelona settlements: slot 1 belongs to you, the seat does not. Compare tax, upkeep, dues, levies and building access. Use the road to Count to petition for a named higher-ruler county; Paris is protected.'
    yield '04-usurpation', copy.deepcopy(d), 'Open Challenge the Count. No claim: inspect superior opposition and political costs before declaring. Play victory or defeat; the original settlement grant must survive. Save/reload during the war.'
    d = copy.deepcopy(d)
    d['state']['player']['fabricatedClaims'] = {home:{'pid':home, 'madeTurn':d['state']['turn']}}
    yield '05-claim-and-authorization', d, 'A county claim is ready. Compare declaring directly with requesting superior authorization first. Authorization should change the defender and recognition terms. Victory consumes the claim and transfers only Barcelona.'
    d = copy.deepcopy(d)
    d['state']['realms'][count]['liege'] = None
    d['state']['owner'][home] = count
    yield '06-independent-count-challenge', d, 'Challenge an independent count with a claim. No superior participates or requires recognition after victory.'
    d = fresh(4); count_save(d)
    yield '07-count-direct-capacity', d, 'Six direct settlements with modest Stewardship. Inspect the direct holding cap and penalties. Grant secondary settlements to barons; compare full direct returns with charter dues, building permissions and seasonal AI investment. The seat cannot be granted.'
    d = copy.deepcopy(d)
    s = d['state']; cid = 'lordship_test_baron'
    me = s['chars'][s['player']['charId']]
    s['chars'][cid] = {'id':cid, 'name':'Bernat', 'dyn':'of Sabadell', 'sex':'m',
        'culture':me['culture'], 'religion':me['religion'], 'born':s['date']['year']-35,
        'skills':{'dip':5,'mar':5,'ste':5,'int':5,'lea':5}, 'traits':[],
        'childrenIds':['lordship_test_heir'], 'station':3, 'health':100}
    s['chars']['lordship_test_heir'] = {
        'id':'lordship_test_heir', 'name':'Ramon', 'dyn':'of Sabadell', 'sex':'m',
        'culture':me['culture'], 'religion':me['religion'], 'born':s['date']['year']-16,
        'fatherId':cid, 'skills':{'dip':5,'mar':5,'ste':5,'int':5,'lea':5},
        'traits':[], 'childrenIds':[], 'station':2, 'health':100}
    barony(d, cid)
    s['settlementLordships']['accounts'] = {cid:{'gold':1500, 'lastSeason':None}}
    yield '08-count-delegated', d, 'Slot 1 belongs to Bernat, whose son Ramon can inherit. Inspect dues and restricted construction. Advance seasons for autonomous investment. Revoke through its review, then restore; inspect the Standing consequence and surviving works. Compare with save 07.'
    d = copy.deepcopy(d)
    d['state']['settlementLordships']['disputedCounties'] = {home:{'superior':superior, 'acquiredTurn':d['state']['turn']}}
    d['state']['settlementLordships']['countyClaims'] = {home:[{'characterId':cid, 'dynasty':'of Sabadell', 'createdTurn':d['state']['turn']}]}
    yield '09-disputed-recognition', d, 'Use Seek County Recognition. Inspect acceptance-only costs and refusal cooldown. Recognition should clear disputed status while leaving the rival restoration claim and Bernat barony intact.'
    d = fresh(3); del d['state']['settlementLordships']
    yield '10-legacy-landless-baron', d, 'Import exercises migration: a legacy territorial Baron should receive a concrete non-seat holding, while existing sites and private property remain. Export/reimport to check migration is not repeated.'
    d = fresh(2); s = d['state']; p = s['player']
    root = s['settlementLordships']
    root['counties'][home]['established'] = 5
    root['foundingSerial'] = 1
    p['gold'] -= 500
    root['founding'] = {home:{
        'id':1, 'status':'building', 'playerHouse':True, 'provinceId':home,
        'sponsorId':p['charId'], 'founderId':p['charId'],
        'dynasty':s['chars'][p['charId']].get('dyn', ''),
        'grantorId':None, 'grantorRealmId':count,
        'settlement':5, 'site':'geo_mataro_3117164', 'funded':500,
        'prestige':250, 'piety':0, 'startedTurn':s['turn']-359,
        'dueTurn':s['turn']+1, 'lastTurn':s['turn'], 'pausedDays':0}}
    yield '11-founding-one-day-left', d, 'An edited funded charter at slot 5 (Mataro) has one day left. Inspect Ongoing commitments, note population and property, then advance one day. Expect a new hereditary holding and Baron rank without creating people or moving private property.'
    d = copy.deepcopy(d); d['state']['player']['prestige'] = 0
    yield '12-founding-awaiting-prestige', d, 'One day remains but completion prestige is missing. Advance one day: the paid charter should wait without losing funds or granting rank. Inspect the exact blocker, save/reload, or cancel to release the reserved site.'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('notes/settlement-lordship-test-saves'))
    args = parser.parse_args()
    source = decode_export(args.source.read_text(encoding='utf-8-sig'))
    args.output.mkdir(parents=True, exist_ok=True)
    guide = ['# Settlement lordship test saves', '',
             'Import one .txt file through Menu > Load / Import. Keep the game paused while inspecting each setup. These are edited fixtures, not simulated achievements. Original exports are untouched.', '',
             'Prepared offline; runtime import, gameplay and visual validation are still owner tasks. Resources and Standing are deliberately generous. Wars are cleared at the start. Living family members are free; adults are at least Gentry so they can qualify for settlement grants. Children still need to reach adulthood, and other grant restrictions still apply. Each file is independent; reload its original to compare alternate choices.', '']
    manifest = {'source':args.source.name, 'files':[]}
    for name, data, instructions in scenarios(source):
        body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
        exported = 'FBS1.' + base64.b64encode(body).decode('ascii')
        path = args.output / (name + '.txt')
        if path.resolve() == args.source.resolve():
            raise ValueError('Refusing to overwrite source')
        path.write_text(exported, encoding='utf-8')
        manifest['files'].append({'file':path.name, 'sha256':hashlib.sha256(exported.encode()).hexdigest()})
        guide.extend(['## ' + name, '', instructions, ''])
    guide.extend(['## Longer checks', '',
        'On saves 03 and 08, continue through a household/baron succession and verify inherited holdings and works. Compare population totals before/after founding (no new people), occupation pauses, insufficient completion prestige, and list > review > Back/Cancel return positions. Check the same screens on mobile, keyboard, file:// and itch.io. Technology should improve direct capacity without gating grants, founding or political recognition.', '',
        'For formal deterministic, conservation, succession and war-result assertions use the authored settlement-lordship, settlement-lordship-economy, settlement-lordship-grants, settlement-founding and settlement-county-progression specifications. The saves do not replace these checks.', ''])
    (args.output / 'README.md').write_text('\n'.join(guide), encoding='utf-8')
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print('Prepared', len(manifest['files']), 'save files in', args.output)


if __name__ == '__main__':
    main()
