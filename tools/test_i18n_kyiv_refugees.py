"""Static localization for named household sources and the Kyiv opening."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class NamedHouseholdSourcesTests(unittest.TestCase):
    def test_named_and_conventional_sources_keep_their_display_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, suffix, title in (
                ('story_river_people.js', 'river_people', 'Life beside the river'),
                ('story_households_hill.js', 'hill', 'A place on the hill'),
            ):
                (data / filename).write_text(
                    'FBDATA.householdTracks_' + suffix + ' = {' + suffix + ":{title:'" + title +
                    "',intro:'Take stock.',stages:{home:{name:'Home',text:'Consider work.',choices:["
                    "{id:'stay',label:'Stay here',detail:'Keep the present home.'}]}}}};\n" +
                    'FBDATA.openingProfiles_' + suffix + ' = {opening_' + suffix +
                    ":{title:'First aims',goals:[{id:'earn',name:'Earn a living',text:'Work must actually pay.'}],contacts:[]}};\n" +
                    "throw new Error('Static extraction must not run this file');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_household_stories(inventory)
                i18n_catalog.extract_opening_goals(inventory)
            for suffix, title in [('river_people', 'Life beside the river'), ('hill', 'A place on the hill')]:
                self.assertEqual(inventory.entries['householdStory.' + suffix + '.title']['text'], title)
                self.assertEqual(inventory.entries['householdStory.' + suffix + '.stage.home.choice.stay.label']['text'], 'Stay here')
                self.assertEqual(inventory.entries['openingProfile.opening_' + suffix + '.goal.earn.text']['text'], 'Work must actually pay.')
                self.assertIn(i18n_catalog.source_key(title), inventory.entries)

    def test_shipped_kyiv_sources_have_scenario_story_and_goal_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        self.assertEqual(inventory.entries['scenario.kyiv_refugee_household_1241.name.default']['text'], 'Household from Kyiv')
        self.assertEqual(inventory.entries['householdStory.kyiv_refugee_track_1241.title']['text'], 'A Home after Kyiv')
        self.assertEqual(inventory.entries['householdStory.kyiv_refugee_track_1241.stage.departure.choice.go_alone.label']['text'], 'Go ahead alone to Lutsk')
        self.assertEqual(inventory.entries['openingProfile.opening_kyiv_refugees_1241.goal.home_decision.name']['text'], 'Choose a household home')


if __name__ == '__main__':
    unittest.main()
