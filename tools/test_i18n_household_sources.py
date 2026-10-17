import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class HouseholdPresentationSourceTests(unittest.TestCase):
    def test_local_story_files_and_existing_household_files_keep_display_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, suffix in [('story_households_coast.js', 'coast'),
                                     ('story_valley.js', 'valley')]:
                (data / filename).write_text(
                    'FBDATA.householdTracks_' + suffix + ' = {' + suffix + '_track:{'
                    "id:'" + suffix + "_track',title:'" + suffix + " story',intro:'A local choice',"
                    "stages:{home:{name:'Household plans',text:'Choose a livelihood',choices:["
                    "{id:'stay',label:'Stay here',detail:'Keep the present home'}]}}}};\n"
                    'FBDATA.openingProfiles_' + suffix + ' = {' + suffix + '_goals:{'
                    "title:'" + suffix + " goals',goals:[{id:'income',name:'Earn a living',"
                    "text:'Earn {money:5}',criterion:{kind:'earnings',amount:5}}],contacts:[]}};\n"
                    "throw new Error('Static extraction must not execute declarations');\n",
                    encoding='utf-8')
            (data / 'story_unrelated.js').write_text(
                "FBDATA.otherTracks = {unrelated:{title:'Unrelated label'}};", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_household_stories(inventory)
                i18n_catalog.extract_opening_goals(inventory)
            for suffix, filename in [('coast', 'story_households_coast.js'),
                                     ('valley', 'story_valley.js')]:
                self.assertEqual(inventory.entries['householdStory.' + suffix + '_track.title']['text'], suffix + ' story')
                self.assertEqual(inventory.entries['householdStory.' + suffix + '_track.stage.home.choice.stay.label']['text'], 'Stay here')
                self.assertEqual(inventory.entries['openingProfile.' + suffix + '_goals.goal.income.text']['text'], 'Earn {money:5}')
                self.assertIn(filename, inventory.meta['householdStory.' + suffix + '_track.title']['location'])
                self.assertIn(i18n_catalog.source_key(suffix + ' story'), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('Unrelated label'), inventory.entries)

    def test_novgorod_sources_include_scenario_graph_and_optional_goals(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_household_stories(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        expected = {
            'scenario.novgorod_household_1241.name.default': 'Novgorod artisan household',
            'householdStory.novgorod_household_track_1241.title': 'A living in Novgorod',
            'householdStory.novgorod_household_track_1241.stage.customers.choice.work_bench.label': 'Work the bench',
            'openingProfile.opening_novgorod_1241.goal.craft_income.text': 'Earn {money:5} through actual ordinary craft work after the opening.',
        }
        for key, text in expected.items():
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
