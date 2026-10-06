# Proposed financial v2 contract examples

All names, IDs, amounts and approvals in this directory are invented. These
files describe the proposed contract in `docs/DATA-CONTRACT-V2.md`. The current
FFOS app supports only expense backup v1; do not import v2 files into it.

- `valid-core-v2.json`: opening A=1,000,000; expense=100,000; income=200,000;
  transfer=300,000 to B. Expected A=800,000, B=300,000.
- `edited/deleted/restored-transfer-v2.json`: the transfer changes to 250,000,
  is soft-deleted, then restored; history and original movement IDs persist.
- `legacy-valid-v1.json` and `expected-migrated-v2.json`: Gregorian, Persian
  Jalali and Arabic-digit Jalali dates, optional description and false confirmed;
  three unassigned expenses, no invented bank account or movement.
- `legacy-blocked-v1.json`: fractional and unsafe amounts block migration.
- `explicit-resolutions.json` and `expected-resolved-v2.json`: illustrative
  user-approved values 2 and 100, with reasons and timestamps; these are not
  automatic recommendations or approvals for any real user's data. Raw values
  remain in the source archive.
- `empty-v2.json`: fresh empty dataset containing the explicit toman currency.
- `invalid-account-reference-v2.json` and `unbalanced-transfer-v2.json`: valid
  JSON Schema shape but broken semantic relationships; a full reader must reject
  these before clearing any database.

`manifest.json` records expected outcomes and keeps every execution scenario at
`not-implemented`. The fixture tests check example relationships, arithmetic,
history and source preservation only. They do not implement or prove a migration,
an atomic v2 restoration or browser/Android upgrade behavior for the new schema.
The separate Draft-07 JSON Schema checks structure; semantic rules are in the
contract and must be implemented and tested in the future service.
