import unittest

import i18n_catalog


class Spring1241EasternScaffoldLabels(unittest.TestCase):
    def test_nine_blocks_supply_scoped_display_labels_and_english_aliases(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_scaffold_regions(inventory)
        expected = (
            ('realm.1241.silesia_1241.name.default', 'Silesian ducal court'),
            ('realm.1241.pomerelia_local_1241.name.default', 'Gdańsk/Pomerelian ducal court'),
            ('realm.1241.georgia_1241.name.default', 'Georgian court'),
            ('realm.1241.rasulid_yemen_1241.name.default', 'Rasulid Yemen'),
            ('realm.1241.hafsid_1241.name.default', 'Hafsid Ifriqiya'),
            ('realm.1241.zayyanid_1241.name.default', 'Zayyanid Tlemcen'),
            ('realm.1241.makuria_1241.name.default', 'Makuria'),
            ('realm.1241.alodia_1241.name.default', 'Alodian court'),
            ('realm.1241.jenne_households_1241.name.default', 'Jenne-jeno households'),
            ('realm.1241.azerbaijan_local_1241.name.default', 'Azerbaijani local administration'),
            ('realm.1241.kerman_local_1241.name.default', 'Qutlugh-Khanid Kirman'),
            ('realm.1241.sistan_1241.name.default', 'Mihrabanid Sistan'),
            ('realm.1241.khwarazm_local_1241.name.default', 'Khwarazm local administration'),
            ('realm.1241.bamiyan_local_1241.name.default', 'Bamiyan local administration'),
            ('province.1241.garama.name.default', 'Garama'),
            ('settlement.1241.gurganj_district_inhabited_1204.name.default', 'Gurganj'),
        )
        for key, text in expected:
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1241_scaffold_d.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
