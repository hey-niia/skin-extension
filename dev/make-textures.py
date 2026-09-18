"""Rebuild assets/grain.png and assets/fiber.png.

Mirrors the SVG filters used in the Skin prototype:
  feTurbulence type=fractalNoise  ->  feColorMatrix (grey 0.5 in linearRGB, alpha = k*A + b)
Tileable Perlin noise; pure Python, no dependencies.
"""
import math, random, struct, zlib

def png(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

def perlin(px, py, gx, gy, seed):
    """Tileable 2-D gradient noise with integer periods px, py."""
    rnd = random.Random(seed)
    grads = {}
    def g(i, j):
        k = (i % px, j % py)
        if k not in grads:
            a = rnd.random() * 2 * math.pi
            grads[k] = (math.cos(a), math.sin(a))
        return grads[k]
    fade = lambda t: t * t * t * (t * (t * 6 - 15) + 10)
    def n(x, y):
        x0, y0 = math.floor(x), math.floor(y); fx, fy = x - x0, y - y0
        def dot(i, j):
            gx_, gy_ = g(x0 + i, y0 + j); return gx_ * (fx - i) + gy_ * (fy - j)
        u, v = fade(fx), fade(fy)
        a = dot(0, 0) + u * (dot(1, 0) - dot(0, 0))
        b = dot(0, 1) + u * (dot(1, 1) - dot(0, 1))
        return a + v * (b - a)
    return n

def texture(path, w, h, fx, fy, octaves, k, b, seed):
    layers = [(perlin(round(w * fx) << o, round(h * fy) << o, 0, 0, seed + o), 2 ** o) for o in range(octaves)]
    grey = round((0.5 ** (1 / 2.4)) * 255)  # 0.5 in linearRGB, shown in sRGB (~188)
    rows = []
    for y in range(h):
        row = []
        for x in range(w):
            s = sum(n(x * fx * f, y * fy * f) / f for n, f in layers)
            A = min(1, max(0, (s * 1.3 + 1) / 2))           # fractalNoise -> 0..1
            a = min(1, max(0, k * A + b))
            row += [grey, grey, grey, round(a * 255)]
        rows.append(row)
    png(path, w, h, rows)

# fine paper grain  (baseFrequency .85, 3 octaves, alpha 1.4A-.35)
texture("assets/grain.png", 200, 200, 0.85, 0.85, 3, 1.4, -0.35, 11)
# horizontal fibres (baseFrequency .012 x .4, 2 octaves, alpha .9A-.3)
texture("assets/fiber.png", 250, 250, 0.012, 0.4, 2, 0.9, -0.3, 29)
print("ok")
