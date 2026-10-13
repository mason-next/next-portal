"""Quote #068918 v1 line items, transcribed from the quote PDF (source of truth)."""
from decimal import Decimal as D

# (section, group, [(qty, description, unit, ext)])
EQUIPMENT = [
 ("Audio System", "PA system", [
  (8, "YME iA211X three-way quad-amp dual 11 in line array element, coaxial neodymium mid-high, 90° × 10°, 50 Hz–20 kHz, 141 dB peak · main L/R arrays", "3,673.02", "29,384.16"),
  (2, "YME line array rigging kit, 3-point load-bearing design, quick-release pins, 0°–10° splay in 1° steps", "892.94", "1,785.88"),
  (4, "YME iA 218B passive dual 18 in subwoofer, 100 mm voice coils, 2,000 W AES, 4 Ω, 30–120 Hz, 142 dB peak, cardioid capable · under stage lip", "2,266.06", "9,064.24"),
  (1, "YME CL 114-30 two-way bi-amp 14 in constant curvature loudspeaker, 100° × 30°, 50 Hz–20 kHz · center channel", "1,434.06", "1,434.06"),
  (1, "YME rigging hardware kit for CL Series constant curvature loudspeakers", "131.25", "131.25"),
  (10, "YME CS 7P two-way 7 in passive coaxial loudspeaker, 200 W AES, 8 Ω, 110° conical · six black front fills, four white delays", "560.62", "5,606.20"),
  (2, "YME CS 5P two-way 5 in passive coaxial loudspeaker, black, 100 W AES, 16 Ω · control room house sound", "345.31", "690.62"),
 ]),
 ("Audio System", "Stage monitors", [
  (2, "YME CL 114-30 two-way bi-amp 14 in constant curvature loudspeaker, 100° × 30° · side fills", "1,434.06", "2,868.12"),
  (2, "YME CL 114-15 two-way bi-amp 14 in constant curvature loudspeaker, 100° × 15° narrow coverage, 137 dB peak · paired at side fills", "1,434.06", "2,868.12"),
  (1, "YME rigging hardware kit for CL Series constant curvature loudspeakers", "131.25", "131.25"),
  (2, "YME MC 12X passive 12 in stage monitor wedge, 450 W, 8 Ω, driven bi-amped from PDA 2.0 · downstage edge", "1,279.69", "2,559.38"),
  (2, "YME MC 12A self-powered 12 in active stage monitor wedge, analog input · midstage", "2,015.00", "4,030.00"),
 ]),
 ("Audio System", "Amplifiers", [
  (9, "YME PDA 2.0 four-channel switching power amplifier, 2,300 W × 4 at 4 Ω, onboard DSP, AES/EBU inputs, dual Ethernet", "3,615.62", "32,540.58"),
  (1, "YME PDA 3.0 four-channel switching power amplifier, 2,800 W × 4 at 4 Ω, onboard DSP, AES/EBU inputs, dual Ethernet", "4,818.12", "4,818.12"),
 ]),
 ("Audio System", "Microphones", [
  (1, "Owner-furnished: Shure SLX-D+ wireless system, 12 channels, handhelds, bodypacks, rechargeable batteries, chargers and Dante receivers", "0.00", "0.00"),
  (12, "DPA CORE+ supercardioid headset microphone with TA4F adapter, dual-ear fit, IP58, optimized for Shure wireless", "1,085.05", "13,020.60"),
  (4, "DPA CORE+ cardioid lavalier microphone with TA4F connector for Shure wireless, IP58", "841.16", "3,364.64"),
  (3, "Audio-Technica BP4073 shotgun condenser microphone, XLR", "791.29", "2,373.87"),
  (3, "Mason custom black ceiling rigging kit: 15 ft aircraft cable, short pipe, 3/8\"-16 stud, tilt adapter and shock mount", "118.75", "356.25"),
 ]),
 ("Audio System", "Mixing console", [
  (1, "Yamaha DM7 Compact 72-channel digital mixing console, touchscreen, Dante", "15,527.82", "15,527.82"),
  (1, "Yamaha DM7 Control expansion controller", "6,461.37", "6,461.37"),
  (1, "Yamaha Rio3224-D3 32-input, 24-output Dante stage box, remote preamps, redundant network", "12,116.47", "12,116.47"),
 ]),
 ("Audio System", "Assisted listening", [
  (1, "Listen Technologies iDSP Prime Level III stationary RF system, 72 MHz, Dante", "2,579.25", "2,579.25"),
  (12, "Listen Technologies intelligent DSP RF receiver, 72 MHz", "179.25", "2,151.00"),
  (2, "Listen Technologies intelligent ear phone / neck loop lanyard", "62.25", "124.50"),
  (1, "Listen Technologies intelligent 4-unit charging tray", "319.50", "319.50"),
 ]),
 ("Video System", "Side displays", [
  (2, "BlueSquareX Vivid 110 in 4K UHD commercial display, 3840 × 2160, 400 nit, RS-232, VESA", "14,634.15", "29,268.30"),
  (2, "Mason custom wall-mount offset mount", "156.25", "312.50"),
  (2, "SurgeX 8 A / 120 V power conditioner, series-mode surge protection, IP control", "765.30", "1,530.60"),
 ]),
 ("Video System", "Projection system", [
  (1, "Owner-furnished: existing 15,000-lumen projector", "0.00", "0.00"),
  (1, "Draper Acumen XL V, 220 in diagonal, 16:9, Matt White XT1000VB, 110 V, tab-tensioned", "5,250.00", "5,250.00"),
  (1, "Draper ceiling installation accessories kit: mounting hardware, fasteners, safety hardware, cable management", "531.25", "531.25"),
 ]),
 ("Video System", "Camera equipment", [
  (6, "Sony SRG-A40 4K PTZ camera, 20× optical zoom, built-in AI, white", "3,636.25", "21,817.50"),
  (5, "Proaim PTZ-10 PTZ camera vibration isolator mount", "72.63", "363.15"),
  (6, "Sound Control Technologies RemoteCam5+ camera extension kit: uncompressed 4K60 HDMI, Ethernet control, 66 W PoE++, 100 m", "3,437.50", "20,625.00"),
  (1, "Manfrotto aluminum tripod, 33 lb capacity, 63 in maximum height, 3/8\"-16 mount", "198.13", "198.13"),
 ]),
 ("Video System", "Camera control", [
  (1, "Sony RM-IP500 professional PTZ controller with joystick, IP/RS-422, presets, tally, focus, iris and paint", "2,989.13", "2,989.13"),
  (1, "Dell 23.8 in multi-touch monitor", "531.24", "531.24"),
 ]),
 ("Video System", "Switching, routing, conversion and recording", [
  (1, "Blackmagic Videohub 40×40 12G zero-latency SDI router, 4K60, reclocking, Ethernet and USB-C control", "4,389.14", "4,389.14"),
  (1, "Blackmagic ATEM 2 M/E Constellation 4K live production switcher, 20 × 12G-SDI inputs, 12 outputs, multiview, Fairlight audio", "4,905.56", "4,905.56"),
  (1, "Blackmagic ATEM 1 M/E Advanced Panel: broadcast-style controls, T-bar, keyers, transitions, macros", "3,645.36", "3,645.36"),
  (1, "Blackmagic ATEM 1 M/E Advanced Panel: broadcast-style controls, T-bar, keyers, transitions, macros", "4,302.07", "4,302.07"),
  (24, "Decimator 12G-CROSS HDMI/SDI 4K cross converter with scaling and frame-rate conversion", "650.00", "15,600.00"),
  (7, "AVPro Edge HDBaseT extender kit, ICT 18G, 100 m 4K", "997.96", "6,985.72"),
  (1, "AJA 12G-AM 12G-SDI 8-channel AES audio embedder / de-embedder, UHD 4K", "1,472.63", "1,472.63"),
  (1, "Blackmagic HyperDeck Studio 4K Pro broadcast deck, 12G-SDI, UHD 4K record / playback", "1,838.89", "1,838.89"),
  (2, "Samsung 870 EVO 1 TB SSD, Blackmagic-recommended media for HyperDeck Studio 4K Pro", "393.15", "786.30"),
  (1, "Blackmagic Streaming Encoder 4K", "772.22", "772.22"),
  (1, "Logitech Tap with Lenovo ThinkSmart Core Gen 2 for Zoom Rooms", "4,009.31", "4,009.31"),
  (1, "AJA U-TAP SDI USB 3.0 capture interface, 3G-SDI input, 1080p60", "489.20", "489.20"),
  (2, "Lilliput 21.5 in professional production monitor, 1000 nit, HDR, 3G-SDI, HDMI 4K input", "598.95", "1,197.90"),
 ]),
 ("Headend", "Control equipment", [
  (2, "Q-SYS Core 24f processor: 24 local I/O, 160 × 160 network I/O, 8 × 8 Dante, USB AV bridging, dual Ethernet", "4,811.25", "9,622.50"),
  (2, "Q-SYS software-based Dante 64 × 64 channel license, perpetual", "1,488.75", "2,977.50"),
  (4, "Q-SYS QIO-AES8x8 peripheral, 8 channels AES3 in and out, PoE", "948.75", "3,795.00"),
  (1, "Q-SYS TSC-101-G3 10.1 in PoE touch screen controller", "2,598.75", "2,598.75"),
  (1, "Q-SYS table-top mounting accessory for TSC-101-G3", "366.00", "366.00"),
  (1, "Q-SYS QIO-IR1x4 control expansion: 1 IR receiver, 4 IR emitters", "459.00", "459.00"),
  (1, "Q-SYS rack mount tray and blanking panels for up to four QIO units, 1U", "154.50", "154.50"),
  (2, "NETGEAR M4250-40G8XF-PoE++ managed switch", "5,393.26", "10,786.52"),
  (1, "NETGEAR M4250-26G4XF-PoE+ managed switch", "1,973.81", "1,973.81"),
  (8, "NETGEAR 10GBASE-SR SFP+ multimode fiber transceiver, duplex LC, OM4", "315.59", "2,524.72"),
  (500, "6-strand OM4 multimode armored indoor/outdoor fiber, plenum rated, per foot", "3.65", "1,825.00"),
 ]),
 ("Headend", "Video switching desk (for streaming)", [
  (1, "Samsung 43 in commercial 4K UHD display, 350 nit · multiview", "651.25", "651.25"),
  (1, "Chief micro-adjust tilt wall mount, medium", "198.79", "198.79"),
  (1, "Mason custom service PC", "875.00", "875.00"),
  (1, "Mason heavy-duty vertical stacking monitor desk mount, VESA", "206.25", "206.25"),
  (1, "Elgato Stream Deck XL, 32-key control surface", "246.31", "246.31"),
 ]),
 ("Headend", "Rack equipment", [
  (1, "Middle Atlantic 44-space, 31 in deep configured AV rack", "3,713.06", "3,713.06"),
  (1, "Middle Atlantic caster base", "232.88", "232.88"),
  (3, "WattBox 800 Series IP power conditioner, 12 individually controlled outlets", "691.28", "2,073.84"),
  (1, "WattBox IP vertical power strip and conditioner, individual outlet control", "888.59", "888.59"),
  (3, "Xtreme Power 3000 VA lithium-ion online UPS bundle, 4-post rail kit, SNMP, maintenance bypass module", "4,447.50", "13,342.50"),
 ]),
]

