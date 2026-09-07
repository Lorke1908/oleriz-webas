# Northbound — recruitment agency site

Bilingual static site. Lithuanian is the default and lives at the root; English
lives under `/en/`.

| | Lithuanian | English |
|---|---|---|
| Homepage | `/` | `/en/` |
| All open roles | `/roles.html` | `/en/roles.html` |
| After the contact form | `/thanks.html` | `/en/thanks.html` |

Live at **https://lorke1908.github.io/oleriz-webas/**

## Editing the site

Everything is editable at **[app.pagescms.org](https://app.pagescms.org)** — sign in
with GitHub and pick this repo. Five screens:

- **Job postings — Lithuanian** → shown on the Lithuanian pages
- **Job postings — English** → shown on the English pages
- **Website text — Lithuanian** → every word on the Lithuanian pages
- **Website text — English** → every word on the English pages
- **Site settings** → email, phone, address, Formspree ID — shared by both languages,
  so you only fill these in once

Save, and the site rebuilds and republishes itself in about a minute.

The two job lists are separate on purpose: a role you want on both sites is added
to both lists. The category, work-location and contract-type dropdowns are
translated per language, so the filter buttons read correctly on each side.

## Files

| File | What it is |
|---|---|
| `content.lt.json` / `content.en.json` | All the words, one file per language |
| `jobs.lt.json` / `jobs.en.json` | Job postings, one list per language |
| `site.json` | Settings shared by both languages |
| `template.html` | Homepage layout |
| `template-roles.html` | All-roles page layout |
| `template-thanks.html` | Thank-you page layout |
| `partials/` | Shared `<head>`, header and footer |
| `styles.css` | All styling, for every page |
| `site.js` | Loads and renders the job lists, and the mobile menu |
| `build.py` | Renders every template, in both languages |
| `.pages.yml` | Defines the editing screens |

**The HTML pages are generated — do not edit them.** `index.html`, `roles.html`,
`thanks.html` and everything in `en/` are rebuilt on every deploy and are not
stored in the repo. Edit the templates and the JSON instead.

## Working locally

```
py build.py            # regenerate all six pages
py -m http.server 8000 # then open http://localhost:8000
```

The job lists are loaded with `fetch()`, which browsers block on `file://`, so
open the site through that local server rather than double-clicking a page.

Check every data file parses before pushing:

```
py -c "import json,io; [json.load(io.open(f,encoding='utf-8')) for f in ('site.json','content.lt.json','content.en.json','jobs.lt.json','jobs.en.json')]; print('ok')"
```

## The contact form

Both languages post to the same [Formspree](https://formspree.io) form. To switch
it on: create a free form, then put the code from its address (the part after
`/f/`) into **Site settings → Formspree form ID**.

Until that is filled in, both versions show an "Email us" button instead of a
form, so visitors always have a way to reach you. Submissions redirect to the
thank-you page in the language the visitor was using, and the subject line tells
you which version they wrote from.

## Templating

`build.py` implements a small subset of Mustache:

- `{{ key }}` / `{{ nested.key }}` — insert a value, HTML-escaped
- `{{#key}}` … `{{/key}}` on their own lines — repeat for each item in a list, or
  render once if the value is set; `{{ . }}` is the item itself
- `{{^key}}` … `{{/key}}` — render only when the value is empty or missing
- `{{> partials/header.html }}` — include another file, keeping the indentation

Each page is rendered once per language. `{{paths.*}}` holds the links out of the
page being built, so the same template works at the root and inside `/en/`.

A missing key fails the build with a clear message rather than publishing a page
with a hole in it. Since publishing only happens on a successful build, a broken
edit leaves the current site live and untouched.
