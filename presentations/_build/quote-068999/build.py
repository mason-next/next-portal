import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from css import CSS
from svgs import room_svg, plan_existing, coverage_svg, flow_gb, flow_best, COL, KINDNAME

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "quote-068999-v1", "presentation.html")
OPT = {"good": "og", "better": "ob", "best": "ox"}

# ---------------- what every screen shows, per option + mode ----------------
GB = {
    "mc": {"NL": ("far", "Remote participants"), "NR": ("far", "Participants, 2nd screen"),
           "E": ("far", "Copy of North-L"), "S": ("far", "Copy of North-L")},
    "ms": {"NL": ("far", "Remote participants"), "NR": ("content", "Shared content"),
           "E": ("far", "Copy of North-L"), "S": ("far", "Copy of North-L")},
    "ml": {"NL": ("home", "Teams Rooms home"), "NR": ("content", "Laptop content"),
           "E": ("home", "Teams Rooms home"), "S": ("home", "Teams Rooms home")},
    "mt": {"NL": ("dell", "Dell PC, touch on"), "NR": ("dell", "Dell PC, touch on"),
           "E": ("home", "No change (Teams)"), "S": ("home", "No change (Teams)")},
}
BEST = {
    "mc": {"NL": ("far", "Remote participants"), "NR": ("far", "Participants, 2nd screen"),
           "E": ("far", "Remote participants"), "S": ("far", "Remote participants")},
    "ms": {"NL": ("far", "Remote participants"), "NR": ("content", "Shared content"),
           "E": ("far", "Copy of North-L"), "S": ("content", "Copy of North-R")},
    "ml": {"NL": ("local", "Laptop, native 4K"), "NR": ("local", "Laptop, native 4K"),
           "E": ("local", "Laptop, native 4K"), "S": ("local", "Laptop, native 4K")},
    "mt": {"NL": ("dell", "Dell desktop 1, touch"), "NR": ("dell", "Dell desktop 2, touch"),
           "E": ("dell", "Copy of North-L"), "S": ("dell", "Copy of North-R")},
}

MODES = [
    ("m-call", "mc", "Teams meeting", "Video call, nobody sharing",
     '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F28C38" stroke-width="1.8"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3"/></svg>'),
    ("m-share", "ms", "Meeting + sharing", "Laptop shared into the call",
     '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4DA3FF" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M9 10l3-3 3 3M12 7v6"/></svg>'),
    ("m-local", "ml", "In-room presentation", "No call, just the room",
     '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3CC8A0" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M7 21h10M12 17v4"/></svg>'),
    ("m-touch", "mt", "Interactive touch PC", "The Dell on the 75″ screens",
     '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B48CFF" stroke-width="1.8"><path d="M9 11V5a2 2 0 014 0v6M13 10a2 2 0 014 0v2M17 11a2 2 0 014 0v4a6 6 0 01-6 6h-2a6 6 0 01-5-3l-3-5a2 2 0 013-2l2 2"/></svg>'),
]

DEV = {"good": ("Rally Bar", "Logitech Sight", "Tap IP"), "better": ("Neat Bar Pro", "Neat Center", "Neat Pad")}

def steps(opt, m):
    if opt in ("good", "better"):
        bar, tab, ctl = DEV[opt]
        S = {
            "mc": [f"If the screens are dark, switch them on with their <b>TV remotes</b>. There's one on a retractable tether behind each display.",
                   f"Tap the meeting on the <b>{ctl}</b> on the table. It joins in one touch.",
                   f"The <b>{bar}</b> on the east wall shows the room and <b>{tab}</b> in the middle of the table frames people up close. Teams switches between them automatically.",
                   f"Mute, volume and camera are all on the {ctl}.",
                   f"Tap <b>Leave</b> when you're done, then switch the displays off with their remotes."],
            "ms": [f"Join the meeting from the <b>{ctl}</b>.",
                   "Plug into a table <b>HDMI</b> or <b>USB-C</b> cable, or press the button on an <b>AirMedia</b> puck to share wirelessly.",
                   f"The under-table switcher picks the newest source and sends it to the {bar}. Teams shares it to remote attendees and shows it on <b>North-R</b>.",
                   "North-L, East and South keep showing the remote participants, so everyone can see both people and content.",
                   "Unplug, or stop sharing from the controller, to go back."],
            "ml": ["Switch the displays on with their <b>TV remotes</b> if needed.",
                   "Plug into a table <b>HDMI</b> or <b>USB-C</b>, or use an <b>AirMedia</b> puck. No meeting is needed.",
                   f"Your laptop appears on <b>North-R</b> through the {bar}.",
                   "The other three screens stay on the Teams Rooms home screen. They're copies of the first Teams output, so they can't be pointed at the laptop on their own."],
            "mt": ["Pick up the <b>TV remote</b> tethered behind North-L or North-R.",
                   "Press <b>Input</b> and choose the PC input. The Dell's desktop fills that screen.",
                   "Touch the screen to work on the Dell. Touch lines up when the Dell fills the screen.",
                   "To bring the Dell into a call, join or share from Teams on the Dell itself.",
                   "When you're done, use the same remote to switch the input back to Teams."],
        }
        return S[m]
    S = {
        "mc": ["Tap the meeting on the <b>Logitech Tap</b>. The room wakes up: Q-SYS turns the displays on and sets the meeting layout.",
               "<b>Huddly Crew</b> picks the best shot of whoever is talking from three angles and switches automatically.",
               "The <b>ceiling microphone</b> picks up every seat, and the <b>ceiling speakers</b> spread the far end evenly around the table.",
               "Mute and room volume are on the Tap.",
               "Tap <b>Leave</b>, then <b>Room Off</b> in Room Controls to power everything down."],
        "ms": ["Join from the Tap, then plug into a table <b>HDMI</b> or <b>USB-C</b>, or press an <b>AirMedia</b> puck.",
               "Q-SYS sees the new signal and switches the content screens automatically: <b>North-R</b> and <b>South</b> show your content.",
               "Remote attendees get a 1080p copy through Teams. The room sees your laptop at its <b>full native resolution</b>.",
               "North-L and East keep the remote participants on screen.",
               "Unplug and the screens go back to the meeting layout."],
        "ml": ["No meeting needed. Plug in or use AirMedia, then tap <b>Present</b> in Room Controls on the Tap.",
               "The matrix sends your laptop to <b>all four screens</b> at native resolution. Nothing passes through Teams compression.",
               "The ceiling speakers carry laptop audio. Room volume is on the Tap.",
               "Tap <b>Meeting</b> or <b>Room Off</b> when you're done."],
        "mt": ["Tap <b>Touch PC</b> in Room Controls on the Tap.",
               "Q-SYS routes the Dell's two desktops to <b>North-L</b> and <b>North-R</b>. Each touch screen controls its own desktop.",
               "East and South can copy the touch screens so the whole room follows along.",
               "Tap <b>Meeting</b> to go straight back to the call layout. No remotes, no input menus."],
    }
    return S[m]

