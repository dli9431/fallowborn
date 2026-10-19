import unittest

import i18n_catalog


class AlexanderPresentationTests(unittest.TestCase):
    def test_personal_opening_uses_existing_static_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        i18n_catalog.extract_bookmark_revision_content(inventory)
        for owner, text in (
            ('scenario.alexander_1241.name.default', 'Alexander at Pereslavl'),
            ('householdStory.alexander_household_1241.title', 'Alexander: a northern request'),
            ('householdStory.alexander_household_1241.stage.request.name', 'Novgorod asks for Alexander'),
            ('householdStory.alexander_household_1241.stage.road.choice.go_north.label', 'Go ahead alone to Novgorod'),
            ('householdStory.alexander_household_1241.stage.expired.name', 'The reply window closed'),
            ('openingProfile.opening_alexander_1241.contact.mother.label', 'Feodosia'),
            ('openingProfile.opening_alexander_1241.goal.family_review.name', 'Consider the existing family'),
            ('settlement.1241.alexander_v2.pereslavl_zalessky_1241.name.default', 'Pereslavl-Zalessky'),
            ('travelPurpose.alexander_visit_1241.name.default', 'Visit Novgorod'),
            ('event.alexander_visit_arrival_1241.title.default', 'A Personal Arrival in Novgorod'),
        ):
            self.assertEqual(inventory.entries[owner]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('pereslavl_zalessky_1241'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
