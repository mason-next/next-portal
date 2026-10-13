from parts import RULES, esc, icon, radios, pane_next, GOLD_SEL, THUMBS_LIST, th

CONSOLES = [("c-sw", "Video switcher", "ATEM 2 M/E · cameras &amp; screens", "switcher"),
            ("c-mx", "Audio console", "Yamaha DM7 · mics &amp; mixes", "console"),
            ("c-tp", "Touch panel", "Q-SYS · one-touch presets", "touch"),
            ("c-sd", "Stream Deck", "Companion · one-button macros", "grid")]
for cid, *_ in CONSOLES:
    RULES += [f'#{cid}:checked ~ .cpanes .cp-{cid} {{ display: block; }}',
              f'#{cid}:checked ~ .console-pick label[for="{cid}"] {{ background: rgba(200,168,75,0.14); border-color: var(--gold); color: #fff; }}',
              f'#{cid}:checked ~ .console-pick label[for="{cid}"] .icon {{ color: var(--gold); }}',
              f'#{cid}:focus-visible ~ .console-pick label[for="{cid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}']

# ── VIDEO SWITCHER ──────────────────────────────────────────
SRC = list(THUMBS_LIST.items())  # n → (short, name, body)
ME = {1: {"pgm": 3, "pvw": 5}, 2: {"pgm": 9, "pvw": 7}}
TALLY_RED = "border-color: #e0463a; box-shadow: 0 0 0 1px #e0463a;"
TALLY_GRN = "border-color: #3fd17a; box-shadow: 0 0 0 1px #3fd17a;"


def sw_inputs():
    out = [radios("mesel", ["me-1", "me-2"], "me-1", {"me-1": "Operate M/E 1 panel", "me-2": "Operate M/E 2 panel"})]
    for m in (1, 2):
        for bus in ("p", "v"):
            ids = [f"m{m}{bus}-{n}" for n, _ in SRC]
            dflt = f"m{m}{bus}-{ME[m]['pgm' if bus == 'p' else 'pvw']}"
            labels = {f"m{m}{bus}-{n}": f"M/E {m} {'program' if bus == 'p' else 'preview'}: {s} {nm}" for n, (s, nm, _) in SRC}
            out.append(radios(f"m{m}{bus}", ids, dflt, labels))
    out.append('<input type="checkbox" id="dsk-1" class="sr" aria-label="M/E 1 downstream key: lower third">')
    out.append('<input type="checkbox" id="dsk-2" class="sr" checked aria-label="M/E 2 key: logo bug">')
    for o, l, c in (("o-rec", "Record", True), ("o-str", "Stream", True), ("o-zm", "Zoom", False)):
        out.append(f'<input type="checkbox" id="{o}" class="sr"{" checked" if c else ""} aria-label="{l} on air">')
    return "\n".join(out)


for m in (1, 2):
    RULES.append(f'#me-{m}:checked ~ .hw .pn{m} {{ display: block; }}')
    RULES.append(f'#me-{m}:checked ~ .hw .trans .key.pn{m} {{ display: inline-flex; }}')
    RULES.append(f'#me-{m}:checked ~ .hw .me-pick label[for="me-{m}"] {{ background: #c8a84b; border-color: #c8a84b; color: #0d1b2a; }}')
    RULES.append(f'#me-{m}:checked ~ .hw .mvl-{m} {{ display: inline; }}')
    for n, _ in SRC:
        p, v = f"m{m}p-{n}", f"m{m}v-{n}"
        # bus buttons
        RULES.append(f'#{p}:checked ~ .hw .pn{m} label[for="{p}"] {{ background: linear-gradient(180deg, #ff6b5e, #c0392b); border-color: #ff8a80; color: #fff; box-shadow: 0 0 10px rgba(224,70,58,.6), 0 2px 0 #0b0c0e; }}')
        RULES.append(f'#{v}:checked ~ .hw .pn{m} label[for="{v}"] {{ background: linear-gradient(180deg, #5fe08f, #23964f); border-color: #8ff0b0; color: #062611; box-shadow: 0 0 10px rgba(63,209,122,.55), 0 2px 0 #0b0c0e; }}')
        # multiview big windows, when this M/E is selected
        RULES.append(f'#me-{m}:checked ~ #{p}:checked ~ .hw .mv .pgm .th{n} {{ display: block; }}')
        RULES.append(f'#me-{m}:checked ~ #{v}:checked ~ .hw .mv .pvw .th{n} {{ display: block; }}')
        RULES.append(f'#me-{m}:checked ~ #{p}:checked ~ .hw .mv .pgm .nm{n} {{ display: inline; }}')
        RULES.append(f'#me-{m}:checked ~ #{v}:checked ~ .hw .mv .pvw .nm{n} {{ display: inline; }}')
        # tally on the small windows
        RULES.append(f'#me-{m}:checked ~ #{v}:checked ~ .hw .mv .s{n} {{ {TALLY_GRN} }}')
        RULES.append(f'#me-{m}:checked ~ #{p}:checked ~ .hw .mv .s{n} {{ {TALLY_RED} }}')
        # destinations: M/E 2 → room screens, M/E 1 → record / stream / zoom
        tgt = ".room-front" if m == 2 else ".out-thumb"
        RULES.append(f'#{p}:checked ~ .hw {tgt} .th{n} {{ display: block; }}')
