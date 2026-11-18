# Trace a figure image (transparent background) into: outer outline + holes, dark line art as thin filled shapes, and earrings.
# Usage: python3 scripts/trace-figure.py <figure.png> > paths.json   (expects the prototype figure aspect, any multiple of 286x302)
import sys, json
import numpy as np
from PIL import Image, ImageFilter
src = sys.argv[1]
im = Image.open(src).convert('RGBA')
W, H = im.size
A = np.array(im).astype(float)
S = 380.0 / (H / 3)
def tf(x, y):  # pixel (3x image, padded by 1) -> figure frame
    return ((x - 1) / 3 - 143) * S, -198 + ((y - 1) / 3) * S

def contours(mask):
    m = np.pad(mask.astype(np.uint8), 1)
    h, w = m.shape
    segs = {}
    T = {1:[('L','B')],2:[('B','R')],3:[('L','R')],4:[('R','T')],5:[('L','T'),('R','B')],6:[('B','T')],7:[('L','T')],
         8:[('T','L')],9:[('T','B')],10:[('T','R'),('B','L')],11:[('T','R')],12:[('R','L')],13:[('R','B')],14:[('B','L')]}
    ys, xs = np.nonzero((m[:-1,:-1] + m[:-1,1:] + m[1:,1:] + m[1:,:-1]) % 4 != 0)
    for y, x in zip(ys, xs):
        c = m[y,x]*8 + m[y,x+1]*4 + m[y+1,x+1]*2 + m[y+1,x]
        P = {'T':(x+.5,y),'R':(x+1,y+.5),'B':(x+.5,y+1),'L':(x,y+.5)}
        for a, b in T[c]: segs.setdefault(P[a], []).append(P[b])
    loops, used = [], set()
    for s in list(segs):
        if s in used: continue
        lp = [s]; used.add(s); cur = s
        while True:
            nx = [n for n in segs.get(cur, []) if n not in used]
            if not nx: break
            cur = nx[0]; used.add(cur); lp.append(cur)
        loops.append(lp)
    return loops

def rdp(pts, eps):
    pts = np.array(pts)
    def rec(a, b):
        if b <= a + 1: return [a]
        p, q = pts[a], pts[b]; d = q - p; n = np.hypot(*d) + 1e-9
        seg = pts[a+1:b]
        dist = np.abs(d[0]*(seg[:,1]-p[1]) - d[1]*(seg[:,0]-p[0])) / n
        i = int(np.argmax(dist))
        if dist[i] > eps: k = a + 1 + i; return rec(a, k) + rec(k, b)
        return [a]
    return pts[rec(0, len(pts)-1) + [len(pts)-1]]

def path(lp, eps):
    half = len(lp) // 2
    pts = list(rdp(lp[:half+1], eps)[:-1]) + list(rdp(lp[half:] + [lp[0]], eps)[:-1])
    P = [tf(*p) for p in pts]; n = len(P)
    if n < 3: return None
    d = f"M{P[0][0]:.2f} {P[0][1]:.2f}"
    for i in range(n):
        p0, p1, p2, p3 = P[(i-1)%n], P[i], P[(i+1)%n], P[(i+2)%n]
        t = 1/6
        d += f"C{p1[0]+(p2[0]-p0[0])*t:.2f} {p1[1]+(p2[1]-p0[1])*t:.2f} {p2[0]-(p3[0]-p1[0])*t:.2f} {p2[1]-(p3[1]-p1[1])*t:.2f} {p2[0]:.2f} {p2[1]:.2f}"
    return d + "Z"

alpha = A[..., 3]; lum = A[..., :3].mean(-1); r, g, b = A[...,0], A[...,1], A[...,2]
# body incl. faint fingers
am = np.array(Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)))
body = [l for l in contours(am > 50) if len(l) > 30]
body.sort(key=len, reverse=True)
# dark line art (strokes), excluding warm earrings
earr = (alpha > 120) & (r - b > 32)
lines_m = (alpha > 90) & (lum < 165) & ~earr
lm = np.array(Image.fromarray((lines_m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))) > 150
lines = [l for l in contours(lm) if len(l) > 14]
ear = [l for l in contours(earr) if len(l) > 10]
out = {
  'outline': path(body[0], 1.0),
  'holes': [path(l, 1.0) for l in body[1:]],
  'lines': [p for p in (path(l, 0.8) for l in lines) if p],
  'earrings': [p for p in (path(l, 0.6) for l in ear) if p],
}
print(json.dumps(out))
print(len(body), len(lines), len(ear), sum(len(x) for x in out['lines']), file=sys.stderr)
