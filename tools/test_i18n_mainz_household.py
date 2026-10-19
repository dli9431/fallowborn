import unittest

import i18n_catalog


class MainzHouseholdLabels(unittest.TestCase):
    def test_native_story_scenario_and_shelter_sources_are_reachable(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        i18n_catalog.extract_household_refuges(inventory)
        expected = {
            'scenario.mainz_jewish_household_1096.name.default': 'Mainz Jewish Craft Household',
            'householdStory.mainz_household_track_1096.title': 'A Household in Mainz',
            'householdStory.mainz_party_1096.title': 'The Mainz Household’s Named Party',
            'householdStory.mainz_household_track_1096.stage.protection_review.name': 'Protection has its own limits',
            'householdRefuge.mainz_refuge_1096.title': 'Temporary Refuge at Mainz',
            'settlement.1096.mainz_household_v1.mainz_refuge_1096.name.default': 'Archbishop’s residence',
        }
        for key, value in expected.items():
            self.assertEqual(inventory.entries[key]['text'], value)
            self.assertIn(i18n_catalog.source_key(value), inventory.entries)


if __name__ == '__main__':
    unittest.main()
