# Customer quote presentations

Self-contained HTML quote presentations built to the *Mason Quote Presentation Style Guide*
(`Mason_Quote_Presentation_Style_Guide_v3.1.docx`, in this folder). Each `quote-XXXXXX-vN/` folder is
one presentation; the matching `.zip` is the package uploaded through **Sales → Quotes** in the portal
(the upload route serves `presentation.html` and its relative assets).

| Folder | Customer / project | Quote | Branch |
| --- | --- | --- | --- |
| `quote-068876-v1/` | Miami Dade College — Wolfson Building 1 Outdoor Paging | #068876 v1 | `claude/website-style-guide-wgcm87` |
| `quote-068877-v1/` | Miami Dade College — Wolfson Building 2 Breezeway AV | #068877 v1 | `claude/nifty-goodall-heux5g` |
| `quote-068918-v1/` | Miami Dade College — Wolfson Building 1 Auditorium AV Upgrade | #068918 v1 | `claude/ecstatic-keller-fwk4s3` |
| `quote-069114-v1/` | Eastern Band of Cherokee Indians — Multipurpose Room Video Processing System | #069114 v1 | `claude/funny-cerf-lczo55` |

Interactive pieces (tabs, simulators, filters, consoles) are driven by form controls and CSS, so they
work even where scripts are blocked; JavaScript only adds extras.

## Shared logo library

`_logo-library/<vertical>/` holds master copies of client logos (style guide §14). Copy from it into a
presentation's `edu-logos/`, `gov-logos/`, … folder rather than re-downloading.
`_logo-library/customers/` holds customer marks (for example MDC in blue and the white version for the
dark theme, and the EBCI seal). `_logo-library/government/` holds the approved government / public-sector
logos (style guide §14).

## Quote #068918 — generated page

`quote-068918-v1/presentation.html` is generated, because its Control Room consoles (ATEM switcher,
DM7 console, Q-SYS panel, Stream Deck) need several hundred CSS state rules. Edit the sources in
`_tools/quote-068918/` and rebuild:

```sh
python3 presentations/_tools/quote-068918/build.py presentations/quote-068918-v1/presentation.html
python3 presentations/_tools/quote-068918/assets.py presentations/quote-068918-v1/assets   # product illustrations
```

`data.py` holds every quote line item and checks that the extended prices and subtotals match the
quote PDF; the build stops if they don't.

## Rebuilding a ZIP

Files go at the archive root, like the reference packages:

```sh
cd presentations/quote-068918-v1 && rm -f ../quote-068918-v1.zip && zip -qr ../quote-068918-v1.zip . -x '.*'
```

Product images in `assets/` are SVG illustrations. To use manufacturer photos instead, drop a JPG/PNG
into `assets/` and point the matching `<img src>` at it, following the style guide's light/dark card
background rules.

## Quote #069114 — generated page

`quote-069114-v1/presentation.html` is generated from `_tools/quote-069114/`: `data.py` (every quote line,
checked against the quote's subtotals and total), `style.css`, `build.py` (page, room mode explorer, signal
tracer, who-provides-what filter) and `assets.py` (product illustrations).

```sh
python3 presentations/_tools/quote-069114/assets.py presentations/quote-069114-v1/assets
python3 presentations/_tools/quote-069114/build.py presentations/quote-069114-v1/presentation.html
cd presentations/quote-069114-v1 && rm -f ../quote-069114-v1.zip && zip -qr ../quote-069114-v1.zip . -x '.*'
```
