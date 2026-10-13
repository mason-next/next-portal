from parts import RULES, esc, icon, radios, subtabs, pane_next, GOLD_SEL

# ── signal flow schematic ───────────────────────────────────
W = 150
COL = [16, 206, 396, 586, 776, 966]
NODES = {
 # audio lane
 "wl":    ("a", 0, 52, 46, "Wireless ×12", "headsets · lavs · handhelds"),
 "stg":   ("a", 0, 108, 46, "Stage inputs", "instruments · vocals · DI"),
 "chr":   ("a", 0, 164, 46, "Choir mics ×3", "suspended BP4073"),
 "pod":   ("a", 0, 220, 46, "Stage XLR lines", "existing, tested · podium"),
 "rx":    ("a", 1, 52, 46, "SLXD4QDAN+ ×3", "Shure receivers · Dante"),
 "rio":   ("a", 1, 108, 46, "Rio3224-D3", "Dante stage box · rack 3"),
 "dm7":   ("a", 2, 52, 74, "Yamaha DM7", "+ DM7 Control · 72 ch"),
 "core":  ("a", 2, 160, 106, "Q-SYS Core 24f ×2", "main + backup · presets"),
 "qio":   ("a", 3, 120, 46, "QIO-AES8x8 ×3", "AES3, one per amplifier"),
 "als":   ("a", 3, 220, 46, "Listen iDSP", "assistive listening"),
 "amp":   ("a", 4, 120, 46, "YME PDA ×10", "40 ch · amp rack 3"),
 "pa":    ("a", 5, 52, 214, "PA · 33 loudspeakers", ""),
 # video lane
 "cam":   ("v", 0, 330, 46, "PTZ cameras ×6", "Sony SRG-A40 · 4K30"),
 "pc":    ("v", 0, 386, 46, "House PC + iMac", "control room"),
 "lap":   ("v", 0, 442, 46, "Laptops ×5", "2 control room · 3 stage"),
 "zfe":   ("v", 0, 498, 46, "Zoom far end", "Zoom Room HDMI out"),
 "rc":    ("v", 1, 330, 46, "RemoteCam5+ ×6", "video · power · control"),
 "avp":   ("v", 1, 442, 46, "AVPro Edge", "HDBaseT from the stage"),
 "dec":   ("v", 2, 330, 214, "Decimators", "HDMI → 12G-SDI · 4K30"),
 "hub":   ("v", 3, 330, 150, "Videohub 40×40", "12G-SDI router"),
 "atem":  ("v", 3, 500, 64, "ATEM 2 M/E 4K", "M/E 1 prod · M/E 2 pres"),
 "aja":   ("v", 4, 530, 46, "AJA 12G-AM", "house mix ⇄ M/E 1"),
 "proj":  ("d", 5, 312, 34, "Main projector", "existing · 220″ screen"),
 "side":  ("d", 5, 352, 34, "Side displays ×2", "110″ 4K"),
 "mv":    ("d", 5, 392, 34, "Multiview + monitors", "43″ · Lilliput ×2"),
 "rec":   ("d", 5, 432, 34, "HyperDeck 4K Pro", "recording"),
 "str":   ("d", 5, 472, 34, "Streaming Encoder", "live stream"),
 "zm":    ("d", 5, 512, 34, "Zoom Room", "camera in · U-TAP"),
 "conf":  ("d", 5, 552, 34, "Stage confidence", "AVPro to stage plate"),
}
TRACES = [
 ("tr-hs", "A headset in a musical", "mic",
  "<b>Headset in a musical.</b> A DPA CORE+ headset on a Shure bodypack reaches its SLXD4QDAN+ receiver, then travels over Dante to the DM7. The engineer's left, center, right and sub mix returns to Q-SYS over Dante, which applies the locked room tuning and feeds the ten YME amplifiers digitally through the QIO-AES8x8 interfaces. The same mix feeds assistive listening."),
 ("tr-lec", "A lecture without the console", "users",
  "<b>Lecture, no console.</b> A handheld goes from its receiver straight into Q-SYS over Dante; the Lecture preset sets levels and sends it to the PA. The presenter's laptop at a stage plate travels on AVPro Edge HDBaseT to a Decimator, into the router and through ATEM M/E 2 to the main projector and both side displays."),
 ("tr-cam", "A camera shot to the live stream", "camera",
  "<b>Camera to the stream.</b> A Sony SRG-A40 sends 4K over its RemoteCam5+ kit to the control room, where a Decimator turns it into 12G-SDI for the router. ATEM M/E 1 takes the shot; on its way back to the router, the AJA 12G-AM embeds the Q-SYS house mix, so the recorder and the stream both carry the camera and the room sound."),
 ("tr-zoom", "A Zoom guest on the big screens", "video",
  "<b>Zoom guest on screen.</b> The Zoom Room's far-end video comes into the router through a Decimator and goes up on the projector and side displays from M/E 2. At the same time the M/E 1 program, scaled to 1080p, reaches Zoom through the AJA U-TAP as its camera, and Q-SYS exchanges audio with Zoom over USB."),
]
EDGES = [
 ("wl", "rx", "hs lec"), ("rx", "dm7", "hs"), ("rx", "core", "lec"), ("stg", "rio", ""), ("rio", "dm7", ""),
 ("chr", "core", ""), ("pod", "core", ""), ("core", "qio", "hs lec"), ("qio", "amp", "hs lec"),
 ("amp", "pa", "hs lec"), ("core", "als", "hs lec"),
 ("cam", "rc", "cam"), ("rc", "dec", "cam"), ("pc", "dec", ""), ("lap", "avp", "lec"), ("avp", "dec", "lec"), ("zfe", "dec", "zoom"),
 ("dec", "hub", "cam lec zoom"),
 ("hub", "proj", "lec zoom"), ("hub", "side", "lec zoom"), ("hub", "mv", ""), ("hub", "rec", "cam"), ("hub", "str", "cam"),
 ("hub", "zm", "zoom"), ("hub", "conf", ""),
]


