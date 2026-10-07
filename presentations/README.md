# Customer quote presentations

Self-contained HTML quote presentations built to the *Mason Quote Presentation Style Guide (v3)*.
Each folder is one presentation; the matching `.zip` is the package uploaded through
**Sales → Quotes** in the portal (the upload route serves `presentation.html` and its relative assets).

| Folder | Customer / project | Quote |
| --- | --- | --- |
| `quote-068876-v1/` | Miami Dade College — Wolfson Building 1 Outdoor Paging | #068876 v1 |

To rebuild a ZIP after editing (files at the archive root, like the reference packages):

```sh
cd presentations/quote-068876-v1 && rm -f ../quote-068876-v1.zip && zip -qr ../quote-068876-v1.zip . -x '.*'
```

Product images in `assets/` are SVG illustrations. To use manufacturer photos instead,
drop a JPG/PNG into `assets/` and point the matching `<img src>` at it, following
the style guide's light/dark card background rules.
