"""Representative product illustrations for quote #068918 (same visual language as #068876/#068877)."""
import os, sys

OUT = sys.argv[1]
DEFS = ('<defs><pattern id="g" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#0e1013"/>'
        '<circle cx="2" cy="2" r=".9" fill="#3a414a"/></pattern><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        '<linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123456"/><stop offset=".6" stop-color="#1f5f8f"/>'
        '<stop offset="1" stop-color="#c8a84b"/></linearGradient>'
        '<radialGradient id="cone" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#3a414a"/><stop offset="1" stop-color="#121417"/></radialGradient>'
        '<linearGradient id="wht" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd6de"/></linearGradient></defs>')
F = 'font-family="Segoe UI,Arial"'


def svg(body, vb="0 0 240 160"):
    w, h = [float(x) for x in vb.split()[2:]]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{int(w*2)}" height="{int(h*2)}">{DEFS}{body}</svg>'


def shadow(cx, cy, rx):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="4" fill="#000" opacity=".18"/>'


def rack(label, y, h, x=30, w=180, extra="", color="#1b1e22"):
    """A 19-inch rack-mount chassis front panel."""
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="{color}" stroke="#4a525c"/>'
         f'<rect x="{x}" y="{y}" width="{w}" height="{h/2}" rx="2" fill="url(#sh)"/>'
         f'<rect x="{x-7}" y="{y}" width="7" height="{h}" fill="#2a2f36" stroke="#4a525c"/>'
         f'<rect x="{x+w}" y="{y}" width="7" height="{h}" fill="#2a2f36" stroke="#4a525c"/>'
         f'<circle cx="{x-3.5}" cy="{y+4}" r="1.3" fill="#8a939d"/><circle cx="{x+w+3.5}" cy="{y+4}" r="1.3" fill="#8a939d"/>')
    if h > 18:
        s += f'<circle cx="{x-3.5}" cy="{y+h-4}" r="1.3" fill="#8a939d"/><circle cx="{x+w+3.5}" cy="{y+h-4}" r="1.3" fill="#8a939d"/>'
    if label:
        s += f'<text x="{x+8}" y="{y+9}" {F} font-size="6.2" fill="#9aa4ae" letter-spacing=".6">{label}</text>'
    return s + extra


def leds(x, y, n, gap=6, colors=("#3fd17a", "#2eaadc")):
    return "".join(f'<circle cx="{x+i*gap}" cy="{y}" r="1.5" fill="{colors[i % len(colors)]}"/>' for i in range(n))


def ports(x, y, n, w=6, h=5, gap=8):
    return "".join(f'<rect x="{x+i*gap}" y="{y}" width="{w}" height="{h}" rx="1" fill="#0a0b0d" stroke="#5a636d" stroke-width=".6"/>' for i in range(n))


def bnc(x, y, n, gap=7):
    return "".join(f'<circle cx="{x+i*gap}" cy="{y}" r="2.4" fill="#c9ced4" stroke="#6b737c" stroke-width=".6"/><circle cx="{x+i*gap}" cy="{y}" r=".9" fill="#2a2f36"/>' for i in range(n))


def buttons(x, y, n, w=7, h=6, gap=9, lit=None, color="#2c3138"):
    lit = lit or {}
    return "".join(f'<rect x="{x+i*gap}" y="{y}" width="{w}" height="{h}" rx="1.2" fill="{lit.get(i, color)}" stroke="#555d66" stroke-width=".5"/>' for i in range(n))


A = {}

# ── LOUDSPEAKERS ────────────────────────────────────────────
def array_box(x, y, w, h, rot, cx):
    return (f'<g transform="rotate({rot} {cx} {y})"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="2" fill="#1b1e22" stroke="#4a525c"/>'
            f'<rect x="{x+4}" y="{y+3}" width="{w-8}" height="{h-6}" rx="1.5" fill="url(#g)"/>'
            f'<text x="{x+w-22}" y="{y+h-4}" {F} font-size="4.5" fill="#6b737c">YME</text></g>')

body = '<rect x="60" y="14" width="120" height="6" rx="1.5" fill="#3a414a" stroke="#5a636d"/><path d="M80 14 L120 4 L160 14" fill="none" stroke="#8a939d" stroke-width="1.4"/>'
for i, (y, rot) in enumerate([(22, 0), (49, 2), (76, 5), (103, 9)]):
    body += array_box(64, y, 112, 26, rot, 120)
A["yme-ia211x"] = svg(shadow(120, 152, 70) + body)

