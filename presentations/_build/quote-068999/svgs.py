"""Inline SVG generators: room plan + screen overlays, coverage maps, signal-flow diagrams."""
from html import escape as E

COL = {"far": "#F28C38", "content": "#4DA3FF", "home": "#7D8FA3", "dell": "#B48CFF", "local": "#3CC8A0"}
KINDNAME = {"far": "Meeting video", "content": "Shared content", "home": "Teams home screen",
            "dell": "Dell PC (touch)", "local": "Laptop, native"}

# ---- room geometry (1 ft = 18 px) ----
OX, OY, FT = 40, 70, 18
RX2, RY2 = OX + 30 * FT, OY + 15 * FT          # 580, 340
SCREENS = {  # x1,y1,x2,y2
    "NL": (175, 65, 273, 75), "NR": (292, 65, 390, 75),
    "E": (575, 169, 585, 254), "S": (269, 335, 353, 345),
}
SNAME = {"NL": "North-L 75″ touch", "NR": "North-R 75″ touch", "E": "East 65″", "S": "South 65″"}
CARDS = {"NL": (122, 6, 150, 52), "NR": (294, 6, 150, 52), "E": (598, 184, 114, 56), "S": (255, 356, 112, 52)}
TABLE = (175, 160, 445, 250)
TC = (310, 205)


def _base_room():
    o = []
    o.append(f'<rect x="{OX}" y="{OY}" width="{RX2-OX}" height="{RY2-OY}" rx="3" fill="#0e1c2b" stroke="#c9d3de" stroke-width="3"/>')
    # door gap + swing on east wall (top)
    o.append(f'<line x1="{RX2}" y1="{OY+2}" x2="{RX2}" y2="{OY+42}" stroke="#0e1c2b" stroke-width="5"/>')
    o.append(f'<path d="M{RX2} {OY+42} A40 40 0 0 0 {RX2-40} {OY+2}" fill="none" stroke="#6f849a" stroke-dasharray="3 3"/>')
    o.append(f'<text x="{RX2-46}" y="{OY+56}" class="lbl">door</text>')
    # table
    x1, y1, x2, y2 = TABLE
    o.append(f'<rect x="{x1}" y="{y1}" width="{x2-x1}" height="{y2-y1}" rx="8" fill="#16283a" stroke="#4b5f75"/>')
    o.append(f'<text x="{x1+8}" y="{y2-8}" class="lbl">table · about 15 ft</text>')
    # electrical panel + mini split
    o.append(f'<rect x="{RX2-7}" y="282" width="6" height="30" fill="#2b3a4c" stroke="#6f849a"/>')
    o.append(f'<text x="{RX2-12}" y="300" class="lbl" text-anchor="end">elec. panel</text>')
    o.append(f'<rect x="{OX+1}" y="110" width="6" height="40" fill="#2b3a4c" stroke="#6f849a"/>')
    o.append(f'<text x="{OX+12}" y="134" class="lbl">AC unit</text>')
    # conduit
    o.append(f'<line x1="353" y1="250" x2="353" y2="{RY2}" stroke="#c98a5a" stroke-width="2" stroke-dasharray="5 4"/>')
    o.append(f'<text x="358" y="300" class="lbl">floor conduit</text>')
    # dims
    o.append(f'<text x="{(OX+RX2)/2}" y="{RY2+76}" class="lbl" text-anchor="middle">about 30 ft</text>')
    o.append(f'<text x="22" y="{(OY+RY2)/2}" class="lbl" text-anchor="middle" transform="rotate(-90 22 {(OY+RY2)/2})">about 15 ft</text>')
    # screens (neutral)
    for k, (a, b, c, d) in SCREENS.items():
        o.append(f'<rect x="{a}" y="{b}" width="{c-a}" height="{d-b}" rx="2" fill="#3a4a5c"/>')
    return "".join(o)


def _marker(n, x, y):
    return (f'<g class="mk"><circle cx="{x}" cy="{y}" r="8.5" fill="#C8A84B"/>'
            f'<text x="{x}" y="{y+3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="#0D1B2A">{n}</text></g>')


