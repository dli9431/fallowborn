import unittest

import i18n_catalog


class TuscanyDisplayExtractionTests(unittest.TestCase):
    def test_start_agenda_goals_and_contacts_have_static_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_ruler_agendas(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        for key, text in (
            ('scenario.matilda_1096.name.default', 'Matilda of Canossa'),
            ('rulerAgenda.matilda_agenda_1096.title', 'Matilda: estates and allegiances'),
            ('rulerAgenda.matilda_agenda_1096.stage.matilda_boundaries.name', 'Boundaries and obligations'),
            ('rulerAgenda.matilda_agenda_1096.stage.matilda_continuation.choice.matilda_finish_review.label', 'Conclude the opening review'),
            ('openingProfile.opening_matilda_1096.goal.local_obligations.name', 'Review local obligations'),
            ('openingProfile.opening_matilda_1096.contact.papal_court.label', 'The opening papal ruler'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('canossa_1096'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
