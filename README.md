# KejaHaunt Web MVP

KejaHaunt is a student-first housing finder built from the `KejaHaunt_Analysis.ipynb` notebook. This MVP turns the notebook's Nairobi student housing insights into a fast static website that can be deployed immediately.

## What it does

- helps students filter zones by campus, budget, room type, meter type, and walking tolerance
- estimates monthly burn using rent, matatu, electricity, and a basic essentials buffer
- highlights top-value areas from the notebook findings
- surfaces a practical house-viewing checklist and scam red flags

## Project files

- `index.html`: page structure and content
- `styles.css`: responsive UI and visual design
- `app.js`: area data, filtering logic, rankings, and checklist rendering
- `KejaHaunt_Analysis.ipynb`: original analysis notebook

## Run locally

You only need Python and a browser.

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:4173
```

If you do not want to use `npm`, you can run:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

## Validate the JavaScript

```bash
npm run check
```

## Deploy

This app is static, so it works well on:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### Vercel

- import the repo
- use the default static deployment
- no build command is required
- output directory: `.`

### Netlify

- import the repo
- build command: leave empty
- publish directory: `.`

## Data note

The site uses synthetic but research-calibrated data based on Nairobi 2025/26 student housing conditions. It is best understood as a decision-support tool, not a live listing platform.

## Good next upgrades

- connect to real listings in a JSON, Airtable, Supabase, or Firebase backend
- add maps and stage-level commute views
- let users compare two or three areas side by side
- move to React or Next.js once the product flow settles