def nb(k):
    lane, c, y, h, *_ = NODES[k]
    return COL[c], y, W, h


def bez(x1, y1, x2, y2):
    dx = max(30, (x2 - x1) / 2)
    return f"M{x1} {y1} C{x1+dx} {y1} {x2-dx} {y2} {x2} {y2}"


def schematic():
    node_traces = {k: set() for k in NODES}
    out = ['<svg class="sf" viewBox="0 0 1132 624" role="img" aria-label="System schematic: audio sources through the Yamaha console and Q-SYS to the YME amplifiers and PA; video sources through Decimators, the Videohub router and the ATEM switcher to the screens, recorder, stream and Zoom">',
           '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#5d7a99"/></marker></defs>',
           '<rect class="lane" x="4" y="22" width="1124" height="272" rx="10"/><text class="lane-lbl" x="18" y="40">AUDIO · DANTE · AES3</text>',
           '<rect class="lane" x="4" y="302" width="1124" height="296" rx="10"/><text class="lane-lbl" x="18" y="320">VIDEO · 12G-SDI · 4K30</text>']
    paths = []
    def add(d, tr, extra=""):
        cls = " ".join(f"t-{t}" for t in tr.split()) if tr else ""
        paths.append(f'<path class="ln {cls}{extra}" d="{d}" marker-end="url(#ah)"/>')
    for a, b, tr in EDGES:
        ax, ay, aw, ah = nb(a); bx, by, bw, bh = nb(b)
        y1 = ay + ah / 2; y2 = by + bh / 2
        if b == "pa":
            y2 = min(max(y1, by + 20), by + bh - 20)
        if a == "hub":
            y1 = ay + 14 + (list(NODES).index(b) - list(NODES).index("proj")) * 20
        if b == "dec":
            y2 = min(max(y1, by + 16), by + bh - 16)
        if b == "hub":
            y2 = by + 40
        add(bez(ax + aw, y1, bx, y2), tr)
        for t in tr.split():
            node_traces[a].add(t); node_traces[b].add(t)
    dx_, dy_, dw_, dh_ = nb("dm7"); cx_, cy_, cw_, ch_ = nb("core")
    add(f"M{dx_+dw_/2} {dy_+dh_} V{cy_}", "hs")
    node_traces["dm7"].add("hs"); node_traces["core"].add("hs")
    # router ⇄ switcher, switcher → AJA → router
    hx, hy, hw, hh = nb("hub"); ax_, ay_, aw_, ah_ = nb("atem"); jx, jy, jw, jh = nb("aja")
    add(f"M{hx+50} {hy+hh} V{ay_}", "cam lec zoom")
    add(f"M{ax_+aw_} {ay_+46} C{ax_+aw_+20} {ay_+46} {jx-20} {jy+23} {jx} {jy+23}", "cam zoom")
    add(f"M{jx+jw/2} {jy} C{jx+jw/2} {jy-60} {hx+hw+30} {hy+hh-10} {hx+hw} {hy+hh-10}", "cam zoom")
    add(f"M{ax_+100} {ay_} V{hy+hh}", "lec zoom")
    for k in ("atem", "aja"):
        node_traces[k] |= {"cam", "zoom"} if k == "aja" else {"cam", "lec", "zoom"}
    # cross-lane audio links (dashed)
    cx, cy, cw, ch = nb("core"); zx, zy, zw, zh = nb("zm")
    add(f"M{cx+cw/2-20} {cy+ch} V298 H938 V{jy+23} H{jx+jw}", "cam", " x")
    add(f"M{cx+cw/2+20} {cy+ch} V292 H948 V{zy+17} H{zx}", "zoom", " x")
    node_traces["core"] |= {"cam", "zoom"}
    out += paths
    for k, (lane, c, y, h, t, s) in NODES.items():
        cls = " ".join(f"t-{x}" for x in sorted(node_traces[k]))
        x = COL[c]
        if k == "pa":
            items = ["Main L/R arrays · 8 × iA211X", "Center · CL 114-30", "Subwoofers · 4 × iA 218B", "Front fills · 6 × CS 7P", "Delays · 4 × CS 7P", "Booth · 2 × CS 5P", "Side fills · 4 × CL 114", "Wedges · 4 × MC 12X / 12A"]
            sub = "".join(f'<text class="s" x="{x+10}" y="{y+40+i*21}">{esc(it)}</text>' for i, it in enumerate(items))
            out.append(f'<g class="nd {lane} {cls}"><rect x="{x}" y="{y}" width="{W}" height="{h}" rx="8"/><text class="t" x="{x+10}" y="{y+20}">{esc(t)}</text>{sub}</g>')
        elif k == "atem":
            out.append(f'<g class="nd {lane} {cls}"><rect x="{x}" y="{y}" width="{W}" height="{h}" rx="8"/><text class="t" x="{x+10}" y="{y+20}">{esc(t)}</text><text class="s" x="{x+10}" y="{y+37}">M/E 1 · production</text><text class="s" x="{x+10}" y="{y+52}">M/E 2 · presentation</text></g>')
        else:
            ty = y + (h / 2) - (2 if s else -4)
            sub = f'<text class="s" x="{x+10}" y="{ty+14}">{esc(s)}</text>' if s else ""
            out.append(f'<g class="nd {lane} {cls}"><rect x="{x}" y="{y}" width="{W}" height="{h}" rx="8"/><text class="t" x="{x+10}" y="{ty}">{esc(t)}</text>{sub}</g>')
    out.append('<text x="1124" y="616" text-anchor="end" fill="#7d8fa5" font-size="10">Dashed: audio between Q-SYS and the video system (AJA 12G-AM via QIO-AES8x8, Zoom via USB)</text>')
    out.append("</svg>")
    return "\n".join(out)


