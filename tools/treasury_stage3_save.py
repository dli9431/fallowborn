"""Prepare an owner-local Stage 3 performance save; never execute game code."""
import base64
import copy
import hashlib
import json
from pathlib import Path
from logistics_stress_save import decode_export


def main():
    root = Path(__file__).resolve().parent.parent
    source = root / 'logistics-stress-save.txt'
    destination = root / 'logistics-stress-save-stage3.txt'
    metadata = destination.with_suffix('.json')
    if destination.exists() or metadata.exists():
        raise ValueError('Existing Stage 3 fixtures are never overwritten')
    data = copy.deepcopy(decode_export(source.read_text(encoding='utf-8-sig')))
    s = data['state']
    period = s['turn'] // 90
    groups = {'rich': [], 'constrained': [], 'insolvent': []}
    for i, rid in enumerate(sorted(s['realms'])):
        realm = s['realms'][rid]
        # Compact exports omit default alive/rank fields; restore supplies them.
        if rid == 'player' or not realm.get('alive', True) or realm.get('rebelFaction') or realm.get('rank', 1) < 1:
            continue
        group = list(groups)[i % 3]
        groups[group].append(rid)
        realm['treasury'] = dict(version=1, gold={'rich':5000, 'constrained':80, 'insolvent':-50}[group],
                                 militaryAccrued=0, lastSettledSeason=period,
                                 lastRevaluedYear=s['date']['year'], lastSummary=None,
                                 retired=False, shortfallSeasons=1 if group == 'insolvent' else 0)
    s['treasuryAccounting'] = dict(version=1, mode='active', pendingPlayer=0,
                                    lastMilitaryTurn=s['turn'], lastSettledSeason=period)
    s.pop('armyLogistics', None)
    s['armyCohorts'] = {}
    damaged = []
    for i, host in enumerate(s['armies']):
        if i % 6 == 0:
            # Reserve room for both levy reinforcements and paid professionals.
            removed = min(100, host['units'].get('levy', 0))
            host['units']['levy'] -= removed
            host['men'] -= removed
            damaged.append(host['id'])
            s['armyCohorts'][host['realm']] = {'ret': {'ready':0, 'batches':[
                {'n':20, 'readyTurn':s['turn'] + 120, 'funded':False}]}}
    # One missing host from each wealth group exercises new muster decisions.
    missing = []
    for group, ids in groups.items():
        host = next((a for a in s['armies'] if a['realm'] in ids), None)
        if host:
            missing.append(host['realm'])
            s['armies'].remove(host)
            s.setdefault('armyDown', {}).pop(host['realm'], None)
    damaged = [hid for hid in damaged if any(a['id'] == hid for a in s['armies'])]
    data.setdefault('meta', {})['name'] = 'Treasury Stage 3: mixed finances'
    body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
    export = 'FBS1.' + base64.b64encode(body).decode('ascii')
    destination.write_text(export, encoding='ascii')
    summary = dict(source=source.name, date=s['date'], turn=s['turn'],
                   hosts=len(s['armies']), soldiers=sum(a['men'] for a in s['armies']),
                   accounts=sum(len(ids) for ids in groups.values()), wealthGroups=groups,
                   missingHosts=missing, damagedHosts=damaged,
                   sha256=hashlib.sha256(export.encode('ascii')).hexdigest(),
                   note='Data preparation only. Import fresh before each 90-day season measurement. Active balances survive migration. Owner verifies runtime outcomes.')
    metadata.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: summary[key] for key in ('hosts', 'soldiers', 'accounts', 'missingHosts')}))
    print(destination.name)


if __name__ == '__main__':
    main()
