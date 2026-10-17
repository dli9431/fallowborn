import unittest

import i18n_catalog


class PilgrimOpeningExtractionTests(unittest.TestCase):
    def test_scenario_graph_goals_and_contacts_have_existing_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        for key, text in (
            ('scenario.pilgrim_household_1096.name.default', 'Cologne Pilgrim Household'),
            ('householdStory.pilgrim_household_track_1096.title', 'A Household and a Pilgrimage'),
            ('householdStory.pilgrim_household_track_1096.stage.departure.choice.go_alone.label', 'Review a solo pilgrimage to Jerusalem'),
            ('householdStory.pilgrim_household_track_1096.stage.returned.name', 'Actually home again'),
            ('openingProfile.opening_pilgrim_1096.goal.craft_income.name', 'Earn ten gold at the bench'),
            ('openingProfile.opening_pilgrim_1096.contact.imperial_ruler.label', 'The opening imperial ruler'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('pilgrim_jerusalem_christian'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
