"""Representative product illustrations for quote #069114 (same visual language as #068876/#068877/#068918).

Usage: python3 presentations/_tools/quote-069114/assets.py presentations/quote-069114-v1/assets
Writes the new illustrations only; qsc-core-8-flex, netgear-m4250-10g2f, avpro-ex70-kit and reel-cat6a
are copied from earlier builds.
"""
import os
import sys

OUT = sys.argv[1]
DEFS = ('<defs><pattern id="g" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#0e1013"/>'
        '<circle cx="2" cy="2" r=".9" fill="#3a414a"/></pattern><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        '<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123456"/><stop offset=".6" stop-color="#1f5f8f"/>'
        '<stop offset="1" stop-color="#c8a84b"/></linearGradient>'
        '<linearGradient id="wht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd6de"/></linearGradient></defs>')
F = 'font-family="Segoe UI,Arial"'


def svg(body, vb="0 0 240 160"):
    w, h = [float(x) for x in vb.split()[2:]]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{int(w*2)}" height="{int(h*2)}">{DEFS}{body}</svg>'


def shadow(cx, cy, rx):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="4" fill="#000" opacity=".18"/>'


def rack(label, y, h, x=30, w=180, extra="", color="#1b1e22", ears=True):
    """A 19-inch rack-mount chassis front panel."""
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{color}" stroke="#4a525c"/>'
         f'<rect x="{x}" y="{y}" width="{w}" height="{h/2}" rx="2" fill="url(#sh)"/>')
    if ears:
        s += (f'<rect x="{x-7}" y="{y}" width="7" height="{h}" fill="#2a2f36" stroke="#4a525c"/>'
              f'<rect x="{x+w}" y="{y}" width="7" height="{h}" fill="#2a2f36" stroke="#4a525c"/>'
              f'<circle cx="{x-3.5}" cy="{y+h/2}" r="1.3" fill="#8a939d"/><circle cx="{x+w+3.5}" cy="{y+h/2}" r="1.3" fill="#8a939d"/>')
    if label:
        s += f'<text x="{x+8}" y="{y+9}" {F} font-size="6.2" fill="#9aa4ae" letter-spacing=".6">{label}</text>'
    return s + extra


def leds(x, y, n, gap=6, colors=("#3fd17a", "#2eaadc")):
    return "".join(f'<circle cx="{x+i*gap}" cy="{y}" r="1.5" fill="{colors[i % len(colors)]}"/>' for i in range(n))


def ports(x, y, n, w=6, h=5, gap=8):
    return "".join(f'<rect x="{x+i*gap}" y="{y}" width="{w}" height="{h}" rx="1" fill="#0a0b0d" stroke="#5a636d" stroke-width=".6"/>' for i in range(n))


def buttons(x, y, n, w=7, h=6, gap=9, lit=None, color="#2c3138"):
    lit = lit or {}
    return "".join(f'<rect x="{x+i*gap}" y="{y}" width="{w}" height="{h}" rx="1.2" fill="{lit.get(i, color)}" stroke="#555d66" stroke-width=".5"/>' for i in range(n))


A = {}

# Cyviz xpo5 v4 — 1U video wall processor with front display window
A["cyviz-xpo5"] = svg(shadow(120, 106, 96) + rack("CYVIZ  XPO5", 78, 24,
    extra='<rect x="120" y="83" width="44" height="14" rx="1.5" fill="#0a0b0d" stroke="#4a525c"/>'
          '<rect x="123" y="86" width="9" height="8" fill="#2eaadc" opacity=".85"/><rect x="134" y="86" width="9" height="8" fill="#c8a84b" opacity=".85"/>'
          '<rect x="145" y="86" width="16" height="8" fill="#1f5f8f"/>' + leds(176, 90, 3) +
          '<rect x="196" y="85" width="8" height="10" rx="1" fill="#2c3138" stroke="#555d66" stroke-width=".5"/>') +
    f'<text x="120" y="130" text-anchor="middle" {F} font-size="7" fill="#7d858e">7 input lanes · 2 outputs · 1RU</text>')

