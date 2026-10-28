"""Builds presentations/quote-069114-v1/presentation.html for EBCI quote #069114.

Usage: python3 presentations/_tools/quote-069114/build.py presentations/quote-069114-v1/presentation.html

Interactive pieces (room mode explorer, signal tracer, who-provides-what filter, scope tabs, mobile menu)
are radio/checkbox + CSS only, so they work with JavaScript turned off (style guide section 18).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from data import QUOTE as Q, ANNUAL, TOTAL, checked_groups, money  # noqa: E402

OUT = sys.argv[1]
CSS = open(os.path.join(os.path.dirname(__file__), "style.css")).read()
GROUPS = checked_groups()


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ── Room mode explorer ─────────────────────────────────────────────────────
def win(scene, tag, extra=""):
    return f'<div class="w {scene}{extra}"><span class="tag">{tag}</span></div>'


MODES = [
    # id, label, layout html, side display (scene, tag), audio, teams, caption title, caption text, steps
    ("conf", "Conference",
     f'<div class="lay conf">{win("sc-teams", "Teams · far end")}{win("sc-share", "Teams · shared content")}</div>',
     ("sc-share", "Shared content"),
     [("Far-end voices", 78, ""), ("Program audio", 30, " duck")],
     "<strong>Far-end voices play through all four pendants.</strong> Program audio ducks under speech so the Yealink mics don't send it back.",
     "<strong>Any source, or the whole wall,</strong> can be shared into the meeting.",
     "Conference",
     "A Microsoft Teams meeting on the 220-inch wall. People in the room join, mute and move cameras on the Yealink controller they already know.",
     ["Pick <strong>Conference</strong> on the Cyviz touch panel at the rack.",
      "Join the meeting on the <strong>Yealink controller</strong>, as today.",
      "Far-end video and shared content fill the wall; the <strong>side display</strong> shows whatever you pick for it.",
      "Share a PC, a laptop or the whole wall into Teams; content is held at a steady 1080p so remote sites don't flicker."]),
    ("train", "Training",
     f'<div class="lay train">{win("sc-slides", "Presenter laptop · back-wall plate")}{win("sc-teams", "Teams", " pip")}</div>',
     ("sc-slides", "Same slides, side wall"),
     [("Program audio", 72, ""), ("Far-end voices", 40, "")],
     "<strong>Presentation audio plays in both speaker zones</strong> at the volume set on the touch panel.",
     "<strong>Optional:</strong> remote trainees join over Teams and see the same presentation.",
     "Training",
     "Instructors plug into a wall plate or share wirelessly with an AirMedia puck. Remote trainees can join over Teams.",
     ["Pick <strong>Training</strong>.",
      "Plug into the <strong>back-wall or side-wall HDMI plate</strong>, or press the <strong>AirMedia puck</strong> on your laptop.",
      "Pick that input on the touch panel. It takes over the wall; Teams can stay up in a corner window.",
      "Send the same slides to the <strong>side display</strong> for people seated along the side wall."]),
    ("eoc", "EOC",
     "",  # EOC layouts come from the layout sub-toggle
     ("sc-news", "IPTV · live news"),
     [("News audio", 56, ""), ("Far-end voices", 0, "")],
     "<strong>Pick one source to hear</strong>, such as the news feed, while every window stays on screen.",
     "<strong>Share the whole wall</strong> (every window at once) into a Teams call with partner agencies.",
     "EOC",
     "Emergency operations: the three operations PCs, live TV and Teams on the wall at once, in a primary-source layout or a quad view.",
     ["Pick <strong>EOC</strong> and enter the PIN. Only authorised staff can change the wall.",
      "Choose a layout: <strong>Primary + 3</strong> puts one source large, or <strong>Quad</strong> gives four equal windows.",
      "Drop any source into any window: surveillance, WebEOC, GIS, IPTV news, Teams or a laptop.",
      "Put a different source on the <strong>side display</strong>, such as live news, without touching the wall."]),
    ("off", "Room Off",
     '<div class="lay full"><div class="w sc-off"><span>WALL POWERED DOWN</span></div></div>',
     ("sc-off", ""),
     [("Program audio", 0, ""), ("Far-end voices", 0, "")],
     "<strong>Room audio is muted.</strong>",
     "<strong>Nothing is shared.</strong> The Teams Room stays ready on its own controller.",
     "Room Off",
     "One button clears the room at the end of the day.",
     ["Pick <strong>Room Off</strong>.",
      "Routing is cleared and room audio mutes.",
      "The LED wall powers down, where the wall's controller supports it.",
      "Next morning, pick any mode and the room comes back in one step."]),
]

EOC_LAYOUTS = [
    ("prim", "Primary + 3",
     f'<div class="lay prim">{win("sc-cams", "PC 1 · surveillance")}{win("sc-gis", "PC 2 · GIS")}{win("sc-eoc", "PC 3 · WebEOC")}{win("sc-news", "IPTV · news")}</div>'),
    ("quad", "Quad view",
     f'<div class="lay quad">{win("sc-cams", "PC 1 · surveillance")}{win("sc-gis", "PC 2 · GIS")}{win("sc-eoc", "PC 3 · WebEOC")}{win("sc-teams", "Teams · far end")}</div>'),
]


def modes_section():
    radios = "".join(f'<input type="radio" name="mode" id="m-{m[0]}"{" checked" if m[0] == "conf" else ""}>' for m in MODES)
    radios += "".join(f'<input type="radio" name="eocl" id="e-{l[0]}"{" checked" if l[0] == "prim" else ""}>' for l in EOC_LAYOUTS)
    pills = "".join(f'<label for="m-{m[0]}">{m[1]}</label>' for m in MODES)
    eoc_pills = "".join(f'<label for="e-{l[0]}">{l[1]}</label>' for l in EOC_LAYOUTS)
    wall = "".join(f'<div class="mv v-{m[0]}">{m[2]}</div>' for m in MODES if m[2])
    wall += "".join(f'<div class="mv v-eoc-{l[0]}">{l[2]}</div>' for l in EOC_LAYOUTS)

    side = "".join(
        f'<div class="mv v-{m[0]}"><div class="side-disp"><div class="tv">'
        + (f'<div class="w {m[3][0]}"><span class="tag">{m[3][1]}</span></div>' if m[3][1] else '<div class="w sc-off"></div>')
        + f'</div><p>{"<strong>Off.</strong>" if m[0] == "off" else "Its own source, picked separately from the wall."}</p></div></div>'
        for m in MODES)
    audio = ""
    for m in MODES:
        bars = "".join(f'<div class="meter-row"><span class="vu-l">{k}</span><span class="vu{c}"><i style="width:{v}%"></i></span></div>' for k, v, c in m[4])
        audio += f'<div class="mv v-{m[0]}"><p>{m[5]}</p>{bars}</div>'
    teams = "".join(f'<div class="mv v-{m[0]}"><p>{m[6]}</p></div>' for m in MODES)
    caps = ""
    for m in MODES:
        pin = '<span class="pin">PIN</span>' if m[0] == "eoc" else ""
        steps = "".join(f"<li><span>{s}</span></li>" for s in m[9])
        caps += f'<div class="mcap c-{m[0]}"><div><h4>{m[7]}{pin}</h4><p>{m[8]}</p></div><ol>{steps}</ol></div>'
    return f'''
<section id="modes">
  <div class="container">
    <div class="section-eyebrow">Room modes</div>
    <h2 class="section-title">Four missions. <em>One button each.</em></h2>
    <p class="section-desc">The room is set up for four ways of working. Each one is a single preset that sets the wall layout, the side display, the speakers and what goes to Teams. Try them here.</p>
    <div class="howto"><span><b>1.</b>Pick a room mode.</span><span><b>2.</b>Watch the wall, the side display and the speakers change.</span><span><b>3.</b>Read the steps underneath.</span></div>
    <div class="app modes-app">
      {radios}
      <div class="pills mode-pills" role="radiogroup" aria-label="Room mode">{pills}</div>
      <div class="pills small eoc-only" role="radiogroup" aria-label="EOC layout">{eoc_pills}</div>
      <div class="modes-grid">
        <div class="room">
          <div class="room-row">
            <div class="rack-mini" aria-hidden="true"><i class="b"></i><i></i><i class="g"></i><i></i><i class="b"></i><i></i><i class="g"></i><i></i><i></i><i class="g"></i><small>RACK</small></div>
            <div class="ledwall">{wall}</div>
          </div>
          <div class="wall-cap"><span>Front wall · <b>220″ LED wall</b> · 1920 × 1080</span><span>Touch panel on the rack top</span></div>
        </div>
        <div class="side-col">
          <div class="info-card"><h4>Side display <small>existing LG</small></h4>{side}</div>
          <div class="info-card"><h4>Room speakers <small>2 zones · 4 pendants</small></h4>{audio}</div>
          <div class="info-card"><h4>Sent to Teams</h4>{teams}</div>
        </div>
      </div>
      <div class="mcaps">{caps}</div>
    </div>
    <p class="fine">Window contents are examples. Every layout and source assignment is set during commissioning with your team and can be changed on the touch panel.</p>
  </div>
</section>'''


def modes_css():
    r = []
    for m in MODES:
        i = m[0]
        r.append(f'#m-{i}:checked ~ .mode-pills label[for="m-{i}"] {{ background: rgba(200,168,75,0.16); border-color: var(--gold); color: var(--white); }}')
        r.append(f'#m-{i}:checked ~ .mode-pills label[for="m-{i}"]::before {{ background: var(--gold); box-shadow: 0 0 0 4px rgba(200,168,75,0.25); }}')
        r.append(f'#m-{i}:checked ~ .modes-grid .v-{i} {{ display: block; }}')
        r.append(f'#m-{i}:checked ~ .mcaps .c-{i} {{ display: grid; }}')
    r.append('#m-eoc:checked ~ .eoc-only { display: flex; }')
    for l in EOC_LAYOUTS:
        i = l[0]
        r.append(f'#m-eoc:checked ~ #e-{i}:checked ~ .modes-grid .v-eoc-{i} {{ display: block; }}')
        r.append(f'#e-{i}:checked ~ .eoc-only label[for="e-{i}"] {{ background: rgba(46,170,220,0.14); border-color: var(--accent); color: var(--white); }}')
        r.append(f'#e-{i}:checked ~ .eoc-only label[for="e-{i}"]::before {{ background: var(--accent); }}')
    r.append('.ledwall > .mv { position: absolute; inset: 0; }')
    return "\n  ".join(r)


# ── Signal-flow schematic ──────────────────────────────────────────────────
NODES = [
    # id, x, y, w, h, title, sub, kind
    ("mtr", 20, 40, 190, 42, "Teams Room (MTR-1)", "Yealink · far end + content · existing", "ofe"),
    ("pcs", 20, 94, 190, 42, "Operations PCs ×3", "Surveillance · WebEOC · GIS · owner", "ofe"),
    ("stb", 20, 148, 190, 42, "IPTV box", "Live TV / news · owner", "ofe"),
    ("air", 20, 202, 190, 42, "AirMedia receiver", "Wireless laptop sharing · new", ""),
    ("plt", 20, 256, 190, 42, "HDMI wall plates ×2", "Back wall · side wall · new", ""),
    ("sw", 300, 40, 170, 290, "AVPro Edge 16×16", "SW-1 · 6 in / 7 out spare", "big"),
    ("xpo", 560, 46, 170, 84, "Cyviz xpo5", "Video wall processor · 7 lanes", "big"),
    ("sc", 560, 192, 170, 46, "Extron DSC 401", "Holds Teams share at 1080p", ""),
    ("tx6", 560, 258, 170, 46, "HDBaseT extender", "Rack → side wall", ""),
    ("led", 830, 46, 250, 84, "220″ LED wall", "Via HDBaseT to the bezel input · by others", "ofe"),
    ("mtri", 830, 192, 250, 46, "Teams content input", "MTR-1 HDMI in → remote sites", "ofe"),
    ("ds1", 830, 258, 250, 46, "Side display (LG)", "Its own source · existing", "ofe"),
    ("avh", 20, 430, 190, 44, "Yealink AVHub", "Far-end audio · 4 ceiling mics stay", "ofe"),
    ("core", 430, 426, 170, 52, "Q-SYS Core 8 Flex", "Mix · duck · EQ · zone levels", "big"),
    ("amp", 660, 430, 140, 44, "Crown amplifier", "70 V · 2 channels · existing", "ofe"),
    ("spk", 860, 430, 220, 44, "Atlas pendants ×4", "Zone 1 + zone 2 · existing", "ofe"),
    ("ctl", 20, 528, 190, 48, "Touch panel + controller", "Cyviz 10.1″ + Easy Controller X", ""),
]

WIRES = [
    # id, path d, traces, label (x, y, text) or None
    ("mtr", "M210 61 H300", "teams", None),
    ("pcs", "M210 115 H300", "pcs", None),
    ("stb", "M210 169 H300", "news", None),
    ("air", "M210 223 H300", "lap", None),
    ("plt", "M210 277 H300", "lap", None),
    ("sw-xpo", "M470 88 H560", "teams pcs news lap", None),
    ("xpo-led", "M730 88 H830", "teams pcs news lap ctl", (752, 82, "HDBaseT")),
    ("ret", "M560 120 H522 V318 H470", "share", (528, 312, "Canvas")),
    ("sw-sc", "M470 215 H560", "share", None),
    ("sc-mtr", "M730 215 H830", "share", None),
    ("sw-tx6", "M470 281 H560", "news lap", None),
    ("tx6-ds1", "M730 281 H830", "news lap", None),
    ("aud", "M385 330 V444 H430", "pcs news lap", (392, 400, "Program audio")),
    ("avh", "M210 462 H430", "teams", (236, 456, "Far-end audio")),
    ("core-amp", "M600 452 H660", "teams pcs news lap", None),
    ("amp-spk", "M800 452 H860", "teams pcs news lap", None),
]
CTL_WIRES = [
    ("c-sw", "M210 540 H412 V330"),
    ("c-core", "M210 552 H515 V478"),
    ("c-xpo", "M210 564 H815 V64 H730 M815 64 H830"),
]

NODE_TRACES = {
    "teams": "mtr sw xpo led avh core amp spk",
    "pcs": "pcs sw xpo led core amp spk",
    "news": "stb sw xpo led tx6 ds1 core amp spk",
    "lap": "air plt sw xpo led tx6 ds1 core amp spk",
    "share": "xpo sw sc mtri mtr",
    "ctl": "ctl sw xpo led core",
}

TRACES = [
    ("teams", "Teams meeting", "Teams meeting",
     "Far-end video and shared content come out of the existing Yealink Teams Room and land on the wall. Far-end voices come out of the AVHub into the new Q-SYS Core.",
     ["The Teams Room sends far-end video and shared content into <strong>matrix inputs 1 and 2</strong>.",
      "The matrix feeds them to <strong>xpo5 lanes</strong>; the xpo5 draws them as windows on the <strong>LED wall</strong>.",
      "Far-end voices leave the <strong>AVHub</strong> and enter the <strong>Q-SYS Core</strong>, which ducks program audio under speech.",
      "The Core feeds the existing <strong>Crown amplifier</strong> and the four <strong>Atlas pendants</strong>, zone by zone."]),
    ("pcs", "Operations PCs", "Operations PCs",
     "Three owner micro PCs live on a shelf in the rack, one per matrix input, each with its own keyboard and mouse in the room.",
     ["Each PC feeds its own <strong>matrix input (3, 4, 5)</strong> over a short HDMI patch.",
      "The matrix passes them to <strong>xpo5 lanes</strong>, so each can be its own window on the wall.",
      "Program audio is de-embedded at the matrix and mixed in the <strong>Q-SYS Core</strong>.",
      "Remote support is available for these PCs through the Cyviz desktop agent licence."]),
    ("news", "IPTV / news", "IPTV and live news",
     "The IPTV box sits in the rack. It can be a window on the wall, on the side display, or both.",
     ["The IPTV box feeds <strong>matrix input 6</strong>.",
      "Route it to an <strong>xpo5 lane</strong> for the wall, and/or to <strong>output 9</strong> for the side display.",
      "Output 9 reaches the <strong>LG side display</strong> over an HDBaseT extender.",
      "Channel changes go over IP, or through the <strong>iTach IR</strong> adapter if the box needs IR."]),
    ("lap", "Laptops", "Guest laptops",
     "Two HDMI wall plates and an AirMedia receiver give visitors three ways in. There is no auto-switch: you pick the input on the touch panel.",
     ["Plug into the <strong>back-wall</strong> or <strong>side-wall plate</strong> (inputs 8 and 9), or share with the <strong>AirMedia puck</strong> (input 7).",
      "Pick that input on the touch panel; it goes to an <strong>xpo5 lane</strong> on the wall.",
      "Send it to the <strong>side display</strong> as well for people seated along the side wall.",
      "Laptop audio plays through the room speakers via the <strong>Q-SYS Core</strong>."]),
    ("share", "Share to Teams", "Share the wall into Teams",
     "Remote partners can see exactly what the room sees: one source, or the whole combined wall.",
     ["The xpo5 sends its <strong>whole canvas</strong> back into <strong>matrix input 10</strong>.",
      "Matrix <strong>output 8</strong> carries any source, or the canvas, to the <strong>Extron scaler</strong>.",
      "The scaler holds a steady <strong>1080p</strong> so Teams doesn't re-sync each time a route changes.",
      "It enters the Teams Room's <strong>content input</strong> and goes out to remote sites."]),
    ("ctl", "Control", "One touch panel runs the room",
     "The Cyviz controller talks to every device over a dedicated AV network that is kept apart from EBCI's production network.",
     ["The <strong>10.1″ touch panel</strong> sits on the rack top beside the Yealink controller.",
      "The <strong>Easy Controller X</strong> drives the matrix, the xpo5 and the <strong>Q-SYS Core</strong>.",
      "It also handles <strong>LED wall power</strong> where the wall supports it, the IPTV box and the WattBox outlets.",
      "Everything talks over the <strong>Netgear AV switch</strong>, isolated from the EBCI network."]),
]


def schematic_section():
    radios = "".join(f'<input type="radio" name="trace" id="tr-{t[0]}"{" checked" if t[0] == "teams" else ""}>' for t in TRACES)
    pills = "".join(f'<label for="tr-{t[0]}">{t[1]}</label>' for t in TRACES)
    node_cls = {}
    for t, ids in NODE_TRACES.items():
        for n in ids.split():
            node_cls.setdefault(n, []).append("t-" + t)
    parts = ['<text class="colh" x="20" y="26">SOURCES</text><text class="colh" x="300" y="26">SWITCH</text>'
             '<text class="colh" x="560" y="26">PROCESS</text><text class="colh" x="830" y="26">DESTINATIONS</text>'
             '<text class="colh" x="20" y="418">ROOM AUDIO</text><text class="colh" x="20" y="516">CONTROL</text>']
    for wid, d, tr, lab in WIRES:
        cls = " ".join("t-" + t for t in tr.split())
        parts.append(f'<path class="w {cls}" d="{d}"/>')
    for wid, d in CTL_WIRES:
        parts.append(f'<path class="w ctl t-ctl" d="{d}"/>')
    for wid, d, tr, lab in WIRES:
        if lab:
            parts.append(f'<text class="wl" x="{lab[0]}" y="{lab[1]}">{lab[2]}</text>')
    for nid, x, y, w, h, title, sub, kind in NODES:
        cls = " ".join(["nd", kind] + node_cls.get(nid, [])).strip()
        ty = y + (h / 2 if nid != "sw" else 100) - (2 if sub else -4)
        tx, anchor = (x + w / 2, ' text-anchor="middle"') if nid == "sw" else (x + 12, "")
        parts.append(f'<g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>'
                     f'<text class="nt" x="{tx:.0f}" y="{ty:.0f}"{anchor}>{esc(title)}</text>'
                     + (f'<text class="ns" x="{tx:.0f}" y="{ty+15:.0f}"{anchor}>{esc(sub)}</text>' if sub else "") + '</g>')
    # matrix port list
    for i, (lbl, y) in enumerate([("IN 1–2 Teams", 61), ("IN 3–5 PCs", 115), ("IN 6 IPTV", 169), ("IN 7 AirMedia", 223), ("IN 8–9 plates", 277)]):
        parts.append(f'<text class="port" x="310" y="{y+4}">{lbl}</text>')
    for lbl, y in [("OUT 1–7 → xpo5", 92), ("OUT 8 → Teams", 219), ("OUT 9 → side", 285), ("IN 10 ← wall canvas", 322)]:
        parts.append(f'<text class="port" x="460" y="{y}" text-anchor="end">{lbl}</text>')
    # legend
    parts.append('<g transform="translate(845 526)"><rect x="0" y="0" width="22" height="12" rx="3" fill="#142233" stroke="rgba(255,255,255,0.14)"/>'
                 '<text class="lg" x="30" y="10">New from Mason</text>'
                 '<rect x="125" y="0" width="22" height="12" rx="3" fill="#1d2531" stroke="rgba(255,255,255,0.14)" stroke-dasharray="3 3"/>'
                 '<text class="lg" x="153" y="10">Existing / owner</text>'
                 '<path d="M0 34 H22" stroke="#c8a84b" stroke-width="3" stroke-dasharray="8 6"/><text class="lg" x="30" y="38">Traced signal</text>'
                 '<path d="M125 34 H147" stroke="rgba(46,170,220,0.6)" stroke-width="1.5" stroke-dasharray="4 4"/><text class="lg" x="153" y="38">Control</text></g>')
    svg = f'<svg class="schem" viewBox="0 0 1100 590" role="img" aria-label="Signal flow: sources into the AVPro matrix, Cyviz xpo5 to the LED wall, scaler to Teams, extender to the side display, Q-SYS audio to the room speakers">{"".join(parts)}</svg>'
    caps = ""
    for t in TRACES:
        steps = "".join(f"<li><span>{s}</span></li>" for s in t[4])
        caps += f'<div class="cap c-{t[0]}"><div><h4>{t[2]}</h4><p>{t[3]}</p></div><ol>{steps}</ol></div>'
    return f'''
<section id="system">
  <div class="container">
    <div class="section-eyebrow">System schematic</div>
    <h2 class="section-title">Follow every signal <em>from source to screen.</em></h2>
    <p class="section-desc">Ten sources enter one AVPro Edge matrix. The Cyviz xpo5 turns seven of them into windows on the LED wall, the side display gets its own feed, and the Q-SYS Core mixes what you hear.</p>
    <div class="howto"><span><b>1.</b>Pick a signal below.</span><span><b>2.</b>Follow the gold line through the rack.</span><span><b>3.</b>Read the steps underneath.</span></div>
    <div class="app trace-app">
      {radios}
      <div class="pills trace-pills" role="radiogroup" aria-label="Signal to trace">{pills}</div>
      <div class="schem-wrap">{svg}</div>
      <div class="caps">{caps}</div>
    </div>
    <p class="schem-note">Simplified. Port assignments follow the Rev 2 drawings and are confirmed during installation. On a phone, scroll the diagram sideways.</p>
  </div>
</section>'''


def schematic_css():
    r = []
    for t in TRACES:
        i = t[0]
        r.append(f'#tr-{i}:checked ~ .schem-wrap .w.t-{i} {{ stroke: var(--gold); stroke-width: 3; stroke-dasharray: 8 6; animation: flow 0.9s linear infinite; }}')
        r.append(f'#tr-{i}:checked ~ .schem-wrap .nd.t-{i} rect {{ stroke: var(--gold); stroke-width: 1.8; fill: rgba(200,168,75,0.16); stroke-dasharray: none; }}')
        r.append(f'#tr-{i}:checked ~ .schem-wrap .nd.t-{i} .nt {{ fill: var(--gold-light); }}')
        r.append(f'#tr-{i}:checked ~ .trace-pills label[for="tr-{i}"] {{ background: rgba(200,168,75,0.16); border-color: var(--gold); color: var(--white); }}')
        r.append(f'#tr-{i}:checked ~ .trace-pills label[for="tr-{i}"]::before {{ background: var(--gold); box-shadow: 0 0 0 4px rgba(200,168,75,0.25); }}')
        r.append(f'#tr-{i}:checked ~ .caps .c-{i} {{ display: grid; }}')
    return "\n  ".join(r)


# ── Equipment / who provides what ──────────────────────────────────────────
NEW = [
    # img, qty, mfr line, name, desc, specs, benefit
    ("cyviz-xpo5", "×1", "Cyviz · 1005010 + LI1005010 ×7 + LO1005010 ×2", "xpo5 v4 video wall processor",
     "Turns up to seven live sources into windows on the 220-inch wall, in any layout. Set for the wall's native 1920 × 1080.",
     ["7 licensed inputs", "2 licensed outputs", "HDMI→DP adapters ×7", "DP→HDMI cables ×2"],
     "Primary-source, quad and full-screen layouts from one processor."),
    ("cyviz-controller", "×1", "Cyviz · XL1005050", "Easy Controller X",
     "The room's control processor. Runs every mode preset and talks to the matrix, xpo5, Q-SYS Core and LED wall.",
     ["Half-width 1RU", "4 LAN ports", "Both networks"],
     "Replaces the Crestron control processor."),
    ("cyviz-touch", "×1", "Cyviz · 1005055", "10.1″ touch control monitor",
     "The single touch panel for the room. Sits on the rack top next to the Yealink Teams controller.",
     ["10.1″ multi-touch", "Integrated CATx extender"],
     "One panel for modes, layouts, sources and volume."),
    ("cyviz-software", "×4", "Cyviz · 1008285 · 1008270 · DL9000 · EM9000", "Easy Server licences & Essential Support",
     "Controller connector, Teams Rooms agent and desktop agent licences for 12 months, plus a year of Cyviz Essential Support & Maintenance.",
     ["12-month licences", "Teams Rooms integration", "Remote diagnostics"],
     "Cyviz support behind the platform from day one."),
    ("avpro-matrix", "×1", "AVPro Edge · AC-MX-1616", "16×16 HDMI matrix switcher",
     "The hub every source passes through. Ten inputs and nine outputs are used on day one, leaving six inputs and seven outputs free.",
     ["18 Gbps · 4K60 4:4:4", "Audio de-embedding", "1RU"],
     "Room to add sources later without replacing the switcher."),
    ("avpro-wallplate", "×2", "AVPro Edge · AC-CXWP-HDMO-BKT", "HDMI wall plate kits",
     "Guest laptop inputs on the back wall and on the side wall under the display, each with a receiver back in the rack.",
     ["Single gang", "HDBaseT to rack", "4K60 HDR · HDCP 2.2"],
     "Plug in where you sit; pick it on the touch panel."),
    ("avpro-ex70-kit", "×2", "AVPro Edge · AC-EX70-UHD-KIT", "HDBaseT extender kits",
     "Carry video from the rack to the LED wall's bezel input and to the side display over one Cat cable each.",
     ["4K60 HDR", "Up to 230 ft"],
     "Clean signal on the longer runs; field-verified on site."),
    ("extron-dsc401", "×1", "Extron · 60-1878-01", "DSC 401 HDMI scaler",
     "Sits in front of the Teams Room's content input and holds it at a steady 1080p, whatever is routed to it.",
     ["4K/60 in", "4:4:4", "HDCP 2.3"],
     "Remote sites don't see a re-sync every time a route changes."),
    ("airmedia", "×1", "Crestron · AM3-111-KIT", "AirMedia Series 3 wireless presentation",
     "A receiver in the rack and a USB-C puck for the table. Share a laptop without a cable.",
     ["AM-3100-WF receiver", "AM-TX3-100 USB-C puck"],
     "Wireless sharing for visitors and trainers."),
    ("qsc-core-8-flex", "×1", "QSC · CORE 8 FLEX", "Q-SYS Core 8 Flex audio processor",
     "Replaces the discontinued Crestron room audio. Mixes program audio with Teams, ducks under speech, EQs the pendants and sets both zone levels.",
     ["8 Flex analog I/O", "8×8 Dante", "Native Cyviz control"],
     "Clear far-end voices and one master volume."),
    ("wattbox-vertical", "×1", "WattBox · WB-800VPS-IPVM-12", "IP power conditioner, 12 outlets",
     "Vertical power for the rebuilt rack, with each outlet switched and metered over the network.",
     ["12 outlets", "Per-outlet control", "2160 J surge"],
     "Restart a single device remotely instead of a site visit."),
    ("netgear-m4250-10g2f", "×1", "Netgear · GSM4212P-100NAS", "M4250 AV Line network switch",
     "A dedicated network for the AV gear, kept physically and logically apart from EBCI's production network.",
     ["12 ports · 8 PoE+", "IGMP Plus", "Managed"],
     "AV traffic never touches the EBCI network."),
    ("itach", "×1", "Global Caché · CL-IP2IR-P", "iTach IP to IR adapter",
     "Lets the touch panel change channels on the IPTV box if the chosen box needs infrared.",
     ["PoE powered", "IR emitter"],
     "Channel control from the same touch panel."),
    ("rack-kit", "×1", "Middle Atlantic · PTRK-ERS", "Rack retrofit kit",
     "Three shelves, rear rails, blanking panels and lacing to rebuild the existing PTRK rack on site.",
     ["3 shelves", "Rear rails", "Blanks + lacing"],
     "Your existing rack, rebuilt neat and labelled."),
    ("reel-cat6a", "LOT", "Liberty · Legrand", "Cabling & patch cords",
     "1,000 ft of shielded CAT6 F/UTP plenum cable, plus HDMI and CAT6 patch cords for the rack.",
     ["CAT6 F/UTP CMP", "25 HDMI patches", "23 CAT6 patches"],
     "Terminated, labelled and tested at both ends."),
]

ICONS = {
    "screen": '<rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
    "cam": '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/>',
    "mic": '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    "amp": '<rect x="2" y="7" width="20" height="10" rx="1.5"/><circle cx="7" cy="12" r="2"/><path d="M12 10h7M12 14h7"/>',
    "spk": '<path d="M12 3v4"/><path d="M7 7h10l-2 12H9z"/><circle cx="12" cy="13" r="2"/>',
    "rack": '<rect x="5" y="2" width="14" height="20" rx="1.5"/><path d="M8 6h8M8 10h8M8 14h8"/><circle cx="8" cy="22" r="0.5"/>',
    "pc": '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 15h6"/>',
    "kb": '<rect x="2" y="7" width="15" height="9" rx="1.5"/><path d="M5 10h1M8 10h1M11 10h1M14 10h0M5 13h9"/><rect x="18" y="9" width="4" height="7" rx="2"/>',
    "tv": '<rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M8 4l4 4 4-4"/>',
    "led": '<rect x="2" y="4" width="20" height="12" rx="1"/><path d="M2 8h20M2 12h20M7 4v12M12 4v12M17 4v12"/><path d="M9 20h6"/>',
    "lic": '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    "box": '<rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 12h4"/><circle cx="17" cy="12.5" r="1"/>',
    "plug": '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
    "proj": '<rect x="2" y="8" width="20" height="9" rx="2"/><circle cx="16" cy="12.5" r="2.5"/><path d="M5 12h5"/>',
}

KEEP = [
    ("cam", "Yealink Microsoft Teams Room", "MCore, MTouch Plus, AVHub and two PTZ cameras stay in place. Mason connects them to the new matrix and audio."),
    ("mic", "Four Yealink ceiling microphones", "Already mounted. Yealink keeps handling pickup and echo cancelling."),
    ("amp", "Crown power amplifier", "Reused on its own circuit; now fed by the Q-SYS Core, one channel per zone."),
    ("spk", "Four Atlas 70 V pendants", "Two zones of two. Wiring and positions stay as they are."),
    ("screen", "LG side-wall display", "Gets its own matrix output, so it can show something different from the wall."),
    ("rack", "Middle Atlantic PTRK rack", "Reused, reconfigured and rebuilt on site beside the LED wall."),
]
OWNER = [
    ("led", "220″ direct-view LED wall", "Furnished and installed by others. Mason connects the xpo5 to its bezel input and sets resolution and power control."),
    ("pc", "Three micro / tiny form factor PCs", "Operations sources (surveillance, WebEOC, GIS). Must be micro or tiny form factor to fit the rack shelf."),
    ("kb", "Three wireless keyboard + mouse sets", "One per PC, used from the room."),
    ("tv", "IPTV streaming box", "Live TV and news source, kept in the rack."),
    ("lic", "Teams Rooms Pro licence", "Stays with EBCI's Microsoft 365 tenant."),
]
OUT_ = [
    ("box", "Crestron presentation & control processor", "Replaced by the AVPro matrix, Q-SYS Core and Cyviz controller. Labelled and left in an EBCI storage location."),
    ("screen", "Crestron room touch controller", "Replaced by the Cyviz 10.1″ touch panel."),
    ("plug", "Rack PDU designated for replacement", "Replaced by the WattBox and turned over to EBCI."),
    ("rack", "Obsolete rack accessories & ID panel", "Removed during the rack rebuild, along with cabling no longer needed."),
    ("proj", "Projector, screen & screen controller", "Not part of Mason's removal scope. Removed by EBCI or others unless added."),
]

FILTERS = [("all", "All", None), ("new", "New from Mason", "new"), ("keep", "Existing, reused", "keep"),
           ("owner", "Owner-furnished", "owner"), ("out", "Removed", "out")]


def mini(kind, chip, items):
    return "".join(
        f'<div class="mini-card k-{kind}"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[i]}</svg></div>'
        f'<div><span class="chip {kind}">{chip}</span><h5>{t}</h5><p>{d}</p></div></div>' for i, t, d in items)


def components_section():
    counts = {"all": len(NEW) + len(KEEP) + len(OWNER) + len(OUT_), "new": len(NEW), "keep": len(KEEP), "owner": len(OWNER), "out": len(OUT_)}
    radios = "".join(f'<input type="radio" name="flt" id="f-{f[0]}"{" checked" if f[0] == "all" else ""}>' for f in FILTERS)
    pills = "".join(f'<label for="f-{f[0]}">{f[1]} <span class="ct">{counts[f[0]]}</span></label>' for f in FILTERS)
    cards = ""
    for img, qty, mfr, name, desc, specs, ben in NEW:
        sp = "".join(f"<span>{s}</span>" for s in specs)
        cards += (f'<div class="component-card k-new"><div class="component-img"><span class="qty">{qty}</span>'
                  f'<img src="assets/{img}.svg" alt="{esc(name)} (illustration)"></div>'
                  f'<div class="component-info"><div class="component-mfr">{mfr}</div><div class="component-name">{name}</div>'
                  f'<p class="component-desc">{desc}</p><div class="spec-row">{sp}</div><div class="component-benefit">{ben}</div></div></div>')
    return f'''
<section id="components">
  <div class="container">
    <div class="section-eyebrow">Bill of materials</div>
    <h2 class="section-title">New where it matters. <em>Reused where it works.</em></h2>
    <p class="section-desc">The Teams Room, microphones, amplifier, speakers, side display and rack all stay. Mason adds the processing, switching, audio and control around them, and takes out the discontinued Crestron gear.</p>
    <div class="howto"><span><b>1.</b>Pick who provides it.</span><span><b>2.</b>The list narrows to just those items.</span></div>
    <div class="app filter-app">
      {radios}
      <div class="pills filter-pills" role="radiogroup" aria-label="Who provides it">{pills}</div>
      <div class="eq-group g-new"><h3>New from Mason</h3><div class="brand-grid">{cards}</div>
        <p class="illus-note">Product images are representative illustrations.</p></div>
      <div class="eq-group g-keep"><h3>Existing, reused</h3><div class="mini-grid">{mini("keep", "Existing", KEEP)}</div></div>
      <div class="eq-group g-owner"><h3>Owner-furnished</h3><div class="mini-grid">{mini("owner", "By EBCI", OWNER)}</div></div>
      <div class="eq-group g-out"><h3>Removed</h3><div class="mini-grid">{mini("out", "Removed", OUT_)}</div></div>
    </div>
  </div>
</section>'''


def components_css():
    r = []
    for f in FILTERS:
        i = f[0]
        r.append(f'#f-{i}:checked ~ .filter-pills label[for="f-{i}"] {{ background: rgba(200,168,75,0.16); border-color: var(--gold); color: var(--white); }}')
        r.append(f'#f-{i}:checked ~ .filter-pills label[for="f-{i}"]::before {{ background: var(--gold); box-shadow: 0 0 0 4px rgba(200,168,75,0.25); }}')
        if f[2]:
            r.append(f'#f-{i}:checked ~ .eq-group:not(.g-{f[2]}) {{ display: none; }}')
    r.append('.filter-app .eq-group:first-of-type { margin-top: 8px; }')
    return "\n  ".join(r)


# ── Scope tabs ─────────────────────────────────────────────────────────────
MASON = [
    "<strong>Furnish, install, configure and commission</strong> the Cyviz xpo5, Easy Controller X and touch panel",
    "<strong>AVPro Edge 16×16 matrix</strong> routing to the xpo5, Teams content input and side display",
    "<strong>LED wall integration</strong>: signal connection, extension where needed, resolution and power control",
    "<strong>Two HDMI wall plates</strong> (back wall, side wall) and <strong>Crestron AirMedia</strong> wireless sharing",
    "<strong>Teams integration</strong>: matrix connections, 1080p content scaling, Cyviz Teams Rooms agent",
    "<strong>Q-SYS Core 8 Flex</strong> design: mixing, ducking, EQ and two speaker zones",
    "<strong>Four room modes</strong>: Conference, Training, EOC (PIN-protected) and Room Off",
    "<strong>Rack rebuild</strong>: remove legacy gear, add shelves, rails, blanks, WattBox, cable dressing and labels",
    "<strong>Dedicated AV network</strong>: switch configuration, addressing and documentation",
    "<strong>Removal</strong> of the Crestron processor, touch controller, designated PDU and obsolete accessories",
    "<strong>Testing and acceptance</strong> with an authorised EBCI representative",
    "<strong>Training and documentation</strong>: touch panel, modes, layouts, sharing, startup and shutdown",
]
EBCI = [
    "<strong>LED wall</strong>: complete installation, power, configuration and readiness through its contractor",
    "<strong>Owner equipment</strong>: Yealink system, Crown amp, Atlas speakers, LG display, three micro PCs, keyboards and mice, IPTV box",
    "<strong>Compatible equipment</strong>: PCs must be micro or tiny form factor to fit the rack",
    "<strong>Network services</strong>: customer-network drops, IP addressing, firewall permissions, internet and Teams connectivity",
    "<strong>Electrical</strong>: suitable power, grounding, receptacles and circuits for the AV equipment",
    "<strong>Pathways and access</strong>: accessible cable paths, conduit, wall and ceiling access",
    "<strong>Scheduling</strong>: room access and approved Teams downtime during the rack rebuild and cutover",
    "<strong>Storage</strong>: an on-site location for removed equipment",
    "<strong>Operations</strong>: source computers, applications, logins and staff for configuration and acceptance",
    "<strong>Rack</strong>: make the existing rack available and authorise equipment removal",
]
NOT = [
    "LED wall supply, mounting, structure, power, module configuration and manufacturer commissioning",
    "A new UPS, new circuits, receptacle changes and electrical permitting",
    "Projector, projection screen and screen controller removal (by EBCI or others unless added)",
    "Off-site transport, recycling or disposal of removed equipment",
    "Replacing Yealink equipment, Teams licensing or changes to Microsoft 365",
    "Application software, PC configuration and user accounts on the owner PCs",
    "Application-level integration with surveillance, emergency management, GIS or IPTV services",
    "EBCI production switches, routers and firewalls",
    "New conduit, core drilling, structural work, drywall, painting or ceiling reconstruction",
    "Auto-switching on laptop connection (inputs are picked on the touch panel)",
    "Repair or replacement of defective existing equipment",
    "Renewal of licences, maintenance and service beyond their contracted terms",
]
TABS = [("mason", "Mason delivers", MASON, "p-mason"), ("ebci", "EBCI provides", EBCI, "p-ebci"), ("out", "Not included", NOT, "p-out")]


def scope_section():
    radios = "".join(f'<input type="radio" name="tab" id="tab-{t[0]}"{" checked" if t[0] == "mason" else ""}>' for t in TABS)
    bar = "".join(f'<label for="tab-{t[0]}">{t[1]}</label>' for t in TABS)
    panels = "".join(f'<div class="tab-panel {t[3]}"><ul class="scope-grid">{"".join(f"<li>{x}</li>" for x in t[2])}</ul></div>' for t in TABS)
    return f'''
<section id="scope">
  <div class="container">
    <div class="section-eyebrow">Scope of work</div>
    <h2 class="section-title">Clear lines, <em>start to finish.</em></h2>
    <p class="section-desc">What Mason delivers, what EBCI provides, and what sits outside this quote. The full scope of work is in the quote document.</p>
    <div class="app tabs">
      {radios}
      <div class="tab-bar" role="tablist">{bar}</div>
      {panels}
    </div>
    <p class="tab-note">Changes to quantities, functions, layout or responsibilities after scope approval may need a written change order.</p>
  </div>
</section>'''


def scope_css():
    r = []
    for t in TABS:
        r.append(f'#tab-{t[0]}:checked ~ .tab-bar label[for="tab-{t[0]}"] {{ color: var(--gold); border-bottom-color: var(--gold); }}')
        r.append(f'#tab-{t[0]}:checked ~ .{t[3]} {{ display: block; }}')
    return "\n  ".join(r)


# ── Investment ─────────────────────────────────────────────────────────────
def investment_section():
    details = ""
    for name, sub, rows in GROUPS:
        trs = ""
        for qty, mfr, part, desc, unit, ext in rows:
            ofe = mfr == "Owner"
            trs += (f'<tr class="{"ofe" if ofe else ""}"><td class="n">{qty:,}</td><td>{esc(desc)}<span class="sku">{esc(mfr + " · " + part if not ofe else "Owner-furnished")}</span></td>'
                    f'<td class="n">{money(unit)}</td><td class="n">{money(ext)}</td></tr>')
        details += (f'<details class="pl"><summary><span class="cat">{name}</span><span class="val">{money(sub)}</span></summary>'
                    f'<div class="table-scroll"><table class="line-items"><thead><tr><th class="n">Qty</th><th>Item</th><th class="n">Unit</th><th class="n">Ext.</th></tr></thead>'
                    f'<tbody>{trs}</tbody></table></div></details>')
    sums = {n: s for n, s, _ in GROUPS}
    equip = sum(s for _, s, _ in GROUPS[:5])
    parts = [("Equipment", equip, "#c8a84b"), ("Cabling", sums["Bulk Wire & Interconnects"], "#8f7a3c"),
             ("Labor & engineering", sums["Installation & Engineering"], "#2eaadc"),
             ("Hardware & direct costs", sums["Miscellaneous Hardware & Direct Costs"], "#5a7894"),
             ("Mason Command Silver", sums["Mason Command Silver SLA"], "#3fae5a")]
    bar = "".join(f'<i style="width:{float(v / TOTAL * 100):.2f}%;background:{c}" title="{k}: {money(v)}"></i>' for k, v, c in parts)
    legend = "".join(f'<span style="--c:{c}">{k} · {money(v)}</span>' for k, v, c in parts)
    return f'''
<section id="investment">
  <div class="container">
    <div class="section-eyebrow">Investment</div>
    <h2 class="section-title">One fixed price <em>for the whole room.</em></h2>
    <p class="section-desc">Every figure below matches Quote #{Q["number"]}, Version {Q["version"]}. Open any line to see the items behind it.</p>
    <div class="investment-layout">
      <div class="price-card">
        <div class="price-label">Total investment</div>
        <div class="price-main">{money(TOTAL)}</div>
        <p class="price-desc">Equipment, cabling, installation, engineering, commissioning, training and the Mason Command Silver SLA, <strong>as quoted</strong>.</p>
        <div class="split-bar" aria-hidden="true">{bar}</div>
        <div class="split-legend">{legend}</div>
        <div class="price-breakdown">{details}</div>
        <div class="total-line"><span>Total</span><span class="val">{money(TOTAL)}</span></div>
        <div class="annual-line"><span>Annual: Mason Command Silver SLA <span class="sku" style="color:var(--muted);font-family:Consolas,monospace;font-size:11px">MTI-SLA-SILVER</span></span><span class="val">{money(ANNUAL)} / yr</span></div>
      </div>
      <div class="quote-details">
        <div class="detail-card"><h4>Quote</h4>
          <div class="detail-row"><span class="dk">Quote</span><span class="dv">#{Q["number"]} · Version {Q["version"]}</span></div>
          <div class="detail-row"><span class="dk">Issued</span><span class="dv">{Q["date"]}</span></div>
          <div class="detail-row"><span class="dk">Valid through</span><span class="dv">{Q["expires"]}</span></div>
          <div class="detail-row"><span class="dk">Site</span><span class="dv">{Q["site"]}</span></div>
          <div class="detail-row"><span class="dk">Prepared by</span><span class="dv">{Q["rep"]}</span></div>
        </div>
        <div class="detail-card"><h4>Payment terms</h4><ul class="terms-list">
          <li>On acceptance, <strong>all material and 10% of labor</strong> (mobilization) are invoiced. Equipment is ordered once that payment is received.</li>
          <li>The rest of the labor is billed by <strong>percent complete, monthly</strong>, net 30 from invoice date.</li>
          <li>Pricing is <strong>firm fixed</strong>; work outside the agreed scope needs an approved change order.</li></ul></div>
        <div class="detail-card"><h4>Warranty</h4><ul class="terms-list">
          <li><strong>Equipment:</strong> 1 year from installation, unless the manufacturer specifies otherwise.</li>
          <li><strong>Labor:</strong> 90 days on installation workmanship.</li>
          <li>Owner-furnished and relocated equipment, including displays, is not warranted by Mason.</li></ul></div>
      </div>
    </div>
  </div>
</section>'''


def page():
    q = Q
    hero_wall = f'<div class="lay prim">{win("sc-cams", "PC 1 · surveillance")}{win("sc-gis", "PC 2 · GIS")}{win("sc-eoc", "PC 3 · WebEOC")}{win("sc-news", "IPTV · news")}</div>'
    timeline = [
        ("1", "Approve & order", "Material and 10% of labor invoiced; equipment ordered on payment.", True),
        ("2", "Field verify", "Rack units and depth, cable runs and the LED wall input confirmed on site.", False),
        ("3", "Drop-ship", "Equipment ships to EBCI receiving for the on-site rack rebuild.", False),
        ("4", "Rack rebuild", "Crestron gear out, new gear in, during agreed Teams downtime.", False),
        ("5", "Wall integration", "xpo5 connected to the LED wall once its installer has it running.", False),
        ("6", "Commission & train", "Acceptance testing with EBCI, then an operator walkthrough.", True),
    ]
    tl = "".join(f'<div class="t-step{" key" if k else ""}"><div class="t-circle">{n}</div><div class="t-label">{t}</div><div class="t-desc">{d}</div></div>' for n, t, d, k in timeline)
    gov = [("city-of-coral-gables", "City of Coral Gables"), ("city-of-miramar", "City of Miramar"), ("united-nations", "United Nations"), ("nypd", "NYPD"),
           ("us-dept-of-state", "U.S. Department of State"), ("us-dept-of-war", "U.S. Department of War"), ("us-navy", "U.S. Navy"),
           ("us-marine-corps", "U.S. Marine Corps"), ("us-army", "U.S. Army"), ("defense-logistics-agency", "Defense Logistics Agency"),
           ("us-dept-of-justice", "U.S. Department of Justice"), ("us-dept-veterans-affairs", "U.S. Department of Veterans Affairs")]
    govgrid = "".join(f'<div class="gov-logo-card" data-name="{n}"><img src="gov-logos/{f}.png" alt="{n}"></div>' for f, n in gov)
    title = f'{q["title"]} – Quote #{q["number"]}'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="Mason Technologies proposal for the Eastern Band of Cherokee Indians Multipurpose Room: Cyviz video wall processing, AVPro Edge switching, Q-SYS audio and one-touch room control.">
<style>
{CSS}
  {modes_css()}
  {schematic_css()}
  {components_css()}
  {scope_css()}
</style>
</head>
<body>

<nav class="site-nav">
  <div class="nav-logos">
    <img class="nav-mason-logo" src="mason-logo-white.png" alt="Mason Technologies">
    <div class="nav-divider"></div>
    <img class="nav-customer-logo" src="ebci-seal.png" alt="Seal of the Eastern Band of Cherokee Indians">
    <div class="nav-subtitle"><strong>{q["title"]}</strong><br>Quote #{q["number"]} · Version {q["version"]}</div>
  </div>
  <input type="checkbox" id="menu-toggle" aria-label="Open menu">
  <label for="menu-toggle" class="menu-btn" aria-hidden="true"><span></span></label>
  <div class="nav-links">
    <a href="#hero">Overview</a><a href="#modes">Modes</a><a href="#system">System</a><a href="#components">Components</a>
    <a href="#scope">Scope</a><a href="#investment">Investment</a><a href="#why" class="nav-cta">Contact</a>
  </div>
</nav>

<section id="hero">
  <div class="container">
    <div class="hero-grid">
      <div>
        <div class="hero-cobranding"><img src="mason-logo-white.png" alt="Mason Technologies"><span class="hero-x">×</span><img src="ebci-seal.png" alt="Eastern Band of Cherokee Indians"></div>
        <div class="badge-row"><span class="badge">Quote #{q["number"]} · V{q["version"]}</span><span class="badge blue">EOC · Training · Teams</span></div>
        <h1 class="hero-title">One room, ready for <span>every mission.</span></h1>
        <p class="hero-subtitle">The Multipurpose Room runs emergency operations, training and Microsoft Teams meetings. We bring the new <strong>220-inch LED wall</strong> to life with a <strong>Cyviz xpo5</strong> video wall processor, an <strong>AVPro Edge 16×16</strong> matrix and a <strong>Q-SYS</strong> audio core, all run from <strong>one touch panel</strong>. Your Teams Room, mics, speakers and rack stay.</p>
        <div class="hero-meta">
          <div class="meta-card"><div class="meta-label">Customer</div><div class="meta-value">{q["customer"]}</div></div>
          <div class="meta-card"><div class="meta-label">Site</div><div class="meta-value">88 Council House Lp, Cherokee, NC</div></div>
          <div class="meta-card"><div class="meta-label">Prepared for</div><div class="meta-value">{q["contact"]}</div></div>
          <div class="meta-card"><div class="meta-label">Total investment</div><div class="meta-value big">{money(TOTAL)}</div></div>
        </div>
      </div>
      <div>
        <div class="room" aria-label="Illustration: the front wall in EOC mode, primary source plus three windows">
          <div class="room-row">
            <div class="rack-mini" aria-hidden="true"><i class="b"></i><i></i><i class="g"></i><i></i><i class="b"></i><i></i><i class="g"></i><i></i><i></i><i class="g"></i><small>RACK</small></div>
            <div class="ledwall">{hero_wall}</div>
          </div>
          <div class="wall-cap"><span>EOC mode · <b>primary + 3</b></span><span>220″ LED · 1920 × 1080</span></div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="n">220″</div><div class="l">LED video wall</div></div>
          <div class="hero-stat"><div class="n">7</div><div class="l">Live windows</div></div>
          <div class="hero-stat"><div class="n">16×16</div><div class="l">Matrix, room to grow</div></div>
          <div class="hero-stat"><div class="n">1</div><div class="l">Touch panel</div></div>
        </div>
      </div>
    </div>
  </div>
</section>
{modes_section()}
{schematic_section()}
{components_section()}

<section id="delivery">
  <div class="container">
    <div class="section-eyebrow">Delivery</div>
    <h2 class="section-title">From approval to <em>first briefing.</em></h2>
    <p class="section-desc">The rack is rebuilt on site from drop-shipped equipment, and the cutover is planned around your Teams downtime and the LED wall installation.</p>
    <div class="timeline-flow">{tl}</div>
    <div class="callout-row">
      <div class="callout"><div class="callout-icon"><svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg></div><div><h4>Isolated AV network</h4><p>A dedicated switch keeps AV traffic off EBCI's production network. Only the controller and designated devices touch both, with routing between them disabled.</p></div></div>
      <div class="callout"><div class="callout-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><div><h4>PIN-protected EOC</h4><p>EOC mode sits behind a PIN, so only authorised staff can change the operations layout.</p></div></div>
      <div class="callout"><div class="callout-icon"><svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg></div><div><h4>Tested end to end</h4><p>Every source, layout, mode, speaker zone and Teams path is verified, then accepted with an authorised EBCI representative.</p></div></div>
    </div>
  </div>
</section>
{scope_section()}
{investment_section()}

<section id="support">
  <div class="container">
    <div class="section-eyebrow">Mason Command</div>
    <h2 class="section-title">Support that <em>answers the call.</em></h2>
    <p class="section-desc">This quote includes the Mason Command Silver service level agreement, alongside a year of Cyviz Essential Support & Maintenance on the video platform.</p>
    <div class="sla-grid">
      <div class="sla-card lead"><div class="k">Mason Command · Silver</div><div class="big">4 hrs <small>response</small></div>
        <p>Remote help desk, Monday–Friday, 9:00 a.m.–5:00 p.m. EST. Unlimited remote support.</p>
        <ul><li>Live phone and email access to support specialists</li><li>Remote troubleshooting, diagnostics and configuration help</li><li>Escalation to senior engineers when needed</li></ul></div>
      <div class="sla-card"><div class="k">On site & monitoring</div><div class="big">3–4 <small>business days</small></div>
        <p>On-site dispatch after remote triage and your approval, at $200–$240 per hour (4-hour minimum, net 30).</p>
        <ul><li>Proactive monitoring with automated health checks and alerts</li><li>Warranty repairs coordinated directly with manufacturers</li><li>Root-cause analysis for recurring issues</li></ul></div>
      <div class="sla-card"><div class="k">Cyviz platform</div><div class="big">12 <small>months included</small></div>
        <p>Cyviz Essential Support & Maintenance plus the Easy Server licences for the controller, Teams Rooms agent and desktop agent.</p>
        <ul><li>Remote monitoring of Cyviz devices, subject to your network policies</li><li>Renewal after the initial term is purchased separately</li></ul></div>
    </div>
    <p class="fine">Preventative maintenance visits are not included in Silver and can be scheduled separately. Coverage excludes Mason-recognised holidays. Re-programming, network design and extra training may be billed separately.</p>
  </div>
</section>

<section id="why">
  <div class="container">
    <div class="section-eyebrow">Why Mason</div>
    <h2 class="section-title">An ally you can call, <em>24/7.</em></h2>
    <p class="section-desc">Mason Technologies is a nationally recognised low-voltage and AV integrator, with dedicated Southeast teams serving Virginia, North Carolina, South Carolina, Georgia and Florida.</p>
    <div class="stat-grid">
      <div class="stat-card"><div class="number">2002</div><div class="heading">Founded</div><p>More than two decades of trusted expertise and responsiveness.</p></div>
      <div class="stat-card"><div class="number">150+</div><div class="heading">W-2 CWA technicians</div><p>Backed by a team of industry experts on every deployment.</p></div>
      <div class="stat-card"><div class="number">40K</div><div class="heading">Sq. ft. warehouse</div><p>Logistics strength to mobilise quickly, day or night.</p></div>
      <div class="stat-card"><div class="number">WBE</div><div class="heading">NYC & nationally certified</div><p>A family business that leads with relationships.</p></div>
    </div>
    <div class="gov-logo-heading">Trusted by government & public-sector agencies</div>
    <div class="gov-logo-grid">{govgrid}</div>
    <div class="cta-box">
      <div class="cta-title">Ready to bring the room together?</div>
      <p class="cta-desc">Approve Quote #{q["number"]} by {q["expires"]} and we'll order equipment and plan the rack rebuild around your Teams downtime and the LED wall installation.</p>
      <div class="cta-cards">
        <div class="cta-card"><div class="cta-label">Your Mason contact</div><div class="cta-name">{q["rep"]}</div><a href="mailto:{q["rep_email"]}">{q["rep_email"]}</a></div>
        <div class="cta-card"><div class="cta-label">Mason Technologies · 24/7</div><div class="cta-name">{q["phone"]}</div><a href="https://mason247.com">mason247.com</a></div>
        <div class="cta-card"><div class="cta-label">Prepared for</div><div class="cta-name">{q["contact"]}</div><span class="cta-sub">{q["customer"]}</span></div>
      </div>
    </div>
  </div>
</section>

<footer>
  <div>
    <div class="footer-logos"><img src="mason-logo-white.png" alt="Mason Technologies"><img src="ebci-seal.png" alt="Eastern Band of Cherokee Indians"></div>
    <div class="footer-sub">517 Commack Rd, Deer Park, NY 11729 · mason247.com · {q["phone"]}<br>{q["title"]} · Quote #{q["number"]} v{q["version"]}</div>
  </div>
  <div class="footer-contact">Questions about this proposal?<br><a href="mailto:{q["rep_email"]}">{q["rep_email"]}</a> · {q["phone"]}</div>
</footer>

</body>
</html>
'''


html = page()
with open(OUT, "w") as f:
    f.write(html)
print(f"wrote {OUT} ({len(html):,} bytes); total {money(TOTAL)} verified against the quote")
