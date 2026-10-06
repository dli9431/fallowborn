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
    def test_711_candidate_has_display_owners_without_catalog_regeneration(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.711.name.default', 'Across the Strait'),
            ('realm.711.umayyad_711.name.default', 'Umayyad Caliphate'),
            ('province.711.oviedo.name.default', 'Asturian uplands'),
            ('settlement.711.baghdad_711.name.default', "Al-Mada'in"),
            ('duchy.d_711_galicia.name.default', 'Galicia'),
            ('religion.umayyad_sunni_711.head.title.default', 'Caliph'),
            ('culture.sindhi_711.name.default', 'Sindhi'),
            ('storyCampaign.strait_crossing_711.name.default', 'Across the Strait'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('711.js', inventory.meta[key]['location'])
        for campaign in ('crossing', 'toledo', 'septimania', 'gaul'):
            for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
                self.assertIn(f'news.711.{campaign}.{outcome}', inventory.entries)
        self.assertFalse(any('al-Walid' in key for key in inventory.entries))
        # The generic candidate pass must not re-extract 711 under year-scoped title keys.
        self.assertNotIn('duchy.711.d_711_galicia.name.default', inventory.entries)

    def test_800_review_content_has_display_and_durable_message_keys(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.800.name.default', 'The Imperial Coronation'),
            ('realm.800.carolingian_800.name.default', 'Carolingian Empire'),
            ('province.800.santiago.name.default', 'Iria Flavia'),
            ('duchy.800.normandy.name.default', 'Lower Seine'),
            ('kingdom.800.lotharingia.name.default', 'Austrasia'),
            ('storyCampaign.barcelona_800.name.default', 'The Barcelona Frontier'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_800', inventory.meta[key]['location'])
        for campaign in ('barcelona', 'danish', 'anatolia', 'lagoon'):
            for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
                self.assertIn(f'news.800.{campaign}_{outcome}', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Charlemagne'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Harun al-Rashid'), inventory.entries)

    def test_review_bookmark_content_has_display_and_durable_news_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.1204.name.default', 'The Fall of Constantinople'),
            ('realm.1204.latin_1204.name.default', 'Latin Empire'),
            ('province.1204.aghmat.name.default', 'Marrakesh'),
            ('storyCampaign.latin_thessalonica_1204.name.default', 'The Latin March into Macedonia'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1204', inventory.meta[key]['location'])
        for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
            self.assertIn(f'news.1204.latin_thessalonica_1204.{outcome}', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Baldwin of Flanders'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Theodore Laskaris'), inventory.entries)

    def test_regional_africa_content_keeps_stable_display_and_news_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('realm.476.altava_476.name.default', 'Mauro-Roman Kingdom'),
            ('realm.476.tingitana_476.name.default', 'Tingitanian Communities'),
            ('province.476.constantine.name.dated.0.default', 'Numidia and the Aures'),
            ('legalTradition.vandal_custom.name.default', 'Vandal custom'),
            ('legalTradition.mauro_roman.name.default', 'Mauro-Roman custom'),
            ('storyCampaign.eastern_africa_476.name.default', 'The Eastern African Campaign'),
            ('event.africa_estate_rolls_476.title.default', 'Two Estate Rolls'),
            ('event.africa_sicilian_cargo_476.options.0.label.default', 'Help account for the cargo.'),
            ('event.africa_estate_rolls_476.options.0.effects.log.default', 'Copied an old provincial estate record.'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_476_africa.js', inventory.meta[key]['location'])
        for outcome in ('campaign', 'won', 'failed', 'diverted', 'interrupted'):
            self.assertIn(f'news.476.africa_{outcome}', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Gaiseric'), inventory.entries)

    def test_regional_events_campaigns_and_county_names_are_extracted(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for event_id in ("grain_roll", "civic_records", "two_congregations"):
            prefix = f"event.italy_476_{event_id}"
            self.assertIn(f"{prefix}.title.default", inventory.entries)
            self.assertIn(f"{prefix}.text.default", inventory.entries)
            self.assertIn(f"{prefix}.options.0.label.default", inventory.entries)
        self.assertEqual(inventory.entries[
            "storyCampaign.rugian_frontier_476.name.default"]["text"], "The Rugian Frontier")
        for suffix in ("campaign", "won", "failed", "diverted", "interrupted"):
            self.assertIn(f"news.476.rugian_{suffix}", inventory.entries)
        for county, name in (("foggia", "Luceria"), ("viterbo", "Volsinii")):
            self.assertEqual(inventory.entries[
                f"province.476.{county}.name.dated.0.default"]["text"], name)
        self.assertNotIn(i18n_catalog.source_key("Epiphanius"), inventory.entries)

    def test_regional_gaul_iberia_content_keeps_stable_display_and_news_keys(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('culture.gallo_roman.name.default', 'Gallo-Roman'),
            ('culture.hispano_roman.name.default', 'Hispano-Roman'),
            ('legalTradition.burgundian_custom.name.default', 'Burgundian custom'),
            ('realm.476.alamanni_476.name.default', 'Upper Rhine Alamanni'),
            ('province.476.ourense.name.dated.0.default', 'Middle Minius'),
            ('settlement.476.tournai_476.name.default', 'Tornacum'),
            ('storyCampaign.clovis_syagrius_476.name.default', 'The Roman Domain at Soissons'),
            ('event.gaul_476_two_laws.title.default', 'Two Customs, One Sale'),
            ('event.gaul_476_two_laws.options.0.desc.default', 'Spend {money:3} and gain 4 prestige.'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
        self.assertIn('news.476.clovis_campaign', inventory.entries)
        self.assertIn('news.476.clovis_won', inventory.entries)
        self.assertIn('event.iberia_476_land_register.options.0.success.text.default',
                      inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Leontius'), inventory.entries)

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

    def test_dalmatian_eastern_events_and_local_place_labels_are_extracted(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('event.persian_frontier_dispatch_476.title.default',
             'A Dispatch from Beyond the Eastern Frontier'),
            ('event.eastern_commission_forms_476.options.0.success.text.default',
             'The clerks find the missing clause. Your corrected copy distinguishes the civil mandate from the army commission.'),
            ('province.476.ioannina.name.dated.0.default', 'Epirus interior'),
            ('province.476.zagreb.name.default', 'Andautonia'),
            ('settlement.476.upper_pannonia_476.name.default', 'Upper Pannonian community'),
            ('settlement.476.isauria_476.name.default', 'Isaurian court'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Glycerius'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Acacius'), inventory.entries)

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
