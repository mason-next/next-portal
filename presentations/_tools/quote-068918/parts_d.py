from parts import RULES, esc, icon, radios, subtabs, pane_next, GOLD_SEL
import data

FILTERS = [("f-all", "All equipment", None), ("f-audio", "Sound &amp; console", "audio"), ("f-mics", "Mics &amp; listening", "mics"),
           ("f-video", "Displays &amp; cameras", "video"), ("f-switch", "Switching &amp; production", "switch"),
           ("f-head", "Control, network &amp; power", "head"), ("f-wire", "Cable", "wire")]
for fid, _, area in FILTERS:
    RULES.append(f'#{fid}:checked ~ .filter-bar label[for="{fid}"] {{ {GOLD_SEL} }}')
    RULES.append(f'#{fid}:focus-visible ~ .filter-bar label[for="{fid}"] {{ outline: 2px solid var(--gold-light); outline-offset: 2px; }}')
    if area:
        RULES.append(f'#{fid}:checked ~ .product-grid .product:not([data-area="{area}"]) {{ display: none; }}')
        if area != "audio":
            RULES.append(f'#{fid}:checked ~ .feature-product {{ display: none; }}')

AREA_COL = {"audio": "#c8a84b", "mics": "#3fd17a", "video": "#2eaadc", "switch": "#9b8cd9", "head": "#e08a3a", "wire": "#7d8fa5"}
AREA_TAG = {"audio": "Sound", "mics": "Mics", "video": "Video", "switch": "Production", "head": "Headend", "wire": "Cable"}

