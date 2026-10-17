import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class StoryTableExtractionTests(unittest.TestCase):
    def test_filename_independent_tables_keep_nested_owners_and_aliases(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, suffix, title in (
                ('story_households_valley.js', 'valley', 'Valley household'),
                ('story_coastal_life.js', 'coast', 'Coastal household'),
            ):
                (data / filename).write_text(
                    "FBDATA.householdTracks_" + suffix + " = {" + suffix + ":{"
                    "title:'" + title + "',intro:'An ordinary life',stages:{work:{"
                    "name:'At work',text:'Earn through ordinary work',choices:[{id:'wait',"
                    "label:'Wait here',detail:'Keep existing funds'}]}}}};"
                    "FBDATA.openingProfiles_" + suffix + " = {goals_" + suffix + ":{"
                    "title:'Opening goals',intro:'Optional plans',goals:[{id:'reserve',"
                    "name:'Keep savings',text:'Retain a private reserve',criterion:{kind:'hold',"
                    "reason:'An unavailable operation'}}],contacts:[{id:'neighbor',"
                    "label:'A neighbor',text:'Ordinary access'}]}};"
                    "throw new Error('Static extraction must never execute story data');",
                    encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_household_stories(inventory)
                i18n_catalog.extract_opening_goals(inventory)
            for suffix, title in (('valley', 'Valley household'), ('coast', 'Coastal household')):
                for key, text in (
                    ('householdStory.' + suffix + '.title', title),
                    ('householdStory.' + suffix + '.stage.work.choice.wait.detail', 'Keep existing funds'),
                    ('openingProfile.goals_' + suffix + '.goal.reserve.name', 'Keep savings'),
                    ('openingProfile.goals_' + suffix + '.goal.reserve.reason', 'An unavailable operation'),
                    ('openingProfile.goals_' + suffix + '.contact.neighbor.text', 'Ordinary access'),
                ):
                    self.assertEqual(inventory.entries[key]['text'], text)
                    self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('reserve'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