A["yme-ia218b"] = svg(shadow(120, 140, 92) + '<rect x="32" y="40" width="176" height="92" rx="4" fill="#1b1e22" stroke="#4a525c"/>'
    '<rect x="32" y="40" width="176" height="20" rx="4" fill="url(#sh)"/>'
    '<circle cx="80" cy="86" r="36" fill="url(#cone)" stroke="#4a525c"/><circle cx="80" cy="86" r="11" fill="#22262b" stroke="#4a525c"/>'
    '<circle cx="160" cy="86" r="36" fill="url(#cone)" stroke="#4a525c"/><circle cx="160" cy="86" r="11" fill="#22262b" stroke="#4a525c"/>'
    f'<text x="40" y="128" {F} font-size="6" fill="#7d858e">iA 218B</text>')

A["yme-cl114"] = svg(shadow(120, 150, 54) + '<path d="M80 18 L160 18 L170 138 L70 138 Z" fill="#1b1e22" stroke="#4a525c"/>'
    '<path d="M86 26 L154 26 L162 130 L78 130 Z" fill="url(#g)"/>'
    '<rect x="100" y="34" width="40" height="14" rx="2" fill="#0e1013" stroke="#4a525c"/>'
    '<circle cx="120" cy="92" r="30" fill="url(#cone)" stroke="#4a525c" opacity=".55"/>'
    f'<text x="104" y="125" {F} font-size="6" fill="#7d858e">CL 114</text>')

A["yme-cs7p"] = svg(shadow(80, 140, 36) + shadow(170, 140, 34) +
    '<rect x="48" y="38" width="64" height="98" rx="10" fill="#1b1e22" stroke="#4a525c"/><rect x="54" y="44" width="52" height="86" rx="7" fill="url(#g)"/>'
    '<circle cx="80" cy="87" r="20" fill="url(#cone)" opacity=".6"/><circle cx="80" cy="87" r="5" fill="#8a939d"/>'
    '<rect x="140" y="38" width="64" height="98" rx="10" fill="url(#wht)" stroke="#9aa4ae"/><rect x="146" y="44" width="52" height="86" rx="7" fill="#e8edf2" stroke="#c3cad2"/>'
    '<circle cx="172" cy="87" r="20" fill="#d5dce3"/><circle cx="172" cy="87" r="5" fill="#9aa4ae"/>'
    f'<text x="61" y="152" {F} font-size="7" fill="#9aa4ae">black · front fill</text>')

A["yme-cs5p"] = svg(shadow(120, 134, 34) + '<rect x="92" y="54" width="56" height="78" rx="9" fill="#1b1e22" stroke="#4a525c"/>'
    '<rect x="98" y="60" width="44" height="66" rx="6" fill="url(#g)"/><circle cx="120" cy="93" r="15" fill="url(#cone)" opacity=".6"/><circle cx="120" cy="93" r="4" fill="#8a939d"/>')

A["yme-mc12"] = svg(shadow(120, 136, 84) + '<path d="M40 130 L200 130 L200 108 L70 52 L40 66 Z" fill="#1b1e22" stroke="#4a525c"/>'
    '<path d="M74 60 L196 112 L196 126 L48 126 L48 70 Z" fill="url(#g)" opacity=".9"/>'
    '<circle cx="128" cy="100" r="22" fill="url(#cone)" opacity=".55"/>'
    f'<text x="52" y="122" {F} font-size="6" fill="#7d858e">MC 12</text>')

A["yme-pda"] = svg(rack("YME  PDA 2.0", 52, 34,
    extra='<rect x="62" y="66" width="96" height="14" rx="1.5" fill="#0e1013"/>' + "".join(
        f'<rect x="{66+i*23}" y="69" width="18" height="8" rx="1" fill="#0a2238" stroke="#2eaadc" stroke-width=".5"/>' for i in range(4))
    + leds(170, 72, 4) + '<rect x="36" y="64" width="18" height="18" rx="2" fill="url(#g)"/><rect x="186" y="64" width="18" height="18" rx="2" fill="url(#g)"/>')
    + shadow(120, 98, 84), "20 40 200 66")