RULES += [
    '#me-1:checked ~ #dsk-1:checked ~ .hw .mv .pgm .l3 { display: block; }',
    '#dsk-1:checked ~ .hw .out-thumb .l3 { display: block; }',
    '#me-2:checked ~ #dsk-2:checked ~ .hw .mv .pgm .bug { display: block; }',
    '#dsk-2:checked ~ .hw .room-front .bug { display: block; }',
    '#dsk-1:checked ~ .hw label[for="dsk-1"], #dsk-2:checked ~ .hw label[for="dsk-2"] { background: linear-gradient(180deg, #ffd96b, #c8a84b); color: #0d1b2a; border-color: #ffe9a8; }',
]
for o in ("o-rec", "o-str", "o-zm"):
    RULES.append(f'#{o}:checked ~ .hw label[for="{o}"] {{ background: #c0392b; border-color: #ff8a80; color: #fff; box-shadow: 0 0 10px rgba(224,70,58,.5); }}')
RULES.append('.mv .nm, .mvl { display: none; }')


def switcher():
    small = "".join(f'<div class="mv-sm s{n}">{th(n)}<div class="cap"><span>{n}</span><span>{esc(s)}</span></div></div>' for n, (s, nm, _) in SRC)
    def big(kind, title):
        names = "".join(f'<b class="nm nm{n}">{esc(s)} · {esc(nm)}</b>' for n, (s, nm, _) in SRC)
        thumbs = "".join(th(n) for n, _ in SRC)
        extra = '<div class="l3">Live from the Wolfson Auditorium<small>Miami Dade College · Building 1</small></div><div class="bug">MDC</div>' if kind == "pgm" else ""
        return f'<div class="mv-big {kind}">{thumbs}{extra}<div class="cap"><span>{title} · <span class="mvl mvl-1">M/E 1</span><span class="mvl mvl-2">M/E 2</span></span>{names}</div></div>'
    def bus(m, b):
        btns = "".join(f'<label for="m{m}{b}-{n}">{esc(s)}<small>{esc(nm)}</small></label>' for n, (s, nm, _) in SRC)
        return f'<div class="bus"><span class="bl">{"Program" if b == "p" else "Preview"}</span>{btns}</div>'
    panels = "".join(f'<div class="pn pn{m}">{bus(m, "p")}{bus(m, "v")}</div>' for m in (1, 2))
    room = '<div class="room-front"><span class="tag" style="left:30%;top:2%">projector · 220″ screen</span>' + "".join(
        f'<div class="scr {p}">{"".join(th(n) for n, _ in SRC)}{"<div class=bug>MDC</div>" if p == "c" else ""}</div>' for p in ("l", "c", "r")) + \
        '<span class="tag" style="left:3%;top:76%">110″ left</span><span class="tag" style="right:3%;top:76%">110″ right</span><div class="floor"></div></div>'
    outthumb = '<div class="out-thumb">' + "".join(th(n) for n, _ in SRC) + '<div class="l3">Live from the Wolfson Auditorium<small>Miami Dade College · Building 1</small></div></div>'
    return f"""
<div class="cpane cp-c-sw">
  <div class="steps-help"><span><b>1</b>Pick a panel: M/E 1 runs the cameras, M/E 2 runs the room's screens</span><span><b>2</b>Tap a source on Preview to set up the next shot, then on Program to put it live</span><span><b>3</b>Watch the multiview and the destinations follow</span></div>
  {sw_inputs()}
  <div class="hw">
    <div class="hw-badge"><span>Multiview · 43″ display at the video switching desk</span><b>ATEM 2 M/E Constellation 4K</b></div>
    <div class="mv">{big("pvw", "PREVIEW")}{big("pgm", "PROGRAM")}{small}</div>
    <div class="sw-grid">
      <div class="panel">
        <div class="panel-head"><span>ATEM 1 M/E Advanced Panel</span><span class="me-pick"><label for="me-1">M/E 1 · Production</label><label for="me-2">M/E 2 · Presentation</label></span></div>
        <div class="hw-scroll">{panels}</div>
        <div class="trans">
          <div class="tb"><button type="button" class="cut" data-act="cut">CUT</button><button type="button" class="auto" data-act="auto">AUTO</button></div>
          <div class="tbar" aria-hidden="true"><i></i></div>
          <div class="tb"><label class="key pn pn1" for="dsk-1">DSK · LOWER THIRD</label><label class="key pn pn2" for="dsk-2">KEY · LOGO</label></div>
        </div>
      </div>
      <div class="dest">
        <div class="panel">
          <div class="panel-head"><span>In the room · M/E 2 program</span></div>
          {room}
        </div>
        <div class="panel">
          <div class="panel-head"><span>Out of the room · M/E 1 program</span></div>
          {outthumb}
          <div class="outs"><label for="o-rec">● REC<small>HyperDeck</small></label><label for="o-str">STREAM<small>Encoder 4K</small></label><label for="o-zm">ZOOM<small>U-TAP</small></label></div>
        </div>
      </div>
    </div>
  </div>
  <p class="hint">Program is the live shot (red); Preview is the next shot (green). On the real panel a T-bar or CUT swaps them; here, tap Program to cut straight to a source. The router sends M/E 2 to the projector and both side displays, and M/E 1 to the recorder, the stream and Zoom, so a presentation and a production run at the same time. Camera views are illustrations.</p>
</div>"""