def far_end(opt, m):
    if m == "ml":
        return [("Remote attendees", "No call in this mode. It's for the people in the room."),
                ("Sound", "Ceiling speakers" if opt == "best" else "The video bar's speakers")]
    if m == "mt":
        return [("Remote attendees", "See the Dell only if it's shared from Teams on the Dell"),
                ("Touch", "Goes to the Dell. It doesn't control the Teams room")]
    see = {"good": "Rally Bar room view plus Sight close-ups, switched automatically",
           "better": "Bar Pro room view plus Neat Center close-ups across the table",
           "best": "Huddly Crew's best shot of whoever is talking, from three angles"}[opt]
    hear = {"good": "Rally Bar and Sight microphones (Sight adds seven at mid-table)",
            "better": "Bar Pro and Neat Center microphones",
            "best": "Shure ceiling array, cleaned up by Q-SYS echo cancellation"}[opt]
    rows = [("They see", see), ("They hear", hear)]
    if m == "ms":
        rows.append(("Content", "1080p copy of the table source (the room sees it native)" if opt == "best"
                     else "Table source through the bar's HDMI input"))
    return rows

def notes(opt, m):
    gb = opt in ("good", "better")
    N = {
        ("gb", "mc"): ("", "All four screens show copies of the bar's two Teams outputs. They follow Teams layouts rather than being routed one by one."),
        ("gb", "ms"): ("blue", "Teams Rooms on Android puts shared content on the second screen, so North-R is the content screen. South shows a copy of North-L, the remote participants."),
        ("gb", "ml"): ("", "Only North-R shows the laptop in this mode. If everyone needs to see it on every wall, that's what Best's matrix adds."),
        ("gb", "mt"): ("", "Display power and input are on each display's own remote. The table controller runs Teams but can't switch the screens."),
        ("best", "mc"): ("gold", "One touch on the Tap powers the room on and sets every screen. Nobody needs a TV remote."),
        ("best", "ms"): ("gold", "Content screens switch automatically when a laptop signal appears. There's nothing to press."),
        ("best", "ml"): ("gold", "Local content goes straight to the screens at native resolution and never passes through Teams compression."),
        ("best", "mt"): ("", "Touch is wired to the Dell. If a 75″ is showing something else, a touch still lands on the Dell's hidden desktop. Use Touch PC mode before touching the screens."),
    }
    cls, txt = N[("gb" if gb else "best", m)]
    return f'<div class="note {cls}">{txt}</div>'

LEG = {"good": ["Logitech Rally Bar (east wall)", "Logitech Sight (table center)", "Tap IP controller", "Table HDMI / USB-C / AirMedia",
                "Under-table equipment", "Ceiling box (video distribution)", "Dell in-room PC (behind North-R)", "Tap Scheduler (outside door)"],
       "better": ["Neat Bar Pro (east wall)", "Neat Center (table center)", "Neat Pad controller", "Table HDMI / USB-C / AirMedia",
                  "Under-table equipment", "Ceiling box (video distribution)", "Dell in-room PC (behind North-R)", "Tap Scheduler (outside door)"],
       "best": ["Credenza rack under East 65", "Shure ceiling microphone", "Ceiling speakers (4)", "Huddly cameras (north, south, east)",
                "Logitech Tap (meeting + room control)", "Table HDMI / USB-C / AirMedia", "Under-table equipment", "Tap Scheduler (outside door)"]}

def sim_block():
    out = []
    for opt, oc in OPT.items():
        routes = GB if opt != "best" else BEST
        leg = "".join(f'<span><b style="color:var(--gold)">{i+1}</b> {t}</span>' for i, t in enumerate(LEG[opt]))
        remote_leg = '<span><i style="background:none;border:1.5px solid var(--far)"></i>TV remote on tether</span>' if opt != "best" else ""
        out.append(f'''<div class="{oc}"><div class="sim">
  <div><div class="room">{room_svg(opt, routes)}</div>
    <div class="legend"><span><i style="background:{COL['far']}"></i>Meeting video</span><span><i style="background:{COL['content']}"></i>Shared content</span>
    <span><i style="background:{COL['local']}"></i>Laptop, native</span><span><i style="background:{COL['dell']}"></i>Dell PC</span>
    <span><i style="background:{COL['home']}"></i>Teams home / no change</span>{remote_leg}</div>
    <div class="legend tiny" style="gap:6px 14px">{leg}</div>
    <p class="tiny" style="margin:6px 4px 0">On a phone, swipe the plan sideways to see every screen. Top-down view, north at the top. Drawn from site photos and approximate; we'll verify on site.</p></div>
  <div>''')
        for _, mc, title, sub, _i in MODES:
            st = "".join(f"<li>{s}</li>" for s in steps(opt, mc))
            fe = "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in far_end(opt, mc))
            out.append(f'''<div class="{mc}"><div class="card panel"><h4>What you do · {title}</h4><ol>{st}</ol></div>
    <div class="card panel"><h4>What the room delivers</h4><dl class="fe">{fe}</dl></div>
    <div style="margin-top:14px">{notes(opt, mc)}</div></div>''')
        out.append("</div></div></div>")
    return "".join(out)

def mode_labels():
    return "".join(f'<label class="mode" for="{rid}">{ic}<div><b>{t}</b><span>{s}</span></div></label>' for rid, _, t, s, ic in MODES)

