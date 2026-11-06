#!/usr/bin/env python3
"""Replace the <foreign> elements of a TEI file.

A <foreign> inside a <title> is removed, its content kept: the title of a work
is in italics already. Any other <foreign> becomes a <term>, which keeps its
attributes.

Only the tags of the <foreign> elements are rewritten: the rest of the file,
its indentation and its entities included, stays as it is. The titles that
lose a <foreign> and are not of type="work" are listed with their page, since
nothing will show them in italics any more.

Usage: scripts/foreign_to_term.py [data/domenico.xml]
"""

import re
import sys

TOKEN = re.compile(
    r"<!--.*?-->|<\?.*?\?>|<!\[CDATA\[.*?\]\]>|<!DOCTYPE[^>]*>"
    r"|<(/?)([A-Za-z_][\w.:-]*)((?:\s[^>]*?)?)(/?)>",
    re.S,
)
ATTRIBUTE = re.compile(r"""([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")


def attributes(source):
    return {m[1]: m[2] if m[2] is not None else m[3] for m in ATTRIBUTE.finditer(source)}


def main(path):
    xml = open(path, encoding="utf-8").read()
    labels = dict(
        re.findall(r'<surface[^>]*xml:id="([^"]+)"[^>]*>\s*<label>([^<]*)</label>', xml)
    )
    out = []
    last = 0
    # Each open element: [name, attributes, start offset, removed a foreign]
    stack = []
    page = text = None
    removed = []
    converted = 0
    for match in TOKEN.finditer(xml):
        closing, name, attrs, empty = match.groups()
        if name is None:
            continue
        replacement = None
        if not closing:
            if name == "pb":
                page = attributes(attrs).get("facs", "").lstrip("#")
            elif name == "text":
                text = attributes(attrs).get("xml:id")
            if name == "foreign":
                in_title = next((e for e in reversed(stack) if e[0] == "title"), None)
                if empty:
                    replacement = "" if in_title else f"<term{attrs}/>"
                else:
                    replacement = "" if in_title else f"<term{attrs}>"
                if in_title:
                    in_title[3] = True
                else:
                    converted += 1
                if not empty:
                    stack.append(["foreign", in_title is not None, match.start(), False])
            elif not empty:
                stack.append([name, attributes(attrs), match.start(), False])
        else:
            element = stack.pop()
            if element[0] != name:
                sys.exit(f"Mismatched </{name}> at offset {match.start()}")
            if name == "foreign":
                replacement = "" if element[1] else "</term>"
            elif name == "title" and element[3]:
                if element[1].get("type") != "work":
                    content = re.sub(r"<[^>]+>", "", xml[element[2] : match.end()])
                    removed.append((text, page, " ".join(content.split()), element[1]))
        if replacement is not None:
            out.append(xml[last : match.start()])
            out.append(replacement)
            last = match.end()
    out.append(xml[last:])
    open(path, "w", encoding="utf-8").write("".join(out))

    print(f"{converted} <foreign> made <term>.")
    print("Titles not of type=\"work\" that lost a <foreign>:")
    for text, page, content, attrs in removed:
        label = labels.get(page, "?")
        shown = " ".join(f'{k}="{v}"' for k, v in attrs.items())
        print(f"  {text}, page {label} ({page}): <title{' ' + shown if shown else ''}> {content}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/domenico.xml")