def _remote(x, y):
    return (f'<g><rect x="{x-4}" y="{y-8}" width="8" height="16" rx="3" fill="#0e1c2b" stroke="#F28C38" stroke-width="1.4"/>'
            f'<circle cx="{x}" cy="{y-3}" r="1.6" fill="#F28C38"/></g>')


def devices(opt):
    o = []
    if opt in ("good", "better"):
        bar = "#F28C38"
        o.append(f'<rect x="566" y="180" width="7" height="64" rx="2" fill="{bar}"/>')                 # video bar
        o.append(_marker(1, 552, 212))
        o.append(f'<circle cx="{TC[0]}" cy="{TC[1]}" r="10" fill="#1d2f42" stroke="{bar}" stroke-width="2.5"/>')  # sight / center
        o.append(_marker(2, TC[0]-22, TC[1]-12))
        o.append(f'<rect x="280" y="224" width="18" height="12" rx="2" fill="#0b0f14" stroke="#c9d3de"/>')  # controller
        o.append(_marker(3, 270, 230))
        o.append(f'<rect x="318" y="226" width="22" height="9" rx="2" fill="#2b3a4c" stroke="#4DA3FF"/>')  # table connections
        o.append(_marker(4, 350, 231))
        o.append(f'<rect x="372" y="166" width="62" height="20" rx="3" fill="rgba(77,163,255,.12)" stroke="#4DA3FF" stroke-dasharray="4 3"/>')
        o.append(_marker(5, 403, 196))
        o.append(f'<rect x="520" y="128" width="30" height="30" rx="3" fill="rgba(77,163,255,.12)" stroke="#4DA3FF" stroke-dasharray="4 3"/>')
        o.append(_marker(6, 535, 143))
        o.append(f'<rect x="326" y="77" width="34" height="8" rx="2" fill="#B48CFF"/>')                 # Dell behind NR
        o.append(_marker(7, 343, 98))
        o.append(f'<rect x="588" y="82" width="8" height="18" rx="2" fill="#c9d3de"/>')                  # scheduler
        o.append(_marker(8, 606, 92))
        for x, y in ((166, 86), (399, 86), (560, 262), (362, 326)):
            o.append(_remote(x, y))
        # raceway
        o.append(f'<path d="M353 {RY2-4} L{RX2-4} {RY2-4} L{RX2-4} 262 M398 {OY+4} L{RX2-4} {OY+4} L{RX2-4} 128" fill="none" stroke="#4DA3FF" stroke-opacity=".5" stroke-dasharray="2 4"/>')
    else:
        o.append(f'<rect x="545" y="165" width="26" height="93" rx="3" fill="rgba(77,163,255,.14)" stroke="#4DA3FF" stroke-dasharray="4 3"/>')
        o.append(_marker(1, 531, 211))
        o.append(f'<rect x="{TC[0]-13}" y="{TC[1]-13}" width="26" height="26" rx="3" fill="#1d2f42" stroke="#4DA3FF" stroke-width="2.5"/>')
        o.append(_marker(2, TC[0]-26, TC[1]-16))
        for (x, y) in ((121, 133), (499, 133), (121, 277), (499, 277)):
            o.append(f'<circle cx="{x}" cy="{y}" r="9" fill="none" stroke="#5FD08A" stroke-width="2"/><circle cx="{x}" cy="{y}" r="3" fill="#5FD08A"/>')
        o.append(_marker(3, 140, 133))
        for (x, y) in ((283, 80), (311, 330), (566, 160)):
            o.append(f'<rect x="{x-6}" y="{y-5}" width="12" height="10" rx="2" fill="#F28C38"/>')
        o.append(_marker(4, 283, 98))
        o.append(f'<rect x="280" y="224" width="18" height="12" rx="2" fill="#0b0f14" stroke="#c9d3de"/>')
        o.append(_marker(5, 270, 230))
        o.append(f'<rect x="318" y="226" width="22" height="9" rx="2" fill="#2b3a4c" stroke="#4DA3FF"/>')
        o.append(_marker(6, 350, 231))
        o.append(f'<rect x="372" y="166" width="62" height="20" rx="3" fill="rgba(77,163,255,.12)" stroke="#4DA3FF" stroke-dasharray="4 3"/>')
        o.append(_marker(7, 403, 196))
        o.append(f'<rect x="588" y="82" width="8" height="18" rx="2" fill="#c9d3de"/>')
        o.append(_marker(8, 606, 92))
        o.append(f'<path d="M353 {RY2-4} L{RX2-4} {RY2-4} L{RX2-4} 258 M398 {OY+4} L{RX2-4} {OY+4} L{RX2-4} 165" fill="none" stroke="#4DA3FF" stroke-opacity=".5" stroke-dasharray="2 4"/>')
    return "".join(o)