A["yme-rigging"] = svg(shadow(120, 140, 76) + '<rect x="40" y="40" width="160" height="12" rx="2" fill="#3a414a" stroke="#6b737c"/>'
    + "".join(f'<circle cx="{56+i*16}" cy="46" r="2.4" fill="#0e1013" stroke="#8a939d" stroke-width=".7"/>' for i in range(9))
    + '<path d="M60 52 L60 110 M180 52 L180 110" stroke="#6b737c" stroke-width="5"/><path d="M90 40 L120 18 L150 40" fill="none" stroke="#8a939d" stroke-width="2.2"/>'
    '<circle cx="120" cy="16" r="5" fill="none" stroke="#c8a84b" stroke-width="2"/>'
    '<rect x="52" y="108" width="16" height="10" rx="2" fill="#2a2f36" stroke="#6b737c"/><rect x="172" y="108" width="16" height="10" rx="2" fill="#2a2f36" stroke="#6b737c"/>'
    '<path d="M68 113 h26 M146 113 h26" stroke="#c8a84b" stroke-width="2"/>')

# ── CONSOLE / STAGE BOX ─────────────────────────────────────
def console(x, y, w, h, nf, screen=True, label=""):
    s = (f'<path d="M{x} {y+h} L{x+w} {y+h} L{x+w-10} {y} L{x+10} {y} Z" fill="#1b1e22" stroke="#4a525c"/>'
         f'<path d="M{x+10} {y} L{x+w-10} {y} L{x+w-8} {y+12} L{x+8} {y+12} Z" fill="url(#sh)"/>')
    fx0 = x + 14
    if screen:
        s += f'<rect x="{x+w*0.55}" y="{y+8}" width="{w*0.38}" height="{h*0.32}" rx="2" fill="url(#scr)" stroke="#0a0b0d"/>'
        s += "".join(f'<rect x="{x+w*0.57+i*7}" y="{y+12+ (i%3)*3}" width="4" height="{h*0.32-10-(i%3)*3}" fill="#3fd17a" opacity=".55"/>' for i in range(int(w*0.36/7)))
    span = (w*0.52 if screen else w-28)
    gap = span / nf
    for i in range(nf):
        cx = fx0 + i*gap + gap/2
        s += f'<line x1="{cx}" y1="{y+h*0.42}" x2="{cx}" y2="{y+h-8}" stroke="#0a0b0d" stroke-width="2.4"/>'
        s += f'<rect x="{cx-3}" y="{y+h*0.42+ ((i*7)%19)+6}" width="6" height="5" rx="1" fill="#cfd6de"/>'
        s += f'<circle cx="{cx}" cy="{y+h*0.18}" r="2.2" fill="#2c3138" stroke="#6b737c" stroke-width=".6"/>'
        s += f'<rect x="{cx-3}" y="{y+h*0.3}" width="6" height="4" rx=".8" fill="{"#3fd17a" if i%4 else "#c8a84b"}"/>'
    if screen:
        for r in range(2):
            s += "".join(f'<circle cx="{x+w*0.58+i*9}" cy="{y+h*0.55+r*14}" r="2.6" fill="#2c3138" stroke="#6b737c" stroke-width=".6"/>' for i in range(int(w*0.36/9)))
        s += f'<line x1="{x+w-22}" y1="{y+h*0.5}" x2="{x+w-22}" y2="{y+h-8}" stroke="#0a0b0d" stroke-width="3"/><rect x="{x+w-26}" y="{y+h*0.7}" width="8" height="6" rx="1" fill="#e05a4f"/>'
    if label:
        s += f'<text x="{x+14}" y="{y+h-2}" {F} font-size="5.5" fill="#7d858e">{label}</text>'
    return s

A["yamaha-dm7"] = svg(shadow(120, 140, 104) + console(14, 30, 212, 104, 12, True, "YAMAHA  DM7 COMPACT"))
A["yamaha-dm7-control"] = svg(shadow(120, 140, 70) + console(48, 34, 144, 100, 12, False, "DM7 CONTROL"))
A["yamaha-rio3224"] = svg(rack("YAMAHA  Rio3224-D3", 28, 54,
    extra="".join(f'<circle cx="{44+i*11}" cy="{48+r*14}" r="4.2" fill="#0a0b0d" stroke="#8a939d" stroke-width=".8"/><circle cx="{44+i*11}" cy="{48+r*14}" r="1.2" fill="#8a939d"/>' for r in range(2) for i in range(12))
    + '<rect x="176" y="40" width="28" height="12" rx="1" fill="#0a2238"/>' + leds(180, 62, 4) + ports(178, 68, 3)) + shadow(120, 96, 90), "14 18 212 84")

