import unittest

import i18n_catalog


class RulerOpeningExtractionTests(unittest.TestCase):
    def test_dated_scenarios_agendas_goals_and_contacts_keep_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_ruler_agendas(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        expected = {
            'scenario.bela_1241.name.default': 'Bela IV at Obuda',
            'scenario.yaroslav_1241.name.default': 'Yaroslav at Vladimir',
            'rulerAgenda.bela_agenda_1241.title': 'Bela: court and preparation',
            'rulerAgenda.yaroslav_agenda_1241.stage.yaroslav_north.name': 'Novgorod and its choices',
            'rulerAgenda.bela_agenda_1241.stage.bela_accounts.choice.bela_keep_accounts.label': 'Retain present arrangements',
            'openingProfile.opening_bela_1241.goal.bela_accounts_goal.name': 'Choose an administrative priority',
            'openingProfile.opening_yaroslav_1241.contact.yaroslav_alexander.label': 'Alexander',
        }
        for owner, text in expected.items():
            self.assertEqual(inventory.entries[owner]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Maria Laskarina'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('geo_vladimir_473247'), inventory.entries)


if __name__ == '__main__':
    unittest.main()
