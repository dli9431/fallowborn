import tempfile
import unittest
from pathlib import Path

import i18n_catalog


class BuildingProfileExtractionTests(unittest.TestCase):
    def test_literal_root_and_supplement_are_static_profile_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            data = Path(directory)
            (data / 'building_profiles.js').write_text(
                "FBDATA.buildingProfiles = {river:{buildingId:'mill',name:'River works',desc:'One replacement.',replace:{cost:30}}};",
                encoding='utf-8')
            (data / 'building_profiles_hills.js').write_text(
                "FBDATA.buildingProfiles_hills = {hill:{buildingId:'mill',name:'Hill works',desc:'An independent variant.',requiresTech:['water_power']}};"
                "throw new Error('Never execute declarations');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            i18n_catalog.extract_building_profiles(inventory, data)
            self.assertEqual(inventory.entries['buildingProfile.river.name.default'], {'text': 'River works'})
            self.assertEqual(inventory.entries['buildingProfile.river.desc.default'], {'text': 'One replacement.'})
            self.assertEqual(inventory.entries['buildingProfile.hill.name.default'], {'text': 'Hill works'})
            self.assertEqual(inventory.entries['buildingProfile.hill.desc.default'], {'text': 'An independent variant.'})
            self.assertNotIn('buildingProfile.river.cost.default', inventory.entries)
            self.assertNotIn('buildingProfile.hill.requiresTech.default', inventory.entries)


if __name__ == '__main__':
    unittest.main()
