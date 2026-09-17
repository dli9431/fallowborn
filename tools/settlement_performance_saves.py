"""Prepare matched settlement profiling exports offline; never execute game code."""
import argparse
import base64
import copy
import hashlib
import json
from pathlib import Path
from logistics_stress_save import decode_export
from settlement_lordship_saves import scenarios


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=Path('notes/settlement-performance'))
    args = parser.parse_args()
    source = decode_export(args.source.read_text(encoding='utf-8-sig'))
    base = next(data for name, data, _ in scenarios(source) if name == '07-count-direct-capacity')
    state = base['state']
    counties = sorted(pid for pid, rid in state['owner'].items()
                      if rid and rid in state['realms'] and not state['realms'][rid].get('alive') is False)
    me = state['chars'][state['player']['charId']]
    # Keep the same extra character population in every variant, including control.
    for pid in counties:
        cid = 'settlement_perf_' + pid
        if cid in state['chars']:
            raise ValueError('Stress character ID collision: ' + cid)
        state['chars'][cid] = {
            'id':cid, 'name':'Settlement steward', 'dyn':pid, 'sex':'m',
            'culture':me['culture'], 'religion':me['religion'],
            'born':state['date']['year']-30, 'station':3, 'statusTier':3,
            'homeProvinceId':pid, 'health':100, 'traits':[], 'childrenIds':[],
            'skills':{'dip':5, 'mar':5, 'ste':15, 'int':5, 'lea':5}}
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {'source':args.source.name, 'counties':len(counties), 'files':[]}
    for name, dense, delegated in [('01-control', False, False),
                                    ('02-dense-direct', True, False),
                                    ('03-dense-delegated', True, True)]:
        data = copy.deepcopy(base)
        s = data['state']; root = s['settlementLordships']
        if dense:
            root['accounts'] = {}
            for pid in counties:
                root['counties'][pid] = {'established':8, 'lordships':{}}
                if not delegated:
                    continue
                cid = 'settlement_perf_' + pid
                for slot in range(1, 7):
                    root['counties'][pid]['lordships'][str(slot)] = {
                        'holderId':cid, 'founderId':cid, 'dynasty':pid,
                        'playerHouse':False, 'successorId':None,
                        'obligations':{'charterId':'customary_service'},
                        'grantedTurn':s['turn'], 'source':'grant'}
                root['accounts'][cid] = {'gold':1500, 'lastSeason':None}
        data['meta']['name'] = name
        body = json.dumps(data, ensure_ascii=True, separators=(',', ':')).encode('utf-8')
        exported = 'FBS1.' + base64.b64encode(body).decode('ascii')
        dest = args.output / (name + '.txt')
        if dest.resolve() == args.source.resolve():
            raise ValueError('Refusing to overwrite source')
        dest.write_text(exported, encoding='utf-8')
        manifest['files'].append({'file':dest.name, 'sha256':hashlib.sha256(exported.encode()).hexdigest(),
                                  'configuredDenseSites':8*len(counties) if dense else None,
                                  'delegatedSites':6*len(counties) if delegated else 0})
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (args.output / 'README.md').write_text("""# Settlement performance comparisons

Edited FBS1 exports, prepared offline. Original save unchanged. Import validation and
profiling remain owner-controlled. All variants share starting date, RNG, characters,
population, buildings and cleared wars; dense variants deliberately unlock eight sites
per owned county without simulating construction. Population is not multiplied.
The engine reconciles settlement distribution on import. Inspect the profiler workload
counts after import; configured counts in manifest are not runtime-verified counts.

- 01-control: original settlement distribution from count scenario 07.
- 02-dense-direct: eight established sites per owned county, directly held.
- 03-dense-delegated: same sites; six per county granted to one funded baron.

The same synthetic adult characters exist in all three saves, so character count is
controlled. Delegation adds accounts and changes fiscal/AI behavior intentionally.
High direct-holding penalties are intentional in 02. AI may grant holdings during a
season, so compare workload start/end. These are scaling probes, not balance saves.

Import a fresh variant, pause, enable FB.game.fastForwardTiming.enable(true) in the
console, then use normal fast-forward for one season. Copy
JSON.stringify(FB.game.fastForwardTiming.last, null, 2).
Repeat from each original export using the same tab, viewport, selected panel and
Observe setting. Record interrupted bursts and compare equal day counts only.
For annual work, repeat through a year boundary and ensure worldTick appears; do not
compare annual bursts with ordinary seasons. Reload before repeats, since AI changes
holdings. Disable with FB.game.fastForwardTiming.enable(false).

Inspect Settlement operation rows and Settlement counters, especially holding scans,
fiscal cache builds/hits and account settlement, alongside army recruitment checks.
Self time excludes nested rows; inclusive totals must not be summed. Final UI time is
included, but deferred paint and import time are not. No benchmark has been run.
""", encoding='utf-8')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