def _wrap(txt, n):
    words, lines, cur = txt.split(), [], ""
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > n:
            lines.append(cur); cur = w
        else:
            cur = f"{cur} {w}" if cur else w
    if cur:
        lines.append(cur)
    return lines


def overlay(routes):
    """routes: {screen: (kind, text)} -> svg fragment."""
    o = []
    for s, (kind, txt) in routes.items():
        a, b, c, d = SCREENS[s]
        col = COL[kind]
        o.append(f'<rect x="{a}" y="{b}" width="{c-a}" height="{d-b}" rx="2" fill="{col}"/>')
        o.append(f'<rect x="{a-2}" y="{b-2}" width="{c-a+4}" height="{d-b+4}" rx="3" fill="none" stroke="{col}" stroke-opacity=".35" stroke-width="4"/>')
        x, y, w, h = CARDS[s]
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="#0b1520" stroke="{col}" stroke-width="1.5"/>')
        o.append(f'<rect x="{x}" y="{y}" width="5" height="{h}" rx="2" fill="{col}"/>')
        o.append(f'<text x="{x+11}" y="{y+14}" font-size="9" fill="#8fa3b8" font-weight="700" letter-spacing=".6">{E(SNAME[s].upper())}</text>')
        for i, ln in enumerate(_wrap(txt, 22 if CARDS[s][2] > 140 else 17)[:2]):
            o.append(f'<text x="{x+11}" y="{y+29+i*12}" font-size="11" font-weight="700" fill="{col}">{E(ln)}</text>')
    return "".join(o)


SVG_STYLE = '<style>.lbl{font:10px "Segoe UI",system-ui,sans-serif;fill:#8fa3b8}</style>'


def room_svg(opt, mode_routes):
    """mode_routes: {modeclass: routes}"""
    parts = [f'<svg viewBox="0 0 720 420" role="img" aria-label="Top-down room plan showing what each display shows" font-family="Segoe UI,system-ui,sans-serif">{SVG_STYLE}',
             _base_room(), devices(opt)]
    for mcls, r in mode_routes.items():
        parts.append(f'<g class="{mcls}">{overlay(r)}</g>')
    parts.append("</svg>")
    return "".join(parts)


def plan_existing():
    o = [f'<svg viewBox="0 0 720 420" role="img" aria-label="Existing room plan" font-family="Segoe UI,system-ui,sans-serif">{SVG_STYLE}', _base_room()]
    for s, (a, b, c, d) in SCREENS.items():
        o.append(f'<rect x="{a}" y="{b}" width="{c-a}" height="{d-b}" rx="2" fill="#c9d3de"/>')
        x, y, w, h = CARDS[s]
        o.append(f'<text x="{x+w/2}" y="{y+h/2+8}" text-anchor="middle" font-size="11" font-weight="700" fill="#c9d3de">{E(SNAME[s])}</text>')
        o.append(f'<text x="{x+w/2}" y="{y+h/2+22}" text-anchor="middle" font-size="9.5" fill="#8fa3b8">reused · owner-furnished</text>')
    o.append('<text x="360" y="268" class="lbl" text-anchor="middle" fill="#c98a5a">limited room for new cables</text>')
    o.append("</svg>")
    return "".join(o)


