#!/usr/bin/env python3
"""Build the site: renders every page, in every language.

    py build.py

Reads:
    site.json          shared settings (site address, Formspree ID)
    content.lt.json    all Lithuanian wording
    content.en.json    all English wording
    jobs.lt.json       Lithuanian job postings
    jobs.en.json       English job postings
    template*.html     page layouts, shared by both languages

Writes:
    index.html  roles.html  thanks.html          (Lithuanian, the default)
    en/index.html  en/roles.html  en/thanks.html (English)
"""
import html
import io
import json
import os
import re
import sys

# Lithuanian is the default language and lives at the site root.
LANGS = [
    {"code": "lt", "dir": "",   "label": "LT", "content": "content.lt.json", "jobs": "jobs.lt.json"},
    {"code": "en", "dir": "en", "label": "EN", "content": "content.en.json", "jobs": "jobs.en.json"},
]

PAGES = [
    {"template": "template.html", "out": "index.html",
     "title": "meta.title", "description": "meta.description"},
    {"template": "template-roles.html", "out": "roles.html",
     "title": "meta.roles_title", "description": "meta.roles_description"},
    {"template": "template-thanks.html", "out": "thanks.html",
     "title": "meta.thanks_title", "description": "meta.thanks_description",
     "noindex": True},
]

BLOCK_OPEN = re.compile(r'^[ \t]*\{\{([#^])\s*([\w.]+)\s*\}\}[ \t]*$')
BLOCK_CLOSE = re.compile(r'^[ \t]*\{\{/\s*([\w.]+)\s*\}\}[ \t]*$')
VAR = re.compile(r'\{\{\s*([\w.]+|\.)\s*\}\}')
INCLUDE = re.compile(r'^([ \t]*)\{\{>\s*([\w./-]+)\s*\}\}[ \t]*$', re.M)

_MISSING = object()


def lookup(stack, key, default=_MISSING):
    if key == '.':
        return stack[-1]
    parts = key.split('.')
    for scope in reversed(stack):
        cur = scope
        for p in parts:
            if isinstance(cur, dict) and p in cur:
                cur = cur[p]
            else:
                cur = None
                break
        if cur is not None:
            return cur
    if default is _MISSING:
        raise KeyError("no value for {{%s}}" % key)
    return default


def render(lines, stack, out):
    i = 0
    while i < len(lines):
        m = BLOCK_OPEN.match(lines[i])
        if not m:
            out.append(VAR.sub(
                lambda mo: html.escape(str(lookup(stack, mo.group(1))), quote=False),
                lines[i]))
            i += 1
            continue

        kind, key = m.group(1), m.group(2)
        depth, j = 1, i + 1
        while j < len(lines):
            o = BLOCK_OPEN.match(lines[j])
            if o and o.group(2) == key:
                depth += 1
            c = BLOCK_CLOSE.match(lines[j])
            if c and c.group(1) == key:
                depth -= 1
                if depth == 0:
                    break
            j += 1
        else:
            raise SyntaxError("{{%s%s}} is never closed" % (kind, key))

        body = lines[i + 1:j]
        value = lookup(stack, key, default=None)
        if kind == '^':
            if not value:
                render(body, stack, out)
        else:
            for item in (value if isinstance(value, list) else [value] if value else []):
                render(body, stack + [item], out)
        i = j + 1


def expand_includes(text, depth=0):
    """Replace {{> partials/x.html }} with that file, keeping the indentation."""
    if depth > 10:
        raise SyntaxError("includes nested too deeply - is a partial including itself?")

    def one(m):
        indent, name = m.group(1), m.group(2)
        try:
            body = io.open(name, encoding='utf-8').read()
        except IOError:
            raise SyntaxError("{{> %s }} - no such file" % name)
        body = expand_includes(body.rstrip("\n"), depth + 1)
        return "\n".join(indent + line if line.strip() else line
                         for line in body.split("\n"))

    return INCLUDE.sub(one, text)


def load(path):
    return json.load(io.open(path, encoding='utf-8'))


def paths_for(lang, page, site_url):
    """Relative links out of this page, plus absolute URLs for SEO tags."""
    root = "" if not lang["dir"] else "../"
    other = [l for l in LANGS if l["code"] != lang["code"]][0]
    other_root = root + (other["dir"] + "/" if other["dir"] else "")

    def abs_url(l, out):
        d = (l["dir"] + "/") if l["dir"] else ""
        return site_url + d + ("" if out == "index.html" else out)

    return {
        "root": root,
        "home": "index.html",
        # bare "#contact" on the homepage; "index.html#contact" from other pages
        "home_anchor": "" if page["out"] == "index.html" else "index.html",
        "roles": "roles.html",
        "thanks": "thanks.html",
        "jobs": root + lang["jobs"],
        "site_js": root + "site.js",
        "other_home": other_root + "index.html",
        "other_label": other["label"],
        "other_code": other["code"],
        "lang": lang["code"],
        "url_self": abs_url(lang, page["out"]),
        "url_thanks": abs_url(lang, "thanks.html"),
        "url_lt": abs_url(LANGS[0], page["out"]),
        "url_en": abs_url(LANGS[1], page["out"]),
    }


def main():
    site = load("site.json")
    site_url = site["url"]
    if not site_url.endswith("/"):
        site_url += "/"

    built = []
    for lang in LANGS:
        content = load(lang["content"])
        for page in PAGES:
            template = io.open(page["template"], encoding='utf-8').read()
            template = expand_includes(template)
            ctx = dict(content)
            ctx["site"] = site
            ctx["paths"] = paths_for(lang, page, site_url)
            ctx["page"] = {
                "title": lookup([ctx], page["title"]),
                "description": lookup([ctx], page["description"]),
                "noindex": page.get("noindex", False),
            }
            out_lines = []
            try:
                render(template.split('\n'), [ctx], out_lines)
            except (KeyError, SyntaxError) as e:
                raise SystemExit("BUILD FAILED in %s (%s): %s"
                                 % (page["template"], lang["code"], e))
            dest = os.path.join(lang["dir"], page["out"]) if lang["dir"] else page["out"]
            if lang["dir"]:
                os.makedirs(lang["dir"], exist_ok=True)
            io.open(dest, 'w', encoding='utf-8', newline='\n').write('\n'.join(out_lines))
            built.append(dest.replace(os.sep, "/"))

    print("built %d pages:" % len(built))
    for b in built:
        print("  ", b)


if __name__ == '__main__':
    main()