# ── AUDIO CONSOLE ───────────────────────────────────────────
WL, HS, CH, ST, PB = "#2eaadc", "#3fd17a", "#c8a84b", "#e08a3a", "#9b8cd9"
CHANNELS = [
 # id, short, name, color, source, into, use
 (1, "WL 1", "Host", WL, "Shure SLXD2+ handheld (MDC) on receiver 1, ch 1", "Dante to the DM7 and to Q-SYS", "Every event; also runs through Q-SYS presets when the console is off"),
 (2, "WL 2", "Guest", WL, "Shure SLXD2+ handheld (MDC) on receiver 1, ch 2", "Dante to the DM7 and to Q-SYS", "Q&amp;A, award presenters, a second speaker"),
 (3, "HS 3", "Lead", HS, "DPA CORE+ headset on a Shure SLXD1+ bodypack, receiver 1, ch 3", "Dante to the DM7 and to Q-SYS", "Theater and musicals: sweat-resistant IP58, dual-ear fit"),
 (4, "HS 4", "Cast 2", HS, "DPA CORE+ headset on a Shure bodypack, receiver 1, ch 4", "Dante to the DM7 and to Q-SYS", "Theater and musicals"),
 (5, "HS 5", "Cast 3", HS, "DPA CORE+ headset on a Shure bodypack, receiver 2, ch 1", "Dante to the DM7 and to Q-SYS", "Theater and musicals"),
 (6, "HS 6", "Cast 4", HS, "DPA CORE+ headset on a Shure bodypack, receiver 2, ch 2", "Dante to the DM7 and to Q-SYS", "Theater and musicals"),
 (7, "LAV 7", "Narrator", HS, "DPA CORE+ lavalier on a Shure bodypack, receiver 2, ch 3", "Dante to the DM7 and to Q-SYS", "Speeches, ceremonies, narration"),
 (8, "CHR L", "Choir L", CH, "Audio-Technica BP4073 hung over the choir, left", "Q-SYS Core analog input, then Dante to the DM7", "Chorus and theater ensemble pickup"),
 (9, "CHR C", "Choir C", CH, "Audio-Technica BP4073 hung over the choir, center", "Q-SYS Core analog input, then Dante to the DM7", "Chorus and theater ensemble pickup"),
 (10, "CHR R", "Choir R", CH, "Audio-Technica BP4073 hung over the choir, right", "Q-SYS Core analog input, then Dante to the DM7", "Chorus and theater ensemble pickup"),
 (11, "VOX", "Vocal", ST, "Wired vocal mic at a stage plate", "Yamaha Rio3224-D3 stage box over Dante", "Concerts and jazz"),
 (12, "KEYS", "Piano", ST, "Piano or keyboard at a stage plate", "Yamaha Rio3224-D3 stage box over Dante", "Concerts, jazz, chorus accompaniment"),
 (13, "BASS", "Bass DI", ST, "Bass direct box at a stage plate", "Yamaha Rio3224-D3 stage box over Dante", "Concerts and jazz"),
 (14, "DRUM", "Drums", ST, "Drum mics at a stage plate", "Yamaha Rio3224-D3 stage box over Dante", "Concerts and jazz"),
 (15, "PLAY", "Program", PB, "Presentation and playback audio from the ATEM program, via the AJA 12G-AM and Q-SYS", "Dante from Q-SYS", "Walk-in music, videos, laptop audio"),
 (16, "ZOOM", "Far end", PB, "Remote Zoom participants, from the Zoom Room over USB to Q-SYS", "Dante from Q-SYS", "Hybrid events with remote guests"),
]
SCENES = [("sc-thr", "Theater", "headsets + choir"), ("sc-con", "Concert &amp; jazz", "stage band"), ("sc-cho", "Chorus", "choir + piano"), ("sc-cer", "Ceremony", "speeches + Zoom")]
LEVELS = {
 "sc-thr": [62, 0, 78, 74, 74, 72, 66, 42, 46, 42, 0, 56, 0, 0, 60, 0],
 "sc-con": [64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80, 72, 70, 66, 50, 0],
 "sc-cho": [62, 0, 0, 0, 0, 0, 0, 78, 82, 78, 0, 64, 0, 0, 52, 0],
 "sc-cer": [76, 72, 0, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0, 58, 64],
}
MASTERS = [("m-l", "MAIN", "L / R", 74), ("m-c", "CTR", "Center", 72), ("m-s", "SUB", "Subs", 68)]
MST_LV = {"sc-thr": [74, 76, 60], "sc-con": [78, 70, 80], "sc-cho": [72, 70, 52], "sc-cer": [70, 78, 46]}

