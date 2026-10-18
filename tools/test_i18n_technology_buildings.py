import unittest

import i18n_catalog


class ComposedCatalogueExtractionTests(unittest.TestCase):
    def test_all_supplements_keep_one_final_display_owner(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        sources = (
            ('tech', 'technology_early_refinements.js', 'tech_early_refinements', 2),
            ('tech', 'technology_foundations.js', 'techCorrections_foundations', 9),
            ('tech', 'technology_learning.js', 'techCorrections_learning', 6),
            ('tech', 'technology_civic_military.js', 'techCorrections_civic_military', 12),
            ('tech', 'technology_maritime.js', 'techCorrections_maritime', 8),
            ('tech', 'technology_wind.js', 'techCorrections_wind', 1),
            ('tech', 'technology_transmission.js', 'techCorrections_transmission', 1),
            ('building', 'buildings_learning_care.js', 'buildingCorrections_learning_care', 3),
            ('building', 'buildings_learning_care.js', 'buildings_learning_care', 1),
            ('building', 'buildings_civic_military.js', 'buildingCorrections_civic_military', 3),
            ('building', 'buildings_maritime.js', 'buildingCorrections_maritime', 1),
            ('building', 'buildings_wind.js', 'buildingCorrections_wind', 1),
        )
        seen = set()
        for namespace, filename, table, count in sources:
            maps = dict(i18n_catalog.catalogue_literal_maps(
                i18n_catalog.DATA / filename, namespace))
            records = maps[table].value
            self.assertEqual(len(records), count, table)
            for identifier, record in records.items():
                identity = (namespace, identifier)
                self.assertNotIn(identity, seen)
                seen.add(identity)
                for field in ('name', 'desc'):
                    literal = record.value[field]
                    branches = literal.value if isinstance(literal.value, dict) else {'default': literal}
                    for branch, value in branches.items():
                        key = f'{namespace}.{identifier}.{field}.{branch}'
                        self.assertEqual(inventory.entries[key], {'text': value.value}, key)
                        self.assertEqual(inventory.meta[key]['location'], 'data/' + filename, key)
                        self.assertIn(i18n_catalog.source_key(value.value), inventory.entries)
        self.assertEqual(len(seen), 48)
        for key, text in (
            ('tech.water_power.name.default', 'Water Power'),
            ('tech.translation_schools.name.default', 'Translation Networks'),
            ('tech.windmill.name.default', 'Wind-Powered Milling'),
            ('tech.paper_making.name.default', 'Papermaking'),
            ('building.library.name.default', 'Library'),
            ('building.hospice.name.default', 'Charitable Guesthouse'),
            ('building.arsenal.name.default', 'Naval Outfitting Yard'),
        ):
            self.assertEqual(inventory.entries[key], {'text': text})
        self.assertNotIn('building.library.name.muslim', inventory.entries)
        self.assertEqual(inventory.meta['enterprise.fishing_boat_business.name.default']['location'],
                         'data/economy.js')


if __name__ == '__main__':
    unittest.main()