for tid, *_ in TRACES:
    t = tid[3:]
    RULES.append(f'#{tid}:checked ~ .plan-wrap .t-{t} {{ }}')
    RULES.append(f'#{tid}:checked ~ .plan-wrap .ln.t-{t} {{ stroke: var(--gold); stroke-width: 2.6; stroke-dasharray: 7 5; animation: flow .9s linear infinite; opacity: 1; }}')
    RULES.append(f'#{tid}:checked ~ .plan-wrap .nd.t-{t} rect {{ fill: rgba(200,168,75,0.16); stroke: var(--gold); stroke-width: 1.8; }}')
    RULES.append(f'#{tid}:checked ~ .readout .ro-{t} {{ display: inline; }}')
    RULES.append(f'#{tid}:checked ~ .sim label[for="{tid}"] {{ {GOLD_SEL} }}')
    RULES.append(f'#{tid}:focus-visible ~ .sim label[for="{tid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}')
RULES.append('.sf .ln { opacity: .55; }')


# ── room plan ───────────────────────────────────────────────
LAYERS = [("ly-spk", "Loudspeakers", True), ("ly-cam", "Cameras", True), ("ly-vid", "Screen & displays", True),
          ("ly-stg", "Stage connections", False), ("ly-mic", "Choir mics", False), ("ly-rack", "Racks & fiber", True)]
