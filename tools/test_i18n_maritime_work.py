import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class MaritimeWorkExtractionTests(unittest.TestCase):
    def test_literal_profiles_have_static_owners_without_executing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'maritime_work.js'
            source.write_text(
                "FBDATA.maritimeWorkProfiles = {shore:{name:'Shore work',desc:'Paid materials.',invoiceShare:0.1},"
                "river:{name:'River work',desc:'A separate licensed slip.',termDays:14}};"
                "throw new Error('Never execute declarations');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            original = i18n_catalog.find_assignment

            def assignment(path, *args):
                return original(source if path == i18n_catalog.DATA / 'maritime_work.js' else path, *args)

            with patch.object(i18n_catalog, 'find_assignment', side_effect=assignment):
                i18n_catalog.extract_structured(inventory)
            self.assertEqual(inventory.entries['maritimeWorkProfile.shore.name.default'], {'text': 'Shore work'})
            self.assertEqual(inventory.entries['maritimeWorkProfile.river.desc.default'], {'text': 'A separate licensed slip.'})
            self.assertNotIn('maritimeWorkProfile.shore.invoiceShare.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
