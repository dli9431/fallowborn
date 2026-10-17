import unittest

import i18n_catalog


class HungarianHouseholdExtractionTests(unittest.TestCase):
    def test_household_scenario_story_goals_and_journey_have_source_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        for key, text, source in (
            ('scenario.hungarian_village_household_1241.name.default',
             'A Farm in the Royal Heartland', 'data/starts_1241.js'),
            ('householdStory.hungarian_village_track_1241.title',
             'Fields and Uncertain Roads', 'data/story_households_1241.js'),
            ('householdStory.hungarian_village_track_1241.stage.stores.choice.buy_supplies.detail',
             'Spend {money:3} from the private purse on household supplies.', 'data/story_households_1241.js'),
            ('openingProfile.opening_hungarian_village_1241.goal.farm_income.name',
             'Earn five gold from farming', 'data/story_households_1241.js'),
            ('travelPurpose.hungarian_visit_1241.name.default',
             'Visit another Hungarian county', 'data/travel.js'),
            ('event.hungarian_visit_arrival_1241.title.default',
             'A Visitor in Bratislava', 'data/events_travel.js'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(source, inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