for lid, _, _ in LAYERS:
    RULES += [f'#{lid}:not(:checked) ~ .plan-wrap .{lid} {{ display: none; }}',
              f'#{lid}:checked ~ .sim label[for="{lid}"] {{ border-color: rgba(200,168,75,0.6); color: var(--gold-light); }}',
              f'#{lid}:checked ~ .sim label[for="{lid}"]::before {{ background: var(--gold); border-color: var(--gold); }}',
              f'#{lid}:focus-visible ~ .sim label[for="{lid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}']


def room_plan():
    o = ['<svg class="rp" viewBox="0 0 1000 660" role="img" aria-label="Illustrative auditorium plan with loudspeakers, cameras, screen and displays, stage connections, choir microphones and racks">',
         '<rect class="wall" x="20" y="20" width="960" height="620" rx="14"/>',
         # stage
         '<path class="stage" d="M250 34 H750 V196 H250 Z"/><path class="stage" d="M232 196 H768 Q500 236 232 196 Z"/>',
         '<text class="lbl-b" x="500" y="128" text-anchor="middle">STAGE</text>',
         '<path d="M150 34 H250 V196 H150 Z M750 34 H850 V196 H750 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)"/>',
         '<text class="lbl-s" x="200" y="60" text-anchor="middle">STAGE LEFT WING</text><text class="lbl-s" x="800" y="60" text-anchor="middle">STAGE RIGHT WING</text>',
         '<path d="M250 196 V34 M750 196 V34" stroke="rgba(200,168,75,0.6)" stroke-width="3"/>']
    # seating arcs
    for i in range(11):
        r = 200 + i * 30
        o.append(f'<path class="seat" d="M{500-min(r,330)} {250+i*30} Q500 {300+i*34} {500+min(r,330)} {250+i*30}"/>')
    o.append('<path d="M500 250 V600" stroke="#0d1b2a" stroke-width="14"/>')
    o.append('<rect x="50" y="300" width="100" height="250" rx="8" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)"/><rect x="850" y="300" width="100" height="250" rx="8" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)"/>')
    o.append('<text class="lbl-s" x="100" y="568" text-anchor="middle">SIDE SEATING</text><text class="lbl-s" x="900" y="568" text-anchor="middle">SIDE SEATING</text>')
    o.append('<rect x="380" y="590" width="240" height="44" rx="6" fill="rgba(46,170,220,0.06)" stroke="rgba(46,170,220,0.4)"/><text class="lbl-b" x="500" y="628" text-anchor="middle">CONTROL ROOM</text>')
    o.append('<text class="lbl" x="500" y="300" text-anchor="middle">HOUSE</text>')

    # video layer
    v = ['<g class="ly-vid">', '<path class="beam" d="M500 598 L340 48 L660 48 Z"/>', '<rect class="scr" x="340" y="40" width="320" height="8" rx="2"/>',
         '<text class="lbl" x="500" y="66" text-anchor="middle">220″ screen (new) · existing projector in the booth</text>',
         '<rect class="disp" x="196" y="212" width="10" height="70" rx="2" transform="rotate(-24 201 247)"/><rect class="disp" x="794" y="212" width="10" height="70" rx="2" transform="rotate(24 799 247)"/>',
         '<text class="lbl" x="150" y="300" text-anchor="middle">110″ display</text><text class="lbl" x="850" y="300" text-anchor="middle">110″ display</text>',
         '<circle cx="500" cy="600" r="5" fill="#2eaadc"/></g>']
    # loudspeakers
    s = ['<g class="ly-spk">']
    for x in (238, 762):
        s.append(f'<rect class="spk" x="{x-14}" y="198" width="28" height="18" rx="3"/>')
    s.append('<text class="lbl" x="238" y="234" text-anchor="middle">L array</text><text class="lbl" x="762" y="234" text-anchor="middle">R array</text>')
    s.append('<rect class="spk" x="488" y="182" width="24" height="12" rx="3"/><text class="lbl" x="500" y="176" text-anchor="middle">center</text>')
    for x in (400, 460, 540, 600):
        s.append(f'<rect class="sub" x="{x-13}" y="204" width="26" height="12" rx="2"/>')
    for x in (300, 360, 430, 570, 640, 700):
        s.append(f'<circle class="spk" cx="{x}" cy="{218 if x in (430, 570) else 214}" r="6"/>')
    s.append('<text class="lbl-s" x="500" y="246" text-anchor="middle">4 subwoofers under the lip · 6 front fills</text>')
    for x, y in ((100, 380), (100, 470), (900, 380), (900, 470)):
        s.append(f'<circle class="spk" cx="{x}" cy="{y}" r="7"/>')
    s.append('<text class="lbl" x="100" y="420" text-anchor="middle">delays</text><text class="lbl" x="900" y="420" text-anchor="middle">delays</text>')
    for x, y in ((268, 92), (268, 140), (732, 92), (732, 140)):
        s.append(f'<rect class="spk" x="{x-8}" y="{y-10}" width="16" height="20" rx="3"/>')
    s.append('<text class="lbl" x="296" y="120">side fills</text><text class="lbl" x="704" y="120" text-anchor="end">side fills</text>')
    for x, y, c in ((440, 168, "spk"), (560, 168, "spk"), (420, 128, "spk"), (580, 128, "spk")):
        s.append(f'<path class="{c}" d="M{x-10} {y+6} L{x+10} {y+6} L{x+6} {y-6} L{x-6} {y-6} Z"/>')
    s.append('<text class="lbl-s" x="500" y="150" text-anchor="middle">wedges</text>')
    s.append('<circle class="spk" cx="410" cy="612" r="6"/><circle class="spk" cx="590" cy="612" r="6"/>')
    s.append('</g>')
    # cameras
    c = ['<g class="ly-cam">']
    cams = [(60, 250, 30, "1 · stage left"), (940, 250, 150, "2 · stage right"), (470, 580, 90, "3 · center"), (690, 150, 270, "4 · audience"), (300, 560, 58, "5 · production")]
    import math
    for x, y, ang, lab in cams:
        a1, a2 = math.radians(ang - 16), math.radians(ang + 16)
        L = 110
        c.append(f'<path class="cam-fov" d="M{x} {y} L{x+L*math.cos(a1):.0f} {y-L*math.sin(a1):.0f} L{x+L*math.cos(a2):.0f} {y-L*math.sin(a2):.0f} Z"/>')
        c.append(f'<circle class="cam" cx="{x}" cy="{y}" r="8"/>')
        if "audience" in lab:
            c.append(f'<text class="lbl" x="{x-14}" y="{y+4}" text-anchor="end">cam {esc(lab)}</text>')
        else:
            dy = 22 if y < 560 else -14
            c.append(f'<text class="lbl" x="{x}" y="{y+dy}" text-anchor="middle">cam {esc(lab)}</text>')
    for x in (236, 764):
        c.append(f'<circle cx="{x}" cy="150" r="8" fill="none" stroke="#fff" stroke-dasharray="3 2"/>')
    c.append('<text class="lbl" x="200" y="178" text-anchor="middle">cam 6 · portable</text><text class="lbl" x="800" y="178" text-anchor="middle">cam 6 · portable</text>')
    c.append('</g>')
    # stage connections
    sc = ['<g class="ly-stg">']
    for x, y in ((330, 186), (430, 190), (570, 190), (670, 186), (258, 172), (742, 172), (380, 46), (500, 46), (620, 46)):
        sc.append(f'<rect class="conn" x="{x-7}" y="{y-7}" width="14" height="14" rx="3"/>')
    sc.append('<text class="lbl" x="500" y="30" text-anchor="middle">3 upstage · 2 side stage · 4 downstage</text></g>')
    # mics
    m = ['<g class="ly-mic">']
    for x in (440, 500, 560):
        m.append(f'<circle class="mic" cx="{x}" cy="88" r="6"/>')
    m.append('<text class="lbl" x="500" y="108" text-anchor="middle">choir mics, hung ≈ 5 ft out</text></g>')
    # racks
    r = ['<g class="ly-rack">', '<rect class="rk" x="440" y="600" width="26" height="26" rx="3"/><rect class="rk" x="534" y="600" width="26" height="26" rx="3"/>',
         '<text class="lbl" x="453" y="652" text-anchor="middle">rack 1</text><text class="lbl" x="547" y="652" text-anchor="middle">rack 2</text>',
         '<rect class="rk" x="176" y="72" width="30" height="38" rx="3"/><text class="lbl" x="191" y="126" text-anchor="middle">rack 3 · amps</text>',
         '<path class="fib" d="M440 612 C 300 612, 120 560, 120 400 C 120 240, 150 150, 176 92"/>',
         '<text class="lbl" x="128" y="610">OM4 fiber</text></g>']
    o += v + s + c + sc + m + r
    o.append('</svg>')
    return "\n".join(o)


