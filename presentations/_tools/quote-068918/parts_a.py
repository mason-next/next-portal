from parts import RULES, esc, icon, pane_next
import data

TOT = data.section_totals()
SVC = data.d(data.WIRE_SUBTOTAL) + data.d(data.LABOR) + data.d(data.MISC)


def hero_svg():
    s = ['<svg viewBox="0 0 480 236" role="img" aria-label="Illustration of the auditorium: line arrays and a center loudspeaker over the stage, the main screen, two side displays, subwoofers and front fills at the stage lip, and PTZ cameras">',
         '<defs><radialGradient id="hglow" cx="50%" cy="35%" r="60%"><stop offset="0" stop-color="#c8a84b" stop-opacity=".18"/><stop offset="1" stop-color="#c8a84b" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="hscr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123456"/><stop offset=".6" stop-color="#1f5f8f"/><stop offset="1" stop-color="#c8a84b"/></linearGradient>'
         '<linearGradient id="hcur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a1520"/><stop offset=".5" stop-color="#6b1f2c"/><stop offset="1" stop-color="#4a1520"/></linearGradient></defs>',
         '<rect width="480" height="236" fill="url(#hglow)"/>',
         # proscenium
         '<path d="M96 176 V40 Q240 6 384 40 V176" fill="#0b1520" stroke="#2f4a66" stroke-width="2"/>',
         '<rect x="98" y="44" width="22" height="132" fill="url(#hcur)"/><rect x="360" y="44" width="22" height="132" fill="url(#hcur)"/>',
         '<path d="M98 44 Q240 14 382 44 L382 54 Q240 26 98 54 Z" fill="#6b1f2c"/>',
         # main screen
         '<rect x="146" y="50" width="188" height="106" fill="url(#hscr)" stroke="#c9d1da" stroke-width="1"/>',
         '<text x="240" y="98" text-anchor="middle" fill="#fff" font-size="14" font-weight="800" font-family="Segoe UI, sans-serif" letter-spacing="1">WOLFSON</text>',
         '<text x="240" y="114" text-anchor="middle" fill="#e2c46e" font-size="9" font-family="Segoe UI, sans-serif" letter-spacing="2">BUILDING 1 AUDITORIUM</text>',
         # stage
         '<rect x="70" y="176" width="340" height="14" fill="#3a2a17"/><rect x="70" y="176" width="340" height="2" fill="#5a4223"/>',
         '<rect x="76" y="190" width="328" height="10" fill="#14100a"/>',
        ]
    # subwoofers + front fills at the lip
    for x in (150, 200, 262, 312):
        s.append(f'<rect x="{x}" y="191" width="20" height="8" rx="1" fill="#1b1e22" stroke="#8a939d" stroke-width=".8"/>')
    for x in (118, 178, 232, 286, 340, 392):
        s.append(f'<rect x="{x-3}" y="182" width="7" height="6" rx="1" fill="#0b1520" stroke="#cfd6de" stroke-width=".8"/>')
    # arrays
    for cx, sgn in ((80, 1), (400, -1)):
        s.append(f'<line x1="{cx}" y1="8" x2="{cx}" y2="22" stroke="#8a939d" stroke-width="1.4"/>')
        for i, rot in enumerate((0, 2, 5, 9)):
            s.append(f'<rect x="{cx-12}" y="{22+i*9}" width="24" height="8" rx="1.5" fill="#0b1520" stroke="#cfd6de" stroke-width="1" transform="rotate({rot*sgn} {cx} {22+i*9})"/>')
        s.append(f'<g fill="none" stroke="#c8a84b" stroke-linecap="round"><path d="M{cx+16*sgn} 40 q{18*sgn} 16 0 32" stroke-width="2"/><path d="M{cx+24*sgn} 34 q{28*sgn} 22 0 46" stroke-width="1.5" opacity=".55"/></g>')
    # center cluster
    s.append('<line x1="240" y1="2" x2="240" y2="12" stroke="#8a939d" stroke-width="1.4"/><path d="M230 12 h20 l-3 16 h-14 z" fill="#0b1520" stroke="#cfd6de"/>')
    # side displays
    for x in (8, 412):
        s.append(f'<rect x="{x}" y="88" width="60" height="36" rx="2" fill="#0b0d10" stroke="#3a414a"/><rect x="{x+2}" y="90" width="56" height="32" fill="url(#hscr)"/>')
    s.append('<text x="38" y="136" text-anchor="middle" fill="#a8b8cc" font-size="8.5" font-family="Segoe UI, sans-serif">110″ display</text><text x="442" y="136" text-anchor="middle" fill="#a8b8cc" font-size="8.5" font-family="Segoe UI, sans-serif">110″ display</text>')
    # choir mics
    for x in (200, 240, 280):
        s.append(f'<line x1="{x}" y1="30" x2="{x}" y2="42" stroke="#9aa4ae" stroke-width=".8"/><rect x="{x-6}" y="42" width="12" height="3" rx="1.5" fill="#cfd6de" transform="rotate(-20 {x} 43)"/>')
    # cameras
    for x, y in ((30, 160), (450, 160), (240, 224)):
        s.append(f'<circle cx="{x}" cy="{y}" r="6" fill="#f2f5f8" stroke="#8a939d"/><circle cx="{x}" cy="{y}" r="2.6" fill="#123456"/><rect x="{x-6}" y="{y+6}" width="12" height="5" rx="1.5" fill="#f2f5f8"/>')
    # audience heads
    for i in range(22):
        x = 14 + i * 21.5
        if 222 < x < 258:
            continue
        s.append(f'<circle cx="{x}" cy="222" r="6" fill="#05080c"/><path d="M{x-9} 236 q9 -11 18 0 z" fill="#05080c"/>')
    s.append('</svg>')
    return "\n".join(s)