# ---------------- components ----------------
def ico(kind):
    I = {
     "bar": '<svg width="200" height="70" viewBox="0 0 200 70"><rect x="10" y="20" width="180" height="32" rx="14" fill="#e9eef4"/><rect x="18" y="26" width="164" height="20" rx="10" fill="#c9d3de"/><circle cx="100" cy="36" r="9" fill="#0d1b2a"/><circle cx="100" cy="36" r="4" fill="#4DA3FF"/></svg>',
     "puck": '<svg width="120" height="100" viewBox="0 0 120 100"><ellipse cx="60" cy="80" rx="44" ry="10" fill="#0d1b2a" opacity=".5"/><rect x="34" y="16" width="52" height="62" rx="24" fill="#e9eef4"/><circle cx="60" cy="38" r="9" fill="#0d1b2a"/><circle cx="60" cy="38" r="4" fill="#4DA3FF"/><rect x="44" y="58" width="32" height="4" rx="2" fill="#c9d3de"/></svg>',
     "tap": '<svg width="150" height="100" viewBox="0 0 150 100"><path d="M20 80 L40 20 H130 L110 80Z" fill="#2b3647"/><path d="M28 74 L45 26 H122 L105 74Z" fill="#0b0f14"/><rect x="58" y="38" width="22" height="14" rx="3" fill="#C8A84B"/><rect x="84" y="38" width="22" height="14" rx="3" fill="#4DA3FF"/><rect x="52" y="56" width="22" height="10" rx="3" fill="#3a4a5c"/><rect x="78" y="56" width="22" height="10" rx="3" fill="#3a4a5c"/></svg>',
     "sched": '<svg width="120" height="100" viewBox="0 0 120 100"><rect x="22" y="14" width="76" height="62" rx="6" fill="#e9eef4"/><rect x="28" y="20" width="64" height="44" rx="3" fill="#0b0f14"/><rect x="34" y="28" width="30" height="5" rx="2" fill="#5FD08A"/><rect x="34" y="38" width="46" height="3" rx="1.5" fill="#6f849a"/><rect x="34" y="45" width="40" height="3" rx="1.5" fill="#6f849a"/><rect x="22" y="78" width="76" height="4" rx="2" fill="#5FD08A"/></svg>',
     "ceilmic": '<svg width="120" height="110" viewBox="0 0 120 110"><rect x="20" y="15" width="80" height="80" rx="6" fill="#e9eef4"/><g fill="#9fb0c4">' + "".join(f'<circle cx="{32+i*8}" cy="{27+j*8}" r="1.6"/>' for i in range(8) for j in range(8)) + '</g></svg>',
     "speaker": '<svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="40" fill="#e9eef4"/><circle cx="55" cy="55" r="32" fill="#d6dee8"/><g fill="#9fb0c4">' + "".join(f'<circle cx="{55+x}" cy="{55+y}" r="1.8"/>' for x in range(-24, 25, 8) for y in range(-24, 25, 8) if x*x+y*y < 620) + '</g></svg>',
     "cam": '<svg width="150" height="90" viewBox="0 0 150 90"><rect x="35" y="25" width="80" height="40" rx="10" fill="#1d232b" stroke="#3a4a5c"/><circle cx="75" cy="45" r="13" fill="#0b0f14" stroke="#4b5f75" stroke-width="3"/><circle cx="75" cy="45" r="5" fill="#4DA3FF"/><text x="75" y="84" text-anchor="middle" font-size="11" fill="#9fb0c4" font-family="Segoe UI,sans-serif">× 3</text></svg>',
     "rack": '<svg width="120" height="120" viewBox="0 0 120 120"><rect x="24" y="10" width="72" height="100" rx="4" fill="#1d232b" stroke="#4b5f75"/>' + "".join(f'<rect x="32" y="{18+i*15}" width="56" height="11" rx="2" fill="{c}"/>' for i, c in enumerate(["#2b3647", "#4DA3FF", "#2b3647", "#5FD08A", "#2b3647", "#C8A84B"])) + '</svg>',
     "switch": '<svg width="170" height="80" viewBox="0 0 170 80"><rect x="15" y="22" width="140" height="36" rx="4" fill="#1d232b" stroke="#4b5f75"/>' + "".join(f'<rect x="{26+i*16}" y="34" width="11" height="10" rx="1.5" fill="#0b0f14" stroke="#4DA3FF"/>' for i in range(8)) + '</svg>',
     "table": '<svg width="180" height="90" viewBox="0 0 180 90"><rect x="20" y="40" width="140" height="22" rx="4" fill="#2b3647"/><rect x="40" y="18" width="20" height="26" rx="3" fill="#e9eef4"/><rect x="70" y="18" width="20" height="26" rx="3" fill="#e9eef4"/><rect x="100" y="22" width="14" height="22" rx="6" fill="#4DA3FF"/><rect x="124" y="22" width="14" height="22" rx="6" fill="#4DA3FF"/><text x="90" y="80" text-anchor="middle" font-size="10" fill="#9fb0c4" font-family="Segoe UI,sans-serif">HDMI · USB-C · AirMedia</text></svg>',
     "panel": '<svg width="150" height="100" viewBox="0 0 150 100"><rect x="20" y="12" width="44" height="76" rx="3" fill="#c9d3de"/><rect x="86" y="12" width="44" height="76" rx="3" fill="#c9d3de"/><path d="M20 30h44M20 50h44M20 70h44M86 30h44M86 50h44M86 70h44" stroke="#aab7c6"/></svg>',
     "mount": '<svg width="160" height="100" viewBox="0 0 160 100"><rect x="20" y="14" width="120" height="70" rx="4" fill="#1d232b" stroke="#4b5f75"/><rect x="28" y="22" width="104" height="54" rx="2" fill="#0b0f14"/><path d="M40 30 L120 30 M40 68 L120 68" stroke="#2b3647" stroke-width="4"/></svg>',
     "remote": '<svg width="110" height="110" viewBox="0 0 110 110"><rect x="40" y="12" width="30" height="74" rx="10" fill="#1d232b" stroke="#4b5f75"/><circle cx="55" cy="28" r="5" fill="#F28C38"/><rect x="47" y="42" width="16" height="4" rx="2" fill="#6f849a"/><rect x="47" y="52" width="16" height="4" rx="2" fill="#6f849a"/><path d="M55 86 v14" stroke="#9fb0c4" stroke-width="2" stroke-dasharray="3 2"/></svg>',
    }
    return I[kind]

COMP = {
 "good": [("bar", 0, "East wall", "Logitech Rally Bar", "The room's main camera, speakers and microphones in one bar. It runs Microsoft Teams Rooms on Android, the same Logitech family as the FT Miami boardroom."),
          ("puck", 0, "Table center", "Logitech Sight", "A 360° tabletop camera with seven microphones. It frames people across the table and its pickup reaches both table ends."),
          ("tap", 0, "On the table", "Logitech Tap IP", "One-touch join, mute, volume and camera control for Teams."),
          ("sched", 0, "Outside the door", "Logitech Tap Scheduler", "Shows whether the room is free and books it against the Teams/Exchange room calendar."),
          ("table", 0, "At the table", "Wired + wireless sharing", "Two HDMI cables, one USB-C (video) and Crestron AirMedia with two wireless pucks, all auto-switched under the table."),
          ("switch", 0, "Under table + ceiling box", "Video distribution", "HDBaseT links and a 1×4 splitter put the bar's two Teams outputs on all four displays."),
          ("remote", 0, "Each display", "Remote tethers (4)", "Retractable tethers keep each display's own remote with its display for power and input."),
          ("panel", 1, "Walls", "Acoustic panels (6)", "2″-thick, 2×4 ft fabric-wrapped panels that cut echo in the hard block-and-concrete room.")],
 "better": [("bar", 0, "East wall", "Neat Bar Pro", "Camera, speakers and microphone array in one bar, running Microsoft Teams Rooms on Android."),
            ("puck", 0, "Table center", "Neat Center", "A tabletop camera and microphone that covers the people along the table and gives the far end close-up views."),
            ("tap", 0, "On the table", "Neat Pad", "The Teams touch controller for joining, muting and sharing. It comes in black only."),
            ("sched", 0, "Outside the door", "Logitech Tap Scheduler", "A standalone Teams room panel that shows availability and handles booking."),
            ("table", 0, "At the table", "Wired + wireless sharing", "Two HDMI cables, one USB-C (video) and Crestron AirMedia with two wireless pucks, all auto-switched under the table."),
            ("switch", 0, "Under table + ceiling box", "Video distribution", "HDBaseT links and a 1×4 splitter put the bar's two Teams outputs on all four displays."),
            ("remote", 0, "Each display", "Remote tethers (4)", "Retractable tethers keep each display's own remote with its display for power and input."),
            ("panel", 1, "Walls", "Acoustic panels (6)", "2″-thick, 2×4 ft fabric-wrapped panels that cut echo in the hard block-and-concrete room.")],
 "best": [("tap", 0, "Table + credenza", "Logitech Tap + Teams Rooms PC", "Teams Rooms on Windows. The Tap runs both the meeting and the room's Room Controls."),
          ("cam", 0, "North, south + east walls", "Huddly Crew", "Three cameras with an AI director that picks the best angle of whoever is talking."),
          ("ceilmic", 0, "Ceiling, over the table", "Shure MXA925 ceiling array", "A ceiling microphone rated for a 30 × 30 ft seating area. It frees up the table and covers every seat."),
          ("rack", 0, "Credenza under East 65", "Q-SYS Core 8 Flex", "Audio processing, echo cancellation and room control. It's the brain behind the room modes."),
          ("speaker", 0, "Ceiling", "QSC ceiling speakers (4)", "Driven by a QSC amplifier so remote voices are spread evenly around the table."),
          ("switch", 0, "Credenza", "AVPro Edge 8×8 matrix", "Sends any source to any screen, so each display is routed on its own for every mode."),
          ("table", 0, "At the table", "Wired + wireless sharing", "Two HDMI cables, one USB-C (video) and Crestron AirMedia. The room sees native video and the call gets a 1080p copy."),
          ("panel", 1, "Walls", "Acoustic panels (6)", "2″-thick, 2×4 ft fabric-wrapped panels that cut echo in the hard block-and-concrete room.")],
}

