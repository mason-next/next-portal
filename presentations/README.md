# Customer quote presentations

Self-contained HTML quote presentations built to the *Mason Quote Presentation Style Guide (v3)*.
Each folder is one presentation; the matching `.zip` is the package uploaded through
**Sales → Quotes** in the portal (the upload route serves `presentation.html` and its relative assets).

| Folder | Customer / project | Quote |
| --- | --- | --- |
| `quote-068876-v1/` | Miami Dade College — Wolfson Building 1 Outdoor Paging | #068876 v1 |

Interactive pieces (paging simulator, equipment filters, mobile menu) are driven by
form controls + CSS, so they work even where scripts are blocked; JavaScript only
adds extras (Pole/All-call buttons, clicking the diagram, scroll effects).

Client logos in `edu-logos/` are name tiles in each school's colors; replace them
with the official logo files (white or light versions for the dark cards) when available.

To rebuild a ZIP after editing (files at the archive root, like the reference packages):

```sh
cd presentations/quote-068876-v1 && rm -f ../quote-068876-v1.zip && zip -qr ../quote-068876-v1.zip . -x '.*'
```

Product images in `assets/` are SVG illustrations. To use manufacturer photos instead,
drop a JPG/PNG into `assets/` and point the matching `<img src>` at it, following
the style guide's light/dark card background rules.
