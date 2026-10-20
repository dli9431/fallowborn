import unittest

import i18n_catalog


class CoreStartPresentationTests(unittest.TestCase):
    def test_personal_story_and_rural_site_use_existing_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_bookmark_revision_content(inventory)
        for owner, text in (
            ('scenario.koten_1241.name.default', 'Koten under Guard'),
            ('householdStory.koten_safety_1241.title', 'Koten: personal choices under guard'),
            ('householdStory.koten_safety_1241.stage.hosting.name', 'The host’s actual authority'),
            ('householdStory.koten_safety_1241.stage.onward.choice.keep_options_open.label', 'Keep later options open'),
            ('householdStory.hungarian_village_track_1241.stage.hosted_people.name', 'Other households and public arrangements'),
            ('settlement.1241.core_starts_v2.royal_heartland_farm_1241.name.default', 'Heartland farmstead'),
        ):
            self.assertEqual(inventory.entries[owner]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('koten_following_1241'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
