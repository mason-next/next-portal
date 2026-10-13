"""3/4-view line array with real J-curve geometry (boxes hinge at the front edge, splay accumulates)."""
import math

F = 'font-family="Segoe UI,Arial"'


def line_array(x0=34, y0=34, W=114, h=38, d=70, splays=(0, 2, 5, 9), k=0.95, m=0.13, label="YME", uid="la", logo=True):
    """Returns (svg_defs, svg_body). Projection: (u across, z back, y down) -> (x0+u+k*z, y0+y-m*z)."""
    def P(u, z, y):
        return (x0 + u + k * z, y0 + y - m * z)

    def pts(*ps):
        return " ".join(f"{a:.1f},{b:.1f}" for a, b in ps)

    defs = (f'<pattern id="{uid}g" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><rect width="3.2" height="3.2" fill="#15181c"/>'
            f'<circle cx="1.6" cy="1.6" r=".75" fill="#3a414a"/></pattern>'
            f'<linearGradient id="{uid}side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a4148"/><stop offset="1" stop-color="#22272c"/></linearGradient>'
            f'<linearGradient id="{uid}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>'
            f'<radialGradient id="{uid}w" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".0"/><stop offset=".7" stop-color="#000" stop-opacity=".8"/><stop offset="1" stop-color="#000" stop-opacity=".0"/></radialGradient>')
    body = []
    # fly frame: two side rails along the depth, front and rear cross tubes
    fz0, fz1 = 2, d - 4
    top = -3.0
    def tube(p1, p2, w=3.2, col="#59616b"):
        return f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'
    body.append(tube(P(4, fz1, top), P(W - 4, fz1, top), 3, "#3a414a"))
    body.append(tube(P(4, fz0, top), P(4, fz1, top)))
    body.append(tube(P(W - 4, fz0, top), P(W - 4, fz1, top), 3.4, "#7d858e"))
    body.append(tube(P(4, fz0, top), P(W - 4, fz0, top), 3.4, "#6b737c"))
    for u in (6, W - 6):
        q1, q2 = P(u, fz0 + 4, top), P(u, fz0 + 4, top + 5)
        body.append(tube(q1, q2, 2.4, "#6b737c"))
    fr_h = 0
    # pick points + chains / cable to the roof
    for u in (W * 0.28, W * 0.72):
        a = P(u, d * 0.45, top - fr_h)
        body.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{a[0]:.1f}" y2="{a[1]-24:.1f}" stroke="#8a939d" stroke-width="1.4" stroke-dasharray="2.2 1.2"/>')
        body.append(f'<circle cx="{a[0]:.1f}" cy="{a[1]-1.5:.1f}" r="2.2" fill="none" stroke="#c8a84b" stroke-width="1.2"/>')

    # stack the boxes
    zf, yf = 0.0, 0.0          # front-top hinge of the current box, in profile (z back, y down)
    th = 0.0
    c = h * 0.16              # back face is shorter: trapezoid profile
    boxes = []
    for i, s in enumerate(splays):
        th += math.radians(s)
        a = (math.sin(th), math.cos(th))     # down the front face
        n = (math.cos(th), -math.sin(th))    # into the box (toward the back)
        FT = (zf, yf)
        FB = (zf + h * a[0], yf + h * a[1])
        BT = (zf + d * n[0] + c * a[0], yf + d * n[1] + c * a[1])
        BB = (zf + d * n[0] + (h - c) * a[0], yf + d * n[1] + (h - c) * a[1])
        boxes.append((FT, FB, BT, BB))
        zf, yf = FB[0] + 0.6 * a[0], FB[1] + 0.6 * a[1]
    for i, (FT, FB, BT, BB) in enumerate(boxes):
        # side panel (u = W)
        sp = [P(W, *FT), P(W, *BT), P(W, *BB), P(W, *FB)]
        body.append(f'<polygon points="{pts(*sp)}" fill="url(#{uid}side)" stroke="#59616b" stroke-width=".8"/>')
        e1, e2 = P(W, *FB), P(W, *BB)
        body.append(f'<line x1="{e1[0]:.1f}" y1="{e1[1]:.1f}" x2="{e2[0]:.1f}" y2="{e2[1]:.1f}" stroke="#0d0f12" stroke-width="1.6"/>')
        # front face as an affine-mapped rectangle (local coords u: 0..W, v: 0..h)
        A, B = P(0, *FT), P(0, *FB)
        mx = f'matrix(1 0 {(B[0]-A[0])/h:.4f} {(B[1]-A[1])/h:.4f} {A[0]:.2f} {A[1]:.2f})'
        face = [f'<rect width="{W}" height="{h}" rx="1.4" fill="#1b1e22" stroke="#4a525c" stroke-width=".9"/>',
                f'<rect x="2.2" y="2" width="{W-4.4}" height="{h-4}" rx="1" fill="url(#{uid}g)"/>']
        for cx in (W * 0.22, W * 0.78):   # dual 11 in woofers seen through the grille
            face.append(f'<ellipse cx="{cx:.1f}" cy="{h/2:.1f}" rx="{h*0.43:.1f}" ry="{h*0.43:.1f}" fill="url(#{uid}w)"/>')
        face.append(f'<ellipse cx="{W/2:.1f}" cy="{h/2:.1f}" rx="{h*0.24:.1f}" ry="{h*0.24:.1f}" fill="url(#{uid}w)" opacity=".8"/>')   # coaxial mid-high
        face.append(f'<rect width="{W}" height="{h}" rx="1.4" fill="url(#{uid}sh)"/>')
        if logo:
            face.append(f'<text x="{W-6}" y="{h-3.6}" text-anchor="end" {F} font-size="5.4" font-weight="700" fill="#8a939d" letter-spacing=".4">{label}</text>')
        body.append(f'<g transform="{mx}">' + "".join(face) + '</g>')
    rear = [P(W + .6, (BT[0] + BB[0]) / 2 - 7, (BT[1] + BB[1]) / 2) for FT, FB, BT, BB in boxes]
    rear = [P(W + .6, boxes[0][2][0] - 7, boxes[0][2][1] + 2)] + rear + [P(W + .6, boxes[-1][3][0] - 7, boxes[-1][3][1] - 2)]
    body.append(f'<polyline points="{pts(*rear)}" fill="none" stroke="#111316" stroke-width="4" stroke-linejoin="round"/>')
    body.append(f'<polyline points="{pts(*rear)}" fill="none" stroke="#4a525c" stroke-width="1" stroke-linejoin="round"/>')
    for q in rear[1:-1]:
        body.append(f'<circle cx="{q[0]:.1f}" cy="{q[1]:.1f}" r="1.3" fill="#c9ced4"/>')
    for i in range(len(boxes) - 1):
        a1 = P(W + .6, boxes[i][1][0] + 3, boxes[i][1][1] - 4); a2 = P(W + .6, boxes[i + 1][0][0] + 3, boxes[i + 1][0][1] + 4)
        body.append(f'<line x1="{a1[0]:.1f}" y1="{a1[1]:.1f}" x2="{a2[0]:.1f}" y2="{a2[1]:.1f}" stroke="#111316" stroke-width="4.5" stroke-linecap="round"/>')
        mid = ((a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2)
        body.append(f'<circle cx="{mid[0]:.1f}" cy="{mid[1]:.1f}" r="1.2" fill="#c9ced4"/>')
    bottom = max(P(W, *b[1])[1] for b in boxes)
    return defs, "".join(body), bottom


if __name__ == "__main__":
    import sys
    defs, body, bottom = line_array()
    open(sys.argv[1], "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="720" height="540" style="background:#dfe6ee">{defs}{body}</svg>')
