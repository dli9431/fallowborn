import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class LocalThreatExtractionTests(unittest.TestCase):
    def test_independent_source_tables_have_choice_owners_and_english_aliases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, suffix, title in (
                ('story_river_visits.js', 'river', 'At the river gate'),
                ('story_hill_council.js', 'hill', 'At the common well'),
            ):
                (data / filename).write_text(
                    "FBDATA.localThreats_" + suffix + " = {" + suffix + ":{"
                    "title:'" + title + "',intro:'A finite opportunity',actor:{kind:'resident',"
                    "characterId:'untranslated_actor'},choices:[{id:'withdraw',label:'Withdraw here',"
                    "detail:'Costs no money or action days'}]}};"
                    "throw new Error('Extraction must not execute this source');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_local_threats(inventory)
            for suffix, title in (('river', 'At the river gate'), ('hill', 'At the common well')):
                for field, value in (
                    ('title', title), ('intro', 'A finite opportunity'),
                    ('choice.withdraw.label', 'Withdraw here'),
                    ('choice.withdraw.detail', 'Costs no money or action days'),
                ):
                    self.assertEqual(inventory.entries['localThreat.' + suffix + '.' + field]['text'], value)
                    self.assertIn(i18n_catalog.source_key(value), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('untranslated_actor'), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('resident'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