for sid, *_ in SCENES:
    RULES.append(f'#{sid}:checked ~ .hw .scenes label[for="{sid}"] {{ background: #c8a84b; border-color: #e2c46e; color: #0d1b2a; }}')
    RULES.append(f'#{sid}:checked ~ .hw .scenes label[for="{sid}"] small {{ color: #3d2f08; }}')
    for (n, *_), lv in zip(CHANNELS, LEVELS[sid]):
        RULES.append(f'#{sid}:checked ~ .hw .ch{n} .knob {{ bottom: {lv}%; }}')
        if lv:
            RULES.append(f'#{sid}:checked ~ .hw .ch{n} .onk {{ background: #3fd17a; color: #062611; border-color: #8ff0b0; box-shadow: 0 0 8px rgba(63,209,122,.5); }}')
            RULES.append(f'#{sid}:checked ~ .hw .ch{n} .vu i {{ animation: vu{(n % 3) + 1} {0.7 + (n % 4) * 0.13:.2f}s ease-in-out infinite alternate; }}')
    for (mid, *_), lv in zip(MASTERS, MST_LV[sid]):
        RULES.append(f'#{sid}:checked ~ .hw .{mid} .knob {{ bottom: {lv}%; }}')
for n, *_ in CHANNELS:
    RULES.append(f'#mu-{n}:checked ~ .hw .ch{n} .onk {{ background: #2a2e33 !important; color: #6b737c !important; border-color: #4a525c !important; box-shadow: none !important; }}')
    RULES.append(f'#mu-{n}:checked ~ .hw .ch{n} .vu i {{ animation: none !important; transform: scaleY(0) !important; }}')
    RULES.append(f'#sel-{n}:checked ~ .hw .ci{n} {{ display: block; }}')
    RULES.append(f'#sel-{n}:checked ~ .hw .ch{n} {{ background: rgba(200,168,75,0.14); box-shadow: inset 0 0 0 1px rgba(200,168,75,0.55); }}')
RULES += ['@keyframes vu1 { from { transform: scaleY(.35); } to { transform: scaleY(.8); } }',
          '@keyframes vu2 { from { transform: scaleY(.5); } to { transform: scaleY(.95); } }',
          '@keyframes vu3 { from { transform: scaleY(.25); } to { transform: scaleY(.7); } }',
          '.mst .vu i { animation: vu2 .8s ease-in-out infinite alternate; }']


