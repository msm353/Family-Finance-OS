# Synthetic browser backup fixtures

These files contain invented expenses only. Use an isolated local origin with no
user data, such as `http://127.0.0.1:4187`, for browser backup tests.

- `legacy-v1.json`: two expenses totalling 200,000 toman, including a Persian
  Jalali date, an unconfirmed record and an optional description.
- `empty-v1.json`: valid empty backup for replacement and confirmation-cancel tests.
- `invalid.json`: malformed JSON that must not enable restoration.
- `unknown-version.json`: version 99 must be rejected before replacement.
- `invalid-date.json`: an impossible Gregorian date in the second record must
  reject the complete file, not restore only the first record.
- `duplicate-ids.json`: duplicate expense identifiers must reject the file.
- `legacy-amounts-v1.json`: invented fractional and unsafe integer amounts accepted
  by the current v1 format. This fixture records compatibility behavior only;
  future migration must handle these explicitly without silent rounding.

For the manual cancel check, restore `legacy-v1.json`, select `empty-v1.json`,
click Restore and cancel the browser confirmation. Both original records must
remain after a reload. Do not mark this check passed unless cancellation was
actually observed. See `docs/PREPARATION.md` for results and outstanding checks.

For the three valid-JSON rejection files, keep the two original records installed,
select each file, check the error and absence of a restore preview, then reload.
The two records and their 200,000 toman total must remain. Never restore the
amount-boundary fixture into a user's installation.
