import unittest

import i18n_catalog


class WindCatalogueExtractionTests(unittest.TestCase):
    def test_final_wind_displays_keep_existing_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for namespace, filename, table, name in (
            ('tech', 'technology_wind.js', 'techCorrections_wind', 'Wind-Powered Milling'),
            ('building', 'buildings_wind.js', 'buildingCorrections_wind', 'Post Windmill'),
        ):
            declarations = dict(i18n_catalog.catalogue_literal_maps(
                i18n_catalog.DATA / filename, namespace))
            definitions = declarations[table].value
            self.assertEqual(set(definitions), {'windmill'})
            self.assertEqual(definitions['windmill'].value['name'].value, name)
            for field in ('name', 'desc'):
                text = definitions['windmill'].value[field].value
                key = namespace + '.windmill.' + field + '.default'
                self.assertEqual(inventory.entries[key], {'text': text})
                self.assertEqual(inventory.meta[key]['location'], 'data/' + filename)
                self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
