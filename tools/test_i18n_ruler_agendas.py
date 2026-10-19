import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RulerAgendaSourcesTests(unittest.TestCase):
    def test_base_and_independent_dated_tables_are_extracted_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'story_ruler_agendas.js').write_text(
                "FBDATA.rulerAgendas = {base:{title:'Base court',stages:[]}};",
                encoding='utf-8')
            for suffix, label in [('river', 'River'), ('upland', 'Upland')]:
                (data / ('story_' + suffix + '.js')).write_text(
                    "FBDATA.rulerAgendas_" + suffix + " = {" + suffix + ":{"
                    "title:'" + label + " court',intro:'A local review',"
                    "stages:[{id:'resources',name:'Resources',text:'Review present funds',"
                    "choices:[{id:'keep',label:'Keep arrangements',detail:'No receipt'}]}]}};"
                    "throw new Error('Never execute a composer');", encoding='utf-8')
            (data / 'story_other.js').write_text(
                "FBDATA.unrelated = {ignored:{title:'Unrelated'}};", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_ruler_agendas(inventory)
            self.assertEqual(inventory.entries['rulerAgenda.base.title.default']['text'], 'Base court')
            for suffix, label in [('river', 'River'), ('upland', 'Upland')]:
                prefix = 'rulerAgenda.' + suffix + '.'
                self.assertEqual(inventory.entries[prefix + 'title.default']['text'], label + ' court')
                self.assertEqual(inventory.entries[prefix + 'stage.resources.text.default']['text'], 'Review present funds')
                self.assertEqual(inventory.entries[prefix + 'stage.resources.choice.keep.detail.default']['text'], 'No receipt')
                self.assertIn(i18n_catalog.source_key(label + ' court'), inventory.entries)
            self.assertFalse(any('ignored' in key for key in inventory.entries))
