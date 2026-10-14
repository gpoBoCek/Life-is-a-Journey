# Life is a Journey: notes for Claude

Daniel's personal life RPG (terminal look, fantasy wording, clinically grounded arts). He uses it daily on an
Android phone as an installed web app served by GitHub Pages from `docs/`.

## Workflow for any change
1. Edit `src/` (never edit `docs/` or `dist/` by hand; they are build output).
2. `python3 build.py`, then run every `test_*.py` (Playwright, Chromium preinstalled). Add a test for new behaviour.
3. Commit and push to `main`. Pages republishes `docs/`; the phone shows an UPDATE bar or loads it on next open.
4. Also republish the claude.ai artifact preview from `dist/life-is-a-journey.html` when working in a session that
   has it (same URL), so the preview matches.

## Never break the saved journey
- Data lives in the phone's localStorage under `lij.state.v1`. Never rename the key or change `v: 1` semantics.
- Every schema change goes through `migrate()` and must keep old records readable; never delete user records.
- `lij.snapshots.v1` keeps copies from before the last 3 updates (restorable in Options). Keep that working.
- Leagues anti-cheat: only a day that ends with a real deed on the record counts; undo removes it. Steps and weight
  never count toward leagues (statistics and mana only). Weight progress is judged by the 7-day average.
- Mana is derived from the record. If the way it is counted changes, bump `MANA_RULES` so releases are only compared
  with releases counted the same way. Mage classes are granted only at a release and never taken away (`S.mana.rank`).
- Keep tests and example text free of Daniel's personal details: this repository is public.
