North Atlantic physical geography

Implemented definition

data/geography_north_atlantic.js declares europe_north_atlantic_2 as an additive child of europe_regional_2. Its window is longitude -25 to 70 and latitude 13 to 67.5, with gridWidth 1290. The projection formula gives a height of 1078. There are 540 physical anchors: the parent's ordered 527 plus thirteen scenery additions. Registering the geography creates no inhabited county, court, institution, dated layout or playable beginning. Existing bookmarks and revisions retain their selections.

Source evidence

NE01. Attested dataset statement: Natural Earth, Land, Download land and About, identifies the 1:10 million land layer as version 5.1.1 and describes its derivation from the coastline layer. https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ . Checked 2026-10-16. This supplies modern reference geometry, without asserting medieval shorelines or island populations.

NE02. Attested licence statement: Natural Earth, Terms of Use, opening paragraphs, places its vector and raster data in the public domain and permits modification and redistribution. https://www.naturalearthdata.com/about/terms-of-use/ . Checked 2026-10-16. The coordinate literals are independently derived from this public source.

NE03. Independently inspected input: https://naturalearth.s3.amazonaws.com/5.1.1/10m_physical/ne_10m_land.zip . The downloaded archive is 3269070 bytes, SHA-256 e547d749445eaa0964aba76738090ec88f5e63c4585122170f98c67a7ea922dc. The geometry member is ne_10m_land.shp. No archive, shapefile or network request is needed by the game. tools/north_atlantic_coast.py is an offline standard-library authoring tool accepting that archive and printing the selected coordinate arrays with provenance. It rejects a different archive hash.

NE04. Reconstruction of physical localities: each island ring below is an individual connected source outline, without joining islands into bounding boxes. Lewis/Harris is source record 6, part 89, whose bounds are approximately -7.12645 to -6.15071 longitude and 57.73334 to 58.51203 latitude. The retained lewis seed at -6.4,58.2 lies inside that independently selected outline. Physical membership establishes no dated sovereignty or landing rights.

NE05. Simulation choices: the new district coordinates, terrain, boundaries, routing classes and radius are coarse game abstractions. The six Icelandic coastal anchors and three interior anchors represent regions rather than historical administrative borders. The Faroes, Orkney and Shetland each aggregate several islands into one county. Caithness is a mainland landing district. All thirteen additions start as wasteland, with no community, realm, title group or settlement presentation. Existing ordinary settlement can materialize scenery; mountain or tundra terrain does not create permanently excluded ice.

Derivation

Selection windows, in lonMin,latMin,lonMax,latMax order: Iceland -25,63,-13,67; Faroes -8,61.3,-6,62.5; Orkney -3.6,58.65,-2.2,59.5; Shetland -2.2,59.5,-0.6,61. Select wholly contained individual source rings, never a rectangular land envelope. Lewis/Harris is selected independently by its record and part. Shapefile record numbers below are one-based and part numbers zero-based. Repeated closing coordinates are omitted; game polygons close implicitly.

Simplification projects longitude/latitude into the child Mercator raster, pins all four coordinate extremities, splits the ring at those anchors and applies Douglas-Peucker separately to each arc. Iceland also pins the coast vertices nearest its district anchors and candidate southwestern/eastern localities. Its tolerance is 3 pixels; the smaller islands start at 0.25 pixels. After rounding to five decimals, crossing chords trigger a halved tolerance on the affected rings. Bordoy and Vidoy require 0.0625 pixels; Shetland Mainland and Bressay require 0.125 pixels. The final inventory below records these actual tolerances. These values and the retained inventory are simulation choices, not archaeological shoreline precision. Pixel survival, sound widths, phone appearance and in-game site placement require owner review.

The retained inventory contains 26 independent rings. The Iceland mainland includes its Westfjords, western peninsulas and northern/eastern/southern coast sectors. Subsidiary Icelandic islands, Greenland and Surtsey are absent. The Faroese minimum keeps ten rings; the Orcadian minimum eight; the Shetland minimum six. Optional outlines are listed below with zero shipped vertices. No omitted ring is merged into a neighbor, and no modern bridge or causeway is added. Narrow sounds can be below one pixel at this scale even when vector rings are disjoint; the water witnesses and final raster belong to the owner-run acceptance.