# img, bg, qty, area, mfr, name, model, desc, role
PRODUCTS = [
 ("yme-ia218b", "light", "4", "audio", "YME", "iA 218B Dual 18 in Subwoofer", "iA 218B", "Passive, 2,000 W AES, 4 Ω, 30–120 Hz, 142 dB peak, cardioid capable.", "At or under the stage lip, one amplifier channel each"),
 ("yme-cl114", "light", "5", "audio", "YME", "CL 114 Constant Curvature Loudspeakers", "CL 114-30 × 3 · CL 114-15 × 2", "Two-way bi-amp 14 in, 50 Hz–20 kHz; 100° × 30° and 100° × 15° coverage.", "Center channel (1) and side fills (4)"),
 ("yme-cs7p", "dark", "10", "audio", "YME", "CS 7P Coaxial Loudspeaker", "CS 7P · 6 black, 4 white", "Two-way 7 in passive coaxial, 200 W AES, 8 Ω, 110° conical.", "Six front fills on the stage lip, four delays over the side seating"),
 ("yme-cs5p", "light", "2", "audio", "YME", "CS 5P Coaxial Loudspeaker", "CS 5P, black", "Two-way 5 in passive coaxial, 100 W AES, 16 Ω, 110° conical.", "Control room house-sound reference"),
 ("yme-mc12", "light", "4", "audio", "YME", "MC 12 Stage Monitor Wedges", "MC 12X × 2 · MC 12A × 2", "12 in wedges: passive MC 12X driven bi-amped from a PDA 2.0, self-powered MC 12A fed from the stage box.", "Two downstage, two midstage"),
 ("yme-pda", "light", "10", "audio", "YME", "PDA Four-Channel Amplifiers", "PDA 2.0 × 9 · PDA 3.0 × 1", "Switching amplifiers with onboard DSP, AES/EBU inputs and dual Ethernet; 2,300 W and 2,800 W × 4 at 4 Ω.", "Amplifier rack by the stage, fed over AES3 from Q-SYS"),
 ("yme-rigging", "light", "4", "audio", "YME", "Array &amp; CL Rigging Kits", "Line array kit × 2 · CL kit × 2", "Three-point load-bearing array frames with 0°–10° splay in 1° steps, and CL Series flying hardware.", "Flying the two arrays, the center and side fills"),
 ("yamaha-dm7", "light", "1", "audio", "Yamaha", "DM7 Compact Digital Console", "DM7 Compact", "72 input channels, touchscreen, Dante networking and advanced processing.", "Production mixing for theater, concerts, jazz and chorus"),
 ("yamaha-dm7-control", "light", "1", "audio", "Yamaha", "DM7 Control Expansion", "DM7 Control", "Dedicated expansion surface with more faders and user-assignable controls.", "Beside the console: more faders under hand"),
 ("yamaha-rio3224", "light", "1", "audio", "Yamaha", "Rio3224-D3 Dante Stage Box", "Rio3224-D3", "32 inputs, 24 outputs, remote-controlled preamps, redundant network.", "Stage inputs and monitor outputs, in rack 3"),
 ("core-24f", "light", "2", "audio", "Q-SYS", "Core 24f Processor", "Core 24f + 64 × 64 Dante license × 2", "24 local I/O, 160 × 160 network channels, USB AV bridging, dual Ethernet.", "Main and backup: processing, presets and room control"),
 ("qio", "light", "6", "audio", "Q-SYS", "QIO Network Interfaces", "QIO-AES8x8 × 4 · QIO-IR1x4 · rack tray", "AES3 digital audio in and out over the network, plus IR control expansion.", "Three feed the amplifiers; one exchanges audio with the AJA"),
 ("tsc-101", "light", "1", "audio", "Q-SYS", "TSC-101-G3 Touch Screen", "TSC-101-G3 + table-top stand", "10.1 in PoE touch controller for room presets and everyday control.", "On the control room desk"),
 ("headset", "dark", "12", "mics", "DPA", "CORE+ Headset Microphone", "CORE+ supercardioid · TA4F", "Dual-ear fit, IP58 against sweat and moisture, optimized for Shure wireless.", "One for every wireless channel"),
 ("dpa-lav", "light", "4", "mics", "DPA", "CORE+ Lavalier Microphone", "CORE+ cardioid · TA4F", "Rugged IP58 design, optimized for speech, for the Shure bodypacks.", "Speeches, ceremonies and narration"),
 ("at-bp4073", "light", "3", "mics", "Audio-Technica", "BP4073 Shotgun Microphone", "BP4073 + Mason ceiling rigging kit × 3", "Condenser shotgun, 20 Hz–20 kHz, hung on black aircraft cable with a shock mount and tilt adapter.", "Suspended over the choir, aimed to reject the PA"),
 ("slxd4q", "light", "OFE", "mics", "Shure · furnished by MDC", "SLX-D+ Wireless System", "SLXD4QDAN+ × 3 · 12 handhelds · 12 bodypacks", "Twelve channels with Dante receivers, rechargeable batteries and chargers. Mason racks, connects and integrates it.", "All 12 channels to the console and Q-SYS"),
 ("listen-als", "light", "1", "mics", "Listen Technologies", "iDSP Assistive Listening", "iDSP Prime Level III + 12 receivers", "72 MHz RF with a Dante input, intelligent receivers, two ear phone / neck loop lanyards and a 4-unit charging tray.", "House mix to patrons who are hard of hearing"),
 ("bsx-110", "light", "2", "video", "BlueSquareX", "Vivid 110 in 4K Display", "Vivid 110″ + offset mount + SurgeX", "3840 × 2160, 400 nit, RS-232; custom offset mount clears the drape, with an IP-controlled SurgeX conditioner each.", "Replacing the side projection, left and right"),
 ("draper-acumen", "dark", "1", "video", "Draper", "Acumen XL V Motorized Screen", "220″ 16:9 · Matt White XT1000VB", "Tab-tensioned, 110 V, with the ceiling installation kit; raise and lower from Q-SYS.", "Main projection and scenic backdrop, existing projector reused"),
 ("sony-srg-a40", "dark", "6", "video", "Sony", "SRG-A40 4K PTZ Camera", "SRG-A40, white", "4K, 20× optical zoom, built-in AI framing and tracking.", "Five fixed positions plus one portable"),
 ("sct-remotecam", "light", "6", "video", "Sound Control Technologies", "RemoteCam5+ Extension Kit", "RemoteCam5+", "Uncompressed 4K HDMI, Ethernet control and 66 W PoE++ over one cable, up to 100 m.", "One per camera: no outlet needed at the camera"),
 ("tripod", "light", "6", "video", "Proaim · Manfrotto", "Camera Mounts &amp; Tripod", "PTZ-10 isolator × 5 · aluminum tripod × 1", "Vibration-isolating mounts for the fixed cameras and a tripod for the portable camera.", "Fixed cameras, and the stage left / right portable points"),
 ("sony-rm-ip500", "light", "1", "video", "Sony", "RM-IP500 PTZ Controller", "RM-IP500", "Joystick, presets, tally, focus, iris and paint control over IP.", "Camera operator position"),
 ("dell-touch", "light", "1", "video", "Dell", "23.8 in Multi-Touch Monitor", "23.8″ touch", "Touch interface for camera setup and AI tracking.", "Camera operator position"),
 ("atem-constellation", "light", "1", "switch", "Blackmagic Design", "ATEM 2 M/E Constellation 4K", "ATEM 2 M/E Constellation 4K", "20 × 12G-SDI inputs, 12 outputs, multiview and Fairlight audio in 1 RU.", "M/E 1 production, M/E 2 presentation"),
 ("atem-panel", "light", "2", "switch", "Blackmagic Design", "ATEM 1 M/E Advanced Panels", "ATEM 1 M/E Advanced Panel × 2", "Broadcast-style program and preview buses, T-bar, keyers, transitions and macros.", "One panel for each M/E"),
 ("videohub", "light", "1", "switch", "Blackmagic Design", "Videohub 40×40 12G Router", "Videohub 40×40 12G", "Zero-latency 12G-SDI routing, 4K60, reclocking, Ethernet and USB-C control.", "Every source and destination in the room"),
 ("decimator", "light", "24", "switch", "Decimator", "12G-CROSS Converter", "12G-CROSS", "HDMI ⇄ SDI cross conversion with scaling and frame-rate conversion.", "At every HDMI source and display, two kept as spares"),
 ("avpro-hdbt", "light", "7", "switch", "AVPro Edge", "HDBaseT Extender Kits", "ICT 18G · 100 m 4K", "4K HDMI over Cat cable between the stage, the displays and the control room.", "3 stage laptop points, stage confidence, projector, 2 side displays"),
 ("aja-12g-am", "light", "1", "switch", "AJA", "12G-AM Audio Embedder", "12G-AM", "8-channel AES embed and de-embed on 12G-SDI, UHD 4K, simultaneous.", "Puts the house mix into the M/E 1 program"),
 ("hyperdeck", "light", "1", "switch", "Blackmagic Design", "HyperDeck Studio 4K Pro", "HyperDeck Studio 4K Pro + 2 × 1 TB SSD", "12G-SDI broadcast deck recording UHD 4K to qualified Samsung SSDs.", "Recording from its own router output"),
 ("streaming-encoder", "light", "1", "switch", "Blackmagic Design", "Streaming Encoder 4K", "Streaming Encoder 4K", "Streams a router feed to MDC's streaming service without a computer.", "Live streaming from its own router output"),
 ("zoom-room", "light", "1", "switch", "Logitech · Lenovo", "Zoom Room Appliance", "Tap + ThinkSmart Core Gen 2", "Zoom Rooms appliance with a touch controller; USB audio to Q-SYS.", "Zoom meetings and remote guests"),
 ("aja-utap", "light", "1", "switch", "AJA", "U-TAP SDI Capture", "U-TAP SDI", "USB 3.0 capture of 3G-SDI up to 1080p60, bus-powered.", "Program camera into the Zoom Room"),
 ("samsung-43", "light", "1", "switch", "Samsung · Chief", "43 in Multiview Display", "43″ 4K commercial + tilt mount", "350 nit commercial 4K display on a micro-adjust tilt wall mount.", "ATEM multiview at the video switching desk"),
 ("lilliput-215", "light", "2", "switch", "Lilliput", "21.5 in Production Monitors", "21.5″ · 1000 nit · 3G-SDI", "HDR production monitors with SDI and 4K HDMI inputs, Rec.709.", "Reference monitors for color matching"),
 ("stream-deck-xl", "light", "1", "switch", "Elgato", "Stream Deck XL", "Stream Deck XL · 32 keys", "Runs Bitfocus Companion for one-button macros across the system.", "Video switching desk"),
 ("service-pc", "light", "1", "switch", "Mason Technologies", "Service PC &amp; Monitor Mount", "Custom service PC + stacking desk mount", "Dedicated computer for Q-SYS Designer, Dante Controller and device software.", "Setup, monitoring and remote support"),
 ("m4250", "light", "3", "head", "NETGEAR", "M4250 AV Line Switches", "M4250-40G8XF-PoE++ × 2 · M4250-26G4XF-PoE+", "Managed AV switches with built-in Q-LAN and Dante profiles, PoE, and 10G fiber ports.", "Two in rack 1, one in rack 3"),
 ("fiber-trunk", "light", "500 ft", "head", "Mason Technologies · NETGEAR", "OM4 Armored Fiber + SFP+", "6-strand OM4 · 8 × 10GBASE-SR", "Plenum-rated armored indoor/outdoor fiber with 10G multimode optics.", "Control room to the amplifier rack"),
 ("rack-44", "light", "1", "head", "Middle Atlantic", "44-Space AV Rack", "44 space, 31 in deep + caster base", "Configured AV rack with vent and blank panels and cable management.", "Rack 3: amplifiers, stage box, QIO, switch"),
 ("wattbox", "light", "4", "head", "WattBox", "IP Power Conditioners", "800 Series × 3 · vertical IP strip × 1", "Individually controlled outlets for remote reboot and metering.", "One per rack, plus a vertical strip"),
 ("ups", "light", "3", "head", "Xtreme Power", "3000 VA Lithium-Ion UPS", "3000 VA online UPS bundle", "Online UPS with 4-post rails, SNMP management and maintenance bypass.", "One per rack, for the electronics"),
 ("reel-cat6a", "light", "6,000 ft", "wire", "Liberty", "Category Cable", "Cat6 UTP 2,000 ft · Cat6 F/UTP 4,000 ft", "Plenum-rated category cable for network, HDBaseT, cameras and stage locations.", "Stage, cameras, displays and racks"),
 ("reel-audio", "light", "4,500 ft", "wire", "Liberty · Belden", "Control &amp; AES Cable", "22/4 OASH 4,000 ft · AES 110 Ω 500 ft", "Plenum control cable and shielded AES/EBU digital audio cable.", "Screen and device control, QIO to amplifiers"),
 ("reel-sdi", "light", "1,000 ft", "wire", "Belden · Amphenol", "12G-SDI Coax + BNC", "12 GHz mini RG-59 · 120 BNC", "Precision 4K video coax with 12G-SDI crimp BNC connectors.", "Control-room video routing"),
]