def comp_block():
    out = []
    for opt, oc in OPT.items():
        cards = "".join(f'<div class="card comp"><div class="img{" light" if light else ""}">{ico(k)}</div><div class="body"><div class="where">{w}</div><h4>{n}</h4><p>{d}</p></div></div>'
                        for k, light, w, n, d in COMP[opt])
        out.append(f'<div class="{oc}"><div class="grid g4">{cards}</div></div>')
    return "".join(out)

# ---------------- compare ----------------
ROWS = [
 ("grp", "Platform & control"),
 ("Teams Rooms platform", "Android (appliance)", "Android (appliance)", "Windows (Lenovo ThinkSmart Core)"),
 ("Meeting controller", "Logitech Tap IP", "Neat Pad (black)", "Logitech Tap (graphite)"),
 ("Display power & inputs", '<span class="lim">Each display\'s TV remote (tethered)</span>', '<span class="lim">Each display\'s TV remote (tethered)</span>', '<span class="yes">Automatic, from the Tap (Q-SYS)</span>'),
 ("Room modes", "Teams layouts only", "Teams layouts only", '<span class="yes">Meeting · Present · Touch PC · Room Off</span>'),
 ("grp", "Audio"),
 ("Microphones", "Rally Bar + Logitech Sight", "Bar Pro + Neat Center", '<span class="yes">Shure ceiling array + Q-SYS processing</span>'),
 ("Speakers", "Built into the Rally Bar", "Built into the Bar Pro", '<span class="yes">4 ceiling speakers + amplifier</span>'),
 ("Device on the table", "Sight (camera + mics) and Tap IP", "Neat Center and Neat Pad", "Tap only"),
 ("grp", "Video & cameras"),
 ("Cameras", "Rally Bar (east wall) + Sight 360°", "Bar Pro (east wall) + Neat Center", '<span class="yes">Huddly Crew: 3 cameras, AI-directed</span>'),
 ("Four displays", "Copies of two Teams outputs", "Copies of two Teams outputs", '<span class="yes">Each routed independently (8×8 matrix)</span>'),
 ("Laptop, no call", "North-R only", "North-R only", '<span class="yes">All four screens, native resolution</span>'),
 ("Laptop in a call", "North-R + the far end", "North-R + the far end", "North-R + South native; far end at 1080p"),
 ("Dell on the 75″ touch screens", "TV remote, input select", "TV remote, input select", '<span class="yes">One tap: Touch PC mode</span>'),
 ("grp", "Included in every option"),
 ("Table sharing", "2 HDMI · USB-C · AirMedia (2 pucks)", "2 HDMI · USB-C · AirMedia (2 pucks)", "2 HDMI · USB-C · AirMedia (2 pucks)"),
 ("Room scheduling", "Tap Scheduler outside the door", "Tap Scheduler outside the door", "Tap Scheduler outside the door"),
 ("Acoustic treatment", "6 fabric-wrapped panels", "6 fabric-wrapped panels", "6 fabric-wrapped panels"),
 ("Displays", "All 4 reused; new mounts for the 75s", "All 4 reused; new mounts for the 75s", "All 4 reused; new mounts for the 75s"),
 ("grp", "Installation"),
 ("Where the gear lives", "Under the table + ceiling box", "Under the table + ceiling box", "Credenza under East 65 + under the table"),
 ("New cables in the floor conduit", "2", "1", "2"),
 ("Wall cabling", "White surface raceway", "White surface raceway", "White surface raceway"),
]

def cmp_table():
    h = ('<div class="tblwrap"><table class="cmp"><thead><tr><th></th>'
         '<th class="cg">Good<small>Logitech</small></th><th class="cb">Better<small>Neat</small></th><th class="cx">Best<small>Q-SYS + Shure + Huddly</small></th></tr></thead><tbody>')
    for r in ROWS:
        if r[0] == "grp":
            h += f'<tr class="grp"><td colspan="4">{r[1]}</td></tr>'
        else:
            h += f'<tr><th>{r[0]}</th><td class="cg">{r[1]}</td><td class="cb">{r[2]}</td><td class="cx">{r[3]}</td></tr>'
    return h + "</tbody></table></div>"

# ---------------- page ----------------
def page():
    good_flow, better_flow, best_flow = flow_gb("good"), flow_gb("better"), flow_best()
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FTAI Miami Conference Room · Mason Technologies</title>
<meta name="description" content="How the upgraded FTAI Aviation Miami Airport conference room works: Good, Better and Best options. Quote #068999.">
<style>{CSS}</style></head>
<body>
<input type="checkbox" id="nav-t" class="sr" aria-label="Toggle menu">
<input type="radio" name="opt" id="o-good" class="sr" checked aria-label="Good option">
<input type="radio" name="opt" id="o-better" class="sr" aria-label="Better option">
<input type="radio" name="opt" id="o-best" class="sr" aria-label="Best option">
<input type="radio" name="mode" id="m-call" class="sr" aria-label="Teams meeting">
<input type="radio" name="mode" id="m-share" class="sr" checked aria-label="Meeting plus sharing">
<input type="radio" name="mode" id="m-local" class="sr" aria-label="In-room presentation">
<input type="radio" name="mode" id="m-touch" class="sr" aria-label="Interactive touch PC">
<div class="page">