# Cyviz Easy Controller X — half-width 1RU
A["cyviz-controller"] = svg(shadow(120, 104, 62) +
    '<rect x="66" y="78" width="108" height="22" rx="2" fill="#1b1e22" stroke="#4a525c"/><rect x="66" y="78" width="108" height="11" rx="2" fill="url(#sh)"/>'
    f'<text x="73" y="87" {F} font-size="6" fill="#9aa4ae" letter-spacing=".6">EASY CONTROLLER X</text>' + ports(118, 90, 4, gap=9) + leds(76, 94, 2) +
    f'<text x="120" y="126" text-anchor="middle" {F} font-size="7" fill="#7d858e">Half-width 1RU · 4 LAN ports</text>')

# Cyviz 10.1" touch monitor on a desk stand
A["cyviz-touch"] = svg(shadow(120, 140, 62) +
    '<path d="M98 120 L142 120 L150 138 L90 138 Z" fill="#2a2f36" stroke="#4a525c"/>'
    '<rect x="56" y="30" width="128" height="88" rx="6" fill="#111317" stroke="#4a525c"/>'
    '<rect x="62" y="36" width="116" height="76" rx="2" fill="#0d1b2a"/>'
    '<rect x="68" y="42" width="104" height="38" rx="2" fill="url(#scr)"/>'
    '<rect x="68" y="85" width="24" height="10" rx="2" fill="#c8a84b"/><rect x="95" y="85" width="24" height="10" rx="2" fill="#2a3a4e"/>'
    '<rect x="122" y="85" width="24" height="10" rx="2" fill="#2a3a4e"/><rect x="149" y="85" width="23" height="10" rx="2" fill="#2a3a4e"/>'
    '<rect x="68" y="99" width="104" height="6" rx="3" fill="#1d2b3c"/><rect x="68" y="99" width="62" height="6" rx="3" fill="#2eaadc"/>')

# Cyviz Easy Server licences + support — software card
A["cyviz-software"] = svg(shadow(120, 140, 70) +
    '<rect x="58" y="26" width="124" height="104" rx="8" fill="#111317" stroke="#4a525c"/>'
    '<rect x="58" y="26" width="124" height="18" rx="8" fill="#1f2730"/><circle cx="70" cy="35" r="2.5" fill="#d9483b"/><circle cx="79" cy="35" r="2.5" fill="#c8a84b"/><circle cx="88" cy="35" r="2.5" fill="#3fd17a"/>'
    f'<text x="70" y="62" {F} font-size="8" font-weight="700" fill="#e6ebf1">Easy Server</text>'
    '<rect x="70" y="70" width="100" height="9" rx="2" fill="#1d2b3c"/><rect x="70" y="70" width="10" height="9" rx="2" fill="#3fd17a"/>'
    '<rect x="70" y="84" width="100" height="9" rx="2" fill="#1d2b3c"/><rect x="70" y="84" width="10" height="9" rx="2" fill="#3fd17a"/>'
    '<rect x="70" y="98" width="100" height="9" rx="2" fill="#1d2b3c"/><rect x="70" y="98" width="10" height="9" rx="2" fill="#3fd17a"/>'
    f'<text x="86" y="77" {F} font-size="5.6" fill="#9aa4ae">Controller connector</text><text x="86" y="91" {F} font-size="5.6" fill="#9aa4ae">Teams Rooms agent</text>'
    f'<text x="86" y="105" {F} font-size="5.6" fill="#9aa4ae">Desktop agent</text>'
    f'<text x="70" y="121" {F} font-size="5.6" fill="#c8a84b">12 MONTHS · ESSENTIAL SUPPORT</text>')

# AVPro Edge AC-MX-1616 — 1RU 16x16 matrix
A["avpro-matrix"] = svg(shadow(120, 106, 96) + rack("AVPRO EDGE  AC-MX-1616", 78, 24,
    extra='<rect x="122" y="82" width="34" height="9" rx="1" fill="#0b2a3d" stroke="#2eaadc" stroke-width=".6"/>'
          f'<text x="125" y="88.6" {F} font-size="5" fill="#7cc9ec">IN 8 → OUT 1</text>' +
          buttons(160, 82, 5, w=6, h=5, gap=8, lit={0: "#c8a84b"}) + buttons(160, 91, 5, w=6, h=5, gap=8, lit={2: "#2eaadc"}) + leds(40, 96, 3)) +
    f'<text x="120" y="130" text-anchor="middle" {F} font-size="7" fill="#7d858e">16 in × 16 out · 18 Gbps · audio de-embed</text>')