def equipment():
    ins = radios("eqf", [f for f, *_ in FILTERS], "f-all", {f: l for f, l, _ in FILTERS})
    bar = "".join(f'<label class="chip" for="{f}">{l}</label>' for f, l, _ in FILTERS)
    cards = []
    for img, bg, q, area, mfr, name, model, desc, role in PRODUCTS:
        cards.append(f'<div class="product" data-area="{area}"><div class="p-img {bg}"><span class="area-pill" style="--c:{AREA_COL[area]}">{AREA_TAG[area]}</span>'
                     f'<img src="assets/{img}.svg" alt="{name} (illustration)" loading="lazy"><span class="qty-pill">{q}</span></div>'
                     f'<div class="p-body"><div class="mfr">{mfr}</div><h3>{name}</h3><div class="model">{model}</div><p>{desc}</p>'
                     f'<div class="role">{icon("pin")}{role}</div></div></div>')
    return f"""
<div class="pane" id="p-equipment" role="tabpanel" aria-label="Equipment">
<section>
  <div class="container">
    <div class="section-eyebrow">04 · Bill of Materials</div>
    <h2 class="section-title">Every component on the quote</h2>
    <p class="section-lead">The equipment on quote #068918, grouped by what it does. Quantities match the quote; full line items with pricing are under Investment.</p>
    {ins}
    <div class="filter-bar">{bar}</div>
    <div class="feature-product">
      <div class="fp-img"><img src="assets/yme-ia211x.svg" alt="YME iA211X four-box line array (illustration)"></div>
      <div class="fp-body">
        <div class="mfr">YME · Sound · Featured</div>
        <h3>iA211X Line Array <span class="qty-pill" style="vertical-align:4px">8</span></h3>
        <p>Two arrays of four elements, flown left and right of the proscenium and sized for concerts, jazz, chorus and theater as well as speech. Each array is wired as an upper and a lower pair, so the front and rear seating can be tuned separately. Final trim height, splay and aiming are set from the final room geometry during commissioning.</p>
        <dl class="specs">
          <div><dt>Design</dt><dd>Three-way, quad-amp</dd></div>
          <div><dt>Woofers</dt><dd>Dual 11 in</dd></div>
          <div><dt>Mid-high</dt><dd>Coaxial neodymium</dd></div>
          <div><dt>Dispersion</dt><dd>90° × 10°</dd></div>
          <div><dt>Response</dt><dd>50 Hz–20 kHz</dd></div>
          <div><dt>Output</dt><dd>141 dB peak</dd></div>
          <div><dt>Rigging</dt><dd>3-point, 0°–10° splay</dd></div>
          <div><dt>Amplification</dt><dd>2 boxes per PDA 2.0</dd></div>
        </dl>
      </div>
    </div>
    <div class="product-grid">{"".join(cards)}</div>
    <p class="img-note">Product images are representative illustrations, not manufacturer photographs. The existing 15,000-lumen projector, racks 1 and 2, the audio patch bays and the stage XLR lines are MDC's and are reused where they pass inspection and testing.</p>
    {pane_next("Next: what Mason delivers, what others provide, and support", "t-scope", "Scope &amp; support")}
  </div>
</section>
</div>"""


