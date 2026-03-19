# Google Sheets Prefab Feed

Files here are the handoff for moving prefab storage into Google Sheets + Apps Script.

What to copy:
- `Code.gs`: the web app backend
- `prefabs-seed.csv`: paste into the `Prefabs` sheet as the initial catalog
- `prefabs-seed.json`: same data in JSON if you prefer to script the import

Expected sheet columns:
- `name`
- `label`
- `base`
- `overlay`
- `position`
- `sizeMode`
- `x`
- `y`
- `unit`
- `subSize`
- `rotate`
- `opacity`
- `updatedAt`

Setup:
1. Create a new Google Sheet.
2. Add a sheet named `Prefabs`.
3. Paste `prefabs-seed.csv` into cell `A1`.
4. Open `Extensions -> Apps Script`.
5. Replace the default script with `Code.gs`.
6. Deploy as a web app with access for anyone who should load/save prefabs.
7. Copy the web app URL into [`config/prefab-api.js`](../config/prefab-api.js) as `endpoint`.

Notes:
- `doGet` returns `{ ok, prefabs, count }`.
- `doGet?action=save&...` upserts by `name`.
- `doPost` still works as a fallback.
- There is no delete route.
- The script enforces a global daily submission cap with `DAILY_SUBMISSION_LIMIT`.
- The script validates alias names, 7x7 grid positions, numeric bounds, and rotate/unit values before writing.
- The preferred save path is now query-string based because it is more reliable from GitHub Pages.
- After changing `Code.gs`, redeploy the Apps Script web app so the new `doGet?action=save` path is live.
