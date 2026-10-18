import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RefugeExtractionTests(unittest.TestCase):
    def test_independent_literal_sources_have_owners_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for suffix, filename, title in (
                ('river', 'story_river_house.js', 'A river shelter'),
                ('hill', 'story_hill_hall.js', 'A hill shelter'),
            ):
                (data / filename).write_text(
                    "FBDATA.householdRefuges_" + suffix + " = {" + suffix + ":{"
                    "title:'" + title + "',intro:'Review finite places',"
                    "provider:{institutionId:'untranslated_institution'}}};"
                    "throw new Error('Never execute source during extraction');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_household_refuges(inventory)
            for suffix, title in (('river', 'A river shelter'), ('hill', 'A hill shelter')):
                self.assertEqual(inventory.entries['householdRefuge.' + suffix + '.title']['text'], title)
                self.assertIn(i18n_catalog.source_key(title), inventory.entries)
                self.assertEqual(inventory.entries['householdRefuge.' + suffix + '.intro']['text'], 'Review finite places')
            self.assertNotIn(i18n_catalog.source_key('untranslated_institution'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