def coverage_svg(opt):
    o = [f'<svg viewBox="0 40 640 340" role="img" aria-label="Microphone pickup and camera coverage" font-family="Segoe UI,system-ui,sans-serif">{SVG_STYLE}',
         '<defs><radialGradient id="pg' + opt + '"><stop offset="0" stop-color="#5FD08A" stop-opacity=".38"/><stop offset="1" stop-color="#5FD08A" stop-opacity=".06"/></radialGradient></defs>',
         _base_room()]
    cam = '#F28C38'
    if opt in ("good", "better"):
        r = 7.5 * FT
        o.append(f'<circle cx="{TC[0]}" cy="{TC[1]}" r="{r}" fill="url(#pg{opt})" stroke="#5FD08A" stroke-dasharray="5 4"/>')
        # bar pickup lobe from east wall
        o.append(f'<path d="M570 212 L440 140 A150 150 0 0 0 440 284 Z" fill="#5FD08A" fill-opacity=".10" stroke="#5FD08A" stroke-opacity=".5" stroke-dasharray="3 3"/>')
        # cameras: bar wedge + tabletop 360
        o.append(f'<path d="M566 212 L190 110 M566 212 L190 314" stroke="{cam}" stroke-width="1.5" stroke-dasharray="6 4" fill="none"/>')
        o.append(f'<circle cx="{TC[0]}" cy="{TC[1]}" r="34" fill="none" stroke="{cam}" stroke-width="1.5" stroke-dasharray="6 4"/>')
        o.append(f'<rect x="566" y="180" width="7" height="64" rx="2" fill="{cam}"/>')
        o.append(f'<circle cx="{TC[0]}" cy="{TC[1]}" r="10" fill="#1d2f42" stroke="{cam}" stroke-width="2.5"/>')
        lab = "Sight: 7.5 ft pickup radius reaches both table ends" if opt == "good" else "Neat Center: mid-table pickup and close-ups"
        o.append(f'<text x="{TC[0]}" y="{TC[1]+r+16 if TC[1]+r+16 < 360 else 356}" text-anchor="middle" font-size="11" font-weight="700" fill="#5FD08A">{E(lab)}</text>')
        o.append(f'<text x="560" y="174" text-anchor="end" font-size="10.5" font-weight="700" fill="{cam}">{"Rally Bar" if opt=="good" else "Neat Bar Pro"}: room view</text>')
    else:
        o.append(f'<rect x="{OX+3}" y="{OY+3}" width="{RX2-OX-6}" height="{RY2-OY-6}" rx="3" fill="url(#pgbest)" stroke="#5FD08A" stroke-dasharray="5 4"/>')
        o.append(f'<rect x="{TC[0]-13}" y="{TC[1]-13}" width="26" height="26" rx="3" fill="#1d2f42" stroke="#4DA3FF" stroke-width="2.5"/>')
        o.append(f'<text x="{TC[0]}" y="{TC[1]+34}" text-anchor="middle" font-size="11" font-weight="700" fill="#5FD08A">One ceiling array: rated for a 30 × 30 ft seating area</text>')
        for (x, y, a1, a2) in ((283, 80, (150, 250), (420, 250)), (311, 330, (170, 160), (450, 160)), (566, 160, (220, 120), (220, 300))):
            o.append(f'<path d="M{x} {y} L{a1[0]} {a1[1]} M{x} {y} L{a2[0]} {a2[1]}" stroke="{cam}" stroke-width="1.5" stroke-dasharray="6 4" fill="none"/>')
            o.append(f'<rect x="{x-6}" y="{y-5}" width="12" height="10" rx="2" fill="{cam}"/>')
        for (x, y) in ((121, 133), (499, 133), (121, 277), (499, 277)):
            o.append(f'<circle cx="{x}" cy="{y}" r="9" fill="none" stroke="#5FD08A" stroke-width="2"/><circle cx="{x}" cy="{y}" r="3" fill="#5FD08A"/>')
        o.append(f'<text x="300" y="104" font-size="10.5" font-weight="700" fill="{cam}">Huddly camera (north)</text>')
        o.append(f'<text x="560" y="150" text-anchor="end" font-size="10.5" font-weight="700" fill="{cam}">Huddly camera (east)</text>')
        o.append(f'<text x="322" y="326" font-size="10.5" font-weight="700" fill="{cam}">Huddly camera (south)</text>')
    o.append("</svg>")
    return "".join(o)


