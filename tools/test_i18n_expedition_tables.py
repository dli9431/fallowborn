import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class ExpeditionTableExtractionTests(unittest.TestCase):
    def test_independent_sources_keep_display_aliases_and_ignore_operations(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            for suffix, fields in (
                ('harbor', "title:'Prepare at the quay',intro:'Buy finite provisions'"),
                ('upland', "name:'Review an assurance',desc:'Acknowledge recorded context'"),
            ):
                (data / ('story_' + suffix + '.js')).write_text(
                    'FBDATA.storyExpeditions_' + suffix + '={' + suffix + ':{' + fields +
                    ",type:'expedition_preparation',realmId:'private_protocol',termDays:40}};"
                    "throw new Error('Never execute extraction input');", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_expedition_stories(inventory)
            for story, field, text in (
                ('harbor', 'title', 'Prepare at the quay'),
                ('harbor', 'intro', 'Buy finite provisions'),
                ('upland', 'name', 'Review an assurance'),
                ('upland', 'desc', 'Acknowledge recorded context'),
            ):
                key = 'expeditionStory.' + story + '.' + field
                self.assertEqual(inventory.entries[key]['text'], text)
                self.assertIn('data/story_' + story + '.js', inventory.meta[key]['location'])
                self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('private_protocol'), inventory.entries)
            self.assertNotIn(i18n_catalog.source_key('expedition_preparation'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
