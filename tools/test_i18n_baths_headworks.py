import unittest

import i18n_catalog


class BathsHeadworksExtractionTests(unittest.TestCase):
    def test_catalogue_and_fuel_keep_existing_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for namespace, filename, table in (
            ('tech', 'technology_baths_headworks.js', 'tech_baths_headworks'),
            ('building', 'buildings_baths_headworks.js', 'buildings_baths_headworks'),
        ):
            records = dict(i18n_catalog.catalogue_literal_maps(
                i18n_catalog.DATA / filename, namespace))[table].value
            self.assertEqual(len(records), 2)
            for identifier, record in records.items():
                for field in ('name', 'desc'):
                    value = record.value[field].value
                    key = f'{namespace}.{identifier}.{field}.default'
                    self.assertEqual(inventory.entries[key], {'text': value})
                    self.assertEqual(inventory.meta[key]['location'], 'data/' + filename)
        for key, text in (
            ('buildingProfile.hypocaust_bath.name.default', 'Heated Public Bath'),
            ('productionGood.heating_fuel.name.default', 'Prepared heating fuel'),
        ):
            self.assertEqual(inventory.entries[key], {'text': text})
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn('building.heated_bath.name.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