# ── MICS / ALS ──────────────────────────────────────────────
A["dpa-lav"] = svg(shadow(120, 140, 50) + '<path d="M120 52 C 120 90 70 96 64 130" fill="none" stroke="#2a2f36" stroke-width="2.4"/>'
    '<rect x="112" y="26" width="16" height="30" rx="8" fill="#1b1e22" stroke="#6b737c"/><rect x="114" y="28" width="12" height="10" rx="5" fill="url(#g)"/>'
    '<rect x="100" y="56" width="40" height="10" rx="3" fill="#3a414a" stroke="#6b737c"/>'
    '<rect x="54" y="128" width="20" height="14" rx="3" fill="#8a939d" stroke="#c9ced4"/>'
    f'<text x="80" y="140" {F} font-size="7" fill="#7d858e">TA4F</text>')

A["at-bp4073"] = svg(shadow(120, 150, 30) + '<line x1="120" y1="0" x2="120" y2="40" stroke="#2a2f36" stroke-width="1.4"/>'
    '<line x1="90" y1="70" x2="64" y2="150" stroke="#9aa4ae" stroke-width=".6" stroke-dasharray="2 2"/><line x1="150" y1="70" x2="176" y2="150" stroke="#9aa4ae" stroke-width=".6" stroke-dasharray="2 2"/>'
    '<rect x="116" y="38" width="8" height="18" rx="1" fill="#2a2f36" stroke="#6b737c"/>'
    '<g transform="rotate(-28 120 70)"><rect x="76" y="64" width="98" height="12" rx="5" fill="#2a2f36" stroke="#6b737c"/>'
    '<rect x="80" y="66" width="54" height="8" rx="3" fill="url(#g)"/>'
    '<ellipse cx="146" cy="70" rx="9" ry="13" fill="none" stroke="#c8a84b" stroke-width="1.4"/><ellipse cx="160" cy="70" rx="9" ry="13" fill="none" stroke="#c8a84b" stroke-width="1.4"/></g>'
    f'<text x="18" y="22" {F} font-size="7" fill="#7d858e">aircraft cable</text><text x="168" y="140" {F} font-size="7" fill="#7d858e">tie-offs</text>')

A["listen-als"] = svg(shadow(120, 150, 100) + rack("LISTEN  iDSP", 30, 18, x=40, w=160,
    extra='<rect x="120" y="34" width="34" height="10" rx="1" fill="#0a2238"/>' + leds(162, 39, 3)) +
    '<line x1="190" y1="30" x2="196" y2="6" stroke="#8a939d" stroke-width="1.6"/>' +
    "".join(f'<g transform="translate({60+i*44} 70)"><rect width="30" height="52" rx="6" fill="#1b1e22" stroke="#6b737c"/><rect x="5" y="6" width="20" height="12" rx="2" fill="#0a2238"/>'
            f'<circle cx="15" cy="34" r="6" fill="#2c3138" stroke="#6b737c"/><line x1="24" y1="0" x2="24" y2="-10" stroke="#6b737c" stroke-width="1.4"/></g>' for i in range(3))
    + '<path d="M196 120 c-16 -30 20 -30 6 -2" fill="none" stroke="#c8a84b" stroke-width="1.6"/>')

# ── DISPLAYS / SCREEN ───────────────────────────────────────
A["bsx-110"] = svg(shadow(120, 148, 104) + '<rect x="14" y="16" width="212" height="122" rx="3" fill="#0b0c0e" stroke="#4a525c" stroke-width="2"/>'
    '<rect x="19" y="21" width="202" height="112" fill="url(#scr)"/><text x="120" y="83" text-anchor="middle" '
    f'{F} font-size="22" font-weight="700" fill="#fff" opacity=".9">110″ 4K</text>'
    '<rect x="100" y="138" width="40" height="5" fill="#3a414a"/>')

A["draper-acumen"] = svg(shadow(120, 150, 110) + '<rect x="8" y="10" width="224" height="14" rx="6" fill="#d5dce3" stroke="#9aa4ae"/>'
    '<rect x="18" y="24" width="204" height="114" fill="#eef2f6" stroke="#c3cad2"/><rect x="18" y="128" width="204" height="10" fill="#1b1e22"/>'
    '<path d="M18 24 v104 M222 24 v104" stroke="#2a2f36" stroke-width="3"/>'
    f'<text x="120" y="80" text-anchor="middle" {F} font-size="16" font-weight="700" fill="#9aa4ae">220″ · 16:9</text>'
    '<path d="M228 40 v20 m-4 -4 l4 4 4 -4 M228 100 v-20 m-4 4 l4 -4 4 4" fill="none" stroke="#c8a84b" stroke-width="1.6"/>')

