"""Prepare a local stress-save export from an owner's save, without running the game.

Uses only Python's standard library. FBS2 decoding follows the save format's
LZ-string bit layout; output uses the permanent FBS1 JSON/base64 interchange.
This is data preparation, not a simulation or a runtime verification tool.
"""
import argparse
import ast
import base64
import hashlib
import json
import re
from pathlib import Path


def decode_export(text):
    text = ''.join(text.split())
    if text.startswith('FBS1.'):
        return json.loads(base64.b64decode(text[5:]).decode('utf-8'))
    if not text.startswith('FBS2.'):
        raise ValueError('Expected an FBS1 or FBS2 exported save')
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    encoded = text[5:]
    position = 32
    offset = 0
    value = alphabet.index(encoded[0])

    def bits(width):
        nonlocal position, offset, value
        result = 0
        for bit in range(width):
            if value & position:
                result |= 1 << bit
            position >>= 1
            if not position:
                position = 32
                offset += 1
                value = alphabet.index(encoded[offset]) if offset < len(encoded) else 0
        return result

    first = bits(2)
    if first not in (0, 1):
        raise ValueError('Empty compressed save')
    previous = chr(bits(8 if first == 0 else 16))
    dictionary = [None, None, None, previous]
    output = [previous]
    remaining, width = 4, 3
    while offset <= len(encoded):
        code = bits(width)
        if code == 2:
            decoded = ''.join(output).encode('utf-16-le', 'surrogatepass').decode('utf-16-le')
            return json.loads(decoded)
        if code in (0, 1):
            dictionary.append(chr(bits(8 if code == 0 else 16)))
            code = len(dictionary) - 1
            remaining -= 1
        if remaining == 0:
            remaining = 1 << width
            width += 1
        if code < len(dictionary):
            entry = dictionary[code]
        elif code == len(dictionary):
            entry = previous + previous[0]
        else:
            raise ValueError('Invalid compressed dictionary reference')
        output.append(entry)
        dictionary.append(previous + entry[0])
        remaining -= 1
        previous = entry
        if remaining == 0:
            remaining = 1 << width
            width += 1
    raise ValueError('Truncated compressed save')


