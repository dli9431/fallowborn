import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class StoryTableExtractionTests(unittest.TestCase):
    def test_ruler_agendas_keep_base_and_filename_independent_nested_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for filename, table, story_id in (
                ('story_ruler_agendas.js', 'rulerAgendas', 'base_agenda'),
                ('story_harbor.js', 'rulerAgendas_harbor', 'harbor_agenda'),
                ('story_upland_courts.js', 'rulerAgendas_inland', 'upland_agenda'),
            ):
                (data / filename).write_text(
                    "FBDATA." + table + " = {" + story_id + ":{"
                    "title:'Court review',intro:'Choose ordinary priorities',stages:[{id:'court',"
                    "name:'The court',text:'Review present obligations',choices:[{id:'retain',"
                    "label:'Keep arrangements',detail:'Spend no funds'}]}]}};"
                    "throw new Error('Static extraction must never execute story data');",
                    encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_ruler_agendas(inventory)
            for story_id, filename in (
                ('base_agenda', 'story_ruler_agendas.js'),
                ('harbor_agenda', 'story_harbor.js'),
                ('upland_agenda', 'story_upland_courts.js'),
            ):
                for field, text in (
                    ('title', 'Court review'), ('intro', 'Choose ordinary priorities'),
                    ('stage.court.name', 'The court'), ('stage.court.text', 'Review present obligations'),
                    ('stage.court.choice.retain.label', 'Keep arrangements'),
                    ('stage.court.choice.retain.detail', 'Spend no funds'),
                ):
                    key = 'rulerAgenda.' + story_id + '.' + field
                    self.assertEqual(inventory.entries[key]['text'], text)
                    self.assertIn('data/' + filename, inventory.meta[key]['location'])
                    self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('retain'), inventory.entries)

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