def monitor(x, y, w, h, stand=True, label=""):
    s = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#0b0c0e" stroke="#4a525c" stroke-width="1.6"/><rect x="{x+4}" y="{y+4}" width="{w-8}" height="{h-8}" fill="url(#scr)"/>'
    if stand:
        s += f'<rect x="{x+w/2-5}" y="{y+h}" width="10" height="16" fill="#2a2f36"/><rect x="{x+w/2-28}" y="{y+h+14}" width="56" height="5" rx="2" fill="#2a2f36"/>'
    if label:
        s += f'<text x="{x+w/2}" y="{y+h/2+4}" text-anchor="middle" {F} font-size="10" font-weight="700" fill="#fff" opacity=".9">{label}</text>'
    return s

def multiview(x, y, w, h):
    s = monitor(x, y, w, h, False)
    cw, ch = (w-8)/4, (h-8)/4
    s += f'<rect x="{x+4}" y="{y+4}" width="{cw*2}" height="{ch*2}" fill="#1d4f2f" stroke="#3fd17a" stroke-width="1.2"/><rect x="{x+4+cw*2}" y="{y+4}" width="{cw*2}" height="{ch*2}" fill="#4f1d1d" stroke="#e05a4f" stroke-width="1.2"/>'
    for r in range(2):
        for c in range(4):
            s += f'<rect x="{x+4+c*cw}" y="{y+4+ch*2+r*ch}" width="{cw}" height="{ch}" fill="#14283c" stroke="#0b0c0e" stroke-width=".8"/>'
    return s

A["samsung-43"] = svg(shadow(120, 152, 70) + multiview(30, 20, 180, 104) + '<rect x="110" y="124" width="20" height="18" fill="#2a2f36"/><path d="M90 142 h60" stroke="#2a2f36" stroke-width="5"/>')
A["lilliput-215"] = svg(shadow(120, 150, 80) + monitor(28, 24, 184, 104, True, "SDI · 1000 nit") + '<rect x="32" y="122" width="176" height="4" fill="#1b1e22"/>')
A["dell-touch"] = svg(shadow(120, 152, 70) + monitor(36, 22, 168, 98, True) +
    '<circle cx="120" cy="70" r="14" fill="none" stroke="#fff" stroke-width="1.6" opacity=".9"/><path d="M114 70 h12 M120 64 v12" stroke="#fff" stroke-width="1.4"/>'
    '<path d="M150 98 c6 -10 10 -10 12 -2 l2 10 c-6 6 -14 6 -20 0 z" fill="#c7b399" opacity=".9"/>')

# ── CAMERAS ─────────────────────────────────────────────────
A["sony-srg-a40"] = svg(shadow(120, 146, 60) + '<rect x="70" y="112" width="100" height="30" rx="6" fill="url(#wht)" stroke="#9aa4ae"/>'
    '<path d="M86 112 L94 72 L146 72 L154 112" fill="url(#wht)" stroke="#9aa4ae"/>'
    '<circle cx="120" cy="64" r="40" fill="url(#wht)" stroke="#9aa4ae"/><circle cx="120" cy="64" r="22" fill="#0b0c0e" stroke="#4a525c" stroke-width="2"/>'
    '<circle cx="120" cy="64" r="13" fill="#123456"/><circle cx="114" cy="58" r="4" fill="#fff" opacity=".45"/>'
    f'<text x="120" y="133" text-anchor="middle" {F} font-size="7" font-weight="700" fill="#5a636d">SONY</text>'
    '<circle cx="158" cy="122" r="2" fill="#e05a4f"/>')

A["sct-remotecam"] = svg(shadow(120, 140, 96) +
    "".join(f'<g transform="translate({30+i*100} 62)"><rect width="80" height="44" rx="4" fill="#1b1e22" stroke="#4a525c"/><rect width="80" height="14" rx="4" fill="url(#sh)"/>'
            f'<text x="8" y="12" {F} font-size="5.8" fill="#9aa4ae">RemoteCam5+ {"TX" if i==0 else "RX"}</text>' + ports(8, 26, 3, 9, 7, 13) + leds(60, 30, 2) + '</g>' for i in range(2))
    + '<path d="M110 84 h20" stroke="#2eaadc" stroke-width="3"/><text x="120" y="124" text-anchor="middle" font-size="7" fill="#7d858e" ' + F + '>video · power · control on one Cat cable</text>')

