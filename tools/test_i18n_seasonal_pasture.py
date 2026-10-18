import unittest

import i18n_catalog


class SeasonalPastureDisplayTests(unittest.TestCase):
    def test_shieling_and_materials_use_existing_display_owners(self):
        inv = i18n_catalog.Inventory()
        i18n_catalog.extract_catalogue_displays(inv, 'building')
        i18n_catalog.extract_production_supplements(inv)
        for key, text, source in (
                ('building.shieling.name.default', 'Seasonal Pasture Outpost', 'buildings_seasonal_pasture.js'),
                ('productionGood.parent_farm_allocation.name.default', 'Allocated farm output', 'production_seasonal_pasture.js'),
                ('productionGood.pasture_provisions.name.default', 'Pasture provisions', 'production_seasonal_pasture.js'),
                ('productionRecipe.prepare_pasture_allocation.name.default', 'Prepare allocated pasture output', 'production_seasonal_pasture.js')):
            self.assertEqual(inv.entries[key]['text'], text)
            self.assertEqual(inv.meta[key]['location'], 'data/' + source)
            self.assertIn(i18n_catalog.source_key(text), inv.entries)
