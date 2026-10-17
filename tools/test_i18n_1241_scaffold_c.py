import unittest

import i18n_catalog


class Spring1241QuadrantCLabels(unittest.TestCase):
    def test_all_eight_blocks_have_date_scoped_labels_and_source_aliases(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_scaffold_regions(inventory)
        expected = (
            ('realm.1241.hre_1241.name.default', 'Imperial and Sicilian crown court'),
            ('realm.1241.norway_1241.name.default', 'Kingdom of Norway'),
            ('realm.1241.prussian_local_1241.name.default', 'Prussian local communities'),
            ('realm.1241.bosnia_1241.name.default', 'Bosnian banate'),
            ('realm.1241.nicaea_1241.name.default', 'Empire of Nicaea'),
            ('realm.1241.rum_1241.name.default', 'Sultanate of Rum'),
            ('realm.1241.jazira_local_1241.name.default', 'Jaziran local court'),
            ('realm.1241.egypt_1241.name.default', 'Egyptian Ayyubid sultanate'),
            ('province.1241.palmyra_district.name.default', 'Tadmur'),
            ('province.1241.torne_district.name.default', 'Northern Gulf river communities'),
            ('settlement.1241.siwa_oasis_inhabited_1204.name.default', 'Shali'),
            ('kingdom.1241.east_francia.name.default', 'Germany'),
        )
        for key, text in expected:
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1241_scaffold_c.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        for name in ('Frederick II', 'Hakon IV Hakonsson', 'Baldwin II', 'John III Vatatzes'):
            self.assertNotIn(i18n_catalog.source_key(name), inventory.entries)


if __name__ == '__main__':
    unittest.main()
