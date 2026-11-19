# Civic records work

Qualified curiales may select **Keep records** through the ordinary Daily Focus
rules. Administration retains the same route, licensing and specialties. The
active character must have a chosen career beyond apprentice or unassigned rank,
be an adult, and satisfy the existing unlanded, home and available-system rules.
A civic or learned role alone does not qualify another profession.

`FBDATA.actionPolicies.keep_records.professions` declares the exact eligible
career ids. Native data lists `administration` and `curialis`. Ordinary JSON mods
may replace this complete policy with one to sixteen unique effective career
ids, including careers from the same import. The list must retain
`administration`; unknown ids, duplicate ids, extra fields and malformed lists
reject before publication. Qualification, age, travel and station restrictions
remain engine invariants, rather than authorable bypasses.

Selecting the focus spends no day and pays nothing. Actual working days use the
existing records routine: seasonal pay is `2 + Stewardship/4 + Learning/8`, plus
any existing career specialty effect, divided across ninety working days. The
same routine owns previews and training chances. Rest or another activity does
not accrue records pay. Daily focus validation rechecks current eligibility;
changing to an unrelated profession cannot retain records work. Existing
vocational household multipliers retain their named-profession matching rules.

The supported `curialis_476` opening at Ravenna can choose this livelihood without
accepting its separate council mandate. Records work grants no appointment,
judicial permission, land, treasury access, recognition or station advancement.
It changes neither saved career identities nor the save format. Other dated
opening visibility and story attachments remain their own declarations.

The independent ordinary JSON example
`tests/e2e/fixtures/authoring/civic-records.json` admits an invented archive career
instead of Curial Service while retaining Administration. It imports through the
normal Mods file picker and uses the same focus selection and daily payment
transaction as native data. Its household track waits for actual positive focus
income at home before completing, without adding a second reward. Focus text and previews retain their existing
localized structured-data owners.

Technology impact updates the owning `period_476_civic_career` declaration with
mode `none`. Ordinary civic accounts depend on qualified work, not a discovery;
this does not bypass Administration's existing training or examinations, and
public appointments remain separately authorized.

Focused coverage checks the supported curialis opening, zero payment on
selection, paid elapsed days, interruption and restored focus eligibility,
Administration and its existing specialty formula, unrelated and unqualified
careers, and pure atomic validation and ordinary import of the alternate policy.