A["tripod"] = svg(shadow(120, 150, 70) + '<rect x="104" y="14" width="32" height="10" rx="3" fill="#2a2f36" stroke="#6b737c"/>'
    '<path d="M120 24 L72 146 M120 24 L168 146 M120 24 L120 150" stroke="#6b737c" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M120 24 L72 146 M120 24 L168 146 M120 24 L120 150" stroke="#9aa4ae" stroke-width="1.2" stroke-linecap="round"/>'
    '<rect x="110" y="56" width="20" height="8" rx="2" fill="#1b1e22" stroke="#6b737c"/>'
    '<rect x="176" y="40" width="40" height="22" rx="3" fill="#1b1e22" stroke="#6b737c"/><path d="M182 46 h28 M182 51 h28 M182 56 h28" stroke="#4a525c"/>'
    f'<text x="174" y="74" {F} font-size="6.5" fill="#7d858e">PTZ-10 mount</text>')

A["sony-rm-ip500"] = svg(shadow(120, 146, 100) + '<path d="M18 136 L222 136 L212 58 L28 58 Z" fill="#1b1e22" stroke="#4a525c"/>'
    '<path d="M28 58 L212 58 L214 70 L26 70 Z" fill="url(#sh)"/>'
    '<rect x="40" y="66" width="70" height="26" rx="2" fill="url(#scr)"/>'
    + "".join(f'<rect x="{40+i*12}" y="{100+r*12}" width="9" height="8" rx="1.5" fill="{"#e05a4f" if (i==1 and r==0) else "#2c3138"}" stroke="#6b737c" stroke-width=".5"/>' for r in range(2) for i in range(6))
    + '<circle cx="170" cy="100" r="22" fill="#2c3138" stroke="#6b737c"/><rect x="164" y="56" width="12" height="44" rx="6" fill="#3a414a" stroke="#8a939d"/>'
    '<circle cx="170" cy="56" r="9" fill="#2a2f36" stroke="#8a939d"/>'
    + "".join(f'<circle cx="{124+i*10}" cy="80" r="3" fill="#2c3138" stroke="#6b737c" stroke-width=".6"/>' for i in range(3)))

# ── VIDEO SWITCHING / RECORDING ─────────────────────────────
A["atem-constellation"] = svg(rack("ATEM 2 M/E 4K", 54, 18,
    extra='<rect x="128" y="57" width="34" height="12" rx="1" fill="url(#scr)"/>' + buttons(168, 59, 3, 7, 8, 10, {0: "#e05a4f"}) + leds(44, 66, 3))
    + shadow(120, 82, 84), "18 44 204 46")

A["atem-panel"] = svg(shadow(120, 142, 108) + '<path d="M12 134 L228 134 L220 30 L20 30 Z" fill="#1b1e22" stroke="#4a525c"/>'
    '<path d="M20 30 L220 30 L222 42 L18 42 Z" fill="url(#sh)"/>'
    + buttons(30, 48, 10, 10, 8, 13, {0: "#3a414a"}) + buttons(30, 64, 10, 10, 8, 13)
    + buttons(30, 84, 10, 10, 8, 13, {3: "#e05a4f"}) + buttons(30, 100, 10, 10, 8, 13, {5: "#3fd17a"})
    + '<rect x="166" y="52" width="40" height="24" rx="2" fill="url(#scr)"/>'
    '<rect x="176" y="84" width="20" height="44" rx="3" fill="#0a0b0d"/><rect x="172" y="98" width="28" height="9" rx="2" fill="#cfd6de"/>'
    + buttons(150, 120, 2, 12, 8, 14, {0: "#c8a84b", 1: "#c8a84b"})
    + f'<text x="30" y="126" {F} font-size="6" fill="#7d858e">PROGRAM · PREVIEW · T-BAR</text>')

A["videohub"] = svg(rack("VIDEOHUB 40×40 12G", 46, 34,
    extra='<rect x="40" y="58" width="40" height="18" rx="1" fill="url(#scr)"/>' + buttons(88, 58, 10, 7, 7, 9) + buttons(88, 69, 10, 7, 7, 9, {2: "#c8a84b"}))
    + shadow(120, 96, 88), "14 36 212 66")