Retained ring inventory

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Streymoy: Natural Earth 5.1.1 record 6, part 92; 77 source vertices, 21 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Eysturoy: Natural Earth 5.1.1 record 6, part 93; 95 source vertices, 27 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Vagar: Natural Earth 5.1.1 record 3, part 326; 61 source vertices, 19 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Suduroy: Natural Earth 5.1.1 record 3, part 324; 73 source vertices, 21 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Sandoy: Natural Earth 5.1.1 record 3, part 325; 32 source vertices, 8 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Bordoy: Natural Earth 5.1.1 record 5, part 140; 51 source vertices, 31 shipped vertices, 0.0625 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Vidoy: Natural Earth 5.1.1 record 4, part 1317; 26 source vertices, 18 shipped vertices, 0.0625 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Kunoy: Natural Earth 5.1.1 record 4, part 1315; 14 source vertices, 5 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Kalsoy: Natural Earth 5.1.1 record 4, part 1316; 19 source vertices, 4 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Svinoy: Natural Earth 5.1.1 record 4, part 1312; 17 source vertices, 5 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Orkney Mainland: Natural Earth 5.1.1 record 3, part 312; 127 source vertices, 44 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Hoy: Natural Earth 5.1.1 record 3, part 311; 44 source vertices, 10 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

South Ronaldsay: Natural Earth 5.1.1 record 5, part 130; 27 source vertices, 11 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Westray: Natural Earth 5.1.1 record 3, part 314; 53 source vertices, 13 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Rousay: Natural Earth 5.1.1 record 2, part 193; 25 source vertices, 6 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Eday: Natural Earth 5.1.1 record 3, part 313; 34 source vertices, 7 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Sanday: Natural Earth 5.1.1 record 5, part 131; 57 source vertices, 15 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Stronsay: Natural Earth 5.1.1 record 4, part 492; 40 source vertices, 14 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Shetland Mainland: Natural Earth 5.1.1 record 6, part 91; 416 source vertices, 182 shipped vertices, 0.125 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Yell: Natural Earth 5.1.1 record 3, part 322; 75 source vertices, 23 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Unst: Natural Earth 5.1.1 record 3, part 323; 67 source vertices, 15 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Fetlar: Natural Earth 5.1.1 record 4, part 510; 26 source vertices, 9 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Bressay: Natural Earth 5.1.1 record 4, part 1307; 21 source vertices, 10 shipped vertices, 0.125 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Whalsay: Natural Earth 5.1.1 record 4, part 1308; 20 source vertices, 5 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Lewis and Harris: Natural Earth 5.1.1 record 6, part 89; 360 source vertices, 91 shipped vertices, 0.25 pixel tolerance. Retained as an independent island ring in the implemented physical inventory.

Omitted source ring inventory

Each entry below uses the same pinned source version and regional selection above. Tolerance is not applied and shipped vertex count is zero. These optional offshore, minor or coastal-fragment rings have no required seed or site in this physical definition. Their omission keeps the implemented minimum inventory bounded; it makes no dated occupation claim. Close and phone-size acceptance of the resulting map remains pending. Heimaey is optional and absent; the source ring at 8/2465 is also absent, without introducing modern Surtsey. Orkney has no omitted ring in its selection window. The literal tidal Brough of Birsay islet is not invented from a Mainland locality.

Shetland: Natural Earth 5.1.1 record 4, part 495; 17 source vertices; tolerance not applied; 0 shipped vertices. Optional non-seed-bearing outline omitted from the minimum inventory. Source extent -1.65128,59.51411,-1.58239,59.56025.

Shetland: Natural Earth 5.1.1 record 4, part 1305; 30 source vertices; tolerance not applied; 0 shipped vertices. Optional non-seed-bearing outline omitted from the minimum inventory. Source extent -1.36986,60.04361,-1.3048,60.11567.

Shetland: Natural Earth 5.1.1 record 4, part 1306; 11 source vertices; tolerance not applied; 0 shipped vertices. Optional non-seed-bearing outline omitted from the minimum inventory. Source extent -2.11229,60.11799,-2.04809,60.15729.