def mixer():
    ins = [radios("scene", [s for s, *_ in SCENES], "sc-thr", {s: f"Scene: {l}" for s, l, _ in SCENES})]
    ins.append(radios("selch", [f"sel-{n}" for n, *_ in CHANNELS], "sel-3", {f"sel-{n}": f"Select channel {n} {s}" for n, s, *_ in CHANNELS}))
    ins.append("\n".join(f'<input type="checkbox" id="mu-{n}" class="sr" aria-label="Turn channel {n} {s} off">' for n, s, *_ in CHANNELS))
    scenes = "".join(f'<label for="{s}">{l}<small>{sub}</small></label>' for s, l, sub in SCENES)
    info = "".join(f'<div class="chinfo ci{n}"><b>Ch {n} · {esc(s)} — {esc(nm)}</b><dl><dt>Source</dt><dd>{src}</dd><dt>Into the console</dt><dd>{into}</dd><dt>Used for</dt><dd>{use}</dd></dl></div>' for n, s, nm, c, src, into, use in CHANNELS)
    strips = []
    for n, s, nm, c, *_ in CHANNELS:
        strips.append(f'<div class="strip-c ch{n}"><label class="scrib" for="sel-{n}" style="--sc:{c}">{esc(s)}<small>{esc(nm)}</small></label><div class="vu"><i></i></div><label class="onk" for="mu-{n}">ON</label><div class="fd"><span class="knob"></span></div><span class="chn">{n}</span></div>')
        if n in (7, 10, 14):
            strips.append('<div class="gapx"></div>')
    strips.append('<div class="gapx"></div>')
    for mid, s, nm, _ in MASTERS:
        strips.append(f'<div class="strip-c mst {mid}"><div class="scrib" style="--sc:#e0463a">{s}<small>{nm}</small></div><div class="vu"><i></i></div><span class="onk" style="background:#3fd17a;color:#062611;border-color:#8ff0b0">ON</span><div class="fd"><span class="knob"></span></div><span class="chn">to Q-SYS</span></div>')
    return f"""
<div class="cpane cp-c-mx">
  <div class="steps-help"><span><b>1</b>Recall a scene on the console screen</span><span><b>2</b>Tap a channel name to see where it comes from</span><span><b>3</b>Tap ON to switch a channel off and on</span></div>
  {chr(10).join(ins)}
  <div class="hw">
    <div class="hw-badge"><span>Production console · control room</span><b>Yamaha DM7 Compact + DM7 Control</b></div>
    <div class="mix-top">
      <div class="lcd"><h5><span>Scene recall</span><span>4 of many</span></h5><div class="scenes">{scenes}</div></div>
      <div class="lcd"><h5><span>Selected channel</span><span>Dante</span></h5>{info}</div>
    </div>
    <div class="hw-scroll"><div class="strips">{"".join(strips)}</div></div>
    <div class="flowline"><span>DM7 main L · C · R + sub</span><i>→</i><span>Dante</span><i>→</i><span>Q-SYS Core 24f</span><i>→</i><span class="lock">{icon("lock", "icon")} room tuning, locked</span><i>→</i><span>QIO-AES8x8 ×3</span><i>→</i><span>YME PDA ×10</span><i>→</i><span>33 loudspeakers</span></div>
    <div class="flowline"><span>Side-fill &amp; wedge mixes <small>8</small></span><span>Record / stream mix <small>to M/E 1 via the AJA</small></span><span>Assistive listening <small>Listen iDSP</small></span><span>Stage outputs <small>16 on the Rio</small></span></div>
  </div>
  <p class="hint">Sixteen of the console's 72 input channels are shown, with example names. Scenes and channel layouts are built with MDC's staff during programming. For lectures and simple events, the same wireless mics run through Q-SYS presets and the console can stay off.</p>
</div>"""


# ── Q-SYS TOUCH PANEL ───────────────────────────────────────
PRESETS = [("q-lec", "Lecture", "presentation"), ("q-thr", "Theater", "performance"), ("q-con", "Concert", "live production"),
           ("q-str", "Stream &amp; record", "event capture"), ("q-zm", "Zoom", "conferencing"), ("q-off", "System off", "shut down")]
