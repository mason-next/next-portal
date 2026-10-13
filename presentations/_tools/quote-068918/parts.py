"""Shared helpers + content sections for quote #068918."""
import html as _h
from decimal import Decimal as D
import data

RULES = []
GOLD_SEL = "background: var(--gold); border-color: var(--gold); color: var(--navy); font-weight: 600;"


def esc(s):
    return _h.escape(s, quote=False)


def icon(name, cls="icon"):
    return f'<svg class="{cls}"><use href="#i-{name}"/></svg>'


def radios(name, ids, checked, labels=None, kind="radio"):
    out = []
    for i in ids:
        lab = (labels or {}).get(i, i)
        c = " checked" if (i == checked or (isinstance(checked, (set, list, tuple)) and i in checked)) else ""
        out.append(f'<input type="{kind}" name="{name}" id="{i}" class="sr"{c} aria-label="{esc(lab)}">')
    return "\n".join(out)


def subtabs(prefix, items, checked, scope_sel):
    """items: [(id, label, icon)] → inputs html, tab labels html; adds rules."""
    ins = radios(prefix, [i for i, _, _ in items], checked, {i: l for i, l, _ in items})
    labs = "".join(f'<label for="{i}">{icon(ic)}{l}</label>' for i, l, ic in items)
    for i, _, _ in items:
        RULES.append(f'#{i}:checked ~ .subpanes .sp-{i} {{ display: block; }}')
        RULES.append(f'#{i}:checked ~ .subtabs label[for="{i}"] {{ background: rgba(200,168,75,0.14); border-color: rgba(200,168,75,0.55); color: var(--gold); font-weight: 600; }}')
        RULES.append(f'#{i}:focus-visible ~ .subtabs label[for="{i}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}')
    return ins, f'<div class="subtabs">{labs}</div>'


def pane_next(text, target, btn):
    return f'<div class="pane-next"><span>{text}</span><label class="btn btn-ghost" for="{target}">{btn}{icon("arrow")}</label></div>'


# ── tabs ─────────────────────────────────────────────────────
TABS = [("t-overview", "Overview"), ("t-system", "System"), ("t-control", "Control Room"), ("t-equipment", "Equipment"),
        ("t-scope", "Scope & Support"), ("t-invest", "Investment"), ("t-why", "Why Mason")]
TAB_INPUTS = radios("tab", [t for t, _ in TABS], "t-overview", {t: f"{l} tab" for t, l in TABS})
TABBAR = "\n".join(f'    <label for="{t}" role="tab"><span class="n">{i+1:02d}</span>{esc(l)}</label>' for i, (t, l) in enumerate(TABS))
for t, _ in TABS:
    p = t[2:]
    RULES += [f'#{t}:checked ~ main #p-{p} {{ display: block; }}',
              f'#{t}:checked ~ .tabbar label[for="{t}"] {{ color: var(--gold); border-bottom-color: var(--gold); font-weight: 600; }}',
              f'#{t}:checked ~ .tabbar label[for="{t}"] .n {{ color: var(--gold); }}',
              f'#{t}:checked ~ nav .nav-links label[for="{t}"]:not(.nav-cta) {{ color: var(--gold); }}',
              f'#{t}:focus-visible ~ .tabbar label[for="{t}"] {{ outline: 2px solid var(--gold-light); outline-offset: -4px; }}']

