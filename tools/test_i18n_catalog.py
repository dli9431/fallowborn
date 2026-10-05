import unittest

import i18n_catalog


class StaticHtmlExtractionTests(unittest.TestCase):
    def test_non_display_blocks_are_blank_without_shifting_source_lines(self):
        source = (
            '<script>\nwindow.telemetry = "title=\\"Private code\\"";\n</script>\n'
            '<style>\n.action::after { content: "Private style"; }\n</style>\n'
            '<button title="Start a life">Play</button>'
        )

        stripped = i18n_catalog.strip_non_display_html(source)

        self.assertNotIn('Private code', stripped)
        self.assertNotIn('Private style', stripped)
        self.assertIn('<button title="Start a life">Play</button>', stripped)
        self.assertEqual(len(stripped), len(source))
        self.assertEqual(stripped.count('\n'), source.count('\n'))


class JavascriptLexerTests(unittest.TestCase):
    def test_unterminated_string_cannot_consume_following_source(self):
        source = "const broken = 'unterminated\nFB.T('Visible text');"

        with self.assertRaisesRegex(
            ValueError, 'unterminated JavaScript string starting on line 1'
        ):
            i18n_catalog.lex_js(source)


class StructuredDataExtractionTests(unittest.TestCase):
    def test_campaign_names_and_all_durable_outcomes_are_extracted(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        self.assertEqual(inventory.entries[
            'storyCampaign.theoderic_italy_476.name.default']['text'],
            'The Amal Commission for Italy')
        for prefix in ('clovis', 'theoderic', 'africa', 'italy'):
            for suffix in ('failed', 'diverted', 'interrupted'):
                self.assertIn(f'news.476.{prefix}_{suffix}', inventory.entries)
        self.assertIn('news.476.africa_campaign', inventory.entries)
        self.assertIn('news.476.theoderic_outcome', inventory.entries)

    def test_culture_tradition_names_use_their_own_namespace(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_structured(inventory)

        self.assertEqual(
            inventory.entries[
                'cultureTradition.west_european.name.default'
            ]['text'],
            'Western & Northern Europe',
        )

    def test_476_bookmark_realm_and_period_place_labels_are_extracted(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_structured(inventory)

        self.assertEqual(
            inventory.entries["bookmark.476.name.default"]["text"],
            "The Last Western Court",
        )
        self.assertEqual(
            inventory.entries["realm.476.suebi_476.name.default"]["text"],
            "Suevic Kingdom",
        )
        self.assertEqual(
            inventory.entries["province.fes.name.dated.0"]["text"],
            "Volubilis",
        )
        self.assertEqual(
            inventory.entries["province.split.name.dated.0"]["text"],
            "Salona",
        )
        for realm, name in (
            ("italy", "Western Roman Court"),
            ("pannonia", "Amal Gothic Host"),
            ("aquitaine", "Visigothic Kingdom"),
            ("aghlabids", "Vandal Kingdom"),
            ("thracian_goths_476", "Thracian Gothic Host"),
        ):
            self.assertEqual(
                inventory.entries[f"realm.476.{realm}.name.default"]["text"],
                name,
            )
        for key, name in (
            ("duchy.d_476_liguria.name.default", "Liguria"),
            ("kingdom.k_476_pontica.name.default", "Pontica"),
            ("empire.e_476_illyricum.name.default", "Illyricum"),
            ("province.laon.name.dated.0", "Augusta Suessionum"),
            ("seasonKind.mild_winter.name.default", "Mild winter"),
            ("climateZone.continental.name.default", "Continental"),
        ):
            self.assertEqual(inventory.entries[key]["text"], name)
        self.assertNotIn(
            i18n_catalog.source_key("Theoderic Strabo"), inventory.entries
        )
        self.assertNotIn(
            i18n_catalog.source_key("Suevic Court Delegate"),
            inventory.entries,
        )

    def test_privilege_display_fields_use_the_privilege_namespace(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_structured(inventory)

        self.assertEqual(
            inventory.entries['privilege.market_charter.name.default']['text'],
            'Market Charter',
        )
        self.assertIn(
            'privilege.office_confirmation.desc.default',
            inventory.entries,
        )


class LexiconPlaceholderTests(unittest.TestCase):
    def test_term_placeholders_are_tokens_protected_from_translation(self):
        text = 'Your {term:vassal.other} and {Term:liege} owe {money:gold}.'

        self.assertEqual(
            i18n_catalog.TOKEN_RE.findall(text),
            ['term:vassal.other', 'Term:liege', 'money:gold'],
        )
        protected, saved = i18n_catalog.protect(text)
        self.assertNotIn('{term:', protected)
        self.assertEqual(i18n_catalog.restore(protected, saved), text)
        self.assertTrue(i18n_catalog.leaf_integrity(
            text, 'Vos {term:vassal.other} et {Term:liege} doivent {money:gold}.'
        ))
        self.assertFalse(i18n_catalog.leaf_integrity(
            text, 'Vos vassaux et {Term:liege} doivent {money:gold}.'
        ))

    def test_translation_must_keep_each_term_placeholder(self):
        source = {'text': 'The {term:liege} grants a {term:fief}.'}

        self.assertEqual(i18n_catalog.validate_translation(
            source, {'text': 'Le {term:liege} accorde un {term:fief}.'}, 'k'
        ), [])
        self.assertEqual(i18n_catalog.validate_translation(
            source, {'text': 'Le suzerain accorde un {term:fief}.'}, 'k'
        ), ['k: placeholder mismatch'])

    def test_term_placeholders_must_name_a_base_term_and_form(self):
        errors = i18n_catalog.term_placeholder_errors({
            'ui:good': {'text': '{Term:vassal.other} and {term:crown_authority.title}'},
            'ui:unknown': {'text': 'A {term:thane} arrives.'},
            'ui:form': {'text': 'Two {term:liege.plural}.'},
            'ui:forms': {'forms': {'select': 'plural', 'param': 'n', 'cases': {
                'one': '{n} {term:vassal}', 'other': '{n} {term:vassals}'}}},
        })

        self.assertEqual(errors, [
            'ui:unknown: unknown lexicon term thane',
            'ui:form: malformed term placeholder {term:liege.plural}',
            'ui:forms: unknown lexicon term vassals',
        ])

    def test_lexicon_terms_ranks_and_labels_extract_under_lexicon_keys(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_lexicons(inventory)

        entries = inventory.entries
        self.assertEqual(
            entries['lexicon.base.terms.vassal.other.default']['text'], 'vassals')
        self.assertEqual(
            entries['lexicon.base.terms.crown_authority.title.default']['text'],
            'Crown Authority')
        self.assertEqual(entries['lexicon.base.rank.f.3.default']['text'], 'Baroness')
        self.assertEqual(
            entries['lexicon.faiths.muslim.rank.m.4.default']['text'], 'Emir')
        self.assertEqual(
            entries['lexicon.eras.late_antique.rank.m.4.default']['text'], 'Comes')
        self.assertEqual(
            entries['lexicon.eras.late_antique.labels.career.soldier.'
                    'ranks.apprentice.default']['text'],
            'New recruit')
        self.assertEqual(
            entries['lexicon.eras.late_antique.labels.unitRole.household.name.default']
            ['text'],
            'Household soldiers')

    def test_religions_no_longer_carry_rank_title_keys(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_structured(inventory)

        self.assertFalse(any('.rankTitles.' in key for key in inventory.entries))


class LocaleGenerationTests(unittest.TestCase):
    def test_hyphenated_locale_uses_matching_catalog_key_and_words(self):
        source = {'ui:Language': {'text': 'Language'}}
        translated = {'ui:Language': {'text': 'Idioma'}}

        catalog = i18n_catalog.render_catalog(
            'pt-BR', 'Português (Brasil)', source, translated
        )

        self.assertIn('FBDATA.lang["pt-BR"] = {', catalog)
        self.assertIn('code: "pt-BR",', catalog)
        self.assertIn('"child":{"m":"filho"', catalog)
        self.assertIn("n === 1 ? 'one' : 'other'", catalog)


if __name__ == '__main__':
    unittest.main()