STATUS = [  # id, icon, title, {preset: (lit, text)}
 ("pa", "array", "PA", {"q-lec": (1, "speech: center + fills"), "q-thr": (1, "full L · C · R + subs"), "q-con": (1, "full L · C · R + subs"), "q-str": (1, "full system"), "q-zm": (1, "speech: center + fills"), "q-off": (0, "off")}),
 ("mon", "speaker", "Stage monitors", {"q-lec": (0, "off"), "q-thr": (1, "side fills + wedges"), "q-con": (1, "side fills + wedges"), "q-str": (1, "as needed"), "q-zm": (0, "off"), "q-off": (0, "off")}),
 ("mic", "mic", "Wireless mics", {"q-lec": (1, "handhelds via Q-SYS"), "q-thr": (1, "all 12 to the DM7"), "q-con": (1, "via the DM7"), "q-str": (1, "via the DM7 or Q-SYS"), "q-zm": (1, "handhelds via Q-SYS"), "q-off": (0, "off")}),
 ("dm7", "console", "DM7 console", {"q-lec": (0, "not needed"), "q-thr": (1, "in use"), "q-con": (1, "in use"), "q-str": (1, "in use"), "q-zm": (0, "not needed"), "q-off": (0, "off")}),
 ("scr", "screen", "Main screen", {"q-lec": (1, "down"), "q-thr": (1, "down · scenic backdrop"), "q-con": (0, "up"), "q-str": (1, "down"), "q-zm": (1, "down"), "q-off": (0, "up")}),
 ("prj", "video", "Projector", {"q-lec": (1, "on · M/E 2"), "q-thr": (1, "on · backdrop"), "q-con": (0, "off"), "q-str": (1, "on · M/E 2"), "q-zm": (1, "on · far end"), "q-off": (0, "off")}),
 ("dsp", "video", "Side displays", {"q-lec": (1, "on · slides"), "q-thr": (0, "off"), "q-con": (1, "on · cameras"), "q-str": (1, "on"), "q-zm": (1, "on · far end"), "q-off": (0, "off")}),
 ("cam", "camera", "Cameras", {"q-lec": (0, "standby"), "q-thr": (1, "on · recording"), "q-con": (1, "on"), "q-str": (1, "on · M/E 1"), "q-zm": (1, "on · to Zoom"), "q-off": (0, "standby")}),
 ("rec", "rec", "Recorder", {"q-lec": (0, "ready"), "q-thr": (1, "recording"), "q-con": (1, "recording"), "q-str": (1, "recording"), "q-zm": (0, "ready"), "q-off": (0, "off")}),
 ("str", "stream", "Stream", {"q-lec": (0, "ready"), "q-thr": (0, "ready"), "q-con": (1, "live"), "q-str": (1, "live"), "q-zm": (0, "ready"), "q-off": (0, "off")}),
 ("zm", "users", "Zoom", {"q-lec": (0, "ready"), "q-thr": (0, "ready"), "q-con": (0, "ready"), "q-str": (0, "ready"), "q-zm": (1, "in meeting"), "q-off": (0, "off")}),
 ("als", "ear", "Assistive listening", {"q-lec": (1, "on"), "q-thr": (1, "on"), "q-con": (1, "on"), "q-str": (1, "on"), "q-zm": (1, "on"), "q-off": (0, "off")}),
]
PDESC = {
 "q-lec": "<b>Lecture.</b> One technician, no console. Handheld mics run through Q-SYS at speech levels on the center and fills, the screen comes down, and the presenter's laptop shows on the projector and both side displays.",
 "q-thr": "<b>Theater.</b> The DM7 takes over the mix, monitors and side fills come on, the screen comes down for scenic projection, and the cameras record the performance.",
 "q-con": "<b>Concert.</b> Full PA with subwoofers, performer monitoring, camera shots on the side displays, and the show recorded and streamed.",
 "q-str": "<b>Stream &amp; record.</b> Cameras on M/E 1 go to the recorder and the stream with the house mix embedded; M/E 2 keeps the room's screens independent.",
 "q-zm": "<b>Zoom.</b> Remote participants on the projector and side displays, the program camera sent to Zoom, and room mics and loudspeakers connected through Q-SYS.",
 "q-off": "<b>System off.</b> Mics, displays and projector off, screen up, amplifiers to standby. Startup reverses the sequence.",
}
for pid, *_ in PRESETS:
    RULES.append(f'#{pid}:checked ~ .device label[for="{pid}"] {{ background: var(--gold); border-color: var(--gold); color: var(--navy); }}')
    RULES.append(f'#{pid}:checked ~ .device label[for="{pid}"] small {{ color: #3d2f08; }}')
    RULES.append(f'#{pid}:checked ~ .device .qpd-{pid} {{ display: block; }}')
    RULES.append(f'#{pid}:focus-visible ~ .device label[for="{pid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}')
    for sid, _, _, st in STATUS:
        RULES.append(f'#{pid}:checked ~ .device .qs-{sid} .{pid} {{ display: block; }}')
        if st[pid][0]:
            RULES.append(f'#{pid}:checked ~ .device .qs-{sid} {{ background: rgba(200,168,75,0.16); border-color: var(--gold); }}')
            RULES.append(f'#{pid}:checked ~ .device .qs-{sid} .icon {{ color: var(--gold-light); }}')
            RULES.append(f'#{pid}:checked ~ .device .qs-{sid} span {{ color: #e2c46e; }}')
RULES.append('#q-off:checked ~ .device label[for="q-off"] { background: #c0392b; border-color: #e05a4f; color: #fff; }')