A["decimator"] = svg(shadow(120, 128, 64) + '<rect x="64" y="58" width="112" height="64" rx="6" fill="#1b1e22" stroke="#4a525c"/><rect x="64" y="58" width="112" height="20" rx="6" fill="url(#sh)"/>'
    f'<text x="74" y="72" {F} font-size="7" fill="#9aa4ae" letter-spacing=".5">12G-CROSS</text>'
    '<rect x="74" y="80" width="44" height="18" rx="2" fill="#0a2238"/><text x="96" y="92" text-anchor="middle" font-size="7" fill="#2eaadc" ' + F + '>2160p29.97</text>'
    + bnc(132, 86, 4, 10) + '<rect x="130" y="100" width="18" height="10" rx="2" fill="#0a0b0d" stroke="#5a636d"/>' + leds(78, 110, 4)
    + f'<text x="120" y="146" text-anchor="middle" {F} font-size="7" fill="#7d858e">HDMI ⇄ 12G-SDI with scaling</text>')

A["avpro-hdbt"] = svg(shadow(120, 132, 96) +
    "".join(f'<g transform="translate({28+i*104} 70)"><rect width="80" height="34" rx="4" fill="#1b1e22" stroke="#4a525c"/><rect width="80" height="12" rx="4" fill="url(#sh)"/>'
            f'<text x="7" y="11" {F} font-size="5.8" fill="#9aa4ae">AVPro Edge {"TX" if i==0 else "RX"}</text><rect x="8" y="18" width="16" height="9" rx="1" fill="#0a0b0d" stroke="#5a636d"/>' + ports(32, 19, 2, 9, 7, 13) + leds(64, 22, 2) + '</g>' for i in range(2))
    + '<path d="M108 87 h20" stroke="#2eaadc" stroke-width="3"/><text x="120" y="126" text-anchor="middle" font-size="7" fill="#7d858e" ' + F + '>4K HDMI over Cat cable · 100 m</text>')

A["aja-12g-am"] = svg(shadow(120, 128, 60) + '<rect x="68" y="58" width="104" height="60" rx="5" fill="#1b1e22" stroke="#4a525c"/><rect x="68" y="58" width="104" height="18" rx="5" fill="url(#sh)"/>'
    f'<text x="78" y="72" {F} font-size="7" font-weight="700" fill="#c9ced4">AJA</text><text x="96" y="72" {F} font-size="6" fill="#9aa4ae">12G-AM</text>'
    + bnc(84, 92, 3, 10) + '<rect x="120" y="84" width="40" height="16" rx="2" fill="#0a0b0d" stroke="#5a636d"/>' + leds(124, 108, 5)
    + f'<text x="120" y="142" text-anchor="middle" {F} font-size="7" fill="#7d858e">AES audio ⇄ SDI program</text>')

A["hyperdeck"] = svg(rack("HYPERDECK 4K PRO", 54, 18,
    extra='<rect x="44" y="66" width="30" height="3" rx="1" fill="#0a0b0d"/><rect x="78" y="66" width="30" height="3" rx="1" fill="#0a0b0d"/>'
    '<rect x="118" y="57" width="30" height="12" rx="1" fill="url(#scr)"/>' + buttons(152, 59, 4, 6, 8, 8, {3: "#e05a4f"}) + '<circle cx="196" cy="63" r="5" fill="#2c3138" stroke="#6b737c"/>')
    + shadow(120, 82, 84), "18 44 204 46")

A["streaming-encoder"] = svg(shadow(120, 128, 62) + '<rect x="66" y="56" width="108" height="62" rx="6" fill="#1b1e22" stroke="#4a525c"/><rect x="66" y="56" width="108" height="18" rx="6" fill="url(#sh)"/>'
    '<rect x="76" y="66" width="46" height="28" rx="2" fill="url(#scr)"/>' + buttons(130, 68, 3, 9, 8, 12, {0: "#e05a4f"}) + buttons(130, 82, 3, 9, 8, 12)
    + f'<text x="76" y="110" {F} font-size="6.5" fill="#9aa4ae">STREAMING ENCODER 4K</text><text x="120" y="144" text-anchor="middle" {F} font-size="7" fill="#7d858e">live stream without a computer</text>')

