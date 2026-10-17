import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

import i18n_catalog


class GeographyAdditionExtractionTests(unittest.TestCase):
    def test_independent_literal_geography_labels_have_source_owners(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'geography_islands.js').write_text(
                "var PROVINCE_ADDITIONS = [{id:'survey_island',name:'Island district',x:1,y:2}];\n"
                "throw new Error('Static extraction must not execute this file');\n", encoding='utf-8')
            (data / 'geography_hills.js').write_text(
                "var PROVINCE_ADDITIONS = [{id:'survey_hills',name:'Northern hills'},"
                "{name:'Unowned label'}, {id:'no_label'}];", encoding='utf-8')
            (data / 'geography_other.js').write_text(
                "var OTHER = [{id:'not_a_seed',name:'Unrelated'}];", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_geography_additions(inventory)
            self.assertEqual(inventory.entries['province.survey_island.name.default']['text'], 'Island district')
            self.assertEqual(inventory.entries['province.survey_hills.name.default']['text'], 'Northern hills')
            self.assertNotIn('province.not_a_seed.name.default', inventory.entries)
            self.assertNotIn('province.no_label.name.default', inventory.entries)
            self.assertIn(i18n_catalog.source_key('Northern hills'), inventory.entries)


class BookmarkRevisionExtractionTests(unittest.TestCase):
    def test_independent_revision_labels_and_aliases_without_executing_composers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'bookmark_coast.js').write_text(
                "FBDATA.bookmarkRevisionContent_coast = {bookmarkId:'survey',revision:'coast_v1',"
                "cultures:{coastal:{name:'Coastal households'}},"
                "provinces:[{id:'bay',name:'Bay district'}],"
                "realms:[{id:'local',name:'Bay custodian',ruler:{name:'Untranslated person'}}],"
                "duchies:{bay:{name:'Bay grouping'}},"
                "layouts:{bay:[{site:'farm',name:'Bay farms'}]}};\n"
                "throw new Error('Must never execute composers');", encoding='utf-8')
            (data / 'bookmark_valley.js').write_text(
                "FBDATA.bookmarkRevisionContent_valley = {bookmarkId:'survey',revision:'valley_v2',"
                "provinces:[{id:'bay',name:'Valley district'},{name:'Unowned label'}],"
                "kingdoms:{valley:{name:'Valley grouping'}},empires:{hills:{name:'Hill country'}},"
                "layouts:{bay:[{site:'farm',name:'Valley farms'}]}};"
                "FBDATA.bookmarkRevisionContent_incomplete = {provinces:[{id:'bad',name:'Missing scope'}]};",
                encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_bookmark_revision_content(inventory)
            for key, text in (
                ('province.survey.coast_v1.bay.name.default', 'Bay district'),
                ('province.survey.valley_v2.bay.name.default', 'Valley district'),
                ('realm.survey.coast_v1.local.name.default', 'Bay custodian'),
                ('culture.coastal.name.default', 'Coastal households'),
                ('duchy.survey.coast_v1.bay.name.default', 'Bay grouping'),
                ('kingdom.survey.valley_v2.valley.name.default', 'Valley grouping'),
                ('empire.survey.valley_v2.hills.name.default', 'Hill country'),
                ('settlement.survey.coast_v1.farm.name.default', 'Bay farms'),
                ('settlement.survey.valley_v2.farm.name.default', 'Valley farms'),
            ):
                self.assertEqual(inventory.entries[key]['text'], text)
                self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            for text in ('Untranslated person', 'Unowned label', 'Missing scope'):
                self.assertNotIn(i18n_catalog.source_key(text), inventory.entries)


class RevisionContentExtractionTests(unittest.TestCase):
    def test_independent_revision_labels_are_extracted_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'bookmark_river_review.js').write_text(
                "var REVISION_CONTENT = {bookmarkId:'river',revisionId:'local_v1',"
                "realms:[{id:'river_court',name:'River council'}],"
                "provinces:[{id:'riverbank',name:'Riverbank farms'}],"
                "duchies:{river_district:{name:'River district'}},"
                "settlementLayout:{riverbank:[{site:'landing',name:'River landing'}]},"
                "constituencyProfiles:{river_voice:{members:[{id:'boats',name:'Boat households'}]}}};\n"
                "throw new Error('Do not execute a composer');", encoding='utf-8')
            (data / 'bookmark_hill_review.js').write_text(
                "var REVISION_CONTENT = {bookmarkId:'hill',revisionId:'review_v2',"
                "realms:[{id:'hill_court',name:'Hill court'}],"
                "kingdoms:{hill_country:{name:'Hill country'}},"
                "settlementLayout:{ridge:[{name:'Ridge hamlet'}]}};", encoding='utf-8')
            (data / 'bookmark_unowned.js').write_text(
                "var REVISION_CONTENT = {realms:[{id:'missing_scope',name:'Unowned'}]};", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_revision_content(inventory)
            expected = {
                'realm.river.local_v1.river_court.name.default': 'River council',
                'province.river.local_v1.riverbank.name.default': 'Riverbank farms',
                'duchy.river.local_v1.river_district.name.default': 'River district',
                'settlement.river.local_v1.landing.name.default': 'River landing',
                'constituencyMember.river_voice.boats.name.default': 'Boat households',
                'realm.hill.review_v2.hill_court.name.default': 'Hill court',
                'kingdom.hill.review_v2.hill_country.name.default': 'Hill country',
                'settlement.hill.review_v2.ridge.0.name.default': 'Ridge hamlet'
            }
            for key, text in expected.items():
                self.assertEqual(inventory.entries[key]['text'], text)
                self.assertIn(i18n_catalog.source_key(text), inventory.entries)
            self.assertFalse(any('missing_scope' in key for key in inventory.entries))


class ScaffoldRegionExtractionTests(unittest.TestCase):
    def test_1241_regional_names_have_scoped_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_scaffold_regions(inventory)
        for key, text in (
            ('realm.1241.kyiv_local_1241.name.default', 'Kyiv local administration'),
            ('realm.1241.castile_leon_1241.name.default', 'Crowns of Castile and Leon'),
            ('realm.1241.venice_1241.name.default', 'Venetian commune'),
            ('province.1241.volodymyr.name.default', 'Volodymyr'),
            ('kingdom.1241.asturias.name.default', 'León and Castile'),
            ('settlement.1241.roma.name.default', 'Rome'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1241_scaffold_b.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Ferdinand III'), inventory.entries)

    def test_568_regions_and_staged_court_policies_have_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_scaffold_regions(inventory)
        for key, text in (
            ('province.568.baghdad.name.default', 'Ctesiphon'),
            ('realm.568.sasanian_568.name.default', 'Sasanian Empire'),
            ('settlement.568.ravenna_476.name.default', 'Ravenna'),
            ('administrationProfile.sasanian_provinces_568.name.default', 'Sasanian provincial service (568)'),
            ('aristocraticProfile.sasanian_568.name.default', 'Sasanian royal and provincial interests (568)'),
            ('aristocraticInterest.sasanian_568.ray.name.default', 'Ray provincial interest'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_568_scaffold_a.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Khosrow I'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Ray provincial household'), inventory.entries)

    def test_western_1096_labels_are_registered_by_the_structured_inventory(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('province.1096.paris.name.default', 'Paris'),
            ('province.1096.ghadames_oasis.name.default', 'Ghadames'),
            ('realm.1096.toulouse_1096.name.default', 'County of Toulouse'),
            ('realm.1096.almoravid_1096.name.default', 'Almoravid realm'),
            ('kingdom.1096.asturias.name.default', 'Leon and Castile'),
            ('settlement.1096.ghadames_oasis_inhabited_1066.name.default', 'Ghadames'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1096_scaffold_a.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Yusuf ibn Tashfin'), inventory.entries)

    def test_multiple_regions_and_dates_have_scoped_owners_without_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            (data / 'bookmark_420_scaffold_a.js').write_text(
                "FBDATA.bookmarkRegions420.bank = {"
                "provinces:[{id:'landing',name:'River landing',names:[{name:'Old landing'}]},"
                "{name:'Unowned county'}],"
                "realms:[{id:'river',name:'River court',ruler:{name:'Proper person'}}],"
                "duchies:{shared:{name:'River district'}},"
                "kingdoms:{country:{name:'River country'}},"
                "empires:{region:{name:'River region'}},"
                "settlementLayouts:{landing:[{site:'wharf',name:'River wharf'}]}};\n"
                "FBDATA.bookmarkRegions420.ridge = {"
                "provinces:[{id:'ridge',name:'Hill farms'}],"
                "layouts:{ridge:[{name:'Hill hamlet'}]}};\n"
                "throw new Error('Never execute staged data');", encoding='utf-8')
            (data / 'bookmark_421_scaffold_c.js').write_text(
                "FBDATA.bookmarkRegions421.plain = {"
                "provinces:[{id:'landing',name:'Later landing'}],"
                "duchies:{shared:{name:'Later district'}}};\n"
                "FBDATA.bookmarkRegions420.foreign = {"
                "provinces:[{id:'foreign',name:'Wrong dated table'}]};", encoding='utf-8')
            (data / 'bookmark_bad_scaffold_a.js').write_text(
                "FBDATA.bookmarkRegions420.other = {"
                "provinces:[{id:'other',name:'Unscoped file'}]};", encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), patch.object(i18n_catalog, 'DATA', data):
                i18n_catalog.extract_scaffold_regions(inventory)
            expected = {
                'province.420.landing.name.default': 'River landing',
                'province.420.landing.name.dated.0.default': 'Old landing',
                'realm.420.river.name.default': 'River court',
                'duchy.420.shared.name.default': 'River district',
                'kingdom.420.country.name.default': 'River country',
                'empire.420.region.name.default': 'River region',
                'settlement.420.wharf.name.default': 'River wharf',
                'province.420.ridge.name.default': 'Hill farms',
                'settlement.420.ridge.0.name.default': 'Hill hamlet',
                'province.421.landing.name.default': 'Later landing',
                'duchy.421.shared.name.default': 'Later district',
            }
            for key, text in expected.items():
                self.assertEqual(inventory.entries[key]['text'], text)
                self.assertIn(i18n_catalog.source_key(text), inventory.entries)
                self.assertIn('scaffold_', inventory.meta[key]['location'])
            for text in ('Proper person', 'Unowned county', 'Wrong dated table', 'Unscoped file'):
                self.assertNotIn(i18n_catalog.source_key(text), inventory.entries)


class StaticHtmlExtractionTests(unittest.TestCase):
    def test_mobile_opening_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_mobile_presentations(inventory)
        self.assertNotIn('bookmark.476_mobile.name.default', inventory.entries)
        self.assertEqual(inventory.entries['scenario.mobile_household_476.name.default']['text'], 'Pontic Household')
        self.assertIn('{province}', inventory.entries['scenario.mobile_household_476.intro.default']['text'])
        self.assertNotIn(i18n_catalog.source_key('Cherson'), inventory.entries)

    def test_declared_period_titles_and_conversion_options(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        self.assertEqual(inventory.entries['kingdom.1204.asturias.name.default']['text'], 'León and Castile')
        self.assertEqual(inventory.entries['kingdom.1204.rus.name.default']['text'], 'Kievan Rus')
        selections = i18n_catalog.Inventory()
        i18n_catalog.extract_government_selections(selections)
        self.assertEqual(selections.entries['governmentSelection.assembly_polity.transformation.regnum.name.default']['text'],
                         'Review government settlement')
        self.assertEqual(selections.entries['governmentSelection.aristocratic_monarchy.transformation.regnum.name.default']['text'],
                         'Review dynastic government')
        self.assertEqual(selections.entries['governmentSelection.regnum.transformation.aristocratic_monarchy.name.default']['text'],
                         'Review return to royal recognition')

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


class SupplementalCatalogueExtractionTests(unittest.TestCase):
    TECHNOLOGY = (
        "add('copying',{default:'Old copying',muslim:'Court copying'},'x','learning',"
        "[1,900],[400,900],[],{default:'Old method',muslim:'Court method'},{});\n"
        "add('retained','Retained craft','x','crafts',[1,900],[400,900],[],"
        "'Unchanged craft',{});\n"
    )
    BUILDINGS = (
        "FBDATA.buildings = {hall:{name:{default:'Old hall',muslim:'Court hall'},"
        "desc:'Old assembly room',cost:40},"
        "shed:{name:'Retained shed',desc:'Unchanged shelter'}};\n"
    )

    def extract(self, files, namespace):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'data'
            data.mkdir()
            sources = {'technology.js': self.TECHNOLOGY, 'map_data.js': self.BUILDINGS}
            sources.update(files)
            for name, source in sources.items():
                (data / name).write_text(source, encoding='utf-8')
            inventory = i18n_catalog.Inventory()
            with patch.object(i18n_catalog, 'ROOT', root), \
                    patch.object(i18n_catalog, 'DATA', data), \
                    patch.object(i18n_catalog, 'TECHNOLOGY_FILE', data / 'technology.js'):
                i18n_catalog.extract_catalogue_displays(inventory, namespace)
            inventory.finish_alias_meta()
            return inventory

    def test_two_independent_supplements_use_existing_owners_without_execution(self):
        files = {
            'technology_coast.js': (
                "FBDATA.tech_shore = {soundings:{name:'Sounding practice',"
                "desc:'Check {depth} fathoms',cost:20,fx:{seaMovement:0.01}}};\n"
                "throw new Error('Never execute the composer');"
            ),
            'technology_ridge.js': (
                "FBDATA.tech_upland = {terraces:{name:{default:'Upland terraces',"
                "muslim:'Hill terraces'},desc:'Maintain the hillside',cost:35}};"
            ),
            'buildings_coast.js': (
                "FBDATA.buildings_landing = {wharf:{name:'Timber landing',"
                "desc:'A place for boats',cost:25}};"
            ),
            'buildings_ridge.js': (
                "FBDATA.buildings_hill = {bothy:{name:'Hill shelter',"
                "desc:{default:'Rest on the ridge',jewish:'Rest above the valley'},cost:10}};\n"
                "throw new Error('Do not initialize the game');"
            ),
        }
        for namespace, expected in (
            ('tech', {
                'tech.soundings.name.default': 'Sounding practice',
                'tech.soundings.desc.default': 'Check {depth} fathoms',
                'tech.terraces.name.default': 'Upland terraces',
                'tech.terraces.name.muslim': 'Hill terraces',
            }),
            ('building', {
                'building.wharf.name.default': 'Timber landing',
                'building.bothy.name.default': 'Hill shelter',
                'building.bothy.desc.jewish': 'Rest above the valley',
            }),
        ):
            with self.subTest(namespace=namespace):
                inventory = self.extract(files, namespace)
                for key, text in expected.items():
                    self.assertEqual(inventory.entries[key], {'text': text})
                    self.assertEqual(inventory.entries[i18n_catalog.source_key(text)], {'text': text})
                self.assertNotIn(i18n_catalog.source_key('Never execute the composer'), inventory.entries)
        self.assertEqual(self.extract(files, 'tech').meta['tech.soundings.desc.default']['glossary'], ['depth'])

    def test_complete_corrections_keep_keys_and_explicit_compatible_variants(self):
        files = {
            'technology_revision.js': (
                "FBDATA.techCorrections_review = {copying:{"
                "name:{default:'Organized copying',muslim:'Court copying'},"
                "desc:{default:'Revised method',muslim:'Court method'},cost:20}};"
            ),
            'buildings_revision.js': (
                "FBDATA.buildingCorrections_review = {hall:{"
                "name:{default:'Assembly hall',muslim:'Court hall'},"
                "desc:'Revised assembly room',cost:40}};"
            ),
        }
        for namespace, item_id, default, branch, stale, source in (
            ('tech', 'copying', 'Organized copying', 'Court copying', 'Old copying', 'technology_revision.js'),
            ('building', 'hall', 'Assembly hall', 'Court hall', 'Old hall', 'buildings_revision.js'),
        ):
            with self.subTest(namespace=namespace):
                inventory = self.extract(files, namespace)
                prefix = namespace + '.' + item_id + '.name.'
                self.assertEqual(inventory.entries[prefix + 'default'], {'text': default})
                self.assertEqual(inventory.entries[prefix + 'muslim'], {'text': branch})
                self.assertEqual(inventory.meta[prefix + 'muslim']['location'], 'data/' + source)
                self.assertNotIn(i18n_catalog.source_key(stale), inventory.entries)
                self.assertNotIn(i18n_catalog.source_key('Old method'), inventory.entries)
                self.assertNotIn(i18n_catalog.source_key('Old assembly room'), inventory.entries)

    def test_replacement_drops_removed_branches_and_keeps_shared_live_aliases(self):
        inventory = self.extract({
            'technology_revision.js': (
                "FBDATA.techCorrections_review = {copying:{name:'Retained craft',"
                "desc:'New method'}};"
            )
        }, 'tech')
        self.assertNotIn('tech.copying.name.muslim', inventory.entries)
        self.assertNotIn('tech.copying.desc.muslim', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Court copying'), inventory.entries)
        alias = i18n_catalog.source_key('Retained craft')
        self.assertEqual(inventory.entries[alias], {'text': 'Retained craft'})
        self.assertCountEqual(inventory.alias_locations[alias], ['data/technology.js', 'data/technology_revision.js'])

    def test_multiple_literal_tables_in_one_file_keep_their_distinct_roles(self):
        inventory = self.extract({'technology_packet.js': (
            "FBDATA.tech_additions = {new_craft:{name:'New craft',desc:'Another method'}};\n"
            "FBDATA.techCorrections_older = {copying:{name:'Revised copying',desc:'Revised method'}};\n"
            "if (FBDATA.tech_additions === null) { throw new Error('Never execute'); }"
        )}, 'tech')
        self.assertEqual(inventory.entries['tech.new_craft.name.default'], {'text': 'New craft'})
        self.assertEqual(inventory.entries['tech.copying.name.default'], {'text': 'Revised copying'})
        self.assertEqual(inventory.entries['tech.retained.name.default'], {'text': 'Retained craft'})
        self.assertNotIn(i18n_catalog.source_key('Old copying'), inventory.entries)

    def test_duplicate_additions_including_legacy_ids_are_errors_even_when_equal(self):
        for namespace, filename, table, item_id, name in (
            ('tech', 'technology_one.js', 'tech_one', 'copying', 'Old copying'),
            ('building', 'buildings_one.js', 'buildings_one', 'hall', 'Old hall'),
        ):
            with self.subTest(namespace=namespace):
                with self.assertRaisesRegex(ValueError, 'duplicate .* definition ' + item_id):
                    self.extract({filename: 'FBDATA.' + table + ' = {' + item_id +
                                  ":{name:'" + name + "',desc:'Duplicate'}};"}, namespace)
        with self.assertRaisesRegex(ValueError, 'duplicate tech definition added'):
            self.extract({
                'technology_one.js': "FBDATA.tech_one = {added:{name:'One',desc:'First'}};",
                'technology_two.js': "FBDATA.tech_two = {added:{name:'One',desc:'First'}};",
            }, 'tech')

    def test_corrections_require_one_existing_owner(self):
        for namespace, filename, prefix, item_id in (
            ('tech', 'technology_', 'techCorrections_', 'copying'),
            ('building', 'buildings_', 'buildingCorrections_', 'hall'),
        ):
            with self.subTest(namespace=namespace):
                with self.assertRaisesRegex(ValueError, 'correction of missing'):
                    self.extract({filename + 'one.js': 'FBDATA.' + prefix +
                                  "one = {missing:{name:'Missing',desc:'No original'}};"}, namespace)
                source = " = {" + item_id + ":{name:'Correction',desc:'One owner only'}};"
                with self.assertRaisesRegex(ValueError, 'duplicate .* correction owner'):
                    self.extract({filename + 'one.js': 'FBDATA.' + prefix + 'one' + source,
                                  filename + 'two.js': 'FBDATA.' + prefix + 'two' + source}, namespace)

    def test_duplicate_literal_ids_fields_and_faith_owners_are_rejected(self):
        for literal in (
            "{new_id:{name:'One',desc:'First'},new_id:{name:'One',desc:'First'}}",
            "{new_id:{name:'One',name:'One',desc:'First'}}",
            "{new_id:{name:{default:'One',muslim:'Two',muslim:'Two'},desc:'First'}}",
        ):
            with self.subTest(literal=literal):
                with self.assertRaisesRegex(ValueError, 'duplicate literal key'):
                    self.extract({'technology_one.js': 'FBDATA.tech_one = ' + literal + ';'}, 'tech')

    def test_dynamic_or_incomplete_display_maps_cannot_silently_lose_text(self):
        for literal in (
            'makeDefinitions()',
            "{new_id:makeDefinition()}",
            "{new_id:{name:translatedName(),desc:'First'}}",
            "{new_id:{name:'One' + suffix,desc:'First'}}",
            "{new_id:{name:{default:'One',muslim:translatedName()},desc:'First'}}",
            "{new_id:{name:'One'}}",
            "{new_id:{name:'One',desc:'First'}} || fallback",
            "{...otherDefinitions,new_id:{name:'One',desc:'First'}}",
            "{[computed]:{name:'One',desc:'First'}}",
            "{new_id:{name:'One',desc:'First'}",
        ):
            with self.subTest(literal=literal):
                with self.assertRaises(ValueError):
                    self.extract({'technology_one.js': 'FBDATA.tech_one = ' + literal + ';'}, 'tech')

    def test_later_direct_field_or_branch_overrides_cannot_hide_a_conflict(self):
        for namespace, filename, table, reference in (
            ('tech', 'technology_review.js', 'techCorrections_review', 'FBDATA.tech.copying.name'),
            ('tech', 'technology_review.js', 'techCorrections_review', "FBDATA.tech['copying'].name.muslim"),
            ('building', 'buildings_review.js', 'buildingCorrections_review', "FBDATA.buildings.hall['name']['muslim']"),
        ):
            item_id = 'copying' if namespace == 'tech' else 'hall'
            source = 'FBDATA.' + table + ' = {' + item_id + ":{name:'Reviewed',desc:'Reviewed description'}};"
            with self.subTest(reference=reference):
                with self.assertRaisesRegex(ValueError, 'unsupported .* display override'):
                    self.extract({filename: source + reference + " = 'Late variant';"}, namespace)
                inventory = self.extract({filename: source + 'consume(' + reference + ');'}, namespace)
                self.assertEqual(inventory.entries[namespace + '.' + item_id + '.name.default'], {'text': 'Reviewed'})

    def test_comment_string_and_unrelated_table_are_not_declarations(self):
        inventory = self.extract({'technology_notes.js': (
            "// FBDATA.tech_false = {fake:{name:'Comment label',desc:'Comment'}};\n"
            "var note = \"FBDATA.tech_false = {fake:{name:'String label'}}\";\n"
            "FBDATA.techDomains_other = {domain:{name:'Domain label'}};\n"
            "FBDATA.tech_real = {actual:{name:'Actual label',desc:'Actual description'}};"
        )}, 'tech')
        for text in ('Comment label', 'String label', 'Domain label'):
            self.assertNotIn(i18n_catalog.source_key(text), inventory.entries)
        self.assertEqual(inventory.entries['tech.actual.name.default'], {'text': 'Actual label'})

    def test_legacy_sources_and_variants_keep_their_ordinary_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text, source in (
            ('tech.seed_selection.name.default', 'Seed Selection', 'data/technology.js'),
            ('tech.scriptoria.name.muslim', 'Paper Workshops', 'data/technology.js'),
            ('building.library.name.default', 'Library', 'data/map_data.js'),
            ('building.library.name.muslim', 'House of Wisdom', 'data/map_data.js'),
            ('building.cathedral.name.pagan', 'Grand Sanctuary', 'data/map_data.js'),
        ):
            self.assertEqual(inventory.entries[key], {'text': text})
            self.assertEqual(inventory.meta[key]['location'], source)
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)


class StructuredDataExtractionTests(unittest.TestCase):
    def test_staged_568_culture_labels_have_ordinary_localization_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('culture.langobard_568.name.default', 'Langobard'),
            ('culture.avar_568.name.default', 'Avar court communities'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_568_identities.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)

    def test_1096_local_faiths_have_staged_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('religion.ghana_local_practice_1096.name.default', 'Ghana local practice'),
            ('religion.ghana_local_practice_1096.words.deity.default', 'the sacred powers'),
            ('religion.ghana_local_practice_1096.roles.monasticF.default', 'Devotee'),
            ('religion.niger_traditional_1096.name.default', 'Middle Niger traditional worship'),
            ('religion.niger_traditional_1096.words.deity.default', 'the spirits'),
            ('religion.niger_traditional_1096.roles.priestM.default', 'Ritual keeper'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('identities_1096.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)

    def test_1241_local_faith_has_staged_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('religion.sahel_local_practice_1241.name.default', 'Sahelian local practices'),
            ('religion.sahel_local_practice_1241.words.deity.default', 'the sacred powers'),
            ('religion.sahel_local_practice_1241.words.cleric.default', 'ritual keeper'),
            ('religion.sahel_local_practice_1241.roles.monasticF.default', 'Devotee'),
            ('religion.sahel_local_practice_1241.roles.priestM.default', 'Ritual keeper'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('identities_1241.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)

    def test_staged_faith_labels_are_read_without_executing_their_source(self):
        source = i18n_catalog.DATA / 'identities_1096.js'
        original_read = Path.read_text

        def read_text(path, *args, **kwargs):
            if path == source:
                return (
                    "FBDATA.bookmarkReligions1096 = {"
                    "e2e_local_rite:{name:'River observance',"
                    "properties:{words:{deity:'the river spirits'}}},"
                    "e2e_hill_rite:{name:'Hill observance',"
                    "properties:{roles:{priestF:'Keeper'}}}};"
                    "throw new Error('Static extraction must not execute this source');"
                )
            return original_read(path, *args, **kwargs)

        inventory = i18n_catalog.Inventory()
        with patch.object(Path, 'read_text', read_text):
            i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('religion.e2e_local_rite.name.default', 'River observance'),
            ('religion.e2e_local_rite.words.deity.default', 'the river spirits'),
            ('religion.e2e_hill_rite.name.default', 'Hill observance'),
            ('religion.e2e_hill_rite.roles.priestF.default', 'Keeper'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('identities_1096.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)

    def test_867_district_labels_have_independent_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('culture.middle_niger_867.name.default', 'Middle Niger communities'),
            ('culture.western_sahel_867.name.default', 'Western Sahel communities'),
            ('realm.867.jenne_867.name.default', 'Jenne-jeno'),
            ('realm.867.afrighids_867.name.default', 'Afrighid Khwarazm'),
            ('province.867.kath_district.name.default', 'Kath'),
            ('province.867.central_iran_oases.name.default', 'Kashan oases'),
            ('settlement.867.kath_district_inhabited_867.name.default', 'Kath'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_867_expansion.js', inventory.meta[key]['location'])
        self.assertNotIn(i18n_catalog.source_key('Farnak'), inventory.entries)
        self.assertNotIn('culture.chorasmian_867.name.default', inventory.entries)
        self.assertFalse(any(key.startswith('constituencyMember.middle_niger_867.')
                             for key in inventory.entries))
        self.assertEqual(inventory.entries['culture.chorasmian.name.default']['text'], 'Chorasmian')
        self.assertIn('cultures.js', inventory.meta['culture.chorasmian.name.default']['location'])

    def test_1066_terrain_has_literal_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('culture.soninke_1066.name.default', 'Soninke'),
            ('religion.wagadu_traditional_1066.name.default', 'Wagadu traditional worship'),
            ('province.1066.central_iran_oases.name.default', 'Kashan oasis'),
            ('settlement.1066.kumbi_district_inhabited_1066.name.default', 'Kumbi district'),
            ('realm.1066.jenne_1066.name.default', 'Jenne-jeno'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1066_inhabited.js', inventory.meta[key]['location'])
        self.assertNotIn('culture.khwarazmian_1066.name.default', inventory.entries)
        self.assertNotIn('authorityOffice.district_delegate_1066.name.default', inventory.entries)
        self.assertFalse(any(key.startswith('constituencyMember.jenne_households_1066.')
                             for key in inventory.entries))

    def test_aristocratic_courts_and_offices_have_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('aristocraticProfile.chartered_court.name.default', 'Chartered royal court'),
            ('aristocraticInterest.chartered_court.alder.name.default', 'Alder household'),
            ('aristocraticInterest.sasanian_476.mihran.name.default', 'Mihran family interest'),
            ('authorityOffice.provincial_governor.name.default', 'Provincial governor'),
            ('authorityOffice.sasanian_shahrab.name.default', 'Shahrab'),
            ('administrationProfile.sasanian_provinces_476.name.default', 'Sasanian provincial service (476)'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('aristocratic_courts.js', inventory.meta[key]['location'])

    def test_elective_profiles_and_contests_have_stable_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_government_selections(inventory)
        for key, text in (
            ('governmentSelection.elective_monarchy.member.palace_interest.name.default', 'Palace nobility'),
            ('governmentSelection.elective_monarchy.member.clerical_interest.name.default', 'Clerical delegates'),
            ('governmentContest.toledo_crown_711.name.default', 'The Toledo crown'),
            ('governmentContest.northeastern_crown_711.name.default', 'The northeastern crown'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
        self.assertNotIn(i18n_catalog.source_key('Roderic'), inventory.entries)

    def test_civic_profiles_offices_interests_and_contests_keep_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        i18n_catalog.extract_government_selections(inventory)
        for key, text in (
            ('civicProfile.venice_1204.name.default', 'Venetian ducal commune (1204)'),
            ('civicOffice.venice_1204.ducal_office.name.default', 'Doge'),
            ('civicOffice.genoese_consular.second_consul.name.default', 'Second consul'),
            ('constituencyMember.open_civic_service.residents.name.default', 'Resident households'),
            ('governmentContest.venetian_offices_1204.name.default', 'The ducal commune'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
        self.assertFalse(any('Enrico Dandolo' in value['text'] for key, value
                             in inventory.entries.items() if key.startswith('civic')))

    def test_assembly_policies_have_display_owners_without_translating_people(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('assemblyOpening.north_coast_476.name.default', 'Northern coastal households'),
            ('assemblyOpening.federation_example.name.default', 'Settlement federation example'),
            ('assemblyCounty.north_coast_476.name.default', 'Northern Estonian coast'),
            ('assemblyCounty.north_coast_476.settlement.0.name.default', 'Coastal households'),
            ('constituencyMember.coastal_households.cultivators.name.default', 'Cultivating households'),
            ('constituencyMember.settlement_federation.routes.name.default', 'Route keepers'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('assembly_polities.js', inventory.meta[key]['location'])
        self.assertNotIn(i18n_catalog.source_key('Vaino'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Edan'), inventory.entries)

    def test_wider_476_content_has_region_and_bookmark_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.476.name.default', 'The Last Western Court'),
            ('province.476.baghdad.name.default', 'Ctesiphon'),
            ('province.476.lund.name.dated.0.default', 'Uppåkra'),
            ('settlement.476.shrewsbury_outer_476.name.default', 'Viroconium'),
            ('realm.476.sasanian_476.name.default', 'Sasanian Empire'),
            ('province.476.ravenna.name.default', 'Ravenna'),
            ('settlement.476.ravenna_476.name.default', 'Ravenna'),
            ('realm.476.italy.name.default', 'Western Roman Court'),
            ('culture.brittonic.name.default', 'Brittonic'),
            ('religion.east_syriac.name.default', 'East Syriac Christianity'),
            ('event.antioch_congregation_relief_476.title.default', 'Relief Among the Congregations'),
            ('event.british_farm_boundary_476.options.0.effects.log.default',
             'Helped British neighbors reconcile a field boundary.'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
        self.assertIn('bookmark_476_outer.js',
                      inventory.meta['province.476.baghdad.name.default']['location'])
        for retired in ('bookmark.476_outer.name.default', 'province.476_outer.baghdad.name.default'):
            self.assertNotIn(retired, inventory.entries)

    def test_493_expansion_retains_baseline_labels_and_excludes_generated_people(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('province.493.fustat.name.default', 'Fustat'),
            ('province.493.world_v2.fustat.name.default', 'Babylon of Egypt'),
            ('settlement.493.world_v2.baghdad_outer_476.name.default', 'Ctesiphon'),
            ('realm.493.world_v2.sasanian_493.name.default', 'Sasanian Court'),
            ('aristocraticProfile.sasanian_493.name.default', 'Sasanian royal and magnate court (493)'),
            ('administrationProfile.sasanian_provinces_493.name.default', 'Sasanian provincial service (493)'),
            ('aristocraticInterest.sasanian_493.armenian.name.default', 'Armenian provincial interest'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
        for name in ('Kawad I', 'Jamasp', 'Yazdegerd II'):
            self.assertNotIn(i18n_catalog.source_key(name), inventory.entries)

    def test_568_composition_and_open_role_labels_have_literal_source_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text, source in (
            ('bookmark.568.name.default', 'The Lombards Depart', 'bookmark_568.js'),
            ('scenario.farmer_568.name.default', 'Free Farming Household', 'starts_568.js'),
            ('scenario.craftsman_568.name.default', 'Artisan’s Apprentice', 'starts_568.js'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn(source, inventory.meta[key]['location'])
        self.assertIn('bookmark.568.desc.default', inventory.entries)
        self.assertIn('scenario.farmer_568.intro.default', inventory.entries)
        self.assertIn('scenario.craftsman_568.intro.default', inventory.entries)

    def test_1241_composition_labels_have_literal_source_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.1241.name.default', 'The Mongol Invasion'),
            ('bookmark.1241.desc.default', 'Hungarian and Rus households face an uncertain spring while rival courts pursue their own priorities.'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1241.js', inventory.meta[key]['location'])
            self.assertIn(i18n_catalog.source_key(text), inventory.entries)

    def test_493_review_content_has_display_and_durable_message_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.493.name.default', 'The Ravenna Settlement'),
            ('realm.493.ostrogoths_493.name.default', 'Ostrogothic Kingdom'),
            ('province.493.laon.name.default', 'Augusta Suessionum'),
            ('settlement.493.soissons_476.name.default', 'Augusta Suessionum'),
            ('storyCampaign.visigothic_campaign_493.name.default', 'The Toulouse Campaign'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_493', inventory.meta[key]['location'])
        for campaign in ('alamanni', 'burgundy', 'toulouse', 'sirmium', 'africa', 'italy'):
            for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
                self.assertIn(f'news.493.{campaign}.{outcome}', inventory.entries)
        for proper_name in ('Theoderic', 'Anastasius I', 'Gunthamund', 'Gelasius I'):
            self.assertNotIn(i18n_catalog.source_key(proper_name), inventory.entries)

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
            ('storyFoundation.asturias_foundation_711.name.default', 'The Asturian Resistance'),
            ('storyFoundation.asturias_foundation_711.realm.name.default', 'Asturias'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('711.js', inventory.meta[key]['location'])
        for campaign in ('crossing', 'toledo', 'septimania', 'gaul'):
            for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
                self.assertIn(f'news.711.{campaign}.{outcome}', inventory.entries)
        self.assertFalse(any('al-Walid' in key for key in inventory.entries))
        for outcome in ('founded', 'failed', 'diverted'):
            self.assertIn(f'news.711.asturias.{outcome}', inventory.entries)
        self.assertFalse(any('Pelayo' in key for key in inventory.entries))
        # The generic candidate pass must not re-extract 711 under year-scoped title keys.
        self.assertNotIn('duchy.711.d_711_galicia.name.default', inventory.entries)

    def test_711_terrain_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('province.711.terrain_v2.jenne_district.name.default', 'Middle Niger settlements'),
            ('settlement.711.terrain_v2.jenne_jeno_711.name.default', 'Jenne-jeno'),
            ('province.711.terrain_v2.kath_district.name.default', 'Kath'),
            ('province.711.terrain_v2.w_steppe_e.name.default', 'Eastern steppe'),
            ('realm.711.terrain_v2.khwarazm_711.name.default', 'Khwarazm'),
            ('realm.711.terrain_v2.middle_niger_711.name.default', 'Middle Niger communities'),
            ('duchy.d_711_khwarazm.name.default', 'Khwarazm'),
            ('kingdom.k_711_middle_niger.name.default', 'Middle Niger'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_711_terrain.js', inventory.meta[key]['location'])
        self.assertEqual(inventory.entries['province.711.w_steppe_e.name.default']['text'], 'Kazakh Steppe')

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

    def test_800_expansion_names_have_stable_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('province.800.jenne_district.name.default', 'Jenne-jeno'),
            ('province.800.central_iran_oases.name.default', 'Kashan district'),
            ('realm.800.khwarazm_800.name.default', 'Khwarazm'),
            ('settlement.800.gao_district_800.name.default', 'Gao-Saney'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_800_expansion.js', inventory.meta[key]['location'])

    def test_review_bookmark_content_has_display_and_durable_news_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        for key, text in (
            ('bookmark.1204.name.default', 'The Fall of Constantinople'),
            ('realm.1204.latin_1204.name.default', 'Latin Empire'),
            ('province.1204.aghmat.name.default', 'Marrakesh'),
            ('storyCampaign.latin_thessalonica_1204.name.default', 'The Latin March into Macedonia'),
            ('storyCampaign.thessalonica_partition_1204.name.default', "Boniface's Thessalonican Settlement"),
            ('storyCampaign.athens_partition_1204.name.default', "Othon's Athenian Lordship"),
            ('storyCampaign.achaia_partition_1204.name.default', "William's Achaean Principality"),
            ('storyCampaign.fifth_crusade_call_1204.name.default', 'The Fifth Crusade Call'),
        ):
            self.assertEqual(inventory.entries[key]['text'], text)
            self.assertIn('bookmark_1204', inventory.meta[key]['location'])
        for outcome in ('started', 'won', 'failed', 'diverted', 'interrupted'):
            self.assertIn(f'news.1204.latin_thessalonica_1204.{outcome}', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Baldwin of Flanders'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Theodore Laskaris'), inventory.entries)
        for owner in ('thessalonica_partition_1204', 'athens_partition_1204', 'achaia_partition_1204'):
            for outcome in ('granted', 'declined', 'diverted', 'interrupted'):
                self.assertIn(f'news.1204.{owner}.{outcome}', inventory.entries)
        for outcome in ('called', 'won', 'failed', 'declined', 'diverted'):
            self.assertIn(f'news.1204.fifth_crusade_call_1204.{outcome}', inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Boniface of Montferrat'), inventory.entries)
        self.assertNotIn(i18n_catalog.source_key('Othon de la Roche'), inventory.entries)

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
        for story_id, title in (("sicilian_tribute_476", "The Sicilian Agreement"),
                                ("norican_evacuation_476", "The Norican Evacuation")):
            self.assertEqual(inventory.entries[
                f"storyCampaign.{story_id}.name.default"]["text"], title)
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

    def test_ecclesiastical_profiles_have_structured_display_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        self.assertEqual(inventory.entries['ecclesiasticalProfile.papal_temporal_1204.name.default']['text'],
                         'Papal temporal government (1204)')
        self.assertEqual(inventory.entries['ecclesiasticalProfile.durham_temporal.name.default']['text'],
                         'Durham episcopal lordship')
        self.assertEqual(inventory.entries['ecclesiasticalProfile.sanctuary_temporal.name.default']['text'],
                         'Sanctuary community government')

    def test_1204_terrain_labels_and_beginnings_have_structured_owners(self):
        inventory = i18n_catalog.Inventory()
        i18n_catalog.extract_structured(inventory)
        entries = inventory.entries
        self.assertEqual(entries['province.1204.gurganj_district.name.default']['text'], 'Gurganj')
        self.assertEqual(entries['realm.1204.qara_khitai_1204.name.default']['text'], 'Qara Khitai suzerainty')
        self.assertEqual(entries['culture.khitan_court_1204.name.default']['text'], 'Khitan court')
        self.assertEqual(entries['realm.1204.jenne_households_1204.name.default']['text'], 'Jenne-jeno')
        self.assertEqual(entries['scenario.muhammad_1204.name.default']['text'], 'Muhammad II at Gurganj')
        self.assertEqual(entries['settlement.1204.siwa_oasis_inhabited_1204.name.default']['text'], 'Shali')
        self.assertEqual(entries['settlement.1204.nurata_foothills_inhabited_1204.name.default']['text'], 'Nur')
        for scenario in ('muhammad_1204', 'siwa_delegate_1204'):
            for field in ('name', 'desc', 'intro'):
                self.assertIn(f'scenario.{scenario}.{field}.default', entries)
            self.assertIn(f'scenario.{scenario}.familyPresets.standard.desc.default', entries)
        self.assertFalse(any(key.startswith('constituencyMember.middle_niger_1204.')
                             or key.startswith('scenario.niger_delegate_1204.') for key in entries))

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
