import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class SiegeSupportExtractionTests(unittest.TestCase):
    def test_names_and_descriptions_are_read_without_executing_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'siege_support.js').write_text(
                "FBDATA.siegeSupportProfiles = {light:{name:'Cordage frames',"
                "desc:'Finite paid rope'},heavy:{name:'Timber frames',"
                "desc:'Finite paid timber'}};throw new Error('Do not execute');",
                encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            original = i18n_catalog.find_assignment

            def source(path, owner, prop):
                if owner == 'FBDATA' and prop == 'siegeSupportProfiles':
                    return original(data / 'siege_support.js', owner, prop)
                return original(path, owner, prop)

            with patch.object(i18n_catalog, 'find_assignment', side_effect=source):
                i18n_catalog.extract_structured(inventory)
            for key, value in [('light.name', 'Cordage frames'), ('light.desc', 'Finite paid rope'),
                               ('heavy.name', 'Timber frames'), ('heavy.desc', 'Finite paid timber')]:
                owner = 'siegeSupportProfile.' + key + '.default'
                self.assertEqual(inventory.entries[owner]['text'], value)
                self.assertIn(i18n_catalog.source_key(value), inventory.entries)
            self.assertNotIn('siegeSupportProfile.light.recipeId.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
