import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RulerAgendaSourceTests(unittest.TestCase):
    def test_central_and_separate_sources_keep_owners_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            sources = [('story_ruler_agendas.js', 'rulerAgendas', 'harbor'),
                       ('story_upland.js', 'rulerAgendas_upland', 'upland')]
            for filename, table, story in sources:
                (data / filename).write_text(
                    'FBDATA.' + table + ' = {' + story + ':{'
                    "title:'" + story + " program',intro:'Review current obligations',"
                    "stages:[{id:'accounts',name:'Accounts',text:'Review {money:5}',"
                    "choices:[{id:'retain',label:'Retain arrangements',"
                    "detail:'Record a priority',operation:'agenda_priority'}]}]}};\n"
                    "throw new Error('This source must never execute');\n",
                    encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_ruler_agendas(inventory)
            for filename, _, story in sources:
                owner = 'rulerAgenda.' + story
                self.assertEqual(inventory.entries[owner + '.title']['text'], story + ' program')
                self.assertEqual(inventory.entries[owner + '.stage.accounts.text']['text'], 'Review {money:5}')
                self.assertEqual(inventory.entries[owner + '.stage.accounts.choice.retain.detail']['text'], 'Record a priority')
                self.assertIn(filename, inventory.meta[owner + '.title']['location'])
                self.assertIn(i18n_catalog.source_key(story + ' program'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