SCOPE_CARDS = [
 ("#7d8fa5", "Removal &amp; reuse", ["Remove obsolete DSP, amplification, switching, conversion, VGA-era interfaces and abandoned AV cable", "Retire the side projection systems for the new displays", "Retain the existing 15,000-lumen-class projector and the designated audio patch bays, re-terminated into the new system", "Test every stage XLR circuit for continuity, grounding and noise; keep only those that pass", "Turn removed equipment designated for reuse over to MDC"]),
 ("#c8a84b", "Sound reinforcement", ["Furnish and install the YME arrays, center, subwoofers, front and delay fills, booth, side fills and monitors with rigging", "Install the PDA amplifiers in the new amplifier rack by the stage", "AES3 from Q-SYS to every amplifier, plus network monitoring", "Load YME presets; tune EQ, delay, gain and alignment in Q-SYS, protected from end-user changes"]),
 ("#3fd17a", "Console, mics &amp; listening", ["Yamaha DM7 Compact, DM7 Control and Rio3224-D3 on Dante", "Rack, connect and integrate MDC's Shure SLX-D+ receivers; all 12 channels to Q-SYS and the console", "DPA headsets and lavaliers configured for the Shure bodypacks", "Three BP4073 choir mics on custom black suspension, aimed to reject the PA", "Listen 72 MHz assistive listening with a Dante feed and signage"]),
 ("#2eaadc", "Projection &amp; displays", ["Install the new Draper 220 in motorized tab-tensioned screen with Q-SYS raise and lower", "Signal path to the existing projector; test, clean and verify alignment", "Two 110 in BlueSquareX displays on custom offset mounts clear of the drape", "4K extension, device control and surge protection at each display"]),
 ("#9b8cd9", "Cameras", ["Five fixed Sony SRG-A40 cameras on vibration-isolation mounts, plus one portable on a tripod", "RemoteCam5+ kits for video, power and control on one cable", "Portable camera connections at stage left and stage right", "RM-IP500 controller and touch monitor; presets, matching and AI tracking set up"]),
 ("#e08a3a", "Switching, recording, streaming &amp; Zoom", ["Videohub 40×40 12G, ATEM 2 M/E Constellation 4K and two control panels", "Decimator conversion and AVPro Edge HDBaseT extension at the edges", "AJA 12G-AM house-mix embedding on the program feed", "HyperDeck recording, streaming encoder and Zoom Room, each on its own routed path"]),
 ("#27ae60", "Stage, control &amp; network", ["New Cat cabling at nine stage locations: four downstage, two side stage, three upstage", "Dual Q-SYS Core 24f with Dante licensing, QIO interfaces and the touch panel", "Presets for lecture, theater, concert, streaming and recording, Zoom, startup and shutdown", "Configure the AV switches with separate Q-LAN, Dante and control VLANs, and the OM4 fiber link"]),
 ("#5d7a99", "Racks, operators &amp; turnover", ["Rebuild the headend clean, labeled and dressed; new amplifier rack by the stage", "WattBox power management and UPS units", "Operator positions: multiview, reference monitors, camera control, ATEM panels, Stream Deck macros", "Test every path, then train MDC staff and hand over documentation and programming backups"]),
]
RESP = [
 ("General contractor", "Final architectural drawings and dimensions, the construction schedule and access dates, seating removal or protection, stage openings for the subwoofers, patch and paint"),
 ("Electrical contractor", "120 VAC circuits and receptacles, dedicated amplifier circuits, screen motor power, power at displays, monitors and racks, conduit, raceway, backboxes, grounding and bonding"),
 ("MDC", "Structural engineering and certified attachment points for the arrays, screen and displays; blocking; rack cooling; confirmed seating capacity; the Shure wireless system; the existing projector, racks, patch bays and XLR lines in usable condition"),
 ("MDC IT", "IP addressing, VLAN assignments, the enterprise uplink, firewall policies and internet access for streaming, Zoom, firmware and remote support"),
 ("MDC", "Zoom Rooms license, streaming accounts, platform subscriptions and credentials"),
 ("Mason Technologies", "All quoted AV equipment, low-voltage cable, installation, removal of obsolete equipment, XLR testing, programming, tuning, commissioning, training and closeout documentation"),
]
EXCL = ["Theatrical and stage lighting upgrades", "Structural engineering, structural steel and certified hang points", "High-voltage electrical work, conduit and raceway",
        "Architectural demolition, drywall, painting, ceiling repair, millwork and stage carpentry", "Instruments, pianos, backline, specialty microphones and in-ear systems not on the quote",
        "Repair of owner-furnished equipment, or replacing the existing projector", "Enterprise network changes, internet and streaming fees, Zoom licensing",
        "Permit fees, bonds and inspection fees", "Concealed conditions, and after-hours, accelerated or phased work not in the labor basis"]