def hero():
    return f"""<!-- 2. HERO -->
<header id="hero">
  <div class="container">
    <div class="hero-grid">
      <div>
        <div class="hero-cobranding">
          <img src="mason-logo-white.png" alt="Mason Technologies" class="hero-mason-logo">
          <span class="hero-x">×</span>
          <img src="mdc-logo-white.svg" alt="Miami Dade College" class="hero-customer-logo">
        </div>
        <div class="quote-badge">Quote #068918 · Version 1</div>
        <div class="hero-eyebrow">Proposal &amp; Scope of Work — MDC Wolfson Campus</div>
        <h1 class="hero-title">Building 1 Auditorium<br><span>AV Upgrade</span></h1>
        <p class="hero-subtitle">A full audiovisual modernization for theater, concerts, lectures and live production: a YME line-array PA built for music, a Yamaha DM7 console, six Sony 4K PTZ cameras, Blackmagic 4K switching on a 12G-SDI backbone, recording, streaming and Zoom, and Q-SYS control simple enough for one technician to run.</p>
        <div class="hero-meta">
          <div class="meta-card"><div class="meta-label">Customer</div><div class="meta-value">Miami Dade College</div></div>
          <div class="meta-card"><div class="meta-label">Location</div><div class="meta-value">Wolfson Campus · Building 1, Miami, FL</div></div>
          <div class="meta-card"><div class="meta-label">Prepared</div><div class="meta-value">October 13, 2026</div></div>
          <div class="meta-card"><div class="meta-label">Contact</div><div class="meta-value">Michael Martinez</div></div>
        </div>
        <div class="hero-cta">
          <label class="btn btn-gold" for="t-control">{icon("switcher")}Run the control room</label>
          <label class="btn btn-ghost" for="t-system">See how it connects{icon("arrow")}</label>
        </div>
      </div>

      <div class="hero-visual">
        <div class="hero-scene">
{hero_svg()}
          <div class="hero-scene-caption"><span>Auditorium elevation · illustrative</span><span>L · C · R + subs</span></div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="num">33</div><div class="lbl">Loudspeakers</div></div>
          <div class="hero-stat"><div class="num">6</div><div class="lbl">4K PTZ cameras</div></div>
          <div class="hero-stat"><div class="num">12</div><div class="lbl">Wireless mic channels</div></div>
          <div class="hero-stat"><div class="num">2</div><div class="lbl">M/E 4K switching</div></div>
        </div>
        <label class="hero-invest" for="t-invest">
          <div><div class="lbl">Total investment</div><div class="amt">${data.TOTAL}</div><div class="sub">Auditorium AV upgrade + three-year Silver SLA</div></div>
          <span class="go">View pricing{icon("arrow")}</span>
        </label>
      </div>
    </div>
  </div>
</header>"""