# ---------------- signal flow ----------------
FLOWCSS = ('<style>.bx{fill:#132334;stroke:#3b516a;stroke-width:1.2}.bt{font:700 13px "Segoe UI",system-ui,sans-serif;fill:#E7EDF4}'
           '.bs{font:11px "Segoe UI",system-ui,sans-serif;fill:#9DB0C4}.al{font:600 10.5px "Segoe UI",system-ui,sans-serif}'
           '.zone{fill:none;stroke:#2a3e54;stroke-dasharray:4 4}.zl{font:700 10px "Segoe UI",system-ui,sans-serif;fill:#6f849a;letter-spacing:.12em}</style>')


def box(x, y, w, h, title, sub="", accent=None):
    s = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" class="bx"' + (f' style="stroke:{accent};stroke-width:1.8"' if accent else "") + "/>"]
    lines = sub.split("|") if sub else []
    ty = y + h / 2 - (len(lines) * 7) + 4
    s.append(f'<text x="{x+w/2}" y="{ty}" text-anchor="middle" class="bt">{E(title)}</text>')
    for i, ln in enumerate(lines):
        s.append(f'<text x="{x+w/2}" y="{ty+16+i*13}" text-anchor="middle" class="bs">{E(ln)}</text>')
    return "".join(s)


def arrow(d, col, label=None, lx=None, ly=None, dash=False, anchor="start", mid="a"):
    s = f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2"' + (' stroke-dasharray="6 4"' if dash else "") + f' marker-end="url(#{mid}{col[1:]})"/>'
    if label:
        s += f'<text x="{lx}" y="{ly}" class="al" fill="{col}" text-anchor="{anchor}">{E(label)}</text>'
    return s


def markers(cols, mid="a"):
    return "<defs>" + "".join(
        f'<marker id="{mid}{c[1:]}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{c}"/></marker>'
        for c in cols) + "</defs>"


BL, OR, PU, GR, GO, GY = "#4DA3FF", "#F28C38", "#B48CFF", "#5FD08A", "#C8A84B", "#9DB0C4"


def flow_gb(opt):
    m = "g" if opt == "good" else "b"
    bar = "Logitech Rally Bar" if opt == "good" else "Neat Bar Pro"
    tab = "Logitech Sight" if opt == "good" else "Neat Center"
    ctl = "Logitech Tap IP" if opt == "good" else "Neat Pad"
    o = [f'<svg viewBox="0 0 1000 540" role="img" aria-label="Signal flow, {E(opt)} option">{FLOWCSS}', markers([BL, OR, PU, GR, GO, GY], m)]
    o.append('<rect x="8" y="8" width="388" height="290" rx="12" class="zone"/><text x="22" y="28" class="zl">AT THE TABLE</text>')
    o.append('<rect x="640" y="8" width="352" height="524" rx="12" class="zone"/><text x="654" y="28" class="zl">THE FOUR DISPLAYS</text>')
    o.append(box(22, 44, 150, 50, "Laptop HDMI ×2", "wired, at the table"))
    o.append(box(22, 104, 150, 50, "Laptop USB-C", "video only, no charging"))
    o.append(box(22, 164, 150, 50, "AirMedia", "wireless, 2 pucks"))
    o.append(box(22, 230, 150, 56, ctl, "joins and runs the meeting", OR))
    o.append(box(214, 84, 168, 76, "Auto-switcher", "under the table|picks the newest source", BL))
    o.append(box(214, 186, 168, 56, tab, "table center: camera + mics", OR))
    o.append(arrow("M172 69 H194 V110 H212", BL, mid=m))
    o.append(arrow("M172 129 H212", BL, mid=m))
    o.append(arrow("M172 189 H194 V140 H212", BL, mid=m, dash=True))
    o.append(box(420, 20, 196, 56, "Microsoft Teams", "remote attendees", OR))
    o.append(box(420, 150, 196, 96, bar, "east wall, under East 65|Teams Rooms on Android|camera · mics · speakers", OR))
    o.append(arrow("M382 122 H400 V176 H418", BL, "HDBaseT via floor conduit", 216, 177, mid=m))
    o.append('<text x="300" y="314" class="al" fill="#4DA3FF"></text>')
    o.append(arrow("M382 214 H418", OR, mid=m))
    o.append(arrow("M172 258 H400 V236 H418", GO, mid=m, dash=True))
    o.append(arrow("M518 148 V78", OR, "call audio + video", 526, 118, mid=m))
    o.append(arrow("M518 78 V148", OR, mid=m))
    o.append(box(420, 330, 196, 70, "1×4 splitter", "ceiling box near East 65|copies output 1", BL))
    o.append(arrow("M470 246 V328", OR, "out 1: meeting video", 476, 300, mid=m))
    o.append(arrow("M616 165 H640 V79 H668", OR, "out 2: content", 612, 142, mid=m, anchor="end"))
    disp = [("North-R 75\u2033", 50, "content \u00b7 input 2: Dell"), ("North-L 75\u2033", 130, "meeting video \u00b7 input 2: Dell"),
            ("East 65\u2033", 336, "meeting video (copy)"), ("South 65\u2033", 416, "meeting video (copy)")]
    for t, y, s in disp:
        o.append(box(670, y, 200, 58, t, s))
        o.append(f'<g transform="translate(886 {y+12})"><rect width="16" height="34" rx="5" fill="#0e1c2b" stroke="{OR}" stroke-width="1.6"/><circle cx="8" cy="9" r="3" fill="{OR}"/><rect x="4" y="17" width="8" height="2" fill="{OR}"/><rect x="4" y="22" width="8" height="2" fill="{OR}"/></g>')
        o.append(f'<text x="910" y="{y+33}" class="al" fill="{OR}">remote</text>')
    o.append(arrow("M616 345 H652 V159 H668", OR, mid=m))
    o.append(arrow("M616 365 H668", OR, mid=m))
    o.append(arrow("M616 385 H646 V445 H668", OR, mid=m))
    o.append(box(420, 460, 196, 62, "Dell in-room PC", "behind North-R (owner-furnished)", PU))
    o.append(arrow("M616 491 H664", PU, mid=m, dash=True))
    o.append(f'<text x="672" y="486" class="al" fill="{PU}">HDMI + touch USB straight to input 2</text>')
    o.append(f'<text x="672" y="501" class="al" fill="{PU}">on North-L and North-R</text>')
    o.append(f'<text x="672" y="516" class="al" fill="{GY}">select it with each display\'s TV remote</text>')
    o.append("</svg>")
    return "".join(o)


def flow_best():
    m = "x"
    o = [f'<svg viewBox="0 0 1000 610" role="img" aria-label="Signal flow, Best option">{FLOWCSS}', markers([BL, OR, PU, GR, GO, GY], m)]
    o.append('<rect x="8" y="76" width="384" height="256" rx="12" class="zone"/><text x="22" y="96" class="zl">AT THE TABLE</text>')
    o.append('<rect x="8" y="346" width="384" height="256" rx="12" class="zone"/><text x="22" y="366" class="zl">WALLS + CEILING</text>')
    o.append('<rect x="408" y="76" width="432" height="526" rx="12" class="zone"/><text x="640" y="596" class="zl" text-anchor="middle">CREDENZA RACK UNDER EAST 65</text>')
    o.append(box(22, 108, 150, 44, "Laptop HDMI \u00d72", "wired"))
    o.append(box(22, 160, 150, 44, "Laptop USB-C", "video only"))
    o.append(box(22, 212, 150, 44, "AirMedia", "wireless, 2 pucks"))
    o.append(box(22, 270, 150, 50, "Logitech Tap", "meeting + Room Controls", OR))
    o.append(box(206, 120, 168, 100, "Auto-switcher", "under the table|A: native 4K for the room|B: 1080p for the call", BL))
    o.append(arrow("M172 130 H188 V150 H204", BL, mid=m))
    o.append(arrow("M172 182 H204", BL, mid=m))
    o.append(arrow("M172 234 H188 V200 H204", BL, mid=m, dash=True))
    o.append(arrow("M290 220 V290 H174", BL, "B: 1080p into the Tap", 298, 262, mid=m))
    o.append(box(430, 12, 190, 50, "Microsoft Teams", "remote attendees", OR))
    o.append(box(430, 110, 190, 72, "Teams Rooms PC", "Lenovo ThinkSmart Core|Teams Rooms on Windows", OR))
    o.append(arrow("M525 108 V64", OR, mid=m))
    o.append(arrow("M525 64 V108", OR, "call", 532, 90, mid=m))
    o.append(arrow("M374 150 H392 V96 H740 V108", BL, "A: native 4K over HDBaseT", 600, 90, mid=m))
    o.append(arrow("M172 306 H398 V128 H428", OR, "Tap link", 300, 320, mid=m))
    o.append(box(660, 110, 160, 200, "8\u00d78 video matrix", "AVPro Edge|any source|to any screen", BL))
    o.append(arrow("M620 132 H658", OR, mid=m))
    o.append(arrow("M620 160 H658", OR, "2 outputs", 622, 152, mid=m))
    o.append(box(660, 340, 160, 54, "Dell rack PC", "2 outputs \u00b7 touch", PU))
    o.append(arrow("M710 338 V312", PU, mid=m))
    o.append(arrow("M770 338 V312", PU, mid=m))
    for i, (t, sub) in enumerate([("North-L 75\u2033", "touch"), ("North-R 75\u2033", "touch"), ("East 65\u2033", ""), ("South 65\u2033", "")]):
        y = 120 + i * 60
        o.append(box(870, y, 120, 46, t, sub))
        o.append(arrow(f"M820 {y+23} H868", BL, mid=m))
    o.append(box(22, 380, 170, 56, "Huddly Crew", "3 AI-directed cameras", OR))
    o.append(box(22, 470, 170, 56, "Shure ceiling mic", "MXA925 array over table", GR))
    o.append(arrow("M192 408 H408 V170 H428", OR, "USB video", 200, 400, mid=m))
    o.append(box(430, 250, 190, 72, "Q-SYS Core 8 Flex", "audio DSP \u00b7 echo cancel|room control", GR))
    o.append(arrow("M192 498 H420 V300 H428", GR, "Dante (network audio)", 200, 490, mid=m))
    o.append(arrow("M560 248 V184", GR, mid=m))
    o.append(arrow("M560 184 V248", GR, "USB audio", 568, 220, mid=m))
    o.append(box(430, 470, 190, 54, "QSC amplifier", "70 V, 2 zones", GR))
    o.append(arrow("M580 324 V468", GR, mid=m))
    o.append(box(660, 470, 160, 54, "Ceiling speakers \u00d74", "even sound at every seat", GR))
    o.append(arrow("M620 497 H658", GR, mid=m))
    o.append(arrow("M620 270 H658", GO, "routes", 624, 264, mid=m, dash=True))
    o.append(box(660, 410, 160, 46, "IR display control", "power + input", GO))
    o.append(arrow("M620 300 H640 V433 H658", GO, mid=m, dash=True))
    o.append(arrow("M820 433 H930 V348", GO, "displays on/off", 838, 450, mid=m, dash=True))
    o.append("</svg>")
    return "".join(o)