ICONS = """  <symbol id="i-zones" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/></symbol>
  <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7"/></symbol>
  <symbol id="i-speaker" viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="14.5" r="3.5"/></symbol>
  <symbol id="i-array" viewBox="0 0 24 24"><path d="M5 3h14M6 5.5h12v3H6zM6.5 10h11l-.5 3h-10zM7.5 14.5h10l-1 3h-8.5zM9 19h8l-1.5 2.5h-5.5z"/></symbol>
  <symbol id="i-rack" viewBox="0 0 24 24"><rect x="3" y="3.5" width="18" height="17" rx="2"/><path d="M3 9.2h18M3 14.8h18"/><circle cx="6.5" cy="6.3" r=".6"/><circle cx="6.5" cy="12" r=".6"/><circle cx="6.5" cy="17.6" r=".6"/></symbol>
  <symbol id="i-cable" viewBox="0 0 24 24"><path d="M4 20c0-6 4-6 8-8s8-2 8-8"/><rect x="2.5" y="18" width="3" height="4" rx=".8"/><rect x="18.5" y="2" width="3" height="4" rx=".8"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M5 3v18M12 3v18M19 3v18"/><rect x="3" y="13" width="4" height="3" rx="1"/><rect x="10" y="6" width="4" height="3" rx="1"/><rect x="17" y="15" width="4" height="3" rx="1"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9"/></symbol>
  <symbol id="i-headset" viewBox="0 0 24 24"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2.5-5 2.5"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24"><path d="M3 12h4l2.5-5 4 10 2.5-5h5"/></symbol>
  <symbol id="i-escalate" viewBox="0 0 24 24"><path d="M4 19h4v-5h4V9h4V4h4"/><path d="M16 4h4v4"/></symbol>
  <symbol id="i-box" viewBox="0 0 24 24"><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/></symbol>
  <symbol id="i-truck" viewBox="0 0 24 24"><path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></symbol>
  <symbol id="i-building" viewBox="0 0 24 24"><path d="M4 21V5l8-2.5L20 5v16M2.5 21h19"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M8 16h2M14 16h2"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 4.8"/></symbol>
  <symbol id="i-award" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7.5 5-2.5 5 2.5-1.5-7.5"/></symbol>
  <symbol id="i-life" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
  <symbol id="i-video" viewBox="0 0 24 24"><rect x="2.5" y="4.5" width="19" height="12" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/></symbol>
  <symbol id="i-stage" viewBox="0 0 24 24"><path d="M3 19h18M5 19v-4h14v4"/><path d="M8 15V9l4-4 4 4v6"/></symbol>
  <symbol id="i-power" viewBox="0 0 24 24"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></symbol>
  <symbol id="i-network" viewBox="0 0 24 24"><rect x="9" y="2.5" width="6" height="5" rx="1"/><rect x="2.5" y="16.5" width="6" height="5" rx="1"/><rect x="15.5" y="16.5" width="6" height="5" rx="1"/><path d="M12 7.5v4.5M5.5 16.5V12h13v4.5"/></symbol>
  <symbol id="i-antenna" viewBox="0 0 24 24"><path d="M12 10v11M8 21h8"/><circle cx="12" cy="8" r="2"/><path d="M8.5 4.5a5 5 0 0 0 0 7M15.5 4.5a5 5 0 0 1 0 7M5.5 2a9 9 0 0 0 0 12M18.5 2a9 9 0 0 1 0 12"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></symbol>
  <symbol id="i-touch" viewBox="0 0 24 24"><rect x="3" y="3.5" width="18" height="12.5" rx="1.5"/><path d="M8 20.5l2.5-4.5h3l2.5 4.5"/><rect x="6" y="6.5" width="5" height="3" rx=".7"/><rect x="13" y="6.5" width="5" height="3" rx=".7"/><rect x="6" y="11" width="5" height="2.5" rx=".7"/></symbol>
  <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></symbol>
  <symbol id="i-camera" viewBox="0 0 24 24"><rect x="4" y="15" width="16" height="6" rx="1.5"/><circle cx="12" cy="9" r="6"/><circle cx="12" cy="9" r="2.6"/></symbol>
  <symbol id="i-switcher" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5" y="8" width="3" height="3" rx=".6"/><rect x="10.5" y="8" width="3" height="3" rx=".6"/><rect x="16" y="8" width="3" height="3" rx=".6"/><rect x="5" y="13" width="3" height="3" rx=".6"/><rect x="10.5" y="13" width="3" height="3" rx=".6"/><path d="M17.5 12.5v4"/></symbol>
  <symbol id="i-console" viewBox="0 0 24 24"><path d="M2.5 19.5h19l-2-14h-15z"/><path d="M7 9v8M11 9v8M15 9v8"/><rect x="5.6" y="12" width="2.8" height="2" rx=".5"/><rect x="9.6" y="10" width="2.8" height="2" rx=".5"/><rect x="13.6" y="14" width="2.8" height="2" rx=".5"/><path d="M18 9v8"/></symbol>
  <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></symbol>
  <symbol id="i-rec" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor"/></symbol>
  <symbol id="i-stream" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/></symbol>
  <symbol id="i-screen" viewBox="0 0 24 24"><path d="M2.5 4h19"/><rect x="4" y="4" width="16" height="12"/><path d="M12 16v3M9 21h6"/></symbol>
  <symbol id="i-ear" viewBox="0 0 24 24"><path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0"/><path d="M10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 3.5"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7M14 8.5v7"/></symbol>
  <symbol id="i-handshake" viewBox="0 0 24 24"><path d="M2.5 12l4-4 4 2 3-2.5 4 .5 4 4"/><path d="M6.5 8L4 14l5 5 2-1 2 1 2.5-1.5 3-3"/><path d="M10 15l2 2M12 13l2.5 2.5"/></symbol>"""