def touch():
    ins = radios("qpre", [p for p, *_ in PRESETS], "q-lec", {p: f"{l} preset" for p, l, _ in PRESETS})
    btns = "".join(f'<label class="ubtn{" off" if p == "q-off" else ""}" for="{p}">{l}<small>{s}</small></label>' for p, l, s in PRESETS)
    tiles = "".join(f'<div class="qs qs-{sid}">{icon(ic)}<div><b>{t}</b>' + "".join(f'<span class="{p}">{txt}</span>' for p, (_, txt) in st.items()) + '</div></div>' for sid, ic, t, st in STATUS)
    desc = "".join(f'<div class="qpd qpd-{p}">{d}</div>' for p, d in PDESC.items())
    return f"""
<div class="cpane cp-c-tp">
  <div class="steps-help"><span><b>1</b>Tap a preset</span><span><b>2</b>Watch which systems turn on, and how</span><span><b>3</b>The same screens run on staff computers and tablets</span></div>
  {ins}
  <div class="device">
    <div class="screen">
      <div class="uhdr"><img src="mdc-logo-white.svg" alt="Miami Dade College"><div class="ttl">Building 1 Auditorium<small>Touch panel · control room desk</small></div><span class="now"><i></i>Q-SYS Core 24f · backup ready</span></div>
      <div class="upage" style="display:block">
        <div class="uhead"><h4>Room presets</h4><span>One touch sets the PA, mics, screens, cameras and outputs</span></div>
        <div class="preset-wrap">
          <div><div class="preset-grid">{btns}</div>{desc}<div class="tuning">{icon("lock")}Engineering and room tuning are locked to Mason and MDC technical staff.</div></div>
          <div class="qs-grid">{tiles}</div>
        </div>
      </div>
    </div>
  </div>
  <p class="hint">Mockup for discussion. Presets, screen names and behavior are finalized with MDC during Q-SYS programming.</p>
</div>"""


# ── STREAM DECK ─────────────────────────────────────────────
MACROS = [
 ("sd-1", "Start of show", "play", ("#5a3e0a", "#c8a84b"), "Takes the room from walk-in to curtain.",
  [("Q-SYS", "Recall the Theater preset; fade walk-in music"), ("ATEM", "M/E 1 to camera 5, wide; lower third off"), ("HyperDeck", "Start recording"), ("Encoder", "Go live on the stream")]),
 ("sd-2", "Speaker close-up", "camera", ("#123456", "#2eaadc"), "Puts the person at the podium on screen with a name title.",
  [("Camera 3", "Recall the podium preset; AI framing on"), ("ATEM", "M/E 1 auto-transition to camera 3"), ("ATEM", "Downstream key: name lower third on")]),
 ("sd-3", "Audience Q&amp;A", "users", ("#0f4d3f", "#1d8a6d"), "Turns the room around for questions.",
  [("Q-SYS", "Unmute wireless 2, the guest handheld"), ("Camera 4", "Recall the audience preset"), ("ATEM", "M/E 1 to camera 4")]),
 ("sd-4", "Slides to screens", "screen", ("#3b2a6b", "#9b8cd9"), "Sends the presenter's laptop to the room.",
  [("ATEM", "M/E 2 to the stage laptop"), ("Videohub", "M/E 2 program to the projector and both side displays"), ("Q-SYS", "Unmute program audio")]),
 ("sd-5", "Zoom guest on screens", "video", ("#0e3a6e", "#2D8CFF"), "Brings a remote guest into the room.",
  [("ATEM", "M/E 2 to the Zoom far end"), ("Videohub", "M/E 1 program to the Zoom camera feed"), ("Q-SYS", "Zoom audio to the PA; room mics to Zoom")]),
 ("sd-6", "Intermission", "pause", ("#4a3a10", "#8f7631"), "Holds the room and the stream during a break.",
  [("ATEM", "M/E 1 to the iMac intermission graphic"), ("Q-SYS", "Mics down, intermission music up"), ("HyperDeck", "Keep recording")]),
 ("sd-7", "Record + stream", "rec", ("#4f1d1d", "#c0392b"), "One button for both outputs.",
  [("HyperDeck", "Start or stop recording"), ("Encoder", "Start or stop the stream"), ("Q-SYS", "House mix to the record / stream bus")]),
 ("sd-8", "End of show", "power", ("#2a2f36", "#59616b"), "Wraps up cleanly.",
  [("ATEM", "Fade M/E 1 to the closing graphic"), ("Encoder", "End the stream; HyperDeck stops"), ("Q-SYS", "Recall the System off preset")]),
]
for mid, *_ in MACROS:
    RULES.append(f'#{mid}:checked ~ .sd-wrap .mac-{mid} {{ display: block; }}')
    RULES.append(f'#{mid}:checked ~ .sd-wrap label[for="{mid}"] {{ box-shadow: 0 0 0 2px #fff, 0 0 16px rgba(255,255,255,.35); }}')
    RULES.append(f'#{mid}:focus-visible ~ .sd-wrap label[for="{mid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}')