Faroes: Natural Earth 5.1.1 record 4, part 1311; 9 source vertices; tolerance not applied; 0 shipped vertices. Optional non-seed-bearing outline omitted from the minimum inventory. Source extent -7.64415,62.09614,-7.53673,62.11514.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Iceland: Natural Earth 5.1.1 record 1, part 26; 3062 source vertices, 126 shipped vertices, 3 pixel tolerance. Retained as a district-bearing mainland ring.

Inheritance and physical ownership

Parent polygons retain their order and coordinates. The child deep-copies retained land rings before appending the new rings, and copies complete names, climate, crossing and mapScale tables before extension. All retained mapScale values are unchanged: the new width approximately preserves longitudinal pixel density. Seas, rivers, default layout and dry landRoutes inherit in full. The sites field is omitted so future shared physical-site additions remain visible. No partial child table hides inherited sites. The original mainland cutoff at latitude 66 remains visible beneath the wider window; this definition adds no inferred northern Scandinavian or Russian coast.

The twelve new island/interior seeds have unrestricted extent. caithness alone uses maxRadiusKm 30. Projected-source inspection puts the nearest retained Hoy outline 37.27 Mercator-local kilometres from the Caithness seed and South Ronaldsay 41.26 kilometres away. Because unseeded source polygons use unrestricted nearest-seed competition, a mainland seed can otherwise acquire subsidiary Orkney land. The bounded landing district leaves the remaining Scottish mainland to retained unrestricted seeds, including Inverness and Elgin. The radius does not alter their coordinates or Britain's outline. Exact raster assignment and the required safety margin are checked by the focused specification; the source distances alone do not establish the compiled outcome.

The focused survey expects every retained Faroese, Orcadian and Shetland ring to survive and belong to its aggregate county, Lewis/Harris to lewis, and every Icelandic land cell to an Icelandic district. It checks all land for valid ownership, the seed-containing polygons, the mainland seam, surviving coastal districts and explicit water witnesses. Candidate southwestern Iceland, Kvivik, Toftanes, Tinganes, Birsay, Sumburgh and Tingwall neighborhoods are fixture-owned site probes, without production site registration or dated status. Lon remains unregistered pending its county and snap disposition. A medieval farm, assembly or town requires a separate dated declaration and evidence.

Water connections

The child retains all parent pairs and classes and adds seven distinct canonical pairs. bergen|shetland, orkney|shetland, caithness|lewis, faroes|lewis, faroes|shetland and faroes|iceland_east use open. caithness|orkney uses coastal. Coastal is a game timing class rather than a claim of sheltered Pentland waters. County endpoints abstract regions; they do not establish ports or scheduled sailings. No Atlantic connection is a dry landRoute, and no direct Faroes/southwestern Iceland shortcut is supplied.

Each adopting world must declare its own complete permitted straits and crossingClasses. Geography registration alone adds no edge to any existing campaign. Ordinary army crossings retain class clocks, transport capacity and technology modifiers. Ordinary household routes still count each sea edge as one route unit with the existing leg clock. Weather, boats, intra-county island transit and realistic sailing durations are outside this definition's behavior. An adopting world must accept that abstraction before promising household travel.

Compatibility and review

Stable geography and revision identities retain their existing meanings. No old save is migrated to the new raster. The new specification imports a fictional complete survey through the ordinary JSON store, then checks activation, projection, cached-world identity, county hit tests, site compilation, crossing clocks and matching old/new save restores. It also rejects malformed detached geography imports and mismatched saved geography stamps without mutation. The retained parity fixtures are unchanged. This content adds no engine dispatch, saved field, technology prerequisite or content-id literal in js/.

Owner rerun from tests/e2e/: npx playwright test specs/north-atlantic-geography.spec.js specs/geography-base.spec.js specs/bookmark-geography-coverage.spec.js specs/bookmark-requirements.spec.js specs/bookmark-expansion-review.spec.js specs/settlement-engine.spec.js specs/settlement-real-data.spec.js specs/parity-raster.spec.js specs/wasteland-save.spec.js

Owner review also covers the four archipelagos and Lewis/Harris at close and phone size, narrow sounds, site marker displacement, cold activation and first paint, repeated world switching, memory and serialized saves on actual target devices. No measured performance or historical acceptance result follows from the coordinate derivation or projection arithmetic.