def prepare(data, root):
    state = data['state']
    year = state['date']['year']
    # Keep the campaign year and household; move only to that year's winter start.
    state['turn'] += 270 - state['date']['season'] * 90 - (state['date']['day'] - 1)
    state['date'] = {'year':year, 'season':3, 'day':1}
    turn = state['turn']
    counties = {}
    for line in (root / 'data/counties.js').read_text(encoding='utf-8').splitlines():
        if line.startswith("['"):
            literal = line[:line.index(']') + 1]
            row = ast.literal_eval(re.sub(r'(?<=,)null(?=[,\]])', 'None', literal))
            if len(row) >= 10:
                counties[row[0]] = row
    map_data = (root / 'data/map_data.js').read_text(encoding='utf-8')
    duchies = set(re.findall(r"(d_\w+):\{[^\n]*kingdom:'k_syria'", map_data))
    realms = state['realms']
    sovereigns = {rid:r for rid,r in realms.items()
                  if rid != 'player' and r.get('alive', True) and not r.get('liege')
                  and not r.get('rebelFaction') and r.get('capital') in counties}
    attackers = sorted(rid for rid,r in sovereigns.items() if r.get('religion') == 'catholic')
    defenders = sorted(rid for rid,r in sovereigns.items() if r.get('religion') in ('sunni', 'shia'))
    if len(attackers) < 15 or len(defenders) < 8:
        raise ValueError('Source needs at least 15 Catholic and 8 Muslim sovereigns')
    objective = sorted(pid for pid,row in counties.items() if row[4] in duchies
                       and state['owner'].get(pid) in defenders)
    if 'antioch' not in objective:
        raise ValueError('Source must have a defending sovereign holding Antioch')
    # Disperse the attacking camp through real European/Balkan/Anatolian counties.
    # Leave pathfinding to the game: do not fabricate adjacency or sea routes.
    approach = sorted((pid for pid,row in counties.items()
                       if 12 <= row[2] <= 34 and 37 <= row[3] <= 49
                       and state['owner'].get(pid) not in defenders),
                      key=lambda pid:(counties[pid][2], counties[pid][3], pid))
    eastern = sorted((pid for pid,row in counties.items()
                      if 36 <= row[2] <= 53 and 28 <= row[3] <= 37
                      and state['owner'].get(pid) in defenders and pid not in objective),
                     key=lambda pid:(counties[pid][2], pid))
    if len(approach) < 15 or len(eastern) < 5:
        raise ValueError('Source lacks sufficient approach counties')
    state['wars'] = {}
    state['truces'] = {}
    state['alliances'] = []
    state['armyDown'] = {}
    state['armyDownSurvival'] = {}
    state['armyDetachmentDown'] = {}
    state['armyCohorts'] = {}
    state['armies'] = []
    state['rebellions'] = {}
    state['eventQueue'] = []
    state['slotDays'] = []
    for realm in realms.values():
        realm['war'] = None
        realm.pop('treasury', None)
    state.pop('treasuryAccounting', None)
    state.pop('armyLogistics', None)
    player = state['player']
    player['greatHolyWar'] = None
    player['war'] = None
    player['dead'] = False
    player['focus'] = 'rest'
    player['gold'] = max(5000, player.get('gold', 0))
    character = state['chars'][player['charId']]
    character['health'] = 10
    character['dead'] = False
    # Public-facing telemetry provenance should not travel with the derived fixture.
    state.pop('telemetry', None)
    state['market']['lastTurn'] = turn
    state['market']['shocks'] = []
    good = state['market']['goods'].index('provisions')
    for i,pid in enumerate(sorted(state['market']['counties'])):
        row = state['market']['counties'][pid]
        row[0][good] = max(50, row[0][good]) * (0.3 if i % 7 == 0 else 1.5)
        row[1][good] = 1.35 if i % 7 == 0 else 1
    participants = {'attackers':[], 'defenders':[]}
    for camp, ids, positions in [('attackers', attackers, approach), ('defenders', defenders, eastern)]:
        for i,rid in enumerate(ids):
            participants[camp].append({'realm':rid, 'sovereign':True,
                'mandatory':camp == 'defenders', 'voluntary':camp == 'attackers',
                'joinedTurn':turn - 180, 'vowSeasons':12, 'served':0,
                'desire':{'kind':'neutral', 'id':None}, 'mustered':True, 'vowOutcome':None})
            men = 1800 + (i % 6) * 300
            pid = positions[(i * 3) % len(positions)]
            cavalry = men // 10
            archers = men // 5
            retinue = men // 10
            state['armies'].append({'id':'stress_' + camp + '_' + rid, 'realm':rid,
                'men':men, 'size':men, 'units':{'levy':men-cavalry-archers-retinue,
                    'arch':archers, 'cav':cavalry, 'ret':retinue, 'mercs':0},
                'warId':'holy', 'at':pid, 'from':pid, 'moveLeft':0, 'path':[],
                'goal':'antioch', 'supply':20 + (i % 5) * 15})
    state['greatHolyWar'] = {'id':'ghw_logistics_stress', 'phase':'active',
        'callingReligion':'catholic', 'callerRealm':'papacy', 'callerClaimantId':None,
        'callerObedienceId':None, 'leaderRealm':attackers[0], 'targetKingdom':'k_syria',
        'holyCounties':[pid for pid in ['jerusalem', 'antioch'] if pid in objective],
        'objectiveCounties':objective, 'calledTurn':turn-180, 'launchTurn':turn-1,
        'launchedTurn':turn-1, 'deadlineTurn':turn+2880, 'participants':participants,
        'occupations':{pid:{'occupied':False, 'progress':0, 'progressCamp':None,
                           'occupiedBy':None} for pid in objective},
        'resolve':100, 'contribution':{rid:0 for rid in attackers+defenders},
        'result':None, 'settlement':None}
    for i,pid in enumerate(objective):
        records = state['buildings'].setdefault(pid, [])
        records[:] = [r for r in records if (r if isinstance(r, str) else r.get('id')) != 'walls']
        records.append({'id':'walls', 's':0, 'level':1 + i % 4, 'ruined':False})
    data['meta'] = {'name':'Logistics stress: winter march', 'year':year, 'season':3}
    return {'date':state['date'], 'turn':turn, 'attackers':len(attackers),
            'defenders':len(defenders), 'armies':len(state['armies']),
            'soldiers':sum(a['men'] for a in state['armies']),
            'startingCounties':len(set(a['at'] for a in state['armies'])),
            'objectiveCounties':len(objective),
            'note':'Synthetic workload; real routes are calculated on the first simulated day. Not runtime-verified.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    data = decode_export(args.source.read_text(encoding='utf-8-sig'))
    if args.output:
        root = Path(__file__).resolve().parent.parent
        if args.output.resolve() == args.source.resolve() or args.output.exists() or args.output.with_suffix('.json').exists():
            raise ValueError('Choose a new output file; source and existing exports are never overwritten')
        summary = prepare(data, root)
        body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
        export = 'FBS1.' + base64.b64encode(body).decode('ascii')
        args.output.write_text(export, encoding='ascii')
        summary['sha256'] = hashlib.sha256(export.encode('ascii')).hexdigest()
        summary['sourceSha256'] = hashlib.sha256(args.source.read_bytes()).hexdigest()
        summary['file'] = args.output.name
        args.output.with_suffix('.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(summary))
        return
    state = data['state']
    living = {rid: r for rid, r in state['realms'].items() if r.get('alive', True)}
    print(json.dumps({'file':args.source.name, 'date':state['date'], 'turn':state['turn'],
                      'keys':list(state), 'player':state['player']['charId'],
                      'realms':len(living), 'armies':len(state.get('armies', [])),
                      'sovereigns':{rid: {'faith':r.get('religion'), 'capital':r.get('capital')}
                                    for rid,r in living.items() if not r.get('liege')},
                      'campaign':state.get('greatHolyWar')}, ensure_ascii=True))


if __name__ == '__main__':
    main()
