import unittest

import i18n_catalog


class FrederickPresentationTests(unittest.TestCase):
    def test_start_agenda_profile_and_camp_use_existing_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_ruler_agendas(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        i18n_catalog.extract_bookmark_revision_content(inventory)
        for key, text in (
            ('scenario.frederick_1241.name.default', 'Frederick II outside Faenza'),
            ('rulerAgenda.frederick_agenda_1241.title', 'Frederick II: campaign and crowns'),
            ('rulerAgenda.frederick_agenda_1241.stage.fi_announcement.choice.fi_council.label', 'Consider the earlier announcement'),
            ('openingProfile.opening_frederick_1241.goal.campaign_account.name', 'Review the campaign account'),
            ('openingProfile.opening_frederick_1241.contact.gregory.label', 'The papal court'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertIn(i18n_catalog.source_key('Faenza-area encampment'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('faenza_camp_1241'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
