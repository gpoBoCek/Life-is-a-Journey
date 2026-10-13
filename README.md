# Life is a Journey

A personal, minimalist life RPG in the style of an old terminal game: rituals, errands, steps, and therapeutic
"arts" written in fantasy language, on an endless road that grows from the days you live.

## The phone app

`docs/` is the installable app, served by GitHub Pages (Settings → Pages → Deploy from a branch → `main` / `/docs`).
Open the Pages address in Chrome on Android and choose **Install app**.

- **Updates:** every push that changes `docs/` is a new version. The app loads the newest page whenever it opens
  online, and shows an UPDATE notice if a new version appears while it is open.
- **Data:** the journey is stored on the phone (localStorage, same key in every version) and is never part of the
  code. An update replaces the code only. The first time a new version opens, a copy of the record is kept aside
  (last 3), restorable from Options → Your data. Uninstalling the app or clearing Chrome's data for the site would
  remove the record, so save a backup file now and then (Options → Your data).
- **Offline:** works without a connection; the service worker keeps the last version.

## Working on it

```
python3 make_icons.py   # only when the icon changes
python3 build.py        # writes dist/ (artifact preview, local test page) and docs/ (the phone app)
python3 test_app.py     # and the other test_*.py files (Playwright)
```

Source lives in `src/`: `app.js` (logic and screens), `style.css`, and the content files for spells, regions and
the bestiary. `build.py` bundles everything, including the embedded VT323 font, into a single page.

`BUILD` is a hash of the code, so the phone is only told about an update when the code actually changed.

## Credits

VT323 font by Peter Hull, SIL Open Font License 1.1.
