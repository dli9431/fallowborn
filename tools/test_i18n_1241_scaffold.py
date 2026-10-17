import unittest

import i18n_catalog


class Spring1241ScaffoldLabels(unittest.TestCase):
    def test_all_six_regions_have_date_scoped_labels_and_source_aliases(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_scaffold_regions(inventory)
        expected = (
            ('realm.1241.hungary_1241.name.default', 'Hungarian crown'),
            ('realm.1241.vladimir_1241.name.default', 'Vladimir principality'),
            ('realm.1241.steppe_local_1241.name.default', 'Steppe local households'),
            ('realm.1241.england_1241.name.default', 'Kingdom of England'),
            ('realm.1241.france_1241.name.default', 'Kingdom of France'),
            ('realm.1241.toulouse_1241.name.default', 'County of Toulouse'),
            ('province.1241.paris.name.default', 'Paris'),
            ('province.1241.upper_kama.name.default', 'Upper Kama communities'),
            ('kingdom.1241.pannonia.name.default', 'Hungary'),
            ('settlement.1241.paris.name.default', 'Paris'),
        )
        for key, text in expected:
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1241_scaffold_a.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        for name in ('Bela IV', 'Henry III', 'Louis IX'):
            self.assertNotIn(i18n_catalog.source_key(name), inventory.entries)


if __name__ == '__main__':
    unittest.main()
