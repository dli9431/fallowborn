import unittest

import i18n_catalog


class BoathouseExtractionTests(unittest.TestCase):
    def test_bundled_building_material_recipe_and_invoice_labels_have_static_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        sources = (
            ('building.boathouse', 'Boathouse', 'data/buildings_boathouses.js'),
            ('productionGood.boathouse_timber', 'Boat-work timber', 'data/production.js'),
            ('productionGood.boathouse_cordage', 'Boat-work cordage', 'data/production.js'),
            ('productionGood.boathouse_work', 'Prepared boat work', 'data/production.js'),
            ('productionRecipe.prepare_boathouse_work', 'Prepare boat timber and cordage', 'data/production.js'),
            ('maritimeWorkProfile.boathouse_work', 'Maintained boathouse work', 'data/maritime_work.js'),
        )
        for prefix, name, source in sources:
            self.assertEqual(inventory.entries[prefix + '.name.default'], {'text': name})
            self.assertIn(prefix + '.desc.default', inventory.entries)
            self.assertEqual(inventory.meta[prefix + '.name.default']['location'], source)
            self.assertIn(i18n_catalog.source_key(name), inventory.entries)
        self.assertNotIn('maritimeWorkProfile.boathouse_work.invoiceShare.default', inventory.entries)
        self.assertNotIn('productionGood.boathouse_work.unit.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