FEATURES = [
 ("array", "A PA built for music", "Left and right arrays of four YME iA211X, a center CL 114-30 for speech, and four dual 18 in subwoofers at the stage, with front fills, rear delays and booth monitors so every seat is covered."),
 ("speaker", "Performers hear themselves", "Permanent side fills on both sides of the stage, two passive wedges at the downstage edge and two self-powered wedges midstage, all fed from the console."),
 ("console", "A real production console", "A Yamaha DM7 Compact with the DM7 Control fader extension and a Rio3224-D3 Dante stage box: 72 channels for theater, concerts, jazz and chorus."),
 ("mic", "Twelve wireless channels", "MDC's Shure SLX-D+ system, with all 12 channels reaching both the console and Q-SYS over Dante. Twelve DPA CORE+ headsets, four lavaliers, and three suspended choir microphones."),
 ("camera", "Six Sony 4K PTZ cameras", "Five fixed SRG-A40 cameras with AI tracking, plus a portable sixth camera on a tripod with connection points at stage left and stage right, and a Sony RM-IP500 joystick controller."),
 ("switcher", "Two workflows, all in 4K", "A Blackmagic ATEM 2 M/E Constellation 4K and a Videohub 40×40 12G router: M/E 1 for cameras, recording, streaming and Zoom; M/E 2 for presentations, each with its own panel."),
 ("screen", "Bigger images", "A new 220 in Draper tab-tensioned screen for the existing 15,000-lumen projector, and two 110 in BlueSquareX 4K displays in place of the side projection."),
 ("rec", "Record, stream and Zoom at once", "A HyperDeck Studio 4K Pro, a Blackmagic Streaming Encoder 4K and a Zoom Room, each on its own router output, with the house mix embedded in the program feed."),
 ("touch", "One person can run it", "Q-SYS presets on a 10 in touch panel and Stream Deck macros through Bitfocus Companion. Routine events run without the console; room tuning stays locked."),
]


