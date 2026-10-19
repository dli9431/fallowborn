import unittest

import i18n_catalog


class ValenciaExtractionTests(unittest.TestCase):
    def test_scenario_agenda_goals_and_family_links_keep_their_source_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_ruler_agendas(inventory)
        i18n_catalog.extract_opening_goals(inventory)
        for key, text, source in (
            ('scenario.rodrigo_diaz_1096.name.default', 'Rodrigo Diaz in Valencia', 'data/starts_valencia_1096.js'),
            ('scenario.rodrigo_diaz_1096.familyPresets.standard.name.default', 'The Valencian household', 'data/starts_valencia_1096.js'),
            ('rulerAgenda.valencia_agenda_1096.title', 'Valencia: Household and Lordship', 'data/story_valencia_1096.js'),
            ('rulerAgenda.valencia_agenda_1096.stage.city.choice.city_retain.label', 'Keep present priorities', 'data/story_valencia_1096.js'),
            ('rulerAgenda.valencia_agenda_1096.stage.continuing.name', 'A continuing lordship', 'data/story_valencia_1096.js'),
            ('openingProfile.valencia_opening_profile_1096.goal.paid_defense.name', 'Pay for a field force', 'data/story_valencia_1096.js'),
            ('openingProfile.valencia_opening_profile_1096.contact.jimena.text', 'Your existing spouse. Ordinary family interactions keep their current conditions.', 'data/story_valencia_1096.js'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(source, inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


if __name__ == '__main__':
    unittest.main()
