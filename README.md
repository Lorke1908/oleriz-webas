# Northbound — recruitment agency site

A static one-page site. No build step, no dependencies.

| File | What it is |
|---|---|
| `index.html` | The whole site — markup, CSS and JS inline |
| `jobs.json` | **The job postings.** Edit this to change what's listed |
| `thanks.html` | Confirmation page shown after the contact form is sent |
| `.github/workflows/deploy.yml` | Publishes to GitHub Pages on every push to `main` |

## Adding or removing a job

Edit `jobs.json` and push. Nothing else needs touching — the category
filter chips are generated from whatever categories are in the file.

```json
{
  "title": "Senior Accountant",
  "team": "Manufacturing group · 400 employees",
  "category": "Finance",
  "location": "Hybrid",
  "type": "Full-time",
  "salary": "€3,200–3,800 gross/mo",
  "experience": "5+ years",
  "level": "Senior",
  "link": "#contact"
}
```

`title`, `team`, `category`, `location`, `type` and `salary` are required.
`experience` and `level` are optional. `link` is where **Apply** goes —
leave it as `"#contact"` to send people to the contact form.

An empty list (`[]`) is fine: the page shows a "no open roles" message.

Check the file is valid before pushing — a JSON syntax error means no roles render:

```
py -c "import json,io; json.load(io.open('jobs.json',encoding='utf-8')); print('ok')"
```

## Previewing locally

`jobs.json` is loaded with `fetch()`, which browsers block on `file://`.
Opening `index.html` by double-clicking will show no roles. Serve it instead:

```
py -m http.server 8000
```

then open <http://localhost:8000>. Press Ctrl+C to stop.

## Deploying

Push to `main` and the workflow publishes the site. Watch it under the
repo's **Actions** tab; the live URL is on the **Settings → Pages** screen.

One-time setup after the first push: **Settings → Pages → Build and
deployment → Source → GitHub Actions**.