def overview():
    feats = "".join(f'<div class="feature"><div class="ic">{icon(i)}</div><h3>{esc(t)}</h3><p>{esc(p)}</p></div>' for i, t, p in FEATURES)
    areas = [
        ("#c8a84b", "Audio System", "Sound, console &amp; mics", "PA, stage monitors, amplification, DPA and choir microphones, the Yamaha console and stage box, and assistive listening.", "8 × iA211X · 4 × iA 218B · 10 × PDA · DM7 · Rio3224-D3", TOT["Audio System"]),
        ("#2eaadc", "Video System", "Displays, cameras &amp; switching", "Side displays, the new main screen, six PTZ cameras with extension kits, the router, switcher, converters, recorder, streaming and Zoom.", "2 × 110″ · 220″ screen · 6 × SRG-A40 · ATEM 2 M/E · Videohub", TOT["Video System"]),
        ("#9b8cd9", "Headend", "Control, network &amp; racks", "Q-SYS Cores and interfaces, the touch panel, AV network and fiber, the video switching desk, the new amplifier rack, power and UPS.", "2 × Core 24f · 4 × QIO-AES8x8 · 3 × M4250 · 3 × UPS", TOT["Headend"]),
        ("#27ae60", "Services", "Install, wire &amp; direct costs", "Installation and engineering labor, bulk cable and connectors, and miscellaneous hardware, shipping and direct costs.", "Labor $120,518.87 · wire $9,251.80 · misc. $17,111.77", SVC),
    ]
    area_html = "".join(f'<div class="area-card" style="--c:{c}"><div class="num">{n}</div><h3>{t}</h3><p>{p}</p><div class="eq">{eq}</div><div class="amt">{data.money(a)}</div></div>' for c, n, t, p, eq, a in areas)
    modes = [
        ("1", "Lecture &amp; presentation", "One technician · Q-SYS", "users",
         ["Touch panel recalls the Lecture preset", "Handheld wireless mics through Q-SYS, no console needed", "Laptop or house PC on M/E 2 to the main screen and both side displays", "Assistive listening on automatically"]),
        ("2", "Theater, concert &amp; chorus", "Engineer on the DM7", "console",
         ["DM7 mixes headsets, choir mics and the stage box", "Side fills and wedges carry the performer mixes", "Cameras on M/E 1 to the recorder", "Scenic backdrop on the 220 in screen"]),
        ("3", "Hybrid &amp; streamed events", "Production crew · ATEM", "stream",
         ["Cameras on M/E 1, slides on M/E 2", "Record, stream and Zoom at the same time, each from its own router output", "House mix embedded into the program feed", "Remote Zoom guests on the room's screens"]),
    ]
    mode_html = "".join(f'<div class="mode-card"><div class="n">{n}</div><h3>{t}</h3><div class="who">{icon(ic)}{who}</div><ul>{"".join(f"<li>{esc(x)}</li>" for x in li)}</ul></div>' for n, t, who, ic, li in modes)
    return f"""
<div class="pane" id="p-overview" role="tabpanel" aria-label="Overview">
<section>
  <div class="container">
    <div class="section-eyebrow">01 · Solution Summary</div>
    <h2 class="section-title">A production-grade auditorium that one person can run</h2>
    <p class="section-lead">Mason Technologies will furnish, install, integrate, program, tune, commission and train on a complete AV modernization of the Building 1 Auditorium, for theater, concerts, jazz, chorus, lectures, VIP events, video production, live streaming and Zoom. The existing high-output projector and the stage XLR lines that pass testing are reused.</p>
    <div class="feature-grid">{feats}</div>
    <div class="config-strip">
      <div><b>33</b><span>YME loudspeakers: arrays, center, subs, fills, delays, monitors</span></div>
      <div><b>10</b><span>YME PDA amplifiers · 40 channels, fed digitally over AES3</span></div>
      <div><b>12</b><span>wireless channels on Dante to the console and Q-SYS</span></div>
      <div><b>6</b><span>Sony SRG-A40 4K PTZ cameras, five fixed and one portable</span></div>
      <div><b>40×40</b><span>12G-SDI router · 4K30 end to end</span></div>
      <div><b>9</b><span>stage connection locations with new Cat cabling</span></div>
    </div>

    <div class="sub-title">What the quote covers</div>
    <div class="area-grid four">{area_html}</div>
    <p class="note">Equipment is grouped as on the quote: Audio System, Video System and Headend. The Mason Command Silver SLA adds ${data.SLA} for a project total of <strong>${data.TOTAL}</strong>.</p>

    <div class="sub-title">One room, every kind of event</div>
    <div class="mode-grid">{mode_html}</div>
    <p class="note">Q-SYS presets cover lecture, theater, concert and live production, streaming and recording, Zoom, and startup and shutdown. Normal controls stay separate from the protected engineering and tuning settings.</p>
    {pane_next("Next: how every signal travels, and where everything goes", "t-system", "See how it connects")}
  </div>
</section>
</div>"""
