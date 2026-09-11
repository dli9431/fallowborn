"""Prepare paired owner-local producer fixtures as data, without running the game."""
import base64
import copy
import hashlib
import json
from pathlib import Path
from logistics_stress_save import decode_export


def main():
    root = Path(__file__).resolve().parent.parent
    source = root / 'logistics-stress-save.txt'
    original = decode_export(source.read_text(encoding='utf-8-sig'))
    outputs = [root / ('logistics-stress-save-producer-' + mode + '.txt')
               for mode in ('purchase', 'requisition')]
    if any(p.exists() or p.with_suffix('.json').exists() for p in outputs):
        raise ValueError('Existing producer exports are never overwritten')
    for mode, destination in zip(('purchase', 'requisition'), outputs):
        data = copy.deepcopy(original)
        s = data['state']
        p = s['player']
        pid = 'antioch'
        p.update(tier=1, provinceId=pid, settlement=0, gold=5000,
                 focus='rest', travel=None, war=None, greatHolyWar=None)
        p['enterprises'] = [{'uid':'producer_probe', 'type':'field_strip',
                            'provinceId':pid, 'settlement':0,
                            'workerId':p['charId'], 'workerIds':[p['charId']], 'level':0}]
        c = s['chars'][p['charId']]
        c.update(dead=False, health=10, born=s['date']['year'] - 29)
        c['career'] = {'profession':'farmer', 'rank':'master', 'experience':13,
                       'chosen':True, 'guildRank':'none', 'guildStanding':0}
        c.setdefault('skills', {})['ste'] = 20
        s.pop('armyLogistics', None)
        s.pop('treasuryAccounting', None)
        for realm in s['realms'].values():
            realm.pop('treasury', None)
        # The household owns the enterprise, never the county or its market dues.
        s['owner'][pid] = 'abbasid'
        s.setdefault('holder', {})[pid] = 'abbasid'
        s['realms']['abbasid']['capital'] = pid
        # Keep the other camp distant for the initial producer measurement.
        for host in s['armies']:
            camp = 'attackers' if 'attackers' in str(host['id']) else 'defenders'
            at = s['realms']['west_francia']['capital'] if camp == 'attackers' else s['realms']['abbasid']['capital']
            if camp == 'defenders':
                at = 'baghdad'
            host.update(at=at, **{'from':at}, path=[], moveLeft=0, goal=None)
        wanted = 'abbasid' if mode == 'purchase' else 'west_francia'
        host = next(a for a in s['armies'] if a['realm'] == wanted)
        host.update(at=pid, **{'from':pid}, path=[], moveLeft=0, goal=None,
                    supply=10, men=3000, size=3000, units={'levy':3000, 'mercs':0})
        goods = s['market']['goods']
        s['market']['counties'][pid][0][goods.index('provisions')] = 100000
        s['market']['counties'][pid][1][goods.index('provisions')] = 1
        s['market']['shocks'] = []
        body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
        export = 'FBS1.' + base64.b64encode(body).decode('ascii')
        destination.write_text(export, encoding='ascii')
        summary = {'scenario':mode, 'county':pid, 'enterprise':'producer_probe',
                   'worker':p['charId'], 'hostRealm':wanted, 'countyOwner':'abbasid',
                   'date':s['date'], 'source':source.name,
                   'sha256':hashlib.sha256(export.encode('ascii')).hexdigest(),
                   'note':'Data fixture only; import and seasonal outcomes are owner-verified.'}
        destination.with_suffix('.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
        print(destination.name)


if __name__ == '__main__':
    main()