def scope():
    ins, tabs = subtabs("sc", [("sc-deliver", "What Mason delivers", "check"), ("sc-resp", "Responsibilities", "users"), ("sc-support", "Support &amp; warranty", "life")], "sc-deliver", "")
    steps = [("pencil", "Engineering", "Final drawings, array aiming, channel map and cable schedules"), ("building", "Coordination", "Sequencing with the renovation, GC and electrical contractor"),
             ("truck", "Installation", "Removal, rigging, mounting, cable, terminations and rack builds"), ("sliders", "Programming", "Q-SYS, Dante, console, ATEM, router, cameras and macros"),
             ("zones", "Commissioning", "Tuning, delay alignment, camera matching and testing every path"), ("users", "Training", "Operator training, documentation and programming backups")]
    steps_html = "".join(f'<div class="step"><div class="dot">{icon(i)}</div><div><h4>{t}</h4><p>{p}</p></div></div>' for i, t, p in steps)
    cards = "".join(f'<div class="scope-card" style="--c:{c}"><h3>{t}</h3><ul class="checklist">{"".join(f"<li>{x}</li>" for x in li)}</ul></div>' for c, t, li in SCOPE_CARDS)
    resp = "".join(f"<tr><td>{p}</td><td>{t}</td></tr>" for p, t in RESP)
    excl = "".join(f"<li>{x}</li>" for x in EXCL)
    return f"""
<div class="pane" id="p-scope" role="tabpanel" aria-label="Scope and support">
<section>
  <div class="container">
    <div class="section-eyebrow">05 · Scope of Work &amp; Support</div>
    <h2 class="section-title">A turnkey delivery, coordinated with the renovation</h2>
    <p class="section-lead">Mason furnishes, installs, integrates, programs, tests, tunes, commissions and trains on the complete system. Because the auditorium is part of a larger renovation, the work is sequenced with the general contractor and the electrical contractor.</p>
    {ins}
    {tabs}
    <div class="subpanes">
    <div class="subpane sp-sc-deliver">
      <div class="steps">{steps_html}</div>
      <div class="scope-grid">{cards}</div>
      <p class="note">Testing covers every audio input and output, every PA loudspeaker and amplifier channel, monitors, wireless over Dante, the suspended mics, retained XLR circuits, assistive listening, projection, displays, every camera, router paths, ATEM switching, conversion, recording, streaming, Zoom, stage connections, Q-SYS presets, the network and rack power.</p>
    </div>
    <div class="subpane sp-sc-resp">
      <div class="table-card resp-table"><table><thead><tr><th>Party</th><th>Provides</th></tr></thead><tbody>{resp}</tbody></table></div>
      <div class="grid-2" style="margin-top:22px">
        <div class="card"><h3>Not included unless added</h3><ul class="checklist open">{excl}</ul></div>
        <div class="card"><h3>Installation access &amp; timing</h3><ul class="checklist open">
          <li>The installation sequence follows the auditorium renovation schedule</li>
          <li>If seating stays in place during overhead work, specialized lift access may be needed; if the renovation removes it first, conventional scaffolding or lifts can be used</li>
          <li>Work areas, pathways, power and structural attachment points are assumed complete before AV installation starts</li>
          <li>Existing equipment found defective or incompatible during commissioning is documented and handled by change order</li>
          <li>If the AHJ requires a separate low-voltage permit, Mason will advise and provide it by approved change order</li>
        </ul></div>
      </div>
    </div>
    <div class="subpane sp-sc-support">
      <h3 style="font-size:20px;margin-bottom:6px">Mason Command · Silver SLA</h3>
      <p class="note" style="margin:0 0 20px;max-width:760px">Responsive, proactive support starting at system acceptance. Included on this quote as MTI-SLA-SILVER, quantity 3 (per-year term): ${data.SLA}.</p>
      <div class="support-grid">
        <div class="support-card"><div class="ic">{icon("headset")}</div><h3>Remote help desk</h3><p>Monday–Friday, 9:00 a.m.–5:00 p.m. EST. Response within 4 business hours. Unlimited remote support.</p></div>
        <div class="support-card"><div class="ic">{icon("truck")}</div><h3>Onsite dispatch</h3><p>Coordinated within 3–4 business days of remote triage and client approval, at $200–$240 per hour (4-hour minimum), net 30.</p></div>
        <div class="support-card"><div class="ic">{icon("monitor")}</div><h3>Proactive monitoring</h3><p>Automated health checks and alerts to reduce downtime. Preventative maintenance visits can be scheduled separately.</p></div>
        <div class="support-card"><div class="ic">{icon("box")}</div><h3>Warranty coordination</h3><p>Mason handles warranty repairs and replacements with manufacturers, including logistics and documentation.</p></div>
        <div class="support-card"><div class="ic">{icon("escalate")}</div><h3>Support operations center</h3><p>Tiered escalation to senior engineers, real-time diagnostics and root-cause analysis for recurring issues.</p></div>
        <div class="support-card"><div class="ic">{icon("life")}</div><h3>Direct access</h3><p>Phone, email or client portal at 877-947-3786. Coverage follows the local time zone and excludes Mason-recognized holidays.</p></div>
      </div>
      <div class="warranty">
        <div><h4>Equipment warranty</h4><p>One year from installation, unless the manufacturer specifies otherwise. Flat panel displays carry the manufacturer's warranty; projector lamps are consumables.</p></div>
        <div><h4>Labor warranty</h4><p>Ninety days from installation for workmanship. After that, service runs under the Silver SLA. Re-programming, design changes and extra training may be billed separately.</p></div>
      </div>
    </div>
    </div>
    {pane_next("Next: the investment, line by line", "t-invest", "See the investment")}
  </div>
</section>
</div>"""


