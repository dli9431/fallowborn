import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class ProductionSupplementTests(unittest.TestCase):
    def extract(self, sources):
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory) / 'data'
            data.mkdir()
            (data / 'production.js').write_text(
                "FBDATA.productionGoods={retained:{name:'Retained'}};FBDATA.productionRecipes={};",
                encoding='utf-8')
            for name, source in sources.items():
                (data / name).write_text(source, encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_production_supplements(inventory)
            return inventory

    def test_independent_maps_keep_owners_variants_fallback_and_aliases(self):
        inv = self.extract({
            'production_coast.js': "FBDATA.productionGoods_coast={catch:{name:'Local catch',desc:'Finite catch'}};"
            "FBDATA.productionRecipes_coast={dry:{name:'Dry catch',fallback:'Keep fresh',desc:'Prepare {quantity}'}};"
            "throw new Error('Never execute this file');",
            'production_hill.js': "FBDATA.productionGoods_hill={fruit:{name:{default:'Fruit',muslim:'Orchard fruit'}}};"
        })
        for key, text in (
                ('productionGood.catch.name.default', 'Local catch'),
                ('productionGood.fruit.name.muslim', 'Orchard fruit'),
                ('productionRecipe.dry.fallback.default', 'Keep fresh'),
                ('productionRecipe.dry.desc.default', 'Prepare {quantity}')):
            self.assertEqual(inv.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inv.entries)
        self.assertNotIn(i18n_catalog.source_key('Never execute this file'), inv.entries)

    def test_duplicate_legacy_and_supplement_owners_reject(self):
        for name in ('retained', 'new_good'):
            sources = {'production_a.js': "FBDATA.productionGoods_a={new_good:{name:'New'}};",
                       'production_b.js': "FBDATA.productionGoods_b={" + name + ":{name:'Other'}};"}
            with self.assertRaises(ValueError):
                self.extract(sources)

    def test_nonliteral_and_duplicate_fields_reject(self):
        for source in ("{x:{name:chooseName()}}", "{x:{name:'A',name:'B'}}", "makeGoods()"):
            with self.assertRaises(ValueError):
                self.extract({'production_bad.js': 'FBDATA.productionGoods_bad=' + source + ';'})
