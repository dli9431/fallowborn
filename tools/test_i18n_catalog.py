import unittest

import i18n_catalog


class StaticHtmlExtractionTests(unittest.TestCase):
    def test_closing_tag_whitespace_and_case_do_not_leak_code(self):
        for tag in ('script', 'style'):
            for suffix in (' ', '\t', '\n', '\r\n', '\f'):
                with self.subTest(tag=tag, suffix=suffix):
                    source = (f'<{tag}>Hidden text\n</{tag.upper()}{suffix}>'
                              '<p>Visible text</p>')
                    stripped = i18n_catalog.strip_non_display_html(source)
                    self.assertNotIn('Hidden text', stripped)
                    self.assertIn('<p>Visible text</p>', stripped)
                    self.assertEqual(len(stripped), len(source))
                    self.assertEqual(stripped.count('\n'), source.count('\n'))

    def test_unrelated_end_tag_does_not_end_a_non_display_block(self):
        source = '<script>Hidden </style> still hidden</script ><p>Visible</p>'
        stripped = i18n_catalog.strip_non_display_html(source)
        self.assertNotIn('hidden', stripped.lower())
        self.assertIn('<p>Visible</p>', stripped)

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
    def test_culture_tradition_names_use_their_own_namespace(self):
        inventory = i18n_catalog.Inventory()

        i18n_catalog.extract_structured(inventory)

        self.assertEqual(
            inventory.entries[
                'cultureTradition.west_european.name.default'
            ]['text'],
            'Western & Northern Europe',
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