# AVPro Edge AC-CXWP-HDMO-BKT — single-gang HDMI wall plate + receiver
A["avpro-wallplate"] = svg(shadow(84, 136, 34) + shadow(170, 120, 42) +
    '<rect x="56" y="30" width="56" height="102" rx="5" fill="url(#wht)" stroke="#a7b1bc"/>'
    '<rect x="70" y="58" width="28" height="12" rx="2" fill="#1b1e22"/><path d="M73 61 h22 l-2 6 h-18 z" fill="#3a414a"/>'
    f'<text x="84" y="84" text-anchor="middle" {F} font-size="6" fill="#4a525c">HDMI</text>'
    '<circle cx="84" cy="38" r="2" fill="#c3cad3"/><circle cx="84" cy="124" r="2" fill="#c3cad3"/>'
    '<rect x="130" y="96" width="80" height="22" rx="3" fill="#1b1e22" stroke="#4a525c"/><rect x="130" y="96" width="80" height="11" rx="3" fill="url(#sh)"/>'
    f'<text x="136" y="104" {F} font-size="5.2" fill="#9aa4ae">AVPro Edge RX</text>' + ports(170, 107, 2, w=8, h=6, gap=11) + leds(140, 112, 2) +
    '<path d="M112 92 C 122 92, 124 108, 130 108" fill="none" stroke="#2eaadc" stroke-width="1.6"/>')

# Extron DSC 401 — compact scaler
A["extron-dsc401"] = svg(shadow(120, 112, 58) +
    '<rect x="66" y="78" width="108" height="30" rx="3" fill="#1b1e22" stroke="#4a525c"/><rect x="66" y="78" width="108" height="15" rx="3" fill="url(#sh)"/>'
    f'<text x="74" y="88" {F} font-size="6" fill="#9aa4ae" letter-spacing=".6">EXTRON  DSC 401</text>' + leds(76, 100, 4, gap=7) +
    '<rect x="132" y="94" width="30" height="8" rx="1" fill="#0b2a3d"/>'
    f'<text x="135" y="100" {F} font-size="5" fill="#7cc9ec">1080p60</text>'
    f'<text x="120" y="132" text-anchor="middle" {F} font-size="7" fill="#7d858e">Locks Teams content to 1080p</text>')

# Crestron AirMedia AM-3100-WF receiver + AM-TX3-100 USB-C puck
A["airmedia"] = svg(shadow(96, 116, 54) + shadow(186, 116, 22) +
    '<rect x="44" y="70" width="104" height="42" rx="6" fill="#1b1e22" stroke="#4a525c"/><rect x="44" y="70" width="104" height="18" rx="6" fill="url(#sh)"/>'
    f'<text x="54" y="84" {F} font-size="6.4" fill="#9aa4ae" letter-spacing=".6">CRESTRON AIRMEDIA</text>' + leds(56, 100, 2) +
    '<rect x="172" y="84" width="28" height="28" rx="6" fill="#1b1e22" stroke="#4a525c"/><circle cx="186" cy="98" r="7" fill="#0a0b0d" stroke="#2eaadc"/>'
    '<path d="M186 84 C 186 70, 168 64, 168 52" fill="none" stroke="#3a414a" stroke-width="3"/><rect x="163" y="44" width="10" height="9" rx="2" fill="#5a636d"/>'
    '<path d="M150 66 q8 -8 16 0 M146 60 q12 -14 24 0" fill="none" stroke="#2eaadc" stroke-width="1.6" stroke-linecap="round"/>')

# WattBox WB-800VPS-IPVM-12 — vertical IP power conditioner
A["wattbox-vertical"] = svg(shadow(120, 152, 30) +
    '<rect x="108" y="8" width="24" height="140" rx="3" fill="#1b1e22" stroke="#4a525c"/><rect x="108" y="8" width="12" height="140" rx="3" fill="url(#sh)"/>'
    '<rect x="111" y="14" width="18" height="10" rx="1" fill="#0b2a3d"/>'
    f'<text x="113" y="21" {F} font-size="5" fill="#7cc9ec">8.4A</text>' +
    "".join(f'<rect x="113" y="{30+i*9.5:.1f}" width="14" height="7" rx="1.5" fill="#0a0b0d" stroke="#5a636d" stroke-width=".6"/>'
            f'<circle cx="131" cy="{33.5+i*9.5:.1f}" r="1" fill="#3fd17a"/>' for i in range(12)) +
    f'<text x="146" y="80" {F} font-size="7" fill="#7d858e">12 outlets</text><text x="146" y="90" {F} font-size="7" fill="#7d858e">each switched</text>'
    f'<text x="146" y="100" {F} font-size="7" fill="#7d858e">and metered</text>')

