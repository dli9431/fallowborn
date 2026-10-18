import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class ProductionExtractionTests(unittest.TestCase):
    def test_goods_recipes_and_fallback_have_static_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'production.js'
            source.write_text(
                "FBDATA.productionGoods = {fiber:{name:'Clean fiber',desc:'Two finite units.',unit:'rag_units',mass:1},"
                "iron:{name:'Iron bloom',unit:'iron_units',mass:1}};"
                "FBDATA.productionRecipes = {paper:{name:'Prepare paper',desc:'One finite paper lot.',workPrice:3},"
                "forge:{name:'Forge tools',fallback:'Ordinary hand work remains available.',workPrice:4}};"
                "throw new Error('Static extraction must not execute declarations');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            original = i18n_catalog.find_assignment

            def assignment(path, *args):
                return original(source if path == i18n_catalog.DATA / 'production.js' else path, *args)

            with patch.object(i18n_catalog, 'find_assignment', side_effect=assignment):
                i18n_catalog.extract_structured(inventory)
            expected = {
                'productionGood.fiber.name.default': 'Clean fiber',
                'productionGood.fiber.desc.default': 'Two finite units.',
                'productionGood.iron.name.default': 'Iron bloom',
                'productionRecipe.paper.name.default': 'Prepare paper',
                'productionRecipe.paper.desc.default': 'One finite paper lot.',
                'productionRecipe.forge.name.default': 'Forge tools',
                'productionRecipe.forge.fallback.default': 'Ordinary hand work remains available.',
            }
            for key, value in expected.items():
                self.assertEqual(inventory.entries[key], {'text': value})
            self.assertNotIn('productionRecipe.forge.workPrice.default', inventory.entries)
            self.assertNotIn('productionGood.iron.unit.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
