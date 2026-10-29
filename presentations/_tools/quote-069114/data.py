"""Quote #069114 v1 line items, exactly as on the quote PDF (source of truth).

Each line: (qty, manufacturer, part, description, unit price). The build checks every extended
price and subtotal against the figures printed on the quote and stops if one does not match.
"""
from decimal import Decimal as D

QUOTE = {
    "number": "069114",
    "version": "1",
    "project": "EBCI - Cherokee, NC - Multipurpose Room Video Processing System",
    "title": "Multipurpose Room Video Processing System",
    "customer": "Eastern Band of Cherokee Indians",
    "site": "88 Council House Lp, Cherokee, NC 28719",
    "contact": "Jeremy Brown",
    "contact_email": "jbrown@ebci.gov",
    "rep": "Edward Puerta",
    "rep_email": "epuerta@mason247.com",
    "phone": "877-947-3786",
    "date": "October 29, 2026",
    "expires": "November 24, 2026",
}

OFE = "Owner"

GROUPS = [
    ("Conferencing Equipment", D("1942.65"), [
        (1, OFE, "OFE", "Microsoft Teams Rooms system with MCore PC, MTouch Plus, AVHub, dual 4K PTZ cameras, content sharing and room sensor", "0"),
        (4, OFE, "OFE", "Ceiling array microphone with 360° voice pickup and AVHub integration", "0"),
        (1, OFE, "OFE", "Teams Rooms Pro license", "0"),
        (1, "Cyviz", "1008285", "Easy Server MTR Agent, 12 months", "280.00"),
        (1, "Crestron", "AM3-111-KIT", "AirMedia Series 3 kit with AM-3100-WF receiver and AM-TX3-100 adaptor", "1662.65"),
    ]),
    ("Video Equipment", D("50085.39"), [
        (1, OFE, "OFE", "220\" direct-view LED video wall with integrated display controller and HDMI input module in bottom bezel", "0"),
        (1, OFE, "OFE", "LG existing side-wall flat panel display for auxiliary video content", "0"),
        (3, OFE, "OFE", "Micro form factor PC with HDMI output for dedicated video source", "0"),
        (3, OFE, "OFE", "Wireless keyboard and mouse set, one per PC", "0"),
        (1, OFE, "OFE", "IPTV streaming media player with HDMI output", "0"),
        (1, "Cyviz", "1005010", "XPO5v4 1U rack-mount video wall processor", "20116.03"),
        (7, "Cyviz", "LI1005010", "XPO5v4 video processing input port", "2315.38"),
        (2, "Cyviz", "LO1005010", "XPO5v4 video processing output port", "1521.15"),
        (7, "Cyviz", "1005466", "HDMI20-DP adapter 4K60 0.5 m", "125.64"),
        (2, "Cyviz", "1004653", "Active DP-male to HDMI-male cable 0.3 m", "44.87"),
        (1, "AVPro Edge", "AC-MX-1616", "18 Gbps HDMI 16x16 matrix with audio de-embedding (4K60 4:4:4)", "6968.17"),
        (2, "AVPro Edge", "AC-CXWP-HDMO-BKT", "Single-gang HDMI 2.0 wall plate transmitter and HDBaseT receiver kit", "505.61"),
        (2, "AVPro Edge", "AC-EX70-UHD-KIT", "4K HDMI HDBaseT extender kit, transmitter and receiver, 230 ft", "391.57"),
        (1, "Extron", "60-1878-01", "4K/60 HDMI video scaler, 4:4:4, HDCP 2.3", "987.65"),
    ]),
    ("Audio Equipment", D("3135.00"), [
        (1, OFE, "OFE", "2-channel 70 V power amplifier, 500 W per channel (existing Crown)", "0"),
        (1, OFE, "OFE", "70 V pendant loudspeaker system: four speakers, two zones (existing Atlas)", "0"),
        (1, "QSC", "CORE 8 FLEX", "Q-SYS Core processor with 8 Flex audio I/O, 8x8 Dante, USB AV bridging", "3135.00"),
    ]),
    ("Control Equipment", D("24004.75"), [
        (1, "Cyviz", "XL1005050", "X-Series control processor (Easy Controller X), four LAN ports, half-width 1RU", "17948.72"),
        (1, "Cyviz", "1005050", "Controller rackmount kit", "280.00"),
        (1, "Cyviz", "EM9000", "Essential Support & Maintenance Agreement, yearly", "2694.36"),
        (1, "Cyviz", "1005055", "10.1\" multi-touch control monitor with integrated CATx extender", "2387.18"),
        (1, "Cyviz", "1008270", "Easy Server Controller Connector, 12-month license", "280.00"),
        (1, "Cyviz", "DL9000", "Easy Server Desktop Agent, 12-month license", "280.00"),
        (1, "Global Caché", "CL-IP2IR-P", "iTach wired TCP/IP to IR with PoE", "134.49"),
    ]),
    ("Rack Equipment", D("1986.62"), [
        (1, OFE, "OFE", "PTRK series rolling equipment rack, reused and rebuilt on site", "0"),
        (1, OFE, "OFE", "9-outlet 15 A 1RU rack-mount power distribution unit", "0"),
        (1, "WattBox", "WB-800VPS-IPVM-12", "800 Series 12-outlet vertical IP power conditioner, outlet control and metering", "966.95"),
        (1, "Netgear", "GSM4212P-100NAS", "M4250 AV Line 12-port managed gigabit switch, 8 PoE+ ports", "738.42"),
        (1, "Middle Atlantic", "PTRK-ERS", "Equipment rack retrofit kit: 3 shelves, rear rails, blanking panels, lacing", "281.25"),
    ]),
    ("Bulk Wire & Interconnects", D("1077.15"), [
        (1000, "Liberty", "24-4P-P-L6SH-WHT", "CAT6 23/4P F/UTP CMP white (feet)", "0.78"),
        (20, "Legrand", "56782", "3 ft C2G Core Series high speed HDMI cable, 4K60", "6.99"),
        (5, "Legrand", "56783", "6 ft C2G Core Series high speed HDMI cable, 4K60", "7.32"),
        (16, "Legrand", "00810", "3 ft CAT6 snagless STP cable", "4.84"),
        (6, "Legrand", "00813", "6 ft CAT6 snagless STP cable", "6.01"),
        (1, "Legrand", "00817", "10 ft CAT6 snagless STP cable", "7.25"),
    ]),
    ("Installation & Engineering", D("25613.57"), [
        (1, "Mason", "MTI Labor", "Labor: installation & engineering", "25613.57"),
    ]),
    ("Miscellaneous Hardware & Direct Costs", D("3718.14"), [
        (1, "Mason", "MTI Misc. & Direct Costs", "Miscellaneous hardware & direct costs (shipping, G&A, etc.)", "3718.14"),
    ]),
    ("Mason Command Silver SLA", D("1200.00"), [
        (1, "Mason", "MTI-SLA-SILVER", "Service Level Agreement, Silver tier", "1200.00"),
    ]),
]

EQUIPMENT_SUBTOTAL = D("81154.41")
ROOM_SUBTOTAL = D("111563.27")
TOTAL = D("112763.27")
ANNUAL = D("4688.00")


def money(v):
    return f"${v:,.2f}"


def checked_groups():
    """Return [(name, subtotal, [(qty, mfr, part, desc, unit, ext)])] after verifying every figure."""
    out = []
    for name, expected, lines in GROUPS:
        rows = []
        for qty, mfr, part, desc, unit in lines:
            unit = D(unit)
            rows.append((qty, mfr, part, desc, unit, unit * qty))
        sub = sum(r[5] for r in rows)
        assert sub == expected, f"{name}: lines sum to {sub}, quote says {expected}"
        out.append((name, sub, rows))
    eq = sum(s for n, s, _ in out[:5])
    assert eq == EQUIPMENT_SUBTOTAL, f"equipment subtotal {eq} != {EQUIPMENT_SUBTOTAL}"
    room = sum(s for n, s, _ in out[:8])
    assert room == ROOM_SUBTOTAL, f"room subtotal {room} != {ROOM_SUBTOTAL}"
    total = sum(s for _, s, _ in out)
    assert total == TOTAL, f"total {total} != {TOTAL}"
    return out
