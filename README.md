# Upwork Radar

Scan, score, and shortlist freelance opportunities that fit your edge.

![Upwork Radar preview](docs/preview.svg)

Upwork Radar is a small local-first planning tool for solo builders, operators, and creative teams who want a cleaner way to manage leads. Add items, score the signal, track the friction, and keep the strongest opportunities visible without needing a backend or build step.

## Features

- Local-first persistence with `localStorage`
- Search and filter controls
- Ranked list sorted by signal minus friction
- Inline editor for title, notes, type, status, score, and effort
- Import/export JSON backups
- Re-seed action for resetting the sample board
- Keyboard shortcuts: `N` for new, `/` for search
- No build tooling, just open in a browser

## Quick start

```bash
git clone https://github.com/<you>/upwork-radar.git
cd upwork-radar
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Data shape

```json
{
  "boardTitle": "Opportunity radar",
  "items": [
    {
      "title": "Legal AI prototype request",
      "category": "AI",
      "state": "Shortlisted",
      "score": 9,
      "effort": 4
    }
  ]
}
```

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
