# Pokemon Odyssey Team Planner

Static, client-side team planner for Pokemon Odyssey v4.1.1.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Regenerate data

```bash
python3 scripts/extract_odyssey_data.py
```

The generator reads the v4.1.1 spreadsheets and teambuilding PDF from `~/Downloads` by default. Override paths with `ODYSSEY_STATS_XLSX`, `ODYSSEY_WILD_XLSX`, `ODYSSEY_LEVELS_XLSX`, and `ODYSSEY_TEAMBUILDING_PDF`.

## Deploy

This is a static site. It can be hosted from the repository root with GitHub Pages.
