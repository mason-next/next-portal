"""Build presentations/quote-068918-v1/presentation.html (MDC Wolfson Bldg 1 Auditorium AV, Quote #068918 v1)."""
import os, sys, html
from decimal import Decimal as D
sys.path.insert(0, os.path.dirname(__file__))
import data
from parts import *  # noqa  (section builders)

HERE = os.path.dirname(__file__)
OUT = sys.argv[1]
data.check()

base_css = open(os.path.join(HERE, "base.css")).read()
extra_css = open(os.path.join(HERE, "extra.css")).read()

from parts import RULES, RESPONSIVE, ICONS, THUMBS, hero, overview, system, control, equipment, scope, invest, why, footer, SCRIPT

BODY = {k: f() for k, f in [("hero", hero), ("overview", overview), ("system", system), ("control", control), ("equipment", equipment), ("scope", scope), ("invest", invest), ("why", why), ("footer", footer)]}
page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Miami Dade College — Building 1 Auditorium AV Upgrade | Mason Technologies</title>
<style>
{base_css}
{extra_css}
  /* ── GENERATED STATE RULES (tabs, sub-tabs, consoles, filters) ── */
{chr(10).join('  ' + r for r in RULES)}
{RESPONSIVE}
</style>
</head>
<body>

<!-- Inline icon sprite (descriptive SVG icons, no emoji) -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
{ICONS}
{THUMBS}
</svg>

<!-- Tab state: radios come first so the nav, tab bar and panes can react to them with CSS alone -->
{TAB_INPUTS}

<!-- 1. STICKY NAV -->
<nav class="site-nav" aria-label="Presentation">
  <div class="nav-logos">
    <img src="mason-logo-white.png" alt="Mason Technologies" class="nav-mason-logo">
    <div class="nav-divider"></div>
    <img src="mdc-logo-white.svg" alt="Miami Dade College" class="nav-customer-logo">
    <div class="nav-divider sub-divider"></div>
    <div class="nav-subtitle"><strong>Miami Dade College · Wolfson Campus</strong>Quote #068918 · Building 1 Auditorium AV Upgrade</div>
  </div>
  <div class="nav-links">
    <label for="t-overview">Overview</label>
    <label for="t-equipment">Components</label>
    <label for="t-invest">Investment</label>
    <label for="t-why" class="nav-cta">Contact</label>
  </div>
</nav>

{BODY['hero']}

<!-- TAB BAR -->
<div class="tabbar" id="tabs">
  <div class="tabbar-inner" role="tablist" aria-label="Presentation sections">
{TABBAR}
  </div>
</div>

<main>
{BODY['overview']}
{BODY['system']}
{BODY['control']}
{BODY['equipment']}
{BODY['scope']}
{BODY['invest']}
{BODY['why']}
</main>

{BODY['footer']}

<script>
{SCRIPT}
</script>

</body>
</html>
"""
with open(OUT, "w") as f:
    f.write(page)
print("wrote", OUT, len(page) // 1024, "KB")