# Global Caché iTach IP2IR
A["itach"] = svg(shadow(120, 112, 44) +
    '<rect x="80" y="76" width="80" height="32" rx="5" fill="#f3f5f8" stroke="#a7b1bc"/><rect x="80" y="76" width="80" height="14" rx="5" fill="#ffffff"/>'
    f'<text x="88" y="88" {F} font-size="6.4" fill="#4a525c">iTach IP2IR</text>' + leds(90, 99, 3, gap=7, colors=("#3fd17a", "#c8a84b", "#2eaadc")) +
    '<rect x="130" y="95" width="9" height="7" rx="1" fill="#0a0b0d"/>' +
    '<circle cx="148" cy="98" r="2.6" fill="#2a2f36"/><path d="M150 98 C 170 98, 176 120, 196 120" fill="none" stroke="#2a2f36" stroke-width="1.4"/>'
    '<rect x="194" y="116" width="10" height="7" rx="2" fill="#2a2f36"/>'
    f'<text x="120" y="134" text-anchor="middle" {F} font-size="7" fill="#7d858e">Changes IPTV channels if the box needs IR</text>')

# Middle Atlantic PTRK-ERS retrofit kit — shelves, rails, blanks, lacing
A["rack-kit"] = svg(shadow(120, 146, 84) +
    '<path d="M40 40 L200 40 L200 50 L40 50 Z" fill="#2a2f36" stroke="#4a525c"/><path d="M40 50 L54 58 L214 58 L200 50" fill="#3a414a" stroke="#4a525c"/>'
    '<path d="M36 74 L196 74 L196 84 L36 84 Z" fill="#2a2f36" stroke="#4a525c"/><path d="M36 84 L50 92 L210 92 L196 84" fill="#3a414a" stroke="#4a525c"/>'
    '<rect x="36" y="104" width="10" height="38" fill="#1b1e22" stroke="#4a525c"/>'
    + "".join(f'<rect x="38.5" y="{107+i*6}" width="5" height="2.4" fill="#0a0b0d"/>' for i in range(6)) +
    '<rect x="56" y="108" width="140" height="12" rx="1" fill="#1b1e22" stroke="#4a525c"/><rect x="56" y="124" width="140" height="12" rx="1" fill="#1b1e22" stroke="#4a525c"/>'
    '<rect x="202" y="104" width="16" height="34" rx="2" fill="none" stroke="#5a636d" stroke-width="2"/>'
    f'<text x="120" y="24" text-anchor="middle" {F} font-size="7" fill="#7d858e">3 shelves · rear rails · blanks · lacing</text>')

# HDMI + CAT6 patch cords
A["patch-cables"] = svg(shadow(120, 142, 80) +
    '<path d="M50 60 C 90 20, 150 120, 190 70" fill="none" stroke="#1b1e22" stroke-width="5" stroke-linecap="round"/>'
    '<rect x="36" y="54" width="18" height="12" rx="2" fill="#2a2f36" stroke="#4a525c"/><rect x="186" y="64" width="18" height="12" rx="2" fill="#2a2f36" stroke="#4a525c"/>'
    '<path d="M50 112 C 90 80, 150 150, 190 110" fill="none" stroke="#2a2f36" stroke-width="4" stroke-linecap="round"/>'
    '<rect x="38" y="106" width="14" height="12" rx="1.5" fill="#d7dde4" stroke="#8a939d"/><rect x="188" y="104" width="14" height="12" rx="1.5" fill="#d7dde4" stroke="#8a939d"/>'
    f'<text x="120" y="30" text-anchor="middle" {F} font-size="7" fill="#7d858e">HDMI 4K60 · CAT6 shielded patch</text>')

os.makedirs(OUT, exist_ok=True)
for name, body in A.items():
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(body)
print(f"wrote {len(A)} illustrations to {OUT}")
