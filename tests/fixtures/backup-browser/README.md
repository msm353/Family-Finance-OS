# Synthetic browser backup fixtures

These files contain invented expenses only. Use an isolated local origin with no
user data, such as `http://127.0.0.1:4187`, for browser backup tests.

- `legacy-v1.json`: two expenses totalling 200,000 toman, including a Persian
  Jalali date, an unconfirmed record and an optional description.
- `empty-v1.json`: valid empty backup for replacement and confirmation-cancel tests.
- `invalid.json`: malformed JSON that must not enable restoration.

For the manual cancel check, restore `legacy-v1.json`, select `empty-v1.json`,
click Restore and cancel the browser confirmation. Both original records must
remain after a reload. Do not mark this check passed unless cancellation was
actually observed. See `docs/PREPARATION.md` for results and outstanding checks.
