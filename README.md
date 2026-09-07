# Northbound — recruitment agency site

Live at **https://lorke1908.github.io/oleriz-webas/**

## Editing the site

Everything is editable at **[app.pagescms.org](https://app.pagescms.org)** — sign in
with GitHub, pick this repo. Two screens:

- **Job postings** — add, edit and remove open roles
- **Website text** — every heading, paragraph, bullet, FAQ answer and your contact details

Save, and the site updates itself in about a minute. You never need to touch the
files below.

## Files

| File | What it is |
|---|---|
| `content.json` | All the words on the page ("Website text" in the editor) |
| `jobs.json` | The job postings ("Job postings" in the editor) |
| `template.html` | The page layout, styling and scripts |
| `build.py` | Puts `content.json` into `template.html` to produce `index.html` |
| `thanks.html` | Confirmation page after the contact form is sent |
| `.pages.yml` | Defines the editing screens |
| `.github/workflows/deploy.yml` | Rebuilds and publishes on every push to `main` |

**`index.html` is generated — do not edit it.** It is rebuilt from
`template.html` + `content.json` on every deploy and is not stored in the repo.
Edit `template.html` for layout, `content.json` for words.

## Working locally

```
py build.py            # regenerate index.html
py -m http.server 8000 # then open http://localhost:8000
```

`jobs.json` is loaded with `fetch()`, which browsers block on `file://` — so open
the site through that local server, not by double-clicking `index.html`.

Check both data files parse before pushing:

```
py -c "import json,io; [json.load(io.open(f,encoding='utf-8')) for f in ('content.json','jobs.json')]; print('ok')"
```

## The contact form

The form posts to [Formspree](https://formspree.io). To switch it on:

1. Create a free Formspree account and a new form.
2. Formspree gives you an address like `https://formspree.io/f/abcdwxyz`.
3. Put the last part (`abcdwxyz`) into **Website text → Section: Contact →
   Formspree form ID**.

Until that field is filled in, the page shows an "Email us" button instead of a
form, so visitors always have a way to reach you. Submissions redirect to
`thanks.html`.

## Templating

`build.py` implements a small subset of Mustache:

- `{{ key }}` and `{{ nested.key }}` — insert a value, HTML-escaped
- `{{#key}}` … `{{/key}}` on their own lines — repeat for each item in a list,
  or render once if the value is set; `{{ . }}` is the item itself
- `{{^key}}` … `{{/key}}` — render only when the value is empty or missing

A missing key fails the build with a clear message rather than publishing a page
with a hole in it. Because the deploy only publishes on a successful build, a
broken edit leaves the previous version live.