<nav class="site-nav"><div class="wrap">
  <div class="nav-logos"><img class="mason" src="mason-logo-white.png" alt="Mason Technologies"><span class="vr"></span><img class="cust" src="ftai-logo-white.svg" alt="FTAI Aviation"></div>
  <label class="burger" for="nav-t" aria-label="Menu"><span></span><span></span><span></span></label>
  <div class="nav-links"><a href="#hero">Overview</a><a href="#options">Options</a><a href="#how">How it works</a><a href="#control">Control</a><a href="#flow">Signal flow</a><a href="#compare">Compare</a><a href="#why">Contact</a></div>
</div></nav>

<div class="optbar"><div class="wrap"><span class="lab">Viewing option</span><div class="pills">
  <label class="pill" for="o-good">Good<small>Logitech</small></label>
  <label class="pill" for="o-better">Better<small>Neat</small></label>
  <label class="pill" for="o-best">Best<small>Q-SYS + Shure + Huddly</small></label></div>
  <span class="tiny" style="margin-left:auto">Pick an option. The whole page follows it.</span></div></div>

<header class="hero" id="hero"><div class="wrap">
  <div class="lockup"><img src="mason-logo-white.png" alt="Mason Technologies"><span class="x">×</span><img src="ftai-logo-white.svg" alt="FTAI Aviation"></div>
  <p class="eyebrow">Main conference room · Miami Airport</p>
  <h1>A conference room where <span>every seat is heard</span> and every screen works together.</h1>
  <p class="lede">Three ways to upgrade FTAI Aviation's main conference room. This page skips the parts list and shows how each option works: what people do in each kind of meeting, what each of the four screens shows, how the signals move, and what controls the room.</p>
  <div class="howto"><span>1. Pick Good, Better or Best</span><span>2. Choose what you're doing in the room</span><span>3. See the screens, the steps and the signal path</span></div>
  <div class="meta">
    <div class="card"><div class="k">Prepared for</div><div class="v">CDW</div><div class="s">Erick Villalobos</div></div>
    <div class="card"><div class="k">End user</div><div class="v">FTAI Aviation</div><div class="s">Miami Airport · main conference room</div></div>
    <div class="card"><div class="k">The room</div><div class="v">About 30 × 15 ft</div><div class="s">15 ft table · 4 existing displays</div></div>
    <div class="card"><div class="k">Proposal</div><div class="v">Quote #068999</div><div class="s">Version 1 · valid through November 13, 2026</div></div>
  </div>
</div></header>

<section id="room"><div class="wrap">
  <p class="eyebrow">The room today</p><h2>The challenge: a hard room and four screens that don't work together</h2><div class="divider"></div>
  <div class="grid g2" style="align-items:start">
    <div class="grid" style="gap:16px">
      <div class="issue"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2"/></svg></div><div><h4>Remote attendees can't hear the room</h4><p>Painted block walls, a sealed concrete floor and few soft surfaces cause heavy reverberation. Clear voice pickup at every seat of the 15 ft table is the number one requirement, and it's how every option will be tested.</p></div></div>
      <div class="issue"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><rect x="2" y="4" width="9" height="7" rx="1"/><rect x="13" y="4" width="9" height="7" rx="1"/><rect x="2" y="13" width="9" height="7" rx="1"/><rect x="13" y="13" width="9" height="7" rx="1"/></svg></div><div><h4>Four displays, no single system</h4><p>Two 75″ touch displays on the north wall, plus 65″ displays on the east and south walls. All four stay. The goal is for every seat to see the people and the content.</p></div></div>
      <div class="issue"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><path d="M4 18h16M6 18V9h12v9M9 9V6h6v3"/></svg></div><div><h4>A cluttered table and exposed cabling</h4><p>Today there's a USB speaker puck, a keyboard and loose cables. Every option hides the equipment, keeps the table clean and runs new cable in white surface raceway without chipping the block walls.</p></div></div>
      <div class="issue"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><path d="M12 3v18M5 12h14"/><circle cx="12" cy="12" r="9"/></svg></div><div><h4>Simple enough for guests to use unassisted</h4><p>Few button presses and one obvious place to start. A Tap Scheduler outside the door shows when the room is free.</p></div></div>
    </div>
    <div><div class="planbox">{plan_existing()}</div><p class="tiny" style="margin-top:8px">Existing conditions, drawn from site photos (north at the top). The floor conduit from the south wall to the table has room for only one or two more cables, which shapes every design.</p></div>
  </div>
</div></section>

<section id="options"><div class="wrap">
  <p class="eyebrow">Three options</p><h2>Good, Better, Best</h2><div class="divider"></div>
  <p class="lede">All three reuse the four displays, add wired and wireless sharing at the table, a room scheduler and acoustic panels, and hide the equipment. They differ in <b>how the room hears</b>, <b>how it sees</b>, and <b>how you control it</b>.</p>
  <div class="grid g3">
    <label class="card optcard" for="o-good"><span class="tier">Good</span><h3>Logitech</h3><span class="badge">Teams Rooms on Android</span>
      <ul><li>Rally Bar on the east wall, plus Sight at the center of the table</li><li>Same Logitech family as the FT Miami boardroom</li><li>Screens follow Teams' two-screen layout</li><li>Simple for local IT to support</li></ul>
      <div class="ctl"><b>Control:</b> Tap IP runs the meeting. <span class="lim">TV remotes run display power and inputs.</span></div><span class="sel">● Selected</span></label>
    <label class="card optcard" for="o-better"><span class="tier">Better</span><h3>Neat</h3><span class="badge">Teams Rooms on Android</span>
      <ul><li>Neat Bar Pro on the east wall, plus Neat Center on the table</li><li>Center adds close-up views and mid-table pickup</li><li>Screens follow Teams' two-screen layout</li><li>Only one new cable through the floor conduit</li></ul>
      <div class="ctl"><b>Control:</b> Neat Pad runs the meeting. <span class="lim">TV remotes run display power and inputs.</span></div><span class="sel">● Selected</span></label>
    <label class="card optcard" for="o-best"><span class="tier">Best</span><h3>Q-SYS + Shure + Huddly</h3><span class="badge gold">Teams Rooms on Windows · full control system</span>
      <ul><li>Shure ceiling microphone, Q-SYS processing and ceiling speakers</li><li>Three Huddly cameras with AI-directed switching</li><li>8×8 matrix: every screen routed independently</li><li>Native-resolution local content on all four screens</li></ul>
      <div class="ctl"><b>Control:</b> <span class="yes">One Tap runs everything: meeting, room modes, display power and volume.</span></div><span class="sel">● Selected</span></label>
  </div>
</div></section>

