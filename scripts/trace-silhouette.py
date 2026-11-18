# Trace a figure PNG with a transparent background into SVG paths in the shared figure frame.
# Usage: python3 scripts/trace-silhouette.py <image.png> <alpha-threshold 0-255> <spine-x-fraction e.g. 0.5> > paths.json
# Output: JSON list of {d} paths (largest = outer contour, the rest = holes). Requires numpy + Pillow.
import sys, json
import numpy as np
from PIL import Image, ImageFilter
src, thr = sys.argv[1], int(sys.argv[2])
im = Image.open(src).convert('RGBA')
W, H = im.size
UP = 3
a = im.split()[3].resize((W*UP, H*UP), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2.2))
m = (np.array(a) > thr).astype(np.uint8)
m = np.pad(m, 1)
h, w = m.shape
# marching squares, segments keyed by edge midpoints
segs = {}
def add(p, q):
    segs.setdefault(p, []).append(q)
for y in range(h-1):
    row0 = m[y]; row1 = m[y+1]
    for x in range(w-1):
        tl, tr, br, bl = row0[x], row0[x+1], row1[x+1], row1[x]
        c = tl*8 + tr*4 + br*2 + bl
        if c == 0 or c == 15: continue
        T=(x+.5,y); R=(x+1,y+.5); B=(x+.5,y+1); L=(x,y+.5)
        table = {1:[(L,B)],2:[(B,R)],3:[(L,R)],4:[(R,T)],5:[(L,T),(R,B)],6:[(B,T)],7:[(L,T)],
                 8:[(T,L)],9:[(T,B)],10:[(T,R),(B,L)],11:[(T,R)],12:[(R,L)],13:[(R,B)],14:[(B,L)]}
        for p,q in table[c]: add(p,q)
loops=[]
used=set()
for start in list(segs.keys()):
    if start in used: continue
    loop=[start]; used.add(start); cur=start
    while True:
        nxts=[n for n in segs.get(cur,[]) if n not in used]
        if not nxts:
            break
        cur=nxts[0]; used.add(cur); loop.append(cur)
    if len(loop)>40: loops.append(loop)
def rdp(pts, eps):
    pts=np.array(pts)
    def rec(a,b):
        if b<=a+1: return [a]
        p,q=pts[a],pts[b]; d=q-p; n=np.hypot(*d)+1e-9
        seg=pts[a+1:b]
        dist=np.abs(d[0]*(seg[:,1]-p[1])-d[1]*(seg[:,0]-p[0]))/n
        i=np.argmax(dist)
        if dist[i]>eps:
            k=a+1+i
            return rec(a,k)+rec(k,b)
        return [a]
    idx=rec(0,len(pts)-1)+[len(pts)-1]
    return pts[idx]
# frame transform: prototype draws 380 tall from y=-198, centred at x=143 of 286
S = 380.0/H
def tf(p):
    x=(p[0]-1)/UP; y=(p[1]-1)/UP
    return ((x - W*float(sys.argv[3]))*S, -198 + y*S)
paths=[]
for lp in sorted(loops, key=len, reverse=True):
    half=len(lp)//2
    e=1.6*UP/2
    A=rdp(lp[:half+1], e); B=rdp(lp[half:]+[lp[0]], e)
    pts=list(A[:-1])+list(B[:-1])
    P=[tf(p) for p in pts]
    n=len(P)
    if n<4: continue
    d=f"M{P[0][0]:.1f} {P[0][1]:.1f}"
    for i in range(n):
        p0=P[(i-1)%n]; p1=P[i]; p2=P[(i+1)%n]; p3=P[(i+2)%n]
        t=1/6
        c1=(p1[0]+(p2[0]-p0[0])*t, p1[1]+(p2[1]-p0[1])*t)
        c2=(p2[0]-(p3[0]-p1[0])*t, p2[1]-(p3[1]-p1[1])*t)
        d+=f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    d+="Z"
    paths.append({'n':n,'len':len(lp),'d':d})
print(json.dumps(paths))