def invest():
    tot = data.section_totals()
    T = data.d(data.TOTAL)
    parts = [("#c8a84b", "Audio System equipment", "PA, monitors, amplifiers, microphones, console, assisted listening", tot["Audio System"]),
             ("#2eaadc", "Video System equipment", "Displays, projection, cameras, camera control, switching, recording", tot["Video System"]),
             ("#9b8cd9", "Headend equipment", "Control, network, video switching desk, racks and power", tot["Headend"]),
             ("#7d8fa5", "Bulk wire &amp; interconnects", "Category, control, AES and 12G-SDI cable, BNC connectors", data.d(data.WIRE_SUBTOTAL)),
             ("#27ae60", "Labor · installation &amp; engineering", "", data.d(data.LABOR)),
             ("#5d7a99", "Misc. hardware &amp; direct costs", "Shipping, G&amp;A and similar", data.d(data.MISC)),
             ("#e08a3a", "Silver SLA", "Mason Command support · MTI-SLA-SILVER × 3 (per-year term)", data.d(data.SLA))]
    split = "".join(f'<i style="width:{(a / T * 100):.2f}%;background:{c}"></i>' for c, _, _, a in parts)
    lis = "".join(f'<div class="li"><span class="sw" style="background:{c}"></span><span class="lbl">{l}{f"<small>{s}</small>" if s else ""}</span><span class="amt">{data.money(a)}</span></div>' for c, l, s, a in parts)
    lis += f'<div class="li sub"><span></span><span class="lbl">Total</span><span class="amt">${data.TOTAL}</span></div>'
    details = []
    for sec in ("Audio System", "Video System", "Headend"):
        rows = []
        for s, g, items in data.EQUIPMENT:
            if s != sec:
                continue
            rows.append(f'<tr class="grp"><td colspan="4">{esc(g)}</td></tr>')
            for q, desc, u, e in items:
                rows.append(f'<tr><td class="q">{q:,}</td><td>{esc(desc)}</td><td class="r">${u}</td><td class="r">${e}</td></tr>')
        rows.append(f'<tr class="tot"><td></td><td>{sec} subtotal</td><td></td><td class="r">{data.money(tot[sec])}</td></tr>')
        details.append(f'<details class="lines"><summary>{sec} line items<span>{data.money(tot[sec])}</span></summary><div class="lines-wrap"><table><thead><tr><th>Qty</th><th>Item</th><th class="r">Price</th><th class="r">Ext.</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div></details>')
    wrows = "".join(f'<tr><td class="q">{q:,}</td><td>{esc(desc)}</td><td class="r">${u}</td><td class="r">${e}</td></tr>' for q, desc, u, e in data.WIRE)
    wrows += f'<tr class="tot"><td></td><td>Bulk wire &amp; interconnects subtotal</td><td></td><td class="r">${data.WIRE_SUBTOTAL}</td></tr>'
    wrows += f'<tr><td class="q">1</td><td>Labor: installation &amp; engineering</td><td class="r">${data.LABOR}</td><td class="r">${data.LABOR}</td></tr>'
    wrows += f'<tr><td class="q">1</td><td>Miscellaneous hardware &amp; direct costs (shipping, G&amp;A, etc.)</td><td class="r">${data.MISC}</td><td class="r">${data.MISC}</td></tr>'
    wrows += f'<tr class="tot"><td></td><td>Bldg 1 Auditorium subtotal</td><td></td><td class="r">${data.AUD_SUBTOTAL}</td></tr>'
    details.append(f'<details class="lines"><summary>Wire, labor &amp; direct costs<span>{data.money(data.d(data.WIRE_SUBTOTAL) + data.d(data.LABOR) + data.d(data.MISC))}</span></summary><div class="lines-wrap"><table><thead><tr><th>Qty</th><th>Item</th><th class="r">Price</th><th class="r">Ext.</th></tr></thead><tbody>{wrows}</tbody></table></div></details>')
    return f"""
<div class="pane" id="p-invest" role="tabpanel" aria-label="Investment">
<section>
  <div class="container">
    <div class="section-eyebrow">06 · Investment Summary</div>
    <h2 class="section-title">What you're getting</h2>
    <p class="section-lead">A complete, turnkey audiovisual system for the Building 1 Auditorium: equipment, cable, installation, engineering, programming, commissioning and training, with three years of Mason Command Silver support.</p>
    <div class="invest-grid">
      <div class="invest-main">
        <div class="invest-label">Total investment</div>
        <div class="invest-total">${data.TOTAL}</div>
        <div class="invest-desc">Bldg 1 Auditorium ${data.AUD_SUBTOTAL} + Silver SLA ${data.SLA}</div>
        <div class="splitbar" aria-hidden="true">{split}</div>
        <div class="line-items">{lis}</div>
        <div style="margin-top:12px">{"".join(details)}</div>
      </div>
      <div class="side-stack">
        <div class="info-card">
          <h3>Quote details</h3>
          <div class="kv"><span>Quote number</span><span>#068918 v1</span></div>
          <div class="kv"><span>Date</span><span>October 13, 2026</span></div>
          <div class="kv"><span>Valid through</span><span>November 7, 2026</span></div>
          <div class="kv"><span>Customer</span><span>Miami Dade College</span></div>
          <div class="kv"><span>Site</span><span>11011 SW 104th Street, Suite L136, Miami, FL 33176</span></div>
          <div class="kv"><span>Project</span><span>MDC Wolfson · Bldg 1 Auditorium AV Upgrade</span></div>
          <div class="kv"><span>Prepared for</span><span>Michael Martinez</span></div>
          <div class="kv"><span>Prepared by</span><span>Edward Puerta</span></div>
        </div>
        <div class="info-card">
          <h3>Payment terms</h3>
          <ul class="arrow-list">
            <li>All material and 10% of labor invoiced on acceptance (mobilization)</li>
            <li>Equipment ordered on receipt of that payment</li>
            <li>Remaining labor billed monthly by percent complete</li>
            <li>Net 30 from invoice date</li>
          </ul>
        </div>
        <div class="info-card">
          <h3>Owner-furnished</h3>
          <ul class="arrow-list">
            <li>Shure SLX-D+ wireless system, 12 channels, with Dante receivers</li>
            <li>Existing 15,000-lumen projector</li>
            <li>Existing racks, audio patch bays and stage XLR lines that pass testing</li>
          </ul>
        </div>
        <div class="info-card">
          <h3>Key exclusions</h3>
          <ul class="arrow-list">
            <li>Stage lighting, structural engineering and hang points</li>
            <li>High-voltage electrical, conduit and raceway</li>
            <li>Architectural, ceiling and stage carpentry work</li>
            <li>Enterprise network, streaming and Zoom licensing</li>
            <li>Permits, bonds and inspection fees</li>
          </ul>
        </div>
      </div>
    </div>
    {pane_next("Next: who we are, and how to reach us", "t-why", "Why Mason")}
  </div>
</section>
</div>"""