<section id="how"><div class="wrap">
  <p class="eyebrow">How it works</p><h2>Walk through a meeting</h2><div class="divider"></div>
  <p class="lede">Pick what you're doing in the room. The plan shows what each of the four screens displays for the option you've selected, with the steps a user takes and what remote attendees get.</p>
  <div class="steps-head"><span class="n">1</span>Option</div>
  <div class="pills" style="margin-bottom:22px"><label class="pill" for="o-good">Good<small>Logitech</small></label><label class="pill" for="o-better">Better<small>Neat</small></label><label class="pill" for="o-best">Best<small>Q-SYS + Shure + Huddly</small></label></div>
  <div class="steps-head"><span class="n">2</span>What are you doing?</div>
  <div class="modes">{mode_labels()}</div>
  <div class="steps-head"><span class="n">3</span>Here's the room</div>
  {sim_block()}
</div></section>

<section id="control"><div class="wrap">
  <p class="eyebrow">Control</p><h2>Remotes or a control system</h2><div class="divider"></div>
  <div class="ogb"><div class="big-callout"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v.5"/></svg>
    <div><b>Good and Better use the displays' own remote controls.</b> The table controller runs the Teams meeting, but it can't turn the displays on or off or change their inputs. Each of the four displays keeps its own infrared remote, held on a retractable tether behind the display. There's no central AV control system in these options.</div></div></div>
  <div class="ox"><div class="big-callout"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
    <div><b>Best is a true control system.</b> Q-SYS runs the room and its controls sit right on the Logitech Tap. One touch switches between meeting, presentation and touch-PC modes, powers the displays and sets the volume. Nobody needs a remote.</div></div></div>
  <div class="ctlgrid">
    <div class="card">
      <div class="og"><h3>Good: Tap IP + 4 TV remotes</h3></div><div class="ob"><h3>Better: Neat Pad + 4 TV remotes</h3></div>
      <div class="ox"><h3>Best: one Tap with Room Controls</h3><p class="muted small" style="margin-top:0">Try it: these buttons change the room plan in "How it works" above.</p></div>
      <div class="ogb">
        <table class="who"><tr><th>Task</th><th>Where you do it</th></tr>
          <tr><td>Join, leave, mute, volume, camera</td><td>Table controller (Teams)</td></tr>
          <tr><td>Share a laptop</td><td>Plug in or press the AirMedia puck. It switches automatically.</td></tr>
          <tr><td>Turn displays on and off</td><td><span class="lim">Each display's TV remote</span></td></tr>
          <tr><td>Show the Dell on a 75″ and use touch</td><td><span class="lim">TV remote, Input, then PC</span></td></tr>
          <tr><td>Back to Teams after using the Dell</td><td><span class="lim">TV remote, Input, then Teams</span></td></tr>
          <tr><td>Book the room</td><td>Tap Scheduler outside the door</td></tr></table>
        <div class="remotes">
          <div class="remote">{ico("remote").replace('width="110" height="110"','width="44" height="44"')}North-L 75″</div>
          <div class="remote">{ico("remote").replace('width="110" height="110"','width="44" height="44"')}North-R 75″</div>
          <div class="remote">{ico("remote").replace('width="110" height="110"','width="44" height="44"')}East 65″</div>
          <div class="remote">{ico("remote").replace('width="110" height="110"','width="44" height="44"')}South 65″</div></div>
        <p class="tiny" style="margin-top:10px">Each display's existing remote stays on a retractable tether mounted behind that display.</p>
      </div>
      <div class="ox">
        <div class="tapmock"><div class="bar"><span>FTAI Main Conference</span><span>Room Controls</span></div>
          <div class="t">Room mode</div>
          <div class="tapgrid">
            <label class="tapbtn" for="m-call">Meeting<em>Teams layout on all screens</em></label>
            <label class="tapbtn" for="m-share">Meeting + Share<em>content follows the laptop</em></label>
            <label class="tapbtn" for="m-local">Present<em>laptop on every screen</em></label>
            <label class="tapbtn" for="m-touch">Touch PC<em>Dell on both 75″ screens</em></label>
          </div>
          <div class="vol">Room volume <span class="track"></span> 62%</div>
          <div class="tdisp"><div><b>N-L</b>on</div><div><b>N-R</b>on</div><div><b>East</b>on</div><div><b>South</b>on</div></div>
          <div class="vol" style="justify-content:space-between"><span>Mic: live</span><span style="color:#ffb27a">Room Off ⏻</span></div>
        </div>
        <p class="tiny" style="margin-top:10px">Illustration only. We'll set the final button layout and mode names with FTAI during programming.</p>
      </div>
    </div>
    <div class="card">
      <h3>What this means day to day</h3>
      <div class="ogb"><ul class="ticks">
        <li><b>Meetings are one touch.</b> Joining, muting and sharing all happen on the table controller, just like other Teams rooms.</li>
        <li><b>Screens follow Teams.</b> The four displays copy the bar's two outputs, so the layout is whatever Teams shows. You can't send a different source to one screen.</li>
        <li><b>The Dell needs a remote.</b> To use the touch PC on a 75″, switch that display's input with its remote, then switch it back afterwards.</li>
        <li><b>Power is per display.</b> If a display is off or on the wrong input, its remote fixes it.</li>
        <li><b>Easy to support.</b> Teams Rooms on Android appliances are simple for local IT, and IP power conditioners let us reboot equipment remotely.</li></ul></div>
      <div class="ox"><ul class="ticks">
        <li><b>One place to start.</b> Joining a meeting wakes the room, turns on the displays and sets the layout.</li>
        <li><b>Toggle modes in one touch.</b> Switch between Meeting, Present and Touch PC without touching a display.</li>
        <li><b>Content follows the laptop.</b> Plug in and the content screens switch automatically.</li>
        <li><b>Room volume, not bar volume.</b> Q-SYS balances the ceiling mic and ceiling speakers for the whole room.</li>
        <li><b>A clean shutdown.</b> Room Off powers the displays down so they aren't left on.</li></ul></div>
    </div>
  </div>
</div></section>

