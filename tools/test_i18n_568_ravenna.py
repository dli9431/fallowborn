import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class RavennaOpeningExtractionTests(unittest.TestCase):
    def test_dated_profile_names_goals_and_contacts_are_read_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'story_households_example.js').write_text(
                "FBDATA.openingProfiles_example = {example:{title:'A local plan',"
                "intro:'An optional beginning',goals:[{id:'work',name:'Earn a living',"
                "text:'Complete ordinary work',criterion:{kind:'hold',reason:'No payer yet'}}],"
                "contacts:[{id:'neighbor',label:'A neighbor',text:'An ordinary contact',"
                "person:{source:'realm_ruler',realmId:'untranslated_court'}}]}};"
                "throw new Error('Never execute story declarations');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_opening_goals(inventory)
            for field, value in (
                ('title', 'A local plan'), ('intro', 'An optional beginning'),
                ('goal.work.name', 'Earn a living'), ('goal.work.text', 'Complete ordinary work'),
                ('goal.work.reason', 'No payer yet'), ('contact.neighbor.label', 'A neighbor'),
                ('contact.neighbor.text', 'An ordinary contact'),
            ):
                self.assertEqual(inventory.entries['openingProfile.example.' + field]['text'], value)
                self.assertIn(i18n_catalog.source_key(value), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('untranslated_court'), inventory.entries)

    def test_ravenna_scenario_household_goals_and_travel_keep_static_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        for key, value in (
            ('scenario.ravenna_household_568.name.default', 'Ravenna Artisan Household'),
            ('householdStory.ravenna_household_track_568.title', 'A Living in Ravenna'),
            ('householdStory.ravenna_household_track_568.stage.departure.choice.go_alone.label', 'Go ahead alone to Bononia'),
            ('openingProfile.opening_ravenna_568.goal.craft_income.name', 'Earn five gold at the bench'),
            ('travelPurpose.ravenna_visit_568.name.default', 'Visit Bononia'),
        ):
            self.assertEqual(inventory.entries[key]['text'], value)
            self.assertIn(i18n_catalog.source_key(value), inventory.entries)


if __name__ == '__main__':
    unittest.main()
