import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class SiteResourceExtractionTests(unittest.TestCase):
    def test_profile_names_and_descriptions_use_static_structured_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'site_resources.js').write_text(
                "FBDATA.siteResourceProfiles = {"
                "river_flow:{name:'River intake',desc:'A finite intake.',kind:'flow',unit:'water',capacity:12,periodDays:7},"
                "upland_tank:{name:'Hill tank',kind:'storage',unit:'water',capacity:8}};"
                "throw new Error('Extraction must not execute declarations');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            original = i18n_catalog.find_assignment

            def assignment(source, *args):
                if source == i18n_catalog.DATA / 'site_resources.js':
                    source = data / 'site_resources.js'
                return original(source, *args)

            with patch.object(i18n_catalog, 'find_assignment', side_effect=assignment):
                i18n_catalog.extract_structured(inventory)
            self.assertEqual(inventory.entries['siteResourceProfile.river_flow.name.default'], {'text': 'River intake'})
            self.assertEqual(inventory.entries['siteResourceProfile.river_flow.desc.default'], {'text': 'A finite intake.'})
            self.assertEqual(inventory.entries['siteResourceProfile.upland_tank.name.default'], {'text': 'Hill tank'})
            self.assertNotIn('siteResourceProfile.river_flow.capacity.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
