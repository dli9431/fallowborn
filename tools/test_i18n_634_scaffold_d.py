import unittest

import i18n_catalog


class Autumn634EasternScaffoldLabels(unittest.TestCase):
    def test_literal_labels_and_staged_selection_member_have_english_aliases(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_bookmark_revision_content(inventory)
        expected = (
            ('province.634.baseline.medina.name.default', 'Medina'),
            ('realm.634.baseline.rashidun_634.name.default', 'Medinan Caliphate'),
            ('realm.634.baseline.altava_634.name.default', 'Altava district communities'),
            ('settlement.634.baseline.medina_493.name.default', 'Medina'),
            ('settlement.634.baseline.baghdad_outer_476.name.default', 'Ctesiphon'),
            ('governmentSelection.medinan_selection_pf_634.member.medinan_assent.name.default',
             'Medinan assent'),
        )
        for key, text in expected:
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_634_scaffold_d.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