A["zoom-room"] = svg(shadow(120, 146, 100) + '<path d="M30 132 L110 132 L104 70 L36 70 Z" fill="#1b1e22" stroke="#4a525c"/><rect x="42" y="76" width="56" height="40" rx="2" fill="#0e1f33"/>'
    + "".join(f'<rect x="{46+(i%3)*17}" y="{80+(i//3)*17}" width="14" height="14" rx="2" fill="#2D8CFF" opacity="{.5+.1*i}"/>' for i in range(6))
    + '<rect x="132" y="70" width="80" height="62" rx="5" fill="#1b1e22" stroke="#4a525c"/><rect x="132" y="70" width="80" height="18" rx="5" fill="url(#sh)"/>'
    f'<text x="140" y="84" {F} font-size="6" fill="#9aa4ae">ThinkSmart Core</text>' + ports(140, 100, 4, 8, 6, 12) + leds(142, 120, 2)
    + f'<text x="70" y="146" text-anchor="middle" {F} font-size="7" fill="#7d858e">Logitech Tap</text>')

A["aja-utap"] = svg(shadow(120, 124, 44) + '<rect x="84" y="62" width="72" height="54" rx="6" fill="#1b1e22" stroke="#4a525c"/><rect x="84" y="62" width="72" height="16" rx="6" fill="url(#sh)"/>'
    f'<text x="92" y="75" {F} font-size="7" font-weight="700" fill="#c9ced4">AJA</text><text x="108" y="75" {F} font-size="6" fill="#9aa4ae">U-TAP SDI</text>' + bnc(100, 96, 2, 12)
    + '<rect x="128" y="91" width="18" height="10" rx="2" fill="#0a0b0d" stroke="#2eaadc"/><path d="M137 116 v20" stroke="#2eaadc" stroke-width="3"/>'
    + f'<text x="120" y="150" text-anchor="middle" {F} font-size="7" fill="#7d858e">SDI → USB camera for Zoom</text>')

A["stream-deck-xl"] = svg(shadow(120, 140, 80) + '<rect x="40" y="38" width="160" height="96" rx="10" fill="#1b1e22" stroke="#4a525c"/>'
    + "".join(f'<rect x="{50+c*18.5}" y="{48+r*20}" width="14" height="14" rx="3" fill="{["#123456","#5a3e0a","#1d4f2f","#4f1d1d","#3b2a6b"][(r*8+c) % 5]}" stroke="#3a414a" stroke-width=".6"/>' for r in range(4) for c in range(8)))

A["service-pc"] = svg(shadow(120, 144, 92) + '<rect x="44" y="40" width="58" height="98" rx="4" fill="#1b1e22" stroke="#4a525c"/><rect x="44" y="40" width="58" height="20" rx="4" fill="url(#sh)"/>'
    '<circle cx="73" cy="52" r="4" fill="none" stroke="#2eaadc" stroke-width="1.4"/>' + ports(52, 66, 3, 10, 5, 14)
    + '<path d="M150 20 v120 M126 140 h48" stroke="#6b737c" stroke-width="5"/><rect x="116" y="26" width="68" height="40" rx="2" fill="#0b0c0e" stroke="#4a525c"/><rect x="120" y="30" width="60" height="32" fill="url(#scr)"/>'
    '<rect x="116" y="72" width="68" height="40" rx="2" fill="#0b0c0e" stroke="#4a525c"/><rect x="120" y="76" width="60" height="32" fill="url(#scr)" opacity=".8"/>')

# ── POWER ───────────────────────────────────────────────────
A["wattbox"] = svg(rack("WATTBOX  800 SERIES", 46, 18,
    extra='<rect x="124" y="49" width="30" height="12" rx="1" fill="#0a2238"/><text x="139" y="57.5" text-anchor="middle" font-size="6" fill="#3fd17a" ' + F + '>8.2 A</text>' + leds(162, 55, 6))
    + '<rect x="96" y="80" width="48" height="76" rx="3" fill="#1b1e22" stroke="#4a525c"/>' + "".join(f'<rect x="108" y="{86+i*12}" width="24" height="8" rx="2" fill="#0a0b0d" stroke="#5a636d"/>' for i in range(6))
    + shadow(120, 160, 70), "18 36 204 128")

A["ups"] = svg(rack("XTREME POWER UPS", 46, 34,
    extra='<rect x="128" y="54" width="44" height="18" rx="1.5" fill="#0a2238"/><text x="150" y="66" text-anchor="middle" font-size="7.5" fill="#3fd17a" ' + F + '>100%</text>'
    + leds(44, 72, 4) + '<circle cx="190" cy="63" r="6" fill="#2c3138" stroke="#6b737c"/>' + "".join(f'<path d="M{86+i*7} 60 v12" stroke="#2a2f36" stroke-width="3"/>' for i in range(5)))
    + shadow(120, 96, 88), "14 36 212 66")

for name, s in A.items():
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(s)
print(len(A), "assets")
