import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RegionalLiteralTests(unittest.TestCase):
    def test_legal_literals_use_existing_owners_without_executing_sources(self):
        sources = {}
        for date, identity, name in [('777', 'river_law', 'River procedure'),
                                     ('888', 'hill_law', 'Hill procedure')]:
            sources['bookmark_' + date + '_region_b01.js'] = (
                'FBDATA.bookmarkRevisionContent_law_' + date + ' = ' + json.dumps({
                    'bookmarkId': date, 'revision': 'baseline',
                    'legalTraditions': {identity: {'name': name,
                        'jurisdiction': {'mixed': 'untranslated_identity'}}},
                }) + '; throw new Error("Never execute");')
        inventory = self.extract_sources(sources)
        for identity, name in [('river_law', 'River procedure'), ('hill_law', 'Hill procedure')]:
            self.assertEqual(inventory.entries['legalTradition.' + identity + '.name.default']['text'], name)
            self.assertIn(i18n_catalog.source_key(name), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('untranslated_identity'), inventory.entries)
        for value in [[], {'broken': 4}, {'broken': {'name': 4}}]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.extract_sources({'bookmark_777_region_b01.js':
                    'FBDATA.bookmarkRevisionContent_bad = ' + json.dumps({
                        'bookmarkId': '777', 'revision': 'baseline', 'legalTraditions': value}) + ';'})
        collision = dict(sources)
        collision['bookmark_888_region_b02.js'] = sources['bookmark_888_region_b01.js'].replace(
            'hill_law', 'river_law')
        with self.assertRaisesRegex(ValueError, 'colliding source key'):
            self.extract_sources(collision)

    def extract_sources(self, sources):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, source in sources.items():
                (data / filename).write_text(source, encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_bookmark_revision_content(inventory)
            return inventory

    def test_independent_flat_tables_keep_revision_and_global_owners(self):
        sources = {
            'bookmark_634_region_b01.js': '''
                FBDATA.bookmarkRevisionContent_coast = {
                  bookmarkId:'634', revision:'baseline',
                  provinces:[{id:'harbor',name:'Harbor district',
                    names:[{from:600,name:'Old harbor'}]}],
                  realms:[{id:'coast',name:'Coastal court',ruler:{name:'Proper Person'}}],
                  duchies:{coast:{name:'Coastal districts'}},
                  layouts:{harbor:[{site:'harbor_port',name:'Harbor quay'}]},
                  administrationProfiles:{coast_admin:{name:'Coastal administration',
                    desc:'Review {money:5} in public costs'}},
                  governmentForms:{coast_form:{selectionProfile:{members:[
                    {id:'assent',name:'Local assent'}]}}}
                };
                throw new Error('Never execute this source');
            ''',
            'bookmark_777_region_b12.js': '''
                // FBDATA.bookmarkRevisionContent_fake = {bookmarkId:'bad'};
                FBDATA.bookmarkRevisionContent_inland = {
                  bookmarkId:'777', revision:'charter',
                  provinces:[{id:'upland',name:{default:'Upland district',muslim:'High district'}}],
                  kingdoms:{upland:{name:'Inland country'}},
                  empires:{upland:{name:'Inland union'}},
                  cultures:{upland:{name:'Upland community'}},
                  aristocraticProfiles:{inland_court:{name:'Inland council',
                    interests:[{id:'valley',name:'Valley households'}]}}
                };
                throw new Error('Never execute this source either');
            ''',
        }
        inventory = self.extract_sources(sources)
        expected = {
            'province.634.baseline.harbor.name.default': 'Harbor district',
            'province.634.baseline.harbor.name.dated.0.default': 'Old harbor',
            'realm.634.baseline.coast.name.default': 'Coastal court',
            'duchy.634.baseline.coast.name.default': 'Coastal districts',
            'settlement.634.baseline.harbor_port.name.default': 'Harbor quay',
            'administrationProfile.coast_admin.name.default': 'Coastal administration',
            'administrationProfile.coast_admin.desc.default': 'Review {money:5} in public costs',
            'governmentSelection.coast_form.member.assent.name.default': 'Local assent',
            'province.777.charter.upland.name.muslim': 'High district',
            'kingdom.777.charter.upland.name.default': 'Inland country',
            'empire.777.charter.upland.name.default': 'Inland union',
            'culture.upland.name.default': 'Upland community',
            'aristocraticProfile.inland_court.name.default': 'Inland council',
            'aristocraticInterest.inland_court.valley.name.default': 'Valley households',
        }
        for key, text in expected.items():
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertIn('_region_b', inventory.meta[key]['location'])
        self.assertNotIn(i18n_catalog.source_key('Proper Person'), inventory.entries)
        self.assertFalse(any('.None.' in key for key in inventory.entries))

    def test_flat_files_reject_missing_or_computed_owners(self):
        invalid = [
            "// FBDATA.bookmarkRevisionContent_fake = {};",
            'var fake = "FBDATA.bookmarkRevisionContent_fake = {}";',
            "FBDATA.bookmarkRegions634.b01 = {provinces:[]};",
            "FBDATA.bookmarkRevisionContent_x = makeTable();",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634'};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'777',revision:'baseline'};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',provinces:makeRows()};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',provinces:[{name:'Lost label'}]};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',layouts:{a:[{name:'Lost site'}]}};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',religions:{a:{name:'Wrong owner'}}};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',aristocraticProfiles:{a:{interests:[{name:'Lost interest'}]}}};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',provinces:[{id:'a',name:'Part' + ' two'}]};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',revision:'changed'};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',provinces:[{id:'a',name:17}]};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline',governmentForms:{a:{selectionProfile:{members:[{name:'Missing identity'}]}}}};",
            "FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline'}; FBDATA.bookmarkRevisionContent_x = {bookmarkId:'634',revision:'baseline'};",
        ]
        for source in invalid:
            with self.subTest(source=source), self.assertRaises(ValueError):
                self.extract_sources({'bookmark_634_region_b01.js': source})

    def test_existing_634_companion_owners_remain_reachable(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_ruler_agendas(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        keys = [
            'religion.early_islam_634.name.default',
            'religion.zoroastrian_sasanian_634.name.default',
            'religion.zoroastrian_sasanian_634.words.cleric.default',
            'religion.zoroastrian_sasanian_634.roles.priestM.default',
            'religion.west_syriac_lay_634.name.default',
            'rulerAgenda.umar_agenda_634.title',
            'rulerAgenda.heraclius_agenda_634.title',
            'openingProfile.opening_damascus_634.title',
            'openingProfile.opening_ctesiphon_634.title',
            'realm.634.baseline.rashidun_634.name.default',
            'governmentSelection.medinan_selection_pf_634.member.medinan_assent.name.default',
        ]
        for identity in ('umar', 'heraclius', 'farmer', 'craftsman'):
            keys.append('scenario.' + identity + '_634.name.default')
        for place in ('damascus', 'ctesiphon', 'medina', 'frontier'):
            keys.append('scenario.' + place + '_household_634.name.default')
            keys.append('householdStory.' + place + '_household_track_634.title')
        for key in keys:
            self.assertIn(key, inventory.entries)
            self.assertIn(i18n_catalog.source_key(inventory.entries[key]['text']), inventory.entries)

    def test_conflicting_stable_owner_is_not_silently_replaced(self):
        def source(name):
            return 'FBDATA.bookmarkRevisionContent_x = ' + json.dumps({
                'bookmarkId': '634', 'revision': 'baseline',
                'provinces': [{'id': 'same', 'name': name}],
            }) + ';'
        with self.assertRaisesRegex(ValueError, 'colliding source key'):
            self.extract_sources({'bookmark_634_region_b01.js': source('First label'),
                                  'bookmark_634_region_b02.js': source('Different label')})


if __name__ == '__main__':
    unittest.main()
