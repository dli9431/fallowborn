"""Prepare an owner-local Stage 3 performance save; never execute game code."""
import base64
import argparse
import copy
import hashlib
import json
from pathlib import Path
from logistics_stress_save import decode_export


def add_counterparty_deliveries(root):
    destination = root / 'notes' / 'logistics-stress-save-stage3.txt'
    metadata = destination.with_suffix('.json')
    summary = json.loads(metadata.read_text(encoding='utf-8-sig'))
    previous = summary.get('counterpartyTransfers', {})
    if previous.get('fixtureRevision') == 2:
        raise ValueError('Scaled counterparty workload already prepared')
    data = decode_export(destination.read_text(encoding='utf-8-sig'))
    s = data['state']
    pending = s['player'].get('giftDeliveries', [])
    old = [d for d in pending if d.get('id', '').startswith('stress_treasury_gift_')]
    if len(old) != previous.get('expectedCount', 0) or sum(d['amount'] for d in old) != previous.get('prepaidPlayerGold', 0):
        raise ValueError('Existing fixture payments do not match metadata; refusing to rebase')
    if any(d.get('treasuryDelivered') or d.get('phase') != 'outbound' for d in old):
        raise ValueError('Only an unplayed fixture can be replaced')
    recipients = [rid for ids in summary['wealthGroups'].values() for rid in ids
                  if s['realms'][rid].get('capital') and s['realms'][rid].get('ruler')]
    per_day = len(s['armies'])
    deliveries = []
    for day in range(1, 91):
        for slot in range(per_day):
            index = (day - 1) * per_day + slot
            rid = recipients[index % len(recipients)]
            realm = s['realms'][rid]
            # Synthetic terminal handling leg, not a geographical route benchmark.
            # A nonempty route makes legDaysLeft control the delivery day.
            deliveries.append(dict(
                id='stress_treasury_gift_' + str(index), senderCharId=s['player']['charId'],
                recipientKind='ruler', recipientId=rid,
                recipientGeneration=realm['ruler'].get('generation', 1),
                recipientName=realm['ruler']['name'], giftKind='cash', amount=1,
                effect=1, currentId=realm['capital'], destinationId=realm['capital'],
                phase='outbound', remainingRoute=[realm['capital']], legDays=day,
                legDaysLeft=day, startedTurn=s['turn'], arrivalTurn=s['turn'] + day))
    total = len(deliveries)
    available = s['player']['gold'] + sum(d['amount'] for d in old)
    if available < total:
        raise ValueError('Player cannot prepay the fixture gifts')
    s['player']['gold'] = available - total
    s['player']['giftDeliveries'] = [d for d in pending if d not in old] + deliveries
    summary['counterpartyTransfers'] = dict(
        fixtureRevision=2, expectedCount=total, scheduledPerDay=per_day, days=90,
        prepaidPlayerGold=total, amountPerGift=1, recipientAccounts=len(recipients),
        scheduledCourierVisits=per_day * sum(range(1, 91)),
        note='Synthetic terminal handling legs schedule 53 arrivals daily. Up to 4770 transfers; ruler deaths or moved capitals may cause returns. Includes courier scans, standing and news overhead. Reload before each run; not a route, ransom or peace-choice benchmark.')
    body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
    export = 'FBS1.' + base64.b64encode(body).decode('ascii')
    summary['sha256'] = hashlib.sha256(export.encode('ascii')).hexdigest()
    destination.write_text(export, encoding='ascii')
    metadata.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary['counterpartyTransfers']))


def prepare_ui(root):
    destination = root / 'notes' / 'logistics-stress-save-stage3.txt'
    metadata = destination.with_suffix('.json')
    data = decode_export(destination.read_text(encoding='utf-8-sig'))
    summary = json.loads(metadata.read_text(encoding='utf-8-sig'))
    s = data['state']
    # Historical display samples: do not pay this income a second time.
    cases = {
        'abbasid': dict(gold=5000, militaryAccrued=120, recoverUntil=0,
                        lastSummary=dict(income=300, duesIn=60, duesOut=20, upkeep=40, military=100)),
        'abyssinia': dict(gold=-50, militaryAccrued=30, recoverUntil=s['turn'] + 90,
                          lastSummary=dict(income=40, duesIn=10, duesOut=20, upkeep=30, military=80)),
        'aghlabids': dict(gold=20, militaryAccrued=50, recoverUntil=0, lastSummary=None)
    }
    for rid, values in cases.items():
        s['realms'][rid]['treasury'].update(values)
    s['player']['tier'] = 0
    s.setdefault('armyLogistics', {}).update(
        producerLast=dict(gain=12, loss=5, period=s['turn'] // 90 - 1))
    data.setdefault('meta', {})['name'] = 'Treasury UI: reserves, recovery and army trade'
    summary['uiChecks'] = dict(
        realms=cases, playerTier=0, producerGain=12, producerLoss=5,
        note='Synthetic settled-history samples, not new payments. Inspect paused before advancing. Gift queue preserved; this is a changed performance baseline.')
    export = 'FBS1.' + base64.b64encode(json.dumps(
        data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')).decode('ascii')
    summary['sha256'] = hashlib.sha256(export.encode('ascii')).hexdigest()
    destination.write_text(export, encoding='ascii')
    metadata.write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(save=destination.name, uiChecks=summary['uiChecks'],
                          pendingGifts=len(s['player'].get('giftDeliveries', [])))))


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--add-counterparty-transfers', action='store_true',
                        help='Replace fixture gifts with an army-scaled 90-day transfer workload once')
    parser.add_argument('--prepare-ui', action='store_true',
                        help='Seed treasury UI examples in the existing save, preserving pending gifts')
    args = parser.parse_args()
    if args.prepare_ui and args.add_counterparty_transfers:
        parser.error('Choose one preparation operation at a time')
    if args.prepare_ui:
        prepare_ui(root)
        return
    if args.add_counterparty_transfers:
        add_counterparty_deliveries(root)
        return
    source = root / 'notes' / 'logistics-stress-save.txt'
    destination = root / 'notes' / 'logistics-stress-save-stage3.txt'
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