def deck():
    ins = radios("sdk", [m for m, *_ in MACROS], "sd-1", {m: f"Macro: {t}" for m, t, *_ in MACROS})
    keys = []
    mac_keys = {i: m for i, m in zip((0, 1, 2, 3, 8, 9, 10, 11), MACROS)}
    filler = ["CAM 1", "CAM 2", "CAM 3", "CAM 4", "CAM 5", "CAM 6", "PVW", "PGM", "MIC 1", "MIC 2", "PLAY", "MUTE", "SCRN ↑", "SCRN ↓", "REC", "LIVE", "LOGO", "L3", "FTB", "AUTO", "CUT", "HOUSE", "ZOOM", "BLANK"]
    f = iter(filler)
    for i in range(32):
        if i in mac_keys:
            m, t, ic, (k1, k2), *_ = mac_keys[i]
            keys.append(f'<label for="{m}" style="--k1:{k1};--k2:{k2}">{icon(ic)}{t}</label>')
        else:
            keys.append(f'<div>{next(f)}</div>')
    reads = "".join(f'<div class="mac mac-{m}"><h4>{t}</h4><p>{p}</p><ol>' + "".join(f"<li><b>{s}</b><span>{esc(a)}</span></li>" for s, a in steps) + '</ol></div>' for m, t, _, _, p, steps in MACROS)
    return f"""
<div class="cpane cp-c-sd">
  <div class="steps-help"><span><b>1</b>Tap a colored key</span><span><b>2</b>See every system it drives, in order</span><span><b>3</b>One button replaces a handful of separate interfaces</span></div>
  {ins}
  <div class="sd-wrap">
    <div class="deck"><div class="hw-badge"><span>Elgato Stream Deck XL</span><b>Bitfocus Companion</b></div><div class="keys">{"".join(keys)}</div></div>
    <div class="sd-read">{reads}</div>
  </div>
  <p class="hint">Example macros. Mason programs the operator macros with MDC during commissioning, across the ATEM, the router, the cameras, the recorder, the stream and Q-SYS presets.</p>
</div>"""


def control():
    ins = radios("console", [c for c, *_ in CONSOLES], "c-sw", {c: l for c, l, *_ in CONSOLES})
    pick = "".join(f'<label for="{c}">{icon(ic)}<span>{l}<small>{s}</small></span></label>' for c, l, s, ic in CONSOLES)
    cards = [("switcher", "Two panels, one switcher", "Each M/E has its own ATEM 1 M/E Advanced Panel, so production and presentation can run with one operator or two."),
             ("console", "Console when you need it", "The DM7 handles theater and concerts. For everyday events, Q-SYS presets run the same wireless mics without it."),
             ("camera", "Camera control", "A Sony RM-IP500 joystick sets presets, exposure and color for all six cameras; touch-to-track runs on the 24 in Dell touch monitor."),
             ("touch", "Panel anywhere", "The Q-SYS touch panel sits on the control room desk, and the same screens run on staff computers and tablets where MDC permits."),
             ("lock", "Protected tuning", "Room EQ, delays and loudspeaker alignment sit in a locked Q-SYS block; staff controls cannot change them."),
             ("monitor", "Service computer", "A separate Mason service PC runs Q-SYS Designer, Dante Controller and device software, so troubleshooting never interrupts the show.")]
    card_html = "".join(f'<div class="card"><h3>{icon(i)}{t}</h3><p>{p}</p></div>' for i, t, p in cards)
    return f"""
<div class="pane" id="p-control" role="tabpanel" aria-label="Control room">
<section>
  <div class="container">
    <div class="section-eyebrow">03 · Control Room</div>
    <h2 class="section-title">Run the control room</h2>
    <p class="section-lead">These are working mockups of the four surfaces MDC's staff will use: the ATEM production switcher, the Yamaha console, the Q-SYS touch panel and the Stream Deck. Try them; each one shows what happens across the rest of the system.</p>
    {ins}
    <div class="console-pick">{pick}</div>
    <div class="cpanes">
{switcher()}
{mixer()}
{touch()}
{deck()}
    </div>
    <div class="uci-cards">{card_html}</div>
    {pane_next("Next: every component on the quote", "t-equipment", "See the equipment")}
  </div>
</section>
</div>"""