def why():
    logos = [("csu", "The California State University"), ("cuny", "The City University of New York"), ("nyc-doe", "NYC Department of Education"), ("nyu", "New York University"), ("palm-beach-state", "Palm Beach State College")]
    grid = "".join(f'<div class="edu-logo-card"><img src="edu-logos/{f}.png" alt="{a}"></div>' for f, a in logos)
    return f"""
<div class="pane" id="p-why" role="tabpanel" aria-label="Why Mason and contact">
<section>
  <div class="container">
    <div class="section-eyebrow">07 · Why Mason Technologies</div>
    <h2 class="section-title">More than a provider — your ally, 24/7.</h2>
    <p class="section-lead">Founded in 2002, Mason Technologies is a nationally recognized low-voltage integrator with a dedicated Southeast team, supporting higher-education partners alongside healthcare, government, technology and financial clients.</p>
    <div class="stat-row">
      <div class="stat"><div class="big">2002</div><div class="cap">Founded</div><p>Over two decades of low-voltage and AV integration.</p></div>
      <div class="stat"><div class="big">150+</div><div class="cap">W-2 CWA technicians</div><p>Our own trained workforce, backed by industry experts.</p></div>
      <div class="stat"><div class="big">40,000</div><div class="cap">Sq ft warehouse</div><p>Logistics strength in New York, with dedicated Southeast operations.</p></div>
      <div class="stat"><div class="big red">WBE</div><div class="cap">NYC &amp; national certified</div><p>Woman-owned, family-run, mission-driven.</p></div>
    </div>
    <div class="why-grid">
      <div class="why-card"><div class="ic">{icon("users")}</div><div><h3>One-stop, full-service integrator</h3><p>We assess, design, install and support every solution we provide: structured cabling, audio visual systems, data centers and unified security.</p></div></div>
      <div class="why-card"><div class="ic">{icon("pin")}</div><div><h3>Regional team, national depth</h3><p>Southeast teams across Virginia, the Carolinas, Georgia and Florida, backed by national resources and ready to mobilize quickly, day or night.</p></div></div>
      <div class="why-card"><div class="ic">{icon("award")}</div><div><h3>Relationships first</h3><p>Technology isn't one-size-fits-all. We get to know our clients first and tailor every solution to their goals.</p></div></div>
      <div class="why-card"><div class="ic">{icon("life")}</div><div><h3>Mason Command support</h3><p>The day the system is accepted, help desk, monitoring and escalation are live under your Silver SLA.</p></div></div>
    </div>

    <div class="sub-title">Trusted by colleges, universities &amp; school systems</div>
    <div class="logo-grid">{grid}</div>

    <div class="cta-box" id="contact">
      <h2>Ready when you are.</h2>
      <p>Questions about the PA, the cameras, the control room or the renovation schedule? Your Mason team is one call away.</p>
      <div class="cta-contacts">
        <div class="cta-card"><div class="cta-role">Enterprise Director</div><div class="cta-name">Edward Puerta</div><div class="cta-detail gold"><a href="tel:+13054326620">(305) 432-6620</a></div><div class="cta-detail"><a href="mailto:epuerta@mason247.com">epuerta@mason247.com</a></div></div>
        <div class="cta-card"><div class="cta-role">Managing Director</div><div class="cta-name">Juan Lazo</div><div class="cta-detail gold"><a href="tel:+13052997957">(305) 299-7957</a></div><div class="cta-detail"><a href="mailto:jlazo@mason247.com">jlazo@mason247.com</a></div></div>
        <div class="cta-card"><div class="cta-role">Mason Technologies</div><div class="cta-name"><a href="tel:+18779473786">877-947-3786</a></div><div class="cta-detail"><a href="https://mason247.com">mason247.com</a></div></div>
      </div>
    </div>
  </div>
</section>
</div>"""


def footer():
    return """<!-- 7. FOOTER -->
<footer>
  <div class="container footer-inner">
    <div>
      <div class="footer-logos">
        <img src="mason-logo-white.png" alt="Mason Technologies" class="m">
        <div class="nav-divider"></div>
        <img src="mdc-logo-white.svg" alt="Miami Dade College" class="c">
      </div>
      <p>517 Commack Rd, Deer Park, NY 11729 · mason247.com · 877-947-3786</p>
      <p>Quote #068918 v1 · MDC Wolfson — Building 1 Auditorium AV Upgrade · Valid through November 7, 2026</p>
    </div>
    <div class="footer-right">
      <p>Prepared for Michael Martinez · Miami Dade College</p>
      <p>Confidential — prepared for Miami Dade College</p>
    </div>
  </div>
</footer>"""