# ── camera / source thumbnails (illustrative scenes) ─────────
TH_DEFS = '<linearGradient id="thStage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1626"/><stop offset="1" stop-color="#1b2a3c"/></linearGradient><radialGradient id="thSpot" cx="50%" cy="20%" r="70%"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>'

def person(x, y, s=1.0, c="#e9d9c2", shirt="#2b4a6f"):
    return (f'<circle cx="{x}" cy="{y}" r="{5*s}" fill="{c}"/>'
            f'<path d="M{x-8*s} {y+22*s} q0 -15 {8*s} -15 q{8*s} 0 {8*s} 15 z" fill="{shirt}"/>')

def stage_floor():
    return '<rect width="160" height="90" fill="url(#thStage)"/><rect y="66" width="160" height="24" fill="#3a2a17"/><rect y="66" width="160" height="2" fill="#5a4223"/>'

THUMBS_LIST = {
 1: ("CAM 1", "Stage L", stage_floor() + '<rect width="26" height="70" fill="#5a1620"/><rect x="0" width="160" height="90" fill="url(#thSpot)"/>' + person(62, 40, 1.3, shirt="#7a2a3a") + person(104, 44, 1.1, shirt="#2b4a6f") + '<rect x="30" y="72" width="100" height="3" fill="#000" opacity=".3"/>'),
 2: ("CAM 2", "Stage R", stage_floor() + '<rect x="134" width="26" height="70" fill="#5a1620"/><rect width="160" height="90" fill="url(#thSpot)"/>' + person(58, 44, 1.1, shirt="#3b6b45") + person(96, 40, 1.3, shirt="#7a2a3a")),
 3: ("CAM 3", "Center", stage_floor() + '<rect width="160" height="90" fill="url(#thSpot)"/>' + person(80, 26, 1.6, shirt="#1f3550") + '<path d="M62 52 h36 l-4 30 h-28 z" fill="#2a2016" stroke="#5a4223"/><rect x="72" y="58" width="16" height="10" rx="2" fill="#185ca5"/><text x="80" y="66" text-anchor="middle" font-size="6" font-weight="800" fill="#fff" font-family="Segoe UI,Arial">MDC</text><path d="M84 40 l6 -6" stroke="#222" stroke-width="2"/>'),
 4: ("CAM 4", "Audience", '<rect width="160" height="90" fill="#141c26"/>' + "".join(f'<circle cx="{10+c*18+(r%2)*9}" cy="{30+r*16}" r="{6+r}" fill="#0a0f15"/><path d="M{2+c*18+(r%2)*9} {44+r*16} q{8} -10 {16} 0 z" fill="#0a0f15"/>' for r in range(4) for c in range(9)) + '<rect width="160" height="22" fill="#1e2a38"/>'),
 5: ("CAM 5", "Wide", '<rect width="160" height="90" fill="#0b1018"/><rect x="18" y="8" width="124" height="60" fill="#0b1626" stroke="#2a3a4c"/><rect x="48" y="12" width="64" height="36" fill="#1f5f8f"/><rect x="22" y="22" width="18" height="11" fill="#2eaadc"/><rect x="120" y="22" width="18" height="11" fill="#2eaadc"/><rect x="18" y="56" width="124" height="12" fill="#3a2a17"/>' + person(70, 46, .55, shirt="#7a2a3a") + person(92, 46, .55) + "".join(f'<circle cx="{8+i*12}" cy="84" r="5" fill="#05080c"/>' for i in range(14))),
 6: ("CAM 6", "Portable", '<rect width="160" height="90" fill="#0d1520"/><rect width="160" height="90" fill="url(#thSpot)"/><circle cx="80" cy="40" r="20" fill="#e9d9c2"/><path d="M40 92 q0 -36 40 -36 q40 0 40 36 z" fill="#5a3e0a"/><path d="M60 26 q20 -22 40 0 q-2 -18 -20 -18 q-18 0 -20 18" fill="#2a1a10"/><rect x="92" y="44" width="8" height="26" rx="4" fill="#222" transform="rotate(-25 96 57)"/>'),
 7: ("PC", "House PC", '<rect width="160" height="90" fill="#0d1b2a"/><rect x="0" y="0" width="6" height="90" fill="#c8a84b"/><text x="16" y="34" font-size="12" font-weight="700" fill="#fff" font-family="Segoe UI,Arial">Welcome to</text><text x="16" y="50" font-size="12" font-weight="700" fill="#e2c46e" font-family="Segoe UI,Arial">Wolfson Campus</text><rect x="16" y="60" width="70" height="3" fill="#a8b8cc"/><rect x="16" y="67" width="50" height="3" fill="#a8b8cc"/><rect x="118" y="20" width="30" height="30" rx="4" fill="#185ca5"/><text x="133" y="39" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="Segoe UI,Arial">MDC</text>'),
 8: ("MAC", "iMac", '<rect width="160" height="90" fill="#1b0f2e"/><circle cx="40" cy="70" r="40" fill="#3b2a6b"/><circle cx="130" cy="20" r="34" fill="#5a3e0a" opacity=".8"/><circle cx="100" cy="64" r="22" fill="#9b8cd9" opacity=".6"/><text x="80" y="48" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Segoe UI,Arial" letter-spacing="1">PROGRAM</text>'),
 9: ("LAPTOP", "Stage", '<rect width="160" height="90" fill="#f2f5f8"/><rect width="160" height="14" fill="#185ca5"/><rect x="8" y="4" width="60" height="6" rx="1" fill="#fff" opacity=".85"/>' + "".join(f'<rect x="{18+i*22}" y="{78-h}" width="14" height="{h}" fill="{c}"/>' for i, (h, c) in enumerate([(22, "#2eaadc"), (34, "#2eaadc"), (28, "#c8a84b"), (46, "#185ca5"), (52, "#185ca5")])) + '<rect x="120" y="24" width="32" height="3" fill="#7d8fa5"/><rect x="120" y="31" width="26" height="3" fill="#7d8fa5"/><rect x="120" y="38" width="30" height="3" fill="#7d8fa5"/>'),
 10: ("ZOOM", "Far end", '<rect width="160" height="90" fill="#1a1a1a"/>' + "".join(f'<rect x="{3+(i%2)*78}" y="{3+(i//2)*43}" width="76" height="41" rx="2" fill="{c}"/>' + person(41+(i%2)*78, 18+(i//2)*43, .8, shirt=s) for i, (c, s) in enumerate([("#2a3440", "#2b4a6f"), ("#30302a", "#7a2a3a"), ("#2a3530", "#3b6b45"), ("#352a30", "#5a3e0a")])) + '<rect x="4" y="4" width="76" height="41" rx="2" fill="none" stroke="#3fd17a" stroke-width="1.5"/>'),
}
THUMBS = f'  <defs>{TH_DEFS}</defs>\n' + "\n".join(f'  <symbol id="th-{n}" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">{body}</symbol>' for n, (_, _, body) in THUMBS_LIST.items())


def th(n):
    return f'<svg class="th th{n}" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><use href="#th-{n}"/></svg>'


from parts_a import hero, overview  # noqa: E402
from parts_b import system  # noqa: E402
from parts_c import control  # noqa: E402
from parts_d import equipment, scope, invest, why, footer, SCRIPT, RESPONSIVE  # noqa: E402