<section id="hear"><div class="wrap">
  <p class="eyebrow">Hearing &amp; seeing</p><h2>How the room hears and sees you</h2><div class="divider"></div>
  <p class="lede">In a reverberant room, a single bar on one wall can't reach the far end of a 15 ft table. Each option fixes that differently.</p>
  <div class="grid g2" style="align-items:start">
    <div class="planbox"><div class="og">{coverage_svg("good")}</div><div class="ob">{coverage_svg("better")}</div><div class="ox">{coverage_svg("best")}</div>
      <div class="legend"><span><i style="background:#5FD08A"></i>Microphone pickup</span><span><i style="background:#F28C38"></i>Camera views</span></div></div>
    <div>
      <div class="og"><h3>A second set of ears in the middle of the table</h3><p class="muted">The Rally Bar covers the east end. <b>Logitech Sight</b> sits at the center of the table with seven beamforming microphones and a 7.5 ft pickup radius, which reaches both table ends. Its two 4K lenses give remote attendees close-up framing of people along the table, and Teams switches between the bar and Sight automatically.</p>
        <div class="note blue">Sight adds a device to the middle of the table. It's what makes the Good option hear and frame the whole table well. If the west-end seats test weak at commissioning, Logitech mic pods can be added.</div></div>
      <div class="ob"><h3>Neat Center covers the table</h3><p class="muted">The <b>Neat Bar Pro</b> on the east wall gives the room view. <b>Neat Center</b> at mid-table picks up voices around the table and gives remote attendees close-up views across it, which makes up for the bar sitting at one end.</p>
        <div class="note blue">There are no ceiling microphones in Better. Pickup depends on the bar and Center, and acoustic panels help them in this hard room.</div></div>
      <div class="ox"><h3>Microphone in the ceiling, cameras on three walls</h3><p class="muted">One <b>Shure MXA925</b> ceiling array is rated for a 30 × 30 ft seating area, which is more than this room. <b>Q-SYS</b> handles echo cancellation and mixing, and <b>four ceiling speakers</b> spread remote voices evenly. <b>Huddly Crew</b> uses three cameras on the north, south and east walls, and its AI director cuts to the best angle of whoever is talking.</p>
        <div class="note gold">The table stays clear: no mic pods or tabletop cameras. Just the Tap and the connection cables.</div></div>
      <div class="card" style="margin-top:16px"><h4>Acoustic panels (all options)</h4><p class="muted small" style="margin:0">Six 2×4 ft, 2″-thick fabric-wrapped panels reduce reflections from the block walls and concrete floor so the microphones get cleaner speech. They treat the room, not soundproof it. We don't use white-noise machines because they compete with the microphones.</p></div>
    </div>
  </div>
  <p class="tiny" style="margin-top:10px">Coverage shapes are illustrative. We'll confirm final microphone and camera positions with pickup tests at every seat during commissioning.</p>
</div></section>

<section id="flow"><div class="wrap">
  <p class="eyebrow">Signal flow</p><h2>Where every signal goes</h2><div class="divider"></div>
  <div class="legend" style="margin:0 0 14px"><span><i style="background:#4DA3FF"></i>Laptop / presentation video</span><span><i style="background:#F28C38"></i>Teams video &amp; cameras</span><span><i style="background:#B48CFF"></i>Dell PC</span><span><i style="background:#5FD08A"></i>Audio</span><span><i style="background:#C8A84B"></i>Control</span><span>Dashed = wireless or control</span></div>
  <div class="og"><div class="flow">{good_flow}</div>
    <div class="walk"><div><span><b>Table sources go into one auto-switcher.</b><p>Two HDMI cables, USB-C and AirMedia go into an auto-switcher under the table, which picks the newest source. One HDBaseT cable carries it through the floor conduit and up the east wall into the Rally Bar's HDMI input.</p></span></div>
      <div><span><b>The Rally Bar is the Teams room.</b><p>It's the camera, speakers and microphones, connected to Microsoft Teams. Sight joins it over its own shielded cable from the table center, and the Tap IP controls the meeting over the network.</p></span></div>
      <div><span><b>Two outputs feed four screens.</b><p>Output 1 (people) goes to a 1×4 splitter in a ceiling box, which feeds North-L, East and South. Output 2 (content) goes to North-R.</p></span></div>
      <div><span><b>The Dell is a separate path.</b><p>The in-room Dell connects straight to a second input on each 75″, with a touch USB cable to each. You select it with the TV remote.</p></span></div></div></div>
  <div class="ob"><div class="flow">{better_flow}</div>
    <div class="walk"><div><span><b>Table sources go into one auto-switcher.</b><p>Two HDMI cables, USB-C and AirMedia go into an auto-switcher under the table. One HDBaseT cable, the only new cable in the floor conduit, carries the signal to the Neat Bar Pro's HDMI input.</p></span></div>
      <div><span><b>The Neat Bar Pro is the Teams room.</b><p>Camera, speakers and mics running Teams Rooms on Android. Neat Center and Neat Pad connect through a small network switch under the table that uses the existing table network connection.</p></span></div>
      <div><span><b>Two outputs feed four screens.</b><p>Output 1 (people) goes through a 1×4 splitter to North-L, East and South. Output 2 (content) goes to North-R. The Bar Pro's third output isn't used because Teams doesn't support a third screen.</p></span></div>
      <div><span><b>The Dell is a separate path.</b><p>Its two HDMI outputs and touch USB cables go straight to the 75″ displays. You select it with the TV remote.</p></span></div></div></div>
  <div class="ox"><div class="flow">{best_flow}</div>
    <div class="walk"><div><span><b>Every table source is split two ways.</b><p>The auto-switcher sends one native 4K copy to the matrix for the room's screens and a 1080p copy into the Tap for remote attendees. Local content never goes through Teams compression.</p></span></div>
      <div><span><b>The matrix routes any source to any screen.</b><p>It takes five inputs: two Teams outputs, the table, and the Dell's two outputs. Q-SYS sets every screen's source for each room mode.</p></span></div>
      <div><span><b>Q-SYS runs the audio.</b><p>The Shure ceiling array connects over Dante to the Q-SYS Core, which removes echo and mixes the room. The Core connects to the Teams PC over USB and drives the amplifier and four ceiling speakers.</p></span></div>
      <div><span><b>Huddly Crew handles the cameras.</b><p>Three cameras run on their own dedicated switch and connect to the Teams PC over USB. Crew picks and switches the shot automatically.</p></span></div>
      <div><span><b>Control comes from the Tap.</b><p>Room Controls on the Tap tell Q-SYS which mode to run. Q-SYS sets the matrix routes and powers the displays on and off over IR.</p></span></div></div></div>
</div></section>

<section id="components"><div class="wrap">
  <p class="eyebrow">What's in the room</p><h2>Key components</h2><div class="divider"></div>
  <p class="lede">The main pieces of the selected option and where each one goes. Cabling, mounts, network and power equipment are also included.</p>
  {comp_block()}
  <p class="tiny" style="margin-top:12px">Representative illustrations, not product photos.</p>
</div></section>

<section id="compare"><div class="wrap">
  <p class="eyebrow">Side by side</p><h2>Compare the options</h2><div class="divider"></div>
  {cmp_table()}
  <div class="grid g3" style="margin-top:22px">
    <div class="card"><h4>Choose Good if…</h4><p class="muted small" style="margin:0">You want to match the Logitech boardroom, keep IT support simple, and you're comfortable with displays run from their own remotes.</p></div>
    <div class="card"><h4>Choose Better if…</h4><p class="muted small" style="margin:0">You prefer the Neat experience and want close-up views from a center-table device, with the least work in the floor conduit.</p></div>
    <div class="card"><h4>Choose Best if…</h4><p class="muted small" style="margin:0">Audio quality is non-negotiable, you want every screen working independently, and you want one touch to run the whole room with no remotes.</p></div>
  </div>
</div></section>

