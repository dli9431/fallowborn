import unittest

import i18n_catalog


class WaterworksExtractionTests(unittest.TestCase):
    def test_six_waterworks_keep_structured_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for namespace, filename, table in (
            ('tech', 'technology_waterworks.js', 'tech_waterworks'),
            ('building', 'buildings_waterworks.js', 'buildings_waterworks'),
        ):
            records = dict(i18n_catalog.catalogue_literal_maps(
                i18n_catalog.DATA / filename, namespace))[table].value
            self.assertEqual(len(records), 3)
            for identifier, record in records.items():
                for field in ('name', 'desc'):
                    value = record.value[field].value
                    key = f'{namespace}.{identifier}.{field}.default'
                    self.assertEqual(inventory.entries[key], {'text': value})
                    self.assertEqual(inventory.meta[key]['location'], 'data/' + filename)
                    self.assertIn(i18n_catalog.source_key(value), inventory.entries)


if __name__ == '__main__':
    unittest.main()