WIRE = [
  (2000, "Liberty Cat6 550 23/4P UTP CMP, white (ft)", "0.44", "880.00"),
  (4000, "Liberty Cat6 23/4P F/UTP CMP, white (ft)", "0.78", "3,120.00"),
  (4000, "Liberty commercial 22/4 OASH CMP, white (ft)", "0.22", "880.00"),
  (1000, "Belden 12 GHz 4K UHD precision video coax, mini RG-59 type (ft)", "2.69", "2,690.00"),
  (500, "Belden 110 Ω AES/EBU digital audio cable, 24 AWG shielded, CMP (ft)", "2.07", "1,035.00"),
  (120, "Amphenol 12G-SDI straight crimp BNC connector, 75 Ω", "5.39", "646.80"),
]

EQUIP_SUBTOTAL = "349,630.12"
WIRE_SUBTOTAL = "9,251.80"
LABOR = "120,518.87"
MISC = "17,111.77"
AUD_SUBTOTAL = "496,512.56"
SLA = "34,614.00"
TOTAL = "531,126.56"


def d(s):
    return D(s.replace(",", ""))


def money(x):
    return "${:,.2f}".format(x)


def check():
    tot = D(0)
    for _, _, items in EQUIPMENT:
        for q, _, u, e in items:
            assert (D(q) * d(u)).quantize(D("0.01")) == d(e), (q, u, e)
            tot += d(e)
    assert tot == d(EQUIP_SUBTOTAL), tot
    w = sum(d(e) for *_, e in WIRE)
    for q, _, u, e in WIRE:
        assert (D(q) * d(u)).quantize(D("0.01")) == d(e)
    assert w == d(WIRE_SUBTOTAL), w
    assert d(EQUIP_SUBTOTAL) + d(WIRE_SUBTOTAL) + d(LABOR) + d(MISC) == d(AUD_SUBTOTAL)
    assert d(AUD_SUBTOTAL) + d(SLA) == d(TOTAL)


def section_totals():
    out = {}
    for sec, _, items in EQUIPMENT:
        out[sec] = out.get(sec, D(0)) + sum(d(e) for *_, e in items)
    return out


if __name__ == "__main__":
    check()
    print({k: money(v) for k, v in section_totals().items()})
