# Upwork Radar

Scan, score, and shortlist freelance opportunities that fit your edge.

![Upwork Radar preview](docs/preview.svg)

Upwork Radar is a local-first opportunity board for freelancers who want to qualify leads faster and pitch with more intent. Instead of staring at a messy saved-jobs list, it keeps budget, timing, proposal angle, and win probability visible in one place.

## What it does

- ranks freelance leads by fit, budget, deadline pressure, and effort
- tracks **budget**, **deadline**, **win chance**, **deliverable**, and **proposal angle** for each lead
- highlights the strongest current bet, the closest deadline, and the largest opportunity
- includes quick actions for moving a lead into applying, copying a proposal opener, and marking low-value jobs as passed
- renders a deadline queue and proposal snapshot beneath the main board
- saves locally in the browser with JSON import/export backups

## Why it feels different

Upwork Radar is less about tracking every gig and more about choosing the ones that deserve your best energy. It is built for freelancers who want a cleaner shortlist and a sharper proposal hook before they start writing.

## Quick start

```bash
git clone https://github.com/get2salam/upwork-radar.git
cd upwork-radar
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Keyboard shortcuts

- `N` creates a new lead
- `/` focuses the search box
- `↑` / `k` selects the previous lead in the board
- `↓` / `j` selects the next lead in the board
- `Home` / `g` jumps to the top of the board
- `End` / `G` jumps to the bottom of the board
- `Esc` clears the search box or exits the lead editor

The board scrolls to keep the active lead in view as you navigate.

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
      "winChance": 8,
      "budget": 3200,
      "deadline": "2026-04-28",
      "deliverable": "Clickable prototype and scoped technical plan"
    }
  ]
}
```

## Scoring preview

See how the ranking engine orders a sample board without opening a browser:

```bash
node examples/score-leads.mjs
```

To rank your own data, export a board backup and pass the file path:

```bash
node examples/score-leads.mjs --file my-backup.json
```

The script accepts either a bare JSON array or the full export object (with an
`items` key) and prints a ranked table showing priority, budget, deadline, and
status for every lead. No install step, no dependencies.

## Local checks

The scoring and proposal helpers live in `js/lead-engine.js` and have a `node:test` suite. Run it with any modern Node (no install step, no dependencies):

```bash
node --test tests/lead-engine.test.mjs
```

The same command runs in CI on every push and pull request.

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