<section id="details"><div class="wrap">
  <p class="eyebrow">Good to know</p><h2>Details worth knowing before you choose</h2><div class="divider"></div>
  <div class="grid g2">
    <div class="card"><h3>System notes</h3><ul class="ticks">
      <li class="ogb"><b>Teams Rooms on Android.</b> Good and Better are Android appliances, and Neat only makes Android Teams Rooms devices. Please confirm FTAI IT doesn't require Windows.</li>
      <li class="ox"><b>Teams Rooms on Windows.</b> Best runs on a Lenovo ThinkSmart Core with the Logitech Tap.</li>
      <li><b>USB-C at the table is video only.</b> It doesn't charge laptops or connect USB devices. Laptops need USB-C video output (DisplayPort Alt Mode), and so do the AirMedia pucks.</li>
      <li><b>The Dell stays in the room.</b> Its content reaches remote attendees only when it's shared from Teams on the Dell itself.</li>
      <li class="ogb"><b>Touch</b> works when the Dell's input is active and fills the screen.</li>
      <li class="ox"><b>Touch</b> is wired to the Dell. Switch to Touch PC mode before touching, because touches on another source still reach the Dell.</li>
      <li class="ox"><b>Huddly cameras are black</b> and the Tap is graphite. The ceiling microphone and speakers are white.</li>
      <li class="ob"><b>Neat Pad is black only.</b></li></ul></div>
    <div class="card"><h3>What FTAI provides</h3><ul class="ticks">
      <li>The four existing displays, their remotes and the Dell PC (owner-furnished)</li>
      <li>Microsoft Teams Rooms Pro licensing, the room resource account and admin access</li>
      <li>Network drops and PoE at each equipment location, including outside the door</li>
      <li class="ogb">A licensed electrician to connect the ceiling box's power outlet</li>
      <li class="ox">Floor space and power for the credenza under the East 65</li>
      <li>Display make, model, weight and VESA details for the new 75″ mounts</li>
      <li>Approval of final equipment, raceway and acoustic panel locations</li></ul></div>
  </div>
  <div class="card" style="margin-top:18px"><h3>How we deliver it</h3>
    <div class="grid g4" style="margin-top:10px">
      <div><h4 style="color:var(--gold2)">1 · Confirm</h4><p class="muted small" style="margin:0">Site walk to verify dimensions, display details, ceiling access, network drops and the conduit.</p></div>
      <div><h4 style="color:var(--gold2)">2 · Build</h4><p class="muted small" style="margin:0">Mount equipment out of sight, run white raceway and install the acoustic panels, keeping clear of the electrical panel.</p></div>
      <div><h4 style="color:var(--gold2)">3 · Commission</h4><p class="muted small" style="margin:0">Test calls, voice pickup at every seat, every sharing path, the Dell and touch, and the scheduler.</p></div>
      <div><h4 style="color:var(--gold2)">4 · Hand over</h4><p class="muted small" style="margin:0">Walk FTAI's IT team through the room and document the final configuration.</p></div>
    </div></div>
</div></section>

<section id="support"><div class="wrap">
  <p class="eyebrow">Mason Command</p><h2>Support after go-live</h2><div class="divider"></div>
  <p class="lede">FTAI's local IT handles first-line support. Mason handles specialist AV support and monitoring through an optional annual <b>Mason Command Silver</b> plan for the room.</p>
  <div class="grid g4">
    <div class="card stat"><div class="n">4 hr</div><div class="l">Remote help desk response, Monday–Friday, 9 a.m.–5 p.m. ET</div></div>
    <div class="card stat"><div class="n">Unlimited</div><div class="l">Remote troubleshooting, diagnostics and configuration help</div></div>
    <div class="card stat"><div class="n">3–4 days</div><div class="l">On-site dispatch after remote triage and your approval</div></div>
    <div class="card stat"><div class="n">Proactive</div><div class="l">Automated health checks and system alerts from our monitoring platform</div></div>
  </div>
  <p class="tiny" style="margin-top:12px">Mason coordinates manufacturer warranty repairs and replacements. Equipment carries a one-year warranty and installation labor 90 days, per the proposal terms. Preventive maintenance visits aren't included in Silver.</p>
</div></section>

<section id="why"><div class="wrap">
  <p class="eyebrow">Why Mason</p><h2>An integrator that stays with the room</h2><div class="divider"></div>
  <div class="grid g4">
    <div class="card stat"><div class="n">2002</div><div class="l">Founded. More than two decades in low-voltage and AV integration</div></div>
    <div class="card stat"><div class="n">150+</div><div class="l">W-2 CWA technicians behind every deployment</div></div>
    <div class="card stat"><div class="n">40,000</div><div class="l">sq ft logistics warehouse, ready to mobilize quickly</div></div>
    <div class="card stat"><div class="n">WBE</div><div class="l">NYC and nationally certified women-owned business, with a dedicated Southeast team covering Florida</div></div>
  </div>
  <h3 style="margin-top:40px">Trusted by Technology Leaders</h3>
  <div class="logo-grid"><div class="logo-tile"><img src="tech-logos/google.svg" alt="Google"></div><div class="logo-tile"><img src="tech-logos/intel.svg" alt="Intel"></div><div class="logo-tile"><img src="tech-logos/l3harris.svg" alt="L3Harris"></div><div class="logo-tile"><img src="tech-logos/meta.svg" alt="Meta"></div><div class="logo-tile"><img src="tech-logos/salesforce.svg" alt="Salesforce"></div><div class="logo-tile"><img src="tech-logos/akamai.svg" alt="Akamai"></div><div class="logo-tile"><img src="tech-logos/blackbaud.svg" alt="Blackbaud"></div>
  </div>
  <div class="grid g3" style="margin-top:44px">
    <div class="card contact"><span class="r">Mason Technologies</span><span class="nm">Edward Puerta</span><a href="mailto:epuerta@mason247.com">epuerta@mason247.com</a><a href="tel:+13054326620">305-432-6620</a></div>
    <div class="card contact"><span class="r">CDW</span><span class="nm">Erick Villalobos</span><a href="mailto:erick.villalobos@cdw.com">erick.villalobos@cdw.com</a><span class="muted small">Pricing and procurement</span></div>
    <div class="card contact"><span class="r">24/7 support line</span><span class="nm">877-947-3786</span><a href="https://mason247.com">mason247.com</a></div>
  </div>
</div></section>

<footer><div class="wrap foot">
  <div class="logos"><img src="mason-logo-white.png" alt="Mason Technologies"><img src="ftai-logo-white.svg" alt="FTAI Aviation"></div>
  <div class="tiny">CDW – FTAI Miami Airport Conference Room Upgrades · Quote #068999 v1 · Valid through November 13, 2026<br>Pricing is provided separately by CDW. Final details are confirmed on site and in the approved scope of work.</div>
</div></footer>
</div>
</body></html>'''

if __name__ == "__main__":
    html = page()
    with open(OUT, "w") as f:
        f.write(html)
    print("wrote", OUT, len(html))
