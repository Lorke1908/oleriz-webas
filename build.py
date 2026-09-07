#!/usr/bin/env python3
"""Render index.html from template.html + content.json.

Run by GitHub Actions on every push, so the published page always matches
what's in content.json. To see your changes locally:

    py build.py && py -m http.server 8000
"""
import html
import io
import json
import re
import sys

BLOCK_OPEN = re.compile(r'^[ \t]*\{\{([#^])\s*([\w.]+)\s*\}\}[ \t]*$')
BLOCK_CLOSE = re.compile(r'^[ \t]*\{\{/\s*([\w.]+)\s*\}\}[ \t]*$')
VAR = re.compile(r'\{\{\s*([\w.]+|\.)\s*\}\}')


def lookup(stack, key, default=KeyError):
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
    if default is KeyError:
        raise KeyError("content.json has no value for {{%s}}" % key)
    return default


def render(lines, stack, out):
    i = 0
    while i < len(lines):
        m = BLOCK_OPEN.match(lines[i])
        if not m:
            line = VAR.sub(
                lambda mo: html.escape(str(lookup(stack, mo.group(1))), quote=False),
                lines[i])
            out.append(line)
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
            raise SyntaxError("template.html: {{%s%s}} is never closed" % (kind, key))

        body = lines[i + 1:j]
        value = lookup(stack, key, default=None)
        if kind == '^':
            # inverted section: render only when the value is empty/missing
            if not value:
                render(body, stack, out)
        else:
            for item in (value if isinstance(value, list) else [value] if value else []):
                render(body, stack + [item], out)
        i = j + 1


def main():
    content = json.load(io.open('content.json', encoding='utf-8'))
    template = io.open('template.html', encoding='utf-8').read()
    out = []
    render(template.split('\n'), [content], out)
    io.open('index.html', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
    print("built index.html from template.html + content.json")


if __name__ == '__main__':
    try:
        main()
    except (KeyError, SyntaxError) as e:
        sys.exit("BUILD FAILED: %s" % e)