def table(heads, rows, cls=""):
    th = "".join(f"<th>{h}</th>" for h in heads)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows)
    return f'<div class="table-card {cls}"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def rack_el(title, meta, units):
    rows = []
    for u in units:
        name, ru, kind = u
        cls = {"amp": " amp", "thin": " thin", "spare": " spare"}.get(kind, "")
        rows.append(f'<div class="ru{cls}" style="--u:{ru}"><span>{esc(name)}</span></div>')
    return f'<div class="rack-col"><h4>{title}</h4><div class="meta">{meta}</div><div class="rack-el">{"".join(rows)}</div></div>'


def system():
    tr_in = radios("trace", [t for t, *_ in TRACES], "tr-hs", {t: l for t, l, *_ in TRACES})
    tr_lab = "".join(f'<label class="chip" for="{t}">{icon(ic)}{esc(l)}</label>' for t, l, ic, _ in TRACES)
    tr_ro = "".join(f'<span class="ro ro-{t[3:]}">{txt}</span>' for t, _, _, txt in TRACES)
    ly_in = "\n".join(f'<input type="checkbox" id="{l}" class="sr"{" checked" if on else ""} aria-label="Show {esc(n)}">' for l, n, on in LAYERS)
    ly_lab = "".join(f'<label class="chip check" for="{l}">{esc(n)}</label>' for l, n, _ in LAYERS)
    st_in, st_tabs = subtabs("st", [("st-flow", "Signal flow", "zones"), ("st-plan", "Room layout", "pin"), ("st-audio", "Loudspeakers & amplifiers", "speaker"),
                                   ("st-video", "Video routing", "switcher"), ("st-racks", "Racks & network", "rack")], "st-flow", "")

    pa_rows = [
     ["Left and right mains", "iA211X", "8", "Three-way line array element with two 11 in woofers, four amplifier channels each; four per side"],
     ["Center", "CL 114-30", "1", "Two-way 14 in loudspeaker that anchors speech to the stage"],
     ["Subwoofers", "iA 218B", "4", "Dual 18 in, 2,000 W, at or under the stage lip so all output goes toward the audience"],
     ["Front fills", "CS 7P, black", "6", "Two-way 7 in along the stage lip for the first rows under the arrays"],
     ["Delay fills", "CS 7P, white", "4", "Two over each side seating wing at the rear"],
     ["Control booth", "CS 5P, black", "2", "So the operator hears the house mix"],
     ["Side fills", "CL 114-30 + CL 114-15", "4", "One of each model on each side of the stage"],
     ["Stage monitors", "MC 12X + MC 12A", "4", "Two passive wedges at the downstage edge, two self-powered midstage"],
     ["Amplifiers", "PDA 2.0 + PDA 3.0", "10", "Four-channel with built-in processing: nine PDA 2.0, one PDA 3.0 for the subwoofers"],
    ]
    amp_rows = [
     ["A1 to A4", "PDA 2.0", "Mains, two iA211X per amplifier: left upper, left lower, right upper, right lower"],
     ["A5 and A6", "PDA 2.0", "Side fills, one CL 114-30 and one CL 114-15 per side"],
     ["A7", "PDA 2.0", "Center CL 114-30 and front fills 1 to 4"],
     ["A8", "PDA 2.0", "Front fills 5 and 6, four delay fills, two booth loudspeakers"],
     ["A9", "PDA 2.0", "Two MC 12X stage monitors, bi-amped"],
     ["A10", "PDA 3.0", "Four iA 218B subwoofers, one per channel"],
    ]
    router_rows = [
     ["1 to 5", "Cameras 1 to 5: stage left, stage right, center, audience, production angle", "ATEM inputs 1 to 5"],
     ["6", "Camera 6, portable", "ATEM input 6"],
     ["7 and 8", "House computer, iMac", "ATEM inputs 7 and 8"],
     ["9 and 10", "Control room laptops 1 and 2", "ATEM inputs 9 and 10"],
     ["11 to 13", "Stage laptops: downstage, stage left, stage right", "ATEM inputs 11 to 13"],
     ["14", "Zoom Room far-end video", "ATEM input 14"],
     ["15 and 16", "ATEM M/E 1 program (through the AJA 12G-AM) and preview", "Main projector · side display, left"],
     ["17 and 18", "ATEM M/E 2 program and preview", "Side display, right · 43 in multiview display"],
     ["19 and 20", "ATEM multiviews 1 and 2", "Spare · reference monitor, video switching desk"],
     ["21 to 25", "Spare", "Reference monitor, lighting position · recorder · streaming encoder · Zoom camera feed · stage confidence"],
     ["26 to 40", "Spare", "Spare"],
    ]
    racks = '<div class="rack-pair" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + rack_el("Rack 1 · audio, network &amp; control", "Existing control-room rack, reused if it passes inspection", [
        ("Mason rack plate", 1, "thin"), ("Audio patch bays (existing, re-terminated)", 3, ""), ("Q-SYS Core 24f · main", 1, "amp"), ("Q-SYS Core 24f · backup", 1, "amp"),
        ("NETGEAR M4250-40G8XF-PoE++", 1, "amp"), ("NETGEAR M4250-40G8XF-PoE++", 1, "amp"), ("Shure SLXD4QDAN+ ×3 (MDC)", 3, ""), ("Listen iDSP transmitter", 1, ""),
        ("QIO-IR1x4 on QIO tray", 1, ""), ("Vent / blank", 2, "spare"), ("WattBox 800 IP conditioner", 1, ""), ("Xtreme Power 3000 VA Li-ion UPS", 2, "")]) + \
        rack_el("Rack 2 · video", "Existing open rack, reused if it passes inspection", [
        ("Mason rack plate", 1, "thin"), ("Videohub 40×40 12G", 2, "amp"), ("ATEM 2 M/E Constellation 4K", 1, "amp"), ("HyperDeck Studio 4K Pro", 1, ""),
        ("Decimators on shelves", 4, ""), ("RemoteCam5+ receivers on shelf", 2, ""), ("AVPro Edge, AJA, encoder, U-TAP shelf", 2, ""), ("QIO-AES8x8 (video audio)", 1, ""),
        ("Zoom Room appliance shelf", 1, ""), ("WattBox 800 IP conditioner", 1, ""), ("Xtreme Power 3000 VA Li-ion UPS", 2, "")]) + \
        rack_el("Rack 3 · amplifiers, by the stage", "New Middle Atlantic 44-space rack on a caster base", [
        ("Mason rack plate", 1, "thin"), ("NETGEAR M4250-26G4XF-PoE+", 1, "amp"), ("QIO-AES8x8 ×3 on QIO tray", 1, "amp"), ("Yamaha Rio3224-D3 stage box", 3, ""),
        ("YME PDA 2.0 ×9", 9, "amp"), ("YME PDA 3.0", 1, "amp"), ("Vent / blank", 3, "spare"), ("WattBox 800 IP conditioner", 1, ""), ("Xtreme Power 3000 VA Li-ion UPS", 2, "")]) + '</div>'
    net_rows = [
     ["Rack 1", "2 × NETGEAR M4250-40G8XF-PoE++", "Q-SYS Cores and touch panel, wireless receivers, DM7, cameras' control, router, switcher, recorder, encoder, Zoom, computers, WattBox and UPS, stage locations, uplink to MDC"],
     ["Rack 3", "NETGEAR M4250-26G4XF-PoE+", "QIO-AES8x8 interfaces, the ten YME amplifiers for control and monitoring, rack 3 power"],
     ["Link", "OM4 armored fiber, 10G SFP+", "Six strands between the control room switches and rack 3 by the stage, 8 × 10GBASE-SR optics"],
    ]
    vlan = '<div class="grid-3" style="margin-top:18px">' + "".join(f'<div class="card vlan" style="--c:{c}"><h3>{t}</h3><p>{p}</p></div>' for c, t, p in [
        ("#c8a84b", "Q-LAN", "Q-SYS Cores, touch panel, QIO interfaces and peripherals, on its own VLAN."),
        ("#2eaadc", "Dante", "Wireless receivers, DM7 console, Rio stage box, assistive listening and Q-SYS Dante, on its own VLAN."),
        ("#9b8cd9", "AV control", "Cameras, router, switcher, recorder, encoder, amplifiers, power and displays. Video itself stays on 12G-SDI, not the network.")]) + '</div>'

    return f"""
<div class="pane" id="p-system" role="tabpanel" aria-label="System">
<section>
  <div class="container">
    <div class="section-eyebrow">02 · System Design</div>
    <h2 class="section-title">How every signal travels</h2>
    <p class="section-lead">Audio rides Dante and AES3 between the console, Q-SYS and the amplifiers. Video stays on the 12G-SDI workflow MDC's staff already know, at 4K30 from camera to screen, with HDMI only at the edges.</p>
    {st_in}
    {st_tabs}
    <div class="subpanes">
    <div class="subpane sp-st-flow">
      {tr_in}
      <div class="sim">
        <div class="sim-step"><div class="step-n">1</div><div><div class="sim-label">Follow a signal<span class="sim-sub">pick an example and its path lights up</span></div><div class="trace-pick">{tr_lab}</div></div></div>
      </div>
      <div class="readout"><span class="live-dot"></span><div>{tr_ro}</div></div>
      <div class="plan-wrap">{schematic()}</div>
      <p class="scroll-hint">Scroll sideways to see the whole schematic.</p>
      <p class="note">Simplified schematic. Final engineering drawings set every connection, converter and cable.</p>
    </div>
    <div class="subpane sp-st-plan">
      {ly_in}
      <div class="sim">
        <div class="sim-step"><div class="step-n">1</div><div><div class="sim-label">Choose what to show<span class="sim-sub">turn layers on and off</span></div><div class="chips">{ly_lab}</div></div></div>
      </div>
      <div class="plan-wrap">{room_plan()}</div>
      <p class="scroll-hint">Scroll sideways to see the whole plan.</p>
      <div class="legend"><span><i style="background:#c8a84b"></i>Loudspeakers</span><span><i style="background:#8f7631"></i>Subwoofers</span><span><i style="background:#fff"></i>PTZ cameras</span><span><i style="background:#2eaadc"></i>Displays, racks &amp; fiber</span><span><i style="background:#9b8cd9"></i>Stage connections</span><span><i style="background:#3fd17a"></i>Choir mics</span></div>
      <p class="note">Illustrative layout, not to scale. Final positions, array trim, aiming, delays and camera angles are set from the final architectural drawings and during commissioning.</p>
      <div class="sub-title">Stage connections</div>
      {table(["Location", "Points", "What changes"], [["Downstage", "4", "New Cat cabling for video extension, Dante, cameras and control; existing XLR tested and kept where it passes; VGA removed"], ["Side stage", "2, one per side", "New Cat cabling, plus the portable camera connection on each side"], ["Upstage", "3", "New Cat cabling; existing XLR tested and kept where it passes; VGA removed"]])}
    </div>
    <div class="subpane sp-st-audio">
      {table(["Role", "Model", "Qty", "Description"], pa_rows)}
      <div class="sub-title">Amplifier channel map · working layout</div>
      {table(["Amplifier", "Model", "Drives"], amp_rows)}
      <p class="note">Q-SYS feeds each amplifier one AES3 pair from three QIO-AES8x8 interfaces; YME's loudspeaker presets live in the amplifiers, and Mason's room tuning (EQ, delay, levels, alignment) lives in a locked Q-SYS block. The mains are wired as upper and lower pairs so front and rear seats can be tuned separately. The PA partner confirms the channel map before cable is pulled.</p>
    </div>
    <div class="subpane sp-st-video">
      {table(["Router port", "Input", "Output"], router_rows)}
      <div class="grid-3" style="margin-top:18px">
        <div class="card"><h3>One frame rate</h3><p>Cameras run at 29.97 frames per second, and every Decimator and the ATEM are set to match, so nothing stutters between sources.</p></div>
        <div class="card"><h3>24 Decimators</h3><p>One at every HDMI source and display on the router, converting and scaling to 4K30, with two spares on site so a failed unit is swapped in minutes.</p></div>
        <div class="card"><h3>Room to grow</h3><p>The new 40×40 12G router uses about 20 inputs and 25 outputs, and the ATEM has six spare 12G-SDI inputs for more sources later.</p></div>
      </div>
    </div>
    <div class="subpane sp-st-racks">
      {racks}
      <p class="note">Rack elevations are illustrative. Racks 1 and 2 are reused if they pass inspection after cleanup; sizes, heights and ventilation are confirmed during engineering. The PA amplifiers run on dedicated circuits from the electrical contractor, not on the electronics UPS.</p>
      <div class="sub-title">AV network</div>
      {table(["Location", "Switch", "Serves"], net_rows)}
      {vlan}
    </div>
    </div>
    {pane_next("Next: try the switcher, the console and the touch panel", "t-control", "Run the control room")}
  </div>
</section>
</div>"""