SCRIPT = r"""/* Extras only: every tab, console, filter and control above works without this script. */
(function () {
  document.documentElement.className += ' js';
  var tabs = Array.prototype.slice.call(document.querySelectorAll('input[name="tab"]'));
  var bar = document.getElementById('tabs');
  function toBar() {
    var top = bar.getBoundingClientRect().top + window.scrollY - 64;
    var below = bar.getBoundingClientRect().top > window.innerHeight * 0.55;
    if (window.scrollY > top + 4 || below) window.scrollTo({ top: top, behavior: 'smooth' });
  }
  tabs.forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + r.id.slice(2));
      toBar();
    });
  });
  function fromHash() {
    var r = document.getElementById('t-' + location.hash.slice(1));
    if (r) r.checked = true;
  }
  if (location.hash) fromHash();
  window.addEventListener('hashchange', fromHash);

  /* Switcher extras: CUT / AUTO swap program and preview on the active M/E. */
  function swap(auto) {
    var me = document.getElementById('me-2').checked ? 2 : 1;
    var p = document.querySelector('input[name="m' + me + 'p"]:checked');
    var v = document.querySelector('input[name="m' + me + 'v"]:checked');
    if (!p || !v) return;
    var pn = p.id.split('-')[1], vn = v.id.split('-')[1];
    function go() {
      document.getElementById('m' + me + 'p-' + vn).checked = true;
      document.getElementById('m' + me + 'v-' + pn).checked = true;
    }
    var tb = document.querySelector('.tbar');
    if (auto) {
      var pg = document.querySelector('.mv .pgm');
      pg.style.transition = 'opacity .35s'; pg.style.opacity = '.15';
      if (tb) tb.classList.toggle('down');
      setTimeout(function () { go(); pg.style.opacity = '1'; }, 350);
    } else { go(); }
  }
  document.querySelectorAll('.trans button').forEach(function (b) {
    b.addEventListener('click', function () { swap(b.getAttribute('data-act') === 'auto'); });
  });
})();"""

RESPONSIVE = """
  /* ── RESPONSIVE ────────────────────────────────────── */
  @media (max-width: 1120px) {
    .nav-subtitle, .sub-divider { display: none; }
    .area-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 960px) {
    .nav-links { display: none; }
    .hero-grid, .two-col, .invest-grid, .feature-product, .preset-wrap, .rack-pair, .sw-grid, .mix-top, .sd-wrap { grid-template-columns: 1fr !important; }
    .feature-grid, .support-grid, .uci-cards, .mode-grid, .grid-3 { grid-template-columns: 1fr 1fr; }
    .config-strip { grid-template-columns: repeat(3,1fr); }
    .config-strip div:nth-child(3) { border-right: 0; }
    .config-strip div:nth-child(n+4) { border-top: 1px solid var(--line); }
    .stat-row { grid-template-columns: 1fr 1fr; }
    .steps { grid-template-columns: 1fr; gap: 14px; }
    .steps::before { display: none; }
    .step { display: grid; grid-template-columns: 48px 1fr; gap: 14px; text-align: left; align-items: center; }
    .step .dot { margin: 0; }
    .scroll-hint { display: block; }
    .plan-wrap svg.sf { min-width: 900px; }
    .qs-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
  }
  @media (max-width: 640px) {
    html { scroll-padding-top: 116px; }
    nav.site-nav { padding: 0 16px; }
    .nav-customer-logo { height: 38px; }
    .container, .tabbar-inner { padding: 0 16px; }
    .tabbar label { padding: 13px 12px 11px; font-size: 13.5px; }
    .tabbar label .n { display: none; }
    #hero { padding: 92px 0 40px; }
    .hero-title { font-size: 32px; }
    .section-title { font-size: 26px; }
    .pane > section, .pane-head { padding-top: 44px; }
    .hero-meta, .feature-grid, .scope-grid, .support-grid, .why-grid, .warranty, .specs, .area-grid, .mode-grid, .uci-cards, .grid-2, .grid-3 { grid-template-columns: 1fr; }
    .hero-stats { grid-template-columns: repeat(2,1fr); }
    .config-strip { grid-template-columns: 1fr 1fr; }
    .config-strip div { border-right: 1px solid var(--line) !important; border-top: 1px solid var(--line); }
    .config-strip div:nth-child(2n) { border-right: 0 !important; }
    .config-strip div:nth-child(-n+2) { border-top: 0; }
    .sim { padding: 16px; }
    .sim-step { grid-template-columns: 1fr; gap: 6px; }
    .invest-main { padding: 22px 18px; }
    .invest-total { font-size: 36px; }
    .fp-body { padding: 22px 18px; }
    .why-card { grid-template-columns: 1fr; }
    .footer-right { text-align: left; }
    .cta-box { padding: 32px 18px; }
    .cta-contacts { grid-template-columns: 1fr; }
    .device { padding: 8px; border-radius: 16px; }
    .device::after { display: none; }
    .uhdr { flex-wrap: wrap; gap: 8px 12px; padding: 10px 12px; }
    .uhdr .now { margin-left: 0; order: 3; }
    .upage { padding: 14px 12px; }
    .preset-grid { grid-template-columns: 1fr 1fr; }
    .qs-grid { grid-template-columns: 1fr 1fr; }
    .rack-pair { gap: 28px; }
    .hw { padding: 10px; border-radius: 12px; }
    .mv { grid-template-columns: repeat(10, minmax(0,1fr)); border-width: 3px; }
    .mv-big { grid-column: span 10; }
    .mv .cap { font-size: 9.5px; }
    .mv-sm .cap span:last-child { display: none; }
    .bus { grid-template-columns: 52px repeat(10, 46px); min-width: 560px; }
    .console-pick label { flex: 1 1 calc(50% - 8px); padding: 9px 10px; font-size: 13px; }
    .scenes { grid-template-columns: 1fr 1fr; }
    .keys { gap: 4px; }
    .keys > * { font-size: 7.5px; border-radius: 5px; padding: 1px; }
    .keys .icon { width: 13px; height: 13px; margin-bottom: 1px; }
    .dest { grid-template-columns: 1fr; }
    .sd-read li { grid-template-columns: 24px 1fr; }
    .sd-read li span { grid-column: 2; }
    .chinfo dl { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .live-dot, .meter i, .vu i, .sf .ln { animation: none !important; }
  }
  @media print {
    nav.site-nav, .tabbar, .sim, .filter-bar, .hero-cta, .subtabs, .pane-next, .device-toggle, .console-pick { display: none !important; }
    .pane, .subpane, .cpane { display: block !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }"""
