import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RulerTableExtractionTests(unittest.TestCase):
    def test_legacy_and_separate_tables_share_stable_nested_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, table, story in (
                ('story_ruler_agendas.js', 'rulerAgendas', 'legacy'),
                ('story_river_court.js', 'rulerAgendas_river', 'river'),
                ('story_hill_court.js', 'rulerAgendas_hill', 'hill'),
            ):
                (data / filename).write_text(
                    'FBDATA.' + table + ' = {' + story + ':{'
                    "title:'Court review',intro:'An optional program',stages:[{id:'home',"
                    "name:'Home affairs',text:'Review present duties',choices:[{id:'stay',"
                    "label:'Stay at home',detail:'Record a priority',operation:'agenda_priority'}]}]}};"
                    "throw new Error('Extraction must not execute data');",
                    encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_ruler_agendas(inventory)
            for story in ('legacy', 'river', 'hill'):
                for field, text in (
                    ('title', 'Court review'),
                    ('intro', 'An optional program'),
                    ('stage.home.name', 'Home affairs'),
                    ('stage.home.text', 'Review present duties'),
                    ('stage.home.choice.stay.label', 'Stay at home'),
                    ('stage.home.choice.stay.detail', 'Record a priority'),
                ):
                    self.assertEqual(inventory.entries['rulerAgenda.' + story + '.' + field]['text'], text)
                    self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('agenda_priority'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
