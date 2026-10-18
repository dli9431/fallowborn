import unittest

import i18n_catalog


class EarlyWorshipExtractionTests(unittest.TestCase):
    def test_one_building_and_two_profiles_keep_static_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for namespace, identifier in (
            ('building', 'monastic_house'),
            ('buildingProfile', 'episcopal_complex'),
            ('buildingProfile', 'congregational_mosque'),
        ):
            for field in ('name', 'desc'):
                key = f'{namespace}.{identifier}.{field}.default'
                self.assertIn(key, inventory.entries)
                self.assertEqual(inventory.meta[key]['location'],
                                 'data/buildings_early_worship.js')
                self.assertIn(i18n_catalog.source_key(inventory.entries[key]['text']),
                              inventory.entries)
        self.assertNotIn('building.episcopal_complex.name.default', inventory.entries)
        self.assertNotIn('building.congregational_mosque.name.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
